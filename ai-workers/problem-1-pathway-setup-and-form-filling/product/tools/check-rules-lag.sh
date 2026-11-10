#!/usr/bin/env bash
# P-440 (founder, 9 Nov ~22:30 IST: "make the hard rule so that you don't make this mistakes even when we switch the
# account"): check-docs.sh fails when RULES.md's "as of **P-NNN**" lags DECISIONS.md's newest row by more than 3, so a
# new Lead's start read stays one page (~10k tokens, not ~75k). Throwaway copies, US$0.
#   bash product/tools/check-rules-lag.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
T=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; trap 'rm -rf "$T"' EXIT
docs_copy "$T/c"; P="$T/c/$PRODREL"; CD="$P/tools/check-docs.sh"
run() { out=$(bash "$CD" 2>/dev/null); r=$?; }
rules() { printf '# Rules in force (as of **P-%s**, test)\n' "$1" > "$P/RULES.md"; }
decs() { { echo '| # | Date | Decision |'; echo '|---|---|---|'; for n in "$@"; do echo "| P-$n | 9 Nov | test |"; done; } > "$P/DECISIONS.md"; }
rules 440; decs 443 442 441 440; run
ok "RULES 3 rows behind passes" "$( ! echo "$out" | grep -q 'RULES LAG' && echo 1)" "exit $r: $out"
decs 444 443 442 441 440; run
ok "RULES 4 rows behind fails and names the fix" "$([ $r = 1 ] && echo "$out" | grep -q 'RULES LAG: RULES.md is as of P-440 but DECISIONS reaches P-444 (4 rows behind' && echo 1)" "exit $r: $out"
printf '# Rules in force, no marker\n' > "$P/RULES.md"; run
ok "RULES with no 'as of' marker fails" "$([ $r = 1 ] && echo "$out" | grep -q "RULES LAG: RULES.md's first line needs" && echo 1)" "exit $r: $out"
rules 444; run
ok "RULES current passes" "$( ! echo "$out" | grep -q 'RULES LAG' && echo 1)" "exit $r: $out"
finish
