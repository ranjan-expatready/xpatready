// Tests the P2 scorer (v2 since 20 Oct 2026; P2-M1; whole-sequence transforms since P2-R2-M1). Written first before any live run: a draft built to agree with the answer keys and the acceptance
// examples scores PASS on every measure; each kind of wrong draft (wrong person, mixed parent blocks,
// merged meanings, an invented value, a wrong code, a wrong age rule, a blocking expiry check, an officer
// passage drafted as a rule, the licence number asked of the client) turns exactly its measure to FAIL; a
// stub draft never scores PASS on a drafting measure. Fact names in the built draft differ from the key's,
// to show the alignment does not depend on naming. No AI call.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { score as scoreWith, type Alias } from "./score_p2.ts";

const P = join(import.meta.dirname, "..");
const key = JSON.parse(readFileSync(join(P, "expected", "slice-1-field-map.v2.json"), "utf8"));
const results: [string, boolean][] = [];
const t = (name: string, pass: boolean) => results.push([name, pass]);

const rename = (f: string) => (f.startsWith("derived:") ? "case.no_children_flag" : f.replace(".", ".d_"));
function relPerson(person: string, subject: string, dp: string) {
  if (person === subject) return "form_subject";
  if (person === "partner" || person === "client-a") return "subject_spouse_or_partner";
  if (person === "child") return "subject_child";
  return dp.includes(".Parent1[0].") ? "subject_parent_1" : "subject_parent_2";
}
function transform(k: any) {
  const e = k.expect;
  switch (e.kind) {
    case "country_name_text": return "country_name_text";
    case "code_list": return `code_list:x (${Object.entries(e.codes).map(([l, c]) => `${l}=${c}`).join(", ")})`;
    case "yes_no_code": return "yes_no_code:1/2";
    case "date": return `date:${e.format}`;
    case "derived_no_children": return "derive_inverse:1 when the subject has no child records";
    case "address_single_line": return "address_single_line";
    default: return "as_is";
  }
}
function entries(inst: any) {
  return inst.entries.map((k: any) => k.expected_outcome === "not_a_fact" ? { data_path: k.data_path, outcome: "not_a_fact", unresolved_reason: "form-calculated helper" }
    : /must be reported unresolved|unresolved in the scenario/.test(k.rule)
    ? { data_path: k.data_path, outcome: "unresolved", unresolved_reason: "no case fact" }
    : { data_path: k.data_path, outcome: "mapped", person: k.owner === "relationship" ? "relationship_of_subject_and_partner" : relPerson(k.person.split("|")[0].replace(/\.(mother|father)$/, ".parent"), inst.subject, k.data_path), fact: rename(k.fact), transform: transform(k), ...(k.person === "child" ? { row: 0 } : {}) });
}
// The ideal draft's own definitions and a test alias table built from those definitions (never from boxes).
const MEANING: Record<string, string> = { "person.family_name": "Family name (surname)", "person.given_names": "Given name(s)", "person.date_of_birth": "Date of birth", "person.country_of_birth": "Country of birth",
  "person.marital_status": "Current marital status", "person.occupation": "Present occupation", "case.accompanies_principal": "Whether the family member accompanies the subject", "person.residential_address": "Current residential address",
  "relationship.start_date": "Date of marriage or start of the common-law relationship", "relationship.to_form_subject": "How the child is related to the subject", "derived: subject has no children": "Whether the subject has any children",
  "person.travelling_alone_to_canada": "Whether a minor is travelling to Canada alone" };
