#!/bin/bash
# SessionStart hook (lane-aware, P-64): tell the session which copy it is in, its one command, and its state.
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; PH="$ROOT/ai-workers/problem-1-pathway-setup-and-form-filling/product"
cd "$ROOT" || exit 0; LANE=$(bash "$PH/tools/lane.sh" whoami 2>/dev/null)
case "$LANE" in
  lead) head="This is the LEAD's main copy. The founder types /lead here. Builder lanes run in their own copies (/next screens, /next forms, /next evidence); /next here only redirects. Rules: product/LANES.md."; sf="$PH/STATE.md";;
  screens|forms|evidence) head="This is the $LANE LANE's copy (branch $(git branch --show-current)). The founder types /next $LANE here. Work only in this lane's files; rules: product/LANES.md."; sf="$PH/lanes/$LANE.md";;
  *) head="This lane copy is not bound yet. The founder types /next screens, /next forms or /next evidence to bind it. Rules: product/LANES.md."; sf="$PH/STATE.md";;
esac
ctx=$(echo "$head"; echo; echo "--- ${sf#$ROOT/} ---"; cat "$sf"; [ "$LANE" = lead ] && { echo; echo "--- lanes ---"; bash "$PH/tools/lane.sh" status 2>/dev/null; })
jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
