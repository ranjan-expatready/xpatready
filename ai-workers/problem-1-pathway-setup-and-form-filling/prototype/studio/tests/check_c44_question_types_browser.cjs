// C4.4 part 1 in a real browser (runtime lane, swarm B3b; P-47): the one renderer asks the new question types (long text,
// multi choice, person name group with "no given name", period history with its gaps in plain words, declaration with
// its full text) to the client on a phone (390 px, one part per screen) and to the officer in the Agent view (1440 and
// 1024 px), on the Visitor visa case of setup_c44_types.ts. A pass and a fail per rule; the data is checked underneath
// through the API; axe-core (WCAG 2.2 A/AA) on every state; no sideways scroll. No AI (US$0).
// Screenshots: product/screens/W1-questions-and-documents/screenshots/c44-question-types/.
// The suite prepares its own copy (tests/runtime/prepare_c44.cjs: the Visitor visa release, then the C4.4 Sample types).
//   zsh studio/tools/isolated.sh runtime_c44b 4437 start && node studio/tests/check_c44_question_types_browser.cjs 4437 xr_studio_runtime_c44b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;

const PORT = process.argv[2] ?? "4437", DB = process.argv[3] ?? "xr_studio_runtime_c44b", BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "../../../product/screens/W1-questions-and-documents/screenshots/c44-question-types");
const OFFICER = "user-O", CLIENT = "user-P";
const F = { long: "person.c44_sample_visit_story", multi: "person.c44_sample_purposes", name: "person.c44_sample_name_at_birth", history: "person.c44_sample_activity_history", decl: "person.c44_sample_declaration" };
const GAP_CHECK = "The history leaves months out of the 10 years before the application date. Add what you did in each gap.";
const results = [];
const step = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || detail === undefined ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 300)}`}`); };
const call = async (method, url, body, actor) => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j }; };

