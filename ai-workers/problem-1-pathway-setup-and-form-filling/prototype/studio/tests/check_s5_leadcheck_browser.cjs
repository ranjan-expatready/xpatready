// S5 Lead check FIX (28 Oct; screens/W1-combination-workspace/lead-check.md) walked in a real browser: L8 "Use these
// lines" keeps the editor's unsaved lines, L2 AI now greyed, L3 rules-only lines marked Rules, L11 a line added from the
// library shows how it was added (never as IRCC's words) and no AI step. Screenshots at 1440 px into
// product/screens/W1-combination-workspace/screenshots/fix/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_fixb 4435 start && node studio/tests/check_s5_leadcheck_browser.cjs 4435 xr_studio_runtime_fixb
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_fixb";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-combination-workspace", "screenshots", "fix"); fs.mkdirSync(SHOTS, { recursive: true });
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
    n++; await settle();
    await p.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${name}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const vv = sql("select id from combination where combination_key='vv.single'"), sv = sql("select id from combination where combination_key='sv.super_visa'");
  const go = async (id, tab) => { await p.goto(`${BASE}/c/${id}/${tab}`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle(); };

  // ======================================================== L8, L2, L3: Who can be, filled from the guide while editing
  await go(sv, "questionnaires");
  const who = p.locator("[data-who-can-be]");
  await who.getByRole("button", { name: "Edit" }).click();
  const before = await who.locator("[data-person]").count();
  const offered = await who.getByLabel("Person to add").locator("option").allTextContents();
  const extra = offered.includes("Sponsor") ? "Sponsor" : offered.find((o) => o && !/Choose/.test(o));
  await who.getByLabel("Person to add").selectOption({ label: extra }); await who.getByRole("button", { name: "Add a person" }).click();
  const key = extra === "Sponsor" ? "sponsor" : null;
  step(`setup: ${extra} added in the editor, not saved yet`, (await who.locator("[data-person]").count()) === before + 1);
  await who.getByRole("button", { name: "Fill from the guide" }).click();
  const fill = p.getByRole("dialog"); await fill.locator("[data-people-cost]").waitFor({ timeout: 30000 }).catch(() => {});
  step("L8: Fill from the guide can be opened while editing (it adds to the editor's lines)", /Guide 5256/.test(await fill.innerText()));
  step("L2 fail: AI now is greyed, saying it waits for the founder's Go for a live trial", await fill.getByLabel(/AI now/).isDisabled() && /founder's Go for a live trial/.test(await fill.locator('[data-fill-mode="live"]').innerText()));
  step("L2 pass: Rules only is chosen and costs US$0", await fill.getByLabel(/Rules only/).isChecked() && /Cost: US\$0/.test(await fill.locator("[data-people-cost]").innerText()));
  await state("fill-from-guide-ai-now-greyed");
  await fill.getByRole("button", { name: "Fill" }).click(); await fill.locator("[data-people-proposal]").waitFor({ timeout: 30000 }).catch(() => {});
  const proposed = await fill.locator("[data-proposed]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-proposed")));
  await fill.getByRole("button", { name: "Use these lines" }).click(); await settle();
  const rows = await who.locator("[data-person]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-person")));
  step(`L8 pass: after Use these lines the unsaved ${extra} line is still in the editor`, key ? rows.includes(key) : rows.length > proposed.length, rows.join(", "));
  step("L8: the guide's lines are in the editor too", proposed.every((r) => rows.includes(r)), proposed.join(", "));
  const spouse = who.locator('[data-person="spouse_or_partner"]');
  step("L3 pass: a line from rules only is marked Rules", await spouse.locator("[data-origin-rules]").count() === 1);
  step("L3 fail: and never AI", await spouse.getByText("AI", { exact: true }).count() === 0);
  await state("who-can-be-rules-lines-kept-edit");
  await who.getByRole("button", { name: "Save" }).click(); await settle();
  const dlg = p.getByRole("dialog"); if (await dlg.count()) { await dlg.getByRole("button", { name: "Save anyway" }).click().catch(() => {}); await settle(); }
  const saved = (await api(`/combinations/${sv}/workspace?tab=questionnaires`)).body.people.lines;
  step(`L8 pass: saved, the list holds the guide's lines and the ${extra} line`, (!key || saved.some((l) => l.role === key)) && saved.some((l) => l.role === "spouse_or_partner" && l.origin === "CODE_MATCH"), saved.map((l) => `${l.role}:${l.origin ?? "-"}`).join(" "));

  // ======================================================== L11: a line added from the library
  const plan0 = (await api(`/combinations/${vv}/forms/find/plan`, { method: "POST", data: { mode: "replay" } })).body;
  const run0 = await api(`/combinations/${vv}/forms/find`, { method: "POST", data: { mode: "replay", planSha256: plan0.plan_sha256, idempotencyKey: `lcb-${Date.now()}` } });
  for (let i = 0; i < 240 && run0.body?.id; i++) { const r = await api(`/runs/${run0.body.id}`); if (!["queued", "running", "stopping"].includes(r.body?.status)) break; await p.waitForTimeout(250); }
  const ws = sql("select id from workspace limit 1");
  const lib = sql(`select d.form_key from gov_form_def d where d.workspace_id='${ws}' and d.form_kind='data_form' and d.retired_at is null and exists (select 1 from form_edition e where e.gov_form_def_id=d.id and e.channel <> 'ONLINE') and d.form_key not in (select lineage_key from combination_form where combination_id='${vv}') order by d.form_key limit 1`);
  await go(vv, "forms");
  await p.getByRole("button", { name: "Add a form from the library" }).click();
  const panel = p.getByRole("dialog", { name: "Add a form from the library" }); await panel.waitFor();
  const pick = panel.locator("li, tr").filter({ hasText: lib }).first();
  await pick.getByRole("button").first().click().catch(() => {});
  await settle(); await p.keyboard.press("Escape"); await settle();
  const row = p.locator(`[data-line="${lib}"]`); await row.waitFor({ timeout: 20000 }).catch(() => {});
  const text = await row.innerText().catch(() => "");
  step(`L11 pass: ${lib}, added from the library, says "Added from the library by a person" where IRCC's words go`, /Added from the library by a person/.test(text), text.split("\n").slice(0, 3).join(" | "));
  step(`L11 fail: it never shows our own words as IRCC's (no quoted "added from the library")`, !/"[^"]*added from the library/.test(text));
  const boxes = Number((/(\d+) form fields matched/.exec(text) ?? [])[1] ?? 0);
  step(`L11: a line the library already matched (${boxes} form fields) has no "Draft with AI" step, it says In the library`, boxes === 0 || (await row.getByRole("button", { name: "Draft with AI" }).count() === 0 && await row.locator("[data-line-matched]").count() === 1), `${boxes} matched`);
  const found = p.locator('[data-line="IMM 5257"]');
  step("L11 fail-guard: a line the finder picked keeps IRCC's words (quoted)", /"[^"]{20,}/.test(await found.innerText().catch(() => "")));
  await state("forms-added-from-library");

  step("no page errors on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
