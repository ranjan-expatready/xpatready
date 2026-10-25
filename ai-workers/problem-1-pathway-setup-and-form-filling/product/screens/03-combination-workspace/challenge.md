# Screen 03 — Combination workspace · feasibility challenge (runtime lane, DESIGN, 25 Oct)

Short challenge (top 5, `/next` DESIGN) of `concept.md` (Lead-agreed 25 Oct) and `design/draft-workspace.html`, checked against the app on main 8360565 (`prisma/schema.prisma`, `api/src/studio.ts` + `main.ts`, `engine/render.ts`, `engine/runtime/case.ts`, `web/src/pages/*`). Facts are marked **Fact** (read in the code); judgments **Judgment** with confidence.

## Verdict
**Build after these changes.** The concept is sound and buildable on today's records; five points change how it is built (one renderer, slice order, three missing records, coverage gate, lane overlap). None needs a founder decision except the substitute-set seed (question 1).

## Objections (ranked)

### 1. Major · Needed — Preview by person would not show "the same resolution as runtime" (BR-15)
* **Fact:** `studio.preview()` calls `engine/render.ts` `render()` directly; the runtime questionnaire goes through `engine/runtime/case.ts` `caseView()`, which wraps `render()` and adds placement order (F-R1c-1: `render.ts` sorts by label, so the preview shows "That status ends on" before "started on"), groups with entries, "none apply" (P-71/P-72), section checks (RT-7) and confirmations.
* **Breaks:** an author previews combination 3 and sees an order, groups and checks the client will not see; BR-15's own fail test would pass by accident.
* **Fix:** Preview by person builds an unsaved case (Sample family, tweaks as answers) and calls `caseView()`; the web view reuses `web/src/runtime/questionnaire.tsx` in read-only mode ("Show facts and the form fields they fill" = its agent mode, Q3). Fix the order once in `render.ts` (carried F-R1c-1) so both callers agree; an engine test compares preview vs runtime output for the same family. Confidence high.

