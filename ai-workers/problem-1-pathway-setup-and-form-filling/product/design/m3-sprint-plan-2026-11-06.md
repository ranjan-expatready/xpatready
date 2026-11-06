# M3 sprint plan: ready rows, three builder streams, 12-hour forecast (6 Nov 2026)

**For:** the tech lead, who copies approved rows into `BACKLOG.md` (P-314). **By:** the M3 planning lane. **Base:** `main` 50e47a6fd. **Raw results:** `product/screens/M3-plan/packs-2026-11-06.md`. Plan only: no product file changed, live AI off, US$0. **Revised about 20:30 IST, 6 Nov,** after an independent Opus challenge of PR #1167 ("sound with changes") and the tech lead's seven rulings: what moved is in section 10. **The founder's three answers (about 20:05 IST) are in section 8;** the forecast in use is the one with question 1 answered yes.

**Rules this plan keeps:** P-359 (48-hour sprint, forecast at 12 hours from measured rows), P-376 (the clock starts when the scale changes are on `main`; small PRs, no stacks, one file per feature), P-351 (by shared cause), P-348 (1) (a person's journey), P-352 and P-371 (5) (the journey by screens is written before the build), P-322 (Works counts on the configured checkpoint), P-303 and P-309 (no gate lowered). Builders never edit the shared notes files.

Words used here. **Checkpoint:** the demo data made by Demo › Load the configured checkpoint, where Works is counted. **Fixture:** the small test set-up a pack's own run line builds (`setup_visitor_visa.ts`, `setup_vv_m3.ts`), where gate B runs a pack that has set-up steps. **Pack:** a capability's acceptance test, `prototype/studio/acceptance/<id>.test.ts`. **Release 2:** the Visitor visa's current release on the checkpoint.

---

## 1. In one page

**What was measured (17:28 to 18:20 IST, 6 Nov).** All 16 M3 packs ran twice on `main`: on a fresh checkpoint and on their own fixture.

| | Packs that exit 0 |
|---|---|
| On the fixture | 12 of 16, plus C6.5's engine part |
| On the checkpoint | 2 of 16: C1.3 (54/54) and C6.12 (24/24), plus C6.5's engine part (7/7) |

**The finding.** M3 is mostly built. Ten packs are green on the fixture and red on the checkpoint (C6.11, C11.6, C6.4, C7.7, C7.3, C7.6, C8.1, C8.2, C9.2, C6.9). They fail for **five shared causes. Four are about what the checkpoint holds and what the packs expect; the fifth is screens that are not built.** The independent challenge confirmed causes 1, 2, 3 and 5 in the code. The fixes are not all data: row C3 changes the filing engine (`engine/runtime/prepare.ts:82`, `api/src/fill-case.ts:327` and `:455`), and rows B2, B3 and B4 are screens still to build.

1. **The release has no account, no eligibility gates and no "signed by"** (row B104, built on #1084).
2. **"Uses a representative" is an asked Yes/No, not read from the case team,** so IMM 5476 goes to nobody or to everybody, children too (built on #1072).
3. **The packs were written for a three-form Sample release; a case on the checkpoint opens on release 2, which is seven forms with other channels.** The packs name IMM 5707 as the Online form and IMM 5257 as the barcode PDF. On release 2 IMM 5257 is Online, IMM 5645 replaces IMM 5707, and four more forms apply only on an answer. Ruled by the tech lead (6 Nov, about 20:00 IST): packs follow the case's own release 2, and what a pack expects comes from that release's configuration and the cited rules, matched exactly, never from the product's own answer (row C1).
4. **The checkpoint has four document lines and none of the conditional ones** (built in part on #1073; the minor's lines wait for row B102).
5. **Five filing steps have a route and no screen** (QA-229, QA-251): the representative's review, passing a warning with a reason, Ready to file, the print and signed steps, the signed scan. Packs pass through the routes; gate A's walk by screens cannot.

What is truly not built: C7.5's AI review run (part 2), C6.5's document reads (part 2), C10.2's finished story, C6.12's sponsorship and study-filing breadth, and the gate-authoring screen for C6.9.

**Forecast for 48 hours at three builders (estimates, not measured; re-forecast at hour 12). Two forecasts were written, because founder question 1 is a cut in what M3 counts, not a technical choice. The founder answered yes (about 20:05 IST, 6 Nov), so the first row is the forecast in use; the second stays for the record:**

| If the founder says | Forecast | Range | Which capabilities |
|---|---|---|---|
| **Yes to question 1:** the parts outside the Visitor visa (sponsorship, the child's study filing, permanent-residence lines, portal-only forms) become rows of their own after the sprint | 5 confirmed Works | 4 to 7 | Likely: C1.3 and C11.5 (no build: qa's re-score), C6.11, C8.2. About even: C6.9, C3.16, C11.6. Less likely: C7.3, C6.4 |
| **No:** those parts stay inside Works, as the CAPABILITIES rows of C6.12, C6.4 and C11.6 read today | 4 confirmed Works | 3 to 5 | The same four likely. About even: C6.9, C3.16. C6.12, C6.4 and C11.6 cannot reach Works in the sprint |

Founder question 3 is answered too (Paper with a written reason), so row C3 and the packs behind it (C7.6, C9.2, C7.7, C11.6) are no longer blocked. With question 1 answered yes, C6.12 joins the about-even group if its one screen row (B5) is moved up (ruling R11). Not in 48 hours either way: C7.6, C8.1, C9.2, C7.7 (many joins, six open Majors on C7.7), C7.5 and C6.5 (not built, one paid run each), C10.2 (last by design).

**The founder has answered all three questions** (section 8, about 20:05 IST, 6 Nov): Visitor visa first; Paper with a written reason; one Go for the two recorded AI runs, US$5 in total. Nothing is waiting on the founder.

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
* **Change:** already written on #1084 at e36ade7fd (Opus Approve, CI green, cloud qa's gate A PASS on d89a3afb4): `applyStageOne` sets the three parts through the services the screens call, from `samples/checkpoint-stage-one.json`, each value cited and marked Sample. **Left:** start now on its branch (merge `main`, re-run the packs). B120 (#1158) is not on `main` yet: when it lands, merge `main` once more and move its one import and one call out of `demo.ts` into a new step file `api/src/features/checkpoint/105-stage-one.ts` (before `110-release-one.ts`); the walk accepts "In Release 2"; a diff-only Opus check of the merge.
* **Files:** `api/src/checkpoint-stage-one.ts`, `api/src/checkpoint-stage-one-data.ts`, `api/src/features/checkpoint/105-stage-one.ts` (new), `samples/checkpoint-stage-one.json`, `tests/check_b104_stage_one.ts`, `tests/check_b104_checkpoint.ts`.
* **Acceptance:** `acceptance/C8.2.test.ts`, `acceptance/C6.9.test.ts`, alone on a fresh checkpoint. **Done when:** C8.2 is 12/12 exit 0 and C6.9 is 15/15 exit 0 there; C11.6 is at least 9/14 and C8.1 at least 2/14, with no step going pass to fail in any M3 pack against the table above; `check_b104_checkpoint.ts` exits 0 on the branch and 1 on `main`; Reset to the six is byte-equal before and after (`tools/demo-dump.mjs`); the walk of journey J-A1 passes at 1440 px; cloud qa's gate A.
* **Depends on:** nothing to start; B120 (#1158) on `main` to merge. It runs side by side with A2 from hour 0: the tech lead checked that the two PRs' files do not overlap (heads e36ade7fd and 4c3cfbdd6).
* **Gates:** Opus diff-only check of the merge; qa's gate A; no breaker (no new screen, money, schema or permission). `Fixes: QA-247` (C8.2, C11.6). It also gives QA-244 its first half (the release has gates); QA-244 closes with row A4.
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
* **Gates:** Opus review; qa's gate A; no breaker. No `Fixes` line: it closes no bug by itself (C7.6, C8.1 and C11.6 keep their open Majors until the rows named in C4). `acceptance/C11.6.test.ts` is run here and never edited: its one owner is stream C (hand-over H4).

**Row A4 — B106: the gate-authoring screen.** *Size: medium (concept and challenge first, P-223 (4); then one screen).* **Built in stream B** (the tech lead's ruling 2). Its concept and fresh challenge are written from hour 0 by stream A's seat, while that seat's PRs wait on CI and gate A.
* **Capability:** C6.9 Case check. **First red:** none in the pack after A1 (15/15); the gap is QA-244's second half: no screen saves gates (`PUT /combinations/:id/eligibility-gates` is on `product/tools/route-has-screen-allow.txt`; `web/src/components/answer-key-editors.tsx:274` only reads them).
* **Change:** an author adds, edits and removes a gate and the officer's-judgement lines on the combination's page, as a draft change a second person releases; the allow-list line goes.
* **Files:** a new `web/src/components/eligibility-gates-editor.tsx` and its one mount line in the combination page under `web/src/pages/` (hand-over H6); `api/src/eligibility.ts` only if a refusal needs words; a browser check under `tests/`.
* **Acceptance:** `acceptance/C6.9.test.ts` on the checkpoint, plus the new browser check. **Done when:** C6.9 15/15 exit 0 on the checkpoint; a person saves a gate by screen and the next case check uses it after release; `route-has-screen.mjs` passes with the allow-list line removed; journey J-A4; qa's gate A. **Depends on:** A1; its concept approved by the tech lead. **Decisions:** none.
* **Gates:** concept with a fresh challenge and the tech lead's approval (P-223 (4)); Opus review; **a breaker run: it is a new screen, and it sets who may save and who may release a gate (permissions)** (P-278); qa's gate A. `Fixes: QA-244`.

### G2. The represented case (IMM 5476 and the firm's facts)

**Row A2 — C6.11: IMM 5476 follows the representative of record** (land #1072). *Size: small (built, approved round 2; one rebase and one unpushed fix).*
* **Capabilities:** C6.11 Firm, users and case team; it also opens the hand-signed path that C8.1, C7.6 (-7, -11), C9.2 (-6, -10) and C7.7 (-1, -2) need.
* **First red:** C6.11-15 (IMM 5476 for all four people), then -16c and -17a.
* **Cause:** IMM 5476 applies on the asked answer `case.uses_representative` (`api/src/form-setup.ts:13`; the rule and its cite in `samples/form-setup.json`), for each applicant with no minimum age. So before the answer everyone has it, and after the pack helper answers No (`acceptance/lib/m3.ts:126`, every Yes/No is No) nobody has it, though every case has a representative of record.
* **Change:** written on #1072 at 4c3cfbdd6: the principal and the partner always and a dependent child from 18 (canada.ca "Use of a Representative Form (IMM 5476)", modified 2025-12-12, quoted in the PR); "uses a representative" comes from the case team; the representative's facts come from the firm record. Its measured result: C6.11 25/25 on a fresh checkpoint, by screens 14/14. **Left:** start now on its branch, side by side with A1 (push the kept n1 fix, merge `main`, re-run the pack). When B120 (#1158) lands, merge `main` once more (its one `demo.ts` line becomes data or a step file), CI, gate A.
* **Files:** `api/src/form-setup.ts`, `samples/form-setup.json` or a step file, `engine/runtime/team.ts`, `api/src/runtime.ts`, `samples/firms.json`, `api/src/case-prepare.ts` (12 lines) and `web/src/runtime/questionnaire.tsx` (1 line) at hand-over H1 (section 4), `acceptance/C6.11.test.ts` (one line, already ruled), `tests/runtime/check_c611_*`.
* **Acceptance:** `acceptance/C6.11.test.ts` on a fresh checkpoint. **Done when:** 25/25 exit 0 there; on a represented family case adults have an IMM 5476 item and a child of 10 has none; C8.1 passes beyond step 2 (reported per step); journey J-A2; gate A. `Fixes: QA-152, QA-245`.
* **Depends on:** nothing to start; B120 on `main` to merge. **Before "Claims Works: C6.11":** QA-283 closed (row B117, #1148, open) and QA-289 ruled (proposed Major: the firm's office phone is passed as an object, `engine/runtime/team.ts` `representativeContact`; same file, so its fix is row A7). **Decisions:** none.
* **Gates:** Opus diff-only check of the merge; qa's gate A; no breaker. `Fixes: QA-152, QA-245` (C6.11, C7.7, C8.1, C7.6).

**Row A7 — QA-289: the firm's office phone reaches a case as a phone, not as an object.** *Size: small.*
* **Capabilities:** C6.11 Firm, users and case team · C7.7 Prepare application list.
* **First red:** none in a pack. qa confirmed the cause on `main` 5b3507134 in data and code, not on screen: on the five released programs the firm record fills only the representative's names today.
* **Cause:** `samples/firms.json` holds `office.phone` as an object (country code and number); `engine/runtime/team.ts` `representativeContact` passes it as `person.telephone_number`; where the question that reads it is not of kind phone the case page shows it with `String(value)`, that is "[object Object]", and the same value can reach IMM 5476's representative block.
* **Change:** `representativeContact` hands the phone on in the shape the reading question's kind expects. One file of stream A; `web/src/runtime/questionnaire.tsx` is not touched.
* **Files:** `engine/runtime/team.ts`, one fail-then-pass test under `tests/runtime/`.
* **Acceptance:** the new test, and `acceptance/C6.11.test.ts` on a fresh checkpoint. **Done when:** the test fails on `main` and passes on the branch; on a release that asks the representative's telephone the case and IMM 5476's block show a number a person can read, never "[object Object]"; C6.11 stays 25/25; qa closes QA-289.
* **Depends on:** A2 merged (same file); ruling R4 (its severity). **Decisions:** none.
* **Gates:** Opus review; qa's gate A; no breaker. `Fixes: QA-289`.

### G3. The packs meet the release a case really opens on

Six of the red packs (C7.3, C7.7, C7.6, C9.2, C11.6, C10.2) name the fixture's forms and channels. On the checkpoint the same journey exists with other form numbers, so the product is not wrong and neither is the checkpoint: the packs need to ask for "the Online form", "the barcode form", "the family form", "the hand-signed form" of the case in front of them. The acceptance README says a pack changes only by the tech lead's word. **Ruled (R1, with a correction that lowers no bar):** packs follow the case's own release 2, but the lines a pack expects are worked out from the release's own configuration and the cited rules and matched exactly; a pack never reads the product's `/prepare` answer to learn what to expect. **QA-153** (IMM 5707's answer sheet waits for facts about the parents) goes to qa to re-sort, since release 2 has no IMM 5707; this plan no longer lists it as a builder's step.

**Row C1 — The packs' expected lines come from the release's own configuration (the shared helper first).** *Size: medium (one helper file, but 37 files import it and each must be shown unchanged).*
* **Capabilities:** C7.7, C7.6, C8.1, C9.2, C7.3, C11.6, C10.2 (every pack that reads `acceptance/lib/m3.ts`).
* **First red:** C7.7-9 ("nothing left to confirm" fails: 1 to confirm per filing), C7.6-4 and -5 ("fact with a problem" on every filing), C9.2-2, C8.1-3.
* **Cause:** three assumptions in `acceptance/lib/m3.ts`. (1) `sample()` at `:126` answers every Yes/No with No and gives text or "5000" for anything else, so the UCI is refused as "needs a fix" on IMM 5257 and Schedule 1 (`engine/runtime/readiness.ts:132`). (2) `readyToFile` at `:232` validates only a form named "IMM 5257" with channel PDF upload. (3) Nothing in the helper says which forms the case's own release gives each person, so every pack types the fixture's three.
* **Change (as ruled, R1 with its correction):** a new export `expectedLines(release, people)`. It reads the form lines of the release the case is pinned to **as configured** (form, channel, who it applies to, minimum age, the answer it waits on, who signs, how it is signed) through the configuration routes the Forms tab reads; the builder names the route in the PR. It applies the cited rules (each rule named in a comment with its line in `compliance-trace.md`) to the pack's own people by role and age, and returns for each person the exact forms expected: the Online form, the barcode PDF, the family form, the hand-signed form, and the forms that wait on an answer. Packs then compare the product's `/prepare` answer with this **exactly**: the same forms, counts, channels and signers. No "at least", and **no helper reads `/prepare` to decide what to expect** (the first version's `linesOf(prepare)` is withdrawn). `sample()` gives a UCI the release's own checks accept and leaves "uses a representative" to the case team once A2 is in. `readyToFile` validates whichever expected line is a barcode PDF. The helper's existing exports keep their names and arguments; no pack's assertions change in this PR.
* **Files:** `acceptance/lib/m3.ts` only, and one check of the helper under `tests/` that holds the expected answer for both data sets as constants worked by hand: the fixture (adults three forms, a child one) and release 2 (from the configuration dump in `screens/M3-plan/packs-2026-11-06.md`).
* **Acceptance:** every file that imports the helper, on its own data set, before and after. **Done when:** **all 37 importers** give the same exit code and the same step results as on `main`, file by file, with the table in the PR: 15 packs in `acceptance/` (C10.2, C11.6, C6.11, C6.12, C6.12-breadth, C6.4, C6.5, C6.9, C7.3, C7.5, C7.6, C7.7, C8.1, C8.2, C9.2), 14 checks in `tests/` and 8 in `tests/qa/`, which are qa's own checks: this PR edits none of them and qa is told before the merge. On a fresh checkpoint no step goes pass to fail; C7.7-9 passes; the "fact with a problem" warnings on the UCI are gone from a filled case. `expectedLines` equals the hand-worked constants for both data sets. No Works claim.
* **Depends on:** nothing (R1 is ruled). Independent of B120. **Decisions:** none for the founder. **For qa to look at (not asserted here):** whether the UCI question should be required at all on the checkpoint; IMM 5257 asks for it only "if one has been issued".
* **Gates:** the tech lead reads the helper's diff himself (the acceptance README); Opus review; no breaker; no gate A walk (no product file changes), but qa confirms its eight checks unchanged.

**Row C2 — C7.3: the portal sheet on the checkpoint** (land #1075). *Size: small to medium (built; round 1's four Majors fixed; round 2 not finished).*
* **Capability:** C7.3 Portal sheet. **First red:** C7.3-1 (404: "IMM 5707 is filed as PDF upload", and on release 2 there is no IMM 5707).
* **Cause:** the pack names IMM 5707; the sheet's sections come from `contracts/pdf-sections.json`, a hand-written table of four forms (P-319).
* **Change:** written on #1075 at 43ec5ce5c: the sheet is laid out from the form's own parts in the release's configuration (`engine/runtime/answer-sheet.ts`, new `api/src/form-parts.ts`, `api/src/case-prepare.ts`), and the pack follows the case's Online line. Its measured result: 13/13 on two fresh checkpoints. **Left:** merge `main` after A2 (hand-over H1), use C1's helper, Opus round 2, CI, gate A for the API part.
* **Files:** `engine/runtime/answer-sheet.ts`, `api/src/form-parts.ts` (new), `api/src/case-prepare.ts`, `api/src/fill-case.ts` (3 lines), `acceptance/C7.3.test.ts`, `tests/check_c73_parts_checkpoint.ts`, `tests/check_vv_answer_sheet.ts`.
* **Acceptance:** `acceptance/C7.3.test.ts` on a fresh checkpoint. **Done when:** 13/13 exit 0 there and on the fixture; C7.7's fixture pack unchanged. No Works claim: the sheet has no screen yet (row B4); QA-165 stands before a Works claim, and qa re-sorts QA-153.
* **Depends on:** C1, A2 merged. **Decisions:** the row the tech lead asked for on #1075 (freeze the parts in `engine/snapshot.ts`) stays a later row.
* **Gates:** Opus round 2; qa's gate A for the API part; no breaker. The pack's changed lines take their expected lines from C1's `expectedLines` and are approved by the tech lead in the PR.

**Row C3 — A person's channel choice decides "for filing" (the Validate round trip on release 2).** *Size: small in code, and it is a change to the filing engine, not to data. Founder answer Q3 is given (section 8): Paper with a written accommodation reason, Sample until the immigration expert confirms.*
* **Capabilities:** C7.6 Ready to file · C9.2 Out of date · C7.7 Prepare application · C11.6 Channel per form.
* **First red:** C7.6-6 and -10 (no validated copy can exist), C9.2-2 to -5, C7.7-20 to -23, C11.6-9.
* **Cause:** whether a copy is for filing follows the release line's channel, never the channel a person chose for that item: `engine/runtime/prepare.ts:82` ("released as an Online line, so its copy here is Copy, not for filing … Ask the Lead"), `api/src/fill-case.ts:327` and `:455` (`channelIn(snapshot, form) === "ONLINE"`). The code's own comment calls it a question for the tech lead. On release 2 the only barcode form, IMM 5257, is Online, so no new case can show Validate.
* **Change:** an item whose channel a person changed to PDF upload or Paper (inside what the accept record allows, with the accommodation reason for Paper) is for filing: its copy validates and reads back, and only then does a missing validated copy block (P-144, P-237).
* **Files:** `engine/runtime/prepare.ts`, `api/src/fill-case.ts`, one fail-then-pass test under `tests/runtime/`.
* **Acceptance:** `acceptance/C7.6.test.ts` (-6, -10, -12, -22), `acceptance/C9.2.test.ts` (-2 to -5), `acceptance/C7.7.test.ts` (-20 to -23) on a fresh checkpoint. **Done when:** those steps pass there after the packs use C1's helper; a line left Online still gives "Copy, not for filing"; journey J-C3.
* **Depends on:** C1, A3 (the accept record). **Decisions:** Q3, answered. **What waits on this row:** the whole packs of C7.6, C9.2, C7.7 and C11.6 on the checkpoint, and so their Works claims.
* **Gates:** Opus review; qa's gate A; a breaker run only if the fix changes who may switch a channel (permissions), otherwise none.

**Row C4 — One pack at a time onto the checkpoint: C8.1, C7.6, C9.2, C11.6, C7.7.** *Size: five small PRs, one pack file each; C7.7 is the largest. C8.1 can go as soon as C1, A1 and A2 are in; the other four wait on C3.*
* **Capabilities and first red after C1, A1, A2:** to be re-measured; today C7.6-3, C8.1-1, C9.2-2, C7.7-1.
* **Cause:** each pack names IMM 5707 (C7.6 four times, C9.2 four, C7.7 nine) and the fixture's channels. C7.7-1 and -2 also count the four forms that apply only on an answer, which the product already marks "Cannot start yet: waits for 1 answer" (QA-246, a Major product bug, now its own row C9). `acceptance/C11.6.test.ts` is moved onto release 2's lines here and by no other row (hand-over H4).
* **Change:** per pack, the same assertions on the case's own lines through C1's helper; where a step meets a real product gap, the PR names it as a bug for qa and fixes only that. Expected lines come from C1's `expectedLines`, matched exactly.
* **Files:** one of `acceptance/C8.1.test.ts`, `C7.6.test.ts`, `C9.2.test.ts`, `C11.6.test.ts`, `C7.7.test.ts` per PR; a product file only for the gap that PR names.
* **Done when (each):** the pack exits 0 on a fresh checkpoint and still exits 0 on the fixture; the tech lead has approved the pack's changed lines in the PR; no step was dropped (P-330 (7)).
* **Depends on:** C1, A1, A2; C3 for the Validate steps; B2 and B3 before any of them claims Works by screens. **Open Majors before Works claims, each with the row that fixes it:** C7.7: QA-245 and QA-152 (A2), QA-246 (C9), QA-229 (B2), QA-289 (A7), QA-283 (row B117, #1148), QA-153 (qa re-sorts), and QA-235, which has no row yet (IMM 5257 Schedule 1's copy is refused at `api/src/fill-case.ts:44`; stream C's file; ruling R10). C7.6: QA-245 (A2), QA-251 (B2 and B3), QA-229 (B2). C8.1: QA-245 (A2), QA-251 (B2 and B3). C11.6: QA-247 (A1).
* **Gates (each PR):** the tech lead approves the pack's changed lines in the PR; Opus review; qa's gate A; no breaker. A PR carries a `Fixes: QA-…` line only for a bug it fixes itself.

**Row C9 — QA-246: forms that wait on an answer are shown apart from forms to fill.** *Size: small to medium.*
* **Capability:** C7.7 Prepare application list (VV-R07, VV-R09, VV-R10).
* **First red:** C7.7-1 and -2 on the checkpoint: adults are listed 7 forms where the pack expects 3; children with a date of birth 5 where it expects 1, each with "N facts to answer".
* **Cause:** `/prepare` already knows such a form cannot start (`api/src/case-prepare.ts:307`, state `cannot_start`), but lists and counts it among the forms to fill.
* **Change:** the list and its counts give the forms to fill and, apart, the forms not yet known, each naming the question it waits on; nothing that applies is hidden. The answer of `/prepare` changes in stream C's file. If the case page's list needs a line to show the two groups apart, that line is stream B's next small PR (hand-over H7); this row does not touch `web/src/runtime/**`.
* **Files:** `api/src/case-prepare.ts`, one fail-then-pass test under `tests/runtime/`.
* **Acceptance:** `acceptance/C7.7.test.ts` steps -1 and -2 on a fresh checkpoint, against C1's `expectedLines`. **Done when:** on the checkpoint's family case each person's forms to fill and forms not yet known equal `expectedLines` exactly, by form and by count; answering one waiting question Yes moves that form into forms to fill for that person only, and No removes it with its reason; the fixture's pack stays 33/33; journey J-C9; qa's gate A.
* **Depends on:** C1; A2 merged (IMM 5476 no longer waits on an asked answer). **Decisions:** none.
* **Gates:** Opus review; qa's gate A; no breaker. `Fixes: QA-246`.

### G4. Conditional document lines

**Row B1 — C6.4: the Documents panel and the checkpoint's conditional lines** (land #1073). *Size: small to medium (built, approved round 3; its 75 `demo.ts` lines move to a step file).* **Second in stream B, after B2** (the tech lead's ruling 2).
* **Capability:** C6.4 Document checklist per person. **First red:** C6.4-4, then the minor's lines -8 to -9b and -19.
* **Cause:** the checkpoint's release has four document lines, all on every applicant, and none of the conditional ones; the checklist had no screen.
* **Change:** written on #1073 at 5cdff49c3: the Documents panel on the case page (request, upload, Not applicable with a reason, history, "Answer first"), and conditional lines from `samples/conditional-documents.json`. **Left:** start now on its branch; merge `main` after A2 (H1) and after B120 (#1158), when its loader lines become `api/src/features/checkpoint/combination/325-conditional-documents.ts`; diff-only Opus check; gate A.
* **Files:** `web/src/runtime/checklist.tsx` (new), `web/src/runtime/cases.tsx`, `web/src/runtime/questionnaire.tsx`, `api/src/case-checklist.ts`, `engine/runtime/case-checklist.ts`, `samples/conditional-documents.json`, the new step file, `acceptance/C6.4.test.ts`, `acceptance/C6.4-screen.test.ts`, `tests/check_vv_checklist.ts`, `tests/check_stand_ins.ts`.
* **Acceptance:** both C6.4 packs on a fresh checkpoint. **Done when:** step 4 and the screen pack's 31 to 38 pass there; no step goes pass to fail; journey J-B1; gate A. No Works claim in this row.
* **Depends on:** B120 and A2 merged, to merge. **Then for Works:** the minor's lines need a calculated age, which has no route or screen (**row A6 = B102**: concept and challenge, then "a person adds age in whole years on the application date, from the date of birth, by a screen"); qa closes QA-226. **Decisions:** founder Q1: the permanent-residence lines are written in C6.4's CAPABILITIES row today, so leaving them out of Works is the founder's cut, not a technical choice.
* **Gates:** Opus diff-only check of the merge; **a breaker report for the Documents panel, a new screen:** the one on #1073's record if it has one, else a run on the merged head (P-278); qa's gate A. No `Fixes` line: QA-226 is fixed in part here and closes with row A6.

**Row A6 — B102: a person's age in whole years on the application date.** *Size: medium (concept and challenge first; then a route and a screen).* **Built in stream B** (the tech lead's ruling 2); **its concept may start now**, written by stream A's seat while that seat's PRs wait.
* **Capability:** C6.4 Document checklist per person (the minor's lines). **First red:** C6.4-8 to -9b and -19 on the checkpoint after B1.
* **Gap:** the minor's document lines need a calculated age, which has no route and no screen.
* **Change:** per its concept: a person's age in whole years on the application date, worked out from the date of birth, shown on the person and read by the line rules.
* **Files:** named by the concept. Any line it needs in `api/src/runtime.ts` (stream A's file) is taken at hand-over H6.
* **Acceptance:** `acceptance/C6.4.test.ts` on a fresh checkpoint. **Done when:** steps -8 to -9b and -19 pass there and the pack is 30/30 exit 0; the fixture stays 30/30; its journey by screens is written in the concept before the build (P-352) and walked; qa closes QA-226; qa's gate A.
* **Depends on:** B1 merged; its concept approved by the tech lead. **Decisions:** none known; the age rule's cite (canada.ca, page, quote, date) goes in the concept, else Sample.
* **Gates:** concept with a fresh challenge and the tech lead's approval (P-223 (4)); Opus review; **a breaker run (new screen)** (P-278); qa's gate A. `Fixes: QA-226`.

### G5. Filing steps with a route and no screen (QA-229, QA-251)

**Row B2 — Ready to file by screens: review, pass a warning with a reason, Ready to file.** *Size: medium (one panel; concept exists and was challenged).* **First in stream B** (the tech lead's ruling 2: it needs only A1's data, and it gives C8.2 the walk its Works claim waits for).
* **Capabilities:** C7.6 Ready to file; it is also the walk that C8.2's gate A needs.
* **First red:** none in a pack (the routes work); the walk stops: `POST /runtime/filings/:id/review`, `…/warnings/:code/pass` and `…/ready` (`api/src/readiness.ts:161-163`) have no caller in `web/src` (the first three entries of `product/tools/route-has-screen-allow.txt`), and the Prepare panel shows its own pill instead of the server's readiness (QA-229).
* **Change:** the readiness panel per filing from `screens/M3-design-2026-11-04/prepare-tab/concept-draft.md` (challenged; the tech lead approves, P-316 (3)): blocks and warnings listed by who owes them, in the server's words; "Pass with a reason"; the representative's "Review the filing"; "Ready to file".
* **Files:** `web/src/runtime/readiness.tsx` (new), its mount in `web/src/runtime/cases.tsx` or `forms.tsx`, a browser check under `tests/runtime/`; the three allow-list lines go (the tech lead's file).
* **Acceptance:** `acceptance/C7.6.test.ts` stays as it is; the new browser check walks journey J-B2. **Done when:** on the checkpoint a case officer and the representative take one filing from "not ready" to "Ready to file" by screens only, each warning passed with a recorded reason; the screen and `/prepare` say the same state in the same words (QA-229 closed by qa); `route-has-screen.mjs` passes without the three lines; axe clean, no sideways scroll at 1024 px.
* **Depends on:** nothing to start: the three routes are on `main`, so the panel is built on a branch now and does not wait for #1158. A1 merged before the walk can end at a submission record that holds its portal. **Unblocks:** C8.2's Works claim; C7.6's with C4.
* **Gates:** the tech lead approves the challenged concept (P-316 (3)); Opus review; **a breaker run: it is a new screen, and "Review the filing" is for the representative of record only (permissions)** (P-278); qa's gate A. `Fixes: QA-229`. QA-251 closes with B3: two of its four routes get their screen here, the other two there.

**Row B3 — Sign and scan by screens.** *Size: medium.* **Capability:** C8.1. **Gap:** `POST /runtime/items/:id/sign-steps/:key` and `…/signed-scan` (`api/src/sign-steps.ts:159`, `:161`) have no screen (the fourth and fifth entries of the allow-list). **Change:** on a hand-signed item: Print (names the copy), Signed, Upload the scan, then "Uploaded to IRCC" once the filing is Ready. **Files:** `web/src/runtime/sign-steps.tsx` (new), its mount in `web/src/runtime/forms.tsx`, a browser check. **Done when:** journey J-B3 by screens on the checkpoint; the two allow-list lines go; C8.1's pack unchanged. **Depends on:** A2 (the IMM 5476 item exists), B2. **Gates:** Opus review; **a breaker run (new screen, with a file upload)** (P-278); qa's gate A. `Fixes: QA-251` (with B2).

**Row B4 — The answer sheet panel.** *Size: medium.* **Capability:** C7.3. **Gap:** no file in `web/src` shows the sheet or "Entered in the portal". **Change:** the panel from the same prepare-tab concept: sections in the form's order, each answer with its source and a Copy button, the tick with who and when. **Files:** `web/src/runtime/answer-sheet.tsx` (new), its mount, a browser check. **Done when:** journey J-B4 on the checkpoint; C7.3's pack 13/13 there. **Depends on:** C2. **Before "Claims Works: C7.3":** QA-165 closed or fixed by name; QA-153 as qa re-sorts it. **Gates:** Opus review; **a breaker run (new screen)** (P-278); qa's gate A.

### G6. Built, waiting to land or to be scored

**Row Q1 (qa, no build) — Re-score C1.3 and C11.5.** C1.3's pack exits 0 on a fresh checkpoint today (54/54) and on gate B's own run (55/55); CAPABILITIES still says C1.3 "Not built" and C11.5 "Partial". **Done when:** qa's walk by screens of journey J-Q1 on `main` and its verdict; the two rows read together (P-316 (2)). No builder. **Gate:** qa's verdict on `main`, nothing else.

**Row A5 — C3.16: shared field scope and stable list entries** (land #1054). *Size: medium (built; Opus Approve of 608f793af; draft; carries a migration).* **Left, as its builder listed on the PR:** merge `main` once (expected conflict: import lines in `api/src/question-condition.ts`), the second-lander checks, re-run C3.16-7 and the case part on fresh copies, a diff-only Opus check, mark ready, gate A. **Files:** as on #1054 (21 files; `prisma/schema.prisma` and one migration with its own stamp, P-348 (8); `api/src/runtime.ts`; `web/src/runtime/questionnaire.tsx` at hand-over H2). **Done when:** its pack's six part and case part exit 0 on `main`'s data; M2 packs equal to `main`; gate A; a breaker run, since it changes the schema (P-278). **Depends on:** A2 merged (`api/src/runtime.ts`), and B1 merged or no open stream B PR on `web/src/runtime/questionnaire.tsx` (H2). **Shared files it owns for the sprint:** `prisma/schema.prisma` with its migration (H3: no other row opens the schema until this one is merged) and `api/src/main.ts` (H5: no other row edits it). **Decisions:** founder's earlier "keep them" stands. **Gates:** Opus diff-only check; **a breaker run (schema)** (P-278); qa's gate A.

**Row C5 — C6.12 breadth: spouse sponsorship priced from the fee table** (land #1074), then the fees on the case page (**row B5**, `web/src/runtime/`, step -25). **First red:** C6.12-22 ("no fs.spouse entry in samples/fee-table.json"; the combination is released on the checkpoint now, `released: 1`). **Files:** `engine/runtime/filings.ts`, `samples/fee-table.json`, `tests/check_r2_fee_table.ts`. **Done when:** C6.12-22 passes on the checkpoint with each fee on a named filing (the tech lead's ruling 3 on #1074; CAD 1,260 is cited there from canada.ca). **After the founder's answer to Q1:** the sponsorship fee part (#1074, step -22) and -23 are outside the Visitor visa journey, so they leave the sprint and become rows S1 and S2 right after it (section 8). **B5 stays in the sprint:** the fees on the case page are on the Visitor visa journey, and with the pack at 24/24 on the checkpoint it is the one build between C6.12 and a Works claim (ruling R11). **Gates:** Opus review; **a breaker run (money: fee lines and the case total)** (P-278); qa's gate A. B5 is a new panel and takes its own breaker run.

### G7. Not built

* **Row C6 — C7.5 part 2: review runs, the run card, replay.** First red C7.5-5 (`POST /runtime/cases/:id/review-runs/plan` does not exist). New `api/src/review-runs.ts` and the Review page part per `screens/M3-design-2026-11-04/rows.md` (C7.5); then one recorded run of IMM 5257 on the Mac paid runner (founder Q2). Medium, then one paid step. **Schema:** planned on the tables already on `main` (`ReviewFinding`, `FilingReview`); if its builder finds it needs a new one, it takes its turn under H3 and tells the tech lead first. **Paid run (P-295):** usual about US$1.11 (measured on a like job, the IMM 5257 two-round read of 3 Nov: draft US$0.63, checker US$0.49); worst US$3.62 (that job's budget; the new job states its own worst in the ledger and the PR before the Go); job cap US$5 (P-232); one attempt. **Gates:** Opus review; a breaker run for the Review page (new screen); the paid step only on the tech lead's Go inside the founder's (Q2); qa labels the paid-result PR (P-275).
* **Row C7 — C6.5 part 2: document reads, "Confirm & use", checks.** First red C6.5-2; 23 of 32 steps red on both data sets. New `api/src/case-documents.ts` with a migration, then the drawer in `web/src/runtime/` (stream B). Medium plus small to medium; the letter read is one paid step (Q2). **Schema:** its migration starts from `main` only after A5 (#1054) is merged (H3), with its own stamp (P-348 (8)). **Paid run (P-295):** the records this plan read hold no measured cost for a letter read, so its usual and worst cost are **not known yet**. The row's US$0 PR ends with the run card's estimate written as usual and worst in the ledger (`prototype/p2/ledger.ts`) and the PR; no Go is used before that, and its worst must fit what question 2's cap leaves after C7.5's worst (US$1.38), else it is a Go of its own. **Gates:** Opus review; **a breaker run (schema; the drawer is a new screen)** (P-278); qa's gate A; qa labels the paid-result PR (P-275).
* **Row C8 — C10.2: the finished story.** First red C10.2-1 (`POST /demo/checkpoints/finished-story` does not exist). Last by design: it loads what every row above makes. New step files in a folder of their own under `api/src/features/`. Large. **Gates:** Opus review; qa's gate A; a breaker run only if it adds a screen.
* **C6.12-23** (the child's study filing question): no release asks it; with Q1.

---

## 4. Three builder streams with disjoint files (revised after the challenge)

One row per fresh session and per PR (P-278). A stream is a seat: when its PR is labelled, the next row starts in a fresh session. Each stream owns its files for the whole sprint. **No two streams write the same file, except at the named hand-overs below,** each of which is a merge order, not parallel work. Row names are kept from the first version so the comments on PR #1167 still point at the right row; a row's letter no longer says its stream (A4 and A6 are built in stream B).

| | Stream A: the release and the case team | Stream B: screens | Stream C: the filing engine and its packs |
|---|---|---|---|
| **Owns** | `api/src/features/checkpoint/105-*`, `130-release-two.ts` (one edit) · `api/src/checkpoint-stage-one*.ts` · `samples/checkpoint-stage-one.json`, `samples/form-setup.json`, `samples/firms.json` · `api/src/form-setup.ts`, `api/src/runtime.ts`, `api/src/main.ts` (H5) · `engine/runtime/team.ts` · `prisma/schema.prisma` until A5 is merged (H3) · packs C6.11, C6.9, C3.16 · #1054's files · the concept files of A4 and A6 under `product/screens/` | `web/src/runtime/**` · `web/src/components/eligibility-gates-editor.tsx` (new) and its one mount line (H6) · `api/src/eligibility.ts` · `api/src/case-checklist.ts`, `engine/runtime/case-checklist.ts` · `samples/conditional-documents.json` · `api/src/features/checkpoint/combination/325-*` · packs C6.4, C6.4-screen · the browser checks for its panels · the files A6's concept names | `acceptance/lib/m3.ts` · packs C7.3, C7.6, C7.7, C8.1, C9.2, **C11.6** (H4), C7.5, C6.5, C10.2 · `api/src/case-prepare.ts`, `api/src/fill-case.ts`, `api/src/form-parts.ts` · `engine/runtime/prepare.ts`, `answer-sheet.ts`, `readiness.ts`, `filings.ts` · `samples/fee-table.json` · new `api/src/review-runs.ts`, `api/src/case-documents.ts` |
| **Order** | **Hour 0, two sessions side by side:** A1 B104 (#1084) and A2 C6.11 (#1072). **Then one seat, three rows:** A3 release 2's lines (after A1) → A7 QA-289 (after A2) → A5 C3.16 (#1054). **While its PRs wait on CI and gate A:** the concepts of A4 and A6, each with a fresh challenge, for the tech lead's approval | B2 Ready to file by screens → B1 C6.4 (#1073) → A4 gate screen (B106, once its concept is approved) → B5 fees on the case page (moved up after the founder's answer to Q1; ruling R11) → B3 sign and scan → B4 answer sheet → A6 calculated age (B102) | C1 the packs' expected lines → C2 C7.3 (#1075) → C9 QA-246 → C4 pack C8.1 → C3 channel decides "for filing" (founder Q3 is answered) → C4 packs C7.6, C9.2, C11.6, C7.7 → C6 C7.5 part 2 → C7 C6.5 part 2 → C8 C10.2. C5 (the sponsorship fee, #1074) left the sprint with the founder's answer to Q1: row S1 after it |
| **First hour** | #1084 and #1072 each merge `main` on their own branch and re-run their packs. B120 (#1158) is not on `main` yet: when it lands each merges `main` once more and moves its loader line into its step file (`105-stage-one.ts` for A1) | B2: the walk script of journey J-B2 first, then the panel, on a branch from `main`. It needs nothing from #1158 | C1, which is ruled (R1) and needs neither #1158 nor any other row |

**Stream A is no longer six rows in series.** It was A1 → A2 → A3 → A4 → A5 → A6. Now A1 and A2 start together, the two screens (A4, A6) are stream B's, and the seat carries three rows after the start. The cost of the start: one more session for about three hours, about half a percent of the weekly plan (an estimate from 0.9% an hour across five sessions); ruling R8.

**Hand-overs (the only times a file crosses streams, or two rows of one stream must not overlap):**
* **H1 — #1072 (A2) lands before #1073 (B1) and #1075 (C2) merge `main`.** It carries 12 lines in `api/src/case-prepare.ts` (C's) and 1 line in `web/src/runtime/questionnaire.tsx` (B's). All three are already written; B1 and C2 each merge `main` once after it (P-270) and re-run their packs. #1084 (A1) shares no file with #1072 and does not wait for it.
* **H2 — #1054 (A5) lands when stream B has no open PR on `web/src/runtime/questionnaire.tsx`** (5 lines there) and after A2 (`api/src/runtime.ts`).
* **H3 — `prisma/schema.prisma`: one open migration at a time, each with its own stamp (P-348 (8)).** A5 (#1054) holds it first. C7 (C6.5 part 2) starts its migration from `main` only after A5 is merged. C6 (C7.5 part 2) is planned on tables already on `main`; if it needs one, it takes the next turn and tells the tech lead before writing it.
* **H4 — `acceptance/C11.6.test.ts` has one owner: stream C.** A1 and A3 run it and report it step by step; neither edits it. Its move onto release 2's lines is one PR of row C4, after A3 and C3.
* **H5 — `api/src/main.ts`: only A5 (#1054) edits it.** Every new service in this plan (`review-runs.ts`, `case-documents.ts`, any route A4 or A6 adds) registers itself through `api/src/features/<feature>.ts` (`main.ts:220`, P-214), so no other row opens the file.
* **H6 — lines stream B needs in stream A's files:** A4's one mount line in the combination page under `web/src/pages/`, and anything A6's concept names in `api/src/runtime.ts`. B takes them only when stream A has no open PR on that file.
* **H7 — C9 (QA-246) changes `/prepare` in `api/src/case-prepare.ts` (C's).** If the case page's list then needs a line to show the waiting forms apart, that line is stream B's next small PR; C9 does not touch `web/src/runtime/**`.

**Why this order gives the most Works soonest:** A1 and A2 are approved code that moves six packs, and now neither waits for the other. B2 is the one screen that turns a green pack into a walk qa can pass (C8.2 first, later C7.6 and C8.1), and it needs no other row to start. A4 is third in stream B because C6.9's pack is 15/15 as soon as A1 is in, so its screen is the only thing between C6.9 and Works (ruling R9). C1 comes first in stream C because every later checkpoint number is measured through it. The journey order of P-348 (1) is kept inside each stream; only C10.2 and the two paid capabilities are pushed to the end, as P-348 (1) already says for C10.2 and C6.5.

**The qa lane** starts with row Q1 and the re-sort of QA-153, then gate A in arrival order. At about one row per stream every 4 to 6 hours it is not the bottleneck. Two Works claims at once (C6.11 and C8.2) should be told to it an hour ahead, and C1's merge too: eight of the helper's importers are qa's checks.

**Capacity:** three builders, qa and the tech lead at about 0.9% of the weekly plan an hour is about 43% over 48 hours (the founder's "pace to the plan", 6 Nov), plus about half a percent for the extra session at the start. If the 12-hour point shows a stream idle on a hand-over, the tech lead gives its seat the next row of another stream that touches only new files (C6's US$0 part qualifies; B3 and B4 only if no other stream B PR is open on their mount files).

---

## 5. The 12-hour checkpoint (P-359)

With the clock starting when the P-376 changes are on `main` (about 21:30 IST, 6 Nov), hour 12 is about **09:30 IST, 7 Nov**, and hour 48 about 21:30 IST, 8 Nov. Streams A and B build on branches before that; their merges wait for #1158.

**Measured at hour 12, from GitHub and qa's records, not from reports:**

| Number | Read from | This plan expects |
|---|---|---|
| Rows merged | merged PRs naming a row above | 3 to 4: A1, A2, C1, and A3 or B2 |
| Rows in gate A or review | open PRs marked ready | 2 to 3: B2 (a new screen takes a breaker run), C2, A3 |
| Concepts with a challenge, at the tech lead | `product/screens/` on stream A's branches | 2: A4, A6 |
| M3 packs exit 0 on a fresh checkpoint | the nightly or one run of the 16 | 5 whole packs: C1.3, C6.12, C8.2, C6.9, C6.11 (2 today) |
| Capabilities confirmed Works by qa | `qa/CAPABILITIES.md` | 2 to 3: C1.3, C11.5, perhaps C6.11 |
| Founder answers | the tech lead's record | all three given before hour 0 (section 8) |
| Hours from "ready" to merged, per row | `daily-numbers.sh` | under 1 hour approved-to-merged; first review round Approve on 3 of 4 |
| Weekly plan used | the tech lead's check | about 11 to 12% |

**The forecast the tech lead then gives the founder** is the rows-merged rate times the rows left per capability in section 3, not this plan's estimate, and it is set beside this plan's estimate for the founder's answer (question 1 yes: 5, range 4 to 7).

**Trip-wires at hour 12:**
* Fewer than 2 rows merged: the landing of approved PRs is the problem (look at CI, the queue and #1158, not at builders).
* C1 not merged: every later checkpoint number is still clouded by the helper, so it goes first.
* A4's concept not approved: B3 goes ahead of it.

**ETA board for the first Works (P-338), all estimates until measured:** C1.3 and C11.5 about 01:00 IST, 7 Nov (waits on qa's walk only) · C6.11 about 06:00 IST, 7 Nov (was 08:00: A2 now starts at hour 0; still waits on #1158, A2's gate A, QA-283 and A7 for QA-289) · C8.2 about 12:00 IST, 7 Nov (was 16:00: B2 is now first; waits on A1 and B2's breaker run and gate A) · C6.9 about 20:00 IST, 7 Nov (waits on A1, the gate screen's concept, its build in stream B) · C3.16 about 22:00 IST, 7 Nov (waits on A2, the hand-overs H2 and H3, a breaker run) · C6.12 about 02:00 IST, 8 Nov, if B5 is moved up and gate B is ruled for its two packs (R7, R11; waits on B5's breaker run and gate A) · C11.6 about 04:00 IST, 8 Nov (waits on A1, A3, C3, its pack's PR; the founder's answers to questions 1 and 3 are given).

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
* **J-C9 (QA-246).** Case officer opens the family case's Prepare application list before any Yes/No is answered: each adult shows the forms to fill and, apart, the forms not yet known, each naming the question it waits on; the child of 10 the same by age. Answer one waiting question Yes for one adult: that form moves into that person's forms to fill, nobody else's list changes. Answer another No: it leaves the list with its reason. Ends at C7.7's first fill step for that adult.
* **J-A7 (QA-289).** Not walkable on the checkpoint today (no released program asks the representative's telephone), so qa checks it by route on a fixture release that does, and reads the case page there: the representative's telephone shows as a number a person can read. Ends at C6.11's IMM 5476 item for the same case.
* **J-A6 (calculated age).** Written in its concept before the build (P-352); it starts where J-B1 ends and must show a child's lines change when the date of birth crosses 18 on the application date.
* **J-Q1 (C1.3, C11.5).** Case officer opens a worker's case on the employer-specific work permit released on the checkpoint: "Relies on an employer case" is offered with the reason; pick the Sample employer case; the employer's name, address and LMIA or offer number are copied in once and shown as copied (the three facts C1.3's pack checks). On a Visitor visa case the link is "Not offered: the Visitor visa has no employer facts". A client and a configuration role are refused. Ends at the worker case's questionnaire showing the copied facts.

---

## 7. Rulings by the tech lead (P-294)

**Ruled on 6 Nov, about 20:00 IST, after the independent challenge (details of what moved: section 10):**
* **R1. Packs follow the case's own release 2: accepted, with a correction.** Expected lines come from the release's own configuration and the cited rules, exact matches kept, never read back from the product's `/prepare` answer. `acceptance/lib/m3.ts` is imported by 37 files, and row C1's Done when covers every one. QA-153 goes to qa to re-sort. Release 2 itself stays as ruled (P-318 (6), C10.1 row 9 is Works on it).
* **R2. Landing order.** #1084 (A1) and #1072 (A2) run side by side from hour 0; #1072 lands before #1073 and #1075 merge `main` (H1); all four merge after B120 (#1158), each moving its loader lines into its own step file.

**Still needed, each with a recommendation:**
* **R3. `130-release-two.ts` takes one edit from stream A** (row A3), as the hot-file line for that PR. Recommend yes; it answers the B104 lane's open question on #1084.
* **R4. QA-289** (proposed Major on C6.11 and C7.7): rule its severity before A2's Works claim. Recommend Major stands; its fix is row A7.
* **R5. Who finishes the six written PRs:** their paused cloud sessions (they hold the context but may be gone) or fresh sessions with the PR as the brief. Recommend fresh sessions, one row each, started from the PR's own "left" list.
* **R6. C6.4-4:** the pack expects proof of financial support on the principal only (Sample); the checkpoint has it on each applicant. #1073 names step 4; confirm which the checklist IMM 5484 supports when its gate A is read.
* **R7. Gate B and C6.12's two packs (row B103):** until it is built, a PR naming C6.12 runs both packs whole, so C5 stays held as ruled on #1074.
* **R8 (new). One more session for about three hours at hour 0,** so that A1, A2, B2 and C1 all start together. Recommend yes: about half a percent of the weekly plan (estimate). Without it A2's landing starts when A1's session reaches CI, about two hours later.
* **R9 (new). A4 ahead of B3 in stream B.** Recommend yes: after A1, C6.9's pack is 15/15 and the gate screen is the only thing between it and Works; B3 alone frees no Works claim. If A4's concept is not approved when B1 is labelled, B3 goes first.
* **R11 (new, after the founder's answer to Q1). B5 (fees on the case page) moves up to fourth in stream B, and gate B for a PR naming C6.12 runs the Visitor visa pack whole plus the breadth pack's step -25 only.** Recommend yes: C6.12's pack is 24/24 on the checkpoint today, so B5 is the one build before its Works claim; steps -22 and -23 belong to rows S1 and S2 after the sprint. Without the gate B part (it is R7's row B103), B5's PR fails gate B on steps the founder has moved out.
* **R10 (new). QA-235 has no row** (IMM 5257 Schedule 1's copy is refused, `api/src/fill-case.ts:44`). It is an open Major on C7.7. Recommend a small stream C row after C2, with its own fail-then-pass test.

---

## 8. The founder's answers (three questions, asked one at a time by the tech lead; answered about 20:05 IST, 6 Nov)

As reported to this lane by the tech lead. Each answer is given first in the founder's own words, then what it means, then the question as it was asked.

**1. Answer: "Yes, Visitor visa first (Recommended)".** C6.12, C6.4 and C11.6 count Works on the Visitor visa journey. The other parts are not dropped: they become named rows right after the sprint.

| Row after the sprint | Capability | The part, in the CAPABILITIES row's words | Where it stands today |
|---|---|---|---|
| **S1** | C6.12 | "spouse or partner sponsorship is two filings (sponsorship, PR) in one submission group, each with its own application-number box" | Its fee part is written on #1074 (was row C5; step -22, CAD 1,260 cited there from canada.ca); held as ruled on #1074 |
| **S2** | C6.12 | an accompanying child of a student or worker: the case officer's question "will this child study 6 months or more?", yes adds a study permit filing | Step -23; no release on the checkpoint asks the question yet |
| **S3** | C6.4 | "a non-accompanying family member 18+ for permanent residence gets a police certificate line the case officer may waive with a reason" (P-171 (6)) | Not on the Visitor visa release |
| **S4** | C6.4 | "on Provincial nominee, Express Entry the police and medical lines of the principal, spouse or partner and dependents 18+ are required, never waivable, and block Ready to file" (P-172) | Not on the Visitor visa release |
| **S5** | C11.6 | "portal-only forms of the permanent-residence combinations produce a checked answer sheet in portal order" (P-113) | Not on the Visitor visa release |

C6.5's read of a letter by AI was named with these parts when the question was written; it stays in the sprint as row C7, because answer 2 pays for its run. **For qa and the tech lead:** each capability's Works verdict now reads the Visitor visa part of its row, and the pack steps that belong to S1 to S5 are named in the PR that claims Works (for C6.12: -22 and -23; ruling R11). **The forecast in use: 5 confirmed Works in 48 hours, range 4 to 7.**
*As asked:* a cut in what M3 counts: do the parts outside the Visitor visa leave Works for this milestone? Recommended yes. The other answer gave 4 (range 3 to 5), with C6.12, C6.4 and C11.6 out of the sprint. (First asked on 4 Nov in the M3 design.)

**2. Answer: "Yes, cap US$5 (Recommended)".** One Go for the two recorded runs, C7.5's review of IMM 5257 and C6.5's read of the Sample letter of invitation: US$5 in total, after each build is reviewed, not before hour 24, run from a Terminal tab, with the usual and the worst cost in the ledger first (P-295). Both are recorded once and replayed at US$0 afterwards.
* C7.5's run: usual about US$1.11 (measured on a like job on 3 Nov), worst US$3.62 (that job's budget; the new job states its own).
* C6.5's run: usual and worst are not known yet (no like run is in the records this plan read). They are written in the ledger and the PR from the run card's estimate before the Go is used for it. C7.5's worst case leaves US$1.38 of the US$5; if the letter read's stated worst is higher, it goes back to the founder as a Go of its own.
* The tech lead still approves each run inside this Go, worst case first (P-309); no check clicks a priced button.
*As asked:* one Go for two recorded AI runs; without it C7.5-7 to -13 and C6.5-19b and -20 can never go green.

**3. Answer: "Paper with a written reason (Recommended)".** The case officer may switch one person's IMM 5257 to Paper on the case, only with a written accommodation reason; that copy is then for filing and goes through the Validate round trip (row C3). **Sample until the immigration expert confirms** what the account accepts (FQ-2, FQ-3). canada.ca "Apply for a visitor visa" (page date 2026-08-28): "You must apply online."; paper only for a person who cannot apply online. Legal points: Unconfirmed: no counsel.
* **What this unblocks:** row C3, and through it the whole packs of C7.6, C9.2, C7.7 and C11.6 on the checkpoint. Stream C reaches C3 at about hour 12.
*As asked:* where a person meets Adobe Validate on today's release, where IMM 5257 is filed Online. The other choice was to show Validate only on the older release-1 family case, which would have left C7.6's one hard stop unreachable on any case opened today.

---

## 9. What this plan did not check

* **No browser step ran** (the sandbox refuses Chromium), so C6.12-25 and every "by screens" statement is read from files and earlier walks on the PRs, not seen today.
* **#1084, #1072, #1073, #1075, #1054 and #1074 were not re-run;** their numbers are their builders' and cloud qa's, on older `main` heads. Each needs its pack re-run after the merge with B120.
* **Causes are read from the code and two diagnostic runs,** not proven by a fix. The UCI cause in C1 and the size of C4 are the least certain; C4's first red steps must be re-measured after C1, A1 and A2.
* **The forecast is an estimate.** The measured facts are the pack table and the checkpoint dump.
* B120's step numbers (105, 130, 325) are read from #1158's branch at ccb0d98ec; if it changes before merging, the numbers move with it. #1158 was not on `main` when this was revised.
* **The revision of about 20:30 IST re-ran nothing.** It re-read the plan against the tech lead's seven rulings, counted the helper's importers on `main` 50e47a6fd (37: 15, 14, 8), and read the bug rows and the cost lines it now cites. That #1084 and #1072 share no file is the tech lead's check, not this plan's. #1054's file list was not re-read: that only it edits `api/src/main.ts` and that it carries the one open migration are taken from the PR as described.

---

## 10. Changes after the challenge (6 Nov)

An independent Opus challenge of PR #1167 found the plan "sound with changes" and confirmed causes 1, 2, 3 and 5 in the code. The tech lead then gave seven rulings. What moved for each:

| # | The tech lead's ruling | What moved in this plan |
|---|---|---|
| 1 | A1 (#1084) and A2 (#1072) run side by side from hour 0; stream A is not six rows in series | Section 4: stream A opens with two sessions, then carries three rows (A3 → A7 → A5) where it had six. Rows A1 and A2: "Left" and "Depends on" no longer make A2 wait for A1. H1 now says #1084 does not wait for #1072. The cost of the extra session is stated (ruling R8). Section 5: C6.11's ETA moves from about 08:00 to about 06:00 IST, 7 Nov |
| 2 | Stream B: B2 before B1; A4 and A6 (screens) move to stream B; A6's concept may start now | Section 4: stream B's order is B2 → B1 → A4 → B3 → B4 → A6 → B5, and it owns the gate editor's files. The concepts of A4 and A6 are written from hour 0 by stream A's seat. A6 has a full row of its own (it was one sentence inside B1). B2's row: it needs nothing to start. Section 5: C8.2's ETA moves from about 16:00 to about 12:00 IST, 7 Nov; a new line counts the two concepts at hour 12. Proposed on top: A4 ahead of B3 (R9) |
| 3 | R1 accepted with a correction: packs follow release 2, expected lines come from the release's configuration and the cited rules, exact matches kept, never from `/prepare`; the helper has 37 importers; QA-153 goes to qa | Group G3's opening and row C1 are rewritten: `expectedLines(release, people)` from the configuration replaces `linesOf(prepare)`, which is withdrawn; hand-worked constants check it for both data sets; Done when names all 37 importers (15 packs, 14 checks in `tests/`, 8 in `tests/qa/`) and tells qa; size goes from small to medium. Rows C2, C4 and B4: QA-153 is no longer a builder's step. Section 7: R1 and R2 are recorded as ruled |
| 4 | Founder question 1 is a scope cut: give two forecasts. Question 3 blocks C3 and the packs behind it: say so | Sections 1 and 5: two forecasts, 5 (range 4 to 7) with the cut and 4 (range 3 to 5) without. Section 8: question 1 is reworded as a cut and quotes the CAPABILITIES rows; question 3 names what waits on it. Row C3 and row C4 say which packs wait; C4 is re-ordered so C8.1, which does not wait, goes first. Section 5 has a trip-wire for an unanswered question 3 |
| 5 | Gates in every row: breaker for new screens, money, schema; a "Fixes QA-…" line where a capability has an open Major; a row for QA-246; usual and worst cost for C6.5's paid run | Every row has a Gates line. Breaker runs: B2, B3, B4, A4, A6, B5, B1's Documents panel, C6's Review page, C7's drawer (new screens); C5 (money); A5 and C7 (schema). Fixes lines: A1 QA-247 · A2 QA-152, QA-245 · A4 QA-244 · A6 QA-226 · B2 QA-229 · B3 QA-251. **New rows:** A7 (QA-289) and C9 (QA-246), each with a journey in section 6. Row C4 lists every open Major with the row that fixes it; QA-235 has none and is flagged (R10). Costs: C7.5's run has usual and worst from a measured like job; **C6.5's are not known and the plan says so** rather than guess |
| 6 | Shared files: `prisma/schema.prisma`, `acceptance/C11.6.test.ts`, `api/src/main.ts` get one owner each or a stated hand-over | New hand-overs: H3 (the schema: A5 first, then C7; C6 on existing tables), H4 (the C11.6 pack belongs to stream C; A1 and A3 only run it; it is a fifth PR of row C4), H5 (`main.ts`: A5 only; new services register through `api/src/features/`), H6 (stream B's lines in stream A's files), H7 (C9 and the case page). The Owns row of the streams table is updated to match |
| 7 | Reword "all about the checkpoint, not engine code"; B120 (#1158) is not on `main`: A and B build now on branches and merge after it | Section 1: four causes are about the checkpoint and the packs, the fifth is unbuilt screens, and C3 is named as an engine change. Row C3's size line says the same. "First hour" and the Left and Depends lines of A1, A2, B1 and B2: start on a branch now, merge `main` once more after #1158. Section 9 records that #1158 was not on `main` |

**After the founder's answers (about 20:05 IST, 6 Nov):** section 8 now holds the three answers in the founder's words, with rows S1 to S5 for the parts that follow the sprint. Section 1 and section 5 use the forecast for question 1 answered yes (5, range 4 to 7). Row C3 and the four packs behind it are no longer blocked, and the trip-wire for an unanswered question 3 is gone. Row C5 (the sponsorship fee, #1074) left stream C's order and is row S1. B5 (fees on the case page) is proposed fourth in stream B, with gate B ruled for C6.12's two packs, because it is now the one build before C6.12's Works claim (ruling R11).

**Not changed:** the pack results (section 2), the journeys already written (section 6, three added), and every measured number. Nothing was re-run for this revision.
