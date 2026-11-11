#!/usr/bin/env bash
# B168 (P-459, founder ask A12): run the Studio on any Mac (a second founder's copy) with one command, from a plain clone.
#   bash ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/new-machine.sh          set up and start
#   bash ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/new-machine.sh stop     stop what it started
# It finds what is installed, never a path of one person's Mac: Node 24, PostgreSQL 16 or newer (18 when there is one)
# and Python 3.14, on the PATH, in Homebrew (wherever it is), Postgres.app, the postgresql.org installer, nvm, fnm,
# volta, pyenv or uv. A missing one stops the run with the exact install to make (nothing is installed outside the copy).
# Then, inside the copy only (.tools/ and node_modules/, both ignored by git):
#   1. the packages from the committed lockfiles: the studio's (npm ci), the prototype's (prototype/env/node, linked by
#      prototype/node_modules) and the form helpers' Python packages (prototype/env/requirements.lock, hash-pinned);
#   2. the database: DATABASE_URL when set (its database is created when missing); otherwise its own PostgreSQL cluster
#      in .tools/solution-1-prototype/pg18-data, owned by the role xr_studio, on 127.0.0.1:54329, database xr_studio_demo
#      (where start.sh, stop.sh and isolated.sh look; isolated.sh, the agent's test copies, needs it on 54329 and the
#      PostgreSQL and Node folders on the PATH: the run prints the line to add);
#   3. the migrations, the web build, the API on http://localhost:4400, with every STUDIO_*_LIVE switch cleared (live AI off);
#   4. on an empty database, Demo › Load the finished story: the six agreed combinations (the configured checkpoint) and
#      the family case to a recorded submission. A database with content is never emptied: load it again from the Demo menu.
# Safe to run again: after `git pull` the same command reinstalls what a lockfile changed, migrates, rebuilds, restarts.
# Settings (all optional): STUDIO_PORT (4400), STUDIO_PGPORT (54329), STUDIO_PGDATA, DATABASE_URL, and STUDIO_NODE_BIN,
# STUDIO_PG_BIN, STUDIO_PYTHON to name the installed tool to use (used alone when set). bash 3.2 (the Mac's own).
# Test: product/tools/check-new-machine.sh (sources this file with NEW_MACHINE_LIB=1: functions only, nothing runs). US$0.
set -euo pipefail
STUDIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROTO="$(cd "$STUDIO/.." && pwd)"
ROOT="$(cd "$STUDIO/../../../.." && pwd)"
TOOLS="$ROOT/.tools/solution-1-prototype"
PORT="${STUDIO_PORT:-4400}"; PGPORT="${STUDIO_PGPORT:-54329}"
PGDATA_DIR="${STUDIO_PGDATA:-$TOOLS/pg18-data}"
OWN_DB=""; [ -z "${DATABASE_URL:-}" ] && OWN_DB=1
DB_URL="${DATABASE_URL:-postgresql://xr_studio@127.0.0.1:$PGPORT/xr_studio_demo}"
STAMPS="$ROOT/.tools/new-machine"
ORIG_PATH="$PATH"
# Where PostgreSQL installs outside Homebrew and the PATH (Postgres.app, postgresql.org's installer); the test empties it.
PG_SYSTEM_DIRS="${NEW_MACHINE_PG_SYSTEM_DIRS-/Applications/Postgres.app/Contents/Versions/latest/bin /Applications/Postgres.app/Contents/Versions/*/bin /Library/PostgreSQL/*/bin}"
say() { printf '%s\n' "$*"; }
die() { printf 'stopped: %s\n' "$*" >&2; exit 1; }
sha() { if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$@"; else sha256sum "$@"; fi | cut -c1-64; }

# ---- finding the installed tools ------------------------------------------------------------------------------------
brew_prefix() {  # Homebrew's own answer, else the folder above the brew on the PATH (a relative link is resolved by cd)
  local b p; b=$(command -v brew 2>/dev/null) || return 0
  p=$(HOMEBREW_NO_AUTO_UPDATE=1 brew --prefix 2>/dev/null || true)
  [ -n "$p" ] && [ -d "$p/opt" ] || p=$(cd "$(dirname "$b")/.." 2>/dev/null && pwd || true)
  [ -n "$p" ] && [ -d "$p/opt" ] && echo "$p"; return 0
}
BREW_PREFIX="${NEW_MACHINE_BREW_PREFIX-$(brew_prefix)}"

node_major() { "$1/node" -v 2>/dev/null | sed -nE 's/^v([0-9]+)\..*/\1/p'; }
find_node() {
  local d
  if [ -n "${STUDIO_NODE_BIN:-}" ]; then [ -x "$STUDIO_NODE_BIN/node" ] && [ "$(node_major "$STUDIO_NODE_BIN")" = 24 ] && { echo "$STUDIO_NODE_BIN"; return 0; }; return 1; fi
  for d in "$(dirname "$(command -v node 2>/dev/null || echo /nonexistent/node)")" \
           "$ROOT"/.tools/node-v24*/bin "${BREW_PREFIX:+$BREW_PREFIX/opt/node@24/bin}" "${BREW_PREFIX:+$BREW_PREFIX/opt/node/bin}" \
           "$HOME"/.nvm/versions/node/v24*/bin "$HOME"/.local/share/fnm/node-versions/v24*/installation/bin \
           "$HOME"/Library/Application\ Support/fnm/node-versions/v24*/installation/bin "$HOME"/.volta/tools/image/node/24*/bin; do
    [ -n "$d" ] && [ -x "$d/node" ] && [ -x "$d/npm" ] || continue
    [ "$(node_major "$d")" = 24 ] && { echo "$d"; return 0; }
  done; return 1
}
pg_major() { "$1/postgres" --version 2>/dev/null | sed -nE 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/p' | head -1; }
pg_ok() { [ -n "$1" ] && [ -x "$1/pg_ctl" ] && [ -x "$1/initdb" ] && [ -x "$1/psql" ] && [ -x "$1/createdb" ] && [ -x "$1/postgres" ]; }
find_pg() {  # $1: the major an existing cluster was made with (it must be that one). STUDIO_PG_BIN, when set, alone.
  local want="${1:-}" d v best="" bestv=0
  if [ -n "${STUDIO_PG_BIN:-}" ]; then
    pg_ok "$STUDIO_PG_BIN" || return 1; v=$(pg_major "$STUDIO_PG_BIN")
    [ -n "$v" ] && [ "$v" -ge 16 ] && { [ -z "$want" ] || [ "$v" = "$want" ]; } && { echo "$STUDIO_PG_BIN"; return 0; }; return 1
  fi
  # Homebrew's opt/ links first: they survive `brew upgrade`, where pg_config's Cellar folder (…/18.6_1/bin) does not.
  for d in ${BREW_PREFIX:+"$BREW_PREFIX/opt/postgresql@18/bin" "$BREW_PREFIX/opt/postgresql@17/bin" "$BREW_PREFIX/opt/postgresql@16/bin" "$BREW_PREFIX/opt/postgresql/bin"} \
           $PG_SYSTEM_DIRS \
           "$(dirname "$(command -v pg_ctl 2>/dev/null || echo /nonexistent/pg_ctl)")" "$(command -v pg_config >/dev/null 2>&1 && pg_config --bindir || true)"; do
    pg_ok "$d" || continue; v=$(pg_major "$d"); [ -n "$v" ] && [ "$v" -ge 16 ] || continue
    if [ -n "$want" ]; then [ "$v" = "$want" ] && { echo "$d"; return 0; }; continue; fi
    [ "$v" = 18 ] && { echo "$d"; return 0; }   # the team's major; a newer one is used only when there is no 18
    [ "$v" -gt "$bestv" ] && { best="$d"; bestv="$v"; }
  done
  [ -n "$best" ] && echo "$best"
}
py_ver() { "$1" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || true; }
find_python() {  # the form helpers' lock is for CPython 3.14 (cffi's cp314 wheel)
  local p
  if [ -n "${STUDIO_PYTHON:-}" ]; then [ -x "$STUDIO_PYTHON" ] && [ "$(py_ver "$STUDIO_PYTHON")" = 3.14 ] && { echo "$STUDIO_PYTHON"; return 0; }; return 1; fi
  for p in "$(command -v python3.14 2>/dev/null || true)" "${BREW_PREFIX:+$BREW_PREFIX/opt/python@3.14/bin/python3.14}" \
           /Library/Frameworks/Python.framework/Versions/3.14/bin/python3.14 "$HOME"/.pyenv/versions/3.14*/bin/python3.14 \
           "$HOME"/.local/share/uv/python/cpython-3.14*/bin/python3.14 "$(command -v python3 2>/dev/null || true)"; do
    [ -n "$p" ] && [ -x "$p" ] || continue
    [ "$(py_ver "$p")" = 3.14 ] && { echo "$p"; return 0; }
  done; return 1
}

# ---- the database URL -----------------------------------------------------------------------------------------------
psql_url() { printf '%s' "$1" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//'; }   # Prisma's ?schema= is not libpq's
safe_url() { printf '%s' "$1" | sed -E 's#(://[^:/@]+):[^@]*@#\1:***@#'; }            # never print a password

# ---- the finished story's job (GET /api/demo/status) -----------------------------------------------------------------
# Every call ends with an answer, even when the API is gone: a failed curl inside a pipe would otherwise stop the script
# with no message under pipefail (review M1).
api_get() { curl -s -m 10 "localhost:$PORT/api$1" -H "x-actor: user-A" || true; }
story_state() { api_get /demo/status | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).story?.state??"?")}catch{console.log("?")}})' || echo "?"; }
wait_story() {  # $1: polls before giving up (default 400, 20 min at 3 s); prints the last state: done, failed, ? (no answer) or running
  local state=running i=0
  while [ "$state" = running ] && [ "$i" -lt "${1:-400}" ]; do sleep "${STORY_POLL_S:-3}"; i=$((i + 1)); state=$(story_state); done
  echo "$state"
}

