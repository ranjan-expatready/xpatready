// scout probe 4: confirm Apply dialog, attach form 2, draft it, read the reuse counter.
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const BASE = "http://localhost:4480"; const CID = "fac345c0-2584-4a4d-b08a-d1cbad8d4b3e";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => p.screenshot({ path: `${OUT}/ai-${n}.png`, fullPage: true });
  await p.goto(`${BASE}/c/${CID}/jobs/18f02658-3fa2-4055-848a-3a54c6a37c42`, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  await p.getByRole("button", { name: /apply to draft/i }).last().click(); await p.waitForTimeout(600);
  const dlg = p.getByRole("dialog");
  if (await dlg.count()) { await dlg.getByRole("button", { name: /apply to draft/i }).click(); await p.waitForTimeout(2500); }
  console.log("library fields after apply:", (await fetch(`${BASE}/api/library/fields`, { headers: { "x-actor": "user-A" } }).then(r=>r.json()).catch(()=>[])).length);
  // attach the second sample form (IMM 5476 family info — shares identity fields with 5409)
  await p.goto(`${BASE}/c/${CID}/sources`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /attach a sample file/i }).click(); await p.waitForTimeout(800);
  const d2 = p.getByRole("dialog");
  await d2.getByRole("button", { name: "Attach" }).nth(2).click(); await p.waitForTimeout(1200);
  await d2.getByRole("button", { name: "Done" }).click(); await p.waitForTimeout(1200); await shot("07-sources-two");
  console.log("sources:", (await p.locator("main").first().innerText()).match(/IMM \d{4} \([0-9-]+\)/g));
  await p.getByRole("button", { name: /read form|draft/i }).first(); // noop peek
  await p.goto(`${BASE}/c/${CID}/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /draft setup/i }).click(); await p.waitForTimeout(800);
  const start = p.getByRole("button", { name: /start \d+ steps?, US\$0/i }).first();
  if (await start.count()) { await start.click(); await p.waitForTimeout(2000);
    for (let i = 0; i < 30; i++) { const t = await p.locator("body").innerText(); if (/\bDone\b/.test(t)) break; await p.waitForTimeout(1500); }
    await shot("08-second-draft-done");
    const row = (await p.locator("main").first().innerText()).split("\n").filter(l => /IMM|reuse|new|ambiguous/i.test(l)).join(" ~ ");
    console.log("second run row:", row.slice(0, 400)); }
  else console.log("no draft-launch button; overview:", (await p.locator("main").first().innerText()).slice(0, 200).replace(/\n+/g, " | "));
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
