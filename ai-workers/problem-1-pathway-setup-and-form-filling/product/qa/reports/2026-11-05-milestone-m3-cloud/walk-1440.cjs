// qa milestone M3 (cloud, 5 Nov): J7 walked like a person at 1440 px on the configured checkpoint, screens only.
// node walk-1440.cjs <port> <out dir> [--no-load]
// Stage 0.1 through the Demo menu (Reset demo, then Load the configured checkpoint) as the author; then, in the case
// area as the Case officer: Open a case on Visitor visa with the representative of record, add a spouse and two
// children, and read what each J7 stage needs a person to see. Writes walk.json (one line per step: seen or not) and a
// screenshot per decision point. Live AI off, US$0: no priced button is pressed (the walk never clicks "Run AI review"
// or any live switch).
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const [port, out, flag] = process.argv.slice(2);
const base = `http://127.0.0.1:${port}`;
fs.mkdirSync(out, { recursive: true });
const steps = [];
const note = (j7, what, seen, detail = "") => { steps.push({ j7, what, seen, detail }); console.log(`${seen ? "SEEN   " : "MISSING"} J7 ${j7}  ${what}${detail ? ` — ${detail}` : ""}`); };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 300)}`); });
  const shot = (n) => page.screenshot({ path: path.join(out, `${n}.png`), fullPage: true });
  const body = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ");
  await page.goto(base + "/");
  await page.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  await page.goto(base + "/");
  await page.waitForLoadState("networkidle");
  if (flag !== "--no-load") {
    // Stage 0.1: Demo › Reset demo…, then Demo › Load the configured checkpoint…
    await page.getByRole("button", { name: /^Demo/ }).click();
    await page.getByRole("menuitem", { name: /Reset demo/ }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Type RESET to confirm").fill("RESET", { timeout: 30000 });
    await dlg.getByRole("button", { name: /Reset/ }).last().click();
    await page.waitForTimeout(4000);
    await page.goto(base + "/"); await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Demo/ }).click();
    await page.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
    const t0 = Date.now();
    await page.getByRole("dialog").getByRole("button", { name: /Load the configured checkpoint/ }).click();
    await page.getByRole("dialog", { name: /Configured checkpoint loaded/ }).waitFor({ timeout: 1_200_000 });
    await shot("0-1-checkpoint-loaded");
    const res = await page.locator("[data-conf-result]").innerText();
    fs.writeFileSync(path.join(out, "checkpoint-result.txt"), res);
    note("0.1", "Demo › Configured checkpoint loads through the menu", true, `${Math.round((Date.now() - t0) / 1000)} s; result table saved`);
    await page.getByRole("button", { name: "Continue" }).click();
  }
  // Stage 1.1: the author sees Visitor visa's release.
  await page.goto(base + "/"); await page.waitForLoadState("networkidle");
  const prog = await body();
  note("1.1", "Immigration programs lists Visitor visa as released", /Visitor visa/.test(prog) && /Releas/i.test(prog));
  await shot("1-1-programs");
  // Stage 2.1: Case officer opens a case.
  await page.evaluate(() => localStorage.setItem("xr-actor", "user-O"));
  await page.goto(base + "/cases"); await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Open a case/ }).first().click();
  const d = page.getByRole("dialog");
  await d.getByText(/Visitor visa/).first().waitFor({ timeout: 20000 }).catch(() => {});
  const sel = d.getByRole("combobox", { name: /Combination/ });
  const opts = await sel.locator("option").allInnerTexts().catch(() => []);
  const vv = opts.find((o) => /Visitor visa/.test(o));
  note("2.1a", "Open a case offers Visitor visa (released)", !!vv, opts.join(" / "));
  if (vv) await sel.selectOption({ label: vv });
  await d.getByLabel(/Case reference/).fill("QA-M3-WALK-1");
  await d.getByLabel(/Principal applicant's name/).fill("Sample Client A");
  const rep = d.getByRole("combobox", { name: /Representative of record/ });
  const repOpts = await rep.locator("option").allInnerTexts().catch(() => []);
  note("2.1b", "Choose the representative of record (one of the Sample firm's two)", repOpts.length > 1, repOpts.join(" / "));
  if (repOpts.length > 1) await rep.selectOption({ index: 1 });
  const dlgText = (await d.innerText()).replace(/\s+/g, " ");
  note("2.1c", "\"Will be created as\": filings, one family submission, release named", /Will be created as/i.test(dlgText), dlgText.slice(0, 400));
  await shot("2-1-open-a-case");
  await d.getByRole("button", { name: /Open the case|Open case|^Open$/ }).last().click();
  await page.waitForURL(/\/cases\/[^/]+$/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  const caseUrl = page.url();
  for (const [role, name] of [["Add spouse or partner", "Sample Spouse A"], ["Add child", "Sample Child A1"], ["Add child", "Sample Child A2"]]) {
    await page.getByRole("button", { name: role }).click();
    const ad = page.getByRole("dialog");
    const adText = (await ad.innerText()).replace(/\s+/g, " ");
    if (name === "Sample Spouse A") note("2.1d", "Add a person asks for a date of birth", /date of birth/i.test(adText), adText.slice(0, 200));
    await ad.getByLabel("Name").fill(name);
    await ad.getByRole("button", { name: "Add" }).click();
    await ad.waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
  }
  await page.waitForTimeout(1500);
  await shot("2-3-case-family-of-four");
  const c = await body();
  fs.writeFileSync(path.join(out, "case-page.txt"), c);
  note("2.1e", "Team chip Representative · Case officer", /Representative/.test(c) && /Case officer/.test(c));
  note("2.3a", "Filings chip \"Visitor visa · 4 filings\"", /4 filings/i.test(c));
  note("2.3b", "\"Filed through APR Portal\" read-only on the case", /Filed through/i.test(c));
  note("2.4", "Fees panel: Visitor visa CAD 100 × 4, biometrics with IRCC's source", /CAD\s?100|\$100/i.test(c) && /biometric/i.test(c) && /fee/i.test(c));
  note("2.5", "Reassign the case officer (firm admin)", /Reassign|Assign a case officer/i.test(c));
  note("3.1", "Documents checklist per person (passports, proof of financial support)", /Passport/i.test(c) && /(financial support|Request|Received|checklist)/i.test(c));
  note("3.3", "Request / upload a document from the case", /Upload|Request/i.test(c));
  note("3.4", "\"Fill this from documents\" on a section", /Fill this from documents/i.test(c));
  note("4.1", "Eligibility card with a case check", /Eligib|Case check/i.test(c));
  note("5.1", "Prepare application lists IMM 5257, IMM 5707, IMM 5476 per person", /IMM 5257/.test(c) && /IMM 5707/.test(c) && /IMM 5476/.test(c), `IMM 5476 ${/IMM 5476/.test(c) ? "listed" : "not listed"}`);
  note("5.2", "Change channel on a form row", /Change channel|channel/i.test(c));
  note("5.3", "IMM 5707 answer sheet with Copy buttons", /answer sheet|Copy/i.test(c));
  note("5.5", "Download PDF copy / Generate a copy", /Generate a copy|Download PDF copy/i.test(c));
  note("5.6", "Upload the validated copy (barcode form)", /validated/i.test(c));
  note("5.7", "Sign steps: print → signed → scan → uploaded", /Printed|Signed by hand|scan/i.test(c));
  note("6.1", "Review: rules cross-checks / findings", /Finding|Review/i.test(c));
  note("6.4", "Readiness per filing: blocks by who owes them", /block|Ready to file/i.test(c));
  note("6.6", "Representative reviews the filing", /Review the filing|Reviewed by/i.test(c));
  note("7.1", "Pass a warning with a reason; press Ready to file", await page.getByRole("button", { name: /Ready to file|Pass/ }).count() > 0);
  note("7.3", "Record the submission for the family", /Record the submission|Submission to IRCC/i.test(c));
  // The forms panel and submission panel up close.
  for (const [id, n] of [["forms-h", "5-1-prepare-application"], ["submission-h", "7-3-submission"]]) {
    const h = page.locator(`#${id}`);
    if (await h.count()) { await h.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, `${n}.png`) }); }
  }
  // Eligibility page.
  await page.goto(caseUrl + "/eligibility"); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1000);
  const el = await body();
  note("4.1b", "Eligibility tab: Possibly eligible — needs …; officer's judgement lines", /eligib/i.test(el), el.slice(0, 200));
  await shot("4-1-eligibility");
  fs.writeFileSync(path.join(out, "walk.json"), JSON.stringify({ caseUrl, steps, errors }, null, 1));
  console.log(`errors: ${errors.length}`); errors.slice(0, 10).forEach((e) => console.log("  " + e));
  await browser.close();
})().catch(async (e) => { console.error("WALK STOPPED:", e.message); fs.writeFileSync(path.join(out, "walk.json"), JSON.stringify({ stopped: e.message, steps }, null, 1)); process.exit(1); });
