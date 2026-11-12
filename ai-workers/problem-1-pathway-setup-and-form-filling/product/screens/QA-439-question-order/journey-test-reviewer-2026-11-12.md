# QA-439 journey test (reviewer), 12 Nov 2026, at 2e562a381943ec7118cab80913883b11dda36d49

* **Setup:** I used an isolated copy rv439 on :4457 with the configured checkpoint (load took 108 s). Live AI was off and cost was US$0. The copy is stopped.
* **Method:** Playwright, headless Chromium, as Client A (`user-P`) on a Visitor visa case the officer opened (principal, spouse, child).
* **Where the evidence is:** the scripts and screenshots are in the reviewer's scratchpad and are not committed (`scripts/journey.cjs`, `next.cjs`, `walk.mts`, `walkw.mts`, `props.mts`; `shots/`).
* **Score: 8.5/10.** This passes the bar, but M1 and M2 in `review.md` block.

## Journeys (client persona: "I fill in my family's visa forms")
1. **J1, main path: open the questionnaire and answer the toddler's own questions first.** **Held.**
   * The overview reads "About the application > Sample Applicant A > Sample Spouse A > Sample Child T". That is the case's order, not UUID order.
   * The child's block starts with **Personal details**, then National identity document and Signature (the chosen sections).
   * In the child's Personal details I typed Date of birth 1 / 2 / 2024 (Day / Month / Year) and chose Marital status "Single", then pressed Save and continue.
   * Database: `person.date_of_birth = "2024-02-01"` and `person.marital_status = "single"`, one current row each.
   * The overview went from 0 of 56 parts to **0 of 51**. Government positions, Membership or Association and Military service are gone from the child's list.
   * "Statutory declaration of common-law union" stays: it holds the child's full name, which is QA-440's.
2. **J2, alternate: the officer's view.** **Held.** The officer's tab for the child starts Personal details > National identity document > Signature > US PR card > Employment.
3. **J3, order stays put while answering** (engine walk, 20 runs, 5 combinations × 2 families × base/head). **Held.**
   * No unanswered question ever moved behind the client's position.
   * Wasted answers dropped on every combination, for example Study permit 21→0 and Visitor visa 31→10.
4. **J4, gate before its details (Visitor visa). Failed (M2).**
   * "Description of the visit purpose when it is 'other'" sits above "Purpose of the visit to Canada" in the application's Details of visit.
   * The same holds for the two "status … when it is 'other'" pairs in each person's Personal details, and for immigration history details.
   * A client who fills in from the top answers them before the gate removes them.
5. **J5, recovery: reload.** **Held.** The overview's part list is identical before and after reload.
6. **J6, wrong role.** **Held.** Another client actor (`user-X`) reading the questionnaire gets 401.
7. **J7, keyboard only.** **Held.**
   * Tab reaches "Start" and Enter opens "Part 1 of 51 · Personal details".
   * Focus is visible (team default).
8. **J8, screen sizes and axe.** **Held.**
   * 1440: overview and child part. 1024 and 400: part 1.
   * axe WCAG 2.2 A/AA found no violations.
   * No sideways scroll at any width.
   * No console or page errors.
9. **J9, the screen's own order compared with the API's order.** **Partly.**
   * The web (`byPerson`) sorts the parts by person again. On Study permit, 5 answers are still wasted on screen against 0 in the API order (21 on base): the application's custodianship questions come before the child's "minor studying without parent". This is m1.

## Break-it (about 15 minutes)
* **UUID independence:**
  * The same family with UUIDs in opposite lexical order gives the same order on head. Base's Study permit order changes.
  * A mutant that drops the people rank is not caught by the PR's checks (M1).
* **Concurrency:** the two answers were sent together (as the API check does). Both were stored once and neither was lost.
* **Hidden person (C6.16):** the order is computed from no answers, so it cannot reveal a private person's answers. I did not run it by screen.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: the child's two answers drop the adult-only parts; 56→51 parts |
| Next step obvious | ½ | Personal details first (J1); "_other" details still come before their gate (J4) |
| Plain words | ½ | The PR changes no words; some labels on the path are library meanings ("Whether the person has …"), which predate it |
| Feedback and state | 1 | The parts count updates; statuses per part on the overview |
| Correct data | 1 | DOB and marital status stored once each, exactly as typed (J1) |
| Error recovery | ½ | Reload holds (J5); Save and continue on a part with blanks lists every blank as "Answer this question, or leave it for now", which predates the PR |
| Accessibility and screen sizes | 1 | J7, J8 |
| Speed | 1 | Overview ready in about 0.4 s; GET questionnaire 60–185 ms; inside STANDARDS §9 (m2 notes about 2× engine cost) |
| Visual quality | 1 | Unchanged team look (rv-child-part-1440.png) |
| Trust and sources | 1 | No AI on this path; nothing invented; the order comes from release data only |
| **Total** | **8.5** | Pass: 8 or more and no 0 |

**Fixes that would raise the low scores, most valuable first:**
1. M2: put each gate question before its details. This raises "next step obvious".
2. m1: make the screen keep the engine's cross-person order.

## What I could not test
* A real screen reader.
* 200 % zoom (400 px stands in for it).
* An intended user's unaided walk: D17 and D20 stay with the founder.
* The full Save-and-continue walk to the C6.3 hand-back. I relied on the builder's 1440 log for it.
