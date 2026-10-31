#!/usr/bin/env bash
# Run the studio's regression suites the way their own usage lines say (P-85): CI on every push, the Lead's check on a
# lane's exact commit, and a lane before it hands back all run this one script, so they run the same checks.
#   bash product/tools/run-suites.sh            every suite; the demo-reset browser suite only where :4400 is disposable
#   bash product/tools/run-suites.sh --demo     also check_studio_browser.cjs (it RESETS the :4400 demo: CI and cloud only)
#   bash product/tools/run-suites.sh --changed <base>..<head>   only the suites the change can affect, plus a smoke set
#        (select-suites.mjs; pull requests, founder 31 Oct); everything when a shared file changed. Combines with --demo.
# Each tests/check_*.ts|cjs names its run in a usage line: "isolated.sh <name> <port> start && tsx|node studio/tests/<file>
# <args>" (an isolated copy: own database, own files, the demo is never touched) or "tsx studio/tests/<file>" (no server).
# Never calls a model (every suite replays saved runs; US$0). Exit 1 when any suite fails; a summary table either way.
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
P=ai-workers/problem-1-pathway-setup-and-form-filling; S="$P/prototype/studio"
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
# GNU timeout: `timeout` on Linux (CI), `gtimeout` from Homebrew coreutils on the Mac. Missing → stop loudly, never run unguarded.
TIMEOUT="$(command -v timeout || command -v gtimeout || true)"
[ -n "$TIMEOUT" ] || { echo "GNU timeout is missing (Mac: brew install coreutils, which provides gtimeout); no suite was run"; exit 2; }
DEMO=0; NAMES=0; CHANGED=""
while [ $# -gt 0 ]; do case "$1" in
  --demo) DEMO=1;;
  --names) NAMES=1;;   # print the names and ports this copy would use, run nothing
  --changed) [ -n "${2:-}" ] || { echo "--changed wants <base>..<head>; no suite was run"; exit 2; }; CHANGED="$2"; shift;;
  --changed=*) CHANGED="${1#--changed=}";;
  *) echo "run-suites.sh: unknown option $1 (--demo, --names, --changed <base>..<head>); no suite was run"; exit 2;;
esac; shift; done
# Not regression suites: the 100-program exercise needs its own fixture copy (run by hand, see its usage line).
SKIP="check_catalogue_scale.cjs"
OUT="${SUITES_OUT:-$ROOT/$S/var/suites}"; mkdir -p "$OUT"
TSX="$S/node_modules/.bin/tsx --tsconfig $S/api/tsconfig.json"
export P2_LEDGER_DIR="${P2_LEDGER_DIR_SUITES:-$OUT/p2-ledger-$$}"; mkdir -p "$P2_LEDGER_DIR"   # QA-90 / P-179: test runs never write the real ledger (forms plan-p179 §5)
DB="postgresql://xr_studio@127.0.0.1:54329"
# Per-copy names (Lead, 28 Oct): copies on one Mac share the database server and localhost ports, and two copies running
# the suites at once broke each other's isolated copies. Each copy now gives its isolated copies, their databases and
# ports its own prefix: COPY_PREFIX when set, else this copy's lane (lane.sh whoami). CI has no prefix, so nothing there
# changes. A lock (shared by every copy, under .tools) refuses a second run that would use the same names or ports.
PREFIX="${COPY_PREFIX-}"
if [ -z "${CI:-}" ] && [ -z "${COPY_PREFIX+x}" ]; then PREFIX=$(bash "$P/product/tools/lane.sh" whoami 2>/dev/null | tr -cd 'a-z0-9_'); [ "$PREFIX" = unbound ] && PREFIX=""; fi
[[ "$PREFIX" =~ ^[a-z0-9_]{0,12}$ ]] || { echo "COPY_PREFIX: lower case letters, digits and _ only, at most 12"; exit 2; }
SLOT=0
if [ -n "$PREFIX" ]; then
  # One slot per lane, so lanes never share ports; any other prefix hashes into slots 9 to 35. Ports move by 10000 +
  # 1000 x (SLOT - 1): 14400 to 48480, clear of the demo :4400 and the database :54329, and below macOS's range for
  # outgoing connections (49152 and up). Above it, a request to a test server that is briefly down can connect to
  # itself and read its own request back (31 Oct: batch 2 failed with "Response does not match the HTTP/1.1 protocol"
  # on port 50438, prefix ci, slot 37).
  case "$PREFIX" in lead) SLOT=1;; screens) SLOT=2;; forms) SLOT=3;; evidence) SLOT=4;; runtime) SLOT=5;; m3) SLOT=6;; qa) SLOT=7;; scout) SLOT=8;;
    *) SLOT=$(( $(printf '%s' "$PREFIX" | cksum | cut -d' ' -f1) % 27 + 9 ));; esac
  LOCK="${SUITES_LOCKS:-$ROOT/.tools/run-suites-locks}/slot-$SLOT"; mkdir -p "${LOCK%/*}"
  claim() { mkdir "$LOCK" 2>/dev/null && printf '%s %s %s\n' "$$" "$PREFIX" "$ROOT" > "$LOCK/owner"; }
  if [ "$NAMES" = 1 ]; then :; elif ! claim; then
    # A lock just made may not have its owner line yet (claim is two steps): wait for it before calling it stale.
    for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$LOCK/owner" ] && break; sleep 0.3; done
    read -r opid oprefix oroot < "$LOCK/owner" 2>/dev/null || true
    if [ -n "${opid:-}" ] && kill -0 "$opid" 2>/dev/null; then
      echo "Another run of the suites uses the same names or ports: prefix ${oprefix:-?} in ${oroot:-?} (pid $opid). Wait for it, or set COPY_PREFIX to another name. No suite was run."; exit 3
    fi
    rm -rf "$LOCK"; claim || { echo "Could not claim the suites lock $LOCK; no suite was run."; exit 3; }
  fi
  [ "$NAMES" = 1 ] || trap 'rm -rf "$LOCK"' EXIT
