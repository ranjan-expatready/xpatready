// C11.8 — Every AI run shows its steps live with progress, plain errors with the next step, and a Stop that ends it; each
// live run states and logs its cost; US$120 cap; live off by default, on only by an explicit server switch; a run that
// would pass a cost limit stops before spending and offers Continue (recorded) or Cancel; one Continue covers retries.
// Status (qa/CAPABILITIES.md, 1 Nov): Partial. Missing (found writing this): the field-map plan does not say live AI is
// off (the finder's plan does), so a live draft is accepted and fails later; a failed run's error line is a count
// ("0 done, 1 failed …") with "See the details", not what went wrong and the way out; live progress, live cost logging
// and Stop during a live call are only reachable through the stand-in live path (AT-11, AT-12: not run here).
// Decisions: P-110 (live steps, progress, plain errors, Stop, cost stated and logged), P-139 (US$120 cap), P-175 (live
// off by default), P-179 (stop before spending, Continue or Cancel, recorded), P-194 (one Continue covers retries),
// QA-90 (one ledger per machine).
// US$0 and safe ledger: the copy is started WITHOUT the live switch; the check itself restarts it (same database) with a
// scratch spend ledger it seeds (P2_LEDGER_DIR, as tests/check_cost_override.ts) and the queue held (STUDIO_HOLD_QUEUE),
// so a Continue never reaches the machine's shared ledger and nothing queued ever runs; it restarts the copy as it was at
// the end and checks the shared ledger file is byte for byte unchanged. AT-11 and AT-12 need the stand-in live path
// (STUDIO_AI_LIVE=approved with the stand-in launcher), which this check never sets: they are reported FAIL "not run".
// Run (from prototype/studio):
//   zsh tools/isolated.sh acc_c118 4573 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs
//   ./node_modules/.bin/tsx acceptance/C11.8.test.ts 4573 xr_studio_acc_c118 ; zsh tools/isolated.sh acc_c118 4573 stop
// Expected today (main 25cefb67): 15 pass, 4 fail — failing: AT-1 (the field-map plan carries no live on/off), AT-3
// (the run's error is "0 done, 1 failed …" with "See the details"), AT-11 and AT-12 (not run: need the stand-in live path).
// Exit: 0 all pass · 1 a check failed · 2 setup missing (copy not reachable or sample not loaded).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4573), DB = process.argv[3] ?? "xr_studio_acc_c118", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, "..");
const VAR = join(STUDIO, "var", `isolated-${NAME}`), FAKE_LOG = join(VAR, "fake-launch.log");
const FAKE = "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs";
const SCRATCH = mkdtempSync(join(tmpdir(), "acc-c118-ledger-")), LEDGER = join(SCRATCH, "spend.jsonl");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
/** fetch, sent again once when a kept-alive connection was closed before any reply (as tests/check_forms_slice2.ts). */
const send = async (url: string, init: RequestInit): Promise<Response> => { try { return await fetch(url, init); } catch (e) { if (!/EPIPE|ECONNRESET|UND_ERR_SOCKET/.test(String((e as { cause?: { code?: string } }).cause?.code ?? ""))) throw e; return fetch(url, init); } };
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await send(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(500); } return false; };
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");
const setupMissing = (why: string) => { console.log(`SETUP MISSING  ${why}`); process.exit(2); };
const liveCalls = () => (existsSync(FAKE_LOG) ? readFileSync(FAKE_LOG, "utf8").split("\n").filter((l) => l.includes('"mode":"live"')).length : 0);
/** The machine's shared spend ledger, as bytes: it must not move during this check. */
const sharedLedger = () => createHash("sha256").update(existsSync(LEDGER_DIR) ? readdirSync(LEDGER_DIR).sort().map((f) => { try { return f + readFileSync(join(LEDGER_DIR, f), "utf8"); } catch { return f; } }).join("|") : "none").digest("hex");
const scratchLines = () => (existsSync(LEDGER) ? readFileSync(LEDGER, "utf8") : "").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
const restart = async (...env: string[]) => {
  try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", ...env], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, STUDIO_AI_LIVE: "" } }); } catch { /* waited for below */ }
  for (let i = 0; i < 240; i++) { if ((await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).catch(() => null))?.status === 200) return; await sleep(500); }
  setupMissing("the copy did not come back after a restart");
};
let seq = 0;
const seed = (usd: number) => appendFileSync(LEDGER, JSON.stringify({ type: "reserve", id: `seed-acc-${++seq}`, run_id: `seed-acc-${seq}`, attempt: 1, worst_usd: usd, caller: "acceptance C11.8 seed", at: "2026-10-20T00:00:00.000Z" }) + "\n");

