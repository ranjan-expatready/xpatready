// QA-144, P-319 (moved out of demo.ts for B71, so a pack's setup can read it without the loader's Nest services): the
// one per-combination table of what IRCC's own words set on a combination's form lines, read by the configured
// checkpoint's loader (api/src/demo.ts) and by the six's people's steps in the packs (acceptance/lib/pack2.ts). Each
// value is Sample, "Unconfirmed: expert" (AGENTS rule 4). No decorators and no imports, on purpose.
import { OWN_YES_NO, type OwnYesNo } from "./own-yes-no.ts";
/** QA-227 (Major): IMM 5476's and IMM 5475's rules read "exists" on the form's own choice (appointing, updating, cancelling
 *  a representative; authorizing or withdrawing a release), which only IMM 5476 or IMM 5475 itself asks: unanswered,
 *  "exists" is plainly false, so the form never applies and nobody is asked. Each rule now reads a Yes/No question in
 *  IRCC's words (REP_FACT, RELEASE_FACT), added through C3.6's door for its rule and asked of the application. */
const REPRESENTED = { subjectKind: "CASE", op: "eq", field: "case.uses_representative", value: true };
const RELEASES = { subjectKind: "CASE", op: "eq", field: "case.authorizes_release_to_designated_individual", value: true };
export type FormRule = { form: string; condition?: object; minAge?: number; who?: string; retire?: true; cite: string };
/** QA-144 slice 1 (ruling 3): the Visitor visa's form lines as IRCC's own words set them. Each is Sample, "Unconfirmed:
 *  expert" (AGENTS rule 4). IMM 5484 (05-2026) is official-sources/ircc/checklists/imm5484e.pdf, saved 19 Oct 2026; Guide
 *  5256 is official-sources/ircc/instructions/guide-5256.html, modified 2026-03-31, saved 19 Oct 2026. */
export const VV_FORM_RULES: FormRule[] = [
  // QA-221 (tech lead's ruling C, 4 Nov): the form's own words name who fills it; the minimum age gates dependent
  // children only (contracts/resolver.ts principal_partner_adult_children). official-sources/ircc/forms/imm5257_1e.pdf,
  // saved 19 Oct 2026 (its page 1 header, as prototype/expected/source-text/imm5257_1e.xfa-template.txt reads it).
  { form: "IMM 5257 SCH1", who: "principal_partner_adult_children", minAge: 18,
    cite: "IMM 5257 SCH1 (09-2023) p. 1: \"The principal applicant, his or her spouse or common-law partner, if applicable, and all dependent children aged 18 years or older listed in the application for temporary residence must complete their own copy of this form.\"" },
  { form: "IMM 5409", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.marital_status", value: "common_law" },
    cite: "Guide 5256, Question 10: \"If you are in a common-law union, you must also request and fill out the Statutory Declaration of Common-law Union [IMM 5409] form and include it with your application.\"" },
  // C6.11 (VV-R10): who fills it, in the form page's own words (canada.ca "Use of a Representative Form (IMM 5476)",
  // official-sources/ircc/web-pages/page-imm5476.html, modified 2025-12-12): the principal applicant and a spouse or
  // partner always, a dependent child from 18 (contracts/resolver.ts principal_partner_adult_children).
  { form: "IMM 5476", condition: REPRESENTED, who: "principal_partner_adult_children", minAge: 18,
    cite: "IMM 5484 p. 1: \"Complete this form only if you used the services of a representative, or if you are appointing or cancelling a representative.\"; canada.ca IMM 5476 page (modified 2025-12-12): \"If you have dependent children aged 18 years or older, they are required to complete their own copy of this form if a representative is also conducting business on their behalf.\", \"By signing, you authorize IRCC to complete your request for yourself and your dependent children under 18 years of age.\" and \"Separate authorization forms are required for a spouse or common-law partner even if they are included in the same application.\"" },
  { form: "IMM 5475", condition: RELEASES,
    cite: "IMM 5484 p. 1: \"Complete this form only if you authorize Immigration, Refugees and Citizenship Canada (IRCC) and the Canada Border Services Agency (CBSA) to release information from your case file to someone other than yourself.\"" },
  // Guide 5256, Question 3 note: the form for a person whose gender identifier differs from their documents.
  { form: "IRM 0002", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.gender_identifier_differs_from_documents", value: true },
    cite: "Guide 5256, Question 3: \"If you choose a gender identifier that is different than what you currently have or have had on your Canadian temporary resident document (visa, electronic travel authorization, work permit, study permit or visitor record), you need to complete the Request for a Change of Sex or Gender Identifier (IRM 0002) form and send it with your application.\" and \"You also need to complete this form and send it with your application if you’ve never had a Canadian temporary resident document but you intend to apply for one and you identify with a gender that is different than what appears on your foreign travel document or passport.\"" },
];
/** QA-144 slice 1 (tech lead, 4 Nov; the RCIC walk #782, IRCC-P2-04a): the family information form follows how the
 *  combination files (Sample, Unconfirmed: expert). Filed on paper or as a PDF upload: IMM 5707; filed online: IMM 5645.
 *  The other one is taken off this combination's draft, with the reason. Each person 18 or older fills it (both lines). */
