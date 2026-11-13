# QA-446 review: one confirmation rule on the Agent view, Confirm section and the representative's checklist (P-510 (2))

Independent reviewer: skill screen-review, plus journey-test in the reviewer role. Fresh context; I did not build this. 13 Nov 2026.
**Commit reviewed:** `4f428aa518b81f19290ccc7e378f5eb9dd05b1d6` (branch `claude/pensive-lamport-7pwwa3`; no PR yet).
**Journey test:** reported in this file. The caller asked for review.md only, so there is no separate report. **8.5/10, pass.**

## Verdict
1 Major (Must), 3 Minor (Should). **Verdict: Block** (in skill terms: Ship after fixes). Fix Major 1 with a fail test; fix the Minors or list them in the PR.

## What I re-ran
Own isolated copy on :4448, stopped after each use. Live AI off, US$0.
* **`check_qa446_confirm_counts_browser.ts`: 33/33**, exit 0, the same numbers as the builder's.
  * Visitor visa: household 85 = tabs 85 = sections 85. Study permit: 84 = 84 = 84.
  * Declared answers before Confirm section = after: 165 = 165 and 188 = 188. The 0 section replied `confirmed: 0`.
* **`check_qa417_counts_browser.cjs`: 55 passed, 0 failed.** The builder reported 56/56. No failures, so I did not chase the one-step difference.
* **`check_runtime_r1a.ts`: 98/98**, including the new D1 line. This ran on a fresh copy after `setup_visitor_visa.ts`. On the copy with the configured checkpoint loaded it stops at 3/41, an environment effect.
* **Other suites:** `check_case_engine` 86/86, `check_review_rounds` 54/54, `check_b164_no_engine_keys` 52/0.
* **Types and graph:** `tsc -p web` exit 0. `tsc -p api`: no error in a changed file (the 15 are in untouched tests). `graph.mjs`: G1, G2, G4 and G5 are 0.
* **My own work:** two probes and a Playwright walk, from the scratchpad. The probe files are deleted from `tests/`.
* **Screenshots:** the pack's run rewrote this folder's screenshots, which I restored. The modified R1 screenshots in the tree come from the builder's R1 run.

## Builder's decisions
1. **Relatives' tabs in their owner's filing, and firm-record sections left out: right.** The application's sections in no filing: **wrong** (Major 1). Its answers fill every filing's forms: the Agent view itself says "fills IMM 5257 for 6 people".
2. **Confirm section verifies only `onList`; the button stays pressable at 0: right.** This matches P-510 (2) and P-411 (1) and keeps QA-417's design. The r1c move of M4 to the spouse and r1a D1 `confirmed === 0` are correct readings.
3. **The Study permit child's 54: proven.**
   * The walk named the child "Sample Kid W" (walk.md S2). `answer2.js:10` tests the case-sensitive `/Child/`, so the script typed the adult date of birth.
   * The walk's capture `client-parts-study-permit.txt:1564` reads "Answered by the principal for Sample Kid W … **(the child is 40)**". P-411 (1) "to confirm" is correct there.
   * On fresh data (ages 10 and 15) the children are Declared on both pathways: 155 and 152 typed answers, 0 to confirm.

## Issues (ranked)
1. **Major (Must): the representative's checklist leaves out the application's values, so it can read "0 to confirm" while the officer still has one.**
   * **Where:** `api/src/review-rounds.ts:100-102`. `mine()` keeps only form subjects and their relatives, never the case subject.
   * **Reproduced on :4448** (Visitor visa family):
     1. The officer types "Contact in Canada" on The application tab. Under P-411 (2) this staff-entered answer stays on the Confirm list, and it fills every IMM 5257.
     2. The officer confirms every person's tab and sends all 4 filings.
     3. The case page reads "**1 to confirm** · To confirm, in the Agent view: The application (1)".
     4. Every filing's checklist reads "Values: 1 fact, 1 confirmed by Case officer (Sample) · **0 to confirm**".
   * This fails the row's "household = … = the representative's checklist". The client's declared application answers (purpose, dates, funds) are also missing from every filing's "N facts".
   * **Why the test misses it:** the pack recomputes each filing with the same rule (`tests/check_qa446_confirm_counts_browser.ts:63`) and never compares the checklist with the household line.
   * **Fix:** count the case subject's sections in each filing whose forms read them (or in every filing). Add a fail step: an officer-typed application answer → each filing "1 to confirm" until confirmed.
