#!/usr/bin/env bash
# B194: the queue gate. Runs queue-gate.sh with GitHub answered by a stand-in curl (PRs, files, comments, the check
# "ci", runs from files; POSTs written to a log) and main's history from a scratch git copy, then checks .mergify.yml
# needs "queue-fresh" for app code and queue-gate.yml runs main's copy. Allowed and refused cases for the label; stale,
# fresh, queued and capped cases for the status. CI-PRE (P-731): the full run before the label (green, red, missing,
# stale, forged, records-only, approved before FULL_FROM) and the relabel after a failed merge batch. P-743: the full run
# is asked only of a PR a failed merge batch held (none, passed, failed). US$0, no network.
#   bash product/tools/check-queue-gate.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
command -v jq >/dev/null || { echo "jq is missing; nothing was checked"; exit 2; }
T=$(mktemp -d "${TMPDIR:-/tmp}/qgate.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/fx"
cat > "$T/bin/curl" <<'EOF'
#!/usr/bin/env bash
m=GET; d=""; u=""
while [ $# -gt 0 ]; do case "$1" in -X) m=$2; shift;; -d) d=$2; shift;; -H) shift;; http*) u=$1;; esac; shift; done
p=${u#https://api.test/repos/o/r/}; pg=$(printf '%s' "$u" | sed -n 's/.*[?&]page=\([0-9]*\).*/\1/p')
serve() { [ -f "$FX/$1" ] && cat "$FX/$1" || { echo '{"message":"Not Found"}'; exit 22; }; }
case "$m $p" in
  "GET pulls/"*/files*) n=${p#pulls/}; n=${n%%/*}; [ "${pg:-1}" = 1 ] && serve "files-$n.json" || echo '[]';;
  "GET pulls/"*) serve "pr-${p#pulls/}.json";;
  "GET pulls?"*) if [ -f "$FX/pulls-p${pg:-1}.json" ]; then cat "$FX/pulls-p${pg:-1}.json"; elif [ "${pg:-1}" = 1 ] && [ -f "$FX/pulls.json" ]; then cat "$FX/pulls.json"; else echo '[]'; fi;;
  "GET actions/workflows/ci.yml/runs?event=workflow_dispatch"*) [ -n "${FAIL_FULL:-}" ] && { echo '{"message":"Server Error"}'; exit 22; }
    [ "${pg:-1}" = 1 ] && [ -f "$FX/fullruns.json" ] && cat "$FX/fullruns.json" || echo '{"workflow_runs":[]}';;
  "GET actions/runs/"*/jobs*) r=${p#actions/runs/}; serve "jobs-${r%%/*}.json";;
  "GET issues/"*/comments*) n=${p#issues/}; n=${n%%/*}; [ "${pg:-1}" = 1 ] || { echo '[]'; exit 0; }
    if [ -f "$FX/comments-extra-$n.json" ] && [ -f "$FX/comments-$n.json" ]; then jq -s add "$FX/comments-$n.json" "$FX/comments-extra-$n.json"; else serve "comments-$n.json"; fi;;
  "GET issues?"*) [ "${pg:-1}" = 1 ] && serve issues.json || echo '[]';;
  "GET commits/"*/check-runs*) s=${p#commits/}; serve "checks-${s%%/*}.json";;
  "GET actions/runs/"*) serve "run-${p#actions/runs/}.json";;
  "POST issues/"*/labels) n=${p#issues/}; echo "LABEL ${n%%/*}" >> "$FX/log"; echo '[]';;
  "POST issues/"*/comments) n=${p#issues/}; echo "COMMENT ${n%%/*} $(echo "$d" | jq -r .body | head -1 | cut -c1-700)" >> "$FX/log"; echo '{}';;
  "POST statuses/"*) echo "STATUS ${p#statuses/} $(echo "$d" | jq -r '.context + " " + .state')" >> "$FX/log"; echo '{}';;
  "POST actions/runs/"*/rerun) r=${p#actions/runs/}; echo "RERUN ${r%%/*}" >> "$FX/log"; echo '{}';;
  *) echo "unexpected $m $p" >> "$FX/log"; exit 22;;
esac
EOF
chmod +x "$T/bin/curl"
G="$TOOLS/queue-gate.sh"
if [ ! -f "$G" ]; then ok "queue-gate.sh exists (B194)" 0 "no $G: nobody labels a reviewed, green PR but a lane, and a stale check joins the queue"; finish; fi
S=ai-workers/x/prototype/studio; HEAD1=1111111111111111111111111111111111111111; OLD=2222222222222222222222222222222222222222
prj() {  # prj <n> <head> [draft] [labels csv] → pulls/<n>
  jq -n --argjson n "$1" --arg h "$2" --argjson d "${3:-false}" --arg l "${4:-}" '{number: $n, state: "open", draft: $d,
    base: {ref: "main"}, head: {sha: $h, ref: "claude/x"}, labels: ($l | split(",") | map(select(length > 0)) | map({name: .}))}' > "$T/fx/pr-$1.json"; }
files() { local n=$1; shift; printf '%s\n' "$@" | jq -R '{filename: .}' | jq -s . > "$T/fx/files-$n.json"; }
cmt() {  # cmt <n> <login> <association> <body>
  jq -n --arg l "$2" --arg a "$3" --arg b "$4" '[{user: {login: $l}, author_association: $a, body: $b}]' > "$T/fx/comments-$1.json"; }
cirun() {  # cirun <head> <status> <conclusion> <started> [attempt] → the check "ci" and run 77
  jq -n --arg s "$2" --arg c "$3" '{check_runs: [{app: {slug: "github-actions"}, status: $s, conclusion: (if $c == "" then null else $c end),
    started_at: "2026-11-15T10:30:00Z", details_url: "https://github.test/o/r/actions/runs/77/job/1"}]}' > "$T/fx/checks-$1.json"
  jq -n --arg t "$4" --argjson a "${5:-1}" --arg s "$2" '{id: 77, run_started_at: $t, run_attempt: $a, status: $s}' > "$T/fx/run-77.json"; }
run() {  # run <mode> <pr> → $out $log $r
  : > "$T/fx/log"; out=$(cd "$T/git" && PATH="$T/bin:$PATH" FX="$T/fx" GH_TOKEN=x REPO=o/r API=https://api.test MAIN_REF=main PR=$2 \
    REVIEWERS="${REV:-}" LABELED_AT="${LAT:-}" TRIGGER="${TRIG:-}" FULL_FROM="${FROM:-}" HEADS="${HEADS:-}" RELABEL="${RELABEL:-}" FAIL_FULL="${FAIL_FULL:-}" bash "$G" "$1" 2>&1); r=$?; log=$(cat "$T/fx/log"); }
# CI-PRE: full <id> <pr> <head> <status> <conclusion> [main's commit] [branch] [event] [path] [repo] → one run of fullruns.json (newest first)
FR='[]'; fullset() { jq -n --argjson r "$FR" '{workflow_runs: $r}' > "$T/fx/fullruns.json"; }
full() { FR=$(jq -c --argjson id "$1" --arg t "full-run PR #$2 $3" --arg s "$4" --arg c "$5" --arg sha "${6:-$MAINSHA}" --arg b "${7:-main}" --arg e "${8:-workflow_dispatch}" --arg p "${9:-.github/workflows/ci.yml}" --arg r "${10:-o/r}" \
    '[{id: $id, display_title: $t, status: $s, conclusion: (if $c == "" then null else $c end), html_url: ("https://github.test/o/r/actions/runs/" + ($id | tostring)), head_sha: $sha, head_branch: $b, event: $e, path: $p, head_repository: {full_name: $r}}] + .' <<< "$FR"); fullset; }
