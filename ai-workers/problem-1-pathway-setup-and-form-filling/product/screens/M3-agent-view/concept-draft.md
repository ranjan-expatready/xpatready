# M3 — Agent view and filing (case officer side, end to end) · concept draft r2, m3 lane, 29 Oct

Status: **DESIGN draft for the Lead** (skill `screen-concept`; the fresh-agent challenge is still to run). Board: `design/draft-agent-view.html` (13 frames, "Show labels"). **r2 follows the founder's instructions of 29 Oct (via the Lead):** existing screens are a starting point, never a template (versions compared on evidence, §1c); two stages, the second across mixed channels; the dependency graph and use cases first (§1b); clean, few left panels, detail in drawers, ⋯ and tooltips. It builds on, and does not redo:
* `../M3-prepare-application/`: the concept, the challenge's M1–M7, AV-2 to AV-7, and the v2 board (P-122, the agreed base);
* document first: P-130, P-133, P-134, the report `reports/Document first intake and OCR choice.md` and its research notes (the lean model: Document, ChecklistLine, ReadValue, AnswerConflict);
* the built R1 runtime;
* the team's AG-07 (AG-7-45 Filings) and their case-management screens;
* the research `research_notes/Agent view and filing UX/agent_filing_ux.md` (Lead branch r7, pull request 74): government and tool patterns, graph, use cases, critique, framework.

Scope follows P-129: agent side only. The client and prospect screens come after M3. Every name, value, form, channel and number is **Sample** until the immigration expert confirms. Signing, correction and data-residency points are **Unconfirmed: no counsel**.

## 1. Job and journey
**Job.** The case officer opens a case on a released combination with its people. They collect every fact once, documents first. They confirm the facts section by section. They then produce, sign and record each deliverable of the filing. A changed fact never silently rewrites anything finished.
**Persona.** Case officer or agent, acting as the authorized representative.
**Journey.** Activities 7.1–9.5 on the solution page; WAVE-1 W4; DEMO rows 11, 14, 15, 18.
**Capabilities.** C6.1, C6.3–C6.6, C6.9 (inputs only), C6.10, C7.3, C7.5 (findings only), C7.6, C7.7, C8.1, C8.2, C9.2.

**1b · What depends on what (board frame 0a).** Combination (pinned release) → route (Q2) → channel per form · people on the filing (Q1) → documents per person → facts (document › client › agent, proposed → confirmed by section) → deliverables (form line × person × channel) → signatures (follow the route) → "Ready to file" (only *needed before filing* items) → record (numbers per person) → after filing. **Back-edges**, the reason a wizard fails: a changed fact marks every finished deliverable out of date; an upload adds proposals; a new person adds documents, facts and deliverables; an employer-case change reaches the worker. The screen answers one question: *what stands between this filing and Submit, and who owes it?* **Use cases (frame 0b):** 16, each tied to the frame that carries it; among them a family visitor visa with numbers per person, a spousal PR Portal filing with client e-sign, the same on paper, one application mixing online, PDF upload, signed PDF, paper and a video step, an employer-linked work permit, returned incomplete, a newborn after filing, two officers at once, three filings in one case.

**1c · Earlier designs compared (frame 0c).** v1: keep the Workspace pattern and right panels; no route or stages. v2 (agreed base): keep the deliverable row and the PDF copy; its counts disagree (14 vs 22), its stages are headings only. v3 Split view: strongest (each stage has its own progress, blocker and next action; "Needs attention" with owner); mixed units, three navigation devices. Team mock: keep the blocker → fix link, binder per applicant, waive with a reason; drop the readiness average (hides blockers), ten tabs for one job, channel-less form status. This draft's r1: too many left devices, no video or phone step, no route, nothing after filing. **Chosen:** v3 Split view with units fixed (stage 1 counts sections, stage 2 deliverables), one switch, the attention queue grouped by who owes it as default, one row vocabulary, "needed before" tags, a person × deliverable view, route as a proposal (Q2), after filing in the same view.

