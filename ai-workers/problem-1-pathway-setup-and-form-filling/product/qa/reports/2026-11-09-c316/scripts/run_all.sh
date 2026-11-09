#!/bin/zsh
# qa gate A walk of C3.16 (QA-325), one command: a fresh isolated copy on the six, started and stopped here (ttl 60).
# Setup not under test by the people's steps (setup_c316.mts, no SQL write); everything a person decides, by screens
# (walk*.cjs, Playwright, 1024 px). Underneath: SQL reads and the generated PDFs' XFA data. Live AI off, US$0.
#   zsh run_all.sh <port>     (from the repository root)
set -e
PORT=${1:-4471}; NAME=qa_c316; DB=xr_studio_$NAME
HERE=${0:A:h}; OUT=${HERE:h}; STUDIO=${HERE:h:h:h:h:h}/prototype/studio; ROOT=${STUDIO:h:h:h:h}
D="postgresql://xr_studio@127.0.0.1:54329/$DB"
zsh $STUDIO/tools/isolated.sh $NAME $PORT start --ttl 60 | tail -1
trap "zsh $STUDIO/tools/isolated.sh $NAME $PORT stop >/dev/null 2>&1; echo copy stopped" EXIT
cd $STUDIO
echo "== main head: $(git -C $ROOT rev-parse --short=9 HEAD)"
echo "== 0 setup: Reset to the six, people and questions from the forms"; npx tsx $HERE/setup_c316.mts $PORT $DB prep | grep -v "^PASS"
VV=$(psql $D -Atc "select id from combination where label='Visitor visa'"); WP=$(psql $D -Atc "select id from combination where label like 'With an LMIA – inside%'")
echo "== 1 screens: the author's Asked about"; node $HERE/walk1_library.cjs $PORT $OUT
echo "== 1 underneath"; psql $D -Atc "select canonical_field_key||' v'||version||' '||scope||' '||status from canonical_field where canonical_field_key in ('relationship.union_start_date','organisation.employer_name') order by 1"
psql $D -Atc "select actor||' · '||summary from audit_event where entity='field' and entity_key in ('relationship.union_start_date','organisation.employer_name') and summary ilike '%once for%'"
echo "== 2 setup: release Visitor visa through its own steps (its checklist also adds the library's document types)"; ONLY="Visitor visa" npx tsx $HERE/setup_c316.mts $PORT $DB release | grep -v "^PASS"
echo "== 2 screens (setup): one document line by hand on the work permit (its checklist has no saved reading; live AI off)"; node $HERE/walk2_document_line.cjs $PORT $OUT $WP | grep -v "^AFTER"
echo "== 2 setup: release the work permit through its own steps"; ONLY="LMIA work permit" npx tsx $HERE/setup_c316.mts $PORT $DB release | grep -v "^PASS"
echo "== 3 screens: the worker's case"; node $HERE/walk3_worker_case.cjs $PORT $OUT > $OUT/.w; cat $OUT/.w; W=$(grep "CASE URL" $OUT/.w | sed 's#.*/cases/##')
echo "== 4 screens: C1.3's first step"; node $HERE/walk4_employer_link.cjs $PORT $OUT $W
echo "== 4 underneath: where each copied fact landed"
psql $D -Atc "select a.canonical_field_key||' on '||cp.role||' · '||a.status from client_canonical_answer a join case_participant cp on cp.subject_id=a.subject_id and cp.case_id='$W' where a.canonical_field_key in ('organisation.employer_name','organisation.employer_address','case.lmia_or_offer_number') and a.superseded_by_id is null order by 1"
echo "== 5 screens: a copy of IMM 5710"; node $HERE/walk5_generate_copy.cjs $PORT $OUT $W | grep -v COPIES
echo "== 5 underneath: the copy's boxes and its XFA data"
psql $D -AF'|' -tc "select path from form_instance where case_id='$W' and form_number like 'IMM 5710%' order by created_at desc limit 1" | while read P; do python3 -I $HERE/xfa.py "$ROOT/$P" Employer LMO; done
psql $D -Atc "select b->>'box'||' = '||(b->>'result') from form_instance f, jsonb_array_elements(f.result_json->'boxes') b where f.case_id='$W' and b->>'fact' like 'organisation.employer%'"
echo "== 6 screens: the Visitor visa family case"; node $HERE/walk6_household_case.cjs $PORT $OUT > $OUT/.h; cat $OUT/.h; H=$(grep "CASE URL" $OUT/.h | sed 's#.*/cases/##')
echo "== 6 underneath: how the case asks the union date"
curl -s -H "x-actor: user-O" "localhost:$PORT/api/runtime/cases/$H/questionnaire?mode=agent" | python3 -I -c "
import json,sys;d=json.load(sys.stdin);people={p['subject_id']:p.get('label') for p in d['case']['people']}
qs=[q for s in d['sections'] for q in s['questions'] if q['fact']=='relationship.union_start_date']
print(len(qs),'question(s):',[(people.get(q['subjectId']),q.get('scope_tag'),[r['label'] for r in q.get('read_for') or []]) for q in qs])"
echo "== 7 screens: answered once, read by both adults, then IMM 5257 for each"; node $HERE/walk7_household_answer.cjs $PORT $OUT $H
echo "== 7 underneath"
psql $D -Atc "select count(*)||' current answer(s), on '||string_agg(cp.role,',') from client_canonical_answer a join case_participant cp on cp.subject_id=a.subject_id and cp.case_id='$H' where a.canonical_field_key='relationship.union_start_date' and a.superseded_by_id is null"
psql $D -AF'|' -tc "select cp.role, f.path from form_instance f join case_participant cp on cp.subject_id=f.subject_id and cp.case_id=f.case_id where f.case_id='$H' and f.form_number like 'IMM 5257%' order by 1" | while IFS='|' read R P; do echo -n "$R: "; python3 -I $HERE/xfa.py "$ROOT/$P" DateOfMarriage; done
echo "== spent (US\$): $(psql $D -Atc 'select coalesce(sum(cost_usd),0) from drafting_job')"
rm -f $OUT/.w $OUT/.h
