# G4 Answer-key families and runner (C5.7): concept

Status: **DESIGN, revised after the independent challenge** (`challenge.md`: Build after these changes, no Blocker, 5 Majors, all taken; §8), **waiting for the tech lead's approval** (no board: P-223 (4)). Written 2 Nov 2026 by the forms builder, branch `claude/loving-franklin-k30mje`. Part 1 (this PR): engine, data, API and the acceptance test. Part 2 (after approval): the screen. Lane: forms.

Done means (BACKLOG G4): a made-up family with expected values (Sample until the expert signs) runs against a field map or a rule set and shows pass or fail per value; the Visitor visa IMM 5257 map has one passing family; a pass and a fail test per rule; the runner is engine code with no database or vendor calls (P-249). Acceptance test: `prototype/studio/tests/check_g4_answer_keys.ts` (no pre-written acceptance file existed for C5.7; written with this part, in the suites from the start).

## 1. Job and journey
**Job.** The configuration author writes a made-up family once (people, roles, facts), writes what each form box or each eligibility gate should give for it, runs it, and sees each value pass or fail; the immigration expert signs the expected values. *"If this map or rule set is wrong for a known family, show me where."*
* **Who:** the author (`author` duty) writes families; the immigration expert (`sme` duty) enters and signs the expected values (SA-1B-296 r2, challenge M3; the author may draft them too); either runs; the approver reads.
* **When:** while configuring a combination, before Submit; G2 (C5.5) then refuses a real release without a passing signed key.
* **Team requirement:** SA-01B v2.1 SA-1B-296 (data shape, field 7), SA-1B-181 (form maps), SA-1B-199 (rules and scoring); P-240, P-249.

## 2. Layers
| Layer | In the app (main) | Team (SA-01B) | New in G4 |
|---|---|---|---|
| Data | `ConfigRelease.snapshot`, draft snapshot (`buildSnapshot` "draft"), `combination.eligibility` (C6.9) | `TestFamily`, `AnswerKey`, `AnswerKeyRun` (SA-1B-296 f.7) | the same three models, `test_family`, `answer_key`, `answer_key_run` (new tables only; mapping in §2b) |
| Engine | the case filler's path: `knownOf`, `formCoverage`, `caseView` + `markNothingRecorded` (`engine/runtime/`), the value step inside `api/src/fill.ts writeForm`, `assess` (`engine/runtime/eligibility.ts`) | none ("no test runner exists", SA-1B-296 f.3) | `engine/answer-keys.ts` (pure); `engine/form-values.ts`: the value step moved out of `writeForm` unchanged, so a test and a case copy compute the same value |
| API | `need(actor, duty)`, `buildSnapshot` | `system/pack:draft-manage` | `api/src/answer-keys.ts` + `features/answer-keys.ts` |
| UI | combination tabs `/c/:id/:tab` | "Tests" tab (SA-1B-296 f.3) | part 2: a **Tests** tab on the combination |
| AI | — | none: "expected results are never written by AI" | none; US$0 |

