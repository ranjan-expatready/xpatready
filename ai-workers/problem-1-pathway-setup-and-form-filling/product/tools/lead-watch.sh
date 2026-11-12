#!/bin/bash
# Lead watch (founder, 3 Nov): one call per check gives the tech lead resources, merges and lanes in a few lines.
# Read-only. Pairs with get_usage (weekly plan, context) and list_sessions, which only the Lead's tools can read.
# Exit code = number of ACT lines (0 = nothing to act on). Skill: .claude/skills/lead-watch.
# Usage: bash product/tools/lead-watch.sh [minutes since last check, default 30]
set -uo pipefail
SINCE="${1:-30}"
# gh through gh.sh: on a TLS failure the same reads go through curl with gh auth token (P-363; founder, 6 Nov).
TOOLS="$(cd "$(dirname "$0")" && pwd)"; gh() { bash "$TOOLS/gh.sh" "$@"; }
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 99
STATE_DIR="/private/tmp/claude-$(id -u)/lead-watch"; mkdir -p "$STATE_DIR"
act=0; say() { echo "$1"; }; ACT() { act=$((act+1)); echo "ACT   $1"; }

say "time  $(TZ=Asia/Kolkata date '+%d %b %H:%M IST')"

# 0. Stall guard (founder, 7 Nov, P-388): the previous check must have run. Lead 24 stalled ~7.4 h on one prompt and no
# check fired. Checks run every 30 min; a gap over 40 min (30 + 10 grace, P-389) means a check was missed: tell the
# founder at once. The standby's lead-heartbeat.sh reads the same stamp while this Lead is stuck.
stamp="$STATE_DIR/last-check"; now=$(date +%s)
if [ -s "$stamp" ]; then last=$(cat "$stamp"); gap=$(( (now - last) / 60 ))
  [ "$gap" -gt 40 ] && ACT "previous check ran ${gap} min ago ($(TZ=Asia/Kolkata date -r "$last" '+%d %b %H:%M IST' 2>/dev/null || TZ=Asia/Kolkata date -d "@$last" '+%d %b %H:%M IST')): checks were missed; tell the founder at once (P-388, P-389)"
fi
echo "$now" > "$stamp.$$" && mv -f "$stamp.$$" "$stamp"   # atomic: the standby never reads a half-written stamp

# 1. Disk and test databases (P-308 disk rule: under 10 GB the Lead frees space, under 4 GB Mac suites pause).
free=$(df -g / | awk 'NR==2 {print $4}')
pg="psql -h 127.0.0.1 -p 54329 -U xr_studio -d postgres -Atc"
idle=$($pg "select datname from pg_database d where datname like 'xr_studio_%' and datname not like '%demo%' and not exists (select 1 from pg_stat_activity a where a.datname=d.datname)" 2>/dev/null | sort)
dbs=$($pg "select count(*)||' ('||pg_size_pretty(coalesce(sum(pg_database_size(datname)),0))||')' from pg_database where datname like 'xr_studio_%'" 2>/dev/null)
# A database is safe to drop only when it was idle at the previous check too (file times are copied from the template).
prev="$STATE_DIR/idle-dbs.txt"; both=0
[ -f "$prev" ] && both=$(comm -12 "$prev" <(echo "$idle") | grep -c . )
echo "$idle" > "$prev"
say "disk  ${free} GB free · test databases ${dbs:-?} · idle at two checks: ${both}"
[ "$free" -lt 4 ] && ACT "disk under 4 GB: tell Mac builders to pause suite runs, then free space"
[ "$free" -lt 10 ] && [ "$both" -gt 0 ] && ACT "disk under 10 GB: drop the ${both} test databases idle at two checks (lead-watch skill, step 3)"