2. **Minor (Should): "nothing to confirm. Every answer here is confirmed already." beside answers marked "✓ Declared".**
   * **Where:** `web/src/runtime/questionnaire.tsx:950`. These are older words, but this row now sends every Declared section down this path.
   * The checklist says "declared by Client A" while the toast says "confirmed". P-510 (2) asks for the declared label.
   * **Fix:** "… declared by <who>; they need no officer confirmation."
3. **Minor (Should): an answer waiting for the client (C6.18) counts "to confirm (the officer's Confirm section)", which that button cannot clear.**
   * **Where:** `engine/runtime/review.ts:121`, `:132`. `awaitsClient` → `confirmed: false` (`engine/runtime/case.ts:87`), and `confirmSection` leaves it for the client.
   * **Scenario:** the officer records a background answer → the checklist says "1 to confirm (the officer's …)" → the officer's press replies "1 waits for the client". Found by reading the code, not reproduced.
   * **Fix:** count it apart: "N wait for the client".
4. **Minor (Should): the own-link branch (`review-rounds.ts:106`) has no test.** The pack's `nameOf` returns "" for own-link (`check_qa446…:118`), and no own-link answer runs. If the branch named the wrong person, nothing fails. **Fix:** one `valuesOf` case with an own-link answer.

Notes (no change asked):
* (a) `onList` is read before the transaction (`runtime.ts:871`), as `listed` was. A concurrent change can only make it confirm fewer answers; the seen and 409 checks hold.
* (b) The builder's `*-4-nothing-to-confirm-1440.png` shows the toast with the section out of view; my `03-zero-section-toast-1440.png` shows both.

## D1–D20 (only what this diff touches)
* **5:** D2 (declared answers never rewritten as VERIFIED; r1a D1), D3 (one `sectionAnswers`), D5, D9 (primary only with something to confirm), D12, D13, D14, D15 (Confirm 670 ms; one Agent-view read per round).
* **4:** D8, D10 (Minor 2), D11, D18 (Minor 3), D19 (the hand-off agrees except for the application).
* **3:** D1 (the application is missing, Major 1); D16 (the rule fails when removed, but the application and own-link paths are untested).
* **N/A:** D4, D6, D7. **Simulated only:** D17, D20.

## Best in class (EXPERIENCE §6; this diff touches BIC-11, 17, 18, 19, 20; the others are N/A)
| Check | Result | Evidence |
|---|---|---|
| BIC-11 one primary, the one the status calls for | Met | 23 to confirm: primary. 0: secondary (`questionnaire.tsx:937`); `03-zero-section-toast-1440.png` |
| BIC-17 review returns only what needs work | Partly | Names declared and confirmed by whom; hides the application's open value (`07-probe-rep-1440.png` against `08-probe-agent-1440.png`) |
| BIC-18 states drawn | Partly | "Values: none answered yet"; the toast's "confirmed already" on Declared (Minor 2) |
| BIC-19 counts say what they count | Partly | "73 facts, 56 declared by Client A · 17 to confirm" adds up; misses the application (Major 1) and C6.18 answers (Minor 3) |
| BIC-20 keyboard, zoom, no sideways scroll | Met | Tab + Enter on Confirm section; axe WCAG 2.2 AA 0 (Agent view 1440, review 1024); no sideways scroll at 400, 720 (200 %) or 1024 |

