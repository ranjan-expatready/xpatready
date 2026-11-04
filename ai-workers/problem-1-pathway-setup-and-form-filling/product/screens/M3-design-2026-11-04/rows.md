# M3 design: the open rows, ready to build (4 Nov 2026)

**Status:** all 11 rows are written, five parts each, plus the dependencies of the 4 rows that wait for C7.6. All four concept drafts had a fresh challenge and are revised (r2) to answer every Blocker and Major. Waiting for the tech lead's approval and the Opus review of the records (P-303). Design only: no product code, live AI off, US$0.
**Base:** `main` 9caa043b (4 Nov). #798 (QA-144 slice 1) was read at its head ba0bd37f. It has not merged.

**Read for every row:**
* its row in `product/qa/CAPABILITIES.md` and `qa/BUGS.md`;
* `prototype/studio/acceptance/<id>*.test.ts`, `M3-CONTRACT.md` and `PACK-4-visitor-visa.md`;
* the concepts in `product/screens/M3-*` and `product/screens/C*`;
* `product/tools/m2-hot-files.txt` and `tools/m3-guard.sh`;
* the code on main.

Nothing was run. Every finding comes from reading files.

**Two facts that set the file sorting below.**

1. **What the guard checks.** `tools/m3-guard.sh` matches only files a pull request *modifies or deletes* against the hot list. A **new** file never collides, so a new route file, a new `features/<name>.ts` registration or a new test is M3-only.
   * A new file *under* `contracts/` or `studio/contracts/` passes once. Every later edit to it then matches the hot prefix and needs the tech lead's approval line (fee-table challenge m4).
   * So M3 types live next to their code (`api/src/<file>.ts`, `engine/runtime/`), not in a new contracts file. The tech lead may instead exempt M3-owned contract files in the hot list.

   Modifying any of these is **M2-hot**:
   * `engine/{validate,snapshot,render,library-index,field-map-rounds}.ts`;
   * `api/src/{proposals,review-proposals,studio,demo,demo-reset-to-six,forms-demo,fact-sources,sources,form-library,form-masters,field-map-check,guide-sources}.ts`;
   * `api/src/library-*` and `api/src/field-drafts*`;
   * `contracts/` and `studio/contracts/`.
2. **Who approves the case screens.** The concepts that already exist are M3 case view r5c (`screens/M3-agent-view/`) and Prepare application (`screens/M3-prepare-application/`). Each has a fresh challenge with the verdict "Build after these changes". P-316 (3): "the M3 case screens (Prepare application, the checklist) are approved by the tech lead after an independent design challenge (P-223 (4))". A row whose screen those boards already draw needs **no new concept**. Where a row needs one, it says so.

**Every new table cascades** (records review m11): `read_value`, `document_review`, `answer_check`, `review_run`, `case_employer_link`, `case_household` and `fee_table` each take `ON DELETE CASCADE` to `runtime_case`, `party` or `library_change`, as `review_finding` and `sign_step` do. Reset's deletes live in `demo.ts` (hot), so without the cascade Reset fails and only a hot edit fixes it.

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

**Gate B** (P-317 (1); `prototype/studio/tools/gate-b.mjs`, read 4 Nov) checks `qa/BUGS.md` only for a capability on a **"Claims Works: C<n.n>"** line ("incremental work is not stopped by the row's bugs", the tech lead, 4 Nov).
* Such a PR fails while that capability has an open Blocker, Critical or Major, unless its body has a strict `Fixes: QA-nnn` line.
* Every named capability's pack also runs.
* So an ordinary slice PR is not stopped by these bugs; **the PR that claims Works is.**

Open Majors on these rows, on 9caa043b:

| Bug | Rows | What | Owner per BUGS.md |
|---|---|---|---|
| QA-153 Gap · Major | C7.3, C7.7, C10.2 | IMM 5707's answer sheet waits for 16 parent facts that no question asks | "no backlog row owns it". P-300 (2) gave it to the forms builder after C11.11 |
| QA-152 Bug · Major | C6.11, C7.7 | IMM 5476's "Name of firm or organization" is asked per applicant under employer words | runtime |
| QA-149 Bug · Major | C6.4 (and the C4.4 renderer) | A question that decides a document line drops out once answered, so nobody can correct it | runtime. CAPABILITIES says fixed (`tests/qa/check_qa_vv_1102_decider.ts` 5/5), BUGS still Open: qa retests and closes |
| QA-165 Gap · Major | C7.2, C7.3 | IMM 5257: 6 of 46 mandatory fields empty, 3 Yes/No boxes never written | forms (M2) |

