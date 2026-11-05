#!/usr/bin/env bash
# Records out of the product queue (P-371 (3), founder 6 Nov; P-336 records once a day; P-306 (3) never merged by hand
# while a batch is checking). A records-only pull request needs no suites and never joins a product batch: CI labels it
# "records" (Mergify's queues skip that label), and once it carries "review: approved" and its ci is green, this script
# merges it, but only while no merge-queue batch is being checked against its base, so no batch is restarted.
# Before each merge the same checks a records batch ran (push guard, rules files, decision impact, graph, the gate and
# works-set tools on the real qa files) run on the base as it is now with the PR merged in; the merge is refused if the
# base moved since (the API's sha check refuses a head that moved).
#   records-merge.sh is-records <base>..<head> | --files   "yes" when every changed file is a record: under product/
#        (never product/tools/), a .md, image, .txt or .html, and change-kind.sh does not call it code. Else "no".
#   records-merge.sh merge <pr> [--wait <minutes>]   that PR (ci.yml's records-merge job, on the label or a green run)
#   records-merge.sh sweep                            every open PR labelled "review: approved" and "records" (records-merge.yml)
#   records-merge.sh --self-test                      is-records on made-up file lists
# Needs gh with GH_TOKEN (contents and pull requests: write) and GITHUB_REPOSITORY; run from a checkout of the base.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 2
P=ai-workers/problem-1-pathway-setup-and-form-filling; T="$P/product/tools"; S="$P/prototype/studio"
R="${GITHUB_REPOSITORY:-}"
RECORD_FILE="^$P/product/([^/]+/)*[^/]+\.(md|png|jpe?g|gif|webp|svg|txt|html)$"

is_records() {   # stdin: changed paths
  local f; f=$(grep . || true)
  [ -n "$f" ] || { echo no; return; }
  printf '%s\n' "$f" | grep -vE "$RECORD_FILE" | grep -q . && { echo no; return; }
  printf '%s\n' "$f" | grep -qE "^$P/product/tools/" && { echo no; return; }
  [ "$(printf '%s\n' "$f" | bash "$T/change-kind.sh" --files)" = code ] && { echo no; return; }
  echo yes
}

self_test() {
  local bad=0
  t() { local want="$1" what="$2"; shift 2; local got; got=$(printf '%s\n' "$@" | is_records)
    if [ "$got" = "$want" ]; then echo "PASS  $what"; else echo "FAIL  $what (got $got)"; bad=1; fi; }
  t yes "qa notes with screenshots" "$P/product/qa/BUGS.md" "$P/product/qa/walks/x/shot.png" "$P/product/qa/runs/out.txt"
  t yes "the Lead's records: STATE, DECISIONS, BACKLOG" "$P/product/STATE.md" "$P/product/DECISIONS.md" "$P/product/BACKLOG.md"
  t yes "a screen's notes and its HTML board" "$P/product/screens/12/build-notes.md" "$P/product/screens/12/board.html"
  t no  "a tool under product/tools/ (even a .md or .txt)" "$P/product/tools/typecheck-known.txt"
  t no  "app code" "$P/product/STATE.md" "$S/api/src/core.ts"
  t no  "a skill (instructions, not a product record)" ".claude/skills/next/SKILL.md"
  t no  "a workflow" ".github/workflows/ci.yml"
  t no  "a JSON file under product/ (a tool may read it as data)" "$P/product/screens/12/fixture.json"
  t no  "nothing changed" ""
  [ "$bad" = 0 ] && echo "all passed"; return $bad
}

gh_ok() { [ -n "$R" ] && command -v gh >/dev/null || { echo "records-merge: needs gh and GITHUB_REPOSITORY"; exit 2; }; }
busy() {   # batches being checked against base $1
  gh api "repos/$R/pulls?state=open&base=$1&per_page=100" --jq '[.[] | select(.head.ref | startswith("mergify/merge-queue/"))] | length'
}
packages() { [ -d "$S/node_modules/typescript" ] || (cd "$S" && npm ci --no-fund --no-audit >/dev/null 2>&1) || { echo "npm ci failed"; return 1; }; }

# The checks a records batch runs, on <base> + the PR merged in. $1 base sha. Leaves the tree on the base again.
combined_checks() {
  local base="$1" pr="$2" head="$3" rc=0
  git fetch -q origin "$head" 2>/dev/null || git fetch -q origin "pull/$pr/head" || { echo "  could not fetch #$pr's head"; return 1; }
  git checkout -q --detach "$base" && git -c user.name=ci -c user.email=ci@localhost merge -q --no-ff --no-edit "$head" >/dev/null 2>&1 \
    || { echo "  #$pr does not merge cleanly into $base"; git merge --abort 2>/dev/null; git checkout -q --detach "$base"; return 1; }
  [ "$(git -c core.quotePath=false diff --no-renames --name-only "$base" HEAD | is_records)" = yes ] || { echo "  #$pr's change on $base is not records-only"; rc=1; }
  [ $rc = 0 ] && { bash "$T/push-guard.sh" "$base..HEAD" >/dev/null 2>&1 || { echo "  push guard refused"; rc=1; }; }
  for c in "bash $T/check-docs.sh" "bash $T/decision-impact.sh" "node $T/graph.mjs --check" "node $S/tools/check-gate-b.mjs" "node $S/tools/check-works-set.mjs"; do
    [ $rc = 0 ] || break
    log="${RUNNER_TEMP:-/tmp}/records-merge-check.log"
    $c >"$log" 2>&1 || { echo "  $c failed:"; grep -E '^(FAIL|TOO|BROKEN|MISSING)' "$log" | head -10 | sed 's/^/    /'; tail -5 "$log" | sed 's/^/    /'; rc=1; }
  done
  git checkout -q --detach "$base"; return $rc
}

