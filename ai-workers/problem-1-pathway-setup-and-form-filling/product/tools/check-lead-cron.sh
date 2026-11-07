#!/usr/bin/env bash
# Guard 8 (founder, 6 Nov ~03:00 IST): the 30-minute check's prompt is not stale. Feeds lead-check-guard.sh the hook's
# JSON as Claude Code does, from a throwaway copy whose lane.sh answers FAKE_LANE. US$0.
#   bash product/tools/check-lead-cron.sh
set -u
. "$(dirname "$0")/guard-test-lib.sh"
command -v jq >/dev/null || { echo "jq is missing; nothing was checked"; exit 2; }
T=$(mktemp -d "${TMPDIR:-/tmp}/lc.XXXXXXXX"); trap 'rm -rf "$T"' EXIT
git init -q "$T/copy" && mkdir -p "$T/copy/$PRODREL/tools" && printf '#!/bin/bash\necho "$FAKE_LANE"\n' > "$T/copy/$PRODREL/tools/lane.sh"
G="$TOOLS/lead-check-guard.sh"
guard() {  # $1 lane, $2 recurring (true|false), $3 prompt → allow | deny
  local out; out=$(jq -n --arg p "$3" --argjson r "$2" --arg d "$T/copy" '{tool_name:"CronCreate", tool_input:{cron:"13,43 * * * *", prompt:$p, recurring:$r}, cwd:$d}' | FAKE_LANE="$1" bash "$G")
  if printf '%s' "$out" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null 2>&1; then echo deny; else echo allow; fi; }
stale='Lead 20 check: run lead-watch; #1052 landed? label #1133 when green; B99 Validate; tell fix-1052 nothing'
r=$(guard lead true "$stale"); ok "the night's kind of prompt (rows listed) is refused in the Lead's copy" "$([ "$r" = deny ] && echo 1)" "got $r"
r=$(guard qa true "$stale"); ok "... and in any copy, since it names lead-watch" "$([ "$r" = deny ] && echo 1)" "got $r"
r=$(guard lead true 'run lead-watch; read STATE Start here'); ok "the one line is allowed" "$([ "$r" = allow ] && echo 1)" "got $r"
r=$(guard lead true '  Run lead-watch;  read STATE Start here.'); ok "case, spacing and a final full stop do not matter" "$([ "$r" = allow ] && echo 1)" "got $r"
r=$(guard lead true 'Check the queue and lanes every 30 minutes; #1125 queued'); ok "another recurring prompt in the Lead's copy is refused" "$([ "$r" = deny ] && echo 1)" "got $r"
r=$(guard lead false 'At 04:00 IST: ask the founder about the Acrobat grant'); ok "a one-shot reminder in the Lead's copy passes" "$([ "$r" = allow ] && echo 1)" "got $r"
r=$(guard lead true 'run lead-heartbeat; notify the founder if stale'); ok "the standby's watchdog line is allowed in the Lead's copy (P-389)" "$([ "$r" = allow ] && echo 1)" "got $r"
r=$(guard lead true 'run lead-heartbeat; also label #1128'); ok "... but not with anything added" "$([ "$r" = deny ] && echo 1)" "got $r"
r=$(guard qa true 'every hour: re-run my walk'); ok "a lane's own recurring job not naming lead-watch passes" "$([ "$r" = allow ] && echo 1)" "got $r"
out=$(jq -n --arg d "$T/copy" '{tool_input:{prompt:"run lead-watch and check #1052"}, cwd:$d}' | FAKE_LANE=lead bash "$G")
ok "the refusal gives the one line to use" "$(echo "$out" | jq -e '.hookSpecificOutput.permissionDecisionReason | contains("run lead-watch; read STATE Start here")' >/dev/null && echo 1)" "$out"
ROOTD="$(cd "$TOOLS/../../../.." && pwd)"
jq -e '[.hooks.PreToolUse[] | select(.matcher == "CronCreate") | .hooks[].command | select(test("lead-check-guard.sh"))] | length == 1' "$ROOTD/.claude/settings.json" >/dev/null
ok "settings.json runs the guard on CronCreate" "$([ $? = 0 ] && echo 1)"
grep -q 'Its prompt is exactly `run lead-watch; read STATE Start here`' "$ROOTD/.claude/skills/lead/SKILL.md" && ! grep -q "Put the active rules in the 30-minute check's prompt" "$ROOTD/.claude/skills/lead/SKILL.md"
ok "skill lead gives the one line and no longer puts rules in the prompt" "$([ $? = 0 ] && echo 1)"
finish
