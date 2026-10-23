# Screen 01 — Programs: break report (after the one FIX pass)

Breaker, 23 Oct 2026, lane copy `screens-01-fix-c3010a` at c0e8ff98. Scope: concept "What gets built" + Layout v2, and this pass's fixes (QA-1, 3, 5, 6, 7, 9, 10, 11, 12, QA-13, P-63, next step said once, default channel). Isolated copy `screens_br` on :4442, page proxy :4443, sample inputs loaded. No code changed, no AI call, nothing committed. Scripts and screenshots: session scratchpad `br/`.
**Counts:** Blocker 0 · Major 4 · Minor 9.

## Major
**M1. A change saved while a release is running is marked PUBLISHED without review or SME sign-off, and it is not in the release.**
* Steps: Super visa was submitted and every SME change signed. The approver started `POST /pack/release`. 34 ms later the author added a document requirement ("Race late 34", an SME item).
* Expected: the release takes exactly the submitted draft. The new requirement stays DRAFT and goes to the next review.
* Actual: release 201 (Release 2). `document_requirement` "race_late_34" v1 is PUBLISHED, but the frozen snapshot does not contain it (`snapshot::text like '%race_late_34%'` = false). The next release then counted 0 requirements published.
* Cause: the gate and the snapshot are read outside the transaction, and `publishRow` publishes every DRAFT row of the combination, not only the rows in the snapshot (`api/src/studio.ts:556-560`, `:602-613`). The same applies to `approve` (`:504-527`). There is no lock or re-check inside the transaction.

**M2. An approver who submits a combination blocks every release in the shared draft.**
* Steps: the approver (user-B, who holds the review duty) presses Submit on Visitor visa's Review tab, which is enabled for them (`web/src/pages/review.tsx:71`). The content reviewer signs.
* Release page: Visitor visa shows "Will be released" and the button reads "Release 1 combination as Release N". Clicking it returns 403 "You submitted Visitor visa…".
* The 403 refuses the whole release, not just that row (`api/src/studio.ts:565-569`). `/draft` does not hold the row back for this person (`api/src/programs.ts:225-233`).
* Only one person has the approve duty, so nothing in the shared draft can be released until someone resubmits Visitor visa. The other way out is the approver "returning" it with an empty item list (see m1).

