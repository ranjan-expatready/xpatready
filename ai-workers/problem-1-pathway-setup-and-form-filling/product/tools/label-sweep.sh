#!/usr/bin/env bash
# B134 (Lead 30 on #1232, P-214 fix to the checks): no PR labels itself `review: approved`. A same-repo PR runs its own
# copy of ci.yml, so a job it adds can put the label on with GITHUB_TOKEN; a label set that way starts no workflow run,
# so label-guard.yml's "labeled" run never sees it, and Mergify would queue the PR on a green ci. This sweep, run by
# label-guard.yml when Mergify puts `queued` on, every 10 minutes and after each ci run (main's copy, never the PR's),
# lists the open PRs carrying `review: approved` and reads each one's issue events: when the event that put the label
# on (the last "labeled" for it) has the actor github-actions[bot], the label comes off and a comment says why. A label
# put on by a person (the tech lead, a builder through the claude app: actor is the person) is kept, and so is any
# other bot's. An event list longer than PAGES_MAX pages counts as padded and the label comes off. Unlike label-guard.sh,
# a PR whose events cannot be read keeps its label (a GitHub hiccup must not empty the queue): the run goes red (exit 2)
# and the next sweep tries again; label-guard.yml's guard job, run when Mergify puts `queued` on, fails closed instead.
# Env: GH_TOKEN, REPO (owner/name); API (default https://api.github.com). Exit 0 all judged; 2 something could not be
# read or removed. Test: check-label-sweep.sh. The hard boundary for .github/** is the founder's (STATE F6).
set -uo pipefail
API="${API:-https://api.github.com}"; LABEL="review: approved"; BOT="github-actions[bot]"
for v in GH_TOKEN REPO; do [ -n "${!v:-}" ] || { echo "label-sweep: $v is not set"; exit 2; }; done
command -v jq >/dev/null || { echo "label-sweep: jq is missing"; exit 2; }
H=$(mktemp); trap 'rm -f "$H"' EXIT; chmod 600 "$H"   # the token in a file, not on curl's command line (seen by ps)
printf 'Authorization: Bearer %s\nAccept: application/vnd.github+json\n' "$GH_TOKEN" > "$H"
api() { curl -sS --fail-with-body -H @"$H" "$@"; }
pages() {  # every page of a list endpoint ($1, with or without its own query), as one JSON array
  # Events come oldest first, so a list cut short would drop the newest, which decide. More than PAGES_MAX full pages
  # (3000 events; no real PR has them, but a PR's job can pad its own list) returns 3: the label then comes off.
  local p=1 all='[]' one sep='?'; case "$1" in *\?*) sep='&';; esac
  while :; do
    [ "$p" -le "${PAGES_MAX:-30}" ] || { echo "label-sweep: $1 has more than ${PAGES_MAX:-30} pages" >&2; return 3; }
    one=$(api "$API/$1${sep}per_page=100&page=$p") || return 1
    echo "$one" | jq -e 'type == "array"' >/dev/null || return 1
    all=$(jq -s '.[0] + .[1]' <(echo "$all") <(echo "$one")); [ "$(echo "$one" | jq length)" -lt 100 ] && break; p=$((p + 1))
  done; echo "$all"; }
enc=$(jq -rn --arg l "$LABEL" '$l|@uri')

prs=$(pages "repos/$REPO/issues?state=open&labels=$enc") || { echo "label-sweep: cannot list the PRs labelled '$LABEL'"; exit 2; }
nums=$(echo "$prs" | jq -r '.[] | select(.pull_request != null) | .number')
rc=0; n=0
for pr in $nums; do
  n=$((n + 1))
  ev=$(pages "repos/$REPO/issues/$pr/events"); e=$?
  if [ "$e" = 3 ]; then who="$BOT"; how="an event list over ${PAGES_MAX:-30} pages (padded, as a PR's own job could; #1270 breaker M2)"
  elif [ "$e" != 0 ]; then echo "#$pr: events unreadable, label kept; the next sweep tries again"; rc=2; continue
  else how="put on by $BOT"
  who=$(echo "$ev" | jq -r --arg l "$LABEL" '[.[] | select(.event == "labeled" and .label.name == $l)] | last | .actor.login // empty'); fi
  if [ -z "$who" ]; then echo "#$pr: no labeled event for '$LABEL' found, label kept (an event list GitHub trimmed?)"; rc=2; continue; fi
  if [ "$who" != "$BOT" ]; then echo "#$pr: kept ('$LABEL' put on by $who)"; continue; fi
  api -X DELETE "$API/repos/$REPO/issues/$pr/labels/$enc" >/dev/null || { echo "#$pr: '$LABEL' ($how), but it could not be removed"; rc=2; continue; }
  body="**Label sweep (B134):** \`$LABEL\` removed: $how. \`$BOT\` is a workflow's GITHUB_TOKEN, not a person: a pull request's own workflow can set the label, and such a label starts no label-guard run. Only a person labels a reviewed head (P-277, P-189).

To label again: a person adds \`$LABEL\` once a PR comment line \"Reviewer: Approve\" names the head's SHA (label guard)."
  api -X POST "$API/repos/$REPO/issues/$pr/comments" -d "$(jq -n --arg b "$body" '{body: $b}')" >/dev/null || echo "#$pr: label removed, but the comment failed"
  echo "#$pr: removed '$LABEL' ($how)"
done
echo "label-sweep: $n labelled PR(s) judged"
exit $rc
