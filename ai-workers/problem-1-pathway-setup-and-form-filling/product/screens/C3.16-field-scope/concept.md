# C3.16 Shared field scope and stable list entries: concept r3 (forms lane, 5 Nov)

**Status:** r3, for the tech lead's approval after one fresh challenge (`challenge.md`, P-223 (4)). It replaces r2 (`../M3-design-2026-11-04/field-scope/concept-draft.md`, never approved) and keeps every finding of r2's challenge that still applies. Read on main 86b721eac.
**Capability:** C3.16 (L-SA4; P-239, P-316 (2) "Build as specified"; SA-1B-130 scopes, SA-1B-134 stable list entries). Acceptance: "a shared field carries a scope (person · filing · household · organisation) and list entries keep stable ids; an organisation- or filing-scoped fact resolves once per organisation or filing on a case".
**Not a new screen.** One choice in the library's field panel and one tag on the case questionnaire. Values are **Sample**; legal points Unconfirmed: no counsel.

## 1. Job, and what is true on main today
* **Job:** the author says once, per shared field, whom it is about: a person, the application (filing), the household, or the employer (organisation). A case then asks it once at that level, and every form that reads it gets the one value.
* **Today:** the stored `FieldScope` has two values (CLIENT_LEVEL, CASE_LEVEL), derived from the key prefix and never read. The runtime decides by prefix (R5, `engine/resolver.ts` `scopeOf`): `case.*` or a `once_per_case` placement is asked once; everything else is asked per person. The library shows a pill only ("once per case" / "about a person"). `contracts/resolver.ts` still says household and organisation are "Held (P-251)"; P-316 (2) lifted that hold.
* **Measured on a fresh copy of the six (forms lane, port 4450):** after Reset, no shared field exists. Fields appear as **DRAFT** when an author sets a combination up from its forms (the people's steps in `acceptance/lib/pack2.ts`). After that:
  * Visitor visa has `relationship.current_union_start_date` ("Date" of marriage or common-law union on IMM 5257, read through the partner). Today the date is asked about each partner, so a couple can give two different dates. This is the household example in SA-1B-130 rule 2.
  * The work permit with an LMIA has `organisation.employer_name` and `organisation.employer_address` (IMM 5710, "Name of Employer").
  * Neither field is published, so scope can still be chosen (SA-1B-130 rule 4).
* **Trap (r2 challenge B4, QA-152):** on the suites' fixture, `organisation.name` is both the employer (IMM 1295) and the representative's firm (IMM 5476). So nothing already stored is re-scoped, and an Organisation fact never fills a representative's box.

## 2. Business rules
* **BR-1 Four scopes** (SA-1B-130 rule 1). Library words (the team's label is "Scope"):
  * Person, "about each person";
  * Filing, "once for the application";
  * Household, "once for the household";
  * Organisation, "once for the employer".
  * Stored as CLIENT_LEVEL, CASE_LEVEL, HOUSEHOLD, ORGANISATION. The mapping to the team's PERSON and FILING lives in one reader (Q4).
* **BR-2 Scope is chosen only before the field is first published** (rule 4).
  * Any PUBLISHED, SUPERSEDED or RETIRED version of the key, or a draft that supersedes one, refuses the change with 409: "A published field's scope cannot change. Create a new field."
  * Person on a `case.` key is refused with 422: "This is about the application: choose Filing, Household or Organisation."
  * Household, Filing or Organisation on a field placed per row in any combination is refused with 422: "A list is asked per person today; a household or employer list is not built."
  * Only the author changes it: the approver gets 403, nobody gets 401, an unknown key 404, a stale `expected` 409. Each change is audited. It goes out with the next release (scope is already in the release fingerprint, `engine/snapshot.ts`).
* **BR-3 Only the two new values, plus Filing set by hand, change behaviour** (r2 challenge B3):
  * CLIENT_LEVEL keeps today's R5 rule;
  * CASE_LEVEL on a `case.` key is today's behaviour.
  * Nothing that is stored or released today moves.
* **BR-4 Asked once, read by everyone it concerns:**
  * **Filing and Household:** asked once in the application's sections, tagged "For the household" for Household. One answer is stored on the case's own record (the existing `"case"` subject). Every member's form box reads it (SA-1B-130 rule 3; edge 12: a member who does not apply still reads it).
  * **Organisation:** asked once, tagged "About the employer". It fills only the principal applicant's forms (the worker the employer is linked to). Another person's box reading it stays empty, with the reason "Not built: an employer for each person (C11.5)". A representative's box keeps today's reading (QA-152).
  * **Saves:** a save of one of these facts on a person's record is refused with 422: "This is asked once for the household, not for a person." (or "…for the employer…", or the existing "…for the application…").
* **BR-5 Named stand-ins (P-33):**
  * one household per case = everyone on the case (stands in for PartyRelationship membership);
  * one employer per case = the principal's (stands in for C11.5's employer link, SA-1B-130 rule 3 "on the employer's facts");
  * Filing = once per case until SH4 pins each filing.
* **BR-6 Stable list entries** (SA-1B-134 rules 1 and 5): an entry keeps its id (`ClientFactRecord.rowKey`, the first version's id) across a correction and a removal (a tombstone; nothing is deleted). Already built: the pack cites RT-9 and adds "a correction keeps `rowKey`". Rules 2–4 (identity fields, a document supplies an entry) go with C6.5's follow-up. An id across cases is Not built.

## 3. Layout and copy (1440 px, the team's brand)
* **Library › field panel:** "Asked about", a radio group of four, each with a Sample example:
  * Person, "passport number";
  * Filing, "the date you sign this application";
  * Household, "date of marriage";
  * Organisation, "employer's legal name".
  * On a published field the group is read-only, with the words of BR-2. The pill under the title shows the same four words.
* **Case questionnaire:** a Household or Organisation question sits in the application's own sections. It carries a tag ("For the household" or "About the employer") and a line naming who it is read for ("Read for: Principal applicant, Spouse or partner"). There is no second edit anywhere.

## 4. How it is built: one door, M3-only files, two hot lines
| Part | File | Change |
|---|---|---|
| Stored values | `prisma/schema.prisma` + a migration | two lines, `ALTER TYPE "FieldScope" ADD VALUE IF NOT EXISTS 'HOUSEHOLD'`, `'ORGANISATION'`; **no backfill, no new table, no new column** (r2 B4) |
| The one reader | new `engine/field-scope.ts` | stored scope → a mark (`household`, `organisation`, or `filing` for CASE_LEVEL on a non-`case.` key), else none; the four library words; the BR-2 checks (pure) |
| Mark on release | `engine/snapshot.ts` (**hot**, one line) | a placement gets `scope: <mark>` only when its field has a mark. No combination today has one, so **every existing snapshot and fingerprint is byte-identical** (tested) |
| Resolver | `engine/resolver.ts` | `scopeOf` reads the placement's mark first. `isFilingFact` (render's "ask once on the case") is true for filing, household and a marked organisation. `aboutOf`: household → the case; marked organisation → the case for the principal's forms, none for others, a representative's box unchanged |
| Library route | new `api/src/field-scope.ts` (`PUT /library/fields/:key/scope {scope, expected}`), registered in `api/src/main.ts` | BR-2 refusals; audit |
| Save rule | `api/src/runtime.ts` | the once-on-the-case check uses the reader (BR-4 words) |
| Case view | `engine/runtime/case.ts` | each question carries its scope tag and "read for" names |
| Screens | `web/src/pages/library.tsx`, `web/src/runtime/questionnaire.tsx` | the radio group; the tag |
| Contract | `contracts/resolver.ts` (**hot**) | `BUILT_SCOPES` becomes all four; `HELD_SCOPES` goes. `tests/check_sh3_resolver.ts:122` follows; `:124` stays true (`subjectOf` unchanged) |

* **Why the mark sits on the release:** `render.ts` (hot, untouched) and its eight callers read placements only. With the mark on the placement, every caller sees the same scope: the case, Preview, the SQR tab, the coverage gate, form filling, checklists and answer keys. The alternative, patching each caller, misses one sooner or later and touches the hot `studio.ts`.
* **Off-limits and untouched:**
  * `api/src/demo.ts`, `render.ts`, `proposals.ts`, `fact-sources.ts`, every `library-*` file;
  * no change to any placed question or label;
  * **no change to the demo data**: nothing sets a scope unless an author does.
* **The saved question list `vv.single-ae2133b8a398` does not move on main or on the demo.** It moves only in the pack's own fresh copy, where the pack sets Household on Visitor visa's union date: that fact's role changes from the two partners to "The application". I am saying so here first, as the brief asks.
* **Inside P-335 (no multi-tenant work):** "Organisation" here is the employer a fact is about, the party a work permit names, held inside one case. It is not a tenant, firm or workspace. No workspace, firm or tenant column is added. There is no row-level security and no change to who can see which firm's data, and no two-firm check changes. Values never leave the case they were entered on.

## 5. Tests: new `acceptance/C3.16.test.ts`, on a fresh copy of the six (P-322), through people's steps
* **C3.16-1:** after Visitor visa and the LMIA work permit are set up from their forms (pack2 helpers), the author sets and reads back:
  * Household on "Current Union Start Date";
  * Organisation on "Employer Name";
  * Filing on one person-prefixed Sample fact.
* **C3.16-2 (fail):** each BR-2 refusal:
  * 409 on a field of a release made by C4.8's own steps on the six, and on a new draft version of it;
  * 422 for Person on a `case.` key, and for Household on a field placed per row;
  * 403 for the approver, 400 for an unknown scope, 409 for a stale `expected`.
* **C3.16-3, Household on a released case (Visitor visa):**
  * a principal and spouse case asks the date once;
  * it is stored once, on the case's record;
  * both people's IMM 5257 boxes read it;
  * a save on the spouse's record is 422 with BR-4's words;
  * there is no extra person, form or fee.
* **C3.16-4, Filing:** the Filing-scoped fact is asked once and stored on the case's record; a Person fact is still asked per person.
* **C3.16-5, Organisation:** the LMIA work permit cannot be released on the six yet (its submit lists missing documents and field maps, owned by other capabilities). So on the six the proof is the engine's simulated case (Preview, the same case view):
  * the employer name is asked once;
  * it fills the Worker's IMM 5710 box, not the spouse's;
  * a representative's box keeps its own value.
  * Q3 asks whether this counts.
* **C3.16-6:** RT-9 cited, plus "a correction keeps `rowKey`".
* **C3.16-7 (fail):** with no scope set, every combination's release snapshot on the six and on the fixture is byte-identical to main's. `check_sh3_resolver.ts` R5 lines pass unchanged.
* **Also:** the M2 packs no worse than main; a walk at 1440 px (library choice, release, the case asking once).

## 6. Questions for the tech lead (each with my recommendation)
1. **Hot files:** approve one line in `engine/snapshot.ts` (the conditional mark) and `BUILT_SCOPES`/`HELD_SCOPES` in `contracts/resolver.ts`? *Recommend: yes.* Both are additive, and existing snapshots stay byte-identical. The alternative (patching render's callers) touches the hot `studio.ts` and risks two answers for one fact.
2. **Storage:** household and organisation values on the case's own record (the existing `"case"` subject), not r2's `case_household` table and new subjects? *Recommend: yes.*
   * No new table, no new subject, and no change to the six places that load a case's answers.
   * The scope stays on the field, so SH4 can later move only Filing values to each filing, and C11.5 can read organisation values from the employer's case.
3. **Organisation proof:** count C3.16-5 on Preview's simulated case on the six, with the real-case line added when the LMIA work permit can be released? *Recommend: yes,* named in the PR as the one line not yet on a real case. *Else:* C3.16 stays Partial until that combination releases.
4. **Names:** keep CLIENT_LEVEL and CASE_LEVEL stored, mapped to the team's PERSON and FILING in the one reader, recorded as a change to SA-1B-130 rule 6 at the next SA-01B log update (r2 founder Q1)? *Recommend: yes.* Released snapshots keep the old spelling for good. Yours to rule under P-294, or to the founder.
5. **One PR in the forms lane** (r2's runtime/forms split is gone, since the hot need shrank to two lines)? *Recommend: yes.* The migration means the breaker runs and you read the diff.

## Definition of ready
Test: `acceptance/C3.16.test.ts` (above) · Decisions: P-239, P-316 (2), P-246 (2), P-253, P-322, P-335 · Approval: the tech lead, after `challenge.md` · Cost: US$0, live AI off.
