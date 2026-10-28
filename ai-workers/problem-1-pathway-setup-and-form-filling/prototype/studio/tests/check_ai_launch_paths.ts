// QA-34 (P-69 coverage floor) and QA-30 (forms lane, slice 2b): the paths of a live field-map draft that only a paid call
// reaches today (api/src/sources.ts launch: stub refused, provider limit before or after a run record, the launcher
// stopping without a reason, a ledger lock, an unreadable record; engine/ai-run.ts explainRun for every run status),
// and the same refusals for a draft in parts (runParts), tested through the API with a fake launcher (tests/fixtures/fake-launch.mjs) on an isolated copy: no network, US$0.
// The server honours STUDIO_FAKE_LAUNCHER only in an isolated copy's own working folder. QA-30: a draft request with no
// mode is a plain 400. QA-32 (qa Minors pass): a retry after a mid-run cancel. W1-02 (P-102): QA-27 and QA-31 (the
// screen-map draft's refusals and cancel) are parked with the browser extension. Every rule has a passing and a failing case.
//   zsh studio/tools/isolated.sh forms_fl 4453 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_ai_launch_paths.ts 4453 xr_studio_forms_fl  [--evidence writes evidence/forms-slice2b]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4453), DB = process.argv[3] ?? "xr_studio_forms_fl";
const STUDIO = join(import.meta.dirname, "..");
const VARDIR = join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
const LEDGER = join(STUDIO, "..", "p2", "ledger", "spend.jsonl");
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
/** fetch, sent again when a kept-alive connection was closed before any reply, or the server is not listening yet (the
 *  suite restarts its server; a slow runner can take longer to listen again): for up to 60 s, never sent twice once a
 *  reply has come (CI flake on 8d0831a: the check stopped without a FAIL line). */
