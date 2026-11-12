#!/usr/bin/env bash
# B122 (P-376 (8)): automatic flaky-suite handling, end to end on fixture suites (no app, no database, US$0):
# run-suites.sh --retry retries a failed suite once and lists it as "passed on retry" or "failed twice"; the nightly
# (no --retry) never retries; the summary's "retries:" line; flaky.mjs counts the records (daily-numbers.sh) and
# quarantines a suite that passed only on retry on 2 branches in 7 days, with an owner and a fix date; run-suites.sh
# skips that suite in PR and queue checks but runs it in the nightly set; CI passes --retry, the nightly does not.
# F5 (founder 6 Nov): a suite named or titled race/concurrent/parallel/upsert, or on the quarantine list, is never
# retried; a pass on retry writes a qa/BUGS.md-style bug line with the 1st try's log tail, which CI posts on the PR (or
# on each PR of a merge-queue batch); flaky.mjs fails open when the API fails.
#   bash product/tools/check-flaky.sh
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
T=ai-workers/problem-1-pathway-setup-and-form-filling/product/tools
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — $3"; fi; }
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT

# Fixture suites: ok passes, flaky fails its first try only (a counter per case), broken always fails, slow "times out".
fx_flaky_js() { echo 'const f=require("path").join(process.env.FX_STATE, require("path").basename(__filename)); const fs=require("fs"); const n=fs.existsSync(f)?Number(fs.readFileSync(f,"utf8")):0; fs.writeFileSync(f,String(n+1)); if(n===0){console.log("FAIL read ECONNRESET");process.exit(1)} console.log("PASS ok on try "+(n+1)); console.log("1 passed")'; }
fx() {  # fx <case> <suite...>: a fresh fixture folder holding only these suites
  local d="$W/$1"; mkdir -p "$d/tests" "$d/state"; shift
  for s in "$@"; do case "$s" in
    check_fx_ok*|check_dv_backbone_browser.cjs|check_screen01_api.ts) echo 'console.log("PASS fine"); console.log("1 passed")' ;;
    check_fx_flaky*) echo 'const f=require("path").join(process.env.FX_STATE, require("path").basename(__filename)); const fs=require("fs"); const n=fs.existsSync(f)?Number(fs.readFileSync(f,"utf8")):0; fs.writeFileSync(f,String(n+1)); if(n===0){console.log("FAIL read ECONNRESET");process.exit(1)} console.log("PASS ok on try "+(n+1)); console.log("1 passed")' ;;
    check_fx_broken*) echo 'const f=require("path").join(process.env.FX_STATE, require("path").basename(__filename)); const fs=require("fs"); const n=fs.existsSync(f)?Number(fs.readFileSync(f,"utf8")):0; fs.writeFileSync(f,String(n+1)); console.log("FAIL a real break"); process.exit(1)' ;;
    check_fx_slow*) echo 'console.log("STOP waited 20 min"); process.exit(124)' ;;
    check_fx_dbflaky*) printf '%s\n' '// reads process.env.DATABASE_URL (a plain suite on the shared demo database)' "$(fx_flaky_js)" ;;
    check_fx_ownflaky*) printf '%s\n' "//   tsx studio/tests/$s [port=4999] [name=fxown] (starts its own copy; DATABASE_URL)" "$(fx_flaky_js)" ;;
    check_fx_upsert_race*|check_d1_reset_to_six_browser.cjs) fx_flaky_js ;;   # F5: a race in its name; a hand-quarantined name
    check_fx_titled*) printf '%s\n' '// Two saves of one answer at once: the Concurrent path, where the loser must get a 409.' '// No browser, no model call.' "$(fx_flaky_js)" ;;
    check_fx_strict*) printf '%s\n' "'use strict';" '// Two writers at once: a race on the version number.' "$(fx_flaky_js)" ;;
    check_fx_failrace*) printf '%s\n' '// Uploads a document and reads it back.' 'const f=require("path").join(process.env.FX_STATE, require("path").basename(__filename)); const fs=require("fs"); const n=fs.existsSync(f)?Number(fs.readFileSync(f,"utf8")):0; fs.writeFileSync(f,String(n+1)); if(n===0){console.log("FAIL source-trust race: concurrent uploads gave 500");process.exit(1)} console.log("1 passed")' ;;
    check_fx_tracer*) printf '%s\n' '// Reads the trace of a release in its grace period; embraced edits, Bracelet, racetrack-free.' "$(fx_flaky_js)" ;;
    # b78 hang (6 Nov): a suite that waits for its stdin to end (it ends at once on /dev/null, never on an open pipe), and
    # a suite that ignores the TERM at the limit (only a KILL ends it). Each writes its pid, so the test can clean up.
    check_fx_stdin*) echo 'require("fs").writeFileSync(require("path").join(process.env.FX_STATE, "pid-stdin"), String(process.pid)); let n = 0; process.stdin.on("data", (d) => { n += d.length; }); process.stdin.on("end", () => { console.log("PASS stdin ended after " + n + " bytes"); console.log("1 passed"); process.exit(0); });' ;;
    check_fx_termproof*) echo 'require("fs").writeFileSync(require("path").join(process.env.FX_STATE, "pid-termproof"), String(process.pid)); process.on("SIGTERM", () => console.log("ignored a TERM")); console.log("11 passed, 0 failed"); setInterval(() => {}, 1000);' ;;
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
# F5: a pass on retry is never silent: a qa/BUGS.md-style bug line in the output (CI's job summary) and in retry-bugs.md.
BL='| QA-? | Bug · Major (proposed; CI retry, B122 F5) | `check_fx_flaky.cjs` · P-376 (8), F5 | commit '
ok "F5: a pass on retry prints a qa/BUGS.md-style bug line (7 columns, owner, Open)" "$(grep -F "$BL" "$W/flaky.out" | grep -F 'failed its 1st try (exit `1`: `FAIL read ECONNRESET`) and passed on retry' | grep -qF '| tech-lead | Open: qa rates it |' && [ "$(grep -F "$BL" "$W/flaky.out" | awk -F' [|] ' '{ print NF }')" = 7 ] && echo 1)" "$(grep -F 'QA-?' "$W/flaky.out")"
ok "F5: the bug line carries the 1st try's log tail, in a fenced block" "$(awk '/<summary>check_fx_flaky.cjs: 1st try, last 40 lines/ { s = 1 } s && /^FAIL read ECONNRESET$/ { f = 1 } END { exit !f }' "$W/flaky.out" && grep -q '^```text$' "$W/flaky.out" && echo 1)" "$(sed -n '/<details>/,/<\/details>/p' "$W/flaky.out")"
ok "F5: the same report is in retry-bugs.md (CI posts it as the PR comment)" "$(grep -qF "$BL" "$W/flaky/out/retry-bugs.md" && grep -q 'never silent' "$W/flaky/out/retry-bugs.md" && echo 1)" "$(cat "$W/flaky/out/retry-bugs.md" 2>&1 | head -3)"

