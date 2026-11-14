# FO-3 break-it pass (booking API, public door): break report

Commit `cdb70253b` on branch `claude/vigilant-dijkstra-kp1c9x`. Target: the full app copy on http://127.0.0.1:4431, database `xr_studio_runtime_fo3`. Its source is identical to the commit's `service.ts`.
It is an API with no screen, so the UI attacks (keyboard, 1024 px, 200 % zoom, uploads, 100 programs) do not apply.
How I tested: Node scripts sent HTTP requests from many loopback source addresses (127.0.x.y), so the per-IP limits stayed per attacker. I added psql set-up rows (listed at the end).
One tsx repro ran on a scratch database (`xr_studio_brk_<pid>`, dropped afterwards) because the job fakes live in memory.
The server stayed responsive the whole time: a 62-day slots read takes about 0.11 s. Live AI off, US$0.
Paths are relative to `prototype/studio/`; `svc:N` means line N of `api/src/front-office/booking/service.ts`.

## Findings

**B-1 Major: a reschedule to the booking's own time throws away its reminders and its attendance question for good.**
- Repro: book, then `POST /api/public/bookings/:t/reschedule {startsAt:<its own start>}`. This is allowed because the booking's own time is offered back to it, svc:201. Repeat with the new token.
- The first call changes SCHEDULED to RESCHEDULED, so `sequence` goes up. On the second call nothing changes, so the database leaves `sequence` as it was.
- `afterCommit` then cancels the jobs `booking:<id>:<oldSeq>:…` (svc:378) and schedules jobs under the same keys. JobPort promises "a key never queues twice, even after its job ran or was cancelled" (ports/jobs.ts:13), so nothing is queued.
- Scratch repro: waiting jobs after the first call `[1:reminder-24h, 1:reminder-1h, 1:attendance]`, after the second `[]`. Moving the clock to 90 min after the start sent no mail at all.
- Live: `module_event` holds two `booking.rescheduled` rows with the same key `<id>:1` (bookings `2beb767f…` and `73ecfd32…`), which breaks the `bookingId:sequence` idempotency key (AG-4-47). Each call also mails "has moved" to the booker and the host.
- Expected: a no-op move is refused or changes nothing, or the job keys differ for each change. The booker should still get the 24 h and 1 h reminders, and the host the attendance question (AG-4-39).

**B-2 Major: inputs the API accepts then crash the database write with a 500.**
| Request (all unauthenticated) | Actual |
|---|---|
| POST bookings with `givenNames:"Ann\u0001"`, `familyName:"Smith\r\nBcc: x"` or `"Smi\tth"` | 500 |
| POST bookings with `timeZone:"Etc/GMT0"` or `"US/Pacific-New"` | 500 |
| POST `/bookings/:t/reschedule` with `timeZone:"Etc/GMT0"` | 500 |
| `GET …/slots?from=0001-01-01T00:00:00Z` or `0000-01-01…` | 500 |
| `GET /bookings/:t/slots?from=0001-01-01T00:00:00Z` | 500 |
| POST bookings or reschedule with `startsAt:"0000-01-03T14:00:00Z"` | 500 |
- Causes:
  - Names: svc:69 `Name` has no control-character rule, but ArrivalPort's `Name` does (ports/arrival.ts:13). The `ZodError` is thrown inside the booking transaction, which the scratch repro confirms (`ZodError`, no HTTP status).
  - Zones: svc:65-67 allows a digit in a zone name (`Etc/GMT0`) and trusts Node's ICU. The database's `fo_zone_ok` refuses the same names, and the trigger's `check_violation` turns into a 500.
  - Dates: `Instant` (svc:68) accepts years 0000-0001. `slotsFor` subtracts a 2-day pad (svc:442), and PostgreSQL rejects the resulting year 0 or 1 BC.
- Nothing was saved (each rolled back) and no stack reached the body. Expected: 400 with the issue listed, or an empty list of slots.

**B-3 Major: any visitor can shut a firm's booking page for 10 minutes with empty requests.**
- `book:firm` is counted before the body is even parsed (svc:165), so 400s, honeypot hits and forged stamps all use up the firm's 200.
- Repro: 21 source IPs sent 10 `POST …/sample-solo/book/solo-consult/bookings {}` each, which took 0.48 s. A real booking from a new IP then got `429 Please wait a few minutes`. The same booking had been 201 just before.
- The per-IP counter also counts the visitor's own 400s, so a person who makes 10 typing mistakes is locked out (svc:163).
- Expected: only count requests that pass validation, honeypot and stamp, or at least don't let invalid requests fill the per-firm count.