fi
# CI first (P-183): the Mac CI job marks itself (SUITES_CI_FIRST=1); any other full run waits until it is done, so a
# pull request check never shares the Mac with a lane's full run. --names never waits.
CILOCK="${SUITES_LOCKS:-$ROOT/.tools/run-suites-locks}/ci-active"; mkdir -p "${CILOCK%/*}"
if [ "$NAMES" = 1 ]; then :
elif [ "${SUITES_CI_FIRST:-}" = 1 ]; then echo "$$" > "$CILOCK"; trap 'rm -f "$CILOCK"; [ -n "${LOCK:-}" ] && rm -rf "$LOCK"' EXIT
else
  said=""; while [ -s "$CILOCK" ] && kill -0 "$(cat "$CILOCK" 2>/dev/null)" 2>/dev/null; do
    [ -n "$said" ] || { echo "A pull request check (CI) is running the suites on this Mac: waiting for it first (P-183)."; said=1; }; sleep 15; done
fi
iname() { if [ -n "$PREFIX" ]; then printf '%s_%s' "$PREFIX" "$1"; else printf '%s' "$1"; fi; }
iport() { if [ "$SLOT" -gt 0 ]; then echo $(( $1 + 10000 + 1000 * (SLOT - 1) )); else echo "$1"; fi; }
if [ "$NAMES" = 1 ]; then echo "prefix: ${PREFIX:-none} · slot: $SLOT · forms_s4 → $(iname forms_s4) on $(iport 4455) · runtime_r1 → $(iname runtime_r1) on $(iport 4430)"; exit 0; fi
# --changed: the suites to run (PICK, " a b c "); empty PICK = every suite. The choice and its reasons print first.
PICK=""
if [ -n "$CHANGED" ]; then
  [[ "$CHANGED" == *..* ]] || { echo "--changed wants <base>..<head>; no suite was run"; exit 2; }
  base="${CHANGED%%..*}"; head="${CHANGED##*..}"
  files=$(git -c core.quotePath=false diff --no-renames --name-only "$base...$head") || { echo "git diff $base...$head failed; no suite was run"; exit 2; }
  sel=$(printf '%s\n' "$files" | node "$P/product/tools/select-suites.mjs") || { echo "select-suites.mjs failed; no suite was run"; exit 2; }
  printf '%s\n' "$sel" > "$OUT/selection.tsv"
  TAB=$(printf '\t')
  if [ "${sel%%"$TAB"*}" = ALL ]; then
    echo "**Every suite runs** for $base..$head ($(printf '%s\n' "$files" | grep -c .) files changed): ${sel#ALL"$TAB"}"; echo
  else
    PICK=" $(printf '%s\n' "$sel" | cut -f1 | tr '\n' ' ')"
    echo "**$(printf '%s\n' "$sel" | grep -c .) suites chosen** for $base..$head ($(printf '%s\n' "$files" | grep -c .) files changed); the full set runs nightly on main."
    echo; echo "| Chosen suite | Why |"; echo "|---|---|"; printf '%s\n' "$sel" | awk -F'\t' '{ gsub(/\|/, "\\|", $2); print "| " $1 " | " $2 " |" }'; echo
  fi
