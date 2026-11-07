# B3 — Sign and scan by screens (C8.1): concept (screens lane, 7 Nov; for the tech lead's approval after the fresh challenge, P-223 (4), P-392)

**Row:** M3 sprint plan (`design/m3-sprint-plan-2026-11-06.md`) row B3, journey J-B3 (§6). **Fixes:** QA-251 (with B2, merged). **Builds on:** the prepare-tab concept r2 (`screens/M3-design-2026-11-04/prepare-tab/concept-draft.md`) BR-2 (the copy block lives in the form row), BR-4 (only the API's states), BR-10 (a signing row: each step with its state), BR-11 (staff only, a 409 shows its own `detail`). Every name and value shown is **Sample**. Legal points: Unconfirmed: no counsel.

## 1. Job and journey
* **Job:** on a form signed by hand and scanned, the case officer records each step of its signing (Printed → Signed by hand → Signed scan received → Uploaded to IRCC) from the form's own row, knows who must sign, and is never able to record a step out of order or on an out-of-date copy.
* **Persona:** the case officer (the representative of record sees the same, as staff). Not the client (their own upload is the client portal, after M3).
* **Journey:** J7 5.7, 5.8 (`acceptance/journeys/J7-visitor-visa-end-to-end.md`); J-B3 ends at C8.2's "Record the submission". SA-01B "Forms at launch"; r5c BR-8, BR-10, BR-21; P-65, P-136, P-143.

## 2. Ten layers: what exists, what is new
| Layer | Exists (main ecbd6830) | New here |
|---|---|---|
| Engine | `engine/runtime/signing.ts`: `SIGN_STEPS`, `SIGN_STEP_WORDS`, `stepRefusal`, `signedState`, `signersOf` | **split (challenge M3):** the steps, their words and `stepRefusal` move unchanged to `engine/runtime/sign-order.ts` (no import), re-exported by `signing.ts`, so the browser reads the server's one rule |
| Data | `sign_step` (superseded on a re-print, C9.2), `signed_scan` (append-only, sha256) | none (no migration) |
| API | `GET /runtime/items/:id` (steps, scans, signers) · `POST …/sign-steps/:key` · `POST …/signed-scan` · `GET /runtime/cases/:id/prepare` (items with `signature`, `signers`, `state`, `reason`, filing status) | none |
| UI | `FormRow` in `web/src/runtime/forms.tsx` (the copy block); `ReadinessPanel` (B2) | **`web/src/runtime/sign-steps.tsx`**: a "Who signs" line on every form row, and the signing block on a hand-signed row; one mount line in `FormRow` |
| Types | — | in `sign-steps.tsx` only (prepare-tab §2: never in `studio/contracts/`) |

## 3. Business rules (each from its source; nothing new decided here)
* **BR-1 Who signs** (C8.1-1, -2; VV-R09, VV-R10; SH3 R7): every form row says who signs it, from `/prepare`'s `signers`, in words: the person by name; "a parent" for a child under 18; "the principal applicant, for the family"; "the representative of record" by name (case team, C6.11). With the line's method (`SIGNATURE_WORDS`). Never worked out in the browser. No representative of record yet: "(not chosen yet on the case team)"; "No signature": "nobody"; a line whose signer is not set: says so (challenge m4).
* **BR-2 Steps only where they apply** (Devin on #617): the block shows only where `/prepare`'s item says `signature: "HAND_SCANNED"`; any other form shows no steps (the server refuses them, 409).
* **BR-3 In order, one next action** (C8.1-3, -4; EXPERIENCE §2.5, §2.8): the four steps as a numbered list, each done step with who and when. Only the next step has a button. A later step reads "Cannot start yet" (GOV.UK task list) and shows why it waits in the engine's own words (`stepRefusal`, the function the server refuses with): "Signed by hand comes after "Printed": print IMM 5476 first." So "Signed before Print" is refused in words before it is tried; a stale page that still sends a step out of order gets the server's 409 `detail` under the block.
* **BR-4 Print names the copy** (C8.1-5, -6; Break M1 on #617): "Printed" sends the newest generated copy's id; the step shows "Copy of {date}". Only a copy the copy block would file is offered: current, its file there, not stamped "Copy, not for filing" (challenge m2). A form whose filling is not proven yet is warned, not blocked (EXPERIENCE §2.9: the checkpoint's IMM 5476 has no fill trial recorded, so blocking it would leave nobody able to sign): "… Check the copy against the case before it is signed." Otherwise the step says why ("Generate a copy of {form} above first…", the copy block's own reason) and has no button. A Download link to the same copy sits beside it (the copy block's own).
* **BR-5 Signed by hand** (C8.1-7): one press; who and when recorded. There is no "sign for the client" action (C8.1-12).
* **BR-6 Upload the signed scan** (C8.1-8, -9, -10; QA-285 ruling): one file through the existing upload route (the upload door; the file stays in the app's own folder); PDF, JPEG or PNG judged by its bytes on the server; up to 20 MB (checked in the browser first, `MAX_DOCUMENT_MB`). A refusal shows the server's words on the field, nothing stored. Once in: the file name, type, size, who and when; the checksum in a tooltip (EXPERIENCE §5: no hashes on the main path). The item then reads Ready (the API's state and reason).
* **BR-7 Uploaded to IRCC** (C8.1-11, -13; BR-21; L-SA3): a button only when the filing's status in `/prepare` is Ready to file; before that the step says the engine's words and links to the Ready to file panel (B2). Done → the item is Done.
* **BR-8 Signing again** (C9.2, BR-12, BR-20; challenge M1): exactly when the server's `restart` allows it: Printed done, Uploaded to IRCC not, and the printed copy reads Out of date in the row's copy list (the same changed-facts test) or the view asks for a new signed copy (`replaces`). Then Signed by hand and the upload are not offered; the block says the signed copy is out of date and offers "Printed: the new copy of {date}" once a current copy exists (the server supersedes the earlier steps and keeps the earlier scan). After Uploaded to IRCC: the API's `reason` only, no button. The block binds to the item by form and person, never the `record: "signed_scan"` entry.
* **BR-10 Read-only once recorded** (challenge M2; C8.2): when the filing reads `submitted` / `read_only`, the steps done stay, no button, and an unticked "Uploaded to IRCC" is said in words. The server's own refusal of a step on a recorded application (`refuseIfRecorded` in `api/src/sign-steps.ts`) is a question for the tech lead (runtime lane's file, not this row's).
* **BR-9 Staff only; conflicts** (prepare-tab BR-11): the client never sees the block (403 on the routes); a 409 shows its own `detail` (another person did the step: "…was just done for IMM 5476 by someone else: read the item again"), then the item is read again.

## 4. Layout
**Pattern:** inside the existing form row (prepare-tab BR-2: the copy block stays in the row; BR-10's signing row). Under the copy line:
```
Who signs: Sample Client A and the representative of record (Sample Rep R) · Signed by hand and scanned
┌ Sign and scan ─────────────────────────────── [Ready] IMM 5476 is signed by hand and its signed scan is in… ┐
│ ✓ 1 Printed            Copy of 7 Nov, 10:42 · by Sample Officer O, 7 Nov 10:45                            │
│ ✓ 2 Signed by hand     by Sample Officer O, 7 Nov 10:46                                                    │
│ ✓ 3 Signed scan received  imm5476-signed.pdf · PDF · 2 KB · by Sample Officer O, 7 Nov 10:47              │
│ ○ 4 Uploaded to IRCC   IMM 5476 is uploaded to IRCC only once its filing is Ready to file. Go to Ready to file │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
The next step carries the one primary button ("Printed: the copy of 7 Nov, 10:42" · "Signed by hand" · "Upload the signed scan…" · "Uploaded to IRCC"). **States:** loading (skeleton + sr-only status) · could not load (Retry) · not hand-signed (no block; the Who signs line only) · no copy yet · out-of-date copy · each of the four steps next · a refusal (server words) · uploading (busy) · Done · signing again (BR-8) · long file names wrap · read-only (client: no block). 1024 px: steps stack, no sideways scroll.

## 4b. Best in class (P-392; primary sources, read 7 Nov 2026)
**How read:** the vendors' and governments' own pages, as indexed by search on 7 Nov 2026; canada.ca and helpx.adobe.com could not be opened from the cloud session, so **every quote and page date is Unverified** until opened (P-170). Nothing here sets an immigration value.
| Source (primary page) | Quote (as indexed) | Best at | For this screen |
|---|---|---|---|
| IRCC operational bulletin, Use of representatives › Complete applications (canada.ca …/use-representatives/complete-applications.html) | "Both the applicant and the representative … must sign the Use of a Representative form (IMM 5476). An unsigned form is not a duly completed form" | a plain rule on who signs | **Copy:** "Who signs" names both on the row, by name (BR-1), from the release's line, never typed |
| Adobe Acrobat Sign, allow the signer a written signature (helpx.adobe.com …/allow-signer-written-signature.html); agreement status `WAITING_FOR_FAXIN` (developer.adobe.com) | "they will see the option to Print and Upload in the Options dropdown" | a status that says exactly what it waits for | **Copy:** each waiting step says what it waits for, in the engine's words (BR-3); **beat:** inline on the form's row, no separate signing page |
| DocuSign Print & Sign (DocuSign Community posts; no official page found) | "Print the document > Sign > Scan the document > Upload on the envelope" | the four-step wet-sign order; the upload kept beside the unsigned copy | **Copy:** the same order, and both kept: the printed copy and the signed scan (append-only, checksum) |
| Intuit ProConnect, diagnostic ref 8982 (accountants.intuit.com) | "taxpayer's signature date is required for PIN signature e-file returns" | e-file blocked with a named reason | **Beat:** a reported gap (dashboard still "Not started" after a wet signature, community, Unverified): here the step and the item's state come from one record, so they never disagree |
| IRS Form 8879 instructions (as quoted; irs.gov URL not confirmed) | "Your return won't be transmitted to the IRS until the ERO receives your signed Form 8879." | filing gated on the signed authority | **Copy:** "Uploaded to IRCC" waits for Ready to file, with the condition shown beside it and a link to it (BR-7) |
| Docketwise e-Signature (support.docketwise.com …/6685005) | "you can see who still needs to sign by mousing over the status" | the file frozen once sent to sign | **Beat:** who signs is on the row, not behind a hover; **copy:** the printed copy is named and a changed fact asks for a new print (BR-4, BR-8) |
| GOV.UK Design System, task list (design-system.service.gov.uk/components/task-list) | "'Cannot start yet' … if the user cannot start the task yet - for example because another task must be completed first" | a standard words for a locked step | **Copy:** a waiting step reads "Cannot start yet" plus one line why (the API's own state word, BR-4 of the prepare tab) |

**How it saves effort and prevents errors:** one row, no new page; the copy to print is picked for you (the newest generated, current one), never typed; a step out of order or on an out-of-date copy cannot be pressed, and says why; the size is checked the moment the file is chosen and its type by the server from the file's own bytes (the picker only filters); who and when are recorded, never typed. **Seen, not taken (no scope added):** a page-count check of the scan against the printed copy (DocuSign) and a signature-date age warning (IRCC's 90-day point, Unverified) are follow-up suggestions for the tech lead, not this row.

## 5. Copy
* Done steps: "recorded by {name}, {when}"; Signed by hand: "Signed by {who signs} · recorded by …" (challenge m1). The scan's checksum behind a focusable "Checksum" (m6).
* Block heading: "Sign and scan". Hint: "Signed by hand and scanned: print the copy, have it signed, upload the scan. Each step is recorded with who and when."
* Steps: the engine's words (`SIGN_STEP_WORDS`). Waiting: the engine's `stepRefusal` words. Out-of-date copy: "This copy is out of date: generate a new copy and print that one."
* Upload field label: "Signed scan of {form} (PDF, JPEG or PNG, up to 20 MB)". Too large: "The file is larger than 20 MB. Nothing was stored."
* Toasts: "{form}: Printed (copy of {date})" · "{form}: Signed by hand" · "{form}: signed scan received" · "{form}: Uploaded to IRCC".

## 6. Contract and tests
**Contract:** the routes in §2, unchanged. **Tests:** `acceptance/C8.1.test.ts` unchanged (14/14 on the checkpoint). New browser check `tests/check_c81_sign_browser.ts`, journey J-B3 on the configured checkpoint, 1440 and 1024 px, keyboard only, axe per state, screenshots to `screens/C8.1/screenshots/B3-*`:
* BR-1 pass: the adult's IMM 5476 names the person and the representative; FAMILY case: Child A1's IMM 5257 names "a parent" / fail-guard: an adult's IMM 5257 never says "a parent".
* BR-2 pass: the block on IMM 5476 / fail: no block on IMM 5257 (typed name).
* BR-3 pass: the Signed step shows the engine's refusal before Print, with no button / fail: a stale tab (the step done meanwhile by the API) gets the server's 409 words on the screen, nothing recorded twice.
* BR-4 pass: Printed names the copy (stored `copy_id` = the newest copy) / fail: no generated copy → no Printed button, the words say generate first.
* BR-6 fail: a text file is refused on the field with the server's words, nothing stored / pass: a Sample PDF stored with its checksum, the item reads Ready.
* BR-7 fail: no "Uploaded to IRCC" button before Ready to file, the words say why / pass: after B2's Ready to file, pressed: the item is Done; ends with C8.2's "Record the submission" enabled.
* BR-9: the client's view has no block. The two allow-list lines removed: `route-has-screen.mjs` passes.

## 6b. Capability or scaffolding (P-33)
Capability: all of the above (C8.1). Not built: the client's own upload (client portal, after M3); Paper lines signed in pen (breadth); e-sign.

## 7. Questions (at most three, recommendation first)
1. **(Tech lead) Prevent or refuse "Signed before Print"?** J7 5.7 says "refused". *Recommend:* prevent with the engine's own refusal words shown on the waiting step (EXPERIENCE §2.5 "one next action", §2.8 "prevent errors before messaging them"); the server's 409 stays proven by C8.1-4 and by the stale-tab check.

## Definition of ready
Acceptance: `acceptance/C8.1.test.ts` (unchanged) + `tests/check_c81_sign_browser.ts` (J-B3). Row text: sprint plan row B3. Decisions: none open (Q1 has a recommendation within EXPERIENCE). Approval: the tech lead, after `challenge.md` (P-223 (4)).

## Drafter's response to the challenge (7 Nov)
* **M1** accepted: BR-8 follows the server's `restart` (printed copy Out of date, or `replaces`; never after Uploaded to IRCC); the join skips `signed_scan` records. Browser check: a fact changed after Printed → no Signed by hand, a new copy printed, the earlier step superseded.
* **M2** accepted on the screen (BR-10, checked after recording the submission). The server line (`refuseIfRecorded` on `step` and `scan`) is the runtime lane's file: asked as a question for the tech lead, recommended as a one-line follow-up row. Founder Q1 of the challenge (tick after recording) kept, recommendation (a).
* **M3** accepted: `engine/runtime/sign-order.ts` (moved unchanged, `signing.ts` re-exports; `check_c81_signing` 18/18). The browser check still compares the shown words with the 409 for the same step.
* **m2** accepted except the fill trial: warned, not blocked (build discovery: the checkpoint's IMM 5476 has no fill trial, so a block stopped the walk). **m1, m4, m6, m7** accepted (copy, BR-4, BR-1, Checksum disclosure, FAMILY blocks). **m3, m8** are records for the tech lead (J-B3 / J7 5.7 wording "cannot be pressed; says why in the server's words"; QA-228 retest). **m5** Not built: a follow-up row (steps carry the printed copy's id).
