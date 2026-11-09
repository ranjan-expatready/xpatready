# B135 · C6.13 Filing changes while preparing: concept

Status: **DESIGN, revision 2 after the fresh challenge** (`challenge.md`: "Build after these changes", 1 Blocker, 7 Majors, 7 Minors; every one answered below, §9). The tech lead approves case screens after the challenge (P-223 (4), P-316 (3)). Branch `claude/intelligent-noether-qkzc6a`, screens lane, 7 Nov 2026. No code yet. Board: `design/draft-filing-changes.html` (intent, not pixels, P-44). It is built on the founder's boards `screens/M3-agent-view/design/draft-agent-view.html` (P-164, frame 1 "Filings in this case": *"Filings are derived, never added by hand"*) and `screens/M3-prepare-application/design/draft-prepare-application-v2.html` (P-122). The UX lane's study `design/best-in-class-m3-case-screens-2026-11-07.md` (P-407) is not on `main` yet; its scorecard is answered when it lands.

Row (BACKLOG B135, P-406, on `lead/2026-11-07-lead30`): make principal and remove a filing before it is filed, with a named warning when other filings depend on it. Filings, fees and forms are re-derived (C6.12). A submitted filing is refused in words; withdrawal is the team's (C8.4, SI-18). Pack C6.13 exit 0 on the checkpoint; Opus review.

## 1. Job and journey
**Job.** While preparing, the case officer fixes who files. Two typical cases: *"the spouse should be the principal"*, or *"this child's application was added by mistake"*. Before confirming, the officer sees every other filing that changes, and how.
* **Who:** case staff of the case's firm (officer, representative of record). A client and configuration people never can (403).
* **When:** after the case opens (C6.1), and while no filing of the case is recorded as submitted (C8.2).
* **Team requirements:**
  * AG-07 AG-7-45 rule 9 and BR-31: Make principal swaps roles. Remove filing is for "a filing added by mistake", not Withdraw. The principal cannot be removed ("Make someone else principal first"). Removing "shows a warning and never blocks". Needs `agent/case:edit`.
  * AG-7-4 rules 1-3.
  * AG-7-50: Withdraw is the team's (C8.4).
  * SA-1B-219 rule 12: inputs follow the new principal. Its rule 5 fires on the team's withdraw or refusal, so it is C8.4's, not this row's.

## 2. Ten layers (`STANDARDS.md` §2)
| Layer | In the app | In the team's code | New here |
|---|---|---|---|
| Data | `CaseParticipant.role` and `.applies`; `Filing` per (case, person), `active`, ids kept (C6.12); `FilingApplicant`; `FilingItem.active`; `FilingRecord` (C8.2) | no `Filing` table | **migration, one new table only:** `filing_change` (append-only: case, kind, subject, other subject, roles before and after, reason, basis, by, at; trigger refuses update and delete) |
| Rules | `filingPlan`, `deriveFilings`, `confirmation` (engine/runtime/case.ts), `signersOf`, `refuseIfCaseRecorded` | — | `engine/runtime/filing-changes.ts`, pure: legality, swap, the shared before/after derivation (M7) |
| API | `PATCH /runtime/cases/:id/people/:subject` {applies} (C11.12; tests only, no screen) | — | `POST /runtime/cases/:id/filing-changes` (preview and apply). The PATCH runs through the same service (M4) |
| UI | "People on this case" chips (cases.tsx) | — | "People and filings" table, row menu, two dialogs, Undo toast |
| AI | none | none | none (rules only; identical with AI off) |

