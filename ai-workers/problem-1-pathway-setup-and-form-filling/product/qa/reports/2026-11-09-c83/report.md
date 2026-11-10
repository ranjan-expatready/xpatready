# qa capability C8.3, representative review (row B144, #1247): Partial. The pack is green and gate A passes, but it is held by QA-345 (Major). 9 Nov 2026, 17:58–18:20 IST

Mode `/qa capability C8.3`, qa lane, main **cfaa199f4**. Live AI off, US$0. The verdict is by a fresh Opus reader that ran nothing (P-303, P-360 (3)).

## Verdict (fresh reader on Opus)
**Partial.** Gate A **PASS**, pack **green**, held by **QA-345** (Conflict · Major). The reader's words:
* "Gate A: PASS. The case officer and the representative walked send, approve, send back, round 2, withdraw and re-approve by screens, and C8.2 then recorded the submission with 'Reviewed by: Representative'."
* "After a send back, the approved barcode forms carry no file fingerprint, a later validated copy goes out under that approval unseen, and the dialog says otherwise."
* The reader also pointed out that "any send back that changes a fact on a barcode form leads to this, so it is the normal rounds path, not an edge case."

## Pack, on GitHub's runners (P-322, P-339)
The tech lead dispatched nightly **42616655752** (`workflow_dispatch`, 12:23:47Z) on main cfaa199f4, with `data=checkpoint`. In job **129158118178** "packs (C8.3)": "C8.3.test.ts on the checkpoint: exit 0, 23/23 passed (163 s: copy 5, Load the configured checkpoint 90, run 68)", and "Gate B: passed". The lines are in `pack-run.txt`.

## Gate A by screens (P-317, P-348 (3))
The walk, step by step with its screenshots, is in `walk.md`; the raw page words are in `walk-log.txt`.
* **Copy:** a fresh copy, qa_c83 on :4473. The checkpoint was loaded by Demo › Load the configured checkpoint… (115 s).
* **Setup:** a filled case with its validated copies, made by the pack's own first part. Nothing was sent for review in setup.
* **Walked:** every C8.3 step was walked as the case officer and then the representative, at 1024 px:
  * send 2 filings;
  * checklist with Sample program items;
  * approve one filing (each form stamped);
  * send one back (no reason refused on the field, then a reason);
  * the officer fixes the fact by screen and sends round 2;
  * round 2 shows only IMM 5257 "Changed since review", before → after, with who typed it;
  * approve with the one confirmation;
  * a later change withdraws only the spouse's IMM 5257 ("Approval withdrawn: City or town of birth changed by Case officer (Sample)");
  * "Re-approve 1 changed form" makes round 3.
* **To the next capability:** 40 warnings were passed with reasons by screen, then both filings were marked Ready to file. **C8.2 Record the submission** then opened, and the submission was recorded: "Prepared by · Reviewed by: Case officer · Representative". **The next step uses C8.3's output.**
* **Underneath:** 3 rounds (send, send, reapprove) and 3 `filing_review` rows by the representative of record, `reviewed`, licence R000000. The stamps are below.
* **Replay:** the builder's `tests/check_c83_review_browser.cjs` ran **23/23** on the same copy at 1440 px. It covers axe on 3 views, keyboard, the stale-hash 409, the solo self-review re-approve, and the empty and loading states.

## Bugs: 0 Blocker · 0 Critical · 1 Major · 2 Minor (all new)
* **QA-345 · Conflict · Major (holds the row).**
  * What happens: after a send back that changes a fact on the barcode IMM 5257, round 2's approval stamps every form `stamp_file_kind = none`. The new validated copy is read back later and filed under that approval, still "Approved, still current"; it is never stamped or re-approved. The P-412 re-approve (round 3) behaves the same.
  * Why it is a conflict: the row says "stamped with its file fingerprint"; the concept says "the file that goes to IRCC (the validated copy for a barcode form)"; the dialog says "Each form is stamped with its file and the facts it read". BR-7, as built, counts only the facts hash and the representative.
  * Check: `tests/qa/check_qa345_barcode_stamp_after_send_back.ts` exits 1, 1/2 today. It encodes option (a).
  * Decision needed, by the founder or the tech lead:
    * (a) stamp the first file read back after a no-file approval, or ask for re-approval; or
    * (b) accept facts-only stamps and change the row and the dialog words, which drops this to Minor.
* **QA-346 · UX · Minor:** the reasons for a send back are not on the officer's Ready to file, only one click away on the review page.
* **QA-347 · UX · Minor:** the live checklist items can be ticked against their own live state ("All required documents verified (when sent: 0 of 3)"), recorded as the representative's word. The round history also reads "1 approved · 2 approved".

## Coverage
Not run this round. The task was one row; the c8 floor was not re-measured.

## What I could not test (the reader's list and mine)
* An Online form's stamp; a later round that stamps a matching validated copy; regenerating a copy with the same facts.
* A change of representative, by screen.
* Self-review (BR-8) and permissions, by screen: the pack and the builder's walk cover them.
* Whether "Ready to file" is refused on a sent-back filing: the button shows in shot 13; not pressed.
* 400 px; the client's view; other case types; a headed browser (none in this cloud copy).
* In the first try of stage 2, one checkbox click "did not change its state" mid re-render. The retry ticked all 6; it was not reproduced.
* A fact label shows twice in IMM 5476's facts table; the cause was not traced.
* Evidence note (the reader's): shot 33 was taken as the case officer (stage 6); the recording, shots 34–35, was done as the representative (stage 7). walk.md now says so.

## Questions for the Lead
1. QA-345: should it be fixed by (a) (screens lane, B144 follow-up), or should it go to the founder for (b)? Until then C8.3 stays Partial (P-305 (3)).

## Suggestions
* *Needed for the proof · Capability:* the QA-345 fix, with a pack step after a send back on a barcode form (my check can become that step).
* *Later · Capability:* the first send-back reason on the officer's Ready to file line (QA-346).
