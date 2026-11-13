// C6.19 browser journey (runtime lane; concept product/screens/C6.19/concept.md r2): a person's walk by screens at
// 1440 px. Client W's earlier Visitor visa case (set up through the API, as C6.3 would leave it: passport facts entered
// and confirmed) → Open a case for Client W on With an LMIA → "Facts from an earlier case" offers them → tick two →
// "Re-confirm and use" → the Agent view shows them with their origin (the next capability's first step: Confirm section,
// C6.3) → the earlier passport expires → a further case shows it Expired, with its rule, the tick disabled. axe-core
// (WCAG 2.2 A/AA) on the card; 1024 and 390 px without sideways scroll; every wait fails loudly. Screenshots for the PR
// at deviceScaleFactor 2 into product/screens/C6.19/screenshots/. Sample data, US$0. Loads the configured checkpoint (Demo
// menu's own route) when the copy has none.
//   zsh studio/tools/isolated.sh runtime_c619w 4437 start && node studio/tests/runtime/check_c619_earlier_facts_browser.cjs 4437
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4437", BASE = `http://localhost:${PORT}`;
const SHOTS = process.argv[3] ?? path.join(__dirname, "../../../../product/screens/C6.19/screenshots");
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const T = { timeout: 20000 };
const run = Date.now().toString(36), NAME = `Client W ${run}`;
const api = async (method, url, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "content-type": "application/json", "x-actor": actor }, body: body === undefined ? undefined : JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* empty */ } return { status: r.status, body: j }; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const shot = async (p, name) => p.screenshot({ path: path.join(SHOTS, name), fullPage: false });
  try {
    // Set-up: the earlier case (C6.1 + C6.3 by the API): Visitor visa, passport facts entered and confirmed.
    let open = (await api("GET", "/runtime/openable", undefined, "user-R")).body ?? [];
    if (!open.some((o) => /With an LMIA/.test(o.combination))) {
      await api("POST", "/demo/reset", { confirm: "RESET" }, "user-A");
      const l = await api("POST", "/demo/load", { sample: "configured" }, "user-A");
      ok("setup: Demo › Load the configured checkpoint", l.status === 201 || l.status === 200, l.status);
      open = (await api("GET", "/runtime/openable", undefined, "user-R")).body ?? [];
    }
    const vv = open.find((o) => o.combination === "Visitor visa")?.combination_id, wp = open.find((o) => /With an LMIA/.test(o.combination));
    ok("setup: the configured checkpoint has the Visitor visa and With an LMIA open for cases", !!vv && !!wp?.combination_id, open.map((o) => o.combination));
    const a = (await api("POST", "/runtime/cases", { combinationId: vv, reference: `C619W-A-${run}`, clientActor: "user-P", principal: { displayName: NAME } }, "user-R")).body;
    const pa = a.people.find((x) => x.role === "principal").subject_id;
    const facts = { "person.passport_number": "Z7000001", "person.passport_expiry_date": "2031-05-09" };
    for (const [f, v] of Object.entries(facts)) await api("PUT", `/runtime/cases/${a.id}/answers/${pa}/${f}`, { value: v, expectedId: null });
    const confirmAll = async (caseId, subject) => {
      const qs = ((await api("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`)).body?.sections ?? []).flatMap((s) => s.questions).filter((q) => q.subjectId === subject && q.answer);
      for (const sec of new Set(qs.map((q) => q.section))) await api("POST", `/runtime/cases/${caseId}/sections/${sec}/confirm`, { subjectId: subject, seen: qs.filter((q) => q.section === sec).map((q) => q.answer.id) });
    };
    await confirmAll(a.id, pa);

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, timezoneId: "America/Toronto" }); // the firm's zone: review M2 showed a date one day early there
    await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-R"); });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    // Step 1: Open a case for the returning client, by screens.
    const openCase = async (ref) => {
      await p.goto(`${BASE}/cases`);
      await p.getByRole("button", { name: "Open a case" }).click(T);
      const dlg = p.getByRole("dialog");
      await dlg.getByLabel("Combination (released)").selectOption(wp.combination_id, T);
      await dlg.getByLabel("Your own reference (optional)").fill(ref);
      await dlg.getByLabel("Principal applicant's name").fill(NAME);
      await dlg.getByRole("button", { name: "Open case" }).click();
      await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
    };
    await openCase(`C619W-B-${run}`);
    const card = p.locator("[data-earlier-facts]");
    await card.getByRole("heading", { name: "Facts from an earlier case" }).waitFor(T);
    await card.scrollIntoViewIfNeeded();
    ok("C6.19 BR-1: the new case for the same client shows the card naming the earlier case", (await card.innerText()).includes(`C619W-A-${run}`));
    const rowOf = (fact) => card.locator(`tr[data-fact="${fact}"]`);
    ok("C6.19 BR-2: the earlier passport number and expiry date are offered, each New", (await rowOf("person.passport_number").getAttribute("data-state")) === "new" && (await rowOf("person.passport_expiry_date").getAttribute("data-state")) === "new");
    const button = card.getByRole("button", { name: /Re-confirm and use/ });
    ok("C6.19 BR-4: nothing ticked, the button is disabled (nothing is used until re-confirmed)", await button.isDisabled());
    await shot(p, "01-offer-1440.png");
    const axeCard = async (name) => { const r = await new AxeBuilder({ page: p }).include("[data-earlier-facts]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok(`C6.19 axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
    await axeCard("the offer card");
    // Step 2: tick by keyboard and by label, then re-confirm.
    await rowOf("person.passport_number").getByRole("checkbox").focus();
    await p.keyboard.press("Space");
    await card.getByLabel(/expiry/i).first().check();
    ok("C6.19: the button counts the ticks", /\(2\)/.test(await button.innerText()));
    await shot(p, "02-ticked-1440.png");
    await button.click();
    await p.getByText(/Re-confirmed 2 facts from C619W-A-/).first().waitFor(T);
    ok("C6.19 BR-3: the message says the facts are on this case and the earlier case did not change", true);
    await p.locator("[data-earlier-facts]").getByText(/Nothing to offer/).first().waitFor(T);
    await shot(p, "03-after-reconfirm-1440.png");
    // Step 3: the next capability's first step: the Agent view shows the copies with their origin (Confirm section, C6.3).
    const agent = p.locator("#agent-view");
    await agent.scrollIntoViewIfNeeded();
    await agent.getByRole("tab", { name: new RegExp(NAME) }).click(T); // the Agent view opens on its first person's tab
    await agent.getByText("Z7000001").first().waitFor(T);
    ok("C6.19 BR-3: the Agent view shows the copied passport number", true);
    await agent.getByText("Z7000001").first().scrollIntoViewIfNeeded(T);
    ok("C6.19 BR-4 (review M1): the copied answer keeps its giver (Agent view, Case officer) and says where it came from", (await agent.getByText(new RegExp(`^Agent view · Case officer .*copied from C619W-A-${run}, re-confirmed by Representative`)).count()) > 0);
    await shot(p, "04-agent-view-origin-1440.png");
    // Step 4: the earlier passport expires (changed and confirmed on case A); a further case shows it Expired.
    const qa = ((await api("GET", `/runtime/cases/${a.id}/questionnaire?mode=agent`)).body.sections).flatMap((s) => s.questions).find((q) => q.subjectId === pa && q.fact === "person.passport_expiry_date");
    await api("PUT", `/runtime/cases/${a.id}/answers/${pa}/person.passport_expiry_date`, { value: "2025-01-15", expectedId: qa.answer.id });
    await confirmAll(a.id, pa);
    await openCase(`C619W-C-${run}`);
    const caseC = p.url();
    const card2 = p.locator("[data-earlier-facts]");
    await card2.getByRole("heading", { name: "Facts from an earlier case" }).waitFor(T);
    // BR-1 (QA-338): case C has two earlier cases (A, and B with its copies); nothing is chosen until the officer picks.
    const radios = card2.getByRole("radio");
    await radios.first().waitFor(T);
    ok("C6.19 BR-1 fail (QA-338): with two earlier cases none is chosen for the officer: no case checked, no fact offered", (await radios.count()) === 2 && (await card2.locator("input[type=radio]:checked").count()) === 0 && (await card2.locator("tr[data-fact]").count()) === 0 && await card2.locator("[data-pick-hint]").isVisible());
    await shot(p, "08-nothing-chosen-1440.png");
    // QA-338: case B's copy of the expiry predates case A's correction: Out of date, naming case A, and the number Expired.
    await card2.getByLabel(new RegExp(`C619W-B-${run}`)).check(T);
    const bExp = card2.locator('tr[data-fact="person.passport_expiry_date"]');
    await bExp.waitFor(T);
    ok("C6.19 BR-1 (QA-338): the officer picks case B and sees its facts", (await card2.locator("input[type=radio]:checked").count()) === 1);
    ok("C6.19 QA-338: case B's stale expiry reads Out of date, naming case A and its later value, the tick disabled", (await bExp.getAttribute("data-newer")) === `C619W-A-${run}` && await bExp.getByRole("checkbox").isDisabled() && /Out of date/.test(await bExp.innerText()) && /15 Jan 2025/.test(await bExp.innerText()));
    ok("C6.19 QA-338: case B's passport number reads Expired from case A's newer date, the tick disabled", (await card2.locator('tr[data-fact="person.passport_number"]').getAttribute("data-expiry")) === "expired" && await card2.locator('tr[data-fact="person.passport_number"]').getByRole("checkbox").isDisabled());
    await bExp.scrollIntoViewIfNeeded(); await shot(p, "09-case-b-out-of-date-1440.png");
    await axeCard("the card with an out-of-date copy");
    await card2.getByLabel(new RegExp(`C619W-A-${run}`)).check(T);
    const num = card2.locator('tr[data-fact="person.passport_number"]');
    await num.waitFor(T);
    ok("C6.19 BR-6: the passport number reads Expired, the tick disabled, with the rule's words", (await num.getAttribute("data-expiry")) === "expired" && await num.getByRole("checkbox").isDisabled() && /expired on 15 Jan 2025/.test(await num.innerText()));
    ok("C6.19 BR-6 (challenge M3): on the work permit the rule says Sample, naming the visitor visa page", /Sample on this combination/.test(await num.innerText()));
    await num.scrollIntoViewIfNeeded();
    await shot(p, "05-expired-1440.png");
    await axeCard("the card with an expired passport");
    // Review M2: on a Visitor visa case the rule quotes canada.ca with the date our copy was recorded, as a calendar date.
    const openVv = async (ref) => { await p.goto(`${BASE}/cases`); await p.getByRole("button", { name: "Open a case" }).click(T); const dlg = p.getByRole("dialog"); await dlg.getByLabel("Combination (released)").selectOption(vv, T); await dlg.getByLabel("Your own reference (optional)").fill(ref); await dlg.getByLabel("Principal applicant's name").fill(NAME); await dlg.getByRole("button", { name: "Open case" }).click(); await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T); };
    await openVv(`C619W-D-${run}`);
    const card3 = p.locator("[data-earlier-facts]");
    await card3.getByRole("heading", { name: "Facts from an earlier case" }).waitFor(T);
    await card3.getByLabel(new RegExp(`C619W-A-${run}`)).check(T); // cases A, B and C are earlier here: the officer picks A
    const vnum = card3.locator('tr[data-fact="person.passport_number"]');
    await vnum.waitFor(T);
    const vtext = await vnum.innerText();
    ok("C6.19 BR-6 (review M2): on the Visitor visa the flag quotes canada.ca, recorded 27 Oct 2026 in Toronto time, not a day early", vtext.includes("recorded 27 Oct 2026:") && vtext.includes("All applicants need to include a digital copy of your valid (not expired) passport"), vtext.slice(0, 500));
    await vnum.scrollIntoViewIfNeeded(); await shot(p, "07-expired-visitor-visa-1440.png");
    await p.goto(caseC); await card2.getByRole("heading", { name: "Facts from an earlier case" }).waitFor(T);
    for (const w of [1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); ok(`C6.19: the case page has no sideways scroll at ${w} px`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))); }
    await p.setViewportSize({ width: 390, height: 900 }); await card2.scrollIntoViewIfNeeded(); await shot(p, "06-expired-390.png");
    ok("C6.19: no page errors", errors.length === 0, errors);
  } catch (e) {
    ok("C6.19: the journey ran to the end", false, String((e && e.message) || e).slice(0, 500));
  } finally {
    await browser.close();
  }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
