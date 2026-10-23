# Nomenclature normalisation map: Solution 1 one-pager vs the team's own words

Prepared 17 Oct 2026. Read-only check of the page source `ai-workers/tools/s3/s3_data.py` (PG) and `s3_views.py` (PV) against the team's newest requirement documents and code. No project file was edited.

## Path shorthand used in the Evidence column

| Alias | Full path (all under `/Users/ranjansingh/Desktop/Xpatready/`) |
|---|---|
| PG / PV | `ai-workers/tools/s3/s3_data.py` / `ai-workers/tools/s3/s3_views.py` |
| SA-01B | `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.4_2026-10-12.md` |
| SA-01 | `.../super-admin/SA-01-country-and-immigration-pack-management_v2.4_2026-10-12.md` |
| SA-06 / SA-10 | `.../super-admin/SA-06-rbac_v3.6_2026-10-12.md` / `.../super-admin/SA-10-support_v2.7_2026-10-12.md` |
| GL-S | `.../shared/99-Phasing-and-Glossary_v2.20_2026-10-12.md` (shared glossary) |
| GL-A | `.../agent/99-Phasing-and-Glossary_v1.5_2026-10-12.md` (agent glossary) |
| OV-A | `.../agent/00-Overview_v1.13_2026-10-12.md` |
| AG-01 / AG-02 / AG-07 / AG-08 / AG-18 | `.../agent/AG-01-firm-setup-and-onboarding_v1.19_2026-10-13.md` · `AG-02-prospect-lead-sales-crm_v1.10_2026-10-12.md` · `AG-07-case-core-and-delivery_v2.9_2026-10-12.md` · `AG-08-smart-questionnaire_v1.7_2026-10-07.md` · `AG-18-data-import-and-migration_v1.3_2026-10-12.md` |
| Doc-1 / Doc-4 / RFP | `sources/drive-snapshot-2026-10-13-1535/01-techno-functional/03-Doc-1-Platform-Foundation.md` · `06-Doc-4-Client-Portal.md` · `01-RFP-Build-Proposal.md` |
| BE | `code/ERv2-sanitized@b48e4ce-2026-10-15/` (backend, newest capture) |
| FE | `code/ERv2-frontend@85623d4-2026-10-14/` (frontend, newest capture; ERv2-sanitized holds only `apps/api` and `apps/worker`, so UI labels come from here) |
| REG | `ai-workers/terminology-register.md` (project register; lower authority) |
| DEC | `ai-workers/decisions.md` |

---

## The 15 highest-impact changes

1. **"Confirm / confirmed" → "verify / verified"** for the agent's act on a fact (99 uses of "confirmed" on the page, plus 8 stray "verified"). The team's status pair is DECLARED → VERIFIED (Doc-1:1280; BE `packages/contracts/src/schemas/answer-store.ts:15`), and "approving a Reader value is verifying it" with permission `agent/sqr:verify` (OV-A:130). The page currently mixes both words for one status (PG:159, 927, 979).
2. **"Release / released / releaser" → "publish / published / approver (second person)".** The team writes "pack version" 205 times and "published version" 123 times, and "released version" never. The lifecycle is draft → review → approve → publish (GL-S:61; FE `src/locales/en/countryPack.json:262`). The approver is "the second person" (SA-01B:65, 158).
3. **"Released combination package" (PG:94, 777) → "published pack version".** The team versions the whole country pack (and dates each item separately), not one package per combination (GL-S:53; Doc-1 §5.8; SA-01:29). "Imported as one pathway version" (PG:380) has no team basis.
4. **"Pathway Configurator" (PG:223, 285, marked screen_kind "team") → "Content Pack Configurator", with "configurator row" for the row.** "Pathway Configurator" and "Product Studio" are the project Lead's own working names (DEC:243-244, AIW-D200/D201). They appear 0 times in the team's documents and code. The team module is "SA-1B Content Pack Configurator" (SA-01B:13, 150). Marking the screen "team" is wrong.
5. **"Combination row" (PG:222, 308, 1321) → "configurator row"** (GL-S:79; SA-01B:311). The team also has "requirement line" for each entry on the row (GL-S:80).
6. **"Form field mapping" / "mapping set" / "mapping" → "form field map" (one per form edition, made of map entries).** Code and UI say `FormFieldMap` / "Form field maps" (BE `spine-masters.ts:169-175`; FE `countryPack.json:115, 740`). SA-1 and the glossary say "field map" / "Field Mapping" (SA-01B:228-231; GL-S:76). SA-01B also says "box map" (SA-01B:214). The page uses three words for one thing.
7. **"Licensed representative" → "lead representative" (shown as "Lead RCIC" in the product).** The team has no RCIC or representative role (AG-01:78, SA6-D2). The case-team role is `LEAD_RCIC` / "lead representative" (AG-07:226; FE `caseManagement.json:36`). Approval is the `agent/case:form-approve` permission, held by Owner and Case Manager by default (AG-07:463).
8. **"Immigration specialist" → "Immigration SME"** (SA-01B:467; SA-01:394 BR-15). The page already says "the team's documents call this person the SME" (PG:53). Use the team's word and gloss it once as subject-matter expert.
9. **"Form copy" (PG:26, 66 and about 13 more) and "copy owner" (11 uses) → "form" / "form draft" on the case, and "the form's applicant".** The team's per-case record is `FormInstance` (Doc-1:1327; BE `apps/api/prisma/models/client-spine.prisma:655`). Before approval it is a "form draft" (AG-07:463-465, 49 hits). "Copy owner" is invented; the team says "applicant" (AG-07:318) and `subjectKind` (Doc-1:1266).
10. **"Master fields" (PG:13, 501, 527), "master section list" (PG:17, 457, 460), "master library" (PG:1465) and "Configuration library" (PG:85) → "canonical fields", "library sections" ("Question sections" in the product) and "the library" (in the country pack).** The team uses "master" only for master documents and master forms (SA-01B:196, 213). Fields are canonical fields (SA-01B:165; FE `packWorkspace.json` "Canonical fields"). Sections are `LogicalSection`, shown as "Question sections" (FE `packWorkspace.json:64`).
11. **"Support report" / "Support inbox" (PG:52, 246, 1307, 1347) → "support ticket" / "Support queue".** The team writes "ticket" 275 times and "support queue" 7 times in SA-10 (SA-10:19, 33). The firm side is "Get help" and "My tickets" (SA-10:222, 228).
12. **"Snapshot" / "fact snapshot" → "answer snapshot"** (BE `client-spine.prisma:367` `AnswerSnapshot`; Doc-1:3003 says `CaseSqrSnapshot` is now its case specialisation; the original is Doc-1:1290).
13. **"Case wizard" and "Client portal › Documents" are team names but the page marks them "proposed"** (PG:854, 881). The team names: "case wizard" (AG-07:218), CP-4 "Documents" (Doc-4:1115), CP-6 "Signing room" for the page's "Client portal › Sign" (Doc-4:1966).
14. **Severity words need aligning.** The page uses "block / warn / advise" and "red = blocked, never acknowledged". The team uses hard vs advisory rules (SA-01B:243 SA-1-16) and case deficiencies rated Critical / Major / Minor / Info, with states Open / Acknowledged / Waived / Resolved (FE `caseManagement.json:115-125`). The team rule is "a CRITICAL warning is never a lock" (GL-A:81; AG-07:519). This is a naming change **and** a policy conflict to raise with the team.
15. **"Superseded", not "replaced", for history.** Doc-1:1281 says "a new answer **supersedes** the prior one", and the code has `supersededById` and `supersede.service.ts`. The page says "replaced" 12 times and "superseded" 3 times. Separately, **"to review" (17 uses) has no team term.** Keep it, marked as proposed, or use the team's nearest phrase "needs review" (SA-01B:216).

