#!/usr/bin/env bash
# replay.sh <selector.mjs> <outdir>: run the selector on each replayed run's diff, at that run's head tree.
set -u
SEL="$1"; OUT="$2"; R="$(cd "$(dirname "$0")" && pwd)"; REPO="${REPO:-$(git rev-parse --show-toplevel)}"; mkdir -p "$OUT"
WT="$R/wt"
node -e 'for(const r of require(process.argv[1])) if(r.range&&r.nShards>1) console.log(r.id, r.range)' "$R/runs.json" | while read -r id rg; do
  head="${rg##*..}"
  if [ ! -d "$WT" ]; then git -C "$REPO" worktree add -q --detach "$WT" "$head" >/dev/null 2>&1; else git -C "$WT" checkout -q --detach "$head" 2>/dev/null || { git -C "$WT" checkout -q -f --detach "$head"; }; fi
  git -C "$WT" clean -qfdx >/dev/null 2>&1
  (cd "$WT" && node "$SEL" < "$R/files/$id.txt" > "$OUT/$id.tsv" 2> "$OUT/$id.err"; echo "$id exit $? $(wc -l < "$OUT/$id.tsv") $(head -1 "$OUT/$id.tsv" | cut -c1-150)")
done
