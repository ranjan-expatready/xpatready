#!/usr/bin/env bash
# Run the studio's regression suites the way their own usage lines say (P-85): CI on every push, the Lead's check on a
# lane's exact commit, and a lane before it hands back all run this one script, so they run the same checks.
#   bash product/tools/run-suites.sh            every suite; the demo-reset browser suite only where :4400 is disposable
#   bash product/tools/run-suites.sh --demo     also check_studio_browser.cjs (it RESETS the :4400 demo: CI and cloud only)
#   bash product/tools/run-suites.sh --changed <base>..<head>   only the suites the change can affect, plus a smoke set
#        (select-suites.mjs; pull requests, founder 31 Oct); everything when a shared file changed. Combines with --demo.
#   bash product/tools/run-suites.sh --shard <i>/<n>   only every n-th suite, starting at the i-th (P-213: merge-queue
#        batches split across n GitHub machines, each its own fresh copy). Combines with --changed and --demo.
#   --skip-quarantined   every suite except the QUARANTINE list below (I1: the merge queue's one full run; --changed
#        always skips them). --direct (with --changed): select-suites.mjs --direct, never everything (CI's PR_SUITES=direct).
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
DEMO=0; NAMES=0; CHANGED=""; SHARD=1; SHARDS=1; SKIPQ=0; DIRECT=
while [ $# -gt 0 ]; do case "$1" in
  --demo) DEMO=1;;
  --skip-quarantined) SKIPQ=1;;
  --direct) DIRECT=--direct;;
  --names) NAMES=1;;   # print the names and ports this copy would use, run nothing
  --changed) [ -n "${2:-}" ] || { echo "--changed wants <base>..<head>; no suite was run"; exit 2; }; CHANGED="$2"; shift;;
  --changed=*) CHANGED="${1#--changed=}";;
  --shard) [[ "${2:-}" =~ ^([1-9][0-9]*)/([1-9][0-9]*)$ ]] && [ "${BASH_REMATCH[1]}" -le "${BASH_REMATCH[2]}" ] || { echo "--shard wants <i>/<n>, 1 <= i <= n; no suite was run"; exit 2; }
    SHARD="${BASH_REMATCH[1]}"; SHARDS="${BASH_REMATCH[2]}"; shift;;
  *) echo "run-suites.sh: unknown option $1 (--demo, --names, --changed <base>..<head>, --shard <i>/<n>, --skip-quarantined, --direct); no suite was run"; exit 2;;
