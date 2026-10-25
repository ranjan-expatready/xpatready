// scout firm-admin-day-one walk 3: attach sample forms, review tab, responsive + keyboard passes, API probes.
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
const BASE = "http://localhost:4480"; const CID = "00f7ceaf-3fb8-478d-8837-420d5cd1c09d";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = async (n, pg = p) => pg.screenshot({ path: `${OUT}/w3-${n}.png`, fullPage: true });
  // attach a sample form and a checklist
  await p.goto(`${BASE}/c/${CID}/sources`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  await p.getByRole("button", { name: /attach a sample file/i }).click(); await p.waitForTimeout(800);
  const dlg = p.getByRole("dialog");
  await dlg.getByRole("button", { name: "Attach" }).nth(3).click(); await p.waitForTimeout(1200); await shot("01-attaching");
  await dlg.getByRole("button", { name: "Attach" }).nth(2).click(); await p.waitForTimeout(1200);
  await dlg.getByRole("button", { name: "Done" }).click(); await p.waitForTimeout(1500); await shot("02-sources-after");
  console.log("sources page headings:", (await p.locator("h2,h3").allTextContents()).join(" | ").slice(0, 400));
  await p.goto(`${BASE}/c/${CID}/overview`, { waitUntil: "networkidle" }); await p.waitForTimeout(500); await shot("03-overview-after");
  console.log("missing box:", (await p.locator("text=Missing before firms can use it").count()) ? "still there" : "gone/changed");
  await p.goto(`${BASE}/c/${CID}/review`, { waitUntil: "networkidle" }); await p.waitForTimeout(500); await shot("04-review-tab");
  console.log("review text:", (await p.locator("main").innerText()).slice(0, 300).replace(/\n+/g, " | "));
  // activity after our actions
  await p.goto(`${BASE}/activity`, { waitUntil: "networkidle" }); await p.waitForTimeout(600); await shot("05-activity");
  console.log("activity:", (await p.locator("main").innerText()).slice(0, 250).replace(/\n+/g, " | "));
  // 390px pass
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/", { waitUntil: "networkidle" }); await m.waitForTimeout(500); await shot("06-mobile-home", m);
  await m.goto(`${BASE}/c/${CID}/overview`, { waitUntil: "networkidle" }); await m.waitForTimeout(500); await shot("07-mobile-overview", m);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth);
  console.log("mobile scrollWidth @390:", overflow);
  // keyboard pass on /new
  const k = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await k.goto(BASE + "/new", { waitUntil: "networkidle" }); await k.waitForTimeout(400);
  const seq = [];
  for (let i = 0; i < 14; i++) { await k.keyboard.press("Tab"); await k.waitForTimeout(120);
    seq.push(await k.evaluate(() => { const e = document.activeElement; return `${e.tagName}:${(e.getAttribute("aria-label")||e.textContent||e.getAttribute("placeholder")||"").trim().slice(0,30)}`; })); }
  console.log("tab order /new:", JSON.stringify(seq));
  // 200% zoom pass = viewport 720x450 (200% of 1440x900)
  const z = await b.newPage({ viewport: { width: 720, height: 450 } });
  await z.goto(`${BASE}/c/${CID}/overview`, { waitUntil: "networkidle" }); await z.waitForTimeout(500); await shot("08-zoom200-overview", z);
  console.log("zoom200 scrollWidth:", await z.evaluate(() => document.documentElement.scrollWidth));
  // API probes underneath
  const api = async (u) => (await fetch(`${BASE}/api${u}`, { headers: { "x-actor": "user-A" } })).json().catch(() => null);
  const comb = await api(`/combinations/${CID}`);
  console.log("api combination keys:", comb && Object.keys(comb).join(","));
  console.log("people:", JSON.stringify(comb && (comb.people || comb.details?.people) || "n/a").slice(0, 200));
  const tree = await api("/programs/tree");
  console.log("api /programs/tree:", JSON.stringify(tree).slice(0, 200));
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
