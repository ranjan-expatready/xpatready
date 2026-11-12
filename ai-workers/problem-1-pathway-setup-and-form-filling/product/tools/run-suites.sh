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
#   --retry   (B122, P-376 (8); PR and merge-queue checks only, never the nightly full set) a failed suite runs once more,
#        from a fresh start: a new isolated copy (270 suites), the demo restarted (check_studio_browser.cjs, which resets
#        it), or a suite that starts its own copy or touches no database. Its row says "passed on retry" (not a
#        failure) or "failed twice". Never retried, because the retry could not start fresh and a first-run-only bug
#        would pass on it: the R1 group (three suites on one copy) and a plain suite on the shared demo database. Also
#        not retried: a suite that hit its 20-minute limit (exit 124, or 137 when the TERM was ignored), and any failure after SUITES_RETRY_MAX (default 2)
#        retries in one run (many failures are a real break, and retrying them only spends time). Never retried either
#        (F5, founder 6 Nov): a suite whose file name or title (the comment block at its top) says race, concurrent,
#        parallel or upsert, or whose 1st try's FAIL lines do, and a suite on the QUARANTINE list: a pass on retry would
#        turn the race it tests green.
#        Each retry is one line in $SUITES_OUT/retries.tsv (time, suite, outcome, both exit codes, commit; CI uploads it
#        as suite-retries-<part>) and in the summary's "retries:" line. A pass on retry is never silent (F5): the output
#        ends with a qa/BUGS.md-style bug line and the 1st try's log tail (tools/flaky.mjs report, also written to
#        $SUITES_OUT/retry-bugs.md, which CI uploads and its retry-comment job posts as a PR comment). tools/flaky.mjs counts the retries
#        (daily-numbers.sh) and quarantines a suite that passed only on retry in 2 different runs in 7 days
#        (tools/flaky-ledger.tsv).
# SUITES_QUARANTINE_AUTO="<suite>|<owner>|<fix by>|<runs> ..." (CI: from flaky.mjs quarantine in the kind job, the same
#        for every part): joins QUARANTINE below for this run, its row naming the owner and the fix date.
#   --skip-green <file>   suites remembered green (P-371 (3), tools/ci-memory.mjs): "<suite><TAB><why>" lines; each is
#        left out of this run and shown as "remembered" with its reason. Only a pull request's check passes it.
#   --list   print the units this run would run (all shards together, after --changed and --skip-green), run nothing.
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
DEMO=0; NAMES=0; LIST=0; CHANGED=""; SHARD=1; SHARDS=1; SKIPQ=0; DIRECT=; GREEN=""; RETRY=0
while [ $# -gt 0 ]; do case "$1" in
  --demo) DEMO=1;;
  --skip-quarantined) SKIPQ=1;;
  --direct) DIRECT=--direct;;
  --retry) RETRY=1;;
  --names) NAMES=1;;   # print the names and ports this copy would use, run nothing
  --list) LIST=1;;
  --skip-green) [ -f "${2:-}" ] || { echo "--skip-green wants a file of remembered suites; no suite was run"; exit 2; }; GREEN="$2"; shift;;
  --changed) [ -n "${2:-}" ] || { echo "--changed wants <base>..<head>; no suite was run"; exit 2; }; CHANGED="$2"; shift;;
  --changed=*) CHANGED="${1#--changed=}";;
  --shard) [[ "${2:-}" =~ ^([1-9][0-9]*)/([1-9][0-9]*)$ ]] && [ "${BASH_REMATCH[1]}" -le "${BASH_REMATCH[2]}" ] || { echo "--shard wants <i>/<n>, 1 <= i <= n; no suite was run"; exit 2; }
    SHARD="${BASH_REMATCH[1]}"; SHARDS="${BASH_REMATCH[2]}"; shift;;
  *) echo "run-suites.sh: unknown option $1 (--demo, --names, --list, --changed <base>..<head>, --shard <i>/<n>, --skip-quarantined, --direct, --skip-green <file>, --retry); no suite was run"; exit 2;;
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
# check_b78_section_names.ts (B78/B79b, forms) quarantined 6 Nov 21:45 IST by the tech lead (P-214): in merge-queue shard 2
# it prints "11 passed, 0 failed", then does not end until the 1200 s timeout (exit 124). It failed two batches in a row
# on two unrelated PRs: #1158 (run on draft #1169) and #1168 (run 42243001915, job 127978087862). It passes in about 5 s
# in each PR's own check and locally. It uses no server or database and ends with process.exit, so the hang is in the
# runner or the shard, not in the suite's checks. The nightly full set still runs it. Fix row: B122 (#1145, flaky-test
# handling) diagnoses the hang, and takes it off this list in that PR with a fail test.
# Off the list for #1236's own check (7 Nov): it passed there (run 42361397319), then hung again in the merge-queue batch
# of #1236 (batch PR #1271, run 42377102612, part 1/6, job 128416970748, 7 Nov 13:51-14:11 UTC), after its 11 PASS lines
# and "11 passed, 0 failed", until the 1200 s limit. This time guarded() wrote where it waited (STOP lines in its log):
#   timeout (sigsuspend) > tsx's CLI parent (Sl, ep_poll: idle, waiting for its child) > the suite's node (Node 24.21,
#   Sl, futex_do_wait) > [esbuild] <defunct>, an exited esbuild child the suite's node never reaped; stdin /dev/null.
# So the suite's own node process blocks on a lock while exiting (process.exit), with tsx's esbuild service already
# gone: a tsx / Node 24 exit hang, not the runner, not stdin, not the suite's checks (cold tsx start in a fresh part).
# Back on this list until that is fixed; the nightly full set still runs it. Fix row (proposed on #1236): run it so the
# exit cannot deadlock (Node 24's own type stripping instead of tsx's loader thread, or no process.exit), then 3 batch
# passes in a row.
# check_c613_filing_changes_browser.cjs (C6.13 filing changes by screens, runtime) quarantined 12 Nov by the tech lead's
# ruling on #1612 (Lead 23, P-205): its focus check "C6.13 walk 6a pass (review M4): after the change, focus is back on
# the person's row (its menu button)" fails at random. On main's code (348fa8b11's api, a fresh isolated copy each run)
# it failed 1 of 3 runs, 13/14 with only 6a red; on #1612's branch 1 of 2. It reads document.activeElement right after
# the done line appears, with no wait for the focus move (as check_forms_c36's focus check above). The quarantine is the
# whole suite (this list is per suite); its 13 other steps still run nightly, and acceptance/C6.13.test.ts (32 steps)
# still runs in PR and queue packs. Fix row QA-420 (qa/BUGS.md, runtime): the check waits for the focus move (or the
# product moves focus only after its re-render), 5 runs green in a row, then off this list in that PR.
QUARANTINE="check_forms_c36_rule_facts_browser.cjs check_screen01_api.ts check_d1_reset_to_six_browser.cjs check_b78_section_names.ts check_c613_filing_changes_browser.cjs"
# Automatic quarantine (B122): only well-formed entries; anything else is named and ignored, never run blind.
AUTOQ=" "
for e in ${SUITES_QUARANTINE_AUTO:-}; do
  IFS='|' read -r qn qo qd qr <<< "$e"
  if [[ "$qn" =~ ^check_[A-Za-z0-9_.-]+\.(ts|cjs)$ && "$qo" =~ ^[a-z0-9_-]+$ && "$qd" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ && "${qr:--}" =~ ^[0-9,-]+$ ]]; then
    case " $QUARANTINE " in *" $qn "*) ;; *) QUARANTINE="$QUARANTINE $qn"; AUTOQ="$AUTOQ$qn|$qo|$qd|${qr:--} ";; esac
  else echo "SUITES_QUARANTINE_AUTO: ignored the malformed entry \"$e\"" >&2; fi
