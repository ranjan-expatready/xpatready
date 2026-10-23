#!/bin/bash
# Stop hook: before the builder stops, (1) STATE.md must be updated if product or app files changed; (2) rules files must pass check-docs; (3) explicit any in live code must not rise.
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; cd "$ROOT" || exit 0
input=$(cat); [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ] && exit 0
PH=ai-workers/problem-1-pathway-setup-and-form-filling/product; APP=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
reasons=""
changed=$(find "$PH" "$APP/api" "$APP/web/src" "$APP/engine" "$APP/prisma" "$APP/tests" -type f -newer "$PH/STATE.md" ! -name ".DS_Store" ! -path "$PH/STATE.md" ! -path "$PH/history/*" 2>/dev/null | head -5)
[ -n "$changed" ] && reasons="Files changed after STATE.md:
$changed
- Update $PH/STATE.md (stage, next action, one log line) and end with the 'Paste to Lead' block.
"
docs=$(bash "$PH/tools/check-docs.sh" 2>&1) || reasons="$reasons- Rules files need attention (condense or fix links; keep each under its limit):
$docs
"
# (3) STANDARDS §7 "no any": the explicit-any count in live code may only fall (Lead check 23 Oct, item 2).
anyc=$(PATH="$ROOT/.tools/node-v24.21.0/bin:$PATH" node "$APP/tools/count-any.mjs" 2>&1) || reasons="$reasons- $anyc
"
[ -z "$reasons" ] && exit 0
jq -n --arg r "$reasons" '{decision:"block",reason:$r}'
