// qa gate A walk of C3.16, part 5 by screens: on the worker case, after C1.3's copy, the case officer generates a copy of
// IMM 5710 for Client A (C7.7's first step) and reads what it says about its form fields. node walk5_generate_copy.cjs <port> <out> <case>
const { chromium } = require("playwright");
const [port, out, caseId] = process.argv.slice(2);
const flat = (s) => s.replace(/\n+/g, " | ");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 800 } });
  await p.addInitScript(() => localStorage.setItem("xr-actor", "user-O"));
  const copies = [];
  p.on("response", async (r) => { if (/\/form-copies\/[0-9a-f-]{36}$/.test(r.url())) copies.push(r.url()); });
  await p.goto(`http://localhost:${port}/cases/${caseId}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  const row = p.locator("main li").filter({ has: p.locator("h3", { hasText: /^IMM 5710/ }) }).first();
  console.log("ROW BEFORE", flat(await row.innerText()).slice(0, 700));
  await row.getByRole("button", { name: /Generate a (new )?copy/ }).click();
  await p.waitForTimeout(6000);
  console.log("ROW AFTER", flat(await row.innerText()).slice(0, 900));
  await row.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${out}/09-imm5710-copy-generated.png` });
  console.log("COPIES SEEN", JSON.stringify(copies));
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
