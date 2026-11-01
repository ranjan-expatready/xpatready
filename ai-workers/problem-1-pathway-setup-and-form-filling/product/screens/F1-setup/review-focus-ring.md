# Review: visible focus ring app-wide (WCAG 2.4.7), commit d5c64bea

Reviewer: independent (did not build it). Branch `claude/screens-focus-ring`, commit d5c64bea on origin/main (c582e8d8).
1 Nov 2026, US$0. App: the worktree copy on :4443 (database `xr_studio_screens_focus`); its served CSS has the new
`:focus-visible{outline:2px solid var(--color-ring);outline-offset:2px}` inside `@layer base`. Never :4400.
Journey test: `journey-test-reviewer-2026-11-01-focus-ring.md` (9/10, passes).

## How it was checked
- `tests/check_focus_ring_browser.cjs 4443`: 17/17, then 17/17 again.
- Own probe (headless Chromium): 70 Tab presses on 15 more pages, light and dark: To review, Structure, Proposals,
  combination Overview/Sources/Preview, Fields, Sections, Documents, Checks, Release, Releases, Activity, AI work, /cases.
  For each stop: no indicator, or a double one (outline and ring). axe WCAG 2.2 A/AA on each, light.
- Keyboard into the Demo menu. Focused controls captured light and dark. 1024 px and 720 px at DPR 2 (200 % zoom).
- Mutation: the rule injected unlayered.
- Ring contrast worked out from the tokens (tokens.css:113, :138, :160, :180).
- `grep -rn outline-none web/src`: 64 uses. Every one without a ring on the same line was read.

## What holds
- The old reset is gone (index.css:19-23). The rule sits in `@layer base`, so Tailwind's `outline-none` utilities on the
  primitives beat it: **0 double indicators** in 40 stops on Immigration programs. With the rule unlayered: 37 of 40.
- Light ring is #0862c5, 5.89:1 on white. Dark ring is #2aa1ff, 5.59:1 on raised and 6.00:1 on surface. Both solid.
  The header comment is accurate: dark `--color-primary` is a 22 % tint (#0694ff38), so the ring token is the right choice.
- Both "Acting as" selects now show the outline (App.tsx:162, runtime/cases.tsx:45).
- axe found no violation on any of the 18 pages. No page errors. No sideways scroll at 1024 px or 200 % zoom.
- The fail case is real: it puts the old reset back unlayered, and the check finds the bare logo link and the selects.
- run-suites.sh picks the new check up through its usage line.
- `outline-none` with no ring that is correct to keep:
  - Dialog and drawer containers (controls.tsx:82, :108).
  - `tabIndex={-1}` headings and summaries that only receive programmatic focus (forms.tsx:122, questionnaire.tsx:382,
    :392, overview.tsx:31, job.tsx:217).
  - FOCUS_RING, which draws its own ring (focus-item.tsx:9).
  - tabs.tsx:45 and badge.tsx:14, whose ring is on the next line.

## Findings
**Major 1. One focusable select still has no focus indicator: "Kind of item" on To review.**
- Where: pages/to-review.tsx:66, `bg-transparent … outline-none` with no ring. It is the same pattern this commit fixed
  in the two "Acting as" selects.
- Evidence: my probe reports it bare in light (`select "Kind of item"`). Screenshot
  /tmp/rv/shots/3-review-kind-select-focused.png shows the select focused and looking exactly like it does unfocused.
  It fails WCAG 2.4.7, which is the criterion this item exists to close.
- Fix: drop `outline-none` at to-review.tsx:66. Add `/review` to `PAGES` in the check, so this regression is caught.

**Minor 2. The check does not guard the "one indicator only" property the commit claims.**
- Where: check_focus_ring_browser.cjs:41 counts `outline || ring` as a pass.
- Evidence: with the rule moved out of `@layer base`, 37 of 40 stops draw both an outline and a ring, and every
  assertion would still pass.
- Fix: also fail when `outline && ring`.

**Minor 3. The primitives' `focus-visible:ring-ring/50 ring-[3px]` ring is visible, but below 3:1.**
- Measured: 2.24:1 on white (#0862c5 at 50 %) and 2.46:1 on dark raised (#2aa1ff at 50 %). Screenshots
  4-control-ring50-light.png and 5-control-ring50-dark.png show a clear soft halo. That meets 2.4.7 and the
  EXPERIENCE.md:29 "visible focus" line.
- Gap: it falls short of the 3:1 that W3C's Understanding 1.4.11 applies to focus indicators. It is also a second style
  beside the solid 2 px outline.
- Fix if taken: `ring-ring` (solid) in the shared primitives (controls.tsx:12, :41, :45, :49, :156; tabs.tsx:47;
  badge.tsx:15). This does not block.

**Minor 4. Two keyboard focus indicators are faint.**
- Destructive buttons override the ring to `focus-visible:ring-danger/20` (controls.tsx:21): 1.37:1 on white.
- Menu items show focus only as a background tint, with `outline-none`:
  - `data-[highlighted]:bg-text/5` (App.tsx:182, sources.tsx:115): 1.10:1.
  - `bg-surface` on a white menu (library-forms.tsx:283, workspace/forms.tsx:182): 1.07:1.
  - Screenshot 2-demo-menu-highlighted.png shows the highlighted item.
- This is older than the commit, not a regression, but it is in the app-wide 2.4.7 scope.
- Fix: a solid `ring-ring` on destructive. For menu items, a stronger highlight such as `bg-primary/10` with
  `text-text`, or an inset ring.

## D1–D20 (only the ones this change touches; the rest are unchanged by a CSS-only fix)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Does what the tech lead asked: ring on the brand colour, axe and keyboard on 3 pages. One select missed (Major 1). |
| D11 | 4 | Focus state shown on 66–70 stops per page; Kind select and menu highlights weak (M1, m4). |
| D12 | 4 | Clean 2 px offset ring; two indicator styles side by side (m3). |
| D13 | 4 | Keyboard and axe clean on 18 pages; 1024 px and 200 % fine; one bare control; primitives' ring under 3:1. |
| D14 | 5 | Team tokens (`--color-ring`) and the team primitives' own ring are kept. |
| D16 | 4 | The rule's test fails when the rule is removed; it misses double indicators and To review (m2, M1). |
| D17, D20 | — | Simulated only. |

## Could not check
- A real screen reader. Windows high-contrast mode.
- Safari or Firefox: only Chromium was used.
- An intended user's unaided walk.
- `graph.mjs`: not run, because it rewrites qa/GRAPH.md and this review may write only its own files.
- There is no concept.md for this item; the tech lead's ask was the spec.
- Screenshots are in /tmp/rv/shots, outside the repo. The write scope is the review files only.

**Verdict: Block.** Fix before `review: approved`:
1. Major 1: pages/to-review.tsx:66, remove `outline-none` from the "Kind of item" select, and add `/review` to the check's `PAGES`.

The Minors are Should and can follow in this PR or another one.
