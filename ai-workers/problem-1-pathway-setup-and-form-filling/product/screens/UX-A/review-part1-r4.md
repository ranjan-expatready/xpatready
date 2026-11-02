# UX-A part 1 re-review, round 4: the merge of main (commit 1d0440d0)

Reviewer agent (did not build it), 2 Nov 2026. The PR's product code was approved on c8599e99 (`review-part1-r3.md` and later rounds). This round reviews only what the merge changed: `git show --cc 1d0440d0`. Main had taken K13 (P-271/P-272, the Smart questionnaire names) and C11.15 (Redo with AI per stage on the Forms finder). Spec: BACKLOG row UX-A (P-273).

## How it was run
* Exact commit: the detached worktree `/home/user/rev554` at 1d0440d0, with the web already built there.
* My own isolated copy `rev_554m` on :4447, started with `isolated.sh`. That regenerated the Prisma client for main's new table.
* Two checks were re-run from scratch copies, because the committed versions save their screenshots in the repo and call psql at `/opt/homebrew`. The scratch copies used the Linux psql, saved screenshots to scratch, and changed nothing else.
* For the walk I loaded the demo with `POST /api/demo/reset {"confirm":"RESET"}`, then `POST /api/demo/load` as user-A.
* US$0: `drafting_job` has 0 LIVE rows, nothing ran on `*_LIVE`, and I pressed no Start. The Redo dialog only fetched plans, in Saved mode.

## Verdict: Approve
The three conflicts are resolved by keeping both sides, and I found no semantic conflict in the auto-merged files. No Blocker or Major is open.

## The resolved files
| File | Result | Evidence |
|---|---|---|
| `tests/check_s5_slice1_browser.cjs:53` | Correct | Uses K13's order (Overview · Forms · Smart questionnaire (SQR) · Documents · …) and strips this PR's badge words ("4 to do", "1 to fix") before comparing. The regex matches the `toDoWords`/`toFixWords` output (`contracts/counts.ts:89-90`). |
| `web/src/pages/workspace/forms.tsx:110` | Correct | `FinderPanel` gets this PR's `count`/`countFailed`/`onRetryCount`. `FindDialog` gets C11.15's `stages={lineRedo}`, and `onClose` resets `setLineRedo(false)`. `redo(codes, onLine)` (l.79) is passed as `onRedo`. The finder calls it only as `onRedo()` or `onRedo([code])` (`finder.tsx:177,217`), so Find again and Find again for a not-found form never show the stages. Only the row menu passes `true` (l.155). |
| `web/src/pages/workspace/preview.tsx:41-44, 100-101, 117` | Correct | Uses K13's three names. The SQR view says what its count is part of: "Client questionnaire · 83 of 143 questions". K13's subline is merged with this PR's "the others come from…" sentence. The Agent view note keeps both the Sample-family caveat (round 2, n1) and K13's "Smart questionnaire (SQR) tab" name. |

`combination.tsx` (auto-merged, appears in `--cc`) keeps K13's `flex-wrap` tablist (break M1) together with this PR's `tabTip` and `aria-describedby`. Live: no tab is cut off at 1440 or 400 px. The tips read "4 setup items open on Forms (Official pages, Who can be in this application, Forms)" and "1 problem to fix before release".

