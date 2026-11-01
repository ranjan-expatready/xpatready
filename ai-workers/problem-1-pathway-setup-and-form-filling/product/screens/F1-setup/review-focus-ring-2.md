# Review 2: visible focus ring app-wide (WCAG 2.4.7), head 2dcc5a50

Reviewer: independent (did not build it). Branch `claude/screens-focus-ring`. The commits under review:
- f8d0bd17 fixes review 1 (`review-focus-ring.md`, which blocked d5c64bea).
- 2dcc5a50 merges origin/main (751cbc42) into it.

1 Nov 2026, US$0. App: isolated copy `rvwfocus` on :4447 (database `xr_studio_rvwfocus`), never :4400.
- The served bundle is the merged head. It has the Kind select without `outline-none`, and main's
  "Deleted from the library" and `data-focus-also`.
- Its CSS still has `:focus-visible{outline:2px solid var(--color-ring);outline-offset:2px}` in `@layer base`.

Journey test: `journey-test-reviewer-2026-11-01-focus-ring-2.md` (10/10, passes).

## How it was checked
- `node tests/check_focus_ring_browser.cjs 4447` on 2dcc5a50: **31 passed, 0 failed**.
  - That covers 4 pages × light/dark, To review included.
  - It includes the new "no control shows two indicators" step, axe on each page, and the built-in fail case.
- **Fail cases**, using a copy of the check in /tmp (only the require paths and one injection hook were changed):
  - **M1 regression:** `outline-none` was put back on the Kind select at runtime. The check fails on To review in light
    and in dark with `select "Kind of item"` (28 passed, 2 failed).
  - **m2 regression:** the app-wide rule was injected unlayered. "Two indicators" fails on all 8 page/scheme pairs and
    lists the doubled controls (22 passed, 8 failed).
- The Kind select is really reached: it is stop 21 of 39 on To review, in both themes.
- Wider walk, 70 Tabs per page, light and dark, 8 pages: 58/58, no bare stop, no double indicator.
  - The pages: the 4 in the check, plus a combination's Overview, Documents and Questions (which the merge changed)
    and Structure.
- Keyboard to the Kind select at 1024 px (21 Tabs), and at 720 px with DPR 2 (200 % zoom, 10 Tabs). Both show a solid
  2 px rgb(8,98,197) outline, in view, with no sideways scroll and no page error.
- Screenshots (outside the repo, because the write scope is these files): /tmp/rvf/kind-light.png,
  kind-dark.png, kind-1024.png, kind-720.png.
- Merge audit:
  - `git diff c582e8d8 2dcc5a50^2 -- web/src` covers 9 files from main. Only one line adds `outline-none`: the
    `tabIndex={-1}` heading "Deleted from the library" (library-forms.tsx), and it carries
    `focus-visible:ring-[3px] focus-visible:ring-ring/50`.
  - Main's new focus targets (part-problems.tsx, workspace/documents.tsx, workspace/questionnaires.tsx) use
    `FOCUS_RING`, which draws its own ring.
  - `git diff f8d0bd17 2dcc5a50` leaves index.css, the check and to-review.tsx unchanged.
- `grep -rn outline-none web/src`, ignoring lines that also have a ring, finds 14 lines. They are exactly the
  14 accepted in review 1:
  - dialog and drawer, `tabIndex={-1}` headings, FOCUS_RING, tabs and badge (ring on the next line), and four menu-item
    classes (Minor 4).
  - Only the line numbers moved: library-forms.tsx 283→310, overview.tsx 31→34.
- `git status` was clean after every run. The check writes no files, so nothing needed restoring.

## What holds
- **Major 1 (review 1) is fixed.** pages/to-review.tsx:66 no longer has `outline-none`.
  - The select shows the brand outline in light and in dark: kind-light.png and kind-dark.png.
  - `/review` is in the check's `PAGES` (check_focus_ring_browser.cjs:24), and the fail case above shows the check
    catches the regression.
- **Minor 2 (review 1) is fixed.** The check now has `both` (line 43) and a step that fails when a control shows an
  outline and a ring together. The injection above shows that step fails when it should.
- The merge undoes no focus ring and adds no bare focusable control.

## Findings
**Minor A (Should). The new "two indicators" step has no built-in fail case.**
- Where: check_focus_ring_browser.cjs:79-84. The built-in fail case only covers the old reset (the "bare" step).
- Effect: if `both` ever stopped detecting doubles, every run would still pass.
- Evidence: my injection proves the step works today, but the check does not prove it on its own.
- Fix: add a second fail block that injects the rule unlayered on `/` and expects `both.length > 0`.

**Carried over from review 1, still open and not blocking (Should):**
- Minor 3: the primitives' `ring-ring/50` is about 2.2–2.5:1. Use solid `ring-ring`.
- Minor 4: the destructive button's ring is `ring-danger/20`. The menu-item highlights are about 1.1:1:
  App.tsx:182, sources.tsx:115, library-forms.tsx:310, workspace/forms.tsx:182.

## D1–D20 (only the ones this change touches)
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | The tech lead's ask and review 1's Must are both met. 8 pages are bare-free in both themes. |
| D11 | 4 | Focus shows on every Tab stop walked. The menu highlights stay faint (m4, carried over). |
| D12 | 4 | Clean 2 px offset outline on the Kind select. Two indicator styles still sit side by side (m3). |
| D13 | 4 | axe clean, 1024 px and 200 % fine. The primitives' ring is under 3:1 (m3). |
| D14 | 5 | The team tokens and primitives are kept. |
| D16 | 4 | Both regressions are caught (proved by injection). The double-indicator step lacks its own fail case (mA). |
| D17, D20 | — | Simulated only. |

## Could not check
- A real screen reader. Windows high-contrast mode. Safari and Firefox.
- Changing the Kind value by keyboard. The fresh sample has nothing to review, so "All" is the only option.
  Focus and reach were checked; selection was not.
- `graph.mjs`: not run, because it rewrites qa/GRAPH.md. There is no concept.md: the tech lead's ask is the spec.
- An intended user's unaided walk (D17, D20 stay with the founder).

**Verdict: Approve** on 2dcc5a50. There is no open Blocker or Major. Minor A and the carried-over Minors 3 and 4 are
Should: they can follow in this PR or another one.
