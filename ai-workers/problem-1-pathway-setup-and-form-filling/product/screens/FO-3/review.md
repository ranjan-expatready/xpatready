# FO-3 review: booking API, public door first (API only)

Independent Opus reviewer (P-303), 14 Nov 2026; I did not build it. Commit **cdb70253b45f3d66ad3d86de96c46eec63b3b0c8**, branch `claude/vigilant-dijkstra-kp1c9x`, PR #1760.
* **Read:** the diff (9 files); brief `lead-b-briefs/FO-3.md`; row FO-3 (Done when); contracts §0, §2.2 and §7 (§0, §2.2); FO-1b's schema and migration; `firm-scope.ts`, `settings.ts` and `core.ts` on main; PF-0p's `ports/jobs|audit|staff.ts` and the scratch `events.ts` in the integration copy.
* **Not applicable:** there is no screen, so the walks, 1024 px / 200 %, D1-D20 and the BIC table are N/A (FO-1b precedent).
* **Journey test:** `journey-test-reviewer-2026-11-14.md`, **6.9 / 10, below the pass**.

## What I ran (never :4400)
* **Suite:** `check_fo3_booking.ts` in the integration copy (files identical to the branch): **80 passed, 0 failed**.
* **Live app** at :4431 (`xr_studio_runtime_fo3`): page, book, slot taken, the 404s, reschedule, the same-time reschedule, cancel and reuse; the outbox, audit and token rows read with psql.
* **Mutation:** I removed `audit.record` from reschedule, cancel and attendance (service.ts:256, 329, 355) and the suite still printed **80 passed, 0 failed**. The file is restored and matches the branch.
* **Graph:** `graph.mjs --check` exits 0.

## What holds
* **Slot rules (`slots.ts`), all correct:**
  * Each host's own zone. DST: `wallToUtc` drops a skipped time and takes the first of a doubled one; 01:30 on 1 Nov 2026 Toronto is offered once.
  * Notice and window. Closed days are checked in the firm's zone at both the start and the end.
  * Time off, and active hosts only. The first free host follows the type's order, and a move keeps the host when free.
  * Gaps: the padded candidate is tested against the database's own `block_range` with the same `&&` test the exclusion uses, so the app and the database agree.
* **Concurrency:**
  * Per-host advisory transaction locks in sorted id order, so no lock cycle with the row lock taken first in a move.
  * The exclusion stays the last word. Retries on 23P01, 40P01 and 40001 are bounded.
  * Fresh times are read after the transaction ends, so no second connection is held. The 20-at-once test gives exactly 1 booked and 19 × 409.
* **Tokens:** `selector.verifier`, SHA-256, `timingSafeEqual` against a dummy on a miss; every failure gives a byte-identical 404 (four kinds, live); the 4 h limit and liveness are re-checked inside the transaction after `FOR UPDATE`.
* **Audit and outbox:** audit is in the transaction (a forced failure rolls the booking back, tested), and the outbox row is written last in each of the four write paths. No personal data in the audit detail or the event payloads (live rows checked; `AuditDetail` refuses emails).
* **After the commit:** mail and jobs run after it and a throwing mailer keeps the booking. Reminders are keyed `booking:<id>:<seq>:…`, the old keys are cancelled, and the runner re-checks `sequence`.
* **Attendance:** only `recordAttendance(ctx…)` writes it, and the database also refuses one before the start.
* **Walls and guard:** firm walls answer 404 (`notInFirm`). OpenRead is on the three GETs only, and the POSTs pass the guard as writes.
* **Public door and invite:** honeypot, HMAC form stamp with minimum fill time, per-IP limits; the `.ics` has a stable UID, the database's SEQUENCE, METHOD:CANCEL, folding and escaping.

## Findings
**Major**

**M1. The public answers leak internal ids.**
* **Where:** `service.ts:302, 335, 361` return `view()` (`service.ts:515-517`), so `POST …/bookings` and `POST /api/public/bookings/:token/reschedule|cancel` send `staffId`, `personId`, `prospectId` and `typeId` (live: the 201 body of booking 2beb767f…).
* **Failure:** a stranger books with someone's email. A non-null `prospectId` in the 201 tells them that address is an open prospect of the firm (an existence oracle), and `staffId` names the host.
* **Why it matters:** this contradicts the file's own "Hosts are never named" and contracts §0.6 ("no firm data beyond what the visitor typed").
* **Fix:** a public view (status, times, label, mode, link) for the three public writes.

**M2. A reschedule to the booking's own time loses its reminders and attendance question, duplicates the event, and keeps old links live.**
* **Where:** `service.ts:316-334, 378-383`. `manageSlots` offers the booking's own time (`ignoreBookingId`).
* **Failure, live:** reschedule to 21:00 (sequence 1), then again to 21:00. The answer is 200 with sequence still 1, and the database writes nothing. Yet:
  * a second audit line and a second `booking.rescheduled` row with the same key `<id>:1`;
  * the earlier link still opens the booking (2 of 3 tokens live).
