# Fresh challenge: Documents per person and "Fill this from documents" (C6.4 (a), C6.5 part 2b)

Fresh challenger (did not draft), 4 Nov, on `claude/vigilant-noether-l2sgvm` (main 9caa043b + records). Read: `concept-draft.md`, `design/draft-documents.html`, `../rows.md` (C6.4, C6.5, order), `../../M3-agent-view/concept-draft.md` BR-3–BR-7, `api/src/case-checklist.ts`, `engine/runtime/case-checklist.ts`, `engine/runtime/mrz.ts`, `contracts/documents.ts`, `api/src/runtime.ts` (Confirm section), `engine/runtime/case.ts` (confirmation), packs `acceptance/C6.4.test.ts`, `C6.5.test.ts`, `M3-CONTRACT.md` rows C6.4/C6.5, journey J7 3.1–3.8, `lib/setup_vv_m3.ts`, `qa/BUGS.md` (QA-149, QA-155), `RULES.md` gate B, `tools/m2-hot-files.txt`, DECISIONS P-133, P-134, P-142, P-169, P-238, P-242, P-243, P-251, P-316. `ai-workers/tools/freshness.sh` was run: it stops at once (`code/README-copies.md` is not in this cloud copy), so the team sources quoted (the SA-01B knock-on list in `domain/requirements-2026-11-02/`) are **Unverified**. All values below are Sample. Unconfirmed: no counsel.

## Verdict
**Build after these changes.** There is 1 Blocker and 7 Majors. The basis is right: P-242, P-243 and P-134 are applied, the API is reused, and nothing extra is added. The drawer, though, contradicts the pack on the main path (B1). Three more things are missing: what Confirm & use writes when a value was corrected, which a held SA-01B item touches (M3); the review of the values that are always expanded (M1); and the dynamic part of the checklist (M5).

## Objections
### Blocker
**B1. "Confirm & use is disabled while a check on that document is open" breaks the pack's own path.** *Needed for the proof.* Fact (high):
* **The pack's order:** the client types SAMPLEDE first (`C6.5.test.ts:79-80`). Then the officer's Confirm & use answers **200** (`:83-84`) and fills the rest at once (`:85`). Only then is there one open check on the family name, and the client's value is not overwritten (`:88-89`).
* **The concept** disables the button while a check is open (`concept-draft.md:48`; board frame 4 "Confirm & use disabled"). Built that way, C6.5-10 can never be reached from the screen. In the common case the whole passport also stays unused because one name differs: the client usually types before the passport arrives (P-242: Declared fills at once).

**Fix:** Confirm & use writes every value that agrees or is new. Each value that differs from a typed answer opens one check instead of replacing the answer, and the drawer says so before the click ("1 value differs from what the client typed: it opens a check and keeps the client's value until you choose"). A conflicting value is shown expanded beside the typed one even if the rule would collapse it, so no difference is hidden (P-242, "never resolved silently"). It is still counted as collapsed for P-243. Delete the "disabled" state and redraw frame 3's example on a name (a date of birth that differs is also expanded).

### Major
**M1. The drawer would write values the officer never sees.** *Needed for the proof.* Fact (high):
* The reader proposes 8 facts (`mrz.ts:32`). Sex, citizenship and country of issue have no check digit of their own, so they are always expanded (`mrz.ts:171-173`). Board frame 2 shows only the names, plus place of birth (which is not proposed), so those 3 values would be written by Confirm & use unseen. That goes against P-243 ("stay expanded for field-by-field review").
* The name note "the name may be cut short: check it against the printed name" (`mrz.ts:159`, `:172`) is not drawn.
* **Fix:** the document's block lists **every** proposal that Confirm & use will write, across sections, with the section named. Expanded values are shown one by one, with the name note. Place of birth goes under "Not on this document: type it", apart from the proposals.

**M2. Edits before Confirm & use have no route, and the correction count has no denominator.** *Needed for the proof.* Fact (high):
* Expanded rows are editable (`concept-draft.md:47`), and Q1 counts such edits as corrections. But the contract's `confirm-and-use` body is `{subjectId}` only (`M3-CONTRACT.md:27`).
* P-243 hands the team an **error rate** per mode. A count per case (`GET …/corrections`, `concept-draft.md:68`) cannot give a rate.
* **Fix:**
  * The body becomes `{subjectId, read, edits?: {fact: value}}`, where `read` is the id of the read the officer saw. It answers 409 if the document or the read changed since.
  * `document_review` stores, per fact, the mode, the proposed value, the value used and whether it was corrected. A later staff change to an answer whose source is `document_read` is counted from `runtime.ts`.
  * The read is staff only and gives corrected and reviewed counts per mode. Do not show the count in the drawer (board `:41`): P-243 hands it to the team, not to the officer.

