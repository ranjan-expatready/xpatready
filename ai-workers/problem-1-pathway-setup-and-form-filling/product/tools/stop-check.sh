#!/bin/bash
# Stop hook (lane-aware, P-64, P-68): before a session stops, (1) a lane copy has not changed Lead-owned files (rules,
# skills, agents, other lanes' files), (2) its state file (main copy: STATE.md; a lane copy: lanes/<lane>.md) is updated
# when product or app files changed, and a finished stage (state file changed) is committed; (3) rules files pass
# check-docs; (4) explicit any in live code does not rise (skipped when studio packages are not installed).
input=$(cat); [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ] && exit 0
# The session's own copy (a lane worktree or the main copy) comes from the hook input: in lane sessions the desktop app
# points $CLAUDE_PROJECT_DIR at the main copy, so the script's own location is not enough (forms lane report, 23 Oct).
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
ROOT=$(git -C "${cwd:-.}" rev-parse --show-toplevel 2>/dev/null) || ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT" || exit 0
PH=ai-workers/problem-1-pathway-setup-and-form-filling/product; APP=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
BLOCK="Paste to Lead"   # the builder's hand-back block (skill next); one name, one place
reasons=""
LANE=$(bash "$PH/tools/lane.sh" whoami 2>/dev/null); case "$LANE" in lead|unbound) SF="$PH/STATE.md";; *) SF="$PH/lanes/$LANE.md";; esac
# (1) Lead-owned files: a lane proposes changes in its block; it never edits them (founder requests about the workflow go to the Lead).
if [ "$LANE" != lead ] && [ "$LANE" != unbound ]; then
  # GitHub's main is the truth (P-82): a lane syncs origin/main, so compare with it before a local main that may lag.
  base=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD 2>/dev/null)
  touched=$( { [ -n "$base" ] && git diff --name-only "$base" HEAD; git status --porcelain | cut -c4- | tr -d '"'; } 2>/dev/null | sort -u)
  lead=$(printf '%s\n' "$touched" | grep -E "^(\.claude/(skills|agents|settings)|CLAUDE\.md$|AGENTS\.md$|$PH/[^/]+\.md$|$PH/(decisions|domain|tools|design)/|$PH/screens/[^/]+/(concept|lead-check)\.md$|$PH/lanes/)" | grep -v -x "$SF" | head -8)
  [ -n "$lead" ] && reasons="- This $LANE lane changed Lead-owned files (LANES.md, 'Files: one writer each'). Undo these changes (git checkout main -- <file>, or revert the commit) and propose them in your $BLOCK block instead:
$lead
"
fi
# (2) What changed is asked from git (file times are meaningless in a fresh lane copy).
status=$(git status --porcelain -- "$PH" "$APP" 2>/dev/null | cut -c4- | tr -d '"')
changed=$(printf '%s\n' "$status" | grep -v -e "^$SF\$" -e "^$PH/history/" | grep -v '^$' | head -5)
printf '%s\n' "$status" | grep -qx "$SF" && changed=""
[ -n "$changed" ] && reasons="$reasons- Files changed but $SF not updated:
$changed
- Update $SF (stage, next action, one log line). If this reply already has the $BLOCK block, do not repeat it.
"
# A finished stage (its state file changed) must be committed; mid-stage work is not blocked on every reply.
git status --porcelain -- "$SF" 2>/dev/null | grep -q . && reasons="$reasons- Uncommitted work at the end of a stage in this copy ($LANE): commit it (git add -A && git commit; message '<lane>: <stage> — <summary>' with the attribution line).
"
# (3) Rules files.
docs=$(bash "$PH/tools/check-docs.sh" 2>&1) || reasons="$reasons- Rules files need attention (condense or fix links; keep each under its limit):
$docs
"
# (4) STANDARDS §7 "no any": the explicit-any count in live code may only fall (Lead check 23 Oct, item 2).
# Skips with a one-line note when the studio packages are not installed (fresh clone before npm ci, P-82).
if [ -f "$APP/node_modules/typescript/lib/typescript.js" ]; then
  NODE="$ROOT/.tools/node-v24.21.0/bin/node"; [ -x "$NODE" ] || NODE=$(command -v node)
  if [ -n "$NODE" ]; then anyc=$("$NODE" "$APP/tools/count-any.mjs" 2>&1) || reasons="$reasons- $anyc
"; fi
else
  echo "stop-check: no studio packages ($APP/node_modules/typescript missing) — skipping the any-count (run npm ci)" >&2
fi
# Unpushed commits warn, never block (P-82: push at the end of your own branch).
unpushed=""
ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null) && [ "$ahead" -gt 0 ] && unpushed="$ahead unpushed commit(s) on $(git branch --show-current 2>/dev/null) — push at the end of your stage (push only your own branch)"
[ -z "$reasons" ] && { [ -n "$unpushed" ] && jq -n --arg m "note: $unpushed" '{systemMessage:$m}'; exit 0; }
[ -n "$unpushed" ] && reasons="$reasons- note: $unpushed (warning only — not blocking)
"
jq -n --arg r "$reasons" '{decision:"block",reason:$r}'
