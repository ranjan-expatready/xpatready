#!/usr/bin/env bash
# The per-copy names of run-suites.sh (Lead, 28 Oct): each lane's copy gets its own names and ports, CI keeps the plain
# ones, and a second run that would use the same names or ports is refused before any suite starts. Runs no suite, US$0.
#   bash product/tools/check-copy-prefix.sh
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
RS=ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/run-suites.sh
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — $3"; fi; }
names() { env -u CI "$@" bash "$RS" --names 2>&1; }
ci=$(CI=true bash "$RS" --names 2>&1)
ok "CI keeps the plain names and ports (no prefix)" "$([[ "$ci" == "prefix: none · slot: 0 · forms_s4 → forms_s4 on 4455 · runtime_r1 → runtime_r1 on 4430" ]] && echo 1)" "$ci"
seen=""; clash=""
for lane in lead screens forms evidence runtime m3 qa scout; do
  line=$(names COPY_PREFIX=$lane); port=$(printf '%s' "$line" | sed -E 's/.*runtime_r1 → [a-z0-9_]+ on ([0-9]+).*/\1/')
  case " $seen " in *" $port "*) clash="$clash $lane";; esac; seen="$seen $port"
done
ok "each lane gets its own names and ports (no two lanes share a port)" "$([ -z "$clash" ] && echo 1)" "shared by:$clash ($seen)"
fx=$(names COPY_PREFIX=forms)
ok "a lane's copy prefixes its isolated copies and moves their ports" "$([[ "$fx" == *"forms_s4 → forms_forms_s4 on 16455"* ]] && echo 1)" "$fx"
bad=$(names COPY_PREFIX='no-good!' ; echo "exit=$?")
ok "fail: a prefix that is not letters, digits and _ is refused" "$([[ "$bad" == *"COPY_PREFIX:"* && "$bad" == *"exit=2"* ]] && echo 1)" "$bad"
# Two copies at once: a run already holds the forms slot (a live pid: this shell), so a second run is refused, says
# whose run it is, and starts no suite.
locks=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$locks" ] || { echo "no temp dir: nothing was checked"; exit 2; }; mkdir -p "$locks/slot-3"; printf '%s %s %s\n' "$$" forms "/another/copy" > "$locks/slot-3/owner"
second=$(SUITES_LOCKS=$locks COPY_PREFIX=forms bash "$RS" 2>&1; echo "exit=$?")
ok "fail: a second run with the same names is refused before any suite runs, naming the other copy" "$([[ "$second" == *"Another run of the suites uses the same names"* && "$second" == *"/another/copy"* && "$second" == *"exit=3"* && "$second" != *"| Suite |"* ]] && echo 1)" "$second"
printf '%s %s %s\n' 999999 forms "/gone/copy" > "$locks/slot-3/owner"
stale=$(SUITES_LOCKS=$locks COPY_PREFIX=forms bash "$RS" --names 2>&1; echo "exit=$?")
ok "a lock left by a run that ended is no obstacle (the names dry run reads it, claims nothing)" "$([[ "$stale" == *"exit=0"* ]] && echo 1)" "$stale"
rm -rf "$locks"
echo; echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
