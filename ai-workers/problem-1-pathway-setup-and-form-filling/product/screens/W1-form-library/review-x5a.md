# X5 slice a: fill the form library from IRCC's forms list. Independent review, 31 Oct 2026

Reviewer: I did not build this. I reviewed **commit e5ec8173** (`claude/forms-x5a-library-06zafk`, PR #138; merge base eddb4b94), against P-156 (1), plan-p156 §1–§3 and §5 slice a (P156-1, P156-2), STANDARDS §9 and QUALITY D1–D20.

**How I tested.** My own isolated copy `rvx5` on :4457 (own ledger dir; web built from this commit). Suites: `check_forms_x5_library.ts` **18/18**; `check_forms_s4_library_browser.cjs` on a fresh copy **76/76** (its rewritten screenshots put back with `git restore`); `graph.mjs`: the new route is tested, nothing new in G1–G6. Plus my own Playwright journey (`/tmp/rvx5js/journey.cjs`, outside the repo), two mutation runs and direct SQL on `xr_studio_rvx5`. **Spend: US$0** (no AI, no `*_LIVE`, ledger untouched). The copy is stopped.

## Verdict: Ship after fixes (two Majors, no Blocker)
P156-1 holds:
* The fill costs US$0: no AI and no download. 221 numbers are added and 9 matched.
* It never duplicates: a second fill adds 0, and two fills at once give 237 rows with 0 duplicates.
* Existing forms keep their file, title, kind, page, retired state and combination lines. The snapshot before and after shows 0 changed rows.
* A row with no page is counted, never guessed.

P156-2 marks a changed date and never replaces the file. Its mark can be lost without any check, though (Major 2), and the library list is now well outside the §9 budgets (Major 1).

Verdict: Ship after fixes

## Issues, ranked
1. **Major (Must): speed, STANDARDS §9 [M] / D15.**
   * **What happens.** After the fill the list has 237 rows. `list()` runs `formUses()` (about 10 queries, including a JSONB scan of the releases) and `keptBy()` for **every row**: `api/src/form-library.ts:120-122`. That is a request per row at the database.
   * **Measured on :4457:**
     * `GET /library/forms/list`: about 80 ms before the fill, 0.60–0.86 s after.
     * The page's first view: 0.42 s before, **1.12–1.62 s** after (budget < 1 s).
     * Search "5257": **0.96–1.16 s**. The Guides chip: **1.27–1.33 s** (budget < 200 ms).
     * `?for=picker` (S5's "Add a form"): 0.65–0.74 s.
   * **Fix.** Work out the row action for all rows in one query set. A listed row with no editions, no lines, no release snapshot and no open change is just "Delete", so one query for every released `form_number` plus the lines and changes already loaded covers it. Then add a timing step after the fill to the browser check.
2. **Major (Must): the "Newer edition on canada.ca" mark is cleared even when the check fails (P156-2 "flagged", D2/D6).**
   * **What happens.** `checkCanada` clears `newerOnIndexAt` *before* `compareWithCanada` (`form-library.ts:170-171`).
   * **Reproduced.** I set the mark on IMM 5881 and IMM 5905 and pressed ⋯ › Replace with a new edition. Both answered **409 "canada.ca could not be read"**, and both marks were gone.
   * **Why it matters.** On the Mac, canada.ca being down erases the flag with nothing checked.
   * **Fix.** Clear the mark only after a successful comparison. Add a fail test: a check that cannot read canada.ca keeps the mark. The current test passes either way.
3. **Minor (Should): the counts are wrong under a race (D2/D6).** Two fills at once both answered "221 new forms listed". There are two audit lines claiming 442 created, while 221 were actually created. `form-library.ts:160` reports `plan.create.length`. **Fix:** report `createMany(...).count`.
4. **Minor (Should): the status chip contradicts the pill (D10).**
   * The chip "Newer file on canada.ca" (`library-forms.tsx:119`) now also counts rows that read "Newer edition on canada.ca".
   * The chip's tip (`:46`) says "another file of the same printed edition", which is wrong for those rows.
   * **Fix:** word the chip and its tip to cover both cases.
5. **Minor (Should): focus is lost after Fill (D13, WCAG 2.4.3).**
   * Pressing Enter on the button sends focus to `<body>`, because `busy` disables the button (shared `Button`, `library-forms.tsx:196`).
   * A keyboard user starts again from the top.
   * **Fix:** keep focus on the button (for example `aria-disabled` while busy), or send it to the message.
6. **Minor (Should): the button's place (D12).**
   * At 1440 px the header has three flex children with `justify-between`, so "Fill from IRCC's forms list" floats mid-header, away from Upload PDF (`library-forms.tsx:103`; my `k2-after-fill.png`, and the builder's `16-filled-from-index-1440.png`).
   * **Fix:** put both buttons in one group on the right. They are correct at 1024 and 390.
7. **Minor (Should): a test gap (D16).**
   * **Mutation run.** The fill overwrote matched forms' `display_name`. The X5 suite still passed every data step: only the role steps failed, under the role-check mutation.
   * **Fix:** assert that matched rows keep their title, kind, page and `retired_at`, and that a retired form stays retired after a fill.
8. **Minor (Should): a misplaced comment.**
   * The doc comment "One way in: Upload PDF…" now sits above `FillFromIndexButton`, and the button's own comment follows it (`library-forms.tsx:193-195`).
   * **Fix:** move it back above `UploadButton`.
9. **Minor (question for the Lead): what the person sees about rows with no page, and the first read.**
   * **No page.** The plan says such a row is "listed as 'no page'". The screen shows only a count. The numbers appear only in the response and the audit metadata. The recorded index has 0 such rows.
   * **First read.** P156-2 says a read that "differs from the library's edition" is marked. The build compares with the *previous index read*, so the first fill never marks a form that has a file. This is defensible, because the index date is the page's date, not the edition. Confirm or amend the plan.

## Asked questions, answered
* **Migration and schema:** three nullable columns, nothing back-filled, rollback written. `createMany` with `skipDuplicates` relies on the unique `(workspace_id, form_key)` and held under the race.
* **A form a combination uses, or a retired form:** the fill writes only `listed_on_index_at`, `index_date_modified`, `newer_on_index_at`, and `form_page_url` where empty. Retired status takes precedence in the list.
* **Roles:** approver, content reviewer, case officer refused (403), no actor 401; button hidden without the author duty; the role-check mutation fails 4 steps.
* **Other readers of `gov_form_def`:** the pickers (`?for=picker`, `/library/forms` for S5 "+ Add") need an edition: 15 rows before and after. The finder's `formFor`/`storeDownloaded` reuse the listed form; `attachFound` is unchanged; `fillSample` skips forms with no edition. Upload attaches the new edition to the listed form. "No form find yet" reads `combination_form` (untouched). A rules finder run on Visitor visa is the same before and after. Only the library list's speed is affected (Major 1).
* **Do the checks fail without the fix?** Yes for the endpoint, the pure rules and the roles. Not for the title overwrite (issue 7) or a failed check clearing the mark (issue 2).

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | P156-1 met; P156-2 met except the mark-clearing bug (issue 2) |
| D2 | 4 | No duplicates under a race, existing rows unchanged; race counts wrong (3) |
| D3 | 5 | One row per number, matched by `normaliseCode` (IMM 5257 SCH1 matched) |
| D4 | n/a | No rule paths touched |
| D5 | 4 | Safe to press again; double press is safe; focus lost (5) |
| D6 | 3 | Audit line with counts; mark lost on a failed check (2); race audit wrong (3) |
| D7 | 5 | No AI anywhere; the message and the tip say "No AI, no download, US$0" |
| D8 | 5 | Shared library › Forms, unchanged |
| D9 | 4 | Tip says the next step (picked by a combination, or upload); 221 no-file rows bury the 15 real forms |
| D10 | 4 | "Listed by IRCC · no file yet" is clear; chip/pill mismatch (4) |
| D11 | 4 | Busy spinner, message in 0.12 s, rows 1.3–1.5 s later |
| D12 | 4 | Team look; the button floats at 1440 (6) |
| D13 | 4 | axe 0 at 1440/1024/390; no sideways scroll at 200 %; keyboard reaches the button (16 Tabs); focus lost (5) |
| D14 | 5 | Team components and words |
| D15 | 2 | First view 1.1–1.6 s, search/filter 1.0–1.3 s, a request per row (1) |
| D16 | 3 | 18 + 76 green, pass and fail per rule; issues 2 and 7 untested |
| D17 | simulated only | No intended user walked it |
| D18 | 5 | Each listed row links its canada.ca page; "Listed by IRCC" says the origin |
| D19 | 4 | Listed forms flow into the finder download and the upload; slice c/d close the loop |
| D20 | simulated only | — |

## Journey score: 6.5 / 10 (below the pass of 8; no criterion at 0)
Report: `journey-test-reviewer-2026-10-31-x5a.md`.

Task completed 1 · next step obvious ½ · plain words 1 · feedback and state ½ · correct data ½ · error recovery ½ · accessibility and screen sizes ½ · speed ½ · visual quality ½ · trust and sources 1.

To raise it, most valuable first: Major 1 (speed), Major 2 (error recovery), then issues 5, 6, 3 and 4.

## What I could not check
canada.ca live (recorded copies only; none of their rows lacks a page); a real screen reader; an unaided walk by the configuration author (D17, D20); the rest of CI (still running on e5ec8173 at review time).
