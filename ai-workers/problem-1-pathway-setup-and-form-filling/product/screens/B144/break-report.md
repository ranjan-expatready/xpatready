# B144 · C8.3 Representative review: break report

Breaker, 9 Nov 2026, commit 09e660220 (branch `claude/intelligent-noether-qkzc6a-b144`). Isolated copy `brk144` on :4447 (fresh database, `setup_visitor_visa` 15/15, `setup_vv_m3` 44/46 with the known S2w/S7a failures), stopped at the end. Scope: concept r2 BR-1 to BR-10, P-412 (F1 withdraw + one-click re-approve, F2 representative of record only). Two cases were made through the product's routes (two filings each: IMM 5707 Online, IMM 5476 PDF, IMM 5257 barcode validated); case 2 uses 90-character names with CJK and accents. Scripts and logs are in the breaker's scratchpad (`brk144/a1…a11.mts`, `ui*.cjs`, `*.log`, `shots/`). No code changed, nothing committed. `/tmp/claude-0` was set to o+x so that the `postgres` user could reach the database folder, as the builder's runner does; it was left that way because another agent is working in this worktree.

**Verdict: 1 Blocker, 3 Major, 7 Minor.** The permissions, the triggers on UPDATE and DELETE, the decision races and the per-form withdrawal all held.

## Blocker
**B1. A send-back leaves the earlier approval in force: Ready to file and C8.2's record still say "Reviewed by".**
* Steps (a8.mts):
  1. Send both filings. The representative opens fS and approves it.
  2. The officer sends fS again (201; the Send dialog ticks it by default, `readiness.tsx:290`).
  3. The representative opens it and sends it back with a reason (200, "Sent back").
* Expected: C7.6's `representative_review` line reopens (BR-5: the filing goes back to the officer), and nothing downstream reads it as reviewed.
* Actual: `readiness.reviewed = user-R`, the review line stays closed, and the panel shows "Sent back" beside "Prepared by · Reviewed by: … Representative (Sample) (licence R000000)" (`shots/panel-fS-sent-back-but-reviewed.png`). C8.2 copies `readiness.reviewed` into the record (`submission.ts:149,166`), so a filing the representative refused would be recorded as "Reviewed by" them.
* Cause: `readiness-inputs.ts:135-141` counts the newest `filing_review` when its facts are unchanged. A newer round of the filing (sent, under review or sent back) never withdraws it.
* Fix:
  * A `filing_review` counts only when no newer `review_round_filing` of that filing exists that is sent back, or, better, any newer row at all. Read this in `readinessOfCase` with one query.
  * In the dialog, do not tick a filing whose approval is still current by default.
  * Add a pack line: approve, send again, send back, then expect the review line open.

## Major
**M1. After a change of representative, the new representative cannot approve or re-approve. They are told, wrongly, "You changed a fact".**
* Steps (a4, a5):
  1. Approve fS.
  2. Change the representative of record with `PUT …/team/representative` (user-R to user-T, 200).
  3. As user-T, re-approve r3/fS. Also, on a round sent before the change and opened, approve with `confirm_unticked` (with or without `self: true`).
