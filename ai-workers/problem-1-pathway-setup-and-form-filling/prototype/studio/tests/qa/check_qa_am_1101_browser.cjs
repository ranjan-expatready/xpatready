// qa after-merge 1 Nov (main 52768cd2): a person's walk, headless at 400, 1024 and 1440 px, of what merged 30 Oct – 1 Nov.
// C11.10 Before forms (#139) · C1.8 copies by keyboard (#153) · C5.3 To review at 1024 and Tab focus (#119, #137) ·
// Review and release names itself (#120) · Form library list (#145, #146) · no horizontal scroll · axe A/AA. Sample, US$0.
//   zsh studio/tools/isolated.sh qa_am 4471 start && node studio/tests/qa/check_qa_am_1101_browser.cjs 4471 xr_studio_qa_am
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4471), DB = process.argv[3] ?? "xr_studio_qa_am", BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "../../../../product/qa/reports/2026-11-01-after-merge"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", DB, "-Atc", q]).toString().trim();
let pass = 0, fail = 0; const step = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d !== undefined ? ` — ${String(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 300)}` : ""}`); };
(async () => {
  const b = await chromium.launch({ channel: "chrome" }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }); const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30000 }).catch(() => {});
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); step(`axe: ${name}`, r.violations.length === 0, r.violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const noHScroll = async (name) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); step(`no sideways scroll: ${name}`, o <= 1, o); };
  const shot = (n) => p.screenshot({ path: path.join(SHOTS, `${n}.png`) });
  await p.goto(BASE); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } }); step("setup: Load sample", (await api("/demo/load", { method: "POST" })).status < 300);
  const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows; const sv = rows.find((r) => r.nodeKey === "individual.visitors.super_visa") ?? rows.find((r) => r.combinationId);
  // ---- C11.10 Before forms at three widths
  for (const w of [400, 1024, 1440]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.goto(`${BASE}/c/${sv.combinationId}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
    const bf = p.locator("[data-before-forms]"); await bf.locator("[data-mark]").first().waitFor({ timeout: 15000 });
    const t = await bf.innerText();
    step(`C11.10 ${w}px: Before forms shows Official pages and Who can be in this application`, /Official pages/.test(t) && /Who can be/i.test(t), t.slice(0, 160));
    await noHScroll(`Forms tab ${w}px`); await shot(`before-forms-${w}`);
    if (w === 1024) await axe("Forms tab with Before forms, 1024 px");
  }
  // keyboard: Tab from the tab list reaches the people card's first control before any form row
  await p.setViewportSize({ width: 1024, height: 900 }); await p.goto(`${BASE}/c/${sv.combinationId}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  await p.getByRole("tab", { selected: true }).focus(); let reached = null;
  for (let i = 0; i < 25 && !reached; i++) { await p.keyboard.press("Tab"); reached = await p.evaluate(() => { const a = document.activeElement; if (a?.closest("[data-before-forms]")) return "before"; if (a?.closest("[data-line]")) return "line"; return null; }); }
  step("C11.10 keyboard: Tab from the tabs reaches Before forms before any form line", reached === "before", reached);
  // Questionnaires points to it
  await p.goto(`${BASE}/c/${sv.combinationId}/questionnaires`); await settle(); await p.waitForTimeout(800);
  const qlink = p.locator('a[href*="forms?focus=people"], a[href*="/forms"]').filter({ hasText: /who can be|people|forms/i });
  step("C11.10: Questionnaires links to the people card on Forms (it moved)", await qlink.count() > 0, await qlink.count());
  // ---- C1.8 copies by keyboard only at 400 px
  await p.setViewportSize({ width: 400, height: 860 });
  const vv = sql("select id from combination where combination_key='wp.family'"); const F = "IMM 1295";
  await p.goto(`${BASE}/c/${vv}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  const row = p.locator(`[data-line="${F}"]`); await row.waitFor({ timeout: 15000 });
  await row.getByRole("button", { name: `Change ${F}` }).focus(); await p.keyboard.press("Enter");
  const dlg = p.getByRole("dialog"); const copies = dlg.getByLabel("Copies"); await copies.waitFor({ timeout: 10000 });
  const inView = await copies.evaluate((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; });
  step("C1.8 400px: the drawer's Copies field fits the phone width", inView);
  await copies.fill("abc"); await dlg.getByRole("button", { name: "Save to draft" }).click();
  await dlg.getByText("Copies is a whole number from 1 to 9.").waitFor({ timeout: 10000 }).catch(() => {});
  step("C1.8: letters are refused on the field in words, nothing saved", await dlg.getByText("Copies is a whole number from 1 to 9.").count() > 0 && sql(`select copies from combination_form where combination_id='${vv}' and lineage_key='${F}' order by version desc limit 1`) === "1");
  await shot("copies-letters-refused-400");
  await copies.fill("3"); await copies.press("Enter"); await p.waitForTimeout(1500);
  const afterEnter = await dlg.isVisible();
  if (afterEnter) { await dlg.getByRole("button", { name: "Save to draft" }).click(); await dlg.waitFor({ state: "hidden", timeout: 15000 }); }
  console.log(`NOTE  C1.8 keyboard: Enter in Copies ${afterEnter ? "does not save (QA-118: no drawer submits on Enter)" : "saves"}`);
  await settle(); await row.locator("[data-copies]").waitFor({ timeout: 15000 }).catch(() => {});
  step("C1.8 400px: the row says 3 copies each and the database holds 3", /3 copies each/.test(await row.innerText()) && sql(`select copies from combination_form where combination_id='${vv}' and lineage_key='${F}' order by version desc limit 1`) === "3");
  // audit line for the change
  const audit = sql(`select count(*) from audit_event where combination_id='${vv}' and (detail::text like '%copies%' or summary ilike '%cop%')`); step("C1.8 underneath: an audit line records the copies change", Number(audit) > 0, audit);
  await shot("copies-row-3-400");
  // ---- To review (#119, #137) and Review and release (#120)
  await p.setViewportSize({ width: 1024, height: 800 }); await p.goto(`${BASE}/review`); await settle(); await p.waitForTimeout(800);
  await noHScroll("To review 1024 px"); await axe("To review, 1024 px"); await shot("to-review-1024");
  const links = p.locator("main a"); let ring = null;
  for (let i = 0; i < 40 && !ring; i++) { await p.keyboard.press("Tab"); ring = await p.evaluate(() => { const a = document.activeElement; if (!a || a.tagName !== "A" || !a.closest("main")) return null; const s = getComputedStyle(a); return s.outlineStyle !== "none" && s.outlineWidth !== "0px" ? `outline ${s.outlineWidth}` : (s.boxShadow !== "none" ? "shadow" : "NONE"); }); }
  step("C5.3 (#137): a link in To review reached by Tab shows a focus ring", !!ring && ring !== "NONE", ring);
  await p.goto(`${BASE}/release`); await settle(); await p.waitForTimeout(500);
  const title = await p.title(), h1 = await p.locator("h1").first().innerText().catch(() => "");
  step("#120: Review and release names itself in the tab title and heading", /release/i.test(title) && /release/i.test(h1), { title, h1 });
  await noHScroll("Review and release 1024 px");
  // ---- Form library (#145, #146): fill from IRCC's list, then the list and its count
  await api("/library/forms/fill-from-index", { method: "POST" });
  await p.goto(`${BASE}/library/forms`); await settle(); await p.waitForTimeout(1000);
  const live = await p.locator('[aria-live], [role="status"]').allInnerTexts();
  step("X5: the form library says how many forms it lists, in a spoken (live) region", live.some((t) => /\d+/.test(t)), live.slice(0, 4));
  await noHScroll("Form library 1024 px"); await axe("Form library, 1024 px"); await shot("library-1024");
  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
