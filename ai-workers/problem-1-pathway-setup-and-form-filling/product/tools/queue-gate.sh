#!/usr/bin/env bash
# Queue gate (B194, founder 16 Nov: "concretely fix this problem"; P-502, P-610). Two jobs before a PR joins the queue,
# run by .github/workflows/queue-gate.yml (main's copy; the PR's code is never checked out or run):
#   label  — puts `review: approved` on once (a) a PR comment line "Reviewer: Approve <the head's full 40-hex SHA>" is
#            by the repository owner's account or a login in REVIEWERS (space-separated; the repository variable, so no
#            name sits in a file), author association OWNER, MEMBER or COLLABORATOR, and it is the last "Reviewer:"
#            line naming that head (a later "Changes needed" on it wins); (b) the check "ci" on that head is green; (c) no changed path
#            matches lead-read-paths.txt (.github/, .mergify.yml, the guards, schema, migrations, money,
#            permissions; a screenshot, an image or .txt under product/, or a records-only PR sets off only the guard
#            lines, never money or permissions: B206 part 3).
#            No more waiting for a sleeping lane to wake and label. A refusal is commented only when the Approve comment
#            itself started the run. label-sweep.sh keeps a github-actions[bot] label only when `eligible` passes.
#   fresh  — the commit status "queue-fresh" that Mergify's product queue needs for a PR touching prototype/
#            (.mergify.yml). Measured in design/merge-queue-causes-2026-11-16.md: when main merged a PR touching one of
#            the same app files, or both add migrations, after this PR's green ci started, the PR failed in the queue 35%
#            of the time (60% for two migrations), against 17% otherwise; plain age does not predict it. Such a PR gets
#            "failure" and, when labelled, its ci run is re-run (a re-run tests today's main, D6; never a cancel,
#            P-371); the re-run's green sets "success". A queued PR is left success: its batch is built on today's main.
#            After 3 attempts it is success (the batch checks it). An unlabelled PR is "pending": the verdict is made
#            when the label goes on (label() decides it before labelling; a person's label starts a run), so a label
#            never meets an old success (review M2). Every 30 minutes the labelled PRs are judged again (a refused re-run), or by hand (workflow_dispatch).
#   full run — CI-PRE (P-731), narrowed by P-743 (founder 19 Nov 23:5x IST: no full run on every PR, P-733 (4)): only a
#            PR that a failed merge batch held (held(): the newest ended mergify[bot] batch PR naming it ended failure)
#            needs one green full run on the head before the label; any other PR needs none (every batch runs every
#            suite, P-651). The full run:
#            a run of main's ci.yml by workflow_dispatch (comment-run.yml's "/run full"), named "full-run PR #<n> <head>"
#            by its own inputs, on a commit of main's first-parent chain (so its jobs were main's, not a PR's), ended success. A red
#            or missing one refuses the label and names the failing parts (the run's failed jobs) and the batch run that
#            asked for it. A records-only PR
#            (records-only.sh, main's one definition) is exempt. With FULL_FROM set (the repository variable
#            FULL_RUN_FROM, a UTC time like 2026-11-20T06:00:00Z), a head whose Approve line is older keeps the earlier
#            rule, so the PRs approved before CI-PRE landed are not sent back (B203 deletes the variable after this fix).
#            After a failed merge batch (a mergify[bot] batch PR naming this PR whose ci ended failure; the newest one),
#            the label goes on again only when a PR comment line by someone with write access,
#            "Batch failures covered: <that run's id>: <part>, <part>", names every failed job of that run.
#   proof  — for label-guard.sh: exit 0 when the full-run rule holds for one of HEADS (the head, back to its approved
#            commit) and, with RELABEL=1 (the label was just put on), the batch rule too; exit 1 and the reason if not.
#   eligible — exit 0 when `label` would label this PR now (the label aside); used by label-sweep.sh.
#   event  — reads GITHUB_EVENT_NAME / GITHUB_EVENT_PATH and runs the above for the PR(s) concerned.
# Env: GH_TOKEN, REPO (owner/name), PR (label, fresh, eligible, proof); REVIEWERS; FULL_FROM; HEADS, RELABEL (proof); LABELED_AT (eligible); API (default https://api.github.com);
# MAIN_REF (default origin/main; a git copy holding main's history). Exit 0 judged; 1 refused (eligible); 2 error; 3 (eligible)
# the full runs or the merge batches could not be read inside the full-run rule (label-sweep.sh keeps the label, tries again).
# Test: check-queue-gate.sh.
set -uo pipefail
API="${API:-https://api.github.com}"; MAIN_REF="${MAIN_REF:-origin/main}"; LABEL="review: approved"; CTX="queue-fresh"
HERE=$(cd "$(dirname "$0")" && pwd)
for v in GH_TOKEN REPO; do [ -n "${!v:-}" ] || { echo "queue-gate: $v is not set"; exit 2; }; done
H=$(mktemp); trap 'rm -f "$H" "$H.v" "$H.p" "$H.f" "$H.m" "$H.hard" "$H.soft"' EXIT; chmod 600 "$H"   # the token in a file, not on curl's command line (seen by ps)
printf 'Authorization: Bearer %s\nAccept: application/vnd.github+json\n' "$GH_TOKEN" > "$H"
api() { curl -sS --fail-with-body -H @"$H" "$@"; }
pages() { local p=1 all='[]' one sep='?'; case "$1" in *\?*) sep='&';; esac
  while [ "$p" -le 30 ]; do one=$(api "$API/$1${sep}per_page=100&page=$p") || return 1
    all=$(jq -s '.[0] + .[1]' <(echo "$all") <(echo "$one")); [ "$(echo "$one" | jq length)" -lt 100 ] && break; p=$((p + 1))
  done; echo "$all"; }
