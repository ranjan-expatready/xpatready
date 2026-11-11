#!/usr/bin/env bash
# Cloud session setup (P-82): makes an ordinary GitHub clone runnable — Node 24, packages (npm ci), the Python
# form helpers (hash-pinned lock for this platform), PostgreSQL 18 with the studio and lane databases, the schema,
# zsh (start.sh and the studio tools are zsh scripts), and a check that the official PDFs committed under
# official-sources/ match their manifest checksums (P-83). Playwright browsers are preinstalled in the cloud image:
# never installed here. Safe to run again. Run once at the start of a cloud session:
#   bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/cloud-setup.sh
set -e
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
P="ai-workers/problem-1-pathway-setup-and-form-filling"; STUDIO="$P/prototype/studio"
NODE_VER=24.21.0; PGPORT="${PGPORT:-54329}"
SUDO=""; [ "$(id -u)" = 0 ] || SUDO="sudo -n"
apt_ready=""; apt() { command -v apt-get >/dev/null || return 1; [ -n "$apt_ready" ] || { $SUDO apt-get update -qq || true; apt_ready=1; }
  # Never prompt: a cloud image may already carry a config file (e.g. /etc/zsh/zshrc), so keep the existing one.
  $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq -o Dpkg::Options::=--force-confdef \
    -o Dpkg::Options::=--force-confold "$@" </dev/null >/dev/null; }

echo "== node $NODE_VER"
if [ ! -x "$ROOT/.tools/node-v$NODE_VER/bin/node" ] && [ "$(node -v 2>/dev/null)" != "v$NODE_VER" ]; then
  # Under .tools: the path start.sh, lane.sh and the studio tools already prepend.
  mkdir -p "$ROOT/.tools"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VER/node-v$NODE_VER-linux-x64.tar.xz" | tar -xJ -C "$ROOT/.tools"
  mv "$ROOT/.tools/node-v$NODE_VER-linux-x64" "$ROOT/.tools/node-v$NODE_VER"
fi
[ -x "$ROOT/.tools/node-v$NODE_VER/bin/node" ] && export PATH="$ROOT/.tools/node-v$NODE_VER/bin:$PATH"
echo "node $(node -v) / npm $(npm -v)"

echo "== packages (npm ci)"
[ -d "$STUDIO/node_modules/.bin" ] && echo "already installed" || (cd "$STUDIO" && npm ci --no-fund --no-audit)

echo "== prototype packages (contracts and AI runner, AIW-D259; prototype/node_modules links here)"
PN="$ROOT/.tools/solution-1-prototype/node"; PSRC="$P/prototype/env/node"
if [ -d "$PN/node_modules/ajv" ]; then echo "already installed"
elif [ -f "$PSRC/package-lock.json" ]; then mkdir -p "$PN" && cp "$PSRC/package.json" "$PSRC/package-lock.json" "$PN/" && (cd "$PN" && npm ci --no-fund --no-audit)
else echo "WARNING: $PSRC/package-lock.json is missing (the Mac's .tools/solution-1-prototype/node lock, P-82): the API cannot start"; fi

echo "== zsh and locale"
# P-214 (11 Nov 2026): GitHub's runners stopped resolving every *.ubuntu.com mirror, so apt failed with exit 100 in every
# CI job. When apt cannot install zsh, take it from Homebrew, which GitHub's Ubuntu runner image carries and which
# downloads from GitHub's own package registry, and link it to /usr/bin/zsh so every later step finds it.
brew_zsh() { local b=/home/linuxbrew/.linuxbrew/bin/brew; [ -x "$b" ] || return 1
  echo "apt could not install zsh; installing it with Homebrew instead" >&2
  HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_ANALYTICS=1 "$b" install --quiet zsh >/dev/null &&
    $SUDO ln -sf "$("$b" --prefix)/bin/zsh" /usr/bin/zsh; }
command -v zsh >/dev/null || apt zsh || brew_zsh
locale -a 2>/dev/null | grep -qi '^en_US.utf8$' || { apt locales && $SUDO locale-gen en_US.UTF-8 >/dev/null; } ||
  echo "WARNING: en_US.UTF-8 could not be installed (apt unreachable); continuing with the image's locales" >&2
command -v zsh >/dev/null && echo "zsh $(zsh --version | cut -d' ' -f2)"

echo "== python helpers (api PY path, hash-pinned)"
VENV="$ROOT/.tools/solution-1-prototype/.venv"
case "$(uname -s)" in Linux) LOCK="$P/prototype/env/requirements-linux.lock";; *) LOCK="$P/prototype/env/requirements.lock";; esac
if [ ! -x "$VENV/bin/python" ]; then
  [ -f "$LOCK" ] || { echo "missing $LOCK"; exit 1; }
  mkdir -p "$ROOT/.tools/solution-1-prototype"
  python3 -m venv "$VENV" 2>/dev/null || { apt python3-venv && python3 -m venv "$VENV"; }
  "$VENV/bin/pip" install -q --require-hashes --no-deps --only-binary :all: -r "$LOCK"
