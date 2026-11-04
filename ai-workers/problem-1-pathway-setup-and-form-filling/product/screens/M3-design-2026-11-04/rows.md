# M3 design: the open rows, ready to build (4 Nov 2026)

**Status:** draft, in progress. Design only: no product code, live AI off, US$0.
**Base:** `main` 9caa043b (4 Nov). #798 (QA-144 slice 1) was read at its head ba0bd37f. It has not merged.

**Read for every row:**
* its row in `product/qa/CAPABILITIES.md` and `qa/BUGS.md`;
* `prototype/studio/acceptance/<id>*.test.ts`, `M3-CONTRACT.md` and `PACK-4-visitor-visa.md`;
* the concepts in `product/screens/M3-*` and `product/screens/C*`;
* `product/tools/m2-hot-files.txt` and `tools/m3-guard.sh`;
* the code on main.

Nothing was run. Every finding comes from reading files.

**Two facts that set the file sorting below.**

1. **What the guard checks.** `tools/m3-guard.sh` matches only files a pull request *modifies or deletes* against the hot list. A **new** file never collides, so a new route file, a new `features/<name>.ts` registration, a new test or a new contract file is M3-only, even under `contracts/`. Modifying any of these is **M2-hot**:
   * `engine/{validate,snapshot,render,library-index,field-map-rounds}.ts`;
   * `api/src/{proposals,review-proposals,studio,demo,demo-reset-to-six,forms-demo,fact-sources,sources,form-library,form-masters,field-map-check,guide-sources}.ts`;
   * `api/src/library-*` and `api/src/field-drafts*`;
   * `contracts/` and `studio/contracts/`.
2. **Who approves the case screens.** The concepts that already exist are M3 case view r5c (`screens/M3-agent-view/`) and Prepare application (`screens/M3-prepare-application/`). Each has a fresh challenge with the verdict "Build after these changes". P-316 (3): "the M3 case screens (Prepare application, the checklist) are approved by the tech lead after an independent design challenge (P-223 (4))". A row whose screen those boards already draw needs **no new concept**. Where a row needs one, it says so.

**Decisions every row assumes:**
* **P-315**: L-SA3 is built now. Express Entry keeps one hard stop (P-172).
* **P-316**:
  * (1) the P-251 hold ends for L-SA6 to L-SA11 and C11;
  * (2) build scope and stable ids as specified, and C1.3 and C11.5 merge;
  * (3) the tech lead approves the case screens.
