// scout firm-admin-day-one walk 4: governance probe (approve as author), help affordance, Draft setup peek.
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const BASE = "http://localhost:4480"; const CID = "00f7ceaf-3fb8-478d-8837-420d5cd1c09d";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => p.screenshot({ path: `${OUT}/w4-${n}.png`, fullPage: true });
  // 1. approve as the author: server must refuse it AND the UI should not offer it
  await p.goto(`${BASE}/c/${CID}/review`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const approve = p.getByRole("button", { name: /approve and release/i });
  const enabled = await approve.isEnabled();
  console.log("Approve and release enabled for the author:", enabled);
  if (enabled) { await approve.click(); await p.waitForTimeout(1200); await shot("01-approve-as-author");
    console.log("after click:", (await p.locator("main").innerText()).match(/[Cc]annot|refus|never|error[^.]*/g)?.slice(0,3)); }
  // 2. help affordance next to "Programs"
  await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.locator("h1").first().locator("..").locator("button, [aria-label]").first().click().catch(() => {});
  await p.waitForTimeout(600); await shot("02-help-open");
  console.log("help text:", (await p.locator("body").innerText()).match(/Programs are[\s\S]{0,300}/)?.[0]?.replace(/\s+/g, " "));
  // 3. Draft setup peek (simulated, US$0)
  await p.goto(`${BASE}/c/${CID}/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const draft = p.getByRole("button", { name: /draft setup/i });
  if (await draft.count()) { await draft.click(); await p.waitForTimeout(1500); await shot("03-draft-setup"); console.log("draft dialog:", (await p.locator("[role=dialog], main").first().innerText()).slice(0, 250).replace(/\n+/g, " | ")); }
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
