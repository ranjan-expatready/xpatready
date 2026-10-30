#!/usr/bin/env bash
# disk.sh — free space and what can be freed safely (R-142, Lead only).
#   disk.sh                 report: free space, each lane copy (worktree) with size and whether it is safe to remove,
#                           and session scratch folders whose lane copy no longer exists
#   disk.sh --clean-scratch remove only those orphaned scratch folders (temporary files of finished sessions)
# A lane copy is "safe" only when its HEAD is on origin and it has no changed tracked files. The script never removes a
# lane copy: the Lead first checks the session is finished (list_sessions), then runs `git worktree remove --force`.
# Never touched: the main copy, demo-main (:4400), .tools (database, Node), sources/, code/.
set -u
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
TMP="/private/tmp/claude-$(id -u)"
free_gb=$(df -g "$ROOT" | awk 'NR==2 {print $4}')
echo "free: ${free_gb} GB (lanes pause test runs below 3 GB; the Lead frees space below 10 GB)"
git fetch -q origin 2>/dev/null
echo "lane copies:"
git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r d; do
  [ "$d" = "$ROOT" ] && continue
  n=$(basename "$d"); size=$(du -sh "$d" 2>/dev/null | cut -f1)
  br=$(git -C "$d" branch --show-current 2>/dev/null); h=$(git -C "$d" rev-parse HEAD 2>/dev/null)
  mod=$(git -C "$d" status --porcelain --untracked-files=no 2>/dev/null | wc -l | tr -d ' ')
  on=$(git branch -r --contains "$h" 2>/dev/null | head -1 | tr -d ' ')
  if [ "$n" = demo-main ]; then v="keep (:4400)"; elif [ -n "$on" ] && [ "$mod" = 0 ]; then v="safe if its session is finished"; else v="KEEP (unpushed or changed)"; fi
  echo "  $size  $n  [$br]  $v"
done
echo "orphaned scratch folders (their lane copy is gone):"
live=$(git worktree list --porcelain | awk '/^worktree /{print $2}')
for s in "$TMP"/-*claude-worktrees-*/; do
  [ -d "$s" ] || continue
  w=$(basename "$s" | sed 's/.*claude-worktrees-//'); echo "$live" | grep -q "/$w$" && continue
  echo "  $(du -sh "$s" | cut -f1)  $s"
  [ "${1:-}" = --clean-scratch ] && rm -rf "$s" && echo "    removed"
done
exit 0
