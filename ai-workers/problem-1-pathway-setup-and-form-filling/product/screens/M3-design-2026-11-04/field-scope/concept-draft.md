# Shared field scope and stable list entries: concept (drafter, 4 Nov; tech lead's approval after a fresh challenge)

**Status:** draft. Board: `design/draft-field-scope.html`. **Row:** C3.16 (L-SA4; P-239, P-316 (2) "Build as specified"). SA-1B-130 (scopes) and SA-1B-134 (stable list entries).
**Split:** part **a**, runtime resolution, is M3-only. Part **b**, the library's choice and the published-field refusal, uses M2-hot files and waits for M2 at 55. This concept covers both, so b is ready when M2 lands. Values on the board are **Sample**.

## 1. Job and journey
* **Job:** the Super Admin says, once per shared field, whether it is about a **person**, a **filing**, a **household** or an **organisation**. On a case each fact is then asked and stored once at that level, never once per person by accident.
* **Persona:** the Super Admin (library); the case officer sees the effect.

## 2. Ten layers
| Layer | Exists (main 9caa043b) | New |
|---|---|---|
| Vocabulary | `studio/contracts/resolver.ts` `SCOPES`, with `BUILT_SCOPES = [person, filing]` and household and organisation marked "Held (P-251)" | a: none. b: household and organisation move to built (hot file) |
| Stored | enum `FieldScope {CLIENT_LEVEL, CASE_LEVEL}`; the release snapshot carries `scope` | a: enum values HOUSEHOLD, ORGANISATION (additive), backfill `organisation.%` |
| Resolution | by key prefix (R5, `engine/resolver.ts` `scopeOf`) | a: the stored scope first, the prefix as fallback; a household subject on a case |
| Library UI | "once per case" or "about a person" (`web/src/pages/library.tsx`) | b: a four-way choice; refusal on a published field |
| List ids | `ClientFactRecord.rowKey`, stable across versions | a: proven by test (SA-1B-134 rules 1 and 5) |

## 3. Business rules
* **BR-1** **Four scopes** (SA-1B-130):
  * **Person:** one answer per person.
  * **Filing:** one per filing.
  * **Household:** one per household on the case, shared by its adults; e.g. the date of marriage (Sample).
  * **Organisation:** one per organisation, from the organisation subject, never from a person.
* **BR-2** **A published field's scope never changes.** A change needs a new field (SA-1B-130; the guarded change, P-253).
* **BR-3** **A household fact is asked once:** the first adult who answers owns it, and the other adult sees it read-only with who answered. Changing it is one change for both.
* **BR-4** **Stable list entries** (SA-1B-134 rules 1 and 5): an entry keeps its id across a correction and a removal (a tombstone, never a delete). Rules 2–4 (identity fields; entries supplied by a document) go with C6.5's follow-up.
* **BR-5** **Filing scope is per case until SH4** (pin per filing, P-246 (2)). Until then "once per filing" is proven across two cases, and the gap is named in the UI help.

## 4. Layout (b, library; frame 1)
* In the shared field's panel: **"Asked about"**, a radio group of four, each with a one-line example:
  * Person: "passport number";
  * Filing: "the date you sign this application";
  * Household: "date of marriage";
  * Organisation: "employer's legal name".
* On a published field the group is read-only, with "To change who this is about, create a new field."
* **Case side** (a; frame 2): a household fact on the second adult shows "Answered for the household by {name} on {date}" and an Edit that changes it for both.

## 5. Copy
* Refusal (409): "A published field's scope cannot change. Create a new field."
* Help for Filing: "One answer per application. Until each application carries its own release, this is one answer per case."

## 6. Contract and tests
**a (M3-only):**
* migration `ALTER TYPE "FieldScope" ADD VALUE 'HOUSEHOLD'`, `ADD VALUE 'ORGANISATION'`;
* CLIENT_LEVEL and CASE_LEVEL kept for Person and Filing (renaming would break the hot `proposals.ts` and M2's raw SQL in `acceptance/C3.13`, `C3.15`);
* `engine/resolver.ts`, `engine/runtime/case.ts`, `api/src/runtime.ts` (household `AnswerSubject`, `subjectKind` is a string).

**b (M2-hot):** `studio/contracts/resolver.ts`, `api/src/library-changes.ts`, `api/src/proposals.ts`, `engine/render.ts`, `web/src/pages/library.tsx`.

**Tests** in new `acceptance/C3.16.test.ts`:
* -1 (b): four scopes set and shown;
* -2 (b): published refusal, 409 with the words;
* -3 (a): household asked once, read-only for the other adult / a second answer refused;
* -4 (a): filing fact asked again on a second case;
* -5 (a): organisation resolves from the organisation subject / never from a person;
* -6 (a): entry id kept across a correction and a tombstone.

## 6b. Capability or scaffolding
* **Capability:** all of the above.
* **Scaffolding:** filing scope per case until SH4 (BR-5), named.

## 7. Questions
1. **(Tech lead) Lanes.** *Recommend:* runtime takes a now; forms takes b after M2 at 55.
2. **(Tech lead) SA-1B-134 rules 2–4.** *Recommend:* with C6.5's follow-up, not here.
3. **(Founder) Which shared fields are Household in the Visitor visa sample?** *Recommend:* none on the Visitor visa release now, so the release does not change while M2 is open. Prove it with a Sample field in the test's own release.

## Definition of ready
* Test: `acceptance/C3.16.test.ts`.
* Row: C3.16.
* Decisions: P-239, P-246 (2), P-253, P-316 (2).
* Approval by the tech lead after `challenge.md`.