nofull() { FR='[]'; fullset; }
jobs() {  # jobs <run id> <name:conclusion>...
  local id=$1; shift; printf '%s\n' "$@" | jq -R 'capture("^(?<name>.*):(?<conclusion>[a-z_]+)$")' | jq -s '{jobs: .}' > "$T/fx/jobs-$id.json"; }
# main's history: a base, then at 11:00 UTC a merge touching form.ts, at 12:00 one adding a migration.
mkdir -p "$T/git" && cd "$T/git" && git init -q -b main && git config user.email t@t && git config user.name t
mkdir -p "$S/api/src" "$S/prisma/migrations/1_a" && echo a > "$S/api/src/form.ts" && echo a > "$S/api/src/other.ts" && git add -A && GIT_COMMITTER_DATE=2026-11-15T09:00:00Z git commit -qm base
mrg() {  # mrg <time> <n> <file>
  git checkout -qb "b$2" main~0 2>/dev/null || git checkout -qb "b$2"; mkdir -p "$(dirname "$3")"; echo "$2" >> "$3"; git add -A; GIT_COMMITTER_DATE=$1 git commit -qm "x$2"
  git checkout -q main; GIT_COMMITTER_DATE=$1 git merge -q --no-ff "b$2" -m "Merge pull request #$2 from o/b$2"; }
mrg 2026-11-15T11:00:00Z 501 "$S/api/src/form.ts"; mrg 2026-11-15T12:00:00Z 502 "$S/prisma/migrations/2_b/migration.sql"
MAINSHA=$(git rev-parse main); git checkout -qb notmain main && GIT_COMMITTER_DATE=2026-11-15T12:10:00Z git commit -q --allow-empty -m "a PR's own commit" && OFFMAIN=$(git rev-parse HEAD) && git checkout -q main; cd - >/dev/null
# CI-PRE: the earlier cases hold with a green full run on the head (PRs 7 and 9); the full-run cases are below.
full 41 7 $HEAD1 completed success; full 42 9 $HEAD1 completed success

# --- label: allowed and refused
prj 7 $HEAD1; files 7 "$S/api/src/form.ts"; cmt 7 o OWNER "Reviewer: Approve $HEAD1

* **Reviewer (Opus, high):** fine."; cirun $HEAD1 completed success 2026-11-15T13:00:00Z
run label 7
ok "label: the owner's \"Reviewer: Approve <head>\", ci green, no Lead-read path: labelled, with a comment" "$([ $r = 0 ] && grep -qx 'LABEL 7' <<< "$log" && grep -q '^COMMENT 7 \*\*Queue gate (B194):\*\* `review: approved` put on' <<< "$log" && echo 1)" "exit $r: $out / $log"
cmt 7 o OWNER "**Reviewer: Approve** \`$HEAD1\`"; run label 7
ok "label: markdown around the Approve line is read as the line" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
cmt 7 o OWNER "Reviewer: Approve $OLD"; TRIG=approve run label 7
ok "label refused: the Approve names an older commit (with a comment, as the Approve started the run)" "$(! grep -q '^LABEL' <<< "$log" && grep -q '^COMMENT 7 \*\*Queue gate (B194):\*\* `review: approved` not put on' <<< "$log" && echo 1)" "$out / $log"
cmt 7 o OWNER "Reviewer: Approve ${HEAD1:0:9}"; run label 7
ok "label refused: a short SHA is not the head (the full 40 characters, B194)" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
cmt 7 someone NONE "Reviewer: Approve $HEAD1"; run label 7
ok "label refused: an Approve from an account that is not the owner's nor a known reviewer" "$(! grep -q '^LABEL' <<< "$log" && grep -q 'is not an Approve' <<< "$out" && echo 1)" "$out / $log"
cmt 7 helper COLLABORATOR "Reviewer: Approve $HEAD1"; run label 7
ok "label refused: a collaborator not in REVIEWERS" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
REV="other helper" run label 7
ok "label: a known reviewer (REVIEWERS) with write access is allowed" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
cmt 7 helper NONE "Reviewer: Approve $HEAD1"; REV=helper run label 7
ok "label refused: a known reviewer's login without write access (author_association NONE)" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
cmt 7 o OWNER "Reviewer: Approve $HEAD1"
for f in ".github/workflows/x.yml" ".mergify.yml" "ai-workers/x/product/tools/queue-gate.sh" "ai-workers/x/product/tools/lead-read-paths.txt" ".githooks/pre-push" ".claude/skills/next/SKILL.md" "$S/prisma/schema/cases.prisma" "$S/prisma/migrations/3_c/migration.sql" "$S/web/src/runtime/fees.tsx" "$S/api/src/rounds.ts" "$S/prisma/schema/client-money.prisma"; do
  files 7 "$S/api/src/form.ts" "$f"; run label 7
  ok "label refused: $f keeps the Lead's read (P-423)" "$(! grep -q '^LABEL' <<< "$log" && grep -q "Lead's read" <<< "$out" && echo 1)" "$out / $log"
done
# B206 part 3 (P-751): money and permissions keep the Lead's read; a screenshot (*.png under screens/), an image or .txt
# under product/, or a records-only PR (records-only.sh and the "records" label) sets off only the guard lines, never money.
PR3=ai-workers/problem-1-pathway-setup-and-form-filling/product
for f in "$S/api/src/permissions.ts" "$S/api/src/platform/identity/roles.ts" "ai-workers/x/product/tools/fees.md" "ai-workers/x/product/tools/screens/fee.png" ".github/screens/fee.png" "$PR3/tools/fees-shot.png" "$PR3/screens/R1.58/fees.json" "$PR3/qa/walks/payment/walk.cjs" "$S/prisma/migrations/9_fee/README.md" "$PR3/screens/B119/fee-notes.md" "$PR3/screens/B119/shot.png" "$PR3/qa/reports/2026-11-19-fees/README.md" "$PR3/screens/R1.58/payment-rules.md" "$PR3/screens/R1.58/payment-board.html"; do
  files 7 "$S/api/src/form.ts" "$f"; run label 7
  ok "label refused: $f keeps the Lead's read (B206 part 3: money, permissions, the guard lines, and a .md or .html beside code: a suite may read it)" "$(! grep -q '^LABEL' <<< "$log" && grep -q "Lead's read" <<< "$out" && echo 1)" "$out / $log"
done
for f in "$PR3/screens/R1.58/payment-shot.png" "$PR3/qa/reports/2026-11-19-fees/invoice-run.txt" "$PR3/qa/reports/2026-11-19-fees/ledger.jpg" "$S/web/screens/fee-form.png"; do
  files 7 "$S/api/src/form.ts" "$f"; run label 7
  ok "label: $f is a screenshot, or an image or .txt under product/: no Lead read for it (B206 part 3)" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
