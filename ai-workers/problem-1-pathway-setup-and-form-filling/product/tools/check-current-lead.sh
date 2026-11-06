#!/usr/bin/env bash
# Guard 1 (founder, 6 Nov ~03:00 IST): lanes always report to the current Lead. check-docs.sh refuses a STATE.md with
# zero or two current_lead lines; current-lead.sh prints the line from the freshest STATE.md (a lead/* branch newer than
# main wins); the next, qa and lead skills say when to message it. Throwaway copies only, US$0.
#   bash product/tools/check-current-lead.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
docs_copy "$T/c"; S="$T/c/$PRODREL/STATE.md"; CD="$T/c/$PRODREL/tools/check-docs.sh"
bash "$CD" >/dev/null 2>&1; ok "one current_lead line passes check-docs" "$([ $? = 0 ] && echo 1)"
sed -i.bak '/^current_lead: /d' "$S"; out=$(bash "$CD" 2>/dev/null); r=$?
ok "no current_lead line fails check-docs" "$([ $r = 1 ] && echo "$out" | grep -q 'CURRENT LEAD: STATE.md has 0' && echo 1)" "exit $r: $out"
printf 'current_lead: local_a Lead 1 · x\ncurrent_lead: local_b Lead 2 · y\n' >> "$S"; out=$(bash "$CD" 2>/dev/null); r=$?
ok "two current_lead lines fail check-docs" "$([ $r = 1 ] && echo "$out" | grep -q 'has 2' && echo 1)" "exit $r: $out"
sed -i.bak '/^current_lead: /d' "$S"; echo 'current_lead: Lead 3' >> "$S"; out=$(bash "$CD" 2>/dev/null); r=$?
ok "a current_lead line with no session id fails check-docs" "$([ $r = 1 ] && echo 1)" "exit $r: $out"
sed -i.bak '/^current_lead: /d' "$S"; echo 'current_lead: Lead 21 · 6 Nov (took over from Lead 20)' >> "$S"; out=$(bash "$CD" 2>/dev/null); r=$?
ok "a 'Lead 21 · … Lead 20' line in STATE (no session id first) fails check-docs" "$([ $r = 1 ] && echo "$out" | grep -q "needs a session id" && echo 1)" "exit $r: $out"

# current-lead.sh reads the freshest STATE on GitHub: main says Lead 1, a newer lead/* branch says Lead 2.
docs_copy "$T/src"; git init -q --bare -b main "$T/origin.git"; git -C "$T/src" remote add origin "$T/origin.git"; git -C "$T/src" -c push.negotiate=false push -q origin main
git -C "$T/src" checkout -qb lead/x; sed -i.bak 's/^current_lead: .*/current_lead: local_bbb-0000-1111 Lead 2 · 6 Nov 03:15 IST/' "$T/src/$PRODREL/STATE.md"
rm -f "$T/src/$PRODREL/STATE.md.bak"; sleep 1; git -C "$T/src" commit -qam "hand-over" && git -C "$T/src" -c push.negotiate=false push -q origin lead/x
git clone -q "$T/origin.git" "$T/lane"; L="$T/lane/$PRODREL/tools/current-lead.sh"
out=$(bash "$L"); ok "a lane on main reads the Lead from the newer lead branch" "$([ "$out" = 'local_bbb-0000-1111 Lead 2 · 6 Nov 03:15 IST' ] && echo 1)" "got: $out"
out=$(bash "$L" --id); ok "--id prints the session id only" "$([ "$out" = local_bbb-0000-1111 ] && echo 1)" "got: $out"
git -C "$T/src" checkout -q main; sleep 1; sed -i.bak 's/^current_lead: .*/current_lead: local_ccc-0000-1111 Lead 3 · later/' "$T/src/$PRODREL/STATE.md"
git -C "$T/src" commit -qam "newer on main" && git -C "$T/src" -c push.negotiate=false push -q origin main
out=$(bash "$L" --id); ok "main wins when its STATE is the newer one" "$([ "$out" = local_ccc-0000-1111 ] && echo 1)" "got: $out"
git -C "$T/src" checkout -q lead/x; sleep 1; sed -i.bak '/^current_lead: /d' "$T/src/$PRODREL/STATE.md"; echo 'x' >> "$T/src/$PRODREL/STATE.md"
git -C "$T/src" commit -qam "lead line lost" && git -C "$T/src" -c push.negotiate=false push -q origin lead/x
out=$(bash "$L" --id); ok "a branch whose STATE lost the line is skipped" "$([ "$out" = local_ccc-0000-1111 ] && echo 1)" "got: $out"
out=$(cd "$T" && mkdir solo && cp -r "$T/c/ai-workers" solo/ && sed -i.bak '/^current_lead: /d' "solo/$PRODREL/STATE.md" && bash "solo/$PRODREL/tools/current-lead.sh" 2>&1); r=$?
ok "no line anywhere: exit 1 with the ListAgents fallback" "$([ $r = 1 ] && echo "$out" | grep -q ListAgents && echo 1)" "exit $r: $out"

