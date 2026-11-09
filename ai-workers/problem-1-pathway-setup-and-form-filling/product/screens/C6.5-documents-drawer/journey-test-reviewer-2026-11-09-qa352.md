# Journey test (reviewer role): C6.5 QA-352, proof of funds and marriage certificate read (PR #1444)

Reviewer session, 9 Nov 2026. Commit **43a29fc4bc178931a5886c052f63c4a95489259e**.

Copies used:
* `r352` on :4431: the true state, no saved read.
* `rv352` on :4433: reviewer stand-in reads in a scratch folder. These are hand-made, not model reads, and never committed.

Both copies hold the configured checkpoint loaded from this branch. Visitor visa family case (Client A, Spouse A, two children). Playwright Chromium headless; no visible-browser pane was available. Live AI off, US$0, `ai_batch` unchanged. The scripts and screenshots are in the session scratchpad (`/tmp/claude-0/-home-user-xpatready/0faa7bad-453b-5011-ba89-1ba7ef14f26f/scratchpad/rvscripts/` and `…/rv/shots/`) and are not committed. Review: `qa352-review.md`.

## Journeys (persona · goal · expected)
1. **Main.** Case officer: "fill the funds for the stay from Client A's bank statement." On the application's Details of visit, open "Fill this from documents", Replay, tick, Confirm & use. Expected: the funds become the application's answer, marked from the document.
2. **Alternate, no saved read.** Same steps, with no saved read of the file. Expected: the cost card, no live read, "type the values for now."
3. **Empty.** Client A's own sections. Expected: the statement is not offered there; it gives only the application's facts.
4. **Error, two applicants.** Spouse A's statement differs from Client A's (both saved). Expected: one check on the application, both values shown.
5. **Error, mixed.** Client A's statement is read and has an open check; Spouse A's statement has no saved read. Expected: Client A's block and check stay reachable; Spouse A's statement shows its cost card.
6. **Wrong role.** The client calls fill and Confirm & use; the officer confirms the statement on Client A. Expected: 403, 403, 422.
7. **Recovery.** Double Confirm & use; a newer file replaces the read one; Escape. Expected: one confirmation, `not_current`, focus back on the button.
8. **Across the boundary.** The client's questionnaire shows "please check"; the counts and the answer sheet carry the value.

## What happened
**1. Held (stand-in).**
* Drawer opens in 140 ms with "Proof of financial support: read by AI", the price and "Replay the saved read · US$0".
* After replay: "Funds available for the stay, in Canadian dollars (Details of visit to Canada): CAD 14,200 · page 1 · confidence 90% (Sample)". Confirm & use stays disabled until "Matches the document" is ticked ("1 left").
* Toast after confirm: "Confirmed and used: 1 value now fill the forms." Underneath: `VERIFIED|14200|document_read` on the application.
* The stand-in's extra `person.family_name` was dropped (only the library's facts).
* Keyboard only: Tab reaches Replay, Space ticks, Enter confirms; Escape returns focus to the button.

**2. Held (r352).** The drawer shows: "A live read would cost about US$0.03, at most US$0.20. It is not offered here … No saved read yet. The first read of this document is a paid run that needs approval first. Nothing was sent. Type the values for now." No model call.

**3. Held.** Client A's personal section reads 0 reviews. The message is QA-353's (open, separate).

**4. Held.** 14,200 is used. The second statement opens one check: typed 14200, document 9000. The client's view on the application's section says "Please check this answer. It did not match the proof of financial support on file." Counts: expanded read 2, corrected 0.

**5. FAILED (Major, review M1).** The drawer shows only "Proof of financial support, Proof of financial support: read by AI … No saved read yet … Type the values for now". There is no Replay. Client A's block and its check are gone, and so is "Not on these documents". Section confirm answers 409 "funds available cad … differs from a document (an open check): resolve it first". The check can be resolved only in that drawer, so the officer is stuck while AI is off. Screenshot: `rv/shots/mixed-01-check-hidden-1440.png`; case `a1b515ee-…` on rv352.

**6. Held.** 403, 403, 422. Checked-against on Client A: 404 "No such document for this person."

