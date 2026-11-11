# BK-3 PR 1 of 4: one frame — build notes

**Row:** Bake plan `design/bake-plan-2026-11-10.md` §2 row 3 (P-447 (2), P-457). PR 1519. Screens lane, cloud, 11 Nov 2026.

## What a person sees
* Every screen (the Studio, the case area, Client A's questionnaire, the adult's link page, the demo inbox) has the same header and, under it, one "where am I" band: **Back** (one level up), the place as a trail, and for staff the other area (`Cases →` in the Studio, `Product Studio →` in the case area).
* No Back on an area's first page: Immigration programs, Cases, Client A's questionnaire, the link page.
* Back on a top-level Studio page (Fields, To review, Activity, …) goes to Immigration programs, the Studio's first page, not to the page seen before (that is the browser's own Back). Below 768 px the Studio's menu is hidden, so this Back is the way out there.

## Departures for the team that ports this (review m5)
1. **The trail sits in a band under the header**, not in the header as in the team's pattern. Reason: the header already carries the brand, the area's name and the demo controls, and at 375 px it has no room; a band keeps the trail readable at every width and the same on every screen. Porting: the band can move into the team's header where its layout has room; the words come from `web/src/components/where.ts` and the pages' `useWhere` calls either way.
2. **`Cases →` / `Product Studio →` also switch the simulated person** (to the Case officer, or back to the Configuration author), as the Demo menu's "Open the case area" and the old header link did. This is demo behaviour until BK-4 (sign in by role); in the product the link only moves between areas the signed-in person may see.

## Where things are
* `web/src/components/frame.tsx`: `Frame`, the band, `useWhere`, the one toast stack.
* `web/src/components/where.ts`: the words for every address and where Back goes (no imports, so `tests/check_bk3_frame.ts` reads every route through it).
* Case pages name the case by its reference with `useCaseWhere` (`runtime/questionnaire.tsx`), from the case's prepare view.

## Left as they were (seen on origin/main 3a9b91743 too)
* `/structure` scrolls sideways at 375 px (the tree rows' Archive buttons, 473 px). A combination's Preview tab does too once a section loads (394 px). Both are page content; the browser walk checks the band itself fits there.
* `pages/library-forms.tsx` keeps its "Shared library › Forms" line above its heading.