# Main's STATE.md may carry no line: the tech lead keeps STATE on its lead/* branch (#1136 after #1139). check-docs then
# passes only when current-lead.sh finds the line on an origin/lead/* branch, read without a fetch.
docs_copy "$T/m"; sed -i.bak '/^current_lead: /d' "$T/m/$PRODREL/STATE.md"; rm -f "$T/m/$PRODREL/STATE.md.bak"; git -C "$T/m" commit -qam "main without the line"
git init -q --bare -b main "$T/m.git"; git -C "$T/m" remote add origin "$T/m.git"; git -C "$T/m" -c push.negotiate=false push -q origin main
git clone -q "$T/m.git" "$T/mlane"; MC="$T/mlane/$PRODREL/tools/check-docs.sh"
out=$(bash "$MC" 2>/dev/null); r=$?
ok "no line on main and no lead branch fails check-docs" "$([ $r = 1 ] && echo "$out" | grep -q 'read none from an origin/lead/' && echo 1)" "exit $r: $out"
git -C "$T/m" checkout -qb lead/y; echo 'current_lead: local_ddd-0000-1111 Lead 4 · 6 Nov 18:00 IST' >> "$T/m/$PRODREL/STATE.md"
sleep 1; git -C "$T/m" commit -qam "lead line on the lead branch" && git -C "$T/m" -c push.negotiate=false push -q origin lead/y
git -C "$T/mlane" fetch -q origin; out=$(bash "$MC" 2>/dev/null); r=$?
ok "no line on main, one on an origin/lead/* branch: check-docs passes" "$([ $r = 0 ] && echo 1)" "exit $r: $out"
out=$(bash "$T/mlane/$PRODREL/tools/current-lead.sh" --no-fetch --where); ok "--where names the lead branch it read" "$([ "$out" = refs/remotes/origin/lead/y ] && echo 1)" "got: $out"
sed -i.bak 's/^current_lead: .*/current_lead: Lead 4/' "$T/m/$PRODREL/STATE.md"; rm -f "$T/m/$PRODREL/STATE.md.bak"
sleep 1; git -C "$T/m" commit -qam "malformed" && git -C "$T/m" -c push.negotiate=false push -q origin lead/y
git -C "$T/mlane" fetch -q origin; out=$(bash "$MC" 2>/dev/null); r=$?
ok "a lead branch's line with no session id fails check-docs" "$([ $r = 1 ] && echo "$out" | grep -q 'line on origin/lead/y needs a session id' && echo 1)" "exit $r: $out"
sed -i.bak 's/^current_lead: .*/current_lead: Lead 21 · 6 Nov (took over from Lead 20)/' "$T/m/$PRODREL/STATE.md"; rm -f "$T/m/$PRODREL/STATE.md.bak"
sleep 1; git -C "$T/m" commit -qam "a title where the id goes" && git -C "$T/m" -c push.negotiate=false push -q origin lead/y
git -C "$T/mlane" fetch -q origin; out=$(bash "$MC" 2>/dev/null); r=$?
ok "a lead branch's 'Lead 21 · … Lead 20' line (a title where the session id goes) fails check-docs" "$([ $r = 1 ] && echo "$out" | grep -q 'line on origin/lead/y needs a session id' && echo 1)" "exit $r: $out"
out=$(bash "$T/mlane/$PRODREL/tools/current-lead.sh" --no-fetch --id 2>&1); r=$?
ok "... and current-lead.sh --id refuses it (exit 1) instead of printing \"Lead\"" "$([ $r = 1 ] && ! [ "$out" = Lead ] && echo "$out" | grep -q 'does not start with a session id' && echo 1)" "exit $r: $out"
git -C "$T/m" checkout -q main; sleep 1; echo 'current_lead: local_eee-0000-1111 Lead 5 · 6 Nov 19:00 IST' >> "$T/m/$PRODREL/STATE.md"
git -C "$T/m" commit -qam "line on main" && git -C "$T/m" -c push.negotiate=false push -q origin main
git -C "$T/mlane" pull -q --ff-only origin main; sed -i.bak '/^current_lead: /d' "$T/mlane/$PRODREL/STATE.md"; rm -f "$T/mlane/$PRODREL/STATE.md.bak"
out=$(bash "$MC" 2>/dev/null); r=$?
ok "a copy dropping main's line passes only via a lead branch, not origin/main" "$([ $r = 1 ] && echo "$out" | grep -q 'read none from an origin/lead/.*it read: refs/remotes/origin/main' && echo 1)" "exit $r: $out"
git -C "$T/m" checkout -q lead/y; sleep 1; printf 'current_lead: local_fff Lead 6 · a\ncurrent_lead: local_ggg Lead 7 · b\n' >> "$T/m/$PRODREL/STATE.md"
git -C "$T/m" commit -qam "two lines" && git -C "$T/m" -c push.negotiate=false push -q origin lead/y
git -C "$T/mlane" fetch -q origin; out=$(bash "$MC" 2>/dev/null); r=$?
ok "the newest lead branch with two or more lines fails check-docs and says so" "$([ $r = 1 ] && echo "$out" | grep -qE 'it read: current-lead: refs/remotes/origin/lead/y has [2-9] current_lead lines' && echo 1)" "exit $r: $out"

# The skills carry the rule (guard 1's text half): lanes message the Lead after each step; the Lead's hand-over moves the line first.
SK="$(cd "$TOOLS/../../../.." && pwd)/.claude/skills"
for s in next qa; do grep -q 'current-lead.sh' "$SK/$s/SKILL.md" && grep -q 'SendMessage' "$SK/$s/SKILL.md"; ok "skill $s reports each step to the current Lead" "$([ $? = 0 ] && echo 1)" "no current-lead.sh + SendMessage in $s"; done
grep -q 'current_lead:` first' "$SK/lead/SKILL.md"; ok "skill lead's hand-over updates current_lead first" "$([ $? = 0 ] && echo 1)" "no 'current_lead:\` first' in lead"
finish
