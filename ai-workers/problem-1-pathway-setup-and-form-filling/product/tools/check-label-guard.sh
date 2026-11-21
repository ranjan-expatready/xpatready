#!/usr/bin/env bash
# Guard 2 (founder, 6 Nov ~03:00 IST): a label never outlives a review. Runs label-guard.sh on real git histories with
# GitHub answered by a stand-in curl (labels, comments, reviews from files; DELETE and POST written to a log). Cases:
# #1052's (a new fix commit, Approve only on the old head) loses the label; an Approve naming the new head, a GitHub
# review on it, or a pure merge of main touching none of the PR's files keeps it. US$0, no network.
#   bash product/tools/check-label-guard.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
command -v jq >/dev/null || { echo "jq is missing; nothing was checked"; exit 2; }
T=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/fx"
cat > "$T/bin/curl" <<'EOF'
#!/usr/bin/env bash
m=GET; d=""; u=""
while [ $# -gt 0 ]; do case "$1" in -X) m=$2; shift;; -d) d=$2; shift;; -H) shift;; http*) u=$1;; esac; shift; done
case "$m $u" in
  "GET "*/labels) cat "$FX/labels.json";;
  "GET "*/comments*) [ -n "${FAIL_COMMENTS:-}" ] && { echo '{"message":"Server Error"}'; exit 22; }
    case "$u" in *page=1) cat "$FX/comments.json";; *) echo '[]';; esac;;
  "GET "*/pulls/1052) cat "$FX/pull.json" 2>/dev/null || echo '{}';;
  "GET "*/reviews*page=1) cat "$FX/reviews.json";;
  "GET "*) echo '[]';;
  "DELETE "*/labels/review%3A%20approved) echo "DELETE label" >> "$FX/log"; echo '[]';;
  "POST "*/comments) echo "POST comment $(echo "$d" | jq -r .body | head -1)" >> "$FX/log"; echo "$d" | jq -r .body > "$FX/body"; echo '{}';;
  *) echo "unexpected $m $u" >> "$FX/log"; exit 22;;
