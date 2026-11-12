# A24: how a case is structured: retainer, principal, client, mixed applications, case numbers (Fable planner, 12 Nov 2026)

**Who and why.** The founder's ask A24 (12 Nov ~12:2x IST, spoken, after a demo to the co-founder), recorded in `product/STATE.md` "Founder asks". The founder's words, in short: follow the co-founder's points only on their merit, and find the best solution for real immigration practice. This page is a planner's design (P-455 (5)): read-only on the app, live AI off, US$0. It changes no rule, state or backlog file; the Lead decides what becomes a row.

**Mockup:** [`case-structure-a24-mockup.html`](case-structure-a24-mockup.html) (static, Sample data, no real names).

**In one paragraph.** The co-founder is right on four of five points, and the fifth (combination per case or per application) shows a real gap. The team's own requirements (AG-07 v3.12, AG-05 v2.1, snapshot 2 Nov) already define almost all of this, and this design follows them (§2b): **one signed retainer → one case → one or more filings, each filing on its own combination, all under the case's one pathway**, with server-made case and client numbers. The app already keeps exactly one principal applicant per case (in code only, not in the database). It already gives each family member their own application with their own fee, which is what IRCC asks for temporary residence. But a case is still tied to **one** combination, so a family whose members make *different kinds* of temporary applications works only where that combination was configured to add them (the Study permit family, BK-15/BK-17). Permanent residence is one application for the whole family and normally comes with its own retainer, so it lands in its own case. Case numbers are not generated today: the officer types a "reference". The recommended order: case numbers in the team's format plus a database guard for the principal in the Bake **if the founder agrees** (about 7 hours), and the rest in M4, starting with "a combination per application" (about 45-60 hours). Retainers, leads and client records are the team's modules (AG-02, AG-05), outside this reference app; the app only keeps its case ready to link to them.

**Added after the founder's follow-up (12 Nov, ~13:xx IST):** *"the definition of case was retainer signed … from lead to retainer signing and then case management … each retainer will have each case, and each case may have different pathway combinations if they pertain to the same higher-level pathway … don't follow me blindly."* Verdict 0 (§4) and the chain in §5.0 answer it: **agree, with two refinements** (a case may open before the retainer is signed, with a warning; a firm-service case needs none).

**Added after the Lead relayed dimensions A-L and the "no over-engineering" guard (12 Nov ~12:4x-12:5x IST).** The top of this page now answers in that order: the overall verdict, the value/cost table, the demo slice, then A-L. Sections 1-9 below hold the evidence.

## Overall verdict

**No fundamental mistake. The model is a good base and can be a better version with three small changes.** "Case" is the right container: it is the team's own (AG-07: one client, one destination country, holding several filings), the Code's unit of work (a service agreement per client, records per client), and what firms use. Per-person filings, per-person fees and per-person forms (BK-15, BK-16, BK-17) are already the IRCC-correct core, and they stay.

What is **wrong today is a word, not the structure**. The case's `principal` is really the case's *client person* (the anchor every relation points to). IRCC's *principal applicant* is per application: on a family member's open work permit, IRCC calls the worker or student whose permit it depends on "the principal applicant" (S12). In a Study permit family the two are the same person, so nothing breaks. They differ only when a minor is the student or two adults each have their own grounds. The fix is screen words (the client on the case, the principal applicant per application), not a new structure.

The one real structural limit is **one combination per case** (verdict 4). It is designed below and **built only when a real household needs it**: a mix the configured "added filings" cannot express, confirmed by the immigration expert.

## Value and cost (smallest correct model first)

| Change | Value now | Cost | Verdict |
|---|---|---|---|
| **Case number** `C-2026-00042` (AG-7-3), in the list, heading and search; the firm's reference becomes optional | The co-founder's first question; staff and clients quote it; the team already specified it | 5.5 h, 2 PRs, one additive migration (schema baton) | **Build now** (demo slice) |
| **Words**: "Client: …" on the case; "Principal applicant" per filing; the list shows the client's name and a filing count | Ends the principal confusion (A); the household reads at a glance | 3 h, web plus one list field | **Build now** (demo slice) |
| **One client person per case in the database** (deferred constraint, so Make principal still works) | Correctness: no import or script can store two | 1 h, in the same migration as the case number | **Build now** (with the case number) |
| IRCC decision per filing (approved or refused, its date) and a derived case status | One approved and one refused needs both shown (F) | ~4 h | **Design now**, build with the first post-submission row (M4) |
| A combination per application (verdict 4, G) | Any household mix configured by screens alone; no copied configuration | 45-60 h | **Design now**, build when a real household needs a mix that added filings cannot express |
| Case list at scale: filters, saved views, deadlines (J) | Needed at 1,000+ cases (P-460); the demo has a few | 6 h | **Design now**, build in M4 with UX-13 |
| Linked cases (a later permanent residence case linked to the temporary one, E) | Follow-on work, reuse of facts | 6 h (earlier-facts reuse exists, C6.19) | **Design now**, M4 |
| Retainer, payer ("Bill to"), professional fees, conflict disclosure (B, D, H) | Compliance, but in the team's own modules (AG-05, AG-06) | 0 h here | **Not needed in this app**; keep a "Retainer: not signed" line only if the founder wants it |

**Fastest demo slice (L): about 9.5 hours, 3 small PRs.** PR 1 (schema + API, 4.5 h): case number and its counter, the backfill, the one-client-person constraint, `reference` optional. PR 2 (screens, 3 h): number in the list, heading, search and Open a case; a Client column and filing count in the list. PR 3 (screens, 2 h): "Client: …" in the case header; the existing People and filings table names each filing's principal applicant. **It proves:** case numbers, one household in one case, one application per person with its own principal and fee, and nothing broken. **It does not prove:** an arbitrary mix of combinations (it shows the Study permit family as configured), outcomes per application, linked cases or lists at scale.

