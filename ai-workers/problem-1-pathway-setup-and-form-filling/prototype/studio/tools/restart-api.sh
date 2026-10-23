#!/bin/zsh
# Development helper: restart the studio API (the web app is served from web/dist by the same process). Stops only the
# server on this copy's own port (STUDIO_PORT, default 4400), never another copy's (QA-3).
cd "${0:A:h}/.."
export PATH="${0:A:h}/../../../../../.tools/node-v24.21.0/bin:$PATH"
PORT=${STUDIO_PORT:-4400}
# Another port without its own database would come back on the demo database (break m8): copies use isolated.sh.
[[ "$PORT" != 4400 && -z "$DATABASE_URL" ]] && { echo "refused: port $PORT has no database of its own; use tools/isolated.sh <name> $PORT restart"; exit 2; }
for pid in $(lsof -ti tcp:$PORT -sTCP:LISTEN 2>/dev/null); do kill $pid 2>/dev/null; done
for i in {1..40}; do lsof -ti tcp:$PORT -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 0.25; done
nohup ./node_modules/.bin/tsx --tsconfig api/tsconfig.json api/src/main.ts > var/api.log 2>&1 &
for i in {1..40}; do curl -s -o /dev/null localhost:$PORT/api/session && { echo "api up"; exit 0; }; sleep 0.5; done
echo "api did not start"; tail -30 var/api.log; exit 1
