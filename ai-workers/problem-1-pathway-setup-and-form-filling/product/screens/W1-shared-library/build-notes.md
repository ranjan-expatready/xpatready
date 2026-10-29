# S6 Shared library: build notes (screens lane)

## Queue item (2a), 29 Oct: no free add, sources, where used, rename (P-158 items 1 and 6; C3.6, C3.13, C3.15)
Built on main's tables, before forms PR #90 (the one door, item 5 and the rule source wait for slice 1).

**What changed**
* `POST /library/fields`, `/library/sections`, `/library/answer-lists` answer **410** "Not added by hand", saying where the item comes from instead (`api/src/library-sources.ts` `noFreeAdd`). `Studio.createField` and `createSection` are removed. `Forms.createAnswerList` (forms lane's file) is left unreachable: the forms lane may drop it or reuse its checks for note b's source door.
* `GET /library/:kind/:key/sources` (kinds fields, sections, document-types, answer-lists): each source line and where the item is used.
  * Field: every form box that reads it (`From: IMM 1295 (09-2023) form field "Family name"`), then the release or AI run it came with (`source_ref`; the AI run ids as small print).
  * Section: the forms its questions read, and its release (sections are proposed from the forms' parts only in slice 2).
  * Document type: each checklist line, quoted (`From: checklist IMM 5488`, `Guide 5487`, or the file's name in words).
  * Answer list: the form boxes whose fields take it.
  * No line → `unsourced: true`, shown as "No source recorded" (P-162 fail case), never blank.
* The list endpoints carry the same, shortened per row (`source`, `more_sources`, `unsourced`, `used_in`), read in one query per table.
* Rename, direct and versioned, no second person (C3.15):
  * `PATCH /library/fields/:key/name {name}` sets the field's name (label, `labelChecked`). A name or alias another field in the group has is 409 (the database's name index backs it).
  * `PATCH /library/sections/:key {name}` renames a section; another section's title is 409.
  * Both need the author duty and log "renamed".
* Pages (`web/src/pages/library.tsx`):
  * the Add field dialog and the Sections add bar are gone;
  * one "Where these come from" line on Fields, Sections and Document types;
  * the row's source under its meaning (or name);
  * where used: combinations by name on Sections and Document types, a count on Fields;
  * the field page has a Name box with Rename, and "Where it comes from" with "Used in combinations";
  * Sections has a Rename dialog.
  * A field's list name is its confirmed name, else the name from its key (back-filled labels like "Uci" are not shown).

**Tests**
* `check_s6_library_sources.ts` 24/24 (API) and `check_s6_library_pages_browser.cjs` 33/33 (1440 and 1024, axe, screenshots in `screenshots/2a/`).
* `tests/seed_library.cjs`: the setup helper for checks that need an extra item. It writes the item as a source would, into the check's own copy: a draft naming its source, a waiting ADD and an activity line.
* Checks changed because they used the free adds:
  * screens: `check_screen02_fix.ts` (M3 is now "410, nothing written"), `check_studio_browser.cjs` B6 (no Add on Sections; the new section is seeded; `STUDIO_DB` names the copy's database);
  * other lanes' files, needed for the 410 and listed for their owners: `check_forms_channels.ts` (forms: the three answer-list create checks become one 410 check; the lists and fields are seeded), `check_ai_orchestration.ts` (the "added by someone else" field is seeded), `tests/runtime/setup_visitor_visa.ts` (runtime: answer lists from IMM 5257's own choices and the two new sections are seeded).

**Full suites (5b00ae99):** 67 PASS 4 FAIL, all four from (2a), all fixed and rerun green.
* P-63: no page says "box", so the sources say "form field".
* QA-65: the 410 routes name their person first.
* A1: `check_ai_drafting` counts the one typed-key check left.
* QA-71: `check_screens_qa_1029_browser` reads the Category column itself.

**Open, for the Lead**
* **Sections from scratch.** Until slice 2 proposes sections from the forms' parts, a workspace started without the sample has no way to get a section. So a from-scratch combination cannot place a question, and BR-11 holds its release. The checks seed sections. The demo path (sample inputs) is not affected.
* P-162's format part ("Format: not read yet") and the completeness function (item 7) are not in (2a).
* A document type's name is not renamed here. Document types come only from checklist lines.

## Slice 1a, 29 Oct: the `ProposalItem` table and the one door (P-149; C11.13, C11.14, C3.2, C3.6)
**What it is.** One table, `proposal_item`, in the shape of contract v2 (`contracts/proposal-item.ts`), and one module, `api/src/proposals.ts`, that is the only way in:
* `insertProposals(db, workspace, items)`: parses each item against the contract, refuses a run that is not one of the workspace's steps, checks identity at write, writes all or none.
* `decide(…, ids, accept | edit | reject, reason)`: one batch id per call, at most 200 items. Accept or edit runs `LANDERS[kind]` in the same transaction and checks identity again. A reject needs a reason. An accepted item is never decided again in place (409: "an approved item changes only as a revision").
* `undo(batchId)`: only the person who decided, only within 10 s, only while every ADD still waits. It removes the landed draft rows and the ADDs; the items become `undone` (the contract's word).
* Landers today: field, section, answer list, document type. Each writes the draft row and a WAITING `LibraryChange` with `batch_id` and `proposal_item_id` (two new columns). The combination kinds and `person_role` have no lander yet (409, the item stays waiting): `pqr_pick` is 1c, the rest W1-10.

**Identity, per kind (Lead, 29 Oct).** A field, section or person role by its name (`normalizeLabel`), an answer list by its set of codes (order ignored), a document type by its name and what it proves. The server computes the key and refuses a producer key that differs. Refused at write: two items of one batch with the same identity, and a new library item already in the library (409, "propose reusing it instead"). A waiting item of another run is not refused at write (a second draft of the same form would be blocked); it is caught at approval.

**The migration** (`20261029200000_s6_proposal_item`):
* It copies field, section and answer_list rows (library) and document_requirement and check rows (now requirement_line and cross_check, combination) onto `proposal_item`. The old comparison columns go into `work`, so the copy loses nothing.
* It drops `rule` rows and any kind the contract does not know.
* It logs both (Q-L4): a NOTICE, and one `audit_event` per workspace naming the counts and every dropped key. It stops if copied + dropped is not every row. Then it drops `normalization_item`.
* Copied rows are pre-contract: their payload keeps its old keys beside `kind`. Only new writes go through the parse.
* **Run on a copy of the :4400 data** (`pg_dump xr_studio_demo | psql xr_studio_screens_mig`, then `prisma migrate deploy`): clean. :4400 holds no proposal rows today, so nothing moved. The full mapping is proved by `check_s6_p149`'s replay: every older migration on a scratch database, nine rows of every old kind, then this one (7 copied, 2 rule rows dropped and listed).

**Readers switched.** sources.ts (ingest writes through `insertProposals`; review, decide, accept-clean, re-compare and apply read the table; apply lands new fields through `landField`), checklist.ts, demo.ts, programs.ts, review-queue.ts, ai.ts and library-changes.ts (`sameName`). The field-map page (`job.tsx`) is unchanged: `reviewRow` gives it the old row shape until 1b replaces the page. The server's own columns beside the contract: `choice` (the review's ACCEPTED · CHANGED · NEW · RETURNED), `decided_key` and `work`.

**The free-add scan** (`check_s6_p149`) refuses any `canonicalField / logicalSection / answerList / documentType .create|createMany|upsert` outside `proposals.ts`. Allowlist: the P-65 merge (forms.ts). Listed as owed by other lanes, never widened:
* forms.ts `createAnswerList`: unreachable since (2a); forms deletes it.
* studio.ts: a document type named while adding a requirement (configuration.tsx). It goes through the door with W1-10 / P-158 item 4.

**Checks.** `check_s6_p149.ts` 37/37: the migration, the door, decide, undo, the review reading the new table, and the scan, with a pass and a fail per rule. Other checks that wrote `normalization_item` by SQL now write `proposal_item`:
* screens: `check_screen02_fix.ts`, `check_screen02_slice2.ts`;
* other lanes, a table rename only: `check_forms_f3a1c.ts` (forms) and `check_ai_launch_paths.ts` (forms).

**Not in 1a, by plan:**
* `seed_library.cjs` still writes by SQL. The door has no HTTP route until 1b's queue; the seeds move to it then.
* The 1b page, bulk accept and grouped approval.
* Release publish of an approved `answer_list` ADD: it is not yet in `unapprovedAdds`. 1b checks it with the queue.

## Slice 1b, 29 Oct: the review queue page (P-149, P-121, P-123; C11.13, C11.14, C3.2)
**Routes** (`api/src/review-proposals.ts`, contract `contracts/review-proposals.ts`):
* `GET /review/proposals[?group=]`: waiting items grouped by form edition, else combination (titled by its path), else run; oldest group first. The asked group comes in Ready to accept · Check · Decide, each item with both readings, IRCC's quote (file, edition, page, found or not, rule sentence), the rules, near matches, and `bulk_why` (null when it can go in a bulk accept). An empty or unknown group answers 404 in words.
* `POST /review/proposals/decide` and `POST /review/proposals/undo/:batch` call the door (`proposals.ts`).
* `GET /review/changes?group=batch`, `GET /review/changes/batch/:id`, `POST /review/changes/batch/:id`: what one decision landed, approved or returned together. The whole batch is checked first (its decider never approves it, 403; a return needs a reason), then each row goes through `Screen02.decideLibraryChange` (so `decideChange`'s and the lifecycle's guards). Rows refused meanwhile are listed in the answer.

**Rules added in the door** (`proposals.ts`):
* Bulk accept (more than one id): Ready only, never a rules item landing on the library; anything else refuses the whole call (409, nothing accepted). At most 200 (`BATCH_MAX`).
* A reuse adds nothing to the library: accepting it records the existing key (1a's field lander made a new field for a reuse).
* Field-map step items (`ON_ITS_PAGE`) are refused here (409): they are decided on their form-field page.
* **Undo now puts the items back to waiting**, as proposed (an edit keeps the item's own reading in `work.beforeEdit` and Undo restores it). 1a set them `undone`, which left them on no page: found by the browser check. The contract's `undone` status is no longer written (forms' contract; a proposal in the hand-back).

**To review** (`review-queue.ts`): one `proposals` row per queue group, linking to `/review/proposals?group=…`; one row per decision batch of two or more for the second person, linking to `/review/batch/:id` (its decider sees it waiting on others).

**Pages** (`web/src/pages/proposals.tsx`): the queue (groups on the left, three bands with tooltips; Ready rows have a checkbox, a rules item a dash with its reason; "Choose all", "Accept N items", an Undo bar counting down 10 s); the side panel (why a person looks, what it means, both readings, IRCC's words, rules, close to, a reason box; Reject needs the reason, "Accept the checker's reading" when the readings differ); the batch page (items, Approve N, Return N with a reason, or why this person cannot).

**Decided here, with reasons:**
* **The field-map page (`job.tsx`) does not fold in yet.** Its items also map form fields and are applied to the draft by an author, which the queue's landers do not do. They are listed in their group with "Decide on its form-field page", never chosen in bulk, and keep their own To review row. They fold in when the edition draft step (item 6) writes contract items with both readings.
* **"Draft fields with AI" on the form row (item 6) is not in 1b.** The Lead's brief named five parts; item 6 converts the runner's two rounds (`field-drafts.ts draftEdition`) into contract items and is the queue's first real producer. Proposed as 1b-2, before 1c.
* **`seed_library.cjs` stays SQL.** Its callers (forms, runtime checks) need fixed keys synchronously; moving them is a cross-lane change. New checks seed through the door instead (`tests/seed_proposals.ts`, `insertProposals`).
* **Owed from 1a, done:** an approved answer list ADD now publishes with the release (`versionsOf`, `setStatus`).

**Checks** (own copies, private ports; US$0): `check_s6_p149.ts` 65/65 (28 new route cases, a pass and a fail per rule); `check_s6_queue_browser.cjs` 23/23 (private port) (axe on the queue, the panel and the batch page; 1440 and 1024 without sideways scroll); `check_screen02_slice1.cjs` all passed; `tsc` api and web clean; any 423 (baseline 433); graph G1 0, G4 0, G3 2 (older attachment routes). Screenshots: `screenshots/slice1b/`. Contract v2.1 from main (no `addReason`, no `person` origin, `source.rule`) needed three small fixes in 1a's code.