done
RETRY_MAX="${SUITES_RETRY_MAX:-2}"; [[ "$RETRY_MAX" =~ ^[0-9]+$ ]] || RETRY_MAX=2
OUT="${SUITES_OUT:-$ROOT/$S/var/suites}"; mkdir -p "$OUT"
# SUITES_TESTS_DIR (tools/check-flaky.sh only): run the check_* files of a fixture folder instead of studio/tests, and
# nothing else (no runtime or drafting suites, no database or web build); CI never sets it.
TESTS="${SUITES_TESTS_DIR:-$S/tests}"
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
  if [ "$NAMES" = 1 ] || [ "$LIST" = 1 ]; then :; elif ! claim; then
    # A lock just made may not have its owner line yet (claim is two steps): wait for it before calling it stale.
    for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$LOCK/owner" ] && break; sleep 0.3; done
    read -r opid oprefix oroot < "$LOCK/owner" 2>/dev/null || true
    if [ -n "${opid:-}" ] && kill -0 "$opid" 2>/dev/null; then
      echo "Another run of the suites uses the same names or ports: prefix ${oprefix:-?} in ${oroot:-?} (pid $opid). Wait for it, or set COPY_PREFIX to another name. No suite was run."; exit 3
    fi
    rm -rf "$LOCK"; claim || { echo "Could not claim the suites lock $LOCK; no suite was run."; exit 3; }
  fi
  [ "$NAMES" = 1 ] || [ "$LIST" = 1 ] || trap 'rm -rf "$LOCK"' EXIT
