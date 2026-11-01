> **Document control** · Version **1.5** · **2026-10-18** · Status: **Updated — AG-07 review decisions applied (18 Oct: AG07-D2, AG07-D7, AG07-D8(d), AG07-D11, AG07-D16 Q23); earlier: staff-role and Rule 9 decisions (12 Oct, session 2) applied**\
> Part of: *Super Admin Console — Functional Requirements* · Split out of `SA-01-country-and-immigration-pack-management_v2.1_2026-09-18.md` on 2026-09-22 (SA1B-D1) · Previous version: `_archive/SA-01B-content-pack-configurator_v1.4_2026-10-12.md`\
> Reviewed by: the co-product owner and the product owner (product owners) · Code state verified 2026-09-22 against GitHub `dev`: backend `ERv2-sanitized` @ `5a346817`, frontend `ERv2-frontend` @ `85e8840`; **re-checked 12 Oct** against backend `db646bf7` and frontend `8511b27e` (`COMPLEXITY-REGISTER_2026-10-12.md`)
>
> | Version | Date | Change | Decisions |
> |---|---|---|---|
> | 1.5 | 2026-10-18 | **AG-07 review decisions applied (AG07-D2, AG07-D7, AG07-D8(d), AG07-D11, AG07-D16 Q23).** **Changed:** SA1B-X18 — "Request a document" additions sit on the filing's rules pin (AG07-D2); SA1B-D31, SA-1B-96, SA1B-X11 — the pre-filled due date is confirmed when staff save the step (AG07-D11); SA1B-D23, SA-1B-25, SA-1B-95, SA1B-X4 — the case deficiency library is now ExpatReady pack content, specified in SA-01 SA-1-74 (AG07-D7); SA1B-D28, SA1B-X10, §0.1, §0.3, §3.5 intro, P1, P2 — maps for the design-partner firm's most-filed forms ship in Release 1, specified in SA-01 SA-1-75 (AG07-D8(d)). **Added:** the section "Decisions that change this epic"; open questions SA1B-Q10 – SA1B-Q12. **Not changed:** the configurator has no amber-window or early-warning field, so AG07-D16 Q23 (fixed 20 %, no pack value) needs no edit here. **Withdrawn:** none. *18 Oct (final): AG07-D17 – D21 applied — AG07-D17 (P1 answered, SA1B-D28 and §12 note; SA1B-Q12 stays open), AG07-D18 (pin wording), AG07-D20(i) (new SA-1B-101 and card; SA1B-Q11 closed), AG07-D20(p) (SA1B-Q10 closed; SA1B-D23, SA-1B-25, SA-1B-95), AG07-D20(w) (calendar days; SA1B-D31, SA-1B-96).* *18 Oct (later): AG07-D27(5) applied — SA-1B-102 and its §0.3 row gain the two form-line fields `signedBy` and `signatureMethod` (who signs, and how); AG07-D27 added to the decisions table.* *18 Oct (later): AG07-D26 / X-3 applied — SA-1B-101 and its card and settings row are withdrawn (no target-date pre-fill from processing times; AG07-D26(5)); new SA-1B-102 (who completes which form, AG07-D26(7)), SA-1B-103 and its card (new section "Country-specific requirements", AG07-D26(8)), SA-1B-104 (document expiry yes/no and validity, placeholder for X-3) and SA-1B-105 (program recency rule, AG07-D26(8)); SA1B-Q13 added.* | AG07-D2, AG07-D7, AG07-D8(d), AG07-D11, AG07-D16, AG07-D17, AG07-D18, AG07-D20(i), AG07-D20(p), AG07-D20(w), AG07-D26, AG07-D27, X-3 |
> | 1.4 | 2026-10-12 | **Applied the staff-role and Rule 9 decisions of 12 Oct 2026, session 2** (`TEMPLATE-MAP-working_2026-10-10.md`). **Role names (SR-Q3, SR-Q5):** "Content Manager" and "Content Approver" become the one **Content publisher**; the second person for a production pack is the Platform Owner or another Content publisher, and the approver does not edit — a fault is rejected with a reason and the author fixes and resubmits (§2; container rule in SA-01 §3.12). **Renaming and hiding (SR-Q9):** `agent/case:configure-pack` — Owner and Admin by default, grantable through a custom role — covers hiding standard items and renaming a step's client name (SA-1-34, SA-1-38, SA1B-D30). **Document expiry warns only (R9-4):** the "blocks submission" choice is removed from SA-1B-23 and every document type warns only, with default lead times 90 and 30 days (SA1B-D14, SA-1B-23, SA-1B-24, SA1B-X4). **Rule 9 defaults and placements:** new §14 *Settings — defaults and placement*; new questions are placed as required by default (SA-1B-7); a new document type defaults to standard handling, no certified translation, "expires" off (SA-1B-18); review dates are pre-filled — date checked today, next review in 12 months, editable (R9-3, SA-1B-39); the weekly pack-review email and the lead-form field cap are code constants (SA-1B-40, SA-1B-80); the firm questionnaire area is three separate collapsed sections, all off by default, with "Staff fill in this whole section" per section and the per-question who-answers choice under Advanced (R9-1, SA-1B-93, SA-1B-99, SA1B-D38). §0.2 rows SA1B-X3 and SA1B-X4 updated and SA1B-X16 added; §12 and §13 refreshed (SA1B-Q9 added; no existing open question was answered by these decisions). **Changed:** SA-1B-7, SA-1B-18, SA-1B-23, SA-1B-24, SA-1B-39, SA-1B-40, SA-1B-80, SA-1B-93, SA-1B-99, SA-1-8, SA-1-34, SA-1-38, SA1B-D14, SA1B-D30, SA1B-D38, SA1B-X3, SA1B-X4, §2, §0.3, §12. **Added:** SA1B-D39, SA1B-D40, SA1B-X16, SA1B-Q9, §14. **Withdrawn:** none (the "blocks submission" choice is removed inside SA-1B-23, whose number stays). **Same-day revision (W-1 – W-3, the product owner, 12 Oct):** W-3(16) fills the three "Not stated" rows in §14 (field sensitivity flags default, document warning lead times under Advanced, review dates on Main pre-filled) and closes SA1B-Q9. **Same-day revision (W-11 – W-21, the product owner, 12 Oct):** W-15 closes SA1B-Q2 (firms may hide standard checklist items and steps without a deadline; anything with a deadline and all government steps are never hideable; staff mark "not applicable" per case), W-16 closes SA1B-Q5 (no reordering of standard steps; the pack's order is a guide), and W-17 withdraws the firm questionnaire layer (SA1B-D25, SA1B-D38, SA-1B-93, SA-1B-99) and firm-wide extra checklist items (SA-1-34) — firms see only the final questionnaire and the dynamic checklist; per-case "Request a document" stays (SA1B-X17, SA1B-X18). | SA1B-D39, SA1B-D40 · SR-Q1, SR-Q3, SR-Q5, SR-Q9 · R9-1, R9-3, R9-4 · Rule 9 pass (SA-01B) |
> | 1.3 | 2026-10-12 | **Applied the template-management review decisions of 10–12 Oct 2026** (`TEMPLATE-MAP-working_2026-10-10.md`). **Rule 7:** the pack carries **no required wording** — SA-1B-48 is **withdrawn**; the assessment disclaimer is an editable starter paragraph in the firm's Assessment summary template (map §13 #3, §17 #2; SA1B-D20, SA1B-D22; SA-1B-80, SA-1B-87 changed); "disclaimer / compliance text" in the regulator setup (SA-1-8) becomes **optional editable starter wording**; the regulator section is renamed "Regulator setup"; no expert or SME check on any wording. **Government steps** (SA-1B-45, SA-1B-46, SA-1B-69) gain a **staff name and a plain client name per language** written by ExpatReady (the firm may rename its copy), a **"has a deadline" mark** and a **usual timeline** that pre-fills the required due date (decisions 7 and 16; O32); reminder wording is template content, not pack. **Firm extensions:** a firm may **hide** ExpatReady's standard checklist items and standard steps firm-wide — recorded, reversible, new cases only, Owner and Admin, government steps with deadlines not hideable (rule 7, Q17, decision 15; SA-1-34, SA-1-38; SA5-X17); the questionnaire is a **firm layer over the live standard questionnaire, no clones**, hide / reorder only questions ExpatReady marked optional, plus the **"who answers" switch, Release 1** (Q18, R26; SA1B-D25, SA-1B-93, SA-1B-94 changed). **Pack additions (O32, Q24, O30):** a "standard step" (action line) kind, a usual-timeline field, law-society licence formats; **any representative type counts as a licence**; **no pack automation templates**, retainer clause sets, e-sign recitals, retention classes or numbers. **Startable check fixed (D1):** a programme is startable when sections exist for every person, every condition resolves and every form on the row has a current edition; the box-map requirement and box-map warnings return with autofill (SA-1B-63, SA-1B-90, SA-1B-92, SA1B-D24). **Pack maintenance (R34):** "next review" column + weekly content-team email + publish warning; the unused-sections list (SA-1B-17) is parked. **Spec follows code (12 Oct):** six reference-table types are fixed in code, columns editable per version (SA-1B-41 – SA-1B-44, SA1B-D17). Each canonical field carries a privacy mark and an immigration-significant flag (SA5-X18(f)). §0.2 rows SA1B-X3, X4, X6 updated and SA1B-X11 – X15 added; SA5-X18 recorded as applied; §12 and §13 refreshed (not-decided items listed with recommendations). **Changed:** SA-1B-1, SA-1B-17, SA-1B-24, SA-1B-39, SA-1B-40, SA-1B-41 – SA-1B-44, SA-1B-45, SA-1B-46, SA-1B-57, SA-1B-63, SA-1B-69, SA-1B-80, SA-1B-87, SA-1B-90, SA-1B-92, SA-1B-93, SA-1B-94, SA-1-8, SA-1-10, SA-1-34, SA-1-38, SA-1-39, SA1B-D17, SA1B-D19, SA1B-D20, SA1B-D22, SA1B-D24, SA1B-D25. **Added:** SA-1B-96 – SA-1B-100, SA1B-D29 – SA1B-D38, SA1B-X11 – SA1B-X15, open questions SA1B-Q1 – SA1B-Q8. **Withdrawn:** SA-1B-48. | SA1B-D29 – SA1B-D38 · map rules 7, 8 · Q17, Q18, Q24 · O30, O32 · decisions 7, 11, 15, 16 · R26, R34 · D1 · "spec follows code" · SA5-X18 |
> | 1.2 | 2026-10-05 | No licence monitoring (the product owner, 5 Oct; decision AG1-D19, owned by AG-01). **SA1B-X8 changed (v1.2 — AG1-D19):** a firm records its regulator and licence number; the platform does not track expiry, warn or block, and the expiry date is no longer recorded. No other licence validity or expiry monitoring was found in this module (document validity, SA1B-D14 and SA-1B-21 – SA-1B-24, and review dates on pack content, SA1B-D19, are unrelated to licences and are unchanged). 5 Oct (final check fixes): header status now "Updated — AG1-D19 applied" and previous-version line points to the archived v1.1. No requirement changed. | AG1-D19 |
> | 1.1 | 2026-09-23 | **Form autofill parked for Release 1** (SA1B-D28). The form *list* still ships — a row's form lines, assignment, upload, e-sign and readiness — while box maps, deterministic filling, the forms editor and placeholder P1 wait until the content pack SQR is final. §0.1, §0.2 (new SA1B-X10 for SA-3), §0.3 and §3.5 updated; P1's trigger changed. §12 also records what the 23 Sep pull revealed: a deterministic filling engine already exists on the backend, and it refuses IRCC's XFA forms. | SA1B-D28 |
> | 1.0 | 2026-09-22 | **New module, split out of SA-1** (SA1B-D1). Holds the pack's content and the resolver: the library (canonical fields with lead / prospect / case tiers, field groups with placements and derived purposes, answer lists, reusable sections with rules, repeats and coverage, master documents with substitute sets and validity gates, master forms with editions and box maps, conditions, gates and scoring, the reference-table designer, government steps, regulator setup and required wording); **one configurator row per full combination** of Pathway › Program › Category › Sub-category with one line shape for sections, documents, forms and government steps; **filings and pack-declared routes**; person roles with per-person questionnaires, checklists, forms and decisions; one PQR with qualifier blocks and a capped lead form; the assessment output; and the startable and completeness checks. Requirements SA-1-8 – SA-1-43, SA-1-60, SA-1-64 and SA-1-65 moved here from SA-1 **keeping their numbers** (rule 3); new requirements are SA-1B-1 – SA-1B-95. | SA1B-D1 – SA1B-D27 · supersedes the hierarchy parts of SA1-D5 and SA1-D8 · revises SA1-D9 (questionnaire side) |

## Decisions that change this epic (14–18 Oct) *(new 18 Oct)*

The AG-07 review decisions below change this module. Full text: `TEMPLATE-MAP-working_2026-10-10.md`, section "AG-07 review — decisions".

