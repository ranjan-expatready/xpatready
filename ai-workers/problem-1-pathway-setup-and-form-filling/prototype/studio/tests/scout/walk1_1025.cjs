// scout firm-admin-day-one walk 1: create program > category > sub-category from nothing, sample names; screenshot each state.
const path = require("node:path"); const { chromium } = require(process.cwd()+"/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "scout", "reports", "2026-10-25-firm-admin-day-one");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => p.screenshot({ path: `${OUT}/w1-${n}.png`, fullPage: true });
  const log = async (m) => console.log(m);
  await p.goto("http://localhost:4480/new", { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const combos = p.locator("input[role=combobox]");
  await combos.nth(0).fill("Sample Skilled Worker"); await p.waitForTimeout(500); await shot("01-program-typed");
  const opts1 = await p.locator("[role=option], [role=listbox] *").allTextContents(); console.log("program opts:", JSON.stringify(opts1.slice(0,6)));
  const createOpt = p.getByRole("option", { name: /create/i }).first();
  if (await createOpt.count()) { await createOpt.click(); } else { await p.keyboard.press("Enter"); }
  await p.waitForTimeout(500); await shot("02-program-picked");
  await combos.nth(1).fill("Sample Express Entry"); await p.waitForTimeout(500); await shot("03-category-typed");
  const createOpt2 = p.getByRole("option", { name: /create/i }).first();
  if (await createOpt2.count()) { await createOpt2.click(); } else { await p.keyboard.press("Enter"); }
  await p.waitForTimeout(500);
  await combos.nth(2).fill("Sample Federal Skilled Worker"); await p.waitForTimeout(500); await shot("04-sub-typed");
  const createOpt3 = p.getByRole("option", { name: /create/i }).first();
  if (await createOpt3.count()) { await createOpt3.click(); } else { await p.keyboard.press("Enter"); }
  await p.waitForTimeout(600); await shot("05-before-create");
  const disabled = await p.getByRole("button", { name: /create and add sources/i }).isDisabled();
  console.log("create disabled?", disabled);
  await p.getByRole("button", { name: /create and add sources/i }).click();
  await p.waitForTimeout(1500); await shot("06-after-create");
  console.log("landed at:", p.url());
  console.log("h1:", (await p.locator("h1").first().textContent().catch(()=>"")).trim());
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
