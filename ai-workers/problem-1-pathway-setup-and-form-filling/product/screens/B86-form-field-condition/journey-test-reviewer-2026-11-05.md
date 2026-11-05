# B86 journey test, reviewer role, 5 Nov (commit d46ae4e5f)

Replaces the code-only report on d68a8b79a. **This time the journeys were walked:** a visible Chrome driven by Playwright on one copy, port 4448, reading the screen by its text and screenshots, then the database underneath. US$0, live AI off, ledger 0, nothing priced clicked. Copy stopped after.

**How close to a person:** by clicks and keys on the screen, with these shortcuts: after finding them once on To review, I opened the group and change pages by URL; I chose the person by the stored setting, not the menu. Setup of Visitor visa is `tests/check_forms_b86_setup.ts` (people's steps, Saved answers). Out of scope by ruling: the person's walk end to end and Done when 5 on a real case (B83, B82); other forms' Yes/No boxes (B88).

## Journeys
| # | Persona, goal | Steps walked | Expected | Result |
|---|---|---|---|---|
| 1 | Author, keyboard only: "this form field says the same" | To review › group › condition card, Tab 6 stops, Enter on "Says the same as this condition" | Waiting, link to To review; survives reload | **Held.** 307 ms. One WAITING change, no rule yet |
| 2 | Approver: compare and approve | To review row "Approve or return" › page shows the form field, its own words, what is proposed › Approve | Rule on a draft, Confirmed | **Held.** Rule is the question's condition; `updated_by` is the author (BR-14); audit lines for both people |
| 3 | Author: past the refusal | Accept the condition, second person approves; Review and release shows Hiding first, panel below; confirm; approve | Problem gone for that question | **Held.** `draft.problems` holds Hiding before, none for it after; condition stays |
| 4 | Author: undo before a release | Open "Form fields holding a question's condition" by keyboard, Undo, second person approves | Back to Not confirmed, Hiding back, button back | **Held.** Earlier review M1 and breaker B1 fixed. Confirm again also works (B1b) |
| 5 | Author: a change comes back | Second person returns with a reason; To review › "Withdraw it"; page; reason; withdraw; confirm again | Told to withdraw; no form that cannot succeed | **Held.** Earlier M2 fixed. Same for a returned Undo: row returns to Confirmed with Undo |
| 6 | Approver and Content reviewer, wrong role | Open the card; POST by route | No button; refusal in words | **Held.** No button. 403 for Approver, Reviewer, Case officer; 401 for nobody and an unknown name; typed rule 400; Case officer's GET 403 |
| 7 | Author: two conditions on one question | Military service: card 1 confirmed and approved, card 2 accepted and approved; Undo under the problem; confirm | A way back from "Holds a different condition" | **Held.** Breaker B1c fixed |
| 8 | Author: confirmed from a card that has not landed | National ID: confirmed, approved, card still waiting; Review | Honest state, a way back | **Works, words off:** "Holds a different condition" plus "no condition yet" (m3); Undo works |
| 9 | Recovery: two tabs, reload | Tab B confirms; tab A clicks the old button | One change; refusal in words | **Held, row stale:** toast "A change of this form field already waits on To review…", one change; tab A keeps its button until reload (m2) |
| 10 | Across the boundary | Change summary, Activity, the Release page; `check_c72_imm5257_fill` for the fill | Rule named for the expert; form obeys | **Summary and Activity: held** (`needs_sme: true`, in words). The Release page's library list carries only Add, Retire and Restore (`api/src/programs.ts:453`), as for a question's condition, so a rule is named per combination, not there. Fill: fill test 34/34 and c72 54/54 only; a real case on the six waits for B82 |

## Replay (replacing step 3, builder's scripts run here)
* `check_forms_b86_panel_browser.cjs` **37/37:** axe at 1440 and 400 px on card, waiting, second person, Review, held; keyboard; console.
* `check_forms_b86_door.ts` **44/44** · `acceptance/C4.11.test.ts` **26/26**, exit 0, with no line for 26 (Major M1 in `review.md`).
* My own on top: axe and sideways scroll at 1440, 1024, 200 % as 512 px, 400 px on Review's way out and the held list, and axe on the returned page: 0 violations, no sideways scroll.
* Each script ran once here, the builder's twice or more; a second run for flakiness was not done.

## Data underneath
One library change per proposal. A refusal writes nothing. Rule only after approval, equal to the question's own condition, stored words untouched. An approved change closes when a later one is proposed. Draft rows by the Approver: 0 in `form_field_map`, `section_question`, `canonical_field`. Ledger 0. List exactly `vv.single-ae2133b8a398`.

## Break it (short: the breaker's pass stands, this covers its fixes)
Undo with an approved change open, Undo returned and withdrawn, Undo of a different condition, double `item` (404 in words), typed rule (400), wrong roles, two tabs. No Blocker or Major in the product. **CI found by reading the run, not by walking:** `check_forms_b86_setup.ts` fails every CI run on this commit (Blocker B1 in `review.md`).

## Findings
Full list with file and line in `review.md`. Blocker B1 and Major M1 are about proof, not behaviour. From the walk: m1 (panel not tied to its problem, question unnamed), m2 (stale row), m3 (two wrong sentences), m4 (no error state on Review's panel request, read from code).

## Score out of 10
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–5 and 7 on the screen; Hiding gone, by data. A release is out of scope by ruling |
| Next step obvious | ½ | Button on the card and Review, "Withdraw it" in the queue. Panel after the whole list, its question unnamed (`11-review-1024`, `16-held`) |
| Plain words | ½ | No field code; own words shown. Undo's page says "say the same"; "different" when nothing differs |
| Feedback and state | ½ | Pills with tips, toast, Waiting at once, reload keeps. Stale row after 409; no error state on Review's request |
| Correct data | 1 | Rows, audit, `updated_by`, list exact, ledger 0 |
| Error recovery | 1 | Return, withdraw, confirm again, Undo, different condition; every refusal in words |
| Accessibility and screen sizes | 1 | axe clean on every state tried, four widths, keyboard path. No real screen reader |
| Speed | 1 | 230 ms panel, 307 ms action, 112 ms request, 858–902 ms Review, on the sample (budget under 1 s) |
| Visual quality | 1 | Team components, calm, no overflow at 200 %; "Show all" placement is the one blemish |
| Trust and sources | 1 | The form field's own words, a second person, Sample, Unconfirmed: expert, what approving holds elsewhere |

**8.5 / 10, no 0: passes the mark.** Most valuable next: name the question and tie the panel to its problem (m1), then the wording (m3), then the stale row and error state (m2, m4).

## Could not test
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). A real case and a release on the six. Worked-out and no-words rows on a screen (none on Visitor visa). A rejected card's row by the screen.

**Verdict: the journeys pass at 8.5. The check as a whole is Block, for B1 and M1 in `review.md`.**
