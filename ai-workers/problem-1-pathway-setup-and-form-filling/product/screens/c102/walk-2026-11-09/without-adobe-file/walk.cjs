// C10.2 (Lead 37): walk like a person at 1440 px: Demo › Load the finished story, the result, then the family case page's
// Paper IMM 5257, the filings and the submission record.
const { chromium } = require("playwright");
const OUT = __dirname, PORT = process.argv[2] || 4433, BASE = `http://localhost:${PORT}`;
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = []; page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const shot = (n, o = {}) => page.screenshot({ path: `${OUT}/${n}.png`, ...o });
  await page.goto(BASE + "/"); await page.evaluate(() => localStorage.setItem("xr-actor", "user-A")); await page.goto(BASE + "/");
  await page.getByRole("button", { name: /^Demo/ }).click();
  const item = page.locator("[data-demo-finished-story]"); await item.hover(); await page.waitForTimeout(700); await shot("01-menu-tooltip");
  await item.click();
  await page.locator("[data-finished-story-reading]").waitFor({ state: "detached", timeout: 15000 }).catch(() => undefined); await page.waitForTimeout(300); await page.locator("[data-finished-story-brings]").waitFor(); await shot("02-dialog");
  const confirm = page.locator("[data-finished-story-confirm]"); if (await confirm.count()) await confirm.fill("RESET");
  await page.locator("[data-finished-story-load]").click();
  await page.locator("[data-finished-story-running]").waitFor({ timeout: 30000 }); await shot("03-running");
  await page.locator("[data-finished-story-result]").waitFor({ timeout: 900000 });
  await page.getByRole("dialog").screenshot({ path: `${OUT}/04-result-top.png` });
  const rows = page.locator("[data-story-stage]");
  console.log("STAGES", (await rows.evaluateAll((els) => els.map((e) => `${e.getAttribute("data-story-stage")}=${e.getAttribute("data-status")}`))).join(" "));
  await page.locator('[data-story-stage="paper"]').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  await page.getByRole("dialog").screenshot({ path: `${OUT}/05-result-paper-stage.png` });
  await page.locator("[data-story-open-case]").click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  const at = async (text, name) => { const l = page.getByText(text).first(); if (!(await l.count())) { console.log("NOT FOUND", text); return; } await l.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); await page.waitForTimeout(400); await shot(name); console.log("shot", name); };
  await at(/IMM 5257 for Child 18 or over/, "06-paper-copy-waits-for-validate");
  await at(/Submission to IRCC/, "07-submission-record");
  await at(/Visitor visa: Child 18 or over \(Sample\)/, "08-paper-filing");
  console.log("CONSOLE ERRORS", errors.length, errors.slice(0, 3).join(" || "));
  await b.close();
})().catch((e) => { console.error("WALK FAILED", e.message); process.exit(1); });