| Decision | What was decided (one line) | What it changes in this epic | Where (requirement / card / section) |
|---|---|---|---|
| AG07-D2 | One rules pin per filing (a filing is one application with its own program inside a case). | Pin wording only: a firm's "Request a document" additions are stored per firm + client + the filing's rules pin. The rule is specified in AG-07; the pin container is SA-1. | SA1B-X18 |
| AG07-D7 | Deficiency checks are pack content; firms have no rule screen. | The case deficiency library is ExpatReady pack content, specified once in SA-01 (SA-1-74). This module's "no deficiency library" lines are corrected. Reasons for sending a document back: see SA1B-Q10. | SA1B-D23, SA-1B-25, SA-1B-95, SA1B-X4, SA1B-Q10 |
| AG07-D8(d) | Forms filled automatically at launch: the design-partner firm's most-filed forms. | Maps for those forms ship in Release 1, specified once in SA-01 (SA-1-75); the rest of the autofill parking stays. A form with no map is completed by hand and never stops a programme from being startable. | SA1B-D28, SA1B-X10, §0.1, §0.3, P1, P2, SA1B-Q12 |
| AG07-D11 | A pre-filled due date on a hand-recorded step is confirmed on save. | The usual timeline still pre-fills the due date; the date is confirmed when staff save the step. | SA1B-D31, SA-1B-96, SA1B-X11 |
| AG07-D16 (Q23) | Fixed 20 % early warning; no per-pack window value. | Referenced only (no change here). This module has no amber-window or early-warning field. See SA1B-Q11 for the related pre-filled target date. | SA1B-Q11 |
| AG07-D17 | Government forms: an answer sheet at launch, plus a trial of direct PDF filling. | P1 is answered: a mapped form reaches staff as an answer sheet at launch; direct XFA filling only after a form passes the trial (specified in SA-01 SA-1-75). How the maps are authored is not decided by the map: SA1B-Q12 stays open. | P1, §0.1, SA1B-D28, §12, SA1B-Q12 |
| AG07-D18 | A rules version record per person on a filing. | Pin wording only: "Request a document" additions sit on the person's rules pin on the filing. | SA1B-X18 |
| AG07-D20(i) | Target date: one optional pack field "usual processing time (days)" per program. | New requirement SA-1B-101 and card; empty means no pre-fill; filled by the immigration expert. SA1B-Q11 closed. *Withdrawn 18 Oct — AG07-D26(5).* | SA-1B-101 (card), SA-1B-52, SA1B-Q11, §14 |
| AG07-D26(5) | The target filing date is not pre-filled from processing times. SA-1B-101 and the pack field "usual processing time (days)" are withdrawn. | SA-1B-101, its card and its settings row are marked withdrawn; SA-1B-52 and SA1B-Q11 point here. The pack holds no processing time. | SA-1B-101 (card), SA-1B-52, SA1B-Q11, §14 |
| AG07-D26(7) | The pack states, per form, who completes it, copies, people, minimum age, condition and country variant. | New SA-1B-102 on the form line. AG-07 reads it. | SA-1B-102, §0.3 |
| AG07-D27(5) | The pack states, per form, who signs it and how. A form line with the field empty is treated as needing a signature. Staff switch it per case, with a reason. | SA-1B-102 gains the optional fields `signedBy` and `signatureMethod` (values in SA-1B-102). The per-case switch is AG-07's, not stored in the pack. | SA-1B-102, §0.3 |
| AG07-D26(8) | New section "Country-specific requirements" shared by every program; a document older than the program allows shows a warning only. | New SA-1B-103 with its card (§3.10) and SA-1B-105 (program recency rule). | SA-1B-103 (card), SA-1B-105, SA1B-Q13, §0.3 |
| X-3 | Expiry watch: document expiry yes/no and validity are a placeholder here. | New SA-1B-104, a placeholder to be specified in the AG-11 review. | SA-1B-104 |
| AG07-D20(p) | Document return reasons: the firm keeps its own short list, defaults supplied. | Reasons for sending a document back stay firm-owned, with ExpatReady defaults. SA1B-Q10 closed. Home: AG-09. | SA1B-D23, SA-1B-25, SA-1B-95, SA1B-Q10 |
| AG07-D20(w) | Usual timelines in the pack count calendar days; the immigration expert confirms. | One line on the usual timeline of a government step. | SA1B-D31, SA-1B-96 |

## Module SA-1B: Content Pack Configurator

> **What this document is.** The build specification for the content side of the Country Pack. It is the outcome of the brainstorming session of 22 Sep 2026, held in the Spec Kit way — understand, clarify, prioritise, defer — one question at a time. **§0** records each decision; every later section is written to match it.
>
> **Plane:** GLOBAL (Super Admin console). **SA-1 is the container** — countries, pack versions, draft → review → approve → publish, rollback, validation and authoring tools, completeness profiles, firm read with pinning and adoption. **This module is the content and the resolver.**
>
> **Consumed by:** AG-2 (lead capture and the prospect screen), AG-3 (assessment and qualifiers), AG-7 (cases, filings and stages), AG-8 (the client questionnaire), AG-9 (documents), AG-5 / AG-6 (fees on quotes and invoices), **AG-11** (the Government deadline countdown reads the "has a deadline" mark and usual timeline), **AG-13** (standard steps) and **AG-15 / CP-01** (client names on the portal timeline). **Reads from:** SA-1 (versions and publishing), SA-6 (permissions). **Permissions:** the `system/*` keys of SA-1.
>
> **Four decisions went against the recommendation** and are marked as the product owners' call, with the exposure recorded rather than argued: SA1B-D18 (no rule tests), SA1B-D23 (no deficiency library *(changed 18 Oct — AG07-D7: the case deficiency library is now ExpatReady pack content, SA-1-74)*), and in SA-1 the licence declaration and French remaining optional.

### 0. Decision log (brainstorming session of 2026-09-22)

