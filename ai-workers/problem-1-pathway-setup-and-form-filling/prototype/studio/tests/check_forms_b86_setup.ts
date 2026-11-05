// B86: the setup of check_forms_b86_panel_browser.cjs: Visitor visa of the six through people's steps, and a Saved draft (US$0).
// Prints one JSON line: { vv, item, given }. Not a suite of its own (no usage line).
import { randomUUID } from "node:crypto";
import { AUTHOR, pack2, run } from "../acceptance/lib/pack2.ts";

const T = pack2("B86");
const { call, sql, until } = T;
const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"], AI = new Set(["documents", "conditions", "pqr_picks", "checker"]);
run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  await T.needQuestions(vv);
  const plan = (await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI.has(step) ? "replay" : "rules" })) }, AUTHOR)).body;
  const r = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  await until(async () => ["COMPLETED", "DONE", "FAILED", "STOPPED", "CANCELLED"].includes(String((await call("GET", `/runs/${r.body?.runId}`)).body?.status ?? "").toUpperCase()), 180_000);
  const item = (fact: string) => sql(`select id from proposal_item where combination_id='${vv}' and kind='condition' and status='waiting' and identity_key like '%|${fact}|%' limit 1`);
  console.log(`SETUP ${JSON.stringify({ vv, item: item("person.other_family_name"), given: item("person.other_given_names") })}`);
  process.exit(0);
});
