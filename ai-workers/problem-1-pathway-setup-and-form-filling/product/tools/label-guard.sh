#!/usr/bin/env bash
# A label never outlives a review (founder, 6 Nov ~03:00 IST; on 5 Nov #1052 kept `review: approved` across a new fix
# commit). Run by .github/workflows/label-guard.yml on every push to a pull request and whenever `review: approved` is
# added to one (F4; pull_request_target, so the guard is main's copy and a PR cannot change it). When the PR carries `review: approved`, its head must be reviewed: walking
# back from the head along first parents, every step must be a pure merge of main (P-318 (1): the merge is exactly what
# git's own merge gives, its second parent is on main, and it changes none of the PR's own files) until a commit with a
# reviewer Approve: a PR comment line "Reviewer: Approve <7 to 40 hex characters of its SHA>", or a GitHub review
# APPROVED on it, by someone with write access (OWNER, MEMBER, COLLABORATOR). Otherwise the label comes off and a
# comment says why. The walk starts from the PR's head as GitHub reads it now, never from the push's "before", so a
# cancelled or failed earlier run cannot let an unreviewed commit through (#1136 review M2). Fails closed: comments or
# reviews that cannot be read count as no Approve.
# CI-PRE (P-731, founder 19 Nov, "enforced, not text"; narrowed by P-743 to a PR a failed merge batch held): such a
# reviewed head also needs one green full run (comment-run.yml's "/run full": main's ci.yml on the head merged with main)
# on the head or on a commit of the walk back to its approved commit (a pure merge of main stays exempt, as above); a PR
# no failed batch held needs none. And, when the label was just put on (LABELED), every failed part
# of the newest failed merge batch that held the PR named in a "Batch failures covered:" comment line. Main's
# queue-gate.sh proof judges both (records-only PRs exempt) and gives the reason the comment carries.
# ENF-746a (P-746): for a records-only PR (the "records" label and main's records-only.sh), a merge of main that changes
# records files the PR also changes still counts as pure, so qa's proof records keep their Approve across main's merges.
# Env: GH_TOKEN, REPO (owner/name), PR, AFTER (the push's head, or the PR's head when the label was added; the PR's
# current head wins), BEFORE (for the comment; empty when the label was added); LABELED (the label just added, if any);
# REVIEWERS (queue-gate.sh); QUEUE_GATE (the test's stand-in);
# API (default https://api.github.com); MAIN_REF (default origin/main). Runs in a git copy holding main and the PR's
# commits. Exit 0 when nothing was wrong or the label came off; 2 when the label could not be read or removed.
# Test: check-label-guard.sh.
set -uo pipefail
API="${API:-https://api.github.com}"; MAIN_REF="${MAIN_REF:-origin/main}"; LABEL="review: approved"
HERE=$(cd "$(dirname "$0")" && pwd)
for v in GH_TOKEN REPO PR AFTER; do [ -n "${!v:-}" ] || { echo "label-guard: $v is not set"; exit 2; }; done
H=$(mktemp); trap 'rm -f "$H"' EXIT; chmod 600 "$H"   # the token in a file, not on curl's command line (seen by ps)
printf 'Authorization: Bearer %s\nAccept: application/vnd.github+json\n' "$GH_TOKEN" > "$H"
api() { curl -sS --fail-with-body -H @"$H" "$@"; }
pages() {  # every page of a list endpoint, as one JSON array
  local p=1 all='[]' one; while [ "$p" -le 20 ]; do
    one=$(api "$API/$1?per_page=100&page=$p") || return 1
    all=$(jq -s '.[0] + .[1]' <(echo "$all") <(echo "$one")); [ "$(echo "$one" | jq length)" -lt 100 ] && break; p=$((p + 1))
  done; echo "$all"; }

