// W1-15 Questions and documents, slice 3 (runtime lane; board v2 frame 3, P-147): the Documents tab walked like a
// content publisher in a real browser. Person chips with counts; All · Always · Only if; Find a document…; rows of five
// things (Document · Who · When · Supplies · Status); the ⋯ menu whose greyed actions keep their reason as visible text;
// the drawer (facts it supplies about whom, taken out of the questionnaire; Copies, Translation, Validity window read-only
// Sample); Move down; Remove from checklist with Undo; an approver sees no edits. A pass and a fail per rule; screenshots
// at 1440 and 1024 in screens/W1-questions-and-documents/screenshots/slice3/, axe (WCAG 2.2 AA) on each state. US$0.
//   zsh studio/tools/isolated.sh runtime_w115e 4439 start && node studio/tests/check_w115_slice3_browser.cjs 4439 xr_studio_runtime_w115e
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4439), DB = process.argv[3] ?? "xr_studio_runtime_w115e";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "slice3"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const KEYS = /\b(case|person|relationship|organisation)\.[a-z_]+\b/;
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

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const go = async () => { await p.goto(`${BASE}/c/${wp}/documents`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-documents]").waitFor(); await settle(); };
  await go();
  const V = (await api(`/combinations/${wp}/checklist`)).body;
  const principal = V.roles.find((r) => r.role === "principal");

  // ======================================================== chips, rows of five
  const chips = await p.locator('[role="group"][aria-label="Person"]').innerText();
  step("C4.5 pass: a chip per person with the server's counts", V.roles.every((r) => chips.includes(`${r.label} · ${r.lines.length}`)), chips.replace(/\n/g, " "));
  const heads = (await p.locator("[data-documents] table thead th").allInnerTexts()).map((x) => x.trim()).filter(Boolean);
  step("board v2 frame 3 pass: a row shows five things: Document · Who · When · Supplies · Status", JSON.stringify(heads) === JSON.stringify(["Document", "Who", "When", "Supplies", "Status", "Actions"]), heads.join(" | "));
  const table = await p.locator("[data-documents] table").innerText();
  step("words fail-guard: no system key in the rows", !KEYS.test(table), (table.match(KEYS) ?? [""])[0]);
  const pp = p.locator('[data-doc-line^="passport_or_travel_document"]');
  step("C4.5 pass: the passport row says how many facts it supplies", /\d+ facts/.test(await pp.locator("[data-doc-supplies]").innerText()), await pp.locator("[data-doc-supplies]").innerText());
  step("C4.5 fail-guard: a line that supplies nothing says \"none · filed as is\"", /none · filed as is/.test(table));
  await state("documents-principal");

  // ======================================================== filters
  await p.locator('[data-when-chip="always"]').click(); await settle();
  const always = await p.locator("[data-doc-line]").count();
  step("filter pass: Always shows only the always-needed lines", always === principal.lines.filter((l) => l.base).length && !(await p.locator("[data-documents] table").innerText()).includes("Only when"), always);
  await p.locator('[data-when-chip="all"]').click(); await settle();
  await p.getByLabel("Find a document").fill("passport"); await settle();
  step("find pass: \"passport\" leaves the passport lines", await p.locator("[data-doc-line]").count() >= 1 && (await p.locator("[data-doc-line]").allInnerTexts()).every((t) => /passport/i.test(t)));
  await p.getByLabel("Find a document").fill("zzz-nothing"); await settle();
  step("find fail: nothing matches says so in words", await p.locator("[data-documents-none]").innerText().then((t) => /No document matches/.test(t)).catch(() => false));
  await p.getByLabel("Find a document").fill(""); await settle();

  // ======================================================== the ⋯ menu: greyed with reasons
  const first = p.locator("[data-doc-line]").first();
  await first.getByRole("button", { name: /^Actions for/ }).click();
  const menu = p.locator("[data-row-menu-items]"); await menu.waitFor();
  const m = await menu.innerText();
  step("⋯ pass: the menu lists Open details, Move up, Move down, Remove from checklist, Change the document type in the library, Retire", ["Open details", "Move up", "Move down", "Remove from checklist", "Change the document type in the library…", "Retire"].every((x) => m.includes(x)), m.replace(/\n/g, " | "));
  step("⋯ fail-guard: greyed items keep their reason as text (the first line cannot move up; a line is removed, not retired)", /It is already first on this checklist\./.test(m) && /A checklist line is removed, not retired\. Retire the document type in the library\./.test(m), m.replace(/\n/g, " | "));
  await state("documents-row-menu");
  // Move the first line down: the rows swap at once.
  const before = await p.locator("[data-doc-line]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-doc-line")));
  // The screenshots resize the window, which closes the menu: open it again.
  if (!(await menu.isVisible().catch(() => false))) { await first.getByRole("button", { name: /^Actions for/ }).click(); await menu.waitFor(); }
  await menu.getByText("Move down", { exact: true }).click(); await settle();
  await p.waitForFunction((was) => document.querySelector("[data-doc-line]")?.getAttribute("data-doc-line") !== was, before[0], { timeout: 15000 }).catch(() => {});
  const after = await p.locator("[data-doc-line]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-doc-line")));
  step("move pass: Move down swaps the first two lines at once", after[0] === before[1] && after[1] === before[0], after.slice(0, 2).join(" , "));

  // ======================================================== the drawer
  await pp.getByRole("button", { name: /^Details of/ }).click();
  const drawer = p.getByRole("dialog"); await drawer.locator("[data-doc-drawer]").waitFor();
  const dtext = await drawer.innerText();
  step("drawer pass: who and when, alternatives, the facts it supplies with About whom and Taken out", /Who and when/.test(dtext) && /Alternatives · any one counts/.test(dtext) && /About whom/.test(dtext) && await drawer.locator('[data-taken-out="yes"]').count() >= 9, dtext.slice(0, 160));
  step("drawer pass (P-147 Q3): Copies, Translation and Validity window are read-only, Sample, not set", /Copies[\s\S]*Not set · Sample[\s\S]*Translation[\s\S]*Not set · Sample[\s\S]*Validity window[\s\S]*Not set · Sample/.test(dtext) && await drawer.locator("[data-doc-not-built] input, [data-doc-not-built] select, [data-doc-not-built] textarea").count() === 0);
  step("drawer fail-guard: no system key in the drawer", !KEYS.test(dtext), (dtext.match(KEYS) ?? [""])[0]);
  await state("documents-drawer-passport");
  await p.keyboard.press("Escape"); await settle();

  // ======================================================== remove from checklist, Undo
  const target = principal.lines.find((l) => l.who === "principal_applicant" && !l.supplies.length);
  const row = p.locator(`[data-doc-line="${target.lineage}"]`);
  await row.getByRole("button", { name: /^Actions for/ }).click();
  await p.locator("[data-row-menu-items]").getByText("Remove from checklist", { exact: true }).click(); await settle();
  step("remove pass: the line leaves the checklist and shows under Removed in this draft", await row.count() === 0 && /Removed in this draft/.test(await p.locator("[data-removed-docs]").innerText().catch(() => "")));
  step("remove: one Undo for it", await p.locator("[data-undo-toast] [data-undo]").count() === 1);
  await state("documents-removed-in-draft");
  await p.locator("[data-note-undo]").click(); await settle();
  step("Undo pass: the line is back and nothing is listed as removed", await row.count() === 1 && await p.locator("[data-removed-docs]").count() === 0, `${await row.count()} ${await p.locator("[data-removed-docs]").innerText().catch(() => "-")} ${await p.locator("[data-documents-error]").innerText().catch(() => "")}`);

  // ======================================================== read only: the approver
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-B"); } catch { /* ignore */ } });
  await go();
  step("read only pass: the approver sees no Add a document", await p.locator("[data-add-document]").count() === 0);
  await p.locator("[data-doc-line]").first().getByRole("button", { name: /^Actions for/ }).click();
  const m2 = await p.locator("[data-row-menu-items]").innerText();
  step("read only fail: the approver's ⋯ greys Move and Remove with \"Read only: you do not hold the author duty.\"", (m2.match(/Read only: you do not hold the author duty\./g) ?? []).length >= 3, m2.replace(/\n/g, " | "));
  await p.keyboard.press("Escape");
  await state("documents-read-only");
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });

  step("no page error or console error", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
