// C3.3 — An AI failure gives a plain message and keeps the good entries; a paid repeat of a failed run is refused.
// Status (qa/CAPABILITIES.md, 1 Nov): Partial ("no person walk yet"). This file is a guard file: at API level it found
// nothing missing (the person walk is J2 step 9). The paid-repeat refusal is checked through the API (AT-12): the check
// plants a Sample failed answer for IMM 1344 made with today's prompt, schema and settings (copied from a saved real
// IMM 1344 refusal of 22–23 Oct, its inputs set to today's job file; test input, removed at the end) and asks the plan
// for a live draft again: it must refuse the paid call at US$0; the same record with a changed prompt must not be
// refused (it would ask something new). AT-7..AT-9 keep the rule on the four saved real refusals (pure functions).
// Decisions: P-110 (plain errors with the next step), P-139 (each step once live, fixed before repeating), P-175 (live
// off), P-179/P-194 (limits stop before spending), Lead check A1–A3 (23 Oct: one bad entry goes to a person, the rest
// kept; a failed answer is re-checked at US$0, never paid for again).
// US$0: saved answers and library reuse only; the failure is the test-only switch STUDIO_FAULT_SOURCE (an induced fault
// for one form, honoured only on an isolated copy); no live switch; ledger checked unchanged.
// Run (from prototype/studio):
//   zsh tools/isolated.sh acc_c3 4571 start STUDIO_FAULT_SOURCE=imm5707e.pdf STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs
//   ./node_modules/.bin/tsx acceptance/C3.3.test.ts 4571 xr_studio_acc_c3 ; zsh tools/isolated.sh acc_c3 4571 stop
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 14 pass, 0 fail — a guard file: it guards
// what works. The paid repeat of a failed run is refused through the API (AT-12, the plan answers not_eligible "A new
// paid call is refused … failed our own check"); the person walk is J2 step 9.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy, sample, fault switch).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkedOutput, explainRun, failedOurCheck, sameDraftInputs, type RunEnvelope } from "../engine/ai-run.ts";
import { convertFieldMap } from "../../p2/convert.ts";
import { checkCopy, needCombo, PLANT_MARK, plantRun, sqlFor, stop } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4571), DB = process.argv[3] ?? "xr_studio_acc_c3", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), RUNS = join(PROTOTYPE, "p2", "runs");
const FAKE_LOG = join(STUDIO, "var", `isolated-${NAME}`, "fake-launch.log");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
/** fetch, sent again once when a kept-alive connection was closed before any reply (as tests/check_forms_slice2.ts). */
const send = async (url: string, init: RequestInit): Promise<Response> => { try { return await fetch(url, init); } catch (e) { if (!/EPIPE|ECONNRESET|UND_ERR_SOCKET/.test(String((e as { cause?: { code?: string } }).cause?.code ?? ""))) throw e; return fetch(url, init); } };
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await send(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(500); } return false; };
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");
const ledger = async () => { const l = (await call("GET", "/ledger")).body; return JSON.stringify([l?.committed_usd, l?.wave?.spent_usd]); };
const liveCalls = () => (existsSync(FAKE_LOG) ? readFileSync(FAKE_LOG, "utf8").split("\n").filter((l) => l.includes('"mode":"live"')).length : 0);
const setupMissing = stop;
const TECH = /\b(ENOENT|EACCES|errno|syscall|stack)\b|\/(Users|home|private|tmp)\/|\.(m?[jt]s):\d+/;