## 2. Ten layers
| Layer | Built (R1, `prototype/studio`) | Team (ERv2, read-only, Unverified) | New in M3 |
|---|---|---|---|
| Masters | `DocumentType.suppliesFacts`, `DocumentRequirement` (roles, predicate); `FormEdition.acceptedChannels` | `DocumentRequirement` with alternatives and expiry | `DocumentTypeSupplies` (fact + about whom, replaces `suppliesFacts[]`) |
| Case | `Case`, `PackWorkPin` per case, `AnswerSubject`/`CaseParticipant` (principal · spouse_or_partner · child) | AG-7-45 `Filing` + `CaseApplicant` per filing; frontend roles Principal / Spouse / Dependant / Employee | **`Filing`** (Q1) and an applicant row per filing, holding the application number and UCI |
| Facts | `ClientCanonicalAnswer` append-only, DECLARED/VERIFIED, `sourceJson{channel}` | same shape | `sourceJson` also gets `document_read`, `documentId`, `page` and `onBehalfOf`; `ReadValue` proposals; `AnswerConflict` |
| Documents | none on the case | `CaseDocument` (Not requested … Not applicable), binder | person-owned `Document` + `ChecklistLine` per filing person × requirement |
| Outputs | `FormInstance` copies, `AnswerSnapshot`, lock "Validated copy uploaded back / Filed", out of date / stale, trial gate | FormStatus Not started → Filed, "Mark signed" | deliverable items (line × person × channel), entered ticks with frozen answers, sign steps, validated-copy upload and read-back |
| Filing record | none | `Submission` per case (fileNumber, uci) | per filing; numbers per person |
| Rules | Confirm-section 409, readiness (P-71), `changedFacts` | readiness, deficiencies | BR-1 to BR-14 below |
| Screen | `/cases`, `/cases/:id` (people, AgentView, FormsPanel) | tabs Overview · Binder · Forms · Readiness · Lifecycle … | the "Prepare application" tab (Workspace pattern), which absorbs FormsPanel (challenge M7) |
| AI | none at runtime | AG-08 Reader, AG-11 Checker, AG-03 Qualifier | reader per kind (P-133); AG-11 findings and AG-03 inputs shown only |
| Governance | pin, audit of answers | audit | reasons on every check, acknowledgement, correction and unlink |

## 3. Business rules
* **BR-1 Filing.** A filing is one application to IRCC on one released combination, with its people. A case holds one or more filings (team AG-7-45). Each filing person has their own pin, all on the filing's release. Facts belong to the person, not the filing, so a second filing reads them and copies nothing. Single-filing UI first. **→ Q1**
* **BR-2 Open a case.** A case opens only on a combination that is released and not retired (built). People come only within "Who can be in this application" (role and maximum, P-119). "Will be created as" names the case, its filings, its people and the release.
* **BR-3 Checklist per person.** The checklist comes from the release's document requirements × the person's role × the conditions on that person's facts. It is recomputed when answers change. Each line gives its reason ("Asked because marital status is Married"). Line states use the team's words: Not requested · Requested · Received · Being checked · Approved · Rejected (with a reason) · Not applicable (file kept). "Uploaded to IRCC" is a separate tick. The document belongs to the person and can be reused across cases. A new passport keeps the old one as history ("evidence replaced").
* **BR-4 Fill this from documents** (P-134 D4). This is offered per section and never runs on upload. One reader per kind (P-133): passport coded lines: rules, no AI; printed documents and tables: Textract in Canada (in production); letters and foreign records: AI vision on synthetic documents only.

  Values are stored as proposals (`ReadValue`), apart from the answers, and fill nothing. Typing always works.
