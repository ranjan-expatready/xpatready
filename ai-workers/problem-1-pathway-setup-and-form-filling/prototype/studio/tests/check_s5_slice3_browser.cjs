// S5 slice 3 (runtime lane, W1-08, P-123; Lead Go 28 Oct) walked in a real browser like a person: on Visitor visa's Forms
// tab the author finds the forms with AI (the plan and its cost first, saved AI answers at US$0), sees the run, sees the
// lines AI picked marked "Picked by AI · Sample" with IRCC's words; removes one from its ⋯ menu (asked first, the shared
// Undo toast, the one Undo bar), finds again (the removed form is "Removed by a person" with Add back, never re-attached),
// opens Redo with AI for one form; the guide is among the sources. Screenshots at 1440 and 1024 px into
// product/screens/W1-combination-workspace/screenshots/slice3/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_s5g 4437 start && node studio/tests/check_s5_slice3_browser.cjs 4437 xr_studio_runtime_s5g
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_runtime_s5g";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-combination-workspace", "screenshots", "slice3"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300); };
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
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const vv = sql("select id from combination where combination_key='vv.single'"), sv = sql("select id from combination where combination_key='sv.super_visa'");
  const go = async (id, tab) => { await p.goto(`${BASE}/c/${id}/${tab}`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle(); };
  const finder = p.locator("[data-finder]");

  // ======================================================== find the forms with AI
  await go(vv, "forms");
  // S3 item 5 (screens lane, 29 Oct): the slot holds Start setup's one offer, "Find forms with AI (about … · at most …)".
  step("C11.15 (Lead split 28 Oct; S3 item 5): before any find the Forms tab's slot holds the one Find forms button, nothing spent yet", /No form find yet/.test(await finder.innerText()) && /Nothing was spent yet/.test(await finder.innerText()) && await finder.locator("[data-finder-start]").count() === 1 && await finder.getByRole("button").count() === 1 && await finder.locator("[data-finder-start] [data-find-forms]").count() === 1);
  step("C11.15 guides: the guide is among Visitor visa's sources", /Guide 5256/.test(await p.locator("[data-sources]").innerText().catch(() => "")));
  // The first find is Start setup's (screens lane): started here through the same API, saved AI answers (US$0).
  const plan0 = (await api(`/combinations/${vv}/forms/find/plan`, { method: "POST", data: { mode: "replay" } })).body;
  await api(`/combinations/${vv}/forms/find`, { method: "POST", data: { mode: "replay", planSha256: plan0.plan_sha256, idempotencyKey: `s5b-first-${Date.now()}` } });
  await p.reload(); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  await p.locator('[data-line="IMM 5257"]').waitFor({ timeout: 90000 }).catch(() => {});
  await settle();
  const row = p.locator('[data-line="IMM 5257"]');
  step("C11.15 pass: the forms AI picked are lines, marked \"Picked by AI · Sample\" with IRCC's words", await row.count() === 1 && /Picked by AI · Sample/.test(await row.innerText()) && /"[^"]{20,}/.test(await row.innerText()));
  step("C11.15: the finder line says what the find did, saved answers at US$0, and that it is Sample", /AI found \d+ forms?/.test(await finder.innerText()) && /saved AI answers, US\$0/.test(await finder.innerText()) && /Sample until the immigration expert confirms/.test(await finder.innerText()), (await finder.innerText()).split("\n").slice(0, 2).join(" | "));
  await state("forms-found-by-ai");

  // ======================================================== Remove from this combination, the shared toast and the one Undo
  await row.getByRole("button", { name: "Actions for IMM 5257" }).click();
  await p.getByRole("menuitem", { name: "Remove from this combination" }).click();
  const ask = p.getByRole("dialog");
  step("P-116: Remove asks first, naming the form, and says it stays in the library and can be undone", /Remove IMM 5257 \(.+\) from this combination\? It stays in the Form library, and you can undo it/.test(await ask.locator("[data-confirm-remove]").innerText()));
  await ask.getByRole("button", { name: "Keep it" }).click();
  step("P-116 fail: Keep it removes nothing", await row.count() === 1);
  await row.getByRole("button", { name: "Actions for IMM 5257" }).click();
  await p.getByRole("menuitem", { name: "Remove from this combination" }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Remove IMM 5257" }).click();
  await p.locator("[data-undo-toast]").waitFor({ timeout: 15000 }).catch(() => {}); await settle();
  step("P-116 pass: the line goes; the shared Undo toast and the one Undo bar name the removal; it is under Removed in this draft", await row.count() === 0 && /IMM 5257 removed from this combination/.test(await p.locator("[data-undo-toast]").innerText().catch(() => "")) && /Last change: Removed IMM 5257/.test(await p.locator("[data-undo-bar]").innerText().catch(() => "")) && /IMM 5257/.test(await p.locator("[data-removed]").innerText().catch(() => "")));
  await state("forms-removed-toast-and-undo");
  await p.locator("[data-undo-toast]").getByRole("button", { name: "Undo" }).click().catch(() => p.locator("[data-undo-bar]").getByRole("button", { name: "Undo" }).click());
  await row.waitFor({ timeout: 15000 }).catch(() => {}); await settle();
  step("P-116 pass: Undo puts the same line back, still picked by AI", await row.count() === 1 && /Picked by AI · Sample/.test(await row.innerText()) && await p.locator("[data-removed]").count() === 0);

  // ======================================================== Find again never re-attaches what a person removed
  await row.getByRole("button", { name: "Actions for IMM 5257" }).click();
  await p.getByRole("menuitem", { name: "Remove from this combination" }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Remove IMM 5257" }).click(); await settle();
  await finder.getByRole("button", { name: "Find again" }).click();
  const again = p.getByRole("dialog"); await again.locator("[data-find-plan]").waitFor({ timeout: 30000 }).catch(() => {});
  step("C11.15 plan: Find again shows the steps and says the cost before anything runs (saved AI answers: US$0)", /Cost: US\$0/.test(await again.locator("[data-find-cost]").innerText().catch(() => "")) && await again.locator("[data-find-plan] li").count() > 2);
  await again.getByLabel(/AI now/).check(); await p.waitForTimeout(800);
  step("C11.15 plan: choosing AI now says the most it can cost, inside the cap", /at most US\$\d+\.\d\d/i.test(await again.locator("[data-find-cost]").innerText().catch(() => "")), await again.locator("[data-find-cost]").innerText().catch(() => ""));
  await again.getByLabel(/Use saved AI answers/).check(); await again.locator("[data-find-plan]").waitFor(); await p.waitForTimeout(800);
  await state("find-again-plan");
  const before = (await api(`/combinations/${vv}/forms/find/latest`)).body.run?.id;
  await again.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 180; i++) { const r = (await api(`/combinations/${vv}/forms/find/latest`)).body.run; if (r && r.id !== before && !["QUEUED", "RUNNING"].includes(r.status)) break; await p.waitForTimeout(500); }
  await p.waitForTimeout(2500); await settle();
  const latestStates = (await api(`/combinations/${vv}/forms/find/latest`)).body.forms.map((f) => `${f.code}:${f.state}`);
  step("C11.15 M2c: Find again does not re-attach the removed form (the find says Removed by a person); the page lists it once, under Removed in this draft with Add back", await row.count() === 0 && latestStates.includes("IMM 5257:REMOVED_BY_PERSON") && await p.locator('[data-finder-row="IMM 5257"]').count() === 0 && await p.getByRole("button", { name: "Add back IMM 5257" }).count() === 1, latestStates.join(" "));
  await state("find-again-removed-by-person");
  await p.getByRole("button", { name: "Add back IMM 5257" }).click();
  await row.waitFor({ timeout: 15000 }).catch(() => {}); await settle();
  step("P-116 pass: Add back puts the same line back", await row.count() === 1);

  // ======================================================== Redo with AI for one form (the dialog; not run here)
  await row.getByRole("button", { name: "Actions for IMM 5257" }).click();
  await p.getByRole("menuitem", { name: /Redo with AI/ }).click();
  const redo = p.getByRole("dialog"); await redo.locator("[data-find-plan]").waitFor({ timeout: 30000 }).catch(() => {});
  step("C11.15: Redo with AI opens the same plan for that one form, its cost said first", /Redo with AI: IMM 5257/.test(await redo.innerText()) && /Cost: US\$0/.test(await redo.locator("[data-find-cost]").innerText().catch(() => "")));
  await redo.getByRole("button", { name: "Cancel" }).click();

  // ======================================================== Who can be, filled from the guide (P-121; Lead 28 Oct)
  await go(vv, "questionnaires");
  const who = p.locator("[data-who-can-be]");
  // Board v2 (P-147 §3): the card is folded to one line; "Show and edit" opens the built table.
  await who.getByRole("button", { name: "Show and edit" }).click();
  await who.getByRole("button", { name: "Fill from the guide" }).click();
  const fill = p.getByRole("dialog"); await fill.locator("[data-people-cost]").waitFor({ timeout: 30000 }).catch(() => {});
  step("C11.12 plan: Fill from the guide names the guide and says the cost first (rules only: US$0)", /Guide 5256/.test(await fill.innerText()) && /Cost: US\$0/.test(await fill.locator("[data-people-cost]").innerText().catch(() => "")));
  // Lead check L2: AI now is greyed (not in the slice 3 Go) until the founder approves a live trial.
  step("C11.12 L2: AI now is greyed and says it waits for the founder's Go for a live trial", await fill.getByLabel(/AI now/).isDisabled() && /not approved yet/.test(await fill.locator('[data-fill-mode="live"]').innerText()) && /founder's Go for a live trial/.test(await fill.locator('[data-fill-mode="live"]').innerText()));
  await fill.getByLabel(/Use saved AI answers/).check(); await p.waitForTimeout(800);
  await fill.getByRole("button", { name: "Fill" }).click(); await fill.locator("[data-people-proposal]").waitFor({ timeout: 30000 }).catch(() => {});
  step("C11.12 fail: with no saved AI answer yet it says so and proposes nothing", /No saved AI answer/.test(await fill.innerText()) && await fill.getByRole("button", { name: "Use these lines" }).isDisabled());
  await fill.getByRole("button", { name: "Back" }).click();
  await fill.getByLabel(/Rules only/).check(); await p.waitForTimeout(800);
  await fill.getByRole("button", { name: "Fill" }).click(); await fill.locator("[data-people-proposal]").waitFor({ timeout: 30000 }).catch(() => {});
  step("C11.12 pass: rules propose the principal and the family the guide names, each with IRCC's words", await fill.locator('[data-proposed="principal"]').count() === 1 && await fill.locator('[data-proposed="spouse_or_partner"]').count() === 1 && /"[^"]{20,}"/.test(await fill.locator("[data-people-proposal]").innerText()));
  await state("who-can-be-from-guide");
  await fill.getByRole("button", { name: "Use these lines" }).click();
  // Lead check L3: lines from rules only are the rules' (no AI was used): marked Rules, never AI.
  step("C11.12 L3: Use these lines puts them in the editor, marked Rules (not AI), not saved yet", await who.getByRole("button", { name: "Save" }).count() === 1 && await who.locator('[data-person="spouse_or_partner"] [data-origin-rules]').count() === 1 && await who.locator('[data-person="spouse_or_partner"]').getByText("AI", { exact: true }).count() === 0);
  await who.getByRole("button", { name: "Save" }).click(); await settle();
  const saved = (await api(`/combinations/${vv}/workspace?tab=questionnaires`)).body.people.lines;
  step("C11.12 L3 pass: saved through the rules on Save, the lines keep IRCC's words and say they came from rules (CODE_MATCH)", saved.some((l) => l.role === "spouse_or_partner" && l.origin === "CODE_MATCH" && !!l.quote), saved.map((l) => `${l.role}:${l.origin}`).join(" "));

  // ======================================================== the guide on a combination that did not have it before
  await go(sv, "forms");
  step("C11.15 guides: Super visa lists Guide 5256 among its sources (linked by Load sample)", /Guide 5256/.test(await p.locator("[data-sources]").innerText().catch(() => "")));
  await state("super-visa-guide-source");

  // ======================================================== roles: a case officer sees the forms but cannot find or remove
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-O"); } catch { /* ignore */ } });
  const r = await api(`/combinations/${vv}/forms/${encodeURIComponent("IMM 5257")}`, { method: "DELETE", data: {}, actor: "user-O" });
  step("P-116 roles fail: a case officer's remove is refused (403)", r.status === 403, r.status);

  step("no page errors in the walk", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
