# C7.5 part 1 — break report (rules cross-checks and Review findings)

Commit 9d654e170 (branch `claude/runtime-cross-checks`, base 48954b537). Isolated copy `brk_c75` on port 4439 (`xr_studio_brk_c75`), Visitor visa set up with `setup_visitor_visa.ts` then `setup_vv_m3.ts`. No live switch, no model call: `ai_batch` unchanged, US$0. Scope: the routes, rules, migration and Review panel this PR builds (no concept.md for C7.5; scope taken from the PR's files, `acceptance/C7.5.test.ts` part 1 and `M3-CONTRACT.md` row C7.5). The replayed AI review (part 2) is not a finding. Paths are relative to `prototype/studio/`.

**Verdict: no Blocker. 3 Major, 9 Minor.**

## Major

**M1. When the rules resolve an acknowledged finding, the record of who acknowledged it and when is lost.**
Steps: the passport expires before the visit ends → Open MAJOR. The case officer (user-O) acknowledges it with a reason → `state_by=user-O`. Then the passport date is fixed and the findings are read again.
Expected: Resolved, with the acknowledgement's who, when and why still on the finding.
Actual: `state=resolved, state_by="rules", state_by_name="the rules"`; `state_at` is overwritten; the acknowledgement's reason stays. The panel now shows "Resolved by the rules … (acknowledged earlier: “reason”)" without saying who acknowledged it. Only the audit line still names the person. `api/src/findings.ts:65` writes over `stateBy` and `stateAt` with no separate columns for the resolution.

**M2. A rules finding raised before the case has filings keeps `filing: null` for good.**
Steps: a new case with a disagreement. Read the findings first (the case page loads the Review panel before anyone opens Prepare, and filings are made only by `GET …/prepare`). Then open Prepare (2 filings made) and read the findings again.
Expected: the finding is placed on the person's filing, as the code says it is (principal's for a case fact).
Actual: both findings stay `filing: null` after the filings exist. `placeOf` runs only when the row is created (`findings.ts:67,73`) and nothing fills the filing in later. The builder's own check calls `prepare` before the first read, so it never sees this. Part 2's warning on a filing's readiness (C7.5-9) will miss these findings.

