# B3 — Sign and scan by screens (C8.1): fresh challenge (7 Nov; P-223 (4))

The challenger did not draft the concept. Read: `concept.md` (f8c43e926), the prepare-tab concept r2 and its challenge, sprint plan row B3 and J-B3, J7 5.7 and 5.8, EXPERIENCE, STANDARDS §2–§8, BUGS (QA-251, QA-228), and the code on main ecbd68301: `api/src/sign-steps.ts`, `engine/runtime/signing.ts`, `engine/resolver.ts` (`formSigners`), `api/src/case-prepare.ts`, `api/src/fill-case.ts`, `api/src/submission-record.ts`, `web/src/runtime/{forms,readiness}.tsx`, `acceptance/C8.1.test.ts`, `contracts/documents.ts`, `samples/checkpoint-stage-one.json`, `api/src/features/checkpoint/130-release-two.ts`. The working tree also holds an **uncommitted** draft of `web/src/runtime/sign-steps.tsx` and its mount in `forms.tsx`. It is cited only to show how the rules are being read; it is not judged. Nothing was run. Paths are under `prototype/studio/` unless a path is given.

## Verdict
**Build after these changes.** The slice is the right size: no schema, no new route, one file and one mount, and every word comes from the API. Three Majors stand. The re-sign rule (BR-8) disagrees with the server's `restart` both ways. The block has no read-only state once the submission is recorded, which is where J-B3 ends. The waiting words are a copy of the engine's rule in the browser. No Blocker.

## Objections

### Major
**M1. BR-8 does not match when the server lets a new print restart the steps, in either direction.** *Needed for the proof* (the job's own sentence "never … on an out-of-date copy"; C9.2's restart on the same row). Confidence: high (read in code).
* *Fact:* the server restarts on `print` when Printed is done, Uploaded to IRCC is not, and the printed copy's facts changed (`sign-steps.ts:77`). `/prepare` marks the item only **after the scan is in**. Before the scan, `signedState` is null (`signing.ts:53-56`), so the item falls through to `to_do`/"Every fact it reads is confirmed." (`case-prepare.ts:275`, `:307`). After the upload to IRCC, the item is a single `out_of_date` (`case-prepare.ts:285`).
* *Breaks, example 1 (UI hides what the server allows):* Printed copy X → Client A's passport number is changed → the block still offers "Signed by hand" as the next step. The server accepts it and then the scan, because neither checks the printed copy (`sign-steps.ts:83`, `:137-139`). An out-of-date form is signed and scanned. It then reads Out of date with a new print asked for.
* *Breaks, example 2 (UI offers what the server refuses):* uploaded to IRCC → a fact changes → `state: out_of_date` → BR-8 offers "Print the new copy" → 409 "Printed is already done for IMM 5476."
* *Breaks, example 3 (wrong item id):* the `out_of_date` entry in the split has `id` = **the scan's id** and `record: "signed_scan"` (`case-prepare.ts:288`). A block bound to it posts to `/runtime/items/<scan id>`, which returns 404 "No such item."
* *Fix (concept text):* BR-8 applies when Printed is done, Uploaded to IRCC is not, and either the item has `replaces` or the printed copy (`done.print.copy`) reads `out_of_date` in the row's own copy list. That flag uses the same `changedFacts` + `changedGroups` test as `changedSince` (`fill-case.ts:200`, `:206`; `sign-steps.ts:109-117`). While BR-8 applies, "Signed by hand" and the upload are not offered. On `out_of_date` after the upload to IRCC, the block shows the `reason` and no button (what to do after filing is C8.2's). The block binds to the `/prepare` item with the same `form` and `subject`, never `record: "signed_scan"`. The uncommitted draft already does the join and the "not uploaded" guard; the before-scan case is missing.
* *Tests:* fail-guard: print, then change a fact: no "Signed by hand" button, "Print the new copy" offered, and the server answers 200 with the earlier steps superseded. Uploaded, then a change: reason only, no button.

