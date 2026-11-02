// M2 queue item 2, PQR (runtime lane; C4.2, C4.8; P-76, P-132; plan.md "PQR"): the Smart questionnaire (SQR) tab's
// "Prospect questionnaire (PQR)" chip walked in a real browser. The chip shows only the person's ticked questions with how each is
// asked and confirmed; the country PQR is a view of the newest releases (a draft tick named as a draft change until the
// one release, then listed with the combination and its release). A pass and a fail per rule; screenshots at 1440 and
// 1024 in screens/W1-questions-and-documents/screenshots/pqr/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_pqr 4436 start && node studio/tests/check_pqr_browser.cjs 4436 xr_studio_runtime_pqr
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { sourceEveryNumber } = require("./fixtures/source-every-number.cjs"); // G1 (C5.4): a release needs every number sourced
const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_pqr";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "pqr"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const KEYS = /\b[a-z_]+\.[a-z_]+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin") && !document.querySelector("[data-pqr-set] .animate-pulse"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const go = async (role) => { await p.goto(`${BASE}/c/${wp}/questionnaires${role ? `?role=${role}` : ""}`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(); };
  const chip = () => p.locator('[data-source-chip="pqr"]');
  const shownRows = () => p.locator("[data-questions] tr[data-question]");

  // ======================================================== no tick yet
  await go();
  step("C4.2 pass: the chips include Prospect questionnaire (PQR) with its count (0 after Load sample)", /Prospect questionnaire \(PQR\) 0/.test(await chip().innerText()), await chip().innerText());
  await chip().click(); await settle();
  step("C4.2 fail: with no tick, the chip shows no question", await shownRows().count() === 0, await shownRows().count());
  step("C4.2: the PQR panel says how a PQR answer is asked and confirmed", /0 Prospect questionnaire \(PQR\) questions/.test(await p.locator("[data-pqr-set]").innerText()) && /please confirm/.test(await p.locator("[data-pqr-set]").innerText()));

  // ======================================================== a draft tick
  const L = (await api(`/combinations/${wp}/fact-sources`)).body;
  const dob = L.facts.find((f) => f.role === "principal" && f.fact === "person.date_of_birth");
  const t = await api(`/combinations/${wp}/fact-sources/principal/${encodeURIComponent("person.date_of_birth")}`, { method: "PUT", data: { prequalification: true, reason: "Sample: decides the family rows", version: dob.version } });
  step("setup: Date of birth ticked for the Prospect questionnaire (PQR) (draft)", t.status === 200, t.status);
  await go(); await chip().click(); await settle();
  const facts = await shownRows().evaluateAll((rs) => rs.map((r) => r.getAttribute("data-fact")));
  step("C4.2 pass: the chip shows exactly the ticked question", facts.length === 1 && facts[0] === "person.date_of_birth", facts.join());
  step("C4.2: the row says where it comes from and Ask", /Document/.test(await shownRows().first().innerText()) && /Ask/.test(await shownRows().first().innerText()));
  const panel = await p.locator("[data-pqr-set]").innerText();
  step("C4.2 P-132 fail: a draft tick is not yet in the country PQR; the panel says it changes 1 line at the next release", /1 Prospect questionnaire \(PQR\) question\b/.test(panel) && /Country Prospect questionnaire \(PQR\):\s*0 questions/.test(panel) && /changes 1 line at its next release/.test(panel), panel.replace(/\n/g, " "));
  step("C4.2 fail-guard: the panel shows no system key", !KEYS.test(panel), panel.match(KEYS)?.[0]);
  await state("draft-tick");
  await p.locator('[data-role-chip="spouse_or_partner"]').click(); await settle();
  await chip().click(); await settle();
  step("C4.2 fail: another person's PQR does not show the principal's tick", await shownRows().count() === 0, await shownRows().count());

  // ======================================================== one release (C4.8)
  await sourceEveryNumber(BASE, wp); // G1 (C5.4): the release's numbers need a source first
  let r = await api(`/combinations/${wp}/submit`, { method: "POST", data: {} });
  const review = (await api(`/combinations/${wp}/review`)).body;
  const sme = ((review?.submission?.changeSummary ?? [])).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await api(`/combinations/${wp}/signoff`, { method: "POST", actor: "user-C", data: { items: sme, action: "signed" } });
  r = await api(`/combinations/${wp}/approve`, { method: "POST", actor: "user-B", data: {} });
  step("C4.8: the tick goes out in the combination's one release (Release 2)", r.status === 201 && r.body?.version === 2, r.status);
  await go(); await chip().click(); await settle();
  const after = await p.locator("[data-pqr-set]").innerText();
  step("C4.2 P-132 pass: once released, the country PQR has 1 question from 1 of 1 released combination", /Country Prospect questionnaire \(PQR\):\s*1 question from 1 of 1 released combination/.test(after) && await p.locator("[data-pqr-pending]").count() === 0, after.replace(/\n/g, " "));
  await p.getByRole("button", { name: "Show the list" }).click(); await settle();
  const line = await p.locator('[data-pqr-line="principal|person.date_of_birth"]').innerText();
  step("C4.2 P-132: the country line names the question, the person, the combination and its release", /Date of birth/.test(line) && /Principal applicant/.test(line) && /With an LMIA \(release 2\)/.test(line), line.replace(/\s+/g, " "));
  step("C4.2 fail-guard: the country list shows no system key", !KEYS.test(await p.locator("[data-pqr-country]").innerText()));
  await state("released-country-list");

  // ======================================================== read-only person
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-B"); } catch { /* ignore */ } });
  await go(); await chip().click(); await settle();
  step("C4.2: an approver reads the same PQR set and country view, with no ticks to change", await shownRows().count() === 1 && await p.locator("[data-pqr-country]").count() === 1 && await p.locator("[data-row-tick]").count() === 0);
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });

  step("no page error or console error on the way", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