OWNER="${REPO%%/*}"
CODE='/prototype/'; DOCS='\.(md|txt|png|jpe?g|gif|webp|svg|pdf)$'; MIG='/prisma/migrations/'

load() {  # PR → pr, head, files, labels
  pr=$(api "$API/repos/$REPO/pulls/$PR") || { echo "#$PR: cannot read the PR"; return 2; }
  head=$(echo "$pr" | jq -r .head.sha); labels=$(echo "$pr" | jq -r '[.labels[].name] | join("\n")')
  # A renamed file counts under both names (Devin on #1861): a later main change to the old path still overlaps.
  files=$(pages "repos/$REPO/pulls/$PR/files" | jq -r '.[] | .filename, (.previous_filename // empty)') || { echo "#$PR: cannot read its files"; return 2; }; }
has() { grep -qxF "$1" <<< "$labels"; }
ci() {  # the check "ci" on $head → ci_state (success|pending|failure), run_id, run_started, run_attempt, run_status
  local c; c=$(api "$API/repos/$REPO/commits/$head/check-runs?check_name=ci&per_page=100") || { ci_state=failure; return; }
  c=$(echo "$c" | jq -c '[.check_runs[] | select(.app.slug == "github-actions")] | sort_by(.started_at) | last // empty')
  [ -n "$c" ] || { ci_state=pending; return; }
  case "$(echo "$c" | jq -r '.status + " " + (.conclusion // "")')" in "completed success") ci_state=success;; completed*) ci_state=failure;; *) ci_state=pending;; esac
  run_id=$(echo "$c" | jq -r '.details_url // ""' | sed -n 's|.*/actions/runs/\([0-9]*\).*|\1|p')
  local r; r=$(api "$API/repos/$REPO/actions/runs/$run_id" 2>/dev/null) || r='{}'
  run_started=$(echo "$r" | jq -r '.run_started_at // empty'); run_attempt=$(echo "$r" | jq -r '.run_attempt // 1'); run_status=$(echo "$r" | jq -r '.status // ""'); }

