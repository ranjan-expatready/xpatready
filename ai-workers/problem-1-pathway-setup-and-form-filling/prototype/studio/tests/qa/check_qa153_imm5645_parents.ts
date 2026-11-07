// QA-153 (Gap · Major; C7.7, C10.2), re-sorted 7 Nov: release 2 of the configured checkpoint's Visitor visa has no IMM 5707;
// its family form is IMM 5645, IRCC IMM 5645 (01-2021) p. 1: "Include ALL family members even if they are not accompanying
// you." Its map puts boxes on subject_parent_1, subject_parent_2 and subject_sibling, and the case has no such person and
// no question for them. Expected: once the case's questions are confirmed, either the parents' boxes hold answers or the
// form says what it waits for. Actual: "Every fact it reads is confirmed", ready, with the boxes empty.
// FAILS today (QA-153-2, -3); PASSES when parents reach the form or the form says it waits. US$0, no model call.
//   tsx studio/tests/qa/check_qa153_imm5645_parents.ts <port> <database>     (an isolated copy on the configured checkpoint)
import { OFFICER, call, fillEverything, firms, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo } from "../../acceptance/lib/m3.ts";

await main("QA-153", "IMM 5645 on release 2: the parents and siblings IRCC asks for", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client F", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client F"];
  await fillEverything(c.id); // set-up by the pack's helper; it stops short only on IMM 5476's QA-300
  const p = (await prepare(c.id, officer)).p;
  const it = itemsOf(p, P, "IMM 5645")[0];
  console.log(`NOTE  case ${c.id}`);
  ok("QA-153-1 pass: release 2 lists IMM 5645, and no IMM 5707, for the adult (setup)", !!it && !JSON.stringify(p?.items.map((i) => i.form)).includes("IMM 5707"));
  const copy = await generateCopy(c.id, "IMM 5645", P);
  const n = (part: string, result: string) => Number(sql(`select count(*) from form_instance i, jsonb_array_elements(i.result_json->'boxes') b where i.id = '${copy}' and b->>'box' like '%${part}%' and b->>'result' = '${result}'`) ?? -1);
  const forms = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms ?? [];
  const ready = forms.find((x: { form: string }) => x.form === "IMM 5645")?.readiness?.ready;
  const filled = n("Father", "written") + n("Mother", "written");
  ok("QA-153-2 fail: IMM 5645 is not ready while its parents' boxes are empty", !(ready === true && filled === 0), { ready, parents_written: filled, parents_not_written: n("Father", "not written") + n("Mother", "not written") });
  ok("QA-153-3 fail: the item does not say every fact is confirmed while its parents' boxes are empty", !(/every fact it reads is confirmed/i.test(it?.reason ?? "") && filled === 0), it?.reason);
});
