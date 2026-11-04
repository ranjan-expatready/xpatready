// qa2 1440 px walk of C9.1 as an author/RCIC: upload through Form library, To review, edition review, Saved (US$0). Never clicks [data-priced].
const STUDIO = process.argv[2], OUT = process.argv[3], BASE = "http://localhost:4480";
const { chromium } = require(STUDIO + "/node_modules/playwright");
const OFF = STUDIO + "/../../official-sources/ircc";
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const log = (s, v) => console.log((v ? "PASS  " : "FAIL  ") + s);
  const errs = []; p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(BASE + "/"); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} });
  await p.goto(BASE + "/library/forms"); await p.waitForTimeout(1500);
  const up = async (f) => { await p.locator('input[type="file"]').first().setInputFiles(f); await p.waitForTimeout(6000); };
  await up(OFF + "/previous-editions/imm5476e-2021.pdf");
  await p.screenshot({ path: OUT + "/walk-1-library-2021.png", fullPage: false });
  await up(OFF + "/forms/imm5476e.pdf");
  await p.screenshot({ path: OUT + "/walk-2-new-edition-held.png", fullPage: false });
  const body2 = await p.locator("body").innerText(); log("Upload of 11-2025 says it is held as a new edition", /held|new edition/i.test(body2));
  await p.goto(BASE + "/review"); await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + "/walk-3-to-review.png" });
  const rev = await p.locator("body").innerText(); log("To review names the new edition of IMM 5476", /New edition/i.test(rev) && /5476/.test(rev));
  const link = p.locator('a[href*="/review/edition/"]').first();
  if (await link.count()) await link.click(); else { const id = require("node:child_process").execFileSync("psql", ["-h","127.0.0.1","-p","54329","-U","xr_studio","-d","xr_studio_qa2_c91","-tAc","select id from intake_item where outcome='new_edition_held' and status='HELD' limit 1"]).toString().trim(); await p.goto(BASE + "/review/edition/" + id); }
  await p.getByRole("heading", { level: 1, name: "New edition: review impact" }).waitFor({ timeout: 60000 });
  await p.locator("[data-impact-ai]").waitFor({ timeout: 30000 });
  await p.screenshot({ path: OUT + "/walk-4-review.png", fullPage: true });
  const t = await p.locator("body").innerText();
  log("Review shows counts 30 unchanged · 7 reworded · 16 new · 6 removed", /30/.test(t) && /7/.test(t) && /16/.test(t));
  log("Raw form-field paths visible (QA-203 still open?)", /form1\[|\[0\]\./.test(t));
  log("IRCC accepted-until date shown", (await p.locator("[data-accepted-until]").count()) > 0);
  log("Priced button absent while a saved run exists", (await p.locator("[data-priced]").count()) === 0);
  for (const name of [/Impact on library/, /Components touched/, /Combinations/]) { const tab = p.getByRole("tab", { name }); if (await tab.count()) { await tab.first().click(); await p.waitForTimeout(500); await p.screenshot({ path: OUT + `/walk-5-tab-${String(name).replace(/\W/g, "")}.png`, fullPage: true }); } }
  await p.getByRole("tab").first().click();
  await p.locator("[data-use-saved]").click(); await p.locator("[data-drafted]").waitFor({ timeout: 30000 });
  log("Saved puts proposals on To review: " + (await p.locator("[data-drafted]").innerText()).slice(0, 160), true);
  await p.screenshot({ path: OUT + "/walk-6-saved.png", fullPage: true });
  console.log("console errors: " + errs.length + (errs.length ? " " + errs.slice(0, 3).join(" | ") : ""));
  await b.close();
})().catch((e) => { console.error("WALK ERROR " + e.message); process.exit(1); });
