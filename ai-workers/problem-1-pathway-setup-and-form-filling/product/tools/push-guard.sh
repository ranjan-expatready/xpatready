#!/bin/bash
# Push guard (P-82): ported from the P-81 filtered-mirror push check. Refuses a range of commits that adds
# an excluded path, a PDF, a secret or a personal name. Called by .githooks/pre-push for every pushed ref
# and by the CI guard job for each pull request.
#   push-guard.sh <old>..<new> [...]   check the given commit ranges
#   push-guard.sh --unpushed <sha> [remote]   check every commit on <sha> not on <remote>'s branches (default origin)
# Exit 1 and print every violation; exit 0 when the range is clean.
set -u
HERE="$(git rev-parse --show-toplevel)"; cd "$HERE" || exit 2

# Never on GitHub (P-81): sources/, code/, archive/, local tools, databases/dumps, archives, env/secret files, every PDF
# except the manifest-checksummed official blanks under official-sources/ (P-83, enforced below).
# A bare name too: lane worktrees link .tools (lane.sh setup), and a link is a file, not a folder.
PATH_RE='(^|/)(sources|code|archive|\.tools)/|^(sources|code|archive|\.tools)$|(^|/)\.tools$|\.(pdf|zip|tar\.gz|dump|sql\.gz)$|(^|/)\.env(\.|$)'
# Secrets: private keys and the well-known token shapes, plus high-entropy key=value assignments.
SECRET_RE='-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22}|sk-[A-Za-z0-9_-]{20}|xox[baprs]-[A-Za-z0-9-]{10}|AIza[0-9A-Za-z_-]{35}|(password|passwd|api[_-]?key|secret|token)[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9._~+/=-]{16,}'
# Personal names (AGENTS.md rule 5: roles, not names). Edit this list when a name must be added.
NAMES_RE='\b(Ranjan|Sanjay|Tanu|Vishrutha|Ayush|Vivek|Ishaan|Tanvi)\b'
# Self-exclusion: this file legitimately contains the name list; it is skipped for the names scan only
# (the secrets scan still covers it). Add future names to NAMES_RE — this file is the mechanism.
GUARD_REL="ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/push-guard.sh"

bad=0
# Private temp folder, created up front: if it cannot be made the guard refuses (fail closed). Before 6 Nov it wrote
# fixed /tmp files; where /tmp was not writable (the Mac's sandbox) every scan silently found nothing and said "clean".
G_TMP=$(mktemp -d "${TMPDIR:-/tmp}/push-guard.XXXXXX" 2>/dev/null) && [ -d "$G_TMP" ] && [ -w "$G_TMP" ] \
  || { echo "push guard: REFUSED — cannot create a temp folder under ${TMPDIR:-/tmp}, so nothing could be checked"; exit 1; }
trap 'rm -rf "$G_TMP"' EXIT
check_range() {
  local range="$1" commits
  # Intentionally unquoted: $range carries several rev-list args (e.g. "HEAD --not --remotes").
  commits=$(git rev-list $range 2>/dev/null) || { echo "GUARD: unresolvable range '$range' — refusing"; bad=1; return; }
  [ -n "$commits" ] || return 0
  # Paths added, modified, renamed-to or copied-into by the range (deletions are safe, so D is excluded).
  # P-83: a .pdf is admitted ONLY under official-sources/ and only when the blob's SHA-256 at its commit
  # equals a "sha256" value in an official-sources/*/manifest.json at the range tip; every other PDF refuses.
  local tip pdf_dir manifest_list
  tip=$(echo "$commits" | head -1)
  pdf_dir='ai-workers/problem-1-pathway-setup-and-form-filling/official-sources/'
  manifest_list="$G_TMP/manifests"
  git ls-tree -r --name-only "$tip" -- "$pdf_dir" 2>/dev/null | grep '/manifest\.json$' | while read -r m; do
    git show "$tip:$m" 2>/dev/null | grep -oE '"sha256"[[:space:]]*:[[:space:]]*"[0-9a-f]{64}"' | grep -oE '[0-9a-f]{64}'
  done | sort -u > "$manifest_list"
  while IFS=$'\t' read -r c f; do
    [ -n "$f" ] || continue
    case "$f" in
      *.pdf|*.PDF)
        case "$f" in
          "$pdf_dir"*) ;;
          *) echo "GUARD: excluded path in $range -> $f"; bad=1; continue ;;
        esac
        h=$(git show "$c:$f" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
        grep -qx "$h" "$manifest_list" 2>/dev/null || { echo "GUARD: PDF under official-sources but not manifest-checksummed (P-83): $f"; bad=1; }
        ;;
      *)
        printf '%s\n' "$f" | grep -iqE "$PATH_RE" && { echo "GUARD: excluded path in $range -> $f"; bad=1; }
        ;;
    esac
  done < <(echo "$commits" | while read -r c; do git diff-tree --no-commit-id -r --diff-filter=AMRC --name-only "$c" | sed "s/^/$c\t/"; done)
  rm -f "$manifest_list"
  # Added lines only: secrets and personal names.
  # Held in variables, not files, so a failed write can never read as "nothing found" (#1174 review m4).
  local hits
  hits=$(git log -p --format='' $range 2>/dev/null | grep -nE '^\+' | grep -ivE '^\+\+\+' | grep -inE -e "$SECRET_RE" | head -5)
  [ -n "$hits" ] && { printf '%s\n' "$hits" | while read -r m; do echo "GUARD: possible secret in $range: $m"; done; bad=1; }
  hits=$(git log -p --format='' $range -- . ":(exclude)$GUARD_REL" 2>/dev/null | grep -nE '^\+' | grep -inE -e "$NAMES_RE" | head -5)
  [ -n "$hits" ] && { printf '%s\n' "$hits" | while read -r m; do echo "GUARD: personal name in $range: $m"; done; bad=1; }
}

if [ "${1:-}" = "--unpushed" ]; then
  # Only the pushed remote's own branches count as already checked (#1174 review m2): never a hand-made ref under
  # refs/remotes/ (pr/, rev/ ...) or another remote. A rev-list error refuses (m3).
  rem="${3:-origin}"
  cs=$(git rev-list "$2" --not --remotes="$rem" 2>/dev/null) || { echo "GUARD: cannot list commits of '$2' — refusing"; exit 1; }
  [ -n "$cs" ] && check_range "$2 --not --remotes=$rem"
else
  for r in "$@"; do check_range "$r"; done
fi
[ "$bad" = 0 ] && echo "push guard: clean" || { echo "push guard: REFUSED — see above (P-81/P-82: sources/, code/, archive/, PDFs, tools, databases, secrets and personal names never go to GitHub)"; exit 1; }
exit 0