### 2. Major · Needed — Three masters the concept relies on have no record yet (links, "filled by", substitute sets; plus PQR marks and Sponsor)
* **Fact:** links are `ProgramDef.linkLabel` text only (on the program node, not the combination); `CanonicalField` has no "filled by" (the nearest is `SectionQuestion.collectedFrom`, per placement); `DocumentType`/`DocumentRequirement` have no substitute set; PQR has only the library-level `SectionQuestion.tier = prospect`, nothing per combination; `Combination.participants` roles are principal · spouse_or_partner · child · representative (no sponsor), and runtime `CaseParticipant.role` follows them.
* **Breaks:** BR-9, BR-11, BR-12, BR-14 and combination 3's Sponsor cannot be shown with real data; a board-only element would be scaffolding standing in for a capability (P-33).
* **Fix (one migration per slice, additive):** `CombinationLink` (kind, combinationId, targetId, facts[], documents[], version; self-link and Follows-loop refused in the service); `CanonicalField.filledBy` (CLIENT | CASE_OFFICER, revised through `revise()` like other field edits, where-used count from `SectionQuestion` × `SqrSectionSelection`; `collectedFrom` stays the placement's source); `DocumentSubstituteSet` on the document type (mode any_one | all_of, members) + `DocumentRequirement.substituteSetKey`; `CombinationPqrField` (combinationId, canonicalFieldKey, reason, origin) refused when not in the SQR; `sponsor` added to the role list, marked Sample for the expert. `linkLabel` stays as a fallback label until every link exists, then is dropped. Confidence high.
* **Substitute sets:** authoring is Screen 04. Until then the sets are seeded as Sample data and labelled **Scaffolding** (picking one on a line is the capability). See question 1.

### 3. Major · Needed — BR-7 "release blocked until every needed fact is covered" can dead-end the demo and break released combinations
* **Fact:** needed facts per role come from `FormFieldMap` of the combination's forms for that role; "asked" = questions in the selected sections; "officer" = filled by case officer; "carried" = link facts (new). `validate()` today has no coverage problem, and the visitor-visa release that the runtime journeys use was released without it.
* **Breaks:** once coverage is a blocking validator problem, (a) a re-release of an existing combination with one unmapped box is refused with no fix on this screen if the gap is a library section; (b) run-suites `--demo` (21/21) and the R1 journeys re-release Sample combinations and may turn red.
* **Fix:** coverage is a `validate()` problem only for facts that a form box needs **for a role the combination has**; each problem names the fact and offers the three fixes (add a section, mark case officer, carry by link) with links; run the coverage check against every Sample combination in slice 1 and fix the Sample data (not the rule) before the gate goes live. Confidence medium (depends on how many boxes in the sample maps lack a question).

### 4. Major · Needed — Eight tabs and ~10 new endpoints are too much for one slice; propose the slice order
* **Judgment (high):** BUILD slice 1 must be real end to end for EARLY-LOOK; the full concept is four back-end slices.
* **Proposed slices:** **S1** route `/c/:id/:tab` (BR-1), `GET …/workspace?tab=`, Overview and Forms (who, copies, minimum age, only if, signed by; channel and portal reuse Screen 01's `components/channels.tsx` and `forms.tsx`), Preview by person on `caseView` (point 1). **S2** SQR tab: coverage (point 3), filled by, Sponsor role. **S3** Documents (line from a question, BR-3; substitute set pick) and Links (BR-12, carried facts pre-filled "please confirm"). **S4** Copy from / bulk add-remove with dry run (BR-13), PQR (BR-14), Rules tab, Review and release (BR-16; the shared release guard QA-1 is already on main — `studio.ts` release check "Not submitted for review"). Each slice keeps a pass and a fail test per rule.

### 5. Minor · Needed — Overlap with the screens lane (Screen 02) and Screen 01's components
* **Fact:** `web/src/pages/combination.tsx` holds today's five tabs incl. Sources; Screen 02 (screens lane, now) takes Sources/To review; `api/src/studio.ts` is one service both lanes edit.
* **Fix:** new code in new files (`api/src/workspace.ts` service + controller, `web/src/pages/workspace/<tab>.tsx`), `combination.tsx` becomes the tab shell; the Sources tab is removed only after Screen 02 merges (until then Overview links to it). Reuse `components/channels.tsx`, `forms.tsx`, `next-step.tsx`, `status.tsx` unchanged; any change to them goes through the Lead. Confidence high.

## What is sound
* One line shape with origin and "because" (BR-2/3) fits the existing versioned line tables (`CombinationForm`, `DocumentRequirement`: lineageKey + version + supersedesId), so draft changes, 409 on a stale `version` and Undo-until-submitted (BR-13) need no new model.
* Filing and signature method derived from lines (BR-6) already exist in `engine/channels.ts`; only "Signed by" (Q2) is new data.
* Author ≠ approver and one server release guard (BR-16, QA-1) are on main.
* PQR as questions only, no verdict (P-76 option C) is simple: a marked subset rendered in PQR mode.
* The concept adds no AI cost: AI stays in the next-step card.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Tabs | — | `GET /combinations/:id/workspace?tab=` | BR-1 | known tab renders / unknown → Overview |
| Form line who, copies, min age, only if, signed by | `CombinationForm` + `copies`, `minAge`, `signedBy` (new version per change) | `PATCH /combinations/:id/forms/:line` {…, version} | BR-2, BR-4, Q2 | saved as a new draft version / stale version → 409 with what changed |
| Preview by person | unsaved case (no rows) | `GET /combinations/:id/preview?family=&person=&tweaks=` | BR-15 | preview = `caseView` output for the same family / order by placement, not label |
| Coverage | derived (`FormFieldMap`, sections, `filledBy`, links) | `GET /combinations/:id/questionnaire?role=` | BR-7 | all covered → releasable / one uncovered box → release refused naming the fact |
| Filled by | `CanonicalField.filledBy` | `PATCH /library/fields/:key` {filledBy} | BR-9 | where-used count returned / background or declaration field to officer refused |
| Sponsor role | role list + Sample label | existing combination PATCH | expert list | sponsor accepted / unknown role refused |
| Document line from a question | `DocumentRequirement` + `originQuestionKey`, `substituteSetKey` | `POST /combinations/:id/requirements` | BR-3, BR-10, BR-11 | line with origin / unknown type → "Describe what you need"; set from another type refused |
| Links | `CombinationLink` | `GET|POST …/links`, `PATCH|DELETE …/links/:linkId` | BR-12 | link saved / self-link and Follows loop refused on the field |
| Copy / bulk | line versions per combination | `POST /lines/bulk/preview`, `POST /lines/bulk` {idempotencyKey}, `POST …/lines/copy` | BR-13 | dry run lists outcomes, nothing written / impossible channel listed and skipped; replayed key does nothing |
| PQR | `CombinationPqrField` | `PUT /combinations/:id/pqr` | BR-14 | SQR question marked / non-SQR question refused |
| Release | existing | `POST /combinations/:id/submit`, `…/approve`, `/pack/release` | BR-16 | different approver releases / self-approval and unsubmitted refused |

## Questions for the founder (≤3, recommendation first)
1. **Substitute sets before Screen 04 builds their authoring:** recommend seeding two or three Sample sets (labelled Scaffolding, values Sample for the expert) so a document line can pick one now; the alternative is to hide the "Accepted documents" column until Screen 04.

## Lead response
25 Oct (Lead, cloud). All five points accepted. The one founder question is settled by the Lead's Screen 04 decision, so none is open.
* **1 → accept.** Preview by person builds an unsaved case and calls `caseView()`. The web view reuses `questionnaire.tsx` read-only, with agent mode as "Show facts and the form fields they fill". F-R1c-1 is fixed once in `render.ts`, and an engine test compares preview and runtime output for the same family.
* **2 → accept, with two Lead changes.**
  * **Substitute sets:** no seeded Sample sets. Every document line defaults to the set "this document alone", which is a real capability. Named sets arrive from Screen 02's checklist drafts and show read-only on Screen 04 (Screen 04 challenge M9). The set schema (`DocumentSubstituteSet`, `DocumentRequirement.substituteSetKey`) is this lane's; Screen 04 reads it.
  * **Filled by:** this is a change to a shared field, so it goes through the screens lane's `LibraryChange` once that merges (Screen 02 slice 2: a second person approves, where used shown). Until then it goes through `revise()` with the where-used count, and it moves onto `LibraryChange` in the next FIX pass after that merge.
  * **Sponsor:** added as a role, marked Sample; the expert question "is Sponsor a person role (combination 3)" is already on the list.
* **3 → accept.** Coverage blocks only for facts a form field needs for a role the combination has. Each problem names the fact and the three fixes. Slice 1 runs it against every Sample combination and fixes the Sample data, never the rule, before the gate goes live. `run-suites --demo` must stay 21/21.
* **4 → accept slices S1–S4** as proposed. EARLY-LOOK after S1 is the Lead's (P-89).
* **5 → accept.** New code goes in new files, and `combination.tsx` becomes the tab shell. The Sources tab is removed only after Screen 02 merges. Shared components change only through the Lead.
* **Question 1 → no founder question:** "this document alone" as the default set, as above.

## Agreement
Agreed 25 Oct (Lead, under P-89). BUILD S1.

## Build discoveries
