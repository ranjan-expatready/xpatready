# Resume on the new account (P-344 (1)): one page, kept by the tech lead

**Not yet tested on a real switch.** The first real switch tests it; correct this page then. The work lives on GitHub (P-82), so an account switch loses at most what a lane has not pushed. Every lane pushes after each step (P-344 (1)).

## Before the switch (the Lead, if there is warning)
1. `get_usage`: note the weekly figure and time.
2. Rewrite `STATE.md`, push; message each Mac lane "push now"; check with `gh pr list` that each row's last push is recent.
3. Run `bash product/tools/factory-board.sh` and paste its output under "Board at the switch" in `STATE.md`.
4. A labelled PR needs nothing: Mergify merges it without any account (Mergify and GitHub Actions do not use the Claude account).

If there is no warning, nothing above is needed to resume: read the board on the new account instead.

## What does not depend on the Claude account
GitHub (code, PRs, labels, comments), Mergify, GitHub Actions, the demo at :4400, the Mac's copies under `.claude/worktrees/`, the side-session notes folder `lead10-saved-2026-11-05/`, `product/` records.

## What does
Every Claude session, Mac and cloud. **Assume none carries over**; a session that does is a bonus. Scheduled checks die with their session.

## The founder, on the new account (about 5 minutes)
1. Sign in to the Claude desktop app with the new account and to claude.ai in the built-in browser.
2. In the Code tab open this folder (`Desktop/Xpatready` in the founder's home folder) and type `/lead`.

## The new Lead, in order
1. **Connection checklist (P-326 (5)):** no "Connect GitHub" on claude.ai/code; `gh auth status`; Mergify sees the repo; Drive read works; the nightly ran. A cloud canary that cloned and pushed comes before any cloud lane is counted as running (20 of 20 cloud lanes died unseen on 4 Nov because this was missed).
2. Read `RULES.md`, the newer `DECISIONS.md` rows, `STATE.md`, per the `lead` skill.
3. Create the 30-minute check; start two standby Leads in the founder's typed turn (P-286).
4. **Restart lanes from `STATE.md` "In flight" plus the board, one per row, critical path first** (the board lists only rows with a PR; a row with no PR yet is only in STATE). Mac memory is full, so cloud first unless a row needs `sources/` or `code/`.
   Brief for each: "Row <id>, PR #<n>, branch <b>. Continue from its last push. Read the PR's comments, including the Lead's rulings. Standard rules (lead skill, Sessions and tokens). Done when: <the row's Done when>."
5. Check for unpushed Mac work before reusing a copy: `git -C .claude/worktrees/<copy> status -s` and `git -C … log @{u}..`. Commit and push any to its own branch first. Never delete a copy until that is done.
6. qa first if its re-scores are behind: the qa lane is the one writer of `qa/CAPABILITIES.md` and `qa/BUGS.md`.
7. Tell the founder in one line what restarted, what did not, and what was lost; then correct this page.

## What could be lost, and the guard
| Risk | Guard |
|---|---|
| A lane's unpushed step | push after each step; at worst one step |
| A running review or breaker | the row's head is unchanged, so re-run it |
| A Lead's unwritten rulings | rulings go on PR comments first (P-336); records follow |
| Paid run in progress | runs only on the Mac paid runner with the ledger; check `prototype/p2/ledger.ts` totals before any retry |
| Notes under a session's id | keep notes in `lead10-saved-2026-11-05/`, never in a folder named for a session (archiving removed Lead 5's) |
