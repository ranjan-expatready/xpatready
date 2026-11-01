# Review: X1, W1 setup checklist slice C3, the Overview's setup strip (commit c0ccd2f6)

**Reviewer.** I did not build this. **Scope:** `git diff 19d55bfc..c0ccd2f6`. The changed files are `web/src/components/setup-strip.tsx` (new), `pages/workspace/overview.tsx`, `contracts/setup-checklist.ts` (`itemHref`), `engine/setup-checklist.ts` and `tests/check_x1_overview_strip_browser.cjs` (new). Three tests were moved: `check_screen01_browser`, `check_s5_slice1_browser` and `check_w1_before_forms_browser`.
**Design sources:** concept v4 §7 "Overview" and §8; board v3 §5; the "Slice C3" section of `plan.md`.
**Environment:** isolated copy `rv_c3` on port 4449 (`xr_studio_rv_c3`), sample loaded, no live AI (US$0).

**Verdict: Ship after fixes.** No Blocker or Major was introduced by this diff. The Minors below should be fixed or recorded.

## Suites rerun on c0ccd2f6 (port 4449)
* `check_x1_overview_strip_browser`: 24/24 passed.
* `check_s5_slice1_browser`: 52/52 passed.
* `check_w1_before_forms_browser`: 23/23 passed.
* `check_screen01_browser`: 116/116 passed on a fresh database. It first failed in setup with a 409 "Reset the demo first", because I had already loaded the sample. That was my environment, not a product fault.
* Graph (`tools/graph.mjs`): G1 0 · G2 0 · G3 2 · G4–G6 0. Both G3 routes are attachment routes unrelated to this screen. The strip adds no page and no API route.

## Concept fit (§7 Overview, board §5)
* **Met:**
  * The strip replaces "Missing before firms can use it".
  * There is no people card (P-161 (2)).
  * Five rows, each with: the mark (✓ ● ○ ◐ ⧗, plus `sr-only` "Step n, Next:"), the step, the board's hint line, the engine's summary (never recounted), the tier words when confirmed, and the open items as links.
  * The heading reads "Setup steps · n of 5 done" (· Live).
  * The P-176 overlay: Super visa reads ⧗ with "Waiting for the immigration expert: …" for the author, and ● for the expert. Visitor visa reads ⧗ "Waiting for the configuration author" for the approver.
  * The Overview has no buttons (P-118 Q5).
  * Tab badges equal the strip.
  * `?show=missing` lands on the strip with focus.
