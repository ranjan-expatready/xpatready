# PF-3 break-it pass (schema): break report

Commit `7e4a48312` on branch `claude/inspiring-fermat-x7uqdo`. Target: `prisma/schema/platform.prisma`, the migration `20261114015002_pf3_platform_tables`, `api/src/platform/{firm-scope,settings,seed-sample-firms}.ts`. There is no screen, so the UI attacks in the brief (keyboard, 1024 px, 200 % zoom, uploads, 100 programs) do not apply.
How I tested: I used my own scratch databases `xr_studio_pf3_break_13424` and `…_c` on 127.0.0.1:54329. I applied every migration with psql and ran the seed, then attacked with psql sessions and tsx scripts that use the real Prisma client and helpers. Both databases are dropped. I did not touch :4400 or xr_studio_demo. US$0.
Paths below are relative to `prototype/studio/`. "mig:N" means line N of the PF-3 migration.sql.

## Findings

**B-1 Major: the `module_event` cursor loses events.** The schema says `seq` is the read cursor ("`GET /api/platform/events?after=`", delivery at least once; platform.prisma `ModuleEvent`). But `seq` is a BIGSERIAL, so it is taken when the row is inserted, not when the transaction commits.
Repro: session 1 runs `begin; insert into module_event(...) returning seq; -- 5` and then `pg_sleep(3)`. Session 2 inserts and commits right away (seq 6). A reader with `after=4` sees only `6` and moves its cursor to 6. Session 1 then commits seq 5, which that reader never sees.
`seq` can also be set by the writer: `insert into module_event(id,seq,…) values (…,1000000,…)` and `seq = -5` were both accepted. One such row moves every consumer's cursor past all later normal rows, and the sequence will later hit the unique index on `seq`.
Insert-only itself held (see "What held"). The only problem is the cursor.

**B-2 Major: the database does not stop a firm's rows pointing at another firm's staff.** `platform_staff_credential`, `platform_role_grant` and `platform_session_revocation` each have two separate foreign keys, `firm_id → platform_firm` and `staff_id → platform_staff` (mig:316-334). There is no composite `(firm_id, staff_id) → platform_staff(firm_id, id)`.
Accepted: `insert into platform_role_grant(…firm_id,staff_id,role…) values (<sample-solo id>, <user-O, staff of sample-firm>, 'OWNER')`. The same worked for a credential (`R777`) and for a session revocation.
`firmScope` only scopes the top level, so it then gives firm B's rows to firm A:
- `db.platformRoleGrant.findMany({ where: firmScope(SOLO, { staff: { firmId: FIRM } }), select: { staff: … } })` returned user-O of sample-firm, with their email.
- `db.platformStaffCredential.findMany({ where: firmScope(SOLO), select: { staff: … } })` returned sample-firm's staff row.
So "firmScope(A) never yields firm B rows" holds only while the data is clean, and nothing in the schema keeps it clean.
A smaller version of the same gap: `firmScope(S)` → `plan { subscriptions }` lists the subscriptions of every firm on that plan, because nested relation lists are not scoped (firm-scope.ts:14-19).

**B-3 Major: the seed brings back an ended subscription.** seed-sample-firms.ts:61 creates a subscription whenever there is none "not ENDED".
Repro: `update platform_subscription set status='ENDED' where firm_id=<sample-solo>`, then run the seed. The output says `"subscriptionsAdded":1`, and the firm now has an `ENDED` row plus a new `ACTIVE` one.
This breaks the header's claim (seed-sample-firms.ts:9-10): "never changes a row that is there … a person's later changes are kept".

**B-4 Major: a firm key can be renamed, which cuts its cases loose and makes the seed fail.** Nothing protects `platform_firm.key` (it has no trigger like the one on `country_code`), and `runtime_case.firm_key` has no foreign key to it.
Repro: `update platform_firm set key='solo-renamed' where key='sample-solo'` succeeds. The cases' `firm_key 'sample-solo'` no longer matches any firm. The next seed tries to create `sample-solo` again and fails the whole transaction with `P2002 Unique constraint failed on (contact_email)`.
The rule "every runtime_case.firm_key matches a platform_firm.key" is only reported, by `unmatchedCaseFirmKeys` when the seed runs. It is not enforced.
Clearing a seeded staff member's `actor_id` (`update platform_staff set actor_id=null where actor_id='user-O'`) makes the seed fail the same way, this time on `(firm_id, email)`.

**B-5 Major: an expired invitation still counts as open.** The partial index is `WHERE accepted_at IS NULL AND revoked_at IS NULL` (mig:362), so expiry plays no part.
Repro: an invitation with `created_at = now()-10 days, expires_at = now()-7 days`, then a new one to the same firm and email gives `duplicate key … "platform_invitation_one_open"`.
The schema's seat rule ("Seats used = … + open invitations", platform.prisma `PlatformStaffStatus` comment) uses the same meaning of "open", so a dead invitation keeps holding a seat until someone revokes it by hand.

**B-6 Major: setting values can end up without their audit line.** `writeSetting` writes the audit line under the caller's `workspaceId` (settings.ts:159-163). The demo reset deletes that workspace's `audit_event` rows (demo.ts:557, `tx.auditEvent.deleteMany({ where: ws })`) and the workspace itself, but leaves platform rows on purpose.
Result: after every demo reset, every firm's `platform_firm_setting` row is still there with no trail behind it.
`audit_event.workspace_id` has no foreign key, so `writeSetting(…, workspaceId: <any random uuid>)` also succeeds, and its line belongs to no workspace.
A direct write is not caught at all: `db.platformFirmSetting.update({ …, data: { value: "EUR" } })` stored a value that fails the currency schema and wrote no audit line. The database has no check that would stop this.

