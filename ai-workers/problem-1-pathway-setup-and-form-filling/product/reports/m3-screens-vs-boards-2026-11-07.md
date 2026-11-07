# M3 case screens on `main` against the founder's boards (read-only audit, 7 Nov 2026)

**Question (the founder):** are the M3 case screens on `main` built from boards he reviewed, then improved by the tech lead with best-in-class research? Only real differences are listed.

**What was read:** `origin/main` at `766a11319` (#1224, 10:03 UTC / 15:33 IST, 7 Nov). `git fetch` was refused by the sandbox (github.com not allowed), so this is the copy's last fetched `main`. Nothing was edited, committed or run; no app was started; US$0.
P = `ai-workers/problem-1-pathway-setup-and-form-filling/product`. Screens still in open PRs were skipped: B3 sign and scan #1221, B127 #1224 (QA-296), C9 #1223, C3 #1225, A6 #1222 (per `P/STATE.md` "In flight"; not checked on GitHub).

## The boards, and who reviewed them
| Board | Founder's part | Approval |
|---|---|---|
| `P/screens/M3-prepare-application/design/draft-prepare-application-v2.html` | **Agreed by the founder**, P-122 (27 Oct). It came with research (Docketwise, Clio, BLAF). | founder |
| `…/draft-prepare-application-v3.html` | No founder record found. | the r5c concept refers to it |
| `P/screens/M3-agent-view/design/draft-agent-view.html` (r5c, 16 frames) | The founder decided its questions: P-135–P-145, P-154, P-155, P-164, P-168. The concept's own Definition of Ready still shows "[ ] the Lead's early look and the founder's click-through" unticked (`concept-draft.md`, last line). | challenge "Build after these changes" |
| `P/screens/M3-design-2026-11-04/{documents,prepare-tab,fee-table,field-scope}` (4 Nov addenda, r2) | Not seen by the founder. P-316 (3): the tech lead approves after a fresh challenge, and the founder looks on the demo later. | tech lead. The `Lead response` and `Agreement` sections of all four `challenge.md` files are **empty**; the approvals exist only on PRs (#1073, the sprint plan's row B2). |

Later founder decisions change these boards on purpose, so the matching differences are intended:
* P-236: the C6.9 page is renamed and gets three outcomes.
* P-237, P-238, P-315: only one hard block.
* P-271: "Agent view" comes back.
* P-342: any staff may pass the review warning.
* P-393: unconfirmed facts are named.
* P-395: the firm record only.

## Screen by screen

### 1. C6.9 case check: A4 #1172, A1 #1084, B124 #1197 (all merged)
* **Board:** agent-view frame 12 (Eligibility in AG-03's shape). The A4 rules editor has no board (P-223 (4)). B124 is wording only, with no concept.
* **Concept and challenge:**
  * `P/screens/C6.9/concept.md` and `challenge.md` ("Ready after fixes") are approved by the tech lead on PR #391 (`C6.9/review.md`); the `Lead response` section is empty. The concept says "There is no board", yet frame 12 draws this page.
  * `P/screens/M3-A4/concept.md` and `challenge.md` are approved by Lead 23 (#1172, recorded in the challenge file).
  * The founder answered C6.9's questions (P-229 (2)). His look at A4 is still open (`STATE.md` F2).
* **Best in class:**
  * None in either concept. C6.9's concept (2 Nov) predates step 4b (4 Nov); A4's (6 Nov) has none.
  * A study was done after the build: `P/reports/best-in-class-C6.9-A4-2026-11-07.md` (P-392), with 8 improvements. Only #7 was built (B124, P-393). The other 7 wait for the founder's look (F2).
* **Intended differences:**
  * Only the case's own program; the board ranked other programs (BR-18, from P-164 (1) and P-236).
  * Only a "Score: none" place; the board also had pass mark, gap and breakdown (P-236 drops "below the cut-off").
  * "Answer in the Agent view" instead of "open in the case view" (P-271).
  * A gate may say "The representative reviews it" (P-230 (1)).
  * "on N answers not yet confirmed" (P-393).
  * A separate page `/cases/:id/eligibility` reached from a card, not a case tab: tabs were never built (see C7.7).
* **Unexplained:**
  * **P-236 is not applied.** P-236 renames the page "Case check from confirmed facts", with the outcome words **Qualifies · Can't tell yet · Does not qualify**. `qa/CAPABILITIES.md` row C6.9 uses those words.
  * The screen says **"Eligibility"**, **"Likely / Possibly / Not eligible"**, and "If not met: Not eligible" in the A4 dialog. Evidence: `qa/reports/2026-11-07-c69-c82/6-case-check-lists-new-gate-1024.jpg`; `B124/build-notes.md` "Why the app's words, not 'Qualifies'".
  * The hold on the rename (P-251) was lifted by P-316 (1) on 3 Nov ("P-235 to P-248"). But `BACKLOG.md` still lists "the P-236 rename of C6.9" under "Held by the product owner". The records disagree, and no row builds the rename.

### 2. C7.6 Ready to file by screens: B2 #1171 (merged)
* **Board:** agent-view frame 6 ("Before anything is sent": the representative's review, then Ready to file) and frame 7. The concept is `M3-design-2026-11-04/prepare-tab/concept-draft.md` r2, BR-8 and BR-11.
* **Concept and challenge:** `prepare-tab` concept and challenge (Lead response empty). The tech lead approves under P-316 (3) (sprint plan row B2). Review: `C7.6/B2-review.md`.
* **Best in class:** **none.**
* **Intended differences:**
  * One hard block (a barcode form without its validated copy) instead of the board's four, plus P-71. Every other line is a CRITICAL warning passed with a reason (P-237, P-238, P-315).
  * The case officer may pass "not reviewed" with a reason (P-342, founder "keep it as built").
* **Unexplained:**
  * The warning reads "The representative of record has not reviewed this filing. **Nothing reaches IRCC unreviewed.**", yet the case officer sees "Pass with a reason…" beside it. The words now say the opposite of the rule. Source: `engine/runtime/readiness.ts:166`; `C7.6/screenshots/B2-01-not-ready-1440.png`.
  * The panel sits inside the stacked forms panel, not as a row of the "Prepare the filing" list (see C7.7).

### 3. C6.4 Documents panel: B1 #1073 (merged)
* **Board:** `M3-design-2026-11-04/documents/design/draft-documents.html`, frame 1.
* **Concept and challenge:** the `documents` concept and challenge, plus `C6.4-checkpoint/challenge-r2.md` ("Build after these changes"). The tech lead approved Q4 on #1073 (`C6.4-checkpoint/notes.md`). The challenge's Lead response is empty.
* **Best in class:** **none.**
* **Differences:**
  * The flow and words match the board: one group per person; "0 of 3 received"; state, reason, ⋯ menu; "May be needed … Answer first"; Not applicable needs a reason; History.
  * Intended: the lines are whatever the release carries (`documents/concept-draft.md` §4).
  * Unexplained: the board puts the panel inside Prepare application, card 1 "Get the information"; it sits on the case page instead (see C7.7). "Fill this from documents" (C6.5) is not built and is not claimed.

### 4. C6.11 case team and the representative's tab: #1072, #1204 (merged)
* **Board:** agent-view frames 1 and 2, BR-20 (`M3-A-c611/review.md` checks against them).
* **Concept and challenge:** the r5c concept §11 and the agent-view `challenge.md`. The founder decided the roles (P-154, P-155) and the cut (P-164 (3)). QA-293 is a fix ruled by the tech lead, "firm record only" (P-395).
* **Best in class:** `M3-agent-view/research-roles-and-solo.md` (29 Oct: Docketwise, INSZoom, Clio, LawLogix, Officio, CICC). It is research for the board; the build has no study of its own.
* **Differences:**
  * The team chip, the representative of record chosen in Open a case, reassigning with a reason and history, and "A new IMM 5476 is needed" all match the board (`qa/reports/2026-11-07-c611/4-…jpg`).
  * The representative's tab shows lines no one can fill ("9 missing", "not filled from the firm record"). This is a known bug tracked as QA-300 (row B107 in flight), not drift.

### 5. C8.2 filing record: #924, then B126 #1212 (QA-295 fix, merged)
* **Board:** agent-view frame 7, "Record the filings". The design row is `M3-design-2026-11-04/rows.md` C8.2.
* **Concept and challenge:** no concept or challenge of its own. Its design is the r5c BR-11 rule and the 4 Nov rows record (reviewed by Opus).
* **Best in class:** **none.**
* **Differences:**
  * One record per submission group; per filing the number, date and reference; a UCI per person; "Prepared by · Reviewed by"; Correct a number with a reason; read-only after recording. All match the board.
  * Unexplained: the board has an **upload of the "Transaction Approved" page** for the fee receipt. The build has an optional typed "Fee receipt" number (`web/src/runtime/submission.tsx:161`).

### 6. C11.6 channel per form: #1056 (merged)
* **Board:** agent-view frame 6 (⋯ Change channel on each item row) and frame 2. P-122 says the channel is "picked on its row".
* **Concept and challenge:** **none.** The reviewer checked against r5c frames 2 and 6 (`C11.6/review.md`).
* **Best in class:** **none.**
* **Differences:**
  * The words match the board: four ways to file, greyed with IRCC's line, Paper asks why, "Filed through APR Portal" read-only.
  * Unexplained placement: a separate panel, **"How each form is filed"**, above "Prepare application", so each form is listed twice in two panels. The reviewer's m4 flagged it. `C11.6/build-notes.md` says it "moves there with C7.7", but no decision or row records that move.

### 7. C7.7 Prepare application (#357, #709 merged; the tab not built)
* **Board:** P-122 v2 (founder-agreed), r5c frame 6, `prepare-tab` r2 frame 1. All of them draw **one tab, two stage cards** ("1 Get the information · 2 Prepare the filing · Everything"):
  * a "Needs you" list grouped by who owes each item, with a person filter;
  * one row per item (form · document · IRCC step) with seven state words, each step in the row's detail;
  * fees per group.
* **Concept and challenge:** `M3-prepare-application/{concept-draft,challenge}.md` and the `prepare-tab` addendum r2, approved by the tech lead under P-316 (3). `rows.md` C7.7 says the tab is "**the first screen built. It unblocks the most rows.**"
* **Best in class:** `M3-prepare-application/research-agent-view.md` and `research_notes/Agent view and filing UX/agent_filing_ux.md` (Docketwise, INSZoom, Clio, Encompass, GOV.UK). This is research for the board; there is no 4b section in the addendum.
* **Unexplained: the tab is not on `main`.**
  * `web/src/runtime/cases.tsx` has no `/prepare` route and no tabs. The case page is one long stack: People, Documents, the Eligibility card, How each form is filed, "Prepare application" (the old forms panel with its copy blocks), Ready to file, Review, Submission to IRCC, and **the Agent view (stage 1's facts) last**.
  * The words "Get the information", "Prepare the filing", "Needs you" and "Cannot start yet" appear nowhere in `web/src`.
  * The rows show copy pills ("Checked copy, not for filing", "N facts to answer or confirm") instead of the seven state words.
  * Fees are not on screen (B5 is held).
  * No P-decision drops the tab. The 6 Nov sprint plan and the 7 Nov 12-hour plan have no row that builds it; C7.7 is "Partial" in `CAPABILITIES.md`.

## Screens with no best-in-class study of their own (screen-concept step 4b, P-392)
* **C7.6 (B2), C6.4 (B1), C8.2, C11.6** have none.
* **C6.11 and C7.7** have only the board-level research of 26–29 Oct, which predates step 4b.
* **C6.9 / A4** has the study after the fact. 1 of its 8 improvements is built; 7 wait for the founder.
* Also:
  * P-392 says each newly merged screen goes on STATE "For the founder". Only A4 is there (F2). B1, A2/QA-293, B124 and B126 merged after P-392 and are not listed.
  * The 4 Nov challenges and the C6.9 challenge have empty "Lead response" sections, so the approvals exist only on PRs.

## Unexplained drifts, most noticeable first
1. **C7.7: the founder's two-stage Prepare application tab (P-122, P-272) is not built.** Each case is one long page of stacked panels, with the facts at the bottom. C6.4, C7.6, C11.6 and C8.2 were each built as their own panel around the missing tab, and no decision or row says so.
2. **C6.9 keeps "Eligibility" and "Likely / Possibly / Not eligible".** P-236's "Case check from confirmed facts" and "Qualifies · Can't tell yet · Does not qualify" are not applied, although P-316 (1) lifted the hold. `BACKLOG.md` still calls it held, and the capability row already uses the new words.
3. **C11.6: each form's channel is in a separate "How each form is filed" panel**, not on the form's row, so the same form appears twice.
4. **C7.6: the line "Nothing reaches IRCC unreviewed" carries a "Pass with a reason" button** that the case officer can use (P-342 allows the pass; the words were not changed).
5. **C8.2: the fee receipt is a typed number**, not an upload of IRCC's "Transaction Approved" page.

## Verdict for the founder
Not yet. The screens follow his boards' words and rules, with every rule change backed by his later decisions. But the Prepare application tab at the heart of his agreed board is not built, so the parts are stacked on one long page. C6.9 still uses the old outcome words he replaced (P-236). Only C6.9 has had a best-in-class study, and that came after it was built.
