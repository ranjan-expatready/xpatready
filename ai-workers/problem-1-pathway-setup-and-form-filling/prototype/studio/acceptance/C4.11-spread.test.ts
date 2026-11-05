// qa lane's probe for B88 on a GitHub runner (scratch branch, never merged). US$0.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.11-spread.test.ts 4440 xr_studio_accept
import { randomUUID } from "node:crypto";
import { AUTHOR, pack2, run } from "./lib/pack2.ts";
const T = pack2("C4.11-spread"); const { call, sql } = T;
run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv); await T.needQuestions(vv);
  const STEPS = ["facts","documents","document_facts","comes_from","conditions","pqr_picks","checker"], AI = new Set(["documents","conditions","pqr_picks","checker"]);
  const plan = (await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI.has(step) ? "replay" : "rules" })) }, AUTHOR)).body;
  const r = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  await T.until(async () => ["DONE","COMPLETED","FAILED"].includes(String((await call("GET", `/runs/${r.body?.runId}`)).body?.status ?? "").toUpperCase()), 180000);
  const lines: string[] = [];
  const conds = (await T.queued(vv)).filter((x: any) => x.kind === "condition").length;
  const others = ["sp.outside", "wp.lmia_inside", "pnp.express_entry", "fs.spouse"];
  for (const k of others) { const id = T.combo(k); if (id) { await T.people(id).catch(() => {}); const s = await T.questionsBySteps(id); lines.push(`SETUP ${k} placed=${s.placed} refused=${s.refused.length}`); } }
  const probs = async (k: string) => ((await call("GET", `/combinations/${T.combo(k)}`)).body?.draft?.problems ?? []).filter((p: any) => /^(Hiding a value|Unreachable question)/.test(p.message));
  const count = (ps: any[]) => `hiding=${ps.filter((p) => /^Hiding/.test(p.message)).length} unreachable=${ps.filter((p) => /^Unreachable/.test(p.message)).length}`;
  const all = ["vv.single", ...others];
  for (const k of all) lines.push(`BEFORE ${k} ${count(await probs(k))}`);
  const pick = sql(`select id from proposal_item where kind='condition' and status='waiting' and identity_key like 'principal|person.other_family_name|%' limit 1`);
  const a = await call("POST", "/review/proposals/decide", { ids: [pick], action: "accept" }, AUTHOR);
  const appr: number[] = [];
  for (const c of sql("select id from library_change where kind='placement_condition' and status='WAITING'").split("\n").filter(Boolean)) appr.push((await call("POST", `/library/changes/${c}/approve`, { note: "qa B88 probe" }, "user-B")).status);
  lines.push(`CONDITIONS ${conds} accept=${a.status} approve=${appr.join(",")}`);
  for (const k of all) { const ps = await probs(k); lines.push(`AFTER ${k} ${count(ps)} ${ps.map((p: any) => String(p.message).slice(0, 110)).slice(0, 2).join(" || ")}`); }
  for (const l of lines) console.error(`STOP ${l}`);
  process.exit(2);
});
