# B86 — a form field can hold a question's condition: independent review (CHECK)

Reviewer agent, 5 Nov. Branch `claude/b86-conditions-box`, commit d68a8b79a. US$0, live AI off, nothing priced clicked.

**Review from code and pure checks only.** The tech lead ordered one test copy at a time on the Mac (swap nearly full), so I started no copy. Nothing below was seen in a browser or run against a database. "Could not check" is listed at the end, and the builder runs the door test and browser check afterwards.

## Verdict: **Ship after fixes**. Journey score **4 / 10, not a full score**
Three of the ten criteria are unmeasured, so the most this check could reach is 7, under the pass mark of 8. See `journey-test-reviewer-2026-11-05.md`. The core is sound: the rule, the fill and the door's server checks hold on what I could test. The open items are two wrong turns on the screen and two proofs that do not prove what they name.

## The four questions asked
* **Is the guard weakened? No.** `engine/validate.ts:177` changes only the value read (`e.condition_rule` for `e.condition`). `bareCond` moved out unchanged; the comparison, the SHOW-only test and the message are as on main. Text can never compare equal. Rule removal on a scratch copy: rule back to the words fails 3 tests of the fill test; SHOW-only dropped fails "a HIDE condition"; both fail specifically. No existing test is edited (diff).
* **Can a person be stuck? Yes, on the way back, not on the way out.** M1 and M2 below. The way out holds in code: the Yes/No writes N, the name stays empty, an unanswered deciding question reads "Waiting for" (fill test, probe).
* **Can a form print a wrong value? Not on a combination that can be released, in the paths I probed.** Every real-case writer goes through `formCoverage`: `sign-steps.ts:113`, `fill-case.ts:147,196,272,288,326,396`, `case-prepare.ts:209,233,362,384,541`, `submission.ts:108`, `answer-keys.ts:322`. The sample fill (`api/src/fill.ts`) is the PR's stated limit. One latent case, for B88: m2.
* **Can `vv.single-ae2133b8a398` move? Not by this code.** `questionList` (`api/src/pqr-drafts.ts:73`) reads `factSources`, which reads render's coverage. `render.ts` changes one type only, and nothing in `engine/sources.ts` reads `condition_rule`. **Not measured** (no copy), and the test that should measure it cannot fail: M4.

## Checks run
* `check_forms_b86_fill.ts` on d68a8b79a: **29/29**.
* Rule removal on a scratch copy, one at a time; each fails its own named line: words instead of rule (3 lines); SHOW-only (1); BR-1b (4); BR-5b (1); `applies === false` only (1); value kept on the row (1); mandatory skip (2). A slip of mine left the mandatory skip removed during the others; its 2 lines are taken out of those counts. Fully restored copy: 29/29.
* A pure probe of 10 made-up fills (scratchpad only): results quoted in m2, m3.
* `graph.mjs --check`: G1 0, G2 0. G3 names `GET …/form-fields` as untested and unused: a false reading, since the page and test build the path with `encodeURIComponent`.
* Not run: everything needing a server (see the end).