| ID | Decision | Where applied |
|---|---|---|
| **SA1B-D1** | **SA-1 is split in two.** SA-1 keeps the container — countries, pack versions, draft → review → publish, rollback, firm read, pinning and adoption. This module holds the content and the resolver: the library, the configurator, filings and routes, the prospect tiers, the assessment output and the publishing checks that are specific to content. | This file · SA-01 v2.2 §0.1 |
| **SA1B-D2** | **Four levels, each answering one question:** Pathway (who the client is — Individual or Corporate) → Program (area of immigration) → Category (the application the firm opens) → Sub-category (the variant). Client type comes from the Pathway. Inside or outside Canada is a case detail with allowed locations per category. Whether an invitation has been received is which filing the case is on, not a level. | §4 · SA-1-11, SA-1-60 changed · replaces SA1-D5, SA1-D8 (hierarchy) |
| **SA1B-D3** | **Corporate means the employer is the client** — labour market assessments, employer compliance and inspections, offers of employment for assessment-exempt workers. The worker's own permit is an Individual case, linked. | §4, §6 · SA-1B-70, SA-1B-71 |
| **SA1B-D4** | **Express Entry is one category run as two filings** — the profile, then the post-invitation application. The profile filing scores and shows which of the federal programs the client qualifies for; the second filing has its own row, documents and forms. | §6 · SA-1B-66 |
| **SA1B-D5** | **Provincial programs: category is the province's programme, sub-category is the stream**, each labelled as aligned with Express Entry or not. Opening, pausing or changing a stream is a normal dated publish. | §4 · SA-1B-50 |
| **SA1B-D6** | **One row per full combination.** A row holds its own complete, ordered list; nothing flows down from a Pathway or Program. Repetition is handled by copy-from-row and by adding or removing one item across many rows, with the affected rows listed before approval. | §5 · SA-1B-55, SA-1B-56, SA-1B-61 |
| **SA1B-D7** | **One line shape for sections, documents, forms and government steps**, each carrying who it is for (once for the application, or each person in these roles) and an optional condition. A line is created only on a row or on a question inside a section, and every resolved item carries the reason it is there. | §5 · SA-1B-57 – SA-1B-59 |
| **SA1B-D8** | **A case holds filings.** A filing is one application to one authority with its own row, questionnaire, checklist, forms, fees, deadlines and decision — side by side for a family's separate permits, in sequence for a two- or three-level route. The route is pack content per category. | §6 · SA-1B-64 – SA-1B-69 · revises SA1-D5's case assumptions |
| **SA1B-D9** | **A family is one case, with per-person outcomes.** Each person has their own row and role, questionnaire, checklist and forms, plus their own application number, fee and decision. Shared answers are asked once and a shared document is uploaded once. | §7 · SA-1B-72 – SA-1B-76 |
| **SA1B-D10** | **Person roles are pack content** per country, and a person's items are their row's lines filtered by their role. | §7 · SA-1B-72, SA-1B-73 |
| **SA1B-D11** | **Field groups, placements and purposes.** A group (address, job, education, travel, family member) is defined once with its own checks; a placement sets only the wording, help text, requiredness and the visibility of optional fields; list-shaped subjects are asked once and purposes are derived by one of five fixed kinds. Forms, conditions and coverage reference the purpose, never the section. | §3.2 · SA-1B-6 – SA-1B-12 |
| **SA1B-D12** | **Repeating sections with coverage rules** — period, starting point, the gap allowed, and what a longer gap triggers, with submission blocked until an explanation is given. | §3.3 · SA-1B-15 |
| **SA1B-D13** | **Alternatives live in the library.** A master document names its substitute set, satisfied by any one member or by all of them together; where programmes differ the library holds a second named set and the row picks it. A row never defines its own substitutes. | §3.4 · SA-1B-19, SA-1B-20 · SA-1-33 changed |
| **SA1B-D14** *(changed v1.4 — R9-4)* | **Document validity is pack content, and it only warns** — whether it expires, how the date is known, what it must outlive, and warning lead times (default **90 and 30 days**). The "blocks submission" choice is **removed**: every document type warns only (rule 7). Reminders derive from it; readiness uses "valid at submission". | §3.4 · SA-1B-21 – SA-1B-24 |
| **SA1B-D15** | **No upload field type; one live checklist per person**, opening with the row's base items and growing as answers arrive, each item labelled with its reason. A requirement that stops applying drops off, and anything already uploaded is kept and marked no longer required. | §3.1, §3.4 · SA-1B-3, SA-1B-52 |
| **SA1B-D16** | **Form filling is deterministic; AI stays out of the fill path.** A row points at the form, not the edition. AI may draft and diff box maps and extract answers from uploaded documents with a confirmation step, and never sets a value at fill time. The platform produces values, never a submission-ready barcode. | §3.5 · SA-1B-26 – SA-1B-35 · SA-1-27 – SA-1-32 changed |
| **SA1B-D17** *(amended v1.3 — SA1B-D36)* | **Reference tables: a table designer for columns.** Content publishers edit typed columns with keys and rules on the fixed table types (SA1B-D36); definitions are versioned pack content needing second-person approval; publishing blocks references to missing columns and rows that break their table's rules. | §3.7 · SA-1B-41 – SA-1B-44 · SA-1-39 – SA-1-41 changed |
| **SA1B-D18** | **Rules and scoring are trusted by second-person approval alone** — no mandatory test profiles, no test run at publish, no acceptance test against the V1.5 calculators. *Product owners' call, against the recommendation; the exposure is that a wrong gate or points row reaches clients in writing if the reviewer misses it.* | §3.6 · SA-1B-38 |
| **SA1B-D19** *(changed v1.3 — R34)* | **Source, date checked and next-review date on everything reflecting a government rule**, with a sortable "next review" column, a weekly email to the content team and a warning at publish (SA1B-D35). Nothing expires silently. | §3.6 · SA-1B-39, SA-1B-40 |
| **SA1B-D20** *(changed v1.3 — rule 7, SA1B-D29)* | **The assessment shows verdict, reason and gap**, carries no pack wording (the disclaimer is the firm's editable starter paragraph in its Assessment summary template), shows a "rules as at" date, and stores the pack version and answers so it can be reproduced. **No comparison against draw cut-offs**, so the pack holds no draw data. | §9 · SA-1B-85 – SA-1B-89 |
| **SA1B-D21** | **One PQR per country, unfolded by rules; three tiers by a field flag.** Block 0 plus one block per qualifier; every canonical field is flagged lead, prospect or case; the lead form is capped and gives an indicative result; each tier pre-fills the next. Configurator rows do not own the PQR. | §8 · SA-1B-77 – SA-1B-84 |
| **SA1B-D22** *(changed v1.3 — rule 7, SA1B-D29)* | **The pack carries no client-facing wording.** Assessment disclaimers are template content (SA1B-D29); fee-quote wording is the firm's, including how it caveats the government fees the pack supplies. | §3.9 · SA-1B-48, SA-1B-49 |
| **SA1B-D23** *(changed 18 Oct — AG07-D7)* | **Deficiency reasons are firm-owned**; the pack carries no deficiency library. *Product owners' call, against the recommendation; the firm owns the wording and its French, and there is no cross-firm view of why files stall.* *(changed 18 Oct — AG07-D7)* **The case deficiency library is now ExpatReady pack content with no firm rule screen (SA-01, SA-1-74).** *(changed 18 Oct — AG07-D20(p))* Reasons for sending a document back stay firm-owned: the firm keeps its own short list, with ExpatReady defaults supplied (SA1B-Q10 closed; home AG-09). | §3.4, §11 · SA-1B-25, SA-1B-95 |
| **SA1B-D24** *(changed v1.3 — D1)* | **A programme is startable only when its row is complete** — sections for every person (role) used, every condition and reference resolvable, and every form on the row with a current edition. The box-map requirement returns with autofill (SA1B-D28). The console lists what is startable and what each unready row is missing. | §10 · SA-1B-90 – SA-1B-92 · SA-1-35 changed |
| **SA1B-D25** *(changed v1.3 — Q18, R26; withdrawn — W-17)* | **Firms do not change the questionnaire *(revised same day — W-17)*.** Firms see only the **final questionnaire** and the **dynamic document checklist** for the case's programme, category and family; the configuration behind them (conditions, field groups, scoring, form mapping) is ExpatReady's and never shown to firms. **Withdrawn:** firm-added questions, hiding or reordering optional questions, the "who answers" switch (SA1B-D38). Firm-specific facts every client is asked (e.g. referral source) go on the lead / client record (AG-02 / AG-07). No clones; ExpatReady's updates flow in and each case stays on the pack version it started with. | §11 · SA-1B-93, SA-1B-94 · revises SA1-D9 (questionnaire side) |
| **SA1B-D26** | **A category does not record which representative types may act on it**; firms are responsible for their own professional limits. | §4 · SA-1B-53 |
| **SA1B-D27** | **Government fees per category and sub-category**, taken from the fee table with the fee name and who pays. No official links and no processing times. | §4 · SA-1B-52 |
| **SA1B-D28** *(changed 18 Oct — AG07-D8(d), AG07-D17: maps for the launch forms ship in Release 1 and feed an answer sheet; direct filling only after a form passes the trial; SA-1-75.)* | **Form autofill is parked for Release 1.** Release 1 keeps the **form list**: each row lists the forms its filing needs, the case assigns them, staff upload and e-sign them, and the readiness gate applies. **Parked until the content pack SQR is final:** box maps, deterministic filling, the forms editor, and placeholder P1 (how a filled form reaches the staff). *Reason:* a box map points at purposes and fields the library has not settled yet, so mapping now means mapping twice. *When it returns, the fill stays deterministic* (SA1B-D16) — AI reads scanned documents into answers and drafts box maps for approval, but never sets a value at fill time: an agent does not solve the XFA blocker (a file-format problem), and a generated value on a signed form cannot be traced by a reviewer. *(changed 18 Oct — AG07-D8(d))* **Exception for launch: maps for the design-partner firm's most-filed forms ship in Release 1 (SA-01, SA-1-75).** The Filler fills those forms; every other form is completed by hand; a form with no map never stops a programme from being startable. The rest stays parked. | §0.1 · §0.2 SA1B-X10 · §0.3 · §3.5 · §13 P1 |
| **SA1B-D29** *(new v1.3 — rule 7, map §13 #3, §17 #2)* | **The assessment disclaimer is template content, not pack content.** ExpatReady never locks legal wording: SA-1B-48 (required wording a firm cannot remove) is withdrawn. The "not a guarantee of approval" paragraph is an editable starter inside the firm's Assessment summary template — the firm edits, replaces or deletes it. The disclaimer actually shown is reproduced from the template version recorded on the send (SA-05), not from the pack. No expert check on the wording. | SA-1B-48 withdrawn · SA-1B-80, SA-1B-87 · SA-1-8, SA-1-10 · SA1B-X6 |
| **SA1B-D30** *(new v1.3 — Q17, rule 7, decisions 15 and 16; changed v1.4 — SR-Q9)* | **Hiding standard items and renaming client names.** A firm may hide ExpatReady's standard checklist items and standard steps **that carry no deadline** firm-wide *(revised same day — W-15)* (`agent/case:configure-pack` — Owner and Admin by default, grantable through a custom role; recorded who and when; reversible; never deleted; new cases only; anything with a deadline (of any kind) and all government steps can never be hidden; staff mark any item "not applicable" per case), and rename the plain client name of government and delivery steps in its own copy. Container rules and data are in SA-01 (SA1-D11, SA-1-66, SA-1-67). | SA-1-34, SA-1-38 changed · SA-1B-45, SA-1B-46 |
| **SA1B-D31** *(new v1.3 — decisions 7 and 16)* | **Each government step carries a staff name and a plain client name, per language**, written by ExpatReady with no expert sign-off (e.g. "Biometrics instruction letter (BIL)" → "Give your fingerprints and photo"); the firm may rename the client name in its copy. A step the pack marks **"has a deadline"** (biometrics, additional documents, passport request, medical …) carries a **usual timeline** that pre-fills the due date staff record; the due date is required, editable for extensions. *(changed 18 Oct — AG07-D11)* The pre-filled date is **confirmed when staff save the step**; the save is the person's click. *(changed 18 Oct — AG07-D20(w))* The usual timeline counts **calendar days**; the immigration expert confirms it. A data-entry rule, not a legal lock. Reminder points and wording are not pack content. | SA-1B-45, SA-1B-46, SA-1B-69, SA-1B-96 · SA1B-X11, SA1B-X12 |
| **SA1B-D32** *(new v1.3 — O32, Q24)* | **Pack additions:** a "standard step" (action line) kind; a usual-timeline field; law-society licence formats. **Any representative type** in the regulator setup counts as a licence for the two kept licence checks. | SA-1B-97, SA-1B-96, SA-1B-98 · SA1B-X13 |
| **SA1B-D33** *(new v1.3 — O30, rule 7, decisions 6 and 11, Q19; SA5-X18(d))* | **The pack carries no message wording or firm-data rules:** no separate pack "automation templates" (the pack supplies deadline data the Minder and the Government deadline countdown read), no retainer required-clause set, no e-sign recitals, no retention horizons, numbers or classes (keep-periods are the firm's one setting, Q19). | SA-1B-1 changed · SA-1B-24 changed · SA-1B-100 |
| **SA1B-D34** *(new v1.3 — D1)* | **The startable check is fixed.** A programme is startable when sections exist for every person, every condition resolves, and every form on the row has a current edition. The box-map requirement (SA-1B-90 / SA1B-D24) and the box-map warnings (SA-1B-63 flag; SA-1B-92 "form boxes filled automatically") return with autofill (SA1B-D28). Not built today. | SA-1B-63, SA-1B-90, SA-1B-92 |
| **SA1B-D35** *(new v1.3 — R34)* | **Pack maintenance.** An item past its review date shows in a sortable "next review" column in the pack editor, in a **weekly email to the content team**, and as a warning at publish; no queue screen. The review-date fields (SA-1B-39) stay. The list of sections used by nothing (SA-1B-17) is **parked**. Not built. | SA-1B-39, SA-1B-40, SA-1B-17 · SA-1-51 |
| **SA1B-D36** *(new v1.3 — spec follows code, 12 Oct)* | **Reference tables: six table types are fixed in code; columns are editable per version in the console.** A new table type is a code deploy. Bulk upload and second-person approval stay. | SA-1B-41 – SA-1B-44 · SA-1-39 · §12 |
| **SA1B-D37** *(new v1.3 — SA5-X18(f))* | **Each canonical field carries a privacy mark and an "immigration-significant" flag**, read by SA-05's fill-in picker (verified values only for flagged fields). | SA-1B-1 |
| **SA1B-D38** *(new v1.3 — Q18, R26; changed v1.4 — R9-1; withdrawn — W-17)* | **"Who answers" switch — withdrawn *(revised same day — W-17)*.** Not built, and not needed: staff already fill answers on the client's behalf on the case. | SA-1B-99 · §0.2 SA1B-X3 |
| **SA1B-D39** *(new v1.4 — SR-Q3, SR-Q1, SR-Q5)* | **Staff role names and the second person.** Pack authors and approvers are **Content publishers**; the second person for a production pack is the Platform Owner or another Content publisher. The approver does not edit: the approver approves exactly what was submitted, and to fix something rejects with a reason so the author fixes and resubmits (container rule: SA-01 §3.12, SA1-D6). | §2 · SA-01 SA1-D6, SA1-D17 |
| **SA1B-D40** *(new v1.4 — Rule 9 pass)* | **Settings — defaults and placement.** Every kept setting in this module has a stated default and a placement (Main, Advanced or code constant) in §14, so a content team and a new firm work from the defaults without opening Advanced. | §14 · SA-1B-7, SA-1B-18, SA-1B-23, SA-1B-39 *(SA-1B-93, SA-1B-99 withdrawn — W-17)* |

**Applied from earlier reviews**

| ID | Decision (owner) | Applied here |
|---|---|---|
| SA1-D2 | English required, French optional for Release 1 (SA-1) | §3.9 · unchanged by this review; the console's "missing French blocks publish" is rejected for Release 1 |
| SA1-D10 | The pack holds 17 content areas with completeness profiles (SA-1) | §3 · SA-1-64 moved here; the profile itself stays in SA-1 (SA-1-63) |
| SA2-X11 | Release 1 launches no Quebec immigration programs (SA-2) | SA-1-65 moved here |

#### 0.1 Deferred (carry to the deferral register)

| Item | Why deferred | Reopen when |
|---|---|---|
| Box maps and deterministic form filling (SA-1B-27 – SA-1B-32), the forms and field-map editor, and AI drafting of box maps (SA-1B-33) *(changed 18 Oct — AG07-D8(d): maps for the partner firm's most-filed forms ship in Release 1, SA-1-75; how they are authored: SA1B-Q12)* | Maps point at purposes and fields the library has not settled; mapping now means mapping twice (SA1B-D28) | The content pack SQR is final |
| **P1** *(answered 18 Oct — AG07-D17)* — the delivery route for a filled form (XFA data packet · data file imported in Adobe Reader · portal order · the built AcroForm path) | Only bites when filling resumes *(changed 18 Oct — AG07-D8(d): it bites at launch for any XFA launch form, SA1-Q18)* | With the box maps **Answered 18 Oct — AG07-D17:** at launch a mapped form reaches staff as an **answer sheet** (each form field's value in the form's own order, a copy button per value; PDF and portal forms alike); direct XFA filling is added per form only after it passes the trial (opens, validates, barcode correct, Adobe signature intact; backend lead). See SA-01 SA-1-75. |
| AI reading of uploaded documents into answers | Needs an extraction service, confidence handling and a review screen; the fill path works without it | The box maps are live and the checklist is in daily use |
| Translation tooling — export and import for translators, machine translation, stale-translation detection | French is optional in Release 1 (SA1-D2), so there is nothing to keep in step yet | French becomes required, or a second country starts |
| Rule and scoring test profiles, and the acceptance test against the V1.5 calculators | Second-person approval is the chosen control (SA1B-D18) | A wrong published rule reaches clients, or a second country multiplies the content |
| Comparison of a score against published draw cut-offs | No draw data is held (SA1B-D20) | Clients and staff keep asking where a score stands |
| Employer compliance depth — recruitment and advertising tracking, prevailing wage, inspection handling | The corporate case shape ships without it (AG-7's existing line) | Employer clients are live and volume justifies it |
| **Parked 12 Oct (R34):** list of sections used by nothing (SA-1B-17, second half); overdue-review queue screen (SA-1B-40 now a column, email and warning) | Housekeeping; small team, one country | The pack grows or a second country starts |
| **Deferred to the AG review (map, 12 Oct):** whether "ExpatReady updated '…', which you've hidden. Review?" ships in Release 1 | Firm-side overlay; decided in rule 7, build timing not | The AG review (see SA-01 §13 SA1-Q1) |

#### 0.2 Decisions taken in this review that other modules must apply

Each row stays **Pending** until the owning module's review applies it.

| ID | Owner | Requirement text to apply | Status |
|---|---|---|---|
| SA1B-X1 | AG-7 | A case holds **filings**; each filing has one row, its own questionnaire, checklist, forms, fees, deadlines and decision. A family is one case with per-person rows, roles and outcomes. The delivery steps run inside each filing; the government steps come from the filing's row. A case shows its position in a route. | Pending |
| SA1B-X2 | AG-7 | A category or sub-category is offered when opening a case only when its row is startable (SA-1B-90). | Pending |
| SA1B-X3 *(changed v1.3 — Q18, R26; changed v1.4 — R9-1)* | AG-8 | The questionnaire is assembled per person from their filing's row filtered by their role; sections come from the library with placements and purposes; there is no upload field type; answers carry forward from the lead form and the PQR. **Firms see only the final questionnaire — no clones; AG-8-9 – AG-8-11 (clone and customise) are withdrawn.** *(Revised same day — W-17:)* no firm-added questions, no hiding or reordering of optional questions, no "who answers" switch, and no firm questionnaire screens (R9-1 withdrawn); staff fill answers on the client's behalf on the case. | Pending |
| SA1B-X4 *(changed v1.3 — Q17; changed v1.4 — R9-4)* | AG-9 | Document expiry only warns — it never blocks submission (default lead times 90 and 30 days); a requirement that stops applying is marked "no longer required" rather than deleted; deficiency reasons are firm-owned *(changed 18 Oct — AG07-D7: case deficiency checks are pack content, SA-1-74; see SA1B-Q10)*. Checklist items the firm has hidden (SA1-D11) are not requested on newly opened cases; open cases keep them. The pack carries no retention class (SA1B-D33). | Pending |
| SA1B-X5 | AG-2 | Lead capture uses the lead-flagged fields within their cap and shows an indicative result; the prospect screen shows declared intent, status, each qualifier's verdict and what is missing to score; sales fields stay in AG-2. | Pending |
| SA1B-X6 *(changed v1.3 — rule 7)* | AG-3 | The assessment shows a verdict per programme with the deciding rule and the gap, carries the disclaimer paragraph of the firm's own Assessment summary template (editable starter; no pack wording) and a "rules as at" date, and stores the pack version and answers for reproduction. | Pending |
| SA1B-X7 | AG-5 / AG-6 | A fee quote carries the firm's own wording; government fee amounts and their "as at" date come from the pack's fee table. | Pending |
| SA1B-X8 *(changed v1.2 — AG1-D19)* | SA-2 | A firm records its regulator and licence number; the platform does not track expiry, warn or block. The firm agreement carries the obligation to keep the licence current and the record accurate. | Pending |
| SA1B-X9 | SA-3 | How a family case with several filings counts against plan limits (placeholder P3). | Pending |
| SA1B-X10 | SA-3 | The "auto-prefilled forms" plan limit has nothing to meter in Release 1, because form autofill is parked (SA1B-D28) *(changed 18 Oct — AG07-D8(d), AG07-D16 Q9: the Filler now runs for the launch forms, and it is on every plan, so there is still no limit to meter; SA3-D14 already removed it)*. Mark the metric dormant for Release 1 or drop it from the plans until filling returns. | Pending |
| SA1B-X11 *(new v1.3 — decision 7)* | AG-11 | The **Government deadline countdown** reads the "has a deadline" mark and the usual timeline of the filing's government step (SA-1B-96). The due date is required when staff record a deadline step, pre-filled from the usual timeline, editable for extensions, and confirmed when staff save the step *(changed 18 Oct — AG07-D11; reminders read the confirmed date)*; reminder points and wording are AG-11 / SA-05, not pack. | Pending |
| SA1B-X12 *(new v1.3 — decision 16)* | AG-15 / CP-01, AG-17 | The portal timeline shows, before submission, the delivery steps with their client label (SA-1B-46) and, after submission, the pack's government steps with their plain client name and due date (SA-1B-45); the firm may rename the client name in its copy (AG-15-15, CP-1-23, AG17-D32). | Pending |
| SA1B-X13 *(new v1.3 — Q24, O32)* | AG-5, AG-7, AG-1 | Every representative type in the regulator setup passes AG-5's "No active licensed consultant" block and AG-7's lead-representative picker; licence-number format is checked where the pack holds one for the licensing body; wording is "licence number". The platform does not track licence expiry (SA1B-X8). | Pending |
| SA1B-X14 *(new v1.3 — R34)* | SA-5 | The weekly email to the content team listing pack items past their review date (SA-1B-40): SA-05 decides whether it is listed as an ExpatReady email in Appendix B or fixed system wording like staff notifications. Not decided here. | Pending |
| SA1B-X15 *(new v1.3)* | Developers | Re-base on this version (§12): the startable check (D1), review-date fields, "next review" column and weekly email (R34), privacy mark and immigration-significant flag on canonical fields, client names and "has a deadline" / usual timeline on government steps, the standard-step line kind, law-society formats, the firm hide records and client-name overrides (SA-01 SA-1-66) *(revised same day — W-17: the questionnaire layer and the who-answers field are withdrawn)*. Table types stay fixed in code (SA1B-D36). | Pending |
| SA1B-X16 *(new v1.4 — R9-4, R9-1)* | Developers | Remove the "blocks submission" option from document expiry (SA-1B-23); pre-fill review dates (SA-1B-39); ~~build the firm questionnaire area as three separate collapsed sections~~ *(withdrawn — W-17)*. | Pending |
| SA1B-X17 *(new — W-17)* | AG-8 (questionnaire) | Firms see only the final questionnaire for the case's programme, category and family; clone-and-customise, firm-added questions, hiding / reordering optional questions and the "who answers" switch are withdrawn. Firm-specific facts every client is asked go on the lead / client record (AG-02 / AG-07). Decided in the AG review. | Pending |
| SA1B-X18 *(new — W-17)* | AG-7, AG-9 (cases, documents) | "Request a document" on a case is the firm's only way to add a document to a checklist — a per-case addition (`PackTenantExtension` kind `CHECKLIST_ADDITION`, stored per firm + client + the person's rules pin on the filing *(changed 18 Oct — AG07-D2, AG07-D18: per applicant per filing)*, `client-spine.prisma:567-585`); no firm-wide extra items. Decided in the AG review. | Pending |

**Rows into this module (applied)**

| ID | From | What | Status |
|---|---|---|---|
| **SA5-X18** | SA-05 v3.1 §0.2 | (a) client names of government steps (SA-1B-45); (b) disclaimers → optional editable starter wording, any representative type passes the licence checks (SA-1-8, SA-1B-98); (c) SA-1B-48 withdrawn, disclaimer in the assessment template; (d) no retainer clause set or retention horizons (SA1B-D33, SA-1B-100); (e) SA-1B-94 wording; (f) privacy mark and immigration-significant flag (SA-1B-1); (g) standard steps hideable, deadline steps not (SA-1B-97, SA-1-38); (h) questionnaire layer, no clones, who-answers switch (SA-1B-93, SA-1B-94, SA-1B-99); (i) standard-step kind, usual-timeline field, law-society formats (SA-1B-96 – SA-1B-98); (j) no pack automation templates (SA-1B-100). | **Applied in SA-01B v1.3** |
| **SA5-X17** | SA-05 v3.1 §0.2 | Hide rule — owned by SA-01; SA-1-34 and SA-1-38 here carry the wording. | **Applied in SA-01 v2.3 and SA-01B v1.3** |

#### 0.3 Release 1 priorities

| Slice | Priority | Notes |
|---|---|---|
| Configurator rows, one line shape, copy and bulk tools, preview | **Must now** | SA-1B-55 – SA-1B-63 · the core of the module |
| Library: canonical fields with tier flags, field groups, placements, purposes, sections with repeats and coverage | **Must now** | SA-1B-1 – SA-1B-17 |
| Master documents: substitute sets, validity (warns only), handling *(changed v1.4 — R9-4)* | **Must now** | SA-1B-18 – SA-1B-25 |
| Filings and pack-declared routes | **Must now** | SA-1B-64 – SA-1B-69 · Express Entry and provincial routes cannot run without it |
| Corporate case shape — one assessment per occupation code, positions list, linked worker cases, exempt offers | **Must now** | SA-1B-70, SA-1B-71 · depth deferred |
| People and roles, family case with per-person outcomes | **Must now** | SA-1B-72 – SA-1B-76 |
| One PQR with qualifier blocks and the three tiers | **Must now** | SA-1B-77 – SA-1B-84 |
| Assessment output | **Must now** | SA-1B-85 – SA-1B-89 |
| Startable and completeness checks *(startable check fixed v1.3 — D1)* | **Must now** | SA-1B-90 – SA-1B-92 |
| Source and date fields on content | **Must now** | SA-1B-39 |
| Reference tables — six fixed table types, columns editable per version *(changed v1.3 — SA1B-D36)* | **Must now** | SA-1B-41 – SA-1B-44 · bulk upload stays |
| Programme structure at four levels with fees | **Must now** | SA-1B-50 – SA-1B-54 |
| ~~Firm-owned questions, firm layer over the live questionnaire, who-answers switch~~ *(changed v1.3 — Q18, R26; withdrawn — W-17)* | **Withdrawn** | Firms see only the final questionnaire and the dynamic checklist · SA-1B-93, SA-1B-99 withdrawn; SA-1B-94, SA-1B-95 stay |
| Hide standard checklist items and steps without a deadline; rename government-step client names *(new v1.3 — Q17; revised same day — W-15)* | **Must now** | SA-1-34, SA-1-38 · SA-01 SA-1-66, SA-1-67 |
| Government-step additions: client name, "has a deadline" mark, usual timeline, standard-step kind, law-society formats *(new v1.3)* | **Must now** | SA-1B-45, SA-1B-96 – SA-1B-98 |
| Form lines on a row — the filing knows which forms it needs, assigns them, takes the upload and e-sign, and holds readiness | **Must now** | SA-1B-26, SA-1B-57 · autofill parked (SA1B-D28) |
| Box maps and deterministic filling (SA-1B-27 – SA-1B-32) · the forms editor · AI drafting of box maps (SA-1B-33) | **Defer** | Parked until the content pack SQR is final — SA1B-D28. *(changed 18 Oct — AG07-D8(d): maps for the design-partner firm's most-filed forms are Must now, SA-1-75)* |
| Form-line fields: who completes, copies, people, minimum age, condition, country variant *(new 18 Oct — AG07-D26(7))*; who signs and how, `signedBy` and `signatureMethod` *(new 18 Oct — AG07-D27(5))* | **Must now** | SA-1B-102 |
| Country-specific requirements section; program recency rule *(new 18 Oct — AG07-D26(8))* | **Must now** | SA-1B-103, SA-1B-105 |
| Pack review dates: "next review" column, weekly email, publish warning *(changed v1.3 — R34)* | **Should now** | SA-1B-40 · priority unchanged by the 12 Oct decision |
| AI reading of uploaded documents | **Defer** | §0.1 |
| Translation tooling | **Defer** | §0.1 |
| Rule test profiles · draw comparison | **Defer** | §0.1 · SA1B-D18, SA1B-D20 |

### 1. What this module is

SA-1B is the **Content Pack Configurator**: everything a Content publisher authors inside a country pack, and the engine that turns it into what a client is asked, what they must upload, and which forms are filed.

SA-1 keeps the **container** — countries, pack versions, draft → review → publish, rollback, and how a firm reads and adopts a version. SA-1B holds the **content and the resolver**. The split was made because the two are reviewed, prioritised and built on different rhythms: the container is largely built, the configurator is largely not.

One sentence to hold on to: **the unit everything resolves for is a person on a filing's row** — never a case, never a programme in the abstract.

### 2. Who uses it

- **Content publisher** *(changed v1.4 — SR-Q3, SR-Q5)* — authors the library, the rows, the routes and the reference tables; submits for approval. For another person's production pack, a Content publisher (or the Platform Owner) is the second person who approves and publishes. The approver does not edit: a fault is rejected with a reason and the author fixes and resubmits (SA-1 §3.12).
- **Firm staff** — never author pack content; they consume it, and may hide ExpatReady's standard items and steps that have no deadline and rename client names (Owner and Admin by default; `agent/case:configure-pack`) *(revised same day — W-15, W-17)* — they see only the final questionnaire and the dynamic checklist (§11).

### 3. The library — authored once, reused everywhere

#### 3.1 Canonical fields and answer lists

- **SA-1B-1** *(changed v1.3)* Every question asked anywhere is a canonical field in the library, defined once: key, type, answer list, validation, unit, whether it is about a person or an employer, re-confirmation rule, sensitivity (the sensitivity flags sit under Advanced, §14), a **privacy mark** and an **immigration-significant** flag (read by SA-05's fill-in picker). *(Changed v1.3 — SA5-X18(f), SA1B-D33, SA1B-D37: "retention class" removed — the pack carries no retention class or number; a firm's keep-period is its one firm setting.)*
- **SA-1B-2** Each canonical field carries a **tier flag — lead, prospect or case** — which decides whether it appears on the lead form, the PQR or only in the SQR (§8).
- **SA-1B-3** There is no "upload" field type. A question that needs a file adds a document requirement instead (§3.4, SA-1B-52).
- **SA-1B-4** Answer lists are versioned pack content; a list may be populated from a reference table; retiring a value keeps answers already given.
- **SA-1B-5** Each answer-list value carries its mapping to the matching option on any government form that uses it (§3.5), and publishing warns on an unmapped value.

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-17** Rules, scoring, questions and form maps all refer to the same canonical field catalogue.
- **SA-1-64** *(SA1-D10)* A pack holds the 17 content areas of §3.2, each versioned and date-controlled, including the question library (canonical fields, answer lists, questionnaire sections and selections), reusable conditions, condition flags and document types.

#### 3.2 Field groups, placements and purposes

- **SA-1B-6** A **field group** is a named set of canonical fields that travel together — address, job, education, travel, family member — with its own checks (the country drives the province list and the postal-code format).
- **SA-1B-7** *(changed v1.4 — Rule 9)* A **placement** puts a group into a section and may set only: the client-facing wording, help text, whether it is required, and whether *optional* fields of the group are hidden. A newly placed question is **required** by default (Main, §14).
- **SA-1B-8** A placement can never change the group's field list, its checks, or how a purpose is derived from it.
- **SA-1B-9** Publishing blocks a placement that hides a field which a form box or a rule reads.
- **SA-1B-10** A list-shaped subject is **asked once**: one list with dates, tagged by the client (for addresses: "lives here now", "send post here"). Other people on the case may answer "same as the principal applicant".
- **SA-1B-11** A **purpose** is derived from a list by one of five fixed kinds, chosen from a list and never written as an expression: the entry marked current · the entry marked for post · all entries · the latest entry · entries overlapping a date range.
- **SA-1B-12** Form boxes, rules and coverage rules reference a **purpose**, never a section, so re-organising sections cannot break a form map.

#### 3.3 Sections

- **SA-1B-13** A section is a small, self-contained, reusable set of questions and placements, authored once and used by any number of rows.
- **SA-1B-14** A section carries rules that show, hide, require or make optional its own questions, and rules that add document requirements from an answer (§3.4).
- **SA-1B-15** *(Rule 9: repeat and coverage rules sit under Advanced, off unless added — §14)* A section may **repeat** (one entry per job, address, qualification or family member) with a maximum, and may carry a **coverage rule**: period, starting point (e.g. since the 18th birthday), the gap allowed, and what a longer gap triggers — an explanation, with submission blocked until it is given.
- **SA-1B-16** A section carries an estimated completion time, shown to the client.
- **SA-1B-17** *(changed v1.3 — R34)* A section reports where it is used. *The list of sections used by nothing is parked (SA1B-D35).*

#### 3.4 Master documents

- **SA-1B-18** A master document is defined once: name, what it is, accepted formats, whether a certified translation is required when it is not in English or French, who provides it (client, employer, government), and its handling class (standard, restricted, restricted-health). *(Changed v1.4 — Rule 9:)* a new document type defaults to handling **standard**, **no** certified translation and **"expires" off** (Main).
- **SA-1B-19** A master document names its **substitute set**, satisfied either by **any one** of its members or by **all of them together** (proof of funds = bank letter *and* six months of statements).
- **SA-1B-20** Where programmes accept different substitutes, the library holds a second named set and a row picks which set applies. A row can never define its own substitutes.
- **SA-1B-21** Each document type states whether it expires and **how the expiry date is known**: printed on the document, a fixed period from issue, or a period before an event.
- **SA-1B-22** Each document type states **what it must outlive**: valid at submission, valid at decision, or valid through the permit's duration.
- **SA-1B-23** *(changed v1.4 — R9-4)* Each document type carries its warning lead times — default **90 and 30 days** — and expiry **only warns**. The "blocks submission" choice is removed (rule 7): ExpatReady warns, it does not block.
- **SA-1B-24** *(changed v1.3; changed v1.4 — R9-4)* Only the **data** for reminders derives from SA-1B-21 to SA-1B-23 (whether a document expires, warning lead times); the **wording** is template content ("Document expiring soon", "Upload reminder" — SA-05), and the chase cadence is the firm's setting.
- **SA-1B-25** The pack carries **no deficiency-reason library**; reasons for sending a document back are firm-owned (§11, AG-9). *(changed 18 Oct — AG07-D7: the pack does carry the case deficiency library, SA-1-74; the document-return part stays firm-owned with defaults, AG07-D20(p), SA1B-Q10 closed.)*

- **SA-1B-104** *(new 18 Oct — X-3; placeholder, to be specified in the AG-11 review)* Each document type already states whether it expires and how the date is known (SA-1B-21). For a document that shows a person's status (work permit, study permit, visitor record, PR card), the document type's "expires" yes/no and its validity feed the Expiry watch run by the Minder (AG-11). Which status documents count, and how their validity is known, are not decided here; the AG-11 review names them.
- **SA-1B-105** *(new 18 Oct — AG07-D26(8))* A program may state that a document type must be issued within a number of months (for example a police certificate issued within 6 months). A document older than the program allows shows a warning only, never a block (Rule 7). The warning itself is specified in AG-09.

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-33** *(superseded v1.0 — SA1B-D13, SA1B-D14)* Checklist items with alternates, expiry and roles — replaced by master documents with substitute sets and validity rules (SA-1B-18 – SA-1B-24) and by each line's who and only-if (SA-1B-57).

#### 3.5 Master forms

**Release 1 (SA1B-D28):** the form *list* ships — a row's form lines, assignment, upload, e-sign and readiness — *(changed 18 Oct — AG07-D8(d))* plus the maps for the design-partner firm's most-filed forms (SA-1-75). Everything else below about editions, box maps, transforms and filling is parked until the content pack SQR is final; the requirements stand so the work can resume without re-deciding it.

- **SA-1B-26** A master form is defined once with its editions; the **current edition** and its box map live with the form, so a row points at the form and never at an edition — a new edition never touches a row.
- **SA-1B-27** A **box map** maps a form box to a purpose plus field, with a transform (case, date format, code only), a value map (pack answer list → the form's own options), and overflow handling where the form has fewer rows than the client's list.
- **SA-1B-28** Every value placed on a form is traceable to an answer. Nothing on a form is generated.
- **SA-1B-29** Each box carries a status — filled, needs review, or unmapped — and a form is not ready while a required box is unmapped or needs review.
- **SA-1B-30** Nothing is signed without a person approving it.
- **SA-1B-31** The platform produces values, never a submission-ready 2D barcode: IRCC's barcode forms require Adobe Reader with JavaScript, and the barcode page is created only when a person clicks Validate.
- **SA-1B-32** For categories filed in a government portal there is no PDF; the output is the answers laid out in the portal's own order.
- **SA-1B-33** AI may **draft** a box map for a new form or edition and **diff** a new edition against the existing map; a person approves before publishing.
- **SA-1B-34** AI may **extract** answers from an uploaded document (passport, educational credential assessment, language test) with a confidence score and a human confirmation step.
- **SA-1B-35** AI never sets a value on a form at fill time.
- **SA-1B-102** *(new 18 Oct — AG07-D26(7))* Each form line states: **who completes it**; **how many copies** (per application, per person, or per couple); **which people** (principal, spouse, dependants, and a minimum age); the **condition** (the line's "only if", SA-1B-57); and the **country variant** (a different form code by country, for example IMM 5645 or IMM 5707). A family member who is not accompanying completes forms only when listed in the application (for example the non-accompanying spouse in Express Entry). The pack holds nothing for people outside the case; they use the client's own link. Each form line also states **who signs it** (`signedBy`: `NONE | SUBJECT | PARENT_FOR_MINOR | PRINCIPAL_FOR_FAMILY | SUBJECT_AND_REPRESENTATIVE`; in plain words: no signature, the person the form is about, a parent for a minor, the principal for the family, or the person and the representative) and **how** (`signatureMethod`: `ELECTRONIC | INK`). Both are optional and set by the immigration expert. A form line with `signedBy` empty is treated as needing a signature (AG16-60); an empty `signatureMethod` adds no rule. *(changed 18 Oct — AG07-D27(5))* Which parent signs a child's forms is picked on the case (AG-07), not in the pack. Staff can switch "Signature needed" on or off for one form on one case, with a short reason; that switch is on the case (AG-07, `FormInstance.signatureNeededOverride`), not in the pack, and there is no firm-wide setting. AG-07 reads these fields (single home here).

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-27** *(superseded v1.0 — SA1B-D16)* Form definitions carrying their applicable programmes — replaced by a configurator row pointing at the form with its current edition (SA-1B-26, SA-1B-57).
- **SA-1-28** Each form has editions with an edition date, an effective date and an uploaded PDF; firms are warned when a case uses an edition that is no longer current.
- **SA-1-29** Each edition has a field map (canonical field → form field), editable as data.
- **SA-1-30** The PDF's fillable fields are read on upload; every mapping must point at an existing form field and an existing canonical field.
- **SA-1-31** A field map can be exported and re-imported, with the same checks, all or nothing.
- **SA-1-32** Published editions and maps never change; generated forms are stamped with the edition and map version.

#### 3.6 Rules, gates and scoring

- **SA-1B-36** Conditions are authored once as sentences over canonical fields, purposes and reference tables, and are reused by questions, documents, forms, gates and government steps.
- **SA-1B-37** Eligibility **gates** are hard yes/no conditions per programme; **scoring grids** hold the point rows; both are pack content and both report what they read and where they are used.
- **SA-1B-38** A change to a gate or a scoring grid is trusted by **second-person approval**; there are no mandatory test profiles and publishing runs no test set.
- **SA-1B-39** *(R34: fields stay; changed v1.4 — R9-3)* Every gate, scoring row, document requirement, form edition, fee, programme definition, reference table and government step's usual timeline carries a **government source, a date checked and a next-review date**. The dates are **pre-filled**: date checked = today, next review = +12 months; both editable. Not built (§12).
- **SA-1B-40** *(changed v1.3 — R34, SA1B-D35; changed v1.4 — Rule 9)* An item past its next-review date shows in a **sortable "next review" column** in the pack editor, is listed in a **weekly email to the content team** (every item past its review date), and **warns at publish**. There is no queue screen. The weekly email is fixed — a code constant, not a setting. Content never expires silently.

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-16** *(changed v2.1)* Each program can have one versioned eligibility rule set of hard and advisory rules written in the shared condition language (equals, not equals, in, greater / less than or equal, exists, and, or, not), over canonical fields, inline or by reference to a reusable condition.
- **SA-1-18** Every referenced field must exist and have a compatible type; otherwise save and publish are refused.
- **SA-1-19** Rule sets can be test-run against a sample client, showing pass / fail / missing input per rule.
- **SA-1-20** Published rule sets never change; the version used is stamped on each assessment.
- **SA-1-21** Scoring configurations are points tables, conversion tables, thresholds and composite scores, stored as data and evaluated by one generic engine.
- **SA-1-22** Inputs are canonical fields; outputs are named scores other configurations can use.
- **SA-1-23** Each configuration is versioned and dated; the version used is stamped on each result, so a scoring change needs no code release and old results stay reproducible.
- **SA-1-24** Tables are checked before publish: no gaps or overlaps, caps ≥ floors, every input and output resolvable.
- **SA-1-25** Two versions of a configuration can be compared.
- **SA-1-26** A configuration can be test-run on a sample client, showing the score, its breakdown and the version used.

#### 3.7 Reference tables

- **SA-1B-41** *(changed v1.3 — SA1B-D36, spec follows code)* The pack has **six reference-table types, fixed in code** (the built registry: a synthetic test fixture, occupation, language CLB, fee, proof of funds, wage — `packages/contracts/src/schemas/reference-dataset.ts:79-165`); a new table type is a code deploy (`:160-164`). Content publishers edit the **columns** of each type per version in the console: text, number with a unit or currency, date, yes/no, a choice from an answer list, or a code that must exist in another table (built: `reference-dataset-column-editor.tsx`, saved through `PATCH /pack-admin/drafts/{id}`, `reference-datasets-page.tsx:69-71`).
- **SA-1B-42** *(changed v1.3 — SA1B-D36)* A table definition carries key columns, required / minimum / maximum rules, and the source fields of SA-1B-39. Definitions are versioned pack content needing second-person approval.
- **SA-1B-43** *(amended v1.3)* Publishing blocks a reference to a missing column and a row that breaks its table's rules.
- **SA-1B-44** *(amended v1.3)* Rows are maintained in the console and by bulk upload, with the upload validated against the table definition before it is accepted.

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-39** *(superseded v1.0 — SA1B-D17)* Five named reference tables, versioned and date-ranged — replaced by the table designer (SA-1B-41 – SA-1B-44), *changed v1.3 — SA1B-D36: six table types fixed in code, columns editable per version*; versioning and date selection are unchanged (SA-1-40).
- **SA-1-40** Any row can be looked up for a given date.
- **SA-1-41** *(changed v2.1)* Large tables are bulk-uploaded in the console (CSV, JSON, XLSX): upload → preview with create / update / error counts and row errors → commit, all or nothing, in the background, with a result report.

#### 3.8 Government steps

- **SA-1B-45** *(changed v1.3 — decisions 7 and 16, O32)* A **government step** is a library item — what it is (a **staff name** and a **plain client name per language**, written by ExpatReady with no expert sign-off; the firm may rename the client name in its copy), its deadline rule, its gate, a **"has a deadline" mark** and a **usual timeline** (SA-1B-96) — placed on a row as a line (§5). Reminder points and wording are not pack content (AG-11, SA-05): acknowledgement of receipt, biometrics, medicals, a fairness letter, a decision, a permit issued; and for employers an advertising period, a submission, an interview, a decision and a validity clock.
- **SA-1B-46** *(changed v1.3)* Expat Ready's own delivery steps — file started, questionnaire, document list, uploads, file preparation, representative review, submitted — are platform-standard and are **not** pack content. They run inside each filing (§6). *(Changed v1.3 — decision 16:)* each delivery step carries a **client label per language**, written by ExpatReady, which the firm may rename (SA-1-38, AG17-D32).

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-36** *(superseded v1.0 — SA1B-D8)* One stage pipeline per programme — replaced by government steps as lines on a row, with the delivery steps platform-standard (SA-1B-45, SA-1B-46, SA-1B-69).
- **SA-1-37** *(superseded v1.0 — SA1B-D8)* Declarative workflow blueprint per stage — replaced by the platform-standard delivery steps running inside each filing (SA-1B-46, SA-1B-69).

#### 3.9 Regulator setup

- **SA-1B-47** The pack holds the country's regulator setup: the recognised representative types, each with its licensing body, the licence label and its format.
- **SA-1B-48** *(withdrawn v1.3 — rule 7, SA1B-D29)* Pack "required wording" on an assessment, not removable by a firm. ExpatReady never locks legal wording; the disclaimer is an editable starter paragraph in the firm's Assessment summary template.
- **SA-1B-49** The pack carries no fee-quote wording; that is the firm's (§11).

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-8** *(changed v2.1 — SA1-D4; changed v1.3 — rule 7, Q24, O32; changed v1.4 — Rule 9)* Each country has one regulator setup listing one or more representative types, each with: key, licensing body or a list of bodies, licence label, holder title, optional licence-number format (set under Advanced; none held unless the pack supplies one), and *(changed v1.3 — rule 7)* **optional starter wording, per language, that the firm can edit**. Canada: RCIC (CICC; format checked), Lawyer / notary (provincial law societies and the Chambre des notaires du Québec), Paralegal (law societies licensing paralegals). Every type counts as a licence (SA-1B-98); a licensing body may carry its own licence-number format (law-society formats, O32).
- **SA-1-9** *(changed v2.1)* Where a licence-number format is set, it must pass the author's sample passes and fail the sample fails before save and before publish; patterns are checked to run in bounded time.
- **SA-1-10** *(changed v2.1 — SA1-D4; changed v1.3 — SA1B-D29)* The regulator setup is read by firm modules to record and display each licensed staff member's representative type, licensing body and licence number (SA1-X3), and — *(changed v1.3)* — nothing more: the disclaimer actually shown with an assessment is reproduced from the template version recorded on the send (SA-05), not from the pack.
- **SA-1-42** Every displayed pack text is a label with a value per language; English is the base.
- **SA-1-43** Translations are edited side by side (base left, target right) with completeness per content area.

#### 3.10 Country-specific requirements *(new 18 Oct — AG07-D26(8))*

- **SA-1B-103** The library has one section, **"Country-specific requirements"**, shared by every program. It holds what depends on a country, for example how a police certificate is obtained in each country. It is pack content with the same draft → review → publish flow (SA-01 §3.12). AG-07 and AG-09 point to it and never copy it. → card SA-1B-103.

### SA-1B-103 — Country-specific requirements (pack content)      Decision: AG07-D26(8)   Status: Not built *(new 18 Oct — AG07-D26(8))*

1. Outcome      Staff and clients see, next to a document or form, what applies for the person's country (for example how to get a
                police certificate there), written once for the whole pack.
2. Why          The same requirement differs by country and repeats across programs. One shared section avoids copies that drift
                apart. Example: a police certificate asked for in a spousal and in an Express Entry program points to the same
                entry for the country of issue.
3. Where        Library of the configurator (§3), as a section next to master documents and forms. Read by AG-07 and AG-09.
4. Engine       Rules (no AI). Doer: none (stored content read by AG-07 and AG-09). AI OFF: no difference.
5. Rules        1) One section, shared by every program; entries are written per country.
                2) An entry is attached to a document type or form where the requirement applies; that item shows the entry.
                3) It carries source, date checked and next-review date (SA-1B-39).
                4) Other documents point to it; they never copy it (AG16-11).
6. States       Draft, in review, published; changes follow SA-01 §3.12.
7. Data         Entries per country in the pack. The exact fields are not decided (SA1B-Q13).
8. Access       Author: `system/pack:draft-manage`; publish per SA-01 §3.12. Firm staff read it through the case and the checklist.
9. Events       Existing pack-draft audit entries.
10. Safety      Information only; it never blocks a step (Rule 7). Person decides: staff follow or ignore the guidance.
                Clicks: added 0 for firms; the expert writes one entry per country.
11. Tests       Given a published entry for a country, when a checklist item of that document type is shown for a person from that
                country, then the entry is shown. Given a country with no entry, then the item shows no extra text and no warning.
                Given a draft entry, then firms do not see it.
12. Edge cases  An entry changed after cases exist → cases show the new published text; nothing is copied into the case.
13. Non-goals   No live government lookup. No per-firm version of an entry.
14. Mode        STANDARD.

### 4. Programme structure

- **SA-1B-50** Four levels, each answering one question: **Pathway** (who the client is — Individual or Corporate) → **Program** (the area of immigration) → **Category** (the application the firm opens) → **Sub-category** (the variant that changes rules, questions or documents: a province, a basis, a named stream, an endorsement).
- **SA-1B-51** Client type comes from the Pathway. Inside or outside Canada is a **case detail** chosen when the case is opened, with the allowed locations set per category. Whether an invitation has been received is **which filing the case is on** (§6), not a level.
- **SA-1B-52** Each category and sub-category lists its government fees from the fee table, with the fee name and who pays (principal, spouse, each dependant). No official links. *(changed 18 Oct — AG07-D26(5): government processing times are not listed. The optional field "usual processing time (days)" (SA-1B-101) is withdrawn.)*
- **SA-1B-53** A category does not record which representative types may act on it; a firm is responsible for its own professional limits.
- **SA-1B-54** The pack declares which categories usually follow or support each other, so the platform can suggest a linked case (AG-7).

- **SA-1B-101** *(new 18 Oct — AG07-D20(i); **withdrawn 18 Oct — AG07-D26(5)**: the target filing date is not pre-filled from processing times, so this field is not built; the text below is kept as history only)* A program may carry one optional field, **"usual processing time (days)"**, filled by the immigration expert (Content publisher). Empty means no pre-fill. When filled, AG-07 pre-fills a new case's optional target date from it; the 20 % early warning counts from case creation to that date. The value counts calendar days and carries source, date checked and next-review date (SA-1B-39). → card SA-1B-101.

### SA-1B-101 — Usual processing time per program (pack content)      Decision: AG07-D20(i), AG07-D16 (Q23)   Status: **Withdrawn 18 Oct — AG07-D26(5). Do not build.** *(new 18 Oct — AG07-D20(i))*

1. Outcome      A case officer opening a case sees the target date already filled from how long the program usually takes, and
                can change it. A program with no figure leaves the date empty.
2. Why          AG7-D15 pre-fills the target date "from the pack", but the pack held no such figure (SA1B-Q11). Closed by one optional
                field per program. Example: a program with "usual processing time (days)" = 180 gives a case opened on 1 March
                a target date of 28 August.
3. Where        Program level of the programme tree (§4); shown in the programme row of the configurator (§5). Used by AG-07
                (case target date, single home).
4. Engine       Rules (no AI). Doer: none (a stored value read by AG-07). AI OFF: no difference.
5. Rules        1) One optional whole-number field per program, in calendar days (AG16-6), at least 1.
                2) Filled by the immigration expert; empty = no pre-fill, nothing is invented.
                3) It carries source, date checked and next-review date (SA-1B-39).
                4) It is a suggestion for the target date only; staff edit or clear the date on the case.
                5) The 20 % early warning counts from case creation to the target date and is not a pack value (AG07-D16 Q23).
