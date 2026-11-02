// C4.11 part 1 walked like a content publisher in a real browser (forms lane, swarm builder B4b): on Work permit,
// family's Questionnaires tab, "Draft questions and documents" shows its seven steps, how each runs and US$0 before
// anything runs (AI now greyed with the reason); Draft runs them as one run on the shared run card, steps 2 and 5 read
// "Not available yet", the rules' findings or "All four rules pass" show, and Open To review lists the picks.
// axe on each state, 1024 px without sideways scroll. Rules only: NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c411b 4464 start STUDIO_SLOW_QD_STEP=400 && node studio/tests/check_forms_c411_draft_qd_browser.cjs 4464 xr_studio_forms_c411b
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4464), DB = process.argv[3] ?? "xr_studio_forms_c411b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
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
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const l = await api("/demo/load", { method: "POST", data: {} });
  if (l.status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const go = async () => { await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(); };

  await go();
  const btn = p.getByRole("button", { name: "Draft questions and documents" });
  step("C4.11 pass: the Questionnaires tab offers Draft questions and documents to the author", await btn.isVisible());
  await btn.click();
  const dlg = p.getByRole("dialog", { name: "Draft questions and documents" }); await dlg.waitFor();
  await dlg.locator("[data-qd-cost]").waitFor();
  step("C4.11 P pass: the plan shows the seven steps and US$0 before anything runs", /US\$0/.test(await dlg.locator("[data-qd-cost]").innerText()) && (await dlg.locator("[data-qd-steps] li").count()) === 7, await dlg.locator("[data-qd-cost]").innerText());
  step("C4.11 N pass: steps 2 and 5 say they are AI work (not run with rules only)", /AI work/.test(await dlg.locator('[data-qd-step="qd_conditions"]').innerText()) && /AI work/.test(await dlg.locator('[data-qd-step="qd_documents"]').innerText()));
  step("C4.11 L fail: AI now is greyed with the reason (the founder's live trial)", await dlg.locator('[data-qd-mode="live"] input').isDisabled() && /live trial/.test(await dlg.locator('[data-qd-mode="live"]').innerText()));
  step("C4.11 no system key shows in the plan", !KEYS.test(await dlg.locator("[data-qd-plan]").innerText()), (await dlg.locator("[data-qd-plan]").innerText()).match(KEYS)?.[0]);
  await state("plan-rules-only");
  // Review M1: the run card shows at once while the steps go on, and its Stop ends the run between steps.
  await dlg.getByRole("button", { name: "Draft", exact: true }).click();
  const stopBtn = dlg.getByRole("button", { name: /\bStop\b/ });
  await stopBtn.waitFor({ timeout: 10000 });
  step("C4.11 R pass (review M1): the run card with Stop shows in the dialog while the run goes on", await stopBtn.isEnabled());
  await stopBtn.click();
  await p.waitForFunction(() => /Stopped/.test(document.querySelector("[data-qd-result]")?.textContent ?? ""), null, { timeout: 30000 });
  await state("run-stopped");
  step("C4.11 R pass (review M1): Stop on screen ends the run; the card says Stopped", sql(`select status from ai_batch where operation='draft_questions_documents' order by started_at desc limit 1`) === "CANCELLED");
  step("C4.11 R fail: a stopped run shows no rules verdict (it did not check)", !(await dlg.locator("[data-qd-clean]").count()) && !(await dlg.locator("[data-qd-findings]").count()));
  await dlg.getByRole("button", { name: "Done" }).click();
  await btn.click(); await dlg.waitFor(); await dlg.locator("[data-qd-cost]").waitFor();
  await dlg.getByRole("button", { name: "Draft", exact: true }).click();
  await dlg.locator("[data-qd-result]").waitFor({ timeout: 60000 });
  await dlg.locator("[data-qd-note]").waitFor({ timeout: 30000 });
  await p.waitForFunction(() => /AI work/.test(document.querySelector("[data-qd-result]")?.textContent ?? ""), null, { timeout: 30000 });
  const res = await dlg.locator("[data-qd-result]").innerText();
  step("C4.11 R pass: the run shows on the run card in the dialog; steps 2 and 5 say they are AI work", /AI work/.test(res) && /Rules check the whole draft/.test(res), res.slice(0, 200));
  step("C4.11 K pass: on the sample the rules' check reads All four rules pass", await dlg.locator("[data-qd-clean]").isVisible());
  step("C4.11 pass: the picks are counted for To review", /\d+ items? for To review/.test(await dlg.locator("[data-qd-note]").innerText()), await dlg.locator("[data-qd-note]").innerText());
  await state("run-done");
  await dlg.getByRole("link", { name: "Open To review" }).click();
  await p.waitForURL(/\/review\/proposals/); await settle();
  // CI (#469): on a slow runner the list can render after settle(); wait for it (up to 15 s), then judge, with what showed.
  await p.waitForFunction(() => /pre-qualification/i.test(document.querySelector("main")?.innerText ?? ""), null, { timeout: 15000 }).catch(() => {});
  const landed = await p.locator("main").innerText();
  step("C4.11 pass: Open To review lands on this combination's items", /pre-qualification/i.test(landed), `${p.url()} — ${landed.slice(0, 300)}`);
  step("no page error or console error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
