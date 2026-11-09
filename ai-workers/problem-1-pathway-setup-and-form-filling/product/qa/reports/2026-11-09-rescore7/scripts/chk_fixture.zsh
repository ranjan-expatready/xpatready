#!/bin/zsh
# check_c76_readiness_api on its own fixture: the two setups run first with node --import tsx (the tsx command cannot start in qa's sandbox), so the check skips its own spawn.
R=<home>/Desktop/Xpatready/.claude/worktrees/qa-2026-11-06-m2-walk-c8dd7e
ST=$R/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
N=$R/.tools/node-v24.21.0/bin/node
name=qa_c76d; port=4470; cd $ST
(
echo "fixture run on $(git rev-parse --short=9 HEAD) (= main 0e26bfbe8 + qa records), copy $name :$port, start $(TZ=Asia/Kolkata date)"
zsh $ST/tools/isolated-sb.sh $name $port start --ttl 40 || exit 1
trap "zsh $ST/tools/isolated-sb.sh $name $port stop" EXIT
for i in {1..120}; do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/); [ "$c" != 000 ] && break; sleep 2; done
export TSX_TSCONFIG_PATH=api/tsconfig.json
$N --import tsx tests/runtime/setup_visitor_visa.ts $port xr_studio_$name | tail -2; echo "setup1 exit $pipestatus[1]"
$N --import tsx acceptance/lib/setup_vv_m3.ts $port xr_studio_$name | tail -4; echo "setup2 exit $pipestatus[1]"
$N --import tsx tests/check_c76_readiness_api.ts $port xr_studio_$name
echo "check exit $?  end $(TZ=Asia/Kolkata date)"
) 2>&1 | grep -vE 'trust settings|nice\(5\)' > <scratchpad>/rescore7/mac-check_c76_readiness_api-fixture.txt
grep -E 'FAIL|passed|setup[12] exit|check exit' <scratchpad>/rescore7/mac-check_c76_readiness_api-fixture.txt | cut -c1-240
