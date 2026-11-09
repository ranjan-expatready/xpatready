# Journey test (reviewer): Paper IMM 5257 signed in pen, then Ready to file (PR #1334)

Reviewer role, 8 Nov 2026, head `25a4687ae`. Own isolated copy on :4462 (Demo › Load the configured checkpoint, then the C7.6 pack, then a headless Chrome walk and API/database reads), stopped after. Never :4400. US$0, live AI off.

## Journeys
1. **Main (case officer).** Goal: "Client A cannot apply online: file IMM 5257 on Paper, record that it was printed and signed in pen, and get the filing to Ready to file." Steps: switch to Paper with a reason, then Validate and read back, then Printed (the validated copy), then Signed in pen, then IMM 5476 signed and scanned, then the representative's review, then pass the document warnings, then Ready to file. Expected: each step is recorded once by the case officer, the pen "missing signature" clears, and Ready to file succeeds.
2. **Wrong role (client, other client).** `print` and `sign_in_pen` as `user-P`, and as `user-Q`. Expected: 403, nothing recorded.
3. **Recovery / double click.** Printed again, and Signed in pen again. Expected: 409 in words, no duplicate.
4. **Wrong step.** The hand-signed step `signed` on the pen item. Expected: 409 that names the pen steps.
5. **Screen boundary.** The case page at 1440 and 1024 px after the steps: the Paper line, then Ready to file.

## What held
* J1 through the product's routes: 27/27 on the checkpoint (gate on :4460, and again on :4462). -10b reads `CRITICAL: IMM 5257 for Sample Client A must be signed in pen by the person.`, owed by the client. -10c reads both steps 200 and done. -12 and -19 PASS.
* Data underneath: exactly two live `sign_step` rows for IMM 5257 (`print` with copy `b9868dec…`, which is the `validated_copy`'s form instance, and `sign_in_pen`), both `user-O`. Two audit lines by `user-O`. The channel-change audit line carries its reason.
* J2: `user-P` and `user-Q` both get 403 "Only the case officer can do this."
* J3: "Printed is already done for IMM 5257." and "Signed in pen is already done for IMM 5257." (409).
* J4: "IMM 5257 is signed in pen on Paper: its steps are Printed, Signed in pen. Nothing was recorded." (409).
* J5: no sideways scroll at 1440 or 1024 px, and no console or page errors as the case officer. The client gets 403 on the staff case page, as designed. The first view loads in 1.3-1.4 s to network idle on the checkpoint case.

## Findings
* **Major, outside this PR (the B132 screen).** The Paper line shows no pen steps. `web/src/runtime/sign-steps.tsx:71` renders steps only for `HAND_SCANNED`. On screen, IMM 5257 reads "Who signs: Sample Client A · Signed in pen" with no Printed / Signed in pen, either done or to do. Evidence: the builder's `1-imm5257-paper-no-pen-steps-on-screen.png` and my walk at 1024 px. A case officer can complete J1 only through the API. This PR (test only) cannot fix it.
* Pack Minors m1-m4: see `review.md`.

## Score (each 0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Completed through the product's own route; not possible on screen (finding above) |
| Next step obvious | ½ | The screen says "Signed in pen" but offers no step to record it |
| Plain words | 1 | The warning and the refusals name the form, the step and "Nothing was recorded" |
| Feedback and state | ½ | The API reads both steps done; the screen does not show them |
| Correct data | 1 | Two rows, the right actor, the validated copy, audit lines, no client row |
| Error recovery | 1 | Repeat, wrong step and wrong role all refused in words, nothing written |
| Accessibility and screen sizes | ½ | 1024 and 1440 px clean with no console errors; axe and keyboard not run (no UI changed) |
| Speed | ½ | 1.3-1.4 s to network idle on the case page (budget: first view under 1 s) |
| Visual quality | 1 | Unchanged team look (screenshots 1 and 2) |
| Trust and sources | 1 | "Sample" reason, P-380 Q3 and "Unconfirmed: no counsel" kept; no AI |

**7.5 / 10, no 0. Below the pass bar of 8.** Every ½ except speed traces to the missing on-screen pen steps (outside this diff). Fixes, most valuable first:
1. Render the Paper line's Printed / Signed in pen steps for a `PEN` item (done with who and when, or a button for the case officer), as for `HAND_SCANNED`. This raises task completed, next step obvious, and feedback and state.
2. Run axe and a keyboard pass once that block exists.
3. Look at the case page's first-view time on the checkpoint case.

## Not tested
A real screen reader; 200% zoom; an intended user's unaided walk (D17/D20 stay with the founder); the PR's own CI run.
