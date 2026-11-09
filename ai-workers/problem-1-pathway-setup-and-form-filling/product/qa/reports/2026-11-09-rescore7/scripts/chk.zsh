#!/bin/zsh
# A builder's check on its own fresh copy, Reset + Load the configured checkpoint first. Args: <test file> <copy name> <port>
R=<home>/Desktop/Xpatready/.claude/worktrees/qa-2026-11-06-m2-walk-c8dd7e
ST=$R/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
SP=<scratchpad>
t=$1; name=$2; port=$3; cd $ST
(
echo "$t on $(git rev-parse --short=9 HEAD) (= main 0e26bfbe8 + qa records), copy $name :$port, start $(TZ=Asia/Kolkata date)"
zsh $ST/tools/isolated-sb.sh $name $port start --ttl 30 || exit 1
trap "zsh $ST/tools/isolated-sb.sh $name $port stop" EXIT
for i in {1..120}; do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/); [ "$c" != 000 ] && break; sleep 2; done
curl -s -m 300 -X POST http://127.0.0.1:$port/api/demo/reset -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"confirm":"RESET"}' -o /dev/null -w 'reset %{http_code}\n'
curl -s -m 1200 -X POST http://127.0.0.1:$port/api/demo/load -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"sample":"configured"}' -o /dev/null -w 'load %{http_code}\n'
TSX_TSCONFIG_PATH=api/tsconfig.json $R/.tools/node-v24.21.0/bin/node --import tsx tests/$t.ts $port xr_studio_$name
echo "check exit $?  end $(TZ=Asia/Kolkata date)"
) 2>&1 | grep -vE 'trust settings|nice\(5\)' > $SP/rescore7/mac-$t.txt
echo "$t: $(grep -E 'passed|check exit' $SP/rescore7/mac-$t.txt | tr '\n' ' ')"
