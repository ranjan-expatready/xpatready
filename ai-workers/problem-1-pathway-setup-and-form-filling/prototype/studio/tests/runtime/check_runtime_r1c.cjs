// R1c renderer journey (runtime lane, plan §8 "questionnaire part of the journey") in a real browser, on the runtime
// copy after setup_visitor_visa.ts: the officer opens a case and adds the family (1440 and 1024 px) → the client answers
// on a phone (390 px): one part per screen, "answering for", field checks with an error summary, a repeating group,
// leave and resume → the officer reviews in the Agent view, edits with the message naming the forms, confirms a section,
// meets a conflict. axe-core (WCAG 2.2 A/AA) on every state; data checked underneath through the API. No paid AI.
// Screenshots: product/screens/R1-thin-slice/screenshots/r1c/.
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1 && node studio/tests/runtime/check_runtime_r1c.cjs 4430
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const { speed } = require("../speed_budget.cjs"); // P-184: speed budgets judged only when the Mac is not busy

const PORT = process.argv[2] ?? "4430", BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "../../../../product/screens/R1-thin-slice/screenshots/r1c");
const run = Date.now().toString(36).slice(-5);
const results = []; const axeLog = [];
const step = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || detail === undefined ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const call = async (method, url, body, actor) => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null }; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const f of fs.readdirSync(SHOTS)) if (f.endsWith(".png")) fs.unlinkSync(path.join(SHOTS, f)); // numbering is per run
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const open = async (actor, width, height) => {
    const ctx = await browser.newContext({ viewport: { width, height } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("r1c-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("r1c-init", "1"); } } catch { /* ignore */ } }, actor);
    const p = await ctx.newPage();
    // R1C_SLOW=<rate>: run as on a slower machine (CPU throttled, each API response delayed) to prove the steps wait for state.
    if (process.env.R1C_SLOW) { const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.R1C_SLOW) }); await p.route("**/api/**", async (r) => { await new Promise((ok) => setTimeout(ok, 150)); await r.continue(); }); }
    p.on("pageerror", (e) => errors.push(String(e)));
    p.on("console", (m) => { if (m.type() === "error" && !/status of (400|403|409|422)/.test(m.text())) errors.push(m.text()); });
    return p;
  };
  let n = 0;
  /** Screenshot at each width (the first is the page's own) and axe on it; no sideways scroll at any width. */
  const WAIT = 10000;
  /** The state a step needs: shown, gone, a value, the focus, or data underneath — waited for, never slept for. */
  const shows = (loc) => loc.waitFor({ state: "visible", timeout: WAIT }).then(() => true, () => false);
  const gone = (loc) => loc.waitFor({ state: "detached", timeout: WAIT }).then(() => true, () => false);
  const until = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: WAIT }).then(() => true, () => false);
  const eventually = async (fn) => { const end = Date.now() + WAIT; for (;;) { try { if (await fn()) return true; } catch { /* not there yet */ } if (Date.now() > end) return false; await new Promise((ok) => setTimeout(ok, 100)); } };
  const idle = async (p) => { await p.waitForLoadState("networkidle").catch(() => {}); };
  const frames = (p) => p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(null)))));
  const state = async (p, name, widths) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    // A state is what the person sees once the page has settled: no button busy, transitions drawn.
    await p.waitForFunction(() => !document.querySelector("button[aria-busy]"), undefined, { timeout: WAIT }).catch(() => {}); await frames(p);
    const own = p.viewportSize();
    for (const w of widths) {
      if (w !== p.viewportSize().width) { await p.setViewportSize({ width: w, height: w < 500 ? 844 : 900 }); await frames(p); }
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: true });
      const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      step(`${w} px: ${name} has no sideways scroll`, !over);
    }
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    axeLog.push({ state: base, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(" "), help: v.help })) });
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    if (p.viewportSize().width !== own.width) await p.setViewportSize(own);
  };
  /** Save and continue, then wait until saving is over (the button is enabled again or the part changed). */
  /** Save and continue: every save ends by reloading the questionnaire view; wait for that, then for the button to be free. */
  const saveAndContinue = async (p) => { const reloaded = p.waitForResponse((r) => r.request().method() === "GET" && /\/questionnaire/.test(r.url()), { timeout: WAIT }); await p.getByRole("button", { name: "Save and continue" }).click(); await reloaded; await p.waitForFunction(() => !document.querySelector("button[aria-busy]"), undefined, { timeout: WAIT }); await idle(p); await frames(p); };

  // ── 0. qa QA-35: the configuration author enters the case area from the studio's Demo menu, as a person does
  const author = await open("user-A", 1440, 900);
  await author.goto(`${BASE}/`); await idle(author);
  await author.getByRole("button", { name: /Demo/ }).click();
  await author.getByRole("menuitem", { name: /Open the case area/ }).click();
  step("QA-35 fail-guard: from the studio's Demo menu the case area opens as the case officer (not a blank page)", await shows(author.getByRole("heading", { level: 1, name: "Cases" })) && await shows(author.getByLabel("Simulated person")));
  await author.close();

  // ── 1. The officer opens a case and adds the family (desktop)
  const o = await open("user-O", 1440, 900);
  await o.goto(`${BASE}/cases`); await idle(o);
  step("officer: the case list opens with one primary action", await shows(o.getByRole("button", { name: "Open a case" })));
  await o.getByRole("button", { name: "Open a case" }).click();
  await o.getByRole("button", { name: "Open case" }).click(); await idle(o);
  // A24-2 (P-492): the firm's own reference is optional, so only the missing name is refused.
  step("officer fail: opening a case without a name shows the error on its field; the optional reference shows none", await shows(o.getByText("Give the principal applicant a display name.", { exact: true })) && (await o.getByText("Give the case a reference of at least 3 characters.", { exact: true }).count()) === 0);
  await o.getByLabel("Your own reference (optional)").fill(`R1C-${run}`);
  await o.getByLabel("Principal applicant's name").fill("Sample Applicant C");
  await o.getByRole("button", { name: "Open case" }).click(); await idle(o);
  await o.waitForURL(/\/cases\/[0-9a-f-]{36}$/);
  const caseId = o.url().split("/").pop();
  step("officer pass: the case opens on the released visitor visa, pinned to its release", await shows(o.getByRole("heading", { level: 1, name: new RegExp(`R1C-${run}`) })) && await shows(o.locator("[data-case-release]").filter({ hasText: /^Release \d+\b/ }).first())); // BK-4a: the pill also names its person
  await o.getByRole("button", { name: "Add spouse or partner" }).click(); await o.getByLabel("Name", { exact: true }).fill("Sample Spouse C"); await o.getByRole("button", { name: "Add", exact: true }).click(); await idle(o);
  await o.getByRole("button", { name: "Add child" }).click(); await o.getByLabel("Name", { exact: true }).fill("Sample Child C"); await o.getByRole("button", { name: "Add", exact: true }).click(); await idle(o);
  await o.getByRole("button", { name: "Add spouse or partner" }).click(); await o.getByLabel("Name", { exact: true }).fill("Sample Spouse D"); await o.getByRole("button", { name: "Add", exact: true }).click(); await idle(o);
  step("officer fail: a second spouse is refused with the release's limit, in the dialog", await shows(o.getByText(/at most 1 spouse/i).first()));
  await o.getByRole("button", { name: "Cancel" }).click();
  // B128 (QA-153): this release's family form (IMM 5707, for every applicant) reads each person's two parents, so each
  // person also has a tab for each parent (a relative the form describes, never a person on the case). Its boxes say
  // "Parent1" and "Parent2", not mother or father, so the tabs say first and second parent (review Major 1 on #1256).
  const tabNames = (await o.getByRole("tab").allInnerTexts()).map((t) => t.split("\n")[0].trim()).sort();
  const wantTabs = ["The application", ...["Sample Applicant C", "Sample Spouse C", "Sample Child C"].flatMap((n) => [n, `${n}'s first parent`, `${n}'s second parent`])].sort();
  step("officer pass: spouse and child are on the case and get their own tabs of sections (and a tab for each person's parents)", await shows(o.getByRole("tab").nth(3)) && JSON.stringify(tabNames) === JSON.stringify(wantTabs) && await shows(o.locator("section", { hasText: "People and filings" }).getByText("Sample Child C")), tabNames);
  await state(o, "officer-case-new", [1440, 1024]);

  // ── 2. The client answers on a phone
  const c = await open("user-P", 390, 844);
  await c.goto(`${BASE}/cases/${caseId}/questionnaire`); await idle(c);
  step("client: the overview says what to do and how saving works", await shows(c.getByRole("heading", { name: "Client questionnaire" })) && await shows(c.getByText(/0 of \d+ parts done/)));
  await state(c, "client-overview", [390]);
  await c.getByRole("button", { name: /^Start/ }).click(); await idle(c);
  step("labels: answers read as the form's map labels them (\"Visitor visa\", not the code \"VisitorVisa\")", await shows(c.getByRole("group", { name: /visitor visa or a transit visa/ }).getByLabel("Visitor visa")) && await gone(c.getByText("VisitorVisa")));
  step("client: part 1 is about the application, answered once", await shows(c.getByText("Answered once for the whole application.")) && await shows(c.getByText(/^Part 1 of \d+/)));
  await c.getByRole("group", { name: /visitor visa or a transit visa/ }).getByLabel("Visitor visa").check();
  const lang = c.getByRole("group", { name: /Official language/ });
  await lang.getByRole("radio").first().check();
  await state(c, "client-part-radio", [390]);
  await saveAndContinue(c);
  step("client pass: Save and continue saves and moves to the next part", await shows(c.getByText(/^Part 2 of \d+/)));
  // Your visit: dates, money, a select, a repeating group; a bad amount shows the summary and keeps the other answers
  await shows(c.getByRole("heading", { level: 1, name: "Your visit" }));
  const visit = await c.getByRole("heading", { level: 1 }).textContent();
  step("client: part 2 is the visit (the application's parts come first)", visit === "Your visit", visit);
  await c.getByLabel("What is the main purpose of the visit?").selectOption({ index: 1 });
  const start = c.getByRole("group", { name: /When will the visit start/ });
  await start.getByLabel("Day").fill("3"); await start.getByLabel("Month").fill("7"); await start.getByLabel("Year").fill("2027");
  const end = c.getByRole("group", { name: /When will the visit end/ });
  await end.getByLabel("Day").fill("31"); await end.getByLabel("Month").fill("2"); await end.getByLabel("Year").fill("2027");
  await c.getByLabel(/How much money/).fill("5000.50");
  await saveAndContinue(c);
  const summary = c.getByRole("alert").filter({ hasText: "There is a problem" });
  step("client fail: an impossible date and cents on a whole-dollar amount stay on the part with a summary linking to each field", await shows(summary) && await shows(summary.getByRole("link", { name: /visit end.*real date/i })) && await shows(summary.getByRole("link", { name: /money.*whole dollars/i })));
  step("client: the summary takes the focus (keyboard and screen reader)", await until(c, () => document.activeElement?.textContent?.startsWith("There is a problem") ?? false));
  await state(c, "client-error-summary", [390]);
  await summary.getByRole("link", { name: /money/i }).click();
  step("client: a summary link moves the focus to its field", await until(c, () => document.activeElement?.getAttribute("inputmode") === "numeric"));
  let v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  const qOf = (view, subjectLabel, fact) => view.sections.filter((s) => s.about_label === subjectLabel).flatMap((s) => s.questions).find((q) => q.fact === fact);
  step("data: validation never blocks saving (P-47): the invalid date and amount are stored and flagged, the start date is stored clean", qOf(v, "The application", "case.intended_stay_to")?.answer?.value === "2027-02-31" && qOf(v, "The application", "case.funds_available_cad")?.answer?.problems.length === 1 && qOf(v, "The application", "case.intended_stay_from")?.answer?.problems.length === 0);
  // RT-7 section checks (Sample data): a visit ending before it starts and no money are flagged, saved, never blocked
  await end.getByLabel("Day").fill("28"); await c.getByLabel(/How much money/).fill("0");
  await saveAndContinue(c);
  const checkBox = c.getByRole("alert").filter({ hasText: "Check these answers" });
  step("checks fail-guard: a visit ending before it starts and an amount of 0 keep the part open with \"Check these answers\", linked to both fields", await shows(checkBox) && await shows(checkBox.getByRole("link", { name: /visit end.*ends before it starts/i })) && await shows(checkBox.getByRole("link", { name: /money.*is 0/i })) && await shows(c.getByText(/^Part 2 of \d+/)));
  await state(c, "client-section-checks", [390]);
  v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  step("checks: the answers behind the warnings are stored (warn, never block, P-71)", qOf(v, "The application", "case.intended_stay_to")?.answer?.value === "2027-02-28" && v.checks.length === 2, v.checks.map((x) => x.id));
  await end.getByLabel("Day").fill("31"); await end.getByLabel("Month").fill("7"); await c.getByLabel(/How much money/).fill("5000");
  step("groups (review M2): a repeating group says what an entry asks", await shows(c.getByRole("heading", { name: "Entries" })) && await shows(c.getByText(/Each entry asks: Name of a person or organisation you will visit; Their relationship to you; Their address in Canada/)));
  // Lead, break M3: an empty group offers an entry or "none apply"; the principal's own answer is Declared and needs no
  // officer confirmation (P-72, as P-242 words it: QA-301).
  step("M3 client: an empty group offers \"Add an entry\" or \"None apply\", and says the forms need one or the other", await shows(c.getByRole("button", { name: "None apply" })) && await shows(c.getByText(/Add an entry, or say that none apply\. The forms need one or the other before filing\./)));
  await c.getByRole("button", { name: "None apply" }).click();
  step("M3 client pass (QA-301): \"None apply\" is saved, reads \"Declared\" as the client's own answer, and can be changed back", await shows(c.getByText("None apply", { exact: true })) && await shows(c.getByText("Declared: the client's own answer")) && await shows(c.getByRole("button", { name: "Entries apply after all" })) && await gone(c.getByRole("button", { name: "Add an entry" })));
  const isFocused = (l) => l.evaluate((el) => el === document.activeElement).catch(() => false);
  step("review M2 pass: after \"None apply\" the focus is on \"Entries apply after all\", not lost to the page", await eventually(() => isFocused(c.getByRole("button", { name: /^Entries apply after all/ }))));
  await state(c, "client-group-none-apply", [390]);
  await c.getByRole("button", { name: /^Entries apply after all/ }).click();
  step("review M2 pass: after \"Entries apply after all\" the focus is on \"Add an entry\"", await shows(c.getByRole("button", { name: "Add an entry" })) && await eventually(() => isFocused(c.getByRole("button", { name: "Add an entry" }))));
  await c.getByRole("button", { name: "Save and continue" }).click();
  const groupItem = c.getByRole("alert").getByRole("link", { name: /^Entries in ".+": add them, or say none apply\.$/ });
  step("review M1 fail-guard: Save and continue with a required group empty keeps the part and names the group, linked to \"None apply\"", await shows(groupItem));
  await groupItem.click();
  step("review M1 pass: the link takes the focus to \"None apply\"", await eventually(() => isFocused(c.getByRole("button", { name: /^None apply/ }))));
  await c.getByRole("button", { name: "Add an entry" }).click(); await idle(c);
  const entry = c.getByRole("region", { name: "Entry 1" });
  await entry.getByLabel("Name of a person or organisation you will visit").fill("Sample Host C");
  await entry.getByLabel("Their relationship to you").fill("Friend");
  const addr = entry.getByRole("group", { name: "Their address in Canada" });
  await addr.getByLabel("Street number").fill("12"); await addr.getByLabel("Street name").fill("Sample Street"); await addr.getByLabel("City or town").fill("Toronto"); await addr.getByLabel("Country").fill("Canada");
  await c.getByRole("button", { name: "Add another" }).click(); await idle(c);
  step("client: a second entry can be added, with its own fields", await shows(c.getByRole("region", { name: "Entry 2" })) && await entry.getByLabel("Their relationship to you").inputValue() === "Friend");
  await c.getByRole("region", { name: "Entry 2" }).getByRole("button", { name: "Remove" }).click();
  await state(c, "client-group-remove-confirm", [390]);
  await c.getByRole("region", { name: "Entry 2" }).getByRole("button", { name: "Remove", exact: true }).last().click(); await idle(c);
  step("client: removing an entry asks first, then removes it (history kept)", await gone(c.getByRole("region", { name: "Entry 2" })) && await shows(c.getByText("Entry removed. Its answers are kept in the case history.")));
  await saveAndContinue(c);
  step("client pass: the fixed part saves and moves on", await shows(c.getByText(/^Part 3 of \d+/)), await c.getByRole("alert").allTextContents());
  // PR 10 review (1): Back with a refused save stays on the part with the typing and the reason
  await c.getByRole("button", { name: "Back", exact: true }).click();
  await shows(c.getByText(/^Part 2 of \d+/));
  await c.getByLabel(/How much money/).fill("");
  await c.getByRole("button", { name: "Back", exact: true }).click();
  step("back fail-guard (PR 10 review): a refused save on Back keeps the client on the part, with what they typed and the reason, focused", await shows(c.getByRole("alert").filter({ hasText: "There is a problem" }).getByRole("link", { name: /money.*changed but not cleared/i })) && await shows(c.getByText(/^Part 2 of \d+/)) && (await c.getByLabel(/How much money/).inputValue()) === "" && await until(c, () => document.activeElement?.textContent?.startsWith("There is a problem") ?? false));
  await c.getByLabel(/How much money/).fill("5000");
  await saveAndContinue(c);
  step("back pass: once fixed, the part saves and moves on again", await shows(c.getByText(/^Part 3 of \d+/)));
  // qa QA-36 (Lead decision, P-47): Back and Save and continue leave a part the same way
  await c.getByRole("button", { name: "Back", exact: true }).click(); await shows(c.getByText(/^Part 2 of \d+/));
  const start2 = c.getByRole("group", { name: /When will the visit start/ });
  await start2.getByLabel("Day").fill("31"); await start2.getByLabel("Month").fill("2");
  await c.getByRole("button", { name: "Back", exact: true }).click();
  step("QA-36 fail-guard: Back with an impossible date saves it, flags it on the part and says it needs a fix (never a plain \"✓ Saved\")", await shows(c.getByText(/^Part 2 of \d+/)) && await shows(c.getByRole("alert").getByRole("link", { name: /visit start.*real date/i })) && await shows(c.getByText("Saved: 1 answer needs a fix")) && await gone(c.getByText("✓ Saved")));
  v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  step("QA-36 pass: the answer is stored (never lost) and flagged underneath", qOf(v, "The application", "case.intended_stay_from")?.answer?.value === "2027-02-31" && qOf(v, "The application", "case.intended_stay_from")?.answer?.problems.length === 1);
  await c.getByRole("button", { name: "leave them for now and go back" }).click();
  step("QA-36 pass: the person may still leave in the direction they chose", await shows(c.getByText(/^Part 1 of \d+/)));
  await saveAndContinue(c);
  await start2.getByLabel("Day").fill("3"); await start2.getByLabel("Month").fill("7");
  await saveAndContinue(c);
  step("QA-36 pass: fixed, the part moves on with \"✓ Saved\"", await shows(c.getByText(/^Part 3 of \d+/)));
  v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  const host = qOf(v, "The application", "case.visit_contact_address_in_canada");
  step("data: the repeating group holds one live entry with its address in parts; the fixed values are stored clean", host?.rows.length === 1 && host.rows[0].answer?.value?.city === "Toronto" && qOf(v, "The application", "case.funds_available_cad")?.answer?.value === "5000" && qOf(v, "The application", "case.intended_stay_to")?.answer?.value === "2027-07-31" && v.checks.length === 0, v.checks);
  // Answering for the spouse (P-78 words come from the server after saving)
  await c.getByRole("button", { name: "Back", exact: true }).click(); await c.getByRole("button", { name: "Back", exact: true }).click(); await c.getByRole("button", { name: "Back", exact: true }).click(); await idle(c);
  await c.getByRole("region", { name: "About Sample Spouse C", exact: true }).getByRole("button", { name: /Personal details/ }).click(); await idle(c);
  step("client: a family member's part says whom the client is answering for", await c.getByText("Answering for").locator("..").textContent().then((t) => /Answering for Sample Spouse C \(spouse or partner\)/.test(t ?? "")));
  await c.getByLabel("Current marital status").selectOption({ label: "Married" });
  await saveAndContinue(c);
  await c.getByRole("button", { name: "Back", exact: true }).click(); await idle(c);
  step("client: after saving, the part says the adult's answers wait for that adult or the officer, by name (P-78, P-411 (1))", await shows(c.getByText(/Answered by the principal for Sample Spouse C: declared/)));
  await state(c, "client-answering-for-spouse", [390, 1440]);
  // Rules after saving (review M1): "yes" to criminal history makes its details required; the part names what is missing
  await c.goto(`${BASE}/cases/${caseId}/questionnaire`); await idle(c);
  await c.getByRole("region", { name: "About Sample Applicant C", exact: true }).getByRole("button", { name: /Background declarations/ }).click(); await idle(c);
  await c.getByRole("group", { name: /ever committed, was arrested/ }).getByLabel("Yes").check();
  await saveAndContinue(c);
  const missingBox = c.getByRole("alert").filter({ hasText: "Check these answers" });
  step("rules fail-guard (review M1): after yes, the empty details question is named in the summary and the part stays open", await shows(missingBox.getByRole("link", { name: /Details of criminal history.*Answer this question/ })) && await shows(c.getByRole("heading", { level: 1, name: "Background declarations" })));
  await state(c, "client-required-named", [390]);
  await missingBox.getByRole("button", { name: "leave them for now and continue" }).click(); await idle(c);
  step("rules pass: the client may still leave them for now (warn, never block)", await until(c, () => { const h = document.querySelector("h1"); return !!h && h.textContent !== "Background declarations"; }));
  await c.goto(`${BASE}/cases/${caseId}/questionnaire`); await idle(c);
  await c.getByRole("region", { name: "About Sample Applicant C", exact: true }).getByRole("button", { name: /Residence and immigration status/ }).click(); await idle(c);
  step("residence (review M2): the country where the client lives now is asked once for the person, with the release's countries offered", await shows(c.getByLabel("Country or territory where you live now")) && await c.getByLabel("Country or territory where you live now").evaluate((e) => e.tagName === "SELECT" || !!e.getAttribute("list")) && await gone(c.getByRole("heading", { name: "Entries" })));
  step("countries (review M5): a country with no answer list yet offers the release's countries while typing", !!(await c.getByLabel("Country or territory you are applying from").getAttribute("list")));
  step("copy (review M5): the client never sees the configuration note about answer lists", await gone(c.getByText(/No fixed list for this answer yet|forms slice 2/)));
  // Leave and resume
  await c.getByRole("button", { name: "Save and come back later" }).click();
  await shows(c.getByRole("heading", { level: 1, name: "Client questionnaire" })); // the save finished and the overview opened
  await c.reload(); await idle(c);
  step("client: after leaving and coming back, the overview counts what is done and offers to continue", await shows(c.getByRole("button", { name: /Continue where you left off/ })) && await shows(c.getByText(/[1-9]\d* of \d+ parts done/)), await c.locator("main").textContent().then((t) => t?.slice(0, 160)));
  await state(c, "client-resume", [390]);
  // Roles in the browser
  await c.goto(`${BASE}/cases`); await idle(c);
  step("roles fail: the client cannot see the case list", await shows(c.getByText("Cases are for the case officer")));
  await c.goto(`${BASE}/cases/${caseId}`); await idle(c);
  step("roles fail: the client cannot open the officer's case page", await shows(c.getByText("This page is for the case officer")));

  // ── 3. The officer reviews in the Agent view (a household of four children, the release's limit: review M6)
  for (const n of [2, 3, 4]) await call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: `Sample Child C${n} with a rather long name` }, "user-O");
  await o.reload(); await idle(o);
  await o.getByRole("tab", { name: /^Sample Spouse C(?!'s )/ }).click(); 
  const spouseMarital = o.locator("section", { has: o.getByRole("heading", { name: "Personal details" }) }).filter({ hasText: "for Sample Spouse C" });
  step("agent: the client's answer shows with its source and the P-78 state", await shows(spouseMarital.getByText("Married", { exact: true })) && await shows(spouseMarital.getByText("Answered by the principal")) && await shows(spouseMarital.getByText(/questionnaire · Client A/)));
  await o.getByRole("tab", { name: /^The application/ }).click(); 
  const visitSec = o.locator("section").filter({ has: o.getByRole("heading", { name: "Your visit" }) });
  await visitSec.getByRole("button", { name: /Confirm section/ }).click(); await idle(o);
  step("agent pass: Confirm section confirms the visit's answers (Confirmed, history kept)", await shows(o.getByText(/Your visit for the application: \d+ answers? confirmed/)) && await shows(visitSec.getByText("Confirmed", { exact: true }).first()));
  step("agent source (review M4): a confirmed answer still says who first answered it", await shows(visitSec.getByText(/questionnaire · Client A · .* · confirmed by Case officer/).first()));
  step("readability (Lead, R1d): an answer read by the whole household says \"fills IMM 5257 for N people\", with each person on hover", await shows(visitSec.getByText(/fills IMM 5257 for 6 people/).first()) && /Sample Child C4/.test((await visitSec.getByText(/fills IMM 5257 for 6 people/).first().getAttribute("title")) ?? ""));
  step("agent copy: no label reads \"(optional) (optional)\"", !(await o.locator("main").textContent()).includes("(optional) (optional)"));
  await state(o, "case-view-confirmed", [1440, 1024]);
  await visitSec.getByRole("button", { name: /^Edit When will the visit end/ }).click();
  const endEdit = o.getByRole("dialog").getByRole("group", { name: /visit end/ });
  await endEdit.getByLabel("Day").fill("1"); await endEdit.getByLabel("Month").fill("7");
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await idle(o);
  step("agent checks: a date the officer corrects to before the start shows \"1 to check\" and the message on the section and the row", await shows(visitSec.getByText("1 to check")) && await shows(visitSec.getByText("The visit ends before it starts. Check both dates.").nth(1)));
  await visitSec.getByRole("button", { name: /Confirm section/ }).click(); await idle(o);
  step("agent checks: Confirm section still confirms (warn, not block) and says the check is still open", await shows(o.getByText(/1 check still open: The visit ends before it starts/)));
  await state(o, "case-view-section-check", [1440]);
  await o.locator("section").filter({ has: o.getByRole("heading", { name: "Application details" }) }).getByRole("button", { name: /^Edit Are you applying/ }).click();
  step("QA-37 (P-63): the edit dialog says \"form fields\", never \"boxes\"", await shows(o.getByRole("dialog").getByText(/\(\d+ form fields?\)/).first()) && !/\bbox(es)?\b/.test(await o.getByRole("dialog").textContent()));
  await o.getByRole("dialog").getByLabel("Transit").check();
  await state(o, "case-view-edit-dialog", [1440]);
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await idle(o);
  step("agent pass: an edit saves with a message naming every form it fills (P-45)", await shows(o.getByText(/Saved\. It fills IMM 5257 for \d+ people \(\d+ form fields\)/).last()));
  step("keyboard (review minor): closing the dialog returns the focus to its Edit button", await until(o, () => (document.activeElement?.getAttribute("aria-label") ?? "").startsWith("Edit Are you applying")));
  // Conflict: the client changes the amount while the officer's dialog is open
  await visitSec.getByRole("button", { name: /^Edit How much money/ }).click();
  await o.getByRole("dialog").getByLabel(/How much money/).fill("7000");
  v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  await call("PUT", `/runtime/cases/${caseId}/answers/${qOf(v, "The application", "case.funds_available_cad").subjectId}/case.funds_available_cad`, { value: "6000", expectedId: qOf(v, "The application", "case.funds_available_cad").answer.id }, "user-P");
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await idle(o);
  step("agent fail: a stale edit is refused (409) in the dialog and says what happened; nothing is overwritten", await shows(o.getByRole("dialog").getByText(/Someone changed this answer after you opened it/)) && (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, "user-O")).body.sections.flatMap((s) => s.questions).find((q) => q.fact === "case.funds_available_cad").answer.value === "6000");
  await state(o, "case-view-conflict", [1440]);
  step("agent conflict (review M3): the dialog now shows the newer answer", await eventually(async () => (await o.getByRole("dialog").getByLabel(/How much money/).inputValue()) === "6000"));
  await o.getByRole("dialog").getByLabel(/How much money/).fill("7000");
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await idle(o);
  step("agent conflict pass (review M3): saving again from the newer answer works", await gone(o.getByRole("dialog")) && (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, "user-O")).body.sections.flatMap((s) => s.questions).find((q) => q.fact === "case.funds_available_cad").answer.value === "7000");
  // Officer-only fact: the passport number, typed from the document
  await o.getByRole("tab", { name: /^Sample Applicant C(?!'s )/ }).click(); 
  const travel = o.locator("section").filter({ has: o.getByRole("heading", { name: "Travel and identity documents" }) }).filter({ hasText: "for Sample Applicant C" });
  await travel.getByRole("button", { name: /^Add Number of the passport/ }).first().click();
  await o.getByRole("dialog").getByRole("textbox").fill("SAMPLE-C-123");
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await idle(o);
  step("agent pass: the officer enters a fact the client is not asked; it waits for Confirm section", await shows(travel.getByText("SAMPLE-C-123")) && await shows(travel.getByText("To confirm").first()));
  v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  step("roles fail: the client's questionnaire never shows the officer-only passport number", !v.sections.flatMap((s) => s.questions).some((q) => q.fact === "person.passport_number"));

  // ── B150 (P-242, P-411; QA-301, QA-302, QA-303): every declared answer fills IMM 5257 at once, marked by who gave it,
  // measured by what a copy made now writes (the draft's count of written form fields) against the form fields the answer
  // fills. Release 1 asks the names from a document (the officer's), so each case takes an unanswered question of its kind.
  {
    const agentView = async () => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, "user-O")).body;
    const agentQ = async (label, fact) => qOf(await agentView(), label, fact);
    const writes = async (label) => (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, "user-O")).body.forms.find((f) => f.form === "IMM 5257" && f.person === label);
    const boxesOf = (q) => q.fills.filter((f) => f.form === "IMM 5257" && f.subject === q.subjectId).reduce((n, f) => n + f.boxes, 0);
    /** An unanswered single question about this person that fills their IMM 5257, asked of the client or of the officer; the
     *  passport number, else text, first. */
    const pick = async (label, client) => {
      const qs = (await agentView()).sections.filter((x) => x.about_label === label && !x.group).flatMap((x) => x.questions)
        .filter((q) => !q.answer && !q.hidden && !q.group && boxesOf(q) > 0 && (q.collected_from === "client_questionnaire") === client && (q.value_type === "text" || (q.options ?? []).length > 1));
      return qs.find((q) => q.fact === "person.passport_number") ?? qs.find((q) => q.value_type === "text") ?? qs[0];
    };
    const valueOf = (q, i = 0) => (q.options?.length ? q.options[i].key : `SAMPLE${["OWN", "FIXED", "S12", "SPOUSE"][i]}`);
    const put = (q, value, actor) => call("PUT", `/runtime/cases/${caseId}/answers/${q.subjectId}/${q.fact}`, { value, expectedId: q.answer?.id ?? null }, actor);
    // (1) The principal's own typed answer (P-242).
    let q = await pick("Sample Applicant C", true);
    const own = q?.fact, n = q ? boxesOf(q) : 0;
    let w0 = (await writes("Sample Applicant C")).draft.written_now;
    const r1 = q ? await put(q, valueOf(q), "user-P") : null;
    q = own ? await agentQ("Sample Applicant C", own) : null;
    step(`B150 pass (P-242, QA-301): the principal's own answer (${own}) reads Declared, never "Counts as confirmed"`, r1?.status === 200 && q?.answer?.mark === "declared" && /^Declared: the client's own answer/.test(q.answer.why), { status: r1?.status, answer: q?.answer });
    step("B150 pass (P-242, QA-302): it fills the principal's IMM 5257 at once: a copy made now writes its form fields", n > 0 && (await writes("Sample Applicant C")).draft.written_now === w0 + n, { before: w0, boxes: n, now: (await writes("Sample Applicant C")).draft });
    // (2) The principal's answer for an adult spouse (P-411 (1)).
    q = await pick("Sample Spouse C", true);
    const forSpouse = q?.fact, ns = q ? boxesOf(q) : 0;
    w0 = (await writes("Sample Spouse C")).draft.written_now;
    if (q) await put(q, valueOf(q, q.options?.length ? 1 : 3), "user-P");
    q = forSpouse ? await agentQ("Sample Spouse C", forSpouse) : null;
    step(`B150 pass (P-411 (1), QA-303): the principal's answer for the adult spouse (${forSpouse}) is marked "Answered by the principal for Sample Spouse C" and fills the spouse's IMM 5257 at once`, q?.answer?.mark === "by_principal" && /^Answered by the principal for Sample Spouse C/.test(q.answer.why) && ns > 0 && (await writes("Sample Spouse C")).draft.written_now === w0 + ns, { answer: q?.answer, before: w0, boxes: ns, now: (await writes("Sample Spouse C")).draft });
    step("B150 fail (P-411 (1)): the adult confirms it before signing: it stays not confirmed", q?.answer?.confirmed === false);
    // (3) An answer the officer types (P-411 (2)).
    q = await pick("Sample Spouse C", false);
    const typed = q?.fact, ng = q ? boxesOf(q) : 0;
    w0 = (await writes("Sample Spouse C")).draft.written_now;
    if (q) await put(q, valueOf(q, q.options?.length ? 1 : 2), "user-O");
    q = typed ? await agentQ("Sample Spouse C", typed) : null;
    step(`B150 pass (P-411 (2), QA-302): an officer-typed answer (${typed}) is marked "entered by staff" and fills the spouse's IMM 5257 at once`, q?.answer?.mark === "by_staff" && /entered by staff/.test(q.answer.why) && ng > 0 && (await writes("Sample Spouse C")).draft.written_now === w0 + ng, { answer: q?.answer, before: w0, boxes: ng, now: (await writes("Sample Spouse C")).draft });
    step("B150 fail (P-411 (2)): it stays on the Confirm list (not confirmed)", q?.answer?.confirmed === false);
    await o.reload(); await idle(o);
    await o.getByRole("tab", { name: /^Sample Applicant C(?!'s )/ }).click();
    step("B150 (P-411 (2)): the Agent view marks the officer's passport number \"Entered by staff · to confirm\"", await shows(travel.getByText("Entered by staff · to confirm").first()));
    // (4) The officer corrects the principal's own answer (P-411 (2)): a correction never empties a filled box.
    q = own ? await agentQ("Sample Applicant C", own) : null;
    w0 = (await writes("Sample Applicant C")).draft.written_now;
    const fix = q ? await put(q, valueOf(q, 1), "user-O") : null;
    q = own ? await agentQ("Sample Applicant C", own) : null;
    step("B150 pass (P-411 (2), QA-303): the officer's correction keeps the box filled (a copy made now writes as many form fields), marked \"entered by staff\" and to confirm", fix?.status === 200 && q?.answer?.mark === "by_staff" && q.answer.confirmed === false && (await writes("Sample Applicant C")).draft.written_now === w0, { before: w0, now: (await writes("Sample Applicant C")).draft, answer: q?.answer });
  }

  // ── 4. R1d: forms filled from declared and confirmed answers (P-411); never overwritten (RT-13…RT-16)
  await o.goto(`${BASE}/cases/${caseId}`); await idle(o);
  const forms = o.locator("section", { has: o.getByRole("heading", { name: "Prepare application", exact: true }) });
  const imm = forms.getByRole("listitem").filter({ has: o.getByRole("heading", { name: /IMM 5257 for Sample Applicant C/ }) });
  step("forms (QA-301): IMM 5257 for the principal says what a copy made now writes, \"Declared or confirmed answers\", and what blocks filing", await shows(imm.getByText(/Declared or confirmed answers for \d+ of \d+ form fields/)) && await shows(forms.getByText("The forms to file, filled from declared and confirmed answers.")) && await shows(imm.getByText(/facts? to answer or confirm before filing|Facts confirmed/)));
  await imm.getByRole("button", { name: "Generate a copy" }).click();
  step("forms RT-13 pass: the copy is generated in the background, then shown as generated, read back and checked", await shows(imm.getByText("Generated", { exact: true })) && await shows(imm.getByText(/form fields written.* · read back and checked/)));
  await state(o, "forms-generated", [1440, 1024]);
  const dl = o.waitForEvent("download", { timeout: WAIT });
  await imm.getByRole("button", { name: /^Download the copy/ }).first().click();
  step("forms pass: the copy downloads as a PDF", await dl.then(async (d) => /\.pdf$/.test(d.suggestedFilename())).catch(() => false));
  step("P-71 fail-guard: while facts are missing, Filed and Validated copy uploaded back are disabled and say why", await imm.getByRole("button", { name: "Filed" }).isDisabled() && await shows(imm.getByText(/Not yet: \d+ facts? to answer or confirm before filing: do that/)));
  await imm.getByText(/^Facts to answer or confirm \(\d+\)$/).click(); // QA-229 (B2): was "What blocks filing" (P-238 makes it a warning)
  step("review M3 pass: what blocks filing is listed on the page (question, whose, why), not only in a tooltip", await shows(imm.getByRole("listitem").filter({ hasText: /\(Sample Applicant C\): (not answered|not confirmed|needs a fix)$/ }).first()));
  // QA-165 part 2: before the file is offered, the mandatory fields of IRCC's form a copy leaves empty are listed with why.
  const openList = imm.locator("details[data-fields-open]");
  await openList.locator("summary").click();
  step("QA-165 part 2 pass: IMM 5257 lists the mandatory form fields still empty, each with why, in the form's words (never a field path)", await shows(openList.getByText(/^Marked mandatory on IRCC's form, still empty \(\d+\): .*may ask for more/)) && await shows(openList.getByRole("listitem").filter({ hasText: /— (needs an answer|no question asks it yet|fill it in Adobe|filled by hand): / }).first()) && await gone(openList.getByText(/form1\[|\[0\]\./)));
  // QA-165 (#1318 review M1): IMM 5257's own script requires the Taiwan PIN and Israel passport boxes only for a passport it codes
  // 203 or 206; this case's passport is neither, so they are not listed (two fields sharing words, each named: check_qa165_mandatory.ts).
  step("QA-165 fail guard (#1318 M1): the Taiwan PIN and Israel passport boxes are not listed for a passport that is neither Taiwan's nor Israel's", await gone(openList.getByText(/form field: Taiwan PIN\)/)) && await gone(openList.getByText(/form field: Israel Passport Indicator\)/)));
  { // Its own screenshots (not state(): that would renumber this check's committed set), sideways scroll and axe.
    const own = o.viewportSize(), dir = path.join(SHOTS, "..", "..", "..", "QA-165", "screenshots"); fs.mkdirSync(dir, { recursive: true });
    for (const w of [1440, 390]) {
      await o.setViewportSize({ width: w, height: w < 500 ? 844 : 900 }); await frames(o);
      await openList.screenshot({ path: path.join(dir, `forms-mandatory-open-${w}.png`) });
      step(`QA-165 part 2: ${w} px: the list has no sideways scroll`, !(await o.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    }
    await o.setViewportSize(own);
    const r = await new AxeBuilder({ page: o }).include("details[data-fields-open]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step("QA-165 part 2: the list passes axe (WCAG 2.2 AA)", r.violations.length === 0, r.violations.map((v) => v.id));
  }
  step("review M1 fail-guard: IMM 5257's fill trial passed, so its copies are not marked \"Checked copy, not for filing\"", await gone(imm.getByText("Checked copy, not for filing")));
  // Lead, break M3: an empty required group blocks filing until "none apply" is answered and confirmed: the officer
  // says it for the principal's education in the Agent view, then confirms the section.
  const edu = o.locator("section").filter({ has: o.getByRole("heading", { name: "Education history" }) }).filter({ hasText: "for Sample Applicant C" });
  step("M3 agent: the blocking list names the empty group (\"Entries in … : add them, or say none apply\")", await shows(imm.getByText(/Entries in "Education history": add them, or say none apply \(Sample Applicant C\): not answered/)));
  await o.getByRole("tab", { name: /^Sample Applicant C(?!'s )/ }).click();
  await edu.getByRole("button", { name: "None apply" }).click();
  step("M3 agent pass (P-72): the officer's \"none apply\" waits for Confirm section", await shows(edu.getByText("None apply", { exact: true })) && await shows(edu.getByText("Entered by staff · to confirm", { exact: true })));
  // QA-417: the answer's own pill (above), never any "to confirm" text: the section pill and the "Nothing to confirm"
  // words beside a section's disabled button match that too, before the page has the officer's answer.
  await edu.getByRole("button", { name: /Confirm section/ }).click(); await idle(o);
  step("M3 agent pass: Confirm section confirms it", await shows(edu.getByText("Confirmed", { exact: true })));
  await state(o, "case-view-group-none-apply", [1440]);
  // C4.4 part 2 (P-47 tier 2): the visit still ends before it starts, and a fired section check keeps IMM 5257 from being
  // ready to file, in its words; the officer puts the dates in order (saving was never blocked, P-71).
  {
    const av = (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, "user-O")).body;
    const fl = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, "user-O")).body.forms.find((f) => f.form === "IMM 5257" && f.person === "Sample Applicant C");
    step("C4.4 tier 2 fail: while the visit ends before it starts, IMM 5257 lists that check under what blocks filing", fl.readiness.ready === false && fl.readiness.missing.some((m) => m.reason === "a check fired" && /ends before it starts/.test(m.label)), fl.readiness.missing.filter((m) => m.reason === "a check fired"));
    for (const [fact, value] of [["case.intended_stay_from", "2027-03-01"], ["case.intended_stay_to", "2027-03-15"]]) { const q = qOf(av, "The application", fact); await call("PUT", `/runtime/cases/${caseId}/answers/${q.subjectId}/${fact}`, { value, expectedId: q.answer?.id ?? null }, "user-O"); }
    const after = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, "user-O")).body.forms.find((f) => f.form === "IMM 5257" && f.person === "Sample Applicant C");
    step("C4.4 tier 2 pass: with the dates in order, no fired check blocks IMM 5257", !after.readiness.missing.some((m) => m.reason === "a check fired"), after.readiness.missing.filter((m) => m.reason === "a check fired"));
  }
  // Confirm every required fact IMM 5257 reads for the principal (Sample values by type), as the officer would.
  const sample = (q) => q.options?.length ? q.options[0].key : q.shape.phone ? { country_code: "1", number: "5550100" } : q.value_type === "yes_no" ? false
    : q.value_type === "date" ? (q.shape.datePrecision === "month" ? "1990-01" : "1990-01-01") : q.value_type === "number" ? "1000"
    : q.value_type === "address" ? { street_name: "Sample Road", city: "Sample City", country: "Canada" } : /email/.test(q.fact) ? "client.a@example.com" : "SAMPLE";
  for (let pass = 0; pass < 3; pass++) {
    const av = (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, "user-O")).body;
    // The other empty required groups IMM 5257 reads: "none apply" (the visit's entries are kept: it has rows).
    const fl = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, "user-O")).body.forms.find((f) => f.form === "IMM 5257" && f.person === "Sample Applicant C");
    // QA-318: "every fact confirmed" includes a mandatory form field's own Yes/No question (other names, national ID, US card),
    // which readiness names as the field's "needs an answer: answer "<question>"" (the card counts it as a fact to answer).
    const asks = new Set(fl.readiness.missing.filter((m) => m.reason === "left empty on the form").map((m) => /^needs an answer: answer "(.+?)" and confirm/.exec(m.why ?? "")?.[1]).filter(Boolean));
    const todo = av.sections.flatMap((x) => x.questions).filter((q) => (q.required || asks.has(q.label)) && !q.hidden && !q.group && q.fills.some((f) => f.form === "IMM 5257" && f.person === "Sample Applicant C") && !q.answer?.confirmed);
    const groups = fl.readiness.missing.filter((m) => m.fact.startsWith("group:")).map((m) => av.sections.find((x) => x.section === m.fact.slice(6) && x.group && (x.about_label === m.about))).filter(Boolean);
    if (!todo.length && !groups.length) break;
    for (const q of todo) await call("PUT", `/runtime/cases/${caseId}/answers/${q.subjectId}/${q.fact}`, { value: sample(q), expectedId: q.answer?.id ?? null }, "user-O");
    for (const g of groups) await call("PUT", `/runtime/cases/${caseId}/groups/${g.subjectId}/${g.section}/none-apply`, { noneApply: true, expectedId: g.group.none_apply?.id ?? null }, "user-O");
    // P-244 (B140): a background answer the officer recorded waits for the client; the client re-confirms it (as on their questionnaire, "This is right") before the officer confirms the section.
    for (const s of (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, "user-O")).body.sections) for (const q of s.questions) for (const a of [q.answer, ...q.rows.map((r) => r.answer)]) if (a?.awaits_client) await call("POST", `/runtime/cases/${caseId}/answers/${a.id}/reconfirm`, {}, "user-P");
    const fresh = (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, "user-O")).body;
    for (const sec of fresh.sections.filter((x) => todo.some((q) => q.subjectId === x.subjectId) || groups.some((g) => g.subjectId === x.subjectId))) {
      const seen = [...sec.questions.flatMap((q) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]), sec.group?.none_apply?.id].filter(Boolean);
      if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${sec.section}/confirm`, { subjectId: sec.subjectId, seen }, "user-O");
    }
  }
  await o.reload(); await idle(o);
  // Break M2 (C-9): IMM 5257 is a barcode form filed as a PDF upload: with every fact confirmed it says "Validate before
  // filing", never "Ready to file", until a validated copy of the current copy is read back.
  step("P-71 pass / C-9 fail-guard (break M2): with every required fact confirmed, IMM 5257 says \"Validate before filing\" (not \"Ready to file\") and the earlier copy is out of date", await shows(imm.getByText("Validate before filing")) && await gone(imm.getByText("Ready to file")) && await shows(imm.getByText("Out of date")));
  await imm.getByRole("button", { name: "Generate a new copy" }).click();
  await shows(imm.getByText("Generated", { exact: true }));
  // The officer validates the new copy in Adobe and reads it back (simulated: the form's own Validate result written in; values unchanged).
  const fl5257 = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, "user-O")).body.forms.find((f) => f.form === "IMM 5257" && f.person === "Sample Applicant C");
  const newCopy = fl5257.copies[0].id;
  const bytes = Buffer.from(await (await fetch(`${BASE}/api/runtime/form-copies/${newCopy}/file`, { headers: { "x-actor": "user-O" } })).arrayBuffer());
  // QA-165: the form's own Validate result written into the copy (tools/simulate_validate.py), never bytes appended.
  const vdir = require("node:fs").mkdtempSync(require("node:path").join(require("node:os").tmpdir(), "xr-validate-"));
  require("node:fs").writeFileSync(require("node:path").join(vdir, "copy.pdf"), bytes);
  const py = require("node:path").join(__dirname, "..", "..", "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
  const sv = require("node:child_process").spawnSync(py, ["-I", require("node:path").join(__dirname, "..", "..", "tools", "simulate_validate.py"), require("node:path").join(vdir, "copy.pdf"), require("node:path").join(vdir, "validated.pdf"), "Yes"], { encoding: "utf8", timeout: 120000 });
  if (sv.status !== 0) throw new Error(`simulate_validate.py failed: ${(sv.stderr || sv.stdout).slice(-300)}`);
  const validatedBytes = require("node:fs").readFileSync(require("node:path").join(vdir, "validated.pdf")); require("node:fs").rmSync(vdir, { recursive: true, force: true });
  const fd = new FormData(); fd.append("file", new Blob([validatedBytes]), "imm5257-validated.pdf");
  const vr = await fetch(`${BASE}/api/runtime/form-copies/${newCopy}/validated`, { method: "POST", headers: { "x-actor": "user-O" }, body: fd });
  await o.reload(); await idle(o);
  // QA-229 (B2): the form row says "Facts confirmed"; "Ready to file" is the filing's, said only by the readiness panel.
  step("C-9 pass (break M2): once the validated copy is read back, IMM 5257 says \"Facts confirmed\" (never \"Ready to file\" on a form row, QA-229)", vr.status === 201 && await shows(imm.getByText("Facts confirmed")) && await gone(imm.getByText("Ready to file")) && await gone(imm.getByText("Validate before filing")), vr.status);
  const focused = (l) => l.evaluate((el) => el === document.activeElement).catch(() => false);
  const lockBtn = imm.getByRole("group", { name: "Lock this copy" }).getByRole("button", { name: "Lock", exact: true });
  await imm.getByRole("button", { name: "Filed" }).click();
  step("review M5 pass: asking to lock moves the keyboard focus to the Lock confirmation", await shows(lockBtn) && await eventually(() => focused(lockBtn)));
  await imm.getByRole("group", { name: "Lock this copy" }).getByRole("button", { name: "Cancel" }).click();
  step("break m2 pass: Cancel gives the focus back to the button pressed", await gone(lockBtn) && await eventually(() => focused(imm.getByRole("button", { name: "Filed" }))));
  await imm.getByRole("button", { name: "Filed" }).click();
  await state(o, "forms-lock-confirm", [1440]);
  await lockBtn.click();
  step("forms RT-16 pass: locking asks first, then shows the copy as Filed", await shows(imm.getByText("Filed", { exact: true })) && await gone(imm.getByRole("button", { name: "Filed" })));
  step("review M5 pass: after locking, the focus is on the form's heading, not lost to the page", await eventually(() => focused(imm.getByRole("heading", { name: /IMM 5257 for Sample Applicant C/ }))));
  await o.getByRole("tab", { name: /^The application/ }).click();
  await visitSec.getByRole("button", { name: /^Edit When will the visit end/ }).click();
  const endEdit2 = o.getByRole("dialog").getByRole("group", { name: /visit end/ });
  await endEdit2.getByLabel("Day").fill("30"); await endEdit2.getByLabel("Month").fill("7");
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await gone(o.getByRole("dialog"));
  await visitSec.getByRole("button", { name: /Confirm section/ }).click(); await idle(o);
  step("forms RT-15 pass: after the visit end changes, the filed copy is stale, names the fact and keeps its file", await shows(imm.getByText(/Stale · Filed/)) && await shows(imm.getByText(/Facts changed after this copy was locked; the locked file is kept as it was\. Added, changed or removed: When will the visit end\?/)));
  await state(o, "forms-stale", [1440, 1024]);
  await imm.getByRole("button", { name: "Generate a new copy" }).click();
  step("forms RT-15 pass: a new copy is made only when asked; the filed copy stays in view beside it", await shows(imm.getByText("Generated", { exact: true }).first()) && await shows(imm.getByText(/Stale · Filed/)));

  // Budgets (STANDARDS §9): first view < 1 s; an in-page change (a person's tab) < 200 ms
  // Lead, 30 Oct (main CI, 791 / 2126 ms): one sample measured the machine as much as the app. On a quieter Mac these
  // views take 70–280 ms with ~30 ms API calls; the misses came at load averages of 10–13 (the CI runner and other lanes'
  // suites on this Mac). So each view is shown once untimed (warm-up), then timed three times; the budget is unchanged
  // and applies to the best of the three, since other work on the machine only ever adds time. All three are reported.
  // #113 held (1 Nov): a reset ends only when the page has settled. The tab triggers animate their border for 150 ms
  // (transition-all), and Playwright's click waits for its target to stop moving: timed straight after "back to the
  // application", the person's tab measured ~270 ms (on main's code too) while the app drew it in ~30 ms. The tab is
  // also timed inside the page (pointer down to the heading); the two must agree, so the measure times the app.
  const settled = (p) => p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), undefined, { timeout: WAIT });
  const best = async (p, view, reset) => { await reset(); await view(); const all = []; for (let i = 0; i < 3; i++) { await reset(); await settled(p); const t = Date.now(); await view(); all.push(Date.now() - t); } return { ms: Math.min(...all), all }; };
  const caseView = (p) => async () => { await p.goto(`${BASE}/cases/${caseId}`); await p.getByRole("heading", { name: "Application details" }).waitFor(); };
  const inPage = [];
  const personTab = (p) => async () => {
    await p.evaluate(() => { window.__tab0 = null; addEventListener("pointerdown", () => { window.__tab0 = performance.now(); }, { capture: true, once: true }); });
    await p.getByRole("tab", { name: /^Sample Applicant C(?!'s )/ }).click(); await p.getByRole("heading", { name: "Travel and identity documents" }).waitFor();
    inPage.push(await p.evaluate(() => (window.__tab0 === null ? null : Math.round(performance.now() - window.__tab0))));
  };
  const backToApplication = (p) => async () => { await p.getByRole("tab", { name: /^The application/ }).click(); await p.getByRole("heading", { name: "Application details" }).waitFor(); };
  const clientPart = (p) => async () => { await p.goto(`${BASE}/cases/${caseId}/questionnaire?part=3`); await p.getByText(/^Part 3 of \d+/).waitFor(); };
  const none = async () => {};
  const agent = await best(o, caseView(o), none), tab = await best(o, personTab(o), backToApplication(o)), part = await best(c, clientPart(c), none);
  // The warm-up is inPage[0]; the timed clicks are inPage[1..3], in the order of tab.all.
  const gaps = tab.all.map((ms, i) => (inPage[i + 1] === null || inPage[i + 1] === undefined ? Infinity : ms - inPage[i + 1]));
  if (!process.env.R1C_SLOW) { const s = speed(`budget measure: the timed person's tab agrees with the page's own time (pointer down to heading ${inPage.slice(1).join("/")} ms), so it times the app and not a wait before the click`, Math.min(...gaps) < 100, { timed: tab.all, in_page: inPage.slice(1) }); step(s.label, s.ok, s.detail); }
  const [agentMs, tabMs, partMs] = [agent.ms, tab.ms, part.ms];
  if (!process.env.R1C_SLOW) { const s = speed(`budget: first view of the case page (best of 3 after a warm-up: ${agentMs} ms) and of a client part (${partMs} ms) under 1 s; a person's tab (${tabMs} ms) under 200 ms`, agentMs < 1000 && partMs < 1000 && tabMs < 200, { agent: agent.all, part: part.all, tab: tab.all }); step(s.label, s.ok, s.detail); }
  // The measure still catches a slow app: the same views with every API answer held 1.1 s are over the budget.
  if (!process.env.R1C_SLOW) {
    const s = await open("user-P", 390, 844);
    await s.route("**/api/**", async (r) => { await new Promise((ok) => setTimeout(ok, 1100)); await r.continue(); });
    const slow = await best(s, clientPart(s), none);
    step(`budget fail: a client part whose answers take 1.1 s measures over 1 s (best of 3: ${slow.ms} ms), so the best-of-3 never hides real slowness`, slow.ms >= 1000, slow.all);
    await s.context().close();
  }

  // PR 10 review (2): the case list reaches every case, a page at a time ("Load more" through the API's cursor)
  const vvId = (await call("GET", `/runtime/cases/${caseId}`, undefined, "user-O")).body.combination_id;
  for (let i = 0; i < 51; i++) await call("POST", "/runtime/cases", { combinationId: vvId, reference: `R1C-PAGE-${run}-${String(i).padStart(2, "0")}`, clientActor: "user-P", principal: { displayName: "Sample Paged Applicant" } }, "user-O");
  await o.goto(`${BASE}/cases`); await idle(o);
  step("case list fail-guard (PR 10 review): the first page shows 50 cases and offers Load more", await shows(o.getByText("50 cases shown")) && await shows(o.getByRole("button", { name: "Load more" })));
  await o.getByRole("button", { name: "Load more" }).click();
  step("case list pass: Load more appends the next page and keeps the first; the oldest case is reachable", await gone(o.getByText("50 cases shown")) && await shows(o.getByRole("link", { name: new RegExp(`^C-\\d{4}-\\d{5,} R1C-${run}$`) })) && await shows(o.getByRole("link", { name: `R1C-PAGE-${run}-50` })));

  step("no page errors in either browser", errors.length === 0, errors.slice(0, 3));
  fs.writeFileSync(path.join(SHOTS, "axe.json"), JSON.stringify(axeLog, null, 1));
  { // QA-165 part 2 (review M-2 on #592): the principal's employment is settled as "none apply"; IMM 5257 still requires
    // its first row, so those lines say so and the way out, never "not answered yet".
    const fl = await call("GET", `/runtime/cases/${caseId}/forms`, undefined, "user-O");
    const imm5257 = (fl.body?.forms ?? []).find((x) => x.form === "IMM 5257" && /Sample Applicant C/.test(x.person));
    const jobs = (imm5257?.fields_open ?? []).filter((o) => /occupation|employer|job/i.test(o.label));
    step("QA-165 part 2 fail (review M-2 on #592): after a confirmed \"none apply\" for employment, its required row fields say so and the way out, never \"not answered yet\"", jobs.length > 0 && jobs.every((o) => o.reason === "fill it in Adobe" && /"none apply" is answered for "Employment and activity history"/.test(o.why)), jobs.map((o) => `${o.label}: ${o.reason}`));
    step("QA-165 part 2 pass (review M-1 on #592): a line a question fills is named by the case's question, never \"Date of birth\" on another field", !(imm5257?.fields_open ?? []).some((o) => /Date of birth \(form field: (Country|Status)/.test(o.label)), (imm5257?.fields_open ?? []).map((o) => o.label));
  }
  await browser.close();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`\n${results.filter((r) => r.pass).length}/${results.length + 1} passed`); process.exit(1); });
