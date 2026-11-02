# K3, C3.12 "Published" is IRCC's month (QA-148): review round 3, the rebase, 2 Nov 2026

**Reviewer:** I did not build this.
**Commit:** **ec52921a** (PR #545, branch `claude/vibrant-hopper-a48qgk`): rounds 1–2's three commits cherry-picked onto main **079ef107**.
**Scope:** a re-check only. Does the cherry-pick carry the approved change (681fcae6, 9.5/10, `review-round2.md`) unchanged? Does anything on the new base break it? Do the row's suites pass on this head?
**Journey score:** **9.5/10, pass** (carried over from round 2, re-confirmed on this head by the replay below; there is no new walk because the product diff is identical).

## 1. The cherry-pick carries the reviewed change unchanged
`git range-diff f02ef514..bb921f7a 079ef107..ec52921a`:
* `31bfda94 = 616a62b8`
* `681fcae6 = 4fb1dc41`
* `bb921f7a = ec52921a`

All three patches are identical (`=`). The product diff `079ef107..ec52921a` touches 5 code files:
* `api/src/form-library.ts`
* `engine/published-date.ts`
* `web/src/pages/library-forms.tsx`
* `web/src/components/forms.tsx`
* `tests/check_forms_c312_field_map.ts`, `tests/check_forms_s4_library_browser.cjs`

The rest is records and 3 screenshots. There is no Prisma or migration change.

## 2. Nothing on the new base breaks it
**Files both sides changed.** Main moved `f02ef514..079ef107` (#505, #500, #521, #524, #517, #526, #529–#533 and others). The PR shares 2 files with it:
* **`library-forms.tsx`.** #505 changed the Used by filter's option text and `TrailText`/`nameFirst` (around lines 197 and 236–244). K3 changes:
  * the `Row` type (lines 25, 31);
  * the date helpers (lines 46–57);
  * the drawer's Definition and Earlier edition lines (lines 365, 369).

  The hunks are separate, and neither side reads the other's symbols.
* **`check_forms_s4_library_browser.cjs`.** #505 changed one step (line 91, the Used by option text). K3 changes lines 120–143. The two do not overlap, and both pass (below).

**Readers of the changed fields.** I searched `api engine web/src contracts tests acceptance tools` for:
* `publishedOf`, `PublishedState`, `published_state`, `published_from`, `file_date`, `ircPublished`;
* the old words ("the date in the file", "Date not in the file", "Date could not be read from the file").

No new reader on main uses them. Main's SH2 `engine/where-used.ts:24` reads the database column `edition.published` only (an optional type field), and K3 leaves that column and its meaning ("File saved") unchanged. `tests/check_c113_full_trail.ts` (#505's API trail) reads `used_by` and `combinations`, which K3 does not touch.

**Build and types.**
* `vite build` is clean.
* `tsc --noEmit -p web/tsconfig.json`: 0 errors.
* `tsc -p api/tsconfig.json`: 15 errors, all in 5 test files K3 does not touch (`check_c18_age_case`, `check_c69_runs`, `check_cost_check`, `check_vv_checklist`, `check_x2b_bulk_apply`), so they are pre-existing on the base. None are in a PR file. CI runs no API tsc.
* `count-any.mjs --against 079ef107`: 423 explicit `any`, the same as the base.
* `graph.mjs`: G3 7, G6 3, unchanged from round 2.

## 3. The row's suites pass on this head
Each suite ran on a fresh database, live AI off, US$0, Node v24.21.0, chromium at `/opt/pw-browsers/chromium`.

| Suite | Copy | Result |
|---|---|---|
| `tests/check_forms_c312_field_map.ts` | :4447 `xr_studio_k3r3` | **61 passed, 0 failed** (exit 0); the same as round 2 |
| `tests/check_forms_s4_library_browser.cjs` | :4448 `xr_studio_k3r3b` | **113 passed, 0 failed** (exit 0); the same as round 2 |
| `acceptance/C3.12.test.ts` | :4447 fresh `xr_studio_k3r3` | **17 passed, 0 failed** (exit 0); AT-3 green |

**On the browser suite.**
* I used a launch preload (outside the repo) that turns `channel: "chrome"` into `executablePath`, as in round 2.
* It rewrote 48 `W1-form-library/screenshots/slice3` PNGs. I looked at them, then restored them all with `git checkout --`.

**Replay on this head (journey-test §3).**
* axe WCAG 2.2 AA finds 0 violations on every state, including the row drawer and the list at 400 px with dates.
* No sideways scroll at 1440, 1024 or 400. The date is one line box at 1024 and 400.
* Esc returns focus to the row's number.
* No page or console errors.
* First view with the sample: 538 ms (load 3.8 on 4 cores).

**Where the two changes meet** (`07-drawer-1440.png`, `c312-published-400.png` from this head):
* The IMM 1295 drawer reads "Published 2023-09 (printed on the form)", with "File saved 2026-06-04: the PDF's own date, not when IRCC published it" kept apart below it.
* The list shows "Published 2023-09" under the edition.
* Next to it, #505's Used by reads "With an LMIA · Retail › Temporary residence › …" (step 52, QA-150), and the "review M5" name-first step passes too.

## Findings
There are no new findings from the rebase. These carry over from round 2, unchanged, because the code is identical:
* **A. Should (Minor).** `engine/published-date.ts:38` accepts a printed month up to December of next year, so the planted `(12-2027)` reads "Published 2027-12". Fix: cap at next month, as the comment and the `:71` test say, or list it in the PR.
* **B. Note.** The drawer's unread/unreadable file-date words are tested through the API only.
* **C. Note (new, wording only).** The test name at `tests/check_forms_c312_field_map.ts:153` still says "the page says 'Date not in the file'". The page now says "The PDF names no date of its own". The assertion is right; only the name is stale.
* **Process (round 2).** Put the printed-first order under "Questions" in the PR body, so the tech lead can align the pack's AT-3 comment (`acceptance/C3.12.test.ts:5-7`) and close QA-148.

## Could not check
* A real screen reader or a headed browser.
* An intended user (D17, D20 stay with the founder).
* Live canada.ca pages.
* CI itself (the GitHub run on ec52921a). This check is local only.

## Environment notes (no repo change)
* `tools/isolated.sh` takes `ROOT` from the worktree, so its `pg_ctl status` precheck fails outside the main copy. I ran the script's own steps by hand: a fresh `xr_studio_<name>`, `prisma migrate deploy`, and the API through tsx with `STUDIO_PORT`/`STUDIO_VAR`.
* I set the worktree's `schema.prisma` mtime (content unchanged) so the shared Prisma client was not regenerated. It differs from this head only in one doc comment.
* `.tools` and `studio/node_modules` were linked only for the run and removed afterwards, along with both copies, their databases and their var folders.
* The worktree is clean apart from this file. Nothing was committed.

**Verdict: Approve.** No open Blocker or Major. ec52921a carries 681fcae6's change byte for byte, the new base does not break it, and the row's three suites pass (61/0, 113/0, 17/0). Remaining (not blocking):
1. Minor A: cap the printed month (`engine/published-date.ts:38`), or list it in the PR.
2. Process: put the printed-first order under "Questions" in the PR body.
3. Notes B and C.
