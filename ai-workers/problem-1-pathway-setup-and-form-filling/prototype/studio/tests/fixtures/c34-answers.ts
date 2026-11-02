// C3.4 (tests/check_forms_c34_ai.ts, check_forms_c34_ai_live.ts): the answers a recorded or stand-in AI run carries, made
// of IMM 5257's own printed words and boxes and guide 5256's own sentence. Test data only, no model call.
export const CHOICE = "form1[0].Page3[0].PageWrapper[0].BackgroundInfo3[0].Choice[0]", DETAILS = "form1[0].Page3[0].PageWrapper[0].BackgroundInfo3[0].details[0]";
export const PASSPORT = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].PassportNum[0].PassportNum[0]";
export const formCheck = { sentence: "When a criminal offence is declared, its details are given", reads: [CHOICE, DETAILS], subject_kind: "PRINCIPAL",
  tree_json: JSON.stringify({ op: "or", args: [{ op: "neq", field: CHOICE, value: "Yes" }, { op: "exists", field: DETAILS }] }), quote: "If you answered “yes” to question 3a) above, please provide details.",
  examples: [{ facts_json: JSON.stringify({ [CHOICE]: "No" }), expected: true }, { facts_json: JSON.stringify({ [CHOICE]: "Yes" }), expected: false }, { facts_json: JSON.stringify({ [CHOICE]: "Yes", [DETAILS]: "A fine in 2015" }), expected: true }] };
export const passport = { name: "Passport", proves: "identity and nationality", category: "identity", supplies: [PASSPORT], reader: "coded_lines", identity_document: true, quote: "Passport number" };
export const FORM_ANSWER = { checks: [formCheck], document_types: [passport], unresolved: [{ passage: "Dates of previous marriage", reason: "two dates compared: not in the 11 operators" }] };
export const guideCheck = { group: "official_rule", sentence: "The passport number is given as shown on the passport", reads: ["Passport number"], subject_kind: "PRINCIPAL", tree_json: JSON.stringify({ op: "exists", field: "passport_number" }),
  severity: "block", needs_calculation: null, quote: "Type your valid passport or travel document number exactly as shown on the document.",
  examples: [{ facts_json: JSON.stringify({ passport_number: "AB123456" }), expected: true }, { facts_json: JSON.stringify({}), expected: false }] };
export const GUIDE_ANSWER = { checks: [guideCheck], unresolved: [] };

