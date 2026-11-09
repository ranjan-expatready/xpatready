# Break report: C6.5 part 2a, the document-reading API (PR #1369, `ab717fdbd`)

The breaker (qa) ran this on 8 Nov on its own copy `br_c65` (:4435, `xr_studio_br_c65`, fixture: setup_visitor_visa + setup_vv_m3), and has stopped it. No live AI was used and nothing was spent (US$0). Scripts are in the session scratchpad, not committed.
Baseline: `acceptance/C6.5.test.ts` scored 30/32. The two reds, C6.5-19b and C6.5-20 (no saved letter read), are expected.
Paths: `cd` = `studio/api/src/case-documents.ts`, `mig` = `studio/prisma/migrations/20261108090000_c65_document_reads/migration.sql`.

## Findings

**B1. Blocker: a check from a superseded passport overwrites a value that agrees with the current passport (stale document).**
Steps: (1) the officer types the family name SAMPLEDE; (2) passport file 1 reads SAMPLED, and Fill then Confirm & use opens check K; (3) file 2 of the same type, reading SAMPLEDE, is uploaded to the same line, and file 1 becomes `current=false`; (4) Fill on file 2, then Confirm & use: `agreed` includes person.family_name, so SAMPLEDE is now VERIFIED, while check K stays open, still showing `document_value` "SAMPLED" from file 1 with no sign that the file is superseded; (5) `POST /checks/K/resolve {keep:"document", reason:"Matches the passport"}` returns 200.

Result: the current answer is `VERIFIED|SAMPLED`, with source_json.document = file 1. The case now has a Verified answer that contradicts its current passport, and no check is open.
Cause: `cd:386-403` resolves without asking whether `row.documentId` is still current. Also, Confirm & use of a newer file that agrees leaves the old check open (`cd:340-349`).
Fail test: in the flow above, step 5 answers 409 `not_current` (or the check closes itself as superseded) and family_name stays SAMPLEDE.

**M1. Major: resolve keeps the document over a newer answer nobody saw.** `answerId` is optional (`cd:107`), and the guard at `cd:394` only runs when the client sends it.
Steps: (1) a check is open (typed SAMPLEDE, document SAMPLED); (2) someone answers SAMPLEDX, and GET /checks still shows `typed:"SAMPLEDE"`, with the new value only under `current`; (3) `resolve {keep:"document", reason:"…"}` with no answerId returns 200.

Result: SAMPLEDX is superseded by VERIFIED SAMPLED. With a stale answerId the call correctly answers 409 `changed`.
Fail test: resolve without answerId after the answer changed answers 409 `changed` (make answerId required, or compare against `row.answerId`).

**M2. Major: a second document's differing value disappears into the first check (BR-7 "never settled silently").**
Steps: (1) type passport_number SAMPLEP00; (2) upload `passport_or_travel_document` (SAMPLEP12) and `…_information_page_photocopy` (SAMPLEP77); (3) Fill, then Confirm & use both, one after the other.

Result: both read_value rows are `conflict`, but there is only one check, showing SAMPLEP12 from document 1 (`cd:342-346`: an open check is reused and its document value is not updated). Resolving it with keep "answer" leaves 0 open checks, so SAMPLEP77 was never shown to anyone.
Fail test: after the second confirm, GET /checks lists both document values for this person and fact (one check holding several values, or a second check after the first resolves). Resolving must not hide SAMPLEP77.

**M3. Major: a reason that is not in Latin script cannot be saved (500).** The DB's locale is C, so `reason ~ '[[:alnum:]]'` (`mig:111`) matches ASCII only.
`resolve {keep:"answer", reason:"पासपोर्ट नवीनीकृत हुआ"}` returns 500 "Something went wrong"; the check stays open, which also blocks Confirm section. In psql, `'é' ~ '[[:alnum:]]'` gives f, and so do '日本語' and 'पासपोर्ट'. The result depends on the database's locale, so it differs between environments.

Fail test: a Hindi or Chinese reason returns 200 and is stored. A direct-SQL insert of reason 'é' is accepted. A reason of 'ㅤ' (U+3164) is refused in both the API and the DB.

**M4. Major: an open check on the case's own facts is not a readiness warning.** `readiness-inputs.ts:125` keeps only checks whose subject has forms (`personOf`). The letter's facts (case.visit_contact_*) sit on the case subject, so their checks never appear.
Steps: (1) insert an open check by SQL on case subject / `case.visit_contact_name` (letters cannot open one yet, because there is no saved read); (2) GET /prepare shows 0 `open_check`; (3) Confirm section `your_visit` is correctly refused with 409 `open_checks`.

This is latent until part 3 saves a letter read.
Fail test: with an open case-level check, every filing of the case shows a CRITICAL `open_check`.

**M5. Major: the case-level upload replaces a checklist file and skips the line's rules.**
Steps: (1) the officer uploads a passport on the line, then marks the line Not applicable; (2) the client (user-P) sends `POST /cases/:id/documents {documentType:"passport_or_travel_document"}` and gets 201.

Result: the officer's file becomes `current=false`. The line is still `not_applicable`, yet its current file is now the client's. The line route refuses this ("request it again before uploading"), and it checks the line's version, which this route skips.
Cause: `cd:165` accepts any release document type, not only line-less kinds (`CASE_KINDS`).
Fail test: a case-level upload of a type that has a checklist line answers 422 and stores nothing.

