// QA-293 (Major, qa gate A, 7 Nov; C6.11, C7.7): on the Agent view's "The representative" tab a detail the firm record
// does not hold offered Add, and every save failed with 404 "That person is not on this case." The representative is no
// person on the case: their details come only from the firm record of the representative of record (C7.7, C6.11), and
// "Your designated individual" is read by IMM 5475 too, which IRCC says is not the representative (tech lead's ruling on
// #1072). So a save about the representative is refused in words (422) and writes nothing; a person's own answer still
// saves. Each rule with a passing and a failing case, on the configured checkpoint. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh rt293 4441 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/runtime/check_qa293_rep_answers.ts 4441 xr_studio_rt293
import { call, firms, needVisitorVisa, ok, openCase, sql, yearsAgo, main } from "../../acceptance/lib/m3.ts";

await main("QA-293", "The representative's tab — details from the firm record only", async () => {
  const f = await firms(), officer = f.officer!;
  const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const view = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body;
  const repQs = (view?.sections ?? []).filter((s: { subjectId: string }) => s.subjectId === "representative").flatMap((s: { questions: { fact: string; answer: { channel: string } | null }[] }) => s.questions);
  const missing = repQs.filter((q: { answer: unknown }) => !q.answer).map((q: { fact: string }) => q.fact);
  ok("QA-293 setup: the representative's tab holds details the firm record does not give (the ones that offered Add)", missing.includes("person.address_city") && missing.includes("representative.licensing_province"), missing);
  ok("QA-293 pass: the firm record still gives the representative's membership ID", repQs.some((q: { fact: string; answer: { channel: string } | null }) => q.fact === "representative.membership_id" && q.answer?.channel === "firm_record"));

  const rows = () => sql(`select count(*) from client_canonical_answer a join case_participant p on p.subject_id = a.subject_id where p.case_id = '${c.id}'`);
  const before = rows();
  for (const fact of ["person.address_city", "representative.licensing_province"]) {
    const r = await call("PUT", `/runtime/cases/${c.id}/answers/representative/${fact}`, { value: fact === "person.address_city" ? "Hamilton" : "ON", expectedId: null }, officer);
    const words = String(r.body?.detail ?? "");
    ok(`QA-293 fail: saving the representative's ${fact} is refused in words (422, the firm record), never 404 "not on this case"`, r.status === 422 && /firm record/.test(words) && !/not on this case/i.test(words), [r.status, words]);
  }
  ok("QA-293 fail: the refused saves write no answer on the case", rows() === before, [before, rows()]);

  // A person's own answer still saves (the refusal is for the representative only).
  const own = await call("PUT", `/runtime/cases/${c.id}/answers/${c.subjects["Sample Client A"]}/person.address_city`, { value: "Hamilton", expectedId: null }, officer);
  ok("QA-293 pass: the principal's own city still saves (200)", own.status < 300, [own.status, own.body?.detail]);
  const nobody = await call("PUT", `/runtime/cases/${c.id}/answers/00000000-0000-4000-8000-000000000000/person.address_city`, { value: "Hamilton", expectedId: null }, officer);
  ok("QA-293 fail: someone who is not on the case still gets 404 \"That person is not on this case.\"", nobody.status === 404 && /not on this case/.test(String(nobody.body?.detail ?? "")), [nobody.status, nobody.body?.detail]);
});
