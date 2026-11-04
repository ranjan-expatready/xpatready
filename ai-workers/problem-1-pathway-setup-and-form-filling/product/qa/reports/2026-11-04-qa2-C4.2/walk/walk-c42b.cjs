// Opens "Draft questions and documents" on Visitor visa (six) and reads the dialog; presses nothing inside it.
const STUDIO = process.argv[2], BASE = process.argv[3], OUT = process.argv[4], VV = process.argv[5];
const { chromium } = require(STUDIO + "/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(BASE + "/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  await p.goto(`${BASE}/c/${VV}/questionnaires`); await p.waitForTimeout(4000);
  await p.getByRole("button", { name: "Draft questions and documents" }).first().click(); await p.waitForTimeout(2500);
  const d = p.locator("[role=dialog]").first();
  const t = (await d.count()) ? await d.innerText() : "(no dialog) " + (await p.locator("main").innerText()).slice(0, 1500);
  await p.screenshot({ path: `${OUT}/vv.single-draft-questions-dialog-1440.png` });
  const btns = (await d.count()) ? await d.locator("button").evaluateAll((bs) => bs.map((x) => `${(x.innerText || x.getAttribute("aria-label") || "").trim()}${x.disabled ? " [disabled]" : ""}`)) : [];
  console.log(t.slice(0, 2500)); console.log("--- dialog buttons:", btns.join(" | "));
  await b.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
