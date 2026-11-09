// QA-376 (UX · Minor, C8.3, row B144; concept m5 / BIC-14: the "Approval withdrawn" chip's tooltip opens on keyboard
// focus): a Tab onto the chip sometimes focuses it and opens no tooltip. qa saw it in 2 of 3 runs of
// tests/check_c83_review_browser.cjs (line 141) and in 1 of 12 probe tries on main 7e32ee210. This check makes the
// data the builder's walk starts from (tests/runtime/setup_c83_walk.ts: round 1 with the spouse's one withdrawn form),
// then, as the representative, opens round 1 forty times (straight after load or after 1.5 s; half of them selecting the filing first, as the builder's walk does), Tabs from the
// form's button onto the chip and waits 4 s for the tooltip. It fails on any miss; passes when every Tab opens it.
// No model call (US$0).
//   zsh studio/tools/isolated.sh qa376 4474 start --ttl 30 && trap 'zsh studio/tools/isolated.sh qa376 4474 stop' EXIT && node studio/tests/qa/check_qa376_withdrawn_tooltip_keyboard.cjs 4474 xr_studio_qa376
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const STUDIO = path.resolve(__dirname, "..", "..");
const PORT = Number(process.argv[2] ?? 4474), DB = process.argv[3] ?? "xr_studio_qa376", BASE = `http://localhost:${PORT}`;
const PSQL = process.env.PSQL || (fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql");
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const tsx = (f) => spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, f), String(PORT), DB], { encoding: "utf8", timeout: 900000, maxBuffer: 1 << 26 });
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail).slice(0, 600)}`}`); } };

(async () => {
  if (sql("select count(*) from combination where combination_key='vv.single'") === "0") for (const f of ["tests/runtime/setup_visitor_visa.ts", "acceptance/lib/setup_vv_m3.ts"]) tsx(f);
  const s = tsx("tests/runtime/setup_c83_walk.ts");
  const d = JSON.parse(String(s.stdout).trim().split("\n").pop() || "{}");
  ok("QA-376 setup: round 1 with the spouse's one withdrawn form (setup_c83_walk.ts)", !!d.caseId && !!d.r1 && !!d.fS, { exit: s.status, err: String(s.stderr).slice(-300) });
  if (!d.r1) process.exit(1);
  const b = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(`${BASE}/`); await p.evaluate((a) => localStorage.setItem("xr-actor", a), d.rep);
  const misses = [];
  for (let i = 0; i < 40; i++) {
    await p.goto(`${BASE}/cases/${d.caseId}/representative-review/${d.r1}?filing=${d.fS}`);
    await p.locator("[data-review-page]").waitFor({ timeout: 20000 });
    if (i % 2) await p.waitForTimeout(1500);
    if (i % 4 >= 2) { await p.locator(`#rf-${d.fS}`).click(); await p.waitForTimeout(300); }   // as the builder's walk: select the filing first
    const w = p.locator(`[data-review-filing="${d.fS}"] [data-review-form][data-state=approval_withdrawn]`);
    await w.first().waitFor({ timeout: 20000 });
    await w.first().getByRole("button").focus();
    await p.keyboard.press("Tab");
    const focused = await p.evaluate(() => (document.activeElement?.textContent || "").trim().slice(0, 40));
    const opened = await p.getByRole("tooltip").waitFor({ timeout: 4000 }).then(() => true, () => false);
    if (!opened) misses.push({ try: i, settled: !!(i % 2), focused });
  }
  await b.close();
  ok("QA-376 (C8.3, BIC-14): every Tab onto the \"Approval withdrawn\" chip opens its tooltip (40 tries)", misses.length === 0, { misses });
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})();