stop_all() {
  local pids PGB; pids=$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  [ -n "$pids" ] && kill $pids 2>/dev/null && say "api on :$PORT stopped"
  [ -n "$OWN_DB" ] && [ -f "$PGDATA_DIR/PG_VERSION" ] || return 0
  # The cluster is stopped by the PostgreSQL it was made with; without it, say so rather than leave it running quietly.
  PGB=$(find_pg "$(cat "$PGDATA_DIR/PG_VERSION")") || { say "database not stopped: PostgreSQL $(cat "$PGDATA_DIR/PG_VERSION"), which made $PGDATA_DIR, is not found (STUDIO_PG_BIN=<its bin folder> bash $0 stop)"; return 0; }
  "$PGB/pg_ctl" -D "$PGDATA_DIR" status >/dev/null 2>&1 || return 0
  "$PGB/pg_ctl" -D "$PGDATA_DIR" -m fast stop >/dev/null && say "database stopped (data kept in $PGDATA_DIR)"
  return 0
}
if [ -n "${NEW_MACHINE_LIB:-}" ]; then return 0 2>/dev/null || exit 0; fi

[ "${1:-}" = stop ] && { stop_all; exit 0; }
[ -z "${1:-}" ] || die "usage: new-machine.sh [stop]"
[ "$(uname -s)" = Darwin ] || say "note: made for a Mac; on Linux the cloud's setup is product/tools/cloud-setup.sh"