const fields = Object.entries(MEANING).map(([k, m]) => ({ id: rename(k), meaning: m, value_type: "text", proposed_by: ["self-test"] }));
const ALIASES: Alias[] = Object.entries(MEANING).map(([k, m]) => ({ key_fact: k, draft_id: rename(k), meaning: m.toLowerCase(), decision: k.startsWith("derived:") ? "same_inverse" : "same" }));
ALIASES.push({ key_fact: "person.occupation", draft_id: "person.d_history_activity", meaning: "activity during a period of history", decision: "different" });
const score = (c: any) => scoreWith(c, { aliases: ALIASES, runsDir: join(P, "p2", "no-runs") });
const [c5707, , c1295] = key.instances;
const DOB = rename("person.date_of_birth");
function ideal(): any {
  return {
    configuration_version: "scorer-self-test",
    canonical_fields: [...structuredClone(fields), { id: "person.d_history_activity", meaning: "Activity during a period of history", value_type: "text", proposed_by: ["self-test"] }],
    field_maps: [
      { form_edition: "IMM 5707 (01-2023)", entries: entries(c5707) },
      { form_edition: "IMM 1295 (09-2023)", entries: entries(c1295) },
      { form_edition: "IMM 5476 (11-2025)", entries: [{ data_path: "IMM_5476[0].Page1[0].SectionB[0].question6[0].questionII[0].ICCRCMember[0]", outcome: "mapped", person: "representative", fact: "representative.membership_id" }] },
    ],
    derived_fields: [{ id: "person.age_years", calculation: "age_in_years", inputs: [DOB], reference: "case.application_date", executable: true }],
    forms: [
      { form_number: "IMM 1295", status: "always", who: "each_applicant", condition: null, source_quote: "q" },
      { form_number: "IMM 5707", status: "conditional", who: "each_adult_18_plus", condition: { subjectKind: "EACH_PERSON", op: "or", args: [{ op: "gte", field: "person.age_years", value: 18 }, { op: "and", args: [{ op: "lt", field: "person.age_years", value: 18 }, { op: "eq", field: rename("person.travelling_alone_to_canada"), value: true }] }] }, source_quote: "q" },
      { form_number: "IMM 5409", status: "conditional", who: "couple_once", condition: { subjectKind: "PRINCIPAL", op: "eq", field: "person.d_marital_status", value: "common_law" }, source_quote: "Statutory Declaration of Common-law Union (IMM 5409), if applicable" },
      { form_number: "IMM 5476", status: "conditional", who: "each_applicant", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "case.uses_representative", value: true }, source_quote: "q" },
      { form_number: "IMM 5475", status: "conditional", who: "each_applicant", condition: { subjectKind: "EACH_APPLICANT", op: "exists", field: "case.designated_individual" }, source_quote: "q" },
      { form_number: "IMM 5257 SCH1", status: "conditional", who: "each_applicant", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.background_yes", value: true }, source_quote: "q" },
    ],
    document_requirements: [
      { document_type: "Passport information page", status: "requirement_line", base_or_conditional: "base", who: "each_applicant", source_quote: "q" },
      { document_type: "Marriage certificate", status: "requirement_line", base_or_conditional: "conditional", who: "couple_once", condition: { subjectKind: "PRINCIPAL", op: "eq", field: "person.d_marital_status", value: "married" }, source_quote: "Photocopy of your Marriage license or Certificate, if applicable" },
      { document_type: "Children's birth certificates", status: "requirement_line", base_or_conditional: "conditional", who: "each_dependent_child", condition: { subjectKind: "DEPENDENT", op: "eq", field: "case.d_accompanies_principal", value: true }, source_quote: "q" },
      { document_type: "Proof of payment", status: "requirement_line", base_or_conditional: "base", who: "each_applicant", source_quote: "q" },
    ],
    rules: [{ kind: "task", when: null, then: "ask for more documents if requested", source_quote: "The officer may request additional documents" }],
    placements: [
      { fact: "representative.membership_id", section_id: "representative", collected_from: "profile_record", tier: "case", client_visible: false },
      { fact: DOB, section_id: "personal", collected_from: "client_questionnaire", tier: "prospect", client_visible: true },
    ],
    checks: [
      { id: "passport-expiry", made_by: "ai_draft", group: "readiness_warning", severity: "warn", applies_to: "passport", inputs: ["document.passport_expiry_date"], condition_plain: "passport expires within 90 days", expressible: true, gap_reason: null },
      { id: "employment-gap", made_by: "ai_draft", group: "readiness_warning", severity: "warn", applies_to: "employment history", inputs: ["person.employment_history"], condition_plain: "a gap in the past 10 years of employment history", expressible: false, gap_reason: "needs date arithmetic over history rows" },
      { id: "fn-option:x", made_by: "rule", group: "form_native", severity: "block" },
      { id: "fn-length:x", made_by: "rule", group: "form_native", severity: "warn" },
    ],
    unresolved: [],
    structure: {},
  };
}
const verdict = (c: any, id: string) => score(c).acceptance.find((a: any) => a.id === id)!.verdict;
const base = score(ideal());
t(`a draft that agrees with the keys passes every measure (${JSON.stringify(base.summary)})`, base.summary.FAIL === 0 && base.summary.NOT_EVALUABLE === 0);
const fm5707 = base.field_maps.instances[0];
t("... including 42/42 all-correct entries on Client A's IMM 5707, 42/42 on the partner's and 7/7 on IMM 1295 (D11 visible date, three form-calculated helpers)", fm5707.all_ok === 42 && base.field_maps.instances[1].all_ok === 42 && base.field_maps.instances[2].all_ok === 7);