done
nofull; prj 7 $HEAD1 false records; files 7 "$PR3/qa/reports/2026-11-19-fees/README.md" "$PR3/qa/BUGS.md"; run label 7
ok "label: a records-only PR (records label and records-only.sh) with a fees-named report: no Lead read (B206 part 3)" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
prj 7 $HEAD1; run label 7
ok "label refused: the same files without the records label (set from a full checkout; this job's checkout cannot see a suite reading a .md)" "$(! grep -q '^LABEL' <<< "$log" && grep -q "Lead's read" <<< "$out" && echo 1)" "$out / $log"
prj 7 $HEAD1 false records; RECORDS_ONLY=/nonexistent; export RECORDS_ONLY; run label 7; unset RECORDS_ONLY
ok "label refused: records-only.sh cannot answer, so the records label alone exempts nothing (fails closed)" "$(! grep -q '^LABEL' <<< "$log" && grep -q "Lead's read" <<< "$out" && echo 1)" "$out / $log"
prj 7 $HEAD1 false records; files 7 "$PR3/screens/B119/notes.md"; run label 7
ok "label refused: a records-only PR touching a guard line (screens/B119/) still keeps the Lead's read" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
prj 7 $HEAD1; full 41 7 $HEAD1 completed success
grep -v '^# --- records-exempt' "$TOOLS/lead-read-paths.txt" > "$T/lrp.txt"; files 7 "$S/api/src/form.ts" "$PR3/screens/R1.58/payment-shot.png"; LEAD_READ_PATHS="$T/lrp.txt"; export LEAD_READ_PATHS; run label 7
ok "label refused: no records-exempt marker in the list: nothing is labelled (fails closed)" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
LEAD_READ_PATHS="$T/no-such-file"; run label 7; unset LEAD_READ_PATHS
ok "label refused: the list cannot be read: nothing is labelled (fails closed; it used to match nothing)" "$(! grep -q '^LABEL' <<< "$log" && grep -q 'unreadable' <<< "$out" && echo 1)" "$out / $log"
files 7 "$S/api/src/form.ts"
cmt 7 o OWNER "> Reviewer: Approve $HEAD1"; run label 7
ok "label refused: a quoted Approve line (> ...) is not the reviewer's own" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
jq -n --arg h $HEAD1 '[{user: {login: "o"}, author_association: "OWNER", body: ("Reviewer: Approve " + $h)},
  {user: {login: "o"}, author_association: "OWNER", body: ("Reviewer: Changes needed " + $h + " (round 2: M1)")}]' > "$T/fx/comments-7.json"; run label 7
ok "label refused: a later \"Reviewer: Changes needed\" on the same head wins over the Approve (review m3)" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
jq -n --arg h $HEAD1 '[{user: {login: "o"}, author_association: "OWNER", body: ("Reviewer: Approve " + $h)},
  {user: {login: "o"}, author_association: "OWNER", body: "**Reviewer: Changes requested**: fix M1 first"}]' > "$T/fx/comments-7.json"; run label 7
ok "label refused: a later verdict naming no SHA (\"Reviewer: Changes requested\") wins (round 2 m2)" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
jq -n --arg h $HEAD1 '[{user: {login: "o"}, author_association: "OWNER", body: ("Reviewer: Approve " + $h)},
  {user: {login: "o"}, author_association: "OWNER", body: "Reviewer: Approve 2222222222222222222222222222222222abcdef (another PR quoted)"}]' > "$T/fx/comments-7.json"; run label 7
ok "label: a later verdict about another commit does not undo the head's Approve" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
for w in "ci run 19283746501 failed" "date 20261115" "the page was defaced"; do
  jq -n --arg h $HEAD1 --arg w "$w" '[{user: {login: "o"}, author_association: "OWNER", body: ("Reviewer: Approve " + $h)},
    {user: {login: "o"}, author_association: "OWNER", body: ("Reviewer: Changes requested: " + $w)}]' > "$T/fx/comments-7.json"; run label 7
  ok "label refused: a later Changes requested mentioning \"$w\" (not a SHA) still wins (round 3 m1)" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
done
cmt 7 o OWNER "Reviewer: Approve $HEAD1"
cirun $HEAD1 in_progress "" 2026-11-15T13:00:00Z; run label 7
ok "label refused: ci still running on the head" "$(! grep -q '^LABEL' <<< "$log" && grep -q 'ci on 111111111 is pending' <<< "$out" && echo 1)" "$out / $log"
cirun $HEAD1 completed failure 2026-11-15T13:00:00Z; run label 7
ok "label refused: ci red on the head" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
cirun $HEAD1 completed success 2026-11-15T13:00:00Z; prj 7 $HEAD1 true; run label 7
ok "label refused: a draft" "$(! grep -q '^LABEL' <<< "$log" && echo 1)" "$out / $log"
prj 7 $HEAD1 false "review: approved"; run label 7
ok "label: already labelled, nothing posted" "$([ -z "$log" ] && echo 1)" "$out / $log"
prj 7 $HEAD1; run eligible 7
ok "eligible: exit 0 for the allowed case (label-sweep.sh keeps such a label)" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
cmt 7 o OWNER "Reviewer: Approve $OLD"; run eligible 7
ok "eligible: exit 1 for a refused case" "$([ $r = 1 ] && echo 1)" "exit $r: $out"

# --- CI-PRE (P-731): one green full run on the exact head before the label
REC=ai-workers/problem-1-pathway-setup-and-form-filling/product
cmt 7 o OWNER "Reviewer: Approve $HEAD1"; files 7 "$S/api/src/form.ts"; prj 7 $HEAD1; cirun $HEAD1 completed success 2026-11-15T13:00:00Z
nolabel() { ! grep -q '^LABEL' <<< "$log"; }
BSHA=3333333333333333333333333333333333333333; BOK=4444444444444444444444444444444444444444; BHELD=6666666666666666666666666666666666666666
batch() {  # batch <n> <head sha> <title> [login] [body] → one PR of pulls.json (newest first)
  PL=$(jq -c --argjson n "$1" --arg s "$2" --arg t "$3" --arg u "${4:-mergify[bot]}" --arg b "${5:-}" '[{number: $n, title: $t, body: $b, user: {login: $u}, head: {sha: $s, ref: "mergify/merge-queue/abc", repo: {full_name: "o/r"}}}] + .' <<< "${PL:-[]}"); echo "$PL" > "$T/fx/pulls.json"; }
bci() { jq -n --arg c "$2" --arg id "$3" '{check_runs: [{app: {slug: "github-actions"}, status: "completed", conclusion: $c, started_at: "2026-11-19T04:00:00Z", completed_at: "2026-11-19T04:30:00Z", details_url: ("https://github.test/o/r/actions/runs/" + $id + "/job/1")}]}' > "$T/fx/checks-$1.json"; }
# P-743 (founder 19 Nov 23:5x IST): the full run is asked only of a PR that a failed merge batch held
held() {  # held <pr>...: a failed batch 890 (shard (1)) holds them, and a write-access line covers it, so only the full-run rule speaks
  local n t="merge queue: checking"; for n in "$@"; do t="$t #$n"; done; PL='[]'; batch 890 $BHELD "$t together on main"; bci $BHELD failure 890; jobs 890 "shard (1):failure" "ci:failure"
  for n in "$@"; do jq -n '[{user: {login: "x"}, author_association: "MEMBER", body: "Batch failures covered: 890: shard (1)"}]' > "$T/fx/comments-extra-$n.json"; done; }
