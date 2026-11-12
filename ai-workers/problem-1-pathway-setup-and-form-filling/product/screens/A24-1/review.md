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

## Re-review of a02fcfaf4..6a193102c

**Scope:** `git diff a02fcfaf4..6a193102c` only (commits `ed25feefa`, `77dc16d12`, `6a193102c`). The PR head then moved to `8e6bd95f0`, which adds only `product/qa/built/A24-1.md` (one line, read). There is still no screen, so there is no journey score. **Copy:** `isolated.sh rev2_a24 4493`, then stopped and dropped. US$0.

| Check (at `6a193102c`) | Result |
|---|---|
| `check_a24_case_number_migration.ts` | 28/28 (new: one spelling per number; a case without a principal stops the migration, nothing half done) |
| `check_a24_case_number_api.ts 4493 xr_studio_rev2_a24` | 23/23 (new: refused look-alike references, explicit null, filing record, filings, checklist, byte-identical words) |
| `acceptance/C6.16.test.ts` (person-link `me`) | 74/74. `case_reference` is still the reference for a case that has one |
| `typecheck.mjs` | no new errors (api 15 known, web 0) |
| My probes on the copy | listed under the Minors below |

**Earlier findings:**
* **M1: fixed.** `LIKE_CASE_NUMBER` refuses `C-<digits>-<digits>` in any letter case and with any spaces, on the field (400), before a number is taken. Probed: `c-2026-00001` refused.
* **M2: fixed for this PR's payloads.** `caseName()` is now used in:
  * `filing-record.ts` (`our_reference`), `case-filings.ts` and `case-checklist.ts` (`reference`);
  * `person-link.ts` `me` (`case_reference`; it now also selects `caseNumber`);
  * the own-link view (`runtime.ts:576`), so "Case null." is gone.
  * Key names are unchanged. A value changes only when the reference is null, so cases with a reference keep byte-identical words (checked by the suite and by C6.16).
* **m1: fixed.** With no reference given, a clash now says "The case could not be given its case number … Ask the Lead." (wording already used in 9 other places). One narrow case is left: when a reference was given and the clash is still the case number, the old reference words come back.
* **m2: fixed.** The same shape is enforced in both places (`^C-[1-9]\d{3}-(\d{5}|[1-9]\d{5,})$`), in the contract and in the database check.
* **m3: fixed.** The check runs first in the migration and stops with words that give the count and what to do. Checked on a scratch copy.
* **m4: fixed.** `.nullish()`: an explicit null now means no reference (201). Its side effect is n2 below.
* **m5: not changed.** It was a test gap only. The breaker's 12 simultaneous identical openings cover it, and the breaker's m5 (list row contract) is now `CaseListRow`.

**The Prepare view's `reference` (`case-prepare.ts:177,691`), left to the tech lead:**
* Still `null` for a case without a reference. Probed: `GET …/prepare` gives `"reference": null` and no `case_number`. The Record submission dialog (`submission.tsx:196`, `PrepareView`) would offer "null-1".
* **Not a Blocker for this PR.**
  * No screen can create such a case today: Open a case always sends a reference, and an empty one is refused.
  * The fix is one word in a file this builder's brief forbids.
  * It is raised on the PR with a concrete re-check.
* **Gate:** A24-2 must not ship the optional reference field until `case-prepare.ts` names the case with `caseName()`. A24-2's reviewer must open a case with no reference and see the case number in Record submission's "Our reference" before approving.
* The gate lives only in a PR comment today. The tech lead should also put it on A24-2's backlog row.

