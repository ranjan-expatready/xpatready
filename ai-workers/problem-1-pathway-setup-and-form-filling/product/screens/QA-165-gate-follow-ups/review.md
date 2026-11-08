# Review: QA-165 gate follow-ups and readiness over empty boxes (#1318, commit bc9080638)

Reviewer: an independent session; I did not build this. It is a fix row (C7.2, C7.3), not a new screen. I reviewed the changed behaviour and its one visible change, the IMM 5257 forms card and Ready to file lines. Ports 4456 to 4459 only. Live AI was off (US$0). Note: while I worked, the builder pushed ce03a7e74 (tests only: `check_b52_own_yes_no.ts`, `check_c72_imm5257_fill.ts`). I did not review it. The product code is the same as at bc9080638.

## What I ran
- `tests/check_qa165_gate_follow_ups.ts`: 15/15. Mutations in a scratch copy: removing `formHoldsBack`, its fix part, its empty-box part, or `followUpGround`'s check each turns 2 to 3 checks red. Good.
- Pure suites, all green: `check_qa165_mandatory` 40/40, `check_qa165_form_validation` 30/30, `check_c76_readiness` 77/77, `check_forms_b86_fill` 35/35, `check_forms_b88_fill` 34/34, `check_contract_seams` 107/0. `graph.mjs --check` passes.
- Each on its own copy: `check_c82_record_api` 71/71 and `check_c76_readiness_api` 23/23. **`check_c72_imm5257_fill` failed 54/56 at bc9080638**: "setup: … IMM 5257 is ready to file" and "… still ready to file".
- Fresh configured checkpoint (rv165 :4456, load 112 s, all 5 combinations released):
  - C7.3 pack: 14/14.
  - C7.2 pack: 2/10. The other 8 need the Mac's Adobe evidence, or IMM 5257 is filed Online in release 2. That is pack debt already recorded for main, not caused by this PR.
- qa's 46-box count (qa's own script, Sample family plus spouse, the three gates answered No by the client): **44/46 written**. The 3 gate boxes are written "N" (read from the PDF). Citizenship, place of birth, native language and the Employment row are now written. The 2 empty boxes (Taiwan PIN, Israel passport) are both listed by readiness.
- Browser walk at 1440 px (client, then officer): see `journey-test-reviewer-2026-11-08.md`.

## Answers to the tech lead's points
1. **Step 230 and "Hiding a value a form reads": sound and grounded.**
   - 52 B86 confirmations and 9 B88 asks, across IMM 0008, 0008 DEP, 1294, 1344, 5257 and 5710. I read each change's `rawWords` in `library_change`. Every one names the indicator of the same block: "Only when natIDIndicator = Y", "only when AliasNameIndicator = Y", "uslprIndicator = Y" and so on. None names another question.
   - The validate rule makes this step necessary: the library questions are shared.
   - Gap: `confirmReaders` ignores the door's own `warning`, which is set when a field's words name another decider (`230-own-yes-no-follow-ups.ts:186-191`). Today's data has no such row; a future map could have one, and it would be confirmed blindly. Minor 2.
   - IMM 1344's co-signer fields say "co-signer = Y and … AliasNameIndicator = Y". The step confirms only the second part. That is acceptable, because the field is about the co-signer.
2. **Listing every empty mandatory box in readiness, given that lock needs readiness: right in principle (P-71, B116), wrong in two places.** See Major 1 and Major 2.
3. **Prepare, GET …/forms and lock agree.** All three build readiness from `onFormOf`.
   - Measured on one case: forms and prepare list the same 2 (IMM 5257) and 5 (IMM 5257 SCH1) lines.
   - Lock of the SCH1 copy returned 409.
   - Only GET …/forms is tested; nothing tests lock or prepare (Major 3).
