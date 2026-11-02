// UX-A part 5 (P-273; UX baseline 2 Nov finding 3; amends P-116's visible reason line): always-on explanations become the
// tooltip and description of the greyed control, walked in a real browser on the demo sample. Pass: on Program structure
// a greyed Retire or Delete carries its reason as tooltip (hover and keyboard focus) and description, with no paragraph
// under the row; on Questionnaires a section that asks this person something has a greyed Remove whose reason is its
// tooltip and description; on Forms an attached form not set up says "Attached, not set up yet" with the explanation in a
// tip reachable by keyboard. Fail cases: none of the three long sentences is on the page's visible text; a greyed control
// does nothing when clicked; the details (Edit) still say the reason in words with each use. 1440, 1024 and 400 px;
// axe (WCAG 2.2 AA). Screenshots in product/screens/UX-A/screenshots/ (uxa5-*). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_uxa5 4445 start && node studio/tests/check_uxa5_tooltips_browser.cjs 4445 xr_studio_screens_uxa5
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4445), DB = process.argv[3] ?? "xr_studio_screens_uxa5";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "UX-A", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  UX-A5: ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
const visible = (p) => p.locator("main").innerText();

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the demo sample loads", (await api("/demo/load", { method: "POST", data: {} })).status < 300);
  const vv = sql("select id from combination where combination_key='vv.single'"), lm = sql("select id from combination where combination_key='wp.family'");
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  // Reached by the Tab key like a person (a tooltip opens on keyboard focus, not on a script's focus()).
  const tipOf = async (loc) => { await loc.evaluate((e) => { const all = [...document.querySelectorAll('button, a[href], input, select, [tabindex="0"]')].filter((x) => !x.hasAttribute("disabled")); const i = all.indexOf(e); (all[i - 1] ?? document.body).focus(); }); await p.keyboard.press("Tab"); const t = p.getByRole("tooltip"); await t.first().waitFor({ timeout: 4000 }).catch(() => undefined); const s = (await t.first().textContent().catch(() => "")) ?? ""; await p.keyboard.press("Escape").catch(() => undefined); return s; };

  // ------------------------------------------------------------------ Program structure: "Can't retire yet / Can't delete"
  await p.goto(`${BASE}/structure`); await p.locator("[data-row]").first().waitFor({ timeout: 20000 });
  const text = await visible(p);
  step("fail case: no \"Can't retire yet\" or \"Can't delete\" paragraph on the rows", !/Can't (retire yet|delete):/.test(text), text.match(/Can't (retire yet|delete):[^\n]{0,60}/)?.[0]);
  const greyed = p.locator('[data-row] [data-action][aria-disabled="true"]');
  step("setup: some row has a greyed action", await greyed.count() > 0, await greyed.count());
  const g = greyed.first(), gid = await g.getAttribute("aria-describedby");
  const desc = gid ? await p.locator(`[id="${gid}"]`).textContent() : "";
  step("pass: the greyed action's description says why in words (screen readers)", /^Can't (retire yet|delete)/.test(desc ?? ""), desc);
  const tip = await tipOf(g);
  step("pass: the same reason is its tooltip on keyboard focus", /^Can't (retire yet|delete)/.test(tip) && /details \(Edit\) list each use/.test(tip), tip);
  const panels = await p.locator("[data-impact-panel]").count();
  await g.click({ force: true });
  step("fail case: clicking the greyed action opens nothing", await p.locator("[data-impact-panel]").count() === panels);
  await p.locator(`[data-row]:has([id="${gid}"]) [data-edit]`).first().click();
  await p.locator("[data-blocked-line]").first().waitFor({ timeout: 10000 }).catch(() => undefined);
  step("pass: the details (Edit) say the reason in words, with each use", /^Can't (retire yet|delete)/.test((await p.locator("[data-blocked-line]").first().textContent().catch(() => "")) ?? ""));
  await axe("Program structure");
  await p.screenshot({ path: path.join(SHOTS, "uxa5-01-structure-1440.png"), fullPage: false });

  // ------------------------------------------------------------------ Questionnaires: "Remove from questionnaire: not here…"
  await p.goto(`${BASE}/c/${lm}/questionnaires`); await p.locator("[data-role-chip]").first().waitFor({ timeout: 20000 });
  const qtext = await visible(p);
  step("fail case: no \"Remove from questionnaire: not here\" paragraph on the sections", !/Remove from questionnaire: not here/.test(qtext) && !/placed in it in the shared library and stays? asked/.test(qtext));
  const rb = p.locator("[data-remove-blocked]").first();
  step("pass: a section that asks this person something has a greyed Remove", await rb.count() === 1 && (await rb.getAttribute("aria-disabled")) === "true");
  const rid = await rb.getAttribute("aria-describedby");
  step("pass: its description and tooltip say why", /placed in it in the shared library/.test((await p.locator(`[id="${rid}"]`).textContent()) ?? "") && /placed in it in the shared library/.test(await tipOf(rb)));
  await rb.click({ force: true });
  step("fail case: clicking the greyed Remove opens no dialog", await p.getByRole("dialog").count() === 0);
  await axe("Questionnaires");
  await p.screenshot({ path: path.join(SHOTS, "uxa5-02-questionnaires-1440.png"), fullPage: false });

  // ------------------------------------------------------------------ Forms: "Attached from the Form library…"
  await p.goto(`${BASE}/c/${vv}/forms`); await p.locator("[data-pending]").first().waitFor({ timeout: 20000 });
  const ftext = await visible(p);
  step("fail case: no \"Attached from the Form library: not set up as a line yet…\" sentence on the rows", !/Attached from the Form library: not set up/.test(ftext));
  const why = p.locator("[data-pending-why] button").first();
  step("pass: the row says \"Attached, not set up yet\"", (await p.locator("[data-pending-why]").first().innerText()).trim() === "Attached, not set up yet");
  step("pass: the explanation is a tip reachable by keyboard", /not set up as a line yet/.test(await tipOf(why)));
  await axe("Forms");
  await p.screenshot({ path: path.join(SHOTS, "uxa5-03-forms-1440.png"), fullPage: false });

  // ------------------------------------------------------------------ widths
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h });
    for (const [url, name, ready] of [[`/c/${lm}/questionnaires`, "questionnaires", "[data-role-chip]"], [`/c/${vv}/forms`, "forms", "[data-pending]"]]) {
      await p.goto(`${BASE}${url}`); await p.locator(ready).first().waitFor({ timeout: 20000 });
      const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      step(`${w} px ${name}: no sideways page scroll; the long sentences stay off the page`, side <= 0 && !/Remove from questionnaire: not here|Attached from the Form library: not set up/.test(await visible(p)), side);
      await p.screenshot({ path: path.join(SHOTS, `uxa5-04-${name}-${w}.png`), fullPage: false });
    }
    await p.goto(`${BASE}/structure`); await p.locator("[data-row]").first().waitFor({ timeout: 20000 });
    step(`${w} px structure: no reason paragraph under the rows (the rows' own width is finding 9's)`, !/Can't (retire yet|delete):/.test(await visible(p)));
  }

  step("no page error or console error on the walk", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
