#!/bin/zsh
# SessionStart hook: minimal resume load (README §0 rule 13). Loads only the rules (§0), the plan
# table, the handoff (NEXT.md) and a freshness report. Not loaded: plan history, the agent log,
# REPORT-CARD, decisions.md (read the rows the outcome needs).
ROOT="${0:A:h:h:h}"
ctx=$(
  echo "RESUME: Workstream 2 (AI Workers). Files are the memory; chat history is not. You are the Lead and the founder's coach."
  echo "This session works ONLY on the 'Next outcome' in ai-workers/NEXT.md. State it first. Checkpoint per README §0 rule 13; after a checkpoint do not start another major outcome."
  echo "End every final message with: Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome."
  echo; echo "--- Rules (ai-workers/README.md §0) ---"; sed -n '/^## 0\. /,/^## 1\. /p' "$ROOT/ai-workers/README.md" | sed '$d'
  echo; echo "--- Plan table (ai-workers/PROGRESS.md, current section only) ---"; sed -n '/^## Plan and status/,/^## /p' "$ROOT/ai-workers/PROGRESS.md" | sed '$d'
  echo; echo "--- Handoff (ai-workers/NEXT.md) ---"; cat "$ROOT/ai-workers/NEXT.md"
  echo; echo "--- Freshness report ---"; "$ROOT/ai-workers/tools/freshness.sh" 2>&1
  echo "Before citing requirements: search Drive for files modified after the newest snapshot date (search_files: modifiedTime > '<date>T00:00:00Z')."
)
jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