**M6. Major: "checked against the document" accepts any file of the person (P-142 D3).** `cd:418` accepts any of the person's files, including superseded ones and types that cannot evidence the fact. Each of these returned 200 and stamped the answer VERIFIED: person.date_of_birth checked against a Proof of financial support, and person.date_of_birth checked against a superseded passport.

Fail test: both answer 422 or 409. The file must be current, and its type must be able to give the fact (`readerOf(...).supplies`, or the release's `supplies_facts`).

**m1. Minor: two query values give 500.** `GET /proposals?subject=A&subject=B` and `GET /checks?subject=A&subject=B` return 500, because `.toLowerCase` is called on an array (`cd:153`). Fail test: both return 400.

**m2. Minor: an unknown `state` is ignored.** `GET /checks?state=bogus`, and `state=open&state=resolved`, return every check instead of 400 (`cd:375`).

**m3. Minor: invisible "letters" reach the database and come back as 500 instead of 400.** A Hangul filler (U+3164, U+115F) is `\p{L}`, so it passes the zod check (`cd:106`). INVISIBLE in `contracts/documents.ts:20` does not include it. Only the DB constraint stops it. Fail test: 400 "Give a reason in words."

**m4. Minor: a passport's sex never fills.** `inReleaseWords` maps F to "Female" from the form's code list (`cd:133-136`), but the answer list keys are `f_female`, `m_male`, `u_unknown` and `x_another_gender`. Every passport therefore leaves sex "for a person", with the misleading text "Choose one of the listed answers". The commit says "coded values in the release's words". X becomes "Unspecified", which is not one of the keys. Fail test: an F passport writes `f_female`.

**m5. Minor: the wrong limits are named in refusals.** A 21 MB file gets 413 "A file is larger than 25 MB" (the limit is 20 MB). Two files get "Add at most 20 files at a time" (the limit is 1). Both come from `main.ts:199`.

**m6. Minor: resolve tells another firm a check exists.** For user-S, a real check id answers "No such case." and an unknown id answers "No such check." (`cd:383-386`). Fail test: both give the same 404 text.

**m7. Minor (latent, P-134): the uploader's label alone decides the reader.** A passport uploaded by the client as `letter_of_invitation` is planned for `ai_vision` (`cd:66-68`). The live read is refused today and replay is by checksum. Fail test: a file whose text holds a TD3 coded zone is never planned for AI.

**m8. Minor: the database leaves gaps behind the code.** Each of these direct-SQL changes was accepted: confirmed_* overwritten, or set back to null (the migration's comment says "a second one is refused"); a resolved check reopened, or its reason rewritten; `read_value.reader='ai_vision'` on an `mrz` review, and `document_review.reader` changed to `ai_vision`; read_value with a case, subject or document different from its review's; `state='used'` with a null `answer_id`; answer_check whose `document_id`, `answer_id` or `subject_id` points to nothing, or to another case.

Deleting a case_document cascades away its resolved checks and their reasons (no route deletes one today).

**m9. Minor: the rollback text misses one loss.** The text itself works: a dry run of `mig:15-17` in a transaction succeeded, then was rolled back. It does not say that open checks vanish, which settles every typed-versus-document difference silently in favour of the typed answer. Suggested addition: "list `answer_check` where state='open' before rolling back".

**m10. Minor: a check stays open, and blocks Confirm section, after the answer was changed to agree with the document.** A reason is still needed to close it. This is defensible under BR-7, so it is noted, not argued.

## What held
- **Roles, on every route:**
  - P: upload 201 on their own case; 403 on the other routes.
  - Q: 404 on upload; 403 on the rest.
  - A, B, C: 403.
  - S (another firm): 404.
  - No header or an unknown actor: 401.
  - Ids from another case, document or person: 404 or 422.
- **Races:**
  - 5 Confirm & use at once: one 200 and four 409, with one answer written.
  - 5 fills at once: one review.
  - 4 resolves at once: one 200.
  - Two documents confirmed at once (8 trials): one 200 and one 409, no 500, nothing half-written.
  - Three "checked against" at once: one 200.
- **Stale and unread:** Confirm & use on a superseded file gives 409 `not_current`; on an unread file, 409 `not_read`. A stale answerId gives 409 `changed`.
- **Bad reads:** two passports in one PDF propose nothing. A bad check digit leaves the number unreadable, collapses nothing and writes no number. A planted "SYSTEM: …" PDF with a fake coded line proposes nothing. A garbage PDF is all unreadable.
- **Left or not asked:** country codes are left for a person. A passport on the case subject is `not_asked`, with nothing written.
- **Uploads:** text or HTML named .pdf gives 415; empty gives 400; the wrong field gives 400; exactly 20 MB gives 201.
- **Reasons and bodies:** empty, space-only, zero-width, braille-blank, soft-hyphen, mark-only and punctuation-only reasons get 400; 501 characters gets 400; 500 characters plus invisible characters is stored as 500. Malformed bodies get 400, and an unknown section gets 404.
- **Letters:** no mode gives 409 `cost_first`; live gives 409 `live_refused`; replay with no saved read gives 409 `no_saved_read`. The plan shows usual US$0.03 and worst US$0.20, with `live_allowed:false`. No review row is stored and no ai_batch row is added.
- **Open checks:** Confirm section is blocked with 409 `open_checks`, both on the person's section and for a check on a case fact. The prepare view shows CRITICAL `open_check` for a person's check.
- **Database:** these were refused: a second open check, a resolved check with no reason or no resolver, an open check with `kept` set, collapsed but unchecked, confidence above 1 or NaN, page 0, a duplicate fact, a second review, confirmed_by without confirmed_at.
