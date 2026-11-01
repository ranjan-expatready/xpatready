// C11.10 (P-115): the Cards / List choice on Immigration programs is remembered per person on the server
// (PATCH /session/preferences, GET /session `preferences`), so it follows the person to another browser, never to another
// person, and survives a demo Reset (it is the person's, not configuration). Unknown views and keys are refused in words;
// nobody (no known person) cannot save. The address's `v` still wins for a shared link. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c1110 4449 start && node studio/tests/check_c1110_view_per_person_browser.cjs 4449 xr_studio_screens_c1110
const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4449), DB = process.argv[3] ?? "xr_studio_screens_c1110";
const BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql"].find((p) => fs.existsSync(p)) ?? "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const api = async (p, { method = "GET", actor = "user-A", data } = {}) => {
  const h = { "content-type": "application/json" }; if (actor) h["x-actor"] = actor;
  const r = await fetch(`${BASE}/api${p}`, { method, headers: h, body: data === undefined ? undefined : JSON.stringify(data) });
  const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b };
};
const said = (r) => r.body?.detail ?? r.body?.message ?? "";
const TECH = /zod|undefined|null\b|\[object|enum|invalid_/i;

(async () => {
  const served = (await api("/session")).body?.workspace?.id;
  if (!served || sql(`select count(*) from workspace where id='${served}'`) !== "1") { console.error(`STOP  ${DB} is not the database of :${PORT}`); process.exit(2); }
  sql("delete from person_preference where actor in ('user-A','user-B')");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await api("/demo/load", { method: "POST", data: { sample: "six" } });

  // ------------------------------------------------------------------ API
  let r = await api("/session");
  step("C11.10: with no choice saved, the session carries no view (the page shows Cards)", r.status === 200 && !r.body?.preferences?.programsView, r.body?.preferences);
  r = await api("/session/preferences", { method: "PATCH", data: { programsView: "list" } });
  step("C11.10 pass: a person's List choice is saved for them", r.status === 200 && r.body?.programsView === "list", r.body);
  step("C11.10 pass: GET /session gives it back to that person", (await api("/session")).body?.preferences?.programsView === "list");
  step("C11.10 fail: another person does not get it", !(await api("/session", { actor: "user-B" })).body?.preferences?.programsView);
  r = await api("/session/preferences", { method: "PATCH", data: { programsView: "table" } });
  step("C11.10 fail: an unknown view is refused (400) in words, and the saved one stays", r.status === 400 && /Cards or List/.test(JSON.stringify(r.body)) && !TECH.test(said(r)) && (await api("/session")).body?.preferences?.programsView === "list", { status: r.status, said: said(r) });
  r = await api("/session/preferences", { method: "PATCH", data: { colour: "blue" } });
  step("C11.10 fail: an unknown preference is refused (400), nothing stored", r.status === 400 && sql("select count(*) from person_preference where key='colour'") === "0", r.status);
  r = await api("/session/preferences", { method: "PATCH", data: {} });
  step("C11.10 fail: an empty request is refused (400) in words", r.status === 400 && said(r).length > 0, said(r));
  r = await api("/session/preferences", { method: "PATCH", actor: null, data: { programsView: "cards" } });
  step("C11.10 fail: nobody (no known person) cannot save a choice (401)", r.status === 401, r.status);
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("C11.10: the choice is the person's, not configuration: it stays after a demo Reset", (await api("/session")).body?.preferences?.programsView === "list");
  await api("/demo/load", { method: "POST", data: { sample: "six" } });

  // ------------------------------------------------------------------ browser: it follows the person to a fresh browser
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const fresh = async (actor) => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await p.goto(BASE); await p.evaluate((x) => localStorage.setItem("xr-actor", x), actor); return p; };
  const shown = async (p, qs = "") => { await p.goto(`${BASE}/${qs}`); await p.locator("[data-view]").first().waitFor({ timeout: 30000 }); await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30000 }); await p.waitForTimeout(800); return p.locator("[data-view]").first().getAttribute("data-view"); };
  let p = await fresh("user-A");
  step("C11.10 pass: in a fresh browser (nothing kept locally) the author sees List, their saved choice", (await shown(p)) === "list");
  step("C11.10: the address's v still wins for a shared link", (await shown(p, "?v=cards")) === "cards");
  await p.context().close();
  p = await fresh("user-B");
  step("C11.10 fail: another person in a fresh browser sees Cards", (await shown(p)) === "cards");
  const sw = p.getByRole("group", { name: "Show as" }).getByRole("button", { name: "List" });
  await sw.click();
  for (let i = 0; i < 20 && sql("select value from person_preference where actor='user-B' and key='programsView'") !== "list"; i++) await p.waitForTimeout(250);
  step("C11.10 pass: switching to List on the page saves it for that person on the server", sql("select value from person_preference where actor='user-B' and key='programsView'") === "list");
  await p.context().close();
  p = await fresh("user-B");
  step("C11.10 pass: and their next fresh browser opens on List", (await shown(p)) === "list");
  await p.context().close();
  await b.close();
  sql("delete from person_preference where actor in ('user-A','user-B')");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e.message); process.exit(1); });
