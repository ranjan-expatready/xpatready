// C1.3 + C11.5 browser journey (concept product/screens/C1.3-employer-link r2; tech lead's ruling on #1051): the case
// officer opens a work-permit case on the configured checkpoint, reads that it may rely on an employer case, picks the
// Sample employer case in the drawer (New · Same · Different, the officer's own value kept unless ticked), copies the
// facts once, and sees them in the Agent view marked "Employer case" beside "To confirm". The stale path: an answer that
// arrives while the drawer is open is refused and Reload shows it. Keyboard only for the drawer, axe-core (WCAG 2.2
// A/AA) on each state, 1440 and 390 px without sideways scroll, no page errors; every wait fails loudly. Screenshots
// (1440 px) go to product/screens/C1.3-employer-link/screenshots/ when C13_SHOTS=1. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh c13_browser 4438 start && node studio/tests/check_c13_employer_link_browser.cjs 4438
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("node:http");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4438", BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.C13_SHOTS === "1" ? path.join(__dirname, "..", "..", "..", "product", "screens", "C1.3-employer-link", "screenshots") : null;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 300)}`}`); };
const T = { timeout: 20000 };
const call = (method, p, body, actor = "user-O") => new Promise((done, fail) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "127.0.0.1", port: PORT, path: `/api${p}`, method, agent: false, headers: { "x-actor": actor, "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", fail); if (data) rq.write(data); rq.end();
});
const LMIA = "case.lmia_or_offer_number";

