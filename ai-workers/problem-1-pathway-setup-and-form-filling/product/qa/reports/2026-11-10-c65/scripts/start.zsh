#!/bin/zsh
# qa C6.5 gate A setup (not under test): own copy, Reset + Load the configured checkpoint (the screens' own routes,
# as Demo does), then c65_case.mts. The copy stays up for the walk and stops itself at its ttl (then a stop).
# Usage: zsh start.zsh <name> <port> <outdir>
name=$1; port=$2; out=$3
R=$(git rev-parse --show-toplevel)
ST=$R/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
HERE=${0:A:h}
export PATH=$R/.tools/node-v24.21.0/bin:$PATH
cd $ST
echo "C6.5 gate A setup on $(git rev-parse --short=9 HEAD), copy $name :$port, start $(TZ=Asia/Kolkata date)"
zsh $ST/tools/isolated.sh $name $port start --ttl ${TTL:-120} || { echo "copy did not start"; exit 1; }
for i in {1..120}; do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/); [ "$c" != 000 ] && break; sleep 2; done
curl -s -m 300 -X POST http://127.0.0.1:$port/api/demo/reset -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"confirm":"RESET"}' -o /dev/null -w 'reset %{http_code}\n'
curl -s -m 1800 -X POST http://127.0.0.1:$port/api/demo/load -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"sample":"configured"}' -o /dev/null -w 'load %{http_code}\n'
echo "loaded $(TZ=Asia/Kolkata date)"
OUT=$out FIX=$ST/acceptance/lib/fixtures.ts LIB=$ST/acceptance/lib/m3.ts TSX_TSCONFIG_PATH=api/tsconfig.json node --import tsx $HERE/c65_case.mts $port xr_studio_$name
echo "case exit $?  end $(TZ=Asia/Kolkata date)"
