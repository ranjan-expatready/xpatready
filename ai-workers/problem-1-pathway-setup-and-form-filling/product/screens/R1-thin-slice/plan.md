# R1 — Thin end-to-end slice · runtime lane PLAN (23 Oct 2026)

Concept: `concept.md` (Lead, 23 Oct). Decisions: P-18, P-33, P-45 as corrected by P-65, P-47, P-62 §6, P-65, P-67. Backend path (P-68): PLAN → BUILD → CHECK → FIX → MERGE. **BUILD starts only when forms slice 1 (F1, branch `claude/forms-f1-check-*`) is merged into `main`**: both change `prisma/schema.prisma`, and R1 needs F1's answer lists and option maps (§5).

Sources read for this plan: the concept; `PRODUCT.md`, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, `WORKFLOW.md`; decisions P-47 and P-65 in full; `qa/CAPABILITIES.md` C4.4, C6.1–C6.3, C7.1–C7.2; the app (`prisma/schema.prisma`, `api/src/{main,core,studio,fill,sources,demo}.ts`, `engine/render.ts`, `web/src/pages/{preview,library}.tsx`); the forms lane's F1 schema diff (read-only, its branch); the saved IMM 5257 run and slice-1 evidence (`prototype/studio/evidence/slice-1-imm5257-live/`); the team's models, newest capture `code/ERv2-sanitized@22f1d12-2026-10-19/apps/api/prisma/models/` (`client-spine.prisma`, `country-pack-questionnaire.prisma`, `country-pack-documents.prisma`, `country-pack-core.prisma`), read-only. All immigration values below are **Sample** until the immigration expert confirms them; legal points are "Unconfirmed: no counsel".

---

## 1. Challenge (fresh agent, skill screen-challenge)

CHALLENGE_PLACEHOLDER

---

## 2. What the builder found in the code (facts, with evidence)

These are measured, not judged; each one shapes the plan below.