const mutate = (f: (c: any) => void) => { const c = ideal(); f(c); return c; };
const spouseBox = (c: any) => c.field_maps[0].entries.find((e: any) => e.data_path.includes(".Spouse[0].") && e.fact === "person.d_family_name");
t("spouse family name drafted as the form subject's: wrong person FAILS", verdict(mutate((c) => { spouseBox(c).person = "form_subject"; }), "P2-FM-02") === "FAIL");
t("a box the draft left unmapped is an outcome miss, not a wrong person (found on the first live run)", (() => { const r = score(mutate((c) => { const e = spouseBox(c); e.outcome = "not_a_fact"; delete e.person; delete e.fact; })); return r.field_maps.instances[0].wrong_person.length === 0 && r.field_maps.instances[0].outcome_ok === 41; })());
t("one parent-1 box drafted as parent 2: parent blocks FAIL", verdict(mutate((c) => { c.field_maps[0].entries.find((e: any) => e.data_path.includes(".Parent1[0].") && e.fact === "person.d_occupation").person = "subject_parent_2"; }), "P2-FM-04") === "FAIL");
t("given names drafted with the family-name fact: one-meaning FAILS (merged meanings)", verdict(mutate((c) => { for (const e of c.field_maps[0].entries) if (e.fact === "person.d_given_names") e.fact = "person.d_family_name"; }), "P2-FM-03") === "FAIL");
t("native-language name drafted as mapped: invented value FAILS", verdict(mutate((c) => { const e = c.field_maps[0].entries.find((x: any) => x.outcome === "unresolved"); Object.assign(e, { outcome: "mapped", person: "form_subject", fact: "person.d_native_name" }); }), "P2-FM-05") === "FAIL");
t("child drafted in row 1: rows FAIL", verdict(mutate((c) => { for (const e of c.field_maps[0].entries) if (e.person === "subject_child") e.row = 1; }), "P2-FM-06") === "FAIL");
t("IMM 1295 marital status with IMM 5707's code (1 instead of 03): codes FAIL", verdict(mutate((c) => { c.field_maps[1].entries.find((e: any) => e.fact === "person.d_marital_status").transform = "code_list:imm1295 (Common-law=1, Married=01)"; }), "P2-FM-07") === "FAIL");
t("IMM 5707 condition 'older than 18' (gt): age rule FAILS at the 18th-birthday boundary", verdict(mutate((c) => { c.forms[1].condition.args[0].op = "gt"; }), "P2-RQ-03") === "FAIL");
t("IMM 5707 condition 'under 18': age rule FAILS", verdict(mutate((c) => { c.forms[1].condition.args[0].op = "lt"; }), "P2-RQ-03") === "FAIL");
t("IMM 5707 condition on a field no derived value fills: age rule FAILS (cannot tell for everyone)", verdict(mutate((c) => { c.forms[1].condition.args[0].field = "person.age_unknown"; }), "P2-RQ-03") === "FAIL");
t("IMM 5409 drafted as always: forms FAIL", verdict(mutate((c) => { c.forms[2].status = "always"; }), "P2-RQ-02") === "FAIL");
t("passport page drafted as conditional only: documents FAIL", verdict(mutate((c) => { c.document_requirements[0].base_or_conditional = "conditional"; }), "P2-RQ-04") === "FAIL");
t("an officer passage drafted as a rule: officer tasks FAIL", verdict(mutate((c) => { c.rules[0].kind = "rule"; }), "P2-RQ-05") === "FAIL");
t("an 'if applicable' document with no condition: if-applicable FAILS", verdict(mutate((c) => { c.document_requirements[1].condition = null; }), "P2-RQ-06") === "FAIL");
t("the representative's membership number asked of the client: licence FAILS", verdict(mutate((c) => { c.placements[0].collected_from = "client_questionnaire"; }), "P2-SC-02") === "FAIL");
t("a passport expiry check that blocks: expiry FAILS", verdict(mutate((c) => { c.checks[0].severity = "block"; }), "P2-CK-01") === "FAIL");
t("an employment gap check that blocks: history gap FAILS", verdict(mutate((c) => { c.checks[1].severity = "block"; }), "P2-CK-02") === "FAIL");
t("an inexpressible check with no named reason: no-invented-values FAILS", verdict(mutate((c) => { c.checks[1].gap_reason = null; }), "P2-CK-03") === "FAIL");
t("an assembled draft listing a bad condition: conditions FAIL", verdict(mutate((c) => { c.unresolved.push({ from: "x", item: "form", reason: "condition: not a node of the closed 11-operator vocabulary" }); }), "P2-RQ-01") === "FAIL");
t("country of birth drafted as country_name_text passes the exact country-name check (scorer bug found on the first live run)", verdict(mutate((c) => { for (const e of c.field_maps[0].entries) if (e.fact === "person.d_country_of_birth") e.transform = "country_name_text"; }), "P2-FM-08") === "PASS" && score(mutate((c) => { for (const e of c.field_maps[0].entries) if (e.fact === "person.d_country_of_birth") e.transform = "country_name_text"; })).field_maps.instances[0].all_ok === 42);
t("a block check that only lists an expiry date among required page facts is not an expiry check", verdict(mutate((c) => { c.checks.push({ id: "page-facts", made_by: "ai_draft", group: "official_rule", severity: "block", applies_to: "passport page", inputs: ["document.passport_expiry_date"], condition_plain: "the passport page facts, including the expiry date, are present", expressible: true, gap_reason: null }); }), "P2-CK-01") === "PASS");
t("a cross-record date-order check that blocks (issue date after expiry) is not an expiry warning", verdict(mutate((c) => { c.checks.push({ id: "CR_ISSUE_BEFORE_EXPIRY", made_by: "ai_draft", group: "cross_record", severity: "block", applies_to: "passport", inputs: [], condition_plain: "expiry on or before issue", expressible: true, gap_reason: null }); }), "P2-CK-01") === "PASS");
t("... but a readiness expiry check that blocks still FAILS", verdict(mutate((c) => { c.checks.push({ id: "RW_PASSPORT_EXPIRY_30", made_by: "ai_draft", group: "readiness_warning", severity: "block", applies_to: "passport", inputs: [], condition_plain: "expires within 30 days", expressible: true, gap_reason: null }); }), "P2-CK-01") === "FAIL");
// ---- P2-M1 negatives (Codex 08:23:05Z): the v1 scorer passed each of these.
const fmOf = (c: any) => score(c).field_maps.instances;
const swap = (c: any) => { let n = 0; for (const m of c.field_maps) for (const e of m.entries) { if (e.fact === "person.d_family_name") { e.fact = "person.d_given_names"; n++; } else if (e.fact === "person.d_given_names") { e.fact = "person.d_family_name"; n++; } } return n; };
let swapped = 0;
const sw = mutate((c) => { swapped = swap(c); });
const swI = fmOf(sw);
t(`global family-name/given-name swap (${swapped} entries, meanings unchanged): every swapped entry fails, accuracy FAILS (v1: 42/42 and 20/22)`,
  swapped === 12 && verdict(sw, "P2-FM-08") === "FAIL" && swI[0].all_ok === 42 - 10 && swI[1].all_ok === 42 - 10 && swI[2].all_ok === 7 - 2);
