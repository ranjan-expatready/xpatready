#!/bin/bash
# Local-lane stall alarm (founder, 8 Nov ~14:00 IST, P-420): a Mac lane (qa, a builder) that stops makes no GitHub signal.
# 8 Nov: qa sat idle 10:31-13:52 IST with its messages to other sessions paused ("until you type here", the app's
# cross-session cap) while 7 PRs merged unscored; lead-watch read only GitHub, so no check saw it for 3 h 20 min.
# Reads each worktree lane's newest session transcript on this Mac (read-only) and prints, per lane:
#   ACT  its last lines say its messages are paused  -> only the founder's typed message in that session unpauses it
#   ACT  idle over IDLE_MIN minutes while PRs merged on main since its last activity -> it is waiting or stuck
#   ok   otherwise. Lanes whose transcript is older than ACTIVE_H hours are not lanes any more and are skipped.
# Standby Leads and the Lead run in the main copy, not a worktree, so they are never flagged (idle is their job).
# Exit code = number of ACT lines. Used by lead-watch.sh. Test: check-local-lanes.sh.
# Overrides (tests): LL_WORKTREES (newline list of paths), LL_PROJECTS (transcripts root), LL_NOW (epoch),
#   LL_MERGES_SINCE (command printing merges on main since epoch $1).
set -uo pipefail
IDLE_MIN="${IDLE_MIN:-45}"; ACTIVE_H="${ACTIVE_H:-24}"
NOW="${LL_NOW:-$(date +%s)}"
PROJ="${LL_PROJECTS:-$HOME/.claude/projects}"
if [ -n "${LL_WORKTREES+x}" ]; then wts="$LL_WORKTREES"
else wts=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print substr($0,10)}' | grep '/\.claude/worktrees/' | grep -v '/demo-main$'); fi
merges_since() {
  if [ -n "${LL_MERGES_SINCE:-}" ]; then $LL_MERGES_SINCE "$1"
  else git log --first-parent origin/main --since="@$1" --format=%h 2>/dev/null | wc -l | tr -d ' '; fi
}
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null; }
act=0
while IFS= read -r wt; do
  [ -n "$wt" ] || continue
  dir="$PROJ/$(printf '%s' "$wt" | tr '/.' '--')"
  [ -d "$dir" ] || continue
  f=$(ls -t "$dir"/*.jsonl 2>/dev/null | head -1); [ -n "$f" ] || continue
  t=$(mtime "$f"); [ -n "$t" ] || continue
  age=$(( (NOW - t) / 60 )); name=$(basename "$wt")
  [ "$age" -gt $((ACTIVE_H * 60)) ] && continue
  if tail -n 40 "$f" | grep -qiE 'paused until you type|stay paused|messages to other sessions (are|stay) paused'; then
    act=$((act+1)); echo "ACT   local lane $name: its messages to other sessions are paused (idle ${age} min); only the founder's typed message in that session unpauses it: ask him now (P-420)"
  elif [ "$age" -gt "$IDLE_MIN" ]; then
    m=$(merges_since "$t")
    if [ "${m:-0}" -gt 0 ]; then act=$((act+1)); echo "ACT   local lane $name idle ${age} min while ${m} PR(s) merged on main: read its session (list_events) and unblock it (P-420)"
    else echo "ok    local lane $name idle ${age} min, nothing merged since"; fi
  else echo "ok    local lane $name active ${age} min ago"; fi
done <<< "$wts"
exit "$act"
