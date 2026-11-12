# Journey test: BK-4b Studio hand-offs (reviewer role, 11 Nov 2026)

Skill journey-test, run by the reviewer (the one score for this check). Commit `2e99ebb9b` (code the same at `c84b9d177`). An isolated copy `screens_bk4r` on :4475, the configured checkpoint, headless Chromium through Playwright, axe WCAG 2.2 A/AA. US$0, live AI off. The scripts and screenshots are in the reviewer's scratchpad (`walk.cjs`, `focus.cjs`, the builder's walk copied with its screenshot folder redirected). Nothing in the repo was run that writes files.

## Journeys (persona · goal · expected)
1. **Main path:** the Configuration author · "get my Visitor visa change released and a case opened on it" · submit → hand to the Content reviewer → they sign → hand to the Approver → release → "Open a case on Release N (as Case officer)" → dialog with the combination chosen → case opened. Every person change by a button.
2. **Alternate (return):** the Content reviewer returns it with a note → "Hand back to the Configuration author" → the author submits again.
3. **Library item, wrong person:** the proposer of a waiting library change opens it · "who decides this?" · a hand-off to a review-duty holder who is not the proposer.
4. **Keyboard only:** submit with Enter, Tab to the hand-off, the tooltip on focus, Enter.
5. **Screen sizes:** the hand-off at 1024 px, 200 % zoom (720 px), 400 px and 375 px.
6. **Stale (error):** the author edits after submitting · the hand-off must go ("Submit again" is theirs).
7. **Wrong role by URL:** the Case officer types `/c/:id/review`.
8. **Recovery:** reload after a hand-off; double click on a hand-off.
9. **Release page, nothing ready (empty):** the author opens `/release` when the only change is not submitted.
10. **Across the boundary:** the open-case hand-off lands in Cases with the dialog open.

## What held
* J1 and J2: the builder's walk, re-run, gave **39/39 PASS**. The trail was `user-A → user-C → user-A → user-C → user-B → user-O`, with 0 changes outside a hand-off. Case `BK4B-WALK` was read back through the API on the new release (Release 7) of the Visitor visa. Each hand-off's words were as the concept writes them ("✓ Submitted · Next: the Content reviewer signs the immigration content.").
* J3: the proposer `user-A` → `user-C` (review duty). After the hand-off, Approve shows and the hand-off does not.
* J4: 1 Tab from "Submit for review" to "Hand to the Content reviewer →". The tooltip opens on focus. A 3 px focus ring. Enter → the reviewer's page in 323–347 ms.
* J5: no sideways scroll at 1024, 720, 400 and 375 px. The button is 32 px high and fits. axe found 0 violations at each width.
* J6: a stale submission shows no hand-off. Restoring the change brings it back. After a release, the echo goes once the author changes the draft.
* J7: no hand-off. The server refuses the Studio reads (403), as before.
* J8: a reload keeps the new person and shows no hand-off. A double click is harmless (one change, no page error).
* J10: `/cases?open=<id>` opens the dialog with "Combination (released)" set, as the Case officer.

## Findings
* **Major (J9):** `web/src/pages/release.tsx:84` offers "Hand to the Approver →" whenever the person lacks the approve duty, even when nothing passed review. Seen: Visitor visa "Held back: Not submitted for review", button "Nothing ready to release" (disabled). The hand-off still says "Next: the Approver releases what passed its review". Clicking it leaves the Approver on the same disabled button. The next step was the author's own submit (BR-2). Screenshots: scratchpad `r-A-release-nothing-ready-author.png`, `r-A-release-nothing-ready-approver.png`.
* **Minor (J4):** after a same-page hand-off, focus falls to `<body>` (`components/hand-off.tsx:33-36`). The next Tab lands on the validation list's "Show all".

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: case opened by buttons only; 39/39 |
| Next step obvious | ½ | J1–J3 clear; J9 names the wrong next person |
| Plain words | 1 | Role names from data; "(simulated)", "(as Case officer)" |
| Feedback and state | 1 | ✓ line; "You are acting as …" updates; stale and released states right |
| Correct data | 1 | The trail is exact; the case is on the new release; nothing else changed by 4b (web only) |
| Error recovery | ½ | J9: the Approver lands on a disabled button with no way on |
| Accessibility and sizes | 1 | J4, J5: axe 0 at 5 widths, keyboard complete (focus drop is Minor) |
| Speed | 1 | 323–347 ms per hand-off |
| Visual quality | 1 | Secondary button, one filled button per panel, team components |
| Trust and sources | 1 | Rights on the server (J7); the duty picks the target |

**9/10: pass** (8 or more, no 0). To reach 10: fix J9 (show the Release-page hand-off only when something would be released), then return focus after a same-page hand-off.

## Not tested
A real screen reader. The "no one holds the duty" state (no workspace without an approver). The must-verify, merge, held-file and form-fields hand-offs in a browser (code read only). An intended user's unaided walk (D17/D20: the founder).
