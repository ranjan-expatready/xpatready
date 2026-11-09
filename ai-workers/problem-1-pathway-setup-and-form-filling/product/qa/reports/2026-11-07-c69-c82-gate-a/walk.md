# qa gate A: C6.9 and C8.2 after B124 (#1197) and B126 (#1212), and QA-228's retest, main 9fd299219, 7 Nov 2026, 15:18–15:26 IST: facts only (no verdict here)

**Asked by:** the tech lead (Lead 30), 15:18 IST. **Commit:** `9fd299219` (#1212's merge, on #1197's). main later moved to `83ee42dda` by records only: `git diff --stat 9fd299219 83ee42dda -- ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio` is empty.
**Money:** live AI off; `STUDIO_*_LIVE` vars in env: 0; no priced button; the loader says "No live AI call was made (US$0)".
**Copy:** qa_c69w on :4471, started 15:18 IST by its **absolute** path with `--ttl 75` (through the untracked `tools/isolated-sb.sh`, as in `2026-11-07-c611-c81/walk.md`); the configured checkpoint loaded by screens. Copies running: 4451, 4453, 4470 (qa_c81w, left over: its timer failed, see #1226's comment), 4471. Load 1.40. Walked at 1440×900 in the browser pane; Chrome and axe not runnable.
**Set-up by route** (scratch script, not committed, the packs' own helpers as set-up): (a) case `bff783ed…`: a single adult; the officer answers passport number, passport expiry and criminal history = No, none confirmed. (b) case `1a06974d…`: a single adult filled by `fillEverything`, then `readyToFile` (the representative's review, the warnings passed with "Passed for the acceptance test (Sample)", IMM 5476 signed by hand and scanned by route): filing `ready_to_file`.

## GitHub runners (read by qa from the job logs)
Run **42360278263**, `nightly`, `workflow_dispatch`, main, head_sha `9fd2992192f627b0209a7911151d29d085b03ca2`, 09:34:01–09:37:54Z, conclusion success. Both pack jobs checked out `9fd299219…`, `GATE_B_DATA: checkpoint`.
| Job | Line |
|---|---|
| 128367014509 packs (C6.9) | "C6.9.test.ts on the checkpoint: exit 0, 20/20 passed (83 s: copy 5, Load the configured checkpoint 76, run 2)"; "Gate B: passed." |
| 128367014616 packs (C8.2) | "C8.2.test.ts on the checkpoint: exit 0, 17/17 passed (139 s: copy 4, Load the configured checkpoint 65, run 70)"; "Gate B: passed." |
Each says "claims Works for none (no bug check)". The all-packs baseline 42357755876 (main 9dc77d1ac, before both merges) concluded failure; not read further this round.

## Open rows in qa/BUGS.md naming C6.9 or C8.2
C6.9: none. C8.2: QA-295 Bug · Major (the fix is #1212), QA-294 UX · Minor. Decision P-393: "C6.9 gets A8 before Works"; A8 = B124 = #1197, merged 09:27:27Z.

## C6.9 by screens (case `bff783ed…`, Case officer)
1. Case page › Eligibility "Not run" › Open eligibility › **Run eligibility check**: "Likely eligible, on 3 answers not yet confirmed"; "Likely eligible rests on answers not yet confirmed: Passport number, Passport expiry date, Criminal history. Confirm them in the Agent view; this line goes once every deciding answer is confirmed." Rules: both gates Met, each value "(not confirmed yet)". People list: "Likely · 3 not yet confirmed". Officer's-judgement lines and the disclaimer shown; "staff only: the client never sees a verdict" (`1-c69-likely-3-not-confirmed-1440.jpg`).
2. Link "Open Passport number in the Agent view, where its section is confirmed" › the case page, focus on "Number of the passport or travel document · SAMPLEP12 · To confirm", in Personal details (3 answered · 0 confirmed). **Confirm section** › 3 answered · 3 confirmed.
3. Back to Eligibility (no new run): "**Likely eligible, on 1 answer not yet confirmed** … Criminal history"; the passport values no longer say "(not confirmed yet)".
4. Link to Criminal history › Background information (1 answered · 0 confirmed) › Confirm section › 1 confirmed. (A first click missed: qa's tool needed a screenshot first; redone.)
5. Back to Eligibility (no new run): "**Likely eligible**", no line, "Criminal history: No". People list "Likely".
6. **Override result…** › Keep the override with nothing filled: refused on both fields, `aria-invalid`, "Give a label for the override." and "Give a reason for the override."; toast repeats both; nothing saved (`2-c69-override-refused-on-fields-1440.jpg`). This is J-A1's last step. J-A4 (gate authoring, #1172) was not re-walked: walked on 73ae633f2 (`2026-11-07-c69-c82.md`), and B124 and B126 change no authoring file.

## C8.2 by screens (case `1a06974d…`)
7. As the Representative (firm admin, the representative of record): the filing reads "Ready to file"; Submission to IRCC › Record the submission… › Application number W300000071; Submitted on 2026-11-07 (prefilled); Our reference prefilled › **Record the submission**: toast "Submission recorded: these filings are now read-only."; the record "Recorded · read-only · Submitted", "November 7, 2026 · through APR Portal", "**Prepared by · Reviewed by: Case officer · Representative**"; the filing's line above reads "Prepared by · Reviewed by: Case officer (Sample) · Representative (Sample) (licence R000000)" (`3-c82-record-by-representative-1440.jpg`). Before #1212 this read "Representative · Self-reviewed" (QA-295).
8. Not repeated this round (walked on 73ae633f2): empty application numbers refused on the field, Correct a number with history, a second record 409, client and author 403.
9. **C9.2's first step**, as the Case officer: Agent view › Sample Record Adult › Family name › Edit › "SAMPLE-CHANGED" › Save: toast and the Submission card: "**3 tasks after filing**", "Filed with an earlier value: … changed after Sample Record Adult's IMM 5257 SCH1 / IMM 5476 / IMM 5257 was filed on November 7, 2026. Re-sign it, or tell IRCC of the change (Unconfirmed: no counsel)." The record has no input (0 editable fields), application number W300000071 unchanged. (qa's select-all did not clear the field, so the new value read "SAMPLESAMPLE-CHANGED"; still a change.)

## QA-228 retest (case `1a06974d…`, before anything was passed)
10. Prepare items for the filled adult: IMM 5257 SCH1 `PDF_UPLOAD`, signature **TYPED_NAME**, signers ["person"]; IMM 5645 `PDF_UPLOAD`, **TYPED_NAME**, ["person"]; IMM 5476 HAND_SCANNED ["person","representative"]; IMM 5257 ONLINE NONE.
11. The readiness warns: IMM 5476 missing facts (staff 5, client 12: QA-300), representative review, IMM 5476 "must be signed by hand and its scan uploaded", 3 missing documents. **No `missing_signature` line for IMM 5257 SCH1 or IMM 5645** (7 Nov 13:44 IST on ecbd68301 both had "must be signed (how it is signed is not set on the form line yet …)").
12. By screens, case `bff783ed…`, How each form is filed: "IMM 5645 · Channel: PDF upload · Signature: **Typed name**", "IMM 5257 SCH1 · Channel: PDF upload · Signature: **Typed name**".

## Added after the fresh reader's questions, 15:27 IST
13. `git diff --name-only 9fd299219 83ee42dda -- . ':!ai-workers/problem-1-pathway-setup-and-form-filling/product'`: 0 files (no `.github/`, no studio file): main's head runs the packs exactly as 9fd299219 did.
14. `tests/qa/check_qa295_prepared_by.ts` on qa_c69w (9fd299219): **exit 0, 5/5** (was exit 1, 3/5 on 4a7e3107d): two filings Ready to file reviewed by `user-R`; the representative records (200); `filing_record` reads `user-O|user-R`; no recorded filing reads Self-reviewed.
15. App files changed from ecbd68301 to 9fd299219 (api, web): `api/src/assessments.ts`, `checkpoint-stage-one-data.ts`, `checkpoint-stage-one.ts`, `features/checkpoint/130-release-two.ts`, `submission.ts`, `web/src/runtime/eligibility-unconfirmed.ts`, `eligibility.tsx`, `submission.tsx`. No gate-authoring file (the SQR tab's "Eligibility rules (staff check)"), so J-A4 was not re-walked.
16. QA-228's fix: A3 (#1198, merged 08:19Z) set release 2's signer rules for IMM 5645 and Schedule 1 in `samples/checkpoint-stage-one.json` through `api/src/features/checkpoint/130-release-two.ts`, applied by the checkpoint loader that product steps run (P-322).