fi
# CI first (P-183): the Mac CI job marks itself (SUITES_CI_FIRST=1); any other full run waits until it is done, so a
# pull request check never shares the Mac with a lane's full run. --names never waits.
CILOCK="${SUITES_LOCKS:-$ROOT/.tools/run-suites-locks}/ci-active"; [ "$LIST" = 1 ] || mkdir -p "${CILOCK%/*}"
if [ "$NAMES" = 1 ] || [ "$LIST" = 1 ]; then :
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
    [ "$LIST" = 1 ] || echo "**Every suite runs** for $base..$head ($(printf '%s\n' "$files" | grep -c .) files changed): ${sel#ALL"$TAB"}"; [ "$LIST" = 1 ] || echo
  else
    PICK=" $(printf '%s\n' "$sel" | cut -f1 | tr '\n' ' ')"
    [ "$LIST" = 1 ] || echo "**$(printf '%s\n' "$sel" | grep -c .) suites chosen** for $base..$head ($(printf '%s\n' "$files" | grep -c .) files changed); the full set runs nightly on main."
    [ "$LIST" = 1 ] || { echo; echo "| Chosen suite | Why |"; echo "|---|---|"; printf '%s\n' "$sel" | awk -F'\t' '{ gsub(/\|/, "\\|", $2); print "| " $1 " | " $2 " |" }'; echo; }
  fi