fi
"$VENV/bin/python" -c "import pypdf, cryptography, zxingcpp; print('pypdf', pypdf.__version__)"

echo "== postgresql 18 on 127.0.0.1:$PGPORT"
PGBIN=""
# The real binaries: on Linux never the /opt/homebrew stand-ins this script itself creates below.
case "$(uname -s)" in Linux) c=/usr/lib/postgresql/18/bin;; *) c=/opt/homebrew/opt/postgresql@18/bin;; esac
[ -x "$c/pg_ctl" ] && PGBIN="$c"
if [ -z "$PGBIN" ] && command -v apt-get >/dev/null; then
  # Ubuntu's stock repositories carry an older major: the official PGDG repository has 18.
  # Either step may fail where the network denies apt.postgresql.org: the npm fallback below then runs.
  apt postgresql-common || true
  [ -x /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh ] && { $SUDO /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null || true; }
  apt_ready=""; apt postgresql-18 || true; [ -x "$c/pg_ctl" ] && PGBIN="$c"
fi
if [ "$(uname -s)" = Linux ] && [ ! -x "$c/postgres" ] && command -v npm >/dev/null; then
  # Fallback when the cloud network denies apt.postgresql.org (25 Oct): the same PostgreSQL 18.3 server from the npm
  # registry (initdb, pg_ctl, postgres; checksum pinned), placed where the line above looks, so later runs find it.
  # The package has no client tools: the image's own (16) are linked beside it, which psql and createdb accept.
  # pg_dump 16 refuses an 18 server; no script uses it.
  EPG=@embedded-postgres/linux-x64@18.3.0-beta.17
  EPG_SHA='sha512-8orSD6NNopSLtjqir4dWQBrj+g8j1eJjWd9mB60A3xbWMzIBIPQpzT7XzbacW9YFSl/DejOLnRXfff+Wr13Tgw=='
  t=$(mktemp -d)
  if (cd "$t" && npm pack -q "$EPG" >/dev/null 2>&1) && [ "sha512-$(openssl dgst -sha512 -binary "$t"/*.tgz | base64 -w0)" = "$EPG_SHA" ]; then
    tar xzf "$t"/*.tgz -C "$t"; $SUDO mkdir -p "${c%/bin}"; $SUDO cp -R "$t/package/native/." "${c%/bin}/"
    node -e 'for (const l of require(process.argv[1])) console.log(l.source.replace(/^native\//, ""), l.target.replace(/^native\//, ""))' \
      "$t/package/native/pg-symlinks.json" | while read -r s d; do $SUDO ln -sf "${c%/bin}/$s" "${c%/bin}/$d"; done
    [ -x /usr/bin/psql ] || apt postgresql-client
    cl=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | grep -v "^$c\$" | sort -V | tail -1)
    for x in psql createdb dropdb pg_dump pg_restore; do [ -e "$c/$x" ] || [ ! -x "$cl/$x" ] || $SUDO ln -sf "$cl/$x" "$c/$x"; done
    PGBIN="$c"; echo "postgresql 18.3 from the npm registry (checksum verified)"
  else echo "postgresql 18 npm fallback failed (download or checksum)"; fi
  rm -rf "$t"
fi
[ -n "$PGBIN" ] && [ -x "$PGBIN/pg_ctl" ] || { echo "postgresql 18 not found and could not be installed"; exit 1; }
PGDATA="$ROOT/.tools/solution-1-prototype/pg18-data"
if [ "$(id -u)" = 0 ]; then
  # Cloud sessions run as root and PostgreSQL refuses root: the cluster belongs to the postgres user, and a pg_ctl
  # on PATH runs as that user, so start.sh, stop.sh and isolated.sh work unchanged. Client tools are linked as is.
  RUN="runuser -u postgres --"
  printf '#!/bin/sh\n# cloud-setup.sh: PostgreSQL refuses root; run pg_ctl as the postgres user.\nexec runuser -u postgres -- %s/pg_ctl "$@"\n' "$PGBIN" > /usr/local/bin/pg_ctl
  chmod +x /usr/local/bin/pg_ctl
  for t in psql createdb dropdb pg_dump pg_restore; do ln -sf "$PGBIN/$t" "/usr/local/bin/$t"; done
  mkdir -p "$PGDATA"; chown postgres "$PGDATA"; chmod 700 "$PGDATA"
else RUN=""; export PATH="$PGBIN:$PATH"; fi
if [ "$(uname -s)" = Linux ]; then
  # Compatibility with Mac paths still written in scripts and tests (BACKLOG B31): the Homebrew PostgreSQL tools, the
  # Google Chrome that Playwright's channel "chrome" opens (the cloud image's Chromium stands in where Chrome is
  # missing), and the Mac-only Playwright require path in three browser checks (served by the studio's playwright).
  # As root (cloud) or with sudo (CI runners).
  HB=/opt/homebrew/opt/postgresql@18/bin; $SUDO mkdir -p "$HB" /opt/homebrew/bin
  for t in psql createdb dropdb pg_dump pg_restore; do $SUDO ln -sf "$PGBIN/$t" "$HB/$t"; done
  if [ "$(id -u)" = 0 ]; then ln -sf /usr/local/bin/pg_ctl "$HB/pg_ctl"; else $SUDO ln -sf "$PGBIN/pg_ctl" "$HB/pg_ctl"; fi
  command -v pdftoppm >/dev/null || apt poppler-utils
  for t in openssl pdftoppm pdftotext pdfinfo python3 tesseract; do
    command -v "$t" >/dev/null && [ ! -e "/opt/homebrew/bin/$t" ] && $SUDO ln -sf "$(command -v "$t")" "/opt/homebrew/bin/$t"; done
  CR=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome 2>/dev/null | sort -V | tail -1)
  [ -x /opt/google/chrome/chrome ] || { [ -n "$CR" ] && $SUDO mkdir -p /opt/google/chrome && $SUDO ln -sf "$CR" /opt/google/chrome/chrome && echo "chrome channel -> $CR"; }
  MACPW=$(grep -rhoE '"/Users/[^"]*/node_modules/playwright"' "$STUDIO/tests" 2>/dev/null | head -1 | tr -d '"')
  [ -n "$MACPW" ] && [ ! -e "$MACPW" ] && $SUDO mkdir -p "$(dirname "$MACPW")" && $SUDO ln -sfn "$ROOT/$STUDIO/node_modules/playwright" "$MACPW"
