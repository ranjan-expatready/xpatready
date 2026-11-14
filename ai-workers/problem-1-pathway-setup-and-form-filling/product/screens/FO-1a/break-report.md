# FO-1a break report (schema and seed only)

Commit 5f88dc133, branch claude/tender-hamilton-moa9bq. Scratch database `xr_studio_fo1a_break_19574` (every migration folder applied in name order, now dropped). Firms A, B, C, D (status DELETED) and E, staff in A and B, released combinations in two workspaces. Seed run through `seedFirmFrontOffice` / `onFirmCreated` / `seedCreatedFirms` with a PrismaClient on `@prisma/adapter-pg` (`npx tsx`). The scratch scripts in `studio/var/fo1a-break/` are deleted. Migration = `prisma/migrations/20261114063000_fo1a_front_office_sales/migration.sql`; seed = `api/src/front-office/firm-seed.ts`. No UI, so no UI checks were made.

## Breaks

**B1 Blocker: once a Corporate prospect names a company's primary contact, that contact can never be changed (AG-2-77 rule 6).** Migration 685 allows one live PRIMARY per company. Migration 726-735 refuses ending, re-roling or re-pointing it while a prospect names it, and 703-722 refuses repointing the prospect to anyone who is not already the live PRIMARY. Every order fails:
`insert into fo_company_contact (…, person_id, role) values (…, P2, 'PRIMARY')` → `duplicate key … fo_company_contact_one_primary_key`; `update fo_company_contact set valid_to = now() where id = <P1 link>` → `fo_company_contact_primary_kept`; `update fo_prospect set primary_contact_person_id = P2` → `fo_prospect_rules`; `update … set role = 'OTHER'` → refused; a one-statement CTE doing all three → refused.
This applies to every prospect that ever named the person, Won and Lost ones too, so the contact stays locked for good. Expected: "the primary contact cannot be removed **until another person is made primary**". That needs a path, for example a deferrable check or a trigger that allows the swap inside one transaction.

**B2 Major: two transactions at once can leave a Corporate prospect with no live PRIMARY contact (write skew).** Session 1: `begin; insert into fo_prospect (… type 'CORPORATE', subject_company_id = CO2, primary_contact_person_id = P2 …); select pg_sleep(1.5); commit;`. Session 2, 0.5 s later: `update fo_company_contact set valid_to = now() where id = <CO2/P2 PRIMARY link>`. Both commit. Afterwards P-00002 has a count of 0 live PRIMARY links. The cause: each trigger (703-722 and 726-735) reads the other table without a lock on the row it depends on. Expected: one of the two waits or fails. For example, the prospect trigger could take `SELECT … FOR SHARE` on the contact row, or both could take a lock on the company row.

**B3 Major: the system reason `DUPLICATE_PROSPECT` is seeded as an ordinary reason (seed line 48 has no `isSystem: true`).** `delete from fo_reason where firm_id = C and key = 'DUPLICATE_PROSPECT'` → DELETE 1. Turning it off also works. AG-2-44 rule 3 and its test ("Given the Owner tries to remove or turn it off, then the server refuses") and C3.3 (AG-02 v2.6 line 5244) list it as a system key. Reports leave it out of win rate (rule 9), so it must survive. C3.3's fourth system key, `COMBINED_PROSPECT`, is not seeded at all (Minor, see M10).

**B4 Major: a pipeline can lose every ACTIVE stage.** `delete from fo_stage where firm_id = C and kind = 'ACTIVE'` → DELETE 10, leaving each pipeline with 0 ACTIVE stages. `update fo_stage set active = false where kind = 'ACTIVE'` → UPDATE 10. AG-2-20 rule 5: "Each pipeline also keeps at least one ACTIVE stage." With no ACTIVE stage, Engage has no first stage to put a prospect in. Migration 741-757 guards only WON, LOST and NURTURE.