**M3. The Sources-tab reuse stores any text as "who", and it passes submit and release.**
* Steps: `POST /attachments/<IMM 5409 attachment>/reuse {"who":"<script>alert(1)</script>"}` after IMM 5409's released removal. Response 201.
* Validation shows 0 errors. The form is submitted and released in Release 5 (snapshot `who` is that string). The draft preview covers IMM 5409 for nobody.
* Expected: the WHO list is checked, as `saveForm` does (pick, don't type; §3.4 and §3.6). Code: `api/src/sources.ts:422-429`, `api/src/form-lines.ts:31`.

**M4. After a form is removed, the combination page still shows it and will not let it be added again.**
* Steps: on "With an LMIA" (Live), remove IMM 1295 and IMM 5475 (`PATCH …/forms/… {"retire":true}`). Then open the page.
* Overview → Forms still lists both forms with their old "Who and when". The draft snapshot has neither.
* "+ Add form" marks IMM 1295 and IMM 5475 "Added", with no Add button. So the QA-13 re-add cannot be done from the place "+ Add form" lives. Only the row's "Add 2 forms from the library" works. Screenshot `br/shots/add-form-panel-after-remove.png`.
* The table also shows stale versions: after remove and re-add, IMM 5476 shows v1 "principal applicant" while the draft and Release 5 say "each applicant".
* Cause 1: `summary` keeps the oldest version that is not RETIRED. A `Map` built from rows sorted newest-first keeps the last entry per form, and a removed form's older version is never RETIRED (`api/src/programs.ts:419-420`).
* Cause 2: the "Added" list in the add panel comes from the row's forms, which include attached sources that are not lines (`web/src/pages/combination.tsx:136`).

## Minor
* **m1. Review steps.** The author can sign the review-duty items of their own submission (201). Any review-duty holder, including the author or the approver, can "return" a submission with `items: []`. `signoff` checks neither who is signing nor that the list is not empty (`api/src/studio.ts:487-500`).
* **m2. Non-English names.** `normalizeLabel` removes vowel signs (`\p{M}`), so different Hindi and Thai names are refused as duplicates: "BR कसान वज़ा" vs "BR किसान वीज़ा", "BR วซา" vs "BR วีซ่า". Bidi control characters are kept: "BR ‮asiv" is created and displays as "BR visa" (`contracts/programs.ts:22-24`).
* **m3. Stale field message in the path builder.** After choosing "!!!" or a 121-character name, typing a new name keeps showing the old message. Typing exactly 120 characters shows "Keep the name under 120 characters."; typing "visitors." shows "Use letters or digits…" instead of "Visitors exists". This is because `valueProblem` wins over the live hint (`web/src/pages/new-combination.tsx` `Picker` hint). "Under 120" is also off by one: 120 is accepted.
* **m4. Deny by default still missing (earlier round's m3).** With no `x-actor` header, or an unknown one, the caller acts as the author: "BR by nobody" was created (`api/src/core.ts:35-37`; §6 [M]).
* **m5. Line edits.** Removing an already-removed line returns 200 and adds a version each time (IMM 5409 v2 then v3, both RETIRED). A `PATCH who` without `baseRevision` on a removed line silently brings it back as a draft. Two saves sent at once with the same `baseRevision` both return 200; the check is not atomic (`api/src/studio.ts:405-429`).
* **m6. Re-add resets the line.** Re-adding a released line after a removal resets who, condition and channel to the defaults. IMM 5476 went from principal_applicant to each_applicant, which shows as a draft change (`api/src/form-lines.ts:31-36`). Plain "add" behaviour is arguable; it is a surprise after an accidental removal.
* **m7. `/draft` makes one or two gate queries per changed row (N+1, §5 [M]), and the draft bar calls it on every page (`api/src/programs.ts:228-233`, `web/src/App.tsx:98`).** At 393 rows it takes 1.8–3.6 s. The "Every change is held back" refusal is 23.6 KB of text (`api/src/programs.ts:253`). The 400-row budgets are not built; the N+1 is the finding.
* **m8. Scripts (QA-3).** `restart-api.sh` stopped only :4442. But it starts the new server without `DATABASE_URL`/`STUDIO_VAR`, so with `STUDIO_PORT` alone a copy's server would come back on the demo database (`tools/restart-api.sh:9`). `stop.sh` with any `STUDIO_PORT` still stops the shared PostgreSQL every copy uses (`stop.sh:6`); I read this in the code and did not run it, because other lanes were live.
* **m9. Words.** The planted PDF's intake answer says "kept as a source… Attached to Super visa", but its attachment is HELD ("Unrecognised file"). It is also missing from the Overview's "Held for a person (3)". As the approver, the Sources tab still offers "Choose files", "Attach a sample file" and "Draft with AI" (author-only actions).

## What held
* **QA-1 gate.** Each of these was held on the Release page and refused by the server (409 or 403):
  * never submitted;
  * submitted with 1 of 22 SME items unsigned;
  * changed after submission (the "who" change on Applicant outside Canada; IMM 5707 removed on LMIA);
  * returned;
  * `expectedChanges` off by one, a string, or missing (400);
  * release by the author, the SME or an unknown persona; the author signing an SME item.
* **Mixed draft.** Ready rows were released and held rows came back with their reasons. Two `pack/release` and two `approve` calls sent at once gave exactly one release. The real submitter was recorded.
* **QA-13.**
  * Re-adding after a draft removal updates the line in place.
  * After a released removal, the re-add is v3, superseding v2.
  * 3 parallel re-adds gave 201/409/409. 2 `+ Add` plus 2 reuse calls sent together gave one 201.
  * After release: IMM 5707 v1 and v2 SUPERSEDED, v3 PUBLISHED.
  * The draft snapshot drops a removed form; the released snapshot keeps it until release. "+ Add line" on a row without a portal gets PDF_UPLOAD.
* **Names.**
  * Refused with the field message, nothing stored: "!!!", "— · …", emoji, zero-width only, combining marks only, spaces, tabs or NBSP only; 121 characters (message stays after blur, button off).
  * Created: 120 characters, Arabic, Hindi, Thai, digits; HTML is stored and shown as text.
  * Refused as duplicates: "Visitors." and full-width or zero-width variants of "Visitors".
* **Other fixes.**
  * QA-11: "Open the existing combination" goes to `/c/<id>` (mouse and keyboard).
  * QA-12: all three Demo-menu states are correct (empty, after a hand-made combination, after reload).
  * QA-5: stored times are within 9 s of `now()` while PostgreSQL runs in Asia/Kolkata.
  * QA-10: "Submitted by Configuration author" and "Last release: Release 5 by Approver".
  * P-63: no "box" wording on the rendered pages or in the web source.
  * Next step said once: "Next step for all of these: Add sources."
  * QA-4 also looks fixed here: `/new` and `/c/<id>` open directly on :4442.
* **Hierarchy and roles.**
  * Refused: a Corporate program in Individual, a category of another program, a category with sub-categories used as a leaf, a sub-category under a set-up category, a program under a program, a combination on a program, a link to a program, a bad link kind.
  * Approver and SME got 403 on create, reuse and intake. 4 parallel identical creates gave 1 created.
* **Uploads.**
  * Held: a PDF with an `/OpenAction` JavaScript, a forged IMM 5707 (06-2030), an HTML/PDF polyglot.
  * The planted-instruction PDF was not on the AI plan.
  * The library door refused it, and a path-traversal name was reduced to its base name. No dialog fired on any page.
* **Concurrency, layout, keyboard and scale.**
  * A stale `baseRevision` gets 409 naming who changed it.
  * No page-level sideways scroll at 1024 px or at 640 px (200 %) on 7 pages; wide tables scroll inside their card.
  * The path builder works by keyboard alone.
  * 100 programs (393 rows) loaded through the API. Catalogue: 40–130 ms cached, 3.7–5.6 s after a write; Programs first rows in 1.3 s; Release page 3.8 s. Not built (P-26); observations only.

## Not built (P-26) — not counted
"BR Race" and "BR-Race" created at the same moment both exist (no normalised-name index). Scale budgets at 400 rows.

## Left behind
Database `xr_studio_screens_br` (reset and reloaded once, then 100-program run, then fresh start and sample load). Server :4442 and proxy :4443 stopped.