fi
# --skip-green: REMEMBER, " a b c ", the suites a green run on the same base already passed with unchanged inputs.
REMEMBER=" "; [ -n "$GREEN" ] && REMEMBER=" $(cut -f1 "$GREEN" | grep -E '^check_[A-Za-z0-9_.-]+$' | tr '\n' ' ')"
chosen() { [ -z "$PICK" ] && return 0; case "$PICK" in *" $1 "*) return 0;; esac; return 1; }
picked() { case "$REMEMBER" in *" $1 "*) return 1;; esac; chosen "$1"; }
# --shard i/n: the chosen units (a suite, or the three R1 suites together as check_runtime_r1a.ts) are dealt to n shards
# longest first by tools/suite-times.tsv (unknown: 30 s; quarantined: 0), each to the shard with the least time so far.
# Every machine computes the same deal, so the n shards together run each chosen unit once. myturn <unit>: is it mine?
TURN=0; MINE=" "
if [ "$SHARDS" -gt 1 ] || [ "$LIST" = 1 ]; then
  units=()
  for path in "$TESTS"/check_*.ts "$TESTS"/check_*.cjs; do [ -e "$path" ] || continue; f=$(basename "$path"); case " $SKIP " in *" $f "*) continue;; esac; picked "$f" && units+=("$f"); done
  RT0="$S/tests/runtime"; [ -n "${SUITES_TESTS_DIR:-}" ] && RT0=/nonexistent
  [ -f "$RT0/check_case_engine.ts" ] && picked check_case_engine.ts && units+=(check_case_engine.ts)
  [ -f "$RT0/check_runtime_r1a.ts" ] && { picked check_runtime_r1a.ts || picked check_runtime_r1c.cjs || picked check_runtime_r1d.ts; } && units+=(check_runtime_r1a.ts)
  for t in check_p2_guard check_p2_launch; do [ -z "${SUITES_TESTS_DIR:-}" ] && [ -f "$P/prototype/tests/$t.ts" ] && picked "$t.ts" && units+=("$t.ts"); done
  TURN=${#units[@]}
  MINE=" $(printf '%s\n' "${units[@]}" | awk -v n="$SHARDS" -v me="$SHARD" -v q=" $QUARANTINE " -v tf="$P/product/tools/suite-times.tsv" '
    BEGIN { while ((getline l < tf) > 0) { if (l ~ /^#/) continue; split(l, a, "\t"); t[a[1]] = a[2] } }
    { u[NR] = $0; w[NR] = (index(q, " " $0 " ") ? 0 : (($0 in t) ? t[$0] : 30)); if ($0 == "check_runtime_r1a.ts") w[NR] += t["check_runtime_r1c.cjs"] + t["check_runtime_r1d.ts"] }
    END { for (i = 1; i <= NR; i++) o[i] = i
          for (i = 1; i <= NR; i++) for (j = i + 1; j <= NR; j++) if (w[o[j]] > w[o[i]] || (w[o[j]] == w[o[i]] && u[o[j]] < u[o[i]])) { x = o[i]; o[i] = o[j]; o[j] = x }
          for (k = 1; k <= n; k++) load[k] = 0
          for (i = 1; i <= NR; i++) { b = 1; for (k = 2; k <= n; k++) if (load[k] < load[b]) b = k; load[b] += w[o[i]]; if (b == me) printf "%s ", u[o[i]] } }') "
fi
if [ "$LIST" = 1 ]; then
  for u in ${units[@]+"${units[@]}"}; do case " $QUARANTINE " in *" $u "*) { [ -n "$CHANGED" ] || [ "$SKIPQ" = 1 ]; } && continue;; esac; echo "$u"; done; exit 0
fi
myturn() { [ "$SHARDS" -le 1 ] && return 0; case "$MINE" in *" $1 "*) return 0;; esac; return 1; }
[ -n "${SUITES_TESTS_DIR:-}" ] || pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" status >/dev/null 2>&1 || zsh "$S/start.sh" >/dev/null 2>&1 || { echo "the demo database is not running and start.sh failed"; exit 2; }
# Fresh web bundle (runtime builder, 1 Nov): the isolated copies serve web/dist as built, so a browser suite run after an
# edit tested the old screens. Outside CI (CI builds first), rebuild unless the bundle's stamp matches web/, contracts/
# and engine/ (QA-181: a time check missed a bundle built today from an old branch; isolated.sh checks it too). Only when
# a browser suite (*.cjs) is among the suites that will run.
if [ -z "${CI:-}" ] && [ -z "${SUITES_TESTS_DIR:-}" ]; then
  needweb=0; for path in "$S"/tests/check_*.cjs "$S"/tests/runtime/check_*.cjs; do [ -f "$path" ] && picked "$(basename "$path")" && { needweb=1; break; }; done
  if [ "$needweb" = 1 ]; then
    bash "$S/tools/web-fresh.sh" ensure || { echo "vite build failed; no suite was run"; exit 2; }
  fi
fi

# A quarantined suite's reason: by hand (P-205), or by the B122 rule with its owner and fix date.
qwhy() { local e; for e in $AUTOQ; do case "$e" in "$1|"*) IFS='|' read -r _ qo qd qr <<< "$e"
  echo "passed only on retry in 2+ runs in 7 days (runs ${qr//,/, }): owner $qo, back on $qd unless fixed sooner; nightly still runs it (B122)"; return;; esac; done
  echo "fails at random: nightly only until its fix merges (P-205)"; }
rows=(); fail=0; failed=(); RETRIES=0; RETRIED=(); AGAIN=(); NORETRY=""; RF=""
[ "$RETRY" = 1 ] && : > "$OUT/retries.tsv" && rm -f "$OUT/retry-bugs.md"
# F5 (founder 6 Nov, after the outside review): a suite about a race is never retried, because a pass on retry would
# turn the very race it tests green. Its file name or its title (the comment block at its top) names one: race,
# concurrent, parallel or upsert, as whole words (not "trace"). Prints the word, or nothing. Also (review of F5, Major 2):
# a 1st try whose FAIL or STOP lines name one, so a race check inside a neutrally titled suite (check_screen01_api.ts's
# "source-trust race: concurrent uploads") is not retried either.
RACE_RE='(^|[^a-z])(rac(e|es|ing)|concurren[a-z]*|parallel[a-z]*|upserts?|upserting)([^a-z]|$)'
racy() {  # $1 file name, $2 its path, $3 its 1st try's log
  local w; w=$(printf '%s\n' "$1" | tr 'A-Z' 'a-z' | grep -m1 -oE "$RACE_RE" | head -1)
  [ -z "$w" ] && [ -f "${2:-}" ] && w=$(awk '/^(#!|[[:space:]]*\/\/|\/\*|[[:space:]]*\*|[[:space:]]*$|["'"'"']use strict["'"'"'];?[[:space:]]*$)/ { print; next } { exit }' "$2" | tr 'A-Z' 'a-z' | grep -oE "$RACE_RE" | head -1)
  [ -z "$w" ] && [ -f "${3:-}" ] && w=$(grep -E '^(FAIL|STOP)' "$3" | tr 'A-Z' 'a-z' | grep -oE "$RACE_RE" | head -1)
  printf '%s' "$w" | tr -cd 'a-z'; }
# The line that says why a log failed: a failing check's own line first ("Error" also appears inside PASS lines that quote
# an expected error), then an error's message ("TypeError: fetch failed"), not the "name: 'Error'," of a printed error
# object (1 Nov, batch 41292621195: that was the whole reason a merge-queue log gave).
why() { (grep -m1 -E '^(FAIL|STOP)' "$1" || grep -m1 -E 'Error: ' "$1" || grep -m1 -E 'Error' "$1") | cut -c1-80; }
# A fresh isolated copy for a retry (B122): the first try may have left its copy in any state.
# The first try's api.log is kept beside its suite log (stop moves it to isolated-logs, where the retry would replace it).
recopy() { zsh "$S/tools/isolated.sh" "$1" "$2" stop >/dev/null 2>&1
  cp "$S/var/isolated-logs/$1-api.log" "$OUT/${RF%.*}.try1-api.log" 2>/dev/null; zsh "$S/tools/isolated.sh" "$@" >/dev/null 2>&1; }
# One suite, guarded. Hardening and diagnostics after the b78 hang (6 Nov: check_b78_section_names.ts printed "11 passed"
# and then did not end until the 1200 s limit, twice, as the first suite of merge-queue part 2; its cause is not found,
# see QUARANTINE above). Before, each suite got the caller's stdin and a plain `timeout 1200`:
#   * stdin is /dev/null: a suite, its tsx parent or anything they start never waits on a stdin the runner was handed
#     (an open pipe: `... | bash run-suites.sh`, a lane's terminal; GitHub's runner already gives a step none);
#   * timeout -k: a suite (or tsx, which relays the TERM to its child) that ignores the TERM at the limit is killed
#     SUITES_KILL_AFTER (30) s later; a plain timeout waits for it for ever, until the part's job limit (75 min in ci.yml, #1491), with no
#     row and no log;
#   * one second before the limit its processes (timeout's process group: pid, parent, state, wait channel, age,
#     command; on Linux each one's open files) are written to its log under a STOP line, so a hang says where it waits.
# SUITES_TIMEOUT (seconds, default 1200) and SUITES_KILL_AFTER are for tools/check-flaky.sh's fixtures; CI sets neither.
LIMIT="${SUITES_TIMEOUT:-1200}"; [[ "$LIMIT" =~ ^[1-9][0-9]*$ ]] || LIMIT=1200
KILL_AFTER="${SUITES_KILL_AFTER:-30}"; [[ "$KILL_AFTER" =~ ^[1-9][0-9]*$ ]] || KILL_AFTER=30
lim() { if [ $((LIMIT % 60)) = 0 ]; then echo "$((LIMIT / 60)) min"; else echo "$LIMIT s"; fi; }
timedout() { [ "$1" = 124 ] || { [ "$1" = 137 ] && [ "$2" -ge "$LIMIT" ]; }; }   # exit code, seconds taken
hangdump() {  # hangdump <timeout's pid>: the suite's processes while they still run
  kill -0 "$1" 2>/dev/null || return 0
  local p fd fds
  echo "STOP still running at the $(lim) limit; its processes below, then TERM (KILL ${KILL_AFTER} s later)"
  # Linux (procps) cuts the wait channel to 6 letters unless given a width; BSD ps (the Mac) takes no width.
  local wc=wchan=; [ -d /proc/self/fd ] && wc=wchan:32=
  ps -A -o pid=,ppid=,pgid=,stat=,"$wc",etime=,args= 2>/dev/null | awk -v g="$1" '$3 == g' | cut -c1-300
  [ -d /proc/self/fd ] || return 0
  for p in $(ps -A -o pid=,pgid= 2>/dev/null | awk -v g="$1" '$2 == g { print $1 }'); do
    fds=""; for fd in /proc/"$p"/fd/*; do [ -e "$fd" ] || [ -L "$fd" ] || continue; fds="$fds ${fd##*/}:$(readlink "$fd" 2>/dev/null)"; done
    echo "open files of $p:$fds" | cut -c1-600
  done
}
guarded() {  # guarded <log> <command...>: the exit code is timeout's (124 timed out, 137 killed after ignoring the TERM)
  local log="$1"; shift; local pid w code
  # Append mode, so the suite's later lines never write over the STOP lines (its own offset would).
  : > "$log"; "$TIMEOUT" -k "$KILL_AFTER" "$LIMIT" "$@" < /dev/null >> "$log" 2>&1 &
  pid=$!
  ( s=""; trap '[ -n "$s" ] && kill "$s" 2>/dev/null; exit 0' TERM
    sleep "$(( LIMIT > 2 ? LIMIT - 1 : 1 ))" > /dev/null 2>&1 & s=$!; wait "$s"; hangdump "$pid" >> "$log" ) < /dev/null &
  w=$!
  wait "$pid"; code=$?
  kill "$w" 2>/dev/null; wait "$w" 2>/dev/null
  return "$code"
}
run() {  # $1 file, $2 label, rest: command. AGAIN readies a retry (recopy ...); NORETRY says why there is none; both cleared.
  local f="$1" label="$2"; shift 2; local log="$OUT/${f%.*}.log" t0=$SECONDS code=0 code2=0 note="" a src="" rw=""; RF="$f"
  for a in "$@"; do case "$a" in */"$f") src="$a";; esac; done   # the suite's own file, for its title (F5)
  if guarded "$log" "$@"; then st=PASS; else code=$?; st=FAIL; fi
  if [ "$st" = FAIL ] && [ "$RETRY" = 1 ]; then
    [ -z "$NORETRY" ] && rw=$(racy "$f" "$src" "$log")
    if [ -n "$NORETRY" ]; then note="not retried: $NORETRY"
    elif case " $QUARANTINE " in *" $f "*) true;; *) false;; esac; then note="not retried: on the quarantine list (F5)"
    elif [ -n "$rw" ]; then note="not retried: its name, title or FAIL line says \"$rw\", and a pass on retry would hide a race (F5)"
    elif timedout "$code" $((SECONDS - t0)); then note="timed out at $(lim), not retried"
    elif [ "$RETRIES" -ge "$RETRY_MAX" ]; then note="not retried: $RETRY_MAX retries already in this run"
    else
      RETRIES=$((RETRIES + 1)); local first; first="exit $code: $(why "$log")"; mv "$log" "$OUT/${f%.*}.try1.log"
      if { [ ${#AGAIN[@]} -eq 0 ] || "${AGAIN[@]}"; } && guarded "$log" "$@"; then st="passed on retry"
      else code2=$?; [ -s "$log" ] || echo "STOP the copy for the retry did not start" > "$log"; st="failed twice"; fi
      printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$f" "$st" "$code" "$code2" "$(git rev-parse --short HEAD)" >> "$OUT/retries.tsv"
      RETRIED+=("$f|$st")
      note="1st try $first"; [ "$st" = "failed twice" ] && code=$code2
    fi
  fi
  AGAIN=(); NORETRY=""
  case "$st" in PASS|"passed on retry") ;; *) fail=1; failed+=("$f|$code|$log");; esac
  local last; last=$(grep -E "passed|/[0-9]+ passed|[0-9]+ passed" "$log" | tail -1 | cut -c1-90)
  [ -n "$last" ] || last="$(grep -c '^PASS' "$log") checks passed"
  # The exit code says how it ended (124: timed out). A retried suite's row also gives its first try's reason.
  case "$st" in FAIL|"failed twice") last="exit $code: $(why "$log")";; esac
  [ -n "$note" ] && last="$last · ${note//|//}"
  rows+=("| $f | $st | $((SECONDS - t0)) s | ${last:-see $log} |")
}
for path in "$TESTS"/check_*.ts "$TESTS"/check_*.cjs; do
  [ -e "$path" ] || continue   # an unmatched pattern stays literal (only a fixture folder lacks one of the two kinds)
  f=$(basename "$path"); case " $SKIP " in *" $f "*) continue;; esac
  picked "$f" || continue
  myturn "$f" || continue
  case " $QUARANTINE " in *" $f "*) { [ -n "$CHANGED" ] || [ "$SKIPQ" = 1 ]; } && { rows+=("| $f | quarantined | | $(qwhy "$f") |"); continue; };; esac
  usage=$(grep -m1 -E "studio/tests/$f" "$path")
  if [ "$f" = check_studio_browser.cjs ]; then
    if [ "$DEMO" = 0 ] && [ "${SUITES_BROWSER_ISOLATED:-}" = 1 ]; then
      # The Mac CI runner (self-hosted, founder 30 Oct): the same suite on its own isolated copy, never the :4400 demo.
      bn=$(iname studio_browser); bp=$(iport 4429)
      zsh "$S/tools/isolated.sh" "$bn" "$bp" start >/dev/null 2>&1 || { rows+=("| $f | FAIL | | isolated copy $bn did not start |"); fail=1; continue; }
      AGAIN=(recopy "$bn" "$bp" start); run "$f" isolated env STUDIO_URL="http://localhost:$bp" STUDIO_DB="xr_studio_$bn" node "$path"
      zsh "$S/tools/isolated.sh" "$bn" "$bp" stop >/dev/null 2>&1; continue
    fi
    [ "$DEMO" = 1 ] || { rows+=("| $f | skipped | | resets the :4400 demo: --demo (CI, cloud) |"); continue; }
    zsh "$S/start.sh" >/dev/null 2>&1; AGAIN=(zsh "$S/start.sh"); run "$f" demo node "$path"; continue
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
    AGAIN=(recopy "$name" "$port" start ${env[@]+"${env[@]}"})
    if [ "$tool" = node ]; then run "$f" "$name" node "$path" $args; else run "$f" "$name" $TSX "$path" $args; fi
    zsh "$S/tools/isolated.sh" "$name" "$port" stop >/dev/null 2>&1
  else
    # A check that starts its own copy says so as "[port=N] [name=x]" (check_ai_orchestration): with a prefix it gets this
    # copy's port and name, so two lanes never start the same copy (PR #72 review).
    own=""; if [ -n "$PREFIX" ] && [[ "$usage" =~ \[port=([0-9]+)\]\ \[name=([a-z0-9_]+)\] ]]; then own="$(iport "${BASH_REMATCH[1]}") $(iname "${BASH_REMATCH[2]}")"; fi
    # A plain suite that touches the database runs on the shared demo database, which a retry cannot start fresh.
    if ! [[ "$usage" =~ \[port=[0-9]+\]\ \[name= ]] && grep -qE 'xr_studio_demo|DATABASE_URL|prisma' "$path"; then NORETRY="it runs on the shared demo database"; fi
    case "$f" in *.cjs) run "$f" plain node "$path";; *) run "$f" plain env DATABASE_URL="$DB/xr_studio_demo" $TSX "$path" $own;; esac
  fi
