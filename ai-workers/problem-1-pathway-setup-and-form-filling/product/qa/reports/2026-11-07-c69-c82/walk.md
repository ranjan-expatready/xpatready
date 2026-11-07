# qa walk of C6.9 and C8.2 on main after A4 (#1172) and A1 (#1084), 7 Nov 2026, 08:55–09:10 IST: facts only (no verdict here)

**Asked by:** the tech lead (Lead 25, second gate-A go, about 08:50 IST). It asked to re-score C6.9 (the case check from confirmed facts, plus the new rules screen per combination; A1 + A4) and C8.2 (the filing record: portal, reference, application number, UCI; A1) on main's head, by screens plus packs on the checkpoint. The verdict comes from a fresh reader for each row. One M2 confirmation covers the four merges. It also asked for screenshots of C6.9's new screen at 1440 and 1024 (P-392).
**Commit tested:** `73ae633f2` (#1084's merge; tree `4d80ee538f7c8254376dd965449113f649068f30`), on top of `ef120fdd8` (#1172's merge) and `7636ba859`.
* **#1172 (A4, B106), the app change:**
  * `web/src/components/eligibility-gates-editor.tsx` (new): the "Eligibility rules (staff check)" section and its Edit dialog on a combination's Smart questionnaire (SQR) tab;
  * `web/src/components/conditions.tsx` (`only="person-questions"`) and `web/src/pages/combination.tsx` (the mount);
  * `api/src/eligibility.ts` (the empty-value refusal);
  * `tests/check_b106_gates_browser.cjs`; the route line removed from `route-has-screen-allow.txt`.
  * The PR claims no Works: that "needs qa's walk on main, and A1 for the checkpoint".
* **#1084 (A1, B104), the app change:**
  * `api/src/features/checkpoint/105-stage-one.ts`, `api/src/checkpoint-stage-one*.ts` and `samples/checkpoint-stage-one.json`: J7 Stage 1 on the configured checkpoint (who signs each form line, the IRCC account APR Portal, the gates and judgement lines);
  * checks `check_b104_checkpoint.ts`, `check_b104_stage_one.ts`.
**Money:** live AI off. Each copy printed `STUDIO_*_LIVE vars in env: 0`; no priced button pressed; the checkpoint loader says "No live AI call was made (US$0)". No GitHub run dispatched by qa.
**Copies (P-372 (4)):** each was started and stopped in one command, the stop in a shell trap. qa_c69a :4470 (packs), qa_c69b :4471 (B104 check), qa_c69w :4472 (walk). Each trap printed "port listener after stop: none" and "dropdb … exit 0". Nothing listens on 4470–4479 afterwards; `xr_studio_qa270` (not this session's) was left untouched.
**Not runnable here:** Playwright's Chrome (sandbox). So `check_b106_gates_browser.cjs`, the headless replays and axe were not run on the Mac; they rest on GitHub (below). The pane was hidden: the walk used emulated 1440×900 and 1024×800 viewports. The screenshots in this folder come from the pane, at 800 px wide.

## GitHub runners (P-339)
| Run | Tree | Result |
|---|---|---|
| Merge-queue **42330190044** ("merged #1172, #1084", sha `fa9476f32`, parents `9b69abb60` + `84289249b`) | `4d80ee538f7c8254376dd965449113f649068f30` = **main `73ae633f2`'s tree** | **51 jobs: 50 success, `guard` skipped.**<br>`regression-plan`: "Protected regression set (M2 · Works): 60 capabilities, 40 with an acceptance pack, 40 re-run."; all 40 `regression (C…)` jobs success.<br>Shards: `check_b106_gates_browser.cjs` PASS, 186 s, **69/69**; `check_b104_checkpoint.ts` PASS; `check_b104_stage_one.ts` PASS |
| `C6.9.test.ts`, `C8.2.test.ts` on main's tree, on the checkpoint | — | **Not run on GitHub.** Both are M3 packs, outside the protected set, and the merge queue runs only that set. qa's nightly dispatch was refused by this session's permission check earlier today (C6.4 round); it was not tried again |

## Machine runs on the Mac (`73ae633f2`, exit codes)
| Run | Copy | Result |
|---|---|---|
| Demo › Load the configured checkpoint (route, as the author) | qa_c69a | exit 0, 62 s |
| `acceptance/C6.9.test.ts`, on the checkpoint alone (no fixture setup) | qa_c69a | **exit 0, 15/15** (was 2/15 on 5 Nov) |
| `acceptance/C8.2.test.ts`, on the checkpoint alone | qa_c69a | **exit 0, 12/12** (was 11/12 on 5 Nov, red C8.2-7 = QA-247) |
| `tests/check_b104_stage_one.ts` | qa_c69a | exit 0, 16/16 |
| `tests/check_b104_checkpoint.ts` | qa_c69b | exit 0, 11/11 |

## By screens: C6.9 (qa_c69w :4472)
1. **Load:** Acting as › Configuration author › Demo › Load the configured checkpoint… › Load. "Configured checkpoint loaded in 59.8 s", "No live AI call was made (US$0)". Rows 1 and 3–11 read Done and row 2 Parked, as before.
2. **J-A1, the author:** Immigration programs › Open: Visitor visa. The header reads "**In Release 6** · draft matches the release · … filing: Mixed: online and PDF". J-A1's text says "In Release 2"; #1084 names the difference: the page numbers releases by the workspace's release pack.
3. **The new section (A4):** the Smart questionnaire (SQR) tab, at the end. "**Eligibility rules (staff check)** · Rules the answers settle, per person · Draft matches the release · Released in Release 6 · Edit":
   * "Passport number and expiry date answered (Sample) · Released · Met when: Passport number is answered and Passport expiry date is answered · If not met: Not eligible";
   * "Answered no to the criminal history question (Sample) · Released · Met when: Criminal history is no · If not met: The representative reviews it (Possibly eligible)";
   * "Officer's judgement, not checked by rules": the four lines (money, health, ties, leaving Canada); the disclaimer "(Sample default)"; "Saved by Configuration author, 7 Nov, 08:59".
   * Screenshot `1-eligibility-rules-released-1440.jpg`.
4. **Edit, refused, then a new gate:**
   * Edit opens "Edit the eligibility rules", focus in Gate 1's label. Add a gate › Save the eligibility rules with the new gate empty: "Some details need fixing". On the field: "Give the gate a label: what a person reads beside its result." (`aria-invalid`, described by the note) and "A gate needs a rule the answers on file can settle…". Nothing is saved; focus stays on the dialog.
   * Gate 3: label "Passport number answered (qa Sample)"; the field box "Passport number" resolves to "Number of the passport or travel document · text"; the comparison is "is answered"; If not met: Not eligible (`2-dialog-new-gate-refused-then-filled-1440.jpg`). Save: the dialog closes; "**Draft: 1 change**"; the gate reads "**New in draft** · Met when: Passport number is answered · If not met: Not eligible"; "Saved by Configuration author, 7 Nov, 09:02. Submit it on Review and release; a content reviewer signs it and an approver releases it."
   * Screenshots `3-eligibility-rules-new-in-draft-1440.jpg`, `4-eligibility-rules-new-in-draft-1024.jpg` (no sideways scroll at 1024: scrollWidth 1009) and `5-edit-dialog-1024.jpg`.
   * The "If not met" radios are wrapped in their labels ("Not eligible", "The representative reviews it (Possibly eligible)") inside a fieldset.
5. **Release, by the existing flow:**
   * Review and release lists "Gate: Passport number answered (qa Sample) — rule: person.passport_number is answered · added". Submit for review: "Submitted by Configuration author, today at 9:03 a.m.". The author's "Approve and release" is disabled.
   * Approver › Approve and release before the sign-off: `POST …/approve` **409** "Release refused: 1 change needs the content reviewer's SME sign-off." (shown on screen as a brief message).
   * Content reviewer › Select all I can sign › Sign 1: "1 of 1 rule, document, check or AI-proposed changes signed", "signed by Content reviewer".
   * Approver › Approve and release: **201**, "Released version 3", "Last released: version 3, in Release 7, by Approver".
6. **The case (case officer):**
   * Open a case › "Visitor visa · release 3", QA-JA4-0711, "Sample Gate Visitor". The case reads "Release 3" and "**Filed through APR Portal: set by the combination, not on the case**".
   * Open eligibility › "This application · release 3 · staff only: the client never sees a verdict" › Run eligibility check: "**Possibly eligible — needs 3 facts**". The rules: "Not answered · Passport number and expiry date answered (Sample)"; "Not answered · Answered no to the criminal history question (Sample)"; "**Not answered · Passport number answered (qa Sample)** · Passport number → Answer in the Agent view". Below them the four officer's-judgement lines, the disclaimer, and "Run by Case officer · 7 Nov 2026, 09:05 · release 3" (`6-case-check-lists-new-gate-1024.jpg`).
7. **J-A1's end, the override:** Override result… › Keep the override with nothing filled. Refused on the fields: "Give a label for the override." and "Give a reason for the override." (`aria-invalid`, described by the notes).
8. **Wrong role, by route** (`PUT /api/combinations/:id/eligibility-gates`, body `{}`):
   * Approver **403** "Approver (simulated) does not hold the author duty";
   * Content reviewer **403** "… does not hold the author duty";
   * Case officer and Client A **403** "… works on cases; the configuration is read in the Product Studio by its own people.";
   * The author's GET: 200, three gates.

## By screens: C8.2 (qa_c69w :4472)
9. **Setup, not under test:** a Visitor visa case of two (QA-C82-0711, "Sample Record Client", "Sample Record Spouse") was brought to Ready to file with the C8.2 pack's own helpers (`openCase`, `readyToFile`: fill, validate round trip, sign by hand, the representative's review, pass warnings with a reason). It ran from a script in this session's scratchpad, not committed; result "ready: 2". J-B2's screens for reaching Ready to file belong to row B2 and were not re-walked.
10. **Record the submission (case officer, 1440):**
    * The case page › "Submission to IRCC · Record what IRCC acknowledged, once per submission. A recorded submission is read-only." › "One submission for 2 people applying" › both filings "Ready to file" › **Record the submission…**
    * The dialog: "One record for the whole submission, as IRCC acknowledged it through **APR Portal**. It cannot be undone…". Per filing: Application number (hint "like W123456789 (Sample pattern)"), Submitted on (today, "Not after today"), Our reference (pre-filled QA-C82-0711-1 and -2), Fee receipt (optional). Below: a UCI per person (optional).
    * Record with the numbers empty: refused on both fields, "Give the application number IRCC gave this filing: it is required to record the submission.", with focus on the first.
    * With W300000001, W300000002 and the client's UCI 1111-1111: the dialog closes. "**Recorded · read-only**"; each filing reads "Submitted", its application number, "November 7, 2026 · through APR Portal", our reference, "Fee receipt: None given", the UCI ("Sample Record Spouse: none given · Add…"), "Prepared by · Reviewed by: Case officer · Representative" (`7-c82-submission-recorded-1440.jpg`).
11. **Correct a number:** the spouse's › "The number recorded now, W300000002, stays in the history with your reason." No reason: refused on the field, "Give the reason in words: it is kept in the history with the change." With W300000020 and a reason: "Corrections · Nov 7, 2026, 09:08 a.m.: Case officer corrected W300000002 to W300000020: “Typo … (Sample, qa)”". The two "Correct a number…" buttons have the same accessible name, with no person.
12. **By route** (`PATCH /api/runtime/groups/:id/record` on the recorded group):
    * the case officer **409** "This submission is already recorded: it is read-only. A wrong application number is fixed with "Correct a number".";
    * Client A **403** "Only the case officer can do this.";
    * the author **403** "Configuration author (simulated) works on configuration, not on cases.";
    * the solo firm **404** "No such case.".
13. **Next step:** C9.2 (a changed fact marks submitted items stale), Partial since 5 Nov with its own pack red on the checkpoint. Not walked to its end. In the Agent view the person tabs ("Sample Record Client") did not switch on a scripted click, and step 14 stopped the representative's answer.
14. **Seen in passing (both on QA-JA4-0711, opened by screens and never submitted, and on QA-C82-0711):** the Agent view's "**The representative**" tab › "Your designated individual" › City or town of a contact address › Add › "Hamilton" › Save. The dialog stays, saying "**That person is not on this case.**": `PUT /api/runtime/cases/:id/answers/representative/person.addr…` **404**. The section offers Add on 9 contact facts that fill IMM 5476 (and IMM 5475) for the representative ("9 missing"); none can be saved from this tab. `putAnswer` (`api/src/runtime.ts:317`) looks for a participant whose subject id is the literal `representative`. Not checked on earlier commits.
