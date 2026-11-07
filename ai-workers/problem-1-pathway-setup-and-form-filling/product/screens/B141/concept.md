# B141 · C7.8 Add a library form to one filing: concept

Status: **DESIGN** (screen-concept; P-223 (4): the tech lead approves case screens after a fresh challenge, P-316 (3)). Branch `claude/intelligent-noether-qkzc6a-b141` from `origin/main` 1e1ca443e, screens lane, 7 Nov 2026. No code. Board: `design/draft-add-library-form.html` (intent, not pixels, P-44), from the founder's boards `screens/M3-prepare-application/design/draft-prepare-application-v2.html` (P-122: "Prepare the filing" deliverables list, one row per item) and `screens/M3-agent-view/design/draft-agent-view.html` (P-164 frame 6). The UX lane's study (P-407) is not on `main` yet: its scorecard is answered when it lands.

Row (BACKLOG B141, P-406, on `lead/2026-11-07-lead30`): the officer adds a form to one filing; a mapped form fills from the case, an unmapped one is the blank official PDF; it lists on Prepare application (C7.7) and goes through Ready to file (C7.6); pack exit 0; Opus review. Team: SA-1B-177.

## 1. Job and journey
**Job.** *"This client also needs IMM xxxx on their application"*: the case officer adds one form from the firm's library to one filing, and gets it filled from the facts on file when the library has a map for it, or the blank official PDF to fill by hand when it has none; either way it is then prepared, checked and filed like every other form.
* **Who:** case staff of the case's firm. Client and configuration: 403.
* **When:** during Prepare the filing, before Ready to file. Typical: an officer's judgement that the file needs an extra declaration or supplementary form the combination does not list.
* **Not:** changing the combination (configuration, S5) or every case; adding a document (C6.4 checklist).

