# A24-1 review (schema + API; case number, optional reference, one principal per case)

**Reviewed:** PR #1633, branch `claude/magical-euler-5y7ruz`, commit **`a02fcfaf4d5627a8259400f2a5e5fbb484353dcd`** against `origin/main`. This is a code and data review: the row has no screen, so there is no screen walk, no BIC scorecard and **no journey score (no screen to journey; journey-test does not apply to this row)**.
**Read:** `screens/A24-1/build-notes.md`; design `case-structure-a24-2026-11-12.md` §5.2, §5.3, §7 (A24-1), §8 (branch `lead/2026-11-07-lead31`); P-492 (and P-493's wording correction) in that branch's `DECISIONS.md`; `STANDARDS.md`; `git diff origin/main...a02fcfaf4`.
**Copy:** `isolated.sh rev_a24 4493` (fresh database per run, stopped and dropped at the end). US$0: no model call, no priced button.
Paths: `studio/` = `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/`.

**Note on the tree.** While this review ran, the builder committed again in the same checkout (`ed25feefa` screenshots only, then `77dc16d12` "A24-1 breaker fixes") and left uncommitted edits. This verdict is for `a02fcfaf4` only. Every check below ran on `a02fcfaf4` code, except the two suites marked (†). Those two ran on a copy that started at 08:01:33. By then the builder had uncommitted edits in `runtime.ts`, `filing-record.ts` and `contracts/runtime.ts` (error words, a type, `our_reference`). Neither suite opens a case without a reference, so the result is very likely the same at `a02fcfaf4`.

## Checks run

| Check | Result |
|---|---|
| `tests/check_a24_case_number_migration.ts` (scratch database, every migration, legacy cases written out of order across a Toronto New Year) | 25/25 |
| `tests/check_a24_case_number_api.ts 4493 xr_studio_rev_a24` (20 openings at once, refusal, replay, two firms, list fields, Make principal, raw refusals) | 19/19 |
| `tests/check_c617_stages_migration.ts`, `tests/check_forms_channels_migration.ts` (both edited by the PR) | 23/23, 18/18 |
| `tests/runtime/setup_visitor_visa.ts` + `check_runtime_r1a.ts` (writes `case_participant` roles; role check) | 15/15, 98/98 |
| `tests/runtime/check_filing_changes.ts` (Make principal / remove, pure) | 26/26 |
| `tests/check_bk9_shared_filing_api.ts`, `acceptance/C6.13.test.ts` (Make principal through the API under the deferred constraint) | 16/16, 32/32 |
| (†) `tests/check_c82_filing_record_api.ts` ("Already on case …" words), `acceptance/C6.19.test.ts` (earlier facts) | 24/24, 86/86 |
| `tests/check_b164_no_engine_keys.ts` (B164 guard) | 52/52, clean |
| `product/tools/typecheck.mjs` (api + web) | no new type errors (15 known) |
| `prisma migrate diff` (migrated database vs `schema.prisma`) | nothing on `runtime_case`, `firm_case_counter` or `case_participant`. The drift it does show was already there (`fact_source`, `person_role`, … defaults; `canonical_field_name`) |
| Live: `POST /api/runtime/cases` with no reference, then `GET …/prepare` | `"reference": null`, and no `case_number` in that payload (Major 2) |

PR CI on `a02fcfaf4`: jobs `ci`, `packs`, `types` and `regression` show **skipped**. So "every existing pack green" has no CI evidence yet; the suites above are the ones most exposed to this change. The merge still needs green CI.

## Blocker

None.

## Major

**M1. A firm's reference can be spelled like another case's number, so `caseName()` can give two cases the same name.**
* `studio/contracts/runtime.ts:41` accepts any 3-80 character reference. The `(workspace, firm, reference)` and `(workspace, firm, case_number)` uniques are separate. `caseName()` (`contracts/runtime.ts:32`) returns the reference first.
* Scenario: case X opens with no reference and gets `C-2026-00002`. Case Y in the same firm opens with `reference: "C-2026-00002"` (201, it gets `C-2026-00004`). Every place that now names a case through `caseName()` names both cases "C-2026-00002":
  * the earlier-facts offer (`api/src/earlier-facts.ts:82,86`), which shows two choices with the same label;
  * the duplicate-number warning "Already on case C-2026-00002" (`filing-record.ts`, `submission.ts`);
  * audit lines and form copy names (`fill-case.ts`).
* This breaks CS-7's "unique within the firm" in words. The breaker reproduced it on its own copy (`break-report.md` M1). I confirm it from the code.
* Fix: refuse a reference shaped like a case number (any letter case), or make `caseName()` unable to collide.

**M2. With the reference now optional, the payloads that name a case still return `reference: null` and carry no case number.**
* The build notes say that words naming a case use `caseName()`. The payloads below were missed, and they are what screens and records use as the case's name.
* No screen can fix this without the API, because these payloads have no `case_number`:
  * `api/src/case-prepare.ts:177,691`, `api/src/case-filings.ts:47`, `api/src/case-checklist.ts:87`: `reference: c.reference`;
  * `api/src/filing-record.ts:34`: `our_reference: c.reference`;
  * `api/src/runtime.ts:575` (an adult's own link view): `case: { id, reference, people }`;
  * `api/src/person-link.ts:382`: `case_reference`.
* Scenario 1 (reproduced live on `rev_a24`):
  1. Open a Visitor visa family case through `POST /api/runtime/cases` with no reference. The PR adds this capability, and its own suite does it (case `b`). Prepare it.
  2. Record submission's dialog pre-fills "Our reference" from `${view.reference}-${i + 1}` (`web/src/runtime/submission.tsx:196`): **"null-1" … "null-4"**.
  3. The record contract accepts any non-empty text, so "null-1" is saved in `filing_record.our_reference`.
* Scenario 2: the adult's own link page reads ``Case ${view.case.reference}.`` (`web/src/runtime/questionnaire.tsx:450`), which shows **"Case null."** to a client-side person.
* Today only an API caller can make such a case: Open a case still sends a reference. But A24-2 and A24-3, as planned (design §7: `cases.tsx`, `filing-changes.tsx`), cannot repair these pages without new API fields.
* The breaker found the prepare and filing-record half (`break-report.md` M2). The link view (`runtime.ts:575`) is an extra site found here.
* Fix (small, API only): give these payloads the case's name, either `case_number` beside `reference` or the name from `caseName()` where the field is used as words. Note in the build notes which screens A24-2 and A24-3 then switch over.

## Minor

* **m1** `api/src/runtime.ts:318`: every P2002 after a failed replay is reported as "A case with this reference already exists", even when no reference was sent. The only other P2002 left is the case-number unique (a counter behind its cases). The words should say so.
* **m2** `migration.sql:57`: `^C-[0-9]{4}-[0-9]{5,}$` lets `C-2026-000031` sit beside `C-2026-00031`, two spellings of one running number. It also allows year `0000`, which the counter's own check (2000-9999) refuses. Raw SQL only.
* **m3** `migration.sql:70-92`: existing cases are not checked for exactly one principal before the rules are added. Adding the exclusion fails the migration on two principals, but a case with **none** passes. It then fails with a 500 at commit on its next change of people, not with words at migration time. The app always wrote one, so this matters only for hand-made data.
* **m4** The API refuses `reference: null` with "Give the case a reference of at least 3 characters." (`.optional()`, not `.nullish()`): only leaving the key out works. A JSON client sending null for an optional field gets misleading words.
* **m5** Test gap: the replay check is sequential. Two simultaneous openings with the same key are not tested. Read from the code, the second waits on the counter row, hits the idempotency unique, rolls back its increment and is answered by `replay()`, so it holds. Design §8's "the year rolls to 00001" is tested only at SQL level (`next(…, "2027-01-01")`), which is enough for this row.

## What held

* **Migration:** additive and in order:
  * table and function first;
  * column added nullable, backfilled with `row_number()` over `(workspace_id, firm_key, Toronto year)` by `created_at, id`;
  * counters set to `count + 1` with the same grouping expressions;
  * then NOT NULL, check, unique (the name matches Prisma's, so no drift) and the never-change trigger (`BEFORE UPDATE OF case_number`, `IS DISTINCT FROM`).
* **Year:** `created_at` is `timestamptz`, so `AT TIME ZONE 'America/Toronto'` gives the Toronto wall clock as intended, both in the backfill and in `runtime_next_case_number(…, now())`. The suite's 31 Dec 23:30 Toronto case stays 2025.
* **Width:** `lpad(n, greatest(5, length(n)))` gives `C-2026-100000` after `99999`. `INTEGER` is ample.
* **Allocation** (`runtime.ts:293`):
  * The upsert takes the counter row lock inside the opening transaction and holds it to commit. 20 simultaneous openings gave 20 consecutive numbers.
  * A refused opening (duplicate reference 409, an in-transaction `fieldError`, an idempotency clash) rolls the increment back: no gap, proven by the suite.
  * The replay path runs before allocation.
  * The lock is held through the stage and answer writes. That serialises one firm's openings, which is acceptable here: maxWait is 10 s, timeout 15 s, and 20 at once passed.
* **One principal:**
  * the exclusion is `DEFERRABLE INITIALLY DEFERRED`, so Make principal's two updates in `filing-changes.ts:151` pass (BK9 and C6.13 green);
  * the at-least-one constraint trigger skips cases deleted in the same transaction, so the demo reset and the cascade path pass;
  * the trigger name sorts after `trg_runtime_case_stage`, so C6.17's "no current stage" words still win (suite green);
  * the partial index backs the trigger's lookup.
* **Writers checked:** `case_participant` and `runtime_case` writers across `api/src`, tests, acceptance and tools:
  * `createCase` writes the principal in its transaction;
  * add person refuses `principal` in the contract (`contracts/runtime.ts:72`);
  * `case-stages.ts:209` adds only a `case` row;
  * `person-link.ts` updates `keep_private` only;
  * the demo reset deletes cases before parties, then the counter.
  * The only raw inserts are in the migration checks, and the PR updated them.
* **List** (`runtime.ts:951-962`): three queries per page (people, Make principal changes, filing `groupBy`), never one per row. All are keyed by the page's ids, which already pass the firm filter. `clientName` uses the same `clientPersonOf` as the case page (`runtime.ts:183`): the first Make principal's `other`, else the principal. `client=` still lists people as before.
* **`caseName()`:** returns the reference when present, so every case opened before this PR keeps byte-identical words. Fingerprints are unchanged for requests that send a reference.
* **Derivation and guards:** no engine or derivation file is touched (fees, filings and forms unchanged), and B164 is clean.
* **Rollback:** written in the migration header and the build notes, and the steps are complete.

## Verdict

Two Majors are open (M1 reference spelled like a case number; M2 null reference in the payloads that name a case). Fix both, add a passing and a failing check for each, then review the new commit. The minors are for the builder's judgement. This review does not carry to `77dc16d12` or later: that commit appears to address M1, m1, m2, m3 and part of M2 (`filing-record.ts` only), and needs its own review.

Verdict: Changes requested