6. States       Empty or filled; changes follow the pack draft → review → publish flow (SA-01 §3.12).
7. Data         One nullable integer on the program node (days); ExpatReady pack content, not per firm.
8. Access       Author: `system/pack:draft-manage`; publish per SA-01 §3.12. Firm staff read it through the case.
9. Events       Existing pack-draft audit entries.
10. Safety      Warns, never blocks (Rule 7). Person decides: the case officer confirms or clears the target date.
                Clicks: added 0 for firms; the expert fills one optional box per program.
11. Tests       Given a program with 180 days, when a case is opened, then the target date is pre-filled 180 calendar days on.
                Given a program with the field empty, then the target date is empty. Given 0, a negative number or text, then
                the draft cannot be saved and the box shows "Enter a whole number of days, 1 or more".
12. Edge cases  Value changed after cases exist → existing cases keep their date; only new cases read the new figure.
13. Non-goals   No per-category or per-country processing-time feed. No live government lookup. No firm-level override.
14. Mode        STANDARD.

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-11** *(superseded v1.0 — SA1B-D2)* Programmes authored in four levels — replaced by the four levels of §4 (Pathway = Individual / Corporate → Program → Category → Sub-category).
- **SA-1-12** Each node has exactly one parent in the same country; nothing can reference another country's content.
- **SA-1-13** Nodes are disabled, not deleted; a node with children cannot be removed while they exist.
- **SA-1-14** Siblings are reordered as a complete set in one change.
- **SA-1-15** Every node has a stable key that rules, checklists, forms, stages and questionnaire selections refer to.
- **SA-1-60** *(superseded v1.0 — SA1B-D2)* Client type set on each program and inherited — replaced by client type taken from the Pathway (SA-1B-50, SA-1B-51).
- **SA-1-65** *(SA2-X11)* The Release 1 Canada pack covers federal programs only; no Quebec-selected immigration program is authored.

