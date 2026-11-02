// C11.15 Redo with AI on one form, per stage (P-123; api/src/form-redo.ts), and Replace, on the run path: each stage answers
// its plan and cost first and runs nothing; its fingerprint names the stage (a plan seen for one stage never starts
// another); live never starts while the live switch is off (this copy has none) and nothing writes the spend ledger; a
// removed form, or one not on the combination, is refused in words; a Redo started runs the finder for that one form
// (find: the page found again; read and match: the page used before), leaves its line as it is, the same key is the same
// run, and Stop answers with the run ended. US$0: saved answers and recorded canada.ca copies; the fake launcher stands in
// for the guarded one, and no live switch is set.
//   zsh studio/tools/isolated.sh forms_c1115r 4453 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_c1115_redo.ts 4453 xr_studio_forms_c1115r
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { needCombo } from "../acceptance/lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4453), DB = process.argv[3] ?? "xr_studio_forms_c1115r";
if (PORT === 4400 || !/^xr_studio_[a-z0-9_]+$/.test(DB) || DB === "xr_studio_demo") { console.error("refused: an isolated copy only, never the demo"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync(process.env.PSQL || "/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TECH = /ENOENT|errno|syscall|\/Users\/|node:|Prisma|at [A-Za-z.]+ \(|Error:/;
const plain = (b: any) => typeof b?.detail === "string" && b.detail.length > 10 && !TECH.test(b.detail); // eslint-disable-line @typescript-eslint/no-explicit-any
const settle = async (id: string): Promise<any> => { for (let i = 0; i < 480; i++) { const v = (await call("GET", `/runs/${id}`)).body; if (!["queued", "running", "stopping"].includes(v?.status)) return v; await sleep(250); } return null; }; // eslint-disable-line @typescript-eslint/no-explicit-any
const batches = () => sql("select count(*) from ai_batch");
const live = () => sql("select count(*) from drafting_job where mode = 'LIVE'");
/** The spend ledger's files (name, size, time): any write by a reservation or a settle changes them. */
const ledgerFiles = () => (existsSync(LEDGER_DIR) ? readdirSync(LEDGER_DIR, { recursive: true }).map(String).sort().map((f) => { const s = statSync(join(LEDGER_DIR, f)); return `${f}:${s.size}:${s.mtimeMs}`; }).join("|") : "none");
const line = (c: string, code: string) => sql(`select status || '|' || version from combination_form where combination_id='${c}' and lineage_key='${code}' order by version desc limit 1`);
const C = encodeURIComponent("IMM 5257");

(async () => {
  if ((await call("GET", "/session").catch(() => ({ status: 0 }))).status !== 200) { console.error(`no isolated copy answers on ${PORT}`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load")).status >= 300) { console.error("Load sample failed"); process.exit(2); }
  const vv = await needCombo(PORT, DB, "visitor_visa");
  const ledger0 = ledgerFiles(), committed0 = (await call("GET", "/ledger")).body?.committed_usd;
  const p0 = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "replay" })).body;
  const f0 = await call("POST", `/combinations/${vv}/forms/find`, { mode: "replay", planSha256: p0?.plan_sha256, idempotencyKey: `c1115r-find-${process.pid}` });
  const r0 = f0.body?.id ? await settle(f0.body.id) : null;
  if (!/^DRAFT\|/.test(line(vv, "IMM 5257"))) { console.error("setup: the finder did not attach IMM 5257", r0?.status, f0.body); process.exit(2); }
  const v5257 = line(vv, "IMM 5257");

  // ------------------------------------------------ the plan first, per stage; nothing runs
  const n0 = batches();
  const plans = Object.fromEntries(await Promise.all(["find", "read", "match"].map(async (s) => [s, await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: s })])));
  ok("C11.15 Redo: each stage (find, read, match) answers its plan (steps, US$0 for saved answers) and starts nothing",
    ["find", "read", "match"].every((s) => plans[s].status === 200 && /^[0-9a-f]{64}$/.test(plans[s].body?.planSha256) && plans[s].body?.mode === "replay" && plans[s].body?.totals?.worst_usd === 0 && (plans[s].body?.steps ?? []).length === 6) && batches() === n0,
    Object.fromEntries(Object.entries(plans).map(([k, v]) => [k, [v.status, v.body?.mode, v.body?.totals?.worst_usd]])));
  ok("C11.15 Redo: find looks for the application page again; read and match use the page the combination used before",
    plans.find.body?.page_url === null && /^https:\/\/www\.canada\.ca\//.test(plans.read.body?.page_url ?? "") && plans.match.body?.page_url === plans.read.body?.page_url && !plans.read.body?.steps?.[0]?.uses_ai,
    { find: plans.find.body?.page_url, read: plans.read.body?.page_url });
  ok("C11.15 Redo: each stage's fingerprint is its own (a plan seen for read is not a plan for find)", new Set(Object.values(plans).map((p) => p.body?.planSha256)).size === 3);

  // ------------------------------------------------ refusals: nothing runs, nothing is written
  let r = await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "find", mode: "replay", planSha256: plans.read.body?.planSha256 });
  ok("C11.15 Redo refusal: a plan seen for another stage does not start (409, plain words); nothing runs", r.status === 409 && plain(r.body) && batches() === n0, [r.status, r.body?.detail]);
  r = await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "read", planSha256: plans.read.body?.planSha256 });
  ok("C11.15 Redo refusal: a start that does not say how (live, saved answers or rules) is refused (400); nothing runs", r.status === 400 && plain(r.body) && batches() === n0, [r.status, r.body?.detail]);
  const livePlan = await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "match", mode: "live" });
  ok("C11.15 Redo: a live plan is shown with the switch off, saying AI now is off", livePlan.status === 200 && livePlan.body?.live?.on === false && typeof livePlan.body?.live?.why === "string", livePlan.body?.live);
  r = await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "match", mode: "live", planSha256: livePlan.body?.planSha256 });
  ok("C11.15 Redo refusal: live never starts while the live switch is off (409, plain words): no run, no live step, the ledger untouched",
    r.status === 409 && plain(r.body) && /switched off/.test(r.body?.detail) && batches() === n0 && live() === "0" && ledgerFiles() === ledger0, [r.status, r.body?.detail]);
  r = await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "find", mode: "replay", planSha256: plans.find.body?.planSha256 }, "user-B");
  ok("C11.15 Redo refusal: only an author starts a Redo (approver 403); nothing runs", r.status === 403 && batches() === n0, r.status);
  r = await call("POST", `/combinations/${vv}/forms/${encodeURIComponent("IMM 1294")}/redo`, { stage: "find" });
  ok("C11.15 Redo refusal: a form not on this combination is refused in words (404)", r.status === 404 && plain(r.body) && /IMM 1294/.test(r.body?.detail), [r.status, r.body?.detail]);
  r = await call("POST", `/combinations/00000000-0000-4000-8000-000000000000/forms/${C}/redo`, { stage: "find" });
  ok("C11.15 Redo refusal: an unknown combination is refused in words (404)", r.status === 404 && plain(r.body), [r.status, r.body?.detail]);
  const v5409 = Number(line(vv, "IMM 5409").split("|")[1]);
  await call("DELETE", `/combinations/${vv}/forms/${encodeURIComponent("IMM 5409")}`, { version: v5409 });
  r = await call("POST", `/combinations/${vv}/forms/${encodeURIComponent("IMM 5409")}/redo`, { stage: "match" });
  ok("C11.15 Redo refusal: a form a person removed is not redone (409: add it back first); nothing runs", r.status === 409 && plain(r.body) && /add it back/i.test(r.body?.detail) && batches() === n0, [r.status, r.body?.detail]);
  await call("POST", `/combinations/${vv}/forms/undo`);

  // ------------------------------------------------ a Redo runs the finder for this one form
  const key = `c1115r-read-${process.pid}`;
  const s1 = await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "read", mode: "replay", planSha256: plans.read.body?.planSha256, idempotencyKey: key });
  const s1again = await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "read", mode: "replay", planSha256: plans.read.body?.planSha256, idempotencyKey: key });
  ok("C11.15 Redo: the same start sent twice is the same run (one run)", s1.status === 200 && !!s1.body?.id && s1again.body?.id === s1.body?.id && Number(batches()) === Number(n0) + 1, [s1.status, s1.body?.id, s1again.body?.id]);
  const e1 = s1.body?.id ? await settle(s1.body.id) : null;
  const att = (e1?.steps ?? []).length ? (await call("GET", `/form-finder/runs/${s1.body.id}`)).body?.result?.attach ?? [] : [];
  ok("C11.15 Redo read (saved answers): the run ends, spends US$0, takes only IMM 5257, and its line stays as it was (already attached)",
    ["done", "done_with_problems"].includes(e1?.status) && e1?.usd?.spent === 0 && att.length === 1 && att[0]?.code === "IMM 5257" && att[0]?.line === "already" && line(vv, "IMM 5257") === v5257, { status: e1?.status, usd: e1?.usd, attach: att.map((a: any) => `${a.code}:${a.line}`), line: line(vv, "IMM 5257") }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const s2 = await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "find", mode: "replay", planSha256: (await call("POST", `/combinations/${vv}/forms/${C}/redo`, { stage: "find" })).body?.planSha256 });
  const stop = s2.body?.id ? await call("POST", `/runs/${s2.body.id}/stop`) : { status: 0, body: null };
  ok("C11.15 Redo find, stopped: Stop answers with the run ended (Stopped, or Done when it ended first); nothing spent; the line unchanged",
    s2.status === 200 && ["stopped", "done", "done_with_problems"].includes(stop.body?.status) && (stop.body?.usd?.spent ?? 0) === 0 && line(vv, "IMM 5257") === v5257, { start: s2.status, stop: [stop.status, stop.body?.status] });

  // ------------------------------------------------ Replace: compares with canada.ca, never AI
  const n1 = batches();
  r = await call("POST", `/combinations/${vv}/forms/${C}/replace`, { version: Number(v5257.split("|")[1]) });
  ok("C11.15 Replace: compares with canada.ca (no AI): no run started, no live step, the ledger untouched", r.status < 300 && typeof r.body?.outcome === "string" && batches() === n1 && live() === "0", [r.status, r.body?.outcome]);

  ok("C11.15 US$0: the spend ledger was never written (its files unchanged) and nothing was committed", ledgerFiles() === ledger0 && (await call("GET", "/ledger")).body?.committed_usd === committed0 && live() === "0", { committed0 });
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
