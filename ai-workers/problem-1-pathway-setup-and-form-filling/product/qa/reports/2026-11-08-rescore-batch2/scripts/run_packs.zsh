#!/bin/zsh
# One fresh copy per pack, one at a time: Reset + Load the configured checkpoint, the pack alone (setups skipped as on GitHub's checkpoint run), stop.
port=$1; shift
R=<repo>
ST=$R/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
SP=<scratch>
NODE=$R/.tools/node-v24.21.0/bin/node
cd $ST
for pack in "$@"; do
  name=qa_p$(echo $pack | tr -cd '0-9a-z' | cut -c1-10)
  OUT=$SP/rescore/mac-$pack.txt
  (
  echo "$pack on $(git rev-parse --short=9 HEAD) (product code = main 152759210), copy $name :$port, start $(TZ=Asia/Kolkata date)"
  zsh $ST/tools/isolated-sb.sh $name $port start --ttl 30 || { echo "copy did not start"; exit 1; }
  trap "zsh $ST/tools/isolated-sb.sh $name $port stop" EXIT
  for i in {1..120}; do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/); [ "$c" != 000 ] && break; sleep 2; done
  curl -s -m 300 -X POST http://127.0.0.1:$port/api/demo/reset -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"confirm":"RESET"}' -o /dev/null -w 'reset %{http_code}\n'
  curl -s -m 1200 -X POST http://127.0.0.1:$port/api/demo/load -H 'content-type: application/json' -H 'x-actor: user-A' -d '{"sample":"configured"}' -o /dev/null -w 'load %{http_code}\n'
  echo "loaded $(TZ=Asia/Kolkata date)"
  TSX_TSCONFIG_PATH=api/tsconfig.json $NODE --import tsx acceptance/$pack.test.ts $port xr_studio_$name
  echo "pack exit $?  end $(TZ=Asia/Kolkata date)"
  ) 2>&1 | grep -vE 'trust settings|nice\(5\)' > $OUT
  echo "$pack: $(grep -E 'passed|pack exit' $OUT | tr '\n' ' ')"
done
