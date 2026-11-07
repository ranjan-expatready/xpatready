#!/usr/bin/env bash
# B121 replay, step 1 of 3 (read-only GitHub runs API, US$0): run from an empty scratch folder holding these four files.
#   bash fetch.sh            the last 60 successful PR checks of ci.yml (no mergify/* batches) and the failed ones in the
#                            same window: runs, jobs and the shard logs' summary lines; then parse.js -> runs.json,
#                            and each code run's changed files (files/<run>.txt) from the repository's own history.
# Step 2: bash replay.sh "$PWD/<select-suites.mjs>" "$PWD/out" (the selector at each run's head tree, in a worktree).
# Step 3: node model.js out (predicted minutes per run, p50/p75, and every failed suite: KEPT or LOST).
set -eu
A="https://api.github.com/repos/$(git remote get-url origin | sed -E 's#\.git$##; s#.*[:/]([^/]+/[^/]+)$#\1#')"; REPO="${REPO:-$(git rev-parse --show-toplevel)}"
for p in 1 2 3 4; do curl -fsS "$A/actions/workflows/ci.yml/runs?event=pull_request&status=completed&per_page=100&page=$p" > "runs$p.json"; done
node -e '
const fs=require("fs");let all=[];for(const p of [1,2,3,4])all.push(...JSON.parse(fs.readFileSync(`runs${p}.json`)).workflow_runs);
const pr=all.filter(r=>!r.head_branch.startsWith("mergify/"));const s=pr.filter(r=>r.conclusion==="success").slice(0,60);
const cut=s.at(-1).created_at;const f=pr.filter(r=>r.conclusion==="failure"&&r.created_at>=cut);
fs.writeFileSync("sel.json",JSON.stringify([...s,...f].map(r=>({id:r.id,concl:r.conclusion,branch:r.head_branch,head:r.head_sha,pr:r.pull_requests[0]?.number,start:r.run_started_at,end:r.updated_at}))));'
mkdir -p jobs logs files
for id in $(node -e 'for(const r of require("./sel.json"))console.log(r.id)'); do [ -s "jobs/$id.json" ] || curl -fsS "$A/actions/runs/$id/jobs?per_page=100&filter=latest" > "jobs/$id.json"; done
node -e 'const fs=require("fs");for(const r of require("./sel.json"))for(const x of JSON.parse(fs.readFileSync(`jobs/${r.id}.json`)).jobs)if(/^(kind|shard)/.test(x.name)&&x.conclusion!=="skipped")console.log(r.id,x.id,x.name.replace(/ /g,"_"),x.conclusion)' > joblist.txt
grep shard joblist.txt | awk '{print $2}' | while read -r j; do [ -s "logs/$j.txt" ] || curl -fsSL "$A/actions/jobs/$j/logs" | grep -E "RANGE: |^\S+ \| |suites chosen|Every suite runs" > "logs/$j.txt" || true; done
node parse.js > /dev/null
node -e 'for(const r of require("./runs.json")) if(r.range&&r.nShards>1) console.log(r.id, r.range)' | while read -r id rg; do
  git -C "$REPO" cat-file -e "${rg##*..}" 2>/dev/null || git -C "$REPO" fetch -q origin "${rg##*..}"
  git -C "$REPO" -c core.quotePath=false diff --no-renames --name-only "${rg%%..*}...${rg##*..}" > "files/$id.txt"; done
echo "runs.json and files/ ready"
