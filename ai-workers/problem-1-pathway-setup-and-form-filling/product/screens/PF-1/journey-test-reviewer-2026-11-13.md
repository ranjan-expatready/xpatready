# PF-1 journey test (reviewer role), 13 Nov 2026

Commit `4808693d659b13da221f3d75e2c5c56448cc1b59`. Isolated copy on :4517, live AI off, US$0. PF-1 is a seam, so the person is a **module builder** (the front-office or platform builder), and the end user only sees the module's page. Paths are under `prototype/studio/`.

## Journeys
1. **Main path.** A module builder adds `web/src/modules/<name>/routes.tsx` as the README shows. Goal: "my page opens at my address, and I don't touch App.tsx." Expected: the page opens and App.tsx is unchanged.
2. **Alternate.** Two modules side by side, one of them with a `/*` splat. Expected: both open.
3. **Existing pages.** `/`, `/sign-in`, `/cases`, `/link` and `/inbox` look the same with modules present.
4. **Empty.** The default build has no module. Expected: the fixture's address falls through to the shell, and the fixture is not in the bundle.
5. **Error (clash).** Two modules claim `/pf1-dup`, or one module claims `/sign-in`, `/cases/new`, `/c/new`, `/start` or `/*`. Expected (per the row): `vite build` stops, naming both sides.
6. **Error (malformed).** A `routes.tsx` without `export const routes`. Expected: `vite build` stops, naming the file.
7. **Recovery.** On the fixture page: keyboard to "Sign in", Enter, Back, reload.
8. **Across the boundary.** From the module page into `/sign-in` and back.

## What held
* 1, 2, 3, 4, 6: `check_pf1_module_routes.ts` 23/23 on my run. My own fixture build gave the same results (fixture page in the Frame; temporary modules open; existing pages give the same address, title and heading; default bundle has no "Example module"; malformed module makes `vite build` exit 1 naming `_pf1_bad/routes.tsx`).
* 7, 8: Tab lands on "Sign in", Enter opens `/sign-in` ("Who are you today?"), Back returns to `/_example/pf-1`, and reload keeps it.
* Accessibility: axe WCAG 2.2 A/AA 0 violations on `/_example/pf-1` at 400, 1024 and 1440 px; no sideways scroll at any width or at 200 % (720 px at scale 2); no page errors.
* Speed: the fixture page reaches network idle in 0.75–0.82 s.

## Findings
* **Major (journey 5):** a clash does **not** stop `vite build` (exit 0). At load, the whole app renders blank on every route, and both names appear only in the browser console (`screenshots/pf1-clash-two-modules-1440.png`). A builder running `vite build --watch` sees no error until they open the browser console. CI does catch it: the PF-1 suite and the browser smoke suites fail. Details and fix options: `review.md` Major 1.
* **Minor:** within one module, `/x/new` with `/x/:id` (or `/x/*` with `/x/settings`) is refused as "claims ... twice", although React Router serves both correctly (`web/src/modules.tsx:57`).
* **Minor:** `:id?` and capital letters in module paths are not modelled by the overlap check (`web/src/modules.tsx:33`).
* Break-it: `/:any` at the top level is refused against every single-segment App route. `/:a/:b/:c/:d/:e` is refused against `/cases/*`. A one-segment splat over a parameter, `/fo/:id/*` beside another module's `/fo`, is correctly allowed. `*` without a slash is refused with a plain message.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Fixture and two temporary modules open at their paths; App.tsx has one hook |
| Next step obvious | 1 | README gives a copyable `routes.tsx` and the rules; "Nothing else to register" |
| Plain words | 1 | `modules "_pf1_dup_a" and "_pf1_dup_b" both claim /pf1-dup`; `claims /c/new, which App.tsx already routes (/c/:id)` |
| Feedback and state | ½ | A malformed module stops the build with the file's name; a clash gives a blank app with a console-only message, not a build stop |
| Correct data | 1 | Existing routes identical before and after; the default bundle has no fixture; `APP_ROUTES` matches App.tsx |
| Error recovery | ½ | Fix the path and rebuild works, but a clash is found only from the console or a red CI run |
| Accessibility and screen sizes | 1 | axe 0 at 400/1024/1440 px; 200 %; keyboard path |
| Speed | 1 | 0.75–0.82 s to network idle; suite 31 s for 7 builds |
| Visual quality | 1 | Fixture inside the app's Frame, team look (`pf1-example-module-1440.png`) |
| Trust and sources | 1 | No AI content; the fixture page says where it comes from |
| **Total** | **9/10** | **Pass** (8 or more, no 0) |

To raise it: make a clash stop `vite build` with both names (review Major 1, option b). That lifts both ½ scores.

## Could not test
A real screen reader; the Vite dev-server error overlay; an intended builder working unaided (D17/D20 stay with the founder); a CI run on this commit.
