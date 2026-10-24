// QA-34 (P-69 coverage floor) and QA-30 (forms lane, slice 2b): the paths of a live field-map draft that only a paid call
// reaches today (api/src/sources.ts launch: stub refused, provider limit before or after a run record, the launcher
// stopping without a reason, a ledger lock, an unreadable record; engine/ai-run.ts explainRun for every run status),
// and the same refusals for a draft in parts (runParts), tested through the API with a fake launcher (tests/fixtures/fake-launch.mjs) on an isolated copy: no network, US$0.
// The server honours STUDIO_FAKE_LAUNCHER only in an isolated copy's own working folder. QA-30: a draft request with no
// mode is a plain 400. QA-27, QA-31, QA-32 (qa Minors pass): plain words on the screen-map refusals, a screen-map draft
// cancelled before its paid call, a retry after a mid-run cancel. Every rule has a passing and a failing case.
//   zsh studio/tools/isolated.sh forms_fl 4453 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_ai_launch_paths.ts 4453 xr_studio_forms_fl
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4453), DB = process.argv[3] ?? "xr_studio_forms_fl";
const STUDIO = join(import.meta.dirname, "..");
const VARDIR = join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
const LEDGER = join(STUDIO, "..", "p2", "ledger", "spend.jsonl");
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const FIX = join(STUDIO, "tests", "fixtures");
const upload = async (path: string, names: string[]): Promise<Res> => {
  const fd = new FormData(); for (const n of names) fd.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, "portal", n)))]), n);
  const x = await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  return { status: x.status, body: await x.json() };
};
const JARGON = /expected \w+, received|Invalid input|Too small|Too big|undefined|\bnull\b|NaN|TypeError/i;
const scenario = (x: unknown) => { writeFileSync(join(VARDIR, "fake-launch.json"), JSON.stringify(x)); rmSync(join(VARDIR, "fake-launch.count"), { force: true }); writeFileSync(join(VARDIR, "fake-launch.log"), ""); };
const calls = () => readFileSync(join(VARDIR, "fake-launch.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as { mode: string });
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const until = async (fn: () => Promise<boolean>, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const finished = async (jobId: string) => { let j: Res = { status: 0, body: null }; await until(async () => { j = await call("GET", `/jobs/${jobId}`); return !["QUEUED", "RUNNING"].includes(j.body?.status); }); return j.body; };
type Step = { exit?: number; out?: Record<string, unknown>; err?: string; record?: unknown };
/** One live draft of the source through the fake launcher, answering as the scenario says. */
let source = "";
const draft = async (scenario: { stub?: Step; live?: Step; locked_first?: boolean }, src = source) => {
  writeFileSync(join(VARDIR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, ...scenario }));
  rmSync(join(VARDIR, "fake-launch.count"), { force: true }); writeFileSync(join(VARDIR, "fake-launch.log"), "");
  const r = await call("POST", `/attachments/${src}/draft`, { mode: "live" });
  if (r.status !== 201) return { status: "NOT STARTED", message: JSON.stringify(r.body).slice(0, 200), calls: [] as { mode: string }[] };
  const j = await finished(r.body.id);
  const calls = readFileSync(join(VARDIR, "fake-launch.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  return { ...j, calls };
};
const record = (run: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ caller: "live", contract_valid: false, raw_output: null, drafting_run: { run_id: `fake-${Math.random().toString(36).slice(2, 8)}`, attempts: [], usage: { cost_usd: 0.42 }, ...run }, ...extra });

(async () => {
  // ──────────────────────────────────────────── setup: a small form with no reviewed map, so a live draft is one whole-form call
  await call("POST", "/demo/load");
  const vv = sql("select id from combination where combination_key='vv.single'");
  const add = await call("POST", `/combinations/${vv}/attachments/sample`, { officialFile: "imm5409e.pdf" });
  source = sql(`select id from source_attachment where file_name='imm5409e.pdf' and combination_id='${vv}'`);
  // The library's IMM 5409 map stands in for another edition's, not released (never reused), so the form is drafted.
  sql("update form_edition set sha256 = repeat('1', 64) where edition_label = 'IMM 5409 (01-2023)'");
  sql("update form_field_map set status = 'DRAFT' where form_edition_id = (select id from form_edition where edition_label = 'IMM 5409 (01-2023)')");
  sql(`update source_attachment set status = 'RECOGNISED' where id = '${source}'`);
  const plan = await call("POST", "/ai/plan", { scope: { kind: "source", ids: [source] }, mode: "LIVE", draftAgain: true });
  ok("setup: IMM 5409 on the Visitor visa plans one whole-form live call (no parts, nothing reused)", add.status === 201 && plan.body.targets?.[0]?.action === "draft" && !plan.body.targets[0].a4, plan.body.targets?.[0]?.why);
  const ledgerBefore = statSync(LEDGER).size;

  // ──────────────────────────────────────────── QA-30: a draft request with no mode
  let r = await call("POST", `/attachments/${source}/draft`, {});
  ok("QA-30: a draft request with no mode is a plain 400 naming the three ways, never a 500", r.status === 400 && /"live".*"replay".*"stub"/.test(r.body.message), { status: r.status, message: r.body?.message });
  r = await call("POST", `/attachments/${source}/draft`, { mode: "LIVE!" });
  ok("QA-30 fail: an unknown mode is refused the same way", r.status === 400 && /Choose how to draft/.test(r.body.message), r.body?.message);
  r = await call("POST", `/attachments/${source}/draft`, { mode: "stub" }, "user-C");
  ok("QA-30 fail: the mode check does not let a reviewer (no author duty) start a draft", r.status === 403, r.status);

  // ──────────────────────────────────────────── refusals before any run record (sources.ts launch)
  let j = await draft({ stub: { exit: 1, out: { refused: "guard: the inventory changed since it was admitted" } } });
  ok("stub refused: the step FAILS with the guard's reason and the live call is never made", j.status === "FAILED" && /stub pass failed: guard: the inventory changed/.test(j.message) && !j.calls.some((c: { mode: string }) => c.mode === "live"), { status: j.status, message: j.message, calls: j.calls.length });
  j = await draft({ live: { exit: 1, out: { refused: "Anthropic API: account usage limit reached" } } });
  ok("provider limit before the call (no run record): BLOCKED, no cost, the way out said", j.status === "BLOCKED" && /account usage limit/.test(j.message) && /saved AI answer, or try again/.test(j.message) && !j.costUsd, { status: j.status, message: j.message });
  j = await draft({ live: { exit: 3 } });
  ok("the launcher stops with no reason: FAILED, and the message is never empty (it names the exit)", j.status === "FAILED" && /launcher stopped \(exit 3\) without giving a reason/.test(j.message), j.message);
  j = await draft({ live: { exit: 1, err: "TypeError: cannot read the job file\n    at main (launch.ts:12)" } });
  ok("the launcher fails with an error: FAILED with its last lines, not BLOCKED (not a provider limit)", j.status === "FAILED" && /did not run: .*cannot read the job file/.test(j.message), j.message);
  j = await draft({ locked_first: true, live: { exit: 1, out: { refused: "budget: the experiment cap is reached" } } });
  ok("a ledger lock (another paid call running) is waited out and the launch tried again, once the lock is free", j.calls.filter((c: { mode: string }) => c.mode === "live").length === 2 && j.status === "FAILED" && /experiment cap/.test(j.message), { calls: j.calls.map((c: { mode: string }) => c.mode), message: j.message });

  // ──────────────────────────────────────────── a run record that is not a usable draft (sources.ts launch + ai-run.ts explainRun)
  j = await draft({ live: { exit: 0, record: record({ status: "provider_error", attempts: [{ outcome: "error", error: '400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits."},"request_id":"req_fake123"}' }] }) } });
  ok("provider limit after the call (run record): BLOCKED, US$0, the request id named, the ledger correction tried (AIW-D273)", j.status === "BLOCKED" && j.costUsd === 0 && /req_fake123/.test(j.message) && j.detail?.ledger_correction !== undefined, { status: j.status, cost: j.costUsd, message: j.message?.slice(0, 160) });
  const cases: [string, Record<string, unknown>, Record<string, unknown>, RegExp][] = [
    ["refused", { status: "refused" }, {}, /The AI declined to draft this form\. Nothing was applied\. Cost US\$0\.42/],
    ["timed_out", { status: "timed_out" }, {}, /did not answer in time/],
    ["budget_exceeded", { status: "budget_exceeded" }, {}, /over its spending cap/],
    ["provider_error (not a limit)", { status: "provider_error", attempts: [{ outcome: "error", error: "529 overloaded" }] }, {}, /provider returned an error: 529 overloaded/],
    ["invalid_output cut at the limit", { status: "invalid_output", settings: { max_output_tokens: 4000 }, usage: { output_tokens: 4000, cost_usd: 0.3 } }, { output_errors: "stop_reason max_tokens" }, /cut off at the output limit \(4000 of 4000/],
    ["invalid_output in another shape", { status: "invalid_output" }, { output_errors: { entries: "missing" } }, /not in the agreed shape \(\{"entries":"missing"\}\)/],
    ["completed, entries break our rules", { status: "completed" }, { raw_output: JSON.stringify({ canonical_fields: [], entries: [{ data_path: "a", outcome: "mapped", fact: "Person.Name" }] }), contract_errors: [{ instancePath: "/entries/0/fact", message: "bad" }] }, /AI answered 1 form field\. 1 entry broke our entry rules \(form field 1: field name "Person\.Name" breaks the naming rule\)/],
    ["completed, the run record failed our check", { status: "completed" }, { raw_output: "not json" }, /AI answered\. The answer failed our check of the run record/],
    ["an unknown status", { status: "weird" }, {}, /ended without a usable draft \(status weird\)/],
  ];
  for (const [label, run, extra, want] of cases) {
    j = await draft({ live: { exit: 0, record: record(run, extra) } });
    ok(`run record ${label}: FAILED in plain words, nothing applied, the run named`, j.status === "FAILED" && want.test(j.message) && /Run fake-/.test(j.message), j.message);
  }
  j = await draft({ live: { exit: 0, out: { run_file: join(VARDIR, "no-such-run.json") } } });
  ok("a run file that cannot be read: FAILED with the reason, the step never stays RUNNING", j.status === "FAILED" && /ENOENT|no such file/i.test(j.message), j.message);
  // ──────────────────────────────────────────── the same refusals for a draft in parts (IMM 5406: 2 parts; sources.ts runParts)
  await call("POST", `/combinations/${vv}/attachments/sample`, { officialFile: "imm5406e.pdf" });
  const parts = sql(`select id from source_attachment where file_name='imm5406e.pdf' and combination_id='${vv}'`);
  const p0 = await call("POST", "/ai/plan", { scope: { kind: "source", ids: [parts] }, mode: "LIVE", draftAgain: true });
  ok("setup: IMM 5406 plans a live draft (read first, then in parts)", p0.body.targets?.[0]?.action === "draft", p0.body.targets?.[0]?.why);
  j = await draft({ live: { exit: 1, out: { refused: "Anthropic API: account usage limit reached" } } }, parts);
  ok("parts: every part refused by the provider's account limit is BLOCKED (as a whole-form draft is), no cost, the way out said", j.status === "BLOCKED" && /2 of 2 parts were refused before any processing/.test(j.message) && j.costUsd === 0 && /saved AI answer/.test(j.message), { status: j.status, message: j.message });
  j = await draft({ stub: { exit: 1, out: { refused: "guard: part not in its parent inventory" } } }, parts);
  ok("parts fail: a part whose stub pass is refused FAILS with the guard's reason, and no live call is made", j.status === "FAILED" && /stub pass failed/.test(j.message) && !j.calls.some((c: { mode: string }) => c.mode === "live"), { status: j.status, message: j.message?.slice(0, 200) });
  j = await draft({ live: { exit: 4 } }, parts);
  ok("parts fail: a launcher that stops with no reason says so for each part (never an empty reason), FAILED not BLOCKED", j.status === "FAILED" && /part 1: the launcher stopped without a reason/.test(j.message), j.message);
  j = await draft({ live: { exit: 0, record: record({ status: "timed_out" }) } }, parts);
  ok("parts fail: a run record that is not a usable draft FAILS each part in plain words, and the cost of both calls is summed", j.status === "FAILED" && /did not answer in time/.test(j.message) && j.costUsd === 0.84, { status: j.status, cost: j.costUsd, message: j.message?.slice(0, 200) });
  j = await draft({ live: { exit: 0, record: record({ status: "provider_error", attempts: [{ outcome: "error", error: '400 {"error":{"message":"You have reached your specified API usage limits."}}' }] }) } }, parts);
  ok("parts: a provider limit found in the run records also gives BLOCKED", j.status === "BLOCKED", { status: j.status, message: j.message?.slice(0, 160) });
  j = await draft({ live: { exit: 0, out: { run_file: join(VARDIR, "no-such-run.json") } } }, parts);
  ok("parts fail: an unreadable run file ends the step FAILED with the reason (never left RUNNING)", j.status === "FAILED" && /ENOENT|no such file/i.test(j.message), j.message);
  // ──────────────────────────────────────────── QA-32: retry after a mid-run cancel of a draft in parts
  // (review and break of the qa Minors pass, M1: a cancel during a part's stub pass must stop that part's paid call too)
  scenario({ stub: { exit: 0, out: { ok: true }, sleep_ms: 2500 }, live: { exit: 1, out: { refused: "budget: the experiment cap is reached" } } });
  r = await call("POST", `/attachments/${parts}/draft`, { mode: "live" });
  const mid = r.body.id as string;
  await until(async () => (await call("GET", `/jobs/${mid}`)).body.detail?.a4?.parts?.[0]?.status === "running");
  const midBatch = (await call("GET", `/jobs/${mid}`)).body.batchId as string;
  await call("POST", `/ai/batches/${midBatch}/cancel`, {});
  const cancelledMid = await finished(mid);
  ok("QA-32 / M1: a draft in parts cancelled during part 1's stub pass ends CANCELLED, and no part makes its paid call", cancelledMid.status === "CANCELLED" && (cancelledMid.detail?.a4?.parts ?? []).every((x: { status: string }) => x.status === "not started") && !calls().some((x) => x.mode === "live"), { status: cancelledMid.status, parts: cancelledMid.detail?.a4?.parts?.map((x: { status: string }) => x.status), calls: calls().map((x) => x.mode) });
  const midView = await call("GET", `/ai/batches/${midBatch}`);
  ok("QA-32 (review 2): the AI work page is told the cancelled step can be retried (its Retry button follows the server's rule)", midView.body.jobs?.[0]?.retryable === true, midView.body.jobs?.[0]?.retryable);
  scenario({ live: { exit: 1, out: { refused: "budget: the experiment cap is reached" } } });
  r = await call("POST", `/ai/batches/${midBatch}/retry`, {});
  const retried = sql(`select count(*) from drafting_job where batch_id='${midBatch}' and attempt = 2`);
  ok("QA-32: the parts not sent can be retried: the retry is accepted and starts a second attempt of the step", r.status === 201 && retried === "1", { status: r.status, message: r.body?.message, retried });
  await until(async () => sql(`select count(*) from drafting_job where batch_id='${midBatch}' and status in ('QUEUED','RUNNING')`) === "0");
  scenario({ stub: { exit: 0, out: { ok: true } } });
  r = await call("POST", `/attachments/${parts}/draft`, { mode: "stub" });
  const okJob = await finished(r.body.id);
  const okView = await call("GET", `/ai/batches/${okJob.batchId}`);
  r = await call("POST", `/ai/batches/${okJob.batchId}/retry`, {});
  ok("QA-32 fail: a step that ran to its end is not retried (and not offered), and the refusal says how to draft again", okJob.status === "COMPLETED" && okView.body.jobs?.[0]?.retryable === false && r.status === 400 && /Nothing to retry: every step finished or ran to its end\. To draft a form anew, start its draft again/.test(r.body.message), { job: okJob.status, status: r.status, message: r.body?.message });

  // ──────────────────────────────────────────── M1 on a whole-form draft (IMM 5409): cancelled before, or during, its paid call
  scenario({ stub: { exit: 0, out: { ok: true }, sleep_ms: 2500 }, live: { exit: 1, out: { refused: "should never be called" } } });
  r = await call("POST", `/attachments/${source}/draft`, { mode: "live" });
  let wf = r.body.id as string;
  await until(async () => calls().some((x) => x.mode === "stub"));
  await call("POST", `/ai/batches/${(await call("GET", `/jobs/${wf}`)).body.batchId}/cancel`, {});
  let wj = await finished(wf);
  ok("M1 whole form: a cancel during the stub pass means the paid call is never made: CANCELLED before its AI call, US$0, retryable", wj.status === "CANCELLED" && /before it started its AI call/.test(wj.message) && !calls().some((x) => x.mode === "live") && (wj.costUsd ?? 0) === 0 && (await call("GET", `/ai/batches/${wj.batchId}`)).body.jobs?.[0]?.retryable === true, { status: wj.status, message: wj.message, calls: calls().map((x) => x.mode) });
  scenario({ live: { exit: 0, sleep_ms: 2500, record: record({ status: "completed" }, { contract_valid: true, raw_output: JSON.stringify({ canonical_fields: [], entries: [] }) }) } });
  r = await call("POST", `/attachments/${source}/draft`, { mode: "live" });
  wf = r.body.id as string;
  await until(async () => calls().some((x) => x.mode === "live"));
  await call("POST", `/ai/batches/${(await call("GET", `/jobs/${wf}`)).body.batchId}/cancel`, {});
  wj = await finished(wf);
  ok("M1 whole form (break m1): a cancel during the paid call keeps its cost but never compares or applies its answer", wj.status === "CANCELLED" && /while the AI call ran: its answer was kept in the run record but not compared or applied\. Cost US\$0\.42/.test(wj.message) && sql(`select count(*) from normalization_item where job_id='${wf}'`) === "0", { status: wj.status, message: wj.message });

  // ──────────────────────────────────────────── QA-31 and QA-27: a screen-map draft (online IMM 5257 on the Visitor visa)
  const cap = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Visitor visa (Sample)" })).body.id as string;
  await upload(`/captures/${cap}/screens`, ["imm5257-online-s1-personal.html", "imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"]);
  await call("POST", `/captures/${cap}/finish`);
  const ed = (await call("POST", `/captures/${cap}/approve`, undefined, "user-C")).body.edition.id as string;
  await call("POST", `/online-versions/${ed}/screen-map/draft`);
  await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  await call("PATCH", `/combinations/${vv}/portal`, { portal: "ircc_portal" });
  await call("POST", `/combinations/${vv}/lines`, { kind: "FORM", formKey: "IMM 5257" });
  const SM = `/online-versions/${ed}/screen-map/ai`;
  const open = sql(`select string_agg(data_path, ',' order by data_path) from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`).split(",").filter(Boolean);
  const bad: [string, unknown][] = [["an empty body", {}], ["a combination that is not an id", { combinationId: "vv.single", mode: "STUB" }], ["mode in lower case", { combinationId: vv, mode: "stub" }], ["a worst case sent as text", { combinationId: vv, mode: "LIVE", confirmWorstUsd: "0.50" }], ["a negative worst case", { combinationId: vv, mode: "LIVE", confirmWorstUsd: -1 }], ["a list instead of one object", [1]]];
  for (const [what, body] of bad) { r = await call("POST", SM, body); ok(`QA-27: ${what} → 400 in plain words (no validator text)`, r.status === 400 && !JARGON.test(r.body.message ?? "") && (r.body.message ?? "").length > 10, r.body?.message); }
  r = await call("POST", `${SM}/accept`, { jobId: "00000000-0000-4000-8000-000000000000", inputs: "birthCity" }, "user-C");
  ok("QA-27: accept with the inputs as text, not a list → 400 saying how to list them", r.status === 400 && /List the inputs to accept/.test(r.body.message) && !JARGON.test(r.body.message), r.body?.message);
  r = await call("POST", `${SM}/accept`, [1], "user-C");
  ok("QA-27 (review 4): a list body on accept is refused without the start's example", r.status === 400 && /one JSON object, not a list/.test(r.body.message) && !/combinationId/.test(r.body.message), r.body?.message);
  r = await call("POST", SM, { combinationId: vv, mode: "STUB" });
  ok("QA-27 fail: a well-formed start is not refused by the new words; a stub (US$0) makes no AI work entry (break m5)", r.status === 201 && !r.body.batchId, { status: r.status, batch: r.body?.batchId });
  await finished(r.body.id);
  const worst = Number(/US\$([0-9.]+)/.exec((await call("POST", SM, { combinationId: vv, mode: "LIVE" })).body.message ?? "")?.[1]);
  const startLive = async () => { const x = await call("POST", SM, { combinationId: vv, mode: "LIVE", confirmWorstUsd: worst }); return { job: x.body.id as string, batch: x.body.batchId as string }; };
  scenario({ stub: { exit: 0, out: { ok: true }, sleep_ms: 2500 }, live: { exit: 1, out: { refused: "should never be called" } } });
  let sm = await startLive();
  const c = await call("POST", `/ai/batches/${sm.batch}/cancel`, {});
  let smDone = await finished(sm.job);
  ok("QA-31: a live screen-map draft is its own AI work and can be cancelled: cancelled during its stub pass, the paid call is never made (US$0)", !!sm.batch && c.status === 201 && smDone.status === "CANCELLED" && /the AI call was not made/.test(smDone.message) && !calls().some((x) => x.mode === "live") && (smDone.costUsd ?? 0) === 0, { batch: !!sm.batch, cancel: c.status, status: smDone.status, message: smDone.message, calls: calls().map((x) => x.mode) });
  const smb = await call("GET", `/ai/batches/${sm.batch}`);
  ok("QA-31: its AI work ends CANCELLED (not left running), with a heading and its step not offered for retry (review 2)", smb.body.status === "CANCELLED" && smb.body.operation_label === "Screen-map draft with AI" && smb.body.jobs?.[0]?.retryable === false, { status: smb.body?.status, label: smb.body?.operation_label, retryable: smb.body?.jobs?.[0]?.retryable });
  r = await call("POST", `/ai/batches/${sm.batch}/retry`, {});
  ok("QA-31 fail: a screen-map draft is not 'retried' through the field-map retry; the refusal says where to start it again", r.status === 409 && /started again from its online version/.test(r.body.message), r.body?.message);
  r = await call("POST", `/ai/batches/${sm.batch}/cancel`, {});
  ok("QA-31 fail: cancelling it again, once finished, is a 409 in plain words", r.status === 409 && /already finished/.test(r.body.message), r.body?.message);
  // Break M1: the live launch waits (here for the ledger, held by another launch); a cancel in that wait is honoured.
  scenario({ locked_first: true, live: { exit: 1, out: { refused: "should never be called a second time" } } });
  sm = await startLive();
  await until(async () => calls().some((x) => x.mode === "live"));
  await call("POST", `/ai/batches/${sm.batch}/cancel`, {});
  smDone = await finished(sm.job);
  ok("QA-31 / break M1: a cancel while the live launch waits for the ledger is honoured: no second launch, CANCELLED, US$0", smDone.status === "CANCELLED" && calls().filter((x) => x.mode === "live").length === 1 && (smDone.costUsd ?? 0) === 0, { status: smDone.status, calls: calls().map((x) => x.mode) });
  // Break m1: a cancel during the paid call: the answer is kept in its run record, never offered for acceptance.
  const answer = { canonical_fields: [], entries: [{ input: open[0], outcome: "not_a_fact", person: "none", fact: null, transform: null, confidence: "medium", unresolved_reason: "asked only by the portal", evidence_quote: open[0] }] };
  scenario({ live: { exit: 0, sleep_ms: 2500, record: record({ status: "completed", usage: { cost_usd: 0.31 } }, { contract_valid: true, raw_output: JSON.stringify(answer) }) } });
  sm = await startLive();
  await until(async () => calls().some((x) => x.mode === "live"));
  await call("POST", `/ai/batches/${sm.batch}/cancel`, {});
  smDone = await finished(sm.job);
  r = await call("POST", `${SM}/accept`, { jobId: sm.job }, "user-C");
  ok("QA-31 / break m1: cancelled during the paid call: CANCELLED with its cost, and its proposals cannot be accepted", smDone.status === "CANCELLED" && smDone.costUsd === 0.31 && /not offered for acceptance/.test(smDone.message) && r.status === 409, { status: smDone.status, cost: smDone.costUsd, accept: r.status });
  scenario({ live: { exit: 1, out: { refused: "budget: the experiment cap is reached" } } });
  sm = await startLive();
  smDone = await finished(sm.job);
  const smFailed = await call("GET", `/ai/batches/${sm.batch}`);
  ok("QA-31 fail: a live screen-map draft that is not cancelled ends as it ended (FAILED here), and so does its AI work, never CANCELLED", smDone.status === "FAILED" && smFailed.body.status === "FAILED" && smFailed.body.jobs?.[0]?.retryable === false, { job: smDone.status, batch: smFailed.body?.status });

  ok("none of these paths wrote to the shared spend ledger (no reservation, no correction line)", statSync(LEDGER).size === ledgerBefore);
  ok("nothing was applied: IMM 5409 has no map rows from these drafts", sql(`select count(*) from drafting_job where attachment_id='${source}' and status='APPLIED'`) === "0");

  // ──────────────────────────────────────────── break M2: a workspace reset while a screen-map draft runs
  scenario({ stub: { exit: 0, out: { ok: true }, sleep_ms: 2500 }, live: { exit: 1, out: { refused: "should never be called" } } });
  await startLive();
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  await new Promise((res) => setTimeout(res, 4000));
  const alive = await call("GET", "/session").catch(() => ({ status: 0, body: null }));
  ok("break M2: a reset while a screen-map draft runs leaves the server running (the draft ends nowhere, quietly)", r.status < 300 && alive.status === 200, { reset: r.status, session: alive.status });

  // ──────────────────────────────────────────── evidence and reset
  const out = join(STUDIO, "evidence", "forms-slice2b"); mkdirSync(out, { recursive: true });
  await call("POST", "/demo/reset", { confirm: "RESET" });
  console.log(`\n${pass}/${pass + fail} passed`);
  writeFileSync(join(out, "check_ai_launch_paths.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, database: DB, paid_calls: 0, pass, fail, log }, null, 1));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