## Journey test (reviewer role)
Study permit family; Client A answered 338. As the case officer, then the representative:
* **J1:** household 84 → the spouse's tab → Confirm section by keyboard → "23 answers confirmed".
* **J2:** the principal's 0 section → "nothing to confirm"; the answers stay Declared.
* **J3:** Send for review through the dialog → the representative at 1024 reads "73 facts, 56 declared by Client A · 17 to confirm".
* **J4:** the officer-typed application answer (Major 1). **J5:** the builder's pack on both pathways.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 on screen; pack 33/33 |
| Next step obvious | 1 | The household line names the tabs; primary only with something to confirm |
| Plain words | ½ | "confirmed already" on Declared (Minor 2) |
| Feedback and state | 1 | The toast gives the server's count; the pill and "Declared" stay true |
| Correct data | ½ | Per person all agree; the application is left out (Major 1) |
| Error recovery | 1 | The 0 press is harmless and repeatable; r1a D1's 409 for a late answer holds |
| Accessibility and screen sizes | 1 | axe 0 on both screens; keyboard Enter; 400, 720 and 1024 with no sideways scroll |
| Speed | 1 | Confirm 670 ms; the review page ready under 1 s |
| Visual quality | 1 | Team look; the checklist wraps cleanly at 1024 (`06-rep-checklist-1024.png`) |
| Trust and sources | 1 | "declared by Client A", "confirmed by Case officer (Sample)"; a source on each fact |

**8.5/10, pass (no criterion at 0).** To raise it: Major 1, then Minor 2.

## What I could not check
* The fail-before run on main's code (not re-run by me).
* r1c, r1d, B124, C8.3 and the other packs: left to CI.
* A real screen reader. An unaided intended-user walk: D17 and D20 stay with the founder.
* My screenshots are in my session scratchpad (`/tmp/claude-0/-home-user-xpatready/e211002e-f503-5e2a-92b5-38a5802ef4ee/scratchpad/walk/`), not committed.

## Round 2: `9215b2c1dc2cd52c2f17707c8b0ba1d575bfcc3f` (diff only, P-293 (3))
Same reviewer role, 13 Nov 2026. Scope: `git diff 4f428aa51..9215b2c1d`. Own copy on :4448, stopped after use; live AI off, US$0.

**Re-ran:**
* `check_qa446_confirm_counts_browser.ts` **45/45**. Step 6 on both pathways:
  * Visitor visa: `case.visit_contact_name`, 4 filings "1 to confirm".
  * Study permit: `case.caq_number`, only the principal's filing reads it, so "1".
* `check_qa417_counts_browser.cjs` 55 passed, 0 failed. `check_review_rounds` 56/56. `tsc -p web` 0.
* My two probes (deleted afterwards). The screenshots the run rewrote are restored.

**M1: partly closed (still Major, Must).**
* My round-1 scenario is fixed. The officer types "Contact in Canada" on a fresh case and confirms every person's tab: household 1, all 4 filings "1 to confirm".
* **Still open:** an application fact that decides a filing's forms but fills no box is in no filing's `caseFacts`. On a client-answered case, 2 answered application facts are read by no filing: `case.authorizes_release_to_designated_individual` and the firm-record `case.uses_representative`, which is never to confirm.
* Reproduced on :4448 (Visitor visa family):
  1. The officer answers "authorizes IRCC … release" = Yes on The application. This adds IMM 5475 to every filing; under P-411 (2) the answer stays on the Confirm list.
  2. The officer confirms every person's tab.
  3. Household: **1 to confirm** (The application).
  4. All 4 checklists: "Values: 1 fact, 1 confirmed by Case officer (Sample) · **0 to confirm**".
* Where: `api/src/review-rounds.ts:103` (`caseFacts` built only from `f.facts`) and `:106`.
* **Fix:** also count, in every filing, an application answer that no filing's forms read (it decides which forms the case has). Alternatively count every application answer in every filing, the simpler choice round 1 allowed.
* **Fail step:** in step 6, also have the officer answer `case.authorizes_release_to_designated_individual`; each filing must say "1 to confirm" until its Confirm section.

