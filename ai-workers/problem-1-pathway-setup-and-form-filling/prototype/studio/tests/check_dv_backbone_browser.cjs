// Outside review (Devin, 29 Oct; history/devin/2026-10-29-devin-backbone.md), the runtime lane's two items, walked in a
// real browser: DV-bb-3, "Add a form from the library" names only a control that is there (no "Upload … below" when
// nothing is below: it links to the Form library, where forms are uploaded); DV-bb-6a, the workspace header and the
// sample combinations say "Child", the built-in person role's label (P-108), never "Dependent child". US$0.
//   zsh studio/tools/isolated.sh runtime_dvbb 4433 start && node studio/tests/check_dv_backbone_browser.cjs 4433 xr_studio_runtime_dvbb
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4433), DB = process.argv[3] ?? "xr_studio_runtime_dvbb";
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const vv = sql("select id from combination where combination_key='vv.single'"), wp = sql("select id from combination where combination_key='wp.family'");

  // ======================================================== DV-bb-6a: the role's own label
  const labels = sql("select string_agg(distinct p->>'label', ',') from combination c, jsonb_array_elements(c.participants) p where p->>'role' = 'child'");
  step("C11.12 DV-bb-6a pass: the sample combinations call the child role \"Child\", the shared library's label (a label typed on purpose, \"Child (travelling)\", is kept, L7)", labels.split(",").every((x) => /^Child\b/.test(x)) && labels.split(",").includes("Child"), labels);
  step("C11.12 DV-bb-6a fail: no combination says \"Dependent child\"", sql("select count(*) from combination c, jsonb_array_elements(c.participants) p where p->>'label' = 'Dependent child'") === "0");
  await p.goto(`${BASE}/c/${wp}`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  await p.waitForTimeout(500);
  const head = await p.locator("main").innerText();
  step("C11.12 DV-bb-6a pass: the workspace header lists the people as the library names them (Child)", /\bChild\b/.test(head), head.split("\n").slice(0, 6).join(" | "));
  step("C11.12 DV-bb-6a fail: and never \"Dependent child\"", !/Dependent child/.test(head));

  // ======================================================== DV-bb-3: the words name a control that is there
  await p.goto(`${BASE}/c/${vv}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  await p.getByRole("button", { name: "Add a form from the library" }).click();
  const panel = p.getByRole("dialog", { name: "Add a form from the library" }); await panel.waitFor();
  await panel.getByLabel("Search forms in the library").fill("zzz-no-such-form"); await p.waitForTimeout(600);
  const empty = panel.locator("[data-picker-empty]");
  const text = await empty.innerText().catch(() => "");
  const link = empty.getByRole("link", { name: "upload it in the Form library" });
  step("C11.15 DV-bb-3 pass: with no match, the picker says a new form enters the library first and links to the Form library", /No form in the library matches/.test(text) && await link.count() === 1 && (await link.getAttribute("href")) === "/library/forms", text);
  step("C11.15 DV-bb-3 fail: it never says to upload \"below\" (there is no upload in this panel)", !/below/i.test(text) && await panel.locator('input[type="file"]').count() === 0, text);
  await link.click(); await p.waitForURL(/\/library\/forms$/, { timeout: 10000 }).catch(() => {});
  step("C11.15 DV-bb-3: the link opens the Form library, which has the upload", /\/library\/forms$/.test(p.url()) && await p.getByRole("button", { name: "Upload PDF" }).count() === 1, p.url());

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
