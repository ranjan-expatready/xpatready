# Journey test (reviewer) 2: X1b filing tag on the Programs card, commit cdd2704c, 1 Nov

App: isolated copy on :4449 (xr_studio_rvwx1b, fresh), headless Chromium, web built from cdd2704c. Scripts are outside the repository (`/tmp/rvw-x1b/probe.cjs`, `kb.cjs`, `kb2.cjs`). US$0. Earlier run: `journey-test-reviewer-2026-11-01-x1b.md` (7037ae00, 9/10).

## Journeys (persona: configuration author)
1. **Main:** "Which of my programs are filed as PDFs?" Open Programs (All). The LMIA card reads "PDF only"; cards without form lines show no tag. **Held** (load 592–837 ms).
2. **Alternate:** set one LMIA line to Online. The card reads "Mixed" (title and sr-only: "Filing: Mixed: online and PDF"). Put every line back to PDF and the card reads "PDF only". **Held** (X1b suite, run twice).
3. **Empty:** Visitor visa, Study permit and Super visa have no form lines, so no tag. **Held.**
4. **Not a filing method:** a catalogue row with "Checklists only" (faked in the browser; the sample cannot reach it) shows **no tag**. **Held** (the review 1 m2 fix).
5. **Other words:** "Online only" and "Paper only" are shown as they are. "Mixed: online, PDF and paper" is shown as "Mixed", with the full words for hover and screen readers. **Held** (faked rows).
6. **Wrong role:** no new act; the tag is read-only for every role. **Held.**
7. **Keyboard only, 1024 px:** Tab to Search, type "LMIA", Tab to "Open: With an LMIA", press Enter. The combination page opens. The tag is never a Tab stop. **Held.**
8. **Sizes and zoom:** 375, 400, 1024 and 1440 px, and 512 px at 2× (200 %): no sideways scroll. **Held.**
9. **Screen reader (accessibility tree):** article → heading → trail → "✓ Live" → "Filing: PDF only" → "Open: With an LMIA". It now uses the same word as the Forms tab ("Filing:"). **Held.**
10. **List view and recovery:** List shows no tag (P-208 names the card only). After a reload the tag follows `GET /catalogue`. **Held.**

## Data underneath
After each change, the catalogue `filing` matched the card. At the end all LMIA lines were PDF_UPLOAD again. Nothing else changed apart from the "Scale card" categories that `check_setup_card_browser.cjs` adds (as in run 1).

## Break it
* The old "Filed:" word put back → the card suite (C11.10) and the X1b suite both fail. This is the M1 regression guard.
* The "only a filing method" gate removed → "Checklists only" appears on the card, but no suite fails (review m5, Minor).
* Three channels at once → "Mixed": correct. Search matches: the "Matches:" line goes under the tag.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The tag equals the catalogue filing on every card |
| Next step obvious | 1 | The button and its place are unchanged |
| Plain words | 1 | PDF only · Online only · Mixed; "Filing:" matches the Forms tab |
| Feedback and state | 1 | The tag follows channel changes after a reload |
| Correct data | 1 | Card = `GET /catalogue` filing; no tag for non-methods |
| Error recovery | 1 | Refused channel changes leave the card unchanged (run 1); restores are clean |
| Accessibility and sizes | ½ | axe clean, keyboard path and no scroll at any size; the full "Mixed" words are in a native title only (m4) |
| Speed | 1 | 592–837 ms list load; no extra request |
| Visual quality | 1 | Quiet outlined 12 px tag; rows stay aligned |
| Trust and sources | 1 | The value comes from the catalogue's C1.6 filing; the Sample mark stays on the Forms tab, which is where the value is set |

**9.5 / 10: pass.** To raise it: m4 (a `Tip` for the full "Mixed" words).

Not tested: a real screen reader, and an unaided walk by an intended user (D17 and D20 stay with the founder).