**New Minors (builder's judgement; none blocks):**
* **n1:** References that only look like a case number still open. Probed against `C-2026-00033`:
  * accepted with 201: U+2010 hyphens, en dashes, a Cyrillic `С`, fullwidth digits;
  * `caseName()` would then show two cases with names that read the same, though their bytes differ.
  * A plausible way in is pasting from a PDF or a word processor. Fix: test the NFKC form, with every `\p{Pd}` turned into `-` and a Cyrillic or Greek C turned into `C`.
* **n2:** One idempotency key sent first with `reference: null`, then with the key left out, gives 409 "already used for a different case request". The fingerprint hashes `"reference":null`, so it differs from a request that omits the key. Fix: turn null into "absent" before hashing.
* **n3:** `build-notes.md` was not updated:
  * its Files list lacks `case-checklist.ts`, `case-filings.ts` and `person-link.ts`;
  * it does not name the `case-prepare.ts` hand-off;
  * the own-link view and person-link `me` have no null-reference check (verified only by reading the code).

No Blocker, no open Major.

Verdict: Approve 8e6bd95f04a0f0ca4150f2c2052cd467e20723c3

## Re-review of 4d3cc8767..78c0ad988 (P-496 (2))

**Scope:** `git diff 4d3cc8767..78c0ad988` only (`42c83490c`, `78c0ad988`): the `case-prepare.ts` change, the Prepare lines in `check_a24_case_number_api.ts`, the new `check_a24_record_reference_browser.ts`, two screenshots and the build notes. No new screen, so no journey score. **Copies:** `rev3_a24` (4493) and `rev3_a24r` (4498), both stopped and dropped; the screenshots the browser check rewrote were restored. US$0.

| Check | Result |
|---|---|
| `check_a24_case_number_api.ts 4493 xr_studio_rev3_a24` at `78c0ad988` | 23/23 |
| `check_a24_record_reference_browser.ts 4498 xr_studio_rev3_a24r` at `78c0ad988` | 5/5: "Our reference" = `C-2026-00002` = Prepare; the case with a reference still suggests `A24R-…` |
| The same browser check on the **old** `case-prepare.ts` (see below) | **4/5**: `{"bareRefs":[""],"prepare":null}`, as the builder reported |
| `check_a24_case_number_api.ts` on the old `case-prepare.ts` | **22/23**: only the Prepare assertion fails (`[200,null]`); filing record, filings and checklist stay correct |

How the old code was run, without editing the checkout: a Node load hook in the scratchpad (`--import`) served `case-prepare.ts` at `78c0ad988` with both `reference: caseName(c)` reverted to `reference: c.reference`. The server logged "reverted 2 line(s)", and it ran on the `rev3_a24r` database and port.

**What was judged:**
* **Baton kept.** `case-prepare.ts` differs from `4d3cc8767` in exactly three lines: the import (`caseName` added to the existing `contracts/runtime.ts` import) and `:177` (not derived) and `:691` (derived). Nothing else in the file changed.
* **Byte-identical words.** `caseName()` returns the reference whenever there is one, so Prepare's value changes only where it was `null`. This is proven at both levels: the API check on `filings` and `prepare`, and the browser check on the dialog box (`A24R-…`). Only one reader uses Prepare's `reference`: `submission.tsx:196`. No test or screen relied on it being null.
* **A real fail check.** Both new assertions fail on the old code and pass on the new code (runs above). Earlier review M2 and the open hand-off are closed: Record submission no longer starts empty, and can no longer show "null-1".
* **`reference: null` to `openCase` is honest.** The default for `ref` (`acceptance/lib/m3.ts:92`) applies only to `undefined`, so JSON `null` reaches `POST /runtime/cases`. The contract's `.nullish()` reads that as no reference, which the API check proves (explicit null gives 201 and the next number), and the setup assertion confirms `reference === null` on the opened case. No screen path is faked. The case is made Ready to file through the product's routes (`readyToFile`), and the dialog is reached by its real button.
* **Build notes.** The hand-off paragraph is replaced by the ruling and its check. The Files list now names `case-prepare.ts` and the new check. Earlier n3 is closed.

**Minors (builder's judgement; none blocks):**
* **p1:** the browser check's "no null" assertion cannot fail on a one-filing case. The old code gave `""`, not "null", so it passed (it was the one PASS among the four that passed on the old code). The "null-1…" shape from earlier M2 belongs to cases with several filings (`${view.reference}-${i + 1}`). Only the API check covers that, on Prepare's value (case `b`), not in the dialog. A family case in the browser check would make that assertion bite.
* **p2:** `reference as string` in `single()` hides the null from the type checker. `openCase`'s `ref` could be typed `string | null` instead. Test code only.
* **p3:** the A24-2 gate in the earlier re-review ("must not ship the optional reference until `case-prepare.ts` uses `caseName()`") is now met by this commit. The tech lead can lift it from the PR comment and the backlog row. A24-2's reviewer still sees the field on its own screen.

No Blocker, no open Major.

Verdict: Approve 78c0ad988a1ec8310852b4c7b196610c930958a1

## Re-review 4 (merge of main, f13a63292)

**Scope:** diff-only (P-277) of the merge `f13a63292` (parents `305e72332`, approved, and main `5dc5e8e1c`, which brought #1612 BK-17). No new screen, so no journey score. **Copy:** `rev4_a24` (4494), started and stopped in the same command, database dropped. US$0, live AI off.

| Check | Result |
|---|---|
| `check_bk17_recorded_filing_api.ts 4494 xr_studio_rev4_a24` at `f13a63292` | 26/26 |
| `check_a24_case_number_api.ts 4494 xr_studio_rev4_a24` at `f13a63292` | 23/23 |

**What was judged:**
* **Conflict resolution (`api/src/case-filings.ts`).** `git diff 5dc5e8e1c f13a63292` on the file is exactly two lines: the A24-1 `caseName` import, and `reference: c.reference` → `reference: caseName(c)` in the return. Main's BK-17 body (the `applicants: true` include, `keptRowsOf` / `keepRecorded` / `feesOnTheirFilings`, `frozenIn(shown, rows)`) is kept word for word. The `--cc` combined diff agrees: both imports kept, and one `++` line, which is the return.
* **The merge is main plus A24, and nothing else.** Under `studio/`, `git diff <merge-base> 305e72332` and `git diff 5dc5e8e1c f13a63292` touch the same 18 files with the same +496/−43. Every file's changed lines match, except `case-filings.ts`, where only the context differs (above).
* **`case-prepare.ts`.** Compared with main, it differs only in A24's three lines: the `caseName` import (`:50`), and `reference: caseName(c)` at `:177` (not derived) and `:718` (derived; the line moved from `:691` because BK-17 added lines above it). BK-17's sync and view changes merged by themselves and touch no reference.
* **No new raw case reference from main.** `submission.ts` (BK-17 adds `labels` to `recordedFeesOf`) keeps A24's `caseName(c)` at all three audit lines and at both `duplicateWarning` reads (`select { reference, caseNumber }`). `submission-record.ts` uses only `our_reference: rec.ourReference`, which is the filing's own reference and not the case's. `web/` (`sign-in.tsx`, `start.tsx`) has no reference reads. The incoming tests have no `runtime_case` insert, no `$executeRaw`/`$queryRaw`, and no case `.reference` in a payload. The BK-17 checks open cases through `openCase(...)` with a reference. `check_bk4b_handoffs_browser.cjs:185` and `qa/check_qa412_cofiled_sponsor_name.cjs` type a reference into the "Case reference" field, which A24-1 leaves unchanged. Their `our_reference` values are filing references.

**Findings:** none at Blocker, Major or Minor.

Verdict: Approve f13a63292d7fa3a4b2702ceb8fff6e0404327d15