* **Declared deviation, accepted:** later steps keep their links, in a muted colour, under "After …". The reason is in `plan.md` C3 and holds: steps 1 and 2 have no confirm control until forms F2.
* **Declared not-built:** the header "Next step" box. Effect seen in the app: on every in-progress sample, the header says "Add n forms from the library" while the strip marks Official pages ● Next and Forms "After Who can be in this application". That is two "next" answers on one page (EXPERIENCE #5). This was already true on the Forms tab since C2 (approved), and the question is open in the PR. It is not counted as a finding here. **The founder's answer is needed before X1 closes.**

## Code
* `itemHref` is now one definition for the engine's `next.href` and the strip.
  * The `tabOfFocus` rule is tested both ways.
  * Removing the rule fails step 1 of the new check. The ⧗ overlay, "After …" and "See on …" checks each fail when their rule is removed.
* The Overview is read only:
  * No migration.
  * No new endpoint, so no server authorisation change.
  * One summary request per page (no per-row requests).
  * `useEffect` deps `[show, !!sum?.setup]` are correct.
* The mark is overlaid in the UI from `viewer.filled` and `next.step` (`setup-strip.tsx:41`). That is a viewer overlay, not a recount, so it is acceptable under §8.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | §7 Overview row content and P-161 (2) are met; the header box is deferred and declared |
| D2 | 5 | Read only; no write path changed |
| D3 | 5 | One `itemHref`; mark and summary come from the engine |
| D4 | n/a | No rule change |
| D5 | 4 | Reload, `?show=missing`, a bad id ("could not be opened") and an unknown `?focus` all land without error |
| D6 | n/a | — |
| D7 | 4 | ◐ is supported; no AI output on this surface |
| D8 | 5 | Path, tabs and strip; "Step n of 5" for screen readers |
| D9 | 3 | Each item is a link to its place, but the header and the strip name different next steps (declared) |
| D10 | 3 | Plain words; the concept's Step 1 and sure/not-sure tooltips are missing; the strip tip is `title` only (Minor 2) |
| D11 | 4 | Marks by shape and text; the strip has no loading or failed state (Minor 4) |
| D12 | 5 | Matches board §5 (01 and 02 screenshots) |
| D13 | 3 | axe is clean in 4 states; 400, 1024 and 512 px (200 %) have no sideways scroll; links have no visible focus (Minor 1) |
| D14 | 5 | Team tokens and Link components |
| D15 | 5 | Strip visible 269 ms after navigation; one request |
| D16 | 4 | Pass and fail per rule; no check covers the Forms landing or the focus indicator |
| D17 | — | Simulated only |
| D18 | 4 | "confirmed by … · sure / not sure" is shown; the Sample label on people counts is lost (Minor 5) |
| D19 | n/a | — |
| D20 | — | Simulated only |

## Issues (ranked)
1. **Minor, Must at app level: strip links show no focus indicator** (EXPERIENCE #12 [M], WCAG 2.4.7).
   * Cause: `web/src/styles/index.css:19` `:focus-visible { outline: none; }`, and plain `<Link>`s add no ring. Computed values while focused: `outline-style: none`, `box-shadow: none` on all five strip links. The breadcrumbs and tabs behave the same.
   * Not a regression: the removed missing-list links had the same gap. That is why it is Minor for this slice.
   * Fix: add `focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm` to the strip links (`setup-strip.tsx:51,56`), and raise the app-wide rule with the Lead as its own item.
2. **Minor, Should: concept tooltips missing.**
   * §7 Copy lists three tooltips: the bar, Step 1, and sure/not-sure. Only the bar text is present, and only as `title` on a non-focusable span (`setup-strip.tsx:36`), which keyboard and touch users cannot reach.
   * Fix: use the team `Tooltip` on a focusable "i", as the board shows. Add the Step 1 tooltip on "Official pages" and the sure/not-sure tooltip on the tier words (`:43`).
3. **Minor, Should: Forms items land unoutlined.**
   * "Add 1 form found" and "Map 1 form" go to `/forms?focus=forms:sources` (or `forms:lines`). No `data-focus` target exists for `forms:finder`, `forms:sources`, `forms:lines` or `forms:held`, so nothing is focused or outlined. Concept §8 says "Enter lands with focus on the item". The new check covers only `people:card` and `documents:lines`.
   * These are the very links the deviation keeps.
   * Fix: add the targets on Forms, or record the gap in `plan.md` against the forms lane, and add a landing step to the check.
4. **Minor, Should: no loading or failed state.** `overview.tsx:25` renders nothing until the summary arrives, and nothing if it fails (EXPERIENCE §4 [M] loading skeleton and error).
   * Fix: a five-row skeleton, and a one-line error with Retry.
5. **Minor, Should: the Sample label is lost.** The old people card said "Numbers Sample until the immigration expert confirms". The strip's "3 person roles, 3 applicant roles" carries no Sample mark, while the board §5 row shows one (AGENTS rule 4).
   * Fix: a Sample tag on the people summary while the step is not done.
6. **Minor: retired wording.** "Nothing is set up on a retired combination." (`setup-strip.tsx:30`) is not accurate, because a retired combination had a setup.
   * Fix: "Retired at Release n. Firms no longer use it." (or the concept's words).

## Could not check
* Retired state: no retired sample.
* The ◐ row: no AI run, US$0.
* A real screen reader.
* D17 and D20: no intended user walked it.
* The header "Next step" swap: deferred to forms F2.

## Retrofit mapping
The old Overview tests were moved to the strip: screen01 items 1 and F2, s5 BR-2, and the w1 people line. `row.missing` is no longer read by the Overview.

Journey score (reviewer): **8/10, pass**. See `journey-test-reviewer-2026-11-01-x1-c3.md`.

Housekeeping: my test runs rewrote tracked screenshots and `evidence/screen01/browser-checks.json`. I restored them to HEAD. This also reset two before-forms PNGs that were already modified in this copy before I started.

**Verdict: Approve on c0ccd2f6.**
* Blockers: none.
* Majors: none.
* Minors:
  1. Links have no visible focus (app-wide; the fix in the strip is one class).
  2. Concept tooltips are missing or `title` only.
  3. Forms items land unoutlined.
  4. No loading or failed state.
  5. Sample label lost on the people counts.
  6. Retired wording.

## Re-review on a770e278 (diff c0ccd2f6..a770e278, 1 Nov)

**What I ran:** web build and `tsc --noEmit` (clean), then port 4449 with the sample loaded.
* `check_x1_overview_strip_browser`: 27/27 passed, including the three new checks.
* `check_x1_tabs_focus_browser`: 28/28 passed. It covers `part-problems`.

**Each minor:**
* **m1, fixed.** `LINK_FOCUS` draws a 2 px primary ring with a 1 px white offset on every strip link.
  * I saw it when tabbing to "Add 1 form found".
  * The check fails if the class is removed: unfocused and focused shadows would then be equal.
  * The app-wide `:focus-visible` reset (`index.css:19`) is still for the Lead.
* **m2, fixed for two of the three tooltips.**
  * The legend is now a visible line (`data-strip-legend`).
  * The Step 1 hint carries the concept's tooltip text.
  * The sure/not-sure tooltip is not added. It is recorded for the PR, so it is not counted here.
* **m3, moved.** It goes to the tech lead as #206's finding 6. Not counted here.
* **m4, partly fixed.**
  * A slow summary now shows "Loading the setup steps…" (`role=status`).
  * A failed summary still shows that loading line forever. I checked this with a 500 on `/summary`, waiting 6 s (`overview.tsx:25`, the `!sum` branch).
  * EXPERIENCE §4 [M] wants an error state that gives the fix.
  * **Still Minor (Should):** show "The setup steps could not be loaded · Retry" when the query has failed.
* **m5, fixed.** A Sample pill sits on the people summary until the immigration expert confirms, and it is checked.
* **m6, fixed.** The retired line now reads "Its setup is kept as it was released; nothing new is set up on it."

**Other commits:**
* 1fab9366 types `part-problems` through the contract. Adding `&& released` changes no behaviour, since the line before already returns when both are empty.
* 7575b36e restores three C1 screenshots.

**Working tree:** my runs rewrote three tracked PNGs in `screens/F1-setup/screenshots/x1-strip/03` and `x1/01, 03`. Restoring them was refused by the permission system, so they are left modified. Discard them before any commit. I committed nothing.

**Verdict: Approve on a770e278.**
* Blockers: none.
* Majors: none.
* Minors open:
  1. A failed summary shows "Loading…" forever (m4 remainder).
  2. The sure/not-sure tooltip (in the PR).
  3. The Forms landing (moved to the tech lead as #206's finding 6).
