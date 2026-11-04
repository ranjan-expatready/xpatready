// qa2 1440 px walk of C3.4 on the six after the saved masters replay: To review › IMM 5257 › an AI form check; What it reads; Accept.
const STUDIO = process.argv[2], OUT = process.argv[3], BASE = "http://localhost:4480";
const { chromium } = require(STUDIO + "/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/"); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} });
  await p.goto(BASE + "/review/proposals?group=" + encodeURIComponent("edition:IMM 5257 (09-2023)")); await p.waitForTimeout(6000);
  for (const [n, title] of [["1", "When military service is declared"], ["2", "When current status is Other"]]) {
    await p.getByRole("row", { name: new RegExp(title) }).first().getByRole("button", { name: /Open/ }).click(); await p.waitForTimeout(2500);
    const dlg = p.getByRole("dialog").first(); const t = await (await dlg.count() ? dlg : p.locator("body")).innerText();
    const wr = (t.match(/What it reads[\s\S]{0,600}/) || [""])[0].replace(/\n+/g, " | ");
    console.log(`[${n}] ${title}\n  ${wr.slice(0, 500)}`);
    await p.screenshot({ path: OUT + `/walk-${n}-form-check-panel.png` });
    const acc = p.getByRole("button", { name: /^Accept/ }).first();
    console.log("  Accept enabled: " + (await acc.count() ? !(await acc.isDisabled()) : "none"));
    if (await acc.count() && !(await acc.isDisabled())) { await acc.click(); await p.waitForTimeout(2500); const msg = await p.locator('[role="alert"], [role="status"]').allInnerTexts(); console.log("  after Accept: " + msg.join(" || ").replace(/\n/g, " ").slice(0, 400)); await p.screenshot({ path: OUT + `/walk-${n}-after-accept.png` }); }
    await p.keyboard.press("Escape"); await p.waitForTimeout(800);
  }
  console.log("page errors: " + errs.length); await b.close();
})().catch((e) => { console.error("WALK ERROR " + e.message); process.exit(1); });
