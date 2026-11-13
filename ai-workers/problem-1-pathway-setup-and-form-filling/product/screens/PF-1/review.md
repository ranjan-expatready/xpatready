# PF-1 review (seam, no new screen): module pages without editing App.tsx

Reviewer, 13 Nov 2026. PR 1711, commit `4808693d659b13da221f3d75e2c5c56448cc1b59` (branch `claude/dazzling-hawking-evpb5c`). Row: Lead B's PF-1 (`lead-b-rows-2026-11-14.md`); contracts §0.1, §5.1 (`platform-and-front-office-contracts-2026-11-14.md`, on `origin/lead/2026-11-07-lead31`). I did not build it. Paths below are under `prototype/studio/`.

## What I ran
* `npx --prefix studio tsx studio/tests/check_pf1_module_routes.ts 4517` (isolated copy, live AI off, US$0): **23/23 passed, exit 0**, 31 s. Worktree clean afterwards (temporary `_pf1_*` folders removed).
* My own fixture build (`VITE_MODULE_FIXTURES=1 vite build` into the scratch folder), opened in Chromium through the same request rerouting the suite uses: `/_example/pf-1` at 400, 1024 and 1440 px: axe WCAG 2.2 A/AA 0 violations, no sideways scroll, no page error; 720 px at scale 2 (200 %): no sideways scroll; keyboard: Tab reaches "Sign in", Enter opens `/sign-in`, Back returns to the fixture, reload keeps it.
* `overlaps`/`routeProblems` copied out unchanged and run on edge cases (results under Minors).
* `select-suites.mjs` given a changed file under `web/src/modules/`: even `--direct` picks `check_pf1_module_routes.ts` and the browser smoke suite `check_dv_backbone_browser.cjs`; without `--direct`, every browser suite.
* `graph.mjs --check`: exit 0.

## Fit to the row
| Done-when clause | Result |
|---|---|
| The fixture's page opens at its path in a browser check, with no App.tsx change beyond the hook | **Met**: `/_example/pf-1` shows "Example module" in the Frame (`pf1-example-module-1440.png`); two more temporary modules open beside it. |
| Two modules on one path, or a module path equal to an existing route, **stops vite build** with both names (pass and fail tests) | **Not met as written.** See Major 1. |
| Every existing route opens as before (`/`, `/sign-in`, `/cases`) | **Met**: same address, title and heading, no page error, with and without modules (also `/link`, `/inbox`). |
| Fixture under `_example/` not shipped | **Met**: the default glob leaves out `!./modules/_*/routes.tsx`. `import.meta.env.VITE_MODULE_FIXTURES` is a constant at build time, so the unused branch is removed. The suite checks that "Example module" is absent from the default bundle's JS. |
| Touch list | Met: new files only, plus App.tsx. |

**App.tsx (`web/src/App.tsx:35`, `:43`):** the diff is two lines: the import, and `{moduleRoutes}` added to the existing one-line `<Routes>`. That is one hook. An import cannot share a line with JSX, so this meets "one line" in intent. The builder raises it openly as PR question 2. Not a finding.

**React Router 7.18.2:** `createRoutesFromChildren` expands a `React.Fragment` into its child `<Route>`s (`node_modules/react-router/dist/development/chunk-62JRHF6Z.mjs:7207`), so the fragment works. Routes are ranked by specificity, not by order. That means "ahead of the catch-all" changes nothing at run time, and the overlap check (not the order) is what keeps App's pages safe. That reasoning is correct.

**Overlap logic (`web/src/modules.tsx:36-60`):** correct for its purpose. It catches equal paths, a splat over a deeper path (`/cases/*` and `/cases/new`), a static path taking an address from a parameter (`/c/new` and `/c/:id`), `/:any` against every single-segment App route, and `/`, `/*` and non-absolute paths. `APP_ROUTES` is checked word for word against App.tsx by the suite, so a new App route cannot slip past it.

## Blockers
None.