esac
EOF
chmod +x "$T/bin/curl"
# CI-PRE (P-731): queue-gate.sh proof, answered by a stand-in (its own cases are in check-queue-gate.sh): it writes what it
# was asked and exits as $FX/proof says ("<exit code> <reason>"; no file: 0).
printf '#!/usr/bin/env bash\necho "$1 PR=$PR HEADS=$HEADS RELABEL=$RELABEL" > "$FX/proof.log"\n[ -f "$FX/proof" ] || exit 0\nread -r c why < "$FX/proof"; echo "$why"; exit "$c"\n' > "$T/bin/qg"; chmod +x "$T/bin/qg"
G="$TOOLS/label-guard.sh"
# History: main has a.txt and b.txt; the PR changes a.txt (c1, approved), then pushes a fix (c2) or merges main.
R="$T/repo"; git init -q -b main "$R"; cd "$R" && git config user.email t@t && git config user.name t && git config commit.gpgsign false
printf '1\n2\n3\n4\n5\n6\n7\n8\n' > a.txt; echo b > b.txt; git add -A && git commit -qm base
git checkout -qb pr; sed -i.bak 's/^1$/one/' a.txt; rm -f a.txt.bak; git commit -qam c1; c1=$(git rev-parse HEAD)
echo fix >> a.txt; git commit -qam c2; c2=$(git rev-parse HEAD)
git checkout -q main; echo b2 > b.txt; git commit -qam "main: b"; mb=$(git rev-parse HEAD)
git checkout -q -b m1 "$c1"; git merge -q --no-edit main >/dev/null 2>&1; pure=$(git rev-parse HEAD)
git checkout -q -b m3 "$c1"; git merge -q --no-edit --no-commit main >/dev/null 2>&1; echo sneaked > c.txt; git add c.txt; git commit -qm "merge + edit"; evil=$(git rev-parse HEAD)
git checkout -q main; echo e > e.txt; git add e.txt; git commit -qm "main: e"
git checkout -q -b m5 "$pure"; git merge -q --no-edit main >/dev/null 2>&1; pure2=$(git rev-parse HEAD)
git checkout -q -b m6 "$c2"; git merge -q --no-edit main >/dev/null 2>&1; fixmerged=$(git rev-parse HEAD)
git checkout -q main; sed -i.bak 's/^8$/eight/' a.txt; rm -f a.txt.bak; git commit -qam "main: a"
git checkout -q -b m2 "$c1"; git merge -q --no-edit main >/dev/null 2>&1; mine=$(git rev-parse HEAD)
git checkout -q -b side "$c1"; echo x > d.txt; git add d.txt; git commit -qm side; git checkout -q -b m4 "$c1"; git merge -q --no-edit side; notmain=$(git rev-parse HEAD)
git checkout -q main
label='[{"name":"review: approved"},{"name":"queued"}]'
guard() {  # $1 before, $2 after, $3 labels, $4 comments, $5 reviews, $6 the PR's head now → $out, $log
  jq -n --arg h "${6:-$2}" '{head: {sha: $h}}' > "$T/fx/pull.json"; [ "${6:-}" = unreadable ] && rm -f "$T/fx/pull.json"
  echo "$3" > "$T/fx/labels.json"; echo "$4" > "$T/fx/comments.json"; echo "${5:-[]}" > "$T/fx/reviews.json"; : > "$T/fx/log"
  out=$(cd "$R" && PATH="$T/bin:$PATH" FX="$T/fx" GH_TOKEN=x REPO=o/r PR=1052 BEFORE="$1" AFTER="$2" API=https://api.test MAIN_REF=main QUEUE_GATE="$T/bin/qg" LABELED="${LABELED:-}" bash "$G" 2>&1); r=$?
  log=$(cat "$T/fx/log"); }
cm() { jq -n --arg b "$1" --arg a "${2:-OWNER}" '[{body: $b, author_association: $a}]'; }
removed() { [ $r = 0 ] && echo "$log" | grep -q '^DELETE label' && echo "$log" | grep -q '^POST comment \*\*Label guard:\*\*' && echo 1; }
kept() { [ $r = 0 ] && [ -z "$log" ] && echo 1; }

guard "$c1" "$c2" "$label" "$(cm "**Reviewer: Approve** \`${c1:0:9}\` (Opus, round 3)")"
ok "#1052's case: a fix commit with Approve only on the old head loses the label, with a comment" "$(removed)" "exit $r, $out / $log"
guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve ${c2}")"
ok "an Approve line naming the new head's full SHA keeps the label" "$(kept)" "exit $r, $out / $log"
guard "$c1" "$c2" "$label" "$(cm "Round 2 done.
**Reviewer: Approve** on \`${c2:0:9}\`, diff-only, 0 Majors")"
ok "a 9-character SHA in a markdown Approve line keeps the label" "$(kept)" "$out / $log"
guard "$c1" "$c2" "$label" "$(cm "the label goes on after the reviewer approves ${c2:0:9}")"
ok "prose that mentions the SHA without 'Reviewer: Approve' does not count" "$(removed)" "$out / $log"
guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve ${c2:0:6}")"
ok "a SHA shorter than 7 characters does not count" "$(removed)" "$out / $log"
guard "$c1" "$c2" "$label" "[]" "$(jq -n --arg h "$c2" '[{state:"APPROVED",commit_id:$h,author_association:"OWNER"}]')"
ok "a GitHub review APPROVED on the new head keeps the label" "$(kept)" "$out / $log"
guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve ${c2}" NONE)"
ok "an Approve line from someone without write access (anyone, on a public repository) does not count" "$(removed)" "$out / $log"
guard "$c1" "$c2" "$label" "[]" "$(jq -n --arg h "$c2" '[{state:"APPROVED",commit_id:$h,author_association:"CONTRIBUTOR"}]')"
ok "a GitHub review from someone without write access does not count" "$(removed)" "$out / $log"
guard "$c1" "$c2" "$label" "[]" "$(jq -n --arg h "$c1" '[{state:"APPROVED",commit_id:$h,author_association:"OWNER"}]')"
ok "a GitHub review on the old head does not count" "$(removed)" "$out / $log"
guard "$c1" "$pure" "$label" "$(cm "Reviewer: Approve $c1")"
ok "a pure merge of main touching none of the PR's files, on an approved commit, keeps the label (P-318 (1))" "$(kept)" "$out / $log"
guard "$pure" "$pure2" "$label" "$(cm "Reviewer: Approve ${c1:0:9}")"
ok "two pure merges of main on an approved commit keep the label" "$(kept)" "$out / $log"
guard "$c2" "$fixmerged" "$label" "$(cm "Reviewer: Approve $c1")"
ok "review M2: an unreviewed fix, then a pure merge of main (the fix's own run cancelled), loses the label" "$(removed)" "$out / $log"
echo "$out" | grep -q "${c2:0:9} is a new commit"; ok "... naming the unreviewed commit" "$([ $? = 0 ] && echo 1)" "$out"
guard "$c1" "$c1" "$label" "$(cm "Reviewer: Approve $c1")" "[]" "$c2"
ok "a run for an approved push checks the PR's head now (a newer unreviewed push) and removes the label" "$(removed)" "$out / $log"
guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve ${c1:0:9} (diff since ${c2:0:9}, which was Blocked)")"
ok "only the first SHA after 'Approve' counts (review n1)" "$(removed)" "$out / $log"
guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve $c2")" "[]" unreadable
ok "a PR head that cannot be read keeps no label (fails closed)" "$(removed)" "$out / $log"
guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve $c2")" "[]" 0123456789abcdef0123456789abcdef01234567
ok "a PR head that cannot be fetched keeps no label (fails closed)" "$(removed)" "$out / $log"
FAIL_COMMENTS=1 guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "comments that cannot be read count as no Approve (fails closed)" "$(removed)" "$out / $log"
guard "$c1" "$c2" "$label" "[]"; body=$(grep '^POST' "$T/fx/log")
ok "the guard's own comment names no SHA after 'Reviewer: Approve' (it must never approve itself)" "$( ! echo "$body" | grep -qiE 'reviewer: approve[^a-z]*[0-9a-f]{7}' && echo 1)" "$body"
guard "$c1" "$mine" "$label" "[]"
ok "a merge of main that changes the PR's own file loses the label" "$(removed)" "$out / $log"
echo "$out" | grep -q 'a.txt'; ok "... and names that file" "$([ $? = 0 ] && echo 1)" "$out"
guard "$c1" "$evil" "$label" "[]"
ok "a merge of main with a hand edit added loses the label" "$(removed)" "$out / $log"
guard "$c1" "$notmain" "$label" "[]"
ok "a merge of a branch that is not main loses the label" "$(removed)" "$out / $log"
guard "$c2" "$pure" "$label" "[]"
ok "with no Approve anywhere, a pure merge alone does not keep the label" "$(removed)" "$out / $log"
guard "$c1" "$c2" '[{"name":"queued"}]' "[]"
ok "no label: nothing is removed or posted" "$(kept)" "$out / $log"
# F4 (founder, 6 Nov): the label being added runs the guard too. A labeled event has no push: BEFORE is empty and AFTER is
# the PR's head (the workflow passes github.event.pull_request.head.sha).
guard "" "$c2" "$label" "$(cm "Reviewer: Approve ${c1:0:9}")"
ok "F4: the label added to a head whose Approve names only an older commit comes off at once, with a comment" "$(removed)" "exit $r, $out / $log"
echo "$log" | grep -q '(was '; ok "... and the comment names no earlier push" "$([ $? != 0 ] && echo 1)" "$log"
guard "" "$c2" "$label" "[]"
ok "F4: the label added to a head with no Approve at all comes off" "$(removed)" "$out / $log"
guard "" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "F4: the label added to a head with its Approve stays" "$(kept)" "$out / $log"
guard "" "$pure" "$label" "$(cm "Reviewer: Approve $c1")"
ok "F4: the label added on a pure merge of main over an approved commit stays" "$(kept)" "$out / $log"
# CI-PRE (P-731): a reviewed head also needs queue-gate.sh proof (a green full run; after a failed batch, its failed parts named)
echo "1 no full run on ${c2:0:9} yet: comment \`/run full\` on the PR" > "$T/fx/proof"
guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "CI-PRE: an approved head with no green full run loses the label, and the comment carries the reason" "$([ $r = 0 ] && grep -q '^DELETE label' <<< "$log" && grep -q '^POST comment \*\*Label guard (CI-PRE, P-731):\*\* `review: approved` removed from the head .*: no full run on .* yet: comment `/run full`' <<< "$log" && echo 1)" "exit $r, $out / $log"
ok "CI-PRE: ... and says the full run is asked only after a failed merge batch (P-743)" "$(grep -q 'after a failed merge batch held this PR, the label needs one green full run on the head' "$T/fx/body" && grep -q 'a PR no failed batch held needs neither (P-743)' "$T/fx/body" && echo 1)" "$(cat "$T/fx/body")"
echo "1 no full run on ${c2:0:9} yet: comment \`/run full\` on the PR (asked because the merge batch run 890 failed with this PR in it, P-743)" > "$T/fx/proof"
guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "P-743: a PR a failed batch held, with no full run: the label comes off and the comment names the batch run" "$(grep -q '^DELETE label' <<< "$log" && grep -q 'asked because the merge batch run 890 failed with this PR in it, P-743' <<< "$log" && echo 1)" "exit $r, $out / $log"
rm -f "$T/fx/proof"; guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "P-743: a reviewed head that no failed batch held (proof exits 0 with no full run): the label stays" "$(kept)" "$out / $log"
echo "1 no full run on ${c2:0:9} yet: comment \`/run full\` on the PR" > "$T/fx/proof"; guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "CI-PRE: ... asked for the head alone, not as a relabel (a push)" "$(grep -qx "proof PR=1052 HEADS= $c2 RELABEL=0" "$T/fx/proof.log" && echo 1)" "$(cat "$T/fx/proof.log")"
guard "$pure" "$pure2" "$label" "$(cm "Reviewer: Approve ${c1:0:9}")"
ok "CI-PRE: under pure merges of main, the run may be on any commit back to the approved one (P-318 (1) stays exempt)" "$(grep -qx "proof PR=1052 HEADS= $pure2 $pure $c1 RELABEL=0" "$T/fx/proof.log" && echo 1)" "$(cat "$T/fx/proof.log")"
LABELED="review: approved" guard "" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "CI-PRE: the label just put on is a relabel (the failed-batch rule is asked)" "$(grep -qx "proof PR=1052 HEADS= $c2 RELABEL=1" "$T/fx/proof.log" && echo 1)" "$(cat "$T/fx/proof.log")"
LABELED="queued" guard "" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "CI-PRE: Mergify's queued is not a relabel (a batch's other PRs keep their label)" "$(grep -qx "proof PR=1052 HEADS= $c2 RELABEL=0" "$T/fx/proof.log" && echo 1)" "$(cat "$T/fx/proof.log")"
echo "2 queue-gate: GH_TOKEN is not set" > "$T/fx/proof"; guard "$c1" "$c2" "$label" "$(cm "Reviewer: Approve $c2")"
ok "CI-PRE: a proof that could not finish stops the guard (exit 2; the workflow then takes the label off)" "$([ $r = 2 ] && [ -z "$log" ] && echo 1)" "exit $r, $out / $log"
rm -f "$T/fx/proof" "$T/fx/proof.log"; guard "$c1" "$c2" "$label" "[]"
ok "CI-PRE: a head with no Approve is never asked for a full run (the review comes first)" "$([ "$(removed)" = 1 ] && [ ! -e "$T/fx/proof.log" ] && echo 1)" "$out / $log"
# ENF-746a (P-746): qa's proof PR (records only) keeps its Approve across a merge of main that changes the same records
# files (#2291 lost it: "merge of main changes the PR's own files"). Main's records-only.sh judges the paths for real.
Q=ai-workers/problem-1-pathway-setup-and-form-filling; QA=$Q/product/qa; APP=$Q/prototype/studio/api/src/app.ts
R0=$R; R="$T/repo2"; git init -q -b main "$R"; cd "$R" && git config user.email t@t && git config user.name t && git config commit.gpgsign false
mkdir -p "$QA" "${APP%/*}"; printf '1\n2\n3\n4\n5\n6\n7\n8\n' > "$QA/BUGS.md"; echo a > "$APP"; git add -A && git commit -qm base
git checkout -qb q; sed -i.bak 's/^1$/R1.28 Works/' "$QA/BUGS.md"; rm -f "$QA/BUGS.md.bak"; mkdir -p "$QA/reports/2026-11-19-after-merge-r128-works"
echo proof > "$QA/reports/2026-11-19-after-merge-r128-works/README.md"; git add -A; git commit -qm "qa proof"; q1=$(git rev-parse HEAD)
git checkout -qb a main; sed -i.bak 's/^1$/R1.28 Works/' "$QA/BUGS.md"; rm -f "$QA/BUGS.md.bak"; echo b >> "$APP"; git commit -qam "qa + app"; a1=$(git rev-parse HEAD)
git checkout -q main; sed -i.bak 's/^8$/QA-600 open/' "$QA/BUGS.md"; rm -f "$QA/BUGS.md.bak"; git commit -qam "main: BUGS.md"
git checkout -q -b qm "$q1"; git merge -q --no-edit main >/dev/null 2>&1; qmerge=$(git rev-parse HEAD)
git checkout -q -b am "$a1"; git merge -q --no-edit main >/dev/null 2>&1; amerge=$(git rev-parse HEAD); git checkout -q main; cd - >/dev/null
reclabel='[{"name":"review: approved"},{"name":"records"}]'
guard "$q1" "$qmerge" "$reclabel" "$(cm "Reviewer: Approve $q1")"
ok "ENF-746a: a qa-only PR (records label) keeps its Approve across a merge of main that changes its own BUGS.md" "$(kept)" "exit $r, $out / $log"
ok "ENF-746a: ... and the full-run rule is asked from the merge back to the approved commit (records-only: exempt there)" "$(grep -qx "proof PR=1052 HEADS= $qmerge $q1 RELABEL=0" "$T/fx/proof.log" && echo 1)" "$(cat "$T/fx/proof.log" 2>&1)"
guard "$q1" "$qmerge" "$label" "$(cm "Reviewer: Approve $q1")"
ok "ENF-746a: the same merge without the records label (set from a full checkout) voids the Approve (fails closed)" "$(removed)" "$out / $log"
guard "$a1" "$amerge" "$reclabel" "$(cm "Reviewer: Approve $a1")"
ok "ENF-746a: a PR with one app file (records label or not) loses the Approve when main's merge changes its own BUGS.md" "$(removed)" "$out / $log"
echo "$out" | grep -q 'BUGS.md'; ok "ENF-746a: ... naming that file, as today" "$([ $? = 0 ] && echo 1)" "$out"
RECORDS_ONLY=/nonexistent guard "$q1" "$qmerge" "$reclabel" "$(cm "Reviewer: Approve $q1")"
ok "ENF-746a: records-only.sh that cannot run voids the Approve (fails closed)" "$(removed)" "$out / $log"
R=$R0; rm -f "$T/fx/proof.log"
W="$(cd "$TOOLS/../../../.." && pwd)/.github/workflows/label-guard.yml"
ge=$(python3 -I -c 'import sys,yaml; e=[s for s in yaml.safe_load(open(sys.argv[1]))["jobs"]["guard"]["steps"] if s.get("name") == "label guard"][0]["env"]
print("ok" if "".join(str(e.get("LABELED")).split()) == "${{github.event.action=='"'"'labeled'"'"'&&github.event.label.name||'"'"''"'"'}}" and "FULL_FROM" not in e and "vars.REVIEWERS" in str(e.get("REVIEWERS")) else e)' "$W" 2>&1)
ok "CI-PRE: label-guard.yml tells the guard which label was just added (LABELED) and passes REVIEWERS, and no FULL_FROM any more (B206 part 2)" "$([ "$ge" = ok ] && echo 1)" "$ge"
grep -q 'pull_request_target' "$W" && grep -q 'synchronize' "$W" && grep -q 'tools/label-guard.sh' "$W"
ok "the workflow runs main's label-guard.sh on every push (pull_request_target, synchronize)" "$([ $? = 0 ] && echo 1)" "$W"
# F4 in the workflow: which events run the guard, and what AFTER it gets, read the way GitHub reads them. The job's if:
# is evaluated for four events (only the expressions it uses are translated; anything else fails the test).
f4=$(python3 -I - "$W" <<'PY' 2>&1
import re, sys, yaml
d = yaml.safe_load(open(sys.argv[1])); on = d.get(True, d.get("on")); job = d["jobs"]["guard"]
types = on["pull_request_target"]["types"]; after = [s for s in job["steps"] if s.get("name") == "label guard"][0]["env"]["AFTER"]
def runs(action, labels, label=None):
    e = job["if"].strip()
    e = e.replace("contains(github.event.pull_request.labels.*.name, 'review: approved')", repr("review: approved" in labels))
    e = e.replace("github.event.action", repr(action)).replace("github.event.label.name", repr(label))
    e = e.replace("&&", " and ").replace("||", " or ")
    if re.search(r"github\.|\$\{\{", e): return "untranslated: " + e
    return eval(e, {"__builtins__": {}}, {})
out = []
if not {"synchronize", "labeled"} <= set(types): out.append("types %s lack synchronize or labeled" % types)
if runs("synchronize", ["review: approved"]) is not True: out.append("a push to a labelled PR does not run the guard")
if runs("labeled", ["review: approved"], "review: approved") is not True: out.append("adding review: approved does not run the guard")
if runs("labeled", ["review: approved", "records"], "records") is not False: out.append("adding another label runs the guard")
if runs("labeled", ["review: approved", "queued"], "queued") is not True: out.append("Mergify's queued label does not run the guard (B134)")
if runs("labeled", ["queued"], "queued") is not False: out.append("queued without review: approved runs the guard")
if runs("opened", ["review: approved"]) is not False: out.append("a PR being opened runs the guard (only the sweep runs then)")
if runs("synchronize", ["records"]) is not False: out.append("a push to an unlabelled PR runs the guard")
if "github.event.pull_request.head.sha" not in after: out.append("AFTER has no fallback to the PR's head on a labeled event: " + after)
print("; ".join(out) or "ok")
PY
)
ok "F4: label-guard.yml runs on a push to a labelled PR and when review: approved is added, never for another label, with AFTER from the PR's head" "$([ "$f4" = ok ] && echo 1)" "$f4"
# GitHub refuses a workflow it cannot parse, silently for pull_request_target (#1136's first push: "if: ... 'review: approved'"
# unquoted, so the guard would never have run). Parsed here the way GitHub reads it: a YAML mapping with on/jobs.
for wf in label-guard.yml guards.yml; do W2="${W%/*}/$wf"
y=$(python3 -c 'import sys, yaml; d = yaml.safe_load(open(sys.argv[1])); print("ok" if isinstance(d, dict) and (True in d or "on" in d) and "jobs" in d else "bad")' "$W2" 2>&1 || ruby -ryaml -e 'd = YAML.load_file(ARGV[0]); puts(d.is_a?(Hash) ? "ok" : "bad")' "$W2" 2>&1)
ok "$wf is valid YAML (GitHub cannot run a workflow it cannot parse)" "$([ "$y" = ok ] && echo 1)" "$y"
done
finish
