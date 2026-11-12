#!/bin/bash
# one.sh <name> <port> <script> [round]  — fresh isolated copy, run one script, stop. Live AI off.
S=/home/user/xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
OUT=/tmp/claude-0/-home-user-xpatready/fdc5d2fe-b609-5350-b726-f773b587eb57/scratchpad/rt
N=$1; PORT=$2; F=$3; R=${4:-1}
unset STUDIO_AI_LIVE
cd /home/user/xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/prototype
export PATH=/home/user/xpatready/.tools/node-v24.21.0/bin:$PATH
LOG=$OUT/$N-r$R.log
{ echo "main $(git rev-parse HEAD) $(date -u +%FT%TZ)"
  zsh studio/tools/isolated.sh $N $PORT start --ttl 40 || { echo "START FAILED"; exit 1; }
  trap "zsh studio/tools/isolated.sh $N $PORT stop" EXIT
  case $F in *.cjs) node studio/$F $PORT xr_studio_$N;; *) studio/node_modules/.bin/tsx --tsconfig studio/api/tsconfig.json studio/$F $PORT xr_studio_$N;; esac
  echo "EXIT $?"; } > $LOG 2>&1
