# V4 — UX re-score on the 2 Nov baseline method (3 Nov 2026)

This re-score was asked for by the tech lead (Lead 2, 3 Nov 07:51 UTC) after the founder chose full speed. It is read-only and US$0: live AI was off, no `STUDIO_*_LIVE` was set, and no priced button was clicked.

* **App:** a fresh copy of `origin/main` at **27b98d72**, isolated on port 4471 with its own database.
* **Baseline:** `screens/UX-baseline-2026-11-02/findings.md`, scored **5.5 / 10** before UX-A parts 1–4.
* **Earlier V4 walk:** 6.5 / 10 on 877acf66 (`V4-best-in-class.md` §6).
* **Screenshots:** `V4-ux-rescore/` (14 JPEGs, 1.1 MB). Each before/after image puts the 2 Nov baseline on the left and today on the right.

**Legend.** **[E]** = seen on the running app. **[J]** = my judgment or estimate.

## 1. Score

**7.0 / 10 (2 Nov: 5.5; earlier today on 877acf66: 6.5). Uncertainty ±0.5. The bar is 8.**

The main reason for the rise since my earlier walk is #676 (C5.4). It added Demo › "Start With an LMIA from its reviewed release…". After one Reset to the six, LMIA is then Live on Release 1, so for the first time the case screens can be walked. This baseline had never walked them ("Journey B could not be walked"). **[E]**

## 2. Method

The baseline is a holistic walk ranked by user impact; it has no written formula. To give a score per dimension that stays comparable, I did the following. **[J]**

1. **Dimensions.** I grouped the baseline's ten findings and its "Keep" list into 8 dimensions. Each maps to `EXPERIENCE.md`.
2. **Weights.** Each dimension is weighted by user impact.
3. **2 Nov estimates.** I scored each dimension for 2 Nov from the baseline's own findings and screenshots.
4. **Today's scores.** I scored each dimension today from this walk.
5. **Overall.** The overall score is **5.5 + (today's weighted score − 2 Nov's weighted score)**. That carries the baseline's anchor forward and measures only the change.

The 2 Nov column is my reconstruction, not the baseline reviewer's.

**States walked:**
* Demo › Reset to the six (22.6 s).
* Then Demo › Start With an LMIA from its reviewed release (US$0).
* Then on that release:
  * open a case "V4-CASE-001" (principal: Sample Worker) as Case officer;
  * open the client link as Client A at 390 px;
  * Generate a copy of IMM 5475.

The same screens as 2 Nov were walked at 1440 px and 400 px. I did not re-walk the configured checkpoint: nothing merged since 877acf66 touches it.

## 3. Score per dimension

| # | Dimension (baseline findings) | Weight | 2 Nov [J] | Today | Why today's score [E] |
|---|---|---|---|---|---|
| D1 | Numbers you can trust (1) | 15 | 3 | **6** | Badges say what they count ("Forms 190 to do", "Review and release 6 to fix"). Visitor visa "Review 175 proposals" equals the sum of its six To review rows. **Still:** one LMIA worker carries 146 questions (SQR tab), "120 form facts … 86 asked of the client" (same tab), "Client questionnaire · 84 of 146" (Preview), and the case says "153 questions for this household". The 2 Nov example was 145 / 120 / 83 / 98: the same four-number problem. (03, 04) |
| D2 | Knowing the next step (2, 7) | 20 | 4 | **5.5** | **Fixed:** blockers appear under Needs you (01). One status vocabulary. A Live combination says "setup steps for the next release: 2 of 5 done" (07). **Still:** the AI proposals page opens on "Needs a decision (0) … Nothing in this view" while 84 wait (10). The drafting dialog says "Find its forms (Start setup) first" when the forms are found (11). Live LMIA's first next step is someone else's "Choose the checklist page (No page matches)" (07). |
| D3 | Calm, plain screens (3, 4, 5) | 10 | 5 | **6.5** | **Fixed:** names (SQR, PQR, Case officer); field keys behind "Details (for admins)"; Structure no longer shows "Can't retire yet" under every row (02). **Still:** "Remove from questionnaire: not here. Its N questions are placed…" is printed next to every one of LMIA's 18 sections (03, unchanged from 2 Nov). Field keys appear inside validation sentences ("case.visit_purpose" is read by IMM 5257…). The Origin column shows "AI_FOUND". |
| D4 | Client-facing wording (6) | 10 | 3 | **4** | The studio still shows "No question written yet (the field's name is shown)" on every row (03). The client at 390 px now reads the field's meaning instead of its name, but it is a definition about "the person", not a question: "Official language (English or French) in which the person wants to receive service" (08). |
| D5 | One pattern per kind of screen (8, +) | 10 | 5 | **5.5** | The release review groups numbers without a source "by item" with "Add source" (C5.4). A field still opens a full page. The draft banner says "129 changes across 1 combination" while LMIA's header says "draft matches the release"; it does not say which combination. |
| D6 | The demo can be walked end to end (10, Journey B) | 15 | 2 | **6** | **New:** Reset → Start LMIA from its reviewed release → Open a case → the client questionnaire in 18 parts → Generate a copy. The copy shows "9 form fields written · read back and checked" and honestly says "for checking only, not for filing" (05, 09, 14). **Still:** Visitor visa, the story UX-D was agreed for, cannot be released. There is no Cases link in the studio menu. After Cases, the studio shows "This page is for the configuration people" (13). |
| D7 | Phone width (9) | 5 | 3 | **5.5** | No sideways scroll at 400 px on any page checked. The client questionnaire fits at 390 px (08). The studio still has no menu button at 400 px, so the libraries and history cannot be reached (06). |
| D8 | Foundations: setup checklist, preview, AI gating, keyboard focus (Keep) | 15 | 7.5 | **8** | All kept. Preview now names who signs each form ("Signed by: The principal applicant themselves", C4.6). The focus ring is visible. |
| | **Weighted** | 100 | **4.13** | **5.98** | **Change +1.85 → 5.5 + 1.85 = 7.35** |

