#!/usr/bin/env bash
# The eight guards of 6 Nov, and B134's label sweep (7 Nov) (founder, ~03:00 IST: "fix it so that it becomes a hard rule and it never messes up"), each
# with its test. --mutate also proves each test fails without its guard: in a throwaway copy of the tools, the guard is
# switched off by one edit and its test must go red. Run by .github/workflows/guards.yml. US$0, no network.
#   bash product/tools/check-guards.sh [--mutate]
set -u
TOOLS="$(cd "$(dirname "$0")" && pwd)"; ROOTD="$(cd "$TOOLS/../../../.." && pwd)"; P=ai-workers/problem-1-pathway-setup-and-form-filling
TESTS="check-current-lead.sh check-label-guard.sh check-lane-preflight.sh check-isolated-ttl.sh check-gh-fallback.sh check-state-page.sh check-lead-cron.sh check-lead-heartbeat.sh check-label-sweep.sh"
bad=0
for t in $TESTS; do bash "$TOOLS/$t" > "${TMPDIR:-/tmp}/guard-$$.log" 2>&1; r=$?; echo "$( [ $r = 0 ] && echo PASS || echo FAIL )  $t ($(tail -1 "${TMPDIR:-/tmp}/guard-$$.log"))"
  [ $r = 0 ] || { bad=1; grep '^FAIL' "${TMPDIR:-/tmp}/guard-$$.log" | sed 's/^/      /'; }; done
rm -f "${TMPDIR:-/tmp}/guard-$$.log"
[ "${1:-}" = --mutate ] || exit $bad
# guard | file the edit goes in | sed edit that switches the guard off (no | in it: .. stands for ||) | the test that must then fail
MUT='1|product/tools/check-docs.sh|/CURRENT LEAD: STATE.md has/d|check-current-lead.sh
2|product/tools/label-guard.sh|s/^# No review for the head.*/exit 0/|check-label-guard.sh
2 walk|product/tools/label-guard.sh|s/^  c=\$next; merges=.*/  exit 0/|check-label-guard.sh
2 who|product/tools/label-guard.sh|s/^team=.*/team=true/|check-label-guard.sh
2 labeled|../../.github/workflows/label-guard.yml|s/types: \[synchronize, labeled\]/types: [synchronize]/|check-label-guard.sh
2 after|../../.github/workflows/label-guard.yml|s/^\( *AFTER: \).*/\1${{ github.event.after }}/|check-label-guard.sh
3|product/tools/lane-preflight.sh|/under ${min} GB;/d|check-lane-preflight.sh
4 ttl|prototype/studio/tools/isolated.sh|s/\$(( TTL \* \${ISOLATED_TTL_UNIT:-60} ))/999999/|check-isolated-ttl.sh
4 cap|prototype/studio/tools/isolated.sh|s/COPY_CAP:-4} ))/COPY_CAP:-99} ))/|check-isolated-ttl.sh
5|product/tools/factory-board.sh|s/; gh() { bash "\$TOOLS\/gh.sh" "\$@"; }//|check-gh-fallback.sh
6|product/tools/check-docs.sh|/STATE TOO BIG/d|check-state-page.sh
7|product/tools/check-docs.sh|s/if m > 30:/if False:/|check-state-page.sh
8|product/tools/lead-check-guard.sh|s/^\[ -z "\$why" \] \&\& exit 0/exit 0/|check-lead-cron.sh
9|product/tools/label-sweep.sh|s/^  if \[ "\$who" != "\$BOT" \]; then/  if true; then/|check-label-sweep.sh
9 sched|../../.github/workflows/label-guard.yml|/cron: "\*\/10 \* \* \* \*"/d|check-label-sweep.sh
9 queued|../../.github/workflows/label-guard.yml|/event_name == 'schedule'/s/ .. (github.event.action == 'labeled' \&\& github.event.label.name == 'queued')//|check-label-sweep.sh
9 guardq|../../.github/workflows/label-guard.yml|/review: approved' /s/ .. github.event.label.name == 'queued')"/)"/|check-label-guard.sh
9 ci|../../.github/workflows/label-guard.yml|/    workflows: \[ci\]/d|check-label-sweep.sh'
echo "--- each test without its guard (must FAIL)"
while IFS='|' read -r g f edit t; do
  M=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$M" ] || { echo "no temp dir: nothing was checked"; exit 2; }; mkdir -p "$M/$P/product" "$M/$P/prototype/studio" "$M/.claude" "$M/.github/workflows" "$M/$P/product/qa"
  cp -R "$TOOLS" "$M/$P/product/"; cp -R "$ROOTD/$P/prototype/studio/tools" "$M/$P/prototype/studio/"
  cp "$ROOTD/$P/product/qa/CAPABILITIES.md" "$M/$P/product/qa/"; cp -R "$ROOTD/.claude/skills" "$ROOTD/.claude/settings.json" "$M/.claude/"
  cp "$ROOTD/.github/workflows/"*.yml "$M/.github/workflows/"; git -C "$M" init -q   # every workflow: check-label-guard parses two
  before=$(cksum < "$M/$P/$f"); sed -i.bak "$edit" "$M/$P/$f"; rm -f "$M/$P/$f.bak"
  sh=bash; head -1 "$M/$P/$f" | grep -q zsh && sh=zsh; case "$f" in *.yml) sh=true;; esac   # a .yml is parsed by its test
  if [ "$before" = "$(cksum < "$M/$P/$f")" ]; then echo "FAIL  guard $g: the edit '$edit' changed nothing in $f"; bad=1
  elif ! $sh -n "$M/$P/$f" 2>"$M/log"; then echo "FAIL  guard $g: the edit '$edit' breaks $f's syntax, so its test failing proves nothing ($(head -1 "$M/log"))"; bad=1
  elif bash "$M/$P/product/tools/$t" > "$M/log" 2>&1; then echo "FAIL  guard $g: $t still passes with the guard off"; bad=1
  else echo "PASS  guard $g off → $t fails ($(tail -1 "$M/log"); first: $(grep -m1 '^FAIL' "$M/log" | cut -c7-90))"; fi
  rm -rf "$M"
done <<< "$MUT"
exit $bad
