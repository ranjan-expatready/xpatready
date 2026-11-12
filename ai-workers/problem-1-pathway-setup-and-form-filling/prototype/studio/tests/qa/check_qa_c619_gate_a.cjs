// qa gate A for C6.19 (P-317, P-348 (3)) on the configured checkpoint (P-322), by screens only, at 1024 px, as the Case
// officer (user-O, firm staff). Unlike the builder's check (which sets up the earlier case through the API), case A is
// built here through the screens too: Open a case (Visitor visa) → Agent view → Add the passport number, country and
// expiry date → Confirm section. Then case B (With an LMIA, same principal name, same client login) → "Facts from an
// earlier case" → tick → "Re-confirm and use" → the Agent view shows the copies with their origin and status (C6.3) →
// the next capability's first step: Prepare application (C7.1) — the principal's form counts the copied facts and a copy
// is generated. Then the earlier passport expires (edited and confirmed on case A by screens) → case C shows it Expired,
// the tick disabled; first (QA-338 re-test, the default left alone) case C chooses no earlier case, and case B picked by
// the officer shows its stale copies Out of date / Expired, untickable, refused by the server. The API is read only underneath (data as entered, earlier case unchanged, roles 403/404).
// Loads the configured checkpoint through Demo › Load the configured checkpoint when the copy has none. Sample data, US$0.
//   zsh studio/tools/isolated.sh qa_c619 4473 start --ttl 60 && trap 'zsh studio/tools/isolated.sh qa_c619 4473 stop' EXIT && node studio/tests/qa/check_qa_c619_gate_a.cjs 4473 <shots dir>
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4473", BASE = `http://localhost:${PORT}`;
const SHOTS = process.argv[3] ?? path.join(__dirname, "../../../../product/qa/reports/2026-11-09-c619/screenshots");
const W = Number(process.env.QA_WIDTH ?? 1024), TAG = `${W}`;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const T = { timeout: 30000 };
const run = Date.now().toString(36), NAME = `Client W ${run}`;
const api = async (method, url, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "content-type": "application/json", "x-actor": actor }, body: body === undefined ? undefined : JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* empty */ } return { status: r.status, body: j }; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const ctxFor = async (actor) => { const c = await browser.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1, timezoneId: "America/Toronto" }); await c.addInitScript((a) => { localStorage.setItem("xr-actor", a); }, actor); return c; };
  const shot = async (p, name) => p.screenshot({ path: path.join(SHOTS, `${name}-${TAG}.png`), fullPage: false });
  const wide = async (p, what) => ok(`no sideways scroll at ${W} px: ${what}`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  try {
    // 0. The configured checkpoint, through the Demo menu (as the Configuration author).
    let open = (await api("GET", "/runtime/openable", undefined, "user-R")).body ?? [];
    if (!open.some((o) => /With an LMIA/.test(o.combination))) {
      const c0 = await ctxFor("user-A"), p0 = await c0.newPage();
      await p0.goto(`${BASE}/`); await p0.getByRole("button", { name: /^Demo/ }).click(T);
      await p0.getByRole("menuitem", { name: /Load the configured checkpoint/ }).click(T);
      await p0.getByRole("dialog").getByRole("button", { name: "Load the configured checkpoint" }).click(T);
      await p0.getByRole("dialog", { name: "Configured checkpoint loaded" }).waitFor({ timeout: 400000 });
      await shot(p0, "00-checkpoint-loaded"); await c0.close();
      open = (await api("GET", "/runtime/openable", undefined, "user-R")).body ?? [];
    }
    const vv = open.find((o) => o.combination === "Visitor visa"), wp = open.find((o) => /With an LMIA/.test(o.combination));
    ok("setup: the configured checkpoint has the Visitor visa and With an LMIA open for cases (Demo › Load the configured checkpoint)", !!vv && !!wp, open.map((o) => o.combination));

    const ctx = await ctxFor("user-O"), p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    const openCase = async (comboLabel, ref) => {
      await p.goto(`${BASE}/cases`);
      await p.getByRole("button", { name: "Open a case" }).click(T);
      const dlg = p.getByRole("dialog");
      const sel = dlg.getByLabel("Combination (released)");
      await sel.locator("option", { hasText: comboLabel }).first().waitFor({ state: "attached", ...T });
      const label = (await sel.locator("option").allTextContents()).map((t) => t.trim()).find((t) => t.startsWith(comboLabel));
      if (!label) throw new Error(`no released option starts with ${comboLabel}`);
      await sel.selectOption({ label }, T);
      if ((await sel.locator("option:checked").textContent()).trim() !== label) throw new Error(`the combination picked is not ${label}`);
      await dlg.getByLabel("Your own reference (optional)").fill(ref);
      await dlg.getByLabel("Principal applicant's name").fill(NAME);
      await dlg.getByRole("button", { name: "Open case" }).click();
      await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
      await p.waitForLoadState("networkidle");
      return p.url().split("/").pop();
    };
    const agent = p.locator("#agent-view");
    const principalTab = async () => { await agent.scrollIntoViewIfNeeded(); await agent.getByRole("tab", { name: new RegExp(`^${NAME}(?!.s )`) }).click(T); };
    const sectionOf = (text) => agent.locator('section[id^="s-"]').filter({ hasText: text });
    const addValue = async (label, value) => {
      const btn = agent.getByRole("button", { name: `Add ${label} for ${NAME}` }).first();
      await btn.scrollIntoViewIfNeeded(T); await btn.click(T);
      const d = p.getByRole("dialog");
      if (typeof value === "string") { const tb = d.getByRole("textbox"); if (await tb.count() === 1) await tb.fill(value); else await d.getByRole("combobox").first().selectOption({ label: value }).catch(async () => d.getByRole("combobox").first().fill(value)); }
      else { await d.getByLabel("Day").fill(value.d); await d.getByLabel("Month").fill(value.m); await d.getByLabel("Year").fill(value.y); }
      await d.getByRole("button", { name: "Save" }).click(); await d.waitFor({ state: "hidden", ...T });
    };

    // 1. Case A (Visitor visa), by screens: the officer enters the passport from the document and confirms the section.
    const refA = `QA619-A-${run}`;
    const caseA = await openCase("Visitor visa", refA);
    await principalTab();
    await addValue("Number of the passport or travel document", "Z7100001");
    await addValue("Passport expiry date", { d: "9", m: "5", y: "2031" });
    const numBtnA = agent.getByText("Z7100001").first();
    const secA = sectionOf("Z7100001");
    await secA.getByRole("button", { name: /Confirm section/ }).click(T); await p.waitForLoadState("networkidle");
    let secs = (await api("GET", `/runtime/cases/${caseA}/questionnaire?mode=agent`)).body.sections;
    // the expiry date may sit in another section: confirm each section of the principal that has an unconfirmed answer
    for (let i = 0; i < 4; i++) {
      const open1 = secs.flatMap((s) => s.questions.map((q) => ({ s, q }))).filter(({ q }) => q.answer && q.answer.confirmed === false && /passport/.test(q.fact));
      if (!open1.length) break;
      const lab = open1[0].q.label;
      const s = sectionOf(lab).first();
      await s.getByRole("button", { name: /Confirm section/ }).click(T); await p.waitForLoadState("networkidle");
      secs = (await api("GET", `/runtime/cases/${caseA}/questionnaire?mode=agent`)).body.sections;
    }
    const aQs = secs.flatMap((s) => s.questions).filter((q) => /passport_(number|expiry_date)$/.test(q.fact) && q.answer);
    ok("case A (by screens): the passport number and expiry date are entered and confirmed (Confirm section)", aQs.length === 2 && aQs.every((q) => q.answer.confirmed), aQs.map((q) => [q.fact, q.answer.value, q.answer.confirmed]));
    await numBtnA.scrollIntoViewIfNeeded(); await shot(p, "01-case-a-confirmed");
    const aBefore = JSON.stringify(aQs.map((q) => [q.fact, q.answer.id, q.answer.value]));

    // 2. Case B (With an LMIA) for the same client: the card offers case A's confirmed facts, nothing ticked.
    const refB = `QA619-B-${run}`;
    const caseB = await openCase("With an LMIA", refB);
    const card = p.locator("[data-earlier-facts]");
    await card.getByRole("heading", { name: "Facts from an earlier case" }).waitFor(T);
    await card.scrollIntoViewIfNeeded();
    await card.getByText(refA).first().waitFor(T).catch(() => {});
    const cardText = await card.innerText();
    ok("C6.19 BR-1: case B shows \"Facts from an earlier case\" naming case A and its combination", cardText.includes(refA) && /Visitor visa/.test(cardText), cardText.slice(0, 300));
    const pick = card.getByLabel(new RegExp(refA)); if (await pick.count()) await pick.check();
    const rowOf = (c, fact) => c.locator(`tr[data-fact="${fact}"]`);
    await rowOf(card, "person.passport_number").waitFor(T);
    ok("C6.19 BR-2: the passport number and expiry date are offered, each New, with the earlier value and confirm date", (await rowOf(card, "person.passport_number").getAttribute("data-state")) === "new" && (await rowOf(card, "person.passport_expiry_date").getAttribute("data-state")) === "new" && (await rowOf(card, "person.passport_number").innerText()).includes("Z7100001"));
    const button = card.getByRole("button", { name: /Re-confirm and use/ });
    ok("C6.19 BR-4: nothing ticked, \"Re-confirm and use\" is disabled", await button.isDisabled());
    let bQs = (await api("GET", `/runtime/cases/${caseB}/questionnaire?mode=agent`)).body.sections.flatMap((s) => s.questions).filter((q) => /passport_(number|expiry_date)$/.test(q.fact));
    ok("C6.19 BR-4 underneath: before the press case B has no passport answer (nothing copied silently)", bQs.every((q) => !q.answer), bQs.map((q) => q.answer?.value));
    await shot(p, "02-case-b-offer");
    { const r = await new AxeBuilder({ page: p }).include("[data-earlier-facts]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok("axe: the card has no WCAG A/AA violation", r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); }
    await wide(p, "case B with the card");

    // 3. Tick both (one by keyboard) and re-confirm.
    await rowOf(card, "person.passport_number").getByRole("checkbox").focus(); await p.keyboard.press("Space");
    await rowOf(card, "person.passport_expiry_date").getByRole("checkbox").check();
    ok("the button counts the ticks (2)", /\(2\)/.test(await button.innerText()));
    await shot(p, "03-case-b-ticked");
    await button.click();
    const msg = p.getByText(new RegExp(`Re-confirmed 2 facts from ${refA}`)).first();
    await msg.waitFor(T);
    ok("C6.19 BR-3: the message says 2 facts were re-confirmed from case A", true, await msg.innerText());
    await shot(p, "04-case-b-after-reconfirm");

    // 4. Underneath: copies on B, A unchanged; status kept.
    bQs = (await api("GET", `/runtime/cases/${caseB}/questionnaire?mode=agent`)).body.sections.flatMap((s) => s.questions).filter((q) => /passport_(number|expiry_date)$/.test(q.fact));
    ok("C6.19 BR-3 underneath: case B now has the two values exactly as entered on A", bQs.find((q) => q.fact === "person.passport_number")?.answer?.value === "Z7100001" && bQs.find((q) => q.fact === "person.passport_expiry_date")?.answer?.value === "2031-05-09", bQs.map((q) => [q.fact, q.answer?.value]));
    ok("C6.19 BR-4 underneath: the copies arrive confirmed (they were confirmed on A)", bQs.every((q) => q.answer?.confirmed === true), bQs.map((q) => [q.fact, q.answer?.confirmed, q.answer?.status]));
    const aAfter = JSON.stringify((await api("GET", `/runtime/cases/${caseA}/questionnaire?mode=agent`)).body.sections.flatMap((s) => s.questions).filter((q) => /passport_(number|expiry_date)$/.test(q.fact) && q.answer).map((q) => [q.fact, q.answer.id, q.answer.value]));
    ok("C6.19 BR-3 underneath: case A's answers are unchanged (same ids, same values)", aAfter === aBefore);

    // 5. The Agent view on B (C6.3): the copy with who first gave it and its origin.
    await p.reload(); await p.waitForLoadState("networkidle");
    await principalTab();
    const v = agent.getByText("Z7100001").first(); await v.waitFor(T); await v.scrollIntoViewIfNeeded();
    const origin = agent.getByText(new RegExp(`copied from ${refA}, re-confirmed by Case officer`));
    ok("C6.3 next step: the Agent view on B shows the copied passport number, its giver and \"copied from <case A>, re-confirmed by Case officer\"", (await origin.count()) > 0, (await sectionOf("Z7100001").first().innerText()).slice(0, 600));
    await shot(p, "05-case-b-agent-view-origin");

    // 6. The next capability's first step: Prepare application (C7.1) on case B.
    const forms = p.locator("section", { has: p.getByRole("heading", { name: "Prepare application", exact: true }) });
    await forms.scrollIntoViewIfNeeded(T);
    const formsText = await forms.innerText();
    console.log("Prepare application (case B):\n" + formsText.slice(0, 1500));
    // The principal's IMM 5710 (the work permit form; IMM 5476 is the representative's and reads no passport fact).
    const f0 = forms.getByRole("listitem").filter({ has: p.getByRole("heading", { name: new RegExp(`IMM 5710 for ${NAME}`) }) }).first();
    const has5710 = (await f0.count()) > 0;
    ok("C7.1 first step: case B's Prepare application lists IMM 5710 for the principal", has5710, formsText.slice(0, 300));
    if (has5710) {
      const before = await f0.innerText();
      ok("C7.1 first step: IMM 5710 counts the two re-confirmed facts (\"Declared or confirmed answers for 2 of …\")", /Declared or confirmed answers for 2 of \d+ form fields/.test(before), before.slice(0, 300));
      await f0.getByRole("button", { name: /^Generate a (new )?copy$/ }).click(T);
      const done = await f0.getByText(/2 form fields written · read back and checked/).first().waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
      ok("C7.1 first step: \"Generate a copy\" of IMM 5710 writes the 2 copied facts, read back and checked", done, (await f0.innerText()).slice(0, 500));
      await f0.scrollIntoViewIfNeeded(); await shot(p, "06-case-b-prepare-application-imm5710");
    }
    // Underneath: the copied passport number reaches the forms' facts (the fill reads it).
    const fills = await api("GET", `/runtime/cases/${caseB}/forms`);
    const fillsText = JSON.stringify(fills.body ?? {});
    console.log("forms API status", fills.status, fillsText.slice(0, 400));

    // 7. The earlier passport expires: edited and confirmed on case A by screens; case C shows it Expired.
    await p.goto(`${BASE}/cases/${caseA}`); await p.waitForLoadState("networkidle");
    await principalTab();
    const editExp = agent.getByRole("button", { name: new RegExp(`^Edit Passport expiry date for ${NAME}`) }).first();
    await editExp.scrollIntoViewIfNeeded(T); await editExp.click(T);
    { const d = p.getByRole("dialog"); await d.getByLabel("Day").fill("15"); await d.getByLabel("Month").fill("1"); await d.getByLabel("Year").fill("2025"); await d.getByRole("button", { name: "Save" }).click(); await d.waitFor({ state: "hidden", ...T }); }
    await sectionOf("15 Jan 2025").first().getByRole("button", { name: /Confirm section/ }).click(T); await p.waitForLoadState("networkidle");
    let exp = null;
    for (let i = 0; i < 20; i++) { exp = (await api("GET", `/runtime/cases/${caseA}/questionnaire?mode=agent`)).body.sections.flatMap((s) => s.questions).find((q) => q.fact === "person.passport_expiry_date"); if (exp?.answer?.confirmed) break; await p.waitForTimeout(250); }
    ok("case A (by screens): the expiry date is now 15 Jan 2025, confirmed", exp?.answer?.value === "2025-01-15" && exp.answer.confirmed, exp?.answer);
    const bExp = (await api("GET", `/runtime/cases/${caseB}/questionnaire?mode=agent`)).body.sections.flatMap((s) => s.questions).find((q) => q.fact === "person.passport_expiry_date");
    ok("C6.19 BR-3: the edit on case A did not reach case B (copies, not links)", bExp?.answer?.value === "2031-05-09", bExp?.answer?.value);
    const refC = `QA619-C-${run}`;
    const caseC = await openCase("With an LMIA", refC);
    const card2 = p.locator("[data-earlier-facts]");
    await card2.getByRole("heading", { name: "Facts from an earlier case" }).waitFor(T);
    await card2.scrollIntoViewIfNeeded();
    // QA-338 re-test, by screens, the default left alone (BR-1): two earlier cases (A, B), nothing chosen, no fact rows.
    const radios = card2.getByRole("radio");
    await radios.first().waitFor(T).catch(() => {});
    const nRadios = await radios.count(); let nChecked = 0; for (let i = 0; i < nRadios; i++) if (await radios.nth(i).isChecked()) nChecked++;
    const hint = await card2.getByText("Pick the earlier case to see what it offers. Nothing is chosen for you.").count();
    ok("QA-338 / C6.19 BR-1: on case C (two earlier cases) no earlier case is chosen, no fact row shows, and the card says so", nRadios === 2 && nChecked === 0 && (await card2.locator("tr[data-fact]").count()) === 0 && hint > 0, { nRadios, nChecked, hint });
    await shot(p, "08-case-c-nothing-chosen");
    // The officer picks case B (the newest, which holds a copy of the passport made before A's correction).
    await card2.getByLabel(new RegExp(refB)).check(T);
    const bNum = rowOf(card2, "person.passport_number"), bExp2 = rowOf(card2, "person.passport_expiry_date");
    await bExp2.waitFor(T); await bExp2.scrollIntoViewIfNeeded();
    const bExpText = await bExp2.innerText(), bNumText = await bNum.innerText();
    ok("QA-338 / C6.19 BR-6: case B's stale copy of the expiry reads Out of date (naming case A) or Expired, and cannot be ticked", ((await bExp2.getAttribute("data-newer")) === refA || (await bExp2.getAttribute("data-expiry")) === "expired") && await bExp2.getByRole("checkbox").isDisabled(), { newer: await bExp2.getAttribute("data-newer"), expiry: await bExp2.getAttribute("data-expiry"), text: bExpText.slice(0, 400) });
    ok("QA-338 / C6.19 BR-6: case B's copy of the passport number reads Expired and cannot be ticked", (await bNum.getAttribute("data-expiry")) === "expired" && await bNum.getByRole("checkbox").isDisabled(), bNumText.slice(0, 400));
    ok("QA-338: with only stale copies chosen, \"Re-confirm and use\" stays disabled", await card2.getByRole("button", { name: /Re-confirm and use/ }).isDisabled());
    await shot(p, "09-case-c-case-b-out-of-date");
    { const r = await new AxeBuilder({ page: p }).include("[data-earlier-facts]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok("axe: the card on case C with case B picked has no WCAG A/AA violation", r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); }
    // Underneath: the server refuses the stale copy too (not only the disabled box); case C stays without a passport answer.
    { const off = (await api("GET", `/runtime/cases/${caseC}/earlier-facts`)).body, eb = off?.earlier?.find((e) => e.reference === refB);
      const take = (eb?.people ?? []).flatMap((pp) => pp.facts.filter((f) => f.fact === "person.passport_expiry_date").map((f) => ({ subject_id: pp.subject_id, fact: f.fact, from: f.from_answer })));
      const r = await api("POST", `/runtime/cases/${caseC}/earlier-facts`, { earlierCase: eb?.case_id, take, seen: Object.fromEntries(take.map((t) => [`${t.subject_id}|${t.fact}`, null])) });
      const cQs = (await api("GET", `/runtime/cases/${caseC}/questionnaire?mode=agent`)).body.sections.flatMap((s) => s.questions).filter((q) => /passport_(number|expiry_date)$/.test(q.fact));
      ok("QA-338 underneath: a POST of case B's stale expiry is refused (4xx, Problem Details) and case C has no passport answer", take.length === 1 && r.status >= 400 && r.status < 500 && !!r.body?.detail && cQs.every((q) => !q.answer), { status: r.status, detail: r.body?.detail, take: take.length }); }
    const pick2 = card2.getByLabel(new RegExp(refA)); if (await pick2.count()) await pick2.check();
    const num = rowOf(card2, "person.passport_number"); await num.waitFor(T); await num.scrollIntoViewIfNeeded();
    const numText = await num.innerText();
    ok("C6.19 BR-6: on case C the passport number from case A reads Expired (15 Jan 2025), the tick disabled, with its rule's words", (await num.getAttribute("data-expiry")) === "expired" && await num.getByRole("checkbox").isDisabled() && /expired on 15 Jan 2025/.test(numText), numText.slice(0, 400));
    await shot(p, "07-case-c-expired");
    await wide(p, "case C with an expired passport");
    // Underneath: roles (BR-7).
    const cl = await api("GET", `/runtime/cases/${caseB}/earlier-facts`, undefined, "user-P");
    const au = await api("GET", `/runtime/cases/${caseB}/earlier-facts`, undefined, "user-A");
    ok("C6.19 BR-7: the client and a configuration person cannot read the card's data (403)", cl.status === 403 && au.status === 403, [cl.status, au.status]);
    ok("no page errors", errors.length === 0, errors);
  } catch (e) {
    ok("the walk ran to the end", false, String((e && e.message) || e).slice(0, 600));
  } finally {
    await browser.close();
  }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
