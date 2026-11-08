# B161: the Paper line's steps by screens (build notes)

Row: Lead 34's ruling on #1334 (8 Nov). B132 (#1278) gave the routes; this row gives them a screen (P-348 (3), gate A).
Concept: the B3 Sign and scan block (`screens/B3/concept.md`), reused for a form signed in pen on Paper; no new screen.

## What changed
* `web/src/runtime/sign-steps.tsx`: `PenBlock`, under a Paper form's card when its item is signed `PEN`.
  * The rows are the Paper line's steps from `GET /prepare` (`paperLine`): Validated in Adobe (barcode forms), Printed, Signed in pen, Mailed to IRCC.
  * Who recorded Printed and Signed in pen, and when, come from `GET /runtime/items/:id`.
  * Printed and Signed in pen are buttons on `POST /runtime/items/:id/sign-steps/{print,sign_in_pen}`. For a barcode form, Printed names the validated copy read back, since the server prints no other.
  * Only the next step has a button. A later step says "Cannot start yet:" in `penRefusal`'s words, the same function the server refuses with (`engine/runtime/sign-order.ts`).
  * A refusal (a stale page, a newer copy) shows the server's own words under "Not recorded". The view is then read again and focus goes to the block heading, as in `SignBlock`.
  * A printed copy that is no longer the current validated one (or whose facts changed) offers a new print, mirroring the server's `restart`.
  * Mail is not recorded in the product yet, and the row says so.
* `acceptance/C7.6-screen.test.ts` (new), C7.6-10d to -10h, next to -10c. It uses its own case (Sample Client P), switched to Paper with a written reason (founder Q3), on screens at 1440 px:
  * -10d (fail): out of order, the screen's words equal the server's 409.
  * -10e (pass): Printed by screens, on the validated copy.
  * -10f (pass): Signed in pen by screens; the CRITICAL pen signature goes away.
  * -10g (fail): a stale page is refused in the server's words; nothing is recorded again.
  * -10h: axe clean on the block, and no page error.

## Checks
* Screen pack on a fresh checkpoint: exit 0, 6/6. The C7.6 packs under gate B: see the PR.
* Walk at 1440 and 1024 px: `screenshots/`. 1 before (Printed next; Signed in pen "Cannot start yet" in the server's words), 2 printed, 3 signed in pen, 4 a stale tab refused, 5 done at 1024.
* `tsc -p web` exit 0.

## Mock vs real
Everything is real (routes, words, data). The data is Sample (synthetic case; Paper by founder Q3, Sample, Unconfirmed: no counsel).

## Known gaps
* Mail is not a recorded step (B132 left it `done: null`). The row says so; it needs its own row to record.
* The item's state pill stays "In progress" after Signed in pen. That is the server's state for the Paper line (`paperLine`), unchanged here.
* Self-score: not given (D17 and D20 need an intended user; the reviewer scores).
* AI cost US$0.

## Review round 1 (Opus, Block on f3278cd4c: one Major, five Minors) and the fixes
* **M1, fixed.** After a fact changed post-Printed, the block still ticked Printed and offered Signed in pen, which the server refuses.
  * PenBlock now counts the steps as the server does (`case-prepare.ts:396`): on a barcode form, only those done on its current validated copy.
  * A step recorded on an earlier copy says "Recorded on an earlier copy … it no longer counts" and is not ticked.
  * The new fail check -10i goes red with the old PenBlock (7/8, exit 1) and green with the fix (8/8, exit 0).
* **m1, fixed.** One date for one copy: the button and the done row both name the copy's own date. The Validated row gives both the copy's date and the read-back time.
* **m2, fixed.** On a form with no barcode page, printing keeps SignBlock's copy reasons: being generated, "Copy, not for filing", out of date, file missing, and the fill-trial warning.
* **m3, fixed.** On a form with no barcode page, the copies are read again before Signed in pen. A printed copy whose facts changed is refused in words and nothing is sent (SignBlock's `printedCopyStale`).
* **m4, fixed.** -10i (fail, a fact changed after signing) and -10j (pass, a new validated copy printed again, then signed in pen by screens).
* **m5, for the tech lead.** The server's 409 at `sign-steps.ts:128` names "a newer validated copy" when the cause is a changed fact. That is an API wording point, not this PR.
