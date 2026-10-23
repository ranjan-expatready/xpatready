#!/bin/bash
# Stop hook (lane-aware, P-64): before a session stops, (1) its state file (main copy: STATE.md; a lane copy: lanes/<lane>.md) must be updated if product or app files changed, and the work must be committed; (2) rules files must pass check-docs; (3) explicit any in live code must not rise.
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; cd "$ROOT" || exit 0
input=$(cat); [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ] && exit 0
PH=ai-workers/problem-1-pathway-setup-and-form-filling/product; APP=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
reasons=""
LANE=$(bash "$PH/tools/lane.sh" whoami 2>/dev/null); case "$LANE" in screens|forms|evidence) SF="$PH/lanes/$LANE.md";; *) SF="$PH/STATE.md";; esac
changed=$(find "$PH" "$APP/api" "$APP/web/src" "$APP/engine" "$APP/prisma" "$APP/tests" -type f -newer "$SF" ! -name ".DS_Store" ! -path "$SF" ! -path "$PH/history/*" 2>/dev/null | head -5)
[ -n "$changed" ] && reasons="Files changed after $SF:
$changed
- Update $SF (stage, next action, one log line) and end with the 'Paste to Lead' block.
"
[ -n "$(git status --porcelain 2>/dev/null | head -1)" ] && reasons="$reasons- Uncommitted work in this copy ($LANE): commit it (git add -A && git commit; message '<lane>: <stage> — <summary>' with the attribution line).
"
docs=$(bash "$PH/tools/check-docs.sh" 2>&1) || reasons="$reasons- Rules files need attention (condense or fix links; keep each under its limit):
$docs
"
# (3) STANDARDS §7 "no any": the explicit-any count in live code may only fall (Lead check 23 Oct, item 2).
anyc=$(PATH="$ROOT/.tools/node-v24.21.0/bin:$PATH" node "$APP/tools/count-any.mjs" 2>&1) || reasons="$reasons- $anyc
"
[ -z "$reasons" ] && exit 0
jq -n --arg r "$reasons" '{decision:"block",reason:$r}'