**7. Held.**
* Parallel Confirm & use: 200 and 409 `already_confirmed`.
* Replaced file: 409 `not_current`; the plan lists only the current files.
* Escape: focus returns to the button.

**8. Partly walked.** "Please check" holds (journey 4). The answer sheet was not re-walked; the builder's walk 04 shows 14200 with Source "Case officer", the answer-sheet label noted as the QA-348 family.

Also checked:
* axe (WCAG 2.2 A/AA) on the drawer: no violations in the no-read, replayed and confirmed states, at 1440, 1024, 720 and 400 px.
* No sideways scroll at any width.
* No page errors.
* Case page 2.1–2.5 s on first load (unchanged by this PR). Drawer 125–185 ms. Replay 1.33 s with a busy state.

## Break it
* Two copies of the statement, one per applicant: correct data; journey 5 fails.
* Double click: one confirmation.
* Wrong role by direct API call: refused.
* Reload after confirm: the block shows "Used · Confirmed and used by Case officer on 9 Nov, 19:44 IST".
* Saved read carrying an extra, unlisted fact: dropped.

## Score (each 0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Journeys 1, 2, 4 complete. Journey 5 cannot finish (the section can never be confirmed). |
| Next step obvious | ½ | Clear on the main path. In journey 5 the drawer says "Type the values for now" while the refusal says "resolve it first". |
| Plain words | ½ | "Proof of financial support, Proof of financial support: read by AI"; no holder named; "funds available cad" in the refusal. |
| Feedback and state | ½ | Used state shown. Journey 5 hides a confirmed block. The price counts a file already read. |
| Correct data | 1 | Values on the application, `document_read` provenance, library facts only, one check per document, counts consistent, no model call. |
| Error recovery | ½ | No saved read, double click and replaced file recover. Journey 5 is a dead end. |
| Accessibility and screen sizes | 1 | axe clean at 4 widths and 3 states; keyboard path complete; 200 % fits. |
| Speed | 1 | Drawer < 200 ms; replay 1.3 s with a busy state. |
| Visual quality | 1 | Unchanged team panel; clean at 1440, 1024 and 400 px. |
| Trust and sources | 1 | AI marked, replayed at US$0, cost before read, page and confidence (Sample), file shown. |
| **Total** | **7.5/10** | **Fail** (below 8; no 0). |

Most valuable fixes:
1. M1: reviews already read stay shown beside unread AI documents, and replay reads per document. This raises task completed, next step, feedback and recovery.
2. Name the holder on a document read for someone else (plain words).
3. Price only unread files (feedback).

## Not tested
* A real saved read (stand-ins only).
* The answer sheet.
* A real screen reader.
* An intended user's unaided walk: D17 and D20 stay with the founder.

## Round 3 (diff only, 9d56a3538): the real saved read
Journey 1 again, now with the **real** saved read (`p2/runs/studio-document-read-fca97932….json`), not a stand-in. My copy `rv352c` ran on :4465 with the checkpoint loaded fresh, and was stopped afterwards. Playwright Chromium headless, 1440 and 400 px. US$0, `ai_batch` 7 → 7.
* **Held.** The drawer opens in 181 ms. Replay shows "Funds available for the stay, in Canadian dollars … **CAD 14,200** · page 1 · confidence 97% (Sample)". The reader's note ends with "The document reads "14200.00"."
* Confirm & use is held until the one tick ("Tick or correct each value first: 1 left"). I ticked with Space and confirmed with Enter. The drawer moved on to the questions not on these documents. Underneath: `14200|VERIFIED|document_read`.
* axe on the drawer: 0 violations. At 400 px: no sideways scroll. No page errors.
* Earlier (round 1 and 2) the real read's text "14200.00" was refused as "funds available cad … digits only". That refusal is gone.
* **Score: 10/10, a pass.** Plain words moves from ½ to 1. All other criteria stay as in round 2. Minor wording points (review m2, n1) stay in `qa352-review.md`.
* Not tested: a real screen reader, and an intended user's unaided walk (D17 and D20 stay with the founder).
