#!/bin/bash
# Keeps agent instructions small and links working (P-188, P-189): skills and agents under 100 lines and 10 KB (P-203: over it, merge duplicates only, never cut a unique rule; overflow moves to WAY-OF-WORKING.md with a pointer), root
# CLAUDE.md/AGENTS.md under 60 lines (long instruction files lower agents' success: design/research-agent-teams-2026-10-31.md);
# records have no size limit (git history is the archive); backticked product paths must exist next to the citing file,
# in the product or problem folder, or at the root. Prints problems; exit 1 if any. Used by the Stop hook and the tech lead.
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"; PH="$ROOT/ai-workers/problem-1-pathway-setup-and-form-filling/product"
out=$(mktemp); trap 'rm -f "$out"' EXIT
check() { local max=$1 kb=$2; shift 2; for f in "$@"; do [ -f "$f" ] || continue; n=$(wc -l < "$f"); b=$(wc -c < "$f")
  [ "$n" -gt "$max" ] && echo "TOO LONG ($n lines > $max): ${f#$ROOT/}"
  [ "$kb" -gt 0 ] && [ "$b" -gt $((kb * 1024)) ] && echo "TOO BIG ($((b / 1024)) KB > $kb KB): ${f#$ROOT/}"; done; }
{
  check 100 10 "$ROOT"/.claude/skills/*/SKILL.md "$ROOT"/.claude/agents/*.md
  check 60 0 "$ROOT/CLAUDE.md" "$ROOT/AGENTS.md"
  # STATE.md names the current Lead on exactly one line, so every lane can find whom to report to (founder, 6 Nov
  # ~03:00 IST: "a hard rule and it never messes up"; tools/current-lead.sh reads it; test: check-current-lead.sh).
  S="$PH/STATE.md"
  if [ -f "$S" ]; then
    n=$(grep -c '^current_lead: ' "$S")
    [ "$n" -eq 1 ] || echo "CURRENT LEAD: STATE.md has $n current_lead lines, needs exactly one (current_lead: <session id> <title>)"
    [ "$n" -eq 1 ] && ! grep -qE '^current_lead: [^ ]+ .*Lead [0-9]+' "$S" && echo "CURRENT LEAD: STATE.md's current_lead line needs a session id, then a title naming \"Lead N\""
    # One page (6 Nov: it reached 34 KB and every Lead re-read it; test: check-state-page.sh).
    b=$(wc -c < "$S"); [ "$b" -gt 12288 ] && echo "STATE TOO BIG ($((b / 1024)) KB > 12 KB): move the earlier page to product/history/STATE-<date>-<time>-<lead>.md and keep one page"
  fi
  for f in "$PH"/*.md "$PH"/domain/*.md "$ROOT"/.claude/skills/*/SKILL.md "$ROOT"/.claude/agents/*.md; do
    grep -o '`[A-Za-z0-9_./-]*\.md`' "$f" | tr -d '`' | sort -u | while read -r ref; do
      # Retired files (P-188, P-189) live in git history; old decision rows and records may still name them.
      case "$ref" in WORKFLOW.md|LANES.md|CHARTER.md|LEAD.md|RETRO.md|WAVE-1.md|SCREENS.md|REQUESTS.md|PLAN.md|WAY-OF-WORKING-draft.md|TEAM.md) continue;; esac
      case "$ref" in */NN*|*NN-*|*"<"*|concept.md|challenge.md|build-notes.md|review.md|break-report.md|lead-check.md|plan.md|journey-test.md|concept-draft.md) continue;; esac
      [ -f "$PH/$ref" ] || [ -f "$ROOT/$ref" ] || [ -f "$(dirname "$f")/$ref" ] || [ -f "$PH/domain/$ref" ] || [ -f "$PH/../$ref" ] || echo "MISSING LINK in ${f#$ROOT/}: $ref"
    done
  done
} | sort -u > "$out"
# Times are read, not guessed (6 Nov): a warning, never a failure, when STATE's "updated: YYYY-MM-DD HH:MM IST" is more
# than 30 minutes from the time it was committed (now, while STATE.md has uncommitted changes). Test: check-state-page.sh.
if [ -f "$PH/STATE.md" ]; then
  u=$(sed -nE 's/^updated: ([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}) IST.*/\1/p' "$PH/STATE.md" | head -1)
  c=$(cd "$PH" && git diff --quiet HEAD -- STATE.md 2>/dev/null && git log -1 --format=%ct -- STATE.md 2>/dev/null); [ -n "$c" ] || c=$(date +%s)
  [ -n "$u" ] && python3 -I -c 'import sys, datetime as d
ist = d.timezone(d.timedelta(hours=5, minutes=30))
u = d.datetime.strptime(sys.argv[1], "%Y-%m-%d %H:%M").replace(tzinfo=ist); c = d.datetime.fromtimestamp(int(sys.argv[2]), ist)
m = abs((c - u).total_seconds()) / 60
if m > 30: print("WARN  STATE.md says updated %s IST, but it was committed %s IST (%d min apart): read the time with TZ=Asia/Kolkata date, never guess" % (sys.argv[1], c.strftime("%Y-%m-%d %H:%M"), m))' "$u" "$c"
fi
cat "$out"; [ -s "$out" ] && exit 1; echo "docs OK"; exit 0
