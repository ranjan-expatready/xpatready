# S4 Form library: break report, round 2 (independent breaker, 27 Oct 2026)

**What was tested.** Commit e58136e on branch `forms/2026-10-27-s4-form-library`, run on the isolated copy `brk_s4` at :4462 with the sample loaded. Scope was only what the CHECK fixes and the second pass touched: delete and where used, retire, Undo and Remove, Stop, replay, and the S4 CHECK constraints. The earlier round is in git history.
* **Spend: US$0.** The stand-in launcher answered a stub probe (`var/isolated-brk_s4/fake-launch.log`) before any live step, and canada.ca was never called. `p2/jobs`, `p2/runs` and `p2/ledger` hold the same files as before; I removed the one job file and the planted run files I created. The copy is stopped.
* **One setup step went straight to the database:** a library form with no file (`INSERT gov_form_def 'IMM 5645'`, the state IMM 5802 is in after the sample loads). Everything else went through the API, or the UI where stated. Paths are relative to `prototype/studio/`.

## Major
**N1 · A form whose file a second person approved after the Delete was proposed is still deleted (B1 rule).**
* **Steps:**
  1. A form with no approved file (as above): user-A `DELETE /library/forms/IMM%205645`. It is allowed, although "1 held file waiting" is listed.
  2. The uploader records the IRCC page of the held upload (`PATCH /intake/held/:id`), and user-B approves it. An approved edition now exists, with an `approved_source` row.
  3. user-B approves the Delete.
* **Broke:** The form and its edition are deleted, and the change is RELEASED ("Removed at approval"). The `approved_source` row is left pointing at nothing. Reproduced twice.
* **Cause:**
  * `api/src/lifecycle.ts:134-141`: at approval, `checkApprove` blanks `can` and `recheckNode` looks only at "released" and "blocking". The "approved official file" rule (`form-uses.ts:53,65`) is never checked again.
  * `lifecycle.ts:173-175` checks only the number of lines and also deletes `official_download` rows. A canada.ca download that arrives between the proposal and the approval is deleted the same way.

**N2 · An approved Retire is released while a combination's draft uses the form.**
* **Steps:**
  1. IMM 5645: Retire (user-A), approved by user-B. It now waits for the release.
  2. user-A `POST /combinations/<Super visa>/forms {formKey:"IMM 5645"}` returns 201. Where-used shows "Super visa" and "Retire waiting (approved)".
  3. user-B `POST /pack/release`.
* **Broke:** Release 2 carries the retire, so IMM 5645 is retired while Super visa's draft line still files it. The list shows "Retired · Used by Visitors › Super visa".
* **Cause:** `api/src/form-library.ts:158`: attach checks only `retiredAt`, not an open retire. `lifecycle.ts:211-216` (`publishLifecycle`, called at `library-changes.ts:174`) retires without checking uses again.

**N3 · Stop on one run still ends another combination's run (B-M5 only partly fixed).**
* **Steps:**
  1. Under Retail › Temporary residence, add Program "LMIA" › Sub-category "High-wage position" and its combination. Corporate already has the same names.
  2. Plan and start both live runs with the same page (the stand-in sleeps 6 s).
  3. Stop the Retail run only.
* **Broke:** Both runs have the job id `studio-finder-forms-temporary-residence-lmia-high-wage-posit-9d023c2b`. The Corporate run, which nobody stopped, ended FAILED with "Stopped during the free stub pass". Both runs also write the same job file, and the first one to finish deletes it while the other's launch is still queued. The real launcher reads that file (`p2/launch.ts:58`).
* **Cause:** `api/src/finder.ts:453` builds the id from the trail's words only. The type (Retail or Corporate) and the combination id are not in it. `finder.ts:479` and `sources.ts:464-467` then stop the job by that id.

**N4 · Replay gives one combination another combination's AI answer.**
* **Steps:** On the new "Temporary residence › LMIA › High-wage position" combination, plan and run in `replay` mode with `pageUrl` set to the visitor visa page.
* **Broke:** At US$0 it reused the answer saved for "Individual › Visitors › Visitor visa" (`drafting_run.inputs.combination`). Six visitor-visa forms (IMM 5409, 5475, 5476, 5645, 5707, IRM 0002) were attached to an LMIA work permit as "Picked by AI · Sample", with that combination's conditions.
* **Cause:** `finder.ts:455` (`same`) compares only the pages and the prompt checksum. The prompt is about one combination and gets `combination_trail` as a known fact (`p2/prompts/find-forms.v1.md:4`), stored in the record but never compared. Two siblings reading the same guide get each other's answer the same way.

**N5 · Many Removes at once: the person who removed the line gets an error, and Undo steps are duplicated (m12 holds only for a few at once).**
* **Steps:** 10 parallel `DELETE /combinations/<High-wage>/forms/IMM 5476`, then repeated with IMM 5707.
* **Broke:**
  * First run: no 200 at all, six 500s, and the line RETIRED with **six** "remove" Undo steps and six audit lines.
  * Second run: nine 409s and one 500. The 500 went to the request that did remove the line.
  * Every request took 20 s, and an unrelated `GET /library/forms/list` took 19.1 s while they waited. The server log shows P2028 "Unable to start a transaction in the given time". 2 and 5 parallel removes behaved correctly.
* **Cause:** `api/src/form-library.ts:185-191`. Inside `$transaction(tx)`, the read (line 187) and `studio.saveForm` (line 190) use `this.db`, not `tx`. Each request therefore holds one connection while it needs a second (the pg pool has 10). The writes also commit outside the transaction, so they survive the timeout and the 500.

