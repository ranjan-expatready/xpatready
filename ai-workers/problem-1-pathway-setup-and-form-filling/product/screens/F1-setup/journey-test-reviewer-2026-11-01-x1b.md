# Journey test (reviewer): X1b filing tag on the Programs card, commit 7037ae00, 1 Nov

App: isolated copy on :4444 (xr_studio_screens_x1b), headless Chromium. Scripts are kept outside the repository (`/tmp/rev-x1b/walk.cjs`, `walk2.cjs`, `row.cjs`). US$0.

## Journeys
1. **Main (configuration author):** "Which of my programs are filed as PDFs?" Open Programs (All). The LMIA card reads "PDF only"; cards without form lines show no tag. **Held** (load 473 ms).
2. **Alternate (author changes channels):** on the LMIA forms, set one line to Online, then back to PDF. The card reads "Mixed", then "PDF only"; with a Paper line it reads "Mixed" (full words "online, PDF and paper" in title and sr-only). **Held.**
3. **Empty:** Visitor visa, Study permit and the Corporate High-wage position have no form lines and show no tag. **Held.**
4. **Error:** setting a line to Online or Not needed where the library refuses returns HTTP 400 with a plain reason, and the card is unchanged. **Held.** The "Checklists only" state cannot be reached in the sample (review m2).
5. **Wrong role:** no new act; the tag is read-only for every role and the button rules are unchanged. **Held.**
6. **Screen sizes / zoom:** 375, 400, 1024 and 1440 px and 200 % zoom: no sideways scroll; the tag sits under the progress line; buttons stay aligned across the row. **Held.**
7. **Screen reader (accessibility tree):** the card is read as article (name and state) → heading → trail → "✓ Live" → "Filed: PDF only" → "Open: With an LMIA". **Held**, but the word "Filed:" breaks the existing card suite (review M1).
8. **Boundary to the next screen:** Open → combination Forms tab shows "Filing: PDF only", the same value under a different prefix (M1 fix aligns them).
9. **Recovery:** after a reload the tag shows the same value as the catalogue API after every change.
10. **List view:** no tag, as P-208 names the card only.

## Data underneath
After each change, the catalogue `filing` matched the card. Final state: all 8 LMIA lines are PDF_UPLOAD, the same as before the run. No other record changed (the 150 "Scale card" categories come from `check_setup_card_browser.cjs`).

## Break it
* Three channels at once → "Mixed": correct.
* A channel the library refuses → 400, no change.
* Reload in the middle of a change: the tag follows the server.
* Long names or a search match: the tag stays on one line; the "Matches:" line goes under it.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Tag equals the catalogue filing on every card |
| Next step obvious | 1 | Button place and words unchanged |
| Plain words | 1 | "PDF only" · "Online only" · "Mixed", as P-208 says |
| Feedback and state | 1 | Follows channel changes after reload |
| Correct data | 1 | Card = `GET /catalogue` filing = Forms tab value |
| Error recovery | 1 | Refused channel changes leave the card unchanged |
| Accessibility and sizes | ½ | axe clean; full "Mixed" words only in a native title (m4); "Filed:" wording (M1) |
| Speed | 1 | 473 ms list load; no extra request |
| Visual quality | 1 | Quiet 12 px outlined tag; rows stay aligned |
| Trust and sources | ½ | The Forms tab marks filing "Sample until the immigration expert confirms"; the card tag has no such mark (acceptable for a five-things card, noted) |

**9 / 10: pass.** To raise it: M1 and m4 (accessibility).

Not tested: a real screen reader; an unaided walk by an intended user (D17/D20 stay with the founder).
