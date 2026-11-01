// C4.7 walked like a content publisher in a real browser (forms lane, swarm builder B4): on Work permit, family's
// Questionnaires tab, the Pre-qualification view offers "Draft pre-qualification picks"; the plan shows its steps and
// US$0 before anything runs, AI now is greyed while the live switch is off; the picks go to To review, read in words
// with their reason; Open › Accept ticks the question, and the Pre-qualification count goes up. axe on each state,
// 1024 px without sideways scroll. Rules only: NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c47b 4462 start && node studio/tests/check_forms_c47_pqr_picks_browser.cjs 4462 xr_studio_forms_c47b
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4462), DB = process.argv[3] ?? "xr_studio_forms_c47b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "c47"); fs.mkdirSync(SHOTS, { recursive: true });
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
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin") && !document.querySelector("[data-pqr-set] .animate-pulse"), null, { timeout: 30000 }); await p.waitForTimeout(300); };
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
  const chip = () => p.locator('[data-source-chip="pqr"]');

  await go(); await chip().click(); await settle();
  const btn = p.getByRole("button", { name: "Draft pre-qualification picks" });
  step("C4.7 pass: the Pre-qualification view offers Draft pre-qualification picks to the author", await btn.isVisible());
  await btn.click();
  const dlg = p.getByRole("dialog", { name: "Draft pre-qualification picks" }); await dlg.waitFor();
  await dlg.locator("[data-pqr-cost]").waitFor();
  step("C4.7 P pass: the plan shows its steps and US$0 before anything runs", /US\$0/.test(await dlg.locator("[data-pqr-cost]").innerText()) && (await dlg.locator("ol li").count()) >= 2, await dlg.locator("[data-pqr-cost]").innerText());
  step("C4.7 L fail: AI now is greyed while the live switch is off, with the reason", await dlg.locator('[data-pqr-mode="live"] input').isDisabled() && /not approved yet/.test(await dlg.locator('[data-pqr-mode="live"]').innerText()));
  await state("plan-rules-only");
  await dlg.locator('[data-pqr-mode="replay"] input').check(); await dlg.locator("[data-pqr-cost]").waitFor();
  step("C4.7 replay pass: saved AI answers name the guide they read", /Reads Guide 5487/.test(await dlg.innerText()));
  await dlg.getByRole("button", { name: "Draft" }).click(); await dlg.locator("[data-pqr-result]").waitFor();
  step("C4.7 replay fail: with no saved AI answer it says so in words and proposes nothing", /No saved AI answer/.test(await dlg.locator("[data-pqr-result]").innerText()) && !(await dlg.locator("[data-pqr-open-review]").count()));
  await state("replay-none-saved");
  await dlg.getByRole("button", { name: "Done" }).click();
  await btn.click(); await dlg.waitFor(); await dlg.locator("[data-pqr-cost]").waitFor();
  await dlg.getByRole("button", { name: "Draft" }).click(); await dlg.locator("[data-pqr-counts]").waitFor();
  step("C4.7 pass: rules only proposes picks for To review, with the counts per band", /Check \d+/.test(await dlg.locator("[data-pqr-counts]").innerText()), await dlg.locator("[data-pqr-counts]").innerText());
  await state("rules-result");
  await dlg.locator("[data-pqr-open-review]").click();
  await p.waitForURL(/\/review\/proposals\?group=combination/); await p.locator("[data-band]").first().waitFor(); await settle();
  const rows = p.locator('[data-band="check"] tbody tr');
  const titles = await rows.locator("td:nth-child(2) .font-medium").allInnerTexts();
  step("C4.7 To review pass: each pick reads \"Ask in pre-qualification: … (person)\" with its reason", titles.length > 0 && titles.every((t) => /^Ask in pre-qualification: .+ \(.+\)$/.test(t)), titles.slice(0, 3).join(" | "));
  step("C4.7 To review fail: no field or role key is shown to a person", titles.every((t) => !KEYS.test(t) && !/\bprincipal\b/.test(t)));
  await state("to-review-picks");
  const first = titles[0];
  await rows.first().getByRole("button", { name: `Open ${first}` }).click();
  const side = p.getByRole("dialog"); await side.waitFor(); await settle();
  await state("pick-side-panel");
  await side.getByRole("button", { name: "Accept", exact: true }).click();
  await p.waitForFunction((t) => ![...document.querySelectorAll('[data-band="check"] tbody tr td:nth-child(2) .font-medium')].some((x) => x.textContent === t), first, { timeout: 30000 });
  step("C4.7 Q1 pass: Accept ticks the question as a draft, origin AI or rules (never typed)", sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification and status='DRAFT'`) === "1");
  await go();
  step("C4.7 Q1 pass: back on the Questionnaires tab, Pre-qualification counts 1", /Pre-qualification 1/.test(await chip().innerText()), await chip().innerText());
  step("no page error or console error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
