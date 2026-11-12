# QA-237 + QA-239 (Bake row 6): journey test, reviewer role, 11 Nov 2026

Reviewer agent (did not build it). PR #1534, commit **915278fcd**, against `origin/main` fbfb263c7. Isolated copy `rv_held` on :4460 (main's source on :4461 for the fail-before run), both stopped after. US$0, live AI off. Headless Chromium (`/opt/pw-browsers/chromium`), not a visible pane: the walk is scripted, so D17 and D20 stay with the founder.

## Journeys (persona · goal · expected)
1. **Main, configuration author + approver on Visitor visa:** "accept the conditions step 5 proposes and have them approved without the draft refusing." Expected: no "Hiding a value a form reads" refusal; a warning says the condition is not used here and why; the B86 panel offers the way to use it.
2. **Alternate, author on Visitor visa:** "use the condition here." Confirm one form field (B86 door), a second person approves → that question carries the condition again, the other six stay held.
3. **Step across the boundary, Study permit's author and approver, who did nothing:** "release Study permit after Visitor visa's approval." Expected: no error, same draft fingerprint, release 201, released questions asked every time.
4. **Error/wrong turn:** a combination whose form reads the answer outside the condition. Expected: warning in words, not a dead end.
5. **Screen sizes and keyboard:** Review and release at 1440, 1024, 720 (about 200 % zoom of 1440) and 400 px; reach "Says the same as this condition" by Tab only.

## What held (evidence)
| Journey | Result |
|---|---|
| 1 | `tests/check_forms_qa237_qa239_held.ts` 22/22 twice on 915278fcd; **11/22 fail on main's source** (Hiding errors, Submit refused for them, Study permit 400). Visitor visa: 6 warnings "Condition not used on this combination: the question "…" is asked every time here, because IMM 5257 reads its answer whenever the form applies …", no field code |
| 2 | Same test: confirming "Free-text details of criminal history"'s one form field → no longer held, condition back on the placement; the other 6 still held (control) |
| 3 | Study permit: fingerprint `9c2a0854…` before and after; release 201; published placements of the 5 held questions carry no condition. Screenshot `sp-1440.png`: v1 released, 0 errors, 25 warnings, the B86 panel under them, "Nothing stops it being released." |
| 4 | Warning plus panel on both combinations (screenshots `vv-1024.png`, `sp-1440.png`) |
| 5 | axe WCAG 2.2 A/AA: 0 violations on Visitor visa and Study permit at 1440, 1024, 720, 400 px; no sideways scroll at any width; first "Says the same as this condition" reached by Tab in 39 (Visitor visa) and 36 (Study permit) presses; no console or page errors. Review tab text in under 1 s after navigation (2.4 s measured including a fixed 1.5 s wait) |

Data underneath: `GET /combinations/:id/config?mode=draft|published` read for both; `held_conditions` lists the 7 (Visitor visa) and 5 (Study permit) questions with their library condition; `library_change` 7 APPROVED placement conditions; ledger unchanged (US$0).

## Break it (short)
* Wrong role and double approval: unchanged doors (B86, B88), not re-broken here.
* Release with held conditions: draft and published fingerprints matched on Study permit (journey 3).
* Reasoned, not reproduced: a condition held **only** because its deciding field exists solely as a draft and has no question could be held in the draft but not in the published rebuild, giving "was changed while it was being released" (review.md m2).

## Findings (severity)
No Blocker, no Major. Minors in `review.md` (m1–m7): the warning's first way out names making the whole form conditional; five stacked "Form fields that read this answer" panels without the question's name (B86 layout, now on every reading combination); the questionnaire tab shows "—" for a held question's condition with no hint.

## Score (0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journeys 1–3 by route; Study permit released 201 |
| Next step obvious | ½ | panel under the warning offers "Says the same as this condition"; but the warning's text leads with "make the form … apply under the same condition", and the stacked panels do not say which question each belongs to (`sp-1440.png`) |
| Plain words | 1 | question meanings, form numbers, no field codes, no bug numbers |
| Feedback and state | 1 | "asked every time here, because …"; panel states Not confirmed / Waiting |
| Correct data | 1 | held placements carry no condition in draft and release; fingerprints match |
| Error recovery | 1 | confirm → in force (journey 2); B86 Undo unchanged |
| Accessibility and screen sizes | 1 | axe 0 at 4 widths, no sideways scroll, keyboard reachable |
| Speed | 1 | under 1 s to the validation block |
| Visual quality | ½ | 25 warnings of long repeated text; panels repeat one heading five times |
| Trust and sources | 1 | "Sample, Unconfirmed: expert" on each panel; AI's words quoted |
| **Total** | **9 / 10** | **Pass** (8 or more, no 0) |

Fixes that would raise the halves, most valuable first: name the question in each panel's heading (or group the warning and its panel); lead the warning's way out with confirming the form fields.

## Could not test
A visible-browser human walk; a screen reader; the repo's own browser walks (`check_forms_b86_panel_browser.cjs`, `check_forms_b88_panel_browser.cjs`: their pinned browser is absent here, left to CI); an intended user's unaided walk (D17, D20).
