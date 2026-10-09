#!/bin/zsh
# Freshness check: is our evidence older than the masters?
# Code: compares each local read-only copy in code/ with the newest commit on GitHub.
# Drive: prints the date of the newest local snapshot; the Drive side is checked by
# the agent with the Drive search tool (see .claude/skills/ai-workers-resume/SKILL.md).
ROOT="${0:A:h:h:h}"
echo "== Code (local copy vs GitHub default branch and dev) =="
for d in "$ROOT"/code/*(/); do
  name=${d:t}
  local_sha=$(git -C "$d" rev-parse --short HEAD 2>/dev/null)
  local_date=$(git -C "$d" log -1 --format=%cs 2>/dev/null)
  for br in dev main; do
    remote=$(gh api "repos/ExpatReady-EROS/$name/commits/$br" --jq '.sha[0:7]+" "+.commit.committer.date[0:10]' 2>/dev/null)
    [[ -n "$remote" ]] && echo "$name  local $local_sha ($local_date)  |  GitHub $br: $remote"
  done
done
echo "== Drive =="
latest=$(ls -d "$ROOT"/sources/drive-snapshot-* 2>/dev/null | sort | tail -1)
echo "Newest local snapshot: ${latest:t}"
echo "Next: search Drive for modifiedTime > that date; any hit means a new dated snapshot is due."
