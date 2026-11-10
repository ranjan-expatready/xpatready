#!/bin/zsh
# qa probe after the walk (copy qa_c613 :4474, case 738b360f-…): the lock check still refuses a real change made in
# between (two tabs), and a repeat apply. No model call. Output of the run at ~18:13 IST is in ../probe-output.txt.
C=738b360f-9d35-4d26-92f6-76c807a61080; U=http://127.0.0.1:${1:-4474}/api/runtime/cases/$C/filing-changes; H=(-H 'x-actor: user-O' -H 'content-type: application/json')
p1=$(curl -s "${H[@]}" -X POST $U -d '{"kind":"make_principal","subject":"456258b3-836e-4bf2-94ea-e8386b9c6522","preview":true}'); b1=$(echo $p1 | python3 -c "import json,sys;print(json.load(sys.stdin).get('basis',''))"); echo "tab1 preview basis ${b1:0:12}"
p2=$(curl -s "${H[@]}" -X POST $U -d '{"kind":"remove_filing","subject":"10896634-c89a-4b12-aeea-6a98eaf971a9","preview":true}'); b2=$(echo $p2 | python3 -c "import json,sys;print(json.load(sys.stdin).get('basis',''))")
curl -s -o /dev/null -w "tab2 apply remove A1: %{http_code}\n" "${H[@]}" -X POST $U -d "{\"kind\":\"remove_filing\",\"subject\":\"10896634-c89a-4b12-aeea-6a98eaf971a9\",\"basis\":\"$b2\",\"reason\":\"probe on a test copy (Sample)\"}"
curl -s -w "\ntab1 apply with old basis: %{http_code}\n" "${H[@]}" -X POST $U -d "{\"kind\":\"make_principal\",\"subject\":\"456258b3-836e-4bf2-94ea-e8386b9c6522\",\"basis\":\"$b1\",\"reason\":\"probe on a test copy (Sample)\"}" | cut -c1-300
curl -s -o /dev/null -w "double apply same basis (tab2 again): %{http_code}\n" "${H[@]}" -X POST $U -d "{\"kind\":\"remove_filing\",\"subject\":\"10896634-c89a-4b12-aeea-6a98eaf971a9\",\"basis\":\"$b2\",\"reason\":\"probe on a test copy (Sample)\"}"
