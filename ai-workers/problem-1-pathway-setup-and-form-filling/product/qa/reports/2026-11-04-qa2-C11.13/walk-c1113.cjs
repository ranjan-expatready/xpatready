// qa2 1440 px walk of C11.13 on the six: To review › IMM 5257 group › a near, new field item; what the side panel asks.
const STUDIO = process.argv[2], OUT = process.argv[3], BASE = "http://localhost:4481";
const { chromium } = require(STUDIO + "/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(BASE + "/"); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} });
  await p.goto(BASE + "/review/proposals?group=" + encodeURIComponent("edition:IMM 5257 (09-2023)")); await p.waitForTimeout(6000);
  await p.screenshot({ path: OUT + "/walk-1-to-review-imm5257.png" });
  const row = p.getByText("person.other_family_name", { exact: false }).first();
  console.log("row visible: " + (await row.count()));
  await row.click(); await p.waitForTimeout(2000);
  await p.screenshot({ path: OUT + "/walk-2-near-item-panel.png", fullPage: true });
  const panel = await p.locator("body").innerText();
  console.log("Close to shown: " + /Close to/i.test(panel));
  console.log("reason needed words: " + /Reason \(needed to accept/i.test(panel));
  const acc = p.getByRole("button", { name: /^Accept/ });
  console.log("Accept buttons: " + (await acc.count()) + " first disabled: " + ((await acc.count()) ? await acc.first().isDisabled() : "n/a"));
  const open = p.getByRole("link", { name: /form-field page|Open on/i });
  console.log("open-on-page link: " + (await open.count()));
  console.log("console errors: " + errs.length);
  await b.close();
})().catch((e) => { console.error("WALK ERROR " + e.message); process.exit(1); });
