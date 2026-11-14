#!/bin/bash
# Backup refresh (P-589 (1), P-590): copies every branch and tag of this repository on GitHub into the founder's
# private backup repository, once a day. The Lead runs it when lead-watch says the backup is over 24 hours old.
# Safe by design: no force push and no prune, so a branch deleted or rewritten here never deletes or rewrites the
# backup's copy (a rejected branch is listed, never forced). Pull-request refs are not copied (GitHub refuses them).
# The working copy lives in .tools/backup-mirror.git (git-ignored, local only), borrowing objects from this clone.
# Needs network to github.com (Bash: allowed_domains github.com). Exit 0 = every ref copied; 1 = some refused; 2 = setup.
# Usage: bash product/tools/backup-refresh.sh
set -uo pipefail
# The main clone (also from a worktree): its .git holds the objects the backup copy borrows.
COMMON="$(git rev-parse --path-format=absolute --git-common-dir)" || exit 2; ROOT="${COMMON%/.git}"
# Source = this clone's origin on GitHub; backup = the same owner's "<name>-backup" (no names written here, P-81).
SRC="${BACKUP_SRC:-$(git -C "$ROOT" remote get-url origin)}"; SRC="${SRC%.git}.git"
DST="${BACKUP_DST:-${SRC%.git}-backup.git}"
M="$ROOT/.tools/backup-mirror.git"
if [ ! -d "$M" ]; then
  mkdir -p "$ROOT/.tools" && git clone -q --bare --reference "$COMMON" "$SRC" "$M" || { echo "backup: clone failed"; exit 2; }
fi
# Branches and tags exactly as on GitHub now (prune here only: the backup itself is never pruned).
git -C "$M" fetch -q --prune "$SRC" '+refs/heads/*:refs/heads/*' '+refs/tags/*:refs/tags/*' || { echo "backup: fetch failed"; exit 2; }
n=$(git -C "$M" for-each-ref refs/heads | wc -l | tr -d ' ')
# In batches: GitHub refuses one push over 2 GB (HTTP 500 on the first full copy, 14 Nov), so main goes first and the
# other branches follow 50 at a time; each push sends only what the backup lacks. Tags go last.
push() { git -C "$M" -c http.postBuffer=524288000 push --porcelain "$DST" "$@" 2>&1; }
out=$(push refs/heads/main:refs/heads/main); rc=$?
rm -f "$M"/backup-chunk-*
git -C "$M" for-each-ref --format='%(refname):%(refname)' refs/heads | grep -vx 'refs/heads/main:refs/heads/main' | split -l 50 - "$M/backup-chunk-"
for f in "$M"/backup-chunk-*; do   # ref names never hold spaces (git check-ref-format), so word splitting is safe
  o=$(push $(cat "$f")); r=$?; out="$out"$'\n'"$o"; [ "$r" -ne 0 ] && rc=$r; rm -f "$f"
done
o=$(push 'refs/tags/*:refs/tags/*'); r=$?; out="$out"$'\n'"$o"; [ "$r" -ne 0 ] && rc=$r
rejected=$(printf '%s\n' "$out" | grep -c '^!' || true)
failed=$(printf '%s\n' "$out" | grep -cE '^(error|fatal):' || true)
echo "backup: $n branches checked at $(TZ=Asia/Kolkata date '+%d %b %H:%M IST'); refused ${rejected}; push errors ${failed}"
[ "$rejected" -gt 0 ] && printf '%s\n' "$out" | grep '^!' | head -10
[ "$failed" -gt 0 ] && printf '%s\n' "$out" | grep -E '^(error|fatal):' | sort | uniq -c | head -5
[ "$rc" -eq 0 ] && [ "$rejected" -eq 0 ] && [ "$failed" -eq 0 ] && exit 0 || exit 1
