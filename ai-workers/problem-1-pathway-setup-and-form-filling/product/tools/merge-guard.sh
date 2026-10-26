#!/bin/bash
# PreToolUse hook (P-87, founder 26 Oct): only the Lead's copy may run `gh pr merge`. The allow rule lives in the Lead
# copy's own .claude/settings.local.json; this guard refuses the command in every other copy (lanes, qa, scout, cloud
# sessions not marked as the Lead), whatever their permission mode.
input=$(cat)
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
# Fails closed: no session folder, or one outside a copy, is never the Lead (the script's own location is not enough,
# because lane sessions run hooks from the main copy's path).
ROOT=$([ -n "$cwd" ] && git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)
LANE=$([ -n "$ROOT" ] && cd "$ROOT" && bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/lane.sh whoami 2>/dev/null)
[ "$LANE" = lead ] && exit 0
jq -n --arg l "${LANE:-unknown}" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("Only the Lead merges pull requests (P-87); this copy is the " + $l + " copy. Hand the branch to the Lead in your Paste to Lead block.")}}'
