// qa explore on main a9fe60c0, 29 Oct evening: what had no qa evidence yet. (1) The run card's cost words after the
// QA-97 fix (statedUsd: the about and at most its plan stated), against the finder dialog's words and the other pages that
// show a cost (C11.8, P-110, P-123). (2) Shared library › Forms and the form finder in plain words (C11.11, C3.12, C11.15,
// PRODUCT §4). (3) Program structure and Immigration programs at 1024 and 1440 px (C11.10, C11.17): no sideways scroll,
// no cut words, axe clean, no system values. Finder runs only in Replay or Rules; the live plan is read, never started
// (plans are free). Isolated copy only, US$0. Loads its own sample (reset first).
// NEVER click "Find forms with AI (about … · at most …)": it starts a LIVE run in one click (P-125) on any copy, with no
// live switch (this check did once, 29 Oct: US$0.27). A Rules find is made through the API first, so the Forms tab offers
// Find again (the dialog). The ledger must not grow: the check stops at once if it does.
//   zsh studio/tools/isolated.sh qa_ex 4473 start && node studio/tests/qa/check_qa_explore_1029.cjs 4473 xr_studio_qa_ex
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4473), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_qa_ex";
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-29-explore"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const api = async (p, { method = "GET", actor = "user-A", data } = {}) => {
  const h = { "content-type": "application/json" }; if (actor) h["x-actor"] = actor;
  const r = await fetch(`${BASE}/api${p}`, { method, headers: h, body: data === undefined ? undefined : JSON.stringify(data) });
  const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b };
};
// System values and retired words that must not reach a person (PRODUCT §4, P-63).
const TECH = /\b(P|D)-\d+\b|nodeKey|undefined|\bnull\b|NaN|\[object|canonical|\b[a-z]+_[a-z_]+\.[a-z_]+\b|\b(person|case)\.[a-z_]+\b|\bbox(es)?\b/i;
const techHits = (t) => [...new Set((t.match(new RegExp(TECH.source, "gi")) ?? []))].slice(0, 8);

async function layout(page) {
  return page.evaluate(() => {
    const d = document.documentElement, sideways = d.scrollWidth - d.clientWidth;
    const cut = [];
    for (const el of document.querySelectorAll("main *")) {
      const s = getComputedStyle(el);
      if (!el.childElementCount && el.textContent.trim() && el.clientWidth > 2 && s.position !== "absolute" && (s.overflow === "hidden" || s.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 1) cut.push(el.textContent.trim().slice(0, 60));
    }
    const over = [];
    const vw = d.clientWidth;
    for (const el of document.querySelectorAll("main button, main a, main [role=tab], main input, main select")) { const r = el.getBoundingClientRect(); if (r.width && (r.right > vw + 1 || r.left < -1)) over.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40)); }
    return { sideways, cut: cut.slice(0, 10), cutN: cut.length, over: over.slice(0, 10) };
  });
}
async function axe(page) { const r = await new AxeBuilder({ page }).include("main").analyze(); return r.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}×${v.nodes.length}`); }
async function look(page, name, w, { axeOn = true } = {}) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
  const text = await page.locator("main").innerText();
  fs.writeFileSync(path.join(SHOTS, `${name}-${w}.txt`), text);
  await page.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`), fullPage: true });
  const l = await layout(page), a = axeOn ? await axe(page) : [];
  step(`${name} @${w}: no sideways scroll, no control off screen`, l.sideways <= 0 && !l.over.length, { sideways: l.sideways, over: l.over });
  step(`${name} @${w}: no words cut off`, l.cutN === 0, l.cut);
  if (axeOn) step(`${name} @${w}: axe clean (serious, critical)`, !a.length, a);
  step(`${name} @${w}: no system values or retired words`, !techHits(text).length, techHits(text));
  return text;
}