**M3. Any case officer can close a CRITICAL finding by acknowledging it, which bypasses the rule that only the representative waives it.**
Steps: a CRITICAL finding added by hand. The case officer (not the representative) acknowledges it with a reason → 200, `acknowledged`. Then the representative tries to waive it → 409.
Expected (from the route's own rule: "waive CRITICAL only, by the representative of record; never dismissed"): a CRITICAL finding leaves Open only through the representative's waive, or acknowledge is refused for CRITICAL.
Actual: `move` limits only waive and dismiss; acknowledge has no severity or role check (`findings.ts:104-112`).
Also to raise with the founder, not settle here: the team's requirements give the CRITICAL pass to the Case Officer (and Owner, Admin, Case Manager) by default (AG-17 table rows AG07-D24 and D25, `agent/case:waive-deficiency`). The build allows only the representative of record. One of the two is the rule; the founder decides which.

## Minor

**m1. A dismiss can succeed and then be quietly resolved at the same moment; the panel then shows the dismiss reason as an acknowledgement.**
Steps: fix the fact, then send at once the dismiss and two reads. Repeated 22 times.
Result: 16 runs ended dismiss 200 → final `resolved` (with the dismiss reason kept), 5 ended `dismissed`, 1 ended 409.
Expected: one outcome. Here, the same steps give different end states, the user was told "Finding dismissed", and the row then reads "acknowledged earlier: “…”" (`findings.ts:60,65`; `web/src/runtime/findings.tsx:80`).

**m2. Reasons and notes do not use the project's rule for typed text (QA-25).**
NUL in a note or reason → 404 "Not found (it may have been removed by a reset)", which is wrong words for bad input (nothing is saved). BEL (`\u0007`), a note of only zero-width characters (`​`×4) and bidi marks are accepted (201). `contracts/findings.ts:37,46` do not use the `text()`/`INVISIBLE` rule in `contracts/runtime.ts:16-20`.

**m3. Hand-added findings can point to the wrong place.**
- A child's finding on the principal's filing is accepted (201): the API checks that the filing belongs to the case, not that the person is on that filing (`findings.ts:124`).
- `field: "robots.secret_key"` is accepted and shown as "Secret key".
- The case subject is accepted as the person (201) although the panel hides it.

**m4. The rules ignore whether a person is travelling.**
A spouse marked not travelling (`applies:false`) whose passport expires before the visit gets an Open MAJOR "before the visit ends" finding. Marking the child as not travelling leaves the child's findings as they are. `api/src/findings.ts:54` passes every participant; `engine/runtime/cross-checks.ts:40` checks only `role`.

**m5. Whether a finding exists can be learned without access.**
A client (user-P) or configuration person (user-A) moving an existing finding id gets 403; an unknown id gets 404. The finding is looked up before the person's right is checked (`findings.ts:100-102`). Nothing else leaks.

**m6. Keyboard: closing the reason dialog leaves focus on `<body>`.**
Closing it with Escape or Cancel does not return focus to the row's "Acknowledge…" button. At 1024 px and at 200 % zoom alike, the keyboard user starts again from the top of a long page (`findings.tsx:98,115`; WCAG 2.4.3).

**m7. "Waive…" is shown to every case officer on a CRITICAL finding.**
Only the representative of record can use it; anyone else learns this as a 403 after typing a reason (`findings.tsx:84`).

**m8. When the rules resolve a finding, no audit line is written.**
0 `resolved` audit events on the attack case, while acknowledge, waive, dismiss and add each have one (`findings.ts:65`).

**m9. The database is a weaker last check than the API.**
The DB stores a CRITICAL finding as `dismissed` with `state_reason=''` (insert accepted in a rolled-back transaction). Nothing in the table forbids a dismissed CRITICAL, and `''` passes the reason check (`migration.sql:49-52`).
The API returns the whole list with no paging: about 220 findings → 275 KB, and the panel is 70,465 px tall at 1024 px (STANDARDS §6 cursor pagination). The panel still renders in under 1 s.

## What held
- **Who:**
  - A client of the case and another client: 403.
  - A configuration person and the reviewer or approver personas: 403.
  - Another firm's staff (user-S): 404 on read and on move.
  - No `x-actor`: 401.
  - The representative reads.
  - A waive by the earlier representative after a change of representative: 403; the new representative: 200.
- **Inputs:**
  - Malformed or unknown case id and unknown finding id: 404.
  - `?state=` given twice, or a source outside the list: 400; an unknown query parameter is ignored.
  - A reason that is an array: 400. A number as the note: 400. Note of 1,001 characters: 400.
  - Note of 500 emoji, Hindi and Arabic text, and `<img onerror>` are stored and shown as plain text; no sideways scroll at 1024 px or 200 % zoom.
  - A form of `""` or `"   "` is stored as null.
  - A filing or person from another case: 422.
- **Concurrency:**
  - 20 reads at once of a new disagreement made one rules row (partial unique index plus `skipDuplicates`).
  - Acknowledge, waive and acknowledge sent at once on one CRITICAL finding: one 200, two 409.
- **Life of a finding:**
  - Moving a finding that is not Open: 409.
  - Waive below CRITICAL: 422. Dismiss of a CRITICAL: 422. Unknown verb: 404.
  - A dismissed finding does not come back for the same facts, even after its facts are fixed and then set to the same wrong value again. A changed fact makes a new finding.
- **Dates:**
  - Leap day: a passport ending 2028-02-28 with the visit ending 2028-02-29 is found, quoted as "Feb 28, 2028 … Feb 29, 2028".
  - Expiry on the visit's last day: no finding.
  - Expiry in 1900: both rules fire.
  - The national identity facts exist in the Visitor visa release, so those rules can fire.
- **Audit:** lines name the case, severity and source. No fact value or typed reason appears (checked for 2030, "Sample)", "phone", "Courier", "Race").
- **Migration:**
  - `schema.prisma` matches the database for `review_finding` (no diff).
  - The rollback in the header runs cleanly in a transaction.
  - The checks for waived-only-CRITICAL, reason, rule and severity refuse bad rows.
- **Speed:** read 12 ms (median) with nothing new; 39 ms (median) when a new finding is written; 20 reads at once in 773 ms; the case page with 214 rows in under 1 s.

## Noted, not this PR
The answer route accepts `2027-02-29` (200). The rules then skip that fact without saying so, because it is not a real day. That date check belongs to the answers rows, not to C7.5.
