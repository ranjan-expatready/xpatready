// B88: the setup of check_forms_b88_panel_browser.cjs: Visitor visa and Study permit of the six through people's steps, a Saved
// draft of Visitor visa (US$0), and its condition on "Other family name" accepted there and approved by a second person.
// Prints one JSON line: { vv, sp }. Not a suite of its own (no usage line).
import { randomUUID } from "node:crypto";
import { APPROVER, AUTHOR, pack2, run } from "../acceptance/lib/pack2.ts";

const T = pack2("B88");
const { call, sql, until } = T;
const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"], AI = new Set(["documents", "conditions", "pqr_picks", "checker"]);
run(async () => {
  await T.ready();
  const vv = T.combo("vv.single"), sp = T.combo("sp.outside");
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  await T.needQuestions(vv);
  await T.questionsBySteps(sp);
  const plan = (await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI.has(step) ? "replay" : "rules" })) }, AUTHOR)).body;
  const r = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  await until(async () => ["COMPLETED", "DONE", "FAILED", "STOPPED", "CANCELLED"].includes(String((await call("GET", `/runs/${r.body?.runId}`)).body?.status ?? "").toUpperCase()), 180_000);
  const item = sql(`select id from proposal_item where combination_id='${vv}' and kind='condition' and status='waiting' and identity_key like '%|person.other_family_name|%' limit 1`);
  await call("POST", "/review/proposals/decide", { ids: [item], action: "accept" }, AUTHOR);
  const cond = sql(`select id from library_change where kind='placement_condition' and key='person.other_family_name' and status='WAITING'`);
  await call("POST", `/library/changes/${cond}/approve`, { note: "Approved by a test as the second person (B88 setup)." }, APPROVER);
  console.log(`SETUP ${JSON.stringify({ vv, sp })}`);
  process.exit(0);
});