### 5. The configurator

- **SA-1B-55** The configurator holds **one row per full combination** — Pathway › Program › Category › Sub-category, or the Category where it has no sub-categories.
- **SA-1B-56** A row holds its own complete, ordered list of lines. Nothing flows down from a Pathway or a Program, and publishing blocks a line attached above a full combination.
- **SA-1B-57** *(changed v1.3 — O32)* **One line shape** for everything: what (section, document, form, government step or **standard step**, SA-1B-97) → the library item → **who** (once for the application, or each person in these roles) → **only if** (a condition) → order.
- **SA-1B-58** A line is created in only two places: **on a row**, or **on a question inside a section**. Both produce the same line.
- **SA-1B-59** Every resolved item carries **the reason it is there** — "asked because your row is a spousal open work permit", "asked because you said you took IELTS".
- **SA-1B-60** The library supplies a default "who" for an item; a row may change it for that row only.
- **SA-1B-61** Row tools: **copy from another row**; **add or remove one item across many rows**, listing the affected rows before the change goes for approval; and a per-row preview.
- **SA-1B-62** Preview shows, for a sample family, **each person's** questionnaire, checklist and forms exactly as they will appear.
- **SA-1B-63** *(changed v1.3 — D1)* Publishing blocks a line pointing at a missing item, condition or reference; flags an "only if" that can never be true; and flags a role used by the row with no sections. *(Changed v1.3 — D1: the "form with no box map" flag returns with autofill, SA1B-D28.)*