done
# Suites outside tests/check_*: the runtime lane's (R1, two steps on one copy) and the drafting guard's (prototype/tests,
# plain: they make their own temporary copies). Both lanes' Lead checks found CI skipping them (24 Oct).
RT="$S/tests/runtime"; [ -n "${SUITES_TESTS_DIR:-}" ] && RT=/nonexistent; RN=$(iname runtime_r1); RP=$(iport 4430)
if [ -f "$RT/check_case_engine.ts" ] && picked check_case_engine.ts && myturn check_case_engine.ts; then run check_case_engine.ts plain $TSX "$RT/check_case_engine.ts"; fi
# The three R1 suites share one copy and run in order: chosen together (select-suites.mjs) or not at all.
if [ -f "$RT/check_runtime_r1a.ts" ] && { picked check_runtime_r1a.ts || picked check_runtime_r1c.cjs || picked check_runtime_r1d.ts; } && myturn check_runtime_r1a.ts; then
  if zsh "$S/tools/isolated.sh" "$RN" "$RP" start >/dev/null 2>&1 && guarded "$OUT/setup_visitor_visa.log" $TSX "$RT/setup_visitor_visa.ts" "$RP" "xr_studio_$RN"; then
    # R1c's browser journey first: it publishes a release 2 that R1a expects (runtime lane, 24 Oct).
    # Never retried one by one (review M2): the three share one copy, so a retry would start from the first try's data.
    [ -f "$RT/check_runtime_r1c.cjs" ] && NORETRY="the R1 suites share one copy" && run check_runtime_r1c.cjs "$RN" node "$RT/check_runtime_r1c.cjs" "$RP"
    # R1d next on the same copy (it fills forms from the cases R1c made); R1a last: its --reset empties the workspace.
    [ -f "$RT/check_runtime_r1d.ts" ] && NORETRY="the R1 suites share one copy" && run check_runtime_r1d.ts "$RN" $TSX "$RT/check_runtime_r1d.ts" "$RP" "xr_studio_$RN"
    NORETRY="the R1 suites share one copy"; run check_runtime_r1a.ts "$RN" $TSX "$RT/check_runtime_r1a.ts" "$RP" "xr_studio_$RN" --reset
  else rows+=("| check_runtime_r1a.ts | FAIL | | isolated copy runtime_r1 or setup_visitor_visa.ts failed (see setup_visitor_visa.log) |"); fail=1; fi
  zsh "$S/tools/isolated.sh" "$RN" "$RP" stop >/dev/null 2>&1
