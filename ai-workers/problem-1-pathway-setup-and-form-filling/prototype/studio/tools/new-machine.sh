#!/usr/bin/env bash
# B168 (P-459, founder ask A12): run the Studio on any Mac (a second founder's copy) with one command, from a plain clone.
#   bash ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/new-machine.sh          set up and start
#   bash ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/new-machine.sh stop     stop what it started
# It finds what is installed, never a path of one person's Mac: Node 24, PostgreSQL 16 or newer (18 preferred) and
# Python 3.14, on the PATH, in Homebrew (wherever its `brew` is), in Postgres.app, or in nvm, fnm or volta. A missing one
# stops the run with the exact install to make (nothing is downloaded or installed outside the copy without you).
# Then, inside the copy only (.tools/ and node_modules/, both ignored by git):
#   1. the packages from the committed lockfiles: the studio's (npm ci), the prototype's (prototype/env/node, linked by
#      prototype/node_modules) and the form helpers' Python packages (prototype/env/requirements.lock, hash-pinned);
#   2. the database: DATABASE_URL when set (its database is created when missing); otherwise its own PostgreSQL cluster
#      in .tools/solution-1-prototype/pg18-data, owned by the role xr_studio, on 127.0.0.1:54329, database xr_studio_demo
#      (the same place start.sh, stop.sh and isolated.sh use, so they work on this copy too);
#   3. the migrations, the web build, the API on http://localhost:4400;
#   4. on an empty database, Demo › Load the finished story: the six agreed combinations (the configured checkpoint) and
#      the family case to a recorded submission. A database with content is never emptied: load it again from the Demo menu.
# Safe to run again: after `git pull` the same command reinstalls what a lockfile changed, migrates, rebuilds, restarts.
# Live AI stays off: no key is read or written here, and no STUDIO_*_LIVE switch is set. US$0.
# Settings (all optional): STUDIO_PORT (4400), STUDIO_PGPORT (54329), STUDIO_PGDATA, DATABASE_URL, and STUDIO_NODE_BIN,
# STUDIO_PG_BIN, STUDIO_PYTHON to name an installed tool the search does not find. bash 3.2 (the Mac's own) compatible.
set -euo pipefail
STUDIO="$(cd "$(dirname "$0")/.." && pwd)"
PROTO="$(cd "$STUDIO/.." && pwd)"
ROOT="$(cd "$STUDIO/../../../.." && pwd)"
TOOLS="$ROOT/.tools/solution-1-prototype"
PORT="${STUDIO_PORT:-4400}"; PGPORT="${STUDIO_PGPORT:-54329}"
PGDATA_DIR="${STUDIO_PGDATA:-$TOOLS/pg18-data}"
OWN_DB=""; [ -z "${DATABASE_URL:-}" ] && OWN_DB=1
DB_URL="${DATABASE_URL:-postgresql://xr_studio@127.0.0.1:$PGPORT/xr_studio_demo}"
STAMPS="$ROOT/.tools/new-machine"
say() { printf '%s\n' "$*"; }
die() { printf 'stopped: %s\n' "$*" >&2; exit 1; }
sha() { if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$@"; else sha256sum "$@"; fi | cut -c1-64; }

# ---- finding the installed tools ------------------------------------------------------------------------------------
BREW_PREFIX=""
if b=$(command -v brew 2>/dev/null); then BREW_PREFIX="$(cd "$(dirname "$(readlink "$b" 2>/dev/null || echo "$b")")/.." 2>/dev/null && pwd)"; fi
# Homebrew links bin/brew into its prefix's bin (Apple silicon and Intel alike), so the prefix is bin's parent.
[ -n "$BREW_PREFIX" ] && [ ! -d "$BREW_PREFIX/opt" ] && BREW_PREFIX="$(dirname "$(dirname "$b")")"

node_major() { "$1/node" -v 2>/dev/null | sed -nE 's/^v([0-9]+)\..*/\1/p'; }
find_node() {
  local d c
  for d in "${STUDIO_NODE_BIN:-}" "$(dirname "$(command -v node 2>/dev/null || echo /nonexistent/node)")" \
           "$ROOT"/.tools/node-v24*/bin "${BREW_PREFIX:+$BREW_PREFIX/opt/node@24/bin}" "${BREW_PREFIX:+$BREW_PREFIX/opt/node/bin}" \
           "$HOME"/.nvm/versions/node/v24*/bin "$HOME"/.local/share/fnm/node-versions/v24*/installation/bin \
           "$HOME"/Library/Application\ Support/fnm/node-versions/v24*/installation/bin "$HOME"/.volta/tools/image/node/24*/bin; do
    [ -n "$d" ] && [ -x "$d/node" ] && [ -x "$d/npm" ] || continue
    c=$(node_major "$d"); [ "$c" = 24 ] && { echo "$d"; return 0; }
  done; return 1
}
pg_major() { "$1/postgres" --version 2>/dev/null | sed -nE 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/p' | head -1; }
find_pg() {  # the newest major of 16 and up; 18 first when there is one
  local d best="" bestv=0 v
  # Homebrew's opt/ links first: they survive `brew upgrade`, where pg_config's Cellar folder (…/18.6_1/bin) does not.
  for d in "${STUDIO_PG_BIN:-}" \
           ${BREW_PREFIX:+"$BREW_PREFIX/opt/postgresql@18/bin" "$BREW_PREFIX/opt/postgresql@17/bin" "$BREW_PREFIX/opt/postgresql@16/bin" "$BREW_PREFIX/opt/postgresql/bin"} \
           /Applications/Postgres.app/Contents/Versions/latest/bin /Applications/Postgres.app/Contents/Versions/*/bin \
           "$(dirname "$(command -v pg_ctl 2>/dev/null || echo /nonexistent/pg_ctl)")" "$(command -v pg_config >/dev/null 2>&1 && pg_config --bindir || true)"; do
    [ -n "$d" ] && [ -x "$d/pg_ctl" ] && [ -x "$d/initdb" ] && [ -x "$d/psql" ] && [ -x "$d/createdb" ] && [ -x "$d/postgres" ] || continue
    v=$(pg_major "$d"); [ -n "$v" ] && [ "$v" -ge 16 ] && [ "$v" -gt "$bestv" ] && { best="$d"; bestv="$v"; }
  done
  [ -n "$best" ] && echo "$best"
}
find_python() {  # the form helpers' lock is for CPython 3.14 (cffi's cp314 wheel)
  local p
  for p in "${STUDIO_PYTHON:-}" "$(command -v python3.14 2>/dev/null || true)" "${BREW_PREFIX:+$BREW_PREFIX/opt/python@3.14/bin/python3.14}" \
           /Library/Frameworks/Python.framework/Versions/3.14/bin/python3.14 "$(command -v python3 2>/dev/null || true)"; do
    [ -n "$p" ] && [ -x "$p" ] || continue
    [ "$("$p" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null)" = 3.14 ] && { echo "$p"; return 0; }
  done; return 1
}

stop_all() {
  local pids; pids=$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  [ -n "$pids" ] && kill $pids 2>/dev/null && say "api on :$PORT stopped"
  if [ -n "$OWN_DB" ] && PGB=$(find_pg) && "$PGB/pg_ctl" -D "$PGDATA_DIR" status >/dev/null 2>&1; then
    "$PGB/pg_ctl" -D "$PGDATA_DIR" -m fast stop >/dev/null && say "database stopped (data kept in $PGDATA_DIR)"
  fi
  return 0
}
[ "${1:-}" = stop ] && { stop_all; exit 0; }
[ -z "${1:-}" ] || die "usage: new-machine.sh [stop]"
[ "$(uname -s)" = Darwin ] || say "note: made for a Mac; on Linux the cloud's setup is product/tools/cloud-setup.sh"

say "== tools"
NODE_BIN=$(find_node) || die "Node 24 not found (the studio's package.json asks for 24.21.0; found: $(node -v 2>/dev/null || echo none)).
  Install it, then run this again. Either: brew install node@24
  or the official installer https://nodejs.org/dist/v24.21.0/node-v24.21.0.pkg, checked against
  https://nodejs.org/dist/v24.21.0/SHASUMS256.txt (shasum -a 256 node-v24.21.0.pkg).
  Installed somewhere else? STUDIO_NODE_BIN=<its bin folder> bash $0"
export PATH="$NODE_BIN:$PATH"
[ "$(node -v)" = v24.21.0 ] || say "note: Node $(node -v); the team pins v24.21.0 (package.json engines), any 24 runs the Studio"
say "node $(node -v) ($NODE_BIN)"
if [ -n "$OWN_DB" ] || ! command -v psql >/dev/null 2>&1; then
  PGB=$(find_pg) || die "PostgreSQL 16 or newer not found (18 preferred).
  Install it, then run this again. Either: brew install postgresql@18   (no need to start its service: this script runs
  its own cluster on 127.0.0.1:$PGPORT) or Postgres.app from https://postgresapp.com (PostgreSQL 18).
  Installed somewhere else? STUDIO_PG_BIN=<its bin folder> bash $0. Already running a server? DATABASE_URL=<its url> bash $0"
  export PATH="$PGB:$PATH"; say "postgresql $(pg_major "$PGB") ($PGB)"
fi
PY=$(find_python) || die "Python 3.14 not found (the form helpers' lock, prototype/env/requirements.lock, is for 3.14).
  Install it, then run this again. Either: brew install python@3.14
  or the official installer https://www.python.org/downloads/release/python-3140/ (macOS 64-bit universal2), checked
  against the SHA-256 on that page. Installed somewhere else? STUDIO_PYTHON=<its python3.14> bash $0"
say "python $("$PY" -V 2>&1 | cut -d' ' -f2) ($PY)"
[ "$(uname -m)" = arm64 ] || say "note: the form helpers' lock pins Apple-silicon (arm64) wheels; on an Intel Mac step 1 stops at them: ask the tech lead"

say "== packages (from the committed lockfiles)"
mkdir -p "$STAMPS" "$TOOLS"
fresh() { [ -f "$STAMPS/$1" ] && [ "$(cat "$STAMPS/$1")" = "$(sha "$2")" ]; }
stamp() { sha "$2" > "$STAMPS/$1"; }
if [ -d "$STUDIO/node_modules/.bin" ] && fresh studio-lock "$STUDIO/package-lock.json"; then say "studio packages up to date"
else (cd "$STUDIO" && npm ci --no-fund --no-audit) || die "npm ci for the studio failed (above)"; stamp studio-lock "$STUDIO/package-lock.json"; fi
PN="$TOOLS/node"; PSRC="$PROTO/env/node"
if [ -d "$PN/node_modules" ] && fresh proto-lock "$PSRC/package-lock.json"; then say "prototype packages up to date"
else mkdir -p "$PN"; cp "$PSRC/package.json" "$PSRC/package-lock.json" "$PN/"
  (cd "$PN" && npm ci --no-fund --no-audit) || die "npm ci for the prototype packages failed (above)"; stamp proto-lock "$PSRC/package-lock.json"; fi
[ -e "$PROTO/node_modules/ajv" ] || die "prototype/node_modules does not reach $PN/node_modules (the committed link): ask the tech lead"
VENV="$TOOLS/.venv"; LOCK="$PROTO/env/requirements.lock"
if [ -x "$VENV/bin/python" ] && fresh py-lock "$LOCK"; then say "form helpers up to date"
else
  [ -x "$VENV/bin/python" ] || "$PY" -m venv "$VENV" || die "could not make the form helpers' Python environment ($VENV)"
  "$VENV/bin/python" -m pip install -q --disable-pip-version-check --require-hashes --no-deps --only-binary :all: -r "$LOCK" || die "pip could not install the form helpers' packages (above)"
  stamp py-lock "$LOCK"
fi
"$VENV/bin/python" -I -c "import pypdf, cryptography, zxingcpp" || die "the form helpers' packages do not import: ask the tech lead"
say "form helpers ready"

say "== database"
if [ -n "$OWN_DB" ]; then
  if [ ! -f "$PGDATA_DIR/PG_VERSION" ]; then
    mkdir -p "$PGDATA_DIR"
    initdb -D "$PGDATA_DIR" -U xr_studio -A trust -E UTF8 --locale=en_US.UTF-8 >/dev/null || die "initdb could not create the cluster in $PGDATA_DIR"
    say "cluster created ($PGDATA_DIR, role xr_studio)"
    # Its own port, local connections only (TCP; no socket file outside the copy). The zone stays the Mac's own, as the
    # demo's cluster does.
    printf '%s\n' "port = $PGPORT" "listen_addresses = '127.0.0.1'" "unix_socket_directories = ''" >> "$PGDATA_DIR/postgresql.conf"
  fi
  [ "$(pg_major "$(dirname "$(command -v postgres)")")" = "$(cat "$PGDATA_DIR/PG_VERSION")" ] || die "the cluster in $PGDATA_DIR is PostgreSQL $(cat "$PGDATA_DIR/PG_VERSION"), the server found is $(pg_major "$(dirname "$(command -v postgres)")"): STUDIO_PG_BIN=<the $(cat "$PGDATA_DIR/PG_VERSION") bin folder>"
  if pg_ctl -D "$PGDATA_DIR" status >/dev/null 2>&1; then say "cluster already running"
  else
    if lsof -ti tcp:"$PGPORT" -sTCP:LISTEN >/dev/null 2>&1; then die "port $PGPORT is taken by another program: STUDIO_PGPORT=<a free port> bash $0, or DATABASE_URL=<that server's url> bash $0"; fi
    # The port is given on the command line too, so an older cluster made by hand with another port still lands here.
    LC_ALL=en_US.UTF-8 pg_ctl -D "$PGDATA_DIR" -o "-p $PGPORT" -l "$PGDATA_DIR/server.log" -w start >/dev/null || { tail -20 "$PGDATA_DIR/server.log"; die "the cluster did not start"; }
    say "cluster started (127.0.0.1:$PGPORT)"
  fi
  createdb -h 127.0.0.1 -p "$PGPORT" -U xr_studio xr_studio_demo 2>/dev/null && say "database xr_studio_demo created" || true
else
  base="${DB_URL%%\?*}"; dbname="${base##*/}"
  if ! psql "$DB_URL" -XAtqc "select 1" >/dev/null 2>&1; then
    command -v createdb >/dev/null || die "cannot reach $dbname at DATABASE_URL, and no PostgreSQL client tools to create it"
    psql "${base%/*}/postgres" -XAtqc "create database \"$dbname\"" >/dev/null 2>&1 && say "database $dbname created" || die "cannot reach or create the database at DATABASE_URL ($dbname)"
  fi
fi
psql "$DB_URL" -XAtqc "select 1" >/dev/null || die "cannot connect to $DB_URL"
export DATABASE_URL="$DB_URL"
cd "$STUDIO"
export PRISMA_HIDE_UPDATE_MESSAGE=1   # the team pins Prisma 7.8.0; its "update available" box is noise here
out=$(./node_modules/.bin/prisma migrate deploy 2>&1) || { printf '%s\n' "$out"; die "the migrations did not apply"; }
out=$(./node_modules/.bin/prisma generate 2>&1) || { printf '%s\n' "$out"; die "prisma generate failed"; }
say "database schema up to date"

say "== web app and api"
mkdir -p var
bash tools/web-fresh.sh build || die "the web build failed (var/web-build.log)"
STUDIO_PORT="$PORT" zsh tools/restart-api.sh >/dev/null 2>&1 || { tail -30 var/api.log; die "the API did not start (its log: $STUDIO/var/api.log)"; }
say "api up on :$PORT"

say "== demo content"
api() { curl -s -X "$1" "localhost:$PORT/api$2" -H "x-actor: user-A" -H "content-type: application/json" ${3:+-d "$3"}; }
programs=$(psql "$DB_URL" -XAtqc 'select count(*) from program_def' 2>/dev/null || echo "?")
if [ "$programs" = 0 ]; then
  say "empty database: loading the six and the finished story (a few minutes; replays only, no AI call)"
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "localhost:$PORT/api/demo/checkpoints/finished-story" -H "x-actor: user-A" -H "content-type: application/json" -d '{}')
  [ "$code" = 202 ] || die "the finished story did not start (answer $code)"
  state=running; i=0
  while [ "$state" = running ] && [ $i -lt 400 ]; do sleep 3; i=$((i + 1))
    state=$(api GET /demo/status | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).story?.state??"?")}catch{console.log("?")}})'); done
  [ "$state" = "?" ] && die "the API stopped answering while the story loaded (its log: $STUDIO/var/api.log); run this again to restart it, then Demo › Load the finished story (it empties the half-loaded demo first)"
  api GET /demo/status | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j;try{j=JSON.parse(s)}catch{return console.log("finished story: no answer from the API")}const t=j.story||{};const st=t.stages||[];const n=k=>st.filter(x=>x.status===k).length;
    console.log(t.state==="done"?`finished story loaded in ${Math.round(t.seconds)} s: ${n("done")} stages done, ${n("partial")} partly, ${n("waiting")} waiting (checkpoint: ${j.checkpoint})`:`finished story: ${t.state} ${t.error??""}`);
    for (const x of st) if (x.status!=="done") console.log(`  ${x.status}: ${x.title}${x.why?" ("+x.why+")":""}`)})'
  [ "$state" = done ] || die "the finished story did not finish (Demo › Load the finished story shows why; the API log: $STUDIO/var/api.log)"
else say "the database has content ($programs programs): kept as it is (Demo › Load the finished story reloads it)"; fi

[ -n "$(ls -A "${STUDIO_VALIDATED_DIR:-$TOOLS/validated-imm5257}" 2>/dev/null)" ] || say "note: no Adobe-validated Paper form in $TOOLS/validated-imm5257 (it lives on the founder's Mac, never in git): 4 of the story's 8 stages stay partly done; product/SECOND-MAC.md §3"
git -C "$ROOT" config core.hooksPath .githooks 2>/dev/null || true   # the push guard (AGENTS.md rule 1)
say "Product Studio: http://localhost:$PORT   (stop: bash ${0#$ROOT/} stop)"
