#!/bin/zsh
# qa C6.13 retest (QA-329) setup, not under test: own copy, Reset + Load the configured checkpoint, one Visitor visa
# Uses tools/isolated-sb.sh (isolated.sh with pg_isready and the node runtime, for the sandbox; not committed).
# family case with every fact answered and confirmed. The copy stays up for the headed walk and stops itself at its ttl.
name=$1; port=$2
R=$(git rev-parse --show-toplevel)
ST=$R/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
HERE=${0:A:h}
NODE=$R/.tools/node-v24.21.0/bin/node
cd $ST
echo "C6.13 setup on $(git rev-parse --short=9 HEAD), copy $name :$port, start $(TZ=Asia/Kolkata date)"
zsh $ST/tools/isolated-sb.sh $name $port start --ttl ${TTL:-75} || { echo "copy did not start"; exit 1; }
for i in {1..120}; do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/); [ "$c" != 000 ] && break; sleep 2; done
curl -s -m 300 -X POST http://127.0.0.1:$port/api/demo/reset -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"confirm":"RESET"}' -o /dev/null -w 'reset %{http_code}\n'
curl -s -m 1200 -X POST http://127.0.0.1:$port/api/demo/load -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"sample":"configured"}' -o /dev/null -w 'load %{http_code}\n'
echo "loaded $(TZ=Asia/Kolkata date)"
FILL=1 LIB=$ST/acceptance/lib/m3.ts TSX_TSCONFIG_PATH=api/tsconfig.json $NODE --import tsx $HERE/walk_case.mts $port xr_studio_$name
echo "case exit $?  end $(TZ=Asia/Kolkata date)"