export const FAMILY_FORM_BY_CHANNEL = {
  // QA-221 (ruling C): each family form keeps "each applicant, from 18", in its own words first.
  paper: { form: "IMM 5707", other: "IMM 5645", cite: "IMM 5707 (01-2023) p. 1, Instructions (official-sources/ircc/forms/imm5707e.pdf, saved 19 Oct 2026): \"This form must be completed by: each person, 18 years of age or older, or a minor (less than 18 years of age) travelling alone.\" (a minor travelling alone: a follow-up row, it needs a travelling-alone fact); IMM 5484 (05-2026) p. 1, the paper checklist: \"Family Information form. Must be completed by those aged 18 years or older.\" and \"You must complete the Family Information form (IMM 5707) listed in the application package for your region.\"; Guide 5256: \"You must complete the Family Information form (IMM 5707 or IMM 5645) listed in the application package for your country.\"" },
  online: { form: "IMM 5645", other: "IMM 5707", cite: "canada.ca \"Family Information (IMM 5645)\", Who needs to complete this form? (official-sources/ircc/web-pages/page-imm5645.html, saved 19 Oct 2026): \"This form must be completed by each person, 18 years of age or older, applying for a Temporary Resident Visa, a study or work permit outside Canada.\"; canada.ca \"Apply for a visitor visa\" (official-sources/ircc/canada/pages/visit-canada-apply-visitor-visa.html, modified 2026-08-28, saved 27 Oct 2026): \"Your document checklist may include supporting documents such as the following: Family Information (IMM 5645) form\"; Guide 5256: \"This form must be completed by each person, 18 years of age or older\"" },
} as const;
/** QA-144 slice 1 (tech lead, 4 Nov): IRM 0002's rule reads a fact no form asks, added through C3.6's door for its rule
 *  (a second person approves it) and asked of each person beside their gender. Sample, Unconfirmed: expert. */
export const GENDER_FACT = { fact: "person.gender_identifier_differs_from_documents", rule: "IRM 0002", cite: "Guide 5256, Question 3", label: "Gender identifier differs from earlier documents", valueType: "yes_no",
  meaning: "Whether the person chooses a gender identifier different from the one on their current or earlier Canadian temporary resident document or, with no Canadian document, from their passport or travel document (Guide 5256, Question 3; IRM 0002)." };
/** QA-144 slice 2 (brief on #798): With an LMIA – inside Canada's form lines as IRCC's own words set them. Each is Sample,
 *  "Unconfirmed: expert" (AGENTS rule 4). Guide 5553 is official-sources/ircc/instructions/guide-5553.html (modified
 *  2026-06-05, saved 27 Oct 2026); IMM 5556 (03-2024) is official-sources/ircc/checklists/imm5556e.pdf, saved 27 Oct 2026;
 *  the combination's own page is official-sources/ircc/canada/pages/work-canada-permit-inside-forms-documents.html
 *  (modified 2026-05-15, recorded 27 Oct 2026). Its people are the worker, a spouse or partner, and a representative. */
export const LMIA_FORM_RULES: FormRule[] = [
  { form: "IMM 5409", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.marital_status", value: "common_law" },
    cite: "Guide 5553, \"Completing the forms\": \"The following are the forms that must be filled out and submitted: … Statutory Declaration of Common-law Union [IMM 5409] (opens in a new tab), if applicable\"; IMM 5556 (03-2024), its forms list: \"Statutory Declaration of Common-law Union (IMM 5409), if applicable\"" },
  { form: "IMM 5476", condition: REPRESENTED,
    cite: "IMM 5556 (03-2024), its forms list: \"Use of a Representative (IMM 5476) Note: Complete this form only if you are using the services of an authorized representative, or if you are appointing or cancelling a representative.\"; Guide 5553, \"Use of a Representative (IMM 5476)\": \"Fill out this form only if you: are appointing a representative; need to update contact information for your previously appointed representative; or are cancelling a representative's appointment.\"" },
  { form: "IMM 5475", condition: RELEASES,
    cite: "IMM 5556 (03-2024), its forms list: \"Authority to Release Personal Information to a Designated Individual (IMM 5475) Note: Complete this form only if you authorize IRCC and the Canada Border Services Agency (CBSA) to release information from your case file to someone other than yourself.\"" },
];
/** QA-144 slice 3 (brief on #798): the study permit's form lines (outside Canada) as IRCC's own words set them, each
 *  Sample, "Unconfirmed: expert" (AGENTS rule 4). Guide 5269 is official-sources/ircc/instructions/guide-5269.html
 *  (canada.ca, modified 2026-10-06, saved 27 Oct 2026); IMM 5483 (08-2025) is official-sources/ircc/checklists/imm5483e.pdf
 *  (checked 21 Oct 2026). IMM 1294 stays on the draft as every student files it. Its people are one student and a
 *  representative. */
