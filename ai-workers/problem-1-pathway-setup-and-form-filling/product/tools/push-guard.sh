#!/bin/bash
# Push guard (P-82): ported from the P-81 filtered-mirror push check. Refuses a range of commits that adds
# an excluded path, a PDF, a secret or a personal name. Called by .githooks/pre-push for every pushed ref
# and by the CI guard job for each pull request.
#   push-guard.sh <old>..<new> [...]   check the given commit ranges
#   push-guard.sh --unpushed <sha>     check every commit on <sha> that is not on any remote branch
# Exit 1 and print every violation; exit 0 when the range is clean.
set -u
HERE="$(git rev-parse --show-toplevel)"; cd "$HERE" || exit 2

# Never on GitHub (P-81): sources/, code/, archive/, local tools, databases/dumps, archives, env/secret files, every PDF.
PATH_RE='^(sources|code|archive|\.tools)/|\.(pdf|zip|tar\.gz|dump|sql\.gz)$|(^|/)\.env(\.|$)'
# Secrets: private keys and the well-known token shapes, plus high-entropy key=value assignments.
SECRET_RE='-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22}|sk-[A-Za-z0-9_-]{20}|xox[baprs]-[A-Za-z0-9-]{10}|AIza[0-9A-Za-z_-]{35}|(password|passwd|api[_-]?key|secret|token)[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9._~+/=-]{16,}'
# Personal names (AGENTS.md rule 5: roles, not names). Edit this list when a name must be added.
NAMES_RE='\b(Ranjan|Sanjay)\b'

bad=0
check_range() {
  local range="$1" commits
  commits=$(git rev-list "$range" 2>/dev/null) || return 0
  [ -n "$commits" ] || return 0
  # Paths added, modified, renamed-to or copied-into by the range (deletions are safe, so D is excluded).
  while IFS= read -r f; do
    printf '%s\n' "$f" | grep -iqE "$PATH_RE" && { echo "GUARD: excluded path in $range -> $f"; bad=1; }
  done < <(echo "$commits" | while read -r c; do git diff-tree --no-commit-id -r --diff-filter=AMRC --name-only "$c"; done | sort -u)
  # Added lines only: secrets and personal names.
  git log -p --format='' "$range" 2>/dev/null | grep -nE '^\+' | grep -ivE '^\+\+\+' | grep -inE -e "$SECRET_RE" | head -5 | while read -r m; do echo "GUARD: possible secret in $range: $m"; done > /tmp/guard-secrets.$$
  [ -s /tmp/guard-secrets.$$ ] && { cat /tmp/guard-secrets.$$; bad=1; }
  git log -p --format='' "$range" 2>/dev/null | grep -nE '^\+' | grep -inE -e "$NAMES_RE" | head -5 | while read -r m; do echo "GUARD: personal name in $range: $m"; done > /tmp/guard-names.$$
  [ -s /tmp/guard-names.$$ ] && { cat /tmp/guard-names.$$; bad=1; }
  rm -f /tmp/guard-secrets.$$ /tmp/guard-names.$$
}

if [ "${1:-}" = "--unpushed" ]; then
  cs=$(git rev-list "$2" --not --remotes 2>/dev/null | tr '\n' ' ')
  [ -n "$cs" ] && check_range "$2 --not --remotes"
else
  for r in "$@"; do check_range "$r"; done
fi
[ "$bad" = 0 ] && echo "push guard: clean" || { echo "push guard: REFUSED — see above (P-81/P-82: sources/, code/, archive/, PDFs, tools, databases, secrets and personal names never go to GitHub)"; exit 1; }
exit 0