* Expected: user-T re-approves in one click. The change is F2's holiday cover.
* Actual: 409 on both: "You changed a fact on this filing after it was sent for review…". IMM 5476 reads the firm record (the representative's name and e-mail). After the change, `typistOf` gives those facts `typed_by = user-T`, so `changedBy` sets BR-8 (`review-rounds.ts:97-103, 347-349, 405-409`). The page's diff also says "Typed by Second representative" for the firm record. Every filing has IMM 5476, so every re-approve after a change of representative fails. The only way out is a new send.
* Fix: give facts about `REPRESENTATIVE` no typist (`typed_by: null`, "the firm record", as `compose` already does for `facts`), and leave them out of `changedBy`. Add a pack line: change the representative, then expect the new representative's re-approve to return 200 "Reviewed".

**M2. Ticking a box under a filing that is not selected ticks the selected filing's item.**
* Steps (ui2.cjs, 1024 px): round r3 holds two open filings, the first selected. With the keyboard, focus the second filing's "No open critical warnings" box and press Space.
* Actual:
  * The database shows the first filing's `default:no_critical` ticked by user-R and the second filing's left unticked. The second box is still unchecked.
  * A form mark of the second filing gets a 404.
  * Screenshot: `shots/tick-wrong-filing.png`.
* Cause: `representative-review.tsx:91` posts `filing: row.filing` (the selected filing). The boxes at :145 and :156 are drawn, enabled, for every open filing.
* Fix: `tick(f.filing, k.key, …)`. Alternatively, enable boxes only on the selected filing. Add a walk step with two open filings.

**M3. A send while the C7.6 route reviews: both succeed.**
* Steps (a6, first try): fire `POST /filings/fS/review` (user-T, current `facts_hash`) and `POST /cases/:id/reviews {filings:[fS]}` at the same moment.
* Actual: 200 (`one_step`, round 4, approved, `filing_review` written) and 201 (round 5, Sent). The filing is reviewed and sent for review at once. With B1, a later send-back still leaves it reviewed.
* Cause: `oneStepBasis` checks for an open round before the transaction (`review-rounds.ts:429`). The transaction at `readiness.ts:90-98` takes the case lock but does not check again.
* Fix: inside `oneStep`, after the lock, check again for an open row of the filing and refuse with 409.

## Minor
* **m1. The BR-8 409 sends the user to an action that does not exist.** After an approval, it says "Send it back to the case officer", but an approved row offers only Re-approve. Nothing on the page resolves it, and Reload does not help. Fix: offer Send back on an approved row with withdrawn forms (a sent-back round), or reword it as "ask the case officer to send it for review again".
* **m2. A former representative's ticks count for the new one.** On r5, the 3 items user-R ticked counted as ticked for user-T's approval: only the 3 program items were asked about (a4). Re-approve also carries the ticks. Fix: count only ticks by the deciding representative, or ask again for the others.
* **m3. Ticks are allowed before the review is opened.** `POST …/checks` on a Sent row returns 200 (`isOpen` includes `sent`, `review-rounds.ts:300`), so a checklist is worked with no "opened by/at" (BR-3). Fix: require `under_review`.
* **m4. A filing removed (C6.13) while in an open round can never be closed.**
  * Removal returns 200, and Open still moves the row to Under review.
  * Approve and Send back both return 409 "removed", so the row stays open with buttons that always fail. The page labels it "A filing no longer on the application" (a10).
  * Fix: allow a send-back, or close the row automatically, for a removed filing, and refuse Open.
* **m5. Focus is lost when a dialog closes.** Escape from Approve or Send back puts focus on `<body>` instead of the button that opened the dialog (`representative-review.tsx:225-226`; ui2). WCAG 2.4.3. Fix: focus the trigger on close.
* **m6. The triggers have gaps; each needs direct SQL (trig.sh).**
  * An INSERT of a row already `approved` is accepted, so the state machine is skipped.
  * An INSERT into `review_check` under a decided row is accepted.
  * A stamp can be written on a form of a `sent_back` row: `c83_form_guard` never reads the row's status.
  * `filing_review_id` has no foreign key, so the `filing_review` behind an approved row can be deleted.
  * Fix:
    * stamp only while the row is `under_review` or `approved`;
    * allow child INSERTs only while the row is open (or in the transaction that creates it);
    * allow an approved INSERT only for `one_step` and `reapprove` rounds;
    * add an FK with ON DELETE RESTRICT.
* **m7. Read in the code, not reproduced: Send back is refused when the forms change.** `decision` refuses a send-back too when the filing's forms changed since the send (`review-rounds.ts:326` sits before the verdict branch). Its own words, "send it back, then send it again", cannot be followed, and the filing stays in its open round. The Visitor visa has no way to add or drop a form (no Not-needed channel, no conditional form), so this was not reproduced. Fix: run the form-set check only for `approve`.

## What held
* **Permissions:** every route was called as each of 7 actors (a1):
  * case officer: read 200; open, tick, approve, send back, re-approve and the old route 403;
  * second representative not of record: the same as the officer;
  * other firm: 404 everywhere;
  * client and configuration: 403;
  * unknown actor and no header: 401.
  * Nothing changed state: rows stayed Sent, 0 ticks.
  * The read-only words match the concept's. After a change of representative, the former one gets 403 on open, tick, approve and re-approve.
* **Forged bodies, all refused:**
  * an unknown item key (404), a filing not in the round (404), another filing's hashes (400), a missing or non-string hash (400);
  * an unknown verdict or a string `confirm_unticked` (400);
  * reasons that are empty, whitespace, punctuation only, 21 of them, 501 characters, carrying U+202E, null, a string, or pinned to another filing's form or a wrong key (400);
  * a decision on a Sent row, a decision made twice, re-approving an unchanged filing or a filing never approved, the old route on a filing in an open round (409);
  * a send with a duplicate (400), another case's filing (404), a removed filing (409). Japanese, Arabic and emoji reasons are stored intact.
* **Races:**
  * 3 decisions at once (approve, send back, approve): one 200 and two 409, with exactly one `filing_review` and no orphan.
  * 4 sends of one filing at once: one 201 and three 409, one open row, no empty round.
  * A stale hash gives 409 with nothing stamped.
* **Withdrawal:**
  * A fact read only by IMM 5257:S withdraws only that form, and C7.6's line reopens on fS only.
  * A case fact read by IMM 5476 withdraws IMM 5476 on both filings and nothing else.
  * The withdrawn words name the fact, the typist and the day.
  * One-click re-approve stamps 2 forms and closes the line.
  * BR-8 catches a relative's fact typed by the representative (409), as it does the person's own fact.
* **Stamps:** IMM 5257's stamp is the validated copy (sha256); IMM 5707 Online is stamped `none` with its snapshot.
* **Triggers:** UPDATE of a round, DELETE on all four tables, approved → sent, sent_back → approved, rewriting reasons, restamping, changing a frozen hash, ticking a closed row, and editing a stamped snapshot were all refused.
* **UI:**
  * The officer gets the read-only notice, no enabled boxes and no footer, and viewing does not open the filing.
  * At 1024 px and at 720 px (200 % zoom), the long CJK and accented names wrap with no horizontal overflow.
  * The Tab order reaches every filing, form, chip, mark, checklist box, Approve and Send back.
  * Both dialogs take focus. An empty send-back shows the reason error.
  * GET of a round takes 170-185 ms. Not applicable here: hostile uploads (none on this screen) and the 100-program / 400-combination budgets (the review is per case).