say "== tools"
NODE_BIN=$(find_node) || die "Node 24 not found (the studio's package.json asks for 24.21.0; found: $(node -v 2>/dev/null || echo none)${STUDIO_NODE_BIN:+; STUDIO_NODE_BIN=$STUDIO_NODE_BIN is not a Node 24 bin folder}).
  Install it, then run this again. Either: brew install node@24
  or the official installer https://nodejs.org/dist/v24.21.0/node-v24.21.0.pkg, checked against
  https://nodejs.org/dist/v24.21.0/SHASUMS256.txt (shasum -a 256 node-v24.21.0.pkg).
  Installed somewhere else? STUDIO_NODE_BIN=<its bin folder> bash $0"
export PATH="$NODE_BIN:$PATH"
[ "$(node -v)" = v24.21.0 ] || say "note: Node $(node -v); the team pins v24.21.0 (package.json engines), any 24 runs the Studio"
say "node $(node -v) ($NODE_BIN)"
PGB=""
if [ -n "$OWN_DB" ]; then
  want=""; [ -f "$PGDATA_DIR/PG_VERSION" ] && want=$(cat "$PGDATA_DIR/PG_VERSION")
  if [ -n "$want" ]; then
    PGB=$(find_pg "$want") || die "the Studio's database in $PGDATA_DIR was made with PostgreSQL $want, which is no longer found${STUDIO_PG_BIN:+ at STUDIO_PG_BIN=$STUDIO_PG_BIN}.
  Install PostgreSQL $want again (brew install postgresql@$want), or name its bin folder: STUDIO_PG_BIN=<folder> bash $0"
  else
    PGB=$(find_pg) || die "PostgreSQL 16 or newer not found (18 preferred)${STUDIO_PG_BIN:+; STUDIO_PG_BIN=$STUDIO_PG_BIN is not a PostgreSQL 16+ bin folder}.
  Install it, then run this again. Either: brew install postgresql@18   (no need to start its service: this script runs
  its own cluster on 127.0.0.1:$PGPORT) or Postgres.app from https://postgresapp.com (PostgreSQL 18).
  Installed somewhere else? STUDIO_PG_BIN=<its bin folder> bash $0. Already running a server? DATABASE_URL=<its url> bash $0"
  fi
