// M2 queue item 3, who fills a question (runtime lane; C4.9, P-97; plan.md "Who fills"): the Smart questionnaire (SQR) drawer's
// "Who fills it, for every combination" walked in a real browser. The library default in words, "Change who fills…" with a
// required reason, the waiting change on the row's drawer, a refusal in words, the client-only lock, and the read-only
// approver; To review lists it for the second person. A pass and a fail per rule; screenshots at 1440 and 1024 in
// screens/W1-questions-and-documents/screenshots/who-fills/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_fills 4438 start && node studio/tests/check_who_fills_browser.cjs 4438 xr_studio_runtime_fills
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4438), DB = process.argv[3] ?? "xr_studio_runtime_fills";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "who-fills"); fs.mkdirSync(SHOTS, { recursive: true });
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
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400); };
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
  const as = async (who) => p.evaluate((w) => { try { localStorage.setItem("xr-actor", w); } catch { /* ignore */ } }, who);

  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const facts = (await api(`/combinations/${wp}/fact-sources`)).body.facts;
  const f = facts.find((x) => x.role === "principal" && x.fills.library === "CLIENT" && !x.clientOnly && x.ruleSource === "CLIENT" && x.placed);
  const locked = facts.find((x) => x.role === "principal" && x.clientOnly && x.placed);
  const go = async () => { await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(); };
  const open = async (fact) => {
    await go(); await p.getByRole("button", { name: "Open all sections" }).click().catch(() => {}); await settle();
    const row = p.locator(`[data-questions] tr[data-question][data-fact="${fact}"]`).first(); await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: /^Details of/ }).click();
    const d = p.getByRole("dialog"); await d.locator("[data-who-fills]").waitFor(); return d;
  };

  // ======================================================== the library default and the door
  let d = await open(f.fact);
  const lib = await d.locator("[data-who-fills]").innerText();
  step("C4.9 pass: the drawer says who fills it for every combination, in words", /Who fills it, for every combination/.test(lib) && /In the shared library: filled by the client/.test(lib) && !KEYS.test(lib), lib.replace(/\n/g, " "));
  await d.locator("[data-fills-open]").click();
  await d.locator("[data-fills-why]").fill("abc");
  await d.locator("[data-fills-send]").click(); await settle();
  const err = await d.locator("[data-fills-error]").innerText().catch(() => "");
  step("C4.9 fail: a reason under 5 characters is refused in words, next to the box", /at least 5 characters/.test(err) && await d.locator("[data-fills-why]").getAttribute("aria-invalid") === "true", err);
  await state("change-who-fills-form");
  await d.locator("[data-fills-why]").fill("Sample: the office holds this for every case");
  await d.locator("[data-fills-send]").click();
  await d.locator('[data-fills-change="WAITING"]').waitFor({ timeout: 15000 }).catch(() => {});
  const waiting = await d.locator("[data-who-fills]").innerText();
  step("C4.9 pass: sent to To review: the drawer says it waits for a second person, who proposed it and why", /Waiting for a second person on To review: the case officer fills it for every combination/.test(waiting) && /Why: Sample/.test(waiting) && await d.locator("[data-fills-open]").count() === 0, waiting.replace(/\n/g, " "));
  step("C4.9: nothing changed yet: this combination's Comes from is still the client", /Client/.test(await p.locator(`[data-questions] tr[data-fact="${f.fact}"]`).first().innerText()));
  await state("waiting-for-second-person");

  // ======================================================== the client-only lock
  d = await open(locked.fact);
  const lk = await d.locator("[data-who-fills]").innerText();
  step("C4.9 P-97: a declaration's drawer says it is always the client and offers no change", /Declarations are always answered by the client/.test(lk) && await d.locator("[data-fills-open]").count() === 0, lk.replace(/\n/g, " "));

  // ======================================================== the second person: To review, then approve
  await as("user-B");
  await p.goto(`${BASE}/review`); await settle();
  const page = await p.locator("main").innerText();
  step("C4.9 To review: the second person sees the change in words (Client → Case officer, reason)", /Who fills it, for every combination: Client → Case officer/.test(page) && /Reason: Sample: the office holds this/.test(page), page.match(/Who fills[^\n]*/)?.[0]);
  await state("to-review-second-person");
  d = await open(f.fact);
  step("C4.9: an approver reads the same drawer with no Change who fills", await d.locator("[data-fills-open]").count() === 0 && await d.locator('[data-fills-change="WAITING"]').count() === 1);
  const id = sql(`select id from library_change where kind='placement_fills' and status='WAITING' limit 1`);
  const r = await api(`/library/changes/${id}/approve`, { method: "POST", actor: "user-B", data: {} });
  step("setup: the second person approves it", r.status >= 200 && r.status < 300, r.status);
  await as("user-A");
  d = await open(f.fact);
  const appr = await d.locator("[data-who-fills]").innerText();
  step("C4.9 pass: approved: the drawer says the case officer fills it from the next release", /Approved: the case officer fills it for every combination from the next release/.test(appr), appr.replace(/\n/g, " "));
  step("C4.9 QA-114: until the release the library line still says the client (the released value), never the approved one", /In the shared library: filled by the client\./.test(appr) && !/In the shared library: filled by the case officer/.test(appr), appr.replace(/\n/g, " "));
  await state("approved-next-release");
  await p.keyboard.press("Escape");
  const coming = await p.locator(`[data-questions] tr[data-fact="${f.fact}"]`).first().locator("[data-fills-coming]").innerText().catch(() => "");
  step("C4.9 QA-114: the row marks the approved change as coming with the next release", /From the next release: filled by the case officer/.test(coming), coming);
  const other = facts.find((x) => x.role === "principal" && x.fact !== f.fact && x.placed && !x.clientOnly);
  step("C4.9 QA-114 fail: a row with no approved change carries no such mark", await p.locator(`[data-questions] tr[data-fact="${other.fact}"]`).first().locator("[data-fills-coming]").count() === 0, other.fact);

  // ======================================================== QA-112: a case fact, with no checklist of its own
  const caseFact = facts.find((x) => x.role === "case" && !x.ruleDocument && !(x.also ?? []).length && !x.clientOnly);
  d = await open(caseFact.fact);
  const src = await d.locator("section[aria-labelledby='d-source']").innerText();
  step("C4.10 QA-112 pass: a case fact says once, in case words, that no document supplies it; no checklist named", (src.match(/The case has no documents/g) ?? []).length === 1 && /The case has no documents of its own/.test(src) && !/checklist/.test(src) && !/No document supplies it\./.test(src), src.replace(/\n/g, " "));
  step("C4.10 QA-112 pass: no fallback line where no document can supply it", await d.locator("[data-fallback]").count() === 0 && !/Fallback question/.test(src));
  await state("case-fact-no-documents");
  await p.keyboard.press("Escape");
  const docFact = facts.find((x) => x.role === "principal" && x.ruleDocument && x.placed);
  d = await open(docFact.fact);
  step("C4.10 QA-112 fail: a fact a document supplies keeps its fallback line", /Fallback question reachable/.test(await d.locator("[data-fallback]").innerText().catch(() => "")));
  await p.keyboard.press("Escape");

  step("no page error or console error on the way", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