* **Lost jobs:** `afterCommit` cancels `booking:<id>:1:*` and re-schedules the same keys, which `JobPort` refuses ("a key never queues twice, even after its job … was cancelled", `ports/jobs.ts:13-14, 61`). So no 24 h or 1 h reminder and no attendance question.
* **From SCHEDULED:** the same move bumps the sequence, but the tokens are not voided (the trigger voids only on a time or host change).
* **Fix:** when the time and host are unchanged, answer the current booking without writing; add a test.

**M3. The Done-when line "every change writes one audit line in its transaction through AuditPort (pass and fail)" is proven for create only.**
* **Evidence:** the mutation above. Removing the audit line from reschedule, cancel and attendance leaves 80/80 (test 194-204 covers `booking.scheduled` only).
* **Fix:** for each of reschedule, cancel and attendance, assert exactly one audit line, and a forced `failOn` that leaves the booking unchanged, the token live and no event.

**M4. A staff booking breaks the row's prospect rule and the firm wall on `prospectId`.**
* **Where:** `staffCreate` (`service.ts:218-228`) never runs the pipeline move: the row says "a booking moves the person's only open prospect forward to Consult with the cause shown" (contracts §2.2, AG-2-26). It also stores the body's `prospectId` unchecked (`service.ts:88, 227, 294`) and publishes it (`service.ts:367`).
* **No net:** there is no foreign key yet (FO-1b defers it).
* **Failure:**
  * staff book Client A while A is in Engaged, and A stays in Engaged;
  * a mistyped id, or another person's or another firm's prospect id, is written to `fo_booking` and `module_event`.
* **Fix:** move the prospect through the arrival or sales port, and refuse a `prospectId` that is not the person's open prospect in this firm (404). Or take `staffCreate` out of this public-door PR and fix it in the staff-routes PR.

**Minor**

* **m1. A control character in a name gives 500.**
  * **Where:** `PublicBookingBody`'s `Name` (`service.ts:69`) lacks the control-character refine that `ArrivalPerson` has (`ports/arrival.ts:13`). The ZodError raised inside the transaction becomes 500.
  * **Live:** `givenNames: "Line\nTwo"` returns 500. **Fix:** the same refine, giving a 400 field issue.
* **m2. Limits are incomplete.**
  * Slots and token routes are limited per IP only (`service.ts:141, 182`). Contracts §0.6 asks for per IP **and** per firm.
  * `ipOf` takes `req.ip` (`public.controller.ts:15`) with no trust-proxy setting. Behind a proxy every visitor shares one bucket (10 bookings / 10 min for all).
* **m3. The after-commit work has no retry.**
  * A failed confirmation email is told to the console and never retried. A crash between the commit and `afterCommit` leaves no reminders or attendance question (`service.ts:374-386`).
  * **Fix:** queue the mails as keyed `JobPort` jobs (the runner retries). AG-4-34 is met as written; this keeps the link email.
* **m4. `ArrivalPort`'s extra methods.**
  * `bookingArrived` matches the brief. `contactOf` is a person-directory read that retainers, signing and invoices will also need, and `bookingConsentWording` is the consent store's (the file itself names PF-19a's ConsentPort).
  * Both widen FO-2's obligations beyond the brief's one signature. That is sound only if Lead B accepts it in the PR; better split as `PersonDirectoryPort` and `ConsentPort` before FO-2 implements them.
  * The calls also pass `this.db as unknown as Tx` (`service.ts:150, 171, 224, 392, 420`), so an adapter relying on `tx` is misled.
* **m5. Some booking ids give 500.** `lock` and `staffBooking` accept any 36 characters of `[0-9a-f-]` (`service.ts:482, 508`), so a non-uuid reaches `::uuid` and gives 500, not 404. Use the strict uuid pattern.
* **m6. The outbox payload is not validated.** It is not parsed through `BookingEvent` before the insert (`service.ts:365-370`), so the shared contract can drift silently.
* **m7. The link token travels in the URL path.** The GET routes carry it as `/api/public/bookings/:token` (`public.controller.ts:47-48`), so a live credential lands in proxy access logs, although the email link correctly uses `#token`.
  * **Related:** the 201 also returns `manageToken`, while §7 §0 says no token is "returned by a route". Confirm with Lead B or drop it (AG-4-36: the link comes by email).
* **m8. The prospect test proves the fake.** "No new lead, Consult once" exercises the fake's logic (`ports/arrival.ts:85-113`; test 181-189), not FO-3's. Mark it as the port's contract test that FO-2 must also pass.
* **m9. Misleading words on a double click.** A double click by the same person is told "Someone else booked that time a moment ago" (live).

## Done-when coverage
Each Done-when line has a pass and a fail case and holds, except two:
* **Every change audited:** create only (M3).
* **The prospect move:** proven only on the fake, for public bookings (M4, m8).

"Changing hours never moves an existing booking" holds by construction: nothing in FO-3 writes bookings on an hours change.

## Could not check
* Staff routes over HTTP: PF-4 is not on main.
* The graph's route list: it does not see call-style decorators.
* A restart of the copy: the fake arrival and jobs are in memory by design, so after a restart `contactOf` returns null and no booker emails or reminders go out until FO-2 and PF-14 land.

**Verdict: Block.** Fix M1, M2, M3 and M4; the Minors may follow.
Reviewer: Block cdb70253b45f3d66ad3d86de96c46eec63b3b0c8
