// scout probe 2: apply IMM 5409 proposals, attach the second form, draft it — does the second run reuse the first run's fields?
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const BASE = "http://localhost:4480"; const CID = "fac345c0-2584-4a4d-b08a-d1cbad8d4b3e"; const JOB = "46c24997-2784-4fb7-af3a-cc8898603f4b";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => p.screenshot({ path: `${OUT}/ai-${n}.png`, fullPage: true });
  await p.goto(`${BASE}/ai/${JOB}`, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  console.log("job links:", (await p.locator("a").allTextContents()).filter(t => /proposal|review|field/i.test(t)));
  const reviewLink = p.getByRole("link", { name: /review|proposal|field map/i }).first();
  if (await reviewLink.count()) { await reviewLink.click(); await p.waitForTimeout(1200); await shot("04-proposals"); console.log("proposals page:", p.url()); }
  console.log("page h1:", (await p.locator("h1").first().textContent().catch(()=>"")).trim());
  console.log("page text:", (await p.locator("main").first().innerText()).slice(0, 500).replace(/\n+/g, " | "));
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
