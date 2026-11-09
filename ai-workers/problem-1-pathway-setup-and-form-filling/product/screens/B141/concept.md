# B141 · C7.8 Add a library form to one filing: concept

Status: **DESIGN, revision 2 after the fresh challenge** (`challenge.md`: "Build after these changes", no Blocker, 6 Majors, 9 Minors; answered in §9). The tech lead approves case screens after the challenge (P-223 (4), P-316 (3)). Branch `claude/intelligent-noether-qkzc6a-b141` from `origin/main` 1e1ca443e, screens lane, 7 Nov 2026. No code.

Board: `design/draft-add-library-form.html` (intent, not pixels, P-44). It starts from the founder's boards `screens/M3-prepare-application/design/draft-prepare-application-v2.html` (P-122) and `screens/M3-agent-view/design/draft-agent-view.html` (P-164). The UX lane's study (P-407) is not on `main` yet; its scorecard is answered when it lands.

Row (BACKLOG B141, P-406, on `lead/2026-11-07-lead30`):
* the officer adds a form to one filing;
* a mapped form fills from the case; an unmapped one is the blank official PDF;
* it lists on Prepare application (C7.7) and goes through Ready to file (C7.6);
* pack exit 0; Opus review.

Team card: SA-01B **SA-1B-177** (library list with the badge "Fills from the case" or "Blank form — fill by hand and upload"; recorded on that filing only; `FilingFormAddition`), with SA-1B-102 rule 5 (a library form has no line, so it needs a signature; staff may switch it off with a reason).

## 1. Job and journey
**Job.** *"This client also needs IMM xxxx on their application."* The case officer adds one form from the firm's library to one filing, for one person on it. They get it filled from the facts on file when its filling is proven, or the blank official PDF to fill by hand when it is not. Either way it is then prepared, signed, checked, reviewed and filed like every other form.

* **Who:** case staff of the case's firm. Client and configuration: 403.
* **When:** during Prepare the filing, before anything on the case is recorded.
* **Not covered:** changing the combination (S5); adding a document (C6.4).

## 2. Ten layers
| Layer | In the app | New here |
|---|---|---|
| Data | Case forms and maps come only from the pinned release snapshot (`snapshotOf`, `releaseForms`, the fill job, the prepare sync, the readiness edition); library `FormEdition` (official file, sha256); `FormFieldMap` (DRAFT · PUBLISHED · SUPERSEDED · RETIRED); fill trials per edition and map; `FilingItem` | **Migration, one new table:** `filing_form_addition`, the team's `FilingFormAddition`. It holds: case, filing, person, form key, edition id, kind (fills · blank), frozen published map json + sha256, trial id, channel, signature and signer, added by/at/reason?, removed by/at/reason. Insert, then a removed mark only (trigger) |
| Rules | `formCoverage`, `wantedItems`, C7.6 | `engine/runtime/added-forms.ts`, pure: what can be added, the kind, and **`withAdditions(snapshot, additions)`**. That is the one join point (M1): it returns the release snapshot plus each addition's form line, keyed to **that person on that filing** (never a role), and its frozen map |
| API | `GET /library/forms` | `GET /runtime/filings/:id/addable-forms?q=` (kind only) · `GET …/addable-forms/:form` (coverage for the one picked) · `POST /runtime/filings/:id/form-additions` · `POST …/form-additions/:id/remove` (reason) |
| UI | Prepare application deliverables list (C7.7) | "+ Add a form" on each filing's form list → side panel (EXPERIENCE §3) |
| AI | none | none (identical with AI off) |