**M3. The concept's Q2 asks the wrong question, and corrected values touch held SA1B-D107 and D89.** *Needed for the proof.* Fact plus judgment (medium):
* **Unchanged values:** C6.5-11 requires `answer.confirmed === true` (`C6.5.test.ts:85`). For any answer not typed by the client, only VERIFIED gives that (`engine/runtime/case.ts:57-58`). So VERIFIED is forced for unchanged document values, as in the team's knock-on "one Confirm & use writes Verified facts" (SA-01B v2.0 knock-ons:193, Unverified).
* **Corrected values:** a value the officer corrects and that is then written VERIFIED is "entered or corrected by staff counts as verified". That is exactly SA1B-D107 (knock-ons:128), still held by P-251 and P-316 (1).
* **"Checked against the document"** (C6.5-17, J7 3.6, `J7…md:46`) is left without a screen element and without a separate record. Its test asserts `VERIFIED|officer` (`C6.5.test.ts:101`), which step 10 already makes true.
* **Fix:**
  * The founder's question becomes Q1 below.
  * C6.5-17 records `source_json.checked_against = {document, by, at}`, and its test asserts that record.
  * One staff action, "Mark checked against the passport", is placed on a used value in the drawer's after-state.

**M4. The "client view" state and its test contradict the built API.** *Needed for the proof.* Fact (high):
* `list` reaches "officer" only (`case-checklist.ts:3`, `:54`; C6.4-2). So the client has no state-only view to draw.
* Upload is open to the case's client (`case-checklist.ts:7`, `:158` "answer"). So "client write 403" (`concept-draft.md:74`) is false for upload.
* **Fix:** the panel is staff only. Drop the client-view state (the client's screens come after M3, as r5c BR-7 says). The tests are:
  * the client's checklist read answers 403;
  * the client's Request and Not applicable answer 403 (C6.4-13);
  * the client's upload stays allowed and is not on this panel.

**M5. The panel drops the dynamic half of the checklist.** *Needed for the proof.* Fact (high):
* The API returns `waiting` lines ("answer … first"), kept lines (with "Kept on the list…"), `basis`/`empty_release` and `derived:false` (`engine/runtime/case-checklist.ts:46`, `:185-191`; `api/src/case-checklist.ts:90`, `:94-104`). Frame 1 draws only needed lines, so an RCIC reads a list that is not finished as complete. J7 3.2 needs the line to appear and go.
* **Fix:**
  * Add a "May be needed: answer … first" group under each person with no actions. A waiting line has no stored id, and acting on it answers 404, as QA-155 found.
  * Mark kept lines.
  * Use `basis` as the panel's note, and add the two empty states ("release has no document lines", "not worked out for this combination").

**M6. QA-149 is missing from the Definition of ready, so gate B refuses the PR.** *Needed for the proof.* Fact (high):
* QA-149 is an open Major on C6.4 (`qa/BUGS.md:53`). CI fails a product PR that names that capability unless the PR names the bug it fixes (`RULES.md:19`, `../rows.md:47-56`). rows.md lists "QA-149 closed" as the first wait (`:127`, `:802`). The concept's DoR (`:91-95`) does not.
* 2b's "Fill this from documents" button also edits `web/src/runtime/questionnaire.tsx`, the C4.4 renderer where QA-149 lives.
* **Fix:** the DoR gets "qa retests and closes QA-149 (CAPABILITIES says fixed) before the C6.4 (a) PR". The button is shown in agent mode only (C6.5-8 refuses the client), with a one-line hook.

**M7. The officer cannot see the passport while reviewing it.** *Needed for the proof.* Fact (high) plus judgment (medium):
* The expanded values must be checked field by field "against the printed name" (P-134 D2, `mrz.ts:159`). No route serves a stored document: `bytesOf` exists "for C6.5's reading; no route" (`case-checklist.ts:188`). The drawer and the panel's "History" therefore show no file. The officer would confirm names blind.
* **Fix:** a staff-only `GET /runtime/documents/:id/file` through `bytesOf` (sha256-checked, audit line). Add an "Open the passport" link in the drawer block and in History (opened in a new tab; no side-by-side viewer).

### Minor
* **m1. The board contradicts the release** (fact, high):
  * "Proof of funds · Every adult applicant": the release has it on the principal only (C6.4-4; `setup_vv_m3.ts:86`).
  * "Travel history" and "Letter of invitation" are not Visitor visa lines (`setup_vv_m3.ts:85-92`), and a letter has no checklist line (`C6.5.test.ts:113`).
  * "3 of 4 received" is shown with one line Received.
  * The child's reason uses the old yes/no "travelling alone". It is now "travels with", with four answers (P-230 (3)).
  * "CLIENT-A" cannot be on a coded line.

  Fix: redraw from the release. "Received" counts received, being checked and approved, out of the needed lines that are not Not applicable. *Needed for the proof.*
* **m2. The states are worded against the reader** (`mrz.ts:147-153`, `:169`):
  * a failed digit means that value is **not proposed** ("Could not read the passport number: type it from the passport page"), not "Review every value";
  * add "No text layer (a scan or photo): type the values";
  * add "Two people's passports on one file: upload each on its own line";
  * with nothing proposed, there is no Confirm & use.

  *Needed for the proof.*
* **m3. P-33 and the experience rules:**
  * the SI-14 chip is in 6b but not on the panel (J7 3.1);
  * "checksum" on the drawer block is a hash on the main path if it means sha256 (`EXPERIENCE.md:46`), so use "Check digits: passed/failed";
  * the drawer should be 480–560 px (`EXPERIENCE.md:37`; the board has 420).

  *Needed for the proof.*
* **m4. "Another" in the check panel** (`concept-draft.md:50`, r5c BR-7) has no field in `resolve {keep, reason}` (`M3-CONTRACT.md:27`). Fix: `keep: document|client|other` plus `value` when other, or draw two choices now. *Needed for the proof.*
* **m5. The ⋯ menu against the built rules:**
  * send the line's `version` and show the 409 words (`contracts/documents.ts:21-26`, `STANDARDS.md:27`);
  * Upload is hidden on Not applicable lines (`UPLOAD_FROM`, `contracts/documents.ts:14`; 409 at `case-checklist.ts:167`), and those lines offer Request instead;
  * Being checked, Approved and Rejected are shown but have no action (AG-09, P-169);
  * History is the file versions plus the last change. A history of state changes is *Not built*: say so rather than draw it.
* **m6. M2-hot, not stated** (fact, high): the new types for the edits, the correction read and `checked_against` must go in the **new** `studio/contracts/document-reads.ts` (`../rows.md:173`). Any edit to `studio/contracts/documents.ts` or `runtime.ts` is an M2-hot change (`tools/m2-hot-files.txt:26`; `m3-guard.sh`). `engine/render.ts` (hot) is reused, not modified. Nothing else in the concept touches a hot file.
* **m7. Q3 interim home:** agreed, provided `web/src/runtime/checklist.tsx` is self-contained and `cases.tsx` only mounts it, so C7.7 (same file, `../rows.md:380`) re-mounts it without rework. *Needed for the proof.*

## What is sound
* One Confirm & use per document, with no Confirm & use across documents (P-242; SA1B-D77 still held, P-316 (1)).
* The collapse rule matches `mrz.ts` M3 and the pack's E2, E4 and 18b.
* AI never reads the passport, and nothing happens on upload (P-134 D2, D4; C6.5-2, -6).
* The C6.4 API is reused unchanged: request, upload judged by the file, Not applicable with a reason, version 409.
* The team's state words; AG-09 is named as owner (P-169).
* Confirm section 409 while a check is open (C6.5-13).
* Sample synthetic passports only (P-133). PDF text layer only, which the copy now says (m2).
* Part 3 (letters by AI vision) is left out. Scope is not padded, and (b) waivers/P-172 is correctly breadth.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Panel lines and states, waiting, kept | `checklist_line`, `case_document` (built) | `GET /runtime/cases/:id/checklist` (built) | BR-1, BR-2, M5 | C6.4-31+: lines per person, waiting group, kept mark; client GET 403 |
| ⋯ Request / Upload / Not applicable | same, `version` | built `checklist-lines/:id/{request,documents,not-applicable}` | BR-3, m5 | Request→Received; empty reason 400 on the field; stale version 409; client Request 403 |
| Open the file | `case_document.sha256` | **new** `GET /runtime/documents/:id/file` (staff) | M7 | staff 200 with bytes; client of another case 403/404; changed file 409 |
| Fill drawer proposals | **new** `read_value` (document, fact, value, page, reader, confidence, review) | `POST …/sections/:s/fill-from-documents`, `GET …/proposals` (contract) | BR-4, BR-6, M1 | C6.5-3…9, 18, 18b; all 8 facts listed |
| Confirm & use | **new** `document_review` (per fact: mode, proposed, used, corrected; by, at) | `POST …/documents/:doc/confirm-and-use {subjectId, read, edits?}` | B1, M2, M3 | C6.5-9c, -10, -11; a conflict opens a check and the rest fills; stale read 409; second call changes nothing |
| Typed vs document | **new** `answer_check` | `GET …/checks`, `POST /runtime/checks/:id/resolve {keep, reason, value?}` | BR-7, m4 | C6.5-12…15 |
| Checked against the document | answer `source_json.checked_against` | `POST …/answers/:s/:f/checked-against-document` | M3 | C6.5-16, -17 asserting the evidence |
| Correction rate | `document_review` rows | **new** read, staff only (counts corrected / reviewed per mode) | P-243, M2 | C6.5-21…23 |

## Questions for the founder
1. **When the officer corrects a document value before Confirm & use, what status does it get?** *Recommend:* the same as the officer's own typing today: it waits for Confirm section. Unchanged values are written VERIFIED, as the pack needs. SA1B-D107 ("corrected by staff counts as verified") stays held until you rule on it. The other way would be VERIFIED at once. That decides D107 in passing, which P-251 says needs your ruling.
2. **When one value differs from what the client typed, does Confirm & use still write the others?** *Recommend:* yes. It writes the values that agree or are new, opens one check per difference, and keeps the client's value until a reason is given (pack C6.5-10/12, P-242). The other way, refusing the whole document, leaves the passport unused over one name.

## Lead response

## Agreement

## Build discoveries
