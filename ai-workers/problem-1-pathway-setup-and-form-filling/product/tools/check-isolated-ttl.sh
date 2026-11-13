#!/usr/bin/env bash
# Guard 4 (founder, 6 Nov ~03:00 IST): no test copy left running. Runs the real studio/tools/isolated.sh in a throwaway
# studio whose database, server and port tools are stand-ins (a "server" is a process that holds a port file), with a
# minute shortened to a second (ISOLATED_TTL_UNIT=1): a copy stops itself at its --ttl, a stop or a new start ends the
# old timer, start refuses a 5th copy, and the qa and next skills start and stop a copy in the same command. Needs zsh.
#   bash product/tools/check-isolated-ttl.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
command -v zsh >/dev/null || { echo "zsh is missing; nothing was checked"; exit 2; }
T=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$T" ] || { echo "no temp dir: nothing was checked"; exit 2; }; F="$T/fake"; mkdir -p "$F/bin" "$F/listen" "$F/db"
cleanup() { for f in "$F"/listen/*; do [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null; done; pkill -f "isolated-ttl.*$T" 2>/dev/null; rm -rf "$T"; }
trap cleanup EXIT
SRC="$TOOLS/../../prototype/studio"
S="$T/r/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio"; mkdir -p "$S/tools" "$S/node_modules/.bin" "$S/node_modules/.prisma/client" "$S/prisma/schema"
cp "$SRC/tools/isolated.sh" "$SRC/tools/test-copies.sh" "$S/tools/"
printf '#!/bin/bash\nexit 0\n' > "$S/tools/web-fresh.sh"; printf '#!/bin/bash\nexit 0\n' > "$S/node_modules/.bin/prisma"
touch "$S/prisma/schema/base.prisma"; sleep 1; touch "$S/node_modules/.prisma/client/index.js"
# A "server": holds $FAKE/listen/<port> while it runs; ends on TERM.
cat > "$S/node_modules/.bin/tsx" <<'EOF'
#!/bin/bash
echo $$ > "$FAKE/listen/$STUDIO_PORT"; trap 'rm -f "$FAKE/listen/$STUDIO_PORT"; kill $s 2>/dev/null; exit 0' TERM
while :; do sleep 30 & s=$!; wait $s; done
EOF
cat > "$F/bin/lsof" <<'EOF'
#!/bin/bash
alive() { [ -n "$1" ] && ps -o stat= -p "$1" 2>/dev/null | grep -qv Z; }
case "$*" in
  *"-ti tcp:"*) a="$*"; p=${a#*tcp:}; p=${p%% *}; pid=$(cat "$FAKE/listen/$p" 2>/dev/null); alive "$pid" && { echo "$pid"; exit 0; }; exit 1;;
  *) for f in "$FAKE"/listen/*; do [ -f "$f" ] || continue; pid=$(cat "$f"); alive "$pid" && echo "node $pid u 20u IPv4 0x1 0t0 TCP 127.0.0.1:${f##*/} (LISTEN)"; done;;
