// qa (2 Nov, P-250 verdict on #493 R3, head 4dcf9e10): a minor who applies as the principal applicant travelling alone
// must get the minor's lines (letter of authorization, birth certificate copy) and be asked "travels with"; an adult
// principal gets none. Today (R3 head) the five lines are on each_dependent_child only: the minor-principal steps FAIL.
// US$0.
//   tsx studio/tests/qa/check_qa_r3_minor_principal.ts <port> <db>   (copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts with R3)
import { CLIENT, FAMILY, OFFICER, agent, answer, call, main, needVisitorVisa, ok, openCase, yearsAgo } from "../../acceptance/lib/m3.ts";

type Line = { label: string };
const LETTER = /authori[sz]ation/i, BIRTH = /birth certificate/i;

await main("qa-r3-minor-principal", "R3: a minor principal applicant's travel answers (P-230 (3), FQ-4)", async () => {
  const vv = needVisitorVisa();
  const today = new Date().toISOString().slice(0, 10);
  const lines = async (caseId: string, s: string) => (((await call("GET", `/runtime/cases/${caseId}/checklist`, undefined, OFFICER)).body?.people ?? []).find((p: { subject: string }) => p.subject === s)?.lines ?? []) as Line[];
  // A minor principal (15) travelling alone.
  const c = await openCase(vv, [{ role: "principal", name: "Sample Minor P", dob: yearsAgo(15) }]);
  await answer(c.id, c.caseSubject, "case.application_date", today, OFFICER);
  const PM = c.subjects["Sample Minor P"];
  const qs = ((await agent(c.id))?.sections ?? []).flatMap((s: { questions: { subjectId: string; fact: string; hidden?: boolean }[] }) => s.questions);
  ok("R3 pass: a principal under 18 is asked who they travel to Canada with", qs.some((q: { subjectId: string; fact: string; hidden?: boolean }) => q.subjectId === PM && q.fact === "person.travels_with" && !q.hidden));
  await answer(c.id, PM, "person.travels_with", "alone", CLIENT);
  const l = await lines(c.id, PM);
  ok("R3 pass: a principal under 18 travelling alone gets the letter of authorization and the birth certificate copy", l.some((x) => LETTER.test(x.label)) && l.some((x) => BIRTH.test(x.label)), l.map((x) => x.label));
  // An adult principal: never the minor's lines, never asked.
  const a = await openCase(vv, [FAMILY[0]]);
  await answer(a.id, a.caseSubject, "case.application_date", today, OFFICER);
  const PA = a.subjects["Sample Client A"];
  const qa = ((await agent(a.id))?.sections ?? []).flatMap((s: { questions: { subjectId: string; fact: string; hidden?: boolean }[] }) => s.questions);
  ok("R3 fail-guard: an adult principal is not asked who they travel with", !qa.some((q: { subjectId: string; fact: string; hidden?: boolean }) => q.subjectId === PA && q.fact === "person.travels_with" && !q.hidden));
  const la = await lines(a.id, PA);
  ok("R3 fail-guard: an adult principal has none of the minor's lines", !la.some((x) => LETTER.test(x.label) || BIRTH.test(x.label)), la.map((x) => x.label));
});