merge_one() {   # $1 pr, $2 wait minutes. 0 merged; 3 not eligible now (left as is); 4 deferred (a batch is checking or the
                # base moved: the sweep tries again); 1 refused (the combined checks failed, or the merge API said no)
  local pr="$1" wait="${2:-0}" j base_ref head draft labels state ci base
  j=$(gh api "repos/$R/pulls/$pr") || return 1
  state=$(jq -r .state <<<"$j"); draft=$(jq -r .draft <<<"$j"); base_ref=$(jq -r .base.ref <<<"$j"); head=$(jq -r .head.sha <<<"$j")
  labels=$(jq -r '[.labels[].name] | join(",")' <<<"$j")
  [ "$state" = open ] && [ "$draft" = false ] || { echo "#$pr: not an open, ready PR"; return 3; }
  [ "$(jq -r .head.repo.full_name <<<"$j")" = "$R" ] || { echo "#$pr: from a fork, never merged here"; return 3; }
  [[ ",$labels," == *",review: approved,"* && ",$labels," == *",records,"* ]] || { echo "#$pr: needs the labels \"review: approved\" and \"records\" (has: $labels)"; return 3; }
  ci=$(gh api "repos/$R/commits/$head/check-runs?check_name=ci&per_page=100" --jq '[.check_runs[] | select(.conclusion != "skipped")] | sort_by(.started_at) | last | (.status + "/" + (.conclusion // ""))')
  [ "$ci" = completed/success ] || { echo "#$pr: ci on ${head:0:12} is $ci, not green"; return 3; }
  # Both sides of a rename (review, 6 Nov: a rename out of tools/ or app code must never pass as a record).
  [ "$(gh api "repos/$R/pulls/$pr/files?per_page=100" --paginate --jq '.[] | .filename, (.previous_filename // empty)' | is_records)" = yes ] || { echo "#$pr: not records-only"; return 3; }
  local until=$((SECONDS + 60 * wait)) n
  while n=$(busy "$base_ref") && [ "$n" != 0 ]; do
    [ $SECONDS -lt $until ] || { echo "#$pr: $n merge-queue batch(es) checking against $base_ref; left for the sweep (records-merge.yml)"; return 4; }
    sleep 30
  done
  git fetch -q origin "$base_ref" && base=$(git rev-parse FETCH_HEAD) || return 1
  packages || return 1
  combined_checks "$base" "$pr" "$head" || { echo "#$pr: checks on $base_ref ${base:0:12} with the PR merged in failed: not merged"; return 1; }
  [ "$(gh api "repos/$R/git/ref/heads/$base_ref" --jq .object.sha)" = "$base" ] || { echo "#$pr: $base_ref moved during the check; left for the next try"; return 4; }
  [ "$(busy "$base_ref")" = 0 ] || { echo "#$pr: a batch started during the check; left for the sweep"; return 4; }
  # Re-read the PR just before merging: still open and ready, the same head, both labels still on.
  j=$(gh api "repos/$R/pulls/$pr") || return 1
  [ "$(jq -r '[.state, (.draft|tostring), .head.sha] | join(" ")' <<<"$j")" = "open false $head" ] || { echo "#$pr: changed during the check (state, draft or head); left as is"; return 3; }
  labels=$(jq -r '[.labels[].name] | join(",")' <<<"$j")
  [[ ",$labels," == *",review: approved,"* && ",$labels," == *",records,"* ]] || { echo "#$pr: a label was removed during the check; left as is"; return 3; }
  gh api -X PUT "repos/$R/pulls/$pr/merge" -f merge_method=merge -f sha="$head" \
    -f commit_title="Merge pull request #$pr (records, outside the product queue, P-371)" >/dev/null \
    || { echo "#$pr: the merge API refused (head moved or not mergeable)"; return 1; }
  echo "#$pr: merged into $base_ref (was ${base:0:12}), no batch checking"
}

case "${1:-}" in
  is-records) if [ "${2:-}" = --files ]; then is_records; else git -c core.quotePath=false diff --no-renames --name-only "${2%%..*}...${2##*..}" | is_records; fi;;
  --self-test) self_test;;
  merge) gh_ok; [[ "${2:-}" =~ ^[0-9]+$ ]] || { echo "merge <pr> [--wait <minutes>]"; exit 2; }
    w=0; [ "${3:-}" = --wait ] && w="${4:-0}"; merge_one "$2" "$w"; rc=$?; [ $rc -ge 3 ] && exit 0; exit $rc;;
  sweep) gh_ok; fail=0
    for pr in $(gh api "repos/$R/pulls?state=open&base=main&sort=created&direction=asc&per_page=100" --jq '.[] | select(.draft | not) | select([.labels[].name] | (index("review: approved") and index("records"))) | .number'); do
      merge_one "$pr" 0; rc=$?; [ $rc = 4 ] && break; [ $rc = 1 ] && fail=1
    done; exit $fail;;
  *) echo "usage: records-merge.sh is-records <base>..<head>|--files | merge <pr> [--wait <min>] | sweep | --self-test"; exit 2;;
esac
