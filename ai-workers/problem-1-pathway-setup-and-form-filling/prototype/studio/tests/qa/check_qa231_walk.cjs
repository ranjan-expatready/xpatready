// QA-231 walk at 1440 px (C9.1 on the configured checkpoint): after Demo › Load the configured checkpoint on a blank copy,
// the author opens To review › New edition: IMM 5476 (11-2025), its Components touched tab (the sections that ask the
// changed fields and IMM 5476's own rule, on each combination that files it, in words), then the case officer
// opens the Sample family case on the Visitor visa's release 1 (row 11). Screenshots to
// product/screens/QA-231-c91-checkpoint/screenshots; axe on each page; no sideways scroll; no priced click; US$0.
//   zsh studio/tools/isolated.sh b8_qa231 4472 start && node studio/tests/qa/check_qa231_walk.cjs 4472 xr_studio_b8_qa231
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = Number(process.argv[2] ?? 4472), DB = process.argv[3] ?? "xr_studio_b8_qa231", BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "screens", "QA-231-c91-checkpoint", "screenshots");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const ok = (name, c, d) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 300)}` : ""}`); };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ headless: !process.env.QA_HEADED, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : { channel: "chrome" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  // QA-100: a priced request is never sent by this walk.
  const priced = []; p.on("request", (r) => { if (r.method() === "POST" && /\/impact\/draft$/.test(r.url()) && /"live"/.test(r.postData() ?? "")) priced.push(r.url()); });
  const api = async (u, method = "GET", data) => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, timeout: 600000, headers: { "x-actor": "user-A", ...(data !== undefined ? { "content-type": "application/json" } : {}) }, ...(data !== undefined ? { data: JSON.stringify(data) } : {}) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (actor) => { await p.goto(BASE); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`)); };
  const wide = async (name) => ok(`layout: ${name} has no sideways scroll at 1440`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(600); };

  await as("user-A");
  await api("/demo/reset", "POST", { confirm: "RESET" });
  const l = await api("/demo/load", "POST", { sample: "configured" });
  ok("walk: Demo › Load the configured checkpoint answers 201 at US$0", l.status === 201 && l.body?.cost_usd === 0, l.status);
  const held = sql("select id from intake_item where outcome = 'new_edition_held' and status = 'HELD' and code = 'IMM 5476' limit 1");

  await p.goto(`${BASE}/review`); await settle();
  const queue = await p.locator("main").innerText();
  ok("walk To review: the held IMM 5476 (11-2025) is listed as a new edition with the combinations it touches", /IMM 5476 \(11-2025\)/.test(queue) && /Visitor visa/.test(queue), queue.slice(0, 200));
  await p.screenshot({ path: path.join(SHOTS, "1-to-review-1440.png") }); await axe("To review"); await wide("To review");

  await p.goto(`${BASE}/review/edition/${held}`); await settle();
  await p.getByRole("tab", { name: /Components touched/ }).click(); await settle();
  const comp = await p.locator("[data-components]").innerText();
  // What the page must list is read from the review itself (section names follow the library's printed headings, QA-206).
  const imp = (await api(`/intake/held/${held}/impact`)).body ?? {};
  const secs = imp.components?.sections ?? [], rules = imp.components?.rules ?? [];
  ok("walk Components touched: every section and form rule the review names is listed with its count, IMM 5476's rule in words", secs.length > 0 && [...new Set(secs.map((x) => x.label))].every((x) => comp.includes(x)) && comp.includes(`Sections (${secs.length})`) && rules.length >= 3 && comp.includes(`Rules (${rules.length})`) && /IMM 5476 is filed only when Representative Form Action is answered/.test(comp), { sections: secs.length, rules: rules.length });
  ok("walk Components touched: each released combination that files IMM 5476 is named (Visitor visa, With an LMIA – inside Canada, Outside Canada)", ["Visitor visa", "With an LMIA – inside Canada", "Outside Canada"].every((x) => comp.includes(x)));
  ok("walk Components touched: each says why in words, never by a raw form-field path", /fills .+, and this section asks it/.test(comp) && /its condition reads it/.test(comp) && !/IMM_5476\[0\]/.test(comp));
  await p.screenshot({ path: path.join(SHOTS, "2-components-touched-1440.png"), fullPage: true }); await axe("New edition › Components touched"); await wide("New edition › Components touched");

  const fam = sql("select id from runtime_case where reference = 'SAMPLE-VV-FAMILY-1'");
  await as("user-O");
  await p.goto(`${BASE}/cases/${fam}`); await settle();
  const c = await p.locator("main").innerText().catch(() => p.locator("body").innerText());
  ok("walk the Sample family case: on Release 1 of the Visitor visa, its three Sample people listed", /Release 1/.test(c) && ["Client A (Sample)", "Partner (Sample)", "Child (Sample)"].every((x) => c.includes(x)), c.slice(0, 300));
  await p.screenshot({ path: path.join(SHOTS, "3-sample-family-case-1440.png"), fullPage: true }); await axe("the Sample family case"); await wide("the Sample family case");

  ok("walk: no page error, no priced request, no live AI job", errs.length === 0 && priced.length === 0 && sql("select count(*) from drafting_job where mode = 'LIVE'") === "0", { errs: errs.slice(0, 3), priced });
  await b.close();
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
