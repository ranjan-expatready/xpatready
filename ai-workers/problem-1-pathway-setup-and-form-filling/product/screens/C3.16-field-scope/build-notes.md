# C3.16 build notes (forms lane, 5 Nov): what was built, how it was checked, what qa should know

Concept r4 (`concept.md`) approved by the tech lead on #1054 (Lead 11's ruling, six points). Claimed **Partial**, not Works (ruling 3): Works only when the case part runs on the six after B82, with qa's gate A.

## What a person can do now
* **Author, Library › Fields › a field › "Asked about":**
  * choose Person, Filing, Household or Organisation while the field has never been published;
  * a choice that cannot be made says why under it;
  * a published field is read-only ("A published field's scope cannot change. Create a new field.");
  * when the change would stop saved AI results replaying, it warns first.
  * The pill under the field's name says the same words.
* **Case officer or client, on a case whose release carries a household or employer field:**
  * the question is asked once in The application, tagged "For the household" (or "About the employer") with "Read for: …";
  * each member's part shows it read-only with "Change it in For the household";
  * a save on a person's record is refused in words.

## Files
| Part | File |
|---|---|
| Migration (two `ADD VALUE`, no backfill) | `prisma/migrations/20261105100000_c316_field_scope/migration.sql`, `prisma/schema.prisma` |
| The one reader and the refusals | `engine/field-scope.ts` (new) |
| Release mark (hot, approved) | `engine/snapshot.ts`: one conditional spread |
| Resolver | `engine/resolver.ts` `scopeOf`, `isFilingFact`, `aboutOf` |
| Documents still supply a marked fact | `engine/sources.ts` `documentFacts` |
| Case view tag | `engine/runtime/case.ts` |
| Save rule | `api/src/runtime.ts` `putAnswer` |
| Library route | `api/src/field-scope.ts` (new), `api/src/main.ts` |
| Per-row and condition refusals (hot, approved) | `api/src/studio.ts` `placeField` (one line), `api/src/question-condition.ts` |
| Contract (hot, approved) | `contracts/resolver.ts` (`BUILT_SCOPES` all four, `HELD_SCOPES` gone), `tests/check_sh3_resolver.ts` |
| Screens | `web/src/pages/field-scope.tsx` (new), `web/src/pages/library.tsx`, `web/src/runtime/scope-tag.tsx` (new), `web/src/runtime/questionnaire.tsx` |
| Tests | `tests/check_c316_field_scope.ts` (pure, in the suites), `acceptance/C3.16.test.ts` (six part and case part) |

Not touched: `api/src/demo.ts`, `engine/render.ts`, `api/src/proposals.ts`, `api/src/fact-sources.ts`, any `library-*` file (only `lockItem` is imported), `contracts/runtime.ts`.

## Checks (fresh isolated copies, US$0, live AI off)
* **`acceptance/C3.16.test.ts` six part: 31/31, exit 0.**
  * The copy: `xr_studio_c316s` on 4454, a fresh copy of the six.
  * The steps: the people's steps set up Visitor visa and the LMIA work permit from their forms, then the scope choices and refusals, Preview's employer case, Reset to the six, then Start With an LMIA for the published refusal.
  * One line is a NOTE, not a pass: this copy has no single person question with a real condition. The condition refusal is proven in the pure check.
* **Case part: 12/12, exit 0.**
  * The copy: `xr_studio_c316r` on 4453, after `tests/runtime/setup_visitor_visa.ts`.
  * The scope is set in SQL as named scaffolding, then released again through submit, sign off and approve.
* **`tests/check_c316_field_scope.ts`: 26/26. `tests/check_sh3_resolver.ts`: 85/85.**
* **Walk at 1440 px** (`screenshots/`, Playwright headless, no page errors):
  1. the employer name's choice, before;
  2. Organisation saved, the pill reads "once for the employer", and the form field reads "the application";
  3. Visitor visa's union date with the saved-results warning;
  4. the family case's The application tab, "For the household · Read for: Client A, Client B";
  5. Client B's part, read-only, with the "Change it in For the household" link (it switches to The application).

## For qa
* **Question list drift (m8, tech lead's ask on #1054). How I measured `vv.single-e915b47071a0` (373), against `ae2133b8a398` (365) in the committed runs:**
  1. `zsh studio/tools/isolated.sh c316 4450 start` on main 86b721eac (branch head 7b317dde3 added only the concept);
  2. `POST /api/demo/reset-to-six {"confirm":"RESET"}` as user-A;
  3. the people's steps (`acceptance/lib/pack2.ts` `needQuestions`) on **the LMIA work permit first**, then **Visitor visa**;
  4. the independent challenger then called `POST /combinations/<vv>/pqr-picks/plan` (plan only), which wrote the list file.

  The order matters for field keys. Set up after the LMIA work permit, Visitor visa's union date is `relationship.current_union_start_date`; set up first, it is `relationship.start_date`. So a different setup order may give a different list, and that may be the drift. Not chased in this row, as ruled.
* **A separate Minor found on the way (not C3.16's): Demo › Start With an LMIA run after the LMIA work permit was set up from its forms answers 500 and leaves a half load.** The server log says "Unique constraint failed on the fields: (`combination_id`, `lineage_key`, `version`)". Repro: a fresh six, `needQuestions` on the LMIA work permit, then `POST /api/demo/release-with-sources`.
* **Named stand-ins (P-33):**
  * one household per case (everyone on it);
  * one employer per case (the principal's), until the employer link and the shareable mark arrive (L-SA5);
  * Filing is the `case.` facts only, once per case until SH4.
* **Not built:**
  * a household or employer list (per row);
  * a household question with a condition;
  * an imported field keeping a Household scope (import derives it from the key, m9);
  * an id across cases;
  * SA-1B-134 rules 2–4 (with C6.5's follow-up).
* **#1051 (C1.3 + C11.5), corrected by the tech lead on #1054 (comment 6650232198):**
  * #1051 copies employer facts with `carriedFacts`, which uses `scopeOf`, not `aboutOf`. A field marked Organisation would be copied onto the principal while `aboutOf` reads the case's own record.
  * Whichever PR lands second carries the check, in two parts:
    * a unit line: `carriedFacts` with `{ fact, repeats: "per_person", scope: "organisation" }` gives `on: "case"`;
    * API lines on the case part's SQL-scoped fixture: a link puts the answer on the case's own record, the question shows it, the principal's IMM 5710 box reads it, and a value typed beforehand shows Same or Different.
  * Neither this pack nor `check_c316_field_scope.ts` calls `carriedFacts` or the link route today.
  * A trial merge against #1051 conflicts only on import lines in `api/src/runtime.ts` and `web/src/runtime/questionnaire.tsx`: keep both sides.

## Second main merge (7 Nov, 14:55 IST, row A5)
* `origin/main` merged at `87d16a23d` with no conflict (the import lines in `api/src/question-condition.ts` were already resolved at `b11c26e36`).
* **One copy change, a code cause from CI:** the PR's CI at `47747b13b` failed `check_qa182_no_box_words.ts` (QA-182, P-63: no shown message says "box"). The representative refusal read "A representative's box reads this field, so it stays about each person." It now reads **"A representative's part of the form reads this field, so it stays about each person."** The concept's copy (r4, BR-2) keeps the old words as written then; this line is the change. `acceptance/C3.16.test.ts` C3.16-2 matches the new words.
