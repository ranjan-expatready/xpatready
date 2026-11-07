#!/usr/bin/env bash
# B134 (Lead 30 on #1232): the label sweep. Runs label-sweep.sh with GitHub answered by a stand-in curl (the labelled
# issues and each PR's issue events from files; DELETE and POST written to a log), then checks label-guard.yml runs it
# on a schedule and after ci, from main's copy. The shapes are GitHub's own (#1216's events, 7 Nov: the records label by
# github-actions[bot] type Bot, review: approved by the owner, type User). US$0, no network.
#   bash product/tools/check-label-sweep.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
command -v jq >/dev/null || { echo "jq is missing; nothing was checked"; exit 2; }
T=$(mktemp -d "${TMPDIR:-/tmp}/sweep.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/fx"
cat > "$T/bin/curl" <<'EOF'
#!/usr/bin/env bash
m=GET; d=""; u=""
while [ $# -gt 0 ]; do case "$1" in -X) m=$2; shift;; -d) d=$2; shift;; -H) shift;; http*) u=$1;; esac; shift; done
pg=$(printf '%s' "$u" | sed -n 's/.*[?&]page=\([0-9]*\).*/\1/p')
case "$m $u" in
  "GET "*"/issues?state=open&labels=review%3A%20approved"*) [ -n "${FAIL_LIST:-}" ] && { echo '{"message":"Server Error"}'; exit 22; }
    [ "$pg" = 1 ] && cat "$FX/issues.json" || echo '[]';;
  "GET "*/issues/*/events*) n=$(printf '%s' "$u" | sed 's|.*/issues/\([0-9]*\)/events.*|\1|')
    f="$FX/events-$n-p$pg.json"; [ -f "$f" ] && { cat "$f"; exit 0; }
    [ "$pg" = 1 ] && [ ! -f "$FX/events-$n-p1.json" ] && { echo '{"message":"Server Error"}'; exit 22; }; echo '[]';;
  "DELETE "*/issues/*/labels/review%3A%20approved) n=$(printf '%s' "$u" | sed 's|.*/issues/\([0-9]*\)/labels.*|\1|')
    [ -n "${FAIL_DELETE:-}" ] && { echo '{"message":"Forbidden"}'; exit 22; }; echo "DELETE $n" >> "$FX/log"; echo '[]';;
  "POST "*/issues/*/comments) n=$(printf '%s' "$u" | sed 's|.*/issues/\([0-9]*\)/comments.*|\1|')
    echo "POST $n $(echo "$d" | jq -r .body | head -1 | cut -c1-40)" >> "$FX/log"; echo '{}';;
  *) echo "unexpected $m $u" >> "$FX/log"; exit 22;;
esac
EOF
chmod +x "$T/bin/curl"
S="$TOOLS/label-sweep.sh"
ev() {  # ev <event> <label> <login> <type> → one issue event, as GitHub gives it
  jq -n --arg e "$1" --arg l "$2" --arg a "$3" --arg t "$4" '{event: $e, label: {name: $l}, actor: {login: $a, type: $t}, created_at: "2026-11-07T06:31:45Z"}'; }
