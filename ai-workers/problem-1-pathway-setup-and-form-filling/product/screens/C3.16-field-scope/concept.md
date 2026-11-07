# C3.16 Shared field scope and stable list entries: concept r4 (forms lane, 5 Nov)

**Status:** r4, for the tech lead's approval. It takes in every finding of the fresh challenge of r3 (`challenge.md`, P-223 (4)); the response is at the end. It replaces r2 (`../M3-design-2026-11-04/field-scope/concept-draft.md`, never approved) and keeps every finding of r2's challenge that still applies. Read on main 86b721eac.
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
  * Household, Filing or Organisation on a field placed per row in any combination is refused with 422: "A list is asked per person today; a household or employer list is not built." A later per-row placement of a field that already has one of these scopes is refused the same way (challenge M3: one line in the hot `placeField`).
  * **Filing is the `case.` keys only** (challenge m1). Filing on another key is refused with 422: "Not built: a person's fact asked once for the application. Use a `case.` fact." Answer keys and three other readers still decide by the `case.` prefix, so this is the honest limit.
  * Household or Organisation is refused with 422 on these fields:
    * a field a representative's box reads (challenge M2, QA-152): "A representative's box reads this field, so it stays about each person";
    * a placement whose condition reads a person's answer (challenge M1): "A household question cannot depend on one person's answer yet";
    * `representative.*` keys, date of birth and `person.has_children` (challenge m2).
  * Only the author changes it: the approver gets 403, nobody gets 401, an unknown key 404, a stale `expected` 409. Each change is audited. It goes out with the next release (scope is already in the release fingerprint, `engine/snapshot.ts`).
* **BR-3 Only the two new values, plus Filing set by hand, change behaviour** (r2 challenge B3):
  * CLIENT_LEVEL keeps today's R5 rule;
  * CASE_LEVEL on a `case.` key is today's behaviour.
  * Nothing that is stored or released today moves.