export const SP_FORM_RULES: FormRule[] = [
  // Guide 5269 and IMM 5483 disagree on the age (17 or less, against less than 17): the guide's wider words are taken, for the expert to confirm.
  { form: "IMM 5646", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.minor_studying_without_parent", value: true },
    cite: "Guide 5269, Custodians: \"Children 17 years of age or less coming to Canada to study without an accompanying parent or a legal guardian must still be in the care of a responsible adult in Canada. [...] The parents or legal guardians in the country or territory of origin and the custodian in Canada must complete a notarized Custodianship Declaration (IMM 5646)\"; IMM 5483 (08-2025) p. 1: \"Must be completed if the minor studying in Canada is less than 17 years old.\"" },
  { form: "IMM 5409", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.marital_status", value: "common_law" },
    cite: "Guide 5269, Step 2: \"Statutory Declaration of Common-law Union (IMM 5409) [...], if applicable\"" },
  { form: "IMM 5476", condition: REPRESENTED,
    cite: "IMM 5483 (08-2025) p. 1: \"Complete this form only if you are using the services of an authorized representative, or if you are appointing or cancelling a representative.\"; Guide 5269: \"Fill out this form only if you: are appointing a representative; need to update contact information for your previously appointed representative; or are cancelling a representative’s appointment.\"" },
  { form: "IMM 5475", condition: RELEASES,
    cite: "IMM 5483 (08-2025) p. 1: \"Complete this form only if you authorize Immigration, Refugees and Citizenship Canada (IRCC) and the Canada Border Services Agency (CBSA) to release information from your case file to someone other than yourself.\"" },
];
/** QA-144 slice 3: IMM 5646's rule reads a fact no form asks (no age is worked out in this workspace), added through
 *  C3.6's door for its rule and asked of each person beside their date of birth. Sample, Unconfirmed: expert. Guide 5269
 *  also says a student from 17 to the age of majority "may need a custodian at the discretion of an immigration officer":
 *  not in this fact, for the expert. */
export const MINOR_FACT = { fact: "person.minor_studying_without_parent", rule: "IMM 5646", cite: "Guide 5269, Custodians", label: "Minor studying without a parent or guardian", valueType: "yes_no",
  meaning: "Whether the person is 17 years of age or less and comes to Canada to study without an accompanying parent or legal guardian, so a custodian in Canada must care for them (Guide 5269, Custodians; IMM 5646).",
  beside: ["person.date_of_birth"] };
/** G5 (C5.1, P-248; tech lead's ruling on #868, Lead 8, 20:5x IST): a document line the checkpoint sets from an official
 *  checklist's own words, cited (P-170): the document type (an existing library name is reused), whose it is, and the
 *  page and quote. Sample, Unconfirmed: expert (AGENTS rule 4). `reuse`: the type must already be in the library (the
 *  Visitor visa, set up first, adds it), and the line uses it rather than proposing a new one. */
export type CitedDocumentLine = { type: string; who: "principal_applicant" | "each_applicant"; quote: string; reuse?: true };
/** The Study permit (outside Canada)'s always-needed documents, from IMM 5483 (08-2025), the document checklist for a
 *  study permit: official-sources/ircc/checklists/imm5483e.pdf (the PDF modified 2025-08-11, sha256 6f885da2…). */