**M2. Nothing covers the case once the submission is recorded, and J-B3 ends there.** *Needed for the proof*. Confidence: high on the facts, medium on the severity.
* *Fact:* once the submission is recorded, the filing reads `status: "submitted"`, `read_only: true` (`submission-record.ts:66`). "Uploaded to IRCC" then needs `ready_to_file` (`sign-steps.ts:80-82`), so it can never be ticked. BR-7's words would still say "uploaded to IRCC only once its filing is Ready to file", which is false: the filing was Ready. `sign-steps.ts` never calls `refuseIfRecorded`, unlike the other writes on the prepare view (`case-prepare.ts:411`, `:475`). So Print, Signed by hand and an upload are still recorded on a read-only application.
* *Example:* the officer presses "Record the submission" before ticking IMM 5476. The item stays Ready, never Done, and a stray "Printed" press is stored on a submitted case.
* *Fix:* add a **read-only** state to §4: when the item's filing is `read_only`, the steps done are shown and there are no buttons. An unticked step 4 says so in words (founder Q1). Server: add `refuseIfRecorded` to `step` and `scan` (one line each, STANDARDS §6 "authorisation on the server"), or record it as a follow-up row by the tech lead's choice.
* *Test:* record the submission, then: no buttons, and a forced POST answers 409 with the recorded words.

**M3. The waiting words are a second copy of the server's rule in the browser.** *Needed for the proof* (J-B3's "in words" rests on them). Confidence: high on the standard, medium on importability (the web build was not run).
* *Fact:* `GET /runtime/items/:id` returns the steps but not why each one waits (`sign-steps.ts:62`). BR-3 promises "the engine's own words (`stepRefusal`)", so the browser must compute them. The draft copies `SIGN_STEPS` and `stepRefusal`, because `signing.ts` pulls in `case.ts` (draft `sign-steps.tsx:20-33`). That breaks STANDARDS §7 [M] "no duplicated logic between web and API" and BR-1's "never worked out in the browser". A later wording change on the server silently diverges from the screen.
* *Fix:* move `SIGN_STEPS`, `SIGN_STEP_WORDS` and `stepRefusal` into a pure module with no node or `case.ts` import (e.g. `engine/runtime/sign-order.ts`), re-exported by `signing.ts`. The web imports it the way `forms.tsx:13` already imports `engine/runtime/open-lines`. No API change. *Test:* the browser check compares the shown words with the 409 `detail` for the same step.

### Minor
* **m1. "Signed by hand · by Sample Officer O" reads as the officer signing** (C8.1-12: there is no signing for the client). Copy fix: "recorded by {name}, {when}". The done line names the signers in BR-1's words ("Signed by hand by Sample Client A and the representative of record"). This also matches 4b's benchmarks, which show who signs. *Needed.* High.
* **m2. BR-4 can print a copy the same row calls not for filing.** It picks the newest current generated copy but ignores `copy_not_for_filing` and `trial_passed` (`fill-case.ts:206`; `forms.tsx:124`, `:135`), and the server checks neither (`sign-steps.ts:88-90`). Example: "Checked copy, not for filing" next to "Printed: the copy of 7 Nov". Fix: offer Print only on a copy the copy block would file (GENERATED, `file_ok`, current, filed, trial passed); otherwise show the copy block's own reason. "Newest generated" means the first GENERATED copy, not `copies[0]` when that one FAILED. *Needed.* Medium.
* **m3. Prevent, not refuse (question 1): agreed, with a wording change to the records.** EXPERIENCE §2.5 and §2.8 [M] favour prevention. A screen can never reach the out-of-order 409: steps go back only through a restart, which re-records Printed. §6's stale-tab check proves "already done" (`sign-steps.ts:121`, `signing.ts:43`), not the order. So the tech lead amends J-B3 and J7 5.7 to "cannot be pressed; says why in the server's words" before qa's gate A. The 409 stays proven by C8.1-4. *Needed (records).* High.
* **m4. BR-1 says nothing about three cases.** (i) `signed_by: "none"` gives no signers (`resolver.ts:124`). (ii) No representative of record on the case team: `signersOf` still says "representative" (`signing.ts:33`). It should read "the representative of record (not chosen yet)". (iii) A form listed only under Online with no PDF has no FormRow (`fill-case.ts:180`, `forms.tsx:41`), so "every form row" misses it. Fix: name all three in BR-1 and §4's states. The mapping person/parent/principal/representative is otherwise faithful to `signersOf` (`signing.ts:27-35`). "Parent" is the principal by R7 (`resolver.ts:133`), and "a parent" matches J7 5.8 and C8.1-1. *Needed.* High.
* **m5. A stale tab after a restart signs the wrong copy.** Tab A shows copy X with "Signed by hand". Tab B prints copy Y (a restart). A's press is accepted against Y, because the server checks the order, not the copy (`sign-steps.ts:83`). The browser alone cannot catch this. Fix: a follow-up row where "signed" and the scan carry the printed copy's id and a mismatch gets 409. *Not built.* Medium.
* **m6. The checksum only in a `title`** is out of reach by keyboard (EXPERIENCE §2.10, §2.12). Fix: a focusable "Details" disclosure. *Needed (keyboard, axe).* High.
* **m7. No FAMILY test with several hand-signed items.** §6 covers a family only on Child A1's IMM 5257. Add: the principal's and the spouse's IMM 5476 each have their own block; a step on one leaves the other unchanged; each waits on its own filing (`item.filing`). One `GET /items/:id` per hand-signed row is acceptable at two rows. *Needed (BR-2 on a family).* Medium.
* **m8. Records.** QA-228 is still "Open/parked" (`product/qa/BUGS.md:63`), but the checkpoint now sets IMM 5476 `person_and_representative` (`samples/checkpoint-stage-one.json:22`) and HAND_SCANNED (`130-release-two.ts:60`), and J-B3 relies on both. qa retests and closes it before gate A. 4b says "the file type … checked the moment it is chosen", but only the picker filters it and the server judges by the file's bytes. Fix the sentence. *Needed (records).* High.

