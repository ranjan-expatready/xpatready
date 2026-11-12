# A24: how a case is structured: principal, main contact, mixed applications, case numbers (Fable planner, 12 Nov 2026)

**Who and why.** The founder's ask A24 (12 Nov ~12:2x IST, spoken, after a demo to the co-founder), recorded in `product/STATE.md` "Founder asks". The founder's words, in short: follow the co-founder's points only on their merit, and find the best solution for real immigration practice. This page is a planner's design (P-455 (5)): read-only on the app, live AI off, US$0. It changes no rule, state or backlog file; the Lead decides what becomes a row.

**Mockup:** [`case-structure-a24-mockup.html`](case-structure-a24-mockup.html) (static, Sample data, no real names).

**In one paragraph.** The co-founder is right on four of five points, and the fifth (combination per case or per application) shows a real gap. The app already keeps exactly one principal applicant per case (in code only, not in the database). It already gives each family member their own application with their own fee, which is what IRCC asks for temporary residence. But a case is still tied to **one** combination, so a family whose members make *different kinds* of temporary applications works only where that combination was configured to add them (the Study permit family, BK-15/BK-17). The right model, used by IRCC's own wording and by the team's taxonomy, is **one case per household engagement, holding one or more applications, each application on its own combination**. Permanent residence is one application for the whole family and goes in its own case. Case numbers are not generated today: the officer types a "reference". The recommended order is: case numbers plus a database guard for the principal in the Bake **if the founder agrees** (about 7 hours), and the rest in M4, starting with "a combination per application" (about 45-60 hours).

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
| S4 | The temporary residence guides speak of "you" and "your family members", not of a principal applicant with co-applicants | The words "principal applicant" do not appear in Guides 5256, 5269 or 5487 (searched 12 Nov 2026) | Same copies |
| S5 | Permanent residence: one application for the family, made by the principal applicant | IMM 0008: "This form must be completed by: you, the principal applicant"; "you must declare and provide details for all your family members, including those: who are not applying for permanent residence with you (not accompanying you to Canada)" | `official-sources/ircc/canada/pages/imm0008.html` (canada.ca IMM 0008 instructions), saved 19 Oct 2026; read 12 Nov 2026 |
| S6 | Permanent residence: each adult family member completes their own family form on the one application | IMM 5406 "must be completed by: You, as the principal applicant, Your spouse or common-law partner (whether accompanying you to Canada or not), and Your dependent children aged 18 or over" | `canada/pages/imm5406.html` (page "Last updated: May 2026"); read 12 Nov 2026 |
| S7 | A representative is appointed per application; adult children sign their own | "you can appoint only one (1) representative at a time for each application you submit"; "If you have dependent children aged 18 years or older, they are required to complete their own copy of this form if a representative is also conducting business on their behalf." | IMM 5476 instructions, `official-sources/ircc/web-pages/page-imm5476.html`; form edition 01-11-2025; read 12 Nov 2026 |
| S8 | Who a consultant's client is | s. 1(1) "client means a person or entity that (a) has entered into a consultation agreement or service agreement with a licensee; (b) consults with a licensee who provides or agrees to provide immigration or citizenship consulting services to them; or (c) …" | Code of Professional Conduct for College of Immigration and Citizenship Consultants Licensees, SOR/2022-128, https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html, current to 2026-10-19; read 12 Nov 2026 |
| S9 | The service agreement names the client and lists the services | s. 24(1) "A licensee must enter into a written service agreement with a client" before any services; s. 24(3)(g) "an itemized list of the services to be provided, tailored to the needs of the client"; s. 24(3)(t) timely case-status information | Same, s. 24 |
| S10 | Conflicts between clients | s. 15(1): no services where this "would or could result in a conflict of interest" unless disclosed in writing with the client's written consent; s. 28(1) confidentiality of "all information in relation to a client" | Same, ss. 15, 28 |
| S11 | Records | s. 37 "a reliable system of office administration"; no rule on file numbers; s. 36(3) a file goes to a new representative on request | Same, ss. 36, 37 |

Also reused (not re-researched): `research_notes/Agent view and filing UX/ircc_filing_units.md` (29 Oct) tables 1-8 and its six exceptions (permanent residence is one filing for the family; declared-only people; sponsorship co-filed; filings that wait; employer filings are separate linked cases; a visa issued with a first permit is not a filing).