* **BR-5 One row per fact.** Each row shows label · value · **Comes from** (Document · type / Client / Agent; "Employer case" for linked facts) · **state** (Missing · Proposed · Confirmed · To check). Everything else goes in the drawer and the ⋯ menu: page, reader, who, when, and the history of values.
* **BR-6 Confirm section** (P-72). One action, on the built route; the 409 is kept when the client changed something meanwhile. A section with a **To check** fact cannot be confirmed. Identity facts read from a document need a one-click "Matches page" each first (**→ Q3**). Background and declaration answers are the client's: shown, never confirmed for the client (P-97). Confirming a document's value makes it VERIFIED, with that document as evidence (research D3: staff only).
* **BR-7 Typed versus document.** A difference opens one check per person and fact, and it blocks (P-71: a conflicting fact). The officer picks the document's value, the client's, or another, with a reason; the other value stays on record. Name differences the passport standard explains (capitals, apostrophes, a shortened coded name) raise nothing. Equal values only add evidence. Two documents that disagree follow the same rule.
* **BR-8 Deliverables** (P-122, Q2). There is one item per form line × filing person × channel. Channels: **Online** (answer sheet), **PDF upload**, **Paper** (print with barcode page → pen → mailed, tracking number), **Signed PDF** (sent → signed scan → uploaded), **Client e-sign** (ticked from the portal) and **Step** (video or phone: booked → done, with a note). One application may mix them all. Every row uses one vocabulary: *Cannot start yet* (says what it waits for) · To do · In progress · Ready · Out of date · Done · *Not needed on this route* (shown, not hidden), and a tag *needed before signing · filing · after filing*. The route is proposed by the combination (Q2); the channel is changed on the row (⋯) within what IRCC and the route accept, and a refused option says why. A form may also carry a "PDF copy, not for filing". PDF steps: fill (confirmed facts only) → our check → download → Validate in Adobe → upload the validated copy → read back by position → Uploaded to IRCC. Our check never says "Validated" (P-46). A form whose fill trial has not passed is "Answer sheet only" (P-65). Online forms: an answer sheet in portal order; the "Entered" tick per screen freezes the answers it covers (challenge M6).
* **BR-9 Ready to file** (AV-7). Only *needed before filing* rows count; the top shows blockers grouped by who owes them (officer, client, employer, IRCC), each saying what it unblocks, never a percentage. **Blocks:** an error in our check; a missing, unconfirmed or To check fact on that form; an out-of-date finished item; a missing signature step. **Warns only:** AI review findings (P-71) and missing documents.
* **BR-10 Signatures follow the account** (AV-3). APR Portal: IMM 5476 signed and uploaded; the representative's own declaration at Transmit. PR Portal: "Client e-signed in the client portal", ticked by the officer from what the portal shows. Paper: pen signatures per form and signer. A child's signer is the line's `signedBy` or the person picked for the child. The product has no "sign for the client" action and never asks for or stores a client's portal sign-in.
* **BR-11 Filing record** (AV-6). Fields: filed in (from the channels); our reference (typed as the APR "case ID"); submitted on (not after today); per person, the application number (required) and UCI; the fee receipt as a document. Recording warns, never blocks, and makes the filing read-only. "Correct a number" keeps the history. Several filings recorded together is one action (team BR-31).
* **BR-12 Out of date** (P-65, C9.2). When a fact changes, drafts recompute; copies are never regenerated by themselves (built). Items that were signed, uploaded, entered or filed get "Out of date". They are never changed. The message names the fact, the old and new values, and the date, with Undo. After filing the item shows "Filed with an earlier value", and a task asks the officer to re-sign or tell IRCC (**Unconfirmed: no counsel**, research D7).
* **BR-13 Employer case link** (P-106, AV-4). Offered only when the filing's forms need employer facts; the officer picks a case under Corporate. The employer facts show read-only as "Employer case" with a link to it. A change there marks this filing's finished items out of date. Unlinking asks for a reason, and the facts then show Missing.
* **BR-15 After filing** (frame 9). Rows from the release's after-filing lines and from IRCC letters uploaded as documents: acknowledgement, biometrics, medicals, document requests with deadlines, interview (video or phone), decision. Returned incomplete reopens the filing on a new round; the first round stays in History. "Record the filing" is refused twice (no double filing).
* **BR-14 Team cuts.** Eligibility: we show only the AG-03 Qualifier's inputs and which are missing. No verdict screen; C6.9 shrinks to inputs. AI form review: we show the AG-11 Checker's findings and acknowledge them with a reason ("Other" needs a note). Findings are advisory (P-71).