const IMM5483 = "IMM 5483 (08-2025), canada.ca PDF modified 2025-08-11";
export const SP_DOCUMENT_LINES: CitedDocumentLine[] = [
  { type: "Fee payment receipt", who: "principal_applicant", reuse: true,
    quote: `${IMM5483}, p. 1, documents list item 1: "Proof of payment showing the amount paid. You must pay your processing fees and any other applicable fees and include a copy of the payment receipt with your application." (Sample, Unconfirmed: expert)` },
  { type: "Passport information page copy", who: "each_applicant", reuse: true,
    quote: `${IMM5483}, p. 1, documents list item 2: "A Photocopy of the information page of your valid passport or travel document which includes: The passport number, The issuance and expiry dates, Your photo, name, date and place of birth." (Sample, Unconfirmed: expert)` },
  { type: "Letter of acceptance", who: "principal_applicant",
    quote: `${IMM5483}, p. 2, documents list item 4: "Letter of acceptance from where you intend to study (including, but not limited to, Designated Learning Institutions)." (Sample, Unconfirmed: expert)` },
];
/** QA-227: the two Yes/No questions IMM 5476's and IMM 5475's rules read, in the checklists' words (IMM 5484 (05-2026),
 *  official-sources/ircc/checklists/imm5484e.pdf, saved 19 Oct 2026; IMM 5556 (03-2024) for With an LMIA). Asked once
 *  for the application, beside its language of service (the application form's first case question). Sample,
 *  Unconfirmed: expert. A case with a representative of record could answer the first by itself (runtime, question on the PR). */
export const REP_FACT = { fact: "case.uses_representative", rule: "IMM 5476", cite: "IMM 5484 (05-2026) p. 1: \"Complete this form only if you used the services of a representative, or if you are appointing or cancelling a representative.\"", label: "Uses a representative", valueType: "yes_no",
  meaning: "Whether the applicant uses the services of a representative, or is appointing, updating or cancelling a representative's appointment (IMM 5484 p. 1; IMM 5476).", beside: ["case.service_language", "case.visa_type_requested"] };
export const RELEASE_FACT = { fact: "case.authorizes_release_to_designated_individual", rule: "IMM 5475", cite: "IMM 5484 (05-2026) p. 1: \"Complete this form only if you authorize … (IRCC) and … (CBSA) to release information from your case file to someone other than yourself.\"", label: "Authorizes release of information to a designated individual", valueType: "yes_no",
  meaning: "Whether the applicant authorizes IRCC and the CBSA to release information from their case file to someone other than themselves (IMM 5484 p. 1; IMM 5475).", beside: ["case.service_language", "case.visa_type_requested"] };
type RuleFact = typeof GENDER_FACT & { beside?: string[] };
/** QA-144 (P-319): the one per-combination table of what the checkpoint sets from IRCC's words: the application form
 *  whose channel picks the family information form (FAMILY_FORM_BY_CHANNEL), the form rules, why each person 18 or older
 *  fills the family information form there, and a fact only a rule reads (C3.6). No other form number is in the steps. */
export const FORM_SETUP: Record<string, { application: string; rules: FormRule[]; family: string; ruleFacts?: RuleFact[]; ownYesNo?: OwnYesNo[]; documentsFromReviewedRelease?: boolean; documentsFromChecklist?: string; documentsCited?: CitedDocumentLine[] }> = {
  "vv.single": { application: "IMM 5257", rules: VV_FORM_RULES, ruleFacts: [GENDER_FACT, REP_FACT, RELEASE_FACT], ownYesNo: OWN_YES_NO["vv.single"].boxes, documentsFromChecklist: "IMM 5484", family: "IMM 5484 (05-2026) p. 1: \"Family Information form. Must be completed by those aged 18 years or older.\"" },
  "wp.lmia_inside": { application: "IMM 5710", rules: LMIA_FORM_RULES, ruleFacts: [REP_FACT, RELEASE_FACT], documentsFromReviewedRelease: true,
    family: "canada.ca \"Work permit from inside Canada: Forms and documents\" (modified 2026-05-15): \"Your document checklist may include supporting documents such as: … Family Information Form - Visitors, Students and Workers (IMM 5707)\"; IMM 5707 (01-2023) p. 1, Instructions: \"This form must be completed by: each person, 18 years of age or older, or a minor (less than 18 years of age) travelling alone.\"" },
  // IMM 5483 (08-2025) p. 1 adds "or a minor travelling alone": a line has only a minimum age, so that is not in the rule (Unconfirmed: expert, #879).
  "sp.outside": { application: "IMM 1294", rules: SP_FORM_RULES, ruleFacts: [MINOR_FACT, REP_FACT, RELEASE_FACT], documentsCited: SP_DOCUMENT_LINES,
    family: "IMM 5483 (08-2025) p. 1: \"Family Information (IMM 5707) Note: Must be completed by those 18 years of age or older or a minor travelling alone to Canada.\"; Guide 5269, Step 2: \"Family Information (IMM 5707)\"" },
};
