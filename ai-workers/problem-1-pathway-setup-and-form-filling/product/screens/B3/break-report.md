# B3 — Sign and scan by screens (C8.1): break report (7 Nov)

**Build:** branch `claude/blissful-rubin-fn9ymy` @ d7837f605 (PR #1221). **Copy:** `tools/isolated.sh brk_b3 4443` with the configured checkpoint loaded (Reset, then Load as user-A). The copy was stopped at the end, and the files the load rewrote were restored. **Cases:** 9 single-adult cases and 1 FAMILY Visitor visa case, opened with `acceptance/lib/m3.ts`. **How:** the API with curl, plus Playwright scripts in the session scratchpad (not committed). Sample files only. Live AI off. US$0. Paths are under `prototype/studio/`. Scope: concept §2–§6, and §6b's "Not built" was respected. Challenge m5 (a stale tab after a restart signs the wrong copy) is Not built, so it is not reported here.

**Verdict: no Blocker, 3 Major, 9 Minor.** The step order, the roles, the upload checks and the races hold. The Majors are a wrong signer shown in the record, a stale tab that records steps on an out-of-date copy, and (outside this row's files) a recorded application that the API still lets you re-sign.

## Major

**M1. "Signed by" shows who signs today, not who signed, so a filed IMM 5476 reads as signed by someone who never signed it.**
* Steps: case G was taken to Ready to file. On the screen, Printed, then Signed by hand, then the scan, then Uploaded to IRCC (the item is Done). Then `PUT /runtime/cases/:id/team/representative {userId:"user-T"}` as user-R (answers 200), and the case was opened again.
* Actual: step 2 reads "Signed by Sample Client G … and the representative of record (**Second representative (Sample)**) · recorded by Case officer (Sample), 7 Nov, 08:56". The form was signed when Representative (Sample) was the representative.
* It is the same on a **recorded, read-only** application: case E was recorded, then the representative was changed (200), and the block still names the new representative as a signer of the filed form.
* Cause: `who` comes from `/prepare`'s current `signers` plus the current `/team` name (`web/src/runtime/sign-steps.tsx:58,71`), and `detail()` prints it on the step that is done (`:168`). Any later change re-words the history: a new representative, or a child turning 18.
* Should: a step that is done names only what was recorded with it (who recorded it, when). "Who signs" in today's words belongs on the line above, not on a past step.
* Evidence: screenshots G-done-rep-changed.png and L-recorded-rep-changed.png (in the scratchpad's `brk/shots`, listed at the end).

**M2. A stale tab records "Signed by hand", and then a scan, on a copy that is out of date. This is the job's own "never … on an out-of-date copy".**
* Steps (case I): open the case as user-O and press "Printed: the copy of …". In the API, the client (user-P) changes `person.family_name` (answers 200). Then, in the same tab and without reloading, press "Signed by hand".
* Actual: it is recorded. The server answers 200 and the steps now read `print:true signed:true`. Only after that does the block say the copy is out of date.
* Cause: the screen never reads again by itself (`web/src/lib/api.ts:29`: `refetchOnWindowFocus: false`, `staleTime` 2 s). The server checks the order, not the printed copy (`api/src/sign-steps.ts:83`, and `:137-139` for the scan). In a second tab, the scan upload is accepted the same way.
* Before the scan, `/prepare` still shows this item as `to_do`. The case only recovers once a scan is in, when the item asks for a new signed copy. By then the person has already signed a wrong form by hand.
* Should: the screen reads the item and the copy list again before a step is sent, or when the tab comes back to the front. Better, the server refuses `signed` and the scan when `done.print.copy` has changed facts, with words, and the screen shows them. The concept only says the "Printed" check is enforced by the server.
* Evidence: screenshot I-stale-signed.png. The API's `signed` was also 200 on case D after the same change.

**M3. A recorded application can be signed again through the API, which supersedes the filed form's steps.** This is outside this row's files: it is the open BR-10 question, with proof that it can be reached.
* Steps (case E): reach Ready to file, then record the submission (`PATCH /groups/:gid/record`, 200, filing SUBMITTED). Change the representative (200). Generate a new IMM 5476 copy (202). Then `POST …/sign-steps/print {copy:new}` answers **200**, then `signed` 200, then the scan 201.
* The `sign_step` table then holds `print|t signed|t scan_received|t print|f …`: the filed copy's steps are superseded on a filing that is still `SUBMITTED`.
* The screen correctly shows read-only, with no button. The API does not: there is no `refuseIfRecorded` in `api/src/sign-steps.ts:68-151`, and the restart rule at `:77` lets the new print through.
* Should: the tech lead takes the one-line follow-up that challenge M2 recommended (a 409 with the recorded words on `step` and `scan`).

## Minor
* **m1. The upload route's 413 words are another route's.**
  * Two files give "Add at most 20 files at a time. Nothing was added." A file of 20 MB + 1 byte, or 21 MB, gives "A file is larger than **25 MB** …".
  * The route's own "larger than 20 MB" (`api/src/sign-steps.ts:134`) is also overwritten. The 413 filter in `api/src/main.ts:184-194` covers `/checklist-lines/…/documents` and `/validated`, not `/signed-scan`.
  * The browser check hides this on the screen, but the server's words contradict the field's "up to 20 MB".
* **m2. Wrong words when only Printed is done.** After a fact changes, the block says "The signed IMM 5476 is out of date … The earlier scan is kept." Nothing was signed and there is no scan (cases D and I; `sign-steps.tsx:193`).
* **m3. Copies are named only to the minute.** "Printed: the new copy of 7 Nov, 08:52" sits beside step 1's "Copy of 7 Nov, 08:52" (the old copy, made in the same minute; case D). The officer cannot tell which copy is which (`:37`).
* **m4. A warning that contradicts the button below it.** Above the button, the unproven-copy warning says "…so this copy is for checking only, not for filing. Check the copy against the case before it is signed", and the button then prints that copy to be signed and filed (`:127`, `:142`). "Warned, not blocked" stands (concept BR-4); only the words need fixing.
* **m5. Choosing the same file again after a refusal in the browser may do nothing.** The "larger than 20 MB" and "empty" paths return before the `finally` that clears the input (`:103-104` against `:114`), so picking the same file path again fires no `change` in Chrome. Found by reading the code; Playwright's `setInputFiles` forces the event, so it was not seen in the run.
* **m6. Done, then a change: the reason asks for an action that has no button.** The reason says "print the new copy, have it signed and upload the scan, or undo the change before filing", and no button is shown, as BR-8 intends (case G). The words come from the API; the screen could add that the step after filing is C8.2's.
* **m7. Read-only block with mixed messages.** The pill says "Ready" and the reason says "upload it to IRCC once the filing is Ready to file", right beside "The submission is recorded: this application is read-only…" (case E). This is the API's reason; challenge M2 noted the same.
* **m8. A long file name loses its extension.** Names are cut to 200 characters (`contracts/documents.ts:44`), so "…xxxx.png" is stored without ".png". The type is still shown ("PNG"), so the effect is cosmetic.
* **m9. One `GET /runtime/items/:id` per row that is signed by hand** (`sign-steps.tsx:80`). STANDARDS §5 asks for "one request per screen view, not per row". Challenge m7 accepted this at two rows; recorded here so it is not forgotten at scale.

## What held
* **Roles:**
  * The client (user-P) gets 403 on read, step and upload, and the client's page has no block and no "Who signs" line.
  * Another firm's officer (user-S) gets 404 "No such case.", and its page says "This case could not be opened".
  * The author (user-A) gets 403, and a call with no actor gets 401.
* **Order and wrong things:**
  * Signed before Printed gets a 409 in the engine's words, and the same words show on the waiting step.
  * POST `scan_received` gets a 409.
  * Another case's copy, or no body, gets a 409.
  * A document item gets a 422, a form that is not signed by hand (IMM 5645) gets a 409 on both routes, and a random or junk id gets a 404.
  * A 6 MB JSON body gets a 413.
* **Races:**
  * 5 concurrent Printed: one 200 and four 409s "…was just done … by someone else".
  * 4 concurrent uploads: one stored, three 409s, and one file on disk.
  * A double Enter on "Signed by hand" records one step, with no error shown.
* **Uploads:**
  * The empty, renamed-text, HTML-as-.pdf, wrong-field and no-file uploads are each refused, and nothing is stored (0 rows).
  * Exactly 20 MB is accepted.
  * A file over 20 MB is refused in the browser with the field's words.
  * A PNG is judged by its bytes.
  * Unicode, RTL-override and 300-character names are cleaned and wrap at 1024 and 512 px.
  * No route serves a scan back, so there is no rendering risk.
* **Signing again:**
  * After the scan, a fact change and a change of representative each bind to the item, never to the `signed_scan` record.
  * "Printed: the new copy" is offered only once a current copy exists, and the server supersedes the earlier steps.
  * Done followed by a change gives the reason only.
* **Ready to file taken back:** a stale tab still showed "Uploaded to IRCC". Pressing it got the server's words ("…only once its filing is Ready to file"), and the block was read again.
* **Read-only once recorded:** no button, and the unticked step 4 is said in words. A forced `uploaded_to_ircc` gets a 409.
* **Keyboard:** Printed, then Signed by hand, then the upload by Enter (the file chooser opens). Focus moves to the next step's button, and to the upload after a refusal. "Checksum" opens with Enter.
* **Layout and screen data:**
  * 1024 px, 720 px and 512 px (200 % zoom) have no sideways scroll.
  * FAMILY: the principal's and the spouse's IMM 5476 each have their own block, and a step on one leaves the other unchanged. A child's line reads "a parent, for … (under 18)".
  * "Who signs" and "not set" match `/prepare` and readiness S1.

**Not tested:** a reload during an upload in flight. A case with no representative of record: `openCase` with `null` fell back to the firm's default, so the "(not chosen yet)" words were not reached. The 100-program / 400-combination budgets do not apply to this row (P-26).
