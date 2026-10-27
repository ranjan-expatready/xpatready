# S6 Shared library (W1-09): challenge and slice plan

Fresh reviewer, 27 Oct 2026, before BUILD. Sources were read in this order: **P-120, P-121, P-123** (with the Lead annotations: no confirm on canada.ca downloads, uploads read by rules first) and **P-116** in `DECISIONS.md`; **walkthrough v2 S6** (`design/walkthrough-s3-s7.html#s6`, marked OK); then `concept-draft.md` (older). Also read: `STANDARDS.md`, `EXPERIENCE.md`, `WAVE-1.md`, the forms lane's S4 challenge (`origin/forms/2026-10-27-s4-form-library`, 7677dfa), the Screen 04 re-check of 25 Oct, and today's code on `main` 76628a4. The studio folder is identical in this checkout. In this file, `app/` means `prototype/studio/`.

Team code was checked for retrofit in `code/ERv2-sanitized@fb76410-2026-10-19`. `freshness.sh` cannot match that copy to a live target, so it is marked **Unverified**. Which forms a combination needs, which choices a list has, and every cost estimate below are **Sample**, until the immigration expert confirms them (costs come from the saved run records). Each objection keeps the fact (with its file) apart from the judgment.

## Verdict
**Build after these changes.** The job is right, and so is the shape: one queue grouped by source form, three plain confidence words, bulk accept only where every check agrees, and one Add in plain words. Much of the plumbing exists: AI proposals stored per item, rules comparison with the library, the exact-duplicate check, generated system names, second-person library changes, the one publisher, and replay at US$0.

The design rests on four things the code does not have yet:
1. Drafts tied to a form in the library, not to a combination.
2. A checker round.
3. AI drafting for any master other than fields.
4. Shared conditions.

