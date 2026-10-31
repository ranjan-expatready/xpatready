// S5 Who can be (Lead check L2, Devin Review on PR #71): whether "AI now" may run is the server's answer, not a constant
// in the page. On a copy where AI now is open (the founder's live-trial approval, or, for this check, the live switch
// STUDIO_AI_LIVE paired with the fake launcher, P-192 and PR #113 review M1: never another live switch on a check copy), the plan says approved, the choice is open
// and says its cost first; on every other copy it is greyed (check_s5_leadcheck_browser.cjs). Nothing is run: no Fill
// is pressed in AI now, so no model is called (US$0).
//   zsh studio/tools/isolated.sh runtime_live 4433 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_s5_live_approval_browser.cjs 4433 xr_studio_runtime_live
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4433), DB = process.argv[3] ?? "xr_studio_runtime_live";
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const sv = sql("select id from combination where combination_key='sv.super_visa'");
  const rules = await api(`/combinations/${sv}/people/propose/plan`, { method: "POST", data: { mode: "rules" } });
  step("C11.12 L2 pass: with the founder's live-trial approval on the server, the plan says AI now is approved", rules.status === 201 && rules.body?.live?.approved === true && rules.body.live.why === null, JSON.stringify(rules.body?.live));
  const live = await api(`/combinations/${sv}/people/propose/plan`, { method: "POST", data: { mode: "live" } });
  step("C11.12 L2 pass: and the AI now plan says the most it can cost before anything runs", live.status === 201 && live.body?.totals?.worst_usd > 0, JSON.stringify(live.body?.totals ?? live.body?.detail));
  await p.goto(`${BASE}/c/${sv}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const who = p.locator("[data-who-can-be]");
  // Board v2 (P-147 §3): the card is folded to one line; "Show and edit" opens the built table.
  await who.getByRole("button", { name: "Show and edit" }).click();
  await who.getByRole("button", { name: "Fill from the guide" }).click();
  const fill = p.getByRole("dialog"); await fill.locator("[data-people-cost]").waitFor({ timeout: 30000 }).catch(() => {});
  await p.waitForFunction(() => !document.querySelector('[data-fill-mode="live"] input')?.disabled, null, { timeout: 10000 }).catch(() => {});
  step("C11.12 L2 pass: the page follows the server: AI now is open and says its cost is shown", !(await fill.getByLabel(/AI now/).isDisabled()) && /cost shown below/.test(await fill.locator('[data-fill-mode="live"]').innerText()) && !/not approved/.test(await fill.locator('[data-fill-mode="live"]').innerText()));
  await fill.getByLabel(/AI now/).check(); await p.waitForTimeout(800);
  step("C11.12 L2: choosing it shows the worst case first (nothing is run here)", /At most US\$\d+\.\d\d/.test(await fill.locator("[data-people-cost]").innerText().catch(() => "")), await fill.locator("[data-people-cost]").innerText().catch(() => ""));
  await fill.getByRole("button", { name: "Cancel" }).click();
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