(async () => {
  try { require("./runtime/prepare_c44.cjs").prepareC44(PORT, DB); } catch (e) { step("setup: the copy is prepared (Visitor visa released, C4.4 Sample types added)", false, String(e)); console.log(`\n0/1 passed`); process.exit(1); }
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const f of fs.readdirSync(SHOTS)) if (f.endsWith(".png")) fs.unlinkSync(path.join(SHOTS, f));
  const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const combinationId = sql("select id from combination where combination_key = 'vv.single'");
  const opened = await call("POST", "/runtime/cases", { combinationId, reference: `C44B-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  const caseId = opened.body?.id ?? opened.body?.case?.id;
  const people = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people ?? [];
  const P = people.find((p) => p.role === "principal")?.subject_id, CASE = people.find((p) => p.role === "case")?.subject_id;
  step("setup: a Visitor visa case with the new question types", !!caseId && !!P && !!CASE, { combinationId, status: opened.status, body: opened.body });
  if (!caseId) process.exit(2);
  await call("PUT", `/runtime/cases/${caseId}/answers/${CASE}/case.application_date`, { value: "2026-11-01", expectedId: null }, OFFICER);
  const sqrView = (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, CLIENT)).body;
  const part = (sqrView?.sections ?? []).findIndex((s) => s.subjectId === P && (s.questions ?? []).some((q) => q.fact === F.history)) + 1;
  step("setup: the principal's \"Personal details\" part holds the new types", part > 0, (sqrView?.sections ?? []).map((s) => s.section));
  const answer = async (fact) => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []).flatMap((s) => s.questions ?? []).find((q) => q.fact === fact && q.subjectId === P)?.answer;

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  const open = async (actor, width, height) => {
    const ctx = await browser.newContext({ viewport: { width, height } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("c44-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("c44-init", "1"); } } catch { /* ignore */ } }, actor);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(String(e)));
    p.on("console", (m) => { if (m.type() === "error" && !/status of (400|403|409|422)/.test(m.text())) errors.push(m.text()); });
    return p;
  };
  const WAIT = 10000;
  const shows = (loc) => loc.waitFor({ state: "visible", timeout: WAIT }).then(() => true, () => false);
  const eventually = async (fn) => { const end = Date.now() + WAIT; for (;;) { try { if (await fn()) return true; } catch { /* not there yet */ } if (Date.now() > end) return false; await new Promise((ok) => setTimeout(ok, 100)); } };
  const idle = async (p) => { await p.waitForLoadState("networkidle").catch(() => {}); };
  let n = 0;
  const state = async (p, name, widths) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForFunction(() => !document.querySelector("button[aria-busy]"), undefined, { timeout: WAIT });
    const own = p.viewportSize();
    for (const w of widths) {
      if (w !== p.viewportSize().width) await p.setViewportSize({ width: w, height: w < 500 ? 844 : 900 });
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: true });
      step(`${w} px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    }
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    if (p.viewportSize().width !== own.width) await p.setViewportSize(own);
  };

  try {
    // ── The client, on a phone ──
    const c = await open(CLIENT, 390, 844);
    // Guard (red main, Mac run 41365074483): the history's save is held back 1.5 s, as on a slower machine, so a step that
    // reads the data before the page's save has landed fails here every time, not at random.
    await c.route(`**/api/runtime/cases/*/answers/*/${F.history}`, async (r) => { if (r.request().method() === "PUT") await new Promise((ok) => setTimeout(ok, 1500)); await r.continue(); });
    await c.goto(`${BASE}/cases/${caseId}/questionnaire`); await idle(c);
    await c.getByRole("button", { name: /^Personal details/ }).first().click(); await idle(c);
    const long = c.getByLabel("Tell us about the visit (Sample)");
    step("client: long text is a text area under its label", await shows(long) && (await long.evaluate((e) => e.tagName)) === "TEXTAREA");
    const multi = c.getByRole("group", { name: "What will you do on the visit? (Sample)" });
    step("client: multi choice is a group of check boxes, \"Choose all that apply\"", await shows(multi) && (await multi.getByRole("checkbox").count()) === 3 && await shows(multi.getByText("Choose all that apply")));
    const name = c.getByRole("group", { name: "Name at birth (Sample)" });
    step("client: the person name group asks family name and given names, with \"No given name\"", await shows(name.getByLabel("Family name")) && await shows(name.getByLabel("Given names")) && await shows(name.getByLabel(/No given name/)));
    const hist = c.getByRole("group", { name: "What have you done in the last 10 years? (Sample)" });
    step("client: the period history says what it needs (10 years, no gaps) and offers \"Add a period\"", await shows(hist.getByText(/The last 10 years, with no gaps/)) && await shows(hist.getByRole("button", { name: "Add a period" })));
    const decl = c.getByRole("group", { name: "Declaration (Sample)" });
    step("client: the declaration shows its full text and one check box to make it", await shows(decl.getByText(/I declare that the information I have given is truthful/)) && await shows(decl.getByLabel("I declare that this is true and complete")));
    await state(c, "client-new-types-empty", [390]);

    await long.fill("We will visit family in Toronto for two weeks and see Niagara Falls (Sample).");
    await multi.getByLabel("Tourism").check(); await multi.getByLabel("Visit family").check();
    await name.getByLabel("Family name").fill("Sampled"); await name.getByLabel("Given names").fill("Client");
    await name.getByLabel(/No given name/).check();
    step("client pass: ticking \"No given name\" empties and disables the given names", await name.getByLabel("Given names").isDisabled() && (await name.getByLabel("Given names").inputValue()) === "");
    // A history with a gap (Feb 2019 to May 2020) and, first, a period that ends before it starts (the fail).
    await hist.getByRole("button", { name: "Add a period" }).click();
    const row1 = hist.getByRole("listitem", { name: "Period 1" });
    await row1.getByLabel("From: month").fill("6"); await row1.getByLabel("From: year").fill("2014");
    await row1.getByLabel("To: month").fill("1"); await row1.getByLabel("To: year").fill("2013");
    await row1.getByLabel("What you did").fill("Sample work");
    await decl.getByLabel("I declare that this is true and complete").check();
    await c.getByRole("button", { name: "Save and continue" }).click(); await idle(c);
    step("client fail (tier 1): a period ending before it starts is named under the history, in words", await shows(c.getByText("Period 1: the end is before the start; check both months.").first()));
    await state(c, "client-history-end-before-start", [390]);
    step("P-71: the invalid history is still saved, flagged", ((await answer(F.history))?.problems ?? []).some((p) => /end is before the start/.test(p)), await answer(F.history));
    await row1.getByLabel("To: year").fill("2019");
    await hist.getByRole("button", { name: "Add a period" }).click();
    const row2 = hist.getByRole("listitem", { name: "Period 2" });
    await row2.getByLabel("From: month").fill("6"); await row2.getByLabel("From: year").fill("2020");
    await row2.getByLabel("What you did").fill("Sample study");
    step("client: the gaps are shown in plain words as the person types (Feb 2019 to May 2020)", await shows(hist.getByText(/Gaps in the 10 years to today: Feb 2019 to May 2020 is not covered/)));
    await state(c, "client-history-gap-words", [390, 1024]);
    // The data is read only once the page's save of the history has answered: networkidle is already reached on this
    // page, so idle() alone returns at once and the read below raced the save (red main, Mac run 41365074483).
    const histSaved = c.waitForResponse((r) => r.request().method() === "PUT" && r.url().endsWith(`/${F.history}`), { timeout: WAIT });
    await c.getByRole("button", { name: "Save and continue" }).click();
    step("client: the history's save answers (200)", (await histSaved.then((r) => r.status(), () => 0)) === 200);
    await idle(c);

    const [aLong, aMulti, aName, aHist, aDecl] = await Promise.all([F.long, F.multi, F.name, F.history, F.decl].map(answer));
    step("data: the answers are stored as answered (text, the chosen keys, the name's parts, the periods, the declaration)", /Niagara/.test(aLong?.value ?? "") && JSON.stringify(aMulti?.value) === JSON.stringify(["tourism", "family"]) && aName?.value?.no_given_name === true && aName?.value?.given_names === "" && aName?.value?.family_name === "Sampled" && Array.isArray(aHist?.value) && aHist.value.length === 2 && aHist.value[1].to === "" && aDecl?.value === true, { aMulti: aMulti?.value, aName: aName?.value, aHist: aHist?.value, aDecl: aDecl?.value });
    step("data: every new answer checks clean at tier 1", [aLong, aMulti, aName, aHist, aDecl].every((a) => (a?.problems ?? []).length === 0), [aLong, aMulti, aName, aHist, aDecl].map((a) => a?.problems));

    // ── The officer, in the Agent view ──
    const o = await open(OFFICER, 1440, 900);
    await o.goto(`${BASE}/cases/${caseId}`); await idle(o);
    await o.getByRole("tab", { name: /^Sample Applicant A(?!'s )/ }).click();
    const sec = o.locator("section").filter({ has: o.getByRole("heading", { name: "Personal details" }) }).first();
    step("officer: the answers read as a person writes them (labels, the name, the periods)", await shows(sec.getByText("Tourism, Visit family")) && await shows(sec.getByText("Sampled (no given name)")) && await shows(sec.getByText(/Jun 2014 to Jan 2019: Sample work; Jun 2020 to today: Sample study/)) && await shows(sec.getByText("Declared", { exact: true })));
    step("officer (review M1): the declaration reads \"Declared\" with no Edit: only the client makes it", await shows(sec.getByText("Only the client makes this declaration")) && (await sec.getByRole("button", { name: /^(Edit|Add) Declaration/ }).count()) === 0);
    // C4.4 part 2: the fired check is also listed (collapsed) under the forms' "Facts to answer or confirm", earlier on the page, so look in the sections.
    step("officer (tier 2): the 10-year history check fires on the gap, held as data", await shows(o.locator("section[id^='s-']").getByText(GAP_CHECK).first()));
    await state(o, "officer-new-types-and-gap-check", [1440, 1024]);
    await sec.getByRole("button", { name: /^Edit What have you done in the last 10 years/ }).click();
    const dlg = o.getByRole("dialog");
    step("officer: the history opens in the same renderer, with both periods", await shows(dlg.getByRole("listitem", { name: "Period 2" })));
    await dlg.getByRole("listitem", { name: "Period 1" }).getByLabel("To: month").fill("5"); await dlg.getByRole("listitem", { name: "Period 1" }).getByLabel("To: year").fill("2020");
    step("officer pass: with the gap filled, no gap words remain", await eventually(async () => (await dlg.getByText(/Gaps in the 10 years/).count()) === 0));
    await state(o, "officer-edit-history", [1440]);
    await dlg.getByRole("button", { name: "Save" }).click(); await idle(o);
    step("officer fail-guard (tier 2): with the gap filled, the 10-year check no longer fires", await eventually(async () => (await o.getByText(GAP_CHECK).count()) === 0));
    step("no page errors", errors.length === 0, errors.slice(0, 3));
  } finally { await browser.close(); }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
