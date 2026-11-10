const { chromium } = require("playwright");
const [CASE, R1, FS] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto("http://localhost:4473/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-R"));
  for (let i = 0; i < 6; i++) {
    await p.goto(`http://localhost:4473/cases/${CASE}/representative-review/${R1}?filing=${FS}`);
    await p.locator("[data-review-page]").waitFor(); if (i % 2) await p.waitForTimeout(1500);
    const w = p.locator(`[data-review-filing="${FS}"] [data-review-form][data-state=approval_withdrawn]`);
    const n = await w.count(); if (!n) { console.log(i, "no withdrawn form"); continue; }
    await w.getByRole("button").focus(); await p.keyboard.press("Tab");
    const foc = await p.evaluate(() => { const a = document.activeElement; return `${a.tagName} ${a.getAttribute("aria-describedby") ?? ""} ${(a.textContent || "").slice(0, 40)}`; });
    const t0 = Date.now(); const ok = await p.getByRole("tooltip").waitFor({ timeout: 4000 }).then(() => true, () => false);
    console.log(i, i % 2 ? "settled 1.5 s" : "no wait", "| focused:", foc, "| tooltip:", ok, Date.now() - t0, "ms");
  }
  await b.close();
})();
