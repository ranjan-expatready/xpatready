# S4 Form library — break report (independent breaker, 27 Oct 2026)

**What was tested.** Commit 6a32505, branch `forms/2026-10-27-s4-form-library`, on an isolated copy `forms_brk` on port :4451 (sample loaded). The copy used the stand-in launcher; a stub probe was answered before any live step. canada.ca came from recorded copies, plus fake fetches for the live adapter.
* **US$0 spent.** The ledger, `p2/runs` and `official-sources` were unchanged afterwards. The two finder job files I created were removed; the copy was stopped and its database dropped.
* **Scope.** Only what challenge.md's back-end plan and slice plan list. Paths below are relative to `prototype/`.

## Blocker
**B1 · An official edition that two combinations read is deleted, after "Where used" says nothing uses it.**
* **Steps:** Load sample → `GET /library/forms/IMM%205257/uses` shows no uses and Delete allowed → user-A `DELETE /library/forms/IMM%205257 {reason}` → user-B approves.
* **Broke:** The form and its edition (manifest file IMM 5257 (09-2023)) were removed; the change is RELEASED. Visitor visa and Super visa still have IMM 5257 (09-2023) as an attached source (status READ).
* **Rules broken:** P-116 ("an approved official form edition is retired, never deleted") and STANDARDS §3.5.
* **Evidence:** `studio/api/src/form-uses.ts:32-55` counts only combination_form lines and release snapshots; `lifecycle.ts:170-176` deletes.
* **Fix:** Count source attachments and field maps as uses. Refuse Delete for any edition on the manifest, approved in the product, or officially downloaded: Retire only.

## Major
**M1 · An approved Delete is recorded as done when nothing was deleted.**
* **Steps:** IMM 5802 (its line on With an LMIA was removed by a person) → Delete → user-B approves.
* **Broke:** The change is RELEASED with "Removed at approval"; the audit says "removed (never released, used nowhere)". The form is still in the library.
* **Evidence:** `lifecycle.ts:173` skips the delete when a removed line still points at the form, but line 184 marks it RELEASED anyway.
* **Fix:** Count removed lines as uses in `formUses` and refuse with the reason, or fail the approval with 409.

**M2 · Any snippet of the page passes as evidence, so a wrong form is attached with no confirm step.**
* **Steps:** Stand-in live finder on Super visa. Both rounds return IMM 5409 with quote `"the"`, IMM 5475 with `"IMM 5475"`, IMM 5782 (a separate PR-renunciation application) with `"."`, each "always".
* **Broke:** All three were attached as "Picked by AI · Sample"; IMM 5782 was downloaded.
* **Evidence:** `finder.ts:351` checks only `allText.includes(quote)`. P-121 and STANDARDS §3.8 require evidence.
* **Fix:** The quote must contain the form's number or sit within N characters of a printed mention; set a minimum length (for example 20 characters); match it to the `printed` sentence for that code.

**M3 · One bad AI value aborts the attach step halfway; what was attached cannot be undone and the summary is wrong.**
* **Steps:** Stand-in answer where IMM 5645's `who` is not a known person role.
* **Broke:** The step failed ("Choose whose form it is from the list") after IMM 5257 was already attached. IMM 5645 was not attached and no `finder_attach` change was recorded, so Undo reversed an older hand attach (IMM 5476) instead. The run said "2 forms attached or already there".
* **Evidence:** `finder.ts:593-596`: `addFormLine` throws inside the loop; `recordAction` comes only after it.
* **Fix:** Validate each proposal (who, applies) first and send invalid ones to Decide; attach and record in one transaction; build the summary from lines actually attached.

**M4 · Undo racing a line edit: both succeed and the edit is lost; Undo is then blocked.**
* **Steps:** Attach a form by hand, then at the same moment `PATCH /combinations/:id/forms/:code {who}` and `POST …/forms/undo` (repeated with 4 forms, same result each time).
* **Broke:** The edit returned 200 and the Undo 201, and the line is gone. The edit's change record now points at a missing line, so every later Undo answers 409 "changed since".
* **Evidence:** `form-library.ts:190-209` checks before the transaction (no lock, no version check inside it).
* **Fix:** Take an advisory lock per combination (as `launch` does) around saveForm and undo, and re-check inside the transaction.

