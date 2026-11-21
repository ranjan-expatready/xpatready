#!/usr/bin/env bash
# CS-W3 part 0, the walls spike (contract v0.1 §8; brief build-lead-c-briefs/CS-W3-0.md; draft design/briefs/CS-W3.md
# "Part 0"). Records only: it changes no product code and never touches main's demo database. Each copy is an
# isolated.sh copy of its own, walled with csw3-spike-walls.sql (next to this script), and stopped (dropped) at the end.
#   bash studio/tests/fixtures/csw3/csw3-spike.sh probes a|b          the journeys by hand on a copy holding the configured checkpoint
#   bash studio/tests/fixtures/csw3/csw3-spike.sh suites a|b [suite…]  each suite on its own fresh copy, walled before the suite starts
#   bash studio/tests/fixtures/csw3/csw3-spike.sh census              the static census: case-side files that query a firm's case table
# Mode a: main as it is (PF-12's wrapper; a case route sets no firm). Mode b: every case-side query runs as sample-firm
# (csw3.firm set for xr_app on the copy), standing in for part 1's middleware. Output: var/csw3-spike/ (not committed).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; S="$(cd "$HERE/../../.." && pwd)"; ROOT="$(cd "$S/../../../.." && pwd)"
export PATH="$S/node_modules/.bin:$PATH"
OUT="$S/var/csw3-spike"; mkdir -p "$OUT"
PG=(-h 127.0.0.1 -p 54329 -U xr_studio -X -v ON_ERROR_STOP=1)
q() { psql "${PG[@]}" -d "$1" -Atc "$2"; }
DEFAULT_SUITES=(check_a24_case_number_api check_csc1_close check_case_feed check_c72_imm5257_fill check_c76_readiness_api
  check_c75_review_runs_api check_c65_documents_api check_csv1_inputs check_c81_signing_api check_d1_reset_to_six check_c10_1_configured)

wall() {   # $1 database, $2 mode
  psql "${PG[@]}" -d "$1" -q -f "$HERE/csw3-spike-walls.sql" >/dev/null || return 1
  if [[ "$2" == b ]]; then
    local f; f=$(q "$1" "select id from platform_firm where key = 'sample-firm'")
    [[ -n "$f" ]] || { echo "mode b: sample-firm is not in platform_firm on $1"; return 1; }
    q "$1" "alter role xr_app in database \"$1\" set csw3.firm = '$f'" >/dev/null
  fi
}
start() { (cd "$S/.." && zsh studio/tools/isolated.sh "$1" "$2" start --ttl 90 >/dev/null 2>&1); }
restart() { (cd "$S/.." && zsh studio/tools/isolated.sh "$1" "$2" restart >/dev/null 2>&1); }   # new connections read csw3.firm
stop() { (cd "$S/.." && zsh studio/tools/isolated.sh "$1" "$2" stop >/dev/null 2>&1); }
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
api() { curl -s -o "$TMP" -w "%{http_code}" -X "$1" "localhost:$PORT/api$2" -H "x-actor: $3" -H 'content-type: application/json' ${4:+-d "$4"}; }