# 2. Merges and the queue.
since=$(date -u -v-"${SINCE}"M '+%Y-%m-%dT%H:%M:%SZ')
merged=$(gh pr list --state merged --search "merged:>=$since" --json number,title -q '.[]|"#\(.number) \(.title[0:55])"')
# P-500: product progress counts only PRs that changed app code (by files changed); the rest are shown apart.
appm=$( [ -n "$merged" ] && echo "$merged" | bash "$TOOLS/app-code-prs.sh")
say "merged in ${SINCE} min: $(echo "$appm" | grep -c .) changed app code (P-500) · $(echo "$merged" | grep -c .) in all (records, docs, tooling, tests included)"; [ -n "$appm" ] && echo "$appm" | sed 's/^/      app  /'
prs=$(gh pr list --state open --limit 80 --json number,title,labels,isDraft,headRefName,statusCheckRollup)
echo "$prs" | python3 -I -c '
import json,sys
prs=[p for p in json.load(sys.stdin) if not p["headRefName"].startswith("mergify/")]
L=lambda p:[l["name"] for l in p["labels"]]
red=lambda p:any(c.get("conclusion")=="FAILURE" for c in p["statusCheckRollup"] or [])
q=[p for p in prs if "queued" in L(p)]
deq=[p for p in prs if "dequeued" in L(p)]
appr=[p for p in prs if "review: approved" in L(p) and "queued" not in L(p) and "dequeued" not in L(p)]
rl=[p for p in prs if "review: approved" in L(p) and red(p)]
print("queue %d queued · %d approved not queued · %d open without label" % (len(q),len(appr),len([p for p in prs if not L(p) and not p["isDraft"]])))
for p in deq: print("ACT   #%d dequeued: owner merges main or fixes (%s)" % (p["number"],p["title"][:50]))
for p in rl:  print("ACT   #%d red after approval (%s)" % (p["number"],p["title"][:50]))
' | tee "$STATE_DIR/q.txt"
act=$((act + $(grep -c '^ACT' "$STATE_DIR/q.txt")))

# 3. Questions for the tech lead in the window.
qs=$(gh search prs --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)" --state open "Question for the tech lead" --json number -q '.[].number' 2>/dev/null)
for n in $qs; do
  hit=$(gh pr view "$n" --json comments -q "[.comments[]|select(.createdAt>=\"$since\")|select(.body|test(\"Question for the tech lead\"))]|length")
  [ "${hit:-0}" -gt 0 ] && ACT "#$n has a new question for the tech lead"
done

# 4. Lanes alive: branches pushed in the last 90 minutes (a lane is working only if it pushed, lead skill).
git fetch -q origin 2>/dev/null
# 1b. Local lanes (founder, 8 Nov, P-420): a Mac lane that stops, or whose messages are paused, makes no GitHub signal.
# After the fetch, so "PRs merged since" reads today's main. Counted by its ACT lines (a crash adds none, and says so).
ll=$(bash "$TOOLS/local-lanes.sh" 2>&1); llrc=$?; [ -n "$ll" ] && echo "$ll"; lln=$(grep -c '^ACT' <<<"$ll")
[ "$llrc" != "$lln" ] && echo "warn  local-lanes.sh exit $llrc but $lln ACT line(s): read its output"
act=$((act + lln))
alive=$(git for-each-ref --sort=-committerdate --format='%(committerdate:unix) %(refname:short)' refs/remotes/origin \
  | awk -v t="$(date -u -v-90M +%s)" '$1>=t {print $2}' | grep -v -e 'origin/main' -e 'mergify/' -e 'origin/HEAD' -e '^origin$' | sed 's#origin/##')
say "lanes pushed in 90 min: $(echo "$alive" | grep -c .)"; [ -n "$alive" ] && echo "$alive" | head -12 | sed 's/^/      /'

