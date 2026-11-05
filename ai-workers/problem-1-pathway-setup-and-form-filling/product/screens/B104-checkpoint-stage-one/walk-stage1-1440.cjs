// B104 (P-351): journey J7 Stage 1 walked like a person at 1440 px on a fresh configured checkpoint, screens only.
//   node walk-stage1-1440.cjs <port> <out dir>
// Stage 0.1 through the Demo menu (Reset demo, then Load the configured checkpoint) as the author; then Stage 1 as the
// author on Immigration programs › Visitors › Visitor visa (1.1 the release and "Filed through", 1.2–1.3 who fills, from
// what age and who signs, 1.5 the IRCC account); 1.8 has no authoring screen (row B106), so its result is read where a
// person meets it; then the next capability's first step (P-348 (3)): the case officer opens a case on Visitor visa
// (2.1), the case reads "Filed through APR Portal" (2.3), and its Eligibility page runs a case check (4.1) instead of
// refusing it. Writes walk.json (one line per step, exit 1 if any step is missing) and a screenshot per step. Live AI
// off, US$0: no priced button is pressed. Never port 4400.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const [port, out] = process.argv.slice(2);
if (!port || port === "4400") { console.error("usage: node walk-stage1-1440.cjs <port, never 4400> <out dir>"); process.exit(2); }
const base = `http://127.0.0.1:${port}`;
fs.mkdirSync(out, { recursive: true });
const steps = [];
const note = (j7, what, seen, detail = "") => { steps.push({ j7, what, seen: !!seen, detail }); console.log(`${seen ? "SEEN   " : "MISSING"} J7 ${j7}  ${what}${detail ? ` — ${detail}` : ""}`); };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 300)}`); });
  const shot = (n) => page.screenshot({ path: path.join(out, `${n}.png`), fullPage: true });
  const text = async (loc = page.locator("body")) => (await loc.innerText()).replace(/\s+/g, " ");
  const as = async (actor, url) => { await page.evaluate((a) => localStorage.setItem("xr-actor", a), actor); await page.goto(base + url); await page.waitForLoadState("networkidle"); };
  await page.goto(base + "/");
  await as("user-A", "/");

  // 0.1: Demo › Reset demo…, then Demo › Load the configured checkpoint…
  await page.getByRole("button", { name: /^Demo/ }).click();
  await page.getByRole("menuitem", { name: /Reset demo/ }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Type RESET to confirm").fill("RESET", { timeout: 30000 });
  await dlg.getByRole("button", { name: /Reset/ }).last().click();
  await dlg.waitFor({ state: "detached", timeout: 300000 });
  await as("user-A", "/");
  await page.getByRole("button", { name: /^Demo/ }).click();
  await page.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
  const t0 = Date.now();
  await page.getByRole("dialog").getByRole("button", { name: /Load the configured checkpoint/ }).click();
  await page.getByRole("dialog", { name: /Configured checkpoint loaded/ }).waitFor({ timeout: 1_200_000 });
  await shot("0-1-checkpoint-loaded");
  note("0.1", "Demo › Reset, then Load the configured checkpoint, through the menu", true, `${Math.round((Date.now() - t0) / 1000)} s`);
  await page.getByRole("button", { name: "Continue" }).click();

  // 1.1: Immigration programs › Visitor visa, release 1.
  await as("user-A", "/");
  await page.getByRole("link", { name: /^Visitor visa/ }).first().click();
  await page.waitForURL(/\/c\/[^/]+/, { timeout: 30000 }); await page.waitForLoadState("networkidle");
  const combo = page.url().match(/\/c\/([^/?#]+)/)[1];
  const head = await text();
  note("1.1", "Visitor visa opens, showing its release", /Visitor visa/.test(head) && /release 1|Release 1|Released/i.test(head), head.match(/[^.]{0,60}[Rr]elease[^.]{0,60}/)?.[0] ?? "");
  await shot("1-1-visitor-visa");

  // 1.2–1.3 and 1.5: the Forms tab.
  await as("user-A", `/c/${combo}/forms`);
  const row = async (code) => { const r = page.locator(`tr[data-line="${code}"]`); return (await r.count()) ? await text(r.first()) : ""; };
  const r5257 = await row("IMM 5257"), r5707 = await row("IMM 5707"), r5476 = await row("IMM 5476"), rSch1 = await row("IMM 5257 SCH1");
  note("1.2", "IMM 5476: signed by the person and the representative", /The person and the representative/.test(r5476), r5476.slice(0, 220));
  note("1.3a", "IMM 5707: each person from 18, signed by the person", /18\+/.test(r5707) && /The person the form is about/.test(r5707), r5707.slice(0, 220));
  note("1.3b", "IMM 5257: a parent signs for a minor", /A parent, for a minor/.test(r5257), r5257.slice(0, 220));
  note("1.3c", "IMM 5257 SCH1: children from 18 (its signer left unset, for the expert)", /children 18\+/.test(rSch1) && /Not set/.test(rSch1), rSch1.slice(0, 220));
  const acct = page.getByRole("combobox", { name: "IRCC account this combination files through" });
  const chosen = (await acct.count()) ? await acct.evaluate((s) => s.options[s.selectedIndex]?.text ?? "") : "";
  note("1.5", "IRCC account: APR Portal", /APR Portal/.test(chosen), chosen);
  await shot("1-2-forms-tab");

  // 1.8: no authoring screen yet (B106); the gates are read where a person meets them, at 4.1 below.
  note("1.8", "Eligibility gates: no authoring screen (row B106); set by the checkpoint, read on the case at 4.1", true, "allow-listed route, tech lead's ruling on #1084");

  // Next capability's first step (P-348 (3)): the case officer opens a case on Visitor visa (2.1).
  await as("user-O", "/cases");
  await page.getByRole("button", { name: /Open a case/ }).first().click();
  const d = page.getByRole("dialog");
  const sel = d.getByRole("combobox", { name: /Combination/ });
  await sel.waitFor({ timeout: 20000 });
  const vv = (await sel.locator("option").allInnerTexts()).find((o) => /Visitor visa/.test(o));
  note("2.1a", "Open a case offers Visitor visa", !!vv, vv ?? "");
  if (vv) await sel.selectOption({ label: vv });
  await d.getByLabel(/Case reference/).fill("B104-WALK-1");
  await d.getByLabel(/Principal applicant's name/).fill("Sample Client A");
  const rep = d.getByRole("combobox", { name: /Representative of record/ });
  if ((await rep.locator("option").count()) > 1) await rep.selectOption({ index: 1 });
  await shot("2-1-open-a-case");
  await d.getByRole("button", { name: /Open the case|Open case|^Open$/ }).last().click();
  await page.waitForURL(/\/cases\/[^/]+$/, { timeout: 30000 }); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1000);
  const caseUrl = page.url();
  const c = await text();
  note("2.1b", "The case opens on Visitor visa", /Visitor visa/.test(c), caseUrl);
  note("2.3", "\"Filed through APR Portal\" read-only on the case", /Filed through APR Portal|through the APR Portal/i.test(c), c.match(/[^.]{0,40}Filed through[^.]{0,40}/i)?.[0] ?? "");
  await shot("2-3-case");

  // 4.1: the case's Eligibility page runs a check (on main it is refused: "no eligibility rules yet").
  await page.goto(caseUrl + "/eligibility"); await page.waitForLoadState("networkidle");
  const runBtn = page.getByRole("button", { name: "Run eligibility check" });
  // On a release with no gates the page shows "No eligibility rules yet" and no Run button: that is the step missing.
  await page.getByText(/Run eligibility check|No eligibility rules yet/).first().waitFor({ timeout: 20000 });
  if (await runBtn.count()) {
    await runBtn.click();
    await page.getByText(/Possibly eligible|Likely eligible|Not eligible/i).first().waitFor({ timeout: 30000 });
  }
  const el = await text();
  note("4.1a", "Run eligibility check gives a result, not a refusal", /Possibly eligible/i.test(el) && !/No eligibility rules yet/.test(el), el.match(/[^.]{0,30}(Possibly eligible|No eligibility rules yet)[^.]{0,80}/)?.[0] ?? "");
  note("4.1b", "The four officer's-judgement lines are listed, never gates", ["enough money", "good health", "back home", "leave Canada"].every((w) => el.includes(w)));
  await shot("4-1-eligibility");

  fs.writeFileSync(path.join(out, "walk.json"), JSON.stringify({ port: Number(port), caseUrl, steps, errors }, null, 1));
  console.log(`errors: ${errors.length}`); errors.slice(0, 10).forEach((e) => console.log("  " + e));
  await browser.close();
  process.exit(steps.every((s) => s.seen) && !errors.length ? 0 : 1);
})().catch(async (e) => { console.error("WALK STOPPED:", e.message); fs.writeFileSync(path.join(out, "walk.json"), JSON.stringify({ stopped: e.message, steps }, null, 1)); process.exit(1); });
