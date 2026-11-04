# Shared field scope and stable list entries: fresh challenge (C3.16, L-SA4)

**Challenger:** a fresh agent that did not draft the concept (screen-concept part B), 4 Nov. **Read:** `concept-draft.md`, `design/draft-field-scope.html`, `../rows.md` C3.16 and C1.3+C11.5, SA-1B-130, SA-1B-134 and ch. 9 SA-1B-260 / ch. 9 privacy in `domain/requirements-2026-11-02/…/SA-01B-content-pack-configurator_v2.1_2026-10-27.md`, P-239, P-251, P-316, `qa/BUGS.md` QA-152, and the code on this branch (main 9caa043b + records). Nothing was run apart from `ai-workers/tools/freshness.sh`. It stopped because `code/README-copies.md` is missing in this cloud copy, so the team-code lines that SA-01B cites (`country-pack-core.prisma`, `client-spine.prisma`) are **Unverified**. Values are **Sample**. Unconfirmed: no counsel.

## Verdict
**Build after these changes.** The vocabulary, the split and keeping the old enum values are sound. Part a as written does four things wrong:
* it needs an M2-hot file it does not name;
* it turns a household into a pseudo-person on every case;
* it changes R5 on every pinned case;
* its backfill breaks IMM 5476 on the Visitor visa release.

None of this needs a new screen. It needs a narrower back end (below).

## Objections

### Blockers
**B1. Part a needs `engine/render.ts` (M2-hot) and does not say so.** *Needed for the proof.* Fact, high.
* `render.ts:255` asks a placement `isFilingFact(p.fact, p) ? [FILING] : applicants`. It passes the placement, never the field's stored scope. A Household field placed `per_person` is therefore asked of each applicant, and its boxes go through `aboutOf` the same way (`engine/resolver.ts:84-88`).
* "Stored scope first" in `engine/resolver.ts` cannot reach render without a new argument from render. The concept lists render.ts only under b ("Preview").
* A new `repeats` value is no way out: it needs `api/src/studio.ts:648` (hot), which allows three values only.
* **Fix:** keep part a out of render.ts. `engine/runtime/case.ts` `caseView` folds render's per-applicant questions of a Household field into one question. `knownOf` (`case.ts:220`, the one builder used by forms, checklist, prepare and assessments) copies the household value into each member's key, the way `hasChildrenOf` does (`:240`), so boxes fill unchanged. Otherwise name render.ts for a hot-file approval.

**B2. A household subject that is a case participant becomes a person on every case.** *Needed for the proof.* Fact, high.
* The concept says "a household AnswerSubject" but not how a case finds it. Two ways, both broken:
  * As a `CaseParticipant`, it passes every per-person reader. `case.ts:267` drops only role `"case"` before `render`, so the household would get each applicant's forms, documents, fees and signers. About 60 role-`"case"` checks in 21 files would each need a household twin, `review-proposals.ts` (hot) among them.
    * *Example:* a Visitor visa family (principal, spouse, child) gets a fourth IMM 5257 "for" the household.
  * Not as a participant, every save is refused. `putAnswer` finds the subject among participants (`api/src/runtime.ts:274`) and answers 404 "That person is not on this case."
