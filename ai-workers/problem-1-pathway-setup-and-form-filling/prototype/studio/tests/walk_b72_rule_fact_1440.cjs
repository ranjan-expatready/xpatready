// B72 (C3.6, P-318 (6)): a 1440 px walk of "Add the fact this rule needs" on the six's Visitor visa, after the people's
// steps and the Sample rule from samples/sample-rules.json (acceptance/lib/pack2.ts ruleBySteps). Screenshots into
// product/screens/C3.6-rule-on-six/walk/. A walk, not a suite: it writes screenshots. US$0, live AI off.
//   zsh studio/tools/isolated.sh b72walk 4443 start && tsx studio/tests/walk_b72_six_setup.ts 4443 xr_studio_b72walk && node studio/tests/walk_b72_rule_fact_1440.cjs 4443 xr_studio_b72walk
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const { join } = require("node:path");
const PORT = Number(process.argv[2] ?? 4443), DB = process.argv[3] ?? "xr_studio_b72walk";
const OUT = join(__dirname, "..", "..", "..", "product", "screens", "C3.6-rule-on-six", "walk");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 300)}` : ""}`); };
(async () => {
  mkdirSync(OUT, { recursive: true });
  const vv = sql("select id from combination where combination_key = 'vv.single'");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* storage blocked */ } });
  await page.goto(`http://localhost:${PORT}/c/${vv}/questionnaires`, { waitUntil: "networkidle" });
  const panel = page.locator("[data-rule-facts]");
  await panel.waitFor({ timeout: 30_000 });
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, "1-facts-a-rule-needs-1440.png") });
  const text = await panel.innerText();
  ok("B72 walk: Visitor visa's Questionnaires tab lists the fact the Sample rule reads, with the rule's words", /minor.travelling.without.parents/i.test(text) && /letter of authorization/i.test(text), text.slice(0, 400));
  await panel.getByRole("button", { name: "Add the fact this rule needs" }).first().click();
  await page.screenshot({ path: join(OUT, "2-add-open-1440.png") });
  await panel.getByLabel("Name a person reads").first().fill("Minor travelling without parents");
  await panel.getByLabel("Answer type").first().selectOption("yes_no");
  await panel.getByLabel("What it means").first().fill("Whether the person is under 18 and travels alone or with a person other than their parents or legal guardians (Guide 5256, Minors travelling alone; Sample).");
  await page.screenshot({ path: join(OUT, "3-filled-1440.png") });
  await panel.getByRole("button", { name: /Propose it/ }).first().click();
  await page.waitForTimeout(2000);
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(OUT, "4-proposed-1440.png") });
  const item = sql("select origin || '|' || status || '|' || coalesce(work->>'ruleFact', '') from proposal_item where kind = 'field' and step = 'rule_fact' order by created_at desc limit 1");
  ok("B72 walk: \"Propose it · US$0\" puts one rules proposal for the rule's fact on To review (a second person approves it)", item === "rules|waiting|person.minor_travelling_without_parents", item);
  ok("B72 walk: the panel says the proposal waits on To review", /To review/i.test(await panel.innerText()));
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok("B72 walk: no sideways scroll at 1440 px", !sideways);
  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
