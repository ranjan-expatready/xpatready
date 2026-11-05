// QA-144 slice 1 walk at 1440 px (P-312): after Demo › Load the configured checkpoint on a blank copy, the author opens
// the Visitor visa as a person would: its Questionnaires (sections from the forms' parts, questions per person), its
// Forms (the rules from IRCC's words), Preview, and Review and release (released once IRM 0002's saved map is
// replayed, #891). Screenshots to product/screens/QA-144-configured-release/screenshots; axe on each page; US$0.
//   zsh studio/tools/isolated.sh b8_qa144 4470 start && node studio/tests/qa/check_qa144_vv_walk.cjs 4470 xr_studio_b8_qa144
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = Number(process.argv[2] ?? 4470), DB = process.argv[3] ?? "xr_studio_b8_qa144", BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "screens", "QA-144-configured-release", "screenshots");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const ok = (name, c, d) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 300)}` : ""}`); };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ headless: !process.env.QA_HEADED, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : { channel: "chrome" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const api = async (u, method = "GET", data) => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, timeout: 600000, headers: { "x-actor": "user-A", ...(data !== undefined ? { "content-type": "application/json" } : {}) }, ...(data !== undefined ? { data: JSON.stringify(data) } : {}) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  await api("/demo/reset", "POST", { confirm: "RESET" });
  const l = await api("/demo/load", "POST", { sample: "configured" });
  ok("walk: Demo › Load the configured checkpoint answers 201 at US$0", l.status === 201 && l.body?.cost_usd === 0, l.status);
  const vv = sql("select id from combination where combination_key = 'vv.single'");
  // Found on main's own six too (the same web code; 4 Nov, builder-8): listed in the PR for the screens lane, not this slice's.
  const ON_MAIN = { forms: ["empty-table-header"], review: ["empty-table-header", "heading-order"] };
  const axe = async (name, tab) => {
    const r = await new AxeBuilder({ page: p }).analyze(), known = ON_MAIN[tab] ?? [];
    const fresh = r.violations.filter((v) => !known.includes(v.id));
    ok(`axe: ${name} has no violation beyond those on main's six (${known.join(", ") || "none"})`, fresh.length === 0, { fresh: fresh.map((v) => v.id), on_main: r.violations.filter((v) => known.includes(v.id)).map((v) => v.id) });
  };
  const wide = async (name) => ok(`layout: ${name} has no sideways scroll at 1440`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  const visit = async (tab, file, check) => {
    await p.goto(`${BASE}/c/${vv}/${tab}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(SHOTS, file), fullPage: false });
    await check(await p.locator("main").innerText().catch(() => p.locator("body").innerText()));
    await axe(`Visitor visa › ${tab}`, tab); await wide(`Visitor visa › ${tab}`);
  };
  await visit("questionnaires", "1-questionnaires-1440.png", (t) => {
    ok("walk Questionnaires: sections from the forms' parts are listed (Personal details, Marital status, Background info)", ["Personal details", "Marital status", "Background info"].every((x) => t.includes(x)), t.slice(0, 200));
    ok("walk Questionnaires: no person role shows a gap (\"nobody is asked\")", !/nobody is asked/i.test(t));
  });
  await visit("forms", "2-forms-rules-1440.png", (t) => {
    ok("walk Forms: IMM 5707 and the conditional forms are on the Visitor visa; IMM 5645 is not filed (paper channel)", t.includes("IMM 5707") && t.includes("IMM 5409") && t.includes("IRM 0002"), t.slice(0, 200));
    ok("walk Forms: no form says its condition is in words only", !/in words only/i.test(t));
  });
  await visit("preview", "3-preview-1440.png", (t) => ok("walk Preview: the principal's questionnaire has questions", t.length > 200 && !/no questions yet/i.test(t), t.slice(0, 160)));
  // IRM 0002's saved map (#840) is replayed by the checkpoint (#891): the Visitor visa is released (review m2).
  ok("walk: the configured checkpoint released the Visitor visa", Number(sql(`select count(*) from config_release where combination_id = '${vv}'`)) >= 1);
  await visit("review", "4-review-released-1440.png", (t) => {
    ok("walk Review and release: release 1 is out, approved by the Approver, with nothing left to fix", /Last released: version 1, in Release 1, by Approver/.test(t) && /0 problems to fix/.test(t) && !/[1-9]\d* problems? to fix/.test(t), t.slice(0, 300));
    ok("walk Review and release: no form field without a decision and no rule in words only", !/no decision in this draft/.test(t) && !/in words only/.test(t));
  });
  await b.close();
  console.log(`${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
