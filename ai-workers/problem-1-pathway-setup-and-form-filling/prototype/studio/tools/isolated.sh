#!/bin/zsh
# An isolated copy of the Studio for tests and the 100-program exercise: its own database (xr_studio_<name>), its own
# working files (var/isolated-<name>) and its own port, with the same code, migrations and web build. The demo
# database, its files and the preserved evidence are never touched. Usage:
#   zsh studio/tools/isolated.sh <name> <port> start [KEY=VALUE ...]   (fresh database each start)
#   zsh studio/tools/isolated.sh <name> <port> restart [KEY=VALUE ...] (same database and files, new server process)
#   zsh studio/tools/isolated.sh <name> <port> stop
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
if [[ "$ACTION" == "stop" ]]; then echo "stopped $NAME"; exit 0; fi
pg_ctl -D "$ROOT/.tools/solution-1-prototype/pg18-data" status >/dev/null 2>&1 || { echo "start the demo database first (studio/start.sh)"; exit 1; }
if [[ "$ACTION" == "start" ]]; then dropdb -h 127.0.0.1 -p 54329 -U xr_studio --if-exists "$DB"; createdb -h 127.0.0.1 -p 54329 -U xr_studio "$DB"; rm -rf "$VARDIR"; fi
mkdir -p "$VARDIR"
cd "$STUDIO"
DATABASE_URL="$URL" ./node_modules/.bin/prisma migrate deploy >/dev/null
env DATABASE_URL="$URL" STUDIO_PORT="$PORT" STUDIO_VAR="$VARDIR" "$@" nohup ./node_modules/.bin/tsx --tsconfig api/tsconfig.json api/src/main.ts >> "$VARDIR/api.log" 2>&1 &
for i in {1..60}; do curl -s -o /dev/null "localhost:$PORT/api/session" && { echo "isolated $NAME on http://localhost:$PORT ($DB)"; exit 0; }; sleep 0.5; done
echo "did not start"; tail -20 "$VARDIR/api.log"; exit 1
