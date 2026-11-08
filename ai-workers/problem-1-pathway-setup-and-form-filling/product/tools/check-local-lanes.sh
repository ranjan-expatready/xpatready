#!/bin/bash
# Tests for local-lanes.sh (P-420): a pass and a fail per rule, on fake worktrees and transcripts in a temp folder.
set -uo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"; T=$(mktemp -d "${TMPDIR:-/tmp}/ll.XXXXXX") || exit 2; trap 'rm -rf "$T"' EXIT
fails=0; ok() { if [ "$2" = 1 ]; then echo "PASS  $1"; else echo "FAIL  $1 ${3:-}"; fails=$((fails+1)); fi; }
NOW=2000000000
mk() { # name, minutes ago, last line
  local wt="/x/Xpatready/.claude/worktrees/$1"; local d="$T/proj/$(printf '%s' "$wt" | tr '/.' '--')"; mkdir -p "$d"
  printf '{"a":1}\n%s\n' "$3" > "$d/s.jsonl"; touch -t "$(date -r $((NOW - $2*60)) +%Y%m%d%H%M.%S 2>/dev/null || date -d @$((NOW - $2*60)) +%Y%m%d%H%M.%S)" "$d/s.jsonl"; echo "$wt"
}
merges2() { echo 2; }; merges0() { echo 0; }; export -f merges2 merges0
run() { LL_WORKTREES="$1" LL_PROJECTS="$T/proj" LL_NOW=$NOW LL_MERGES_SINCE="$2" bash "$TOOLS/local-lanes.sh"; }
a=$(mk qa-paused 200 '{"text":"Messages to other sessions stay paused until you type here."}')
out=$(run "$a" merges0); rc=$?
ok "fail: a lane whose last lines say its messages are paused is an ACT, even with nothing merged" "$([ $rc = 1 ] && grep -q 'paused' <<<"$out" && echo 1)" "$out"
b=$(mk qa-idle 60 '{"text":"done"}')
out=$(run "$b" merges2); rc=$?
ok "fail: idle 60 min while 2 PRs merged is an ACT" "$([ $rc = 1 ] && grep -q 'idle 60 min while 2' <<<"$out" && echo 1)" "$out"
out=$(run "$b" merges0); rc=$?
ok "pass: idle 60 min with nothing merged is not an ACT" "$([ $rc = 0 ] && grep -q '^ok' <<<"$out" && echo 1)" "$out"
c=$(mk builder-busy 10 '{"text":"running the pack"}')
out=$(run "$c" merges2); rc=$?
ok "pass: a lane active 10 min ago is not an ACT, whatever merged" "$([ $rc = 0 ] && echo 1)" "$out"
d=$(mk old-lane 3000 '{"text":"Messages to other sessions stay paused until you type here."}')
out=$(run "$d" merges2); rc=$?
ok "pass: a transcript older than 24 h is no lane any more (skipped)" "$([ $rc = 0 ] && [ -z "$out" ] && echo 1)" "$out"
out=$(run "$(printf '%s\n%s\n%s' "$a" "$b" "$c")" merges2); rc=$?
ok "two stalled lanes and one busy: exit 2" "$([ $rc = 2 ] && echo 1)" "$out"
out=$(run "/x/Xpatready/.claude/worktrees/no-transcript" merges2); rc=$?
ok "pass: a worktree with no transcript folder is skipped" "$([ $rc = 0 ] && echo 1)" "$out"
echo "check-local-lanes: $((7 - fails))/7"; [ "$fails" = 0 ]
