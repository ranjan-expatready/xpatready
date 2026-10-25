// scout probe 5 (the dedupe verdict): combination 2 attaches IMM 5409 again; the run must REUSE combination 1's library fields.
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const BASE = "http://localhost:4480";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => p.screenshot({ path: `${OUT}/ai-${n}.png`, fullPage: true });
  await p.goto(BASE + "/new", { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const combos = p.locator("input[role=combobox]");
  await combos.nth(0).fill("Sample Skilled Worker"); await p.waitForTimeout(400);
  await p.getByRole("option", { name: /sample skilled worker/i }).first().click(); await p.waitForTimeout(400);
  await combos.nth(1).fill("Sample Express Entry"); await p.waitForTimeout(400);
  await p.getByRole("option", { name: /sample express entry/i }).first().click(); await p.waitForTimeout(400);
  await combos.nth(2).fill("Sample Canadian Experience Class"); await p.waitForTimeout(400);
  await p.getByRole("option", { name: /create/i }).first().click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /create and add sources/i }).click(); await p.waitForTimeout(1500);
  const CID2 = p.url().match(/\/c\/([0-9a-f-]+)/)?.[1]; console.log("combination 2:", CID2);
  await p.goto(`${BASE}/c/${CID2}/sources`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /attach a sample file/i }).click(); await p.waitForTimeout(800);
  const d = p.getByRole("dialog");
  // attach IMM 5409 (the same form combination 1 mapped)
  await d.locator("tr", { hasText: "IMM 5409" }).getByRole("button", { name: "Attach" }).click(); await p.waitForTimeout(1500);
  await d.getByRole("button", { name: "Done" }).click(); await p.waitForTimeout(1200);
  await p.goto(`${BASE}/c/${CID2}/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /draft setup/i }).click(); await p.waitForTimeout(800);
  const start = p.getByRole("button", { name: /start \d+ steps?, US\$0/i }).first();
  if (await start.count()) { await start.click(); await p.waitForTimeout(2000);
    for (let i = 0; i < 30; i++) { const t = await p.locator("body").innerText(); if (/\bDone\b/.test(t)) break; await p.waitForTimeout(1500); }
    await shot("09-dedupe-verdict");
    const t = await p.locator("main").first().innerText();
    console.log("verdict row:", (t.split("\n").filter(l => /IMM 5409|reuse/i.test(l)).join(" ~ ")).slice(0, 400)); }
  else console.log("no start button");
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