elif ! command -v psql >/dev/null 2>&1; then
  PGB=$(find_pg) || die "DATABASE_URL is set but no PostgreSQL client (psql) was found: install PostgreSQL 16+ (brew install postgresql@18) or name it with STUDIO_PG_BIN"
fi
[ -n "$PGB" ] && { export PATH="$PGB:$PATH"; say "postgresql $(pg_major "$PGB") ($PGB)"; }
PY=$(find_python) || die "Python 3.14 not found (the form helpers' lock, prototype/env/requirements.lock, is for 3.14).
  Install it, then run this again. Either: brew install python@3.14
  or the official installer https://www.python.org/downloads/release/python-3140/ (macOS 64-bit universal2), checked
  against the SHA-256 on that page. Installed somewhere else? STUDIO_PYTHON=<its python3.14> bash $0"
say "python $(py_ver "$PY") ($PY)"
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
# A venv made by another Python (an older 3.x) cannot take the 3.14 wheels: it is made again.
[ -x "$VENV/bin/python" ] && [ "$(py_ver "$VENV/bin/python")" != 3.14 ] && { say "the form helpers' environment is Python $(py_ver "$VENV/bin/python"): making it again with 3.14"; rm -rf "$VENV" "$STAMPS/py-lock"; }
if [ -x "$VENV/bin/python" ] && fresh py-lock "$LOCK"; then say "form helpers up to date"
else
  [ -x "$VENV/bin/python" ] || "$PY" -m venv "$VENV" || die "could not make the form helpers' Python environment ($VENV)"
  "$VENV/bin/python" -m pip install -q --disable-pip-version-check --require-hashes --no-deps --only-binary :all: -r "$LOCK" || die "pip could not install the form helpers' packages (above)"
  stamp py-lock "$LOCK"
fi
"$VENV/bin/python" -I -c "import pypdf, cryptography, zxingcpp" || die "the form helpers' packages do not import: ask the tech lead"
say "form helpers ready"

say "== database"
PSQL_URL=$(psql_url "$DB_URL")
if [ -n "$OWN_DB" ]; then
  if [ ! -f "$PGDATA_DIR/PG_VERSION" ]; then
    mkdir -p "$PGDATA_DIR"
    initdb -D "$PGDATA_DIR" -U xr_studio -A trust -E UTF8 --locale=en_US.UTF-8 >/dev/null || die "initdb could not create the cluster in $PGDATA_DIR"
    say "cluster created ($PGDATA_DIR, role xr_studio)"
    # Its own port, local connections only (TCP; no socket file outside the copy). The zone stays the Mac's own, as the
    # demo's cluster does.
    printf '%s\n' "port = $PGPORT" "listen_addresses = '127.0.0.1'" "unix_socket_directories = ''" >> "$PGDATA_DIR/postgresql.conf"
  fi
  if pg_ctl -D "$PGDATA_DIR" status >/dev/null 2>&1; then say "cluster already running"
  else
    if lsof -ti tcp:"$PGPORT" -sTCP:LISTEN >/dev/null 2>&1; then die "port $PGPORT is taken by another program: STUDIO_PGPORT=<a free port> bash $0, or DATABASE_URL=<that server's url> bash $0"; fi
    # The port is given on the command line too, so an older cluster made by hand with another port still lands here.
    LC_ALL=en_US.UTF-8 pg_ctl -D "$PGDATA_DIR" -o "-p $PGPORT" -l "$PGDATA_DIR/server.log" -w start >/dev/null || { tail -20 "$PGDATA_DIR/server.log"; die "the cluster did not start"; }
    say "cluster started (127.0.0.1:$PGPORT)"
  fi
  createdb -h 127.0.0.1 -p "$PGPORT" -U xr_studio xr_studio_demo 2>/dev/null && say "database xr_studio_demo created" || true
else
  base="${PSQL_URL%%\?*}"; query="${PSQL_URL#"$base"}"; dbname="${base##*/}"
  if ! psql "$PSQL_URL" -XAtqc "select 1" >/dev/null 2>&1; then
    psql "${base%/*}/postgres$query" -XAtqc "create database \"$dbname\"" >/dev/null 2>&1 && say "database $dbname created" || die "cannot reach or create the database $dbname at $(safe_url "$DB_URL")"
  fi
