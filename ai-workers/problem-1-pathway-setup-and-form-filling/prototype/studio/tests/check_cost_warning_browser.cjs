// P-179 (C11.8): the shared cost warning walked in a real browser on the field-map start (combination › Next step "Draft
// setup" › Draft again › Start). Over the US$120 cap: the warning shows expected, worst case, spend so far against the cap
// and the limit, before anything starts; Cancel starts nothing and records nothing (US$0); Continue records the author's
// override and starts the run with it; past US$132 there is no Continue. The check starts its own isolated copy with no
// live AI switch and the queue held, on a scratch ledger of its own: no AI call, no launcher, US$0. Screenshots at 1440,
// 1024 and 390 px into product/screens/W1-ai-drafting/screenshots/p179/; axe (WCAG 2.2 AA) on the warning.
//   node studio/tests/check_cost_warning_browser.cjs [port=4456] [name=forms_cw]
const path = require("node:path"); const fs = require("node:fs"); const os = require("node:os"); const { execFileSync } = require("node:child_process");
const { stepsBeforeForms } = require("./fixtures/steps-before-forms.cjs");
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
    await stepsBeforeForms(api, vv, "json"); // QA-119: the header shows Map n forms once steps 1 and 2 are done
    const plan = (await api("/ai/plan", { method: "POST", json: { scope: { kind: "combination", ids: [vv] }, mode: "LIVE", draftAgain: true } })).body;
    const worst = plan.cost_check.worst_usd;
    const open = async (start = true) => {
      await p.goto(`${BASE}/`); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
      await p.goto(`${BASE}/c/${vv}`);
      await p.locator('[data-next-step="map_forms"]').click();
      await p.getByLabel(/Draft again even where/).check();
      if (start) await p.getByRole("button", { name: /^Start \d+ step/ }).click();
    };
    const warning = p.locator("[data-cost-warning]");
    // Break 3 m1 on Draft setup: the panel is opened while the start fits (US$0 spent); spend then arrives (another copy)
    // to just under the cap, so this start could pass it by half its worst case, and the panel's plan is out of date.
    await open(false);
    await p.waitForFunction(() => [...document.querySelectorAll("button")].some((x) => /^Start \d+ step/.test(x.textContent?.trim() ?? "") && !x.disabled), null, { timeout: 30_000 });
    { const modes = await p.locator('fieldset[aria-label="How the AI runs"] input[type="radio"]').count(); const t = await p.locator('fieldset[aria-label="How the AI runs"]').innerText();
      step("D2 (P-227): the AI start offers exactly Live and Saved, never the stub pass", modes === 2 && /Live/.test(t) && /Saved/.test(t) && !/Stub pass/i.test(t), { modes, t: t.slice(0, 160) }); }
    seed(120 - worst / 2);
    await p.getByRole("button", { name: /^Start \d+ step/ }).click();
    await warning.waitFor({ timeout: 30_000 });
    // N6 follow-up: Start makes the plan again first (before: the server refused the out-of-date plan, and only the next
    // Start showed the warning).
    step("C11.8 N6 follow-up fail (Draft setup): the first Start after spend arrived shows the cost warning with Continue, nothing started (before: a refusal first)", (await p.locator("[data-cost-continue]").count()) === 1 && (await p.getByText("Not started").count()) === 0 && (await api("/ai/batches")).body.length === 0);
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
    const startFocused = async () => { for (let i = 0; i < 50; i++) { if (await p.evaluate(() => /^Start \d+ step/.test(document.activeElement?.textContent?.trim() ?? ""))) return true; await sleep(100); } return false; };
    step("C11.8 review m3: after Cancel, focus is on Start again (before: on the page)", await startFocused(), await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
    // N6: Escape pressed at once, before the warning's dialog layer is ready (CI run 41082971828: it reached the Draft setup
    // panel below and closed it, with the warning still to come). It now means Cancel, and the panel stays.
    await p.keyboard.press("Enter"); await p.keyboard.press("Escape");
    await sleep(600);
    step("C11.8 N6 fail: Escape pressed before the warning is ready cancels the warning, never the Draft setup panel below; nothing started", (await warning.count()) === 0 && (await p.getByRole("dialog", { name: "Draft setup" }).count()) === 1 && (await p.getByRole("button", { name: /^Start \d+ step/ }).count()) === 1 && (await api("/ai/batches")).body.length === 0 && !lines().some((l) => l.type === "override"), `warning ${await warning.count()} · panel ${await p.getByRole("dialog", { name: "Draft setup" }).count()}`);
    step("C11.8 N6 pass: and focus is back on Start", await startFocused(), await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
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
    await api(`/ai/batches/${batchId}/cancel`, { method: "POST" });

    // N6 (review N1): the Forms tab's own Draft with AI start (one form) shows the same warning, with Continue. One form's
    // worst case is part of the combination's: the dialog opens while it fits; spend then moves up (another copy) so the
    // plan the dialog holds goes out of date (break 3 m1).
    await p.goto(`${BASE}/c/${vv}/forms`);
    const row = p.locator('[data-pending^="IMM 5409"]');
    await row.getByRole("button", { name: "Read form" }).click();
    await row.getByRole("button", { name: "Draft with AI" }).click({ timeout: 30_000 });
    const dd = p.getByRole("dialog", { name: /^Draft the field map of IMM 5409/ });
    // X8a: follow the page's own ready signals, never a fixed time. First the dialog's saved answers must be in: until then
    // the dialog may still switch itself to "Use saved AI answer", undoing a Live choice made too early (the cause of the
    // 30 s time-outs in CI runs 41185122197 and 41231387000). Then choose Live and wait until Start says it is ready.
    const startBtn = dd.locator("[data-draft-start]");
    const ready = async (what, attr, value) => {
      try { await dd.locator(`[data-draft-start][${attr}="${value}"]`).waitFor({ timeout: 90_000 }); }
      catch { throw new Error(`the field-map dialog never reported ${what} (Start: mode ${await startBtn.getAttribute("data-mode")}, options loaded ${await startBtn.getAttribute("data-options-loaded")}, ready ${await startBtn.getAttribute("data-start-ready")})`); }
    };
    await ready("its saved answers loaded", "data-options-loaded", "true");
    await dd.locator('input[type="radio"]').first().check();
    await ready("Live chosen", "data-mode", "live");
    await ready("Start ready", "data-start-ready", "true");
    const startLive = dd.getByRole("button", { name: "Start Live" });
    const runsBefore = (await api("/ai/batches")).body.length;
    seed(worst / 2);
    await startLive.click();
    await warning.waitFor({ timeout: 30_000 });
    step("C11.8 N6 follow-up fail (Forms tab): the first Start after spend arrived shows the cost warning with Continue, nothing started (before: a red refusal toast first)", (await p.locator("[data-cost-continue]").count()) === 1 && (await p.getByText(/is above what is left of the experiment cap/).count()) === 0 && (await api("/ai/batches")).body.length === runsBefore);
    const sp = (await api("/ai/plan", { method: "POST", json: { scope: { kind: "source", ids: [src] }, mode: "LIVE", draftAgain: true } })).body;
    const ft = await p.getByRole("dialog").filter({ has: warning }).textContent();
    step("C11.8 N6 review N1 pass: on the Forms tab, Draft with AI › Live over the cap shows the cost warning with Continue before anything starts (before: a red toast only)", /^This start is over a cost limit/.test(ft) && sp.cost_check.can_continue && new RegExp(`US\\$${sp.cost_check.worst_usd.toFixed(2)}`).test(ft) && /AI spending cap\./.test(ft) && (await p.locator("[data-cost-continue]").count()) === 1 && (await api("/ai/batches")).body.length === runsBefore, ft);
    await axe("cost warning on the Forms tab's Draft with AI"); await shot("04-forms-tab-warning");
    await p.locator("[data-cost-cancel]").click();
    await warning.waitFor({ state: "detached" }); await sleep(400);
    step("C11.8 N6 review N1 fail: Cancel there starts nothing and records nothing; the form's dialog stays open", (await api("/ai/batches")).body.length === runsBefore && lines().filter((l) => l.type === "override").length === 1 && (await dd.count()) === 1);
    await startLive.focus(); await p.keyboard.press("Enter"); await p.keyboard.press("Escape"); await sleep(600);
    step("C11.8 N6 fail: Escape before the warning is ready there cancels the warning, not the form's dialog", (await warning.count()) === 0 && (await dd.count()) === 1 && (await api("/ai/batches")).body.length === runsBefore);
    // Review n4: the dialog says spend in cents, as Draft setup and the warning do.
    const spentNow = lines().filter((l) => l.type === "reserve").reduce((t, l) => t + l.worst_usd, 0).toFixed(2);
    // X8a: the figure is read again by a request after Start; wait for it to arrive (it may take a while under load) rather
    // than read the dialog after a fixed pause.
    const figure = `Spent so far US$${spentNow} of the US$120.00`;
    const fresh = await p.waitForFunction((t) => [...document.querySelectorAll('[role="dialog"]')].some((d) => (d.textContent ?? "").includes(t)), figure, { timeout: 60_000 }).then(() => true, () => false);
    step("C11.8 N6 review (10a0e90e) 2: after Start, the dialog's spend figure is read again (the ledger's, as the warning's; before: the figure from when it opened)", fresh, `${spentNow} | ${await dd.textContent()}`);
    step("C11.8 N6 review n4 + break 3 m2: the form's dialog says spend in cents, names the wave, and what is left before a cap (never 'US$60 left of the experiment cap') (US$x.xx, never US$119.5)", /Spent so far US\$\d+\.\d\d of the US\$120\.00 experiment cap · Wave 1: US\$\d+\.\d\d of US\$60\.00; US\$\d+\.\d\d left before a cap\./.test(await dd.textContent()), await dd.textContent());
    await startLive.click();
    await warning.waitFor();
    await p.locator("[data-cost-continue]").click();
    await p.getByText("AI draft started").first().waitFor({ timeout: 30_000 });
    const fov = lines().filter((l) => l.type === "override").at(-1);
    const fBatch = sql(`select batch_id from drafting_job where attachment_id='${src}' order by started_at desc limit 1`);
    const fPlan = JSON.parse(sql(`select plan::text from ai_batch where id='${fBatch}'`));
    step("C11.8 N6 review N1 pass: Continue there records the author's override for this form's run and starts it with it, once", fov?.by === "user-A" && fov.run_key === sp.run_key && fPlan.override?.id === fov.id && fPlan.scope?.kind === "source" && lines().filter((l) => l.type === "override_use" && l.id === fov.id).length === 1 && (await api("/ai/batches")).body.length === runsBefore + 1, JSON.stringify({ fov, o: fPlan.override }));
    await api(`/ai/batches/${fBatch}/cancel`, { method: "POST" });

    // Past the ceiling: the runs are stopped. N6 follow-up: Draft setup is opened over the cap (Continue offered) and
    // cancelled; spend then moves past US$132 - worst (another copy) while the panel stays open. The next Start makes the
    // plan again, so it shows the ceiling, with no Continue (before: the old figures and a Continue the server refused).
    await open();
    await warning.waitFor({ timeout: 30_000 });
    const continueBefore = await p.locator("[data-cost-continue]").count();
    await p.locator("[data-cost-cancel]").click();
    await warning.waitFor({ state: "detached" });
    seed(12.01);
    await p.waitForFunction(() => [...document.querySelectorAll("button")].some((x) => /^Start \d+ step/.test(x.textContent?.trim() ?? "") && !x.disabled), null, { timeout: 30_000 });
    await p.getByRole("button", { name: /^Start \d+ step/ }).click();
    const ceiling = p.getByRole("dialog", { name: "This start is past what a click may allow" });
    await ceiling.waitFor({ timeout: 30_000 });
    step("C11.8 N6 follow-up fail: after Cancel, spend past the ceiling, then Start in the same panel: the ceiling warning, no Continue (before: the old figures with Continue)", continueBefore === 1 && (await p.locator("[data-cost-continue]").count()) === 0 && ((await ceiling.textContent()).match(/Spent so far US\$(\d+\.\d\d)/)?.[1] ?? "") === lines().filter((l) => l.type === "reserve").reduce((t, l) => t + l.worst_usd, 0).toFixed(2), await ceiling.textContent());
    step("C11.8 P-179 fail: past US$132 there is no Continue, only the founder raising the cap, with spend so far shown", (await p.locator("[data-cost-continue]").count()) === 0 && /founder must raise the cap/.test(await ceiling.textContent()) && ((await ceiling.textContent()).match(/Spent so far US\$\d+\.\d\d of US\$120\.00/g) ?? []).length === 1);
    await axe("cost warning, past the ceiling"); await shot("03-past-ceiling");
    await p.locator("[data-cost-cancel]").click();
    step("C11.8 P-179 pass: Cancel past the ceiling leaves exactly the two earlier runs and their two overrides", (await api("/ai/batches")).body.length === 2 && lines().filter((l) => l.type === "override").length === 2);
    step("no page errors", errs.length === 0, errs.join(" | "));
    step("US$0: no AI call was made (no reserve line other than this check's seeds)", lines().filter((l) => l.type === "reserve").every((l) => String(l.id).startsWith("seed-p179")));
  } catch (e) { step("the check ran to its end", false, e.stack); }
  await b.close(); stop();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
