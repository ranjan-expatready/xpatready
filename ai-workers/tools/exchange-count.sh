#!/bin/zsh
# UserPromptSubmit hook: counts the founder's messages in this session and reminds the Lead to
# think about a checkpoint after a long chat (README §0 rule 11; AIW-D194). It counts every message, so "substantive" is the Lead's
# judgement. The count lives in a temporary file per session; it is not a memory system.
input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"' 2>/dev/null)
f="${TMPDIR:-/tmp}/ws2-exchanges-${sid}"
n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$f"
if (( n >= 20 && n % 10 == 0 )); then
  msg="Workstream 2: founder message $n this session. If the current milestone is done or the chat is long, checkpoint (README §0 rule 11): replace NEXT.md, append a PROGRESS.md line, give the fresh-chat line."
  jq -n --arg c "$msg" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$c}}'
fi
exit 0
