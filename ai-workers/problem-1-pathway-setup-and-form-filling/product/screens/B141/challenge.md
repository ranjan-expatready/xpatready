# B141 · C7.8 Add a library form to one filing: fresh challenge

Challenger: an independent agent that did not draft the concept (screen-concept part B), 7 Nov 2026, on `origin/main` 1e1ca443e (worktree branch `claude/intelligent-noether-qkzc6a-b141`). Read: `concept.md`, `design/draft-add-library-form.html`, `best-in-class-sources-2026-11-07.md`; row B141, P-406 and the C7.6–C7.8 rows of `qa/CAPABILITIES.md` on `lead/2026-11-07-lead30`; P-72 (with P-242, which amends it), P-122, P-144, P-151, P-237, P-238, P-315, P-319; `PRODUCT.md`, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`; the founder's boards (Prepare application v2, agent view); SA-1B-177 and the cards it cites (SA-1B-102 rule 5, SA-1B-174, SA-1B-178, data row `FilingFormAddition`, access `agent/form:create`); and the code named below.

**Freshness.** `ai-workers/tools/freshness.sh` did not run in this cloud copy (it reads `code/README-copies.md`, and `code/` is not on GitHub). SA-01B v2.1 was read from the name-free copy `domain/requirements-2026-11-02/`: **Unverified** against any snapshot newer than 2 Nov.

## Verdict
**Build after these changes.** The job, the two kinds, the frozen-when-added rule, one-filing-one-person and the channel limits are right and match SA-1B-177. Nothing makes it a rethink. But six Majors would each break the row's own "Done when" (fills from the case, goes through Ready to file) or let wrong data in. All are fixable in the concept before BUILD. No Blocker.

## Objections
Labels: **Fact** = checked in the code or a record (confidence given); **Judgment** = my reading. *Needed for the proof* / *Not built* per the skill.

### Major
**M1. The concept never names the one place where an added form joins the case's forms, and five code paths read the pinned release directly.** *Needed for the proof.*
* What breaks: the added form is listed but cannot be filled, made into a copy, locked or checked; or it is silently dropped on the next read of Prepare application.
* Example: the officer adds IMM xxxx for Client B. The next `GET …/prepare` runs the item sync, does not find IMM xxxx in what the release wants, and marks its item inactive. "Make a copy" answers "No such form."
* Evidence (Fact, high):
  * `Runtime.snapshotOf` returns `c.pins[0].release.snapshot` (`api/src/runtime.ts:76`).
  * Forms are recognised only through `releaseForms(s)` (`api/src/fill-case.ts:47`) and listed from `pdfForms(s)`/`copyOnlyForms(s)` (`fill-case.ts:157`, `engine/runtime/forms.ts:108-125`).
  * The fill job reads the pinned release's snapshot itself, not `snapshotOf` (`fill-case.ts:281`), and `writeForm` needs the map in `snapshot.field_maps` (`api/src/fill.ts:46-49`).
  * Coverage needs a form line in `s.forms` (`engine/render.ts:110`) and the map in `s.field_maps` (`render.ts:126`).
  * The prepare sync builds `wanted` only from the release's render (`api/src/case-prepare.ts:109`) and deactivates every other item (`case-prepare.ts:162-164`).
  * Readiness reads each form's edition from `s.field_maps` (`case-prepare.ts:344-346`).
  * The prepare view refuses a snapshot whose hash differs from the pin (`case-prepare.ts:83`). So the overlay must not be written into the snapshot that check reads.
* A second trap (Fact, high): `render` picks people by the line's role-based `who` (`render.ts:110`, `subjectsFor`). A synthetic line would add the form to every person with that role, which breaks BR-1 ("one person").
* Fix:
  1. In the concept, name one pure function, `withAdditions(s, additions, subject?)` in `engine/runtime/added-forms.ts`. It returns the release snapshot plus each active addition's form line and frozen map. It is applied after the fingerprint check, and to officer-side reads only, never to the client's questionnaire (BR-5).
  2. List its readers: `CaseForms.list`, `generate`, `run`, `lock`, `validated`; `CasePrepare.build` (`wanted`, `lines`, `editionOf`); and the readiness inputs.
  3. Filter the added line to its one subject.
  4. Link a copy to its addition (a nullable `form_addition_id` on `form_instance`, or a lookup by case, person and form), so `run()` writes from the frozen map.
  5. Add to test 2: "not listed for Client A or Client C".

**M2. "Fills from the case" ignores whether the fill is proven (the fill trial), so the officer may be offered a form that can never be filed as filled.** *Needed for the proof.*
* What breaks: the panel says "Fills from the case (18 of 24)". The copy is made. Then `lock` refuses with "no fill trial is recorded for edition …, so this copy is for checking only, not for filing". The concept gives no way on, because a mapped form is never offered as the blank PDF.
* Evidence (Fact, high):
  * `lock` refuses any copy whose edition and map version have no passed trial (`fill-case.ts:341-342`, `api/src/fill-trials.ts` `trialFor`).
  * The register holds six trials: IMM 0008, 1295, 1344, 5257, 5409 and 5707 (`samples/fill-trials.json`).
  * SA-1B-177 rule 2: "A mapped form uses the viewer or answer sheet by its trial status (SA-1B-174)".
* "Approved" is not a field-map status (Fact, high): `DefinitionStatus` is DRAFT, PUBLISHED, SUPERSEDED or RETIRED (`prisma/schema.prisma:21-26`). Field-map rows become PUBLISHED only when a combination that uses the form is released (`api/src/studio.ts:1206`). "At least one approved row" would call a map with 1 of 24 form fields decided "Fills from the case".
* Fix (Judgment, high): define the fills kind in code terms. The frozen map is the current edition's **PUBLISHED** rows, in the snapshot's `field_maps` shape with `form_sha256`. The form is "Fills from the case" only when `trialFor(frozen map).passed`. Otherwise it is the blank kind, and the tip says why ("its filling is not proven for this edition yet"). Founder **Q1** below.

**M3. Signatures on an added form are left to "the library line", which does not exist, so Ready to file shows a CRITICAL line that no one can fix.** *Needed for the proof.*
* Example: an added form on a PDF upload channel gets signature `NONE` (the channel's default, `engine/channels.ts:26`) and no `signed_by`. `signatureNeeded` then waits for a signature (`engine/runtime/readiness.ts:212-216`). The words become "must be signed (how it is signed is not set on the form line yet …)" (`readiness.ts:141-144`). On a case there is no form line to set, so the officer can only pass it with a reason.
* Evidence: SA-1B-102 rule 5 (SA-01B line 2364): "A library form has no line: `signedBy` is empty, so it needs a signature, and staff may switch it off with a reason (AG-07)." Signers come from the release line (`case-prepare.ts:275`, `signersOf`).
* Fix: in the add panel, ask how the form is signed, within `SIGNATURE_FITS` for the channel (default "Signed by hand and scanned" on PDF upload, "Signed in pen" on Paper). Store it with `signed_by` (default the person, a parent for a minor) on the addition. "No signature" needs a reason, as the team says. Replace BR-7's "as the library line says" with this. One more field in the panel; no new screen.

**M4. A form the release already holds but that does not apply now can be added, which duplicates the item when its rule later fires.** *Needed for the proof.*
* Example: IMM 5409 is a Visitor visa release line that applies only when marital status is common-law (`api/src/form-setup.ts:27`). For a married Client A it is not on the filing, so BR-2 ("not already on that filing") lets the officer add it. If the answer later changes to common-law, the release line applies too: two lines with the same form number in the overlay, and one `filing_item` key (`@@unique([filingId, kind, itemKey, subjectId])`, `schema.prisma:1788`). The officer's addition and the release's item silently become the same row.
* Evidence: Fact, high (`fill-case.ts:47`, `case-prepare.ts:159`).
* Fix: BR-2 refuses every form number in `releaseForms(s)`, whether it applies now or not, with the reason in words: "IMM 5409 is in this case's release: it applies when <condition>. Change the answer it waits on." The release's own rule stays the single source of truth. Founder **Q3** below if the founder wants an override instead.

**M5. The blank kind has no record for the completed copy, asks for a second upload when the form is signed by hand, and a blank barcode form can never clear its Validate block.** *Needed for the proof.*
* What breaks:
  * The new table (concept §2) has no file, sha256 or uploader for "the completed copy".
  * On a PDF upload signed by hand and scanned, the completed copy *is* C8.1's signed scan, so the officer would upload the same file twice.
  * For a barcode form, C7.6's one hard stop needs `validatedCurrent`. That is true only for a product-made copy read back with Validate passed (`case-prepare.ts:209`, `:371`; `fill-case.ts:371-390`, which also refuses "the copy the product made, unchanged"). A hand-filled blank has no product copy, so the block (`readiness.ts:147`) cannot be fixed or passed (`cannotPass`, `readiness.ts:227-228`), and that filing never reaches Ready to file.
* Evidence: Fact, high. Barcode forms are a fixed list (`contracts/forms.ts:56-57`). Any of them with no PUBLISHED map in a workspace is blank-kind there.
* Fix:
  1. Name the record. Either reuse C8.1's signed scan when the form is signed by hand (one upload), or use an insert-only completed-copy row (path outside the web root, sha256, type and size checked, by and at; STANDARDS §8).
  2. For a blank barcode form, the completed-copy upload runs the existing read-back for the form's own Validate result only (`read_validated.py` `form_validation.passed`; there are no product values to compare), and that counts as `validatedCurrent`.
  3. Test 7 then covers both: still blocked before the Validate read-back, cleared after it.

**M6. The blank form's new Ready-to-file line changes C7.6's rule set without saying so.** *Needed for the proof.*
* Evidence: Fact, high. C7.6's codes are a closed list (`readiness.ts:34-41`), and P-237/P-238 (the founder's) enumerate what is CRITICAL. "Filled by hand: upload the completed copy" is a new CRITICAL code.
* Fix (Judgment, medium): name the code (for example `not_completed`, owes staff, CRITICAL, passable with a reason). Add it to `CRITICAL_CODES`, `CODE_WORDS` and the contract. Record that it extends P-237's list for added blank forms only. Founder **Q2** below.

### Minor
* **m1 Retrofit name (Fact, high).**
  * The team's record is `FilingFormAddition` (filing, person, `formKey`, edition, by, at, `firm_id`; SA-01B data row, line 6305).
  * The concept invents `case_added_form` with no mapping.
  * Fix: name it `filing_form_addition`, map `firm_id` to `workspace_id`, and list the extra columns as ours (frozen map, kind, channel, signature, reason, removed).
  * *Needed for the proof.*
* **m2 "Adopt update" is promised but is not an action anywhere (Fact, high).**
  * Release forms get only the `edition_superseded` and `edition_expired` lines whose words say "Adopt update" (`readiness.ts:151-152`).
  * No endpoint exists; the case pin's ADOPT is Not built (`schema.prisma`, `PackWorkPin` comment).
  * Fix: BR-3 says "the same warnings as release forms" (`editionOf` reads the frozen edition), and "Adopt update" on an added form is *Not built*.
* **m3 Default channel (Fact, high).**
  * "Default PDF upload" is refused on a filing whose account is paper filing: `allowedChannels` gives Paper only (`engine/channels.ts:57`).
  * Fix: the default is the first of PDF upload or Paper that is allowed. Paper through an IRCC account keeps C11.6's accommodation reason (`engine/runtime/prepare.ts:113`).
* **m4 Required reason on add (Judgment, medium).**
  * SA-1B-177 §7 and §12 count 3 clicks and record "by, at", with no reason. A required reason adds typing to every addition.
  * Keep it **optional** on add (shown on the row when given) and **required** on remove.
  * Test 4 then becomes "a guide, or a form not in the library, is refused".
* **m5 Coverage per search result (Judgment, medium).**
  * Working out "18 of 24" for every result runs `formCoverage` per library form on each keystroke, which works against STANDARDS §9 (search < 200 ms).
  * Show the kind tag in the list; work out the count when a result is picked.
  * Use the forms panel's own counts (`draft.written_now`, `mapped`; `fill-case.ts:176`), so one thing has one number.
* **m6 Same role, different number (Fact, high; Judgment on the fix).**
  * IMM 5707 and IMM 5645 are alternative family information forms (`contracts/form-library.ts:40-42`, `api/src/form-setup.ts:45-46`).
  * On a Visitor visa release 2 case, IMM 5707 is a mapped, trialled library form that is not on the filing: the pack's most likely "mapped" pick, and an immigration-wise wrong addition.
  * Warn in words (never block) when the library form's role is already on the filing ("IMM 5645 is already this filing's family information form"). The pack should prefer a form with no such role.
* **m7 Barcode test and P-319 (Fact, high).**
  * Whether a form is a barcode form comes from a fixed list (`contracts/forms.ts:56`), not from library state. Test 7's barcode leg must pick through `isBarcodeForm` over the library and report a named skip when none is addable.
  * No new form number in code. Adding a work-permit or PR application form to a visitor filing is a test artefact, not a real case; say so in the pack.
* **m8 Q1 and P-72 wording (Fact, high).**
  * C6.18 is officer entry for background answers only (CAPABILITIES C6.18). Facts the release does not ask stay by hand in M3.
  * BR-4 should cite P-242 (Declared answers fill) beside P-72.
* **m9 Signals counter and audit.**
  * SA-1B-177 rule 5 (count additions per programme and form for SA-1B-178) should be listed as *Not built*.
  * The audit line ("form added to filing", with no values, as `fill-case.ts` audit lines) is part of the build.

**No scaffolding standing in for a capability (P-33) found.** Quality (D1–D20), if built as written: D2 data integrity and D19 closure would score below 4 because of M4 and M5; D9 flow because of M5's double upload. With the fixes, none of these is expected below 4.

## What is sound
* **Job and scope.** One form, one filing, one person, never the combination (SA-1B-177 §3, §13). The two kinds are named in words before adding (team rule 1). Online is left out with the right reason (Q2: an Online line needs a captured twin).
* **Frozen when added (BR-3).** This is the right analogue of the release pin (STANDARDS §3.7). The release itself freezes maps as JSON (`engine/snapshot.ts:161-169`), so copying the PUBLISHED rows with a fingerprint is consistent, even though STANDARDS §3.3 prefers references. Record that choice and its reason (STANDARDS §10).
* **The facts check (Fact).**
  * Case forms come only from the pinned release snapshot (`s.forms`, `s.field_maps`).
  * A library current edition is a PDF edition with a sha256 approved by a second person (`api/src/form-library.ts:85-87`).
  * The existing filler can fill from a map that is not in the release, but only if it is handed a snapshot that contains it. That is why M1's overlay is enough, with no change to `fill.py` or `formValues`.
  * Facts the release does not ask come out "unresolved" or "no question placement" (`render.ts:142-145`), so BR-5 ("Not on file") falls out of the existing coverage.
* **C7.6 reuse (Fact).** Once added forms are among the prepare items, C7.6 treats them like any form:
  * missing facts (`readiness(view, …)` through the overlay's question "fills");
  * the barcode block;
  * edition warnings (`editionOf`);
  * the representative's review fingerprint, which includes every form on the filing (`readiness-inputs.ts:70`), so adding a form after review marks the review "changed since".
  * Out of date (C9.2) also works unchanged through `changedFacts`.
* **Immigration fit.**
  * PDF upload is the realistic channel for an extra form on an application filed through an IRCC account: Unconfirmed, as no IRCC page is cited here. Paper keeps C11.6's accommodation reason.
  * SA-1B-177's own example form (IMM 5409) has a fill trial in the register.
* **UX.** The side panel matches EXPERIENCE §3. Refused rows are shown with their reason, not hidden. The keyboard path, the conflict state and read-only after recording are all specified.
* **Q3** (build after the `fill-case.ts` and `case-prepare.ts` PRs) is right: M1's overlay touches both files.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule (engine) | Test |
|---|---|---|---|---|
| "+ Add a form" panel list | `FormEdition` (current: approved PDF edition with sha256), `FormFieldMap` PUBLISHED rows, `samples/fill-trials.json`, release snapshot, `filing_form_addition` (active) | `GET /runtime/filings/:id/addable-forms?q=` (officer only; 403 client or configuration, 404 other firm) | `addableForms`: type form; current edition; not retired, `needs_ok`, `no_file` or `online_only`; not in `releaseForms(s)` (M4); not already added for that person; kind = fills only if PUBLISHED rows exist **and** `trialFor` passed (M2); `why_not` in words; same-role note (m6) | C7.8-1 pass; fail cases: a release form, including one not applying now, is not addable; a guide is not listed |
| Coverage on pick | release snapshot + frozen map (not stored yet) | `GET …/addable-forms/:form?subject=` | `formCoverage(withAdditions(s, [draft]), …)`; counts as the forms panel (m5) | C7.8-2 (count equals the copy's written count) |
| Add | `filing_form_addition` (m1): `id`, `workspace_id`, `case_id`, `filing_id`, `subject_id`, `form_key`, `form_edition_id`, `edition_label`, `form_sha256`, `map_json` (snapshot `field_maps` shape), `map_sha256`, `kind`, `channel`, `signature`, `signed_by`, `reason?`, `added_by`/`at`, `removed_by`/`at`/`reason`, `version`; partial unique (`filing_id`, `subject_id`, `form_key`) while not removed; plus its `filing_item` | `POST /runtime/filings/:id/added-forms` {form, subject, channel, signature, signedBy?, reason?, idempotencyKey}; under the case row lock as C11.6; 409 for a filing recorded as submitted or when already added ("already added by <who>") | BR-1 subject on the filing; BR-6 `channelChange` reused; M3 signature within `SIGNATURE_FITS`; audit line with no values | C7.8-2, 5, 10; idempotent repeat returns the same row |
| Join the case's forms | none (pure) | none | `withAdditions` (M1), applied after `snapshotHash` and officer-side only; read by `CaseForms.list`, `generate`, `run`, `lock`, `validated`, `CasePrepare.build` (`wanted`, `lines`, `editionOf`) and the readiness inputs | C7.8-2 (listed for that person only), 6 (frozen: a later library map edit changes nothing), 8 (out of date) |
| Filled copy | `form_instance` (+ nullable `form_addition_id`), `answer_snapshot` | existing `POST /runtime/cases/:id/forms/:form/:subject/generate`, `…/form-copies/:id/lock`, `…/validated` | unchanged filler; trial gate on the frozen map | C7.8-2, 7 (barcode Validate block) |
| Blank official PDF | `FormEdition.officialFile` or `storedPath`, sha256 | `GET /runtime/added-forms/:id/official-file` (sha256 checked; 409 when it changed) | no value written | C7.8-3 |
| Completed copy (blank kind) | C8.1 signed scan when signed by hand; else insert-only completed-copy row (M5) | `POST /runtime/added-forms/:id/completed` (type and size checked) | barcode: Validate result read back counts as `validatedCurrent` | C7.8-7 (blocked before, cleared after) |
| Ready to file | none | existing `/runtime/filings/:id/ready`, pass | new CRITICAL `not_completed` (M6) for a blank form without its completed copy; signature line from the addition (M3) | C7.8-7 pass and fail |
| Remove | `removed_*` on the addition; `filing_item` inactive | `DELETE /runtime/filings/:id/added-forms/:aid` {reason, version} | allowed until the filing is recorded (C8.2), then 409 in words | C7.8-9 |
| Screen | Prepare application deliverables list (C7.7) + side panel | none | row tag "Added by the case officer" with who, when and reason | C7.8-11 walk at 1440 px and 1024 px, axe |

Migration: one table (expand only) plus one nullable column on `form_instance`. Read by the tech lead before build (concept Q3).

## Questions for the founder (recommendation first)
1. **A form the library has mapped, but whose filling is not yet proven for this edition (no passed fill trial):** **Recommended: offer it as "Blank official PDF" for filing, with the reason**, as P-65 (a) and SA-1B-177 rule 2 do for release forms. Consequence: the officer fills it by hand; nothing unproven is filed as filled. Alternative: also give the filled copy "for checking only" beside the blank PDF. That is more help, and two files for one form. Scenario: IMM 5409's map changes after its trial; until a new trial passes, the officer gets the blank IMM 5409.
2. **A blank added form with no completed copy uploaded:** **Recommended: a CRITICAL warning on Ready to file, passed only with a recorded reason** (as P-237 and P-238 treat a missing signature or missing facts). Consequence: one new line in C7.6's list, for added blank forms only. Alternative: a plain warning like a missing document. Scenario: the officer adds IMM yyyy, forgets to upload it, and presses Ready to file. With the recommendation the filing stops and asks for the upload or a reason.
3. **A form the release holds but that does not apply now (for example IMM 5409 for a married couple):** **Recommended: not addable, with the reason and the answer that decides it**, so the release's rule stays the one truth and no item is duplicated. Alternative: allow it as the officer's override of the release's rule. That is more flexible, but adds one more rule on how the override and the line's later "applies" combine. Scenario: the couple's answer changes to common-law the next week. With the recommendation there is one IMM 5409; with the override, someone must decide which one is filed.

## Lead response

## Agreement

## Build discoveries
