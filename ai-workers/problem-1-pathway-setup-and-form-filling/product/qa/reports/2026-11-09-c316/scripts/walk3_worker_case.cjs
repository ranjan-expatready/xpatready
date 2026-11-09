// qa gate A walk of C3.16, part 3 by screens (1024 px): the case officer opens a worker's case on the LMIA work permit's
// release (employer name marked Organisation by screens in part 1), reads how the case asks the employer name, then takes
// C1.3's first step: Choose employer case… › the Sample employer case › Copy. node walk3_worker_case.cjs <port> <outdir>
const { chromium } = require("playwright");
const [port, out] = process.argv.slice(2);
const shot = async (p, n, full = true) => { await p.screenshot({ path: `${out}/${n}.png`, fullPage: full }); console.log("SHOT", n); };
const flat = (s) => s.replace(/\n+/g, " | ");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 800 } });
  await p.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
  await p.goto(`http://localhost:${port}/cases`); await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: /Open a case/ }).first().click();
  const dlg = p.getByRole("dialog");
  const combo = dlg.getByLabel("Combination (released)");
  await combo.locator("option", { hasText: /LMIA/ }).waitFor({ state: "attached" });
  const opts = await combo.locator("option").allInnerTexts(); console.log("COMBOS", JSON.stringify(opts));
  await combo.selectOption({ label: opts.find((o) => /LMIA/i.test(o)) });
  await dlg.getByLabel("Case reference").fill("QA-C316-W2");
  await dlg.getByLabel("Principal applicant's name").fill("Client A");
  await p.waitForTimeout(500);
  console.log("DIALOG", flat(await dlg.innerText()).slice(0, 900));
  await shot(p, "06a-open-worker-case", false);
  await dlg.getByRole("button", { name: /^(Open|Create)/ }).last().click();
  await p.waitForURL(/\/cases\/[0-9a-f-]{36}/, { timeout: 20000 }); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000);
  console.log("CASE URL", p.url());
  const main = flat(await p.locator("main").innerText());
  console.log("CASE PAGE", main.slice(0, 1500));
  const i = main.search(/Name of employer|Employer name|employer's name/i); console.log("EMPLOYER Q", i >= 0 ? main.slice(Math.max(0, i - 300), i + 400) : "not on first view");
  await shot(p, "06b-worker-case-before-link");
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
