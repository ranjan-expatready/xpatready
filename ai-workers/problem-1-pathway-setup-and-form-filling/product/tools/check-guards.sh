#!/usr/bin/env bash
# The eight guards of 6 Nov, B134's label sweep (7 Nov), B170a's engine test PDFs (L1, 11 Nov), D3's comment trigger (P-506, 12 Nov), rule triage (guard 14) and B194's queue gate (guard 15, 16 Nov), B206's runs waiting (guard 30, 20 Nov), ENF-763's founder-click guard (guard 31, 20 Nov, P-763), E14's index integrity (guard 33, 21 Nov, P-772), B193 part 2's Lead hooks (18-23, 16 Nov), CK-1's conformance check (guard 24) and CK-2's heartbeat (guard 25, 17 Nov), ENF-733's focus list (guard 26) and workflow lock (guard 27, 19 Nov, P-734), B204's waves (guard 28, 20 Nov, P-745) (founder, ~03:00 IST: "fix it so that it becomes a hard rule and it never messes up"), each
# with its test. --mutate also proves each test fails without its guard: in a throwaway copy of the tools, the guard is
# switched off by one edit and its test must go red. Run by .github/workflows/guards.yml. US$0, no network.
#   bash product/tools/check-guards.sh [--mutate]
set -u
TOOLS="$(cd "$(dirname "$0")" && pwd)"; ROOTD="$(cd "$TOOLS/../../../.." && pwd)"; P=ai-workers/problem-1-pathway-setup-and-form-filling
TESTS="check-current-lead.sh check-items.sh check-handover.sh check-label-guard.sh check-lane-preflight.sh check-isolated-ttl.sh check-gh-fallback.sh check-state-page.sh check-lead-cron.sh check-lead-heartbeat.sh check-label-sweep.sh check-rules-lag.sh check-push-guard-fixtures.sh check-comment-run.sh check-outside-deps-watch.sh check-rule-triage.sh check-queue-gate.sh check-lead-watch-board.sh check-known-failures.sh check-queued-push-guard.sh check-lead-read-guard.sh check-gmail-start-check.sh check-lead-act-check.sh check-wip-guard.sh check-ist-time-guard.sh check-conformance-check.sh check-pipeline-heartbeat.sh check-mergify-scopes.sh check-focus-list.sh check-workflow-lock.sh check-waves.sh check-runs-waiting.sh check-founder-click-guard.sh check-proof-read-watch.sh check-idx-integrity.sh"
bad=0
for t in $TESTS check-deps-line.sh; do bash "$TOOLS/$t" > "${TMPDIR:-/tmp}/guard-$$.log" 2>&1; r=$?; echo "$( [ $r = 0 ] && echo PASS || echo FAIL )  $t ($(tail -1 "${TMPDIR:-/tmp}/guard-$$.log"))"
  [ $r = 0 ] || { bad=1; grep '^FAIL' "${TMPDIR:-/tmp}/guard-$$.log" | sed 's/^/      /'; }; done
