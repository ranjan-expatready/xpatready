# PF-3 review: platform tables (schema and seed only)

Reviewer (did not build it), 14 Nov 2026. Commit **7e4a4831**, branch `claude/inspiring-fermat-x7uqdo`, PR #1728. Row: BACKLOG (lead/2026-11-07-lead31) "| PF-3 |"; contracts 2026-11-14 §0, §1.1, §1.2, §7 (§7 binding). No screen and no route, so the UI parts of screen-review (walks, 1024 px / 200 %, BIC table) are N/A. Journey test: `journey-test-reviewer-2026-11-14.md` in this folder, **8.5 / 10**.

**Not reviewed:** during the review, uncommitted edits to `migration.sql` and `platform.prisma` appeared in this checkout from another agent (composite `(firm_id, staff_id)` keys, "break B-2"). They are not part of 7e4a4831, so this review does not cover them. They would address M1 once they are committed and re-checked.

## What I ran (all on scratch databases on 127.0.0.1:54329; never :4400)
* `npx tsx tests/check_pf3_platform_schema.ts`: **55 passed, 0 failed** (16 s). `npx tsx tests/check_prisma_schema.ts`: **8 passed, 0 failed** (main's 5 known differences unchanged).
* Copy of the real demo database (`CREATE DATABASE … TEMPLATE xr_studio_demo`; it holds no rows in this environment). I applied PF-3's migration, and the row counts were unchanged. `prisma migrate diff` named only main's 5 known lines, no PF-3 object. I ran `seed-sample-firms.ts` twice: the first run added 2 firms, 4 staff, 6 grants, 3 licences and 2 subscriptions; the second added nothing (`unmatchedCaseFirmKeys: []`). The rollback written in the migration header runs cleanly, and the migration re-applies after it.
* My own parse of SA-06 v3.15 §10b (lines 1043-1412; struck/withdrawn rows left out) is exactly equal to the migration's 774 `(role, key)` rows. That includes per-role counts 231/213/145/99/46/40, equal to Appendix C (line 1723 on). Both `changePermission` keys (`agent/settings:edit`, `agent/security-policy:manage`) are in the catalogue.
* Break pass:
  * 10 concurrent first writes of one setting give 1 row and 10 audit lines, with a consistent from→to chain (the definition upsert serialises them).
  * 8 concurrent mixed writes all succeed.
  * The seed refuses in words when the plans are missing.
  * `tsc -p api/tsconfig.json`: no error in the new files (pre-existing errors elsewhere).
  * `graph.mjs --check` exits 0.

## Done-when lines: pass and fail, and does removing the rule turn the test red?
Every line has a passing and a failing case, and each failing case names the constraint or trigger by name. Removing the index or trigger makes it red:
* migration on empty + demo-shaped copy, diff empty (bare DB differs; second apply refused)
* `country_code` (trigger)
* one licence per person
* contact email one firm (also refuses capitals)
* one open invitation
* webhook unique by service + event id
* module_event update/delete/truncate refused
* setting schema refusal (400 + issues)
* unset key reads its default
* one audit line in the transaction (a forced audit failure rolls back; the caller's transaction rolls both back)
* `firm_id` first (probe table named)
* `firmScope` A vs B (404)
* seed idempotent (snapshot including timestamps)
* `Case.firm_key` match (an `other-firm` case is named)
* one staff row per Sample actor (a duplicate `actor_id` is refused)

The weakest of these: "seed run twice" has no strict failing twin (its fail case tests a neighbouring property). The demo copy is three hand-made cases inserted with FKs bypassed (`tests/check_pf3_platform_schema.ts:69-73`); that is the house convention (A24), and I re-checked it on a real template copy above.

## The builder's eight choices, judged
1. **Insert-only `module_event`, `delivered_at` dropped, `seq` added:** I agree with dropping it. The row's Done-when ("refuses update and delete") is binding, and a per-consumer cursor fits at-least-once delivery. But `seq` alone is not a safe cursor (M2).
2. **Nullable `firm_id` on `webhook_receipt` and `platform_signup_link`:** agree. Both are disclosed and both are still `firm_id`-first indexed. `inFirm` treats null as not in the firm, so such rows are invisible to every firm.
3. **ACTIVE | SUSPENDED | DEACTIVATED:** agree. §7 (binding) counts suspended staff in seats (SA-3-41). `INVITED` would duplicate `platform_invitation`.
4. **Seed mapping:** agree. user-T, a Case Manager with a licence, matches §7's representative-of-record definition and BR-20. `firm_admin` → OWNER follows §1.2's mapping. user-O's made-up email is on example.com and the display names carry "(Sample)".
5. **Platform rows survive the reset:** agree (the firm is the tenant). See m3 for a side effect.
6. **774 permission rows:** verified independently (above).
7. **Caller-given `workspace_id` on the setting audit line:** acceptable until AUD-1 adds `firm_id`. See m3.
8. **Two-step default off:** agree. AG01-3 (team requirement; TEMPLATE-MAP line 695, DEV-TASKS C6) outranks the contracts' recommendation under AGENTS rule 2, and founder question 3 stays open.

## Findings

### Blocker
None.

### Major
* **M1: a firm A row can point at firm B's staff member.** `platform_role_grant`, `platform_staff_credential` and `platform_session_revocation` each carry `firm_id` and `staff_id` with two independent FKs: `platform.prisma:222, 242, 288` and `migration.sql:319, 325, 334`.
  * Failure, run on the migrated copy: `insert into platform_role_grant (id, firm_id, staff_id, role, granted_by) values (gen_random_uuid(), '<sample-firm id>', '<user-S id, sample-solo>', 'OWNER', 'bug')` gives `INSERT 0 1`. The same happens for `platform_session_revocation`.
  * Impact: a later route bug, or a guard that loads grants by `staff_id`, gives firm B's person firm A's Owner role. A firm-scoped revocation also lands on another firm's person. This undermines §0.2 ("firm A cannot … change … firm B's rows"; the row rules must be addable "without a data change") and STANDARDS [M] "authorisation on the server … insecure direct object references".
  * Fix: `@@unique([firmId, id])` on `PlatformStaff`, and composite relations `fields: [firmId, staffId], references: [firmId, id]` on the three tables. Add a pass/fail check: the matching firm is accepted, a mismatched firm is refused.
* **M2: `seq` as the read cursor can lose events for good.** `platform.prisma:312-317` and `migration.sql:226` say "seq is the read cursor (`GET /api/platform/events?after=`); delivery is at least once". The PR's Question 1 asks the lead to ratify "PF-4/FO rows read with `seq`".
  * Failure, run on the copy: transaction 1 inserts an event (seq 1) and stays open. Transaction 2 inserts seq 2 and commits. A reader at that moment sees only seq 2 and moves its cursor to 2. Transaction 1 then commits seq 1, which no `after=2` read will ever return. So `prospect.won` or `retainer.executed` can be skipped and the case never opens.
  * Fix (small, in this PR): either add a commit-visibility column (`xid8 DEFAULT pg_current_xact_id()`, with readers returning only rows below `pg_snapshot_xmin(pg_current_snapshot())`), or write the rule that every outbox insert first takes one transaction-scoped advisory lock. Correct the comment and the PR answer either way.

### Minor
* **m1:** `platform_invitation.roles` is nullable (`migration.sql:188`), and `CHECK (cardinality("roles") >= 1)` (`:351`) passes on NULL. An invitation with no roles inserts (`roles` = NULL, `INSERT 0 1`, run). Fix: NOT NULL, or `coalesce(cardinality(roles),0) >= 1`.
* **m2:** `readSettings` silently returns the default for a stored value that no longer fits (`settings.ts:121-122`), while `readSetting` throws for the same row (`:110-111`; its comment says "never silently replaced"). Run: currency stored as "EUR" gives `readSettings` → "CAD", but `readSetting` throws. Make the two agree.
* **m3:** setting audit lines do not survive the demo reset, but the settings do. The line carries a workspace id (`settings.ts:133-134, 159-163`). The reset's `sweepOrphans` deletes every `audit_event` row whose workspace is gone (`api/src/demo.ts:590-594`), while `platform_firm_setting` has no workspace and stays. After one reset, a changed setting has no audit line. No route calls `writeSetting` yet; record it for AUD-1 / the settings-route row.
* **m4:** the stored `value_schema` is weaker than the enforced one: `z.toJSONSchema(…, { unrepresentable: "any" })` (`settings.ts:90`) stores the time zone as `{"type":"string"}`. Anything that validates against the database row would accept "Mars/Olympus". Say in the comment that zod in code is the authority.
* **m5:** `inFirm` compares case-sensitively after a case-insensitive uuid check (`firm-scope.ts:7, 15, 35`). `inFirm(firmA.toUpperCase(), ownRow)` gives a 404 on the firm's own row (run). Fix: lower-case in `firmScope`.
* **m6:** the 72-hour invitation check is relative to a caller-given `created_at` (`migration.sql:350`). A row with `created_at` = now + 30 days and `expires_at` = now + 32 days is accepted (run). Fix: `created_at <= now() + small skew`, or check against `now()` in a trigger.

## D1-D20 (schema-only row; simulated)
D1 4 (every Done-when line and binding §7 table present) · D2 **3** (M1, m1; races fine) · D3 5 (permission keys copied from SA-06, not invented) · D4 N/A · D5 4 (rollback works, failed audit rolls back; M2) · D6 4 (audit line per change; m3) · D7 N/A · D8-D14 N/A (no screen) · D15 5 (check 16 s, seed under 2 s, indexed firm-first) · D16 4 (pass and fail for every line; seed-twice fail case weak) · D17, D20 not walked (no user surface) · D18 5 (SA-06 / AG01-3 cited, Sample labelled) · D19 N/A until PF-4.

No Blocker. Two Majors (M1, M2) are open on 7e4a4831; both are small schema or comment fixes in the same files. Re-review the commit that fixes them.

Round 1 verdict (7e4a4831): Block.

## Round 2: head d5d13ed8 (code in 603d97e2f; diff only, P-277)

**Checks run:**
* `check_pf3_platform_schema.ts`: **70 passed, 0 failed**.
* `check_prisma_schema.ts`: **8 passed, 0 failed**.
* My round-1 probes, repeated on a fresh database built from every migration plus the seed:
  * **M1 fixed.** A firm A grant, revocation or licence naming firm B's person is refused by the `…_firm_id_staff_id_fkey` constraints. The new tests cover both cases: the person's own firm is accepted, another firm is refused.
  * **M2 fixed.** I re-ran the out-of-order commit. The second writer now waits on the `module_event_next_seq` lock: a reader at 1.5 s sees nothing, and after both commit, seq follows commit order (slow 2, fast 4). Gaps come from the column default's discarded number and are harmless. Visibility comes before the lock is released at commit, so a reader past n cannot miss a later commit below n. The comment is corrected (`platform.prisma` ModuleEvent).
  * **m1 fixed.** An invitation with `roles` NULL is refused (`platform_invitation_has_role`).
* Also fixed, each with a test:
  * m2: `readSettings` throws, as `readSetting` does.
  * m5: `firmScope` lower-cases the id; `inFirm` with an id in capitals now matches the firm's own row.
  * The breaker's items: firm key immutable; an expired invitation closed by the next insert; the seed keeps an ended subscription; the seed skips a person found by (firm, email); trimmed and lower-case checks on every email; accepted and revoked both set is refused; canonical time zone spelling; empty `by` refused.
* The new triggers' `DROP FUNCTION` lines are in the rollback header. The advisory-lock key follows the repo's existing `hashtext` pattern.

**Still open (Minor; none blocks):**
* **m3** (the breaker's B-6, which it rated Major; I keep it Minor): after a demo reset, setting values stay and their audit lines go (`api/src/demo.ts:590-594`). No route writes settings yet, and the fix needs `demo.ts` or AUD-1, outside this row's files. It is now documented (`settings.ts:4-6`) and asked in the PR. It must be settled before any settings route ships.
* **m4** (stored `value_schema` weaker than the zod rule) and **m6** (lifetimes measured from a writer-set `created_at`): listed in the PR, not fixed.
* **m7 (new): a staff member can be moved to another firm, carrying their roles.** The composite keys use the default `ON UPDATE CASCADE` (`migration.sql` `…_firm_id_staff_id_fkey`). Run: `update platform_staff set firm_id = '<sample-firm>' where actor_id = 'user-S'` gave `UPDATE 1`. user-S's OWNER and CASE_MANAGER grants and licence moved with them, so they became an Owner of sample-firm. This needs a code bug that writes `platform_staff.firm_id`, and no contract operation moves staff between firms. Fix in a later row (or here, if cheap): `onUpdate: Restrict` on the three relations, or a firm-fixed trigger on `platform_staff`, like the key and country triggers.
* **m8 (new, note for PF-4 and FO writers):** event writers now commit one at a time. A transaction that writes an event early and then waits on a row another event writer holds will deadlock; PostgreSQL aborts one, which must be retried. Write the outbox row last in its transaction. This is fine at the 100-firm size (P-562).

No Blocker or Major is open at d5d13ed87685f758689d1e487b70a82bc4265bd1. The journey score stands at 8.5 / 10; with M1 and m1 fixed, "Correct data" rises to 1, giving 9 / 10.

Round 2 verdict (d5d13ed8): Approve.

## Round 3: head d4c2c426 (diff from d5d13ed8 only)

**Checks run:**
* `check_pf3_platform_schema.ts`: **75 passed, 0 failed**.
* `check_prisma_schema.ts`: **8 passed, 0 failed** (no drift from `onUpdate: Restrict`).
* Probes on a fresh database built from every migration plus the seed:
  * **m7 fixed.** Moving user-O (who has grants) or a staff member with no other rows to another firm is refused by `platform_staff_firm_fixed`, and the three `(firm_id, staff_id)` keys are `ON UPDATE RESTRICT`.
  * An invitation listing a role twice is refused (`platform_invitation_roles_distinct`).
  * Accepting after expiry is refused (`platform_invitation_accepted_in_time`).
  * Asia/Kolkata, America/Argentina/Buenos_Aires, America/Port-au-Prince, Etc/GMT+5 and UTC are accepted. "america/toronto", "Mars/Olympus" and "EST5EDT" are refused.
  * Emails: NBSP, zero-width space, tab and a second "@" are refused; "josé@…" and "first.last+tag@…" are accepted.

**New Minors from this round (neither blocks):**
* **m9: the email rule does not refuse "any space or invisible character", as the change says.** The database is C-locale (`datctype = C`), so `[:space:]` covers ASCII only. Only the listed characters are refused: U+00A0, U+200B-200D, U+2060, U+FEFF. Run: an address containing U+2003 (em space), U+2009, U+202F, U+2028, U+3000, U+200E (LRM), U+2062 or U+00AD (soft hyphen) is accepted by every email check. Two addresses that look the same can then sit side by side under the unique indexes. Fix: add the ranges U+00AD, U+180E, U+2000-200F, U+2028-202F, U+205F-2064 and U+3000, with a test (or have PF-4's input check reject them).
* **m10: time zone capitals are only partly canonical.** `settings.ts` `ZONE_NAME` checks only the first letter of each part, and Intl matches regardless of case. So "America/TORONTO" and "AMERICA/Toronto" are accepted and stored as a second spelling of one zone. It is harmless where the value is used (Intl and PostgreSQL ignore case), but break m-11's aim is only half met.

**Still open as listed in the PR (unchanged, Minor):**
* m3 / B-6: the demo reset deletes setting audit lines; this goes to `demo.ts` or AUD-1 and must be settled before a settings route ships.
* m4, m6.
* m8 / R2-4: write the outbox row last in its transaction.
* R2-5, the expired-close marker, and deleting and reinserting an empty firm.

None of these lets wrong data in through a route that exists today. No Blocker or Major is open at d4c2c426c53c6b431e0be84abfd97a32b329da77.

Round 3 verdict (d4c2c426): Approve.

## Round 4: head 896c34f8 (diff from c5ba30f8 only; merge-batch failure, run 43546321596)

**The change:** `api/src/case-feed.ts` gains `PLATFORM_ENTITIES = {"platform_firm_setting"}`, and the sweep in `tests/check_case_feed.ts` accepts a third list. That sweep found `platform/settings.ts`'s audit entity on neither list. `npx tsx tests/check_case_feed.ts`: **36/36, exit 0**. With the third list removed from the sweep, the batch's original failure comes back.

**Is it right?** Yes.
* **Choosing a third list over the configuration list:** correct. `firmMayRead` lets every firm read a configuration line that names no case (`case-feed.ts` `isConfigEntity`). On `CONFIG_ENTITIES`, firm A's setting changes, including their from/to values, would reach every other firm's staff in `studio.ts` `activity()`.
* **Behaviour:** unchanged. A platform line names no case and is not a configuration entity, so it falls to the existing fail-closed branch: no firm's staff read it. Configuration people read every line, as before (`studio.ts:1255-1265`); they are our own content staff, not a firm's.
* **The two-list shape:** nothing depends on it. The only consumers are `studio.ts`'s `firmMayRead` call and comments (`studio.ts:1253-1256`, `library-changes.ts:365`, `submission.ts:271`, `filing-record.ts:69`, `check_forms_b88_qa263.ts:4`). The comments still read correctly, because a third list is still "on neither" case nor configuration list.
* **The tests:** pass ("on the platform list only"), fail (another firm's line, and a line with no case, read by no firm's staff) and no overlap with either list or the "library " prefix. All are real checks.

**Minor (neither blocks):**
* **m11: the "read by no firm" claim has one narrow exception, and it is self-inflicted.** `firmMayRead` looks for a case named in the words before it checks the entity. The firm key rule allows `case-deadbeef` (`platform_firm_key_check`), which makes the summary "Firm case-deadbeef: setting …" look like a line about case `deadbeef…`. Run: `firmMayRead({entity: "platform_firm_setting", summary: "Firm case-deadbeef: setting platform.currency changed"}, new Set(["deadbeef"]))` gives `true`. Only the firm that chose that key leaks its own setting lines, to a firm owning a matching case prefix. Fix when convenient: `if (PLATFORM_ENTITIES.has(e.entity)) return false;` as the first line of `firmMayRead`, or keep firm keys from starting with `case-`.
* **m12: misplaced comments.** The new comment block went in between `isConfigEntity`'s own comment ("A configuration entity: listed, or a library change's …") and `isConfigEntity`. So `PLATFORM_ENTITIES` now carries both comments and `isConfigEntity` carries none (`case-feed.ts` around line 40). Move the old comment back above `isConfigEntity`.

No Blocker or Major is open at 896c34f82bb280775648ffa3618824d7aae28264. Rounds 1-3 stand; nothing else changed.

Verdict: Approve (896c34f82bb280775648ffa3618824d7aae28264)