One example in the agreed design (P-120's `person.parent.date_of_birth`) would break the data model. The cost of recording the replays for Load sample is above the Wave 1 AI budget. There are 8 Major objections and 7 Minor ones, and no Blocker.

## Objections, ranked

### Major

**M1 · "About whom" would put a person's role into the field. This breaks "one meaning, one field".** *Needed for the proof.*
* **Fact:**
  * The shared field is "one meaning, independent of whose value it is (the same key for the applicant's and the partner's date of birth)" (`app/prisma/schema.prisma`, comment above `CanonicalField`).
  * The saved IMM 5707 draft maps the parents' dates of birth to `person.date_of_birth`, with the person on the box (`subject_parent_1`, `subject_parent_2`) (`prototype/p2/runs/c1-fieldmap-imm5707-live-*.json`).
  * The comparison strips role words before matching (`app/engine/normalize.ts`, `ROLES`). Its own rule: "a box keeps its own person".
  * The team's field carries `appliesToRoles` as a column, not in the key (`country-pack-questionnaire.prisma`, Unverified).
  * The key generator makes `group.name` (`app/api/src/library-changes.ts` `keyFor`).
* **What breaks:** the walkthrough's Add ("Mother's date of birth", about whom: Parent, gives `person.parent.date_of_birth`, as in P-120's example) would create a second field for a meaning already in the library. A parent's date of birth would then be stored apart from Date of birth. Questionnaires would ask it twice, and form fields would split across two fields.
* **Fix (judgment, high confidence):**
  * "About whom?" picks the **subject** (a person, the case, the employer, the representative). That sets the field's group and the duplicate check's scope.
  * Which person (Parent 1, Spouse) belongs to the form field or to the question's "who", never to the field.
  * The Add answers the example with: "Already in the library: Date of birth (used in 11 forms). Who it is about is set on each form field, for example Parent 1 on IMM 5707."
  * System names stay two parts (`person.date_of_birth`).
  * P-120's example needs a Lead annotation, like M2 of the S4 challenge.

**M2 · Proposals belong to a combination, so nothing can be drafted "when a form enters the library".** *Needed for the proof.*
* **Fact:**
  * `DraftingJob.combinationId` is required (`schema.prisma`, `DraftingJob`).
  * Every proposal (`NormalizationItem`) hangs off a job.
  * To review builds one row per job and attachment, titled with the combination's path (`app/api/src/review-queue.ts`, "AI proposals").
  * Apply also writes "the form in the combination" (`app/api/src/sources.ts` `apply`).
  * The library intake without a combination starts no draft (`app/api/src/main.ts` `POST /intake`; `intake.ts`).
* **What breaks:**
  * The walkthrough groups the queue "From IMM 5257 · Visitor visa". But IMM 5409, 5476 and 5475 serve all five combinations, so one form would be drafted, priced and reviewed up to five times.
  * A form uploaded straight into the library has no queue at all.
  * Since P-123, S4 attaches forms automatically, so apply must not attach them again.
* **Fix:**
  * One draft per **form edition** in the library. The trigger is the moment an edition becomes usable: an official download, an approved upload, or a reuse match.
  * The job's combination becomes optional. S4 slice 1 already makes the column nullable (S4 M7); reuse that change.
  * Proposals are grouped by edition. The "From" filter names the form and its edition ("IMM 5257, Sep 2023"), with "used by 1 combination" as a hint, not as part of the name.
  * A form already drafted (same fingerprint) is reused at US$0. That reuse exists today (`ai.ts`, `reuse_library`, `elsewhere`).
  * Accepting a proposal never attaches a form to a combination: that is S4's job.

**M3 · The three checks shown on every row do not exist. "Ready to accept" cannot be worked out.** *Needed for the proof (P-121).*
* **Fact:**
  * There is no checker round anywhere in the studio. The S4 challenge says so, and plans one only for the form finder and the upload.
  * Field-map proposals carry a rules outcome (REUSE · NEW · AMBIGUOUS · CONFLICT, from `normalize.ts`) and the drafting AI's own confidence. They carry no second opinion.
  * The saved runs that Load sample replays (`prototype/p2/runs`) are draft rounds only.
  * The ready-made "accept clean" accepts every exact reuse of one job, with no check by the rules engine (`sources.ts` `acceptClean`).
* **What breaks:** with no checker output, every row lands in Check or Decide. Bulk accept (P-121's main time saver) would never light up, live or in replay.
* **Fix:**
  * Add a checker step for drafts of the masters. It re-reads the form field's caption and the quoted line without seeing the draft's answer (P-121). Use the same guarded launcher, stub and replay.
  * The agreement rule is deterministic and tested, with a reason on every row:
    * **Ready to accept:** the rules pass (quote found on the form, outcome REUSE, or a clean NEW, see below), and both rounds give the same field (or the same new name, normalised), the same person and the same kind of answer.
    * **Check:** the same match, but the kind of answer or the section differs.
    * **Decide:** the rounds disagree, the outcome is AMBIGUOUS or CONFLICT, or any rule fails.
  * A clean NEW is a new name with no library candidate scoring 0.55 or above (the threshold `acceptClean` uses today).
  * Replays need a saved checker round too, so the recordings in M7 include it.
  * A row whose checker has not run says "Checker not run" and sits in Check, never in Ready.

**M4 · Only fields have an AI draft today. The queue's other five kinds have no producer.** *Needed for the proof. This is a sequencing point, not more scope.*
* **Fact:**
  * The only drafting operation is `draft_field_maps`. Its own note says: "Questions, sections, document requirements and rules are not AI-drafted here" (`app/api/src/ai.ts`, `plan`).
  * The checklist draft refuses live runs and its stub "proposes nothing" (`app/api/src/checklist.ts`).
  * `WAVE-1.md` puts that drafting under W1-10 (forms lane, after S4), status Not started.
* **Also:**
  * Answer lists and section groups can be read by the **rules** from the PDF itself. The form's own choices are read today with no AI (`forms.ts` `draftOptionMaps`, `formOptions`), and so are its subforms (`engine/twin.ts`).
  * That is the same "rules first" the founder chose for uploads (P-123, S4 M1).
* **Fix:**
  * S6 builds the queue for any proposal kind (`NormalizationItem.kind` already allows field, section, answer_list, document_requirement, rule, check).
  * S6 fills it first with fields (AI plus checker), and answer lists and section groups (rules, US$0; AI only names a section group as a proposal).
  * Document types, conditions and checks drafted from checklists and guides arrive through the same item contract when W1-10 delivers them (Lead question Q-L1).
  * Until then, the kind filter shows "Drafted from checklists: not built yet" instead of an empty tab.

**M5 · Accepting goes through three hand-offs today. Bulk accept, Undo and the second person need one path.** *Needed for the proof.*
* **Fact:** today a reviewer decides each proposal (`POST /jobs/:id/items/:item`, review duty). An author then applies the whole job (`POST /jobs/:id/apply`, author duty). Then **each** new field, section or document type waits as a `LibraryChange` for a different person, one page per item (`/review/change/:id`; `library-changes.ts` `decideChange`). Release is refused until all are approved (`unapprovedAdds`). Apply also refuses the whole job if *anything* in the library changed since the comparison ("Stale: the shared library changed…", `sources.ts` `apply`).
* **What breaks:**
  * In a library-wide queue, every accept on one form makes every other form's draft stale.
  * The walkthrough has no Apply step.
  * A second person facing a 49-row form with about 15 new items opens 15 pages: P-121's speed is lost on the second person's side.
* **Fix:**
  * **Accept writes the draft.** Each accepted item is re-checked on the server against the current library: the rules plus the stale check *for that item only*. It then writes its draft rows (the form field map, the new field with a `LibraryChange` ADD, and so on).
  * Items that fail stay in the queue with the reason (P-121).
  * "Accept selected (n)" is n such approvals in one request, with one batch id. **Undo** reverses that batch while its rows are still draft. Undo is refused, per item and with the reason, where a second person has already decided the item or another draft uses it.
  * The second person gets the same queue, filtered to "Waiting for a second person", grouped by form. Clean new items are approved in bulk; near duplicates (with their one-line reason, P-120) are approved one at a time. Each approval is still one `LibraryChange` decision on the server.
  * Whether this approval happens before release (today's gate) or at the release review (P-121's wording) is Lead question Q-L2.

**M6 · Conditions are copied into each combination, so a shared Conditions list cannot be "defined once".** *Needed for the proof. The shared check with a value per combination is not built.*
* **Fact:**
  * `Predicate.combinationId` and `Check.combinationId` are required (`schema.prisma`).
  * Conditions are also stored as inline JSON on `CombinationForm`, `DocumentRequirement` and `SectionQuestion`. "Where used" finds them by searching JSON text (`studio.ts` `field`, `sources.ts` `dependents`).
  * The team's `Predicate` has no combination and is *referenced* by questions, document requirements and stages (`country-pack-rules.prisma`, Unverified).
  * P-12 and `domain/RULES-MODEL.md` §2 say conditions are shared sentences.
* **What breaks:**
  * The walkthrough's Conditions list and its "Add a condition" would create a record no line uses.
  * Editing a condition would not reach its copies.
  * "Used in" counts would be guesses.
* **Fix (retrofit to the team's shape):**
  * The condition's combination becomes optional (expand-only), with a plain sentence, a status and an origin. Lines gain an optional reference to it.
  * A back-fill (migrate step) turns identical inline JSON into one shared condition with references. Inline stays readable until the contract step.
  * The Add takes the sentence ("If the person is married or common-law"). AI drafts the structured condition (draft plus checker), and `checkCondition` (`studio.ts`) validates it against the library.
  * The missing prerequisite stops the Add, as drawn ("needs the answer list Marital status first").
  * **Checks stay per combination in Wave 1.** The Checks list shows them grouped by name, with their combinations. The shared check with a value per combination (RULES-MODEL) is *not built*: nothing in the walkthrough's job needs it.

**M7 · Recording the replays costs more than the Wave 1 AI budget. Automatic drafting must state its cost first.** *Needed for the proof (P-110, P-121, S7 "Masters arrive as AI drafts").*
* **Fact (Sample, from the saved run records in `prototype/p2/runs`):**
  * A field-map draft costs about US$0.51 (IMM 5257). For combination 1: sections about US$1.05, checks about US$1.46, requirements about US$1.52.
  * Live field-map drafts are saved for IMM 5257, 5409, 5475, 5476, 5707 and 1344 only. About 12 more PDFs the five combinations need have none (5645, 5257 SCH1, 1294, 5646, 5710, 0008, 5669, 5406, 0008 DEP, 5562, 5532, 5604).
  * The checker round roughly doubles each cost (P-121).
  * The US$40 Wave 1 cap is not counted in code (S4 m4).
* **Estimate:**
  * Fields for every form, with checker: about US$18.
  * Document types and conditions from the 4–5 checklists, with checker: about US$15.
  * Checks for all five combinations, with checker: about US$15.
  * Section names: about US$1.
  * **Total about US$49, Sample.** That is above US$40 before S4's live tests.
* **What breaks:**
  * Load sample cannot replay masters that were never recorded.
  * A trigger that drafts automatically "when a form enters" would spend without stating the cost first (P-110).
* **Fix:**
  * The plan that starts setup (S3/S5) or an upload (S4) states the finder cost and the drafting cost together, once (a cost line, not a confirmation of forms). A reused edition costs US$0.
  * Live recording runs once, logged per form, and stops at the cap.
  * The budget is founder question Q1.

**M8 · Typed system names and ungoverned writes are still open on three masters. Retire skips "where used".** *Needed for the proof.*
* **Fact:**
  * The Fields page asks for "Key: area.name in lower case" and posts it (`app/web/src/pages/library.tsx`; `POST /api/library/fields` in `main.ts`, through `studio.ts` `createField`).
  * `POST /api/library/answer-lists` takes a typed key, writes no `LibraryChange`, and is published at release with no second person (`forms.ts` `createAnswerList`; `studio.ts` "lists: await publish…").
  * `LIBRARY_KINDS` covers field, section, document_type and check only (`library-changes.ts`).
  * Retire is a direct `PATCH /library/fields/:key {retire}` with no "where used" step and no second person (`studio.ts` `updateField`).
  * The P-116 lifecycle covers structure names and combinations only (`lifecycle.ts`, `LIFECYCLE_KINDS`).
* **What breaks:**
  * P-120: nobody types technical names.
  * P-15 and P-53: every addition is approved by a different person.
  * P-116: retire is refused while in use, and "Where used" is shown first.
* **Fix:**
  * Each Add (field, answer list, section, document type, condition, person role) goes through the one plain-words Add, and through `LibraryChange` and the one publisher. The kinds `answer_list`, `condition` and `person_role` are added.
  * The typed-key routes return 405, with a test each.
  * Delete, Retire and Restore for fields, sections, document types and answer lists reuse `lifecycle.ts` (where used first, refusals listing each use, a second person for retire).

### Minor

**m1 · Person roles are a fixed list of three, and form-only people are not roles.** *Needed for the proof.*
* **Fact:** `ROLES = ["principal", "spouse_or_partner", "child"]` (`app/contracts/runtime.ts`). Form fields name people who are described on a form but never take part in the case (`subject_parent_1`, designated individual, custodian).
* **Fix:**
  * One Person roles list (P-123: addable through the one Add; Sample until the expert confirms).
  * Each role is marked "takes part in a case" or "described on forms only". P-119's "Who can be in this application" offers only the first kind.
  * AI never invents a role: it proposes one with the quoted line, and a person adds it.
* **Sequencing:** S5 (runtime lane, now in DESIGN) is the first to read roles. Either S5 creates the record, or S6 slice 3 lands before S5 builds its role picker (Lead).

**m2 · Two rows of tabs on To review.** *Needed for the proof.* Today's To review has Needs you · Waiting for others · Running · All (`app/web/src/pages/to-review.tsx`). The walkthrough adds Ready to accept · Check · Decide, which breaks EXPERIENCE §2.2.
* **Fix:** the confidence tabs appear only in the AI proposals view, which opens filtered "From <form>". Releases, held files, merges and new editions keep the state filter. In To review, an AI proposals row opens that view.

**m3 · The system name is on the main path.** EXPERIENCE §5 rules out keys on the main path. **Fix:** show the generated name under "Details" in the Add dialog, read-only (P-120's "read-only" still holds).

**m4 · Section names are a hand-written file in the code.**
* **Fact:** `contracts/pdf-sections.json` holds Sample labels for the forms written so far. STANDARDS §3.1 says content is data.
* **Fix:** the rules read each PDF's section groups. AI proposes the name (draft plus checker), which a person accepts into `LogicalSection`. The file becomes the replay of saved names, not a source.

**m5 · Whether the AI "did you mean" is on or off by default.** P-95 left the meaning check off by default; P-120 shows it on every Add. Typed words cannot be replayed.
* **Fix (Lead):** turn it on in Wave 1 at about US$0.01 per Add (Sample), with the cost shown and counted in the cap. When it is off: "Not checked by AI for meaning". The exact-duplicate, synonym and same-form-field rules always run.

**m6 · Load sample brings masters in from an old release, a stand-in for "AI drafts them" (P-33).**
* **Fact:** `app/api/src/demo.ts` `loadSteps` reads a reviewed release's `configuration.json`.
* **Fix:** S6's proof starts from Reset with an empty library: the first form fills the queue with "New" items, and the second shows reuse. S7 removes the import; S6's journeys never depend on it.

**m7 · Size and Undo limits.**
* About 20 forms of 50–150 proposals each gives 1,000–3,000 rows. One request per view returns the counts per form and kind plus one page of rows (STANDARDS §5, §9).
* "Select all" means all rows in this filter on the server, and the button shows the server's count.
* Undo is per batch and says which items it could not reverse (M5).

## What is sound
* One queue grouped by the form a proposal came from, and "finish one form at a time": it matches how a content publisher works and the Source + proposals pattern (EXPERIENCE §3).
* Ready to accept · Check · Decide, with the three checks on each row: clear, honest, and right to keep bulk accept to full agreement (P-121).
* One Add in plain words, rules before AI, an exact duplicate refused with where it is used, a near duplicate kept with a one-line reason: the exact-duplicate rule, `sameName` and `keyFor` already exist and are tested.
* The setup order kept as a numbered menu with counts, a prerequisite stop in the Add, and one help diagram instead of a page: less to build, same purpose.
* "Nothing enters the library until a person accepts it", the second person, and release as the only publisher: these match STANDARDS §3.8 and the code's `LibraryChange` and publisher.
* Wave 1 adds Answer lists, Conditions and Person roles; the other 11 masters stay "Later". The right cut.

## Back-end plan (element → record → API → rule → test)
| Element | Record (expand-only changes in bold) | API | Rule | Test (pass · fail) |
|---|---|---|---|---|
| Draft when a form enters (M2) | `DraftingJob` (**`combinationId` nullable**, shared with S4 M7; **`formEditionId`**) · `NormalizationItem` (exists; **`formEditionId`** set) | started inside S4's intake/finder run; `POST /api/library/forms/:edition/draft` to redo | one draft per edition fingerprint; a reused edition costs US$0; cost stated in the starting plan (M7) | IMM 5409 used by 5 combinations → 1 job · same edition again → reuse, no model call · no cost line → refused |
| Checker round (M3) | `DraftingJob` kind **`field_map_check`** (detail holds the checker's answers) | same batch as the draft | checker sees caption + quote, never the draft's answer; stub and replay | stub checker disagrees on 1 item → that item in Decide · checker given the draft's answer → test fails |
| Confidence words (M3) | computed, not stored | `GET /api/review-queue/proposals?form=&kind=&tab=&cursor=` | Ready = rules pass + both rounds agree; Check = same match, one detail differs; Decide = otherwise | each tab's reason on its row · a CONFLICT never appears in Ready |
| Answer lists, section groups (M4) | `NormalizationItem` kinds `answer_list`, `section` (payload) | inside the draft step | read from the PDF by rules (choices, subforms); AI names a section group only | IMM 5257 box 3a gives 6 choices, US$0 · a free-text box gives no list |
| Bulk accept + Undo (M5) | **`NormalizationItem.acceptBatchId`**; draft rows as today; `LibraryChange` ADD per new item | `POST /api/proposals/accept {ids}` → per-item results; `POST /api/proposals/undo {batchId}` | one approval per item; rules + per-item stale check on the server; Decide items refused in bulk; Undo only while draft and undecided | 34 accepted, 1 made stale meanwhile → 33 accepted, 1 queued with reason · Decide item in a bulk request → refused · Undo after a second person approved → that item refused |
| Second person (M5) | `LibraryChange` (exists) | `POST /api/library/changes/approve {ids}` (one decision per id) | approver ≠ proposer ≠ applier (exists); near duplicates one by one | maker approves → 403 · bulk approve with a near duplicate → that one refused |
| One Add (M1, M8) | `LibraryChange` (**kinds** `answer_list`, `condition`, `person_role`) | `POST /api/library/:kind/check` (rules, then AI "did you mean") · `POST /api/library/:kind` | subject decides the group, never the person; exact name, synonym or same form field → 409 with where used; reason needed for a near duplicate; system name generated | "Mother's date of birth", about a person → "Date of birth already exists" · typed key → 405 |
| Shared conditions (M6) | `Predicate` (**`combinationId` nullable**, **`plain`**); lines **`predicateKey`** reference; back-fill migration | `GET/POST /api/library/conditions` | validated by `checkCondition`; a missing answer list stops the Add; where used = references | "married or common-law" → valid condition on marital status · condition on a missing list → stopped with the list named |
| Person roles (m1) | **`PersonRole`** (key, label, takes part in a case, Sample basis) | `GET/POST /api/library/roles` | never AI-invented; P-119 offers only "takes part" roles | add Custodian (forms only) → not offered in "Who can be" · second person required |
| Remove, retire (M8, P-116) | `retiredAt` / status on each master | `GET …/:key/uses`, `DELETE …/:key`, `POST …/:key/retire|restore` | `lifecycle.ts` rules, extended to the library kinds | delete unused never-released → gone · retire used → refused with each use |
| Menu counts, help | computed | in `GET /api/review-queue/proposals` counts | counts per master = items waiting | counts equal the rows in each tab |

## Slice plan
1. **Fields, end to end, from a library form.**
   * Data: a draft per edition (M2), the checker step and the agreement rule (M3), the proposals queue API, bulk accept and Undo (M5), grouped approval for the second person.
   * Screens: the one Add for fields with the subject fix (M1); typed-key routes closed and retire by lifecycle for fields (M8); To review's AI proposals view with the three tabs and the Fields list.
   * Proof: from Reset, stub and replay only. Live: one form (IMM 5257, about US$1, Sample) once the cap counter exists.
2. **Answer lists and sections by rules.**
   * Answer lists and section groups read from the PDF (US$0), with AI section names.
   * Answer lists and Sections lists with the Add and the lifecycle.
   * The `LibraryChange` kinds and the publisher, so answer lists stop skipping the second person.
3. **Conditions and Person roles.**
   * The shared condition record and back-fill (M6), the Add from a sentence, and the prerequisite stop.
   * Person roles (m1), timed against S5.
   * The numbered menu and the help diagram.
4. **Drafts from checklists and guides.** Document types, conditions and checks arrive in the same queue from W1-10's drafts; the Checks list is read-only and grouped.

Recordings follow the founder's answer to Q1 and run after slice 1. Each slice ends with scripted journeys, a pass and a fail test for every rule, axe on every state, 1024 px and 200 % zoom. S6 stays off S4's library-form files except the shared nullable column, and syncs `main` after S4 slice 1 merges.

## Questions

**For the founder (recommendation first):**
* **Q1 · AI budget for recording the library drafts once (Sample estimate about US$49 against the US$40 Wave 1 cap).**
  * *Recommend:* raise the Wave 1 cap to US$60 for one logged recording pass, stopped at the cap. Every form, checklist and check is drafted with its checker round once, and replays at US$0 afterwards.
  * *Else:* stay at US$40. Draft fields for every form and document types for every checklist, but checks for combination 1 only. The others show "Not drafted yet" with the cost of drafting them.
  * *Scenario:* after Load sample you open To review and see "From IMM 5532: 61 proposals · Ready 44 · Check 11 · Decide 6" for every form, not only the visitor visa's.

**For the Lead:**
* **Q-L1 · Who drafts document types, conditions and checks from checklists and guides (M4)?**
  * *Recommend:* W1-10 stays with the forms lane after S4, writing into S6's item contract. S6 builds fields, answer lists and sections first.
  * *Else:* fold W1-10 into S6.
* **Q-L2 · Where the second person approves new items (M5).**
  * *Recommend:* in S6's queue, grouped by form, before release (today's gate kept, bulk for clean new items). The release review shows what was bulk-accepted (P-121).
  * *Else:* only at the release review.
* The Lead is also asked to annotate P-120's example (M1).

## Lead response
2026-10-27 (Lead). Challenge by a fresh agent the Lead launched (screen-challenge skill), checked against main 76628a4.
* **M1 accepted.** "About whom" picks the subject on the form box; the field keeps one meaning (`person.date_of_birth`, P-62). The Lead annotated P-120's example.
* **M2 accepted.** One draft per form edition, sharing S4's nullable `DraftingJob.combinationId` (S4 M7); S6 syncs main after S4 slice 1 merges.
* **M3 accepted.** The checker round and the agreement rule are built once, in S4 (P-121); S6 reuses them; saved replays are re-recorded with checker output (budget: Q1).
* **M4 accepted.** Answer lists and section groups read by rules from the PDF (US$0); AI names sections; other kinds arrive from W1-10 (Q-L1).
* **M5 accepted.** Accept writes per item, one Undo per batch, grouped approval for the second person.
* **M6 accepted.** Shared condition record with references and a back-fill; checks stay per combination in Wave 1.
* **M7 accepted.** Every automatic draft states its cost first together with the finder cost (a cost line, not a confirmation of forms); recording runs once, logged, stopped at the cap. Budget: founder Q1.
* **M8 accepted.** Typed keys closed; answer lists go through the second person; field retire uses lifecycle "where used" (P-116).
* **m1–m7 accepted as written.** m1 Person roles: **S5 creates the Person roles record** (it is the first screen to read it); S6 adds the one Add for roles on top of it. The runtime lane is told.
* **Q-L1:** agreed, W1-10 stays with the forms lane after S4 and writes into S6's queue. **Q-L2:** agreed, in S6's queue grouped by form, before release; the release review shows what was bulk-accepted.
* **Team code Unverified (freshness.sh):** noted; the retrofit check is re-run on the newest team capture before S6 BUILD.
* **Q1 (budget): founder chose US$60** (27 Oct, recorded on P-110): one logged recording pass, stopped at the cap.
* **Order:** S6 builds after S4 slice 1 merges and after S2 merges (its lane is screens). Stage stays DESIGN until then.

## Agreement
Agreed 2026-10-27 (Lead; founder on Q1). BUILD starts after S4 slice 1 and S2 merge.

## Build discoveries
_(empty)_
