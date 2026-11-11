# BK-3 One frame, PR 1 of 4: independent review

PR #1519 · commit **d2705074e** (branch claude/dazzling-johnson-j6s8st) · diff `git diff origin/main...d2705074e` on base 3a9b91743 · the reviewer did not build it · 11 Nov 2026.
The branch has since moved to 4200ef109, which changes one PNG (setup-combination-forms-1440) and no code. This verdict covers d2705074e and the code-identical 4200ef109.
This is a shared part, not a screen, so there is no concept.md or build-notes.md. I judged it against the row's "Done when" (Bake plan §2 row 3, P-447 (2)), qa's baseline §2.2, STANDARDS, EXPERIENCE, TEAM-PATTERNS, the code and the running app.
**Copies used:** bk3rev on :4446 (configured checkpoint), plus rv_* on :4447-4449 for the existing suites. Live AI was off (US$0). All copies are stopped and test-copies.sh shows 0. Suite screenshots went to scratchpad or were restored with git checkout.

## Done when, point by point
1. **One frame wraps every route: Met.** `App()` sends `/cases/*` to RuntimeApp, `/link` to LinkApp, `/inbox` to DemoInbox and `*` to Shell (App.tsx:36). All four render `<Frame>` (App.tsx:68, cases.tsx:58, link-page.tsx:60 and :178). No page still has its own `<header>` or Toaster. Static check: 108/108.
2. **Every screen has the line and Back, and a test walks every route: Met, with gaps (m2).** check_bk3_frame_browser.cjs passed 318/318 twice on :4446 (43 routes at 1440 and 375, every Back target opened). My headed walk agrees, error addresses included (/c/nope, /cases/nope, /ai/nope, a missing field). The static walk tries client words on one route only: check_bk3_frame.ts:37 lists just `["client", "/cases/:id/questionnaire"]`. That is how m2 slipped through.
3. **Screenshots: Met.** Six screens at 1440 and 375 (three set-up, three case) are in `screenshots/`.
4. **Full browser run and packs stay green: Not met (M1).** Three existing suites fail at d2705074e. I ran 8 of the 146 selected suites. The other 138 are unverified, so the ready check must run them all.

Scope: web/src plus tests and screenshots only. 19 code files, +484/−178, under ~800. No API, engine, schema or contract change. `graph.mjs --check`: G1 0, G2 0, no frame gap.

## Design choices challenged
* **Band placement (top of main, under the draft bar, not sticky).** Workable. At 375 the line wraps to 3 rows with nothing sideways (walk/10-combination-375). At 512 px (1024 at 200 % zoom) it reads cleanly (walk/11-eligibility-zoom200).
  * It departs from TEAM-PATTERNS:12 ("breadcrumb lives in the app header (crumbs)"). The departure is not recorded for the retrofit (m5).
* **Back on top-level pages.** Needed: below 768 px the Studio menu column is hidden (App.tsx `md:block`), so Back is the only way out there. But its wording misleads (m4).
  * Walk: Activity → To review → Back lands on `/`, while the browser's Back returns to /review.
  * Nothing visible names the target: the line reads "Back | Shared library | Fields".
* **Other-area link on every staff screen.** Justified by the baseline's dead ends 2 and 3 and the P-447 (1) walk. It works both ways at 375 (builder's test and my walk).
  * Hidden from Client A, the link page and the inbox. A case person who lands in the Studio gets the existing "Open your cases" notice instead.
  * The link also switches the simulated person (frame.tsx:52 `setActor("user-A")`; RuntimeApp falls back to user-O). That is demo behaviour in a product-looking link, and it is not recorded (m5).
* **Client and outside pages.** The client questionnaire is the client's first page: no Back, no other area. Right. The link page "Your questions" has no Back. Right. The demo inbox's Back goes to Cases: demo chrome, acceptable.

## D1-D20 (1-5; shared part, most dimensions untouched)
D1 3: Done when met except point 4 · D2 n/a, no data path · D3 4: one Frame and one where.ts replace 5 trail styles and 2 toasters · D4 n/a · D5 4: reload and browser Back keep the right line; a page's own words fall back to the address words while it loads · D6 n/a · D7 n/a · D8 4: a line on every screen, but "Case" on the representative's review and "Page not found" on a real route (m2, m3) · D9 4: dead ends 2 and 3 closed at every width · D10 4: "Back" names no target (m4) · D11 4: one toast stack, the queue's toast-clear check passes (check_s6_queue 35/35) · D12 3: 13 px text is off the type scale (m1) · D13 4: axe finds 0 violations on the line, visible focus ring (walk/04), no sideways scroll at 375/512/1024/1440 · D14 3: crumbs sit outside the header, 13 px · D15 4: the line draws from the address at once · D16 3: good new checks, but the client routes are not walked and three existing suites are red · D17 simulated only · D18 n/a · D19 4: Studio ↔ Cases without the Demo menu · D20 simulated only.