const send = async (url: string, init: RequestInit): Promise<Response> => {
  for (const t = Date.now(); ;) {
    try { return await fetch(url, init); } catch (e) {
      if (!/EPIPE|ECONNRESET|UND_ERR_SOCKET|ECONNREFUSED/.test((e as { cause?: { code?: string } }).cause?.code ?? "") || Date.now() - t > 60_000) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
};
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await send(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const FIX = join(STUDIO, "tests", "fixtures");
/** Restarts this copy's server with another launcher setting. isolated.sh waits 30 s for the server; on a slow runner the
 *  wait can run out while the server is still starting, so a failed restart waits for /api/session up to 2 minutes more
 *  before the check reports it (a FAIL line, never a crash). */
const restart = async (root: string, name: string, launcher: string) => {
  try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), name, String(PORT), "restart", `STUDIO_FAKE_LAUNCHER=${launcher}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); return true; }
  catch { return until(async () => (await fetch(`http://localhost:${PORT}/api/session`).catch(() => null))?.status === 200, 120_000); }
};
/** What the guarded launcher's stub passes write in the repository (the PR 10 part runs it on purpose, US$0): run, job
 *  and ticket files, the source's inventory, two ledger lines per pass (reserve and settle at US$0) and a new canary
 *  digest. Recorded at the start and put back at the end, so a regression run leaves the repository as it was (Lead
 *  note, 25 Oct): only files this run added are removed, and the ledger loses only the lines this run appended, and
 *  only while it still starts with what it held before (another copy's line is never touched). */
const P2 = join(STUDIO, "..", "p2"), P1 = join(STUDIO, "..", "p1");
const DIRS = [join(P2, "runs"), join(P2, "jobs"), join(P2, "ledger", "used-launch-tickets"), join(P1, "inventory")];
const CANARY = join(P2, "screening", "canary-digest.json");
const filesIn = (d: string): string[] => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesIn(join(d, e.name)) : [join(d, e.name)])) : []);
const before = { files: new Set(DIRS.flatMap(filesIn)), ledger: readFileSync(LEDGER, "utf8"), canary: existsSync(CANARY) ? readFileSync(CANARY, "utf8") : null };
function putBack() {
  const added = DIRS.flatMap(filesIn).filter((f) => !before.files.has(f));
  for (const f of added) rmSync(f, { force: true });
  const now = readFileSync(LEDGER, "utf8");
  const extra = now.startsWith(before.ledger) ? now.slice(before.ledger.length).split("\n").filter(Boolean) : null;
  // Only stub lines settled at US$0 are this run's; anything else is left for a person to look at.
  if (extra && extra.every((l) => { const x = JSON.parse(l); return x.caller === "stub" || (x.type === "settle" && x.actual_usd === 0); })) writeFileSync(LEDGER, before.ledger);
  else if (extra?.length) console.log(`note: the spend ledger gained ${extra.length} line(s) that are not this run's stub passes; left as they are`);
  if (before.canary !== null) writeFileSync(CANARY, before.canary);
  return added.length;
}
/** The evidence file is written only when asked (--evidence): a regression run leaves the repository as it was. */
const EVIDENCE = process.argv.includes("--evidence");
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
  // S4 M7 (P-110) replaces "a sent call cannot be recalled": Stop now ends the running call itself.
  ok("C11.8 M7 whole form (break m1): a cancel during the paid call ends the call; it stays counted at its reserved worst case and its answer is never compared or applied", wj.status === "CANCELLED" && /Stopped while the AI call ran: the call was ended \(M7\)\. It stays counted at its reserved worst case; nothing of it is applied\./.test(wj.message) && sql(`select count(*) from normalization_item where job_id='${wf}'`) === "0", { status: wj.status, message: wj.message });

  ok("none of these paths wrote to the shared spend ledger (no reservation, no correction line)", statSync(LEDGER).size === ledgerBefore);
  ok("nothing was applied: IMM 5409 has no map rows from these drafts", sql(`select count(*) from drafting_job where attachment_id='${source}' and status='APPLIED'`) === "0");

  // ──────────────────────────────────────────── PR 10 review: STUDIO_FAKE_LAUNCHER runs only the test fixture
  // The server is restarted (same database) naming another script, then a link that carries the fixture's file name;
  // neither may run: a stub draft (US$0) goes through the guarded p2/launch.ts instead.
  const NAME = DB.replace(/^xr_studio_/, ""), ROOT = join(STUDIO, "..", "..", "..", "..");
  const marker = join(VARDIR, "rogue-ran");
  const rogue = join(VARDIR, "rogue-launch.mjs");
  writeFileSync(rogue, `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "ran"); console.log(JSON.stringify({ ok: true })); process.exit(0);\n`);
  const linkDir = join(VARDIR, "tests", "fixtures"); mkdirSync(linkDir, { recursive: true });
  const disguised = join(linkDir, "fake-launch.mjs"); rmSync(disguised, { force: true }); symlinkSync(rogue, disguised);
  for (const [label, path] of [["another script", rogue], ["a link named like the fixture", disguised]] as const) {
    rmSync(marker, { force: true }); writeFileSync(join(VARDIR, "fake-launch.log"), "");
    if (!(await restart(ROOT, NAME, path))) { ok(`PR 10: the copy restarted with STUDIO_FAKE_LAUNCHER naming ${label}`, false, "the server did not come back in 2.5 minutes"); continue; }
    r = await call("POST", `/attachments/${source}/draft`, { mode: "stub" });
    const g = r.status === 201 ? await finished(r.body.id) : { status: `not started: ${r.body?.message}` };
    ok(`PR 10: STUDIO_FAKE_LAUNCHER naming ${label} is ignored: it never runs, the fake log stays empty, and the guarded launcher's stub pass runs (US$0)`, !existsSync(marker) && calls().length === 0 && g.status === "COMPLETED" && /Stub pass completed/.test(g.message ?? ""), { status: g.status, message: g.message, ran: existsSync(marker), fakeCalls: calls().length });
  }
  if (!(await restart(ROOT, NAME, "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs"))) ok("PR 10: the copy restarted with the fixture launcher", false, "the server did not come back in 2.5 minutes");
  scenario({ stub: { exit: 0, out: { ok: true } } });
  r = await call("POST", `/attachments/${source}/draft`, { mode: "stub" });
  const back = r.status === 201 ? await finished(r.body.id) : null;
  ok("PR 10 fail: the fixture itself, named as the suite's usage line names it, is still honoured", back?.status === "COMPLETED" && calls().some((x) => x.mode === "stub"), { status: back?.status, calls: calls().length });

  // ──────────────────────────────────────────── evidence and reset
  const out = EVIDENCE ? join(STUDIO, "evidence", "forms-slice2b") : VARDIR; mkdirSync(out, { recursive: true });
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const removed = putBack();
  ok("the run leaves the repository as it was: the stub passes' run, job and ticket files removed, the ledger and the canary digest as before", readFileSync(LEDGER, "utf8") === before.ledger && DIRS.flatMap(filesIn).every((f) => before.files.has(f)), { removed });
  console.log(`\n${pass}/${pass + fail} passed`);
  writeFileSync(join(out, "check_ai_launch_paths.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, database: DB, paid_calls: 0, pass, fail, log }, null, 1));
  process.exit(fail ? 1 : 0);
})().catch((e) => { putBack(); console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 200)}`); console.error(e); process.exit(1); });
