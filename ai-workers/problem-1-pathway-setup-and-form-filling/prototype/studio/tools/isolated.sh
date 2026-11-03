#!/bin/zsh
# An isolated copy of the Studio for tests and the 100-program exercise: its own database (xr_studio_<name>), its own
# working files (var/isolated-<name>) and its own port, with the same code, migrations and web build. The demo
# database, its files and the preserved evidence are never touched. Usage:
#   zsh studio/tools/isolated.sh <name> <port> start [KEY=VALUE ...]   (fresh database each start)
#   zsh studio/tools/isolated.sh <name> <port> restart [KEY=VALUE ...] (same database and files, new server process)
#   zsh studio/tools/isolated.sh <name> <port> stop      (drops its database and files; ISOLATED_KEEP=1 keeps them)
# A stopped copy leaves nothing behind (3 Nov: 977 left-over test databases, 13 GB, on the Mac): its database is dropped
# and var/isolated-<name> removed; only its api.log is kept, as var/isolated-logs/<name>-api.log (the clue when a suite
# fails). Copies that were never stopped (a killed run): tools/prune-test-dbs.sh.
set -e
STUDIO="${0:A:h:h}"; ROOT="${STUDIO:h:h:h:h}"
NAME="$1"; PORT="$2"; ACTION="$3"; shift 3 || true
[[ "$NAME" =~ ^[a-z0-9_]+$ ]] || { echo "name: lower case letters, digits, _"; exit 2; }
[[ "$NAME" != "demo" ]] || { echo "refused: 'demo' is the demo workspace"; exit 2; }
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
DB="xr_studio_$NAME"; URL="postgresql://xr_studio@127.0.0.1:54329/$DB"; VARDIR="$STUDIO/var/isolated-$NAME"
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
  if [[ "${ISOLATED_KEEP:-}" == 1 ]]; then echo "stopped $NAME (database $DB and $VARDIR kept: ISOLATED_KEEP=1)"; exit 0; fi
  # Its own database only (the name check above refuses "demo"); --force ends its leftover connections, since its server
  # has just been stopped. A database server that is down, or a failure, never fails the stop: prune-test-dbs.sh cleans up.
  dropdb -h 127.0.0.1 -p 54329 -U xr_studio --if-exists --force "$DB" >/dev/null 2>&1 || echo "note: could not drop $DB (tools/prune-test-dbs.sh will)"
  if [[ -f "$VARDIR/api.log" ]]; then mkdir -p "$STUDIO/var/isolated-logs" && mv -f "$VARDIR/api.log" "$STUDIO/var/isolated-logs/$NAME-api.log"; fi
  rm -rf "$VARDIR"
  echo "stopped $NAME (database and files removed; log in var/isolated-logs/$NAME-api.log)"; exit 0
fi
pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" status >/dev/null 2>&1 || { echo "start the demo database first (studio/start.sh)"; exit 1; }
if [[ "$ACTION" == "start" ]]; then dropdb -h 127.0.0.1 -p 54329 -U xr_studio --if-exists "$DB"; createdb -h 127.0.0.1 -p 54329 -U xr_studio "$DB"; rm -rf "$VARDIR"; fi
mkdir -p "$VARDIR"
cd "$STUDIO"
DATABASE_URL="$URL" ./node_modules/.bin/prisma migrate deploy >/dev/null
# As start.sh does: a database client older than the schema makes every query on a new column fail quietly (a load
# answers 201 having read nothing; #378 review B1). Regenerated only when the schema is newer or the client is missing, so a start stays fast.
[[ ! -e node_modules/.prisma/client/index.js || prisma/schema.prisma -nt node_modules/.prisma/client/index.js ]] && ./node_modules/.bin/prisma generate >/dev/null
env DATABASE_URL="$URL" STUDIO_PORT="$PORT" STUDIO_VAR="$VARDIR" "$@" nohup ./node_modules/.bin/tsx --tsconfig api/tsconfig.json api/src/main.ts >> "$VARDIR/api.log" 2>&1 &
for i in {1..60}; do curl -s -o /dev/null "localhost:$PORT/api/session" && { echo "isolated $NAME on http://localhost:$PORT ($DB)"; exit 0; }; sleep 0.5; done
echo "did not start"; tail -20 "$VARDIR/api.log"; exit 1
