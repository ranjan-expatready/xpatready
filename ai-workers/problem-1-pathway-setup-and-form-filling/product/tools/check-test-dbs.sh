#!/usr/bin/env bash
# Test databases are cleaned up (3 Nov: 977 left-over xr_studio_* databases, 13 GB, on the Mac):
#   1. isolated.sh start → stop leaves no database and no var/isolated-<name> behind (its api.log is kept aside);
#      ISOLATED_KEEP=1 keeps both.
#   2. prune-test-dbs.sh's dry run lists stale copies and drops nothing; --yes drops only those: never one in use, changed
#      in the last 3 h, containing "demo" or in PRUNE_KEEP. It only ever looks at this check's own xr_studio_chk_* names.
# Needs the studio's PostgreSQL running (start.sh, or cloud-setup.sh in CI) and starts one API copy. US$0.
#   bash product/tools/check-test-dbs.sh
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
S="$ROOT/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio"
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
PG=(-h 127.0.0.1 -p 54329 -U xr_studio)
pass=0; fail=0
ok() { if [ "$2" = 1 ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — $3"; fi; }
q() { psql "${PG[@]}" -d postgres -XAtq -c "$1"; }
q "select 1" >/dev/null 2>&1 || { echo "PostgreSQL is not answering on 54329 (start.sh or cloud-setup.sh first); nothing was checked"; exit 2; }
exists() { [ "$(q "select count(*) from pg_database where datname = '$1'")" = 1 ]; }
cleanup() { for d in $(q "select datname from pg_database where datname like 'xr\_studio\_chk\_%'"); do dropdb "${PG[@]}" --if-exists --force "$d" >/dev/null 2>&1; done
  [ -n "${SLEEPER:-}" ] && kill "$SLEEPER" 2>/dev/null; zsh "$S/tools/isolated.sh" chk_iso 24987 stop >/dev/null 2>&1
  zsh "$S/tools/isolated.sh" chk_live 24988 stop >/dev/null 2>&1; rm -f "$S/var/isolated-logs/chk_iso-api.log" "$S/var/isolated-logs/chk_live-api.log"; true; }
trap cleanup EXIT; cleanup; rm -f "$S/var/isolated-logs/chk_iso-api.log"

# ---- 1. start → stop
zsh "$S/tools/isolated.sh" chk_iso 24987 start >/dev/null 2>&1
ok "start makes the copy's database and files" "$(exists xr_studio_chk_iso && [ -d "$S/var/isolated-chk_iso" ] && echo 1)" "no database or folder after start"
ISOLATED_KEEP=1 zsh "$S/tools/isolated.sh" chk_iso 24987 stop >/dev/null 2>&1
ok "ISOLATED_KEEP=1 stop keeps them (for looking into a failure)" "$(exists xr_studio_chk_iso && [ -d "$S/var/isolated-chk_iso" ] && echo 1)" "removed despite ISOLATED_KEEP=1"
zsh "$S/tools/isolated.sh" chk_iso 24987 start >/dev/null 2>&1
ok "a second start makes them again (so the stop lines below test something; #745 review m3)" "$(exists xr_studio_chk_iso && [ -d "$S/var/isolated-chk_iso" ] && echo 1)" "start failed"
ok "start records its server on the database (pid, port, host)" "$(q "select shobj_description(oid, 'pg_database') from pg_database where datname = 'xr_studio_chk_iso'" | grep -qE 'server pid [0-9]+ port 24987 host ' && echo 1)" "no record"
out=$(zsh "$S/tools/isolated.sh" chk_iso 24987 stop 2>&1)
ok "stop drops the copy's database" "$(! exists xr_studio_chk_iso && echo 1)" "still there: $out"
ok "stop removes var/isolated-<name>" "$([ ! -e "$S/var/isolated-chk_iso" ] && echo 1)" "folder left"
ok "stop keeps the api.log aside (var/isolated-logs/<name>-api.log)" "$([ -s "$S/var/isolated-logs/chk_iso-api.log" ] && echo 1)" "no log kept: $out"
out=$(zsh "$S/tools/isolated.sh" chk_iso 24987 stop 2>&1); code=$?
ok "a second stop of a copy already gone exits 0" "$([ "$code" = 0 ] && echo 1)" "exit $code: $out"
out=$(zsh "$S/tools/isolated.sh" demo 24987 stop 2>&1); code=$?
ok "stop never touches the demo (name refused)" "$([ "$code" != 0 ] && exists xr_studio_demo && echo 1)" "exit $code: $out"

# ---- 1b. #745 review: a running copy whose pool has closed its connections, and a stop given the wrong port
zsh "$S/tools/isolated.sh" chk_live 24988 start >/dev/null 2>&1
ok "a live copy for the next cases started" "$(exists xr_studio_chk_live && curl -s -o /dev/null localhost:24988/api/session && echo 1)" "did not start"
out=$(zsh "$S/tools/isolated.sh" chk_live 24989 stop 2>&1)
ok "stop given the wrong port keeps the database of a copy whose server still runs (m2)" "$(exists xr_studio_chk_live && curl -s -o /dev/null localhost:24988/api/session && echo 1)" "$out"

# ---- 2. prune: four old databases and one fresh, with this check's own prefix only
for d in old busy demo_old keep fresh; do createdb "${PG[@]}" "xr_studio_chk_$d"; done
q "checkpoint" >/dev/null
DATA=$(q "show data_directory")
age() {  # $1 database: its data files to 4 hours ago (as a copy left by a run killed this morning)
  local oid; oid=$(q "select oid from pg_database where datname = '$1'")
  find "$DATA/base/$oid" -type f -print0 | xargs -0 node -e 'const fs=require("fs"),t=Date.now()/1000-4*3600; for (const f of process.argv.slice(1)) fs.utimesSync(f,t,t)'
}
for d in old busy demo_old keep live; do age "xr_studio_chk_$d"; done
# The live copy's server is idle: no connection left (its pool closes them after 10 s; ended here at once).
q "select pg_terminate_backend(pid) from pg_stat_activity where datname = 'xr_studio_chk_live'" >/dev/null
psql "${PG[@]}" -d xr_studio_chk_busy -XAtq -c "select pg_sleep(60)" >/dev/null 2>&1 & SLEEPER=$!
for i in 1 2 3 4 5 6 7 8 9 10; do [ "$(q "select count(*) from pg_stat_activity where datname = 'xr_studio_chk_busy'")" != 0 ] && break; sleep 0.3; done
P() { PRUNE_MATCH=xr_studio_chk_ PRUNE_KEEP=xr_studio_chk_keep bash "$S/tools/prune-test-dbs.sh" "$@" 2>&1; }
dry=$(P); line() { printf '%s\n' "$dry" | grep -E "^xr_studio_chk_$1 "; }
ok "dry run: the old idle copy is listed STALE" "$(line old | grep -q STALE && echo 1)" "$(line old)"
ok "dry run: one in use is kept (a connection)" "$(line busy | grep -q 'keep: 1 connection' && echo 1)" "$(line busy)"
ok "dry run: a copy whose server runs is kept, with no connection and old files (M1)" "$(line live | grep -q 'keep: its server is running' && echo 1)" "$(line live)"
ok "dry run: a name containing demo is kept, however old" "$(line demo_old | grep -q 'keep: contains demo' && echo 1)" "$(line demo_old)"
ok "dry run: a name in PRUNE_KEEP is kept" "$(line keep | grep -q 'keep: in PRUNE_KEEP' && echo 1)" "$(line keep)"
ok "dry run: one changed in the last 3 h is kept" "$(line fresh | grep -q 'keep: files changed' && echo 1)" "$(line fresh)"
x=$(P --yes xr_studio_chk_old); code=$?
ok "--yes with anything after it is refused and drops nothing (M2)" "$([ "$code" = 2 ] && exists xr_studio_chk_old && echo 1)" "exit $code: $x"
x=$(PRUNE_HOURS=0 P); code=$?; ok "PRUNE_HOURS=0 is refused" "$([ "$code" = 2 ] && echo 1)" "exit $code"
ok "dry run drops nothing" "$(for d in old busy demo_old keep fresh live; do exists "xr_studio_chk_$d" || exit 1; done && echo 1)" "a database went missing"
yes=$(P --yes); code=$?
ok "--yes drops only the stale copy" "$(! exists xr_studio_chk_old && for d in busy demo_old keep fresh live; do exists "xr_studio_chk_$d" || exit 1; done && echo 1)" "exit $code: $yes"
ok "--yes reports it and exits 0" "$([ "$code" = 0 ] && printf '%s\n' "$yes" | grep -q '^1 dropped' && echo 1)" "exit $code: $(printf '%s\n' "$yes" | tail -1)"
# The lane databases cloud-setup.sh makes (xr_studio_screens …) are kept however idle: a dry run only, never --yes here.
if exists xr_studio_screens; then l=$(PRUNE_MATCH=xr_studio_screens bash "$S/tools/prune-test-dbs.sh" 2>&1 | grep -E '^xr_studio_screens ')
  ok "a lane database (xr_studio_screens) is kept, however idle" "$(printf '%s' "$l" | grep -q 'keep: lane database' && echo 1)" "$l"; fi
out=$(zsh "$S/tools/isolated.sh" chk_live 24988 stop 2>&1)
ok "stop on its own port ends the live copy and then drops its database" "$(! exists xr_studio_chk_live && ! curl -s -o /dev/null --max-time 2 localhost:24988/api/session && echo 1)" "$out"
ok "PRUNE_MATCH outside xr_studio_ is refused" "$(PRUNE_MATCH=postgres bash "$S/tools/prune-test-dbs.sh" >/dev/null 2>&1; [ $? = 2 ] && echo 1)" "accepted"
echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
