# W1-15 Questions and documents, slice 1 (data and rules) — R-109 re-check and feasibility challenge

Fresh reviewer, 29 Oct. I did not write the concept or the code. Read: the agreed concept (§2, §4, §10) and its board, P-130–P-134, main's `DECISIONS.md` (P-62, P-72, P-76, P-77, P-97, P-119, P-120), `STANDARDS.md`, `PRODUCT.md`, S5 `build-notes.md`, and the code on main at 7237832b. I did not run the app or the suites. Short names: **A** = `prototype/studio/`.

## Verdict: **Build after these changes**
Slice 1 is feasible at US$0, and its shape is right: one record per fact per role, with the source chosen by precedence and release refusing when a source cannot be reached. Five things need settling before code:
* store only overrides on top of a derived default;
* define "exactly one source" as "one reachable primary source", plus a fallback question;
* define PQR ⊂ SQR for facts that come from a document;
* fix the per-role blind spot in the coverage gate this slice builds on;
* keep released fingerprints unchanged.
Counts: 0 Blocker · 6 Major · 2 Minor.

## 1. R-109 re-check: what the concept relies on, against main
| Concept claim (slice 1 depends on it) | On main | Evidence |
|---|---|---|
| "Comes from" exists today in some form | **Partly. It exists per library placement, not per combination or per role.** `SectionQuestion.collectedFrom` takes five values: client_questionnaire, verified_document, staff_working_view, profile_record, existing_record. A fact has one placement per workspace (lineageKey = fact key), so every combination and every role share one value. The renderer takes the first placement per fact. | A/prisma/schema.prisma:700-701; A/api/src/studio.ts:20, 446-448; A/engine/import.ts:51; A/engine/render.ts:111-112 |
| Client / Agent mapping | **Partly, and two readers disagree.** `filledByOf` counts client_questionnaire and profile_record as Client and everything else as Case officer. The case engine adds a subject rule: representative and organisation facts are never the client's. The renderer calls existing_record "client profile" while `filledByOf` calls it officer. **Agent today = staff_working_view, existing_record, or any representative.\* fact.** | A/contracts/workspace.ts:112-113; A/engine/runtime/case.ts:18-19, 26; A/engine/render.ts:161 |
| Document · type | **Partly.** A fact counts as "document" when any document type on the combination's checklist lists it in `suppliesFacts`. Coverage ignores whose document it is (`DocumentRequirement.appliesToRoles`). `suppliesFacts` is filled only from the P5 reader profiles when the work-permit release is imported. Every other type has `[]`, so the Visitor visa case derives no document facts at all today. | A/engine/coverage.ts:22, 27; A/engine/render.ts:124-125; A/prisma/schema.prisma:740, 762; A/engine/import.ts:17, 58-66 |
| "Three PQR markers become one record" | **Only one marker exists in our code: `SectionQuestion.tier` (prospect / case / lead).** It defaults to "case". Prospect values appear only in the imported work-permit fixture (19 placements). Nothing reads it except the snapshot, the import and the library form. The team's `pqrCanonicalFieldKeys` (team code) is not in our `SqrSectionSelection`. The W1-08 BR-10 "When it is asked" column was designed and never built (not in `web/src`). Retiring the "three markers" therefore means: keep `tier` as an AI hint, add the per-combination tick, and build no column. | A/prisma/schema.prisma:698-699, 720-731; A/api/src/studio.ts:445; A/engine/snapshot.ts:149; W1-combination-workspace/concept-draft.md:32 |
| "Every form field has exactly one source" vs the coverage gate | **No conflict, but different meanings.** Today's gate is "at least one": a fact is covered when placed or supplied (coverage.ts:27; validate.ts:43-44, 60). A fact can be both. The renderer then labels it "client question … a document can also supply it" and **asks the client anyway** (render.ts:161-162, 221; preview.tsx:74). That contradicts P-130 ("not asked in the SQR"). A placement in a section the combination does not select still counts as covered, with only a warning (snapshot.ts:139; validate.ts:72). | as cited |
| P-97 declarations and background always Client | **Not identifiable from data.** There is no marker on field, section or placement. Only section keys hint at it (`background_declarations`, `security_history`, `background_medical`, in the imported fixture only). Matching on key names would be a constant in code (STANDARDS §3.1). | grep of A/samples, A/tests/fixtures |
| One PQR per combination, PQR ⊂ SQR (P-76, P-132) | **Not built.** C4.2 and C4.7 say Not built. | product/qa/CAPABILITIES.md:44-45 |
| Capability C4.10 | **Does not exist yet** in `qa/CAPABILITIES.md` (P-74: the Lead adds it). C4.9 still says "changed once in the library". | product/qa/CAPABILITIES.md:42 |
| Released snapshot and fingerprint | The fingerprint hashes everything except `row_versions` and `mode`. A new top-level key changes every fingerprint and is listed by `diff()`'s completeness guard as an unnamed "Configuration changed". The guard means a missed key cannot pass silently; the cost is an unnamed line on Review. | A/engine/snapshot.ts:161-162; A/engine/validate.ts:184-185 |