esac; shift; done
# Not regression suites: the 100-program exercise needs its own fixture copy (run by hand, see its usage line).
SKIP="check_catalogue_scale.cjs"
# Quarantine (P-205, 31 Oct): a suite that fails at random is skipped in PR and merge-queue checks (--changed) until its
# fix merges, so one unreliable test cannot stall every batch; the nightly full run still runs it. Remove a name when
# its fix lands. check_cost_warning_browser.cjs was quarantined 31 Oct and came back 1 Nov when its fix (#177, X8a: the
# check waits for the page's ready signal) merged.
# check_forms_c31_formats.ts was quarantined 1 Nov night (QA-145: untracked p1/inventory files left by a Load sample suite)
# and came back when its fix (#316, C3.1/QA-146: it reads only committed inventories) merged.
# check_c313_reuse_browser.cjs (C3.13, screens) was quarantined 1 Nov 22:00 UTC (a new isolated copy's start check was
# answered by an older copy still on shared port 4448) and came back when that root cause was fixed in isolated.sh (#382).
# check_forms_c36_rule_facts_browser.cjs (C3.6, forms) quarantined 1 Nov 22:45 UTC: its focus check ("after Propose,
# focus lands on the row's To review link") failed batch b489cc2d79 and #374's own PR check (a run-suites.sh-only change),
# and on main 70eb4b7e it failed 1 of 3 runs on a fresh isolated copy ("focus lands on the Proposals link"). Fix row
# (forms): the check waits for the page's ready signal and the focus move before reading document.activeElement.
# check_screen01_api.ts (C2.2 source trust, screens) quarantined 2 Nov 03:45 UTC: "source-trust race: a new unapproved form
# uploaded five times gives five answers" failed #404's PR check (records only, run 41379078310, shard 1) and merge-queue
# batch run 41382319102 for #405 (qa records only); it passed on other PRs. Neither change touches code, so it fails
# without a code cause in those PRs, but it may be a real race in source trust. Fix row (screens): find whether the race
# is in the product (five concurrent uploads of one unapproved form must give one held item) or in the check; fix with a
# fail test; take it off this list in that PR.
# check_d1_reset_to_six_browser.cjs (D1 Reset to the six, runtime) quarantined 2 Nov 07:15 UTC: "Reset to the six… is in the
# Demo menu … reachable with the arrow keys" times out waiting for the dialog "Reset to the six?" (run 41401230384 on #458,
# a forms change; merge-queue run 41400122250 on #423, a test-only change). Neither touches the Demo menu, so main fails it.
# The API check check_d1_reset_to_six.ts passes. Fix row (runtime-3): make the arrow-key path open the dialog (or fix the
# check), with a fail test; take it off this list in that PR.
# check_c313_reuse_browser.cjs (C3.13, screens) quarantined 2 Nov 11:40 UTC by the tech lead (P-214): its setup step "sample inputs
# loaded" fails with 409 "Already in progress or already exists", then a 30 s wait on the Combination chooser (nightly
# 41381724752 on main; run 41419363380 on #493, a data-only R3 change). #423 added diagnostics; the cause is open. Fix row:
# runtime lane L1 (finish plan P-264), with a fail test; take it off this list in that PR.
# Back on 2 Nov (runtime L1): the cause was Workspace.id() racing on an empty database (Prisma's upsert with an empty
# update is a plain INSERT, so the page's first calls and the sample load each created the workspace; the losers' P2002
# answered 409). api/src/core.ts now shares one creation; fail test tests/check_workspace_first_calls.ts (5/9 before, 9/9).
QUARANTINE="check_forms_c36_rule_facts_browser.cjs check_screen01_api.ts check_d1_reset_to_six_browser.cjs"
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
  sel=$(printf '%s\n' "$files" | node "$P/product/tools/select-suites.mjs" $DIRECT) || { echo "select-suites.mjs failed; no suite was run"; exit 2; }
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
# --shard i/n: the chosen units (a suite, or the three R1 suites together as check_runtime_r1a.ts) are dealt to n shards
# longest first by tools/suite-times.tsv (unknown: 30 s; quarantined: 0), each to the shard with the least time so far.
# Every machine computes the same deal, so the n shards together run each chosen unit once. myturn <unit>: is it mine?
TURN=0; MINE=" "
if [ "$SHARDS" -gt 1 ]; then
  units=()
  for path in "$S"/tests/check_*.ts "$S"/tests/check_*.cjs; do f=$(basename "$path"); case " $SKIP " in *" $f "*) continue;; esac; picked "$f" && units+=("$f"); done
  RT0="$S/tests/runtime"
  [ -f "$RT0/check_case_engine.ts" ] && picked check_case_engine.ts && units+=(check_case_engine.ts)
  [ -f "$RT0/check_runtime_r1a.ts" ] && { picked check_runtime_r1a.ts || picked check_runtime_r1c.cjs || picked check_runtime_r1d.ts; } && units+=(check_runtime_r1a.ts)
  for t in check_p2_guard check_p2_launch; do [ -f "$P/prototype/tests/$t.ts" ] && picked "$t.ts" && units+=("$t.ts"); done
  TURN=${#units[@]}
  MINE=" $(printf '%s\n' "${units[@]}" | awk -v n="$SHARDS" -v me="$SHARD" -v q=" $QUARANTINE " -v tf="$P/product/tools/suite-times.tsv" '
    BEGIN { while ((getline l < tf) > 0) { if (l ~ /^#/) continue; split(l, a, "\t"); t[a[1]] = a[2] } }
    { u[NR] = $0; w[NR] = (index(q, " " $0 " ") ? 0 : (($0 in t) ? t[$0] : 30)); if ($0 == "check_runtime_r1a.ts") w[NR] += t["check_runtime_r1c.cjs"] + t["check_runtime_r1d.ts"] }
    END { for (i = 1; i <= NR; i++) o[i] = i
          for (i = 1; i <= NR; i++) for (j = i + 1; j <= NR; j++) if (w[o[j]] > w[o[i]] || (w[o[j]] == w[o[i]] && u[o[j]] < u[o[i]])) { x = o[i]; o[i] = o[j]; o[j] = x }
          for (k = 1; k <= n; k++) load[k] = 0
          for (i = 1; i <= NR; i++) { b = 1; for (k = 2; k <= n; k++) if (load[k] < load[b]) b = k; load[b] += w[o[i]]; if (b == me) printf "%s ", u[o[i]] } }') "
fi
myturn() { [ "$SHARDS" -le 1 ] && return 0; case "$MINE" in *" $1 "*) return 0;; esac; return 1; }
pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" status >/dev/null 2>&1 || zsh "$S/start.sh" >/dev/null 2>&1 || { echo "the demo database is not running and start.sh failed"; exit 2; }
# Fresh web bundle (runtime builder, 1 Nov): the isolated copies serve web/dist as built, so a browser suite run after an
# edit tested the old screens. Outside CI (CI builds first), rebuild unless the bundle's stamp matches web/, contracts/
# and engine/ (QA-181: a time check missed a bundle built today from an old branch; isolated.sh checks it too). Only when
# a browser suite (*.cjs) is among the suites that will run.
if [ -z "${CI:-}" ]; then
  needweb=0; for path in "$S"/tests/check_*.cjs "$S"/tests/runtime/check_*.cjs; do [ -f "$path" ] && picked "$(basename "$path")" && { needweb=1; break; }; done
  if [ "$needweb" = 1 ]; then
    bash "$S/tools/web-fresh.sh" ensure || { echo "vite build failed; no suite was run"; exit 2; }
  fi
fi

rows=(); fail=0; failed=()
run() {  # $1 file, $2 label, rest: command
  local f="$1" label="$2"; shift 2; local log="$OUT/${f%.*}.log" t0=$SECONDS code=0
  if "$TIMEOUT" 1200 "$@" > "$log" 2>&1; then st=PASS; else code=$?; st=FAIL; fail=1; failed+=("$f|$code|$log"); fi
  local last; last=$(grep -E "passed|/[0-9]+ passed|[0-9]+ passed" "$log" | tail -1 | cut -c1-90)
  [ -n "$last" ] || last="$(grep -c '^PASS' "$log") checks passed"
  # A failing check's own line first: "Error" also appears inside PASS lines that quote an expected error. Then an
  # error's message ("TypeError: fetch failed"), not the "name: 'Error'," of a printed error object (1 Nov, batch
  # 41292621195: that was the whole reason a merge-queue log gave). The exit code says how it ended (124: timed out).
  [ "$st" = FAIL ] && last="exit $code: $( (grep -m1 -E '^(FAIL|STOP)' "$log" || grep -m1 -E 'Error: ' "$log" || grep -m1 -E 'Error' "$log") | cut -c1-90)"
  rows+=("| $f | $st | $((SECONDS - t0)) s | ${last:-see $log} |")
}
for path in "$S"/tests/check_*.ts "$S"/tests/check_*.cjs; do
  f=$(basename "$path"); case " $SKIP " in *" $f "*) continue;; esac
  picked "$f" || continue
  myturn "$f" || continue
  case " $QUARANTINE " in *" $f "*) { [ -n "$CHANGED" ] || [ "$SKIPQ" = 1 ]; } && { rows+=("| $f | quarantined | | fails at random: nightly only until its fix merges (P-205) |"); continue; };; esac
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
if [ -f "$RT/check_case_engine.ts" ] && picked check_case_engine.ts && myturn check_case_engine.ts; then run check_case_engine.ts plain $TSX "$RT/check_case_engine.ts"; fi
# The three R1 suites share one copy and run in order: chosen together (select-suites.mjs) or not at all.
if [ -f "$RT/check_runtime_r1a.ts" ] && { picked check_runtime_r1a.ts || picked check_runtime_r1c.cjs || picked check_runtime_r1d.ts; } && myturn check_runtime_r1a.ts; then
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
  [ -f "$P/prototype/tests/$t.ts" ] && picked "$t.ts" && myturn "$t.ts" && run "$t.ts" plain "$S/node_modules/.bin/tsx" "$P/prototype/tests/$t.ts"
done
# A choice that ran nothing is a fault, never a pass.
# A shard can rightly get nothing when few suites were chosen (fewer than n): that shard says so and passes.
if [ -n "$PICK" ] && [ "${#rows[@]}" -eq 0 ]; then
  if [ "$SHARDS" -gt 1 ] && [ "$MINE" = " " ]; then rows=("| (none) | PASS | | $TURN chosen units, none for shard $SHARD/$SHARDS |")
  else rows=("| (none) | FAIL | | suites were chosen but none ran |"); fail=1; fi
fi
# Each failing suite's FAIL lines and the end of its log, on stderr: the job log shows why it failed even when the
# uploaded logs cannot be read, and the summary table (stdout) stays a table (flaky-checks fix, 1 Nov).
for x in ${failed[@]+"${failed[@]}"}; do   # (bash 3.2 on the Mac: an empty array under set -u)
  IFS='|' read -r f code log <<< "$x"
  { echo "::group::$f failed (exit $code): its FAIL lines and the last 40 lines of ${log#$ROOT/}"
    grep -E '^(FAIL|STOP)' "$log" | head -20; echo "--- last 40 lines"; tail -40 "$log"; echo "::endgroup::"; } >&2
done
echo "| Suite | Result | Time | Last line |"; echo "|---|---|---|---|"; printf '%s\n' "${rows[@]}"
echo "commit $(git rev-parse --short HEAD)${PICK:+ · only the chosen suites ran (--changed $CHANGED)}$([ "$SHARDS" -gt 1 ] && echo " · shard $SHARD/$SHARDS of $TURN units") · logs in ${OUT#$ROOT/}${PREFIX:+ · copies named ${PREFIX}_*, ports +$(( 10000 + 1000 * (SLOT - 1) ))}"
exit $fail
