#!/bin/bash
# Stop hook (lane-aware, P-64): before a session stops, (1) its state file (main copy: STATE.md; a lane copy: lanes/<lane>.md) must be updated if product or app files changed, and the work must be committed; (2) rules files must pass check-docs; (3) explicit any in live code must not rise.
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
input=$(cat); [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ] && exit 0
# The copy to check is the one the session works in (the hook input's cwd), not the copy the hook script lives in: a lane
# session can be started with the main copy as its project folder. Falls back to this script's copy.
copy_of() { local here; here=$(git -C "$1" rev-parse --show-toplevel 2>/dev/null) || return 1
  [ "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)" = "$(git -C "$2" rev-parse --path-format=absolute --git-common-dir)" ] && echo "$here"; }
CWD=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null); [ -n "$CWD" ] && C=$(copy_of "$CWD" "$ROOT") && ROOT="$C"
cd "$ROOT" || exit 0
PH=ai-workers/problem-1-pathway-setup-and-form-filling/product; APP=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
reasons=""
LANE=$(bash "$PH/tools/lane.sh" whoami 2>/dev/null); case "$LANE" in screens|forms|evidence) SF="$PH/lanes/$LANE.md";; *) SF="$PH/STATE.md";; esac
# What changed is asked from git (file times are meaningless in a fresh lane copy).
status=$(git status --porcelain -- "$PH" "$APP" 2>/dev/null | cut -c4- | tr -d '"')
changed=$(printf '%s\n' "$status" | grep -v -e "^$SF\$" -e "^$PH/history/" | grep -v '^$' | head -5)
printf '%s\n' "$status" | grep -qx "$SF" && changed=""
[ -n "$changed" ] && reasons="Files changed but $SF not updated:
$changed
- Update $SF (stage, next action, one log line). If this reply already has the Report to Lead block, do not repeat it.
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
