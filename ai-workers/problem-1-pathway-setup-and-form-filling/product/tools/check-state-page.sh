#!/usr/bin/env bash
# Guards 6 and 7 (founder, 6 Nov ~03:00 IST). 6: check-docs.sh fails when STATE.md is over 12 KB (it reached 34 KB and
# every Lead re-read it); the earlier page goes to product/history/. 7: check-docs.sh warns, without failing, when STATE's
# "updated:" time is more than 30 minutes from its commit time (times are read, not guessed). Throwaway copies, US$0.
#   bash product/tools/check-state-page.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
T=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$T"' EXIT
docs_copy "$T/c"; S="$T/c/$PRODREL/STATE.md"; CD="$T/c/$PRODREL/tools/check-docs.sh"
run() { out=$(bash "$CD" 2>/dev/null); r=$?; }
# 6. Size.
head -c 12000 /dev/zero | tr '\0' 'x' >> "$S"; git -C "$T/c" commit -qam big; run
ok "STATE at 12 KB passes" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
head -c 400 /dev/zero | tr '\0' 'x' >> "$S"; git -C "$T/c" commit -qam bigger; run
ok "STATE over 12 KB fails and names product/history/" "$([ $r = 1 ] && echo "$out" | grep -q 'STATE TOO BIG.*product/history/' && echo 1)" "exit $r: $out"
# 7. Time.
docs_copy "$T/d"; S="$T/d/$PRODREL/STATE.md"; CD="$T/d/$PRODREL/tools/check-docs.sh"; run
ok "an 'updated:' time read at commit gives no warning" "$( ! echo "$out" | grep -q WARN && [ $r = 0 ] && echo 1)" "$out"
old=$(TZ=Asia/Kolkata date -d '-2 hours' '+%Y-%m-%d %H:%M' 2>/dev/null || TZ=Asia/Kolkata date -v-2H '+%Y-%m-%d %H:%M')
sed -i.bak "s/^updated: .* IST/updated: $old IST/" "$S"; rm -f "$S.bak"; git -C "$T/d" commit -qam guessed; run
ok "an 'updated:' time 2 hours from its commit warns" "$(echo "$out" | grep -q "WARN  STATE.md says updated $old IST.*min apart" && echo 1)" "$out"
ok "the time warning never fails check-docs" "$([ $r = 0 ] && echo 1)" "exit $r"
soon=$(TZ=Asia/Kolkata date -d '+20 minutes' '+%Y-%m-%d %H:%M' 2>/dev/null || TZ=Asia/Kolkata date -v+20M '+%Y-%m-%d %H:%M')
sed -i.bak "s/^updated: .* IST/updated: $soon IST/" "$S"; rm -f "$S.bak"; run
ok "uncommitted STATE is compared with now; 20 minutes gives no warning" "$( ! echo "$out" | grep -q WARN && echo 1)" "$out"
finish
