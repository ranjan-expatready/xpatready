# FO-13 break report (schema only: fo_conflict_check, fo_identity_check)

Commit 8d10d65 (branch claude/kind-planck-uyprqb); the migration SQL was the same at 845b8f0 (only a comment was added later).
Scratch database xr_studio_fo13_break_19540 on 127.0.0.1:54329: every migration applied in order, Sample firms and staff seeded with
`seedSampleFirms`, attacked through psql and through the Prisma client as `xr_studio`, then dropped. US$0, no live AI. M = migration.sql of
`prisma/migrations/20261114190000_fo13_compliance_tables`. `$FA` = the sample-firm id; R, T = its staff; S = sample-solo staff. Builder test: 63/63 pass.

## Breaks

**B1 Major: a check with no result can carry a written-consent reference and disclosure text, and the consent then locks the result** (M:170-175).
`insert into fo_conflict_check (id,firm_id,party_kind,person_id,searched_name,hidden_count,result,written_consent_ref,checked_by) values (gen_random_uuid(),'$FA','PERSON',gen_random_uuid(),'n',3,null,'ref','$R');`
This succeeds. The same insert with `disclosure_text='Sample disclosure'` and `result null` also succeeds, and so does
`update fo_conflict_check set written_consent_ref='signed-retainer-1'` on a waiting check. Cause: `"result" = 'POTENTIAL_CONFLICT'` is NULL
when the result is NULL, and a CHECK that evaluates to NULL passes. After that, confirming as NO_CONFLICT or CONFLICT_CANNOT_ACT is
refused (consent_check), and clearing the reference is refused by the trigger. The only result the confirmer can then give is POTENTIAL_CONFLICT.
Expected: only a POTENTIAL_CONFLICT row carries a disclosure or a consent reference, so both are refused while the result is NULL.

**B2 Major: a disclosure with paragraphs cannot be stored** (M:117, `t !~ '[[:cntrl:]]'`, used at M:171).
`prisma.foConflictCheck.create({ data: { …, result: "POTENTIAL_CONFLICT", disclosureText: "Paragraph one.\n\nParagraph two." } })` is refused
by `fo_conflict_check_disclosure_check`, and so is a tab (`E'Item:\tone'`). The disclosure is the retainer text the client reads (s. 24(3)(o)),
so it will normally have line breaks. Expected: line breaks and tabs are allowed in disclosure_text, and only other control characters are refused.

**B3 Major: a full document number can be stored in the identity check's other columns** (M:184-185, M:196-198).
`insert into fo_identity_check (…, method, method_detail, document_type, issuing_country, document_number_last4, …) values (…,'IN_PERSON','Passport AB1234567 seen, holder Sample','PASSPORT','GB','4567',…)`
is accepted. `'VIDEO','document no. 123456789 shown on camera'` with no document is accepted. A `copy_file_key` of
`'identity/passport-AB1234567.pdf'` is accepted, and the key has no fixed shape: `../` and any 1024 non-space characters pass.
In the conflict check, `matches[].recordId` (`"passport:AB1234567;dob:1980-01-01;note:anything-at-all"`) and `caseNumber`
(`"Passport AB1234567 DOB 1980"`) also take free text. Expected (brief: "the last 4 characters only"): no column can hold a full number.
At minimum, method_detail refuses a long run of digits or letters, and copy_file_key matches the FilesPort key shape.

