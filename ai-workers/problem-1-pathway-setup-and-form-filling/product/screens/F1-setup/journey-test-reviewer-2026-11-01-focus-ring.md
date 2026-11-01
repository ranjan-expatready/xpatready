# Journey test (reviewer): visible focus ring, commit d5c64bea

1 Nov 2026. Copy on :4443 (database `xr_studio_screens_focus`), headless Chromium driven by keyboard only. US$0.

## Journeys
Persona for all of them: the content publisher, who uses the keyboard only.
1. **Main.** Goal: "find the Visitor visa and open its forms".
   - Steps: Tab through the top bar and the side menu, then search and open the combination's Forms tab.
   - Expected: every stop shows where focus is.
2. **Alternate.** Goal: "show me only one kind of item to review".
   - Steps: on To review, Tab to the "Kind" filter and change it.
3. **Dark theme.** Journeys 1 and 2 again in dark.
4. **Menu.** Open Demo, then a row's ⋯ menu, and move with the arrow keys.
5. **Sizes.** The Form library at 1024 px, and at 200 % zoom (720 px at DPR 2).
6. **Break it.** Put the old reset back. Move the rule out of `@layer base`.

There is no data path and no error path: the change is CSS only. No records are written.

## What happened
- **J1:** held.
  - 40 stops in light and 40 in dark, each with the 2 px brand outline or the primitives' own ring.
  - axe is clean on all three of the builder's pages, plus 15 more pages tested in light.
- **J2:** fails at one stop.
  - The "Kind of item" select (pages/to-review.tsx:66) takes focus with nothing visible.
  - A keyboard user loses their place on that control.
  - Screenshot: /tmp/rv/shots/3-review-kind-select-focused.png.
- **J3:** held. The dark ring is #2aa1ff, 5.6–6.0:1 against the dark surfaces.
- **J4:** works, but the highlight is faint.
  - The highlighted item is only a 5 % grey (1.10:1), or #f7f7f7 on white (1.07:1).
  - Screenshot: 2-demo-menu-highlighted.png.
- **J5:** held. No sideways scroll, and the focused element is visible.
- **J6:**
  - Old reset back: the builder's check catches it (bare logo link and selects).
  - Rule unlayered: 37 of 40 stops get a double indicator, and the check does not notice.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J5 completed by keyboard alone |
| Next step obvious | 1 | Focus position is shown at nearly every stop |
| Plain words | 1 | No wording changed |
| Feedback and state | ½ | Kind select bare; menu highlight 1.07–1.10:1 |
| Correct data | 1 | CSS-only change; no data touched |
| Error recovery | 1 | Reload and theme switch keep the ring; no error paths touched |
| Accessibility and screen sizes | ½ | One 2.4.7 fail (to-review.tsx:66); primitives' ring 2.24:1; axe clean; 1024 px and 200 % fine |
| Speed | 1 | No change; pages ready under 1.2 s |
| Visual quality | 1 | Clean offset ring; no double indicator as built |
| Trust and sources | 1 | Not affected |
| **Total** | **9/10** | Passes (8+, no 0) |

## Fixes that raise the low criteria, most valuable first
1. Remove `outline-none` at pages/to-review.tsx:66, and add `/review` to the check.
2. Give the menu items a visible highlight: App.tsx:182, sources.tsx:115, library-forms.tsx:283, workspace/forms.tsx:182.
3. Use a solid `ring-ring` for the destructive button (controls.tsx:21) and the shared primitives.

## Not tested
- A real screen reader.
- Browsers other than Chromium.
- An intended user's unaided walk: D17 and D20 stay with the founder.
