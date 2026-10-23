#!/bin/zsh
# Stop hook: Workstream 2 bookkeeping on disk (README §0 rule 11). No git, no commits (AGENTS.md).
# 1) Work files changed after PROGRESS.md was last written: the tracker must record the change.
# 2) After a long chat (20 or more founder messages, counted by exchange-count.sh):
#    NEXT.md must be newer than every changed work file, so the handoff is saved.
ROOT="${0:A:h:h:h}"
input=$(cat)
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
[[ "$active" == "true" ]] && exit 0
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"' 2>/dev/null)
cd "$ROOT" || exit 0
P=ai-workers/PROGRESS.md; N=ai-workers/NEXT.md
scan() { find ai-workers .claude AGENTS.md CLAUDE.md -type f -newer "$1" \
  ! -path 'ai-workers/PROGRESS.md' ! -path 'ai-workers/NEXT.md' ! -name '.DS_Store' ! -path 'ai-workers/tools/scrum-monitor-state.json' 2>/dev/null | head -10 }
reasons=""
newer_than_progress=$(scan "$P")
[[ -n "$newer_than_progress" ]] && reasons+="Work files changed after PROGRESS.md was last updated:
$newer_than_progress
- Append a line to ai-workers/PROGRESS.md (append only).
"
count=$(cat "${TMPDIR:-/tmp}/ws2-exchanges-${sid}" 2>/dev/null || echo 0)
if (( count >= 20 )); then
  newer_than_next=$(scan "$N")
  [[ -n "$newer_than_next" ]] && reasons+="Checkpoint due (founder message $count): NEXT.md is older than the work.
- Replace ai-workers/NEXT.md with the checkpoint handoff (README §0 rule 11), then give the fresh-chat line.
"
fi
[[ -z "$reasons" ]] && exit 0
jq -n --arg r "Workstream 2 bookkeeping before you stop (saved on disk; no commit, AGENTS.md):
$reasons- End with: Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome." '{decision:"block",reason:$r}'