## 4. Layout and states
**Pattern.** Workspace (EXPERIENCE §3), v3 Split view fixed. Case tabs, one row: Overview · **Prepare application** · History (the filing record and after-filing rows live inside Prepare application). The header holds the trail, the filing chip (Q1), the route chip (Q2), ⋯ (add a filing, person × deliverable view, history) and three cards that are the only switch: **1 Get the information** (sections) · **2 Prepare the filing** (deliverables) · **Everything**.
* **One left list (340 px).** Default filter "Needs you", grouped by who owes it (You · Client · Employer · IRCC), then Done; chips All and Everyone ▾. Rows: name · one pill · one short line.
* **Right side.** The open item: a section card (frame 2), a document line, or a deliverable's steps (frame 6).
* **Side drawers, never modals:** fill from documents (source page left, proposals right), the check, fact history, acknowledge, record the filing, and the employer link.
* **Little on each row.** Detail goes in the drawer, the ⋯ menu and tooltips (founder rule).

**States drawn (frame 11):** empty (start with the documents), loading, could not load, someone else saved (Reload), read-only after filing, not on the newest release, client's own answers, long family lists, reading, unreadable, no document yet.

## 5. Copy (key strings; the rest is on the board)
* "Fill this from documents" — tooltip: "Reads Client A's uploaded passport and proposes the values it supplies for this section. Nothing changes until you confirm. Typing always works."
* Check: "The client typed a different value from the passport. Choose with a reason; both stay on record."
* Out of date: "The signed copy uploaded 27 Oct is out of date. Date of marriage changed on 29 Oct (12 Jun 2015 → 21 Jun 2015). The signed copy was kept as it was."
* After filing: "Filed with an earlier value. Nothing filed was changed."
* Reference: "Type this as the APR Portal's 'case ID'. IRCC does not use it; it is how you find the filing."
* Channel refused: "IRCC accepts this form as a PDF only."

## 6. Contract sketch and tests
**Reuse (challenge M2).**
`POST cases` gains `filings[]`. · `PUT cases/:id/answers/:subject/:field` gains `markedOutOfDate[]` in its response. · `POST cases/:id/sections/:section/confirm` refuses with 409 `open_checks` when a To check fact is open. · `GET cases/:id/forms`, generate and lock become the PDF item's steps 1–3 and 7.

**New.**
`GET filings/:fid/prepare` → `{filing, people[{subject, role, applicationNumber, uci}], stages[{key, done, total}], items[{id, kind, form?, subject, channel, state, blocks[]}], readiness, version}`. · `GET filings/:fid/checklist?subject=` and `POST checklist-lines/:id/{request|reject|not-applicable}`. · `POST documents` (upload, the person as owner, `onBehalfOf`); `POST sections/:s/read-documents` → `ReadValue[]`; `POST read-values/:id/{matches-page|use|ignore}`. · `POST conflicts/:id/resolve {use, value?, reason, note?}`. · `PATCH items/:id/channel` (refused with `reason` outside `acceptedChannels`); `POST items/:id/validated-copy` (read-back result); `POST items/:id/screens/:k/entered` (freezes the answers); `POST items/:id/sign-steps/:k`. · `PATCH filings/:fid/record`, `POST filings/:fid/record/corrections`. · `PATCH filings/:fid/route` (re-derives channels, refused where a finished item would change); `POST items/:id/steps/:k {done, note}`; `GET filings/:fid/after-filing`. · `POST filings/:fid/employer-link {caseId}` / `DELETE … {reason}`. · `POST review-findings/:id/acknowledge`. · Every write carries a version (409 → Reload). Errors are Problem Details, shown on the field.

