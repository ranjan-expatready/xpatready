#!/bin/zsh
# UserPromptSubmit hook (AIW-D208, 17 Oct 2026): saves each founder message, with UTC time and session id,
# to a dated JSONL file outside the project folder, so intent audits do not depend on chat history.
# Kept outside the project because raw prompts may contain personal names (README rule 9). Never blocks.
input=$(cat)
dir="$HOME/.claude/projects/-Users-ranjansingh-Desktop-Xpatready/prompt-log"
mkdir -p "$dir" 2>/dev/null || exit 0
printf '%s' "$input" | jq -c --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '{time:$t, session:(.session_id//""), prompt:(.prompt//"")}' >> "$dir/$(date -u +%Y-%m-%d).jsonl" 2>/dev/null
exit 0
