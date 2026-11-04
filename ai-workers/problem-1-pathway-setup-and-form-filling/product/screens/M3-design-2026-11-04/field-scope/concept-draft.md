# Shared field scope and stable list entries: concept (drafter, 4 Nov, r2 after the fresh challenge; tech lead's approval)

**Status:** r2. It takes in every Blocker and Major of `challenge.md`; the drafter's response is at the end. Board: `design/draft-field-scope.html` (r2).
**Row:** C3.16 (L-SA4; P-239, P-316 (2) "Build as specified"). SA-1B-130 (scopes), SA-1B-134 (stable list entries).
**Split:**
* **a**, runtime, M3-only: the stored scope is read in one place, and Household is asked once.
* **b**, M2-hot, after M2 at 55: the library's choice and the published-field refusal.

**C3.16 scores Works only after b.** Until then no product step can create a Household field, so a's test field is set by SQL as named scaffolding (P-322, P-33). **Organisation resolution is C11.5's** (the employer pre-fill), not this row's. Values are **Sample**.

## 1. Job and journey
* **Job:** the Super Admin says, once per shared field, whether it is about a person, a filing, a household or an organisation. On a case each fact is then asked and stored once at that level.
* **Persona:** the Super Admin (library); the case officer and the client see the effect.

## 2. Ten layers
| Layer | Exists (main 9caa043b) | New |
|---|---|---|
| Vocabulary | `studio/contracts/resolver.ts` `SCOPES`; `BUILT_SCOPES = [person, filing]`; household and organisation "Held (P-251)" | b: household and organisation move to built (hot file) |
| Stored | `FieldScope {CLIENT_LEVEL, CASE_LEVEL}`, NOT NULL, derived from the key prefix (`engine/import.ts`, `api/src/proposals.ts`) and frozen into every release (`engine/snapshot.ts`) | a: `ADD VALUE IF NOT EXISTS 'HOUSEHOLD'`, `'ORGANISATION'`, in a migration with **no backfill** (Postgres refuses a new enum value before it commits; and published fields never change scope) |
| Reader | R5 by prefix (`engine/resolver.ts` `scopeOf`) | a: one reader in a new `engine/field-scope.ts`: CASE_LEVEL → filing (today only `case.*`, so nothing moves) · HOUSEHOLD → household · ORGANISATION → organisation · CLIENT_LEVEL → today's R5. Only the new values carry new meaning |
| Household subject | none; one client per case (`runtime.ts` `clientActorId`) | a: an `AnswerSubject` with `subjectKind "household"` on the principal's party, linked by a new additive `case_household(case_id unique, subject_id unique)`, created with the first household answer. **Never a `CaseParticipant`**, so no per-person reader sees it |
| Asking once | `engine/render.ts` asks per applicant (M2-hot) | a: `engine/runtime/case.ts` `caseView` folds a Household field's per-applicant questions into one "For the household" question; `knownOf` copies the value into each member's key, as `hasChildrenOf` does, so boxes fill unchanged. **`render.ts` is not touched** |
| Library UI | "once per case" or "about a person" (`web/src/pages/library.tsx`) | b: a four-way choice; refusal on a published field |
| List ids | `ClientFactRecord.rowKey`, stable across versions | a: proven by test (SA-1B-134 rules 1 and 5) |
| Team names | SA-1B-130 rule 6: `PERSON · HOUSEHOLD · FILING · ORGANISATION` | retrofit mapping in the reader: PERSON = CLIENT_LEVEL, FILING = CASE_LEVEL (founder Q1) |

## 3. Business rules
* **BR-1** **Four scopes** (SA-1B-130):
  * **Person:** one answer per person.
  * **Filing:** one per filing (per case until SH4, BR-5).
  * **Household:** one per case household (e.g. the date of marriage, Sample).
  * **Organisation:** one per organisation, from the organisation subject (C11.5).
* **BR-2** **A published field's scope never changes.** A change needs a new field (SA-1B-130; the guarded change, P-253). That is part b.
* **BR-3** **Household questions are asked once** (SA1B-D65, team spec: "asked once on the family link … read-only for the other adult").
  * They sit in one **For the household** block on the case.
  * Each member's tab shows them read-only: "Answered for the household by {who} on {date} · Change it in For the household".
  * The case officer edits it like any answer (append-only, `expectedId`).
  * A save of a household fact on a member's subject answers 422: "This is asked once for the household, not for a person."
* **BR-4** **Stable list entries** (SA-1B-134 rules 1 and 5): an entry keeps its id across a correction and a removal (a tombstone, never a delete). Rules 2–4 go with C6.5's follow-up.
* **BR-5** **Filing scope is per case until SH4** (pin per filing, P-246 (2)): named scaffolding, shown in the help.

