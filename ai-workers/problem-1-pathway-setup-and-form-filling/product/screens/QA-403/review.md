# Review: QA-403 (C6.2, C7.1: the firm's own facts are the case officer's, not the client's) · PR #1588 at 4c6cf8e9b

Reviewer: a fresh session that did not build this (screen-review + journey-test, reviewer role), 11 Nov 2026. Code read: `git diff origin/main...4c6cf8e9b`. Runs on my own isolated copies: `rv_qa403` on :4448 (configured checkpoint) and `rv_qa403b` on :4449 (`setup_visitor_visa`). Both are stopped now. US$0, live AI off, no priced button pressed.
**Skill outcome: Ship after fixes.** **Verdict: Block.** One Major (M1) is open; the Minors do not hold the merge.

## What I verified
* **The row is fixed for the right answers.** `check_qa403_who_fills.ts` gave **30/30, exit 0** on :4448. Checkpoint rows 1–17 are done (row 2 out, as on main). Each of the three changes reads `RELEASED|user-A|user-C`. The client's questionnaire has none of the three facts. The officer's view has each once, in the file's words. A client PUT is refused 403. IMM 5476 read back from the PDF: appoint `/1`, cancel `/Off`, application `visitor`, office empty. IMM 5475 (XFA) reads back `visitor`. IMM 5476 and IMM 5475 both have by_hand 0.
* **Engine.** `check_p5_engine.ts`: 35/35. Regex order is safe. `derived:checked_if_(true|false)` runs first, and the new `checked_if_<name>_(is|not)_` step also refuses the names true and false. No existing map string matches a new step by accident. I grepped p2/p3/p4/p5 drafts, runs and releases: the only hits are the 10 + 2 `as_is (plain-language application type[ text])` strings, the IMM 5476 appoint and cancel boxes, and the IMM 5645 Visitor, Worker, Student and Other boxes. Each of those boxes' own fact is the fact the step names.
* **IMM 5645 has the four ticks.** `Subform1[0].Visitor/Worker/Student/Other[0]` in the drafted map (run …imm5645e-p1of4…54bbc7), quoting "Visitor", "Worker", "Student", "Other". So `not_visitor_worker_or_student` means Other. That is correct.
* **Checkpoint step 097.** It goes only through the product's services: `placeField` (author), `WhoFills.propose` (author) and `decideLibraryChange` (second person). No fact is named in the code (the test greps it). It passes back sectionKey, collectedFrom, repeats, tier, the condition with its effect and plain words, and ruleOnly. These are every field `placeField` writes (studio.ts:675). displayOrder is kept by `revise`.
* **Data.** The words are plain and in second person to staff, and each help starts "Why we ask:". There are no immigration values: only form names and what the forms ask.
* **Packs (C6.2, C7.1) on :4449.** `check_runtime_r1a` 98/98 · `check_runtime_r1d` 97/97 · `check_qa122_generate` 7/7. `check_qa_r1a_probe` has 2 FAILs, both C6.3 (non-English text kept 0 of 5; spaces only). `check_runtime_r1c` stopped at 18/19, timing out on the label "What is the main purpose of the visit?". Neither can come from this diff: plain `/demo/load` does not run 097 (demo.ts:133), and transforms.ts only fills PDFs. My baseline on main could not start (sandbox: no access to the database folder through a worktree). See "Not checked".

## Issues
* **M1 (Major, Must): a free-text answer that is one wrong word now ticks or clears boxes silently, and before this PR those boxes went by hand.** I probed it on :4448. The case officer saved `apoint` (status DECLARED; `problems: []`) and then generated IMM 5476. The new copy has by_hand 0 and written 21, and the PDF read back `appoint /Off, cancel /Off`: neither box is ticked. On IMM 5645, `runTransform` with `vistor` or `trv` ticks **Other** (`1`) and leaves Visitor `0`. Ready to file then flags only "not confirmed". Once the answer is confirmed, nothing flags the form. The officer's only guard is the note "No fixed list for this answer yet: check it". A fixed list is not open to this PR: answer lists come only from a source (forms.ts:558 `noFreeAdd`, P-158). So the guard belongs in the new steps (transforms.ts, the `= word, else` step and the `checked_if_…_(is|not)_` step). **Fix:** a value that is not one of the words this form's steps name for that fact goes by hand, with the reason "not one of: appoint, cancel" (for IMM 5645: visitor, worker, student). The steps never write the "else" code or tick Other for an unknown word. "Other" itself then goes by hand, which is safe. Add one fail line per step: a misspelled word goes by hand and never ticks.
* **m1 (Should): the fallback `ctx.fact?.(m[2]) ?? v` in the `= word` step.** When the named fact is missing, the step compares the box's own value, which may be a different fact. `derived: 1 if case.other = appoint, else 0` on the value `appoint` gives `1`. No map hits this today. **Fix:** when the named fact is not the box's own fact and is not confirmed, the box goes by hand.
* **m2 (Should): the `as_is` note rule can swallow an instruction.** `plain[- ]language[^()]*` accepts `as_is (plain-language, write in uppercase)` and writes `visitor` unchanged. **Fix:** match only the drafter's two phrasings, `plain-language application type( text)?`, or no comma or verb after "plain-language".
* **m3 (Should): `_is_`/`_not_` parsing.** The name match is lazy, so `checked_if_person_is_not_married` reads as "is not_married". Splitting on `_` turns `common_law` into two words, so `checked_if_status_not_common_law` ticks for `common_law`. No current map hits either. **Fix:** refuse (by hand) a name that contains `_is_` or `_not_` and words that contain `_`, or document the limit with a test line.
* **m4 (Should, honesty of open item 2): no case-side screen shows "Why we ask".** The runtime never reads `helpText`; it is used only in studio.ts and library.tsx. The officer sees the question, "Not answered · the officer enters this from a document or record", and Ready to file's standard "Pass with a reason…". The help's advice to pass with the reason "new application" is visible only in the Library. Say so in the PR. The CRITICAL line and its Pass button do show (walk at 1440).
* **m5 (Should, records): the PR body does not match the code.** The body says "the Approver approves", but the code uses the content reviewer (user-C). "Checks: In progress" has no results. Post the pack results.
* **m6 (Should): the question narrows a library-wide field.** `case.application_type` is described as "Kind of immigration application … (e.g. permanent residence, study permit extension)" and is shared. The new question asks "Which kind of temporary residence application…: visitor, worker, student or other?". That fits today's temporary-residence library only. Note it for when a permanent residence pathway uses IMM 5476.