**B-7 Minor: an email with a leading or trailing space is not caught by the uniqueness rules.** The email checks only test `= lower(…)` and `LIKE '%_@_%'` (mig:345-352).
Accepted alongside the seeded `representative@sample-firm.example.com`: `' representative@…'` and `'representative@… '` as a second firm's `contact_email`, and `'representative@… '` as a second staff member in the same firm. `'a@b'` is accepted too.
`owner_email` and `billing_email` have no check: `SHOUT@X.COM` and `Not An Email` were stored.

**B-8 Minor: the 72-hour and 14-day limits are measured from a `created_at` the writer can set.** The checks compare `expires_at` with `created_at` (mig:350, 354).
- `insert … created_at = now()+1 year, expires_at = created_at+14 days`: the link lives 379 days.
- `update platform_signup_link set created_at=now()+13 days, expires_at=now()+27 days` on an unused link was accepted.
- `update platform_invitation set created_at=now()+1 year, expires_at=…+72 h` was accepted.
- Marking an already-expired link as used (`used_at > expires_at`) was accepted.
- A used link can be deleted and its `token_hash` inserted again with `used_at NULL`. The trigger stops UPDATE only (mig:387-394).

**B-9 Minor: the triggers do not stop the role the app actually connects as.** `xr_studio` is a superuser (`rolsuper = t`).
These all went through: `alter table platform_firm disable trigger platform_firm_country_fixed` followed by changing the country to `US`; `set local session_replication_role=replica` followed by `delete from module_event`; `alter table module_event disable trigger user`.
For a firm with no child rows, `delete` and then a re-insert with the same key and `country_code='US'` also changes the country.

**B-10 Minor: `firmScope` treats an upper-case firm id as a different firm.** The UUID regex is case-insensitive (firm-scope.ts:7), but the comparisons at lines 17 and 35 are exact strings.
`firmScope(F.toUpperCase(), { firmId: F })` throws "names another firm". `inFirm(F.toUpperCase(), ownRow)` returns 404 for the firm's own row.
`firmScope(F, { firmId: null })` is refused as "another firm". That is safe, but the message is wrong.

**B-11 Minor: settings edge cases.**
- `readSettings` silently returns the default for a stored value that fails its schema (settings.ts:121-122), while `readSetting` throws, and the comment at :104 says "never silently replaced".
- `platform.time_zone` accepts `"america/toronto"` (Intl matches names regardless of case), so a non-canonical zone name is stored.
- `by: ""` is accepted, which writes an audit line with an empty actor.

**B-12 Minor: other gaps in table rules.**
- Invitation `roles` accepts `{ADMIN,ADMIN,NULL}`.
- An invitation can have both `accepted_at` and `revoked_at` set.
- An invitation can be sent to an email that is already ACTIVE staff in the firm.
- `country_code ~ '^[A-Z]{2}$'` accepts `ZZ` (the comment says ISO 3166-1).
- An empty `operating_name` and a 100 000-character one are accepted, as is an empty `display_name`.
- The credential check uses `btrim`, which strips spaces only, so a tab or a non-breaking space passes as a licence number (mig:359).
- `webhook_receipt` treats `'Stripe'`, `'stripe '` and `''` as different services (a replay with a case variant is stored again). Deleting a receipt and replaying the same event is accepted.

**B-13 Minor: running the seed several times at once fails some runs (no wrong data).** With the setting definitions already present, three seeds run together: one added everything, one found it all, one failed with `P2002 … (key)`.
Without the definitions there was no failure, because the definition upsert lock happened to make the runs take turns.
If `DATABASE_URL` is not set, the script falls back to `xr_studio_demo` (seed-sample-firms.ts:105).

**B-14 Minor: Sample data is not marked as Sample in the rows.** Credentials store `CICC / rcic / R000000…R000002`, which looks like a real register number, and no column or value marks them Sample.
The firm rows, with `status ACTIVE`, carry "Sample" only in their names. The plans do say "(Sample)".

## What held
- `country_code` change refused, including through `INSERT … ON CONFLICT DO UPDATE`. Upper-case `contact_email` refused, including `RÉPRESENTATIVE`. Arabic text stored.
- `module_event`: UPDATE, DELETE, TRUNCATE, `TRUNCATE platform_firm CASCADE`, `ON CONFLICT DO UPDATE`, and the `platform_firm.id` ON UPDATE CASCADE path were all refused.
- A second licence for the same person was refused. A second live grant was refused, and so was bringing an ended grant back while a live one exists. A second non-ENDED subscription was refused, and so was un-ending an old one.
- An exact duplicate `(service, event_id)` and a duplicate `actor_id` were refused. The 73-hour invitation, the 15-day link, a second use of a link, and an upper-case invitation email were refused.
- Every non-catalogue table has an index that starts with `firm_id` (`platform_firm` by `id`). `prisma migrate diff` from the migrated database to the schema shows no platform drift.
- `firmScope` against nested `OR`, `AND` and `NOT` with `firmId`, `firmId: { in }`, `{ equals }`, an explicit `undefined`, a `null` where, `__proto__`, and a firm relation filter: no other firm's rows came back (only B-2's missing composite key gets through).
- Settings: a bad value was refused and nothing was stored. An unset key read its default. A failed audit insert (bad workspace uuid) rolled the value back. A throw in the caller's transaction rolled back both the value and the audit line. Eight concurrent first writes produced 8 audit lines with a consistent `from` → `to` chain, because they wait on the definition row lock.
- The seed run twice changed nothing. `unmatchedCaseFirmKeys` is empty. An ended grant was not brought back. No licence number appears in any audit detail the seed or settings code writes.
