#!/bin/zsh
# Stop hook: Workstream 2 bookkeeping cannot be skipped. If files changed and were not committed,
# the session is told to update PROGRESS.md / NEXT.md, commit, and end with the copy-paste line.
ROOT="${0:A:h:h:h}"
input=$(cat)
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
[[ "$active" == "true" ]] && exit 0
cd "$ROOT" || exit 0
changes=$(git status --porcelain -- ai-workers .claude AGENTS.md CLAUDE.md sources commercial company-planning 2>/dev/null | head -30)
[[ -z "$changes" ]] && exit 0
jq -n --arg r "Workstream 2 bookkeeping (README §0 rule 7) before you stop. Uncommitted changes:
$changes
1) If the state moved: append a log line to ai-workers/PROGRESS.md and refresh ai-workers/NEXT.md (replace, don't append).
2) git add -A && git commit (local only).
3) End your message with the one copy-paste line: Continue Workstream 2." '{decision:"block",reason:$r}'