## D1–D20 (code-based; none from use)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | BR-1 to BR-10 present in code; BR-7's Undo not reachable after acceptance (M1) |
| D2 Data integrity | 4 | Condition copied by the server, `.strict()` body, lock plus re-check at approval, nullable column. Not run |
| D3 Reuse | 3 | Reuses `revise`, `library_change`, approve. Second `isWorkedOutYesNo` with another test (m7) |
| D4 Rule integrity | 4 | Rule unchanged and tested; BR-1b makes an orphan rule inert. Two-placement edge (m3) |
| D5 Stability | 3 | Double proposal refused under a lock. Reload and two tabs not walked |
| D6 Governance | 4 | Audit lines at proposal and approval; a rule change in the release summary with expert sign-off |
| D7 AI trust | 4 | Words are shown and never parsed; "Sample, Unconfirmed: expert" on the panel and second person's page |
| D8 Orientation | not seen | Not walked |
| D9 Flow | 2 | M1 and M2 |
| D10 Language | 3 | Sentences in the deciding question's words. Raw codes survive (m1); status pills have no tooltip (m5) |
| D11 Feedback | 3 | Seven row states, toast, busy, error state by code. Not seen |
| D12 Visual | not seen | Team components by code. `flex-wrap` on every problem line unseen (m8) |
| D13 Accessibility | not seen | Real buttons, focusable tip by code. Axe, keyboard, 1024 px, 200 % not run |
| D14 Team look | 4 | Team `Button`, `Pill`, `Notice`, tokens, by code |
| D15 Speed | not measured | One draft snapshot per Hiding question on Review (m4) |
| D16 Testability | 3 | Fill test is strong and fails when rules go. Done when 7 cannot fail (M4); pack step short of qa's wording (M3); Undo and returned page have no browser test |
| D17 First use | simulated only | No walk at all; waits for B83 and B82 by ruling |
| D18 Provenance | 4 | The form field's own words beside the decision; warning when they name another question |
| D19 Closure | out of scope | The person's walk and Done when 5 on a real case wait for B83 and B82 (ruling 1) |
| D20 Pain solved | simulated only | Not walked by an intended user |

## Issues (Must = Blocker or Major; Should = Minor). No Blocker.
**Must · Major M1: once a confirmation and its condition are approved, Undo is on no screen.** The panel appears only on a waiting card (`web/src/pages/proposals.tsx:251`; the queue reads `status: "waiting"` only, `api/src/review-proposals.ts:53`) and under a "Hiding a value" problem (`web/src/pages/review.tsx:91`). Confirming removes that problem and accepting removes the card, so on Visitor visa (one box per question) the row "Confirmed: same condition (with Undo)" disappears the moment it becomes true. The route exists; no person can reach it. BR-7 and challenge M5 exist so a mistake can be undone before release. Read from code, not walked. **Fix:** show the panel on the approved change's page (`review-items.tsx`, which has the fact and combination in `matches`), or list confirmed rows on Review and release. Fail test: approve, then Undo through the screen.

**Must · Major M2: a returned confirmation opens a form that can never succeed.** `web/src/pages/review-items.tsx:125` has a branch for `x.supplies` and for a rename, but a `form_field` falls through to `<Correct>`: "Correct it and send it again", with Name and Meaning, for a change that has neither. "Send again" always gets 409 (`api/src/library-changes.ts:190`). "Withdraw it instead…" exists under it, with the label "Withdraw the new field" as the default, so a person is misled, not trapped. The queue also says "Correct or withdraw". The door test covers the routes only. **Fix:** the same branch as `x.supplies`: a notice "withdraw it, then confirm the form field again", and `Withdraw` with the label "Withdraw it".

**Must · Major M3: the C4.11 pack step does not follow qa's agreed wording.** qa's comment on #1053 (04:02 UTC, before these commits) sets three steps. At `acceptance/C4.11.test.ts:142-155`: `C4.11-26` (the fill, BR-5) is absent; both steps call `POST /submit` where qa said read the draft's problems, not a full Submit, until B82; and `C4.11-25` does not check that the condition is still in force in the draft. The PR body still asks for qa's OK. **Fix:** follow the wording, or get qa's written change on the PR (a real-case `C4.11-26` may need B82; that is qa's call, not silently dropped).

**Must · Major M4: the check for Done when 7, the row's stop line, cannot fail.** `tests/check_forms_b86_door.ts:44` passes if any file in `p2/question-lists` starts with the name. That folder keeps files across runs and copies, and `questionList` writes a new name beside the old one, so a moved list still passes. A failed replay would show indirectly in the next line, but the PR's promised sha would not come from this. **Fix:** read the name the draft plan or run actually used (as `check_forms_c411_draft_qd.ts:348` reads it) and compare exactly; print it.

