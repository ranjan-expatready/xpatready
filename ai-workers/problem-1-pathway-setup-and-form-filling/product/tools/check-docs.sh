#!/bin/bash
# Keeps the rules small and linked: rules files, skills and agents under 100 lines; per-screen working files under 150; root CLAUDE.md/AGENTS.md under 60;
# backticked product paths must exist. Prints problems; exit 1 if any. Used by the builder's Stop hook and by the Lead before ending a chat.
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; PH="$ROOT/ai-workers/problem-1-pathway-setup-and-form-filling/product"; bad=0
check() { local max=$1; shift; for f in "$@"; do [ -f "$f" ] || continue; n=$(wc -l < "$f"); if [ "$n" -gt "$max" ]; then echo "TOO LONG ($n > $max): ${f#$ROOT/}"; bad=1; fi; done; }
check 100 "$PH"/*.md "$PH"/domain/*.md "$PH"/decisions/*.md "$ROOT"/.claude/skills/*/SKILL.md "$ROOT"/.claude/agents/*.md
check 150 "$PH"/screens/*/*.md   # working documents per screen (concept, challenge, review…) may run longer
check 60 "$ROOT/CLAUDE.md" "$ROOT/AGENTS.md"
for f in "$PH"/*.md "$PH"/domain/*.md "$ROOT"/.claude/skills/*/SKILL.md; do
  grep -o '`[A-Za-z0-9_./-]*\.md`' "$f" | tr -d '`' | sort -u | while read -r ref; do
    case "$ref" in */NN*|*NN-*|*"<"*|concept.md|challenge.md|build-notes.md|review.md|break-report.md|handover.md) continue;; esac
    [ -f "$PH/$ref" ] || [ -f "$ROOT/$ref" ] || [ -f "$(dirname "$f")/$ref" ] || [ -f "$PH/domain/$ref" ] || [ -f "$ROOT/ai-workers/$ref" ] || echo "MISSING LINK in ${f#$ROOT/}: $ref"
  done
done | sort -u | tee /tmp/check-docs-links.txt
[ -s /tmp/check-docs-links.txt ] && bad=1
[ $bad -eq 0 ] && echo "docs OK"; exit $bad