(async () => {
  await checkCopy(PORT, DB);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const loaded = await call("POST", "/demo/load");
  if (loaded.status >= 300) setupMissing("the sample did not load");
  const vv = await needCombo(PORT, DB, "visitor_visa");
  const a5257 = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  const a5707 = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5707e.pdf'`);
  if (loaded.status >= 300 || !a5257 || !a5707) setupMissing("the sample (Visitor visa with IMM 5257 and IMM 5707) did not load");
  const ledger0 = await ledger(), live0 = liveCalls();

  // ── one batch: IMM 5257 from its saved answer, IMM 5707 from the library; IMM 5707 fails (induced)
  const scope = { kind: "combination", ids: [vv] };
  const plan = (await call("POST", "/ai/plan", { scope, mode: "REPLAY", draftAgain: true })).body;
  ok("C3.3 AT-1 the plan says before anything starts what each form will do and that it costs US$0", plan?.targets?.some((t: { attachmentId: string }) => t.attachmentId === a5257) && plan.targets.some((t: { attachmentId: string }) => t.attachmentId === a5707) && plan.totals?.worst_usd === 0 && plan.targets.filter((t: { action: string }) => t.action !== "skip").every((t: { why: string }) => /US\$0|no cost/.test(t.why)), plan?.targets?.map((t: { action: string; why: string }) => [t.action, t.why]));
  const launch = (actor: string) => call("POST", "/ai/batches", { scope, mode: "REPLAY", draftAgain: true, planSha256: plan.plan_sha256, idempotencyKey: `acc-c33-${actor}-${Date.now()}` }, actor);
  let r = await launch("user-B");
  ok("C3.3 AT-2 refusal: the approver (no author duty) cannot start AI work (403); nothing is queued", r.status === 403 && sql("select count(*) from ai_batch") === "0", r.status);
  r = await launch("user-A");
  const B: string = r.body?.id;
  if (!B) setupMissing(`the batch did not start: ${words(r)}`);
  await until(async () => ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes((await call("GET", `/ai/batches/${B}`)).body?.status));
  let batch = (await call("GET", `/ai/batches/${B}`)).body;
  const job5257 = batch.jobs.find((j: { source: string }) => /IMM 5257/.test(j.source)), job5707 = batch.jobs.find((j: { source: string }) => /IMM 5707/.test(j.source));
  if (job5707?.status !== "FAILED" || !/Induced test fault/.test(job5707?.message ?? "")) setupMissing("the copy was not started with STUDIO_FAULT_SOURCE=imm5707e.pdf (see the run line)");
  const kept = (await call("GET", `/jobs/${job5257?.id}`)).body;
  ok("C3.3 AT-3 one form's failure keeps the good work: the batch is Done with problems, IMM 5257's draft is complete with all its proposals, at US$0",
    batch.status === "PARTIAL" && kept?.status === "COMPLETED" && kept.items?.length === kept.detail?.counts?.proposed_fields && kept.items.length > 0 && batch.spent_usd === 0, { batch: batch.status, kept: kept?.status, items: kept?.items?.length });
  const run = (await call("GET", `/runs/${B}`)).body;
  ok("C3.3 AT-4 the run says the failure in plain words with one next step (no codes, paths or stack); spent US$0 is on the card",
    run?.status === "done_with_problems" && !!run.error?.what && !!run.error?.next?.label && run.steps.every((s: { message: string | null }) => !TECH.test(s.message ?? "")) && run.usd?.spent === 0, { status: run?.status, error: run?.error });

  // ── retry: only the failed step, bounded
  r = await call("POST", `/ai/batches/${B}/retry`, {}, "user-C");
  ok("C3.3 AT-5 refusal: a reviewer cannot retry (403)", r.status === 403, r.status);
  for (let n = 0; n < 2; n++) { await call("POST", `/ai/batches/${B}/retry`, {}); await until(async () => !["QUEUED", "RUNNING"].includes((await call("GET", `/ai/batches/${B}`)).body?.status)); }
  batch = (await call("GET", `/ai/batches/${B}`)).body;
  const attempts = (re: RegExp) => batch.jobs.filter((j: { source: string }) => re.test(j.source)).map((j: { attempt: number }) => j.attempt).join(",");
  ok("C3.3 AT-5 Retry re-runs only the failed step (attempts 2 and 3); the finished IMM 5257 draft is never run again", attempts(/IMM 5707/) === "1,2,3" && attempts(/IMM 5257/) === "1", { i5707: attempts(/IMM 5707/), i5257: attempts(/IMM 5257/) });
  const steps = sql("select count(*) from drafting_job");
  r = await call("POST", `/ai/batches/${B}/retry`, {});
  ok("C3.3 AT-6 refusal: a fourth attempt is refused in plain words (it needs a person, not another retry); no step is added", r.status >= 400 && /needs a person/.test(words(r)) && sql("select count(*) from drafting_job") === steps, r.body);

  // ── a failed answer: one bad entry goes to a person, the rest are kept (saved real IMM 1344 answers, no model)
  const REFUSED = ["20261022t033516238z", "20261022t034944757z", "20261023t044208446z", "20261023t045220033z"].map((t) => `studio-fieldmap-imm1344e-live-${t}.json`).filter((f) => existsSync(join(RUNS, f)));
  const env = REFUSED.length ? JSON.parse(readFileSync(join(RUNS, REFUSED[3] ?? REFUSED[0]), "utf8")) as RunEnvelope & { raw_output: string; drafting_run: any } : null; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!env) ok("C3.3 AT-7 the four saved IMM 1344 refusals are on file", false, REFUSED);
  else {
    const said = explainRun(env);
    ok("C3.3 AT-7 a saved failed answer is explained in plain words: how many form fields the AI answered, which entry broke which rule, nothing applied, its cost", said.status === "FAILED" && /^AI answered \d+ form fields\. 1 entry broke our entry rules \(form field \d+: .*naming rule\)\. Nothing was applied\. Cost US\$\d+\.\d\d\.$/.test(said.message), said);
    const planted = JSON.parse(env.raw_output);
    const i = planted.entries.findIndex((e: { outcome: string }, n: number) => n > 100 && e.outcome === "mapped");
    const goodBefore = planted.entries.filter((e: { outcome: string }) => e.outcome === "mapped").length;
    planted.entries[i].fact = "Person.Bad-Name";
    const c = convertFieldMap(planted, env.drafting_run.inputs.official_files[0].file);
    const seen = checkedOutput({ ...env, raw_output: JSON.stringify(planted), conversion: { needs_person: c.needs_person } } as RunEnvelope);
    ok("C3.3 AT-8 one bad entry in an AI answer goes to a person with the reason; every other entry is kept as answered (the studio reads the checked answer)",
      c.needs_person.length === 1 && c.entries[i].outcome === "unresolved" && /naming rule/.test(c.entries[i].unresolved_reason) && c.entries.filter((e: { outcome: string }) => e.outcome === "mapped").length === goodBefore - 1 && seen.entries[i].fact === null && seen.entries.length === planted.entries.length,
      { needs: c.needs_person.length, mapped: c.entries.filter((e: { outcome: string }) => e.outcome === "mapped").length, goodBefore });
    const asked = { inputSha: env.drafting_run.inputs.official_files[0].sha256, templateSha: (env as any).launch_evidence.template_sha256, schemaSha: (env as any).launch_evidence.schema_sha256, model: env.drafting_run.settings.model, effort: env.drafting_run.settings.effort, maxOutputTokens: env.drafting_run.settings.max_output_tokens, known: (env as any).launch_evidence.known ?? null }; // eslint-disable-line @typescript-eslint/no-explicit-any
    ok("C3.3 AT-9 a paid repeat is recognised: the same form, prompt, schema and settings as an answer that failed only our check is a repeat (refused); a changed prompt is not",
      failedOurCheck(env) && sameDraftInputs(env, asked) && !sameDraftInputs(env, { ...asked, templateSha: "changed" }), asked);
  }
  // ── the IMM 1344 form through the API: a saved answer before any paid call; live refused at US$0
  const wp = await needCombo(PORT, DB, "lmia_work_permit");
  await call("POST", `/combinations/${wp}/attachments/sample`, { officialFile: "imm1344e.pdf" });
  const a1344 = sql(`select id from source_attachment where combination_id='${wp}' and file_name='imm1344e.pdf'`);
  const p1344 = a1344 ? (await call("POST", "/ai/plan", { scope: { kind: "source", ids: [a1344] }, mode: "LIVE" })).body : null;
  ok("C3.3 AT-10 asked for a live draft of IMM 1344, the plan uses the saved answer first (no model call, US$0) instead of paying again", p1344?.targets?.[0]?.action === "reuse_saved_output" && p1344.totals?.worst_usd === 0, p1344?.targets?.[0]);
  const l1344 = a1344 ? await call("POST", `/attachments/${a1344}/draft`, { mode: "live", idempotencyKey: `acc-c33-live-${Date.now()}` }) : { status: 0, body: null };
  await until(async () => sql(`select count(*) from drafting_job where attachment_id='${a1344}' and status in ('QUEUED','RUNNING')`) === "0", 30_000);

  // ── a paid repeat of a failed run is refused through the API (planted Sample record with today's inputs)
  const JOB = join(PROTOTYPE, "p2", "jobs", "studio-fieldmap-imm1344e.json"), PROMPTS = join(PROTOTYPE, "p2", "prompts");
  if (!a1344 || !env || !existsSync(JOB)) setupMissing("IMM 1344 could not be added to the work permit, a saved refusal is missing, or its job file was not written by the plan");
  const job = JSON.parse(readFileSync(JOB, "utf8"));
  const shaOf = (f: string) => createHash("sha256").update(readFileSync(join(PROMPTS, f))).digest("hex");
  const today = (templateSha: string) => { const e = JSON.parse(JSON.stringify(env)); e.drafting_run.inputs.official_files = job.inputs; e.drafting_run.settings = { ...e.drafting_run.settings, model: job.settings.model, effort: job.settings.effort, max_output_tokens: job.settings.max_output_tokens }; e.launch_evidence = { ...e.launch_evidence, template_sha256: templateSha, schema_sha256: shaOf(job.output_schema), known: job.known ?? null }; e.drafting_run.ended_at = "2026-11-01T00:00:00.000Z"; return e; };
  const livePlan = async () => (await call("POST", "/ai/plan", { scope: { kind: "source", ids: [a1344] }, mode: "LIVE", draftAgain: true })).body?.targets?.[0];
  plantRun(`studio-fieldmap-imm1344e-live-20261101t000000001z-${PLANT_MARK}.json`, today("0".repeat(64)));
  const changed = await livePlan();
  ok("C3.3 AT-12 pass: a failed answer made with another prompt is not a repeat: drafting again live is offered and priced (not refused)", changed?.action !== "not_eligible" && !/refused/i.test(changed?.why ?? ""), changed);
  plantRun(`studio-fieldmap-imm1344e-live-20261101t000000002z-${PLANT_MARK}.json`, today(shaOf(job.template)));
  const q0 = sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job");
  const repeat = await livePlan();
  ok("C3.3 AT-12 refusal through the API: drafting IMM 1344 live again with the same form, prompt, schema and settings as an answer that failed our own check is refused in words before anything starts (US$0, nothing queued)",
    repeat?.action === "not_eligible" && /refused/.test(repeat?.why ?? "") && /failed our own check/.test(repeat?.why ?? "") && sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job") === q0, repeat);
  ok("C3.3 AT-11 the whole check spent nothing: no live call reached the launcher, the ledger is unchanged", liveCalls() === live0 && (await ledger()) === ledger0, { live: liveCalls() - live0, l1344: [l1344.status, words(l1344 as Res).slice(0, 120)], ledger0, now: await ledger() });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C3.3 the check itself stopped:", e); process.exit(1); });
