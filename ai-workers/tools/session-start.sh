#!/bin/zsh
# SessionStart hook: loads the rules, the plan, the handoff and a freshness report into every new session.
ROOT="${0:A:h:h:h}"
ctx=$(
  echo "AUTOMATIC RESUME: Workstream 2 (AI Workers) is the only active workstream. Files are the memory; chat history is not."
  echo "You are the Lead and the founder's coach. Work the plan in ai-workers/PROGRESS.md step by step: one outcome per step, maker -> adversarial checker -> Lead -> the founder, quality gate checked before he sees anything. Adjust the plan when the evidence says so and record why; never follow it blindly. Report after every step in a few plain lines. End EVERY final message with the one copy-paste line for the next session: Continue Workstream 2."
  echo; echo "--- Mandatory rules (ai-workers/README.md §0) ---"; sed -n '/^## 0\. /,/^## 1\. /p' "$ROOT/ai-workers/README.md" | sed '$d'
  echo; echo "--- Plan, owners, gates (ai-workers/PROGRESS.md) ---"; sed -n "1,/## Agent log/p" "$ROOT/ai-workers/PROGRESS.md" | sed '$d'
  echo; echo "--- Handoff (ai-workers/NEXT.md) ---"; cat "$ROOT/ai-workers/NEXT.md"
  echo; echo "--- Freshness report ---"; "$ROOT/ai-workers/tools/freshness.sh" 2>&1
  echo "Before citing requirements: search Drive for files modified after the newest snapshot date (search_files: modifiedTime > '<date>T00:00:00Z')."
)
jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
