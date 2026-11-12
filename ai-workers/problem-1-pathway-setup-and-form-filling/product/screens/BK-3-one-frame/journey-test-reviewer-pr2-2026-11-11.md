# Journey test: BK-3 PR 2, release ↔ case links (reviewer, 11 Nov 2026)

Commit 47595217a (PR #1525). Copies: :4481 (fresh configured checkpoint), :4482 (frame suite), :4483 (mutation check). Headless Chromium driven like a person: clicks, Tab and Enter, reading visible text. Live AI was off (US$0). Walk screenshots are in the reviewer's scratchpad. Three are linked from `review-pr2.md`.

## Journeys
1. **Main (configuration author):** "I've released Visitor visa; open a case on it."
   - Steps: Studio home → Visitor visa card **Open** → **Open a case on Release 6** → dialog → type a reference and a name → Enter → the case.
   - Expected: the dialog arrives with Visitor visa chosen, and the case opens on Release 6.
   - **Held at 1440 and 375.** The dialog opened in ~0.4-0.5 s as the case officer, and focus started in Case reference. The case opened with the toast "Case opened" and the pill "Release 6 →".
2. **Back to the set-up (case officer):** "Which set-up is this case on? Show me."
   - Steps: the case pill → Studio.
   - **Held:** `/c/<id>` as the configuration author, no refusal, by click and by Tab + Enter. Browser Back returns to the case as the case officer.
3. **Product Studio → (case officer):** **Held** at 1440 and 375: the Studio programs list as the author. With the PR's guard removed (mutation), it lands on "This page is for the configuration people". The fix is real.
4. **Never released (author):** Corporate and employers → High-wage position **Resume setup**.
   - **Held:** "Not released yet", and no Open a case button at either width.
5. **Wrong address (case officer):** `/cases?open=not-a-thing` and `/cases?open=<never released>`.
   - **Held:** a warning, "That combination has no release a case can open on", and no silent swap.
   - Cancel drops `?open`. A reload stays closed (suite).
6. **Wrong role (Client A):** `/cases?open=<id>`.
   - **Held:** the existing notice "Cases are for the case officer". No dialog.
7. **Recovery: Back after opening.** **Partly held.**
   - Back from the new case returns to `/cases?open=<id>` and reopens a blank dialog (m2). Escape then closes it.
   - One more Back reaches the Studio page as the case officer (refusal). That behaviour comes from PR 1.
8. **New tab.** **Partly held.**
   - Ctrl-click on the pill: the new tab shows the Studio refusal as the case officer, and the current tab is kept (builder's choice).
   - Ctrl-click on **Open a case on Release 6**: the new tab works, but the **Studio tab itself turns into the refusal** (m1).

## Data underneath
- After my walk, `/runtime/cases` lists RV-1440 and RV-375 once each, both on Visitor visa. Both are pinned to "Release 6" (the combination's own v2), the number the button showed.
- No other case changed: SAMPLE-VV-FAMILY-1 is still on Release 1.
- No API or schema change. Server refusals are unchanged: openable and createCase are staff-only, with the startable check.

## Automated replay
- check_bk3_links_browser.cjs: 47/47. axe WCAG 2.2 A/AA found 0 violations on the button, the dialog and the pill at 1440 and 375. No page errors.
- check_bk3_frame_browser.cjs: 431/431.
- Static check_bk3_frame.ts: 128/128. Web `tsc`: clean.
- No sideways scroll at 375, 512 (1024 px at 200 %), 1024 and 1440.
- The focus ring is visible on both links (3 px at 50 % after its transition).

## Break it (15 min)
- Garbage id: the notice shows, and the next released combination stays choosable.
- Double submit: covered by the existing idempotency key. I saw one case per submit.
- Modified clicks: m1 above.
- Wrong role by address: refused.
- Back and reload: m2 above.
- Nothing at Blocker or Major.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1-4, suite 47/47 |
| Next step obvious | 1 | The button sits under the facts line. The pill carries an arrow, a title and the name "open its set-up in Product Studio" |
| Plain words | ½ | "Open a case on Release 6" → dialog "Visitor visa · release 2" → pill "Release 6" ([dialog](screenshots/review-pr2-dialog-release-2-1440.png)) |
| Feedback and state | 1 | Preselected dialog, "Case opened" toast, Acting-as shows who you are in each area |
| Correct data | 1 | One case each, on the chosen combination, on Release 6 (API) |
| Error recovery | ½ | m1 (Ctrl-click flips the Studio tab), m2 (Back reopens the dialog) |
| Accessibility and screen sizes | 1 | axe 0 at both widths, keyboard path, 24 px targets, no sideways scroll |
| Speed | 1 | Dialog 0.4-0.5 s, pages under 1 s after click |
| Visual quality | 1 | Team Button (secondary, sm) and Pill. Wraps cleanly at 375 |
| Trust and sources | ½ | The pill names the frozen release, but the release number disagrees with the dialog (same cause as plain words) |

**8½/10: pass, no criterion at 0.**

To raise it, most valuable first:
1. Name the catalogue release in the dialog ("Release 6"; openable returns the pack version).
2. Make actAsCaseStaff ignore modified clicks.
3. Open the new case with `replace` when the dialog came from `?open`.

## Not tested
- A real screen reader.
- Dark theme.
- A retired combination in the browser (code only).
- The "released but not ready" branch of the notice (no such combination in the checkpoint).
- An intended user's unaided walk: D17 and D20 stay with the founder.
