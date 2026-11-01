// qa after-merge 1 Nov, second round (main 751cbc42): a person's walk, headless, of what merged after 832ee5bd.
// Part A — QA-76 (#225 slice a) on a released Visitor visa case as the case officer: no decision code, team word or plan
//   word anywhere a person can see it (page text and tooltips), at 1440, 1024 and 400 px; QA-76's other two words.
// Part B — C4.2 (#197) marking pre-qualification by hand as the author, by keyboard only, at 400 and 1024 px: the
//   drawer, the bulk toast's words, two tabs on one row (stale version), a double click on Save.
// Sample data, no STUDIO_*_LIVE, US$0.
//   zsh studio/tools/isolated.sh qa_rt 4473 start && tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/setup_visitor_visa.ts 4473 xr_studio_qa_rt
//   zsh studio/tools/isolated.sh qa_wk 4472 start
//   node studio/tests/qa/check_qa_am_1101b_walk.cjs 4473 4472 xr_studio_qa_wk
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const RT = Number(process.argv[2] ?? 4473), WK = Number(process.argv[3] ?? 4472), DB = process.argv[4] ?? "xr_studio_qa_wk";
const SHOTS = path.resolve(__dirname, "../../../../product/qa/reports/2026-11-01-after-merge-3"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", DB, "-Atc", q]).toString().trim();
let pass = 0, fail = 0; const step = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d !== undefined ? ` — ${String(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 400)}` : ""}`); };
const call = async (port, method, url, body, actor) => { const r = await fetch(`http://localhost:${port}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j }; };
const CODE = /\b(?:P|C|D|QA|SA)-\d+\b/, TEAM = /evidence lane|fill trial|forms slice|later wave|\blane\b/i;
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const errs = [];
  const page = async (port, actor, w) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" }); const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
    await p.goto(`http://localhost:${port}/`); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); return p;
  };
  const settle = (p) => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30000 }).catch(() => {});
  const axe = async (p, name) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); step(`axe: ${name}`, r.violations.length === 0, r.violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const noH = async (p, name) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); step(`no sideways scroll: ${name}`, o <= 1, o); };
  const shown = (p) => p.evaluate(() => [document.body.innerText, ...[...document.querySelectorAll("[title],[aria-label]")].map((e) => e.getAttribute("title") || e.getAttribute("aria-label"))].join("\n"));

  // ================================================================ Part A: QA-76 on a case
  const OFFICER = "user-O", CLIENT = "user-P";
  const combos = (await call(RT, "GET", "/catalogue?pathway=INDIVIDUAL&filter=all", undefined, "user-A")).body.rows;
  const vv = combos.find((r) => r.nodeKey === "individual.visitors.visitor_visa")?.combinationId ?? combos.find((r) => /visitor visa/i.test(r.label ?? r.name ?? ""))?.combinationId;
  const made = await call(RT, "POST", "/runtime/cases", { combinationId: vv, reference: `QA-W2-${Date.now().toString(36).slice(-4)}`, clientActor: CLIENT, principal: { displayName: "Client A" } }, OFFICER);
  step("setup: the case officer opens a Visitor visa case", made.status === 201 && !!made.body?.id, `${made.status} ${JSON.stringify(made.body).slice(0, 200)}`);
  const caseId = made.body?.id;
  const sp = await call(RT, "POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Spouse of Client A" }, OFFICER);
  step("setup: a spouse is added", sp.status === 201, sp.status);
  for (const w of [1440, 1024, 400]) {
    const p = await page(RT, OFFICER, w);
    await p.goto(`http://localhost:${RT}/cases/${caseId}`); await settle(p); await p.waitForTimeout(1500);
    const t = await shown(p);
    const codes = [...new Set(t.match(new RegExp(CODE, "g")) ?? [])], team = [...new Set(t.match(new RegExp(TEAM, "gi")) ?? [])];
    step(`QA-76 ${w}px: the case page shows no decision code (text or tooltip)`, codes.length === 0, codes.join(", "));
    step(`QA-76 ${w}px: the case page shows no team or plan word`, team.length === 0, team.join(", "));
    step(`QA-76 ${w}px: no "About representative" / lower-case role heading`, !/About representative|\brepresentative\b(?=\s*$)/m.test(t), (t.match(/.{0,30}representative.{0,30}/i) ?? [""])[0]);
    await noH(p, `case page ${w}px`); await p.screenshot({ path: path.join(SHOTS, `case-${w}.png`), fullPage: w !== 400 });
    if (w === 1024) await axe(p, "case page 1024 px");
    const tabs = await p.getByRole("tab").allInnerTexts();
    if (w === 1440) console.log(`NOTE  case tabs: ${tabs.join(" | ")}`);
    for (const tab of tabs.filter((x) => x.trim()).slice(0, 6)) {
      if (w !== 1440) break;
      await p.getByRole("tab", { name: tab }).first().click(); await settle(p); await p.waitForTimeout(700);
      const tt = await shown(p);
      const c2 = [...new Set(tt.match(new RegExp(CODE, "g")) ?? [])], t2 = [...new Set(tt.match(new RegExp(TEAM, "gi")) ?? [])];
      step(`QA-76 case tab "${tab.trim().split("\n")[0]}": no decision code or team word`, !c2.length && !t2.length, [...c2, ...t2].join(", "));
      await p.screenshot({ path: path.join(SHOTS, `case-tab-${tab.trim().toLowerCase().replace(/\W+/g, "-")}.png`), fullPage: true });
    }
    await p.context().close();
  }
  // the client's own questionnaire
  { const p = await page(RT, CLIENT, 390); await p.goto(`http://localhost:${RT}/cases/${caseId}/questionnaire`); await settle(p); await p.waitForTimeout(1500);
    const t = await shown(p); const bad = [...new Set([...(t.match(new RegExp(CODE, "g")) ?? []), ...(t.match(new RegExp(TEAM, "gi")) ?? [])])];
    step("QA-76 client 390px: the client's questionnaire shows no decision code or team word", bad.length === 0, bad.join(", "));
    step("QA-76 client 390px: no lower-case \"About representative\"", !/About representative/.test(t), (t.match(/About .{0,30}/g) ?? []).join(" | "));
    await p.screenshot({ path: path.join(SHOTS, "client-390.png"), fullPage: true }); await p.context().close(); }
  // the API refusal words for a copy that is not proven (fill-case.ts lock)
  const fr = await call(RT, "GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER);
  const fx = JSON.stringify(fr.body ?? "");
  step("QA-76 API: the case's forms list carries no decision code or team word", fr.status === 200 && !CODE.test(fx) && !TEAM.test(fx), [...new Set([...(fx.match(new RegExp(CODE, "g")) ?? []), ...(fx.match(new RegExp(TEAM, "gi")) ?? [])])].join(", "));

  // ================================================================ Part B: C4.2 by keyboard
  await call(WK, "POST", "/demo/reset", { confirm: "RESET" }, "user-A");
  step("setup: Load sample (C4.2 marking is under test, the sample is not)", (await call(WK, "POST", "/demo/load", undefined, "user-A")).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const L = (await call(WK, "GET", `/combinations/${wp}/fact-sources`, undefined, "user-A")).body;
  const askable = L.facts.filter((f) => f.role === "principal" && !f.prequalification && f.source === "CLIENT" && f.placed && !f.clientOnly);
  const [f1, f2, f3] = askable;
  const pq = () => Number(sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification and status='DRAFT'`));
  for (const w of [400, 1024]) {
    const p = await page(WK, "user-A", w);
    await p.goto(`http://localhost:${WK}/c/${wp}/questionnaires?role=principal`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(p);
    const all = p.getByRole("button", { name: "Open all sections" }); if (await all.count()) { await all.click(); await settle(p); }
    await noH(p, `Questionnaires ${w}px`);
    const fact = w === 400 ? f1 : f2;
    const det = p.locator(`[data-questions] tr[data-fact="${fact.fact}"]`).first().locator('button[aria-label^="Details of"]');
    step(`C4.2 ${w}px: the row's Details button is visible without sideways scroll`, await det.isVisible() && await det.evaluate((e) => { const r = e.getBoundingClientRect(); return r.right <= window.innerWidth + 1 && r.left >= 0; }));
    await det.focus(); await p.keyboard.press("Enter"); await p.locator("[data-fact-drawer]").waitFor();
    // keyboard only: Tab to the tick, Space, Tab to the reason, type, then Save
    let on = null; for (let i = 0; i < 40 && !on; i++) { await p.keyboard.press("Tab"); on = await p.evaluate(() => document.activeElement?.hasAttribute("data-pq-tick") ? "tick" : null); }
    step(`C4.2 ${w}px keyboard: Tab reaches the pre-qualification tick in the drawer`, on === "tick");
    await p.keyboard.press("Space");
    step(`C4.2 ${w}px keyboard: Space ticks it`, await p.locator("[data-pq-tick]").isChecked());
    await p.locator('section[aria-labelledby="d-pq"] textarea').fill("Sample: qa keyboard walk");
    await p.screenshot({ path: path.join(SHOTS, `c42-drawer-${w}.png`) });
    if (w === 1024) await axe(p, "C4.2 drawer ticked 1024 px");
    const before = pq();
    const save = p.locator("[data-drawer-save]");
    await save.dblclick().catch(() => {}); // a person double-clicks Save
    await p.locator("[data-fact-drawer]").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
    await settle(p); await p.waitForTimeout(800);
    const rows = Number(sql(`select count(*) from fact_source where combination_id='${wp}' and lineage_key='principal|${fact.fact}' and status='DRAFT'`));
    step(`C4.2 ${w}px: a double click on Save writes one draft row, the count rises by one`, rows === 1 && pq() === before + 1, { rows, before, after: pq() });
    const focusAfter = await p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName} ${a.getAttribute("aria-label") ?? a.textContent?.slice(0, 40)}` : null; });
    step(`QA-123 C4.2 ${w}px keyboard: after Save, focus returns to the row's Details button`, /Details of/.test(focusAfter ?? ""), focusAfter);
    await p.context().close();
  }
  // bulk toast words (reviewer of #197 saw "on on")
  { const p = await page(WK, "user-A", 1440);
    await p.goto(`http://localhost:${WK}/c/${wp}/questionnaires?role=principal`); await p.locator("[data-source-strip]").waitFor(); await settle(p);
    const all = p.getByRole("button", { name: "Open all sections" }); if (await all.count()) { await all.click(); await settle(p); }
    await p.locator(`[data-questions] tr[data-fact="${f3.fact}"]`).first().locator("[data-row-tick]").check();
    await p.locator("[data-bulk-pq]").selectOption("on"); await settle(p); await p.waitForTimeout(1200);
    const toast = (await p.locator('[role="status"], [aria-live]').allInnerTexts()).join(" | ").replace(/\s+/g, " ");
    step("QA-124 C4.2 bulk: the toast reads in plain words (no doubled word)", !/\b(\w+) \1\b/i.test(toast) && /Pre-qualification/i.test(toast), toast.slice(0, 200));
    await p.screenshot({ path: path.join(SHOTS, "c42-bulk-toast-1440.png") });
    await p.context().close(); }
  // two tabs on one row: the second save from an old version is refused in words, nothing lost
  { const fresh = (await call(WK, "GET", `/combinations/${wp}/fact-sources`, undefined, "user-A")).body.facts.find((f) => f.role === "principal" && f.fact === f1.fact);
    const a = await call(WK, "PUT", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent(f1.fact)}`, { prequalification: false, version: fresh.version }, "user-A");
    const s = await call(WK, "PUT", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent(f1.fact)}`, { prequalification: true, version: fresh.version }, "user-A");
    step("C4.2 two tabs: the first save goes through", a.status < 300, a.status);
    step("C4.2 two tabs: the second, from the old version, is refused 409 in words", s.status === 409 && typeof s.body?.detail === "string" && !CODE.test(s.body.detail), `${s.status} ${s.body?.detail}`);
    const cur = (await call(WK, "GET", `/combinations/${wp}/fact-sources`, undefined, "user-A")).body.facts.find((f) => f.role === "principal" && f.fact === f2.fact);
    const both = await Promise.all([0, 1].map((i) => call(WK, "PUT", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent(f2.fact)}`, { prequalification: i === 0, version: cur.version }, "user-A")));
    step("QA-125 C4.2 concurrency: two saves at once on a row with a draft give one success and one 409 in words (not 404 reset)", both.map((x) => x.status).sort().join() === "200,409", both.map((x) => `${x.status} ${x.body?.detail ?? ""}`).join(" | "));
    const sme = await call(WK, "PUT", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent(f3.fact)}`, { prequalification: false, version: 1 }, "user-C");
    step("C4.2 wrong role: the content reviewer cannot change a tick (403)", sme.status === 403, `${sme.status} ${sme.body?.detail}`); }
  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