fi
picked() { [ -z "$PICK" ] && return 0; case "$PICK" in *" $1 "*) return 0;; esac; return 1; }
pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" status >/dev/null 2>&1 || zsh "$S/start.sh" >/dev/null 2>&1 || { echo "the demo database is not running and start.sh failed"; exit 2; }

rows=(); fail=0
run() {  # $1 file, $2 label, rest: command
  local f="$1" label="$2"; shift 2; local log="$OUT/${f%.*}.log" t0=$SECONDS
  if "$TIMEOUT" 1200 "$@" > "$log" 2>&1; then st=PASS; else st=FAIL; fail=1; fi
  local last; last=$(grep -E "passed|/[0-9]+ passed|[0-9]+ passed" "$log" | tail -1 | cut -c1-90)
  [ -n "$last" ] || last="$(grep -c '^PASS' "$log") checks passed"
  # A failing check's own line first: "Error" also appears inside PASS lines that quote an expected error.
  [ "$st" = FAIL ] && last="$( (grep -m1 -E '^(FAIL|STOP)' "$log" || grep -m1 -E 'Error' "$log") | cut -c1-90)"
  rows+=("| $f | $st | $((SECONDS - t0)) s | ${last:-see $log} |")
}
for path in "$S"/tests/check_*.ts "$S"/tests/check_*.cjs; do
  f=$(basename "$path"); case " $SKIP " in *" $f "*) continue;; esac
  picked "$f" || continue
  usage=$(grep -m1 -E "studio/tests/$f" "$path")
  if [ "$f" = check_studio_browser.cjs ]; then
    if [ "$DEMO" = 0 ] && [ "${SUITES_BROWSER_ISOLATED:-}" = 1 ]; then
      # The Mac CI runner (self-hosted, founder 30 Oct): the same suite on its own isolated copy, never the :4400 demo.
      bn=$(iname studio_browser); bp=$(iport 4429)
      zsh "$S/tools/isolated.sh" "$bn" "$bp" start >/dev/null 2>&1 || { rows+=("| $f | FAIL | | isolated copy $bn did not start |"); fail=1; continue; }
      run "$f" isolated env STUDIO_URL="http://localhost:$bp" STUDIO_DB="xr_studio_$bn" node "$path"
      zsh "$S/tools/isolated.sh" "$bn" "$bp" stop >/dev/null 2>&1; continue
    fi
    [ "$DEMO" = 1 ] || { rows+=("| $f | skipped | | resets the :4400 demo: --demo (CI, cloud) |"); continue; }
    zsh "$S/start.sh" >/dev/null 2>&1; run "$f" demo node "$path"; continue
  fi
  # A usage line may pass server settings after "start" (isolated.sh start KEY=VALUE ..., e.g. a test-only pause).
  if [[ "$usage" =~ isolated\.sh\ ([a-z0-9_]+)\ ([0-9]+)\ start((\ [A-Z_][A-Z0-9_]*=[^ ]+)*)\ \&\&\ (tsx|node)\ studio/tests/$f(.*) ]]; then
    uname="${BASH_REMATCH[1]}"; uport="${BASH_REMATCH[2]}"; env=(${BASH_REMATCH[3]}); tool="${BASH_REMATCH[5]}"
    name=$(iname "$uname"); port=$(iport "$uport")
    # With a prefix, an optional database argument ([xr_studio_x]) is passed renamed, so the suite reads its own copy.
    keep=""; [ -n "$PREFIX" ] && keep='s/\[(xr_studio_[a-z0-9_]+)\]/\1/g; '
    args=$(printf '%s' "${BASH_REMATCH[6]}" | sed -E "${keep}"'s/\[[^]]*\]//g; s/ {2,}.*//')
    [ -n "$PREFIX" ] && args=$(printf ' %s ' "$args" | sed -E "s/ ${uport} / ${port} /g; s/xr_studio_${uname}( |\$)/xr_studio_${name}\1/g")
    zsh "$S/tools/isolated.sh" "$name" "$port" start "${env[@]}" >/dev/null 2>&1 || { rows+=("| $f | FAIL | | isolated copy $name did not start |"); fail=1; continue; }
    if [ "$tool" = node ]; then run "$f" "$name" node "$path" $args; else run "$f" "$name" $TSX "$path" $args; fi
    zsh "$S/tools/isolated.sh" "$name" "$port" stop >/dev/null 2>&1
  else
    # A check that starts its own copy says so as "[port=N] [name=x]" (check_ai_orchestration): with a prefix it gets this
    # copy's port and name, so two lanes never start the same copy (PR #72 review).
    own=""; if [ -n "$PREFIX" ] && [[ "$usage" =~ \[port=([0-9]+)\]\ \[name=([a-z0-9_]+)\] ]]; then own="$(iport "${BASH_REMATCH[1]}") $(iname "${BASH_REMATCH[2]}")"; fi
    case "$f" in *.cjs) run "$f" plain node "$path";; *) run "$f" plain env DATABASE_URL="$DB/xr_studio_demo" $TSX "$path" $own;; esac
  fi
