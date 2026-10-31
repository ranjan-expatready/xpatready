// C1.8 copies per form line (screens, F1) walked in a real browser: the line drawer's Copies field, a refused value
// shown on the field and cleared when it is edited, the saved count on the Forms tab row, Undo back to one copy, and a
// line with one copy says nothing. Screenshots at 1440 px into product/screens/F1-setup/screenshots/c18/, axe (WCAG 2.2
// AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c18 4441 start && node studio/tests/check_c18_copies_browser.cjs 4441 xr_studio_screens_c18
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4441), DB = process.argv[3] ?? "xr_studio_screens_c18";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "F1-setup", "screenshots", "c18"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  // The Mac runner uses its installed Chrome; elsewhere the pre-installed Chromium.
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  // Fails loudly when the page never settles (no silent wait).
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(200); };
  let n = 0;
  const state = async (name) => {
    n++; await settle();
    await p.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${name}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", { method: "POST" })).status === 201);
  const vv = sql("select id from combination where combination_key='wp.family'");
  const F = "IMM 1295";
  sql(`update combination_form set copies = 1 where combination_id='${vv}'`);
  await p.goto(`${BASE}/c/${vv}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  const row = p.locator(`[data-line="${F}"]`);
  await row.waitFor({ timeout: 15000 });
  step("C1.8 pass: a line with one copy says nothing about copies on its row", (await row.locator("[data-copies]").count()) === 0);

  await row.getByRole("button", { name: `Change ${F}` }).click();
  const drawer = p.getByRole("dialog");
  const copies = drawer.getByLabel("Copies");
  await copies.waitFor({ timeout: 10000 });
  step("C1.8 pass: the line drawer offers Copies, 1 by default, with its meaning under it", (await copies.inputValue()) === "1" && /for each person it names, 1 to 9/.test(await drawer.innerText()));
  await copies.fill("0");
  await drawer.getByRole("button", { name: "Save to draft" }).click();
  await drawer.getByText("Copies is a whole number from 1 to 9.").waitFor({ timeout: 10000 });
  step("C1.8 fail: 0 copies is refused on the field with the fix in words, the drawer stays open", await copies.getAttribute("aria-invalid") === "true");
  await state("copies-refused-on-field");
  await copies.fill("2");
  step("C1.8: editing the field clears its error", (await drawer.getByText("Copies is a whole number from 1 to 9.").count()) === 0);
  await copies.fill("2x5");
  step("C1.8: the field keeps one digit only", (await copies.inputValue()) === "2");
  await drawer.getByRole("button", { name: "Save to draft" }).click();
  await drawer.waitFor({ state: "hidden", timeout: 15000 }); await settle();
  await row.locator("[data-copies]").waitFor({ timeout: 15000 });
  step("C1.8 pass: the row says '2 copies each' after the save", /2 copies each/.test(await row.locator("[data-copies]").innerText()));
  step("C1.8 pass: the database holds 2 copies on the draft line", sql(`select copies from combination_form where combination_id='${vv}' and lineage_key='${F}' order by version desc limit 1`) === "2");
  await state("row-shows-two-copies");

  await p.getByRole("button", { name: /^Undo/ }).first().click();
  await row.locator("[data-copies]").waitFor({ state: "detached", timeout: 15000 });
  step("C1.8 pass: Undo puts the line back to one copy and the row is quiet again", (await row.locator("[data-copies]").count()) === 0);

  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
