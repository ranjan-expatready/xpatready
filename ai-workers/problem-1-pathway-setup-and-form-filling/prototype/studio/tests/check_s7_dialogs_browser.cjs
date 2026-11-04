// S7 step 5 (C10.1, C11.7; P-108, P-148; design/walkthrough-s3-s7.html §S7 v2): the two Demo menu dialogs walked in a real
// browser, with the design's words, and the counts after each. Reset to blank? says what it empties and keeps; Load the
// sample starting point? says what it brings, then shows the six, the files, the proposals waiting and every Not found
// file. A pass and a fail per rule; screenshots at 1440 and 1024 in screens/W1-reset-and-sample/screenshots/, axe
// (WCAG 2.2 AA) on each dialog. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_s7d 4437 start && node studio/tests/check_s7_dialogs_browser.cjs 4437 xr_studio_runtime_s7d
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_runtime_s7d";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-reset-and-sample", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const dialog = () => p.getByRole("dialog");
  const menu = async (name) => { await p.getByRole("button", { name: "Demo" }).click(); await p.getByRole("menuitem", { name }).click(); };
  const shoot = async (name) => {
    await p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`) });
    await p.setViewportSize({ width: 1024, height: 768 }); await p.screenshot({ path: path.join(SHOTS, `${name}-1024.png`) }); await p.setViewportSize({ width: 1440, height: 900 });
    const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).include("[role=dialog]").analyze();
    step(`axe (WCAG 2.2 AA) on "${name}": no violations`, axe.violations.length === 0, axe.violations.map((v) => v.id).join(", "));
  };
  await p.goto(BASE); await p.waitForLoadState("networkidle");

  // Reset to blank? (C10.1)
  await menu(/Reset demo/);
  await dialog().getByText("Reset to blank?").waitFor();
  const rt = await dialog().innerText();
  step("C10.1: Reset to blank? says what it empties and what it keeps, in the design's words", /Empties all configuration: structure, combinations, the Form library, fields, sections, document types, conditions, checks, releases and cases/.test(rt) && /Kept: the official PDF copies \(for Load sample\), saved AI answers \(for replay at US\$0\), the spend record/.test(rt), rt.slice(0, 200));
  const go = dialog().getByRole("button", { name: "Reset everything" });
  step("C10.1 fail: Reset everything stays off until RESET is typed", await go.isDisabled());
  await shoot("01-reset-to-blank");
  await p.getByLabel("Type RESET to confirm").fill("RESET"); await go.click();
  await dialog().getByText(/rows and \d+ working files removed/).waitFor({ timeout: 60000 });
  step("C10.1: after Reset the workspace is blank (no combination, no library field)", Number(sql(`select count(*) from combination`)) === 0 && Number(sql(`select count(*) from canonical_field`)) === 0);
  await dialog().getByRole("button", { name: "Close" }).last().click();

  // Load the sample starting point? (C11.7)
  await menu(/Load sample…/);
  await dialog().getByText("Load the sample starting point?").waitFor();
  const lt = await dialog().innerText();
  step("C11.7: Load the sample starting point? says what it brings, in the design's words", /Structure: 5 Retail combinations \+ 1 Corporate/.test(lt) && /Their official PDFs, guides and checklists in the Form library/.test(lt) && /Form finder replayed for each combination: forms picked, waiting for your Confirm/.test(lt) && /Not found · Upload PDF/.test(lt), lt.slice(0, 240));
  await shoot("02-load-sample");
  await dialog().getByRole("button", { name: "Cancel" }).click();
  step("C11.7 fail: Cancel loads nothing", Number(sql(`select count(*) from combination`)) === 0);
  await menu(/Load sample…/);
  await dialog().getByRole("button", { name: "Load sample" }).click();
  await p.getByText("Sample starting point loaded").first().waitFor({ timeout: 400000 });
  const count = async (k) => Number(await p.locator(`[data-count="${k}"]`).innerText());
  step("C11.7: the result shows six combinations and the AI proposals waiting for review", await count("Combinations") === 6 && await count("AI proposals waiting for review") === Number(sql(`select count(*) from proposal_item where status='waiting' and origin='ai'`)) && await count("AI proposals waiting for review") > 0);
  const miss = await p.locator("[data-load-missing]").innerText();
  step("C11.7: every file without a saved copy is listed as Not found · Upload PDF with its reason (EMP5626 on the LMIA)", /EMP5626 on Labour market impact assessment › High-wage position/.test(miss), miss.slice(0, 200));
  await shoot("03-sample-loaded");
  await dialog().getByRole("button", { name: "Continue" }).click();
  await p.getByRole("button", { name: "Demo" }).click();
  step("C11.7 fail: once loaded, Load sample is off until Reset", await p.getByRole("menuitem", { name: /Sample loaded \(reset to load again\)/ }).isDisabled().catch(() => false) || (await p.getByRole("menuitem", { name: /Sample loaded/ }).getAttribute("data-disabled")) !== null);
  await p.keyboard.press("Escape");

  step("no page error or console error on the way", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