(async () => {
  const served = (await api("/session")).body?.workspace?.id;
  if (!served || sql(`select count(*) from workspace where id='${served}'`) !== "1") { console.error(`STOP  ${DB} is not the database of :${PORT}`); process.exit(2); }
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const load = await api("/demo/load", { method: "POST" });
  step("setup: sample loaded", load.status < 300, load.status);
  const logText = JSON.stringify(load.body?.log ?? "");
  step("Load sample summary: no retired words (canonical, box)", !/canonical|\bbox/i.test(logText), techHits(logText));

  const browser = await chromium.launch();
  for (const w of [1440, 1024]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript(() => { try { localStorage.setItem("studio.actor", "user-A"); } catch {} });
    const page = await ctx.newPage();
    // ---------------------------------------------------------------- Immigration programs and Program structure
    await page.goto(`${BASE}/`); await page.getByText("Retail ›").first().waitFor({ timeout: 30000 });
    await look(page, "programs-cards", w);
    await page.getByRole("button", { name: "List" }).first().click();
    await look(page, "programs-list", w);
    await page.getByRole("button", { name: "Cards" }).first().click();
    await page.getByRole("tab", { name: /Corporate and employers/ }).click().catch(() => {});
    await look(page, "programs-corporate", w);
    await page.goto(`${BASE}/structure`); await page.waitForLoadState("networkidle");
    await look(page, "structure-tree", w);
    const listBtn = page.getByRole("button", { name: /^List/ }).first();
    if (await listBtn.count()) { await listBtn.click(); await look(page, "structure-list", w); }
    // ---------------------------------------------------------------- Shared library › Forms
    await page.goto(`${BASE}/library/forms`); await page.waitForLoadState("networkidle");
    await look(page, "library-forms", w);
    for (const tab of ["Forms", "Guides", "Checklists"]) {
      const t = page.getByRole("tab", { name: new RegExp(`^${tab}`) });
      if (await t.count()) { await t.first().click(); await look(page, `library-forms-${tab.toLowerCase()}`, w, { axeOn: false }); }
    }
    const first = page.locator("main table tbody tr").first();
    if (await first.count()) { await first.locator("a, button").first().click(); await page.waitForTimeout(800);
      const drawer = await page.locator("[role=dialog]").innerText().catch(() => "");
      fs.writeFileSync(path.join(SHOTS, `library-forms-drawer-${w}.txt`), drawer);
      await page.screenshot({ path: path.join(SHOTS, `library-forms-drawer-${w}.png`) });
      step(`library form drawer @${w}: no system values`, drawer && !techHits(drawer).length, techHits(drawer)); await page.keyboard.press("Escape"); }
    await ctx.close();
  }

  // -------------------------------------------------------------------- the finder and the run card (1440)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`); await page.getByText("Retail ›").first().waitFor({ timeout: 30000 });
  await page.getByText("Study permit", { exact: true }).first().click();
  await page.waitForURL(/\/c\//); const cid = page.url().match(/\/c\/([^/?]+)/)[1];
  const LEDGER = path.join(__dirname, "..", "..", "..", "p2", "ledger", "spend.jsonl");
  const ledgerLines = () => fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).length;
  const ledger0 = ledgerLines();
  const noSpend = (where) => { if (ledgerLines() !== ledger0) { console.error(`STOP  the ledger grew at ${where}: a paid call was made`); process.exit(3); } };
  await page.goto(`${BASE}/c/${cid}/forms`); await page.waitForLoadState("networkidle");
  await look(page, "study-forms-before-find", 1440);
  const offer = await page.locator("[data-find-forms]").first().innerText().catch(() => "");
  step("finder offer before any find: names about and at most on the button", /about US\$\d+\.\d\d · at most US\$\d+\.\d\d/.test(offer), offer);
  const rp = await api(`/combinations/${cid}/forms/find/plan`, { method: "POST", data: { mode: "rules" } });
  const rr = await api(`/combinations/${cid}/forms/find`, { method: "POST", data: { mode: "rules", planSha256: rp.body?.plan_sha256, idempotencyKey: `qa-explore-${Date.now()}` } });
  step("setup: a Rules find (US$0) through the API", rr.status < 300 && rp.body?.totals?.worst_usd === 0, { plan: rp.body?.totals, run: rr.status });
  for (let i = 0; i < 60; i++) { const v = await api(`/runs/${rr.body?.id}`); if (v.body?.status && !["queued", "running"].includes(v.body.status)) break; await new Promise((r) => setTimeout(r, 1000)); }
  noSpend("the Rules find");
  await page.goto(`${BASE}/c/${cid}/forms`); await page.waitForLoadState("networkidle");
  await look(page, "study-forms", 1440);
  const again = page.locator("[data-find-forms=again]");
  step("finder: after a find, the one button is Find again (opens the plan)", await again.count() === 1, await again.count());
  if (!(await again.count())) { await browser.close(); console.log(`\n${pass} passed, ${fail} failed (stopped: no Find again)`); return; }
  await again.click(); await page.locator("[data-find-dialog]").waitFor();
  const words = {};
  for (const [m, label] of [["replay", "Saved"], ["rules", "Rules only"], ["live", "Live"]]) {
    await page.getByLabel(new RegExp(label)).check(); await page.waitForTimeout(300);
    await page.locator("[data-find-plan], [role=dialog] .text-text-danger, [role=dialog] [role=alert]").first().waitFor({ timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    words[m] = (await page.locator("[role=dialog]").innerText()).replace(/\s+/g, " ");
    fs.writeFileSync(path.join(SHOTS, `finder-dialog-${m}.txt`), words[m]);
    await page.screenshot({ path: path.join(SHOTS, `finder-dialog-${m}.png`) });
  }
  const liveCost = (words.live.match(/(About US\$[\d.]+ · )?at most US\$[\d.]+[^.]*\./i) ?? [""])[0];
  step("finder dialog, AI now: states about and at most before Start", /at most US\$\d/i.test(words.live), liveCost);
  step("finder dialog, saved answers: says US$0 and that no AI is called", /US\$0/.test(words.replay), words.replay.slice(0, 300));
  step("finder dialog description fits the mode: Rules only does not say AI reads the pages", !/AI reads the application/.test(words.rules), words.rules.slice(0, 220));
  // Start in Rules only (never AI now): the run card's words.
  await page.getByLabel(/Rules only/).check(); await page.waitForTimeout(1500);
  const planWords = await page.locator("[data-find-cost]").innerText().catch(() => "");
  if (!/US\$0/.test(planWords)) { console.error(`STOP  the plan shown before Start is not US$0: ${planWords}`); process.exit(3); }
  await page.getByRole("button", { name: "Start" }).click();
  const card = page.locator("[data-run-cost]").first();
  await card.waitFor({ timeout: 30000 }).catch(() => {});
  const cardActive = await card.innerText().catch(() => "");
  await page.locator("[data-run-status=completed], [data-run-status=partial], [data-run-status=failed], [data-run-status=blocked]").first().waitFor({ timeout: 90000 }).catch(() => {});
  const cardEnd = await card.innerText().catch(() => "");
  const line = await page.locator("[data-run-line]").first().innerText().catch(() => "");
  await page.screenshot({ path: path.join(SHOTS, "run-card-rules.png"), fullPage: true });
  // The card closes when the run ends (FinderPanel onEnded), so its words are read while it runs.
  step("run card (rules): US$0 in words", /US\$0 · rules only/.test(cardActive || cardEnd), { cardActive, cardEnd, line });
  noSpend("the Rules find from the dialog");
  const runs = await api(`/combinations/${cid}/forms/find`).catch(() => null);
  const runId = runs?.body?.run?.id;
  // The same run on AI work: the cost words there.
  await page.goto(`${BASE}/ai`); await page.waitForLoadState("networkidle");
  const aiText = await look(page, "ai-work", 1440);
  const aiRow = (aiText.split("\n").find((l) => /Find forms|Form finder|form finder/i.test(l)) ?? "");
  step("AI work list: the finder run's cost in the run card's words (about / at most / spent)", /about|at most|spent/i.test(aiText) && !/\/ US\$/.test(aiText), aiText.match(/US\$[\d.]+ \/ US\$[\d.]+/g)?.slice(0, 3));
  if (runId) {
    const v = await api(`/runs/${runId}`);
    step("run API: about and at most read back from the plan (rules: 0)", v.body?.usd && v.body.usd.worst === 0, v.body?.usd);
    await page.goto(`${BASE}/ai/${runId}`); await page.waitForLoadState("networkidle");
    const det = await look(page, "ai-run", 1440);
    step("AI work run page: cost words match the card", !/worst case/i.test(det) || /at most/i.test(det), (det.match(/[^\n]*US\$[^\n]*/g) ?? []).slice(0, 4));
  }
  // The live plan through the API: about in the plan and its checksum, nothing spent.
  const before = sql("select count(*) from ai_batch");
  const plan = await api(`/combinations/${cid}/forms/find/plan`, { method: "POST", data: { mode: "live" } });
  step("live plan: free, states about_usd and worst_usd", plan.status < 300 && "about_usd" in (plan.body?.totals ?? {}) && sql("select count(*) from ai_batch") === before, plan.body?.totals);
  // Keyboard: the dialog opens and closes with the keyboard, focus returns to the button.
  await page.goto(`${BASE}/c/${cid}/forms`); await page.waitForLoadState("networkidle");
  await page.locator("[data-find-forms=again]").focus(); await page.keyboard.press("Enter");
  await page.locator("[data-find-dialog]").waitFor({ timeout: 10000 }).catch(() => {});
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  const back = await page.evaluate(() => document.activeElement?.getAttribute("data-find-forms"));
  step("finder dialog: Escape closes it and focus returns to its button", back !== null && back !== undefined, back);
  noSpend("the end");
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
})().catch((e) => { console.error(e); process.exit(1); });
