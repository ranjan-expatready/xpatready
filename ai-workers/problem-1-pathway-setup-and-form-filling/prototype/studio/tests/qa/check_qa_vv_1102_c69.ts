// qa (2 Nov, P-250 score before merge of #418, C6.9 part 2): probes beyond pack 4 — roles, a person not on the case, two
// runs at once, the result's words (rules as at, disclaimer, no field keys). US$0.
//   tsx studio/tests/qa/check_qa_vv_1102_c69.ts <port> <db>   (copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts)
import { AUTHOR, CLIENT_B, FAMILY, OFFICER, call, main, needVisitorVisa, ok, openCase } from "../../acceptance/lib/m3.ts";

await main("qa-c69", "C6.9 eligibility run probes (#418 head)", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY);
  const P = c.subjects["Sample Client A"];
  for (const [who, a] of [["author", AUTHOR], ["another client", CLIENT_B], ["the solo firm", "user-S"]] as const) {
    const r = await call("POST", `/runtime/cases/${c.id}/assessments`, { person: P }, a);
    ok(`probe: ${who} cannot run an assessment (403/404, in words)`, [403, 404].includes(r.status) && typeof r.body?.detail === "string", [r.status, r.body?.detail]);
  }
  let r = await call("POST", `/runtime/cases/${c.id}/assessments`, { person: "00000000-0000-0000-0000-000000000000" }, OFFICER);
  ok("probe: a person not on the case is refused 4xx in words", r.status >= 400 && r.status < 500 && typeof r.body?.detail === "string", [r.status, r.body?.detail]);
  r = await call("POST", `/runtime/cases/${c.id}/assessments`, {}, OFFICER);
  ok("probe: no person given: 400 in words", r.status === 400 && typeof r.body?.detail === "string", [r.status, r.body?.detail]);
  const [a, b] = await Promise.all([1, 2].map(() => call("POST", `/runtime/cases/${c.id}/assessments`, { person: P }, OFFICER)));
  ok("probe: two runs at once (double click): exactly one result; the other asks for a reason to run again (400)", [a.status, b.status].sort().join() === "201,400" && /reason/i.test(JSON.stringify(a.status === 400 ? a.body : b.body)), [a.status, b.status]);
  const res = (a.status === 201 ? a.body : b.body) ?? {};
  const text = JSON.stringify(res);
  console.log("result keys:", Object.keys(res).join(","));
  ok("probe: the result says the rules' date (rules as at) and the disclaimer", /rules?[_ ]as[_ ]at|rulesAsAt/i.test(text) && /disclaimer/i.test(text), Object.keys(res));
  const words = JSON.stringify(res.results ?? null);
  console.log("results:", words.slice(0, 700));
  ok("probe: what is missing and each gate are named in words, not field keys", words !== "null" && !/"(label|text|why|plain|question|message|words)":"[^"]*\b(person|case)\.[a-z_]+/.test(words), words.slice(0, 300));
});
