# C3.16 Shared field scope and stable list entries: fresh challenge of concept r3

**Challenger:** a fresh agent that did not write r2 or r3 (skill screen-concept, part B), 5 Nov 2026.
**Read:**
* `concept.md` (r3); r2's `../M3-design-2026-11-04/field-scope/concept-draft.md` and its `challenge.md`;
* SA-1B-130 and SA-1B-134 in `domain/requirements-2026-11-02/…/SA-01B-content-pack-configurator_v2.1_2026-10-27.md`;
* C3.16, C4.8, C5.4 and C11.5 in `qa/CAPABILITIES.md`; L-SA4 in `BACKLOG.md`; QA-152 and QA-233 in `qa/BUGS.md`;
* P-239, P-251, P-294, P-316, P-319, P-322, P-332, P-335 in `DECISIONS.md`; `RULES.md` "Added 4 Nov"; `tools/m2-hot-files.txt`;
* the code on main 86b721eac (branch head 7b317dde3 adds only the concept), in the files the brief lists plus `engine/answer-keys.ts`, `engine/qd-conditions.ts`, `engine/import.ts`, `engine/runtime/preview.ts`, `api/src/form-part-placements.ts`, `api/src/studio.ts` (placeField), `api/src/core.ts` (revise) and `api/src/demo.ts` (the checkpoint loader).

