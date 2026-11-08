#!/bin/bash
# Local-lane stall alarm (founder, 8 Nov ~14:00 IST, P-420): a Mac lane (qa, a builder) that stops makes no GitHub signal.
# 8 Nov: qa sat idle 10:31-13:52 IST with its messages to other sessions paused ("Paused until your user's next message
# in this session", the app's cross-session cap) while 7 PRs merged unscored; lead-watch read only GitHub, so no check
# saw it for 3 h 20 min.
# Reads each worktree lane's newest session transcript on this Mac (read-only) and prints, per lane:
#   ACT  since the founder last typed in that session, a tool result or the lane's own words say its messages are paused
#        -> only the founder's typed message in that session unpauses it
#   ACT  idle over IDLE_MIN minutes while PRs merged on main since its last activity -> it is waiting or stuck
#   ok   otherwise. Lanes whose transcript is older than ACTIVE_H hours are no lanes any more and are skipped.
# Standby Leads and the Lead run in the main copy, not a worktree, so they are never flagged (idle is their job).
# Prints one line per lane; the caller counts the ACT lines (exit code = that count, for the tests).
# Overrides (tests): LL_WORKTREES (newline list of paths), LL_PROJECTS (transcripts root), LL_NOW (epoch),
#   LL_MERGES_SINCE (command printing merges on main since epoch $1).
set -uo pipefail
IDLE_MIN="${IDLE_MIN:-45}"; ACTIVE_H="${ACTIVE_H:-6}"
NOW="${LL_NOW:-$(date +%s)}"
PROJ="${LL_PROJECTS:-$HOME/.claude/projects}"
if [ -n "${LL_WORKTREES+x}" ]; then wts="$LL_WORKTREES"
else wts=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print substr($0,10)}' | grep '/\.claude/worktrees/' | grep -v '/demo-main$'); fi
merges_since() {
  if [ -n "${LL_MERGES_SINCE:-}" ]; then $LL_MERGES_SINCE "$1"
  else git log --first-parent origin/main --since="@$1" --format=%h 2>/dev/null | wc -l | tr -d ' '; fi
}
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null; }
# Claude Code names a project folder by its path with every character that is not a letter or digit turned into "-".
encode() { printf '%s' "$1" | sed 's/[^A-Za-z0-9]/-/g'; }
# "paused" when, after the last message the founder typed, a tool result or the lane's own text says messages are paused.
paused() {
  tail -n 400 "$1" | python3 -I -c '
import sys, json, re
APP = re.compile(r"paused until your user.s next message", re.I)   # the app own refusal, in a tool result
SAID = re.compile(r"paused until your user.s next message|until you type here|stay paused|messages to other sessions (are|stay) paused", re.I)
def typed(j):
    if j.get("type") != "user" or j.get("isMeta") or j.get("isCompactSummary"): return False
    c = (j.get("message") or {}).get("content")
    if isinstance(c, list):
        if any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c): return False
        c = " ".join(b.get("text", "") for b in c if isinstance(b, dict))
    c = (c or "").lstrip()
    return bool(c) and not c.startswith(("<cross-session-message", "<task-notification", "<system-reminder", "<side-sessions-event", "This session is being continued", "Stop hook feedback"))
def says_paused(j):
    c = (j.get("message") or {}).get("content")
    if not isinstance(c, list): return False
    if j.get("type") == "assistant":   # the lane own words, any wording
        return any(SAID.search(b.get("text", "")) for b in c if isinstance(b, dict) and b.get("type") == "text")
    if j.get("type") == "user":        # a tool result: only the exact app refusal (a doc quoting a paraphrase is no stall)
        for b in c:
            if isinstance(b, dict) and b.get("type") == "tool_result":
                r = b.get("content"); r = r if isinstance(r, str) else json.dumps(r)
                if APP.search(r): return True
    return False
hit = False
for line in sys.stdin:
    try: j = json.loads(line)
    except Exception: continue
    if typed(j): hit = False
    elif says_paused(j): hit = True
print("paused" if hit else "")
' 2>/dev/null
}
act=0
while IFS= read -r wt; do
  [ -n "$wt" ] || continue
  dir="$PROJ/$(encode "$wt")"
  [ -d "$dir" ] || continue
  f=$(ls -t "$dir"/*.jsonl 2>/dev/null | head -1); [ -n "$f" ] || continue
  t=$(mtime "$f"); [ -n "$t" ] || continue
  age=$(( (NOW - t) / 60 )); name=$(basename "$wt")
  [ "$age" -gt $((ACTIVE_H * 60)) ] && continue
  if [ "$(paused "$f")" = paused ]; then
    act=$((act+1)); echo "ACT   local lane $name: its messages to other sessions are paused (idle ${age} min); only the founder's typed message in that session unpauses it: ask him now (P-420)"
  elif [ "$age" -gt "$IDLE_MIN" ]; then
    m=$(merges_since "$t")
    if [ "${m:-0}" -gt 0 ]; then act=$((act+1)); echo "ACT   local lane $name idle ${age} min while ${m} PR(s) merged on main: read its session (list_events) and unblock it (P-420)"
    else echo "ok    local lane $name idle ${age} min, nothing merged since"; fi
  else echo "ok    local lane $name active ${age} min ago"; fi
done <<< "$wts"
exit "$act"
