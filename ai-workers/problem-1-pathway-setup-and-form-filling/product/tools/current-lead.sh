#!/bin/bash
# Who is the tech lead now (founder, 6 Nov ~03:00 IST: lanes always report to the current Lead). Prints the one
# `current_lead: <session id> <title>` line of STATE.md without its prefix; --id prints the session id only.
# The Lead's records reach main once a day (P-336), so this reads the freshest STATE.md on GitHub: origin/main and every
# origin/lead/* branch, taking the one whose last STATE.md commit is newest; a copy with no origin reads its own file.
# Exit 1 when that STATE.md has no current_lead line or more than one (check-docs.sh refuses both).
# --where prints where the line was read (refs/remotes/origin/main, refs/remotes/origin/lead/<name>, or "STATE.md (this
# copy)") instead of the line; check-docs.sh uses it when main's STATE.md has no line (the Lead keeps STATE on lead/*).
# Usage: bash product/tools/current-lead.sh [--id | --where] [--no-fetch]
id_only=0; where=0; fetch=1; for a in "$@"; do case "$a" in --id) id_only=1;; --where) where=1;; --no-fetch) fetch=0;; esac; done
cd "$(dirname "$0")/.." || exit 2
rel="$(git rev-parse --show-prefix 2>/dev/null)STATE.md"
best=""
if git remote get-url origin >/dev/null 2>&1; then
  [ "$fetch" = 1 ] && git fetch -q origin main 'refs/heads/lead/*:refs/remotes/origin/lead/*' 2>/dev/null
  # Newest STATE.md commit first; read files only until one has the line (a blob:none CI copy fetches each file it reads).
  while read -r t ref; do
    git show "$ref:$rel" 2>/dev/null | grep -q '^current_lead: ' && { best=$ref; break; }
  done < <(for ref in $(git for-each-ref --format='%(refname)' refs/remotes/origin/main 'refs/remotes/origin/lead/'); do
    t=$(git log -1 --format=%ct "$ref" -- STATE.md 2>/dev/null); [ -n "$t" ] && echo "$t $ref"; done | sort -s -k1,1nr)
fi
if [ -n "$best" ]; then lines=$(git show "$best:$rel" | grep '^current_lead: '); src="$best"
else lines=$(grep '^current_lead: ' STATE.md 2>/dev/null); src="STATE.md (this copy)"; fi
n=$(printf '%s' "$lines" | grep -c '^current_lead: ')
[ "$n" -eq 1 ] || { echo "current-lead: $src has $n current_lead lines, needs exactly one; ask with ListAgents (highest \"Lead N ·\", not ended or standby)" >&2; exit 1; }
v=${lines#current_lead: }
if [ "$where" = 1 ]; then echo "$src"; exit 0; fi
# A session id first (letters, "_", then at least 8 of [A-Za-z0-9_-]: local_<uuid>, session_<id>), then a title naming
# "Lead N"; "current_lead: Lead 21 · … Lead 20" would give --id "Lead" and route every lane nowhere (#1136 Devin review).
echo "$v" | grep -qE '^[A-Za-z]+_[A-Za-z0-9_-]{8,} .*Lead [0-9]+' || { echo "current-lead: $src's current_lead line does not start with a session id, then a title naming \"Lead N\": $v" >&2; exit 1; }
if [ "$id_only" = 1 ]; then echo "${v%% *}"; else echo "$v"; fi
