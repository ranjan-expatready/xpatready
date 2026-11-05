// C10.1 the configured checkpoint walked in a real browser (Demo › Load the configured checkpoint…): the dialog says what
// it brings, the result shows one row per DEMO.md mechanism with its status in words, rows 7 and 17 say "not built yet",
// a waiting row says why; the menu item is off once the workspace has names. Screenshots at 1440 and 1024 in
// screens/W1-reset-and-sample/screenshots/, axe (WCAG 2.2 AA) on each dialog. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c10b 4432 start && node studio/tests/check_c10_1_browser.cjs 4432 xr_studio_runtime_c10b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4432), DB = process.argv[3] ?? "xr_studio_runtime_c10b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-reset-and-sample", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  await fetch(`${BASE}/api/demo/reset`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify({ confirm: "RESET" }) });
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const dialog = () => p.getByRole("dialog");
  const shoot = async (name) => {
    await p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`) });
    await p.setViewportSize({ width: 1024, height: 768 });
    const fits = await p.evaluate(() => { const d = document.querySelector("[role=dialog]"); return !!d && d.getBoundingClientRect().right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth; });
    step(`"${name}" fits at 1024 px with no sideways scroll`, fits);
    await p.screenshot({ path: path.join(SHOTS, `${name}-1024.png`) }); await p.setViewportSize({ width: 1440, height: 900 });
    const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).include("[role=dialog]").analyze();
    step(`axe (WCAG 2.2 AA) on "${name}": no violations`, axe.violations.length === 0, axe.violations.map((v) => v.id).join(", "));
  };
  await p.goto(BASE); await p.waitForLoadState("networkidle");

  await p.getByRole("button", { name: "Demo" }).click();
  await p.getByRole("menuitem", { name: /Load the configured checkpoint…/ }).click();
  await dialog().getByText("Load the configured checkpoint?").waitFor();
  const before = await dialog().innerText();
  step("C10.1: the dialog says what the checkpoint brings, who does each duty, and that no live AI call is made", /Everything Load sample brings/.test(before) && /second person approves the new library items/.test(before) && /signed by the Content reviewer and released by the Approver/.test(before) && /US\$0: no live AI call/.test(before), before.replace(/\s+/g, " "));
  await shoot("c10-1-01-configured-dialog");
  await dialog().getByRole("button", { name: "Load the configured checkpoint" }).click();
  await dialog().getByText("Configured checkpoint loaded", { exact: true }).waitFor({ timeout: 900_000 });
  const rows = await p.locator("[data-conf-row]").evaluateAll((els) => els.map((e) => ({ row: e.getAttribute("data-conf-row"), status: e.getAttribute("data-status"), text: e.innerText.replace(/\s+/g, " ") })));
  step("C10.1: the result lists the 13 rows of the M2 gate (1–12 and 17), each with its status in words", rows.length === 13 && rows.every((r) => /Done|Partly|Waiting|Not built yet|Parked/.test(r.text)), rows.map((r) => `${r.row} ${r.status}`).join(", "));
  const r = (id) => rows.find((x) => x.row === id) ?? { text: "", status: "" };
  // QA-144 slice 1: row 7 is built (the rules pass's sections and the shared placement step on the Visitor visa).
  // QA-206 (tech lead on #883): row 7 is partial, and says so, while sections the forms print no heading over wait for a name.
  step("C10.1: row 7 says what the forms' own parts set up, in words; row 17 holds IMM 5476's new edition or waits for its 2021 map, in words (QA-207)", (r("7").status === "done" || (r("7").status === "partial" && /held on To review for a person to name/.test(r("7").text))) && /Sections and questions from the forms' own parts/.test(r("7").text) && /sections drafted from .*Visitor visa/.test(r("7").text) && ((r("17").status === "waiting" && /Waits for a saved field map of IMM 5476 \(11-2021\)/.test(r("17").text)) || (r("17").status === "done" && /held as a new edition over the library's IMM 5476 \(11-2021\)/.test(r("17").text))), `${r("7").text.slice(0, 120)} | ${r("17").text.slice(0, 160)}`);
  // B97: row 9 is done; row 12 is the row whose reason a person reads here: only a person's Validate is left.
  step("C10.1: a row that is not done says why (row 12 waits for a person's Validate in Adobe Reader)", r("12").status === "partial" && /Validate each copy in Adobe Reader/.test(r("12").text), r("12").text);
  step("C10.1: rows 4 and 5 show the decisions and the second person's approvals", /accepted, 1 edited, 1 returned with a reason/.test(r("4").text) && /approved by the Approver, not by the author/.test(r("5").text), `${r("4").text} | ${r("5").text}`);
  step("C10.1: the database agrees: no library item waits, none approved by its proposer", Number(sql("select count(*) from library_change where status = 'WAITING'")) === 0 && Number(sql("select count(*) from library_change where decided_by = proposed_by")) === 0);
  await shoot("c10-1-02-configured-result");
  await dialog().getByRole("button", { name: "Continue" }).click();
  await p.getByRole("button", { name: "Demo" }).click();
  const item = p.getByRole("menuitem", { name: /configured checkpoint/ });
  step("C10.1 fail: once loaded, the menu item is off and says to reset first", (await item.getAttribute("aria-disabled")) === "true" && /reset first/.test(await item.innerText()));
  await p.keyboard.press("Escape");
  step("no page errors in the walk", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