## 4. Layout
**Frame 1 (b, library):** in the shared field's panel, "Asked about", a radio group of four, each with a one-line example:
* Person: "passport number";
* Filing: "the date you sign this application";
* Household: "date of marriage";
* Organisation: "employer's legal name".

On a published field the group is read-only: "To change who this is about, create a new field."

**Frame 2 (a, case):**
* a **For the household** block above the people's tabs, with its questions;
* on Spouse A's tab, the read-only line and the link "Change it in For the household". There is no second edit button.

## 5. Copy
* Refusal (409, b): "A published field's scope cannot change. Create a new field."
* Member save (422, a): "This is asked once for the household, not for a person."
* Filing help: "One answer per application. Today this is one answer per case."

## 6. Contract and tests
**a (M3-only):**
* the migration (two `ADD VALUE` lines, no backfill) and `case_household`;
* new `engine/field-scope.ts`;
* modified `engine/resolver.ts` (calls the reader), `engine/runtime/case.ts` (`caseView` and `knownOf`), `api/src/runtime.ts` (the 422; the household subject created in the first answer's transaction).

**b (M2-hot):** `studio/contracts/resolver.ts`, `api/src/library-changes.ts`, `api/src/proposals.ts`, `engine/render.ts` (Preview only), `web/src/pages/library.tsx`.

**Tests** in a new `acceptance/C3.16.test.ts`:
* **-1 (b):** four scopes set and shown.
* **-2 (b):** published refusal, 409 with its words.
* **-3 (a):**
  * a Household field (Sample, set by SQL in the test's own release: named scaffolding) is asked once in For the household, and both adults' IMM boxes fill;
  * a save on Spouse A's subject answers 422;
  * a Visitor visa family case gets **no** extra person, form or fee.
* **-4 (a):**
  * a Filing field placed per person is asked once on the case and stored on the case subject;
  * a Person field is still asked per person.
* **-6 (a):** an entry id is kept across a correction and a tombstone.
* **The resolver's R5 lines** in `tests/check_sh3_resolver.ts` pass unchanged.
* **-5 (organisation)** is owned by C11.5's `acceptance/C11.5.test.ts`, which names C3.16.

## 6b. Capability or scaffolding
* **Capability:** after b, everything above.
* **Scaffolding:**
  * the SQL-set Household field in a's test;
  * filing scope per case until SH4.

  Both are named.

## 7. Questions
1. **(Founder) Keep CLIENT_LEVEL and CASE_LEVEL in the database, mapped to Person and Filing in one reader, and record it as a change to SA-1B-130 rule 6?** *Recommend:* yes. Released snapshots keep the old names for good, and a rename touches M2's hot files and about 15 test files for no change in behaviour. The alternative is a rename migration after M2 at 55.
2. **(Founder) Build Household at runtime now (part a), on a Sample field in the test's own release?** *Recommend:* yes, in the narrow form above: a household subject outside the participants, no render change. The alternative is to store and show the scope now, and resolve Household with the first real household field (M4).
3. **(Tech lead) Lanes.** *Recommend:* runtime takes a now; forms takes b after M2 at 55.

## Definition of ready
* **Test:** `acceptance/C3.16.test.ts`.
* **Row:** C3.16.
* **Decisions:** P-239, P-246 (2), P-253, P-316 (2); founder Q1 and Q2.
* **Approval:** by the tech lead after `challenge.md`.

## Drafter's response to the challenge (4 Nov)
* **B1:** accepted. The fold lives in `case.ts` and `render.ts` is untouched.
* **B2:** accepted. The household subject is on the principal's party and linked by `case_household`, never a participant.
* **B3:** accepted. One reader, and only the new values carry new meaning.
* **B4:** accepted. No backfill; the two `ADD VALUE` lines stand alone.
* **M1:** accepted. One For the household block, read-only elsewhere, 422 on a member.
* **M2:** accepted. Organisation goes to C11.5.
* **M3:** accepted. -4 is reworded.
* **M4:** accepted, as founder Q1.
* **M5:** accepted. Works only after b; the SQL field is named scaffolding.
* **Minors, all accepted:**
  * **m1:** the refusal also covers a new draft version of a published key (`supersedesId`), and -2 tests it.
  * **m2:** the help says "Today this is one answer per case". "Asked about" maps to the team's "Scope".
  * **m3:** -6 cites RT-9 (`tests/runtime/check_runtime_r1a.ts`) and adds only "a correction keeps `rowKey`". An id across cases is Not built.
  * **m4:** "household" means everyone on the case, a stand-in for PartyRelationship membership (named). A member who does not apply still reads the value (SA-1B-130 edge 12).
  * **m5:** part a's PR says that `contracts/resolver.ts`'s "Held" comment is out of date until b, and `subjectOf` is unchanged.
