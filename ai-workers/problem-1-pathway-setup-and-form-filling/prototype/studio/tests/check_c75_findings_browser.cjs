// C7.5 part 1 (M3-E; r5c BR-19, board frame 13; stand-in SI-6): the Review panel on the case page walked in a real
// browser, keyboard only, on a Visitor visa family case (four people): two rules findings (the spouse's and the older
// child's passports expire before the visit ends), Acknowledge… (an empty reason refused on the field, then saved with
// who and when), Dismiss…, Add finding (a CRITICAL by hand: the case officer gets no button on it), Waive… by the
// representative of record, the spouse's passport corrected → its finding Resolved by the rules, Show all. Screenshots at
// 1440 and 1024 in product/screens/C7.5/screenshots/, axe (WCAG 2.2 AA) on each state, no sideways scroll. When the copy
// has no Visitor visa release it sets one up (setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts). US$0.
//   zsh studio/tools/isolated.sh runtime_c75b 4436 start && node studio/tests/check_c75_findings_browser.cjs 4436 xr_studio_runtime_c75b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync, spawnSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_c75b";
const BASE = `http://localhost:${PORT}`, STUDIO = path.resolve(__dirname, "..");
const SHOTS = path.join(STUDIO, "..", "..", "product", "screens", "C7.5", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const ago = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };

