# PF-21 break report: complaints register (schema + service), PR #1753 at `5eca107`

Breaker, 14 Nov 2026. Scope: the row PF-21 (= FO-13k rev 12's Done when, plus migration on empty and demo-data copies and `migrate diff` empty) and its brief. No screen and no route, so no UI attacks. Method: scratch databases `xr_studio_pf21brk_{a,bare,demo,deploy}` on :54329 (all dropped at the end). I drove the service through PF-0p's local fakes from scratch tsx scripts outside the repo, using two real `PrismaClient`s for the races and psql for direct SQL. For the demo-data copy I ran an API on :4493 against a database migrated up to before PF-21, loaded "Reset to the six" (17 programs, 6 combinations, 145 audit rows), then applied PF-21's migration. Paths are under `prototype/studio/`: `C` = `api/src/platform/complaints/complaints.ts`, `BD` = `…/business-days.ts`, `M` = `prisma/migrations/20261114200000_pf21_complaints/migration.sql`.

## Findings

**Blockers: none.**

**M1 (Major): the row's events `complaint.received` and `complaint.closed` are never published.**
* Did: grepped and drove every path.
* Expected (FO-13k "What": "events `complaint.received`, `complaint.closed`"; brief: names come from `ports/events.ts` `EVENT.*`): a module event on record and on close.
* Actual: only `plat_complaint_event` rows (kinds RECEIVED/CLOSED) and AuditPort lines (`complaint.record`, `complaint.close`). Nothing is published, and the PR plan does not list it as deferred.
* Where: C:151-153, C:259-261.

**m1 (Minor): a reminder can be lost for good.**
* (a) `JobPort.cancel` runs inside the transaction, before commit (C:187, C:207, C:261). I forced a commit failure on acknowledge (a deferred trigger in scratch). Expected: the reminder survives. Actual: `acknowledged_at` stays NULL, 0 jobs are queued, and 10 fake days later 0 reminder mails are sent.
* (b) `schedule` (C:153) happens before commit. I recorded a complaint received 3 business days ago (due already past) and had a worker run the due job before commit. Expected: one reminder. Actual: the job returned `skipped`, was consumed, and no reminder was ever sent.
* Both need a commit failure or a fast worker. The JobPort signature takes no `tx`.

**m2 (Minor): the received date is not fully checked.**
* `2026-02-31T10:00:00Z` is accepted and stored as 3 Mar (Date.parse rolls over; C:49).
* `0001-…`, `0000-…` and `0099-…` crash with `RangeError: Invalid time value`, a 500 instead of a 422. `localDate` builds an unpadded year (BD:322, BD:334).
* `1900-01-01` is accepted, so there is no plausibility floor.

**m3 (Minor): an id of 36 hex characters or dashes that is not a uuid crashes with a 500 instead of the 404.**
* Did: called `get`, `acknowledge` (and every `change`) with `"-"×36` or `"a"×36`.
* Actual: PrismaClientKnownRequestError / 22P02. The pre-check `/^[0-9a-f-]{36}$/i` is too loose (C:126, C:160).

**m4 (Minor): invisible or hostile text passes as "filled".**
* Did: tried summaries made only of RLO, LRM, U+2066/2069, the Hangul filler U+3164, the braille blank U+2800, a soft hyphen, CGJ or U+180E.
* Actual:
  * All are accepted. TEXT_FILLED is at C:42 and plat_has_text at M:107.
  * The C1 controls U+009B (CSI) and U+0085 (NEL) pass CONTROL (C:44).
  * U+2028 and NEL pass the "one line" rule for the name and contact (C:45, M:114).
* The database is weaker than the service: under the C collation `[:space:]` does not match U+3000 or U+2003, so an SQL insert of those is accepted where the service gives 422.

**m5 (Minor): the database lets through much of what the service refuses.** This contradicts C:11.
* Via SQL, all accepted: an OPEN complaint set CLOSED, or acknowledged, with no matching event; two ACKNOWLEDGED events; event `at` of 1900 or 3000; `acknowledged_at` = 3000-01-01; a complaint with no RECEIVED event at all.
* Two concurrent RECEIVED inserts (two psql sessions) gave **2 RECEIVED events**: the count at M:181 takes no lock that serialises inserts.

**m6 (Minor): app-level privileges bypass the "never deleted" and "insert-only" rules.**
* Did, as the app role `xr_studio` (superuser and table owner on this cluster): `SET session_replication_role = replica` (needs superuser or a SET grant), `ALTER TABLE … DISABLE TRIGGER USER` (owner), `DROP TRIGGER` (owner).
* Actual: each one deleted the complaint and its events, or changed a closed outcome (rolled back afterwards).
* This is a cluster-wide posture (module_event is the same), not PF-21's alone. M:132-140.

**m7 (Minor): the timeline is not ordered.**
* Did: closed a complaint at 17 Nov after acknowledging it at 19 Nov.
* Actual: accepted. Response-before-acknowledgement is also accepted. Each date is checked only against `receivedAt` (C:204, C:231, C:258).

**m8 (Minor): a closing time inside a daylight-saving gap gives an early deadline.**
* `zonedInstant` (BD:326-331): Toronto, open Sun 00:00-02:30, on 8 Mar 2026 → the deadline is 01:30 EST, an hour early; Havana, closes 00:30 on 8 Mar 2026 → Sat 7 Mar 23:30, the day before.
* Pacific/Apia counts the skipped 30 Dec 2011 as a business day.

**m9 (Minor): the list is capped at 500 with no sign of it.**
* Did: listed a firm with 600 complaints.
* Actual: `all`, `open` and `overdue` each return 500 and give no total or cursor. Because the order is newest first, the 100 **oldest overdue** are the ones dropped (C:174).

**m10 (Minor): the reminder goes to a deactivated handler.**
* Did: deactivated the handler after recording the complaint.
* Actual: the mail still went to that person's address, with no fallback to Owner or Admin. The handler lookup ignores status (C:281).
* The mail gives the deadline in UTC ISO, not the firm's zone (C:285).

**m11 (Minor): some choices are not in the row; they should be named in the PR.**
* A handler with **no** complaint keys can close with any outcome (C:107). The row says "visible … to the handler", not "acts".
* `subjectId` is never checked: any uuid is stored, including another firm's person id.
* The "never by anyone" triggers plus the fixed facts also block anonymisation at the end of row 105's keep period (M:133-170). PF-21b/21d will have to rewrite them.

**m12 (Minor), P-600:**
* `platform.prisma` gets **two** lines (86 and 210, firm and staff). The brief says "the one slot line".
* `plat_has_text` is a generic helper name in a prefix shared with the coming PF-21b/21c in the same file, so there is a later "already exists" and rollback clash risk (M:106).

## What held
* **Deletes and truncates:** delete, `MERGE … DELETE`, truncate of either table or both, `TRUNCATE platform_firm/platform_staff CASCADE` (the complaint trigger fires on the cascade), and deleting the firm or a handler (RESTRICT) are all refused.
* **Closed complaints:** reopen, outcome change, an `updated_at`-only or no-op update, any event but NOTE, a second CLOSED event, event update or reassign, and inserting a complaint already CLOSED are all refused. In the service, close again, step, acknowledge, response and handler change → 409; a second acknowledgement or response → 409, and the database refuses it too.
* **Races with two connections:** close‖close ×5 gives exactly one CLOSED and one 409; close‖step is always serialised, never a step after CLOSED (also at SQL level); ack‖ack gives one ACKNOWLEDGED; reminder‖reminder ×3 gives one mail and one REMINDER_SENT; reminder‖ack and close‖reminder never send a reminder after an acknowledgement or a close.
* **Firm walls:** firm B's Owner on firm A's ids → 404, upper case too; a firm-B handler → 422; a reminder payload naming firm A with firm B's id → skipped; a context with firm A plus a firm-B staff id → 404; mixed-case context ids, `subjectId` and handler ids are lowercased and work.
* **Roles:** a case officer who is not the handler → 404 on get and act, and empty lists; the read-only key reads everything, but close or handler change → 403 and delete → 405; the record-only key records, then gets 404 on its own record; a suspended handler → 422.
* **Text:** 4000 characters or 2000 emoji are accepted; 4001 characters or 2001 emoji → 422; NUL, ESC, zero-width-only and newline-in-name → 422; SQL-looking text is stored literally; RTL text is accepted.
* **Dates:** future dates, `24:00` past now, `+99:00`, `infinity` and date-only → 422; infinite values are refused by the database.
* **Business days:** Toronto across fall-back and spring-forward, Lord Howe, Chatham, Kiritimati, Kolkata, Santiago, Etc/GMT+12 and UTC are all correct. A firm with no business day, or with all 366 days closed, gets the 2-calendar-day fallback, never an endless walk.
* **No personal data leaks:** none in audit `detail`, the audit summary, event `detail` or the reminder mail (ids only, no summary, no name).
* **Demo-data copy:** the migration left every row of every table unchanged, including an md5 of `audit_event`. Reset to the six then ran green with 2 complaints present, and both were kept. `prisma migrate deploy` on an empty database is clean.
* **P-600:** every function, trigger and constraint is `plat_`. The stamp `20261114200000` is later than main's newest, `20261114120000_fo1b_booking_tables`. `migrate diff` shows nothing for plat_; the 5 remaining lines (fact_source, form_edition_accept, person_role, validated_copy, canonical_field_name) are identical on main's schema before PF-21, so they are pre-existing.
