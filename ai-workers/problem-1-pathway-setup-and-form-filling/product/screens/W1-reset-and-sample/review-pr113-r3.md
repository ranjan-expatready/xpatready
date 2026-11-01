# Review r3: PR #113 (runtime lane) at f8849fb4

Independent reviewer, 1 Nov, fresh context. Last Approve: r2 at 3b36569f. Since then: main merged in twice (ebb18ce5, b460a48a with its parents) and one test fix (f8849fb4).
Cost: US$0. No `*_LIVE` switch was set by hand. The only pairing used was `STUDIO_AI_LIVE=approved` with `STUDIO_FAKE_LAUNCHER`, copied from the QA-91 and S5 checks' own usage lines (P-192). No priced button was pressed. Isolated copies used prefix `rv3_` on ports 4430–4438; :4400 was not touched. The builds were fresh (Prisma client and web dist at 07:09, after the last source change at 07:08).

## Verdict: Ship (**Verdict: Approve**). No open Blocker or Major.

## What changed since the approval
* **The PR's own diff is unchanged apart from two test files.** I diffed the PR diff against its base before (5035c056..3b36569f) and after (143a2301..f8849fb4), ignoring index and hunk lines. Only two places differ:
  * `check_qa91_who_can_be_run_browser.cjs`: it now opens `/c/<vv>/forms` instead of `/questionnaires`.
  * `check_w115_slice2_browser.cjs`: the conflict resolution described below.
  * Every product file is byte-identical to the approved commit: `render.ts`, `people-ai.ts`, `demo.ts`, `sources.ts`, `review-queue.ts`, `runs.ts` and the web pages. Everything else in `git diff 3b36569f HEAD -- '*.ts' '*.tsx' '*.cjs'` is main's own work (X5 library, C1.8 copies, slice C1 Before forms).
* **The w115 conflict resolution is sound.** After the Undo click, the check waits up to 30 s for `[data-row-status="rules"]`, then settles. The step that follows still asserts the row went back to the rules ("Document" plus the rules status), so a row that never goes back still fails. This is stricter than main's version (settle, then a 10 s wait), not looser.
* **The qa91 fix is correct.** `before-forms.tsx:39` renders `WhoCanBe`, and `workspace.ts:29` now serves `people` on the Forms tab. If the card were missing on /forms, the "Show and edit" click would throw, so the check still fails.

## The PR's features on top of main
* **C3.11 signed scans** (`engine/render.ts:191-215`). Main's `copies` (C1.8) never reaches `render.ts`, so the two do not interact.
  * On this head: `check_c3_11_signed_scan` 30/30 and `check_c3_11_browser` 21/21.
  * On the merge with the current main (c582e8d8, which merges cleanly, tree 53fa5480): `check_c3_11_signed_scan` 30/30 and `check_engine` 41/41.
  * Main's new `check_c18_age_case` passes 12/12 on that merge. It counts the questions asked on wp.family IMM 1295 through the same `caseView`, and the PR's signed-scan block adds no extra one.
* **M1, the gate** (`people-ai.ts:38-39`), is unchanged.
  * `check_qa91_who_can_be_run` 21/0. `check_qa91_who_can_be_run_browser` 10/0, run twice. `check_s5_leadcheck` 49/0 and its browser check 21/0. `check_s5_live_approval_browser` 5/0.
  * My walk on a copy with no switch (:4436), on the moved card: AI now is greyed, labelled "AI now (not approved yet)" with the P-110 reason. `POST …/people/propose/plan {mode:"live"}` returns 409 "AI now is not approved yet", and the rules plan carries `live.approved:false`.
* **C10.1 and S7** (`demo.ts`):
  * Checks: `check_c10_1_configured` 20/0, `check_c10_1_browser` 12/0, `check_s7_load` 19/0, `check_s7_reset` 4/0, `check_s7_dialogs_browser` 12/0.
  * Main's schema changes add only columns: `gov_form_def` index columns, `form_edition.index_date_seen_current`, `combination_form.copies` (default 1). Reset deletes the workspace row (`demo.ts:398-401`), so it needs no new table list. The checkpoint goes through the services, so it picks up the new columns by itself.
  * `check_c18_copies` 28/28 and its browser check 13/13 pass on this branch.
* **The queue transaction**: `check_queue_tx` 8/0.
* **w115**: `check_w115_slice2_browser` 55/0, and it is the conflicted file.
* **Total**: all 17 named checks were rerun on f8849fb4 with no failure, plus 3 checks on the merge with main.

## Issues
| # | Sev | Where | Note |
|---|---|---|---|
| — | — | — | No new finding. m6 (two copies of the "who signs" rule, `render.ts:196-201` vs `sources.ts:246-251`) and m7 (no server-level check that a copy with only the fake launcher refuses AI now) stay open as Should-fix follow-ups from r2. m1–m5 from r1 are unchanged. None got worse: the files involved are byte-identical. |

Not a finding (outside this PR): Questionnaires' moved line says "Applicant, Spouse or partner (travelling), Child (travelling)", while the card on Forms says "Principal applicant (always) · Spouse or partner (optional) · Child, 0–4 (optional)". The two use different words for the same people. This is main's slice C1, so it is for the screens lane. The r1c speed budget was accepted by the caller and is not counted.

## Journey score (reviewer role; QUALITY.md "Journey score")
Journeys:
1. Author: the old Questionnaires link → "Change on Forms" → Before forms.
2. Author: Show and edit → Fill from the guide → Rules only → proposal → Escape. Nothing is saved.
3. Author on a copy with no switch: AI now is greyed; the live plan by URL returns 409.
4. Author on a paired fake copy: AI now → run card → proposal (qa91 browser, twice).
5. Signed scan in Preview by person (c3_11 browser).
6. Load sample / Reset dialogs (s7_dialogs).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The people card is reachable on Forms (link from Questionnaires lands on `/forms`). Fill, Run and Load all complete. |
| Next step obvious | 1 | Before forms marks each step (● Next, ○ To do). The greyed AI now says what it waits for. |
| Plain words | 1 | "Nothing is saved until you accept and save. Sample until the immigration expert confirms." |
| Feedback and state | 1 | Run card with "Step 2 of 4" and Stop (qa91 browser). The rules plan shows its steps and US$0. |
| Correct data | 1 | `combination.participants` unchanged after Fill (SQL). The signed-scan line is never stored (c3_11). |
| Error recovery | 1 | 409 in words when AI now is not approved. Escape closes the dialog. Undo restores the rules (w115). |
| Accessibility and sizes | 1 | Axe 0 on Forms, the Fill dialog and the proposal. No sideways scroll at 1024 or 400 px. Show and edit reached by Tab (28 presses). Focus moves into the dialog. |
| Speed | 1 | Forms tab 349 ms. Rules Fill 277 ms. |
| Visual quality | 1 | Team components. The card nests cleanly in Before forms at 1024 px (screenshot `rv3walk/forms-1024.png`). |
| Trust and sources | 1 | The "Rules" pill, IRCC's quoted sentence, "Sample" labels, and the cost before Fill. |
| **Total** | **10 / 10** | Pass. |

## D1–D20
Not scored one by one: this is a multi-item lane PR with no single concept.md (same as r1 and r2). D17 and D20 are simulated only.

## What I could not check
* A real screen reader. An intended user's unaided walk.
* The merge with current main: browser checks were not run on it (no web build in the exported tree), only the API and engine checks above.
* `graph.mjs`: it rewrites the tracked `qa/graph.json`.

**Verdict: Approve** (commit f8849fb4). Should-fix follow-ups: m6 and m7, plus m1–m5 from r1.
