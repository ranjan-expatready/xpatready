#!/bin/bash
# Lead heartbeat (founder, 7 Nov, P-389): a dead man's switch for the tech lead's 30-minute check. A stuck Lead cannot
# report itself (6-7 Nov: ~7.4 h on one approval prompt, no check fired), so an independent session on the same Mac (the
# first standby Lead) runs this every 15 min. lead-watch.sh writes the stamp at each check. Period 30 min + grace 10 min
# (a check takes ~2-5 min and waits while the Lead is mid-turn) = alert after 40 min: worst-case detection ~55 min.
# US$0. Exit 0 = fresh (prints nothing), 1 = stale: alert now (prints one line), 2 = no stamp yet, 3 = stale but alerted
# under 60 min ago (silent; one alert an hour while it stays stuck). Test: check-lead-heartbeat.sh.
# Usage: bash product/tools/lead-heartbeat.sh [stamp file]
STALL_MIN=40; REPEAT_MIN=60
stamp="${1:-/private/tmp/claude-$(id -u)/lead-watch/last-check}"; sent="$stamp.alerted"
[ -s "$stamp" ] || { echo "no Lead check stamp at $stamp yet"; exit 2; }
now=$(date +%s); last=$(cat "$stamp"); age=$(( (now - last) / 60 ))
[ "$age" -le "$STALL_MIN" ] && exit 0
[ -s "$sent" ] && [ "$(cat "$sent")" -gt "$last" ] && [ $(( (now - $(cat "$sent")) / 60 )) -lt "$REPEAT_MIN" ] && exit 3
echo "$now" > "$sent"
echo "Lead check missed: last ran ${age} min ago at $(TZ=Asia/Kolkata date -r "$last" '+%H:%M IST %d %b') (alert after ${STALL_MIN} min, P-389)"
exit 1
