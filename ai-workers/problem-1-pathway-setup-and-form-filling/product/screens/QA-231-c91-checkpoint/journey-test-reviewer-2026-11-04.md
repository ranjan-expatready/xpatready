# QA-231 journey test: reviewer, 4 Nov 2026

Head f758c056c · isolated copy `b8_rev` on :4473 (fresh database, stopped after) · US$0, no live AI · headless Playwright, Chrome.

## Journeys
1. **Main path.** The configuration author wants to know what the new IMM 5476 edition touches before accepting it.
   Steps: To review › New edition › Components touched.
   Expected: the sections and rules on each combination that files IMM 5476, said in words.
2. **Alternate.** The case officer opens the Sample family case on the Visitor visa's release 1.
   Expected: on Release 1, three Sample people, nobody has answered.
3. **Recovery.**
   * Load the checkpoint twice. Expected: refused with words, nothing doubled.
   * Reset, then load again. Expected: one case, clean.
4. **Wrong role.** The case officer, or the client, opens the impact by its address. Expected: refused.
5. **Screen sizes and keyboard.** Expected: no sideways scroll and no axe problems at 400, 1024 and 1440 px; keyboard reaches the tab and the combination link.
6. **Across the boundary.** Demo row 11 tells the founder what the case shows. Expected: true, plain words.

## What held
* **J1:**
  * Components touched lists 21 sections and 3 rules ("IMM 5476 is filed only when …") on Outside Canada, Visitor visa and With an LMIA – inside Canada.
  * Every listed section is a real placement in that combination's released snapshot (21/21).
  * The why is in words, with no raw PDF path, and says "with no caption of its own" where a field has none.
  * Screenshots: scratchpad `rev231/shots/2-components-touched-1440.png`, `comp-1024.png`, `comp-400.png`.
* **J2:** SAMPLE-VV-FAMILY-1 is on Release 1 with Client A, Partner and Child (Sample), 0 answers (screenshot `3-sample-family-case-1440.png`).
* **J3:**
  * The second load is refused with 409 and "The Structure already has names in this workspace. Reset the demo first…", and there is still 1 case.
  * Reset then load gives a clean copy again.
* **J4:** the impact returns 403 for the case officer and for the client.
* **J5:**
  * axe finds 0 problems at 400, 1024 and 1440 px, with no sideways scroll at any width.
  * Tab reaches "Components touched" and Enter selects it.
  * Tab reaches the underlined combination link.
  * No page errors and no priced request.
* **Data underneath:**
  * 1 case and 3 Sample people, with no answers.
  * The copies are on release 1, and the C9.1 P-67 step is green.

## Findings
* **Major (J6, correct data and plain words).** Row 11 shows only 5 of the 15 copies.
  * Its "why" lists 7 refusals saying "5 copies of this case are being generated; wait for them, then ask again", and 3 saying "IMM 5257 SCH1: No such form."
  * Cause: `api/src/sample-case.ts:85-87` asks for every copy at once, against the cap of 5 per case at `fill-case.ts:46`.
  * The case page then shows the Partner and the Child with almost no copies (screenshot 3).
  * See review M1.
* **Minor (J1, plain words).** The rule label says "filed only when its condition holds", which gives no condition (`api/src/where-used.ts:125`; `condition_plain` is null).
* **Minor (J1, visual quality).** 21 near-identical paragraphs; the same section appears twice per combination, one entry per field. The design of the grouping is a question for the tech lead, not a fix asked here.
* **Minor (speed).** New edition: review impact takes 1.5 s to open at 1024 px and 2.0 s at 400 px. The first-view budget in STANDARDS §9 is under 1 s. Loading the checkpoint takes 43–53 s.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 lists the asked sections and IMM 5476's own rule; J2 the case is on release 1 |
| Next step obvious | ½ | Components touched gives no hint what to do with 21 entries; Accept is at the foot |
| Plain words | ½ | Row 11's refusal list; "its condition holds"; "Section b" |
| Feedback and state | 1 | Row 11 "partial" with its reason; the counts on the tabs |
| Correct data | ½ | 21/21 sections match the placements, but 5 of 15 copies against the code's own stated intent |
| Error recovery | 1 | Load again: 409 with words; reset is clean; idempotency keys |
| Accessibility and screen sizes | 1 | axe 0 problems, no sideways scroll at 400, 1024 and 1440, keyboard path works |
| Speed | ½ | 1.5–2.0 s to open, against the under-1-s budget |
| Visual quality | ½ | Repeated wall of entries (O2) |
| Trust and sources | 1 | Sample labels, US$0, the saved AI run marked Saved |

**7.5 / 10: below the pass mark of 8 (no criterion at 0).**

Fixes that would raise it, most valuable first:
1. Make row 11's copies one at a time, or only those P-67 needs, with no refusal list. This raises correct data and plain words: 8.5.
2. Say the form rule's condition in words.
3. Group Components touched by section within each combination (a question for the tech lead).

Not tested: a real screen reader, 200 % zoom, an intended user walking it unaided (D17 and D20 stay with the founder). Break-it was limited to reload, double load, wrong role and reset. Two tabs and hostile files are not on this row's paths.
