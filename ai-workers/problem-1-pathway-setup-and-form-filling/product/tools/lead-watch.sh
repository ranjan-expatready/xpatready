#!/bin/bash
# Lead watch v2 (founder 4 Nov ~11:25 IST, "Yes, build it"): one call per check shows the tech lead the whole pipeline the
# way the best pipeline lead would watch it: each open item's owner, step, wait and blocker; M2 and M3 as separate blocks
# with the links between them and the critical path; GitHub's machines and the Mac; a pre-mortem; and the escalation rung
# of every ACT line. Every number is read from git, GitHub, the Mac or get_usage, never from a session's own words
# (P-228 (9); a builder's "labelled" on #792 was false on 4 Nov). Read-only on GitHub and on the Mac (it writes only its
# state folder, and `git fetch` updates the clone's remote refs); US$0.
# Exit code = number of ACT lines (0 = nothing to act on; a crash prints what it had plus one ACT line and exits 1).
# Skill: .claude/skills/lead-watch (reference.md: the why and the misses each check comes from).
#
# Usage, from the repository root of any copy (W = ai-workers/problem-1-pathway-setup-and-form-filling/product/tools):
#   bash $W/lead-watch.sh [minutes since last check, default 30] [weekly=N five=N context=N]   the check;
#        weekly/five/context are get_usage's percentages (weekly plan, 5-hour limit, the Lead's own context)
#   bash $W/lead-watch.sh verify <PR> [<sha a session claims>]   labelled / pushed / green / merged, read from GitHub
#   bash $W/lead-watch.sh handover         the check plus the hand-over checklist, for STATE.md and the notes file
#   bash $W/lead-watch.sh roster           the sessions the Lead runs; change it only when a session starts, gets a row or
#        ends:  roster add <name> <session id> <kind> <M2|M3|-> <row> <branch or prefix|-> [next step…]
#               roster set <name> <row|branch|next|kind|milestone|session> <value…>  ·  roster done <name>
#        kind: cloud, mac, qa, paid, design, standby (a builder waiting for a row), lead-standby
#   bash $W/lead-watch.sh ask "<question for the founder>" · answered <n> · park <PR> "<why>" · unpark <PR>
#   bash $W/lead-watch.sh ack <ACT key> "<why>" [hours, default 4]   an ACT known and handled: shown, not counted, until then
#   bash $W/lead-watch.sh lesson "<one line>" · cron "<the check's cron prompt>" · cap <US$ today> [<US$ code cap>]
# State (roster, asks, acks, ladder, trends) lives in <git common dir>/lead-watch: shared by every copy of this clone on
# the Mac, kept across restarts and Leads, never committed. The links between M2 and M3 are the Lead's map in
# lead-watch-links.txt beside this script; their states are read live.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)" || exit 99; cd "$ROOT" || exit 99
A=ai-workers/problem-1-pathway-setup-and-form-filling; P=$A/product
ST="${LEAD_WATCH_DIR:-$(git rev-parse --path-format=absolute --git-common-dir)/lead-watch}"; mkdir -p "$ST"
REPO=$(git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')
touch "$ST/roster.tsv" "$ST/asks.tsv" "$ST/parked.tsv" "$ST/lessons.tsv" "$ST/acts.tsv" "$ST/usage.tsv" "$ST/disk.tsv" "$ST/acks.tsv"
now=$(date +%s); tab=$'\t'
# Free text goes into tab-separated files: a tab or a line break in it would shift the columns.
clean() { printf '%s' "$*" | tr '\t\n\r' '   '; }

# ---- small subcommands: they change only the Lead's own state files ----
case "${1:-}" in
  roster)
    shift; sub="${1:-list}"; shift 2>/dev/null
    case "$sub" in
      add) [ $# -ge 6 ] || { echo "roster add <name> <session> <kind> <M2|M3|-> <row> <branch|-> [next…]"; exit 2; }
           grep -q "^$(clean "$1")$tab" "$ST/roster.tsv" && { echo "$1 is already on the roster (use roster set)"; exit 2; }
           n=$(clean "$1") s=$(clean "$2") k=$(clean "$3") m=$(clean "$4") r=$(clean "$5") b=$(clean "$6"); shift 6
           x=$(clean "$*"); printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$n" "$s" "$k" "$m" "$r" "$b" "${x:--}" "$now" >> "$ST/roster.tsv";;
      set) [ $# -ge 3 ] || { echo "roster set <name> <field> <value…>"; exit 2; }
           n="$1" f="$2"; shift 2
           python3 -I - "$ST/roster.tsv" "$n" "$f" "$(clean "$*")" "$now" <<'PY' || exit 2
import sys
path,name,field,val,now=sys.argv[1:]
cols=['name','session','kind','milestone','row','branch','next','since']
if field not in cols[1:7]: sys.exit('field must be one of '+', '.join(cols[1:7]))
rows=[l.rstrip('\n').split('\t') for l in open(path) if l.strip()]
hit=[r for r in rows if r[0]==name]
if not hit: sys.exit(name+' is not on the roster')
for r in hit:
    r[cols.index(field)]=val
    if field in ('row','branch'): r[7]=now
open(path+'.tmp','w').write(''.join('\t'.join(r)+'\n' for r in rows)); import os; os.replace(path+'.tmp',path)
PY
           ;;
      done) grep -v "^$1$tab" "$ST/roster.tsv" > "$ST/roster.tmp"; grep "^$1$tab" "$ST/roster.tsv" | sed "s/\$/$tab$now/" >> "$ST/roster-done.tsv"
            mv "$ST/roster.tmp" "$ST/roster.tsv";;
      list|*) column -t -s "$tab" "$ST/roster.tsv" 2>/dev/null || cat "$ST/roster.tsv";;
    esac; exit 0;;
  ask) n=$(( $(wc -l < "$ST/asks.tsv") + 1 )); printf '%s\t%s\t%s\t-\n' "$n" "$now" "$(clean "${2:?ask \"<question>\"}")" >> "$ST/asks.tsv"; echo "founder ask $n"; exit 0;;
  answered) awk -F'\t' -v OFS='\t' -v n="$2" -v t="$now" '$1==n {$4=t} {print}' "$ST/asks.tsv" > "$ST/asks.tmp" && mv "$ST/asks.tmp" "$ST/asks.tsv"; exit 0;;
  park) [[ "${2:-}" =~ ^[0-9]+$ ]] || { echo "park <PR number> \"<why>\""; exit 2; }
        printf '%s\t%s\t%s\n' "$2" "$now" "$(clean "${3:--}")" >> "$ST/parked.tsv"; exit 0;;
  unpark) grep -v "^$2$tab" "$ST/parked.tsv" > "$ST/parked.tmp"; mv "$ST/parked.tmp" "$ST/parked.tsv"; exit 0;;
  ack) [ -n "${2:-}" ] || { echo "ack <ACT key, as printed in {…}> \"<why>\" [hours]"; exit 2; }
       h="${4:-4}"; [[ "$h" =~ ^[0-9]+$ ]] || { echo "hours must be a whole number"; exit 2; }
       printf '%s\t%s\t%s\n' "$(clean "$2")" "$((now + h*3600))" "$(clean "${3:--}")" >> "$ST/acks.tsv"; exit 0;;
  lesson) printf '%s\t%s\n' "$(TZ=Asia/Kolkata date +%Y-%m-%d)" "$(clean "$2")" >> "$ST/lessons.tsv"; exit 0;;
  cron) printf '%s\n' "$2" > "$ST/cron-prompt.txt"; exit 0;;
  cap) c="${2#US\$}"; c="${c#\$}"; t2="${3:--}"; t2="${t2#US\$}"; t2="${t2#\$}"
       [[ "$c" =~ ^[0-9]+(\.[0-9]+)?$ ]] && [[ "$t2" =~ ^(-|[0-9]+(\.[0-9]+)?)$ ]] || { echo "cap <US\$ today, a number> [<US\$ code cap>]"; exit 2; }
       printf '%s\t%s\t%s\n' "$(TZ=Asia/Kolkata date +%Y-%m-%d)" "$c" "$t2" > "$ST/paid-cap.tsv"; exit 0;;
  verify)
    # "labelled", "pushed", "green", "merged" are facts only when GitHub says so (two false claims this week). Give the sha
    # a session claims it pushed, and verify compares it with the PR's head on GitHub.
    n="${2:?verify <PR> [<sha>]}"; V=$(mktemp -d "${TMPDIR:-/tmp}/lead-verify.XXXXXX"); trap 'rm -rf "$V"' EXIT
    gh pr view "$n" --json number,state,isDraft,mergedAt,mergedBy,headRefName,headRefOid,labels,statusCheckRollup > "$V/pr.json" || exit 2
    gh api "repos/$REPO/issues/$n/events?per_page=100" --paginate --jq '.[]|select(.event=="labeled" or .event=="unlabeled")|{e:.event,l:.label.name,t:.created_at,by:.actor.login}' > "$V/ev.ndjson" 2>/dev/null || : > "$V/ev.ndjson"
    python3 -I - "$V/pr.json" "$V/ev.ndjson" "${3:-}" <<'PY'
