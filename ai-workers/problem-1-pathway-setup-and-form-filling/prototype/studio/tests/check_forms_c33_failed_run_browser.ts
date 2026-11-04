// C3.3 in the browser, as a person (journey J2, Part C steps 29 and 30): an AI failure gives a plain message and keeps the
// good entries; Retry runs only the failed step and stops after three attempts; a paid repeat of a failed run is refused
// in the plan before anything starts. Configuration author (user-A) and Content reviewer (user-C), 1440 and 1024 px, axe.
// US$0: saved answers and the library only. The failure is the test-only fault switch (STUDIO_FAULT_SOURCE, honoured only
// on an isolated copy). The paid-repeat case plants one Sample failed record for IMM 1344 with today's inputs (copied from
// the saved real IMM 1344 refusal of 23 Oct, removed at exit, as acceptance/C3.3.test.ts AT-12). No live switch; the
// ledger and the stand-in launcher's log are checked unchanged.
//   zsh studio/tools/isolated.sh forms_c33ui 4456 start STUDIO_FAULT_SOURCE=imm5707e.pdf STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_c33_failed_run_browser.ts 4456 xr_studio_forms_c33ui
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { checkCopy, needCombo, PLANT_MARK, plantRun, sqlFor, stop } from "../acceptance/lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_c33ui", NAME = DB.replace(/^xr_studio_/, ""), BASE = `http://localhost:${PORT}`;
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), RUNS = join(PROTOTYPE, "p2", "runs");
const SHOTS = join(PROTOTYPE, "..", "product", "screens", "C3.3-failed-run"); mkdirSync(SHOTS, { recursive: true });
const FAKE_LOG = join(STUDIO, "var", `isolated-${NAME}`, "fake-launch.log");
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, what: string, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return; await sleep(500); } throw new Error(`timed out after ${ms / 1000} s waiting for ${what}`); };
const ledger = async () => { const l = (await call("GET", "/ledger")).body; return JSON.stringify([l?.committed_usd, l?.wave?.spent_usd]); };
const liveCalls = () => (existsSync(FAKE_LOG) ? readFileSync(FAKE_LOG, "utf8").split("\n").filter((l) => l.includes('"mode":"live"')).length : 0);
const TECH = /\b(ENOENT|EACCES|errno|syscall|stack|undefined|null)\b|\/(Users|home|private|tmp)\/|\.(m?[jt]s|py|json|pdf)\b|\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b|Error:/; // review M1: no file names or server settings either

