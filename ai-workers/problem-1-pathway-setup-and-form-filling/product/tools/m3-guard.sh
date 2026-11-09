#!/usr/bin/env bash
# UNUSED since 8 Nov (D1, P-416, founder "Approve all stands" ~09:05 IST): CI no longer runs this guard; the file stays for a later milestone.
# M3 guard (founder 4 Nov ~11:30 IST, "Yes, start M3" and the no-waste rule): an M3-only pull request may not change a file
# M2 is still changing (tools/m2-hot-files.txt), so M3 work running in parallel never collides with M2 and is never thrown
# away. M3-only: the PR names at least one capability (C<n.n> in its title or body) and every one it names is M3 in
# qa/CAPABILITIES.md as on the base branch. A PR naming any M2 capability, or none, is not checked here (gate B and the
# reviewer cover it). The approval line can be written by anyone, so the reviewer checks it came from the tech lead
# (a PR comment by the Lead). The guard runs in the shard job, so with PR_RUNNER or BATCH_RUNNER set to mac it does not
# run: those switches are off since the repository went public (4 Nov). An approved hot file passes with the line "Hot file approved by the tech lead: <path>" in the body.
# Usage (CI, part 1): PR_TITLE, PR_BODY from the job;  bash product/tools/m3-guard.sh <base>..<head>
# Exit: 0 pass or not M3-only · 1 refused (the files are listed) · 2 could not run.
set -uo pipefail
RANGE="${1:-}"; [[ "$RANGE" =~ ^([0-9a-fA-F]{7,40}|[A-Za-z0-9/_.-]+)\.\.([0-9a-fA-F]{7,40}|[A-Za-z0-9/_.-]+)$ ]] || { echo "m3-guard: want <base>..<head>"; exit 2; }
BASE="${RANGE%%..*}"; HEAD="${RANGE##*..}"
ROOT="$(git rev-parse --show-toplevel)" || exit 2; cd "$ROOT" || exit 2
A=ai-workers/problem-1-pathway-setup-and-form-filling
TEXT="${PR_TITLE:-} ${PR_BODY:-}"
caps=$(printf '%s' "${PR_TITLE:-}" | grep -oE '\bC[0-9]{1,2}\.[0-9]{1,2}\b' | sort -u)
[ -n "$caps" ] || { echo "m3-guard: the PR title names no capability; not checked."; exit 0; }
table=$(git show "$BASE:$A/product/qa/CAPABILITIES.md" 2>/dev/null) || { echo "m3-guard: cannot read qa/CAPABILITIES.md at $BASE"; exit 2; }
for c in $caps; do
  m=$(printf '%s\n' "$table" | awk -F'|' -v id="$c" '{gsub(/ /,"",$2)} $2==id {gsub(/ /,"",$5); print $5; exit}')
  [ "$m" = M3 ] || { echo "m3-guard: $c is ${m:-not in the table}, so the PR is not M3-only; not checked."; exit 0; }
done
hot=$( (git show "$BASE:$A/product/tools/m2-hot-files.txt" 2>/dev/null || cat "$A/product/tools/m2-hot-files.txt") | tr -d '\r' | sed 's/[[:space:]]*$//') || exit 2
# What the PR itself changes or deletes, from the merge base (main's newer commits never count). A new file is never a
# collision (M3 adds its own contracts, e.g. #788, #784), so only modified and deleted files are matched.
changed=$(git diff --no-renames --diff-filter=MD --name-only "$BASE...$HEAD" -- "$A/prototype/") || { echo "m3-guard: git diff $BASE...$HEAD failed"; exit 2; }
changed=$(printf '%s\n' "$changed" | sed "s#^$A/prototype/##")
bad=""
while IFS= read -r f; do
  [ -n "$f" ] || continue
  while IFS= read -r h; do
    case "$h" in ''|\#*) continue;; esac
    case "$f" in "$h"*) printf '%s\n' "${PR_BODY:-}" | tr -d '\r' | sed 's/[[:space:]]*$//' | grep -xF "Hot file approved by the tech lead: $f" >/dev/null || bad="$bad"$'\n'"  $f"; break;; esac
  done <<< "$hot"
done <<< "$changed"
if [ -n "$bad" ]; then
  echo "m3-guard: refused. This PR is M3-only ($(echo $caps)) and changes files M2 is still changing:$bad"
  echo "Move the change out of these files, or ask the tech lead in a PR comment headed \"Question for the tech lead\"."
  exit 1
fi
echo "m3-guard: M3-only ($(echo $caps)); no M2-hot file changed."
