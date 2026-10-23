#!/bin/zsh
# E1a free AI scoring set: rescore every saved AI run offline, at US$0.
#   zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/evidence-lane/scoring-set/run.sh
# 1. Copies the files the scorer needs into a throwaway folder (the scorer and assembler write their outputs next
#    to the runs, so they never run in a real copy; nothing in p2/, tests/ or expected/ is touched).
# 2. Self-check: deletes the saved P2 scores and configurations in the copy, regenerates them with the existing
#    scripts (tests/spread_p2.v1.ts, tests/spread_p2.ts, tests/rescore_p2.ts) and requires every file to come back
#    byte for byte. A difference stops the run (exit 1) before anything new is scored.
# 3. Scores every saved live run with score_set.ts and copies results/ back here.
# Every Node step runs with an empty environment (no API key), the no-network guard (guard.mjs) and Node's
# permission model: reads and writes only inside the copy, no child processes, no workers.
set -eu
HERE=${0:A:h}
PROTO=${HERE:h:h}
SOL=${PROTO:h}
ROOT=${SOL:h:h}
NODE=$ROOT/.tools/node-v24.21.0/bin/node
MODS=$PROTO/node_modules; MODS=${MODS:A}
[[ -x $NODE && -d $MODS ]] || { print "missing Node or packages (run lane.sh setup)"; exit 2; }
WORK=${TMPDIR:-/tmp}/evidence-scoring-set.$$
trap 'rm -rf $WORK' EXIT
C=$WORK/ai-workers/problem-1-pathway-setup-and-form-filling
mkdir -p $C/prototype/p1 $C/official-sources
rsync -a $PROTO/p2 $PROTO/tests $PROTO/contracts $PROTO/expected $PROTO/package.json $C/prototype/
rsync -a $PROTO/p1/inventory $C/prototype/p1/
rsync -a --exclude results $HERE $C/prototype/evidence-lane/
rsync -a $SOL/official-sources/ircc $C/official-sources/
ln -s $MODS $C/prototype/node_modules
CP=$C/prototype

run() {  # run one script inside the copy, offline and fenced
  env -i PATH=/usr/bin:/bin HOME=$WORK $NODE --permission --allow-fs-read=$WORK --allow-fs-read=$MODS --allow-fs-write=$WORK \
    --import $CP/evidence-lane/scoring-set/guard.mjs "$@"
}

# Fence probe: network, key file, writes to the real folder and child processes must all be refused
mkdir -p $CP/evidence-lane/scoring-set/results
run $CP/evidence-lane/scoring-set/probe.mjs $CP/evidence-lane/scoring-set/results/guard-check.json \
  $ROOT/.tools/solution-1-prototype/secrets/anthropic.env $HERE/probe-must-not-exist || { cat $CP/evidence-lane/scoring-set/results/guard-check.json; exit 1; }
[[ ! -e $HERE/probe-must-not-exist ]] || { print "write fence failed"; exit 1; }

# 2. Self-check
TARGETS=(p2/scores/spread-c1-slice.json p2/scores/v2/spread-c1-slice.json p2/scores/v2/rescore-summary.json
  p2/config/c1-draft-1-live.json p2/config/c1-draft-1-live-r2-detect.json p2/config/c1-draft-1-live-r2.json
  p2/config/c1-draft-1-spread-trial-{1..5}.json p2/config/c1-draft-1-spread-trial-{1..5}-r2.json)
# c1-draft-1-live.json stays: rescore_p2.ts reads it for its run list, reassembles it and records whether it came back identical
for t in ${TARGETS:#p2/config/c1-draft-1-live.json}; do rm $CP/$t; done
( cd $CP && run tests/spread_p2.v1.ts && run tests/spread_p2.ts && run tests/rescore_p2.ts ) > $WORK/self-check.log 2>&1 || { cat $WORK/self-check.log; exit 1; }
mkdir -p $CP/evidence-lane/scoring-set/results
OUT=$CP/evidence-lane/scoring-set/results/self-check.json
same=0; diff=0; rows=()
for t in $TARGETS; do
  a=$(shasum -a 256 $PROTO/$t | cut -d' ' -f1); b=$(shasum -a 256 $CP/$t 2>/dev/null | cut -d' ' -f1 || print missing)
  if [[ $a == $b ]]; then same=$((same+1)); r=true; else diff=$((diff+1)); r=false; fi
  rows+=("  {\"file\": \"prototype/$t\", \"saved_sha256\": \"$a\", \"regenerated_sha256\": \"$b\", \"identical\": $r}")
done
{ print "{\"note\": \"Saved P2 scores and configurations deleted in a throwaway copy and regenerated offline by tests/spread_p2.v1.ts, tests/spread_p2.ts and tests/rescore_p2.ts; each must be byte-identical to the saved file.\","
  print "\"identical\": $same, \"different\": $diff, \"files\": ["; print ${(pj:,\n:)rows}; print "]}"; } > $OUT
print "self-check: $same identical, $diff different"
(( diff == 0 )) || { cp $OUT $HERE/results/self-check.json 2>/dev/null; exit 1; }

# 3. Score every saved live run
( cd $CP && run evidence-lane/scoring-set/score_set.ts )
mkdir -p $HERE/results
rsync -a $CP/evidence-lane/scoring-set/results/ $HERE/results/
print "results: ${HERE#$ROOT/}/results"
