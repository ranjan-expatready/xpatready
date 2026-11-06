#!/usr/bin/env bash
# B122 (P-376 (8)): automatic flaky-suite handling, end to end on fixture suites (no app, no database, US$0):
# run-suites.sh --retry retries a failed suite once and lists it as "passed on retry" or "failed twice"; the nightly
# (no --retry) never retries; the summary's "retries:" line; flaky.mjs counts the records (daily-numbers.sh) and
# quarantines a suite that passed only on retry on 2 branches in 7 days, with an owner and a fix date; run-suites.sh
# skips that suite in PR and queue checks but runs it in the nightly set; CI passes --retry, the nightly does not.
#   bash product/tools/check-flaky.sh
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
T=ai-workers/problem-1-pathway-setup-and-form-filling/product/tools
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — $3"; fi; }
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT

# Fixture suites: ok passes, flaky fails its first try only (a counter per case), broken always fails, slow "times out".
fx() {  # fx <case> <suite...>: a fresh fixture folder holding only these suites
  local d="$W/$1"; mkdir -p "$d/tests" "$d/state"; shift
  for s in "$@"; do case "$s" in
    check_fx_ok*) echo 'console.log("PASS fine"); console.log("1 passed")' ;;
    check_fx_flaky*) echo 'const f=require("path").join(process.env.FX_STATE, require("path").basename(__filename)); const fs=require("fs"); const n=fs.existsSync(f)?Number(fs.readFileSync(f,"utf8")):0; fs.writeFileSync(f,String(n+1)); if(n===0){console.log("FAIL read ECONNRESET");process.exit(1)} console.log("PASS ok on try "+(n+1)); console.log("1 passed")' ;;
    check_fx_broken*) echo 'const f=require("path").join(process.env.FX_STATE, require("path").basename(__filename)); const fs=require("fs"); const n=fs.existsSync(f)?Number(fs.readFileSync(f,"utf8")):0; fs.writeFileSync(f,String(n+1)); console.log("FAIL a real break"); process.exit(1)' ;;
    check_fx_slow*) echo 'console.log("STOP waited 20 min"); process.exit(124)' ;;
  esac > "$d/tests/$s"; done
}
rs() {  # rs <case> <run-suites args...>: run the fixture folder; output in $W/<case>.out, exit code echoed
  local c="$1"; shift
  CI= COPY_PREFIX= SUITES_LOCKS="$W/locks" SUITES_TESTS_DIR="$W/$c/tests" SUITES_OUT="$W/$c/out" FX_STATE="$W/$c/state" \
    bash "$T/run-suites.sh" "$@" > "$W/$c.out" 2> "$W/$c.err"; echo $?
}
tries() { cat "$W/$1/state/$2" 2>/dev/null || echo 0; }
row() { grep -E "^\| $2 \|" "$W/$1.out"; }

# 1. A suite that fails once then passes: retried once, "passed on retry", and the run passes.
fx flaky check_fx_ok.cjs check_fx_flaky.cjs
code=$(rs flaky --retry)
ok "B122: a suite failing once is retried once and listed as passed on retry" "$(row flaky check_fx_flaky.cjs | grep -q '| passed on retry |' && [ "$(tries flaky check_fx_flaky.cjs)" = 2 ] && echo 1)" "$(row flaky check_fx_flaky.cjs); tries $(tries flaky check_fx_flaky.cjs)"
ok "B122: a pass on retry does not fail the run (exit 0)" "$([ "$code" = 0 ] && echo 1)" "exit $code"
ok "B122: the row gives the first try's reason" "$(row flaky check_fx_flaky.cjs | grep -q '1st try exit 1: FAIL read ECONNRESET' && echo 1)" "$(row flaky check_fx_flaky.cjs)"
ok "B122: the summary line lists the retry" "$(grep -q '^retries: 1 · passed on retry: check_fx_flaky.cjs (' "$W/flaky.out" && echo 1)" "$(grep '^retries' "$W/flaky.out")"
ok "B122: the retry is one record in retries.tsv (time, suite, outcome, exits 1 and 0)" "$(awk -F'\t' 'NR == 1 && $2 == "check_fx_flaky.cjs" && $3 == "passed on retry" && $4 == 1 && $5 == 0 { n++ } END { exit !(n == 1 && NR == 1) }' "$W/flaky/out/retries.tsv" && echo 1)" "$(cat "$W/flaky/out/retries.tsv" 2>&1)"
ok "B122: the first try's log is kept beside the retry's" "$([ -s "$W/flaky/out/check_fx_flaky.try1.log" ] && echo 1)" "no try1 log"

# 2. A suite that always fails: retried once, "failed twice", the run fails (exit 1).
fx broken check_fx_broken.cjs
code=$(rs broken --retry)
ok "B122: a suite failing again is listed as failed twice" "$(row broken check_fx_broken.cjs | grep -q '| failed twice |' && [ "$(tries broken check_fx_broken.cjs)" = 2 ] && echo 1)" "$(row broken check_fx_broken.cjs)"
ok "B122: failed twice fails the run (exit 1)" "$([ "$code" = 1 ] && echo 1)" "exit $code"
ok "B122: the summary line lists failed twice" "$(grep -q '^retries: 1 · failed twice: check_fx_broken.cjs (' "$W/broken.out" && echo 1)" "$(grep '^retries' "$W/broken.out")"

