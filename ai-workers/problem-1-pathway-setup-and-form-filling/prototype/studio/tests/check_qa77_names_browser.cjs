// QA-77 (C11.12, L7) walked in a real browser: a combination names each person one way on its page. The header, the
// folded "Who can be in this application" line (Before forms on Forms since #139) and its table all use the combination's own label (kept when typed on
// purpose, L7), else the shared library's name; when they differ the table adds the library role underneath. axe (WCAG
// 2.2 AA) on the table. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_qa77 4443 start && node studio/tests/check_qa77_names_browser.cjs 4443 xr_studio_screens_qa77
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4443), DB = process.argv[3] ?? "xr_studio_screens_qa77";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "F1-setup", "screenshots", "qa77"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(200); };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", { method: "POST" })).status === 201);

  // Each person's label as the combination stores it, else its library name: what every place on the page must say.
  const expected = (key) => JSON.parse(sql(`select coalesce(json_agg(coalesce(nullif(p->>'label',''), r.label, p->>'role') order by o), '[]') from combination c cross join lateral jsonb_array_elements(c.participants) with ordinality as x(p, o) left join person_role r on r.workspace_id = c.workspace_id and r.role_key = p->>'role' where c.combination_key='${key}' and (p->>'max')::int > 0`));
  for (const [key, typed] of [["vv.single", true], ["wp.family", false]]) {
    const id = sql(`select id from combination where combination_key='${key}'`);
    const names = expected(key);
    await p.goto(`${BASE}/c/${id}/forms`); // #139: Who can be sits in Before forms on Forms await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
    await p.waitForFunction(() => /people:/.test(document.querySelector("main")?.innerText ?? ""), null, { timeout: 15000 });
    const header = await p.locator("main").innerText();
    const peopleLine = header.split("\n").find((l) => /people:/.test(l)) ?? "";
    const who = p.locator("[data-who-can-be]");
    const folded = await who.innerText();
    await who.getByRole("button", { name: /^Show/ }).click();
    await who.locator("[data-person]").first().waitFor();
    const rows = await who.locator("[data-person] td:first-child span.font-medium").allInnerTexts();
    step(`QA-77 pass (${key}): the header names every person as the combination does`, names.every((n) => peopleLine.includes(n)), `${names.join(" | ")} in "${peopleLine}"`);
    step(`QA-77 pass (${key}): the folded Who can be line uses the same names`, names.every((n) => folded.includes(n)), folded);
    step(`QA-77 pass (${key}): the table's Person column uses the same names, in order`, JSON.stringify(rows) === JSON.stringify(names), JSON.stringify(rows));
    const roleNotes = await who.locator("[data-library-role]").allInnerTexts();
    if (typed) step(`QA-77 (${key}): a typed label shows the library role under it (PRODUCT §4 term kept in view)`, roleNotes.some((t) => /role: Principal applicant/.test(t)), roleNotes.join(" | "));
    else step(`QA-77 fail guard (${key}): with no typed label there is no extra role line`, roleNotes.length === 0, roleNotes.join(" | "));
    if (typed) {
      await p.screenshot({ path: path.join(SHOTS, "01-visitor-visa-who-can-be-1440.png") });
      const r = await new AxeBuilder({ page: p }).include("[data-who-can-be]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      step("axe: the Who can be table has no WCAG A/AA violation", r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    }
  }
  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