**Should · m1: field codes survive in the words.** `engine/form-field-condition.ts:60`: the pattern misses `PCRIndicator` and dotted names. Probe output keeps "PCRIndicator = Y and…" and "(representative.is_compensated = yes)", both in saved maps. Not on the 9 checked questions. PRODUCT §4.

**Should · m2: for B88, a worked-out box reading the hidden question itself now writes Y.** `engine/runtime/forms.ts:55`. Probe: `derived:any(NAME,GIVEN) recorded` reading NAME, deciding answer No, an old name stored: writes **"Y"**. Main withholds it (QA-165). The rule refuses this snapshot today (Hiding 1), so no released case reaches it. It becomes a wrong value if B88 releases such a box while it still reads the name. **Fix:** skip the hidden fact only when it is not the box's own fact; add that line to the fill test.

**Should · m3: `showCondition` takes the first placement of a fact** (`engine/form-field-condition.ts:15`), the rule checks all. Probe: two placements, the first without a condition: rule passes (Hiding 0), name written with the answer No. `section_question` is unique by lineage, not fact, and I found no check against it. Not measured on the six.

**Should · m4: one request per Hiding question on Review** (`review.tsx:91`), each building a draft snapshot, against STANDARDS "one request per screen view, not per row". Bounded by the question count, up to 7 on Visitor visa. Measure at the browser check; Major if over the §9 budget.

**Should · m5:** the panel offers the button to a person without the author duty, who gets 403 in words (`form-field-conditions.tsx:40`; compare `useSessionView`, QA-22). Status pills have no tooltip (EXPERIENCE 10).

**Should · m6:** no shared contract: `Row` and `View` are hand-written in the web (`form-field-conditions.tsx:12-13`), the state type again in `api/src/form-field-condition.ts:26` (STANDARDS "Contract first"). `spreadOf(tx as never, …)` at `question-condition.ts:46`.

**Should · m7:** two `isWorkedOutYesNo` with different tests (`engine/form-field-condition.ts:35`, `api/src/own-question.ts:35`). Probe: `as_is -> derived:a recorded -> yes_no_code:Y/N` is not worked out for the door, though it is for the route; no such transform found in the saved map I searched. Decide on one reading before B88.

**Should · m8:** `flex-wrap` on every problem line (`review.tsx:91`) may drop long messages below their pill. BR-5b names two places (base `forms.ts:42`, `:66`); only the first changed, so `forms.ts:79` still counts a hidden question's answer. It affects worked-out boxes on other forms only, so it belongs with B88.

## Concept and standards
Concept fit: every element in §2–§6 exists in code, except BR-7's reach (M1) and the pack step (M3). Retrofit mapping: neither the concept nor any build notes has a line (no `build-notes.md` in the folder). [M] lines: not met: one request per view (m4, unmeasured), contract first (m6), tooltips (m5), no field codes (m1). Not assessed: every line needing the running app. Migration: one additive nullable column; old rows read as not confirmed; not applied by me.

## Could not check (no test copy, tech lead's order)
`check_forms_b86_door.ts`, `check_forms_b86_panel_browser.cjs`, C4.11 steps 24–25 and the rest of the pack, `check_c72_imm5257_fill`, `check_grounding_db`, the other rule suites; the list sha; the migration on a database; type check on this commit; the walk as publisher and approver; keyboard, axe, 1024 px, 200 %, 400 px; timings; audit lines and rows in a database; the second person's page and all words as shown; M1 and M2 on screen. Release marking RELEASED has no test and needs B82. The journey score must be redone by a walk once a copy is allowed.

**Verdict: Block**
Fix on d68a8b79a: M1 Undo on no screen · M2 returned page offers a form that always refuses · M3 C4.11 steps short of qa's wording · M4 Done when 7 check cannot fail. Reviewed from code and pure checks only: a new review with a walk is still needed on the fixed commit.