**Tests: one pass and one fail per rule, for example:**
BR-1: a family with three applicants gives one filing and three applicant rows; a fourth child above the maximum → refused. · BR-3: married → marriage certificate line; changed to single → line "Not applicable", file kept. · BR-4: upload alone proposes nothing; Fill → proposals; the form is unchanged until confirmed. · BR-6: confirming with an open check → 409; identity facts not matched → refused. · BR-7: an equal value → no check, evidence added; a different one → a check; resolving with no reason → refused. · BR-8: Online on a PDF-only form → refused with the reason; read-back with a shifted value → flagged. · BR-9: an AI finding open → still ready; an out-of-date signed scan → blocked. · BR-11: a missing application number → refused on the field; a date after today → refused; writes after recording → 409. · BR-12: a change after signing → the signed file is byte-identical and marked out of date; Undo clears the mark. · BR-13: a change on the employer case → the worker's uploaded item goes out of date. · BR-8: a row waiting on a missing fact shows "Cannot start yet" with that fact; a form not taken by the route shows "Not needed on …". · BR-15: recording a filing twice → refused; returned incomplete → round 2, round 1 kept.

Also: the keyboard path through the list and the drawers (Esc closes, focus returns); axe on every state; 1440 and 1024 px (P-101 amended).

## 7. Capability or scaffolding (P-33)
| Element | Label |
|---|---|
| Open a case with filings and people; checklist per person; documents owned by the person; fill from documents per section; passport coded-line reader; proposals; source and state per fact; fact drawer and history; Confirm section; identity "Matches page"; typed-versus-document check; deliverables; route proposal; channel per form; Cannot start yet and needed-before tags; video and phone steps; person × deliverable view; after-filing rows; PDF copy; PDF round trip and read-back; answer sheet and entered ticks; signature steps per account; filing record with per-person numbers; read-only and Correct a number; out-of-date marks and the after-filing task; employer link; readiness; every state | **Capability** |
| Textract reader (production, in Canada) | **Capability, not built in M3** (no account; the demo uses rules and synthetic documents) |
| AI vision reader for letters and foreign records | **Capability on synthetic documents only** (P-133); real documents wait for counsel |
| AG-03 eligibility result, AG-11 review run | **Team capability** (we show inputs and findings only) |
| Synthetic passport and other documents; Sample family, employer, LMIA, application numbers and UCIs; replayed AI findings; board "Show labels"; the "Prototype" chrome | **Scaffolding** |
| E-signature service, fees and payment, portal filling (extension, W6), client and prospect screens (after M3) | **Not built here** |

## 8. Build order (slices, after the M2 gate; each ends with an early look)
1. **M3-1 Filing and checklist.** The `Filing` and applicant-per-filing tables (additive migration; the case keeps working); `ChecklistLine` from the release; the "Prepare application" tab with the strip and list, absorbing FormsPanel.
2. **M3-2 Documents in, facts proposed.** Person-owned upload; the passport coded-line reader (rules, US$0); `ReadValue`; the Fill drawer; source chips; `sourceJson` extended.
3. **M3-3 Checks and confirm.** `AnswerConflict` and the check drawer; "Matches page"; Confirm section refuses open checks.
4. **M3-4 Deliverables.** Route (Q2), items, channel on the row, Cannot start yet, needed-before tags, steps (video, phone), person view, PDF copy, validated-copy upload and read-back, the answer sheet with entered ticks (frozen answers), readiness per BR-9.
5. **M3-5 Sign and record.** Sign steps per account, the filing record, read-only, Correct a number.
6. **M3-6 Out of date and after filing.** Extend the built `changedFacts` to entered screens, signed scans, documents and filed items; the after-filing task; after-filing rows; returned incomplete → round 2.
7. **M3-7 Employer link.**
8. **M3-8 Team inputs and the AI reader.** AG-11 findings with acknowledge, the AG-03 inputs list, AI vision for letters on synthetic documents (cost shown first; logged; replays at US$0).

