#!/bin/zsh
# Product Studio prototype: one launch command.  zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/start.sh
# Starts the local PostgreSQL 18 demo cluster (127.0.0.1:54329, only while you use it), applies the database migrations,
# builds the web app and starts the API that serves it on http://localhost:4400. Stop with:  zsh .../studio/stop.sh
set -e
STUDIO="${0:A:h}"; ROOT="${STUDIO:h:h:h:h}"
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
PGDATA="$ROOT/.tools/solution-1-prototype/pg18-data"
if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then LC_ALL=en_US.UTF-8 pg_ctl -D "$PGDATA" -l "$PGDATA/server.log" -w start >/dev/null; echo "database started (127.0.0.1:54329)"; else echo "database already running"; fi
cd "$STUDIO"
./node_modules/.bin/prisma migrate deploy >/dev/null && ./node_modules/.bin/prisma generate >/dev/null && echo "database schema up to date"
(cd web && ../node_modules/.bin/vite build >/dev/null) && echo "web app built"
mkdir -p var
zsh tools/restart-api.sh >/dev/null && echo "Product Studio: http://localhost:${STUDIO_PORT:-4400}"