# --- CI-PRE (P-731): the full run and the failed batch
FULL_WF=".github/workflows/ci.yml"; TEAM='.author_association == "OWNER" or .author_association == "MEMBER" or .author_association == "COLLABORATOR"'
# A job's name may hold a matrix value worked out from a PR's files: letters, digits and a few plain marks only, so no
# markup, mention, link or "#n" reference reaches a comment (sanl: a comment line, which keeps its colons).
tick() { sed 's/.*/`&`/'; }   # a name in a comment sits in a code span: "www.x" never becomes a link
san() { LC_ALL=C tr -cd 'A-Za-z0-9 ().,_\n-'; }; sanl() { LC_ALL=C tr -cd 'A-Za-z0-9 ().,_:\n-'; }
# Records-only: main's one definition on the PR's file names AND the label "records" that records-label.yml sets from a
# full checkout (this job's checkout holds the tools only, where no suite is seen reading a product/ .md; breaker M1).
records() { has records && [ "$(printf '%s\n' "$files" | (cd "$HERE" && bash "${RECORDS_ONLY:-$HERE/records-only.sh}" is-records --files) 2>/dev/null)" = yes ]; }
leadread() {  # stdin: changed paths → those that keep the Lead's read (P-423, lead-read-paths.txt). Lines after its
  # "--- records-exempt" marker (money, permissions) are not set off by a screenshot (*.png under screens/), an image or
  # .txt under product/ (never product/tools/; select-suites.mjs reads none as data), or any file of a records-only PR
  # (records(): main's records-only.sh AND the "records" label set from a full checkout, as this job's checkout holds
  # the tools only and would call a suite-read .md a record; part 3 review M1). B206 part 3. Fails closed.
  local f all="${LEAD_READ_PATHS:-$HERE/lead-read-paths.txt}" rec=0   # LEAD_READ_PATHS: the test's stand-in
  [ -r "$all" ] && grep -q '^# --- records-exempt' "$all" || { echo "lead-read-paths.txt unreadable or without its marker"; return; }
  awk '/^# --- records-exempt/ {exit} !/^#/ && NF' "$all" > "$H.hard"; awk 'f && !/^#/ && NF; /^# --- records-exempt/ {f = 1}' "$all" > "$H.soft"
  records && rec=1
  while IFS= read -r f; do [ -n "$f" ] || continue
    if grep -qiEf "$H.hard" <<< "$f"; then printf '%s\n' "$f"; continue; fi
    grep -qiEf "$H.soft" <<< "$f" || continue
    [ "$rec" = 1 ] && continue
    grep -qiE '(^|/)screens/([^/]+/)*[^/]+\.png$' <<< "$f" && continue
    grep -qiE '/product/tools/' <<< "$f" || ! grep -qE '^ai-workers/problem-1-pathway-setup-and-form-filling/product/([^/]+/)*[^/]+\.(png|jpe?g|gif|webp|svg|txt)$' <<< "$f" || continue
    printf '%s\n' "$f"; done; rm -f "$H.hard" "$H.soft"; }
failing() {  # a run's id [all] → its failed jobs' names, one a line (the summary job "ci" only when nothing else failed); nothing when unreadable. all: in any attempt
  api "$API/repos/$REPO/actions/runs/$1/jobs?filter=${2:-latest}&per_page=100" 2>/dev/null \
    | jq -r '[.jobs[]? | select(.conclusion == "failure" or .conclusion == "timed_out" or .conclusion == "cancelled") | .name | select(. != "retry-comment")] | (map(select(. != "ci")) | if length > 0 then . else empty end) // . | .[]' 2>/dev/null | san | cut -c1-120 | grep .; true; }