rm -f "${TMPDIR:-/tmp}/guard-$$.log"
[ "${1:-}" = --mutate ] || exit $bad
# guard | file the edit goes in | sed edit that switches the guard off (no | or ' in it: .. stands for || and . for ') | the test that must then fail
MUT='1|product/tools/check-docs.sh|/CURRENT LEAD: STATE.md has/d|check-current-lead.sh
2|product/tools/label-guard.sh|s/^# No review for the head.*/exit 0/|check-label-guard.sh
2 walk|product/tools/label-guard.sh|s/^  c=\$next; merges=.*/  exit 0/|check-label-guard.sh
2 who|product/tools/label-guard.sh|s/^team=.*/team=true/|check-label-guard.sh
2 labeled|../../.github/workflows/label-guard.yml|s/types: \[synchronize, labeled, opened\]/types: [synchronize, opened]/|check-label-guard.sh
2 after|../../.github/workflows/label-guard.yml|s/^\( *AFTER: \).*/\1${{ github.event.after }}/|check-label-guard.sh
2 full|product/tools/label-guard.sh|s/^    \[ "\$p" = 1 \] \&\& break/    true/|check-label-guard.sh
2 records|product/tools/label-guard.sh|s/^records_pr() {  #/records_pr() { return 0; }\n_off() {  #/|check-label-guard.sh
2 relabel|../../.github/workflows/label-guard.yml|/^ *LABELED: /d|check-label-guard.sh
2 reviewers|../../.github/workflows/label-guard.yml|/^          REVIEWERS: /{x;s/^/x/;/^x$/{x;d;};x;}|check-label-guard.sh
3|product/tools/lane-preflight.sh|/under ${min} GB;/d|check-lane-preflight.sh
3 touch|product/tools/lane-preflight.sh|s/ python3 -I "\$DIR\/touch-overlap.py" 2>\&1)/ cat >\/dev\/null)/|check-touch-overlap.sh
3 hit|product/tools/touch-overlap.py|s/^            if paths:/            if False:/|check-touch-overlap.sh
3 closed|product/tools/touch-overlap.py|s/^        return 2$/        return 0/|check-touch-overlap.sh
3 own|product/tools/touch-overlap.py|s/^        if n in own:/        if False:/|check-touch-overlap.sh
3 dot|product/tools/touch-overlap.py|s/re.sub(r"^(\\.\/)+", "", /(/|check-touch-overlap.sh
3 run|product/tools/check-lane-preflight.sh|/check-touch-overlap.sh" 2>\&1)/d|check-touch-overlap.sh
4 ttl|prototype/studio/tools/isolated.sh|s/\$(( TTL \* \${ISOLATED_TTL_UNIT:-60} ))/999999/|check-isolated-ttl.sh
4 cap|prototype/studio/tools/isolated.sh|s/COPY_CAP:-4} ))/COPY_CAP:-99} ))/|check-isolated-ttl.sh
5|product/tools/factory-board.sh|s/; gh() { bash "\$TOOLS\/gh.sh" "\$@"; }//|check-gh-fallback.sh
6|product/tools/check-docs.sh|/STATE TOO BIG/d|check-state-page.sh
7|product/tools/check-docs.sh|s/if m > 30:/if False:/|check-state-page.sh
7 mine|product/tools/check-docs.sh|s/^  mine=1; c=""$/  mine=0; c=""/|check-state-page.sh
7 read|product/tools/check-docs.sh|s/^  if \[ -z "\$u" \]; then msg=/  if false; then msg=/|check-state-page.sh
7 tens|product/tools/check-docs.sh|s/\[0-9\]{2}:\[0-5\]\[0-9x\]) IST/[0-9]{2}:[0-5][0-9]) IST/|check-state-page.sh
7 base|product/tools/check-docs.sh|s/{ mine=0; c=/{ mine=1; c=/|check-state-page.sh
7 merges|product/tools/check-docs.sh|s/ git log -1 --no-merges --format=%ct "\$b..HEAD"/ git log -1 --format=%ct "$b..HEAD"/|check-state-page.sh
8|product/tools/lead-check-guard.sh|s/^\[ -z "\$why" \] \&\& exit 0/exit 0/|check-lead-cron.sh
9|product/tools/label-sweep.sh|s/^  if \[ "\$who" != "\$BOT" \]; then/  if true; then/|check-label-sweep.sh
9 sched|../../.github/workflows/label-guard.yml|/cron: "\*\/10 \* \* \* \*"/d|check-label-sweep.sh
9 queued|../../.github/workflows/label-guard.yml|/event_name == .schedule./s/ .. (github.event.action == .labeled. \&\& github.event.label.name == .queued.)//|check-label-sweep.sh
9 guardq|../../.github/workflows/label-guard.yml|/review: approved.) .. (github.event.action/s/ .. github.event.label.name == .queued.)"/)"/|check-label-guard.sh
9 batch|../../.github/workflows/label-guard.yml|s/types: \[synchronize, labeled, opened\]/types: [synchronize, labeled]/|check-label-sweep.sh
9 ci|../../.github/workflows/label-guard.yml|/    workflows: \[ci\]/d|check-label-sweep.sh
9 reviewers|../../.github/workflows/label-guard.yml|/          REVIEWERS: \${{ vars.REVIEWERS }}/d|check-label-sweep.sh
9 dispatch|../../.github/workflows/label-guard.yml|s/ github.event_name == .workflow_dispatch. ..//|check-label-sweep.sh
10|product/tools/check-docs.sh|s/-gt 3 \]/-gt 999 ]/|check-rules-lag.sh
11|product/tools/push-guard.sh|s/^\( *\)\[ "\$h" = "\$want" \] \(..\)/\1true \2/|check-push-guard-fixtures.sh
11 records|product/tools/check-stale-paths.sh|/prototype\/\*-manifest\*.sha256/d|check-cleanup-checks.sh
12 who|../../.github/workflows/comment-run.yml|s/OWNER.MEMBER.COLLABORATOR) ;;/*) ;;/|check-comment-run.sh
12 if|../../.github/workflows/comment-run.yml|s/ \&\& contains(fromJSON([^)]*), github.event.comment.author_association)//|check-comment-run.sh
12 pr|../../.github/workflows/comment-run.yml|s/IS_PR" != yes/IS_PR" = never/|check-comment-run.sh
12 env|../../.github/workflows/comment-run.yml|s/line=\${BODY%%/BODY="${{ github.event.comment.body }}"; line=${BODY%%/|check-comment-run.sh
12 perm|../../.github/workflows/comment-run.yml|s/^  pull-requests: write/  pull-requests: write\n  contents: write/|check-comment-run.sh
12 caps|../../.github/workflows/comment-run.yml|s/( C\[1-9\]\[0-9\]?\\.\[1-9\]\[0-9\]?){1,8})/( C[0-9]{1,3}\\.[0-9]{1,3}){1,8})/|check-comment-run.sh
12 fork|../../.github/workflows/comment-run.yml|s/select(.head_repository.full_name == env.HREPO and .head_branch == env.HREF)/select(true)/|check-comment-run.sh
12 queue|../../.github/workflows/comment-run.yml|s/^jobs:/concurrency: { group: x, cancel-in-progress: false }\njobs:/|check-comment-run.sh
12 link|../../.github/workflows/comment-run.yml|s/select(.display_title == "nightly · " + env.TAG)/select(true)/|check-comment-run.sh
12 data|../../.github/workflows/comment-run.yml|s/( (six.checkpoint))?\$/( ([a-z]+))?$/|check-comment-run.sh
12 recheck|../../.github/workflows/comment-run.yml|s/^\( *\)\[\[ "\$CAPS" =~ .*$/\1true/|check-comment-run.sh
12 failed|../../.github/workflows/comment-run.yml|s/failure.timed_out.cancelled) ;;/*) ;;/|check-comment-run.sh
12 full who|../../.github/workflows/comment-run.yml|s/"\$line" = "\/run full"/"$line" == "\/run full"*/|check-comment-run.sh
12 full fork|../../.github/workflows/comment-run.yml|s/if \[ "\$hrepo" != "\$REPO" \]; then/if false; then/|check-comment-run.sh
12 full ref|../../.github/workflows/comment-run.yml|s/ci.yml\/dispatches" -f ref=main -f "inputs\[pr\]/ci.yml\/dispatches" -f ref="$head" -f "inputs[pr]/|check-comment-run.sh
12 full once|../../.github/workflows/comment-run.yml|s/if \[ "\$status" != completed \]; then reply "a full run/if false; then reply "a full run/|check-comment-run.sh
12 full reviewed|../../.github/workflows/comment-run.yml|s/if ! grep -qx .\[1-9\]\[0-9\]\*. <<< "\$ok"; then/if false; then/|check-comment-run.sh
12 full reviewer|../../.github/workflows/comment-run.yml|s/select(.user.login as \$l . (env.WHO . split(" ")) . index(\$l)) . select(.author_association/select(.author_association/|check-comment-run.sh
12 full names|../../.github/workflows/comment-run.yml|s/ . tr -cd .A-Za-z0-9 ().,_\\n-. . cut -c1-120/ /|check-comment-run.sh
13 start|product/tools/outside-deps-watch.py|s/min(sd).date() <= now.date()/False/|check-outside-deps-watch.sh
13 stuck|product/tools/outside-deps-watch.py|s/> timedelta(hours=48)/> timedelta(hours=9999)/|check-outside-deps-watch.sh
13 fallback|product/tools/outside-deps-watch.py|s/if not fb.strip() or/if False and/|check-outside-deps-watch.sh
13 decision|product/tools/outside-deps-watch.py|s/if not done and dd and/if False and/|check-outside-deps-watch.sh
14|product/tools/check-docs.sh|s/for M in "\$PH"\/rules\/rule-id-map-\*\.tsv; do/for M in; do/|check-rule-triage.sh
14 crash|product/tools/check-docs.sh|s/ .. echo "RULE MAP: the check of.*$//|check-rule-triage.sh
15 approve|product/tools/queue-gate.sh|s/+\$head\\b"/+"/|check-queue-gate.sh
15 sha|product/tools/queue-gate.sh|s/ . grep .\[0-9\]. . grep .\[a-f\]./ /|check-queue-gate.sh
15 who|product/tools/queue-gate.sh|s/select((.user.login as \$l . \$who . index(\$l)) and/select(true and/|check-queue-gate.sh
15 paths|product/tools/queue-gate.sh|s/^  \[ -z "\$bad" \]/  true/|check-queue-gate.sh
15 ci|product/tools/queue-gate.sh|s/^  ci; \[ "\$ci_state" = success \]/  ci; true/|check-queue-gate.sh
15 fresh|product/tools/queue-gate.sh|s/^  \[ -n "\$hit" \]/  false/|check-queue-gate.sh
15 queued|product/tools/queue-gate.sh|s/^  has queued .. /  false \&\& /|check-queue-gate.sh
15 sweep|product/tools/label-sweep.sh|s/^    if \[ "\$g" = 0 \]; then echo/    if false; then echo/|check-label-sweep.sh
15 queue|../../.mergify.yml|/check-success = queue-fresh/d|check-queue-gate.sh
15 pending|product/tools/queue-gate.sh|s/^  has "\$LABEL" .. \[ "\${LABELLING:-}" = 1 \]/  true/|check-queue-gate.sh
15 order|product/tools/queue-gate.sh|s/^  LABELLING=1 fresh .. return 2; did_fresh=1/  did_fresh=0/|check-queue-gate.sh
15 time|product/tools/queue-gate.sh|s/\[\[ "\$ts" > "\$run_started" \]\] .. continue/continue/|check-queue-gate.sh
15 shared|product/tools/queue-gate.sh|s/^    if \[ -n "\$both" \]; then/    if false; then/|check-queue-gate.sh
15 verdict|product/tools/queue-gate.sh|s/^    \[ "\$keep" = 1 \] .. last=\$l; done/    last=$l; done/|check-queue-gate.sh
15 comment|../../.github/workflows/queue-gate.yml|/comment.author_association/d|check-queue-gate.sh
15 dispatch|product/tools/queue-gate.sh|s/schedule.workflow_dispatch)/schedule)/|check-queue-gate.sh
15 gatewd|../../.github/workflows/queue-gate.yml|s/ .. github.event_name == .workflow_dispatch.$//|check-queue-gate.sh
15 full head|product/tools/queue-gate.sh|s/select(.title == \$t)/select(true)/|check-queue-gate.sh
15 full green|product/tools/queue-gate.sh|s/if \[ "\$st \$co" = "completed success" \]; then/if true; then/|check-queue-gate.sh
15 full main|product/tools/queue-gate.sh|s/^      grep -qx "\$sha" "\$H.m" .. continue/      true/|check-queue-gate.sh
15 full chain|product/tools/queue-gate.sh|s/git rev-list --first-parent "\$MAIN_REF" > /git rev-list "$MAIN_REF" > /|check-queue-gate.sh
15 full event|product/tools/queue-gate.sh|s/select(.event == "workflow_dispatch" and /select(/|check-queue-gate.sh
15 full branch|product/tools/queue-gate.sh|s/and .head_branch == "main" and/and/|check-queue-gate.sh
15 full file|product/tools/queue-gate.sh|s/ and ((.path \/\/ "") . split("@")\[0\]) == \$wf//|check-queue-gate.sh
15 full repo|product/tools/queue-gate.sh|s/and .head_repository.full_name == \$r)\( . {id, status\)/and true)\1/|check-queue-gate.sh
15 full records|product/tools/queue-gate.sh|s/^  records \&\& return 0/  true \&\& return 0/|check-queue-gate.sh
15 full reclabel|product/tools/queue-gate.sh|s/^records() { has records \&\& /records() { /|check-queue-gate.sh
15 full recfiles|product/tools/queue-gate.sh|s/^records() { has records \&\& .*/records() { has records; }/|check-queue-gate.sh
15 full unread|product/tools/queue-gate.sh|s/ \[ "\${full_state:-}" = unread \] \&\& exit 3; exit 1;;/ exit 1;;/|check-queue-gate.sh
15 full sweep3|product/tools/label-sweep.sh|s/^    if \[ "\$g" = 3 \]; then/    if false; then/|check-label-sweep.sh
15 full nottested|../../.github/workflows/ci.yml|s/, FULL_PR: "\${{ inputs.pr }}", GATE_B_NOT_TESTED: "[^"]*" }/, FULL_PR: "${{ inputs.pr }}" }/|check-queue-gate.sh
15 batch only|product/tools/queue-gate.sh|s/(map(select(. != "ci")) . if length > 0 then . else empty end) \/\/ ./map(select(. != "ci"))/|check-queue-gate.sh
15 batch unread|product/tools/queue-gate.sh|s/names=\$(failing "\$rid" all . sort -u); \[ -n "\$names" \] .. {[^}]*}/names=$(failing "$rid" all)/|check-queue-gate.sh
15 batch body|product/tools/queue-gate.sh|s/ + \[(.body \/\/ "") . scan(.*tonumber\]\() . index(\$n))\)/\1/|check-queue-gate.sh
15 batch pages|product/tools/queue-gate.sh|s/length < 100 or any(.\[\]; .number <= \$n)/true/|check-queue-gate.sh
15 full names|product/tools/queue-gate.sh|s/ 2>\/dev\/null . san . cut -c1-120 . grep \.; true; }/ 2>\/dev\/null; true; }/|check-queue-gate.sh
15 batch|product/tools/queue-gate.sh|s/^  if ! { judge \&\& covered; }; then/  if ! judge; then/|check-queue-gate.sh
15 batch part|product/tools/queue-gate.sh|s/ <<< "\$lines" .. miss=/ <<< "$lines" .. true .. miss=/|check-queue-gate.sh
15 batch word|product/tools/queue-gate.sh|s/grep -qE -- "(^.\[^A-Za-z0-9_-\])\$(sed .s\/\[().\]\/\\\\&\/g. <<< "\$n")(\[^A-Za-z0-9_-\].\\\$)"/grep -qF -- "$n"/|check-queue-gate.sh
15 batch who|product/tools/queue-gate.sh|s/^FULL_WF=\(.*\); TEAM=.*/FULL_WF=\1; TEAM=true/|check-queue-gate.sh
15 batch run|product/tools/queue-gate.sh|s/Batch failures covered: \*\$rid \*:"/Batch failures covered: *[0-9]* *:"/|check-queue-gate.sh
15 batch bot|product/tools/queue-gate.sh|s/select(.login == "mergify\[bot\]" and /select(/|check-queue-gate.sh
15 batch sweep|product/tools/queue-gate.sh|s/judge \&\& { \[ -z "\${LABELED_AT:-}" \] .. covered; } \&\&/judge \&\&/|check-queue-gate.sh
15 batch since|product/tools/queue-gate.sh|s/\[\[ "\$(cut -f2 <<< "\$c")" < "\$LABELED_AT" \]\] .. continue;;/true;;/|check-queue-gate.sh
15 batch rerun|product/tools/queue-gate.sh|s/sort_by(.completed_at \/\/ "0") . first) as \$f/sort_by(.completed_at \/\/ "0") . last) as $f/|check-queue-gate.sh
15 p743 held|product/tools/queue-gate.sh|s/^  if \[ "\$held_state" != failed \]; then   # no failed batch/  if false; then   #/|check-queue-gate.sh
15 p743 red|product/tools/queue-gate.sh|s/^    full "\$@"; \[ "\$full_state" = failure \] .. { why=\$full_why; return 1; }; /    /|check-queue-gate.sh
15 p743 cache|product/tools/queue-gate.sh|s/^  \[ "\${held_pr:-}" = "\$PR" \] .. return 0/  [ -n "${held_pr:-}" ] \&\& return 0/|check-queue-gate.sh
15 p743 norid|product/tools/queue-gate.sh|s/^  \[ "\$held_state" != failed \] .. \[ -n "\$held_rid" \] .. { why=[^}]*}/  true/|check-queue-gate.sh
15 p743 unread|product/tools/queue-gate.sh|s/^  held .. { full_state=unread; return 1; }/  if ! held; then return 1; fi/|check-queue-gate.sh
15 batch at|product/tools/label-sweep.sh|s/PR=\$pr LABELED_AT="\${at:-}" bash/PR=$pr bash/|check-label-sweep.sh
15 full reviewed|../../.github/workflows/ci.yml|s/^            grep -qx .\[1-9\]\[0-9\]\*. <<< "\$ok" .. {.*/            true/|check-queue-gate.sh
15 full wake|../../.github/workflows/queue-gate.yml|s/startsWith(github.event.workflow_run.display_title, .full-run PR #.)/true/|check-queue-gate.sh
15 full depth|../../.github/workflows/label-guard.yml|/^          fetch-depth: 0$/d|check-queue-gate.sh
15 full name|../../.github/workflows/ci.yml|s/format(.full-run PR #{0} {1}., inputs.pr, inputs.head)/inputs.head/|check-queue-gate.sh
15 start rid|product/tools/queue-gate.sh|s/ \&\& held \&\& \[ "\$held_state" = failed \]; then start/ \&\& held; then start/|check-queue-gate.sh
15 deq unlabel|product/tools/queue-gate.sh|s/^          api -X DELETE "\$API\/repos\/\$REPO\/issues\/\$PR\/labels\/review%3A%20approved"/          true/|check-queue-gate.sh
15 proof deq|product/tools/queue-gate.sh|s/ \] .. has dequeued; then/ ]; then/|check-queue-gate.sh
15 start red|product/tools/queue-gate.sh|s/\[ "\$ci_state" = failure \] \&\& { echo "#\$PR: ci is red/false \&\& { echo "#$PR: ci is red/|check-queue-gate.sh
15 start|product/tools/queue-gate.sh|s/^  api -X POST "\$API\/repos\/\$REPO\/actions\/workflows\/ci.yml\/dispatches"/  true/|check-queue-gate.sh
15 start who|product/tools/queue-gate.sh|s/^  approved \(..\) { echo "#\$PR: no full run: \$why";/  true \1 { echo "x";/|check-queue-gate.sh
15 start wake|../../.github/workflows/queue-gate.yml|s/ .. (github.event.action == .labeled. \&\& github.event.label.name == .dequeued.)//|check-queue-gate.sh
16 source|product/tools/cockpit-data.py|s/                elif st != "open":/                elif False:/|check-lead-watch-board.sh
16 count|product/tools/lead-watch.sh|s/; echo "\$bw"; act=\$((act + \$(grep -c .^ACT. <<<"\$bw")))/; echo "$bw"/|check-lead-watch-board.sh
17 wall|product/tools/known-failures.py|s/(1 if b > int(row\["threshold"\]) else 0)/0/|check-known-failures.sh
17 count|product/tools/lead-watch.sh|s/; echo "\$kf"; act=\$((act + \$(grep -c .^ACT. <<<"\$kf")))/; echo "$kf"/|check-known-failures.sh
18|product/tools/queued-push-guard.sh|s/.name == "queued"/.name == "never"/|check-queued-push-guard.sh
18 bulk|product/tools/queued-push-guard.sh|s/--all.--branches.--mirror) bulk=all;;//|check-queued-push-guard.sh
19|product/tools/lead-read-guard.sh|s/^  \[ -z "\$files" \] \&\& return 0/  return 0/|check-lead-read-guard.sh
19 head|product/tools/lead-read-guard.sh|s/case "\$head" in "\$s"\*)/case "\$head" in *)/|check-lead-read-guard.sh
19 own|product/tools/lead-read-guard.sh|s/\$l != "" and (\$l == \$own or \$l == \$me)/true/|check-lead-read-guard.sh
19 curl|product/tools/lead-read-guard.sh|s/(gh\[\[:space:\]\]+api.curl)/(gh[[:space:]]+api)/|check-lead-read-guard.sh
19 identity|product/tools/lead-read-guard.sh|s/.platform\/identity\///|check-lead-read-guard.sh
19 ghrepo|product/tools/lead-read-guard.sh|s/\${r:-\${g:-\${cmdrepo:-\${GH_REPO:-\$here}}}}/${r:-$here}/|check-lead-read-guard.sh
20|product/tools/gmail-start-check.sh|s/^\[ "\$state" = ok \] \&\& exit 0/exit 0/|check-gmail-start-check.sh
21 check|product/tools/lead-act-check.sh|s/-gt "\$CHECK_MIN" \]/-gt 99999 ]/|check-lead-act-check.sh
21 board|product/tools/lead-act-check.sh|s/-gt "\$BOARD_MIN" \]/-gt 99999 ]/|check-lead-act-check.sh
22|product/tools/wip-guard.py|s/^MAX_WAITING, MAX_HOURS = 2, 24/MAX_WAITING, MAX_HOURS = 99, 9999/|check-wip-guard.sh
22 bug|product/tools/wip-guard.py|s/ & open_bugs(root):/ or True:/|check-wip-guard.sh
23|product/tools/ist-time-guard.py|s/                if not ok:/                if False:/|check-ist-time-guard.sh
24 deny|product/tools/conformance-check.py|s/    miss = \[x for x in want if x not in have\]/    miss = []/|check-conformance-check.sh
24 hooks|product/tools/conformance-check.py|s/"fail" if off else "pass"/"pass"/|check-conformance-check.sh
24 queue|product/tools/conformance-check.py|s/"pass" if mpc == cfg\["max_parallel_checks"\] else "fail"/"pass"/|check-conformance-check.sh
24 side|product/tools/conformance-check.py|s/"fail" if side else "pass"/"pass"/|check-conformance-check.sh
24 version|product/tools/conformance-check.py|s/ok = have is not None and have == str(want).lstrip("v")/ok = True/|check-conformance-check.sh
24 trig|product/tools/conformance-check.py|s/elif sorted(have or \[\]) != sorted(types):/elif False:/|check-conformance-check.sh
24 beat|product/tools/conformance-check.py|s/    if per_hour \* hb\["every_min"\] < 60:/    if False:/|check-conformance-check.sh
24 gate|product/tools/conformance-check.py|s/             if n == cfg\["gate_job"\] and k != cfg\["gate_job"\]\]/             if False]/|check-conformance-check.sh
25 merge|product/tools/pipeline-heartbeat.py|s/             > hb\["no_merge_min"\]\]/             > 99999]/|check-pipeline-heartbeat.sh
25 queue|product/tools/pipeline-heartbeat.py|s/             > hb\["queue_no_progress_min"\]\]/             > 99999]/|check-pipeline-heartbeat.sh
25 lane|product/tools/pipeline-heartbeat.py|s/        elif idle > hb\["stalled_lane_min"\]:/        elif False:/|check-pipeline-heartbeat.sh
25 nightly|product/tools/pipeline-heartbeat.py|s/ and not nights:/ and False:/|check-pipeline-heartbeat.sh
25 conf|product/tools/pipeline-heartbeat.py|s/        if failed or conformance.get("enforced") != "yes":/        if False:/|check-pipeline-heartbeat.sh
25 new|product/tools/pipeline-heartbeat.py|s/            if not o:/            if False:/|check-pipeline-heartbeat.sh
25 escalate|product/tools/pipeline-heartbeat.py|s/            elif not esc and mins(first, now) > hb\["escalate_after_min"\]:/            elif False:/|check-pipeline-heartbeat.sh
25 carry|product/tools/pipeline-heartbeat.py|s/    state = dict(p.get("alarm_state") or {})/    state = {}/|check-pipeline-heartbeat.sh
25 pages|product/tools/pipeline-heartbeat.py|s/        if old or not page\["pageInfo"\]\["hasNextPage"\]:/        if True:/|check-pipeline-heartbeat.sh
25 parked|product/tools/pipeline-heartbeat.py|s/        if p\["number"\] in away:   # parked: listed below, never a stalled lane/        if False:/|check-pipeline-heartbeat.sh
25 expired|product/tools/pipeline-heartbeat.py|s/^    if expired:/    if False:/|check-pipeline-heartbeat.sh
25 resume|product/tools/pipeline-heartbeat.py|s/^    if now.astimezone(IST).date() > day:/    if False:/|check-pipeline-heartbeat.sh
25 parkread|product/tools/pipeline-heartbeat.py|s/        if hb.get("parked_label", "parked") in p\["labels"\]:/        if False:/|check-pipeline-heartbeat.sh
25 parkpage|product/tools/pipeline-heartbeat.py|s/^                if len(cs) < 100:/                if True:/|check-pipeline-heartbeat.sh
25 trusted|product/tools/pipeline-heartbeat.py|s/ if c.get("author_association") in TRUSTED\]/]/|check-pipeline-heartbeat.sh
25 istdate|product/tools/pipeline-heartbeat.py|s/    posted = t(c\["created_at"\]).astimezone(IST).date()/    posted = t(c["created_at"]).date()/|check-pipeline-heartbeat.sh
26 off|product/tools/focus-check.py|s/ for x in subject if x not in items and x not in rows\]/ for x in subject if False]/|check-focus-list.sh
26 first|product/tools/focus-check.py|s/ else named\[:1\]) + / else []) + /|check-focus-list.sh
26 verb|product/tools/focus-check.py|s/ + \[x for x in VERB.findall(text) if known(x) and not exempt(x)\]$//|check-focus-list.sh
26 then|product/tools/focus-check.py|s/.\[Tt\]hen.merges,//|check-focus-list.sh
26 file|product/tools/focus-check.py|s/BRIEF_FILE.sub(file_row, brief)/brief/|check-focus-list.sh
26 cited|product/tools/focus-check.py|s/^        named = \[r for r in dict.fromkeys(filter(None, map(row_of, MD_FILE.findall(brief)))) if not exempt(r)\]/        named = []/|check-focus-list.sh
26 joined|product/tools/focus-check.py|s/^    while more.search(text):/    while False:/|check-focus-list.sh
26 ticks|product/tools/focus-check.py|s/(\[Rr\]ead.per.from)\\s+\[`\*\]\*(?:/(read)\\s+(?:/|check-focus-list.sh
26 own|product/tools/focus-check.py|s/(\[own.group(1)\] if own and known(own.group(1)) else named\[:1\])/named[:1]/|check-focus-list.sh
26 exempt|product/tools/focus-check.py|s/^    exempt = lambda r: .*/    exempt = lambda r: r in area/|check-focus-list.sh
26 notbuilder|product/tools/focus-check.py|s/(?!\[A-Za-z0-9-\])//|check-focus-list.sh
26 closed|product/tools/focus-check.py|s/^    if not items:/    if False:/|check-focus-list.sh
26 hook|product/tools/lane-preflight.sh|s/python3 -I "\$DIR\/focus-check.py")/cat >\/dev\/null)/|check-focus-list.sh
27|product/tools/check-docs.sh|/WORKFLOW LOCK: \$id changes the workflow/d|check-workflow-lock.sh
27 broken|product/tools/check-docs.sh|s/ \&\& printf [^;]*broken[^;]* \&\& continue$/ \&\& continue/|check-workflow-lock.sh
27 fix|product/tools/check-docs.sh|s/grep -qiE .\\bfix(es.ed.ing)?\\b. \&\& printf/true \&\& printf/|check-workflow-lock.sh
27 tooling|product/tools/check-docs.sh|s/^        \[ -n "\$areas" \] .. continue$/        continue/|check-workflow-lock.sh
27 closed|product/tools/check-docs.sh|/EXEMPT list in tools\/decision-impact.sh could not be read/d|check-workflow-lock.sh
28 allow|product/tools/waves.py|s/            elif wave\[i\]\[0\] not in ok and/            elif False and/|check-waves.sh
28 page|product/tools/waves.py|s/        if norm(old) != norm(gen_block(rows, st)):/        if False:/|check-waves.sh
28 cap|product/tools/waves.py|s/    if len(building) > CAP_BUILDING:/    if False:/|check-waves.sh
28 ids|product/tools/waves.py|s/        if miss or extra or dup:/        if False:/|check-waves.sh
28 pr|product/tools/waves.py|s/               if i in wave and wave\[i\]\[0\] not in ok and not wave\[i\]\[1\].startswith(.allow:.)\]/               if False]/|check-waves.sh
28 watch|product/tools/lead-watch.sh|/waves.py" wip --prs/d|check-waves.sh
28 flag|../../.github/workflows/pr-rules.yml|/labels\[\]=outside-wave/d|check-waves.sh
28 item|product/tools/brief-check.sh|s/^  if \[ -z "\$item" \]; then bad=/  if false; then bad=/|check-lane-preflight.sh
28 wave|product/tools/brief-check.sh|s/waves.py" allow /waves.py" active /|check-lane-preflight.sh
28 none|product/tools/brief-check.sh|s/waves.py" none-ok 2>\&1)/waves.py" active 2>\&1)/|check-lane-preflight.sh
30 stale|product/tools/runs-waiting.py|s/(stale if c and now - c >= timedelta(hours=FRESH_H) else fresh)/fresh/|check-runs-waiting.sh
30 board|product/tools/cockpit-data.py|s/ - len(stale)$//|check-runs-waiting.sh
31|product/tools/founder-click-guard.sh|s/^\[ -z "\$hits" \] \&\& exit 0/exit 0/|check-founder-click-guard.sh
31 state|product/tools/founder-click-guard.sh|s/^    hits = \[h for l in/    hits = [] and [h for l in/|check-founder-click-guard.sh
31 stop|product/tools/stop-check.sh|/founder-click-guard.sh" 2>\/dev\/null/d|check-founder-click-guard.sh
31 watch|product/tools/lead-watch.sh|s/act=\$((act + \$(grep -c .^ACT. <<<"\$fc")))/true/|check-founder-click-guard.sh
33 E14|product/tools/check-docs.sh|s/        if miss: print(f"INDEX:/        if False: print(f"INDEX:/|check-idx-integrity.sh
33 E14 range|product/tools/check-docs.sh|s/            ids .= {f"P-{i}" for i in range(a, b + 1)}/            pass/|check-idx-integrity.sh
33 E14 rules|product/tools/check-docs.sh|s/^for f in \[os.path.join(ph, "RULES.md")\] + sorted(glob.glob(os.path.join(ph, "rules", "\*.md"))):/for f in [os.path.join(ph, "RULES.md")]:/|check-idx-integrity.sh
33 E14 decisions|product/tools/check-docs.sh|s/^for f in \[os.path.join(ph, "DECISIONS.md")\] + sorted(glob.glob(os.path.join(ph, "decisions", "\*.md"))):/for f in [os.path.join(ph, "DECISIONS.md")]:/|check-idx-integrity.sh'
pyparse() { python3 -I -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" "${@: -1}"; }   # "$sh -n FILE" for a .py
MUT="$MUT"'
E16 line|product/tools/deps-line-check.sh|s/^  exit 1$/  exit 0/|check-deps-line.sh
E16 new|product/tools/deps-line-check.sh|s/^        if n not in seen: out.add(n)/        if False: pass/|check-deps-line.sh
E16 alias|product/tools/deps-line-check.sh|s/ and not PLAIN.match(v):/ and False:/|check-deps-line.sh
E16 ci|../../.github/workflows/pr-rules.yml|/deps-line-check.sh" --base HEAD^1/d|check-deps-line.sh'
echo "--- each test without its guard (must FAIL)"
while IFS='|' read -r g f edit t; do
  M=$(mktemp -d "${TMPDIR:-/tmp}/guard.XXXXXXXX") && [ -d "$M" ] || { echo "no temp dir: nothing was checked"; exit 2; }; mkdir -p "$M/$P/product" "$M/$P/prototype/studio" "$M/.claude" "$M/.github/workflows" "$M/$P/product/qa"
  cp -R "$TOOLS" "$M/$P/product/"; cp -R "$ROOTD/$P/prototype/studio/tools" "$M/$P/prototype/studio/"
  cp "$ROOTD/$P/product/qa/CAPABILITIES.md" "$M/$P/product/qa/"; mkdir -p "$M/$P/product/design"; cp "$ROOTD/$P/product/design/waves.tsv" "$ROOTD/$P/product/design/waves.md" "$M/$P/product/design/"; cp "$ROOTD/$P/product/focus-list.md" "$M/$P/product/"; cp -R "$ROOTD/.claude/skills" "$ROOTD/.claude/settings.json" "$M/.claude/"
  cp "$ROOTD/.github/workflows/"*.yml "$M/.github/workflows/"; cp "$ROOTD/.mergify.yml" "$M/"; git -C "$M" init -q   # every workflow: check-label-guard parses two
  for x in $(cd "$ROOTD" && ls packages/xfa-engine/fixtures/synthetic/*.pdf packages/xfa-engine/src/__tests__/fixtures/*.pdf 2>/dev/null); do mkdir -p "$M/$(dirname "$x")"; cp "$ROOTD/$x" "$M/$x"; done   # guard 11 needs the real bytes
  before=$(cksum < "$M/$P/$f"); sed -i.bak "$edit" "$M/$P/$f"; rm -f "$M/$P/$f.bak"
  sh=bash; head -1 "$M/$P/$f" | grep -q zsh && sh=zsh; case "$f" in *.yml) sh=true;; *.py) sh=pyparse;; esac   # a .yml is parsed by its test; a .py by ast (B192)
  if [ "$before" = "$(cksum < "$M/$P/$f")" ]; then echo "FAIL  guard $g: the edit '$edit' changed nothing in $f"; bad=1
  elif ! $sh -n "$M/$P/$f" 2>"$M/log"; then echo "FAIL  guard $g: the edit '$edit' breaks $f's syntax, so its test failing proves nothing ($(head -1 "$M/log"))"; bad=1
  elif bash "$M/$P/product/tools/$t" > "$M/log" 2>&1; then echo "FAIL  guard $g: $t still passes with the guard off"; bad=1
  else echo "PASS  guard $g off → $t fails ($(tail -1 "$M/log"); first: $(grep -m1 '^FAIL' "$M/log" | cut -c7-90))"; fi
  rm -rf "$M"
done <<< "$MUT"
exit $bad