let dobN = 0;
const dm = mutate((c) => { for (const m of c.field_maps) for (const e of m.entries) if (e.fact === DOB && dobN < 13) { e.transform = "date:YYYY-DD-MM"; dobN++; } });
t(`day-month order on ${dobN} birth-date mappings (date:YYYY-DD-MM): exact date check fails each, accuracy FAILS (v1: unchanged)`,
  dobN === 5 && verdict(dm, "P2-FM-08") === "FAIL" && fmOf(dm)[0].transform_problems.length === 5 && fmOf(dm)[1].transform_problems.length === 5);
// The reviewer's exact cases on the REAL live draft: all 26 family/given entries across its six maps swapped;
// 13 birth-date mappings set to date:YYYY-DD-MM. v1 scored 42/42 on both IMM 5707 perspectives either way.
const live = () => JSON.parse(readFileSync(join(P, "p2", "config", "c1-draft-1-live.json"), "utf8"));
const liveI = scoreWith(live()).field_maps.instances;
const lsw = live(); let lsN = 0;
for (const m of lsw.field_maps) for (const e of m.entries) { if (e.fact === "person.family_name") { e.fact = "person.given_names"; lsN++; } else if (e.fact === "person.given_names") { e.fact = "person.family_name"; lsN++; } }
const lswI = scoreWith(lsw).field_maps.instances;
t(`real live draft, reviewer's global swap (${lsN} entries): each IMM 5707 perspective loses its 10 name entries, IMM 1295 its 2`, lsN === 26 && lswI[0].all_ok === liveI[0].all_ok - 10 && lswI[1].all_ok === liveI[1].all_ok - 10 && lswI[2].all_ok === liveI[2].all_ok - 2);
const ldm = live(); let ldN = 0;
for (const m of ldm.field_maps) for (const e of m.entries) if (e.fact === "person.date_of_birth" && ldN < 13) { e.transform = "date:YYYY-DD-MM"; ldN++; }
const ldmI = scoreWith(ldm).field_maps.instances;
const inSlice = ldmI.reduce((a: number, i: any) => a + i.transform_problems.filter((p: any) => /YYYY-DD-MM/.test(p.why)).length, 0);
t(`real live draft, reviewer's ${ldN} birth-date mappings as YYYY-DD-MM: every one inside the slice fails the exact date check (${inSlice} slice entries)`, ldN === 13 && inSlice > 0 && ldmI.every((i: any, n: number) => i.all_ok <= liveI[n].all_ok) && inSlice === liveI.reduce((a: number, i: any, n: number) => a + (i.all_ok - ldmI[n].all_ok), 0));
t("a draft field whose definition is not in the alias table never counts as correct (unreviewed)", (() => { const c = mutate((c) => { c.canonical_fields.push({ id: "person.d_surname_x", meaning: "Surname", value_type: "text", proposed_by: ["x"] }); for (const e of c.field_maps[0].entries) if (e.fact === "person.d_family_name") e.fact = "person.d_surname_x"; }); const i = fmOf(c)[0]; return verdict(c, "P2-FM-08") === "FAIL" && i.fact_problems.length === 5 && i.fact_problems.every((p: any) => p.decision === "unreviewed"); })());
t("a field defined as a history activity on the present-occupation boxes fails by meaning ('different')", (() => { const c = mutate((c) => { for (const e of c.field_maps[0].entries) if (e.fact === "person.d_occupation") e.fact = "person.d_history_activity"; }); return fmOf(c)[0].fact_problems.every((p: any) => p.decision === "different") && verdict(c, "P2-FM-08") === "FAIL"; })());
t("the same id redefined with another meaning in the configuration fails by meaning, not by name", (() => { const c = mutate((c) => { c.canonical_fields.find((f: any) => f.id === "person.d_occupation").meaning = "Activity during a period of history"; }); return verdict(c, "P2-FM-08") === "FAIL"; })());
t("IMM 5707 marital status with one code changed (Married=6): exact codes FAIL", verdict(mutate((c) => { c.field_maps[0].entries.find((e: any) => e.fact === "person.d_marital_status").transform = "code_list:x (annulled marriage=4, common-law=1, divorced=3, legally separated=6, married=6, single=2, unknown=8, widowed=7)"; }), "P2-FM-07") === "FAIL");
t("a code list that states no labels (00,01,03) cannot show common-law=03: FAILS", verdict(mutate((c) => { c.field_maps[1].entries.find((e: any) => e.fact === "person.d_marital_status").transform = "code_list:imm1295.marital_status (00,01,02,03)"; }), "P2-FM-07") === "FAIL");
t("a code pair followed by a note (Unknown=8; …) is read (scorer defect found on the live draft)", verdict(mutate((c) => { for (const e of c.field_maps[0].entries) if (e.fact === "person.d_marital_status") e.transform = "code_list:x (annulled marriage=4, common-law=1, divorced=3, legally separated=6, married=5, single=2, widowed=7, unknown=8; this list has no Conjugal option)"; }), "P2-FM-07") === "PASS");
t("a selection step before the exact date format passes; a second, different date step fails (trial 1 form)", verdict(mutate((c) => { for (const e of c.field_maps[0].entries) if (e.fact === DOB) e.transform = "select:the subject's record; date:YYYY-MM-DD"; }), "P2-FM-08") === "PASS" && verdict(mutate((c) => { for (const e of c.field_maps[0].entries) if (e.fact === DOB) e.transform = "date:YYYY-MM-DD; date:DD-MM-YYYY"; }), "P2-FM-08") === "FAIL");
t("yes/no codes reversed (yes_no_code:2/1): FAILS", verdict(mutate((c) => { for (const e of c.field_maps[0].entries) if (e.transform === "yes_no_code:1/2") e.transform = "yes_no_code:2/1"; }), "P2-FM-08") === "FAIL");
t("'no children' box drafted without inverting has-children: FAILS", verdict(mutate((c) => { for (const e of c.field_maps[0].entries) if (/derive_inverse/.test(e.transform ?? "")) e.transform = "derive:1 when the subject has children"; }), "P2-FM-08") === "FAIL");
t("D11: an invisible helper box drafted as mapped (instead of form-calculated): FAILS", verdict(mutate((c) => { const e = c.field_maps[1].entries.find((e: any) => e.data_path.includes("FromYr")); Object.assign(e, { outcome: "mapped", person: "form_subject", fact: "relationship.d_start_date", transform: "date_part:year" }); }), "P2-FM-08") === "FAIL");
t("D11: the relationship date drafted for one person is a named dependency, not a wrong person", (() => { const c = mutate((c) => { c.field_maps[1].entries.find((e: any) => e.data_path.endsWith("DateOfMarriage[0]")).person = "subject_spouse_or_partner"; }); const s = score(c); return s.field_maps.instances[2].dependencies.length === 1 && s.field_maps.instances[2].wrong_person.length === 0 && verdict(c, "P2-FM-02") === "PASS"; })());
t("D19: IMM 5707 condition by age only (no minor travelling alone): age rule FAILS", verdict(mutate((c) => { c.forms[1].condition = { subjectKind: "EACH_PERSON", op: "gte", field: "person.age_years", value: 18 }; }), "P2-RQ-03") === "FAIL");
t("D19: a derived field referenced to the date of birth does not overwrite a missing date of birth (scorer defect found on the live draft)", verdict(mutate((c) => { c.derived_fields.push({ id: "person.x_days", calculation: "days_until", inputs: ["person.d_passport_issue"], reference: DOB, executable: true }); }), "P2-RQ-03") === "PASS");
t("D20: IMM 1295 for the principal applicant only, while the partner also applies: forms FAIL", verdict(mutate((c) => { c.forms[0].who = "principal_applicant"; }), "P2-RQ-02") === "FAIL");

