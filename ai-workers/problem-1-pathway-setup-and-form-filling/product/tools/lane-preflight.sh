#!/usr/bin/env bash
# No lane starts without room (founder, 6 Nov ~03:00 IST; that night B99 failed to start twice, at 4.7 and 3.7 GB free;
# a new lane copy needs about 5.4 GB). Checks the Mac before a session starts there: free disk at least 7 GB, 1-minute
# load at most 16, fewer than 4 running test copies (studio/tools/test-copies.sh). Prints each reading; exit 1 with the
# reasons when any fails. Limits: PREFLIGHT_MIN_GB, PREFLIGHT_MAX_LOAD, COPY_CAP.
#   bash product/tools/lane-preflight.sh          a person or the Lead, before start_session
#   bash product/tools/lane-preflight.sh --hook   PreToolUse hook on start_session (.claude/settings.json): a session
#                                                 started on this machine is refused with the reason; a cloud one passes
# Test: check-lane-preflight.sh.
DIR="$(cd "$(dirname "$0")" && pwd)"; min=${PREFLIGHT_MIN_GB:-7}; maxload=${PREFLIGHT_MAX_LOAD:-16}; cap=${COPY_CAP:-4}
if [ "${1:-}" = --hook ]; then
  target=$(jq -r '.tool_input.target // .tool_input.location // empty' 2>/dev/null)
  [ "$target" = cloud ] && exit 0
  out=$(bash "$0"); [ $? = 0 ] && exit 0
  jq -n --arg r "$out" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("No lane starts without room (founder, 6 Nov). " + $r + " Free disk or stop test copies first, or start the lane in the cloud.")}}'
  exit 0
fi
kb=$(df -Pk / 2>/dev/null | awk 'NR == 2 {print $4}'); gb=$(awk -v k="${kb:-0}" 'BEGIN {printf "%.1f", k / 1048576}')
load=$(sysctl -n vm.loadavg 2>/dev/null | tr -d '{}' | awk '{print $1}'); [ -n "$load" ] || load=$(awk '{print $1}' /proc/loadavg 2>/dev/null)
[ -n "$load" ] || load=$(uptime 2>/dev/null | sed -E 's/.*load averages?: *//' | awk '{gsub(",","",$1); print $1}')  # sandbox blocks sysctl (9 Nov)
copies=$(bash "$DIR/../../prototype/studio/tools/test-copies.sh" --count)
echo "preflight: disk ${gb} GB free (need ${min}) · load ${load:-?} (max ${maxload}) · test copies ${copies} (cap ${cap})"
bad=""
awk -v g="$gb" -v m="$min" 'BEGIN {exit !(g < m)}' && bad="$bad disk ${gb} GB free, under ${min} GB;"
[ -z "$load" ] && bad="$bad load unreadable;"
[ -n "$load" ] && awk -v l="$load" -v m="$maxload" 'BEGIN {exit !(l > m)}' && bad="$bad 1-minute load ${load}, over ${maxload};"
[ "$copies" -ge "$cap" ] && bad="$bad ${copies} test copies running, cap ${cap} (ports: $(bash "$DIR/../../prototype/studio/tools/test-copies.sh" | paste -sd ' ' -));"
[ -z "$bad" ] && { echo "preflight: room to start a lane"; exit 0; }
echo "REFUSED:${bad%;}."; exit 1
