# Break report: QA-195 (identity documents by name), commit 369e4cf06

Under test: `engine/identity-documents.ts` (`isIdentityName`, `CODED_IDENTITY`), `engine/masters-ai.ts` `identityGuard`
(:196–209), `api/src/checklist.ts` `docTypeOf` (:143–149), the accept lander `api/src/proposals.ts` (:420–426) and
`decide` (:525–601). Rules: P-134 (AI never reads identity documents), P-153 (1) (code is the guard, on every proposal, whoever made it).
Method: engine driven directly with tsx (fixture shapes from `tests/fixtures/c34-answers.ts`, both rounds the same unless
stated, category "other", flag false, reader `letter_or_record`); the API on an isolated copy on :4447
(`xr_studio_qa195break`, since stopped and dropped). US$0: no live switch, no priced route.

## Findings

**B1 Blocker: any reviewer turns a guarded identity document back to an AI reader at accept.** `decide` with
`action: "edit"` checks only the contract (`proposals.ts:554–558`); the lander writes `readerProfile` as given (:426).
Repro on :4447: guarded masters item "Passport" (`person_only`, identity true, Check) → `POST /api/review/proposals/decide`
as user-C `{"action":"edit","payload":{…"name":"Passport","readerKind":"letter_or_record","identityDocument":false}}` → 201,
library row `passport | {"readerKind":"letter_or_record","identityDocument":false} | DRAFT`. Expected: refused (or
forced to a non-AI reader), as P-153 (1) says "whoever made it". The screen only offers "Accept the checker's reading"
(`web/src/pages/proposals.tsx:169`), which carries the guarded checker payload, so this is an API path, but the API is the guard.

**B2 Major: C2.6 still sends identity documents out with an AI reader.** `docTypeOf` uses the narrow `CODED_IDENTITY`
(`checklist.ts:140,145`) and `\bpassport\b` misses plurals. Run of `docTypeOf` (checklist IMM 5483):
`copy_of_passports`, `national_identity_card`, `birth_certificate`, `permanent_resident_card`, `citizenship_certificate`,
`drivers_licence`, `proof_of_identity` → all `letter_or_record`, `identityDocument:false`. The same name ("Birth
certificate") is identity in C3.4 and an AI-read record in C2.6, despite the module's "one list for every step" header.
Accepting such a line lands it through the same unguarded lander (B1).

**B3 Major: realistic identity names are missed by the C3.4 name list** (each: reader stays `letter_or_record`,
identity false, confidence **Ready**, so it can be bulk-accepted with no person looking, P-121):
- Generic ID: "ID", "Photo ID", "Government-issued photo ID", "ID document", "Identification card", "Identification
  documents", "proof of identity", "Identity papers", "identity and civil status documents", "Travel ID", "Travel doc".
- IRCC-relevant: "Certificate of identity", "Confirmation of Permanent Residence", "Proof of citizenship", "Driving licence".
- Passport pages: "Passport photo and information page", "Passport photo and bio page" (also "Passport photo/bio page"):
  `PHOTO_ONLY` strips "passport photo" because the next word is not exactly page/data/bio (`identity-documents.ts:13`).
- Spelling: "Pasport", "Passeport", "Pass port", "Pass-port", "ePassport".
Proven live: "Photo ID" and "Passport photo and information page", both Ready, bulk-accepted together by user-C
(one `accept` call with two ids) → library rows `letter_or_record`, identity false.

**B4 Major: the check runs on the raw name, not the normalised one.** The item key uses `plain()` (NFKD, curly quotes;
`masters-ai.ts:54,183`) but `isIdentityName` gets `x.payload.name` raw (:199). Missed: "Driver’s licence" (curly
apostrophe), "Ｐａｓｓｐｏｒｔ" (full-width, NFKD would fix), "travel document" (no-break space), "Travel  document"
(two spaces: the list uses literal single spaces), "Pass​port" (zero-width space), "Pass­port" (soft hyphen),
"Pаssport" (Cyrillic а). All Ready with an AI reader. These need a model or planted text to produce them; the guard should
not depend on the model's typing.

**B5 Major: non-English identity names pass as records.** "Carte d'identité", "Cédula de identidad",
"Personalausweis", "Aadhaar card", "Hukou (household register)" → `letter_or_record`, Ready. Client documents are often in
their own language.

**B6 Minor: rounds that disagree on the name split into two items; the unguarded one can be accepted.** Draft
"Passport", checker "Passeport" → two Decide items: "Passport" `person_only`, "Passeport" `letter_or_record`. Draft
"Travel doc" / checker "Travel document" the same. The guard pools the two readings only per key (:197–199), and the key is
the name. (Decide does make a person look; accept still lands an AI reader.)

**B7 Minor: false positives force a person's reading and label a non-identity type "identity document":**
"Passport-sized photo", "Passport sized photographs" (`(size|style)\b` misses "sized"), "Letter explaining passport
loss", "Passport fee receipt", "Passport request form", "Travel document fee receipt", "Statutory declaration in lieu of
birth certificate" → `person_only`, identity true, Check. In C2.6, "passport_size_photo", "passport_photos",
"two_passport_size_photographs", "letter_explaining_passport_loss" → `coded_lines`, identity true (a photo cannot be read by
coded lines; the photo carve-out was added only to `isIdentityName`, not to `CODED_IDENTITY`).

**B8 Minor: a name with no Latin letters or digits vanishes with no record.** "身份证" (or any CJK/Arabic name) →
`plain()` empty → `if (!key) continue` (`masters-ai.ts:184`) with no `dropped` entry: no item, no "left out" line.
Masters-step rule "never dropped silently" broken; not an identity bypass, since nothing is proposed.

**B9 Minor: the author's own add marks every new type `identityDocument:false`** (`studio.ts:816`), including
"Passport". Its reader is `person_only`, so not AI-read; the flag is wrong, and the second person can edit it to an AI
reader (B1).

## What held
- Case, plural and possessive: "PASSPORT", "passports", "Passport's data page" → `person_only`, identity, Check.
- "e-passport", "Biometric passport", "Refugee travel document", "National identity document", "PR card", "Permanent
  resident card", "Citizenship card", "Birth certificate", "Naturalisation certificate", "Driver's licence", "Driver
  license", "Drivers licence", `national_id_card` → guarded.
- "Passport photo page", "Passport photo-page", "Passport photos page" → identity (as required).
- Not identity: "Passport-size photo", "passport size photos", "Two passport photos", "Passport style photo", "Passport
  photograph", "Proof of travel", "Travel history", "Marriage certificate", "Bank statement".
- A flag on only one round still guards both payloads ("Passeport" with checker flag true → `person_only`, Check).
- "Passport" vs "Passport." collapse to one key and are guarded.
- Names over 120 characters are dropped with a reason before the guard (both "Passport x…" and "x… Passport").
- An unknown reader ("ai_vision") becomes `person_only`.
- `isIdentityName` is not stateful: the `/g` on `PHOTO_ONLY` is used only in `replace`; three calls in a row give the same answer.
- The review screen gives no free edit of `readerKind` or the name; its one edit carries the guarded checker payload.

## Not tested
UI layout, keyboard and zoom (no screen change in this commit); hostile PDF upload (no live AI; the masters step reads
recorded rounds only); the second-person approve and publish of a landed type (`change-sets.ts` reads `proves` only, so
B1–B5 rows would publish as they landed; not driven).
