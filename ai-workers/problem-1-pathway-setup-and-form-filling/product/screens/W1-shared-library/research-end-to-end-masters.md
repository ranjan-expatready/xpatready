# End-to-end masters, rules and configuration: what is still missing (research, 29 Oct 2026)

**Asked (founder, 29 Oct, condensed):** are we forgetting any reusable library item or master (made by AI or a person), or any rule or configuration, that form preparation, application preparation and filing will need, so nothing fails in production?
**Status:** research only. It changes nothing until the founder answers §5. It builds on `research-authoring-model.md` §5, which listed the master types industry tools have and we lack; those are not repeated here. This page walks the journey after setup.
**Read:** PRODUCT, WAVE-1, DECISIONS (to P-149), the P-01–P-36 foundation decisions, BACKLOG, qa/CAPABILITIES, domain/MASTERS and RULES-MODEL, the W1-shared-library, W1-questions-and-documents and M3-prepare-application concepts, `research_notes/Agent view and filing UX/`, the studio `prisma/schema.prisma` (60 tables), and the team's requirements in `sources/drive-snapshot-2026-10-19-1233` (SA-01 v2.7, SA-01B v1.5, AG-03, AG-06, AG-07, AG-09, SA-11). Every immigration value is **Sample** until the immigration expert confirms it. Legal points are **Unconfirmed: no counsel**.
**Words used here.**
* **Master:** one reusable definition in the shared library.
* **Reference data:** a shared list of standard values (countries, provinces).
* **Value code:** the exact code a form or portal expects for a choice. "India" may be a letter code on one form, a number on another and a label on a portal.
* **Key date:** a date that rules depend on, such as a status expiry date.
* **Library level** means defined once for all combinations; **combination level** means set for one application (P-149).
* **Status:** **Exists** = built (table or file cited). **Decided not built** = a decision covers it, nothing is built (decision cited). **Missing** = no decision and nothing built.

