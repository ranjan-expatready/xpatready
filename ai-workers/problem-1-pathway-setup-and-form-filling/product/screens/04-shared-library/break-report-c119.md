# C11.9 break report, round 2: delete, retire and restore of Fields and Document types (1 Nov)

**Scope.** Commit `7c83a30f` on `claude/practical-franklin-g2phk2`. Isolated copy `b5cbrk` on :4463 (`xr_studio_b5cbrk`) with the sample inputs loaded. No AI calls (US$0). Tested through the API with curl and psql, and in the browser with Playwright at 1440 px, 1024 px and 720 CSS px (200 % zoom). Actors: user-A (author), user-B (approver), user-C (review and SME duties only). Paths below are under `prototype/studio/`. **Result: 0 Blocker, 4 Major, 6 Minor.** All round-1 findings re-tested hold (list at the end).

## Major

**Ma1. A merged field can be retired, then restored, and comes back as a published field that still carries `mergedIntoKey`.**
Steps: create published `person.brk_keep` and `person.brk_gone`. Run `POST /library/merges {keep:brk_keep, merge:brk_gone}`, approved by user-B. The versions of `brk_gone` are now v1 PUBLISHED and v2 RETIRED with `merged_into_key`. `GET /library/fields/person.brk_gone/uses` answers `retired:false` and `can.retire:null`, and the default list (the one pickers read) shows the row with **Retire**. Retire it and approve: v1 becomes RETIRED. Then restore it and approve: v2 (the merged row) becomes **PUBLISHED** with `merged_into_key=person.brk_keep`. Expected: a merged field is never treated as Retired and never restored (concept, challenge M4: "Merged fields are never 'Retired'"). Actual: the field is half un-merged. It is listed as PUBLISHED with Retire, its old name is still an alias of `brk_keep`, and `PATCH` on it answers "was merged into".
Where: `api/src/library-items.ts:31` (`stateOf` ignores `mergedIntoKey`, so an older PUBLISHED version makes the item "not retired"), `:146–147` (retire and restore pick a row by status only). `itemUses` never checks `mergedIntoKey`.

**Ma2. Adding a document line while the retire is being approved leaves a retired document type in use by a current combination.**
Steps: 12 rounds. Each round creates published `brk_type_N` and sends `POST /library/document-types/brk_type_N/retire`. In parallel it sends `POST …/changes/:id/approve` (user-B) and `POST /combinations/<Visitor visa>/requirements {documentTypeKey:brk_type_N, …}` (user-A). Rounds 3 and 9: both returned 201, the change is RELEASED, the type is RETIRED, and the Visitor visa draft has a line `brk_type_N:principal_applicant`. Afterwards `GET …/brk_type_3/uses` answers `retired:true` and lists "Visitors › Visitor visa: blocks". `GET /combinations/:id/review` flags nothing. Expected (M1 fix: "applyItem re-checks in its transaction"): one of the two loses. Actual: a time-of-check-to-time-of-use race. `refuseRetired` reads before the type is retired, `applyItem` re-checks before the line is committed, and neither locks anything the other writes. In the other rounds the guard worked (RETURNED ×6, 409 ×4).
Where: `api/src/studio.ts:630` then `:643` (check and insert, no transaction and no lock). `api/src/library-items.ts:133–136` (READ COMMITTED re-check, no lock on the item row). Every `refuseRetired` caller and `libraryTypes` (rules, conditions, placement) has the same gap by code reading.

**Ma3. A "who fills it" change that is waiting does not stop a retire, and approving it afterwards writes a new draft question for the retired field.**
Steps: published `person.brk_wf2` with a published question in a section that no combination selects. Run `POST /library/fields/person.brk_wf2/fills {to:CASE_OFFICER}` (WAITING). Retire the field and approve (RELEASED, field RETIRED). Then approve the fills change as user-B: APPROVED, and `section_question` gets **v2 DRAFT** (`staff_working_view`) for the retired field. `…/uses` now shows "Draft question in brk section: blocks". Expected: the open fills change stops the retire ("any open change to the item stops a new one"), or the fills approval refuses a retired field. Actual: the retired field has a draft use that nobody asked for.
Where: `api/src/library-items.ts:88` (the open-change check reads only `kind` field or document_type, never `placement_fills`). `api/src/who-fills.ts:86–91` (`applyFills` has no retired check; the retired check exists only at proposal time, line 57).

**Ma4. A restore does not re-check names, so one label ends up naming two fields.**
Steps: retire `person.brk_c` ("Brk C"), approved. Run `POST /library/fields/person.brk_keep/aliases {alias:"Brk C"}`: 201, because `namedBy` skips retired fields. Restore `person.brk_c`: the re-check card says "nothing new uses it", user-B approves, RELEASED. Now `brk_c` is named "Brk C" and `brk_keep` has the alias "Brk C". Expected: the rule "one label points to one shared field" (forms.ts) is checked again at restore and at approval; the restore is refused, or the clash is named. Actual: silent duplicate.
Where: `api/src/library-items.ts:147` and the `can.restore` rule (`library-items.ts`, `restore: p ?? (!st.retired ? … : null)`). `api/src/forms.ts:68–70` (`namedBy` excludes RETIRED, so the label looks free while the field is retired).

