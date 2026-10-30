// P-179 (C11.8): the shared cost warning walked in a real browser on the field-map start (combination › Next step "Draft
// setup" › Draft again › Start). Over the US$120 cap: the warning shows expected, worst case, spend so far against the cap
// and the limit, before anything starts; Cancel starts nothing and records nothing (US$0); Continue records the author's
// override and starts the run with it; past US$132 there is no Continue. The check starts its own isolated copy with no
// live AI switch and the queue held, on a scratch ledger of its own: no AI call, no launcher, US$0. Screenshots at 1440,
// 1024 and 390 px into product/screens/W1-ai-drafting/screenshots/p179/; axe (WCAG 2.2 AA) on the warning.
//   node studio/tests/check_cost_warning_browser.cjs [port=4456] [name=forms_cw]
const path = require("node:path"); const fs = require("node:fs"); const os = require("node:os"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4456), NAME = process.argv[3] ?? "forms_cw", DB = `xr_studio_${NAME}`;
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-ai-drafting", "screenshots", "p179"); fs.mkdirSync(SHOTS, { recursive: true });
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), "p2-ledger-p179b-")), LEDGER = path.join(SCRATCH, "spend.jsonl");
const ISOLATED = path.join(__dirname, "..", "tools", "isolated.sh");
execFileSync("zsh", [ISOLATED, NAME, String(PORT), "start", `P2_LEDGER_DIR=${SCRATCH}`, "STUDIO_HOLD_QUEUE=1"], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, STUDIO_AI_LIVE: "" } });
const stop = () => { try { execFileSync("zsh", [ISOLATED, NAME, String(PORT), "stop"], { stdio: "ignore" }); } catch { /* already stopped */ } fs.rmSync(SCRATCH, { recursive: true, force: true }); };
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const lines = () => (fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, "utf8") : "").split("\n").filter(Boolean).map((l) => JSON.parse(l));
let n = 0; const seed = (usd) => fs.appendFileSync(LEDGER, JSON.stringify({ type: "reserve", id: `seed-p179-${++n}`, run_id: `seed-p179-${n}`, attempt: 1, worst_usd: usd, caller: "check_cost_warning_browser seed", at: "2026-10-20T00:00:00.000Z" }) + "\n");
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(detail).slice(0, 260)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.json !== undefined ? JSON.stringify(init.json) : undefined }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  const shot = async (name) => { for (const w of [1440, 1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await sleep(150); await p.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`) }); } await p.setViewportSize({ width: 1440, height: 900 }); };
  const axe = async (label) => { const r = await new AxeBuilder({ page: p }).include("[role=dialog]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe (WCAG 2.2 AA): ${label}`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.map((x) => x.target.join(" ")).join(" | ")}`).join("; ")); };
  try {
    // Setup as check_cost_override: IMM 5409 on the Visitor visa is drafted (no reviewed map); IMM 5707 added from the library.
    await api("/demo/load", { method: "POST" });
    const vv = sql("select id from combination where combination_key='vv.single'");
    await api(`/combinations/${vv}/attachments/sample`, { method: "POST", json: { officialFile: "imm5409e.pdf" } });
    const src = sql(`select id from source_attachment where file_name='imm5409e.pdf' and combination_id='${vv}'`);
    sql("update form_edition set sha256 = repeat('1', 64) where edition_label = 'IMM 5409 (01-2023)'");
    sql("update form_field_map set status = 'DRAFT' where form_edition_id = (select id from form_edition where edition_label = 'IMM 5409 (01-2023)')");
    sql(`update source_attachment set status = 'RECOGNISED' where id = '${src}'`);
    await api(`/combinations/${vv}/lines`, { method: "POST", json: { kind: "FORM", formKey: "IMM 5707" } });
    const plan = (await api("/ai/plan", { method: "POST", json: { scope: { kind: "combination", ids: [vv] }, mode: "LIVE", draftAgain: true } })).body;
    const worst = plan.cost_check.worst_usd;
    seed(120 - worst / 2); // spend so far just under the cap: this start could pass it by half its worst case
    const open = async () => {
      await p.goto(`${BASE}/`); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
      await p.goto(`${BASE}/c/${vv}`);
      await p.locator('[data-next-step="draft_ai"]').click();
      await p.getByLabel(/Draft again even where/).check();
      await p.getByRole("button", { name: /^Start \d+ step/ }).click();
    };
    const warning = p.locator("[data-cost-warning]");
    await open();
    await warning.waitFor({ timeout: 30_000 });
    const text = await p.getByRole("dialog", { name: "This start is over a cost limit" }).textContent();
    step("C11.8 P-179 pass: over the cap, the warning shows before anything starts: worst case, spend so far against the cap, the limit and why", worst > 0 && new RegExp(`US\\$${worst.toFixed(2)}`).test(text) && /Spent so far US\$\d+\.\d\d of US\$120\.00/.test(text) && /AI spending cap\./.test(text) && /Continue records your name and allows this one run/.test(text) && (await api("/ai/batches")).body.length === 0, text);
    // Review m5 + m4: spend so far is said once (before: 3 times), with the same label and cents as Draft setup's cost line.
    const panelSpent = ((await p.locator("[data-cost-line]").textContent()) ?? "").match(/Spent so far (US\$\d+\.\d\d)/)?.[1];
    step("C11.8 review m5: the warning says spend so far once (not in its description or the limit's words too)", (text.match(/spen[dt] so far/gi) ?? []).length === 1, text);
    step("C11.8 review m4: the warning and Draft setup show the same spend, with one label (Spent so far)", !!panelSpent && text.includes(`Spent so far ${panelSpent} of`), `${panelSpent} | ${text}`);
    step("C11.8 P-179 pass: Continue and Cancel are buttons a keyboard reaches, Continue described by what it allows", (await p.getByRole("button", { name: "Continue" }).getAttribute("aria-describedby")) === "cost-continue-note" && (await p.getByRole("button", { name: "Cancel" }).last().isEnabled()));
    await axe("cost warning, Continue offered"); await shot("01-cost-warning");
    await p.locator("[data-cost-cancel]").click();
    await warning.waitFor({ state: "detached" });
    await sleep(500);
    step("C11.8 P-179 fail: Cancel starts nothing and records nothing (no run, no override, US$0)", (await api("/ai/batches")).body.length === 0 && !lines().some((l) => l.type === "override") && (await p.getByText("Cancelled: nothing was started and nothing was spent.").count()) === 1);
    // Review m3 (EXPERIENCE 12): after Cancel, and after Escape, focus is back on Start, so the keyboard path goes on.
    const startFocused = async () => { for (let i = 0; i < 20; i++) { if (await p.evaluate(() => /^Start \d+ step/.test(document.activeElement?.textContent?.trim() ?? ""))) return true; await sleep(100); } return false; };
    step("C11.8 review m3: after Cancel, focus is on Start again (before: on the page)", await startFocused(), await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
    await p.keyboard.press("Enter");
    await warning.waitFor();
    await p.keyboard.press("Escape");
    await warning.waitFor({ state: "detached" });
    step("C11.8 review m3: Enter on Start opens the warning again; after Escape, focus is on Start again and nothing started", await startFocused() && (await api("/ai/batches")).body.length === 0, await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
    await p.getByRole("button", { name: /^Start \d+ step/ }).click();
    await warning.waitFor();
    await p.locator("[data-cost-continue]").click();
    await p.waitForURL(/\/ai\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const batchId = p.url().split("/").pop();
    const ov = JSON.parse(sql(`select plan::text from ai_batch where id='${batchId}'`)).override;
    const rec = lines().find((l) => l.type === "override");
    step("C11.8 P-179 pass: Continue records the author's override for this run's worst case, then starts the run with it", rec?.by === "user-A" && rec.worst_usd === worst && rec.limits.join() === "experiment" && ov?.id === rec.id && lines().some((l) => l.type === "override_use" && l.id === rec.id), JSON.stringify({ rec, ov }));
    await shot("02-started-after-continue");
    // Past the ceiling: the run is stopped, spend so far moved past US$132 - worst.
    await api(`/ai/batches/${batchId}/cancel`, { method: "POST" });
    seed(12.01);
    await open();
    const ceiling = p.getByRole("dialog", { name: "This start is past what a click may allow" });
    await ceiling.waitFor({ timeout: 30_000 });
    step("C11.8 P-179 fail: past US$132 there is no Continue, only the founder raising the cap, with spend so far shown", (await p.locator("[data-cost-continue]").count()) === 0 && /founder must raise the cap/.test(await ceiling.textContent()) && ((await ceiling.textContent()).match(/Spent so far US\$\d+\.\d\d of US\$120\.00/g) ?? []).length === 1);
    await axe("cost warning, past the ceiling"); await shot("03-past-ceiling");
    await p.locator("[data-cost-cancel]").click();
    step("C11.8 P-179 pass: Cancel past the ceiling leaves exactly the one earlier run and one override", (await api("/ai/batches")).body.length === 1 && lines().filter((l) => l.type === "override").length === 1);
    step("no page errors", errs.length === 0, errs.join(" | "));
    step("US$0: no AI call was made (no reserve line other than this check's seeds)", lines().filter((l) => l.type === "reserve").every((l) => String(l.id).startsWith("seed-p179")));
  } catch (e) { step("the check ran to its end", false, e.stack); }
  await b.close(); stop();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