**Not settled by any official page (marked):**
* Whether every adult in the household must sign the firm's service agreement, or the main applicant may sign for the family. The Code defines each person who consults as a client (S8) but has no rule on joint clients. **Unconfirmed: no counsel; ask the immigration expert.**
* Which applications a firm "should" put in one case. IRCC has no case concept; this is firm practice. **Sample (product rule below), confirmed by the immigration expert.**
* Whether IRCC's portal for representatives groups a household's mixed temporary applications (visitor, study, work) into one online submission. The 29 Oct note quotes the APR guide for "the number of applicants who will be included in this online submission"; the portal itself is behind sign-in. **Unconfirmed: ask the immigration expert.**

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
| 1 | Exactly one principal applicant per case | **Agree, and it is already so; add a database guard and fix the words.** | App: `runtime.ts:65`, `person-roles.json:4`. IRCC: the principal applicant is a permanent residence term (S5, S6); temporary residence guides speak of "you" and family members who apply on their own (S1, S4) | Today only code enforces it; a future import or script could store two. Calling every temporary applicant "principal" confuses staff |
| 2 | One point of contact per case | **Agree, with a change**: call it **Main contact** (a firm term; neither IRCC nor the Code names it), default the principal, any adult on the case may be chosen; keep it apart from the **client(s) on the service agreement** and the **representative of record per application** | Code ss. 1, 22, 24 (S8, S9); IMM 5476 per application and adult children's own copy (S7); app: `clientActorId`, `clientSubjectOf`, `keepPrivate` | One login answering for adults breaks their privacy and consent (C6.16 already guards); a single representative "per case" does not match IMM 5476 once applications differ |
| 3 | Mixed temporary applications in one case; permanent residence in its own case | **Agree, with a change.** The household's temporary applications **sent together** share one case (one submission, one payment receipt, fee caps S1, S3). Permanent residence opens its own case (one application for the family, S5; another portal; another service agreement). Change: a temporary application that **depends on** the permanent residence application (a sponsored spouse's open work permit after the acknowledgement of receipt, ircc_filing_units.md row 5b) belongs in the permanent residence case, as a later stage. A member who applies months later is a new stage or a new linked case, by the firm's choice. **The child's study permit needs no principal of its own and has no co-applicants:** it is the child's own application, signed by a parent for a minor (S1, S2) | Fee caps need "same time and place" (S3); IMM 0008 (S5) | Splitting a household that applies together loses the fee caps and the shared facts; putting permanent residence with temporary applications mixes two services, two fees and two timelines in one file |
| 4 | Combination per application, per case or per pathway? | **Per application.** A combination is "one filing type" (`domain/TAXONOMY.md` §1; skill `immigration-structure` rule 2), and validation case 2 already says "Three combinations in one case". A case holds one or more applications. **Gap:** the app ties the case to one combination; a family's different applications exist only where that combination was configured to add them (`added-filings.ts`, `fees_by_role`). "Visitor for him, study permit for the spouse, work permit for the child" cannot be set up without copying study and work permit forms into the visitor combination | TAXONOMY §1, §4 row 2; `schema.prisma:1266`, `:1463`; P-490 (Option B deferred) | Configuration copied across combinations drifts (a form edition fixed in one, stale in another); forms follow roles, not applications (P-490's workaround) |
| 5 | Case list and case page; why no case IDs | **Agree, with a change.** Generate a case number at opening (`C-2026-0042`, per firm); keep the firm's own reference as optional. Staff list: a table with case number, main applicant, applications, next step, owner, status, updated; cards only on a phone. Case page: summary plus one next step (P-473), then **Applications** as one card per application (BIC-08), each opening its own sub-page or drawer. **No sub-tab per application**: tabs do not scale past three or four people and hide what waits | `cases.tsx:186` (typed reference), `:132`; BIC-08 (`design/best-in-class-m3-case-screens-2026-11-07.md`); P-473, P-115 (cards/list remembered) | A typed reference collides, is mistyped and carries no order; the co-founder's cold walk will look for one |

---

## 5. The recommended model

### 5.1 Words (one term per thing)

