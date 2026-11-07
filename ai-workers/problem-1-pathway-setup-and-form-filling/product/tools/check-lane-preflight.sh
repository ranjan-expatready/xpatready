#!/usr/bin/env bash
# Guard 3 (founder, 6 Nov ~03:00 IST): no lane starts without room. lane-preflight.sh with stand-in df, sysctl and lsof
# (the night's two failed starts at 4.7 and 3.7 GB, a load of 17, four copies), and its PreToolUse hook on start_session,
# fed the hook's JSON as Claude Code does. US$0.
#   bash product/tools/check-lane-preflight.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
command -v jq >/dev/null || { echo "jq is missing; nothing was checked"; exit 2; }
T=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$T"' EXIT; mkdir "$T/bin"
printf '#!/bin/sh\necho "Filesystem 1024-blocks Used Available Capacity Mounted"\necho "/dev/disk3s1 990000000 1 $FAKE_KB 1%% /"\n' > "$T/bin/df"
printf '#!/bin/sh\necho "{ $FAKE_LOAD 9.00 8.00 }"\n' > "$T/bin/sysctl"
printf '#!/bin/sh\nfor p in $FAKE_PORTS; do echo "node 1$p u 20u IPv4 0x1 0t0 TCP 127.0.0.1:$p (LISTEN)"; done\n' > "$T/bin/lsof"
chmod +x "$T/bin/"*
P="$TOOLS/lane-preflight.sh"
pf() { out=$(PATH="$T/bin:$PATH" FAKE_KB="$1" FAKE_LOAD="$2" FAKE_PORTS="$3" bash "$P" "${@:4}" 2>&1); r=$?; }
gb() { echo $(( $1 * 1048576 / 10 )); }   # tenths of a GB → KB
pf "$(gb 150)" 6.5 "4400 4471"; ok "15 GB, load 6.5, one copy (the demo is not counted): room" "$([ $r = 0 ] && echo "$out" | grep -q 'test copies 1 ' && echo 1)" "exit $r: $out"
pf "$(gb 47)" 6.5 ""; ok "4.7 GB free (B99's first start) is refused" "$([ $r = 1 ] && echo "$out" | grep -q 'REFUSED: disk 4.7 GB free, under 7 GB' && echo 1)" "exit $r: $out"
pf "$(gb 37)" 6.5 ""; ok "3.7 GB free (B99's second start) is refused" "$([ $r = 1 ] && echo 1)" "exit $r: $out"
pf "$(gb 70)" 16 ""; ok "exactly 7 GB and load 16 pass" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
pf "$(gb 150)" 17.2 ""; ok "a 1-minute load of 17.2 is refused" "$([ $r = 1 ] && echo "$out" | grep -q 'load 17.2, over 16' && echo 1)" "exit $r: $out"
pf "$(gb 150)" 3 "4420 4431 4452 4471"; ok "four running test copies are refused, with their ports" "$([ $r = 1 ] && echo "$out" | grep -q '4 test copies running, cap 4 (ports: 4420 4431 4452 4471' && echo 1)" "exit $r: $out"
pf "$(gb 30)" 20 "4420 4431 4452 4471"; ok "every reason is named at once" "$([ $r = 1 ] && [ "$(echo "$out" | grep '^REFUSED' | grep -o 'under 7 GB\|over 16\|cap 4' | wc -l)" = 3 ] && echo 1)" "$out"
hook() { out=$(jq -n --arg t "$5" '{tool_name:"start_session", tool_input:{target:$t}}' | PATH="$T/bin:$PATH" FAKE_KB="$1" FAKE_LOAD="$2" FAKE_PORTS="$3" bash "$P" --hook); r=$?; }
hook "$(gb 37)" 3 "" x local; ok "hook: a Mac start at 3.7 GB is denied with the reason" "$(echo "$out" | jq -e '.hookSpecificOutput.permissionDecision == "deny" and (.hookSpecificOutput.permissionDecisionReason | test("3.7 GB"))' >/dev/null && echo 1)" "$out"
hook "$(gb 37)" 3 "" x cloud; ok "hook: a cloud start is not checked" "$([ $r = 0 ] && [ -z "$out" ] && echo 1)" "$out"
hook "$(gb 150)" 3 "" x ""; ok "hook: a Mac start with room passes" "$([ $r = 0 ] && [ -z "$out" ] && echo 1)" "$out"
ROOTD="$(cd "$TOOLS/../../../.." && pwd)"
jq -e '[.hooks.PreToolUse[] | select(.matcher | test("start_session")) | .hooks[].command | select(test("lane-preflight.sh --hook"))] | length == 1' "$ROOTD/.claude/settings.json" >/dev/null
ok "settings.json runs the preflight hook on start_session" "$([ $? = 0 ] && echo 1)"
grep -q 'lane-preflight.sh' "$ROOTD/.claude/skills/lead/SKILL.md"; ok "skill lead runs lane-preflight.sh before start_session" "$([ $? = 0 ] && echo 1)"
finish