**B5 Major: an owner can become staff of another firm by a later change to platform_staff.** The guard trusts "staff rows are never deleted" (migration 641), and nothing enforces it:
`begin; delete from platform_staff where id = <A's staff>; insert into platform_staff (id, firm_id, …) values (<same id>, <firm B>, …);` → firm A's L-00001 now has `owner_firm = B`. With only the DELETE, `owner_staff_id` points at no staff row (1 dangling lead). `fo_owner_in_firm` (642-650) runs only on writes to fo_lead and fo_prospect. Expected: a key on (firm_id, owner_staff_id) to platform_staff(firm_id, id), or a no-delete trigger on platform_staff. Moving staff with UPDATE `firm_id` and re-keying `platform_firm.id` are both refused (held).

**B6 Major: one blank combination label anywhere stops every firm's seed.** Seed line 91 copies `combination.label` as it is. combination has no label check, so a released combination labelled `'   '` in any workspace makes `fo_service_label_check` fail. In that state all three parallel `onFirmCreated(A)` calls were rejected and no firm could be seeded. `seedCreatedFirms` (line 112) also has no per-firm catch, so one failing firm stops the firms after it in the same run. Expected: trim the label and skip a blank one (or log it), and handle each firm on its own.

## Minor

- **M1** Counters can be edited by hand, which lets a number repeat or blocks a firm. Rewinding: `update fo_sales_setup set next_lead_no = 2` → the next lead fails with `duplicate key … fo_lead_firm_id_number_key` until the counter is fixed. Reuse: delete L-00004, set `next_lead_no = 4`, insert → a second, different lead gets **L-00004**. Nothing makes the counters only go up (migration 562 checks only `>= 1`). At 2147483647 the next insert fails with `integer out of range`, because the counters are INTEGER (unreachable in practice).
- **M2** `seeded_at` is trusted and can be changed. A setup row inserted with `seeded_at` already set leaves a firm with 0 stages, and the seed never fills it. Clearing `seeded_at` and re-running the seed brought back a service, a reason and the web form the person had deleted (a renamed stage label was kept).
- **M3** Stage moves are add-only but have no link to the prospect. `insert into fo_stage_move (prospect = <INDIVIDUAL P-00001 in ENGAGED>, pipeline 'CORPORATE', from LOST, to RETAINER_SIGNED, cause 'PERSON')` is accepted. The history now claims a Corporate win that never happened, and the row can never be corrected or removed. Nothing ties `to_stage_id` to the prospect's stage, `cause` to the kind of stage (a WON move with cause PERSON is accepted), or limits the `from_stage_id IS NULL` (first) moves to one per prospect.
- **M4** Rows that name a person do not have to agree with each other. A note on lead L-00001 (person P1) can name person P2: the note key (523) leaves out person_id, while the call key (511) includes it. A CREATED receipt with lead L-00001 and person P2 is accepted. An INDIVIDUAL prospect's subject need not be its lead's person.
- **M5** Text checks use `btrim`, which removes only spaces. Accepted: a note `E'\t\n'`, a note `E' ​'` (non-breaking and zero-width space), and lead `source = E'\t'`. Stage, reason, service and company labels have the same gap. No text column has a length limit: a 5,000-character family name and a CJK given name were accepted (fine as data).
- **M6** Intake keys are not normalised: `booking:42`, `booking:42 ` and `booking: 42` are three receipts, and so are `form:<id>:s1` and `form:<id>:s1 `. The submission part's case is kept (`s1` and `S1` are two keys, probably correct). Normalising should happen in the code; the database only compares bytes.
- **M7** Lead state is checked but its who-fields are not. CLOSED with `closed_by` NULL and ENGAGED with `engaged_by` NULL are accepted (AG-2-80 data names closedByUserId and engagedByUserId). A lead that has 2 prospects can be set to CLOSED "Not interested" or back to OPEN ("Engaged stays engaged", AG-2-80 rule 5). Inactive reasons can be used to close a lead or lose a prospect.
- **M8** Reason and stage lists can be emptied or confused. Deleting all 7 PROSPECT_LOST reasons of a firm leaves 0, so "lost needs a reason" can never be met (with B3 fixed, only DUPLICATE_PROSPECT would remain). A firm can insert its own reason with `is_system = true`, which then can never be removed. Keys `price`, `Price` and `PRICE`, and stage keys `engaged` and `RETAINER_SIGNED ` (trailing space, kind ACTIVE), sit beside the seeded keys.
- **M9** Seed scope:
  - "Interested in" takes released combinations from **every workspace**, with no firm-to-workspace mapping. Two workspaces' "Sample: Work permit" gave every firm two services with the same label.
  - A firm seeded before any release (firm C) keeps an empty list for good.
  - A firm with status DELETED (firm D) was seeded from its `firm.created` event.
  - Demo reset deletes the combinations, which leaves `fo_service.combination_id` pointing at nothing (3 such rows after deleting one workspace's combinations). There is no foreign key, so the reset itself is not blocked.
- **M10** Seed labels and keys: "Retainer sent" against AG-2-52's "Retainer Sent" (seed line 27). `COMBINED_PROSPECT` (system, C3.3) is not seeded.
- **M11** TRUNCATE gets past row rules on tables that nothing points at. `truncate fo_company_contact` succeeds while 2 Corporate prospects need their PRIMARY links, and `truncate fo_arrival_receipt` deletes the receipts that stop duplicate arrivals. The app role xr_studio is a superuser, so `set local session_replication_role = replica` turns off every trigger. Under it, `update fo_lead_attribution` and `delete from fo_note` succeeded (environment, not this row's code).
- **M12** A web form can be turned on with any random uuid as its consent wording, because there is no key: `enabled = true, consent_wording_version_id = gen_random_uuid()` is accepted (msg_consent_wording is PF-19a's, not built yet). A public token of 22 copies of one letter passes, because the check tests only length. A person with no name, email or phone is accepted.
- **M13** Platform firms can be deleted or re-keyed, which leaves front-office rows with no firm. Firm C has no staff or events: `delete from platform_firm where id = C` → 16 fo_stage rows for a firm that does not exist; `update platform_firm set id = …` behaves the same. Expected while there is no key: a trigger on platform_firm, or the planned back-relation line.

## What held
- **Rows across firms:** a person, service, reason, stage, web form, lead, prospect or company of firm B, used in a firm A row, was refused by the composite keys every time. An owner from firm B was refused on insert and on update, for leads and prospects. `platform_staff.firm_id` cannot be changed, and `platform_firm.id` cannot be changed while the firm has staff.
- **Numbers:** a given `L-99999` was replaced by L-00001; a multi-row insert and COPY both got numbers; a rollback gave its number back. 20 parallel two-firm transactions with every fourth rolled back gave A L-00001..L-00019 and B L-00001..L-00015, no gaps and no repeats. Past 99999 the number grows to `L-100000`. `update … set number` is refused.
- **Write-once rows:** attribution, notes and stage moves refuse UPDATE, DELETE, `ON CONFLICT DO UPDATE`, TRUNCATE, and TRUNCATE CASCADE from fo_lead, fo_person, fo_sales_setup, fo_stage, fo_reason and fo_service/fo_web_form. Deleting or re-keying their parents is RESTRICTed.
- **Prospect rules:** a stage from the wrong pipeline or firm is refused; changing the type alone is refused, and changing type, stage and subject together works. Lost without a reason, a lead reason on a prospect, firm B's reason, WON without `won_via`/`won_at`, `won_via` outside WON, a negative value and a lower-case currency are all refused.
- **Lead rules:** CLOSED without a reason, OPEN with a reason, a prospect reason on a lead, ENGAGED without `engaged_at`, and a possible match that is the lead's own person are all refused.
- **Stages and reasons:** the WON, LOST and NURTURE stages refuse delete, turn-off and kind change. System reasons refuse delete, turn-off and re-key. Firm B's company cannot be used in a firm A contact.
- **Receipts:** the same key twice gives one receipt. An upper-case form id, another firm's form, a key that names another form, `Booking:` and a `booking:` key on the MANUAL door are all refused.
- **Seed:** three parallel seeds of A gave one seed and two "seeded: false" with no change. A missing firm and a non-uuid are refused in words, and an upper-case id is lowered. A re-run kept a renamed stage. `firm.created` for a firm already seeded does nothing. With no released combinations a firm gets 0 services and is still seeded. A front-office row of a firm with no fo_sales_setup is refused, and so is a setup row for a firm that does not exist.
- **Rest of the schema:** every fo_ table has `firm_id` first in an index. `prisma migrate diff` from the migrated database to `prisma/schema` names no fo_ line. No fo_ table has `workspace_id`, so the demo reset's workspace delete and orphan sweep leave front-office rows alone.

## Round 2 (121476e43, diff from 5f88dc133 only)

Fresh scratch database `xr_studio_fo1a_break2_8323` (every migration in name order; now dropped). Firms A and B are ACTIVE and C is ABANDONED, each with a `firm.created` event. Seed scripts were under `studio/var/fo1a-break2/` and are deleted. Not retried, because the PR records them as not fixed: B5, M13, the random consent-wording uuid, the workspace scope of services, the superuser replica switch, and a firm adding its own system reason.

**R2-1 Major: the new word check refuses every name that has no ASCII letter or digit.** `fo_has_word` is `t ~ '[[:alnum:]]'`, and every database on this server, `xr_studio_demo` included, uses the libc `C` locale. There, `[[:alnum:]]` matches only ASCII: `select '会議' ~ '[[:alnum:]]'` gives f, and `'é'` alone gives f. Refused:
- the company `株式会社さくら`;
- the stage label `会議`;
- the reason label `السعر`;
- the service `Виза`;
- the lead source `微信`.

`Réunion` passes only because of its ASCII letters. The seed's own filter (`c.label ~ '[[:alnum:]]'`) silently drops a released combination named `就労ビザ`, so it never reaches any firm's list. Expected: a test that understands Unicode letters. For example, take the note check's approach (any character that is not space, control or invisible), or use a Unicode-aware collation on the match.

**R2-2 Major: "a lead with a prospect stays ENGAGED" is checked only when the lead's state is updated.**
- Inserting a prospect on a CLOSED lead is accepted (P-00005 on CLOSED L-00004), and so is inserting one on an OPEN lead (P-00006).
- At the same time: session 1 inserts a prospect on ENGAGED L-00006 and sleeps, while session 2 sets L-00006 to CLOSED. Both commit, and L-00006 is CLOSED with 1 prospect. The prospect's foreign key takes only FOR KEY SHARE on the lead row, which an update of `state` does not wait for.

Expected: a deferred check on fo_prospect insert (Engage writes the prospect and the lead in one transaction), with a lock on the lead row.

**R2-3 Minor: the new concurrency guards hold under READ COMMITTED but not under REPEATABLE READ or SERIALIZABLE.** Prisma's `$transaction` can choose these levels.
- Contact check: the session that ends the link starts `begin isolation level repeatable read; select 1;`. A READ COMMITTED session then inserts and commits a Corporate prospect, and after that the first session ends the link and commits. Result: P-00002 and P-00003 each have 0 live links. `fo_company_contact_still_linked` reads with the old snapshot. SERIALIZABLE on the ending session gives the same result.
- ACTIVE stages: a REPEATABLE READ delete of ENGAGED and a READ COMMITTED delete of RETAINER_SENT, the last two live ACTIVE stages, both commit. The CORPORATE pipeline is left with 0 live ACTIVE stages: the advisory lock waits, then the check reads the stale snapshot.

Expected: take a row lock on what is read (`FOR UPDATE` raises a serialization error under REPEATABLE READ), or refuse levels above READ COMMITTED in the trigger.

**R2-4 Minor: stage-move history can still be invented** (moves are permanent, so a wrong row stays). The new trigger checks only that `to_stage_id` is the current stage. All of these were accepted on one INDIVIDUAL prospect sitting in ENGAGED:
- a second first move (`from_stage_id` null, cause BOOKING);
- a move from RETAINER_SIGNED (WON) to ENGAGED, though it was never won;
- a CHANGE_TYPE move from CORPORATE QUALIFIED, though its type never changed;
- RETAINER_EXECUTED into an ACTIVE stage.

`update fo_prospect set stage_id = <CONSULT>` with no move row is also accepted.

**R2-5 Minor: the primary-contact swap works in only one order.** The comment says "add the new PRIMARY, end the old link, repoint the prospect, in any order". Adding the new PRIMARY first fails at once with `fo_company_contact_one_primary_key`, because that index is not deferrable. End, add, repoint commits.

**R2-6 Minor: whitespace and control checks are ASCII-only (C locale).**
- Intake key `booking:42` followed by U+00A0 (no-break space) or U+200B (zero-width space): both accepted. A trailing ASCII space is refused.
- Notes made only of U+200D U+2060 (joiners) or only of U+3164 (Hangul filler): both accepted.

**R2-7 Minor: the seed mark is guarded only on UPDATE.** `insert into fo_sales_setup (firm_id, seeded_at, seeded_by) values (<firm E>, now(), 'nobody')` is accepted. Firm E has 0 stages, and the seed skips it for good.

**R2-8 Minor: a program chain that loops gives every firm a looping name.** Two program_def rows that are each other's parent produce the service label "Loop › Loop › Loop › Loop › Loop › Loop › Loop › Loop combo". The recursive query stops at depth 12 but does not detect cycles. Also: a note or call on a prospect can name any person of the firm (the lead side is now tied, the prospect side is not; acceptable for Corporate contacts). Left over from M8: deleting every non-system lost reason leaves only DUPLICATE_PROSPECT and COMBINED_PROSPECT, and Combined is never offered. The Lost dialog would then offer only "Duplicate".

### Held in round 2
- **B1 and Change type:** ending the old link, adding the new PRIMARY and repointing in one transaction commits. Refused at commit or at once: ending the link alone, `set constraints all immediate`, the end inside a released savepoint or after a rolled-back one, DELETE of the link, repointing the link row to another person, and WON then end link then back to ENGAGED. Change type INDIVIDUAL to CORPORATE (new company and link, CHANGE_TYPE move) commits, and so does changing back.
- **B2 to B6:** under READ COMMITTED both orders of B2 are refused. DUPLICATE_PROSPECT and COMBINED_PROSPECT refuse removal and turn-off. One statement deleting every ACTIVE stage is refused, and two parallel READ COMMITTED turn-offs keep 1 live ACTIVE stage. Blank and cyclic combinations do not stop the seed, and ABANDONED firm C gets `seeded: false`, directly and from `seedCreatedFirms`.
- **Other rules:** counters cannot be wound back, and the seed mark cannot be cleared or changed. Refused: TRUNCATE of fo_company_contact, a trailing-space intake key, a note or receipt whose person is not the lead's person, a move to a stage that is not current or written before the prospect, a first move with CHANGE_TYPE, and a lower-case reason key. A booking ON_OPEN_PROSPECT receipt with no lead is accepted, as designed. `prisma migrate diff` names no fo_ line.

## Round 3 (0405443ea, diff from 121476e43 only, READ COMMITTED)

Fresh scratch database `xr_studio_fo1a_break3_21485`, built from the 0405443ea migration and now dropped. Scripts were under `studio/var/fo1a-break3/` and are deleted. During the run, an uncommitted edit (review R3-M1: a `seq` column on fo_stage_move) appeared in the shared working tree. It was not tested here, and because of it `migrate diff` was not judged this round.

**R3-1 Major (new; R2-4's chain fix): the stage-move chain uses the wrong order, so valid moves are refused and false ones accepted.** The trigger takes "the last move" by `ORDER BY at DESC, id DESC`. But `at` defaults to the transaction's start time, and `id` is random.
- *Three moves in one transaction* (ENGAGED to QUALIFIED to CONSULT to PROPOSAL): the third move was refused in 4 of 6 runs, depending on which of the two equal-`at` rows has the larger id. When the ids fall the other way, a move from the wrong stage is accepted.
- *Two staff moving one prospect:* a transaction that began first (sleep, then CONSULT, "from QUALIFIED") commits after a quicker one (ENGAGED to QUALIFIED). Both commit, and the slower move sorts first. The next honest move, "from CONSULT to PROPOSAL", is refused, while a false "from QUALIFIED to PROPOSAL" is accepted. The prospect is stuck for good, because moves are add-only.
- *A writer-given `at`:* `at = '2000-01-01'` is accepted. It puts ENGAGED to QUALIFIED in the year 2000, before the first move, and the chain then forks (ENGAGED to CONSULT).

The uncommitted `seq` under the prospect's lock looks aimed at the first two; it was not tested. The given `at` would remain.

**R3-2 Minor: invisible characters still pass the word and intake-key checks.** The lists name specific characters, so others get through.
- `fo_has_word` is true for a label made only of: a soft hyphen (U+00AD), the Braille blank (U+2800), U+180E, the combining grapheme joiner (U+034F), a variation selector (U+FE0F), or a lone combining accent. It is also true for "—", "…" and "。" (punctuation outside ASCII). A released combination named U+2800 became the service "就労ビザ › x › " with an invisible last part.
- Intake keys ending in U+00AD, U+2800, U+180E, U+034F, U+FE0F or the tag space U+E0020 are accepted.

**R3-3 Minor (R2-7 by two statements):** `insert into fo_sales_setup (firm_id) values (<firm E>)` followed by `update … set seeded_at = now(), seeded_by = 'nobody'` is accepted. Firm E has 0 stages and the seed says `seeded: false` from then on. The insert rule holds, but the first setting of the mark is not tied to the seed.

**R3-4 Minor:** a PERSON move into the WON stage (with `won_via`) is accepted. AG-2-28a: WON is set only by a signature, Signed offline or Convert.

**Held in round 3**
- **R2-1:** `株式会社さくら`, `Виза` and `السعر` pass the word check, and the seed keeps `就労ビザ`. U+00A0, U+200B, U+2060, U+3164, U+FEFF and U+115F are refused.
- **R2-2:** these are refused at commit or at once:
  - a prospect on a CLOSED lead;
  - moving an ENGAGED lead with a prospect back to OPEN;
  - repointing a prospect to an OPEN lead;
  - Engage undone inside a rolled-back savepoint.
  
  Engage (prospect first, then the lead) commits. Deleting the prospect, then closing the lead, commits. Close against prospect insert gives one consistent outcome in all three timings (prospect waiting, close waiting, prospect committed first). No lead that is not ENGAGED has a prospect.
- **R2-4, other parts:** a second first move, a move to a stage that is not current, and CONVERT into an ACTIVE stage are refused.
- **R2-7:** an insert already marked seeded, or not starting at number 1, is refused.
- **R2-8:** two programs that are each other's parent give "Loop B › Loop A › Loop combo", and a self-parent gives "Self › Self combo".
- **R2-M1:** receipts that name another firm's lead with no person, another firm's lead and person, the lead with another person, or another firm's person are refused. The right lead and person are accepted.

**No new Blocker. One new Major: R3-1.**