So slice PRs on C6.4, C7.3 and C7.7 can merge now. **The PR that claims Works** on C6.4 needs QA-149 closed; on C7.7 it needs QA-152 and QA-153; on C7.3, QA-153 and QA-165. Otherwise it fixes the bug itself on a `Fixes:` line. The order table has a "Before Claims Works" column.

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

  The panel also shows "May be needed: answer … first" lines and kept lines.
  The panel is **staff only**: the client's checklist read, Request and Not applicable answer 403, while the client's own upload stays allowed (documents challenge M4, M5). Checked at 1440, 1024 and 400 px, axe clean. Test: new `acceptance/C6.4-screen.test.ts` C6.4-31 onward (continuing after the pack's 30), plus journey J7 3.1–3.3.
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
  * for the PR that claims Works: qa closing QA-149, or a `Fixes: QA-149` line (gate B);
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
* **new** C6.5-21 to -23 in `acceptance/C6.5-screen.test.ts` (corrections counted per mode; the count readable through the new `GET /runtime/cases/:id/document-reviews/counts`; a client refused);
* the drawer in a new `acceptance/C6.5-screen.test.ts` using `lib/browser.ts`;
* steps 19a to 20 (the letter read by AI vision) in a separate part 3.

**3. Files: all M3-only, no M2-hot file needed**
* **New:**
  * `api/src/case-documents.ts`, `api/src/features/case-documents.ts`;
  * the types exported from `api/src/case-documents.ts` (not a new `studio/contracts/` file: later edits there would be hot);
  * a migration adding `read_value`, `document_review` and `answer_check`;
  * `web/src/runtime/documents-drawer.tsx`;
  * `acceptance/C6.5-screen.test.ts`.
* **New (documents challenge M7):** a staff-only `GET /runtime/documents/:id/file`, so the officer can see the passport while checking names, and a staff-only `GET /runtime/cases/:id/document-reviews/counts` (P-243's rate).
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
* **Q2 (founder). What status does a corrected value get?** SA1B-D89 and D107 ("staff entries count as verified") are still held. *Recommend* (documents challenge M3):
  * an unchanged document value is written VERIFIED, as C6.5-11 needs;
  * a value the officer corrected before Confirm & use is written like the officer's own typing today, so it waits for Confirm section;
  * "Checked against the document" (C6.5-17) records its own `checked_against` evidence.

  This leaves D107 undecided.
* **Also from the challenge (documents B1):** Confirm & use is never disabled by a difference. It writes the values that agree or are new, and opens one check per difference, keeping the typed value (pack C6.5-10, -12).
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
* On the case page, an Online form opens its answer sheet, sections in PDF-twin order, labelled "PDF twin order (live portal order later)". The form is **IMM 5257 Online** on release 2 (C10.2 Q1). The pack's existing IMM 5707 Online steps run on `setup_vv_m3.ts`'s Sample release, against P-318 (6) (Q4).
* Each answer has a Copy button (copies `copy_text`) and its source.
* "Entered in the portal" ticks with who and when; a later change shows Out of date and only warns (FQ-6).
* After every question on a family case is answered, the parents included, the sheet waits for nothing and the Online form can read Done.
* Axe clean at 1440 and 1024 px.

Tests:
* keep C7.3-1 to -13;
* **add** C7.3-14 ("after fillEverything, the Online form's sheet waits for nothing", qa's suggestion in `qa/reports/2026-11-02-vv-m3-round2.md`, on IMM 5707 as qa wrote it and on IMM 5257 Online);
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
* **Q4 (tech lead, P-322). Which release does C7.3 count Works on?** `setup_vv_m3.ts`, which every M3 pack uses, releases IMM 5707 Online. That goes against P-318 (6), and the setup is not C7.3's own fixture. *Recommend:* add IMM 5257 Online steps on release 2 (C10.2 Q1) and count Works there. Then change `setup_vv_m3.ts` to P-318 (6) in one runtime PR, with the packs that read IMM 5707 Online changed and named in it.

**5. Size and order**
* **Size:** M overall (screen S–M; QA-153 S on each side).
* **Depends on:**
  * QA-153 and QA-165, for the PR that claims Works (gate B);
  * C10.2 Q1 and C7.3 Q4 (which Online form, on which release).
* **Unblocks:** C7.7 and C10.2 reaching Done on the Online form, and C9.2's entered-section steps.

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
  * the types exported from `api/src/review-runs.ts` (not a new `studio/contracts/` file).
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

## C7.7: Prepare application, the two-stage deliverables list (the case tab)

**1. Missing now**
* **API: works.**
  * Part 1 (#357) and part 2 (#709, Paper lines: barcode page, validate · print · sign in pen · mail) both merged. #709 merged as b18bfe6a on 3 Nov, after qa's last score (762dbae6), so **qa has not re-scored it** (reviewer and builder 26/26, `screens/C7.7/review-part2.md`).
  * The CAPABILITIES note "the pack stops (exit 2)" means the setup scripts were not run first (`acceptance/lib/m3.ts`), not a product failure. Re-run through `acceptance/lib/run_pack4.sh`.
* **Not built:**
  * **the Prepare application tab** (P-272). The case page has no tabs, and the heading "Prepare application" sits on the R1 forms panel (`web/src/runtime/forms.tsx`), which reads `/runtime/cases/:id/forms`, not `/prepare`;
  * "Cannot start yet" filings (waits);
  * an our-format PDF copy for an online-only form (P-145);
  * biometrics' exemption is read from the hard-coded `vv.single` (`api/src/case-prepare.ts`), a no-hard-coding item.
* **Open Majors:** QA-152 (C6.11, C7.7: IMM 5476's firm name asked per applicant under employer words) and QA-153 (C7.7). Gate B applies to the PR that claims Works.
* **Concept:**
  * `M3-prepare-application/concept-draft.md` (23 Oct, predates P-122) and its challenge M1–M7. M7: the tab absorbs the forms panel.
  * Board `design/draft-prepare-application-v3.html`: two stages, rows, channel select, "not for filing". It has no fees.
  * `M3-agent-view` r5c §4 chose a split view with tabs Overview · Prepare application · Eligibility · Review · History.
  * J7 steps 2.3, 5.1, 5.2, 5.5.
  * Designed, never consolidated since P-122, P-145, P-171, P-237 and P-272, so a **concept addendum with a fresh challenge** is written next to this file (see "Screens").

**2. Done when**
The tab "Prepare application" on the case reads `/runtime/cases/:id/prepare` and shows:
* stage 1 (facts to confirm per filing);
* stage 2, one row per item with exactly one state;
* the channel select (C11.6);
* fees per filing (C6.12-25);
* Download PDF copy on an Online line, never filed;
* the Paper steps.

The forms panel is **absorbed**, not dropped (prepare-tab challenge B1):
* its copy block (Generate, Download, Send the validated copy back, Lock) moves into the form row's detail;
* the panel stays only where `/prepare` says `derived: false`.

Rows show only the API's seven states (To do · In progress · Ready · Done · Out of date · Cannot start yet · Not needed) and the API's reasons. Channels outside `accepts` are shown disabled with IRCC's line. Keyboard only; axe clean at 1440 and 1024 px. The full rules are in `prepare-tab/concept-draft.md` r2.

Tests:
* new `acceptance/C7.7-screen.test.ts` C7.7-27 onward (the pack has 26);
* `C7.7.test.ts` stays as the API regression check;
* one fail step per state (a blocked item names why);
* `check_runtime_r1c.cjs`, `check_s5_slice2_browser.cjs` and `check_qa_s01_channels.cjs` are changed in the same PR and named in it.

**3. Files: all M3-only**
* **New:** `web/src/runtime/prepare.tsx` and `acceptance/C7.7-screen.test.ts`.
* **Modified:**
  * `web/src/runtime/cases.tsx` (tabs; the `/cases/*` routes live there, so `App.tsx` needs no line);
  * `web/src/runtime/forms.tsx` (its copy block moves into the row detail).

  `cases.tsx` is not on the hot list, but M2's K13 changed it on 2–3 Nov. Keep the change small and merge `origin/main` before review.
* **Two small API changes in `api/src/case-prepare.ts` (M3-only)** (prepare-tab challenge B2), each with its own API test in `tests/check_vv_prepare_api.ts`:
  * (a) a PDF-upload barcode line gets `validated{}` and In progress or Out of date from `readBackOf`;
  * (b) a document item takes its state from its `checklist_line`.
* **Types** go in `prepare.tsx`, never in `studio/contracts/runtime.ts` (hot).

**4. Decisions and questions**
* **Decisions:** P-62 §6, P-122, P-137 (portal fixed, read-only), P-145, P-171 (1), P-272 (tab name), P-237, P-316 (3).
* **Q1 (founder). Waits and online-only copies.** They need permanent-residence combinations. *Recommend:* they move out of C7.7's Works as breadth, named.
* **Q2 (tech lead). The PDF-upload line's state, change (a).** *Recommend:* yes, about 20 lines reusing `readBackOf`. Otherwise the main Visitor visa form still reads To do after its read-back.
* **Q3 (founder). The History tab.** *Recommend:* left out until a case history exists (P-33).

**5. Size and order**
* **Size:** L for the tab. It is the screen C6.12-25, C11.6, C7.3, C7.6, C8.1 and C8.2 all show on.
* **Depends on:**
  * QA-152 and QA-153, for the PR that claims Works (gate B);
  * a qa re-score of #709;
  * the concept addendum's challenge.
* **Place:** the first screen built. It unblocks the most rows.

---

## C11.6: channel per form inside what IRCC accepts

**1. Missing now**
* **API: works.** `C11.6.test.ts` 14/14: an item starts on its line's channel; a choice outside `accepts` gets 422 with IRCC's line; Paper needs a reason; audited.
* **Not built:**
  * **the row control on the case screen.** `PATCH /runtime/items/:id/channel` exists (`case-prepare.ts`). Concept: the v2 and v3 boards' "Filing channel" select per row, agent-view BR-8 ("changed on the row, refused with the reason") and J7 5.2;
  * **answer sheets for portal-only permanent-residence forms (P-113):**
    * the section lists cover only IMM 5257, 1295, 5707 and 5476 (`studio/contracts/pdf-sections.json`);
    * `case-prepare.ts` refuses a form without one;
    * no permanent-residence combination is released.
* **Data found while reading:**
  * The PR Portal account is keyed to `fs.outside` in `samples/form-library-sample.json`, but the six use `fs.spouse`, so the finder never sets PR_PORTAL there.
  * What IRCC accepts for IMM 5669 and 5406 is recorded only for IRCC_SECURE_ACCOUNT.
* **New screen:** no. It is a row control inside the C7.7 tab.

**2. Done when**
* **(a) Screen, now.** Each form row in Prepare application offers only the channels IRCC accepts for it. A refused choice shows IRCC's line in words, and Paper asks for a reason. The combination's line never changes.
* **(b) Permanent residence, breadth.** On a released `fs.spouse` case:
  * IMM 0008, 5669 and 5406 are Online with an answer sheet in section order;
  * a form the portal does not take reads "Not needed" (P-137).

Tests:
* (a): steps in `C7.7-screen.test.ts`;
* (b): new `acceptance/C11.6-breadth.test.ts` C11.6-15 onward;
* `C11.6.test.ts` stays green (it is in `tests/check_vv_prepare_api.ts`).

**3. Files**
* **(a), M3-only:** `web/src/runtime/prepare.tsx` (the C7.7 file).
* **(b):**
  * M3-only: `engine/runtime/answer-sheet.ts`, `engine/channels.ts`, the samples JSON (the account key fix);
  * M2-hot: `studio/contracts/pdf-sections.json`. *Recommend:* put the new section lists in a data file outside the hot prefix (for example `samples/pdf-sections-pr.json`), read after the first, or ask the tech lead for the hot-file line.

**4. Decisions and questions**
* **Decisions:** P-122, P-137, P-143, P-113, P-152 (1), P-171 (3).
* **Q1 (founder). Does an Online IMM 5669 or 5406 offer "Download PDF copy"?** P-171 (3) says "answer sheet, no PDF", while P-145 offers a copy where IRCC publishes one. *Recommend:* our-format copy only, labelled "copy, not for filing".
* **Q2 (tech lead). Which permanent-residence combination hosts (b)?** *Recommend:* `fs.spouse`, shared with C6.12-22, with its release set up in a new `acceptance/lib/setup_fs_m3.ts` through the configuration routes (Sample).

**5. Size and order**
* **Size:** (a) S, inside C7.7; (b) M–L.
* **Depends on:**
  * (a): C7.7's tab;
  * (b): a released `fs.spouse` (the C6.12 setup file) and the account key fix.

---

## C6.12: filings and fees derived from the case

**1. Missing now**
* **Works (Visitor visa):** `C6.12.test.ts` 24/24, `check_r2_fee_table.ts` 81/81. `C6.12-breadth.test.ts` 1/4: -24 passes; **-22, -23 and -25 are red.**
* **-22, spouse sponsorship.**
  * The engine already makes the two filings in one group that cannot be split (`tests/runtime/check_vv_filings.ts`).
  * No fee is charged when a sponsor co-files:
    * the fee table refuses `co_files` modes (`engine/runtime/filings.ts`);
    * a co-filed case charges no line;
    * `samples/fee-table.json` has a combination entry for `vv.single` only;
    * `fs.spouse` is never released on the acceptance copy.
  * Concept: agent-view BR-1, BR-16, BR-18 and board frame 7b ("Spouse sponsorship · 2 filings · 1 group … bundled fee on Client B's filing", Expert Q4).
* **-23, a child of a student or worker.**
  * Nothing is built, and the six cannot carry it: `sp.outside` has only a principal; `wp.lmia_inside` has no child.
  * No concept covers a filing that depends on an answer.
  * P-171 (5) is the founder's rule "where IRCC is silent" (no age rule). It is **Sample**.
* **-25, the screen.** The case page never reads `/prepare`. Covered by the C7.7 tab.
* **Setup step S7a**, `PUT /library/fees` (`acceptance/lib/setup_vv_m3.ts`), has **no route**. Today the table is `samples/fee-table.json`.
  * No concept covers a fee-table screen in the studio; W1-shared-library lists "fee table" as Not built; STATE "Next" 4 says "fees and roles library tables + S7a screens (M3, design first)".
  * **New screen, no concept**: a short concept and its challenge are written next to this file (see "Screens").
* **Fee values already cited in the repo:**
  * **Visitor visa** CAD 100 per person, CAD 500 for 5 or more.
    * Page: https://ircc.canada.ca/english/information/fees/fees.asp (page date 2026-09-21; read 2026-11-02).
    * Quote: "maximum fee for a family of 5 or more people applying at the same time and place".
    * Recorded in `samples/fee-table.json`, `compliance-trace.md` VV-R13 and research row 1a.
  * **Biometrics** CAD 85 per person, CAD 170 for 2 or more.
    * Same page. Quote: "Maximum fee for a family of 2 or more people applying at the same time" (VV-R14, research row 1b).
    * Exemption: under 14 and over 79 (`…/biometrics/when-to-give-temporary-residence.html`, 2026-03-30).
    * `fee-table.json`'s biometrics quote is labelled "summary of the Lead-checked record", not IRCC's words. Replace it with the fees.asp quote above.
  * **Spouse sponsorship** CAD 1,260 (sponsorship, processing and right of permanent residence fee).
    * Same page. Quote: "Sponsor your spouse or partner $1,260.00" (research row 1c).
    * **To confirm:** the dependent child of a sponsored spouse is CAD 180 in `fee-table.json` (`spouse_dependent_child`). Its quote is a summary ("dependent child CAD 180", `quote_kind` "summary of the research file"). Its `checked` note and research row 1c cite "Include a dependent child $270.00", which is the economic class's line. The immigration expert confirms; until then it is **Sample**.
  * **Study permit** CAD 150, **work permit** CAD 155, **open work permit holder** CAD 100, **visitor extension** CAD 100: qa re-read the fee list (page date 2026-09-21) and all four match word for word (CAPABILITIES C6.12).

**2. Done when**
* **-22:**
  * a released `fs.spouse` case gives a sponsorship filing and a permanent-residence filing in one group, each with its own application-number box;
  * the bundled CAD 1,260 is one fee line on the sponsored person's filing, with its basis and source;
  * a sponsorship filing alone is never charged twice.
* **-23:**
  * a released student or worker combination with an accompanying child asks the case officer "Will this child study 6 months or more?" (Sample);
  * Yes adds a study-permit filing (CAD 150, no family maximum) at the same time; No adds none.
* **-25** (inside the C7.7 tab): filings and fees per filing; Visitor visa CAD 100 each, biometrics CAD 170 for the family.
* **S7a:**
  * the fee table is a dated, cited configuration item with a route;
  * the setup step passes;
  * each case's filings carry the fee-table version they were priced on.

Tests:
* `C6.12-breadth.test.ts` 4/4, with -22 amended (Q1) and -25 opening the tab by clicking;
* new `acceptance/lib/setup_fs_m3.ts` and `setup_sp_m3.ts` releasing the two combinations through the configuration routes (Sample);
* `setup_vv_m3.ts` S7a green.

**3. Files**
* **M3-only:**
  * modified:
    * every reader of `samples/fee-table.json` uses one loader (fee-table challenge B1). The builder lists them with `grep -l "FEE_TABLE\|fee-table.json"`; on 9caa043b they include `engine/runtime/filings.ts`, `engine/runtime/case-checklist.ts`, `engine/source-register.ts`, `api/src/source-register.ts`, `api/src/case-prepare.ts`, `api/src/case-filings.ts`, `api/src/workspace.ts` and `acceptance/C6.12-breadth.test.ts`. Synchronous readers read a cache, so `studio.ts` (hot) is never touched;
    * `samples/fee-table.json` (version 0);
    * `samples/wave1.json` (a child role on a student or worker Sample);
    * `prisma/schema.prisma` and a migration: `fee_table` (id, `as_of` = in force from, lines, status, created_by, reason), and **`fee_table_id` on `submission_group`**, not on `filing` (the family maximum is per group, challenge M1);
    * `tests/check_r2_fee_table.ts`, `tests/runtime/check_vv_filings.ts`;
    * `acceptance/lib/setup_vv_m3.ts` (S7a gets a reason and full IRCC sources);
  * new: `api/src/fee-table.ts` and `features/fee-table.ts` (`GET /library/fees`; `PUT` answers 202 and waits as a `library_change` for a **second person**, approved through the existing route, P-253 step 6, challenge B2). **Not** named `library-fees.ts`: a new file passes the guard, but every later edit would match the hot `library-` prefix.
  * **Kept off hot files** (records review M3):
    * `decideChange` (`library-changes.ts`, hot) only changes the change's status, so nothing may run "on approve". "In force" is worked out **when the table is read**: the newest version whose change is APPROVED, as `form-library.ts` already does for its items.
    * The synchronous readers refresh their cache from that read, with a version check, not from an approval hook.
    * `fee_table` has a foreign key to its `library_change` with `ON DELETE CASCADE`, so Reset (`demo.ts`, hot, which deletes `libraryChange` per workspace) also removes stored versions, and version 0 is back (P-108).
    * To review shows the change as a generic "change" until the hot file is free. That is a Minor, named in the PR.
    * If the builder still finds a hot edit unavoidable, they ask the tech lead for the line first;
  * new: `acceptance/lib/setup_fs_m3.ts`, `setup_sp_m3.ts`, `tests/check_fee_table.ts`;
  * PR 2: new `web/src/pages/fees.tsx`, a minimal read-only list (challenge M6).
* **M2-hot, avoid:**
  * `studio/contracts/runtime.ts` (the CaseFiling and FeeLine types): export the new types from `api/src/fee-table.ts`, not from a new `studio/contracts/` file;
  * freezing the fee table into the release (`engine/snapshot.ts`, `api/src/studio.ts`): see Q2;
  * a conditional filing written on the participant line: `studio.ts` `checkParticipants` drops unknown keys. See Q3.

**4. Decisions and questions**
* **Decisions:**
  * P-171 (4) and (5);
  * P-247 ("every fee line carries a basis"; family maximum);
  * P-135, P-151 (2), P-230 (7);
  * P-246 (2) (pin per filing when ADOPT is built; SI-11);
  * P-253 (one guarded change for every reusable item);
  * P-319 (no hard-coding).
* **Q1 (tech lead). -22 checks a fee line starting `pr_`.** The cited CAD 1,260 already bundles processing and the right of permanent residence fee, and `pr_adult` (CAD 1,590, **Sample**: its quote in `fee-table.json` is a summary) is the economic class, so charging it would overcharge. *Recommend:* amend -22 to check two filings, each fee on a named filing, the bundle once. Its first PR line says so.
* **Q2 (founder). Which version prices a filing?** *Recommend:* follow P-151 (1)'s warn-not-reprice, as amended by P-237 (3). The stamp time is new and is the founder's to confirm. The version is stamped on the submission group when its filings are first worked out, and a newer version never reprices them. The team is told this differs from SA-1B-52 rule 2 ("the version in force on the date the authority receives the application"). Freezing into the release (M2-hot) is not needed.
* **Q3 (founder). A second person on the fee route?** *Recommend:* yes, as P-253 step 6 asks. The `PUT` waits as a library change and a different person approves it through the existing route. It is M3-only, and S8's loop in setup already approves waiting changes. The conditional study-permit rule lives in the same dated data, and the question is released configuration.

**5. Size and order**
* **Size:** L in total: S7a (version 0, loader, second person, group stamp) M; the read-only list S (PR 2); -22 M–L; -23 M; -25 S (inside C7.7).
* **Depends on:**
  * the C7.7 tab (-25);
  * Q1 to Q3;
  * the expert's confirmation of the child line (Sample until then).
* **Unblocks:** C8.2's numbers per filing, C11.6 (b) (the `fs.spouse` release), and P-151 fee currency.

---

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

Test: a new `acceptance/C11.5.test.ts` (the merged id), steps C11.5-1 to -7, one per clause above, plus:
* **C11.5-8**: an organisation fact resolves from the organisation subject, never from a person (taken over from C3.16-5, which names C11.5);
* **C11.5-9**: a Retail case whose only `organisation.*` boxes belong to the representative (IMM 5476) is **not** offered the link (the box-owner filter).

The Sample employer record is created by `POST /runtime/employers` (staff, Sample, demo workspace only) in the new file. It is named as scaffolding until L-SA5 (M4). Also a new fail case in `tests/runtime/check_c115_employer.ts` from c1-v3's IMM 5476 entry.

**3. Files: all M3-only**
* **New:**
  * `api/src/case-employer.ts`, with routes `GET`/`POST /runtime/employers` (the Sample record), `PUT /runtime/cases/:id/employer-link {employer, version}` and `DELETE …/employer-link {reason, version}`;
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
* **Concept:** none existed. `field-scope/concept-draft.md` (r2, after its fresh challenge) is written next to this file. It is not a new case screen.
* **Acceptance test:** none.

**2. Done when** (after the fresh challenge, `field-scope/challenge.md`; concept r2)
These go in a new `acceptance/C3.16.test.ts`. **C3.16 scores Works only after part b**: until then no product step can create a Household field (P-322).
* C3.16-1 (b): the four scopes are shown and set in the library.
* C3.16-2 (b): changing the scope of a published field, or of a new draft version of a published key, is refused: "A published field's scope cannot change. Create a new field."
* C3.16-3 (a):
  * a Household field (Sample, set by SQL in the test's own release: named scaffolding) is asked once in "For the household", and both adults' boxes fill;
  * a save on the spouse's subject answers 422;
  * a Visitor visa family gets no extra person, form or fee.
* C3.16-4 (a): a Filing field placed per person is asked once on the case and stored on the case subject; a Person field is still asked per person.
* C3.16-6 (a): RT-9 (`tests/runtime/check_runtime_r1a.ts`) is cited, plus "a correction keeps `rowKey`".
* **Organisation (-5) is C11.5's**, in `acceptance/C11.5.test.ts`.
* `tests/check_sh3_resolver.ts` R5 passes unchanged.

**3. Files: split in two**
* **C3.16a, runtime (M3-only):**
  * a migration with only `ADD VALUE IF NOT EXISTS 'HOUSEHOLD'` and `'ORGANISATION'`:
    * **no backfill** (Postgres refuses a new enum value before it commits, and published fields never change scope);
    * CLIENT_LEVEL and CASE_LEVEL are kept and mapped (founder Q1);
  * a new additive table `case_household`;
  * a new `engine/field-scope.ts` (the one reader: CASE_LEVEL → filing, HOUSEHOLD, ORGANISATION, CLIENT_LEVEL → today's R5);
  * `engine/resolver.ts`;
  * `engine/runtime/case.ts` (`caseView` folds the household questions; `knownOf` copies the value to each member, as `hasChildrenOf` does);
  * `api/src/runtime.ts` (the 422; the household subject on the principal's party, **never a case participant**);
  * `acceptance/C3.16.test.ts`.
  * **`engine/render.ts` (hot) is not touched.**
* **C3.16b, library choice and refusal (M2-hot; waits for M2 at 55):**
  * `studio/contracts/resolver.ts` (`BUILT_SCOPES`);
  * `api/src/library-changes.ts`, `api/src/proposals.ts`;
  * `engine/render.ts` (Preview);
  * `web/src/pages/library.tsx` (M2's C3.15 is changing it).

**4. Decisions and questions**
* **Decisions:** P-239, P-316 (2) (supersedes P-251's hold for this row), P-246 (2) (SH4), SA1B-D65 (household asked once, read-only for the other adult).
* **Q1 (founder):** keep CLIENT_LEVEL and CASE_LEVEL, mapped in one reader, and record it as a change to SA-1B-130 rule 6? *Recommend:* yes. Releases keep the old names for good, and a rename touches hot files and about 15 tests for no change in behaviour.
* **Q2 (founder):** build Household at runtime now (part a), on a Sample field? *Recommend:* yes, in the narrow form of concept r2. The alternative is to wait for the first real household field.
* **Q3 (tech lead):** lanes and SA-1B-134 rules 2–4. *Recommend:* runtime takes a now; forms takes b after M2 at 55; rules 2–4 go with C6.5's follow-up.

**5. Size and order**
* **Size:** L overall (a: M; b: S–M).
* **Depends on:** M2 at 55 (b); SH4 (true per-filing scope); founder Q1 and Q2.
* **Not needed for the Visitor visa story.**
* **Unblocks:** L-SA5 (M4).
* **Order:** a is low in the order, because it does not score Works without b.

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
  * IMM 5257 Online, its sections entered (Q1);
  * IMM 5645 filled as a PDF upload;
  * IMM 5476's signed scan in;
  * the checklist per person, with some lines received;
* leaves the thin case on release 1, with its IMM 5257 validated and read back (the barcode round trip, C10.1 row 12).

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
* **Q1 (conflict, tech lead first). Release 2's channels and family form.**
  * **The pack** (-6) and FQ-2 say: IMM 5257 PDF upload, validated; **IMM 5707 Online**; IMM 5476 signed scan.
  * **DEMO.md row 9** (read 4 Nov) says: "IMM 5257 Online, IMM 5707 PDF upload, IMM 5476 Signed PDF upload".
  * **P-318 (6)** (the tech lead's ruling, 4 Nov) says: "the family form follows the channel (online IMM 5645, paper IMM 5707 per IMM 5484), never by removing one". STATE records the follow-up "DEMO.md row 9 → IMM 5645 online" (Builder 8, after QA-144).
  * Neither the pack nor row 9 as written today matches P-318 (6).
  * **Recommend:** release 2 is DEMO row 9 brought up to P-318 (6):
    * **IMM 5257 Online** (its answer sheet has a section list already: `studio/contracts/pdf-sections.json` covers IMM 5257);
    * **IMM 5645 PDF upload**, the family form of an online application (channel Sample until the expert confirms);
    * **IMM 5476 Signed PDF upload**.
  * This gives the story its Online form with entered sections (DEMO row 14) without touching the hot section-list file.
  * The **barcode round trip** stays in the story on the **thin case on release 1** (IMM 5257 PDF upload, validated and read back; C10.1 row 12).
  * C10.2-6 changes to these channels in the same PR (its first line says so). DEMO row 9's wording is the tech lead's to update.
  * QA-153's parent facts are needed either way, because IMM 5645 lists the parents.
  * Reversing P-318 (6) is the founder's choice and is not recommended.
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

---

## Screens: what is designed, what this PR adds

| Screen | Rows | Design | Here |
|---|---|---|---|
| Prepare application tab (list, row detail, channel select, fees, answer sheet panel) | C7.7, C11.6 (a), C6.12-25, C7.3 | r5c + v3 board, both challenged ("Build after these changes"); never consolidated since P-122 to P-272 | addendum `prepare-tab/concept-draft.md` + board + fresh `challenge.md` |
| Documents panel and "Fill this from documents" drawer | C6.4 (a), C6.5 2b | r5c BR-3 to BR-7, frames 3 and 5; predates P-242 and P-243 | addendum `documents/concept-draft.md` + board + fresh `challenge.md` |
| Studio fee table (read-only in M3) | C6.12 (S7a) | none | new `fee-table/concept-draft.md` + board + fresh `challenge.md` |
| Library "Asked about" scope and the household fact on a case | C3.16 | none | new `field-scope/concept-draft.md` + board + fresh `challenge.md` |
| Review page | C7.5 part 2 | r5c BR-19, frame 13; `screens/C7.5/challenge.md` defers it to part 2 | none needed |
| Employer link drawer | C1.3 + C11.5 | r5c BR-13, frame 10 | none needed (BR-13's wording, Q3) |
| Demo › Load the finished story | C10.2 | the configured checkpoint's own pattern | none needed (not a new screen) |

Under P-316 (3) and P-223 (4), the tech lead approves each concept after reading its `challenge.md`. The founder's early look comes later, through the tech lead. The drafter's response to each challenge is at the foot of each concept.

---

## Order (M3-only first, smallest and most unblocking first)

**0. Fixes and records that gate the rows** (not M3 rows; each is small):
* **qa:**
  * retest QA-149 (CAPABILITIES says fixed; BUGS says Open), which gates C6.4's Works claim;
  * re-score C7.7 after #709;
  * merge C1.3 into C11.5 (P-316 (2)).
* **QA-152** (runtime, M3-only files): one runtime PR that names it. It gates C7.7's Works claim.
* **QA-153** (M2 forms: the parent questions on the Visitor visa release, P-300 (2)). It gates the Works claims of C7.3, C7.7 and C10.2. Its M3 half (relative answers resolved to `parent_N`) goes in C7.3.

**Then:**

| # | Row (slice) | Lane | Size | Files | Waits for | Unblocks | Before Claims Works (gate B) |
|---|---|---|---|---|---|---|---|
| 1 | **C6.4 (a)** Documents panel | screens | S | M3-only (UI only; API built) | the `documents/` concept approved | C6.5 2b, DEMO row 15, C7.7's document items | QA-149 closed (C6.4 Works also needs (b) named as breadth) |
| 2 | **C7.7** Prepare application tab | screens | L | M3-only (`cases.tsx`, `forms.tsx`, two small `case-prepare.ts` changes; merge main first) | #709 re-score; the `prepare-tab/` concept approved | C11.6 (a), C6.12-25, C7.3 screen, the C7.6/C8.1/C8.2 screens, C10.2 | QA-152, QA-153 closed |
| 3 | **C6.12 S7a** one fee loader (version 0), the route with a second person, the stamp per submission group (read-only list in PR 2) | runtime | M | M3-only (new `fee-table.ts`, migration) | the `fee-table/` concept approved; Q1 to Q3 | `setup_vv_m3` S7a green, C6.12-22 | — (C6.12 Works needs -22, -23, -25) |
| 4 | **C6.5 2a** document reads, Confirm & use, checks, correction count (API) | runtime | M | M3-only (new `case-documents.ts`, migration) | — (parallel with 1 to 3) | C6.5 2b | — (C6.5 Works needs 2b) |
| 5 | **C7.5 part 2, PR 1** review runs, prompt, job, stub pass, Review page (US$0) | runtime | M | M3-only (new `review-runs.ts`; never edit `studio/contracts/findings.ts`) | — | PR 2 | — (C7.5 Works needs PR 2 and C7.6) |
| 6 | **C11.6 (a)** channel select on the row | screens | S | M3-only (`prepare.tsx`) | 2 | C10.2 | — (C11.6 Works needs (b) or (b) named as breadth) |
| 7 | **C7.3** answer-sheet panel + relative answers + Minors n2, n3, m6, n7 | screens + runtime | M | M3-only (Q2 avoids `snapshot.ts`) | 2; QA-153's M2 half | C7.7 and C10.2 at Done on the Online form | QA-153, QA-165 closed |
| 8 | **C6.12-25** fees in the tab | screens | S | M3-only | 2, 3 | C10.2 | see 3 |
| 9 | **C6.5 2b** the drawer | screens | S–M | M3-only | 1, 4 | C4.5 (P-256), J7 3.3 to 3.8 | — (C6.5 Works: 2a + 2b; part 3 named) |
| 10 | **C11.5 (+C1.3)** employer pre-fill on a Sample employer record | runtime | M | M3-only (new `case-employer.ts`, migration) | Q1 (M3 or M4) | C9.2's employer step, SI-10 | — |
| 11 | **C3.16a** the stored scope read in one place, Household asked once (no Works until b) | runtime | M | M3-only (two `ADD VALUE` lines, `case_household`; `render.ts` untouched) | founder C3.16 Q1 and Q2 | C3.16b after M2 at 55 | — (no Works until C3.16b) |
| 12 | **C6.12-22, -23** sponsorship and the child's study filing (Sample releases through setup files) | runtime | M–L, M | M3-only | 3; C6.12 Q1; for -23, the tech lead's no-hard-coding order (STATE "Next" 4, P-319) puts "Study permit filings/checklist (M3, after M2 55)", so -23 waits for M2 at 55 unless the tech lead rules otherwise | C11.6 (b), C8.2 numbers | see 3 |
| 13 | **C7.5 part 2, PR 2** the recorded result (one paid run, about US$1.11 measured, tech lead's approval, P-309) | paid runner | S | — | 5 | C7.5 Works (with C7.6 for -9) | — |
| 14 | **C10.2** the finished story | runtime | L | M3-only if the status stays out of `demo.ts` (Q3) | C7.6, C10.1 part B (M2), #798, QA-153; rows 2, 6, 7, 8, 1 | the M3 gate (DEMO checkpoint 3) | QA-153 closed; C7.6 Works |

**Wait for M2 at 55** (they need M2-hot files):
* C3.16b (library choice and refusal);
* fee editing on screen, if ever wanted beyond the route (the guarded change's other steps);
* fee editing through the guarded change (C6.12 Q3).

**Breadth, after the Visitor visa gate** (named, outside the Visitor visa Works):
* C6.4 (b) (waivers, the P-172 block on a Sample Express Entry release, after C7.6);
* C11.6 (b) (portal-only permanent-residence sheets on `fs.spouse`);
* C7.7's waits and online-only copies;
* C6.5 part 3 (the letter read by AI vision, one paid run);
* C10.2 (c) (row 18 on With an LMIA).

**Parallel lanes:**
* screens: 1 → 2 → 6 → 7 → 8 → 9;
* runtime: 3 → 4 → 5 → 10 → 11 → 12 → 14;
* forms (M2): QA-153.

Rows 1, 3, 4 and 5 can start the same day. None touches an M2-hot file.

---

## Questions for the founder (one at a time, through the tech lead; each recommended answer first)
1. **C11.5 Q1. Employer pre-fill: M3 or M4?** P-239 puts the link in M4 (L-SA5). *Recommend:* M3 links to a Sample employer record; M4 adds the Corporate case.
2. **C10.2 Q1. Release 2** (only if the tech lead's P-318 (6) is to be reversed). *Recommend:* keep P-318 (6). Release 2 is IMM 5257 Online, IMM 5645 PDF upload and IMM 5476 Signed PDF upload. The barcode round trip is shown on release 1's thin case.
3. **C6.12 Q2 and Q3. Fees.**
   * A fee version is stamped on the submission group when its filings are first worked out, and never reprices them.
   * This follows P-151 (1)'s warn-not-reprice, as amended by P-237 (3). The stamp time is new.
   * It differs from the team's SA-1B-52 rule 2.
   * A new version waits for a second person (P-253 step 6).
   * *Recommend:* yes to both.
4. **C6.4 Q1 and C7.7 Q1.** Permanent-residence parts are scored as named breadth, outside the Visitor visa Works. *Recommend:* yes.
5. **C3.16 Q1 and Q2.**
   * Keep CLIENT_LEVEL and CASE_LEVEL, mapped to Person and Filing, as a change to SA-1B-130 rule 6.
   * Build Household at runtime now, on a Sample field.
   * *Recommend:* yes to both.
6. **Documents Q1 and Q2.**
   * A value the officer corrects before Confirm & use waits for Confirm section (SA1B-D107 stays held).
   * One value that differs opens a check and the rest still fill.
   * *Recommend:* yes to both.
7. **Prepare tab Q1.** The History tab is left out until a case history exists. *Recommend:* yes.
8. **C7.3 Q3. Works with PDF-twin order** until W6 (M4, P-245). *Recommend:* yes, with the label shown.
9. **C7.5 Q3. One recorded AI review run, IMM 5257 only, now.** *Recommend:* yes.

All the other questions in the rows are the tech lead's own rulings.

---

## Response to the Opus review of the records (`review.md`, 4 Nov)
**Verdict:** Changes needed (no Blockers, 3 Majors, 13 Minors). All are taken.

* **M1, P-318 (6):** C10.2 Q1 now states release 2's channels: DEMO row 9 brought up to P-318 (6), that is IMM 5257 Online, IMM 5645 PDF upload and IMM 5476 Signed PDF upload. The barcode round trip is on release 1's thin case. C7.3 counts Works on IMM 5257 Online (Q4). Founder question 2 now asks only whether to reverse P-318 (6), and recommends no.
* **Re-review (diff only):**
  * R1: release 2's channels are stated, the IMM 5257 section list already exists, and the DEMO row 9 claim is corrected;
  * r1 and r2: C7.3 is rewritten around the Online form, and Q4 goes to the tech lead;
  * r3: the fee-table loader row no longer says "on approve", and `status` is defined;
  * r4: the duplicate QA-165 is removed, and C11.5-9 is a distinct case.
* **M2, gate B:** described as `tools/gate-b.mjs` checks it (only on "Claims Works:" lines, `Fixes: QA-nnn`). The order table has a "Before Claims Works" column, and the concepts' Definitions of ready match.
* **M3, the fee table off hot files:**
  * "in force" is worked out when the table is read;
  * nothing runs on approve;
  * the cache refreshes from the read;
  * `fee_table` cascades from `library_change`, so Reset works;
  * To review shows a generic change (named);
  * the tech lead is asked only if a hot edit is still unavoidable.
* **m1–m13:**
  * QA-149's check is cited;
  * the readers are listed by grep;
  * the child-fee and `pr_adult` lines are Sample;
  * "follows P-151 (1) as amended by P-237 (3)";
  * no `App.tsx` line;
  * types in `prepare.tsx` only;
  * the field-scope body is updated;
  * C11.5 takes the organisation test and names its create route;
  * C6.5's counts route and test file are named;
  * every new table cascades;
  * -23 waits for M2 at 55 under the P-319 order unless ruled otherwise;
  * the board slip is fixed.