**B4 Major (platform-wide, not FO-13's code alone): the app role can switch off every trigger, so session_replication_role IS in scope.**
`xr_studio` is a superuser (`rolsuper = t`) and owns both tables. The builder's own test already runs `set session_replication_role = replica`.
- `begin; set local session_replication_role=replica; delete from fo_conflict_check; delete from fo_identity_check;` gives DELETE 37 / DELETE 15;
  `update fo_conflict_check set result='POTENTIAL_CONFLICT', disclosure_text='rewritten', searched_name='rewritten' where id=…` gives UPDATE 1; `update fo_identity_check set method_detail='rewritten' where true` gives UPDATE 15.
- `delete from platform_staff where id=<a confirmer>` gives DELETE 1, because replica mode also skips the RESTRICT foreign keys and leaves the row pointing at nothing.
- Without replica mode, `alter table fo_identity_check disable trigger user; update … set method_detail='Passport AB1234567'` also works.
CHECK constraints still hold in replica mode. Expected: the app connects as a role that is not a superuser or the table owner, so the
insert-only and no-delete rules are real. This was not fixed here; it needs a decision on the database role.

**B5 Minor: some text that looks blank or is misleading is accepted** (M:117). The C-locale `[[:space:]]` covers ASCII only, and the extra
blank list covers just U+00A0, U+200B-D, U+2060 and U+FEFF. Accepted:
- `disclosure_text = E'ㅤㅤ'` (Hangul filler), `E'　'`, and `E'͏́'` (combining marks only);
- `searched_name = E'⠀'`, `E'­'`, `E'   '`;
- `method_detail = E'ㅤ'` when the method is OTHER;
- `recordId = "ㅤ"`.
U+2028 (line separator) is accepted in names while `\n` is refused. The bidi override U+202E is accepted in `displayName` and `method_detail`,
so a name shown to staff can be spoofed.

**B6 Minor: `score` has unlimited precision, so the payload has no real size limit, and matches can be rewritten** (M:147).
500 matches with a 16,383-digit score each is accepted: 8.8 MB of text, 4.75 MB stored, in one row. Because jsonb compares numbers by value,
`update fo_conflict_check set matches='[{…,"score":0.5000…(16000 zeros)}]'` on a row stored with `0.5` passes the "never changes" trigger
(M:224-229) and rewrites the stored text to 16,092 bytes. Expected: `score` has bounded precision (for example at most 4 decimal places).

**B7 Minor: match fields that should be fixed values are not.**
- recordId: any 200 characters with no spaces. A FRONT_OFFICE kind does not have to be a uuid.
- caseId and caseNumber: accepted on `source: FRONT_OFFICE` (`kind: LEAD`).
- Duplicates: three identical matches in one array are accepted.
- `searched_phone = '()-./'` (no digit) and `searched_email = 'x'` are accepted (M:161-162).
- `issuing_country = 'ZZ'` (not an ISO 3166-1 code) and `document_expiry = '0001-01-01'` are accepted (M:191, M:194).

**B8 Minor: who confirmed, and when, is whatever the writer says.**
- One INSERT can create a check already confirmed: `hidden_count 2, 'NO_CONFLICT', confirmed_by T, confirmed_at now()` by R. There is no separate confirmation step.
- `confirmed_at = checked_at` (backdated) is accepted, and so is `'2999-01-01'`.
- `checked_at` is set by the caller: `'1900-01-01'` is accepted on a conflict check and `'2999-01-01'` on an identity check.
- A DEACTIVATED staff member (user-O) is accepted as checker of either table and as confirmer. The database cannot know who is acting, so this needs FO-13c/i. Two cheap guards are possible: refuse `confirmed_by` on INSERT, and default the times to now().

**B9 Minor: search_path hijack inside `fo_compliance_matches_ok`** (M:124-150). The functions have no `SET search_path` (`proconfig` is null).
`create schema evil; create function evil.fo_compliance_text_ok(text,int) returns boolean as 'select true'; set local search_path = evil, public;`
After that, a match with `"displayName":""` and a 5,000-character `caseNumber` is accepted. CHECKs that call text_ok directly are bound to
the function's OID and held. This needs CREATE on a schema, which the app role has (see B4).

**B10 Minor: an explicit cast keeps the first 4 characters instead of refusing.** `document_number_last4 = 'AB1234567'::varchar(4)` stores
`AB12`. That is not the last four, and no error is raised. Prisma's own insert of `'AB1234567'` is refused (held).

**B11 Minor: refusal errors repeat personal data.** Every CHECK refusal includes `DETAIL: Failing row contains (…)` with all columns:
searched name, email and phone, disclosure, method_detail, copy_file_key. That detail goes into the PostgreSQL log and the error Prisma returns.

## What held
- **Party and search terms:** both parties, no party, or the wrong kind for the party is refused. No searched term, a blank term, or a name over 300 characters is refused. Chinese, Arabic and accented names of 300 characters are accepted.
- **Matches:** refused when they are an object or a nested array; contain `null`, a string or an extra key such as `passport`; repeat a key with a wrong value (`source` as the last key); use a lower-case `source` or a kind from the other source; have a numeric `recordId`, a `recordId` over 200 characters or of only U+200B; contain a JSON `\u0000`; have an upper-case or null `caseId`; have an empty or newline `displayName`; have `matchedOn` empty, holding null, repeated, lower-case or a plain string; have a `score` that is a string, null or 2; or have 501 elements.
- **Results:** hidden_count -1 is refused. NO_CONFLICT with hidden matches and no confirmation is refused. A NULL result without hidden matches is refused. A disclosure on NO_CONFLICT or CONFLICT_CANNOT_ACT, a consent reference on NO_CONFLICT, and a disclosure over 10,000 characters are refused. Blank text (spaces, U+200B, U+00A0) is refused.
- **Confirmation:** refused when the confirmer is the checker, comes from firm B (foreign key), has no hidden matches to confirm, is dated before the check, or gives a name without a time.
- **Updates:** refused for:
  - the result without a confirmation, or a confirmation without a result;
  - a confirmation that also changes hidden_count;
  - changing a result once given, giving a second confirmation or removing one;
  - changing the consent reference or setting it to NULL;
  - changing the disclosure together with a later confirmation;
  - changing id or prospect_id;
  - `ON CONFLICT DO UPDATE`, MERGE update and MERGE delete;
  - Prisma `updateMany` and `deleteMany`.
- **Concurrency:** two sessions confirming the same check give one success and one "the confirmation is given once". Two sessions setting the consent reference give one success and one "recorded once".
- **No delete or truncate:** DELETE and TRUNCATE are refused on both tables. `TRUNCATE platform_staff CASCADE` is refused by the fo_conflict_check truncate trigger.
- **Staff and firm keys:** deleting a staff member named on a check, or changing the id, is refused (RESTRICT). Moving staff to another firm is refused (PF-3). Deleting a firm is refused. A checker from firm B is refused on both tables. The foreign keys are RESTRICT/RESTRICT and MATCH SIMPLE, which is safe because firm_id is NOT NULL.
- **Identity check, document number:** refused for 9 characters (22001 in psql and Prisma), lower case, full-width or Arabic-Indic digits, 3 characters, or an inner space. `'AB12      '` is stored as `AB12`, which is harmless.
- **Identity check, document and copy:** a partially named document is refused, and so is an expiry or copy without a document. A copy without a sha256, an upper-case sha256, a lower-case or 1-letter country code, or an infinite expiry is refused.
- **Identity check, other rules:** OTHER needs a detail, and DOCUMENT_COPY needs a document. A copy is optional (per the brief, so not a finding). Details that are empty, null, repeated, contain NULL or are two-dimensional are refused. UPDATE, upsert, DELETE and TRUNCATE are all refused.
- **Indexes:** firm_id comes first in every index except the primary key.
- **Migrate diff:** `prisma migrate diff` from the migrated scratch database to `prisma/schema` names no FO-13 table or type. It shows existing drift on other tables (fact_source, form_edition_accept, person_role, validated_copy, canonical_field_name).
