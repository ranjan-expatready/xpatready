#!/bin/bash
# Stop hook (P-189): before a session stops, (1) a builder or qa copy has not changed the tech lead's files (rules,
# skills, agents, settings, decisions, the backlog), (2) rules files pass check-docs, (3) explicit any in live code does
# not rise (skipped when studio packages are not installed). Uncommitted or unpushed work is a note, never a block:
# the pull request is the record (no state file to update on every reply).
input=$(cat); [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ] && exit 0
# The session's own copy comes from the hook input (in builder sessions $CLAUDE_PROJECT_DIR is the main copy).
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
ROOT=$(git -C "${cwd:-.}" rev-parse --show-toplevel 2>/dev/null) || ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT" || exit 0
PH=ai-workers/problem-1-pathway-setup-and-form-filling/product; APP=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio
reasons=""; notes=""
LANE=$(bash "$PH/tools/lane.sh" whoami 2>/dev/null)
# (1) The tech lead's files: a builder proposes changes in its PR; it never edits them.
if [ "$LANE" != lead ] && [ "$LANE" != unbound ]; then
  base=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD 2>/dev/null)
  touched=$( { [ -n "$base" ] && git diff --name-only "$base" HEAD; git status --porcelain | cut -c4- | tr -d '"'; } 2>/dev/null | sort -u)
  own=$( [ "$LANE" = qa ] && echo "$PH/qa/" )
  lead=$(printf '%s\n' "$touched" | grep -E "^(\.claude/(skills|agents|settings)|\.github/|CLAUDE\.md$|AGENTS\.md$|$PH/[^/]+\.md$|$PH/(decisions|tools)/)" | { [ -n "$own" ] && grep -v "^$own" || cat; } | head -8)
  [ -n "$lead" ] && reasons="- This $LANE copy changed the tech lead's files (rules, skills, settings, decisions, backlog). Undo them (git checkout origin/main -- <file>) and propose the change in your PR or to the tech lead:
$lead
"
fi
# (2) Rules files.
docs=$(bash "$PH/tools/check-docs.sh" 2>&1) || reasons="$reasons- Rules files need attention (fix the links):
$docs
"
# (3) STANDARDS §7 "no any": the explicit-any count in live code may only fall.
if [ -f "$APP/node_modules/typescript/lib/typescript.js" ]; then
  NODE="$ROOT/.tools/node-v24.21.0/bin/node"; [ -x "$NODE" ] || NODE=$(command -v node)
  if [ -n "$NODE" ]; then anyc=$("$NODE" "$APP/tools/count-any.mjs" 2>&1) || reasons="$reasons- $anyc
"; fi
else
  echo "stop-check: no studio packages ($APP/node_modules/typescript missing) — skipping the any-count (run npm ci)" >&2
fi
# Notes only: uncommitted app or product changes, unpushed commits.
git status --porcelain -- "$PH" "$APP" 2>/dev/null | grep -q . && notes="uncommitted changes in this copy: commit and push when the piece is done"
ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null) && [ "$ahead" -gt 0 ] && notes="${notes:+$notes; }$ahead unpushed commit(s) on $(git branch --show-current 2>/dev/null)"
[ -z "$reasons" ] && { [ -n "$notes" ] && jq -n --arg m "note: $notes" '{systemMessage:$m}'; exit 0; }
[ -n "$notes" ] && reasons="$reasons- note: $notes (not blocking)
"
jq -n --arg r "$reasons" '{decision:"block",reason:$r}'
