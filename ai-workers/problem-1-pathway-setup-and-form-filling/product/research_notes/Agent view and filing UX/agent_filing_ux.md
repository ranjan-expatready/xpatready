# Agent view and filing UX — research notes (29 Oct 2026)

For M3 Prepare application. Builds on, without repeating, `screens/M3-prepare-application/research-agent-view.md` (IRCC's three representative accounts, PDF Validate and barcodes, who signs: 26 Oct), `concept-draft.md` (BR-1…BR-10) and `challenge.md` (M1–M7). Sources read 29 Oct; vendor pages are marketing or help articles, not tested products. All IRCC channels per form stay **Sample until the immigration expert confirms**; what a representative may lawfully do stays **Unconfirmed: no counsel**.

## (a) Patterns from governments

**IRCC (Canada).** See the 26 Oct note §1–§2. For layout: (1) the *account* (APR Portal, IRCC Portal, PR Portal, paper) decides whether a form is a digital form, a PDF upload or not needed; (2) the PR Portal's Submit button stays disabled until "all signatures, declarations and validations are complete" — IRCC's own hard gate; (3) the client e-signs in their own portal, never the representative. Since the PR Portal accepts all family reunification files ([Settler guide](https://www.settler.ca/english/representative-pr-portal/)), a spousal case with a dependent child is one portal application with one profile per person and per-person digital forms, plus PDF uploads.

**GOV.UK Service Manual.**
* *Complete multiple tasks (task list)* — long transactions over several sessions; verb-named tasks, grouped into steps, any order; few statuses ("Completed", "Incomplete", optionally "Not yet started", "In progress"); "There is a problem" in red only for errors; **"Cannot start yet"** in grey, not linked, for a task that waits on another; the user marks a section done by answering "Have you completed this section?" ([pattern](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)).
* *Check answers* — one page before submission for small transactions; for large ones, a check page at the end of each section; Change links return the user to the check page ([pattern](https://design-system.service.gov.uk/patterns/check-answers/)).
* *Question pages* — one thing per page by default, but internal services for "users who need to repeat and switch between tasks quickly" may group questions; ask each piece of information only once ([pattern](https://design-system.service.gov.uk/patterns/question-pages/)). For us: one-thing-per-page suits the **client** questionnaire; the officer is an expert user and should get grouped, dense sections.
* *File upload* — improved component (March 2025); upload only what is critical; let users reuse a file already uploaded in the journey ([component](https://design-system.service.gov.uk/components/file-upload)). The Ministry of Justice splits one-at-a-time from batch upload and warns batch upload is more error-prone ([MoJ pattern](https://design-patterns.service.justice.gov.uk/patterns/upload-files)).

**USCIS (United States).** The representative prepares the form and G-28; the client enters a **representative passcode** in their own account, reviews and e-signs ([USCIS account](https://uscis.gov/file-online/how-to-create-a-uscis-online-account); [USCIS Tech Talks, Dec 2024](https://uscis.gov/sites/default/files/document/outreach-engagements/USCISTechTalks-December102024.pdf)). Same model as IRCC: the client signs in their own account; we only record that they did.

**Australia ImmiAccount.** Separate Individual and Organisation accounts; registered migration agents use an organisation account, attach evidence by **document category** per applicant, and must check the application's message area rather than rely on email ([secondary guide](https://www.australianmigrationlawyers.com.au/news-and-updates/how-to-create-an-immi-account)).

**New Zealand Immigration Online.** Advisers submit for the client after the applicant signs a declaration (Section A always; Section B if the adviser keeps acting; Section C if someone only records information). Information entered by another person "is considered to be information provided by me" ([INZ applying on behalf](https://www.immigration.govt.nz/assist-migrants-and-students/advise-migrants/applying-on-behalf-advisers); e.g. [INZ 1226](https://www.immigration.govt.nz/documents/forms-and-guides/inz1226.pdf)). The declaration is a **prerequisite to submit**.

**Estonia and Singapore (once-only).** Singapore's MyInfo pre-fills verified data with consent ([GovTech](https://www.tech.gov.sg/media/no-more-repetitive-form-filling-after-you-tell-us-once-for-government-services/)); Estonia's tax return is one-click confirmation of known data ([Scoop4C](https://scoop4c.eu/node/418)). Lesson: show the proposed value with its source and ask for **confirmation**, not re-entry — our "Confirm section" (P-72) with AI-read facts.

## (b) Patterns from professional tools

| Tool | What they do | What to take |
|---|---|---|
| **Docketwise** (US immigration) | Smart Forms 3.0 (June 2025): one intake questionnaire per client fills every form; **Packet Assembly** combines forms and evidence into one packet with an automatic table of contents; Assemble tab links contact, matter and preparer; custom questions include document requests ([launch post](https://www.docketwise.com/blog/introducing-smart-forms-3/); [help](https://support.docketwise.com/en/articles/5791576-smart-forms-version-3-0-with-packet-assembly)). | The *packet* as the unit that is filed, with its own contents list. |
| **INSZoom / Mitratech** | Case created from corporation and client records (sponsor and beneficiary filled automatically); questionnaire and **documents checklist sent automatically when the case is created**; a corporate documents checklist; HR portal ([Mitratech help](https://success.mitratech.com/INSZoom/Help_Articles/Settings/How_do_I_auto_send_Questionnaire_and_docs_Checklist_when_Case_is_created); [Case module](https://success.mitratech.com/INSZoom/Help_Articles/Case%2F%2FMatter_Module)). | Stage 1 starts itself at case creation; employer facts held once (matches P-106). |
| **Visto, VisaFlo** (Canada) | AI preparation and IMM auto-fill ([VisaFlo](https://vflo.inblog.ai/about-us); [CB Insights on Visto](https://www.cbinsights.com/company/visto/people)). | Too little public detail; book a demo. |
| **Clio Draft** | Questionnaires with conditional logic, AI-drafted questions limited to what the templates need; answers map to template fields ([Clio Draft](https://www.clio.com/ca/draft/automated-legal-client-questionnaires/)). | Ask only what the forms of *this* combination need (questions derived from forms). |
| **Intuit ProConnect** (tax) | Three tiers on a **Check Return** tab: *Fatal* (the agency will reject), *EF Critical* (e-file is greyed out until fixed), *Critical* (risk, does not stop e-file); a reviewer may tick **Ignore**, with a warning ([Intuit help](https://accountants.intuit.com/support/en-us/help-article/diagnostics/common-questions-diagnostics-suggestions-tax/L7zsvPBVt_US_en_US)). | Severity is tied to the **channel**: a rule can block e-filing but not paper. |
| **Drake Tax** | Red messages block e-file, black ones are notes; double-click jumps to the field, highlighted; **changing a return after it is queued removes it from the queue**; a pending-acknowledgement message blocks retransmission ([Drake KB 10117](https://kb.drakesoftware.com/KB/Drake-Tax/10117.htm); [16040](https://kb.drakesoftware.com/kb/Drake-Tax/16040.htm)). | Each finding links straight to the field; a later change invalidates "ready" (our BR-7); guard against double filing. |
| **ICE Encompass** (mortgage) | Every condition has a **"Prior To"** milestone (Approval, Docs, Funding, Closing); one Conditions tab; each condition has details, status, attached documents and role permissions to clear it ([Conditions](https://help.icemortgagetechnology.com/documentation/encompass/Content/encompass/settings/Conditions.htm); [Enhanced Conditions](https://help.icemortgagetechnology.com/documentation/encompass/Content/encompass/settings/enhanced_conditions.htm)). | Tag every requirement with **"needed before: signing / filing / after filing"** instead of a flat block-or-warn. |

Common shape: **intake once → derived checklist → per-item status → tiered review gate → packet → transmit → acknowledgement**, list left, work right. None handles mixed channels in one filing: our gap to fill.

## (c) Dependency graph (an IRCC filing)

```
Combination (pinned release)                     e.g. PR › Family › Spouse, inland/outland
  │ decides
  ├─► Route (APR Portal | IRCC Portal | PR Portal | Paper) ──► channel per form (Online | PDF upload | PDF paper)
  └─► People on the filing (sponsor, principal applicant, spouse, child ×n; age, accompanying?)
        │ decide (via who / onlyIf on release lines)
        ├─► Questions per person ──► Facts (client answer | AI-read document | officer) ──► CONFIRMED
        │                                                     ▲                          │
        │                          read-back / AI reading ────┘                          │ fill
        ├─► Documents per person (passport, police, marriage cert once per couple) ──────┤
        │                                                                                ▼
        └─────────────────────────────────────────────────────────────►  Forms per person × channel
                                                                            │ Online: answer sheet → "entered" per screen
                                                                            │ PDF: fill → our check → Adobe Validate → upload → read back
                                                                            ▼
                                       Signatures (follow the route: client e-sign in portal | rep declaration | pen + barcode page)
                                                                            ▼
                                       Fees + IMM 5476 + declarations  ──►  READY TO FILE gate
                                                                            ▼
                                       Submission (per person: application number, UCI; fee receipt)
                                                                            ▼
                     Post-filing: AOR, biometrics instruction letter, medicals, document requests, returned-incomplete → resubmit, decision
Back-edges (the reason a wizard fails): a changed fact → every finished form, entered screen or signature using it goes STALE;
an uploaded document → new proposed facts; a new person (newborn) → new questions, documents and forms.
```

Good products expose this as blockers linked to the field (Drake, ProConnect), "Cannot start yet" rows (GOV.UK) and a milestone per condition (Encompass). Our board should answer one question at the top: **"What stands between this filing and Submit, and who owes it?"** — grouped by owner (officer, client, employer, IRCC).

## (d) Use cases the agent view must handle

1. Spousal sponsorship, sponsor + principal applicant + one child, PR Portal: client e-signs; mix of digital forms and PDF uploads.
2. Same, but on paper: pen signatures per form and person, barcode page on top.
3. Work permit outside Canada with an employer case linked (LMIA or offer number read-only from the employer case).
4. Visitor visa for a family of four in one filing; each person gets their own application number and UCI.
5. A fact changes after the client signed (e.g. marriage date): signed copy goes stale, never edited; re-sign.
6. AI reads a passport and proposes six facts; the officer confirms with the document image beside the fields.
7. Background questions answered "yes" by the client: the officer cannot confirm for them; extra form or letter appears.
8. A required document missing at filing time: warns, the officer files with a note (IRCC's portal checklist may differ).
9. A form not needed on the chosen route: shown as "Not needed on the PR Portal", not hidden.
10. A newborn added after submission: post-filing addition through the web form.
11. Returned incomplete in the PR Portal: reopen, fix, resubmit; history kept.
12. Two officers on one case; one edits while the other has the item open (conflict and reload).
13. One person on two programs, or three combinations in one case (TAXONOMY rows 2 and 20) — still unresolved, see challenge M1.
14. Post-filing: biometrics letter, medical instructions, procedural fairness letter with a deadline.
15. Bulk entry: address and travel history (ten rows) typed fast with the keyboard, pasted from a client's spreadsheet.

## (e) Critique of our boards v2 / v3 and the team's mock

**v2 (deliverables checklist).** *Strong:* the deliverable as the unit (one row per thing to produce or submit, each with its own state) is right; the "PDF copy, not for filing" line is honest; block-vs-warn sentence is clear. *Weak:* (1) **counts disagree** — the list says "14 items", the strip adds up to 22 (4 sections + 9 forms + 6 documents + 3 signatures), the headline says "5 of 14". (2) Stage 1 and Stage 2 are only list headings, so the founder's "two stages" ask is cosmetic. (3) It **drops the route** ("no route step") although the 26 Oct research (AV-1) showed the route decides which forms exist at all; the channel switch per row lets the officer build a combination no IRCC account accepts. (4) "Everyone ▾" filters, but no person × deliverable matrix. (5) Dependencies implicit ("After forms are final"), no "Cannot start yet". (6) No post-filing.

**v3 (two-stage split, plus Command view and v2 for comparison).** *Strongest of the three*, for three reasons: each stage has its own progress, blocker and next action (the founder's split is structural, not a heading); the **Needs attention** queue gives a reason and an owner per row ("Block", "Waiting", "nudge the client"); and it shows a dependency in words ("wait for confirmation — unblocks 3 items"), which is exactly what (c) asks for. *Weak:* (1) **units still mix** — "9/11 facts confirmed" in the stage card but "3 of 4 sections confirmed" in the strip; pick sections (the officer confirms sections). (2) Three layouts on one board show indecision; Command view hides the inventory one click down, and the stage cards, the segment filter and the five-part strip are three navigation devices for one choice. (3) Same missing route and person matrix as v2. (4) No split view for confirming AI-read facts beside the document. (5) Nothing after "Record the filing". **Verdict: build from v3's Split view, drop Command view as a layout but keep its attention queue as the default filter, and fix the units.**

**Team mock (`code/ERv2-frontend@24cae6b-2026-10-28/src/features/case-management/`; capture not re-verified against live).** There is no left navigation: a header, **ten tabs in one row** (`case-workspace-page.tsx`: overview, binder, forms, readiness, lifecycle, tasks, notes, timeline, time, portal) and a **right rail** (`workspace/case-rail.tsx`) with a readiness meter, the first three blockers each with a "fix" link to the right tab, and the team. *Good, worth keeping:* the deep link from blocker to fix; findings with severity CRITICAL/MAJOR/MINOR/INFO and a **waive with its own permission and a reason** (`readiness-tab.tsx`, like ProConnect's Ignore); the Binder grouped **per applicant** with document states (Pending → Requested → Uploaded → Under review → Approved / Rejected / Not applicable), translation and notarisation sub-steps and reuse from another case (`binder-tab.tsx`, `case-types.ts`); per-field source on form review (Profile, SQR, Override, Manual, Empty). *Weak:* (1) the readiness meter is the **average of four percentages** (`case-logic.ts:395`) — a 75% score can hide a critical blocker; show blockers, not a score. (2) The form status NOT_STARTED → IN_PROGRESS → READY → GENERATED → SIGNED → FILED has **no channel** and no stale state; a portal form is never "generated", a PR Portal form is never pen-signed. (3) Forms is a flat table with the applicant as a column, not grouped by person or channel. (4) Submission is one per case and **blocked** by the readiness gate (`case-store.ts:217–225`), while our rule is warn, never block (BR-9), and IRCC needs numbers per person. (5) Per-form override conflicts with P-45 (already noted in concept-draft §8). (6) Ten tabs split one job (prepare and file) across Binder, Forms, Readiness and Lifecycle — four places for one question.

## (f) Recommended framework for our agent view (10 bullets)

1. **One "Prepare application" tab with two stage views and one inventory** (v3 Split view): Stage 1 *Get the information*, Stage 2 *Prepare the filing*, and *Everything*; it replaces the team's Binder + Forms + Readiness split for the officer's preparation work and absorbs our FormsPanel (challenge M7).
2. **Route first, channel per form inside it.** A route chip in the header (APR Portal, IRCC Portal, PR Portal, Paper) proposed by the combination; it generates the deliverables and their channels; per-form changes only where the library allows; unneeded forms show as "Not needed on …".
3. **Deliverable = release line × person × channel**, each with a channel-specific state chain and one shared vocabulary on the row: *Cannot start yet · To do · In progress · Ready · Stale · Done* (GOV.UK's small set plus our stale state); details of the chain live in the right panel.
4. **Person × deliverable matrix as a second view** of the same inventory (rows people, columns Facts / Documents / Forms / Signatures), so a family file shows at a glance who is behind; the list stays the working view.
5. **"Needed before" on every requirement** (Encompass's Prior To): *before signing*, *before filing*, *after filing*. "Ready to file" lists only open *before filing* items; everything else warns. Severity can depend on the channel (ProConnect's e-file vs paper).
6. **One blocker queue at the top, grouped by who owes it** (officer, client, employer, IRCC), each row with the reason, what it unblocks ("unblocks 3 items") and a link that opens the exact field or item (Drake, team rail). No percentage score.
7. **Split view for confirmation**: document image or client answer on the left, proposed facts on the right, with source per value; "Confirm section" as the section's check-answers step (GOV.UK per-section check answers; MyInfo confirm-not-re-enter). Client-owned questions are visible but not confirmable by the officer.
8. **Expert-grade data entry**: grouped dense sections (GOV.UK's exception for expert internal users), autosave on leaving a field with a visible "Saved" state, validation on leaving the field and a summary at the section check, table entry for histories (add row, paste rows, keyboard only), every action reachable by keyboard with focus returning after a panel closes; meet WCAG 2.2 3.3.7 Redundant Entry ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)).
9. **Change never edits finished work**: a fact change marks signed copies, entered screens and uploads stale with the reason and every place affected, and removes "ready" (Drake's queue rule); undo available; the history keeps the old copy.
10. **Filing and after-filing as part of the same view**: record per person (application number, UCI, fee receipt), a double-submit guard, then a post-filing list (acknowledgement, biometrics, medicals, document requests, returned incomplete → resubmit) with deadlines, and a full audit trail of every tick, confirmation, waiver and reason.

*Open, for the founder: whether a stale item blocks "ready to file" (concept Q1; this note recommends yes, as a "before filing" item). For the immigration expert: route and channel per form for the five Retail combinations (26 Oct Q2).*
