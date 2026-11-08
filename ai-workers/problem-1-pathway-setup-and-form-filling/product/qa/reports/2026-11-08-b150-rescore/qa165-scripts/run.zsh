#!/bin/zsh
# QA-165 re-test: fresh copy, Reset + Load the configured checkpoint, qa165_fill2.mts then qa165_read.py, stop in the same command
name=$1; port=$2
R=~/Desktop/Xpatready/.claude/worktrees/qa-2026-11-06-m2-walk-c8dd7e
ST=$R/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
SP=<scratchpad>
OUT=$SP/rescore/$name.txt; J=$SP/rescore/$name.json
NODE=$R/.tools/node-v24.21.0/bin/node; PY=$R/.tools/solution-1-prototype/.venv/bin/python
cd $ST
{
echo "QA-165 re-test run 2 (clean Yes/No and list answers) on $(git rev-parse --short=9 HEAD) (tree = main e4d63f396 + qa records; main 152759210 differs only in acceptance/C7.3.test.ts), copy $name :$port, start $(TZ=Asia/Kolkata date)"
zsh $ST/tools/isolated-sb.sh $name $port start --ttl 40 || { echo "copy did not start"; exit 1; }
trap "zsh $ST/tools/isolated-sb.sh $name $port stop" EXIT
for i in {1..120}; do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/); [ "$c" != 000 ] && break; sleep 2; done
curl -s -m 300 -X POST http://127.0.0.1:$port/api/demo/reset -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"confirm":"RESET"}' -o /dev/null -w 'reset %{http_code}\n'
curl -s -m 1200 -X POST http://127.0.0.1:$port/api/demo/load -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"sample":"configured"}' -o /dev/null -w 'load %{http_code}\n'
echo "loaded $(TZ=Asia/Kolkata date)"
LIB=$ST/acceptance/lib/m3.ts OUT=$J TSX_TSCONFIG_PATH=api/tsconfig.json $NODE --import tsx $SP/qa165_fill2.mts $port xr_studio_$name
echo "fill exit $?"
$PY -I $SP/qa165_read.py $ST/../p1 $ST/../p1/inventory/imm5257e.inventory.json $J $R
echo "read exit $?  end $(TZ=Asia/Kolkata date)"
} > $OUT 2>&1
