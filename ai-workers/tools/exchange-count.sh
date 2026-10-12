#!/bin/zsh
# UserPromptSubmit hook: counts the founder's messages in this session and reminds the Lead to
# checkpoint at five (README §0 rule 13). It counts every message, so "substantive" is the Lead's
# judgement. The count lives in a temporary file per session; it is not a memory system.
input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"' 2>/dev/null)
f="${TMPDIR:-/tmp}/ws2-exchanges-${sid}"
n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$f"
if (( n >= 5 )); then
  msg="Workstream 2 checkpoint due: founder message $n this session (README §0 rule 13). Finish the current safe substep, then save the checkpoint (NEXT.md, PROGRESS.md, local commit) and give the founder the fresh-chat line. Do not start another major outcome."
  jq -n --arg c "$msg" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$c}}'
fi
exit 0
