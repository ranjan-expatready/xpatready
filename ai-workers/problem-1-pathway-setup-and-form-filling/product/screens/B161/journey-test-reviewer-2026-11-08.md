# B161: Paper line steps by screens: journey test, reviewer (8 Nov 2026)

Reviewed commit `f3278cd4c`. Isolated copy `rev_b161w` on :4462, loaded with the configured checkpoint, now stopped. Headless Chromium on Linux, through a scratch Playwright script. Screenshots are in the reviewer's scratchpad and are not committed; the builder's `screenshots/1-5` are also used. Sample data only, US$0.

## Journeys (from B3 concept §1 and §3, and the B161 row)
1. **Main, keyboard only, 1440 px.** A case officer gets IMM 5257 (moved to Paper with a written reason, with a validated copy read back) printed, then signed in pen. Expected: Printed, then Signed in pen, each recorded with who and when; one button at a time.
2. **Out of order.** Before Printed, the officer looks for "Signed in pen". Expected: no button, and "Cannot start yet" in the server's words.
3. **Re-sign: a fact changes after Printed.** Expected: Signed in pen not offered; the block says to validate again.
4. **Re-sign: a newer validated copy is read back after Printed.** Expected: "print that one" with a new Printed button; Signed in pen not offered until the new print.
5. **Recovery.** A stale second tab; Printed pressed twice; a reload. Expected: a 409 in words, and no second row.
6. **Wrong role.** The client calls the item and step routes. Expected: 403.
7. **Another form.** A non-barcode form (IMM 5645) moved to Paper. Expected: 3 steps with no Validate, and its newest copy named.
8. **Screen sizes.** 1024, 720 (200 % zoom of 1440) and 400 px. Expected: no sideways scroll.

## What held
* **J1.**
  * Printed is reached in 36 Tab presses. The label is "Printed: the validated copy of 8 Nov, 06:21".
  * Enter records it in 817 ms. Focus moves to the "Signed in pen" button.
  * Enter records that too. Focus goes to the block heading.
  * In the database: `print,sign_in_pen`, one row each. The print row's copy is the validated copy.
  * Audit lines name who did each step.
  * axe finds nothing in the block before or after.
  * After a reload, 3 steps are still done.
* **J2.** "Cannot start yet: Signed in pen comes after "Printed": print IMM 5257 first." This is the server's `detail`, word for word (pack -10d).
* **J4.**
  * The block says: "A newer validated copy of IMM 5257 was read back since it was printed: print that one and have it signed in pen."
  * The button reads "Printed: the new validated copy of …". There is no Signed in pen button.
  * Pressing it records Printed on V2 (the server's `restart`, with an audit line). Then Signed in pen is offered, with no refusal.
* **J5.** The stale tab shows "Not recorded: Printed is already done for IMM 5257." (builder's `4-stale-tab-refused-1440.png`; pack -10g). Printing again through the API gives the same 409, and there is still one row.
* **J6.** Client: GET item 403; POST print 403 "Only the case officer can do this."
* **J7.** The block shows 3 steps. "Printed: the copy of 8 Nov, 06:24" is recorded. The changed fact (family name) is not read by IMM 5645, and the screen and the server agree on that (no restart).
* **J8.** No sideways scroll at 1024, 720 or 400 px.
* No page errors. The pack `C7.6-screen.test.ts` passed 6/6 on 3 runs in a row (gate B, then 2 runs on :4462).

## Findings
* **Major (J3).** After Printed, a fact change makes the validated copy Out of date.
  * `/prepare` then counts Printed as not done.
  * The block still ticks Printed and offers an active **Signed in pen** button (`web/src/runtime/sign-steps.tsx:285-300`).
  * Pressing it is refused: "Signed in pen is for the validated copy of IMM 5257 printed now: a newer validated copy was read back since it was printed…".
  * The button stays offered after the refusal. Screenshot: `r4-fact-changed-refused-1440.png` (reviewer's scratchpad).
* **Minor.** The button names the copy by its read-back time; the done row names it by its creation time (06:03 against 06:02; builder's screenshot 4) (`:283` against `:305`).
* **Minor.** A non-barcode Print loses `SignBlock`'s BR-4 reasons ("out of date", "being generated", "file missing", the "Copy, not for filing" stamp, the fill-trial warning) (`:282-292`).
* **Minor.** There is no stale-copy guard before a non-barcode Signed in pen (`SignBlock`'s `printedCopyStale`), and the server does not check it either (`api/src/sign-steps.ts:116`).
* **Minor (server, for the tech lead).** In J3 the 409's words name the wrong cause.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 by keyboard at 1440 px; data correct |
| Next step obvious | ½ | One button on the main path; the wrong button in J3 |
| Plain words | ½ | Plain overall; two dates for one copy; J3's refusal untrue |
| Feedback and state | ½ | Toasts, ✓, focus; but ✓ Printed under an "Out of date" pill (J3) |
| Correct data | 1 | One row per step; validated copy recorded; audit; 403 for the client |
| Error recovery | ½ | Refusals in words and focus to the heading; the refused button stays offered (J3) |
| Accessibility and screen sizes | 1 | Keyboard path; axe clean; sr-only step state; no sideways scroll at 1024, 720 or 400 px |
| Speed | 1 | Step plus re-read about 0.8 s |
| Visual quality | 1 | `SignBlock`'s layout and team components |
| Trust and sources | 1 | Copy named; who and when; no AI |
| **Total** | **8/10** | Pass (8, no criterion at 0). Fixing J3 raises Next step, Feedback and Recovery. |

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* Two officers pressing Printed at the same instant (the server's unique row and 409 are B132's).
* The read-only state after a recorded submission on a Paper line.
