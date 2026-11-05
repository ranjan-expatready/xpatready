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
  const all = ["vv.single", ...others];
  const n = (ps: any[]) => `${ps.filter((p) => /^Hiding/.test(p.message)).length}h${ps.filter((p) => /^Unreachable/.test(p.message)).length}u`;
  const snap = async () => { const o: string[] = []; for (const k of all) o.push(`${k.split(".")[0]}=${n(await probs(k))}`); return o.join(" "); };
  const before = await snap();
  const approve = async () => { const a: number[] = []; for (const c of sql("select id from library_change where kind='placement_condition' and status='WAITING'").split("\n").filter(Boolean)) a.push((await call("POST", `/library/changes/${c}/approve`, { note: "qa B88 probe" }, "user-B")).status); return a; };
  const pick = sql(`select id from proposal_item where kind='condition' and status='waiting' and identity_key like 'principal|person.other_family_name|%' limit 1`);
  const a1 = await call("POST", "/review/proposals/decide", { ids: [pick], action: "accept" }, AUTHOR); const ap1 = await approve();
  const one = await snap();
  const rest = sql("select id from proposal_item where kind='condition' and status='waiting'").split("\n").filter(Boolean);
  const dec: number[] = []; for (const id of rest) dec.push((await call("POST", "/review/proposals/decide", { ids: [id], action: "accept" }, AUTHOR)).status);
  const ap2 = await approve();
  const allc = await snap();
  let un = ""; for (const k of others) { const u = (await probs(k)).find((p: any) => /^Unreachable/.test(p.message)); if (u) { un = `${k}: ${String(u.message).slice(0, 150)}`; break; } }
  console.error(`STOP BEFORE conds=${conds} ${before} | ONE ${a1.status}/${ap1.join(",")} ${one}`);
  console.error(`STOP ALL accept=${dec.filter((x) => x < 300).length}of${dec.length} appr=${ap2.filter((x) => x < 300).length}of${ap2.length} ${allc}`);
  console.error(`STOP UNREACHABLE ${un || "(none)"}`);
  process.exit(2);
});
