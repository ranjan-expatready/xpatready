// scout firm-admin-day-one recon (25 Oct): screenshots of the day-one screens at 1440px; api probe of programs.
const path = require("node:path"); const { chromium } = require("../../node_modules/playwright");
const BASE = "http://localhost:4480";
const OUT = path.join(__dirname, "..", "..", "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const pages = [["home","/"],["new","/new"],["library-fields","/library/fields"],["library-forms","/library/forms"],["release","/release"],["ai","/ai"],["activity","/activity"],["releases","/releases"]];
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [name, url] of pages) {
    await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/r-${name}.png`, fullPage: true });
    const title = await page.locator("h1").first().textContent().catch(() => null);
    console.log(name, url, "| h1:", (title||"").trim());
  }
  const r = await fetch(`${BASE}/api/programs`, { headers: { "x-actor": "user-A" } });
  const programs = await r.json().catch(() => null);
  console.log("api /programs:", Array.isArray(programs) ? programs.map(p=>`${p.key||p.id}:${p.name}`).join(" ; ") : programs);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
