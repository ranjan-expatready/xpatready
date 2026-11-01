# F2 C3.12 "Field map in the Forms list": independent CHECK of commit b6d8b50b, 1 Nov 2026

Reviewer: I did not build this. I reviewed `git diff origin/main...b6d8b50b` (5 code files and 6 screenshots). I checked it against C3.12, P-123, P-32, PRODUCT §3–§4, STANDARDS, EXPERIENCE and QUALITY D1–D20.

**Verdict: Block** (ship after fixes). One Major: the tooltip and drawer send the person to To review, but in the sample To review has nothing for those forms.

## How I tested
* **Copies.** `rev_c312` on :4456 and `rev_s4l` on :4457, fresh databases, US$0, no `*_LIVE`. Both copies are now stopped, their databases dropped and their var folders removed.
* **Suites.**
  * `check_forms_c312_field_map.ts`: 23/23.
  * `check_forms_s4_library_browser.cjs`: 101/101 on a fresh copy. I ran a copy of it from `/tmp` with its screenshot folder pointed at `/tmp`, so `slice3/` was not touched by me.
  * `tsc --noEmit`: api and web clean. The only error is in `tests/check_c18_age_case.ts`, which is untouched and already on main.
* **My own walk.** Playwright, at 1440, 1024, 200 % zoom (512 CSS px at scale 2) and 400 px. It covered keyboard, axe, the drawer for 4 row kinds, a reader without the author duty, following the tip to To review, and a break-it pass on the database.
* **Graph.** G1–G6 = 0/0/1/0/0/0. The one G3 is not from this diff.
* **Journey test.** Report: `journey-test-reviewer-2026-11-01-c312-b6d8b50b.md`. Score **7.5/10, no criterion at 0**.

## What holds
* **The rule is right on counts.** `fieldMapState` (`contracts/form-library.ts:79-93`) reads the draft view per data path (`engine/snapshot.ts effective`, the same as `form-progress.ts:40`). It leaves out RETIRED and SUPERSEDED rows and keeps carried unresolved rows from "Complete".
  * A test checks each branch with a pass and a fail, so removing a branch fails a test.
  * The API test compares every form's count with the database.
* **One query for the whole list, not one per row.** One `formFieldMap.findMany` over the current editions plus one `proposalItem.groupBy` (`api/src/form-library.ts:104-111`). The list's first view took 360 ms warm.
* **The API gives these words for every row of the sample:**

  | Form | Field map |
  |---|---|
  | Guides and checklists | "No field map" |
  | IMM 5802 | "No edition yet" |
  | IMM 5257 | "AI draft · 84 to review" (AI marked, amber pill) |
  | Six forms | "D of T form fields decided" |

  My break-it pass on the database:
  * After deciding every IMM 5475 field: "Complete · 27 form fields" (green pill).
  * After deciding every IMM 5707 field and leaving one draft: "50 of 50 form fields · waits for review" (amber pill).
* **Proposals count only for their own edition.** Proposals for another edition do not move the count (test). An edition label is unique per workspace (`workspaceId_editionLabel`).
* **Narrow screens.** Below xl the column hides and the short line reads "Form · 09-2023 · Field map: 226 of 242 form fields decided". There is no sideways scroll at 1024, 200 % or 400 px.
* **Keyboard and axe.** The cell is focusable and its tip shows on focus. Tab order: Number → Field map → Status → Edit. axe found 0 issues on the 1440 list, the 1024 list, the drawer and the list with Complete and waiting pills. No console or page errors.
* **Readers.** user-B (no author duty) sees the same words.
* **Test hygiene.** The three `.catch(() => {})` after waits are gone, as the builder said.

## Issues

**M1 (Major, Must). The "undecided" tip names a next step that does not exist for carried form fields.**
* **What it does.** The rule tells the person "N form fields have no decision yet (mapped, or not a fact). They wait on To review." It says this whatever the status of those rows (`contracts/form-library.ts:90`). The drawer's Definition repeats it (`library-forms.tsx:348`).
* **Why it is wrong.** To review lists only form fields that are unresolved **and DRAFT** (`api/src/review-queue.ts:168,173`). The product already words carried rows differently:
  * `form-progress.ts:53-56`, review M1: "ones carried from an earlier release are the validator's warning".
  * `job.tsx:218`: "These come from an earlier release: decide them when you can."
