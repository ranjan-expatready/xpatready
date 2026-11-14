# FO-5 part 1 of 2 (schema step): independent review (P-303)

* **PR:** #1761, branch `claude/funny-franklin-ckwwev`. **Commit reviewed:** `62a981d53a11bea1cf9dcd86f8878301b8394b62` (`git rev-parse HEAD`; `origin/main` is an ancestor). Reviewer: Opus, did not build it. Date: 14 Nov 2026.
* **Read:** the diff (`git diff origin/main...HEAD`, 5 files), row FO-5 (`origin/lead/2026-11-07-lead31`), brief `lead-b-briefs/FO-5.md`, concept `fo-5s-retainer-signing` §1-§3, §5-§7 lines naming templates and drafts, contracts §0, §2.3-§2.6 and §7 (`origin/lead-b-front-office`), FO-1b's schema file and migration on main for precedent.
* **Scope:** schema only. The API, `FilesPort`, `DocumentRenderPort`, routes and events are part 2 and are not marked missing. Judged: can this schema carry the row's API rules and FO-6's signing flow?

## Runs (local Postgres 127.0.0.1:54329, PATH with postgresql@18)
* `npx tsx tests/check_fo5_retainers.ts`: **45 passed, 0 failed**.
* `npx tsx tests/check_fo1b_booking_schema.ts`: **80 passed, 0 failed** (the one-line change limits its foreign-key list to FO-1b's own tables; same line as #1755).
* `npx tsx tests/check_prisma_schema.ts`: **8 passed, 0 failed**.
* My own probes on a scratch database with every migration applied (dropped afterwards): scenarios (a)-(i) below. The rollback note, run inside a transaction on a populated database: every statement succeeds and no `fo_retainer%` function is left. **Rollback note correct.**

## P-600 and the standing schema rules: all met
1. Own schema file (`front-office-retainers.prisma`) and own migration folder: yes.
2. Additive on own tables only: four new tables, five new enums, no existing table, column or row touched; `platform.prisma` gains three back-relation lines only (`PlatformFirm` 78-79, `PlatformStaff` 208). The demo-data copy keeps its rows (test line "applies to a demo-data copy").
3. Every function and trigger carries `fo_retainer_` (checked by the test and by reading).
4. Stamp `20261114210000` is later than main's newest (`20261114120000_fo1b_booking_tables`).
5. Release holder's read of the migration diff: for the release holder, not this review.
* `firm_id` first in every index but the PK (test and reading, incl. the partial unique index); cross-firm references impossible through composite keys `(firm_id, id)` with RESTRICT/RESTRICT to `platform_staff`, the template, the retainer and the version (tests pass and fail); money `amount_minor` BIGINT cents, `currency` CHAR(3) = 'CAD' only, 0..10^10.

## What holds (checked against BR-9..BR-11, BR-16, AG-5-65)
* Status moves (migration.sql:310-322): DRAFT → SENT / SIGNED_OFFLINE; SENT/VIEWED → VIEWED, CLIENT_SIGNED, DECLINED, EXPIRED, WITHDRAWN, SIGNED_OFFLINE, DRAFT (edit); CLIENT_SIGNED → SIGNED, WITHDRAWN, SIGNED_OFFLINE only (no edit, no expiry: AG-5-65, BR-16); DECLINED/EXPIRED → DRAFT by edit only (AG-5-65 r1); SIGNED, SIGNED_OFFLINE, WITHDRAWN final. Matches BR-10 (withdraw from Sent, Viewed, Client signed) and BR-11 (offline from Draft, Sent, Viewed, Client signed).
* (h) BR-9 "Send updated version" in one transaction from VIEWED (end v1 UPDATED → DRAFT with v2 → insert v2 and its fee → SENT → v2 sent_at) commits: `SENT:2`. A racing edit after CLIENT_SIGNED is refused (row lock, then the trigger sees CLIENT_SIGNED).
* (i) One live RETAINER per prospect (migration.sql:227): WITHDRAWN and EXPIRED free it; DECLINED holds it. Edit and resend of an EXPIRED retainer after a new one was drafted is refused 23505, the right answer (the API must map it to a plain message).
* Versions write-once except `sent_at` once, then `ended_at`+`end_reason` once; version n+1 only after version n's request ended; fee rows never updated, deleted or truncated; withdraw and Signed offline carry reason (1-200), time, actor and (offline) PDF key and sha256.

## Findings

### Major
**M1. A draft's template (and subject/company) can never change, and a draft has no way out.** `migration.sql:303-308` refuses any change of `template_id`, `template_version`, `template_file_key`, `subject`, `company_id` in every status, DRAFT included; `:312` allows DRAFT only to SENT or SIGNED_OFFLINE; `:245` forbids delete; `:227` forbids a second live retainer. The concept makes the template a field of the draft: S3 "left: **Template** · Signer · Representative · Fees", S2 "Draft → Continue the draft", BR-6 "choices that must be made — template … (field errors)" before Send. BR-1's "a retainer keeps the template version it was made from" means a later upload does not alter it, not that staff cannot pick another one while drafting. Contracts §7 §2.1 also allows a prospect's **Change type until signed** (Individual ↔ Corporate), which the frozen `subject`/`company_id` cannot follow.
*Failing scenario (probe a, reproduced):* staff prepare a retainer for prospect P with "Standard", then pick "Express Entry" in S3 → `PATCH /retainers/:id` → `fo_retainer: kind, prospect, subject, company, template and creation never change`; withdraw → `status cannot move from DRAFT to WITHDRAWN`; delete → `rows are never deleted`; Prepare retainer again → `fo_retainer_one_live_per_prospect`. The only exits are sending the wrong agreement to the client and withdrawing it (the client gets "Agreement withdrawn") or recording a false Signed offline. "Delete a draft" is on the concept's Not built line, so the fix belongs in the schema.
*Fix:* while `OLD.status = 'DRAFT' AND NEW.status = 'DRAFT'`, allow the template triple (and `subject`/`company_id`) to change together with a new version (`current_version + 1`, as signer and representative already do at `:337`), re-running the insert checks (same kind, active, version = the template's current one). Add a pass and a fail pair.

### Minor
* **m1. Fee rows can be added to an already rendered version later, and with no lock** (`:394-411`). The header (`:11`, prisma `:170`) says fee rows are "written with their version", but the trigger only requires the version to be current, unsent and its retainer DRAFT. *Probe b:* a second transaction adds a CAD 3,000 row to v1 after v1's file and `original_sha256` were stored → accepted. The version's file then does not show a fee its rows list, which flows into `signing.completed`'s agreed total and FO-7's invoice. The SELECT at `:401` also takes no lock, so a fee insert racing a Send can land on a version that has just been sent (READ COMMITTED). *Fix:* require that the version was inserted by the same transaction (e.g. `ver.xmin` = the current transaction id) and `FOR SHARE` the retainer row, or change the comment to say this is the API's job.
* **m2. The retainer's status is not tied to its current version's request.** *Probes c, d, e:* `sent_at` is accepted on a superseded unsent version (v1 while v2 is current); a retainer moves to SENT with no version at all; WITHDRAWN is accepted while the current version's request is still open (`sent_at` set, `ended_at` null). BR-10 ("the link stops") and BR-11 ("ends the open request") then rest on the API and FO-6 alone. *Fix (or record as part 2's job):* `sent_at` only on `n = current_version`; → SENT needs the current version present; leaving SENT/VIEWED/CLIENT_SIGNED for a final state needs it ended (deferrable constraint trigger).
* **m3. A draft can name an older template version and any file key** (`:291`, probe f: template at v2, draft written with `template_version 1` and `template_file_key 'retainer-templates/zzz/v9.docx'`, accepted). BR-1: new drafts use the current, active template. In-place versioning also overwrites v1's `file_sha256` and `placeholders`, so S1's "versions (each downloadable)" relies on the key naming convention alone. *Fix:* at insert (and at the M1 change) require `template_version = t.version AND template_file_key = t.file_key`.
* **m4. Actor columns accept blanks.** `created_by`, `updated_by`, `withdrawn_by`, `offline_by` (`:48-49, 73, 78-79, 98`) have no non-blank check, unlike FO-1b's (`20261114120000…/migration.sql:205`). Withdraw with `withdrawn_by = ''` is accepted, leaving the action with no actor.
* **m5. Draft churn of versions.** Because fee rows are insert-only and versions write-once, every draft save that changes or deletes a fee row (BR-5: the default "Deposit on signing" row "staff may change or delete") needs a new version and a new render. S5's Versions list and "version n+1" then count draft saves. This is workable, but part 2 should decide whether S5 shows only sent versions. No schema change asked.
* **m6. Test gaps.** No pass for CLIENT_SIGNED → WITHDRAWN, VIEWED, EXPIRED → DRAFT or a signer/representative change on a DRAFT; no fail for "WITHDRAWN and SIGNED are final" (only SIGNED_OFFLINE) or for `firm_id` on a version. `check_fo5_retainers.ts:211` accepts `/firm_id never changes|fkey/`, so it still passes with `fo_retainer_firm_fixed` removed (the composite foreign keys refuse instead): drop `|fkey`.

### Notes for the owner (not findings against this PR)
* `platform.prisma:78` says "replace PF-0p's retainers slot line", but main has no such line (PF-0p has not merged). The release holder reconciles this when PF-0p lands. Unlike FO-1b's lines, these do not cite Lead B's OK; Lead B owns both files.
* FO-6: its signature request should key on `(firm_id, version_id)` (`fo_retainer_version_firm_id_id_key` exists, so the schema can carry it) and refuse a signature on an ended version. Without that, a late "signed" on v1 after an edit made v2 would move the retainer to CLIENT_SIGNED.
* Contracts §2.3 lists fee lines with "tax, trust or operating tag"; the row and the concept (Not built: "tax and disbursement lines") leave them out. Lead B should confirm whether FO-7 adds the trust/operating tag (adding it later is additive).
* File keys are firm-relative (`retainers/<id>/v<n>.docx`); the row's "firm-prefixed keys" must then come from `FilesPort` (part 2).

## Journey test (reviewer role)
**Not applicable: no score.** This commit has no screen, no route and no running feature to walk, so the ten criteria (task completed, words, accessibility, speed…) cannot be scored honestly. Instead I walked the data-level journeys of §4 in SQL: draft → send → edit-and-resend → client signed → offline; withdraw → new retainer; declined → edit; wrong-template draft (probe a, fails: M1). Score this in part 2's review (API) and in FO-5s.

## Could not check
The release holder's migration-diff read (P-600 (5)); CI on this head; `migrate reset` with the demo seed beyond the test's demo-data copy; behaviour against PF-0p's `ports/files.ts` (not on main).

## To fix
* Before Approve: **M1** (let a DRAFT change its template, and its subject/company, with a new version; add a pass and a fail pair).
* Recommended in the same pass: m1, m3, m4 (small trigger and check lines), m6 (the test regex and the missing pass/fail pairs).

Verdict: Block