# 2. A suite that always fails: retried once, "failed twice", the run fails (exit 1).
fx broken check_fx_broken.cjs
code=$(rs broken --retry)
ok "B122: a suite failing again is listed as failed twice" "$(row broken check_fx_broken.cjs | grep -q '| failed twice |' && [ "$(tries broken check_fx_broken.cjs)" = 2 ] && echo 1)" "$(row broken check_fx_broken.cjs)"
ok "B122: failed twice fails the run (exit 1)" "$([ "$code" = 1 ] && echo 1)" "exit $code"
ok "B122: a failed-twice record has both exit codes (1, 1)" "$(awk -F'\t' '$3 == "failed twice" && $4 == 1 && $5 == 1 { n++ } END { exit n != 1 }' "$W/broken/out/retries.tsv" && echo 1)" "$(cat "$W/broken/out/retries.tsv" 2>&1)"
ok "B122: the summary line lists failed twice" "$(grep -q '^retries: 1 · failed twice: check_fx_broken.cjs (' "$W/broken.out" && echo 1)" "$(grep '^retries' "$W/broken.out")"
ok "F5: failed twice (red already) writes no pass-on-retry bug line" "$(! grep -qF 'QA-?' "$W/broken.out" && [ ! -e "$W/broken/out/retry-bugs.md" ] && echo 1)" "$(grep -F 'QA-?' "$W/broken.out")"

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

# 5b. A retry must start fresh (review M2): a plain suite on the shared demo database is never retried; one that starts
# its own copy is.
fx db check_fx_dbflaky.cjs check_fx_ownflaky.cjs
code=$(rs db --retry)
ok "B122: a plain suite on the shared demo database is not retried (a first-run-only bug would pass on it)" "$(row db check_fx_dbflaky.cjs | grep -q '| FAIL |.*not retried: it runs on the shared demo database' && [ "$(tries db check_fx_dbflaky.cjs)" = 1 ] && [ "$code" = 1 ] && echo 1)" "exit $code; $(row db check_fx_dbflaky.cjs)"
ok "B122: a suite that starts its own copy is retried" "$(row db check_fx_ownflaky.cjs | grep -q '| passed on retry |' && echo 1)" "$(row db check_fx_ownflaky.cjs)"
# 5c. On a real isolated copy (where a database runs: CI part 1, a lane copy): the retry runs on a NEW copy, not the
# first try's. The fixture leaves a table behind on its first try and fails; its retry passes only if the table is gone.
if psql -h 127.0.0.1 -p 54329 -U xr_studio -d postgres -tAc 'select 1' >/dev/null 2>&1; then
  mkdir -p "$W/iso/tests" "$W/iso/state"
  cat > "$W/iso/tests/check_fx_iso.cjs" <<'JS'
// zsh studio/tools/isolated.sh fxretry 4466 start && node studio/tests/check_fx_iso.cjs 4466 xr_studio_fxretry
const { execFileSync } = require("child_process"); const fs = require("fs"); const path = require("path");
const [port, db] = process.argv.slice(2); const st = path.join(process.env.FX_STATE, "iso");
const n = fs.existsSync(st) ? Number(fs.readFileSync(st, "utf8")) : 0; fs.writeFileSync(st, String(n + 1));
const sql = (q) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", db, "-tAc", q], { encoding: "utf8" }).trim();
(async () => {
  const r = await fetch(`http://localhost:${port}/`).then((x) => x.status, (e) => "down " + e.message);
  console.log(`try ${n + 1}: copy on ${port} answers ${r}`);
  if (typeof r !== "number") { console.log("FAIL the copy is not up"); process.exit(1); }
  if (n === 0) { sql("create table fx_marker(x int)"); console.log("FAIL first try: left a table, then failed"); process.exit(1); }
  if (sql("select count(*) from information_schema.tables where table_name='fx_marker'") !== "0") { console.log("FAIL the retry ran on the first try's copy"); process.exit(1); }
  console.log("PASS the retry ran on a fresh copy"); console.log("1 passed");
})();
JS
  code=$(rs iso --retry)
  ok "B122: an isolated suite's retry runs on a fresh copy (new database), and the first try's api.log is kept" "$(row iso check_fx_iso.cjs | grep -q '| passed on retry |' && [ -s "$W/iso/out/check_fx_iso.try1-api.log" ] && [ "$code" = 0 ] && echo 1)" "exit $code; $(row iso check_fx_iso.cjs); $(tail -3 "$W/iso/out/check_fx_iso.log" 2>&1)"
  ok "B122: the copy is stopped after the retry (no database left)" "$([ -z "$(psql -h 127.0.0.1 -p 54329 -U xr_studio -d postgres -tAc "select datname from pg_database where datname = 'xr_studio_fxretry'")" ] && echo 1)" "xr_studio_fxretry left behind"
