# Journey test: C4.11 part 2 (reviewer, 1 Nov 2026)

Copy: isolated rv412 on :24472 (fresh sample, `STUDIO_SLOW_QD_STEP=150`), commit 1f493b96. The browser was headless Chrome, driven only by what a person sees (focus, Enter, Space). Screenshots are in /tmp/rv412 and were not committed.

## Journeys
1. **Author, main path (saved answers):** "Draft the questions and documents for With an LMIA from what AI read before." Steps: Questionnaires, then Draft questions and documents, then Saved AI answers, then Draft. **Held.**
   * The plan shows steps 2 and 5 as "saved AI answers".
   * The run card covers all seven steps in 2 s at US$0.
   * Step 2 names IMM 5488 ("replayed before; its 3 document requirements are on To review or applied") and IMM 5483 ("no saved AI reading yet").
   * Step 5 says "No saved AI answer … Meanwhile a person adds conditions on the Questions tab".
   * The ending is "Done with problems", naming steps 5 and 6.
2. **Author, rules only:** steps 2 and 5 read "AI work: with saved AI answers" in the plan and SKIPPED "AI work" after the run. **Held** (builder browser suite, and the API in the check).
3. **Author, empty: no checklist among the sources:** step 2 is FAILED with "attach it under Sources, then draft again". **Held** (check).
4. **Author, AI answers planted (the only way, P-131): two readings.** **Partly.**
   * The agreed item is capped at Check with its reason (form_still_reads), and the differing item is Check.
   * The unknown question and the wrong quote are left out with the reason. A second run adds nothing.
   * Wrong: the condition "Asked only when "Legal or operating name of an organisation" is yes" is offered on a text field (review M1).
5. **Reviewer, across the boundary (To review):** the condition rows show with the AI pill and both readings side by side, plus IRCC's words and the file. Accept answers 409 in words. **Held, with two problems.**
   * The row does not name the question it hides (m2).
   * The reason ends mid-sentence (m3).
6. **Recovery (draft again three times):** no duplicate requirement lines and no duplicate conditions. **Held.**

## Checks
* axe WCAG 2.2 A/AA on the finished run card (1024 px): no violations.
* No sideways scroll at 1024 px or 400 px.
* No page errors.
* The run takes 2 s with 150 ms of slowing added per step (card: "usually about 1 s").

## Data underneath
* `proposal_item` holds requirement_line rows only under the C2.6 checklist_draft job: 3 lines, constant over the runs.
* There are 2 `condition` rows, origin ai, basis SAMPLE, each with its quote. Their trees are `organisation.name eq true` (text) and `caregiver_persons_requiring_care eq false` (number), and both are marked `valid_condition: passed` (M1).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Steps 2 and 5 run, propose, and dedupe |
| Next step obvious | ½ | Step 2 says where the lines are decided. The run page still has no next step (part-1 m8) |
| Plain words | ½ | The condition row lacks the question's name. The reason is cut mid-sentence |
| Feedback and state | 1 | Per-step status, and "Done with problems" names the steps |
| Correct data | ½ | No duplicates, but conditions that can never be true pass as valid (M1) |
| Error recovery | 1 | Missing checklist or missing saved answer: each says what to do. A re-run is safe |
| Accessibility and screen sizes | 1 | axe clean, keyboard only, 400 and 1024 px |
| Speed | 1 | 2 s with the test slowing on |
| Visual quality | 1 | Team run card and queue components |
| Trust and sources | ½ | AI pill, both readings, quote, Sample. A Ready or valid label can sit on a no-op condition |

**Total: 7.5 / 10. Below the pass mark (8).** Fixes, most valuable first:
1. M1, the value check against type and answer list (raises correct data and trust).
2. m2, name the question in the row.
3. m3, cut the reason at a sentence.
4. Part-1 m8, give the run page a next step.

Not tested:
* A real saved AI run (none exists, P-131).
* A screen reader.
* 200 % zoom beyond the 400 px reflow.
* An intended user walking it unaided (D17 and D20 stay with the founder).

## Round 2 (81166e07): 7/10

Judged from the code and a direct run of `answerOf`; the app was not walked again.

* Yes-no deciders now give `true`/`false`. Free-text deciders are left out with "a person sets this condition".
* Queue rows name the hidden question, and reasons end on a word.
* New break: when the deciding question has an answer list (marital status, passport country), step 5 throws. The run ends with "A step stopped on this computer; … Run it again", and running again fails the same way. The user gets no reason and has no way forward.
* Fix first: M2 (`v.key`, not `v.code`).
