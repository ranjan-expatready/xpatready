#!/bin/bash
# PreToolUse hook (P-87, founder 26 Oct): only the Lead's copy may run `gh pr merge`, and (founder 29 Oct, P-163)
# `gh pr close`, `gh pr comment`, `gh pr review`. The allow rule lives in the Lead
# copy's own .claude/settings.local.json; this guard refuses the command in every other copy (lanes, qa, scout, cloud
# sessions not marked as the Lead), whatever their permission mode.
input=$(cat)
# The hook's `if` filter can match more than it names (cloud trial, 30 Oct: heredocs, loops and subshells were refused),
# so the guard itself checks the command: anything that does not run one of the four `gh pr` actions passes.
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
printf '%s' "$cmd" | grep -qE 'gh[[:space:]]+pr[[:space:]]+(merge|close|comment|review)' || exit 0
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
# Fails closed: no session folder, or one outside a copy, is never the Lead (the script's own location is not enough,
# because lane sessions run hooks from the main copy's path).
ROOT=$([ -n "$cwd" ] && git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)
LANE=$([ -n "$ROOT" ] && cd "$ROOT" && bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/lane.sh whoami 2>/dev/null)
[ "$LANE" = lead ] && exit 0
jq -n --arg l "${LANE:-unknown}" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("Only the Lead merges, closes, reviews or comments on pull requests (P-87, P-163); this copy is the " + $l + " copy. Hand the branch to the Lead in your Paste to Lead block.")}}'