# 5. The founder's five changes, kept (founder 4 Nov ~10:50 IST "Go, start now"; "Yes, two standby"): builders in the
# cloud, machine testing on GitHub, the Mac copy cap, and four numbers every check. A rule nobody measures drifts (the
# cloud-only rule of 1 Nov, P-224, was not followed for three days), so each is read from the machine, never from prose.
# Mac builders allowed: MAC_BUILDERS_OK (default: Builder 1, the infra lane, and Builder 8, QA-144) plus the two standby
# builders, whose copies are made only when a Lead hands them a row (wt-* folders outside .claude/worktrees).
# A builder works in its session's copy (.claude/worktrees/builder-N-xxxxxx) and in copies under that session's scratchpad
# (…claude-worktrees-builder-N-xxxxxx/…/wt-*): it counts as working when any of them changed its git index in 90 minutes.
ok=" ${MAC_BUILDERS_OK:-builder-1 builder-8} "; now=$(date +%s); busy=""
while read -r wt; do
  name=$(echo "$wt" | grep -oE 'builder-[0-9]+' | head -1); [ -n "$name" ] || continue
  t=$(stat -f %m "$(git -C "$wt" rev-parse --absolute-git-dir 2>/dev/null)/index" 2>/dev/null || echo 0)
  [ $((now - t)) -le 5400 ] && busy="$busy $name"
done < <(git worktree list --porcelain | sed -n 's/^worktree //p')
busy=$(echo "$busy" | tr ' ' '\n' | grep . | sort -u); macb=$(echo "$busy" | grep -c .)
for name in $busy; do case "$ok" in *" $name "*) ;; *) ACT "Mac builder still working: $name (finish its PR, then stop; new rows go to cloud builders)";; esac; done
copies=$(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '$9 ~ /:44[3-9][0-9]$/ {print $9}' | sort -u | grep -c .)
suites=$(pgrep -f 'tools/run-suites.sh' 2>/dev/null | grep -c .)
say "mac   builders working ${macb} · test copies ${copies} on 4430–4499 + ${suites} suite runs (cap 3) · load $(sysctl -n vm.loadavg | awk '{print $2}')"
[ $((copies + suites)) -gt 3 ] && ACT "Mac copy cap: $((copies + suites)) copies or suite runs (cap 3, qa first): the newest builder copy waits"
# The four numbers (founder target: 10 capabilities confirmed a day, quality never lowered).
# P-500: capabilities confirmed are counted across every active milestone (M2, M3, M4, T) on main, not M2 alone.
caps=$(git show origin/main:ai-workers/problem-1-pathway-setup-and-form-filling/product/qa/CAPABILITIES.md 2>/dev/null)
works=$(echo "$caps" | grep -cE '^\| C[0-9]+\.[0-9]+ .*\| (M2|M3|M4|T) \| Works \|')
active=$(echo "$caps" | grep -cE '^\| C[0-9]+\.[0-9]+ .*\| (M2|M3|M4|T) \|')
bym=$(for m in M2 M3 M4 T; do t=$(echo "$caps" | grep -cE "^\| C[0-9]+\.[0-9]+ .*\| $m \|"); [ "$t" -gt 0 ] && printf '%s %s/%s ' "$m" "$(echo "$caps" | grep -cE "^\| C[0-9]+\.[0-9]+ .*\| $m \| Works \|")" "$t"; done)
day="$STATE_DIR/works-$(TZ=Asia/Kolkata date +%Y%m%d).txt"; [ -f "$day" ] || echo "$works" > "$day"
hour=$(gh pr list --state merged --search "merged:>=$(date -u -v-60M '+%Y-%m-%dT%H:%M:%SZ')" --json number -q '.[].number' 2>/dev/null | bash "$TOOLS/app-code-prs.sh" | grep -c .)
back=$(grep -cE '^ACT   #[0-9]+ (dequeued|red after approval)' "$STATE_DIR/q.txt")
say "four  Works on main ${works}/${active} (${bym% }) (+$((works - $(cat "$day"))) today, target +10) · app-code merges last hour ${hour:-?} · Mac builders ${macb} · approved then red or dequeued ${back}"

exit "$act"
