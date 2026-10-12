#!/bin/zsh
# Stop hook: Workstream 2 bookkeeping cannot be skipped (README §0 rules 7 and 13).
# If files changed and were not committed to this project's own local history, the session is told
# to update PROGRESS.md / NEXT.md and commit locally. Local only: never push (AGENTS.md access rule).
ROOT="${0:A:h:h:h}"
input=$(cat)
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
[[ "$active" == "true" ]] && exit 0
cd "$ROOT" || exit 0
changes=$(git status --porcelain -- ai-workers .claude AGENTS.md CLAUDE.md sources commercial 2>/dev/null | head -30)
[[ -z "$changes" ]] && exit 0
jq -n --arg r "Workstream 2 bookkeeping (README §0 rules 7 and 13) before you stop. Uncommitted changes:
$changes
1) If the state moved: append a line to ai-workers/PROGRESS.md; at a checkpoint also replace ai-workers/NEXT.md (about 600 words, one next outcome).
2) Commit to this project's local history only (git add -A && git commit); never push (AGENTS.md).
3) End with: Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome." '{decision:"block",reason:$r}'
