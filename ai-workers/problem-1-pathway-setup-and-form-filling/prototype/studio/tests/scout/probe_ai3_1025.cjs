// scout probe 3: accept clean news for IMM 5409, apply; draft IMM 5476 next; does reuse light up?
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const BASE = "http://localhost:4480"; const CID = "fac345c0-2584-4a4d-b08a-d1cbad8d4b3e";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => p.screenshot({ path: `${OUT}/ai-${n}.png`, fullPage: true });
  const job = "18f02658-3fa2-4055-848a-3a54c6a37c42";
  await p.goto(`${BASE}/c/${CID}/jobs/${job}`, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const accept = p.getByRole("button", { name: /accept clean new definitions/i });
  if (await accept.isEnabled()) { await accept.click(); await p.waitForTimeout(1000);
    const apply = p.getByRole("button", { name: /apply to draft/i });
    console.log("apply enabled after accept:", await apply.isEnabled());
    if (await apply.isEnabled()) { await apply.click(); await p.waitForTimeout(2000); await shot("05-applied"); console.log("applied; library fields:", (await fetch(`${BASE}/api/library/fields`, { headers: { "x-actor": "user-A" } }).then(r=>r.json()).catch(()=>[])).length); } }
  else console.log("accept button not enabled — text:", (await p.locator("main").first().innerText()).slice(0,200).replace(/\n+/g," | "));
  // second form draft: the other sample form attached earlier
  await p.goto(`${BASE}/c/${CID}/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /draft setup/i }).click().catch(()=>{}); await p.waitForTimeout(800);
  const start = p.getByRole("button", { name: /start \d+ steps?, US\$0/i }).first();
  console.log("second draft start found:", await start.count());
  if (await start.count()) { await start.click(); await p.waitForTimeout(2000);
    for (let i = 0; i < 30; i++) { const t = await p.locator("body").innerText(); if (/\bDone\b/.test(t)) break; await p.waitForTimeout(1500); }
    await shot("06-second-draft");
    console.log("second run:", (await p.locator("main").first().innerText()).match(/\d+ of \d+ form fields mapped[^|]* reuse[^.]*/)?.[0] ?? (await p.locator("main").first().innerText()).slice(0, 400).replace(/\n+/g, " | ")); }
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