* **P-317 (3)**: M2 first.
* **P-237, P-238**: only a barcode form's own Validate is a hard stop; the rest are CRITICAL warnings passed with a reason.
* **P-322 and P-323** (4 Nov, as given in this task's brief). Neither is in `DECISIONS.md` on 9caa043b yet; the tech lead records them.
  * P-322: Works counts where a real user meets the capability, and checkpoints are built through the product's own steps.
  * P-323: M3 runs in parallel on cloud and GitHub machines, and M2 keeps priority.

Immigration values below come from canada.ca with the page, quote and date already cited in the repo (the citation's location is named), or are labelled **Sample**.

---

## Rows covered (11)
C6.4 · C6.5 · C6.12 · C7.3 · C7.5 · C7.7 · C11.6 · C1.3+C11.5 (one capability, P-316 (2)) · C3.16 · C10.2

## Waiting for C7.6 (dependencies only): see the end of this file
C7.6 · C8.1 · C8.2 · C9.2

---

## Before any builder starts: gate B and stale records

**Gate B** (P-317 (1), `RULES.md`): CI fails a product PR that names a capability with an open Major or Critical in `qa/BUGS.md`, unless the PR names that bug as the one it fixes. Open Majors on these rows, on 9caa043b:

| Bug | Rows | What | Owner per BUGS.md |
|---|---|---|---|
| QA-153 Gap · Major | C7.3, C7.7, C10.2 | IMM 5707's answer sheet waits for 16 parent facts that no question asks | "no backlog row owns it". P-300 (2) gave it to the forms builder after C11.11 |
| QA-152 Bug · Major | C6.11, C7.7 | IMM 5476's "Name of firm or organization" is asked per applicant under employer words | runtime |
| QA-149 Bug · Major | C6.4 (and the C4.4 renderer) | A question that decides a document line drops out once answered, so nobody can correct it | runtime. CAPABILITIES says fixed (`check_qa_r3_minor_principal.ts`), BUGS still Open: qa retests and closes |
| QA-165 Gap · Major | C7.2, C7.3 | IMM 5257: 6 of 46 mandatory fields empty, 3 Yes/No boxes never written | forms (M2) |

So a C7.3 or C7.7 PR either fixes QA-153 or QA-152 itself and names it, or waits for that fix. The order at the end puts the fixes first.

**Out-of-date records** that the tech lead or qa correct (this PR does not touch them):
* `qa/verdicts/2026-11-04-C6.5.md`, the CAPABILITIES C6.5 note and `BACKLOG.md` line 76 still say C6.5, L-SA7, L-SA9 and L-SA4 are "held by P-251". P-316 (1) and (2) lifted those holds.
* **P-317 (3)** ("no new M3 rows until M2 reaches 55") and the founder's "Yes, start M3" of 4 Nov (P-323) both stand in the records.
  * This file reads them together, as the brief does: **M3-only rows start now; any row needing an M2-hot file waits for M2 at 55.**
  * The tech lead confirms this in the P-323 record.

---

## C6.4: dynamic document checklist per person

**1. Missing now**
* **Works (Visitor visa part, API):** pack `acceptance/C6.4.test.ts` 30/30, `check_c64_storage_api` 48/48, `check_qa_r3_minor_principal.ts` 4/4. Request, upload, Not applicable with a reason and history are all built (`api/src/case-checklist.ts`, `engine/runtime/case-checklist.ts`).
* **Not built:**
  * (a) **the case screen**;
  * (b) P-171 (6) police-certificate waivers;
  * (c) the P-172 Express Entry police and medical block.
* **The 6-month police rule** is engine logic plus a test fixture only. `tests/check_vv_checklist.ts` quotes canada.ca `…/police-certificates/when.html`, read 2026-10-29. The Visitor visa release has no police line, so no real release carries it.
* **(b) and (c) are outside the Visitor visa gate:**
  * `pnp.express_entry` is configuration in the six only (`samples/wave1.json`), with no release, no runtime setup and no fee-table entry;
  * `engine/runtime/case-checklist.ts` header: waivers and the block "are permanent-residence rules, not this combination's";
  * the block belongs in `engine/runtime/readiness.ts` ("Not here yet: … P-172"), which the C7.6 builder is changing now.
* **Concept:**
  * BR-3 and board frame 5 "Documents · per person" in `M3-agent-view/` (29 Oct). They are drawn for a tabbed workspace, while the built case page is stacked panels (`web/src/runtime/cases.tsx`). No waiver is drawn.
  * No file shows the tech-lead-approved checklist design that P-316 (3) called for.
  * **Needs a short concept addendum and an independent challenge** (P-223 (4)). It is not a new screen. See "Screens" at the end.

**2. Done when**
* **(a) Screen, M3, now.** On a Visitor visa case the case officer sees a **Documents** panel, one list per person, each line showing:
  * its state in the team's words (not requested · requested · received · being checked · approved · rejected · not applicable);
  * the reason it is there;
  * Request, Upload (judged by the file itself, 20 MB) and Not applicable with a reason;
  * its history.

  The client sees no staff actions. Checked at 1440, 1024 and 400 px, axe clean. Test: new `acceptance/C6.4-screen.test.ts` C6.4-31 onward (continuing after the pack's 30), plus journey J7 3.1–3.3.
* **(b) Permanent residence, after the Visitor visa gate:**
  * a non-accompanying member 18+ gets a police line the officer may waive with a reason;
  * on Express Entry, the principal's, spouse's and dependents 18+'s police and medical lines cannot be marked Not applicable (409), and a missing one blocks Ready to file (P-172, the one hard stop, P-315 (2)).

  Test: new `acceptance/C6.4-pr.test.ts` with `lib/setup_pnp_ee_m3.ts`, whose release is Sample.

**3. Files**
* **(a), M3-only:**
  * new `web/src/runtime/checklist.tsx`;
  * modify `web/src/runtime/cases.tsx` (one panel);
  * new `acceptance/C6.4-screen.test.ts`;
  * the API is unchanged.
* **(b), M3-only:**
  * `engine/runtime/case-checklist.ts`, `api/src/case-checklist.ts`;
  * `engine/runtime/readiness.ts`, after C7.6 merges;
  * `samples/fee-table.json`.
* **(b), M2-hot:** `api/src/demo.ts`, only if Express Entry must appear in the demo. Avoid it.

**4. Decisions and questions**
* **Decisions:**
  * P-171 (6) (waiver, "where IRCC is silent", Sample);
  * P-172, P-315 (2), P-237, P-238;
  * P-169 (AG-09 owns document storage and status, SI-14);
  * P-230 (8) (no issue-date field yet);
  * P-316 (3), P-223 (4).
* **Q1 (founder). Is (b) part of M3?** *Recommend:* C6.4 scores "Works, Visitor visa part" with (b) named as held (as P-265 did for M2). (b) moves to the permanent-residence breadth row, built after C7.6 on a Sample Express Entry release.
* **Q2 (tech lead). Is the waiver the existing "Not applicable with a reason"?** *Recommend:* yes, with the words "Waived" on police lines, refused on P-172 lines.
* **Q3 (tech lead). The 6-month check needs a certificate issue date** (P-230 (8)). *Recommend:* defer it with (b).

**5. Size and order**
* **Size:** (a) S; (b) M.
* **(a) depends on:**
  * qa closing QA-149 (or the PR names it);
  * the concept addendum and its challenge.
* **(b) depends on:** C7.6 merged and a Sample Express Entry release.
* **Unblocks:** DEMO row 15, C6.5's upload entry point and C7.7's document items.

---

## C6.5: documents read into facts, "Confirm & use"

**1. Missing now**
* **Built (#784):**
  * the passport reader by rules: `engine/runtime/mrz.ts`, with `readPassport`, the P-243 collapse and `compareWithAnswers`;
  * resolver rule R11.
  * Engine steps 7/7; `check_c65_mrz_reader.ts` 36/36.
* **Red: 25 steps**, C6.5-1 to -20 (with 9b, 9c, 18b, 19a, 19b). Not built:
  * the routes `sections/:s/fill-from-documents[/plan]`, `GET proposals`, `documents/:doc/confirm-and-use`, `GET checks`, `checks/:id/resolve`, `answers/…/checked-against-document`, and the case-level `POST /cases/:id/documents` (`M3-CONTRACT.md`);
  * the tables `read_value`, a document review record and the typed-versus-document check.
* **C6.5-1 note:** it is red although the checklist-line upload exists. qa's run list shows only `setup_visitor_visa.ts`, so the builder first checks that `setup_vv_m3.ts` (which creates the document lines) ran.
* **C6.5-19b and -20** need more than a saved run:
  * **no AI-vision reader exists** in the code;
  * `setup_vv_m3.ts` has no letter-of-invitation document type.
* **Not in the pack:** P-243's "staff corrections are counted".
* **Hold:** none. P-316 (1) ends P-251's hold for L-SA7 and L-SA9.
* **Concept:**
  * `M3-agent-view/concept-draft.md` BR-4 to BR-7 covers this. Its BR-6 is still field by field (P-142 D5), which P-242 and P-243 amend.
  * Board frame 3 ("Fill this from documents" drawer) has no Confirm & use and no collapse.
  * `acceptance/journeys/J7…` step 3.4 still says "Accept all".
  * **No new screen**, but frame 3 and J7 3.4 are redrawn for P-242 and P-243 in the same concept addendum as C6.4.

**2. Done when**
* The case officer uploads a Sample passport on a person's line and runs "Fill this from documents".
* Facts are proposed with document, page, reader and confidence.
* One staff-only **Confirm & use** per document writes them and records who and when, and they fill at once.
* Passport number, date of birth and expiry are collapsed only when the MRZ check digits passed; names and anything without a passed check stay expanded (P-243).
* A typed-versus-document difference opens one check, resolved only with a reason, and confirming the section answers 409 while it is open.
* Staff corrections are counted per review mode (collapsed or expanded) and can be read.

Tests:
* `acceptance/C6.5.test.ts` steps 1 to 18b;
* **new** C6.5-21 to -23 (corrections counted per mode; the count readable; a client refused);
* the drawer in a new `acceptance/C6.5-screen.test.ts` using `lib/browser.ts`;
* steps 19a to 20 (the letter read by AI vision) in a separate part 3.

**3. Files: all M3-only, no M2-hot file needed**
* **New:**
  * `api/src/case-documents.ts`, `api/src/features/case-documents.ts`;
  * `studio/contracts/document-reads.ts` (a new file under contracts/ is allowed);
  * a migration adding `read_value`, `document_review` and `answer_check`;
  * `web/src/runtime/documents-drawer.tsx`;
  * `acceptance/C6.5-screen.test.ts`.
* **Modified:**
  * `prisma/schema.prisma`;
  * `api/src/runtime.ts` (answer source `document_read`; Confirm section 409 on an open check);
  * `api/src/case-checklist.ts` (case-level upload);
  * `acceptance/lib/setup_vv_m3.ts`;
  * `web/src/runtime/questionnaire.tsx`: a button hook only. It is the shared C4.4 renderer (QA-149), so keep the change small.
* **Not needed:** `proposals.ts` and `review-proposals.ts` (hot). They are the studio's one door for library items (P-149), and document values stay `read_value` "apart from answers" (BR-4).
* **Avoid:** `studio/contracts/runtime.ts` (hot) and `engine/render.ts` (hot).

**4. Decisions and questions**
* **Decisions:**
  * P-242, P-243 (amend P-142 D5 and P-72);
  * P-133 (Sample documents only until counsel), P-134 ("AI never reads identity documents"; reuse `engine/identity-documents.ts`);
  * P-142 D3, D6, D7;
  * P-256, P-175;
  * P-309 and P-295 (paid runs approved by the tech lead under the cap);
  * P-316.
  * Still held: SA1B-D77 bulk accept, so there is no Confirm & use across documents.
* **Q1 (tech lead). What counts as a correction?** *Recommend:* a staff edit of a proposed value before Confirm & use, plus any later staff change to a value that came from a document, counted by review mode.
* **Q2 (founder). Does Confirm & use write "verified"?** SA1B-D89 and D107 ("staff entries count as verified") are still held, and Confirm section already writes VERIFIED (`runtime.ts`). *Recommend:* Confirm & use writes the same status as Confirm section does today. "Checked against the document" (C6.5-17) stays the separate evidence step. No new SA-01B ruling is needed.
* **Q3 (tech lead). Split off part 3?** *Recommend:* yes. Part 3 is the AI-vision letter reader plus one recorded read (FQ-10), a paid run approved by the tech lead under P-309 with its cost stated first. It comes after part 2.

**5. Size and order**
* **Size:** 2a backend M; 2b drawer S–M; part 3 M plus one paid run.
* **Depends on:**
  * C6.4 (a) (the upload entry point on screen; the API needs nothing);
  * C7.6 for how `open_check` feeds readiness (a warning, P-238).
* **Unblocks:** C4.5's "Fill this from my documents" (P-256) and J7 3.3–3.8.
* **Not needed for C10.2's Visitor visa story.**

---

## C7.3: portal sheet, answers in screen order with copy buttons

**1. Missing now**
* **The API works:**
  * `GET /runtime/items/:id/answer-sheet` and `POST …/screens/:k/entered` (`api/src/case-prepare.ts`, `engine/runtime/answer-sheet.ts`, table `entered_section`);
  * pack `C7.3.test.ts` 13/13.
* **QA-153 (Major, open):** IMM 5707's sheet waits for 16 parent facts that no question asks. The resolver already names parents as relatives (`engine/resolver.ts`, `${subject}/parent_1|2`), but answers are stored per case party and nothing creates a parent. So the fix has two parts:
  * **M2 (forms):** the Visitor visa release asks the parent questions;
  * **M3 (runtime):** answers about a relative are stored and resolved so the sheet's `parent_N` keys fill.
* **No screen:** there is no answer-sheet UI in `web/src`. The hook is `OnlineRow` in `web/src/runtime/forms.tsx`, which has the "Answer sheet only" pill.
  * **Concept exists:** `M3-prepare-application/concept-draft.md` BR-8 ("screens in portal order, answer + copy + source per question, per-screen 'Entered in the portal' tick") and its board `design/draft-prepare-application-v3.html`.
  * **No new concept needed.**
* **Reviewer Minors still open** (`screens/C7.3-rebase/review.md`):
  * n2: a parent's source is looked up by the applicant;
  * n3: the item reads "Every fact it reads is confirmed" while the sheet still waits;
  * m6: ticks returning with a re-applied item are untested;
  * n7: the tick does not re-check active or channel under the lock.
* **Live portal order (W6) is not M3.** P-245 moves the extension to M4. P-152 and BR-8: "until the W6 extension the answer sheet follows the sections of the PDF twin".

**2. Done when**
* On the case page, an Online IMM 5707 opens its answer sheet, sections in PDF-twin order, labelled "PDF twin order (live portal order later)".
* Each answer has a Copy button (copies `copy_text`) and its source.
* "Entered in the portal" ticks with who and when; a later change shows Out of date and only warns (FQ-6).
* After every question on a family case is answered, the parents included, the sheet waits for nothing and IMM 5707 can read Done.
* Axe clean at 1440 and 1024 px.

Tests:
* keep C7.3-1 to -13;
* **add** C7.3-14 ("after fillEverything, IMM 5707's sheet waits for nothing", qa's suggestion in `qa/reports/2026-11-02-vv-m3-round2.md`);
* **add** C7.3-15 (two parents give two entries, each with its own source; n2);
* new browser suite `tests/check_c73_sheet_browser.cjs`.

**3. Files**
* **M3-only:**
  * new `web/src/runtime/answer-sheet.tsx`, `tests/check_c73_sheet_browser.cjs`;
  * modified `web/src/runtime/forms.tsx`, `engine/runtime/answer-sheet.ts` (n2), `api/src/case-prepare.ts` (n3, n7);
  * for relative subjects: `engine/resolver.ts`, `engine/runtime/case.ts`, `api/src/runtime.ts`;
  * `tests/check_vv_prepare_api.ts` (m6).
* **M2-hot, only if QA-153 needs a new placement kind:** `engine/snapshot.ts`, `api/src/studio.ts`, `api/src/fact-sources.ts`, `contracts/released-configuration.v0.schema.json`, `studio/contracts/resolver.ts`. Q2 avoids them.
* **Migration:** none, since `subjectKind` is a string.

**4. Decisions and questions**
* **Decisions:**
  * P-152, P-245 (W6 is M4);
  * P-145, P-168 / FQ-6 ("an entered Online section warns");
  * P-65;
  * P-300 (2) (QA-153 to the forms builder);
  * P-318 (6) (the family form follows the channel).
* **Q1 (tech lead). Who fixes QA-153?** *Recommend:* the M2 forms owner places the parent questions, as P-300 (2) assigned. It is an M2 bug fix, so M2 priority is kept. A small M3 PR then maps relative answers to `parent_N`.
* **Q2 (tech lead). How are parents asked?** *Recommend:* a repeating group "Parents" (`per_row`, at most 2) on each person, with row N read as `parent_N` in the resolver. It reuses a repeat mode that exists and avoids `snapshot.ts` and the release schema.
* **Q3 (founder). Can C7.3 score Works with PDF-twin order?** The row says "the portal's screen order". *Recommend:* yes for M3, with the label shown and live portal order in M4 (P-245).

**5. Size and order**
* **Size:** M overall (screen S–M; QA-153 S on each side).
* **Depends on:**
  * QA-153 (gate B);
  * QA-165 (also names C7.3, M2 forms; the PR names it if it is still open);
  * C10.2's Q1 (whether release 2 has IMM 5707 at all).
* **Unblocks:** C7.7 and C10.2 reaching Done on IMM 5707, and C9.2's entered-section steps.

---

## C7.5: independent AI review of a filled form

**1. Missing now**
* **Part 1 works** (#788): rules cross-checks, with acknowledge, dismiss and waive with a reason.
* **Pack 9/16. Red:** C7.5-5, -6, -6b, -7, -8, -9, -15. That is seven steps; the qa row says "-5 to -9 and -15" and leaves out -6b.
* **Not built (part 2):**
  * `POST /runtime/cases/:id/review-runs/plan` and `…/review-runs` (`M3-CONTRACT.md`);
  * the review prompt, its output schema and its job (nothing named `form-review*` exists in `prototype/p2/prompts`, `p2/jobs` or `p2/runs`);
  * the run card (cost first, Live or Saved, P-227);
  * writing AI findings with agreement, reasons and `replayed` (the columns exist in `schema.prisma`);
  * the full Review page.
* **C7.5-9** needs C7.6 (`case-prepare.ts`: "worked out by C7.6 (not built yet)"). `engine/runtime/readiness.ts` already turns a finding into a warning.
* `api/src/runtime.ts` `review()` still refuses with "not built yet (C7.5)", and `tests/check_c44_part2.ts` checks that refusal, so part 2 keeps or redirects it.
* **Concept:** `M3-agent-view/concept-draft.md` BR-19, §8b and board frame 13. Part 1's `screens/C7.5/challenge.md` puts the Review page (its own route, per filing then person) in part 2. **No new concept needed.**
* **The saved run does not exist, and cannot be made honestly at US$0.**
  * The launcher's `--stub` (`p2/launch.ts`) is free, but only a demonstration.
  * P-227: a result becomes Saved only after the tech lead and qa check a real one.
  * AG-11-70: the Checker "SHALL NOT fabricate".
  * So **one paid live run** (draft round plus checker round) is needed once. After it, every replay is US$0.

**2. Done when**
* The plan shows the live estimate above US$0 and Saved at US$0, with the SI-6 chip.
* The Saved run of IMM 5257 on the pack's fixed values returns at least 2 AI findings, each `replayed`, with quote, field and High or Low agreement. At least one is Low with both reasons, and at least one is not CRITICAL.
* A dismissed AI finding does not come back on the next replay.
* An open finding warns and never blocks.
* The Review page lists findings per filing, then person.
* No new `ai_batch` row.

Tests:
* all 16 steps of `acceptance/C7.5.test.ts` (-9 turns green when C7.6 lands);
* a browser suite `tests/check_c75_review_page_browser.cjs`.

**3. Files** (follow `api/src/pqr-drafts.ts` with `rounds.ts`'s StepRunner)
* **New, M3-only:**
  * `api/src/review-runs.ts`, `api/src/features/review-runs.ts`;
  * `engine/runtime/form-review.ts` (a rules check on AI findings: the quote is found, the field exists);
  * `p2/prompts/form-review.v1.md`, `form-review-check.v1.md`, `form-review-output.v1.schema.json`;
  * `p2/jobs/studio-form-review-imm-5257-….json`;
  * `web/src/runtime/review.tsx`;
  * a new contract file `studio/contracts/review-runs.ts`.
* **Modified, M3-only:**
  * `api/src/findings.ts`, `api/src/runtime.ts`;
  * `web/src/runtime/findings.tsx`, `web/src/runtime/cases.tsx`;
  * `acceptance/C7.5.test.ts`.
* **M2-hot, avoid:** editing `studio/contracts/findings.ts`. Import `aiLive` from `sources.ts` without editing it.
* **Migration:** one additive `review_run` table (forms, subject, mode, cost, run file), plus a unique index on the AI fingerprint so a dismissed finding does not return. Today's partial index covers only rules findings.

**4. Decisions and questions**
* **Decisions:** P-141, P-164 (2), P-121, P-110, P-227, P-309 (the tech lead approves paid runs; `RULES.md` line 38), P-295 (one attempt), P-232 (US$5 job cap), P-168, P-71.
* **Cost of the one run:** P-164 and FQ-10 say about US$1. Measured on a similar job, the IMM 5257 two-round read on 3 Nov:
  * draft US$0.63 + checker US$0.49 ≈ US$1.11;
  * run files `p2/runs/studio-masters-form-imm-5257-09-2023-4abab0ac-live-20261103t150331838z-254739.json` and the matching `…-check-…` file;
  * that job's budget was US$3.62.
  * The job states its own worst case (P-295).
* **Q1 (tech lead). The single run may find nothing.** Steps -8, -12 and -13 need at least 2 findings, a Low and a non-CRITICAL. *Recommend:* plant 2–3 known inconsistencies in the pack's fixed case before recording, and say so in the job. If the one attempt still has no Low, change -8 rather than re-run (P-295).
* **Q2 (tech lead). Review page now, or a panel?** *Recommend:* the page, in part 2, as the challenge proposes and P-141 ("full pages") asks.
* **Q3 (founder). Which forms get a recorded run?** BR-19 names IMM 5257, 5707 and 5476. *Recommend:* IMM 5257 only now, as the pack does. The others later, one paid run each.

**5. Size and order**
* **Size:** L, in two PRs:
  * PR 1: code, prompt, job, a stub pass and the page. US$0, size M.
  * PR 2: the paid result, qa-labelled per P-275. Size S.
* **Depends on:** C7.6 (for -9). The paid run is on the tech lead's approval under the paid lane, which this design spends nothing on.
* **Unblocks:** C7.5 Works and the representative's review step in C8.2's story.

---

<!-- ROWS -->

## C1.3 + C11.5: the employer pre-fill (one capability, P-316 (2))

P-316 (2): "C1.3 and C11.5, the same employer pre-fill, merge into one capability (qa merges the rows)". `CAPABILITIES.md` still has two rows (lines 9 and 91). qa should merge them before a builder takes this.

**1. Missing now**
* **Built** (C11.5 part 1, reviewed in `screens/M3-A2-c115/review.md`, journey score 8.5):
  * the offer rule `engine/runtime/employer.ts`, shown in Open a case and on the case header (`api/src/runtime.ts`, `web/src/runtime/employer.tsx`);
  * `tests/runtime/check_c115_employer.ts` 20/20 and `…_browser.cjs` 9/9.
* **Not built:**
  * picking the employer;
  * the employer's facts shown read-only, marked "Employer case";
  * the pre-fill itself;
  * unlink with a reason;
  * Out of date when the employer's fact changes;
  * the SI-10 Stand-in chip.
* **Concept: already drawn, no new screen.** BR-13 in `M3-agent-view/concept-draft.md` §3. Board frame 10, `M3-agent-view/design/draft-agent-view.html` (about lines 444–452): read-only facts, "Change it there", unlink with a reason, then Missing.
* **Something to show it on.** The released work-permit fixture `wp.family` (from `prototype/p3/releases/c1-v3/configuration.json`) has IMM 1295 boxes for `organisation.name` and `organisation.address` owned by the filing (`person: "none"`). So "Offered" can be shown today.
* **Nothing to link to.** No Corporate combination is released:
  * `lm.high_wage` has `"sources": []`;
  * P-239: "The POC builds no Corporate configuration"; the Sample employer combination is M4, L-SA5.
* **Bug found while reading** (to log as a qa finding):
  * `employerFacts()` counts *every* mapped `organisation.*` entry.
  * In c1-v3, IMM 5476 and 5475 map `organisation.name` with `person: "representative"`. That is the representative's firm, not the employer (verified by reading the configuration).
  * A pre-fill would put the employer's name in the representative's boxes. A Visitor visa with IMM 5476 may also be wrongly "Offered".
  * Fix inside this row: count and fill only entries whose box owner is the filing.
* **Acceptance test:** none (no `acceptance/C1.3*` or `C11.5*` file). `PACK-4-visitor-visa.md` names it "breadth, after Visitor visa".

**2. Done when**
On the released work-permit fixture, the case officer links the case to a Sample employer:
* IMM 1295's employer name and address show read-only, "Employer case · Sample", and no client question asks them;
* IMM 5476's representative boxes are never filled from the employer;
* saving an `organisation.*` fact on a linked case is refused (409, in words);
* changing the employer's fact marks the worker's finished items Out of date, naming the fact;
* unlinking without a reason is refused (400 on `reason`); with a reason the facts show Missing;
* a Visitor visa or Corporate case is never offered the link, and the client gets 403;
* the SI-10 Stand-in chip is shown.

Test: a new `acceptance/C11.5.test.ts` (the merged id), steps C11.5-1 to -9, one per clause above. Also a new fail case in `tests/runtime/check_c115_employer.ts` from c1-v3's IMM 5476 entry.

**3. Files: all M3-only**
* **New:**
  * `api/src/case-employer.ts`, with routes `GET /runtime/employers`, `PUT /runtime/cases/:id/employer-link {employer, version}` and `DELETE …/employer-link {reason, version}`;
  * `api/src/features/case-employer.ts`;
  * `acceptance/C11.5.test.ts`.
* **Modified:**
  * `prisma/schema.prisma` and a migration: one additive table, `case_employer_link` (linked by and at; unlinked by, at and reason; never deleted);
  * `engine/runtime/employer.ts` (the box-owner filter);
  * `engine/runtime/case.ts` (`knownOf` brings in the employer's values, as `hasChildrenOf` does for derived values);
  * `api/src/runtime.ts` (refuse the save);
  * `web/src/runtime/employer.tsx`.
* **Not needed:** `contracts/resolver.ts` (hot). R5's prefix rule already reads `organisation.*` as organisation scope.
* **The employer record** is a `Party` with kind ORGANISATION (the column exists) plus an `AnswerSubject` with subjectKind `organisation`. That is P-106's "employer as a client record". It is seeded by the test through the new staff route. Demo seeding would need `demo.ts` (hot), so C10.2 or after.

**4. Decisions and questions**
* **Decisions:**
  * P-106 (links stay out of configuration);
  * P-239 (amends P-178; the Sample employer combination is M4);
  * P-316 (2);
  * P-135 ("the employer's LMIA or offer is a linked employer case");
  * P-165 (Stand-in chip; SI-10).
* **Q1 (conflict, founder). M3 or M4?** P-239 puts "the employer–employee link and a shareable mark" in M4 (L-SA5). The row is M3, and P-316 is silent on timing. *Recommend:* M3 links to a **Sample employer record**. M4's L-SA5 adds the Corporate combination and case, and replaces the record.
* **Q2. The shareable mark.** SA-1B-130 rule 3 says an organisation fact is "never in a worker's file unless ExpatReady marks the field shareable" (SA-1B-284), and the mark is part of L-SA5. *Recommend:* treat only c1-v3's employer name and address as shareable. Keep them as a constant list in the new file, labelled Sample. The library mark comes with L-SA5.
* **Q3 (tech lead).** BR-13 says "picks a Corporate case". *Recommend:* reword it to "picks an employer (Sample)" until L-SA5.

**5. Size and order**
* **Size:** M.
* **Depends on:**
  * Q1;
  * qa merging the two rows;
  * C9.2's Out of date mechanism, already built in R1d (it does not need C9.2's own Ready-to-file step).
* **Not needed for the Visitor visa story.**
* **Unblocks:** C9.2's employer breadth step and SI-10's update in M4.

---

## C3.16: shared field scope and stable list-entry ids (L-SA4)

**1. Missing now**
* **Exists:**
  * the vocabulary only: `studio/contracts/resolver.ts:83-101`, with `SCOPES`, `BUILT_SCOPES = ["person", "filing"]` and `HELD_SCOPES` ("Held (P-251)");
  * scope decided by the fact key's prefix (R5, `engine/resolver.ts` `scopeOf`); nothing is household-scoped;
  * the stored enum `FieldScope {CLIENT_LEVEL, CASE_LEVEL}` (`schema.prisma:44`), set by prefix in `engine/import.ts` and in `api/src/proposals.ts` (hot);
  * the library shows only "once per case" or "about a person" (`web/src/pages/library.tsx`);
  * the release snapshot already carries `scope` (`engine/snapshot.ts`);
  * `ClientFactRecord.rowKey` is already a "stable row identity across versions".
* **Not built:**
  * Household and Organisation as stored scopes;
  * a Household subject on a case;
  * one answer per household or organisation;
  * the library's choice of the four scopes;
  * refusing a scope change on a published field.
* **Hold:** lifted by P-316 (2), "Build as specified". `BACKLOG.md` line 76 and the code comment still say held; the tech lead updates both.
* **Concept:** none. A **short concept** is needed: the library's scope choice and the household subject. It is not a new case screen. It is written next to this file (see "Screens" at the end).
* **Acceptance test:** none.

**2. Done when**
These follow L-SA4 (`BACKLOG.md` L-SA4) and SA-1B-130 and SA-1B-134, in a new `acceptance/C3.16.test.ts`:
* C3.16-1: the four scopes are shown and set in the library.
* C3.16-2: changing the scope of a published field is refused: "A published field's scope cannot change. Create a new field."
* C3.16-3: a Household fact (Sample: the date of marriage) is asked once on a two-adult case and is read-only for the other adult.
* C3.16-4: a Filing fact is asked again on a second filing.
* C3.16-5: an Organisation fact resolves from the organisation subject, never from a person.
* C3.16-6: a list entry keeps its id across a correction and a removal.

**3. Files: split in two**
* **C3.16a, runtime resolution (M3-only):**
  * a migration with `ALTER TYPE "FieldScope" ADD VALUE 'HOUSEHOLD'`, `'ORGANISATION'` and a backfill of `organisation.%`. CLIENT_LEVEL and CASE_LEVEL are kept for Person and Filing: renaming them would break `proposals.ts` (hot) and the raw SQL in M2's `acceptance/C3.13` and `C3.15`;
  * `engine/resolver.ts` reads the pinned snapshot's scope, falling back to the prefix;
  * `engine/runtime/case.ts`, `api/src/case-checklist.ts`;
  * `api/src/runtime.ts` (a household `AnswerSubject`; `subjectKind` is a plain string, so no column change);
  * new `acceptance/C3.16.test.ts` with steps -3 to -6.
* **C3.16b, library choice and refusal (M2-hot; waits for M2 at 55 or a hot-file approval):**
  * `contracts/resolver.ts` (`BUILT_SCOPES`, asserted by `tests/check_sh3_resolver.ts`);
  * `api/src/library-changes.ts` (the published-field refusal);
  * `api/src/proposals.ts` (the default scope);
  * `engine/render.ts` (Preview);
  * `web/src/pages/library.tsx` is not on the list, but M2's C3.15 is changing it now, so treat it as hot.

**4. Decisions and questions**
* **Decisions:** P-239, P-316 (2) (supersedes P-251's hold for this row), SH4 (pin per filing, P-246 (2)).
* **Q1. Filing scope needs filing ids.** Today `FILING = "case"` ("No question takes a filing id yet"); per-filing ids are SH4. *Recommend:* C3.16a proves -4 across two cases and names the gap. True once-per-filing lands with SH4.
* **Q2. SA-1B-134 rules 2–4** (identity fields, entries supplied by a document). *Recommend:* out of C3.16. It proves rules 1 and 5 on the existing `rowKey`. The rest goes with C6.5's follow-up, where documents supply entries.
* **Q3 (tech lead). Lane.** The row is in forms, but part a is runtime code. *Recommend:* runtime takes C3.16a; forms takes C3.16b after M2 at 55.

**5. Size and order**
* **Size:** L overall (a: M; b: S–M).
* **Depends on:** M2 at 55 (for b); SH4 (true per-filing scope).
* **Not needed for the Visitor visa story.**
* **Unblocks:** the employer pre-fill moving from the prefix to the stored scope, and L-SA5 (M4).

---

## C10.2: the founder loads the finished story

**1. Missing now**
* **qa:** Not built, with no evidence.
* **Acceptance test:** `acceptance/C10.2.test.ts`, steps -1 to -11, all red. No `checkpoints` route exists, so -1 gets 404 where it expects 403.
* **Concept:** none. The spec is `DEMO.md` "Checkpoints" 3 and rows 13–16 and 18:
  * row 13 is parked (P-102);
  * row 18 (combination B reusing A's facts) is breadth, after Visitor visa.
* **New screen:** no. It is one Demo menu item and a result dialog, the same pattern as the configured checkpoint (`web/src/App.tsx`).
* **Where it goes:**
  * The configured checkpoint lives in `api/src/demo.ts` (`loadConfigured`, hot).
  * A new checkpoint can be a new controller under `api/demo/...`, registered by a new `api/src/features/<name>.ts`. Two precedents do this already: `demo-reset-to-six.ts` with `features/demo-reset-to-six.ts`, and `forms.ts` `demo/forms-story`.
  * `Demo.load(actor, {sample: "configured"})` is public, so the new service calls it without editing `demo.ts`.
* **What #798 adds (not merged; to reuse, not redo):**
  * in `demo.ts`: Visitor visa form rules and the family form by channel;
  * new `api/src/form-part-placements.ts`;
  * Visitor visa reaching release 1 through product steps; IRM 0002's field map is the last block and needs a paid run (P-318 (6)).
  * It adds **no case**: C10.1 part B (rows 9, 11 and 12: release 2, the thin case and its IMM 5257 copies) still owns that.
* **Pack bug:**
  * In -4, the thin case of C10.1 row 11 is also four people, so `find(people === 4)` can pick it.
  * Fix: pick the family case by its release-2 pin.

**2. Done when**
On a fresh isolated copy, only the author can start Demo › Load the finished story (a case officer gets 403; the author gets a job, 202). The job:
* runs the configured checkpoint;
* then, through the screens' own services and as the person who holds each duty, takes the family-of-four Visitor visa case on release 2 to Ready to file on every filing, in one group:
  * Online sections entered;
  * IMM 5257 validated and read back;
  * IMM 5476's signed scan in;
  * the checklist per person, with some lines received;
* leaves the thin case on release 1.

It costs US$0. Loading twice keeps two Visitor visa cases. Reset leaves no cases.

Test: `C10.2.test.ts` -1 to -11, changed as follows:
* fix -4;
* -3 reads the new status route (Q3);
* -6 if release 2's channels change (Q1);
* **new -12** (P-322): every release went through submit, sign-off and approval by someone other than the author, and no case data was written straight to the database;
* **new -13**: each step not done says why, in words, as C10.1 does.

**3. Files**
* **New (M3-only):**
  * `api/src/demo-finished-story.ts` (service, controller and in-process job; status from audit events, so no migration);
  * `api/src/features/demo-finished-story.ts`;
  * `tests/check_c10_2_finished_story.ts`.
* **Modified:**
  * `acceptance/C10.2.test.ts`;
  * `web/src/App.tsx`: one menu line. It is not on the hot list, but M2 changed it on 3 Nov, so keep the change to one line.
* **Avoid:** `api/src/demo.ts` (hot), which would only be needed if `/demo/status` must carry `checkpoint` (Q3).
* **Called, not edited:**
  * `Studio` (hot file, calls only);
  * `runtime.ts`, `fill-case.ts` (validated upload), `sign-steps.ts`, `case-prepare.ts` (entered), the case checklist, `firms.ts`;
  * C7.6's new readiness routes.
* **Step order to copy:** `acceptance/lib/m3.ts`, `validateRoundTrip`, `signByHand`, `readyToFile`.

**4. Decisions and questions**
* **Decisions:**
  * P-108, amended by P-226 (saved AI results survive every reset);
  * P-322 (built by the product's own steps; qa's verdict `qa/verdicts/2026-11-04-checkpoint-built-by-product-steps.md`);
  * P-67 (a case stays on its release);
  * P-237, P-238, P-315;
  * P-143, P-144;
  * P-318 (6): "the family form follows the channel (online IMM 5645, paper IMM 5707)";
  * P-102 (row 13 parked);
  * P-93, the "one story, loadable finished" rule, is cited only in DEMO.md, not in DECISIONS.md.
* **Q1 (conflict, founder). Release 2's channels.**
  * The pack (-6) and FQ-2 say: IMM 5257 PDF upload, validated; IMM 5707 Online; IMM 5476 signed scan.
  * DEMO.md row 9 and #798's C10.1 part B say: IMM 5257 Online, so IMM 5645 is the family form and there is no IMM 5707.
  * *Recommend:* one release 2 for both rows, with the pack's channels. They show the barcode round trip that every M3 pack uses. DEMO.md row 9 and C10.1 part B change to match.
  * Either way QA-153 must close first (see C7.3), or the Online item never becomes ready.
* **Q2. Validated copies without Acrobat.**
  * Today only the test-only `tests/runtime/validated.ts` (`tools/simulate_validate.py`) makes them.
  * *Recommend:* a demo step labelled Sample, refused outside the demo workspace, that uploads through the product's own read-back route. This is the one shortcut the P-322 verdict allows.
* **Q3 (tech lead). Status route.**
  * *Recommend:* `GET /api/demo/checkpoints/finished-story` in the new file, with -3 changed in the same PR (`acceptance/README.md` rule).
  * Add `checkpoint` to `/demo/status` only once `demo.ts` leaves the hot list.

**5. Size and order**
* **Size:** L, in slices:
  * a: the API job and the pack, M;
  * b: the Demo menu item and a walk, S;
  * c: row 18 on With an LMIA, M, after QA-144 slice 2.
* **Depends on:**
  * C7.6 (review, pass-warning and ready routes);
  * C10.1 part B (M2, `demo.ts`);
  * #798 and IRM 0002's saved map (a paid run, up to about US$4.42 by its estimate);
  * C8.1 signed scans, C6.11, C6.1;
  * QA-153;
  * hard on C6.12, C11.6, C7.7, C7.3 and C6.4; soft on C7.5 (rule findings acknowledged).
* **Not needed:** C6.5, C1.3/C11.5, C3.16.
* **Place:** last. It is the M3 gate (DEMO.md checkpoint 3).

---

## Waiting for C7.6 ("Ready to file", L-SA3): dependencies only

| Row | Waits for | Acceptance steps waiting | It blocks | Can any part go before C7.6? |
|---|---|---|---|---|
| **C7.6** (builder now) | Nothing. P-315 lifted the hold, and part 1 (the rules) merged at c5240a3b | `C7.6.test.ts` -1 to -21. Under P-237/P-238, -2, -3 and -4 (facts), -7 (signature), -8 (review) and -20 (accepted-until) become CRITICAL warnings passed with a reason. Only -6 (a barcode form with no validated copy, P-144) stays a hard block | C8.1-13, C8.2 from -2, C9.2-5, C10.2-5 and -6, C7.5's acknowledgement before ready | — |
| **C8.1** | C7.6's Ready to file (`sign-steps.ts` already gates "Uploaded to IRCC" on `ready_to_file`) | -13 only (13/14 today) | C8.2 (the pack's table), C10.2 row 14 at Works | Nothing to build. It should go green with no code once C7.6 lands |
| **C8.2** | C7.6 (`readyToFile` in -2), then C8.1 | -2 to -12 (0/12 today; -1, "409 while not ready", may already pass) | C9.2's "submitted" part, C10.2 if the story goes to submitted | Yes: the Record-the-submission route, its field checks (-3, -4, -5, -10), the read-only lock and the correction history, tested against a fixture filing in `ready_to_file` |
| **C9.2** | Only -5 needs C7.6; "submitted" items need C8.2's record. The pack's "blocks" wording becomes a CRITICAL warning (P-237), as L-SA3's done-when says | -1 to -11 | Nothing directly; counts toward the M3 gate | Yes: everything except -5 uses built routes (validated copy, signed scan, entered sections, change of representative) |

<!-- ORDER -->
