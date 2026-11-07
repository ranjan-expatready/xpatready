#!/usr/bin/env bash
# Tests lead-heartbeat.sh (P-389): fresh stamp → exit 0, silent; 41 min old → exit 1 with one line; no stamp → exit 2. US$0.
#   bash product/tools/check-lead-heartbeat.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
T=$(mktemp -d "${TMPDIR:-/tmp}/hb.XXXXXXXX"); trap 'rm -rf "$T"' EXIT
H="$TOOLS/lead-heartbeat.sh"; s="$T/last-check"
date +%s > "$s"; out=$(bash "$H" "$s"); rc=$?
ok "a stamp written now is fresh: exit 0, nothing printed" "$([ $rc = 0 ] && [ -z "$out" ] && echo 1)" "rc=$rc out=$out"
echo $(( $(date +%s) - 39*60 )) > "$s"; bash "$H" "$s" >/dev/null; rc=$?
ok "39 min old is still fresh (alert after 40)" "$([ $rc = 0 ] && echo 1)" "rc=$rc"
echo $(( $(date +%s) - 41*60 )) > "$s"; out=$(bash "$H" "$s"); rc=$?
ok "41 min old is stale: exit 1 with the missed-check line" "$([ $rc = 1 ] && printf '%s' "$out" | grep -q 'Lead check missed: last ran 41 min ago' && echo 1)" "rc=$rc out=$out"
out=$(bash "$H" "$s"); rc=$?
ok "still stale 15 min later: silent, exit 3 (one alert an hour)" "$([ $rc = 3 ] && [ -z "$out" ] && echo 1)" "rc=$rc out=$out"
echo $(( $(date +%s) - 61*60 )) > "$s.alerted"; bash "$H" "$s" >/dev/null; rc=$?
ok "an hour after the last alert it alerts again" "$([ $rc = 1 ] && echo 1)" "rc=$rc"
date +%s > "$s"; bash "$H" "$s" >/dev/null; rc=$?
ok "a new check clears it" "$([ $rc = 0 ] && echo 1)" "rc=$rc"
echo $(( $(date +%s) - 50*60 )) > "$s.alerted"; echo $(( $(date +%s) - 41*60 )) > "$s"; bash "$H" "$s" >/dev/null; rc=$?
ok "a later stall alerts at once (the old alert is older than the stamp)" "$([ $rc = 1 ] && echo 1)" "rc=$rc"
bash "$H" "$T/none" >/dev/null; rc=$?
ok "no stamp yet: exit 2" "$([ $rc = 2 ] && echo 1)" "rc=$rc"
finish