**M5 · Stop on one combination ends another combination's paid AI call.**
* **Cause:** The job id is the trail slug cut to 40 characters, so siblings collide (`…family-sponsorship-s` for "Applicant outside Canada" and "Applicant inside Canada").
* **Steps:** Live run on A with a hanging call; launch B; Stop B.
* **Broke:** A's call was ended ("Stopped while the AI call ran", charged at its reserved worst case) although A's cancel flag was false. The same key is shared by the job file under `p2/jobs`, the replay lookup and "usually costs".
* **Evidence:** `finder.ts:418`, `finder.ts:655-656`.
* **Fix:** Key jobs by combination id or a hash of the full trail; Stop only the run's own child processes, tracked by batch id.

**M6 · After a server restart, a paid AI call keeps running and cannot be stopped.**
* **Steps:** Live finder with a hanging call → `isolated.sh … restart`.
* **Broke:** The detached launcher (pid 68347) was still running. The run says "failed … Find again" and Stop answers 409 "already ended"; Find again would start a second paid call alongside it. Breaks P-110 ("Stop really ends the run").
* **Evidence:** `sources.ts:431` (`detached: true`) with `finder.ts:136` (`onModuleInit` only relabels the run).
* **Fix:** Record each launcher's process-group id on the step; on start-up, end the recorded groups (or wait for them) before marking the run, and say "a call may still be billed".

**M7 · Replay finds no saved answer for the sample's Visitor visa.**
* **Cause:** The two real runs are saved as `studio-finder-forms-individual-visitors-visitor-visa-*`, but the sample trail is now "Temporary residence › Visitors › Visitor visa".
* **Steps:** Load sample → finder `{mode:"replay"}` on Visitor visa.
* **Broke:** "No saved AI answer for these exact pages yet". Any rename of a structure name orphans saved answers the same way; US$0 replay is the demo path (P-110, P-123).
* **Evidence:** `finder.ts:418` keys replay on the trail names.
* **Fix:** Key replay on the input checksums and prompt hash (already compared in `same`), not on the names.

## Minor
* **m1 · A wrong-shape answer crashes the run.** With `forms` as a string, the step says "AI listed 10 forms" (the string's length), then fails with "r1.value.output.forms.map is not a function"; steps 5 and 6 stay WAITING. `finder.ts:340` trusts `contract_valid`. Fix: zod-parse the output in the finder.
* **m2 · Stop during the stub pass shows a wrong reason:** "The guarded AI route refused the job before any call:" with an empty reason. Fix at `finder.ts:433`: say "Stopped before any call. US$0".
* **m3 · "Stopped" is shown when the work finished.** A Stop landing during the add or attach step still adds or attaches, yet the run shows "Stopped" (IMM 5532: "Stopped by a person. In the library (added)"). Fix at `upload-run.ts:95`, `finder.ts:239`: show Done, plus "Stop came after the last step".
* **m4 · Search and path codes ignore spacing and case.** Search "imm5257" or "IMM  5257" → "No form matches"; `GET /library/forms/imm5257/uses` → 404, though attach normalises the same code. Fix: `normaliseCode` the search term and `:code` path parameters (`form-library.ts:77`, routes 236-245).
* **m5 · A search over 80 characters shows stale results.** The server answers 400 and the page keeps the previous search's rows with no error (`placeholderData`, `library-forms.tsx:50`). Fix: cap the input at 80 characters, or show the error.
* **m6 · Keyboard focus is lost when the drawer closes:** after Escape it lands on `<body>`, not the row's button (`library-forms.tsx:105`). Fix: return focus to the trigger.
* **m7 · A reused idempotency key returns another combination's run** (201 with Visitor visa's run on a Super visa request, `finder.ts:190`). Fix: check the run's combination and operation match, else 409.
* **m8 · The ledger accepts negative or NaN reservations.** On a scratch ledger at exactly US$60, `reserve(-50)` was accepted and then US$30 more passed the Wave 1 cap; NaN was stored as null. Fix at `p2/ledger.ts:67`: refuse a worst case that is not finite or is below 0.
* **m9 · The guard admits a forged `official-download/v1` record** naming one person and any `https://www.canada.ca/...` link, for a non-canada.ca PDF whose inventory carries planted text (admitted as `approved_by: official-download`). This is weaker than `approved-source/v1`, which needs two people. Wrong host, future time and a symlinked record were refused (`p2/guard.ts:83-91`). Fix: also require the checksum in the recorded canada.ca index (`official-sources/ircc/canada/index.json`) or the manifest.
* **m10 · Requests on a missing combination succeed.** `POST /combinations/<missing uuid>/forms/IMM%205257/replace` → 201 and updates `checked_at`; `GET /combinations/not-a-uuid/forms/find` → 200 with an empty body. Fix: 404.
* **m11 · The planted-instruction PDF gets contradictory steps.** Step 2 says "Rules read it: IMM 5604 (12-2099)"; step 4 refuses it as a guide (its title contains "instructions"). Editions dated 2099 and 2030 are accepted by the rules (both files held, no harm). Fix: one classification for all steps; flag future edition dates.
* **m12 · Remove:** two parallel removes both return 200, and remove keeps the line's version, so a later edit sent with that version is not refused as stale. Fix: bump the version on remove.
* **m13 · A real IRCC code cannot be attached by hand:** AttachBody refuses "IMM 0008 SCH4A", which canada.ca uses (`contracts/form-library.ts:10`). Fix: align the regex with `engine/canada.ts normaliseCode`.