esac
EOF
cat > "$F/bin/curl" <<'EOF'
#!/bin/bash
for a in "$@"; do case "$a" in localhost:*) p=${a#localhost:}; p=${p%%/*};; esac; done
pid=$(cat "$FAKE/listen/$p" 2>/dev/null); [ -n "$pid" ] && ps -o stat= -p "$pid" 2>/dev/null | grep -qv Z && exit 0; exit 7
EOF
cat > "$F/bin/psql" <<'EOF'
#!/bin/bash
q=""; while [ $# -gt 0 ]; do [ "$1" = -c ] && q=$2; shift; done
case "$q" in
  "comment on database"*) db=${q#*\"}; db=${db%%\"*}; c=${q#* is \'}; echo "${c%\'}" > "$FAKE/db/$db";;
  *shobj_description*) db=${q##*datname = \'}; cat "$FAKE/db/${db%\'*}" 2>/dev/null;;
esac; exit 0
EOF
printf '#!/bin/bash\nfor a; do db=$a; done; rm -f "$FAKE/db/$db"; echo "dropdb $db" >> "$FAKE/log"\n' > "$F/bin/dropdb"
printf '#!/bin/bash\nfor a; do db=$a; done; echo "createdb $db" >> "$FAKE/log"\n' > "$F/bin/createdb"
printf '#!/bin/bash\nexit 0\n' > "$F/bin/pg_ctl"
chmod +x "$F/bin/"* "$S/tools/"*.sh "$S/node_modules/.bin/"*
iso() { out=$(cd "$T" && PATH="$F/bin:$PATH" FAKE="$F" ISOLATED_TTL_UNIT=1 zsh "$S/tools/isolated.sh" "$@" 2>&1); r=$?; }
live() { [ -n "$1" ] && ps -o stat= -p "$1" 2>/dev/null | grep -qv Z; }   # a zombie is not alive
up() { live "$(cat "$F/listen/$1" 2>/dev/null)"; }
waitfor() { local i; for i in $(seq 1 "$2"); do eval "$1" && return 0; sleep 1; done; return 1; }
timer() { cat "$S/var/isolated-ttl/$1.pid" 2>/dev/null; }

iso qa_a 4471 start --ttl 3
ok "a copy started with --ttl 3 answers and names its stop time" "$([ $r = 0 ] && up 4471 && echo "$out" | grep -q 'stops itself in 3 min' && echo 1)" "exit $r: $out"
waitfor '! up 4471' 30; ok "... and stops itself when its ttl is reached" "$( ! up 4471 && echo 1)" "still listening on 4471"
waitfor '[ "$(grep -c "dropdb xr_studio_qa_a" "$F/log")" = 2 ]' 20; ok "... dropping its database and files" "$([ "$(grep -c 'dropdb xr_studio_qa_a' "$F/log")" = 2 ] && [ ! -d "$S/var/isolated-qa_a" ] && echo 1)" "$(cat "$F/log")"

iso qa_b 4472 start; t=$(timer qa_b)
ok "with no --ttl the timer is set to 60 minutes" "$([ $r = 0 ] && ps -p "$t" -o command= | grep -q 'isolated-ttl 60 ' && echo 1)" "timer $t: $(ps -p "$t" -o command= 2>/dev/null)"
iso qa_b 4499 stop; ok "a stop on another port leaves the copy running, so its timer stays (review m3)" "$([ $r = 0 ] && up 4472 && live "$t" && echo 1)" "exit $r: $out"
iso qa_b 4472 stop; ok "stop ends the timer too" "$([ $r = 0 ] && ! up 4472 && ! live "$t" && echo 1)" "exit $r: $out"

iso qa_c 4473 start --ttl 2; t1=$(timer qa_c); iso qa_c 4473 start --ttl 30
ok "a new start of the same name ends the earlier timer" "$([ $r = 0 ] && ! live "$t1" && echo 1)" "old timer $t1 alive"
sleep 4; ok "... so the new copy outlives the earlier ttl" "$(up 4473 && echo 1)" "4473 stopped early"
iso qa_c 4473 stop

iso qa_x 4420 start; iso qa_y 4431 start; iso qa_z 4452 start; iso qa_w 4479 start
iso qa_d 4474 start
ok "start refuses a 5th copy, naming the four ports" "$([ $r = 1 ] && echo "$out" | grep -q 'refused: 4 test copies already run (ports 4420 4431 4452 4479)' && ! up 4474 && echo 1)" "exit $r: $out"
iso qa_w 4479 restart
ok "restarting one of the four on its own port is allowed" "$([ $r = 0 ] && up 4479 && echo 1)" "exit $r: $out"
iso qa_w 4479 stop; iso qa_d 4474 start
ok "with three running, a 4th starts" "$([ $r = 0 ] && up 4474 && echo 1)" "exit $r: $out"
for c in "qa_x 4420" "qa_y 4431" "qa_z 4452" "qa_d 4474"; do iso $c stop; done
iso ttl 4475 start; ok "the names ttl and logs are refused (folders of var/)" "$([ $r = 2 ] && echo 1)" "exit $r: $out"
iso qa_e 4475 start --ttl 0; ok "--ttl 0 is refused (every copy stops itself)" "$([ $r = 2 ] && echo 1)" "exit $r: $out"

SK="$(cd "$TOOLS/../../../.." && pwd)/.claude/skills"
for s in qa next; do grep -qE "isolated\.sh [^\`]* start [^\`]*&& trap [^\`]*isolated\.sh [^\`]* stop" "$SK/$s/SKILL.md"
  ok "skill $s starts and stops its copy in the same command" "$([ $? = 0 ] && echo 1)" "no 'start ... && trap ... stop' in $s"; done
finish
