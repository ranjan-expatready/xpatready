#!/usr/bin/env bash
# Run the studio's regression suites the way their own usage lines say (P-85): CI on every push, the Lead's check on a
# lane's exact commit, and a lane before it hands back all run this one script, so they run the same checks.
#   bash product/tools/run-suites.sh            every suite; the demo-reset browser suite only where :4400 is disposable
#   bash product/tools/run-suites.sh --demo     also check_studio_browser.cjs (it RESETS the :4400 demo: CI and cloud only)
# Each tests/check_*.ts|cjs names its run in a usage line: "isolated.sh <name> <port> start && tsx|node studio/tests/<file>
# <args>" (an isolated copy: own database, own files, the demo is never touched) or "tsx studio/tests/<file>" (no server).
# Never calls a model (every suite replays saved runs; US$0). Exit 1 when any suite fails; a summary table either way.
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
P=ai-workers/problem-1-pathway-setup-and-form-filling; S="$P/prototype/studio"
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
DEMO=0; [ "${1:-}" = "--demo" ] && DEMO=1
# Not regression suites: the 100-program exercise needs its own fixture copy (run by hand, see its usage line).
SKIP="check_catalogue_scale.cjs"
OUT="${SUITES_OUT:-$ROOT/$S/var/suites}"; mkdir -p "$OUT"
TSX="$S/node_modules/.bin/tsx --tsconfig $S/api/tsconfig.json"
DB="postgresql://xr_studio@127.0.0.1:54329"
pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" status >/dev/null 2>&1 || zsh "$S/start.sh" >/dev/null 2>&1 || { echo "the demo database is not running and start.sh failed"; exit 2; }

rows=(); fail=0
run() {  # $1 file, $2 label, rest: command
  local f="$1" label="$2"; shift 2; local log="$OUT/${f%.*}.log" t0=$SECONDS
  if timeout 1200 "$@" > "$log" 2>&1; then st=PASS; else st=FAIL; fail=1; fi
  local last; last=$(grep -E "passed|/[0-9]+ passed|[0-9]+ passed" "$log" | tail -1 | cut -c1-90)
  [ -n "$last" ] || last="$(grep -c '^PASS' "$log") checks passed"
  [ "$st" = FAIL ] && last="$(grep -m1 -E '^FAIL|Error|STOP' "$log" | cut -c1-90)"
  rows+=("| $f | $st | $((SECONDS - t0)) s | ${last:-see $log} |")
}
for path in "$S"/tests/check_*.ts "$S"/tests/check_*.cjs; do
  f=$(basename "$path"); case " $SKIP " in *" $f "*) continue;; esac
  usage=$(grep -m1 -E "studio/tests/$f" "$path")
  if [ "$f" = check_studio_browser.cjs ]; then
    [ "$DEMO" = 1 ] || { rows+=("| $f | skipped | | resets the :4400 demo: --demo (CI, cloud) |"); continue; }
    zsh "$S/start.sh" >/dev/null 2>&1; run "$f" demo node "$path"; continue
  fi
  # A usage line may pass server settings after "start" (isolated.sh start KEY=VALUE ..., e.g. a test-only pause).
  if [[ "$usage" =~ isolated\.sh\ ([a-z0-9_]+)\ ([0-9]+)\ start((\ [A-Z_][A-Z0-9_]*=[^ ]+)*)\ \&\&\ (tsx|node)\ studio/tests/$f(.*) ]]; then
    name="${BASH_REMATCH[1]}"; port="${BASH_REMATCH[2]}"; env=(${BASH_REMATCH[3]}); tool="${BASH_REMATCH[5]}"
    args=$(printf '%s' "${BASH_REMATCH[6]}" | sed -E 's/\[[^]]*\]//g; s/ {2,}.*//')
    zsh "$S/tools/isolated.sh" "$name" "$port" start "${env[@]}" >/dev/null 2>&1 || { rows+=("| $f | FAIL | | isolated copy $name did not start |"); fail=1; continue; }
    if [ "$tool" = node ]; then run "$f" "$name" node "$path" $args; else run "$f" "$name" $TSX "$path" $args; fi
    zsh "$S/tools/isolated.sh" "$name" "$port" stop >/dev/null 2>&1
  else
    case "$f" in *.cjs) run "$f" plain node "$path";; *) run "$f" plain env DATABASE_URL="$DB/xr_studio_demo" $TSX "$path";; esac
  fi
done
# Suites outside tests/check_*: the runtime lane's (R1, two steps on one copy) and the drafting guard's (prototype/tests,
# plain: they make their own temporary copies). Both lanes' Lead checks found CI skipping them (24 Oct).
RT="$S/tests/runtime"
if [ -f "$RT/check_case_engine.ts" ]; then run check_case_engine.ts plain $TSX "$RT/check_case_engine.ts"; fi
if [ -f "$RT/check_runtime_r1a.ts" ]; then
  if zsh "$S/tools/isolated.sh" runtime_r1 4430 start >/dev/null 2>&1 && $TSX "$RT/setup_visitor_visa.ts" 4430 xr_studio_runtime_r1 > "$OUT/setup_visitor_visa.log" 2>&1; then
    run check_runtime_r1a.ts runtime_r1 $TSX "$RT/check_runtime_r1a.ts" 4430 xr_studio_runtime_r1 --reset
  else rows+=("| check_runtime_r1a.ts | FAIL | | isolated copy runtime_r1 or setup_visitor_visa.ts failed (see setup_visitor_visa.log) |"); fail=1; fi
  zsh "$S/tools/isolated.sh" runtime_r1 4430 stop >/dev/null 2>&1
fi
for t in check_p2_guard check_p2_launch; do
  [ -f "$P/prototype/tests/$t.ts" ] && run "$t.ts" plain "$S/node_modules/.bin/tsx" "$P/prototype/tests/$t.ts"
done
echo "| Suite | Result | Time | Last line |"; echo "|---|---|---|---|"; printf '%s\n' "${rows[@]}"
echo "commit $(git rev-parse --short HEAD) · logs in ${OUT#$ROOT/}"
exit $fail
