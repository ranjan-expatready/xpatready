// UX-A part 4 (P-273; UX baseline 2 Nov finding 4; EXPERIENCE §5): internal identifiers are behind a collapsed "Details
// (for admins)" disclosure, walked in a real browser on the demo sample. Pass: the Fields list and a field's page name it,
// with its key only under Details; the Draft with AI dialog names saved AI answers by form and date and keeps the job, the
// run file and the budget lines under Details. Fail cases: no field key, model name, run file name, job id or budget line
// is on the main path of these screens; Details is closed until opened and opens by keyboard. 1440, 1024 and 400 px without
// sideways page scroll; axe (WCAG 2.2 AA). Screenshots in product/screens/UX-A/screenshots/ (uxa4-*). Nothing is started:
// the dialog is opened and closed (US$0).
//   zsh studio/tools/isolated.sh screens_uxa4 4446 start && node studio/tests/check_uxa4_details_browser.cjs 4446 xr_studio_screens_uxa4
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_uxa4";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "UX-A", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  UX-A4: ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
// A field key ("case.application_date", "person.passport_number"), a run file ("…-live-20261021t060247723z"), a job id
// ("studio-fieldmap-imm5257e"), a model name, a budget line.
const KEY = /\b(case|person|principal|spouse|child|employer|representative|app)\.[a-z0-9_]+(\.[a-z0-9_]+)*\b/;
const INTERNAL = /\d{8}t\d{6,}z|studio-fieldmap|\bOpus\b|claude-|\bWave 1\b|experiment cap|\.json\b/i;

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the demo sample loads", (await api("/demo/load", { method: "POST", data: {} })).status < 300);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const axe = async (name, sel = "main") => { const r = await new AxeBuilder({ page: p }).include(sel).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  // The main path: the page's text without what sits under Details (closed or open).
  const mainPath = (sel) => p.locator(sel).evaluate((el) => { const c = el.cloneNode(true); c.querySelectorAll("[data-admin-details]").forEach((d) => d.remove()); return c.innerText ?? c.textContent; });

  // ------------------------------------------------------------------ Fields list and a field's page
  await p.goto(`${BASE}/library/fields`); await p.locator("tr[data-item]").first().waitFor({ timeout: 20000 });
  const list = await mainPath("main");
  step("fail case: the Fields list shows no field key on any row (names and meanings only)", !KEY.test(list), list.match(KEY)?.[0]);
  await axe("Fields list");
  await p.screenshot({ path: path.join(SHOTS, "uxa4-01-fields-1440.png"), fullPage: false });
  const key = await p.locator("tr[data-item]").first().getAttribute("data-item");
  await p.locator("tr[data-item]").first().getByRole("link").click();
  await p.locator("h1").waitFor();
  const page = await mainPath("main");
  step("pass: the field's page is named by its name and meaning, its key not on the main path", !page.includes(key) && !KEY.test(page), { key, hit: page.match(KEY)?.[0] });
  const det = p.locator("main [data-admin-details]").first();
  step("pass: Details (for admins) is there and closed", await det.count() === 1 && !(await det.evaluate((d) => d.open)));
  await det.locator("summary").focus(); await p.keyboard.press("Enter");
  step("pass: Details opens by keyboard and shows the field's key", await det.evaluate((d) => d.open) && (await det.innerText()).includes(key), await det.innerText());
  await axe("a field's page (Details open)");
  await p.screenshot({ path: path.join(SHOTS, "uxa4-02-field-details-open-1440.png"), fullPage: false });

  // ------------------------------------------------------------------ the Draft with AI dialog (opened, never started)
  await p.goto(`${BASE}/c/${vv}/forms`); await p.locator("[data-filing]").waitFor({ timeout: 20000 });
  const draft = p.getByRole("button", { name: /^Draft with AI/ }).first();
  step("setup: Visitor visa offers Draft with AI on a form", await draft.count() > 0);
  const jobs0 = sql(`select count(*) from drafting_job where combination_id='${vv}'`);
  await draft.click();
  const dlg = p.getByRole("dialog");
  await dlg.waitFor();
  await p.waitForFunction(() => !!document.querySelector('[role="dialog"] [data-options-loaded="true"]') || !!document.querySelector('[role="dialog"] [data-draft-start]'), null, { timeout: 20000 });
  await p.waitForTimeout(800);
  const said = await mainPath('[role="dialog"]');
  step("fail case: the dialog's main path has no model name, run file, job id or budget line", !INTERNAL.test(said), said.match(INTERNAL)?.[0]);
  const options = await dlg.locator("select option").allInnerTexts();
  step("pass: each saved AI answer is named by its form and date (\"IMM 5257 · saved …\")", options.length > 0 && options.every((o) => /^IMM \d{4}[A-Z0-9 ]* · saved /.test(o) && !INTERNAL.test(o)), options);
  const ddet = dlg.locator("[data-admin-details]");
  step("pass: the dialog's Details is closed and holds the job and the spending lines", await ddet.count() === 1 && !(await ddet.evaluate((d) => d.open)) && /Job/.test(await ddet.textContent()) && /experiment cap/.test(await ddet.textContent()), await ddet.textContent());
  await axe("the Draft with AI dialog", '[role="dialog"]');
  await p.screenshot({ path: path.join(SHOTS, "uxa4-03-draft-dialog-1440.png"), fullPage: false });
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
    const box = await dlg.boundingBox();
    const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`${w} px: the dialog fits the window, no sideways page scroll`, !!box && box.x >= 0 && box.x + box.width <= w + 1 && side <= 0, { box, side });
    await p.screenshot({ path: path.join(SHOTS, `uxa4-04-draft-dialog-${w}.png`), fullPage: false });
  }
  await p.keyboard.press("Escape");
  await p.setViewportSize({ width: 1440, height: 900 });
  step("nothing was started: opening and closing the dialog created no AI job", sql(`select count(*) from drafting_job where combination_id='${vv}'`) === jobs0);

  // ------------------------------------------------------------------ widths: the Fields list
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h }); await p.goto(`${BASE}/library/fields`); await p.locator("tr[data-item]").first().waitFor({ timeout: 20000 });
    step(`${w} px Fields list: still no field key on the main path`, !KEY.test(await mainPath("main")));
  }

  step("no page error or console error on the walk", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
