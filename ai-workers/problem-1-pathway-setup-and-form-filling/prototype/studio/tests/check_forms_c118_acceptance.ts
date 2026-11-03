// C11.8 — Every AI run shows its steps live with progress, plain errors with the next step, and a Stop that ends it; each
// live run states and logs its cost; US$120 cap; live off by default, on only by an explicit server switch; a run that
// would pass a cost limit stops before spending and offers Continue (recorded) or Cancel; one Continue covers retries.
// Status (qa/CAPABILITIES.md, 1 Nov): Partial. Missing (found writing this): the field-map door does not apply P-175 as
// the finder does (C11.16 AT-8): its plan carries no live on/off and a live draft on a copy without the switch is
// accepted and fails later, instead of being refused at the door (409, in words); a failed run's error line is a count
// ("0 done, 1 failed …") with "See the details", not what went wrong and the way out.
// One door rule for every AI start (P-175): on a copy without the switch a live start is refused before anything is
// queued. So the Continue (P-179) and the one-Continue-covers-retries rule (P-194) are first checked where they are
// reachable without the switch: the plan's cost check answers before any start, POST /ai/overrides records the Continue,
// and the live start carrying it is refused by the switch. Phase C then restarts this copy with the switch ON, always
// paired with the stand-in launcher, the queue held and the scratch ledger (P-192, as tests/check_ai_live_switch.ts and
// tests/check_cost_override.ts; the copy must report GET /session → ai { live: true, launcher: "stand-in" } or the check
// stops before any start): the door opens (AT-2c), the run carrying the Continue is queued (AT-9c) and a retry keeps it
// (AT-10a). Phase D restarts it with the switch OFF again and the queue running: the live step queued in Phase C is
// refused by the runner's own door before any live call (AT-2d, QA-154's "not checked": a queued job never calls a
// paid model once the switch is off).
// Live progress, Stop during a live call and reserve/settle in the ledger (formerly AT-11, AT-12) need a founder-approved
// live run (P-175, 30 Oct incident rule): they are a live gate in journey J2, not checks in this file.
// Decisions: P-110 (live steps, progress, plain errors, Stop, cost stated and logged), P-139 (US$120 cap), P-175 (live
// off by default), P-179 (stop before spending, Continue or Cancel, recorded), P-194 (one Continue covers retries),
// QA-90 (one ledger per machine).
// US$0 and safe ledger: the copy is started WITHOUT the live switch, with the stand-in launcher (its stub step fails on
// purpose for AT-3); the check restarts it (same database) with a scratch spend ledger it seeds (P2_LEDGER_DIR, as
// tests/check_cost_override.ts) and the queue held (STUDIO_HOLD_QUEUE), so a Continue never reaches the machine's shared
// ledger and nothing queued ever runs; it restarts the copy as it was at the end and checks the shared ledger file is byte
// for byte unchanged. The live switch is set only by this check's own Phase C restart, with the stand-in launcher and the
// queue held (STUDIO_AI_LIVE is blanked on every other restart and must be off when the check starts).
// Adopted into the suites (C11.8 PR, 2 Nov): AT-1, AT-2, AT-3 and AT-9b pass since the field-map door applies P-175
// (the plan says live on/off and why; a live start that would call the model is refused 409 before anything is queued or
// a Continue used) and a failed run says what went wrong and its way out. Added with it: AT-3b, Retry is the same door.
// QA-154 closed out (3 Nov, forms): the STAND-IN section is no longer opt-in (Phases C and D above), so AT-9c and AT-10a
// run on every check, with the door's pass case (AT-2c) and the runner's door (AT-2d).
// Run (usage line for run-suites.sh):
//   zsh studio/tools/isolated.sh forms_c118a 4458 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_c118_acceptance.ts 4458 xr_studio_forms_c118a
// Expected (3 Nov 2026, isolated copy started without the live switch, US$0): 22 pass, 0 fail.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy, sample).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { checkCopy, needCombo, sqlFor, stop } from "../acceptance/lib/pack1.ts";

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
const sql = sqlFor(DB);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(500); } return false; };
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");
/** The caller's shell never leaks a switch, a held queue or a launcher into a restart: those come only from the
 *  restart's arguments (review, Opus m2). P2_LEDGER_DIR is kept: run-suites.sh points it at its per-run scratch ledger,
 *  which this check's AT-13 reads too; Phase B–D pass their own (Opus round 2, m3). */