---

## 1. Roles and actors

| Page term | Team term(s) | Evidence (path:line) | Match? | Recommended page term | Note |
|---|---|---|---|---|---|
| Content publisher (PG:32) | Content publisher | SA-01B:158; GL-S:108; SA-06:43 (SA6-D18 display names); BE `packages/contracts/src/schemas/role-template.platform.ts:261` | Yes | Content publisher | High confidence. |
| "the configurator" as a name for that person (PG:52) | "configurator" is the **tool** (Content Pack Configurator), not a person | SA-01B:150 | No | Content publisher | The team never calls a person "the configurator". |
| Second publisher (releaser) (PG:34, 747; PV:25 "Releaser") | "the second person", who "approves and publishes"; "approver" (474 hits) | SA-01B:65 (SA1B-D39), 158; GL-S:108 | No | Second person (approver) | High. The team's approver approves exactly what was submitted and does not edit. The page's "never edits" matches. |
| Platform Owner (PG:34) | Platform Owner (`platform-owner`) | SA-06:43; BE `role-template.platform.ts:29` | Yes | Platform Owner | High. |
| Super Admin role (PG:32-34) | Super Admin console; ExpatReady staff roles (six) | SA-06:43; SA-01B:17 | Yes | Super Admin console · ExpatReady staff role | High. |
| Immigration specialist (PG:33, 53, 714) | Immigration SME | SA-01B:467; SA-01:394 (BR-15) | No | Immigration SME (subject-matter expert) | High. Also correct: the team has no SME **role** among the six staff roles (SA-06:43). The page's "proposed" label for a role is right. |
| AI in the product (PG:35) | AI Doers: Reader (reads documents), Checker (cross-checks), Drafter, Sorter | GL-A:53-57 | Partial | Keep "AI", and name the step with the team's Doer (e.g. "AI (Reader)") | Medium. REG proposes new labels (Document Reader, Form Consistency Checker); the team's own words are Reader and Checker. |
| Platform (code and rules) (PG:36) | Rules Doers: Filler (fills forms), Reviewer (computes what is missing), Minder (dates) | GL-A:70-71, 53 | Partial | Platform (Filler, Reviewer) where a step is one of these | Medium. |
| Prospect, then client (PG:37) | Prospect = Lead = Opportunity (the pursuit); Contact (CRM lens); Client; all on one Party | GL-A:44-45; AG-02:222-224 | Yes | Prospect, then client | High. The team's "prospect" is the pursuit and the person is the Contact/Party; fine at page level. |
| Agent (PG:38, 431) | Agent = umbrella persona for firm staff | OV-A:187; GL-A:34 | Yes | Agent (firm staff) | High. |
| Case Manager / Case Officer (PG:38) | Starter roles Owner, Admin, Case Manager, Case Officer, Billing / Finance, Read-only | AG-01:80 (SA6-D5); BE `role-template.ts:273, 308` | Yes | Case Manager · Case Officer | High. The case-team UI also has "Case officer" and "Reviewer" (FE `caseManagement.json:37-38`). |
| Licensed representative (PG:39, 58, 432) | lead representative (`LEAD_RCIC`, one per case); "Lead RCIC" in the UI; "licensed user" (firm-level); representative types RCIC, Lawyer / notary, Paralegal | AG-07:226 (AG7-D11); FE `caseManagement.json:36`; GL-A:72; SA-01B:285 (SA-1-8) | Partial | Lead representative (Lead RCIC in the product) | High. "Licensed representative" appears only in AG-17 (5 hits). "Lead representative" has about 140 hits and "licensed user" about 400. SA6-D2 (AG-01:78): no RCIC role. Approval comes from `agent/case:form-approve`. |
| RCIC, lawyer or notary, paralegal (PG:39, 58) | RCIC (CICC); Lawyer / notary; Paralegal | SA-01B:285 | Yes | Keep | High. |
| Family members / employer's signatory (PG:37, 59) | person roles: principal applicant, spouse or partner, dependent child, sponsor, co-signer, employer; UI: Principal applicant, Spouse, Dependant, Employee; `SIGNATORY` contact role | SA-01B:334 (SA-1B-72); FE `caseManagement.json:41-44`; AG-02:225 (`ProspectContactRole`) | Yes | Keep; use the team role names in examples | High. |
| Copy owner (PG:166, 409, 420 and 8 more) | applicant (each family member "carries its own applicant, documents, and forms"); `AnswerSubject`, `subjectKind` | AG-07:318; Doc-1:1266, 1284 | No (invented) | the form's applicant | Medium-high. |
| Government (PG:40) | authority; IRCC | SA-01B:323 (SA-1B-64: "one application to one authority") | Yes | Government (the authority) | High. |