## 2. Objections, ranked
**M1 (Major, Slice 1): store overrides, not every fact.** *What breaks:* storing a row per fact per role (about 186 × roles) copies a value that rules can work out. Every new form, document or placement then leaves rows stale, and old releases have no rows at all. *Fix:*
* The engine computes the default source with a pure function, `sourceOf(snapshot, fact, role)`, using precedence: a document on this role's checklist that supplies the fact › P-97 client-only › agent (staff_working_view, existing_record, representative.\*) › client. "Rules" as the proposer means exactly this default.
* A new table, `FactSource`, stores only what a person (later AI) set: overrides and PQR ticks. Columns: `combinationId`; `lineageKey` = `role|fact`; `source` (DOCUMENT/CLIENT/AGENT); `documentTypeKey?`; `prequalification`; `reason`; `origin`; `version`; `status`; `supersedesId`; `updatedBy`; `@@unique([combinationId, lineageKey, version])`.
* It follows the `DocumentRequirement` lifecycle: draft rows, `effective()`, published at release, and "author deletes own draft at once with Undo" (P-116 amended). Optimistic concurrency uses the version (STANDARDS §4).
* No columns on `SectionQuestion` (library-wide) or `SqrSectionSelection` (unversioned, per section).
*Test:* pass, the default with no rows; fail, an override row with a stale version gets a 409.

**M2 (Major, Slice 1): "exactly one source" needs a fallback, so define it as one primary source that can be reached.** *What breaks:* P-130 says a document fact is asked only when the document is missing or unreadable. That fallback needs a question (wording, section). Strict "one source" would forbid the client placement it depends on. With a pure derivation, "exactly one" can never fail, so the rule tests nothing. *Fix:* the record holds the primary source; a client placement may coexist as fallback. Release refuses when the primary source cannot be reached:
* Document → the type has a requirement on the checklist for that role and lists the fact in `suppliesFacts` (the C4.10 core);
* Client → a placement exists (not `rule_only`);
* Agent → a placement exists, or the fact is about the representative.
Release **warns** when a document fact has no fallback question. **Refuse** it when that document is conditional or alternative-only: on a case where the document is not needed, nobody would be asked (a coverage gap at case time). *Example:* a marriage certificate needed "only if married" supplies `relationship.date_of_marriage`; the principal is common-law, so no document comes and no question either.

**M3 (Major, Slice 1): fix the coverage gate per role before building on it.** *What breaks:* coverage.ts:22 and render.ts:124 build one combination-wide set of document facts. A passport required only for the principal "covers" the child's passport facts. Slice 1's per-role record would sit on a rule that ignores roles. *Fix:* compute document facts per role from `document_requirements[].who`, using the same `subjectsFor` the checklist uses (render.ts). *Tests:* pass, a passport for each_applicant covers the spouse; fail, a passport for principal_applicant only gives a coverage error for the spouse's `person.passport_number`. Existing sample combinations may get new gaps: fix the sample data, never the rule (coverage.ts:4).

