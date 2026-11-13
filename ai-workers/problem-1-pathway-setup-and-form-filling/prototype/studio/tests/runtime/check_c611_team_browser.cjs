// C6.11 browser journey (runtime lane, M3-A; board r5c frames 1 and 2; review Major 2): the firm admin opens a Visitor visa
// case with its team (prefilled, Stand-in SI-9), sees the team chip, changes the representative of record in the "Case
// team" dialog (a short reason refused on its field, then "A new IMM 5476 is needed" and the history), takes a case
// officer off; the case officer reads the team without change controls; the solo firm does not see the case. axe-core
// (WCAG 2.2 A/AA) on every state; 1440 and 1024 px without sideways scroll; every wait fails loudly. Sample data, US$0.
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1 && node studio/tests/runtime/check_c611_team_browser.cjs 4430
const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4430", BASE = `http://localhost:${PORT}`;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const T = { timeout: 15000 };

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const open = async (actor, width = 1440) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addInitScript((a) => { localStorage.setItem("xr-actor", a); }, actor);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(`${actor}: ${e.message}`));
    return p;
  };
  const axe = async (p, name) => {
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok(`C6.11 axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const noSideways = async (p, name) => ok(`C6.11: ${name} has no sideways scroll at ${p.viewportSize().width} px`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const ref = `C611B-${Date.now().toString(36)}`;
  try {
    // Frame 1: Open a case with the case team, as the firm admin.
    const r = await open("user-R");
    await r.goto(`${BASE}/cases`);
    await r.getByRole("button", { name: "Open a case" }).click(T);
    const dlg = r.getByRole("dialog");
    await dlg.getByLabel("Representative of record").waitFor(T);
    ok("C6.11: Open a case offers the representative of record, prefilled", (await dlg.getByLabel("Representative of record").inputValue()) === "user-R");
    ok("C6.11: Open a case offers the case officer, prefilled", (await dlg.getByLabel("Case officer").inputValue()) === "user-O");
    ok("C6.11 fail: the unlicensed case officer is not offered as representative", !(await dlg.getByLabel("Representative of record").locator("option").allTextContents()).some((t) => t.startsWith("Case officer")));
    ok("C6.11: the case team carries the Stand-in chip SI-9", (await dlg.locator('[data-stand-in="SI-9"]').count()) === 1);
    await axe(r, "Open a case with the case team");
    await dlg.getByLabel("Your own reference (optional)").fill(ref);
    await dlg.getByLabel("Principal applicant's name").fill("Client A");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await r.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
    const caseUrl = r.url();

    // Frame 2: the header's team chip.
    const chip = r.getByTestId("case-team");
    await chip.waitFor(T);
    const chipText = await chip.innerText();
    ok("C6.11: the header names the representative with licence and the case officer", /Representative \(Sample\)/.test(chipText) && /CICC R000000/.test(chipText) && /Case officer \(Sample\)/.test(chipText), chipText);
    for (const w of [1440, 1024]) { await r.setViewportSize({ width: w, height: 900 }); await noSideways(r, "the case page"); }
    await axe(r, "case header with the team chip");

    // The firm admin's Case team dialog: change the representative.
    await chip.getByRole("button", { name: "Case team" }).click();
    const td = r.getByRole("dialog");
    await td.getByRole("heading", { name: "History" }).waitFor(T);
    await axe(r, "Case team dialog");
    await td.getByLabel("Change to").selectOption("user-T");
    await td.getByLabel("Reason").fill("abc");
    await td.getByRole("button", { name: "Change representative" }).click();
    await td.getByText(/at least 5 characters/).waitFor(T);
    ok("C6.11 fail: a short reason is refused with its message, nothing changed", /Representative \(Sample\) · CICC R000000/.test(await td.innerText()));
    await td.getByLabel("Reason").fill("Sample: first representative on leave");
    await td.getByRole("button", { name: "Change representative" }).click();
    await td.getByText("A new IMM 5476 is needed").waitFor(T);
    const after = await td.innerText();
    ok("C6.11: after the change the dialog asks for a new IMM 5476, filled from the new representative", /R000002/.test(after) && !/p\.m\.\./.test(after), after.slice(0, 200));
    ok("C6.11: the history keeps the earlier representative, who changed it and why", /Sample: first representative on leave/.test(after) && /by Representative \(Sample\)/.test(after));
    await axe(r, "Case team dialog after a change");

    // Take a case officer off: the reason is asked, the last-officer warning shows.
    await td.getByRole("button", { name: "Take off" }).first().click();
    await td.getByText(/last case officer/).waitFor(T);
    ok("C6.11: taking off the last case officer warns first", true);
    await td.getByLabel(/leaves the case/).fill("Sample: moved to another case");
    await td.getByRole("button", { name: "Take off" }).first().click();
    await td.getByText("No case officer now.").waitFor(T);
    ok("C6.11: the case officer is off the case and in the history", /Sample: moved to another case/.test(await td.innerText()));
    await r.keyboard.press("Escape");
    await td.waitFor({ state: "hidden", ...T });
    await r.getByTestId("case-team").getByText("CICC R000002").waitFor(T);
    ok("C6.11: the header follows the change", true);

    // The case officer reads the team but cannot change it.
    const o = await open("user-O", 1024);
    await o.goto(caseUrl);
    await o.getByTestId("case-team").getByRole("button", { name: "Case team" }).click(T);
    const od = o.getByRole("dialog");
    await od.getByText("Only the firm admin changes the case team.").waitFor(T);
    ok("C6.11 fail: the case officer gets no change controls", (await od.getByRole("button", { name: "Change representative" }).count()) === 0 && (await od.getByRole("button", { name: "Take off" }).count()) === 0);
    await axe(o, "Case team dialog read by the case officer");

    // The solo firm does not see the Sample firm's case.
    const s = await open("user-S");
    await s.goto(`${BASE}/cases`);
    await s.getByRole("heading", { name: "Cases" }).waitFor(T);
    await s.waitForLoadState("networkidle");
    ok("C6.11 fail: the solo firm's case list does not show the Sample firm's case", (await s.getByText(ref).count()) === 0);
    await s.goto(caseUrl);
    await s.getByText("This case could not be opened").waitFor(T);
    ok("C6.11 fail: the solo firm cannot open the Sample firm's case page", true);
    ok("C6.11: no page errors", errors.length === 0, errors);
  } catch (e) {
    ok("C6.11: the journey ran to the end", false, String(e && e.message || e).slice(0, 400));
  } finally {
    await browser.close();
  }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exitCode = passed === results.length ? 0 : 1;
})();
