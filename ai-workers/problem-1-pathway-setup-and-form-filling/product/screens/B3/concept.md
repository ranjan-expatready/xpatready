# B3 — Sign and scan by screens (C8.1): concept (screens lane, 7 Nov; for the tech lead's approval after the fresh challenge, P-223 (4), P-392)

**Row:** M3 sprint plan (`design/m3-sprint-plan-2026-11-06.md`) row B3, journey J-B3 (§6). **Fixes:** QA-251 (with B2, merged). **Builds on:** the prepare-tab concept r2 (`screens/M3-design-2026-11-04/prepare-tab/concept-draft.md`) BR-2 (the copy block lives in the form row), BR-4 (only the API's states), BR-10 (a signing row: each step with its state), BR-11 (staff only, a 409 shows its own `detail`). Every name and value shown is **Sample**. Legal points: Unconfirmed: no counsel.

## 1. Job and journey
* **Job:** on a form signed by hand and scanned, the case officer records each step of its signing (Printed → Signed by hand → Signed scan received → Uploaded to IRCC) from the form's own row, knows who must sign, and is never able to record a step out of order or on an out-of-date copy.
* **Persona:** the case officer (the representative of record sees the same, as staff). Not the client (their own upload is the client portal, after M3).
* **Journey:** J7 5.7, 5.8 (`acceptance/journeys/J7-visitor-visa-end-to-end.md`); J-B3 ends at C8.2's "Record the submission". SA-01B "Forms at launch"; r5c BR-8, BR-10, BR-21; P-65, P-136, P-143.

## 2. Ten layers: what exists, what is new
| Layer | Exists (main ecbd6830) | New here |
|---|---|---|
| Engine | `engine/runtime/signing.ts`: `SIGN_STEPS`, `SIGN_STEP_WORDS`, `stepRefusal`, `signedState`, `signersOf` | none |
| Data | `sign_step` (superseded on a re-print, C9.2), `signed_scan` (append-only, sha256) | none (no migration) |
| API | `GET /runtime/items/:id` (steps, scans, signers) · `POST …/sign-steps/:key` · `POST …/signed-scan` · `GET /runtime/cases/:id/prepare` (items with `signature`, `signers`, `state`, `reason`, filing status) | none |
| UI | `FormRow` in `web/src/runtime/forms.tsx` (the copy block); `ReadinessPanel` (B2) | **`web/src/runtime/sign-steps.tsx`**: a "Who signs" line on every form row, and the signing block on a hand-signed row; one mount line in `FormRow` |
| Types | — | in `sign-steps.tsx` only (prepare-tab §2: never in `studio/contracts/`) |

## 3. Business rules (each from its source; nothing new decided here)
* **BR-1 Who signs** (C8.1-1, -2; VV-R09, VV-R10; SH3 R7): every form row says who signs it, from `/prepare`'s `signers`, in words: the person by name; "a parent" for a child under 18; "the principal applicant, for the family"; "the representative of record" by name (case team, C6.11). With the line's method (`SIGNATURE_WORDS`). Never worked out in the browser.
* **BR-2 Steps only where they apply** (Devin on #617): the block shows only where `/prepare`'s item says `signature: "HAND_SCANNED"`; any other form shows no steps (the server refuses them, 409).
* **BR-3 In order, one next action** (C8.1-3, -4; EXPERIENCE §2.5, §2.8): the four steps as a numbered list, each done step with who and when. Only the next step has a button. A later step shows why it waits in the engine's own words (`stepRefusal`, the function the server refuses with): "Signed by hand comes after "Printed": print IMM 5476 first." So "Signed before Print" is refused in words before it is tried; a stale page that still sends a step out of order gets the server's 409 `detail` under the block.
* **BR-4 Print names the copy** (C8.1-5, -6; Break M1 on #617): "Printed" sends the newest generated copy's id; the step shows "Copy of {date}". With no generated copy, or an out-of-date one, the step says "Generate a copy of {form} first…" and has no button. A Download link to the same copy sits beside it (the copy block's own).
* **BR-5 Signed by hand** (C8.1-7): one press; who and when recorded. There is no "sign for the client" action (C8.1-12).
* **BR-6 Upload the signed scan** (C8.1-8, -9, -10; QA-285 ruling): one file through the existing upload route (the upload door; the file stays in the app's own folder); PDF, JPEG or PNG judged by its bytes on the server; up to 20 MB (checked in the browser first, `MAX_DOCUMENT_MB`). A refusal shows the server's words on the field, nothing stored. Once in: the file name, type, size, who and when; the checksum in a tooltip (EXPERIENCE §5: no hashes on the main path). The item then reads Ready (the API's state and reason).
* **BR-7 Uploaded to IRCC** (C8.1-11, -13; BR-21; L-SA3): a button only when the filing's status in `/prepare` is Ready to file; before that the step says the engine's words and links to the Ready to file panel (B2). Done → the item is Done.
* **BR-8 Signing again** (C9.2, BR-12, BR-20): when `/prepare` says the signed copy is out of date (`state: out_of_date` or a `to_do` item with `replaces`), the block says the API's `reason` and offers "Print the new copy" (the server supersedes the earlier steps and keeps the earlier scan).
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
_To be filled from the research below; see the section after the copy._

## 5. Copy
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
