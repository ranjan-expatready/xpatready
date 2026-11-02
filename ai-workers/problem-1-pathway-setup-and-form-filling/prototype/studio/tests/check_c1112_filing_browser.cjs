// C11.12 filing modes, PR 3 (P-233; board r2): the Filing column walked in a real browser on the Visitor visa sample.
// Keyboard only: choose a filing, see the Guide 5256 warning and "What a case gets" change before Save, save, reload,
// Undo; the editor never drops a mode (BR-8: Save, Undo, "Use these lines", Add person); a role with no mode shows
// "Filing not set"; axe (WCAG 2.2 AA); 375 px and 200 % zoom with no sideways scroll. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c1112b 4444 start && node studio/tests/check_c1112_filing_browser.cjs 4444 xr_studio_screens_c1112b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4444), DB = process.argv[3] ?? "xr_studio_screens_c1112b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "C11.12-filing-modes", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", { method: "POST" })).status === 201);
  const id = sql("select id from combination where combination_key='vv.single'");
  const modeOf = (role) => sql(`select x->>'filingMode' from combination c, jsonb_array_elements(c.participants) x where c.id='${id}' and x->>'role'='${role}'`);
  const who = p.locator("[data-who-can-be]");
  const open = async () => {
    await p.goto(`${BASE}/c/${id}/forms`);
    await who.waitFor({ timeout: 20000 });
    const show = who.getByRole("button", { name: /^Show/ });
    if (await show.count()) await show.click();
    await who.locator("[data-person]").first().waitFor();
  };
  await open();
  const cell = (role) => who.locator(`[data-person="${role}"] [data-label="Filing"]`);
  step("C11.12 pass: the read view says each person's filing in words (Visitor visa sample: everyone files their own)", /Files own application/.test(await cell("child").innerText()) && /Files nothing/.test(await cell("representative").innerText()), await cell("child").innerText());
  step("C11.12 pass: the principal says 'Always, for the principal'; Fees words never show CAD 0", /Always, for the principal/.test(await cell("principal").innerText()) && !/CAD 0\b/.test(await who.innerText()));
  const gets0 = await who.locator("[data-gets]").innerText();
  step("C11.12 pass: What a case gets: one filing per person in one submission", /filings in one submission/.test(gets0), gets0);
  await p.screenshot({ path: path.join(SHOTS, "01-read-view-1440.png") });

  // Edit by keyboard: focus Edit, Enter, Tab to the child's Filing select, choose "On the principal's application".
  await who.getByRole("button", { name: "Edit" }).focus(); await p.keyboard.press("Enter");
  const sel = who.getByLabel(/^Filing for Child/);
  await sel.focus();
  await sel.selectOption("on_principal");
  const warn = await who.locator('[data-person="child"] [data-filing-warning]').innerText().catch(() => "");
  step("C11.12 BR-7 pass: the Guide 5256 warning shows before Save, and says it can still be saved", /Guide 5256 says family members complete their own application forms/.test(warn) && /You can still save/.test(warn), warn);
  const gets1 = await who.locator("[data-gets]").innerText();
  step("C11.12 pass: What a case gets follows the edit before Save (the child joins the principal's filing)", gets1 !== gets0 && (await who.locator('[data-preview-filing="family"]').count()) === 1, gets1);
  await p.screenshot({ path: path.join(SHOTS, "02-editing-warning-1440.png") });
  const axe = await new AxeBuilder({ page: p }).include("[data-who-can-be]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  step("axe: the editing table and the preview have no WCAG A/AA violation", axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  await who.getByRole("button", { name: "Save" }).click();
  await p.waitForFunction(() => !document.querySelector("[data-who-can-be] select"), null, { timeout: 15000 });
  step("C11.12 BR-8 pass: Save stores the child's mode and keeps every other line's", modeOf("child") === "on_principal" && modeOf("spouse_or_partner") === "files_own", `${modeOf("child")} / ${modeOf("spouse_or_partner")}`);
  await open();
  step("C11.12 pass: after a reload the child reads On the principal's application, with the warning", /On the principal's application/.test(await cell("child").innerText()) && /Guide 5256/.test(await cell("child").innerText()));

  // Undo, then Add person after a remove: the mode comes back with the line.
  await who.getByRole("button", { name: /Undo last change/ }).click();
  await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 }); await p.waitForTimeout(800);
  step("C11.12 BR-8 pass: Undo restores the child's earlier mode (Files own)", modeOf("child") === "files_own", modeOf("child"));
  await open();
  await who.getByRole("button", { name: "Edit" }).click();
  await who.getByLabel(/^Filing for Spouse/).selectOption("declared_only");
  await who.getByRole("button", { name: /^Remove Child/ }).click();
  await who.getByLabel("Person to add").selectOption("child");
  await who.getByRole("button", { name: "Add a person" }).click();
  await who.getByRole("button", { name: "Save" }).click();
  const confirm = p.getByRole("button", { name: "Save anyway" }); if (await confirm.count()) await confirm.click();
  await p.waitForTimeout(1200);
  step("C11.12 BR-8 pass: a role removed and added back in the same edit keeps its saved mode; the edited one is stored", modeOf("spouse_or_partner") === "declared_only" && modeOf("child") === "files_own", `${modeOf("spouse_or_partner")} / ${modeOf("child")}`);

  // A role with no mode: "Filing not set" on the line (BR-7, and the release waits for it).
  sql(`update combination set participants = (select jsonb_agg(case when x->>'role'='child' then x - 'filingMode' else x end) from jsonb_array_elements(participants) x) where id='${id}'`);
  await open();
  step("C11.12 BR-7 fail: a role with no mode reads 'Filing not set'", /Filing not set/.test(await cell("child").innerText()), await cell("child").innerText());
  await p.screenshot({ path: path.join(SHOTS, "03-filing-not-set-1440.png") });

  // 375 px and 200 % zoom: no sideways scroll on the page.
  for (const [w, h, z, name] of [[375, 812, 1, "375"], [720, 900, 2, "200pct"]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.evaluate((zz) => { document.documentElement.style.zoom = String(zz); }, z);
    await p.waitForTimeout(300);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    step(`C11.12 pass (${name}): no sideways scroll`, over <= 1, over);
    await p.screenshot({ path: path.join(SHOTS, `04-${name}.png`), fullPage: false });
    await p.evaluate(() => { document.documentElement.style.zoom = "1"; });
  }
  step("no console errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
