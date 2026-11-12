// C6.2 acceptance, QA-415 (P-486, P-489; EXPERIENCE: each fact asked once, worked out where the case knows it): the kind
// of application ("Which kind of application is this case: visitor, worker or student?", #1588) is asked of nobody: not
// in the case officer's view, not in the client's questionnaire, for any person, on a Study permit family and a Visitor
// visa family; it is worked out for each person from their own filing (C7.1-application-type.test.ts reads the forms).
// The firm's other two facts (QA-403) are still the case officer's. Runs on the configured checkpoint (Demo › Load);
// Sample people; no model call (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx --tsconfig studio/api/tsconfig.json studio/acceptance/C6.2-application-type.test.ts 4440 xr_studio_accept
import { agent, call, CLIENT, main, ok } from "./lib/m3.ts";
import { ensureCheckpoint, studyFamily, type Family, visitorFamily } from "./lib/application-type.ts";

type Q = { fact: string; label: string };
const facts = (v: { sections?: { questions: Q[] }[] } | null) => (v?.sections ?? []).flatMap((s) => s.questions);
const kind = (q: Q) => /application_type/.test(q.fact) || /kind of application|type of (temporary residence )?application/i.test(q.label);

await main("C6.2 application type", "The kind of application is asked of nobody (QA-415)", async () => {
  await ensureCheckpoint(); // Gate B runs this pack on the six: it loads the checkpoint itself
  const views = async (f: Family) => ({ staff: facts(await agent(f.c.id)), client: facts((await call("GET", `/runtime/cases/${f.c.id}/questionnaire`, undefined, CLIENT)).body) });
  for (const [name, f] of [["Study permit", await studyFamily()], ["Visitor visa", await visitorFamily()]] as const) {
    const v = await views(f);
    ok(`C6.2-AT-1 setup (${name}): both views list the family's questions`, v.staff.length > 0 && v.client.length > 0, { staff: v.staff.length, client: v.client.length });
    ok(`C6.2-AT-2 fail (${name}): the case officer's view never asks the kind of application, for any person`, !v.staff.some(kind), v.staff.filter(kind).map((q) => [q.fact, q.label]));
    ok(`C6.2-AT-3 fail (${name}): the client's questionnaire never asks it either`, !v.client.some(kind), v.client.filter(kind).map((q) => [q.fact, q.label]));
    ok(`C6.2-AT-4 pass (${name}): the firm's other facts (QA-403) are still asked of the case officer, once each`, ["case.representative_form_action", "case.submission_office_name"].every((k) => v.staff.filter((q) => q.fact === k).length === 1), v.staff.filter((q) => q.fact.startsWith("case.")).map((q) => q.fact));
  }
});