4. **Regressions in other forms: yes.**
   - On the configured checkpoint, IMM 5257 SCH1 (PDF upload) was ready before this change. Now it is never ready, and its copy can never be locked, for every case. Its 5 empty boxes are military, war crimes Q5, membership Q6, government position, and previous travel.
   - 4 of those 5 are real product gaps (B116). The wording and the lock dead end are Major 2.
   - IMM 5476 and IMM 5645 are unchanged: ready, with 0 lines.
   - Stage 1 (`prepare.stage1.to_confirm`) now counts empty boxes as facts to confirm: 7 on a case with no unconfirmed fact. That count is not shown on screen (Minor 3).

## Issues (ranked)
- **Blocker 1: a suite is red at the reviewed commit.**
  - `check_c72_imm5257_fill.ts` fails 2 checks at bc9080638.
  - ce03a7e74 rewrites those checks and `check_b52_own_yes_no.ts`, and it needs its own review.
  - Its new `check_c72` line asserts that the Sample family's IMM 5257 is **not** ready over the 3 "not a fact" boxes. That writes Major 1 into a test.
- **Major 1: false "not ready" over boxes IMM 5257 itself does not require.**
  - The form's own script (page 2, Passport Question 2, "CR 330212", `prototype/expected/source-text/imm5257e.xfa-template.txt`) enables TaiwanPIN and marks it required only when the passport country is "203". It does the same for IsraelPassportIndicator only on "206". For any other country it runs `markUnRequired` on both.
  - The Sample passport is "205" (read from the copy). The case still shows "2 facts to answer or confirm before filing" and a CRITICAL line on Ready to file, which must be passed with a reason on every IMM 5257 filing.
  - On a release where IMM 5257 is a PDF upload, the copy can never be locked: readiness reads the inventory's fixed `required`, not the form's own condition.
  - Fix (Must): a box whose requirement the form makes conditional must not hold readiness back unless its condition holds for this case. Read the condition from the form, not from a constant. Otherwise, the tech lead rules that `not_a_fact` ("fill it in Adobe if the form asks for it") boxes are listed but never block.
  - Add a fail test with a "205" passport and a pass test with "203".
- **Major 2: lock and the card send the officer to a dead end, in the wrong words.**
  - Lock refuses with "5 facts to answer or confirm before filing: do that, then generate a new copy" (`contracts/runtime.ts:271`, `fill-case.ts:363`).
  - The card's pill and its list say "Facts to answer or confirm (2)" (`web/src/runtime/forms.tsx:146,155`).
  - These are form fields that no question asks, or that are filled by hand. Nothing on any screen can answer them, and making a new copy changes nothing.
  - The same lines appear twice on the card: under "Facts to answer or confirm" and again under "Marked mandatory on IRCC's form, still empty" (screenshot `10-officer-imm5257-card-1440.png`).
  - Fix (Must): give "left empty on the form" lines their own words in the pill, the list and the 409. Say which form fields are left empty and why, and what unblocks them. List each line once.
- **Major 3: the new lock and prepare paths have no test.**
  - The new check calls `readiness` directly. Dropping `onFormOf` from `lock` (`fill-case.ts:363`) or from `formReady` (`case-prepare.ts:256-259`) turns no test red.
  - Fix (Must): one API test. A copy with a mandatory box left empty is refused at lock (409) and named on prepare; the same copy with the box written locks.
- **Minor 1:** the PR body is still the draft. It has no checks, no section B wording, no walk and no questions. Brief item 4 asks for the wording in the PR. I checked the builder's quotes against the form's text, and they are right: "For this trip, will you use a passport issued by the Ministry of Foreign Affairs in Taiwan that includes your personal identification number?" and "For this trip, will you use a National Israeli passport?".
- **Minor 2:** `confirmReaders` should skip, and report as refused, any row that carries the door's `warning` (point 1).
- **Minor 3:** `stage1.to_confirm` counts "left empty on the form" lines as facts (`case-prepare.ts:443`). Count facts only.
- **Minor 4:** the Taiwan and Israel lines still show another question's words, "Question 1d. Have you taken a test … English or French?", now also on Ready to file. The cause is pre-existing in the map's caption. With the cited words now known, the forms lane can fix the label.

