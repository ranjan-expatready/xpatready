// QA-91 (C11.12, P-110; Lead 30 Oct: build now): Who can be › AI now runs in the background as a run, like the form
// finder and Upload PDF: it answers at once with a run id, the shared run card reads its four steps (rules, AI, AI check,
// rules), Stop ends it so no later round starts, and the proposal is read when it is done (never saved). Rules only and
// saved AI answers still answer at once. AI now opens on this isolated copy only because its launcher is the test fixture
// (tests/fixtures/fake-launch.mjs; no live switch, Lead 30 Oct): no network, no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_qa91 4433 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_qa91_who_can_be_run.ts 4433 xr_studio_runtime_qa91
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rulesReading } from "../api/src/people-ai.ts";
import { FAKE_LAUNCHER, launcherFor } from "../api/src/sources.ts";

const PORT = Number(process.argv[2] ?? 4433), DB = process.argv[3] ?? "xr_studio_runtime_qa91";
const SOLUTION = join(import.meta.dirname, "..", "..", "..");
const VAR = join(import.meta.dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await wait(300); } return false; };
const launches = () => (existsSync(join(VAR, "fake-launch.log")) ? readFileSync(join(VAR, "fake-launch.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as { job: string; mode: string }) : []);

(async () => {
  // Spend guard (30 Oct: a wrong fixture path once let this check reach the real launcher, US$0.17 unapproved): before
  // anything runs, the server on this port must be started with the fake launcher, resolved exactly as the server does.
  const pid = execFileSync("lsof", ["-ti", `tcp:${PORT}`, "-sTCP:LISTEN"], { encoding: "utf8" }).trim().split("\n")[0];
  // The server's environment: /proc on Linux (CI), "ps -E" on macOS (its -E flag is macOS-only; lead, 31 Oct).
  const env = !pid ? "" : existsSync(`/proc/${pid}/environ`) ? readFileSync(`/proc/${pid}/environ`, "utf8").split("\0").join(" ") : execFileSync("ps", ["-E", "-ww", "-p", pid, "-o", "command="], { encoding: "utf8" });
  const fake = env.match(/STUDIO_FAKE_LAUNCHER=(\S+)/)?.[1], varRoot = env.match(/STUDIO_VAR=(\S+)/)?.[1] ?? "";
  if (!fake || launcherFor(fake, varRoot) !== FAKE_LAUNCHER) { console.error(`STOP  the server on :${PORT} does not run the fake launcher (${fake ?? "not set"}): this check would make paid AI calls. Start it as the usage line says.`); process.exit(2); }
  ok("spend guard pass: this server runs the fake launcher (resolved as the server does), so nothing here reaches a model", launcherFor(fake, varRoot) === FAKE_LAUNCHER, fake);
  ok("spend guard fail: the incident's path (relative to the wrong folder) does not count as the fake launcher, so the guard stops", launcherFor("studio/tests/fixtures/fake-launch.mjs", varRoot) !== FAKE_LAUNCHER);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load", {})).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const vv = sql(`select id from combination where combination_key='vv.single'`);
  const people0 = sql(`select participants::text from combination where id='${vv}'`);
  const guide = JSON.parse(readFileSync(join(SOLUTION, "prototype", "p1", "inventory", "guide-5256.text.inventory.json"), "utf8")).text as string;
  const rr = rulesReading(guide).people, q = (role: string) => rr.find((x) => x.role === role)?.quote ?? rr[0].quote;
  const answer = { people: [{ role: "principal", min: 1, max: 1, applies: true, quote: q("principal"), why: null }, { role: "spouse_or_partner", min: 0, max: 1, applies: true, quote: q("spouse_or_partner"), why: null }], unresolved: [] };
  const record = { caller: "live", contract_valid: true, drafting_run: { status: "completed", usage: { cost_usd: 0 } }, raw_output: JSON.stringify(answer) };
  const scenario = (draftSleep: number) => writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs: {
    "studio-who-can-be-check": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record } },
    "studio-who-can-be-": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, sleep_ms: draftSleep, record } } } }));
  const start = async () => {
    const plan = await call("POST", `/combinations/${vv}/people/propose/plan`, { mode: "live" });
    return { plan, r: await call("POST", `/combinations/${vv}/people/propose`, { mode: "live", planSha256: plan.body?.plan_sha256 }) };
  };

  // ======================================================== pass: a run with its steps, then the proposal
  rmSync(join(VAR, "fake-launch.log"), { force: true });
  scenario(2500);
  const a = await start();
  ok("C11.12 QA-91 pass: AI now answers at once with a run id, not the proposal", a.plan.status < 300 && a.r.status < 300 && typeof a.r.body?.runId === "string" && !("people" in (a.r.body ?? {})), a.r.body);
  const id = a.r.body?.runId as string;
  let mid: any = null;
  await until(async () => { const v = (await call("GET", `/runs/${id}`)).body; if (v?.step?.n === 2) { mid = v; return true; } return v?.status !== "running" && v?.status !== "queued"; });
  ok("C11.12 QA-91 / P-110: while AI runs, the card says step 2 of 4, in words, with Stop offered and the worst case stated", mid?.step?.m === 4 && /AI lists who the guide lets/.test(mid?.step?.label ?? "") && mid?.can_stop === true && mid?.label === "Filling Who can be from the guide" && typeof mid?.usd?.worst === "number", mid && { step: mid.step, label: mid.label, can_stop: mid.can_stop });
  ok("C11.12 QA-91: the four steps say which use AI (rules · AI · AI · rules)", JSON.stringify((mid?.steps ?? []).map((s: any) => s.uses)) === JSON.stringify(["rules", "ai", "ai", "rules"]), (mid?.steps ?? []).map((s: any) => `${s.label}: ${s.uses}`));
  await until(async () => (await call("GET", `/runs/${id}`)).body?.status === "done");
  const done = (await call("GET", `/runs/${id}`)).body;
  ok("C11.12 QA-91 pass: the run ends done, every step completed, US$0 spent, and the card points at the Questionnaires tab", done?.status === "done" && done.steps.every((s: any) => s.status === "COMPLETED") && done.usd.spent === 0 && done.href === `/c/${vv}/questionnaires`, done && { status: done.status, steps: done.steps.map((s: any) => s.status), href: done.href });
  const res = await call("GET", `/combinations/${vv}/people/runs/${id}`);
  ok("C11.12 QA-91 pass: the proposal is read when done: the lines both rounds agree on, each with its guide sentence, from AI now", res.status === 200 && res.body?.from === "live" && res.body.people.some((p: any) => p.role === "principal") && res.body.people.some((p: any) => p.role === "spouse_or_partner"), res.body?.note);
  ok("C11.12 QA-91: nothing is saved by the run (the combination's people are as before until a person uses the lines and saves)", sql(`select participants::text from combination where id='${vv}'`) === people0);

  // ======================================================== Stop: no later round starts
  rmSync(join(VAR, "fake-launch.log"), { force: true });
  scenario(20000);
  const b = await start();
  const sid = b.r.body?.runId as string;
  await until(async () => (await call("GET", `/runs/${sid}`)).body?.step?.n === 2);
  const stopB = await call("POST", `/runs/${sid}/stop`, undefined, "user-B");
  ok("C11.12 QA-91 roles fail: an approver cannot stop someone's run (403)", stopB.status === 403, stopB.status);
  const stop = await call("POST", `/runs/${sid}/stop`);
  ok("C11.12 QA-91 / P-110 pass: Stop answers at once and the card says Stopping or Stopped", stop.status < 300 && ["stopping", "stopped"].includes(stop.body?.status), stop.body?.status);
  const ended = await until(async () => (await call("GET", `/runs/${sid}`)).body?.status === "stopped", 30000);
  const after = (await call("GET", `/runs/${sid}`)).body;
  ok("C11.12 QA-91 / P-110 pass: the running AI call is ended and the run says Stopped, in words, with what it spent", ended && /Stopped by a person/.test(after?.message ?? "") && after?.can_stop === false, after?.message);
  ok("C11.12 QA-91 / P-110 fail-guard: no round starts after Stop (the check round was never launched)", !launches().some((l) => l.job.startsWith("studio-who-can-be-check")) && after?.steps?.[2]?.status === "CANCELLED", { launches: launches().map((l) => `${l.job.slice(0, 30)}:${l.mode}`), check: after?.steps?.[2]?.status });
  const r409 = await call("GET", `/combinations/${vv}/people/runs/${sid}`);
  ok("C11.12 QA-91 fail: a stopped run has no proposal (409, in words)", r409.status === 409 && /stopped before it proposed/.test(r409.body?.detail ?? ""), r409.body?.detail);
  const again = await call("POST", `/runs/${sid}/stop`);
  ok("C11.12 QA-91 fail: Stop on an ended run is refused (409, already ended)", again.status === 409 && /already ended/.test(again.body?.detail ?? ""), again.body?.detail);

  // ======================================================== the other ways and wrong ids
  const rules = await call("POST", `/combinations/${vv}/people/propose`, { mode: "rules", planSha256: (await call("POST", `/combinations/${vv}/people/propose/plan`, { mode: "rules" })).body?.plan_sha256 });
  ok("C11.12 QA-91: rules only still answers at once with the proposal (no run)", rules.status < 300 && rules.body?.from === "rules" && !("runId" in (rules.body ?? {})), rules.body?.note);
  const nf = await call("GET", `/combinations/${vv}/people/runs/00000000-0000-0000-0000-000000000000`);
  const other = sql(`select id from combination where combination_key='wp.family'`);
  const wrong = await call("GET", `/combinations/${other}/people/runs/${id}`);
  ok("C11.12 QA-91 fail: an unknown run, or a run of another combination, is not found (404, in words)", nf.status === 404 && wrong.status === 404 && /no longer exists/.test(nf.body?.detail ?? ""), [nf.status, wrong.status]);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
