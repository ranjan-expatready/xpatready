#!/bin/bash
# Fixture test for ai-workers/tools/snapshot.sh (AIW-D256). Usage: test_snapshot.sh <script> <workdir>
SCRIPT="$1"; W="$2"; PASS=0; FAIL=0
ok(){ if eval "$2"; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1"; fi; }
T="$W/fixture"; rm -rf "$T" "$W/fixture2"; P="$T/ai-workers/problem-1-pathway-setup-and-form-filling"
D="$T/archive/ai-workers/snapshots"; E="$W/stderr.txt"; : > "$E"
mkdir -p "$P" "$T/ai-workers/tools/s3/sub" "$T/ai-workers/tools/s3/__pycache__" "$T/ai-workers/checks" "$T/archive/ai-workers"
echo next > "$T/ai-workers/NEXT.md"; echo page > "$P/solution-1-one-pager.html"; echo data > "$T/ai-workers/tools/s3/s3_data.py"
echo sub > "$T/ai-workers/tools/s3/sub/x.py"; echo noext > "$T/ai-workers/tools/s3/Makefile"; echo pyc > "$T/ai-workers/tools/s3/__pycache__/a.pyc"
echo led > "$T/ai-workers/checks/one-pager-draft-9-content-ledger-2026.md"; echo other > "$T/ai-workers/checks/unrelated.md"
echo d1 > "$T/archive/ai-workers/s3_data-v3-draft1-2026-10-17.py"
run(){ CLAUDE_PROJECT_DIR="$T" bash "$SCRIPT" 2>>"$E"; RC=$?; }
cnt(){ ls "$D" | grep -c -- "$1"; }

run
ok "1 exit 0 on first run" '[ $RC -eq 0 ]'
ok "1 legacy file saved with original naming" '[ $(cnt "^NEXT@") -eq 1 ]'
ok "1 spec page saved, path-qualified" '[ $(cnt "^ai-workers__problem-1-pathway-setup-and-form-filling__solution-1-one-pager@.*\.html$") -eq 1 ]'
ok "1 folder entry covers nested file" '[ $(cnt "^ai-workers__tools__s3__sub__x@") -eq 1 ]'
ok "1 file without extension saved" '[ $(cnt "^ai-workers__tools__s3__Makefile@[0-9a-f]\{10\}-[0-9T-]*$") -eq 1 ]'
ok "1 pycache excluded" '[ $(cnt "__pycache__") -eq 0 ]'
ok "1 wildcard ledger output saved" '[ $(cnt "one-pager-draft-9-content-ledger") -eq 1 ]'
ok "1 non-matching file not saved" '[ $(cnt "unrelated") -eq 0 ]'
ok "1 archive ledger input saved" '[ $(cnt "^archive__ai-workers__s3_data-v3-draft1") -eq 1 ]'
ok "1 every saved line has a file" 'for n in $(grep " saved " "$D/INDEX.log" | sed "s/.* as //"); do [ -f "$D/$n" ] || exit 1; done'
N1=$(ls "$D" | grep -c @)

run
ok "2 unchanged rerun saves nothing" '[ $(ls "$D" | grep -c @) -eq $N1 ]'
ok "2 no new log lines" '[ $(grep -c " saved " "$D/INDEX.log") -eq $N1 ]'

echo data2 > "$T/ai-workers/tools/s3/s3_data.py"; run
ok "3 changed version saved alongside old" '[ $(cnt "^ai-workers__tools__s3__s3_data@") -eq 2 ]'

mkdir -p "$T/ai-workers/tools/s3-working" "$P/prototype/expected"
echo data2 > "$T/ai-workers/tools/s3-working/s3_data.py"; echo t > "$P/prototype/expected/trace.csv"; echo c > "$P/conflict-table-2026-10-20.md"
run
ok "4 later-created working file saved even if content equals another path" '[ $(cnt "^ai-workers__tools__s3-working__s3_data@") -eq 1 ]'
ok "4 later-created prototype file in new subfolder saved" '[ $(cnt "prototype__expected__trace@") -eq 1 ]'
ok "4 later-created wildcard match saved" '[ $(cnt "conflict-table-2026-10-20@") -eq 1 ]'

chmod 000 "$T/ai-workers/tools/s3/sub/x.py"; echo x2 > /dev/null; run
ok "5 unreadable source: exit 0" '[ $RC -eq 0 ]'
ok "5 unreadable source: FAILED logged" 'tail -1 "$D/INDEX.log" | grep -q "FAILED ai-workers/tools/s3/sub/x.py (cannot read or hash)"'
ok "5 unreadable source: reported on stderr" 'grep -q "FAILED ai-workers/tools/s3/sub/x.py" "$E"'
chmod 644 "$T/ai-workers/tools/s3/sub/x.py"

echo page2 > "$P/solution-1-one-pager.html"; chmod 555 "$D"; run
ok "6 copy failure: exit 0" '[ $RC -eq 0 ]'
ok "6 copy failure: FAILED logged, not saved" 'tail -1 "$D/INDEX.log" | grep -q "FAILED ai-workers/problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html (copy not saved)"'
ok "6 copy failure: no partial file left" '[ $(ls -a "$D" | grep -c partial) -eq 0 ]'
ok "6 copy failure: only one page version present" '[ $(cnt "solution-1-one-pager@") -eq 1 ]'
chmod 755 "$D"; run
ok "6 retry after failure saves the new version" '[ $(cnt "solution-1-one-pager@") -eq 2 ] && tail -1 "$D/INDEX.log" | grep -q " saved .*solution-1-one-pager.html as "'

mkdir -p "$W/fixture2/ai-workers"; touch "$W/fixture2/archive"
CLAUDE_PROJECT_DIR="$W/fixture2" bash "$SCRIPT" 2>"$W/stderr2.txt"; RC=$?
ok "7 destination cannot be created: exit 0 and reported" '[ $RC -eq 0 ] && grep -q "FAILED cannot create" "$W/stderr2.txt"'

ok "8 every saved copy matches the hash in its name" 'cd "$D" && for f in *@*; do h=${f##*@}; h=${h:0:10}; [ "$(shasum -a 256 "$f" | cut -c1-10)" = "$h" ] || exit 1; done'
ok "8 snapshots folder never snapshots itself" '[ $(cnt "^archive__ai-workers__snapshots") -eq 0 ]'
echo "RESULT: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ]
