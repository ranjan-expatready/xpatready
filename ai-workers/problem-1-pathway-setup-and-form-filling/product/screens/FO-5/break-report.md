# FO-5 part 1 (retainer schema) — break report

Commit `62a981d53` (branch `claude/funny-franklin-ckwwev`, PR #1761). Target: `prisma/migrations/20261114210000_fo5_retainer_tables/migration.sql` (cited as `mig:<line>`). Scratch database `xr_fo5_break_12881` on 127.0.0.1:54329 (every migration folder applied in sorted order; two firms A and B, staff a1, a2, b1, one template per firm, seeded by SQL), plus three throw-away databases for the rollback check; all dropped afterwards. Rules: BACKLOG row FO-5 (`origin/lead/2026-11-07-lead31`), concept fo-5s r2 §3 BR-1..BR-11, BR-16. No API exists yet, so every attack goes straight at the database. Shorthand below: `R` = a retainer id, `V1`/`V2` = its versions, `A`/`B` = firm ids, `TA`/`TB` = each firm's template.

**Result: 0 Blocker, 4 Major, 9 Minor; 11 held.**

## Major

**B-6 Major — a fee row lands on a version after it was sent (two connections).** `mig:394-411`: the fee-row trigger reads the version and the retainer without a lock. The foreign key's FOR KEY SHARE does not conflict with the send's non-key UPDATE.
S1: `begin; insert into fo_retainer_fee_row (…, version_id, position, label, amount_minor, "when") values (…, V1, 2, 'Extra fee', 9999999, 'ON_SIGNING'); select pg_sleep(3); commit;`
S2 (1 s later): `begin; update fo_retainer_version set sent_at=now() where id=V1; update fo_retainer set status='SENT' where id=R; commit;`
Actual: S2 commits without waiting, then S1 commits. The SENT version now holds the CAD 99,999.99 row with the same `sent_at`. Expected: one of the two waits or is refused. Fee rows on a sent version never change (BR-7, AG-5-64). Fix: in the fee-row trigger, `SELECT … FROM fo_retainer … FOR UPDATE` (send already updates that row, so the two serialise), or `FOR SHARE` on the version.

**B-7 Major — a superseded, never-sent version can be sent later, so one retainer has two open requests with different fees.** `mig:374-390`: the version UPDATE branch never checks that the row is the retainer's current version, or that the retainer is moving to SENT.
`select brk_ver(V1,R,1); fee 100000 on V1; update fo_retainer set current_version=2 where id=R; select brk_ver(V2,R,2); fee 500000 on V2; begin; update fo_retainer_version set sent_at=now() where retainer_id=R; update fo_retainer set status='SENT' where id=R; commit;`
Actual: `UPDATE 2`. V1 (CAD 1,000) and V2 (CAD 5,000) are both sent and neither is ended. The same state can be reached by racing a draft edit (v n+1) against a send. Expected: only the current version (`n = fo_retainer.current_version`) gets `sent_at`; a superseded version cannot be sent (BR-9; the header's "superseded version's request ended first", `mig:9`). Note that each draft edit already writes a new version, because fee rows are insert-only (BR-5 "change or delete" on a draft). So the API also has to end every unsent superseded draft version, or this state stays one step away.

**B-8 Major — the retainer's status and `current_version` are not tied to any version row.** `mig:325-337`.
(a) `select brk_ret(R4,P4); update fo_retainer set status='SENT' where id=R4;` → SENT with 0 versions.
(b) `select brk_ret(R5,P5); update fo_retainer set current_version=2 where id=R5;` → OK. After that, `brk_ver(…,R5,2)` → "version 2 needs version 1" and `brk_ver(…,R5,1)` → "written only as the current version (2)". R5 can never get a version. It cannot be withdrawn or deleted from DRAFT, and it holds the prospect's one live slot for good.
(c) A SENT retainer at v1 → `update … set status='DRAFT', current_version=2` → `update … set status='SENT'` gives SENT at current_version 2, with no v2 row and v1's request still open.
Expected: SENT/VIEWED/CLIENT_SIGNED only while version `current_version` exists and is sent and not ended; `current_version` moves only together with its version row. Fix: a DEFERRABLE INITIALLY DEFERRED constraint trigger on `fo_retainer`, or bump `current_version` from the version-insert trigger.

**B-12 Major — a draft with the wrong template is a dead end (blocks a legitimate flow).** `mig:303-308` freezes `template_id`/`template_version` on DRAFT too. `mig:311-313` gives DRAFT no exit except SENT or SIGNED_OFFLINE. Delete a draft is Not built.
`update fo_retainer set template_id=<other active firm-A template>, template_version=1, template_file_key='firm-a/t/x.docx' where id=<DRAFT>` → "template … never change". `update … set status='WITHDRAWN', withdrawn_reason='wrong template', …` → "cannot move from DRAFT to WITHDRAWN". A new `brk_ret(…, same prospect, other template)` → `fo_retainer_one_live_per_prospect`.
Expected: S3 shows Template as a field of the draft and BR-6 lists it among the choices made before Send. Staff must be able to change it while DRAFT (or edit the draft into a new version on another template) without sending the wrong agreement to the client or marking it signed on paper.

## Minor

**B-2 Minor — file keys are not tied to their firm.** `mig:172-174`: `fo_retainer_key_ok` checks only the shape. Each of these was accepted on firm A rows: a template with `file_key='firm-b/retainer-templates/t1/v1.docx'`; a retainer with `template_file_key='firm-b/…'`; `offline_file_key='firm-b/retainers/x/signed.pdf'`. Expected: keys under the row's firm prefix (row: "firm-prefixed keys"), e.g. `CHECK (file_key LIKE firm_id::text || '/%')`. This becomes Major if part 2's `FilesPort` does not refuse a key outside the caller's firm.

**B-9 Minor — a request's end is not tied to the retainer's state.** After R reached SIGNED: `update fo_retainer_version set ended_at=now(), end_reason='DECLINED' where id=V1` → OK, so a signed agreement now shows "declined". WITHDRAWN and EXPIRED leave the version's request open (sent, not ended). Expected: `end_reason` matches the move (BR-10, BR-11, BR-16), and a SIGNED retainer's versions are frozen.

**B-13 Minor — fee dates.** `due_on='infinity'` and `'0001-01-01 BC'` are accepted (`mig:223`). `amount_minor=12.345` (SQL numeric) is stored as 12: SQL rounding only, and Prisma sends BigInt.

**B-14 Minor — text shapes.** `btrim` trims only spaces (`mig:182-218`). Accepted: `withdrawn_reason=E'\n\t'`, `offline_reason=E'\t'`, `withdrawn_by=''`/`offline_by=''`/`created_by=''`, label `E'​'`, label `E'\n'`, label of 120 'x' plus 5,000 spaces (5,120 characters), template name `E'​'`, and `merge_values` with a 20-million-character name (40 MB, no size limit). Expected: reasons and labels of 1-200/1-120 visible characters, a non-empty actor, a cap on `merge_values`.

**B-15 Minor — duplicate template names.** `Std A`, `std a`, `STD A`, `Std  A` and `Std A` all coexist in firm A (`fo_retainer_template_firm_id_name_key` is case- and space-sensitive). Expected: one name per firm whatever the case and spacing (unique on `lower(regexp_replace(name,'\s+',' ','g'))`).

**B-16 Minor — a template version can reuse an older version's file key.** `update … set version=2, file_key='…/v2.docx', file_sha256=…` then `update … set version=3, file_key='firm-a/retainer-templates/t1/v1.docx'` → OK (`mig:270` compares only with the previous key). The key of v1, which retainers keep as `template_file_key`, now also names v3. Expected: a new, unused key per version (BR-1, AG-5-7).

**B-17 Minor — a retainer's template copy is not checked.** At insert, `template_version` may be any value up to the current one (a draft made at v1 while the template is at v3), and `template_file_key` may be any key, including firm B's (`mig:282-297`). Race: S1 `begin; update fo_retainer_template set active=false, version=4, …; sleep 2; commit` while S2 inserts a draft from the same template. S2 succeeds without waiting, and the draft comes from a template that is now inactive. Expected: the draft copies the template's current version and key, and a `FOR SHARE` read of the template.

**B-18 Minor — a retainer's id can be rewritten.** `update fo_retainer set id=<new> where id=<DRAFT with no versions>` → UPDATE 1 (`mig:303-306` do not list `id`). Audit lines that name the old id lose their row.

**B-23 Minor — every draft edit uses up a version number.** Fee rows and versions are write-once, so changing or deleting the default fee row (BR-5) or re-reading a fixed client name (BR-6) needs version n+1 before the first send. The client's first email can say "version 4". Part 2 must decide how S4/S5 show this. It also feeds B-7.

## Held

**B-1 held — cross-firm references.** A firm-A retainer with TB, with staff b1, or with firm B: refused (`…template_id_fkey`, `…representative_staff_id_fkey`). A version or fee row under the other firm: refused (composite keys). Later UPDATEs to `representative_staff_id`, `template_id`, `firm_id` (retainer, template, version), `version_id` (fee row), or moving a staff member or a firm id: all refused. `prospect_id`/`signer_person_id`/`company_id` have no key yet; this is declared, and FO-1k adds the keys.

**B-3 held — status skips and reversals.** DRAFT→CLIENT_SIGNED/SIGNED/EXPIRED/WITHDRAWN/DECLINED; SENT→DRAFT without a new version; CLIENT_SIGNED→EXPIRED/DRAFT/DECLINED/SENT; a new version or a signer change on CLIENT_SIGNED: all refused.

**B-4 held — final states.** SIGNED→WITHDRAWN, and any UPDATE on SIGNED/WITHDRAWN (even `updated_at`): refused. A WITHDRAWN retainer back to SENT, or its reason changed: refused. Withdraw with no reason or with `'   '`: refused.

**B-5 held — a sent version is write-once.** `merge_values`, `file_key` and `original_sha256` changes, a second `sent_at`, a fee `amount_minor` UPDATE, a fee INSERT after the send (single session), and fee DELETE/TRUNCATE: all refused.

**B-10 held — one live retainer per prospect.** Two connections drafting for the same prospect: the second gets `fo_retainer_one_live_per_prospect`. EXPIRED→DRAFT while a newer retainer is live: refused by the same index.

**B-11 held — version numbering under concurrency.** Two sessions each running `current_version+1` and inserting v2: the second blocks, sees 3, and v2 is refused. The versions stay 1 and 2.

**B-19 held — key and hash shapes.** Refused: `../etc/passwd`, `firm-a/../firm-b/x`, `/abs`, `a//x`, `a/./x`, trailing `/`, `.hidden`, upper case, an embedded newline, `ſ`, `ａ`, `é`, `∕`, a backslash, `%2e`, 301 characters. A sha256 with a trailing newline, a full-width digit or upper case: refused.

**B-20 held — deletion and truncation.** DELETE/TRUNCATE on retainer, version and fee row: refused. `truncate fo_retainer_template cascade` and `truncate platform_firm cascade`: refused. Deleting a staff member or a firm still in use: RESTRICT. An unused template can still be deleted, which is fine.

**B-21 held — an edit racing the client's signature.** The row lock serialises them, and the one that loses is refused ("DRAFT to CLIENT_SIGNED").

**B-22 held — the legitimate flows work.** Draft→send. VIEWED → Edit and resend in one transaction (end v1 UPDATED, DRAFT v2 with a new signer, v2 and its fees, send). CLIENT_SIGNED→SIGNED_OFFLINE with the request ended. A new retainer after EXPIRED. Money: −1, 10,000,000,001, 2^63, USD, `cad`, NULL currency, position 0/51/duplicate and `due_on` without ON_DATE are all refused; NULL amount (draft "missing"), 0 and French/Chinese labels are accepted.

**B-24 held — additive migration and rollback.** A catalog diff before and after the migration (columns, defaults, constraints, indexes, triggers, functions, enums) shows nothing removed or changed and 174 additions. The rollback note's DROPs, run in order, restore the catalog exactly. The note does not mention reverting `platform.prisma`'s three back-relation lines: that is a git revert, not SQL.

## Round 2 — head `e4a001e70` (`git diff 62a981d53..e4a001e70`)

Scratch database `xr_fo5_break_r2_29194` (every migration applied in sorted order; firms A and B; new key and actor shapes), plus one throw-away database for the rollback check. Both are dropped. Lines are `mig:` at e4a001e70.

**Result: the 4 Majors are fixed. B-2, B-9, B-13, B-16, B-17 and B-18 are fixed. B-14 and B-15 are partly fixed and still open (Minor). One new Minor (B-25). B-23 is unchanged by design.**

- **B-6 fixed.** The round-1 race again (S1: fee row into v1 in its own transaction, then sleep; S2: send). S2 commits; S1 gets "fee rows are written in the transaction that wrote their version" (`mig:457`). Variant: S1 bumps to v2, writes v2 and its fees, sleeps, then adds one more fee, while S2 sends v1. S2 is refused ("only the current version (2) is sent"), and S1's late fee commits on the unsent v2. Correct. A fee row in a later transaction, or behind a savepoint after the version's transaction, is refused.
- **B-7 fixed.** `update fo_retainer_version set sent_at=now() where retainer_id=R2` (v1 superseded and unsent, v2 current) → "only the current version (2) is sent or ended, not version 1" (`mig:421-424`). Ending the superseded v1 later is refused the same way.
- **B-8 fixed.** All refused at commit by `fo_retainer_state_check` (`mig:464-487`): a retainer with no version; DRAFT→SENT with no version; `current_version=2` without v2; SENT→DRAFT v2→SENT without v2.
  Bypass attempts, all held:
  - `SET CONSTRAINTS ALL DEFERRED` still checks at commit. `SET CONSTRAINTS fo_retainer_state_check IMMEDIATE` only covers the retainer-side trigger; the version-side `fo_retainer_version_state_check` still fires at commit.
  - One UPDATE ending two retainers' requests while only one retainer moves: refused at commit.
  - A version row whose key names another retainer: refused (`fo_retainer_version_file_key_check`). The lookup is by its own `retainer_id`, so another retainer's row is never "current".
  - A retainer inserted, its version rolled back to a savepoint, then commit: refused. A status change inside a rolled-back savepoint followed by a real request end: refused.
- **B-9 fixed.** Ending a SENT retainer's request as DECLINED while it stays SENT: refused at commit. Withdrawing with the request open, or ended as EXPIRED: refused. A SIGNED retainer's version: "a request ends once", or "the request of a … retainer does not change" (`mig:425`).
- **B-12 fixed.** A DRAFT moves to another active firm-A template by `current_version=2` plus a new v2 with fees in one transaction: COMMIT. The same change without a bump: refused. An edit to firm B's template: refused by the foreign key.
  Races, all held. The template is read `FOR SHARE` (`mig:360`):
  - An edit to the template's v2 while a bump to v3 is uncommitted waits, then is refused ("takes the template's current version (3)").
  - A deactivation waits for an edit that holds the share lock.
  - A new draft racing a deactivation waits, then is refused ("inactive template").
- **B-2 fixed.** Keys are named by their own row (`mig:203, 216, 231, 238`). A firm-A template whose key names firm B's template id: refused. Part 2's `FilesPort` still owns the firm prefix.
- **B-13 fixed.** `due_on='infinity'` → refused (`mig:250`, 2000-01-01..2200-12-31).
- **B-14 partly fixed, still open, Minor.** Now refused: reasons of `E'\n\t'`, a zero-width space alone, NBSP, word joiner, newlines in labels, labels over 120, empty or free-text actors, `merge_values` over 64 KB.
  `fo_retainer_text_ok` (`mig:191-194`) still accepts text that is invisible or reorders text: soft hyphen U+00AD, Hangul filler U+3164, braille blank U+2800, U+180E, a lone combining mark U+0301, variation selector U+FE0F, tag U+E0041, and the bidi controls U+202A..U+202E. These pass alone (a label of only U+202E) and inside one-line labels and names (`'Fee ‮dlrow'` displays reversed).
  Expected: also count `\p{Cf}`/`\p{Mn}`-only text and U+3164/U+2800 as empty, and refuse U+202A-U+202E and U+2066-U+2069 in one-line text.
- **B-15 partly fixed, still open, Minor.** Now refused as duplicates: `std a` and `STD  A` next to `Std A`.
  Still accepted next to `Std A` in the same firm: `Std A` (em space is not `[[:space:]]` here), `Std​A`, `Std A​`, `​Std A` (the trim covers only space and NBSP, `mig:200`), `Std­A`, the full-width `Ｓｔｄ Ａ`, `Std A‮`, and a name of only U+3164.
  Expected: normalise before the unique index on `mig:208` (strip Cf characters, map Zs to a space, NFKC through `normalize(name, NFKC)`).
- **B-16 fixed.** v3 reusing v1's key → `fo_retainer_template_file_key_check`.
- **B-17 fixed.** A draft at an older template version → "takes the template's current version (2)". The deactivation race: see B-12.
- **B-18 fixed.** Retainer and template `id` UPDATEs → "firm_id and id never change" (`mig:257-265`).
- **B-23 unchanged (by design).** An edit is still a new version, and the fee-row rule now makes that explicit.
- **B-25 new, Minor — the order of writes matters, despite the header's "whatever order".** `begin; update fo_retainer set status='WITHDRAWN', withdrawn_reason='Client changed mind', withdrawn_at=now(), withdrawn_by='staff:a1' where id=R; update fo_retainer_version set ended_at=now(), end_reason='WITHDRAWN' where retainer_id=R and n=1;` → "the request of a WITHDRAWN retainer does not change" (`mig:425`). The same two writes with the version first: COMMIT. SIGNED_OFFLINE and SIGNED behave the same. Only the deferred check is order-free; the immediate version trigger is not. Expected: part 2 and FO-6 always end the request first, and the header (`mig:13`, `mig:464-466`) says so. Or allow the end in the same transaction.
- **Held again.** The legitimate flows:
  - draft and send; VIEWED; Declined and Edit and resend, with a new signer, while the template is now inactive (template kept, which matches BR-1);
  - Expired, with CLIENT_SIGNED→EXPIRED still refused; CLIENT_SIGNED→SIGNED; Signed offline straight from DRAFT with `retainers/<id>/signed-offline.pdf`.
  The migration is still purely additive (catalog diff: nothing removed or changed, 186 additions). The new rollback note restores the catalog exactly and now names the `platform.prisma` lines.
  Out of scope: `xr_studio` is a superuser here, so `session_replication_role=replica` or `ALTER TABLE … DISABLE TRIGGER` would switch every trigger off. That is the environment, not this migration.
