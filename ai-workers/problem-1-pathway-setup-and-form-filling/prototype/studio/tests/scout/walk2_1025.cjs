// scout firm-admin-day-one walk 2: tabs of the fresh combination, attach a sample form, duplicate attempt, help affordance.
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const BASE = "http://localhost:4480";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => p.screenshot({ path: `${OUT}/w2-${n}.png`, fullPage: true });
  // find the combination
  const list = await fetch(`${BASE}/api/combinations`, { headers: { "x-actor": "user-A" } }).then(r => r.json()).catch(() => null);
  const cid = "00f7ceaf-3fb8-478d-8837-420d5cd1c09d";
  console.log("combination:", cid, list && list[0]?.key, JSON.stringify(list && Object.keys(list[0]||{})));
  await p.goto(`${BASE}/c/${cid}/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(500); await shot("01-overview");
  await p.goto(`${BASE}/c/${cid}/configuration`, { waitUntil: "networkidle" }); await p.waitForTimeout(500); await shot("02-configuration");
  await p.goto(`${BASE}/c/${cid}/preview`, { waitUntil: "networkidle" }); await p.waitForTimeout(500); await shot("03-preview");
  await p.goto(`${BASE}/c/${cid}/review`, { waitUntil: "networkidle" }); await p.waitForTimeout(500); await shot("04-review");
  // attach a sample form
  await p.goto(`${BASE}/c/${cid}/sources`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const attach = p.getByRole("button", { name: /attach a sample file/i });
  if (await attach.count()) { await attach.click(); await p.waitForTimeout(2500); await shot("05-sample-attached");
    console.log("page now has:", (await p.locator("h2, h3").allTextContents()).join(" | ").slice(0, 300)); }
  // help affordance on Programs
  await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const info = p.getByLabel(/about|info/i).first();
  console.log("info button count:", await info.count());
  // duplicate attempt: same names again
  await p.goto(BASE + "/new", { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const combos = p.locator("input[role=combobox]");
  await combos.nth(0).fill("Sample Skilled Worker"); await p.waitForTimeout(600); await shot("06-dup-program");
  console.log("dup opts:", JSON.stringify((await p.locator("[role=option]").allTextContents()).slice(0, 4)));
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