else echo "SKIP  B122: an isolated suite's retry runs on a fresh copy — no database on 127.0.0.1:54329 here (CI part 1 has one)"; fi

# 5d. F5: never retried, so a race fails on its 1st try as before: a race word in the file name, or in the title (the
# comment block at the top); a suite on the hand-set quarantine list (run without --skip-quarantined, as by hand) and
# one on the automatic list. "trace" is not a race: that suite is retried.
fx race check_fx_upsert_race.cjs check_fx_titled.cjs check_fx_tracer.cjs check_d1_reset_to_six_browser.cjs check_fx_flaky_auto.cjs check_fx_strict.cjs check_fx_failrace.cjs
code=$(SUITES_QUARANTINE_AUTO="check_fx_flaky_auto.cjs|forms|2026-11-12|101,102" SUITES_RETRY_MAX=9 rs race --retry)
ok "F5: a suite whose file name says race is not retried and fails the run" "$(row race check_fx_upsert_race.cjs | grep -q '| FAIL |.*not retried: its name, title or FAIL line says \"upsert\", and a pass on retry would hide a race (F5)' && [ "$(tries race check_fx_upsert_race.cjs)" = 1 ] && [ "$code" = 1 ] && echo 1)" "exit $code; $(row race check_fx_upsert_race.cjs)"
ok "F5: a suite whose title says concurrent is not retried" "$(row race check_fx_titled.cjs | grep -q '| FAIL |.*not retried: its name, title or FAIL line says \"concurrent\"' && [ "$(tries race check_fx_titled.cjs)" = 1 ] && echo 1)" "$(row race check_fx_titled.cjs)"
ok "F5: a title under a 'use strict' line is read too (review m5)" "$(row race check_fx_strict.cjs | grep -q '| FAIL |.*says \"race\"' && [ "$(tries race check_fx_strict.cjs)" = 1 ] && echo 1)" "$(row race check_fx_strict.cjs)"
ok "F5 (review Major 2): a neutral title whose 1st try FAILs on a race is not retried (check_screen01_api.ts's source-trust race)" "$(row race check_fx_failrace.cjs | grep -q '| FAIL |.*not retried: its name, title or FAIL line says \"race\"' && [ "$(tries race check_fx_failrace.cjs)" = 1 ] && echo 1)" "$(row race check_fx_failrace.cjs)"
ok "F5: a suite on the hand-set quarantine list is not retried (when run at all)" "$(row race check_d1_reset_to_six_browser.cjs | grep -q '| FAIL |.*not retried: on the quarantine list (F5)' && [ "$(tries race check_d1_reset_to_six_browser.cjs)" = 1 ] && echo 1)" "$(row race check_d1_reset_to_six_browser.cjs)"
ok "F5: a suite on the automatic quarantine list is not retried (when run at all)" "$(row race check_fx_flaky_auto.cjs | grep -q '| FAIL |.*not retried: on the quarantine list (F5)' && [ "$(tries race check_fx_flaky_auto.cjs)" = 1 ] && echo 1)" "$(row race check_fx_flaky_auto.cjs)"
ok "F5: \"trace\"/\"grace\" are not a race: that suite is retried" "$(row race check_fx_tracer.cjs | grep -q '| passed on retry |' && echo 1)" "$(row race check_fx_tracer.cjs)"
ok "F5: only the one real retry is recorded" "$(awk -F'\t' 'END { exit !(NR == 1) } $2 != "check_fx_tracer.cjs" { exit 1 }' "$W/race/out/retries.tsv" && echo 1)" "$(cat "$W/race/out/retries.tsv" 2>&1)"

# 5e. F5: the comment reaches the PR. A local stand-in for the API records each POST: a PR's own check posts on the PR;
# a merge-queue batch posts on each PR of the batch (Mergify's metadata), never on a PR queued ahead. An API that fails
# never fails the check: comment and quarantine exit 2 (CI: continue-on-error), quarantine prints no list.
cat > "$W/api.cjs" <<'JS'
const http = require("http"), fs = require("fs");
http.createServer((q, r) => { let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => {
  fs.appendFileSync(process.argv[2], JSON.stringify({ m: q.method, u: q.url, a: q.headers.authorization || "", b }) + "\n");
  r.writeHead(201, { "content-type": "application/json" }); r.end("{}"); }); }).listen(0, "127.0.0.1", function () { fs.writeFileSync(process.argv[3], String(this.address().port)); });
