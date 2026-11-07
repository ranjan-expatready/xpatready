// C6.9 part 3 (M3-D, concept screens/C6.9/concept.md §4–§5, BR-15, BR-16; stand-in SI-1): the staff page "Case check from confirmed
// facts" (P-236, B148) walked in a real browser, keyboard only: the card on the case page, the empty state, Run case check, the people listbox
// (↑↓), out of date after a fact changes, Run again (a reason is required), Override (the rules' result stays visible),
// Mark reviewed ("Seen by" for the case officer), History. A client sees no page. Screenshots at 1440 and 1024 in
// screens/C6.9/screenshots/, axe (WCAG 2.2 AA) on each state, 200 % zoom (640 px) without sideways scroll. When the copy
// has no Visitor visa release with gates it sets one up (setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts). US$0.
//   zsh studio/tools/isolated.sh runtime_c69p 4435 start && node studio/tests/check_c69_page_browser.cjs 4435 xr_studio_runtime_c69p
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync, spawnSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_c69p";
const BASE = `http://localhost:${PORT}`, STUDIO = path.resolve(__dirname, "..");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "C6.9", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const gated = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single' and r.snapshot ? 'eligibility'");
  if (gated() === "0") {
    const tsx = (f) => spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, f), String(PORT), DB], { encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
    if (sql("select count(*) from combination where combination_key='vv.single'") === "0") tsx("tests/runtime/setup_visitor_visa.ts");
    tsx("acceptance/lib/setup_vv_m3.ts");
    step("setup: the Visitor visa release carries eligibility gates", gated() !== "0", gated());
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-O", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };
  const as = (who) => p.evaluate((w) => { try { localStorage.setItem("xr-actor", w); } catch { /* ignore */ } }, who);
  /** Keyboard only: Tab until the focused element's text matches, then it is focused (fails loudly when never reached). */
  const tabTo = async (re, max = 80) => {
    for (let i = 0; i < max; i++) { await p.keyboard.press("Tab"); const t = await p.evaluate(() => ((document.activeElement?.textContent ?? "") + " " + (document.activeElement?.getAttribute("aria-label") ?? "")).trim()); if (re.test(t)) return true; }
    throw new Error(`never reached ${re} by Tab (focus on: ${await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 160))})`);
  };
  const text = () => p.locator("main").innerText();
  const focusIs = () => p.evaluate(() => { const e = document.activeElement; return e?.id === "result" ? "#result" : (e?.textContent ?? "").trim(); });

  // A case with two travellers and one person not travelling.
  const ref = `C69P-${Date.now().toString(36)}`;
  const c = (await api("/runtime/cases", { method: "POST", data: { combinationId: vv, reference: ref, clientActor: "user-P", principal: { displayName: "Sample Client A" }, representative: "user-R", caseOfficers: ["user-O"] } })).body;
  const A = c.people.find((x) => x.role === "principal").subject_id;
  const S = (await api(`/runtime/cases/${c.id}/people`, { method: "POST", data: { role: "spouse_or_partner", displayName: "Sample Spouse A" } })).body.subject_id;
  const put = async (who, f, value) => { const v = (await api(`/runtime/cases/${c.id}/questionnaire?mode=agent`)).body; const q = v.sections.flatMap((s) => s.questions).find((x) => x.subjectId === who && x.fact === f); return api(`/runtime/cases/${c.id}/answers/${who}/${f}`, { method: "PUT", data: { value, expectedId: q?.answer?.id ?? null } }); };

  await p.goto(BASE); await as("user-O");
  await p.goto(`${BASE}/cases/${c.id}`); await settle();
  const card = p.locator("section[aria-labelledby=eligibility]");
  await card.locator("li").first().waitFor({ timeout: 15000 }); // the card reads its own list after the case page
  step("C6.9 page pass: the case page shows the card \"Case check from confirmed facts (staff only)\" with one line per traveller and the SI-1 chip", (await card.count()) === 1 && /Case check from confirmed facts \(staff only\)/.test(await card.innerText()) && /Sample Client A[\s\S]*Not run[\s\S]*Sample Spouse A/.test(await card.innerText()) && (await card.locator('[data-stand-in="SI-1"]').count()) === 1);
  await tabTo(/^Open case check/); await p.keyboard.press("Enter"); await settle();
  step("C6.9 page pass: Open case check (keyboard) opens /cases/:id/eligibility with the trail Cases › reference › Case check from confirmed facts", p.url().endsWith(`/cases/${c.id}/eligibility`) && /Cases\s*›\s*C69P-[\s\S]*›\s*Case check from confirmed facts/.test(await p.locator("nav[aria-label=Path]").innerText()));
  step("C6.9 page pass: empty state in words: \"No case check yet … nothing is sent anywhere\"", /No case check yet for Sample Client A\. It reads the answers on file against this application's rules; nothing is sent anywhere\./.test(await text()));
  await state("empty");

  await tabTo(/Run case check/); await p.keyboard.press("Enter"); await settle();
  step("C6.9 page pass (review M1, WCAG 2.4.3): after Run case check, focus is on the result's heading (the button became Run again)", await focusIs() === "#result", await focusIs());
  step("C6.9 page pass: Run case check gives \"Can't tell yet — needs 3 facts\", each rule Not answered with the facts it reads", /Can't tell yet — needs 3 facts/.test(await text()) && (await p.getByText("Not answered", { exact: true }).count()) === 2 && /Passport number: not answered/.test(await text()));
  step("C6.9 page pass: the officer's judgement lines, the disclaimer and \"Run by Case officer\" are shown", /Officer's judgement, not checked by rules[\s\S]*Has enough money for the stay/.test(await text()) && /Disclaimer\s*Indicative only/.test(await text()) && /Run by Case officer/.test(await text()));
  await state("cant-tell-yet");

  // The people listbox: ↑↓ moves between travellers.
  await p.locator("[role=option][aria-selected=true]").focus(); await p.keyboard.press("ArrowDown"); await settle();
  step("C6.9 page pass: ↓ in the people list selects the next traveller (Sample Spouse A, not run yet)", (await p.locator("[role=option][aria-selected=true]").innerText()).startsWith("Sample Spouse A") && /No case check yet for Sample Spouse A/.test(await text()));
  await p.keyboard.press("ArrowUp"); await settle();

  // Facts answered after the check: out of date.
  await put(A, "person.passport_number", "SAMPLEP12"); await put(A, "person.passport_expiry_date", new Date(Date.now() + 3 * 365 * 864e5).toISOString().slice(0, 10)); await put(A, "person.criminal_history", true);
  await p.reload(); await settle();
  step("C6.9 page pass: after the facts change the result says Out of date, naming the change, and stays readable", /Out of date: Passport number changed from not answered to SAMPLEP12/.test(await text()) && /^Can't tell yet — /.test(await p.locator("[data-outcome]").innerText()));
  await state("out-of-date");

  await tabTo(/^Run again$/); await p.keyboard.press("Enter"); await p.waitForSelector("[role=dialog]");
  await p.keyboard.press("Enter"); await p.waitForTimeout(600);
  step("C6.9 page fail: Run again without a reason is refused on the field, in words", /Give a reason for running again, such as 'Passport renewed'\./.test(await p.locator("[role=dialog]").innerText()));
  await state("run-again-reason");
  await p.keyboard.type("Facts added (Sample)"); await p.keyboard.press("Enter"); await p.waitForSelector("[role=dialog]", { state: "detached" }); await settle();
  step("C6.9 page pass (review M1): after Run again, focus is back on \"Run again\"", await focusIs() === "Run again", await focusIs());
  step("C6.9 page pass (P-230 (1)): Run again with a reason: the background rule is Not met and goes to the representative's review: Can't tell yet, never Does not qualify", /Can't tell yet — the representative reviews this/.test(await text()) && /For the representative's review, a rule not met: Answered no to the criminal history question \(Sample\)\./.test(await text()) && /The representative reviews this: never “Does not qualify” on its own/.test(await text()) && !/Does not qualify on this application's rules/.test(await text()) && !/Out of date:/.test(await text()));
  step("C6.9 page pass (BR-9): answered but not confirmed values count and are marked \"(not confirmed yet)\"", /Passport number: SAMPLEP12 \(not confirmed yet\)/.test(await text()));
  await state("needs-review");

  await tabTo(/^Override result/); await p.keyboard.press("Enter"); await p.waitForSelector("[role=dialog]");
  await p.keyboard.press("Escape"); await p.waitForSelector("[role=dialog]", { state: "detached" }); await p.waitForTimeout(100);
  step("C6.9 page pass (break m3, WCAG 2.4.3): Esc closes the drawer and focus returns to \"Override result…\"", /^Override result/.test(await p.evaluate(() => document.activeElement?.textContent ?? "")));
  await p.keyboard.press("Enter"); await p.waitForSelector("[role=dialog]");
  await tabTo(/^Keep the override$/); await p.keyboard.press("Enter"); await p.waitForTimeout(600);
  step("C6.9 page fail (BR-15): an override without a reason is refused on the field", /Give a reason for the override\./.test(await p.locator("[role=dialog]").innerText()) && sql(`select count(*) from assessment_override o join assessment a on a.id=o.assessment_id where a.case_id='${c.id}'`) === "0");
  await state("override-drawer");
  await p.locator("[role=dialog] input[list=override-labels]").focus(); await p.keyboard.type("Refer to the representative");
  await p.locator("[role=dialog] textarea").focus(); await p.keyboard.type("Earlier refusal answered in full (Sample)");
  await tabTo(/^Keep the override$/); await p.keyboard.press("Enter"); await p.waitForSelector("[role=dialog]", { state: "detached" }); await settle();
  step("C6.9 page pass (review M1): after Keep the override, focus is back on \"Override result…\"", /^Override result/.test(await focusIs()), await focusIs());
  step("C6.9 page pass (BR-15): the override sits beside the result; the rules' own result stays visible", /Officer's override: Refer to the representative — Earlier refusal answered in full \(Sample\)/.test(await text()) && /Can't tell yet — the representative reviews this/.test(await text()) && sql(`select count(*) from assessment_override o join assessment a on a.id=o.assessment_id where a.case_id='${c.id}'`) === "1");

  await tabTo(/^Mark reviewed/); await p.keyboard.press("Enter"); await p.waitForSelector("[role=dialog]");
  // The preview names the person as the firm's record does; that record arrives just after the drawer opens.
  await p.waitForFunction(() => /"Seen by Case officer \(Sample\)"/.test(document.querySelector("[role=dialog]")?.textContent ?? ""), null, { timeout: 10000 });
  step("C6.9 page pass (P-229 (2)): the drawer previews the stamp \"Seen by Case officer (Sample)\" (no licence, the firm's record)", /"Seen by Case officer \(Sample\)"/.test(await p.locator("[role=dialog]").innerText()));
  await state("review-drawer");
  await tabTo(/^Mark reviewed$/); await p.keyboard.press("Enter"); await p.waitForSelector("[role=dialog]", { state: "detached" }); await settle();
  step("C6.9 page pass (review M1): after Mark reviewed (now off), focus is on the result's heading", await focusIs() === "#result", await focusIs());
  step("C6.9 page pass (BR-16): marked: \"Seen by Case officer\" on the result; Mark reviewed is then off", /Seen by Case officer/.test(await text()) && await p.getByRole("button", { name: /^Mark reviewed/ }).isDisabled());
  const latest = (await api(`/runtime/cases/${c.id}/assessments?person=${A}`)).body.assessments[0];
  const again = await api(`/runtime/assessments/${latest.id}/review`, { method: "POST", data: {}, actor: "user-R" });
  step("C6.9 page fail (BR-16): a second review is refused 409, naming who and when", again.status === 409 && /Already seen by Case officer/.test(again.body?.detail ?? ""), again.body?.detail);
  await state("reviewed");

  await tabTo(/^History/); await p.keyboard.press("Enter"); await p.waitForSelector("[role=dialog]");
  const hist = await p.locator("[role=dialog]").innerText();
  step("C6.9 page pass: History lists both runs newest first, with Overridden and Seen on the latest", /History for Sample Client A/.test(hist) && (await p.locator("[role=dialog] li").count()) === 2 && /Can't tell yet[\s\S]*Overridden[\s\S]*Seen[\s\S]*Can't tell yet/.test(hist));
  await state("history");
  await p.keyboard.press("Escape");

  // 200 % zoom: a 1280 px window at 200 % is 640 CSS px wide.
  await p.setViewportSize({ width: 640, height: 900 }); await settle();
  step("200 % zoom (640 px): no sideways page scroll; the result is still read", !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) && /^Can't tell yet — /.test(await p.locator("[data-outcome]").innerText()));
  await p.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-zoom-200.png`), fullPage: true });
  await p.setViewportSize({ width: 1440, height: 900 });

  // A client sees no page and no verdict.
  await as("user-P"); await p.goto(`${BASE}/cases/${c.id}/eligibility`); await settle();
  step("C6.9 page fail (BR-7): a client opening the page sees no verdict, only \"This page is for the firm's staff\"", /This page is for the firm's staff/.test(await text()) && !/eligible|qualif|can't tell/i.test((await text()).replace(/Case checks are seen by the firm's staff only\./, "")));
  step("C6.9 page: no page error and no console error during the journey", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check ran to its end — ${e.message}`); process.exit(1); });
