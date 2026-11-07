// QA-293 (Major, qa gate A, 7 Nov; C6.11, C7.7): on the Agent view's "The representative" tab a detail the firm record
// does not hold offered Add, and every save failed with 404 "That person is not on this case." The representative is no
// person on the case: their details come only from the firm record of the representative of record (C7.7, C6.11), and
// "Your designated individual" is read by IMM 5475 too, which IRCC says is not the representative (tech lead's ruling on
// #1072). So a save about the representative is refused in words (422) and writes nothing; a person's own answer still
// saves. Each rule with a passing and a failing case, on the configured checkpoint. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh rt293 4441 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/runtime/check_qa293_rep_answers.ts 4441 xr_studio_rt293
import { call, CLIENT, firms, needVisitorVisa, ok, openCase, sql, yearsAgo, main } from "../../acceptance/lib/m3.ts";

await main("QA-293", "The representative's tab — details from the firm record only", async () => {
  const f = await firms(), officer = f.officer!;
  const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const view = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body;
  const repQs = (view?.sections ?? []).filter((s: { subjectId: string }) => s.subjectId === "representative").flatMap((s: { questions: { fact: string; answer: { channel: string } | null }[] }) => s.questions);
  const missing = repQs.filter((q: { answer: unknown }) => !q.answer).map((q: { fact: string }) => q.fact);
  // B107 (QA-300): since the firm record fills IMM 5476's question 7 and the form's own gates leave the other bodies' boxes
  // unasked, the tab holds no detail nobody can answer; the saves below are still refused for a detail it fills
  // (the office's city) and for one it never asks of a CICC representative (the law society's province).
  ok("QA-293 setup (B107): the representative's tab holds no detail the firm record does not give, so nothing offers Add", missing.length === 0 && repQs.some((q: { fact: string; answer: { channel: string } | null }) => q.fact === "person.address_city" && q.answer?.channel === "firm_record"), missing);
  ok("QA-293 pass: the firm record still gives the representative's membership ID", repQs.some((q: { fact: string; answer: { channel: string } | null }) => q.fact === "representative.membership_id" && q.answer?.channel === "firm_record"));

  // Review m4: every answer row of the workspace (not only the case's people), so a row written anywhere would show.
  const ws = sql(`select workspace_id from runtime_case where id = '${c.id}'`);
  const rows = () => sql(`select (select count(*) from client_canonical_answer where workspace_id = '${ws}') + (select count(*) from client_fact_record where workspace_id = '${ws}') + (select count(*) from client_group_answer where workspace_id = '${ws}')`);
  const before = rows();
  for (const fact of ["person.address_city", "representative.licensing_province"]) {
    const r = await call("PUT", `/runtime/cases/${c.id}/answers/representative/${fact}`, { value: fact === "person.address_city" ? "Hamilton" : "ON", expectedId: null }, officer);
    const words = String(r.body?.detail ?? "");
    ok(`QA-293 fail: saving the representative's ${fact} is refused in words (422, the firm record), never 404 "not on this case"`, r.status === 422 && /firm record/.test(words) && !/not on this case/i.test(words), [r.status, words]);
  }
  // Review M1: the words are true for a detail the firm record does fill too (the membership ID), and promise nothing.
  const filled = await call("PUT", `/runtime/cases/${c.id}/answers/representative/representative.membership_id`, { value: "R999999", expectedId: null }, officer);
  ok("QA-293 fail (review M1): saving a detail the firm record fills (membership ID) is refused with the same true words, never \"not in the firm record\"", filled.status === 422 && /only from the firm record/.test(String(filled.body?.detail ?? "")) && !/not in the firm record|yet/i.test(String(filled.body?.detail ?? "")), [filled.status, filled.body?.detail]);
  const byClient = await call("PUT", `/runtime/cases/${c.id}/answers/representative/person.address_city`, { value: "Hamilton", expectedId: null }, CLIENT);
  ok("QA-293 fail (review m4): a client's save about the representative is refused too (403 or 422), never 404", (byClient.status === 422 || byClient.status === 403) && byClient.status !== 404, [byClient.status, byClient.body?.detail]);
  // Review m3: the repeating-group routes answer in the same words, never "not on this case".
  const addRow = await call("POST", `/runtime/cases/${c.id}/groups/representative/rows`, { group: "employment" }, officer);
  const none = await call("PUT", `/runtime/cases/${c.id}/groups/representative/employment/none-apply`, { noneApply: true, expectedId: null }, officer);
  ok("QA-293 fail (review m3): adding a row or \"none apply\" for the representative is refused in the same words (422)", addRow.status === 422 && none.status === 422 && /only from the firm record/.test(String(addRow.body?.detail ?? "")), [addRow.status, addRow.body?.detail, none.status]);
  ok("QA-293 fail: the refused saves write no answer, row or group answer anywhere in the workspace", rows() === before, [before, rows()]);

  // A person's own answer still saves (the refusal is for the representative only).
  const own = await call("PUT", `/runtime/cases/${c.id}/answers/${c.subjects["Sample Client A"]}/person.address_city`, { value: "Hamilton", expectedId: null }, officer);
  ok("QA-293 pass: the principal's own city still saves (200)", own.status < 300, [own.status, own.body?.detail]);
  const nobody = await call("PUT", `/runtime/cases/${c.id}/answers/00000000-0000-4000-8000-000000000000/person.address_city`, { value: "Hamilton", expectedId: null }, officer);
  ok("QA-293 fail: someone who is not on the case still gets 404 \"That person is not on this case.\"", nobody.status === 404 && /not on this case/.test(String(nobody.body?.detail ?? "")), [nobody.status, nobody.body?.detail]);
});