// ---- P2-R2-M1 (Codex 15:36Z): the whole transformation sequence is validated, not one step picked out of it.
const r2 = () => JSON.parse(readFileSync(join(P, "p2", "config", "c1-draft-1-live-r2.json"), "utf8"));
const r2S = scoreWith(r2()), r2I = r2S.field_maps.instances;
t("control: the repaired real draft still scores 22/22, 42/42 on each IMM 5707 perspective, 6/7 + 1 named dependency on IMM 1295",
  r2S.summary.PASS === 22 && r2I[0].all_ok === 42 && r2I[1].all_ok === 42 && r2I[2].all_ok === 6 && r2I[2].dependencies.length === 1);
const r2Mut = (match: (e: any) => boolean, to: (t: string) => string, limit = 99) => { const c = r2(); let n = 0; for (const m of c.field_maps) for (const e of m.entries) if (n < limit && match(e)) { e.transform = to(e.transform); n++; } const sc = scoreWith(c); return { n, sc, i: sc.field_maps.instances, fm08: sc.acceptance.find((a: any) => a.id === "P2-FM-08")?.verdict }; };
const trunc = r2Mut((e) => e.fact === "person.date_of_birth", () => "date:YYYY-MM-DD; truncate:4", 13);
const truncSlice = trunc.i.reduce((a: number, x: any) => a + x.transform_problems.filter((p: any) => /truncate:4/.test(p.why)).length, 0);
t(`real repaired draft, the reviewer's exact case: ${trunc.n} birth-date maps as 'date:YYYY-MM-DD; truncate:4' fail the exact check on every slice entry (${truncSlice}); no longer 22/22 or 42/42`,
  trunc.n === 13 && truncSlice === 10 && trunc.fm08 === "FAIL" && trunc.sc.summary.PASS < 22 && trunc.i[0].all_ok === 37 && trunc.i[1].all_ok === 37);