## A-L checklist (one verdict each; evidence in §2, §2b, §4)

| | Dimension | Verdict | Reason (value · cost · hours) |
|---|---|---|---|
| A | Is "case" the right container? Principal per application? | **Yes; fix words now** (in the slice) | Container: AG-07, Code s. 24 and s. 32(d). IRCC's principal applicant is per application (S12); the app already stores each filing's owner (`Filing.subjectId`, "the filing's principal applicant", `schema.prisma:1871`). Only the case-level label conflates them · 3 h (slice) |
| B | Roles per person | **Mostly exists; nothing to build** | Retainer signers and payer: team AG-05 (AG05-D2) and AG-06 ("Bill to", AG-7-52). Client of the case: today's client person. Principal per application: `Filing.subjectId`. Accompanying or not: filing modes `on_principal` / `declared_only` and `applies`. Minor's signer: under 18 the principal answers (`person-roles.json:6`). IMM 5476 already reaches each person 18 or older (`samples/checkpoint-stage-one.json`, "signedBy": "person_and_representative"; S7) · 0 h |
| C | Privacy between adults | **Exists; keep** | "Keep private from the principal" per adult (C6.16, `schema.prisma:1553`), enforced for answers and documents (`api/src/case-documents.ts:280`). Meaningful consent (S15) and confidentiality (Code s. 28) are met by asking each adult on their own link · 0 h |
| D | Conflicts of interest (family, sponsor and applicant) | **Not needed in this app; design note** | Code s. 15: written disclosure and the client's written consent; it belongs in the retainer, whose content s. 24(3) lists, i.e. the team's AG-05. Unconfirmed: no counsel · 0 h |
| E | Lifecycle (extensions, PGWP, PR while temporary is open, newborn, spouse removed, age lock-in) | **Design now; build nothing now** | Stages and routes (C6.17) and earlier facts (C6.19) exist; spouse removed = Remove filing (C6.13); a newborn is added until the group is recorded (`refuseIfCaseRecorded`). Dual intent is lawful (S14), so a PR case can run beside a temporary case, linked. Age: temporary applications use the rules in place when IRCC gets the application; PR uses the lock-in date (S13). Ages are counted as of today until recorded (`filings.ts`, FQ-7), which is right for temporary residence; for PR the lock-in date becomes a key detail when PR is configured · linked cases 6 h, M4 |
| F | Status and outcomes per application | **Design now; build in M4** | Status, record, application number per filing and UCI per person exist (`schema.prisma:1876`, `:2280`, `:2331`); IRCC's decision per filing does not. Case status should be derived from its filings, never stored · ~4 h |
| G | What may share a case | **Design now (as data); build with A's structure** | Same client, same pathway (AG-7-1); temporary with temporary, inside or outside Canada: yes; with PR: a warning ("usually its own retainer and case"), never a block; sent together only with the same IRCC account (`portalKey`) at the same time and place (S3). All of it data (P-319, P-449) · 0 h now |
| H | Money | **Exists for government fees; the rest is the team's** | Government fees per application, with family caps per submission group (BK-15, `filings.ts`). Professional fees, retainer and trust money: AG-05 and AG-06 · 0 h |
| I | Shared documents | **Exists within a case** | `CaseDocument` is per person and document type (`schema.prisma`, `@@index([subjectId, documentType])`), so a marriage certificate is uploaded once and used by every filing that needs it. Across cases: later, with linked cases · 0 h |
| J | Staff work and lists at scale | **Design now; build in M4** | Officers and the lead representative per case (`CaseTeamMember`), matching the team (one case team). The list pages 50 at a time (`runtime.ts:940`) but has no filters, search or sort. Per-application officers: not needed · 6 h |
| K | No breakage | **Plan in §8** | Additive migration (nullable, backfill by opening date, then required); `reference` still accepted; the six and the checkpoint unchanged because no derivation changes; rollback = drop the new column, counter table and constraint · inside the slice |
| L | Fastest demo slice | **Build now** | Above: ~9.5 h, 3 PRs |

---

## 1. What the app does today (read on this branch, 12 Nov, main at `de7f14bc6`)

