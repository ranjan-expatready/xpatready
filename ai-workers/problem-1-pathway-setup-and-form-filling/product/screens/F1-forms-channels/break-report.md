# F1 — Forms channels, slice 1: break report (backend path, P-68)

Breaker, 23 Oct 2026. Scope: concept "What gets built" items 1, 2, 2b, 3 (no-AI part), 4, 5, as agreed in `challenge.md`. Slice 2/3 "Known gaps" are not counted. No code changed, no AI call (US$0), nothing committed.
**Setup.** Isolated copy :4452 (`xr_studio_forms_break`). I seeded it with `check_forms_channels.ts` (66/66) and restored the evidence files. The suite resets at its end, so I re-seeded with its setup steps (demo load, IMM 5257 replay). The migration copy was `xr_studio_forms_break_mig`, dropped afterwards. Never :4400/4450/4451. Scripts: `/private/tmp/claude-501/f1break/*.mjs`, `pages/`, `csv/`. Machine load ranged 4–26 during the runs, so timings are indicative only. Paths: studio = `prototype/studio/`.
**Counts:** Blocker 0 · Major 9 · Minor 16.

## Major
**M1. Approve and return can both succeed: the library keeps an approved online version whose capture says "Returned".**
* Steps: finish a capture, then send `POST /captures/:id/approve` (user-B) and, 10 ms later, `POST /captures/:id/return` (user-C).
* Expected: one of the two wins and the other gets 409. Actual: both return 201. Final row: `RETURNED`, `form_edition_id` set, and the online version stays in the library. The capturer can then reopen it, add screens and get it approved again.
* Cause: `api/src/forms.ts:182` updates without `status: "HELD"` in the where clause. Approve claims its row conditionally (`:164`); return does not. Script `a3.mjs` (delay 10).

**M2. Screens reported as "added" are lost when finish runs at the same time.**
* Steps: add 6 screens (`POST /captures/:id/screens`) and call `finish` 300 ms later.
* Expected: finish waits for the add, or one of them gets 409. Actual: add returns 201 ("6 added"), but the held record has 1 screen. It was then approved with 1 screen.
* Cause: unconditional whole-record writes (`forms.ts:106` and `:143`), and no version column (STANDARDS §4 [M] optimistic concurrency). Script `a4.mjs`.

**M3. Duplicate element ids are accepted, and after approval the online version's screen map can never be accepted.**
* Steps: two screens that both use `id=familyName` (applicant and spouse, as portals often do), or the same screen saved twice in one capture (different bytes, so the checksum dedupe misses it: 18 questions).
* Actual: finish → HELD, approve → online version, draft OK. Accept → 409 "the database refused a duplicate. Refresh…", every time.
* The contract has no id uniqueness (`../contracts/portal-capture.v1.schema.json:33-56`). The reader also gives both inputs the last label (`tools/read_portal_capture.py:149-150`, so "Given name" is shown twice). The unique index is `prisma/schema.prisma:334`, hit by `forms.ts:263`. Script `a1.mjs`.

