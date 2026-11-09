// qa gate A walk of C3.16, part 6 by screens (1024 px): the case officer opens a Visitor visa case (release with the union
// date marked Household by screens in part 1), adds the spouse and a child, and reads how the case asks the union date.
// node walk6_household_case.cjs <port> <outdir>
const { chromium } = require("playwright");
const [port, out] = process.argv.slice(2);
const shot = async (p, n, full = false) => { await p.screenshot({ path: `${out}/${n}.png`, fullPage: full }); console.log("SHOT", n); };
const flat = (s) => s.replace(/\n+/g, " | ");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 800 } });
  await p.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
  await p.goto(`http://localhost:${port}/cases`); await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: /Open a case/ }).first().click();
  const dlg = p.getByRole("dialog"); const combo = dlg.getByLabel("Combination (released)");
  await combo.locator("option", { hasText: /Visitor visa/ }).waitFor({ state: "attached" });
  await combo.selectOption({ label: (await combo.locator("option").allInnerTexts()).find((o) => /Visitor visa/.test(o)) });
  await dlg.getByLabel("Case reference").fill("QA-C316-H1");
  await dlg.getByLabel("Principal applicant's name").fill("Client A");
  await dlg.getByRole("button", { name: /^Open case/ }).click();
  await p.waitForURL(/\/cases\/[0-9a-f-]{36}/, { timeout: 20000 }); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  console.log("CASE URL", p.url());
  for (const [btn, name] of [["Add spouse or partner", "Client B"], ["Add child", "Child C"]]) {
    await p.getByRole("button", { name: btn }).click();
    const d = p.getByRole("dialog"); await d.waitFor();
    console.log("ADD DIALOG", flat(await d.innerText()).slice(0, 300));
    await d.getByRole("textbox").first().fill(name);
    await d.getByRole("button", { name: /^(Add|Save)/ }).last().click();
    await p.waitForTimeout(1500);
  }
  const t = flat(await p.locator("main").innerText());
  console.log("PEOPLE", t.slice(t.indexOf("People and filings"), t.indexOf("People and filings") + 500));
  console.log("TABS", JSON.stringify(await p.locator("main button").filter({ hasText: /missing|answered|to confirm/ }).allInnerTexts()));
  await shot(p, "10a-vv-family-case", true);
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