* **BR-4 Asked once, read by everyone it concerns:**
  * **Filing:** as today (`case.` keys).
  * **Household:** asked once in the application's sections, tagged "For the household". One answer is stored on the case's own record (the existing `"case"` subject).
    * A box reads the one value **only where today's reading finds a person on the case** (challenge B2). A child's IMM 5257 box "date of the union of the subject's spouse" finds nobody today and stays blank, so a child never gets the parents' marriage date.
    * Each member's own part shows it read-only: "Answered for the household by {who} on {date} · Change it in For the household" (SA-1B-130 rule 3 and its §11 test; challenge M6).
    * It is confirmed like an application fact (once, as the client's own), not once per partner (challenge m3).
  * **Organisation:** asked once, tagged "About the employer". It fills only the principal applicant's forms (the worker the employer is linked to). Another person's box stays empty, in render's own words (challenge m5). A representative's box can never read it (BR-2). The question is the officer's, as for every `organisation.` fact today (challenge m4).
  * **Documents:** a document that supplies the fact still counts for a household or employer fact. For a household fact that is any member's document; for an employer fact, the principal's (challenge M4, `engine/sources.ts`).
  * **Saves:** a save of one of these facts on a person's record is refused with 422: "This is asked once for the household, not for a person." (or "…for the employer…", or the existing "…for the application…").
* **BR-5 Named stand-ins (P-33):**
  * one household per case = everyone on the case (stands in for PartyRelationship membership);
  * one employer per case = the principal's. SA-1B-130 rule 3 keeps employer facts "on the employer's facts; never in a worker's file unless … shareable". Here they sit on the worker's case until the employer link and the shareable mark arrive (L-SA5, M4) (challenge M5). This reverses r2's M2 ("organisation goes to C11.5") on purpose. #1051 (C1.3 + C11.5, employer case link) **copies** employer facts in as ordinary answers. For a field with the Organisation scope, it writes them where C3.16's one reader says, the case's own record, so there is one place for both;
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

## 4. How it is built: one door, M3-only files, three hot lines
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
| Placing a field | `api/src/studio.ts` `placeField` (**hot**, one line) | refuses a per-row placement of a field with a non-Person scope (M3) |
| Documents | `engine/sources.ts` | a household or employer fact's suppliers come from any member's, or the principal's, documents (M4) |
| Contract | `contracts/resolver.ts` (**hot**) | `BUILT_SCOPES` becomes all four; `HELD_SCOPES` goes. `tests/check_sh3_resolver.ts:122` follows; `:124` stays true (`subjectOf` unchanged) |

* **Why the mark sits on the release:** `render.ts` (hot, untouched) and its eight callers read placements only. With the mark on the placement, every caller sees the same scope: the case, Preview, the SQR tab, the coverage gate, form filling, checklists and answer keys. The alternative, patching each caller, misses one sooner or later and touches more of the hot `studio.ts`.
* **Off-limits and untouched:**
  * `api/src/demo.ts`, `render.ts`, `proposals.ts`, `fact-sources.ts`, every `library-*` file;
  * no change to any placed question or label;
  * **no change to the demo data**: nothing sets a scope unless an author does.
* **Hot lines (r4):** `engine/snapshot.ts` (one line), `contracts/resolver.ts` (the scope lists), and `api/src/studio.ts` `placeField` (one refusal line, challenge M3). `render.ts` stays untouched because conditions are refused instead (M1). Plus `engine/sources.ts` (not hot) for documents (M4).
* **The saved Visitor visa question list (say-so-first, the brief).** This PR changes no placed question or label and no demo data, so it moves no list on main or on the demo by itself. Two facts I measured or was shown:
  * Main's own list on a fresh copy of the six is already `vv.single-e915b47071a0` (373 questions), not `ae2133b8a398` (365). That drift comes from main, not from this PR (challenge m8, qa to confirm).
  * **Once this is built, an author who sets Household (or any scope) on a Visitor visa field on the demo moves that list.** The fact's role becomes "The application", so the committed C4.11 conditions run `…-83a49fd2` and the C4.7 picks run `…-fc52039a` would stop replaying for Visitor visa. The pack does this only on its own fresh copy, never on the demo. Q6 asks how to protect the demo.
* **Inside P-335 (no multi-tenant work):** "Organisation" here is the employer a fact is about, the party a work permit names, held inside one case. It is not a tenant, firm or workspace. No workspace, firm or tenant column is added. There is no row-level security and no change to who can see which firm's data, and no two-firm check changes. Values never leave the case they were entered on.

## 5. Tests: new `acceptance/C3.16.test.ts`, through people's steps (P-322)
**Where each line can run today (challenge B1, measured):**
* No combination on the six can be released yet with a field still open to a scope:
  * Visitor visa waits for B82 (QA-233; C4.8 is 7/12 on the six);
  * the LMIA work permit set up from its forms lacks documents and field maps (owned by other capabilities);
  * Demo › Start With an LMIA loads its 164 fields already published, as do the configured checkpoint's releases.
* So the pack has two parts:
  * **Six part (runs now):** -1, -2, -5 Preview and -7.
  * **Case part:** -3, -4, -6 run on the six once Visitor visa releases there. Until then they run on the suites' fixture, on a release whose scope a test sets in SQL. That is named scaffolding (P-33): a test proving the engine, never counted as Works.
* **C3.16 is claimed Partial in this PR, not Works.** It becomes Works when the case part runs on the six (after B82) and qa's gate A passes.

**Lines:**
* **C3.16-1 (six):** after Visitor visa and the LMIA work permit are set up from their forms (pack2 helpers), the author sets and reads back:
  * Household on "Current Union Start Date" (Visitor visa; its placement has no condition, measured);
  * Organisation on "Employer Name" (the LMIA work permit, IMM 5710, no representative box);
  * the library shows the four words, and a `case.` field shows Filing.
* **C3.16-2 (six, fail):** each BR-2 refusal, with its words:
  * 409 on a published field and on a new draft version of it (Demo › Start With an LMIA gives published fields on the six);
  * 422 for Person on a `case.` key, Filing on another key, Household on a per-row placement and on a field a representative box reads, a conditioned placement, and `representative.*`, date of birth and `person.has_children`;
  * 422 for a per-row placement made after the scope is set;
  * 403 for the approver, 401 for nobody, 404 for an unknown key, 400 for an unknown scope, 409 for a stale `expected`, and two saves at once giving one (the route locks the field row, m7).
* **C3.16-3 (case, Household):**
  * a principal and spouse case asks the date once, stores it once on the case's record, and both adults' IMM 5257 boxes read it;
  * a child's box stays blank (B2);
  * each adult's part shows the read-only line (M6);
  * a save on the spouse's record is 422 in BR-4's words;
  * a married applicant whose spouse is not on the case is not asked;
  * there is no extra person, form or fee.
* **C3.16-4 (case, Filing):** a `case.` fact is asked once and stored on the case's record; a Person fact is still asked per person; Filing on another key is refused (-2).
* **C3.16-5 (six, Preview, Organisation):**
  * the employer name is asked once;
  * it fills the Worker's IMM 5710 box, not the spouse's;
  * a document that supplies it still counts (M4).
* **C3.16-6 (case):** RT-9 cited, plus "a correction keeps `rowKey`" on a real case (m11).
* **C3.16-7 (fail):** with no scope set, every draft fingerprint on the six, and every release snapshot on the fixture and the checkpoint, is byte-identical to main's (m6). `check_sh3_resolver.ts` R5 lines pass unchanged.
* **Also:** the M2 packs no worse than main; a walk at 1440 px (library choice; the Preview asking once; on the fixture's case part, the case asking once).

## 6. Questions for the tech lead (each with my recommendation)
1. **Hot files:** approve one line in `engine/snapshot.ts` (the conditional mark), the scope lists in `contracts/resolver.ts`, and one refusal line in `api/src/studio.ts` `placeField`? *Recommend: yes.* All three are additive, and existing snapshots stay byte-identical. `render.ts` and `demo.ts` stay untouched.
2. **Storage:** household and organisation values on the case's own record (the existing `"case"` subject), not r2's `case_household` table and new subjects? *Recommend: yes* (the challenger agrees).
   * No new table, no new subject, and no change to the six places that load a case's answers.
   * The scope stays on the field, so SH4 can later move only Filing values to each filing, and C11.5 can read employer values from the employer's case.
3. **Works timing:** build now and claim C3.16 **Partial**? The six part is green; the case part runs on the fixture as named scaffolding until Visitor visa releases on the six (B82), then on the six for Works. *Recommend: yes.* The challenger is right that Preview alone does not count. *Else:* hold the build until B82 merges.
4. **Names (founder, via you):** keep CLIENT_LEVEL and CASE_LEVEL stored, mapped to the team's PERSON and FILING in one reader, as a change to SA-1B-130 rule 6? *Recommend: yes.* Released snapshots keep the old spelling for good. The challenger says this is the founder's under P-251 and P-316, not a P-294 ruling, and I agree.
5. **One PR in the forms lane,** with the breaker and your read of the migration? *Recommend: yes.* P-332 is lifted for M3 by the founder's 5 Nov word in my brief, not yet a row in DECISIONS (challenge m10).
6. **The demo's Visitor visa list:** after this merges, a scope set on a Visitor visa field on the demo moves its saved question list, so the saved C4.11 and C4.7 runs stop replaying. Leave it to the author's care, with the library warning "Changing this moves the saved AI results of n combinations; they replay only after a new run"? *Recommend: yes, the warning,* in this PR (library words only). *Else:* refuse a scope change on any field of a combination that has saved runs.

## Response to the fresh challenge of r3 (`challenge.md`, 5 Nov)
| Finding | Answer in r4 |
|---|---|
| B1 no release on the six | **Accepted.** The pack is split into a six part (now) and a case part (fixture scaffolding, then the six after B82). Claim Partial (Q3). The challenger's C5.4 lead was tested on a fresh copy: Start With an LMIA loads 164 PUBLISHED fields, so the scope is frozen there too |
| B2 child gets the marriage date | **Accepted.** Household reads the one value only where today's reading finds a person on the case |
| M1 household conditions decided on the case | **Accepted, second option:** a conditioned placement is refused (no `render.ts`). The Visitor visa union date has no condition (measured) and is asked only when the partner is on the case (B2's rule) |
| M2 representative boxes | **Accepted:** refused on any field a representative box reads |
| M3 per-row placement after the scope | **Accepted:** one refusal line in hot `placeField` (Q1) |
| M4 documents stop supplying | **Accepted:** `engine/sources.ts` counts any member's (household) or the principal's (employer) documents |
| M5 Organisation stand-in unnamed; r2 M2 reversed | **Accepted:** named in BR-5, with the reversal and #1051's copy writing to the one reader's record |
| M6 read-only line gone | **Accepted:** restored on each member's part |
| m1 Filing on `person.*` | **Accepted:** Filing is the `case.` keys only (refused elsewhere) |
| m2 more keys to refuse | **Accepted** |
| m3 confirmed once | **Accepted:** stated in BR-4 |
| m4 employer question is staff-only | **Accepted:** stated, unchanged from today |
| m5 "Not built" words need render | **Accepted:** render's own words |
| m6 no releases on the six | **Accepted:** draft fingerprints |
| m7 401/404, lock | **Accepted** |
| m8 the list is already `e915b47071a0` | **Accepted:** said first in §4; Q6 |
| m9 import derives the scope from the key | **Accepted as Not built:** an imported Household is read as Person, named in the PR |
| m10 P-332 | Lifted for M3 by the founder (brief, 5 Nov); named in Q5 |
| m11 `rowKey` on a real case | **Accepted:** case part |
| m12 team-code lines Unverified | **Noted:** the code captures are not in this cloud copy; nothing here depends on them |

## Definition of ready
Test: `acceptance/C3.16.test.ts` (above) · Decisions: P-239, P-316 (2), P-246 (2), P-253, P-322, P-335 · Approval: the tech lead, after `challenge.md` · Cost: US$0, live AI off.