## Majors
1. **A clash does not stop `vite build`. It stops the app when it loads.** `routeProblems` runs at module evaluation in the browser (`web/src/modules.tsx:66-67`). `vite build` never runs that code, so a build with two modules on one path exits 0. At load, the throw in `modules.tsx` stops the whole bundle: **every** route renders blank, including `/sign-in` and pages unrelated to the clash. The message ("modules "a" and "b" both claim /x") appears only in the browser console (`screenshots/pf1-clash-two-modules-1440.png` is an empty page). The suite's "fail" cases check this load-time stop, not a build stop. A missing `export const routes` does stop `vite build`, naming the file (Rolldown "Missing export"); that part is met.
   *In practice:* a PR with a clash goes red in CI. The PF-1 suite (a fixture build that includes the real modules) and the browser smoke suites fail on a blank app, and the merge queue runs every suite. So a clash cannot merge on green. But the row's wording is not met, and a local `vite build` or `vite build --watch` gives no warning.
   *What meeting it takes:* files outside the touch list. A Vite plugin in `web/vite.config.ts` (import plus a `plugins` entry), or a pre-build step in `package.json`/`start.sh`. Correction to the PR's estimate: the plugin cannot import `routeProblems` from `modules.tsx` in Node, because that file runs `import.meta.glob` and JSX at its top level. `APP_ROUTES`, `overlaps` and `routeProblems` would have to move to a plain `.ts` file, and the plugin would have to read module paths without running the pages (a static read, or `ssrLoadModule`).
   *Fix (the tech lead's call; the builder raised it openly as PR question 1, not silently):* either (a) the tech lead records that "stops the app at load, red in CI" replaces "stops vite build" for PF-1, and this Major closes with no code change; or (b) the tech lead approves the `vite.config.ts` hook, plus a plain `.ts` home for the check, in this PR or a follow-up row. Until one of these is recorded, the Done-when is not met.

## Minors (Should, not blocking)
1. **Same-module siblings that React Router allows are refused.** `/fo/leads/new` with `/fo/leads/:id`, or `/fo/*` with `/fo/settings`, in one module gives "claims ... twice" (`modules.tsx:57`). React Router ranks the static or specific path first, so these never clash. Front-office pages such as `/front-office/leads/new` beside `/front-office/leads/:id` will hit this. Fix: inside one module, refuse only paths that are the same after `:param` normalisation. Keep the full check between modules and against App.
2. **Optional segments and letter case are not modelled** (`modules.tsx:33`). `/fo/:id?` is read as always present, so another module's `/fo` is not caught. `/Sign-In` passes the check, although React Router matches without regard to case: App's `/sign-in` still wins the tie, so the module page is unreachable and nothing is lost. Fix: refuse `?` and capital letters in module paths (one line each, stated in the README), or expand optional segments.
3. **README says the fixture is "never shipped"** (`web/src/modules/README.md:22`). True for the build. With the Vite dev server, both globs are transformed eagerly, so fixture code is loaded but not routed. This is harmless while the studio runs `vite build --watch`. Wording only.

## D1–D20 (seam; only the lines that apply)
D1 requirement fit: Partly (Major 1) · D2 data integrity: N/A (no data) · D5 stability: Met (reload, back and Enter keep the right page) · D10 words: Met (error lines name both sides plainly) · D11 feedback: Partly (a clash shows a blank page; the message is in the console only) · D12/D14 look: Met (fixture inside the Frame) · D13 accessibility: Met (axe 0; 400/1024/1440 px; 200 %; keyboard) · D15 speed: Met (fixture page about 0.8 s to network idle) · D16 testability: Met (real pass and fail builds; removing the throw would fail 9 checks (by reading); reran by me on the exact commit) · D17/D20: simulated only · the rest N/A for a seam. BIC-01 to BIC-20 (EXPERIENCE §6): N/A, not a case-side screen.

## Journey test (reviewer): **9/10, pass**
Report: `screens/PF-1/journey-test-reviewer-2026-11-13.md`. Half points: feedback and state, and error recovery, both because of the load-time blank on a clash (Major 1).

## Could not check
A real screen reader; the Vite dev-server overlay for the runtime error (the studio runs `vite build --watch`); an actual CI run on this commit (I ran the suite and the selection tool only).

Verdict: Changes needed
* Major 1: "stops vite build" on a clash is not met (load-time stop only). It closes when the tech lead records (a) acceptance of the load-time stop plus CI, or (b) an approved `vite.config.ts` hook, implemented.
* Minors 1–3: Should, not blocking.
