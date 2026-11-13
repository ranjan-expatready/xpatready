#!/usr/bin/env bash
# app-code-prs.sh — keep only the pull requests that changed app code (P-500: the right sample for the purpose).
# Product speed is judged by files changed, never by title or branch: a PR counts when it touched
# prototype/studio/{api/src,web/src,engine,prisma,contracts,samples,packages}. Records, docs, tooling and
# test-only PRs are left out.
# Input (stdin): one PR per line, starting with its number ("1628" or "#1628 title …").
# Output: the same lines, only for PRs that changed app code. Exit 0 always; a PR whose files cannot be
# read is printed with "?" in front, so a network failure is visible instead of silently dropped.
set -u
REPO=$(git -C "$(dirname "$0")" remote get-url origin | sed -E 's#^.*github\.com[:/]##; s#\.git$##')
APP='^ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/(api/src|web/src|engine|prisma|contracts|samples|packages)/'
TOKEN=$(gh auth token 2>/dev/null)
while IFS= read -r line; do
  n=$(printf '%s' "$line" | grep -oE '[0-9]+' | head -1)
  [ -z "$n" ] && continue
  files=""; ok=1
  for page in 1 2 3; do
    out=$(curl -sf -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/$REPO/pulls/$n/files?per_page=100&page=$page") || { ok=0; break; }
    got=$(printf '%s' "$out" | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(f["filename"] for f in d))' 2>/dev/null) || { ok=0; break; }
    files+="$got"$'\n'
    [ "$(printf '%s' "$got" | grep -c .)" -lt 100 ] && break
  done
  if [ "$ok" -eq 0 ]; then printf '? %s\n' "$line"; continue; fi
  printf '%s' "$files" | grep -qE "$APP" && printf '%s\n' "$line"
done
exit 0
