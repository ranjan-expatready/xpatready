# Review: C6.5 part 2c, staff corrections counted per review mode (PR #1375)

Reviewer: fresh; I did not build it. Commit reviewed: **`c774e63b6b17c6b2809accb5649d9efc22aab59b`**. Scope: 2c's own change only, `git diff origin/claude/runtime-c65-drawer...c774e63b6` (`93b21f772`; the merge brings 2b in). It is API only: no screen, no migration. Rules read: P-243, rows.md §C6.5 ("Done when", Q1), `case-documents.ts` (2a), the drawer's "Correct it" / "Answer it" (2b). Journey test: `journey-test-reviewer-2c-2026-11-08.md`, **7.5/10, Fail** (one 0 on correct data).

## Re-run on my own copy (`rv_c65c`, :4434; US$0, live AI off)
* Fixture: `setup_visitor_visa.ts` 15/15, `setup_vv_m3.ts` 44/46 (unchanged by this PR). `C6.5-counts.test.ts` **7/7**; `--engine` **3/3**. The builder's 7/7 is confirmed.
* Gate B picks the pack up: `runPlan("C6.5-counts.test.ts")` gives both setups and then the pack.
* `graph.mjs --check` exit 0; `git status` clean afterwards.
* Probes in the scratchpad, not committed: journeys 1 to 10 of the journey report.

## What holds
* **Rule shape (P-243, rows.md Q1):** a staff answer is the channel `agent_view`. All staff typing uses it (`runtime.ts:438`); `confirm_section`, `document_read`, `checked_against_document` and `client_reconfirm` never count. It must be saved after the read (`readAt`) and differ by `sameValue`, the same comparison Confirm & use uses. A check resolved with `kept: "answer"` also counts. The client's change, an equal answer and a staff answer before the read are not counted (C6.5-21e fail, -22 fail).
* **No double count:** each read value counts at most once, by its first correction (`:36`). Staff answer + kept answer + a second staff answer on one value counted 1 (probe C). The rate is ≤ 1.
* **A replaced file's check closed by a newer file is not counted** (probe R: 0). A renewal through the product's own path (Confirm & use the newer file, keep the document) counts 0 (probe A2).
* **Per mode:** `read` and `corrected` are per `collapsed` / `expanded` (C6.5-21: 3 collapsed, 5 expanded on a Sample passport).
* **Permissions:** `reach(…, "officer")` limits it to staff of the case's firm. Results: client 403, another client 403, author 403, the solo firm's staff 404, no actor 401, a malformed or unknown id 404.
* **Read only:** only `findMany`. Row counts of `audit_event`, `read_value`, `answer_check` and `client_canonical_answer` were identical before and after (527/88/7/78).
* **Speed:** 3 queries, none per row; about 20 ms per GET.

## D1–D20 (1–5)
D1 Requirement fit **2**: per mode and readable as asked, but the figure is wrong on the main path (M1) · D2 Data integrity 3: stores nothing; the reported data is wrong (M1, m1) · D3 Reuse 5: `sameValue`, `OFFICER_ENTRY`, `reach`, `features/` · D4 Rule integrity 3: M1 counts values the reader never claimed (a country code) · D5 Stability 5: read only, idempotent · D6 Governance 4: each correction names who, when, how and the document · D7 AI trust N/A (MRZ rules; no AI in 2c) · D8 Orientation N/A · D9 Flow N/A (no screen) · D10 Language 4: `rule` text in plain words · D11 Feedback 4: problem responses with the server's words · D12 Visual N/A · D13 Accessibility N/A · D14 Team look N/A · D15 Speed 5: about 20 ms · D16 Testability 3: m2 · D17 simulated only · D18 Provenance 4: document per correction; the rule is returned with the counts · D19 Closure 3: with M1 the rate cannot be handed to the team yet · D20 simulated only.

## BIC (EXPERIENCE.md §6)
| Check | Score | Evidence |
|---|---|---|
| BIC-01 to BIC-20 | N/A | 2c adds no case-side screen: it is an API for the team's error rate. BIC-05/-06 as scored for 2a and 2b are unchanged |