```
Household (people and their relations, reused across cases)
 └── Case  C-2026-0042  · one engagement under one service agreement
      ├── Principal applicant (exactly one)   ├── Main contact (one adult; default the principal)
      ├── People on the case (spouse or partner, children, sponsor …)
      └── Applications (one or more)
           ├── Application = one filing to IRCC: one combination, one release pinned, one owner (its applicant),
           │   its own forms, fee, status, IRCC application number; people on it (permanent residence) as applying or declared only
           ├── Representative of record (per application; default the case's)
           └── Submission group (applications sent together; fee caps apply inside it)
```

### 5.2 Rules

| Id | Rule | Kind |
|---|---|---|
| CS-1 | A case has exactly one principal applicant, always; Make principal moves the role in one step (checked at commit) | Product + database |
| CS-2 | Every other person is related to the principal (spouse or partner, child, sponsor) as today | Product (today) |
| CS-3 | A case has one or more applications; each application has one combination and pins that combination's release | Product (M4) |
| CS-4 | An application is owned by one person (its applicant). A temporary residence application has no co-applicants; a permanent residence application carries the family as applying or declared only (filing modes, today) | Product (today) |
| CS-5 | Applications may share a case only when they can go in one submission: their combinations go through the same IRCC account (the combination's `portalKey`, data) and the same kind of submission. Anything else is refused in words with "Open a linked case" | Data (M4), no combination named in code |
| CS-6 | A permanent residence application opens its own case; a temporary application that waits for it is a later stage of that case | Data (routes, M4) |
| CS-7 | A case opens with a generated case number, unique within the firm, never reused or changed; the firm's own reference is optional and searchable | Product + database (Bake, if agreed) |
| CS-8 | One main contact per case, an adult on the case; changing it is audited; adults who keep answers private stay private from the main contact (C6.16) | Product (M4) |
| CS-9 | Representative of record per application, default the case's; an adult applicant's own IMM 5476 copy is a document on their application (S7) | Product (M4) |
| CS-10 | The case shows the applications as cards; each card names its people, status and one next step (BIC-08) | UX (M4) |

**Case number format (CS-7):** `<firm prefix>-<year opened>-<4-digit running number>`, e.g. `C-2026-0042`. The prefix is firm data (`samples/firms.json`, default `C`), the running number restarts each year per firm and grows past 9999 without breaking. Allocated inside the opening transaction from a per-firm, per-year counter row (no gaps on refusal, no duplicates when two officers open at once). Existing cases get numbers by opening date in a backfill. IRCC's application numbers and UCIs stay where they are, per application and per person.

**Who is principal when a minor is the student and the parents only visit?** The case's principal is the household's anchor adult (so spouse and children keep their relations), and the child's study permit is the child's own application. No new "parent" role is needed for this. Whether IRCC needs anything else in this situation is **Unconfirmed: ask the immigration expert**.

### 5.3 What changes in the data (M4 unless marked)

| Change | Tables and files | Migration |
|---|---|---|
| Case number (Bake if agreed) | `Case.caseNumber` + unique `(workspaceId, firmKey, caseNumber)`; new `firm_case_counter (workspace_id, firm_key, year, next_value)`; `reference` becomes optional | `2026111x_a24_case_number`: add column nullable, backfill by `created_at`, then NOT NULL |
| Principal guard (Bake if agreed) | `case_participant`: `EXCLUDE (case_id WITH =) WHERE (role = 'principal') DEFERRABLE INITIALLY DEFERRED` (a deferred constraint, so Make principal's two updates still pass) plus a deferred trigger that a case has at least one principal at commit | `2026111x_a24_one_principal` |
| Main contact | `Case.mainContactSubjectId` (backfill the client person), audit line on change | `…_a24_main_contact` |
| Combination per application | `Filing.combinationId` (from the stage's), per-filing release pin (a `PackWorkPin` row per application, or `Filing.configReleaseId`); `CaseStage` keeps the route, no longer "one combination for the case" | `…_a24_application_combination`, backfill from the case |
| Representative per application | `CaseTeamMember.filingId` optional (null = whole case) | `…_a24_rep_per_application` |

Baton files (P-438 (2), one holder at a time): `prisma/schema.prisma` for every migration above; `api/src/case-prepare.ts` only for "combination per application" (prepare reads each application's own release). Neither is touched by the case-number PRs except `schema.prisma`.

---

## 6. UX

**Case list (staff).** A table (P-115 keeps Cards/List per person; cards below 640 px as on the client page today). Columns: **Case** (number, bold, with the firm's own reference under it in muted text), **Main applicant** (name), **Applications** (count and short names: "3 · Study permit, Work permit, Visitor visa"), **Next step** (one line, orange only when it needs you, P-473 (4)), **Case officer**, **Status** (shape and text), **Updated**. Filters as chips: My cases · Needs me · Waiting on client · Ready to file · Filed. Search by case number, reference, name, IRCC application number or UCI.

**Case page.** Header: case number, main applicant, status; one line under it: main contact, representative of record, case officer. Then **one next step** card with the one filled button. Below, in order: **Applications** (one card per application: who, application type and combination, status pill, fee, IRCC number when filed, its own next step, "Open"), **People** (summary cards per person: role, which applications they are on, private flag), then links to sub-pages: Questionnaire, Documents, Review, Submission, Activity. An application opens its own sub-page (forms, documents, checks, fee, record) with a person filter; quick details open in a drawer. Sub-tabs exist only for case-level areas, never one per application. Client words stay plain second person with "Why we ask" (P-473 (2)); IRCC's exact words on staff views.

**Open a case.** The case number shows as "Given when you open: C-2026-0043 (next free)"; "Your own reference (optional)". In M4 the dialog picks the principal's application first, then "Add an application" per person (offered only for combinations allowed by CS-5).

See the mockup for both screens.

---

## 7. Plan: small PRs (P-436 (4), each under ~800 lines)

### For the Bake (only if the founder says yes to Q1; neither is needed for walk 1 to pass)

| PR | What | Files | Lines | Hours |
|---|---|---|---|---|
| A24-1 | Case number: migration, counter, allocation at opening, backfill, contracts, `reference` optional, firm prefix as data | `prisma/schema.prisma` (baton), migration, `api/src/runtime.ts`, `contracts/runtime.ts`, `samples/firms.json`, tests | ~450 | 3.5 |
| A24-2 | Case number on screens: list column and search, page heading, Open a case dialog, client list | `web/src/runtime/cases.tsx` (screens single writer, P-489 (1)), `web` tests, journey screenshots | ~250 | 2 |
| A24-3 | One principal in the database (deferred exclusion + at-least-one trigger) | `prisma/schema.prisma` (baton), migration, tests | ~150 | 1.5 |

Bake total ~7 h over 3 PRs; A24-1 and A24-3 need the schema baton in turn after the current holder; A24-2 waits for the screens lane's queue.

### For M4 (in order)

| PR | What | Hours |
|---|---|---|
| M4-A1 | Combination per application, schema and backfill (no behaviour change) | 4 |
| M4-A2 | Prepare reads each application's own release (`case-prepare.ts` baton) | 8 |
| M4-A3 | Questionnaire across several releases: one question per shared fact, asked once (canonical answers are already per person) | 10 |
| M4-A4 | Forms follow their application (retires P-490's role-and-condition workaround where it applied) | 8 |
| M4-A5 | "Add an application" on the case, with CS-5 (same IRCC account and submission kind, data) and words for "open a linked case" | 6 |
| M4-A6 | Fee derivation per application's own table row (fee caps still across the submission group) | 6 |
| M4-B1 | Case list v2: API returns main applicant, applications, next step, officer; table, filters, search | 6 |
| M4-B2 | Case page: summary and one next step, Applications cards, People cards, drawers (folds into UX-13 PR 1, already first in M4) | 8 |
| M4-C1 | Main contact (schema, chooser, audit, privacy check) | 4 |
| M4-C2 | Representative per application and adult applicants' own IMM 5476 copy as a document | 5 |
| M4-D1 | Permanent residence case linking ("follows" and "waits for" across cases) | 6 |

M4 total ~71 h (about 45-60 h for the "combination per application" core A1-A6 with reviews). Data for Study permit, Visitor visa, Work permit and sponsorship moves from "added filings" to real separate combinations only after M4-A5, through the screens (no code change, P-452).

---

## 8. Test plan

**Pack checks per rule** (unit checks under `tests/`, plus API checks against a fresh database):
* CS-1: opening makes one principal; adding a second is refused; Make principal passes (deferred constraint); a raw insert of a second principal fails at commit; a case without a principal fails at commit.
* CS-7: format `C-2026-0001`; 20 parallel openings in one firm give 20 different numbers with no gap; two firms each start at 0001; a refused opening uses no number; an idempotent replay returns the same number; the backfill numbers old cases by opening date; the year rolls to 0001.
* CS-3/CS-5 (M4): two applications on two combinations in one case each pin their own release; a combination on another IRCC account is refused in words; fee caps still apply across the submission group (the six's family fixture: same totals as today).
* CS-4: a temporary application has no co-applicants; a permanent residence application keeps applying and declared-only people (today's filing-mode checks stay green).
* CS-8/CS-9 (M4): a private adult's answers stay hidden from a main contact who is another adult; the representative of an application defaults to the case's.

**Walk by screens** (journey-test, P-447): open a case and see its number in the toast, list and heading; search by number; open a family Study permit case and see one card per application with its people and fee; (M4) add a visitor application for a grandparent and a work permit for the spouse, see them in one submission with the fee caps.

**Nothing on main breaks:**
* The six and the configured checkpoint packs stay green on every PR (P-322); the case-number PRs change no derivation, so fee and filing totals are byte-identical.
* B164's guard (`tests/check_b164_no_engine_keys.ts`) stays clean: no program, form or combination key in code (P-319, P-425); CS-5 reads `portalKey` and submission kind from data.
* `reference` stays accepted by the API (now optional) so seeds, demo resets and the finished-story script keep working; their cases get numbers on the backfill.
* Migrations add columns nullable first, backfill, then tighten, so a running demo survives (`start.sh` applies migrations).

---

## 9. Questions for the founder (at most three, each with a recommendation)

1. **Case numbers and the principal guard in the Bake (about 7 hours, 3 PRs) or in M4?** Recommendation: **in the Bake, after the current schema baton**: the co-founder will look for a case number on his cold walk (14 Nov), the work changes no derivation, and the risk is low.
2. **Adopt the case boundary: one case per household engagement; temporary applications sent together share a case; permanent residence in its own case, with applications that wait for it as its later stages?** Recommendation: **yes**, with the immigration expert confirming CS-5 and CS-6 as Sample until then.
3. **Make "a combination per application" (M4-A1 to A6, about 45-60 hours) the first engine work of M4, ahead of other engine rows?** Recommendation: **yes**: it removes the copied-configuration risk behind P-490 and makes any household mix configurable by screens alone.

For the immigration expert (not the founder): whether every adult must sign the service agreement; whether the representatives' portal puts a household's visitor, study and work applications in one online submission; and the minor-student case in §5.2.

---

## Glossary

| Term | Meaning here |
|---|---|
| **Case** | One engagement of the firm for one household under one service agreement; it holds people and one or more applications. "Matter" or "file" in other tools |
| **Case number** | The number the app gives a case when it opens, e.g. `C-2026-0042`; never reused |
| **Your reference** | The firm's own optional reference for a case (for example from an older system) |
| **Household** | The principal applicant and the people related to them (spouse or partner, children) |
| **Principal applicant** | The one person a case is built around; on a permanent residence application, IRCC's "principal applicant" who fills IMM 0008 for the family |
| **Applicant** | The person an application belongs to. On temporary residence each family member is the applicant on their own application |
| **Application (filing)** | One application to IRCC: its own forms, fee, decision and IRCC application number |
| **Applying / declared only** | On a permanent residence application: a family member who comes to Canada / one named but not coming (no fee) |
| **Combination** | The last level of Pathway › Program › Category › Sub-category: one kind of application, configured and released as versions |
| **Release** | A frozen version of a combination's configuration; an application pins one |
| **Submission group** | Applications sent together at the same time and place; IRCC's family fee caps apply only inside it |
| **Main contact** | The adult the firm talks to about the case (default the principal); a firm term |
| **Client (Code)** | Under the consultants' Code, each person who has an agreement with, or consults, the licensee (s. 1) |
| **Service agreement** | The written agreement the Code requires before services (s. 24); also called a retainer |
| **Representative of record** | The licensed person named on IMM 5476 for an application; one at a time per application |
| **UCI** | Unique client identifier IRCC gives each person |
| **Sample** | A value not yet confirmed by the immigration expert or an official source |