(async () => {
  // The configured checkpoint (P-322), through the Demo menu's own routes, when this copy has no work-permit release.
  const openable = async () => ((await call("GET", "/runtime/openable", undefined, "user-R")).body ?? []).find((r) => /With an LMIA/.test(r.combination) && r.startable);
  if (!(await openable())) { await call("POST", "/demo/reset", { confirm: "RESET" }, "user-A"); const l = await call("POST", "/demo/load", { sample: "configured" }, "user-A"); ok("setup: the configured checkpoint loads", l.status === 201 || l.status === 200, l.status); }
  const wp = await openable();
  if (!wp) { ok("setup: With an LMIA – inside Canada is released and startable", false); process.exit(2); }
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const axe = async (p, name) => {
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok(`C1.3 axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const noSideways = async (p, name) => ok(`C1.3: ${name} has no sideways scroll at ${p.viewportSize().width} px`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  const shot = async (p, name, opts = {}) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `${name}.png`), ...opts }); } };
  const ref = `C13B-${Date.now().toString(36)}`;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: SHOTS ? 2 : 1 });
    await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-O"); });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));

    // 1. Open a case on the work permit: the line says the link is offered and that the facts are copied (M1).
    await p.goto(`${BASE}/cases`);
    await p.getByRole("button", { name: "Open a case" }).click(T);
    const dlg = p.getByRole("dialog");
    const combo = dlg.getByLabel("Combination (released)");
    const option = await combo.evaluate((s) => [...s.options].find((o) => /With an LMIA/.test(o.textContent ?? ""))?.value);
    await combo.selectOption(option);
    const offerLine = dlg.getByTestId("employer-link");
    await offerLine.getByText("forms read 2 employer facts; you can copy them from an employer case.", { exact: false }).waitFor(T);
    ok("C1.3: Open a case on the work permit offers the employer case link, counting 2 employer facts", true);
    await shot(p, "1-open-a-case-offered");
    await dlg.getByLabel("Your own reference (optional)").fill(ref);
    await dlg.getByLabel("Principal applicant's name").fill("Client A");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
    const caseId = p.url().split("/").pop();

    // 2. The case header: the offer, the Stand-in chip and the button.
    const head = p.getByTestId("employer-link");
    const choose = head.getByRole("button", { name: "Choose employer case…" });
    await choose.waitFor(T);
    ok("C1.3: the case header offers \"Choose employer case…\" with the SI-10 Stand-in chip", await head.locator('[data-stand-in="SI-10"]').count() === 1);
    await shot(p, "2-case-header-offered");

    // The client already typed an LMIA number (set here through the API, as the questionnaire does), so it is Different.
    const people = (await call("GET", `/runtime/cases/${caseId}`)).body.people;
    const filing = people.find((x) => x.role === "case").subject_id;
    const typed = await call("PUT", `/runtime/cases/${caseId}/answers/${filing}/${LMIA}`, { value: "A123", expectedId: null });
    ok("setup: an LMIA number is already on the case", typed.status === 200, typed.body);
    await p.reload(); await choose.waitFor(T);

    // 3. Keyboard only: focus the button, Enter opens the drawer; each fact says what will happen.
    await choose.focus(); await p.keyboard.press("Enter");
    const drawer = p.getByRole("dialog", { name: "Rely on an employer case" });
    await drawer.locator("[data-fact]").first().waitFor(T);
    const states = await drawer.locator("[data-fact]").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute("data-fact"), e.getAttribute("data-state")])));
    ok("C1.3 BR-4: the drawer shows the name and address New and the LMIA number Different", states["organisation.employer_name"] === "new" && states["organisation.employer_address"] === "new" && states[LMIA] === "different", states);
    ok("C1.3 BR-4: the Different line shows the case's own value, kept unless ticked", await drawer.getByText('On this case: A123', { exact: false }).count() === 1 && !(await drawer.getByLabel("Use the employer case's value").isChecked()));
    ok("C1.3: the drawer names what is copied and that later changes are not", await drawer.getByText("Later changes on the employer case are not copied", { exact: false }).count() === 1);
    const primary = drawer.getByRole("button", { name: "Copy 2 facts" });
    ok("C1.3: the button counts what will be written (2: the LMIA number is kept)", await primary.count() === 1);
    await axe(p, "the drawer");
    await shot(p, "3-drawer-new-same-different");
    await primary.focus(); await p.keyboard.press("Enter");
    await p.getByText("Copied 2 facts from Sample employer case", { exact: false }).first().waitFor(T);
    ok("C1.3: Copy says what it copied", true);
    const linked = p.getByTestId("employer-linked");
    await linked.waitFor(T);
    await p.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "employer-linked", undefined, T);
    ok("C1.3 (review M1, WCAG 2.4.3): after Copy, focus moves to the linked line, not the page", true);
    ok("C1.3: the header now names the employer case and says later changes are not copied", /Sample employer case: Sample Employer Ltd \(Sample\).*facts copied .*later changes there are not copied/.test(await linked.innerText()));
    ok("C1.3: \"Choose employer case…\" is gone once linked (once per case)", await choose.count() === 0);
    await shot(p, "4-case-header-linked");

    // 4. The Agent view: the copied value with "To confirm" and the "Employer case" source side by side (m2).
    const tabs = p.locator("#agent-view").getByRole("tablist", { name: "Whose answers" });
    await tabs.getByRole("tab", { name: /^Client A/ }).click(T);
    const value = p.locator("#agent-view").getByText("Sample Employer Ltd (Sample)", { exact: true }).first();
    await value.waitFor(T);
    const row = value.locator("xpath=..");
    ok("C1.3 BR-5: the copied employer name reads \"To confirm\" beside the \"Employer case\" source", await row.getByText("To confirm").count() === 1 && await row.getByText("Employer case").count() === 1, await row.innerText());
    const source = row.getByRole("button", { name: /^Source: employer case\. Copied from Sample employer case: Sample Employer Ltd \(Sample\) on / });
    // Review R2-1 / round 3 (measured): the tooltip opens on keyboard focus every time (18 ms), but a stray document
    // scroll event can close it a few ms later (the shared Tip's Radix close-on-scroll, on the tech lead's follow-up
    // list). So the check records, from before the focus, whether it ever opened and what it said while open, instead of
    // relying on it staying open.
    await source.scrollIntoViewIfNeeded();
    await source.evaluate((el) => {
      const seen = { opened: false, text: "" };
      window.__c13tip = seen;
      const look = () => { if (/open/.test(el.getAttribute("data-state") ?? "")) seen.opened = true; const t = document.querySelector('[role="tooltip"]'); if (t && t.textContent) seen.text = t.textContent; };
      new MutationObserver(look).observe(el, { attributes: true, attributeFilter: ["data-state"] });
      new MutationObserver(look).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await source.focus();
    ok("C1.3: the source label takes keyboard focus", await source.evaluate((el) => el === document.activeElement));
    await p.waitForFunction(() => window.__c13tip?.opened && /Copied from Sample employer case: Sample Employer Ltd \(Sample\) on .*Changes there are not copied/.test(window.__c13tip.text), undefined, T);
    ok("C1.3 (review m2): the source label opens its tooltip from the keyboard and names the employer case", true);
    await value.scrollIntoViewIfNeeded();
    await shot(p, "5-agent-view-employer-case-source");
    await tabs.getByRole("tab", { name: /^The application/ }).click(T);
    await p.locator("#agent-view").getByText("A123", { exact: true }).first().waitFor(T);
    ok("C1.3 BR-4: the officer's LMIA number is still on the case (The application)", true);
    await axe(p, "the case page after the link");
    for (const w of [1440, 1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await noSideways(p, "the linked case page"); }
    await p.setViewportSize({ width: 1440, height: 1000 });

    // 5. Stale: the client answers while the drawer is open → refused with the label, Reload shows the new state.
    const c2 = await call("POST", "/runtime/cases", { combinationId: wp.combination_id, reference: `${ref}-2`, clientActor: "user-P", principal: { displayName: "Client B" } }, "user-O");
    await p.goto(`${BASE}/cases/${c2.body.id}`);
    await p.getByRole("button", { name: "Choose employer case…" }).click(T);
    const d2 = p.getByRole("dialog", { name: "Rely on an employer case" });
    await d2.getByRole("button", { name: "Copy 3 facts" }).waitFor(T);
    const f2 = c2.body.people.find((x) => x.role === "case").subject_id;
    await call("PUT", `/runtime/cases/${c2.body.id}/answers/${f2}/${LMIA}`, { value: "B456", expectedId: null });
    await d2.getByRole("button", { name: "Copy 3 facts" }).click();
    await d2.getByText("Changed since you looked:", { exact: false }).first().waitFor(T);
    ok("C1.3 BR-6 (M2): an answer that arrived while the drawer was open is refused, named, nothing copied", (await call("GET", `/runtime/cases/${c2.body.id}`)).body?.employer_link?.linked === null);
    await shot(p, "6-drawer-changed-since-you-looked");
    await d2.getByRole("button", { name: "Reload" }).click();
    await d2.getByRole("button", { name: "Copy 2 facts" }).waitFor(T);
    ok("C1.3 BR-6: after Reload the drawer shows the new LMIA number as Different", await d2.locator(`[data-fact="${LMIA}"]`).getAttribute("data-state") === "different");
    // Linked meanwhile in another tab: the refusal offers Reload, which shows the link and only Close (review m3).
    await call("POST", `/runtime/cases/${c2.body.id}/employer-link`, { employerCase: "sample-employer-1", seen: Object.fromEntries((await call("GET", `/runtime/cases/${c2.body.id}/employer-cases`)).body.employer_cases[0].facts.map((f) => [f.fact, f.current?.answer_id ?? null])) }, "user-R");
    await d2.getByRole("button", { name: "Copy 2 facts" }).click();
    await d2.getByText("already relies on", { exact: false }).first().waitFor(T);
    ok("C1.3 (review m3): the refusal shows once, in the drawer, with no toast over its button", await p.getByText("already relies on Sample employer case", { exact: false }).count() === 1);
    await d2.getByRole("button", { name: "Reload" }).click();
    await d2.getByText("This case already relies on an employer case").waitFor(T);
    ok("C1.3: after Reload the drawer says the case is linked and offers only Close", await d2.getByRole("button", { name: "Close", exact: true }).count() >= 1 && await d2.getByRole("button", { name: /^Copy/ }).count() === 0);
    await p.setViewportSize({ width: 390, height: 844 });
    await noSideways(p, "the drawer");
    await axe(p, "the drawer at 390 px");
    await p.keyboard.press("Escape");
    ok("C1.3: Escape closes the drawer", await d2.count() === 0);
    ok("C1.3: no page errors", errors.length === 0, errors);
  } catch (e) {
    ok("C1.3: the journey ran to the end", false, String(e && e.message || e).slice(0, 400));
  } finally {
    await browser.close();
  }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
