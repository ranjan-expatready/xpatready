// C6.4 checks (M3-B, runtime lane): engine/runtime/case-checklist.ts builds a Visitor visa case's document checklist per
// person from a small synthetic release and the case's answers. Each rule has a passing and a failing case. No database,
// no server, no model call (US$0). Requirements and values are Sample until the immigration expert confirms (P-171).
//   tsx studio/tests/check_vv_checklist.ts
import { caseChecklist, duplicateValidity, inReason, issuedWithin, validityProblems, validityRules, whoWords, type CaseChecklist } from "../engine/runtime/case-checklist.ts";
import { checkValue } from "../engine/runtime/case.ts";
import { validate } from "../engine/validate.ts";
import type { Known } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const TODAY = new Date("2026-11-01T12:00:00Z");
const req = (lineage: string, type: string, who: string, extra: Record<string, unknown> = {}) => ({ lineage, document_type: type, document_type_key: type, who, provided_by: "client", base_or_conditional: "base", condition: null, condition_plain: null, source_quote: null, ...extra });
const S = {
  combination: { key: "vv.single" },
  canonical_fields: [{ id: "person.date_of_birth", value_type: "date" }, { id: "person.has_criminal_record", value_type: "yes_no" }, { id: "case.purpose", value_type: "code" }, { id: "case.application_date", value_type: "date" }, { id: "case.travel_insurance", value_type: "yes_no" }, { id: "person.employed", value_type: "yes_no" }, { id: "person.age_years", value_type: "number" }],
  field_maps: [],
  derived_fields: [{ id: "person.age_years", calculation: "age_in_years", inputs: ["person.date_of_birth"], reference: "case.application_date", executable: true }],
  placements: [{ fact: "person.date_of_birth", question_text: "Date of birth" }, { fact: "case.application_date", question_text: "Date the application is submitted" }],
  checks: [{ id: "VV_POLICE_6_MONTHS", group: "document_validity", applies_to: "police_certificate", severity: "warn", message: "For the country where the person lives now: issued no more than 6 months before the application is submitted.",
    source_quote: "no more than 6 months before the date you submit your application", condition: { op: "issued_within_months", months: 6, before: "case.application_date", cite: { page: "Police certificates: when you need them", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/police-certificates/when.html", read: "2026-10-29" } } }],
  document_types: [{ key: "passport", name: "Passport" }, { key: "police_certificate", name: "Police certificate" }, { key: "invitation_letter", name: "Invitation letter" }, { key: "birth_certificate", name: "Birth certificate" }, { key: "photo", name: "Photo" }, { key: "marriage_certificate", name: "Marriage certificate" }, { key: "insurance", name: "Travel insurance" }, { key: "employment_letter", name: "Employment letter" }, { key: "consent", name: "Consent letter" }, { key: "senior_letter", name: "Senior letter" }],
  document_requirements: [
    req("passport:each_applicant", "passport", "each_applicant", { alternatives: ["photo"], source_quote: "Sample quote" }),
    req("police:each_adult_18_plus", "police_certificate", "each_adult_18_plus"),
    req("invitation:case", "invitation_letter", "principal_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "CASE", op: "eq", field: "case.purpose", value: "family" }, condition_plain: "the visit is to see family" }),
    req("birth:children", "birth_certificate", "each_dependent_child"),
    req("marriage:spouse", "marriage_certificate", "spouse_or_partner"),
  ],
} as unknown as Snapshot;
const P = (id: string, role: Participant["role"], applies = true): Participant => ({ subjectId: id, role, label: `Client ${id}`, applies });
const people = [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner"), P("C", "child")];
const known = (pairs: Record<string, unknown>): Known => new Map(Object.entries(pairs).map(([k, value]) => [k, { value, status: "answered" as const, source: "test" }]));
type D = Extract<CaseChecklist, { derived: true }>;
const run = (k: Known, ps = people, key = "vv.single") => caseChecklist(S, key, ps, k, TODAY) as D;
const of = (r: D, who: string) => r.people.find((p) => p.subject === who)!;
const ALL = (p: D["people"][number]) => [...p.lines, ...p.waiting, ...p.not_needed];
const line = (r: D, who: string, doc: string) => ALL(of(r, who)).find((l) => l.document.key === doc);
const adults = { "A|person.date_of_birth": "1980-05-01", "B|person.date_of_birth": "1982-02-02", "C|person.date_of_birth": "2015-03-03" };

// One list per person on the case (never the case row); each line only for the people it concerns.
{
  const r = run(known(adults));
  // C6.4 (a), review minor 2: a condition reads inside a reason; only a common opening word is lower-cased.
  ok("C6.4 (a) words pass: \"The applicant is married.\" reads \"the applicant is married\" (no doubled full stop)", inReason("The applicant is married.") === "the applicant is married" && inReason("A child under 18 travelling alone") === "a child under 18 travelling alone");
  ok("C6.4 (a) words fail: a name, a nationality or a form number keeps its capital; empty is none", inReason("Venezuelan citizens only.") === "Venezuelan citizens only" && inReason("IMM 5257 is filed on paper") === "IMM 5257 is filed on paper" && inReason("  ") === null && inReason(null) === null);
  ok("C6.4 (a) whose words: each applicant, once for the couple; an unknown holder is named, never hidden", whoWords("each_applicant") === "For each applicant" && whoWords("couple_once") === "Once for the couple" && whoWords("mystery_role") === "For: mystery_role");
  ok("C6.4 per person: one checklist for each person on the case, none for the case row", r.people.length === 3 && !r.people.some((p) => p.role === "case"), r.people.map((p) => p.label));
  ok("C6.4 per person: every applicant gets their own passport line", ["A", "B", "C"].every((w) => line(r, w, "passport")?.need === "needed"));
  ok("C6.4 per person (fail): a child's line is never on an adult's list", !!line(r, "C", "birth_certificate") && !line(r, "A", "birth_certificate") && !line(r, "B", "birth_certificate"));
  const out = run(known(adults), [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner", false)]);
  ok("C6.4 per person (fail): a person not applying gets no applicant lines", ALL(of(out, "B")).length === 0 && of(out, "B").applies === false);
  ok("C6.4: the alternatives and the source quote travel with the line", line(r, "A", "passport")!.alternatives[0]?.name === "Photo" && line(r, "A", "passport")!.quote === "Sample quote");
}
// 18 and over: from the person's birth date on the case; unknown → answer first.
{
  const r = run(known(adults));
  ok("C6.4 adults: the principal and spouse (18+) need a police certificate", line(r, "A", "police_certificate")?.need === "needed" && line(r, "B", "police_certificate")?.need === "needed");
  ok("C6.4 adults (fail): the 11-year-old child does not, and the reason names the age", line(r, "C", "police_certificate")?.need === "not_needed" && /this person is 11 on 2026-11-01/.test(line(r, "C", "police_certificate")!.reason));
  const unknown = run(known({ "A|person.date_of_birth": "1980-05-01" }));
  ok("C6.4 adults (fail): with no birth date the line says answer the birth date first", line(unknown, "B", "police_certificate")?.need === "answer_first" && line(unknown, "B", "police_certificate")!.missing.some((m) => m.key === "person.date_of_birth"));
  const birthday = run(known({ ...adults, "C|person.date_of_birth": "2008-11-01" }));
  ok("C6.4 adults: turning 18 today counts as 18", line(birthday, "C", "police_certificate")?.need === "needed");
  const eve = run(known({ ...adults, "C|person.date_of_birth": "2008-11-02" }));
  ok("C6.4 adults (fail): 18 tomorrow is still 17 today", line(eve, "C", "police_certificate")?.need === "not_needed");
}
// A conditional line follows the case's answers: needed, not needed, or answer first.
{
  ok("C6.4 condition: a family visit needs the invitation letter on the principal's list", line(run(known({ ...adults, "case|case.purpose": "family" })), "A", "invitation_letter")?.need === "needed");
  const tourism = line(run(known({ ...adults, "case|case.purpose": "tourism" })), "A", "invitation_letter")!;
  ok("C6.4 condition (fail): a tourism visit does not, and says which answer decided it", tourism.need === "not_needed" && /the visit is to see family/.test(tourism.reason));
  const open = line(run(known(adults)), "A", "invitation_letter")!;
  ok("C6.4 condition: unanswered → answer first, naming the fact", open.need === "answer_first" && open.missing.some((m) => m.key === "case.purpose"), open);
  ok("C6.4 condition: the list changes when the answer changes (dynamic)", line(run(known({ ...adults, "case|case.purpose": "family" })), "A", "invitation_letter")!.need !== tourism.need);
}
// qa G23: a line for a role appears once that person is added to the case.
{
  const alone = run(known(adults), [P("case", "case"), P("A", "principal")]);
  ok("C6.4 G23 (fail): with no spouse on the case nobody has a marriage certificate line", alone.people.every((p) => !ALL(p).some((l) => l.document.key === "marriage_certificate")));
  ok("C6.4 G23: once a spouse is added, the marriage certificate is on the spouse's list", line(run(known(adults)), "B", "marriage_certificate")?.need === "needed");
}
// Order and counts: needed first, then answer first, then not needed.
{
  const r = run(known(adults)), a = of(r, "A");
  ok("C6.4 lists: lines holds what the person needs, waiting what an answer decides first", a.lines.every((l) => l.need === "needed") && a.waiting.every((l) => l.need === "answer_first") && a.lines.length === 2 && a.waiting.length === 1, ALL(a).map((l) => `${l.document.key}:${l.need}`));
  const all = r.people.flatMap(ALL);
  ok("C6.4 pack 4 shape: every line has an id, document type, label, the team's state Not requested, a reason and required; storage is Stand-in SI-14", r.stand_in === "SI-14" && all.every((l) => l.id === `${r.people.find((p) => ALL(p).includes(l))!.subject}:${l.lineage}` && l.document_type === l.document.key && l.label === l.document.name && l.state === "not_requested" && l.reason.length > 5 && l.required === (l.need === "needed") && l.documents.length === 0));
  ok("C6.4 pack 4 shape (fail): a line not needed is not in lines (pack C6.4-7, C6.4-9)", !of(r, "C").lines.some((l) => l.document.key === "police_certificate") && of(r, "C").not_needed.some((l) => l.document.key === "police_certificate"));
  ok("C6.4 counts: needed and answer-first are counted per person", a.needed === 2 && a.answer_first === 1 && of(r, "C").needed === 2);
}
// Police certificate age rule (P-171), carried as release data (a document_validity check), matched on the document type key.
{
  const pc = line(run(known(adults)), "A", "police_certificate")!;
  ok("C6.4 R4: the police line carries the release's 6-month rule with IRCC's words, page and date", pc.rule?.kind === "issued_within_months" && pc.rule.months === 6 && pc.rule.check === "VV_POLICE_6_MONTHS" && /no more than 6 months before the date you submit/.test(pc.rule.source.quote) && pc.rule.source.read === "2026-10-29" && /canada\.ca/.test(pc.rule.source.url), pc.rule);
  ok("C6.4 R4 (fail): other lines carry no such rule", line(run(known(adults)), "A", "passport")!.rule === null);
  const renamed = { ...S, document_types: (S.document_types as { key: string; name: string }[]).map((t) => t.key === "police_certificate" ? { ...t, name: "Certificate of good conduct" } : t) } as Snapshot;
  ok("C6.4 R4: matched on the document type key, not on the word \"police\" in its name", (caseChecklist(renamed, "vv.single", people, known(adults), TODAY) as D).people[0].lines.find((l) => l.document.key === "police_certificate")?.rule?.months === 6);
  const none = { ...S, checks: [] } as Snapshot;
  ok("C6.4 R4 (fail): a release without the rule puts no rule on the police line (nothing is coded in the engine)", (caseChecklist(none, "vv.single", people, known(adults), TODAY) as D).people[0].lines.find((l) => l.document.key === "police_certificate")?.rule === null);
  const eight = { ...S, checks: [{ ...(S.checks[0] as object), condition: { ...(S.checks[0] as { condition: object }).condition, months: 8 } }] } as Snapshot;
  ok("C6.4 R4: the months come from the release (8 in the release → 8 on the line)", validityRules(eight).get("police_certificate")?.months === 8);
  const bad = { ...S, checks: [{ ...(S.checks[0] as object), source_quote: null }] } as Snapshot;
  ok("C6.4 R4 (fail): a rule without its source quote is not used (P-170)", validityRules(bad).size === 0);
  const rule = { months: 6 };
  ok("C6.4 police: issued 1 May, submitted 1 Nov → good (exactly 6 months)", issuedWithin(rule, "2026-05-01", "2026-11-01").fresh === true);
  const old = issuedWithin(rule, "2026-04-30", "2026-11-01");
  ok("C6.4 police (fail): issued 30 Apr, submitted 1 Nov → too old, ask for a new one", old.fresh === false && /more than 6 months/.test(old.why));
  ok("C6.4 police: month ends: issued 31 Aug is good until 28 Feb", issuedWithin(rule, "2026-08-31", "2027-02-28").fresh && !issuedWithin(rule, "2026-08-31", "2027-03-01").fresh);
  ok("C6.4 police (fail): a document dated after submission, or a bad date, is refused with a reason", !issuedWithin(rule, "2026-11-02", "2026-11-01").fresh && !issuedWithin(rule, "2026-02-30", "2026-11-01").fresh);
  const lib = (S.canonical_fields as { id: string; value_type: string }[]).map((f) => ({ key: f.id, valueType: f.value_type }));
  const v = (x: Snapshot) => validate({ placements: [], forms: [], field_maps: [], rules: [], document_requirements: [], sections: [], ...x } as Snapshot, lib, []).filter((p) => p.where === "Checks");
  ok("C6.4 R4: a well-formed rule raises no release warning", v(S).length === 0, v(S));
  ok("C6.4 R4 (fail): a rule with no citation raises a release warning saying why", v(bad).some((p) => /not used: .*P-170/.test(p.message)), v(bad));
}
// R3 / B-M1: whose list a line goes on is its own "whose document"; the condition's subject decides whose answers count.
{
  const S3 = { ...S, document_requirements: [
    req("insurance:each", "insurance", "each_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "CASE", op: "eq", field: "case.travel_insurance", value: true }, condition_plain: "the family buys travel insurance" }),
    req("employment:principal", "employment_letter", "principal_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "SPOUSE", op: "eq", field: "person.employed", value: false }, condition_plain: "the spouse is not employed" }),
    req("consent:child", "consent", "each_dependent_child", { base_or_conditional: "conditional", condition: { subjectKind: "PRINCIPAL", op: "eq", field: "person.employed", value: true }, condition_plain: "the principal is employed" }),
  ] } as Snapshot;
  const r = caseChecklist(S3, "vv.single", people, known({ ...adults, "case|case.travel_insurance": true, "B|person.employed": false, "A|person.employed": true }), TODAY) as D;
  const has = (who: string, k: string) => ALL(of(r, who)).find((l) => l.document.key === k);
  ok("C6.4 R3: a case-level condition on an each-applicant line puts the line on every applicant's list", ["A", "B", "C"].every((w) => has(w, "insurance")?.need === "needed"), r.people.map((p) => p.lines.map((l) => l.document.key)));
  ok("C6.4 R3 (fail): it is not only on the principal's list (the earlier fault)", !!has("B", "insurance") && !!has("C", "insurance"));
  ok("C6.4 R3: a line about the spouse's answers stays on the principal's list, decided by the spouse's answer", has("A", "employment_letter")?.need === "needed" && !has("B", "employment_letter"));
  const working = caseChecklist(S3, "vv.single", people, known({ ...adults, "B|person.employed": true }), TODAY) as D;
  ok("C6.4 R3 (fail): the spouse employed → the principal's employment letter is not needed", ALL(of(working, "A")).find((l) => l.document.key === "employment_letter")?.need === "not_needed");
  ok("C6.4 R3: a child's line decided by the principal's answer is on the child's list only", has("C", "consent")?.need === "needed" && !has("A", "consent"));
  // Devin on #1073: a line waiting on another person's answer names that person, so the panel's link reaches the question.
  const unanswered = caseChecklist(S3, "vv.single", people, known(adults), TODAY) as D;
  const wait = of(unanswered, "A").waiting.find((l) => l.document.key === "employment_letter");
  ok("C6.4 (a) link: the principal's line that waits on the spouse's answer names the spouse as the one to answer (on: person, subject B)", !!wait && wait.missing.some((m) => m.key === "person.employed" && m.on === "person" && m.subject === "B"), wait?.missing);
  ok("C6.4 (a) link (fail): it does not name the principal, the line's holder, nor the case", !!wait && !wait.missing.some((m) => m.subject === "A" || m.on === "case"), wait?.missing);
  const noSpouse = caseChecklist(S3, "vv.single", [P("case", "case"), P("A", "principal")], known(adults), TODAY) as D;
  ok("C6.4 R3 (fail): with no spouse on the case, a line about the spouse is not needed and says so", /no.*spouse|none on the case/.test(ALL(of(noSpouse, "A")).find((l) => l.document.key === "employment_letter")?.reason ?? ""));
}
// B-M3: a calculated field is never asked; its input questions are, in words. Ages use the application date.
{
  const S4 = { ...S, document_requirements: [req("senior:each", "senior_letter", "each_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "EACH_APPLICANT", op: "gte", field: "person.age_years", value: 60 }, condition_plain: "the person is 60 or older" })] } as Snapshot;
  const open = (caseChecklist(S4, "vv.single", people, known(adults), TODAY) as D).people[0].waiting[0];
  ok("C6.4 B-M3: answer first names the input question (the application date), never person.age_years", open.need === "answer_first" && open.missing.some((m) => m.key === "case.application_date" && m.question === '"Date the application is submitted"') && !open.missing.some((m) => m.key === "person.age_years"), open);
  ok("C6.4 B-M3 (fail): the reason shows question words, not keys", /"Date the application is submitted"/.test(open.reason) && !/case\.application_date/.test(open.reason), open.reason);
  const turning = run(known({ ...adults, "C|person.date_of_birth": "2008-12-01", "case|case.application_date": "2026-12-15" }));
  ok("C6.4 ages: 18 by the application date counts (both age paths use the same date)", line(turning, "C", "police_certificate")?.need === "needed" && turning.ages_on === "2026-12-15", line(turning, "C", "police_certificate"));
  ok("C6.4 ages (fail): with no application date the ages are on today and the answer says so", run(known(adults)).ages_on === "2026-11-01" && /today/.test(run(known(adults)).ages_on_why));
  ok("C6.4 B-M3: an application date in 1900 or 2200 has a problem (so it is not used)", checkValue(S, "case.application_date", "1900-01-01", TODAY).length > 0 && checkValue(S, "case.application_date", "2200-01-01", TODAY).length > 0);
  ok("C6.4 B-M3 (fail): a near application date has none", checkValue(S, "case.application_date", "2026-12-15", TODAY).length === 0 && checkValue(S, "case.application_date", "2024-11-01", TODAY).length === 0);
}
// Minors: a document condition shows answer first; duplicate lines merge; an empty release says it is empty.
{
  const S5 = { ...S, document_requirements: [
    req("marriage:doc", "marriage_certificate", "principal_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "DOCUMENT", op: "exists", field: "document.marriage_date" }, condition_plain: "the passport shows a married name" }),
    req("passport:case", "passport", "case"), req("passport:principal", "passport", "principal_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "CASE", op: "eq", field: "case.purpose", value: "family" }, condition_plain: "family visit" }),
  ] } as Snapshot;
  const a = of(caseChecklist(S5, "vv.single", people, known(adults), TODAY) as D, "A");
  const m = ALL(a).find((l) => l.document.key === "marriage_certificate");
  ok("C6.4 minor: a line with a condition about a document is shown as answer first, not dropped", m?.need === "answer_first" && /document/.test(m.reason), a.lines);
  const pp = ALL(a).filter((l) => l.document.key === "passport");
  ok("C6.4 minor (fail): the case's passport line and the principal's own are one line, the other named in also_from", pp.length === 1 && pp[0].need === "needed" && pp[0].also_from.length === 1, pp);
  const empty = caseChecklist({ ...S, document_requirements: [] } as Snapshot, "vv.single", people, known(adults), TODAY) as D;
  ok("C6.4 minor: an empty release says so rather than looking like nothing is needed", empty.empty_release === true && /does not mean nothing is needed/.test(empty.basis));
  ok("C6.4 minor (fail): a release with lines is not marked empty", run(known(adults)).empty_release === false);
}
// Second breaker round (fa2fab91): M1 spaces around a date, M2 a rule the release check refuses, and the Minors.
{
  const padded = run(known({ ...adults, "A|person.date_of_birth": " 1980-05-01 ", "case|case.application_date": " 2026-11-01" }));
  ok("C6.4 break M1: a birth date saved with spaces is read (its checks trim): the police line is needed, not stuck on answer first", line(padded, "A", "police_certificate")?.need === "needed" && padded.ages_on === "2026-11-01", line(padded, "A", "police_certificate"));
  ok("C6.4 break M1 (fail): a date with spaces has no problem in its own check, so nothing would ask for it again", checkValue(S, "person.date_of_birth", " 1980-05-01 ", TODAY).length === 0);
  const after = run(known({ ...adults, "B|person.date_of_birth": "2027-01-01", "case|case.application_date": "2026-12-01" }));
  const pb = line(after, "B", "police_certificate")!;
  ok("C6.4 break m6: a birth date after the application date says check both, not answer the birth date again", pb.need === "answer_first" && pb.missing.every((m) => m.answered) && /check .*Date of birth.* and .*Date the application is submitted/.test(pb.reason), pb.reason);
  const c0 = S.checks[0] as { condition: { cite: object } } & Record<string, unknown>;
  const lib = new Set((S.canonical_fields as { id: string }[]).map((f) => f.id)), docs = new Set((S.document_types as { key: string }[]).map((t) => t.key));
  const noCite = { ...S, checks: [{ ...c0, condition: { ...c0.condition, cite: undefined } }] } as Snapshot;
  ok("C6.4 break M2: a rule with no page, address or date read is not used (as the release check says)", validityRules(noCite).size === 0 && validityProblems(noCite.checks[0], (f) => lib.has(f), docs).some((w) => /P-170/.test(w)));
  const otherBefore = { ...S, checks: [{ ...c0, condition: { ...c0.condition, before: "case.not_a_field" } }] } as Snapshot;
  const blank = { ...S, checks: [{ ...c0, source_quote: "   " }] } as Snapshot;
  ok("C6.4 break M2 (fail): a rule measured to an unknown field, or with a blank quote, is not used either", validityRules(otherBefore).size === 0 && validityRules(blank).size === 0 && validityRules(S).size === 1);
  const twice = { ...S, checks: [c0, { ...c0, id: "VV_POLICE_AGAIN", condition: { ...c0.condition, months: 3 } }] } as Snapshot;
  ok("C6.4 break m1: two rules for one document type: neither is used, and duplicateValidity names it for the release check", validityRules(twice).size === 0 && duplicateValidity(twice.checks).join() === "police_certificate");
  const huge = { ...S, checks: [{ ...c0, condition: { ...c0.condition, months: 100000 } }] } as Snapshot;
  const js = { ...S, checks: [{ ...c0, condition: { ...c0.condition, cite: { ...(c0.condition.cite as object), url: "javascript:alert(1)" } } }] } as Snapshot;
  const tag = { ...S, checks: [{ ...c0, condition: { ...c0.condition, cite: { ...(c0.condition.cite as object), page: "<script>x</script>" } } }] } as Snapshot;
  ok("C6.4 break m2: 100000 months, a javascript: address or markup in the page name is refused", validityRules(huge).size === 0 && validityRules(js).size === 0 && validityRules(tag).size === 0);
  ok("C6.4 break m10: the rule on the line says it is Sample", /Sample/.test(line(run(known(adults)), "A", "police_certificate")!.rule!.status));
  const S7 = { ...S, document_requirements: [req("passport:case", "passport", "case", { base_or_conditional: "conditional", condition: { subjectKind: "CASE", op: "eq", field: "case.purpose", value: "family" }, condition_plain: "family visit" }), req("passport:principal", "passport", "principal_applicant")] } as Snapshot;
  const merged = ALL(of(caseChecklist(S7, "vv.single", people, known({ ...adults, "case|case.purpose": "family" }), TODAY) as D, "A")).filter((l) => l.document.key === "passport");
  ok("C6.4 break m7: merged lines are Always when either requirement is", merged.length === 1 && merged[0].base === true, merged);
  ok("C6.4 break m8: the 5-year bound is by date: 2031-11-01 has no problem, 2031-11-02 has one", checkValue(S, "case.application_date", "2031-11-01", TODAY).length === 0 && checkValue(S, "case.application_date", "2031-11-02", TODAY).length > 0 && checkValue(S, "case.application_date", "2021-10-31", TODAY).length > 0);
}
// Only the Visitor visa in this slice.
{
  const other = caseChecklist(S, "ee.pnp", people, known(adults), TODAY);
  ok("C6.4 (fail): another combination is not derived yet and says so, with no lines", other.derived === false && /not derived yet/.test(other.why));
  ok("C6.4: an empty release gives each person an empty list, not an error", run(known(adults)).people.length === 3 && (caseChecklist({ ...S, document_requirements: [] } as Snapshot, "vv.single", people, known(adults), TODAY) as D).people.every((p) => p.lines.length === 0));
}

// C7.7 (contract item (c), Devin on #680): the placement moves an unanswered once-per-case input to the filing, but an
// answer saved on the person before its placement became once per case still counts as answered.
{
  const S8 = { ...S, placements: [{ fact: "person.date_of_birth", question_text: "Date of birth", repeats: "once_per_case" }, { fact: "case.application_date", question_text: "Date the application is submitted" }],
    document_requirements: [req("senior:each", "senior_letter", "each_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "EACH_APPLICANT", op: "gte", field: "person.age_years", value: 60 }, condition_plain: "the person is 60 or older" })] } as unknown as Snapshot;
  const waitA = (k: Known) => of(caseChecklist(S8, "vv.single", people, k, TODAY) as D, "A").waiting.find((l) => l.document.key === "senior_letter");
  // Both inputs answered but no age comes out (born after the application date): the calculated field is expanded into
  // its inputs, which must read as answered (check them), not as questions still to answer.
  const saved = waitA(known({ "A|person.date_of_birth": "2030-01-01", "case|case.application_date": "2026-12-01" }))?.missing ?? [];
  ok("C7.7 (c) pass: an input answered on the person still counts after its placement became once per case (the checklist says check, never answer again)", saved.length === 2 && saved.every((m) => m.answered), saved);
  const none = waitA(known({}))?.missing ?? [];
  ok("C7.7 (c) fail: unanswered anywhere, the once-per-case input is still asked", none.some((m) => m.key === "person.date_of_birth" && !m.answered), none);
}

// B102 (A6, BR-8): each person's age as the lines read it, on the release's worked-out reference date (the application
// date), or what to answer first. Sample (how age counts: Unconfirmed: no counsel).
{
  // The release's minor line reads person.age_years (break MA1: the age line follows the value the lines read).
  const minorLine = req("letter:each_applicant", "invitation_letter", "each_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "PERSON", op: "lt", field: "person.age_years", value: 18 }, condition_plain: "a child under 18" });
  const S6 = { ...S, document_requirements: [...(S as unknown as { document_requirements: unknown[] }).document_requirements, minorLine] } as unknown as Snapshot;
  const age = (k: Known, who: string, snap: Snapshot = S6) => (caseChecklist(snap, "vv.single", people, k, TODAY) as D).people.find((p) => p.subject === who)!.age;
  const a = age(known({ "C|person.date_of_birth": "2016-11-01", "case|case.application_date": "2026-11-01" }), "C");
  ok("C6.4 B102 BR-8 pass: a child born 2016-11-01 is 10 on the application date 2026-11-01, worked out from the release's value", a.years === 10 && a.on === "2026-11-01" && a.worked_out && a.why === "Age 10 on 2026-11-01 (the application date)", a);
  const eve = age(known({ "C|person.date_of_birth": "2008-11-02", "case|case.application_date": "2026-11-01" }), "C");
  ok("C6.4 B102 BR-8 pass and fail: one day short of the 18th birthday on the application date, the age is 17, not 18", eve.years === 17, eve);
  const noDate = age(known({ "C|person.date_of_birth": "2016-11-01" }), "C");
  ok("C6.4 B102 BR-8 fail: with no application date the age is not guessed from today; it asks for the date first", noDate.years === null && /^Age: answer "Date the application is submitted" first\.$/.test(noDate.why), noDate);
  const noBirth = age(known({ "case|case.application_date": "2026-11-01" }), "C");
  ok("C6.4 B102 BR-8 fail: with no date of birth the age asks for it first", noBirth.years === null && /^Age: answer "Date of birth" first\.$/.test(noBirth.why), noBirth);
  const after = age(known({ "C|person.date_of_birth": "2027-01-01", "case|case.application_date": "2026-11-01" }), "C");
  ok("C6.4 B102 BR-8 fail: a birth after the application date gives no age and says to check both dates", after.years === null && /^Age: check .* together they give no age/.test(after.why), after);
  // Break MA1: a second worked-out age that sorts first ("person.age_on_arrival", on the first day of the stay) and that
  // no line reads does not decide the age line.
  const two = { ...S6, derived_fields: [{ id: "person.age_on_arrival", calculation: "age_in_years", inputs: ["person.date_of_birth"], reference: "case.intended_stay_from", executable: true }, ...(S6 as unknown as { derived_fields: unknown[] }).derived_fields] } as unknown as Snapshot;
  const ma1 = age(known({ "C|person.date_of_birth": "2008-11-02", "case|case.application_date": "2026-11-01", "case|case.intended_stay_from": "2026-12-01" }), "C", two);
  ok("C6.4 B102 break MA1 pass and fail: the age line reads the worked-out age the lines read (17 on the application date), not another that sorts first (18 on arrival)", ma1.years === 17 && ma1.on === "2026-11-01", ma1);
  // Review m3: a release whose lines read an age on another date measures and names that date, never the constant.
  const arrival = { ...S6, derived_fields: [{ id: "person.age_years", calculation: "age_in_years", inputs: ["person.date_of_birth"], reference: "case.intended_stay_from", executable: true }], placements: [...(S6 as unknown as { placements: unknown[] }).placements, { fact: "case.intended_stay_from", question_text: "Planned first day of the stay in Canada" }] } as unknown as Snapshot;
  const m3 = age(known({ "C|person.date_of_birth": "2008-11-02", "case|case.application_date": "2026-11-01", "case|case.intended_stay_from": "2026-12-01" }), "C", arrival);
  ok("C6.4 B102 review m3 pass: an age worked out on the first day of the stay is measured on it and says so", m3.years === 18 && m3.on === "2026-12-01" && /\("Planned first day of the stay in Canada"\)$/.test(m3.why), m3);
  const noRead = age(known({ "C|person.date_of_birth": "2016-11-01" }), "C", S);
  ok("C6.4 B102 break MA1 fail: a worked-out age no line reads is not used for the age line", !noRead.worked_out, noRead);
  const plain = { ...S, derived_fields: [] } as unknown as Snapshot;
  const t = (caseChecklist(plain, "vv.single", people, known({ "C|person.date_of_birth": "2016-11-01" }), TODAY) as D).people.find((p) => p.subject === "C")!.age;
  ok("C6.4 B102 BR-8 pass: a release that works out no age shows the age the 18-or-older lines use, naming today", t.years === 10 && !t.worked_out && /today: the application date is not answered yet/.test(t.why), t);
}

process.exitCode = summary() ? 1 : 0;
