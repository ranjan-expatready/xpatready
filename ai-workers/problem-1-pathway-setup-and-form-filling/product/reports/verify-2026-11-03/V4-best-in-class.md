# V4 — Is it best in class? (independent verification, 3 Nov 2026)

Read-only check under P-290 and P-291 (1). I did not build or score any of this before. App: a fresh copy of `origin/main` at **877acf66**, isolated on port 4470 (`studio/tools/isolated.sh v4 4470 start`, its own database), live AI off (no `STUDIO_*_LIVE` set), US$0 spent, no priced button clicked. Vendor research: their own public pages only, read on 3 Nov 2026. I did not sign up, start a trial or submit any form.

**Legend.** **[E]** = evidence: I saw it on our running app or on the vendor's own page. **[J]** = my judgment or estimate. Vendor claims are the vendors' words, not tested by us.

## 1. Verdict

**Not best in class today. [J, confidence high]**

* **Setup (how a firm configures programs and forms).** We are **ahead of every product checked** on governing the configuration: drafts, a second person who signs, a separate person who releases, every form and condition quoted from IRCC's own page, AI answers checked by a second blind AI round, and test families with expected answers. No competitor's public pages describe any of this. **[E]** for what we have. That nobody else has it is **[J]**: their public pages are silent, which is not proof the feature is missing.
* **Form filling (what a firm sells to its clients).** We are **behind the leaders**. On today's demo a firm cannot release a combination, open a case, send a questionnaire or see a filled IMM 5257. This holds even after "Load the configured checkpoint": Visitor visa shows "Fix 386 problems before submitting". **[E]**, screenshots 13 and 14. Every competitor's core promise is the step we cannot show: client answers in, filled forms out.
* **Score.** On the 14-feature table in §2 we rank **2nd of 12 on what is built and tested (20/28)** but **8th of 12 on what a firm can see in the demo today (12/28)**. Migrawise is 1st with 22/28 on its own claims. Docketwise is 19; CampLegal, eImmigration and Visto are 18 each.
* **UX on the 2 Nov baseline method: 6.5 / 10 (baseline 5.5), ±0.5. [J]** The five trust fixes from the baseline mostly held. Three new problems appeared on the paths a first-time user takes, and the walk still cannot reach the case screens.

## 2. Scored comparison: feature × product

Scale: **2** = has it, **1** = partly, **0** = does not, **?** = the vendor's public pages do not say (counted as 0, so vendors that publish less score lower).

Our two columns:
* **Ours (built)**: the capability is built and passed qa (`qa/CAPABILITIES.md` status Works or Partial on its tested commit).
* **Ours (demo)**: what I saw on the demo after Reset to the six and after the configured checkpoint.

