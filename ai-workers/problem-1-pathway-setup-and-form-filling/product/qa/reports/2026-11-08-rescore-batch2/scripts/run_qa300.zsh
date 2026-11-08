#!/bin/zsh
# QA-300 re-test: fresh copy, Reset + Load the configured checkpoint, then the committed check, stop in the same command
name=$1; port=$2
R=<repo>
ST=$R/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
SP=<scratch>
OUT=$SP/rescore/$name.txt
NODE=$R/.tools/node-v24.21.0/bin/node
cd $ST
{
echo "QA-300 re-test on $(git rev-parse --short=9 HEAD) (code = main 152759210 except acceptance/C7.3.test.ts and a qa check), copy $name :$port, start $(TZ=Asia/Kolkata date)"
zsh $ST/tools/isolated-sb.sh $name $port start --ttl 30 || { echo "copy did not start"; exit 1; }
trap "zsh $ST/tools/isolated-sb.sh $name $port stop" EXIT
for i in {1..120}; do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/); [ "$c" != 000 ] && break; sleep 2; done
curl -s -m 300 -X POST http://127.0.0.1:$port/api/demo/reset -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"confirm":"RESET"}' -o /dev/null -w 'reset %{http_code}\n'
curl -s -m 1200 -X POST http://127.0.0.1:$port/api/demo/load -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"sample":"configured"}' -o /dev/null -w 'load %{http_code}\n'
echo "loaded $(TZ=Asia/Kolkata date)"
TSX_TSCONFIG_PATH=api/tsconfig.json $NODE --import tsx tests/qa/check_qa296_qa299_qa300_representative_forms.ts $port xr_studio_$name
echo "check exit $?  end $(TZ=Asia/Kolkata date)"
} > $OUT 2>&1