* **Fix** (the team's own default, SA-01B ch. 9 Q1 "subjects of their own kind … owned by the case's principal", spec lines 4724 and 4990):
  * an `AnswerSubject` with `subjectKind "household"` on the principal's party;
  * linked to the case by a new additive record `case_household(case_id unique, subject_id unique)`, never a `CaseParticipant`, created in the transaction of the first household answer;
  * one loader that adds its answers to the case's answers, for each caller of `knownOf`.
* No open case needs a backfill.

**B3. "The stored scope first, the prefix as fallback" changes R5 on every pinned case.** *Needed for the proof.* Fact, high.
* The stored scope is never chosen. It is derived from the prefix, CASE_LEVEL only for `case.*` (`engine/import.ts:45`, `api/src/proposals.ts:271`), and frozen into every release (`engine/snapshot.ts:196`). Read first, CLIENT_LEVEL turns:
  * `organisation.*` from organisation into person, so boxes owned by `representative` or `none` move (`resolver.ts:88` against the switch);
  * a `once_per_case` placement on a non-`case.` key into person, so `check_sh3_resolver.ts:66`, `:147` and `:156` fail;
  * an answer already stored on the case subject into one `runtime.ts:281-282` refuses to edit ("asked for a person").
* The "fallback" never runs, because `scope` is NOT NULL (`schema.prisma:655`).
* **Fix:** one reader, in a new M3-only file (`engine/field-scope.ts`):
  * CASE_LEVEL → filing (today only on `case.*`, so nothing moves);
  * HOUSEHOLD → household;
  * ORGANISATION → organisation;
  * CLIENT_LEVEL → today's R5 (`resolver.ts:63-66`, placement first).
* Only the new values carry meaning. Test: `check_sh3_resolver.ts` R5 lines pass unchanged.

**B4. Drop the `organisation.%` backfill.** *Needed for the proof.* Fact, high, except (i): medium-high, not run.
* (i) Postgres (18 here, `start.sh:8`) refuses a value added by `ADD VALUE` until it commits (55P04, "unsafe use of new value"). A Prisma migration file runs as one script, so an `UPDATE … 'ORGANISATION'` in the same file fails. The repo's own enum adds stand alone (`20261027150000_s4_form_library`).
* (ii) The backfill changes the scope of published fields. That contradicts the concept's own BR-2 and SA-1B-130 rule 4, and rule 6 maps CLIENT_LEVEL to **Person**.
* (iii) On the Visitor visa release, `organisation.name` is IMM 5476's **representative's firm** (`tests/qa/check_qa_vv_1102_firm_name.ts:1-5`, QA-152 open Major). Marking it Organisation with "never from a person" empties or mis-fills IMM 5476.
* (iv) `scope` is in the fingerprinted content (`snapshot.ts:40-50`, `:196`), so every combination using the field drifts from its release while M2 is open.
* **Fix:** add the values only (`ADD VALUE IF NOT EXISTS`, two lines, no backfill). Organisation scope is set by a person on a new field (part b), as rule 4 says.

### Majors
**M1. BR-3, the board and test -3 disagree, and none follows the team's rule.** *Needed for the proof.* Fact, high.
* The versions:
  * BR-3: "the first adult who answers owns it", read-only for the other adult;
  * board frame 2: an **"Edit for both"** button on the other adult;
  * test -3: "a second answer refused".
* The team (spec line 4949, SA1B-D65): "Household questions are asked once on the family link … read-only for the other adult". There is no first-answerer ownership.
* The app has one client per case (`runtime.ts:54` `clientActorId`), and "Send to" is not built. So "the other adult" is only the spouse's tab, filled by the same client.
* **Fix:**
  * one household question, in a "For the household" block of the case;
  * on each member's tab, read-only "Answered for the household by {who} on {date}" with "Change it in For the household" (no second edit button);
  * the officer edits it like any answer (append-only, `expectedId`);
  * a PUT of a household fact on a member's subject → 422 "This is asked once for the household, not for a person."

**M2. Test -5 (the organisation subject) duplicates C11.5 and collides with it.** *Needed for the proof.* Fact, high.
* The merged C1.3+C11.5 row creates the organisation subject (`Party` ORGANISATION + `AnswerSubject "organisation"` + `case_employer_link`, `rows.md:584-585`).
* It changes the same `engine/runtime/case.ts` (`knownOf`) and `api/src/runtime.ts` (refuse the save) as C3.16a.
* **Fix:** C11.5 owns -5. C3.16a leaves organisation resolution as today (B3's CLIENT_LEVEL rule) and names C11.5.

**M3. Test -4 proves nothing.** *Needed for the proof.* Fact, high.
* Every case opens a new `Party` and new subjects (`runtime.ts:103-106`), so **every** scope, person included, is asked again on a second case.
* **Fix:** keep BR-5 as named scaffolding. Change -4 to "a Filing field placed per person is asked once on the case and stored on the case subject". Per-filing ids stay with SH4 (P-246 (2)).

**M4. The enum names diverge from what the founder approved.** *Needed for the proof.*
* P-316 (2) says "Build as specified". SA-1B-130 rule 6 and §7 say the enum becomes `PERSON | HOUSEHOLD | FILING | ORGANISATION`.
* Keeping CLIENT_LEVEL and CASE_LEVEL is the right engineering (see What is sound), but it changes an approved SA-01B card. P-251's rule says that goes to the product owner, and the founder is the product owner (P-316).
* The reason given is too narrow (fact, high). Raw SQL with `'CLIENT_LEVEL'` sits in about 15 test files, not two, and the frozen releases keep the old spelling for good.
* **Fix:**
  * put the mapping in the one reader (B3);
  * name it in the concept as a retrofit mapping (team PERSON = CLIENT_LEVEL, FILING = CASE_LEVEL);
  * ask Q1.

**M5. Part a alone is scaffolding, not "Capability".** *Needed for the proof.* Judgment, high.
* Until part b, no product step can make a Household field: import and proposals write only CLIENT_LEVEL or CASE_LEVEL. So -3 must set `HOUSEHOLD` by SQL. P-322 (in the brief, `rows.md:33-35`) counts Works only through the product's own steps.
* **Fix:** in 6b, name the SQL-set Sample field as scaffolding. C3.16 scores Works only after b.

### Minors
* **m1.** *Needed for the proof.* "A published field" is a key with any PUBLISHED or RETIRED version. Refuse a scope change on a **new draft version** of that key too (`CanonicalField` versions with `supersedesId`, `schema.prisma:645-660`), and add that case to -2.
* **m2.** *Needed for the proof.* Copy:
  * "Until each application carries its own release" is jargon. Use "Today this is one answer per case."
  * The team's label is "Scope" (SA-1B-130 §3). "Asked about" is fine as our wording if the mapping is named.
* **m3.** *Needed for the proof.* Test -6 already passes as RT-9 (`tests/runtime/check_runtime_r1a.ts:110-122`: stable row, tombstone, answer kept). Cite it and add only "a correction keeps `rowKey`". Name as Not built: the id across cases, since each case has new subjects.
* **m4.** *Not built.* "Household" means everyone on the case, one household per case. That is a stand-in for PartyRelationship membership (P-251's design list). Name it, and keep SA-1B-130 edge 12: a member who does not apply still reads the value.
* **m5.** *Needed for the proof.* After part a, the hot contract (`contracts/resolver.ts:6-7, 86-91`, "Held; nothing produces them") is out of date until part b. Say so in the PR. `check_sh3_resolver.ts:121` stays true only if `subjectOf` is unchanged, which the B1 route keeps.

## What is sound
* **Keeping CLIENT_LEVEL and CASE_LEVEL and adding two values is sound** (fact, high):
  * the change is additive;
  * PG 18 allows `ADD VALUE`;
  * a released snapshot keeps the old spelling for good, so a read-side map is needed in any case (as `w110_channels` did for channels);
  * a rename would touch the hot `proposals.ts`, `library.tsx` (C3.15 is changing it), `import.ts` and about 15 SQL-seeding tests, for no gain in behaviour.
* The split matches `m3-guard.sh`. b's files are hot or should be treated as hot, and `schema.prisma` and new files are M3.
* `ClientFactRecord.rowKey` already is SA-1B-134's `entryId`:
  * it is the first version's id (`schema.prisma:1449-1450`);
  * removal inserts a tombstone (`runtime.ts:370-379`);
  * no column is needed, and rules 2–4 rightly go with C6.5's follow-up.
* Q3, "no Visitor visa field becomes Household now", keeps M2's release unchanged.
* `subjectKind` is a string, so no column change is needed (`schema.prisma:1405`).
* BR-5 names its scaffolding (P-33).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (`acceptance/C3.16.test.ts`) |
|---|---|---|---|---|
| Four stored values (a) | migration 1: `ADD VALUE IF NOT EXISTS 'HOUSEHOLD'`, `'ORGANISATION'`, no backfill; `schema.prisma` enum | none | B4 | after `migrate deploy` on a seeded copy: CLIENT/CASE counts unchanged; snapshots byte-equal |
| One scope reader (a) | new `engine/field-scope.ts` (new file, M3) | none | B3 precedence; mapping to the team's names | unit: four values plus legacy; `check_sh3_resolver.ts` R5 unchanged |
| Household subject (a) | `AnswerSubject "household"` on the principal's party; new `case_household` | `PUT …/answers/:subject/:field`: household fact only on the household subject, else 422 (`runtime.ts`) | BR-3 as M1 | -3a: asked once on principal, spouse and child; -3b: the member's PUT is 422 |
| Read by every member (a) | none | the case view in `case.ts` folds the question; `knownOf` copies the value | SA-1B-130 rule 3 | -3c: both adults' Sample form box reads the one value; spouse tab read-only "Answered for the household" |
| Filing (a) | none (FILING = "case") | none | BR-5 scaffolding | -4 as M3 |
| Organisation | C11.5 | C11.5 | none | moves to C11.5 (M2) |
| List ids (a) | `rowKey` (exists) | none | SA-1B-134 r1, r5 | -6 cites RT-9 plus a correction keeps `rowKey` |
| Choice and refusal (b, hot) | `CanonicalField.scope` | library: four-way choice; `library-changes.ts` 409 | BR-2 plus m1 | -1; -2 with a draft version of a published key |

## Questions for the founder
1. **Keep the old names CLIENT_LEVEL and CASE_LEVEL in the database, mapped to Person and Filing in one place, and record it as a change to SA-1B-130 rule 6?** *Recommend:* yes. Released snapshots carry the old names for good, and a rename touches M2's hot files for no gain in behaviour. *Else:* a rename migration after M2 at 55.
2. **Build Household at runtime now, on a Sample field in the test's own release?** L-SA4's "done when" names only organisation and filing, but P-316 (2) says "as specified". *Recommend:* yes, the narrow form above (household subject outside participants, no render change). *Else:* store and show the scope now, and resolve Household with the first real household field (M4).

## Lead response

## Agreement

## Build discoveries
