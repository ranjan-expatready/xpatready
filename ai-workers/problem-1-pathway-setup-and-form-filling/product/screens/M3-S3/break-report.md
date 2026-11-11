# M3-S3 break report: waivable line with a reason (PR #1524 at aeeb7ac5)

Breaker run, 11 Nov. Isolated copy `brk_m3s3` on :4432 (configured checkpoint, live AI off, US$0), stopped after. Scope: the
BACKLOG row (line 281) and `git diff origin/main...HEAD`; no concept.md. Setup reused `tests/runtime/check_m3s3_waive_api.ts`
(13/13 pass on the copy) and `check_m3s3_waivable.ts` (13/13). Scripts and screenshots were kept outside the repo.

## Blockers
None.

## Majors
**M1. The "not derived yet" guard is switched by the waiver flag, so one tick turns the whole checklist on or off.**
`engine/runtime/case-checklist.ts:140` treats "any line marked waivable" as "this release's document lines were checked". The
code checks nothing else to back that claim.
* What I did: on Family sponsorship (`fs.spouse`, not in the fee table's checklist set), the author ticked Waivable on the fee
  receipt only, then a second and a third person released it.
* Expected: only the fee receipt line changes (it becomes waivable).
* Actual: a case opened before the release shows the checklist as "not derived yet", with no document warnings. A case opened
  after it gets every line derived: birth certificate, passport and fee receipt. Ready to file then shows 3 new warnings: "…
  not received". For the earlier case, the release-update view lists all three as "New · Not asked → Asked for".
* Reverse: I waived the fee receipt, unticked Waivable, released again and moved the case to the new release. The move view
  said all three documents were "No longer asked". After the move the checklist is gone ("not derived yet"). The waived row is
  still in the database but cannot be reached: Request again gives 409 "not on the person's list now". Prepare shows no
  document items.
* Effect: one line's waiver setting decides whether every line of the combination is derived. P-425 asks for each guard to
  become a setting of its own. On `sp.outside` (the PR's own test) the fee table already derives the checklist, so this was
  never exercised end to end.

**M2. "Who and why" is not kept: taking the waiver back erases it.**
* What I did: waived a line with a reason, then chose Request again.
* Expected: who waived it and why stay on record (the row says "the waiver records who and why").
* Actual: Request again writes `state_reason = NULL` and `state_by` = the person who asked again (`api/src/case-checklist.ts:185`).
  The audit line (`:192`) says only "Case officer waived Passport … (Requested to Waived)". The reason is not in it and
  `detail` is NULL. Once the waiver is taken back, nothing anywhere records why the line was waived.
* The History dialog says "A full history of every state change is not built yet". Request again is one menu click with no
  confirmation (I checked by keyboard).

**M3. The reviewer and approver cannot see that a line is waivable.**
* What I did: opened the released waivable passport line as the approver (user-B), at 1024 px.
* Expected: the person signing off or releasing the setting can see it.
* Actual: the document drawer (`web/src/pages/workspace/documents.tsx:178` onwards) shows who, when, provider, alternatives
  and sets, but not Waivable. Review (`web/src/pages/review.tsx:112`) lists only "Document requirement · Fee payment receipt ·
  changed". The setting shows only in the author's Edit dialog, which non-authors cannot open. So a second person releases a
  setting that relaxes a required document without seeing it.

## Minors
* **m1. Wrong words on upload to a Waived line.** The client's or officer's upload gets 409 "… is Not applicable: request it
  again before uploading" (`api/src/case-checklist.ts:254`). The line is Waived.
* **m2. Prepare and Ready to file show a waived line wrongly.** Its document item stays `state: "to_do"`, "Not requested yet
  (the checklist, C6.4)." (`api/src/case-prepare.ts:466`, a fixed string). The readiness warning itself goes, correctly.
* **m3. A received file is ignored after the waiver is taken back.** Received (current file) → Waive → Request again leaves
  the line Requested with a current file, and Ready to file warns "Passport … not received". This comes from
  `WAIVE_FROM = NOT_APPLICABLE_FROM` and REQUEST_FROM (`contracts/documents.ts:13,18`). Not applicable already behaves this way.
* **m4. No recorded rollback.** STANDARDS §5 [M] asks for one, and recent migrations (qa345, c617) have one. Rolling back is
  not trivial: once Waived rows exist, the old state check fails.
* **m5. The SQL reason check is weaker than the API's.** `btrim` removes only spaces. Direct SQL accepted a Waived row whose
  reason was E'\t\n', a zero-width space U+200B, or 5000 characters. Nothing requires `state_by` or `state_at` for Waived. The
  API refuses all of these (contracts `Waive`).
* **m6. `waive()` derives the checklist twice.** It calls `line()`, then `setState()` calls `line()` again (`api/src/case-checklist.ts:205`).
  Waive took 59–90 ms against 35–45 ms for Not applicable. "Waivable" is checked on the first read; the write is conditioned
  on the version only.
* **m7. Validation runs before authorisation.** A client posting `{}` to waive gets 400 "Give a reason…" rather than 403. It
  leaks nothing.

## What held
* **Roles:** the author, reviewer and approver get 403 "works on configuration". Clients A and B get 403. An unknown or
  missing actor gets 401. The solo firm's representative gets 404 "No such case" (no IDOR across firms). The firm's
  representative (case duty) may waive, as staff.
* **Author save:** officer, reviewer, approver, client and representative get 403. `"WAIVABLE"`, `" waivable"`, `true`,
  `false`, `""`, `0`, `1`, `["waivable"]`, `{}` and `"never"` all get 400 in words, with the row unchanged. Leaving the field
  out keeps the value; null clears it. Two sessions with the same baseRevision: the second gets 409, and the waiver is not
  overwritten.
* **Reasons:** missing, `""`, spaces, zero-width only, number, null, array and 501 characters get 400 on the field. Exactly
  500 accented characters are accepted. 100 family emoji (800 UTF-16 units) are refused by length. Hindi, Arabic and Chinese
  text are stored as typed, with U+202E removed. HTML is stored as text, and React shows it escaped.
* **States:** waiving twice gets 409; Not applicable on a Waived line gets 409; waive on a Not applicable line gets 409; a
  stale version gets 409. Request again takes the waiver back. Waiving from received was allowed.
* **Concurrency:** waive and Not applicable on one version (5 runs): one 200, one 409. Three waives at once: one 200 and one
  audit line. Request and waive at once: one wins, one gets 409.
* **Non-waivable lines:** 422 on a line the release does not mark waivable. Waive… is not on the fee receipt's menu. A merged
  line is waivable only when both requirements are (unit test).
* **Readiness:** a waived line is not required. Its "not received" warning goes, and "n of m received" leaves it out.
* **Migration:** applied cleanly after the 81 earlier migrations on a database with 700 checklist lines in every old state
  and 50 requirements (all waiver NULL). The SQL checks refuse Waived with a NULL or blank reason, `'Waived'`, and a waiver of
  `'WAIVABLE'` or `''`.
* **Fingerprints:** the Visitor visa draft sha equals its release sha. `waiver` is written to the snapshot only when set.
* **Other readers of the state:** grep for `not_applicable` finds only the 4 places this PR updates. The stage view sends the
  raw state, and the web does not draw it.
* **Dialog:** keyboard only (Tab to ⋯, Enter, arrows, Enter, type, Enter). An empty reason shows the error on the field.
  Focus returns to the line's menu. At 1024 px and at 512 px (200 % zoom) there is no sideways scroll and a 500-character
  reason wraps. axe (WCAG 2.2 AA) finds 0 problems on the waive dialog and the author's dialog. The Waivable checkbox works
  with the keyboard (Space).

Out of the row's scope, not tried: duplicates, hostile or planted-instruction PDFs, 100 programs / 400 combinations.
