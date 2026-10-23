#!/bin/bash
# Switch Claude Code to the 21 Oct workflow. Run only after the previous builder session has stopped.
set -e
X="$(cd "$(dirname "$0")/../.." && pwd)"; SW="$X/delivery-reset-2026-10-21/switchover"; A="$X/archive/2026-10-21-before-workflow-switch"
mkdir -p "$A"
cp -p "$X/CLAUDE.md" "$A/root-CLAUDE.md"; cp -p "$X/AGENTS.md" "$A/root-AGENTS.md"; cp -p "$X/.claude/settings.json" "$A/settings.json"
cp -p "$X/ai-workers/NEXT.md" "$A/ai-workers-NEXT.md"; cp -p "$X/ai-workers/problem-1-pathway-setup-and-form-filling/CLAUDE.md" "$A/problem1-CLAUDE.md"
cp "$SW/CLAUDE.md" "$X/CLAUDE.md"; cp "$SW/NEXT.md" "$X/ai-workers/NEXT.md"; cp "$SW/settings.json" "$X/.claude/settings.json"
{ cat "$SW/AGENTS-header.md"; cat "$A/root-AGENTS.md"; } > "$X/AGENTS.md"
{ cat "$SW/problem1-CLAUDE-header.md"; cat "$A/problem1-CLAUDE.md"; } > "$X/ai-workers/problem-1-pathway-setup-and-form-filling/CLAUDE.md"
echo "Switched. Originals in $A"
