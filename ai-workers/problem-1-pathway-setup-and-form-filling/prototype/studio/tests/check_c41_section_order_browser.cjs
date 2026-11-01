// F6 / C4.1 (runtime lane; P-216 answer 1): an author changes the combination's section order on the Questionnaires tab
// with Move up and Move down on each section header, walked in a real browser and by keyboard. The keyboard stays on the
// pressed button after the section moves; one Undo puts it back; the first and last buttons are greyed with the reason
// in words; the Approver sees no move buttons; the draft names the move for Review. Screenshots at 1440 and 1024 in
// screens/W1-questions-and-documents/screenshots/c41-section-order/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c41 4432 start && node studio/tests/check_c41_section_order_browser.cjs 4432 xr_studio_runtime_c41
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4432), DB = process.argv[3] ?? "xr_studio_runtime_c41";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "c41-section-order"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); let body = null; try { body = await r.json(); } catch { body = null; } return { status: r.status(), body }; };
  // Waits fail loudly: a page that never settles is a failure, not a pass.
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(300); };
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

  // ======================================================== setup
  await p.goto(BASE); await p.evaluate(() => { localStorage.setItem("xr-actor", "user-A"); });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const order = async () => (await api(`/combinations/${wp}/section-order`)).body.order;
  const shownOrder = async () => p.locator("[data-section]:not([data-section=unasked])").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-section")));
  const go = async () => { await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-move-buttons]").first().waitFor(); await settle(); };
  const o0 = await order();
  step("setup: the work permit chooses at least three sections", o0.length >= 3, o0.map((x) => x.title).join(", "));
  await go();
  const shown0 = await shownOrder();
  step("C4.1: the tab shows the chosen sections in the combination's order", o0.map((x) => x.key).join() === shown0.filter((k) => o0.some((x) => x.key === k)).join(), shown0.join());

  // ======================================================== the ends say why
  const firstSec = p.locator(`[data-section="${o0[0].key}"]`), lastSec = p.locator(`[data-section="${o0[o0.length - 1].key}"]`);
  const upFirst = firstSec.locator('[data-move="up"]');
  step("C4.1 R3 fail: the first section's Move up is greyed, with the reason in words", await upFirst.isDisabled() && /already the first section/.test(await firstSec.locator('[data-move-why]').first().getAttribute("data-move-why") ?? ""), await firstSec.locator('[data-move-why]').first().getAttribute("title"));
  step("C4.1 R3 fail: the last section's Move down is greyed, with the reason in words", await lastSec.locator('[data-move="down"]').isDisabled() && /already the last section/.test(await lastSec.locator('[data-move-why]').last().getAttribute("title") ?? ""));
  step("C4.1: a screen reader hears the section and the reason in the button's name", /Move up: .+ \(".+" is already the first section\.\)/.test(await upFirst.getAttribute("aria-label") ?? ""), await upFirst.getAttribute("aria-label"));
  await state("start");

  // ======================================================== keyboard: Move down on the first section
  const downFirst = firstSec.locator('[data-move="down"]');
  await downFirst.focus(); await p.keyboard.press("Enter");
  await p.locator("[data-undo-toast]").waitFor({ timeout: 15000 }); await settle();
  const o1 = await order();
  step("C4.1 R1 pass: Enter on Move down moves the first section to second, saved", o1[1].key === o0[0].key && o1[0].key === o0[1].key, o1.slice(0, 3).map((x) => x.title).join(", "));
  const shown1 = await shownOrder();
  step("C4.1: the tab shows the new order at once", shown1.indexOf(o0[0].key) === shown1.indexOf(o0[1].key) + 1, shown1.slice(0, 3).join());
  const focused = await p.evaluate(() => { const a = document.activeElement; return `${a?.closest("[data-section]")?.getAttribute("data-section")}|${a?.getAttribute("data-move")}`; });
  step("C4.1: the keyboard stays on the pressed button after the section moves", focused === `${o0[0].key}|down`, focused);
  const toast = await p.locator("[data-undo-toast]").innerText();
  step("C4.1: the confirmation says the new place and that it is for every person", /moved down: now 2 of \d+ sections, for every person/.test(toast), toast);
  const d = (await api(`/combinations/${wp}`)).body.draft;
  const line = d.changes.find((x) => x.kind === "Section order");
  step("C4.1 R1: the draft names the move for Review, in words", !!line && line.label.includes(`"${o0[0].title}" now 2nd`), line?.label);
  await state("moved");

  // ======================================================== review Major 1: the focus is kept once, not taken after
  const third = p.locator(`[data-section="${o0[2].key}"] button[aria-expanded]`);
  await third.focus(); const y0 = await p.evaluate(() => window.scrollY);
  await p.keyboard.press("Enter"); await settle();
  const after = await p.evaluate(() => ({ expanded: document.activeElement?.getAttribute("aria-expanded"), section: document.activeElement?.closest("[data-section]")?.getAttribute("data-section"), move: document.activeElement?.getAttribute("data-move") }));
  step("C4.1 Major 1 fail-guard: after a move, Enter on another section's header keeps focus on that header (not the Move button)", after.section === o0[2].key && !after.move && after.expanded === "true", JSON.stringify(after));
  step("C4.1 Major 1 fail-guard: and the page does not jump back to the moved section", Math.abs((await p.evaluate(() => window.scrollY)) - y0) < 200, `${y0} → ${await p.evaluate(() => window.scrollY)}`);
  await p.getByRole("button", { name: /Open all sections|Close all sections/ }).click(); await settle();
  step("C4.1 Major 1 fail-guard: Open all sections keeps focus on its own button", /Open all sections|Close all sections/.test(await p.evaluate(() => document.activeElement?.textContent ?? "")), await p.evaluate(() => document.activeElement?.textContent ?? ""));

  // ======================================================== Undo
  await p.locator("[data-undo-toast]").getByRole("button", { name: "Undo" }).click();
  await p.locator("[data-undo-toast]").waitFor({ state: "detached", timeout: 15000 }); await settle();
  const o2 = await order();
  step("C4.1 pass: Undo puts the section back in its place", o2.map((x) => x.key).join() === o0.map((x) => x.key).join(), o2.slice(0, 3).map((x) => x.title).join(", "));
  step("C4.1: after Undo the draft has no order line left", !(await api(`/combinations/${wp}`)).body.draft.changes.some((x) => x.kind === "Section order"));

  // ======================================================== a stale tab is refused in words
  await api(`/combinations/${wp}/sections/${o0[2].key}/move`, { method: "POST", data: { direction: "up", seen: o0.map((x) => x.key) } });
  await p.locator(`[data-section="${o0[1].key}"] [data-move="up"]`).click();
  await p.locator("[data-move-refused]").getByText(/was not moved: The sections were reordered since you opened this tab\. The order shown now is the current one/).waitFor({ timeout: 15000 }); await settle();
  step("C4.1 m2: the refusal is titled for a section, not for rows", (await p.getByText("Section not moved").count()) === 1 && (await p.getByText(/row.? not changed/).count()) === 0);
  const o3 = await order();
  step("C4.1 R2 fail: a move from a stale tab is refused in words and the order shown refreshes", o3[1].key === o0[2].key && (await shownOrder()).indexOf(o0[2].key) < (await shownOrder()).indexOf(o0[1].key), o3.slice(0, 3).map((x) => x.title).join(", "));
  await state("stale-refused");

  // ======================================================== row menu points to the header
  const menuBtn = p.locator("[data-question]").first().getByRole("button", { name: /actions|More/i }).first();
  if (await menuBtn.count()) {
    await menuBtn.click();
    const menuText = await p.getByRole("menu").innerText();
    step("C4.1: the row menu's greyed Move up or down says the section moves on its header", /use Move up or Move down on its header/.test(menuText), menuText.replace(/\n/g, " | "));
    await p.keyboard.press("Escape");
  }

  // ======================================================== the Approver sees no move buttons
  await p.evaluate(() => { localStorage.setItem("xr-actor", "user-B"); });
  await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-section]").first().waitFor(); await settle();
  step("C4.1 R1 fail: the Approver sees no Move up or Move down", (await p.locator("[data-move-buttons]").count()) === 0);
  const r = await api(`/combinations/${wp}/sections/${o3[1].key}/move`, { method: "POST", actor: "user-B", data: { direction: "up", seen: o3.map((x) => x.key) } });
  step("C4.1 R1 fail: and a direct call as the Approver is 403", r.status === 403, r.status);

  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
