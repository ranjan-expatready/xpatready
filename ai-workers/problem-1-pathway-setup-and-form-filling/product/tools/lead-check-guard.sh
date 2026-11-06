#!/bin/bash
# PreToolUse hook on CronCreate (founder, 6 Nov ~03:00 IST): the tech lead's 30-minute check prompt is not stale. On 6 Nov
# the check's prompt listed rows already done, and every check went after them. The prompt is exactly
#   run lead-watch; read STATE Start here
# (case, spacing and a final full stop aside); what to watch lives in STATE "Start here", read fresh each time. Refused:
# a prompt naming lead-watch, anywhere, that is not that line; and in the Lead's copy (lane.sh whoami = lead) any recurring
# prompt that is not that line (the Lead's one recurring job is its check). One-shot reminders pass. Test: check-lead-cron.sh.
CANON="run lead-watch; read STATE Start here"
input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.tool_input.prompt // empty' 2>/dev/null)
recurring=$(printf '%s' "$input" | jq -r 'if .tool_input.recurring == false then "no" else "yes" end' 2>/dev/null)
norm() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -s '[:space:]' ' ' | sed -E 's/^ +//; s/[ .]+$//'; }
[ "$(norm "$prompt")" = "$(norm "$CANON")" ] && exit 0
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
ROOT=$([ -n "$cwd" ] && git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)
LANE=$([ -n "$ROOT" ] && cd "$ROOT" && bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/lane.sh whoami 2>/dev/null)
why=""
printf '%s' "$prompt" | grep -qi 'lead-watch' && why="it names lead-watch but is not the check's one line"
[ -z "$why" ] && [ "$LANE" = lead ] && [ "$recurring" = yes ] && why="it is a recurring job in the Lead's copy, whose only recurring job is the check"
[ -z "$why" ] && exit 0
jq -n --arg w "$why" --arg c "$CANON" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("The 30-minute check prompt is exactly \"" + $c + "\" (founder, 6 Nov: a prompt listing rows goes stale). Refused because " + $w + ". Put rows and rules in STATE \"Start here\" instead; a one-off reminder uses recurring: false.")}}'