(async () => {
  const tsx = (f) => spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, f), String(PORT), DB], { encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
  const releases = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'");
  if (releases() === "0") tsx("tests/runtime/setup_visitor_visa.ts");
  if (releases() === "1") { tsx("acceptance/lib/setup_vv_m3.ts"); step("setup: the Visitor visa released twice (pack 4 setup)", releases() === "2", releases()); }
  const vv = sql("select id from combination where combination_key='vv.single'"), spend0 = sql("select count(*) from ai_batch");
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
    await p.locator("[data-findings]").scrollIntoViewIfNeeded();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).include("[data-findings]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name}: the Review panel has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.locator("[data-findings]").scrollIntoViewIfNeeded();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };
  const as = (who) => p.evaluate((w) => { try { localStorage.setItem("xr-actor", w); } catch { /* ignore */ } }, who);
  /** Keyboard only: Tab until the focused element's text matches (fails loudly when never reached). */
  const tabTo = async (re, max = 400) => {
    for (let i = 0; i < max; i++) { await p.keyboard.press("Tab"); const t = await p.evaluate(() => ((document.activeElement?.textContent ?? "") + " " + (document.activeElement?.getAttribute("aria-label") ?? "")).trim()); if (re.test(t)) return true; }
    throw new Error(`never reached ${re} by Tab (focus on: ${await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 160))})`);
  };
  /** Focus the Review panel's first control, so the Tab walk starts there rather than at the top of a long page. */
  const intoPanel = () => p.evaluate(() => { const s = document.querySelector("[data-findings]"); s.setAttribute("tabindex", "-1"); s.focus(); });
  const panel = () => p.locator("[data-findings]").innerText();
  /** A row's own button, picked by the row's text (never "the first row"), pressed from the keyboard. */
  const press = async (rowText, name) => { const b = p.locator("[data-finding]").filter({ hasText: rowText }).getByRole("button", { name, exact: true }); await b.focus(); await p.keyboard.press("Enter"); };
  /** The open dialog's own button, pressed from the keyboard (a toast's "Dismiss" is never taken for it). */
  const submit = async (name) => { await p.getByRole("dialog").getByRole("button", { name, exact: true }).focus(); await p.keyboard.press("Enter"); };
  const counts = () => p.locator("[data-findings-counts]").innerText();
  const until = async (fn, what, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await p.waitForTimeout(250); } throw new Error(`timed out waiting for ${what} (the panel's counts now: ${await p.locator("[data-findings-counts]").innerText({ timeout: 2000 }).catch(() => "not shown")})`); };

  try {
    // A Visitor visa family: Client A, a spouse, children of 10 and 15.
    const c = (await api("/runtime/cases", { method: "POST", data: { combinationId: vv, reference: `C75B-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Client A" }, representative: "user-R", caseOfficers: ["user-O"] } })).body;
    const sub = { A: c.people.find((x) => x.role === "principal").subject_id, case: c.people.find((x) => x.role === "case").subject_id };
    sub.S = (await api(`/runtime/cases/${c.id}/people`, { method: "POST", data: { role: "spouse_or_partner", displayName: "Sample Spouse A" } })).body.subject_id;
    sub.K1 = (await api(`/runtime/cases/${c.id}/people`, { method: "POST", data: { role: "child", displayName: "Sample Child A1" } })).body.subject_id;
    sub.K2 = (await api(`/runtime/cases/${c.id}/people`, { method: "POST", data: { role: "child", displayName: "Sample Child A2" } })).body.subject_id;
    const put = async (who, f, value) => { const v = (await api(`/runtime/cases/${c.id}/questionnaire?mode=agent`)).body; const q = v.sections.flatMap((s) => s.questions).find((x) => x.subjectId === who && x.fact === f); return api(`/runtime/cases/${c.id}/answers/${who}/${f}`, { method: "PUT", data: { value, expectedId: q?.answer?.id ?? null } }); };
    for (const [w, y] of [["A", 40], ["S", 38], ["K1", 10], ["K2", 15]]) await put(sub[w], "person.date_of_birth", ago(y));
    await put(sub.case, "case.intended_stay_from", "2030-03-01"); await put(sub.case, "case.intended_stay_to", "2030-04-15");
    await put(sub.A, "person.passport_expiry_date", "2035-06-30"); await put(sub.S, "person.passport_expiry_date", "2030-04-01"); await put(sub.K2, "person.passport_expiry_date", "2030-03-20");

    await as("user-O"); await p.goto(`${BASE}/cases/${c.id}`); await settle();
    await until(async () => (await p.locator("[data-finding]").count()) === 2, "two findings listed");
    let t = await panel();
    step("C7.5 the Review panel lists the two passport findings in words, with person, form and fact", /Sample Spouse A's passport expires on Apr 1, 2030, before the visit ends on Apr 15, 2030\./.test(t) && /Sample Child A2's passport expires on Mar 20, 2030/.test(t) && /IMM 5257 · Expiry date of the passport/.test(t), t.slice(0, 300));
    step("C7.5 reviewer M3: findings grouped per person, in the case's order, each group headed by the person", JSON.stringify(await p.locator("[data-findings-person]").evaluateAll((els) => els.map((e) => e.getAttribute("data-findings-person")))) === JSON.stringify(["Sample Spouse A", "Sample Child A2"]) && (await p.locator('[data-findings-person="Sample Spouse A"] h3').innerText()).startsWith("Sample Spouse A"));
    step("C7.5 the panel carries the SI-6 Stand-in chip and says findings never stop Ready to file", (await p.locator('[data-findings] [data-stand-in="SI-6"]').count()) === 1 && /never stop Ready to file/.test(t));
    step("C7.5 rows in a stable order: same severity, the case's order of people (the spouse before the older child)", /Sample Spouse A/.test(await p.locator("[data-finding]").first().innerText()) && /Sample Child A2/.test(await p.locator("[data-finding]").nth(1).innerText()));
    step("C7.5 counts: 2 open", /^2 open · 0 acknowledged · 0 resolved/.test(await counts()), await counts());
    await state("two-open");

    // Breaker m6: Escape closes the dialog and gives focus back to the button that opened it.
    await intoPanel(); await tabTo(/^Acknowledge…$/); // the spouse's row comes first (checked above)
    await p.keyboard.press("Enter");
    await p.getByRole("dialog").waitFor(); await p.keyboard.press("Escape"); await p.getByRole("dialog").waitFor({ state: "detached" }); await p.waitForTimeout(200);
    step("C7.5 Escape closes the reason dialog and focus is back on Acknowledge…", (await p.evaluate(() => document.activeElement?.textContent?.trim())) === "Acknowledge…", await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
    // Acknowledge… by keyboard: an empty reason is refused on the field, then saved.
    await p.keyboard.press("Enter");
    await p.getByRole("dialog").waitFor();
    step("C7.5 the Acknowledge dialog opens with focus in the reason", await p.evaluate(() => document.activeElement?.tagName === "TEXTAREA"));
    await submit("Acknowledge");
    await until(async () => /at least 3 characters/.test(await p.getByRole("dialog").innerText()), "the reason refused on the field");
    step("C7.5 fail: an empty reason is refused on the field, the dialog stays open", true);
    await state("acknowledge-needs-reason");
    await p.getByRole("dialog").locator("textarea").focus(); await p.keyboard.type("Renewal booked before travel (Sample)");
    await submit("Acknowledge");
    await until(async () => /1 acknowledged/.test(await counts()), "1 acknowledged");
    t = await panel();
    step("C7.5 acknowledged with who, when and the reason on the row", /Acknowledged by Case officer on .*“Renewal booked before travel \(Sample\)”/.test(t), t.slice(0, 400));

    // Dismiss… the child's finding by keyboard.
    await press("Sample Child A2", "Dismiss…");
    await p.getByRole("dialog").waitFor(); await p.keyboard.type("Travels later on a renewed passport (Sample)");
    await submit("Dismiss");
    await until(async () => /1 dismissed/.test(await counts()), "1 dismissed");
    step("C7.5 the dismissed finding leaves the list (Open and Acknowledged shown) and the counts say so", (await p.locator("[data-finding]").count()) === 1 && /0 open · 1 acknowledged · 0 resolved · 1 dismissed/.test(await counts()), await counts());

    // Add finding: a CRITICAL by hand.
    await intoPanel(); await tabTo(/^Add finding$/); await p.keyboard.press("Enter");
    const d = p.getByRole("dialog"); await d.waitFor();
    await d.getByLabel("About").selectOption({ label: "Sample Child A1" }); await d.getByLabel("Severity").selectOption("CRITICAL");
    await d.getByLabel("Finding").fill("Consent letter from the other parent is missing (Sample)"); await d.getByLabel("Form (optional)").fill("IMM 5257");
    await d.getByRole("button", { name: "Add finding" }).click();
    await until(async () => /1 open/.test(await counts()), "the hand-added finding open");
    t = await panel();
    const first = p.locator("[data-finding]").filter({ hasText: "Consent letter" });
    step("C7.5 the hand-added CRITICAL is listed under Sample Child A1, Added by hand", /^CRITICAL\s*\n?\s*Added by hand/m.test(await first.innerText()) && (await p.locator('[data-findings-person="Sample Child A1"] [data-finding]').count()) === 1, (await first.innerText()).slice(0, 200));
    // Breaker M3, m7: a CRITICAL finding is passed only by the representative's waive; the case officer has no button for it.
    step("C7.5 fail: the case officer gets no Acknowledge, Dismiss or Waive on a CRITICAL finding, only who waives it", (await first.getByRole("button").count()) === 0 && /Only the representative of record waives it/.test(await first.innerText()), await first.innerText());
    await state("critical-added");

    // Waive…: done by the representative of record.
    await as("user-R"); await p.reload(); await settle();
    await until(async () => (await p.locator("[data-finding]").count()) >= 1, "the findings listed for the representative");
    await press("Consent letter", "Waive…");
    await p.getByRole("dialog").locator("textarea").fill("Letter arrives by courier (Sample)");
    await p.getByRole("dialog").getByRole("button", { name: "Waive" }).click();
    await until(async () => /1 waived/.test(await counts()), "1 waived");
    step("C7.5 the representative of record waives the CRITICAL finding", /0 open · 1 acknowledged · 0 resolved · 1 waived · 1 dismissed/.test(await counts()), await counts());

    // The spouse's passport corrected → the acknowledged finding is resolved by the rules on the next read.
    await as("user-O"); const fixed = await put(sub.S, "person.passport_expiry_date", "2034-04-01");
    step("setup: the spouse's passport date corrected (200)", fixed.status === 200, `${fixed.status} ${JSON.stringify(fixed.body).slice(0, 160)}`);
    await p.reload(); await settle();
    await until(async () => /1 resolved/.test(await counts()), "1 resolved");
    await intoPanel(); await tabTo(/^Show all 3$/); await p.keyboard.press("Enter");
    await until(async () => (await p.locator("[data-finding]").count()) === 3, "all three findings shown");
    t = await panel();
    step("C7.5 the fixed fact resolved its finding by itself; who acknowledged it, when and why stay on the row (breaker M1)", /Acknowledged by Case officer on [^\n]*“Renewal booked before travel \(Sample\)”\s*\n\s*Resolved by the rules on [^\n]*: the facts it quoted changed/.test(t), t.slice(0, 700));
    step("C7.5 Show all lists waived, resolved and dismissed with their reasons", /Waived by Representative/.test(t) && /Dismissed by Case officer/.test(t));
    await state("show-all");

    // A client sees no Review panel (the case page is staff only).
    await as("user-P"); await p.goto(`${BASE}/cases/${c.id}`); await p.waitForTimeout(800);
    step("C7.5 fail: a client sees no Review panel", (await p.locator("[data-findings]").count()) === 0);
    step("C7.5 no page error and no console error", errs.length === 0, errs.join(" | "));
    step("C7.5 no model call (US$0)", sql("select count(*) from ai_batch") === spend0);
  } catch (e) { step(`C7.5 the walk ran to its end (stopped: ${e.message})`, false); }
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`); process.exitCode = fail ? 1 : 0;
})();