case "${1:-}" in
probes)
  MODE="${2:-a}"; NAME="csw3_probe_$MODE"; PORT=4471; DB="xr_studio_$NAME"
  stop "$NAME" "$PORT"; start "$NAME" "$PORT" || { echo "copy did not start"; exit 2; }
  trap 'stop "$NAME" "$PORT"; rm -f "$TMP"' EXIT
  echo "== mode $MODE: load the configured checkpoint (walls off), open one sample-solo case"
  echo "load: $(api POST /demo/load user-A '{"sample":"configured"}')"
  VV=$(q "$DB" "select c.id from combination c where c.combination_key='vv.single' and exists (select 1 from config_release r where r.combination_id=c.id)")
  echo "solo open: $(api POST /runtime/cases user-S "{\"combinationId\":\"$VV\",\"clientActor\":\"user-P\",\"principal\":{\"displayName\":\"Sample Client Solo\"}}")"
  echo "before walls: $(q "$DB" "select firm_key || ' ' || count(*) from runtime_case group by firm_key order by firm_key" | tr '\n' ' ')"
  wall "$DB" "$MODE" || exit 2; restart "$NAME" "$PORT" || { echo "copy did not restart"; exit 2; }
  K=$(q "$DB" "select id from runtime_case where firm_key='sample-firm' order by created_at limit 1"); KS=$(q "$DB" "select id from runtime_case where firm_key='sample-solo' limit 1")
  echo "== mode $MODE: walls on (7 tables)"
  for a in "GET /runtime/cases user-O" "GET /runtime/cases/$K user-O" "GET /runtime/cases/$KS user-S" "GET /runtime/cases/$K user-P"; do
    set -- $a; c=$(api "$1" "$2" "$3"); echo "$1 ${2/$K/<sample-firm case>} as $3 -> $c $(head -c 160 "$TMP" | tr '\n' ' ')"; done
  c=$(api POST /runtime/cases user-O "{\"combinationId\":\"$VV\",\"clientActor\":\"user-P\",\"principal\":{\"displayName\":\"Sample Client Walls\"}}"); echo "POST /runtime/cases as user-O (open) -> $c $(head -c 220 "$TMP")"
  echo "== the demo reset under the walls (one case of each Sample firm present)"
  c=$(api POST /demo/reset user-A '{"confirm":"RESET"}'); echo "POST /demo/reset as user-A -> $c $(head -c 160 "$TMP")"
  echo "cases left after the reset (owner's count): $(q "$DB" "select firm_key || ' ' || count(*) from runtime_case group by firm_key order by firm_key" | tr '\n' ' ')"
  echo "the database's refusal: $(q "$DB" "select 1" >/dev/null; grep -h 'ERROR' "$ROOT/.tools/solution-1-prototype/pg18-data/server.log" 2>/dev/null | grep -E 'pack_work_pin|config_release|RESTRICT' | tail -1 | cut -c1-200)"
  echo "== the app role by hand (psql as xr_app)"
  F=$(q "$DB" "select id from platform_firm where key='sample-firm'"); FS=$(q "$DB" "select id from platform_firm where key='sample-solo'")
  for t in runtime_case case_stage filing party; do
    n0=$(psql "${PG[@]}" "postgresql://xr_app@127.0.0.1:54329/$DB" -Atc "select set_config('app.firm_id','',false); select count(*) from $t" 2>&1 | tail -1)
    n1=$(psql "${PG[@]}" "postgresql://xr_app@127.0.0.1:54329/$DB" -Atc "begin; select set_config('app.firm_id','$F',true); select count(*) from $t; commit" 2>&1 | sed -n 3p)
    n2=$(psql "${PG[@]}" "postgresql://xr_app@127.0.0.1:54329/$DB" -Atc "begin; select set_config('app.firm_id','$FS',true); select count(*) from $t; commit" 2>&1 | sed -n 3p)
    all=$(q "$DB" "select count(*) from $t"); echo "$t: owner sees $all; xr_app no firm set: $n0; as sample-firm: $n1; as sample-solo: $n2"
  done
  echo "== the API log's errors (first lines)"; grep -hoE '"(errors|message)":\[?\{?"[^"]*":?"[^"]{0,160}' "$S/var/isolated-$NAME/api.log" 2>/dev/null | sort | uniq -c | sort -rn | head -8
  ;;