**M4 (Major, Slice 1): PQR ⊂ SQR when a PQR fact comes from a document.** *What breaks:* the facts that typically decide eligibility are citizenship, date of birth and marital status, and a passport supplies the first two. Under P-130 these are not SQR questions, and a prospect has no uploaded documents (P-129). So "PQR ⊂ SQR" read literally forbids the most common PQR picks. *Fix:* define PQR ⊂ (SQR ∪ the client's checklist documents). A PQR tick is allowed on a Client or Document fact that has a client placement (the PQR needs wording to ask it). The PQR answer is a declared value. The SQR shows it "please confirm" (P-77), and the document read later is compared with it, so a mismatch is a check, not an overwrite (P-72). *Refuse at release:* a PQR tick on an Agent fact; a PQR tick with no client placement; a tick on a fact no form needs and no rule reads (warn instead, if the Lead prefers to allow eligibility-only facts). Question 1 below.

**M5 (Major, Slice 1): keep existing fingerprints, and name the new record on Review.** *What breaks:* a new snapshot key changes every release's hash (snapshot.ts:161). It would also show as an unnamed "Configuration changed" (validate.ts:184). *Fix:* add `fact_sources` to the snapshot only when the combination has rows (the S5 `min_age` pattern, snapshot.ts:151-152). Engines read a missing key as "all derived". Add a `KINDS` entry in `diff()` so each override or tick shows in words with `needs_sme: true`; PQR picks are approved in the combination's one review (P-76). *Tests:* pass, every sample combination after Load sample and the imported c1-v3 release keep their fingerprints exactly; fail, one override changes the fingerprint and appears once on Review. `api/src/demo.ts` needs no new sample rows (defaults are derived), only the sample `suppliesFacts` from M6.

**M6 (Major, Slice 1 data / later slice for governance): the document side has nothing to derive from outside the work-permit import.** *What breaks:* `suppliesFacts` is `[]` for every type except the P5 imported ones (import.ts:58-66). Precedence "document first" therefore derives "client" everywhere on Visitor visa. That breaks the slice's own proof and the strip's "from documents 74". *Fix:* slice 1 gives the sample document types their `suppliesFacts` as Sample data in `samples/` (content is data, STANDARDS §3.1), not seeded in code. Editing `suppliesFacts` stays a governed library change in S6 or W1-10 step 3. Second gap: `suppliesFacts` has no subject. A marriage certificate supplies facts about two people, and a child's birth certificate names the parents. Slice 1 treats a document's facts as about the document's owner (the requirement's role) and refuses an override that names a document for a fact about another role. Facts about another person come in a later slice, if the immigration expert needs them.

**m1 (Minor, Slice 1): two documents supply one fact.** For example a passport and a national identity card both supply the date of birth. The default picks a base requirement over a conditional one, then a stable order (type key). The rest show as "also supplied by" (information only, no warning). Alternatives ("passport **or** travel document") are slice 3; until then each alternative is just another supplier.

**m2 (Minor, Slice 1): P-97 needs a marker, and P-97 meets per-combination overrides.** Add `clientOnly` to `LogicalSection`: "declarations and background: the client answers". Mark it on the sample sections in `samples/`. Changes to it go through the library-change path. Release refuses Document or Agent on a fact placed in such a section, and the default never proposes them. Separately, P-97 says "who fills it" changes only in the library with a second person, while P-130 makes Comes from per combination. They can live together if the library placement stays the default and a per-combination override is reviewed at that combination's release (second person). Question 2.

