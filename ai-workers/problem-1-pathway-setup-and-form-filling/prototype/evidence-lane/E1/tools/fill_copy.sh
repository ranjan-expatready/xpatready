#!/bin/zsh
# E1: fill a copy of an official form with the proven writer (p5/fill.py, unchanged) and keep its report.
#   zsh …/evidence-lane/E1/tools/fill_copy.sh <form dir, e.g. imm1344> <set, e.g. complete> <version, e.g. v1>
# Reads   E1/<form>/values.<set>.json
# Writes  E1/<form>/<file>.<set>-<version>.as-written.pdf   (never opened in Adobe; kept as written)
#         E1/<form>/<file>.<set>-<version>.adobe.pdf        (byte copy that Adobe opens, validates and saves)
#         E1/<form>/runs/<set>-<version>.fill-report.json
set -eu
E1=${0:A:h:h}
ROOT=${E1:h:h:h:h:h}
PY=$ROOT/.tools/solution-1-prototype/.venv/bin/python
FORM=$1 SET=$2 VER=$3
DIR=$E1/$FORM
VALUES=$DIR/values.$SET.json
FILE=$($PY -I -c "import json,sys; print(json.load(open(sys.argv[1]))['form_file'])" $VALUES)
BASE=$DIR/${FILE%.pdf}.$SET-$VER
[[ ! -e $BASE.as-written.pdf ]] || { print "$BASE.as-written.pdf exists: use a new version"; exit 2; }
mkdir -p $DIR/runs
REQ=$(mktemp -t e1-fill)
$PY -I -c "import json,sys; v=json.load(open(sys.argv[1])); json.dump({'form_file': v['form_file'], 'values': v['values'], 'out': sys.argv[2]}, open(sys.argv[3], 'w'))" $VALUES $BASE.as-written.pdf $REQ
$PY -I $E1:h:h/p5/fill.py $REQ 2>/dev/null | tail -1 > $DIR/runs/$SET-$VER.fill-report.json
rm -f $REQ
cp $BASE.as-written.pdf $BASE.adobe.pdf
$PY -I -c "
import json,sys; r=json.load(open(sys.argv[1]))
ok = r['original_bytes_kept'] and r['read_back_equal'] and not r['mismatches'] and not r['other_data_leaves_changed'] and r['other_parts_unchanged'] and r['poppler_syntax_errors']==0 and all(s.get('verified') if isinstance(s,dict) else s for s in r['signatures'].values())
print(json.dumps({'written': r['written'], 'read_back_equal': r['read_back_equal'], 'original_bytes_kept': r['original_bytes_kept'], 'other_data_changed': r['other_data_leaves_changed'], 'other_parts_unchanged': r['other_parts_unchanged'], 'signatures': r['signatures'], 'poppler_errors': r['poppler_syntax_errors'], 'writer_check': 'PASS' if ok else 'FAIL'}))
sys.exit(0 if ok else 1)" $DIR/runs/$SET-$VER.fill-report.json
print "adobe copy: ${BASE#$ROOT/}.adobe.pdf"