comments() { [ -n "${cs:-}" ] || cs=$(pages "repos/$REPO/issues/$PR/comments"); }
full() {  # $@ commits → full_state (success|failure|pending|none), full_why
  local p=1 one c t id st co url sha first=""; : > "$H.f"; full_state=none; full_why="no full run on ${1:0:9} yet: comment \`/run full\` on the PR (every suite a merge batch runs; P-731)"
  while [ "$p" -le 3 ]; do   # the 300 newest runs started by hand or by "/run full"
    one=$(api "$API/repos/$REPO/actions/workflows/ci.yml/runs?event=workflow_dispatch&per_page=100&page=$p") || { full_state=unread; full_why="the full runs cannot be read"; return; }
    # One slim line a run, kept in a file: a page is too large for a command line (breaker R2-M1).
    jq -c --arg r "$REPO" --arg wf "$FULL_WF" '.workflow_runs[] | select(.event == "workflow_dispatch" and ((.path // "") | split("@")[0]) == $wf
      and .head_branch == "main" and .head_repository.full_name == $r) | {id, status, conclusion, html_url, head_sha, title: (.display_title // "")}' <<< "$one" >> "$H.f" || { full_state=unread; full_why="the full runs cannot be read"; return; }
    [ "$(jq '.workflow_runs | length' <<< "$one")" -lt 100 ] && break; p=$((p + 1))
  done
  for c in "$@"; do t="full-run PR #$PR $c"
    while IFS=$'\t' read -r id st co url sha; do
      [[ "$id" =~ ^[0-9]+$ && "$sha" =~ ^[0-9a-f]{40}$ ]] || continue
      # The run's workflow file was main's own: its commit is on main's first-parent chain (the merges main itself holds).
      # An ancestor is not enough: an intermediate commit of any merged PR is one, with its own ci.yml (breaker R3-M2).
      [ -s "$H.m" ] || git rev-list --first-parent "$MAIN_REF" > "$H.m" 2>/dev/null
      grep -qx "$sha" "$H.m" || continue
      if [ "$st $co" = "completed success" ]; then full_state=success; full_why="full run $id green on ${c:0:9}"; return; fi
      [ -n "$first" ] || first="$id"$'\t'"$st"$'\t'"$url"$'\t'"$c"
    done < <(jq -r --arg t "$t" 'select(.title == $t) | [.id, .status, (.conclusion // "none"), .html_url, .head_sha] | @tsv' "$H.f")
  done
  [ -n "$first" ] || return 0
  IFS=$'\t' read -r id st url c <<< "$first"
  if [ "$st" != completed ]; then full_state=pending; full_why="the full run on ${c:0:9} has not ended ($url)"; return; fi
  full_state=failure; full_why="the full run on ${c:0:9} failed: $(failing "$id" | tick | paste -sd ';' - | sed 's/;/; /g; s/^$/its failed parts cannot be read/') ($url). Fix and push, then \`/run full\` on the new head; \`/run full\` on this head re-runs only the failed parts"; }
fullproof() {  # $@ the commits a full run may be on → 0, or 1 with $why
  records && return 0
  if [[ "${FULL_FROM:-}" =~ ^20[0-9][0-9]-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z$ ]]; then   # approved before CI-PRE landed
    local at; comments || { why="its comments cannot be read"; return 1; }
    at=$(jq -r --arg re "$(printf '%s\n' "$@" | paste -sd '|' -)" --argjson who "$(printf '%s\n' "$OWNER" ${REVIEWERS:-} | jq -Rn '[inputs | select(length > 0)]')" '[.[] | select(.user.login as $l | $who | index($l)) | select(.author_association == "OWNER" or .author_association == "MEMBER" or .author_association == "COLLABORATOR")
      | select((.body // "") | gsub("[*_`]"; "") | test("(^|\n)\\s*reviewer:\\s*approve[sd]?\\s+(" + $re + ")\\b"; "i")) | .created_at] | max // empty' <<< "$cs")
    [ -n "$at" ] && [[ "$at" < "$FULL_FROM" ]] && return 0
  fi
  # P-743: the full run is asked only of a PR a failed merge batch held. Unreadable batches: refused, and eligible exits
  # 3 (label-sweep.sh keeps the label and tries again), as for unreadable full runs.
  held || { full_state=unread; return 1; }
  # No failed batch held it: no full run is asked (P-743), but one that exists on the head and ended red still refuses
  # (review M1: a known-red head never joins a batch); none, pending or unreadable passes, as nothing is asked.
  if [ "$held_state" != failed ]; then   # no failed batch held it (P-743)
    full "$@"; [ "$full_state" = failure ] && { why=$full_why; return 1; }; full_state=""; return 0; fi
  full "$@"; [ "$full_state" = success ] && return 0
  why="$full_why (asked because the merge batch run $held_rid failed with this PR in it, P-743)"; return 1; }
held() {  # the newest ended merge batch naming this PR → held_state (none|passed|failed), held_rid (its ci run when failed);
  # read once per PR (covered() and fullproof() share it); 1 with $why when the batches cannot be read
  [ "${held_pr:-}" = "$PR" ] && return 0
  local one p=1 sha c; held_pr=""; held_state=none; held_rid=""; : > "$H.p"
  # Every PR opened after this one, newest first (a batch that held it is one of them); 30 pages at most, else refused.
  while :; do
    [ "$p" -le 30 ] || { why="more than 3000 pull requests were opened after this one: its merge batches cannot all be read (ask the tech lead)"; return 1; }
    one=$(api "$API/repos/$REPO/pulls?state=all&sort=created&direction=desc&per_page=100&page=$p") && jq -e 'type == "array"' <<< "$one" >/dev/null || { why="the merge batches cannot be read"; return 1; }
    # One slim line a PR, kept in a file: a page of pull requests is far too large for a command line (breaker R2-M1).
    jq -c '.[] | {number, title: (.title // ""), body: (.body // ""), login: .user.login, ref: (.head.ref // ""), repo: (.head.repo.full_name // ""), sha: (.head.sha // "")}' <<< "$one" >> "$H.p" || { why="the merge batches cannot be read"; return 1; }
    [ "$(jq --argjson n "$PR" 'length < 100 or any(.[]; .number <= $n)' <<< "$one")" = true ] && break; p=$((p + 1))
  done
  # Mergify's batch PRs naming this PR, newest first: "#n" in the title (merge-queue-causes.py members()) and the body's
  # "pull_requests:" numbers together (flaky.mjs targets(); the title can leave members out, gate-b.mjs). The newest
  # that ended decides: failed, or passed (merged).
  for sha in $(jq -rs --arg r "$REPO" --argjson n "$PR" '[.[] | select(.login == "mergify[bot]" and (.ref | startswith("mergify/merge-queue/")) and .repo == $r)
      | select(([(.title // "") | scan("#([0-9]+)") | .[0] | tonumber] + [(.body // "") | scan("(?m)^\\s*-\\s*number:\\s*([0-9]+)\\s*$") | .[0] | tonumber]) | index($n))
      | .sha | select(test("^[0-9a-f]{40}$"))][0:10][]' "$H.p"); do
    c=$(api "$API/repos/$REPO/commits/$sha/check-runs?check_name=ci&filter=all&per_page=100") || { why="a merge batch's ci cannot be read"; return 1; }
    # Every attempt counts (filter=all): a batch that failed stays failed, whatever a later re-run of its run says, and
    # the time is its first failure's (breaker R3-M1: anyone with write access can re-run a finished run).
    c=$(jq -r '[.check_runs[] | select(.app.slug == "github-actions" and .status == "completed")] as $a | ([$a[] | select(.conclusion == "failure" or .conclusion == "timed_out")] | sort_by(.completed_at // "0") | first) as $f
      | if $f then ["failed", ($f.completed_at // "0"), ($f.details_url // "-")] elif any($a[]; .conclusion == "success") then ["passed", "-", "-"] else ["other", "-", "-"] end | @tsv' <<< "$c")
    # LABELED_AT (the sweep: when the label now on the PR was put on): a batch that failed after it is not a relabel's
    # business (the batch's other PRs keep their label); one that failed before it is.
    if [ -n "${LABELED_AT:-}" ]; then case "$c" in failed*) [[ "$(cut -f2 <<< "$c")" < "$LABELED_AT" ]] || continue;; esac; fi
    case "$c" in passed*) held_state=passed; break;; failed*) held_state=failed; held_rid=$(sed -n 's|.*/actions/runs/\([0-9]*\).*|\1|p' <<< "$c"); break;; esac
  done
  [ "$held_state" != failed ] || [ -n "$held_rid" ] || { why="a failed merge batch's run cannot be read"; return 1; }
  held_pr=$PR; return 0; }
covered() {  # 0 when no failed merge batch held this PR, or a comment line covers the newest one's failed parts; else 1 with $why
  local rid names lines n miss=""
  held || return 1
  [ "$held_state" = failed ] || return 0
  rid=$held_rid
  comments || { why="its comments cannot be read"; return 1; }
  names=$(failing "$rid" all | sort -u); [ -n "$names" ] || { why="it was in the failed merge batch run $rid, whose failed parts cannot be read now"; return 1; }
  lines=$(jq -r ".[] | select($TEAM) | .body // \"\"" <<< "$cs" | tr -d '\r' | sanl | grep -E "^ *Batch failures covered: *$rid *:"; true)
  [ -n "$lines" ] || { why="it was in the failed merge batch run $rid (failed: $(tick <<< "$names" | paste -sd ';' - | sed 's/;/; /g')) and no PR comment line \"Batch failures covered: $rid: <every failed part>\" by someone with write access names them (P-731 (4))"; return 1; }
  # A whole name: "kindly" does not name the part "kind", nor "shard (30)" the part "shard (3)".
  while IFS= read -r n; do [ -z "$n" ] || grep -qE -- "(^|[^A-Za-z0-9_-])$(sed 's/[().]/\\&/g' <<< "$n")([^A-Za-z0-9_-]|\$)" <<< "$lines" || miss="$miss${miss:+; }\`$n\`"; done <<< "$names"
  [ -z "$miss" ] || { why="the line \"Batch failures covered: $rid:\" does not name every failed part of that merge batch run: missing $miss (P-731 (4))"; return 1; }
  return 0; }

why=""
judge() {  # eligibility for the label; reason in $why
  [ "$(echo "$pr" | jq -r .state)" = open ] || { why="the PR is not open"; return 1; }
  [ "$(echo "$pr" | jq -r .draft)" = false ] || { why="the PR is a draft"; return 1; }
  [ "$(echo "$pr" | jq -r .base.ref)" = main ] || { why="its base is not main"; return 1; }
  case "$(echo "$pr" | jq -r .head.ref)" in mergify/*) why="a merge-queue batch"; return 1;; esac
  local who bad; cs=""; comments || { why="its comments cannot be read"; return 1; }
  who=$(printf '%s\n' "$OWNER" ${REVIEWERS:-} | jq -Rn '[inputs | select(length > 0)]')
  echo "$cs" | jq -r --argjson who "$who" '.[] | select((.user.login as $l | $who | index($l)) and (.author_association == "OWNER" or .author_association == "MEMBER" or .author_association == "COLLABORATOR")) | .body' \
    | tr -d '*_`' | grep -iE '^[[:space:]]*reviewer:' > "$H.v"; true
  # The last verdict that can be about this head decides: a line naming the head (or a prefix of it), or naming no SHA
  # at all ("Reviewer: Changes requested: fix M1", round 2 m2). A SHA has a digit and a letter: a run id, a date or a
  # word like "defaced" is not one, so such a line still counts (round 3 m1, fails closed). It must be an Approve
  # naming the full head. (tr, not ${x,,}: the Mac's bash 3.2.)
  local l x last="" keep; while IFS= read -r l; do keep=1
    for x in $(grep -oiE '\b[0-9a-f]{7,40}\b' <<< "$l" | tr A-F a-f | grep '[0-9]' | grep '[a-f]'; true); do keep=0; case "$head" in "$x"*) keep=1; break;; esac; done
    [ "$keep" = 1 ] && last=$l; done < "$H.v"; rm -f "$H.v"
  grep -qiE "^[[:space:]]*reviewer:[[:space:]]*approve[sd]?[[:space:]]+$head\b" <<< "$last" \
    || { why="the last \"Reviewer:\" verdict about $head from the owner's account or a known reviewer is not an Approve naming it"; return 1; }
  bad=$(leadread <<< "$files" | head -3 | sed 's/.*/`&`/' | paste -sd ' ' -)
  [ -z "$bad" ] || { why="it touches a path that keeps the Lead's read (P-423): $bad"; return 1; }
  ci; [ "$ci_state" = success ] || { why="ci on ${head:0:9} is $ci_state"; return 1; }
  fullproof "$head" || return 1   # CI-PRE (P-731, P-743): after a failed merge batch, one green full run on this exact head
  return 0; }

status() {  # state description
  api -X POST "$API/repos/$REPO/statuses/$head" -d "$(jq -n --arg s "$1" --arg d "${2:0:139}" --arg c "$CTX" '{state: $s, description: $d, context: $c}')" >/dev/null \
    && echo "#$PR ${head:0:9}: $CTX $1 ($2)" || { echo "#$PR: could not set $CTX"; return 2; }; }

fresh() {
  load || return 2
  local mine mig m mf hit=""
  mine=$(grep -E "$CODE" <<< "$files" | grep -viE "$DOCS"; true)   # no grep -q in a pipe: pipefail + SIGPIPE (review m1)
  [ -n "$mine" ] || { status success "no app code: nothing to re-check"; return; }
  has queued && { status success "in the queue: its batch is tested on today's main"; return; }
  # Review M2: an unlabelled PR never holds a success, so a label always waits for a verdict made at labelling time.
  has "$LABEL" || [ "${LABELLING:-}" = 1 ] || { status pending "decided when review: approved goes on"; return; }
  ci; [ "$ci_state" = success ] || { status pending "waiting for a green ci on this head"; return; }
  [ -n "${run_started:-}" ] || { status pending "the ci run cannot be read: tried again on the next event"; return; }
  [ "${run_attempt:-1}" -ge 3 ] && { status success "3 ci attempts: the merge-queue batch checks the rest"; return; }
  mig=$(grep -cE "$MIG" <<< "$mine")
  while read -r m ts subj; do
    [ -n "$m" ] || continue; [[ "$ts" > "$run_started" ]] || continue
    mf=$(git diff --no-renames --name-only "$m^1" "$m" 2>/dev/null)
    local both; both=$(comm -12 <(sort -u <<< "$mine") <(sort -u <<< "$mf"); true)   # no grep -q in a pipe (round 2 m1)
    if [ -n "$both" ]; then hit="$subj ($(sed -n '1s|.*/||p' <<< "$both"))"; break; fi
    if [ "$mig" -gt 0 ] && grep -qE "$MIG" <<< "$mf"; then hit="$subj (a migration)"; break; fi
  done < <(TZ=UTC git log --first-parent --date=format-local:%Y-%m-%dT%H:%M:%SZ --format='%H %cd %s' --since="$run_started" "$MAIN_REF" 2>/dev/null | awk '{print $1, $2, $6}')
  [ -n "$hit" ] || { status success "no merge since this ci started touches its files"; return; }
  status failure "main merged $hit after this ci started: re-check on today's main" || return 2
  if { has "$LABEL" || [ "${LABELLING:-}" = 1 ]; } && [ "$run_status" = completed ] && [ -n "$run_id" ]; then
    api -X POST "$API/repos/$REPO/actions/runs/$run_id/rerun" >/dev/null && echo "#$PR: ci run $run_id re-run (attempt $((run_attempt + 1)))" || echo "#$PR: the re-run was refused"
  fi; }

label() {
  load || return 2
  has "$LABEL" && { echo "#$PR: already labelled"; return 0; }
  # CI-PRE: a relabel after a failed merge batch needs its failed parts named (decided here, as the label goes on).
  if ! { judge && covered; }; then
    echo "#$PR: not labelled: $why"
    # A full run that just ended says how it ended, whatever else the label waits for (CI-PRE (c)).
    if [ "${TRIGGER:-}" = full ]; then full "$head"; [ "$full_state" = success ] && why="$full_why; the label waits: $why" || why=$full_why; fi
    [[ "${TRIGGER:-}" =~ ^(approve|full)$ ]] && api -X POST "$API/repos/$REPO/issues/$PR/comments" -d "$(jq -n --arg b "**Queue gate (B194):** \`$LABEL\` not put on by itself: $why. A person labels it after the Lead's read where P-423 asks for one.

---
_Generated by [Claude Code](https://claude.ai/code)_" '{body: $b}')" >/dev/null
    return 0; fi
  LABELLING=1 fresh || return 2; did_fresh=1   # review M2: queue-fresh is decided before the label goes on
  api -X POST "$API/repos/$REPO/issues/$PR/labels" -d "$(jq -n --arg l "$LABEL" '{labels: [$l]}')" >/dev/null || { echo "#$PR: could not label"; return 2; }
  labels="$labels"$'\n'"$LABEL"; echo "#$PR: labelled ($head has the reviewer's Approve, a green ci, and a green full run when a failed merge batch held it (P-743); no Lead-read path)"
  api -X POST "$API/repos/$REPO/issues/$PR/comments" -d "$(jq -n --arg b "**Queue gate (B194):** \`$LABEL\` put on: \"Reviewer: Approve ${head:0:9}\" names the head, ci is green on it, no failed merge batch held it or the full run (P-731, P-743) is green on it (or the PR is records only, or approved before FULL_RUN_FROM), and no path keeps the Lead's read (P-423)." '{body: $b}')" >/dev/null || true; }

both() {  # label, then fresh unless label already decided it; any error → 2 (review m6)
  local rc=0; did_fresh=0; label || rc=$?; [ "$did_fresh" = 1 ] || fresh || rc=$?; return $rc; }
event() {
  local e="${GITHUB_EVENT_PATH:-/dev/null}" n rc=0
  case "${GITHUB_EVENT_NAME:-}" in
    issue_comment) jq -e '.issue.pull_request != null and (.comment.body | test("reviewer:\\s*approve"; "i"))' "$e" >/dev/null || { echo "not an Approve comment on a PR"; return 0; }
      PR=$(jq -r .issue.number "$e"); TRIGGER=approve both || rc=$?;;
    workflow_run)
      if [ "$(jq -r '.workflow_run.event // ""' "$e")" = workflow_dispatch ]; then   # CI-PRE: a full run ended; its PR from its name
        n=$(jq -r '.workflow_run.display_title // ""' "$e" | sed -nE 's/^full-run PR #([1-9][0-9]{0,6}) [0-9a-f]{40}$/\1/p')
        [ -n "$n" ] || { echo "a run by hand that is not a full run"; return 0; }
        PR=$n; TRIGGER=full both || rc=$?; return $rc
      fi
      for n in $(jq -r '.workflow_run.pull_requests[].number' "$e"); do PR=$n; both || rc=$?; done;;   # a fork PR has none: no queue-fresh (fails closed)
    pull_request_target) PR=$(jq -r .pull_request.number "$e"); fresh || rc=$?;;
    push|schedule|workflow_dispatch) local ns; ns=$(pages "repos/$REPO/issues?state=open&labels=review%3A%20approved") || { echo "queue-gate: cannot list the labelled PRs"; return 2; }
      for n in $(echo "$ns" | jq -r '.[] | select(.pull_request) | .number'); do PR=$n; fresh || rc=$?; done;;
    *) echo "queue-gate: event ${GITHUB_EVENT_NAME:-none} is not handled"; return 2;;
  esac; return $rc; }

case "${1:-}" in
  label|fresh) "$1"; exit $?;;
  proof) load || exit 2; [ -n "${HEADS:-}" ] || { echo "queue-gate: HEADS is not set"; exit 2; }
    # shellcheck disable=SC2086
    fullproof $HEADS || { echo "$why"; exit 1; }
    if [ "${RELABEL:-}" = 1 ]; then covered || { echo "$why"; exit 1; }; fi; exit 0;;
  # 3, not 1, when the full runs or (inside the full-run rule, P-743) the merge batches could not be read: label-sweep.sh
  # then keeps the label and tries again. covered()'s own unreadable batches (records, FULL_FROM PRs) stay 1.
  # With LABELED_AT (label-sweep.sh: a label a workflow's token put on, which starts no label-guard run), the batch rule
  # is asked too, for a batch that failed before that label (breaker R2-M2: a side branch's workflow can label any PR).
  eligible) load || exit 2; judge && { [ -z "${LABELED_AT:-}" ] || covered; } && { echo "#$PR: eligible"; exit 0; }; echo "#$PR: not eligible: $why"; [ "${full_state:-}" = unread ] && exit 3; exit 1;;
  event) event; exit $?;;
  *) echo "usage: queue-gate.sh label|fresh|eligible|proof|event"; exit 2;;
esac