const BLANK = { STUDIO_AI_LIVE: "", STUDIO_HOLD_QUEUE: "", STUDIO_FAKE_LAUNCHER: "" };
/** True from Phase C's restart with the switch on until Phase D's restart switches it off. */
let switchedOn = false;
/** Whatever ends the check (a failed setup, a crash, Ctrl-C) leaves the copy as it was started: switch off, stand-in
 *  launcher, the machine's ledger untouched (review, Opus m1; as tests/check_cost_override.ts). */
const restoreCopy = () => {
  if (switchedOn) { try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", `STUDIO_FAKE_LAUNCHER=${FAKE}`], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...BLANK } }); switchedOn = false; } catch { console.error(`STOP  the copy ${NAME} on ${PORT} could not be restarted with the switch off: stop it (isolated.sh ${NAME} ${PORT} stop)`); } }
  rmSync(SCRATCH, { recursive: true, force: true });
};
const setupMissing = (why: string) => { restoreCopy(); stop(why); };
const liveCalls = () => (existsSync(FAKE_LOG) ? readFileSync(FAKE_LOG, "utf8").split("\n").filter((l) => l.includes('"mode":"live"')).length : 0);
/** The machine's shared spend ledger, as bytes: it must not move during this check. A folder created empty meanwhile (a
 *  fresh machine: the server makes it when it first reads the ledger) holds no spend, the same as no folder. */
const sharedLedger = () => createHash("sha256").update(existsSync(LEDGER_DIR) ? readdirSync(LEDGER_DIR).sort().map((f) => { try { return f + readFileSync(join(LEDGER_DIR, f), "utf8"); } catch { return f; } }).join("|") : "").digest("hex");
const scratchLines = () => (existsSync(LEDGER) ? readFileSync(LEDGER, "utf8") : "").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any
/** Restarts this copy (same database). The live switch is blanked; only Phase C passes STUDIO_AI_LIVE=approved as a
 *  setting of its own restart, together with the stand-in launcher and the queue held (P-192). */
const restart = async (...env: string[]) => {
  try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", ...env], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...BLANK } }); } catch { /* waited for below */ }
  for (let i = 0; i < 240; i++) { if ((await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).catch(() => null))?.status === 200) return; await sleep(500); }
  setupMissing("the copy did not come back after a restart");
};
let seq = 0;
const seed = (usd: number) => appendFileSync(LEDGER, JSON.stringify({ type: "reserve", id: `seed-acc-${++seq}`, run_id: `seed-acc-${seq}`, attempt: 1, worst_usd: usd, caller: "acceptance C11.8 seed", at: "2026-10-20T00:00:00.000Z" }) + "\n");

