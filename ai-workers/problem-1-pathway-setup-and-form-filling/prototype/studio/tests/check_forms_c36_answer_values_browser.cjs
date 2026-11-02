// C3.6 (Lead, 2 Nov; runtime-3's R3) in a real browser: on Questionnaires › "Facts a rule needs that no form asks", a
// choice fact shows "Answer values, one per line"; a repeated value is refused in words and nothing is proposed; the
// list is proposed with the fact, and the second person reads it on To review › Proposals. A non-choice shows no values
// box. axe (WCAG 2.2 AA) on the open form. US$0, no model call. Values are Sample (AGENTS rule 4).
//   zsh studio/tools/isolated.sh forms_c36w 4469 start && node studio/tests/check_forms_c36_answer_values_browser.cjs 4469 xr_studio_forms_c36w
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4469), DB = process.argv[3] ?? "xr_studio_forms_c36w";
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, failed = 0;
const step = (name, c, detail) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.json }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await api("/demo/reset", { method: "POST", json: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST", json: {} })).status === 201);
  const combo = sql("select c.id from combination c join sqr_section_selection s on s.combination_id = c.id order by c.label limit 1");
  sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, when_plain, then_plain, for_whom, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, id, 'r_c36_travel', '{"field":"person.travels_with","op":"eq","value":"alone"}', 'the child travels alone', 'ask for the consent letter', 'principal', 1, 'PUBLISHED', 'HUMAN', 'user-A' from combination where id='${combo}'`);
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await p.goto(`${BASE}/c/${combo}/questionnaires`);
  const row = p.locator('[data-rule-fact="person.travels_with"]');
  await row.waitFor({ timeout: 20000 });
  await row.getByRole("button", { name: "Add the fact this rule needs" }).click();
  await row.getByLabel("Name a person reads").fill("Who the child travels with");
  await row.getByLabel("What it means").fill("Who the child travels to Canada with (Sample).");
  await row.getByLabel("Answer type").selectOption("yes_no");
  step("C3.6 fail: a yes-or-no fact shows no answer-values box", (await row.locator("[data-answer-values]").count()) === 0);
  await row.getByLabel("Answer type").selectOption("code");
  const box = row.getByLabel("Answer values, one per line");
  step("C3.6 pass: a choice shows \"Answer values, one per line\"", (await box.count()) === 1);
  const axe = await new AxeBuilder({ page: p }).include('[data-rule-fact="person.travels_with"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("C3.6 pass: axe finds no WCAG 2.2 AA violation in the open form", axe.violations.length === 0, axe.violations.map((v) => v.id));
  await box.fill("Both parents\nAlone\nalone");
  await row.getByRole("button", { name: /Propose it/ }).click();
  const alert = row.getByRole("alert"); await alert.waitFor({ timeout: 10000 });
  step("C3.6 fail: a repeated value is refused in words, and nothing is proposed", /listed twice/.test(await alert.innerText()) && sql("select count(*) from proposal_item where work->>'ruleFact'='person.travels_with'") === "0", await alert.innerText());
  await box.fill("Both parents\nOne parent\nAnother adult\nAlone");
  await row.getByRole("button", { name: /Propose it/ }).click();
  const link = row.getByRole("link", { name: /waits on To review/ }); await link.waitFor({ timeout: 10000 });
  const codes = sql("select string_agg(v->>'code', ',' order by ord) from proposal_item, jsonb_array_elements(payload->'values') with ordinality as t(v, ord) where work->>'ruleFact'='person.travels_with'");
  step("C3.6 pass: the fact is proposed with its four answer values", codes === "both_parents,one_parent,another_adult,alone", codes);
  // The second person reads the list.
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-C"); } catch { /* ignore */ } });
  const pid = sql("select id from proposal_item where work->>'ruleFact'='person.travels_with'");
  const group = sql(`select coalesce(combination_id::text, '') from proposal_item where id='${pid}'`);
  await p.goto(`${BASE}/review/proposals${group ? `?c=${group}` : ""}`);
  const item = p.getByRole("button", { name: /^Open Who the child travels with/ }).first();
  await item.waitFor({ timeout: 20000 }); await item.click();
  const vals = p.locator("[data-answer-values]").last(); await vals.waitFor({ timeout: 10000 });
  const t = await vals.innerText();
  step("C3.6 pass: To review shows the answer values to the second person", /Answer values · 4/i.test(t) && ["Both parents", "One parent", "Another adult", "Alone"].every((w) => t.includes(w)), t);
  step("no page error", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
