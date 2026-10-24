// D280 orchestration checks on an ISOLATED copy (port 4403): one governed path for every AI entry point, proven with
// stub passes, library reuse and labelled replays of saved real runs. NO model call is made and nothing is billed: the
// only live-mode request is refused by the batch limit before anything is queued. Two test-only server switches are
// used and labelled in the evidence: STUDIO_FAULT_SOURCE (an induced failure for one form) and STUDIO_HOLD_QUEUE
// (keep steps queued to show restart, cancel and reset behaviour deterministically).
//   tsx studio/tests/check_ai_orchestration.ts [port=4403] [name=aiorch]   (starts its own isolated copy)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4403), NAME = process.argv[3] ?? "aiorch", DB = `xr_studio_${NAME}`; // a lane passes its own port and name
const STUDIO = join(import.meta.dirname, "..");
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const server = (action: "start" | "restart", env: string[] = []) => execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), action, ...env], { encoding: "utf8" });
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<{ status: number; body: any }> => {
  for (let i = 0; ; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json", connection: "close" }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; }
    catch (e) { if (i < 2) { await new Promise((r) => setTimeout(r, 500)); continue; } throw e; }
  }
};
const until = async (fn: () => Promise<boolean>, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const key = (s: string) => `${s}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const rowId = async (k: string) => sql(`select id from combination where combination_key='${k}'`) || undefined;
const batch = async (id: string) => (await call("GET", `/ai/batches/${id}`)).body;
const done = (b: any) => b && !["QUEUED", "RUNNING"].includes(b.status) && !b.jobs.some((j: any) => ["QUEUED", "RUNNING"].includes(j.status));

(async () => {
  // ---------------------------------------------------------------- phase 1: induced failure for IMM 5475
  server("start", ["STUDIO_FAULT_SOURCE=imm5475e.pdf"]);
  await call("POST", "/demo/load");
  const vv = await rowId("vv.single"), sp = await rowId("sp.student"), sv0 = await rowId("sv.super_visa");
  const scope = { kind: "catalogue", ids: [vv, sp, sv0] };
  let r = await call("POST", "/ai/plan", { scope, mode: "STUB" });
  const plan = r.body; const act = (row: string | undefined, src: RegExp) => plan.targets.find((t: any) => t.combinationId === row && src.test(t.source))?.action;
  ok("plan before launch: per target action and reason, cost, nothing started", act(vv, /IMM 5257/) === "draft" && act(vv, /IMM 5707/) === "reuse_library" && act(sp, /IMM 5475/) === "reuse_library" && act(sv0, /IMM 5257/) === "skip" && plan.totals.worst_usd === 0 && (await call("GET", "/ai/batches")).body.length === 0, plan.totals);
  ok("the same form in two selected rows is drafted once; the other row waits to reuse it", /Same form as in/.test(plan.targets.find((t: any) => t.combinationId === sv0 && /IMM 5257/.test(t.source)).why));
  r = await call("POST", "/ai/batches", { scope, mode: "STUB", idempotencyKey: key("approver"), planSha256: plan.plan_sha256 }, "user-B");
  ok("server permission: the approver cannot launch AI work", r.status === 403, r.body?.message);
  const K = key("launch");
  const [a1, a2] = await Promise.all([call("POST", "/ai/batches", { scope, mode: "STUB", idempotencyKey: K, planSha256: plan.plan_sha256 }), call("POST", "/ai/batches", { scope, mode: "STUB", idempotencyKey: K, planSha256: plan.plan_sha256 })]);
  ok("duplicate launch (same key sent twice at once, as a double click) starts one batch and both answers name it", a1.status === 201 && a2.status === 201 && !!a1.body?.id && a1.body.id === a2.body?.id && sql("select count(*) from ai_batch") === "1" && sql("select count(*) from drafting_job where batch_id is not null") === String(a1.body.jobs.length), [a1.status, a2.status]);
  const B = a1.body?.id ?? a2.body?.id;
  r = await call("POST", "/ai/batches", { scope, mode: "STUB", idempotencyKey: key("second"), planSha256: plan.plan_sha256 });
  ok("a second launch over work that is now queued is refused (the plan changed)", r.status === 409, r.body?.message);
  const att5257 = sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  r = await call("POST", `/attachments/${att5257}/draft`, { mode: "stub" });
  ok("the source-level button refuses a form whose step is already queued or running", r.status === 409, r.body?.message);
  await until(async () => done(await batch(B)));
  let b = await batch(B);
  const st = (src: RegExp, row = sp) => b.jobs.filter((j: any) => j.combinationId === row && src.test(j.source)).map((j: any) => j.status);
  ok("one failed step does not discard its siblings: batch is PARTIAL", b.status === "PARTIAL" && st(/IMM 5475/).includes("FAILED") && st(/IMM 5476/).includes("APPLIED") && st(/IMM 5257/, vv).includes("COMPLETED"), { status: b.status, message: b.message });
  ok("the failure is labelled as the induced test fault", /Induced test fault/.test(b.jobs.find((j: any) => j.status === "FAILED").message));
  for (const n of [2, 3]) { r = await call("POST", `/ai/batches/${B}/retry`); await until(async () => done(await batch(B))); }
  b = await batch(B);
  ok("retry re-runs only the failed step (attempts 2 and 3), never the completed ones", b.jobs.filter((j: any) => /IMM 5475/.test(j.source)).map((j: any) => j.attempt).join(",") === "1,2,3" && b.jobs.filter((j: any) => /IMM 5476/.test(j.source)).length === 1);
  r = await call("POST", `/ai/batches/${B}/retry`);
  ok("retries are bounded: a fourth attempt is refused and handed to a person", r.status === 400 && /3 attempts/.test(r.body.message), r.body.message);
  r = await call("POST", "/ai/plan", { scope: { kind: "source", ids: [att5257] }, mode: "LIVE", draftAgain: true });
  const live = r.body;
  r = await call("POST", "/ai/batches", { scope: { kind: "source", ids: [att5257] }, mode: "LIVE", draftAgain: true, idempotencyKey: key("live"), planSha256: live.plan_sha256, spendLimitUsd: 1 });
  ok("spend bound: a live launch whose worst case exceeds the person's limit is refused before anything is queued (no model call)", r.status === 400 && /worst case/.test(r.body.message) && sql("select count(*) from ai_batch where mode='LIVE'") === "0", { worst: live.targets[0]?.worst_usd, message: r.body.message });
  const reusePlan = (await call("POST", "/ai/plan", { scope: { kind: "source", ids: [att5257] }, mode: "LIVE" })).body;
  ok("a live plan reuses the saved real run for the unchanged form instead of paying again", reusePlan.targets[0]?.action === "reuse_saved_output" && reusePlan.totals.model_calls === 0 && reusePlan.totals.worst_usd === 0, { action: reusePlan.targets[0]?.action, why: reusePlan.targets[0]?.why });

  // ---------------------------------------------------------------- phase 2: held queue (restart, cancel, reset)
  server("restart", ["STUDIO_HOLD_QUEUE=1"]);
  const sv = await rowId("sv.super_visa");
  let p2 = (await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [sv] }, mode: "STUB" })).body;
  r = await call("POST", "/ai/batches", { scope: { kind: "combination", ids: [sv] }, mode: "STUB", idempotencyKey: key("cancel"), planSha256: p2.plan_sha256 });
  const C = r.body.id;
  r = await call("POST", `/ai/batches/${C}/cancel`);
  b = await batch(C);
  ok("cancel before start: queued steps stop, nothing was sent", b.status === "CANCELLED" && b.jobs.every((j: any) => j.status === "CANCELLED" && /nothing was sent/.test(j.message)), b.jobs.map((j: any) => j.status));
  p2 = (await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [sv] }, mode: "STUB" })).body;
  r = await call("POST", "/ai/batches", { scope: { kind: "combination", ids: [sv] }, mode: "STUB", idempotencyKey: key("restart"), planSha256: p2.plan_sha256 });
  const R = r.body.id;
  ok("queued steps are persisted (held by the test switch)", (await batch(R)).jobs.every((j: any) => j.status === "QUEUED"));
  server("restart");
  await until(async () => done(await batch(R)));
  b = await batch(R);
  ok("after a server restart the queued steps resume and finish", b.status === "COMPLETED" && b.jobs.every((j: any) => ["COMPLETED", "APPLIED"].includes(j.status)), b.jobs.map((j: any) => j.status));
  server("restart", ["STUDIO_HOLD_QUEUE=1"]);
  const fs1 = await rowId("fs.outside");
  const p3 = (await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [fs1] }, mode: "STUB" })).body;
  r = await call("POST", "/ai/batches", { scope: { kind: "combination", ids: [fs1] }, mode: "STUB", idempotencyKey: key("reset"), planSha256: p3.plan_sha256 });
  const X = r.body.id;
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("reset while steps are pending removes them with the workspace", r.status === 201 && (await call("GET", `/ai/batches/${X}`)).status === 404);
  server("restart");
  await new Promise((res) => setTimeout(res, 2500));
  ok("after the reset, nothing from the old workspace runs or applies (no steps, no rows)", sql("select count(*) from drafting_job") === "0" && sql("select count(*) from combination") === "0");

  // ---------------------------------------------------------------- phase 3: stale result refused; human decisions kept
  await call("POST", "/demo/load");
  const vv2 = await rowId("vv.single");
  const att = sql(`select id from source_attachment where combination_id='${vv2}' and file_name='imm5257e.pdf'`);
  r = await call("POST", `/attachments/${att}/draft`, { mode: "replay" });
  const jobId = r.body?.id;
  await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED");
  let job = (await call("GET", `/jobs/${jobId}`)).body;
  ok("replay of the saved real IMM 5257 run (labelled, US$0) is compared with the library", job.mode === "REPLAY" && job.costUsd === 0 && job.items.length > 50, `${job.runId}: ${job.items.length} items`);
  await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "REUSE" }); await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" });
  const changed = job.items.find((i: any) => i.proposedKey === "person.occupation_title");
  if (changed) await call("POST", `/jobs/${jobId}/items/${changed.id}`, { decision: "CHANGED", key: "person.employment_activity" });
  job = (await call("GET", `/jobs/${jobId}`)).body;
  for (const i of job.items.filter((x: any) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED" });
  r = await call("POST", "/library/fields", { key: "person.synthetic_extra_field", meaning: "A definition added by someone else while the draft waited", valueType: "text" });
  r = await call("POST", `/jobs/${jobId}/apply`, {});
  ok("stale result refused: the library changed after the comparison, so applying is refused", r.status === 409 && /Stale/.test(r.body.message), r.body.message);
  r = await call("POST", `/jobs/${jobId}/recompare`);
  const kept = r.body?.detail?.recompared;
  job = (await call("GET", `/jobs/${jobId}`)).body;
  ok("compare again (no AI call) keeps every decision that still holds, including the person's change", kept?.kept > 50 && job.items.find((i: any) => i.proposedKey === "person.occupation_title")?.decidedKey === "person.employment_activity", kept);
  for (const i of job.items.filter((x: any) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED" });
  const wpBefore = (await call("GET", `/releases?combination=${await rowId("wp.family")}`)).body[0]?.sha256;
  const [ap1, ap2] = await Promise.all([call("POST", `/jobs/${jobId}/apply`, {}), call("POST", `/jobs/${jobId}/apply`, {})]);
  ok("apply twice at once: exactly one applies, the other is refused", [ap1, ap2].filter((x) => x.status === 201).length === 1 && [ap1, ap2].filter((x) => x.status === 409).length === 1, [ap1.status, ap2.status]);
  const wpAfter = (await call("GET", `/releases?combination=${await rowId("wp.family")}`)).body[0]?.sha256;
  ok("released versions are untouched by applying a draft elsewhere", wpBefore === wpAfter && !!wpBefore);

  console.log(`\n${pass}/${pass + fail} passed`);
  const out = join(STUDIO, "evidence", "ai-orchestration"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_ai_orchestration.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, database: DB, paid_calls: 0, test_switches: ["STUDIO_FAULT_SOURCE=imm5475e.pdf (phase 1)", "STUDIO_HOLD_QUEUE=1 (phase 2)"], pass, fail, log }, null, 1));
  server("restart"); execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "stop"]);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
