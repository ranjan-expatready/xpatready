#!/usr/bin/env bash
# merge-guard.sh both ways (P-293 (2), I1): a builder's copy may comment on a pull request, never merge, close or review;
# the Lead's copy may do all four. Feeds the guard the hook's JSON, as Claude Code does. Runs no suite, US$0.
#   bash product/tools/check-merge-guard.sh
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
G="$ROOT/ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/merge-guard.sh"
command -v jq >/dev/null || { echo "jq is missing; nothing was checked"; exit 2; }
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — $3"; fi; }
# A throwaway copy whose lane.sh answers what FAKE_LANE says: the Lead's copy only exists on the Mac's main branch.
T=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$T"' EXIT
git init -q "$T/copy" && mkdir -p "$T/copy/ai-workers/problem-1-pathway-setup-and-form-filling/product/tools"
printf '#!/bin/bash\necho "$FAKE_LANE"\n' > "$T/copy/ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/lane.sh"
guard() {  # $1 lane, $2 cwd, $3 command → "allow" or "deny"
  local out; out=$(jq -n --arg c "$3" --arg d "$2" '{tool_input:{command:$c}, cwd:$d}' | FAKE_LANE="$1" bash "$G")   # nothing printed: allowed
  if printf '%s' "$out" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null 2>&1; then echo deny; else echo allow; fi
}
for lane in screens forms runtime evidence qa unbound; do
  for c in 'gh pr comment 12 --body "Question for the tech lead: which way?"' 'cd /x && gh pr comment 12 -F note.md'; do
    r=$(guard "$lane" "$T/copy" "$c"); ok "$lane copy may comment: $c" "$([ "$r" = allow ] && echo 1)" "got $r"
  done
  for c in 'gh pr merge 12 --merge' 'gh pr close 12' 'gh pr review 12 --approve' 'echo ok && gh  pr   merge 12' 'gh pr comment 12 --body x; gh pr merge 12' 'gh pr merge&&true'; do
    r=$(guard "$lane" "$T/copy" "$c"); ok "$lane copy is refused: $c" "$([ "$r" = deny ] && echo 1)" "got $r"
  done
done
for c in 'gh pr merge 12 --merge' 'gh pr close 12' 'gh pr review 12 --approve' 'gh pr comment 12 --body x'; do
  r=$(guard lead "$T/copy" "$c"); ok "the Lead's copy may: $c" "$([ "$r" = allow ] && echo 1)" "got $r"
done
r=$(guard lead "" 'gh pr merge 12'); ok "no session folder is never the Lead (fails closed)" "$([ "$r" = deny ] && echo 1)" "got $r"
r=$(guard screens "$T/copy" 'git status && gh pr view 12'); ok "other commands pass untouched" "$([ "$r" = allow ] && echo 1)" "got $r"
# The real lane.sh in this copy: a cloud machine or any branch but the Mac's main is never the Lead.
if [ "$(bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/lane.sh whoami 2>/dev/null)" != lead ]; then
  r=$(guard "" "$ROOT" 'gh pr comment 1 --body q')
  ok "this copy (not the Lead): comment allowed" "$([ "$r" = allow ] && echo 1)" "got $r"
  r=$(guard "" "$ROOT" 'gh pr merge 1')
  ok "this copy (not the Lead): merge refused" "$([ "$r" = deny ] && echo 1)" "got $r"
fi
echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
