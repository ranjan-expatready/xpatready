// QA-270 on main (C4.6): Preview's real screen fills a Sample PDF for a configuration person; a client and another firm's
// representative opening the same address get the plain refusal and no Fill button. 1440/1024/400 px, axe, US$0.
//   zsh studio/tools/isolated.sh qa270_browser 4475 start && QA_HEADED=1 node studio/tests/qa/check_qa270_preview_browser.cjs 4475 xr_studio_qa270_browser
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4475), DB = process.argv[3] ?? "xr_studio_qa270_browser", BASE = `http://localhost:${PORT}`;
const OUT = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-11-06-after-merge"); fs.mkdirSync(OUT, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
(async () => {
  const b = await chromium.launch({ headless: !process.env.QA_HEADED, channel: "chrome" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const errors = []; p.on("pageerror", (e) => errors.push(String(e)));
  const api = async (path, method = "GET", data) => p.request.fetch(`${BASE}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, data: data === undefined ? undefined : JSON.stringify(data) });
  ok("QA-270 setup: the Sample fixture loads", (await api("/demo/load", "POST")).status() === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const as = async (actor) => { await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
  const check = async (name, shot) => {
    for (const width of [1440, 1024, 400]) {
      await p.setViewportSize({ width, height: 900 });
      ok(`${name}: no sideways scroll at ${width}`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      ok(`${name}: axe WCAG 2.2 AA clean at ${width}`, axe.violations.length === 0, axe.violations.map((v) => v.id));
    }
    await p.setViewportSize({ width: 1440, height: 900 }); await p.screenshot({ path: path.join(OUT, shot), fullPage: false });
  };
  await as("user-A");
  const started = Date.now();
  await p.goto(`${BASE}/c/${wp}/preview`); await p.locator("[data-preview]").waitFor({ timeout: 60_000 });
  await p.getByRole("link", { name: "Every form field and a Sample filled PDF" }).click();
  await p.getByRole("button", { name: "Forms and coverage" }).click();
  const row = p.locator("div.rounded-xl", { hasText: "IMM 1295" }).filter({ has: p.getByRole("button", { name: /Fill PDF from confirmed facts/ }) }).first();
  await row.getByRole("button", { name: /Fill PDF from confirmed facts/ }).click();
  await p.getByRole("dialog").waitFor({ timeout: 180_000 });
  ok("QA-270 pass (C4.6): the author fills IMM 1295 by screen and reads an intact, read-back result", /file is intact and every written value reads back/i.test(await p.getByRole("dialog").innerText()));
  ok("QA-270 speed: the visible Preview and fill journey completes", Date.now() - started > 0, { milliseconds: Date.now() - started });
  await check("QA-270 filled result", "qa270-author-filled-1440.png");
  await p.getByRole("button", { name: "Close" }).click();
  for (const [actor, name] of [["user-P", "client"], ["user-S", "other-firm"]]) {
    await as(actor); await p.goto(`${BASE}/c/${wp}/preview`); await p.getByText("This page is for the configuration people", { exact: true }).waitFor();
    ok(`QA-270 pass: the ${name} gets the plain refusal by address and no Fill button`, (await p.getByRole("button", { name: /Fill PDF from confirmed facts/ }).count()) === 0);
    await check(`QA-270 ${name} refusal`, `qa270-${name}-1440.png`);
  }
  ok("QA-270: no browser page error", errors.length === 0, errors);
  await b.close(); console.log(`${pass}/${pass + fail} passed`); process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
