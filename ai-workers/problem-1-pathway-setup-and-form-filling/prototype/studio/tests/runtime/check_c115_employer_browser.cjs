// C11.5 browser journey (runtime lane, M3-A2; board r5c frame 1, P-106): on "Open a case" for the Visitor visa, the line
// "Relies on an employer case" says it is not offered and why, with its tooltip; after the case opens, its header says
// the same, read from the pinned release. axe-core (WCAG 2.2 A/AA) on both states; 1440 and 390 px without sideways
// scroll; every wait fails loudly. Sample data, US$0.
//   zsh studio/tools/isolated.sh runtime_m3a2 4437 start && tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/setup_visitor_visa.ts 4437 xr_studio_runtime_m3a2 && node studio/tests/runtime/check_c115_employer_browser.cjs 4437
const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4437", BASE = `http://localhost:${PORT}`;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const T = { timeout: 15000 };
const WORDS = "Not offered: the Visitor visa has no employer facts.";

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const axe = async (p, name) => {
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok(`C11.5 axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const noSideways = async (p, name) => ok(`C11.5: ${name} has no sideways scroll at ${p.viewportSize().width} px`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const ref = `C115B-${Date.now().toString(36)}`;
  try {
    // Tall enough that Tab does not scroll the dialog: Radix closes any tooltip on scroll (the shared Tip; noted in the PR).
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-R"); });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${BASE}/cases`);
    await p.getByRole("button", { name: "Open a case" }).click(T);
    const dlg = p.getByRole("dialog");
    const line = dlg.getByTestId("employer-link");
    await line.getByText(WORDS).waitFor(T);
    ok("C11.5 fail: Open a case on the Visitor visa says the employer case link is not offered, and why", (await line.innerText()).includes("Relies on an employer case"));
    const about = line.getByRole("button", { name: "About: relies on an employer case" });
    await dlg.getByLabel("Case officer").focus();
    await p.keyboard.press("Tab"); // a real keyboard move: the tooltip opens on keyboard focus
    ok("C11.5: Tab from the case team reaches the ⓘ", await about.evaluate((el) => el === document.activeElement));
    await p.getByRole("tooltip").filter({ hasText: "employer-specific work permits" }).first().waitFor({ state: "attached", timeout: 15000 }); // Radix keeps the role=tooltip copy visually hidden for screen readers
    ok("C11.5: the line's tooltip opens from the keyboard (review m1)", true);
    await axe(p, "Open a case with the employer line");
    await dlg.getByLabel("Your own reference (optional)").fill(ref);
    await dlg.getByLabel("Principal applicant's name").fill("Client A");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
    const head = p.getByTestId("employer-link");
    await head.getByText(WORDS).waitFor(T);
    ok("C11.5: the case header says the same, read from its pinned release", true);
    await axe(p, "case header with the employer line");
    for (const w of [1440, 390]) { await p.setViewportSize({ width: w, height: 900 }); await noSideways(p, "the case page"); }
    ok("C11.5: no page errors", errors.length === 0, errors);
  } catch (e) {
    ok("C11.5: the journey ran to the end", false, String(e && e.message || e).slice(0, 400));
  } finally {
    await browser.close();
  }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exitCode = passed === results.length ? 0 : 1;
})();