const sliceDob = (to: string) => r2Mut((e) => e.fact === "person.date_of_birth", () => to, 13).i.reduce((a: number, x: any) => a + x.transform_problems.length, 0);
t("an unknown step after the date fails ('date:YYYY-MM-DD; reformat:compact')", sliceDob("date:YYYY-MM-DD; reformat:compact") === 10);
t("a value-changing step before the date fails, even phrased as a selection ('select:first 4 characters; date:YYYY-MM-DD')", sliceDob("select:first 4 characters; date:YYYY-MM-DD") === 10);
t("an arrow-chained extra step fails ('date:YYYY-MM-DD -> substring:0,4')", sliceDob("date:YYYY-MM-DD -> substring:0,4") === 10);
t("a selection with no transformation fails ('select:current record')", sliceDob("select:current record") === 10);
const names = r2Mut((e) => e.fact === "person.family_name" && e.transform === "as_is", () => "as_is; truncate:3");
t(`a family name 'as_is; truncate:3' fails on each slice entry (${names.n} maps changed)`, names.i[0].transform_problems.length === 5 && names.i[1].transform_problems.length === 5 && names.fm08 === "FAIL");
const codes = r2Mut((e) => /^code_list:imm5707\.marital_status/.test(e.transform ?? ""), (t) => t + "; uppercase");
t("a correct code list followed by an extra step ('; uppercase') fails", codes.n > 0 && codes.i[0].transform_problems.length > 0 && codes.fm08 === "FAIL");
const codeNote = r2Mut((e) => /^code_list:imm5707\.marital_status/.test(e.transform ?? ""), (t) => t + "; first 3 characters only");
t("... and so does a note that would change the value ('; first 3 characters only')", codeNote.i[0].transform_problems.length > 0);
const yn = r2Mut((e) => e.transform === "yes_no_code:1/2", () => "yes_no_code:1/2; truncate:1");
t("correct yes/no codes followed by an extra step fail", yn.n > 0 && yn.i[0].transform_problems.length > 0 && yn.fm08 === "FAIL");
t("valid compound control: a selection step, then the exact date (the trial 1 form) passes on the real draft",
  (() => { const v = r2Mut((e) => e.fact === "person.date_of_birth", () => "select:current marriage/common-law relationship with the subject; date:YYYY-MM-DD", 13); return v.i[0].all_ok === 42 && v.i[1].all_ok === 42 && v.sc.summary.PASS === 22; })());
t("valid compound control: a code list with a note on a missing option (after ';' or after '.') passes on the real draft",
  (() => { const a = r2Mut((e) => /^code_list:imm5707\.marital_status/.test(e.transform ?? ""), (t) => t.replace(/\)[^)]*$/, ")") + "; this list has no Conjugal option, so a stored Conjugal status goes to review"); const b = r2Mut((e) => /^code_list:imm5707\.marital_status/.test(e.transform ?? ""), (t) => t.replace(/\)[^)]*$/, ")") + ". This list has no Conjugal option: flag it for review."); return a.i[0].all_ok === 42 && b.i[0].all_ok === 42 && a.sc.summary.PASS === 22 && b.sc.summary.PASS === 22; })());

const stub = JSON.parse(readFileSync(join(P, "p2", "config", "c1-draft-1-stub.json"), "utf8"));
const s = score(stub);
const drafting = s.acceptance.filter((a: any) => a.id !== "P2-CK-04"); // CK-04 is rule-made, not drafted
t(`the stub draft never passes a drafting measure (${JSON.stringify(s.summary)})`, drafting.every((a: any) => a.verdict !== "PASS"));

for (const [n, p] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}`);
const failed = results.filter(([, p]) => !p).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