labels=$(api "$API/repos/$REPO/issues/$PR/labels") || { echo "label-guard: cannot read labels"; exit 2; }
echo "$labels" | jq -e --arg l "$LABEL" 'any(.[]; .name == $l)' >/dev/null || { echo "no '$LABEL' label on #$PR: nothing to guard"; exit 0; }
now=$(api "$API/repos/$REPO/pulls/$PR" 2>/dev/null | jq -r '.head.sha // empty' 2>/dev/null)
headless=""   # fails closed: a head that cannot be read or fetched keeps no label (#1136 Devin review)
if [ -z "$now" ]; then headless="the PR's current head could not be read"
elif [ "$now" != "$AFTER" ]; then
  git cat-file -e "$now^{commit}" 2>/dev/null || git fetch -q --no-tags origin "$now" 2>/dev/null
  if git cat-file -e "$now^{commit}" 2>/dev/null; then echo "the PR's head is now ${now:0:9} (this push was ${AFTER:0:9}): guarding the head"
  else headless="the PR's current head ${now:0:9} could not be fetched"; fi
  AFTER=$now
fi

# Approves by people with write access (anyone can comment on a public repository; #1136 review M1).
team='.author_association == "OWNER" or .author_association == "MEMBER" or .author_association == "COLLABORATOR"'
comments=$(pages "repos/$REPO/issues/$PR/comments") || { echo "label-guard: comments unreadable: no Approve counted"; comments='[]'; }
reviews=$(pages "repos/$REPO/pulls/$PR/reviews") || { echo "label-guard: reviews unreadable: no Approve counted"; reviews='[]'; }
named=$(echo "$comments" | jq -r ".[] | select($team) | .body // \"\"" | jq -Rr 'gsub("[*_`]"; "")
  | select(test("\\breviewer:\\s*approve[sd]?\\b"; "i")) | sub("(?i)^.*?\\breviewer:\\s*approve[sd]?"; "")
  | [scan("\\b[0-9a-f]{7,40}\\b")] | first // empty')   # only the first SHA after "Approve" (review n1)
approved() {  # $1 a commit → 0 when a reviewer Approve names it
  local s; for s in $named; do case "$1" in "$s"*) echo "Approve line ($s)"; return 0;; esac; done
  echo "$reviews" | jq -e --arg h "$1" "any(.[]; ($team) and .state == \"APPROVED\" and .commit_id == \$h)" >/dev/null && { echo "GitHub review"; return 0; }
  return 1; }
pure() {  # $1 a commit → 0 when it is a pure merge of main touching none of the PR's files; else why in $why
  local par t mine touched both
  read -r -a par <<< "$(git rev-list --parents -n 1 "$1" 2>/dev/null | cut -d' ' -f2-)"
  [ "${#par[@]}" -eq 2 ] || { why="${1:0:9} is a new commit"; return 1; }
  git merge-base --is-ancestor "${par[1]}" "$MAIN_REF" 2>/dev/null || { why="${1:0:9} merges a branch that is not main"; return 1; }
  t=$(git merge-tree --write-tree "${par[0]}" "${par[1]}" 2>/dev/null | head -1)
  [ -n "$t" ] && [ "$t" = "$(git rev-parse "$1^{tree}")" ] || { why="${1:0:9} differs from git's own merge of main (edited by hand or conflicted)"; return 1; }
  mine=$(git diff --no-renames --name-only "$(git merge-base "${par[0]}" "${par[1]}")" "${par[0]}")
  touched=$(git diff --no-renames --name-only "${par[0]}" "$1")
  both=$(comm -12 <(echo "$mine" | sort -u) <(echo "$touched" | sort -u) | grep . | head -5)
  if [ -n "$both" ]; then
    # ENF-746a (P-746, founder 20 Nov): a records-only PR (qa's proof records) keeps its Approve across a merge of main
    # that changes only records files it also changes (BUGS.md, CAPABILITIES.md): no code a reviewer read changed.
    # Both tests fail closed, as queue-gate.sh records(): the "records" label (records-label.yml, from a full checkout)
    # and main's records-only.sh on every file the PR changes. Any other PR keeps the rule above (P-318 (1)).
    records_pr "$mine" && records_pr "$both" \
      || { why="${1:0:9}'s merge of main changes the PR's own files ($(echo "$both" | paste -sd ' ' -))"; return 1; }
    echo "${1:0:9}'s merge of main changes only records files of this records-only PR ($(echo "$both" | paste -sd ' ' -)): counted as pure (ENF-746a)"
  fi
  next=${par[0]}; return 0; }