**Missing from the §10 slice list (later slice, not slice 1's to build):** the renderer and case engine still ask every placed fact (render.ts:221). Until a slice changes `render()` and `caseView()` to skip document-sourced facts in the client view, the record changes Review and Preview only, not what a client is asked. Preview in three sets (slice 4) is the natural home. State it there, with a test that a case pinned to an older release keeps asking as before (P-65, STANDARDS §3.7).

## 3. What is sound
* The derived precedence matches what the code already half does: render.ts:159-162 already orders document reading before placement.
* One per-combination record fits P-76, P-132 and the team's `pqrCanonicalFieldKeys` (per combination). Keeping `tier` as a hint costs nothing and keeps c1-v3's fingerprint.
* No screen in slice 1 is the right cut. The rules can be fully tested through the engine and API.
* US$0 holds: no AI call is needed for derivation or the checks.

## 4. Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule (engine, pure) | Tests (pass / fail) |
|---|---|---|---|---|
| Default source | none (derived) | read only, in `GET …/workspace?tab=questionnaires` (the view adds `source`, `proposedBy: "Rules"`) | `sourceOf()` precedence; P-97 `clientOnly`; per role | doc-supplied fact → Document / no supplier → Client; representative.\* → Agent / a declaration-section fact never Agent |
| Override | `FactSource` row, DRAFT → PUBLISHED | `PUT /combinations/:id/fact-sources/:role/:fact` (version), `DELETE` = Undo own draft | override must be reachable (M2) | override to Client saved / Document whose type is not on the role's checklist → 422 at save, and an error at release |
| PQR tick | same row, `prequalification` | same PUT | M4 rules | tick a Client fact / tick an Agent fact → 422 |
| Coverage per role | — | — | M3 fix in coverage.ts and validate.ts | principal-only passport covers no spouse fact |
| Release gate (C4.10) | — | existing release path | validate.ts errors as listed in M2 and M4 | each refusal names the fact in words (label), the role and the fix |
| Fingerprint | snapshot key only when rows exist | — | `diff()` KINDS entry | all sample fingerprints unchanged / one override → one Review line |
Every rule gets a pass and a fail test (STANDARDS §3.10). Test labels name C4.10 and C4.2 (P-86).

## 5. Questions for the Lead (recommendation first)
1. **PQR fact supplied by a document:** allow the tick, with the PQR answer later checked against the read value (M4)? *Recommend yes.* Otherwise the PQR cannot ask citizenship or date of birth. This is a definition inside P-130/P-76, not a new product choice. Take it to the founder only if you read P-130's "PQR ⊂ SQR" literally.
2. **P-97 vs per-combination Comes from:** the library default plus a per-combination override reviewed at that combination's release (m2)? *Recommend yes,* and reword C4.9 to match. If you read P-97 as forbidding any per-combination change, this is a founder question.
3. **A document fact with no fallback question:** a warning for an always-needed document, a refusal for a conditional or alternative one (M2)? *Recommend yes.* A refusal everywhere would block today's imported release until fallback wording exists.

## Lead response
29 Oct (Lead, by message, on da3c814c):
- **M1–M6, m1, m2: all accepted** as written. M1: store only overrides and ticks; derive the rest. M2: one primary source, plus a reachable fallback question. M3: fix coverage per role first. M4: PQR ⊂ (SQR ∪ the client's checklist documents). M5: `fact_sources` in the snapshot only when rows exist, named in diff with needs_sme. M6: Sample `suppliesFacts` in samples/ as data. m1: a stable default for two suppliers, the others shown as "also supplied by". m2: `clientOnly` on LogicalSection.
- **One addition to M6** (research `rules_provenance_model.md`): `suppliesFacts` needs a subject. Each supplied fact has a subject: the holder, the holder's parent, or the holder's spouse (a marriage certificate covers two people; a birth certificate names the parents). The smallest shape that works (a small child table or a {fact, subject} list); no per-combination copy.
- **Q1: yes.** A PQR tick is allowed on a Document fact with a client placement. The PQR answer is declared; the SQR shows it as "please confirm", and a later document read that differs is a check, not an overwrite (P-72, P-77). A definition inside P-130, not a new founder choice.
- **Q2: yes.** The library default plus a per-combination override, reviewed at that combination's release. Sections marked clientOnly (P-97) stay locked: release refuses Document or Agent there. C4.9 reworded in the build notes; the Lead updates CAPABILITIES.
- **Q3: yes.** No fallback question on an always-needed document is a warning; on a conditional or alternative document, a refusal at release.
- **Renderer gap** (the client view still asks every placed fact): slice 4 (Preview in three sets), with the named test; the Lead puts it in the concept's §10.
- **Also in this pass:** QA-69 (Minor, qa after-merge on S5): the Forms tab offers Undo after a release; refuse it with "Released since", as people Undo does (L6). Pass and fail test.

## Agreement
Agreed 29 Oct (Lead, within founder decisions P-130–P-134).

## Build discoveries
