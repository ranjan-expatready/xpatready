# G1 (C5.4) part 1: review of the concept records and the pure engine

Reviewer (did not build it), 2 Nov 2026. **Commit reviewed: 47b79213** (branch `claude/funny-curie-mbttn2`, PR #558). Started at c9904226; the coordinator moved the head to 47b79213 (Devin's finding: a record's own cite now wins over an old register entry) and this review covers that head.
Scope: `engine/source-register.ts`, `tests/check_g1_source_register.ts`, `concept.md` v2, `challenge.md`, `build-notes.md`. Nothing is wired (no table, API, release path or screen), so the D1–D20 table, the browser walk, axe and the screen sizes wait for PR 2b. US$0; no app started and no port used.

## Verdict: **CHANGES** (Block): one Major, no Blocker. Engine score **8.8/10** (7 of 8 applicable criteria).

## What I ran (at 47b79213)
* `npx tsx --tsconfig api/tsconfig.json tests/check_g1_source_register.ts`: **23/23**, exit 0.
* `node ../../product/tools/graph.mjs --check`: exit 0 (G1 0 · G2 0 · G3 7 · G4 0 · G5 0 · G6 3).
* `node tools/count-any.mjs --against origin/main`: 423, the same as the base; exit 0.
* A script over `p3/releases/c1-v3/configuration.json`: every operator and every non-zero number in forms, document lines, rules, checks and placements. Numbers appear only in `gte`, `lt` and `lte` leaves. String-numeric values are only answer codes in `eq` (`"01"`, `"02"`). No placement in the release has a condition.
* 19 mutants on a scratch copy of the engine (outside the repo). Results are below.
* Timing: walk + `sourceProblems` over all 748 checks of c1-v3 takes **0.65 ms** (budget ≤ 50 ms).

## 1. Engine against the concept
* **BR-1 (B1 fixed). Held.**
  * It walks the conditions of `forms`, `document_requirements`, `placements`, `rules.when`, `checks` and `eligibility.gates`, plus `min_age`, validity `months` and fee lines.
  * It gives 19 numbers on 17 items, matching the concept and the challenger's script (18×5, 90×5, 30×4, 5×4, 1×1), and 27 with `dates: true`.
  * It leaves out 0, booleans, `eq "01"` codes and, by default, dates.
  * Keys carry the combination. A `document_validity` check is read for its months, not walked, which matches `render.ts:251` and `validate.ts:97`.
* **BR-2 (M3). Held:** `<field>|<op>|<k>`, k over every leaf of that field and operator (0s included); the JSON path is only a `hint`.
* **BR-4, BR-5, BR-6, BR-8. Held:** fee lines count only with page, URL, quote and date read; a usable validity rule counts through its own cite; canonical value; "Changed" sentence; every problem listed; §5 sentences match exactly (en dash included).
* **M1. Held:** pure (only `validate.ts`'s `Problem` type; file reads are only the existing static JSON imports in `runtime/filings.ts`); `validate.ts` does not call it.
* **Fidelity of the test release.** The test re-shapes c1-v3 the same way `import.ts:63-108` and `demo.ts:138-142` do (no keepWho or keepForm on `wp.family`, the same lineage formula, form_native checks left out). This is a mirror, not the real `buildSnapshot`; the API suite in PR 2a must confirm the 19 on the database.

## Issues

### Major
**MJ-1 · A number stored as text slips past the gate (BR-1 "every number").** *Must.*
* **Where:** `engine/source-register.ts:105` counts a leaf only when `typeof v === "number"`.
* **Why it can happen:** the team's contract allows text on ordered operators (`contracts/predicate.v0.schema.json` "ordered"; `contracts/rules.ts:57`); the save check `checkCondition` (`studio.ts:662/747`) does not check value types (only gates run `valueProblems`); "Edit as JSON" keeps what the author types; the runtime still decides on it (`contracts/rules.ts:118`, a text comparison).
* **Probe (scratch):** `{op:"gte", field:"person.age_years", value:"18"}` passes `checkCondition` with `[]`. `publishedNumbers` does not list it, so a rule deciding "18 or older" would release with no source.
* **Fix:** for `gt`/`gte`/`lt`/`lte` (ordered operators are allowed only on number, date or derived fields), treat a text value that is a finite, non-zero number as a number, using `canonicalValue`. Keep `eq`/`neq` text out (answer codes).
* **Test:** add a fail case: a rule with `gte "18"` is listed and refused.

### Minor (fix or list in the PR)
1. **Suite gaps that a broken walk would pass.** These mutants survived 23/23:
   * the walk skips `not.arg` (no number sits under `not` in the test data);
   * `eq`/`neq` are dropped from the compared set (no numeric `eq` in the test data);
   * k counts only numeric leaves. Build note 8 says "the suite proves it on IMM 5707" (0s included), but nothing in the suite does.
   * One small fixture covers all three: `not(lt x 2)`, `eq n 3`, and a `gt x 0` before a `gt x 5` that is then changed to 3.
2. **The validity cite can mask a changed number** (concept gap; flag to the tech lead).
   * Since 47b79213, `sourced_by` is checked before the entry (`:190`).
   * A validity rule moved from 6 to 12 months whose own quote still says "6 months" is `validity_cite` and passes silently (scratch probe: 0 problems). Before the fix the old entry caught it.
   * `validityProblems` does not tie the quote to the months. BR-4 and BR-6 conflict here. There are no validity rules in the demo data.
   * Record it as a tech lead question: either C6.4 re-asks for the cite when the months change, or the engine compares the record's value.
3. **`none_published: true` counts as answered** (`:177`), with no reason. This fits the agreed table today. If the tech lead accepts the ⚑ `none_published_reason`, narrow the `SourceEntry` type in PR 2a.
4. **Records drift.**
   * `concept.md` is byte-identical to `concept-draft.md`, and line 3 still says "It is not `concept.md`".
   * Build note 1 says "concept §5's example is updated in the build", but `concept.md:47,51` and both boards still read "Age in whole years". The engine produces "Age years".
   * `build-notes.md` and the PR body still say 21/21 "on c9904226" and do not mention the Devin fix (now 23/23).
5. **BR-2's wording overstates.** "Inserting a clause keeps the address" (`concept.md:26`) holds only for a clause on another field or operator. A same-field, same-operator clause inserted earlier shifts k. That is visible (listed as changed or missing), never silent. Say so in BR-2.

## 2. The test file
* The labels follow "C5.4 BR-n pass/fail …". There is a pass and a fail for BR-1, BR-2, BR-4, BR-5, BR-6 and M1, on the real c1-v3 plus small fixtures.
* **Mutants killed (15):** skipping document-line conditions (19/23), form-line conditions (16/23), gates, placements or `min_age`; positional k, k per field only, k never reset, no combination prefix; 0 kept, no canonical value, no changed check, `sourced_by` ignored, validity cite ignored, every fee sourced.
* **Mutants that survived (3):** see Minor 1. The fourth survivor (requiring a reason) is expected; see Minor 3.

## 3. The records
* Concept v2 answers each objection: B1 → BR-1; M1 → BR-7, §2; M2 → BR-11 ⚑; M3 → BR-2 ⚑; M4 → §6 Scaffolding and the PR split; m1–m9 taken (Decisions 1–3, BR-10, Sample note, no fee card, BR-4 validity, words, Reset, canonical value, §2 mapping).
* The 8 build discoveries are consistent with the code (discoveries 3, 4, 6 and 8 match `:14`, `:138`, `:151` and `:102`).
* **Not ready by WAY-OF-WORKING step 1:** `challenge.md` "Lead response" and "Agreement" are empty, the dates question is open, and the engine already uses the ⚑ M3 address. The PR body says so openly (label only after the tech lead's OK on the three ⚑ points), so there is no silent deviation. Even after MJ-1 is fixed, the label waits for that OK.
* **What the build notes should also flag to the tech lead:**
  * MJ-1 (text numbers, and that the save path does not type-check rule and line values);
  * Minor 2 (validity cite against a changed number);
  * numeric `in` lists are left out silently (none in the data);
  * a number only in words: `person.venezuelan_extended_passport_expiry` "plus 5 years" (`executable: false`, library-wide), which needs a source once it becomes executable.

## Engine score (journey-test rubric, reviewer's single score)
The rubric is applied to the engine's output (refusal messages and lists). A journey through the app is not applicable: no route, page or table exists yet.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 19 numbers on 17 items found and refused, each named |
| Next step obvious | 1 | Each sentence ends with the action (add a source, or mark None published) |
| Plain words | ½ | "Age years" against the concept's "Age in whole years"; a check's ~200-character message is used as its name (discoveries 1, 2) |
| Feedback and state | 1 | missing, changed, and already cited by the fee table or the validity cite |
| Correct data | ½ | MJ-1 (text numbers missed); Minor 2 |
| Error recovery | 1 | gte→gt and a changed value are listed again; an inserted clause keeps its entry |
| Accessibility and screen sizes | N/A | no screen (PR 2b) |
| Speed | 1 | 0.65 ms against ≤ 50 ms |
| Visual quality | N/A | no screen |
| Trust and sources | 1 | fee and validity records count only when fully cited; no AI |

**7 of 8 = 8.8/10.** No 0, but MJ-1 must be fixed before approval.

## Could not check
* The real `buildSnapshot` on a database: the API suite is PR 2a.
* Both boards: read as text only. `code/` (team mapping): Unverified. D17 and D20: stay with the founder.

**Verdict: Block.** To fix: MJ-1 (with its fail test). Then fix Minors 1–5 or list them in the PR, and update the build notes and PR body to 47b79213.

## Round 2: commit **c47044b8** (answers the review of 47b79213)
I reran everything at c47044b8: suite **28/28** (exit 0), `graph.mjs --check` exit 0, `count-any` 423 (same as the base).
* **MJ-1 fixed.** `source-register.ts:106-109`: numeric text on gt/gte/lt/lte is now a published number, canonicalised (`"18"` → `18`). Text on eq/neq stays an answer code. The fail check fails when the fix is reverted (27/28 on a scratch mutant). A second mutant that also counts text on eq turns the real-release count red (23/28), so codes like `"01"` stay out.
* **Minor 1 fixed.** All three earlier survivors now fail the suite: a number under `not`, dropping `eq`/`neq`, and k counting only numeric leaves (`case.funds_cad|gte|2`). Positional k, skipping document lines and the pre-Devin order still fail too: **8/8 mutants fail**.
* **Minors 2, 3 and the extra flags:** recorded for the tech lead in build notes 9–12, with recommendations. Nothing is built for them, which is right for part 1 (P-26).
* **Minor 4 fixed:** concept status is "v2, waiting for the tech lead's approval"; "Age years" in concept §4–§5 and both boards (no "Age in whole years" left); build notes say 28/28.
* **Minor 5 fixed:** BR-2 now says a same-field, same-operator clause inserted before a number shifts k and lists it again, never silently.
* **Still open, not a code finding:** the readiness conditions in WAY-OF-WORKING step 1 (the tech lead's OK on the three ⚑ points and Decisions 1–3; the dates question). The PR body already holds the label for that OK.
* Score: correct data rises to 1 → **8 of 8 applicable = 10/10** (accessibility and visual quality still N/A, no screen).

**Verdict (c47044b8): Approve** for the engine and records of part 1. No Blocker or Major is open. The label still waits for the tech lead's OK on the three ⚑ points, as the PR says.
