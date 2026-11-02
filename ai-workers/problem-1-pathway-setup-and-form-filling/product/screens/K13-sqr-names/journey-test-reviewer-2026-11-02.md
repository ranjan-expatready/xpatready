# K13 journey test: reviewer, 2 Nov (commit cedb021e)

Role: reviewer (the one journey score for this check). Copy: isolated `rev_k13` on :4443 (web rebuilt), Visitor visa set up by the K13 check's own fixture; C4.7 data on `rev_c47` :4444. Chromium headless via Playwright; US$0.

## Journeys (persona · goal · result)
1. **Author (main path):** "I want the prospect asked which visa they need." Combination › keyboard Tab to "Smart questionnaire (SQR)" › Enter (lands on /questionnaires) › "Details of: Are you applying for a visitor visa…" › drawer section "Prospect questionnaire (PQR)" › tick "Ask in the Prospect questionnaire (PQR)" › Why › Save. **Held:** toast with Undo; strip shows "1 Prospect questionnaire (PQR)"; the chip "Prospect questionnaire (PQR) 1" filters to "Principal applicant: 1 Prospect questionnaire (PQR) question in this combination"; the PQR column reads "Ask". Total 3.8 s including typing.
2. **Author › Preview (screen boundary):** Preview shows "Prospect questionnaire (PQR) · 1 / Client questionnaire · 68 / Agent view · 86". At 400 px the three are switchable radios with the same names. **Held.**
3. **Author, error:** a case-officer fact cannot be asked in the PQR; the tick is disabled. **Held** (behaviour unchanged).
4. **Author › Review and release:** the change reads "Kind of temporary resident visa requested … (The application): Prospect questionnaire (PQR)"; a `where` heading reads "Smart questionnaire (SQR)". axe clean. **Held.**
5. **Case officer:** Cases › the case › headings People on this case › Eligibility › **Prepare application** › **Agent view**; the top card reads "Client questionnaire". Tab moves from "What blocks filing" into the Agent view's person tabs. 1024 and 400 px: no sideways scroll; axe clean. **Held.**
6. **Client (phone, 400 px):** h1 "Client questionnaire"; axe clean. **Held.**
7. **Wrong role:** a client opens the staff URL and gets "This page is for the case officer … open your questionnaire"; staff open the client URL and get "This is the client's questionnaire …". **Held**; the words are informal (review finding 7).
8. **Break it, an old name on a reachable screen:** Forms › Change (IMM 5707) › Only if… › Add a comparison › Field `person.not_in_library`, and the warning reads "…added from **Questionnaires** › Facts a rule needs." **Failed** (`web/src/components/conditions.tsx:90`).
9. **Break it, Activity after a PQR draft (C4.7 data):** the Item pill reads "**pre-qualification**". **Failed** (`web/src/pages/history.tsx:10,32`; `api/src/pqr-drafts.ts:202`).
10. **200 % zoom at 1024 px** (512 CSS px) on the Smart questionnaire tab, preview, case and client page: 0 px sideways overflow on each. **Held.**

## Data underneath
After journey 1: `fact_source` rows with `prequalification` for the combination = **1**. The newest `audit_event` is "changed · fact source · Configuration author set where "Kind of temporary resident visa requested (visitor or transit)" (case) comes from in "Visitor visa": as the rules say, Prospect questionnaire (PQR)". Keys unchanged; nothing else written.

## Break-it pass (15 min)
* Mutation of the K13 check's static scan: "→ Answer in the case view" restored in `runtime/eligibility.tsx` is **not caught** (JSX text after `{expr}`). "Pre-qualification ${…}" in `sources.tsx` and "case view" / "Your Questionnaire" in `questionnaire.tsx` are caught. **Major** (review finding 3).
* The K13 check's preview walk uses `?view=`, but the page reads `?set=`, so the PQR and Agent sets go unwalked below 1280 px. **Minor.**
* To review kind word "Program question pick" (`contracts/review-proposals.ts:19`): a third name for a PQR pick. **Minor.**
* Console: 403 responses for the author on staff-only reads (existing; no page errors).

## Score (each 0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2, 5, 6 done end to end |
| Next step obvious | 1 | Empty PQR state points to "the Smart questionnaire (SQR) tab"; the case reads in work order |
| Plain words | ½ | New names consistent on the main path; "Questionnaires ›" (J8) and "pre-qualification" (J9) remain; "Program question pick" |
| Feedback and state | 1 | Save toast plus Undo; strip and chip counts update at once |
| Correct data | 1 | One tick, one audit line, keys unchanged |
| Error recovery | 1 | Refused PQR tick is disabled; wrong-role notices route to the right page |
| Accessibility and screen sizes | 1 | axe clean on SQR PQR filter, Review, case (staff), client 400; keyboard to the tab; 1440/1024/400/200 % no sideways scroll |
| Speed | 1 | 0.66–1.47 s to network idle on the four pages; no new requests |
| Visual quality | 1 | Longer names wrap cleanly at 400 px; "Agent view" heading aligns with the cards |
| Trust and sources | 1 | Sample, Rules and AI labels intact |

**Total 9.5 / 10, no 0: pass.** To raise "plain words": fix journeys 8 and 9, then rename the To review kind word.

## Could not test
A real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); live AI (off). "Program question pick" was read in code only (no pick was left waiting).
