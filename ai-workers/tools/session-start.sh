#!/bin/zsh
# SessionStart hook: minimal resume load (README §0 rule 11). Loads the rules and roles (README §0-§1),
# the milestone table, the handoff (NEXT.md) and a freshness report. decisions.md is read row by row as needed.
ROOT="${0:A:h:h:h}"
ctx=$(
  echo "RESUME: Workstream 2 (the AI layer of Expat Ready, reset 16 Oct 2026). Files are the memory; chat history is not. You are the maker (the Lead) and the founder's coach."
  echo "This session works ONLY on the 'Next outcome' in ai-workers/NEXT.md. State it first. Checkpoint at the end of a milestone or when the chat grows long (README §0 rule 11). archive/ is history, never current."
  echo "End every final message with: Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome."
  echo; echo "--- Rules and roles (ai-workers/README.md §0-§1) ---"; sed -n '/^## 0\. /,/^## 2\. /p' "$ROOT/ai-workers/README.md" | sed '$d'
  echo; echo "--- Milestones (ai-workers/PROGRESS.md) ---"; sed -n '/^## Plan and status/,/^## /p' "$ROOT/ai-workers/PROGRESS.md" | sed '$d'
  echo; echo "--- Handoff (ai-workers/NEXT.md) ---"; cat "$ROOT/ai-workers/NEXT.md"
  echo; echo "--- Freshness report ---"; "$ROOT/ai-workers/tools/freshness.sh" 2>&1
  echo "Before citing requirements: search Drive for files modified after the newest snapshot date (search_files: modifiedTime > '<date>T00:00:00Z')."
)
jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