## 2b. Team → ours (P-249: the team's names; our additions marked)
| Team (SA-1B-296 f.7) | Ours |
|---|---|
| `TestFamily { familyKey, persons[{role, location, ageOnReferenceDate}], answers }` | `TestFamily { familyKey, label, referenceDate, people[{id, role, label, applies}], facts[{about, fact, row, value}], noneApply[{about, group}] }`: ages are worked out from the facts on `referenceDate`; *ours*: person ids, `applies`, rows, `noneApply`. Classification: made-up test data, no personal data |
| `AnswerKey { itemRef, itemVersion, familyKey, expected, state, signedByUserId, signedAt, changeReason }` | the same, plus `combinationId`, `itemKind` (field_map, rule_set), `version` (our `itemVersion` is the run's fingerprint, BR-5) |
| `AnswerKeyRun { itemRef, itemVersion, familyKey, result, failures[], ranAt }` | `result`, `lines[]` (every value, failures first), `keyVersion`, `itemFingerprint`, `inputsFingerprint`, `ranBy`, `ranAt` |
Lift package: `engine/answer-keys.ts`, `engine/form-values.ts`, and what they import (`engine/runtime/*`, `engine/options.ts`, `engine/form-steps.ts`, `p5/transforms.ts`, `contracts/rules.ts`).

## 3. Business rules
* **BR-1 A family is made up and Sample.** `{key, label, reference_date, people[{id, role, label, applies}], facts[{about, fact, row?, value}], none_apply[{about, group}]}`; one principal; roles from the library's person roles; `about` is a person id, `case`, or a relative a form describes (`<person>/parent_1`, `/parent_2`, `/sibling`); each fact a library field; rows from 0 with no gap; `applies` false = named on the forms but not travelling (E1's husband). Every family and key reads "Sample" until signed (P-240). No client data (SA-1B-296 r1): no link to a case, copied from nothing. Source: T SA-1B-296 r1, f.7; D P-240.
* **BR-2 One key per family and item.** Item = `field_map` of one form (`item_ref` = form number) or `rule_set` (the combination's eligibility gates), within one combination. Expected: map → per person `{box: value}` ("" = must stay blank); rule set → per person `{outcome, gates?{key: met|not_met|not_answered}}`. A box or gate the item does not have is refused 400 on the field. Source: T SA-1B-181 r1, SA-1B-199 r1.
* **BR-3 A run fills like a case copy, with no PDF.** Field map: the family becomes a case (participants, VERIFIED answers, rows, confirmed "none apply" groups) → `formCoverage` (a confirmed value failing its check is not written) → `caseView` + `markNothingRecorded` (the "N" boxes) → the value step (transform, option codes, form format; signatures and the oath never written), with **today = the family's `reference_date`**. Rule set: `assess` per travelling person (C6.9 BR-7). No database, clock, file or vendor call inside the engine (P-249): the API passes the snapshot and the form field list. Source: D P-249; T SA-1B-181 r3.
* **BR-4 Pass or fail per value.** An expected value is the value **as written in the form field** (after transform, code and format: "205", "01", "N"), compared exactly; "" = stays blank. Each expected box or gate gives one line: expected, got, pass, and the filler's reason when it differs. A box a person fills (signature, oath) cannot be given a value (400). A box the run writes that the key does not list is a failure ("written, not expected": catches a wrong-person wire). A missing expected box the run leaves blank passes only when expected "". The run passes only if every line passes. Source: T SA-1B-181 r3 ("compares every box"), SA-1B-296 r5 example.
* **BR-5 A run belongs to the item as it was.** Each run stores the item's fingerprint (map: form, edition and entries; rule set: gates), the inputs' fingerprint (the whole draft snapshot, plus the form field list for a map) and the key version; a family change bumps the version of every key using it. Any change reads "Not run": wider than needed, never a stale Passed (challenge M2). Source: T SA-1B-296 f.6.
* **BR-6 Per edition.** A field-map key records the edition it was written for; a run against another edition fails "This key is for edition X; the map is edition Y" (SA-1B-296 r5).
* **BR-7 The expert signs; a change unsigns.** Sign: `sme` duty only (author 403), on the key version shown (409 if stale); the expert may have entered the values (SA-1B-296 r2). Changing a signed key's expected values needs a one-line reason and returns it to Draft; so does a change to its family (with the family change as the reason). The second person approves key changes with the draft in G2. Source: T SA-1B-296 r2, f.6; C `need`.
* **BR-8 Saves are versioned.** Family and key saves carry `version`; a stale one gets 409 naming who saved last; each write audits without family values (SA-1B-296 f.9).

## 4. Layout (part 2)
Combination page, new tab **Tests** (after Eligibility). Pattern: list → detail (`EXPERIENCE.md` §3). Top: "Families" (Sample badge, people count, Edit). Below: one row per testable item (each form map in the combination, the eligibility rules), with each family's state: Not written · Draft · Signed, last run Passed / Failed (n of m) / Not run, and **Run**. Detail: a table *Box (caption) · Person · Expected · Got · Result*, failures first; Sign (expert only) and Change with reason. **Expected editor** (challenge M5 b, STANDARDS §3.2 pick, don't type): every mapped box of the form per person in the form's order, with its caption and whose fact it reads; a choice box picks from the form's own options with the label beside the code; empty = stays blank; "Fill from a run" is **not** offered (the key must not copy the product's output).

## 5. Copy
Empty: "No test families yet. Write a made-up family: never a real client." Sample badge tooltip: "Sample until the immigration expert signs the expected values (P-240)." Fail line: "IMM 5257, Family name (principal): expected 'SAMPLE', got 'OTHER'." Stale: "Not run since the map changed."

## 6. Contract and tests
`GET/POST /api/answer-keys/families`, `PUT /families/:id` · `GET /api/combinations/:id/answer-keys` (items × families with states) · `POST /api/combinations/:id/answer-keys` `{family, item_kind, item_ref, expected}`, `PUT /answer-keys/:id {expected, version, reason?}` · `POST /answer-keys/:id/sign {version}` · `POST /answer-keys/:id/run` → `{result, lines[], fingerprint}`. Tests: one pass and one fail per BR in `tests/check_g4_answer_keys.ts` (engine part with no server; API part on an isolated copy) and the acceptance file: the Visitor visa IMM 5257 map, one family, all lines pass; a rewired box fails naming it.

## 6b. Capability or scaffolding
All capability. *Needed for the proof:* families, keys, runs, sign. *Not built:* **scoring tables** (no scoring table exists in the product: C6.9 SI-1 has "no score"; Q1), preview families (SA-1B-61), approver sample families (SA-1B-38 r3), auto-run at submit (G2).

## 6c. What the first key found (build discovery)
The IMM 5257 family is E1's household and its expected values are E1's checked fill (Adobe Validate passed, 23 Oct), not this product's output. Today's map agrees on 58 of 74 values; the 16 others are amended in the key with their reasons (`tests/check_g4_answer_keys.ts` AMENDED) and the check proves E1's values as they stand fail on exactly those 16: 8 boxes E1 writes "N" that no question or fact fills (other names, national identity document, US card, Taiwan PIN, Israel passport, consent, tuberculosis, government position), the one-line address in Canada (", Canada" added), and 7 boxes the map writes that E1 leaves blank (the country where applying and the residential address when the same as residence and mailing, the Canada/US phone switch). Each is an expert question in the PR.

## 7. Questions (for the tech lead)
1. **Scoring tables:** the product has none yet. Recommend: the runner takes an item kind, `scoring` is refused "No scoring tables in this product yet", and the kind is added with the first scoring table (with B16), rather than invent a table for G4.
2. **Families per workspace, keys per combination:** a map is tested inside a combination (whose forms, which person). Recommend as written; one family reused across combinations.
3. **The expert enters and signs; no second person in G4** (challenge Q1, M3): recommend; the second person approves key changes with the draft in G2 (SA-1B-296 r2). A family change returns its signed keys to Draft (challenge Q3): built that way.

## 8. Challenge taken (`challenge.md`)
M1 case path, `none_apply`, reference date: BR-1, BR-3. M2 fingerprints: BR-5. M3 the expert enters: BR-7, Who. M4 team names: §2b, models renamed. M5 as-written values, signature refused, editor: BR-4, §4. Minors m1 (E1 wrong-person test), m2 (`applies`), m3 (library roles, relatives), m5 (reason on every failed line): built. m4 (zod contracts): with part 2's web types.

Ready: acceptance test named, row text from BACKLOG, decisions P-240 and P-249 answered; Q1–Q3 carry recommendations.