import json,sys
from datetime import datetime,timezone,timedelta
IST=timezone(timedelta(hours=5,minutes=30))
p=json.load(open(sys.argv[1])); ev=[json.loads(l) for l in open(sys.argv[2]) if l.strip()]; claim=sys.argv[3].lower()
t=lambda s: datetime.fromisoformat(s.replace('Z','+00:00')).astimezone(IST).strftime('%d %b %H:%M IST') if s else '-'
ch=[c for c in p['statusCheckRollup'] if c.get('name') and not c['name'].startswith('Mergify') and c['name']!='Configuration changed']
red=[c['name'] for c in ch if c.get('conclusion') in ('FAILURE','TIMED_OUT','STARTUP_FAILURE')]
run=[c['name'] for c in ch if c.get('status')!='COMPLETED']
gate=[c for c in ch if c['name']=='ci']
if red: ci='red: '+', '.join(red)
elif run: ci='running: %d of %d checks'%(len(run),len(ch))
elif not ch: ci='no checks ran on this head'
elif gate and gate[0].get('conclusion')=='SUCCESS': ci='green (ci passed, %d checks)'%len(ch)
else: ci='NOT green: ci %s'%((gate[0].get('conclusion') or '?').lower() if gate else 'did not run')
head=p['headRefOid']
print('#%d %s%s · head %s on %s%s'%(p['number'],p['state'],' draft' if p['isDraft'] else '',head[:9],p['headRefName'],
    '' if not claim else (' · claimed %s: %s'%(claim[:9],'matches the head' if head.startswith(claim) else 'NOT the head'))))
print('labels now: %s'%(', '.join(l['name'] for l in p['labels']) or 'none'))
for e in ev[-6:]: print('  %s %s at %s by %s'%(e['e'],e['l'],t(e['t']),e['by']))
print('CI on head: '+ci)
print('merged: '+(t(p['mergedAt'])+' by '+(p.get('mergedBy') or {}).get('login','?') if p['mergedAt'] else 'no'))
PY
    exit 0;;
esac

MODE=check; [ "${1:-}" = handover ] && { MODE=handover; shift; }
SINCE="${1:-30}"; [[ "$SINCE" =~ ^[0-9]+$ ]] && shift || SINCE=30
USAGE="$*"
T=$(mktemp -d "${TMPDIR:-/tmp}/lead-watch.XXXXXX"); trap 'rm -rf "$T"' EXIT
F="$T/facts.env"; fact() { printf '%s=%s\n' "$1" "$2" >> "$F"; }
fact SINCE "$SINCE"; fact MODE "$MODE"; fact USAGE "$USAGE"; fact ST "$ST"; fact REPO "$REPO"; fact A "$A"

# ---- 1. GitHub: every open PR in one GraphQL call (labels with their times, the newest comments, checks, files) ----
git fetch -q origin 2>/dev/null || fact ERR_FETCH 1
cat > "$T/q.graphql" <<'EOF'
query($o:String!,$n:String!){ repository(owner:$o,name:$n){ pullRequests(states:OPEN,first:80,orderBy:{field:UPDATED_AT,direction:DESC}){ nodes{
 number title body headRefName isDraft createdAt headRefOid
 labels(first:10){nodes{name}}
 files(first:80){nodes{path}}
 commits(last:1){nodes{commit{committedDate statusCheckRollup{state contexts(first:40){nodes{__typename ... on CheckRun{name status conclusion startedAt completedAt}}}}}}}
 timelineItems(last:100,itemTypes:[LABELED_EVENT,UNLABELED_EVENT,ISSUE_COMMENT]){nodes{__typename
  ... on LabeledEvent{createdAt label{name}} ... on UnlabeledEvent{createdAt label{name}}
  ... on IssueComment{createdAt body}}}
}}}}
EOF
gh api graphql -F o="${REPO%%/*}" -F n="${REPO##*/}" -F query=@"$T/q.graphql" > "$T/prs.json" 2>/dev/null || fact ERR_PRS 1
day0=$(TZ=Asia/Kolkata date -j -f '%Y-%m-%d %H:%M:%S' "$(TZ=Asia/Kolkata date +%Y-%m-%d) 00:00:00" +%s); fact DAY0 "$day0"
gh pr list --state merged --search "merged:>=$(date -u -r "$day0" +%Y-%m-%dT%H:%M:%SZ)" -L 150 \
  --json number,title,mergedAt,mergedBy,headRefName > "$T/merged.json" 2>/dev/null || { echo '[]' > "$T/merged.json"; fact ERR_MERGED 1; }
# Runs of the last 6 hours: machines in use and waiting, batch results, flaky suites, main's health.
gh api "repos/$REPO/actions/runs?per_page=100&created=>=$(date -u -v-6H +%Y-%m-%dT%H:%M:%SZ)" --paginate \
  --jq '.workflow_runs[]|{id,name,event,status,conclusion,run_attempt,created_at,updated_at,run_started_at,head_branch,display_title}' > "$T/runs.ndjson" 2>/dev/null || fact ERR_RUNS 1
gh api "repos/$REPO/actions/workflows/nightly.yml/runs?event=schedule&per_page=2" --jq '.workflow_runs[]|{id,status,conclusion,created_at,event}' > "$T/nightly.ndjson" 2>/dev/null || fact ERR_NIGHTLY 1
# Jobs of runs not finished (the 40-machine limit counts jobs), and the jobs of runs that failed recently (for suite names).
python3 -I -c '
import json,sys,time
from datetime import datetime
win=time.time()-(int(sys.argv[2])+15)*60
for l in open(sys.argv[1]):
    r=json.loads(l)
    if r["status"]!="completed": print(r["id"])
    elif r["conclusion"]=="failure" and datetime.fromisoformat(r["updated_at"].replace("Z","+00:00")).timestamp()>=win: print(r["id"])
' "$T/runs.ndjson" "$SINCE" 2>/dev/null | sort -u | head -30 \
  | xargs -P 8 -I{} gh api "repos/$REPO/actions/runs/{}/jobs?per_page=100" --jq '.jobs[]|{id,run_id,name,status,conclusion}' > "$T/jobs.ndjson" 2>/dev/null
