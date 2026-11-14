# FO-13 review: compliance tables (fo_conflict_check, fo_identity_check; schema only)

Reviewer (did not build it), 14 Nov 2026. Commit **8d10d6514726d7f4a4733e249c79189d7b4f9d8b**, branch `claude/kind-planck-uyprqb`, PR #1755. Bar: Lead B's brief `lead-b-briefs/FO-13.md` (binding), case-side contract v0.1 §3.1, the FO-1b pattern. No screen and no route, so the screen-review walks, the 1024 px / 200 % passes and the BIC table (case-side screens) are N/A. The journey test is in this file (§ Journey test): the caller asked for one file.

**Shared checkout:** while I reviewed, HEAD here moved to `06516ff1` (845b8f01 + 06516ff1), and `tests/check_fo13_compliance_schema.ts` changed on disk. Every result below that names 8d10d651 ran from a `git archive` of that commit. I also read the diff 8d10d651..06516ff1 (a FO-1b test line and a comment).

## What I ran (127.0.0.1:54329; my own scratch `xr_rev_fo13_*` plus the suites' own databases, all dropped; never :4400 or `xr_studio`)
* From an archive of 8d10d651: `check_fo13_compliance_schema.ts` **63/63** (18 s); `check_fo1b_booking_schema.ts` **79/80**, which is M3. From an archive of 06516ff1: FO-13 63/63 and FO-1b **80/80**. From the checkout: `check_prisma_schema.ts` 8/8, `check_pf3_platform_schema.ts` 75/75, `prisma validate` valid.
* My own database: every migration, two firms, four staff. `prisma migrate diff` (database → schema) shows only main's 5 known lines (fact_source, form_edition_accept, person_role, validated_copy, canonical_field_name) and nothing fo_ or platform. The header's rollback, run as written: 0 fo_compliance functions left; then the migration re-applies (2 tables).
* Prisma client (the next rows' path): `create` and `createMany` with `documentNumberLast4: "P1234567K"` are refused (P2000 from 22001); `"K9X2"` is stored. Prisma casts enums only, never `varchar(4)`.
* Race, two connections: two confirmers on one check give one winner and "the confirmation is given once"; with `where confirmed_by is null` the loser updates 0 rows.
* Mutations, each on its own archive copy: I removed each rule in turn, and the test went red every time (exit 1):
  * hidden-confirmed CHECK, disclosure CHECK, last-4 shape, `confirmed_by <> checked_by`, matches CHECK, result-NULL CHECK;
  * update trigger (4 red), identity no-update, no-delete triggers (2 red);
  * result-once, consent-once and confirmation-once branches, and `VARCHAR(4)`→`VARCHAR(12)`.
  Several runs abort after their named FAIL line, because a now-accepted insert collides with the next case. That is still red.
* Graph (`graph.mjs`, no `--write`): G1 0 · G2 0 · G3 30 · G4 0 · G5 0 · G6 11, the same as the PR states. The test is listed, and there is no page or route to trace.
* I read the breaker's `break-report.md` (untracked here) and re-ran B1, B2, B8 and B10 myself; my ratings are below.

## Builder's six choices
1. **No foreign key on person, company or prospect:** this is what the brief says, and the PR discloses it. Accepted.
2. **Matches as validated JSONB, written once:** this suits a snapshot of what the checker saw. Accepted; m2 and m6 are about the shape.
3. **Nullable result, and the hidden-matches rule as a CHECK:** a row-local CHECK is equivalent to the brief's "trigger" and stronger. Accepted, but say so in the PR (m5). The nullable result opens the NULL hole in M1.
4. **Write-once rules:** they hold, including under the race and against every update path I tried, except the consent case in M1.
5. **RESTRICT keys to platform_staff (firm_id, id) and platform_firm, five back-relation lines:** Lead B gave the OK in PR comment 6877883591. Accepted.
6. **VARCHAR(4) plus the shape check:** holds through Prisma and literals. An explicit cast slips through (m3).

## Findings
### Blocker
None.
### Major (must fix before Approve)
* **M1: a check still waiting for confirmation accepts a written-consent reference (and disclosure text), and then the true result can never be recorded** (`migration.sql` consent_check and disclosure_check, in the `ALTER TABLE "fo_conflict_check"` block).
  * Cause: with `result` NULL, `"result" = 'POTENTIAL_CONFLICT'` is NULL, and a CHECK that is NULL passes. This is the same NULL-passes trap the builder already fixed for the copy.
  * Run: insert `hidden_count 2, result null, written_consent_ref 'retainer:1'` → accepted. The confirmer then records CONFLICT_CANNOT_ACT → refused (consent_check). Clearing the reference in the same update → refused ("recorded once"). NO_CONFLICT → refused. Only POTENTIAL_CONFLICT is accepted.
  * Scenario: the retainer is signed (FO-13c stores its consent reference) before the file owner confirms the hidden matches. The owner sees a can-not-act conflict and cannot record it. The row can never be deleted, and it either stays waiting forever or claims a potential conflict.
  * This breaks the migration's own header rule ("only it carries a disclosure or a consent reference").
  * Fix: `"result" IS NOT DISTINCT FROM 'POTENTIAL_CONFLICT'` in both checks, with fail tests (consent at insert, consent by update on a waiting check, disclosure with no result).
* **M2: a disclosure with paragraphs cannot be stored** (`fo_compliance_text_ok`: `t !~ '[[:cntrl:]]'`).
  * Run: `result POTENTIAL_CONFLICT, disclosure_text E'Paragraph one.\n\nParagraph two.'` → refused (disclosure_check). A line break in `method_detail` is refused too.
  * Scenario: FO-13c's text area sends the retainer's s. 24(3)(o) disclosure, which runs up to 10,000 characters and is multi-paragraph by nature. The database refuses it with 23514, so the one record a POTENTIAL_CONFLICT must carry cannot be made as written.
  * Fix: a long-text variant that allows `\n`, `\r` and `\t` and refuses other control characters, used for `disclosure_text` (and `method_detail`), with a pass test (two paragraphs) and a fail test (`\x01`).
* **M3: at 8d10d651 an existing suite is red.** `check_fo1b_booking_schema.ts` gives 79/80: "the four foreign keys to the platform are RESTRICT" counted every `fo_%` table, so FO-13's keys broke it. The brief's "every existing suite passes unchanged" was not met at this commit.
  * It is **already fixed at 845b8f01** (narrowed to FO-1b's own tables; Lead B: keep; I ran it 80/80 from an archive of 06516ff1).
  * Closes on re-review of the head.
### Minor (should; may be carried to FO-13c/FO-13i, listed in the PR)
* **m1: who confirmed, and when, is whatever the writer sends.**
  * One INSERT by the checker R can carry `confirmed_by T, confirmed_at now()`, and the test treats that as a pass.
  * `checked_at '2019-01-01'` and `confirmed_at '2031-01-01'` are accepted.
  * A DEACTIVATED staff member is accepted as checker or confirmer (breaker B8).
  * Cheap fixes: refuse `confirmed_by` on INSERT, and set both times from the database clock. Otherwise FO-13c's Done-when must own all of this, together with the "file owner or firm admin" rule (contract §3.1).
* **m2: the matches shape refuses PartySearchPort's `role_on_case` and `client_id` (§3.1).** A match carrying them is refused (matches_check). No comment says which port id becomes `recordId`. The brief asks only for kind and record, so this is Minor. State the mapping for FO-13c.
* **m3: `'P1234567K'::varchar(4)` stores `P123`, the first four characters, with no error.** Prisma refuses the same value. Note for FO-13i: never cast, and take the last 4 in the API.
* **m4: a full document number fits in the free-text columns:** `method_detail`, `copy_file_key`, a match's `recordId` and `caseNumber` (B3, run). The brief's rule is about the column, so this is Minor. FO-13i should have no free field for the number, and the copy key should come from FilesPort, never from user text.
* **m5: the hidden-matches rule is a CHECK where the brief says "trigger".** That is fine, but write it in the PR (never deviate silently).
* **m6: the breaker's B5, B6, B7, B9 and B11** (blank-looking Unicode and bidi characters; unbounded `score` precision; loose match fields; no `SET search_path` on `fo_compliance_matches_ok`; a refusal's DETAIL repeats personal data). I agree these are Minor. For B11, the FO-13c and FO-13i APIs must not log or return raw database errors.
* **Out of row scope:** B4 (`xr_studio` is a superuser, so replica mode skips the triggers) is platform-wide, as PF-3 B-9 and FO-1b B-9 were. It is not counted against FO-13. `xr_studio_fo13_gen` on the cluster is not one of this suite's databases (its names are `empty/demo/bare_<pid>`).

## D1-D20 (schema-only row; simulated)
D1 4 (every brief line present; the disclosure and consent rules leak, M1/M2) · D2 3 (M1; m1) · D3 5 (one area file; Sample document list labelled) · D4 3 (M1 makes a true result unreachable) · D5 4 (race-safe; rollback proved; M3 at this commit) · D6 N/A (audit is FO-13c's) · D7-D14 N/A (no screen) · D15 5 (500-match insert 36 ms; firm_id first in every index) · D16 4 (every rule goes red when removed; no test for a waiting check with consent or for a multi-line disclosure) · D17, D20 not walked · D18 5 (Code s. 15, 16, 24 cited; "Unconfirmed: no counsel") · D19 N/A.

## Journey test (reviewer; the "user" is FO-13c's and FO-13i's code, by psql and the Prisma client)
1. **Main path:** a person's check with 2 visible matches and NO_CONFLICT is stored exactly. **Held.**
2. **Hidden matches:** stored with no result, then another staff member confirms with NO_CONFLICT. **Held.** The checker confirming their own check, firm B confirming, and a confirmation without a time are refused.
3. **Potential conflict:** stored with a one-line disclosure, then the consent is recorded once. **Held.** A two-paragraph disclosure is **refused** (M2).
4. **Error case:** a waiting check given a consent, then a can-not-act result. **Dead end** (M1).
5. **Identity check:** VIDEO with a passport and last 4 `K9X2`, a copy key and its sha256. **Held** (psql and Prisma). A full number is refused; a correction is a new row.
6. **Wrong firm or role:** another firm's checker or confirmer is refused (23503). The role and the staff status are not checked by the database (m1).
7. **Race and recovery:** a double confirmation gives one winner; a double apply of the migration is refused; the rollback works and the migration re-applies.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Everything the brief lists can be recorded, except a multi-paragraph disclosure (M2) |
| Next step obvious | 1 | Schema comments name FO-13c and FO-13i, the match kinds, and the confirmer duty in the PR |
| Plain words | 1 | Trigger errors are sentences ("the confirmation is given once and never changes"); each CHECK names its rule |
| Feedback and state | 1 | Waiting, confirmed and final are distinct, and each refusal names its constraint |
| Correct data | ½ | Exact on every happy path; M1 lets a waiting check hold a consent; m3 keeps the first 4 under a cast |
| Error recovery | ½ | Normal mistakes go to a new check by design, but M1 leaves a row that cannot be closed, cleared or removed |
| Accessibility and screen sizes | N/A | No screen |
| Speed | 1 | Suite 18 s; a 500-match insert takes 36 ms |
| Visual quality | N/A | No screen |
| Trust and sources | 1 | Matches carry their source (FRONT_OFFICE or CASE); Sample labelled; Code cited; "Unconfirmed: no counsel" |

**Journey score: 6.5 of 8 applicable = 8.1 / 10** (no 0). It clears the pass bar, but the Majors decide the verdict. Fixing M1 and M2 raises "Task completed", "Correct data" and "Error recovery" to 1 (8 of 8).

**Not checked:** an intended user's walk (D17, D20); the C10.1 checkpoint and the demo reset (the PR reports both green, and these tables carry no workspace_id); CI.

## Verdict
At 8d10d6514726d7f4a4733e249c79189d7b4f9d8b, three Majors are open. To fix:
1. **M1:** NULL-safe consent and disclosure checks, with fail tests.
2. **M2:** allow line breaks and tabs in `disclosure_text` (and `method_detail`), with pass and fail tests.
3. **M3:** already fixed at 845b8f01; confirm on the new head.
Then list m1-m6 in the PR as fixed or carried to FO-13c/FO-13i. The re-review reads only the diff.

**Verdict: Block** (8d10d6514726d7f4a4733e249c79189d7b4f9d8b)

## Round 2: head 110ace57 (diff from 8d10d651 only, P-277)
**What changed:**
* Migration: `fo_compliance_long_text_ok`, `fo_compliance_no_document_number` and `fo_compliance_staff_active` are new; the update trigger becomes `fo_compliance_conflict_check_write` (INSERT and UPDATE); there is a new identity INSERT trigger; every function has a fixed `search_path`.
* The conflict check's comment in the schema file now lists the match keys; the erasure comment is added.
* The FO-1b test line (845b8f01) is narrowed; the FO-13 test grows to 76 cases.
* This review.md and break-report.md are committed. My review.md is unchanged from my copy.

**Checks,** from a `git archive` of 110ace57 (suites' own databases, plus my scratch `xr_rev_fo13_r2`, all dropped; never :4400 or `xr_studio`):
* `check_fo13_compliance_schema.ts` **76/76**; `check_fo1b_booking_schema.ts` **80/80** (M3 closed); `check_pf3_platform_schema.ts` **75/75**; `check_prisma_schema.ts` **8/8**; `prisma validate` valid.
* The rollback in the header, run as written: 0 `fo_compliance_*` functions left, and the migration re-applies.

**My round-1 probes, repeated:**
* **M1 fixed.**
  * A waiting check refuses a consent reference, both at insert and by a later update (consent_check).
  * The confirmer can now record CONFLICT_CANNOT_ACT on a waiting check (`confirmed_at` set by the database).
  * Waiting → POTENTIAL_CONFLICT confirmed with a disclosure, then the consent: accepted.
* **M2 fixed.**
  * A disclosure of `\r\n\r\n` paragraphs and a tab is stored (psql and Prisma).
  * `\x01` is refused, and so is a disclosure of only line breaks.
* **m1 closed.**
  * Prisma `create` with `confirmedBy` is refused ("confirmed afterwards, by another person").
  * A supplied `checkedAt` of 1900 is replaced by the database's time.
  * The confirm `update` (only `confirmedBy` and `result`) gets `confirmed_at` from the database.
  * A DEACTIVATED checker is refused on a new check. A check whose checker has since left still takes its consent reference, which is correct.
* **m2 closed.** `clientId` and `roleOnCase` are accepted on CASE matches only, and the comment says what `recordId` is. Main's case numbers (`C-YYYY-NNNNN`, `a24_case_number` migration) fit the new `caseNumber` shape.
* **m4 closed for the columns.**
  * `method_detail` refuses `Passport AB 1234567`. The copy key is only words and uuids.
  * `recordId` is a uuid.
* **Race:** two confirmers at once give one winner and "the confirmation is given once".

**Mutations** (export only; each rule removed alone): consent `=`; disclosure `=`; disclosure back to the one-line rule; the insert-confirmed refusal; the conflict and identity `checked_at := now()`; `confirmed_at := now()`; the active-staff test; the matches' `search_path`; the document-number note rule; the duplicate-record rule; score precision. Each turns the test red (1 failure, or a non-zero abort).

**New Minors (none blocks; notes for FO-13c / FO-13i):**
* **n1: one guard line has no test.** Removing `OR NEW.matches::text IS DISTINCT FROM OLD.matches::text` leaves 76/76. The 4-decimal rule now covers break 6; what is left is only a `0.5`→`0.50` rewrite, which keeps the value. Add a fail test, or drop the line.
* **n2: the active-staff check takes no lock** (`fo_compliance_staff_active`). A deactivation committing at the same moment as a confirmation can let both through. This is a soft-state race of FO-1b's m11 class.
* **n3: the next rows must shape their values.**
  * A raw similarity score such as `0.4166667` is refused: FO-13c rounds to 4 decimals.
  * `roleOnCase` must be UPPER_SNAKE, and uuids lower case.
  * The note heuristic also refuses honest reference numbers (`HR letter ref HR-2026-0042`, `meeting ID 123456789`): FO-13i shows a plain message for the constraint name.

**Before the label (records, not code):** the PR body at this head does not yet carry what this round leaves to the PR text. Add:
* m3 (an explicit `::varchar(4)` cast keeps the first 4) and m5 (CHECK, not the brief's trigger), as notes for FO-13i;
* break 4 handed to the tech lead as PF-12's;
* n1-n3.
B5/B6/B7/B9 are closed in the migration (my mutations 10, 12 and 13 cover B9, B7 and B6); B10/B11 remain PostgreSQL behaviour, carried as m3 and m6.

**Journey score:** with M1 and M2 fixed, "Task completed", "Correct data" and "Error recovery" rise to 1, giving 8 of 8 applicable, **10 / 10**.

No Blocker or Major is open at 110ace57662b5efe1ed5cae9e4d8b46c37411cc7.

Round 2 verdict (110ace57): Approve.

**Verdict: Approve** (110ace57662b5efe1ed5cae9e4d8b46c37411cc7)
