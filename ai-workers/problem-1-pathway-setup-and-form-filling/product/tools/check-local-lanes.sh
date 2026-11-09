#!/bin/bash
# Tests for local-lanes.sh (P-420): a pass and a fail per rule, on fake worktrees and transcripts in a temp folder.
# Transcript lines copy the real shapes of a Claude Code session file (8 Nov qa lane), including the app's exact words.
set -uo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"; T=$(mktemp -d "${TMPDIR:-/tmp}/ll.XXXXXX") || exit 2; trap 'rm -rf "$T"' EXIT
fails=0; n=0; ok() { n=$((n+1)); if [ "$2" = 1 ]; then echo "PASS  $1"; else echo "FAIL  $1 ${3:-}"; fails=$((fails+1)); fi; }
NOW=2000000000
REFUSAL='{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":"Not sent: this looks like sessions messaging each other. Paused until your user'"'"'s next message in this session."}]}}'
SAID='{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Both PRs need a label. Messages to other sessions stay paused until you type here."}]}}'
TYPED='{"type":"user","message":{"role":"user","content":"Continue: re-score C7.7 on main"}}'
PEER='{"type":"user","message":{"role":"user","content":"<cross-session-message from=\"x\">please re-score</cross-session-message>"}}'
QUOTE='{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t2","content":"grep: until you type here (quoted in a doc)"}]}}'
DONE='{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"done"}]}}'
mk() { # name, minutes ago, transcript lines...
  local name="$1" ago="$2"; shift 2
  local wt="/x/Xpatready/.claude/worktrees/$name"; local d="$T/proj/-x-Xpatready--claude-worktrees-$(printf '%s' "$name" | sed 's/[^A-Za-z0-9]/-/g')"
  mkdir -p "$d"; printf '%s\n' "$@" > "$d/s.jsonl"
  touch -t "$(date -r $((NOW - ago*60)) +%Y%m%d%H%M.%S 2>/dev/null || date -d @$((NOW - ago*60)) +%Y%m%d%H%M.%S)" "$d/s.jsonl"; echo "$wt"
}
merges2() { echo 2; }; merges0() { echo 0; }; export -f merges2 merges0
run() { LL_WORKTREES="$1" LL_PROJECTS="$T/proj" LL_NOW=$NOW LL_MERGES_SINCE="$2" bash "$TOOLS/local-lanes.sh"; }
a=$(mk qa-refused 30 "$DONE" "$REFUSAL" "$DONE")
out=$(run "$a" merges0); rc=$?
ok "fail: the app's own refusal (tool result 'Paused until your user's next message') is an ACT, even 30 min idle with nothing merged" "$([ $rc = 1 ] && grep -q 'paused' <<<"$out" && echo 1)" "$out"
b=$(mk qa-said 30 "$DONE" "$SAID")
out=$(run "$b" merges0); rc=$?
ok "fail: the lane's own words 'stay paused until you type here' are an ACT" "$([ $rc = 1 ] && echo 1)" "$out"
c=$(mk qa-unpaused 5 "$REFUSAL" "$SAID" "$TYPED" "$DONE")
out=$(run "$c" merges2); rc=$?
ok "pass: after the founder typed in that session, the old refusal no longer counts" "$([ $rc = 0 ] && echo 1)" "$out"
d=$(mk qa-peer 30 "$REFUSAL" "$PEER" "$DONE")
out=$(run "$d" merges0); rc=$?
ok "fail: a message from another session is not the founder typing; still paused" "$([ $rc = 1 ] && echo 1)" "$out"
e=$(mk qa-quote 5 "$TYPED" "$QUOTE" "$DONE")
out=$(run "$e" merges0); rc=$?
ok "pass: a tool result merely quoting 'until you type here' (a doc or a grep) is no stall" "$([ $rc = 0 ] && echo 1)" "$out"
f=$(mk qa-idle 60 "$TYPED" "$DONE")
out=$(run "$f" merges2); rc=$?
ok "fail: idle 60 min while 2 PRs merged is an ACT" "$([ $rc = 1 ] && grep -q 'idle 60 min while 2' <<<"$out" && echo 1)" "$out"
out=$(run "$f" merges0); rc=$?
ok "pass: idle 60 min with nothing merged is not an ACT" "$([ $rc = 0 ] && grep -q '^ok' <<<"$out" && echo 1)" "$out"
g=$(mk builder-busy 10 "$TYPED" "$DONE")
out=$(run "$g" merges2); rc=$?
ok "pass: a lane active 10 min ago is not an ACT, whatever merged" "$([ $rc = 0 ] && echo 1)" "$out"
h=$(mk old-lane 400 "$REFUSAL")
out=$(run "$h" merges2); rc=$?
ok "pass: a transcript older than 6 h is no lane any more (skipped)" "$([ $rc = 0 ] && [ -z "$out" ] && echo 1)" "$out"
i=$(mk "qa_under score" 60 "$TYPED" "$DONE")
out=$(run "$i" merges2); rc=$?
ok "fail: a worktree named with _ and a space is found (every non-letter-or-digit becomes -), idle with merges: ACT" "$([ $rc = 1 ] && echo 1)" "$out"
out=$(run "$(printf '%s\n%s\n%s' "$a" "$f" "$g")" merges2); rc=$?
ok "two stalled lanes and one busy: two ACT lines" "$([ $rc = 2 ] && [ "$(grep -c '^ACT' <<<"$out")" = 2 ] && echo 1)" "$out"
out=$(run "/x/Xpatready/.claude/worktrees/no-transcript" merges2); rc=$?
ok "pass: a worktree with no transcript folder is skipped" "$([ $rc = 0 ] && echo 1)" "$out"
echo "check-local-lanes: $((n - fails))/$n"; [ "$fails" = 0 ]
