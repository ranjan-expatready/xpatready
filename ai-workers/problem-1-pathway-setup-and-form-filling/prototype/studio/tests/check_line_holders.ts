// Q2 on #325 (runtime lane, M3-B2; BR-3 "conditions on that person's facts"; C6.4 review R3): one rule for whose list a
// document line goes on, shared by Preview (engine/render.ts), the Documents tab (engine/sources.ts checklist) and a
// case's checklist (engine/runtime/case-checklist.ts). The line's own "whose document" names its holders; its
// condition's subject only decides whose answers count. A passing and a failing case each. No database (US$0).
//   tsx studio/tests/check_line_holders.ts
import { conditionSubjects, lineCondition, lineHolders, render, type Known, type Person } from "../engine/render.ts";
import { caseChecklist } from "../engine/runtime/case-checklist.ts";
import type { Participant } from "../engine/runtime/case.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { checklist } from "../engine/sources.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const req = (lineage: string, key: string, who: string, condition: object | null, plain: string | null) => ({ lineage, document_type: key, document_type_key: key, who, provided_by: "client", base_or_conditional: condition ? "conditional" : "base", condition, condition_plain: plain, source_quote: null, status: "PUBLISHED", origin: "HUMAN" });
const S = {
  combination: { key: "vv.single", participants: [{ role: "principal", min: 1, max: 1, label: "Principal" }, { role: "spouse_or_partner", min: 0, max: 1, label: "Spouse" }, { role: "child", min: 0, max: 2, label: "Child" }] },
  canonical_fields: [{ id: "person.employed", value_type: "yes_no" }, { id: "case.purpose", value_type: "code" }, { id: "document.marriage_date", value_type: "date" }],
  derived_fields: [], field_maps: [], placements: [], forms: [], checks: [], rules: [], sections: [],
  document_types: [{ key: "employment_letter", name: "Employment letter" }, { key: "insurance", name: "Travel insurance" }, { key: "marriage_certificate", name: "Marriage certificate" }, { key: "consent", name: "Consent letter" }],
  document_requirements: [
    req("employment:principal", "employment_letter", "principal_applicant", { subjectKind: "SPOUSE", op: "eq", field: "person.employed", value: false }, "the spouse is not employed"),
    req("insurance:each", "insurance", "each_applicant", { subjectKind: "CASE", op: "eq", field: "case.purpose", value: "family" }, "a family visit"),
    req("marriage:principal", "marriage_certificate", "principal_applicant", { subjectKind: "DOCUMENT", op: "exists", field: "document.marriage_date" }, "the passport shows a married name"),
    req("consent:child", "consent", "each_dependent_child", { subjectKind: "PRINCIPAL", op: "eq", field: "person.employed", value: true }, "the principal is employed"),
  ],
} as unknown as Snapshot;
const persons: Person[] = [{ id: "A", role: "principal", label: "A", applies: true }, { id: "B", role: "spouse_or_partner", label: "B", applies: true }, { id: "C", role: "child", label: "C", applies: true }];
const known = (pairs: Record<string, unknown>): Known => new Map(Object.entries(pairs).map(([k, value]) => [k, { value, status: "answered" as const, source: "test" }]));

// The two rules.
ok("Q2 holders pass: a line's holders are its own \"who\" (the principal's line stays the principal's)", lineHolders(persons, "principal_applicant").join() === "A" && lineHolders(persons, "each_applicant").join() === "A,B,C");
ok("Q2 subjects: the condition's subject decides whose answers count: SPOUSE → the spouse, CASE → the case, DOCUMENT → a document", (conditionSubjects(persons, "A", "SPOUSE") as string[]).join() === "B" && (conditionSubjects(persons, "C", "CASE") as string[]).join() === "case" && conditionSubjects(persons, "A", "DOCUMENT") === "document");
ok("Q2 subjects (fail): an each-applicant condition is the holder's own, never someone else's", (conditionSubjects(persons, "B", "EACH_APPLICANT") as string[]).join() === "B" && (conditionSubjects(persons, "C", "DEPENDENT") as string[]).join() === "C");
ok("Q2 condition (fail): a spouse condition with no spouse on the case is not needed, and says who is missing", lineCondition(S, known({}), persons.filter((p) => p.id !== "B"), "A", S.document_requirements[0].condition).applies === false);

// Preview (render) puts each line where the case's checklist does.
const k = known({ "B|person.employed": false, "A|person.employed": true, "case|case.purpose": "family" });
const pre = render(S, persons, k).checklist as { lineage: string; person: string; status: string }[];
const at = (lineage: string) => pre.filter((x) => x.lineage === lineage).map((x) => x.person).sort().join();
ok("Q2 Preview pass: the principal's employment letter (about the spouse's job) is on the principal's list, decided by the spouse's answer", at("employment:principal") === "A" && pre.find((x) => x.lineage === "employment:principal")?.status === "Needed");
ok("Q2 Preview (fail): it is not on the spouse's list (the earlier rule put it there)", !pre.some((x) => x.lineage === "employment:principal" && x.person === "B"));
ok("Q2 Preview pass: a case-condition line for each applicant is on every applicant's list", at("insurance:each") === "A,B,C");
ok("Q2 Preview: a line whose condition is about a document is listed as Cannot tell yet, not dropped", pre.find((x) => x.lineage === "marriage:principal")?.status === "Cannot tell yet");
ok("Q2 Preview (fail): the child's consent letter (about the principal's job) is on the child's list only", at("consent:child") === "C");

// The Documents tab (sources.checklist, by role) and the case's checklist agree with Preview.
const tab = checklist(S);
const roles = (lineage: string) => tab.filter((g) => g.lines.some((l) => l.lineage === lineage)).map((g) => g.role).sort().join();
ok("Q2 Documents tab pass: the employment letter is under the principal, the consent letter under the child, the document-condition line kept", roles("employment:principal") === "principal" && roles("consent:child") === "child" && roles("marriage:principal") === "principal");
ok("Q2 Documents tab (fail): neither line is under the role its condition is about", !roles("employment:principal").includes("spouse") && !roles("consent:child").includes("principal"));
const P = (id: string, role: Participant["role"]): Participant => ({ subjectId: id, role, label: id, applies: true });
const cc = caseChecklist(S, "vv.single", [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner"), P("C", "child")], k, new Date("2026-11-01T12:00:00Z"));
const caseAt = (lineage: string) => cc.derived ? cc.people.filter((p) => [...p.lines, ...p.waiting, ...p.not_needed].some((l) => l.lineage === lineage)).map((p) => p.subject).sort().join() : "";
ok("Q2 case checklist pass: every line is on the same people's lists as in Preview", ["employment:principal", "insurance:each", "marriage:principal", "consent:child"].every((l) => caseAt(l) === at(l)), ["employment:principal", "insurance:each", "marriage:principal", "consent:child"].map((l) => `${l}: ${caseAt(l)} / ${at(l)}`));

process.exitCode = summary() ? 1 : 0;
