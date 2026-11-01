#!/bin/zsh
# Runs pack 4 (Visitor visa M3 path) on its own isolated copy: fresh database, release 1 (setup_visitor_visa.ts),
# release 2 (setup_vv_m3.ts), then every test; C10.2 last on a second fresh copy. US$0, no live AI. Prints one line per
# test file with its pass count; exit 0 only when every test passes.
#   zsh studio/acceptance/lib/run_pack4.sh [port]   (default 4449, the tech lead's port for pack 4)
STUDIO="${0:A:h:h:h}"; PROTO="${STUDIO:h}"; PORT="${1:-4449}"; NAME=accept_pack4; DB="xr_studio_$NAME"
ROOT="${STUDIO:h:h:h:h}"; export PATH="$ROOT/.tools/node-v24.21.0/bin:$PATH"
TSX="$STUDIO/node_modules/.bin/tsx"; OUT="$STUDIO/var/acceptance-pack4"; mkdir -p "$OUT"
cd "$PROTO"
zsh studio/tools/isolated.sh $NAME $PORT start >/dev/null || exit 1
$TSX studio/tests/runtime/setup_visitor_visa.ts $PORT $DB > "$OUT/setup_r1.log" 2>&1; echo "setup release 1: $(tail -1 $OUT/setup_r1.log)"
$TSX studio/acceptance/lib/setup_vv_m3.ts $PORT $DB > "$OUT/setup_r2.log" 2>&1; echo "setup release 2: $(tail -1 $OUT/setup_r2.log)"
fails=0
for t in C6.11 C6.12 C11.6 C6.4 C6.5 C6.9 C7.7 C7.3 C7.5 C8.1 C8.2 C9.2 C7.6; do  # C7.6 last: it moves edition dates (restored at its end)
  $TSX studio/acceptance/$t.test.ts $PORT $DB > "$OUT/$t.log" 2>&1 || fails=$((fails+1)); echo "$t: $(tail -1 $OUT/$t.log)"
done
zsh studio/tools/isolated.sh $NAME $PORT start >/dev/null && { $TSX studio/acceptance/C10.2.test.ts $PORT $DB > "$OUT/C10.2.log" 2>&1 || fails=$((fails+1)); echo "C10.2: $(tail -1 $OUT/C10.2.log)"; }
zsh studio/tools/isolated.sh $NAME $PORT stop >/dev/null
echo "logs: $OUT"; exit $(( fails > 0 ))