## 3. Business rules
* **BR-1 One filing, one person.** The form is added to the chosen filing for one person on it. The principal is the default; any applicant on the filing can be chosen. It is never added to the combination, to another person with the same role, or to another case. No form number appears in code (P-319); the list comes from the library.
* **BR-2 What can be added** (M4).
  * Library forms of type "form", with a current edition, not retired.
  * **Not** a form the case's release holds for that person, whether or not it applies now, because the release's rule stays the one truth. The refusal names the reason and the answer that decides it (founder question F3).
  * Not a form already added to that filing for that person.
  * A guide or checklist is never offered.
  * **A barcode form** (C7.6's existing `isBarcodeForm`) is addable only as "fills". As a blank it could never clear the Validate block (M5), so it is refused in words.
* **BR-3 The kind, in words** (M2; founder question F1):
  * **"Fills from the case":** the edition has PUBLISHED map rows **and** a passed fill trial for that edition and map (`lock` refuses a copy without one, `fill-case.ts:341`). Otherwise it is **"Blank official PDF"**, with the reason ("Its filling is not proven yet for this edition").
  * Coverage ("18 of 24 boxes fill from this case") is worked out only for the form picked, never for every search result (200 ms search budget).
* **BR-4 Frozen when added.** The edition, the published map rows and the trial are copied into the addition with a fingerprint. A later library change never changes this case's form. A newer edition shows as information ("A newer edition exists"); no "Adopt update" action is promised.
* **BR-5 Mapped fills, blank is blank.**
  * Mapped forms fill through the existing filler from confirmed facts (P-72 as amended by P-242), via `withAdditions`.
  * A box whose fact is not on file stays blank and is listed "Not on file". The added form adds no client questions (Q1).
  * Blank: a download of the edition's official file (sha256 checked).
* **BR-6 Channel and signature, set when adding** (M3; SA-1B-102 r5).
  * Channel: inside what the library says IRCC accepts (C11.6). The default is the channel the filing already uses (paper filing → Paper). Online is not offered (Q2).
  * Signature: "needs a signature" by default; the signer defaults to the person, or the parent for a minor (C8.1's rule). Staff may switch it off with a reason.
* **BR-7 Then like any form** (C7.6, C8.1, C8.3, C9.2 unchanged, through `withAdditions`).
  * **Blank:** the completed copy is the upload of C8.1. If the form is signed by hand, the one signed scan is that upload. If not, the officer uploads the completed copy on the form's row (one upload, never two; M5).
  * Without it, Ready to file shows **a new CRITICAL line, "Filled by hand: upload the completed copy"**, passable with a recorded reason. This is one addition to C7.6's list (M6; founder question F2).
  * Listed on Prepare application with the tag "Added by the case officer" ⓘ (who, when, reason if given).
* **BR-8 Remove.** A reason is required. Allowed before anything on the case is recorded; after that, refused in words (C8.2 lock). The record is kept, marked removed.
* **BR-9 Who.** Case staff of the firm. Client 403, configuration 403, another firm 404; a recorded case 409. A reason is optional on add and required on remove, which keeps the team's three clicks.

## 4. Layout
* **Entry:** a quiet "+ Add a form" after a filing's forms (C7.7). It opens a side panel (480-560 px).
* **Search:** by number or title. Each result shows number, title, edition and a tag in words: **Fills from the case** or **Blank official PDF**.
* **Refused rows:** forms on the release, already added, or a blank barcode form are shown but not addable, each with its reason.
* **Picking one** shows:
  * its coverage, or why it is blank;
  * for: the person on the filing (default the principal);
  * channel (default with why);
  * signature and signer;
  * reason (optional);
  * the button "Add to <name>'s filing".
* **The new row** appears with "Added by the case officer" ⓘ and its next step.
* **States:**
  * empty search: "No form matches 'IMM 99'. Forms come from the firm's library: add one in Library → Forms.";
  * loading: skeleton;
  * refusal shown on the result;
  * conflict: "Already added by <who>";
  * read-only: after recording;
  * long titles wrap;
  * keyboard: search → arrows → Enter → fields → Add.

## 4b. Best in class
All read 7 Nov 2026 from each project's published source. Vendor help centres are blocked from this session, so Docketwise, INSZoom, Clio Draft and TurboTax's forms mode were not opened and are not cited. Evidence: `best-in-class-sources-2026-11-07.md` (this folder).

| Who | Best at | Source and quote |
|---|---|---|
| Assembly Line (Suffolk LIT Lab, open source), ALDocument / ALStaticDocument | Two kinds of document named apart: filled from answers, or a plain file | `github.com/SuffolkLITLab/docassemble-AssemblyLine-documentation/…/al_document_overview.md`: "a template that is filled in with the user's answers"; "include plain PDF or Word instructions that do not have any variables" |
| Assembly Line, Weaver | Shows how a mapped PDF fills before use | `…/authoring/pdf_templates.md`: "filling in all of the PDF's fields with dummy data, allowing for a quick visual inspection" |
| GOV.UK Design System, Tag · Complete multiple tasks | Status in words; a worded "cannot start yet" | `github.com/alphagov/govuk-design-system/…/tag/index.md`: "Use adjectives … and not verbs"; `…/complete-multiple-tasks/index.md`: "use the 'Cannot start yet' status" |

**Copied:**
* The two kinds are named in words before adding (Assembly Line; SA-1B-177's badge).
* Status tags are adjectives (GOV.UK).

**Beaten:**
* "Fills" is promised only when a fill trial proved it, and the coverage comes from this case's own confirmed facts, not dummy data.
* The added form joins the same signing, readiness, review and out-of-date rules as release forms through one join point, so nothing added by hand escapes a check.
* It is frozen when added.

## 5. Copy
* Tags: "Fills from the case: its filling is proven for this edition; boxes with no confirmed fact on this case stay blank and are listed."
* "Blank official PDF: download it, fill it by hand, upload the completed copy." With the reason when mapped but unproven.
* Release form: "IMM xxxx is part of this application's forms; it applies when <answer> (now: <value>)."
* Barcode blank: "IMM xxxx makes a barcode page: only a copy the product fills can be validated, and its filling is not proven yet."
* Row tip: "Added by the case officer on 8 Nov. Not part of the combination."

## 6. Contract and tests
**Contract.** Additive in `contracts/runtime.ts`: `AddableForm` {form, title, edition, kind, why_not?}, `AddableFormDetail` {coverage?, blank_why?}, `FormAddition`.

**Pack** `acceptance/C7.8.test.ts`, on the checkpoint. Forms are picked from the library by their state at run time, never by a fixed number (P-319); the "fills" pick is a form with a passed trial whose role is not on the release.
* 1 pass: the addable list excludes release forms (with the reason), forms already added and guides.
* 2 pass: add a "fills" form. It is listed on Prepare application for that filing and person only, with coverage; a filled copy comes from confirmed facts and locks (trial passed).
* 3 pass: a form with no published map or no trial is "Blank official PDF" with the reason; the download's sha256 is the edition's.
* 4 fail: a release form that does not apply now → 409 with its deciding answer.
* 5 fail: added twice → 409.
* 6 fail: a blank barcode form → 422 in words.
* 7 pass: frozen. A later published map change in the library leaves the case's form unchanged.
* 8 pass: C7.6. A blank form with no completed copy gives the new CRITICAL line; passing it needs a reason; uploading clears it.
* 9 pass: the signature is set when adding, so no "not set on the form line" warning.
* 10 pass: a fact change makes the filled added form out of date (C9.2).
* 11 pass: remove with a reason; after recording, 409.
* 12 fail: client 403, configuration 403, another firm 404.
* 13: a screen walk at 1440 px.

**Unit checks:** `withAdditions` gives one line per addition, for that person only; the release fingerprint check still passes.

## 6b. Capability or scaffolding · proof
* **Capability,** *Needed for the proof:* everything above.
* **Not built:**
  * client questions for the added form's facts (Q1);
  * added Online forms (Q2);
  * the cross-firm counter and Form box signals (SA-1B-177 r5, SA-1B-178);
  * "Adopt update" for an added form.

## 7. Questions
**For the founder, through the tech lead** (from the challenge):
* **F1.** A form mapped, but with no passed fill trial for its edition. **Recommend: offered as "Blank official PDF", with the reason**, as P-65 (a) and SA-1B-177 r2 treat release forms.
* **F2.** A blank added form with no completed copy. **Recommend: a CRITICAL warning on Ready to file, passed only with a reason.** This is one new C7.6 line, for added blank forms only.
* **F3.** A form the release holds but that does not apply now. **Recommend: not addable, with the deciding answer**, so no item is duplicated.

**For the tech lead:**
* **Q1.** Facts not on file stay "Not on file". **Recommend yes.** Staff entry of background answers (C6.18, P-244) covers only background answers; the rest is filled by hand.
* **Q2.** PDF upload or Paper only for added forms in M3. **Recommend yes.**
* **Q3.** Build after C3/C4 merge `fill-case.ts` and `case-prepare.ts`. `withAdditions` is called in both. **Recommend yes.** The migration (one new table) is for the tech lead's read.

## 8. Ready
* **Acceptance test:** `acceptance/C7.8.test.ts` (C7.8-1…13).
* **Row text:** BACKLOG B141.
* **Decisions:** P-406, P-72/P-242, P-122, P-237, P-319.
* **Open:** F1-F3 (founder), Q1-Q3 (tech lead).

## 9. Answers to the challenge
* **Majors:**
  * M1: `withAdditions` as the one join point, keyed per person.
  * M2: "fills" means PUBLISHED map rows plus a passed trial.
  * M3: channel and signature set when adding.
  * M4: release forms refused.
  * M5: one upload (C8.1's); blank barcode forms refused.
  * M6: the new C7.6 line, named, as F2.
* **Minors:**
  * table name `filing_form_addition`;
  * "Adopt update" dropped;
  * channel default follows the filing;
  * reason optional on add;
  * coverage only for the picked form;
  * the pack's pick avoids a release role;
  * the barcode list is C7.6's existing one, not new;
  * C6.18's scope corrected;
  * P-242 cited.
