// qa lane, golden journey 2 (2 Nov 2026): the eight steps of golden journey 1, walked in a browser as a person would, Saved only
// (US$0, no STUDIO_*_LIVE, no paid AI run). Steps 1-2 run on copy A (this port and db); because step 2 is refused on a copy reset to
// the six (QA-163), steps 3-8 run on a second copy B (port+1, db "<db>b") that this script starts, sets up with
// tests/runtime/setup_visitor_visa.ts + acceptance/lib/setup_vv_m3.ts (golden 1's workaround), and stops at the end.
// Where the screens do not reach (the client's later parts, the people's dates of birth, the XFA read-back) the API or Python
// reader is used and said so in the output. Screenshots: product/qa/reports/2026-11-02-golden-2/ (stepN-<what>-1440.png and -400.png).
//   zsh tools/isolated.sh qa_gj2 4475 start && node tests/qa/check_qa_golden_2.cjs 4475 xr_studio_qa_gj2
// Environment: QA_STEPS=3,4 runs only those steps (3-8 reuse a running copy B when QA_KEEP_B=1); QA_HEADED=1 shows the browser.
// Prints PASS/FAIL per step and a total; INFO lines carry the evidence. Needs the repo's .tools python venv for steps 5-7.
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { execFileSync, spawnSync } = require("node:child_process");
/** The app's own playwright first (a Mac has its browsers); else the one the machine offers outside the app (a cloud copy: NODE_PATH or /opt/node-tools). */
const launch = async () => {
  const opts = { headless: !process.env.QA_HEADED };
  for (const from of [null, ...(process.env.NODE_PATH ?? "").split(path.delimiter).filter(Boolean), "/opt/node-tools/node_modules"]) {
    try { const pw = from ? require(require.resolve("playwright", { paths: [from] })) : require("playwright"); return await pw.chromium.launch(opts); } catch { /* try the next */ }
  }
  throw new Error("no playwright with a browser found");
};
const PORT = Number(process.argv[2] ?? 4475), DB = process.argv[3] ?? "xr_studio_qa_gj2";
const PORT_B = PORT + 1, DB_B = `${DB}b`, NAME_B = DB_B.replace(/^xr_studio_/, "");
const A = `http://localhost:${PORT}`, B = `http://localhost:${PORT_B}`;
const S = path.resolve(__dirname, "..", ".."), ROOT = path.resolve(S, "..", "..", "..", "..");
const SHOTS = path.join(ROOT, "ai-workers", "problem-1-pathway-setup-and-form-filling", "product", "qa", "reports", "2026-11-02-golden-2"); fs.mkdirSync(SHOTS, { recursive: true });
const NODEBIN = path.dirname(process.execPath), TSX = path.join(S, "node_modules", ".bin", "tsx");
const PY = path.join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
const WANT = (process.env.QA_STEPS ?? "1,2,3,4,5,6,7,8").split(",").map(Number);
const psql = (db, q) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", db, "-Atc", q], { encoding: "utf8" }).trim();
const sqlA = (q) => psql(DB, q), sqlB = (q) => psql(DB_B, q);
const results = [], notes = [];
const info = (s, d) => { console.log(`INFO  ${s}${d === undefined ? "" : ` — ${typeof d === "string" ? d : JSON.stringify(d)}`}`.slice(0, 1200)); };
const verdict = (n, name, ok, stumble) => { results.push({ n, ok }); console.log(`${ok ? "PASS" : "FAIL"}  step ${n}: ${name}`); if (stumble) for (const s of [].concat(stumble)) console.log(`      stumble: ${s}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => s.replace(/\s+/g, " ").trim();

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const posts = []; // every non-GET answer the app gives the page: method, path, status, body
  p.on("response", async (r) => { const q = r.request(); if (r.url().includes("/api/") && q.method() !== "GET") posts.push({ m: q.method(), u: r.url().replace(/^.*\/api/, ""), s: r.status(), b: (await r.text().catch(() => "")).slice(0, 600), t: Date.now() }); });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const as = async (base, actor) => { await p.goto(base); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
  const sideways = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const wide = {};
  /** One state of the screen at 1440 and at 400 px, with the sideways-scroll check at 400. */
  const shot = async (name, opts = {}) => {
    await p.setViewportSize({ width: 1440, height: 900 }); await sleep(250);
    await p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`), fullPage: opts.full !== false });
    await p.setViewportSize({ width: 400, height: 850 }); await sleep(350);
    const sw = await sideways(); wide[name] = sw;
    await p.screenshot({ path: path.join(SHOTS, `${name}-400.png`), fullPage: opts.full !== false });
    await p.setViewportSize({ width: 1440, height: 900 }); await sleep(200);
    return sw;
  };
  const fail = async (name) => p.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  const call = async (base, method, u, body, actor = "user-O") => { const r = await fetch(`${base}/api${u}`, { method, headers: { "x-actor": actor, ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const toasts = () => p.locator("[aria-live=polite] p").allInnerTexts();

  // ======================================================================= STEP 1 (copy A)
  const VVA = () => sqlA("select id from combination where combination_key='vv.single'");
  if (WANT.includes(1)) {
    await as(A, "user-A"); await p.waitForTimeout(1200);
    await p.getByRole("button", { name: /Demo/ }).click(); await p.getByText("Reset to the six…").click();
    await p.getByLabel("Type RESET to confirm").fill("RESET");
    await shot("step1-reset-to-six-confirm", { full: false });
    const t0 = Date.now(); await p.getByRole("button", { name: /^Reset to the six$/ }).click();
    await p.getByText("Reset to the six: done").waitFor({ timeout: 300000 }); const secs = (Date.now() - t0) / 1000; await p.waitForTimeout(400);
    const dlg = flat(await p.locator("[role=dialog]").innerText());
    await shot("step1-reset-to-six-done", { full: false });
    const combos = Number(sqlA("select count(*) from combination")), props = Number(sqlA("select count(*) from proposal_item where status='waiting'"));
    info("step 1 on screen", { seconds: secs, combinations: combos, proposals_waiting: props, dialog: dlg.slice(0, 260) });
    verdict(1, "Demo > Reset to the six, on screen", combos === 6 && props > 0 && /done/.test(dlg), []);
    // QA-159 underneath: Ready (bulk-acceptable) proposals that do not name a near match. proposal_item.confidence is the band (ready | check);
    // identity.near lists the near matches the product found; payload.label is the key the proposal creates.
    const rows = sqlA(`select payload->>'label', confidence, form_edition, jsonb_array_length(identity->'near') from proposal_item where status='waiting' and kind='field' and payload->>'label' ~ '^person\\.(full_name|full_name_as_on_travel_document|given_names?|email|email_address|citizenship|citizenship_country|occupation|occupation_title)$' order by 1,3`).split("\n").filter(Boolean).map((l) => l.split("|"));
    const ready = rows.filter((r) => r[1] === "ready"), unflagged = ready.filter((r) => r[3] === "0");
    const full = rows.filter((r) => r[0] === "person.full_name_as_on_travel_document");
    const pairs = [["person.given_name", "person.given_names"], ["person.email", "person.email_address"], ["person.citizenship", "person.citizenship_country"], ["person.occupation", "person.occupation_title"]];
    const pairLines = pairs.map(([a, b]) => { const ra = rows.filter((r) => r[0] === a), rb = rows.filter((r) => r[0] === b); const rd = (x) => x.filter((r) => r[1] === "ready").length; return { pair: `${a} / ${b}`, present: [ra.length, rb.length], ready: [rd(ra), rd(rb)], ready_naming_near: [...ra, ...rb].filter((r) => r[1] === "ready" && r[3] !== "0").length }; });
    const bothSides = pairLines.filter((x) => x.present[0] && x.present[1]);
    const stillOpen = bothSides.filter((x) => x.ready.some((n) => n > 0) && x.ready_naming_near === 0);
    const q159 = full.length > 0 && full.every((r) => r[1] !== "ready" || r[3] !== "0") && stillOpen.length === 0;
    info("QA-159 full_name_as_on_travel_document", full.map((r) => ({ band: r[1], form: r[2], near_named: r[3] })));
    info("QA-159 pairs", pairLines);
    info("QA-159 counts", { ready_in_these_names: ready.length, ready_without_a_near_match_named: unflagged.length, pairs_with_both_sides_present: bothSides.length, pairs_still_ready_and_unflagged: stillOpen.length });
    console.log(`${q159 ? "PASS" : "FAIL"}  QA-159 (not one of the eight): near duplicates are never Ready without naming the near one`);
    notes.push({ q159, stillOpen: stillOpen.length, bothSides: bothSides.length, unflagged: unflagged.length });
  }

  // ======================================================================= STEP 2 (copy A, as the author)
  if (WANT.includes(2)) {
    const vv = VVA(); posts.length = 0;
    await as(A, "user-A"); await p.goto(`${A}/c/${vv}/forms`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000);
    const setupLine = flat(await p.locator("main").innerText()).match(/Next step · [^.]*?(?=See it)/)?.[0] ?? "";
    await p.getByRole("button", { name: "Draft with AI" }).first().click(); await p.waitForTimeout(1000);
    const choice = flat(await p.locator("[role=dialog]").innerText());
    await shot("step2-imm5257-draft-dialog", { full: false });
    await p.getByRole("button", { name: /Use Saved/ }).click(); await p.waitForTimeout(1500);
    const r1 = posts.find((x) => /\/attachments\/.*\/draft/.test(x.u));
    const toast1 = (await toasts()).join(" | ");
    await shot("step2-imm5257-use-saved-refused", { full: false }); await fail("02-imm5257-use-saved-refused");
    info("2a IMM 5257 > Draft with AI > Use Saved", { http: r1?.s, words_on_screen: toast1, dialog_offers_saved: /Use Saved/.test(choice) });
    // the setup panel behind the row still says the field map is missing
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    await p.getByRole("button", { name: /Step 2 of 6 · Field map · Your step/ }).first().click().catch(() => {}); await p.waitForTimeout(1200);
    const panel = flat(await p.locator("[role=dialog]").first().innerText().catch(() => ""));
    info("2b the form's own setup panel", panel.match(/2\. AI maps[^]*?(?=3\. Review)/)?.[0] ?? panel.slice(0, 300));
    await shot("step2-imm5257-setup-panel", { full: false });
    await p.keyboard.press("Escape");
    // C4.11
    posts.length = 0;
    await p.goto(`${A}/c/${vv}/questionnaires`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: "Draft questions and documents" }).click(); await p.waitForTimeout(1800);
    const qd = flat(await p.locator("[role=dialog]").innerText());
    const r2 = posts.find((x) => /draft-qd\/plan/.test(x.u));
    await shot("step2-c411-draft-questions", { full: false }); await fail("03-c411-draft-questions");
    info("2c C4.11 Draft questions and documents", { http: r2?.s, words_on_screen: qd.match(/It cannot be drafted yet.*?(?=Cancel)/)?.[0] ?? qd.slice(0, 300), saved_choice_shown: /Saved/.test(qd) });
    await p.keyboard.press("Escape");
    // review and release
    await p.goto(`${A}/c/${vv}/review`).catch(() => {}); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000);
    const rel = flat(await p.locator("main").innerText());
    const releaseBtn = await p.getByRole("button", { name: /Release|Submit for review|Send for review/ }).count();
    info("2d Review and release tab", rel.slice(rel.indexOf("Review and release"), rel.indexOf("Review and release") + 500));
    await shot("step2-review-and-release");
    const released = Number(sqlA("select count(*) from config_release")) > 0;
    verdict(2, "Configure and release Visitor visa with Saved only", released && r1?.s < 300 && r2?.s < 300, [
      `Draft with AI is offered on IMM 5257 and Use Saved answers "${toast1}" (HTTP ${r1?.s}); the form's setup panel then still says "No field map yet: draft it with AI"`,
      `Draft questions and documents opens a dialog that says: "${(qd.match(/It cannot be drafted yet (.*?) Cancel/)?.[1] ?? "").slice(0, 160)}" (HTTP ${r2?.s}); it tells the author to find forms that are already found; there is no Saved choice`,
      `the setup card says: "${setupLine.slice(0, 140)}": no Confirm button for the author`]);
  }

  // ======================================================================= copy B for steps 3-8
  let tsxLine = "";
  const need = WANT.some((n) => n >= 3);
  if (need) {
    if (!process.env.QA_KEEP_B) {
      const pre = { ...process.env, PATH: `${NODEBIN}:${path.join(S, "node_modules", ".bin")}:${process.env.PATH}` };
      info("copy B (workaround of golden 1)", `starting ${NAME_B} on ${PORT_B}`);
      execFileSync("zsh", [path.join(S, "tools", "isolated.sh"), NAME_B, String(PORT_B), "start"], { cwd: S, env: pre, stdio: "pipe" });
      const run = (f) => spawnSync(TSX, ["--tsconfig", "api/tsconfig.json", f, String(PORT_B), DB_B], { cwd: S, env: pre, encoding: "utf8", timeout: 600000 });
      const a = run("tests/runtime/setup_visitor_visa.ts"), b = run("acceptance/lib/setup_vv_m3.ts");
      const sa = (a.stdout.match(/(\d+)\/(\d+) passed/) ?? []).slice(1).join("/"), sb = (b.stdout.match(/(\d+)\/(\d+) passed/) ?? []).slice(1).join("/");
      tsxLine = `setup_visitor_visa ${sa} (expect 13/13), setup_vv_m3 ${sb} (expect 29/31)`; info("setup on copy B", tsxLine);
    }
  }
  let C = null; // the case
  const VVB = () => sqlB("select id from combination where combination_key='vv.single'");
  const agent = async () => (await call(B, "GET", `/runtime/cases/${C.id}/questionnaire?mode=agent`, undefined, "user-O")).body;
  const qs = (v) => (v?.sections ?? []).flatMap((s) => s.questions);
  const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); d.setUTCDate(d.getUTCDate() - 3); return d.toISOString().slice(0, 10); };

  // ======================================================================= STEP 3 (officer opens a family case on screen)
  if (WANT.includes(3) || WANT.some((n) => n >= 4)) {
    await as(B, "user-O"); await p.goto(`${B}/cases`); await p.waitForLoadState("networkidle");
    await p.getByRole("button", { name: "Open a case" }).click(); await p.waitForTimeout(600);
    await p.getByLabel("Your own reference (optional)").fill(`GJ2-${Date.now().toString(36).slice(-4)}`); await p.getByLabel(/Principal applicant/).fill("Sample Client A");
    await shot("step3-open-case-dialog", { full: false });
    await p.getByRole("button", { name: "Open case" }).click(); await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, { timeout: 30000 });
    const caseId = p.url().split("/").pop();
    await p.getByRole("button", { name: /Add spouse or partner/ }).click(); await p.getByLabel("Name").fill("Sample Spouse A"); await p.getByRole("button", { name: "Add", exact: true }).click(); await p.waitForTimeout(1500);
    await p.getByRole("button", { name: /Add child/ }).click(); await p.getByLabel("Name").fill("Sample Child A1"); await p.getByRole("button", { name: "Add", exact: true }).click(); await p.waitForTimeout(1500);
    C = { id: caseId };
    // dates of birth: through the officer's answers API (golden 1 and m3.ts do the same); the child is 10
    const v0 = await agent(); const subj = {};
    for (const s of v0.sections) subj[s.about_label] = s.subjectId;
    for (const [who, yrs] of [["Sample Client A", 40], ["Sample Spouse A", 38], ["Sample Child A1", 10]]) {
      const q = qs(v0).find((x) => x.subjectId === subj[who] && x.fact === "person.date_of_birth");
      const r = await call(B, "PUT", `/runtime/cases/${caseId}/answers/${subj[who]}/person.date_of_birth`, { value: yearsAgo(yrs), expectedId: q?.answer?.id ?? null }, "user-O");
      if (r.status >= 300) info("date of birth refused", { who, status: r.status, body: r.body });
    }
    C.subj = subj; await p.reload(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
    const main = flat(await p.locator("main").innerText());
    const chips = ["Sample Client A", "Sample Spouse A", "Sample Child A1"].filter((n) => main.includes(n));
    const raw = [...new Set(main.match(/\b[a-z]{3,}_[a-z_]+\b/g) ?? [])];
    const childEmp = qs(await agent()).filter((q) => q.subjectId === subj["Sample Child A1"] && /occupation|employ/.test(q.fact) && !q.hidden).length;
    const sw = await shot("step3-officer-case-page");
    info("step 3 case page", { people: chips, raw_keys_on_page: raw.slice(0, 6), questions_about_work_asked_of_the_child_of_10: childEmp, sideways_400: sw });
    verdict(3, "Officer opens a family case (principal, spouse, child of 10) on screen", chips.length === 3 && !!caseId, [
      raw.length ? `raw keys on the case page: ${raw.slice(0, 4).join(", ")}` : null,
      childEmp ? `the child of 10 is asked ${childEmp} work question(s) (QA-152)` : null,
      "adding a person asks only for a name: the date of birth has no field in the Add dialog (set by API here)"].filter(Boolean));
  }

  // ======================================================================= STEP 4 (client answers on the link; officer confirms)
  const sample = (q) => q.options?.length ? q.options[0].key : q.shape?.phone ? { country_code: "91", number: "9876543210" }
    : /^person\.(applying_from_country|country_of_birth|previous_residence_country)$/.test(q.fact) ? "India"
    : q.value_type === "yes_no" ? false : /expiry/.test(q.fact) ? "2035-06-30" : q.value_type === "date" ? (q.shape?.datePrecision === "month" ? "2015-01" : "2015-01-01") : q.value_type === "number" ? "5000"
    : q.value_type === "address" ? { street_name: "Sample Road", city: "Sample City", country: "Canada" } : /email/.test(q.fact) ? "client.a@example.com" : /family_name/.test(q.fact) ? "CLIENTA" : /given_names/.test(q.fact) ? "SAMPLE" : "SAMPLE";
  if (WANT.some((n) => n >= 4)) {
    // 4a. the client types on screen, phone first: Application details, Your visit, Personal details
    await as(B, "user-P"); await p.setViewportSize({ width: 400, height: 850 });
    await p.goto(`${B}/cases/${C.id}/questionnaire`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
    await shot("step4-client-questionnaire", { full: false });
    await p.getByRole("button", { name: "Start", exact: true }).click(); await p.waitForTimeout(800);
    let typed = 0; posts.length = 0;
    const part = async () => (await p.locator("main").innerText()).match(/Part \d+ of \d+ · [^\n]+/)?.[0] ?? "";
    const save = async () => { await p.getByRole("button", { name: "Save and continue" }).click(); await p.waitForTimeout(1500); };
    let where = await part();
    if (/Application details/.test(where)) { await p.locator("main input[type=radio]").nth(0).check({ force: true }); await p.locator("main input[type=radio]").nth(2).check({ force: true }); await shot("step4-client-part1-typed", { full: false }); await save(); typed++; }
    where = await part();
    if (/Your visit/.test(where)) {
      await p.locator("main select").first().selectOption({ label: "Family Visit" });
      const d = p.getByLabel("Day"), m = p.getByLabel("Month"), y = p.getByLabel("Year");
      await d.nth(0).fill("1"); await m.nth(0).fill("3"); await y.nth(0).fill("2030"); await d.nth(1).fill("15"); await m.nth(1).fill("4"); await y.nth(1).fill("2030");
      await p.getByLabel(/How much money/).fill("5000"); await p.getByRole("button", { name: /^None apply/ }).first().click(); await p.waitForTimeout(600);
      await shot("step4-client-part2-typed", { full: false }); await save(); typed++;
    }
    where = await part();
    if (/Personal details/.test(where)) { await p.locator("main select").first().selectOption({ label: "Single" }); await save(); typed++; }
    const next = await part(); const typedAnswers = posts.filter((x) => x.m === "PUT" && x.s < 300).length;
    info("4a typed on screen as the client (400 px)", { parts_saved: typed, answers_saved_by_those_clicks: typedAnswers, now_at: next });
    await p.setViewportSize({ width: 1440, height: 900 });
    // 4b. the rest of the client's answers through the questionnaire API (as golden 1), never confirming; the officer enters the adult spouse's own facts on their behalf (FQ-12)
    let sent = 0, refused = [];
    for (let pass = 0; pass < 4; pass++) {
      const v = await agent();
      for (const q of qs(v).filter((q) => q.required && !q.hidden && !q.group && !q.answer && q.fact !== "person.date_of_birth")) {
        const spouse = q.subjectId === C.subj["Sample Spouse A"], clientFact = q.collected_from === "client_questionnaire";
        const actor = clientFact && !spouse ? "user-P" : "user-O";
        const r = await call(B, "PUT", `/runtime/cases/${C.id}/answers/${q.subjectId}/${q.fact}`, { value: sample(q), expectedId: null, ...(clientFact && spouse ? { onBehalfOf: q.subjectId, reason: "Entered from the person's signed form (Sample)" } : {}) }, actor);
        r.status < 300 ? sent++ : refused.push(`${q.fact} ${r.status}`);
      }
      for (const s of (v.sections ?? []).filter((x) => x.group?.required && x.group.rows === 0 && !x.group.none_apply)) await call(B, "PUT", `/runtime/cases/${C.id}/groups/${s.subjectId}/${s.section}/none-apply`, { noneApply: true, expectedId: null }, "user-O");
    }
    info("4b answers sent through the API", { answers: sent, refused: refused.slice(0, 5) });
    // 4c. the officer confirms every section on screen
    await as(B, "user-O"); await p.goto(`${B}/cases/${C.id}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500); posts.length = 0;
    const tabs = await p.getByRole("tab").allInnerTexts(); info("4c people tabs", tabs.map(flat));
    let clicked = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let t = 0; t < tabs.length; t++) {
        await p.getByRole("tab").nth(t).click(); await p.waitForTimeout(500);
        const n = await p.getByRole("button", { name: "Confirm section" }).count();
        for (let i = 0; i < n; i++) { const b = p.getByRole("button", { name: "Confirm section" }).nth(i); if (await b.isEnabled().catch(() => false)) { await b.click().catch(() => {}); clicked++; await p.waitForTimeout(350); } }
      }
    }
    await p.waitForTimeout(1200);
    const conf = posts.filter((x) => /\/sections\/.*\/confirm/.test(x.u));
    const okC = conf.filter((x) => x.s < 300).length, refusedC = conf.filter((x) => x.s >= 300);
    const stuck = [...new Map(refusedC.map((x) => [`${x.s} ${x.u.split("/sections/")[1]}`, x])).values()];
    const v = await agent(); const open = (v.sections ?? []).filter((s) => s.answered > s.confirmed).map((s) => `${s.about_label}: ${s.title} (${s.confirmed} of ${s.answered})`);
    const total = (v.sections ?? []).filter((s) => s.answered > 0).length;
    info("4c confirm on screen", { clicks: clicked, accepted: okC, refused: refusedC.length, sections_with_answers: total, sections_not_fully_confirmed: open, first_refusal: stuck.slice(0, 3).map((x) => ({ http: x.s, body: x.b.slice(0, 280) })) });
    const fam = (v.sections ?? []).find((s) => s.about_label === "Sample Spouse A" && /Family members/.test(s.title));
    const hc = qs(v).find((q) => q.subjectId === C.subj["Sample Spouse A"] && q.fact === "person.has_children");
    info("4c QA-164 retest: the spouse's Family members", { section_found: !!fam, answered: fam?.answered, confirmed: fam?.confirmed, has_children_shown_to_officer: !!hc && !hc.hidden, has_children_answer: hc?.answer?.value ?? null, confirm_refusals_409: refusedC.filter((x) => x.s === 409).length });
    const sp = tabs.findIndex((x) => /Spouse/.test(x)); if (sp >= 0) await p.getByRole("tab").nth(sp).click();
    await p.waitForTimeout(500); const sw = await shot("step4-officer-confirmed");
    if (open.length) await fail("04-officer-confirm-refused");
    C.confirmedOk = okC; C.stuck = stuck; C.open = open;
    verdict(4, "Client answers on the link; the officer confirms every section on screen", open.length === 0 && refusedC.length === 0, [
      `typing on screen: ${typed} parts saved by typing (Application details, Your visit, Personal details), the other ${total - typed >= 0 ? "" : ""}parts were sent through the API: the client form has 44 parts for this family`,
      stuck.length ? `Confirm refused ${refusedC.length} time(s), HTTP ${stuck[0].s}: ${JSON.parse(stuck[0].b || "{}").detail ?? stuck[0].b.slice(0, 200)}` : null,
      open.length ? `${open.length} section(s) stay unconfirmed: ${open.slice(0, 3).join("; ")}` : null].filter(Boolean));
  }

  // ======================================================================= STEP 5 (IMM 5257 fills for the principal)
  const P1 = () => C.subj["Sample Client A"];
  const row = () => p.locator("li", { has: p.getByRole("heading", { name: /IMM 5257 for Sample Client A/ }) });
  let copy = null, py = null;
  if (WANT.some((n) => n >= 5)) {
    // make sure the principal's form is ready: whatever the officer could not confirm on screen is left alone; readiness is read, not forced
    await as(B, "user-O"); await p.goto(`${B}/cases/${C.id}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
    const f0 = (await call(B, "GET", `/runtime/cases/${C.id}/forms`, undefined, "user-O")).body?.forms?.find((f) => f.form === "IMM 5257" && f.subject_id === P1());
    info("IMM 5257 readiness of the principal", { ready: f0?.readiness?.ready, missing: (f0?.readiness?.missing ?? []).length });
    await row().getByRole("button", { name: /Generate a (new )?copy/ }).click();
    const t0 = Date.now(); while (Date.now() - t0 < 90000 && !/Generated/.test(await row().innerText())) await sleep(500);
    const rowText = flat(await row().innerText());
    const sw = await shot("step5-generate-copy");
    const cp = (await call(B, "GET", `/runtime/cases/${C.id}/forms`, undefined, "user-O")).body?.forms?.find((f) => f.form === "IMM 5257" && f.subject_id === P1())?.copies?.[0];
    copy = cp ? (await call(B, "GET", `/runtime/form-copies/${cp.id}`, undefined, "user-O")).body : null;
    const rel = sqlB(`select path from form_instance where id='${copy?.id}'`);
    const pdf = path.join(ROOT, rel);
    // facts of the principal (and the application) as the officer's view holds them
    const v = await agent(); const facts = {};
    for (const q of qs(v)) if ((q.subjectId === P1() || /^case\./.test(q.fact)) && q.answer && !q.group) facts[q.fact] = { value: q.answer.value, options: q.options, confirmed: q.answer.confirmed };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gj2-")); fs.writeFileSync(path.join(tmp, "facts.json"), JSON.stringify(facts)); fs.writeFileSync(path.join(tmp, "result.json"), sqlB(`select result_json from form_instance where id='${copy?.id}'`) || "{}");
    const inv = path.join(ROOT, "ai-workers", "problem-1-pathway-setup-and-form-filling", "prototype", "p1", "inventory", "imm5257e.inventory.json");
    const pyCode = `
import json,sys,re
from pathlib import Path
sys.path.insert(0, ${JSON.stringify(path.join(ROOT, "ai-workers", "problem-1-pathway-setup-and-form-filling", "prototype", "p1"))})
import e5_roundtrip as E
import xml.etree.ElementTree as ET
pdf=Path(${JSON.stringify(pdf)}); base=str(pdf)[:-4]
req=json.load(open(base+".request.json")); rep=json.load(open(${JSON.stringify(path.join(tmp, "result.json"))})); facts=json.load(open(${JSON.stringify(path.join(tmp, "facts.json"))})); inv=json.load(open(${JSON.stringify(inv)}))
r=E.open_reader(pdf.read_bytes()); st=E.xfa_streams(r); parts={k:v.get_object().get_data() for k,v in st.items()}
data=E.data_root(ET.fromstring(parts["datasets"]))
def leaf(path):
    n=E.find_or_make(data,path,create=False)
    return None if n is None else (n.text or "")
norm=lambda s: re.sub(r"[^a-z0-9]","",str(s).lower())
F={f["data_path"]:f for f in inv["fields"] if f.get("data_path")}
boxes=[b for b in (rep.get("boxes") or []) if b.get("result")=="written"]
eq=0; match=0; unver=[]; bad=[]
for b in boxes:
    got=leaf(b["box"]); wrote=req["values"].get(b["box"])
    if got==wrote: eq+=1
    fact=facts.get(b.get("fact"));
    if fact is None: unver.append([b.get("fact"),"no confirmed answer in the officer view"]); continue
    val=fact["value"]
    if isinstance(val,(dict,list)): unver.append([b.get("fact"),"composite value"]); continue
    if isinstance(val,bool): val="Yes" if val else "No"
    lab=None
    for o in (fact.get("options") or []):
        if o["key"]==val: lab=o["label"]
    fld=F.get(b["box"]); opts=(fld or {}).get("options_resolved") or []
    ok=False
    if got==str(val): ok=True
    elif lab is not None and any(c==got and norm(l)==norm(lab) for l,c in opts): ok=True
    elif lab is not None and norm(got)==norm(lab): ok=True
    elif str(val) in ("Yes","No") and any(c==got and norm(l)==norm(val) for l,c in opts): ok=True
    elif isinstance(val,str) and any(c==got and norm(l)==norm(val) for l,c in opts): ok=True
    elif isinstance(val,str) and re.match(r"^\\d{4}-\\d{2}-\\d{2}$",val) and got.replace("-","")==val.replace("-",""): ok=True
    elif isinstance(val,str) and re.match(r"^\\d{4}-\\d{2}(-\\d{2})?$",val) and got.lstrip("0") in [x.lstrip("0") for x in val.split("-")]: ok=True
    elif str(val) in ("Yes","No") and got in ("Y","N") and got==str(val)[0]: ok=True
    elif lab is not None and any(c==got and (norm(lab) in norm(l) or norm(l) in norm(lab)) for l,c in opts): ok=True
    elif got in ("Y","N") and not isinstance(fact["value"],bool): unver.append([b.get("fact"),"derived Yes/No box (computed from the fact)"]); continue
    if ok: match+=1
    else: bad.append([b.get("fact"),b["box"].split(".")[-2],str(val)[:30],got])
req_fields=[f for f in inv["fields"] if f.get("required") and f.get("data_path")]
empty=[[f["caption"],f["data_path"].split(".")[-2]] for f in req_fields if not (leaf(f["data_path"]) or "").strip()]
bars=[[f["som"].split(".")[-1], bool((leaf(f["data_path"]) or "").strip()) if f.get("data_path") else None] for f in inv["fields"] if f.get("ui")=="barcode"]
print(json.dumps({"written":len(boxes),"read_back_equal":eq,"fact_match":match,"unverifiable":unver[:8],"unverifiable_n":len(unver),"mismatch":bad[:8],"mismatch_n":len(bad),"required_total":len(req_fields),"required_empty":empty,"barcode_boxes":bars,"counts":rep.get("counts")}))
`;
    const out = spawnSync(PY, ["-I", "-c", pyCode], { encoding: "utf8", timeout: 120000 });
    try { py = JSON.parse(out.stdout.trim().split("\n").pop()); } catch { py = null; info("python reader failed", (out.stderr || out.stdout).slice(-400)); }
    fs.rmSync(tmp, { recursive: true, force: true });
    const written = copy?.counts?.written, conf = /Declared or confirmed answers for (\d+) of (\d+)/.exec(flat(await row().innerText()));
    info("step 5 copy", { status: copy?.status, counts: copy?.counts, page_says: conf ? `Declared or confirmed answers for ${conf[1]} of ${conf[2]} form fields` : null, sideways_400: sw });
    info("step 5 compare with the facts (XFA read with the form's own lists)", py ? { written: py.written, read_back_equal: py.read_back_equal, matches_the_facts: py.fact_match, mismatches: py.mismatch_n, mismatch_examples: py.mismatch, unverifiable: py.unverifiable_n, unverifiable_examples: py.unverifiable } : "no reading");
    const neverWritten = (py?.required_empty ?? []).length;
    verdict(5, "IMM 5257 fills for the principal and the written values match the facts", !!py && py.mismatch_n === 0 && py.written > 0 && py.read_back_equal === py.written, [
      conf && written != null ? `the page says "Declared or confirmed answers for ${conf[1]} of ${conf[2]} form fields" beside ${written} form fields written: two numbers that do not agree` : null,
      py ? `${neverWritten} of the form's ${py.required_total} mandatory boxes were never written (see step 6, QA-165)` : null].filter(Boolean));
  }

  // ======================================================================= STEP 6 (the form's own validation)
  let upload = null;
  if (WANT.some((n) => n >= 6)) {
    const empty = py?.required_empty ?? [];
    info("step 6 mandatory boxes of IMM 5257 (the form's own required flag, 46) empty in the copy", { required: py?.required_total, empty: empty.length, which: empty.map((x) => x[0]) });
    // the product's own checks, on screen: send back an edited copy as "validated"
    await p.goto(`${B}/cases/${C.id}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1200);
    const bytes = await (await fetch(`${B}/api/runtime/form-copies/${copy.id}/file`, { headers: { "x-actor": "user-O" } })).arrayBuffer();
    const edited = Buffer.concat([Buffer.from(bytes), Buffer.from("\n% Saved after Validate (simulated by qa)\n")]);
    const tmpf = path.join(os.tmpdir(), "IMM5257-validated-sim.pdf"); fs.writeFileSync(tmpf, edited); posts.length = 0;
    const input = row().locator("input[type=file]");
    if (await input.count()) { await input.setInputFiles(tmpf); await p.waitForTimeout(3000); }
    upload = posts.find((x) => /\/validated$/.test(x.u)); const toast = (await toasts()).join(" | ");
    const rowAfter = flat(await row().innerText());
    const sw = await shot("step6-validated-readback"); await fail("05-validated-upload");
    info("step 6 simulated validated copy sent back on screen", { upload_present: await input.count() > 0, http: upload?.s, toast, row_says: rowAfter.slice(0, 260), sideways_400: sw });
    fs.rmSync(tmpf, { force: true });
    const accepted = upload && upload.s < 300;
    verdict(6, "Passes the form's own validation (mandatory boxes filled; the form's JavaScript cannot run here)", empty.length === 0 && !accepted, [
      `${empty.length} of ${py?.required_total ?? "?"} mandatory boxes empty in the copy: ${empty.map((x) => x[0]).slice(0, 4).join("; ")}`,
      accepted ? `an edited file sent back as "validated" is accepted (HTTP ${upload.s}) and the row reads "${rowAfter.match(/Validated[^.]*|Read back[^.]*|Ready to file/)?.[0] ?? ""}"` : upload ? `an edited file sent back as "validated" is refused (HTTP ${upload.s}): ${upload.b.slice(0, 160)}` : "no upload control on the row (the form does not need Validate here)"]);
  }

  // ======================================================================= STEP 7 (barcode)
  if (WANT.some((n) => n >= 7)) {
    const bars = py?.barcode_boxes ?? [];
    const pageText = flat(await p.locator("main").innerText());
    const mentions = (pageText.match(/barcode/gi) ?? []).length;
    const vrow = sqlB(`select * from validated_copy order by read_at desc limit 1`).slice(0, 300);
    const checked = /barcode_checked[^a-z]*true/i.test(JSON.stringify(upload?.b ?? "")) || /barcode.{0,40}(decoded|matches|checked)/i.test(pageText);
    await shot("step7-copy-barcode");
    info("step 7 barcode", { barcode_boxes_in_the_copy: bars, case_page_mentions_barcode: mentions, validated_copy_row: vrow, upload_body: (upload?.b ?? "").slice(0, 260) });
    verdict(7, "The barcode matches the facts (made and checked)", checked, [
      `the page says nothing about whether the barcode matches the facts (${mentions} mention(s) of "barcode"); the barcode boxes of the copy are ${bars.every((b) => !b[1]) ? "all empty" : "partly filled"} until Adobe's Validate`,
      "by design (P-144): the product neither makes nor decodes the barcode; it was not decoded here either (no Adobe)"]);
  }

  // ======================================================================= STEP 8 (checklist per person)
  if (WANT.includes(8)) {
    const pr = await call(B, "GET", `/runtime/cases/${C.id}/prepare`, undefined, "user-O");
    const items = pr.body?.items ?? [], names = Object.fromEntries(Object.entries(C.subj).map(([k, v]) => [v, k]));
    const per = {}; for (const i of items) { const n = names[i.subject] ?? "application"; (per[n] ??= []).push(i); }
    const lines = Object.fromEntries(Object.entries(per).map(([n, l]) => [n, l.map((i) => `${i.kind}:${i.form ?? i.document_type ?? i.step}=${i.state}${i.reason ? ` (${String(i.reason).slice(0, 70)})` : ""}`)]));
    info("step 8 /prepare, items per person", { http: pr.status, people: Object.keys(per), counts: Object.fromEntries(Object.entries(per).map(([n, l]) => [n, { forms: l.filter((i) => i.kind === "form").length, documents: l.filter((i) => i.kind === "document").length, with_reason: l.filter((i) => i.reason).length }])) });
    info("step 8 the child's lines", lines["Sample Child A1"] ?? []);
    const minorLetter = (per["Sample Child A1"] ?? []).filter((i) => i.form === "IMM 5707" || /letter|5707|5645/i.test(String(i.form ?? i.document_type ?? "")));
    await as(B, "user-O"); await p.goto(`${B}/cases/${C.id}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1200);
    const txt = flat(await p.locator("main").innerText()); const onPage = /checklist|documents? (to|needed|required)/i.test(txt);
    const sw = await shot("step8-case-page-checklist");
    const everyone = ["Sample Client A", "Sample Spouse A", "Sample Child A1"].every((n) => (per[n] ?? []).length > 0);
    const reasons = items.filter((i) => i.reason).length;
    info("step 8 case page", { checklist_on_page: onPage, sideways_400: sw, items: items.length, with_reason: reasons });
    verdict(8, "Checklist right per person, with reasons", pr.status === 200 && everyone && reasons > 0, [
      onPage ? null : "no checklist on the case page: the lines exist only in the API (GET /runtime/cases/:id/prepare)",
      reasons ? null : "no line carries a reason"].filter(Boolean));
  }

  // ======================================================================= end
  const bad400 = Object.entries(wide).filter(([, w]) => w > 1);
  info("sideways scroll at 400 px", bad400.length ? bad400 : "none on any shot");
  if (errs.length) info("page errors", errs.slice(0, 3));
  await browser.close();
  if (need && !process.env.QA_KEEP_B) { try { execFileSync("zsh", [path.join(S, "tools", "isolated.sh"), NAME_B, String(PORT_B), "stop"], { cwd: S, stdio: "pipe", env: { ...process.env, PATH: `${NODEBIN}:${process.env.PATH}` } }); } catch { /* already stopped */ } }
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed} of ${WANT.filter((n) => results.some((r) => r.n === n)).length} steps pass; first failing step: ${results.find((r) => !r.ok)?.n ?? "none"}`);
  process.exitCode = passed === results.length ? 0 : 1;
})().catch((e) => { console.error("CRASH", e); process.exit(2); });