## What held
* **Roles:** user-B and user-C get 403 on attach, retire, delete, upload, accepts and Stop; an unknown or missing actor gets 401; the proposer cannot approve a lifecycle change or form_accepts (403); user-C may approve as the second person.
* **Concurrency:** 3 parallel finder launches (two keys) → 1 run, the others 409. 3 parallel uploads of one file, and the same file twice in one request → 1 form, 1 edition. 4 parallel form_accepts → 1 WAITING, 3 × 409. 3 parallel delete proposals → 1.
* **Uploads:** 26 MB → 413 in words; a polyglot `%PDF-`+HTML → "damaged"; a French edition → held; planted instructions → no effect, not added; a file whose code differs from forCode → added, not attached; a junk forCode or a filename with traversal and `<script>` is made safe; a held file is served as application/pdf with nosniff and CSP sandbox.
* **Finder rules:** a number not printed on the pages, or a fabricated quote, is dropped; disagreeing rounds go to Decide; a separate application is never attached; the deleted IMM 5257 was downloaded again once, with OfficialDownload evidence.
* **canada.ca:** the address rule refused off-host addresses, http, a trailing dot, userinfo, punycode, numeric hosts and odd ports, and treated variant spellings of www.canada.ca (upper case, backslashes, %2E-encoded host, tab, :443) as the same address. 16 fake-fetch cases were refused (redirects off host, to http or protocol-relative, loops, a 300 status, a size lie, a hang that ignores the abort signal, a stalled body, HTML where a PDF was expected); no off-host fetch was attempted.
* **Stop:** a hanging call is ended in under 1 s with no launcher left; a second Stop → 409; a provider usage limit → BLOCKED, US$0.
* **Wave 1 cap (scratch ledger):** US$60.00 accepted, +US$0.01 refused; spend from before the wave is not counted.
* **Page:** axe clean. At 1024 px, 390 px and 200 % zoom there is no horizontal page overflow (the table scrolls in its box); the drawer fills the width at 390 px. Keyboard reaches rows, Enter opens the drawer with focus inside, and the ⋯ menu works.
* **Budgets with 421 forms (400 added by SQL):** server list 10–18 ms; first view 198 ms; filters 150–190 ms; search 93 ms.

**Not tested:** the browser Back button mid-action, reloading the library page during an upload (only the top-bar chip survives), and 400 combinations (only 400 extra forms).