## Semantic conflicts in the auto-merged files
I grepped this PR's 20 code files for "Questionnaires", "is asked", "Case officer's view", "Pre-qualification" and "Case view".
* **Nothing on screen still uses an old name.** What remains is in code comments, in type and identifier names (`QuestionnairesView`, `QuestionnairesTab`), in the internal problem key `where === "Questionnaires"` (`contracts/programs.ts:220`, `engine/setup-checklist.ts:14,145`), and in test step names (`check_uxa1_counts_browser.cjs:85,94,106,125,169`).
* **The K13 names check confirms this.** Its static part reads the web's and the API's own words: 125/125, twice.
* **Tab tips** take their label from `TABS` (K13's name), and `STEP_LABEL` has no tab names. Overview, finder and `qd-draft` show no old visible word.
* **The test still guards the resolved Preview words.** `check_uxa1_counts_browser.cjs:107-108` asserts `· \d+ of <principal> questions$` on `#pv-q`. If the merge had kept K13's bare "Client questionnaire · 83", that step would fail.

## Checks I ran (exact merge commit, :4447)
* `check_uxa1_counts_browser.cjs`: 47/47, twice (exit 0).
* `check_k13_names_browser.cjs`: 125/125, twice (exit 0), on a fresh database.
  * My first run failed 3 steps and stopped with "Visitor visa has no released version yet". That was my mistake: I had loaded the demo first, so the check skipped its own `setup_visitor_visa` (it seeds only when `vv.single` is absent). This is a run-order problem, not a product fault.
* Walk script (scratch, headless Chromium), with axe on each tab at 1440 px. Results below.

## Walk (Visitor visa, With an LMIA × Overview, Forms, Smart questionnaire (SQR), Preview × 1440 and 400 px)
* **Visitor visa**
  * The summary says forms 2 · set up 0.
  * Overview tile and strip: "2 forms · 0 set up". Finder line: "On this combination: 2 forms · 0 set up".
  * Tabs: "Forms 4 to do", "Documents 1 to do", "Review and release 1 to fix". The SQR tab shows the "No questions yet" empty state, and Preview shows "Nothing to preview yet".
* **With an LMIA**
  * The summary says forms 8 · set up 8 · questions 377. Finder: "On this combination: 8 forms". Overview: "22 documents · 377 questions".
  * SQR chips: 143 + 110 + 109 + 15 = 377.
  * Preview: principal chip "143 questions". Views: "Prospect questionnaire (PQR) · 0", "Client questionnaire · 83 of 143 questions", "Agent view · 143". At 400 px the switch shows the same three.
* **Every page:** 0 axe violations (WCAG 2.2 A/AA), no sideways scroll at either width, 1.1–1.7 s per view (network idle plus a 0.4 s wait). Keyboard: Tab reaches all seven tabs in order; each tab's name is its visible text ("Forms 2 to do").
* **Forms finder, Redo per stage, with this PR's count**
  * On LMIA, a row's ⋯ → "Redo with AI (find, read, match)" opens "Redo with AI: IMM 1295" with Find / Read / Match. Match is chosen by default.
  * Choosing a stage re-plans (`POST …/forms/IMM%201295/redo {"stage":"find","mode":"replay"}`), and the plan is shown.
  * Behind the dialog the finder line still reads "On this combination: 8 forms".
  * Escape closes the dialog, and focus returns to "Actions for IMM 1295".
  * Visitor visa's lines are not set up yet, so they have no ⋯ menu. That is unchanged.
  * Match on IMM 5409 answers 409 "No page from an earlier find…: choose Find", with Start disabled. That is C11.15's designed refusal, and its "Failed to load resource" line was the only console error in the walk.

## Blockers and Majors
None.

## Minors (list in the PR; none blocks)
* **n6, one count with two labels in the Preview's view row.** "Client questionnaire · 83 of 143 questions" sits beside "Agent view · 143" (`preview.tsx:41-44`). The same 143 is a bare number in one place and "143 questions" in the next, both in the 400 px switch and in the 1440 headings. This came before the merge (round 3's "Case officer's view (143)" was bare too), and K13 kept it bare. Fix: `Agent view · ${questionsWords(...)}`, and the PQR view "· N questions", with the K13 and UX-A checks updated.
* **n7, old tab name in non-visible text.** The step names in `check_uxa1_counts_browser.cjs` and the comments in `contracts/counts.ts`, `engine/runtime/question-count.ts`, `overview.tsx:40` and `forms.tsx:102` still say "Questionnaires chips/tab". No user sees them, but test output reads as if the tab were still called that. Fix: rename them to "Smart questionnaire (SQR)" the next time those files are touched.
* **Carried, unchanged:**
  * The SQR subline is now two clauses, about 35 words (D10).
  * The Preview's "asked" (83, in a Sample family) differs from the SQR tab's "Client 86", which uses the largest household. The note explains why (round 2, n1).
* **Out of this row (C11.15, for the forms lane):** when a Redo plan answers 409, the dialog's Live line reads "Two AI rounds … The cost is shown below" instead of "AI now is switched off on this copy". I saw it at 400 px on IMM 5409 Match. Cosmetic: Start is disabled.

## Journey score (reviewer, this round): 9.5 / 10, pass
Journeys: (1) the author reads the Visitor visa counts; (2) compares the LMIA question totals across Overview, SQR and Preview; (3) redoes one form with AI per stage, plan only; (4) error: Redo Match with no earlier find; (5) keyboard through the tabs.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every count agrees across the screens, and Redo opens with its stages. |
| Next step obvious | 1 | The badges say "to do" or "to fix"; Redo's refusal says "choose Find". |
| Plain words | ½ | n6: "Agent view · 143" is a bare number; the SQR subline is long. |
| Feedback and state | 1 | The finder count stays visible behind the dialog; Retry is still wired (`finder.tsx:172`). |
| Correct data | 1 | The summary's 377 = the chips' sum; 8 forms = the finder line. |
| Error recovery | 1 | The 409 shows in words, Start is disabled, and Escape returns focus. |
| Accessibility and screen sizes | 1 | axe clean on 8 views; 400 px with no sideways scroll; tab names = visible text. |
| Speed | 1 | 1.1–1.7 s to network idle plus the 0.4 s wait. |
| Visual quality | 1 | Tabs wrap at 400 px with no badge cut off (screenshots in scratch). |
| Trust and sources | 1 | Sample labels kept; Saved / US$0 mode is the default in Redo. |

## D1–D20 (only those the merge touches)
* D1 5: both sides' behaviour is kept, K13 names and UX-A counts.
* D3 5: one count function per number, unchanged by the merge.
* D9 5: Redo per stage is reachable from the row.
* D10 4: n6, the long subline.
* D11 5: count and Retry kept.
* D13 5: axe, 400 px, keyboard.
* D15 5.
* D16 5: the resolved Preview words are asserted (`check_uxa1_counts_browser.cjs:108`).
* D17 and D20 are not scored: simulated only.

## Not checked
* A real screen reader, 200 % zoom (K13's check covers tabs at 720 px), touch, and an intended user's unaided walk.
* `graph.mjs`, because it rewrites committed `qa/` files. The merge adds no route of this PR's.
* The other suites the builder reports (`check_s5_slice1/2_browser`, `check_preview_sets_browser`, `check_x1_tabs_focus_browser`, `check_qa78_words_browser`, `check_uxa1_counts_rules`): not re-run by me, so CI decides.
* A visible (headed) browser: the walk was headless.

**Verdict: Approve** on 1d0440d0. No Blocker or Major is open. n6 and n7 are Minors to list in the PR.