JS
node "$W/api.cjs" "$W/posts.jsonl" "$W/api.port" & APIPID=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do [ -s "$W/api.port" ] && break; sleep 0.2; done
API="http://127.0.0.1:$(cat "$W/api.port" 2>/dev/null)"
FL="$T/flaky.mjs"; BODY="$W/flaky/out/retry-bugs.md"
GITHUB_TOKEN=tok-x GITHUB_REPOSITORY=o/r GITHUB_API_URL="$API" node "$FL" comment --body "$BODY" --pr 1145 2> "$W/c1.err"; c1=$?
ok "F5: a PR's check posts the bug line on that PR, with the token in a header" "$([ "$c1" = 0 ] && node -e 'const l=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").map(JSON.parse); const p=l[0]; process.exit(l.length===1 && p.m==="POST" && p.u==="/repos/o/r/issues/1145/comments" && p.a==="Bearer tok-x" && JSON.parse(p.b).body.includes("check_fx_flaky.cjs") && JSON.parse(p.b).body.includes("FAIL read ECONNRESET") ? 0 : 1)' "$W/posts.jsonl" && echo 1)" "exit $c1; $(cat "$W/c1.err" "$W/posts.jsonl" 2>&1 | cut -c1-200)"
: > "$W/posts.jsonl"
MB=$(printf '%s\n' 'Mergify opened it to test [#1168](/o/r/pull/1168).' '### Queued ahead of this batch' '- [#1158](/o/r/pull/1158)' '```yaml' '---' 'checking_base_sha: efc87e0' 'pull_requests:' '  - number: 1168' '    scopes: []' '  - number: 1171' '    scopes: []' 'scopes: []' '...' '```')
PR_BODY="$MB" GITHUB_TOKEN=tok-x GITHUB_REPOSITORY=o/r GITHUB_API_URL="$API" node "$FL" comment --body "$BODY" --pr 1170 --queue 2> "$W/c2.err"; c2=$?
ok "F5: a merge-queue batch posts on each PR of the batch (not the one queued ahead, not the batch), naming the batch" "$([ "$c2" = 0 ] && node -e 'const l=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").map(JSON.parse); const u=l.map(p=>p.u).sort().join(" "); process.exit(u==="/repos/o/r/issues/1168/comments /repos/o/r/issues/1171/comments" && l.every(p=>JSON.parse(p.b).body.startsWith("Found in merge-queue batch #1170, which holds #1168, #1171.")) ? 0 : 1)' "$W/posts.jsonl" && echo 1)" "exit $c2; $(cat "$W/c2.err" "$W/posts.jsonl" 2>&1 | cut -c1-200)"
: > "$W/posts.jsonl"; : > "$W/empty.md"
GITHUB_TOKEN=tok-x GITHUB_REPOSITORY=o/r GITHUB_API_URL="$API" node "$FL" comment --body "$W/empty.md" --pr 1145 2>/dev/null; c3=$?
ok "F5: nothing passed on retry: nothing is posted" "$([ "$c3" = 0 ] && [ ! -s "$W/posts.jsonl" ] && echo 1)" "exit $c3; $(cat "$W/posts.jsonl")"
kill "$APIPID" 2>/dev/null; wait "$APIPID" 2>/dev/null
DEAD="http://127.0.0.1:9"
GITHUB_TOKEN=tok-x GITHUB_REPOSITORY=o/r GITHUB_API_URL="$DEAD" timeout 60 node "$FL" comment --body "$BODY" --pr 1145 > /dev/null 2> "$W/c4.err"; c4=$?
ok "F5: the comment fails open when the API is down (exit 2, said on stderr; CI's step is continue-on-error)" "$([ "$c4" = 2 ] && grep -q '^flaky.mjs: ' "$W/c4.err" && echo 1)" "exit $c4; $(cat "$W/c4.err" | head -2)"
qd=$(GITHUB_TOKEN=tok-x GITHUB_REPOSITORY=o/r GITHUB_API_URL="$DEAD" timeout 60 node "$FL" quarantine 2> "$W/q4.err"); q4=$?
ok "F5: quarantine still fails open when the API is down (exit 2, no list: no automatic quarantine this run)" "$([ "$q4" = 2 ] && [ -z "$qd" ] && echo 1)" "exit $q4; stdout '$qd'; $(head -2 "$W/q4.err")"

# 5f. A pass on retry is never remembered green by CI memory (P-371 (3), tools/ci-memory.mjs): the next push runs it again.
if [ -f "$T/ci-memory.mjs" ]; then
  printf '%s\n' '| Suite | Result | Time | Last line |' '|---|---|---|---|' '| check_fx_ok.cjs | PASS | 1 s | 1 passed |' '| check_fx_flaky.cjs | passed on retry | 2 s | 1 passed · 1st try exit 1: FAIL read ECONNRESET |' > "$W/mem-suites.md"
  node "$T/ci-memory.mjs" record --suites "$W/mem-suites.md" --base "$(printf 'a%.0s' {1..40})" --head "$(printf 'b%.0s' {1..40})" --run 1 --attempt 1 --out "$W/mem.tsv" > /dev/null 2>&1; mc=$?
  ok "F5: CI memory never remembers a pass on retry as green (it runs again on the next push)" "$([ "$mc" = 0 ] && grep -qx $'check_fx_ok.cjs\tPASS' "$W/mem.tsv" && ! grep -q check_fx_flaky "$W/mem.tsv" && echo 1)" "exit $mc; $(cat "$W/mem.tsv" 2>&1)"
fi

