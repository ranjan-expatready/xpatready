#!/bin/bash
# SessionStart hook: give the builder the current state. Static rules live in CLAUDE.md / AGENTS.md (loaded by Claude Code itself).
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; PH="$ROOT/ai-workers/problem-1-pathway-setup-and-form-filling/product"
ctx=$(echo "You are the builder for the Pathway Configurator. Do one stage at a time via the /next skill; rules in product/WORKFLOW.md."; echo; echo "--- product/STATE.md ---"; cat "$PH/STATE.md")
jq -n --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
