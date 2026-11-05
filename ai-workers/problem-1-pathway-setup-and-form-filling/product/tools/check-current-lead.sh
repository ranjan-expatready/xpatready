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

# current-lead.sh reads the freshest STATE on GitHub: main says Lead 1, a newer lead/* branch says Lead 2.
docs_copy "$T/src"; git init -q --bare -b main "$T/origin.git"; git -C "$T/src" remote add origin "$T/origin.git"; git -C "$T/src" -c push.negotiate=false push -q origin main
git -C "$T/src" checkout -qb lead/x; sed -i.bak 's/^current_lead: .*/current_lead: local_bbb Lead 2 · 6 Nov 03:15 IST/' "$T/src/$PRODREL/STATE.md"
rm -f "$T/src/$PRODREL/STATE.md.bak"; sleep 1; git -C "$T/src" commit -qam "hand-over" && git -C "$T/src" -c push.negotiate=false push -q origin lead/x
git clone -q "$T/origin.git" "$T/lane"; L="$T/lane/$PRODREL/tools/current-lead.sh"
out=$(bash "$L"); ok "a lane on main reads the Lead from the newer lead branch" "$([ "$out" = 'local_bbb Lead 2 · 6 Nov 03:15 IST' ] && echo 1)" "got: $out"
out=$(bash "$L" --id); ok "--id prints the session id only" "$([ "$out" = local_bbb ] && echo 1)" "got: $out"
git -C "$T/src" checkout -q main; sleep 1; sed -i.bak 's/^current_lead: .*/current_lead: local_ccc Lead 3 · later/' "$T/src/$PRODREL/STATE.md"
git -C "$T/src" commit -qam "newer on main" && git -C "$T/src" -c push.negotiate=false push -q origin main
out=$(bash "$L" --id); ok "main wins when its STATE is the newer one" "$([ "$out" = local_ccc ] && echo 1)" "got: $out"
git -C "$T/src" checkout -q lead/x; sleep 1; sed -i.bak '/^current_lead: /d' "$T/src/$PRODREL/STATE.md"; echo 'x' >> "$T/src/$PRODREL/STATE.md"
git -C "$T/src" commit -qam "lead line lost" && git -C "$T/src" -c push.negotiate=false push -q origin lead/x
out=$(bash "$L" --id); ok "a branch whose STATE lost the line is skipped" "$([ "$out" = local_ccc ] && echo 1)" "got: $out"
out=$(cd "$T" && mkdir solo && cp -r "$T/c/ai-workers" solo/ && sed -i.bak '/^current_lead: /d' "solo/$PRODREL/STATE.md" && bash "solo/$PRODREL/tools/current-lead.sh" 2>&1); r=$?
ok "no line anywhere: exit 1 with the ListAgents fallback" "$([ $r = 1 ] && echo "$out" | grep -q ListAgents && echo 1)" "exit $r: $out"

# The skills carry the rule (guard 1's text half): lanes message the Lead after each step; the Lead's hand-over moves the line first.
SK="$(cd "$TOOLS/../../../.." && pwd)/.claude/skills"
for s in next qa; do grep -q 'current-lead.sh' "$SK/$s/SKILL.md" && grep -q 'SendMessage' "$SK/$s/SKILL.md"; ok "skill $s reports each step to the current Lead" "$([ $? = 0 ] && echo 1)" "no current-lead.sh + SendMessage in $s"; done
grep -q 'current_lead:` first' "$SK/lead/SKILL.md"; ok "skill lead's hand-over updates current_lead first" "$([ $? = 0 ] && echo 1)" "no 'current_lead:\` first' in lead"
finish