| # | Fact | Evidence | Consequence for R1 |
|---|---|---|---|
| F-1 | The visitor visa has no released configuration: the sample loader attaches its official files (IMM 5257, IMM 5707, IMM 5484, guide 5256, visa package page, IMM 5881) and stops ("not set up yet"). | `samples/programs.json` row `individual.visitors.visitor_visa`, setup `vv.single` | The lane's copy must configure and release it first (§4). |
| F-2 | A saved live IMM 5257 drafting run exists (US$1.55 when made, 21 Oct); replay through the product's drafting path costs US$0. 242 boxes: 161 mapped, 65 not a fact, 14 unresolved, 2 never filled; 84 proposed fields. | `p2/runs/studio-fieldmap-imm5257e-live-20261021t060247723z.json`; `api/src/sources.ts` `runDraftStep` (REPLAY) | Release path is available today; no paid AI. |
| F-3 | After the 21 Oct decisions the draft had **0 errors and 91 warnings**: about 31 fields "read by a box, but nobody is asked for it", and placements in sections the visitor-visa questionnaire does not use (11 personal details, 9 travel document, 8 background declarations, …). | `evidence/slice-1-imm5257-live/composition.json` → `draft.problems` | **A released visitor visa today would have an incomplete questionnaire.** Setup must select the sections and place the missing fields through the product's existing path (Library › field › "Save placement as draft", `POST /library/fields/:key/placement`; `POST /combinations/:id/sections/:key`). |
| F-4 | Placements are library-wide: one placement per field (`SectionQuestion.lineageKey` = field key). | `api/src/studio.ts` `placeField` | Placing a field for the visitor visa also changes the work permit's next draft. Correct by P-28/"defined once", but the Lead should know before setup. |
| F-5 | IMM 5257's 84 facts by type: text 28, date 19, choice (code list) 15, country 9, yes/no 9, address 3, number 1. Transforms show more: 18 boxes split phone numbers (`phone_part`), 19 boxes take day/month/year parts, education and occupation dates take **month and year only**, 3 details boxes cap at 200 characters, funds as CAD text. Four repeating groups: previous residences (2 rows), education (1), occupation (3), contacts in Canada (2). | run `raw_output.entries` transforms and rows | The concept's list of question types misses phone, email, money, long text, month-and-year and "more than one repeating group" (§5). |
| F-6 | 12 identity facts IMM 5257 reads (names, sex, date of birth, citizenship, passport ×4, national ID ×4) are placed "collected from verified document"; the renderer never asks the client for them and marks them "document reading" or "unresolved". Document reading is not built in R1. | `engine/render.ts` line 134; c1-v3 placements | Without a decision these boxes stay blank. Founder question 1. |
| F-7 | The fill path writes only `confirmed` facts and reads facts from sample profiles; there is no case. | `api/src/fill.ts`; `engine/render.ts` `Known` | R1 adds a case source of facts; a small shared change lets the engine label a declared answer as declared (§8, shared-file request S-3). |
| F-8 | Unknown actor header falls back to the configuration author (`ACTORS[0]`). | `api/src/core.ts` `actorOf` | Breaks "deny by default" (STANDARDS §6) for any client-facing endpoint. Runtime endpoints use their own guard that refuses unknown actors; shared-file request S-1 asks the Lead to fix `actorOf` for everyone. |
| F-9 | The team's spine has **no Case table**: every `caseId` is a bare uuid with no foreign key ("no Case table yet"). `ClientCanonicalAnswer` has no `caseId`; answers belong to a person, not a case. `FormInstance.generationState` is only PENDING · RENDERED · FAILED: no signed or uploaded states. | `client-spine.prisma` lines 335–336, 245–269, 638–642 | Mapping table §7 lists each divergence and the adapter. |
| F-10 | IMM 5257 box inventory has no box lengths (`max_chars` null for all 233 fields); only transforms carry limits ("max 200 characters"). | `p1/inventory/imm5257e.inventory.json` | Field-length validation reads the transform limit; "box length from the form" (P-47) is not available for IMM 5257. |
| F-11 | P-65 (c) lists the signed-PDF states as prepare → printed → sent for signature → signed copy received → uploaded, and (d) protects "signed, uploaded or submitted" items. The concept's four states (Draft · Generated · Signed · Uploaded) are a subset with different words. | `decisions/P-65-independent-review.md` row 6 | R1 uses P-65's words for the states it builds (§6); printed, sent for signature and submitted stay M3. |
| F-12 | F1 adds `AnswerList`/`AnswerListValue` (the team's EnumSet), `FormFieldMap.optionMap` per channel, shared-field aliases and reviewed merges (`FieldMerge`, merged-away ids redirect). | forms branch `prisma/schema.prisma` diff | Choice and country questions take their options from F1's answer lists; answers are keyed on the field after alias redirection. Hard dependency: another reason BUILD waits for F1. |

---

## 3. Response to the challenge and the facts: what changes from the concept

BUILDER_RESPONSE_PLACEHOLDER

---

## 4. Configure and release the visitor visa in this lane's copy (product path)

The shared demo (:4400) is never touched. All steps run in the lane's own database and ports: `zsh prototype/studio/tools/isolated.sh runtime_r1 4430 start`. Every step goes through the endpoints the screens call, acting as the simulated personas; the founder can repeat any step on the screens. Labels follow P-33.

| Step | What happens | Who (simulated) | Label |
|---|---|---|---|
| 4.1 | Reset, then "Load sample inputs": the visitor-visa combination `vv.single` exists with its official files attached and read on this computer (no AI) | Configuration author | Loader = Scaffolding (stands in for a person uploading files) |
| 4.2 | Draft IMM 5257 by **replaying** the saved live run (mode REPLAY, US$0, labelled "replayed AI run") | Configuration author | Drafting path = Capability; replay = Scaffolding |
| 4.3 | Decide the proposals as on 21 Oct: accept the 34 exact reuse and 22 clean new as groups, then the 28 individual decisions recorded in the slice-1 README; apply to the draft | Configuration author | Capability |
| 4.4 | Reuse IMM 5707 from the library for the combination (its map is already in the library from c1) | Configuration author | Capability |
| 4.5 | Select the questionnaire sections the placements use; place the ~31 fields nobody is asked for yet (question text, help, per person / per row / once per case, collected from, conditions such as "details shown when the answer is yes", spouse questions only when marital status is married or common-law). Target: **0 errors and 0 "nobody is asked" warnings** for IMM 5257 and IMM 5707 | Configuration author | Capability; every value Sample |
| 4.6 | Submit → content reviewer signs the SME duty → approver (a different person) approves and releases | Author, reviewer, approver | Capability (author ≠ approver enforced server-side) |
| 4.7 | Record the release hash, counts and remaining warnings in `build-notes.md` | Builder | — |

The scripted run of 4.1–4.6 is `prototype/studio/tests/runtime/setup_visitor_visa.ts` (Scaffolding: a person on the screens does the same). It fails loudly if any step's response differs from the screens' expectations, so it doubles as a check of the release path. Placement values come from the slice-1 decisions and the c1 library's placements for the same meaning; each new one is Sample.

---

## 5. Question types and validation the visitor-visa questionnaire needs

Derived from the facts IMM 5257 and IMM 5707 read (F-5), not from the full P-47 list. Types not listed (multi choice, period history with gap check, document upload, declaration) are **Not built** in R1: no visitor-visa fact needs them on IMM 5257, and P-47 builds them in M3 on the reference combination.

| Type | Facts on IMM 5257 (examples) | Field validation (tier 1, message under the field) |
|---|---|---|
| Short text | birth city, school name, employer, UCI, contact name | Required when a rule says so; length ≤ the transform limit when present; trimmed |
| Long text | immigration history, criminal and military details | ≤ 200 characters (transform limit), counter shown |
| Number (money, CAD) | funds available | Whole dollars ≥ 0; ≤ 12 characters as written on the form |
| Date as day / month / year | date of birth, passport issue and expiry, intended stay, status from/to | A real date; date of birth not in the future; expiry dates may be future |
| Month and year | education and occupation from/to | A real month; not after today for "from" |
| Yes / no | refused visa, overstayed, health condition, previously applied | One of the two; required |
| Single choice | sex, marital status, visit purpose, residence status, visa type, phone type, province/state, native language | Value from the field's **answer list** (F1 `AnswerList`); radio up to 5 values, select above (P-47) |
| Country (searchable) | birth country, citizenship, passport country, residence countries | Value from the country answer list |
| Phone (country code + number) | telephone, alternate telephone, fax | Country code from the list; digits only; split exactly as the form's `phone_part` transform needs |
| Email | email | One `@`, a domain; lower-cased |
| Address group | mailing, residential, contact address in Canada | Required parts (street, city, country); postal code shape by country only where the answer list defines it (else free) |
| Person name group | family name and given names (two library fields shown as one group) | Family name required; "no given name" option leaves given names empty with a reason |
| Repeating group | previous residences (≤ 2 on the form), education (1), occupation (3), contacts in Canada (2) | Add, edit, remove; the form's row count is the maximum written, extra rows kept and flagged "does not fit on IMM 5257" |

**Section validation (tier 2)**, summary at the top of the section linking to each field (GOV.UK pattern): passport expiry after issue; national ID expiry after issue; intended stay "to" after "from"; status "to" after "from"; each repeating row's "to" not before its "from"; union start date after the applicant's date of birth. These come from the release's checks when it has them; any missing one is added as a check through the product path in step 4.5 (data, never code), Sample.

**Rules as data from the release:** show/hide (details fields when "yes"; "other" text when the status is Other; spouse section only with a spouse on the case and marital status married or common-law), required, per person, per row, once per case. Validation never blocks saving; it blocks "Generate" only (P-47).

Tier 3 (independent AI review) is **Not built** in R1 (no paid AI).

---

## 6. Records

New tables, team names wherever the team has the concept (§7 says where ours differ). All carry `workspaceId` (the prototype's reset boundary, standing in for the team's `firmId`); no row-level security or encryption in the prototype.

| Record | Purpose | Key columns and constraints |
|---|---|---|
| `Case` | One application for one released combination | `id`, `workspaceId`, `combinationId`, `reference` (Sample), `status` OPEN, `createdBy`, `createdAt`, `version` (optimistic concurrency) |
| `PackWorkPin` | The release the case is pinned to | `caseId` (unique while current), `partyId` (principal), `packVersionId`, `configReleaseId`, `contentHash` (= release sha256), `purpose` SQR_ADVANCE, `revision` 1, `adoptedFromPinId` null, `actorId`, `pinnedAt`. Insert-only |
| `Party` + `PartyProfile` | Each person on the case | `kind` PERSON; profile `displayName` (Sample), `localePreference`, `contactChannelsJson` |
| `PartyRelationship` | Principal → spouse or partner, principal → child | `fromPartyId`, `toPartyId`, `relationshipType` (open vocabulary: SPOUSE_OR_PARTNER, CHILD); self-edge refused (CHECK) |
| `AnswerSubject` | Whom an answer is about, with the case role | `partyId`, `subjectKind` (principal · spouse_or_partner · child · case), `label`; one principal per case |
| `CaseParticipant` | Who is on the case, in the combination's roles | `caseId`, `subjectId`, `role`, `applies` (travelling), `order`; count within the pinned release's participant min/max |
| `ClientCanonicalAnswer` | One current answer per person per fact; append-only | `partyId`, `subjectId`, `canonicalFieldId` (FK to the exact field version row), `canonicalFieldKey` (lookup), `caseId` (only for case-level facts, see D-4), `valueJson`, `status` DECLARED · VERIFIED, `effectiveAt`, `supersededById`, `sourceJson` {channel: questionnaire · agent view · document seen by officer, actor, case, at}, `verifiedBy`, `verifiedAt`. **Partial unique** on (subject, field, case) where `supersededById` is null (raw SQL in the migration, as the team's `04-spine-constraints.sql`). An edit inserts a new row and stamps the old one, in one transaction |
| `ClientFactRecord` + `ClientFactValue` | One row of a repeating group; values per sub-field | record: `subjectId`, `groupKey` (D-5), `order`, `tombstone`, `supersededById`, `sourceJson`; value: `factRecordId`, `canonicalFieldId`, `valueJson`, unique (record, field). Correction = new record version with the full value set (team rule) |
| `AnswerSnapshot` | The exact values one generation read | `caseId`, `partyId`, `resolvedAnswersJson`, `packVersionId`, `configVersionsJson` (release sha, edition sha), `purpose` FORM_GENERATION (D-8), `capturedAt`, `capturedBy`. Insert-only |
| `FormInstance` | One generated output of one form for one person | team columns: `caseId`, `partyId`, `formEditionId`, `generationState` PENDING · RENDERED · FAILED, `workPinId`, `answerSnapshotId`, `templateHash`, `inputHash`, `outputHash`, `outputStorageKey`, `rendererVersion`, `failureCode`, `operationIdempotencyKey` (unique per workspace); ours: `filingState` GENERATED · SIGNED_COPY_RECEIVED · UPLOADED (D-7), `supersededById`, `label` (answer sheet only · checked copy, not for filing · ready to file). A trigger makes output columns write-once and refuses any change to a SIGNED_COPY_RECEIVED or UPLOADED row except its next state |

Migration: one expand-only migration `runtime_r1` after F1's, with a recorded rollback (drop the new tables; nothing existing changes). Indexes on every read path: answers by (case, subject), instances by (case, person, form).

---

## 7. Mapping to the team's client spine (`code/ERv2-sanitized@22f1d12-2026-10-19`, read-only)

| Ours | Team model (file:line) | Same | Differs (adapter) |
|---|---|---|---|
| `Party`, `PartyProfile` | `Party` 20–95, `PartyProfile` 100–112 | kind, profile fields, per-firm identity | D-9: `workspaceId` for `firmId`; no merge tombstone, import key or key registries (Not built) |
| `PartyRelationship` | 125–142 | from/to, open `relationshipType`, `role`, valid dates | none beyond D-9 |
| `AnswerSubject` | 218–234 | `partyId`, open `subjectKind`, `label` | ours always has a Party (every sample person is onboarded); team allows a null party |
| `CaseParticipant` | — (none) | — | D-2: the team has no case membership; closest are `AnswerSubject.subjectKind` and `PackWorkPin` per party. Port: a case-module table when the team adds `Case` |
| `Case` | — (bare `caseId` in `CaseAnswerOverride` 338, `PackWorkPin` 467, `FormInstance` 660) | — | D-1: ours is a real table; the team's `caseId` columns would point to it |
| `PackWorkPin` | 462–512 | release id, content hash, purpose, revision chain, actor | D-6: pinned per case (team: per party, optional `caseId`); `countryId` omitted (one country); `configReleaseId` added (our per-combination snapshot in a pack version); ADOPT (move a case to a newer release) Not built |
| `ClientCanonicalAnswer` | 245–269 | append-only supersede chain, DECLARED · VERIFIED, `sourceJson`, `verifiedBy/At`, FK to the exact field version | D-3: we keep the field key beside the id for lookups; D-4: `caseId` set only for CASE_LEVEL facts (visit purpose, intended stay, funds, contacts) because the team's answer store has no home for case-level facts. **Unverified: ask the team** whether case-level facts go in `CaseAnswerOverride` or a future case table |
| `ClientFactRecord`, `ClientFactValue` | 278–331 | head row + immutable values, tombstone, supersede whole record | D-5: `groupKey` (the questionnaire section holding the per-row placements) stands in for the team's COMPOSITE `CanonicalField` id; our library has no composite fields. Port: one composite field per repeating group |
| `AnswerSnapshot` | 367–399 | resolved answers, pack version, config versions, captured by/at | D-8: purpose FORM_GENERATION added (team: ASSESSMENT · SQR_ADVANCE); `AnswerSnapshotEntry` rows Not built (values in `resolvedAnswersJson`) |
| `FormInstance` | 655–712 | generation state, snapshot, pin, hashes, storage key, renderer version, idempotency key | D-7: `filingState` and `supersededById` added for P-65's signed-PDF states (team has none); `stampedFormFieldMapVersion` → our release sha + edition sha (our map is rows, not a versioned JSON) |
| Questions (renderer input) | `LogicalSection`, `SectionQuestion` (`conditionEffect` SHOW · HIDE · REQUIRE · OPTIONAL), `SqrSectionSelection` in `country-pack-questionnaire.prisma` 201–312 | already mirrored in our schema | none new in R1 |
| Answer lists | `EnumSet`, `EnumSetValue` | mirrored by F1 `AnswerList` | — |

Names in code and API follow the team's (`Party`, `AnswerSubject`, `ClientCanonicalAnswer`, `PackWorkPin`, `FormInstance`); screens use `PRODUCT.md` words (case, person, answer, form).

---

## 8. Back-end table (element → record → API → rule → test)

API base `/api/runtime`; contracts in `contracts/runtime.ts` (zod, shared by API and web); errors as Problem Details with field messages. Actors added: **Case officer** (firm staff) and **Client** (the principal, answering for the family). Configuration actors cannot touch cases.

| Element | Record | API | Rule | Tests (pass · fail) |
|---|---|---|---|---|
| Open a case | `Case`, `PackWorkPin` | `POST /cases` {combinationId, idempotencyKey} | RT-1 Only a combination with a release; pins the latest release; idempotent | opens on the released visitor visa · draft-only combination → 409 "not released"; same key twice → one case |
| Pin is frozen | `PackWorkPin` | `GET /cases/:id` | RT-2 A later release never changes a case's questions, rules or forms (STANDARDS §3.7) | case shows release v1 questions · after a v2 release adding a question, the case still shows v1 |
| People on the case | `Party`, `PartyProfile`, `PartyRelationship`, `AnswerSubject`, `CaseParticipant` | `POST /cases/:id/people`, `PATCH /cases/:id/people/:subjectId` (travelling yes/no) | RT-3 Counts within the pinned release's participant min/max; exactly one principal; edges principal → others | principal + spouse + child accepted · a second spouse → 422; a fifth child → 422 |
| Questionnaire view | read model from the engine | `GET /cases/:id/questionnaire?mode=sqr\|agent&subject=` | RT-4 Each (person, fact) is asked once, whatever number of forms and boxes read it; sections and questions in release order | spouse family name asked once, feeds the principal's IMM 5257 spouse box and the spouse's own IMM 5257 and IMM 5707 · a duplicate question for one person fails the test |
| Answer a question | `ClientCanonicalAnswer` | `PUT /cases/:id/answers/:subjectId/:fieldKey` {value, expectedVersion} | RT-5 One current answer per person per fact (DB partial unique + service); an edit supersedes and keeps history; stale `expectedVersion` → 409 with the current value | edit keeps two rows, one current · two concurrent first answers → one wins, the other 409 |
| Field validation | engine `validate` | same PUT (returns field messages) | RT-6 Value checked by type (§5); invalid values are **saved** and marked invalid | each type: one valid, one invalid value with its message · removing a type's check makes its fail test fail |
| Section validation | release checks | `GET …/questionnaire` (section summary) | RT-7 Cross-field checks from the release, per person | expiry after issue passes · expiry before issue listed in the section summary |
| Rules | release predicates | engine | RT-8 Show/hide/require per person from the release; a hidden question's kept answer is never written to a form, and the view says why | "details" appears after "yes" · after switching to "no" the details answer stays stored and is not written |
| Repeating group | `ClientFactRecord`, `ClientFactValue` | `POST/PUT/DELETE /cases/:id/groups/:subjectId/:groupKey/rows[/:rowId]` | RT-9 Rows keep a stable id; remove = tombstone; rows beyond the form's capacity are kept and flagged | three jobs written to IMM 5257 rows 1–3 · a fourth job is flagged "does not fit on IMM 5257", not dropped |
| Agent view edit | `ClientCanonicalAnswer` | same PUT, source "agent view" | RT-10 An officer's edit updates every draft output that reads the fact and returns a message naming them (P-45); Undo = supersede back | edit date of birth → message names IMM 5257 and IMM 5707 for that person · client cannot reach the agent view (403) |
| Identity facts | `ClientCanonicalAnswer` VERIFIED | `POST …/answers/:subjectId/:fieldKey/verify` | RT-11 Depends on founder question 1 (recommended: officer types them in the agent view from the document seen; status Verified, source "document seen by officer") | officer-entered passport number fills the box · client attempt → 403 |
| Who may do what | guard | every endpoint | RT-12 Deny by default: unknown actor 401; client sees only their own case and only the questionnaire; officer only the workspace's cases; configuration actors 403 on cases | each role's allowed call · each forbidden call (client reading another case, author answering) |
| Generate IMM 5257 | `AnswerSnapshot`, `FormInstance` | `POST /cases/:id/forms/:form/:subjectId/generate` {idempotencyKey} (queued in the worker, never inside the request) | RT-13 Writes declared and verified answers through the append-only writer; reads back equal; signatures intact; refused while required questions for that form are unanswered or invalid (list returned) | 5257 for the principal: every answered box written and read back equal, signatures verified · tampered output → instance FAILED, no file offered |
| Output label | `FormInstance.label` | same | RT-14 Until IMM 5257's fill trial passes (P-65 (a), evidence lane), the output is "Checked copy, not for filing" beside the answer sheet; never "ready to file" | label read from the evidence lane's status file · forcing "ready to file" without a passed trial → refused |
| Fact changes after generating | `FormInstance` | `GET /cases/:id/forms` | RT-15 A GENERATED instance whose input hash no longer matches is out of date and a new generation is queued; the old one is kept and superseded | change intended-stay date → new instance, old kept · the old file's hash unchanged |
| Never overwrite (P-65 (d)) | `FormInstance` + trigger | `POST /form-instances/:id/transitions` {to} | RT-16 SIGNED_COPY_RECEIVED and UPLOADED instances never change; a later fact change marks them **stale** with the changed facts listed; transitions only forward, officer only; an out-of-date instance cannot be marked signed | change a date after "signed copy received" → stale, bytes and row unchanged (trigger + service) · direct SQL update of a signed row's output → refused by the trigger; client transition → 403 |
| Audit | `AuditEvent` | — | RT-17 Every answer change, generation and transition is recorded with actor and time; **answer values never appear** in audit text or logs | events present · a test searching audit rows and logs for a sample answer value finds none |

Engine (pure, no I/O, `engine/runtime/`): `resolveCase(snapshot, people, answers)` builds the `Known` map from current answers and calls the existing `render()`; `validate(field, value)` per type; `sectionChecks`; `inputHash(form, person, known)`; `staleness(instance, known)` returns the changed facts. Every output carries its reason (STANDARDS §3.9). Property-based tests for `resolveCase` and `staleness` (engine change, STANDARDS §7).

Journey (scripted API + one Playwright run at 390 px and desktop, axe on every state): officer opens a case → adds spouse and child → client answers on a phone width, one group per screen, saves, leaves and resumes → officer reviews in the agent view, enters passport facts, corrects one date → generates IMM 5257 for the principal → marks "signed copy received" → changes the intended-stay date → the signed copy is stale, a new unsigned copy appears. No paid AI anywhere.

---

## 9. Slices inside BUILD (one commit each; BUILD ends at CHECK)

| Slice | Contents | Done when |
|---|---|---|
| R1a Setup | §4 in the lane copy; `setup_visitor_visa.ts` | Visitor visa released in `runtime_r1`, 0 "nobody is asked" for IMM 5257 and IMM 5707 |
| R1b Case and answers | migration, `api/src/runtime/` case, people, answers, guard; `engine/runtime/` resolve, validate, rules; contracts | RT-1 to RT-12 pass and fail tests on real PostgreSQL |
| R1c Renderer | `web/src/runtime/` one component, SQR and agent modes, the §5 types, field and section messages, save and resume, "answering for" switch | the journey's questionnaire part at 390 px and desktop, axe clean |
| R1d Fill and never overwrite | generate in the worker, answer snapshot, labels, staleness, transitions, trigger | RT-13 to RT-17 pass and fail tests; the full journey |

---

## 10. File ownership

Runtime lane writes: `prisma/migrations/<date>_runtime_r1/`, the runtime block appended to `prisma/schema.prisma` (after F1 is on main), `api/src/runtime/`, `engine/runtime/`, `web/src/runtime/`, `contracts/runtime.ts`, `tests/runtime/`, `screens/R1-thin-slice/{plan,build-notes}.md`, `lanes/runtime.md` below the Lead's note.

Shared files R1 needs changed (requests to the Lead, smallest form):

| # | File | Change | Why |
|---|---|---|---|
| S-1 | `api/src/core.ts` | add Case officer and Client actors; `actorOf` refuses unknown headers instead of defaulting to the author | RT-12 deny by default (F-8) |
| S-2 | `api/src/main.ts`, `web/src/App.tsx` | register the runtime module and the new routes (`/cases`, `/cases/:id`, `/cases/:id/questionnaire`) | new routes only |
| S-3 | `engine/render.ts` | `Known.status` gains "declared"; coverage says "client answer" vs "verified"; no behaviour change for previews | F-7 |
| S-4 | `api/src/fill.ts` | extract the write-and-read-back step into one function both the preview fill and the case fill call (no duplicated logic, STANDARDS §7) | F-7 |

No edits to Screen 01–04 pages or the forms lane's files.

---

## 11. Questions for the founder (at most three, recommendation first)

FOUNDER_QUESTIONS_PLACEHOLDER

---

## Lead response
(empty)

## Agreement
(empty)

## Build discoveries
(empty)
