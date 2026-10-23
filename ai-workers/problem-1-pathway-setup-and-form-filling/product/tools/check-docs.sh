#!/bin/bash
# Keeps the rules small, linked and consistent: rules files, skills and agents under 100 lines and a size cap (a long line
# is not a short file); per-screen working files under 150 lines; root CLAUDE.md/AGENTS.md under 60; backticked product
# paths must exist next to the citing file, in the product or problem folder, or at the root (lane files are the lanes' own); skills and agents may only name the
# stages in WORKFLOW.md. Prints problems; exit 1 if any. Used by the Stop hook and by the Lead before ending a chat.
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; PH="$ROOT/ai-workers/problem-1-pathway-setup-and-form-filling/product"
out=$(mktemp); trap 'rm -f "$out"' EXIT
check() { local max=$1 kb=$2; shift 2; for f in "$@"; do [ -f "$f" ] || continue; n=$(wc -l < "$f"); b=$(wc -c < "$f")
  [ "$n" -gt "$max" ] && echo "TOO LONG ($n lines > $max): ${f#$ROOT/}"
  [ "$kb" -gt 0 ] && [ "$b" -gt $((kb * 1024)) ] && echo "TOO BIG ($((b / 1024)) KB > $kb KB): ${f#$ROOT/}"; done; }
{
  # Registers (DECISIONS, REQUESTS, qa/CAPABILITIES) are capped by lines only: older rows move to history/.
  check 100 0 "$PH/DECISIONS.md" "$PH/REQUESTS.md" "$PH/qa/CAPABILITIES.md"
  check 100 12 $(ls "$PH"/*.md "$PH"/domain/*.md "$PH"/decisions/*.md "$PH"/lanes/*.md "$PH"/qa/*.md 2>/dev/null | grep -v -e '/DECISIONS.md$' -e '/REQUESTS.md$' -e '/qa/CAPABILITIES.md$')
  check 100 7 "$ROOT"/.claude/skills/*/SKILL.md "$ROOT"/.claude/agents/*.md
  check 150 0 "$PH"/screens/*/*.md
  check 60 0 "$ROOT/CLAUDE.md" "$ROOT/AGENTS.md"
  for f in "$PH"/*.md "$PH"/domain/*.md "$ROOT"/.claude/skills/*/SKILL.md "$ROOT"/.claude/agents/*.md; do
    grep -o '`[A-Za-z0-9_./-]*\.md`' "$f" | tr -d '`' | sort -u | while read -r ref; do
      case "$ref" in */NN*|*NN-*|*"<"*|concept.md|challenge.md|build-notes.md|review.md|break-report.md|lead-check.md|plan.md|journey-test.md|concept-draft.md) continue;; esac
      [ -f "$PH/$ref" ] || [ -f "$ROOT/$ref" ] || [ -f "$(dirname "$f")/$ref" ] || [ -f "$PH/domain/$ref" ] || [ -f "$PH/../$ref" ] || echo "MISSING LINK in ${f#$ROOT/}: $ref"
    done
    # Stage words must be WORKFLOW.md's (DESIGN READY BUILD EARLY-LOOK FINISH CHECK FIX DEMO DONE; backend: PLAN BUILD CHECK FIX MERGE).
    grep -n -o -E '(stage|at|Stage) (CONCEPT|AGREED|CHALLENGE|REVIEW|HANDOVER)\b' "$f" | sed "s|^|OLD STAGE NAME in ${f#$ROOT/}:|"
  done
} | sort -u > "$out"
cat "$out"; [ -s "$out" ] && exit 1; echo "docs OK"; exit 0