(async () => {
  await checkCopy(PORT, DB);
  const shared0 = sharedLedger();
  // The copy says whether live AI is on and which launcher it uses (#570): it must start with the switch off.
  const ai = (await call("GET", "/session")).body?.ai;
  if (ai?.live !== false || ai?.launcher !== "stand-in") setupMissing(`start this copy without the live switch and with the stand-in launcher (see the run line); GET /session → ai: ${JSON.stringify(ai)}`);
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: "Stand-in launcher: this stub step fails on purpose (acceptance C11.8, US$0)." }, live: { exit: 1, err: "the stand-in launcher was asked for a live call" } }));
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const loaded = await call("POST", "/demo/load");
  if (loaded.status >= 300) setupMissing("the sample did not load");
  const vv = await needCombo(PORT, DB, "visitor_visa");
  const att = sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  if (!att) setupMissing("the sample's Visitor visa has no IMM 5257");
  const scope = { kind: "source", ids: [att] };
  const live0 = liveCalls();
  const queued = () => sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job");

  // ── Phase A: the copy as started (no live switch): one door rule, plain errors
  let plan: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  {
    plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
    ok("C11.8 AT-1 live is off by default: the field-map plan says so in words before anything starts (as the finder's plan does: live.on false and why)", plan?.live?.on === false && /switched off/.test(plan?.live?.why ?? ""), plan?.live ?? "the plan has no live flag");
    const q0 = queued();
    const d = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c118-live-${Date.now()}` });
    const B0 = d.body?.id ? sql(`select batch_id from drafting_job where id='${d.body.id}'`) : "";
    if (B0) await until(async () => !["queued", "running", "stopping"].includes((await call("GET", `/runs/${B0}`)).body?.status), 60_000);
    ok("C11.8 AT-2 one door rule (P-175, as the finder, C11.16 AT-8): a live draft on a copy without the switch is refused at the door (409, says AI is switched off); nothing is queued", d.status === 409 && /switched off/.test(words(d)) && queued() === q0, { status: d.status, m: words(d).slice(0, 160), queued: [q0, queued()] });
    ok("C11.8 AT-2 the launcher was never asked for a live call", liveCalls() === live0, { live: liveCalls() - live0 });
    // A run that fails at US$0: the stand-in launcher's stub step fails on purpose.
    const st = await call("POST", `/attachments/${att}/draft`, { mode: "stub", idempotencyKey: `acc-c118-stub-${Date.now()}` });
    const B1 = st.body?.id ? sql(`select batch_id from drafting_job where id='${st.body.id}'`) : "";
    if (!B1) setupMissing(`the stub draft did not start (${st.status} ${words(st).slice(0, 120)}): start the copy with STUDIO_FAKE_LAUNCHER (see the run line)`);
    await until(async () => !["queued", "running", "stopping"].includes((await call("GET", `/runs/${B1}`)).body?.status), 60_000);
    const run1 = (await call("GET", `/runs/${B1}`)).body;
    if (!/failed|problems/.test(String(run1?.status))) setupMissing(`the stub step did not fail (run ${run1?.status}): start the copy with STUDIO_FAKE_LAUNCHER (see the run line)`);
    ok("C11.8 AT-3 a failed run's error says what went wrong in plain words and its next step is the way out, not only a count and \"See the details\"",
      !!run1?.error?.what && !/^\d+ done, \d+ failed/.test(run1.error.what) && !!run1.error.next?.label && !/^See the details$/i.test(run1.error.next.label) && !/ENOENT|errno|\/Users\/|at [A-Za-z.]+ \(/.test(`${run1.error.what}`), run1?.error);
    // AT-3b (review m1): Retry is a second door: a failed live field-map step is not queued again without the switch.
    // (as the reviewer's repro: the stub run made a live one by SQL, its plan's worst case a paid call's)
    sql(`update drafting_job set mode='LIVE' where batch_id='${B1}'`); sql(`update ai_batch set mode='LIVE', plan = jsonb_set(plan, '{targets,0,worst_usd}', '1.5') where id='${B1}'`);
    const q3 = queued(), rl = await call("POST", `/ai/batches/${B1}/retry`, {});
    ok("C11.8 AT-3b one door rule for Retry: a failed live step on a copy without the switch is not retried (409, AI switched off); nothing queued, the launcher never asked", rl.status === 409 && /switched off/.test(words(rl)) && queued() === q3 && liveCalls() === live0, { status: rl.status, m: words(rl).slice(0, 160) });
    sql(`update drafting_job set mode='STUB' where batch_id='${B1}'`); sql(`update ai_batch set mode='STUB', plan = jsonb_set(plan, '{targets,0,worst_usd}', '0') where id='${B1}'`);
    const rs = await call("POST", `/ai/batches/${B1}/retry`, {});
    if (rs.status === 201) await until(async () => !["queued", "running", "stopping"].includes((await call("GET", `/runs/${B1}`)).body?.status), 60_000);
    const again = (await call("GET", `/runs/${B1}`)).body;
    ok("C11.8 AT-3b pass: a free (stub) failed step is still retried (201) and the run names its latest attempt", rs.status === 201 && again?.steps?.length === 2 && !!again.steps[1].message && again.error?.what === `${again.steps[1].label}: ${again.steps[1].message}` && again.error.next?.label === "Retry the failed step", { status: rs.status, m: words(rs).slice(0, 160), error: again?.error });
    ok("C11.8 AT-4 the run card states its cost (spent US$0) and lists its steps with their kind (AI or rules)", run1?.usd?.spent === 0 && Array.isArray(run1?.steps) && run1.steps.length > 0 && run1.steps.every((s: { uses: string; label: string }) => ["ai", "rules"].includes(s.uses) && s.label), { usd: run1?.usd, steps: run1?.steps?.length });
  }

  // ── Phase B: scratch ledger, queue held
  await restart(`P2_LEDGER_DIR=${SCRATCH}`, "STUDIO_HOLD_QUEUE=1", `STUDIO_FAKE_LAUNCHER=${FAKE}`);
  const replayPlan = (await call("POST", "/ai/plan", { scope, mode: "REPLAY", draftAgain: true })).body;
  let r = await call("POST", "/ai/batches", { scope, mode: "REPLAY", draftAgain: true, planSha256: replayPlan.plan_sha256, idempotencyKey: `acc-c118-held-${Date.now()}` });
  const BH: string = r.body?.id;
  if (!BH) setupMissing(`the held replay run did not start: ${r.status} ${words(r).slice(0, 120)}`);
  const active = (await call("GET", "/runs?active=1")).body?.runs ?? [];
  const held = (await call("GET", `/runs/${BH}`)).body;
  ok("C11.8 AT-5 a run shows its steps from the start: listed with their kind (AI or rules), its status in words, Stop offered, and it follows the person (active runs)", held?.status === "queued" && held.can_stop === true && held.steps?.length >= 1 && active.some((x: { id: string }) => x.id === BH), { status: held?.status, can_stop: held?.can_stop, steps: held?.steps?.length, active: active.length });
  r = await call("POST", `/runs/${BH}/stop`, undefined, "user-C");
  ok("C11.8 AT-6 refusal: a reviewer cannot Stop a run (403); it keeps waiting", r.status === 403 && (await call("GET", `/runs/${BH}`)).body?.status === "queued", r.status);
  r = await call("POST", `/runs/${BH}/stop`);
  const stopped = (await call("GET", `/runs/${BH}`)).body;
  ok("C11.8 AT-6 Stop ends it: the run is Stopped, every step cancelled with \"nothing was sent\", nothing spent, gone from the active runs", stopped?.status === "stopped" && stopped.can_stop === false && stopped.steps.every((s: { status: string; message: string }) => s.status === "CANCELLED" && /nothing was sent/.test(s.message)) && stopped.usd.spent === 0 && !((await call("GET", "/runs?active=1")).body?.runs ?? []).some((x: { id: string }) => x.id === BH), stopped?.steps);
  r = await call("POST", `/runs/${BH}/stop`);
  ok("C11.8 AT-6 refusal: Stop on a run that has ended is 409 in words", r.status === 409 && /already ended/.test(words(r)), r.body);

  // cost stated before, the cap, and the stop before spending — the plan answers before any start (no switch needed)
  plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  const worst = plan?.cost_check?.worst_usd;
  if (!(worst > 0)) setupMissing("the live plan states no worst case");
  ok("C11.8 AT-7 before a live run the plan states its cost in words against the US$120 cap (spent so far, at most this run), with a run key", plan?.cost_check?.ok === true && worst > 0 && plan.cost_check.cap_usd === 120 && plan.cost_check.ceiling_usd === 132 && /spent so far US\$\d+\.\d\d of US\$120\.00; this run could cost up to US\$\d+\.\d\d/.test(plan.cost_check.words) && /^[0-9a-f]{40}$/.test(plan.run_key), plan?.cost_check);
  seed(120 - worst / 2);
  plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  const q1 = queued();
  r = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c118-over-${Date.now()}` });
  const reservedNone = () => !scratchLines().some((l) => l.type === "reserve" && !String(l.id).startsWith("seed-acc"));
  ok(`C11.8 AT-8 [P-179] a run that would pass the US$120 cap stops before spending: the plan says so in words with Continue offered, and a start without Continue is refused (here by the switch first); nothing queued, nothing reserved`,
    plan?.cost_check?.ok === false && plan.cost_check.can_continue === true && plan.cost_check.over.some((o: { limit: string }) => o.limit === "experiment") && /US\$/.test(plan.cost_check.words ?? "") && r.status >= 400 && queued() === q1 && reservedNone(),
    { cc: plan?.cost_check?.words, start: [r.status, words(r).slice(0, 160)] });
  const start = { kind: "draft_field_maps", scope, mode: "LIVE", draftAgain: true };
  const cont = (actor: string | null, extra: object = {}) => call("POST", "/ai/overrides", { run_key: plan.run_key, worst_usd: plan.cost_check.worst_usd, limits: plan.cost_check.over.map((o: { limit: string }) => o.limit), start, ...extra }, actor);
  const rs = [await cont("user-C"), await cont("user-B"), await cont("user-P"), await cont(null)];
  ok("C11.8 AT-9 refusal: only an author may Continue (reviewer, approver, client 403; nobody 401); none is recorded", rs.map((x) => x.status).join() === "403,403,403,401" && !scratchLines().some((l) => l.type === "override"), rs.map((x) => x.status));
  r = await cont("user-A");
  const ov = r.body?.override_id as string;
  const line = scratchLines().find((l) => l.type === "override" && l.id === ov);
  ok("C11.8 AT-9 [P-179] the author's Continue is recorded (who, which run, which limit, the worst case) and in the activity log", r.status === 201 && line?.by === "user-A" && line.run_key === plan.run_key && line.worst_usd === plan.cost_check.worst_usd && sql(`select count(*) from audit_event where action='ai_override' and entity_key='${ov}'`) === "1", { status: r.status, line });
  const q2 = queued();
  r = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c118-cont-${Date.now()}`, overrideId: ov });
  const B2 = r.body?.id ? sql(`select batch_id from drafting_job where id='${r.body.id}'`) : "";
  ok("C11.8 AT-9b one door rule: even with a Continue, a live start on a copy without the switch is refused at the door (409, AI switched off); nothing queued, nothing reserved", r.status === 409 && /switched off/.test(words(r)) && queued() === q2 && reservedNone(), { status: r.status, m: words(r).slice(0, 160) });
  if (B2) await call("POST", `/runs/${B2}/stop`);

  // ── Phase C: the switch ON, only with the stand-in launcher, the queue held and the scratch ledger (P-192)
  switchedOn = true;
  await restart(`P2_LEDGER_DIR=${SCRATCH}`, "STUDIO_HOLD_QUEUE=1", "STUDIO_AI_LIVE=approved", `STUDIO_FAKE_LAUNCHER=${FAKE}`);
  const aiOn = (await call("GET", "/session")).body?.ai;
  // Review m1: the copy also reads the scratch ledger (its seed puts this run over the cap; the machine's ledger would not).
  const seeded = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body?.cost_check;
  if (!(aiOn?.live === true && aiOn?.launcher === "stand-in" && seeded?.ok === false && seeded?.can_continue === true)) {
    setupMissing(`P-192 guard: after its Phase C restart the copy does not report live on with the stand-in launcher or does not read the scratch ledger (GET /session → ai: ${JSON.stringify(aiOn)}; plan cost check ok ${seeded?.ok}); stopped before any start`);
  }
  r = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c118-cont-on-${Date.now()}`, overrideId: ov });
  const B3 = r.body?.id ? sql(`select batch_id from drafting_job where id='${r.body.id}'`) : "";
  ok("C11.8 AT-9c [P-179] with the switch on and the Continue, exactly that run is queued (held here, never sent), carrying the Continue", r.status === 201 && !!B3 && JSON.parse(sql(`select plan::text from ai_batch where id='${B3}'`)).override?.id === ov && liveCalls() === live0, { status: r.status, m: words(r).slice(0, 160) });
  if (B3) await call("POST", `/runs/${B3}/stop`);
  const rr = B3 ? await call("POST", `/ai/batches/${B3}/retry`, {}) : { status: 0, body: null };
  ok("C11.8 AT-10a [P-194] one Continue covers a retry of the same run: the stopped run is retried and keeps its Continue", rr.status === 201 && JSON.parse(sql(`select plan::text from ai_batch where id='${B3}'`)).override?.id === ov, { status: rr.status, m: words(rr as Res).slice(0, 160) });
  if (B3) await call("POST", `/runs/${B3}/stop`);
  seed(20);
  plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  r = await cont("user-A");
  ok("C11.8 AT-10b refusal: past the US$132 ceiling no Continue is possible (409 in words); only the founder raises the cap", r.status === 409 && plan?.cost_check?.can_continue === false && words(r).length > 10, { status: r.status, m: words(r).slice(0, 160), can: plan?.cost_check?.can_continue });
  // The door's pass case (the founder's live run): under the cap, no Continue needed. The scratch ledger loses this check's
  // own seed lines only (it is the check's own file; the copy reads it at each plan).
  writeFileSync(LEDGER, scratchLines().filter((l) => !(l.type === "reserve" && String(l.id).startsWith("seed-acc"))).map((l) => JSON.stringify(l) + "\n").join(""));
  plan = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  const q4 = sql("select count(*) from drafting_job where status='QUEUED' and mode='LIVE'");
  r = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c118-on-${Date.now()}` });
  const J4 = r.body?.id as string | undefined;
  ok("C11.8 AT-2c pass: with the switch on, the same live draft passes the door: the plan says live on (no why, not blocked), within the cap, and the start is queued (201; held here, never sent)",
    plan?.live?.on === true && plan.live.why === null && plan.live.blocked === false && plan?.cost_check?.ok === true && r.status === 201 && !!J4
    && sql(`select status || '/' || mode from drafting_job where id='${J4}'`) === "QUEUED/LIVE" && Number(sql("select count(*) from drafting_job where status='QUEUED' and mode='LIVE'")) === Number(q4) + 1 && liveCalls() === live0,
    { live: plan?.live, cc: plan?.cost_check?.ok, start: [r.status, words(r).slice(0, 160)] });

  // ── Phase D: the switch OFF again and the queue running: the step queued above resumes and meets the runner's door
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the stand-in launcher was asked for a live call" } }));
  await restart(`P2_LEDGER_DIR=${SCRATCH}`, `STUDIO_FAKE_LAUNCHER=${FAKE}`);
  switchedOn = false;
  const aiOff = (await call("GET", "/session")).body?.ai;
  const ended = J4 ? await until(async () => ["FAILED", "BLOCKED", "COMPLETED", "CANCELLED"].includes(sql(`select status from drafting_job where id='${J4}'`)), 60_000) : false;
  const j4 = J4 ? sql(`select status || '|' || coalesce(cost_usd::text, 'null') || '|' || coalesce(message, '') from drafting_job where id='${J4}'`).split("|") : [];
  const after = (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  // Review m3: the form's paid attempts counted as rounds.ts paidRunsOf counts them (a live field-map step with a cost, or
  // still running with none), and the plan still offers it a draft without the over-attempts flag.
  const paidAttempts = Number(sql(`select count(*) from drafting_job where attachment_id='${att}' and kind='field_map' and mode='LIVE' and (coalesce(cost_usd, 0) > 0 or (cost_usd is null and status='RUNNING'))`));
  const t0 = after?.targets?.find((t: { attachmentId: string }) => t.attachmentId === att);
  ok("C11.8 AT-2d one door rule in the runner (QA-154): a live step queued while the switch was on, run after it is switched off, is refused before any live call; it fails in words, costs nothing and uses none of the form's paid attempts",
    aiOff?.live === false && ended && j4[0] === "FAILED" && /switched off/.test(j4[2] ?? "") && (j4[1] === "null" || Number(j4[1]) === 0) && liveCalls() === live0 && reservedNone()
    && paidAttempts === 0 && t0?.action === "draft" && !("over_attempts" in t0),
    { ai: aiOff, ended, job: j4, live: liveCalls() - live0, reserved: !reservedNone(), paidAttempts, target: t0 && { action: t0.action, over: t0.over_attempts } });

  await restart(`STUDIO_FAKE_LAUNCHER=${FAKE}`);
  ok("C11.8 AT-13 the whole check left the machine's shared spend ledger byte for byte as it was and never asked the launcher for a live call", sharedLedger() === shared0 && liveCalls() === live0, { live: liveCalls() - live0 });
  rmSync(SCRATCH, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C11.8 the check itself stopped:", e); restoreCopy(); process.exit(1); });
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => { restoreCopy(); process.exit(130); });
