#!/usr/bin/env bash
# Records-only: the one definition (P-371 (4), founder 6 Nov; Lead 21's ruling on #1139 and B119 #1147, 6 Nov).
# .github/workflows/records-label.yml runs main's copy (records-label.sh, P-214 fix 7 Nov; it was CI's job "kind") on
# every ready PR and puts the label it prints (`records-only.sh label`, "records") on a PR whose
# change is records only, and takes the label off when the change stops being records only. Mergify's "records" queue
# (B119) selects PRs by that label, and m2 and m3 skip it, so a records PR never joins a product batch. There is no
# other records rule: B119 and any later tool read this one.
#   records-only.sh is-records <base>..<head> | --files   "yes" when every changed path, both sides of a rename, is a
#        record: under product/ (never product/tools/), a .md, image, .txt or .html, and change-kind.sh does not call
#        the change code. Else "no".
#   records-only.sh label        the label name CI sets: records
#   records-only.sh --self-test  is-records on made-up file lists
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
P=ai-workers/problem-1-pathway-setup-and-form-filling; T="$P/product/tools"; S="$P/prototype/studio"
LABEL=records
RECORD_FILE="^$P/product/([^/]+/)*[^/]+\.(md|png|jpe?g|gif|webp|svg|txt|html)$"

is_records() {   # stdin: changed paths
  local f; f=$(grep . || true)
  [ -n "$f" ] || { echo no; return; }
  printf '%s\n' "$f" | grep -vE "$RECORD_FILE" | grep -q . && { echo no; return; }
  # Any case of "tools": on the Mac's case-insensitive disk product/Tools/x is product/tools/x (#1232 breaker, minor 7).
  printf '%s\n' "$f" | grep -qiE "^$P/product/tools/" && { echo no; return; }
  # Fails closed: change-kind.sh failing (no node, a crash) is "no", never a records label (#1232 breaker, minor 4).
  local k; k=$(printf '%s\n' "$f" | bash "$T/change-kind.sh" --files) || { echo no; return; }
  case "$k" in notes|records) echo yes;; *) echo no;; esac
}

self_test() {
  local bad=0
  t() { local want="$1" what="$2"; shift 2; local got; got=$(printf '%s\n' "$@" | is_records)
    if [ "$got" = "$want" ]; then echo "PASS  $what"; else echo "FAIL  $what (got $got)"; bad=1; fi; }
  t yes "qa notes with screenshots" "$P/product/qa/BUGS.md" "$P/product/qa/walks/x/shot.png" "$P/product/qa/runs/out.txt"
  t yes "the Lead's records: STATE, DECISIONS, BACKLOG" "$P/product/STATE.md" "$P/product/DECISIONS.md" "$P/product/BACKLOG.md"
  t yes "a screen's notes and its HTML board" "$P/product/screens/12/build-notes.md" "$P/product/screens/12/board.html"
  t no  "a tool under product/tools/ (even a .md or .txt)" "$P/product/tools/typecheck-known.txt"
  t no  "app code" "$P/product/STATE.md" "$S/api/src/core.ts"
  t no  "a skill (instructions, not a product record)" ".claude/skills/next/SKILL.md"
  t no  "a workflow" ".github/workflows/ci.yml"
  t no  "a JSON file under product/ (a tool may read it as data)" "$P/product/screens/12/fixture.json"
  t no  "nothing changed" ""
  t no  "a look-alike name: STATE.md.bak" "$P/product/STATE.md.bak"
  t no  "a look-alike folder: product/qa-tools/run.mjs" "$P/product/qa-tools/run.mjs"
  t no  "a records name outside product/" "$P/prototype/studio/STATE.md"
  t no  "a qa walk script (.cjs runs; it is code, not a record)" "$P/product/qa/walks/x/walk.cjs"
  t no  "a rename out of product/tools/ (both sides are read)" "$P/product/notes/check-docs.txt" "$P/product/tools/check-docs.sh"
  t no  "product/Tools/ in another case (the Mac's disk: the tools folder)" "$P/product/Tools/typecheck-known.txt"
  # change-kind.sh failing (exit 2, nothing printed: no node, a crash) is "no": fails closed (#1232 breaker, minor 4).
  local d; d=$(mktemp -d) && printf '#!/usr/bin/env bash\necho "select-suites.mjs failed" >&2; exit 2\n' > "$d/change-kind.sh"
  got=$(printf '%s\n' "$P/product/STATE.md" | T="$d" is_records 2>/dev/null); rm -rf "$d"
  [ "$got" = no ] && echo "PASS  change-kind.sh failing is no records label" || { echo "FAIL  change-kind.sh failing gave $got"; bad=1; }
  [ "$(bash "$0" label)" = records ] && echo "PASS  the label is records" || { echo "FAIL  the label is not records"; bad=1; }
  [ "$bad" = 0 ] && echo "all passed"; return $bad
}

case "${1:-}" in
  is-records) if [ "${2:-}" = --files ]; then is_records; else git -c core.quotePath=false diff --no-renames --name-only "${2%%..*}...${2##*..}" | is_records; fi;;
  label) echo "$LABEL";;
  --self-test) self_test;;
  *) echo "usage: records-only.sh is-records <base>..<head>|--files | label | --self-test"; exit 2;;
esac
