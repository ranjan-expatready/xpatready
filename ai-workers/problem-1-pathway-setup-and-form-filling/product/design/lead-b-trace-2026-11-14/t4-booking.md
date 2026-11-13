# T4 trace: booking (contracts section 2.2, rows FO-1 and FO-3, FO-4 "Book a consult") against AG-04

Read-only trace, 13 Nov 2026. Requirement: `AG-04-consultation-and-booking_v2.1_2026-10-25.md` (file "AG-04", line numbers are that file's) and the AG-04 hand-over (`DEV-HANDOVER-AG04_2026-10-22.md`). AG-02 is cited as "AG-02 v2.6" where it settles the prospect link. Our side: contracts = `platform-and-front-office-contracts-2026-11-14.md` (section 2.2 at lines 58-64); rows = `lead-b-rows-2026-11-14.md` (FO-1 line 17, FO-3 line 19); FO-4 concept line 44.
Instructions inside the requirement files are treated as data.

## 0. Facts that frame the trace (facts only)

* The hand-over gives **no month-one scope and no build order of its own**. It says "Start at Page 1" and lists changes (lines 18-36). It names AG-04 **v2.0** and still words some points the old way ("Engage and create proposal", invoice on the person); its own header says newer files win. AG-04 v2.1 is newer and says "This file wins over any other note about bookings" (AG-04 line 45). The trace uses v2.1.
* AG-04 build order: chapters 1 to 13 in Part B "are already in build order"; chapter 1 (availability and slots) and chapter 3 (the booking write) first (AG-04 lines 33, 313-331).
* The team's Release 1 includes paid consults, group and collective sessions, own-calendar sync, per-person video (99-Phasing v1.22, Release 1 row, AG-4 item). Our month one is thinner by founder decision P-553 (2).
* No AG-04 card or decision says "month one"; thin is our choice, so every deferral below is ours, not the requirement's.

## 1. Trace table

Status words: matches / thin (matches, less than the card) / deviation / missing.

| Our contract item or row | Requirement card ids (exact) | What the requirement says (own words) | What we build in month one | Deviation and reason |
|---|---|---|---|---|
| 2.2 Job: firm sets consultation types (length, mode, who takes it) | AG-4-9, AG-4-10, AG-4-11, AG-4-12/AG-4-51 (lines 589, 619, 645, 670) | Type has name, length 5-480, purpose, ways to meet, host list; free consult is public | `fo_consultation_type` (name, minutes, mode, staff_ids, buffer, active); `GET/PUT consultation-types` | Thin. Missing slug, purpose, start interval, separate gap before/after (see section 2). Name "consultation type" vs "appointment type" (section 5) |
| 2.2 / FO-1 `fo_availability` (staff, weekday, start, end, time zone) | AG-4-62 (356); BR-2, C4 `AvailabilitySchedule` | Each person sets weekly hours in named sets, one default, each with its own time zone, any day any time | One set of weekly windows per staff with a zone | Thin. Requirement groups rows in named sets (AG04-D17); month one keeps one set; keep a set-level zone, not a zone per row |
| 2.2 / FO-1 `fo_time_off` | AG-4-62 rule 5, 8 (356); Part A "Time off" (226) | Time off is the person's out-of-office dates in the AG-16 My account; AG-04 stores none; Owner/Admin may enter a colleague's | Own table `fo_time_off` (staff, from, to) | Deviation: own table. Reason: no My account in month one; move to the platform's staff profile later |
| FO-3 slots `GET .../slots?type&from&to&tz` | AG-4-1/2/3 (398), AG-4-4/5/66 (432), AG-4-18 (1065); BR-1, BR-2 | Slot = hours of the host's set, in the set's zone, minus closed days, time off, padded bookings, notice, window; UTC identity; display in visitor zone | Hours, time off, buffers, bookings; tz param; DST test for 1 Nov 2026 America/Toronto | Matches on hours, zones and DST. Missing: shortest notice, booking window, closed days, start interval, DST rule 8 (skip a time that does not exist, offer a doubled time once) |
| FO-3 `POST .../bookings`, 20 parallel requests give one booked, rest 409 | AG-4-25/26/27 (782); BR-3 (1932) | Re-check inside the write; one database rule: no two active bookings for one host overlap (range padded by gaps); loser gets 409 SLOT_TAKEN with fresh slots; no outside call inside the transaction | `btree_gist` exclusion on `BOOKED` ranges per staff; 409 test | Deviation (defect): active set must be BOOKED **and** RESCHEDULED (BR-3 lists PENDING_PAYMENT, SCHEDULED, RESCHEDULED); our design has RESCHEDULED status but excludes only BOOKED. Range must include the gaps. Other points thin |
| 2.2 `fo_booking` status `BOOKED, RESCHEDULED, CANCELLED, ATTENDED, NO_SHOW` | C2 States (1957); AG-4-39 (1354); BR-23 | States SCHEDULED, RESCHEDULED, CANCELLED, COMPLETED, NO_SHOW (plus PENDING_PAYMENT, EXPIRED for paid); COMPLETED and NO_SHOW can be swapped later | Five states, renamed | Names differ (section 5). PENDING_PAYMENT and EXPIRED deferred with paid |
| 2.2 `fo_booking` fields (person, prospect, staff, type, UTC range, booker tz, token hash, note) | C4 `Booking`, `BookingHost`, `BookingAccessToken` (2000-2019); AG-4-36 (1320) | Booking keeps booker's zone; `sequence` rises on each change; several self-service tokens may be live; reschedule voids all and issues a new one; stored only as hash; expire at meeting end | One `manage token hash` column; booker tz; no sequence | Deviation: single token column cannot hold several live tokens or expire at meeting end; no `sequence` (needed for event keys and invite SEQUENCE) |
| 2.2 API `POST /api/public/bookings/:token/reschedule\|cancel`; "a used or wrong manage token gives 404" | AG-4-36/37/38 (1320); BR-10 | Reschedule and cancel from SCHEDULED or RESCHEDULED up to a 4 h limit; after it "reply to this email"; old links die on reschedule | Reschedule and cancel by token; 404 on a bad token; cancel frees slot | Thin. Missing: self-service limit and its message; reschedule must work from RESCHEDULED (V1.5 bug 5, AG-4 line 31); reschedule offers same type's slots and keeps host if free |
| 2.2 invite "both sides get a calendar invite", `.ics` by MailPort | AG-4-32/57 (1196); BR-9; AG-4-42 (1674); AG04-D12 | Invite on every confirmation and update; stable UID, SEQUENCE = booking sequence, METHOD REQUEST then CANCEL; no answers inside; host copy holds only what runs the meeting | One `.ics`, parsed back in test (UTC start, organiser email) | Thin. Missing: update (same UID, SEQUENCE+1) and cancel (METHOD:CANCEL); host's copy is our stand-in for chapter 10 (calendar sync, deferred) |
| 2.2 Events out `booking.made`, `booking.changed`, `booking.outcome` (`prepare_retainer`) | AG-4-47/48 (895); C6 (2035); BR-12 | Six events: scheduled, expired, rescheduled, cancelled, completed, no_show; keys `bookingId` and `bookingId:sequence`; same transaction as the change | Three events, outbox | Deviation: names and count; `prepare_retainer` flag has no counterpart (next step is the button clicked, AG-4-50 line 1776). `booking.scheduled` and `booking.cancelled` already exist as the team's built contracts (AG-4 lines 29, C6) |
| 2.2 "booking by a new person runs the arrival path (door BOOKING)" | AG-4-22/23/24 (932); AG-02 v2.6 AG-2-10 (line 1376) | AG-04 never makes a lead; AG-02's arrival path does, keyed `booking:`+bookingId so repeats make one lead; known person without open prospect gets a new lead with possible-match banner | FO-3: unknown email gives one new lead, source Booking page | Thin and consistent with AG-2-10. Missing: arrival key, known-person cases (section 2) |
| 2.2 "a booking moves the person's only open prospect forward to Consult, never backward" | AG-02 v2.6 AG-2-10 rule 2 (line 1388), AG-2-26; AG-4-22 rule 1 | Person with an open prospect: no new lead, booking on timeline; exactly one open prospect moves to Consult with cause "consult booked"; at Consult or later stays; several open prospects: no move | Test: Engaged moves to Consult, past Consult not moved back | Matches the rule; missing the "no new lead when a prospect is open" and "several open prospects" cases |
| 2.2 "outcome recorded (attended, no-show, prepare retainer)"; `PATCH bookings/:id` outcome note | AG-4-39 (1354), AG-4-49 (1743), AG-4-50 (1776); BR-11, BR-13, BR-23 | Host is asked 30 min after the end "Did X attend?"; one click; no automatic no-show; change later; consult record = time spent, notes, recommended items, optional quoted fee; next step is a button | Outcome note, status Attended or No-show, `prepare_retainer` | Thin. "Prepare retainer" is a button on the record, not an outcome value. Quoted fee and recommended items feed the retainer (BR-13): deferred only if FO-5 does not read them |
| 2.2 API `GET /api/front-office/bookings?from&to&staff` | AG-4-67 (1899); C5 (2020) | Staff see a booking if they may see its lead or prospect; host always sees own; list needs `booking:list` | List by dates and staff | Missing: visibility rule and keys |
| 2.2 Reads from others: staff and roles | C5 (2020), D8 | Exactly six booking keys; own hours and own time off need no key | Not stated | Missing: key mapping (section 2) |
| 0.3 `CalendarInvitePort` (live Google/Outlook sync later) | AG-4-40..43, AG-4-56 (1625-1700) | Own-calendar connect, busy blocks slots, bookings appear on it | `.ics` only; sync later | Matches the thin choice (deferral listed in section 3) |
| 0.6 public doors: honeypot, rate limit, no firm data | AG-4-17/21 (1037), AG-4-20 (1117); C7 | Slugs only, one identical not-found, answers belong to the type; honeypot, minimum fill time, per-IP and per-firm limits, no CAPTCHA | Open door, rate limit, honeypot (FO-2 tests; FO-3 breaker yes) | Thin. Add one identical not-found and the minimum-fill-time check to FO-3 |
| FO-4 "Book a consult" next step (concept line 44) | AG-4-50 (1776), AG-4-63 (816) | From a lead or prospect staff can book; the record's button starts the retainer | Button only after FO-3's screen is live | Matches. Staff create endpoint is missing from FO-3 (section 2) |
| Mail failure | AG-4-34 (1249), AG-4-25 rule 8 (line 797) | Booking saved even if message jobs cannot be scheduled; no mail call inside the transaction | `MailPort` fake in CI | Missing: stated rule and test |

## 2. Mandatory in the requirement for the parts we keep, missing from our design

Each line: card id, then one-line fix and where it goes.

1. **BR-3 / AG-4-26 (line 782, 1932):** active set for the exclusion includes RESCHEDULED (and later PENDING_PAYMENT); the range is start minus gap before to end plus gap after. Fix: contracts 2.2 `fo_booking` and FO-1 test ("overlap refused" repeated for a RESCHEDULED row; padded range).
2. **AG-4-4/5/66 (432):** shortest notice 4 h, booking window 60 days, gap before 0 min and after 10 min, self-service limit 4 h as per-type nullable fields with those Sample defaults (firm Timings screen later). Fix: contracts 2.2 `fo_consultation_type` (replace single "buffer minutes"); FO-3 slot test.
3. **AG-4-1 rule 2 (398):** slot start interval, empty = meeting length. Fix: add `start_increment_minutes` to `fo_consultation_type`.
4. **AG-4-1 rule 8 (398):** a clock time that does not exist on the change night is skipped, a doubled one is offered once. Fix: add to the FO-3 DST test (1 Nov 2026 is the doubled hour in America/Toronto; 8 Mar 2026 would be the missing hour).
5. **AG-4-7 (492):** a booker is never offered a slot on a firm closed day (list starts empty, firm fills it). Fix: contracts 2.2 reads a closed-days list from firm settings (PF-9); if PF-9 has none in month one, one small `fo_closed_day` table.
6. **AG-4-62 rule 1 (356):** a new staff member gets default hours copied from the firm's hours (Sample Monday to Friday 09:00-17:00). Fix: FO-1 seed; concept line 44 already says Sample hours.
7. **AG-4-62 rule 7 (356):** changing hours or adding time off never moves or cancels an existing booking. Fix: one FO-3 test.
8. **AG-4-9 rule 2 (589), AG-4-16 (1009):** type slug unique in the firm; page address `/book/<slug>`; no raw ids accepted. Fix: add `slug` to `fo_consultation_type`; public API takes slugs.
9. **AG-4-10 (619):** purpose field decides public or not. Fix: one `purpose` column (month one only the free-consultation value) so case types can be added without a data change; or state in 2.2 that month-one types are all public free consults.
10. **AG-4-11 rules 1-3 (645):** phone mode requires the booker's phone; in-person confirmation carries the address; one way means no question. Fix: add to FO-3 booking validation.
11. **AG-4-29/30 rule 2 and D5(2) (1521, line 61):** a video booking is still made without a link ("Your join link will follow"); host's saved or pasted link is used. Fix: contracts 2.2 add `meeting_link` on the booking and one saved link per staff member (text field); no provider integration.
12. **AG-4-14 rule 1 (705):** first name, last name and email always asked. Fix: FO-3 booking body.
13. **AG-4-19 rules 2-3, 6 (1089):** unticked consent box with the firm's own sentence; the tick, the wording id and the time go to the arrival path, which writes the consent row. Fix: contracts 2.2 POST body; FO-1 `fo_consent` already exists.
14. **AG-4-12 rules 2, 5 (670), bug 1 and 2 (line 31):** with several staff on a type a slot is offered if at least one listed host is free, and the host given is a free one (first free person), never "least booked that day". Fix: FO-3 test; `staff_ids` already implies this.
15. **AG-4-12 rule 9 and AG-4-53 (1812):** no usable host means no slots; an inactive or suspended person is never offered. Fix: FO-3 slots read only active staff.
16. **AG-4-47/48 (895), C6:** event names, keys (`bookingId`, `bookingId:sequence`), `sequence` column on the booking. Fix: contracts 2.2 events and tables; align names (section 5).
17. **AG-4-32 rules 1-3 (1196):** stable UID per booking, SEQUENCE from `sequence`, update on reschedule, METHOD:CANCEL on cancel. Fix: FO-3 `.ics` test extended.
18. **AG-4-36 rules 1-3, 6 (1320):** hashed tokens, several live, all voided on reschedule and cancel, expire at meeting end, usable from RESCHEDULED. Fix: replace `manage token hash` with a small token table (booking id, hash, expires, voided).
19. **AG-4-37 rule 5 (1320):** inside the limit the page says to reply to the email or call. Fix: FO-3 test and public message.
20. **AG-4-39 rules 1-5 (1354):** the attendance question appears 30 min after the end; a person answers; no auto no-show; the answer can be changed later (sequence rises). Fix: contracts 2.2 outcome text and FO-3 test (unanswered stays unanswered, nothing sent).
21. **AG-4-22 / AG-2-10 (932; AG-02 line 1376):** arrival keyed `booking:`+bookingId; a booker with an open prospect makes no lead; known person with nothing open gets a new lead with the possible-match flag; staff booking counts as first response. Fix: FO-3 tests and key in FO-1 `fo_arrival_receipt`.
22. **AG-4-63 (816), C5 (2020):** staff can book for a lead or prospect, and staff can reschedule and cancel at any time. Our job line says staff book but no staff endpoint exists. Fix: add `POST /api/front-office/bookings` and staff reschedule/cancel to FO-3, with the same strict slot rules (override warnings deferred, section 3).
23. **AG-4-34 (1249):** a failed mail never loses a booking; mail is sent after commit. Fix: FO-3 test with a throwing fake adapter.
24. **AG-4-17/21 rule 3 (1037) and AG-4-20 rule 3 (1117):** unknown firm, unknown type and inactive type give an identical answer; minimum fill time. Fix: FO-3 breaker list.
25. **AG-4-67 (1899), C5 (2020):** a booking is visible as its lead or prospect is; the host always sees own; `booking:list` required. Fix: contracts 2.2 visibility line; map to the six keys (list, create, edit; type edit; configure availability).
26. **AG-4-18 rule 3 (1065):** the visitor's zone is stored on the booking and used in every message and invite. Fix: already stored; add "messages use it" to FO-3 test.

## 3. Requirement says, we defer past month one

All with the requirement's own card; none is marked month-two by the requirement.

* **Paid consultations (AG-4-44, 45, 46; lines 1409-1504):** per-type price, trust payment request at booking or billing at Attended, 30-minute hold, expiry, refunds. It is in the team's Release 1 (99-Phasing, AG-4 item). Needs `ClientPaymentsPort` and trust (AG-06). Keep the schema open: states PENDING_PAYMENT and EXPIRED, price columns, `booking.expired`, all added later by migration; make the exclusion predicate easy to extend.
* **Reminders (AG-4-31 "Appointment reminder", AG-4-61; lines 1159, 1273):** 24 h and 1 h before, sent at exact time. Needs a timed-job runner. Our design lists none. Also the "Complete your payment" and "Payment expired" messages (paid).
* **Message rows controlled on the Automatic messages page (AG-4-31 rule 2, AG-12):** on/off per message; month one sends confirmed, updated, cancelled fixed.
* **Consultation agreement tick (AG-4-15; line 733, MS-D3):** on by default for first consults; needs the template machinery and accept link. Legal wording: Unconfirmed: no counsel.
* **Group sessions, collective hosting, round robin, caps (AG-4-6, AG-4-12 rules 4, 6, 7, AG-4-65; lines 463, 670, 964):** first free person only.
* **Several named sets of hours and type windows (AG04-D17, AG-4-1 rule 1, AG-4-62 rule 1a, 1b):** one default set.
* **Staff override warnings and overlap exception (AG-4-63, O4; lines 816, 87):** strict only; the `overlapConfirmedByUserId` carve-out in the exclusion rule comes with it.
* **Case calls: "Book a call", "Send booking link", `CASE_LINK` token (AG-4-64, line 847):** needs the case side.
* **Custom intake questions and field map (AG-4-14, AG-4-21 rule 4):** fixed fields only.
* **Booking page embed, firm-branded address under the firm's web domain (AG-4-16 rules 3, 4):** a plain link; domain is the platform's.
* **Preview as a booker (AG-4-8, line 548).**
* **Own calendar sync, busy times, video accounts (AG-4-40..43, 56, 58, 59; lines 1625-1726, 1555-1608):** `.ics` only.
* **Several offices and office time zones (AG-4-60, line 521):** one zone.
* **Staff who leave: handover of future bookings (AG-4-53 handover part, AG-4-54, 55; lines 1812-1865):** only "inactive person is never offered" is kept (section 2, item 15).
* **WhatsApp channel (AG-4-33/35, line 1223):** email only.
* **Figures (AG-4-52, line 1870):** shown in AG-14, not built.
* **Time off as the My account out-of-office list (AG-4-62 rule 8):** own table now; colleague time off entered by Owner or Admin is kept if a role check is cheap.
* **Undo Attended and billing at Attended (AG-4-39 rules 8-10):** paid only.
* **Per-type `allowReschedule`, `allowCancellation` flags (AG-4-37 rule 4):** both always on.
* **Consult record extras (AG-4-49 rules 5-7):** recommended items, quoted fee, assessment panel; keep time spent and notes. Confirm with FO-5 whether the retainer reads the quoted fee.

## 4. Conflicts

| # | Evidence | Settled by | Founder needed? |
|---|---|---|---|
| C1 | Our event names `booking.made/changed/outcome` against the team's six (AG-4 lines 903-909, C6 2035); two already exist as built contracts. | Team's requirement is the first source (AGENTS rule 2); same words cost nothing. Rename to the six, drop `prepare_retainer`. | No |
| C2 | Our FO-3 says a booking by an unknown email "makes one new lead"; AG-04 says it never makes a lead (BR-7, line 1936; AG-4-22 rule 1). | Same effect: our module calls the arrival path (as AG-02 AG-2-10 does on the event), keyed `booking:`+bookingId. Word it that way. | No |
| C3 | Exclusion on `BOOKED` only against BR-3 active set (SCHEDULED, RESCHEDULED, PENDING_PAYMENT). | Internal defect; BR-3 and AG-4 line 36 ("prove with two-connection test"). | No |
| C4 | Hand-over (v2.0 wording) says "Engage and create proposal" and invoice on the person; AG-04 v2.1 says "Engage and prepare retainer" and trust money held on the person (MS-D2, MS-D15). | AG-04 line 45 and the hand-over's own update note: newest file wins. Our text already uses "prepare retainer". | No |
| C5 | Paid consults are Release 1 in the requirement; month one defers them. | Founder's thin-month-one decision P-553 (2) already covers scope; no best practice overrides it. | Only if the month-one demo must show a paid consult; otherwise no |
| C6 | Reminders default on in the requirement (24 h, 1 h); our design has none. Industry practice (no-show reduction) supports keeping one. | Lead's call on thin scope; cost is a timed-job runner, not product choice. | No (Lead decides; flag as risk to the 'booking works' demo) |
| C7 | Time off stored by AG-16 My account per requirement; ours in `fo_time_off`. | Month-one scope; migrate when My account exists. | No |
| C8 | Requirement hours are named sets with one default; ours one set per staff, zone per row. | Cheaper to add a set table now than migrate later; AG04-D17 (line 73). | No |

No conflict needs the founder on its own; C5 only on a demo-scope condition.

## 5. Term mapping (requirement name against ours)

| Requirement (AG-04) | Our name |
|---|---|
| Appointment type (`AppointmentType`), "Free consultation" | consultation type (`fo_consultation_type`); a consult = a booking of a free-consultation type |
| Purpose `FREE_CONSULT`, `PAID_CONSULT`, `FOLLOW_UP`, `CASE_REVIEW`, `OTHER` | none (all free consults) |
| Ways to meet `IN_PERSON`, `PHONE`, `VIDEO` (`locationTypes`) | `mode` |
| Host (`assignedHostUserId`), host list (`AppointmentTypeHost`) | `staff_id`, `staff_ids` |
| Hosting choice `ONE_ON_ONE`, `ANY_AVAILABLE`, `GROUP`, `COLLECTIVE`; pick rule `FIRST_FREE`, `ROUND_ROBIN` | month one: first free person only |
| Person's hours / "Normal hours" (`AvailabilitySchedule`), type window (`TypeWindow`) | `fo_availability` |
| Time off = out-of-office dates (AG-16 My account) | `fo_time_off` |
| Gap before / after (`bufferBeforeMins`, `bufferAfterMins`) | buffer minutes |
| Shortest notice, booking window, self-service limit, slot start interval | not present |
| Booking page (`https://<firm>.expatready.com/book/<slug>`), booker, slot | public slot page, person |
| Booking status SCHEDULED, RESCHEDULED, CANCELLED, COMPLETED, NO_SHOW, PENDING_PAYMENT, EXPIRED | BOOKED, RESCHEDULED, CANCELLED, ATTENDED, NO_SHOW |
| Self-service link (`BookingAccessToken` purpose `MANAGE`) | manage token |
| Attendance prompt "Did X attend?" (Attended, No-show) | outcome |
| Consult record (`ConsultRecord`); next step button "Engage and prepare retainer" (lead) or "Prepare retainer" (prospect) | outcome note; `prepare_retainer` |
| Events `booking.scheduled`, `booking.expired`, `booking.rescheduled`, `booking.cancelled`, `booking.completed`, `booking.no_show` | `booking.made`, `booking.changed`, `booking.outcome` |
| Arrival path door `BOOKING`, source "Booking" (AG-02); stage Consult (`CONSULT`, FO-1 key) | door `BOOKING`, source "Booking page"; same stage key |
| Calendar invite (ICS, UID, SEQUENCE, METHOD) | `.ics` through `CalendarInvitePort` |
| Six booking messages: confirmed, reminder, updated, cancelled, complete your payment, payment expired | not listed; month one needs confirmed, updated, cancelled |
| Six permission keys (`agent/booking-event-type:list`, `:edit`, `:configure-availability`, `agent/booking:list`, `:create`, `:edit`) | not listed |
| Scheduler (the non-AI worker that computes slots and books) | `front-office/booking` module |
