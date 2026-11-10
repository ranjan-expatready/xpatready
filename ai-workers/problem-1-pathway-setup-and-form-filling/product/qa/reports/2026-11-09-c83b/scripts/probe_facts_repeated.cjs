const { chromium } = require("playwright");
const [CASE, R, FP] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto("http://localhost:4473/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-R"));
  await p.goto(`http://localhost:4473/cases/${CASE}/representative-review/${R}?filing=${FP}`);
  const page = p.locator("[data-review-page]"); await page.waitFor(); await p.waitForTimeout(1000);
  for (const form of ["IMM 5257 · Sample Client A", "IMM 5476 · Sample Client A"]) {
    await page.getByText(form, { exact: true }).first().click(); await p.waitForTimeout(800);
    const rows = await page.locator("table tbody tr").evaluateAll((trs) => trs.map((t) => [...t.cells].slice(0, 2).map((c) => c.innerText.trim()).join(" = ")));
    const head = await page.getByText(/Facts on this form/).first().innerText();
    const c = {}; rows.forEach((r) => c[r] = (c[r] ?? 0) + 1);
    console.log(form, "|", head, "| rows", rows.length, "| distinct", Object.keys(c).length, "| repeated:", JSON.stringify(Object.entries(c).filter(([, n]) => n > 1).slice(0, 6)));
  }
  await b.close();
})();
