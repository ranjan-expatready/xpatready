# Journey test (reviewer): C4.11 step 5 saved conditions (QA-162), commit 6a680d9f, 4 Nov

Copies: my own fresh :4511 and :4513 (Visitor visa from `setup_visitor_visa.ts`), :4512 (Demo › Load configured), :4516 (stand-in launcher); the builder's :4458 and :4452, read only. US$0: the spend ledger was 0 before and after every journey. Live AI was off; nothing priced was clicked.

## Journeys
1. **Main.** The author on Visitor visa wants questions asked only when they apply. Path: Questionnaires › Draft questions and documents › Saved › Draft › read step 5 › To review. **Held.** All 7 steps finish (1.9 s). Step 5 says "6 conditions for To review (Ready 0 · Check 3 · Decide 3); 13 left out with the reason. Saved, US$0" with "See the 19 reasons". To review shows the 6 items, none of them Ready.
2. **Alternate (keyboard only, 1024 px).** Tab to Draft questions and documents, Enter; Tab to Draft, Enter; Tab to "See the 19 reasons", Enter. **Held.** The list opens and the focus ring is visible.
3. **Small screens.** The same at 720 px (200 % zoom of 1440) and at 400 px. **Held.** No sideways scroll; the reasons wrap (`3-reasons-400`).
4. **Error: a left-out condition.** The author reads why "Highest post-secondary education details" was left out and wants to fix it. **Failed.** The reason says no question asks it and tells the author to map a form field. The 7 education questions are already mapped and asked, and "set it by hand" is not offered. The same happens for "Other immigration status description" (review M1).
5. **Error: a condition the form works out itself.** "Residence same as mailing" is a Yes/No answer IMM 5257 derives itself. **Held.** The reason names IMM 5257's box and its source answer, and gives two fixes: add a Yes/No question, or set it by hand. The caption sometimes starts with ". Have you…" (m1).
6. **Empty or blocked (demo data, QA-144).** **Held with notes.** Step 5 gives 0 conditions and 22 left out. Most reasons say "not asked by a question of this combination yet … once it is placed, draft again". The pack's 3 red lines name QA-144. One reason reads "when if" (m2); one tie hides that its question is not placed (m7).
7. **Wrong role.** The approver and the content reviewer try `POST /combinations/:id/draft`. **Held.** Both get 403 "does not hold the author duty".
8. **Recovery: draft again.** **Held.** A second Saved run proposes 0 new items ("6 already waiting there") and no duplicates.
9. **Across the screen boundary.** "Open To review" lands on To review with the "Other family name" item at Check. Its reason quotes the guide sentence and says the tie was broken by that sentence. **Held** (builder's `walk/6-to-review.png`; the same items are in my copy's database).

## Automated replay
* My own Playwright script (scratchpad, not committed). axe WCAG 2.2 A/AA is clean on the plan dialog and with the reasons open. No console or page errors. Sideways scroll: false at 400, 720 and 1024 px.
* The Saved run ended in 1868 ms.
* Suites:
  * `check_forms_c411_draft_qd_browser.cjs` 50/50.
  * C4.11 pack 24/24 on two fresh copies, 21/24 on demo data twice (QA-144). The pack's second run on the same copy is 23/24 (m6).
  * `check_forms_qa162_saved_matching.ts` 33/33 twice.

## Data underneath
* `proposal_item` on :4458 holds 6 conditions:
  * other family name: agreed, Check
  * other given names: one reading, Decide
  * national ID number: one reading, Decide
  * green card number: one reading, Decide
  * visit purpose "other": agreed, Check (the form still reads it)
  * military service details: agreed, Check (the form still reads it)
* Every item has basis SAMPLE. 9 of the 22 saved readings land; each of the other 13 has a reason. `drafting_job.cost_usd` is 0.

## Break-it (15 min)
* Same run twice: one run (idempotency key).
* Wrong role by API: 403.
* Quote that names both questions, or neither: no tie broken (unit test checked).
* Made-up quote: refused by the "sentence is in the guide" rule.
* Shared run card on other runs: a failed finder step would show "See the reason → Request req_…" (code-read, m3).
* Severity: no Blocker; one Major (M1).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 7 steps done; 9 of 22 land; the 13 others listed (`2-reasons-1024`) |
| Next step obvious | ½ | Most reasons give a path; 3 point to the wrong fix (M1) |
| Plain words | ½ | Long sentences; ". Have you…" (m1); "when if" (m2) |
| Feedback and state | 1 | Step counts, "6 already waiting", folded reasons |
| Correct data | 1 | No duplicates; Check, never Ready on a tie-break; US$0 |
| Error recovery | ½ | Worked-out Yes/No reasons are actionable; M1 ones are not |
| Accessibility and screen sizes | 1 | Keyboard path; axe clean; 400/720/1024 px |
| Speed | 1 | Run 1.9 s; list opens at once |
| Visual quality | ½ | 19 long bullets, each repeating question names up to 3 times |
| Trust and sources | 1 | AI mark; Saved US$0; first and second readings named; guide quotes |
| **Total** | **8/10** | **Pass** (8 or more, no 0) |

Most valuable fixes:
1. M1: correct cause and fix for the words-name-none reasons. This raises next step obvious and error recovery.
2. m1 and m2: wording. This raises plain words.
3. Shorten each reason: name the question once. This raises visual quality.

Not tested: a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); live AI.