**m1, m2, m3: closed.**
* m1: the toast now reads "… Its answers are declared by who gave them (no officer confirmation needed) or confirmed already.", asserted on both pathways. QA-417's words stay elsewhere.
* m2: `valuesOf` counts `awaits_client` apart ("N wait(s) for the client to re-confirm", `live.waits_client`), with a unit pass case.
* m3: an own-link answer is named by its person (`about`), with a unit pass case.

**New Minor (Should): the check does not type-check.**
* Where: `tests/check_qa446_confirm_counts_browser.ts:214`. `tsc -p api` gives `TS2339: Property 'value' does not exist on type 'A'`. tsx runs it anyway, but the claim "tsc clean" does not hold for the api project.
* **Fix:** add `value: unknown` to `type A` (line 33).

**Journey score unchanged: 8.5/10** ("Correct data" stays ½ for the open part of M1).
**Round 2 verdict: Block.** One Major is still open, M1's decision-fact case. The Minor can go with it.

## Round 3: head `71c77be5d6347c5b7dabaac19d91f86f0d6d7b2b` (fix `828e2a68a`; diff `9215b2c1d..828e2a68a` only)
Same reviewer role, 13 Nov 2026, on the tech lead's go (Lead 32, P-293 (3)). Not reviewed, as asked: the merge of main `907caa1d7` (P-318 (1)) and `71c77be5d` (screenshots only).
Own copy on :4448 at the head, stopped after use. The local database server was down (stale pid); I started only the database (`pg_ctl … start`, as `start.sh` does), never :4400. Live AI off, US$0.

**Re-ran at the head:**
* `check_qa446_confirm_counts_browser.ts` **45/45**. Step 6, Visitor visa: household 2; all 4 filings read "2 to confirm". Study permit: household 2; the principal's filing reads 2, the others 1. None reads "0 to confirm".
* `check_qa417_counts_browser.cjs` 55 passed, 0 failed. `check_review_rounds` 56/56. `tsc -p web` 0.
* `tsc -p api`: no error in the PR's files (`value` was added to the check's type A, line 36).
* **My round-2 reproduction, on fresh Visitor visa and Study permit cases** (probe deleted):
  1. The officer answers "authorizes … release" = Yes on The application.
  2. The officer confirms every person's tab.
  3. Household: 1. Every filing: "… · 1 to confirm (the officer's Confirm section)". Before this fix it was "0 to confirm".
* The screenshots the run rewrote are restored. I changed no other file.

**M1: closed.**
* `api/src/review-rounds.ts:105-107`: `counted = caseFacts.has(fact) || !readAnywhere.has(fact)`, with `readAnywhere` over the case's needed forms (channel ≠ NOT_NEEDED).
* An application answer now counts in each filing whose forms read it, and in every filing when none reads it (it decides which forms there are). The household and every checklist agree.
* The pack's step 6 fails if either half is removed: it asserts 2 against 1 per filing. Its expectation comes from the frozen forms (SQL), not from the server's rule.
* The firm-record `case.uses_representative` now shows as "1 confirmed by Representative (Sample)" in each filing. That is true, and it is never to confirm.

**Minor from round 2 (type A): closed.**

**Note (no change asked):** the "confirmed by …" parts follow the order answers are read, so filings of the same case can list "Case officer" and "Representative" in different orders. The words stay true.

**Not re-run:** the R1 group and C8.3 pack after the merge (the builder reports r1c 140/141, its speed budget only, failing on main too; left to CI).
**Journey score: 9/10, pass.** "Correct data" is back to 1: household = tabs = sections = every filing's checklist, including the application. "Plain words" stays ½ (the long "(the officer's Confirm section)").
**Round 3 verdict: Approve** for `71c77be5d6347c5b7dabaac19d91f86f0d6d7b2b`: no open Blocker or Major.
