#!/bin/zsh
# SessionStart hook: puts the AI Workers resume point and a freshness report
# into every new session automatically, so no work is lost between sessions.
ROOT="${0:A:h:h:h}"
ctx=$(
  echo "AUTOMATIC RESUME (AI Workers workstream). Single source of truth = files, not chat history."
  echo "Read ai-workers/README.md §0 (mandatory rules: Workstream 2 = all AI/Doers/Conductor, carved out of Drive docs and improved; local only, never write to Drive/repos/email; short plain chat updates, deep plain-English documents) before acting. Current checkpoint follows."
  echo; echo "--- REPORT-CARD.md §3 plan and §4 waiting ---"; sed -n "/## 3. Plan/,$p" "$ROOT/ai-workers/REPORT-CARD.md"; echo; echo "--- REPORT-CARD.md: plan and waiting-on-Ranjan ---"; awk '/^## 3\. Plan/{f=1} f' "$ROOT/ai-workers/REPORT-CARD.md"; echo; echo "--- PROGRESS.md (plan table) ---"; sed -n "1,/## Agent log/p" "$ROOT/ai-workers/PROGRESS.md"; echo; cat "$ROOT/ai-workers/NEXT.md"
  echo; echo "--- Freshness report (run at session start) ---"
  "$ROOT/ai-workers/tools/freshness.sh" 2>&1
  echo "Also search Drive for files modified after the newest snapshot date before citing requirements."
)
jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
