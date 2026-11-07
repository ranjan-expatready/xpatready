# Journey test: row C3, a person's channel decides "for filing" (reviewer, 7 Nov 2026)

PR #1225, head 4fb292a754b45357c85177b5f1b5231736e5a178 (code 994f9d114), base 9dc77d1ac. One isolated copy `rvc3` on :4491 (TTL 30, stopped afterwards: "database and files removed"), configured checkpoint loaded fresh (reset 201, load 201, 93 s). Live AI off, US$0. Adobe's Validate is simulated (`asValidated`), as in the builder's checks.

## Journeys (from row C3, section 8 J-C3, founder Q3)
1. **Main (case officer):** IMM 5257 › Change channel › Paper with no reason is refused. With the accommodation reason it is saved for Client A only. Ready to file names the missing validated copy. Generate the copy, read back the validated copy: the block is gone and the line is In progress. The spouse's line, left Online, says "Copy, not for filing". Change the family name: the line is Out of date and the block is back.
2. **Alternate:** the same with PDF upload instead of Paper.
3. **Error:** a copy made while the line was Online, then a switch to Paper, then that stamped copy's validated file is sent.
4. **Wrong role:** the client tries the switch.
5. **Recovery:** Paper, read back, then back to Online. Also a legacy stamped read-back (a row main's 201 could leave behind), injected by SQL on my copy.
6. **Keyboard and sizes:** the switch done by keyboard only at 1024 px, then the case page at 1024 and 400 px.

## What held (my runs on the copy)
* `check_c3_paper_validate.ts` passed 18/18. `check_c3_jc3_browser.ts` passed 25/25 by screens at 1440 px: Paper refused without a reason on the "Why on paper" field, saved with one, Ready to file names the copy, Generate and the read-back done by screen, block gone, spouse "Copy, not for filing", Out of date after the name change. axe found no WCAG 2.2 A/AA violation in 5 states and there was no page error.
* Reviewer screen pass (11/11): a keyboard-only switch to Paper with a reason saves, and focus lands on a button, not on the body. At 1024 and 400 px axe is clean and there is no sideways scroll.
* PDF upload: the switch saves (200). The block is there before the read-back, the read-back gets 201, and the block is gone afterwards.
* Paper, read back, then Online: the line is Online with no Validate block and no validated copy shown. Lock is refused (409 "filed Online"). The Paper copy keeps `copy_not_for_filing: false`.
* A client cannot switch the channel (403). The stamped copy is refused at Validate (409) and the block stays. A new copy validates (201).

## Findings
* **Minor:** a read-back of a stamped copy still counts for readiness (`api/src/case-prepare.ts:204-209`, which reads every passing read-back of the form for the person). I inserted one passing `validated_copy` row for a copy stamped `not_for_filing: true` on a Paper line. The result was a contradiction:
  * The Paper line read `in_progress`, naming that copy as validated with `current: true`.
  * Ready to file had no `barcode_not_validated` block.
  * The copy view said "Validated copy read back".
  * Lock refused the copy (409 "stamped Copy, not for filing").

  Only a row written before this change gets here: `validated()` now refuses such a row, and the table is insert-only.
* **Minor:** the case page offers "Read back the validated copy" on a stamped latest copy on a Paper line (`web/src/runtime/forms.tsx:133`). The server refuses it with honest words in a toast ("…stamped "Copy, not for filing" and is not validated. Make a new copy, validate that one and read it back."), and the copy line already says "Generate a new copy to file it". Screenshot: /tmp/claude-0/-home-user-xpatready/a8436a24-a5d5-5fdd-8a14-7b92b9b29023/scratchpad/rv/shots/rv-stamped-paper-1024.png (scratch, not committed).
* **Note, existing before this PR and outside the row:** a PDF upload line keeps the reason "Every fact it reads is confirmed." before and after its read-back. The copy text on the case page repeats the telephone hint three times.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J-C3 25/25 by screens; 18/18 by route |
| Next step obvious | ½ | The Paper line's steps have no screen yet (row B3: J-C3 5, 9 and 13 are read by route). The read-back is offered on a stamped copy |
| Plain words | 1 | The refusal, the block and the 409 say what to do, without IDs |
| Feedback and state | 1 | The block appears, clears and comes back; toasts show the result; Out of date names the fact |
| Correct data | ½ | Current paths are right. A legacy stamped read-back still turns readiness green while lock refuses |
| Error recovery | 1 | The 409 points to a new copy, and the new copy validates (201) |
| Accessibility and screen sizes | 1 | axe clean at 1440, 1024 and 400 px; keyboard switch works; no sideways scroll |
| Speed | ½ | No wait over the 30 s step timeouts, but nothing timed against the STANDARDS §9 budgets |
| Visual quality | 1 | Team components; states are clear in the screenshots |
| Trust and sources | 1 | The reason, who and when are shown on the line; IRCC's "You must apply online" is quoted; the reason is labelled Sample |

**8 / 10, no 0: pass.** What would raise it, most valuable first:
1. Filter stamped copies out of readiness's read-backs (correct data).
2. Hide or explain the read-back control on a stamped copy (next step).
3. Time the Ready to file refresh against §9 (speed).

**Not tested:** a real screen reader; 200 % zoom; an intended user's unaided walk (D17 and D20 stay with the founder); the acceptance packs C7.6, C9.2 and C7.7 on the checkpoint.