fi
for t in check_p2_guard check_p2_launch; do
  [ -z "${SUITES_TESTS_DIR:-}" ] && [ -f "$P/prototype/tests/$t.ts" ] && picked "$t.ts" && myturn "$t.ts" && run "$t.ts" plain "$S/node_modules/.bin/tsx" "$P/prototype/tests/$t.ts"
done
# Every unit dealt to this shard leaves a row: ran, quarantined or skipped (#1660, 12 Nov). One that left none is a
# fault in this script, never a silent pass. (The R1 unit's row is check_runtime_r1a.ts, run or failed.)
if [ "$SHARDS" -gt 1 ]; then
  for u in $MINE; do
    hit=0; for r in ${rows[@]+"${rows[@]}"}; do case "$r" in "| $u |"*) hit=1; break;; esac; done
    [ "$hit" = 1 ] || { rows+=("| $u | FAIL | | dealt to shard $SHARD/$SHARDS but left no row (ran, quarantined or skipped) |"); fail=1; }
  done
fi
# Remembered suites (--skip-green), listed once (shard 1): what they would have run is shown, never silently dropped.
if [ "$SHARD" = 1 ] && [ "$REMEMBER" != " " ]; then
  for f in $REMEMBER; do chosen "$f" || continue; why=$(awk -F'\t' -v n="$f" '$1 == n { print $2; exit }' "$GREEN" | tr '|' '/' | cut -c1-90)
    rows+=("| $f | remembered | | ${why:-green on this base, inputs unchanged} |"); done
