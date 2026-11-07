# B135 · C6.13 Filing changes while preparing: concept

Status: **DESIGN** (screen-concept; P-223 (4): the tech lead approves case screens after a fresh challenge, P-316 (3)). Branch `claude/intelligent-noether-qkzc6a`, screens lane, 7 Nov 2026. No code yet. Board: `design/draft-filing-changes.html` (intent, not pixels, P-44), built on the founder's boards `screens/M3-agent-view/design/draft-agent-view.html` (P-164, frame 1 "Filings in this case": *"Filings are derived, never added by hand"*) and `screens/M3-prepare-application/design/draft-prepare-application-v2.html` (P-122). The UX lane's study `design/best-in-class-m3-case-screens-2026-11-07.md` (P-407) is not on `main` yet: its scorecard is answered when it lands.

Row (BACKLOG B135, P-406, on `lead/2026-11-07-lead30`): make principal and remove a filing before it is filed, with a named warning when other filings depend on it; filings, fees and forms re-derived (C6.12); a submitted filing refused in words (withdrawal is the team's, C8.4, SI-18); pack C6.13 exit 0 on the checkpoint; Opus review.

## 1. Job and journey
**Job.** While preparing, the case officer fixes who files: *"Client B should be the principal"* or *"Client C's application was added by mistake"*, and sees, before confirming, every other filing that changes and how.
* **Who:** case staff (officer, representative of record). A client and configuration people never (403).
* **When:** after the case opens (C6.1) and before the filing is recorded as submitted (C8.2). Typical triggers: the spouse holds the job offer; a child no longer travels.
* **Team requirements:** AG-07 AG-7-45 rule 9 and BR-31 (Make principal swaps roles; Remove filing for "a filing added by mistake", not Withdraw; the principal cannot be removed: "Make someone else principal first"; `agent/case:edit`), AG-7-4 rules 1-2, AG-7-50 (Withdraw: the team's, C8.4), SA-01B SA-1B-219 rule 5 (dependent filings warned, "the officer decides. Warn, never block") and rule 12 ("the principal changes: inputs follow the new principal").

## 2. Ten layers (`STANDARDS.md` §2)
| Layer | In the app | In the team's code | New here |
|---|---|---|---|
| Data | `CaseParticipant.role` and `.applies`; `Filing` per (case, person) with `active`, `FilingApplicant`, `FilingItem.active` (ids kept, C6.12); `FilingRecord` (C8.2) | no `Filing` table (AG-7-45 §3) | none: no migration. Reasons go in the audit entry (`detail` json) |
| Rules | `filingPlan` + `deriveFilings` (engine/runtime/filings.ts, filing-modes.ts); `refuseIfCaseRecorded` | — | `engine/runtime/filing-changes.ts` (pure): legality, the swap, the before/after diff |
| API | `PATCH /runtime/cases/:id/people/:subject` {applies} (C11.12, no screen yet) | — | `POST /runtime/cases/:id/filing-changes` (preview and apply) |
| UI | case page "People on this case" chips (cases.tsx) | — | "People and filings" table, row menu, two dialogs, undo toast |
| Audit | `Audit.log` | BR-18 audit | entries `filing.principal_changed`, `filing.removed`, `filing.restored` with reason |
| AI | none | none | none (rules only; identical with AI off) |

## 3. Business rules
* **BR-1 Remove filing = the person stops filing, stays on the case.** For a person who files their own application: `applies` → false (the C11.12 "not travelling" fact; filingPlan then gives no filing). Their answers, uploads, filing id and items are kept (`active=false`) and come back with **Add filing back** (AG-7-45 r9; C6.12 "ids stay"). Removing the person from the case is AG-7-107's, not here.
* **BR-2 The principal's filing is never removed.** No Remove on the principal's row; the row says "Make someone else principal first"; the API refuses (422) in the same words (AG-7-45 r9, AG07-D27(6)).
* **BR-3 Make principal swaps two roles.** The chosen person takes `principal`; the former principal takes the chosen person's former role (AG-7-45 r9). Offered only for the **spouse or partner**: a child cannot swap with a parent (the parent would become "child"); the menu says so and suggests a case of their own (**Q1**). The chosen person must be travelling; else "Add their filing back first: the principal always files their own application" (BR-2 of filingPlan). Answers stay under each person (AG-7-4 r3); questions, forms, documents and fees re-derive from the new roles on the next read (C6.12); cross-person inputs follow the new principal (SA-1B-219 r12).
* **BR-4 What changes is named before it happens.** Preview runs the same derivation on the case as it would be and lists, per filing **by person's name**: applicants joining or leaving, fee lines moving or changing (family maximum, with amounts from the cited fee table), items that stop or start applying (with "filled"/"signed" when they were), a Ready to file mark taken back, the household questions now asked of someone else (count). Filings that change are the **dependants** named in the warning (SA-1B-219 r5; P-406).
* **BR-5 Dependants in our model**, all derived, none typed: (a) people on the filing (on the principal's / declared only) move with the principal; (b) a co-filed filing (sponsor) is never removed alone (C11.12 BR-6, existing refusal); (c) filings in the same submission group whose fee lines change (family maximum carried by the principal's filing, C6.12 BR-18). SA-1B-219's declared `dependsOnRole` is **Not built**: no release declares one, and in M3 only the principal's filing has dependants and it cannot be removed (**Q2**).
* **BR-6 Warn, never block; reason required.** A change that moves other filings needs a written reason (as the C6.12 split); kept in the audit entry with before and after. Ready to file marks on every changed filing go back to In progress (C7.6's own rule on read); the representative's review follows C7.6's fingerprint, widened by C8.3 (B144).
* **BR-7 Submitted is refused in words.** A filing with a `FilingRecord` (recorded as submitted, C8.2): no menu; the row and the API (409) say *"…recorded as submitted to IRCC on <date> (<number>), so it is not changed here. Withdrawing a submitted application is done in the case's lifecycle"* (C8.4, SI-18). Make principal is refused when any filing of the case is recorded (existing `refuseIfCaseRecorded`).
* **BR-8 Stale preview refused.** The preview returns a `basis` (hash of the case's people, roles, travelling flags); apply sends it; a different basis → 409 "This case changed since you opened this…", nothing changed. One change at a time under the case row lock (as `updatePerson`).
* **BR-9 Who:** case staff of the case's firm only; client 403, configuration 403, another firm 404 (C6.11 BR-20).

## 4. Layout (EXPERIENCE §3 "Dialog", in-page confirmation §2.8)
The chips become a **People and filings** table (person, role ⓘ, filing, status from the Prepare view, actions). Row menu ⋯ shows only what the row allows, each item with one line of consequence. Dialogs: title = the question with the name; body = what stays, then "N other filings depend on this one and change", one card per filing; reason field; danger button names the action. Undo in the toast (Remove → Add filing back; Make principal → Make <former> principal). States: empty (only the principal: no menu items, tooltip says why) · loading (skeleton rows) · conflict (BR-8) · read-only (recorded) · long names wrap · keyboard: menu and dialog fully keyboard, focus returns to the row.

## 4b. Best in class
All read 7 Nov 2026 from the projects' own published source (this session's network blocks the doc sites and vendor help centres, so each page was read in the repository that publishes it). **Not opened, so not cited:** Docketwise, INSZoom, LawLogix, Clio, TurboTax, Healthcare.gov, Jira, NN/g; their pages need the hosts allowed (a gap for the UX lane's study, P-407).
| Who | Best at | Source and quote |
|---|---|---|
| OpenSPP (open-source social registry), "Change head of household" | The change also says what the old head becomes | `github.com/OpenSPP/OpenSPP2/blob/19.0/spp_change_request_v2/details/change_hoh.py`: "The new role for the previous head (e.g., Spouse, Other Adult)" |
| OpenSPP, same request | Refuses in words | `…/strategies/change_hoh.py`: "No new head of household selected." |
| GitHub, delete a repository | Names what else goes with it before confirming | `github.com/github/docs/…/deleting-a-repository.md`: "will delete all forks of the repository" |
| GOV.UK Design System, Button | No silent disabled buttons | `github.com/alphagov/govuk-design-system/…/button/index.md`: "Disabled buttons have poor contrast and can confuse some users, so avoid them if possible." |
| Shopify Polaris, Button and Modal | Say why something is unavailable; the title is the question | `github.com/Shopify/polaris/…/button.mdx`: "make it clear why the button is disabled and what needs to be done to enable it"; `…/modal.mdx`: Do "Delete customer?" |
| Carbon, danger modal · GOV.UK warning text | Confirm only for real loss; warn about consequences | `carbon-design-system/carbon-website/…/modal/usage.mdx`: "an action that would result in a significant data loss"; `govuk-design-system/…/warning-text/index.md`: "legal consequences of an action" |

**Copied:** the swap names the old principal's new role in the dialog (OpenSPP); the dependants are named by person before confirming (GitHub); refused actions stay visible with the reason and the way out (GOV.UK, Polaris); dialog titles are the question with the name (Polaris). **Beaten:** GitHub and Polaris confirm a loss that cannot be undone; here nothing is lost (answers, uploads, ids kept), so the dialog says what stays and the toast offers Undo, and it shows the **numbers that change** (fees per filing, the submission total) from the same derivation as Prepare application, so the two screens always agree. **Effort:** one menu, one dialog, one reason; nothing typed twice (answers stay with each person); errors caught before the click (child, not travelling, submitted).

## 5. Copy
* Role ⓘ: "The principal applicant carries the family's capped fees and answers the household questions. Change it with Make principal."
* Remove item: "Remove filing… — <name> stays on the case, not travelling." · Principal row: "Make someone else principal first to remove this filing."
* Child: "<name> is a child of the principal: a child cannot swap with a parent. To make a child the principal applicant, open a case for them."
* Reason error: "Write a reason: it is kept with the change." · Toast: "<name>'s filing removed. Fees worked out again. Undo".

## 6. Contract and tests
`POST /runtime/cases/:id/filing-changes` {kind: `make_principal`|`remove_filing`|`add_back`, subject, basis?, reason?, preview?: true} → preview 200 {basis, changes: [{filing, person, words[]}], totals: {before_cents, after_cents}} · apply 200 {done, undo} · 400 reason · 409 basis/recorded · 422 rule refusal · 403/404. `contracts/runtime.ts` additive (`FilingChange`).
Pack `acceptance/C6.13.test.ts` on the checkpoint (VV family of three adults-and-15, as C6.12): 1 pass preview names Client A's and Child A2's filings with the biometrics change · 2 fail apply without reason 400 · 3 pass remove: 2 filings, visa CAD 200, biometrics CAD 170 (2×85), items inactive · 4 pass add back: same filing id and item ids · 5 fail principal's Remove 422 with "Make someone else principal first" · 6 pass make principal swaps roles, capped lines move to the new principal's filing, answers unchanged (sql) · 7 fail child 422 · 8 fail not travelling 422 · 9 fail stale basis 409, nothing changed · 10 fail recorded filing 409 with the date and "lifecycle" · 11 fail client 403, configuration 403 · 12 pass audit entries with reason · 13 screen walk at 1440 px (Playwright: menu, dialog names, undo). One pass + one fail per BR; unit checks of `filing-changes.ts`.

## 6b. Capability or scaffolding (P-33) · proof (P-26)
Everything above is capability, *Needed for the proof*. Not built: `dependsOnRole` (Q2); removing a person from the case (AG-7-107); Withdraw (C8.4, SI-18); a filing history panel (audit only).

## 7. Questions for the tech lead (recommendation first)
* **Q1** Make principal only between principal and spouse or partner? **Recommend yes**: a parent-child swap breaks every "child of the principal" fact and form box; AG-7-45 r9 is silent on it.
* **Q2** SA-1B-219's declared `dependsOnRole`: **recommend Not built in C6.13**; the derived dependants of BR-5 meet the row on the checkpoint; it lands with the Study permit filings (P-319 order), where the spouse's open work permit depends on the student.
* **Q3** Files under build: `case-prepare.ts` (C3/C4) is read, never changed; the preview calls the engine directly. If the build needs a change there, it waits for those PRs and says so.

## 8. Ready
Acceptance test `acceptance/C6.13.test.ts` (C6.13-1…13). Row text: BACKLOG B135. Decisions: P-406 (1), P-169, P-155; open: Q1-Q3 for the tech lead.
