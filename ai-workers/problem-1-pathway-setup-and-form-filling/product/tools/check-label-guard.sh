#!/usr/bin/env bash
# Guard 2 (founder, 6 Nov ~03:00 IST): a label never outlives a review. Runs label-guard.sh on real git histories with
# GitHub answered by a stand-in curl (labels, comments, reviews from files; DELETE and POST written to a log). Cases:
# #1052's (a new fix commit, Approve only on the old head) loses the label; an Approve naming the new head, a GitHub
# review on it, or a pure merge of main touching none of the PR's files keeps it. US$0, no network.
#   bash product/tools/check-label-guard.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
command -v jq >/dev/null || { echo "jq is missing; nothing was checked"; exit 2; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/fx"
cat > "$T/bin/curl" <<'EOF'
#!/usr/bin/env bash
m=GET; d=""; u=""
while [ $# -gt 0 ]; do case "$1" in -X) m=$2; shift;; -d) d=$2; shift;; -H) shift;; http*) u=$1;; esac; shift; done
case "$m $u" in
  "GET "*/labels) cat "$FX/labels.json";;
  "GET "*/comments*page=1) cat "$FX/comments.json";;
  "GET "*/reviews*page=1) cat "$FX/reviews.json";;
  "GET "*) echo '[]';;
  "DELETE "*/labels/review%3A%20approved) echo "DELETE label" >> "$FX/log"; echo '[]';;
  "POST "*/comments) echo "POST comment $(echo "$d" | jq -r .body | head -1)" >> "$FX/log"; echo '{}';;
  *) echo "unexpected $m $u" >> "$FX/log"; exit 22;;
esac
EOF
chmod +x "$T/bin/curl"
G="$TOOLS/label-guard.sh"
# History: main has a.txt and b.txt; the PR changes a.txt (c1, approved), then pushes a fix (c2) or merges main.
R="$T/repo"; git init -q -b main "$R"; cd "$R" && git config user.email t@t && git config user.name t && git config commit.gpgsign false
printf '1\n2\n3\n4\n5\n6\n7\n8\n' > a.txt; echo b > b.txt; git add -A && git commit -qm base
git checkout -qb pr; sed -i.bak 's/^1$/one/' a.txt; rm -f a.txt.bak; git commit -qam c1; c1=$(git rev-parse HEAD)
echo fix >> a.txt; git commit -qam c2; c2=$(git rev-parse HEAD)
git checkout -q main; echo b2 > b.txt; git commit -qam "main: b"; mb=$(git rev-parse HEAD)
git checkout -q -b m1 "$c1"; git merge -q --no-edit main >/dev/null 2>&1; pure=$(git rev-parse HEAD)
git checkout -q -b m3 "$c1"; git merge -q --no-edit --no-commit main >/dev/null 2>&1; echo sneaked > c.txt; git add c.txt; git commit -qm "merge + edit"; evil=$(git rev-parse HEAD)
git checkout -q main; sed -i.bak 's/^8$/eight/' a.txt; rm -f a.txt.bak; git commit -qam "main: a"
git checkout -q -b m2 "$c1"; git merge -q --no-edit main >/dev/null 2>&1; mine=$(git rev-parse HEAD)
git checkout -q -b side "$c1"; echo x > d.txt; git add d.txt; git commit -qm side; git checkout -q -b m4 "$c1"; git merge -q --no-edit side; notmain=$(git rev-parse HEAD)
git checkout -q main
label='[{"name":"review: approved"},{"name":"queued"}]'
guard() {  # $1 before, $2 after, $3 labels, $4 comments, $5 reviews → output in $out, log in $log
  echo "$3" > "$T/fx/labels.json"; echo "$4" > "$T/fx/comments.json"; echo "${5:-[]}" > "$T/fx/reviews.json"; : > "$T/fx/log"
  out=$(cd "$R" && PATH="$T/bin:$PATH" FX="$T/fx" GH_TOKEN=x REPO=o/r PR=1052 BEFORE="$1" AFTER="$2" API=https://api.test MAIN_REF=main bash "$G" 2>&1); r=$?
  log=$(cat "$T/fx/log"); }
cm() { jq -n --arg b "$1" '[{body: $b}]'; }
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
guard "$c1" "$c2" "$label" "[]" "$(jq -n --arg h "$c2" '[{state:"APPROVED",commit_id:$h}]')"
ok "a GitHub review APPROVED on the new head keeps the label" "$(kept)" "$out / $log"
guard "$c1" "$c2" "$label" "[]" "$(jq -n --arg h "$c1" '[{state:"APPROVED",commit_id:$h}]')"
ok "a GitHub review on the old head does not count" "$(removed)" "$out / $log"
guard "$c1" "$pure" "$label" "[]"
ok "a pure merge of main touching none of the PR's files keeps the label (P-318 (1))" "$(kept)" "$out / $log"
guard "$c1" "$mine" "$label" "[]"
ok "a merge of main that changes the PR's own file loses the label" "$(removed)" "$out / $log"
echo "$out" | grep -q 'a.txt'; ok "... and names that file" "$([ $? = 0 ] && echo 1)" "$out"
guard "$c1" "$evil" "$label" "[]"
ok "a merge of main with a hand edit added loses the label" "$(removed)" "$out / $log"
guard "$c1" "$notmain" "$label" "[]"
ok "a merge of a branch that is not main loses the label" "$(removed)" "$out / $log"
guard "$c2" "$pure" "$label" "[]"
ok "a merge whose first parent is not the old head (a force-push) loses the label" "$(removed)" "$out / $log"
guard "$c1" "$c2" '[{"name":"queued"}]' "[]"
ok "no label: nothing is removed or posted" "$(kept)" "$out / $log"
W="$(cd "$TOOLS/../../../.." && pwd)/.github/workflows/label-guard.yml"
grep -q 'pull_request_target' "$W" && grep -q 'synchronize' "$W" && grep -q 'tools/label-guard.sh' "$W"
ok "the workflow runs main's label-guard.sh on every push (pull_request_target, synchronize)" "$([ $? = 0 ] && echo 1)" "$W"
finish
