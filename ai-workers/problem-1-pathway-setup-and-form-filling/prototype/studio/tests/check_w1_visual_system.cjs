// W1-visual-system on Immigration programs (agreed 27 Oct; concept VS-1…VS-9, board design/draft-visual-system.html):
// level colours and marks, the Trail (context in level colours, identity navy, wrapping whole), the Pathway accent
// stripe on bands and cards, the next step filled exactly when it counts in "need you", the sticky Pathway band in the
// List, the dark theme, and 390 px. Sample inputs plus one saved AI replay (US$0) and one released-but-Not-ready
// combination so "need you" is not zero. Screenshots at 1440, 1024 and 390 px into
// product/screens/W1-visual-system/screenshots/programs/, axe (WCAG 2.2 AA) on each, light and dark. No model call.
//   zsh studio/tools/isolated.sh screens_vs 4449 start && node studio/tests/check_w1_visual_system.cjs 4449 xr_studio_screens_vs
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4449);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-visual-system", "screenshots", "programs"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector("[data-view]"), null, { timeout: 30000 });
  const open = async (qs = "") => { await p.goto(`${BASE}/${qs}`); await ready(); await p.waitForTimeout(300); };
  const theme = async (t) => { await p.evaluate((x) => { document.documentElement.dataset.theme = x; }, t); await p.waitForTimeout(250); };
  // The contrast of a primary fill's text at rest and on hover, the fill composited over the first opaque background
  // behind it: one ordinary Button and one filled next step.
  const contrastOf = (el) => {
    const px = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    let under = [255, 255, 255];
    for (let a = el.parentElement; a; a = a.parentElement) { const c = px(getComputedStyle(a).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] === 1)) { under = c.slice(0, 3); break; } }
    const f = px(getComputedStyle(el).backgroundColor), al = f.length === 4 ? f[3] : 1, fill = f.slice(0, 3).map((v, i) => v * al + under[i] * (1 - al));
    const [hi, lo] = [lum(px(getComputedStyle(el).color)), lum(fill)].sort((x, y) => y - x);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  };
  const primaryHover = async () => {
    const out = [];
    for (const sel of ["button.bg-primary:not([data-filled])", "[data-filled].bg-primary"]) {
      const el = p.locator(sel).first(); if (!(await el.count())) continue;
      await p.mouse.move(0, 0); await p.waitForTimeout(150);
      const rest = await el.evaluate(contrastOf);
      await el.hover(); await p.waitForTimeout(250);
      out.push({ sel, rest, hover: await el.evaluate(contrastOf) });
    }
    await p.mouse.move(0, 0);
    return out;
  };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    for (const [w, h] of [[1024, 768], [390, 844]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(200);
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: true });
      step(`${w} px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), await p.evaluate(() => document.documentElement.scrollWidth));
    }
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup: sample inputs, one AI replay, one Not ready release
  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await api("/demo/load", { method: "POST" });
  const catOf = async () => (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body;
  const sv = (await catOf()).rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  for (let i = 0; i < 60; i++) { if ((await catOf()).rows.find((x) => x.nodeKey === sv.nodeKey).aiProposals > 0) break; await p.waitForTimeout(500); }
  const ssKey = "individual.work_permits.open.spouse_student";
  const ss = (await api("/combinations", { method: "POST", data: { nodeKey: ssKey } })).body.combination;
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const ssSme = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (ssSme.length) await api(`/combinations/${ss.id}/signoff`, { method: "POST", actor: "user-C", data: { items: ssSme, action: "signed" } });
  await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: (await api("/draft")).body.changes } });
  // A long sub-category name, to see the identity wrap whole.
  const longSub = "Applicants who are currently living outside of Canada with family members";
  await api("/structure/path", { method: "POST", data: { pathwayType: "INDIVIDUAL", pathway: { key: "retail.temporary_residence" }, program: { key: "individual.visitors" }, category: { label: "Long-stay parent visit" }, subCategory: { label: longSub } } });
  const cat = await catOf();
  const waiting = cat.rows.filter((r) => r.needsYou);
  step("setup: two combinations wait on a person (AI proposals; released but Not ready)", waiting.length >= 2, waiting.map((r) => r.label).join(", "));

  // ======================================================== cards: level colours, marks, Trail, filled next steps
  await open("?v=cards");
  const svCard = p.locator(`article[data-node="${sv.nodeKey}"]`);
  const colours = await svCard.evaluate((a) => { const parts = [...a.querySelectorAll("[data-trail] [data-trail-parts] > span > span:not([aria-hidden])")].map((x) => getComputedStyle(x).color); const title = getComputedStyle(a.querySelector("h3 button")).color; return { parts, title }; });
  step("VS-1/VS-3: a card's context Trail is in level colours (Pathway type grey, Pathway slate, Program teal)", colours.parts.join() === [rgb("#595959"), rgb("#37506e"), rgb("#0b6477")].join(), colours.parts.join(" | "));
  step("VS-1: the category title is navy with the ◆ mark; a sub-category gets ◇", colours.title === rgb("#043a73") && await svCard.locator('[data-level-mark="category"]').count() === 1 && await p.locator(`article[data-node="${ssKey}"] [data-level-mark="subCategory"]`).count() === 1, colours.title);
  const filled = await p.locator("article[data-node] [data-filled]").count();
  step("VS-5: a next step is filled exactly when the combination counts in 'need you' (same rule as the count)", filled === waiting.length && await p.locator(`article[data-node="${sv.nodeKey}"] [data-filled]`).count() === 1, `${filled} filled, ${waiting.length} waiting`);
  step("VS-5 fail-guard: a Not started card's Start setup is outlined, not filled", await p.locator("article[data-node]").filter({ hasText: "Not started" }).locator("[data-filled]").count() === 0);
  const band = await p.locator("[data-section] h2[data-band]").first().evaluate((h) => ({ w: getComputedStyle(h).borderLeftWidth, c: getComputedStyle(h).borderLeftColor }));
  step("VS-9: each Pathway band carries its accent stripe (4 px; Sample accents from the team palette)", band.w === "4px" && band.c === rgb("#50d0ff"), JSON.stringify(band));
  const longCard = p.locator("article[data-node]").filter({ hasText: longSub });
  const wrap = await longCard.evaluate((a) => { const id = a.querySelector("h3 + p"); return { h: Math.round(id.getBoundingClientRect().height), cut: id.scrollWidth > id.clientWidth + 1 }; });
  step("VS-3: a long identity wraps whole onto more lines, never cut", wrap.h > 22 && !wrap.cut, JSON.stringify(wrap));
  await state("cards-light");

  // ======================================================== List: the Pathway band stays in view; the Trail in one line
  await open("?v=list");
  const listBand = await p.locator("[data-group]").first().evaluate((g) => ({ pos: getComputedStyle(g).position, shadow: getComputedStyle(g).boxShadow }));
  step("VS-3 A: the List's Pathway band is sticky and carries the stripe", listBand.pos === "sticky" && /80, 208, 255/.test(listBand.shadow), JSON.stringify(listBand));
  const rowTrail = await p.locator(`[role="row"][data-node="${ssKey}"] [data-trail]`).textContent();
  step("C11.10 BR-7: a List row carries the full five-part Trail", rowTrail.startsWith(cat.rows.find((r) => r.nodeKey === ssKey).trail.join(" › ")), rowTrail);
  await state("list-light");

  // ======================================================== dark theme: the level colours switch with it
  await open("?v=cards"); await theme("dark");
  const darkTitle = await svCard.locator("h3 button").evaluate((x) => getComputedStyle(x).color);
  step("VS-8: in the dark theme the levels use their dark values (category navy becomes light blue)", darkTitle === rgb("#9ccbff"), darkTitle);
  const darkHover = await primaryHover();
  step("Button primary hover (dark): white text stays well above 4.5:1 on hover (at least 7:1)", darkHover.every((x) => x.hover >= 7), JSON.stringify(darkHover));
  await state("cards-dark");
  await theme("light");
  // Button primary hover (Lead, 28 Oct): the fill goes darker on hover, never lighter, so its text keeps its contrast.
  const lightHover = await primaryHover();
  step("Button primary hover pass (light): white text is at least 7:1 on hover", lightHover.length >= 2 && lightHover.every((x) => x.hover >= 7), JSON.stringify(lightHover));
  step("Button primary hover fail-guard (light): hover never lowers the contrast of the rest state (it went to 4.85:1 with primary/90)", lightHover.every((x) => x.hover >= x.rest), JSON.stringify(lightHover));

  // ======================================================== the approver: nothing filled they cannot do
  await as("user-B"); await open("?v=cards");
  step("BR-15 read-only: the approver sees no filled author step", await p.locator("article[data-node] [data-filled]").evaluateAll((x) => x.every((e) => ["review_proposals", "see_missing", "see_new_edition", "release", "view_progress"].includes(e.getAttribute("data-next-step")))));
  await as("user-A");

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
