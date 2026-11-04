// qa2 C4.2 walk on Reset to the six, 1440 px, author: Visitor visa (and With an LMIA) › Questionnaires (SQR) tab.
// Clicks nothing priced (no button whose text holds US$, Live or AI is pressed).
const STUDIO = process.argv[2], BASE = process.argv[3], OUT = process.argv[4], IDS = JSON.parse(process.argv[5]);
const { chromium } = require(STUDIO + "/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.goto(BASE + "/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  for (const [key, id] of Object.entries(IDS)) {
    for (const tab of ["questionnaires", "pqr"]) {
      const r = await p.goto(`${BASE}/c/${id}/${tab}`); await p.waitForTimeout(4000);
      const txt = (await p.locator("main").innerText().catch(() => p.locator("body").innerText())).replace(/\s+\n/g, "\n");
      await p.screenshot({ path: `${OUT}/${key}-${tab}-1440.png`, fullPage: false });
      const btns = await p.locator("main button").evaluateAll((bs) => bs.map((x) => (x.innerText || x.getAttribute("aria-label") || "").trim()).filter(Boolean));
      console.log(`=== ${key} /${tab} (http ${r?.status()}) url=${p.url()}\n${txt.slice(0, 1800)}\n--- buttons: ${[...new Set(btns)].slice(0, 40).join(" | ")}`);
    }
  }
  console.log("console errors:", errs.length, errs.slice(0, 5).join(" || "));
  await b.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