# Suite names come from the failed job's log ("::group::<suite> failed (exit n)", run-suites.sh); each log is read once.
mkdir -p "$ST/suites"
# A job whose log names no suite (a failed step outside the suites) is cached empty, so no log is downloaded twice.
jq -r 'select(.conclusion=="failure" and (.name|startswith("shard"))) | "\(.id) \(.run_id)"' "$T/jobs.ndjson" 2>/dev/null \
  | while read -r j r; do [ -f "$ST/suites/$j" ] || echo "$j $r"; done | head -6 | while read -r j r; do
  { gh api "repos/$REPO/actions/jobs/$j/logs" 2>/dev/null | grep -oE '[^ ]+\.(c?js|ts|mjs) failed \(exit [0-9]+\)' \
      | sed 's/ failed.*//; s#.*/##; s/^##\[group\]//; s/^::group:://' | sort -u; printf 'run=%s\n' "$r"; } > "$ST/suites/$j.tmp"
  mv "$ST/suites/$j.tmp" "$ST/suites/$j"
done
find "$ST/suites" -type f -mtime +2 -delete 2>/dev/null

# ---- 2. The records the check reads, from origin/main (never a copy's own edits) ----
git show "origin/main:$P/qa/CAPABILITIES.md" > "$T/caps-now.md" 2>/dev/null || fact ERR_CAPS 1
c0=$(git rev-list -1 --first-parent --before="$day0" origin/main 2>/dev/null)
[ -n "$c0" ] && git show "$c0:$P/qa/CAPABILITIES.md" > "$T/caps-day.md" 2>/dev/null
git show "origin/main:$P/tools/m2-hot-files.txt" > "$T/hot.txt" 2>/dev/null && fact HOT_ON_MAIN 1 \
  || git show "origin/infra/m3-hot-file-guard:$P/tools/m2-hot-files.txt" > "$T/hot.txt" 2>/dev/null
git show "origin/main:.mergify.yml" 2>/dev/null | grep -E '^  - name:' | sed 's/.*name: *//' | tr '\n' ' ' > "$T/queues.txt"
cp "$P/tools/lead-watch-links.txt" "$T/links.txt" 2>/dev/null || : > "$T/links.txt"
git for-each-ref --format='%(committerdate:unix) %(refname:short)' refs/remotes/origin | sed 's# origin/# #' > "$T/branches.txt"

# ---- 3. The Mac: disk, load, memory, test copies, test databases, Mac builders (P-308, the copy cap, founder 4 Nov) ----
free=$(df -k / | awk 'NR==2 {printf "%.1f", $4/1048576}'); fact DISK "$free"; printf '%s\t%s\n' "$now" "$free" >> "$ST/disk.tsv"
fact LOAD "$(sysctl -n vm.loadavg | awk '{print $3}')"; fact NCPU "$(sysctl -n hw.ncpu)"
fact MEMFREE "$(memory_pressure -Q 2>/dev/null | grep -oE '[0-9]+%' | tr -d %)"
pg="psql -w -h 127.0.0.1 -p 54329 -U xr_studio -d postgres -Atc"
idle=$($pg "select datname from pg_database d where datname like 'xr_studio_%' and datname not like '%demo%' and not exists (select 1 from pg_stat_activity a where a.datname=d.datname)" 2>/dev/null | sort)
fact DBS "$($pg "select count(*)||' ('||pg_size_pretty(coalesce(sum(pg_database_size(datname)),0))||')' from pg_database where datname like 'xr_studio_%'" 2>/dev/null)"
# A database is safe to drop only when it was idle at the previous check too (file times are copied from the template).
# "Two checks" means readings at least 20 minutes apart: a run a minute after the last one keeps the older reading.
both=0; prevt=$(stat -f %m "$ST/idle-dbs.txt" 2>/dev/null || echo 0)
[ -s "$ST/idle-dbs.txt" ] && [ $((now - prevt)) -ge 1200 ] && both=$(comm -12 "$ST/idle-dbs.txt" <(echo "$idle") | grep -c .)
{ [ $((now - prevt)) -ge 1200 ] || [ ! -s "$ST/idle-dbs.txt" ]; } && echo "$idle" > "$ST/idle-dbs.txt"; fact IDLE2 "$both"
# Copies: listening isolated copies on 4430–4499 plus suite runs (their ports are ~33xxx, outside that range: 4 Nov gap).
fact COPIES "$(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk '$9 ~ /:44[3-9][0-9]$/ {print $9}' | sort -u | grep -c .)"
# One suite run = one top-level run-suites.sh process (its forked subshells match the same pattern and are not counted).
sp=" $(pgrep -f 'tools/run-suites.sh' 2>/dev/null | tr '\n' ' ') "; sn=0
for p in $sp; do case "$sp" in *" $(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ') "*) ;; *) sn=$((sn+1));; esac; done; fact SUITES "$sn"
fact WORKTREES "$(git worktree list | grep -c .)"
# Paid AI: the shared ledger in the main copy (reserve and settle lines); the total is read, never estimated (4 Nov: a
# Lead's "night ~US$20.86" was US$70.48 in the ledger).
fact LEDGER "${LEDGER:-$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/.tools/p2-ledger/spend.jsonl}"
# Mac builders (founder 4 Nov ~10:50 IST: builders in the cloud). Allowed: MAC_BUILDERS_OK (default Builder 1, the infra
# lane, and Builder 8, QA-144). A builder works in .claude/worktrees/builder-N-xxxxxx and in copies under that session's
# scratchpad (…builder-N-xxxxxx/…/wt-*): it counts as working when any of them moved HEAD (commit, merge, checkout) in
# 90 minutes. The index is not used: any `git status`, the app's diff view included, rewrites it (review of v2).
busy=""
while read -r wt; do
  name=$(echo "$wt" | grep -oE 'builder-[0-9a-z]+' | head -1); [ -n "$name" ] || continue
  t=$(stat -f %m "$(git -C "$wt" rev-parse --absolute-git-dir 2>/dev/null)/logs/HEAD" 2>/dev/null || echo 0)
  [ $((now - t)) -le 5400 ] && busy="$busy $name"
done < <(git worktree list --porcelain | sed -n 's/^worktree //p')
fact MACB "$(echo "$busy" | tr ' ' '\n' | grep . | sort -u | tr '\n' ' ')"; fact MACB_OK "${MAC_BUILDERS_OK:-builder-1 builder-8}"

# ---- 4. Judge it: flow per item, M2/M3, links, capacity, outcome, pre-mortem, ladder ----
python3 -I - "$T" <<'PY'
import json,os,re,sys,time,subprocess
from datetime import datetime,timezone,timedelta
T=sys.argv[1]; IST=timezone(timedelta(hours=5,minutes=30)); now=time.time()
E={}
for l in open(T+'/facts.env'):
    k,_,v=l.rstrip('\n').partition('='); E[k]=v
ST=E['ST']; SINCE=int(E['SINCE']); A=E['A']
def rd(p,default=''):
    try: return open(p).read()
    except OSError: return default
def ts(s): return datetime.fromisoformat(s.replace('Z','+00:00')).timestamp() if s else None
def hm(t):
    d=datetime.fromtimestamp(t,IST); return d.strftime('%H:%M') if d.date()==datetime.now(IST).date() else d.strftime('%a %d %b %H:%M')