# 3. The nightly full set (no --retry) never retries: the same flaky suite fails, ran once, no retries line or record.
fx nightly check_fx_flaky.cjs
code=$(rs nightly)
ok "B122: without --retry (the nightly) a failed suite is not retried and fails the run" "$(row nightly check_fx_flaky.cjs | grep -q '| FAIL |' && [ "$(tries nightly check_fx_flaky.cjs)" = 1 ] && [ "$code" = 1 ] && echo 1)" "exit $code; $(row nightly check_fx_flaky.cjs)"
ok "B122: without --retry no retries line and no retries.tsv" "$(! grep -q '^retries' "$W/nightly.out" && [ ! -e "$W/nightly/out/retries.tsv" ] && echo 1)" "$(grep '^retries' "$W/nightly.out")"

# 4. A suite that hit its 20-minute limit (exit 124) is not retried: a second 20 minutes would sink the part.
fx slow check_fx_slow.cjs
code=$(rs slow --retry)
ok "B122: a timed-out suite (exit 124) is not retried" "$(row slow check_fx_slow.cjs | grep -q '| FAIL |.*exit 124.*timed out at 20 min, not retried' && [ "$code" = 1 ] && [ ! -e "$W/slow/out/retries.tsv" ] && echo 1)" "exit $code; $(row slow check_fx_slow.cjs)"

# 5. At most SUITES_RETRY_MAX retries a run: after that, failures are a real break and run once.
fx limit check_fx_flaky_a.cjs check_fx_flaky_b.cjs
code=$(SUITES_RETRY_MAX=1 rs limit --retry)
ok "B122: the retry limit: the second failure is not retried" "$(row limit check_fx_flaky_a.cjs | grep -q '| passed on retry |' && row limit check_fx_flaky_b.cjs | grep -q '| FAIL |.*not retried: 1 retries already' && [ "$code" = 1 ] && echo 1)" "exit $code; $(row limit check_fx_flaky_b.cjs)"
ok "B122: with no failure there are no retries (retries: 0, no record)" "$(fx clean check_fx_ok.cjs; c=$(rs clean --retry); [ "$c" = 0 ] && grep -q '^retries: 0 (' "$W/clean.out" && [ ! -e "$W/clean/out/retries.tsv" ] && echo 1)" "$(grep '^retries' "$W/clean.out")"

# 6. The 7-day count and the quarantine rule (flaky.mjs), on fixed records; NOW is 6 Nov 12:00 UTC.
NOW=2026-11-06T12:00:00Z; E="$W/events.tsv"; L="$W/ledger.tsv"
cp "$T/flaky-ledger.tsv" "$L"
rec() { printf '%s\t%s\t%s\t1\t%s\tabc1234\t%s\t%s\n' "$1" "$2" "$3" "$([ "$3" = "passed on retry" ] && echo 0 || echo 1)" "$4" "$5"; }
{ rec 2026-11-01T10:00:00Z check_forms_x_browser.cjs "passed on retry" 101 claude/forms-a
  rec 2026-11-05T09:00:00Z check_forms_x_browser.cjs "passed on retry" 102 mergify/merge-queue/m2-1
  rec 2026-11-04T10:00:00Z check_same_branch.ts "passed on retry" 103 claude/runtime-b
  rec 2026-11-05T10:00:00Z check_same_branch.ts "passed on retry" 104 claude/runtime-b
  rec 2026-10-29T10:00:00Z check_old.ts "passed on retry" 105 claude/screens-c
  rec 2026-11-05T10:00:00Z check_old.ts "passed on retry" 106 claude/screens-d
  rec 2026-11-04T10:00:00Z check_really_broken.ts "failed twice" 107 claude/forms-e
  rec 2026-11-05T10:00:00Z check_really_broken.ts "failed twice" 108 claude/forms-f
  rec 2026-11-03T10:00:00Z check_released.ts "passed on retry" 109 claude/forms-g
  rec 2026-11-05T10:00:00Z check_released.ts "passed on retry" 110 claude/forms-h
  rec 2026-11-06T08:00:00Z check_g4_tests_tab_browser.ts "passed on retry" 111 claude/forms-i
} > "$E"
printf 'release\tcheck_released.ts\t2026-11-04\n' >> "$L"
q=$(node "$T/flaky.mjs" quarantine --now "$NOW" --events "$E" --ledger "$L" 2> "$W/q.err"); qc=$?
ok "B122: passed only on retry on 2 branches in 7 days → quarantined, owner from the ledger, fix date = newest + 7 days" "$([ "$qc" = 0 ] && grep -qx 'check_forms_x_browser.cjs|forms|2026-11-12|101,102' <<< "$(tr ' ' '\n' <<< "$q")" && echo 1)" "exit $qc: $q"
ok "B122: twice on one branch does not quarantine (a builder's own branch cannot quarantine a suite for everyone)" "$([[ "$q" != *check_same_branch* ]] && echo 1)" "$q"
ok "B122: a retry older than 7 days does not count" "$([[ "$q" != *check_old* ]] && echo 1)" "$q"
ok "B122: failed twice is a real failure, never a reason to quarantine" "$([[ "$q" != *check_really_broken* ]] && echo 1)" "$q"
ok "B122: retries before a release line (a fix landed) do not count" "$([[ "$q" != *check_released* ]] && echo 1)" "$q"
ok "B122: one retry is not enough" "$([[ "$q" != *check_g4_tests_tab* ]] && echo 1)" "$q"
ok "B122: exactly one suite quarantined, and stderr says why with owner and fix date" "$([ "$(wc -w <<< "$q")" = 1 ] && grep -q 'quarantined: check_forms_x_browser.cjs passed only on retry 2 times on 2 branches in 7 days (runs 101, 102); owner forms; fix by 2026-11-12' "$W/q.err" && echo 1)" "$q / $(cat "$W/q.err")"
q2=$(node "$T/flaky.mjs" quarantine --now 2026-11-13T00:00:00Z --events "$E" --ledger "$L" 2>/dev/null)
ok "B122: on its fix date the suite drops out of the window and comes back" "$([[ "$q2" != *check_forms_x_browser* ]] && echo 1)" "$q2"
c=$(node "$T/flaky.mjs" count --since 2026-11-05T00:00:00Z --now "$NOW" --events "$E")
ok "B122: count (daily-numbers.sh) since 5 Nov 00:00 UTC: 6 retries, 5 passed on retry, 1 failed twice" "$([ "$c" = "retries=6 passed_on_retry=5 failed_twice=1" ] && echo 1)" "$c"
cj=$(node "$T/flaky.mjs" count --since 2026-11-05T00:00:00Z --now "$NOW" --events "$E" --json)
ok "B122: count --json for scripts" "$([ "$cj" = '{"retries":6,"passed_on_retry":5,"failed_twice":1}' ] && echo 1)" "$cj"
node "$T/flaky.mjs" --self-test > "$W/self.out" 2>&1; sc=$?
ok "B122: flaky.mjs self-test (fork artifacts never count; bad records and ledger lines refused)" "$([ "$sc" = 0 ] && echo 1)" "$(grep FAIL "$W/self.out")"
node "$T/flaky.mjs" quarantine --ledger "$T/flaky-ledger.tsv" --events /dev/null > /dev/null 2>&1
ok "B122: the committed ledger reads" "$([ $? = 0 ] && echo 1)" "flaky-ledger.tsv did not parse"