| Topic | What the app does | Where |
|---|---|---|
| A case has one combination | `Case.combinationId` is a single required link; the case pins one release of it at opening | `prototype/studio/prisma/schema.prisma:1266` (`model Case`), `api/src/runtime.ts:291` (create), PackWorkPin at `runtime.ts` create |
| Stages | A case may have several stages (a route: study, then work), but only one is current, and each stage is one combination | `schema.prisma:1424` (`model CaseStage`), `:1463` `@@unique([caseId, combinationId])`; `samples/routes.json` (Sample route `study_then_work`) |
| Exactly one principal | The principal is created when the case opens; "Add a person" never offers the principal role; Make principal swaps roles with the spouse | `runtime.ts:65` (`addableRoles` leaves out `principal`), `runtime.ts:291-296`, `api/src/filing-changes.ts:151`; `samples/person-roles.json:4` ("exactly one on every case") |
| No database guard for that | No unique index or constraint on `case_participant` for the principal; the swap updates people one by one, so a plain unique index would refuse a valid swap | migrations under `prisma/migrations/` (only `subject_id`, `(case_id, order)`, `(case_id, idempotency_key)` are unique); `filing-changes.ts:151` |
| One application per person | A filing is "one application to IRCC by one person"; its owner is the filing's applicant; people on a shared filing are `FilingApplicant` rows (applying or declared only) | `schema.prisma:1865` (`model Filing`), `:1871` `subjectId`, `:1903` (`FilingApplicant`), `:1898` one filing per person per stage |
| How each person files | Per role, from the release: files own application, on the principal's application, declared only, or co-files (the sponsor) | `engine/filing-modes.ts` (`APPLICANT_MODES`, `filingOf`), `samples/fee-table.json` (`vv.single`, `sp.outside`: every role `files_own`; `fs.spouse`: child `on_principal`, sponsor `co_files`) |
| A family member's *different* application | Reached inside the one combination: `fees_by_role` names the document each role applies for (Study permit: spouse "Work permit", child "Visitor visa"), and a line's `addsFiling` adds a filing when the person's own answers hold (a child who will study 6 months or more: their own study permit) | `engine/runtime/added-filings.ts:24`, `engine/runtime/filings.ts:251` (`deriveFilings`), `samples/conditional-filings.json`; BK-15 (#1591), BK-17, D8 (`design/d8-study-permit-family-2026-11-11.md`) |
| Per-person forms | A form line reaches people by role, now with "the principal always, plus each child for whom the line's condition holds" | BK-16 PR 1 (#1614), P-490 (Option B, "a form follows its filing", was judged too big for the Bake) |
| Submission | The family's filings go in one submission group (same time and place, fee caps); a filing may be split out with a reason | `schema.prisma:1834` (`SubmissionGroup`), `filings.ts` header (BR-16, BR-18) |
| Case "ID" | The officer **types** a reference when opening ("Your firm's reference, at least 3 characters"), unique per firm; it is the page heading and the list's first column. Nothing is generated | `schema.prisma:1270`, `:1317`; `web/src/runtime/cases.tsx:186` (field), `:132` (list), `:300` (heading); seeds `SAMPLE-VV-FAMILY-1`, `SAMPLE-SP-STUDENT-1` |
| Point of contact | One simulated client login per case answers the questionnaire for everyone travelling; "the client" stays the person who opened as principal even after Make principal; an adult may keep their answers private from the principal | `schema.prisma:1273` (`clientActorId`), `runtime.ts:186-190` (`clientSubjectOf`), `filing-changes.ts` (`clientPersonOf`), `:1553` (`keepPrivate`, C6.16) |
| Representative | One representative of record per **case** (plus case officers), with history; IMM 5476 is per application at IRCC | `schema.prisma:1326` (`CaseTeamMember`, `LEAD_REPRESENTATIVE`) |
| IRCC numbers | Each filing records its application number; each person their UCI | `schema.prisma:1876`, `:2280` (`FilingRecord`), `:2331` (`FilingPersonRecord`) |
| Case list | Table: Reference, Combination, Status, Opened (staff); the client's page adds People and switches to cards below 640 px | `cases.tsx:132`, `:250-257`; API `runtime.ts:949` returns people only for the client view |

**What is already right and stays:** one application per person for temporary residence; per-role filing modes (they also model permanent residence correctly: one application with the family on it); submission groups with fee caps; stages and routes; one representative of record with history; the keep-private setting; IRCC application numbers and UCIs on the record.

---

## 2. What official sources say (AGENTS rule 4, P-170)

Local copies are in `official-sources/ircc/` (manifest created 19 Oct 2026, hashes recorded); the law text was read live on 12 Nov 2026.

| # | Point | Quote | Source · date read |
|---|---|---|---|
| S1 | Temporary residence: each family member has their own application, sent together | "Family members must complete their own application forms. However, you may submit your applications together online or at a Visa Application Centre (VAC) and use one payment receipt for the total amount." | Guide 5269 (study permit, outside Canada), section "Do I have to apply separately for my family members?"; the same sentence in Guide 5487 (work permit) and Guide 5256 (visitor visa). Local copies `official-sources/ircc/instructions/guide-5269.html`, `guide-5487.html`, `guide-5256.html`, saved 19 Oct 2026; read 12 Nov 2026 |
| S2 | A child who will study gets their own permit, applied for with the parent's | "You must apply for their study permit at the same time as your own." | Guide 5269 and Guide 5487, "May my children attend school?"; same copies |
| S3 | The fee caps need the family to apply together | "Maximum fee for a family of 5 or more people applying at the same time and place $500" (visitor visa); biometrics "Maximum fee for a family of 2 or more people applying at the same time and place" | Guide 5256 and 5269 fee sections; same copies |
| S4 | The three temporary residence guides speak of "you" and "your family members" and never of co-applicants | The words "principal applicant" do not appear in Guides 5256, 5269 or 5487 (searched 12 Nov 2026). IRCC does use the term on its family open work permit pages, per application (S12) | Same copies |
| S5 | Permanent residence: one application for the family, made by the principal applicant | IMM 0008: "This form must be completed by: you, the principal applicant"; "you must declare and provide details for all your family members, including those: who are not applying for permanent residence with you (not accompanying you to Canada)" | `official-sources/ircc/canada/pages/imm0008.html` (canada.ca IMM 0008 instructions), saved 19 Oct 2026; read 12 Nov 2026 |
| S6 | Permanent residence: each adult family member completes their own family form on the one application | IMM 5406 "must be completed by: You, as the principal applicant, Your spouse or common-law partner (whether accompanying you to Canada or not), and Your dependent children aged 18 or over" | `canada/pages/imm5406.html` (page "Last updated: May 2026"); read 12 Nov 2026 |
| S7 | A representative is appointed per application; adult children sign their own | "you can appoint only one (1) representative at a time for each application you submit"; "If you have dependent children aged 18 years or older, they are required to complete their own copy of this form if a representative is also conducting business on their behalf." | IMM 5476 instructions, `official-sources/ircc/web-pages/page-imm5476.html`; form edition 01-11-2025; read 12 Nov 2026 |
| S8 | Who a consultant's client is | s. 1(1) "client means a person or entity that (a) has entered into a consultation agreement or service agreement with a licensee; (b) consults with a licensee who provides or agrees to provide immigration or citizenship consulting services to them; or (c) …" | Code of Professional Conduct for College of Immigration and Citizenship Consultants Licensees, SOR/2022-128, https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html, current to 2026-10-19; read 12 Nov 2026 |
| S9 | The service agreement names the client and lists the services | s. 24(1) "A licensee must enter into a written service agreement with a client" before any services; s. 24(3)(g) "an itemized list of the services to be provided, tailored to the needs of the client"; s. 24(3)(t) timely case-status information | Same, s. 24 |
| S10 | Conflicts between clients | s. 15(1): no services where this "would or could result in a conflict of interest" unless disclosed in writing with the client's written consent; s. 28(1) confidentiality of "all information in relation to a client" | Same, ss. 15, 28 |
| S11 | Records | s. 37 "a reliable system of office administration"; no rule on file numbers; s. 36(3) a file goes to a new representative on request | Same, ss. 36, 37 |
| S12 | IRCC does use "principal applicant" per application for temporary residence: the worker or student a family member's permit depends on | "You (the principal applicant) must meet 4 requirements:"; "If your spouse is applying separately from you, they'll need to provide" | canada.ca "Open work permits for family members of foreign workers: Who can apply", https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/special-instructions/spouses-dependent-children/eligibility.html, Date modified 2026-06-12; read 12 Nov 2026 |
| S13 | Dependent child's age | "under 22 years old" without a spouse or partner; "For most programs, your child's age lock-in date is the date we get your complete application for permanent residence"; for a visitor visa, study permit or work permit the dependant must meet the age limit "in place when we get" that application | canada.ca "Who you can include as a dependent child", https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/age-limit-requirements-dependent-children.html, Date modified 2026-10-09; read 12 Nov 2026 |
| S14 | Dual intent | IRPA s. 22(2): "An intention by a foreign national to become a permanent resident does not preclude them from becoming a temporary resident" if the officer is satisfied they will leave at the end of the stay | https://laws-lois.justice.gc.ca/eng/acts/i-2.5/section-22.html, current to 2026-10-19; read 12 Nov 2026 |
| S15 | Meaningful consent | "PIPEDA requires individuals to understand the nature, purpose and consequences of what they are consenting to"; for a child who cannot consent, consent "must instead be obtained from their parents or guardians" | Office of the Privacy Commissioner, "Guidelines for obtaining meaningful consent", https://www.priv.gc.ca/en/privacy-topics/collecting-personal-information/consent/gl_omc_201805/, modified 2025-08-11; read 12 Nov 2026 |

Also reused (not re-researched): `research_notes/Agent view and filing UX/ircc_filing_units.md` (29 Oct) tables 1-8 and its six exceptions (permanent residence is one filing for the family; declared-only people; sponsorship co-filed; filings that wait; employer filings are separate linked cases; a visa issued with a first permit is not a filing).

**Not settled by any official page (marked):**
* Whether every adult in the household must sign the firm's service agreement, or the main applicant may sign for the family. The Code defines each person who consults as a client (S8) but has no rule on joint clients. **Unconfirmed: no counsel; ask the immigration expert.**
* Which applications a firm "should" put in one case. IRCC has no case concept; this is firm practice. **Sample (product rule below), confirmed by the immigration expert.**
* Whether IRCC's portal for representatives groups a household's mixed temporary applications (visitor, study, work) into one online submission. The 29 Oct note quotes the APR guide for "the number of applicants who will be included in this online submission"; the portal itself is behind sign-in. **Unconfirmed: ask the immigration expert.**

---

## 2b. What the team's requirements already say (AGENTS rule 2: first source of truth)

Read in `sources/drive-snapshot-2026-11-02-1054/02-functional-requirements/` (the name-free copy is `domain/requirements-2026-11-02/`). Quoted without the examples' sample names.

| Team rule | Words | Where |
|---|---|---|
| Case | "A case is the firm's work for one client in one destination country. It holds one or more filings and the people on them." | AG-07 v3.12 glossary "Case" |
| Filing | "A filing is one application to one government authority. It has its own program, forms, fees, deadlines, rules version, people and decision." | AG-07 glossary "Filing" |
| Applicant role belongs to the filing | "The role belongs to the filing, so one person can be principal on one filing and spouse on another." Each family member is principal on their own filing; "Spouse or child is used when a family member is included in someone else's filing." | AG-07 glossary "Applicant" |
| Client | "the person or employer the firm works for"; becomes a client when the retainer is executed (one of the ways in, AG02-D2); client number `CL-<5-digit sequence>` per firm | AG-07 glossary "Client"; AG-7-69 rule 3 |
| One retainer per case | "When a case opens, ExpatReady links to it the most recent signed retainer of that client … that no other case uses … If there is no such retainer, nothing is linked and the case shows 'Retainer not signed'"; a second case for the same client needs another signed retainer; staff may **Change retainer** (audited) | AG-07 AG-7-1 rule 14 (MS-D24(1)); AG-05 MS-D24(1) pointer |
| Several signers | "Several client signers on one retainer in Release 1" (spouses, a sponsor and an applicant, a family) | AG-05 AG05-D2 |
| Case number | "`C-<year>-<5-digit sequence>`", per firm per calendar year, server-assigned, "never reused and is never edited. The prefix `C-` is fixed in Release 1" | AG-07 AG-7-3 (AG7-D18) |
| Case's pathway | client type `INDIVIDUAL` or `CORPORATE` "from the pathway" is written on the case at creation | AG-07 AG-7-1 data (AG-7-5) |
| Follow-on matters | "A linked case is a new case joined to an earlier one, for a follow-on matter" (worker permit, re-application, stream changed) | AG-07 glossary "Linked case" |
| Representative | The lead representative "is filled in from the signed retainer or the firm's default"; one per case | AG-07 glossary "Lead representative" |
| Firm-service case | A case for something that is not a government application; needs no signed agreement when its service says so | AG-07 glossary; AG-7-111 rule 6 |

**What this changes in this design:** the case number follows AG-7-3 (5 digits, fixed `C-`); the co-founder's "point of contact" is the team's **Client** of the case (not a new "main contact" term); the representative stays per case, from the retainer; "a combination per application" is the team's "filing has its own program, forms, fees … rules version". Nothing here conflicts with the founder's decisions in `DECISIONS.md`; no conflict needs the founder.

---

## 3. How practice-management tools and firms structure it (general patterns, no screens copied)

Patterns common to legal and immigration practice-management tools (described in general terms; nothing copied):
1. **Client → matter (file) → applications.** A person or household is the client; a **matter** (also "file" or "case") is one engagement under one service agreement; a matter holds one or more **applications** (each with its own government form set, fee, status, IRCC number and deadlines).
2. **One primary client per matter**, with related people (spouse, children, sponsor, employer contact) linked to it. The household's family details are entered once and reused on each application.
3. **Matter numbers are generated**: a firm prefix, the year and a running number (shapes like `2026-0042` or `ABC-26-042`), unique and never reused; firms may also keep their own old reference (for files moved from another system).
4. **New engagement, new matter.** A separate service agreement (a new scope or fee) opens a new matter: a permanent residence application after a work permit is normally a new matter, linked to the earlier one, reusing the client's facts.
5. **Staff views**: a dense, sortable table with saved filters ("my cases", "waiting on client", "due this week"); a case page with a summary, the next step and a list of applications, each opening its own page or panel.

Why firms draw the line at the engagement: the service agreement is the legal unit (S9: services itemised for *the client*), fees and trust money are kept per client and matter (Code s. 32(d) "separate records … for each client"), and a file is handed over as one unit (s. 36(3)).

---

## 4. Verdicts on the co-founder's five points

| # | Point | Verdict | Evidence | Risk if ignored |
|---|---|---|---|---|
| 0 | (Founder, follow-up) A case is defined by the signed retainer: lead → retainer → case; each retainer its own case; a case may hold different combinations of the same higher-level pathway | **Agree, with two refinements.** (a) The team already says it: a case links the client's signed retainer that no other case uses (AG-7-1 rule 14), so one signed retainer ↔ one case. But the case is defined by **its client, its destination country and its pathway**; the retainer is its *authority to work*, not its identity: a case may open before signature (it shows "Retainer not signed", warns, never blocks) and a firm-service case may need none. (b) Same pathway, yes (client type comes from the pathway, AG-7-1); within it, any mix of combinations the retainer covers. Adding an application for a new family member mid-case changes the agreed services, so it is a **retainer amendment** on the same case (AG-05 amendments; Code s. 24(3)(g) itemised services), not a new case | AG-07 AG-7-1 rule 14, glossary "Case", "Client"; AG-05 AG05-D2, MS-D24(1); Code s. 24 (S9) | Making the retainer the case's identity would block urgent work before signature and break firm-service cases; allowing two cases on one retainer would split fees and trust records the Code keeps per client (s. 32(d)) |
| 1 | Exactly one principal applicant per case | **Agree, and it is already so; add a database guard and fix the words.** The case's principal is its client's person (the principal on the case's lead filing). The team also gives each filing its own principal ("the role belongs to the filing"), so on a family's temporary applications each member is principal on their own filing and nobody is a co-applicant | App: `runtime.ts:65`, `person-roles.json:4`, `schema.prisma:1871` ("the filing's principal applicant"). Team: AG-07 glossary "Applicant". IRCC: "principal applicant" is IRCC's permanent residence word (S5, S6); its temporary residence guides say "you" and family members apply on their own (S1, S4) | Today only code enforces it; a future import or script could store two |
| 2 | One point of contact per case | **Agree, with a change**: it is the team's **Client** of the case (one client per case, AG-07; client code `CL-…`), default the principal; family members may also sign the retainer (AG05-D2) and adults keep their own privacy (C6.16). The **lead representative** stays one per case, from the retainer (AG-07); each adult applicant's own IMM 5476 copy is a document on their filing (S7) | Team: AG-07 "Case", "Client", "Lead representative"; AG-05 AG05-D2. Code ss. 1, 22, 24 (S8, S9); IMM 5476 (S7); app: `clientActorId`, `clientSubjectOf`, `keepPrivate` | One login answering for adults breaks their privacy and consent (C6.16 already guards); a missing adult's IMM 5476 copy is a filing defect |
| 3 | Mixed temporary applications in one case; permanent residence in its own case | **Agree, with a change.** The household's temporary applications **sent together** share one case (one submission, one payment receipt, fee caps S1, S3). Permanent residence opens its own case (one application for the family, S5; another portal; another service agreement). Change: a temporary application that **depends on** the permanent residence application (a sponsored spouse's open work permit after the acknowledgement of receipt, ircc_filing_units.md row 5b) belongs in the permanent residence case, as a later stage. A member who applies months later is a new stage or a new linked case, by the firm's choice. **The child's study permit needs no principal of its own and has no co-applicants:** it is the child's own application, signed by a parent for a minor (S1, S2) | Fee caps need "same time and place" (S3); IMM 0008 (S5) | Splitting a household that applies together loses the fee caps and the shared facts; putting permanent residence with temporary applications mixes two services, two fees and two timelines in one file |
| 4 | Combination per application, per case or per pathway? | **Per application.** A combination is "one filing type" (`domain/TAXONOMY.md` §1; skill `immigration-structure` rule 2), and validation case 2 already says "Three combinations in one case". A case holds one or more applications. **Gap:** the app ties the case to one combination; a family's different applications exist only where that combination was configured to add them (`added-filings.ts`, `fees_by_role`). "Visitor for him, study permit for the spouse, work permit for the child" cannot be set up without copying study and work permit forms into the visitor combination | TAXONOMY §1, §4 row 2; `schema.prisma:1266`, `:1463`; P-490 (Option B deferred) | Configuration copied across combinations drifts (a form edition fixed in one, stale in another); forms follow roles, not applications (P-490's workaround) |
| 5 | Case list and case page; why no case IDs | **Agree; the team already specified it (AG-7-3), the reference app just never built it.** Generate a case number at opening in the team's format (`C-2026-00042`, per firm per year); keep the firm's own reference as optional. Staff list: a table with case number, client, applications, next step, owner, status, updated; cards only on a phone. Case page: summary plus one next step (P-473), then **Applications** as a table, one row per application (team style guide: more than one record is a table), each opening its own page or a right-hand panel. **No sub-tab per application**: tabs do not scale past three or four people and hide what waits | `cases.tsx:186` (typed reference), `:132`; BIC-08 (`design/best-in-class-m3-case-screens-2026-11-07.md`); P-473, P-115 (cards/list remembered) | A typed reference collides, is mistyped and carries no order; the co-founder's cold walk will look for one |

