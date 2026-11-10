# Study permit (outside Canada) — content for the expert to confirm

**Status: Sample. Unconfirmed: expert. Legal points: Unconfirmed: no counsel.** How to mark each row: `README.md` in this folder.

This is the content the Bake's Study permit row (BK-13, P-449) will enter **as data**, so that a pathway reaches filled, checked forms with data and release changes only. P-449 asks that the rows already seeded for `sp.outside` be **checked, not assumed**; §1 does that, and each later section says what is seeded today and what is missing.

**What was read (no live re-read: canada.ca was not reachable from the cloud session on 10 Nov 2026):**
* **[G5269]** Guide 5269, Applying for a study permit outside Canada: canada.ca `…/application-forms-guides/guide-5269-applying-study-permit-outside-canada.html`, page date **2026-10-06**, saved 27 Oct 2026 (`official-sources/ircc/instructions/guide-5269.html`).
* **[C5483]** IMM 5483 (08-2025) E, Document checklist for a study permit, PDF modified 2025-08-11, checked 21 Oct 2026 (`official-sources/ircc/checklists/imm5483e.pdf`, sha256 `6f885da2…`).
* **[HOW]** canada.ca "Study permit: How to apply" (`…/study-canada/study-permit/apply.html`), page date 2026-09-02, saved 27 Oct 2026 (`official-sources/ircc/canada/pages/study-canada-study-permit-apply.html`).
* **[FEES]** the app's fee table `prototype/studio/samples/fee-table.json` (IRCC fee list, page date 2026-09-21, read 2–3 Nov 2026).
* The app's seeded rows: the Study permit release snapshot from the same isolated copy as the answer key (`main` `8fc65d0b9`, configured checkpoint), and `prototype/studio/api/src/form-setup.ts` (`SP_FORM_RULES`, `SP_DOCUMENT_LINES`, `MINOR_FACT`).

## 1. What the app holds for `sp.outside` today (checked on 10 Nov 2026)

| Item | Seeded today | Finding |
|---|---|---|
| People | Student (exactly 1) and Representative | **No spouse or children.** [G5269]: "Family members must complete their own application forms. However, you may submit your applications together online or at a Visa Application Centre (VAC) and use one payment receipt for the total amount." and "You must apply for their study permit at the same time as your own." The combination can only hold a student alone. |
| Fee lines | **none** (`combinations["sp.outside"].lines: []`) | The `study_permit` line (CAD 150 per person) is in the table but not attached; no biometrics line either. The note on the row says so: "No fee lines: its fees are not worked out from this table yet". So nothing about money is seeded to check; §2 proposes the lines. |
| Document lines | 3: fee payment receipt (principal), passport information page (each applicant), letter of acceptance (principal), each quoted from [C5483] | Correct as far as they go (quotes match [C5483] items 1, 2 and 4). Seven checklist items are missing: §3. |
| Form lines | IMM 1294 (each applicant, always); IMM 5707 (each applicant 18 or older, always); IMM 5409, IMM 5475, IMM 5476, IMM 5646 (conditional) | §4: the family form and the minimum age need the expert. |
| Field maps | IMM 1294 (06-2026) **245 entries, all DRAFT**; IMM 5646 (01-2023) **136 entries, all DRAFT**; IMM 5707, IMM 5409, IMM 5475 published; IMM 5476 on the **superseded 11-2021 edition** | §5: the two forms only Study permit uses have unreviewed AI-proposed maps and no fill trial. |
| Answer-key family | none (`samples/answer-key-families.json` holds only the Visitor visa household) | §5: one is needed before the release gate (C5.5) lets the maps out of the demo. |

## 2. Fees

