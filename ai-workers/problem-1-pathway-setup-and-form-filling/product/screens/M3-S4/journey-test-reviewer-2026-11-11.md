# M3-S4 journey test: reviewer (11 Nov)

Commit `08768fc3cc43d7c3bb31f0db533414c52191673e`. Copy `rv_m3s4` on :4437, configured checkpoint, live AI off, US$0, stopped afterwards. Headless Chromium through Playwright. No visible browser was available in this cloud session, so the walk used only what the screen shows: role names, labels and data attributes for finding things.

Screenshots (j1–j4) are in the reviewer's scratchpad and are not committed: the brief allows only this file and review.md. The builder's `walk-5` shows the same figure count as j2.

## Journeys
1. **Main path: case officer, Study permit.**
   * Goal: "the letter of acceptance can never be waived, so I cannot file until it arrives."
   * Steps: a new case, with forms, review and warnings done by the pack helper (set-up). Then ⋯ on the letter, read the Ready to file panel, press Ready to file, upload the letter, press Ready to file again.
   * Expected: blocked, then allowed.
2. **Author, keyboard only, Spouse sponsorship.** A combination the fee table never marked.
   * Goal: "make the passport line never waivable."
   * Steps: Documents › Details › Edit › "Waiver on a case" › Never waivable (Space, arrow keys) › Save to draft. Then reload and open the drawer.
3. **Guard gone: case officer, Spouse sponsorship.** The checklist is shown for a combination that was never marked, and Prepare carries its documents.
4. **Alternate: Not applicable before never.** The passport was marked Not applicable by screen. Then a release said never, and the case was moved to it (API: another row's screens).
5. **Wrong role and break.**
   * A client requests a line; the author waives a line; a client sends Not applicable with an empty body.
   * Passing the block with a reason, on the FS filing.
   * A second Ready to file press.
6. **Crossing to the next screen:** the "Start next stage" preview words.

## What held
* J1:
  * The line reads "Never waived: Ready to file waits until it is received". Its ⋯ menu (keyboard) offers Request, Upload a file… and History, with no Waive… and no Not applicable….
  * The panel shows "Blocks: fix it" with no Pass control.
  * Ready to file is refused: "1 block (fix it: …) stands before Ready to file", naming the letter.
  * After the upload, the line is Received, the block is gone and the filing is `ready_to_file` (1.1 s).
* J2:
  * The radio group works by keyboard, and its stored draft is `never|DRAFT`.
  * After a reload the drawer says "Never: no waiver and no Not applicable; Ready to file waits until it is received".
  * Release review says "Passport information page copy (now never waivable: it blocks Ready to file until received)".
* J3:
  * The FS checklist shows 3 lines, with no "Not worked out" notice.
  * Prepare has 3 document items and 3 "not received" warnings.
* J4:
  * The line stays Not applicable, `required: true`, and the readiness block is raised.
  * The menu offers only Request again and History. The count reads "0 of 3 received".
* J5:
  * Client 403. Author 403 ("works on configuration, not on cases").
  * Passing the block: 409 "…cannot be passed: fix it instead."
* J6: "2 documents on the checklist" (the Work permit stage).
* axe WCAG 2.2 A/AA: 0 problems on the author dialog, the checklist and the blocked readiness panel. No sideways scroll at 1024 or 400 px. No page errors.

## Findings
* **Major:** the readiness figure ticks "Letter of acceptance for Sample Student R · Done" while the block says it is not received. The count reads "8 of 9 done"; it should be 7 of 8 (j2-readiness-blocked; `engine/runtime/readiness-figure.ts:80`).
* **Major (pure probe, not on screen):** a never-waivable requirement whose condition is false merges into a needed plain line and blocks it (`engine/runtime/case-checklist.ts:231`).
* **Minor:**
  * J4 shows "Not applicable" next to "Never waived: …" with no hint to request it again.
  * A client's empty-body Not applicable gets 400, not 403.
  * The audit table had 0 rows keyed by the letter's line id after the upload. Not this row's rule; I did not chase it.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J2 end to end |
| Next step obvious | 1 | The line and the block both say "waits until it is received"; Upload is in the menu |
| Plain words | ½ | Kept and Not applicable lines get words that are not true (review m1, m2) |
| Feedback and state | ½ | The figure contradicts the block (M1) |
| Correct data | ½ | Database writes are exact. The figure count is wrong, and the merge blocks on a rule that does not apply |
| Error recovery | 1 | 422, 409 and 403 in words; nothing changed (DB read) |
| Accessibility and screen sizes | 1 | Keyboard radio and menu; axe 0; 1024 and 400 px |
| Speed | 1 | Ready to file 1.1 s; checklist page 2.1 s on first load |
| Visual quality | 1 | Team pills and radio group; danger tone only on the block |
| Trust and sources | 1 | Release review names it; the drawer shows it to every role; Source fold-out; Sample labels |

**8.5 / 10, no criterion at 0: pass.** The most valuable fixes are M1, then M2, then the words in m1 and m2.

## Could not test
* A real screen reader, and a visible-browser walk.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* Two tabs releasing the same line at the same moment. The release path is not this row's.