## Scores (fix row: the changed behaviour only)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | Partly | The 3 gates write N and 44/46 boxes are written; Major 1 is a false not-ready |
| D2 Data integrity | Met | No "SAMPLE" left in a list box; one placement version per follow-up |
| D4 Rule integrity | Met | The release validates in all 5 combinations; conditions are grounded (point 1) |
| D5 Stability and recovery | Not met | Lock dead end (Major 2) |
| D9 Flow | Partly | No next step for a box no question asks |
| D10 Language | Partly | "facts" used for form fields; wrong caption (Minor 4) |
| D11 Feedback and state | Partly | Duplicate lists; false not-ready |
| D13 Accessibility | Met | axe 0 violations on the Forms tab; no sideways scroll at 1440, 1024 or 400 px; No chosen by keyboard |
| D15 Speed | Met | prepare 0.33-0.65 s, forms 0.17-0.24 s |
| D16 Testability | Partly | Rules have pass and fail tests; lock and prepare do not (Major 3) |
| D18 Provenance | Met | Conditions are "Sample, Unconfirmed: expert" with the field's own words |
| D3, D6-D8, D12, D14, D19 | N/A | Not changed by this row |
| D17, D20 | Simulated only | No intended user walked it |

BIC (§6, case-side): BIC-04 Met (on No, the details are not asked). BIC-12 Partly (the check before filing lists boxes the form does not require). BIC-13 Not met (the lock error does not say how to fix). BIC-19 Partly (the same lines twice on one card). BIC-20 Met. The other BIC checks are N/A for this row.

## Not checked
- An intended user's unaided walk (D17, D20).
- A real screen reader.
- The Mac's Adobe Validate. I relied on the form's own script for which boxes it requires.
- ce03a7e74, and `check_b52_own_yes_no` at either commit.
- The full `run-suites.sh --changed`.

**Verdict: Block** (commit bc9080638). To fix: Blocker 1 (suites green on the new head, without enshrining Major 1), Major 1, Major 2, Major 3. Fix the Minors or list them in the PR.

## Round 2: diff-only re-review (`git diff bc9080638..8c80d94c6`, head 8c80d94c6, last round under P-293)

### What I ran on 8c80d94c6 (live AI off, US$0, my own copies on 4456–4458, each stopped after)
- Pure suites, all green:
  - `check_qa165_gate_follow_ups` 22/22
  - `check_qa165_mandatory` 40/40
  - `check_qa165_form_validation` 30/30
  - `check_c76_readiness` 77/77
  - `check_forms_b86_fill` 35/35
  - `check_forms_b88_fill` 34/34
  - `check_contract_seams` 107/0
- On isolated copies, all green:
  - `check_qa165_readiness_paths_api` 6/6 (it loads the configured checkpoint itself)
  - `check_c72_imm5257_fill` 57/57
  - `tests/runtime/check_runtime_r1d.ts` 97/97 (after `setup_visitor_visa.ts`)
- Not run: `check_b52_own_yes_no`, `check_runtime_r1c.cjs` and its speed budget, and the full `--changed` set. CI decides those. The builder's r1c figure of 1008 ms against a 1 s budget at load 1.8 is unverified by me. If CI's r1c is red, it is fixed before merge as usual.

### Round 1 findings
- **Blocker 1: closed.**
  - `check_c72_imm5257_fill` is green.
  - Its rewritten checks no longer enshrine the false not-ready. For the Indian passport it now expects only the consent box ("not a fact", fill in Adobe) to be open and listed.
- **Major 1: closed.**
  - `samples/form-script-requirements.json` cites IMM 5257's own script (CR 330212). It is data, not a constant.
  - `mandatoryOpen` skips a box whose `requiredWhen` value is not met (`mandatory.ts:60-61`).
  - `check_qa165_gate_follow_ups` R4 has pure pass and fail checks for codes 205, 203 and 206. It also re-reads the script text, so the data cannot drift from the form.
  - The API test R4 also passes and fails end to end: an IND passport lists neither box; TWN lists only the Taiwan PIN.
  - An unanswered passport country lists neither box, which matches the script (it acts on the value).
