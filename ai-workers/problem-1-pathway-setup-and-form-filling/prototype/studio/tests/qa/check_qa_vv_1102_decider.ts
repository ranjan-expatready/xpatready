// qa (2 Nov, C6.4): QA-149. A question that decides a document line (Visitor visa's "travelling alone", which decides
// the child's letter of authorization, VV-R08) must stay on the client's and the case officer's questionnaire once
// answered, so it can be changed back and the line follows. Failed on main 54019473 (2/5); retest on the fix.
// Updated 3 Nov (F6, qa-tooling; tech lead on #659) to today's shape, no app change: C6.4's R3 decides the letter from
// "who the child travels with" (person.travels_with = "alone"; "both_parents" takes it away), not the old yes/no
// person.travelling_alone_to_canada; the questionnaire puts subjectId on each section, not on each question; and the
// case's application date is answered first, so the child's age (under 18) is known.
//   tsx studio/tests/qa/check_qa_vv_1102_decider.ts <port> <db>   (copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts)
import { CLIENT, FAMILY, OFFICER, answer, call, main, needVisitorVisa, ok, openCase } from "../../acceptance/lib/m3.ts";

const FACT = process.env.QA149_FACT ?? "person.travels_with";
const YES = "alone", NO = "both_parents"; // the list values of "Who the child travels with" (setup_vv_m3.ts)
await main("QA-149", "C6.4: an answered condition question stays on the questionnaire", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY);
  const K1 = c.subjects["Sample Child A1"];
  const r0 = await answer(c.id, c.caseSubject, "case.application_date", new Date().toISOString().slice(0, 10), OFFICER);
  ok("setup: the case officer answers the application date (the child's age is then known: under 18)", r0.status < 300, r0.body?.detail ?? r0.status);
  type Q = { fact: string; answer: { id: string } | null };
  const asked = async (mode: "agent" | "client", actor: string) => {
    const v = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=${mode}`, undefined, actor)).body;
    return ((v?.sections ?? []) as { subjectId: string; questions: Q[] }[]).filter((s) => s.subjectId === K1).flatMap((s) => s.questions).find((q) => q.fact === FACT) ?? null;
  };
  const lines = async () => (await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body.people.find((p: { subject: string }) => p.subject === K1);
  ok("QA-149a pass: before an answer the child's questionnaire asks it (client and officer)", !!(await asked("client", CLIENT)) && !!(await asked("agent", OFFICER)));
  const r = await call("PUT", `/runtime/cases/${c.id}/answers/${K1}/${FACT}`, { value: YES, expectedId: null }, CLIENT);
  ok("QA-149b pass: the principal answers \"alone\" for the child; the letter of authorization line is needed", r.status === 200 && (await lines()).lines.some((x: { label: string }) => /authori[sz]ation/i.test(x.label)), r.status);
  const qc = await asked("client", CLIENT), qo = await asked("agent", OFFICER);
  ok("QA-149c: the client's questionnaire still shows the answered question", !!qc);
  ok("QA-149d: the case officer's questionnaire still shows it, with the answer's id", !!qo?.answer?.id);
  const r2 = await call("PUT", `/runtime/cases/${c.id}/answers/${K1}/${FACT}`, { value: NO, expectedId: qo?.answer?.id ?? null }, CLIENT);
  ok("QA-149e: answering \"both parents\" then takes the letter line away (pack 4 C6.4-9)", r2.status === 200 && !(await lines()).lines.some((x: { label: string }) => /authori[sz]ation/i.test(x.label)), r2.status);
});
