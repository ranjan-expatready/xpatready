// QA-152 · qa after-merge 2 Nov (C6.4, VV-R08): a child's "travelling alone" answered yes adds the letter of authorization line;
// answering no again must take it away (nothing requested yet). Prints each answer's response so a refused change is seen.
//   zsh studio/tools/isolated.sh qa_c64 4471 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4471 xr_studio_qa_c64 \
//     && tsx studio/acceptance/lib/setup_vv_m3.ts 4471 xr_studio_qa_c64 && tsx studio/tests/qa/check_qa_am_1102_c64_answer_no.ts 4471 xr_studio_qa_c64
import { CLIENT, FAMILY, OFFICER, answer, call, main, needVisitorVisa, ok, openCase } from "../../acceptance/lib/m3.ts";

await main("QA C6.4-9", "answering no takes the letter of authorization away again", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY);
  const K1 = c.subjects["Sample Child A1"];
  const labels = async () => ((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people ?? []).find((x: { subject: string }) => x.subject === K1)?.lines?.map((x: { label: string }) => x.label) ?? [];
  const yes = await answer(c.id, K1, "person.travelling_alone_to_canada", true, CLIENT);
  console.log("yes →", yes.status, JSON.stringify(yes.body).slice(0, 200), "\n  lines:", JSON.stringify(await labels()));
  const asked = async (mode: string, actor: string) => ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=${mode}`, undefined, actor)).body?.sections ?? []).flatMap((x: { questions: { subjectId: string; fact: string }[] }) => x.questions).some((q: { subjectId: string; fact: string }) => q.subjectId === K1 && q.fact === "person.travelling_alone_to_canada");
  ok("QA-152: after yes, the officer's case view still asks the child's \"travelling alone\" (so it can be corrected)", await asked("agent", OFFICER));
  ok("QA-152: after yes, the client's questionnaire still asks it", await asked("client", CLIENT));
  const no = await answer(c.id, K1, "person.travelling_alone_to_canada", false, CLIENT);
  console.log("no →", no.status, JSON.stringify(no.body).slice(0, 300));
  const after = await labels(); console.log("  lines:", JSON.stringify(after));
  ok("QA-152: the client's change to no is saved (2xx) or refused in words", no.status < 300 || typeof no.body?.detail === "string", no.status);
  ok("QA-152: after no, the letter of authorization line is gone", !after.some((x: string) => /authori[sz]ation/i.test(x)), after);
});
