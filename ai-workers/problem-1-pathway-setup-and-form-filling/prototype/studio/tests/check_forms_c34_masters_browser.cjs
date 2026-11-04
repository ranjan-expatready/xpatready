// C3.4 (P-158; forms lane): "Forms: sections and answer lists" walked in a real browser as the configuration author:
// Library › Forms › IMM 5257's ⋯ menu › Re-read with AI opens the form's AI dialog, whose panel drafts the edition's
// sections and answer lists by the rules (no AI, US$0) into To review; a second click says it is already drafted. axe
// (WCAG 2.2 AA) on the panel; no page errors. On an isolated copy with the six loaded (Demo load).
//   zsh studio/tools/isolated.sh forms_c34b 4457 start && node studio/tests/check_forms_c34_masters_browser.cjs 4457 xr_studio_forms_c34b
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4457), DB = process.argv[3] ?? "xr_studio_forms_c34b", BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, failed = 0;
const step = (name, c, detail) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  // QA-209: Playwright's request has a 30 s limit by default, and Load sample takes 80–180 s on a loaded Mac (106 s at load
  // average 18): the setup waits as long as the load really takes (10 minutes at most), so only a real fault fails it.
  const api = async (pth, json) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: json, timeout: 600_000 }); return r.status(); };
  await api("/demo/reset", { confirm: "RESET" });
  step("setup: the six load", (await api("/demo/load", { sample: "six" })) === 201);
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await p.goto(`${BASE}/library/forms`);
  const trigger = p.getByRole("button", { name: /^Actions for IMM 5257$/ });
  await trigger.waitFor({ timeout: 30000 });
  await trigger.click();
  await p.getByRole("menuitem", { name: /Re-read with AI/ }).click();
  const panel = p.locator("[data-form-masters]");
  await panel.waitFor({ timeout: 20000 });
  step("C3.4 pass: the form's AI dialog offers its sections and answer lists by the rules, at US$0", /no AI, US\$0/.test(await panel.innerText()) && (await panel.getByRole("button", { name: /Draft sections and lists · US\$0/ }).count()) === 1);
  const axe = await new AxeBuilder({ page: p }).include("[data-form-masters]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("C3.4 pass: axe finds no WCAG 2.2 AA violation in the panel", axe.violations.length === 0, axe.violations.map((v) => v.id));
  const before = Number(sql("select count(*) from proposal_item where step='masters_edition'"));
  await panel.getByRole("button", { name: /Draft sections and lists/ }).click();
  const status = panel.getByRole("status");
  await status.waitFor({ timeout: 30000 });
  const n = Number(sql("select count(*) from proposal_item where step='masters_edition'"));
  step("C3.4 pass: one click proposes the edition's sections and answer lists, and says how many wait on To review", n > before && new RegExp(`${n - before} proposals wait on To review`).test(await status.innerText()), [n - before, await status.innerText()]);
  step("C3.4 pass: the panel links to Proposals", (await status.getByRole("link", { name: "Open Proposals" }).count()) === 1);
  await panel.getByRole("button", { name: /Draft sections and lists/ }).click();
  await p.waitForFunction(() => /Already drafted for this edition/.test(document.querySelector("[data-form-masters]")?.textContent ?? ""), null, { timeout: 20000 });
  step("C3.4 fail: a second click proposes nothing more and says the edition is already drafted (P-138)", Number(sql("select count(*) from proposal_item where step='masters_edition'")) === n);
  // Review Minor 1: "Open Proposals" opens this edition's group, not the oldest one.
  await panel.getByRole("link", { name: "Open Proposals" }).first().click();
  await p.waitForURL(/\/review\/proposals\?group=/, { timeout: 20000 });
  const groupAsked = decodeURIComponent(new URL(p.url()).searchParams.get("group") ?? "");
  step("C3.4 fail→pass (review Minor 1): Open Proposals opens IMM 5257's own group", groupAsked === "edition:" + sql("select edition from source_attachment where file_name ilike 'imm5257e%' and edition is not null limit 1").trim(), groupAsked);
  // Review Minor 2: a rules item's reading says it came from the rules, never "saved run".
  const openBtn = p.locator("tr", { has: p.getByText("Rules", { exact: true }) }).getByRole("button", { name: /^Open / }).first();
  await openBtn.waitFor({ timeout: 20000 });
  await openBtn.click();
  const first = p.getByText(/^First reading · /).first();
  await first.waitFor({ timeout: 20000 });
  step("C3.4 fail→pass (review Minor 2): a rules item's reading reads \"rules, US$0\", not \"saved run\"", (await first.innerText()).includes("rules, US$0"), await first.innerText());
  step("no page errors", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