---

## 5. The recommended model

### 5.0 End to end: from lead to filed applications (team modules in brackets)

```
Lead ──► Prospect ──► Retainer signed (all client signers + the firm) ──► Client  CL-00017     [AG-02, AG-05]
                                    │ amendment = more services, same case                     
                                    ▼
                      Case  C-2026-00042  · one client · one destination country · one pathway  [AG-07; this app]
                       │   linked to that one signed retainer (no other case uses it)
                       ├── Applications (filings), one or more, each on its own combination of that pathway
                       └── Submission groups (filings sent together) ──► IRCC application numbers, UCIs
Next engagement (e.g. permanent residence later) = new retainer ──► new case, linked to the earlier one
```

**Is this a good definition for the product? Yes, with the refinements of verdict 0.** It gives every money, trust and file record one home (the Code keeps them per client, ss. 32(d), 36(3)); it matches how firms scope work (§3); it lets one household's applications sent together share the fee caps (S3); and it keeps the corporate side apart (an LMIA is the employer's own case, linked, TAXONOMY §2, AG-17). Its one risk is treating the retainer as the case's identity; the team avoids it by linking, not keying, and so does this design.

### 5.1 Words (one term per thing)

```
Client (person or employer; client code CL-…)  ·  Household (the client's people and their relations, reused across cases)
 └── Case  C-2026-00042  · one client, one destination country, one pathway, linked to one signed retainer
      ├── Principal applicant (exactly one: the client's person; principal on the lead filing)
      ├── People on the case (spouse or partner, children, sponsor …)
      ├── Lead representative (one per case, from the retainer)
      └── Applications (one or more)
           ├── Application = one filing to IRCC: one combination, one release pinned, one principal (its applicant),
           │   its own forms, fee, status, IRCC application number; family on it only where IRCC puts them on it
           │   (permanent residence: applying or declared only)
           └── Submission group (applications sent together; fee caps apply inside it)
```

