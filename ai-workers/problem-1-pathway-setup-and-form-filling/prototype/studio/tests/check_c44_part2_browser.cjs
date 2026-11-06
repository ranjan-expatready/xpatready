// C4.4 part 2 in a real browser (runtime lane, swarm B3c; P-47 tier 2): the officer's section shows its error summary
// (GOV.UK pattern) at the top, each line a link that moves the focus to the answer it names: an answer to fix (tier 1)
// and a fired section check (tier 2). The forms panel names the fired check under "Facts to answer or confirm". Once the dates
// are in order the check leaves the summary and the forms panel. A pass and a fail per rule; axe-core (WCAG 2.2 A/AA)
// on every state; no sideways scroll at 1440 and 1024 px. No AI (US$0). Sample values.
// Screenshots: product/screens/W1-questions-and-documents/screenshots/c44-part2/.
// The suite prepares its own copy (tests/runtime/prepare_c44.cjs: the Visitor visa release, then the C4.4 Sample types).
//   zsh studio/tools/isolated.sh runtime_c44p2b 4439 start && node studio/tests/check_c44_part2_browser.cjs 4439 xr_studio_runtime_c44p2b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4439", DB = process.argv[3] ?? "xr_studio_runtime_c44p2b", BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "../../../product/screens/W1-questions-and-documents/screenshots/c44-part2");
const OFFICER = "user-O", CLIENT = "user-P";
const CROSSED = "The visit ends before it starts. Check both dates.";
const results = [];
const step = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || detail === undefined ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 300)}`}`); };
const call = async (method, url, body, actor) => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j }; };

(async () => {
  try { require("./runtime/prepare_c44.cjs").prepareC44(PORT, DB); } catch (e) { step("setup: the copy is prepared (Visitor visa released, C4.4 Sample types added)", false, String(e)); console.log(`\n0/1 passed`); process.exit(1); }
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const f of fs.readdirSync(SHOTS)) if (f.endsWith(".png")) fs.unlinkSync(path.join(SHOTS, f));
  const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const combinationId = sql("select id from combination where combination_key = 'vv.single'");
  const opened = await call("POST", "/runtime/cases", { combinationId, reference: `C44P2B-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  const caseId = opened.body?.id ?? opened.body?.case?.id;
  const people = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people ?? [];
  const P = people.find((p) => p.role === "principal")?.subject_id, CASE = people.find((p) => p.role === "case")?.subject_id;
  step("setup: a Visitor visa case", !!caseId && !!P && !!CASE, { status: opened.status });
  if (!caseId || !P || !CASE) { console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`); process.exit(1); }
  const put = (s, f, value, expectedId = null) => call("PUT", `/runtime/cases/${caseId}/answers/${s}/${f}`, { value, expectedId }, OFFICER);
  await put(CASE, "case.intended_stay_from", "2027-03-10");
  const to = await put(CASE, "case.intended_stay_to", "2027-03-01");
  await put(P, "person.date_of_birth", "2031-13-40");

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const WAIT = 10000;
  const shows = (loc) => loc.waitFor({ state: "visible", timeout: WAIT }).then(() => true, () => false);
  const eventually = async (fn) => { const end = Date.now() + WAIT; for (;;) { try { if (await fn()) return true; } catch { /* not there yet */ } if (Date.now() > end) return false; await new Promise((ok) => setTimeout(ok, 100)); } };
  let n = 0;
  const state = async (p, name, widths) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForFunction(() => !document.querySelector("button[aria-busy]"), undefined, { timeout: WAIT });
    const own = p.viewportSize();
    for (const w of widths) {
      if (w !== p.viewportSize().width) await p.setViewportSize({ width: w, height: 900 });
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: true });
      step(`${w} px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    }
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    if (p.viewportSize().width !== own.width) await p.setViewportSize(own);
  };

  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("c44p2-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("c44p2-init", "1"); } } catch { /* ignore */ } }, OFFICER);
    const o = await ctx.newPage();
    o.on("pageerror", (e) => errors.push(String(e)));
    o.on("console", (m) => { if (m.type() === "error" && !/status of (400|403|409|422)/.test(m.text())) errors.push(m.text()); });
    await o.goto(`${BASE}/cases/${caseId}`);
    const summaries = o.locator("[data-section-summary]");
    step("R1 fail: a section with crossed dates shows its summary with the fired check as a link", await shows(summaries.filter({ hasText: CROSSED }).first()));
    // The officer's page shows one person at a time: the principal's tab holds the birth date.
    const person = async () => { const tab = o.getByRole("tab", { name: /Sample Applicant A/ }).first(); if (await shows(tab)) await tab.click(); };
    await state(o, "officer-application-summary", [1440, 1024]);
    await person();
    const birthLine = summaries.locator("li").filter({ has: o.locator("a") }).filter({ hasText: /birth/i }).first();
    step("R1 fail: the section with the impossible birth date lists it as an answer to fix", await shows(birthLine));
    await state(o, "officer-principal-summary", [1440, 1024]);
    await o.getByRole("tab", { name: /The application/ }).first().click();
    // The link moves the focus to the answer's line (keyboard and screen reader land on the answer, not just a scroll).
    const link = summaries.filter({ hasText: CROSSED }).first().locator("a").first();
    const target = (await link.getAttribute("href"))?.slice(1);
    await link.focus(); await o.keyboard.press("Enter");
    step("R1 pass: the summary link moves the focus to the answer it names", !!target && await eventually(async () => (await o.evaluate(() => document.activeElement?.id)) === target), { target, active: await o.evaluate(() => document.activeElement?.id) });
    // R2: the forms panel names the fired check under "Facts to answer or confirm" (QA-229, B2: was "What blocks filing").
    const blocks = o.locator("details", { hasText: "Facts to answer or confirm" }).first();
    if (await shows(blocks)) await blocks.locator("summary").click();
    step("R2 fail: the forms panel lists the fired check among what blocks filing, in its words", await shows(o.locator("details li", { hasText: CROSSED }).first()));
    await state(o, "officer-forms-blocked-by-check", [1440]);
    // Fix the dates: the check leaves the summary and the forms panel.
    const fixed = await put(CASE, "case.intended_stay_to", "2027-03-20", to.body?.answer?.id ?? null);
    step("setup: the end date is corrected (200)", fixed.status === 200, fixed.status);
    await o.reload();
    await shows(o.locator("[data-section-summary]").first());
    step("R1/R2 pass: with the dates in order, no summary or forms panel names the check", await eventually(async () => (await o.getByText(CROSSED).count()) === 0));
    await person();
    step("R1 pass (guard): the birth date still to fix stays in its summary", await shows(o.locator("[data-section-summary] li").filter({ hasText: /birth/i }).first()));
    await state(o, "officer-after-fix", [1440]);
    step("no page errors", errors.length === 0, errors.slice(0, 3));
  } finally { await browser.close(); }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
