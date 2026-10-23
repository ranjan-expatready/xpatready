#!/bin/bash
# Lanes (P-64, product/LANES.md): which lane this copy is, binding it, making it runnable, syncing it, and the status of all.
#   lane.sh whoami            -> lead | screens | forms | evidence | unbound
#   lane.sh bind <lane>       bind this lane copy (git worktree) to a lane, once
#   lane.sh setup             link the main copy's tools and node_modules into this lane copy (idempotent)
#   lane.sh sync              merge main into this lane copy; stops on a conflict
#   lane.sh status            one line per lane, read from every copy
LANES="screens forms evidence"
P="ai-workers/problem-1-pathway-setup-and-form-filling"
HERE="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "not in the repository"; exit 2; }
MAIN="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
whoami_() {
  if [ "$HERE" = "$MAIN" ]; then echo lead; return; fi
  [ -f "$HERE/.claude/lane" ] && cat "$HERE/.claude/lane" || echo unbound
}
case "$1" in
  whoami) whoami_ ;;
  bind)
    [ "$HERE" = "$MAIN" ] && { echo "This is the Lead's main copy; lanes run in their own copies."; exit 2; }
    echo " $LANES " | grep -q " $2 " || { echo "Lane must be one of: $LANES"; exit 2; }
    cur=$(whoami_); [ "$cur" != unbound ] && [ "$cur" != "$2" ] && { echo "This copy is already the $cur lane. Type: /next $cur"; exit 3; }
    mkdir -p "$HERE/.claude" && echo "$2" > "$HERE/.claude/lane" && echo "bound to $2" ;;
  setup)
    [ "$HERE" = "$MAIN" ] && { echo "main copy: nothing to link"; exit 0; }
    for rel in .tools "$P/prototype/node_modules" "$P/prototype/studio/node_modules" "$P/prototype/studio/web/node_modules"; do
      [ -e "$MAIN/$rel" ] || continue
      [ -e "$HERE/$rel" ] || { mkdir -p "$(dirname "$HERE/$rel")"; ln -s "$MAIN/$rel" "$HERE/$rel"; echo "linked $rel"; }
    done ;;
  sync)
    [ "$HERE" = "$MAIN" ] && { echo "main copy: nothing to sync"; exit 0; }
    git -C "$HERE" diff --quiet && git -C "$HERE" diff --cached --quiet || { echo "Commit this lane's work before syncing."; exit 3; }
    git -C "$HERE" merge --no-edit main >/dev/null 2>&1 && echo "in sync with main ($(git -C "$HERE" rev-parse --short main))" || {
      echo "CONFLICT merging main:"; git -C "$HERE" diff --name-only --diff-filter=U; exit 4; } ;;
  status)
    git -C "$MAIN" worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
      [ "$wt" = "$MAIN" ] && continue
      ln=$(cat "$wt/.claude/lane" 2>/dev/null || echo unbound); f="$wt/$P/product/lanes/$ln.md"
      st=$(grep -m1 '^stage:' "$f" 2>/dev/null | cut -d' ' -f2-); ow=$(grep -m1 '^owner:' "$f" 2>/dev/null | cut -d' ' -f2-)
      up=$(git -C "$wt" log -1 --format='%cd' --date=format:'%d %b %H:%M' 2>/dev/null)
      echo "$ln | stage: ${st:-?} | owner: ${ow:-?} | last commit: ${up:-none} | behind main: $(git -C "$wt" rev-list --count HEAD..main 2>/dev/null) | $wt"
    done ;;
  *) sed -n 2,8p "$0"; exit 2 ;;
esac
