// C1.6 on the combination page (screens, F1; Screen 03 concept: the facts line names the filing method), walked in a real
// browser: the header says "filing: …" in the same words as the Forms tab and the summary API, it changes when a line's
// channel changes, and a combination with no filed form says nothing about filing. axe (WCAG 2.2 AA) on the header. No
// model call (US$0).
//   zsh studio/tools/isolated.sh screens_c16 4445 start && node studio/tests/check_c16_header_browser.cjs 4445 xr_studio_screens_c16
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4445), DB = process.argv[3] ?? "xr_studio_screens_c16";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "F1-setup", "screenshots", "c16"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", { method: "POST" })).status === 201);
  const facts = async (id) => {
    await p.goto(`${BASE}/c/${id}`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
    await p.waitForFunction(() => /people:/.test(document.querySelector("main")?.innerText ?? ""), null, { timeout: 15000 });
    return (await p.locator("main").innerText()).split("\n").find((l) => /people:/.test(l)) ?? "";
  };

  const wp = sql("select id from combination where combination_key='wp.family'");
  let sum = (await api(`/combinations/${wp}/summary`)).body;
  let line = await facts(wp);
  await p.waitForFunction(() => /filing:/.test(document.querySelector("main")?.innerText ?? ""), null, { timeout: 15000 });
  line = (await p.locator("main").innerText()).split("\n").find((l) => /people:/.test(l)) ?? "";
  step("C1.6 pass: the header names the filing method in the summary's words, before the people", line.includes(`filing: ${sum.filing}`) && /PDF only/.test(sum.filing) && line.indexOf("filing:") < line.indexOf("people:"), `${sum.filing} in "${line}"`);
  await p.screenshot({ path: path.join(SHOTS, "01-header-filing-pdf-only-1440.png"), clip: { x: 0, y: 0, width: 1440, height: 260 } });
  const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  step("axe: the combination page has no WCAG A/AA violation", r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  await p.getByRole("tab", { name: "Forms" }).click();
  await p.locator("[data-filing]").waitFor();
  step("C1.6 pass: the Forms tab says the same filing words", (await p.locator("[data-filing]").innerText()).includes(sum.filing));

  // One line filed online: the application is mixed (database write, as the channel route is the forms area's and not under test).
  const original = sql(`select string_agg(id || ':' || channel || ':' || signature, ',') from combination_form where combination_id='${wp}' and status <> 'RETIRED'`);
  sql(`update combination_form set channel='ONLINE', signature='NONE' where combination_id='${wp}' and lineage_key='IMM 1295' and status <> 'RETIRED'`);
  sum = (await api(`/combinations/${wp}/summary`)).body;
  line = await facts(wp);
  await p.waitForFunction((w) => (document.querySelector("main")?.innerText ?? "").includes(w), `filing: ${sum.filing}`, { timeout: 15000 });
  line = (await p.locator("main").innerText()).split("\n").find((l) => /people:/.test(l)) ?? "";
  step("C1.6 pass: with one line online the header says the mixed filing method", /Mixed/.test(sum.filing) && line.includes(`filing: ${sum.filing}`), `${sum.filing} in "${line}"`);
  await p.screenshot({ path: path.join(SHOTS, "02-header-filing-mixed-1440.png"), clip: { x: 0, y: 0, width: 1440, height: 260 } });

  // Review c16 m1: every filed line marked Not needed is not "filing" at all.
  const before = sql(`select string_agg(id || ':' || channel || ':' || signature, ',') from combination_form where combination_id='${wp}' and status <> 'RETIRED'`);
  sql(`update combination_form set channel='NOT_NEEDED', signature='NONE' where combination_id='${wp}' and status <> 'RETIRED' and gov_form_def_id in (select id from gov_form_def where form_kind <> 'document')`);
  line = await facts(wp);
  await p.waitForFunction(() => /people:/.test(document.querySelector("main")?.innerText ?? ""), null, { timeout: 15000 });
  step("C1.6 fail: with every form marked Not needed the header says nothing about filing", !/filing:/.test(line), line);
  // Put every line back as it was, so the check can run again on the same copy (review c16 m2).
  for (const x of before.split(",")) { const [id, ch, sig] = x.split(":"); sql(`update combination_form set channel='${ch}', signature='${sig}' where id='${id}'`); }
  step("setup: the lines are back as they were", sql(`select string_agg(id || ':' || channel || ':' || signature, ',') from combination_form where combination_id='${wp}' and status <> 'RETIRED'`) === before);

  const vv = sql("select id from combination where combination_key='vv.single'");
  step("setup: vv.single has no form lines", sql(`select count(*) from combination_form where combination_id='${vv}'`) === "0");
  line = await facts(vv);
  step("C1.6 fail: a combination with no filed form says nothing about filing (never a guess)", line.length > 0 && !/filing:/.test(line), line);

  for (const x of original.split(",")) { const [id, ch, sig] = x.split(":"); sql(`update combination_form set channel='${ch}', signature='${sig}' where id='${id}'`); }
  step("setup: IMM 1295 is filed as it was before the check (it can run again)", sql(`select string_agg(id || ':' || channel || ':' || signature, ',') from combination_form where combination_id='${wp}' and status <> 'RETIRED'`) === original);
  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