**M4. A form code typed with different spacing or punctuation creates a second library form.**
* Steps: `POST /captures` with form `"IMM-5257"` or `"IMM  5257"` (two spaces), then approve.
* Actual: a new `gov_form_def` "IMM-5257" is created next to "IMM 5257". It has no PDF twin, so reuse finds 0 of 4 inputs.
* The free-text regex is at `contracts/forms.ts:35`; the upsert of any typed code is at `forms.ts:160`. This breaks STANDARDS §3.2 (pick, don't type; add only with a duplicate check by meaning).

**M5. Merges are not re-checked when approved, so a cycle can retire every field in it.**
* Cycle: propose B←A, C←B, A←C (all valid when proposed), then approve each as user-B. All three end `RETIRED`, each `merged_into_key` points to another, and no active field survives. Mappings were moved onto retired ids.
* Double merge: X→D and X→E, both approved. D and E both carry alias X; X redirects to E while its rows moved to D.
* Two identical proposals sent at once are both stored.
* Cause: the activity check exists only at propose time (`forms.ts:424-426`), not at approval (`:438-453`). Script `m1.mjs`.

**M6. An expired re-check date can never be cleared, so an Online line blocks release until it is switched back to PDF.**
* Steps: set `recheck_by` in the past. The validator says "capture the screens again, or confirm they are unchanged".
* Actual: an identical capture finishes as `IN_LIBRARY` ("its re-check date can be confirmed"), and `recheck_by` does not change. Approving it gives 409 (not held). No endpoint confirms or extends the date. The validator error stays.
* Code: `forms.ts:125-129`, `engine/channels.ts:52`. Script `r1.mjs`.

**M7. Learned aliases drop their group, and wrong shared fields are drafted with no AI and accepted as "exact".**
* Accepting the S1 screen map stores "Country or territory" as an alias of `person.country_of_birth`. A later IMM 5709 capture is then drafted with both "Current country of residence › Country or territory" and "Country of citizenship › Country or territory" mapped to `person.country_of_birth` (method alias).
* The learned label skips the one-label-one-field check. After `country_of_birth` had no aliases, a person gave "Country or territory" to field Z, and the next acceptance still learned it onto `country_of_birth`: two fields now hold that label.
* Code: `forms.ts:265-268` (label without group; only the field's own aliases are checked) and `engine/twin.ts:96`. Scripts `c2.mjs`, `l2.mjs`.

**M8. The intake guard misses a portal screen with one question, and stores it with the client's answer.**
* Steps: `POST /intake` of a saved "Personal details - IRCC Portal" page with one `<input value="SMITH-CLIENT">`.
* Actual: the page is attached as a "guide" and the file is stored under `var/…/intake/` (concept item 4: refused by code).
* Code: `tools/read_form_identity.py:75` (`len(inputs) >= 2`) and `api/src/intake.ts:163`. Script `i1.mjs`.

**M9. Answers shown as text pass the check and are kept, and the review document says no answer was kept.**
* A `contenteditable` element holding "SMITH JOHN", linked by `aria-describedby`, is stored as the input's help.
* Answers inside a label ("Family name: SMITH") or an option label ("India (client: SMITH JOHN, passport X1234567)") are stored too.
* ARIA widgets are not read at all: a ticked `role=radio aria-checked=true` passes, and its question is silently missing from the capture.
* Each of these goes into the record, the twin and the review PDF, which prints "No answer was read or kept" (`engine/capture.ts:91`). The reader handles only `input`, `select` and `textarea` (`read_portal_capture.py:84-125`, `:194-196`). Pages `e_`, `f_`, `g_`, `t_*.html`.

## Minor
* **m1.** Reader gaps: a typed value in an input with no id or name is skipped, not refused (`read_portal_capture.py:88-90` run before the value check at `:116`); a selected option "-- Female" is treated as the placeholder; prefilled read-only values (an application number) are refused, so real blank screens can fail.
* **m2.** Template (CSV) gaps:
  * Answer columns are recognised only under 5 exact names: `client_answer` and `default` are ignored, not refused (`:235`).
  * `input_order` is discarded: rows 3,1,2 come out in file order (`capture.ts:43`).
  * Screen orders "1" and "01" merge silently, keeping the first title (`:252`).
  * Duplicate option codes are accepted.
  * A bad `part` or an empty `input_id` fails only at finish (422).
* **m3.** A screen cannot be removed from an open or returned capture, so a return or one bad screen means starting a new capture.
* **m4.** A windows-1252 page or CSV is stored as "Pr�nom" with no warning: the meta charset is ignored (`read_portal_capture.py:216`, `:232`).
* **m5.** No size limits:
  * An 8.6 MB page with 20,000 questions is accepted. Finish took 114 s, the PDF print timed out and an HTML review was used instead, and the capture can still be approved.
  * The contract has no `maxItems` or `maxLength`. A request can carry 30 files of 10 MB each, held in memory.
  * Finish prints the PDF inside the web request: 3–4 s at load 4, 45–160 s at load above 20 (STANDARDS §4 "never inside a web request").
* **m6.** Twin and review files are named by fingerprint (`forms.ts:134`): two held captures with the same structure share one twin and one review file, so one capture's review document shows the other's id, title and files. The second approval gets 409 "approved at the same moment" and that capture stays HELD (`:171`).
* **m7.** When a return wins the race, approve answers "Already approved." (`forms.ts:165`).
* **m8.** Five alias adds at once to one field all return 201, but only 2 of the 5 are kept (`forms.ts:324`, read-modify-write).
* **m9.** Alias duplicate check (`twin.ts:20-23`, `forms.ts:320`): "Mother’s maiden name" (curly apostrophe), a zero-width space, full-width letters or a decomposed accent are accepted on a second field; "??" is stored with an empty normalised form and then blocks every punctuation-only alias.
* **m10.** `POST /library/fields/person.family_name/answer-list` turns a free-text field that is in use into a code/ENUM draft (`forms.ts:354-355`). Answer-list labels "Female" and "female" are both accepted.
* **m11.** Filling: `codeForValue("toString" | "constructor")` returns a function, not null, so fill would count it as written (`engine/options.ts:48`, `api/src/fill.ts:44`); in draft mode a field on an answer list with no option map falls back to label matching (`fill.ts:45`).
* **m12.** A merged-away field can be edited back to DRAFT with `PATCH /library/fields/:key` while keeping `merged_into_key`, and then accepts new aliases (`forms.ts:319` checks only RETIRED).
* **m13.** Missing database checks (STANDARDS §3.4, §5): none on portal keys, `portal_capture.status` or `merged_into_key` (may point to itself or nothing); an ONLINE edition need not have `portal_key` or `content_sha256`, and NULLs escape the partial unique index; `aliases` can be null; no rollback recorded (`migrations/20261023083353_forms_channels/migration.sql`).
* **m14.** Deny-by-default (existing behaviour): with no `x-actor`, `POST /captures` returns 201 as the author (`api/src/core.ts:36`). GET captures and the review PDF need no actor. Uploads have no throttling.
* **m15.** `sources.ts:402` calls `defaultChannelFor(this.db, …)` inside the apply transaction, so the query runs outside it. The first apply hit the 5 s transaction timeout under load (500).
* **m16.** `GET /captures` has no pagination and includes each capture's full difference: 8.7 MB and 1.5 s for 23 captures when one has a 20k-row difference (STANDARDS §6).

## Not counted (scope)
An online-only form cannot be added to a line (Screen 01 asks for a PDF; combination 6 is slice 2). The same person may draft and accept a screen map (concept: "a person accepts"). Planted instructions are kept as label text: harmless in slice 1 (no AI); slice 2 must treat them as data.

## What held
* **Values refused, nothing kept.** Refused: typed values (including a zero-width space), date, number, colour and range values, a ticked radio or checkbox in any position, a chosen option after the placeholder, text in a text area (even inside tags), and a `value`/` Value ` column. Skipped and never stored: hidden tokens, scripts, iframes, template/noscript content and comments. No refused file is left on disk.
* **Hostile files.** Refused: a PDF with planted instructions (as .pdf and renamed .html), a zip (both names), UTF-16 and empty files. A 200k-deep nesting reads fine. A traversal file name is stored as `script_.html`. The review HTML is escaped.
* **Contract.** Objects are closed: extra `selected` or `Value` keys fail both the contract and `noAnswers`, and `portal-capture/v2` is refused. Unknown body fields are dropped by zod.
* **Roles.** The capturer cannot approve or return, including with no header or with `USER-B` / `Approver` (these fall back to user-A → 403). The approver cannot create or finish. A merge proposer cannot approve. Two approvals at once give one edition and one 409. Returning after approval → 409; approving after return → 409.
* **Concurrency.** Two accepts at once give one map and one 409. Two answer lists created at once give 1 row and one 409. The partial unique index blocked a second identical online version.
* **Channels and validator.** A bogus portal or channel → 400. A wrong portal gives an error naming it. A line key in another case → 404. Bad or unknown ids → 404 Problem Details. Validator errors fire for: no portal, no version, open inputs, an expired re-check date, and an option value with no code.
* **Migration (6).** Database at `…230000`, seeded with pre-F1 columns of real data: 11 lines, 11 editions, 215 fields, 703 maps, 6 combinations, 1 release, 257 audit rows. `migrate deploy` took 9.8 s. Counts were identical afterwards: every line PDF_UPLOAD, every edition PDF, aliases `{}` with no nulls, no portals and no option maps.
* **Fill (7).** A value missing from the option map returns null, and the box goes to "by hand".
* **Speed.** 423 captures: list 146–406 ms. Channels view 64–260 ms. Answer lists and merges under 15 ms.
