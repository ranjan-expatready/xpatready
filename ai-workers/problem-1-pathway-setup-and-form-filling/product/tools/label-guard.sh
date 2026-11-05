#!/usr/bin/env bash
# A label never outlives a review (founder, 6 Nov ~03:00 IST; on 5 Nov #1052 kept `review: approved` across a new fix
# commit). Run by .github/workflows/label-guard.yml on every push to a pull request (pull_request_target, so the guard
# is main's copy and a PR cannot change it). When the PR carries `review: approved` and its new head has no reviewer
# Approve recorded for that exact commit, the label comes off and a comment says why. Kept only when:
#   * a PR comment line reads "Reviewer: Approve" and names the new head (7 to 40 hex characters of its SHA), or a
#     GitHub review APPROVED on that commit; or
#   * the push is a pure merge of main (P-318 (1)): the new head's parents are the old head and a commit on main, it is
#     exactly what git's own merge gives (nothing edited by hand), and it changes none of the PR's own files.
# Env: GH_TOKEN, REPO (owner/name), PR, BEFORE, AFTER; API (default https://api.github.com); MAIN_REF (default
# origin/main). Runs in a git copy holding main and the PR's commits. Exit 0 when nothing was wrong or the label came
# off as it should; 2 on a usage or API error. Test: check-label-guard.sh.
set -uo pipefail
API="${API:-https://api.github.com}"; MAIN_REF="${MAIN_REF:-origin/main}"; LABEL="review: approved"
for v in GH_TOKEN REPO PR BEFORE AFTER; do [ -n "${!v:-}" ] || { echo "label-guard: $v is not set"; exit 2; }; done
api() { curl -sS --fail-with-body -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "$@"; }
pages() {  # every page of a list endpoint, as one JSON array
  local p=1 all='[]' one; while [ "$p" -le 20 ]; do
    one=$(api "$API/$1?per_page=100&page=$p") || return 1
    all=$(jq -s '.[0] + .[1]' <(echo "$all") <(echo "$one")); [ "$(echo "$one" | jq length)" -lt 100 ] && break; p=$((p + 1))
  done; echo "$all"; }

labels=$(api "$API/repos/$REPO/issues/$PR/labels") || { echo "label-guard: cannot read labels"; exit 2; }
echo "$labels" | jq -e --arg l "$LABEL" 'any(.[]; .name == $l)' >/dev/null || { echo "no '$LABEL' label on #$PR: nothing to guard"; exit 0; }

# 1. A reviewer Approve recorded for this exact head.
comments=$(pages "repos/$REPO/issues/$PR/comments") || { echo "label-guard: cannot read comments"; exit 2; }
reviews=$(pages "repos/$REPO/pulls/$PR/reviews") || { echo "label-guard: cannot read reviews"; exit 2; }
named=$(echo "$comments" | jq -r '.[].body // "" | split("\n")[] | gsub("[*_`]"; "")
  | select(test("\\breviewer:\\s*approve[sd]?\\b"; "i")) | [scan("\\b[0-9a-f]{7,40}\\b")][]')
for s in $named; do case "$AFTER" in "$s"*) echo "kept: reviewer Approve recorded for ${AFTER:0:9} ($s)"; exit 0;; esac; done
if echo "$reviews" | jq -e --arg h "$AFTER" 'any(.[]; .state == "APPROVED" and .commit_id == $h)' >/dev/null; then
  echo "kept: GitHub review APPROVED on ${AFTER:0:9}"; exit 0; fi

# 2. A pure merge of main touching none of the PR's files (P-318 (1)).
why="it is a new commit"
read -r -a par <<< "$(git rev-list --parents -n 1 "$AFTER" 2>/dev/null | cut -d' ' -f2-)"
if [ "${#par[@]}" -eq 2 ] && [ "${par[0]}" = "$BEFORE" ]; then
  why="it merges main by hand"
  if git merge-base --is-ancestor "${par[1]}" "$MAIN_REF" 2>/dev/null; then
    t=$(git merge-tree --write-tree "${par[0]}" "${par[1]}" 2>/dev/null | head -1)
    if [ -n "$t" ] && [ "$t" = "$(git rev-parse "$AFTER^{tree}")" ]; then
      mine=$(git diff --name-only "$(git merge-base "${par[0]}" "${par[1]}")" "${par[0]}")
      touched=$(git diff --name-only "${par[0]}" "$AFTER")
      both=$(comm -12 <(echo "$mine" | sort -u) <(echo "$touched" | sort -u) | grep . | head -5)
      if [ -z "$both" ]; then echo "kept: ${AFTER:0:9} is a pure merge of main touching none of the PR's files (P-318 (1))"; exit 0; fi
      why="its merge of main changes the PR's own files ($(echo "$both" | tr '\n' ' ' | sed 's/ $//'))"
    else why="its merge differs from git's own merge of main (edited by hand or conflicted)"; fi
  else why="its second parent is not on main"; fi
fi

# 3. No review for this head: the label comes off, and the PR says why.
enc=$(jq -rn --arg l "$LABEL" '$l|@uri')
api -X DELETE "$API/repos/$REPO/issues/$PR/labels/$enc" >/dev/null || { echo "label-guard: could not remove the label"; exit 2; }
body="**Label guard:** \`$LABEL\` removed. The new head \`${AFTER:0:9}\` (was \`${BEFORE:0:9}\`) has no reviewer Approve recorded for that exact commit, and $why, so it is not a pure merge of main that touches none of this PR's files (P-318 (1)).

To label again: the reviewer re-reviews the diff since its last approved commit (P-293), the PR gets a comment line \`Reviewer: Approve $AFTER\`, then the label goes back on (rule: founder, 6 Nov ~03:00 IST, \"a label never outlives a review\")."
api -X POST "$API/repos/$REPO/issues/$PR/comments" -d "$(jq -n --arg b "$body" '{body: $b}')" >/dev/null || echo "label-guard: label removed, but the comment failed"
echo "removed '$LABEL' from #$PR: $why"
