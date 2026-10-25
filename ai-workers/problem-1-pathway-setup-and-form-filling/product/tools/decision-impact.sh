#!/bin/bash
# Decision impact check (P-74): every product decision from P-61 on must become something a person can see and the
# tester can verify — a capability row in qa/CAPABILITIES.md (scheduled now) or a BACKLOG.md item (scheduled later).
# A mention in a lane note is not enough. Workflow and scope decisions are listed in EXEMPT. Exit 1 if any is missing. Run by the Lead before ending a chat (skill lead) and by
# the qa lane (skill qa). Usage: decision-impact.sh [first P-number, default 61]
PH="$(cd "$(dirname "$0")/.." && pwd)"; first=${1:-61}; bad=0
EXEMPT=" P-64 P-68 P-69 P-70 P-74 P-75 P-81 P-82 P-83 P-84 P-85 P-86 P-87 P-88 P-89 P-91 P-92 "   # workflow, tooling and scope decisions (no screen of their own)
ids=$(grep -o '^| P-[0-9]*' "$PH/DECISIONS.md" | tr -d '| ' | sort -t- -k2 -n -u)
for id in $ids; do
  n=${id#P-}; [ "$n" -ge "$first" ] || continue
  case "$EXEMPT" in *" $id "*) echo "$id → workflow or scope (exempt)"; continue;; esac
  rows=$(grep -E "^\| C[0-9.]+ .*\b$id\b" "$PH/qa/CAPABILITIES.md" | cut -d'|' -f2 | tr -d ' ' | tr '\n' ' ')
  later=$(grep -E "^\| B[0-9]+ .*\b$id\b" "$PH/BACKLOG.md" | cut -d'|' -f2 | tr -d ' ' | tr '\n' ' ')
  if [ -z "$rows$later" ]; then echo "NO CAPABILITY: $id — nothing a person can see or the tester can check"; bad=1
  else echo "$id → ${rows:+capabilities $rows}${later:+ backlog $later}"; fi
done
exit $bad