## Question 2: the content reviewer approves instead of the Approver
The reading is sound for this step: the loader needs a second person who can decide library changes, and the server accepts user-C. But it **hides a product bug**. `applyFills` writes the placement draft as the approver (`revise(…, actor.id, …)`, who-fills.ts:107). The other approval paths write it as the proposer, with the reason stated in their comments: form-field-condition.ts:107 ("approving is not authoring, or the second person … could never release it (BR-14)") and question-condition.ts:79. So an Approver who approves a who-fills change on To review is then refused at release (studio.ts:1181, "You made changes in this draft"). **Recommend a follow-up row:** who-fills.ts:107 writes `c.proposedBy`, as form-field-condition does, with a test that the Approver approves and then releases. After that fix, 097 can use the Approver like 045, 070 and 085. This PR should not change permissions.

## Open items: are they listed honestly?
1. IMM 5645 is tested by unit lines only: honest (the family case is on release 1). The four ticks are confirmed above.
2. Office still missing on Ready to file: honest, with the gap in m4.
3. Free-text questions: honest, but the PR rates the follow-up Minor. With these steps it is Major until M1's guard lands (fixed lists are sourced-only, P-158).

## D1–D20 (a fix row, no new screen)
D1 fit: met for the right answers; M1 for wrong ones. · D2 data integrity: partly (M1). · D3 reuse: met (each fact asked once, officer only). · D4 rules: met. · D5 recovery: met (the step is idempotent: "words only; already …"). · D6 governance: met (library changes through To review, released). · D7 AI: N/A. · D8 orientation: met. · D9 next step: met (office → Pass with a reason). · D10 words: met for the three questions; help unseen (m4). · D11 state: met (Confirmed chip, "No fixed list" note). · D12 visual: met. · D13 a11y: axe 0 at 1440 and 1024 px, no sideways scroll; keyboard not walked. · D14 team look: met. · D15 speed: client part 0.8 s; officer case page 3.5–4.8 s to network idle (before this PR too). · D16 testability: partly (no fail line for an unknown word; m1–m3 untested). · D17, D20: simulated only. · D18 provenance: met ("Agent view · Case officer · confirmed by …; fills IMM 5476 for 3 people"). · D19 closure: met for IMM 5476 and IMM 5475.

## BIC scorecard (only the checks this row touches)
| Check | Score | Evidence |
|---|---|---|
| BIC-01 Ask once | Met | Officer view: each fact once; client: none (test lines; walk at 1440 and 1024). |
| BIC-02 Asked for a reason | Partly | "Why we ask" is in the data but shown on no case-side screen (m4). |
| BIC-04 Incomplete normal, invalid refused | Partly | "Not answered" shows as a state; `apoint` is accepted with no problem and fills wrongly (M1). |
| BIC-12 Check before it leaves | Partly | Ready to file lists the office and unconfirmed facts; a confirmed wrong word is not flagged (M1). |
| BIC-19 Low load by layout | Met | Officer "The application" tab at 1440 and 1024 px. |
| BIC-20 Accessible | Met (keyboard not walked) | axe WCAG 2.2 A/AA: 0 violations at 1440 and 1024 px (officer) and 1440 px (client); no sideways scroll. |
| Others | N/A | Not touched. |

## Journey test (reviewer role): **7.5/10, below the pass mark of 8; no criterion at 0**
Journeys walked:
1. The client opens the questionnaire: the three facts are absent.
2. The officer opens The application: three plain questions, appoint and visitor confirmed.
3. Ready to file: office CRITICAL, with "Pass with a reason…".
4. Wrong role: a client PUT is refused 403, in words.
5. Break it: the officer writes `apoint` and generates IMM 5476; both boxes are off and by_hand is 0 (M1).

| Criterion | Score |
|---|---|
| Task completed | 1 |
| Next step obvious | 1 |
| Plain words | ½ (help unseen; "(P-242, P-411)" on the Ready to file line, from before this PR) |
| Feedback and state | 1 |
| Correct data | ½ (M1) |
| Error recovery | ½ (M1) |
| Accessibility and screen sizes | ½ (keyboard not walked) |
| Speed | ½ |
| Visual quality | 1 |
| Trust and sources | 1 |

Fixing M1 raises Correct data and Error recovery to 1, which gives 8.5.

## Not checked
* An unaided walk by an intended user (D17, D20).
* The probe and r1c failures on main as a baseline.
* `graph.mjs`, which writes qa/GRAPH.md; I may write only this file.
* IMM 5645 end to end (release 2).
* Keyboard-only and 200 % zoom.

**Verdict: Block.** To fix: **M1**. Should: m1–m6. Follow-up row: the BR-14 bug at who-fills.ts:107.
