// C3.6 (P-158 (5); forms lane): "Facts a rule needs that no form asks" on a combination's Questionnaires tab, walked in a
// real browser as the configuration author: the panel lists a fact a rule reads, its form refuses an incomplete add in
// plain words, a complete add becomes a proposal that waits on To review › Proposals, and the panel is gone once nothing
// is missing; "Add a fact a rule needs" names a rule and proposes a new fact under a built key (Day-0 acceptance). axe (WCAG 2.2 AA) on the open form; no sideways scroll at 400 px. US$0, no model call.
//   zsh studio/tools/isolated.sh forms_c36b 4463 start && node studio/tests/check_forms_c36_rule_facts_browser.cjs 4463 xr_studio_forms_c36b
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4463), DB = process.argv[3] ?? "xr_studio_forms_c36b";
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, failed = 0;
const step = (name, c, detail) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) }); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.json }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await api("/demo/reset", { method: "POST", json: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST", json: {} })).status === 201);
  const combo = sql("select c.id from combination c join sqr_section_selection s on s.combination_id = c.id order by c.label limit 1");
  sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, when_plain, then_plain, for_whom, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, id, 'r_c36_browser', '{"field":"person.c36_us_refusal","op":"eq","value":true}', 'the person was refused a US visa', 'ask for the refusal letter', 'principal', 1, 'DRAFT', 'HUMAN', 'user-A' from combination where id='${combo}'`);
  const missingBefore = (await api(`/combinations/${combo}/rule-facts`)).body?.facts?.length ?? 0;

  // Review c36 m1: the approver sees the list read-only (no add button), not a form refused at the end.
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-B"); } catch { /* ignore */ } });
  await p.goto(`${BASE}/c/${combo}/questionnaires`); await p.locator("[data-rule-facts]").waitFor({ timeout: 20000 });
  step("C3.6 fail (m1): the approver has no add button; the row says who adds it", (await p.locator("[data-rule-facts]").getByRole("button", { name: "Add the fact this rule needs" }).count()) === 0 && /The configuration author adds it/.test(await p.locator("[data-rule-facts]").innerText()));
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await p.goto(`${BASE}/c/${combo}/questionnaires`);
  const sec = p.locator("[data-rule-facts]");
  await sec.waitFor({ timeout: 20000 });
  const row = sec.locator('[data-rule-fact="person.c36_us_refusal"]');
  step("C3.6 pass: the Questionnaires tab lists the fact a rule reads, with the rule's sentence", (await row.count()) === 1 && /Rule r_c36_browser: the person was refused a US visa, then ask for the refusal letter/.test(await row.innerText()), await sec.innerText().catch(() => ""));
  await row.getByRole("button", { name: "Add the fact this rule needs" }).click();
  step("C3.6 pass: the button opens the form and says it is open (aria-expanded)", (await row.getByRole("button", { name: "Add the fact this rule needs" }).getAttribute("aria-expanded")) === "true");
  const axe = await new AxeBuilder({ page: p }).include("[data-rule-facts]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("C3.6 pass: axe finds no WCAG 2.2 AA violation in the open panel", axe.violations.length === 0, axe.violations.map((v) => v.id));
  await row.getByLabel("Name a person reads").fill("Refused a US visa");
  await row.getByRole("button", { name: /Propose it/ }).click();
  const alert = row.getByRole("alert");
  await alert.waitFor({ timeout: 10000 });
  step("C3.6 fail: an add with no meaning and no type is refused in plain words, and nothing is proposed", /Say what the fact means|Choose the answer type/.test(await alert.innerText()) && Number(sql("select count(*) from proposal_item where step='rule_fact'")) === 0, await alert.innerText());
  await row.getByLabel("Answer type").selectOption("yes_no");
  await row.getByLabel("What it means").fill("Whether this person was ever refused a visa by the United States.");
  await row.getByRole("button", { name: /Propose it/ }).click();
  const link = row.getByRole("link", { name: /waits on To review/ });
  await link.waitFor({ timeout: 10000 });
  step("C3.6 pass (m3): after Propose, focus lands on the row's To review link", await p.evaluate(() => document.activeElement?.tagName === "A" && /waits on To review/.test(document.activeElement.textContent ?? "")));
  step("C3.6 pass: a complete add becomes one proposal; the row says where it waits", Number(sql("select count(*) from proposal_item where step='rule_fact' and status='waiting'")) === 1);
  await link.click(); await p.waitForURL(/\/review\/proposals/, { timeout: 10000 });
  step("C3.6 pass: its link opens To review › Proposals", /\/review\/proposals/.test(p.url()));

  // Day-0 acceptance C3.6: a new fact for a rule the combination has, named in words; the system builds the key.
  await p.goto(`${BASE}/c/${combo}/questionnaires`); await sec.waitFor({ timeout: 20000 });
  const nf = sec.locator("[data-new-fact]");
  await nf.getByRole("button", { name: "Add a fact a rule needs" }).click();
  step("C3.6 pass: \"Add a fact a rule needs\" opens a form naming the rule (aria-expanded)", (await nf.getByRole("button", { name: "Add a fact a rule needs" }).getAttribute("aria-expanded")) === "true" && (await nf.getByLabel("The rule that needs it").count()) === 1);
  const axe2 = await new AxeBuilder({ page: p }).include("[data-new-fact]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("C3.6 pass: axe finds no WCAG 2.2 AA violation in the new-fact form", axe2.violations.length === 0, axe2.violations.map((v) => v.id));
  await nf.getByLabel("The rule that needs it").selectOption("r_c36_browser");
  await nf.getByLabel("Name a person reads").fill("Date the visit ends");
  await nf.getByLabel("Answer type").selectOption("date");
  await nf.getByLabel("What it means").fill("The last day the person plans to stay in Canada (Sample).");
  await nf.getByRole("button", { name: /Propose it/ }).click();
  const done = nf.locator("[data-new-fact-done]");
  await done.waitFor({ timeout: 10000 });
  step("C3.6 pass: the new fact is proposed under a built key, resting on the named rule", /key person\.date_the_visit_ends when accepted/.test(await done.innerText()) && sql("select source->'rule'->>'key' from proposal_item where payload->>'label'='Date the visit ends'") === "r_c36_browser", await done.innerText());
  step("C3.6 pass: focus lands on the Proposals link", await p.evaluate(() => document.activeElement?.tagName === "A" && /Open Proposals/.test(document.activeElement.textContent ?? "")));

  await p.setViewportSize({ width: 400, height: 900 }); await p.goto(`${BASE}/c/${combo}/questionnaires`); await sec.waitFor({ timeout: 20000 });
  step("C3.6 pass: no sideways scroll at 400 px", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  // Once nothing is missing, the panel is not shown at all.
  sql("delete from predicate where predicate_key='r_c36_browser'");
  await p.reload();
  await p.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 20000 });
  await p.waitForLoadState("networkidle");
  step("C3.6 fail: with no fact missing on this combination, no missing-fact row is shown", missingBefore !== 1 || (await sec.locator("[data-rule-fact]").count()) === 0, missingBefore);
  step("no page errors", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