## BIC (EXPERIENCE §6; case-side frame only)
BIC-01 to 13, 15 to 17: **N/A** (the frame adds no questions, documents, forms or reviews).
BIC-14 **Partly**: Back and the crumbs carry a native `title` only. It shows on hover, never on keyboard focus.
BIC-18 **Met**: while a page loads, the line shows the address words ("Cases › Case"), then the reference. Never "No records".
BIC-19 **Partly**: 13 px is not on the team scale (m1).
BIC-20 **Met**: keyboard order header → menu → line → page. Visible focus. No sideways scroll at 1024, 200 % zoom (512 px) or 375 px.
Evidence: builder's case-page-1440 and -375, my walk/06 and walk/11.

## Blockers
None.

## Majors
- **M1 (Must): three existing browser suites go red at d2705074e.** Each failure comes from this change.
  - `check_c69_page_browser.cjs:72`: 53/54. It matches `/Cases\s*›\s*…›\s*Case check…/` against the nav's innerText. The frame draws the separators as SVG chevrons, so the text is now `"Cases\nSAMPLE-VV-FAMILY-1\nCase check from confirmed facts"`.
  - `check_screen01_browser.cjs:360`: 115/116. It expects `getByText("Page not found")` once on `/new`. It now appears twice: in the line and in the notice.
  - `check_w1_programs_s2.cjs:293`: 89/90 on two runs. It reads the Path nav right after `waitForURL(/c/…/forms)`. The frame's line exists at once with the address words ("Immigration programs › Combination"), so the test reads them before useWhere names the levels.
  - **Fix**, using selector or wait changes only (no assertion weakened):
    - c69: read the crumbs element by element and join them with " › ". Alternatively, draw the separator as `aria-hidden` text "›".
    - screen01: scope the count to `main`'s notice.
    - programs_s2: wait until the line shows the combination's `[data-place]` crumbs before reading.
  - Then run all 146 selected suites. I also ran these at d2705074e and they passed: check_qa317_sheet_browser 34/34, check_c76_ready_browser 53/53, check_s6_queue_browser 35/35 (the first run lost its server mid-run; the re-run is green), and check_bk3_frame_browser 318/318 twice.

## Minors
- **m1 (Must; EXPERIENCE §1 [M] "14 px UI text, 12/16/18/24 steps; no one-off values"):** `frame.tsx:37` sets `text-[13px]` on every screen's line. Fix: `text-sm` or `text-xs`.
- **m2 (Should):** Client A opening `/cases/:id` sees "Back | Client questionnaire › Page not found" over the notice "This page is for the case officer" (walk/07). The route exists. Cause: `where.ts:22` uses `CASE_PAGE[undefined]`. Fix: give the client the case words (or "Case") when there is no `s[2]`, and walk every case route as the client in check_bk3_frame.ts.
- **m3 (Should):** The representative's review (a journey step) and the officer's view of the client questionnaire read "Cases › Case › …" with Back titled "Back to Case". The case page, eligibility, review and answer sheet all name the reference. Cause: `representative-review.tsx` and the questionnaire page do not call useWhere. Fix: call useWhere with the reference, as `eligibility.tsx:133` does.
- **m4 (Should; WCAG 2.4.4, EXPERIENCE §1.12):** `frame.tsx:39`: the link's accessible name is "Back". The destination is only in `title`, which is a description and appears on hover only. On top-level pages the target appears nowhere on screen. Fix: name the target in the link, either visibly ("← Immigration programs") or with `aria-label="Back to …"`.
- **m5 (Should; review check 6, retrofit):** Nothing records that the line maps to the team's `PageScaffold` header crumbs, or that the other-area link is a demo stand-in that switches the simulated person until BK-4. Fix: one line in the PR or a build note.
- **Nits:**
  - App.tsx:34-35's comment still says the case area "has its own shell".
  - representative-review.tsx:126: indentation is left over from the removed link.
  - JobTrail with no combination reads "AI work › …", while /ai/:id reads "History › AI work › …".

## Not checked
- The other 138 selected suites and the checkpoint packs (CI's ready run).
- A real screen reader.
- Dark theme.
- An intended user's unaided walk (D17 and D20 stay with the founder).

Journey test: `journey-test-reviewer-2026-11-11.md`, **8/10** (pass, no 0).

**Verdict: Block.** To fix: **M1** (three red suites, then the full run green). Also fix m1 (an [M] line) in the same push. m2-m5 are Shoulds: fix them or list them with a follow-up row.
