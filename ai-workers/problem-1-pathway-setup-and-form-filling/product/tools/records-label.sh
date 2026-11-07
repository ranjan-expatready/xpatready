#!/usr/bin/env bash
# The "records" label (P-371 (4), B119): puts the label records-only.sh prints on a pull request whose change is records
# only, and takes it off when the change stops being records only. Mergify's records queue selects PRs by it.
# Run by .github/workflows/records-label.yml (pull_request_target: main's copy of that file and of this script; the
# PR's commits are fetched as data and only their file names are read). It moved there from ci.yml's job "kind"
# (P-214 fix, 7 Nov): that job ran the PR's own scripts while holding pull-requests: write and issues: write.
#   REPO=owner/name PR=<n> BASE=<sha> HEAD_SHA=<sha> GH_TOKEN=… bash records-label.sh
# Exit 0: the label is right. Exit 1: GitHub refused a change (the step goes red, so a wrong label is never silent).
# Test: product/tools/check-write-token.sh (a stand-in gh; the real git history).
set -uo pipefail
T="$(cd "$(dirname "$0")" && pwd)"
: "${REPO:?}" "${PR:?}" "${BASE:?}" "${HEAD_SHA:?}"
git cat-file -e "$HEAD_SHA^{commit}" 2>/dev/null || { echo "::error::head $HEAD_SHA is not fetched: label not judged"; exit 1; }
# A base that is not here, or no common history, would read as "no files changed": never judged silently (#1232 breaker, minor 6).
git cat-file -e "$BASE^{commit}" 2>/dev/null && git merge-base "$BASE" "$HEAD_SHA" >/dev/null 2>&1 || { echo "::error::base $BASE is not in this clone's history with $HEAD_SHA: label not judged"; exit 1; }
L=$(bash "$T/records-only.sh" label)
records=$(bash "$T/records-only.sh" is-records "$BASE..$HEAD_SHA") || records=no
[ "$records" = yes ] || records=no
if [ "$records" = yes ]; then
  gh api -X POST "repos/$REPO/issues/$PR/labels" -f "labels[]=$L" >/dev/null || { echo "::error::could not add $L"; exit 1; }
  echo "records: yes, labelled $L"
else
  # 404: the label was not there. Anything else is a failure.
  if out=$(gh api -X DELETE "repos/$REPO/issues/$PR/labels/$L" 2>&1); then echo "records: no, $L label removed"
  elif printf '%s' "$out" | grep -q 'HTTP 404'; then echo "records: no (no $L label)"
  else echo "$out"; echo "::error::could not remove $L"; exit 1; fi
fi