Slices 1–3 come before 4–6; 7 and 8 can run in parallel with 4–6 (different files). Each slice adds files; the shared touch is additive response fields on the built answers and confirm routes, agreed with the runtime lane.

## 9. Conflicts and gaps found (for the Lead)
1. **Application number.** The team keeps it per filing (AG-7-45) and their frontend keeps `Submission` per case. IRCC gives each applicant their own (SA-1B-74). Proposal: per person on the filing's applicant row, shown together on the filing. Tell the team.
2. **Role words.** The team says "Dependant", ours says "Child". They also have "Employee", which has no counterpart here (the employer link replaces it). Name it for the Lead and the team.
3. **"Where it came from".** The team's PROFILE / SQR / OVERRIDE / MANUAL is per form. Ours is per fact: Document / Client / Agent, with no per-form override (P-45). Mapping note for the team.
4. **C6.9 scope.** It reads "staff eligibility page"; this concept cuts it to AG-03 inputs (the brief's lean cut). The Lead rewords C6.9.
5. **P-130's three sources** do not name linked employer facts. This concept shows them as "Employer case", a view of facts held on another case, not a fourth source.
6. **Not checked against a live portal.** Which forms are online, PDF or signed per account stays Sample (expert Q2 of the earlier research).

## 10. Questions for the founder (one at a time, recommendation first)
1. **What is a "Filing"?** In plain words: a filing is one application sent to IRCC, for one released program set-up, with the people on it. The question is whether one case can hold **only one** of them, or **several** (for example, a family where the father applies for a work permit, the mother for an open work permit and the child for a study permit). *Recommend several per case,* as the team's AG-7-45 already decided for Release 1. Each filing has its own forms, documents, signatures and record; each person gets their own application number and UCI; facts are still asked once per person, whichever filing uses them. M3 builds the table now and shows one filing first. *Alternative:* one filing per case, with a separate linked case for each family member's application; simpler today, but it splits the family and diverges from the team.
2. **Bring back the route choice?** The 26 Oct research (AV-1) proposed picking the route first (APR Portal, IRCC Portal, PR Portal or Paper), with each form's channel following it. P-122 (27 Oct) removed the route step: the channel is picked on each form's row. *Recommend bringing it back as a proposal, not a step:* a route chip in the header that the combination fills in, changeable in one click, with each form's channel derived from it and still changeable on the row within what IRCC and the route accept. Why: the route decides which forms exist at all (IMM 5257 is not needed on the IRCC Portal; IMM 0008 is a digital form on the PR Portal), who signs (client e-sign only on the PR Portal) and the "Not needed on …" rows; channels alone let an officer build a mix no IRCC account accepts. *Alternative:* keep P-122 as is (channel per row only).
3. **Identity facts read from a document: does each need its own "Matches page" click before Confirm section (research D5)?** *Recommend yes, for names, date of birth, passport number and expiry only;* the rest of the section is still confirmed in one action (P-72). Why: a 2,784-person study found reviewers accept more wrong values when accepting is easier than correcting. *Alternative:* the whole section in one action, with identity facts highlighted.

*Lead default (not a founder question):* a fact corrected after filing creates a task to re-sign or tell IRCC; whether IRCC must be told is left to counsel (research D7, **Unconfirmed: no counsel**).

## Definition of Ready
- [x] Board drawn: all scope items and every state, little per row, detail in drawers, ⋯ and tooltips
- [x] Every element labelled Capability / Scaffolding / Team / Not built (§7, board "Show labels")
- [x] Data and API needs sketched (§2, §6), reusing the built routes
- [ ] Decisions agreed — Q1–Q3 open (Q2 reopens P-122's route point); conflicts 1–4 need the Lead
- [ ] screen-challenge run by a fresh agent (skill step 9)
- [ ] The Lead's early look and the founder's click-through
