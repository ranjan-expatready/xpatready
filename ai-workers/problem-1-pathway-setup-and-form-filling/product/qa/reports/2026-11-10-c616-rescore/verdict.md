# C6.16 re-score verdict: gate A PASS · status Partial, ready for Works (all green except P-339: no GitHub run id) · QA-359 fixed, close it

Reader: a fresh Opus subagent that ran nothing (P-303). Read only: this folder (notes, walk log, the three scripts, all check and pack outputs, the probe), screenshots 07, 08, 09, 12, 13, 14, 16, 18, 19, the pack `acceptance/C6.16.test.ts` (C6.16-7, -8), `web/src/runtime/privacy.tsx`, `contracts/person-link.ts`, `engine/runtime/privacy.ts` (`sendRefusal`, `resendKind`) and `api/src/person-link.ts` (`people`, `send`, `takeBack`). Main df52c9fc6, 9 Nov 2026.

## QA-359: fixed. Close it.
* **By its check:** `check_qa359-output.txt` is 2/2. On 9 Nov it was 1/2: "new link messages at A: 1; B's link: dead".
* **By the pack:** C6.16-8 now asserts the fix (`C6.16.test.ts:190-205`): Resend sends the same link to B (`created:false`), nothing goes to A, and B's link stays live. Typing A back is 403 in the exact words. Within a minute nothing more is sent. After staff take back B, Resend is 409 and the list offers no Resend. The pack ran 74/74 locally on the checkpoint.
* **By screens:**
  * 08: the card has only Resend and Take back, and the line says where Resend goes (n•••).
  * 09: the toast reads "The firm's link was sent to Sample Partner at n•••@example.com again. It still works."
  * Log 22-23 `[under]`: A 0 → 0, B 1 → 2, "same link: true".
  * 10-12: Partner, in a new browser, enters on that resent email.
* **Matches P-441 as quoted and F12 (b):** yes, in every part of the builder's note.
  * The typed-address refusal is shown by the pack only. Client A has no address field on screen (08), so screens cannot show it.
  * F12 (a) still holds after the change: 16 and log 46 show progress only after Client A's take back.
* **Risk seen in the code, not walked:** Client A's own Take back of the firm's link. `takeBack` lets the client kill any open link, so Client A can kill B's link before Partner accepts it.
  * After that, `resendKind` gives "firm", so Client A cannot revive it or redirect it. Nothing is disclosed, but Client A can cut the channel the firm chose.
  * F12 does not say who may take back. The pack's take back after a re-address is the officer's (`:201`), not Client A's. See N2.

## Gate A: PASS
* **Reaches C7.1 with usable output:** 19 shows Partner's IMM 5257 copy as "Generated · 4 form fields written · read back and checked".
  * Log 52 `[under]` is Partner's own copy this time (person Sample Partner, `written_now 4`, intact). The 9 Nov mislabel is gone.
  * Limit: the XFA values were not re-read this round. That the output is usable rests on 9 Nov's `Email` read plus "intact".
* **Gaps from 9 Nov that are now closed:**
  * Resend → re-entry: 10-13. The new code goes to n•••, Partner sees their own parts only (12), and their private street is kept (13). Client A's page then carries neither value (log 38).
  * Client A's own Take back: 15-17. Privacy stays on (16; log 46). The dead-link page names no one (17).
  * 1024 px: the officer at 1024×900 (script line 54; 05-07, 18, 19).
* **Still missing:**
  * The GitHub run (P-339).
  * Client A's take back of an unaccepted firm link (N2).
  * Partner saving an answer after re-entry: 13 shows a kept answer, not a new save.
  * Client A at 1024 px, a headed pass, the 5-wrong-codes lock and expiry by screens (the pack covers the last two).
  * The case is still set up by script.

## Status: Partial, ready for Works (all green except P-339)
There is no open Major or worse on C6.16, and gate A passes. The previous "What moves it to Works" list stands like this:
* (a) Done: P-441, the fix and the pack steps.
* (c) Done.
* (b) Still open: P-412 and P-441 are not in DECISIONS.md in this copy, and STATE row F12 still reads "open".
* (d) Still open: no GitHub run.

Suggested row: "Partial — ready for Works: all green except P-339 | df52c9fc6 9 Nov | qa re-score after #1453 (fresh reader, P-303; `qa/reports/2026-11-10-c616-rescore/`). QA-359 fixed by its check (2/2, was 1/2), by the pack (C6.16-8; 74/74 locally on the checkpoint, gate-b.mjs) and by screens: Client A's Resend sends the firm's link again to n•••, nothing goes to A, and Partner re-enters on it. Closed. Gate A PASS by screens: Resend → re-entry, Client A's own take back (still private), officer at 1024 px, on to C7.1 (Partner's IMM 5257 copy generated, 4 fields, intact). Open: QA-357, QA-358, QA-360 (UX · Minor), and two new Minors. No GitHub run (dispatch 403), so not Works."

What moves it to Works:
1. A green `nightly.yml` run (capabilities=C6.16, data=checkpoint) on main's head, with its run id in the row.
2. The Lead records P-412 F12 and P-441 in DECISIONS.md and closes STATE F12.

## Open Minors: all three still stand
* **QA-357:** its check fails 0/2. 16 still shows "is answering on their own link" above "The link was taken back".
* **QA-358:** its check fails ("the officer's 'Confirm section'"). This walk did not show it: 13 is after Confirm.
* **QA-360:**
  * (1) is on 18: "Ask whoever sent it for a new one."
  * (2) still stands, but this walk hides it. qa chose a B address starting with `n`, so 07 and 08 tell the two addresses apart. The pack's two addresses both mask to `p•••` (pack output lines 42-43).
  * Widen (2): Client A's new line (08) shows the same mask, so with two `p…` addresses Client A cannot tell where Resend goes.

## New findings
* **N1: UX · Minor (from code and log 37, not pressed).**
  * Once Partner accepts the firm's link at B, `resendKind` turns "new". The "where Resend goes" line disappears (log 37: `where` is null for "new").
  * One press of Resend then sends a new link that supersedes Partner's working link and ends their session (`send` → `kill`), with no words and no confirm.
  * It still goes to the kept address, so F12 (b) holds. The behaviour is the same as 9 Nov's kept-address Resend, so it is not a regression from #1453. It does mean the builder's "the line says where Resend goes" holds only before re-acceptance.
* **N2: Gap · Minor (for the founder; neither walked nor in the pack).**
  * Client A can take back the link staff sent to a new address before the adult accepts it. Then only the firm can send again.
  * Nothing is disclosed, but the principal can cut the channel the firm chose, which is the risky case F12 (b) protects.
  * Recommend: the founder says whether that take back is the principal's. Either way, add a pack step.
* **Carried: Gap · Minor (records, Lead):** P-412 and P-441 are missing from DECISIONS.md, and STATE F12 is still open.

## Wrong or unsupported claims in qa's notes
* **Step 7:** "`walk-log.txt` line 7" should be line 52.
* **Step 4's toast:** log line 19 (`[4 after Resend (toasts)]`) captured nothing. Only screenshot 09 shows the toast. The claim is true, but the log does not back it.
* **Probe "21 now":** the output has 22 rows. They include `stages/:stage`, which has a sub-id. The route list has 23 entries; the probe does not call `people/:subject/questionnaire` (a link-session route).
* **Step 5's link-A dead page (14):** link A died at the staff re-address in step 3, not at the Resend or the re-entry. The text is accurate, but its place in step 5 can mislead.
