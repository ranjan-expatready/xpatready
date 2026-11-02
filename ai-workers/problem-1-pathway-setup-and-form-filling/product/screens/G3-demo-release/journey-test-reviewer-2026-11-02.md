# Journey test: G3 Demo release (C5.6, P-240), reviewer, 2 Nov, PR #471 at 56268d55

Copy: isolated on :4446 (DB `xr_studio_rev_g3`, own worktree, `vite build`). Headless Chromium, Playwright with axe WCAG 2.2 A/AA. Screenshots are in the reviewer's scratchpad, `shots/01…07`. US$0, no model call.

## Journeys (persona · goal · expected)
1. **Main.** Content publisher: "Which of our releases are real and which are demo?" Releases marks each Sample release "Demo release", and the counts line leaves it out of real releases.
2. **Alternate.** Approver on a Sample combination's Review and release tab: "Will this release count?" A mark beside Approve and release.
3. **Workspace release.** The `/release` page lists a Sample row with the mark.
4. **Header.** The combination header shows the mark once the combination is released.
5. **Error (Sample value in a source-backed row).** The author adds a check with no source quote, so it is "Sample". After release, it should be a Demo release (LeadX's answer on #469).
6. **Recovery.** Reload Releases. Marks and counts stay the same (derived on read).
7. **Across the boundary.** The case officer opens a case on the release. Is the demo mark visible on the case?
8. **Sizes and keyboard.** 400, 720 (about 200 % zoom), 1024 and 1440 px. Can the keyboard reach the mark's explanation?

## What happened
- **J1 holds** (after the builder's SQL flip, because no Sample combination is released in a fresh demo). "0 real releases · 2 demo releases (Sample content; not counted as published)". Both rows are marked (screenshot 02). Load 479 ms. axe: none.
- **J2 holds:** the mark sits beside Approve and release (screenshot 07). It floats above the button row's baseline. The same tab's "Released versions" table has no mark.
- **J3 holds:** 1 mark on `/release` (screenshot 06). axe: none.
- **J4 holds:** "With an LMIA · Live · Demo release" (screenshot 04). No sideways scroll at 400 px (05).
- **J5 FAILS (Major).** The product's own check endpoint stored the check `illustrative: true`. It was submitted, signed by user-C and released by user-B as v2, and the snapshot holds 1 illustrative check. `GET /releases` gives `demo: false`, and Releases reads "2 real releases · 0 demo releases" (screenshot 01). Cause: `api/src/studio.ts:1021` reads only `combination.sourceBasis`.
- **J6 holds:** stable across reloads. But because it reads the live row, the SQL flip relabels past releases (v1 too).
- **J7: no mark.** The case header's frozen-release pill (`runtime/cases.tsx:155`) and the Open a case dialog (`:124`) show "release N" with no Demo mark. Overview's "Released versions: Release 2" has none either.
- **J8:**
  - No sideways scroll at 400, 720 or 1024 px.
  - axe is clean on Releases, the combination page, `/release` and the review tab.
  - 60 Tabs never reached the mark. Its tip is a `title` attribute only, and it ends with "(P-240)". The visible counts line on Releases does explain it.
- No page or console errors.

## Data underneath
- `config_release`: v1 SUPERSEDED, v2 RELEASED. v2's snapshot has 1 check with `illustrative=true`, and `combination.source_basis` is SOURCE_BACKED.
- The API says `demo=false` for both. It should say true for v2 (J5).
- The flip test also left a "Row details: source basis changed" draft change on the combination. That is a test artefact, because the draft compares against the snapshot's basis.

## Break-it
- **Sample check in a source-backed row:** Major (J5).
- **SQL basis flip rewrites history:** Minor. It is not reachable through the product, because the basis is set only at create.
- Long text, duplicates, two tabs and a wrong role do not apply: G3 is read-only.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1–J4 hold; J5 miscounts a Sample release as real |
| Next step obvious | 1 | A passive mark; nothing to do |
| Plain words | ½ | "Demo release" and the counts line are plain; the tip shows "(P-240)" |
| Feedback and state | 1 | Counts line plus a mark per row (screenshot 02) |
| Correct data | ½ | `demo:false` on a release holding Sample content (J5) |
| Error recovery | 1 | Derived on read; reload is stable |
| Accessibility and screen sizes | ½ | axe clean, no sideways scroll; the tip is not keyboard-reachable |
| Speed | 1 | Releases first view 479 ms |
| Visual quality | ½ | Review tab mark misaligned (screenshot 07) |
| Trust and sources | ½ | Sample checks are not traced to the mark; the review tab's released versions and the case page are unmarked |
| **Total** | **7/10** | **Below the pass mark (8).** No criterion is at 0. |

## Fixes that raise the score, most valuable first
1. Derive `demo` from the release snapshot: `source_basis` ILLUSTRATIVE, or any check marked `illustrative`. Do the same for draft rows. This raises correct data, task completed and trust.
2. Use the focusable `Tip` and drop "(P-240)". This raises accessibility and plain words.
3. Mark the review tab's "Released versions" rows and align the pill. This raises visual quality and trust.
4. Make the test reach a Demo release through the product, not an SQL flip. Add steps for `/release`, the review tab and the Sample-check case.

## Could not test
- A real screen reader.
- A visible (headed) browser by a person: this was a scripted headless walk with screenshots read.
- An intended user's unaided walk (D17 and D20, the founder's).
- "Refused elsewhere": there is no second workspace.