fi
# A choice that ran nothing is a fault, never a pass.
# A shard can rightly get nothing: few units chosen (fewer than n), or units that weigh 0 in the deal (quarantined, or
# 0 s in suite-times.tsv) all going to the first least-loaded shard. That shard says so and passes. MINE is " <deal> ",
# so an empty deal is blanks only, never exactly " " (#1660, 12 Nov: shard 6/6 of 18 units, dealt none, failed here).
if [ -n "$PICK" ] && [ "${#rows[@]}" -eq 0 ]; then
  if [ "$SHARDS" -gt 1 ] && [ -z "${MINE// /}" ]; then rows=("| (none) | PASS | | $TURN chosen units, none dealt to shard $SHARD/$SHARDS |")
  else rows=("| (none) | FAIL | | suites were chosen but none ran |"); fail=1; fi
fi
# Each failing suite's FAIL lines and the end of its log, on stderr: the job log shows why it failed even when the
# uploaded logs cannot be read, and the summary table (stdout) stays a table (flaky-checks fix, 1 Nov).
for x in ${failed[@]+"${failed[@]}"}; do   # (bash 3.2 on the Mac: an empty array under set -u)
  IFS='|' read -r f code log <<< "$x"
  { echo "::group::$f failed (exit $code): its FAIL lines and the last 40 lines of ${log#$ROOT/}"
    [ -f "${log%.log}.try1.log" ] && { echo "--- 1st try (retried, B122): its FAIL lines"; grep -E '^(FAIL|STOP)' "${log%.log}.try1.log" | head -10; echo "--- 2nd try"; }
    grep -E '^(FAIL|STOP)' "$log" | head -20; echo "--- last 40 lines"; tail -40 "$log"; echo "::endgroup::"; } >&2
