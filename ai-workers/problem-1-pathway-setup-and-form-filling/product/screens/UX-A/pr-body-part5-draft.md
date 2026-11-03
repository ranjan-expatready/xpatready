No contract or schema change. Builds on #643 (UX-A finding 4, merged 3 Nov 04:29 UTC). Draft PR body, not opened (all lanes closed 03:55 UTC). The last UX-A PR.

## What and why
Row **UX-A, finding 3** (BACKLOG; founder decision P-273; UX baseline of 2 Nov, finding 3): *always-on explanations crowd the screens*. Program structure printed a "Can't retire yet / Can't delete: …" paragraph under rows; Questionnaires printed "Remove from questionnaire: not here…" under every section that asks something; Forms printed "Attached from the Form library: not set up as a line yet…" on each such row. The best-in-class pattern (Linear, Stripe): a greyed control with its reason as tooltip and description.

Now, on the three screens finding 3 names:
* **Program structure**: no reason paragraph under rows; the greyed Retire or Delete carries its reason as its tooltip and its description (`aria-describedby`), for an author and for a reader (an approver hears "Only a configuration author deletes, retires or restores names. You can read everything."); the details (Edit) still list each use in words.
* **Questionnaires**: a section that asks this person something has a greyed "Remove from questionnaire" whose reason is its tooltip and description (one sentence, never pieced together); a section that asks nobody keeps a working Remove.
* **Forms**: an attached form not set up reads "Attached, not set up yet", the explanation in a tip.
* **Reachable everywhere**: the tip that carries a greyed control's only reason (`Tip explain`) opens on hover, keyboard focus, a **tap** (a phone has no hover), Enter or Space; Escape or a tap elsewhere closes it; activating the greyed control opens nothing.
* This amends P-116's (and P-147 (1)'s) visible reason line under P-273: see Questions 0.

**Review and break rounds** (`product/screens/UX-A/review-part5*.md`, `break-report-part5*.md`): review M1 the check was flaky (read the previous element's closing tip; a silent wait); breaker m1 "question s" in the screen-reader text; m2 a tap on a phone showed no reason; m3 Enter closed the tip; m4 an approver's greyed actions pointed at a description that did not exist; m5 the greyed Remove's name repeated "not available". All fixed. Reviewer **Approve** (journey 9.5/10, the check 33/33 in 8 of 8 runs) and breaker **pass** on d658e76a (the product code of this PR). Replayed onto main with no conflict.

## Plan (as built)
1. `web/src/components/status.tsx`: `Tip explain` (opens on tap, Enter, Space). 2. `web/src/components/lifecycle/index.tsx`: the greyed row action uses it. 3. `web/src/pages/structure.tsx`: no BlockedLine under rows; the hidden description for every greyed action. 4. `web/src/pages/workspace/questionnaires.tsx`: greyed Remove with one reason string. 5. `web/src/pages/workspace/forms.tsx`: "Attached, not set up yet" with its tip. 6. Checks; `qa/built/UX-A.md`.

## Files touched (L7 owns K3, K13, K10; L2 owns C11.12, G1: no file of their open PRs)
`web/src/components/{status,lifecycle/index}.tsx`, `web/src/pages/structure.tsx`, `web/src/pages/workspace/{questionnaires,forms}.tsx`; tests new `check_uxa5_tooltips_browser.cjs`, and `check_w1_structure_browser.cjs`, `check_qa92_95_browser.cjs` (they read the reason from the description, not a paragraph); `product/qa/built/UX-A.md`; screenshots `uxa5-*`; reports (and #643's replay review, `review-part4-r5.md`).

## Checks and results
* New `tests/check_uxa5_tooltips_browser.cjs`: **33 steps** — none of the three long sentences is on the page's text; each greyed control's description says why and its tip opens on keyboard focus (read by its own words, waits fail loudly); Enter keeps the reason open; a tap on a phone (400 px, touch) shows it on all three screens and opens no panel or dialog; the description is one sentence; as an approver every greyed action has a description; clicking a greyed control opens nothing; 1440, 1024, 400 px; axe clean.
* On today's main + this PR (no conflict), all exit 0: check_uxa5_tooltips_browser, check_w1_structure_browser (141), check_qa92_95_browser, check_c119_library_items_browser, check_s5_slice3_browser, check_forms_s4_library_browser. count-any 422 = base.

## On the demo
http://localhost:4400 → Program structure: no "Can't retire yet" paragraphs; hover, Tab to or tap a greyed Retire or Delete for its reason. With an LMIA › Questionnaires: greyed "Remove from questionnaire" with its reason. Visitor visa › Forms: "Attached, not set up yet" with its tip.

Cost: US$0 (no model call).

## Minors (follow-ups)
Two tips can be open at once (an explain tip and a hovered plain tip); after a mouse click the tip stays until Escape, a click elsewhere, Tab or scroll (the 433-character Structure reason then covers part of the filter row); the check tests Enter on Questionnaires and Forms but not on Structure, and never Space (both work by hand); Questionnaires' reason ends "change the placement there" without a link (older wording); the Form library still prints 8 "Still used: …" lines (not one of finding 3's screens: a follow-up row); `filing_not_set` has no landing (from part 3's list).

## Questions
0. **Record the amendment** of P-116's visible reason line and P-147 (1) under P-273 (finding 3: the reason is the greyed control's tooltip and description; the details still list each use). Recommendation: one line under P-273.
1. **The Form library's "Still used" lines** (same pattern, a screen finding 3 does not name). Recommendation: a small screens row after UX-A.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01MXNda7gyK2jKePNQXi8g6R
