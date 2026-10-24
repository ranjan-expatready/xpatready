#!/usr/bin/env bash
# Cloud session setup (P-82): makes an ordinary GitHub clone runnable — Node 24, packages (npm ci),
# PostgreSQL 18 with the studio and lane databases, the schema (prisma migrate), and the official IRCC
# PDFs fetched by manifest checksum (P-31). Playwright browsers are preinstalled in the cloud image:
# they are never installed here. Run once at the start of a cloud session:  bash product/tools/cloud-setup.sh
set -e
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
P="ai-workers/problem-1-pathway-setup-and-form-filling"; STUDIO="$P/prototype/studio"
NODE_VER=24.21.0; PGPORT="${PGPORT:-54329}"

echo "== node $NODE_VER"
if ! command -v node >/dev/null || [ "$(node -v)" != "v$NODE_VER" ]; then
  mkdir -p "$HOME/.local"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VER/node-v$NODE_VER-linux-x64.tar.xz" | tar -xJ -C "$HOME/.local"
  export PATH="$HOME/.local/node-v$NODE_VER-linux-x64/bin:$PATH"
fi
echo "node $(node -v) / npm $(npm -v)"

echo "== packages (npm ci)"
(cd "$STUDIO" && npm ci)

echo "== postgresql 18 on 127.0.0.1:$PGPORT"
PGBIN=""
for c in /usr/lib/postgresql/18/bin /opt/homebrew/opt/postgresql@18/bin; do [ -x "$c/psql" ] && PGBIN="$c"; done
if [ -z "$PGBIN" ]; then
  if command -v apt-get >/dev/null; then
    # Ubuntu's stock repos carry an older major: add the official PGDG repository for 18.
    sudo -n apt-get update -qq && sudo -n apt-get install -y -qq postgresql-common >/dev/null
    [ -x /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh ] &&       sudo -n /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null
    sudo -n apt-get update -qq && sudo -n apt-get install -y -qq postgresql-18
    PGBIN=/usr/lib/postgresql/18/bin
  elif command -v brew >/dev/null; then
    brew install postgresql@18 >/dev/null && PGBIN="$(brew --prefix)/opt/postgresql@18/bin"
  fi
fi
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "postgresql 18 not found and could not be installed"; exit 1; }
export PATH="$PGBIN:$PATH"
PGDATA="$ROOT/.tools/solution-1-prototype/pg18-data"
if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  [ -d "$PGDATA" ] || { mkdir -p "$PGDATA"; initdb -D "$PGDATA" -U xr_studio -A trust >/dev/null; }
  pg_ctl -D "$PGDATA" -o "-p $PGPORT -k /tmp" -l "$PGDATA/server.log" -w start >/dev/null
  echo "cluster started"
else echo "cluster already running"; fi
for db in xr_studio_demo xr_studio_screens xr_studio_forms xr_studio_evidence xr_studio_runtime xr_studio_qa; do
  createdb -h 127.0.0.1 -p "$PGPORT" -U xr_studio "$db" 2>/dev/null || true
done
psql -h 127.0.0.1 -p "$PGPORT" -U xr_studio -d postgres -c "ALTER USER xr_studio CREATEDB;" >/dev/null

echo "== schema"
(cd "$STUDIO" && DATABASE_URL="postgresql://xr_studio@127.0.0.1:$PGPORT/xr_studio_demo" ./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/prisma generate)

echo "== official IRCC PDFs (manifest checksums, P-31)"
python3 "$P/official-sources/fetch_official_sources.py"

echo "cloud setup done — studio: zsh $STUDIO/start.sh (or DATABASE_URL + tsx api/src/main.ts for a lane copy)"
