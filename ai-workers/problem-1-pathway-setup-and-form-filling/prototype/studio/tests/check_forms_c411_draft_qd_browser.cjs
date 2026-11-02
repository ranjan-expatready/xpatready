// C4.11 walked like a content publisher in a real browser (forms lane; live wiring 5a, P-227): on Work permit, family's
// Questionnaires tab, "Draft questions and documents" offers exactly Live and Saved; Saved (a stand-in saved run of step 6,
// written into p2/runs and removed after) shows the seven steps at US$0; Live shows its worst case first; a Live run shows
// on the run card with Stop; a Live run whose AI steps fail offers "Use Saved (US$0)", which replays at US$0 into To review.
// With no checklist and nothing saved, and the copy restarted without the live switch, "Nothing can start" is tied to
// Draft. axe and no sideways scroll on each state at 1440, 1024 and 400 px. Live only on the stand-in launcher (P-192):
// NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c411b 4464 start STUDIO_SLOW_QD_STEP=400 STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_forms_c411_draft_qd_browser.cjs 4464 xr_studio_forms_c411b
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4464), DB = process.argv[3] ?? "xr_studio_forms_c411b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", ".."), STUDIO = path.resolve(__dirname, ".."), REPO = path.resolve(ROOT, "..", "..");
const NAME = DB.replace(/^xr_studio_/, ""), VAR = path.join(STUDIO, "var", `isolated-${NAME}`), RUNS = path.join(ROOT, "prototype", "p2", "runs"), PROMPTS = path.join(ROOT, "prototype", "p2", "prompts");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const QUOTE = "You must show the officer that you are eligible under Canada’s Immigration law and that you will be in Canada for a temporary stay.";
const written = [];
const failing = { stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the service did not answer (stand-in)" } };
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "c411"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const KEYS = /\b[a-z_]+\.[a-z_]+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  // Waits fail loudly when they time out (no catch after a wait).
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin") && !document.querySelector("[data-qd-result] .animate-pulse"), null, { timeout: 30000 }); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    for (const [w, h] of [[1440, 900], [1024, 768], [400, 800]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`) });
      const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      step(`axe ${w} px: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
      if (w < 1440) step(`${w} px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    }
    await p.setViewportSize({ width: 1440, height: 900 });
  };


  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const l = await api("/demo/load", { method: "POST", data: {} });
  if (l.status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const go = async () => { await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(); };

  fs.mkdirSync(VAR, { recursive: true });
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ jobs: { "studio-qd-conditions-check": failing, "studio-qd-conditions": failing, "studio-pqr-picks-check": failing, "studio-pqr-picks": failing } }));
  // A stand-in Saved result of step 6 (both rounds of one run), as Track A records it.
  const guide = (await api(`/combinations/${wp}/pqr-picks/plan`, { method: "POST", data: { mode: "replay" } })).body.guide.file;
  const inputs = [{ file: guide, sha256: sha(fs.readFileSync(path.join(ROOT, guide))) }];
  const picks = [{ role: "principal", asks: "Date of birth", quote: QUOTE, why: "The officer tests age to decide eligibility (Sample)." }];
  for (const check of [false, true]) {
    const f = path.join(RUNS, `studio-pqr-picks${check ? "-check" : ""}-c411b-test-live-20261102t120000000z-${check ? "c" : "d"}${Date.now().toString(36)}.json`);
    fs.mkdirSync(RUNS, { recursive: true }); written.push(f);
    fs.writeFileSync(f, JSON.stringify({ caller: "live", contract_valid: true, launch_evidence: { template_sha256: sha(fs.readFileSync(path.join(PROMPTS, check ? "pqr-picks-check.v1.md" : "pqr-picks.v1.md"))) }, drafting_run: { status: "completed", inputs: { official_files: inputs, combination: "wp.family" }, usage: { cost_usd: 0.4 } }, raw_output: JSON.stringify({ picks, unresolved: [] }) }));
  }

  await go();
  const btn = p.getByRole("button", { name: "Draft questions and documents" });
  step("C4.11 pass: the Questionnaires tab offers Draft questions and documents to the author", await btn.isVisible());
  const dlg = p.getByRole("dialog", { name: "Draft questions and documents" });
  const start = () => dlg.locator("[data-qd-start]");
  const open = async () => { await btn.click(); await dlg.waitFor(); await dlg.locator("[data-qd-plan]").waitFor(); await p.waitForFunction(() => !!document.querySelector("[data-qd-cost], [data-qd-none]"), null, { timeout: 30000 }); await settle(); };
  await open();
  const modes = await dlg.locator("[data-qd-mode]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-qd-mode")));
  step("C4.11 S pass (P-227): exactly two ways are offered, Live and Saved", JSON.stringify(modes) === JSON.stringify(["live", "replay"]), modes.join(","));
  step("C4.11 S fail (P-227): no third way (rules only) is shown to a person", !/Rules only/i.test(await dlg.locator("fieldset").innerText()));
  step("C4.11 P pass: with a Saved result, Saved is chosen first: seven steps and US$0 before anything runs", (await start().getAttribute("data-mode")) === "replay" && /US\$0/.test(await dlg.locator("[data-qd-cost]").innerText()) && (await dlg.locator("[data-qd-steps] li").count()) === 7);
  step("C4.11 S fail: a step with nothing saved says it proposes nothing (step 5 here)", /None saved[\s\S]*proposes nothing/.test(await dlg.locator('[data-qd-step="qd_conditions"]').innerText()));
  step("C4.11 no system key shows in the plan", !KEYS.test(await dlg.locator("[data-qd-plan]").innerText()), (await dlg.locator("[data-qd-plan]").innerText()).match(KEYS)?.[0]);
  await state("plan-saved");
  await dlg.locator('[data-qd-mode="live"] input').check(); await dlg.locator("[data-qd-cost]").waitFor(); await settle();
  step("C4.11 LV pass: Live shows its worst case before anything runs, steps 5 and 6 Live", /At most US\$\d/.test(await dlg.locator("[data-qd-cost]").innerText()) && /Live/.test(await dlg.locator('[data-qd-step="qd_conditions"]').innerText()), await dlg.locator("[data-qd-cost]").innerText());
  await state("plan-live");
  // Review M1: the run card shows at once while the steps go on, and its Stop ends the run between steps.
  await start().click();
  const stopBtn = dlg.getByRole("button", { name: /\bStop\b/ });
  await stopBtn.waitFor({ timeout: 10000 });
  step("C4.11 R pass (review M1): the run card with Stop shows in the dialog while the Live run goes on", await stopBtn.isEnabled());
  await stopBtn.click();
  await p.waitForFunction(() => /Stopped/.test(document.querySelector("[data-qd-result]")?.textContent ?? ""), null, { timeout: 30000 });
  await state("run-stopped");
  step("C4.11 R pass (review M1): Stop on screen ends the run; the card says Stopped", sql(`select status from ai_batch where operation='draft_questions_documents' order by started_at desc limit 1`) === "CANCELLED");
  step("C4.11 R fail: a stopped run shows no rules verdict (it did not check)", !(await dlg.locator("[data-qd-clean]").count()) && !(await dlg.locator("[data-qd-findings]").count()));
  step("C4.11 F fail: a stopped run never offers Saved", !(await dlg.locator("[data-qd-use-saved]").count()));
  await dlg.getByRole("button", { name: "Done" }).click();
  await open();
  await dlg.locator('[data-qd-mode="live"] input').check(); await dlg.locator("[data-qd-cost]").waitFor(); await settle();
  await start().click();
  await dlg.locator("[data-qd-use-saved]").waitFor({ timeout: 60000 });
  step("C4.11 F pass (P-227): a Live run whose AI steps failed offers Use Saved (US$0): step 6 has a Saved result", /use Saved \(US\$0\)/.test(await dlg.locator("[data-qd-note]").innerText()), await dlg.locator("[data-qd-note]").innerText());
  await state("live-failed-offers-saved");
  await dlg.locator("[data-qd-use-saved]").click(); await dlg.locator("[data-qd-cost]").waitFor(); await settle();
  step("C4.11 F pass: Use Saved goes back to the plan on Saved, US$0, with focus on the Saved choice", (await start().getAttribute("data-mode")) === "replay" && /US\$0/.test(await dlg.locator("[data-qd-cost]").innerText()) && await p.evaluate(() => document.activeElement?.closest("[data-qd-mode]")?.getAttribute("data-qd-mode") === "replay"));
  await start().click();
  await dlg.locator("[data-qd-result]").waitFor({ timeout: 60000 });
  await dlg.locator("[data-qd-note]").waitFor({ timeout: 60000 });
  const res = await dlg.locator("[data-qd-result]").innerText();
  step("C4.11 R pass: the Saved run shows on the run card; it says Saved, US$0", /Saved, US\$0/.test(await dlg.locator("[data-qd-note]").innerText()) && /Rules check the whole draft/.test(res), (await dlg.locator("[data-qd-note]").innerText()).slice(0, 200));
  step("C4.11 pass: the picks are counted for To review", /\d+ items? for To review/.test(await dlg.locator("[data-qd-note]").innerText()) && (await dlg.getByRole("link", { name: "Open To review" }).count()) === 1, await dlg.locator("[data-qd-note]").innerText());
  await state("run-done");
  await dlg.getByRole("link", { name: "Open To review" }).click();
  await p.waitForURL(/\/review\/proposals/); await settle();
  // CI (#469): on a slow runner the list can render after settle(); wait for it (up to 15 s), then judge, with what showed.
  await p.waitForFunction(() => /pre-qualification/i.test(document.querySelector("main")?.innerText ?? ""), null, { timeout: 15000 }).catch(() => {});
  const landed = await p.locator("main").innerText();
  step("C4.11 pass: Open To review lands on this combination's items", /pre-qualification/i.test(landed), `${p.url()} — ${landed.slice(0, 300)}`);

  // The demo's own state: no live switch, no checklist to read and nothing saved: nothing can start, tied to Draft.
  for (const f of written.splice(0)) fs.rmSync(f, { force: true });
  sql(`update source_attachment set recognised=false where combination_id='${wp}' and kind='Document checklist'`);
  let said = "";
  try { execFileSync("zsh", [path.join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", "STUDIO_SLOW_QD_STEP=400"], { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { said = String(e?.stderr ?? e).slice(-400); }
  let up = false; for (let i = 0; i < 240 && !up; i++) { up = await fetch(`${BASE}/api/session`, { headers: { "x-actor": "user-A" } }).then((x) => x.status === 200, () => false); if (!up) await new Promise((res) => setTimeout(res, 500)); }
  if (!up) throw new Error(`the copy did not come back after the restart: ${said}`);
  await go(); await open();
  step("C4.11 L fail: Live greyed while the switch is off, with the reason", await dlg.locator('[data-qd-mode="live"] input').isDisabled() && /not open[\s\S]*approved first/.test(await dlg.locator('[data-qd-mode="live"]').innerText()));
  step("C4.11 S fail: neither way open: Nothing can start says why; Draft is off and points to it", /Nothing can start/.test(await dlg.locator("[data-qd-none]").innerText()) && await start().isDisabled() && (await start().getAttribute("aria-describedby")) === "qd-none");
  step("qa minor 1 (#506): when nothing can start, no way looks chosen and the button reads Draft", (await dlg.locator('[data-qd-mode] input:checked').count()) === 0 && (await start().innerText()).trim() === "Draft", await start().innerText());
  await state("nothing-can-start");
  step("no page error or console error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  for (const f of written) fs.rmSync(f, { force: true });
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); for (const f of written) fs.rmSync(f, { force: true }); process.exit(1); });
