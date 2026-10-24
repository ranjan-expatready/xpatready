// R1c renderer journey (runtime lane, plan §8 "questionnaire part of the journey") in a real browser, on the runtime
// copy after setup_visitor_visa.ts: the officer opens a case and adds the family (1440 and 1024 px) → the client answers
// on a phone (390 px): one part per screen, "answering for", field checks with an error summary, a repeating group,
// leave and resume → the officer reviews in the agent view, edits with the message naming the forms, confirms a section,
// meets a conflict. axe-core (WCAG 2.2 A/AA) on every state; data checked underneath through the API. No paid AI.
// Screenshots: product/screens/R1-thin-slice/screenshots/r1c/.
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1 && node studio/tests/runtime/check_runtime_r1c.cjs 4430
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4430", BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "../../../../product/screens/R1-thin-slice/screenshots/r1c");
const run = Date.now().toString(36).slice(-5);
const results = []; const axeLog = [];
const step = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || detail === undefined ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); };
const call = async (method, url, body, actor) => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null }; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const open = async (actor, width, height) => {
    const ctx = await browser.newContext({ viewport: { width, height } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("r1c-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("r1c-init", "1"); } } catch { /* ignore */ } }, actor);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(String(e)));
    p.on("console", (m) => { if (m.type() === "error" && !/status of (400|403|409|422)/.test(m.text())) errors.push(m.text()); });
    return p;
  };
  let n = 0;
  /** Screenshot at each width (the first is the page's own) and axe on it; no sideways scroll at any width. */
  const state = async (p, name, widths) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    const own = p.viewportSize();
    for (const w of widths) {
      if (w !== p.viewportSize().width) { await p.setViewportSize({ width: w, height: w < 500 ? 844 : 900 }); await p.waitForTimeout(200); }
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: true });
      const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      step(`${w} px: ${name} has no sideways scroll`, !over);
    }
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    axeLog.push({ state: base, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(" "), help: v.help })) });
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    if (p.viewportSize().width !== own.width) await p.setViewportSize(own);
  };
  const idle = async (p) => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(150); };
  /** Save and continue, then wait until saving is over (the button is enabled again or the part changed). */
  const saveAndContinue = async (p) => { await p.getByRole("button", { name: "Save and continue" }).click(); await p.waitForTimeout(100); await p.waitForFunction(() => !document.querySelector("button[aria-busy]"), undefined, { timeout: 15000 }); await idle(p); };

  // ── 1. The officer opens a case and adds the family (desktop)
  const o = await open("user-O", 1440, 900);
  await o.goto(`${BASE}/cases`); await idle(o);
  step("officer: the case list opens with one primary action", await o.getByRole("button", { name: "Open a case" }).isVisible());
  await o.getByRole("button", { name: "Open a case" }).click();
  await o.getByRole("button", { name: "Open case" }).click(); await idle(o);
  step("officer fail: opening a case without reference and name shows both errors on their fields", await o.getByText("Give the case a reference of at least 3 characters.", { exact: true }).isVisible() && await o.getByText("Give the principal applicant a display name.", { exact: true }).isVisible());
  await o.getByLabel("Case reference").fill(`R1C-${run}`);
  await o.getByLabel("Principal applicant's name").fill("Sample Applicant C");
  await o.getByRole("button", { name: "Open case" }).click(); await idle(o);
  await o.waitForURL(/\/cases\/[0-9a-f-]{36}$/);
  const caseId = o.url().split("/").pop();
  step("officer pass: the case opens on the released visitor visa, pinned to its release", await o.getByRole("heading", { level: 1, name: new RegExp(`R1C-${run}`) }).isVisible() && await o.getByText(/^Release \d+$/).isVisible());
  await o.getByRole("button", { name: "Add spouse or partner" }).click(); await o.getByLabel("Name", { exact: true }).fill("Sample Spouse C"); await o.getByRole("button", { name: "Add", exact: true }).click(); await idle(o);
  await o.getByRole("button", { name: "Add child" }).click(); await o.getByLabel("Name", { exact: true }).fill("Sample Child C"); await o.getByRole("button", { name: "Add", exact: true }).click(); await idle(o);
  await o.getByRole("button", { name: "Add spouse or partner" }).click(); await o.getByLabel("Name", { exact: true }).fill("Sample Spouse D"); await o.getByRole("button", { name: "Add", exact: true }).click(); await idle(o);
  step("officer fail: a second spouse is refused with the release's limit, in the dialog", await o.getByText(/at most 1 spouse/i).first().isVisible());
  await o.getByRole("button", { name: "Cancel" }).click();
  step("officer pass: spouse and child are on the case and get their own tabs of sections", await o.getByRole("tab").count() === 4 && await o.locator("section", { hasText: "People on this case" }).getByText("Sample Child C").isVisible());
  await state(o, "officer-case-new", [1440, 1024]);

  // ── 2. The client answers on a phone
  const c = await open("user-P", 390, 844);
  await c.goto(`${BASE}/cases/${caseId}/questionnaire`); await idle(c);
  step("client: the overview says what to do and how saving works", await c.getByRole("heading", { name: "Your questionnaire" }).isVisible() && await c.getByText(/0 of \d+ parts done/).isVisible());
  await state(c, "client-overview", [390]);
  await c.getByRole("button", { name: /^Start/ }).click(); await idle(c);
  step("client: part 1 is about the application, answered once", await c.getByText("Answered once for the whole application.").isVisible() && await c.getByText(/^Part 1 of \d+/).isVisible());
  await c.getByRole("group", { name: /visitor visa or a transit visa/ }).getByLabel("VisitorVisa").check();
  const lang = c.getByRole("group", { name: /Official language/ });
  await lang.getByRole("radio").first().check();
  await state(c, "client-part-radio", [390]);
  await saveAndContinue(c);
  step("client pass: Save and continue saves and moves to the next part", await c.getByText(/^Part 2 of \d+/).isVisible());
  // Your visit: dates, money, a select, a repeating group; a bad amount shows the summary and keeps the other answers
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
  step("client fail: an impossible date and cents on a whole-dollar amount stay on the part with a summary linking to each field", await summary.isVisible() && await summary.getByRole("link", { name: /visit end.*real date/i }).isVisible() && await summary.getByRole("link", { name: /money.*whole dollars/i }).isVisible());
  step("client: the summary takes the focus (keyboard and screen reader)", await c.evaluate(() => document.activeElement?.textContent?.startsWith("There is a problem") ?? false));
  await state(c, "client-error-summary", [390]);
  await summary.getByRole("link", { name: /money/i }).click();
  step("client: a summary link moves the focus to its field", await c.evaluate(() => document.activeElement?.getAttribute("inputmode") === "numeric"));
  let v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  const qOf = (view, subjectLabel, fact) => view.sections.filter((s) => s.about_label === subjectLabel).flatMap((s) => s.questions).find((q) => q.fact === fact);
  step("data: validation never blocks saving (P-47): the invalid date and amount are stored and flagged, the start date is stored clean", qOf(v, "The application", "case.intended_stay_to")?.answer?.value === "2027-02-31" && qOf(v, "The application", "case.funds_available_cad")?.answer?.problems.length === 1 && qOf(v, "The application", "case.intended_stay_from")?.answer?.problems.length === 0);
  await end.getByLabel("Day").fill("28"); await c.getByLabel(/How much money/).fill("5000");
  await c.getByRole("button", { name: "Add an entry" }).click(); await idle(c);
  const entry = c.getByRole("region", { name: "Entry 1" });
  await entry.getByLabel("Name of a person or organisation you will visit").fill("Sample Host C");
  await entry.getByLabel("Their relationship to you").fill("Friend");
  const addr = entry.getByRole("group", { name: "Their address in Canada" });
  await addr.getByLabel("Street number").fill("12"); await addr.getByLabel("Street name").fill("Sample Street"); await addr.getByLabel("City or town").fill("Toronto"); await addr.getByLabel("Country").fill("Canada");
  await c.getByRole("button", { name: "Add another" }).click(); await idle(c);
  step("client: a second entry can be added, with its own fields", await c.getByRole("region", { name: "Entry 2" }).isVisible() && await entry.getByLabel("Their relationship to you").inputValue() === "Friend");
  await c.getByRole("region", { name: "Entry 2" }).getByRole("button", { name: "Remove" }).click();
  await state(c, "client-group-remove-confirm", [390]);
  await c.getByRole("region", { name: "Entry 2" }).getByRole("button", { name: "Remove", exact: true }).last().click(); await idle(c);
  step("client: removing an entry asks first, then removes it (history kept)", await c.getByRole("region", { name: "Entry 2" }).count() === 0 && await c.getByText("Entry removed. Its answers are kept in the case history.").isVisible());
  await saveAndContinue(c);
  step("client pass: the fixed part saves and moves on", await c.getByText(/^Part 3 of \d+/).isVisible(), await c.getByRole("alert").allTextContents());
  v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  const host = qOf(v, "The application", "case.visit_contact_address_in_canada");
  step("data: the repeating group holds one live entry with its address in parts; the fixed values are stored clean", host?.rows.length === 1 && host.rows[0].answer?.value?.city === "Toronto" && qOf(v, "The application", "case.funds_available_cad")?.answer?.value === "5000" && qOf(v, "The application", "case.intended_stay_to")?.answer?.problems.length === 0);
  // Answering for the spouse (P-78 words come from the server after saving)
  await c.getByRole("button", { name: "Back", exact: true }).click(); await c.getByRole("button", { name: "Back", exact: true }).click(); await c.getByRole("button", { name: "Back", exact: true }).click(); await idle(c);
  await c.getByRole("region", { name: "About Sample Spouse C" }).getByRole("button", { name: /Personal details/ }).click(); await idle(c);
  step("client: a family member's part says whom the client is answering for", await c.getByText("Answering for").locator("..").textContent().then((t) => /Answering for Sample Spouse C \(spouse or partner\)/.test(t ?? "")));
  await c.getByLabel("Current marital status").selectOption({ label: "Married" });
  await saveAndContinue(c);
  await c.getByRole("button", { name: "Back", exact: true }).click(); await idle(c);
  step("client: after saving, the part says the adult's answers wait for that adult or the officer (P-78)", await c.getByText(/Answered by the principal for an adult/).isVisible());
  await state(c, "client-answering-for-spouse", [390, 1440]);
  // Leave and resume
  await c.getByRole("button", { name: "Save and come back later" }).click(); await idle(c);
  await c.reload(); await idle(c);
  step("client: after leaving and coming back, the overview counts what is done and offers to continue", await c.getByRole("button", { name: /Continue where you left off/ }).isVisible() && await c.getByText(/[1-9]\d* of \d+ parts done/).isVisible());
  await state(c, "client-resume", [390]);
  // Roles in the browser
  await c.goto(`${BASE}/cases`); await idle(c);
  step("roles fail: the client cannot see the case list", await c.getByText("Cases are for the case officer").isVisible());
  await c.goto(`${BASE}/cases/${caseId}`); await idle(c);
  step("roles fail: the client cannot open the officer's case page", await c.getByText("This page is for the case officer").isVisible());

  // ── 3. The officer reviews in the agent view
  await o.reload(); await idle(o);
  await o.getByRole("tab", { name: /^Sample Spouse C/ }).click(); 
  const spouseMarital = o.locator("section", { has: o.getByRole("heading", { name: "Personal details" }) }).filter({ hasText: "for Sample Spouse C" });
  step("agent: the client's answer shows with its source and the P-78 state", await spouseMarital.getByText("Married", { exact: true }).isVisible() && await spouseMarital.getByText("Answered by the principal").isVisible() && await spouseMarital.getByText(/questionnaire · Client A/).isVisible());
  await o.getByRole("tab", { name: /^The application/ }).click(); 
  const visitSec = o.locator("section").filter({ has: o.getByRole("heading", { name: "Your visit" }) });
  await visitSec.getByRole("button", { name: /Confirm section/ }).click(); await idle(o);
  step("agent pass: Confirm section confirms the visit's answers (Confirmed, history kept)", await o.getByText(/Your visit for The application: \d+ answers? confirmed/).isVisible() && await visitSec.getByText("Confirmed", { exact: true }).first().isVisible());
  await state(o, "agent-view-confirmed", [1440, 1024]);
  await o.locator("section").filter({ has: o.getByRole("heading", { name: "Application details" }) }).getByRole("button", { name: /^Edit Are you applying/ }).click();
  await o.getByRole("dialog").getByLabel("Transit").check();
  await state(o, "agent-edit-dialog", [1440]);
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await idle(o);
  step("agent pass: an edit saves with a message naming every form it fills (P-45)", await o.getByText(/Saved\. It fills IMM 5257 for Sample Applicant C/).isVisible());
  // Conflict: the client changes the amount while the officer's dialog is open
  await visitSec.getByRole("button", { name: /^Edit How much money/ }).click();
  await o.getByRole("dialog").getByLabel(/How much money/).fill("7000");
  v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  await call("PUT", `/runtime/cases/${caseId}/answers/${qOf(v, "The application", "case.funds_available_cad").subjectId}/case.funds_available_cad`, { value: "6000", expectedId: qOf(v, "The application", "case.funds_available_cad").answer.id }, "user-P");
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await idle(o);
  step("agent fail: a stale edit is refused (409) in the dialog and says what happened; nothing is overwritten", await o.getByRole("dialog").getByText(/Someone changed this answer after you opened it/).isVisible() && (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, "user-O")).body.sections.flatMap((s) => s.questions).find((q) => q.fact === "case.funds_available_cad").answer.value === "6000");
  await state(o, "agent-conflict", [1440]);
  await o.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  // Officer-only fact: the passport number, typed from the document
  await o.getByRole("tab", { name: /^Sample Applicant C/ }).click(); 
  const travel = o.locator("section").filter({ has: o.getByRole("heading", { name: "Travel and identity documents" }) }).filter({ hasText: "for Sample Applicant C" });
  await travel.getByRole("button", { name: /^Add Number of the passport/ }).first().click();
  await o.getByRole("dialog").getByRole("textbox").fill("SAMPLE-C-123");
  await o.getByRole("dialog").getByRole("button", { name: "Save" }).click(); await idle(o);
  step("agent pass: the officer enters a fact the client is not asked; it waits for Confirm section", await travel.getByText("SAMPLE-C-123").isVisible() && await travel.getByText("To confirm").first().isVisible());
  v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-P")).body;
  step("roles fail: the client's questionnaire never shows the officer-only passport number", !v.sections.flatMap((s) => s.questions).some((q) => q.fact === "person.passport_number"));

  // Budgets (STANDARDS §9): first view < 1 s; an in-page change (a person's tab) < 200 ms
  let t = Date.now(); await o.goto(`${BASE}/cases/${caseId}`); await o.getByRole("heading", { name: "Application details" }).waitFor(); const agentMs = Date.now() - t;
  t = Date.now(); await o.getByRole("tab", { name: /^Sample Applicant C/ }).click(); await o.getByRole("heading", { name: "Travel and identity documents" }).waitFor(); const tabMs = Date.now() - t;
  t = Date.now(); await c.goto(`${BASE}/cases/${caseId}/questionnaire?part=3`); await c.getByText(/^Part 3 of \d+/).waitFor(); const partMs = Date.now() - t;
  step(`budget: first view of the case page (${agentMs} ms) and of a client part (${partMs} ms) under 1 s; a person's tab (${tabMs} ms) under 200 ms`, agentMs < 1000 && partMs < 1000 && tabMs < 200, { agentMs, partMs, tabMs });

  step("no page errors in either browser", errors.length === 0, errors.slice(0, 3));
  fs.writeFileSync(path.join(SHOTS, "axe.json"), JSON.stringify(axeLog, null, 1));
  await browser.close();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`\n${results.filter((r) => r.pass).length}/${results.length + 1} passed`); process.exit(1); });