## Issues, ranked
1. **M1, Major, Must: values the drawer tells staff to answer by hand are counted as reader errors, on every passport.** Steps: read a Sample passport, Confirm & use, then answer the two values left for a person exactly as the drawer asks (citizenship and country of issue; `case-documents.ts:169`, "The coded line gives only the country code "IND": choose the country by hand"), choosing India. Result: **expanded 2 corrected of 5, rate 0.4**, with no reader error. "India" ≠ "IND" passes the test at `document-review-counts.ts:34`. On the Visitor visa main path P-243's expanded rate therefore starts at 0.4 or more for every person, and the number handed to the team (impact report D1) is wrong. The pack misses it because C6.5-22 never answers those two facts. **Fix:** drop read values that `notWritable(snapshot, fact, value)` refuses (left for a person) from both `read` and `corrected`, or report them apart. Add a pass step and a fail step: answering citizenship "India" after a read of "IND" is not a correction, and a different given name still is.
2. **m1, Minor, Should: a renewal typed by hand counts against the replaced file.** File 1 is read and confirmed. File 2 (new number) is read, and the officer types its number by hand. Result: **collapsed 1/6, a `staff_answer` against file 1** (probe A), though neither reader erred. Q1's words ("any later staff change to a value that came from a document") allow it. But it contradicts the PR's own reasoning for excluding replaced-file checks ("the system's, not a person's judgement"). **Fix:** for a read of a file that is no longer current, count only staff answers saved before its `supersededAt`. Or ask the tech lead with the Q1 confirmation.
3. **m2, Minor, Should: two rules have no test.** If the `REPLACED` filter (`:59`) or `kept: "answer"` (`:55`) is removed, no step fails: the pack never replaces a file and never resolves a check. `-22e` has a pass step for keeping the answer but no fail step. **Fix:** add server steps for probe R (a newer file closes the old check: 0) and for a check resolved keeping the document (0).
4. **m3, Minor, Should: 25 unrelated screenshots in the commit.** `93b21f772` rewrites 23 PNGs under `screens/R1-thin-slice/screenshots/r1c/` and 2 under `screens/QA-165/screenshots/`. They are output of `tests/runtime/check_runtime_r1c.cjs`; for example `11-case-view-confirmed-1440.png` goes from 1440×3044 to 1440×13435. That overwrites other items' recorded evidence, and the PR body says "Files (new only)… No shared file changed." **Fix:** restore them from the base.
5. **m4, Minor, note:** `graph.json` lists `GET /runtime/cases/:id/document-reviews/counts` with `testedBy: []`. `graph.mjs` scans `tests/` only, not `acceptance/`, and the route is tested by `C6.5-counts.test.ts`. No change is needed in this PR.

**Question for the tech lead (not a finding):** counting a check "resolved by keeping the answer" goes beyond Q1's literal text (an edit before Confirm & use, or a later staff change). It is a fair reading of "staff correct", since it is a person's judgement that the read is wrong. The PR asks for confirmation; it should be decided together with m1.

## Could not check
I did not run the configured checkpoint ("the six"); only the fixture. There is no screen, so the browser, axe and keyboard checks do not apply. D17/D20 stay with the founder. The tech lead's answer to Q1 is pending.

**Verdict: Block** `c774e63b6b17c6b2809accb5649d9efc22aab59b`. To fix: **M1** (Major), with its pass and fail steps. m1 to m4 are Should and do not block on their own; m3 is a quick restore.

Verdict: Block c774e63b6b17c6b2809accb5649d9efc22aab59b

## Re-review on 3448cdeec
Diff only: `git diff c774e63b6..3448cdeec` (`document-review-counts.ts`, `C6.5-counts.test.ts`, the 25 PNGs, and my two files committed). Re-run on my copy `rv_c65c`, :4434, with the fixture (setups 15/15, 44/46 as before). Copy stopped afterwards; US$0.
* **Pack C6.5-counts 12/12** (engine 7/7). The builder's figure is confirmed.
* **M1, fixed.** Values `notWritable` refuses are neither `read` nor `corrected`; they are counted apart in `by_mode.<mode>.left`. This is the same function Confirm & use and `left_why` use, so it agrees with what the drawer shows. Re-run of my main-path probe L (answer citizenship and country of issue by hand): **expanded 0 corrected of 3, left 2**, where it was 2 of 5. Tests: engine C6.5-21e fail; server C6.5-22 fail (citizenship "India" is not a correction and `left` ≥ 1). C6.5-21 now ties `read`/`left` to the proposals' `left_why`. Each test fails if the rule is removed.
* **m1, fixed.** A replaced file's read counts only staff answers saved before `case_document.superseded_at`. Probe A (renewal typed by hand) now gives **0**, where it was 1 collapsed. Engine C6.5-22e has a pass (an answer before the replacement still counts) and a fail.
* **m2, fixed for the replaced-check rule.** The `REPLACED` filter moved into `countCorrections` (`kept[].reason`). Engine C6.5-22e fail covers it, and probe R still gives 0. The `kept: "answer"` query filter (`:65`) still has no step: no step resolves a check keeping the document. That stays Minor (Should), because the filter is one literal next to the rule it serves.
* **m3, fixed.** `git diff --name-only origin/claude/runtime-c65-drawer...3448cdeec | grep screenshots` is empty.
* **Unchanged and still holding** (probes C, D, E): one value counts once (staff answer + kept + second answer = 1); row counts identical before and after the GETs; client 403, author 403, another firm 404, no actor 401, bad or unknown id 404. There is one more query input (the document's `supersededAt`, through the include) and still no per-row request.
* **Still for the tech lead, not findings:** the rule text and "kept the answer" (Q1). Denominators now exclude left values; they still include a replaced file's reads, which is fair as separate reads.
* **Journey score on 3448cdeec:** correct data 0 → 1 and task completed ½ → 1. **7/8 applicable = 8.75/10, Pass**, with no 0.

No open Blocker or Major. Open Minor: the `kept: "answer"` filter has no step (Should).

Verdict: Approve 3448cdeec6eb312a00f572d3e18d7fc49bb7b5c7
