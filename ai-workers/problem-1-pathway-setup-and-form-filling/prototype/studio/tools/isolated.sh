#!/bin/zsh
# An isolated copy of the Studio for tests and the 100-program exercise: its own database (xr_studio_<name>), its own
# working files (var/isolated-<name>) and its own port, with the same code, migrations and web build. The demo
# database, its files and the preserved evidence are never touched. Usage:
#   zsh studio/tools/isolated.sh <name> <port> start [--ttl <min>] [KEY=VALUE ...]   (fresh database each start)
#   zsh studio/tools/isolated.sh <name> <port> restart [--ttl <min>] [KEY=VALUE ...] (same database and files, new server process)
#   zsh studio/tools/isolated.sh <name> <port> stop      (drops its database and files; ISOLATED_KEEP=1 keeps them)
# A stopped copy leaves nothing behind (3 Nov: 977 left-over test databases, 13 GB, on the Mac): its database is dropped
# and var/isolated-<name> removed; only its api.log is kept, as var/isolated-logs/<name>-api.log (the clue when a suite
# fails). Copies that were never stopped (a killed run): tools/prune-test-dbs.sh.
# No copy is left running (founder, 6 Nov ~03:00 IST; that night ten qa copies on :4470-:4479 needed the founder's
# terminal, as a later sandboxed call cannot signal them): a started copy stops itself after --ttl minutes (default 60,
# ISOLATED_TTL; at most 480), and start refuses while 4 copies already run (tools/test-copies.sh; COPY_CAP). Best of all,
# start and stop it in the same command: `zsh isolated.sh n p start && trap 'zsh isolated.sh n p stop' EXIT && <tests>`.
# Test: product/tools/check-isolated-ttl.sh.
set -e
STUDIO="${0:A:h:h}"; ROOT="${STUDIO:h:h:h:h}"
NAME="$1"; PORT="$2"; ACTION="$3"; shift 3 || true
TTL="${ISOLATED_TTL:-60}"; rest=()
while (( $# )); do case "$1" in --ttl) TTL="${2:-}"; shift 2 || shift;; --ttl=*) TTL="${1#--ttl=}"; shift;; *) rest+=("$1"); shift;; esac; done
set -- "${rest[@]}"
[[ "$TTL" =~ ^[0-9]+$ ]] && (( TTL >= 1 && TTL <= 480 )) || { echo "--ttl: whole minutes from 1 to 480"; exit 2; }
[[ "$NAME" =~ ^[a-z0-9_]+$ ]] || { echo "name: lower case letters, digits, _"; exit 2; }
[[ "$NAME" != "demo" ]] || { echo "refused: 'demo' is the demo workspace"; exit 2; }
[[ "$NAME" != "ttl" && "$NAME" != "logs" ]] || { echo "refused: '$NAME' is a folder of var/ (isolated-ttl, isolated-logs)"; exit 2; }
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
DB="xr_studio_$NAME"; URL="postgresql://xr_studio@127.0.0.1:54329/$DB"; VARDIR="$STUDIO/var/isolated-$NAME"
TTLPID="$STUDIO/var/isolated-ttl/$NAME.pid"
# The copy's self-stop timer, if one waits: ended by a stop or a new start (a timer is "zsh -c ... isolated-ttl ...").
end_timer() { local t; t=$(cat "$TTLPID" 2>/dev/null) || return 0; rm -f "$TTLPID"
  [[ -n "$t" ]] && ps -p "$t" -o command= 2>/dev/null | grep -q isolated-ttl && kill "$t" 2>/dev/null; return 0; }
if [[ "$ACTION" != "stop" ]]; then
  others=$(bash "$STUDIO/tools/test-copies.sh" | grep -vx "$PORT" | grep -c . || true)
  if (( others >= ${COPY_CAP:-4} )); then
    echo "refused: $others test copies already run (ports $(bash "$STUDIO/tools/test-copies.sh" | grep -vx "$PORT" | paste -sd ' ' -)), cap ${COPY_CAP:-4}: stop one first (zsh studio/tools/isolated.sh <name> <port> stop)"; exit 1
  fi
fi
# Only the server listening on the port is stopped, never a client connected to it (a test that restarts its own copy
# would otherwise stop itself).
for pid in $(lsof -ti tcp:$PORT -sTCP:LISTEN 2>/dev/null); do kill $pid 2>/dev/null || true; done
for i in {1..40}; do lsof -ti tcp:$PORT -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 0.25; done
# A listener that outlives the 10 s wait is killed for good (fix row from #374, #377): otherwise the new copy cannot
# bind, the start check below is answered by the old copy, and a suite runs on an earlier suite's data.
for pid in $(lsof -ti tcp:$PORT -sTCP:LISTEN 2>/dev/null); do kill -9 $pid 2>/dev/null || true; done
for i in {1..20}; do lsof -ti tcp:$PORT -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 0.25; done
if [[ "$ACTION" != "stop" ]] && curl -s -o /dev/null --max-time 2 "localhost:$PORT/"; then echo "port $PORT is still answering after its server was stopped: not starting $NAME on it"; exit 1; fi
if [[ "$ACTION" == "stop" ]]; then
  # The timer ends only with the copy (#1136 review m3): a stop that keeps the copy running keeps its timer.
  if [[ "${ISOLATED_KEEP:-}" == 1 ]]; then end_timer; echo "stopped $NAME (database $DB and $VARDIR kept: ISOLATED_KEEP=1)"; exit 0; fi
  # The server this copy recorded on its database at start ("isolated.sh server pid N port P host H"; #745 review M1):
  # on this port it is this copy's, so it is ended too (the tsx parent of the listener stopped above).
  rec=$(psql -h 127.0.0.1 -p 54329 -U xr_studio -d postgres -XAtq -c "select shobj_description(oid, 'pg_database') from pg_database where datname = '$DB'" 2>/dev/null)
  opid=$(printf '%s' "$rec" | sed -nE 's/.*server pid ([0-9]+) port ([0-9]+) host ([^ ]+).*/\1/p'); oport=$(printf '%s' "$rec" | sed -nE 's/.*server pid ([0-9]+) port ([0-9]+).*/\2/p')
  # The record is trusted only while that pid is a studio server (its command runs api/src/main.ts): after a reboot or a
  # container restart the pid may belong to anything else, which must never be signalled (#745 review round 2, R2-M1).
  [[ -n "$opid" ]] && { ps -p "$opid" -o command= 2>/dev/null | grep -q 'api/src/main\.ts' || opid=""; }
  if [[ -n "$opid" && "$oport" == "$PORT" ]]; then kill "$opid" 2>/dev/null || true; for i in {1..20}; do ps -p "$opid" >/dev/null 2>&1 || break; sleep 0.25; done; fi
  # Its database and files go only when nothing of it still runs (#745 review m2): no listener left on its port, and the
  # server it recorded (say, on another port than the one given) no longer alive. Otherwise both are kept.
  if lsof -ti tcp:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "stopped $NAME, but port $PORT is still listening: database $DB and files kept"; exit 0; fi
  if [[ -n "$opid" ]] && ps -p "$opid" >/dev/null 2>&1; then echo "stopped nothing on $PORT: $NAME's server (pid $opid, port $oport) is still running, so database $DB and files are kept"; exit 0; fi
  end_timer
  # Its own database only (the name check above refuses "demo"); --force ends leftover connections of its stopped server.
  # A database server that is down, or a failure, never fails the stop: prune-test-dbs.sh cleans up.
  dropdb -h 127.0.0.1 -p 54329 -U xr_studio --if-exists --force "$DB" >/dev/null 2>&1 || echo "note: could not drop $DB (tools/prune-test-dbs.sh will)"
  log=""; if [[ -f "$VARDIR/api.log" ]]; then mkdir -p "$STUDIO/var/isolated-logs" && mv -f "$VARDIR/api.log" "$STUDIO/var/isolated-logs/$NAME-api.log" && log="; log in var/isolated-logs/$NAME-api.log"; fi
  rm -rf "$VARDIR"
  echo "stopped $NAME (database and files removed$log)"; exit 0
fi
pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" status >/dev/null 2>&1 || { echo "start the demo database first (studio/start.sh)"; exit 1; }
if [[ "$ACTION" == "start" ]]; then dropdb -h 127.0.0.1 -p 54329 -U xr_studio --if-exists "$DB"; createdb -h 127.0.0.1 -p 54329 -U xr_studio "$DB"; rm -rf "$VARDIR"; fi
mkdir -p "$VARDIR"
cd "$STUDIO"
# QA-181: never serve a web bundle built from other code (an old branch's, or before an edit): rebuild it first, and
# refuse to start when that fails. Seconds when the bundle's stamp already matches web/, contracts/ and engine/.
bash "$STUDIO/tools/web-fresh.sh" ensure || { echo "refused: web/dist does not match this copy's code and could not be rebuilt (QA-181)"; exit 1; }
DATABASE_URL="$URL" ./node_modules/.bin/prisma migrate deploy >/dev/null
# As start.sh does: a database client older than the schema makes every query on a new column fail quietly (a load
# answers 201 having read nothing; #378 review B1). Regenerated only when the schema is newer or the client is missing, so a start stays fast.
# The schema is a folder, one file per area (DB-SPLIT): any of its files newer than the client regenerates it.
[[ ! -e node_modules/.prisma/client/index.js || -n "$(find prisma/schema -name '*.prisma' -newer node_modules/.prisma/client/index.js)" ]] && ./node_modules/.bin/prisma generate >/dev/null
env DATABASE_URL="$URL" STUDIO_PORT="$PORT" STUDIO_VAR="$VARDIR" "$@" nohup ./node_modules/.bin/tsx --tsconfig api/tsconfig.json api/src/main.ts >> "$VARDIR/api.log" 2>&1 &
# Who serves this database (#745 review M1): prune-test-dbs.sh keeps a database whose recorded server is alive, since an
# idle server holds no connection (its pool closes them after 10 s); stop ends it. Never fails the start.
SPID=$!
psql -h 127.0.0.1 -p 54329 -U xr_studio -d postgres -Xq -c "comment on database \"$DB\" is 'isolated.sh server pid $SPID port $PORT host $(hostname -s)'" >/dev/null 2>&1 || true
# The self-stop timer: after TTL minutes it stops this copy, but only while the database still records this very server
# (a later start of the same name records another pid), or, with the database unreadable, while that server still runs.
end_timer; mkdir -p "${TTLPID:h}" "$STUDIO/var/isolated-logs"
nohup zsh -c 'trap '"'"'kill $s 2>/dev/null; exit 0'"'"' TERM; sleep $1 & s=$!; wait $s
  rec=$(psql -h 127.0.0.1 -p 54329 -U xr_studio -d postgres -XAtq -c "select shobj_description(oid, '"'pg_database'"') from pg_database where datname = '"'"'$6'"'"'" 2>/dev/null)
  if [[ "$rec" == *"server pid $2 port $3 "* ]] || { [[ -z "$rec" ]] && ps -p $2 -o command= 2>/dev/null | grep -q "api/src/main\.ts"; }; then
    rm -f "$7"; echo "$(date) ttl reached: stopping $4 on $3"; zsh "$5" "$4" "$3" stop
  else echo "$(date) ttl reached: $4 on $3 is no longer the copy this timer was set for; nothing stopped"; fi' \
  isolated-ttl $(( TTL * ${ISOLATED_TTL_UNIT:-60} )) "$SPID" "$PORT" "$NAME" "${0:A}" "$DB" "$TTLPID" >> "$STUDIO/var/isolated-logs/$NAME-ttl.log" 2>&1 &
echo $! > "$TTLPID"
for i in {1..60}; do curl -s -o /dev/null "localhost:$PORT/api/session" && { echo "isolated $NAME on http://localhost:$PORT ($DB), stops itself in $TTL min"; exit 0; }; sleep 0.5; done
echo "did not start"; tail -20 "$VARDIR/api.log"; exit 1
