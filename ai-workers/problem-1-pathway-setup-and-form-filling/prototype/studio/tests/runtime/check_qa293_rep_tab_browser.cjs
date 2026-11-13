// QA-293 by screens at 1440 px on the configured checkpoint: the Agent view's "The representative" tab offers no Add for a
// detail the firm record does not hold (every such save failed with "That person is not on this case."); it says the
// detail comes only from the firm record. The firm record's own details stay "From the firm record" with no Edit, and a
// person's tab still offers Add. axe-core (WCAG 2.2 A/AA); no sideways scroll; every wait fails loudly. Sample data, US$0.
//   zsh studio/tools/isolated.sh rt293 4441 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   node studio/tests/runtime/check_qa293_rep_tab_browser.cjs 4441 [shots folder]
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4441", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[3] ?? null;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const T = { timeout: 20000 };

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-O"); });
  const r = await ctx.newPage();
  r.on("pageerror", (e) => errors.push(e.message));
  const tab = async (name) => { await r.locator("#agent-view").getByRole("tab", { name: new RegExp(`^${name}`) }).click(T); };
  const line = (label) => r.locator("#agent-view section").filter({ hasText: /for the representative/i }).locator("div[id^='a-']").filter({ hasText: label });
  try {
    // Open a Visitor visa case with its team by screens (as qa did, QA-JA4-0711).
    await r.goto(`${BASE}/cases`);
    await r.getByRole("button", { name: "Open a case" }).click(T);
    const dlg = r.getByRole("dialog");
    await dlg.getByLabel("Representative of record").waitFor(T);
    const vv = dlg.locator("select option", { hasText: "Visitor visa" }).first();
    await vv.waitFor({ state: "attached", ...T });
    await dlg.locator("select").first().selectOption(await vv.getAttribute("value"));
    await dlg.getByLabel("Your own reference (optional)").fill(`QA293-${Date.now().toString(36)}`);
    await dlg.getByLabel("Principal applicant's name").fill("Client A");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await r.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);

    await tab("The representative");
    const city = line("City or town");
    await city.first().waitFor(T);
    const ct = (await city.first().innerText()).replace(/\s+/g, " ");
    ok("QA-293 fail: the representative's city (not filled from the firm record on this release) offers no Add", (await city.first().getByRole("button", { name: /^(Add|Edit)/ }).count()) === 0, ct.slice(0, 200));
    ok("QA-293 pass: it says only the firm record fills it (true whether or not the firm record holds it)", /Only the firm record fills this/i.test(ct) && /not filled from the firm record/i.test(ct), ct.slice(0, 200));
    const repAdds = await r.locator("#agent-view section").filter({ hasText: /for the representative/i }).getByRole("button", { name: /^Add\b/ }).count();
    ok("QA-293 fail: no Add button anywhere on the representative's tab", repAdds === 0, repAdds);
    const member = (await line("membership ID").first().innerText()).replace(/\s+/g, " ");
    ok("QA-293 pass: the firm record's membership ID is still shown \"From the firm record\" with no Edit", /R000000/.test(member) && /firm record/i.test(member) && (await line("membership ID").first().getByRole("button", { name: /^(Add|Edit)/ }).count()) === 0, member.slice(0, 160));
    if (SHOTS) { await city.first().scrollIntoViewIfNeeded(); await r.screenshot({ path: path.join(SHOTS, "01-representative-tab-no-add-1440.png") }); }
    const a = await new AxeBuilder({ page: r }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok("QA-293 axe: the representative's tab has no WCAG A/AA violation", a.violations.length === 0, a.violations.map((v) => `${v.id} (${v.nodes.length})`).join(" | "));
    ok("QA-293: no sideways scroll at 1440 px", !(await r.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));

    // A person's own tab still offers Add.
    await tab("Client A");
    const personAdds = await r.locator("#agent-view").getByRole("button", { name: /^Add .* for Client A$/i }).count();
    ok("QA-293 pass: the principal's tab still offers Add for their own answers", personAdds > 0, personAdds);
    ok("QA-293: no page errors", errors.length === 0, errors);
  } catch (e) {
    ok("QA-293: the walk ran to its end", false, String((e && e.message) || e).slice(0, 400));
  }
  await browser.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exitCode = passed === results.length ? 0 : 1;
})();