def age(t): return int((now-t)//60) if t else 0
def dur(m): return '%dm'%m if m<120 else '%.1fh'%(m/60)
def tsv(name): return [l.rstrip('\n').split('\t') for l in rd(ST+'/'+name).splitlines() if l.strip()]
out=[]; say=out.append
def fnum(x):
    try: return float(x)
    except (TypeError,ValueError): return None
# A crash must not lose the report or break "exit = ACT lines": print what was read, one ACT line, exit 1.
def _crash(t,e,tb):
    import traceback
    line=traceback.extract_tb(tb)[-1].lineno if tb else '?'
    print('\n'.join(out)); print('ACT  [1 fix it yourself · 0m] lead-watch failed (%s: %s, script line %s): the lines above are all it read {crash}'%(t.__name__,e,line))
    sys.stdout.flush(); os._exit(1)
sys.excepthook=_crash
acts=[]                       # (key, text, minutes past its limit or None)
def ACT(key,text,over=None): acts.append((key,text,over))
risks=[]                      # pre-mortem candidates: (score 0-100, what will fail next, what to do)
def RISK(score,what,do): risks.append((score,what,do))
errs=[k[4:].lower() for k in E if k.startswith('ERR_')]
for e in errs: ACT('err-'+e,'could not read %s: nothing below about it is known (no assumptions); re-run, then check gh auth'%e)

# Capabilities on main now and at the start of the day (IST), M2 and M3 separately.
def caps(path):
    d={}
    for l in rd(path).splitlines():
        c=[x.strip() for x in l.split('|')]
        if len(c)>6 and re.fullmatch(r'C\d+\.\d+',c[1]): d[c[1]]=(c[4],c[5])
    return d
cn=caps(T+'/caps-now.md'); cd=caps(T+'/caps-day.md')
works=lambda d,m:{k for k,(mm,s) in d.items() if mm==m and s=='Works'}
total=lambda m:sum(1 for k,(mm,s) in cn.items() if mm==m)
def ckey(c): a,b=c[1:].split('.'); return (int(a),int(b))
MS={k:m for k,(m,s) in cn.items()}

# Roster, parked PRs, founder asks.
roster=[dict(zip(['name','session','kind','milestone','row','branch','next','since'],r+['-']*(8-len(r)))) for r in tsv('roster.tsv')]
parked={r[0]:r[2] if len(r)>2 else '' for r in tsv('parked.tsv')}
asks=[r for r in tsv('asks.tsv') if len(r)>=4 and r[3]=='-']
branches=[(int(l.split()[0]),l.split()[1]) for l in rd(T+'/branches.txt').splitlines() if len(l.split())==2]
def last_push(prefix):
    t=[u for u,b in branches if prefix and prefix!='-' and b.startswith(prefix) and b!='main']
    return max(t) if t else None
def owner_of(ref):
    for r in roster:
        if r['branch'] not in ('-','') and ref.startswith(r['branch']): return r['name']
    return None

# ---- open PRs: step, wait, blocker ----
try: nodes=json.load(open(T+'/prs.json'))['data']['repository']['pullRequests']['nodes']
except Exception: nodes=[]
# A ruling answers a question only when the comment opens with it ("Tech lead ruling (Lead 4 …)", "The tech lead's rulings",
# "Lead 3's Go"): reviewers quote rulings mid-line ("scoped check per the tech lead's ruling"), and a quote is no answer.
RULING=re.compile(r"^\W*(the\s+)?(tech lead'?s?|lead \d+'?s?)\s*(\([^)]*\)\s*)?:?\s*(rulings?|ruled|answers?|go)\b|^\W*ruled\b",re.I)
QUESTION=re.compile(r'question for the tech lead',re.I)
# A reviewer's verdict: "review", "reviewer" or "Opus" plus Approve / Block / Changes needed near the top (the team writes
# it many ways: "Approve for a7335f0f9", "Head da77b7ab2 has the Opus diff-only Approve", "**Approve**, no Blocker").
REVIEWISH=re.compile(r'\b(review|reviewer|opus)\b',re.I); VWORD=re.compile(r'\b(Approve[ds]?|Block(?:ed|s)?|Changes needed)\b',re.I)
SHA=re.compile(r'\b[0-9a-f]{7,40}\b')
CAPRE=re.compile(r'\bC\d{1,2}\.\d{1,2}\b'); QARE=re.compile(r'\bQA-\d+\b')
hot=[h.strip() for h in rd(T+'/hot.txt').splitlines() if h.strip() and not h.startswith('#')]
PROTO=A+'/prototype/'
prs=[]; batches_open=[]
for p in nodes:
    if (p.get('headRefName') or '').startswith('mergify/'): batches_open.append(p); continue
    L=[l['name'] for l in p['labels']['nodes']]
    c=p['commits']['nodes'][0]['commit'] if p['commits']['nodes'] else {}
    pushed=ts(c.get('committedDate'))
    ch=[x for x in ((c.get('statusCheckRollup') or {}).get('contexts') or {}).get('nodes',[]) if x.get('name') and not x['name'].startswith('Mergify') and x['name']!='Configuration changed']
    fail=[x for x in ch if x.get('conclusion') in ('FAILURE','TIMED_OUT','STARTUP_FAILURE')]
    pend=[x for x in ch if x.get('status')!='COMPLETED']
    gate=[x for x in ch if x['name']=='ci']
    # Green means the "ci" check (Mergify's merge condition) passed; a cancelled or skipped run is not green.
    if fail: ci='red'
    elif pend: ci='running'
    elif not ch: ci='no checks'
    elif (gate and gate[0].get('conclusion')=='SUCCESS') or (not gate and all(x.get('conclusion') in ('SUCCESS','SKIPPED','NEUTRAL') for x in ch)): ci='green'
    else: ci='cancelled'
    red_since=min([ts(x['completedAt']) for x in fail if x.get('completedAt')] or [now]) if fail else None
    lab={}; comments=[]
    for it in p['timelineItems']['nodes']:
        if it['__typename']=='LabeledEvent': lab[it['label']['name']]=ts(it['createdAt'])
        elif it['__typename']=='UnlabeledEvent': lab.pop(it['label']['name'],None)
        elif it['__typename']=='IssueComment': comments.append((ts(it['createdAt']),it['body'] or ''))
    rul=[t for t,b in comments if RULING.search(b[:300])]
    q=[t for t,b in comments if QUESTION.search(b[:400]) and not RULING.search(b[:300])]
    qt=max(q) if q else None
    q_open=qt is not None and not any(t>qt for t in rul)
    verdicts=[]
    for t,b in comments:
        top=b[:300]; m=VWORD.search(top)
        if m and REVIEWISH.search(top) and not QUESTION.search(top):
            verdicts.append((t,'approve' if m.group(1).lower().startswith('approve') else 'block',SHA.findall(b[:800])))
    v=max(verdicts,key=lambda x:x[0]) if verdicts else None
    head=p['headRefOid']
    head_ok=bool(v and v[1]=='approve' and (any(head.startswith(x) for x in v[2]) or v[0]>(pushed or 0)))
    deq=''
    for t,b in comments:
        m=re.search(r'"state": "dequeued".*?"label": "([^"]+)"',b,re.S)
        if m: deq=m.group(1)
    title=p['title']
    caps_named=sorted(set(CAPRE.findall(title)),key=ckey); qas=sorted(set(QARE.findall(title)))
    m3=title.upper().startswith('M3') or any(MS.get(x)=='M3' for x in caps_named)
    kind=(title.split(':')[0].strip().lower() if ':' in title[:12] else 'product')
    files=[f['path'] for f in p['files']['nodes']]
    approved='review: approved' in L
    # The approval time: the label event in the timeline; if it fell out of the window, the first check that saw the label.
    if approved and 'review: approved' not in lab: lab['review: approved']=None
    if p['isDraft']: step,since='draft, owner building',pushed
    elif 'dequeued' in L: step,since='dequeued: '+(deq or 'reason in the PR'),lab.get('dequeued') or pushed
    elif approved and ci=='red': step,since='red after approval',red_since
    elif approved and 'queued' in L: step,since='in the merge queue',lab.get('queued') or lab.get('review: approved') or pushed
    elif approved and ci=='running': step,since='approved, CI running',pushed
    elif approved and ci!='green': step,since='approved, CI %s'%ci,pushed
    elif approved: step,since='approved, green, not queued',lab.get('review: approved') or pushed
    elif q_open: step,since='waiting for the tech lead',qt
    elif ci=='red': step,since='red',red_since
    elif ci=='running': step,since='CI running',pushed
    elif ci in ('cancelled','no checks'): step,since='CI '+ci+': owner pushes or re-runs',pushed
    elif head_ok: step,since='reviewer Approve on head, no label',v[0]
    elif v and v[0]>(pushed or 0): step,since='reviewer %s, owner fixing'%v[1],v[0]
    else: step,since='in review (reviewer, breaker) or owner',pushed
    prs.append(dict(n=p['number'],title=title,ref=p['headRefName'],L=L,draft=p['isDraft'],pushed=pushed,ci=ci,red_since=red_since,
        fail=[x['name'] for x in fail],lab=lab,q_open=q_open,qt=qt,head_ok=head_ok,caps=caps_named,qas=qas,m3=m3,kind=kind,files=files,
        body=p.get('body') or '',approved=approved,step=step,since=since or now,owner=owner_of(p['headRefName']) or p['headRefName'],
        parked=str(p['number']) in parked))
byn={p['n']:p for p in prs}
prev={r[0]:r[1:] for r in tsv('acts.tsv') if len(r)>1 and r[1].isdigit()}

# ---- flow limits (founder 4 Nov): one ACT per PR, its most urgent limit first, the others as "also" ----
for p in prs:
    n=p['n']; w=age(p['since']); o=p['owner']
    if p['parked']: continue
    hits=[]                   # (priority, text, minutes past the limit)
    if p['step'].startswith('dequeued'): hits.append((1,'%s (%s): owner merges main or fixes; a batch failure not its own → re-label'%(p['step'],o),w))
    if p['ci']=='red' and age(p['red_since'])>30:
        hits.append((2,'red %s on %s (%s)%s'%(dur(age(p['red_since'])),', '.join(p['fail'][:3]),o,', approved' if p['approved'] else ''),age(p['red_since'])-30))
    if p['approved']:
        la=p['lab'].get('review: approved')
        if la is None:   # label time unknown: count from the first check that saw this PR approved
            la=int(prev.get('seen#%d'%n,[now])[0])
        wm=age(la)
        if wm>60: hits.append((3,'approved %s ago, not merged (%s; %s): find what holds it'%(dur(wm),p['step'],o),wm-60))
    if p['q_open'] and age(p['qt'])>30: hits.append((4,'question for the tech lead unanswered %s: rule on the PR, first line "Tech lead ruling (Lead N …)" (not by message: 10 per founder turn)'%dur(age(p['qt'])),age(p['qt'])-30))
    if p['step'].startswith('reviewer Approve on head') and w>30:
        hits.append((5,'reviewer Approve on head, green, no label %s (%s): owner labels; refused → founder names the PR'%(dur(w),o),w-30))
    if not p['draft'] and not p['approved'] and not p['q_open'] and p['pushed'] and age(p['pushed'])>90:
        hits.append((6,'last commit %s ago, step "%s" (%s): message the owner its next step, or park it'%(dur(age(p['pushed'])),p['step'],o),age(p['pushed'])-90))
    if hits:
        hits.sort(); top=hits[0]
        ACT('pr#%d'%n,'#%d %s%s'%(n,top[1],''.join(' · also: '+h[1].split(' (')[0] for h in hits[1:])),max(h[2] for h in hits))

# Never two sessions on one row: product PRs naming the same capability or bug from different branches; roster rows.
seen={}
for p in prs:
    if p['parked'] or p['kind'] in ('qa','lead','records','infra'): continue
    for x in p['caps']+p['qas']: seen.setdefault(x,[]).append(p)
for x,ps in sorted(seen.items()):
    refs={q['ref'] for q in ps}
    if len(refs)>1: ACT('dup-'+x,'two open PRs name %s: %s: one owner per row (close or re-scope one)'%(x,', '.join('#%d (%s)'%(q['n'],q['owner']) for q in ps)))
rows={}
for r in roster:
    for x in re.findall(r'C\d+\.\d+|QA-\d+',r['row']): rows.setdefault(x,[]).append(r['name'])
for x,ns in rows.items():
    if len(ns)>1: ACT('duprow-'+x,'%s is held by two sessions: %s'%(x,', '.join(ns)))

# Sessions: a working session shows itself only by pushes (lead skill); waiting on a merge or the Lead is not idle.
for r in roster:
    k=r['kind']; nm=r['name']
    if k in ('standby','lead-standby'): continue
    lp=last_push(r['branch']); mine=[p for p in prs if r['branch'] not in ('-','') and p['ref'].startswith(r['branch'])]
    waiting=any(p['approved'] or p['q_open'] for p in mine)
    if r['branch'] in ('-',''):
        a=age(int(r['since'])) if r['since'].isdigit() else 0
        if a>90: ACT('nobranch-'+nm,'%s has no branch %s after its start or row: a cloud session may still be pending (3 Nov); check it, else replace'%(nm,dur(a)),a-90)
    elif not waiting:
        a=age(max(lp or 0,int(r['since']) if r['since'].isdigit() else 0))
        if a>90: ACT('idle-'+nm,'%s (%s, %s) no push %s: message "continue" plus its next step; a cloud session silent after that → replace'%(nm,k,r['row'],dur(a)),a-90)
    if r['row'] in ('-','') and k in ('cloud','mac'): ACT('norow-'+nm,'%s has no row: give it the next capability without an owner, or end it'%nm)

# ---- batches, machines, flaky suites, nightly, main ----
runs=[json.loads(l) for l in rd(T+'/runs.ndjson').splitlines() if l.strip()]
for r in runs: r['head_branch']=r.get('head_branch') or ''; r['display_title']=r.get('display_title') or ''; r['name']=r.get('name') or ''
jobs=[json.loads(l) for l in rd(T+'/jobs.ndjson').splitlines() if l.strip()]
live=[r for r in runs if r['status']!='completed']
inprog=[r for r in live if r['status']=='in_progress']; queued=[r for r in live if r['status'] in ('queued','waiting','pending','requested')]
jobs_busy=sum(1 for j in jobs if j['status']=='in_progress'); jobs_wait=sum(1 for j in jobs if j['status'] in ('queued','waiting','pending'))
oldest_q=max([age(ts(r['created_at'])) for r in queued] or [0])
bat=[r for r in runs if r['head_branch'].startswith('mergify/merge-queue/')]
bdone=[r for r in bat if r['status']=='completed']
bok=sum(1 for r in bdone if r['conclusion']=='success'); bfail=[r for r in bdone if r['conclusion']=='failure']; bcan=sum(1 for r in bdone if r['conclusion']=='cancelled')
rate=100*len(bfail)/max(1,bok+len(bfail))
suites={}
for f in os.listdir(ST+'/suites') if os.path.isdir(ST+'/suites') else []:
    if f.endswith('.tmp'): continue
    lines=rd(ST+'/suites/'+f).splitlines(); run=[l[4:] for l in lines if l.startswith('run=')]
    for s in lines:
        if s and not s.startswith('run='): suites.setdefault(s,set()).update(run)
runby={str(r['id']):r for r in runs}
def where(rid):
    r=runby.get(rid); return (r['head_branch'] if r else '?')
flaky=[]
for s,rids in suites.items():
    rids={x for x in rids if x in runby}
    br={where(x) for x in rids}
    if len(br)>=2: flaky.append((s,len(br)))
for s,k in flaky: ACT('suite-'+s,'%s failed on %d different branches in 6 h: main or a flake → a P-214 fix ahead of the queue, else quarantine with an owner and a date'%(s,k))
for r in bfail:
    if age(ts(r['updated_at']))<=SINCE+15:
        names=sorted({s for s,rids in suites.items() if str(r['id']) in rids})
        ACT('batch-%s'%r['id'],'batch failed %s (%s): %s; read why before re-labelling the dequeued PRs'%(hm(ts(r['updated_at'])),r['display_title'][13:80],'suites '+', '.join(names) if names else 'see run %s'%r['id']))
if rate>10 and bok+len(bfail)>=4: ACT('batchrate','batch failure rate %d%% in 6 h (over 10%%): keep PRs that touch the same checks out of one batch'%rate)
if jobs_busy+jobs_wait>=36: ACT('jobs','GitHub machines: %d jobs running + %d waiting (limit 40): M3 PR pushes wait (A100) until under 30'%(jobs_busy,jobs_wait))
if queued and oldest_q>10: ACT('runwait','%d runs waiting for a machine, oldest %s: pause M3 pushes so M2 batches get machines (A100)'%(len(queued),dur(oldest_q)),oldest_q-10)
night=[json.loads(l) for l in rd(T+'/nightly.ndjson').splitlines() if l.strip()]
nd=[r for r in night if r['status']=='completed']
# Re-tests of named capabilities run the nightly workflow by hand (workflow_dispatch, #819): counted apart from the night.
rt=[r for r in runs if r['name']=='nightly' and r['event']=='workflow_dispatch' and r['status']=='completed']
rtline=' · re-tests 6 h: %d passed, %d failed'%(sum(1 for r in rt if r['conclusion']=='success'),sum(1 for r in rt if r['conclusion']=='failure')) if rt else ''
nline='nightly ?'
if nd:
    r=nd[0]; nline='nightly %s %s (%s)'%(hm(ts(r['created_at'])),r['conclusion'],r['event'])
    if r['conclusion']!='success': ACT('nightly-%s'%r['id'],'last scheduled nightly %s (%s): read it now (3–4 Nov it ended "cancelled" twice and nobody saw)'%(r['conclusion'],hm(ts(r['created_at']))))
    elif age(ts(r['created_at']))>26*60: ACT('nightly-old','no nightly for %s: the schedule did not fire'%dur(age(ts(r['created_at']))))
mainruns={}
for r in sorted(runs,key=lambda r:r['created_at']):
    if r['head_branch']=='main' and r['status']=='completed' and r['name']!='nightly': mainruns[r['name']]=r
mline=' · '.join('%s %s'%(k,'ok' if r['conclusion']=='success' else r['conclusion']) for k,r in sorted(mainruns.items())) or 'no main runs in 6 h'
for k,r in mainruns.items():
    if r['conclusion']=='failure': ACT('main-'+k,'main: last "%s" run failed (%s): every PR behind it is at risk; find the cause first'%(k,hm(ts(r['updated_at']))))

# ---- the Mac ----
disk=float(E.get('DISK') or 0); load=float(E.get('LOAD') or 0); ncpu=int(E.get('NCPU') or 8)
copies=int(E.get('COPIES') or 0); srun=int(E.get('SUITES') or 0)
dk=[(int(r[0]),fnum(r[1])) for r in tsv('disk.tsv') if len(r)>1 and r[0].isdigit() and fnum(r[1]) is not None]
old=[x for x in dk if 60*60*1.5>=now-x[0]>=25*60]
trend=(disk-old[0][1])/((now-old[0][0])/1800) if old else 0
eta=''
if trend<-0.2 and disk>4: eta='; 4 GB ~%s IST'%hm(now+(disk-4)/(-trend)*1800)
if disk<4: ACT('disk4','disk %.1f GB (under 4): tell Mac builders and qa to pause suite runs, then free space with the founder\'s OK'%disk)
elif disk<10 and int(E.get('IDLE2') or 0)>0: ACT('disk10','disk %.1f GB: %s test databases idle at two checks; ask the founder before dropping (4 Nov: nothing deleted without his OK)'%(disk,E['IDLE2']))
if trend<-0.2 and disk>4 and (disk-4)/(-trend)*30<120: RISK(80,'disk reaches 4 GB in about %s (%.1f GB per 30 min)'%(dur(int((disk-4)/(-trend)*30)),-trend),'name the copies that grow and line up the founder\'s OK to free space now')
macb=E.get('MACB','').split(); ok=E.get('MACB_OK','').split()
for b in macb:
    if b not in ok: ACT('macb-'+b,'Mac builder still working: %s (finish its PR, then stop; new rows go to cloud builders)'%b)
if copies+srun>3: ACT('copycap','Mac copy cap: %d copies or suite runs (cap 3, qa first): the newest builder copy waits'%(copies+srun))
if load>2.5*ncpu: ACT('load','Mac load %.0f on %d cores (qa timeouts at 22–27, 4 Nov): hold new copies until under %d'%(load,ncpu,2*ncpu))
elif load>1.8*ncpu: RISK(50,'Mac load %.0f on %d cores: qa resets time out above ~22'%(load,ncpu),'no new Mac copies this half hour')

# ---- usage (get_usage numbers passed in) ----
U={}
for kv in E.get('USAGE','').split():
    k,_,v=kv.partition('=')
    try: U[k]=float(v.rstrip('%'))
    except ValueError: pass
uline='usage  not given (pass weekly=N five=N context=N from get_usage)'
if U:
    with open(ST+'/usage.tsv','a') as f: f.write('%d\t%s\t%s\t%s\n'%(now,U.get('weekly','-'),U.get('five','-'),U.get('context','-')))
    hist=[(int(r[0]),fnum(r[1])) for r in tsv('usage.tsv') if len(r)>1 and r[0].isdigit() and fnum(r[1]) is not None]
    base=[h for h in hist if 3*3600>=now-h[0]>=20*60]
    w=U.get('weekly'); fc=''
    if w is not None and base:
        rph=(w-base[0][1])/((now-base[0][0])/3600)
        fc=' (%+.1f/h'%rph+('; 85%% ~%s IST'%hm(now+(85-w)/rph*3600) if rph>0 and w<85 else '')+')'
    stand=sum(1 for r in roster if r['kind']=='lead-standby')
    uline='usage  weekly %s%%%s · 5-h %s%% · context %s%% (hand over at 40%%) · standby Leads on the roster %d'%(
        '%g'%w if w is not None else '?',fc,'%g'%U['five'] if 'five' in U else '?','%g'%U['context'] if 'context' in U else '?',stand)
    if w is not None:
        for th,do in ((95,'everything quiet'),(92,'write "Resume on the new account", stop sessions'),(90,'lanes stop with "Stopped here"'),(85,'no new rows; checks every 15 min')):
            if w>=th: ACT('weekly%d'%th,'weekly plan %g%% ≥ %d%%: P-308 — %s'%(w,th,do)); break
    cx=U.get('context')
    if cx is not None and cx>=40: ACT('context','context %g%% (≥ 400k): hand over now — run "lead-watch.sh handover", put it in STATE.md and the notes file, then "take over now"'%cx)
    elif cx is not None and cx>=33: RISK(70,'your context reaches 40%% within about an hour (%g%%)'%cx,'write the hand-over checklist now (lead-watch.sh handover), so nothing waits on memory')
    if cx is not None and cx>=30 and stand==0: ACT('nostandby','no standby Lead on the roster at context %g%%: start one at the founder\'s next typed turn, add it (roster add … lead-standby)'%cx)

# ---- paid AI ----
pline='paid    ledger not found at '+E.get('LEDGER','?')
if os.path.exists(E.get('LEDGER','')):
    res={}; done=set(); tot=day=0.0
    for l in rd(E['LEDGER']).splitlines():
        try: j=json.loads(l)
        except ValueError: continue
        if j.get('type')=='reserve': res[j['id']]=(j.get('worst_usd') or 0)
        elif j.get('type')=='settle':
            done.add(j['id']); a=j.get('actual_usd') or 0; tot+=a
            if (ts(j.get('at')) or 0)>=int(E['DAY0']): day+=a
    inflight=sum(w for k,w in res.items() if k not in done)
    cap=[r for r in tsv('paid-cap.tsv') if r[0]==datetime.now(IST).strftime('%Y-%m-%d')]
    capd=fnum(cap[0][1]) if cap and len(cap[0])>1 else None
    pline='paid    today US$%.2f%s · unsettled reservations (worst) US$%.2f · all time US$%.2f%s'%(day,' of US$%g cap'%capd if capd is not None else ' (no cap set today: lead-watch.sh cap <US$>)',inflight,tot,
        ' of US$%s code cap'%cap[0][2] if cap and len(cap[0])>2 and cap[0][2]!='-' else '')
    if capd is not None and day+inflight>capd: ACT('paidcap','paid AI today US$%.2f + in flight US$%.2f is over the day\'s US$%g cap: stop new paid runs, ask the founder'%(day,inflight,capd))

# ---- M2 and M3, outcome ----
def mblock(m):
    wn,wd=works(cn,m),works(cd,m)
    up=sorted(wn-wd,key=ckey); down=sorted(wd-wn,key=ckey)
    opn=sorted([k for k,(mm,s) in cn.items() if mm==m and s!='Works'],key=ckey)
    owned={x for p in prs if not p['parked'] for x in p['caps']}|{x for r in roster for x in re.findall(r'C\d+\.\d+',r['row'])}
    none=[x for x in opn if x not in owned]
    return wn,up,down,opn,none
m2=mblock('M2'); m3=mblock('M3')
hours=max(1,(now-int(E['DAY0']))/3600)
if len(m2[2])>1: ACT('demote','%d M2 demotions today (%s): P-317 measure is at most 1 a day; find what passed the gates'%(len(m2[2]),' '.join(m2[2])))
merged=json.loads(rd(T+'/merged.json','[]') or '[]')
hand=[x for x in merged if (x.get('mergedBy') or {}).get('login') not in ('mergify','app/mergify','mergify[bot]') and age(ts(x['mergedAt']))<=SINCE]
for x in hand: ACT('hand#%d'%x['number'],'#%d merged by hand (%s) at %s: a hand merge restarts the batch being checked (P-306)'%(x['number'],(x.get('mergedBy') or {}).get('login','?'),hm(ts(x['mergedAt']))))
recent=[x for x in merged if age(ts(x['mergedAt']))<=SINCE]
lasthour=sum(1 for x in merged if age(ts(x['mergedAt']))<=60)
prodday=[x for x in merged if not re.match(r'(?i)(lead|qa|records)\b',x['title'])]
back=sum(1 for p in prs if p['approved'] and (p['ci']=='red' or p['step'].startswith('dequeued')))

# ---- report ----
d=datetime.now(IST); chk=sum(1 for k in tsv('usage.tsv') if k[0].isdigit() and int(k[0])>=int(E['DAY0']))
say('time   %s IST · window %d min%s'%(d.strftime('%d %b %H:%M'),SINCE,' · check %d today'%chk if U else ''))
say(uline)
def mline_(m,b,tot,extra):
    wn,up,down,opn,none=b
    s='%d/%d confirmed (%+d today%s%s)'%(len(wn),tot,len(up)-len(down),': +'+' '.join(up) if up else '',' −'+' '.join(down) if down else '')
    say('── %s  %s%s'%(m,s,extra))
    say('   open %d: %s'%(len(opn),' '.join(opn) if len(opn)<=22 else ' '.join(opn[:22])+' …'))
    if none: say('   no owner (no PR or session): %s'%' '.join(none))
mline_('M2',m2,total('M2'),' · M3 rows open up at 55')
mline_('M3',m3,total('M3'),'')
def flow(m3flag,label):
    ps=[p for p in prs if p['m3']==m3flag]
    rs=[r for r in roster if (r['milestone']=='M3')==m3flag]
    say('── %s workflow and sessions (%d open PRs, %d sessions)'%(label,len(ps),len(rs)))
    for p in sorted(ps,key=lambda p:(p['parked'],-age(p['since']))):
        tag=' '.join(p['caps']+p['qas'])[:24]
        say('   #%-4d %-36s %6s  %-14s %s%s'%(p['n'],p['step'][:36],dur(age(p['since'])),p['owner'][:14],tag,'  parked: '+parked[str(p['n'])][:40] if p['parked'] else ''))
    for r in rs:
        lp=last_push(r['branch'])
        say('   ◦ %-12s %-12s %-14s last commit %-6s next: %s'%(r['name'][:12],r['kind'][:12],r['row'][:14],dur(age(lp)) if lp else '-',r['next'][:60]))
flow(False,'M2'); flow(True,'M3')

# Links between M2 and M3: the Lead's map (lead-watch-links.txt), each state read now.
say('── links M2 ↔ M3')
def prstate(n):
    if n in byn: p=byn[n]; return p['step']+(' '+dur(age(p['since'])) if p['step'] else ''),True
    for x in merged:
        if x['number']==n: return 'merged %s'%hm(ts(x['mergedAt'])),False
    try:
        j=json.loads(subprocess.run(['gh','pr','view',str(n),'--json','state,mergedAt'],capture_output=True,text=True,timeout=20).stdout)
        return (('merged %s'%hm(ts(j['mergedAt']))) if j.get('mergedAt') else j['state'].lower()),j['state']=='OPEN'
    except Exception: return '?',True
links=[]
for l in rd(T+'/links.txt').splitlines():
    if not l.strip() or l.lstrip().startswith('#'): continue
    c=[x.strip() for x in l.split('|')]
    if len(c)<4: continue
    lid,pr,blocks,what=c[0],c[1],c[2].split(),c[3]
    if pr.isdigit(): st,op=prstate(int(pr))
    elif lid.upper().startswith('M2 55'): st,op='%d/55'%len(m2[0]),len(m2[0])<55
    else: st,op='open',True
    nb=sum(1 for b in blocks if b in cn and cn[b][1]!='Works')+sum(1 for b in blocks if b not in cn)
    links.append((lid,pr,blocks,what,st,op,nb))
    say('   %-12s %-6s %-34s blocks %s'%(lid[:12],'#'+pr if pr.isdigit() else '',st[:34],' '.join(blocks)))
mergedline='main: %s'%(E.get('HOT_ON_MAIN') and 'M3 guard on main' or 'M3 guard NOT on main (the check applies it)')
queues=rd(T+'/queues.txt').split()
say('   %s · queues on main: %s%s'%(mergedline,' '.join(queues) or '?',' (one queue: M2 and M3 can share a batch)' if len(queues)<2 else ''))
# M3 PRs changing an M2-hot file (the guard's own rule), and M2/M3 PRs changing the same file (contract files first).
def rel(f): return f[len(PROTO):] if f.startswith(PROTO) else None
for p in prs:
    if not p['m3'] or p['parked']: continue
    for f in p['files']:
        r=rel(f)
        if r and any(r.startswith(h) for h in hot) and ('Hot file approved by the tech lead: '+r) not in p['body']:
            ACT('hot#%d-%s'%(p['n'],r),'M3 #%d changes M2-hot %s without the tech lead\'s approval line: move it or approve it (M3 guard)'%(p['n'],r))
shared={}
for p in prs:
    if p['parked'] or p['kind'] in ('lead','records'): continue
    for f in p['files']:
        if f.startswith(PROTO): shared.setdefault(f,set()).add((p['m3'],p['n']))
clash=[(f,s) for f,s in shared.items() if {m for m,_ in s}=={True,False}]
for f,s in clash[:5]:
    RISK(75 if 'contracts/' in f else 60,'M2 and M3 PRs both change %s (%s): the later one is dequeued or thrown away'%(f[len(PROTO):],' '.join('#%d'%n for _,n in sorted(s,key=lambda x:x[1]))),'merge the M2 one first; the M3 owner rebases after it (no-waste rule)')
say('   M2/M3 PRs on the same file: %d%s'%(len(clash),' ('+', '.join(f[len(PROTO):].split('/')[-1] for f,_ in clash[:4])+')' if clash else ''))
# qa time: capabilities named by today's product merges that are not Works yet are qa's queue, M2 and M3 apart.
due={'M2':set(),'M3':set()}
for x in prodday:
    for c in CAPRE.findall(x['title']):
        if c in cn and cn[c][1]!='Works' and cn[c][0] in due: due[cn[c][0]].add(c)
qa=[r for r in roster if r['kind']=='qa']
say('   qa: sessions M2 %d · M3 %d · re-scores due M2 %s · M3 %s'%(sum(1 for r in qa if r['milestone']!='M3'),sum(1 for r in qa if r['milestone']=='M3'),
    ' '.join(sorted(due['M2'],key=ckey)) or '-',' '.join(sorted(due['M3'],key=ckey)) or '-'))
cp=sorted([x for x in links if x[5]],key=lambda x:-x[6])
say('   critical path (open links, most open capabilities held first): '+(' → '.join('%s%s (%s)'%(x[0],' #'+x[1] if x[1].isdigit() else '',x[4][:32]) for x in cp[:4]) if cp else 'no open link'))
for x in cp[:1]:
    if x[1].isdigit() and int(x[1]) in byn:
        p=byn[int(x[1])]
        why=('red on '+', '.join(p['fail'][:2])) if p['ci']=='red' else p['step'] if p['step'].startswith('dequeued') else ('its question waits %s'%dur(age(p['qt']))) if p['q_open'] else ''
        if why: RISK(90,'the critical path %s #%s is stuck: %s'%(x[0],x[1],why),'make it this half hour\'s first act: its owner, its question, its red check')

say('── capacity')
say('   github  runs %d running, %d waiting%s · jobs %d of 40 (+%d waiting) · open batches %d · 6 h: batches %d passed, %d failed (%d%%), %d cancelled'%(
    len(inprog),len(queued),' (oldest %s)'%dur(oldest_q) if queued else '',jobs_busy,jobs_wait,len(batches_open),bok,len(bfail),rate,bcan))
if flaky: say('   suites failing on 2+ branches: '+', '.join('%s (%d)'%x for x in flaky))
say('   %s%s · main: %s'%(nline,rtline,mline))
say('   '+pline)
say('   mac     disk %.1f GB (%+.1f per 30 min%s) · load %.0f on %d cores · memory free %s%% · copies %d + %d suite runs (cap 3) · test DBs %s · worktrees %s · Mac builders working: %s'%(
    disk,trend,eta,load,ncpu,E.get('MEMFREE','?'),copies,srun,E.get('DBS','?'),E.get('WORKTREES','?'),' '.join(macb) or 'none'))
say('── outcome  confirmed today M2 %+d, M3 %+d (target 10 a day; %.1f per hour so far) · merged in %d min %d, last hour %d · product merges today %d · approved then red or dequeued %d'%(
    len(m2[1])-len(m2[2]),len(m3[1])-len(m3[2]),(len(m2[1])+len(m3[1]))/hours,SINCE,len(recent),lasthour,len(prodday),back))
if recent: say('   merged: '+' '.join('#%d'%x['number'] for x in recent))
les=[r[1] for r in tsv('lessons.tsv') if r[0]==d.strftime('%Y-%m-%d')]
say('   lessons today: '+(' · '.join(les) if les else 'none written yet (lead-watch.sh lesson "…" before 20:00 IST)'))
if asks:
    say('── founder must answer (%d)'%len(asks))
    for a in asks: say('   %s. %s (%s)'%(a[0],a[2][:110],dur(age(int(a[1])))))

# Pre-mortem: what fails next, from what was measured; always one line.
if len(m2[4])>0 and sum(1 for r in roster if r['kind'] in ('standby',) )>0: RISK(55,'%d open M2 capabilities have no owner while a standby builder waits'%len(m2[4]),'give the standby the first one (roster set … row)')
for p in prs:
    if p['approved'] and 'review: approved' in p['lab'] and 45<age(p['lab']['review: approved'])<=60: RISK(65,'#%d crosses the 60-min merge limit within 15 min (%s)'%(p['n'],p['step']),'look at its batch now')
if 0<rate<=10 and len(bfail)>0: RISK(40,'%d batch failed in 6 h; another failing suite in the same shard would throw out the batch behind it'%len(bfail),'check whether the failed suite is the same one twice')
if 28<=jobs_busy+jobs_wait<36: RISK(60,'GitHub machines at %d of 40'%(jobs_busy+jobs_wait),'hold M3 pushes for this half hour')
if U.get('weekly') and U['weekly']>=75: RISK(70,'weekly plan %g%% nears P-308\'s 85%%'%U['weekly'],'list what finishes first, and check every 15 min from 85%')
if not risks and not acts: RISK(10,'nothing measured is near its limit','keep the plan; next look at the item waiting longest: '+(max(prs,key=lambda p:age(p['since']))['step'] if prs else 'none'))
risks.sort(key=lambda r:-r[0])
say('── pre-mortem  next likely failure: '+(risks[0][1]+' → do: '+risks[0][2] if risks else 'see the ACT lines: the oldest one fails next if left'))
for r in risks[1:3]: say('   then: %s → %s'%(r[1],r[2]))

# Escalation ladder: an ACT's age (minutes past its limit, else since first seen) gives its rung, but it climbs at most one
# rung per check and a new item enters at rung 2 at most, so each step is tried before the founder is asked. An ACT the Lead
# acknowledged (`ack <key>`) is shown with its reason and not counted until the ack ends.
RUNGS={1:'fix it yourself',2:'message the owner',3:'replace the session',4:'ask the founder: one question, recommendation first'}
rung=lambda m:1 if m<30 else 2 if m<60 else 3 if m<120 else 4
acks={}
for r in tsv('acks.tsv'):
    if len(r)>1 and r[1].isdigit() and int(r[1])>now: acks[r[0]]=(int(r[1]),r[2] if len(r)>2 else '')
keep=[]; shown=0; acked=[]
for key,text,over in acts:
    p0=prev.get(key); first=int(p0[0]) if p0 else int(now)
    last=int(p0[1]) if p0 and len(p0)>1 and p0[1].isdigit() else None
    m=max(over or 0,age(first)); k=rung(m)
    k=min(k,last+1) if last else min(k,2)
    keep.append('%s\t%d\t%d'%(key,first,k))
    if key in acks: acked.append((key,text,acks[key])); continue
    say('ACT  [%d %s · %s] %s {%s}'%(k,RUNGS[k],dur(m),text,key)); shown+=1
for p in prs:
    if p['approved'] and p['lab'].get('review: approved') is None:
        keep.append('seen#%d\t%d\t0'%(p['n'],int(prev.get('seen#%d'%p['n'],[now])[0])))
for key,text,(until,why) in acked: say('acked {%s} until %s IST: %s — %s'%(key,hm(until),why,text[:90]))
open(ST+'/acts.tsv.tmp','w').write(''.join(x+'\n' for x in keep)); os.replace(ST+'/acts.tsv.tmp',ST+'/acts.tsv')

if E['MODE']=='handover':
    say('══ hand-over checklist (into STATE.md and the notes file before "take over now")')
    say('1. open questions and rulings: '+(', '.join('#%d (%s)'%(p['n'],dur(age(p['qt']))) for p in prs if p['q_open']) or 'none open on PRs'))
    say('2. pending labels: '+(', '.join('#%d (%s)'%(p['n'],p['step']) for p in prs if p['step'].startswith('reviewer Approve') or (p['approved'] and p['ci']!='green')) or 'none'))
    say('3. sessions and their next step:')
    for r in roster: say('   %s · %s · %s · %s · %s · branch %s · next: %s'%(r['name'],r['session'],r['kind'],r['milestone'],r['row'],r['branch'],r['next']))
    say('4. founder asks open: '+('; '.join('%s. %s'%(a[0],a[2]) for a in asks) or 'none'))
    say('5. parked PRs: '+('; '.join('#%s %s'%(k,v) for k,v in parked.items()) or 'none'))
    say('6. the check\'s cron prompt (the next Lead creates the same, minutes 13 and 43):')
    say('   '+(rd(ST+'/cron-prompt.txt').strip() or 'NOT SAVED: run lead-watch.sh cron "<prompt>" first'))
    say('7. lessons today: '+(' · '.join(les) or 'none'))
print('\n'.join(out))
sys.exit(min(shown,125))
PY
