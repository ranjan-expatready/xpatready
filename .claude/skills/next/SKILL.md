---
name: next
description: The builder's command for the Pathway Configurator: /next screens, /next forms, /next runtime or /next evidence, optionally followed by a backlog row or the founder's ask. Takes one ready row end to end on a branch from origin/main, has the reviewer agent approve it, and labels the pull request so Mergify merges it. Redirects a wrong copy. Use when /next is typed or someone says continue, next or carry on in a builder session.
---

# /next <area> [row] — one row, start to merged

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). **The loop, the PR contents and every rule: P/`WAY-OF-WORKING.md` — read it first.** Work list and owners: P/`BACKLOG.md`. This skill keeps only the commands.

## 1. Guard
`bash P/tools/lane.sh whoami`: `lead` → "This is the tech lead's copy: type `/lead` here." Stop. `qa` → "Type `/qa <mode>` here." Stop. `unbound` → `lane.sh bind <area>`. Bound to another area → name it and stop. Then `lane.sh setup`.

## 2. Pick
* The row named in the message, else your top open row in `BACKLOG.md` (Owners, then Now, then Next). WIP: no new row while your last PR is unmerged.
* Not ready (no acceptance test, an open founder question, a new screen part without an approved concept) → write the question with your recommendation for the tech lead and stop.
* A founder ask: check in minutes that it fits `DECISIONS.md` and the agreed board and moves no other screen, area or row; a knock-on effect → one plain line to the tech lead with your recommendation before building.

## 3. Build
```
git fetch origin && git checkout -b claude/<area>-<word> origin/main
```
At the first commit: `git push -u origin HEAD && gh pr create --draft --base main` (title and body from `WAY-OF-WORKING.md`, "Every PR"). Push after every step (P-344): a draft push runs only the guard, about a minute, no suites (P-371). Read → write the plan in the PR body → implement. Screens: skill **screen-build**. Your own ports and databases (`WAY-OF-WORKING.md`), never :4400.

## 4. Check
```
bash P/tools/run-suites.sh --changed origin/main..HEAD; echo "exit $?"   # must be exit 0
node P/tools/graph.mjs --check
node P/../prototype/studio/tools/count-any.mjs --against origin/main
```
When `--changed` selects ALL (a shared contract), run only the suites of the files you touched, by their usage lines; the PR's GitHub check runs the rest.

## 5. Review and PR
1. **Walk first (P-352):** before the first review, walk a person's full journey by screens at 1440 px, from the start of your row's steps to the next capability's first step; fix what stops you; put exit codes and screenshots in the PR. Then launch **screen-reviewer** on the exact commit; also **screen-breaker** for screens, money, permissions or schema. Fix Blockers and Majors with a fail test.
2. `git fetch origin && git merge --no-edit origin/main` (a conflict: list the files, change nothing, tell the tech lead), re-run step 4.
3. `git push`; the PR body complete (`WAY-OF-WORKING.md`, "Every PR"), and `qa/built/<ID>.md` per capability finished. The PR stays a draft.
4. Before the label (P-312, P-317): the row's pack passes on a fresh isolated copy built from the branch, started and stopped in the same command (`zsh P/../prototype/studio/tools/isolated.sh <area>_<word> <port> start --ttl 60 && trap 'zsh P/../prototype/studio/tools/isolated.sh <area>_<word> <port> stop' EXIT && <pack>`), plus a walk like a person at 1440 px, with exit codes and screenshots in the PR; no open Major on that capability; a PR that claims Works also needs qa's gate A PASS. After the reviewer approves the current commit, post a PR comment with the line `Reviewer: Approve <full head SHA>` (the label guard keeps the label on a new push only with that line or a pure merge of main, P-318 (1)), then `gh pr ready <n>` (the full check runs now, once, never cancelled: P-371), then `gh pr edit <n> --add-label "review: approved"`. Don't merge main in again unless GitHub shows a conflict (P-270): the merge batch tests with the latest main. Any later push needs a new review and the label again.
5. **Don't wait and watch CI:** after the label, end, or take your next row (P-341, P-267). CI red (the Lead or `flow-watch.sh` sends you back): read the failed part's log. No code cause in it (a lost runner, a network fetch) → that part is re-run alone: `gh run rerun <run-id> --failed` where `gh` works; a cloud lane (403, P-439) comments `/rerun failed` on its PR, with the log line, and `/run nightly C7.3 [six|checkpoint]` for a pack re-test (D3, P-506; `WAY-OF-WORKING.md`); a suite failing at random goes to quarantine (P-205); a code cause → fix with a fail test, push.

## 6. Reply
**Report to the current Lead (founder, 6 Nov):** after each step, label, blocker or question, SendMessage the current Lead one line: its session id and title come from `bash P/tools/current-lead.sh` (else the ListAgents "Lead N ·" row that is not "(ended)" or "standby"; numbers restart per series (P-433), so never pick by the highest number; if more than one, post the PR comment only). The PR comment stays the record; a cloud lane that lists no Lead posts the comment only.
One short report when the PR is open or merged: link, what changed in plain words, the checks, any question for the tech lead. The PR is the record.