(async () => {
  if ((await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).catch(() => null))?.status !== 200) setupMissing(`no copy answers on port ${PORT}`);
  const shared0 = sharedLedger();
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the stand-in launcher was asked for a live call" } }));
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const loaded = await call("POST", "/demo/load");
  const vv = sql("select id from combination where combination_key='vv.single'");
  const att = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  if (loaded.status >= 300 || !att) setupMissing("the sample (Visitor visa with IMM 5257) did not load");
  const scope = { kind: "source", ids: [att] };
  const live0 = liveCalls();

  // ── Phase A: the copy as started (no live switch)
  let plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  ok("C11.8 AT-1 live is off by default: the field-map plan says so in words before anything starts (as the finder's plan does: live.on false and why)", plan?.live?.on === false && /switched off/.test(plan?.live?.why ?? ""), plan?.live ?? "the plan has no live flag");
  const d = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c118-live-${Date.now()}` });
  const B0 = d.body?.id ? sql(`select batch_id from drafting_job where id='${d.body.id}'`) : "";
  if (B0) await until(async () => !["queued", "running", "stopping"].includes((await call("GET", `/runs/${B0}`)).body?.status), 60_000);
  const run0 = B0 ? (await call("GET", `/runs/${B0}`)).body : null;
  ok("C11.8 AT-2 a live draft without the switch spends nothing and never reaches the launcher; its step says AI is switched off and what to use instead", (d.status >= 400 && /switched off/.test(words(d))) || (!!run0 && run0.usd?.spent === 0 && run0.steps?.some((s: { message: string }) => /switched off/.test(s.message ?? "") && /saved AI answers|rules only/.test(s.message ?? ""))), { status: d.status, step: run0?.steps?.[0]?.message?.slice(0, 160) });
  ok("C11.8 AT-2 the launcher was never asked for a live call", liveCalls() === live0, { live: liveCalls() - live0 });
  ok("C11.8 AT-3 a failed run's error says what went wrong in plain words and its next step is the way out (use the saved answer or rules only), not only a count and \"See the details\"",
    !!run0?.error && !/^\d+ done, \d+ failed/.test(run0.error.what ?? "") && /switched off|saved|rules/i.test(`${run0.error.what} ${run0.error.next?.label}`), run0?.error);
  ok("C11.8 AT-4 the run card states its cost: spent US$0 and the worst case it was allowed (stated before the run)", !!run0 && run0.usd?.spent === 0 && run0.usd?.worst > 0 && Array.isArray(run0.steps) && run0.steps.every((s: { uses: string; label: string }) => ["ai", "rules"].includes(s.uses) && s.label), run0?.usd);

  // ── Phase B: scratch ledger, queue held
  await restart(`P2_LEDGER_DIR=${SCRATCH}`, "STUDIO_HOLD_QUEUE=1", `STUDIO_FAKE_LAUNCHER=${FAKE}`);
  const replayPlan = (await call("POST", "/ai/plan", { scope, mode: "REPLAY", draftAgain: true })).body;
  let r = await call("POST", "/ai/batches", { scope, mode: "REPLAY", draftAgain: true, planSha256: replayPlan.plan_sha256, idempotencyKey: `acc-c118-held-${Date.now()}` });
  const B1: string = r.body?.id;
  const active = (await call("GET", "/runs?active=1")).body?.runs ?? [];
  const held = B1 ? (await call("GET", `/runs/${B1}`)).body : null;
  ok("C11.8 AT-5 a run shows its steps from the start: listed with their kind (AI or rules), its status in words, Stop offered, and it follows the person (active runs)", !!held && held.status === "queued" && held.can_stop === true && held.steps?.length >= 1 && active.some((x: { id: string }) => x.id === B1), { status: held?.status, can_stop: held?.can_stop, steps: held?.steps?.length, active: active.length });
  r = await call("POST", `/runs/${B1}/stop`, undefined, "user-C");
  ok("C11.8 AT-6 refusal: a reviewer cannot Stop a run (403); it keeps waiting", r.status === 403 && (await call("GET", `/runs/${B1}`)).body?.status === "queued", r.status);
  r = await call("POST", `/runs/${B1}/stop`);
  const stopped = (await call("GET", `/runs/${B1}`)).body;
  ok("C11.8 AT-6 Stop ends it: the run is Stopped, every step cancelled with \"nothing was sent\", nothing spent, gone from the active runs", stopped?.status === "stopped" && stopped.can_stop === false && stopped.steps.every((s: { status: string; message: string }) => s.status === "CANCELLED" && /nothing was sent/.test(s.message)) && stopped.usd.spent === 0 && !((await call("GET", "/runs?active=1")).body?.runs ?? []).some((x: { id: string }) => x.id === B1), stopped?.steps);
  r = await call("POST", `/runs/${B1}/stop`);
  ok("C11.8 AT-6 refusal: Stop on a run that has ended is 409 in words", r.status === 409 && /already ended/.test(words(r)), r.body);

  // cost stated before, the cap, and the stop before spending
  plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  const worst = plan?.cost_check?.worst_usd;
  ok("C11.8 AT-7 before a live run the plan states its cost in words against the US$120 cap (spent so far, at most this run), with a run key", plan?.cost_check?.ok === true && worst > 0 && plan.cost_check.cap_usd === 120 && plan.cost_check.ceiling_usd === 132 && /spent so far US\$\d+\.\d\d of US\$120\.00; this run could cost up to US\$\d+\.\d\d/.test(plan.cost_check.words) && /^[0-9a-f]{40}$/.test(plan.run_key), plan?.cost_check);
  seed(120 - worst / 2);
  plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  const batches0 = sql("select count(*) from ai_batch");
  r = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c118-over-${Date.now()}` });
  ok("C11.8 AT-8 a run that would pass the US$120 cap stops before spending: the plan says so with Continue offered, and a start without Continue is refused in words; nothing queued, nothing reserved",
    plan?.cost_check?.ok === false && plan.cost_check.can_continue === true && plan.cost_check.over.some((o: { limit: string }) => o.limit === "experiment") && r.status >= 400 && sql("select count(*) from ai_batch") === batches0 && !scratchLines().some((l) => l.type === "reserve" && !String(l.id).startsWith("seed-acc")),
    { cc: plan?.cost_check?.words, start: [r.status, words(r).slice(0, 160)] });
  const start = { kind: "draft_field_maps", scope, mode: "LIVE", draftAgain: true };
  const cont = (actor: string | null, extra: object = {}) => call("POST", "/ai/overrides", { run_key: plan.run_key, worst_usd: plan.cost_check.worst_usd, limits: plan.cost_check.over.map((o: { limit: string }) => o.limit), start, ...extra }, actor);
  const rs = [await cont("user-C"), await cont("user-B"), await cont("user-P"), await cont(null)];
  ok("C11.8 AT-9 refusal: only an author may Continue (reviewer, approver, client 403; nobody 401); none is recorded", rs.map((x) => x.status).join() === "403,403,403,401" && !scratchLines().some((l) => l.type === "override"), rs.map((x) => x.status));
  r = await cont("user-A");
  const ov = r.body?.override_id as string;
  const line = scratchLines().find((l) => l.type === "override" && l.id === ov);
  ok("C11.8 AT-9 the author's Continue is recorded (who, which run, which limit, the worst case) and in the activity log", r.status === 201 && line?.by === "user-A" && line.run_key === plan.run_key && line.worst_usd === plan.cost_check.worst_usd && sql(`select count(*) from audit_event where action='ai_override' and entity_key='${ov}'`) === "1", { status: r.status, line });
  r = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c118-cont-${Date.now()}`, overrideId: ov });
  const B2 = r.body?.id ? sql(`select batch_id from drafting_job where id='${r.body.id}'`) : "";
  ok("C11.8 AT-9 with the Continue exactly that run is queued (held here, never sent), carrying the Continue", r.status === 201 && !!B2 && JSON.parse(sql(`select plan::text from ai_batch where id='${B2}'`)).override?.id === ov, { status: r.status, m: words(r) });
  if (B2) await call("POST", `/runs/${B2}/stop`);
  r = B2 ? await call("POST", `/ai/batches/${B2}/retry`, {}) : { status: 0, body: null };
  ok("C11.8 AT-10a one Continue covers a retry of the same run (P-194): the stopped run is retried and keeps its Continue", r.status === 201 && JSON.parse(sql(`select plan::text from ai_batch where id='${B2}'`)).override?.id === ov, { status: r.status, m: words(r as Res) });
  if (B2) await call("POST", `/runs/${B2}/stop`);
  seed(20);
  plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  r = await cont("user-A");
  ok("C11.8 AT-10b refusal: past the US$132 ceiling no Continue is possible (409 in words); only the founder raises the cap", r.status === 409 && plan?.cost_check?.can_continue === false, { status: r.status, m: words(r).slice(0, 160), can: plan?.cost_check?.can_continue });

  // ── needs the stand-in live path (never set here)
  ok("C11.8 AT-11 a live run shows each part's progress while its AI call runs (done of total, step n of m) and Stop during the call ends it — not run: needs the stand-in live path", false, "not run here: needs STUDIO_AI_LIVE=approved with the stand-in launcher; this check never sets a live switch");
  ok("C11.8 AT-12 each live run reserves its worst case and settles its actual cost in the ledger, and the card shows about / at most / spent — not run: needs the stand-in live path", false, "not run here: needs STUDIO_AI_LIVE=approved with the stand-in launcher; this check never sets a live switch");

  await restart(`STUDIO_FAKE_LAUNCHER=${FAKE}`);
  ok("C11.8 AT-13 the whole check left the machine's shared spend ledger byte for byte as it was and never asked the launcher for a live call", sharedLedger() === shared0 && liveCalls() === live0, { live: liveCalls() - live0 });
  rmSync(SCRATCH, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C11.8 the check itself stopped:", e); rmSync(SCRATCH, { recursive: true, force: true }); process.exit(1); });