## 1. Summary: the 10 gaps most likely to break production (most serious first)
| # | Gap | Status | What fails in production without it |
|---|---|---|---|
| 1 | **Is a form edition still accepted when the filing goes out?** Needs an "accepted until" date per edition, a check at "Ready to file", and a rule for an edition that changes mid-case | Missing. Pins and newer-file flags exist (`FormEdition.newerFileSha256`, `recheckBy`, `PackWorkPin`); no filing-time check | IRCC returns an application filed on a retired edition. The case stays pinned to the old edition with no warning (the team's SA-1-28 asks for that warning) |
| 2 | **Fee table and fee rules**: fees per role and filing mode, family and biometrics caps, right of PR fee, open work permit holder fee, employer compliance and LMIA fees, exemptions, dated "valid from" | Decided not built (B19, SA-1B-52, P-135); no table | A wrong fee gets the application returned unprocessed. Split family filings lose the cap. A fee change on an open case goes unnoticed |
| 3 | **Shared reference lists with value codes per form and channel**: countries, citizenship, languages, provinces, marital status, education, relationship, sex | Exists, partial: a value map per form field (`FormFieldMap.optionMap`, `engine/options.ts`) and code tables in `p5/transforms.ts`; no shared list master | A coded value comes out blank or wrong, so Validate fails, the barcode is wrong, or the agent picks the wrong portal option. One list edit must be repeated on every form |
| 4 | **Document type rules**: expiry and how it is known, what it must outlive, maximum age, translation plus affidavit, certified copy, formats, upload size, photo specification, handling class | Decided not built (SA-1B-18–24, 104, 105; B3, B4; AG-9-64). `DocumentType` holds only name, category, `suppliesFacts`, `readerProfile` | An expiring passport, a stale police certificate or an untranslated document is filed. The portal rejects uploads. Medical files are visible to all staff |
| 5 | **Key-date types and time-critical rules**: status expiry for inside-Canada filings, the ITA's 60 days, the LMIA validity window, the age lock-in date for children, permit end capped at passport expiry | Missing as data (MASTERS §2 lists key-date types as "New"; B11 and B24 cover steps, not these anchors) | An inside-Canada LMIA work permit is filed after status expiry (effect Unconfirmed: no counsel). An ITA is missed. A child's dependency is judged on the wrong date |
| 6 | **Shared conditions, and checks with a value per combination** | Exists, partial: `Predicate` and `Check` are per combination (`combinationId` required; conflict C1 in the concept); rule example cases decided in P-149 (5), not built | "Is married or common-law" drifts between combinations. The expert cannot set "police certificate within N months" once, with a value per combination |
| 7 | **Signature rules per edition × channel × person**: who signs (the person, a parent for a minor, the representative, the sponsor), how, and IMM 5476 per applicant | Decided not built (P-143, P-136, SA-1B-102). `CombinationForm.signedBy` exists; the `FilingChannel` enum still has `SIGNED_PDF_UPLOAD` and lacks Paper and Not needed | Forms are returned unsigned or signed by the wrong person. P-136's "missing signature" blocker has nothing to read |
| 8 | **Portal masters**: screen order for answer sheets, the portal's application type and eligibility answers, our document type → the portal's upload slot, upload limits | Exists, partial: `Combination.portalKey`, `FormEdition.acceptedChannels` (per edition; P-143 asks per account), `FormFieldMap.screenOrder`. Portal capture is parked and "does not return" (WAVE-1 W6) | The P-113 answer sheet has no reliable order. Documents land in the wrong slot, or IRCC's generated checklist differs from ours, and the file is returned incomplete |
| 9 | **Filing unit and package**: the Filing record (P-135), submission grouping, paper package order, application number and UCI per person | Decided not built (P-135, C8.2, SA-1B-64/74); there is no Filing table | A family is split wrongly. A sponsorship goes without its PR application. A paper package is returned for its order or a missing barcode page (P-144) |
| 10 | **Source freshness**: source, date checked and next review on every item; re-fetching guides and checklists; dated program instructions | Decided not built (SA-1B-39, 40; B22). A guide's edition is "the page fetched on a date" (`engine/canada.ts`), with no review date and no re-fetch | IRCC changes a checklist without changing a form, and the library goes stale silently |
Close behind (in §2): field length and continuation sheets (B1); privacy flags on fields (SA-1B-1); the country lists that drive rules (visa required, medical exam, biometrics); eligibility gates and CRS (B16, P-141).

## 2. Step by step: what each step needs
Already built, and listed here only once: the five-level structure; allowed locations; forms with editions, checksum and the canada.ca finder; release, pin, second person and expert sign-off; person roles (Sample); "Who can be in this application"; shared fields, sections and questions with who fills them; document types and requirement lines with "supplies facts"; fact status and confirming by section; field maps; value maps per PDF form field; minimum age and copies on lines; tier 1 validation in the engine (`engine/validate.ts`). The tables below list only what is missing or partly there. Column 3 = who makes it · library or combination · the wave that first needs it.

**2.1 Set up and release**
| Item | Status | Who · level · wave | Failure if absent |
|---|---|---|---|
| Links between combinations: Follows, Supported by, Co-filed with (sponsorship + PR); route steps (EE profile → eAPR, PNP → federal) | Decided not built (C1.3, P-24, SA-1B-54, 66, B10; `linkLabel` is text) | Expert; AI proposes from guides · library · W4 | Nomination is not done before the eAPR; a sponsorship can be filed alone |
| **Country variant of a form** (IMM 5645 or 5707, SA-1B-102) | Missing | AI from the guide → expert · combination line · **W1** (Visitor visa) | The wrong family form is attached for the person's country |
| **Edition attributes**: fill trial passed, barcode form, XFA or AcroForm, accepted until, effective date | Missing as columns (trial results live only in evidence files) | System reads; finder AI proposes dates → person · library · **W1** data, W4 check | Direct fill offered on a failed form (breaks P-65); the P-144 blocker cannot see barcode forms |
| What IRCC accepts per edition × account | Exists, partial (per edition only) | Finder AI → second person (P-140) · library · W1 | The agent picks a channel the portal refuses |
| Startable check: every form's edition is current (SA-1B-90) | Exists, partial (validator C3.8; currency not checked) | System · combination · W1 | Release ships a form whose newer edition is already out |
| "Confirmed by expert" vs Sample on every item; rule example cases re-run on change | Exists, partial (`SourceBasis`); P-149 (5) not built | Expert · library · W2 | Firms cannot tell safe items from Sample; a rule change breaks another combination |

**2.2 Case and people**
| Item | Status | Who · level · wave | Failure if absent |
|---|---|---|---|
| **Missing roles**: parent or guardian signing for a minor, representative, non-accompanying ("declared only", P-135) | Missing rows (`PersonRole`; SA-1B-76) | Team → expert · library · W4 | Nobody signs for a minor; a non-accompanying spouse is over-charged or left off (IRPR 117(9)(d): Unconfirmed: no counsel) |
| **Relationship list with value codes** (IMM 5406, 5645) | Exists, partial (`PartyRelationship.relationshipType` is free text) | Rules from the forms' own choices · library list · W1 | The family form gets a relationship it cannot code |
| **Dependent child definition** as a shared condition on a key date | Missing (the condition language has "age on a date"; no anchor date master) | AI from IRCC's definition → expert · library · W4 | A child is wrongly counted in or out |
| Representative and firm facts for IMM 5476 (licence body, number) | Decided not built (B18, SA-1B-47); "Comes from: Agent" (P-130) | Team (firm setup) · firm data · W4 | IMM 5476 incomplete; an unlicensed type accepted |
| Linked employer case pre-fill (P-106) | Decided not built (C11.5 partial) | — · W4 | Employer facts re-typed and mistyped |

**2.3 PQR and SQR**
| Item | Status | Who · level · wave | Failure if absent |
|---|---|---|---|
| Eligibility gates and scoring grids (CRS); "rules as at" date on each result | Decided not built (B16, P-77, P-141, SA-1B-37, 88) | Expert; AI drafts from guides · library per program · W4 staff page, W5 prospect | Wrong eligibility advice; Provincial nominee Express Entry cannot be scored; old results cannot be reproduced |
| Reference tables: language test → CLB (IELTS, CELPIP, PTE Core, TEF, TCF), NOC 2021 + TEER, proof-of-funds amounts, wage thresholds by province (high- vs low-wage LMIA) | Decided not built (B17, SA-1B-41; the team has six table types in code) | Team (types) → expert (dated rows) · library · W4 | Gates run on invented or stale values |
| Field groups and purposes (current address vs 10-year history) | Decided not built (B1, SA-1B-6, 11) | Team · library · W4 | One address list cannot fill both kinds of box |
| History coverage rules (no gaps in 10 years from age 18) | Decided not built (SA-1B-15) | AI from form instructions → expert · library section · W5 | IMM 5669 or 5406 filed with gaps leads to a return or a fairness letter |
| **Field privacy, immigration-significant, re-confirmation, "always review one by one" (P-142 D5)** | Missing in schema (SA-1B-1 lists them; `CanonicalField` has none) | AI proposes → team sets the classes · library · W4 review, W5 client | Health or criminality answers shown widely; identity fields confirmed in bulk; stale answers reused |
| Translations, time per section | Decided not built (B20, B5) | — · W5 | — |

**2.4 Documents in and read**
| Item | Status | Who · level · wave | Failure if absent |
|---|---|---|---|
| Substitute sets ("any one of", "all of") | Decided not built (B3, SA-1B-19, 20) | AI from checklists · library · **W1** (Documents tab) | Passport-or-travel-document becomes two lines |
| Expiry, must outlive, recency; translation + affidavit; handling class | Decided not built (SA-1B-18–23, 105; AG-9-64) | AI from checklists → expert sets months · library type + combination value · W4 | Gap 4 |
| **Certified copy or notarised; formats; size per upload; photo specification** | Missing | AI from IRCC help pages → expert · library type × portal · W4 | Upload refused; photo refused |
| Country-specific requirements (police certificate by country) | Decided not built (SA-1B-103, B14) | Expert · library per country · W4 | Staff guess per country |
| **Country lists that drive rules**: visa required vs eTA, designated medical-exam countries, biometrics exemptions, dated | Missing | Team or expert from IRCC lists · library reference · W4 (W5 PQR) | A visa is prepared for an eTA person; a medical exam is not flagged; biometrics fees are wrong |
| Cross-source conflict objectives (passport name vs certificate) | Design only (tier 3, P-14; the team's Checker AG-7-61); objectives Missing as data | People write them · library · W4 | Spelling mismatches go unraised |

**2.5 Forms, validation, signatures**
| Item | Status | Who · level · wave | Failure if absent |
|---|---|---|---|
| Named, tested transforms (dates, name, address and phone splits, code only) | Exists in code (`p5/transforms.ts`, `FormFieldMap.transform`); not a library master | Team · library · W4 | "One fact, many formats" handled by unreviewed code (R2) |
| Value map per channel (portal labels vs PDF codes) | Decided, parked (P-62; P-102) | AI from portal help → person · library · W4 | The answer sheet shows a PDF code, not the portal's option |
| **Field length limit and continuation rule** | Decided not built (B1); no length stored | Rules from the PDF (US$0) · library form field · **W1** data, W4 fill | Values cut silently; a 4th sibling dropped from a 3-row table |
| Our Checks ↔ the team's deficiency library (SA-1-74, CRITICAL to INFO) | Both exist on paper (`Check.severity`); **the mapping is Missing** | Lead + team · — · before handover | Blockers differ between the reference and the product |
| Signature value per line; parent for a minor; signature goes stale on a fact change | Decided not built (P-143, P-65, P-136, C9.2) | Finder AI → expert · combination line · **W1** (forms slice 1), W4 | Gap 7 |

**2.6 Fees, package, submission**
| Item | Status | Who · level · wave | Failure if absent |
|---|---|---|---|
| Fee table and fee rules | Decided not built (B19, P-135) | Expert; AI drafts from IRCC's fee list with quote · library + lines · W4 | Gap 2 |
| **Fee receipt as a document line; currency and exchange rate for proof of funds** | Missing (AG-06 bills government fees after submission) | AI from checklist; team (rates) · combination line, library · W4 | Receipt missing from uploads; foreign funds judged on a guessed rate |
| Filing record, grouping, numbers per person | Decided not built (P-135, C8.2) | Team · case · W4 | Gap 9 |
| **Paper package order; portal upload slot per document type; portal application type** | Missing | AI from IRCC help → expert · library (portal) · W4 | Returned incomplete |
| Filed-package archive (exactly what was sent, with checksums) | Exists, partial (`FormInstance.sha256`, `AnswerSnapshot`); no package record | System · case · W4 | Cannot prove what was filed at a refusal or an audit |

**2.7 After filing**
| Item | Status | Who · level · wave | Failure if absent |
|---|---|---|---|
| Government steps with "has a deadline" and usual timeline | Decided not built (B11, SA-1B-45, 96) | Expert · library + lines · W4+ (M4) | Deadlines tracked by hand and missed |
| **Request-for-documents → our document types; "Letter of explanation" line added by a "yes" answer or a history gap** | Missing | AI from letters and guides → expert · combination line · W4 | Requested items re-keyed; explanations IRCC expects not prompted |
| Renewal or extension as a "Follows" combination | Decided not built (C1.3, B10) | Expert · library link · W4+ | The extension case starts empty |
| Team-owned, outside the POC (P-70, P-26): letter library, deadline rule kinds, government domain and holiday lists (SA-1-68–73); expiry watch (SA-1B-104); notification and cover-letter templates (SA-05, AG-10, AG-12); retention (SA-11-33); invoicing (AG-06); e-signature (AG-05); case delivery steps (SA-1B-46) | Team's | Team | — |

## 3. Configuration risks (even when the masters exist)
| # | Risk | Recommended guard |
|---|---|---|
| R1 | An edition changes mid-case (new IMM 5257 while 40 cases are pinned) | Stay pinned (P-32). At "Ready to file", read "accepted until": warn before it, with "Adopt update" (B9); block after it (Q2) |
| R2 | One fact, many formats: date as one field or three, family and given names, native-script name, address split | Named transforms with example values; the validator refuses a transform that does not fit the form field's type |
| R3 | One list, different codes per form and per channel | One library list; a value map per edition and channel; release blocks an unmapped value (SA-1B-5) |
| R4 | A fee or rule changes between assessment and filing | Dated rows; "rules as at" on every result; "Ready to file" re-reads today's fee |
| R5 | Retrofit mismatch: our Checks, roles and channel enum vs the team's | One adapter table per pair, as P-10 does for names |
| R6 | A local rewording changes the meaning | Already guarded (P-149 (4), A5) |
| R7 | A Sample value reaches a real client | Release blocks Sample fees, thresholds and validity months once real cases exist |
| R8 | An AI proposal cannot be explained later | Keep run, model and prompt version per proposal (`DraftingJob.runId` exists; add the prompt version) |

## 4. Recommended new masters and configuration
| # | Add | Owner (first maker → approver) | Level | Wave |
|---|---|---|---|---|
| N1 | Edition attributes: accepted until, effective date, trial result, barcode form, technology | System; finder AI → second person | Library | **W1** data · W4 check |
| N2 | Country variant on a form line | AI → expert | Combination | **W1** |
| N3 | Shared lists (countries, citizenship, languages, provinces, marital status, education, relationship, sex) with value maps per edition and channel | Rules from the forms' choices (US$0) → second person; team seeds codes | Library | **W1** (extends research §5) |
| N4 | Length limit and continuation rule per form field | Rules (US$0) | Library | **W1** · W4 |
| N5 | Signature value per line (P-143 enum); roles: parent for a minor, representative | Finder AI; team (roles) → expert | Combination; library | **W1** · W4 |
| N6 | Shared condition record; checks with a value per combination (C1) | AI → second person; expert sets values | Library + combination value | **W1** |
| N7 | Document type rules (N7a substitutes and translation flag in W1; the rest in W4) | AI from checklists → expert | Library; months per combination | W1 · **W4** |
| N8 | Key-date types and anchors (received, lock-in, status expiry, ITA, LMIA issue, passport expiry) | Team kinds; expert rules | Library | **W4** |
| N9 | Fee table (dated, CAD) and fee rules | Expert | Library + lines | **W4** |
| N10 | Filing record, grouping, paper order, portal upload slots and limits, portal application type | Team; AI from IRCC help → expert | Library (portal) + case | **W4** |
| N11 | Portal screen order for portal-only answer sheets | See Q1 | Library | **W4** |
| N12 | Reference tables (CLB, NOC/TEER, funds, wages) and rule-driving country lists | Team types → expert rows | Library | W4 · W5 |
| N13 | Field privacy, significance, re-confirmation, review-each | AI → team classes | Library | W4 · W5 |
| N14 | Source, date checked, next review; periodic re-fetch with a diff and AI impact (as P-32) | System; AI | Library | W3 |
| N15 | Explanation-letter lines; request-for-documents → document type map | AI → expert | Combination | W4 |
| N16 | Retrofit adapter tables (Checks ↔ deficiency library, roles, enums) | Lead + team | — | Before handover |

## 5. Questions for the founder (one at a time, recommendation first)
1. **Portal-only forms (IMM 0008, 5669, 5406): where does the answer sheet's screen order come from now that capture will not return?**
   *Recommend:* AI drafts the order from the PDF twin's parts and IRCC's public portal help, with the quoted line. The expert checks it once per form in a live session and records a dated "screen order" with a re-check date, so a portal change is handled like a new edition.
   *Else:* follow the PDF order and let the agent find each answer in the portal.
2. **Does a form edition or fee that is no longer current block "Ready to file"?**
   *Recommend:* block only after IRCC's "accepted until" date. Before that date, warn and offer "Adopt update" (B9). This is a fourth narrow blocker beside P-136 and P-144.
   *Else:* warn only.
3. **Do fees join the prototype?**
   *Recommend:* yes, in W4. A dated fee table plus rules that work out the amount, whose filing it is on and who pays (family and biometrics caps included), with Sample values. Payment and invoicing stay the team's (AG-06).
   *Else:* leave fees to the team, and P-135's "fees on whose filing" is never proven end to end.
4. **Do document validity and key dates live in our library as data (W4), with reminders left to the team?**
   *Recommend:* yes (N7, N8). "Ready to file" warns from them, and the team's reminder engine (Minder) reads the same data (SA-1B-24, 104).
   *Else:* wait for the team's AG-11 review. Then M3 cannot test an inside-Canada LMIA work permit against status expiry.
Not settled here: every immigration value (fees, months, ages, thresholds, country lists) is Sample. The legal effect of a late inside-Canada filing, of undeclared family members, and of processing outside Canada is Unconfirmed: no counsel.