suites)
  MODE="${2:-a}"; shift 2 2>/dev/null; SUITES=("$@"); [[ ${#SUITES[@]} -eq 0 ]] && SUITES=("${DEFAULT_SUITES[@]}")
  before=$(cd "$ROOT" && git status --porcelain)
  printf "suite\tmode\texit\tresult\tfirst FAIL\n" > "$OUT/suites-$MODE.tsv"
  for s in "${SUITES[@]}"; do
    f=$(ls "$S/tests/$s".{ts,cjs} 2>/dev/null | head -1); [[ -n "$f" ]] || { echo "$s: no such suite"; continue; }
    line=$(grep -m1 -oE 'isolated\.sh [a-z0-9_]+ [0-9]+ start && (tsx|node) [^ ]+ [0-9]+ [a-z0-9_]+' "$f")
    [[ -n "$line" ]] || { echo "$s: no usage line with a port"; continue; }
    read -r _ name port _ <<<"$line"; DB="xr_studio_$name"
    stop "$name" "$port"; start "$name" "$port" || { printf "%s\t%s\t-\tcopy did not start\t\n" "$s" "$MODE" >> "$OUT/suites-$MODE.tsv"; continue; }
    { wall "$DB" "$MODE" && restart "$name" "$port"; } || { printf "%s\t%s\t-\twalls not applied\t\n" "$s" "$MODE" >> "$OUT/suites-$MODE.tsv"; stop "$name" "$port"; continue; }
    run="${line#*&& }"; run="${run//tsx /tsx --tsconfig studio/api/tsconfig.json }"
    (cd "$S/.." && timeout 1200 $run > "$OUT/$MODE-$s.log" 2>&1); code=$?
    cp "$S/var/isolated-$name/api.log" "$OUT/$MODE-$s.api.log" 2>/dev/null
    stop "$name" "$port"
    res=$(grep -E '[0-9]+ ?/ ?[0-9]+ passed|passed, [0-9]+ failed|[0-9]+ passed' "$OUT/$MODE-$s.log" | tail -1 | cut -c1-60)
    first=$(grep -m1 -E '^(FAIL|STOP)|Error:' "$OUT/$MODE-$s.log" | cut -c1-200 | tr '\t' ' ')
    printf "%s\t%s\t%s\t%s\t%s\n" "$s" "$MODE" "$code" "$res" "$first" | tee -a "$OUT/suites-$MODE.tsv"
  done
  # Never reverts anything (a builder's own work may be uncommitted): it only names the tracked files the suites rewrote.
  after=$(cd "$ROOT" && git status --porcelain); comm -13 <(echo "$before" | sort) <(echo "$after" | sort) | sed 's/^/rewritten by a suite (restore it yourself if it is not yours): /'
  ;;
census)
  # Case-side files under api/src (platform/ and front-office/ are PF-12's, already walled) that use a firm's case table
  # through Prisma or raw SQL, by area, and whether they set a firm anywhere (withFirm / enterFirm / setRequestFirm /
  # asBypass): none does today. The models are the 7 walled tables' and their CS-W2 children's, and caseClient (CS-K1; CS-W3 part 1).
  cd "$S"
  MODELS='\.(case|caseStage|firmCaseCounter|caseDecision|caseParty[A-Za-z]*|filing[A-Za-z]*|party[A-Za-z]*|caseParticipant|caseTeamMember|submissionGroup|checklistLine|reviewFinding|reviewRound[A-Za-z]*|signStep|signedScan|personLink[A-Za-z]*|caseTask|filingChange|feeReceiptFile|documentReview|readValue|answerCheck|formInstance|answerSnapshot|clientCanonicalAnswer|answerSubject|enteredSection|assessment|caseDocument[A-Za-z]*|caseClient[A-Za-z]*|packWorkPin)\.'
  # Raw SQL: a file that sends raw SQL (any line) and names a case table after from / join / into / update / delete from
  # anywhere in it, so a query written over several lines is found too (review M1, case-count.ts).
  TABLES='(runtime_case|case_stage|firm_case_counter|case_decision|case_party_index|filing[a-z_]*|party[a-z_]*|case_participant|client_canonical_answer|answer_subject|person_link[a-z_]*|case_[a-z_]+)'
  SCOPE=(-- 'api/src/*.ts' 'api/src/**/*.ts' ':!api/src/platform/**' ':!api/src/front-office/**')
  { git grep -lE "$MODELS" "${SCOPE[@]}"
    comm -12 <(git grep -lE '\$(queryRaw|executeRaw)' "${SCOPE[@]}" | sort) <(git grep -liE "(from|join|into|update)[[:space:]]+\"?$TABLES\\b" "${SCOPE[@]}" | sort); } | sort -u > "$TMP"
  echo "files: $(wc -l < "$TMP")"
  printf "file\t\$transaction\traw SQL calls\tsets a firm\n"
  while read -r f; do
    tx=$(grep -c '\$transaction' "$f"); raw=$(grep -cE '\$(queryRaw|executeRaw)(Unsafe)?\b' "$f"); scoped=$(grep -cE 'withFirm|enterFirm|setRequestFirm|asBypass' "$f")
    printf "%s\t%s\t%s\t%s\n" "$f" "$tx" "$raw" "$scoped"
  done < "$TMP"
  ;;
*) sed -n 2,11p "$0"; exit 2;;
esac
