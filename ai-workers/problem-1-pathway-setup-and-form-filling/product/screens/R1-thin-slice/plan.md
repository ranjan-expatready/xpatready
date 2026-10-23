# R1 — Thin end-to-end slice · runtime lane PLAN (23 Oct 2026)

Concept `concept.md` (Lead). Decisions P-18, P-33, P-45 as corrected by P-65, P-47, P-62 §6, P-65, P-67, and since the concept **P-71** (only the form's own Validate and missing or conflicting facts block "ready to file"), **P-72** (only confirmed facts fill; officer confirms by section; a client's own typed answers count as confirmed for the client's fields), **P-73** (a wrong mapping is reported, never blocks the case). Backend path: PLAN → BUILD → CHECK → FIX → MERGE. Forms slice 1 is on `main` (answer lists, option maps, aliases), so BUILD can start. Read: concept; PRODUCT, STANDARDS, EXPERIENCE, QUALITY, WORKFLOW; P-47 and P-65 in full; CAPABILITIES C4.4, C6.1–C6.3, C7.1–C7.2; the app (`prisma/schema.prisma`, `api/src/{main,core,studio,fill,forms,sources,demo}.ts`, `engine/{render,snapshot}.ts`); the saved IMM 5257 run and slice-1 evidence; the team's models `code/ERv2-sanitized@22f1d12-2026-10-19/apps/api/prisma/models/` (read-only). Immigration values are **Sample** until the immigration expert confirms; legal points "Unconfirmed: no counsel".

## 1. Challenge (fresh agent, skill screen-challenge) — full text in `challenge.md`
**Verdict: Build after these changes.** One Blocker, nine Major, six Minor; team-model claims Unverified (capture 22f1d12 is behind live `dev`). B1 (the visitor-visa questionnaire asks almost nothing IMM 5257 needs) is the same gap the builder measured (F-3); §4.5 already closes it inside R1a, so **no Blocker remains open after this plan**. Majors: P-72 confirmation missing (M1); "asked once" holes (M2); team mapping (M3); newest-release reads would change open cases (M4); never-overwrite states undefined (M5); the IMM 5257 fill trial gates "ready to file" (M6); overlap with merged F1 and the visitor-visa filing channel (M7); missing question types (M8); concurrency and access (M9). Builder check: M2's "contact rows have no row number" is not so in the saved run (rows 0 and 1); M7's online IMM 5257 is an F1 test fixture, not a channel decision.

## 2. What the builder measured in the code
| # | Fact (evidence) | Consequence |
|---|---|---|
| F-1 | Visitor visa is not set up: the loader attaches IMM 5257, IMM 5707, IMM 5484, guide 5256, visa package page, IMM 5881 and stops (`samples/programs.json`, `vv.single`; participants principal 1, spouse 0–1, children 0–4) | Lane copy configures and releases it first (§4) |
| F-2 | A saved live IMM 5257 run exists; replay is US$0 (`p2/runs/studio-fieldmap-imm5257e-live-20261021t060247723z.json`, `sources.ts` REPLAY). 242 boxes: 161 mapped, 65 not a fact, 14 unresolved, 2 never filled; 84 fields | Release path available without paid AI |
| F-3 | After the 21 Oct decisions: 0 errors, **91 warnings** — ~31 fields "read by a box, nobody is asked", and placements in sections the visitor visa does not select (`evidence/slice-1-imm5257-live/composition.json`) | Released as is, the questionnaire would be incomplete; setup selects sections and places fields (§4) |
| F-4 | Placements are library-wide, one per field (`studio.ts` `placeField`, lineage = field key) | Placing a field for the visitor visa also changes the work permit's next draft (correct: defined once); Lead to know |
| F-5 | IMM 5257's 84 facts: text 28, date 19, choice 15, country 9, yes/no 9, address 3, number 1; transforms add phone parts (18 boxes), day/month/year parts, month-and-year dates, 200-character limits, CAD text; four repeating groups (previous residences 2, education 1, occupation 3, contacts in Canada 2) | The concept's type list misses phone, email, money, long text, month-and-year and more than one repeating group (§5) |
| F-6 | 12 identity facts (names, sex, birth date, citizenship, passport ×4, national ID ×4) are "collected from verified document"; the renderer never asks the client for them (`render.ts` l.134); document reading is not built | Officer enters them in the agent view from the document seen and confirms the section (P-72), §3 R-3 |
| F-7 | Fill reads sample profiles and writes only `confirmed` facts (`fill.ts`, `render.ts` `Known`); option maps already applied from the release snapshot | R1 adds the case as a source of facts; P-72 "confirmed" = client's own answers on client fields + officer-confirmed sections |
| F-8 | Unknown actor header falls back to the configuration author (`core.ts` `actorOf`) | Breaks deny-by-default for client endpoints; request S-1 |
| F-9 | Team spine has **no Case table** (bare `caseId`), `ClientCanonicalAnswer` has no `caseId`, `FormInstance.generationState` is only PENDING · RENDERED · FAILED (`client-spine.prisma` 245–269, 335–336, 638–712) | Divergences D-1…D-9 in §7 |
| F-10 | IMM 5257 inventory has no box lengths (`max_chars` null for all 233 fields); limits only in transforms | Length checks read the transform limit |
| F-11 | P-65 (c) signed-PDF states are prepare → printed → sent for signature → signed copy received → uploaded; (d) protects signed, uploaded, submitted. Concept words differ (Draft · Generated · Signed · Uploaded) | R1 builds Draft (computed) · Generated · Locked (validated copy uploaded back · filed) · stale (§3 M5); printed, sent for signature, signed copy stay M3 |
| F-12 | Choice fields fill through F1 answer lists + option maps (`snapshot.ts` l.143, `fill.ts` l.45); the visitor-visa choice fields have no answer lists yet; `POST /library/answer-lists` exists (`forms.ts`) | Setup creates or reuses answer lists for every choice and country field (§4.5) |

## 3. Builder's response: what changes from the concept
| Point | Builder's answer (where in this plan) |
|---|---|
| B1 + F-3 | Accepted: §4.5 places every mapped fact, selects sections, and resolves or marks each unmapped box; acceptance 0 "nobody is asked"; previous-spouse boxes needed only when "previously married" is yes (Sample household: no) are listed "by hand" with the reason. The authoring screen (Screen 03) is not built, so the scripted setup stands in for a person on the existing Library placement page (Scaffolding, P-33) |
| M1, F-6 (P-72) | Accepted: RT-10 "Confirm section"; status DECLARED (client's own fields, counts as confirmed) · VERIFIED (officer confirmed); fill writes confirmed only and lists the rest. Identity facts: the officer types them from the document seen and confirms the section. "Answering for" edge: founder question 1, default as recommended so BUILD is not held |
| M2 | Accepted 1 (people not on the case: boxes listed "by hand", null-party subjects Not built), 3 (no split facts inside one visitor-visa case), 4 (visit facts once per case, Sample, expert to confirm per applicant). Rejected 2 (evidence above) but rechecked after replay |
| M3 | Accepted: per-party answers, AnswerSnapshot, ClientFactRecord rows, one FormInstance per generation with the person's party. Pin per **(case, combination)**, unique, so a multi-combination case (TAXONOMY §4 case 2) needs no rework; per-person pins add nothing for one combination |
| M4 | Accepted: every runtime read and the case fill take the pin, never the newest release; merged-away keys: pinned cases keep theirs, new cases follow the redirect (RT-2) |
| M5, F-11 | Accepted, replacing the concept's states: Draft = computed answer sheet; Generated = immutable rows, a new generation only on the officer's request, as a worker job; Locked = "validated copy uploaded back" or "filed", by the officer; stale when the snapshot differs. No automatic regeneration (a file may be open in Adobe); the draft view updates at once with a message (P-45). Signed-PDF states stay M3 |
| M6 | Accepted: label "Checked copy, not for filing (IMM 5257 fill trial pending)" until the evidence lane's trial passes; request to the Lead to run IMM 5257 next |
| M7 | Accepted: case fill in a new `api/src/runtime/fill-case.ts` calling `p5/fill.py` unchanged and `engine/options.ts` read-only (S-4 becomes optional); answer lists in §4.5; channel → the immigration expert via the Lead (R1 labels IMM 5257 "Sample: PDF upload") |
| M8 | Accepted: §5 types; setup sets the value types (phone, email, money, month_year, long_text, family_name, given_names) on the shared fields through the field edit page, so the renderer reads them from data |
| M9 | Accepted: RT-5 expected version and 409; RT-12 deny by default |
| m1–m6 | m1, m2 accepted (§4, journey); m3 and m4 go to the Lead (P-65 §8 record; renderer owner = runtime, path `web/src/runtime/`, to record in LANES); m5 accepted: the spouse's IMM 5257 is generated too (US$0); m6 Not built |

## 4. Configure and release the visitor visa in this copy (never :4400)
Own database and ports: `zsh prototype/studio/tools/isolated.sh runtime_r1 4430 start`. Every step calls the endpoints the screens call, as the simulated personas; the founder can repeat it on the screens. Scripted as `tests/runtime/setup_visitor_visa.ts` (Scaffolding, P-33), which fails loudly on any unexpected response.
| Step | What | Who | Label |
|---|---|---|---|
| 4.1 | Reset, Load sample inputs (files attached and read, no AI) | Author | Loader = Scaffolding |
| 4.2 | Draft IMM 5257 by replaying the saved run (US$0, labelled replay) | Author | Drafting path Capability; replay Scaffolding |
| 4.3 | Decide as on 21 Oct (34 reuse and 22 new as groups, 28 individual per the slice-1 README); apply | Author | Capability |
| 4.4 | Reuse IMM 5707 from the library | Author | Capability |
| 4.5 | Select sections; place the ~31 unasked fields (text, help, per person / row / case, collected from, conditions); answer lists and option maps for choice and country fields; value types phone, email, money, month_year, long_text, family_name, given_names on the shared fields (field edit page); section checks of §5 as data. Target 0 errors, 0 "nobody is asked" for IMM 5257 and IMM 5707 | Author | Capability; values Sample |
| 4.6 | Submit → reviewer signs the SME duty → a different approver releases | Author, reviewer, approver | Capability |

## 5. Question types and validation the visitor-visa questionnaire needs
From what IMM 5257 and IMM 5707 read (F-5). Not built in R1 (no visitor-visa need): multi choice, period history with gap check, document upload, declaration, AI review (tier 3).
| Type | Examples | Field check (message under the field) |
|---|---|---|
| Short / long text | birth city, employer · immigration, criminal, military details | required by rule; ≤ transform limit (200 for details), counter on long text |
| Money (CAD) | funds available | whole dollars ≥ 0, ≤ 12 characters |
| Date day/month/year · month and year | birth date, passport dates, stay, status from/to · education and occupation from/to | a real date; birth date not future; "from" not after today |
| Yes / no · single choice · country | refused visa, health · sex, marital status, visit purpose, residence status, phone type · citizenship, passport country | value from the field's answer list; radio ≤ 5 values, select above; country searchable |
| Phone · email | telephone, alternate, fax · email | country code + digits, split as the form's `phone_part` needs · one @ and a domain |
| Address group · name group | mailing, residential, contact in Canada · family and given names | street, city, country required · family name required; "no given name" option |
| Repeating group (four) | previous residences, education, occupation, contacts in Canada | add, edit, remove; rows beyond the form's capacity kept and flagged "does not fit on IMM 5257" |
Section checks (summary at the top linking to fields): expiry after issue (passport, national ID); stay "to" after "from"; status and each row "to" not before "from"; union date after birth date. Rules from the release: show/hide (details after "yes", "other" text, spouse section only with a spouse and marital status married or common-law), required, per person, per row, once per case. **Validation never blocks saving; per P-71 only the form's Validate and missing or conflicting facts on that form block "ready to file".**

## 6. Records (team names; `workspaceId` stands in for `firmId`; no row-level security in the prototype)
| Record | Key columns and constraints |
|---|---|
| `Case` | combination, reference (Sample), status, createdBy, `version` (optimistic concurrency) |
| `PackWorkPin` | case + combination (unique), principal party, `packVersionId`, `configReleaseId`, `contentHash` (= release sha), purpose, revision 1, actor, pinnedAt; insert-only |
| `Party` + `PartyProfile`, `PartyRelationship` | person; displayName (Sample), locale, contact channels; principal → spouse/child edges, self-edge refused |
| `AnswerSubject`, `CaseParticipant` | whom an answer is about (principal · spouse_or_partner · child · case); case role, travelling yes/no, order; counts within the pinned release's min/max |
| `ClientCanonicalAnswer` | party, subject, `canonicalFieldId` (exact version row) + key, `caseId` only for case-level facts, `valueJson`, status DECLARED · VERIFIED, `effectiveAt`, `supersededById`, `sourceJson` {channel, actor, at}, verifiedBy/At; **partial unique** current per (subject, field, case) in raw SQL; edit = insert + stamp old, one transaction |
| `ClientFactRecord` + `ClientFactValue` | one repeating row: subject, `groupKey`, order, tombstone, supersede; values per sub-field, unique (record, field); correction = new record version |
| `AnswerSnapshot` | the values one generation read: case, party, resolved answers, pack version, config versions, purpose FORM_GENERATION, captured by/at; insert-only |
| `FormInstance` | team columns (case, party, edition, generationState, workPin, answerSnapshot, template/input/output hashes, storage key, renderer version, failure code, idempotency key) + `lockKind` (null · VALIDATED_COPY_BACK · FILED), `lockedBy/At`, `supersededById`, `label`; **trigger**: output columns write-once; a locked row never changes |
One expand-only migration after F1's, recorded rollback (drop new tables). Indexes: answers by (case, subject), instances by (case, person, form).

## 7. Mapping to the team's client spine (`client-spine.prisma`, newest capture)
| Ours | Team (lines) | Differs (adapter) |
|---|---|---|
| `Party`, `PartyProfile`, `PartyRelationship` | 20–142 | D-9 workspace for firm; no merge tombstone, import key, key registries |
| `AnswerSubject` | 218–234 | ours always has a Party; team allows null party |
| `Case`, `CaseParticipant` | none (bare `caseId` 338, 467, 660) | D-1, D-2 real tables; the team's `caseId` columns would point here |
| `PackWorkPin` | 462–512 | D-6 pinned per case (team per party); no `countryId`; `configReleaseId` added; ADOPT (move to a newer release) Not built |
| `ClientCanonicalAnswer` | 245–269 | D-3 key kept beside id; D-4 `caseId` for case-level facts (visit purpose, stay, funds, contacts): team has no home — **Unverified, ask the team** (`CaseAnswerOverride` or a case table) |
| `ClientFactRecord`/`Value` | 278–331 | D-5 `groupKey` (section of the per-row placements) for the team's COMPOSITE field; port = one composite field per group |
| `AnswerSnapshot` | 367–399 | D-8 purpose FORM_GENERATION added; `AnswerSnapshotEntry` Not built |
| `FormInstance` | 655–712 | D-7 `lockKind`, `lockedBy/At`, `supersededById` for P-65 (d); map version stamp = release sha + edition sha |
| Questions, answer lists | `LogicalSection`, `SectionQuestion`, `SqrSectionSelection`, `EnumSet` | already mirrored (studio, F1) |

## 8. Back-end table (element → record → API → rule → test)
API `/api/runtime`, contracts `contracts/runtime.ts` (zod), Problem Details errors. New actors: **Case officer**, **Client** (principal, answering for the family). Configuration actors cannot touch cases.
| Element | Record | API | Rule | Tests (pass · fail) |
|---|---|---|---|---|
| Open case | `Case`, `PackWorkPin` | `POST /cases` {combinationId, idempotencyKey} | RT-1 released combinations only; pins the latest release; idempotent | opens on visitor visa · draft-only → 409; same key twice → one case |
| Frozen pin | `PackWorkPin` | `GET /cases/:id` | RT-2 a later release never changes the case | after a v2 adding a question, case still shows v1 · removing the pin check fails it |
| People | Party, Profile, Relationship, Subject, Participant | `POST/PATCH /cases/:id/people` | RT-3 within the pinned min/max; one principal | principal + spouse + child · second spouse 422; fifth child 422 |
| Questionnaire | engine view | `GET /cases/:id/questionnaire?mode=sqr\|agent&subject=` | RT-4 each (person, fact) asked once however many forms and boxes read it | spouse family name asked once, fills principal's spouse box and spouse's own IMM 5257 and IMM 5707 · duplicate question fails |
| Answer | `ClientCanonicalAnswer` | `PUT /cases/:id/answers/:subject/:field` {value, expectedVersion} | RT-5 one current answer (DB + service); edit supersedes, history kept; stale version 409 with current value | two rows, one current · concurrent first answers: one wins, other 409 |
| Field check | engine `validate` | same PUT | RT-6 checked by type (§5); invalid values saved and flagged | each type valid · invalid with message; removing a type check fails its test |
| Section check · rules | release checks, predicates | questionnaire view | RT-7 cross-field checks per person; RT-8 show/hide/require; a hidden answer is kept, never written, and the view says why | expiry before issue listed · after "no", details kept and not written |
| Repeating rows | `ClientFactRecord`/`Value` | `POST/PUT/DELETE …/groups/:subject/:group/rows[/:rowId]` | RT-9 stable row ids; remove = tombstone; overflow kept and flagged | three jobs fill rows 1–3 · fourth flagged, not dropped |
| Confirm (P-72) | answer status | `POST /cases/:id/sections/:section/confirm` {subject} | RT-10 client's own answers on client fields count as confirmed; other facts (identity, officer-entered) fill only after "Confirm section"; officer only | confirmed passport fills its box · unconfirmed one stays blank with "not confirmed"; client confirm → 403 |
| Agent edit | answer | same PUT, source agent view | RT-11 updates every draft output reading the fact, with a message naming them (P-45); Undo = supersede back; editing a confirmed fact needs reconfirming the section | birth date edit names IMM 5257 and IMM 5707 · client reaching agent view 403 |
| Roles | guard | every endpoint | RT-12 deny by default: unknown actor 401; client only own case and questionnaire; officer only the workspace's cases | each allowed call · client reading another case, author answering → 403 |
| Generate | `AnswerSnapshot`, `FormInstance` | `POST /cases/:id/forms/:form/:subject/generate` {idempotencyKey}, in the worker | RT-13 writes confirmed facts only (P-72) through the append-only writer; read back equal; signatures intact; missing facts listed, not refused | principal's IMM 5257 written and read back equal · tampered output → FAILED, no file |
| Ready to file (P-71) | `FormInstance.label` | `GET /cases/:id/forms` | RT-14 blocked only by the form's Validate (IMM 5257 fill trial, P-65 (a), evidence lane) and missing or conflicting facts on that form; until the trial passes the label is "Checked copy, not for filing" | label from the evidence lane's status · forcing "ready to file" with a missing fact → refused |
| Out of date | `FormInstance` | same | RT-15 a copy whose input hash differs from current confirmed answers is "out of date" with the changed facts; the draft view updates at once; a new copy only on the officer's request (new row, old kept); every read uses the pinned release | stay date change → old copy out of date, regenerate gives a new row · old file hash unchanged; no automatic regeneration |
| Never overwrite (P-65 d) | `FormInstance` + trigger | `POST /form-instances/:id/lock` {kind} | RT-16 a locked copy (validated copy uploaded back, filed) never changes; a later fact change marks it stale; officer only; an out-of-date copy cannot be locked | locked copy stale, bytes and row unchanged · direct SQL update refused by trigger; client lock 403 |
| Audit | `AuditEvent` | — | RT-17 every answer change, confirm, generation, transition recorded; **answer values never in audit text or logs** | events present · search of audit rows and logs for a sample value finds none |
Engine (pure, `engine/runtime/`): `resolveCase` builds `Known` from current confirmed answers and calls `render()`; `validate`; `sectionChecks`; `inputHash`; `staleness` returns the changed facts; every output says why. Property-based tests for `resolveCase` and `staleness`. "Report a mapping problem" (P-73) is Not built (backlog B28, M4); a wrong box never blocks anything in R1.
Journey (scripted API + Playwright at 390 px and desktop, axe on every state, no paid AI): officer opens a case, adds spouse and child → client answers on a phone, one group per screen, leaves and resumes → officer enters passport facts, confirms sections, corrects a date → generates the principal's and the spouse's IMM 5257 (the spouse's name appears once as an answer and on both) → locks the principal's as "validated copy uploaded back" → changes the stay date → the locked copy is stale, the spouse's is out of date, regenerate gives a new copy.

## 9. Slices inside BUILD (one commit each; BUILD ends at CHECK)
| Slice | Contents | Done when |
|---|---|---|
| R1a Setup | §4 in `runtime_r1`; `setup_visitor_visa.ts` | released; 0 "nobody is asked" for IMM 5257 and IMM 5707 |
| R1b Case and answers | migration; `api/src/runtime/` case, people, answers, confirm, guard; `engine/runtime/` resolve, validate, rules; contracts | RT-1…RT-12 pass and fail on real PostgreSQL |
| R1c Renderer | `web/src/runtime/` one component, SQR and agent modes, §5 types, messages, save and resume, "answering for" | questionnaire part of the journey at 390 px and desktop, axe clean |
| R1d Fill and never overwrite | `fill-case.ts`, worker generation, snapshot, labels, out of date and stale, lock, trigger | RT-13…RT-17 and the full journey |

## 10. File ownership
Runtime writes: `prisma/migrations/<date>_runtime_r1/`, the runtime block appended to `prisma/schema.prisma`, `api/src/runtime/`, `engine/runtime/`, `web/src/runtime/`, `contracts/runtime.ts`, `tests/runtime/`, this item's `plan.md`, `challenge.md`, `build-notes.md`, and `lanes/runtime.md` below the Lead's note. Shared-file requests to the Lead: **S-1** `api/src/core.ts` add Case officer and Client actors, `actorOf` refuses unknown headers (F-8) · **S-2** `api/src/main.ts`, `web/src/App.tsx` register the runtime module and routes `/cases`, `/cases/:id`, `/cases/:id/questionnaire` · **S-3** `engine/render.ts` coverage words "client answer" / "confirmed by officer"; previews unchanged (F-7) · **S-4** (optional, forms lane's file) `api/src/fill.ts` extract the write-and-read-back step so preview fill and case fill share it; until then `fill-case.ts` calls `p5/fill.py` and `engine/options.ts` directly. **S-5** record the renderer's owner (runtime, `web/src/runtime/`, later used by Screen 03's preview) in LANES. No edits to Screen 01–04 pages or forms lane files.

## 11. Questions for the founder
1. **When the principal answers for the family, which answers count as confirmed (P-72)?** *Recommend:* the principal's own and a minor child's answers count as confirmed; an adult spouse's section waits for the officer's "Confirm section". Why: a spouse is an adult who signs or declares for themself; a parent answers for a minor anyway. **Does not hold BUILD**: built as recommended, one rule to flip.
No other founder question. For the Lead: run the IMM 5257 fill trial next in the evidence lane (M6); ask the immigration expert whether the visitor visa is filed as an uploaded IMM 5257 PDF or online, and whether visit facts (funds, stay dates) are per applicant (M7, M2); ask the team where case-level answers live (D-4).

## Lead response
All changes in §3 accepted, including the B1 fix (complete the visitor-visa questionnaire as step 4.5; acceptance: nobody-is-asked count 0) and the state names Draft · Generated · Locked · stale (P-65 words to be aligned in the decision page later). S-1 granted: the runtime lane may change `actorOf` in `api/src/core.ts` to deny unknown actors (one function, with a test). Founder question 1 goes to the founder; build on the recommendation meanwhile (principal's and minor child's answers count as confirmed; an adult spouse's section waits for the officer). Expert questions (channel for the visitor visa; visit facts per applicant or per case) added to the Lead's list. IMM 5257 fill trial is the evidence lane's current form.
## Agreement
Agreed 23 Oct (Lead), slices as in this plan; BUILD R1a now.
## Build discoveries
(empty)