## Minor

* **Mi1. Document type with its ADD waiting offers Delete, which always fails.** Name a new type through `POST /combinations/:id/requirements {newTypeName:"Brk New Type"}`. On `/library/documents` the row's action is **Delete**. `…/uses` answers "A change to it is waiting for a second person." on every action, with `pending:null`. The round-1 minor was fixed for fields only. Where: `api/src/library-items.ts` `openItemChanges` (ADD is included only when `kind === "field"`). `api/src/library-changes.ts:163` refuses to withdraw a document type's ADD.
* **Mi2. Deleting a never-released field leaves references to it.** A draft field `person.brk_del` was listed in `visa_application_photographs.supplies_facts`. `…/uses` returned `uses:[]` and `can.delete:null`. After the approved delete, the field row is gone but the published document type still supplies `person.brk_del`. The merge code treats document supplies, derived inputs and sample facts as uses (`forms.ts:351–354`); `itemUses` does not. Where: `api/src/library-items.ts` (`itemUses`, field branch).
* **Mi3. A condition that reads a retired field says "not in the library".** `POST /combinations/:id/rules` and `/conditions/check` with `field:"person.brk_wf2"` answer "reads person.brk_wf2, which is not in the library". The same happens for aliases and answer lists on a retired field (`forms.ts:152`, 404 "not in the library"), and for the AI checklist apply ("no such document type in the library yet", `checklist.ts:193`). Expected: "retired: restore it first", as `refuseRetired` says. Where: `api/src/studio.ts:596–599` with `engine/validate.ts:38`.
* **Mi4. The field page of a retired field still offers editing.** `/library/fields/person.brk_wf2` shows the pill "Removed in draft" (not "Retired"), and Rename, "Save as draft" and "Save placement as draft" are enabled. Each click returns the 409. Screenshot: taken at 1440 px during the run (in `/tmp/brk/ui/`); not saved in the repo.
* **Mi5. A request with no body answers in Zod's words.** `POST /library/fields/:key/retire` with no body answers 400 "Invalid input: expected string, received undefined", where the rule is "Say why (3 to 300 characters)". Where: `api/src/library-items-routes.ts` `reason()` with `contracts/form-library.ts:72`.
* **Mi6. A never-released field whose ADD is approved but not yet released cannot be deleted, and the refusal reads "waiting for a second person".** Found by reading the code, not reproduced: `OPEN` includes APPROVED (`library-items.ts`) and the answer is `WHY.waiting`.

## Open question (not scored): user-C approves library changes
user-C holds `review` and `sme`, not `approve`. `POST /library/changes/<retire of person.brk_c>/approve` as user-C returned **RELEASED**, and the field was retired. Cause: `decideChange` requires only the `review` duty (`api/src/library-changes.ts:80`). This is shared with every library change, so it is not specific to C11.9. Whether "a second person approves" (BR-8) means the `approve` duty is for the tech lead or the founder to decide.

## What held
* B1: `PATCH /library/fields/:key {retire}` → 410.
* M1 (except the race in Ma2):
  * `refuseRetired` refuses a retired document type as the line's type, as an alternative and as `newTypeName`.
  * Placement, field edit and rename of a retired field → 409. Conditions cannot read a retired field.
  * Bulk copy (`lines-bulk.ts` `libraryBlock`) refuses a retired document type, and also one that has a retire waiting.
  * The AI checklist apply skips retired types.
  * Merges refuse retired fields at proposal and at approval.
* M2: 15 rounds of approve and withdraw at once. Exactly one wins every time (7, 8, 9 RELEASED; the rest WITHDRAWN), and nothing is half applied. Six retire proposals at once → one 201 and five 409. Three approvals at once → one wins.
* M4: a document type used only as an alternative stops a retire (409).
* Approval re-check: a use added before the click hands the change back (RETURNED) with History. A resubmit is re-checked (409). user-B cannot resubmit (403).
* Roles: no actor or an unknown actor → 401. user-B and user-C cannot propose or withdraw (403). The maker cannot approve (403).
* Reason: blank, whitespace only and 301 characters → 400. Japanese text is accepted.
* Odd keys: case, spaces, `%2F`, quotes and SQL, 5,000 characters, RTL mark → 404 in words. The raw SQL is parameterised.
* UI:
  * Keyboard: Tab to Retire, then Enter → panel with focus inside; Escape → focus back on the row's Retire.
  * Width: no page-level horizontal scroll on Fields or Document types at 1024 px or 720 px. At 720 px the Fields table scrolls inside its own box (737 px in 686 px).
  * The refused panel lists every use with a link. No page errors.
