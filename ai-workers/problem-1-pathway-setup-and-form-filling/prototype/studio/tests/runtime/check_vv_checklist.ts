// C6.4 checks (M3-B, runtime lane): engine/runtime/case-checklist.ts builds a Visitor visa case's document checklist per
// person from a small synthetic release and the case's answers. Each rule has a passing and a failing case. No database,
// no server, no model call (US$0). Requirements and values are Sample until the immigration expert confirms (P-171).
//   tsx studio/tests/runtime/check_vv_checklist.ts
import { caseChecklist, policeCertificateFresh, POLICE_AGE_SOURCE, type CaseChecklist } from "../../engine/runtime/case-checklist.ts";
import type { Known } from "../../engine/render.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import type { Participant } from "../../engine/runtime/case.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const TODAY = new Date("2026-11-01T12:00:00Z");
const req = (lineage: string, type: string, who: string, extra: Record<string, unknown> = {}) => ({ lineage, document_type: type, document_type_key: type, who, provided_by: "client", base_or_conditional: "base", condition: null, condition_plain: null, source_quote: null, ...extra });
const S = {
  combination: { key: "vv.single" },
  canonical_fields: [{ id: "person.date_of_birth", value_type: "date" }, { id: "person.has_criminal_record", value_type: "yes_no" }, { id: "case.purpose", value_type: "code" }],
  derived_fields: [],
  document_types: [{ key: "passport", name: "Passport" }, { key: "police_certificate", name: "Police certificate" }, { key: "invitation_letter", name: "Invitation letter" }, { key: "birth_certificate", name: "Birth certificate" }, { key: "photo", name: "Photo" }],
  document_requirements: [
    req("passport:each_applicant", "passport", "each_applicant", { alternatives: ["photo"], source_quote: "Sample quote" }),
    req("police:each_adult_18_plus", "police_certificate", "each_adult_18_plus"),
    req("invitation:case", "invitation_letter", "principal_applicant", { base_or_conditional: "conditional", condition: { subjectKind: "CASE", op: "eq", field: "case.purpose", value: "family" }, condition_plain: "the visit is to see family" }),
    req("birth:children", "birth_certificate", "each_dependent_child"),
  ],
} as unknown as Snapshot;
const P = (id: string, role: Participant["role"], applies = true): Participant => ({ subjectId: id, role, label: `Client ${id}`, applies });
const people = [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner"), P("C", "child")];
const known = (pairs: Record<string, unknown>): Known => new Map(Object.entries(pairs).map(([k, value]) => [k, { value, status: "answered" as const, source: "test" }]));
type D = Extract<CaseChecklist, { derived: true }>;
const run = (k: Known, ps = people, key = "vv.single") => caseChecklist(S, key, ps, k, TODAY) as D;
const of = (r: D, who: string) => r.people.find((p) => p.subject === who)!;
const line = (r: D, who: string, doc: string) => of(r, who).lines.find((l) => l.document.key === doc);
const adults = { "A|person.date_of_birth": "1980-05-01", "B|person.date_of_birth": "1982-02-02", "C|person.date_of_birth": "2015-03-03" };

// One list per person on the case (never the case row); each line only for the people it concerns.
{
  const r = run(known(adults));
  ok("C6.4 per person: one checklist for each person on the case, none for the case row", r.people.length === 3 && !r.people.some((p) => p.role === "case"), r.people.map((p) => p.label));
  ok("C6.4 per person: every applicant gets their own passport line", ["A", "B", "C"].every((w) => line(r, w, "passport")?.state === "needed"));
  ok("C6.4 per person (fail): a child's line is never on an adult's list", !!line(r, "C", "birth_certificate") && !line(r, "A", "birth_certificate") && !line(r, "B", "birth_certificate"));
  const out = run(known(adults), [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner", false)]);
  ok("C6.4 per person (fail): a person not applying gets no applicant lines", of(out, "B").lines.length === 0 && of(out, "B").applies === false);
  ok("C6.4: the alternatives and the source quote travel with the line", line(r, "A", "passport")!.alternatives[0]?.name === "Photo" && line(r, "A", "passport")!.quote === "Sample quote");
}
// 18 and over: from the person's birth date on the case; unknown → answer first.
{
  const r = run(known(adults));
  ok("C6.4 adults: the principal and spouse (18+) need a police certificate", line(r, "A", "police_certificate")?.state === "needed" && line(r, "B", "police_certificate")?.state === "needed");
  ok("C6.4 adults (fail): the 11-year-old child does not, and the reason names the age", line(r, "C", "police_certificate")?.state === "not_needed" && /this person is 11/.test(line(r, "C", "police_certificate")!.why));
  const unknown = run(known({ "A|person.date_of_birth": "1980-05-01" }));
  ok("C6.4 adults (fail): with no birth date the line says answer the birth date first", line(unknown, "B", "police_certificate")?.state === "answer_first" && line(unknown, "B", "police_certificate")!.missing.includes("person.date_of_birth"));
  const birthday = run(known({ ...adults, "C|person.date_of_birth": "2008-11-01" }));
  ok("C6.4 adults: turning 18 today counts as 18", line(birthday, "C", "police_certificate")?.state === "needed");
  const eve = run(known({ ...adults, "C|person.date_of_birth": "2008-11-02" }));
  ok("C6.4 adults (fail): 18 tomorrow is still 17 today", line(eve, "C", "police_certificate")?.state === "not_needed");
}
// A conditional line follows the case's answers: needed, not needed, or answer first.
{
  ok("C6.4 condition: a family visit needs the invitation letter on the principal's list", line(run(known({ ...adults, "case|case.purpose": "family" })), "A", "invitation_letter")?.state === "needed");
  const tourism = line(run(known({ ...adults, "case|case.purpose": "tourism" })), "A", "invitation_letter")!;
  ok("C6.4 condition (fail): a tourism visit does not, and says which answer decided it", tourism.state === "not_needed" && /the visit is to see family/.test(tourism.why));
  const open = line(run(known(adults)), "A", "invitation_letter")!;
  ok("C6.4 condition: unanswered → answer first, naming the fact", open.state === "answer_first" && open.missing.includes("case.purpose"), open);
  ok("C6.4 condition: the list changes when the answer changes (dynamic)", line(run(known({ ...adults, "case|case.purpose": "family" })), "A", "invitation_letter")!.state !== tourism.state);
}
// Order and counts: needed first, then answer first, then not needed.
{
  const r = run(known(adults)), a = of(r, "A");
  ok("C6.4 order: needed lines come first, not needed last", a.lines.map((l) => l.state).join() === ["needed", "needed", "answer_first"].join(), a.lines.map((l) => `${l.document.key}:${l.state}`));
  ok("C6.4 counts: needed and answer-first are counted per person", a.needed === 2 && a.answer_first === 1 && of(r, "C").needed === 2);
}
// Police certificate age rule (P-171): no more than 6 months before the date the application is submitted.
{
  const pc = line(run(known(adults)), "A", "police_certificate")!;
  ok("C6.4 police: the police line carries the 6-month rule with IRCC's words, page and date", pc.rule?.kind === "police_age" && pc.rule.months === 6 && pc.rule.source === POLICE_AGE_SOURCE && /no more than 6 months before the date you submit/.test(POLICE_AGE_SOURCE.quote) && POLICE_AGE_SOURCE.read === "2026-10-29");
  ok("C6.4 police (fail): other lines carry no such rule", line(run(known(adults)), "A", "passport")!.rule === null);
  ok("C6.4 police: issued 1 May, submitted 1 Nov → good (exactly 6 months)", policeCertificateFresh("2026-05-01", "2026-11-01").fresh === true);
  const old = policeCertificateFresh("2026-04-30", "2026-11-01");
  ok("C6.4 police (fail): issued 30 Apr, submitted 1 Nov → too old, ask for a new one", old.fresh === false && /more than 6 months/.test(old.why));
  ok("C6.4 police: month ends: issued 31 Aug is good until 28 Feb", policeCertificateFresh("2026-08-31", "2027-02-28").fresh && !policeCertificateFresh("2026-08-31", "2027-03-01").fresh);
  ok("C6.4 police (fail): a certificate dated after submission, or a bad date, is refused with a reason", !policeCertificateFresh("2026-11-02", "2026-11-01").fresh && !policeCertificateFresh("2026-02-30", "2026-11-01").fresh);
}
// Only the Visitor visa in this slice.
{
  const other = caseChecklist(S, "ee.pnp", people, known(adults), TODAY);
  ok("C6.4 (fail): another combination is not derived yet and says so, with no lines", other.derived === false && /not derived yet/.test(other.why));
  ok("C6.4: an empty release gives each person an empty list, not an error", run(known(adults)).people.length === 3 && (caseChecklist({ ...S, document_requirements: [] } as Snapshot, "vv.single", people, known(adults), TODAY) as D).people.every((p) => p.lines.length === 0));
}

process.exitCode = summary() ? 1 : 0;