records_pr() {  # $1 changed paths → 0 when the PR carries the records label and main's records-only.sh calls them records
  echo "$labels" | jq -e 'any(.[]; .name == "records")' >/dev/null || return 1
  [ "$(printf '%s\n' "$1" | (cd "$HERE" && bash "${RECORDS_ONLY:-$HERE/records-only.sh}" is-records --files) 2>/dev/null)" = yes ]; }

c=$AFTER; merges=0; why="$headless"; seen=""; unproved=""
[ -n "$why" ] || git cat-file -e "$c^{commit}" 2>/dev/null || why="the head ${c:0:9} is not in this copy"
while [ -z "$why" ] && [ "$merges" -le 50 ]; do
  seen="$seen $c"
  if by=$(approved "$c"); then
    relabel=0; [ "${LABELED:-}" = "$LABEL" ] && relabel=1
    unproved=$(PR=$PR HEADS="$seen" RELABEL=$relabel bash "${QUEUE_GATE:-$(dirname "$0")/queue-gate.sh}" proof 2>/dev/null); p=$?
    [ "$p" = 1 ] && break
    [ "$p" = 0 ] || { echo "label-guard: the full-run check could not finish: $unproved"; exit 2; }
    [ "$merges" = 0 ] && echo "kept: ${c:0:9} has a reviewer Approve ($by)" \
      || echo "kept: ${AFTER:0:9} is $merges pure merge(s) of main (P-318 (1)) on ${c:0:9}, which has a reviewer Approve ($by)"
    exit 0; fi
  pure "$c" || break
  c=$next; merges=$((merges + 1))
done
[ -n "$why" ] || why="more than 50 merges of main without an approved commit"

# No review for the head: the label comes off, and the PR says why.
enc=$(jq -rn --arg l "$LABEL" '$l|@uri')
api -X DELETE "$API/repos/$REPO/issues/$PR/labels/$enc" >/dev/null || { echo "label-guard: could not remove the label"; exit 2; }
[ -z "$unproved" ] || { why=$unproved; body="**Label guard (CI-PRE, P-731):** \`$LABEL\` removed from the head \`${AFTER:0:9}\`: $why.

To label again: after a failed merge batch held this PR, the label needs one green full run on the head (comment \`/run full\`; when it ends green the queue gate labels a reviewed head by itself, or a person does where P-423 keeps the Lead's read) and a comment line naming every failed part of that batch run; a PR no failed batch held needs neither (P-743)."; }
[ -n "$unproved" ] || body="**Label guard:** \`$LABEL\` removed. The head \`${AFTER:0:9}\`${BEFORE:+ (was \`${BEFORE:0:9}\`)} is not covered by a reviewer Approve: walking back from it, $why, before any commit with an Approve. Only pure merges of main that touch none of this PR's files may follow an approved commit (P-318 (1)).

To label again: the reviewer re-reviews the diff since its last approved commit (P-293), the PR gets a comment line \"Reviewer: Approve\" followed by the new head's SHA, then the label goes back on (founder, 6 Nov ~03:00 IST: \"a label never outlives a review\")."
api -X POST "$API/repos/$REPO/issues/$PR/comments" -d "$(jq -n --arg b "$body" '{body: $b}')" >/dev/null || echo "label-guard: label removed, but the comment failed"
echo "removed '$LABEL' from #$PR: $why"