* **Evidence on the sample.** All unresolved rows of IMM 1295, 5257 SCH1, 5409, 5475, 5476 and 5707 are PUBLISHED. SQL: unres_draft = 0 and unres_pub = 16/10/13/3/7/4. As user-B, `/api/review-queue` returns 1 item, the IMM 5257 AI proposals. To review on screen has nothing for IMM 1295 (my screenshot `w-review.png`).
* **Effect.** 6 of the 7 mapped forms in the demo point the person to an empty place. This breaks EXPERIENCE 5 (one next action per status), 7 (reasons) and 10 (tooltips say how to fix it).
* **Fix.**
  1. In `fieldMapState`, tell "no decision, in a draft" (To review) apart from "carried from an earlier release" (words like job.tsx: decide them when this edition is drafted again). The rows already carry `status`.
  2. Add a pass and a fail test on the tip, in both cases.

**m1 (Minor, Should). No meaning below xl.** At 1024 px and 200 % the short line "Field map: 226 of 242 form fields decided" has no tooltip (`library-forms.tsx:153`). Its meaning is only in the drawer. EXPERIENCE 10 asks for a tooltip on a number that needs context. Fix: wrap the short span in the same `Tip` (or point to the drawer).

**m2 (Minor, Should). The browser test's SQL is not quite the rule.** The test's SQL in `check_forms_s4_library_browser.cjs:57` takes the newest row by version and counts RETIRED rows. The rule prefers DRAFT and drops RETIRED. They agree on the sample only. Fix: filter `status <> 'RETIRED'`, or compare with the API value as the c312 test does.

**Not from this diff (for the record only, not a finding here):** the ⋯ menu says "Re-read with AI (fields and boxes)" (`library-forms.tsx:322`, already on main). This conflicts with C3.10 and P-63 "never box".

## D1–D20 (1–5)

| Dimension | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | The C3.12 "field map" column is in the list and the drawer. The online-version part stays parked (P-102). |
| D2 Data integrity | 5 | Read-only change. No writes, no migration. |
| D3 Reuse and normalisation | 5 | Reuses `effective` and `newestEdition`. One shared contract for API and web. |
| D4 Rule integrity | 4 | Counts are right. M1: the tip's next step is wrong for carried rows. |
| D5 Stability and recovery | 5 | Same results on reload. The browser suite passed on a fresh copy. |
| D6 Freshness and governance | 4 | Unchanged. "waits for review" shows the second-person step. |
| D7 AI trust | 5 | "AI draft · N to review" is marked, and "nothing is mapped until a person accepts them". |
| D8 Orientation | 5 | Unchanged path "Shared library › Forms". |
| D9 Flow of information | 3 | M1 points to an empty To review on 6 of 7 forms. |
| D10 Language and guidance | 4 | Plain words ("form field", "field map"). Tips on every cell at xl. m1 below xl. |
| D11 Feedback and state | 4 | Seven distinct states, with shape and text (pill or muted). |
| D12 Visual quality | 4 | Team pills and tokens. The column fits at 1440, and Title is narrower but still clamped. |
| D13 Accessibility and responsive | 4 | Keyboard, focus tip, axe 0, no sideways scroll at 1024, 200 % and 400 px. m1. |
| D14 Looks like the team's product | 4 | Same table and Tip patterns as IRCC accepts. |
| D15 Speed | 5 | 360 ms warm. Two queries for all rows. |
| D16 Testability | 4 | Pass and fail per branch, and the database compared. The tip's words are untested (M1). |
| D17 First-use intuitiveness | simulated only | — |
| D18 Information provenance | 4 | Counts come from the edition's own rows. AI proposals are kept apart from decided rows. |
| D19 End-to-end closure | 3 | The list says the state, but for carried rows its next step does not lead anywhere (M1). |
| D20 User pain solved | simulated only | — |

**Retrofit mapping:** no new model, route or table. The `field_map` field is added to the existing `GET /library/forms/list` row and the contract lives in `contracts/form-library.ts`, so it maps one-to-one onto the team's forms list DTO.

## Could not check
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* "Not mapped yet" on a real form: the sample has none, so only the unit test covers it.
* A live AI run (off, US$0).

**Verdict: Block.** To fix: **M1**. m1 and m2 are recommended, not required.
