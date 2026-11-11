// C10.2 (10 Nov, #1482): walk like a person at 1440 px on a fresh copy of the branch: Demo › Load the finished story, the
// result, then the family case page's Paper IMM 5257 for Child 18 or over (Sample). Afterwards (the API a page reads),
// the copy's four 10 Nov boxes say why they are empty. Playwright, 1440 x 900.
const { chromium } = require("playwright");
const OUT = __dirname, PORT = process.argv[2] || 4433, BASE = `http://localhost:${PORT}`;
(async () => {
  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = []; page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const shot = (n, o = {}) => page.screenshot({ path: `${OUT}/${n}.png`, ...o });
  await page.goto(BASE + "/"); await page.evaluate(() => localStorage.setItem("xr-actor", "user-A")); await page.goto(BASE + "/");
  await page.getByRole("button", { name: /^Demo/ }).click();
  await page.locator("[data-demo-finished-story]").click();
  await page.locator("[data-finished-story-brings]").waitFor({ timeout: 20000 });
  const confirm = page.locator("[data-finished-story-confirm]"); if (await confirm.count()) await confirm.fill("RESET");
  await page.locator("[data-finished-story-load]").click();
  await page.locator("[data-finished-story-result]").waitFor({ timeout: 900000 });
  await page.getByRole("dialog").screenshot({ path: `${OUT}/01-result.png` });
  console.log("STAGES", (await page.locator("[data-story-stage]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-story-stage")}=${e.getAttribute("data-status")}`))).join(" "));
  await page.locator("[data-story-open-case]").click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  const l = page.getByText(/Child 18 or over \(Sample\).*IMM 5257|IMM 5257.*Child 18 or over|Paper/).first();
  if (await l.count()) { await l.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); await page.waitForTimeout(400); await shot("03-how-each-form-is-filed"); console.log("shot 03"); } else console.log("NOT FOUND paper copy");
  console.log("CONSOLE ERRORS", errors.length, errors.slice(0, 3).join(" || "));
  await b.close();
})().catch((e) => { console.error("WALK FAILED", e.message); process.exit(1); });
