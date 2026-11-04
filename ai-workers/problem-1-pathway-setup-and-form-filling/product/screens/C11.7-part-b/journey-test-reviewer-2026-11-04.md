# Journey test (reviewer): C11.7 part B, Provincial nominee from its paper twins, 4 Nov 2026

PR #881 at head 54410819. I ran an isolated copy, `rev117` on :4720, with a fresh database; it is now stopped and its
database dropped. Headless Chromium via Playwright, at 1024 and 1440 px, plus 400 px for the width check. Live AI was off,
US$0, and no priced button was clicked. My scripts and screenshots are in the reviewer's scratchpad; they are not committed.

## Journeys
1. **Main path.** The content publisher (user-A) wants the demo back to the six, with Provincial nominee set up as the IRCC
   PR application. Demo › Reset to the six (by keyboard), type RESET, then Immigration programs › Express Entry stream ›
   Forms. Expected: IMM 0008, 0008 DEP, 5406, 5476 and 5669 are on as lines, with IMM 5406 and 5669 Online.
2. **Hand-off.** The Approver (user-B) wants to check the new document type. To review › Proposals › Express Entry stream ›
   Open › Accept. Expected: the type lands as a draft, and its library ADD waits.
3. **Across the screen boundary.** The author wants to make the certificate a required line. Documents › Add a document,
   choose the type, Principal applicant, Base, Save to draft. Expected: one required line, a person's draft.
4. **Empty state.** The author opens Documents before the certificate is accepted.
5. **Wrong role.** A case officer accepts the proposal, and a client changes a channel (from the suite and my API calls).
6. **Recovery.** Reset to the six again (the suite's last check). A duplicate form add, and a form the library lacks.

## What held
* **J1:** Tab reaches **Demo**. Enter opens the menu, ArrowDown reaches "Reset to the six…", and Enter opens the dialog.
  Typing RESET and pressing Enter runs it: **27.1 s** in the browser, 24.9 s through the API, of which the by-hand lines
  step takes 0.2 s.
  * The result reads Combinations 6 · Official files 44 · AI proposals waiting 670 · Draft with AI 0, plus "EMP5626 Not
    found" with why.
  * PN › Forms has all five lines, each "Added from the library by a person". IMM 5406 and IMM 5669 read "Online (typed in
    by hand for now)", each with a warning that the product does not fill it yet. The other three read PDF upload.
  * Database: 5 rows, `HUMAN|DRAFT|user-A`, and 0 releases.
* **J2:** the proposal shows "Document type · shared library · Sample until the immigration expert confirms", its why, and
  "From the rules, no AI reading". Accept answers "Decided 1 proposal · New library items wait for a second person",
  with Undo for 8 s. Database: the proposal is `accepted|user-B`, the type is `DRAFT`, and the library change is
  `WAITING|user-A`.
* **J3:** the add dialog opened by keyboard (Enter on "Add a document"). The type list offers the certificate, and Save to
  draft adds it. Database: one row, `provincial_nomination_certificate:principal_applicant|COMBINATION_MANDATORY|DRAFT|HUMAN|user-A`.
  Documents then lists it as Always, for the Principal applicant.
* **J5 and J6:** the case officer gets 403 and nothing lands. The client gets 403 and the line stays Online. "IMM 9999 is
  not in the library…" gets 404, and "IMM 0008 is already one of this combination's forms." gets 409. A second reset gives
  the same lines, and the certificate waits again.
* **Accessibility:** axe (WCAG 2.0, 2.1 and 2.2 A/AA) found no violations on PN › Forms, PN › Documents or the open
  proposal. There is no sideways scroll at 400, 1024 or 1440 px.
* **Console:** 0 page errors. The walk logged one 404 resource error after Accept; I could not trace it in a second run
  (none there).

## Findings
* **Major (code, review M1/M2):** with the certificate in the queue, the total of waiting proposals is no longer the AI
  total. `check_queue_tx` (7/8), `check_d1_reset_to_six_browser` (24/25) and the C10.1 pack's "rows 3–4" case go red.
* **Minor, next step:** on PN › Documents (J4), the page says "No documents yet · Draft them from IRCC's checklist, or add
  one". It does not say that the certificate is waiting on To review. The tab badge "1 to do" does not say what it is.
* **Minor, feedback:** the Reset to the six dialog ("Comes back") and the result say nothing about the lines added by hand
  or the waiting person-named proposal. "AI proposals waiting 670" is true, but To review shows one more.
* **Existing bug, not this PR:** PN › Forms reads "AI found 0 forms for this combination" above a red "A step failed: No
  saved AI answer…", with 5 lines set up below it (qa-2's new BUGS row on C11.7). With lines now present it is more
  confusing, but it is not caused by this PR.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 done on screen; the data matches |
| Next step obvious | ½ | Documents gives no hint that the certificate waits on To review (J4) |
| Plain words | 1 | "Added from the library by a person"; the Online warnings and refusals are in words |
| Feedback and state | ½ | The finder's red "step failed" sits beside 5 lines (existing); the reset result omits the by-hand step |
| Correct data | 1 | Rows exist once, values are as entered, there are audit lines, and roles are enforced on the server (403) |
| Error recovery | 1 | 404/409/403 come in words; the load stops loudly; Undo after Accept; a second reset is clean |
| Accessibility and screen sizes | 1 | axe clean on 3 states; no sideways scroll at 400/1024/1440. Keyboard covered only Reset and opening the add dialog |
| Speed | ½ | The by-hand step takes 0.2 s, but Reset to the six takes 25–27 s (qa-2 measured 14.6–19 s on main) |
| Visual quality | 1 | Team look unchanged; Online lines and warnings are readable |
| Trust and sources | 1 | The proposal says "Rules, no AI reading" and is Sample; the Sample label is on the forms and on the type |

**Score: 8.5/10.** By the journey rule (8 or more, no 0) this is a **pass**. The check's verdict is still **Block**,
because of the code Majors in `review.md` (the proof of the data is red elsewhere, not the data itself). Fixes
that raise the score, most valuable first:
1. Fix the waiting counts in the two suites and the C10.1 pack case (review M1, M2).
2. A line on Documents naming the waiting certificate, or the reset result naming it.
3. Make the Reset to the six timing comparable with main on the same machine. The 27 s here was measured while other
   sessions were running suites on the same machine.

## Could not test
A real screen reader. True browser zoom at 200 % (CSS zoom only). An intended user's unaided walk: D17 and D20 stay with
the founder. Two tabs accepting the same proposal at once (C3.6's own suites cover it; out of this item's scope).