# 7. run-suites.sh takes the rule's output: a quarantined suite is skipped in PR and queue checks (row names owner and
# fix date) and still runs in the nightly set; a malformed entry is ignored, never run blind.
fx q check_fx_broken.cjs check_fx_ok.cjs
code=$(SUITES_QUARANTINE_AUTO="check_fx_broken.cjs|forms|2026-11-12|101,102 ../evil|x|y|z" rs q --retry --skip-quarantined)
ok "B122: an automatically quarantined suite is skipped in a queue check, its row naming owner and fix date" "$(row q check_fx_broken.cjs | grep -q '| quarantined | | passed only on retry on 2+ branches in 7 days (runs 101, 102): owner forms, back on 2026-11-12' && [ "$(tries q check_fx_broken.cjs)" = 0 ] && [ "$code" = 0 ] && echo 1)" "exit $code; $(row q check_fx_broken.cjs)"
ok "B122: a malformed SUITES_QUARANTINE_AUTO entry is named and ignored" "$(grep -q 'ignored the malformed entry "../evil|x|y|z"' "$W/q.err" && echo 1)" "$(cat "$W/q.err")"
fx qn check_fx_broken.cjs
code=$(SUITES_QUARANTINE_AUTO="check_fx_broken.cjs|forms|2026-11-12|101,102" rs qn)
ok "B122: the nightly set still runs an automatically quarantined suite" "$(row qn check_fx_broken.cjs | grep -q '| FAIL |' && [ "$code" = 1 ] && echo 1)" "exit $code; $(row qn check_fx_broken.cjs)"

# 8. Wiring: CI's PR and queue checks pass --retry and the rule's list; the nightly never retries.
CIY=.github/workflows/ci.yml; NY=.github/workflows/nightly.yml
ok "B122: ci.yml's parts run run-suites.sh --retry with SUITES_QUARANTINE_AUTO from the kind job" "$(grep -q 'run-suites.sh" --demo --retry' "$CIY" && grep -q 'SUITES_QUARANTINE_AUTO: \${{ needs.kind.outputs.autoq }}' "$CIY" && grep -q 'flaky.mjs" quarantine' "$CIY" && echo 1)" "wiring missing in ci.yml"
ok "B122: ci.yml uploads retries.tsv as suite-retries-<part>" "$(grep -q 'name: suite-retries-\${{ matrix.shard }}' "$CIY" && echo 1)" "upload missing"
ok "B122: the nightly never passes --retry" "$(! grep -q -- '--retry' "$NY" && echo 1)" "nightly.yml has --retry"

echo "$pass passed, $fail failed"
exit $((fail > 0))