### 5.2 Rules

| Id | Rule | Kind |
|---|---|---|
| CS-1 | A case has exactly one principal applicant, always; Make principal moves the role in one step (checked at commit) | Product + database |
| CS-2 | Every other person is related to the principal (spouse or partner, child, sponsor) as today | Product (today) |
| CS-3 | A case has one or more applications; each application has one combination and pins that combination's release | Product (M4) |
| CS-4 | An application is owned by one person (its applicant). A temporary residence application has no co-applicants; a permanent residence application carries the family as applying or declared only (filing modes, today) | Product (today) |
| CS-5 | A case's applications all belong to the case's one pathway (client type, AG-7-1) and its client's household; their combinations may differ. Applications sent together form a submission group, and only combinations going through the same IRCC account (the combination's `portalKey`, data) can share a group. Another pathway (an employer's LMIA) is refused in words with "Open a linked case" | Data (M4), no combination named in code |
| CS-6 | A new engagement (a new retainer) opens a new case, linked to the earlier one (AG-07 "Linked case"); permanent residence normally does, so it lands in its own case. Adding it to a temporary case warns ("usually its own retainer and case") and never blocks. A temporary application that waits for a permanent residence application is a later stage of that case | Data (routes, M4) |
| CS-7 | A case opens with a generated case number (AG-7-3), unique within the firm, never reused or changed; the firm's own reference is optional and searchable | Product + database (Bake, if agreed) |
| CS-8 | One client per case (AG-07), shown on the case with the client code; the client's person answers for minors; other adults may sign the retainer (AG05-D2) and keep their answers private from the client (C6.16) | Product (today in part; client code with the team's client record) |
| CS-9 | One lead representative per case, from the signed retainer (AG-07); each adult applicant's own IMM 5476 copy is a document on their filing (S7); a per-filing representative only if the immigration expert says firms need it | Product (M4) |
| CS-11 | A case links at most one signed retainer, used by no other case; without one it shows "Retainer not signed" and warns, never blocks (AG-7-1 rule 14). Adding an application for a new person changes the agreed services: a retainer amendment on the same case | Team module (AG-05); this app keeps a `retainer` slot only |
| CS-10 | The case shows its applications as a table; each row names its principal applicant, status, fee and one next step (team style guide; BIC-08's content) | UX (slice: the existing People and filings table; M4: full) |

**Case number format (CS-7, the team's AG-7-3):** `C-<year opened>-<5-digit running number>`, e.g. `C-2026-00042`; the prefix `C-` is fixed in Release 1; the running number restarts each year per firm and grows past 99999 without breaking. Allocated inside the opening transaction from a per-firm, per-year counter row (no gaps on refusal, no duplicates when two officers open at once). Existing cases get numbers by opening date in a backfill. IRCC's application numbers and UCIs stay where they are, per filing and per person. The client code (`CL-<5 digits>`, AG-7-69) belongs to the team's client record (AG-02) and is not built in this app.

**Who is principal when a minor is the student and the parents only visit?** The case's principal is the household's anchor adult (so spouse and children keep their relations), and the child's study permit is the child's own application. No new "parent" role is needed for this. Whether IRCC needs anything else in this situation is **Unconfirmed: ask the immigration expert**.

### 5.3 What changes in the data (M4 unless marked)

| Change | Tables and files | Migration |
|---|---|---|
| Case number (Bake if agreed) | `Case.caseNumber` + unique `(workspaceId, firmKey, caseNumber)`; new `firm_case_counter (workspace_id, firm_key, year, next_value)`; `reference` becomes optional | `2026111x_a24_case_number`: add column nullable, backfill by `created_at`, then NOT NULL |
| Principal guard (Bake if agreed) | `case_participant`: `EXCLUDE (case_id WITH =) WHERE (role = 'principal') DEFERRABLE INITIALLY DEFERRED` (a deferred constraint, so Make principal's two updates still pass) plus a deferred trigger that a case has at least one principal at commit | `2026111x_a24_one_principal` |
| Retainer slot | `Case.retainerRef` optional text, shown as "Retainer: not signed" until the team's AG-05 links one (no retainer logic here) | `…_a24_retainer_slot` (M4, only if the founder wants it shown) |
| Combination per application | `Filing.combinationId` (from the stage's), per-filing release pin (a `PackWorkPin` row per application, or `Filing.configReleaseId`); `CaseStage` keeps the route, no longer "one combination for the case" | `…_a24_application_combination`, backfill from the case |
| Adult's own IMM 5476 copy | a document requirement per adult applicant (data), no schema change | none |

Baton files (P-438 (2), one holder at a time): `prisma/schema.prisma` for every migration above; `api/src/case-prepare.ts` only for "combination per application" (prepare reads each application's own release). Neither is touched by the case-number PRs except `schema.prisma`.

---

## 6. UX

**Case list (staff).** A table (P-115 keeps Cards/List per person; cards below 640 px as on the client page today). Columns: **Case** (number, bold, with the firm's own reference under it in muted text), **Client** (name), **Applications** (count and short names: "3 · Study permit, Work permit, Visitor visa"), **Next step** (one line, orange only when it needs you, P-473 (4)), **Case officer**, **Status** (shape and text), **Updated**. Filters as chips: My cases · Needs me · Waiting on client · Ready to file · Filed. Search by case number, reference, name, IRCC application number or UCI.

**Case page.** Header: case number, the client's name, status; one line under it: client (with client code when the team's record exists), retainer status, lead representative, case officer. Then **one next step** card with the one filled button. Below, in order: **Applications** as a table, one row per application (principal applicant, application, status, fee, IRCC number when filed, its own next step), each row opening a right-hand panel or its own page; **People** as a table (role, applications they are on, private flag); then links to sub-pages: Questionnaire, Documents, Review, Submission, Activity. An application opens its own sub-page (forms, documents, checks, fee, record) with a person filter; quick details open in a drawer. Sub-tabs exist only for case-level areas, never one per application. **Why a table, not cards:** the team's style guide, which wins on look (EXPERIENCE.md), says more than one record is a table, never a stack of cards (`code/ERv2-frontend@24cae6b-2026-10-28/docs/style-guide/components/data-display.md`), and field panes slide in from the right; the BIC-08 card idea (GOV.UK summary cards) gives way to it. Client words stay plain second person with "Why we ask" (P-473 (2)); IRCC's exact words on staff views.

**Open a case.** The case number shows as "Given when you open (C-2026-00043 next)"; "Your own reference (optional)". In M4 the dialog picks the principal's application first, then "Add an application" per person (offered only for combinations allowed by CS-5).

See the mockup for both screens.

---

## 7. Plan: small PRs (P-436 (4), each under ~800 lines)

### The demo slice (L; in the Bake only if the founder says yes to Q1; not needed for walk 1 to pass)

| PR | What | Files | Lines | Hours |
|---|---|---|---|---|
| A24-1 | Case number (AG-7-3): migration, per-firm per-year counter, allocation at opening, backfill by opening date, `reference` optional; one client person per case as a deferred constraint plus an at-least-one trigger; contracts; list returns the client's name and a filing count | `prisma/schema.prisma` (baton), one migration, `api/src/runtime.ts`, `contracts/runtime.ts`, tests | ~550 | 4.5 |
| A24-2 | Screens: number in the list, heading, search and Open a case ("Your own reference (optional)"); Client column and filing count in the list; client list | `web/src/runtime/cases.tsx` (screens single writer, P-489 (1)), web tests, journey screenshots | ~300 | 3 |
| A24-3 | Screens: "Client: …" in the case header; the existing People and filings table (`web/src/runtime/filing-changes.tsx`) names each filing's principal applicant | `cases.tsx`, `filing-changes.tsx`, web tests | ~150 | 2 |

Slice total ~9.5 h over 3 PRs; A24-1 needs the schema baton after the current holder; A24-2 and A24-3 wait for the screens lane's queue. No derivation changes, so fees, filings and forms are byte-identical.

### Later, if needed (designed above, not built now)


| PR | What | Hours |
|---|---|---|
| M4-A1 | Combination per application, schema and backfill (no behaviour change) | 4 |
| M4-A2 | Prepare reads each application's own release (`case-prepare.ts` baton) | 8 |
| M4-A3 | Questionnaire across several releases: one question per shared fact, asked once (canonical answers are already per person) | 10 |
| M4-A4 | Forms follow their application (retires P-490's role-and-condition workaround where it applied) | 8 |
| M4-A5 | "Add an application" on the case, with CS-5 (same pathway; same IRCC account inside a submission group, data), CS-6's warning and words for "open a linked case" | 6 |
| M4-A6 | Fee derivation per application's own table row (fee caps still across the submission group) | 6 |
| M4-B1 | Case list v2: API returns main applicant, applications, next step, officer; table, filters, search | 6 |
| M4-B2 | Case page: summary and one next step, Applications table, People table, right-hand panels (folds into UX-13 PR 1, already first in M4) | 8 |
| M4-C1 | Client line on the case (client's person, retainer status slot), privacy check for adults (C6.16) | 2 |
| M4-C2 | Each adult applicant's own IMM 5476 copy as a document requirement (data) | 2 |
| M4-D1 | Permanent residence case linking ("follows" and "waits for" across cases) | 6 |

M4 total ~71 h (about 45-60 h for the "combination per application" core A1-A6 with reviews). Data for Study permit, Visitor visa, Work permit and sponsorship moves from "added filings" to real separate combinations only after M4-A5, through the screens (no code change, P-452).

---

## 8. Test plan

**Pack checks per rule** (unit checks under `tests/`, plus API checks against a fresh database):
* CS-1: opening makes one principal; adding a second is refused; Make principal passes (deferred constraint); a raw insert of a second principal fails at commit; a case without a principal fails at commit.
* CS-7: format `C-2026-00001`; 20 parallel openings in one firm give 20 different numbers with no gap; two firms each start at 00001; a refused opening uses no number; an idempotent replay returns the same number; the backfill numbers old cases by opening date; the year rolls to 00001.
* CS-3/CS-5 (M4): two applications on two combinations in one case each pin their own release; a combination of another pathway is refused in words; two combinations on different IRCC accounts cannot share a submission group; permanent residence added to a temporary case warns and is allowed; fee caps still apply across the submission group (the six's family fixture: same totals as today).
* CS-4: a temporary application has no co-applicants; a permanent residence application keeps applying and declared-only people (today's filing-mode checks stay green).
* CS-8/CS-9 (M4): a private adult's answers stay hidden from the client's person; each adult applicant gets their IMM 5476 document line.

**Walk by screens** (journey-test, P-447): open a case and see its number in the toast, list and heading; search by number; open a family Study permit case and see one row per application with its people and fee; (M4) add a study permit for a second child and a work permit for the spouse, see them in one submission with the fee caps.

**Nothing on main breaks:**
* The six and the configured checkpoint packs stay green on every PR (P-322); the case-number PRs change no derivation, so fee and filing totals are byte-identical.
* B164's guard (`tests/check_b164_no_engine_keys.ts`) stays clean: no program, form or combination key in code (P-319, P-425); CS-5 reads `portalKey` and submission kind from data.
* `reference` stays accepted by the API (now optional) so seeds, demo resets and the finished-story script keep working; their cases get numbers on the backfill.
* Migrations add columns nullable first, backfill, then tighten, so a running demo survives (`start.sh` applies migrations).

---

## 9. Questions for the founder (at most three, each with a recommendation)

1. **Build the demo slice (case numbers, client words, one client person per case in the database; ~9.5 h, 3 PRs) inside the Bake, before the co-founder's cold walk (14 Nov)?** Recommendation: **yes, after the current schema baton**: it answers his visible questions, changes no derivation and is additive (rollback = drop a column, a table and a constraint).
2. **Adopt the case boundary as the team wrote it: one signed retainer ↔ one case (a case may open before signature, with a warning); one client and one pathway per case; any mix of that pathway's combinations; a new engagement such as permanent residence = a new retainer and a new linked case (warn, never block)?** Recommendation: **yes**: it is the team's AG-07/AG-05 rule, so the reference app only catches up; the immigration expert confirms CS-5 and CS-6, Sample until then.
3. **Build "a combination per application" (~45-60 h) only when a real household needs a mix that today's added filings cannot express, rather than as M4's first engine row?** Recommendation: **yes, wait for the trigger**: today's model already serves the Study permit and Visitor visa families correctly; the cost is high and the risk lands on the baton files; the design here keeps it unblocked.

For the immigration expert (not the founder): whether every adult must sign the service agreement; whether the representatives' portal puts a household's visitor, study and work applications in one online submission; and the minor-student case in §5.2.

---

## Glossary

| Term | Meaning here |
|---|---|
| **Case** | One engagement of the firm for one household under one service agreement; it holds people and one or more applications. "Matter" or "file" in other tools |
| **Case number** | The number the app gives a case when it opens, e.g. `C-2026-00042` (team AG-7-3); never reused |
| **Client code** | The team's number for a client, e.g. `CL-00017` (AG-7-69); not built in this app |
| **Retainer** | The signed service agreement; one signed retainer links to one case; an amendment adds services to the same case |
| **Lead representative** | The licensed person whose licence backs the case, from the retainer (team term) |
| **Linked case** | A new case joined to an earlier one for a follow-on matter (team term) |
| **Your reference** | The firm's own optional reference for a case (for example from an older system) |
| **Household** | The principal applicant and the people related to them (spouse or partner, children) |
| **Principal applicant** | The one person a case is built around; on a permanent residence application, IRCC's "principal applicant" who fills IMM 0008 for the family |
| **Applicant** | The person an application belongs to. On temporary residence each family member is the applicant on their own application |
| **Application (filing)** | One application to IRCC: its own forms, fee, decision and IRCC application number |
| **Applying / declared only** | On a permanent residence application: a family member who comes to Canada / one named but not coming (no fee) |
| **Combination** | The last level of Pathway › Program › Category › Sub-category: one kind of application, configured and released as versions |
| **Release** | A frozen version of a combination's configuration; an application pins one |
| **Submission group** | Applications sent together at the same time and place; IRCC's family fee caps apply only inside it |
| **Client (of the case)** | The person or employer the firm works for on this case (team term); the co-founder's "point of contact" |
| **Client (Code)** | Under the consultants' Code, each person who has an agreement with, or consults, the licensee (s. 1) |
| **Service agreement** | The written agreement the Code requires before services (s. 24); also called a retainer |
| **Representative of record** | The licensed person named on IMM 5476 for an application; one at a time per application |
| **UCI** | Unique client identifier IRCC gives each person |
| **Sample** | A value not yet confirmed by the immigration expert or an official source |
