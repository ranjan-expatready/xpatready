// C10.2: each stage of the finished story as a person sees it on the family case page (1440 px), and the thin case.
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const OUT = __dirname, PORT = process.argv[2] || 4433, DB = process.argv[3] || "xr_studio_runtime_walk";
const sql = (q) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
(async () => {
  const fam = sql("select id from runtime_case where reference='SAMPLE-VV-FAMILY-1'"), thin = sql("select id from runtime_case where reference='SAMPLE-VV-THIN-1'");
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = []; page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/cases`); await page.evaluate(() => localStorage.setItem("xr-actor", "user-O"));
  await page.goto(`http://localhost:${PORT}/cases/${fam}`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/10-stage1-moved-release2.png` });
  const at = async (text, name, nth = 0) => {
    const l = page.getByText(text).nth(nth);
    if (!(await l.count())) { console.log("NOT FOUND", text); return; }
    await l.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${name}.png` }); console.log("shot", name, "at", JSON.stringify(text));
  };
  await at("Documents", "11-stage-documents-received");
  await at(/Prepare application/, "12-stage-prepare");
  await at(/IMM 5257 for Client A/, "13-stage-online-sheet");
  await at(/IMM 5476 for Client A/, "14-stage-imm5476-signed");
  await at(/Ready to file|Submitted|submitted/i, "15-stage-ready-recorded");
  await at(/Correct a number/, "16-stage-recorded-numbers");
  console.log("TEXT", (await page.locator("body").innerText()).replace(/\s+/g, " ").match(/(Ready to file|Submitted|V30000000\d|Recorded)[^.]{0,120}/gi)?.slice(0, 8));
  await page.goto(`http://localhost:${PORT}/cases/${thin}`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/17-thin-case-release1.png` });
  console.log("CONSOLE ERRORS", errors.length, errors.slice(0, 3).join(" || "));
  await b.close();
})().catch((e) => { console.error("WALK FAILED", e.message); process.exit(1); });
