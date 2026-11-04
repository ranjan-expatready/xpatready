#!/usr/bin/env bash
# M3 guard (founder 4 Nov ~11:30 IST, "Yes, start M3" and the no-waste rule): an M3-only pull request may not change a file
# M2 is still changing (tools/m2-hot-files.txt), so M3 work running in parallel never collides with M2 and is never thrown
# away. M3-only: the PR names at least one capability (C<n.n> in its title or body) and every one it names is M3 in
# qa/CAPABILITIES.md as on the base branch. A PR naming any M2 capability, or none, is not checked here (gate B and the
# reviewer cover it). An approved hot file passes with the line "Hot file approved by the tech lead: <path>" in the body.
# Usage (CI, part 1): PR_TITLE, PR_BODY from the job;  bash product/tools/m3-guard.sh <base>..<head>
# Exit: 0 pass or not M3-only · 1 refused (the files are listed) · 2 could not run.
set -uo pipefail
RANGE="${1:-}"; [[ "$RANGE" =~ ^([0-9a-fA-F]{7,40}|[A-Za-z0-9/_.-]+)\.\.([0-9a-fA-F]{7,40}|[A-Za-z0-9/_.-]+)$ ]] || { echo "m3-guard: want <base>..<head>"; exit 2; }
BASE="${RANGE%%..*}"; HEAD="${RANGE##*..}"
ROOT="$(git rev-parse --show-toplevel)" || exit 2; cd "$ROOT" || exit 2
A=ai-workers/problem-1-pathway-setup-and-form-filling
TEXT="${PR_TITLE:-} ${PR_BODY:-}"
caps=$(printf '%s' "$TEXT" | grep -oE '\bC[0-9]{1,2}\.[0-9]{1,2}\b' | sort -u)
[ -n "$caps" ] || { echo "m3-guard: the PR names no capability; not checked."; exit 0; }
table=$(git show "$BASE:$A/product/qa/CAPABILITIES.md" 2>/dev/null) || { echo "m3-guard: cannot read qa/CAPABILITIES.md at $BASE"; exit 2; }
for c in $caps; do
  m=$(printf '%s\n' "$table" | awk -F'|' -v id="$c" '{gsub(/ /,"",$2)} $2==id {gsub(/ /,"",$5); print $5; exit}')
  [ "$m" = M3 ] || { echo "m3-guard: $c is ${m:-not in the table}, so the PR is not M3-only; not checked."; exit 0; }
done
hot=$(git show "$BASE:$A/product/tools/m2-hot-files.txt" 2>/dev/null || cat "$A/product/tools/m2-hot-files.txt") || exit 2
# What the PR itself changes: from the merge base, so commits on main since the branch was cut never count.
changed=$(git diff --name-only "$BASE...$HEAD" -- "$A/prototype/" | sed "s#^$A/prototype/##")
bad=""
while IFS= read -r f; do
  [ -n "$f" ] || continue
  while IFS= read -r h; do
    case "$h" in ''|\#*) continue;; esac
    case "$f" in "$h"*) printf '%s' "$TEXT" | grep -qF "Hot file approved by the tech lead: $f" || bad="$bad"$'\n'"  $f"; break;; esac
  done <<< "$hot"
done <<< "$changed"
if [ -n "$bad" ]; then
  echo "m3-guard: refused. This PR is M3-only ($(echo $caps)) and changes files M2 is still changing:$bad"
  echo "Move the change out of these files, or ask the tech lead in a PR comment headed \"Question for the tech lead\"."
  exit 1
fi
echo "m3-guard: M3-only ($(echo $caps)); no M2-hot file changed."
