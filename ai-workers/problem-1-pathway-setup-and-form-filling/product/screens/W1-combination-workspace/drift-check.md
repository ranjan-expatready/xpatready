# S5 Combination workspace: drift check before the founder's slice 2 early look

Checker: a fresh, independent session with no lane context, 27 Oct 2026 (UTC 18:15 to 18:45). Branch `origin/runtime/2026-10-27-s5-workspace`, head f0166e5 (handover), work commit 8346a37. Compared with `origin/main` 8cfc043. Nothing on the lane branch was changed; :4400 was not touched; no AI call (US$0).

## Verdict: Ready for the founder's early look

What was claimed is in the code and passes its own checks again on a clean copy. No decision is broken and no superseded decision is cited. The open points are about what the founder will see: a few codes and raw text still on screen, a confusing count on a combination that has no forms set up, duplicate section names in Preview, and two parts (Review "AI picks", Start setup opening the workspace) that cannot be shown yet. Say so when you show the founder, and fix the quick ones in the next runtime session.

## Findings

| # | Severity | What | Evidence | Suggested fix |
|---|---|---|---|---|
| 1 | Minor (resolved) | CI on the exact commits. The founder's condition from the slice 1 early look was "CI must be green". | 8346a37: `suites` **cancelled** at 18:09:40Z (run 40556863284). The next push started a new run, which cancelled this one; `guard` and `changes` passed. f0166e5: `suites` **success** at 18:27:48Z (run 40557098351), 41 suites PASS, 0 FAIL, demo journey 46/46, `check_w1_programs_s2.cjs` 87 passed. Between the two commits the app code differs only by main's qa test files. | None. f0166e5 is green and covers 8346a37's code. Merge from f0166e5 or later. |
| 2 | Should | The Review and release tab still shows field codes. The new coverage-gap error carries the field code as its item, and the Review problem list prints the item in code font, for example "Questionnaires · case.service_language: …". This goes against fix 3 (no field codes on the main path), on the tab the second person reads. | `engine/validate.ts` (coverage loop) pushes `item: g.fact`; `web/src/pages/review.tsx:55` renders `<span className="mono">{p.item}</span>`. In screenshot `slice2/06-…`, the Review tab shows a red "1". | Show the question's meaning (or nothing) instead of `item` when `where` is Questionnaires, and add a check that the Review list has no field code. |
| 3 | Should | "Review lists AI-picked forms" is claimed but cannot be seen. Only AI-proposed or AI-found lines show, the sample has none, the only test checks that nothing shows, and there is no Review screenshot. The second half of the challenge's m7 (the "Who can be" list filled by AI) waits for slice 3. | `review.tsx` adds the notice only when `origin` is `AI_PROPOSAL`/`AI_FOUND`. `tests/check_s5_slice2.ts:93` checks "none on the sample". `screenshots/slice2/` has no Review state. | Tell the founder that this shows from slice 3. Add a positive test (a seeded AI-proposed line shows with IRCC's words) and a screenshot then. |
| 4 | Should | Preview's jump list repeats section names: "6. Residence and immigration status · 1" and "7. Residence and immigration status · 5", then "8. Spouse or partner relationship · 6" and "9. Spouse or partner relationship · 2". Questionnaires shows each of these once. The person cannot tell which is which. | `screenshots/slice2/07-preview-one-section-1440.png` (committed). Sections are split by subject in `web/src/runtime/questionnaire.tsx` (`PreviewQuestions`, about l. 650–670). | Add whom each section is about ("… about the spouse"), or merge sections that share a title. |
| 5 | Should | A combination with forms attached but not set up gives mixed signals. The line says "Filing: No forms yet · 0 forms" above two form rows, and the next step says "Add 1 form from the library" although two forms are attached. | `screenshots/slice2/03-forms-attached-not-set-up-1440.png`. `engine/channels.ts:23,46` ("No forms yet"). `web/src/pages/workspace/forms.tsx:63` counts only `lines`. | Count attached forms too ("2 forms attached, not set up yet"), and make the next step name the real action (Draft with AI). |
| 6 | Should | The "Why it is here (IRCC's words)" column shows raw data text, for example `IMM 5475), if applicableNote: Complete this form o…` and the same on IMM 5476. Fix 2 asked for plain words. | `screenshots/slice2/01-forms-listed-once-1440.png`, IMM 5475 and IMM 5476 rows. The text is in the stored quotes, not in sample JSON (`grep applicableNote samples api engine` finds nothing). | Remove the `applicableNote:` label when the quote is shown, or fix the stored quote. Add a check for camelCase keys in quotes. |
| 7 | Should | P-125 is not traced in the build notes, and the early look cannot show it. Start setup still opens the old New combination page (`/new?leaf=…`). P-125 (3) says it opens this workspace with the place read-only. The workspace itself does show the place read-only: the path in the header is links only, with no edit. | `web/src/pages/structure.tsx:243`, `programs.tsx:147`, `new-combination.tsx:48`. `web/src/pages/combination.tsx:61–68` (path read-only). `build-notes.md` and `challenge.md` cite no P-125. | Not this lane's file (Start setup and the New combination page belong to S3, screens lane). Tell the founder that the way in from Start setup comes with S3, and add a P-125 line to `build-notes.md`. |
| 8 | Should | "Remove from this combination" happens on one click, with no confirmation and no Undo. P-116 asks for confirmation and Undo while the draft change is open. The founder already saw this in slice 1, and the build notes defer it to slice 3. | `web/src/pages/workspace/forms.tsx:142–150` (`remove` sends PATCH retire straight away). `build-notes.md`, "Deviations" (stays until the forms lane's DELETE lands). | Add a confirm step that names the form now, and Undo with slice 3. |
| 9 | Should | Merge risk with the forms lane. S4 (`origin/forms/2026-10-27-s4-form-library`, 33 ahead of main) and this branch both change `api/src/main.ts`, `api/src/studio.ts` and `prisma/schema.prisma`, and a trial merge of the two branches conflicts. This branch on its own merges into main cleanly. The screens visual-system branch shares two test files and merges cleanly. | `git merge-tree --write-tree origin/main <runtime>` gives a clean merge. Runtime against forms conflicts in `main.ts`, `studio.ts` and `schema.prisma` (plus files the forms branch alone changed since an older base). | Merge S4 first, as already planned (slice 3 waits on it). Then sync this branch and rerun `run-suites.sh`, paying attention to the migration order (`20261027160000_s5_person_roles`). |
| 10 | Minor | Files outside the item: older tests that belong to other lanes were edited (`check_forms_demo.ts`, `check_forms_f1p.ts`, `check_forms_w102_fix.ts`, `check_screen01_browser.cjs`, `check_screen01_smallfix.cjs`, `check_screen02_fix.ts`, `check_screen02_slice1.cjs`, `check_screen02_slice2.ts`, `check_studio_browser.cjs`). The build notes explain why: the checks moved to the new tabs, and the coverage gate now asks the needed answers. No Lead file, rule, skill, decision or other lane's file was touched. `lanes/runtime.md` changed only below the Lead's note. No logs, databases, PDFs or `var/` files were committed. | `git diff origin/main...<runtime> --name-only`. The only paths outside `screens/W1-combination-workspace/` and studio code are `lanes/runtime.md` and the tests listed here. | When merging, tell the forms and screens lanes that these checks moved, so their next sync does not undo it. |
| 11 | Minor | Internal codes on screen: the Review step card reads "Configuration author (only the author submits, D-2)". | `web/src/pages/review.tsx`, StepCard 1. | Remove ", D-2". |
| 12 | Minor | Two screenshots are not fit to show the founder as they are. `07-preview-one-section-1440.png` has the top bar and side menu painted halfway down the page (a full-page capture with fixed parts). `05-question-details-1440.png` is 10,763 px tall with every section open, so the side panel is a speck. | Committed files in `screenshots/slice2/`, read from the branch. | Take viewport-sized captures for the early look, with the panel in view and Preview without the fixed bars repeated. |
| 13 | Minor | The documents column of Preview is still long (21 documents, page about 2,700 px). The founder's fix 4 was about the phone column, which is now short. | `07-preview-one-section-1440.png`. | Optional: fold the documents under "Cannot tell yet" or show the first 8. |
| 14 | Minor | The item folder has no `concept.md` and no `lead-check.md`. The founder's words for S5 are walkthrough v2 §S5 (marked OK), the Lead's 23:05 note in the lane file and `concept-draft.md`. | `ls screens/W1-combination-workspace/` on main: `concept-draft.md`, `design/` only. | None needed for the early look. The Lead may want to point `concept.md` at the walkthrough. |

## 1. Decisions it must follow

* P-116, P-120, P-121, P-122, P-123, P-124, P-125, P-126 and P-127 were read in full in `DECISIONS.md` (lines 6–17). None is struck through, because `DECISIONS.md` has no struck-through text (`grep -c '~~'` gives 0), so no superseded decision is cited as live. The S5 notes cite P-104, P-107, P-108, P-110, P-113, P-116, P-118, P-119, P-120, P-121, P-122, P-123, P-33, P-78, P-80 and P-86. They cite P-118 only for Q2 and Q3 (no upload on the tab), which are still valid.
* **P-123:**
  * "Who can be in this application" is editable at the top of Questionnaires, with rules on Save, a version guard and Undo (slice 1, `engine/people.ts`, `studio.ts savePeople/undoPeople`). Screenshot `04` shows it.
  * Forms are not yet picked by AI per combination. The finder rows, "Picked by AI · Sample", Redo, Replace, Remove, Undo and the AI fill of "Who can be" are slice 3, which waits for forms S4 slices 1 and 2. That is agreed in `challenge.md` (slice plan 3) and in the Lead note.
  * "Sample until the immigration expert confirms" shows on the Forms tab and on "Who can be".
* **P-125:** the place is read-only in the workspace. Start setup opening the workspace is not built yet (finding 7).
* **P-126:** no slice 3 code on the branch (`git log` shows only fixes, slice 2 and the handover).
* **P-121 and P-120:** not touched by this slice. No AI path is added (US$0).

## 2. Handover and slice notes against the code

| Claim | Found | Where |
|---|---|---|
| Fix 1: forms listed once | Yes. One row per form, with reading status and last step in the row and the steps in the drawer. Attached but not set up is its own row. Checklists, guides and pages are one "Sources" line. | `web/src/pages/workspace/forms.tsx` (uses `pendingForms`, `ReadingCell`, `SourcesLine` from `pages/sources.tsx`). Screenshots `01`, `02`, `03`. |
| Fix 2: warnings in plain words | Yes. Example from the first readable caption, cut at 60 characters, none when empty. A submit refusal names gaps in words. | `engine/channels.ts:74–85` (`listRowsWords`). `engine/validate.ts` coverage message. Screenshot `01`, bottom. |
| Fix 3: questions, not field codes | Yes on Questionnaires: wording, who fills it, only if, needed by. "System name" appears only in the side panel. **Not on Review** (finding 2). | `web/src/pages/workspace/questionnaires.tsx:181` (gaps by meaning), `:223` (System name in the panel). Screenshots `04`, `06`. |
| Fix 4: Preview one section | Yes. One section with a numbered jump list, Previous and Next section, and the three columns kept. | `web/src/runtime/questionnaire.tsx` `PreviewQuestions` (about l. 650). Screenshot `07`. See finding 4. |
| Slice 2: Questionnaires per person with coverage | Yes. Person chips with counts and "N not asked", a coverage line, a danger notice, a release error per gap. 0 gaps on the sample. | `engine/coverage.ts`, `engine/validate.ts`, `engine/runtime/questionnaires.ts`, `api/src/workspace.ts`. Screenshot `06`. |
| Slice 2: Documents kept | Yes, on purpose. The tab is still today's `ConfigArea` (documents), and the Lead's main note agrees. | `web/src/pages/combination.tsx`, `tab === "documents"`. |
| Slice 2: Review shows AI picks | The code is there. It cannot be shown on the sample (finding 3). | `web/src/pages/review.tsx`, notice `data-ai-picked`. |
| m8: reads need a configuration person | Yes. `readerOf` is on the workspace read and on `GET /library/roles`. | `api/src/workspace.ts`. |

**Checks rerun on a clean copy of f0166e5.** Free disk was 8.7 GB, so the reruns went ahead. The worktree was in the scratchpad, with each test on its own isolated database on ports 4424–4427, and the web app was built from the branch:

| Check | Result |
|---|---|
| `check_s5_slice1.ts` (4424) | 51/51 passed |
| `check_s5_slice1_browser.cjs` (4425) | 52/52 passed (notes say 51/51: one step added since) |
| `check_s5_slice2.ts` (4426) | 21/21 passed |
| `check_s5_slice2_browser.cjs` (4427) | 33/33 passed |

The full `run-suites.sh` and the demo journey were not rerun here. They use the runtime lane's ports and :4400, which were outside this check's port range, so CI is the full-suite answer (finding 1). The worktree, its package copy, the four test databases and the scratch logs were removed afterwards. The lane branch and the main copy are unchanged.

## 3. Diff scope

`git diff origin/main...origin/runtime/2026-10-27-s5-workspace --stat` covers 86 files, +2,449 / −456:

* `lanes/runtime.md` (below the Lead's note only), plus `build-notes.md`, `challenge.md` and 28 slice 1 and slice 2 screenshots in `screens/W1-combination-workspace/`.
* Studio code: api, engine, contracts, web, one migration, `samples/person-roles.json`.
* S5 tests, and 9 edited older tests (finding 10).

There are no by-products and no Lead files. Main is ahead only by Lead commits that change `LEAD.md` and `STATE.md`, so a trial merge with main is clean. The overlap with the forms branch is finding 9.

## 4. CI on the exact commits

`gh api repos/{owner}/{repo}/commits/<sha>/check-runs`:

| Commit | guard | changes | checks | suites |
|---|---|---|---|---|
| 8346a37 (work) | success | success | skipped | **cancelled** at 18:09:40Z, because the next push started a new run |
| f0166e5 (handover) | success | success | skipped | **success** at 18:27:48Z: 41 PASS, 0 FAIL, including `check_studio_browser.cjs` 46/46, `check_w1_programs_s2.cjs` 87 passed, `check_screen01_browser.cjs` 128 passed (first view 150 ms), R1c 120/120, R1d 63/63, R1a 99/99 |

The timing checks the handover called load-sensitive all pass on the runner. Between 8346a37 and f0166e5 the only app change is main's `tests/qa/` files (`git diff --stat 8346a37 f0166e5 -- prototype`), so the green run covers the slice 2 code. The founder's "CI must be green" condition is met.

## 5. Against the founder's words

* **Slice 1 early-look outcome** (STATE.md 27 Oct, "S5 slice 1 early look (runtime 68adc3b): founder Go for slice 2 with four fixes", and the Lead note of 23:05 in the lane file): all four fixes are visible in the committed screenshots, with the gaps listed in findings 2, 4 and 6.
* **Walkthrough v2 §S5** (marked "S5: OK"):
  * Tabs follow the setup order Overview · Forms · Questionnaires · Documents · Preview · Review and release.
  * "Who can be" is at the top of Questionnaires, and Overview only reports.
  * Preview has a sample family, person chips and three columns.
  * Not there yet, all agreed for slice 3: the four-stage AI strip, "AI picked 6 forms and 1 checklist …", the ⋯ actions (Redo, Replace, Remove, Undo), "Not found → Upload PDF / Find again", and IRCC's words in "Who can be" (today it shows "—" and "As set when the combination was created").
* **What to tell the founder up front:** this early look shows the workspace on forms that were already set up. Forms picked by AI and the way in from Start setup come with slice 3 and S3.