unheld() { rm -f "$T/fx/pulls.json" "$T/fx/comments-extra-"*.json; PL='[]'; }
nofull; unheld; run label 7
ok "P-743: no merge batch ever held the PR: labelled with no full run (every batch runs every suite, P-651)" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
run eligible 7
ok "P-743: ... and eligible (label-sweep.sh keeps such a label)" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
HEADS=$HEAD1 RELABEL=1 run proof 7
ok "P-743: ... and proof exits 0 (label-guard.sh keeps it)" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
batch 891 $BOK "merge queue: checking #7 on main"; bci $BOK success 891; run label 7
ok "P-743: the newest batch that held it passed: labelled with no full run" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
held 7; TRIG=approve run label 7
ok "P-743: a failed batch held it and no full run on the head: refused, the comment asks for /run full and names the batch run" "$(nolabel && grep -qF 'no full run on 111111111 yet: comment `/run full`' <<< "$log" && grep -qF 'asked because the merge batch run 890 failed with this PR in it, P-743' <<< "$log" && echo 1)" "$out / $log"
batch 892 $BOK "merge queue: checking #7 on main"; bci $BOK success 892; run label 7
ok "P-743: a newer batch holding it passed after the failed one: labelled with no full run" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
held 7; full 51 7 $HEAD1 completed failure; jobs 51 "shard (4):failure" "ci:failure"; run label 7
ok "P-743: a failed batch held it and the full run is red: refused, naming the full run's failed parts and the batch run" "$(nolabel && grep -qF 'the full run on 111111111 failed: `shard (4)`' <<< "$out" && grep -q 'run 890 failed' <<< "$out" && echo 1)" "$out / $log"
nofull; held 7; cmt 7 o OWNER "Reviewer: Approve $HEAD1"; rm -f "$T/fx/comments-extra-7.json"; full 52 7 $HEAD1 completed success; run label 7
ok "P-743: a failed batch held it, the full run is green but no line names the batch's failed parts: refused (P-731 (4) unchanged)" "$(nolabel && grep -qF 'failed merge batch run 890 (failed: `shard (1)`)' <<< "$out" && echo 1)" "$out / $log"
held 7; run label 7
ok "P-743: a failed batch held it, the full run is green and the line names its parts: labelled" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
nofull; held 7; mv "$T/fx/checks-$BHELD.json" "$T/fx/checks-hidden.json"; run eligible 7
ok "P-743: the batches cannot be read: not eligible, exit 3 (label-sweep.sh keeps the label and tries again; never passed)" "$([ $r = 3 ] && echo 1)" "exit $r: $out"
mv "$T/fx/checks-hidden.json" "$T/fx/checks-$BHELD.json"
# review M1: no failed batch held it, but a full run on the head ended red: refused, and the run is told (never labelled)
unheld; nofull; full 53 7 $HEAD1 completed failure; jobs 53 "shard (6):failure" "ci:failure"; TRIG=full run label 7
ok "P-743 (review M1): no failed batch, but the head's full run is red: refused, the comment names its failed parts" "$(nolabel && grep -qF 'the full run on 111111111 failed: `shard (6)`' <<< "$log" && echo 1)" "$out / $log"
nofull; FAIL_FULL=1 run eligible 7
ok "P-743 (review M1): no failed batch and the full runs cannot be read: nothing is asked, eligible exits 0 (not 3)" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
nofull; full 54 7 $HEAD1 in_progress ""; run label 7
ok "P-743 (review M1): no failed batch and a full run still running: labelled (nothing is asked)" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
# review m2: a failed batch whose run id cannot be read is refused, never passed
nofull; held 7; jq '.check_runs[0].details_url = "https://github.test/elsewhere"' "$T/fx/checks-$BHELD.json" > "$T/fx/x.json" && mv "$T/fx/x.json" "$T/fx/checks-$BHELD.json"; run label 7
ok "P-743 (review m2): a failed batch whose run id cannot be read: refused" "$(nolabel && grep -q "failed merge batch's run cannot be read" <<< "$out" && echo 1)" "$out / $log"
# review m3: the incident itself: the sweep and an innocent batch-mate with no full run
nofull; held 7; LAT=2026-11-19T04:10:00Z run eligible 7
ok "P-743 (review m3): sweep, labelled before the batch failed, no full run: eligible, the batch-mate keeps its label" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
LAT=2026-11-19T05:00:00Z run eligible 7
ok "P-743 (review m3): sweep, label put back after the batch failed, no full run: not eligible, the full run is asked" "$([ $r = 1 ] && grep -q '/run full' <<< "$out" && echo 1)" "exit $r: $out"
# review m1: two PRs in one workflow_run, the held one first: the cache never serves one PR's batch to the other
prj 9 $HEAD1; files 9 "$S/api/src/form.ts"; cmt 9 o OWNER "Reviewer: Approve $HEAD1"; cirun $HEAD1 completed success 2026-11-15T13:00:00Z
nofull; held 9; prj 7 $HEAD1; cmt 7 o OWNER "Reviewer: Approve $HEAD1"
printf '{"workflow_run": {"pull_requests": [{"number": 9}, {"number": 7}]}}' > "$T/fx/ev.json"
: > "$T/fx/log"; out=$(cd "$T/git" && PATH="$T/bin:$PATH" FX="$T/fx" GH_TOKEN=x REPO=o/r API=https://api.test MAIN_REF=main GITHUB_EVENT_NAME=workflow_run GITHUB_EVENT_PATH="$T/fx/ev.json" bash "$G" event 2>&1); r=$?; log=$(cat "$T/fx/log")
ok "P-743 (review m1): one workflow_run naming a held PR (9) then an unheld one (7): 7 labelled, 9 refused" "$(grep -qx 'LABEL 7' <<< "$log" && ! grep -qx 'LABEL 9' <<< "$log" && echo 1)" "$out / $log"
unheld; prj 9 $HEAD1; prj 7 $HEAD1
# The cases below are CI-PRE's full-run rule itself; since P-743 it applies to a PR a failed batch held, so PR 7 is held.
held 7; full 41 7 $HEAD1 completed success; full 42 9 $HEAD1 completed success
run label 7
ok "full run: green on the exact head: labelled" "$(grep -qx 'LABEL 7' <<< "$log" && grep -q 'green full run' <<< "$out" && echo 1)" "$out / $log"
nofull; TRIG=approve run label 7
ok "full run: none on the head: refused, and the comment says /run full" "$(nolabel && grep -q '^COMMENT 7 .*not put on by itself: no full run on 111111111 yet: comment `/run full`' <<< "$log" && echo 1)" "$out / $log"
run eligible 7
ok "full run: none on the head: not eligible (label-sweep.sh takes a workflow's own label off)" "$([ $r = 1 ] && echo 1)" "exit $r: $out"
full 43 7 $OLD completed success; run label 7
ok "full run: green only on an older head (stale): refused" "$(nolabel && grep -q 'no full run on 111111111' <<< "$out" && echo 1)" "$out / $log"
nofull; full 44 7 $HEAD1 completed failure; jobs 44 "kind:success" "shard (3):failure" "shard (5):timed_out" 'packs (C7.3 <img src=x> @someone `id`):failure' "regression (C1.1 C1.2, 2):cancelled" "types:skipped" "ci:failure" "retry-comment:failure"
TRIG=approve run label 7
ok "full run: red: refused, naming the failed parts (the summary job aside)" "$(nolabel && grep -qF 'the full run on 111111111 failed: `shard (3)`; `shard (5)`; `packs (C7.3 img srcx someone id)`; `regression (C1.1 C1.2, 2)` (https://github.test/o/r/actions/runs/44)' <<< "$log" && echo 1)" "$out / $log"
ok "full run: ... and a job's name reaches the comment as plain marks in a code span (no markup, mention or link)" "$(! grep -qE '<img|@someone|`id`' <<< "$log" && echo 1)" "$log"
nofull; full 45 7 $HEAD1 in_progress ""; run label 7
ok "full run: still running: refused" "$(nolabel && grep -q 'has not ended' <<< "$out" && echo 1)" "$out / $log"
nofull; full 46 7 $HEAD1 completed success; full 47 7 $HEAD1 completed failure; jobs 47 "shard (1):failure"; run label 7
ok "full run: a green run and a newer red one on the same head: a green is a green, labelled" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
nofull; full 48 7 $HEAD1 completed success "$OFFMAIN"; run label 7
ok "full run forged: a run whose own commit is not on main's history (a tag or branch named main, the PR's ci.yml): refused" "$(nolabel && echo 1)" "$out / $log"
nofull; full 48 7 $HEAD1 completed success "$(git -C "$T/git" rev-parse b501)"; run label 7
ok "full run forged: a run on an intermediate commit of a merged PR (an ancestor of main, not on its first-parent chain: that commit's own ci.yml): refused" "$(nolabel && echo 1)" "$out / $log"
nofull; full 48 7 $HEAD1 completed success "$(git -C "$T/git" rev-parse main~1)"; run label 7
ok "full run: a run on an earlier commit of main's own chain counts (main moved on since): labelled" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
nofull; full 48 7 $HEAD1 completed success "$MAINSHA" claude/x; run label 7
ok "full run forged: a dispatch on the PR's own branch: refused" "$(nolabel && echo 1)" "$out / $log"
nofull; full 48 7 $HEAD1 completed success "$MAINSHA" main pull_request; run label 7
ok "full run forged: a pull_request run titled like a full run (a PR's title): refused" "$(nolabel && echo 1)" "$out / $log"
nofull; full 48 7 $HEAD1 completed success "$MAINSHA" main workflow_dispatch .github/workflows/other.yml; run label 7
ok "full run forged: another workflow named like it: refused" "$(nolabel && echo 1)" "$out / $log"
nofull; full 48 7 $HEAD1 completed success "$MAINSHA" main workflow_dispatch .github/workflows/ci.yml evil/fork; run label 7
ok "full run forged: a run of another repository: refused" "$(nolabel && echo 1)" "$out / $log"
nofull; full 48 8 $HEAD1 completed success; run label 7
ok "full run: another PR's run on the same commit is not this PR's: refused" "$(nolabel && echo 1)" "$out / $log"
nofull; full 48 7 $HEAD1 completed success; FAIL_FULL=1 run label 7
ok "full run: the runs cannot be read: refused (fails closed)" "$(nolabel && grep -q 'cannot be read' <<< "$out" && echo 1)" "$out / $log"
nofull; files 7 "$REC/STATE.md" "$REC/qa/BUGS.md"; prj 7 $HEAD1 false records; run label 7
ok "full run: a records-only PR (main's records-only.sh on its files, and the records label) is exempt: labelled with no full run" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
prj 7 $HEAD1; run label 7
ok "full run: records-looking files without the records label (set from a full checkout: a .md a suite reads is code) are not exempt: refused" "$(nolabel && echo 1)" "$out / $log"
prj 7 $HEAD1 false records; files 7 "$REC/STATE.md" "$S/api/src/form.ts"; run label 7
ok "full run: the records label on a PR that also changes code (a label anyone can set) is not exempt: refused" "$(nolabel && echo 1)" "$out / $log"
prj 7 $HEAD1; files 7 "$S/api/src/form.ts"; nofull; FAIL_FULL=1 run eligible 7
ok "full run: the runs cannot be read: eligible exits 3 (label-sweep.sh keeps the label and tries again)" "$([ $r = 3 ] && echo 1)" "exit $r: $out"
jq -n --arg h $HEAD1 '[{user: {login: "o"}, author_association: "OWNER", created_at: "2026-11-19T05:00:00Z", body: ("**Reviewer: Approve** `" + $h + "`")}]' > "$T/fx/comments-7.json"
FROM=2026-11-19T06:00:00Z run label 7
ok "FULL_FROM: a head approved before CI-PRE landed keeps the earlier rule: labelled with no full run" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
FROM=2026-11-19T04:00:00Z run label 7
ok "FULL_FROM: a head approved after it needs the run: refused" "$(nolabel && echo 1)" "$out / $log"
jq -n --arg h $HEAD1 '[{user: {login: "o"}, author_association: "OWNER", body: ("Reviewer: Approve " + $h)}, {user: {login: "helper"}, author_association: "COLLABORATOR", created_at: "2026-11-19T05:00:00Z", body: ("Reviewer: Approve " + $h)}]' > "$T/fx/comments-7.json"
FROM=2026-11-19T06:00:00Z run label 7
ok "FULL_FROM: an early Approve line by a collaborator who is not a known reviewer exempts nothing: refused" "$(nolabel && echo 1)" "$out / $log"
jq -n --arg h $HEAD1 '[{user: {login: "o"}, author_association: "OWNER", created_at: "2026-11-19T05:00:00Z", body: ("**Reviewer: Approve** `" + $h + "`")}]' > "$T/fx/comments-7.json"
FROM="2026-11-19 09:00" run label 7
ok "FULL_FROM: a value that is not a UTC time exempts nothing: refused" "$(nolabel && echo 1)" "$out / $log"
run label 7
ok "FULL_FROM unset: a held head needs the run: refused" "$(nolabel && echo 1)" "$out / $log"
# proof (label-guard.sh): any commit of the walk back to the approved one may carry the run
full 49 7 $OLD completed success
HEADS="$HEAD1 $OLD" run proof 7
ok "proof: a green full run on the approved commit under a pure merge of main (HEADS): exit 0" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
HEADS="$HEAD1" run proof 7
ok "proof: no run on any of HEADS: exit 1 with the reason" "$([ $r = 1 ] && grep -q '/run full' <<< "$out" && echo 1)" "exit $r: $out"
run proof 7
ok "proof: HEADS not set: exit 2" "$([ $r = 2 ] && echo 1)" "exit $r: $out"
# ENF-746a (P-746): qa's proof PR (only qa/ records, the records label) needs no full run for label-guard.sh either
# (#2328 lost its label to "no full run"); one app file among them and the run is needed again.
nofull; prj 7 $HEAD1 false records; files 7 "$REC/qa/BUGS.md" "$REC/qa/CAPABILITIES.md" "$REC/qa/reports/2026-11-19-after-merge-r128-works/README.md" "$REC/qa/reports/2026-11-19-after-merge-r128-works/shot.png" "$REC/qa/reports/2026-11-19-after-merge-r128-works/run.txt"
HEADS="$HEAD1" run proof 7
ok "ENF-746a proof: a qa-only proof PR with the records label, no full run anywhere: exit 0 (label kept)" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
files 7 "$REC/qa/BUGS.md" "$REC/qa/reports/2026-11-19-after-merge-r128-works/README.md" "$S/api/src/form.ts"; HEADS="$HEAD1" run proof 7
ok "ENF-746a proof: the same PR with one app file (records label or not): exit 1, the full run is still needed" "$([ $r = 1 ] && grep -q '/run full' <<< "$out" && echo 1)" "exit $r: $out"
prj 7 $HEAD1; files 7 "$S/api/src/form.ts"   # back as the cases below expect

# --- CI-PRE (d): a relabel after a failed merge batch names every failed part of that run
unheld
cov() { jq -n --arg h $HEAD1 --arg a "${2:-OWNER}" --arg b "$1" '[{user: {login: "o"}, author_association: "OWNER", body: ("Reviewer: Approve " + $h)}, {user: {login: "x"}, author_association: $a, body: $b}]' > "$T/fx/comments-7.json"; }
nofull; full 50 7 $HEAD1 completed success; PL='[]'; batch 900 $BSHA "merge queue: checking #6 + #7 together on main"; bci $BSHA failure 900; jobs 900 "shard (3):failure" "regression (C1.1 C1.2, 2):failure" "ci:failure" "fast:success"
cov "nothing yet"; TRIG=approve run label 7
ok "failed batch: no \"Batch failures covered\" line: refused, naming the run and its failed parts" "$(nolabel && grep -qF 'failed merge batch run 900 (failed: `regression (C1.1 C1.2, 2)`; `shard (3)`) and no PR comment line "Batch failures covered: 900:' <<< "$log" && echo 1)" "$out / $log"
cov "Batch failures covered: 900: shard (3)"; TRIG=approve run label 7
ok "failed batch: one failed part missing from the line: refused, naming it" "$(nolabel && grep -qF 'does not name every failed part of that merge batch run: missing `regression (C1.1 C1.2, 2)`' <<< "$log" && echo 1)" "$out / $log"
cov "Fixed both.

**Batch failures covered:** 900: \`shard (3)\`, regression (C1.1 C1.2, 2)"; run label 7
ok "failed batch: every failed part named: labelled" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
cov "Batch failures covered: 900: shard (3), regression (C1.1 C1.2, 2)" NONE; run label 7
ok "failed batch: the line by someone without write access does not count: refused" "$(nolabel && echo 1)" "$out / $log"
cov "Batch failures covered: 901: shard (3), regression (C1.1 C1.2, 2)"; run label 7
ok "failed batch: a line for another run does not count: refused" "$(nolabel && echo 1)" "$out / $log"
cov "Batch failures covered: 900: shard (30), regression (C1.1 C1.2, 2)"; run label 7
ok "failed batch: shard (30) does not name shard (3): refused" "$(nolabel && echo 1)" "$out / $log"
cov "Batch failures covered: 900: shard (3) and regression (C1.1 C1.2, 2)x"; run label 7
ok "failed batch: a part's name inside a longer word does not name it: refused" "$(nolabel && echo 1)" "$out / $log"
jobs 900 "kind:failure" "ci:failure"; cov "Batch failures covered: 900: kindly fixed"; run label 7
ok "failed batch: \"kindly\" does not name the part kind: refused" "$(nolabel && grep -qF 'missing `kind`' <<< "$out" && echo 1)" "$out / $log"
jobs 900 "ci:failure" "fast:success"; cov "Batch failures covered: 900:"; run label 7
ok "failed batch: only the summary job failed (a notes batch): it is the part to name, an empty line is refused" "$(nolabel && grep -qF 'missing `ci`' <<< "$out" && echo 1)" "$out / $log"
cov "Batch failures covered: 900: ci"; run label 7
ok "failed batch: ... and naming it is allowed" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
rm -f "$T/fx/jobs-900.json"; run label 7
ok "failed batch: its failed parts cannot be read: refused, never passed by an empty list" "$(nolabel && grep -q 'cannot be read' <<< "$out" && echo 1)" "$out / $log"
jobs 900 "shard (3):failure" "regression (C1.1 C1.2, 2):failure" "ci:failure" "fast:success"
cov "nothing yet"; run eligible 7
ok "failed batch: eligible (the sweep) does not ask for the line: a batch's other PRs keep their label" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
LAT=2026-11-19T04:10:00Z run eligible 7
ok "failed batch: eligible with LABELED_AT before the batch failed (a member that kept its label): the line is not asked" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
LAT=2026-11-19T05:00:00Z run eligible 7
ok "failed batch: eligible with LABELED_AT after the batch failed (a workflow's token put the label back on): the line is asked, exit 1" "$([ $r = 1 ] && grep -q 'Batch failures covered: 900' <<< "$out" && echo 1)" "exit $r: $out"
HEADS=$HEAD1 RELABEL=1 run proof 7
ok "proof with RELABEL=1 (the label was just put on by hand): exit 1 without the line" "$([ $r = 1 ] && grep -q 'Batch failures covered: 900' <<< "$out" && echo 1)" "exit $r: $out"
HEADS=$HEAD1 run proof 7
ok "proof without RELABEL (a push, Mergify's queued): the batch rule is not asked" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
# a re-run of the failed batch's run (anyone with write access can start one) changes nothing: every attempt counts
jq -n '{check_runs: [{app: {slug: "github-actions"}, status: "completed", conclusion: "failure", started_at: "2026-11-19T04:00:00Z", completed_at: "2026-11-19T04:30:00Z", details_url: "https://github.test/o/r/actions/runs/900/job/1"},
  {app: {slug: "github-actions"}, status: "completed", conclusion: "success", started_at: "2026-11-19T08:00:00Z", completed_at: "2026-11-19T08:40:00Z", details_url: "https://github.test/o/r/actions/runs/900/job/9"}]}' > "$T/fx/checks-$BSHA.json"
run label 7
ok "failed batch: its run re-run to green later is still a failed batch: refused" "$(nolabel && grep -q 'run 900' <<< "$out" && echo 1)" "$out / $log"
jq '.check_runs[1].conclusion = "failure"' "$T/fx/checks-$BSHA.json" > "$T/fx/x.json" && mv "$T/fx/x.json" "$T/fx/checks-$BSHA.json"; LAT=2026-11-19T05:00:00Z run eligible 7
ok "failed batch: its run re-run red after the label was put back: the first failure's time counts, the line is still asked" "$([ $r = 1 ] && grep -q 'run 900' <<< "$out" && echo 1)" "exit $r: $out"
bci $BSHA failure 900
batch 902 $BOK "merge queue: checking #7 on main"; bci $BOK success 902; run label 7
ok "failed batch: a newer batch holding the PR passed: nothing to cover, labelled" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
PL='[]'; batch 900 $BSHA "merge queue: checking #6 + #7 together on main" someone; run label 7
ok "failed batch: a PR that only looks like a batch (not mergify[bot]'s) is not one: labelled" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
PL='[]'; batch 900 $BSHA "merge queue: checking #6 + #77 together on main"; run label 7
ok "failed batch: a batch of other PRs (#77 is not #7): labelled" "$(grep -qx 'LABEL 7' <<< "$log" && echo 1)" "$out / $log"
PL='[]'; batch 900 $BSHA "merge queue: embarking" "mergify[bot]" "pull_requests:
  - number: 6
  - number: 7
"; run label 7
ok "failed batch: members from the body's pull_requests: block when the title names none: refused" "$(nolabel && grep -q 'run 900' <<< "$out" && echo 1)" "$out / $log"
PL='[]'; batch 900 $BSHA "merge queue: checking #6 + #5 together on main" "mergify[bot]" "pull_requests:
  - number: 7
"; run label 7
ok "failed batch: a member the title leaves out is found in the body (title and body together): refused" "$(nolabel && grep -q 'run 900' <<< "$out" && echo 1)" "$out / $log"
PL='[]'; batch 900 $BSHA "merge queue: checking #6 + #7 together on main"; mv "$T/fx/pulls.json" "$T/fx/pulls-p2.json"
seq 1000 1099 | jq -c --arg big "$(head -c 12000 /dev/zero | tr '\0' x)" '{number: ., title: "x", body: $big, user: {login: "someone"}, head: {sha: "5555555555555555555555555555555555555555", ref: "claude/y", repo: {full_name: "o/r"}}}' | jq -s . > "$T/fx/pulls-p1.json"; run label 7
ok "failed batch: a batch older than the 100 newest PRs, each page over 1 MB as GitHub's are, is still found (every PR opened after this one is read): refused" "$(nolabel && grep -q 'run 900' <<< "$out" && echo 1)" "$out / $log"
rm -f "$T/fx/pulls.json" "$T/fx/pulls-p1.json" "$T/fx/pulls-p2.json"; cmt 7 o OWNER "Reviewer: Approve $HEAD1"; nofull; full 41 7 $HEAD1 completed success; full 42 9 $HEAD1 completed success

# --- fresh: the status queue-fresh
cmt 7 o OWNER "Reviewer: Approve $HEAD1"
prj 8 $HEAD1 false "review: approved"; files 8 "$S/api/src/form.ts"; cirun $HEAD1 completed success 2026-11-15T10:00:00Z; run fresh 8
ok "fresh: main merged #501 touching the same file after this ci started: failure, and the labelled PR's ci is re-run" "$(grep -qx "STATUS $HEAD1 queue-fresh failure" <<< "$log" && grep -qx 'RERUN 77' <<< "$log" && grep -q '#501' <<< "$out" && echo 1)" "$out / $log"
jq -n --arg n "$S/api/src/form-v2.ts" --arg o "$S/api/src/form.ts" '[{filename: $n, previous_filename: $o}]' > "$T/fx/files-8.json"; run fresh 8
ok "fresh: a PR that renamed form.ts is stale when main changed form.ts (the old name counts, Devin on #1861)" "$(grep -qx "STATUS $HEAD1 queue-fresh failure" <<< "$log" && echo 1)" "$out / $log"
files 8 "$S/api/src/other.ts"; run fresh 8
ok "fresh: no merge since touches its files: success, no re-run" "$(grep -qx "STATUS $HEAD1 queue-fresh success" <<< "$log" && ! grep -q RERUN <<< "$log" && echo 1)" "$out / $log"
files 8 "$S/prisma/migrations/9_z/migration.sql"; run fresh 8
ok "fresh: both add migrations (#502 after this ci started): failure and a re-run" "$(grep -qx "STATUS $HEAD1 queue-fresh failure" <<< "$log" && grep -qx 'RERUN 77' <<< "$log" && echo 1)" "$out / $log"
files 8 "$S/api/src/form.ts"; cirun $HEAD1 completed success 2026-11-15T11:30:00Z; run fresh 8
ok "fresh: a ci started after the merge touching its file: success" "$(grep -qx "STATUS $HEAD1 queue-fresh success" <<< "$log" && echo 1)" "$out / $log"
cirun $HEAD1 completed success 2026-11-15T10:00:00Z; prj 8 $HEAD1; run fresh 8
ok "fresh: not labelled: pending, never a success a later label could meet (review M2), no re-run" "$(grep -qx "STATUS $HEAD1 queue-fresh pending" <<< "$log" && ! grep -q RERUN <<< "$log" && echo 1)" "$out / $log"
prj 8 $HEAD1 false "review: approved,queued"; run fresh 8
ok "fresh: a queued PR stays success (its batch is built on today's main), no re-run" "$(grep -qx "STATUS $HEAD1 queue-fresh success" <<< "$log" && ! grep -q RERUN <<< "$log" && echo 1)" "$out / $log"
prj 8 $HEAD1 false "review: approved"; cirun $HEAD1 completed success 2026-11-15T10:00:00Z 3; run fresh 8
ok "fresh: after 3 ci attempts it is success (no loop under churn)" "$(grep -qx "STATUS $HEAD1 queue-fresh success" <<< "$log" && ! grep -q RERUN <<< "$log" && echo 1)" "$out / $log"
cirun $HEAD1 in_progress "" 2026-11-15T10:00:00Z; run fresh 8
ok "fresh: ci running: pending, never a cancel or a second run" "$(grep -qx "STATUS $HEAD1 queue-fresh pending" <<< "$log" && ! grep -q RERUN <<< "$log" && echo 1)" "$out / $log"
files 8 "ai-workers/x/product/STATE.md"; run fresh 8
ok "fresh: no app code: success" "$(grep -qx "STATUS $HEAD1 queue-fresh success" <<< "$log" && echo 1)" "$out / $log"

# --- review M2: at labelling, the verdict is posted before the label (Mergify reacts to the label within seconds)
prj 9 $HEAD1; files 9 "$S/api/src/form.ts"; cmt 9 o OWNER "Reviewer: Approve $HEAD1"; cirun $HEAD1 completed success 2026-11-15T10:00:00Z; run label 9
ok "label on a stale head: queue-fresh failure and a re-run come before the label (review M2)" "$(grep -n . <<< "$log" | awk -F: '/STATUS/ && /failure/ {s=$1} /LABEL 9/ {l=$1} END {exit !(s && l && s < l)}' && grep -qx 'RERUN 77' <<< "$log" && echo 1)" "$out / $log"
cirun $HEAD1 completed success 2026-11-15T13:00:00Z; run label 9
ok "label on a fresh head: queue-fresh success before the label" "$(grep -n . <<< "$log" | awk -F: '/STATUS/ && /success/ {s=$1} /LABEL 9/ {l=$1} END {exit !(s && l && s < l)}' && echo 1)" "$out / $log"
# --- events, as GitHub sends them
printf '%s' "{\"issue\": {\"number\": 9, \"pull_request\": {}}, \"comment\": {\"body\": \"Reviewer: Approve $HEAD1\"}}" > "$T/fx/ev.json"
ev() { : > "$T/fx/log"; out=$(cd "$T/git" && PATH="$T/bin:$PATH" FX="$T/fx" GH_TOKEN=x REPO=o/r API=https://api.test MAIN_REF=main GITHUB_EVENT_NAME=$1 GITHUB_EVENT_PATH="$T/fx/ev.json" bash "$G" event 2>&1); r=$?; log=$(cat "$T/fx/log"); }
ev issue_comment
ok "event issue_comment: an Approve comment labels the PR and sets queue-fresh once (no second verdict)" "$([ $r = 0 ] && grep -qx 'LABEL 9' <<< "$log" && [ "$(grep -c '^STATUS' <<< "$log")" = 1 ] && echo 1)" "exit $r: $out / $log"
printf '{"workflow_run": {"pull_requests": [{"number": 9}]}}' > "$T/fx/ev.json"; ev workflow_run
ok "event workflow_run: the PR of a finished ci is labelled and judged" "$([ $r = 0 ] && grep -qx 'LABEL 9' <<< "$log" && grep -q '^STATUS' <<< "$log" && echo 1)" "exit $r: $out / $log"
# CI-PRE: a full run that ended (a workflow_dispatch run of ci.yml): its PR comes from the run's name
prj 9 $HEAD1; printf '{"workflow_run": {"event": "workflow_dispatch", "display_title": "full-run PR #9 %s", "pull_requests": []}}' $HEAD1 > "$T/fx/ev.json"; ev workflow_run
ok "event workflow_run, a green full run: its PR is judged and labelled" "$([ $r = 0 ] && grep -qx 'LABEL 9' <<< "$log" && echo 1)" "exit $r: $out / $log"
nofull; full 60 9 $HEAD1 completed failure; jobs 60 "shard (2):failure" "ci:failure"; held 9; ev workflow_run
ok "event workflow_run, a red full run: the PR is told the failed parts, no label" "$([ $r = 0 ] && ! grep -q '^LABEL' <<< "$log" && grep -qF 'the full run on 111111111 failed: `shard (2)` ' <<< "$log" && grep -q '^COMMENT 9 ' <<< "$log" && echo 1)" "exit $r: $out / $log"
nofull; full 61 9 $HEAD1 completed success; cmt 9 o OWNER "no verdict yet"; ev workflow_run; unheld
ok "event workflow_run, a green full run before the Approve: the PR is told it is green and what the label waits for" "$(! grep -q '^LABEL' <<< "$log" && grep -q '^COMMENT 9 .*full run 61 green on 111111111; the label waits: .*not an Approve' <<< "$log" && echo 1)" "$out / $log"
cmt 9 o OWNER "Reviewer: Approve $HEAD1"
for t in "nightly" "full-run PR #9 $HEAD1; id" "full-run PR #9x $HEAD1" "full-run PR #0 $HEAD1" "x full-run PR #9 $HEAD1"; do
  jq -n --arg t "$t" '{workflow_run: {event: "workflow_dispatch", display_title: $t, pull_requests: []}}' > "$T/fx/ev.json"; ev workflow_run
  ok "event workflow_run: a run by hand named \"$t\" is not a full run: nothing read, nothing posted" "$([ $r = 0 ] && [ -z "$log" ] && echo 1)" "exit $r: $out / $log"
done
nofull; full 41 7 $HEAD1 completed success; full 42 9 $HEAD1 completed success
printf '{"workflow_run": {"pull_requests": [{"number": 404}]}}' > "$T/fx/ev.json"; ev workflow_run
ok "event: a PR that cannot be read makes the run red (exit 2, review m6)" "$([ $r = 2 ] && echo 1)" "exit $r: $out"
printf '[{"number": 9, "pull_request": {}}]' > "$T/fx/issues.json"; ev workflow_dispatch
ok "event workflow_dispatch: a run by hand judges the labelled PRs like a schedule (Lead 84, 19 Nov)" "$([ $r = 0 ] && grep -q '^STATUS' <<< "$log" && ! grep -q 'not handled' <<< "$out" && echo 1)" "exit $r: $out / $log"
rm -f "$T/fx/issues.json"; ev push
ok "event push: the labelled PRs cannot be listed: red (exit 2, round 2 m5)" "$([ $r = 2 ] && echo 1)" "exit $r: $out"
# --- review m1: a long file list is read whole (pipefail and SIGPIPE once made it "no app code")
prj 8 $HEAD1 false "review: approved"; cirun $HEAD1 completed success 2026-11-15T10:00:00Z
{ seq 1 2500 | sed "s|^|$S/api/src/f|; s|$|.ts|"; echo "$S/api/src/form.ts"; } | jq -R '{filename: .}' | jq -s . > "$T/fx/files-8.json"; run fresh 8
ok "fresh: 2,501 files with app code are app code (review m1): stale, failure" "$(grep -qx "STATUS $HEAD1 queue-fresh failure" <<< "$log" && echo 1)" "$out / $log"
( cd "$T/git" && git checkout -qb big main~0 && for i in $(seq 1 3000); do echo "$S/api/src/g$i.ts"; done | while read -r f; do echo x > "$f"; done && git add -A && GIT_COMMITTER_DATE=2026-11-15T12:30:00Z git commit -qm big && git checkout -q main && GIT_COMMITTER_DATE=2026-11-15T12:30:00Z git merge -q --no-ff big -m "Merge pull request #503 from o/big" )
seq 1 3000 | sed "s|^|$S/api/src/g|; s|$|.ts|" | jq -R '{filename: .}' | jq -s . > "$T/fx/files-8.json"; cirun $HEAD1 completed success 2026-11-15T12:10:00Z; run fresh 8
ok "fresh: 3,000 files shared with a merge are still a hit (round 2 m1: no grep -q in a pipe)" "$(grep -qx "STATUS $HEAD1 queue-fresh failure" <<< "$log" && echo 1)" "$out / $log"
files 8 "$S/api/src/form.ts"; rm -f "$T/fx/run-77.json"; run fresh 8
ok "fresh: the ci run cannot be read: pending, no re-run" "$(grep -qx "STATUS $HEAD1 queue-fresh pending" <<< "$log" && ! grep -q RERUN <<< "$log" && echo 1)" "$out / $log"

# --- the wiring
R=$(git -C "$TOOLS" rev-parse --show-toplevel); M="$R/.mergify.yml"; W="$R/.github/workflows/queue-gate.yml"
ok ".mergify.yml: the product queue needs queue-fresh for a PR touching prototype/" "$(awk '/- name: product/,/- name: records/' "$M" | grep -q 'check-success = queue-fresh' && awk '/- name: product/,/- name: records/' "$M" | grep -qF -- '-files ~= /prototype/' && echo 1)" "no queue-fresh condition in the product queue"
ok "queue-gate.yml runs main's copy of queue-gate.sh on comments, ci runs, labels and pushes to main" "$([ -f "$W" ] && grep -q 'ref: main' "$W" && grep -q 'queue-gate.sh event' "$W" && grep -q 'issue_comment' "$W" && grep -q 'workflow_run' "$W" && ! grep -qE 'refs/pull|head\.sha' "$W" && grep -q '"OWNER","MEMBER","COLLABORATOR"' "$W" && grep -q 'types: \[labeled, unlabeled\]' "$W" && echo 1)" "$W (an outsider's comment must start no write-token run, review m2)"
wd=$(python3 -I -c 'import sys,yaml; d=yaml.safe_load(open(sys.argv[1])); on=d[True]; print("ok" if "workflow_dispatch" in on and "github.event_name == '"'"'workflow_dispatch'"'"'" in d["jobs"]["gate"]["if"] else "no")' "$W" 2>&1)
fw=$(python3 -I -c 'import sys,yaml; q=yaml.safe_load(open(sys.argv[1])); g=yaml.safe_load(open(sys.argv[2])); c=yaml.safe_load(open(sys.argv[3])); bad=[]
i=" ".join(q["jobs"]["gate"]["if"].split())
if "github.event.workflow_run.event == '"'"'workflow_dispatch'"'"' && github.event.workflow_run.head_branch == '"'"'main'"'"' && startsWith(github.event.workflow_run.display_title, '"'"'full-run PR #'"'"')" not in i: bad.append("queue-gate.yml does not wake when a full run ends")
env=lambda j, n: [s for s in j["steps"] if n in str(s.get("run", ""))][0].get("env", {})
if "vars.FULL_RUN_FROM" not in str(env(q["jobs"]["gate"], "queue-gate.sh").get("FULL_FROM")): bad.append("queue-gate.yml passes no FULL_FROM")
if "vars.FULL_RUN_FROM" not in str(env(g["jobs"]["sweep"], "label-sweep.sh").get("FULL_FROM")): bad.append("the sweep passes no FULL_FROM")
if g["jobs"]["sweep"]["steps"][0].get("with", {}).get("fetch-depth") != 0: bad.append("the sweep checkout lacks main history (fetch-depth: 0): no full run would count")
if q["jobs"]["gate"]["steps"][0].get("with", {}).get("fetch-depth") != 0: bad.append("the gate checkout lacks main history")
on=c[True]; ins=(on.get("workflow_dispatch") or {}).get("inputs") or {}
import re
txt=open(sys.argv[3]).read()
if len(re.findall(r"GATE_B_NOT_TESTED: \"\$\{\{ github.event_name == .workflow_dispatch. && .warn. \|\| .. \}\}\"", txt)) != 3: bad.append("ci.yml: gate B must warn, not fail, on NOT TESTED in a full run (kind, fast, packs), as in a batch")
if re.search(r"^ *cache: npm *$", txt, re.M): bad.append("ci.yml: a full run (a run of main) must not save to the cache of main")
kb=[s for s in c["jobs"]["kind"]["steps"] if s.get("id") == "b"][0]
if "vars.REVIEWERS" not in str(kb["env"].get("REVIEWERS")) or "reviewer:" not in kb["run"] or kb["run"].find("reviewer:") > kb["run"].find("pr-base.sh") or not re.search(r"grep -qx .\[1-9\]\[0-9\]\*. <<< \"\$ok\" \|\| \{[^}]*exit 1; \}", kb["run"]): bad.append("ci.yml: a full run must check for a reviewed head before the PR code is merged in")
if set(ins) != {"pr", "head"}: bad.append("ci.yml workflow_dispatch inputs are not pr and head: %s" % list(ins))
if "format('"'"'full-run PR #{0} {1}'"'"', inputs.pr, inputs.head)" not in str(c.get("run-name")): bad.append("ci.yml does not name a full run by its inputs")
print("; ".join(bad) or "ok")' "$W" "${W%/*}/label-guard.yml" "${W%/*}/ci.yml" 2>&1)
ok "CI-PRE wiring: queue-gate.yml wakes when a full run ends; gate and sweep hold main's history and FULL_FROM; ci.yml names a full run by its inputs pr and head" "$([ "$fw" = ok ] && echo 1)" "$fw"
ok "queue-gate.yml can be run by hand (workflow_dispatch) and its gate job runs then (Lead 84, 19 Nov: schedules can be dropped)" "$([ "$wd" = ok ] && echo 1)" "$wd"
finish