### 6. Filings and routes

- **SA-1B-64** A **filing** is one application to one authority. It has its own row, and therefore its own questionnaire, checklist, forms, fees, deadlines and decision.
- **SA-1B-65** A **case** is the engagement and holds filings **side by side** (a family's separate permits) or **in sequence** (a multi-level route).
- **SA-1B-66** A **route** is pack content per category: the levels, their order, and the row each level uses. Express Entry is two levels (profile, then the post-invitation application); a provincial route is two or three (expression of interest → nomination → federal); a community or employer-endorsed route is two or three (endorsement → nomination → federal).
- **SA-1B-67** When a level is approved, the next filing opens carrying the answers forward, and its row supplies the new documents and forms.
- **SA-1B-68** A case shows its position in the route; each level carries its own decision, and a refusal ends or re-routes the journey.
- **SA-1B-69** *(changed v1.3)* Expat Ready's delivery steps (SA-1B-46) run **inside each filing**; the government steps of that filing's row (SA-1B-45) sit after its submission, each with its own clock and gate. *(Changed v1.3 — decision 7:)* a step marked "has a deadline" is counted down by the Government deadline countdown (AG-11) from the **recorded due date**, which is pre-filled from the usual timeline (SA-1B-96); the reminder wording is a template (SA-05), not pack content.
- **SA-1B-70** Corporate: one case is **one labour market assessment for one occupation code at one work location**, with as many positions as the employer needs. A different occupation code is a different case. Positions are listed inside the case, each optionally linked to that worker's own case.
- **SA-1B-71** Other employer work is its own category with its own row: an offer of employment for an assessment-exempt worker, an employer designation or endorsement, and an inspection or compliance response.

### 7. People and roles

- **SA-1B-72** Person roles are pack content per country — principal applicant, spouse or partner, dependent child, sponsor, co-signer, employer — and a new role is added by publishing.
- **SA-1B-73** Every person on a case has **one filing's row and one role on it**; their questionnaire, checklist and forms are that row's lines filtered by that role and by the "only if" conditions.
- **SA-1B-74** A family is **one case**: each person has their own row, role, questionnaire, checklist and forms, plus their own application number, fee and decision.
- **SA-1B-75** Answers shared by the people on a case are asked once, and a document that serves several people is uploaded once and satisfies each of their checklists.
- **SA-1B-76** Nothing is sent to a person under 18; a parent answers for them.

### 8. Prospect tiers and the PQR

- **SA-1B-77** There is **one PQR per country**: **block 0** — where the person is, their current status, what they are looking for (more than one allowed), their timeline and their family — plus **one block per qualifier** (permanent residence, work, study, visit, family sponsorship, citizenship).
- **SA-1B-78** A qualifier block holds exactly the fields that qualifier reads. Rules unfold blocks from intent and status; "not sure" unfolds permanent residence, work and study.
- **SA-1B-79** Configurator rows do not own the PQR, and publishing warns when a rule reads a field no block asks.
- **SA-1B-80** *(changed v1.3; changed v1.4 — Rule 9)* The **lead form** is the lead-flagged fields (SA-1B-2): one screen, within a cap (a code constant, not a setting), ending in an **indicative** result. *(Changed v1.3 — SA1B-D29: the pack supplies no wording for it; whether and where a disclaimer shows on this result is not decided — §13 SA1B-Q1.)*
- **SA-1B-81** The configurator warns when more fields than the cap carry the lead flag.
- **SA-1B-82** The **PQR** is the lead and prospect fields, delivered by link or filled with the prospect, with save and resume. The **SQR** is everything that applies to the filing.
- **SA-1B-83** Each tier pre-fills the next, and no question is asked twice across the three.
- **SA-1B-84** Immigration questions are pack content; sales questions — lead source, budget, how warm the lead is — are not (AG-2).

### 9. Assessment output

- **SA-1B-85** An assessment shows a **verdict per programme** — qualifies, close, does not — with the gate or rule that decided it in plain words.
- **SA-1B-86** An assessment shows the **gap**: what would change the answer.
- **SA-1B-87** *(changed v1.3 — rule 7, SA1B-D29)* An assessment shown to a client carries the disclaimer paragraph of the firm's Assessment summary template, if the firm keeps one (an editable starter, SA-05 Appendix A.13). The pack supplies no wording and cites no regulator.
- **SA-1B-88** An assessment shows a **"rules as at" date** and stores the pack version and the answers used, so any result can be reproduced later.
- **SA-1B-89** An assessment does not compare a score against published draw cut-offs, and the pack holds no draw data.

### 10. Startable, completeness and publishing checks

- **SA-1B-90** *(changed v1.3 — D1, SA1B-D34)* A category or sub-category is offered when a case is opened **only** when its row is published and passes its checks: sections exist for every person (role) it uses, every condition and reference resolves, and **every form on the row has a current edition**. The box-map requirement returns with autofill (SA1B-D28).
- **SA-1B-91** The console lists what is **startable**, and for each unready row what it is still missing.
- **SA-1B-92** *(changed v1.3 — D1)* The pack's completeness view reports, per country: programmes startable, programmes scorable, and strings present in each language. *"Form boxes filled automatically" returns with autofill (SA1B-D28).*

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-35** *(superseded v1.0 — SA1B-D24)* Validation warning when a programme has rules but no checklist — replaced by the startable check (SA-1B-90, SA-1B-91).

### 11. Firm extensions

- **SA-1B-93** *(changed v1.3 — Q18; changed v1.4 — R9-1; withdrawn — W-17)* *(revised same day — W-17)* Firms add no questions and hide or reorder none; they see only the final questionnaire (SA1B-D25). The three collapsed sections of R9-1 no longer exist.
- **SA-1B-94** *(changed v1.3 — Q18, rule 7)* A firm can never change, add, hide or reorder a pack question *(revised same day — W-17)*. Questions stay fixed for a **technical** reason (they feed scoring or government forms), not a legal one. This is the questionnaire rule; hiding document-checklist items and to-do steps is the separate rule of SA-1-34 and SA-1-38.
- **SA-1B-95** A firm owns its deficiency reasons and its fee-quote wording. *(changed 18 Oct — AG07-D7: the case deficiency library is ExpatReady pack content, SA-1-74; document-return reasons stay the firm's own short list with defaults, AG07-D20(p).)*

**Added in v1.3**

- **SA-1B-96** *(new v1.3 — decisions 7 and 16, O32)* A government step item may carry a **"has a deadline" mark** (biometrics, additional documents, passport request, medical …) and, for such a step, a **usual timeline** — how long the authority normally gives. The usual timeline **pre-fills** the due date staff record; the due date is **required** when staff record a deadline step and editable for extensions (the countdown recalculates). *(changed 18 Oct — AG07-D11)* The pre-filled date is confirmed when staff save the step. *(changed 18 Oct — AG07-D20(w))* The usual timeline counts **calendar days**, and the immigration expert confirms each value. The usual timeline carries source, date checked and next-review date (SA-1B-39). The countdown points and the reminder wording are not pack content.
- **SA-1B-97** *(new v1.3 — O32, Q17)* A line may be a **standard step** (action line): a to-do ExpatReady puts automatically on every case of that row (for example "Advertise the job for 4 weeks", "Submit within 60 days of the invitation") — what, who it is for, only-if, order. They are called "ExpatReady's standard steps"; a firm may hide a standard step that carries no deadline (SA-1-38, SA1-D11); a step that carries a deadline can never be hidden *(revised same day — W-15)* (closes SA1B-Q2).
- **SA-1B-98** *(new v1.3 — Q24, O32)* Every representative type in the regulator setup (RCIC, Lawyer / notary, Paralegal …) counts as a licence for the two kept licence checks (AG-5 "No active licensed consultant", AG-7 lead-representative picker). Each licensing body — a provincial law society, the Chambre des notaires du Québec, a paralegal-licensing body — may carry its own licence-number format; where none is held, the number is recorded without a format check. Labels say "licence number".
- **SA-1B-99** *(new v1.3 — Q18, R26; changed v1.4 — R9-1; withdrawn — W-17)* *(revised same day — W-17)* There is no "who answers" switch; staff fill answers on the client's behalf on the case. SA1B-Q3 is moot.
- **SA-1B-100** *(new v1.3 — O30, rule 7, decisions 6 and 11, Q19)* The pack carries **no message wording and no firm-data rules**: no separate "automation templates" (the pack supplies deadline data — the "has a deadline" mark, the usual timeline, document validity — that the Minder and the Government deadline countdown read), no retainer required-clause set, no e-sign recitals, and no retention horizon, number or class.

**Moved from SA-1** — numbers unchanged (rule 3).

- **SA-1-34** *(changed v2.1 — SA1-D9; changed v1.3 — rule 7, Q17; changed v1.4 — SR-Q9)* Firms may **hide** any of "ExpatReady's standard checklist" items **that carry no deadline** firm-wide in their own copy *(revised same day — W-15)*: recorded (who, when), reversible, never deleted; Owner and Admin by default, grantable through a custom role (`agent/case:configure-pack`, SR-Q9); applies to newly opened cases only (an open case keeps the item and staff may mark it "not applicable"). Anything with a deadline (of any kind) can never be hidden. Firm-wide extra checklist items are withdrawn *(revised same day — W-17)*: a firm adds a document to one case with "Request a document" (per case). They cannot change the pack's items. Questions that feed scoring or government forms stay fixed, for a technical reason. See SA-01 SA1-D11, SA-1-66, SA-1-67.
- **SA-1-38** *(changed v2.1 — SA1-D9; changed v1.3 — decisions 15 and 16, Q17; changed v1.4 — SR-Q9)* Firms may **hide** ExpatReady's standard steps (SA-1B-97) that carry no deadline, in their own copy, under the same rules as SA-1-34 *(revised same day — W-15)*, and may **rename the plain client name** of government steps and delivery steps (SA-1B-45, SA-1B-46) — same key, `agent/case:configure-pack`; under Advanced, with "Reset to ExpatReady's name"; anything with a deadline and every government step can never be hidden (the firm may switch off a government step's countdown message; staff may mark any step "not applicable" on one case). "Pipeline" and "template" are superseded by delivery and government steps. **Standard steps are not reordered** *(revised same day — W-16)*: the order from the pack is a guide, not a lock — staff may work in any order; a firm's own order lives in its to-do list templates (closes SA1B-Q5).

### 12. Reference Note — verified code state

Verified **2026-09-22 against GitHub `dev`** (DOCS-6): backend `ERv2-sanitized` `origin/dev` @ `5a346817` and frontend `ERv2-frontend` `origin/dev` @ `85e8840`. Both repositories were pulled on 2026-09-23 and `dev` has since advanced to backend `14613298` and frontend `6fc2cf2`; those commits are firm data export, sign-up UI and CI work and change none of the findings below. One correction found on that re-read is recorded under the form engine. Paths are on `origin/dev` of the named repository. SA-1 §12 covers the container; this section covers the content and the resolver.

**Summary.** The authoring surfaces for most content areas exist and are usable. What does not exist is the part this module is mostly about: assembling a row for a full combination, per-person selection, filings and routes, and any resolver a client's questionnaire, checklist or forms could come out of.

**Built and usable**

- Draft authoring across the 17 content areas, with per-domain bodies and operator-configurable key and text ceilings — `packages/contracts/src/schemas/pack-domain-bodies.ts` (now a parametrised factory, backend commit `5b762c71`; no domain shape changed).
- Section selection per programme node, resolved by exact key with effective dating and cursor paging — `apps/api/src/spine/section-resolution.service.ts:117, 144`.
- Documents: attach modes, alternative groups where any one satisfies, and an expiry flag with warning days — `packages/contracts/src/schemas/pack-domain-bodies.ts:243, 252`.
- **A deterministic form-filling engine exists on the backend** — more than v2.1 recorded. `apps/api/src/spine/pack-filler-bridge.service.ts` resolves the **pinned** form edition, field map and answer snapshot (revealing only map-bound restricted fields) and renders both the canonical mapping and the PDF bytes with provenance; `filler.service.ts` is a pure, side-effect-free renderer driven by the edition's parsed field inventory, where an unanswered or unmapped slot renders explicit `null`; `pdf-form.adapter.ts` fills AcroForm PDFs byte-identically (metadata pinned, fields written in sorted order); `pack-field-transform.ts:69-74, 200-216` supports date formats (ISO, Y-M-D, D/M/Y, M/D/Y), decimal, enum and concatenation; `pack-form-generation.service.ts` persists PENDING → RENDERED with output and envelope hashes and idempotent replay. Live-DB proofs in `apps/api/src/spine/__tests__/pack-form-generation.e2e.test.ts`. This satisfies much of SA-1B-27 – SA-1B-30 already.
- **Field-map import and export are real on the backend** — `apps/api/src/pack-authoring/pack-field-map-import.service.ts`, routed at `apps/api/src/pack-authoring/pack-transfer.controller.ts:164` (import) and `:194` (export); the frontend has an export panel (`docs/api-routes.md:59`).
- Reference dataset versions declare their own columns, key columns and units, validated at publish — `apps/api/prisma/models/country-pack-rules.prisma:362`, `packages/contracts/src/schemas/pack-domain-bodies.reference-dataset.ts:39-42`, `apps/api/src/pack-authoring/internal/pack-graph-validation.arms.ts:384-407`.
- Stage-pipeline authoring screen at `/admin/spine/stage-pipelines` — frontend `src/features/admin/spine-authoring/stage-pipelines-page.tsx` (commit `0875fcf`, 16 Sep).
- Published pack content is readable with no draft selected — frontend commit `6db17b3`.
- One regulator lineage per country enforced at publish — `apps/api/src/pack-authoring/internal/pack-graph-validation.checks.ts:429-437`; representative types are **open authored data** — `packages/contracts/src/schemas/regulator.ts:24-33`.
- Content neutrality enforced in CI: immigration tokens (IRCC, CRS, LMIA, PNP, RCIC, CICC) are banned in code and no immigration content is seeded — `apps/api/tools/check-content-neutrality.ts:61`, `.github/workflows/ci.yml:1533-1537`. The only Canada artefact is a synthetic `TEST_ONLY` fixture (`apps/api/src/pack-authoring/__fixtures__/canada-dev-pack.fixture.ts`).

**⚠ On `dev` today and in conflict with this version — stop or correct**

- **A line can be attached above a full combination.** Publish checks only that the programme key is registered, with no leaf or node-kind test — `apps/api/src/spine/master-publish-validator.ts:164-173`. Nothing then reaches a case beneath it, because resolution is an exact match. → Rows are full combinations and attachment above one is blocked (SA-1B-55, SA-1B-56).
- **No per-role selection exists anywhere.** The section-selection body has no role — `packages/contracts/src/schemas/pack-domain-bodies.ts:216-221` — and neither has the table (`apps/api/prisma/models/country-pack-questionnaire.prisma:283-312`). A question's `subjectKind` is an open free-text field with no vocabulary (`pack-domain-bodies.ts:87, 190`). Documents carry a single `applicantRole` and the multi-role field is unused (`:243, 252`). → Roles are pack content and every line says who it is for (SA-1B-57, SA-1B-72, SA-1B-73).
- **The built PDF filler cannot open IRCC's dynamic forms.** `apps/api/src/spine/pdf-form.adapter.ts:18-21, 209-214` fills **AcroForm** templates only and maps any XFA-carrying template to `UNSUPPORTED_TEMPLATE`, with a test asserting exactly that (`__tests__/pdf-form.adapter.test.ts:240`). IRCC's 2D-barcode forms are XFA (Adobe LiveCycle), which is why they only work in Adobe Reader. → This is now the sharp edge of placeholder **P1** (§13): the engine is built, but it cannot fill the forms the Canada pack needs until the delivery route is settled. *(changed 18 Oct — AG07-D17: settled — the answer sheet is the launch route; direct XFA filling only after a form passes the trial, SA-1-75.)*
- **Reference data still has five fixed row shapes, closed at runtime** — `packages/contracts/src/schemas/reference-dataset.ts:91-141` and `:166-174` (an unregistered type throws). → *(Changed v1.3 — SA1B-D36, spec follows code)* the types stay fixed in code and the columns are editable per version (SA-1B-41 – SA-1B-44). The 12 Oct check counts six registered types, one of them a synthetic test fixture.
- **Canonical field types are `STRING, NUMBER, BOOLEAN, DATE, ENUM, COMPOSITE`** — `packages/contracts/src/schemas/validation-constraints.ts:16-23`, mirrored in `apps/api/prisma/models/country-pack-core.prisma:15-22`. There is no upload type (as this version requires) and no placement or purpose concept. → Field groups build on `COMPOSITE`; placements and purposes are new (SA-1B-6 – SA-1B-12).
- **The Individual / Corporate switch is a mock** holding local UI state and filtering nothing — frontend `src/features/admin/spine-authoring/components/program-type-switcher.tsx:6-11`. → Client type comes from the Pathway (SA-1B-50, SA-1B-51).

**Code check of 12 Oct** (backend `db646bf7`, frontend `8511b27e`; `COMPLEXITY-REGISTER_2026-10-12.md`)

- **Startable check (SA-1B-90, D1) — not built.** No "startable" concept exists; field-map checks only validate transform types on existing maps (`apps/api/src/pack-authoring/internal/pack-graph-validation.transform-checks.ts`; `pack-graph-validation.arms.ts:493`).
- **Review dates and the "next review" column / weekly email (SA-1B-39, SA-1B-40) — not built.** No review-due or overdue fields exist in the backend or frontend. **Sections used by nothing (SA-1B-17) — not built, now parked.**
- **Reference tables (SA-1B-41 – SA-1B-44) — partial.** Each dataset version carries its own columns and units (`apps/api/prisma/models/country-pack-rules.prisma:362-364`), and the console column editor is real (`spine-authoring/reference-datasets/reference-dataset-column-editor.tsx`; `reference-datasets-page.tsx:69-71`); the row type must resolve to one of six registered types, each with a strict row schema, and adding a type is a code deploy (`packages/contracts/src/schemas/reference-dataset.ts:79-165`, `:160-164`). This is what SA1B-D36 now specifies.
- **Who-answers switch (SA-1B-99) and the questionnaire layer (Q18) — not built, now withdrawn (W-17).** No answerer field exists on `SectionQuestion` or `CanonicalField` (`country-pack-questionnaire.prisma:6-25,260-280`).
- Government-step client names, the "has a deadline" mark, the usual timeline, the standard-step kind and law-society formats were **not checked** in the 12 Oct pass; treat them as not built.

**Gaps against this version**

- **No filing or route concept** anywhere: one questionnaire per case, no levels, nothing that opens the next filing (SA-1B-64 – SA-1B-69).
- **No checklist resolver** — explicitly out of the current wave: `apps/api/prisma/models/country-pack-documents.prisma:9-10` (SA-1B-52, SA-1B-90).
- **No forms or field-map editor on the frontend.** The Forms tab is a UI-only stub, which is what blocks field-map import — `docs/api-routes.md:402-403` and `:60`. Nothing makes a row point at a form with its current edition (SA-1B-26), and no box carries a filled / needs-review / unmapped status for an author to work from (SA-1B-29). The rendering engine behind it, though, is built (above).
- **No repeats and no coverage rules** on sections; no "asked once" lists and no derived purposes (SA-1B-10, SA-1B-11, SA-1B-15).
- **No preview** of a client's resolved questionnaire, checklist or forms (SA-1B-62).
- **No prospect tiers.** The prospect side is a list of canonical-field keys on a section selection (`pack-domain-bodies.ts:216-221`): no blocks, no unfolding by intent, no lead tier and no cap (SA-1B-77 – SA-1B-84).
- **No source, date-checked or next-review fields** on content, and no overdue queue (SA-1B-39, SA-1B-40).
- **No startable check** when a case is opened (SA-1B-90).
- **No substitute sets in the library** — alternatives exist only as per-requirement groups (SA-1B-19, SA-1B-20); **no validity rules** beyond the expiry flag (SA-1B-21 – SA-1B-24); the submission gate is no longer specified (R9-4).
- **No assessment output**: rule sets and scoring configs can be authored, but nothing shows a verdict, a reason or a gap, and nothing stores a reproducible result (SA-1B-85 – SA-1B-89).
- Restricted-field encryption is still inert for answers, though the codec exists and is used for audit-IP sealing — `apps/api/prisma/models/country-pack-questionnaire.prisma:3-5`, `apps/api/src/crypto/field-codec/`, `apps/api/src/crypto/audit-ip-seal.ts:121`.
- **No immigration content** (by design, and enforced in CI as above).

### 13. Open Questions

**Decisions:** the twenty-seven decisions of the session of 22 Sep 2026 (§0) and the 10–12 Oct template-review decisions (SA1B-D29 – SA1B-D38) stand. **Not decided — raised 12 Oct, each with a recommendation:**

| ID | Question | Recommendation (not decided) |
|---|---|---|
| **SA1B-Q1** | **Disclaimer on the lead-form indicative result (SA-1B-80).** The lead form has no Assessment summary template to carry a disclaimer, and the pack no longer supplies one. | Let the firm's lead form show an optional, editable paragraph set in the firm's settings (AG-2 / AG-3 decide); the pack supplies nothing. |
| **SA1B-Q2** *(**closed** — W-15)* | **Can a standard step (action line) that carries a deadline be hidden?** Q17(2) names only "government steps (with deadlines)". | **Closed *(revised same day — W-15)*:** no — anything with a deadline (of any kind) and all government steps can never be hidden; standard checklist items and steps without a deadline can; staff mark "not applicable" per case. |
| **SA1B-Q3** *(**moot** — W-17: the switch is withdrawn)* | **Does the who-answers switch reach the lead form and the PQR** (client-facing, before a case exists)? A staff-answered lead question could stop the indicative result. | Limit the switch to questions asked on the case (the SQR); not the lead form or PQR. |
| **SA1B-Q4** *(**moot** — W-17: firms no longer hide or reorder questions)* | **Which questions stay fixed.** Q18 fixes every question not marked optional; but an "optional" question may still be read by a rule, condition or document "only if" line (SA-1B-14, SA-1B-36). | Block publishing a row where a question marked optional is read by a rule, condition or line — the same check SA-1B-9 makes for placements — so a firm's hide never breaks a rule. |
| **SA1B-Q5** *(**closed** — W-16)* | **May firms reorder standard steps?** SA-1-38 used to allow reordering a pipeline; the 10–12 Oct decisions name only hiding and renaming. | **Closed *(revised same day — W-16)*:** no — order comes from the pack and is a guide, not a lock; staff may work in any order; a firm's own order lives in its to-do list templates. |
| **SA1B-Q6** | **Unmapped-value warning (SA-1B-5)** while autofill is parked: D1 returns the box-map warnings "with autofill" but does not mention SA-1B-5. | Defer it with autofill, like SA-1B-63. |
| **SA1B-Q7** | **Do Canada's reference tables fit the six types fixed in code?** A table outside them is a code deploy (SA1B-D36). | List Canada's tables in the Canada content session (slice SA-01.15) and compare before build. |
| **SA1B-Q8** | **"ExpatReady updated '…', which you've hidden. Review?"** — decided in rule 7; shipping in Release 1 is deferred to the AG review. | See SA-01 §13 SA1-Q1. |
| **SA1B-Q9** *(raised 12 Oct, session 2 — **closed** W-3(16))* | Rule 9 requires a default and a placement for every kept setting; the decisions do not state (a) the default of the **field sensitivity flags** (SA-1B-1), or (b) the placement of the **document warning lead times** (SA-1B-23) and of the **pre-filled review dates** (SA-1B-39). Section repeat / coverage rules are shown "off unless added" because SA-1B-15 says a section *may* repeat. | **Closed *(revised same day — W-3(16))*:** (a) field flags default to tier = case, privacy = private, others off; (b) expiry lead times sit under Advanced and review dates on Main, pre-filled; section repeat stays off unless added. |
| **SA1B-Q10** *(new v1.5 — AG07-D7; **closed** 18 Oct — AG07-D20(p))* | **Do reasons for sending a document back stay firm-owned?** SA1B-D23 said "deficiency reasons are firm-owned; no deficiency library". AG07-D7 makes the case deficiency library pack content but does not say whether the wording used when a document is sent back (AG-9) is still the firm's own. | **No default; open.** Owner: the product owner with AG-09. Until decided, SA-1B-25 and SA-1B-95 keep the document-return wording firm-owned. **Closed 18 Oct — AG07-D20(p):** the firm keeps its own short list of document-return reasons, with ExpatReady defaults supplied. The wording is specified in AG-09. |
| **SA1B-Q11** *(new v1.5 — AG07-D15 / AG7-D15; **closed** 18 Oct — AG07-D20(i))* | AG7-D15 says the case's optional target date is pre-filled "from the pack", but this module holds no default-days-per-programme field, so there is nothing to pre-fill from. | **No default; open.** Owner: the product owner and the immigration expert. Either add one optional field (default target days) to a programme row, or drop the pre-fill. The early-warning point is fixed at 20 % of the window and is not a pack value (AG07-D16 Q23). **Closed 18 Oct — AG07-D20(i):** one optional field "usual processing time (days)" is added per program (SA-1B-101), filled by the immigration expert; empty means no pre-fill. The early-warning point stays fixed at 20 % counted from case creation to the target date. **Field withdrawn 18 Oct — AG07-D26(5):** the target filing date is not pre-filled and the pack holds no processing time. |
| **SA1B-Q13** *(new 18 Oct — AG07-D26(8))* | Which fields does an entry of "Country-specific requirements" (SA-1B-103) hold, and does the recency rule (SA-1B-105) sit on the program or on each document line of a row? AG07-D26 gives the example only. | **No default; open.** Owner: immigration expert with the backend lead. |
| **SA1B-Q12** *(new v1.5 — AG07-D8(d))* | How are the launch field maps authored and published? The forms and field-map editor stays parked (SA1B-D28), and AG07-D8(d) says later maps arrive as pack content with no code release. | **No default; open.** Owner: backend lead with the immigration expert. Options: the pack import (SA-1 §3.13) or un-parking the field-map editor. *(18 Oct — AG07-D17: how a mapped form reaches staff is now decided — the answer sheet, P1. Authoring of the maps is not covered by the map, so this question stays open.)* |

SA1B-Q9 was closed by W-3(16), SA1B-Q2 by W-15 and SA1B-Q5 by W-16 (SA1B-Q3 and SA1B-Q4 are moot after W-17); no other open question above was answered by the session-2 decisions.

**Three placeholders for the developers** — agreed as needed, not yet decided. Each must be settled before the area is built, and none blocks the content work:

| ID | Question | Decide before | Note |
|---|---|---|---|
| **P1** *(answered 18 Oct — AG07-D17)* | **How a mapped form reaches the staff, given the built filler cannot open IRCC's forms.** The engine fills **AcroForm** PDFs and refuses XFA templates (§12), and IRCC's 2D-barcode forms are XFA. The routes are: write the XFA data packet with a library that supports it · hand the staff a data file to import into the blank form in Adobe Reader · lay the answers out in the government portal's own order for portal-filed categories · or use the built AcroForm path only for whichever forms are not XFA. | Autofill resumes (after the content pack SQR is final) — parked with SA1B-D28 | The box map is identical in every route, so the mapping content work is not blocked (SA-1B-27, SA-1B-31, SA-1B-32). This is now a build-shaping decision, not a packaging one. **Answered 18 Oct — AG07-D17:** at launch a mapped form reaches staff as an answer sheet (copy button per value); direct XFA filling per form only after it passes the trial (SA-01 SA-1-75). |
| **P2** *(decided 18 Oct — AG07-D8(d): the design-partner firm's most-filed forms of its last 12 months, confirmed by the immigration expert; the list itself is SA1-Q17)* | **Which forms are mapped for Release 1.** | The Canada content session (slice SA-01.15) | SA-1B-26 – SA-1B-32 are Should now for a named short list. |
| **P3** | **How a family case with several filings counts against plan limits** — a family is one case with its own filings (SA1B-D9), while SA-3 v2.8 counts a family case as one Individual case. | The SA-3 revisit | A pricing question, not a pack question (§0.2 SA1B-X9). |

**Parked by the product owners:** the Canada Release 1 pack content — which programmes, reference tables, forms, documents and rules, and who authors them — is planned in a separate working session (slice SA-01.15). The content-neutrality gate in CI means that content must arrive as data, never in code.

**Routed to the Immigration SME, product owners final:** every content value when the Canada pack is authored — the programme tree and its fees, gate thresholds, scoring tables, form editions and box maps, document types with their substitute sets and validity periods, the reference tables, person roles, routes per category, and the government steps of each row (the SME covers the data — including each step's usual timeline and the law-society licence formats; the client names of government steps are written by ExpatReady with no expert sign-off, and no wording is expert-checked — rule 7).

> **Superseded sources for the content areas (rule 8, DOCS-7):** §3.3 – §3.11 of `SA-01-country-and-immigration-pack-management` v2.1 and earlier; the SA-1 content sections of "Doc-2" and of the August 2026 audits; the combined `FINAL-SuperAdmin-FR.md`; and the product owners' own working drafts used as input to this review — the "Content Pack — master admin console" HTML (16 Sep), the configuration spreadsheet (18 Sep) and the "Screen Expat ready – Agent v2.3" prototype — which are reference material, not requirements.

### 14. Settings — defaults and placement *(new v1.4 — Rule 9 pass, SA1B-D40)*

Every kept setting has a default. **Main** = on the normal path; **Advanced** = collapsed section; **code constant** = not a setting. Country, pack type, publish timing, required pack languages and per-area effective dates are in SA-01 §3.15.

| Setting | Default | Placement |
|---|---|---|
| New question placement (SA-1B-7) | Required | Main |
| Document type handling, certified translation, "expires" (SA-1B-18) | Standard · no certified translation · "expires" off | Main |
| Document warning lead times (SA-1B-23) | 90 and 30 days; expiry warns only | Advanced *(revised same day — W-3(16))* |
| Review dates (SA-1B-39) | Date checked = today; next review = +12 months; editable | Main, pre-filled *(revised same day — W-3(16))* |
| Section repeat and coverage rules (SA-1B-15) | Off unless added | Advanced |
| Field sensitivity flags (SA-1B-1) | Tier = case, privacy = private, other flags off *(revised same day — W-3(16))* | Advanced |
| Licence-number format (SA-1-8) | None held unless the pack supplies one (SA-1B-98) | Advanced |
| Firm: rename a step's client name (SA-1-38) | ExpatReady's name; "Reset to ExpatReady's name" | Advanced |
| Firm: hide a standard item without a deadline (SA-1-34, SA-1-38) *(revised same day — W-15)* | Nothing hidden; inline "Hide from new cases" on each item | Inline on the item; hidden-items list under Advanced |
| Firm questionnaire area (SA-1B-93): add questions · hide / reorder optional · who answers | **Withdrawn** *(revised same day — W-17)* | — |
| Who answers (SA-1B-99) | **Withdrawn** *(revised same day — W-17)* | — |
| Usual processing time per program (SA-1B-101) *(new 18 Oct — AG07-D20(i); **withdrawn 18 Oct — AG07-D26(5)**)* | **Withdrawn** | — |
| Lead-form field cap (SA-1B-80) | Fixed | Code constant |
| Weekly pack-review email (SA-1B-40) | Fixed | Code constant |

Screens that fail the 15-minute test (Rule 9): none flagged by the decisions.


*Sources used for SA1B-D16 (form filling):* IRCC — [filling and validating forms with 2D barcodes](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1523&top=4), [why the Validate button shows no barcodes](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=767&top=18); *for SA1B-D8 and SA1B-D9 (filings and family cases):* IRCC — [Guide 5269, applying for a study permit outside Canada](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5269-applying-study-permit-outside-canada.html) ("Family members must complete their own application forms … you may submit your applications together … and use one payment receipt"), [which work permit fees apply](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1306&top=17).
