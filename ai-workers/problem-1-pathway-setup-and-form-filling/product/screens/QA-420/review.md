# Review: PR #1627 (QA-420 row, records only), head 2c939b5a3

**Verdict: Approve** for 2c939b5a3. No Blocker, Critical or Major findings are open.

Reviewer: a fresh context that did not write the PR. Date: 12 Nov 2026.

## Scope
- `git diff origin/main...2c939b5a3` (merge-base e5bcc40d3 = origin/main) adds one row, QA-420, to `product/qa/BUGS.md`. Nothing else changes.
- No screen changed, so most of the screen-review skill does not apply: no concept fit, D1-D20, BIC scorecard, graph or retrofit. **Journey test: skipped, no score.** There is no screen or journey to walk.
- The proposed quarantine is in the PR body. Its patch is `git show 67dae0779 -- product/tools/run-suites.sh`, which a548e9a0e undoes on the branch. I reviewed it as text and did not apply it to the repository.

## 1. The QA-420 row
- **Accurate. Met.**
  - The row names `check_c613_filing_changes_browser.cjs:86`. At 2c939b5a3 that line reads `document.activeElement` right after these steps: `[data-change-done]` waitFor (l.82), the row's "Removed …" text waitFor (l.84) and a `row.innerText()` (l.85). There is no wait for focus.
  - The product moves focus later and asynchronously: `web/src/runtime/filing-changes.tsx:29` `focusRow` runs `setTimeout(go, 50)` and retries every 100 ms, up to 20 times. So the read can come before the focus move.
  - The neighbouring step 7b waits 400 ms (l.111), which supports the diagnosis.
  - A fresh copy has 14 steps (setup at l.30 plus 13). That matches the row's "14/14" and "13/14".
- **Evidence matches the brief.** On 348fa8b11, 1 of 3 runs were red, with only 6a failing. On #1612's branch, 1 of 2 were red.
- **Format. Met.** The row has the same 7 columns as the header and the rows below it (9 `|`-split fields, the same as QA-415 to QA-419). gate B's parser (`studio/tools/gate-b.mjs` `openBugs`) reads it as `{"id":"QA-420","severity":"Minor","caps":["C6.13"]}`. A Minor does not stop a Works claim.
- **No personal names. Met.** It names only roles ("tech lead") and Sample names.
- **QA-420 is unique. Met.** `git grep QA-420 origin/main` finds nothing. At 2c939b5a3 it appears once.
- **Says "proposed, not applied". Met.** The row says: "Quarantine … proposed on #1627 as a patch to `tools/run-suites.sh`, a tech lead file". The fix and exit condition are clear: wait for the focus move, get 5 green runs in a row, then take the suite off QUARANTINE in that PR.

## 2. The proposed run-suites.sh patch (67dae0779)
- **The patch applies cleanly to current main. Met.** `run-suites.sh` has not changed between 67dae0779^ and origin/main, so it applies as is.
- **Shell. Met.**
  - `bash -n` passes (exit 0).
  - The change is the same as the existing entries: the suite name is added to the space-separated `QUARANTINE="…"` list, with a dated comment block above it. The comment gives the reason, the ruling (#1612, Lead 23, P-205), the evidence and the fix row, in the same shape as the `check_forms_c36` entry.
- **Effect matches the claim. Met.**
  - Patched `--list`: 452 suites, the same as main, so nightly still runs it.
  - Patched `--list --skip-quarantined`: 447 suites, against main's 448. The only difference is `check_c613_filing_changes_browser.cjs`.
  - `--changed` (the PR check) skips quarantined suites through the same `case " $QUARANTINE "` test at l.206/l.320.

## 3. Reproduction (optional, done)
- I ran it on an isolated copy on :4439 (`rv_c613`), built from 2c939b5a3, which has the same code as main e5bcc40d3. I did not use :4400. I started only the database cluster (pg_ctl), and stopped it afterwards.
- I ran the check 7 times. Run 1 (fresh copy, screenshots to the scratchpad) passed 14/14. Runs 2-7 were 13/13, 12/13, 13/13, 13/13, 12/13 and 13/13.
- The two red runs (2 of 7) failed **only "C6.13 walk 6a"**. So the flake is still on current main.
- No files under `product/screens` were rewritten. `git status` was clean afterwards.

## Findings
- Blocker / Critical / Major: none.
- Minor: none.
- Nit (optional, not a condition):
  1. The row sits above QA-415, but the newest rows at the top run in ascending order (QA-415 to QA-419), so it would read better after QA-419.
  2. The "Found · last seen" cell could add "last seen main e5bcc40d3 (reviewer, 2 of 7 runs)".
  3. The patch quarantines the whole suite, so 13 sound steps leave PR and queue checks. The patch comment says this and notes that `acceptance/C6.13.test.ts` still runs. It is the same per-suite practice as the existing entries.

## Not checked
- The "32 steps" count for `acceptance/C6.13.test.ts` in the patch comment: I checked it only roughly, by grep.
- The PR body text itself: I read the patch from 67dae0779 as instructed, not from GitHub.

## What I ran (exit codes)
- `git rev-parse HEAD` → 2c939b5a3 (0)
- `bash -n` on the patched run-suites.sh → 0
- `--list` and `--list --skip-quarantined`, main vs patched → all 0
- gate-b `openBugs` on the row → 0
- `isolated.sh rv_c613 4439 start` → 0
- C6.13 check × 7 → exit 0, 0, 1, 0, 0, 1, 0
- `isolated.sh … stop` → 0
