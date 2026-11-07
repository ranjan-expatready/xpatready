// gate A on #1084: J7 4.1–4.4 by screens at 1440 px on the checkpoint (head). Nothing priced; rules only.
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const [port, out] = process.argv.slice(2); const base = `http://127.0.0.1:${port}`; fs.mkdirSync(out, { recursive: true });
const log = []; const say = (k, v) => { log.push([k, v]); console.log(k, "::", typeof v === "string" ? v.slice(0, 400) : JSON.stringify(v)); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  const T = async (l = p.locator("body")) => (await l.innerText()).replace(/\s+/g, " ");
  await p.goto(base + "/"); await p.evaluate(() => localStorage.setItem("xr-actor", "user-O")); await p.goto(base + "/cases"); await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: /Open a case/ }).first().click(); const d = p.getByRole("dialog");
  const sel = d.getByRole("combobox", { name: /Combination/ }); await sel.waitFor(); const vv = (await sel.locator("option").allInnerTexts()).find((o) => /Visitor visa/.test(o)); await sel.selectOption({ label: vv });
  await d.getByLabel(/Case reference/).fill("GATEA-1084-2"); await d.getByLabel(/Principal applicant's name/).fill("Sample Client A");
  const rep = d.getByRole("combobox", { name: /Representative of record/ }); await rep.selectOption({ index: 1 });
  await d.getByRole("button", { name: /Open the case|Open case|^Open$/ }).last().click(); await p.waitForURL(/\/cases\/[^/]+$/); await p.waitForLoadState("networkidle");
  const caseUrl = p.url(); say("case", caseUrl);
  await p.goto(caseUrl + "/eligibility"); await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: "Run eligibility check" }).click(); await p.getByText(/Possibly eligible|Likely eligible|Not eligible/).first().waitFor();
  say("4.1 result", await T(p.locator("main")));
  await p.screenshot({ path: path.join(out, "4-1-run.png"), fullPage: true });
  // 4.4: override without a reason, then with one; Mark reviewed.
  await p.getByRole("button", { name: /Override result/ }).first().click(); let dl = p.getByRole("dialog");
  say("4.4 override dialog", await T(dl));
  await dl.getByRole("button", { name: "Keep the override" }).click(); await p.waitForTimeout(800); say("4.4 override, no reason", await T(dl));
  await p.screenshot({ path: path.join(out, "4-4-override-no-reason.png") });
  await dl.getByLabel("Label").fill("Likely, on the documents (Sample)"); await dl.getByLabel("Reason").fill("Sample: the officer read the documents (gate A)"); await dl.getByRole("button", { name: "Keep the override" }).click(); await dl.waitFor({ state: "detached", timeout: 10000 }).catch(() => {}); await p.waitForLoadState("networkidle");
  say("4.4 after override", await T(p.locator("main")));
  await p.getByRole("button", { name: /Mark reviewed/ }).first().click(); dl = p.getByRole("dialog"); await dl.getByRole("button", { name: "Mark reviewed" }).click(); await dl.waitFor({ state: "detached", timeout: 10000 }).catch(() => {}); await p.waitForLoadState("networkidle");
  say("4.4 after review", await T(p.locator("main")));
  await p.screenshot({ path: path.join(out, "4-4-reviewed.png"), fullPage: true });
  // As the client: the eligibility page is staff only.
  await p.evaluate(() => localStorage.setItem("xr-actor", "user-P")); await p.goto(caseUrl + "/eligibility"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
  say("client on eligibility", await T(p.locator("main")));
  fs.writeFileSync(path.join(out, "elig.json"), JSON.stringify({ log, errs }, null, 1)); console.log("errors", errs); await b.close();
})().catch((e) => { console.error("STOPPED", e.message); fs.writeFileSync(path.join(out, "elig.json"), JSON.stringify({ stopped: e.message, log }, null, 1)); process.exit(1); });