## 2. Ten layers
| Layer | In the app | New here |
|---|---|---|
| Data | release pin (the case's forms and field maps come from the frozen snapshot, `s.forms`, `s.field_maps`); library `FormEdition` (official file, sha256), `FormFieldMap` (status); `FilingItem` (kind form, per filing and person, channel) | **migration** (one new table): `case_added_form` (case, filing, person, form number, edition id, frozen map json + sha256, mapped words, channel, added by/at/reason, removed by/at/reason) |
| Rules | `releaseForms`, `formCoverage`, `wantedItems`, C7.6 readiness | `engine/runtime/added-forms.ts` (pure): eligibility, the frozen map, coverage, merge into the case's forms |
| API | `GET /library/forms` (list, filters, `fieldMapState`) | `GET /runtime/filings/:id/addable-forms`, `POST /runtime/filings/:id/added-forms`, `DELETE …/added-forms/:id` (reason) |
| UI | Prepare application deliverables list (C7.7) | "+ Add a form" on each filing's list → side panel (EXPERIENCE §3 Side panel) with search and the two kinds |
| AI | none | none (identical with AI off) |

## 3. Business rules
* **BR-1 One filing, one person.** The form is added to the chosen filing for one person on it (the filing's principal by default; any applicant on it can be chosen). Never to the combination or other cases (P-319: no form number in code; the list comes from the library).
* **BR-2 What can be added**: library forms of type "form" with a current edition, not retired, not already on that filing for that person (from the release or added) → else refused in words ("IMM xxxx is already on Client A's filing"). A guide or checklist is never offered (it is read, not filled).
* **BR-3 Frozen when added** (as the release pin, C1.x): the edition and its **approved** field map rows are copied into the row with a fingerprint; a later library change never changes this case's form; a newer edition shows "Adopt update" as for release forms (P-151).
* **BR-4 Mapped fills, unmapped is blank.** Mapped (at least one approved field-map row): filled by the existing filler from **confirmed facts only** (P-72), with coverage "18 of 24 boxes fill from the case; 6 by hand". Unmapped (no approved row): "Blank official PDF: fill it by hand", a download of the edition's official file (sha256 checked) and an upload of the completed copy. Neither kind ever invents a value.
* **BR-5 Facts not on file**: a box whose fact the case has no confirmed answer for stays blank and is listed "Not on file" (the questionnaire is the release's; the added form does not add client questions) (**Q1**).
* **BR-6 Channel** from what the library says IRCC accepts for the form (C11.6 rules); the default is PDF upload; Paper only as C11.6 allows.
* **BR-7 Then like any form**: listed on Prepare application with an "Added by the case officer" tag and its reason; through C7.6: a barcode form still needs its own Validate (the one block, P-144/P-315); a blank form without its completed upload is a CRITICAL warning "Filled by hand: upload the completed copy" (passable with a reason, P-237); signatures as the library line says (C8.1); out of date as C9.2; the representative's review covers it (C8.3).
* **BR-8 Remove** with a reason before the filing is recorded (kept as removed, history); after recording, refused in words (C8.2 lock).
* **BR-9 Who:** case staff of the firm; client 403; configuration 403; other firm 404; a filing recorded as submitted 409.

## 4. Layout
On each filing's deliverables list (C7.7): a quiet "+ Add a form" after the forms. It opens a side panel (480-560 px): search by number or title; each result shows number, title, edition, and a tag in words: **Fills from the case (18 of 24 boxes)** or **Blank official PDF**; "Already on this filing" rows are shown but not addable, with that reason. Picking one: person on the filing (default the principal), reason (required, one line), channel (default shown with why) → "Add to Client A's filing". The new row appears in the list with "Added by the case officer" ⓘ (who, when, reason) and its next step. States: empty search ("No form matches 'IMM 99'. Forms come from the firm's library: add a new one in Library → Forms."), loading skeleton, refusal on the row, conflict (someone added it meanwhile: "already added by <who>"), read-only after recording, long titles wrap, keyboard path (search → arrow → Enter → reason → Add).

## 4b. Best in class
All read 7 Nov 2026 from each project's published source (vendor help centres blocked from this session; Docketwise, INSZoom, Clio Draft, TurboTax forms mode not opened, so not cited). Evidence file: `best-in-class-sources-2026-11-07.md` (this folder).
| Who | Best at | Source and quote |
|---|---|---|
| Assembly Line (Suffolk LIT Lab, open source), ALDocument / ALStaticDocument | Two kinds of document named apart: filled from answers, or a plain file | `github.com/SuffolkLITLab/docassemble-AssemblyLine-documentation/…/al_document_overview.md`: "a template that is filled in with the user's answers"; "include plain PDF or Word instructions that do not have any variables" |
| Assembly Line, Weaver | Shows how a mapped PDF fills before use | `…/authoring/pdf_templates.md`: "filling in all of the PDF's fields with dummy data, allowing for a quick visual inspection" |
| GOV.UK Design System, Tag · Complete multiple tasks | Status in words; a worded "cannot start yet" | `github.com/alphagov/govuk-design-system/…/tag/index.md`: "Use adjectives … and not verbs"; `…/complete-multiple-tasks/index.md`: "use the 'Cannot start yet' status" |
**Copied:** the two kinds named in words before adding (Assembly Line); a status tag in adjectives (GOV.UK). **Beaten:** coverage shown before adding ("18 of 24 boxes fill from the case"), from this case's own confirmed facts rather than dummy data; the added form joins the same readiness, review and out-of-date rules as release forms, so nothing added by hand escapes a check; frozen when added, so the form never changes under the officer.

## 5. Copy
Tag tips: "Fills from the case: the library has an approved map for this edition; boxes with no confirmed fact on this case stay blank and are listed." · "Blank official PDF: the library has no approved map for this form. Download it, fill it by hand, upload the completed copy." · Reason placeholder: "Why this filing needs it" · Row tip: "Added by the case officer on 8 Nov: <reason>. Not part of the combination."

## 6. Contract and tests
`contracts/runtime.ts` additive: `AddableForm` {form, title, edition, kind: "fills"|"blank", coverage?, why_not?}, `AddedForm`. Pack `acceptance/C7.8.test.ts` on the checkpoint (VV family; the forms are picked from the library by their state at run time, never a fixed number, P-319): 1 pass addable list excludes forms already on the filing and guides · 2 pass add a mapped form → listed on Prepare application for that filing only, coverage shown, filled copy from confirmed facts · 3 pass unmapped → blank official PDF (sha256 of the edition's file) · 4 fail no reason 400 · 5 fail already on the filing 409 · 6 pass frozen: a later library map edit does not change the case's form · 7 pass C7.6: blank form without upload → CRITICAL warning; a barcode form → Validate block · 8 pass a fact change → the filled added form out of date (C9.2) · 9 pass remove with reason; after recording 409 · 10 fail client 403, configuration 403, other firm 404 · 11 screen walk at 1440 px.

## 6b. Capability or scaffolding · proof
All capability, *Needed for the proof*. Not built: adding client questions for the added form's facts (Q1); adding a form to several filings at once; online (portal) forms added by hand (an online twin needs its capture; Q2).

## 7. Questions for the tech lead (recommendation first)
* **Q1** Facts an added form needs that the case does not ask: **recommend "Not on file", filled by hand or entered by staff** (C6.18's officer entry when it lands); adding client questions to a pinned case is a release change, not a case action.
* **Q2** Channel: **recommend PDF upload or Paper only** for added forms in M3; an Online line needs a captured twin and a portal sheet (C7.7), which a hand-added form does not have.
* **Q3** Files under build: `fill-case.ts` and `case-prepare.ts` (C3/C4) are where added forms join the case's forms: **build after those PRs merge**; the migration (one new table) is read by the tech lead.

## 8. Ready
Acceptance test `acceptance/C7.8.test.ts` (C7.8-1…11). Row text: BACKLOG B141. Decisions: P-406, P-72, P-122, P-151, P-237, P-319; open: Q1-Q3.