fi
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  $RUN "$PGBIN/initdb" -D "$PGDATA" -U xr_studio -A trust -E UTF8 >/dev/null && echo "cluster created"
fi
if $RUN "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then echo "cluster already running"; else
  $RUN "$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PGPORT -k /tmp -h 127.0.0.1" -l "$PGDATA/server.log" -w start >/dev/null && echo "cluster started"
fi
# start.sh starts the cluster without -o: keep the port and address in the cluster's own configuration. The zone is
# the Mac's (America/Toronto), so checks that need a database zone other than UTC (QA-5) test the same thing here.
grep -q "^port = $PGPORT" "$PGDATA/postgresql.conf" 2>/dev/null || $RUN sh -c "printf '%s\n' \"port = $PGPORT\" \"listen_addresses = '127.0.0.1'\" \"unix_socket_directories = '/tmp'\" >> '$PGDATA/postgresql.conf'"
grep -q "^timezone = 'America/Toronto'" "$PGDATA/postgresql.conf" 2>/dev/null || $RUN sh -c "echo \"timezone = 'America/Toronto'\" >> '$PGDATA/postgresql.conf'"
$RUN "$PGBIN/pg_ctl" -D "$PGDATA" reload >/dev/null; sleep 1
echo "database zone: $("$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U xr_studio -d postgres -Atc 'show timezone')"
for db in xr_studio_demo xr_studio_screens xr_studio_forms xr_studio_evidence xr_studio_runtime xr_studio_qa; do
  "$PGBIN/createdb" -h 127.0.0.1 -p "$PGPORT" -U xr_studio "$db" 2>/dev/null || true
done

echo "== schema"
(cd "$STUDIO" && DATABASE_URL="postgresql://xr_studio@127.0.0.1:$PGPORT/xr_studio_demo" ./node_modules/.bin/prisma migrate deploy >/dev/null && ./node_modules/.bin/prisma generate >/dev/null && echo "migrations applied, client generated")
# Isolated copies (tools/isolated.sh) serve the same web build as :4400; start.sh is the only other builder.
bash "$STUDIO/tools/web-fresh.sh" build || echo "WARNING: web build failed"   # stamped (QA-181), so isolated copies do not rebuild it

echo "== official PDFs (committed, P-83; checked against the manifest checksums, P-31)"
if out=$(python3 "$P/official-sources/fetch_official_sources.py" 2>&1); then echo "$out" | tail -1
else echo "$out" | grep -E '^FAIL' | head -5; echo "$out" | tail -1
  echo "WARNING: official PDFs missing or different from the manifest; forms and evidence work needs them (ask the Lead)"; fi

git config core.hooksPath .githooks
echo "cloud setup done — studio on :4400:  zsh $STUDIO/start.sh   (lane copies: zsh $STUDIO/tools/isolated.sh <name> <port> start)"