| # | Feature (what a firm gets) | Ours (built) | Ours (demo) | Docketwise | CampLegal | LollyLaw | eImmigration | INSZoom | Imagility | Filevine ImmigrationAI | Visto | Migrawise | Officio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Ready-made catalogue of case types or programs | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 1 | 1 | 1 | 2 | ? |
| S2 | Firm builds its own case types, stages and checklists | 2 | 2 | 2 | 1 | 2 | 1 | 1 | ? | ? | 2 | ? | 1 |
| S3 | Document checklist per case type, per family member | 1 | 0 | 1 | 1 | ? | ? | ? | 1 | ? | 2 | 2 | ? |
| S4 | Client questionnaire per case type: editable, with show-if logic | 1 | 0 | 1 | 2 | 1 | 1 | 1 | ? | 1 | 1 | 1 | 1 |
| S5 | Official form library kept current by the vendor (new editions) | 1 | 1 | 2 | ? | 2 | 2 | ? | ? | 2 | 1 | 1 | 2 |
| S6 | Configuration drafts, sign-off, release and history | 2 | 1 | 1 | ? | ? | 1 | ? | ? | ? | ? | ? | ? |
| S7 | Rules: conditions, validation, eligibility or points | 2 | 1 | ? | 1 | ? | 1 | ? | 1 | ? | 1 | 2 | ? |
| F1 | Enter once, reused on every form | 2 | 1 | 2 | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 2 | 2 |
| F2 | Client portal for questions and uploads, in their language | 1 | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 |
| F3 | Official forms filled automatically (PDF and/or the government's online portal) | 1 | 0 | 2 | 1 | 1 | 2 | 2 | 1 | 1 | 2 | 2 | 1 |
| F4 | Family members handled per person | 2 | 1 | 2 | 2 | 2 | 1 | ? | ? | ? | 2 | 2 | 1 |
| F5 | AI: reads client documents, drafts, fills, reviews | 1 | 1 | 1 | 2 | ? | 1 | 1 | 1 | 1 | 1 | 2 | 1 |
| F6 | Checks before filing (missing, inconsistent, expiring) | 1 | 1 | 1 | 2 | ? | 1 | ? | 2 | 1 | ? | 2 | ? |
| F7 | Audit trail, review and sign-off | 2 | 2 | 1 | 1 | 1 | 1 | ? | ? | ? | 1 | 2 | ? |
| | **Setup subtotal (S1–S7, of 14)** | **10** | 6 | 8 | 6 | 7 | 8 | 3 | 2 | 3 | 8 | 8 | 4 |
| | **Form-filling subtotal (F1–F7, of 14)** | 10 | **6** | 11 | 12 | 8 | 10 | 6 | 7 | 6 | 10 | **14** | 7 |
| | **Total (of 28)** | **20** | **12** | 19 | 18 | 15 | 18 | 9 | 10 | 10 | 18 | 22 | 11 |
| | Cells the vendor's pages leave unknown | — | — | 1 | 2 | 5 | 2 | 7 | 6 | 6 | 2 | 2 | 6 |
| | Market | Canada (IRCC) | | US | US | US | US | US, Canada, global | US | US | Canada | Canada | Canada |

Reading the table:

* **Ours, built.** Every 2 has a qa-tested capability behind it:
  * S2: C1.2.
  * S6: C5.2–C5.7.
  * S7: rules and answer-key tests.
  * F1: shared fields, one source per fact.
  * F4: per-person roles and Sample families.
  * F7: author, signer and releaser are different people, enforced by the server.
* **Ours, our 1s and why.**
  * S1: six Sample combinations, names not confirmed by the immigration expert.
  * S3: C6.4 is Partial.
  * S4: built (C4.x), but questions show field names, are not translated and have no visual editor.
  * S5: the new-edition comparison C9.1 is Partial and "stale" marking C9.2 is not built.
  * F2: a client link exists (C6.1), but there is no upload with reading and no language choice.
  * F3: C7.1 fills a PDF and reads it back equal, but barcodes (C7.2) are Partial and the portal extension (C7.4) is not built.
  * F5: documents are not read (C6.5 is not built) and there is no AI review (C7.5).
  * F6: checks exist for configuration only, not for a filled case.
* **Ours, demo.** Lower than built because the demo cannot reach a released combination, so documents, questions, cases and filled forms never appear. **[E]**
* **Not in the table:**
  * LawLogix Immigration Case Management (Equifax): its pages describe portals and auto-population only; 11 of 14 cells unknown.
  * Meridian/Polaris: its site is on a `pages.dev` staging host and parts are labelled roadmap.
  * Visalaw AI: a drafting and research tool, not case management.
  * Maple CRM: only partly read.
* **How sure I am of the scores [J].**
  * Vendor scores rest on marketing and help pages, read through a summarising fetcher; I checked the key claims at source myself (§5).
  * Our scores rest on tests and my own walk. The two are not measured the same way: vendors may overstate. A buyer sees the same claims, though.
  * Treat a difference of 2 points as noise.

## 3. Top gaps, ranked by value to a firm [J on ranking; E on each fact]

1. **One application cannot be taken from start to finish.** No combination can be released on the demo, even from the configured checkpoint. So there is no case, no client questionnaire and no filled form.
   * The checkpoint itself reports this:
     * Row 10: "No combination can be released yet".
     * Row 11: the family case "Waits for the Visitor visa's release 1".
     * Row 12: IMM 5257 "waits for the founder's paid run".
   * Visitor visa carries 386 problems, 374 "answers asked of nobody", 0 questions and 0 documents (screenshots 13 and 14).
   * Every competitor sells exactly this loop.
   * Underneath this is a **setup-cost** problem, not only a missing step. One combination needs about 175 AI proposals decided and hundreds of problems fixed before it can be released. Competitors ship ready catalogues that the firm does not configure at all (Officio "over 400 forms", Migrawise "234 forms, auto-suggested by case sub-type", eImmigration "120+ pre-built case templates").
2. **Client documents are not read.** Competitors read passports and other documents and turn them into answers, often showing which document each value came from:
   * Migrawise: "Field-level provenance: see which doc each value came from", plus conflict flags.
   * CampLegal: document processing across 50+ document categories.
   * Imagility: OCR on passports and I-94s.
   * Docketwise: "IQ Data Capture", in closed beta.
   * Filevine: OCR in any language.
   * Ours: C6.5 is not built.
3. **IRCC's online portals are not filled.** Canadian competitors fill IRCC's portals from the case with a browser extension:
   * Visto: "1-click IRCC web form autofill", PR Portal and Express Entry.
   * Migrawise: the new IRCC Portal, visitor and super visa only so far (the extension was updated 3 Sep 2026).
   * Ours: C7.4 is not built and the capture rows C2.8 and C2.9 are parked. The demo marks each form "Online (typed in by hand for now)".
   * Many permanent and temporary residence applications go through portals, not PDFs, so this is a large share of a Canadian firm's typing.
4. **The client questionnaire is not client-ready.** Questions show field names (UX-E is not done) and there is no language choice. Competitors offer translated questionnaires:
   * Docketwise: 12 languages.
   * eImmigration: 13.
   * CampLegal: 17–18, with drag-and-drop editing and show-if logic.
   * LollyLaw: 20+.
   * Filevine: up to 170.
   * Visto: one-click translation.
5. **There is no promise on new form editions.** Competitors state how fast they update and what happens to work already done:
   * Docketwise: "within 5 business days" of USCIS's announcement, with automatic migration of prepared forms and "Switch to the previous version".
   * Filevine: 72 hours.
   * LollyLaw: "within an hour", and outdated forms are marked sunsetting or expired.
   * Visto: an "IRCC Form Monitor" that notifies the firm.
   * Ours: we read editions and hold unknown files, but the comparison (C9.1) is Partial and marking filled forms stale (C9.2) is not built.
6. **There is no check of a filled application before filing.** CampLegal's AI "Pre-Filing Quality Control" checks completeness, inconsistencies across documents and common refusal triggers, with a human sign-off. Imagility has "built-in validations". Ours: C7.5 is not built; our checks cover configuration only.
7. **There is no eligibility or points calculator.** Migrawise scores CRS "under the rules in force on the day" and saves the result to the case. Our Tests tab says "No scoring tables exist in this product yet".

Gaps 1–5 carry into the next task (capability texts, P-291).

## 4. Where we lead (evidence)

* **Release discipline.** The flow is "Author submits", then "The immigration expert signs the content", then "A second person releases". Cases "only ever use a released version" (screenshot 07). None of the 11 competitors' pages describes drafting, signing and releasing a configuration. Docketwise saves smart-form templates but has no draft or publish; eImmigration lists "Form Version Control" for forms only.
* **Every requirement quoted from IRCC.** Each form row carries "IRCC's words" and a guide number. A condition left in words blocks release: "6 conditions are in words only … Release waits for it" (screenshot 03).
* **AI that can be checked.** There are two AI rounds and a disagreement is shown: "AI's two rounds disagree · you decide" (screenshot 03). Saved runs replay at US$0. The review page states what the AI saw and that rules, not AI, compare against the library.
* **One source per fact.** "Every fact has one source", and the gaps are counted ("374 answers asked of nobody").
* **Answer-key tests.** Made-up families with expected values, run at submit and at release.

These matter to a regulated firm (CICC duties, refusals caused by wrong forms). A buyer sees them only once a case runs on them, which is gap 1. **[J]**

## 5. Sources (vendors' own pages; all read 3 Nov 2026)

Page dates are shown where the page shows one; "©2026" means only a copyright year. Quotes are short and summaries are mine.

**Checked at source by me (not only by the reading agents):**

* support.docketwise.com/en/articles/4757505-form-updates-and-versioning (written 6 Mar 2023): "within 5 business days"; previous forms migrate automatically; "Switch to the previous version".
* www.migrawise.ca (©2026): "Field-level provenance"; conflict flags ("Needs review"); "Per-applicant checklists"; CRS "under the rules in force on the day you score".
* www.visto.ai (©2025; read by direct download because a bot check blocked the reader): "Build your own custom applications"; documents and tasks by "age, country of residence, citizenship, family members"; "IRCC Form Monitor"; "1-click IRCC web form autofill".
* camplegal.com/features/custom-intake-questionnaires/ (©2026): drag-and-drop; follow-up questions after a "Yes"; staff "review, flag questions, hide sections" before data enters the profile; family profiles created and linked; data "automatically populates into USCIS forms".

**Read by the research agents:**

* **Docketwise**
  * supportcenter.docketwise.com/en/articles/9372198-workflows-with-matter-types-and-statuses (8 Jun 2026): matter types, statuses, automations.
  * supportcenter.docketwise.com/en/articles/10247778-ai-data-capture (23 Jun 2026): "IQ Data Capture", closed beta.
  * supportcenter.docketwise.com/en/articles/15177819-visalaw-ai (19 May 2026).
  * support.docketwise.com/en/articles/5791576-smart-forms-version-3-with-packet-assembly-custom-questions-and-templated-intakes (7 Mar 2024): custom questions; roles per person.
  * support.docketwise.com/en/articles/4732137-custom-intakes (3 Oct 2023): 12 languages.
  * support.docketwise.com/en/articles/8038875-e-filing-forms-with-uscis (30 Apr 2024).
  * support.docketwise.com/en/articles/4732119-firm-contact-and-matter-feeds (seen in search only).
  * docketwise.com/pricing (©2026).
  * docketwise.com/blog/smart-forms/ (16 Oct 2024).
* **CampLegal**
  * camplegal.com/ai-features-suite/ (©2026): document processing, Smart Form Population, Pre-Filing Quality Control, human sign-off.
  * camplegal.com/pricing/ (©2026): US$69–99 per user per month.
  * camplegal.com/camplegal-ai/.
* **LollyLaw**
  * lollylaw.com/feature-overview/immigration-software/: 40+ workflows, 100+ questionnaires, 125+ forms, 20+ languages.
  * lollylaw.com/blog/lollylaw-modernizes-immigration-form-filling-with-real-time-client-collaboration-feature/ (undated): "within an hour"; sunsetting and expired forms.
  * help.lollylaw.com/help/what-is-lollyforms.
  * lollylaw.com/pricing/ returned a 404.
* **eImmigration (Cerenade)**
  * get.eimmigration.com/pricing (©2026): 120+ case templates, 300+ forms, Form Version Control, e-filing; US$55–110 per user per month.
  * get.eimmigration.com/capabilities/immigration-law-software.
  * get.eimmigration.com/capabilities/client-management: 13 languages.
  * cerenade.com/blog/cerenade-eforms-technology-in-legal-case-management (9 Nov 2023).
* **INSZoom (Mitratech)**
  * www.mitratech.com/products/inszoom/ (©2026): configurable workflows, digital questionnaire, auto-population, e-filing, "U.S., Canadian, and global".
  * mitratech.com/resource-hub/pressreleases/mitratech-showcases-expanded-immigration-ai-ecosystem-for-law-firms/ (16 Jun 2026): redesigned client portal with AI document extraction, shown as a preview.
  * www.inszoom.com: Canadian case processing; form list "contact us".
* **Imagility**
  * imagility.co: document checklists, OCR on passport and I-94, built-in validations, client portal. imagility.com is parked.
* **Filevine ImmigrationAI**
  * filevine.com/platform/immigrationai (©2026): forms updated within 72 hours; questionnaires in up to 170 languages; OCR.
  * www.filevine.com/immigration-software/.
* **LawLogix (Equifax)**
  * workforce.equifax.com/solutions/immigration-case-management.
  * workforce.equifax.com/immigration-case-management1.
  * lawlogix.com redirects to the Equifax site.
* **Visto**
  * www.visto.ai/pricing: CAD 199 / 449 / 999 per month; 5, 15 or 30 custom templates.
  * www.visto.ai/blog: posts dated 4 Mar 2024 and 30 Jan 2025.
* **Migrawise**
  * migrawise.ca/pricing: "Full IRCC catalogue: 234 forms"; CAD 29 per month per firm; AI CAD 15 per case.
  * migrawise.ca/for-rcics/: "Audit log on every read and write".
  * chromewebstore.google.com/detail/migrawise-autofill/aoimmmacpocjiidpnahemjmaldbfcjic: version 3.8.4, 3 Sep 2026; new IRCC Portal, visitor and super visa.
* **Officio**
  * officio.ca refused every direct read (HTTP 403). Ratings rest only on search-engine extracts of /immigration-forms.html ("over 400 forms", auto-populates common fields), /immigration-software.html (client portal), /pricing.html ("AI Writer", workflow management) and /immigration-crm.html. **Weakest evidence in this report.**
* **Excluded after reading:**
  * getalma.com: a school system.
  * casium.com: a law firm, not a software vendor.
  * meridian-marketing.pages.dev: a staging host, partly roadmap.
  * visalaw.ai: drafting and research only.
  * maplecrm.com: read in part only.

## 6. UX score on the 2 Nov baseline method

**Method.** The baseline (`screens/UX-baseline-2026-11-02/findings.md`) is a read-only walk, ranked by user impact, scored as a whole out of 10. It has no written formula. To make my score comparable, I:
* walked the same screens at 1440 px and 400 px: Immigration programs, Program structure, a combination's seven tabs (Visitor visa and LMIA), To review, Fields and a field's page, Forms, Document types, Review and release, the drafting dialog, Cases and Open a case, the "Acting as" switch, and keyboard focus;
* marked each baseline finding Fixed, Partly or Open;
* added new findings;
* moved the score from 5.5 by each finding's impact.

**State walked.**
1. Demo › Reset to the six (22 s).
2. Then Reset demo › Load the configured checkpoint, plus one "Draft with Saved (US$0)" on Visitor visa on my own copy.

The baseline's demo had 145 questions on LMIA. Today neither state shows any question, so finding 6 could not be re-checked, and **Journey B (case screens) still cannot be walked**.

| Baseline finding | Now | Evidence |
|---|---|---|
| 1 Counts disagree | **Mostly fixed** | Tab badges say what they count ("190 to do", "6 to fix"). Visitor visa "Review 175 proposals" equals the sum of its six To review rows (29+84+9+11+24+18). "386 to fix" matches the tab and the overview. Left: "190 to do" adds unlike things (proposals, form problems, forms to decide). The overview says "8 forms" while Review lists "Forms AI picked (7)". The overview says "Fix 12 form problems" next to "386 problems to fix". (02, 03, 04, 14) |
| 2 To review hides blockers | **Fixed** | "Setup step · 6 problems to fix before release · Needs you · Fix 6 form problems" (04). |
| 3 Always-on explanations | **Mostly fixed** | "Can't retire yet" no longer appears under Structure rows. "Attached from the Form library…" stays only on a form that is not set up yet, where it is the next step (03). |
| 4 Internal identifiers | **Partly** | Field keys are behind "Details (for admins)" on the field page (17). Left: field keys in the words of validation messages on Review and release ("case.visit_purpose" is read by IMM 5257, but nobody is asked for it). The draft-changes list shows "Origin AI_FOUND" (07). |
| 7 Contradictory statuses | **Fixed** | One vocabulary: Not started · In progress · Not ready · Live · Waiting for approval (01). |
| 5 Names | **Fixed** | "Smart questionnaire (SQR)", "Prospect questionnaire (PQR)", "Case officer enters". |
| 9 Phone width (400 px) | **Partly** | No sideways page scroll (page width 400 on all four pages checked). There is still no menu button, so the library and history menus cannot be reached. The "Acting as" label shows only a chevron (11, 12). |
| 10 Role trap | **Partly** | Back in the studio after Cases, the page now explains itself with "Open your cases" instead of going blank with errors. The role still switches, the studio menu still has no Cases link, and there is no seeded case (08, 10). |
| 6 Question wording | **Not checkable** | 0 questions in both states. |
| 8 Review list grouping | **Partly** | The draft-changes list groups the forms with IRCC's words. The Origin column holds a code. Each error says where to fix it in words; I did not confirm a link. |
| + Library consistency | **Partly** | The Fields list has filters, a count ("315 of 315") and a clear empty state. A field still opens a full page, not a side panel. |

**New findings (by user impact):**

| # | Finding | Evidence | Suggested change |
|---|---|---|---|
| N1 | **The demo cannot reach a released combination.** From Reset to the six, every combination's first step is "Waiting for the immigration expert: Choose the checklist page (No page matches)". From the configured checkpoint, Visitor visa has 386 problems, 0 questions and 0 documents. No case, client questionnaire or filled form can be shown. | 02, 13, 14, 08, 09 | Seed one combination that is released and one family case from saved answers at US$0 (row UX-D, extended to "released"). |
| N2 | **The AI proposals page opens on an empty view.** It reads "Needs a decision (0) … Nothing in this view" while "84 proposals still to decide" sit under New. | 05 | Open on the first tab that has items, or on All. |
| N3 | **The drafting dialog gives the wrong next step.** It says "Find its forms (Start setup) first" when the 7 forms are already found; the real next step is reviewing 175 proposals. | 06 | Name the actual blocking step, with a link. |
| N4 | **Very large problem counts with no grouping.** "386 to fix" and "374 answers asked of nobody" appear without being reduced to a few actions. | 14, 16 | Group by cause ("14 form fields on IMM 5257 need a decision") and show the 3–5 actions. |

**Score: 6.5 / 10 (baseline 5.5). [J]**

* **Up about 1.5:** the five trust fixes (findings 1, 2, 3, 5, 7) and part of 4.
* **Up about 0.25:** findings 9 and 10 partly fixed.
* **Down about 0.75:** N1 (the demo cannot show the product's result), N2 and N3, which sit on the first path a new user takes.
* **Uncertainty: ±0.5.** The baseline has no written formula, and finding 6 could not be re-checked.

## 7. Blind spots and challenges [J]

* **Firms buy throughput, not governance.** Our lead (§4) is in what protects a firm from wrong configuration; competitors lead in what saves typing on every file. A firm compares on the second until it has been burned by the first.
  * *Fix:* show governance working on a filled form (gap 1) rather than describing it.
* **Setup cost is not measured.** If ExpatReady configures the programs centrally, our real competitor metric is **time to the first released combination**. Today it is "not reached" on the demo.
  * *Fix:* record hours per combination to release as a tracked number.
* **Our "best in setup" rests partly on silence.** No competitor page describes configuration release or sign-off, but enterprise vendors such as INSZoom publish little.
  * *Fix:* a recorded vendor demo would settle it. This is outside my rules, so it is a question for the founder.
* **Officio, probably the longest-serving Canadian product, could not be read.** Its row is the weakest in the table.
* **Prices tell a positioning story.** Migrawise charges CAD 29 per month per firm, Visto CAD 199–999 per month, and US tools US$55–140 per user per month. Whatever we charge will be judged against filled forms per hour.

## 8. Screenshots (`V4/`, JPEG, 1.4 MB in total)

**After Reset to the six:**
* 01 Immigration programs (1440)
* 02 Visitor visa Overview
* 03 Visitor visa Forms
* 04 To review
* 05 AI proposals, empty view (N2)
* 06 drafting dialog, wrong advice (N3)
* 07 Visitor visa Review and release
* 08 Cases, empty
* 09 Open a case, "Nothing is released yet"
* 10 back in the studio as Case officer
* 11 Immigration programs at 400 px
* 12 LMIA Overview at 400 px

**After the configured checkpoint:**
* 13 the checkpoint's result
* 14 Visitor visa Overview
* 15 Preview with "Couple, one child"
* 16 To review
* 17 a field's page

**Keyboard:**
* 18 focus ring

## 9. To repeat this

1. Run `bash product/tools/cloud-setup.sh`.
2. Run `zsh prototype/studio/tools/isolated.sh v4 4470 start`.
3. In the app: Demo › Reset to the six… › type RESET.
4. Walk the screens listed in §6.
5. For the second state: Demo › Reset demo… › RESET, then Load the configured checkpoint….

The walk scripts are Playwright, read-only apart from the two demo loads and one Saved (US$0) draft on the isolated copy. I did not commit them.
