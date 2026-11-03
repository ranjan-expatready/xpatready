#!/bin/zsh
# Product Studio prototype: one launch command.  zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/start.sh
# Starts the local PostgreSQL 18 demo cluster (127.0.0.1:54329, only while you use it), applies the database migrations,
# builds the web app and starts the API that serves it on http://localhost:4400. Stop with:  zsh .../studio/stop.sh
# P-82: packages come from the committed lockfile — npm ci runs once when node_modules is missing (.tools stays optional).
set -e
STUDIO="${0:A:h}"; ROOT="${STUDIO:h:h:h:h}"
export PATH="$ROOT/.tools/node-v24.21.0/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
PGDATA="${PGDATA:-$ROOT/.tools/solution-1-prototype/pg18-data}"
if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then echo "database already running"; else LC_ALL=en_US.UTF-8 pg_ctl -D "$PGDATA" -l "$PGDATA/server.log" -w start >/dev/null && echo "database started (127.0.0.1:54329)" || { echo "no local cluster at $PGDATA — on a cloud clone run product/tools/cloud-setup.sh first"; exit 1; }; fi
cd "$STUDIO"
[ -d node_modules ] || { echo "studio packages missing: npm ci"; npm ci; }
./node_modules/.bin/prisma migrate deploy >/dev/null && ./node_modules/.bin/prisma generate >/dev/null && echo "database schema up to date"
bash tools/web-fresh.sh build || echo "web build failed: isolated copies will refuse to start until it builds"   # builds web/dist and stamps what it was built from (QA-181: isolated.sh checks the stamp)
mkdir -p var
zsh tools/restart-api.sh >/dev/null && echo "Product Studio: http://localhost:${STUDIO_PORT:-4400}"
