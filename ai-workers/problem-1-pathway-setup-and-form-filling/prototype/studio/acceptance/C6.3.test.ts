// C6.3 Agent view: every fact once per person, with its source and status; an edit updates every draft output (row B150;
// P-242, P-411 (2): "a case officer's typed or corrected answer fills at once, marked 'entered by staff', and stays on the
// Confirm list; a correction never empties a filled box"; QA-303). Before P-411 an officer's correction of a client's
// answer emptied its form fields until "Confirm section" (qa's L-SA6 walk, steps 8, 9 and 13).
// Each step reads real copies the app writes (the filler's request beside each PDF), for every form the fact fills.
// Runs on the configured checkpoint (P-322), loaded on a blank copy through the Demo menu's own route when it is not there
// yet. Sample people, no real names; US$0, no model call.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C6.3.test.ts 4440 xr_studio_accept
import { CLIENT, agent, answer, call, main, ok, openCase, sql, yearsAgo } from "./lib/m3.ts";
import { checkpointVisitorVisa, written } from "./lib/declared.ts";

const NAME = "person.family_name";
type A = { id: string; value: unknown; status: string; channel: string; by: string; confirmed: boolean; why: string; mark?: string } | null;
type Q = { subjectId: string; fact: string; answer: A; fills: { form: string; subject: string; boxes: number }[] };
const questionsOf = async (caseId: string): Promise<Q[]> => ((await agent(caseId))?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions);

await main("C6.3", "Agent view: one fact per person, source and status; an edit updates every form it fills (P-411)", async () => {
  const vv = await checkpointVisitorVisa();
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], officer = c.officer;
  ok("setup: a Visitor visa case with the principal and an adult spouse", !!P && !!S, c.body);

  let qs = await questionsOf(c.id);
  const keys = qs.map((q) => `${q.subjectId}|${q.fact}`);
  ok("C6.3-1 pass: the Agent view lists every fact once per person (no fact twice for one person)", keys.length > 0 && new Set(keys).size === keys.length && qs.some((q) => q.subjectId === P && q.fact === NAME) && qs.some((q) => q.subjectId === S && q.fact === NAME), keys.length);

  await answer(c.id, P, NAME, "DECLAREDFAM", CLIENT);
  qs = await questionsOf(c.id);
  const q = qs.find((x) => x.subjectId === P && x.fact === NAME)!;
  const forms = [...new Set(q.fills.filter((f) => f.subject === P && f.boxes > 0).map((f) => f.form))];
  ok("C6.3-2 pass: the client's answer shows its source (questionnaire, the client) and its status (Declared)", q.answer?.channel === "questionnaire" && q.answer.by === CLIENT && q.answer.status === "DECLARED" && q.answer.mark === "declared", q.answer);
  ok("setup: the family name fills more than one of the principal's forms on the checkpoint (IMM 5257 and its Schedule 1 at least)", forms.includes("IMM 5257") && forms.includes("IMM 5257 SCH1"), forms);
  const before = await Promise.all(forms.map((f) => written(c.id, f, P)));
  ok("C6.3-3 pass (P-242): before any edit, every form the family name fills writes the client's answer", before.every((w) => !!w.id && w.of(NAME).includes("DECLAREDFAM")), Object.fromEntries(forms.map((f, i) => [f, before[i].why(NAME)])));

  // The officer corrects it (P-411 (2)).
  const stale = await call("PUT", `/runtime/cases/${c.id}/answers/${P}/${NAME}`, { value: "STALEFAM", expectedId: null }, officer);
  ok("C6.3-4 fail: an edit from an out-of-date view (the answer changed since it was opened) is refused (409) and changes nothing", stale.status === 409 && (await questionsOf(c.id)).find((x) => x.subjectId === P && x.fact === NAME)?.answer?.value === "DECLAREDFAM", stale.status);
  const fix = await answer(c.id, P, NAME, "OFFICERFAM", officer);
  const now = (await questionsOf(c.id)).find((x) => x.subjectId === P && x.fact === NAME)?.answer;
  ok("C6.3-5 pass (P-411 (2)): the correction shows its source (Agent view, the case officer) and its status: Declared, entered by staff, to confirm", fix.status === 200 && now?.value === "OFFICERFAM" && now.channel === "agent_view" && now.by === officer && now.status === "DECLARED" && now.mark === "by_staff" && now.confirmed === false && /entered by staff/.test(now.why), now);
  ok("C6.3-6 pass: one current answer, with the client's answer kept in its history", sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='${NAME}' and superseded_by_id is null`) === "1"
    && sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='${NAME}' and superseded_by_id is not null and value_json #>> '{}' = 'DECLAREDFAM'`) === "1");
  const after = await Promise.all(forms.map((f) => written(c.id, f, P)));
  ok("C6.3-7 pass (P-411 (2), QA-303): the edit updates every form the fact fills at once; no box goes empty", after.every((w) => !!w.id && w.of(NAME).includes("OFFICERFAM")), Object.fromEntries(forms.map((f, i) => [f, after[i].why(NAME)])));
  const listed = ((await call("GET", `/runtime/cases/${c.id}/forms`)).body?.forms ?? []).filter((f: { subject_id: string; form: string }) => f.subject_id === P && forms.includes(f.form)) as { form: string; copies: { id: string; out_of_date?: boolean; status: string; changed?: string[] }[] }[];
  ok("C6.3-8 pass: the copies made before the edit are out of date, and the new copies are current", listed.length === forms.length && listed.every((f) => { const first = f.copies.find((x) => before.some((b) => b.id === x.id)), last = f.copies.find((x) => after.some((a) => a.id === x.id)); return !!first?.out_of_date && !!last && !last.out_of_date; }), listed.map((f) => ({ form: f.form, copies: f.copies.map((x) => [x.status, x.out_of_date]) })));
  ok("C6.3-9 fail (P-411 (2)): the correction stays on the Confirm list: the principal's forms list the family name \"not confirmed\" before filing", ((await call("GET", `/runtime/cases/${c.id}/forms`)).body?.forms ?? []).filter((f: { subject_id: string; form: string }) => f.subject_id === P && forms.includes(f.form)).some((f: { readiness: { missing: { fact: string; reason: string }[] } }) => f.readiness.missing.some((m) => m.fact === NAME && m.reason === "not confirmed")));
});
