// Journey J-A2 (M3 sprint plan, row A2; C6.11, VV-R10, BR-20), by screens at 1440 px with a screenshot of each state
// (P-352), on the configured checkpoint. The case officer opens a Visitor visa case and picks the representative of
// record [2.1]; the case officer is not offered as the representative, and the route refuses it in words [2.2]. A spouse
// and a child of 10 are added and their dates of birth answered; Prepare application lists IMM 5476 for each adult and
// none for the child; the Agent view shows the representative's membership ID from the firm record, with no box to type
// [5.1]. The firm admin changes the representative with a reason: the Case team dialog's history keeps the line and the
// IMM 5476 item names the new representative [2.5]. Ends at C8.1's first step: IMM 5476 shows its print step. The sign
// steps have no screen yet (row B3), so the item, the refusal in words and the print step are read by route.
// axe-core (WCAG 2.2 A/AA) on each state; no sideways scroll; every wait fails loudly. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh rt611 4431 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   node studio/tests/runtime/check_c611_ja2_browser.cjs 4431 [shots folder]
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4431", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[3] ?? null;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const T = { timeout: 20000 };
const ago = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); d.setUTCDate(d.getUTCDate() - 3); return d; };
const route = async (method, p, actor, body) => {
  const r = await fetch(`${BASE}/api${p}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let b = null; try { b = await r.json(); } catch { /* not JSON */ }
  return { status: r.status, body: b };
};

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { if (!localStorage.getItem("xr-actor")) localStorage.setItem("xr-actor", "user-O"); });
  const r = await ctx.newPage();
  r.on("pageerror", (e) => errors.push(e.message));
  let n = 0;
  const shot = async (name) => { if (SHOTS) await r.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-${name}-1440.png`), fullPage: false }); };
  const axe = async (name) => {
    const a = await new AxeBuilder({ page: r }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok(`J-A2 axe: ${name} has no WCAG A/AA violation`, a.violations.length === 0, a.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const noSideways = async (name) => ok(`J-A2: ${name} has no sideways scroll at 1440 px`, !(await r.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const ref = `JA2-${Date.now().toString(36)}`;
  const line = (label, about) => r.locator("#agent-view section").filter({ hasText: new RegExp(`for ${about}`, "i") }).locator("div[id^='a-']").filter({ hasText: label });
  const tab = async (name) => { await r.locator("#agent-view").getByRole("tab", { name: new RegExp(`^${name}`) }).click(T); };
  try {
    // [2.1] The case officer opens a family case and picks the representative of record.
    await r.goto(`${BASE}/cases`);
    await r.getByRole("button", { name: "Open a case" }).click(T);
    const dlg = r.getByRole("dialog");
    await dlg.getByLabel("Representative of record").waitFor(T);
    const vvOption = dlg.locator("select option", { hasText: "Visitor visa" }).first();
    await vvOption.waitFor({ state: "attached", ...T });
    await dlg.locator("select").first().selectOption(await vvOption.getAttribute("value"));
    await dlg.getByLabel("Your own reference (optional)").fill(ref);
    await dlg.getByLabel("Principal applicant's name").fill("Client A");
    // [2.2] The case officer (unlicensed) is not offered as the representative of record.
    const offered = await dlg.getByLabel("Representative of record").locator("option").allTextContents();
    ok("J-A2 [2.2] fail: the unlicensed case officer is not offered as the representative of record", offered.length > 0 && !offered.some((t) => /^Case officer/.test(t)), offered);
    await dlg.getByLabel("Representative of record").selectOption("user-R");
    ok("J-A2 [2.1]: the case officer picks the representative of record (user-R) and stays the case officer", (await dlg.getByLabel("Representative of record").inputValue()) === "user-R" && (await dlg.getByLabel("Case officer").inputValue()) === "user-O");
    await shot("open-case-team");
    await axe("Open a case with its team");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await r.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
    const caseId = r.url().split("/").pop();
    ok("J-A2 [2.1]: the case opens with the representative of record in its header", /CICC R000000/.test(await r.getByTestId("case-team").innerText()));

    // [2.2] in words: the route refuses the case officer as the representative.
    const asOfficer = await route("PUT", `/runtime/cases/${caseId}/team/representative`, "user-R", { userId: "user-O", reason: "Sample: try the case officer" });
    const words = JSON.stringify(asOfficer.body ?? {});
    ok("J-A2 [2.2] fail: making the case officer the representative is refused in words (not a licensed representative)", asOfficer.status >= 400 && asOfficer.status < 500 && /not a licensed representative/.test(words), [asOfficer.status, words.slice(0, 240)]);

    // A spouse and a child of 10, with the case page's buttons; each date of birth in the Agent view.
    for (const [button, name] of [["Add spouse or partner", "Spouse A"], ["Add child", "Child A1"]]) {
      await r.getByRole("button", { name: button }).click(T);
      const d = r.getByRole("dialog");
      await d.getByLabel("Name").fill(name);
      await d.getByRole("button", { name: /^Add/ }).last().click();
      await d.waitFor({ state: "detached", ...T });
      await r.getByRole("list").getByText(name, { exact: true }).first().waitFor(T);
    }
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

    // Prepare application: IMM 5476 for each adult, none for the child of 10.
    const forms = r.locator("section[aria-labelledby='forms-h']");
    await forms.getByRole("heading", { name: /^IMM 5476 for Spouse A$/ }).waitFor(T);
    const heads = (await forms.locator("h3").allInnerTexts()).filter((t) => /IMM 5476/.test(t)).map((t) => t.replace(/\s+/g, " ").trim());
    ok("J-A2 pass (VV-R10): Prepare application lists IMM 5476 for the principal and the spouse", heads.includes("IMM 5476 for Client A") && heads.includes("IMM 5476 for Spouse A"), heads);
    ok("J-A2 fail (VV-R10): no IMM 5476 for the child of 10", heads.length === 2 && !heads.some((t) => /Child A1/.test(t)), heads);
    await forms.getByRole("heading", { name: /^IMM 5476 for Client A$/ }).scrollIntoViewIfNeeded();
    await shot("prepare-imm5476-adults");
    await noSideways("the case page with its forms");
    await axe("Prepare application with IMM 5476 for the adults");

    // [5.1] The questionnaire shows the representative's membership ID from the firm record, not a box to type.
    await tab("The representative");
    const member = line("membership ID", "the representative");
    await member.first().waitFor(T);
    const mt = await member.first().innerText();
    ok("J-A2 [5.1]: the membership ID shows from the firm record, with no box to type and no Add or Edit", /R000000/.test(mt) && /firm record/i.test(mt) && (await member.first().getByRole("button", { name: /^(Add|Edit)/ }).count()) === 0 && (await member.first().locator("input, textarea, select").count()) === 0, mt.replace(/\s+/g, " ").slice(0, 200));
    await member.first().scrollIntoViewIfNeeded();
    await shot("agent-view-membership-id");
    await axe("Agent view with the representative's part");

    const before = await route("GET", `/runtime/cases/${caseId}/prepare`, "user-O");
    const i5476 = (before.body?.items ?? []).filter((i) => i.form === "IMM 5476");
    ok("J-A2: each IMM 5476 item names the representative of record (user-R)", i5476.length === 2 && i5476.every((i) => i.representative === "user-R"), i5476.map((i) => i.representative));

    // [2.5] The firm admin changes the representative with a reason: history line; the IMM 5476 item names the new one.
    await r.evaluate(() => localStorage.setItem("xr-actor", "user-R"));
    await r.reload();
    await r.getByTestId("case-team").getByRole("button", { name: "Case team" }).click(T);
    const td = r.getByRole("dialog");
    await td.getByRole("heading", { name: "History" }).waitFor(T);
    await td.getByLabel("Change to").selectOption("user-T");
    await td.getByLabel("Reason").fill("Sample: the first representative leaves the firm");
    await td.getByRole("button", { name: "Change representative" }).click();
    await td.getByText("A new IMM 5476 is needed").waitFor(T);
    // Review round 3 m2: read the History list itself, not the dialog's other text.
    const hist = (await td.locator("section[aria-labelledby='t-hist'] li").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
    const earlier = hist.find((t) => /^Representative \(Sample\) Representative of record from .+ to .+ by Representative \(Sample\)/.test(t));
    const now = hist.find((t) => /^Second representative \(Sample\) Representative of record from .+ by Representative \(Sample\) · now/.test(t));
    ok("J-A2 [2.5]: the history keeps the earlier representative's ended line, who changed it and why", !!earlier && /Sample: the first representative leaves the firm/.test(earlier), hist);
    ok("J-A2 [2.5]: the history shows the new representative of record as current, named by the firm admin", !!now, hist);
    await shot("case-team-history");
    await axe("Case team dialog after the change");
    await r.keyboard.press("Escape");
    await td.waitFor({ state: "detached", ...T });
    const after = await route("GET", `/runtime/cases/${caseId}/prepare`, "user-R");
    const a5476 = (after.body?.items ?? []).filter((i) => i.form === "IMM 5476");
    ok("J-A2 [2.5]: after the change each IMM 5476 item names the new representative (user-T)", a5476.length === 2 && a5476.every((i) => i.representative === "user-T"), a5476.map((i) => i.representative));
    await tab("The representative");
    await r.waitForFunction(() => /R000002/.test(document.getElementById("agent-view")?.innerText ?? ""), null, T);
    await line("membership ID", "the representative").first().scrollIntoViewIfNeeded();
    await shot("agent-view-new-representative");
    await noSideways("the case page after the change");

    // Ends at C8.1's first step: IMM 5476 shows its print step (by route: the sign steps' screen is row B3).
    const it = a5476.find((i) => i.subject === i5476[0]?.subject) ?? a5476[0];
    const item = await route("GET", `/runtime/items/${it?.id}`, "user-R");
    const steps = (item.body?.sign_steps ?? []).map((s) => s.key);
    ok("J-A2 end (C8.1's first step): IMM 5476 shows its print step first (print → signed → scan received → uploaded to IRCC)", steps[0] === "print" && JSON.stringify(steps) === JSON.stringify(["print", "signed", "scan_received", "uploaded_to_ircc"]), [item.status, steps]);
    ok("J-A2: no page errors", errors.length === 0, errors);
  } catch (e) {
    await shot("stopped").catch(() => {});
    ok("J-A2: the walk ran to its end", false, String((e && e.message) || e).slice(0, 400));
  }
  await browser.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exitCode = passed === results.length ? 0 : 1;
})();