done
echo "| Suite | Result | Time | Last line |"; echo "|---|---|---|---|"; printf '%s\n' "${rows[@]}"
# B122: every retry in one line (flaky.mjs counts the records in retries.tsv, which CI uploads as suite-retries-<part>).
if [ "$RETRY" = 1 ]; then
  ok=""; bad=""; for x in ${RETRIED[@]+"${RETRIED[@]}"}; do case "$x" in *"|passed on retry") ok="$ok ${x%%|*}";; *) bad="$bad ${x%%|*}";; esac; done
  echo; echo "retries: ${#RETRIED[@]}${ok:+ · passed on retry:$ok}${bad:+ · failed twice:$bad} (one retry per failed suite, at most $RETRY_MAX a run; never in the nightly full set)"
  [ -s "$OUT/retries.tsv" ] || rm -f "$OUT/retries.tsv"
  # F5: a pass on retry is never silent. A qa/BUGS.md-style bug line per suite, with the 1st try's log tail, in this
  # output (CI's job summary) and in retry-bugs.md (CI posts it as a PR comment). If the report itself fails, a plain line
  # still names the suites.
  if [ -n "$ok" ]; then
    echo
    if node "$P/product/tools/flaky.mjs" report --events "$OUT/retries.tsv" --logs "$OUT" --part "$SHARD" > "$OUT/retry-bugs.md" 2> "$OUT/retry-bugs.err"; then :
    else echo "**Passed only on retry, a possible race (B122, F5):**$ok. The bug report failed: $(head -c 300 "$OUT/retry-bugs.err")" > "$OUT/retry-bugs.md"; fi
    cat "$OUT/retry-bugs.md"
  fi
fi
echo "commit $(git rev-parse --short HEAD)${PICK:+ · only the chosen suites ran (--changed $CHANGED)}$([ "$SHARDS" -gt 1 ] && echo " · shard $SHARD/$SHARDS of $TURN units") · logs in ${OUT#$ROOT/}${PREFIX:+ · copies named ${PREFIX}_*, ports +$(( 10000 + 1000 * (SLOT - 1) ))}"
exit $fail
