# FO-1a review: front-office sales tables and the per-firm seed (independent reviewer, 14 Nov 2026)

Commit reviewed: **5f88dc133** (branch `claude/tender-hamilton-moa9bq`, PR #1742). Diff `origin/main...5f88dc133`: `front-office-sales.prisma`, migration `20261114063000_fo1a_front_office_sales`, `api/src/front-office/firm-seed.ts`, `tests/check_fo1a_sales_schema.ts`, one line of `DEVELOPING.md`. Judged against: the row (rows rev 3.1), brief FO-1a (rev 14: consent removed), contracts §0, §2.1, §2.6, §7, AG-2-52, -77, -80, -84, -8a, -44, -76, BR-22, STANDARDS §3–§5. Schema row, so there is no browser or screenshot part. BIC table: N/A (no case-side screen). Graph: `graph.mjs` run; no page or route belongs to FO-1a.

**Verdict: Block** (one open Major). Ship after the fix.

## What I ran
* `npx tsx tests/check_fo1a_sales_schema.ts`: **74 passed, 0 failed** (15 s). `check_prisma_schema.ts` 8/8, `check_pf3_platform_schema.ts` 75/75, `check_case_feed.ts` 37/37.
* Isolated copy `fo1arev` on **:4431** (runtime ports), with FO-1a migrated. **Load the finished story (C10.1/C10.2) ran to done in 166 s.** Then I ran PF-3's seed and FO-1a's seed twice: the first run gave 16 stages, 13 reasons, 1 form (off) and 5 services for each Sample firm; the second run changed nothing. Copy stopped and dropped.
* A scratch database with every migration, where I tried to break it (SQL below). It is dropped now.

## Done when: each line, with its pass and fail test
| Done-when line | Pass / fail test | Holds? |
|---|---|---|
| Migration on empty and demo-data copies, `migrate diff` empty | yes / yes (bare database differs; applying it twice is refused) | Yes. The "demo copy" in the test is synthetic; I added the real checkpoint load above |
| A lead has no stage, type or value | yes / yes (a fake table is caught) | Yes (BR-22) |
| A prospect's stage is of its own firm and its type's pipeline | yes / yes ×2 (other pipeline; other firm) | Yes, composite key `(firm_id, type, stage_id)` |
| A Corporate prospect needs a company and a primary contact linked to it | yes / yes ×3 | Yes, but stricter than AG-2-77 rule 4, and that causes M1 |
| A repeat enquiry is a second lead | yes / weak (the fail tests a missing person, not a per-person unique) | Yes |
| The same intake key twice is one receipt | yes / yes | Yes |
| Attribution refuses update and delete (consent wording: PF-19a, per the brief) | yes / yes (truncate too) | Yes |
| L-/P- numbers never repeat under 20 parallel inserts | yes / yes | Yes. `UPDATE … RETURNING` on the setup row holds its lock until commit. If the lock is removed, the unique index throws and the suite fails |
| `firm_id` first in an index on every table | yes / yes | Yes |
| A new firm gets 16 stages, reasons, one form and its services, once | yes / yes | Yes (see m7 on how strong the concurrency test is) |

## Deviations from the row: my judgement
* **No foreign key from `fo_*` to `platform_firm`/`platform_staff`:** justified. Prisma needs a back-relation field in `platform.prisma`, and the brief forbids editing that file. The firm and owner triggers stand in for it. Two conditions: the PR must ask Lead B for the lines (m1), and the triggers protect inserts only (m2).
* **Extra `fo_sales_setup`:** justified. It is the per-firm row the number lock needs, the anchor for every `firm_id` foreign key, and the once-only seed mark. Putting the counters on `platform_firm` would mean editing another area.
* **No raw request on the receipt:** justified. The team's own AG-2-84 rule 3 says "stores a hash of the normalised request, never the raw request". It ranks above the contracts' "raw fields" (AGENTS rule 2). Record it in the PR as a deviation from contracts §2.1 (m1).
* **One email and one phone per person:** acceptable for month one (the form has one of each), but the contracts §2.1 table says "emails, phones". Record it as a deviation (m1). A second channel later is a data move.
* **`pipeline` column on `fo_stage_move`:** half right. It keeps `from` and `to` in one pipeline, but nothing ties it to the prospect's type (m3).

## Issues
**Blockers:** none.

**M1 (Major): you cannot change a Corporate prospect's primary contact.** AG-2-77 rule 6 needs this ("cannot be removed until another person is made primary"), FO-2b's row needs it ("add, change and end contacts"), and the trigger's own message tells people to do it. Three rules lock each other out:
* `migration.sql:685`: one live PRIMARY per company, as a partial unique index, which cannot be deferred.
* `:726` `fo_company_contact_primary_kept`: refuses to end, demote or repoint a PRIMARY link while **any** prospect names that person, including WON and LOST ones.
* `:716` `fo_prospect_rules`: a Corporate prospect's contact must hold a live **PRIMARY** link. AG-2-77 rule 4 and the row ask only for "a link to the company".

Reproduced in one transaction, every order fails: adding B as PRIMARY hits `fo_company_contact_one_primary_key`; repointing the prospect to B raises "primary contact is the company's live PRIMARY contact"; ending or demoting A raises "make another person primary first". Old Lost or Won prospects pin the company's primary for ever, and after any change they can never be updated again.
*Fix:* make the two cross-row checks deferred constraint triggers (`CREATE CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`), or require a live link of any role (AG-2-77 rule 4). Check only prospects that are not WON or LOST. Add a pass test that swaps A to B in one transaction, and a fail test that commits with no live primary.

**Minors**
* **m1, PR body unfinished** ("Body completed at the end of the row"). It does not yet contain:
  * the "Question for Lead B" asking for the back-relation lines: `PlatformFirm` to `FoSalesSetup`, and `PlatformStaff` to the lead and prospect owners as `(firm_id, owner_staff_id)`, since staff already has `@@unique([firmId, id])`;
  * the deviations above;
  * the `migrate diff` note on the re-stamp.
* **m2, owner and firm checked only on insert/update** (`:554`, `:642`). In my break test I deleted a `platform_staff` row that had no grants. `fo_lead.owner_staff_id` was left pointing at nothing. "Staff are never deleted" is a promise PF-3 does not enforce. The real foreign keys (m1) close this.
* **m3, `fo_stage_move.pipeline` is not tied to the prospect's type** (`front-office-sales.prisma:497`). A move on a CORPORATE prospect naming two INDIVIDUAL stages was accepted. Check `NEW.pipeline = prospect.type` on insert. That still lets Change type (FO-2b) log later moves in the new pipeline.
* **m4, person not tied to lead on the receipt and on notes.** A receipt marked CREATED naming lead L (person A) together with person B was accepted, and so was a note on lead L about B. Calls already use the `(firm_id, lead_id, person_id)` key (`:462`); use the same key on `fo_arrival_receipt` and `fo_note`.
* **m5, a booking arrival that makes no lead has no outcome.** AG-2-84 rule 8 and contracts §7 §2.2 say "a booker with an open prospect makes no lead". But `fo_arrival_receipt_outcome_check` (`:666`) makes CREATED name a lead, and no other outcome fits. FO-3 will hit this. Add an outcome, or record how FO-3 completes the receipt.
* **m6, the seeded "Interested in" names are unclear to a visitor** (`firm-seed.ts:60`). On the finished-story copy each firm got "Outside Canada" (it is Study permit › Outside Canada) and "With an LMIA – inside Canada". The seed runs once and keeps later edits, so a vague label sticks for every firm seeded before a fix. Seed the parent program's label with it.
* **m7, the concurrent-seed test does not prove the `for update`** (`firm-seed.ts:74`). The setup row never exists before the race, so the unique-insert wait already serialises the two runs. Removing `for update` stays green, yet a pre-made setup row would then get two web forms. Pre-create the setup row in the race test.
* **m8, STANDARDS §3 [M] optimistic concurrency.** `fo_lead`, `fo_prospect`, `fo_web_form`, `fo_person` and `fo_company` have no version column (PF-3 did the same). State in the PR that FO-2 uses `updated_at` as the stale-save token, or add `version` now. Adding it now is cheap.
* **m9, check-then-insert race in `fo_prospect_rules`/`primary_kept`** under READ COMMITTED: a prospect insert and the ending of the primary link can both commit. Deferred triggers (M1) or a row lock on the company, taken in FO-2b, close it. Note it for FO-2b.
* **m10, `consent_wording_version_id` has no firm key** (`schema:525`). When its foreign key lands it must be `(firm_id, id)` if `msg_consent_wording` is per firm, or firm A's form can name firm B's wording.
* **m11, the seed is not wired to anything.** Nothing calls `onFirmCreated` or the Sample seed. Nothing emits `firm.created` yet, and PF-3's seed is manual too, so this is acceptable. Name in STATE or the PR which row runs it (sign-up, PF-4), because FO-2 refuses every insert for an unseeded firm (`fo_next_number`).
* **m12, where the form's "message" lives** (AG-2-84 rule 1, "first message"). There is no column on the lead, and the receipt keeps only a hash. Presumably it becomes a system `fo_note` on the lead. Say so for FO-2.

## D1–D20 (1–5; schema row)
D1 4: every Done-when line met; M1 breaks AG-2-77 rule 6 · D2 4: composite keys block every cross-firm link I tried; m3/m4 are gaps inside one firm · D3 4: one person record, contacts linked not copied · D4 3: M1 leaves a reachable state that cannot be undone · D5 5: numbers are given back on rollback; seed retries are safe; the checkpoint loads · D6 4: keys fixed, labels renameable, rollback recorded · D7 N/A · D8–D14 N/A (no UI) · D10 3: m6 · D15 4: indexes for Unassigned, timeline and match; no per-row seed queries · D16 4: a pass and a fail per line; m7 · D17, D20 simulated only (no user walk) · D18 4: every seeded label cites AG-02 · D19 N/A.

## Journey score (reviewer; `journey-test-reviewer-2026-11-14.md`): **8/10**, no criterion at 0
These were data journeys, played as SQL in the shapes FO-2, FO-2b and FO-3 will write. Half points: task completed (cannot swap a primary contact), plain words (m6), feedback and state (m5), correct data (m3/m4).

## Not checked
* A copy of the real :4400 demo database on the Mac (this cloud copy had no demo data; the finished-story checkpoint was my substitute).
* CI on GitHub.
* PF-19a's consent tables (not on main).
* Row-level security (PF-12).

**Verdict: Block.** To fix: **M1**. Minors m1 to m12 are for the builder to fix or to record in the PR, which the merge does not depend on.
