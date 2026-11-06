# M3 sprint plan: ready rows, three builder streams, 12-hour forecast (6 Nov 2026)

**For:** the tech lead, who copies approved rows into `BACKLOG.md` (P-314). **By:** the M3 planning lane. **Base:** `main` 50e47a6fd. **Raw results:** `product/screens/M3-plan/packs-2026-11-06.md`. Plan only: no product file changed, live AI off, US$0.

**Rules this plan keeps:** P-359 (48-hour sprint, forecast at 12 hours from measured rows), P-376 (the clock starts when the scale changes are on `main`; small PRs, no stacks, one file per feature), P-351 (by shared cause), P-348 (1) (a person's journey), P-352 and P-371 (5) (the journey by screens is written before the build), P-322 (Works counts on the configured checkpoint), P-303 and P-309 (no gate lowered). Builders never edit the shared notes files.

Words used here. **Checkpoint:** the demo data made by Demo › Load the configured checkpoint, where Works is counted. **Fixture:** the small test set-up a pack's own run line builds (`setup_visitor_visa.ts`, `setup_vv_m3.ts`), where gate B runs a pack that has set-up steps. **Pack:** a capability's acceptance test, `prototype/studio/acceptance/<id>.test.ts`. **Release 2:** the Visitor visa's current release on the checkpoint.

---

## 1. In one page

**What was measured (17:28 to 18:20 IST, 6 Nov).** All 16 M3 packs ran twice on `main`: on a fresh checkpoint and on their own fixture.

| | Packs that exit 0 |
|---|---|
| On the fixture | 12 of 16, plus C6.5's engine part |
| On the checkpoint | 2 of 16: C1.3 (54/54) and C6.12 (24/24), plus C6.5's engine part (7/7) |

**The finding.** M3 is mostly built. Ten packs are green on the fixture and red on the checkpoint (C6.11, C11.6, C6.4, C7.7, C7.3, C7.6, C8.1, C8.2, C9.2, C6.9). They fail for **five shared causes that are all about the checkpoint, not about missing engine code:**

1. **The release has no account, no eligibility gates and no "signed by"** (row B104, built on #1084).
2. **"Uses a representative" is an asked Yes/No, not read from the case team,** so IMM 5476 goes to nobody or to everybody, children too (built on #1072).
3. **The packs were written for a three-form Sample release; a case on the checkpoint opens on release 2, which is seven forms with other channels.** The packs name IMM 5707 as the Online form and IMM 5257 as the barcode PDF. On release 2 IMM 5257 is Online, IMM 5645 replaces IMM 5707, and four more forms apply only on an answer. This needs the tech lead's ruling that packs follow the case's own lines.
4. **The checkpoint has four document lines and none of the conditional ones** (built in part on #1073; the minor's lines wait for row B102).
5. **Five filing steps have a route and no screen** (QA-229, QA-251): the representative's review, passing a warning with a reason, Ready to file, the print and signed steps, the signed scan. Packs pass through the routes; gate A's walk by screens cannot.

What is truly not built: C7.5's AI review run (part 2), C6.5's document reads (part 2), C10.2's finished story, C6.12's sponsorship and study-filing breadth, and the gate-authoring screen for C6.9.

**Forecast for 48 hours at three builders (an estimate, not measured; re-forecast at hour 12):** 5 capabilities confirmed Works, range 4 to 7. Likely: C1.3 and C11.5 (no build: qa's re-score), C6.11, C8.2. About even: C6.9, C11.6, C3.16, C7.3, C6.4. Not in 48 hours: C7.6, C8.1, C9.2, C7.7 (many joins, six open Majors on C7.7), C7.5 and C6.5 (not built, one paid run each), C10.2 (last by design).

**Needed from the founder: three answers** (section 8), none of which blocks the first 12 hours.

---

## 2. What the packs say

Full step lines, exit codes and method (including two sandbox deviations from the tsx command): `screens/M3-plan/packs-2026-11-06.md`.

| Capability (journey order, P-348 (1)) | Checkpoint | First red step on the checkpoint, in words | Fixture | Group |
|---|---|---|---|---|
| C6.11 Firm, users, case team | 22/25, exit 1 | -15: IMM 5476 goes to all four people, the child of 10 too | 22/22, exit 0 | G2 |
| C11.6 Channel per form | 6/14, exit 1 | -1: the case shows no IRCC account (null) | 14/14, exit 0 | G1, then G3 |
| C6.4 Document checklist per person | 18/30, exit 1 | -4: proof of financial support is not on the principal only | 30/30, exit 0 | G4 |
| C6.12 Filings and fees | 24/24, exit 0 | — | 24/24, exit 0 | — |
| C6.12 breadth (second pack) | 1/4, exit 1 | -22: no fee lines for spouse sponsorship | 1/4, exit 1 | G7 |
| C7.7 Prepare application list | 16/33, exit 1 | -1: adults are listed 7 forms, the pack expects 3 | 33/33, exit 0 | G3, G2 |
| C7.3 Portal sheet | 0/13, exit 1 | -1: no answer sheet for IMM 5707 (404): release 2 has no IMM 5707 | 13/13, exit 0 | G3 |
| C7.6 Ready to file | 13/25, exit 1 | -3: the refusal does not list the blocks the pack expects | 25/25, exit 0 | G3, G2, G5 |
| C8.1 Signed PDFs | 0/14, exit 1 | -1: a child's IMM 5257 is not signed by a parent | 14/14, exit 0 | G1, G2, G5 |
| C8.2 Record the submission | 11/12, exit 1 | -7: the record holds no portal | 12/12, exit 0 | G1 |
| C9.2 Changed fact marks items out of date | 3/11, exit 1 | -2: no validated IMM 5257, no signed IMM 5476 to mark | 11/11, exit 0 | G3, G2 |
| C7.5 Independent AI review | 9/16, exit 1 | -5: the run card's route does not exist (404) | 9/16, exit 1 | G7 |
| C6.5 Documents read into facts | 9/32, exit 1 (engine part 7/7, exit 0) | -2: the upload step fails, and "Fill this from documents" proposes nothing (-3) | 8/32, exit 1 | G7 |
| C3.16 Shared field scope | no pack on `main` | pack only on #1054's branch (33/33 and 16/16 there, by its builder) | — | G6 |
| C1.3 Employer case pre-fill | 54/54, exit 0 | — | 55/55, exit 0 | G6 |
| C11.5 Retail and Corporate apart | no pack of its own | covered by C1.3's pack (P-316 (2)) | — | G6 |
| C10.2 Finished story | 0/11, exit 1 | -1: the route does not exist (404) | 0/11, exit 1 | G7 |
| C6.9 Case check (also M3 in CAPABILITIES) | 2/15, exit 1 | -2: 409, the release has no eligibility rules | 15/15, exit 0 | G1 |

**What the checkpoint's Visitor visa holds today** (read from a fresh copy; the dump is in the results file): account not set; no gates; no "signed by" on any line; seven current form lines (IMM 5257 Online · IMM 5645 and IMM 5257 SCH1 as PDF upload from 18 · IMM 5409, IMM 5475, IMM 5476, IRM 0002 only on an answer); IMM 5707 retired on release 2; how a line is signed set only on IMM 5476; four document lines; a new case is pinned to release 2.

**The same family case after the packs' own "fill everything":** "uses a representative" is answered No by the helper, so IMM 5476 does not apply though the case has a representative of record; the helper's Sample UCI is refused as "needs a fix" on IMM 5257 and Schedule 1 for every person; IMM 5645 and Schedule 1 wait for a signature because how they are signed is not set on the line; no item asks for the Adobe Validate round trip, because IMM 5257 is Online.

---

## 3. Groups by shared cause, each with its ready rows

Each row: capabilities · first red step · cause in the code · change · files · acceptance test and **Done when** · depends on · decisions. The qa journey by screens for each row is in section 6. Sizes are estimates from the code read, not measured.

### G1. The release on the checkpoint lacks its Stage 1 parts (B104)

**Row A1 — B104: account, who signs and eligibility gates on the configured release** (land #1084). *Size: small (built, approved; one rebase).*
* **Capabilities:** C8.2 Record the submission · C6.9 Case check · C11.6 Channel per form · C8.1 Signed PDFs (its first two steps).
* **First red:** C8.2-7 (the record has no portal), C6.9-2 (409), C11.6-1 (account null), C8.1-1 (signers read `["person"]` for a child).
* **Cause:** `Demo.loadConfigured` (`api/src/demo.ts:553`; release 1 at `:839-860`) releases the Visitor visa without these parts. They are read at `api/src/case-prepare.ts:80` and `:93` (the portal comes from the combination's account) and `api/src/assessments.ts:67` (no gates, so every check is refused).
* **Change:** already written on #1084 at e36ade7fd (Opus Approve, CI green, cloud qa's gate A PASS on d89a3afb4): `applyStageOne` sets the three parts through the services the screens call, from `samples/checkpoint-stage-one.json`, each value cited and marked Sample. **Left:** merge `main` once B120 is on it; move its one import and one call out of `demo.ts` into a new step file `api/src/features/checkpoint/105-stage-one.ts` (before `110-release-one.ts`); the walk accepts "In Release 2"; a diff-only Opus check of the merge.
* **Files:** `api/src/checkpoint-stage-one.ts`, `api/src/checkpoint-stage-one-data.ts`, `api/src/features/checkpoint/105-stage-one.ts` (new), `samples/checkpoint-stage-one.json`, `tests/check_b104_stage_one.ts`, `tests/check_b104_checkpoint.ts`.
* **Acceptance:** `acceptance/C8.2.test.ts`, `acceptance/C6.9.test.ts`, alone on a fresh checkpoint. **Done when:** C8.2 is 12/12 exit 0 and C6.9 is 15/15 exit 0 there; C11.6 is at least 9/14 and C8.1 at least 2/14, with no step going pass to fail in any M3 pack against the table above; `check_b104_checkpoint.ts` exits 0 on the branch and 1 on `main`; Reset to the six is byte-equal before and after (`tools/demo-dump.mjs`); the walk of journey J-A1 passes at 1440 px; cloud qa's gate A.
* **Depends on:** B120 (#1158) on `main`. Nothing else: with step files there is no `demo.ts` order to wait for.
* **Decisions:** none for the founder. The account stays APR Portal, Sample (canada.ca "Sign in to an account for representatives", page date 2026-10-05: "Use the APR portal for these applications:" "visitor visa, study and work permit"; the same page lists "temporary resident visas" under the other portal: FQ-1, for the immigration expert). Legal points: Unconfirmed: no counsel.
* **Works claims this row frees:** C8.2 once a filing can be made Ready to file by screens (row B2). C6.9 not yet: the tech lead ruled on #1084 that it is not Works on the allow-listed route alone (row A4).

**Row A3 — Release 2's own lines: IMM 5645's signer, how each line is signed, what IRCC accepts for IMM 5257.** *Size: small to medium (data, one step-file edit, tests).*
* **Capabilities:** C7.6 Ready to file · C11.6 Channel per form · C8.1 Signed PDFs.
* **First red:** C7.6-5 and -12 (a filled case keeps "missing signature" on IMM 5645 and Schedule 1); C11.6-8a, -8b, -9 (the refusals and the Paper reason follow no accept record); the B104 lane's walk step 1.3a on release 2 (IMM 5645 has no signer; its open question on #1084, 5 Nov 21:01Z).
* **Cause:** release 2 is drafted and released inside one step (`api/src/demo.ts`, the block that starts at `:870` on `main`; `features/checkpoint/130-release-two.ts` after B120), which sets channels but neither the signer of the form it swaps in nor how lines are signed. `engine/runtime/readiness.ts:142` (and its rule at `:210`) then waits for a signature on every line whose signing is not set.
* **Change:** add to `samples/checkpoint-stage-one.json`, cited, and apply through the Forms tab's own routes inside release 2's draft: IMM 5645 signed by the person; how IMM 5645 and Schedule 1 are signed; the record of what IRCC accepts for IMM 5257 on the account (the fixture's S4a). One edit of `130-release-two.ts` so the step runs between the draft and the release.
* **Files:** `samples/checkpoint-stage-one.json`, `api/src/checkpoint-stage-one-data.ts`, `api/src/features/checkpoint/130-release-two.ts` (one edit, the tech lead's hot-file line), `tests/check_b104_checkpoint.ts`.
* **Acceptance:** `acceptance/C7.6.test.ts` and `acceptance/C11.6.test.ts` on a fresh checkpoint, per step. **Done when:** on a filled family case no "missing signature" warning names a line whose signing the data sets; C11.6-8a, -8b and -9 pass or are named with their reason; no M2 pack moves (C10.1 step for step); journey J-A3.
* **Depends on:** A1. **Decisions:** immigration values. IMM 5645's signer as quoted on #1084 from canada.ca "Family Information (IMM 5645)", modified 2024-06-21: "This form must be completed by each person, 18 years of age or older…" (the builder re-reads the page and records page, quote and date, P-170). Typed name or signed by hand per line, and what IRCC accepts for IMM 5257, are **Sample** (FQ-2, FQ-3) until the expert confirms. The four forms #1084 left unsigned on purpose stay a question for the expert; they warn, they do not block (P-237).

**Row A4 — B106: the gate-authoring screen.** *Size: medium (concept and challenge first, P-223 (4); then one screen).*
* **Capability:** C6.9 Case check. **First red:** none in the pack after A1 (15/15); the gap is QA-244's second half: no screen saves gates (`PUT /combinations/:id/eligibility-gates` is on `product/tools/route-has-screen-allow.txt`; `web/src/components/answer-key-editors.tsx:274` only reads them).
* **Change:** an author adds, edits and removes a gate and the officer's-judgement lines on the combination's page, as a draft change a second person releases; the allow-list line goes.
* **Files:** a new `web/src/components/eligibility-gates-editor.tsx` and its mount in the combination page under `web/src/pages/`; `api/src/eligibility.ts` only if a refusal needs words; a browser check under `tests/`.
* **Acceptance:** `acceptance/C6.9.test.ts` on the checkpoint, plus the new browser check. **Done when:** C6.9 15/15 exit 0 on the checkpoint; a person saves a gate by screen and the next case check uses it after release; `route-has-screen.mjs` passes with the allow-list line removed; journey J-A4; qa's gate A. **Depends on:** A1. **Decisions:** none.

### G2. The represented case (IMM 5476 and the firm's facts)

**Row A2 — C6.11: IMM 5476 follows the representative of record** (land #1072). *Size: small (built, approved round 2; one rebase and one unpushed fix).*
* **Capabilities:** C6.11 Firm, users and case team; it also opens the hand-signed path that C8.1, C7.6 (-7, -11), C9.2 (-6, -10) and C7.7 (-1, -2) need.
* **First red:** C6.11-15 (IMM 5476 for all four people), then -16c and -17a.
* **Cause:** IMM 5476 applies on the asked answer `case.uses_representative` (`api/src/form-setup.ts:13`; the rule and its cite in `samples/form-setup.json`), for each applicant with no minimum age. So before the answer everyone has it, and after the pack helper answers No (`acceptance/lib/m3.ts:126`, every Yes/No is No) nobody has it, though every case has a representative of record.
* **Change:** written on #1072 at 4c3cfbdd6: the principal and the partner always and a dependent child from 18 (canada.ca "Use of a Representative Form (IMM 5476)", modified 2025-12-12, quoted in the PR); "uses a representative" comes from the case team; the representative's facts come from the firm record. Its measured result: C6.11 25/25 on a fresh checkpoint, by screens 14/14. **Left:** merge `main` once B120 is on it (its one `demo.ts` line becomes data or a step file), push the kept n1 fix, CI, gate A.
* **Files:** `api/src/form-setup.ts`, `samples/form-setup.json` or a step file, `engine/runtime/team.ts`, `api/src/runtime.ts`, `samples/firms.json`, `api/src/case-prepare.ts` (12 lines) and `web/src/runtime/questionnaire.tsx` (1 line) at hand-over H1 (section 4), `acceptance/C6.11.test.ts` (one line, already ruled), `tests/runtime/check_c611_*`.
* **Acceptance:** `acceptance/C6.11.test.ts` on a fresh checkpoint. **Done when:** 25/25 exit 0 there; on a represented family case adults have an IMM 5476 item and a child of 10 has none; C8.1 passes beyond step 2 (reported per step); journey J-A2; gate A. `Fixes: QA-152, QA-245`.
* **Depends on:** B120 on `main`. **Before "Claims Works: C6.11":** QA-283 closed (row B117, #1148, open) and QA-289 ruled (proposed Major: the firm's office phone is passed as an object, `engine/runtime/team.ts` `representativeContact`; same file, so its fix is this stream's next small PR). **Decisions:** none.

### G3. The packs meet the release a case really opens on

Six of the red packs (C7.3, C7.7, C7.6, C9.2, C11.6, C10.2) name the fixture's forms and channels. On the checkpoint the same journey exists with other form numbers, so the product is not wrong and neither is the checkpoint: the packs need to ask for "the Online form", "the barcode form", "the family form", "the hand-signed form" of the case in front of them. The acceptance README says a pack changes only by the tech lead's word, so this group starts with a ruling (section 7, R1).

**Row C1 — Packs follow the case's own lines (the shared helper first).** *Size: small (one helper file).*
* **Capabilities:** C7.7, C7.6, C8.1, C9.2, C7.3, C11.6, C10.2 (every pack that reads `acceptance/lib/m3.ts`).
* **First red:** C7.7-9 ("nothing left to confirm" fails: 1 to confirm per filing), C7.6-4 and -5 ("fact with a problem" on every filing), C9.2-2, C8.1-3.
* **Cause:** three assumptions in `acceptance/lib/m3.ts`. (1) `sample()` at `:126` answers every Yes/No with No and gives text or "5000" for anything else, so the UCI is refused as "needs a fix" on IMM 5257 and Schedule 1 (`engine/runtime/readiness.ts:132`). (2) `readyToFile` at `:232` validates only a form named "IMM 5257" with channel PDF upload. (3) No helper says which of the case's items is the Online one, the barcode one, the family form or the hand-signed one.
* **Change:** `linesOf(prepare)` returns the case's items by role (Online · barcode PDF · family form · signed by hand), read from the items' own channel, signature and form role; `sample()` gives a UCI the release's own checks accept and leaves "uses a representative" to the case team once A2 is in; `readyToFile` validates whichever item is a barcode PDF. No pack's assertions change in this PR.
* **Files:** `acceptance/lib/m3.ts` only (and a small check of the helper under `tests/`).
* **Acceptance:** all 12 fixture-green packs on the fixture, and the same packs on a fresh checkpoint, before and after. **Done when:** every pack that exits 0 on the fixture today still does; on the checkpoint no step goes pass to fail; C7.7-9 passes; the "fact with a problem" warnings on the UCI are gone from a filled case; the numbers per pack are in the PR. No Works claim.
* **Depends on:** ruling R1. Independent of B120. **Decisions:** none for the founder. **For qa to look at (not asserted here):** whether the UCI question should be required at all on the checkpoint; IMM 5257 asks for it only "if one has been issued".

**Row C2 — C7.3: the portal sheet on the checkpoint** (land #1075). *Size: small to medium (built; round 1's four Majors fixed; round 2 not finished).*
* **Capability:** C7.3 Portal sheet. **First red:** C7.3-1 (404: "IMM 5707 is filed as PDF upload", and on release 2 there is no IMM 5707).
* **Cause:** the pack names IMM 5707; the sheet's sections come from `contracts/pdf-sections.json`, a hand-written table of four forms (P-319).
* **Change:** written on #1075 at 43ec5ce5c: the sheet is laid out from the form's own parts in the release's configuration (`engine/runtime/answer-sheet.ts`, new `api/src/form-parts.ts`, `api/src/case-prepare.ts`), and the pack follows the case's Online line. Its measured result: 13/13 on two fresh checkpoints. **Left:** merge `main` after A2 (hand-over H1), use C1's helper, Opus round 2, CI, gate A for the API part.
* **Files:** `engine/runtime/answer-sheet.ts`, `api/src/form-parts.ts` (new), `api/src/case-prepare.ts`, `api/src/fill-case.ts` (3 lines), `acceptance/C7.3.test.ts`, `tests/check_c73_parts_checkpoint.ts`, `tests/check_vv_answer_sheet.ts`.
* **Acceptance:** `acceptance/C7.3.test.ts` on a fresh checkpoint. **Done when:** 13/13 exit 0 there and on the fixture; C7.7's fixture pack unchanged. No Works claim: the sheet has no screen yet (row B4), and QA-153 and QA-165 stand before a Works claim.
* **Depends on:** C1, A2 merged. **Decisions:** the row the tech lead asked for on #1075 (freeze the parts in `engine/snapshot.ts`) stays a later row.

**Row C3 — A person's channel choice decides "for filing" (the Validate round trip on release 2).** *Size: small in code, needs founder answer Q3 first.*
* **Capabilities:** C7.6 Ready to file · C9.2 Out of date · C7.7 Prepare application · C11.6 Channel per form.
* **First red:** C7.6-6 and -10 (no validated copy can exist), C9.2-2 to -5, C7.7-20 to -23, C11.6-9.
* **Cause:** whether a copy is for filing follows the release line's channel, never the channel a person chose for that item: `engine/runtime/prepare.ts:82` ("released as an Online line, so its copy here is Copy, not for filing … Ask the Lead"), `api/src/fill-case.ts:327` and `:455` (`channelIn(snapshot, form) === "ONLINE"`). The code's own comment calls it a question for the tech lead. On release 2 the only barcode form, IMM 5257, is Online, so no new case can show Validate.
* **Change:** an item whose channel a person changed to PDF upload or Paper (inside what the accept record allows, with the accommodation reason for Paper) is for filing: its copy validates and reads back, and only then does a missing validated copy block (P-144, P-237).
* **Files:** `engine/runtime/prepare.ts`, `api/src/fill-case.ts`, one fail-then-pass test under `tests/runtime/`.
* **Acceptance:** `acceptance/C7.6.test.ts` (-6, -10, -12, -22), `acceptance/C9.2.test.ts` (-2 to -5), `acceptance/C7.7.test.ts` (-20 to -23) on a fresh checkpoint. **Done when:** those steps pass there after the packs use C1's helper; a line left Online still gives "Copy, not for filing"; journey J-C3.
* **Depends on:** C1, A3 (the accept record), founder Q3. **Decisions:** Q3.

**Row C4 — One pack at a time onto the checkpoint: C7.6, C8.1, C9.2, C7.7.** *Size: four small PRs, one pack file each; C7.7 is the largest.*
* **Capabilities and first red after C1, A1, A2:** to be re-measured; today C7.6-3, C8.1-1, C9.2-2, C7.7-1.
* **Cause:** each pack names IMM 5707 (C7.6 four times, C9.2 four, C7.7 nine) and the fixture's channels. C7.7-1 and -2 also count the four forms that apply only on an answer, which the product already marks "Cannot start yet: waits for 1 answer" (QA-246 asks that they are shown apart).
* **Change:** per pack, the same assertions on the case's own lines through C1's helper; where a step meets a real product gap, the PR names it as a bug for qa and fixes only that. C7.7's row also shows not-yet-decided forms apart from forms to fill (QA-246).
* **Files:** one of `acceptance/C7.6.test.ts`, `C8.1.test.ts`, `C9.2.test.ts`, `C7.7.test.ts` per PR; a product file only for the gap that PR names.
* **Done when (each):** the pack exits 0 on a fresh checkpoint and still exits 0 on the fixture; the tech lead has approved the pack's changed lines in the PR; no step was dropped (P-330 (7)).
* **Depends on:** C1, A1, A2; C3 for the Validate steps; B2 and B3 before any of them claims Works by screens. **Open Majors before Works claims:** C7.7: QA-245, QA-246, QA-152, QA-153, QA-235, QA-229, QA-283, QA-289. C7.6: QA-245, QA-251, QA-229. C8.1: QA-245, QA-251.

### G4. Conditional document lines

**Row B1 — C6.4: the Documents panel and the checkpoint's conditional lines** (land #1073). *Size: small to medium (built, approved round 3; its 75 `demo.ts` lines move to a step file).*
* **Capability:** C6.4 Document checklist per person. **First red:** C6.4-4, then the minor's lines -8 to -9b and -19.
* **Cause:** the checkpoint's release has four document lines, all on every applicant, and none of the conditional ones; the checklist had no screen.
* **Change:** written on #1073 at 5cdff49c3: the Documents panel on the case page (request, upload, Not applicable with a reason, history, "Answer first"), and conditional lines from `samples/conditional-documents.json`. **Left:** merge `main` after A2 (H1); its loader lines become `api/src/features/checkpoint/combination/325-conditional-documents.ts`; diff-only Opus check; gate A.
* **Files:** `web/src/runtime/checklist.tsx` (new), `web/src/runtime/cases.tsx`, `web/src/runtime/questionnaire.tsx`, `api/src/case-checklist.ts`, `engine/runtime/case-checklist.ts`, `samples/conditional-documents.json`, the new step file, `acceptance/C6.4.test.ts`, `acceptance/C6.4-screen.test.ts`, `tests/check_vv_checklist.ts`, `tests/check_stand_ins.ts`.
* **Acceptance:** both C6.4 packs on a fresh checkpoint. **Done when:** step 4 and the screen pack's 31 to 38 pass there; no step goes pass to fail; journey J-B1; gate A. No Works claim in this row.
* **Depends on:** B120, A2 merged. **Then for Works:** the minor's lines need a calculated age, which has no route or screen (**row A6 = B102**: concept and challenge, then "a person adds age in whole years on the application date, from the date of birth, by a screen"); qa closes QA-226. **Decisions:** founder Q1 covers the permanent-residence lines as breadth.

### G5. Filing steps with a route and no screen (QA-229, QA-251)

**Row B2 — Ready to file by screens: review, pass a warning with a reason, Ready to file.** *Size: medium (one panel; concept exists and was challenged).*
* **Capabilities:** C7.6 Ready to file; it is also the walk that C8.2's gate A needs.
* **First red:** none in a pack (the routes work); the walk stops: `POST /runtime/filings/:id/review`, `…/warnings/:code/pass` and `…/ready` (`api/src/readiness.ts:161-163`) have no caller in `web/src` (the first three entries of `product/tools/route-has-screen-allow.txt`), and the Prepare panel shows its own pill instead of the server's readiness (QA-229).
* **Change:** the readiness panel per filing from `screens/M3-design-2026-11-04/prepare-tab/concept-draft.md` (challenged; the tech lead approves, P-316 (3)): blocks and warnings listed by who owes them, in the server's words; "Pass with a reason"; the representative's "Review the filing"; "Ready to file".
* **Files:** `web/src/runtime/readiness.tsx` (new), its mount in `web/src/runtime/cases.tsx` or `forms.tsx`, a browser check under `tests/runtime/`; the three allow-list lines go (the tech lead's file).
* **Acceptance:** `acceptance/C7.6.test.ts` stays as it is; the new browser check walks journey J-B2. **Done when:** on the checkpoint a case officer and the representative take one filing from "not ready" to "Ready to file" by screens only, each warning passed with a recorded reason; the screen and `/prepare` say the same state in the same words (QA-229 closed by qa); `route-has-screen.mjs` passes without the three lines; axe clean, no sideways scroll at 1024 px.
* **Depends on:** A1 (the account and gates are on the case). **Unblocks:** C8.2's Works claim; C7.6's with C4.

**Row B3 — Sign and scan by screens.** *Size: medium.* **Capability:** C8.1. **Gap:** `POST /runtime/items/:id/sign-steps/:key` and `…/signed-scan` (`api/src/sign-steps.ts:159`, `:161`) have no screen (the fourth and fifth entries of the allow-list). **Change:** on a hand-signed item: Print (names the copy), Signed, Upload the scan, then "Uploaded to IRCC" once the filing is Ready. **Files:** `web/src/runtime/sign-steps.tsx` (new), its mount in `web/src/runtime/forms.tsx`, a browser check. **Done when:** journey J-B3 by screens on the checkpoint; the two allow-list lines go; C8.1's pack unchanged. **Depends on:** A2 (the IMM 5476 item exists), B2.

**Row B4 — The answer sheet panel.** *Size: medium.* **Capability:** C7.3. **Gap:** no file in `web/src` shows the sheet or "Entered in the portal". **Change:** the panel from the same prepare-tab concept: sections in the form's order, each answer with its source and a Copy button, the tick with who and when. **Files:** `web/src/runtime/answer-sheet.tsx` (new), its mount, a browser check. **Done when:** journey J-B4 on the checkpoint; C7.3's pack 13/13 there. **Depends on:** C2. **Before "Claims Works: C7.3":** QA-153 and QA-165 closed or fixed by name.

### G6. Built, waiting to land or to be scored

**Row Q1 (qa, no build) — Re-score C1.3 and C11.5.** C1.3's pack exits 0 on a fresh checkpoint today (54/54) and on gate B's own run (55/55); CAPABILITIES still says C1.3 "Not built" and C11.5 "Partial". **Done when:** qa's walk by screens of journey J-Q1 on `main` and its verdict; the two rows read together (P-316 (2)). No builder.

**Row A5 — C3.16: shared field scope and stable list entries** (land #1054). *Size: medium (built; Opus Approve of 608f793af; draft; carries a migration).* **Left, as its builder listed on the PR:** merge `main` once (expected conflict: import lines in `api/src/question-condition.ts`), the second-lander checks, re-run C3.16-7 and the case part on fresh copies, a diff-only Opus check, mark ready, gate A. **Files:** as on #1054 (21 files; `prisma/schema.prisma` and one migration with its own stamp, P-348 (8); `api/src/runtime.ts`; `web/src/runtime/questionnaire.tsx` at hand-over H2). **Done when:** its pack's six part and case part exit 0 on `main`'s data; M2 packs equal to `main`; gate A; a breaker run, since it changes the schema (P-278). **Depends on:** A2 and B1 merged (shared files). **Decisions:** founder's earlier "keep them" stands.

**Row C5 — C6.12 breadth: spouse sponsorship priced from the fee table** (land #1074), then the fees on the case page (**row B5**, `web/src/runtime/`, step -25). **First red:** C6.12-22 ("no fs.spouse entry in samples/fee-table.json"; the combination is released on the checkpoint now, `released: 1`). **Files:** `engine/runtime/filings.ts`, `samples/fee-table.json`, `tests/check_r2_fee_table.ts`. **Done when:** C6.12-22 passes on the checkpoint with each fee on a named filing (the tech lead's ruling 3 on #1074; CAD 1,260 is cited there from canada.ca). **Held by:** founder Q1 (is sponsorship and the child's study filing breadth, or part of C6.12's Works?) and -23, which no release asks yet.

### G7. Not built

* **Row C6 — C7.5 part 2: review runs, the run card, replay.** First red C7.5-5 (`POST /runtime/cases/:id/review-runs/plan` does not exist). New `api/src/review-runs.ts` and the Review page part per `screens/M3-design-2026-11-04/rows.md` (C7.5); then one recorded run of IMM 5257 on the Mac paid runner (founder Q2). Medium, then one paid step.
* **Row C7 — C6.5 part 2: document reads, "Confirm & use", checks.** First red C6.5-2; 23 of 32 steps red on both data sets. New `api/src/case-documents.ts` with a migration, then the drawer in `web/src/runtime/` (stream B). Medium plus small to medium; the letter read is one paid step (Q2).
* **Row C8 — C10.2: the finished story.** First red C10.2-1 (`POST /demo/checkpoints/finished-story` does not exist). Last by design: it loads what every row above makes. New step files in a folder of their own under `api/src/features/`. Large.
* **C6.12-23** (the child's study filing question): no release asks it; with Q1.

---

## 4. Three builder streams with disjoint files

One row per fresh session and per PR (P-278). A stream is a seat: when its PR is labelled, the next row starts in a fresh session. Each stream owns its files for the whole sprint. **No two streams write the same file, with two named hand-overs** where an already-written PR carries a few lines into another stream's file; each hand-over is a merge order, not parallel work.

| | Stream A: the release and the case team | Stream B: the case page by screens | Stream C: the filing engine and its packs |
|---|---|---|---|
| **Owns** | `api/src/features/checkpoint/105-*`, `130-release-two.ts` (one edit) · `api/src/checkpoint-stage-one*.ts` · `samples/checkpoint-stage-one.json`, `samples/form-setup.json`, `samples/firms.json` · `api/src/form-setup.ts`, `api/src/runtime.ts`, `api/src/eligibility.ts` · `engine/runtime/team.ts` · `web/src/pages/**`, `web/src/components/eligibility-gates-editor.tsx` · packs C6.11, C6.9, C11.6, C3.16 · #1054's files | `web/src/runtime/**` · `api/src/case-checklist.ts`, `engine/runtime/case-checklist.ts` · `samples/conditional-documents.json` · `api/src/features/checkpoint/combination/325-*` · packs C6.4, C6.4-screen · browser checks for its panels | `acceptance/lib/m3.ts` · packs C7.3, C7.6, C7.7, C8.1, C9.2, C7.5, C6.5, C10.2 · `api/src/case-prepare.ts`, `api/src/fill-case.ts`, `api/src/form-parts.ts` · `engine/runtime/prepare.ts`, `answer-sheet.ts`, `readiness.ts`, `filings.ts` · `samples/fee-table.json` · new `api/src/review-runs.ts`, `api/src/case-documents.ts` |
| **Order** | A1 B104 (#1084) → A2 C6.11 (#1072) → A3 release 2's lines → A4 gate screen (B106) → A5 C3.16 (#1054) → A6 calculated age (B102) | B1 C6.4 (#1073) → B2 Ready to file by screens → B3 sign and scan → B4 answer sheet → B5 fees on the case page | C1 packs' helper → C2 C7.3 (#1075) → C4 packs C7.6, C8.1, C9.2 → C3 channel decides "for filing" → C4 pack C7.7 → C5 fees (#1074) → C6 C7.5 part 2 → C7 C6.5 part 2 → C8 C10.2 |
| **First hour** | rebase #1084 on B120 into `105-stage-one.ts` | rebase #1073 on B120 into `325-conditional-documents.ts`; the B2 walk script written first | C1, which needs neither B120 nor any other row |

**Hand-overs (the only times a file crosses streams):**
* **H1 — #1072 (A2) lands before #1073 (B1) and #1075 (C2) merge `main`.** It carries 12 lines in `api/src/case-prepare.ts` (C's) and 1 line in `web/src/runtime/questionnaire.tsx` (B's). All three are already written; B1 and C2 each merge `main` once after it (P-270) and re-run their packs.
* **H2 — #1054 (A5) lands when stream B has no open PR on `web/src/runtime/questionnaire.tsx`** (5 lines there) and after A2 (`api/src/runtime.ts`).

**Why this order gives the most Works soonest:** A1 and A2 are approved code that moves six packs; C1 removes the helper faults from every checkpoint run, so everything after it is measured truly; B2 is the one screen that turns three green packs (C8.2, later C7.6 and C8.1) into walks qa can pass. The journey order of P-348 (1) is kept inside each stream; only C10.2 and the two paid capabilities are pushed to the end, as P-348 (1) already says for C10.2 and C6.5.

**The qa lane** starts with row Q1, then gate A in arrival order; at about one row per stream every 4 to 6 hours it is not the bottleneck, but two Works claims at once (C6.11 and C8.2) should be told to it an hour ahead.

**Capacity:** three builders, qa and the tech lead at about 0.9% of the weekly plan an hour is about 43% over 48 hours (the founder's "pace to the plan", 6 Nov). If the 12-hour point shows a stream idle on a hand-over, the tech lead gives its seat the next row of another stream that touches only new files (B3, B4 and C6 qualify).

---

## 5. The 12-hour checkpoint (P-359)

With the clock starting when the P-376 changes are on `main` (about 21:30 IST, 6 Nov), hour 12 is about **09:30 IST, 7 Nov**, and hour 48 about 21:30 IST, 8 Nov.

**Measured at hour 12, from GitHub and qa's records, not from reports:**

| Number | Read from | This plan expects |
|---|---|---|
| Rows merged | merged PRs naming a row above | 4: A1, A2, C1, B1 |
| Rows in gate A or review | open PRs marked ready | 2: C2, B2 |
| M3 packs exit 0 on a fresh checkpoint | the nightly or one run of the 16 | 5 whole packs: C1.3, C6.12, C8.2, C6.9, C6.11 (2 today) |
| Capabilities confirmed Works by qa | `qa/CAPABILITIES.md` | 2 to 3: C1.3, C11.5, perhaps C6.11 |
| Hours from "ready" to merged, per row | `daily-numbers.sh` | under 1 hour approved-to-merged; first review round Approve on 3 of 4 |
| Weekly plan used | the tech lead's check | about 11% |

**The forecast the tech lead then gives the founder** is the rows-merged rate times the rows left per capability in section 3, not this plan's estimate. **Trip-wires at hour 12:** fewer than 2 rows merged means the landing of approved PRs is the problem (look at CI and the queue, not at builders); C1 not merged means every later checkpoint number is still clouded by the helper, so it goes first; no ruling R1 means stream C has nothing it may change.

**ETA board for the first Works (P-338), all estimates until measured:** C1.3 and C11.5 about 01:00 IST, 7 Nov (waits on qa's walk only) · C6.11 about 08:00 IST, 7 Nov (waits on B120, A2's gate A, QA-283, QA-289) · C8.2 about 16:00 IST, 7 Nov (waits on A1, B2) · C6.9 about 22:00 IST, 7 Nov (waits on A1, the gate screen's concept and challenge) · C11.6 about 02:00 IST, 8 Nov (waits on A1, A3, its pack's ruling).

---

## 6. qa's journeys by screens, written before the build (P-352, P-371 (5))

Each is walked at 1440 px on a fresh copy after Demo › Reset and Demo › Load the configured checkpoint, by screens only, and ends at the next capability's first step (P-348 (3)). The builder turns it into the row's browser check before the first Opus review; qa walks it for gate A. Step numbers in brackets are J7's (`acceptance/journeys/J7-visitor-visa-end-to-end.md`), read for release 2.

* **J-A1 (B104).** Author opens Visitors › Visitor visa: "In Release 2" [1.1]. Forms tab: IMM 5257 "A parent, for a minor", IMM 5476 "The person and the representative" [1.2, 1.3]. Account reads APR Portal [1.5]. Case officer opens a case for the family of four [2.1]; the case reads "Filed through APR Portal", read-only [2.3]. Eligibility: Run gives "Possibly eligible — needs …" with the four officer's-judgement lines [4.1]. Ends at C6.9's override without a reason, refused on the field [4.4].
* **J-A2 (C6.11).** Case officer opens a family case and picks the representative of record [2.1]; making the case officer the representative is refused in words [2.2]. Prepare application: each adult has IMM 5476, the child of 10 has none; the questionnaire shows the representative's membership ID from the firm, not a box to type [5.1]. Firm admin reassigns the representative with a reason: history line; the IMM 5476 item names the new one [2.5]. Ends at C8.1's first step: IMM 5476 shows its print step.
* **J-A3 (release 2's lines).** Author: Forms tab shows IMM 5645 "The person the form is about" and how each line is signed [1.3, 1.4]; Forms library › IMM 5257 › What IRCC accepts shows the record and its reason [1.4a]. Case officer fills and confirms one adult: the readiness list has no "must be signed (how it is signed is not set…)" line for IMM 5645. Ends at C11.6: IMM 5476 ⋯ Change channel → Online is greyed with IRCC's line [5.2].
* **J-A4 (gate screen).** Author adds a gate "Passport number answered", saves, submits; the reviewer signs; a different person releases. Case officer runs the check on a new case: the gate is listed Met or Not answered. Removing a gate without a second person is refused. Ends at the case's Eligibility page [4.1].
* **J-B1 (C6.4).** Case officer: Documents, Everyone ▾: each person's lines with the reason on hover [3.1]; proof of financial support on the principal only. Request the passport, upload a file: Not requested → Requested → Received; nothing in the questionnaire changes [3.3]. Mark a line Not applicable without a reason: refused; with one: saved, history shows who and when. "Answer first" opens the question a "May be needed" line waits on [3.2]. Ends at C6.5's first step: the passport section offers "Fill this from documents".
* **J-B2 (Ready to file).** Case officer fills and confirms a single adult's case. The filing's panel lists what stands before Ready to file, by who owes it, never a percentage [6.4]. "Ready to file" is refused and lists the same lines. Pass a warning without a reason: refused on the field; with one: recorded with who and when [7.1]. The representative of record presses Review the filing: "Prepared by · Reviewed by" shown; a case officer does not see the button [6.6]. Ready to file: the filing reads "Ready to file" [7.1]. Ends at C8.2's first step: "Record the submission" is now enabled and a missing application number is refused on its field [7.3].
* **J-B3 (sign and scan).** On an adult's IMM 5476: "Signed" before "Print" is refused in words; Print names the copy; Signed; upload a scan that is not a PDF or image: refused; upload a PDF: "scan received", the item is Ready [5.7]. "Uploaded to IRCC" is refused until the filing is Ready to file, then ticks and the item is Done [7.2]. A child's IMM 5257 names a parent as signer [5.8]. Ends at C8.2's Record the submission.
* **J-B4 (answer sheet).** On the case's Online form: sections in the form's order, each answer with its source and a Copy button, dates as YYYY-MM-DD [5.3]; before confirmation the sheet shows what it waits for, no values. Tick "Entered in the portal" on the first section: who and when; ticking again changes nothing [5.4]. Change that person's family name: the section reads Out of date, the entered answers unchanged [6.5]. Ends at C7.6's readiness panel.
* **J-C3 (Validate on release 2).** Case officer: IMM 5257 ⋯ Change channel → Paper without a reason: refused; with the accommodation reason: saved for that person only [5.2]. The line now shows its steps: make the copy, Validate in Adobe, read it back [5.6]. Ready to file is refused naming the missing validated copy (the one hard stop). Read back the validated copy: the line is In progress, naming the copy. The spouse's IMM 5257 is still Online with "Copy, not for filing". Ends at C9.2: change the family name, the validated copy reads Out of date.
* **J-Q1 (C1.3, C11.5).** Case officer opens a worker's case on the employer-specific work permit released on the checkpoint: "Relies on an employer case" is offered with the reason; pick the Sample employer case; the employer's name, address and LMIA or offer number are copied in once and shown as copied (the three facts C1.3's pack checks). On a Visitor visa case the link is "Not offered: the Visitor visa has no employer facts". A client and a configuration role are refused. Ends at the worker case's questionnaire showing the copied facts.

---

## 7. Rulings needed from the tech lead (P-294), each with a recommendation

* **R1. Packs follow the case's own lines.** Recommend yes, as already accepted for C7.3 on #1075: assertions stay, form numbers and channels come from the case through `linesOf`. Without it stream C may not touch a pack (acceptance README). Release 2 itself stays as ruled (P-318 (6), C10.1 row 9 is Works on it).
* **R2. Landing order now that B120 removes the `demo.ts` queue:** #1084, #1072, #1073, #1075, each moving its loader lines into its own step file. Recommend this order (H1). The earlier order put #1084 last only for `demo.ts`.
* **R3. `130-release-two.ts` takes one edit from stream A** (row A3), as the hot-file line for that PR. Recommend yes; it answers the B104 lane's open question on #1084.
* **R4. QA-289** (proposed Major on C6.11 and C7.7): rule its severity before A2's Works claim. Recommend Major stands and its fix is A's next small PR (`engine/runtime/team.ts`).
* **R5. Who finishes the six written PRs:** their paused cloud sessions (they hold the context but may be gone) or fresh sessions with the PR as the brief. Recommend fresh sessions, one row each, started from the PR's own "left" list.
* **R6. C6.4-4:** the pack expects proof of financial support on the principal only (Sample); the checkpoint has it on each applicant. #1073 names step 4; confirm which the checklist IMM 5484 supports when its gate A is read.
* **R7. Gate B and C6.12's two packs (row B103):** until it is built, a PR naming C6.12 runs both packs whole, so C5 stays held as ruled on #1074.

---

## 8. Questions for the founder (three, one at a time, each with a recommendation)

1. **Is "breadth" outside the Visitor visa Works?** Four capabilities carry parts that are not on the Visitor visa journey: C6.12's spouse sponsorship and the child's study filing, C6.4's permanent-residence lines, C11.6's portal-only sheets, C6.5's letter read by AI. **Recommend: yes** — count Works on the Visitor visa journey and name each of those as its own row after the sprint. Effect: C6.12 (24/24 on the checkpoint today) becomes a Works candidate once its fees show on the case page; without it C6.12 waits for a Sample study-permit release that no row builds yet. (Asked on 4 Nov in the M3 design, not recorded as answered.)
2. **One Go for two recorded AI runs.** C7.5's review of IMM 5257 (about US$1.11, measured in the M3 design) and C6.5's read of the Sample letter of invitation (its estimate is shown on the run card first), both on the Mac paid runner, both recorded once and replayed at US$0 afterwards. **Recommend: yes, capped at US$5 for the two** (P-232), run only when each build is reviewed, not before hour 24. Without it C7.5-7 to -13 and C6.5-19b and -20 can never go green.
3. **Where a person meets Adobe Validate on today's release.** On release 2 IMM 5257 is filed Online, so no new case has a barcode form to validate. **Recommend:** the case officer may switch one person's IMM 5257 to Paper on the case, only with a written accommodation reason, and that copy is then for filing with the Validate round trip (row C3). canada.ca "Apply for a visitor visa" (page date 2026-08-28): "You must apply online."; paper only for a person who cannot apply online. Sample until the immigration expert confirms what the account accepts (FQ-2, FQ-3). The other choice is to show Validate only on the older release-1 family case, which leaves C7.6's one hard stop unreachable on any case opened today.

---

## 9. What this plan did not check

* **No browser step ran** (the sandbox refuses Chromium), so C6.12-25 and every "by screens" statement is read from files and earlier walks on the PRs, not seen today.
* **#1084, #1072, #1073, #1075, #1054 and #1074 were not re-run;** their numbers are their builders' and cloud qa's, on older `main` heads. Each needs its pack re-run after the merge with B120.
* **Causes are read from the code and two diagnostic runs,** not proven by a fix. The UCI cause in C1 and the size of C4 are the least certain; C4's first red steps must be re-measured after C1, A1 and A2.
* **The forecast is an estimate.** The measured facts are the pack table and the checkpoint dump.
* B120's step numbers (105, 130, 325) are read from #1158's branch at ccb0d98ec; if it changes before merging, the numbers move with it.