## 3. Business rules
* **BR-0 Only where every person files their own application (M5).** Make principal and Remove filing are offered only when every applying role of the case's release is "files own" (Visitor visa on the checkpoint). Otherwise the menu and the API (422) say: "Changing the principal or removing a filing is not worked out yet for <combination>: its people are on the principal's application." The reason: a filing keyed by the principal would change id.
* **BR-1 Remove filing: the person stops filing and stays on the case.** Their `applies` flag goes to false, the C11.12 "not travelling" fact, so filingPlan gives no filing. Answers, uploads, the filing id and its items are kept (`active=false`). They come back with **Add filing back** (C6.12 "ids stay"). Removing the person from the case is AG-7-107's, not here.
* **BR-2 The principal's filing is never removed.** The principal's menu holds "Remove filing" as a refused item with its reason, "Make someone else principal first". The API refuses with 422 in the same words (AG-7-45 r9).
* **BR-3 Make principal swaps two roles, between the principal and the spouse or partner only.** The chosen person takes `principal`; the former principal takes the spouse or partner role (AG-7-45 r9; OpenSPP's "Previous Head's New Role"). A child cannot swap with a parent: the parent would become "child". The menu says so and suggests a case of the child's own (Q1, agreed by the challenge). The chosen person must be travelling; otherwise: "Add their filing back first: the principal always files their own application."
* **BR-3b The client stays the same person (Blocker; Q0 for the founder).**
  * The case's client, the household's login, keeps answering. Their own answers stay their own after the swap.
  * `confirmation()` (case.ts:55-68) stops keying on `role === "principal"` and reads **the client's person**. That is the principal when the case opened, or the former principal of the case's first `make_principal` change (from `filing_change`; pure `clientPersonOf`).
  * So no answer becomes confirmed or unconfirmed by a swap. Pass and fail tests compare the per-answer confirmation before and after (C6.13-6b).
  * The words "answered by the principal" become "answered by <client's name>" when the client is not the principal.
* **BR-4 What changes is named before it happens.** The preview and Prepare application call one shared pure derivation (M7) on the case as it would be. It lists, per filing **by person's name**:
  * applicants joining or leaving;
  * fee lines moving or changing (family maximum, amounts from the cited fee table) and the submission total;
  * items that stop or start applying, marked "filled" or "signed" when they were;
  * a Ready to file mark taken back;
  * the household questions now asked of someone else (a count);
  * **who signs for a minor child** (the role-based signer moves to the new principal, signing.ts:24-30, M6), with forms already signed by hand named "signed by <old signer>: to be signed again" (a warning, C8.1 decides the rest).

  The filings that change are the **dependants** named in the warning (P-406; AG-7-45 r9 "shows a warning and never blocks").
* **BR-5 Dependants in our model:** derived, none typed.
  * (a) In the same submission group, fee lines change: the family maximum is carried by the principal's filing (C6.12 BR-18). This is the checkpoint case.
  * (b) A minor's signer moves (BR-4).
  * (c) A co-filed filing (sponsor) is never removed alone. This is C11.12's existing refusal; Visitor visa has no sponsor, so C6.13 cites that check and does not re-test it.

  SA-1B-219's declared `dependsOnRole` is **Not built**: it fires on the team's withdraw or refusal (Q2, agreed).
* **BR-6 Warn, never block. A reason is required, kept on a row (M3).**
  * Each change writes one `filing_change` row with its reason, read back on the person's row ("Removed 7 Nov by the case officer: …"), as the C6.12 split keeps its reason.
  * Apply sets every changed or re-added filing marked Ready to file back to **Not started** (M2: C7.6 alone would not, because a fee change keeps a filing "ready").
  * The representative's review follows C7.6's fingerprint, widened by C8.3 (B144).
  * The stored applicant role is refreshed by a swap. `sameApplicants` compares the role too (m2): a one-line change in `case-prepare.ts` once C3/C4 merge, named in the PR.
* **BR-7 Nothing changes once anything is recorded (M1).** Submissions are recorded per submission group. If any filing of the case has a `FilingRecord`, all three changes are refused, case-wide, as `refuseIfCaseRecorded` already does. The words name the recorded filing: *"<name>'s application was recorded as submitted to IRCC on <date> (<number>), so the people and filings of this case are not changed here. Taking back a submitted application is done in the case's lifecycle (not built here)."* The person's row says the same. "Withdraw" is avoided (PRODUCT §4 gives it another meaning, m7).
* **BR-8 Stale preview refused.** The `basis` is the hash of the preview's own result (people, roles, travelling, ages, groups, fees; m3). Apply sends it; a different result returns 409 "This case changed since you opened this. Look again." and nothing changes. One change at a time, under the case row lock (as `updatePerson`).
* **BR-9 Who:** case staff of the case's firm only. Client 403, configuration 403, another firm 404 (C6.11 BR-20).
* **BR-10 One door (M4).** `PATCH …/people/:subject {applies}` keeps its shape for existing callers. It runs the same service: same refusals (BR-0, BR-2, BR-7) and a `filing_change` row with "set by the travelling flag" as its reason. The screen uses only the new route.
* **BR-11 Undo (m4)** sends the inverse change named in the apply's answer, with the reason "Undo: <reason>" and the new basis.

## 4. Layout (EXPERIENCE §3 "Dialog"; §2.8 in-page confirmation)
* **The table.** The chips become a **People and filings** table: person, role in the release's own words with ⓘ, filing, status from the Prepare view, and the row menu.
* **The row menu.** ⋯ lists the row's actions, each with one line of consequence. A refused action stays in the list with its reason (GOV.UK, Polaris), so the principal's row has a menu too.
* **The dialogs.** Title: the question with the name. Body: what stays; then "N other filings change", one card per filing; then the reason field. The button names the action.
* **Undo** is in the toast.
* **States:**
  * only the principal: the menu items are refused, with reasons;
  * loading: skeleton rows;
  * conflict (BR-8);
  * read-only: anything recorded (BR-7);
  * long names wrap;
  * keyboard: menu and dialog fully reachable; focus returns to the row.

## 4b. Best in class
All read 7 Nov 2026 from each project's published source. This session's network blocks the doc sites and vendor help centres, so each page was read in the repository that publishes it. Evidence: `best-in-class-sources-2026-11-07.md`.

**Not opened, so not cited:** Docketwise, INSZoom, LawLogix, Clio, TurboTax, Healthcare.gov, Jira, NN/g. Their pages need those hosts allowed (a gap for the UX lane's study, P-407).

| Who | Best at | Source and quote |
|---|---|---|
| OpenSPP (open-source social registry), "Change head of household" | The change also says what the old head becomes | `github.com/OpenSPP/OpenSPP2/blob/19.0/spp_change_request_v2/details/change_hoh.py`: "The new role for the previous head (e.g., Spouse, Other Adult)" |
| OpenSPP, same request | Refuses in words | `…/strategies/change_hoh.py`: "No new head of household selected." |
| GitHub, delete a repository | Names what else goes with it before confirming | `github.com/github/docs/…/deleting-a-repository.md`: "will delete all forks of the repository" |
| GOV.UK Design System, Button | No silent disabled buttons | `github.com/alphagov/govuk-design-system/…/button/index.md`: "Disabled buttons have poor contrast and can confuse some users, so avoid them if possible." |
| Shopify Polaris, Button and Modal | Say why something is unavailable; the title is the question | `github.com/Shopify/polaris/…/button.mdx`: "make it clear why the button is disabled and what needs to be done to enable it"; `…/modal.mdx`: Do "Delete customer?" |
| Carbon, danger modal · GOV.UK warning text | Confirm only for real loss; warn about consequences | `carbon-design-system/carbon-website/…/modal/usage.mdx`: "an action that would result in a significant data loss"; `govuk-design-system/…/warning-text/index.md`: "legal consequences of an action" |

**Copied:**
* The swap names the old principal's new role (OpenSPP).
* The dependants are named by person before confirming (GitHub).
* Refused actions stay visible, with the reason and the way out (GOV.UK, Polaris).
* Titles are the question with the name (Polaris).

**Beaten:**
* GitHub and Polaris confirm a loss that cannot be undone. Here nothing is lost (answers, uploads and ids are kept), so the dialog says what stays and the toast offers Undo.
* The dialog shows the **numbers that change** (fees per filing, the submission total) from the same derivation as Prepare application, checked equal by test C6.13-6c.

**Effort:** one menu, one dialog, one reason. Nothing is typed twice. Errors are caught before the click (child, not travelling, recorded).

## 5. Copy
* Role ⓘ: "The principal applicant carries the family's capped fees, answers the household questions and signs for a minor child. Change it with Make principal."
* Remove item: "Remove filing… <name> stays on the case, not travelling." Principal's refused item: "Make someone else principal first."
* Child: "<name> is a child of the principal: a child cannot swap with a parent. To make a child the principal applicant, open a case for them."
* Reason error: "Write a reason: it is kept with the change." Toast: "<name>'s filing removed. Fees worked out again. Undo".

## 6. Contract and tests
**Contract.** `POST /runtime/cases/:id/filing-changes` {kind: `make_principal`|`remove_filing`|`add_back`, subject, basis?, reason?, preview?: true}:
* preview: 200 {basis, changes: [{filing, person, words[]}], totals: {before_cents, after_cents}};
* apply: 200 {done, undo};
* refusals: 400 reason · 409 basis or recorded · 422 rule refusal · 403 / 404.

`contracts/runtime.ts` changes are additive (`FilingChange`).

**Pack** `acceptance/C6.13.test.ts`, on the checkpoint, with the pack's `FAMILY`: Sample Client A, Sample Spouse A, Sample Child A1 (10), Sample Child A2 (15), all travelling, as C6.12. Visa CAD 400 and biometrics capped at CAD 170 (3 eligible), so CAD 570 in all.
* 1 pass: the preview of removing Sample Spouse A's filing names Sample Client A's and Sample Child A2's filings with the biometrics change; total CAD 570 → CAD 470.
* 2 fail: apply without a reason gives 400.
* 3 pass: remove gives 3 filings, visa CAD 300, biometrics 2 × 85 = CAD 170 with no cap; items inactive; a `filing_change` row holds the reason.
* 4 pass: add back returns the same filing id and item ids.
* 5 fail: the principal's Remove gives 422 "Make someone else principal first".
* 6 pass: make principal swaps the roles; the capped lines move to the new principal's filing.
* 6b pass: every answer's confirmation is unchanged (BR-3b).
* 6c pass: the preview's "after" equals the Prepare view after apply (M7).
* 6d pass: the minor's signer is named in the preview.
* 7 fail: a child gives 422.
* 8 fail: a person not travelling gives 422.
* 9 fail: a stale basis gives 409, and nothing changed.
* 10 fail: with one filing recorded, all three changes give 409, with the date and "case's lifecycle".
* 11 fail: client 403, configuration 403, another firm 404.
* 12 pass: the PATCH door writes a `filing_change` row and refuses the principal.
* 13: a screen walk at 1440 px (Playwright: menu, dialog names, Undo).

**Unit checks** of `filing-changes.ts` and `clientPersonOf`: one pass and one fail per BR.

## 6b. Capability or scaffolding (P-33) · proof (P-26)
Everything above is capability, *Needed for the proof*.

**Not built:**
* combinations with people on the principal's application (BR-0);
* `dependsOnRole` (Q2);
* removing a person from the case (AG-7-107);
* taking back a submitted application (C8.4, SI-18).

## 7. Questions (recommendation first)
* **Q0, for the founder through the tech lead (Blocker):** after Make principal, who is the client whose own answers count as given (P-78, P-242)?
  * **Recommend: the client stays the same person.** The login does not move. Only the fee lead, the household questions and a minor's signer move, each named in the preview.
  * The alternative follows the team's "the case's principal is the case's client" (AG-7-4 r1). Then the new principal needs the login, and everything the old client typed for themselves waits for confirmation.
* **Q1, for the tech lead:** Make principal only between the principal and the spouse or partner? **Yes** (the challenge agrees).
* **Q2, for the tech lead:** SA-1B-219 `dependsOnRole` Not built here? **Yes**: its trigger is the team's withdraw or refusal (C8.4).
* **Q3, for the tech lead:** `case-prepare.ts` (C3/C4).
  * The shared derivation (M7) lives in the engine.
  * The one-line `sameApplicants` role fix (m2) and the call into the engine are made after those PRs merge, named in the PR.
  * The migration (one new table) is read by the tech lead.

## 8. Ready
* **Acceptance test:** `acceptance/C6.13.test.ts` (C6.13-1…13).
* **Row text:** BACKLOG B135.
* **Decisions:** P-406 (1), P-169, P-155, P-78.
* **Open:** Q0 (founder), Q1-Q3 (tech lead).

## 9. Answers to the challenge
* **Blocker:** answered by BR-3b, Q0 and test 6b.
* **Majors:**
  * M1: BR-7.
  * M2: BR-6.
  * M3: BR-6 and the `filing_change` table.
  * M4: BR-10.
  * M5: BR-0.
  * M6: BR-4 and test 6d.
  * M7: BR-4 and test 6c.
* **Minors:**
  * m1: the pack's names and family, totals corrected on the board.
  * m2: BR-6.
  * m3: BR-8.
  * m4: BR-11.
  * m5: citations in §1 and BR-4.
  * m6: tests 11 and BR-5 (c).
  * m7: BR-7 wording, release role words, the principal's refused menu item.