**N6 · An edit made at the same moment silently overwrites an Undo, and the next Undo brings back the undone value (B-M4 reversed).**
* **Steps:** 12 rounds on IRM 0002 (High-wage). In each round, `PATCH {who}`, then in parallel `POST …/forms/undo` and `PATCH {who:"each_applicant"}`.
* **Broke:** In 11 of 12 rounds both calls succeeded (201 and 200), but the line ends with the edit's value: the Undo the person was told succeeded is gone. The edit's Undo record stores the pre-Undo state as its "before", so after round 12 `POST …/forms/undo` restored `spouse_or_partner`, the value that had just been undone.
* **Cause:** `api/src/studio.ts:463-478`: saveForm reads the rows and checks `baseRevision` with no lock, then writes. Only Undo locks the rows (`form-library.ts:218`), so an edit that read before the lock writes after it.

**N7 · Guides cannot be opened, retired or deleted, and guides and checklists used as sources show "Not used".**
* **Steps (API and UI, 1440 px):** `GET /library/forms/Guide%205256/uses` and `POST …/retire` and `DELETE …`. In the UI: Guide 5256 › ⋯ › Delete.
* **Broke:**
  * All three calls return 404 "GUIDE 5256 is not in the library.", so the drawer's "Where it is used" and History are empty.
  * The list says "Used by: Not used" for Guide 5256, although it is attached to Visitor visa as Instructions. Checklists IMM 5484 and IMM 5881 also show "Not used", although `/uses` blocks their retire with "Still used: Visitors › Visitor visa".
  * The Delete dialog shows no uses and fails with the 404 only when sent (screenshot kept outside the repo: `r2-guide-delete-submit-1440.png`).
* **Cause:**
  * `contracts/form-library.ts:14`: `normaliseCode` upper-cases any code it cannot parse, and is applied at `form-library.ts:263-268`.
  * `form-library.ts:59` counts only attachments of kind "Form" as uses, while `form-uses.ts:48` counts all kinds. `web/src/pages/library-forms.tsx:187` enables Delete from the list's count.

**N8 · A Delete that could not be applied is still announced to the approver as approved (B-M1 only partly fixed).**
* **Steps:**
  1. Propose Delete on IMM 5645.
  2. Approve its held file, attach the form to Visitor visa, then remove it.
  3. user-B approves the Delete.
* **Broke:** The database is right (RETURNED, "Not deleted: a combination still has a line…"). But the response says `status: "APPROVED"`, so the UI toast says "…approved: it is released with the next release" (`web/src/pages/review-items.tsx:58`), and the audit line says 'Approver approved "IMM 5645 …" (delete)'.
* **Cause:** `api/src/screen02.ts:104-108` returns `out`, which was taken before `afterApprove`, and logs "approved" whatever happened.

## Minor
* **m-a · A broken newer saved answer stops replay, even when an older good one exists.** I put a newer copy of the Visitor visa answer in `p2/runs` (removed after the test). With unreadable `raw_output`, the step fails as "This step stopped: Expected property name or '}' in JSON at position 1" (developer words, not plain words). With the wrong shape, it fails without trying the older valid answer. Cause: `finder.ts:460-463`: `.find` picks the newest match, and `JSON.parse` at line 462 is not guarded.
* **m-b · A restart during a round leaves its job file in the source tree.** `p2/jobs/studio-finder-forms-temporary-residence-visitors-super-visa-d107409f.json` was left after an `isolated.sh restart` mid-round (I deleted it). `p2/jobs` is also shared by every copy (`finder.ts:75`), so two copies running the same trail delete each other's job file. Cause: the job file is removed only in the `finally` at `finder.ts:471-475`, and start-up (`sources.ts:70-81`) clears pid files, not job files.
* **m-c · Wrong wording on an impossible version.** Remove with `{version:7}` when the line is at version 1 says "changed … after you opened it (now version 1)".

## What held
* **B1 at proposal:** Delete is refused for an approved or official edition ("…kept, never deleted (P-51): retire it instead") on IMM 5257, 5484 and 5881. Source attachments count as uses.
* **B-M1 at proposal:** a retired line blocks Delete (IMM 5802), and an unappliable approved delete is stored as RETURNED with its reason.
* **B-M5 for siblings:** the trail fingerprint separates siblings whose names differ.
* **Stop:** a queued round reports "Stopped before the AI call was sent", and a stub round "Stopped during the free stub pass: nothing was sent".
* **B-M6:** after a restart, the left-over stand-in launcher (pid 6300) was ended, the pid file removed, and the run says "The studio server stopped while finding forms. Find again."
* **B-M7:** replay works under the new trail names, job files are removed after normal rounds, and the run result records `ai_inputs`.
* **m12 for 2 and 5 parallel Removes:** exactly one 200 and the others 409 "Already removed", with one Undo step.
* **B-M4, Undo side:** an Undo refuses when an edit landed first.
* **Stale requests and roles:** a stale `version` or `changeId` gets 409 (naming the newer change). Remove and Undo as user-C or as client user-P get 403.
* **CHECK constraints:** `origin` ('downloaded', ''), `accepted_channels` ('pdf', '', 'PDF ') and `accepted_basis` ('SAMPLE', '') are each refused by `form_edition_origin`, `…_accepted_channels` and `…_accepted_basis`. NULL is allowed, and the live data passes.
