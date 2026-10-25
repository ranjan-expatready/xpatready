// scout probe: attach two sample forms, run Draft setup on replayed saved runs (US$0), inspect proposals and library reuse.
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const BASE = "http://localhost:4480"; const CID = "fac345c0-2584-4a4d-b08a-d1cbad8d4b3e";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => p.screenshot({ path: `${OUT}/ai-${n}.png`, fullPage: true });
  await p.goto(`${BASE}/c/${CID}/sources`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /attach a sample file/i }).click(); await p.waitForTimeout(800);
  const dlg = p.getByRole("dialog");
  await dlg.getByRole("button", { name: "Attach" }).nth(2).click(); await p.waitForTimeout(1000); // IMM 5409
  await dlg.getByRole("button", { name: "Attach" }).nth(2).click(); await p.waitForTimeout(1000); // IMM 5476 (list shifts)
  await dlg.getByRole("button", { name: "Done" }).click(); await p.waitForTimeout(1200);
  // Draft setup → keep Live AI (saved runs, US$0) → start
  await p.goto(`${BASE}/c/${CID}/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /draft setup/i }).click(); await p.waitForTimeout(800); await shot("01-dialog");
  const start = p.getByRole("button", { name: /start \d+ steps?, US\$0/i });
  console.log("start button:", await start.count() ? "found" : "NOT found", "| label:", await p.getByRole("dialog").getByRole("button").allTextContents());
  if (await start.count()) { await start.click(); await p.waitForTimeout(1500); await shot("02-started"); console.log("after start url:", p.url()); }
  // wait for the job to finish
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(1500);
    const t = await p.locator("body").innerText();
    if (/done|finished|approve|accept|proposal/i.test(t)) break; }
  await shot("03-job");
  console.log("job page:", (await p.locator("main").first().innerText()).slice(0, 600).replace(/\n+/g, " | "));
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