fi
psql "$PSQL_URL" -XAtqc "select 1" >/dev/null || die "cannot connect to $(safe_url "$DB_URL")"
export DATABASE_URL="$DB_URL"
cd "$STUDIO"
export PRISMA_HIDE_UPDATE_MESSAGE=1   # the team pins Prisma 7.8.0; its "update available" box is noise here
out=$(./node_modules/.bin/prisma migrate deploy 2>&1) || { printf '%s\n' "$out"; die "the migrations did not apply"; }
out=$(./node_modules/.bin/prisma generate 2>&1) || { printf '%s\n' "$out"; die "prisma generate failed"; }
say "database schema up to date"

say "== web app and api"
mkdir -p var
bash tools/web-fresh.sh build || die "the web build failed (var/web-build.log)"
# Live AI off by construction: no STUDIO_*_LIVE switch reaches the API, whatever the shell had (and no key file exists).
for v in $(env | sed -n 's/^\(STUDIO_[A-Z0-9_]*_LIVE\)=.*/\1/p'); do unset "$v"; done
STUDIO_PORT="$PORT" zsh tools/restart-api.sh >/dev/null 2>&1 || { tail -30 var/api.log; die "the API did not start (its log: $STUDIO/var/api.log)"; }
say "api up on :$PORT"

say "== demo content"
programs=$(psql "$PSQL_URL" -XAtqc 'select count(*) from program_def' 2>/dev/null || echo "?")
[ "$programs" = "?" ] && die "cannot read the database $(safe_url "$DB_URL") (program_def)"
if [ "$programs" = 0 ]; then
  say "empty database: loading the six and the finished story (a few minutes; replays only, no AI call)"
  code=$(curl -s -m 30 -o /dev/null -w '%{http_code}' -X POST "localhost:$PORT/api/demo/checkpoints/finished-story" -H "x-actor: user-A" -H "content-type: application/json" -d '{}' || true)
  [ "$code" = 202 ] || die "the finished story did not start (answer ${code:-none})"
  state=$(wait_story)
  [ "$state" = "?" ] && die "the API stopped answering while the story loaded (its log: $STUDIO/var/api.log); run this again to restart it, then Demo › Load the finished story (it empties the half-loaded demo first)"
  [ "$state" = running ] && die "the finished story was still loading after 20 minutes: Demo › Load the finished story shows how far it got"
  api_get /demo/status | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j;try{j=JSON.parse(s)}catch{return console.log("finished story: no answer from the API")}const t=j.story||{};
    const st=t.stages||[];const n=k=>st.filter(x=>x.status===k).length;
    console.log(t.state==="done"?`finished story loaded in ${Math.round(t.seconds)} s: ${n("done")} stages done, ${n("partial")} partly, ${n("waiting")} waiting (checkpoint: ${j.checkpoint})`:`finished story: ${t.state} ${t.error??""}`);
    for (const x of st) if (x.status!=="done") console.log(`  ${x.status}: ${x.title}${x.why?" ("+x.why+")":""}`)})' || true
  [ "$state" = done ] || die "the finished story did not finish (Demo › Load the finished story shows why; the API log: $STUDIO/var/api.log)"
else say "the database has content ($programs programs): kept as it is (Demo › Load the finished story reloads it)"; fi

[ -n "$(ls -A "${STUDIO_VALIDATED_DIR:-$TOOLS/validated-imm5257}" 2>/dev/null)" ] || say "note: no Adobe-validated Paper form in $TOOLS/validated-imm5257 (it lives on the founder's Mac, never in git): 4 of the story's 8 stages stay partly done; product/SECOND-MAC.md §3"
git -C "$ROOT" config core.hooksPath .githooks 2>/dev/null || true   # the push guard (AGENTS.md rule 1)
# The agent's checks (isolated.sh, run-suites.sh) find Node and PostgreSQL only on the PATH: say what to add when missing.
add=""; for d in "$NODE_BIN" ${PGB:+"$PGB"}; do case ":$ORIG_PATH:" in *":$d:"*) ;; *) add="$add$d:";; esac; done
[ -n "$add" ] && say "for your agent's checks, put these first on the PATH (e.g. in ~/.zprofile): export PATH=\"$add\$PATH\""
say "Product Studio: http://localhost:$PORT   (stop: bash ${0#$ROOT/} stop)"