## What is sound
* The scope: no schema, no route, no engine change apart from M3's file split. Both allow-list lines go. It is in the row's own size.
* BR-2: steps only on HAND_SCANNED, and the server refuses others (`sign-steps.ts:72`). BR-4: the copy is picked, never typed, and the server re-checks it (`:88-95`).
* BR-6: one field `file`, size checked first and again on the server (`:131-134`, `MAX_DOCUMENT_MB` from `contracts/documents.ts:33`), the type judged by the file's bytes (`:136`), nothing kept on a refusal (`:148`). Files stay in the app's own folder (`VAR(WORKSPACE_KEY)`, QA-285 ruling).
* BR-7 reads the same `/prepare` view the server re-reads (`sign-steps.ts:80-81`), so Ready means the same on both sides. The block shares the Ready to file panel's query key and `/team` names (`readiness.tsx:52-61`).
* BR-9 roles: the client gets 403 (C8.1-9), and another firm's officer gets 404 "No such case." (`runtime.ts:70`). The breaker run checks that second case. Concurrent duplicates get 409 with words (`sign-steps.ts:121`).
* 4b is honest: every quote is Unverified, and two seen-but-not-taken ideas are parked, not built. The screen is not weaker than any benchmark once m1 lands.

## Back-end plan
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Who signs | release line `signed_by`, `who`; case team | `/prepare` item `signers`, `/team` | R7 `signersOf` | BR-1 + m4 cases |
| Printed | `sign_step(print, copy_id)` | `POST …/sign-steps/print {copy}` | order; copy current (`:88-95`); restart (`:77`) | BR-4, M1 |
| Signed by hand | `sign_step(signed)` | `POST …/sign-steps/signed` | order (`stepRefusal`, moved per M3) | BR-3, m3 |
| Signed scan | `signed_scan` (sha256, append-only) + `sign_step(scan_received)` | `POST …/signed-scan` | size, bytes, order | BR-6 |
| Uploaded to IRCC | `sign_step(uploaded_to_ircc)` | `POST …/sign-steps/uploaded_to_ircc` | filing `ready_to_file` from the view; recorded → read-only (M2) | BR-7, M2 |
| Sign again | superseded `sign_step` | `/prepare` `replaces` + copy `out_of_date` | C9.2 | M1 |

## Questions for the founder
1. **Once the submission is recorded, may an unticked "Uploaded to IRCC" still be ticked?** *Recommend (a):* no. The block turns read-only and says "Not ticked before the submission was recorded". Recording the submission already states what IRCC holds. (b) Yes: the server also accepts the tick on a submitted filing, a small change in `sign-steps.ts:80-82`, and the only write allowed after recording.

## Lead response

## Agreement

## Build discoveries