- **Major 2: closed.**
  - `blocksLock` (`forms.ts:192`) leaves out only "left empty on the form" lines. Lock (`fill-case.ts:367-370`), the prepare item state and the paper line (`case-prepare.ts:339`) all use it.
  - The empty boxes stay a CRITICAL line on Ready to file, which can be passed with a reason. So "Ready to file" is still never said over them.
  - The card keeps the facts pill and list for facts only. It adds a separate warn pill "N mandatory form fields left empty". Each box is listed once, under "Marked mandatory…" (`forms.tsx:128-160`).
  - The 409 now counts facts only.
- **Major 3: closed.**
  - Lock and prepare call the same `formReadinessOf`. Prepare shares one coverage per form and person with its fingerprint (`case-prepare.ts:256-259, 532`).
  - Prepare agrees with GET …/forms: API R5 checks that the same Taiwan PIN words appear on both.
  - Lock is proven by r1d. "RT-16 pass: the officer locks an up-to-date generated copy" runs while that fixture's readiness still has left-empty lines. This passing is only possible with the `blocksLock` filter, and the 409 case ("38 facts to answer…") still fails as expected.
- **Minor 1: still open.** The PR body is still the draft (1,172 characters): no checks, no section B wording, no walk, no questions. Brief item 4 asks for the cited wording in the PR. Fill the body before marking it ready.
- **Minor 2: closed, and the exception is sound.**
  - Step 230 now refuses any field whose door warning names another question. The one exception is a sibling detail of the same Yes/No (`230-own-yes-no-follow-ups.ts:99-113`).
  - The exception covers IMM 1294's and IMM 5710's national ID country, whose rendered words name "National identity document number". In round 1 I read those two rows' map `rawWords`, and both say "Only when natIDIndicator = Y": the same gate.
  - The 9 B88 asks carry advice, not a warning. They are still asked, as I reviewed in round 1.
- **Minor 3: closed.** Stage 1 counts facts only (`case-prepare.ts:450`).
- **Minor 4: still open, pre-existing.** The Taiwan and Israel caption is still a neighbour's question. It now shows only for a 203 or 206 passport. This is the forms lane's map fix.

### New in this diff
- **Minor 5:** API R6 (`check_qa165_readiness_paths_api.ts`, last check) passes for the wrong reason. On the configured checkpoint IMM 5257 is filed Online, so lock refuses it as "filed Online" before readiness is ever read. Removing `blocksLock` from lock would not turn R6 red. r1d's RT-16 covers the rule, so this is not a gap in proof. Either lock a PDF-upload form in R6 (IMM 5257 SCH1 has left-empty boxes), or say in R6 that r1d proves the lock.
- **Note, not a finding:** `fillEverything` now returns true when only left-empty lines remain and no group needs a first row. That fits the new rule. A pack that needs "ready" must now pass the CRITICAL line explicitly.
- I found no other new issue. Authorisation, migrations and contracts are unchanged since round 1. `blocksLock` is the only new export.

Round 2 journey re-score (same journey, by reading the diff and running the API; no new browser walk):
- Task completed: 1 (the copy locks and N is written)
- Next step obvious: 1
- Plain words: ½ (Minor 4)
- Feedback and state: 1
- Correct data: 1
- Error recovery: 1 (no dead end)
- Accessibility and screen sizes: 1 (round 1 measurement; the card change only splits a pill and a list)
- Speed: ½ (r1c's budget is on the edge, unverified)
- Visual quality: 1
- Trust and sources: ½ (Minor 1)
- **Total: 8.5/10. Pass.**

**Verdict: Approve** (commit 8c80d94c6). Open Minors, to fix or list in the PR: Minor 1 (PR body and section B wording), Minor 4 (Taiwan and Israel caption, forms lane), Minor 5 (API R6 proves nothing about lock).