| # | Line (proposed data) | Amount | Basis | Official words | Mark |
|---|---|---|---|---|---|
| F1 | Study permit (including extensions) | CAD 150 | each person applying for a study permit (per person by role: student; and a child applying for their own study permit) | [G5269] Step 3, "Your fees": "Application (per person) … Study permit (including extensions) 150"; [FEES] `study_permit`: "Study permit (including extensions) – per person 150.00" (IRCC fee list, read 3 Nov 2026) | ☐ |
| F2 | Biometrics | CAD 85 per person; CAD 170 for a family of 2 or more applying at the same time and place | each person who must give biometrics; none under 14 or over 79; none who gave biometrics in the past 10 years ([G5269]: "You only need to give your biometrics once every 10 years when you apply for a visa or permit.") | [G5269] Step 3 lists "Biometrics (per person)" and "Maximum fee for a family of 2 or more people applying at the same time and place", but **the amounts did not load in our copy** ("[Error loading fee. Check the fee list.]"); the amounts come from [FEES] `biometrics` (IRCC fee list, read 2 Nov 2026; **its quote is a summary of the Lead-checked record, not IRCC's words**: re-read the fee list on the Mac), the exemptions from canada.ca "When to give biometrics: temporary residents" ("a child under the age of 14; an applicant over the age of 79", page date 2026-03-30) | ☐ |
| F3 | No visitor visa fee for the student | CAD 0 | the visa or eTA is issued with the study permit | [G5269]: "If you need a TRV or an eTA, you do not have to complete a separate application or pay additional fees." | ☐ |
| F4 | Spouse's open work permit (fees CAD 155 + CAD 100) | not on this combination | a separate application | [G5269]: spouses of full-time post-secondary students "may apply for an open work permit. However, they must complete their own work permit application"; [FEES] `work_permit` 155, `open_work_permit_holder` 100 | ☐ |

Worked example for the expert to confirm (the lead's arithmetic from F1–F2, not app output): a student of 20 applying alone, with no biometrics given in the past 10 years, pays CAD 150 + CAD 85 = **CAD 235** (CAD 150 if their biometrics are still valid). Fees "are subject to change at any time" ([G5269]); re-read the fee list on the Mac before release.

## 3. Documents, with their conditions

Who: "principal" = the student. Condition = the rule the data would carry (Sample wording until confirmed).

| # | Document | Whose | When (condition) | Official words | In the app today | Mark |
|---|---|---|---|---|---|---|
| D1 | Proof of fee payment | student (one per application) | always | [C5483] p. 1 item 1: "Proof of payment showing the amount paid. … If you or your family members need to give biometric information, the biometric fee should be paid at the same time and in the same way as the processing fee." | yes | ☐ |
| D2 | Passport information page copy | each applicant | always | [C5483] p. 1 item 2: "A Photocopy of the information page of your valid passport or travel document which includes: The passport number, The issuance and expiry dates, Your photo, name, date and place of birth." | yes | ☐ |
| D3 | Two photos | each applicant | only when biometrics are **not** required (so also when the person's biometrics from the past 10 years are still valid: expert to confirm) | [C5483] p. 2 item 3: "If you are required to provide biometric fingerprints and photo, you are not required to include paper photos with your application." | no | ☐ |
| D4 | Letter of acceptance | student | always | [C5483] p. 2 item 4: "Letter of acceptance from where you intend to study (including, but not limited to, Designated Learning Institutions). Note: Must be issued by the Canadian institution … show the exact amount of tuition fees you are required to pay, the anticipated starting and finishing dates, and the date by which you need to register." | yes | ☐ |
| D5 | Provincial or territorial attestation letter (PAL/TAL) | student | always, unless an exception applies; not separately when studying in Quebec (the CAQ serves) | [C5483] p. 2 item 5: "Unless you meet one of the exceptions, you must submit a PAL/TAL. A study permit application that does not include a PAL/TAL, or provide proof of meeting an exception outlined in the Ministerial Instructions, will not be accepted for processing."; [G5269]: "If you intend to study in Quebec, the Quebec Acceptance Certificate (CAQ) serves as the PAL/TAL." | no | ☐ |
| D6 | Quebec Acceptance Certificate (CAQ), attestation of issuance | student | when studying in Quebec | [C5483] p. 2 item 6: "If you plan on studying in the province of Québec, provide the attestation of issuance of your "Québec Acceptance Certificate" (CAQ)"; [G5269]: "submit the updated CAQ in both the Provincial/Territorial Attestation Letter and CAQ sections." | no | ☐ |
| D7 | Proof of financial support | student (and for accompanying family) | always; first year of studies, or the whole stay if under a year | [C5483] p. 2 item 7: "Please refer to the IRCC website for the current financial requirements. These are adjusted each year."; [G5269]: "If the duration of your studies in Canada will be more than a year, proof of financial support for the first year of your studies in Canada." **The amount is not in our saved copies: Sample, to be read on the Mac** (never guessed). | no | ☐ |
| D8 | Medical exam | each applicant | when staying over 6 months, or recent time in listed countries, or certain jobs | [C5483] p. 2 item 8: "You may need a medical exam if any of these situations apply to you: You plan to stay in Canada for more than 6 months. You recently spent time in certain countries. You plan to work in certain jobs where public health must be protected." | no | ☐ |
| D9 | Marriage certificate copy | student | when married | [C5483] p. 2 item 9: "Photocopy of your Marriage license/Certificate, if applicable. Note: Refer to the responsible visa office for your region." | no | ☐ |
| D10 | Letter of permission from the parents; custodian's contact details; custody order and the other parent's consent if any | student | when a minor **travels alone**; a minor travelling with one parent brings the other parent's signed consent | [G5269], "What about minors travelling alone?": "Minor children who are traveling alone must provide: the contact information (name, address and phone number) of the custodian, if applicable … a letter of permission from one or both parents and, if applicable, a notarized custodianship declaration. If the child is the subject of a custody order, proof of custody and the other parent's consent must be provided."; and "Custodianship is not mandatory for minors travelling with one parent or an authorized guardian. However, a signed consent documents from the non-accompanying parent should be provided." | no | ☐ |
| D11 | Police certificate | student | **only on request** (not a checklist line) | [G5269]: "are law-abiding and have no record of criminal activity (you may be asked to provide a Police Clearance Certificate)" | no (correct) | ☐ |
| D12 | "Any additional documents required by the responsible visa office" | — | never a line by itself; a person decides per visa office | [C5483] p. 2 item 10; the same rule the Visitor visa follows (`compliance-trace.md` IRCC-P2-16) | no (correct) | ☐ |
| D13 | Translations | any document not in English or French | when needed | [C5483] p. 1: "If your documents are in a language other than English or French, check with the responsible visa office for your region to determine whether they need to be translated."; [G5269]: "Translations must not be done by the applicants themselves nor by members of the applicant's family." | rule only | ☐ |

## 4. Forms: which, and who fills each

| # | Form | Who fills it | When | Official words | Seeded today | Mark |
|---|---|---|---|---|---|---|
| R1 | IMM 1294 (06-2026), Application for study permit made outside Canada | each person applying for a study permit | always | [C5483] Forms list item 1: "Application for Study Permit made Outside of Canada (IMM 1294). Note: If this application form is completed on a computer, it must be validated to generate a barcode page." | yes (each applicant, always) | ☐ |
| R2 | Family Information: **IMM 5707 or IMM 5645?** | each person 18 or older, **or a minor travelling alone** | always | [C5483] item 2: "Family Information (IMM 5707) Note: Must be completed by those 18 years of age or older or a minor travelling alone to Canada."; [G5269] Step 2 lists IMM 5707; but [HOW]: "If you're applying for a study permit, you must apply online, whether you're outside of Canada or already in Canada." and [G5269]: "If you're applying for a study permit you must apply online from outside of Canada. You're only eligible to apply on paper if you have a disability that prevents you from applying online [or] hold an identity or travel document for non-national residents, refugees or stateless persons"; canada.ca IMM 5645 page: "This form must be completed by each person, 18 years of age or older, applying for a Temporary Resident Visa, a study or work permit outside Canada." | IMM 5707, minimum age 18 (the "minor travelling alone" part is not in the rule: `form-setup.ts` note, #879) | ☐ |
| R3 | IMM 5409, Statutory declaration of common-law union | each applicant in a common-law union | when common-law | [G5269] Step 2: "Statutory Declaration of Common-law Union (IMM 5409) … if applicable"; [C5483] item 3: "Note: Refer to the responsible visa office for your region." | yes | ☐ |
| R4 | IMM 5476, Use of a representative | the student (and each adult family member) | when a representative is used, appointed or cancelled | [C5483] item 4: "Complete this form only if you are using the services of an authorized representative, or if you are appointing or cancelling a representative." | yes, but **on the 11-2021 edition** (see the answer key, finding 1) | ☐ |
| R5 | IMM 5475, Authority to release information | each applicant who authorizes it | when authorized | [C5483] item 5 (quoted in `form-setup.ts`) | yes | ☐ |
| R6 | IMM 5646, Custodianship declaration | parents or guardians abroad **and** the custodian in Canada | a minor studying without a parent or guardian: **under 17, or 17 or less?** | [C5483] item 6: "Must be completed if the minor studying in Canada is less than 17 years old."; [G5269]: "Children 17 years of age or less coming to Canada to study without an accompanying parent or a legal guardian must still be in the care of a responsible adult in Canada. … The parents or legal guardians in the country or territory of origin and the custodian in Canada must complete a notarized Custodianship Declaration (IMM 5646)"; and "may need a custodian at the discretion of an immigration officer" from 17 to the age of majority; "Custodian must reside in Canada and be Canadian citizen or permanent resident 19 years of age or older." | yes, on the guide's wider words (17 or less), a fact asked beside the date of birth (`MINOR_FACT`) | ☐ |
| R7 | IMM 5483, the checklist itself | the student | always | [C5483]: "This document checklist is one of the forms that you need to submit with your application." | not a form line (the app uses it as the source of document lines) | ☐ |

## 5. Field map basis

| Form | Edition and file | Map today | Fill trial (Validate in Adobe) | What the expert is asked |
|---|---|---|---|---|
| IMM 1294 | (06-2026), sha256 `394c7455…` (`official-sources/ircc/forms/imm1294e.pdf`), field list `prototype/p1/inventory/imm1294e.inventory.json` | 245 entries, **all DRAFT** (228 AI-proposed, 17 by a person): 169 to a fact, 15 by a person, 58 form helpers, 3 never filled | **none** (`samples/fill-trials.json` lists IMM 0008, 1295, 1344, 5257, 5409, 5707) | After a person reviews the map: an answer key like the Visitor visa one, for a made-up student (§6 Q6) |
| IMM 5646 | (01-2023), sha256 `d961f594…`, `prototype/p1/inventory/imm5646e.inventory.json` | 136 entries, **all DRAFT**: 62 to a fact, 30 by a person, 44 never filled | none | Mostly the custodian's and parents' details: confirm which parts the firm prepares and which the notary completes |
| IMM 5707 | (01-2023), sha256 `6e59d350…` | 50 published | yes (E1, 23 Oct 2026) | only if R2 keeps IMM 5707 |
| IMM 5409, IMM 5475 | (01-2023), (05-2021) | published (shared with the Visitor visa) | IMM 5409 yes; IMM 5475 none | as on the Visitor visa |
| IMM 5476 | **(11-2021)**, superseded | published | none | a new map on 11-2025 (answer key, finding 1) |

Basis of every map: the official PDF identified by number, edition and checksum (never the file name, `compliance-trace.md` IRCC-F03), its field list read without AI, then AI proposals reviewed by a person (C3.1, C3.8). A map leaves the demo only with a passing answer-key test signed by the expert (C5.5, P-240).

## 6. Questions for the expert (one line each; recommendation in brackets)

1. **Q1 Online channel, IMM 1294 and the family form:** a study permit from outside Canada must be applied for online ([G5269], [HOW]). In the IRCC account, is IMM 1294 answered on screen (as IMM 5257 is on the Visitor visa, so the app gives a portal sheet and needs no PDF fill or Adobe trial) or uploaded as a validated PDF? And which family form, IMM 5645 or IMM 5707? (Recommend: follow what the online application asks; the answer sets BK-13's scope, since an on-screen IMM 1294 makes §5's PDF map and fill trial a paper-only fallback.)
2. **Q2 Minor travelling alone:** must a student under 18 travelling alone fill the family form? [C5483] says yes; the app's rule has no "travelling alone" fact yet. (Recommend yes, with a fact.)
3. **Q3 Custodian age:** "less than 17" ([C5483]) or "17 years of age or less" ([G5269])? (The app takes the guide's wider words.)
4. **Q4 Financial support:** the current amount and how firms evidence it (the amount is not in our copies).
5. **Q5 PAL/TAL exceptions:** which exceptions a firm meets most often, so the condition can name them.
6. **Q6 Test student for the answer key:** suggest one made-up student (age, province, program, funds) that a typical file looks like.
7. **Q7 Biometrics on file:** does a firm ask for and record the date of the client's last biometrics, so the fee and the photo line follow it? (Recommend a dated fact asked once.)
8. **Q8 Family members:** should the first Study permit release support an accompanying spouse and children (their own study or work permit applications filed together), or a student alone?

## 7. Corrections found while preparing this (for the tech lead, not the expert)

1. `sp.outside` has no fee lines; F1–F2 are ready to enter as data (P-449's "checked, not assumed": the seed holds nothing to check).
2. The combination allows a student only; [G5269] has family members apply together.
3. IMM 1294 and IMM 5646 maps are entirely DRAFT with no fill trial: entering Study permit "as data" (BK-13) still needs a person's map review and a Validate trial in Adobe on the Mac.
4. Seven document lines missing (D3, D5–D10); D5 and D7 decide whether IRCC accepts the application for processing.
5. IMM 5476 on the superseded edition (shared with the Visitor visa).