done
# Suites outside tests/check_*: the runtime lane's (R1, two steps on one copy) and the drafting guard's (prototype/tests,
# plain: they make their own temporary copies). Both lanes' Lead checks found CI skipping them (24 Oct).
RT="$S/tests/runtime"; RN=$(iname runtime_r1); RP=$(iport 4430)
if [ -f "$RT/check_case_engine.ts" ] && picked check_case_engine.ts; then run check_case_engine.ts plain $TSX "$RT/check_case_engine.ts"; fi
# The three R1 suites share one copy and run in order: chosen together (select-suites.mjs) or not at all.
if [ -f "$RT/check_runtime_r1a.ts" ] && { picked check_runtime_r1a.ts || picked check_runtime_r1c.cjs || picked check_runtime_r1d.ts; }; then
  if zsh "$S/tools/isolated.sh" "$RN" "$RP" start >/dev/null 2>&1 && $TSX "$RT/setup_visitor_visa.ts" "$RP" "xr_studio_$RN" > "$OUT/setup_visitor_visa.log" 2>&1; then
    # R1c's browser journey first: it publishes a release 2 that R1a expects (runtime lane, 24 Oct).
    [ -f "$RT/check_runtime_r1c.cjs" ] && run check_runtime_r1c.cjs "$RN" node "$RT/check_runtime_r1c.cjs" "$RP"
    # R1d next on the same copy (it fills forms from the cases R1c made); R1a last: its --reset empties the workspace.
    [ -f "$RT/check_runtime_r1d.ts" ] && run check_runtime_r1d.ts "$RN" $TSX "$RT/check_runtime_r1d.ts" "$RP" "xr_studio_$RN"
    run check_runtime_r1a.ts "$RN" $TSX "$RT/check_runtime_r1a.ts" "$RP" "xr_studio_$RN" --reset
  else rows+=("| check_runtime_r1a.ts | FAIL | | isolated copy runtime_r1 or setup_visitor_visa.ts failed (see setup_visitor_visa.log) |"); fail=1; fi
  zsh "$S/tools/isolated.sh" "$RN" "$RP" stop >/dev/null 2>&1
fi
for t in check_p2_guard check_p2_launch; do
  [ -f "$P/prototype/tests/$t.ts" ] && picked "$t.ts" && run "$t.ts" plain "$S/node_modules/.bin/tsx" "$P/prototype/tests/$t.ts"
done
# A choice that ran nothing is a fault, never a pass.
[ -n "$PICK" ] && [ "${#rows[@]}" -eq 0 ] && { rows=("| (none) | FAIL | | suites were chosen but none ran |"); fail=1; }
echo "| Suite | Result | Time | Last line |"; echo "|---|---|---|---|"; printf '%s\n' "${rows[@]}"
echo "commit $(git rev-parse --short HEAD)${PICK:+ · only the chosen suites ran (--changed $CHANGED)} · logs in ${OUT#$ROOT/}${PREFIX:+ · copies named ${PREFIX}_*, ports +$(( 10000 + 1000 * (SLOT - 1) ))}"
exit $fail