evs() { jq -s . ; }   # stdin: events → an array
pr() { jq -n --argjson n "$1" '{number: $n, pull_request: {url: "x"}}'; }
sweep() {  # run the sweep on the fixtures in $T/fx → $out, $log, $r
  : > "$T/fx/log"; out=$(PATH="$T/bin:$PATH" FX="$T/fx" GH_TOKEN=x REPO=o/r API=https://api.test bash "$S" 2>&1); r=$?; log=$(cat "$T/fx/log"); }
reset() { rm -f "$T/fx"/*.json; }

if [ ! -f "$S" ]; then ok "label-sweep.sh exists (B134)" 0 "no $S: a label github-actions[bot] puts on is never taken off"; finish; fi

# 1. The attack: a PR's own job put review: approved on with GITHUB_TOKEN (actor github-actions[bot]).
reset; { pr 7; } | evs > "$T/fx/issues.json"
{ ev labeled records github-actions[bot] Bot; ev labeled "review: approved" github-actions[bot] Bot; } | evs > "$T/fx/events-7-p1.json"
sweep
ok "B134: review: approved put on by github-actions[bot] comes off, with a comment" "$([ $r = 0 ] && grep -qx 'DELETE 7' <<< "$log" && grep -q '^POST 7 \*\*Label sweep (B134):\*\*' <<< "$log" && echo 1)" "exit $r: $out / $log"
# 2. A person's label (the tech lead, or a builder through the claude app: the actor is the person) is kept.
reset; { pr 8; } | evs > "$T/fx/issues.json"
{ ev labeled records github-actions[bot] Bot; ev labeled "review: approved" the-owner User; ev labeled queued "mergify[bot]" Bot; } | evs > "$T/fx/events-8-p1.json"
sweep
ok "B134: review: approved put on by a person is kept (other labels by bots do not count)" "$([ $r = 0 ] && [ -z "$log" ] && grep -q '#8: kept' <<< "$out" && echo 1)" "exit $r: $out / $log"
# 3. Put on by the bot, taken off, put back by a person: the last labeled event decides, kept.
reset; { pr 9; } | evs > "$T/fx/issues.json"
{ ev labeled "review: approved" github-actions[bot] Bot; ev unlabeled "review: approved" the-owner User; ev labeled "review: approved" the-owner User; } | evs > "$T/fx/events-9-p1.json"
sweep
ok "B134: the label as it is now decides (bot, removed, a person put it back): kept" "$([ $r = 0 ] && [ -z "$log" ] && echo 1)" "exit $r: $out / $log"
# 4. A person's label, then the bot's: removed.
reset; { pr 10; } | evs > "$T/fx/issues.json"
{ ev labeled "review: approved" the-owner User; ev unlabeled "review: approved" the-owner User; ev labeled "review: approved" github-actions[bot] Bot; } | evs > "$T/fx/events-10-p1.json"
sweep
ok "B134: a person's label later replaced by the bot's comes off" "$([ $r = 0 ] && grep -qx 'DELETE 10' <<< "$log" && echo 1)" "exit $r: $out / $log"
# 5. The bot's labeled event on page 2 of a long event list (over 100 events) is found.
reset; { pr 11; } | evs > "$T/fx/issues.json"
for i in $(seq 1 100); do ev labeled "review: approved" the-owner User; done | evs > "$T/fx/events-11-p1.json"
{ ev unlabeled "review: approved" the-owner User; ev labeled "review: approved" github-actions[bot] Bot; } | evs > "$T/fx/events-11-p2.json"
sweep
ok "B134: every page of events is read (the bot's label on page 2 comes off)" "$([ $r = 0 ] && grep -qx 'DELETE 11' <<< "$log" && echo 1)" "exit $r: $out / $log"
# 6. Several PRs: only the bot-labelled one loses it; an issue (not a PR) with the label is left alone.
reset; { pr 12; pr 13; jq -n '{number: 14}'; } | evs > "$T/fx/issues.json"
ev labeled "review: approved" the-owner User | evs > "$T/fx/events-12-p1.json"
ev labeled "review: approved" github-actions[bot] Bot | evs > "$T/fx/events-13-p1.json"
ev labeled "review: approved" github-actions[bot] Bot | evs > "$T/fx/events-14-p1.json"
sweep
ok "B134: of several PRs only the bot-labelled one loses it; an issue is not a PR and is not touched" "$([ $r = 0 ] && [ "$(grep -c '^DELETE' <<< "$log")" = 1 ] && grep -qx 'DELETE 13' <<< "$log" && echo 1)" "exit $r: $out / $log"
# 7. A PR whose events cannot be read keeps its label, the run goes red, the others are still judged.
reset; { pr 15; pr 16; } | evs > "$T/fx/issues.json"
ev labeled "review: approved" github-actions[bot] Bot | evs > "$T/fx/events-16-p1.json"
sweep
ok "B134: events unreadable: that PR keeps its label, the run is red (2), the next PR is still swept" "$([ $r = 2 ] && grep -q '#15: events unreadable' <<< "$out" && grep -qx 'DELETE 16' <<< "$log" && ! grep -qx 'DELETE 15' <<< "$log" && echo 1)" "exit $r: $out / $log"
# 8. The list cannot be read: nothing is removed, red. A removal GitHub refuses: red, never silent.
reset; pr 17 | evs > "$T/fx/issues.json"; ev labeled "review: approved" github-actions[bot] Bot | evs > "$T/fx/events-17-p1.json"
: > "$T/fx/log"; out=$(PATH="$T/bin:$PATH" FX="$T/fx" FAIL_LIST=1 GH_TOKEN=x REPO=o/r API=https://api.test bash "$S" 2>&1); r=$?; log=$(cat "$T/fx/log")
ok "B134: the labelled PRs cannot be listed: nothing removed, the run is red" "$([ $r = 2 ] && [ -z "$log" ] && echo 1)" "exit $r: $out / $log"
: > "$T/fx/log"; out=$(PATH="$T/bin:$PATH" FX="$T/fx" FAIL_DELETE=1 GH_TOKEN=x REPO=o/r API=https://api.test bash "$S" 2>&1); r=$?; log=$(cat "$T/fx/log")
ok "B134: GitHub refuses the removal: the run is red and says so" "$([ $r = 2 ] && grep -q 'could not be removed' <<< "$out" && echo 1)" "exit $r: $out / $log"
# 9. A label with no labeled event in its list (GitHub trimmed it): kept, red, never silent.
reset; pr 18 | evs > "$T/fx/issues.json"; ev labeled records github-actions[bot] Bot | evs > "$T/fx/events-18-p1.json"
sweep
ok "B134: no labeled event for the label: kept, and the run is red" "$([ $r = 2 ] && [ -z "$log" ] && echo 1)" "exit $r: $out / $log"

# 10. Wiring: label-guard.yml's job sweep runs on a schedule and after ci, from main, checks out no PR, holds the token.
W="$(cd "$TOOLS/../../../.." && pwd)/.github/workflows/label-guard.yml"
wire=$(python3 -I - "$W" <<'PY' 2>&1
import sys, yaml
d = yaml.safe_load(open(sys.argv[1])); on = d.get(True, d.get("on")); out = []
if not on.get("schedule"): out.append("no schedule")
wr = on.get("workflow_run") or {}
if "ci" not in (wr.get("workflows") or []) or "completed" not in (wr.get("types") or []): out.append("no workflow_run on ci completed")
j = d["jobs"].get("sweep")
if not j: out.append("no job sweep")
else:
    if "schedule" not in j.get("if", "") or "workflow_run" not in j.get("if", ""): out.append("sweep's if: " + j.get("if", ""))
    co = [s for s in j["steps"] if str(s.get("uses", "")).startswith("actions/checkout")]
    if not co or co[0].get("with", {}).get("ref") != "main" or co[0]["with"].get("persist-credentials") is not False: out.append("sweep does not check out main without a kept token")
    runs = " ".join(str(s.get("run", "")) for s in j["steps"])
    if "label-sweep.sh" not in runs or "pr/" in runs or "head" in runs: out.append("sweep's run: " + runs)
g = d["jobs"]["guard"].get("if", "")
if "github.event.pull_request" not in g: out.append("the guard job's if changed: " + g)
print("; ".join(out) or "ok")
PY
)
ok "B134: label-guard.yml runs the sweep every 10 min and after each ci run, main's copy, no PR checked out" "$([ "$wire" = ok ] && echo 1)" "$wire"
cron=$(python3 -I -c 'import sys,yaml; d=yaml.safe_load(open(sys.argv[1])); print(d[True]["schedule"][0]["cron"])' "$W" 2>&1)
ok "B134: the schedule is every 10 minutes (a batch takes 30+ min, so the sweep comes before the merge)" "$([ "$cron" = "*/10 * * * *" ] && echo 1)" "$cron"
finish
