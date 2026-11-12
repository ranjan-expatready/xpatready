# A24-1 build notes (runtime lane; schema + API only)

**Row:** A24-1 (P-492; founder ask A24). **Concept:** the planner's design `product/design/case-structure-a24-2026-11-12.md`, §5.2 (CS-1, CS-7, CS-8), §5.3, §7 (PR A24-1), §8. It is not on `main` yet: `git fetch origin lead/2026-11-07-lead31 && git show origin/lead/2026-11-07-lead31:ai-workers/problem-1-pathway-setup-and-form-filling/product/design/case-structure-a24-2026-11-12.md`.

## What gets built
* **Case number (CS-7, the team's AG-7-3):** `C-<year opened>-<5-digit running number>`, e.g. `C-2026-00042`, per firm and year; more digits past 99999. Taken at opening inside the opening's transaction by `runtime_next_case_number()` from `firm_case_counter` (an upsert: two openings at once wait on the counter row and never share a number; a refused opening rolls its increment back, so no gap). The year is the opening's in the firm's zone, America/Toronto (as the database and `api/src/earlier-facts.ts` `FIRM_ZONE`). Never changed (a trigger refuses it). Unique per firm.
* **Backfill:** column added nullable, existing cases numbered by `created_at` (then id) per workspace, firm and year from 00001 with no gap, counters set after them, then `NOT NULL`.
* **The firm's own reference is optional** (`NewCase.reference`; null or left out is none); when given it keeps its rules (3-80 characters, unique per firm) and never looks like a case number (break M1). An empty text is still refused, so today's Open a case dialog (which always sends the field) behaves as before; A24-2 (screens) makes it optional on the screen.
* **One client person per case in the database (CS-1):** P-492: the case's "principal" is the client person. At most one principal per case (exclusion constraint `case_participant_one_principal`, deferred to commit so Make principal's two updates pass) and at least one at commit (deferred trigger `runtime_case_has_principal` on the people and on a new case; a case deleted in the same transaction, a reset, is not checked). The client person read by the app stays `clientPersonOf` (the principal when the case opened), unchanged.
* **API:** `POST /api/runtime/cases` and `GET /api/runtime/cases/:id` return `case_number`; `GET /api/runtime/cases` rows add `case_number`, `client_name` (the client person, as on the case page) and `filings` (active filings of the current stage; 0 before Prepare), each read in one query per page.
* Words and payloads that name a case use `caseName()`: the reference, else the case number. That covers audit lines, duplicate-number warnings, earlier-case offers, form copy names, the filing record's `our_reference`, the filings and checklist `reference`, person-link `me` and the own-link view (review M2). Every case opened before has a reference, so their words are byte-identical.
* **Prepare (P-496 (2), Lead 24's ruling on #1633):** `api/src/case-prepare.ts:177`, `:691` read `caseName(c)` too (the baton for exactly that; nothing else in the file). So Record submission's "Our reference" suggests the case number for a case with no reference (browser check `check_a24_record_reference_browser.ts`, which fails on the code before: an empty "Our reference").
* **Demo reset** clears `firm_case_counter` with the cases, so a reset demo numbers from 00001 again (no case of the old numbers is left).

## Not built
Screens (A24-2, A24-3: list column, heading, search, "Client:", optional reference field); the client code (AG-7-69); combination per application, retainer slot (M4); any derivation change (fees, filings, forms byte-identical).

## Files
`prisma/schema.prisma` (baton), `prisma/migrations/20261112150000_a24_case_number/migration.sql`, `api/src/runtime.ts`, `contracts/runtime.ts`, `api/src/demo.ts` (one line), `api/src/{earlier-facts,filing-record,fill-case,submission,case-filings,case-checklist,person-link,case-prepare}.ts` (caseName only), tests `check_a24_case_number_migration.ts`, `check_a24_case_number_api.ts`, `check_a24_record_reference_browser.ts`, and two older migration checks that insert a raw case after every migration (now give it a number).

## Open Minors (follow-ups, none blocks)
* n1: a reference written with look-alike characters (Unicode dashes, a Cyrillic С, fullwidth digits) can still read like a case number; fix: NFKC and dash folding before the check.
* n2: an idempotency key reused with `reference: null` and then without the field gives 409 (the fingerprint hashes the null).
* Break m6 (before A24-1): reference uniqueness is case-sensitive (`Dup-x` and `DUP-x` both open); matters once A24-2 makes the reference searchable.

## Rollback
Drop triggers `trg_case_participant_principal`, `trg_runtime_case_with_principal` and function `runtime_case_has_principal()`; drop constraint `case_participant_one_principal`; drop trigger `trg_runtime_case_number_fixed` and its function; drop column `runtime_case.case_number`; drop function `runtime_next_case_number(uuid, text, timestamptz)`; drop table `firm_case_counter`; `reference` back to NOT NULL only while every case has one. Written in the migration's header.
