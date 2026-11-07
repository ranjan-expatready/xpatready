// Row A3 (M3 sprint plan, 6 Nov): journey J-A3 walked like a person at 1440 px on a fresh configured checkpoint, screens only.
//   node walk-a3-1440.cjs <port, never 4400> <out dir>
// Demo › Reset, then Load the configured checkpoint, as the author. Forms tab of Visitor visa (release 2): IMM 5645 signed by
// the person the form is about, as a typed name (1.3); Schedule 1 a typed name (1.4). 1.4a (what IRCC accepts for IMM 5257)
// is a note: by the tech lead's ruling on #1167 release 2 keeps IMM 5257 Online and records nothing that excludes it. The
// case officer opens a case for one adult: How each form is filed shows IMM 5645 and Schedule 1 as a typed name. The
// readiness list has no screen yet (row B2): a note, its evidence is tests/check_b104_checkpoint.ts A3-L4 and C7.6's
// warnings. Ends at C11.6 [5.2]: IMM 5476 › Change channel, Online greyed with IRCC's line. Live AI off, US$0: nothing
// priced is pressed. Writes walk.json (exit 1 if a step is missing) and a screenshot per step.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const [port, out] = process.argv.slice(2);
if (!port || port === "4400") { console.error("usage: node walk-a3-1440.cjs <port, never 4400> <out dir>"); process.exit(2); }
const base = `http://127.0.0.1:${port}`;
fs.mkdirSync(out, { recursive: true });
const steps = [];
const note = (j, what, seen, detail = "") => { steps.push({ j, what, seen: !!seen, detail }); console.log(`${seen ? "SEEN   " : "MISSING"} J-A3 ${j}  ${what}${detail ? ` — ${detail}` : ""}`); };
const aside = (j, what, detail = "") => { steps.push({ j, what, note: true, detail }); console.log(`NOTE    J-A3 ${j}  ${what}${detail ? ` — ${detail}` : ""}`); };
(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`response ${r.status()} ${r.request().method()} ${r.url().replace(base, "")}`); });
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 300)}`); });
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
  const reset = page.waitForResponse((r) => r.url().endsWith("/api/demo/reset") && r.request().method() === "POST", { timeout: 300000 });
  await dlg.getByRole("button", { name: /Reset/ }).last().click();
  if ((await reset).status() >= 300) throw new Error("Reset demo was refused");
  await as("user-A", "/");
  await page.getByRole("button", { name: /^Demo/ }).click();
  await page.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click();
  const t0 = Date.now();
  await page.getByRole("dialog").getByRole("button", { name: /Load the configured checkpoint/ }).click();
  await page.getByRole("dialog", { name: /Configured checkpoint loaded/ }).waitFor({ timeout: 1_200_000 });
  note("0.1", "Demo › Reset, then Load the configured checkpoint, through the menu", true, `${Math.round((Date.now() - t0) / 1000)} s`);
  await page.getByRole("button", { name: "Continue" }).click();

  // 1.3, 1.4: Visitor visa › Forms (release 2's lines).
  await as("user-A", "/");
  await page.getByRole("button", { name: "Visitor visa", exact: true }).first().click();
  await page.waitForURL(/\/c\/[^/]+/, { timeout: 30000 });
  const combo = page.url().match(/\/c\/([^/?#]+)/)[1];
  await as("user-A", `/c/${combo}/forms`);
  await page.locator('tr[data-line="IMM 5645"]').first().waitFor({ timeout: 30000 });
  const row = async (code) => { const r = page.locator(`tr[data-line="${code}"]`).first(); return { text: await text(r), chosen: await r.locator("select").evaluateAll((ss) => ss.map((s) => s.options[s.selectedIndex]?.text ?? "")) }; };
  const f5645 = await row("IMM 5645"), sch1 = await row("IMM 5257 SCH1");
  note("1.3", "IMM 5645: signed by the person the form is about, as a typed name", /The person the form is about/.test(f5645.text) && f5645.chosen.includes("Typed name"), `chosen: ${f5645.chosen.join(" | ")}`);
  note("1.4", "IMM 5257 SCH1: a typed name (who signs it stays for the expert)", sch1.chosen.includes("Typed name") && /Not set/.test(sch1.text), `chosen: ${sch1.chosen.join(" | ")}`);
  aside("1.4a", "What IRCC accepts for IMM 5257: nothing recorded by this row", "tech lead's ruling on #1167 (6 Nov 22:14 IST): release 2 keeps IMM 5257 Online; C11.6-8a, -8b, -9 move with the C11.6 pack (row C4, H4)");
  await page.locator('tr[data-line="IMM 5645"]').first().scrollIntoViewIfNeeded();
  await shot("1-3-forms-tab");

  // The case officer opens a case for one adult (the principal).
  await as("user-O", "/cases");
  await page.getByRole("button", { name: /Open a case/ }).first().click();
  const d = page.getByRole("dialog");
  const sel = d.getByRole("combobox", { name: /Combination/ });
  await sel.waitFor({ timeout: 20000 });
  const vv = (await sel.locator("option").allInnerTexts()).find((o) => /Visitor visa/.test(o));
  if (vv) await sel.selectOption({ label: vv });
  await d.getByLabel(/Case reference/).fill("A3-WALK-1");
  await d.getByLabel(/Principal applicant's name/).fill("Sample Client A");
  const rep = d.getByRole("combobox", { name: /Representative of record/ });
  if ((await rep.locator("option").count()) > 1) await rep.selectOption({ index: 1 });
  await d.getByRole("button", { name: /Open the case|Open case|^Open$/ }).last().click();
  await page.waitForURL(/\/cases\/[^/]+$/, { timeout: 30000 }); await page.waitForLoadState("networkidle");
  const filed = page.locator("section", { has: page.getByRole("heading", { name: "How each form is filed" }) });
  await filed.locator('li[data-form="IMM 5645"]').first().waitFor({ timeout: 30000 });
  const item = async (form) => { const l = filed.locator(`li[data-form="${form}"]`).first(); return (await l.count()) ? await text(l) : ""; };
  const c5645 = await item("IMM 5645"), cSch1 = await item("IMM 5257 SCH1");
  note("2.1", "Case for one adult, on Visitor visa release 2", /release 2/.test(vv ?? ""), vv ?? "");
  note("2.4", "How each form is filed: IMM 5645 and Schedule 1 are a typed name for the principal (not \"No signature\")", /Signature: Typed name/.test(c5645) && /Signature: Typed name/.test(cSch1), `${c5645.slice(0, 90)} · ${cSch1.slice(0, 90)}`);
  aside("4.x", "The readiness list (\"must be signed (how it is signed is not set…)\") has no screen yet: row B2", "the review route is read by tests/check_b104_checkpoint.ts A3-L4 and by C7.6-5 and -12 (no missing_signature left)");
  await filed.scrollIntoViewIfNeeded();
  await shot("2-4-how-each-form-is-filed");

  // 5.2 (C11.6): IMM 5476 › Change channel: Online is greyed, with IRCC's line.
  await filed.getByRole("button", { name: /Change channel: IMM 5476 for Sample Client A/ }).click();
  const ch = page.getByRole("dialog");
  await ch.locator('[data-option="ONLINE"]').waitFor({ timeout: 15000 });
  const online = ch.locator('[data-option="ONLINE"] input[type=radio]');
  const why = await text(ch.locator("[data-accepts-record]"));
  note("5.2", "IMM 5476 › Change channel: Online is greyed, with IRCC's line", (await online.isDisabled()) && /IRCC accepts IMM 5476 here only as/.test(why), why.slice(0, 200));
  await shot("5-2-change-channel");

  fs.writeFileSync(path.join(out, "walk.json"), JSON.stringify({ port: Number(port), steps, errors }, null, 1));
  const counted = steps.filter((s) => !s.note);
  console.log(`seen ${counted.filter((s) => s.seen).length}/${counted.length} steps, ${steps.length - counted.length} notes; errors: ${errors.length}`); errors.slice(0, 10).forEach((e) => console.log("  " + e));
  await browser.close();
  process.exit(counted.every((s) => s.seen) && !errors.length ? 0 : 1);
})().catch(async (e) => { console.error("WALK STOPPED:", e.message); fs.writeFileSync(path.join(out, "walk.json"), JSON.stringify({ stopped: e.message, steps }, null, 1)); process.exit(1); });