# 6. The 7-day count and the quarantine rule (flaky.mjs), on fixed records; NOW is 6 Nov 12:00 UTC.
NOW=2026-11-06T12:00:00Z; E="$W/events.tsv"; L="$W/ledger.tsv"
cp "$T/flaky-ledger.tsv" "$L"
rec() { printf '%s\t%s\t%s\t1\t%s\tabc1234\t%s\t%s\n' "$1" "$2" "$3" "$([ "$3" = "passed on retry" ] && echo 0 || echo 1)" "$4" "$5"; }
{ rec 2026-11-01T10:00:00Z check_forms_x_browser.cjs "passed on retry" 101 claude/forms-a
  rec 2026-11-05T09:00:00Z check_forms_x_browser.cjs "passed on retry" 102 mergify/merge-queue/m2-1
  rec 2026-11-04T10:00:00Z check_same_run.ts "passed on retry" 103 claude/runtime-b
  rec 2026-11-05T10:00:00Z check_same_run.ts "passed on retry" 103 claude/runtime-b
  rec 2026-10-30T09:00:00Z check_held.ts "passed on retry" 120 claude/screens-j
  rec 2026-11-05T09:00:00Z check_held.ts "passed on retry" 121 claude/screens-k
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
ok "B122: passed only on retry in 2 runs within 7 days → quarantined, owner from the ledger, fix date = newest + 7 days" "$([ "$qc" = 0 ] && grep -qx 'check_forms_x_browser.cjs|forms|2026-11-12|101,102' <<< "$(tr ' ' '\n' <<< "$q")" && echo 1)" "exit $qc: $q"
ok "B122: one run counted twice (a re-run attempt) is one run, not two" "$([[ "$q" != *check_same_run* ]] && echo 1)" "$q"
ok "B122: held until its fix date after the older retry leaves the window (review M1: retries 30 Oct and 5 Nov, now 6 Nov)" "$(grep -qx 'check_held.ts|tech-lead|2026-11-12|120,121' <<< "$(tr ' ' '\n' <<< "$q")" && echo 1)" "$q"
qh=$(node "$T/flaky.mjs" quarantine --now 2026-11-12T08:00:00Z --events "$E" --ledger "$L" 2>/dev/null)
ok "B122: still held the morning of its fix date, 12 Nov 08:00 UTC" "$([[ "$qh" == *check_held.ts* ]] && echo 1)" "$qh"
ok "B122: a retry older than 7 days does not count" "$([[ "$q" != *check_old* ]] && echo 1)" "$q"
ok "B122: failed twice is a real failure, never a reason to quarantine" "$([[ "$q" != *check_really_broken* ]] && echo 1)" "$q"
ok "B122: retries before a release line (a fix landed) do not count" "$([[ "$q" != *check_released* ]] && echo 1)" "$q"
ok "B122: one retry is not enough" "$([[ "$q" != *check_g4_tests_tab* ]] && echo 1)" "$q"
ok "B122: exactly two suites quarantined, and stderr says why with owner and fix date" "$([ "$(wc -w <<< "$q")" = 2 ] && grep -q 'quarantined: check_forms_x_browser.cjs passed only on retry in 2 runs within 7 days (runs 101, 102); owner forms; fix by 2026-11-12' "$W/q.err" && echo 1)" "$q / $(cat "$W/q.err")"
q2=$(node "$T/flaky.mjs" quarantine --now 2026-11-13T00:00:00Z --events "$E" --ledger "$L" 2>/dev/null)
ok "B122: after its fix date the suite comes back by itself" "$([[ "$q2" != *check_forms_x_browser* && "$q2" != *check_held* ]] && echo 1)" "$q2"
c=$(node "$T/flaky.mjs" count --since 2026-11-05T00:00:00Z --now "$NOW" --events "$E")
ok "B122: count (daily-numbers.sh) since 5 Nov 00:00 UTC: 7 retries, 6 passed on retry, 1 failed twice" "$([ "$c" = "retries=7 passed_on_retry=6 failed_twice=1" ] && echo 1)" "$c"
cj=$(node "$T/flaky.mjs" count --since 2026-11-05T00:00:00Z --now "$NOW" --events "$E" --json)
ok "B122: count --json for scripts" "$([ "$cj" = '{"retries":7,"passed_on_retry":6,"failed_twice":1}' ] && echo 1)" "$cj"
node "$T/flaky.mjs" --self-test > "$W/self.out" 2>&1; sc=$?
ok "B122: flaky.mjs self-test (fork artifacts never count; bad records and ledger lines refused)" "$([ "$sc" = 0 ] && echo 1)" "$(grep FAIL "$W/self.out")"
node "$T/flaky.mjs" quarantine --ledger "$T/flaky-ledger.tsv" --events /dev/null > /dev/null 2>&1
ok "B122: the committed ledger reads" "$([ $? = 0 ] && echo 1)" "flaky-ledger.tsv did not parse"

# 7. run-suites.sh takes the rule's output: a quarantined suite is skipped in PR and queue checks (row names owner and
# fix date) and still runs in the nightly set; a malformed entry is ignored, never run blind.
fx q check_fx_broken.cjs check_fx_ok.cjs
code=$(SUITES_QUARANTINE_AUTO="check_fx_broken.cjs|forms|2026-11-12|101,102 ../evil|x|y|z" rs q --retry --skip-quarantined)
ok "B122: an automatically quarantined suite is skipped in a queue check, its row naming owner and fix date" "$(row q check_fx_broken.cjs | grep -q '| quarantined | | passed only on retry in 2+ runs in 7 days (runs 101, 102): owner forms, back on 2026-11-12' && [ "$(tries q check_fx_broken.cjs)" = 0 ] && [ "$code" = 0 ] && echo 1)" "exit $code; $(row q check_fx_broken.cjs)"
ok "B122: a malformed SUITES_QUARANTINE_AUTO entry is named and ignored" "$(grep -q 'ignored the malformed entry "../evil|x|y|z"' "$W/q.err" && echo 1)" "$(cat "$W/q.err")"
fx qn check_fx_broken.cjs
code=$(SUITES_QUARANTINE_AUTO="check_fx_broken.cjs|forms|2026-11-12|101,102" rs qn)
ok "B122: the nightly set still runs an automatically quarantined suite" "$(row qn check_fx_broken.cjs | grep -q '| FAIL |' && [ "$code" = 1 ] && echo 1)" "exit $code; $(row qn check_fx_broken.cjs)"

# 7b. Every part deals the same suites: with the same SUITES_QUARANTINE_AUTO, parts 1/2 and 2/2 run each other suite
# once between them and never the quarantined one.
fx sh check_fx_ok_a.cjs check_fx_ok_b.cjs check_fx_ok_c.cjs check_fx_ok_d.cjs check_fx_broken.cjs
AQ="check_fx_broken.cjs|forms|2026-11-12|101,102"
c1=$(SUITES_QUARANTINE_AUTO="$AQ" rs sh --retry --skip-quarantined --shard 1/2); cp "$W/sh.out" "$W/sh1.out"
c2=$(SUITES_QUARANTINE_AUTO="$AQ" rs sh --retry --skip-quarantined --shard 2/2)
ran=$(cat "$W/sh1.out" "$W/sh.out" | grep -E '^\| check_fx_ok_[a-d]\.cjs \| PASS' | cut -d'|' -f2 | sort | tr -d ' ' | tr '\n' ' ')
ok "B122: two parts with the same automatic quarantine run every other suite exactly once and skip the quarantined one" "$([ "$ran" = "check_fx_ok_a.cjs check_fx_ok_b.cjs check_fx_ok_c.cjs check_fx_ok_d.cjs " ] && [ "$(tries sh check_fx_broken.cjs)" = 0 ] && [ "$c1$c2" = 00 ] && echo 1)" "exits $c1 $c2; ran: $ran"

# 7d. #1660 (12 Nov, CI shard 6/6 red: "| (none) | FAIL | | suites were chosen but none ran |"): a shard dealt no unit
# passes and says so; a shard dealt only quarantined units gives their rows and passes; a choice that runs nothing
# without shards still fails; a unit dealt to a shard that leaves no row fails. The choice comes from --changed over a
# synthetic one-file commit (a root note): the selector then picks its smoke set, as in a PR check. Of it, this folder
# holds check_dv_backbone_browser.cjs (9 s in suite-times.tsv) and check_screen01_api.ts (quarantined: weight 0), so
# with 3 shards the deal is dv_backbone → 1, screen01_api → 2 (the first least-loaded), nothing → 3. Review m1: a
# sharded choice that deals no unit at all (TURN 0: nothing chosen exists) is still a FAIL on every shard.
SB=$(git rev-parse HEAD); SBLOB=$(printf 'check-flaky fixture\n' | git hash-object -w --stdin)
GIT_INDEX_FILE="$W/idx" git read-tree "$SB" && GIT_INDEX_FILE="$W/idx" git update-index --add --cacheinfo "100644,$SBLOB,zz-check-flaky-fixture.md"
SH=$(GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.com GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.com \
  git -c commit.gpgsign=false commit-tree "$(GIT_INDEX_FILE="$W/idx" git write-tree)" -p "$SB" -m "check-flaky fixture: one root note")
# Review m2, m3: the synthetic commit exists, and the deal's three givens hold (each run clears CI's live automatic
# quarantine, review M1: it could list dv_backbone and empty the deal). A change to any given fails loudly here.
[ -n "$SH" ] || ok "#1660 set-up: the synthetic commit was made" 0 "git commit-tree gave nothing"
dvt=$(awk -F'\t' '$1 == "check_dv_backbone_browser.cjs" { print $2 }' "$T/suite-times.tsv")
ok "#1660 set-up: dv_backbone has a time above 0 s, screen01_api is on the static QUARANTINE list, both in the smoke set" "$([ "${dvt:-0}" -gt 0 ] && grep -qE '^QUARANTINE=".*check_screen01_api\.ts' "$T/run-suites.sh" && printf 'zz.md\n' | node "$T/select-suites.mjs" | grep -q '^check_dv_backbone_browser.cjs.smoke' && printf 'zz.md\n' | node "$T/select-suites.mjs" | grep -q '^check_screen01_api.ts.smoke' && echo 1)" "dv_backbone ${dvt:-none} s; the quarantine list or the smoke set changed: rework 7d's fixture"
srow() { grep -E '^\| [^|]+ \| (PASS|FAIL|quarantined|skipped|remembered|passed on retry|failed twice) \|' "$1" | tr '\n' ' '; }   # result rows only
fx sz check_dv_backbone_browser.cjs check_screen01_api.ts check_fx_ok.cjs
sz1=$(SUITES_QUARANTINE_AUTO= rs sz --changed "$SB..$SH" --shard 1/3); cp "$W/sz.out" "$W/sz1.out"
sz2=$(SUITES_QUARANTINE_AUTO= rs sz --changed "$SB..$SH" --shard 2/3); cp "$W/sz.out" "$W/sz2.out"
sz3=$(SUITES_QUARANTINE_AUTO= rs sz --changed "$SB..$SH" --shard 3/3); cp "$W/sz.out" "$W/sz3.out"
ok "#1660: the deal's shard 1/3 runs the timed suite" "$(grep -qE '^\| check_dv_backbone_browser\.cjs \| PASS \|' "$W/sz1.out" && [ "$sz1" = 0 ] && echo 1)" "exit $sz1; $(srow "$W/sz1.out")"
ok "#1660: shard 2/3, dealt only a quarantined unit, gives its quarantined row and passes" "$(grep -qE '^\| check_screen01_api\.ts \| quarantined \|' "$W/sz2.out" && ! grep -q '(none)' "$W/sz2.out" && [ "$sz2" = 0 ] && echo 1)" "exit $sz2; $(srow "$W/sz2.out")"
ok "#1660 fail-before: shard 3/3, dealt no unit, says so and passes (main failed it: \"suites were chosen but none ran\")" "$(grep -qF '| (none) | PASS | | 2 chosen units, none dealt to shard 3/3 |' "$W/sz3.out" && [ "$sz3" = 0 ] && echo 1)" "exit $sz3; $(srow "$W/sz3.out")"
fx sznone check_fx_ok.cjs
c=$(SUITES_QUARANTINE_AUTO= rs sznone --changed "$SB..$SH")
ok "#1660: without shards, a choice that runs nothing still fails (a real fault)" "$(grep -qF '| (none) | FAIL | | suites were chosen but none ran |' "$W/sznone.out" && [ "$c" = 1 ] && echo 1)" "exit $c; $(srow "$W/sznone.out")"
NOROW="$W/run-suites.norow.sh"
sed 's/{ rows+=("| \$f | quarantined | | \$(qwhy "\$f") |"); continue; }/continue/' "$T/run-suites.sh" > "$NOROW"
fx szt0 check_fx_ok.cjs
c=$(SUITES_QUARANTINE_AUTO= rs szt0 --changed "$SB..$SH" --shard 2/3)
ok "#1660 (review m1): sharded, with no chosen unit at all (0 units), a shard still fails: chosen but none ran" "$(grep -qF '| (none) | FAIL | | suites were chosen but none ran |' "$W/szt0.out" && [ "$c" = 1 ] && echo 1)" "exit $c; $(srow "$W/szt0.out")"
ok "#1660: the no-row runner copy for the next check really drops the quarantined row" "$(! grep -q '| quarantined |' "$NOROW" && grep -q 'left no row' "$NOROW" && echo 1)" "sed changed nothing"
c=$(SUITES_QUARANTINE_AUTO= CI= COPY_PREFIX= SUITES_LOCKS="$W/locks" SUITES_TESTS_DIR="$W/sz/tests" SUITES_OUT="$W/sz/out" FX_STATE="$W/sz/state" bash "$NOROW" --changed "$SB..$SH" --shard 2/3 > "$W/szn.out" 2>&1; echo $?)
ok "#1660: a unit dealt to a shard that leaves no row fails, by name" "$(grep -qF '| check_screen01_api.ts | FAIL | | dealt to shard 2/3 but left no row (ran, quarantined or skipped) |' "$W/szn.out" && [ "$c" = 1 ] && echo 1)" "exit $c; $(srow "$W/szn.out")"

# 7c. The b78 hang (6 Nov): the runner gives every suite /dev/null as stdin and timeout -k, and writes a hung suite's
# processes to its log. Each case runs under an outer limit, on this runner and on a copy with main's old plain
# `timeout <limit> "$@" > "$log"` (the suite inherits the runner's stdin, no -k): the old one fails, this one passes.
OLD="$W/run-suites.plain.sh"
sed 's|^  if guarded "\$log" "\$@"; then st=PASS;|  if "$TIMEOUT" "$LIMIT" "$@" > "$log" 2>\&1; then st=PASS;|' "$T/run-suites.sh" > "$OLD"
ok "b78: the old-runner copy for the fail test really has the plain timeout" "$(grep -q '^  if "\$TIMEOUT" "\$LIMIT" "\$@" > "\$log" 2>&1; then st=PASS;' "$OLD" && echo 1)" "sed found no guarded line"
rsx() {  # rsx <runner> <case> <outer limit s> [args]: like rs, stdin a pipe that stays open, never written; exit code echoed
  local r="$1" c="$2" lim="$3" fifo="$W/$2.fifo"; shift 3; mkfifo "$fifo"; exec 7<>"$fifo"
  CI= COPY_PREFIX= SUITES_LOCKS="$W/locks" SUITES_TESTS_DIR="$W/$c/tests" SUITES_OUT="$W/$c/out" FX_STATE="$W/$c/state" \
    SUITES_TIMEOUT=4 SUITES_KILL_AFTER=2 timeout -k 2 "$lim" bash "$r" "$@" <&7 > "$W/$c.out" 2> "$W/$c.err"; local code=$?
  exec 7>&-; rm -f "$fifo"; for p in "$W/$c/state"/pid-*; do [ -f "$p" ] && kill -9 "$(cat "$p")" 2>/dev/null; done; echo "$code"; }
fx stdin_old check_fx_stdin.cjs; code=$(rsx "$OLD" stdin_old 30)
ok "b78 fail test: on the old runner a suite waiting on stdin (an open pipe) runs into the limit" "$(row stdin_old check_fx_stdin.cjs | grep -q '| FAIL |.*exit 124' && echo 1)" "exit $code; $(row stdin_old check_fx_stdin.cjs)"
fx stdin check_fx_stdin.cjs; t0=$SECONDS; code=$(rsx "$T/run-suites.sh" stdin 30)
ok "b78: this runner gives the suite /dev/null, so it ends at once and passes" "$(row stdin check_fx_stdin.cjs | grep -q '| PASS |.*1 passed' && [ "$code" = 0 ] && [ $((SECONDS - t0)) -lt 4 ] && echo 1)" "exit $code in $((SECONDS - t0)) s; $(row stdin check_fx_stdin.cjs)"
fx term_old check_fx_termproof.cjs; code=$(rsx "$OLD" term_old 15)
ok "b78 fail test: on the old runner a suite ignoring the TERM never ends (the outer limit stops the whole run, no row)" "$([ "$code" = 124 ] && ! row term_old check_fx_termproof.cjs >/dev/null && echo 1)" "exit $code; $(row term_old check_fx_termproof.cjs)"
fx term check_fx_termproof.cjs; t0=$SECONDS; code=$(rsx "$T/run-suites.sh" term 30)
ok "b78: this runner kills a suite ignoring the TERM (-k), gives its row and fails the run" "$(row term check_fx_termproof.cjs | grep -q '| FAIL |.*exit 137: STOP still running at the 4 s limit' && [ "$code" = 1 ] && [ $((SECONDS - t0)) -lt 12 ] && echo 1)" "exit $code in $((SECONDS - t0)) s; $(row term check_fx_termproof.cjs)"
ok "b78: the hung suite's log names its processes (pid, state, wait channel, command) under the STOP line" "$(grep -A3 '^STOP still running at the 4 s limit' "$W/term/out/check_fx_termproof.log" | grep -q 'check_fx_termproof.cjs' && echo 1)" "$(head -8 "$W/term/out/check_fx_termproof.log" 2>&1)"
fx termr check_fx_termproof.cjs; code=$(rsx "$T/run-suites.sh" termr 30 --retry)
ok "b78: a suite killed at the limit (exit 137) counts as timed out: not retried" "$(row termr check_fx_termproof.cjs | grep -q 'timed out at 4 s, not retried' && [ ! -e "$W/termr/out/retries.tsv" ] && echo 1)" "$(row termr check_fx_termproof.cjs)"
ok "b78 (review minor 2): R1's set-up script runs guarded too" "$(grep -q 'guarded "\$OUT/setup_visitor_visa.log" \$TSX' "$T/run-suites.sh" && echo 1)" "$(grep -n setup_visitor_visa "$T/run-suites.sh")"
ok "b78: run-suites.sh never runs a suite under a plain timeout" "$(! grep -nE '"\$TIMEOUT" ' "$T/run-suites.sh" | grep -vE -- '"\$TIMEOUT" (-k |\])' | grep -q . && echo 1)" "$(grep -nE '"\$TIMEOUT" ' "$T/run-suites.sh")"

# 8. Wiring: CI's PR and queue checks pass --retry and the rule's list; the nightly never retries.
CIY=.github/workflows/ci.yml; NY=.github/workflows/nightly.yml
ok "B122: ci.yml's parts run run-suites.sh --retry with SUITES_QUARANTINE_AUTO from the kind job" "$(grep -q 'run-suites.sh" --demo --retry' "$CIY" && grep -q 'SUITES_QUARANTINE_AUTO: \${{ needs.kind.outputs.autoq }}' "$CIY" && grep -q 'flaky.mjs" quarantine' "$CIY" && echo 1)" "wiring missing in ci.yml"
ok "B122: ci.yml uploads retries.tsv and the first tries' logs as suite-retries-<part>" "$(grep -q 'name: suite-retries-\${{ matrix.shard }}' "$CIY" && grep -q 'var/suites/\*.try1\*.log' "$CIY" && echo 1)" "upload missing"
ok "B122: the quarantine step cannot fail or stall the check (time limit, continue-on-error)" "$(grep -A3 'flaky suites to quarantine' "$CIY" | grep -q . && awk '/id: q$/,/autoq=/' "$CIY" | grep -q 'timeout-minutes: 3' && awk '/id: q$/,/autoq=/' "$CIY" | grep -q 'continue-on-error: true' && echo 1)" "no limit on the q step"
ok "B122: the nightly never passes --retry" "$(! grep -q -- '--retry' "$NY" && echo 1)" "nightly.yml has --retry"
ok "B122 (round 2, minor 2): the kind job reads all 9 parts' records, whatever SHARDS is now" "$(grep -q 'flaky.mjs" quarantine 2> flaky.err' "$CIY" && ! grep -q 'quarantine --parts' "$CIY" && echo 1)" "$(grep 'flaky.mjs" quarantine' "$CIY")"
RC=$(awk '/^  retry-comment:/ { s = 1; print; next } s && /^  [a-z]/ { exit } s' "$CIY")
ok "F5: the parts upload retry-bugs.md with the retry records (the Mac path is gone, D1)" "$([ "$(grep -c 'var/suites/retry-bugs.md$' "$CIY")" = 1 ] && echo 1)" "$(grep -n 'retry-bugs' "$CIY")"
ok "F5: the job retry-comment posts it on the PR, never failing the run (continue-on-error, a time limit, after every part)" "$(grep -q 'needs: \[kind, shard, ci\]' <<< "$RC" && grep -q 'continue-on-error: true' <<< "$RC" && grep -q 'timeout-minutes: 5' <<< "$RC" && grep -q 'pattern: "suite-retries-\*"' <<< "$RC" && grep -q 'flaky.mjs comment --body retry-bugs.md --pr "$PR"' <<< "$RC" && echo 1)" "$RC"
JOB() { awk -v j="  $1:" '$0 == j { s = 1; print; next } s && /^  [a-z]/ { exit } s' "$CIY"; }
ok "F5 (review Major 1): the jobs that run the suites (shard, ci) hold no write token; retry-comment does, and runs the base commit's code with no kept token" "$(! JOB shard | grep -qE 'permissions:.*write' && ! JOB ci | grep -qE 'permissions:.*write' && grep -q 'permissions: { contents: read, pull-requests: write }' <<< "$RC" && grep -q 'ref: \${{ github.event.pull_request.base.sha }}' <<< "$RC" && grep -q 'persist-credentials: false' <<< "$RC" && grep -q 'node base/ai-workers/' <<< "$RC" && ! grep -qE 'npm|run-suites|cloud-setup' <<< "$RC" && echo 1)" "$(grep -n 'pull-requests' "$CIY")"

echo "$pass passed, $fail failed"
exit $((fail > 0))