**Ran (read-only):**
* SQL on `xr_studio_c316` (the six, with Visitor visa and the LMIA work permit set up from their forms) and on `xr_studio_c316f` (the suites' fixture).
* On port 4450: GET `/api/combinations/:id/review` and `/preview` for both combinations, and POST `…/pqr-picks/plan` with mode replay. That POST is a read: it plans the run, starts nothing, and writes the question list file to the copy's `p2/` folder.
* `ai-workers/tools/freshness.sh`: it stopped, because `code/README-copies.md` is missing in this cloud copy. So the team-code lines SA-01B cites are **Unverified**.

Nothing was reset, released or saved. Values are **Sample**. Legal points: Unconfirmed: no counsel.

## Verdict
**Build after these changes.** The core holds:
* the release carries a mark on each placement;
* values are stored on the case's own record;
* the stored enum only gains two new values, with no backfill.

Two things must change before any build:
* The tests ask for a release on the six, and none can be made there today (B1).
* "Household reads the case for every box" writes the parents' marriage date into a child's IMM 5257 (B2).

Six Majors are fixable inside the design. They need one more hot line, in `studio.ts`, and possibly one in `render.ts`.

## Blockers

**B1. No combination can be released on the six today, so the pack's real-case lines cannot pass.** *Needed for the proof.* Fact, high (except the C5.4 option at the end: medium, not run).
* **Claim in r3:** C3.16-2 refuses a change "on a field of a release made by C4.8's own steps on the six". C3.16-3 uses "a released case (Visitor visa)". C3.16-4 and C3.16-6 store values on a case. Only the LMIA work permit is called "not releasable yet".
* **Evidence:**
  * GET `/api/combinations/744c8d51…/review` (Visitor visa, port 4450) shows 3 errors: "No document line yet: a case on this combination would collect no document…", and "From age: 18 has no source entry" for IMM 5257 SCH1 and for IMM 5707. The LMIA work permit has the same two kinds of error.
  * C4.8's row says "On the six it is 7/12 since #868 … Submit refuses, 'No document line yet' … until **B82** (QA-233)".
  * QA-233 (open Major) says that once Visitor visa's checklist lines land through people's steps, Submit is refused for three conditions on facts that are not in the library.
* **The configured checkpoint is no way out.** Its loader releases each combination by submit, sign-off and release (`api/src/demo.ts:804-824`). After that every field is PUBLISHED, and BR-2 freezes the scope. So no product step can make a Household field on a released case there either.
* **Fix:**
  * Split the pack:
    * **(a) On the six:** the library steps (C3.16-1; and C3.16-2's 422, 403, 400, 401, 404 and stale-`expected` 409). Then the engine on each draft through Preview: asked once, the boxes read the one value, a child's box stays empty (B2).
    * **(b) The real-case lines:** 409 on a published field and on its new draft version, C3.16-3, -4, -5 on a case, and the `rowKey` correction on a case. These are WAIT lines naming B82 / QA-233. P-334 (6) says a WAIT line is never green, so C3.16 stays Partial until B82 lands.
  * The 409 may also run on the fixture's `wp.family` (fields PUBLISHED) as supporting evidence only.
  * Check one possible path before ruling it out. C5.4 is 27/27 on the six through Demo › "Start With an LMIA from its reviewed release" (`demo.ts:295-302`). `engine/import.ts:48-49` reuses fields that already exist. So a field set up from the forms first may still be DRAFT when that release is made. If so, that is today's only real-case path for Organisation and Filing.

**B2. "Household → the case" for every box writes the parents' marriage date into a child's IMM 5257.** *Needed for the proof.* Fact, high: today's result was measured; r3's follows from its own rule.
* **Evidence:**
  * The IMM 5257 box `MaritalStatus[0].SectionA[0].DateOfMarriage` is mapped to `relationship.current_union_start_date` with person `subject_spouse_or_partner` (SQL). On IMM 5710 the same fact is mapped with `form_subject`.
  * On `vv.single`, IMM 5257 is `each_applicant`, with up to 4 children (SQL on `combination_form` and `participants`).
  * Preview on 4450 for a principal, a spouse and a child shows today:
    * the principal's box reads the spouse's record;
    * the spouse's box reads the principal's record;
    * child-1's box resolves to nobody: "that person is not part of this combination; the form field stays blank".
  * r3 says `aboutOf`: "household → the case". That skips the box's `person` (`resolver.ts:89-97`), so child-1's box would read the couple's date.
* **Fix:**
  * A Household box reads the case's record only when the form's subject is the principal or the partner (their roles are known from `people` in `aboutOf`). Any other subject reads nothing, as today.
  * This also keeps a gain: a married applicant whose spouse is not on the case gets the date asked once and filled. Today that box is blank.
  * Add a pass and a fail line: the couple's two boxes read one value, and the child's box stays empty.

## Majors

**M1. A Household question's own condition is decided on the application. So the natural condition hides it for good, and without a condition every never-married applicant is asked a required "date of marriage".** *Needed for the proof.* Fact from the code, medium-high (not run).
* **Evidence:**
  * The IMM 5257 box's own rule is words only: "Only when marital status is Married (01) or Common-Law (03)" (`form_field_map.condition`). Render never reads it.
  * Today a never-married single applicant is not asked the date (Preview, single: the box resolves to nobody). With Household it is asked once and required (`render.ts:260`).
  * If the author adds a placement condition on marital status, `pushQ` decides it with the subject set to the case (`render.ts:239-241`). `evalCondition` then reads only the case's facts (`render.ts:38`; `resolver.ts:102-105`). The result is "cannot tell", so marital status is added as a deciding question of "The application" (`render.ts:244`, `:154`).
  * Saving that question is refused: "This is asked for a person, not for the application." (`runtime.ts:304-305`). So the date stays "hidden by a condition" forever.
  * No once-per-case placement carries a condition today on either copy (SQL: 0 rows), so this path has never run.
* **Fix**, either:
  * **(a) recommended:** one hot line at `render.ts:240`: a question asked once on the case decides its condition on the principal, as R3 already does for a case-level line (`resolver.ts:58`);
  * **(b) with no hot file:** BR-2 refuses Household, Filing or Organisation on a field whose placement condition reads a person's fact (422). The pack places the date as Optional (`case.ts:306`), and the PR says a never-married applicant is offered it.
  * Either way, add a test: a single, never-married applicant is not required to give the date.

**M2. Organisation on a field that a representative's box reads leaves a question nobody can answer.** *Needed for the proof.* Fact, high.
* **Evidence:**
  * r3 says "a representative's box keeps today's reading". Today's reading is the form's subject: `resolver.ts:88` returns `subject` before it looks at `entry.person`.
  * Preview on 4450 for the LMIA work permit: IMM 5476's "Name of firm or organization" boxes (person `representative`) resolve to the principal and to the spouse. That is QA-152, an open Major.
  * `organisation.name` is DRAFT on the six, so an author may mark it Organisation. Its representative boxes would still be asked of each person, while BR-4 refuses every save on a person ("…for the employer…"). The question is stuck.
  * On the fixture, `organisation.name` is IMM 1295's employer (person `none`) and IMM 5475/5476's firm (person `representative`) (SQL).
* **Fix:**
  * BR-2 refuses Household and Organisation on a field that any box maps with person `representative` (422: "A representative's form reads this field as the firm's own; a shared employer or household value would fill it. Create a separate field.").
  * Add a fail line on `organisation.name`.
  * Say plainly that QA-152 stays open and is not fixed here.

**M3. A placement can still be made per row after the scope is chosen.** *Needed for the proof.* Fact, high.
* **Evidence:**
  * BR-2's per-row check runs only on the new scope route.
  * The library field page's "Repeats" (`library.tsx:166`) saves through `placeField` (`studio.ts:653-661`, hot), which allows `per_row` for any field.
  * Render would then ask the fact once on the case (`isFilingFact`), while `putAnswer` demands a row (`runtime.ts:307`) on the case's record, which has no rows.
* **Fix:**
  * One line in `placeField` calls `field-scope.ts`'s pure check, with the same 422 words. M1 (b), if chosen, uses the same line.
  * Add it to the Q1 hot-file request, with a fail test.

**M4. A document stops supplying a Household or Organisation fact.** *Needed for the proof* (the LMIA's employer facts). Fact from the code, medium-high (on the six no document type supplies these facts yet).
* **Evidence:**
  * `documentFacts` keys suppliers by person (`sources.ts:42-49`, `documentSubjects`). A marked fact is looked up for "case": by render `docsFor` (`render.ts:99`), by `factSources` (`sources.ts:110`) and by Preview's `fromDocument`.
  * On the fixture, `job_offer_letter` and `copy_of_lmia_and_copy_of_employment_contract…` supply `organisation.name` (SQL).
  * Once the employer's name is marked, those documents no longer count:
    * Preview drops "a supported document can supply it";
    * the rules' source moves from DOCUMENT to CLIENT;
    * C6.5's documents-first intake would ask the fact again.
* **Fix:**
  * In `engine/sources.ts` `documentFacts` (not hot): for a marked fact, add every holder's suppliers under the case as well.
  * Add a test: a Sample document line on the principal that supplies the employer's name still covers it.

**M5. The Organisation stand-in is not named (P-33), and r2's M2 is reversed without saying so.** *Needed for the proof.* Judgment, high.
* **Evidence:**
  * SA-1B-130 rule 3 says Organisation facts live "on the employer's facts; never in a worker's file unless ExpatReady marks the field shareable in the pack" (SA1B-D111). `contracts/resolver.ts:99` says the same.
  * r3 stores the employer's name on the worker's case and fills the principal's forms. That is a fair stand-in, since IMM 5710 needs it on the worker's own form. But BR-5 names only "one employer per case = the principal's".
  * r2's accepted M2 moved Organisation to C11.5. r3 brings it back without saying why. The reason exists: C3.16's acceptance text and L-SA4 both name an organisation-scoped fact resolved on a case.
  * C11.5 also changes `case.ts` `knownOf` and `runtime.ts`, the files r3 changes.
* **Fix:**
  * In BR-5 and in the contract's R5 text, name the stand-in: "every Organisation fact is read on the principal's forms as if shareable". Mark as Not built: the shareable mark (L-SA5, M4) and the employer's own facts (C11.5).
  * State the reversal of r2's M2 and its reason.
  * Name the overlap with C11.5, so the two builds are done one after the other.

**M6. The household's read-only line on each member's part is dropped.** *Needed for the proof.* Fact, high.
* **Evidence:**
  * SA-1B-130 rule 3 says "another adult sees it read-only". Its §11 test: "when Client A's tab opens, then the date shows from the household record, read-only".
  * r2's challenge M1 asked for "Answered for the household by {who} on {date} · Change it in For the household" on each member's part. r2's concept accepted it.
  * r3 keeps one question, the 422 and "Read for: …", but has no line on the members' parts and no §11 test.
  * So r3's claim that it "keeps every r2 finding that still applies" is not true here.
* **Fix:** restore the read-only line in each member's part of the questionnaire (`case.ts` and `questionnaire.tsx`, neither hot), and the §11 test in C3.16-3 (on Preview until B82).

## Minors
* **m1. Filing on a person-prefixed key breaks answer keys, and three readers still use the prefix.** *Needed for the proof.* Fact, high.
  * `engine/answer-keys.ts:108` refuses `about "case"` for a `person.*` fact, while render reads that fact on the case. So no answer key can state it.
  * Three readers still decide by the key prefix:
    * `engine/qd-conditions.ts:202` (`askedOnly`);
    * `api/src/form-part-placements.ts:138` (`everyoneAnswers`);
    * `api/src/runtime.ts:345`.
  * **Fix:** route these through the reader (none is hot), or list them in the PR as known.
* **m2. BR-2 should also refuse a scope other than Person on two kinds of field.** *Needed for the proof.* Judgment, medium.
  * `representative.*` keys: they are filled from the firm record (`runtime.ts` `state()`, `representativeAnswers`).
  * The facts the engine reads per person by name: the date of birth (ages, a minor's signer) and `person.has_children`, which is worked out per person (`case.ts:241-252`). "Children's list" is a household fact in SA-1B-130, so an author may well try it.
  * Also name the Sample person-prefixed fact that C3.16-1 sets to Filing.
* **m3. Confirmation changes for a household answer.** Fact, high. A client's answer saved on the case's record counts as "the client's own" at once (`case.ts:60`). Today the spouse's copy waits as "answered by the principal" (P-72, P-78). That fits SA1B-D65 (one value, read-only for the other adult), but BR-4 should say so.
* **m4. The employer question is shown to staff only.** Fact, high. `isClientField` decides by prefix (`case.ts:24, 31`) and leaves out `organisation.*`, so the client never sees "About the employer". That is unchanged from today; say so in §3.
* **m5. The promised Organisation reason needs `render.ts`.** Fact, high.
  * BR-4 promises "Not built: an employer for each person (C11.5)". But when `aboutOf` returns nobody, render writes "that person is not part of this combination; the form field stays blank" (`render.ts:134`). Those are wrong words for a spouse who is on the case.
  * **Fix:** rewrite that detail in `case.ts` and Preview for a marked Organisation box, or drop the promise.
* **m6. C3.16-7 compares release snapshots on the six, which have none** (SQL: no `config_release` on the six; the fixture has `wp.family` v1). **Fix:** compare the draft fingerprint of each combination after the six's setup, and the fixture's release sha plus `matches_release`.
* **m7. Two test lines and a lock are missing.**
  * The 401 and 404 that BR-2 names have no test line.
  * The scope route should take the field's lock (`lockItem`, as `placeField` does), so a release and a scope change never pass each other.
  * Already handled: a change after Submit marks the submission stale (`studio.ts:445`), since the scope is fingerprinted.
* **m8. The saved Visitor visa question list.** Fact, high.
  * r3 is right on the code. `questionList` (`pqr-drafts.ts:73-87`) is a pure function of the draft snapshot, so nothing moves unless an author sets a scope.
  * Two facts to add to the PR:
    * On the forms copy (4450) the list is already `vv.single-e915b47071a0` (373 questions), not `ae2133b8a398` (365), because the LMIA setup shares sections. Saved replay there already falls back to the 2 Nov run `477759eb`. So in the pack's own copy (both set up) it has moved before any scope is set.
    * On the demo, a person who sets a scope on any Visitor visa field moves the list, and the committed C4.11 result `fc52039a` no longer matches.
  * The six with only Visitor visa set up was not run here: **Unverified**.
* **m9. Import drops a chosen scope.** *Not built.* `engine/import.ts:51` and `proposals.ts:277` derive the scope from the key prefix again, so a configuration imported with Household loses it. Not needed now; list it under Not built.
* **m10. P-332 holds the build.** *Process.* No new M3 work until M2 = 60; STATE shows 52/60. The definition of ready should say "build when M3 restarts" (P-332, P-336).
* **m11. RT-9 runs on a test's own case, not on the six or the checkpoint** (`tests/runtime/check_runtime_r1a.ts:110-126`). Cite it, but the pack's "a correction keeps `rowKey`" line needs a case: a WAIT line with B1.
* **m12. Team-code lines are Unverified:** `freshness.sh` stopped on the missing `code/README-copies.md`.

## What is sound
* **The mark on the release reaches the readers that matter.**
  * Every render reader gets the placement object: boxes (`render.ts:132`), deciders (`:154`, `:174`) and the section loop (`:260`).
  * So do `case-checklist.ts:130` and `programs.ts:20`.
  * `valueHolder` (eligibility gates, out-of-date) falls back to the case's value (`resolver.ts:113-117`).
  * PDF writing uses boxes frozen from render (`fill-case.ts:239-244`, `forms.ts:22-25`).
  * The coverage gate, `factSources` and Preview all go through `previewRender` or `render`.
  * The only gaps found are the ones above: M3 and m1 (prefix readers), M4 (documents), m4 (client field).
* **Existing fingerprints stay the same.**
  * The scope is already fingerprinted (`snapshot.ts:196`; hash at `:84-88`, `:224-227`).
  * A placement key added only when a field is marked leaves every unmarked placement as it serialises today.
  * On both copies CASE_LEVEL appears only on `case.*` keys (SQL: 0 others), so "Filing on a non-`case.` key" produces no mark today.
  * The release schemas allow extra placement keys (`released-configuration.v0.schema.json`, placements items have no `additionalProperties: false`).
* **Storing on the case's own record is sound, and simpler than r2's `case_household`.**
  * The case's record is already a participant with role "case", on the principal's party (`runtime.ts:103-106`). That is close to the team's "owned by the case's principal" default.
  * It is kept out of render's people (`case.ts:267`).
  * `putAnswer` already has the role check (`runtime.ts:304-305`).
  * No loader changes. SH4 can still tell Filing values from Household ones by the field's frozen scope.
* **The schema change is right.**
  * Two `ADD VALUE IF NOT EXISTS` lines, with no backfill, as r2's B4 asked.
  * BR-3: only the new values carry new meaning, as r2's B3 asked.
* **The author's choice can be reached and is frozen by release.**
  * Fields are DRAFT after setup (SQL: 165 CLIENT_LEVEL and 33 CASE_LEVEL, all DRAFT).
  * `revise` edits a DRAFT in place (`core.ts:147`).
  * Release publishes the field, and BR-2 then refuses any change.
* **Household fixes today's split.** Preview on 4450 shows the principal's IMM 5257 date reading the spouse's record and the other way round, so a couple can give two dates. IMM 5710 reads the same fact as `form_subject`. One household value serves both forms.
* **P-335 and P-319.**
  * "Organisation" is the employer a fact is about, held inside one case. No tenant, firm or workspace column is added.
  * The rules use roles and box persons, never a form or combination number.
* **Hot files.** Of the files r3 names, only `engine/snapshot.ts` and `studio/contracts/resolver.ts` are on `m2-hot-files.txt`. `main.ts`, `runtime.ts`, `case.ts`, `engine/resolver.ts`, `library.tsx`, `questionnaire.tsx` and `tests/check_sh3_resolver.ts` are not. This challenge adds `studio.ts` (M3) and, if option (a) is chosen, `render.ts` (M1).
* **BR-6.** `rowKey` already serves as SA-1B-134's entry id, and RT-9 covers the tombstone. Rules 2–4 rightly go with C6.5's follow-up.

## Answers to the concept's five questions
1. **Hot files: agree, plus one more.**
   * The conditional mark in `snapshot.ts` and `BUILT_SCOPES` / `HELD_SCOPES` in `contracts/resolver.ts` are additive and keep fingerprints (checked above).
   * Also approve one line in `studio.ts` `placeField` (M3).
   * Optionally approve `render.ts:240` (M1 (a)); otherwise take M1 (b).
   * The contract's type for `scopeOf`'s placement (`contracts/resolver.ts:165`) and the R5 and organisation text (`:33-36`, `:99`) change in the same file.
2. **Storage on the case's record: agree.** No new table, subject or loader, and SH4 and C11.5 stay open (see What is sound). Add m3's confirmation note.
3. **Organisation proof on Preview: disagree that it counts.**
   * Preview is not "on a case" (the acceptance text). P-322 counts a later step only on a real case built by product steps, on the configured checkpoint.
   * The checkpoint's fields are already published, so it cannot be used either (B1).
   * Use Preview as build evidence. Keep C3.16 Partial until B82 (QA-233) or the C5.4 path (B1) gives a real case. Write the real-case lines now as WAIT lines.
4. **Names: agree with keeping the old values, mapped in one reader; disagree on who rules.** It changes an approved SA-01B card. P-251's rule, word for word: "A P-decision that changes an approved SA1B decision needs me". Under P-316 the founder is that product owner. P-294 lets the tech lead rule only what decisions already settle. So it is one founder question. *Recommend:* yes, keep CLIENT_LEVEL and CASE_LEVEL, recorded for SA-1B-130 rule 6.
5. **One PR in the forms lane: agree.** It needs the breaker (schema, P-278) and the tech lead's read of the migration. It starts only when M3 restarts (P-332, m10).

## Lead response

## Agreement

## Build discoveries