**B-4 Major: the public answers expose internal ids, including whether an email has an open prospect.**
- `POST …/bookings`, `POST /bookings/:t/reschedule` and `/cancel` return `view()` (svc:302, 335, 361, 515). That includes `staffId` (the host's id), `typeId`, `personId` and `prospectId`.
- Live: `"staffId":"feb217ff-…","personId":"e2a6ab1c-…","prospectId":null`.
- With the real arrival path, a stranger can book with someone else's email and read `prospectId`. Not null means that person is an open prospect of the firm.
- Contracts §0.6 says a door "never says whether the person is known", and the controller header promises "no firm data beyond the page's own".
- Expected: the public reply carries status, times, mode, label and `manageToken` only, as `manageView` already does (svc:185).

**B-5 Major: a held, locked or deleted firm still takes changes through old links.**
- `publicType` refuses any firm that is not ACTIVE or TRIAL (svc:132), but `byToken` never reads the firm's status (svc:488).
- Repro: with `sample-solo` set to `PAYMENT_HOLD`, the page answers 404. Its existing token still got 200 on `GET /bookings/:t` and on `/slots`, and `POST /reschedule {startsAt:"2026-11-25T15:00:00Z"}` returned 200: a new time was taken, an audit line and an event were written, and mail was sent. A `SECURITY_LOCK` firm takes the same calls.
- Expected: the same not-found as the page for a firm that is not ACTIVE or TRIAL, or a decision on record that bookers of a held firm may still move or cancel.

**B-6 Minor: times that were never offered are answered with "Someone else booked that time a moment ago".**
- Seen for a past time, an odd minute (slot + 7 min), a weekend, a closed day, a time inside the notice, a time beyond the window, year 9999, and the second 01:30 on 7 Nov 2027 (svc:59, 308).
- The fresh slots in the answer let the person recover, but the sentence is false. Expected: separate wording ("That time is not available").

**B-7 Minor: the not-found is not byte-identical for a NUL byte in a path.** `GET …/firms/sample%00firm/book/x/slots` returns the filter's general 404 ("Not found (it may have been removed by a reset)", type `/problems/404`) instead of the door's own. This does not reveal whether anything exists.

**B-8 Minor: one form stamp serves any number of bookings for 2 hours.** In my battery a single stamp booked about 15 times, from many IPs and for two types of the firm (svc:534-549). The minimum fill time stops only the first 3 seconds of a bot.

**B-9 Minor: names that look empty or spoof text are accepted.**
- Accepted with 201: a name of only `​`, a right-to-left override `‮gnp.exe`, `U+2028`, and C1 `U+0085`.
- These reach the greeting and the `.ics` CN. The type name check in FO-1b already refuses invisible-only text.

**B-10 Minor: zone spellings that are not canonical are stored.** `timeZone:"America/TORONTO"` was booked, and the label reads "(America/TORONTO)". `fo_zone_ok` also allows it.

**B-11 Minor: booking with a known email overwrites that person's details.**
- The fake's `bookingArrived` always runs `contacts.set(…, a.person)` (ports/arrival.ts:104 at `cdb70253`, in this diff).
- So a stranger who books with a client's email replaces the name and phone used in the client's own confirmations and reminders. This is code reading only, because the fake's store cannot be seen over HTTP. It also sets what FO-2 is expected to copy.

**B-12 Minor (latent): every visitor shares one IP behind a proxy.**
- `ipOf` uses `req.ip` (public.controller.ts:15), and `main.ts` sets no `trust proxy`.
- Today that is right: `X-Forwarded-For` and `X-Real-IP` were ignored, and the 11th POST was 429. Behind PF-8's load balancer, though, all visitors would share 10 bookings per 10 minutes.

## What held
- **Double booking:** 20 parallel POSTs for one slot gave 1×201 and 19×409. 16 parallel POSTs for two overlapping slots (gap 10 min) gave 1×201. 3 reschedules plus 5 new bookings racing into one slot gave 1×201. No overlap in `fo_booking`.
- **One token, two moves:** two parallel reschedules gave 200 and 404. Cancel and reschedule at once gave 200 and 404.
- **Two live tokens:** after a same-time move, the two tokens used at once gave 200 and 404.
- **Old tokens:** the old token after a move is 404, and a second cancel is 404.
- **Slot rules:** closed day 18 Nov offers 0 slots and booking it is refused. On 14 Mar 2027, 02:00 and 02:30 are skipped. On 7 Nov 2027, 01:30 is offered once and its second occurrence is refused.
- **4 h limit:** `canChange:false`; `/slots`, reschedule and cancel all answer 409 `SELF_SERVICE_CLOSED`.
- **One not-found:** unknown firm, unknown slug, inactive type, the other firm's slug, upper-case firm key, a 200-character key, malformed tokens, and a UUID token with a wrong verifier all got the identical 404 body. The same holds for POST.
- **Token tampering:** one flipped verifier character, an upper-case id, the id only, a trailing `.x`, a leading `%20` and a trailing `%20` all got 404.
- **Body validation:**
  - Strict body: extra keys, `staffId`, arrays, objects, `consent:"true"`/false/missing, a wrong wording id, the honeypot, forged, empty, garbage or too-fresh stamps, `America/toronto`, `../etc/passwd`, and an email with CRLF or over 254 characters all got 400 or 409.
  - Sizes: the 6 MB body got 413. A 100,000-deep JSON array got 400.
- **No personal data in records:** 40 `booking.*` audit lines and 40 events hold no names or emails (regex on `@`, the names and `example`). Every 500 body was the generic sentence.
- **Header injection:** the email subject carries no typed text, and `.ics` CN quotes are stripped.

## Rows I added (left in place)
- `fo_consultation_type`: `b0000000-…0001` `sample-solo/solo-consult` (host a79a6304); `…0002` `sample-firm/inactive-type` (inactive); `…0003` `sample-firm/quick` (host 1003039b, notice 0, `window_days` 730).
- `fo_availability`: 1003039b on weekdays 0 and 6, 0-1440 America/Toronto.
- `platform_firm_setting` `platform.closed_days` = `["2026-11-18"]` for sample-firm.
- sample-solo was set to PAYMENT_HOLD and then SECURITY_LOCK, and is back to ACTIVE.
- About 30 bookings made by my scripts (emails `*@example.com`).
- sample-solo's in-process per-firm booking count was full at about 14:20 UTC (B-3). It clears after 10 minutes or on restart.
