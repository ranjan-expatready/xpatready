# BK-2 Fold-out arrows: journey test (reviewer role, 10 Nov 2026)

Commit 7fc6f108c · reviewer's isolated copy review_bk2 on :4446 (configured checkpoint, live AI off, US$0, no priced button; stopped afterwards) · headless Chromium, reduced motion · screenshots kept outside the repo (reviewer scratchpad), none committed.

## Journeys (persona · goal · steps · expected)
1. **Main, content publisher (configuration author), Immigration programs.** Goal: "open Temporary residence to see its programs". Tab to the band's button, Enter. Expected: the arrow points right, then turns down, and aria-expanded goes true. Enter again closes it.
2. **Author, combination › Questionnaires.** Goal: "see the questions in one section". Tab to the section header, Enter. Expected: the same arrow, beside the title, also at 375 px.
3. **Author, combination › Preview.** Goal: "try answers that change what applies". The native fold-out opens with Enter and its arrow turns.
4. **Case officer, case page.** Goal: "see why a document is needed and how readiness is worked out". Tab to Source, Not needed now and How this is worked out; Space toggles each.
5. **Alternate, 200 % zoom (512 px).** The case page's fold-outs keep the arrow on the text line, with no sideways scroll.
6. **Sweep across the screen boundary.** Every set-up screen (13 studio routes, 7 combination tabs). No raw `<details>`, and no visible `aria-expanded` control without the arrow, except the listed comboboxes, form openers and "Show all n".
7. **Break it.** Planted bad code against the scan (see review.md m1-m3). Nested fold-out: the inner one stays pointing right while the outer is open (CSS child combinator, read in index.css). Reload: each fold-out comes back in its default state (closed, or the conditional `open` defaults), as before the PR.
8. **Wrong role and data.** Not applicable: no data path, no server change. The tree row toggle stays mouse-only (m5, from before this PR).

## What held
- Journeys 1-3 at 1440 and 375 px: 51/51 checks in the builder's browser script, re-run on :4446 (arrow seen ≥ 10 px, `rotate` none → 90deg → none, tabIndex 0, axe WCAG 2.2 A/AA 0 violations, 0 page errors).
- Journey 4: 5/5 case-side fold-outs toggled by Space, and each arrow turned. Clip: "> Source" became "v Source"; "How this is worked out" (flex summary) kept the arrow left of the text. One arrow only: the browser marker is gone (`list-style-type: none`).
- Journey 5: `scrollWidth` 512 at 512 px.
- Journey 6: 41 fold-outs and aria-expanded controls met on the way, none without the arrow.

## Findings
No Blocker or Major. Minors m1-m6 are in `review.md` (scan loopholes m1-m3, the release-update aria-expanded inconsistency m4, the tree row not reachable by keyboard m5 from before this PR, a duplicate import m6).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1-4 open and close every fold-out tried |
| Next step obvious | 1 | the right-pointing arrow shows there is more inside (BIC-14) |
| Plain words | 1 | summary text unchanged on all 31 fold-outs (diff) |
| Feedback and state | 1 | the arrow turns with open / aria-expanded (measured rotate) |
| Correct data | 1 | no data path; data-* attributes and `open` defaults kept (diff) |
| Error recovery | 1 | reload returns the same defaults as before; nothing to lose |
| Accessibility and screen sizes | ½ | axe 0, keyboard on every FoldOut and button fold-out, 375/512 px fine; tree row fold not reachable by keyboard (m5, from before this PR) |
| Speed | 1 | CSS turn only, no request; toggles under 150 ms |
| Visual quality | 1 | one arrow, team token colours, aligned on inline, flex and section-header summaries |
| Trust and sources | 1 | Source fold-outs on the checklist work as before |

**Score: 9.5 / 10, no 0: pass.** Most valuable fix to reach 10: m5 (ArrowRight/ArrowLeft on a Program structure row, or a focusable fold button).

## Could not test
A real screen reader. Safari and Firefox. Dark theme. A bundle rebuilt at 7fc6f108c (web/dist must not be rebuilt in this copy). An intended user's unaided walk (D17/D20 stay with the founder).
