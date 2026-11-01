# Journey test 2 (reviewer): visible focus ring, head 2dcc5a50

1 Nov 2026. Isolated copy on :4447 (database `xr_studio_rvwfocus`), headless Chromium, keyboard only. US$0.
This is a re-run after f8d0bd17 (the fix for review 1) and 2dcc5a50 (the merge of origin/main).

## Journeys
Persona for all of them: the content publisher, who uses the keyboard only.
1. **Main.** Goal: "find the Visitor visa and open its forms".
   - Steps: Tab through the top bar and the side menu, then into Immigration programs and a combination's Forms tab.
2. **Alternate.** Goal: "show me only one kind of item to review".
   - Steps: on To review, Tab to the "Kind" filter.
3. **Dark theme.** Journeys 1 and 2 again in dark.
4. **Pages the merge changed.** A combination's Overview, Documents and Questions, plus Structure: 70 Tabs each.
5. **Sizes.** To review at 1024 px, and at 720 px with DPR 2 (200 % zoom).
6. **Break it.**
   - Put `outline-none` back on the Kind select.
   - Move the app-wide rule out of `@layer base`.
   - Put the old `:focus-visible{outline:none}` reset back.

There is no data path and no error path: the change is CSS and one class. No records are written.

## What happened
- **J1:** held. 40 stops in light and 40 in dark. axe is clean.
- **J2:** held, the fix for review 1. The Kind select is stop 21. It shows the solid 2 px brand outline in light
  (#0862c5) and in dark (#2aa1ff). Screenshots: /tmp/rvf/kind-light.png, /tmp/rvf/kind-dark.png.
- **J3:** held. No bare stop and no double indicator on any page.
- **J4:** held. 58/58 steps over 8 pages × 2 themes. Main's new FOCUS_RING targets and its "Deleted from the library"
  heading keep their rings.
- **J5:** held. The Kind select is reached in 21 Tabs at 1024 px and 10 at 200 %. It is in view, outlined, with no
  sideways scroll. To review is ready in 123–148 ms. No page error.
- **J6:** each regression is caught.
  - Kind `outline-none`: the check fails in light and dark.
  - Unlayered rule: the "two indicators" step fails on all 8 pairs.
  - Old reset: the built-in fail case catches it.
- **Still faint, as in run 1 (Minor 4):** the Demo and ⋯ menu highlight. It is not a regression.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J5 completed by keyboard alone |
| Next step obvious | 1 | Focus position is shown at every stop walked (8 pages, 2 themes) |
| Plain words | 1 | No wording changed |
| Feedback and state | 1 | Kind select fixed. The menu highlight is faint but present and older than this item (m4) |
| Correct data | 1 | CSS-only change; no data touched |
| Error recovery | 1 | Theme switch and reload keep the ring; no error paths touched |
| Accessibility and screen sizes | 1 | No 2.4.7 fail; axe clean; 1024 px and 200 % fine. The primitives' ring is under 3:1 (m3, Should) |
| Speed | 1 | To review ready in under 150 ms |
| Visual quality | 1 | One clean offset ring per control; no doubles |
| Trust and sources | 1 | Not affected |
| **Total** | **10/10** | Passes (8+, no 0) |

## Fixes still worth making (Should)
1. Add a built-in fail case for the "two indicators" step (check_focus_ring_browser.cjs:79-84).
2. Make the menu-item highlight visible: App.tsx:182, sources.tsx:115, library-forms.tsx:310, workspace/forms.tsx:182.
3. Use solid `ring-ring` on the primitives and the destructive button (controls.tsx:12, :21).

## Not tested
- A real screen reader. Browsers other than Chromium.
- Changing the Kind value. The sample had nothing to review, so "All" was the only option.
- An intended user's unaided walk: D17 and D20 stay with the founder.
