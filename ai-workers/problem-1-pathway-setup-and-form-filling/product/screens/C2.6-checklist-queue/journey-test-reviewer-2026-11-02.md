# Journey test (reviewer role): C2.6 checklist lines on To review, PR #574 at 643a2116, 2 Nov 2026

Copy 4452 (fresh, six loaded), headless chromium (no visible display here), actor user-A (author and review), user-B/user-C for roles. US$0, no live switch. The replay was started by API (the "Saved · US$0" button is in the AI launch dialog behind setup state); every step after it was a person's: job page, To review, open, accept, Documents tab.

## Journeys
1. Author: Visitor visa's IMM 5484 saved reading -> checklist page -> "Decide them on To review" -> open the passport line -> Accept -> Documents tab shows a Draft, AI-proposed line. Held. Undo toast "Undo (9 s)" and "New library items wait for a second person" shown.
2. Alternate, Decide line with a draft condition (Marriage): Accept writes the line with the AI's "Draft condition ... defers to the visa office" sentence; Documents tab then lists a release problem (reads person.marital_status, not in the library). Works, words unclear (Finding 3).
3. Empty/dead end, Decide line with no condition (Purpose of travel): Accept refused with "edit it to give its condition ..."; the panel has no Edit. Wrong turn. Blocker for this journey (Major 2 in review.md).
4. Wrong role: user-B and user-C accepting a line: 403 "does not hold the author duty"; nothing written. Held. The button is still shown to them.
5. Recovery: three parallel accepts of one line -> one line, two 409. Reload after accept: line shows Accepted on the job page ("14 of 18 still wait"). Held.
6. Old doors: apply-checklist and the job page's per-item decide answer 410. `POST /jobs/:id/accept-clean` still answers 201 and flips 6 items to accepted with nothing written (Major 1 in review.md).
7. Boundary: job page to To review (link works), to Documents tab (line there), to Review and release (count 11 changes). Held.
8. Break: undo of a type batch after its line was accepted leaves a dangling line (API only, Minor 3); long text: the replay message runs to a full screen at 400 px (Minor 4).

## Underneath
After journey 1: one `document_requirement` (DRAFT, IMM 5484 file and quote, origin AI_PROPOSAL), one DRAFT document type with a waiting library change proposed by user-A, items accepted with the decision key; audit line present. After journey 6: 3 lines and 3 types "accepted" with no rows written. Super visa lines and "any additional documents" absent from the queue.

## Checks
axe WCAG 2.2 A/AA: 0 violations on queue and job page at 400, 1024, 1440. No sideways scroll. Load about 0.35 to 0.45 s. Keyboard-only: Tab to Open, Enter, Tab to Accept, Esc closes. Console: no errors beyond the expected 409. Run twice (copy 4452 and a fresh 4453): same.

## Score (0, 1/2, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 0.5 | Passport and most lines land; one of three Decide lines cannot be accepted |
| Next step obvious | 0.5 | Job page links to To review; Decide lines point to a missing Edit |
| Plain words | 0.5 | Raw keys, "(P-134)", "Us", "Requirement line" vs "document line" |
| Feedback and state | 1 | Toast with Undo, 409 words, job page shows where each item stands |
| Correct data | 0.5 | accept-clean marks items accepted with nothing written; Undo can orphan a line |
| Error recovery | 0.5 | Dead end on Purpose of travel; reject and add by hand is not said |
| Accessibility and sizes | 1 | axe clean, keyboard, 400/1024/1440 |
| Speed | 1 | under 0.5 s |
| Visual quality | 1 | Consistent with the queue; long message at 400 px is the one weak spot |
| Trust and sources | 1 | AI mark, IRCC's quote with file, Sample, first reading Saved |
| **Total** | **7.5 / 10** | Below 8: Block |

To raise it: close accept-clean for checklist jobs (correct data to 1), say what the Decide line can do (next step, recovery to 1), plain words in the job message and reason (words to 1) = 9.5.

Not tested: a real screen reader; an intended user's unaided walk (D17/D20); the AI launch dialog click path to the replay.