**Reported score: 7.0, not 7.35. [J]** One new problem fits no baseline dimension and would cost the product an RCIC's trust on sight. The released "With an LMIA – **inside** Canada" files "Application for Work Permit made **Outside** of Canada (IMM 1295)" as "Each applicant · Always" (12, and the case's Prepare application list). The content is Sample, but the contradiction is on screen. I took 0.35 off for it.

## 4. Change since 2 Nov, with screenshots

| Screenshot | 2 Nov | Today |
|---|---|---|
| 01 To review | "Nothing waits for you" while blockers existed | The Setup step row "6 problems to fix before release · Needs you · Fix 6 form problems" |
| 02 Structure | "Can't retire yet: …" under most rows | Gone; the rows are calm |
| 03 Questions | Field names, "No question written yet", always-on "Remove from questionnaire" | **Unchanged** |
| 04 Preview | A Sample family, per person | The same, plus "Try answers that change what applies (31)" and who signs each form |
| 05 Cases | "No cases" and no released combination | A case on Release 1 with its people, client link, eligibility and "Prepare application" |
| 06 400 px | Menu at zero width, tables scroll sideways | No sideways scroll; still no menu button |
| 07 LMIA overview | "Live" with "3 of 5 done" | "Live · setup steps for the next release: 2 of 5 done"; the first step still waits on someone else |
| 08 | — | Client question at 390 px: the field's definition, not a question |
| 09 | — | Filled IMM 5475 copy, read back and checked, marked "for checking only" |
| 10, 11 | — | New problems N2 and N3 (still open since 877acf66) |
| 12 | — | Inside-Canada combination files the outside-Canada form |
| 13 | — | The studio after Cases |
| 14 | — | The new Demo item, which states "US$0: no live AI call" |

## 5. Top 5 items still below the bar (8), ranked by user impact [J]

1. **Clients read definitions, not questions (D4 = 4).**
   * What a client sees: "Official language (English or French) in which the person wants to receive service". Every studio row says "No question written yet".
   * Change: row UX-E's accepted wording, written as a second-person question ("Which language do you want IRCC to use with you?"), with a "Needs wording" count.
   * Done when: no client-facing question shows a field name or "the person".
2. **The next step points to the wrong place or to nothing (D2 = 5.5).**
   * The AI proposals page opens on an empty tab while 84 wait.
   * The drafting dialog sends people back to "Find its forms" after the forms are found.
   * A Live combination's first step is someone else's "No page matches".
   * Change: open on the first tab with items; name the real blocking step with a link; show "Waiting for the immigration expert" below your own next step, not above it.
3. **An inside-Canada combination is released with the outside-Canada form.**
   * The reviewed work-permit release brought IMM 1295, "made Outside of Canada", into "With an LMIA – inside Canada".
   * Change: start the demo release on a combination whose forms match its name, or rename it to the release it carries. Then have the immigration expert confirm.
   * This touches immigration content. The fix is for the immigration expert, not a guess (AGENTS rule 4).
4. **One person, four numbers (D1 = 6).**
   * 146 questions, 120 form facts, 86 asked of the client, 84 in Preview, and the case's 153 for the household.
   * Change: one headline per person ("86 questions for the client, 34 from documents or the case officer"), with the rest on hover. Use the same words on the SQR tab, Preview and the case.
5. **The demo walk still breaks at the edges (D6 = 6, D7 = 5.5).**
   * Visitor visa cannot be released (UX-D's story).
   * The studio menu has no Cases link.
   * Leaving Cases strands the studio on "This page is for the configuration people".
   * At 400 px the studio has no menu.
   * Change: UX-D (role remembered per area, Cases link, a released Visitor visa with a family case), then a menu drawer at phone width (UX-C, after the M2 gate per P-274).

Also below the bar, smaller: the always-on "Remove from questionnaire" note on every section (D3), field keys inside validation sentences, and "AI_FOUND" in the Origin column.

## 6. To repeat this

1. Run `bash product/tools/cloud-setup.sh` once, then `zsh prototype/studio/start.sh`.
2. Run `zsh prototype/studio/tools/isolated.sh v4b 4471 start`.
3. In the app:
   1. Demo › Reset to the six… › type RESET.
   2. Demo › Start With an LMIA from its reviewed release… › Start from the reviewed release.
   3. Cases › Open a case: reference "V4-CASE-001", principal "Sample Worker".
   4. On the case, "Open it as Client A" at 390 px.
   5. On IMM 5475, "Generate a copy".

The walk scripts are Playwright and were not committed.
