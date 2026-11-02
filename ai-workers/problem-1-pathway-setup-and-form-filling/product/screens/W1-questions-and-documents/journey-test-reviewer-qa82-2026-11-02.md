# Journey test: QA-82 question words (reviewer, 2 Nov, PR #469 at f995d29d)

- Setup: detached worktree at f995d29d with its own `vite build`. Isolated copies: wp.family sample on :4449 (`xr_studio_rv_qa82`) and the Visitor visa runtime on :4442 (`xr_studio_rv_r1`, after `setup_visitor_visa.ts` 13/13).
- How I walked it: headless Chrome through Playwright, by role and visible text only (scratchpad `journey.cjs`). Screenshots are in the scratchpad `shots/`: questions-tab-400/1024/1440, details-1440, preview-1440.
- US$0. I did not use :4400.

## Journeys
1. **Content publisher, main path.** "Which questions still need wording?" Steps: open wp.family, then Questionnaires. Expected: every unwritten question shows a short name and a visible mark.
2. **Content publisher, keyboard only.** Steps: Tab to a question, Enter. Expected: Details opens.
3. **Approver, wrong role.** Expected: the same marks, read-only.
4. **Publisher, Preview (the step across the screen boundary).** Expected: Preview shows the same short words and never "No question written yet".
5. **Client, Visitor visa case, client mode.** Expected: every question can be answered as asked (read through the client questionnaire API and the r1c browser suite).
6. **Recovery and regression.** Expected: the existing client journey (r1c) still runs.