## 2. Screens and surfaces

| Page term | Team term(s) | Evidence (path:line) | Match? | Recommended page term | Note |
|---|---|---|---|---|---|
| Pathway Configurator › Row (PG:223, marked "team") | Content Pack Configurator; configurator row; UI nav "Programme content", "Content packs", "Pack workspace" | SA-01B:13, 150, 311; GL-S:79; FE `src/locales/en/admin.json:69`; FE `countryPack.json:261`; FE `packWorkspace.json:3` | No | Content Pack Configurator › Configurator row | High. "Pathway Configurator" comes from DEC:243 (AIW-D200, the Lead's working name). Change screen_kind from "team" to "proposed", or use the team name. |
| Product Studio (not on the page; asked for in the brief) | none; the team's area is the Super Admin console, "Programme content" | DEC:244 (AIW-D201); FE `admin.json:69` | n/a | Do not introduce on this page | The project's area name, not the team's. If used, mark it as an internal project label. |
| Pathway Configurator › Row › Run (PG:285) | no "Run" exists; team tools are validate, diff, dry-run, preview | SA-01:124; SA-01B:317 (SA-1B-61 per-row preview) | No (new) | Configurator row › Draft run (proposed) | The engine run is new; keep it marked proposed. |
| Portal capture (browser extension) (PG:258) | not decided: "IRCC portal autofill or a browser extension … not decided" | AG-18:148, 857; SA-01B:219 (SA-1B-32 "the portal's own order") | No team term | Portal capture (proposed) | Keep "proposed". High. |
| Form edition › Fields (PG:312) | Form editions; parsed field inventory | FE `packWorkspace.json` "Form editions"; Doc-1:1325 | Yes | Form edition › Field inventory | High. |
| Row › Sources / Check report / Test families / Held items (PG:343, 615, 652, 687) | Validation report; Pack validation; sample family / sample client preview; no "held items" | FE `countryPack.json:346` ("Validation report"); GL-S:62; SA-01B:318 (SA-1B-62 "for a sample family"); SA-01B:245 (SA-1-19 "sample client") | Partial | Validation report · Sample families (preview) · Held items (proposed) | "Check report" → "validation report" (high). "Test families" / "made-up families" → "sample families" (medium; the team defers test profiles, SA-01B:44, 237). |
| Review workbench (PG:712, 745, 1306) | "Review before approving — {label}"; diff shown in the approval step | FE `countryPack.json:325`; SA-01:280 | No team term | Review workbench (proposed) | Item-by-item review beside the source is new. Name the team's approval step "Review before approving" where it means that step. |
| Release (screen, PG:778) | "Publish {label}"; approve → publish | FE `countryPack.json:304, 262` | No | Approve and publish | High. |
| Lead form → PQR (PG:389) | lead form (capped lead-flagged fields); PQR; AG-02 calls the firm's capture widget "web form" | SA-01B:345 (SA-1B-80), 348; AG-02:239 | Yes | Lead form → PQR | High. "Lead form" is SA-1B's word; AG-02's "web form" is the embedding widget. |
| Lead › 'Same person?' / Lead › Review (PG:412, 433) | duplicate check offers **Link** (to existing Contact) or **Merge**; Lead / Contact detail view | AG-02:267-271, 286, 851 | Partial | Lead detail view › Duplicate check (Link or Merge) | Medium. |
| Case wizard (PG:854, marked "proposed") | case wizard ("the wizard's 'Pick client' step") | AG-07:218 (AG7-D3) | Yes | Case wizard (team) | High. Change screen_kind to "team". |
| Client portal › Questionnaire (PG:904) | CP-3 Questionnaire (PQR/SQR fill); "fill wizard" | Doc-4:641, 736 | Yes | Keep | High. |
| Client portal › Documents (PG:936, marked "proposed") | CP-4 Documents (upload, checklist, re-upload) | Doc-4:1115 | Yes | Client portal › Documents (team) | High. |
| Client portal › Sign (PG:1196) | CP-6 In-Portal E-Signature; screen "Signing room" | Doc-4:1862, 1966 | Partial | Client portal › Signing room | High. |
| Agent › Working view; staff working view (PG:965, 167 and 13 more) | no single team surface; nearest: case profile with "Verification panel", "needs-evidence worklist", "conflict resolver"; Reader "review view"; case tabs Overview · Binder · Forms · Readiness · Lifecycle | AG-08:290; OV-A:130; FE `caseManagement.json:24-31` | No team term | Case › Profile (verification panel); keep "staff working view" only for the setup-side view definition, marked proposed | Medium. The setup-side "staff working view" (a third view next to PQR and SQR) has no team equivalent. |
| Form check view (PG:996, 1030, 1057) | case "Forms" tab; consultant "reviews every mapped field" before approving | FE `caseManagement.json:26`; AG-07:463 | No team term | Case › Forms › Form review (proposed layout) | Medium. |
| Form check view › Needs attention (PG:1057) | "Needs attention" is already a team card (staff leftovers, AG-01); "Needs you" is the approvals queue; Readiness tab and deficiencies are the readiness list | AG-01:42, 118; GL-A:59; FE `caseManagement.json:27` | Clash | "Fields to check" or the Readiness list | Medium. Avoid reusing a team label that means something else. |
| Form check view › Approve (PG:1166) | form approval (`agent/case:form-approve`); four-eyes; self-approved | AG-07:463; GL-A:62, 68 | Partial | Case › Forms › Approve form | High. |
| Adobe Reader (Validate) (PG:1137) | Validate (a person clicks Validate in Adobe Reader) | SA-01B:218 (SA-1B-31) | Yes | Keep | High. |
| Case › Government messages (PG:1248) | Submission & Decision Tracking; submission record; government steps; government letters; decision record; "Lifecycle" tab | AG-07:517-521; SA-01B:269 (SA-1B-45); FE `caseManagement.json:28` | No | Case › Lifecycle (government steps and letters) | Medium-high. |
| Change watch (scheduled job) › Impact list (PG:1282) | none; nearest: "next review" column and weekly email to the content team; out-of-date edition warning | SA-01B:239 (SA-1B-40); AG-07:469 | No team term | Change watch (proposed) | Keep "proposed". High. |
| Review workbench › Changes · Release (PG:1306) | publish a new pack version; diff ("Compare pack versions") | FE `countryPack.json:127, 304` | No | Review workbench › Changes · Approve and publish | |
| Case › 'What changes for this file' (PG:1326) | "Newer rules available since <date>"; button "Use the newer rules (since <date>)"; reason "Adopting the current rules" | SA-01:89 (SA1-X4), 303 | No | "Use the newer rules": what changes for this case (proposed detail) | High for the button wording. The per-case difference is new. "File" → "case". |
| Support inbox › Report (PG:1347) | Support queue; ticket; firm side "Get help" / "My tickets" | SA-10:19, 33, 222, 228 | No | Support queue › Ticket | High. |
| Government portal (PG:1223) | government portal / authority | SA-01B:219 | Yes | Keep | |
| Firm's existing process (PG:1086) | consistent with "staff complete it by hand" | no direct cite | n/a | Keep | |

## 3. Records and objects

| Page term | Team term(s) | Evidence (path:line) | Match? | Recommended page term | Note |
|---|---|---|---|---|---|
| combination (PG:9, 24, many) | full combination; `combinationNodeKey`; "program-combination" | SA-01B:311 (SA-1B-55); BE `spine-masters.ts:316`; Doc-1:1299 | Yes | combination | High. |
| Pathway › Program › Category › Sub-category (PG:12) | identical four levels | SA-01B:293 (SA-1B-50); GL-S:63-67 | Yes | Keep | High. The UI nav says "Arrange pathways, programs, streams, and categories" (FE `admin.json:118`), but the docs say stream is not a level (GL-S:65). Follow the docs. |
| pathway tree (PG:224, 229, 247) | program hierarchy; program definitions; nodes | FE `src/features/admin/spine-authoring/program-hierarchy-page.tsx`; FE `packWorkspace.json` "Program definitions"; SA-01B:302 (SA-1-12 nodes) | No | programme hierarchy | Medium-high. |
| combination row (PG:222, 308, 1321) | configurator row | GL-S:79; SA-01B:311 | No | configurator row | High. |
| lines (sections, documents, forms) each with who and only-if (PG:94) | requirement line: what → library item → who → only if → order | GL-S:80; SA-01B:313 (SA-1B-57) | Yes | requirement line (who, only if) | High. Use "requirement line" once, then "line". |
| base forms / base documents vs conditional (PG:240-242) | "the row's base items"; `COMBINATION_MANDATORY` vs `ANSWER_CONDITIONAL` | SA-01B:41 (SA1B-D15); BE `spine-masters.ts:30`; Doc-1:1311 | Yes | base · conditional | High. |
| Configuration library (PG:85, PV:77) | the library ("authored once, reused everywhere"); question library; Document Library | SA-01B:161; FE `admin.json:73, 77` | Partial | the library (in the country pack) | Medium-high. |
| master library (PG:1465) | the library | SA-01B:161 | No | the library | High. |
| canonical field (PG:86 and 19 more) | canonical field; canonical field catalogue | SA-01B:165 (SA-1B-1); Doc-1:1256; FE `canonical-field-catalogue-page.tsx` | Yes | canonical field | High. Use it everywhere. |
| master field / "master (canonical) fields" (PG:13, 85, 501, 527) | canonical field ("master" is used only for master documents and master forms) | SA-01B:196, 213 | No | canonical field | High. |
| field group (PG:85, 87, 472) | field group | SA-01B:178 (SA-1B-6); GL-S:81 | Yes | field group | High. Not in code (built on `COMPOSITE`; SA-01B:413). |
| section / master section list (PG:17, 457, 460) | section (library); `LogicalSection`; UI "Question sections"; per-programme "SQR section selections" | SA-01B:188 (SA-1B-13); Doc-1:1296; FE `packWorkspace.json:64` | Partial | library sections ("Question sections" in the product) | High. "Master section list" is not a team phrase. |
| placement (PG:85 and 18 more) | placement | SA-01B:179 (SA-1B-7); GL-S:81 | Yes | placement | High. Not built (the page notes this at PG:156). |
| purpose (PG:87, 132) | purpose (five fixed kinds) | SA-01B:183-184 (SA-1B-11, 12) | Yes | purpose | High. |
| lifecycle tier (lead, prospect or case) (PG:86, 384) | tier flag (lead · prospect · case) | SA-01B:166 (SA-1B-2); GL-S:83 | Partial | tier flag | High. |
| re-confirmation rule (PG:86, 108) | re-confirmation rule (SA-1B-1); `mustReaffirmPerCase`; `freshnessRuleJson` | SA-01B:165; Doc-1:1268-1269; BE `packages/contracts/src/schemas/pack-domain-bodies.ts:122` | Yes | re-confirmation rule | High. "Still true? add anything new" is the page's own prompt wording (proposed). |
| privacy mark; immigration-significant flag (PG:86, 157) | privacy mark; "immigration-significant" flag | SA-01B:63 (SA1B-D37), 165 | Yes | Keep | High. Not in code (PG:157 is correct). |
| form edition (PG:14 and 50 more) | form edition (`FormEdition`) | GL-S:75; Doc-1:1325; FE `countryPack.json:114` | Yes | form edition | High. |
| master form / form library (PG:238) | master form; Form Library (edition-aware) | SA-01B:213 (SA-1B-26); AG-07:458 | Yes | form library | High. |
| field inventory (PG:88) | parsed field inventory (`parsedFieldInventory`) | Doc-1:1325; BE `spine-masters.ts:45` | Yes | field inventory | High. |
| form field mapping (PG:13, 18, 396) | form field map (`FormFieldMap`, UI "Form field maps"); field map (SA-1); Field Mapping (glossary); box map (SA-1B) | BE `spine-masters.ts:169-206`; FE `countryPack.json:115, 740`; SA-01B:228-231 (SA-1-29..32), 214 (SA-1B-27); GL-S:76 | Partial | form field map | The docs disagree (SA-01B "box map" vs SA-1 and glossary "field map"); the code and UI say "form field map". Recommend the code/UI term: it is what the team sees on screen, and it covers SA-1's wording. Mention "box map" once as SA-1B's synonym. |
| mapping set (PG:88, 399, 412) | one form field map per form edition | Doc-1:1326 | No | form field map | High. |
| mapping entry (PG:152) | map entry (`FormFieldMapEntry`: canonicalFieldKey, formFieldId, transform) | BE `spine-masters.ts:169-185` | Yes | map entry | High. |
| box map (PG:166, 419 in traces) | box map (SA-1B) | SA-01B:214 | Yes, in traces only | Leave in traces quoting SA-1B; use "form field map" in body text | |
| answer list (PG:85) / value-list entry (PG:89, 410, 415) | answer list (SA-1B-4, 5; UI nav "Questions, answer lists, and grouping sections"); code `EnumSet`, UI "Enum sets" with hint "value lists" | SA-01B:168-169; FE `admin.json:74`; FE `countryPack.json:408` | Partial | answer list | High. Pick one word; "answer list" is the requirement word and the UI nav word. |
| document type (PG:85, 432) | document type (`DocumentType`) / master document | SA-01B:196 (SA-1B-18); Doc-1:1307 | Yes | document type | High. |
| document list / document lines (PG:363, 429, 436) | document requirement (`DocumentRequirement`; UI "Document requirements"); document line (a requirement line of kind document); document checklist | Doc-1:1308; FE `packWorkspace.json:67`; SA-01B:313 | Partial | document requirement lines (setup); document checklist (case) | Medium-high. |
| checklist line (PG:111, 193, 881) | checklist item; "one live checklist per person"; Binder requirements | SA-01B:41 (SA1B-D15), 207; AG-07:433; FE `caseManagement.json:25` | No | checklist item (in the case's Binder) | High. "Checklist item" has 20 team files; "checklist line" has 0. |
| conditional rules (PG:13, 485) | conditions (SA-1B-36); `ConditionalRule`; "only if"; condition language; UI "Rules", "Predicates" | SA-01B:235, 243; Doc-1:1298; FE `admin.json` spineRules | Yes | conditional rules (written in the condition language) | High. |
| eligibility gates (PG:53, 514) | eligibility gates (SA-1B-37); `EligibilityRuleSet`, UI "Eligibility rule sets"; scoring grids | SA-01B:236; FE `packWorkspace.json` "Eligibility rule sets" | Yes | eligibility gates | High. |
| PQR (PG:429) | PQR. Expansions vary: "prospect qualification questionnaire" (RFP), "Pre-Qualification intake" (Doc-1), "pre-qualification review" (SA-01), "Program Question Requirement" (code comment) | RFP:116; Doc-1:1288; SA-01:243; BE `spine-masters.ts:221` | Yes (term); expansion contested | PQR, glossed as "pre-qualification questionnaire" | The page's gloss matches RFP:116. The team's own expansions disagree; the code comment is an outlier. Flag to the team. |
| SQR (PG:430) | SQR = Smart Questionnaire | AG-08:14; OV-A:89; GL-A:47; RFP:145 | Yes | SQR (smart questionnaire) | High. |
| PQR blocks; block 0 (PG:389) | block 0; qualifier block | SA-01B:342 (SA-1B-77) | Yes | Keep | High. |
| question sets (PG:13) | questionnaire; question library; SQR section selections | FE `admin.json:73`; FE `countryPack.json:111` | Partial | questionnaires | Low impact. |
| Document evidence (PG:111) | `Document` instance; Binder | Doc-1:1314; AG-07:433 | Partial | Documents (the case's Binder) | Medium. |
| Facts per person or organisation (PG:95) / shared record | Party (identity root); answer store (`ClientCanonicalAnswer`); "shared facts"; verified profile / immigration profile | Doc-1:1239, 1275-1282; BE `client-spine.prisma:20, 245`; AG-08:296; AG-07:467 | Partial | Facts per person or organisation (the answer store, on the person's Party) | Medium. "Fact" is a team word (AG-08:282 "profile fact"; Doc-1 §5.4 "one person's facts"). Add the team names once. |
| case-only facts (PG:98, 203) | case-level facts (`scope = CASE_LEVEL`); `CaseAnswerOverride` | Doc-1:1265, 1290; BE `apps/api/prisma/models/country-pack-core.prisma:23-25` | Partial | case-level facts | High. Person-wide facts are `CLIENT_LEVEL`. |
| household facts (PG:99, 919) | family unit; shared facts ("same as the principal applicant") | AG-08:296; SA-01B:182 (SA-1B-10) | Partial | shared family facts | Medium. "Household" has 1 team hit; "family unit" has 23. |
| snapshot / fact snapshot (PG:132, 297, 891) | `AnswerSnapshot` (case-scoped = `CaseSqrSnapshot`) | BE `client-spine.prisma:367`; Doc-1:1290, 2998-3003 | Partial | answer snapshot | High. |
| pinned version (PG:123, 855) | pinning; `PackWorkPin`; pinned to the pack version | GL-S:55; SA-01:29; BE `client-spine.prisma:462` | Yes | pinned pack version | High. |
| version / release (PG:91, 132) | pack version (per-item version and effective date) | GL-S:53, 60; Doc-1 §5.8 | Partial | pack version | High. |
| Released combination package (PG:94, 777) | published pack version | GL-S:61; FE `countryPack.json:172` "Version history" | No | published pack version | High. |
| filing (PG:476 and many) | filing | SA-01B:323 (SA-1B-64); GL-S:77 | Yes | filing | High. |
| case (many) | case (one engagement holding filings) | SA-01B:324 (SA-1B-65); AG-07:317 | Yes | case | High. AG-07:318 still describes "primary case + child cases" for families; SA-1B-74 says "a family is one case". The page follows SA-1B. Note this internal team conflict. |
| form copy (PG:26, 66, 967 and more) | form instance (`FormInstance`); form draft (before approval); the case's form set | Doc-1:1327; BE `client-spine.prisma:655`; AG-07:381, 463-465 | No (invented) | form (form draft until approved) | Medium-high. "Copy" reads as a duplicate file to the team. |
| filled PDF / rendered copy (PG:113) | generated form; flattened (locked) version; submission artefact | AG-07:461; FE `caseManagement.json:104` ("Generated") | Partial | generated form; flattened form after approval | Medium. |
| form field status: filled, needs a fact, blocked by conflict, staff enters, not yet supported, pending review (PG:1013) | box status: filled, needs review, unmapped; UI form status: Not started, In progress, Ready, Generated, Signed, Filed | SA-01B:216 (SA-1B-29); FE `caseManagement.json:101-106` | Partial | Keep the page's list, marked as a proposed extension of SA-1B-29 | "Not yet supported" ≈ team "unmapped". |
| type-by-hand list; known-issues list (PG:1077, 1138) | none | none | No team term | Keep, marked proposed | |
| agent request (PG:494, 497, 502) | "Request a document" (per case); tasks (AG-13); ADR response | GL-S:133; AG-07:521 | No team term (0 hits) | task (or "Request a document" when it is a document) | Medium. |
| Review and approval records (PG:112) | approvals; audit log; self-approved record | GL-A:68, 84 | Partial | Keep | Low impact. |
| Prepared and submitted outputs; submission receipts (PG:113) | submission record; decision record | AG-07:519 | Partial | submission record · decision record | Medium. |
| government message (PG:57, 113, 1233) | government letter (read by the Reader); government step (acknowledgement, biometrics, fairness letter, decision…) | GL-A:54; SA-01B:269 (SA-1B-45) | No | government letter (the item); government step (the milestone) | High. "Government message" has 0 team hits. |
| support report (PG:52, 246, 1307) | support ticket | SA-10:19, 222 | No | support ticket | High. |
| lead (PG:198, 391) | Lead (Prospect / Opportunity) | AG-02:224 | Yes | lead | High. |
| client record (PG:200) | Client; Contact at `lifecycleStage = CLIENT`; Party | AG-07:316; AG-02:223 | Yes | client record | High. |
| retainer | retainer (engagement agreement); an unsigned retainer is a CRITICAL warning at submission | GL-A:49; AG-07:519 (AG17-D62) | Not on page | Consider adding to 9.5 preconditions | The page never mentions the retainer, though the team checks it at submission. |
| check kinds: write and read-back, field and consistency, meaning check (PG:139-141) | Checker (AI cross-check of names, dates of birth, document numbers); hard / advisory rules; deficiency | GL-A:57; SA-01B:243 | Partial | Keep the three kinds; name the AI one "Checker (meaning check)" | The page's meaning check (right person in the field) extends the team's Checker. |

## 4. Process and status words

| Page term | Team term(s) | Evidence (path:line) | Match? | Recommended page term | Note |
|---|---|---|---|---|---|
| declared (PG:95, 104) | DECLARED; self-declared | Doc-1:1280; BE `answer-store.ts:15`; AG-08:282 | Yes | declared | High. |
| proposed (from a document) (PG:95) | proposed by the Reader; status "unverified" ("unverified — verify to use") | GL-A:54; AG-07:467 | Partial | proposed (unverified) | High. |
| confirm / confirmed (PG:21, 56, 95 and about 96 more) | verify / VERIFIED; `agent/sqr:verify`; "Only verified values feed the Filler" | OV-A:130; Doc-1:1280-1282 (`verifiedBy`); AG-07:467 | No | verify / verified | High. Top change. The page also uses "confirmed" for SME sign-off of rules (5.2); keep "confirm" there. The team's SME "signs off" (SA-01:394). |
| verified (PG:159, 927, 979) | VERIFIED | as above | Yes, but inconsistent | verified (everywhere for facts) | Unify with the row above. |
| superseded / replaced / history (PG:100, 102, 105) | supersede; `supersededById`; `supersede.service.ts` | Doc-1:1281; BE `apps/api/src/spine/supersede.service.ts` | Partial | superseded (kept as history) | High. |
| conflict (PG:106 and more) | conflicting; conflict resolver | AG-08:285, 290 | Yes | conflict | High. |
| 'to review' (PG:104, 187, 378) | none; nearest "needs review" (box status) | SA-01B:216 | No team term | needs review (proposed) | Medium. |
| 'still true?' (PG:108) | re-confirm (`mustReaffirmPerCase`); `FreshnessRule` | Doc-1:1268-1269 | Concept matches; label is new | Keep the prompt; call the rule "re-confirmation rule" | |
| duplicate check (PG:198, 411) | duplicate check; De-duplication & Merge; outcomes Link / Merge; "create anyway" recorded | AG-02:267-271, 851; AG-07 AG-7-73 (cited at PG:490) | Yes | duplicate check | High. |
| 'same person' (PG:380, 811) | Link (to existing Contact) / Merge (same person captured twice) | AG-02:269-271 | Partial | Link to the existing client (same person) | Medium. |
| convert (PG:454) | Convert Prospect → Client | AG-02:438 | Yes | Keep | High. |
| adopt / adoption (PG:57, 132, 134) | adoption ("Use the newer rules", reason "Adopting the current rules"); `agent/pack:adopt`; `pack-pin-adoption.service.ts` | SA-01:288, 303, 515; GL-S:55; BE `apps/api/src/spine/pack-pin-adoption.service.ts` | Yes | adopt | High. |
| what changes for this file (PG:134, 1326) | "Newer rules available since <date>"; diff | SA-01:89, 280 | No team term | what changes for this case (proposed) | Medium. |
| release / released / releaser (PG:91, 778 and about 70 more) | publish / published; approve; second person | GL-S:61; FE `countryPack.json:262`; SA-01B:158 | No | publish · published · approver | High. |
| initial validation (PG:19) | Pack Validation means automated checks before publish, a different meaning | GL-S:62 | Clash | initial review (or "first-run review") | Medium. The team's "validation" is code checks; the page uses it for human review. The page also uses "Validate" for the Adobe button. Three meanings of one word. |
| Validate (Adobe) (PG:154, 1119) | Validate | SA-01B:218 | Yes | Validate | High. |
| read-back (PG:113 and 22 more) | none (0 hits) | none | No team term | read-back (proposed) | Keep, marked proposed. |
| barcode form / XFA (PG:154, 326, 334) | IRCC's barcode forms; 2D-barcode forms are XFA; dynamic forms | SA-01B:218, 411 | Yes | barcode (XFA) form | High. |
| portal extension (PG:158, 258) | not decided | AG-18:148, 857 | No team term | browser extension (proposed) | High. |
| fingerprint (PG:226 and more) | content hash; fingerprint (22 hits) | BE `client-spine.prisma` (`contentHash`) | Yes | fingerprint | Fine. |
| difference report (PG:768) | diff; "Compare pack versions" | SA-01:280; FE `countryPack.json:127` | No | diff (version comparison) | High. |
| block / warn / advise (PG:177, 187) | hard / advisory rules; deficiency severity Critical / Major / Minor / Info; states Open / Acknowledged / Waived / Resolved; "a CRITICAL warning is never a lock" | SA-01B:243; FE `caseManagement.json:115-125`; GL-A:48, 81; AG-07:519 | No | Align the words with the team's severities | High. **Policy conflict:** the page's "blocked … never acknowledged" contradicts the team's waive-with-reason rule. SA-1B-15 (coverage gaps block submission) and SA-1B-23 (expiry warns only) agree with the page. Raise with the team. |
| readiness (implied in "ready" fields) | Readiness tab; readiness gate; filing-readiness; "Reviewer green" | FE `caseManagement.json:27`; AG-07:485, 519 | Not used | readiness | Medium. |
| approve the copy (PG:1165) | form approval; four-eyes; self-approved | AG-07:463; GL-A:62, 68 | Partial | approve the form | High. The page's one-approval rule does not mention four-eyes (preparer cannot approve when Team safeguards is on). |
| sign and declare (PG:1195) | e-sign; signing room; countersign (retainer) | Doc-4:1966 | Yes | Keep | |
| submit and pay (PG:1222) | submission record; "RCIC submits" | AG-07:519 | Yes | Keep | |
| Run the engine (PG:284) | "engine" is used for the resolver and "one generic engine" | SA-01B:150; SA-01B:247 (SA-1-21) | Partial | Keep, or "start the draft run" | REG advises against "AI engine"; the page avoids "AI engine". Low impact. |
| near-duplicate / 'decide' (PG:378) | none | none | No team term | Keep, marked proposed | |
| collected from (PG:155 and 19 more) | none; nearest: provenance `sourceJson` (capture surface) | Doc-1:1282 | No team term | Keep, marked proposed (as the page does via TEAM_CHANGES) | |

---

## 5. Page terms that look invented or odd to a reader of the team's documents

- **Pathway Configurator, Product Studio**: the project's own names (DEC:243-244). The team says Content Pack Configurator. Worst case: PG:223 labels it a "team" screen.
- **combination row, master field, master section list, master library, Configuration library**: none appear in the team's documents. The team says configurator row, canonical field, library section, the library.
- **form copy, copy owner**: invented. The team says form, form draft, form instance, applicant.
- **released combination package, release, releaser, pathway version (PG:380)**: the team never writes "released version". It publishes pack versions.
- **mapping set, value-list entry, checklist line, document list, check report, difference report, test families, held items**: drift from the team's form field map, answer list, checklist item, document requirement, validation report, diff, sample family.
- **support report, support inbox, government message, agent request**: the team has support ticket, support queue, government letter or step, task or "Request a document".
- **staff working view, form check view, review workbench, change watch, read-back, 'to review', 'still true?', 'collected from', type-by-hand list, known-issues list, portal capture**: genuinely new concepts. Keep them, but mark each one proposed consistently. Today PV and PG mark some screens "proposed" and leave their words unmarked in body text.
- **'Needs attention' list**: clashes with the team's existing "Needs attention" card (AG-01:42) and the "Needs you" queue (GL-A:59).
- **"initial validation"**: clashes with the team's "Pack Validation" (automated checks, GL-S:62) and with Adobe "Validate".

## 6. Team terms the page should use but does not

| Team term | What it is | Evidence |
|---|---|---|
| Content Pack Configurator; configurator row; requirement line | the setup tool, its row and the row's entries | SA-01B:13, 311, 313; GL-S:79-80 |
| publish / published pack version; approver; draft → review → approve → publish | release vocabulary | GL-S:61; FE `countryPack.json:262` |
| verify / verified / unverified; Verification panel; needs-evidence worklist | fact status vocabulary and staff screens | OV-A:130; AG-08:282-290 |
| Reader, Checker, Filler, Reviewer (Doers) | named AI and rules functions | GL-A:53-57, 70-71 |
| form draft; form approval (`agent/case:form-approve`); four-eyes; self-approved | form approval vocabulary | AG-07:463-465; GL-A:62, 68 |
| lead representative (Lead RCIC); licensed user | the accountable licensed person | AG-07:226; FE `caseManagement.json:36`; GL-A:72 |
| Binder; Forms tab; Readiness tab; Lifecycle tab | case screen names | FE `caseManagement.json:24-31`; AG-07:433 |
| deficiency; CRITICAL / MAJOR / MINOR; waive (`agent/case:waive-deficiency`) | case warning vocabulary | GL-A:48, 81; FE `caseManagement.json:115-125` |
| case wizard; Signing room; CP-4 Documents | screen names | AG-07:218; Doc-4:1966, 1115 |
| Party; Contact; answer store; CLIENT_LEVEL / CASE_LEVEL; answer snapshot | identity and fact storage | Doc-1:1239, 1265, 1275; BE `client-spine.prisma:20, 367` |
| support ticket; support queue; Get help | support channel | SA-10:19, 222, 228 |
| government step; government letter; submission record; decision record | post-submission vocabulary | SA-01B:269; GL-A:54; AG-07:519 |
| "Use the newer rules (since <date>)"; "Adopting the current rules" | adoption wording | SA-01:303 |
| sample family (preview) | team's preview unit | SA-01B:318 (SA-1B-62) |
| programme hierarchy; nodes | pathway tree | FE `program-hierarchy-page.tsx`; SA-01B:302 |
| retainer | checked at submission | AG-07:519 |
| Immigration SME | the content-value owner | SA-01B:467; SA-01:394 |

## 7. Where the team's documents and code disagree (and the recommendation)

| Topic | Documents say | Code / UI says | Recommend | Reason |
|---|---|---|---|---|
| Form-to-field binding | "box map" (SA-01B:214); "field map" (SA-01B:228-231); "Field Mapping" (GL-S:76); "field-mapping" (AG-07:460) | `FormFieldMap`, "Form field maps" (BE `spine-masters.ts:169`; FE `countryPack.json:740`) | form field map | The built UI word, close to SA-1 and the glossary. "Box map" is one module's synonym. |
| Answer options | "answer list" (SA-01B:168) | `EnumSet`, "Enum sets", hint "value lists" (FE `countryPack.json:408`); UI nav "answer lists" (FE `admin.json:74`) | answer list | Requirement word plus the UI nav word. "Enum set" is jargon. |
| Answer statuses | `FINAL | DECLARED | VERIFIED` (Doc-1:1280) | `DECLARED | VERIFIED` (BE `answer-store.ts:15`) | declared · verified | The code dropped FINAL. Both agree on the two the page needs. |
| Snapshot | `CaseSqrSnapshot` (Doc-1:1290) | `AnswerSnapshot` (BE `client-spine.prisma:367`); Doc-1 A4 amendment (Doc-1:2998-3003) | answer snapshot | The newer amendment matches the code. |
| Sections | "section" (SA-01B:188) | `LogicalSection`; UI "Question sections" (FE `packWorkspace.json:64`) | section (Question sections in the product) | Both are fine; avoid "master section list". |
| PQR expansion | "prospect qualification questionnaire" (RFP:116); "Pre-Qualification intake" (Doc-1:1288); "pre-qualification review" (SA-01:243) | "Program Question Requirement" (BE `spine-masters.ts:221`, a comment) | pre-qualification questionnaire | Majority of document uses; the code comment is an outlier. Flag it to the team. |
| Hierarchy levels | four levels; stream is not a level (GL-S:65) | nav "pathways, programs, streams, and categories" (FE `admin.json:118`) | the four levels | SA1B-D2 is a decision; the UI string is stale. |
| Family case | "a family is one case" (SA-01B:336) | AG-07:318 still says "primary case has child cases"; code has no Case table yet | one case with filings (as the page does) | SA-1B is the newer, decided model. Note the AG-07 lag. |
| Case-team representative | "lead representative" (AG-07:226) | UI "Lead RCIC" (FE `caseManagement.json:36`); role key `LEAD_RCIC` | lead representative (shown as Lead RCIC) | The docs avoid "RCIC role" (SA6-D2); the UI label is what staff see. |
| Platform staff roles | six display names (SA-06:43) | six keys (BE `role-template.platform.ts:29-305`) | display names | Consistent. |

## 8. Lower-authority register (REG) vs the team

- REG §2 introduces "Product Studio", "Configuration Assistant" and "Pathway Configurator". None are team words; the team's equivalent is the Super Admin console / Content Pack Configurator.
- REG §3-4 proposes new AI labels (Document Reader, Form Consistency Checker, PDF Form Filler). The team's own labels are Reader, Checker and Filler (GL-A:54, 57, 70). For a page meant to read as the team's document, use the team labels and leave REG's labels as aliases.
- REG says "'Verify' is reserved for a defined completed check, not an AI confidence score." That agrees with using "verify" for the agent's act, which is a defined check against a source (OV-A:130).

## 9. What I could not verify

- Doc-2 (5,644 lines) and Doc-3 (8,497 lines) were searched only by keyword, not read. AG-09, AG-15 and AG-17 were not read in full. Program Charter V2 (.pptx) was not opened.
- Frontend UI labels come from `ERv2-frontend@85623d4-2026-10-14`. The brief pointed to frontend folders inside `ERv2-sanitized@b48e4ce`, but that capture holds only `apps/api` and `apps/worker`.
- I did not check that the BE line numbers the page itself cites (BUILD_GAPS, PG:151-160) still hold. Only `spine-masters.ts:169-175` was re-read and confirmed.
- I did not check whether "Pathway Configurator" appears in any team Drive file outside the 13 Oct snapshot.
- Per-term counts are case-insensitive keyword counts. "release" in particular includes "Release 1"; the claim that the team never writes "released version" rests on a targeted pattern search (`released (pack|version|content|configuration)`, 0 hits).
