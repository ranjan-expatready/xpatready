// M2 queue item 4, Preview by person and by channel (runtime lane; C4.3, C4.6; board v2 frame 4; plan.md "Preview by
// person and by channel"): the Preview tab walked in a real browser. At 1440 px the three sets (Prospect questionnaire (PQR), what
// the client is asked, the case officer's view) sit side by side; below 1280 px one shows at a time with a switch kept
// in the address. The client view carries the information line of what documents fill; the forms are grouped by how
// each is filed. A pass and a fail per rule; screenshots at 1440 and 1024 in
// screens/W1-questions-and-documents/screenshots/preview/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_pv 4436 start && node studio/tests/check_preview_sets_browser.cjs 4436 xr_studio_runtime_pv
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_pv";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "preview"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const KEYS = /\b(person|case|organisation|representative|relationship)\.[a-z_]+\b|\b[a-z]+_[a-z_]+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400); };
  const visible = (sel) => p.locator(sel).evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).length);
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    const r2 = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe at 1024 px: ${name} has no WCAG A/AA violation`, r2.violations.length === 0, r2.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const Q = (await api(`/combinations/${wp}/workspace?tab=questionnaires`)).body.questionnaire;
  const chipOf = new Map(Q.roles.map((r) => [r.role, r.questions]));
  const go = async (qs = "") => { await p.goto(`${BASE}/c/${wp}/preview${qs}`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-preview]").waitFor(); await settle(); };
  const panel = () => p.getByRole("tabpanel");

  // ======================================================== 1440 px: three sets side by side
  await go("?person=principal");
  step("C4.3 pass: at 1440 px the three sets show side by side, with no switch", await visible("[data-set]") === 3 && await visible("[data-set-switch]") === 0, await visible("[data-set]"));
  const chipText = await p.locator('[data-person-chip="principal"]').innerText();
  const agentHead = await p.locator('[data-set="agent"] h2').innerText();
  step("C4.3 one count pass: the principal's chip, the case officer's view and the Smart questionnaire (SQR) tab say the same number", chipText.includes(`${chipOf.get("principal")} questions`) && agentHead.includes(`· ${chipOf.get("principal")}`), `${chipText} | ${agentHead} | ${chipOf.get("principal")}`);
  const doc = p.locator("[data-from-documents]");
  step("C4.3 Q1 pass: the client view says what the documents fill (\"Passport … fills n answers\"), information only (no upload control)", /Passport.* fills \d+ answers/.test(await doc.innerText()) && await doc.locator('input[type="file"], button').count() === 0, (await doc.innerText()).replace(/\s+/g, " "));
  step("C4.3 pass: every answer in the case officer's view names its source in words", await p.locator("[data-agent-fact]").count() === chipOf.get("principal") && !KEYS.test(await p.locator('[data-set="agent"]').innerText()));
  step("C4.3 PQR fail: with nothing ticked the Prospect questionnaire (PQR) set says so and points to the Smart questionnaire (SQR) tab", /Tick them on the Smart questionnaire \(SQR\) tab/.test(await p.locator('[data-set="pqr"]').innerText()));
  step("C4.6 pass: the principal's forms are grouped: a filled PDF to upload, and filed once for the application", await p.locator('[data-output-group="PDF_UPLOAD"] [data-preview-form]').count() >= 3 && await p.locator('[data-output-group="APPLICATION"] [data-preview-form="IMM 5476"]').count() === 1);
  step("C4.6 fail: a form appears in one group only", (await p.locator("[data-preview-form]").evaluateAll((els) => els.map((e) => e.getAttribute("data-preview-form")))).every((f, i, all) => all.indexOf(f) === i));
  step("C4.3/C4.6: no system key on the Preview tab", !KEYS.test((await panel().innerText()).replace(/https?:\S+/g, "")), (await panel().innerText()).match(KEYS)?.[0]);
  await state("principal-three-sets");

  // ======================================================== spouse: a PQR tick and the couple's form
  const L = (await api(`/combinations/${wp}/fact-sources`)).body;
  const f = L.facts.find((x) => x.role === "spouse_or_partner" && x.source === "CLIENT" && x.placed && !x.prequalification);
  step("setup: a spouse's question ticked for the Prospect questionnaire (PQR) (draft)", (await api(`/combinations/${wp}/fact-sources/spouse_or_partner/${encodeURIComponent(f.fact)}`, { method: "PUT", data: { prequalification: true, reason: "Sample: preview test", version: f.version } })).status === 200);
  await p.locator('[data-person-chip="spouse"]').click(); await settle();
  step("C4.3 PQR pass: the spouse's Prospect questionnaire (PQR) set lists the ticked question with where it comes from", /person=spouse/.test(p.url()) && (await p.locator(`[data-set="pqr"] [data-pqr-fact="${f.fact}"]`).innerText()).includes("Client"));
  step("C4.6 + Q3 pass: IMM 5409 is filed once for the couple, under the spouse", await p.locator('[data-output-group="COUPLE"] [data-preview-form="IMM 5409"]').count() === 1);
  await state("spouse-pqr-and-couple");
  await p.locator('[data-person-chip="principal"]').click(); await settle();
  step("C4.3 PQR fail: the spouse's tick is not in the principal's set", await p.locator(`[data-pqr-fact="${f.fact}"]`).count() === 0);

  // ======================================================== 1024 px: one set at a time, the switch in the address
  await p.setViewportSize({ width: 1024, height: 768 });
  await go("?person=principal");
  step("C4.3 pass: below 1280 px one set shows (the client's, by default) with a switch", await visible("[data-set]") === 1 && await visible('[data-set="sqr"]') === 1 && await visible("[data-set-switch]") === 1);
  await p.locator('[data-set-button="agent"]').click(); await settle();
  step("C4.3 pass: the switch shows the case officer's view and keeps it in the address", /set=agent/.test(p.url()) && await visible('[data-set="agent"]') === 1 && await visible("[data-set]") === 1 && (await p.locator('[data-set-button="agent"]').getAttribute("aria-checked")) === "true");
  await p.locator('[data-person-chip="child-1"]').click(); await settle();
  step("C4.3 pass: choosing another person keeps the chosen set", /set=agent/.test(p.url()) && /person=child-1/.test(p.url()) && await visible('[data-set="agent"]') === 1);
  await p.goto(`${BASE}/c/${wp}/preview?person=principal&set=nonsense`); await p.locator("[data-preview]").waitFor(); await settle();
  step("C4.3 fail: an unknown set in the address falls back to the client's set", await visible('[data-set="sqr"]') === 1 && await visible("[data-set]") === 1);
  await p.setViewportSize({ width: 1440, height: 900 });

  step("no page error or console error on the way", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
