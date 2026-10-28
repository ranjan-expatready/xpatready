# S6 Shared library (W1-09): PLAN (29 Oct, screens lane; design only, no code)

**Inputs:**
* The spec: `challenge.md` (8 Major, all accepted 27 Oct) and the re-check `recheck-2026-10-28.md` (R1–R5, r1–r6).
* The founder's answer to Q1: **P-138** (drafting only on a click). Also P-139 and P-140.
* The Lead's approval (29 Oct) of the queue item contract `contracts/proposal-item.ts` (forms lane, e3fe8770), with three conditions:
  * one new `ProposalItem` table, with field proposals moved onto it;
  * rules-only items may be Ready but are never bulk-accepted onto the library;
  * the filing channel is not a queue item.
* The forms lane's step runner `api/src/rounds.ts` + `engine/rounds.ts` (619eaac4, on `claude/forms-r69-fix-4af07a`, read-only here).
* The W1-10 plan (forms lane, 29 Oct).

**Code checked:** branch `claude/screens-s3-fix-a78d1d` at 28d78cdc = main db5e0208 plus S3 and DV-bb (Lead PR #76). A fresh agent re-verified every fact in the re-check against that code (R-109); the results are in §1.

**Sample and counsel:** every count, choice, cost and form below is **Sample** until the immigration expert confirms it. Legal points: Unconfirmed: no counsel.

**Labels:** **Capability** = production keeps it. **Scaffolding** = proof only: seeding, Sample data, replayed answers; never ported (WORKFLOW §Definition of Ready).

## 1. Fresh re-check (R-109): what moved since 28 Oct
| Re-check point | Now | Evidence (`app/` = `prototype/studio/`) |
|---|---|---|
| R1 live drafting on entry or on a click | **Closed by P-138** | Founder 29 Oct: a saved draft replays at US$0; otherwise "Draft fields with AI (about · at most)", live only on the click |
| R2 one pair of rounds | **Done by forms (slice 0)**, not on main yet | `StepRunner.round(step, isCheck, ctx)`; the finder uses it on the forms branch; `compareRounds` unchanged (`engine/agreement.ts:16`) |
| R3 queue item contract | **Approved** | `contracts/proposal-item.ts`: 11 kinds, source quote, both rounds, rules, agreement, confidence, status, basis |
| R4 S5 before roles | **Closed** | S5 on main: `PersonRole` (`schema.prisma:194`), `GET /library/roles` (`workspace.ts:142`); no add or retire ("adding a role is S6's", `workspace.ts:3`) |
| R5 reuse shared pieces | Holds | Run card `RunCard({runId, onEnded, onDismiss})`; Add pop-up `AddToStructure` (`components/add-to-structure.tsx:47`); lifecycle `RowAction`, `BlockedLine`, `WherePanel`, `ImpactPanel`, `useUndoToast` (`components/lifecycle/index.tsx`); `costWords` (`contracts/start-setup.ts:21`); `aboutUsd` (`api/src/finder-cost.ts:22`); `ConfigReadGuard` with `@CaseRead` (`core.ts:67–74`) |
| M1 subject on the box | Open; **the column exists** | `FormFieldMap.person` (`schema.prisma:493`); the contract's field payload carries `subject` and `formBox` |
| M2 per edition | Open | `DraftingJob.combinationId` nullable (`schema:853`); `ai.ts:39,74–98,250` still per combination |
| M3 checker for fields | Open (runner ready) | `draft_field_maps` has one round (`ai.ts:150`) |
| M4 producers | **+1** | `draft_from_checklist` (`checklist.ts:32`, stub only) besides `draft_field_maps`, `screen_map`, `find_forms`, `upload_form` |
| M5 one accept path | Open | Per item (`sources.ts:621–663`), "accept clean" (`sources.ts:690`), one `LibraryChange` per new field (`sources.ts:741`), approval one at a time (`screen02.ts:149`); no batch Undo, no grouped approval |
| M6 shared conditions | Open | `Predicate.combinationId` required (`schema:786`) |
| M7 caps | **Code behind decision** | `EXPERIMENT_CAP_USD = 100` (`p2/policy.ts:70`); P-139 says US$120 (Wave 1 US$60 matches, `:74`). Lead item, not S6 |
| M8 typed keys, ungoverned writes | Partly | Fields and sections go through `LibraryChange`; `POST /library/answer-lists` writes no `LibraryChange` (`forms.ts:364,149`); field retire (`studio.ts:419`) has no where-used check |
| m2 To review tabs | **Closed** | One chip group and one kind filter (`to-review.tsx:16,53,66`) |
| m4 hand-written sections, m6 Load sample from p3 | Open | `contracts/pdf-sections.json` (used by `engine/twin.ts:5`); `demo.ts:25` reads `p3/releases/c1-v3` |
| r1 menu | Open | No numbering (`App.tsx:39–49`); library: Fields, Sections, Document types, Forms, Checks |

**New, found now:**
* **N1 (Major) · A saved replay is found by combination.** The runner finds a saved answer by `combinationKey` (`engine/rounds.ts savedRunKey`, `isSameSavedRun`). S6 drafts per form edition with no combination. *Fix:* S6 passes an edition key (`edition:<code>:<edition>`) as the context key. The forms lane confirms that the runner's naming covers it (the field stays `combinationKey` or is renamed `ownerKey`, their call). The old per-combination field-map runs (`c1-fieldmap-imm5707`…, `studio-fieldmap-imm1344e`…) can serve the draft round only through the runner's reviewed `legacyKeys` list. They have no checker round, so items from them are `one_round`, which means **Decide** until the logged recording pass.
* **N2 (Minor) · Old kinds on `NormalizationItem`.** The table holds `field · section · document_requirement · rule · check · answer_list`. When rows move to `ProposalItem`:
  * `document_requirement` becomes `requirement_line`;
  * `check` becomes `form_check`;
  * `rule` has no kind in the contract. It is used by no producer on main, so its rows are listed and dropped (none in Sample data after Reset).

## 2. The five re-check Majors, answered
* **R1 · When drafting starts.** P-138, with no S6 choice left.
  * Capability: a saved draft for that edition replays at once at US$0.
  * Capability: otherwise the form's row (Form library) and its group header (queue) offer one button, "Draft fields with AI (about US$x · at most US$y)", in `costWords`. Live runs only on the click and are refused when the worst case is above what is left of either cap.
  * Scaffolding: the Load sample recording pass is the one logged exception.
* **R2 · One pair of rounds.** S6 writes no round code. A new `AiStep` named `field_map_edition` (draft and blind checker templates, shape check) runs on `StepRunner.round` twice. The two answers go through `compareRounds` with the rules (shape, quote found in the file, P-62 key words, exact-duplicate check). Result: `agreement` and `confidence` per item, per the contract. Capability.
* **R3 · The queue.** S6 slice 1 builds the `ProposalItem` table on the contract (§3) and moves field proposals onto it. Its writer and accept services are the one way in for every producer:
  * S6's own kinds: field, answer list, section, form check, person role;
  * W1-10's kinds: condition, requirement line, cross check, comes from, PQR pick, and document type.
  W1-10 builds against the contract, not S6's screens. Capability.
* **R4 · Order.** S5 and S3 are on main (S3 through #76). Slice 3 (roles, conditions) needs nothing else. Conditions wait only for slice 3's shared record (M6), which also unblocks W1-10 slices 3 and 5.
* **R5 · Reuse.** A source scan check per slice: no second run card, cost wording, Add dialog, lifecycle row or Undo toast in S6 files.

## 3. Back end: element → record → API → rule → test
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Queue item | `ProposalItem` (new): `id, workspaceId, kind, batchId` (AiBatch), `step, formEditionId?, combinationId?, landsOn, reuseMatch, existingKey?, payload, source?, rounds, rules, agreement, confidence, reason?, origin, status, decidedBy/At/Reason?, decisionBatchId?, resultRef?, basis` | `GET /review/proposals?form=&kind=&confidence=` (ConfigRead) | Every row parses as the contract's `ProposalItem` | a row of each kind parses / a row missing `source` with origin ai is refused at write |
| Move off `NormalizationItem` | migration copies field rows (N2 mapping), then readers switch (`sources.ts`, `review-queue.ts`, `programs.ts`, `ai.ts`, `library-changes.ts`, `demo.ts`, `checklist.ts`); the old table is dropped in the same slice | none | Not two tables (Lead) | the count before equals the count after / no reader of `normalizationItem` is left (source scan) |
| Draft per edition | `DraftingJob` with `formEditionId`, `combinationId` null; `AiBatch` op `draft_form_fields` | `POST /library/forms/:edition/draft/plan` and `…/draft` (`mode: replay\|live`, `planSha256`) | P-138: saved replays, live only on a click, cost first, both caps | the replay is US$0 and its items land / live with no click is refused; over a cap is refused before any call |
| Agreement | `rounds`, `rules`, `agreement`, `confidence`, `reason` | in the item | Ready = rules pass and both rounds agree; Check = same item, a detail differs; Decide = otherwise or `one_round` | agreed → Ready / checker differs on type → Check; one round → Decide |
| Quote | `source.quote`, `quoteFound` | in the item | P-121: no quote found → dropped and listed on the run card | quote in the PDF text / an invented quote is dropped |
| Accept, edit, reject | item `status`, `decision*` | `POST /review/proposals/decide {items:[{id, action, payload?, reason?}]}` | Re-checked on the server per item; reject needs a reason; landsOn library → a `LibraryChange` WAITING with the batch id | accept writes one change per item / reject without a reason → 400 |
| Bulk accept | same | same, `action: accept` for many | Only `confidence = ready` **and** not (`origin = rules` and `landsOn = library`) (Lead); at most 200 a batch | 20 Ready accepted / one Check in the batch → whole batch 400, nothing written |
| Undo a batch | `decisionBatchId` | `POST /review/proposals/undo {batchId}` | Within 10 s and while its changes still wait; withdraws them (round-3 toast, QA-58 rule) | Undo returns the items to waiting / Undo after the second person decided → refused, says why |
| Grouped approval | `LibraryChange` by `decisionBatchId` | `GET /review/changes?group=batch`, `POST /review/changes/batch/:id {approve\|return, reasons}` | Second person ≠ author (P-116); approve all or return item by item | group approved / the author approves own → 403 |
| One Add | `LibraryChange` ADD per kind | `POST /library/add {kind, words, subject?, formBox?}` | The key is generated, never typed (m3); exact duplicate refused; "did you mean" by rules (meaning check off, P-95) | "date of birth" of the parent proposes `person.date_of_birth` with subject parent / typed key field → 400 |
| Subject on the box (M1) | `FormFieldMap.person` | via accept or Add | The field keeps one meaning (P-62) | accepted box has person "parent" / no `person.parent.*` key is ever made |
| Typed-key routes (M8) | none | `POST /library/fields`, `/library/answer-lists` closed (410, "use Add") | | 410 / Add works |
| Answer lists through the second person | `LibraryChange` kind `answer_list` (new) | Add and accept | M8 | list waits for a second person / not usable before approval |
| Field retire (M8) | lifecycle kind `field` | `POST /library/fields/:key/retire` with impact | Where used first; takes effect at approval (P-116 amended, QA-64) | unused field deleted with Undo / used field: retire waits, says when it takes effect |
| Person role Add (m1) | `PersonRole` + `LibraryChange` kind `person_role` | Add | Built-in roles cannot be retired; label unique | new role "Sponsor" waits / retiring "Child" refused |
| Shared condition (M6) | `SharedCondition` (new): key, sentence, tree, basis; `Predicate.sharedConditionId` + back-fill | Add from a sentence; read with where used | Never copied per combination (W1-10 R-5) | two combinations reference one / editing one shows both in "where used" |
| Acceptance rate | from items' `step` and `status` | `GET /ai/steps/acceptance` | P-130 §6.3: flag a step under 70 % | 8 of 10 → no flag / 6 of 10 → flagged |

**Team model (retrofit):** the team keys the field map by form edition (`/pack-admin/forms/{editionId}/field-map/…`, capture `ERv2@2bcde9c`) and registers `CANONICAL_FIELD` with localized labels. `ProposalItem` has no team equivalent; it maps to their AI suggestion review once one exists. **Unverified** for live drift (freshness.sh not in this checkout).

## 4. Slices
| Slice | What | Label | Needs | Cost |
|---|---|---|---|---|
| **1 Queue and fields** | `ProposalItem` + move off `NormalizationItem`; the queue page grouped by form (Ready · Check · Decide, side panel with both readings, quote, rules); decide, bulk (Ready only), batch Undo, grouped approval; draft per edition on `StepRunner` (N1 key); "Draft fields with AI" on the form row and group; the one Add for fields with the subject (M1); typed-key fields route closed; field retire on the lifecycle | Capability | the runner on main (forms slice 0 merged); Lead answer on N1 | US$0 (stub, replay, legacy draft rounds) |
| 1-S | Load sample replays per-edition drafts through the same queue and rules (P-121 "no demo bypass"); the per-combination legacy files are listed in `legacyKeys` | Scaffolding | slice 1 | US$0 |
| **2 Answer lists and sections** | Rules read choices and section groups from the PDF (`origin rules`, `rules_only`: Ready, one at a time onto the library); AI names sections (one `AiStep`, replay first); answer lists through `LibraryChange`; Add and lifecycle on both lists; `pdf-sections.json` becomes the replay (m4) | Capability | slice 1 | US$0; live naming on a click |
| **3 Roles and shared conditions** | Person role Add and retire on S5's record; `SharedCondition` + back-fill of `Predicate`; Add from a sentence with the prerequisite stop; numbered menu (r1) and the help diagram | Capability | slice 1 | US$0 |
| **4 W1-10's kinds arrive** | No new S6 code beyond rendering each kind's payload in the side panel; the Checks list read-only with where used (C3.14) | Capability | W1-10 slices 2–5 | US$0 |
| R (after 1) | One logged recording pass of field drafts with the checker for the Sample forms; read the remaining Wave 1 cap first and stop at it | Scaffolding (the recording); the spend is the proof | founder's go on the amount (Q1) | about US$1 per form, Sample; the Sample library holds about 8 forms (`samples/form-library-sample.json`) plus those the finder adds → about US$8–12 |

**Every slice ends with:**
* scripted API and browser journeys;
* a pass and a fail test per rule, with check labels naming C11.13, C11.14, C3.1, C3.2, C3.4, C3.6, C3.7, C3.13, C3.14 and C11.9 (P-86);
* axe on every state, 1024 px and 200 % zoom;
* the R5 source scan;
* the full run-suites with the web rebuilt first;
* the reviewer and breaker at CHECK.

## 5. Ownership
* **Screens lane (S6):**
  * `ProposalItem` and its migration;
  * `api/src/proposals.ts` (writer, decide, Undo, grouped approval) and `contracts/review-queue.ts` additions;
  * the queue page, library lists, Add and retire;
  * `SharedCondition`;
  * the reader switch in `sources.ts`, `review-queue.ts`, `programs.ts`, `ai.ts`, `library-changes.ts`, `demo.ts`.
* **Forms lane:**
  * owns `contracts/proposal-item.ts` (S6 reads it; any change goes through the forms lane and the Lead);
  * owns `rounds.ts` and the finder;
  * moves `checklist.ts` onto the writer in W1-10 slice 2 (S6 slice 1 only re-points its two writes, reviewed by forms).
* **Runtime lane:** reads `PersonRole` and `SharedCondition`. S6 tells it before slice 3 changes either.

## 6. Questions
**For the founder (recommendation first):**
* **Q1 · The one recording pass for field drafts (slice R).**
  * *Recommend:* yes, after slice 1, for the Sample forms. About US$8–12 (Sample; about US$1 a form with its checker, about 8 forms plus those the finder adds), inside the Wave 1 cap, stopped at what remains.
  * *Else:* no pass. Loaded forms show their old drafts as Decide (one round), and each form drafts live only when someone clicks.
  * *Scenario:* after Load sample, To review shows "From IMM 5257: 48 proposals · Ready 31 · Check 12 · Decide 5", not "Decide 48".

**For the Lead:**
* **Q-L1 (N1) · Edition key in the step runner.** *Recommend:* the forms lane confirms that `edition:<code>:<edition>` passes as the runner's context key, and names the field. It is a one-line change in their file, made before S6 slice 1.
* **Q-L2 · The runner on main.** S6 slice 1 builds on `rounds.ts`. *Recommend:* merge forms slice 0 before S6 slice 1 BUILD. *Else:* S6 branches from the forms branch, which ties the two merges.
* **Q-L3 · Experiment cap in code (M7).** `p2/policy.ts` says US$100 and P-139 says US$120. *Recommend:* the forms lane, as owner of `p2/`, sets it with a test.
* **Q-L4 (N2) · `rule` rows.** *Recommend:* drop them in the move (no producer, none in Sample data). *Else:* map them to `condition`.
* **Q-L5 · Menu numbering (re-check r1, still open).** *Recommend:* one numbering through Configure and Shared library in setup order.

## Lead response, agreed 29 Oct
* **Q-L1 yes:** the forms lane adds the edition key (`edition:<code>:<edition>`) to the runner and names the field.
* **Q-L2 yes:** forms slice 0 (the runner and the contract) reaches main by Lead PR before S6 slice 1 BUILD. S6 branches from main after that.
* **Q-L3 yes:** the forms lane sets `p2/policy.ts` to US$120 (P-139), with a test.
* **Q-L4 yes:** the move drops the `rule` rows (no producer, none in Sample data). The migration logs how many it dropped.
* **Q-L5 yes:** one numbering through Configure and Shared library, in setup order.
* **N1 and N2 accepted.**
* **Founder Q1:** goes to the founder with the Lead's recommendation, yes. Slice R waits for that answer; slice 1 does not.
* **Stage:** the Lead agreed the PLAN within decisions already agreed. BUILD slice 1 starts once forms slice 0 is on main; the Lead messages the lane. Nothing to build until then. US$0.