async function axe(p: Page, what: string) {
  const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
  ok(`C3.3 axe: ${what} has no WCAG 2.2 A/AA violation`, v.length === 0, v.map((x) => `${x.id}: ${x.nodes[0]?.target}`));
}
const asPerson = async (p: Page, actor: string) => { await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
const rowOf = (p: Page, form: RegExp, attempt?: number) => p.locator("main table tbody tr").filter({ hasText: form }).filter(attempt ? { hasText: `attempt ${attempt}` } : {});

(async () => {
  await checkCopy(PORT, DB);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load")).status >= 300) stop("the sample did not load");
  const vv = await needCombo(PORT, DB, "visitor_visa");
  if (!vv) stop("the sample has no Visitor visa");
  const ledger0 = await ledger(), live0 = liveCalls();

  // ── setup, as Draft setup's Start does: one batch where IMM 5257 replays its saved answer and IMM 5707 fails (induced)
  const scope = { kind: "combination", ids: [vv] };
  const plan = (await call("POST", "/ai/plan", { scope, mode: "REPLAY", draftAgain: true })).body;
  const started = await call("POST", "/ai/batches", { scope, mode: "REPLAY", draftAgain: true, planSha256: plan?.plan_sha256, idempotencyKey: `c33ui-${Date.now()}` });
  const B: string = started.body?.id;
  if (!B) stop(`the batch did not start: ${JSON.stringify(started.body).slice(0, 200)}`);
  await until(async () => ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes((await call("GET", `/ai/batches/${B}`)).body?.status), "the batch to end");
  const batch0 = (await call("GET", `/ai/batches/${B}`)).body;
  const j5257 = batch0.jobs.find((j: { source: string }) => /IMM 5257/.test(j.source)), j5707 = batch0.jobs.find((j: { source: string }) => /IMM 5707/.test(j.source));
  if (j5707?.status !== "FAILED") stop("the copy was not started with STUDIO_FAULT_SOURCE=imm5707e.pdf (see the usage line)");
  const kept = (await call("GET", `/jobs/${j5257.id}`)).body;

  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs: string[] = []; p.on("pageerror", (e) => errs.push(e.message));
  try {
    // ── step 29: the person opens the AI work and sees one failure in words, the good draft kept
    await asPerson(p, "user-A");
    for (const [w, h] of [[1440, 900], [1024, 768]] as const) {
      await p.setViewportSize({ width: w, height: h });
      await p.goto(`${BASE}/ai/${B}`);
      await p.locator("main h1").waitFor({ timeout: 30_000 });
      await rowOf(p, /IMM 5707/).first().waitFor({ timeout: 30_000 });
      const head = await p.locator("main").innerText();
      ok(`C3.3 step 29 (${w}): the run reads "Done with problems" and spent US$0.00`, /Done with problems/.test(head) && /Spent US\$0\.00/.test(head), head.slice(0, 400));
      const said = (await rowOf(p, /IMM 5707/).first().locator("td").nth(4).innerText()).trim();
      ok(`C3.3 step 29 (${w}): IMM 5707's step says what went wrong in plain words (no code, path or stack)`, said.length > 10 && !TECH.test(said), said);
      ok(`C3.3 step 29 (${w}): IMM 5257's draft is kept and offered for review`, await rowOf(p, /IMM 5257/).first().getByRole("link", { name: "Review proposals" }).isVisible());
      ok(`C3.3 step 29 (${w}): the next step is offered: Retry the 1 failed step only`, await p.getByRole("button", { name: /Retry 1 failed step$/ }).waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false)); // CI on #741: isVisible() did not wait for the button
      ok(`C3.3 (${w}): the page fits without sideways scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
      await p.screenshot({ path: join(SHOTS, `29-done-with-problems-${w}.png`), fullPage: true });
      if (w === 1440) await axe(p, "the failed run");
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    await rowOf(p, /IMM 5257/).first().getByRole("link", { name: "Review proposals" }).click();
    await p.waitForURL(/\/jobs\//, { timeout: 30_000 });
    // Waits for the count itself, not the first word "proposal": the count renders after the items load (a PR check read
    // the page too early, 1 Nov). A wait that times out fails the check loudly, with what the page said.
    const all = `All (${kept.items.length})`;
    const shown = await p.locator("main").getByText(all, { exact: false }).first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
    const jobText = await p.locator("main").innerText();
    ok("C3.3 step 29: the kept IMM 5257 draft opens with every proposal of its answer, ready to decide", kept.status === "COMPLETED" && kept.items.length > 0 && shown && jobText.includes(all), { items: kept.items.length, said: shown ? all : jobText.slice(0, 300) });
    await p.screenshot({ path: join(SHOTS, "29-kept-draft-1440.png") });

    // ── step 30, refusal: the Content reviewer has no way to retry
    await asPerson(p, "user-C");
    await p.goto(`${BASE}/ai/${B}`); await rowOf(p, /IMM 5707/).first().waitFor({ timeout: 30_000 });
    await p.getByText("Done with problems").first().waitFor({ timeout: 30_000 });
    const offered = await p.getByRole("button", { name: /Retry \d+ failed step/ }).count();
    const attemptsC = (await call("GET", `/ai/batches/${B}`)).body.jobs.filter((j: { source: string }) => /IMM 5707/.test(j.source)).length;
    ok("C3.3 step 30 refusal: the Content reviewer is offered no Retry (the author's duty); nothing runs again", offered === 0 && attemptsC === 1, { offered, attemptsC });

    // ── step 30: the author retries; only IMM 5707 runs again; after three attempts Retry needs a person
    await asPerson(p, "user-A");
    for (const n of [2, 3]) {
      await p.goto(`${BASE}/ai/${B}`);
      await p.getByRole("button", { name: /Retry 1 failed step$/ }).click();
      await rowOf(p, /IMM 5707/, n).waitFor({ timeout: 60_000 });
      await until(async () => !["QUEUED", "RUNNING"].includes((await call("GET", `/ai/batches/${B}`)).body?.status), `attempt ${n} to end`);
    }
    await p.reload(); await rowOf(p, /IMM 5707/, 3).waitFor({ timeout: 30_000 });
    ok("C3.3 step 30: Retry ran only IMM 5707 (attempts 2 and 3); IMM 5257's kept draft never ran again", await rowOf(p, /IMM 5707/).count() === 3 && await rowOf(p, /IMM 5257/).count() === 1);
    const stuck = (await p.getByRole("status").filter({ hasText: "needs a person" }).first().innerText({ timeout: 15_000 })).trim();
    ok("C3.3 step 30 refusal: after three attempts no fourth is offered; the page says it needs a person and what to do (P-110); no step is added", await p.getByRole("button", { name: /Retry \d+ failed step/ }).count() === 0 && /IMM 5707.*needs a person/.test(stuck) && /Form library by hand/.test(stuck) && await rowOf(p, /IMM 5707/).count() === 3, stuck);
    await p.screenshot({ path: join(SHOTS, "30-after-three-attempts-1440.png"), fullPage: true });

    // ── a paid repeat of a failed run is refused in the plan (Library › Forms › IMM 1344 › Re-read with AI)
    const wp = await needCombo(PORT, DB, "lmia_work_permit");
    await call("POST", `/combinations/${wp}/attachments/sample`, { officialFile: "imm1344e.pdf" });
    const a1344 = sql(`select id from source_attachment where combination_id='${wp}' and file_name='imm1344e.pdf' limit 1`);
    if (!a1344) stop("IMM 1344 could not be added to the work permit");
    await call("POST", "/ai/plan", { scope: { kind: "source", ids: [a1344] }, mode: "LIVE" }); // writes today's job file
    const SAVED = join(RUNS, "studio-fieldmap-imm1344e-live-20261023t045220033z.json"), JOB = join(PROTOTYPE, "p2", "jobs", "studio-fieldmap-imm1344e.json"), PROMPTS = join(PROTOTYPE, "p2", "prompts");
    if (!existsSync(SAVED) || !existsSync(JOB)) stop("the saved IMM 1344 refusal or its job file is missing");
    const env = JSON.parse(readFileSync(SAVED, "utf8")), job = JSON.parse(readFileSync(JOB, "utf8"));
    const shaOf = (f: string) => createHash("sha256").update(readFileSync(join(PROMPTS, f))).digest("hex");
    env.drafting_run.inputs.official_files = job.inputs;
    env.drafting_run.settings = { ...env.drafting_run.settings, model: job.settings.model, effort: job.settings.effort, max_output_tokens: job.settings.max_output_tokens };
    env.launch_evidence = { ...env.launch_evidence, template_sha256: shaOf(job.template), schema_sha256: shaOf(job.output_schema), known: job.known ?? null };
    env.drafting_run.ended_at = "2026-11-01T00:00:00.000Z";
    plantRun(`studio-fieldmap-imm1344e-live-20261101t000000002z-${PLANT_MARK}.json`, env);
    const q0 = sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job");

    await p.goto(`${BASE}/library/forms`);
    await p.getByRole("button", { name: "Actions for IMM 1344" }).click();
    await p.getByRole("menuitem", { name: /Re-read with AI/ }).click();
    const panel = p.getByRole("dialog");
    await panel.getByText(/Draft field maps/).first().waitFor({ timeout: 30_000 });
    await panel.getByRole("radio", { name: /^Live/ }).check();
    await panel.locator("tbody tr").filter({ hasText: "IMM 1344" }).first().waitFor({ timeout: 30_000 });
    const first = await panel.locator("tbody tr").filter({ hasText: "IMM 1344" }).first().innerText();
    ok("C3.3 plan: asked for live AI on IMM 1344, the plan first uses its saved AI answer (no model call, US$0)", /saved/i.test(first) && /no cost|US\$0/.test(first) && !/~US\$/.test(first), first);
    await panel.getByRole("checkbox", { name: /Draft again/ }).check();
    await panel.locator("tbody tr").filter({ hasText: /refused/ }).first().waitFor({ timeout: 30_000 });
    const again = await panel.locator("tbody tr").filter({ hasText: "IMM 1344" }).first().innerText();
    ok("C3.3 plan refusal: drafting IMM 1344 again live, with the same form, prompt and settings as an answer that failed our own check, is refused in words before anything starts", /A new paid call is refused/.test(again) && /failed our own check/.test(again), again);
    const startBtn = panel.getByRole("button", { name: /^Start/ });
    ok("C3.3 plan refusal: no priced Start is offered for that repeat (the row has no price; Start is off)", !/~US\$/.test(again) && (await startBtn.isDisabled()), [again, await startBtn.innerText()]);
    await p.screenshot({ path: join(SHOTS, "plan-paid-repeat-refused-1440.png") });
    await axe(p, "the plan with a refused paid repeat");
    ok("C3.3: nothing was queued by the refused plan", sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job") === q0);
    ok("C3.3: no page error in the whole walk", errs.length === 0, errs);
  } finally { await browser.close(); }
  ok("C3.3: the whole walk spent nothing: no live call reached the launcher, the ledger is unchanged", liveCalls() === live0 && (await ledger()) === ledger0, { live: liveCalls() - live0 });
  console.log(`\n${pass} passed, ${fail} failed (C3.3 failed run, as a person; US$0)`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C3.3 the check itself stopped:", e); process.exit(1); });
