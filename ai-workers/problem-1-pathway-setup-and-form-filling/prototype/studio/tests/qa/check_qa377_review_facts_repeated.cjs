// QA-377 (UX · Minor, C8.3, row B144; concept §4: the representative reads each form's facts): the Review page's
// "Facts on this form" table lists one fact once per form field it fills. On main 7e32ee210, IMM 5257 read "110 facts"
// for 68 distinct facts: the mailing address 9 times, each telephone and fax number 8 times, the date of birth 3 times,
// each with the same value. This check makes the builder's walk data (tests/runtime/setup_c83_walk.ts), opens round 2
// (the principal's filing) as the representative, selects each form in turn (unticking "Only changed facts" where shown) and counts the table's rows (fact = value).
// It fails while any fact shows twice on one form, or the "N facts" count is above the distinct facts; passes when each
// fact shows once. No model call (US$0).
//   zsh studio/tools/isolated.sh qa377 4475 start --ttl 30 && trap 'zsh studio/tools/isolated.sh qa377 4475 stop' EXIT && node studio/tests/qa/check_qa377_review_facts_repeated.cjs 4475 xr_studio_qa377
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const STUDIO = path.resolve(__dirname, "..", "..");
const PORT = Number(process.argv[2] ?? 4475), DB = process.argv[3] ?? "xr_studio_qa377", BASE = `http://localhost:${PORT}`;
const PSQL = process.env.PSQL || (fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql");
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const tsx = (f) => spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, f), String(PORT), DB], { encoding: "utf8", timeout: 900000, maxBuffer: 1 << 26 });
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail).slice(0, 800)}`}`); } };

(async () => {
  if (sql("select count(*) from combination where combination_key='vv.single'") === "0") for (const f of ["tests/runtime/setup_visitor_visa.ts", "acceptance/lib/setup_vv_m3.ts"]) tsx(f);
  const s = tsx("tests/runtime/setup_c83_walk.ts");
  const d = JSON.parse(String(s.stdout).trim().split("\n").pop() || "{}");
  ok("QA-377 setup: round 2 sent for the principal's filing (setup_c83_walk.ts)", !!d.caseId && !!d.r2 && !!d.fP, { exit: s.status, err: String(s.stderr).slice(-300) });
  if (!d.r2) process.exit(1);
  const b = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(`${BASE}/`); await p.evaluate((a) => localStorage.setItem("xr-actor", a), d.rep);
  await p.goto(`${BASE}/cases/${d.caseId}/representative-review/${d.r2}?filing=${d.fP}`);
  const page = p.locator("[data-review-page]"); await page.waitFor({ timeout: 20000 }); await p.waitForTimeout(1000);
  const forms = await page.locator(`[data-review-filing="${d.fP}"] [data-review-form]`).evaluateAll((els) => els.map((e) => (e.querySelector("button") || e).innerText.split("\n")[0].trim()));
  const found = [];
  for (const form of forms) {
    await page.getByText(form, { exact: true }).first().click(); await p.waitForTimeout(800);
    const only = page.getByRole("checkbox", { name: "Only changed facts" });
    if (await only.count() && await only.isChecked()) { await only.uncheck(); await p.waitForTimeout(500); }   // every fact, not the change-only view
    const rows = await page.locator("table tbody tr").evaluateAll((trs) => trs.map((t) => [...t.cells].slice(0, 2).map((c) => c.innerText.trim()).join(" = ")));
    const said = Number(((await page.getByText(/Facts on this form · \d+ facts?/).first().innerText().catch(() => "")).match(/(\d+) facts?/) || [])[1] ?? NaN);
    const n = {}; rows.forEach((r) => (n[r] = (n[r] ?? 0) + 1));
    const twice = Object.entries(n).filter(([, k]) => k > 1);
    if (twice.length || said > Object.keys(n).length) found.push({ form, said, rows: rows.length, distinct: Object.keys(n).length, repeated: twice.slice(0, 4) });
  }
  await b.close();
  ok(`QA-377 (C8.3): each form's "Facts on this form" lists each fact once and counts distinct facts (${forms.length} forms read)`, forms.length > 0 && found.length === 0, { found });
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})();
