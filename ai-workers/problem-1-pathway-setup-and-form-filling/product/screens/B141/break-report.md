# B141 · C7.8 Add a library form to one filing: break report

Breaker: an independent agent that did not build the screen, 9 Nov 2026. Target: commit dcc7feb8c (`claude/intelligent-noether-qkzc6a-b141`, PR #1248). Copy: `isolated.sh brk_b141 4444`, `demo/load {"sample":"configured"}`, stopped after the run. US$0, no AI, no priced button. Scope: concept §2–§6 (BR-1..BR-9, the migration, the panel). Out of scope (not checked): client questions, Online forms, the signals counter, "Adopt update". Paths below are under `prototype/studio/`. Screenshots are in the session scratchpad only, not committed.

**Verdict: 1 Blocker, 2 Majors, 9 Minors.**

## Blocker
**B1. Moving a case to a newer release (C9.5) that holds an added form turns the whole case page white, and the principal's release form can no longer be filled.**
1. Case `SAMPLE-VV-FAMILY-1` is on Visitor visa Release 1, which has IMM 5707 and not IMM 5645. Release 2 has IMM 5645.
2. `POST /api/runtime/filings/<principal filing>/form-additions {"form":"IMM 5645"}` returned 201 (kind blank).
3. `GET …/release-update` gave `can_move: true` and did not mention the added form. `POST …/release-update {target_version:2, from_revision:1, reason}` returned 200.
4. `/cases/<id>` at 1440 px: the page is blank. Its only page error is `TypeError: Cannot read properties of null (reading 'by')` (screenshot `06a.png`).
* **Forms read:** `GET /cases/:id/forms` lists Client A's IMM 5645 twice: the release row, and a `blank` row with `added: null`.
* **Prepare:** keeps only the added item, "to_do", with a `hand_filled_copy` CRITICAL line. The release's IMM 5645 line for the principal is gone.
* **Filling:** `POST /cases/:id/forms/IMM%205645/<principal>/generate` returned **409** "IMM 5645 was added by the case officer for another person on this case, not for Client A". The form was added for Client A, so the words are wrong.
* **Cause:**
  * `addedTag` and `addedFor` read the first line with that form number. After the move, that is the release line (`api/src/fill-case.ts:154`, `:221`, `:283`).
  * `BlankRow` always renders `AddedTag`, and `AddedTag` dereferences `f.added!` (`web/src/runtime/add-form.tsx:145-146`, `:197`).
  * BR-2's "never a form the release holds" is checked only when the form is added (`api/src/form-additions.ts:105`). Neither `withAdditions` nor the release move checks it again (`engine/runtime/added-forms.ts:77-100`).
* **Expected:** either the move refuses or names the clash, or the release line wins and the addition is shown as superseded. The page never crashes.
* **Recovery:** only an API remove. The UI cannot be reached.

## Major
**M1. Two concurrent adds of one form for two people store two channels and two signature settings. One person's signature is switched off with no reason.** Fresh family case, IMM 5646 and IMM 5669, each pair sent in parallel:
* `{form:"IMM 5646", channel:"PAPER"}` on the principal's filing and `{form:"IMM 5646", channel:"PDF_UPLOAD"}` on the spouse's: both 201. Stored rows: `PAPER|PEN` and `PDF_UPLOAD|HAND_SCANNED`. Prepare and `/forms` show both people as PDF upload, signed by hand and scanned, so the principal's stored PAPER is ignored.
* `{form:"IMM 5669", signature:"NONE", signature_reason:"…"}` (principal) and `{form:"IMM 5669"}` (spouse): both 201. The spouse's row stores `HAND_SCANNED` with no reason, but the joined line takes the first row's `NONE`. The spouse's item shows `signature NONE`, `signers []`.
* **Breaks:** build-notes decision 1 ("one form is filed one way on a case"), BR-6, and SA-1B-102 r5 (switched off only with a reason).
* **Cause:** `same` is read from `c.formAdditions` before the transaction (`form-additions.ts:191-203`). The row lock and the `twice` re-check (`:207-209`) cover only the same filing, person and form.
* **Held:** the same pair sent one after another is refused 422 in words.

**M2. A form removed and added back silently counts its old completed copy, including one removed for being wrong.**
1. Add IMM 5604 (blank). Upload a completed copy to `POST /items/<item>/signed-scan`: 201, item "ready".
2. Remove it with the reason "Wrong form, the completed copy was for another child": 200.
3. Add IMM 5604 again: 201. A new addition id is made, but the filing item is reused (`18c2aaa7…`, same id).
* **Result:** at once `state: ready`, "Filled by hand: the completed copy is uploaded (2026-11-09)", `blank.completed` set to the old scan, and no `hand_filled_copy` line.
* **Cause:** the completed copy is looked up by item id, never by addition (`api/src/case-prepare.ts:360-361`, `api/src/fill-case.ts:223`).
* **Expected:** an upload counts only for the addition it was made for. The same path would also count a copy of an older edition if the library's edition changed between the remove and the re-add.

## Minor
* **m1 Long titles do not wrap in two places (concept §4: "long titles wrap").**
  * The picked form's heading has no `overflow-wrap` (`add-form.tsx:112`). With a 400-character title, it runs out of the 560 px panel and is clipped at 1440, 1024, 200 % zoom and 390 px (`05-panel-*.png`).
  * The blank row's description (`add-form.tsx:205`) widens the page to scrollWidth 1707 at 1440 px (`04-row-1440.png`).
  * The result list itself wraps correctly (`:79`).
* **m2 Raw actor ids shown to people.**
  * Tag tip: "Added by user-O on 9 Nov 2026…" (`add-form.tsx:146`).
  * Conflict: "IMM 5562 is already added … by user-R on 2026-11-09" (`form-additions.ts:209`, `added-forms.ts:70`).
  * Concept §4 says "Already added by <who>", meaning a name.
* **m3 The ⓘ tip cannot be reached by keyboard.** The tag is a `SPAN` with `tabIndex -1`. Who, when and why exist only in `title` and `aria-label` (`add-form.tsx:154`).
* **m4 Focus is lost after Remove.** Keyboard path: Remove → reason → Remove. Focus then lands on `BODY` (`add-form.tsx:147-150`). Opening the panel, the search → arrows → Enter → fields → Add path, and the return to "+ Add a form" all held.
* **m5 The UI offers add and remove when the server will refuse.**
  * With only the spouse's filing recorded, the principal's filing reads `NOT_STARTED`. The UI enables "+ Add a form" and Remove, because it checks the filing's own status (`web/src/runtime/forms.tsx:63`).
  * `POST …/form-additions` on the principal's filing gives 409 "This application is recorded as submitted…", because the server checks every filing on the case (`form-additions.ts:186`, `:237`).
  * The person fills the whole panel before the refusal.
* **m6 "A newer edition exists" (BR-4) is never shown.** `newer_edition` is hard-coded to `null` (`form-additions.ts:177`), and no screen reads it.
* **m7 A blank form's C8.1 tracker cannot finish.**
  * `GET /items/:id` for a blank added form still lists Printed, Signed by hand, Signed scan received and Uploaded to IRCC, all `done: null`, even after its completed copy is in.
  * Every step, including `uploaded_to_ircc`, is refused 409 (`api/src/sign-steps.ts:89`). Decision 3 removes printing steps only.
* **m8 The blank download works after removal.** `GET /form-additions/<removed id>/blank` returns 200 with the PDF (`form-additions.ts:247-249`). BR-8 keeps the record; it does not say a removed form is still handed out.
* **m9 Code read, not reproduced:**
  * `library()` takes the newest non-Online edition with no approval filter (`form-additions.ts:70-71`). The library's own "current edition" is the newest approved one (`api/src/form-library.ts:85-89`).
  * `blank()` skips the checksum when `form_sha256` is null (`:254`).
  * Today, intake holds unapproved files: the planted-instructions PDF below was held. So neither gap was reached.

## What held
* **Who (BR-9):** client `user-P` 403 on list, detail, add, remove, download and upload; configuration `user-A`, `user-C` 403; other firm `user-S` 404; no or unknown actor 401; representatives `user-R`, `user-T` act as case staff.
* **Duplicates:** 10 parallel adds for one person gave one 201, nine 409, one row; a second add 409; a double-click on "Add to …" sent one POST. Lower case, double space, "IMM5562", Cyrillic, SQL, `../../etc/passwd`, 5000 characters, a number or array as `form`: 404 or 400. `%2F`, `..%2F`, RTL in the detail URL: 404.
* **Wrong person (BR-1):** spouse on the principal's filing, the case subject, "principal", `person:<id>`, a random UUID, array, number, object: all 422. A removed filing: 404.
* **Release forms (F3):** IMM 5257 409 "(it applies now)"; IMM 5409 409 naming "Current marital status"; blank barcode IMM 1344 422 in words; guides and documents never listed.
* **Channel and signature:** ONLINE, NOT_NEEDED and lower case refused 422; NONE with no reason or only spaces refused; a second person's different channel or signature, sent one after the other, refused 422.
* **Make principal** keeps added forms with their person (never a role); **remove filing** takes the person's added form with it.
* **Trigger and constraints:** UPDATE of `frozen`, `channel`, or `frozen` with `frozen_sha256` refused; taking back a removal or editing its reason refused; a removed mark without `removed_by` refused by the check; a second live row refused by the partial unique index; `fills` without a trial refused by the check.
* **Remove (BR-8):** empty or space-only reason 400; a second remove 409; after recording 409.
* **Readiness pass (F2):** `hand_filled_copy` passes only with a reason; one pass covers the lines that existed then (key: item and addition); a form added later raises its own line; uploading clears it.
* **Blank download:** sha256 equals the edition's (`fabb955a…`, IMM 5604); client and other firm refused.
* **Hostile uploads (completed copy):** HTML as .pdf 422, SVG as .png 422, empty 400, 30 MB 413. A PDF with planted "ignore all previous instructions" text is stored inert under a cleaned name (`passwdscript.pdf`); nothing reads it. The same PDF uploaded to the library as "IMM 5998" was held ("checksum not on approved source manifest"), never addable. A fills form with no signature refuses a scan (409).
* **Edition expiry:** an expired added fills form raises `edition_expired`; an expired blank form does not, the same as a release blank form (IMM 5475).
* **Budgets:** `addable-forms?q=` 48–101 ms, detail 22–48 ms (search < 200 ms, STANDARDS §9); typing debounced 200 ms.
* **Text and navigation:** Arabic, Chinese and French titles render and freeze unchanged; the empty search shows the concept's words; back and forward mid-pick posts nothing; at 1024 px, 390 px and 200 % zoom "Add to …" stays reachable (apart from m1's clipped heading).
