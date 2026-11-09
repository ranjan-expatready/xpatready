# Journey test: the "Fill this from documents" drawer (reviewer, case officer, 8 Nov 2026 IST)

Commit c5415ebff6b6234ed8ab4fdce121bfce49f713db (PR #1374). Isolated copy `rv_c65d` :4434, Visitor visa fixture, synthetic Sample passports and letter (P-133), US$0. Playwright Chromium headless; clicks, typing and the keyboard only in the drawer. Setup (case, typed answer, uploads) went through the API: upload is C6.4's screen. Scripts and screenshots are in the session scratchpad (not committed): `walk.mts`, `walk2.mts`, `nr*.mts`, `shots/w*.png`, `v*.png`, `x*.png`.

## Journeys (persona: case officer)
1. **Main.** "Fill Client A's personal details from the passport, without retyping." Personal details → Fill this from documents → read → tick given names and sex → Confirm & use → resolve the family-name difference with a reason → answer citizenship in place → mark it checked.
2. **Alternate: Correct it.** Correct given names to "CLIENT ALPHA" in the row before Confirm & use; the value should become a difference and open a check with "Keep the current answer" chosen.
3. **Empty.** Languages section: nothing to read.
4. **Error: no reason.** Save a resolve without a reason.
5. **Error: stale tab (L-SA9).** Tab A has ticked. The family name is changed elsewhere to agree with the passport, so it now needs a tick. Tab A clicks Confirm & use.
6. **Two tabs.** Both confirm the same passport.
7. **Wrong role.** Client A opens the case and calls the fill route.
8. **Recovery.** Double click, reload mid-ticks, Escape, reopen.
9. **Letter.** The cost card before any read; no saved read.
10. **Boundary.** Back on the Agent view after Confirm & use: values fill the forms, with their source shown.

## What happened
* **J1:** the drawer opened and read in **264 ms**. One block: "sample-passport.pdf · Read from its coded lines: rules, no AI, US$0 · Check digits: passed".
  * Order as BR-7: the differing family name first ("Differs from the current answer, SAMPLEDE (you entered it). Confirm & use opens a check…"), then citizenship and issuing country left with the server's reason and Answer it, then given names and sex with ticks, then "3 values checked by the passport's check digits: Date of birth, Number…, Expiry…".
  * Confirm & use was disabled with "Tick or correct each value first: 2 left". After the ticks, one click (1.36 s, busy state) gave "Confirmed and used by Case officer on 8 Nov, 22:08 IST". Per row: Used / Agreed with the answer / Check opened.
  * Resolve worked with a reason. Citizenship was answered in place with a country picker. Mark checked worked.
  * Database: number, expiry and sex VERIFIED `document_read`; DOB agreed; the typed and corrected names DECLARED `agent_view`; checks open, then resolved; audit lines for read, confirmed and used, resolved, and checked against a document.
* **J2:** after the in-place save the row became "Differs from the current answer, CLIENT ALPHA (you entered it)…". The check opened on Confirm & use with "Keep the current answer" pre-chosen; the reason was still required. Held. For about a second after Save, the row still showed its tick (Minor).
* **J3:** "Nothing to read here. No uploaded document of Sample Client A gives a value in this section. Type the answers." Held.
* **J4:** "Give a reason for keeping this value." on the field, red border, the check still open. Held.
* **J5:** 422 shown above the button: "Tick or correct each value first: family name is not ticked. Nothing was written." The drawer reloaded with the new tick and `confirmed_by` stayed empty. Held. The words use the fact's last word ("family name"), not the question label (Minor).
* **J6:** the second tab's click was refused. The block reloaded to "Confirmed and used by Case officer on 8 Nov, 22:08 IST". One confirmation in the database. Held.
* **J7:** no button on the client's page; fill route 403; file route 403 (pack). Held.
* **J8:** a double click confirmed once. Escape returned focus to the button. Ticks are not kept over a reload; the server asks again. Reload drops the Agent view's `#` anchor (an existing behaviour), so the section must be reopened.
* **J9:** "Letter of invitation (Sample): read by AI. A live read would cost about US$0.03, at most US$0.20. It is not offered here…". Details hold the estimate basis. "No saved read yet…" with no button; `ai_batch` unchanged. Held.
* **J10:** the Agent view rows show "read from a document · Case officer" and "fills IMM 5257 …"; the button shows "1 to resolve" while a check is open. Held.

## Findings (details and file:line in `review.md`)
* **Major M1 (BR-12):** after resolving a difference and keeping the answer, there is no "Mark checked against the passport". The server accepts it (200); this drawer is its only web entry.
* **Major M2 (concept §6):** six test pairs are missing from the screen pack: 409 in IST; stale Answer it; Correct it → check; mark checked and 409 `open_checks`; BR-13 national ID; keyboard path.
* **Minors:**
  * Fact words in the resolve heading and the 422.
  * The result message only in a toast; `closed[]` not listed.
  * "Open", not "Open the passport".
  * No section shown on values that fill another section.
  * Concept tooltips missing.
  * Two filled Save buttons in one block.
  * Mark checked offered while a check is open (409).
  * Generic loading words.
  * The graph cannot see the file route.
  * A brief stale row after Correct it.

## Automated replay
* Screen pack 21/21. Pack 30/32 (the two known paid-letter lines). API check 61/61.
* axe (wcag2a, 2aa, 21aa, 22aa) inside the dialog: 0 violations at 1024, 720 (1440 at 200 %) and 400 px; the pack covers 1440. Dialog width 560 / 560 / 400 px; no sideways scroll.
* Tab order stays in the panel (Close → body → Open → Answer it → tick → Correct it → … → Close).
* No page errors or console errors.
* Not run twice in a row as one script, but the pack checks ran on two fresh cases with the same results.

## Score (QUALITY "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 end to end in the drawer; DB as expected. |
| Next step obvious | 1 | "2 left" on the held button; the difference says what Confirm & use will do; "1 to resolve" badge. |
| Plain words | ½ | "given names: the answer is…", "family name is not ticked", bare "Open". |
| Feedback and state | ½ | The result and `closed[]` only in a toast; brief stale row after Correct it. |
| Correct data | 1 | VERIFIED only for used values; corrections DECLARED; 422 and 409 write nothing; one confirm under a double click. |
| Error recovery | 1 | J4, J5 and J6 each say what happened and reload to the right state. |
| Accessibility and screen sizes | 1 | axe clean at 4 widths, keyboard path, focus kept and returned. |
| Speed | 1 | 264 ms read; 1.36 s confirm with a busy state; no per-row requests. |
| Visual quality | ½ | Clean team panel; two filled Save buttons in one block after confirm. |
| Trust and sources | 1 | Reader, page and check digit on each value; the file opens; AI confidence marked Sample; cost first. |

**8.5 / 10, pass (8 or more, no 0).** To raise it, most valuable first:
1. Use the question label and the document's name in the resolve heading and the 422.
2. Keep the result message and any closed checks in the block.
3. Make resolve and in-place Save secondary.

Not tested: a letter replay (no saved read), BR-13 with a national ID (none on the fixture), a real screen reader, and an intended user's unaided walk (D17, D20 stay with the founder).
