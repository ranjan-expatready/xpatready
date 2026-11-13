// C6.11 browser walk, IMM 5476 part (runtime lane, M3; VV-R10, BR-20, QA-152), by screens only, at 1440 px, on the
// configured checkpoint: the firm admin opens a Visitor visa case in Open a case, adds a spouse and a child of 10 with
// the case page's buttons, answers each date of birth in the Agent view; Prepare application lists IMM 5476 for the
// principal and the spouse, none for the child; the Agent view shows the representative's membership ID, licensing body
// and firm name, and "Uses a representative", as "From the firm record" with no Edit; after "Change representative" in
// the Case team dialog the Agent view shows the new representative's membership ID. axe-core (WCAG 2.2 A/AA) on each
// state; no sideways scroll; every wait fails loudly. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh rt611 4431 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   node studio/tests/runtime/check_c611_imm5476_browser.cjs 4431
const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4431", BASE = `http://localhost:${PORT}`;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const T = { timeout: 20000 };
const ago = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); d.setUTCDate(d.getUTCDate() - 3); return d; };

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-R"); });
  const r = await ctx.newPage();
  r.on("pageerror", (e) => errors.push(e.message));
  const axe = async (name) => {
    const a = await new AxeBuilder({ page: r }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok(`C6.11 axe: ${name} has no WCAG A/AA violation`, a.violations.length === 0, a.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const noSideways = async (name) => ok(`C6.11: ${name} has no sideways scroll at 1440 px`, !(await r.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const ref = `C611I-${Date.now().toString(36)}`;
  // The line of one question in the Agent view: its label inside the section for that person.
  const line = (label, about) => r.locator("#agent-view section").filter({ hasText: new RegExp(`for ${about}`, "i") }).locator("div[id^='a-']").filter({ hasText: label });
  // The Agent view shows one person (or the application, or the representative) at a time, as tabs.
  const tab = async (name) => { await r.locator("#agent-view").getByRole("tab", { name: new RegExp(`^${name}`) }).click(T); };
  try {
    // Open a case (Visitor visa) with its team, as the firm admin.
    await r.goto(`${BASE}/cases`);
    await r.getByRole("button", { name: "Open a case" }).click(T);
    const dlg = r.getByRole("dialog");
    await dlg.getByLabel("Representative of record").waitFor(T);
    const vvOption = dlg.locator("select option", { hasText: "Visitor visa" }).first();
    await vvOption.waitFor({ state: "attached", ...T });
    await dlg.locator("select").first().selectOption(await vvOption.getAttribute("value"));  // the first select is "Combination (released)"
    await dlg.getByLabel("Your own reference (optional)").fill(ref);
    await dlg.getByLabel("Principal applicant's name").fill("Client A");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await r.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
    ok("C6.11: the case opens with the representative of record in its header", /CICC R000000/.test(await r.getByTestId("case-team").innerText()));

    // A spouse and a child of 10, with the case page's own buttons.
    for (const [button, name] of [["Add spouse or partner", "Spouse A"], ["Add child", "Child A1"]]) {
      await r.getByRole("button", { name: button }).click(T);
      const d = r.getByRole("dialog");
      await d.getByLabel("Name").fill(name);
      await d.getByRole("button", { name: /^Add/ }).last().click();
      await d.waitFor({ state: "detached", ...T });
      await r.getByRole("list").getByText(name, { exact: true }).first().waitFor(T);
    }
    // Each date of birth, answered in the Agent view (Add → Day, Month, Year → Save).
    for (const [name, years] of [["Client A", 40], ["Spouse A", 38], ["Child A1", 10]]) {
      const d0 = ago(years);
      await tab(name);
      await r.getByRole("button", { name: new RegExp(`^Add .*date of birth for ${name}$`, "i") }).first().click(T);
      const d = r.getByRole("dialog");
      await d.getByLabel("Day").fill(String(d0.getUTCDate()));
      await d.getByLabel("Month").fill(String(d0.getUTCMonth() + 1));
      await d.getByLabel("Year").fill(String(d0.getUTCFullYear()));
      await d.getByRole("button", { name: "Save" }).click();
      await d.waitFor({ state: "detached", ...T });
    }

    // Prepare application: IMM 5476 for the principal and the spouse only (VV-R10).
    const forms = r.locator("section[aria-labelledby='forms-h']");
    await forms.getByRole("heading", { name: /^IMM 5476 for Spouse A$/ }).waitFor(T);
    const heads = (await forms.locator("h3").allInnerTexts()).filter((t) => /IMM 5476/.test(t)).map((t) => t.replace(/\s+/g, " ").trim());
    ok("C6.11 pass (VV-R10): Prepare application lists IMM 5476 for the principal and the spouse", heads.includes("IMM 5476 for Client A") && heads.includes("IMM 5476 for Spouse A"), heads);
    ok("C6.11 fail (VV-R10): no IMM 5476 for the child of 10 (covered by the applicant's form)", !heads.some((t) => /Child A1/.test(t)), heads);
    await noSideways("the case page with its forms");
    await axe("Prepare application with IMM 5476 for the adults");

    // The Agent view: IMM 5476's representative part and "Uses a representative" from the firm record.
    // QA-152: no applicant is asked an employer's name in IMM 5476's firm boxes.
    let employer = false;
    for (const n of ["Client A", "Spouse A"]) { await tab(n); employer = employer || /prospective employer/i.test(await r.locator("#agent-view").innerText()); }
    ok("C6.11 fail (QA-152): no applicant is asked an employer's name for IMM 5476's firm boxes", !employer);
    await tab("The representative");
    const member = line("membership ID", "the representative");
    await member.first().waitFor(T);
    const mt = await member.first().innerText();
    ok("C6.11 pass: the Agent view shows the representative's membership ID from the firm record, with no Edit", /R000000/.test(mt) && /firm record/i.test(mt) && (await member.first().getByRole("button", { name: /^(Add|Edit)/ }).count()) === 0, mt.replace(/\s+/g, " ").slice(0, 200));
    const org = await line("Name of the firm or organization", "the representative").first().innerText();
    ok("C6.11 pass (QA-152): IMM 5476's firm name is the representative's firm, from the firm record, never typed per applicant", /Sample immigration firm/.test(org) && /firm record/i.test(org), org.replace(/\s+/g, " ").slice(0, 200));
    await tab("The application");
    const uses = r.locator("#agent-view div[id*='case-uses_representative']");
    if (await uses.count()) {
      const ut = await uses.first().innerText();
      ok("C6.11 pass: \"Uses a representative\" is Yes from the case team (the firm record), says the case team sets it, with no Edit", /Yes/.test(ut) && /firm record/i.test(ut) && /Set by the case team/.test(ut) && !/Change it in the firm record/.test(ut) && (await uses.first().getByRole("button", { name: /^(Add|Edit)/ }).count()) === 0, ut.replace(/\s+/g, " ").slice(0, 200));
    } else ok("C6.11 pass: \"Uses a representative\" is Yes from the case team (the firm record), says the case team sets it, with no Edit", false, "no such line in the Agent view");
    await axe("Agent view with the representative's part from the firm record");

    // Change the representative of record in the Case team dialog; the Agent view follows.
    await r.getByTestId("case-team").getByRole("button", { name: "Case team" }).click();
    const td = r.getByRole("dialog");
    await td.getByRole("heading", { name: "History" }).waitFor(T);
    await td.getByLabel("Change to").selectOption("user-T");
    await td.getByLabel("Reason").fill("Sample: the first representative leaves the firm");
    await td.getByRole("button", { name: "Change representative" }).click();
    await td.getByText("A new IMM 5476 is needed").waitFor(T);
    ok("C6.11 pass (BR-20): the Case team dialog says a new IMM 5476 is needed, filled from the new representative", /R000002/.test(await td.innerText()));
    await r.keyboard.press("Escape");
    await td.waitFor({ state: "detached", ...T });
    await tab("The representative");
    await r.waitForFunction(() => /R000002/.test(document.getElementById("agent-view")?.innerText ?? ""), null, T);
    const after = await line("membership ID", "the representative").first().innerText();
    ok("C6.11 pass: after the change the Agent view's IMM 5476 part names the new representative (R000002)", /R000002/.test(after) && !/R000000/.test(after), after.replace(/\s+/g, " ").slice(0, 200));
    await noSideways("the case page after the change");
    ok("C6.11: no page errors", errors.length === 0, errors);
  } catch (e) {
    ok("C6.11: the walk ran to its end", false, String((e && e.message) || e).slice(0, 400));
  }
  await browser.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exitCode = passed === results.length ? 0 : 1;
})();
