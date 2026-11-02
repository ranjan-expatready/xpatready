// qa (2 Nov, explore of the merged Visitor visa case pages on main 54019473): QA-152. IMM 5476's "Name of firm or
// organization" boxes (Section B question 7, Section D) are mapped to the representative (form_field_map person =
// representative, organisation.name). On a Visitor visa case the officer's view asks organisation.name about each
// applicant (Client A, Spouse A) instead, labelled "(here the prospective employer)", in a section shown by its key
// "intended_work" (the library's title is "Intended work in Canada"). Fails today.
//   tsx studio/tests/qa/check_qa_vv_1102_firm_name.ts <port> <db>   (copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts)
import { FAMILY, OFFICER, call, main, needVisitorVisa, ok, openCase } from "../../acceptance/lib/m3.ts";

type Q = { subjectId: string; fact: string; label?: string };
type S = { subjectId: string; section: string; title: string; about_label: string; questions: Q[] };
await main("QA-152", "C6.11/C7.7: IMM 5476's firm name is the representative's, never asked of an applicant", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY);
  const v = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, OFFICER)).body as { sections: S[] };
  const applicants = new Set(Object.values(c.subjects));
  const asked = v.sections.filter((s) => applicants.has(s.subjectId) && s.questions.some((q) => q.fact === "organisation.name"));
  ok("QA-152a fail today: no applicant is asked the firm or organization name of IMM 5476 (it is the representative's)", asked.length === 0, asked.map((s) => `${s.about_label}: ${s.title}`));
  ok("QA-152b fail today: no question on a Visitor visa case calls it \"the prospective employer\"", !v.sections.some((s) => s.questions.some((q) => /prospective employer/i.test(q.label ?? ""))));
  ok("QA-152c fail today: every section the officer sees has a title in words, not its key", v.sections.every((s) => !/^[a-z]+(_[a-z]+)+$/.test(s.title)), v.sections.filter((s) => /^[a-z]+(_[a-z]+)+$/.test(s.title)).map((s) => s.title));
});
