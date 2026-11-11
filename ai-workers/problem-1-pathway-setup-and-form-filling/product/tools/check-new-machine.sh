#!/usr/bin/env bash
# B168: tests of prototype/studio/tools/new-machine.sh's own logic, each with the case that failed in review (#1526):
#   M1  the API gone while the finished story loads: the wait ends with "?" (so the run stops with its message), never a
#       silent exit under set -euo pipefail;
#   M2  PostgreSQL: STUDIO_PG_BIN is used alone, an existing cluster's major is the one used, 18 wins over a newer major;
#   m1  Homebrew's prefix from a brew reached through a relative link (Intel's /usr/local/bin/brew -> ../Homebrew/bin/brew);
#   m4  DATABASE_URL: Prisma's ?schema= dropped for psql, sslmode kept, a password never printed.
# The script is sourced with NEW_MACHINE_LIB=1 (functions only; nothing installs, starts or connects). Fakes live in a
# scratch folder. Needs bash (3.2 is the Mac's) and node; US$0, no network, no database.
#   bash product/tools/check-new-machine.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; NM="${NEW_MACHINE_SCRIPT:-$HERE/../../prototype/studio/tools/new-machine.sh}"   # NEW_MACHINE_SCRIPT: a mutated copy, to prove each test fails without its fix
T="$(mktemp -d "${TMPDIR:-/tmp}/check-new-machine.XXXXXX")"; trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok() { if [ "$2" = "$3" ]; then pass=$((pass + 1)); echo "PASS  $1"; else fail=$((fail + 1)); echo "FAIL  $1 — expected [$3], got [$2]"; fi; }
# The script under test sees only this test's folders, never the host's: $T/bin holds links to the few commands the
# functions use, so a PostgreSQL installed on the machine (GitHub's Linux runner has 18 in /usr/lib/postgresql, with
# pg_config in /usr/bin) is never found by the PATH steps of find_pg.
BASH_BIN="$(command -v bash)"; mkdir -p "$T/path" "$T/bin"
for c in dirname sed head cat tr sleep curl node; do ln -s "$(command -v "$c")" "$T/bin/$c"; done
lib() { (NEW_MACHINE_LIB=1 NEW_MACHINE_BREW_PREFIX="${FAKE_BREW-}" NEW_MACHINE_PG_SYSTEM_DIRS="" PATH="$T/path:$T/bin" \
  "$BASH_BIN" -c 'set -euo pipefail; . "$1"; shift; "$@"' lib "$NM" "$@"); }
ok "host: the script under test finds no PostgreSQL but the test's own (no fake installed: not found)" "$(lib find_pg; echo "exit $?")" "exit 1"

# M1: nothing listens on the port (the API died): each poll answers "?", and the wait returns it under errexit+pipefail.
FREE=$(node -e 'const s=require("net").createServer().listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>console.log(p))})')
out=$(STUDIO_PORT=$FREE STORY_POLL_S=0 lib wait_story 3; echo "exit $?")
ok "M1: the API gone mid-load: wait_story ends with ? and the script goes on to its message" "$(echo "$out" | tr '\n' ' ')" "? exit 0 "
# The fail case the test must catch: the pre-review polling line (a bare curl in a pipe under pipefail) ends the shell.
old=$(STUDIO_PORT=$FREE bash -c 'set -euo pipefail; state=$(curl -s "localhost:$STUDIO_PORT/api/demo/status" | cat); echo "went on"'; echo "exit $?")
ok "M1 fail case: the pre-review line stops silently (curl exit 7 under pipefail)" "$(echo "$old" | tr '\n' ' ')" "exit 7 "

# M2: fake PostgreSQL bin folders (postgres --version prints the major).
fakepg() { mkdir -p "$1"; for x in pg_ctl initdb psql createdb; do printf '#!/bin/sh\nexit 0\n' > "$1/$x"; chmod +x "$1/$x"; done
  printf '#!/bin/sh\necho "postgres (PostgreSQL) %s.1"\n' "$2" > "$1/postgres"; chmod +x "$1/postgres"; }
B="$T/brew"; fakepg "$B/opt/postgresql@18/bin" 18; fakepg "$B/opt/postgresql/bin" 19; fakepg "$B/opt/postgresql@16/bin" 16; fakepg "$T/own16" 16
ok "M2: 18 is chosen when 16, 18 and a newer 19 are installed" "$(FAKE_BREW=$B lib find_pg)" "$B/opt/postgresql@18/bin"
ok "M2: STUDIO_PG_BIN is used alone, even with a newer major installed" "$(FAKE_BREW=$B STUDIO_PG_BIN=$T/own16 lib find_pg)" "$T/own16"
ok "M2: a cluster made with 19 gets the 19 install, not 18" "$(FAKE_BREW=$B lib find_pg 19)" "$B/opt/postgresql/bin"
ok "M2: a cluster made with 17, with no 17 installed: not found (the run then says to install 17)" "$(FAKE_BREW=$B lib find_pg 17; echo "exit $?")" "exit 1"
ok "M2: STUDIO_PG_BIN of another major than the cluster's: refused" "$(FAKE_BREW=$B STUDIO_PG_BIN=$T/own16 lib find_pg 18; echo "exit $?")" "exit 1"
ok "M2: STUDIO_PG_BIN that is not a PostgreSQL folder: refused" "$(FAKE_BREW=$B STUDIO_PG_BIN=$T/nothing lib find_pg; echo "exit $?")" "exit 1"
rm -rf "$B/opt/postgresql@18"
ok "M2: no 18: the newest of 16 and up" "$(FAKE_BREW=$B lib find_pg)" "$B/opt/postgresql/bin"

# m1: Intel Homebrew's layout: /usr/local/bin/brew is a relative link to ../Homebrew/bin/brew; brew --prefix fails here.
I="$T/usrlocal"; mkdir -p "$I/bin" "$I/Homebrew/bin" "$I/opt"; printf '#!/bin/sh\nexit 1\n' > "$I/Homebrew/bin/brew"; chmod +x "$I/Homebrew/bin/brew"
(cd "$I/bin" && ln -s ../Homebrew/bin/brew brew)
got=$(cd "$T" && NEW_MACHINE_LIB=1 PATH="$I/bin:$T/bin" "$BASH_BIN" -c 'set -euo pipefail; . "$1"; brew_prefix' lib "$NM"; echo "exit $?")
ok "m1: Homebrew's prefix through a relative brew link" "$(echo "$got" | tr '\n' ' ')" "$I exit 0 "

# m4: DATABASE_URL.
ok "m4: Prisma's ?schema= dropped for psql" "$(lib psql_url 'postgresql://u@127.0.0.1:5432/db?schema=public')" "postgresql://u@127.0.0.1:5432/db"
ok "m4: sslmode kept beside schema" "$(lib psql_url 'postgresql://u@h/db?schema=public&sslmode=require')" "postgresql://u@h/db?sslmode=require"
ok "m4: a password is never printed" "$(lib safe_url 'postgresql://u:s3cret@h:5432/db')" "postgresql://u:***@h:5432/db"

echo "$pass passed, $fail failed"
[ "$fail" = 0 ]
