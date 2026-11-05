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
Read → write the plan in the PR body → implement. Screens: skill **screen-build**. Your own ports and databases (`WAY-OF-WORKING.md`), never :4400.

## 4. Check
```
bash P/tools/run-suites.sh --changed origin/main..HEAD; echo "exit $?"   # must be exit 0
node P/tools/graph.mjs --check
node P/../prototype/studio/tools/count-any.mjs --against origin/main
```
When `--changed` selects ALL (a shared contract), run only the suites of the files you touched, by their usage lines; the PR's GitHub check runs the rest.

## 5. Review and PR
1. Launch **screen-reviewer** on the exact commit; also **screen-breaker** for screens, money, permissions or schema. Fix Blockers and Majors with a fail test.
2. `git fetch origin && git merge --no-edit origin/main` (a conflict: list the files, change nothing, tell the tech lead), re-run step 4.
3. `git push -u origin HEAD`; `gh pr create --base main` with the title and body from `WAY-OF-WORKING.md` ("Every PR"), and `qa/built/<ID>.md` per capability finished.
4. Before the label (P-312, P-317): the row's pack passes on a fresh isolated copy built from the branch, plus a walk like a person at 1440 px, with exit codes and screenshots in the PR; no open Major on that capability; a PR that claims Works also needs qa's gate A PASS. After the reviewer approves the current commit: `gh pr ready <n>` (a draft PR runs no CI, #875), then `gh pr edit <n> --add-label "review: approved"`. Don't merge main in again unless GitHub shows a conflict (P-270): the merge batch tests with the latest main. Any later push needs a new review and the label again. CI red → read the log, fix, push.

## 6. Reply
One short report when the PR is open or merged: link, what changed in plain words, the checks, any question for the tech lead. The PR is the record.