## What happened
| # | Result |
|---|---|
| 1 | Held. All 7 open rows read "Service language · No question written yet", "Subject is principal applicant · …" and so on. No row shows the definition. First view took 1.36 s on a busy machine (the builder's suites were running at the same time). |
| 2 | Held. Tab reaches "Details of: Service language" and Enter opens the dialog. The dialog does not show the field's meaning, so the author never sees what the field means (review S1). |
| 3 | Held. The approver sees the same 7 marks. |
| 4 | Held. Preview shows short names with the key under each, and no mark. The preview API has no duplicate label for a person. |
| 5 | **Failed.** The client reads "Disorder requiring services", "Status violation canada", "Violent organisation association", "Criminal history", "Accompanies subject to canada", "Has children" as yes/no questions, with no hint text. The definition, which carries the legal scope (arrested / charged / convicted …), is gone. On main the client read the definition. (review B1) |
| 6 | **Failed.** `check_runtime_r1c.cjs` stopped at 14/15: `getByRole('group', { name: /Official language/ })` timed out because the group is now "Service language". The same suite on the base gave 125/125. (review M1) |

## Automated checks (journey 1–4)
- axe WCAG 2.2 A/AA: Questions tab 0 violations, Details 0.
- No sideways scroll at 400, 1024 or 1440 px.
- No console or page errors.
- check_c41_questionnaire_roles: 9/9 on the head, 6/9 with main's engine.
- check_engine 43/43 · check_case_engine 61/61.

## Data underneath
- The contract change is additive (`asked: boolean`) and nothing is written.
- `asked:false` holds exactly for placements with an empty `question_text`. The 7 shown rows match the database.
- factName gives no collisions: all 186 c1-draft keys map to unique names.

## Break-it (short)
- Odd key names: "Us PR card expiry date", "Requires trv", "Tb history or contact", "Uscis number", "… canada" (lower case). Minor; review S3.
- Mark explanation only in `title`: hover only. Minor; review S2.
- Two tabs and duplicates: not relevant, because this change is read-only.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Author: yes. Client: cannot answer background questions accurately (journey 5) |
| Next step obvious | 1 | "No question written yet" tells the author what to do |
| Plain words | ½ | Tab fine; client sees key names, "subject", "canada" |
| Feedback and state | 1 | Mark visible to both roles |
| Correct data | 1 | `asked` matches the database; no label collisions |
| Error recovery | ½ | The existing client suite r1c breaks (journey 6) |
| Accessibility and screen sizes | ½ | axe 0, keyboard OK, 3 widths OK; explanation only on hover |
| Speed | 1 | No new requests; tab 1.36 s under load, earlier runs of the same tab under 1 s |
| Visual quality | 1 | Muted mark in the team's style |
| Trust and sources | ½ | The definition, the only accurate wording, is lost to the client and the author |
| **Total** | **7/10** | **Fail** (pass is 8 or more) |

**To raise it, most valuable first:**
1. Keep the meaning for the client on unwritten questions (raises task, plain words and trust).
2. Get r1c and the qa r1c walk green (error recovery).
3. Show the meaning in Details and move the mark's sentence out of `title` (accessibility and trust).

## Could not test
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- 200 % zoom on the client page.
- The full batch.

## Round 2 (f00b6ea0, reviewer, 2 Nov)
- Setup: a detached worktree at f00b6ea0 with its own `vite build`. Copies ran on :4449 (wp.family) and :4442 (Visitor visa, setup 13/13). Never :4400, US$0. Screenshots are in the scratchpad `shots2/`.
- **Journeys 1–4** all held:
  - The tab shows 7/7 short names. Each has the visible mark "No question written yet (the field's name is shown)".
  - Keyboard: Tab, then Enter, opens Details.
  - Details now opens with "Meaning: …".
  - The approver sees the same marks. Preview shows no mark.
- **Journey 5 (client):** held. The client questionnaire API reads the full meaning for the background questions ("Whether the person ever committed, was arrested for, charged with or convicted of …"), as on main.
- **Journey 6 (regression):** held. r1c 125/125, r1d 86/86, r1a 99/99, case_engine 61/61, check_engine 43/43, c41 9/9.
- **Fail test:** with round 1's engine, c41 gives 8/9. Only the new B1 step fails.
- **Automated checks:**
  - axe: 0 violations on the tab and in Details.
  - No sideways scroll at 400, 1024 or 1440 px.
  - No console errors.
  - Tab first view: 1.54 s, with the runtime suites running at the same time.
- **Break-it:** the same field reads "US PR card expiry date" on the Questions tab and "Us PR card expiry date" in Shared library, because the library's copy of the helper was not updated (review S3). Minor.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The author sees which questions need wording. The client can answer with the legal scope. |
| Next step obvious | 1 | The visible mark says what to do |
| Plain words | ½ | The tab and Shared library differ on abbreviations (S3), and "Subject is …" uses an internal word |
| Feedback and state | 1 | The mark is visible to both roles |
| Correct data | 1 | `asked` matches `question_text`, and the client label is unchanged from main |
| Error recovery | 1 | The runtime group is green |
| Accessibility and screen sizes | 1 | axe 0, keyboard works, 3 widths with no sideways scroll, mark text visible |
| Speed | 1 | No new requests |
| Visual quality | 1 | Muted mark, and the meaning at the top of Details |
| Trust and sources | 1 | The definition is kept for the client and shown in Details |
| **Total** | **9.5/10** | **Pass** |

**Could not test:**
- A real screen reader.
- An intended user's unaided walk (D17/D20).
- The qa r1c walk and the full batch.

## Round 3 (3d650ed7: merge of main + C4.11 test-step wait)
- No QA-82 product code changed: the merge equals the clean auto-merge, and 3d650ed7 touches only `check_forms_c411_draft_qd_browser.cjs`.
- I re-ran the crossing to the next screen, Draft questions and documents → Open To review, on :4448 (`STUDIO_SLOW_QD_STEP=400`). It gave **19/19**, landing on `/review/proposals?group=combination:<id>` with no console error. `check_c41_questionnaire_roles` gave **9/9**.
- **Score: 9.5/10, pass (unchanged from round 2).** It could not be tested beyond this, for the same reasons as round 2.
