// V3 (verify 3 Nov 2026, read-only tester): the golden journey replayed through the screens on a fresh copy, US$0, Saved only,
// no STUDIO_*_LIVE. Steps: 1 Reset to the six · 2 configure Visitor visa · 3 release · 4 open a family case · 5 the client answers ·
// 6 IMM 5257 for each applicant · 7 the checks (Validate read-back, filing) · 8 what staff see matches the release.
// It repeats the manual walk of V3-one-system.md, except (QA-180) the three forms with no field map are named by the release
// check at step 2 and taken off before the release, so step 4 opens on release 1; the step-4 recovery stays for a 409.
// Per state: axe WCAG 2.2 A/AA (whole page), sideways scroll at 400, 1024 and 1440 px, page errors; timings printed.
//   node v3_golden_replay.cjs <port 4470-4479> <name>     e.g. node v3_golden_replay.cjs 4475 v3r
// Needs: the repo set up (product/tools/cloud-setup.sh), PostgreSQL on 54329, playwright with a browser (cloud image).
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { execFileSync, spawnSync } = require("node:child_process");
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const S = path.join(ROOT, "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio");
const PORT = Number(process.argv[2] ?? 4475), NAME = process.argv[3] ?? "v3r", DB = `xr_studio_${NAME}`, B = `http://localhost:${PORT}`;
if (PORT < 4470 || PORT > 4479) throw new Error("qa ports are 4470-4479");
const OUT = path.join(os.tmpdir(), `v3-replay-${NAME}`); fs.mkdirSync(OUT, { recursive: true });
const req = (m, order) => { for (const from of order) { try { return require(require.resolve(m, { paths: [from] })); } catch { /* next */ } } throw new Error(`no ${m}`); };
const OTHER = [...(process.env.NODE_PATH ?? "").split(path.delimiter).filter(Boolean), "/opt/node-tools/node_modules"];
/** A cloud copy's browser matches the machine's playwright, a Mac's the app's own: try each until one launches. */
const launch = async (opts) => { for (const from of [...OTHER, S]) { try { return await req("playwright", [from]).chromium.launch(opts); } catch { /* next */ } } throw new Error("no playwright with a browser found"); };
const AxeBuilder = req("@axe-core/playwright", [S, ...OTHER]).default;
const sql = (q) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", DB, "-Atc", q], { encoding: "utf8" }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), flat = (s) => s.replace(/\s+/g, " ").trim();
const results = [], timings = {}, axeOut = {}, wide = {}, errs = [];
const verdict = (n, name, ok, note) => { results.push({ n, ok }); console.log(`${ok ? "PASS" : "FAIL"}  step ${n}: ${name}${note ? ` — ${note}` : ""}`); };
const info = (s, d) => console.log(`INFO  ${s}${d === undefined ? "" : ` — ${typeof d === "string" ? d : JSON.stringify(d)}`}`.slice(0, 1400));

(async () => {
  execFileSync("zsh", [path.join(S, "tools/isolated.sh"), NAME, String(PORT), "start"], { cwd: S, stdio: "pipe", env: { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` } });
  const browser = await launch({ headless: !process.env.QA_HEADED });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); p.on("dialog", (d) => d.accept().catch(() => {})); p.on("pageerror", (e) => errs.push(e.message));
  const posts = []; p.on("response", async (r) => { const q = r.request(); if (r.url().includes("/api/") && q.method() !== "GET") posts.push({ m: q.method(), u: r.url().replace(/^.*\/api/, ""), s: r.status(), b: (await r.text().catch(() => "")).slice(0, 4000) }); });
  const as = async (actor) => { await p.goto(B); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor); };
  const text = async (sel = "main") => flat(await p.locator(sel).first().innerText());
  const toasts = async () => (await p.locator("[aria-live=polite]").allInnerTexts()).join(" | ");
  const check = async (name, scope) => { // axe + widths on one state
    const a = new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]); if (scope) a.include(scope);
    const r = await a.analyze(); axeOut[name] = r.violations.map((v) => `${v.id}(${v.nodes.length})`);
    wide[name] = {}; for (const w of [400, 1024, 1440]) { await p.setViewportSize({ width: w, height: 900 }); await sleep(250); wide[name][w] = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); }
    await p.setViewportSize({ width: 1440, height: 900 }); await p.screenshot({ path: path.join(OUT, `${name}.png`) });
  };
  const VV = () => sql("select id from combination where combination_key='vv.single'");
  const CB = () => `${B}/c/${VV()}`;

  // ---------------------------------------------------------------- 1
  await as("user-A"); await p.goto(B); await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: /Demo/ }).click(); await p.getByText("Reset to the six…").click(); await p.getByLabel("Type RESET to confirm").fill("RESET");
  await check("1-reset-confirm", "[role=dialog]");
  let t0 = Date.now(); await p.getByRole("button", { name: /^Reset to the six$/ }).click(); await p.getByText("Reset to the six: done").waitFor({ timeout: 300000 }); timings.reset_s = (Date.now() - t0) / 1000;
  await check("1-reset-done", "[role=dialog]");
  verdict(1, "Reset to the six", sql("select count(*) from combination") === "6", `${timings.reset_s} s, ${sql("select count(*) from proposal_item where status='waiting'")} proposals waiting`);
  await p.getByRole("button", { name: "Continue" }).click();

  // ---------------------------------------------------------------- 2 (author, on screen)
  await p.goto(`${CB()}/forms`); await p.waitForLoadState("networkidle"); await sleep(800);
  await p.getByText("Review AI proposals").first().click(); await p.waitForLoadState("networkidle"); await sleep(800);
  await p.getByRole("button", { name: /Accept clean new definitions/ }).click(); await sleep(1200);
  await p.getByRole("button", { name: "Apply to draft" }).click(); await sleep(800); await p.locator("[role=dialog]").getByRole("button", { name: "Apply to draft" }).click(); await sleep(3000);
  const applied = posts.find((x) => /\/jobs\/.*\/apply$/.test(x.u)); info("2a IMM 5257 Saved draft applied", { http: applied?.s, body: applied?.b.slice(0, 160) });
  const dec = p.locator("section[data-form-field-decisions]");
  for (let i = 0; i < 20; i++) { if (!(await dec.locator("select").count())) { const d = dec.getByRole("button", { name: "Decide", exact: true }); if (!(await d.count())) break; await d.first().click(); await sleep(300); }
    await dec.locator("select").first().selectOption({ label: "Filled by hand" }); await dec.getByLabel("Reason", { exact: true }).first().fill("Answered by the applicant on the form; no case fact holds it (Sample)."); await dec.getByRole("button", { name: "Save", exact: true }).first().click(); await sleep(700); }
  await p.goto(`${CB()}/forms`); await p.waitForLoadState("networkidle"); await sleep(800);
  const change = async (code) => { await p.locator("tr").filter({ hasText: code }).first().getByRole("button", { name: "Change" }).click(); await sleep(700); return p.locator("[role=dialog]"); };
  const remove = async (code) => { const d = await change(code); await d.getByRole("button", { name: /Remove from this combination/ }).click(); await sleep(400); await p.getByRole("button", { name: `Remove ${code}` }).click(); await sleep(1200); };
  let d = await change("IMM 5409"); await d.getByLabel("Field", { exact: true }).fill("Marital status"); await d.getByLabel("Value", { exact: true }).fill("common_law"); await d.getByRole("button", { name: "Save to draft" }).click(); await sleep(1500);
  for (const c of ["IMM 5475", "IRM 0002", "IMM 5645"]) await remove(c);
  d = await change("IMM 5707"); await d.getByLabel("From age (optional)").fill("18"); await d.getByLabel("Always", { exact: true }).check(); await d.getByRole("button", { name: "Save to draft" }).click(); await sleep(1500);
  d = await change("IMM 5476"); await d.getByLabel("Who fills it").selectOption({ label: "The representative" }); await d.getByLabel("Always", { exact: true }).check(); await d.getByRole("button", { name: "Save to draft" }).click(); await sleep(1500);
  await check("2-forms-tab");
  // C4.11 with Saved (QA-163 retest)
  await p.goto(`${CB()}/questionnaires`); await p.waitForLoadState("networkidle"); await sleep(800);
  await p.getByRole("button", { name: "Draft questions and documents" }).click(); await sleep(1500); await p.getByRole("button", { name: "Draft with Saved (US$0)" }).click(); await sleep(4000);
  const qd = posts.find((x) => /\/draft-qd$/.test(x.u)); info("2b C4.11 Saved", { http: qd?.s, dialog: (await text("[role=dialog]")).match(/The rules found \d+ things to fix|\d+ problems for a person to fix/)?.[0] });
  await p.keyboard.press("Escape");
  // sections and lists by the rules: only from Shared library > Forms > IMM 5257 > Actions > Re-read with AI
  await p.goto(`${B}/library/forms`); await p.waitForLoadState("networkidle"); await sleep(800);
  await p.locator("tr").filter({ hasText: "Application for visitor visa" }).first().getByRole("button", { name: "Actions for IMM 5257" }).click(); await p.getByRole("menuitem", { name: /Re-read with AI/ }).click(); await sleep(2000);
  await p.getByRole("button", { name: "Draft sections and lists · US$0" }).click(); await sleep(2500);
  await p.getByRole("link", { name: "Open Proposals" }).click(); await p.waitForLoadState("networkidle"); await sleep(1000);
  for (let i = 0; i < 60; i++) { const dl = p.locator("[role=dialog]"); if (await dl.count() && await dl.getByRole("button", { name: "Accept" }).count()) { await dl.getByRole("button", { name: "Accept" }).click(); await sleep(800); continue; }
    const o = p.locator("main tr").filter({ has: p.getByRole("button", { name: "Open" }) }); if (!(await o.count())) break; await o.first().getByRole("button", { name: "Open" }).click(); await sleep(700); }
  info("2c sections and lists", sql("select kind||':'||status||':'||count(*) from proposal_item where kind in ('section','answer_list') group by kind,status"));
  // the second person approves every new library item, one at a time
  await as("user-C"); t0 = Date.now(); let approved = 0;
  for (let i = 0; i < 300; i++) { const a = p.getByRole("button", { name: "Approve", exact: true }); if (await a.count()) { await a.first().click(); approved++; await sleep(600); continue; }
    await p.goto(`${B}/review`); await p.waitForLoadState("networkidle"); await sleep(500); const n = p.getByText(/^Approve or return the new /).first(); if (!(await n.count())) break; await n.click(); await p.waitForLoadState("networkidle"); await sleep(400); }
  timings.approve_library_s = (Date.now() - t0) / 1000; info("2d library items approved one by one", { approved, seconds: timings.approve_library_s, waiting: sql("select count(*) from library_change where status='WAITING'") });
  // the author places each of IMM 5257's facts in a section (library > field > Where it is asked)
  await as("user-A");
  const keys = sql(`select distinct canonical_field_key from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label='IMM 5257 (09-2023)' and canonical_field_key is not null order by 1`).split("\n");
  const sectionOf = (k) => k.startsWith("case.") ? "Details of visit" : /education_/.test(k) ? "Education" : /occupation_/.test(k) ? "Occupation" : /marital|previously_married|union_start/.test(k) ? "Marital status" : /national_id/.test(k) ? "Nat id" : /us_green/.test(k) ? "Us card"
    : /criminal|military|violent|health|refused|overstayed|previously_applied|immigration_history/.test(k) ? "Background info" : /telephone|email|fax|address/.test(k) ? "Contact information" : "Personal details";
  const repOf = (k) => k.startsWith("case.") && !/visit_contact/.test(k) ? "once_per_case" : /visit_contact|education_|occupation_|previous_residence_/.test(k) ? "per_row" : "per_person";
  let placed = 0; t0 = Date.now();
  for (const k of keys) { await p.goto(`${B}/library/fields/${k}`); await p.waitForLoadState("networkidle"); const sels = p.locator("main select");
    await sels.filter({ has: p.locator("option", { hasText: "Choose a section" }) }).first().selectOption({ label: sectionOf(k) }); await sels.filter({ has: p.locator("option", { hasText: "Client questionnaire" }) }).first().selectOption({ label: "Client questionnaire" });
    await sels.filter({ has: p.locator("option", { hasText: "Once per case" }) }).first().selectOption(repOf(k)); const n0 = posts.length; await p.getByRole("button", { name: "Save placement as draft" }).click(); await sleep(700); if (posts.slice(n0).some((x) => /placement/.test(x.u) && x.s < 300)) placed++; }
  timings.place_84_s = (Date.now() - t0) / 1000; info("2e facts placed one by one", { placed, of: keys.length, seconds: timings.place_84_s });
  await p.goto(`${CB()}/questionnaires`); await p.waitForLoadState("networkidle"); await sleep(800);
  for (const s of ["Details of visit", "Personal details", "Contact information", "Marital status", "Nat id", "Us card", "Education", "Occupation", "Background info"]) { await p.locator("select").filter({ has: p.locator("option", { hasText: "Add a library section…" }) }).first().selectOption({ label: s }); await p.getByRole("button", { name: "Add section", exact: true }).click(); await sleep(1100); }
  await check("2-sqr-tab");
  await p.goto(`${CB()}/review`); await p.waitForLoadState("networkidle"); await sleep(1000);
  await p.getByRole("button", { name: "Add source" }).first().click(); d = p.locator("[role=dialog]"); await d.getByLabel("Official source").check();
  await d.getByLabel("Official address (https)").fill("https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5484/01-05-2026/imm5484e.pdf"); await d.getByLabel(/Page or section/).fill("IMM 5484 Document Checklist, Family Information form line");
  await d.locator("textarea").fill("Family Information form. Must be completed by those aged 18 years or older."); await d.getByRole("button", { name: "Save source" }).click(); await sleep(1200); await d.getByRole("button", { name: "Close" }).last().click(); await sleep(800);
  // QA-180 (P-297 (3)): release now refuses a form whose edition in use has no form fields mapped, and names it, so the
  // author meets IMM 5409, 5476 and 5707 here, before releasing (V3 met them only as the officer's 409 at step 4). No
  // Saved field map exists for them (a paid run), so the author takes them off, as V3's recovery did, then releases once.
  await p.getByRole("button", { name: /^Show all \d+$/ }).first().click().catch(() => {}); await sleep(500);
  const unmappedLines = (await p.locator("[data-problem]").allInnerTexts()).map(flat).filter((x) => /No form fields mapped yet/.test(x));
  await check("2-review-names-unmapped"); info("2f release refuses the unmapped forms, by name", unmappedLines);
  const unmappedNamed = ["IMM 5409", "IMM 5476", "IMM 5707"].every((c) => unmappedLines.some((x) => x.includes(`${c} (`)));
  await p.goto(`${CB()}/forms`); await p.waitForLoadState("networkidle"); await sleep(800);
  for (const c of ["IMM 5409", "IMM 5476", "IMM 5707"]) await remove(c);
  await p.goto(`${CB()}/review`); await p.waitForLoadState("networkidle"); await sleep(1000);
  const errors = (await text()).match(/(\d+) (other )?errors? \(block submission\)/)?.[1];
  verdict(2, "Configure Visitor visa on screen (Saved only)", applied?.s < 300 && qd?.s < 300 && unmappedNamed && errors === "0" && placed === keys.length, `unmapped forms named before release ${unmappedNamed}; blocking errors ${errors}; warnings: ${(await text()).match(/\d+ warnings/)?.[0]}`);

  // ---------------------------------------------------------------- 3 (submit, sign, release)
  const release = async () => {
    await as("user-A"); await p.goto(`${CB()}/review`); await p.waitForLoadState("networkidle"); await sleep(1000); await p.getByRole("button", { name: "Submit for review" }).click(); await sleep(2000);
    await as("user-C"); await p.goto(`${CB()}/review`); await p.waitForLoadState("networkidle"); await sleep(1000); const sign = p.getByRole("button", { name: /^Sign/ }).first();
    if (!(await sign.isEnabled())) { await p.getByRole("button", { name: /Show all/ }).click().catch(() => {}); for (const c of await p.locator("main input[type=checkbox]").all()) if (await c.isEnabled() && !(await c.isChecked())) await c.check(); }
    if (await sign.isEnabled()) { await sign.click(); await sleep(2000); }
    await as("user-B"); await p.goto(`${CB()}/review`); await p.waitForLoadState("networkidle"); await sleep(1000); await check(`3-approver-release-v${Number(sql(`select count(*) from config_release where combination_id='${VV()}'`)) + 1}`);
    const n0 = posts.length; await p.getByRole("button", { name: "Approve and release" }).click(); await sleep(2500); return posts.slice(n0).find((x) => /\/approve$/.test(x.u));
  };
  const r1 = await release(); info("3 release", { http: r1?.s, body: r1?.b.slice(0, 200) });
  verdict(3, "Release (author submits, expert signs, approver releases)", r1?.s < 300);

  // ---------------------------------------------------------------- 4 (officer opens a family case)
  const openCase = async () => { await as("user-O"); await p.goto(`${B}/cases`); await p.waitForLoadState("networkidle"); await p.getByRole("button", { name: "Open a case" }).click(); await sleep(600);
    await p.getByLabel("Case reference").fill(`V3R-${Date.now().toString(36).slice(-4)}`); await p.getByLabel(/Principal applicant/).fill("Sample Client A"); const n0 = posts.length; await p.getByRole("button", { name: "Open case" }).click(); await sleep(2500);
    return posts.slice(n0).find((x) => x.u === "/runtime/cases"); };
  let oc = await openCase(); const firstTry = oc?.s; info("4a open a case on release 1", { http: oc?.s, missing: oc?.b.match(/"missing":\[(.*?)\]/)?.[1]?.slice(0, 300), words: await toasts() });
  if (oc?.s >= 300) { // recovery an author would choose: take the three unmapped forms off and release again
    await p.keyboard.press("Escape"); await as("user-A"); await p.goto(`${CB()}/forms`); await p.waitForLoadState("networkidle"); await sleep(800);
    for (const c of ["IMM 5409", "IMM 5476", "IMM 5707"]) await remove(c);
    const r2 = await release(); info("4b recovery: release 2 without the unmapped forms", { http: r2?.s }); oc = await openCase(); }
  const CASE = oc?.b.match(/^\{"id":"([0-9a-f-]{36})"/)?.[1];
  for (const [btn, name] of [[/Add spouse or partner/, "Sample Spouse A"], [/Add child/, "Sample Child A1"]]) { await p.getByRole("button", { name: btn }).click(); await p.getByLabel("Name").fill(name); await p.getByRole("button", { name: "Add", exact: true }).click(); await sleep(1300); }
  await check("4-case-page");
  verdict(4, "Officer opens a family case (3 people)", firstTry < 300 && !!CASE, firstTry >= 300 ? `release 1 refused HTTP ${firstTry}; opened only after the recovery release` : "");

  // ---------------------------------------------------------------- 5 (the client answers every part on screen, 400 px)
  await as("user-P"); await p.setViewportSize({ width: 400, height: 850 }); await p.goto(`${B}/cases/${CASE}/questionnaire`); await p.waitForLoadState("networkidle"); await sleep(800);
  await check("5-client-start"); await p.setViewportSize({ width: 400, height: 850 });
  await p.getByRole("button", { name: "Start", exact: true }).click(); await sleep(800);
  const fillPart = (who) => p.evaluate(({ who }) => {
    const set = (el, v) => { const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
    const ctxOf = (el) => { let n = el; for (let i = 0; i < 6 && n; i++) { n = n.parentElement; const l = n?.querySelector("legend, label, p"); if (l && l.innerText.trim().length > 6 && !/^(Day|Month|Year)$/.test(l.innerText.trim())) return l.innerText.trim(); } return ""; };
    let k = 0;
    for (const el of [...document.querySelectorAll("main input[type=text], main input:not([type]), main input[type=email], main input[type=tel], main input[type=number], main textarea")].filter((e) => (!e.value || e.getAttribute("aria-invalid") === "true" || (/Country code/i.test(e.labels?.[0]?.innerText || "") && !/^\d{1,3}$/.test(e.value))) && !e.disabled && e.offsetParent)) {
      const lab = (el.labels?.[0]?.innerText || el.getAttribute("aria-label") || "").trim(), c = ctxOf(el); let v = "SAMPLE";
      if (/^(Day|Month|Year)$/.test(lab)) { const y = /birth/i.test(c) ? (who === "child" ? "2016" : who === "spouse" ? "1988" : "1986") : /stay|visit/i.test(c) ? "2030" : /expiry|ends|end date/i.test(c) ? "2035" : "2015"; v = lab === "Day" ? "15" : lab === "Month" ? (/last day/i.test(c) ? "4" : "3") : y; }
      else if (/UCI|Unique Client|identifier/i.test(lab)) v = "12345678"; else if (/Country code/i.test(lab)) v = "91"; else if (/^(the )?number$/i.test(lab) || /telephone|phone|fax/i.test(lab + c)) v = "9876543210";
      else if (/e-?mail/i.test(lab + c)) v = "client.a@example.com"; else if (/money|funds|CAD/i.test(lab + c)) v = "5000"; else if (/given name/i.test(lab)) v = who === "child" ? "CHILD" : who === "spouse" ? "SPOUSE" : "SAMPLE"; else if (/family name/i.test(lab)) v = "CLIENTA"; else if (/number/i.test(lab)) v = "A1234567";
      set(el, v); k++; }
    for (const s of [...document.querySelectorAll("main select")].filter((e) => !e.value && e.offsetParent)) { const o = [...s.options].find((o) => o.value && !/Choose/.test(o.text)); if (o) { set(s, o.value); k++; } }
    for (const n of new Set([...document.querySelectorAll("main input[type=radio]")].map((r) => r.name))) { const rs = [...document.querySelectorAll(`main input[type=radio][name="${CSS.escape(n)}"]`)]; if (rs.some((r) => r.checked)) continue; (rs.find((r) => /^No$/i.test((r.labels?.[0]?.innerText || "").trim())) || rs[0]).click(); k++; }
    return k; }, { who });
  let parts = 0, fails = 0, slowest = 0;
  for (let i = 0; i < 40; i++) {
    const main = await text(); const where = main.match(/Part \d+ of \d+ · [^\n]{0,30}/)?.[0]; if (!where) break;
    const who = /Sample Child A1/.test(main) ? "child" : /Sample Spouse A/.test(main) ? "spouse" : "principal";
    await fillPart(who); const na = p.getByRole("button", { name: /^None apply/ }); for (let j = 0; j < await na.count(); j++) if (await na.nth(j).isEnabled().catch(() => false)) { await na.nth(j).click().catch(() => {}); await sleep(250); }
    const n0 = posts.length, ts = Date.now(); await p.getByRole("button", { name: "Save and continue" }).click(); await sleep(400); for (let k = 0; k < 60 && /Saving…/.test(await text()); k++) await sleep(250); slowest = Math.max(slowest, Date.now() - ts); await sleep(300);
    fails += posts.slice(n0).filter((x) => x.s >= 300).length; if (!/There is a problem/.test(await text())) parts++;
  }
  timings.slowest_part_save_ms = slowest;
  await check("5-client-end"); const done = (await text()).match(/(\d+) of (\d+) parts done/);
  info("5 client", { parts_saved: parts, done: done?.[0], failed_requests: fails });
  // the officer confirms every section on screen
  await p.setViewportSize({ width: 1440, height: 900 }); await as("user-O"); await p.goto(`${B}/cases/${CASE}`); await p.waitForLoadState("networkidle"); await sleep(1200);
  const tabs = await p.getByRole("tab").count(); const n1 = posts.length;
  for (let pass = 0; pass < 2; pass++) for (let t = 0; t < tabs; t++) { await p.getByRole("tab").nth(t).click(); await sleep(400); const n = await p.getByRole("button", { name: "Confirm section" }).count();
    for (let i = 0; i < n; i++) { const b = p.getByRole("button", { name: "Confirm section" }).nth(i); if (await b.isEnabled().catch(() => false)) { await b.click().catch(() => {}); await sleep(300); } } }
  const confirms = posts.slice(n1).filter((x) => /\/confirm$/.test(x.u)); await p.reload(); await p.waitForLoadState("networkidle"); await sleep(1000);
  const head = (await text()).match(/(\d+) questions for this household · (\d+) answered · (\d+) confirmed · (\d+) required not answered/);
  info("5 officer confirms", { confirm_requests: confirms.length, refused: confirms.filter((x) => x.s >= 300).length, header: head?.[0] });
  verdict(5, "The client answers every part; the officer confirms", done?.[1] === done?.[2] && fails === 0 && head?.[2] === head?.[3] && head?.[4] === "0");

  // ---------------------------------------------------------------- 6 (IMM 5257 for each applicant)
  const people = ["Sample Client A", "Sample Spouse A", "Sample Child A1"], gen = {};
  for (const who of people) { const row = p.locator("li", { has: p.getByRole("heading", { name: new RegExp(`IMM 5257 for ${who}`) }) }); const ts = Date.now();
    await row.getByRole("button", { name: /Generate a (new )?copy/ }).click(); while (Date.now() - ts < 90000 && !/Generated/.test(await row.innerText())) await sleep(300);
    gen[who] = { seconds: (Date.now() - ts) / 1000, line: flat(await row.innerText()).match(/\d+ form fields written, \d+ by hand[^D]*/)?.[0] }; }
  await check("6-copies");
  const copies = sql(`select count(*) from form_instance where case_id='${CASE}' and status='GENERATED'`);
  info("6 copies", gen);
  verdict(6, "IMM 5257 filled for each applicant", copies === "3");

  // ---------------------------------------------------------------- 7 (checks)
  const row = p.locator("li", { has: p.getByRole("heading", { name: /IMM 5257 for Sample Client A/ }) });
  const [dl] = await Promise.all([p.waitForEvent("download"), row.getByRole("button", { name: "Download" }).click()]); const f = path.join(OUT, "copy.pdf"); await dl.saveAs(f);
  let n2 = posts.length; await row.locator("input[type=file]").setInputFiles(f); await sleep(2500); const same = posts.slice(n2).find((x) => /validated$/.test(x.u));
  fs.writeFileSync(f + ".edited.pdf", Buffer.concat([fs.readFileSync(f), Buffer.from("\n% edited, not validated\n")])); n2 = posts.length; await row.locator("input[type=file]").setInputFiles(f + ".edited.pdf"); await sleep(2500); const edited = posts.slice(n2).find((x) => /validated$/.test(x.u));
  const filedOn = await row.getByRole("button", { name: "Filed" }).isEnabled(); await check("7-checks");
  info("7 checks", { unchanged_copy: same?.s, edited_copy: edited?.s, filed_button_enabled: filedOn });
  verdict(7, "Checks hold filing until Adobe's Validate (accept path needs Adobe)", same?.s === 422 && edited?.s === 422 && !filedOn);

  // ---------------------------------------------------------------- 8 (staff see the release)
  const get = async (u) => (await (await fetch(`${B}/api${u}`, { headers: { "x-actor": "user-O" } })).json());
  const v = await get(`/runtime/cases/${CASE}/questionnaire?mode=agent`), forms = await get(`/runtime/cases/${CASE}/forms`);
  const rel = JSON.parse(sql(`select json_build_object('forms', jsonb_array_length(snapshot->'forms'), 'sections', jsonb_array_length(snapshot->'sections'), 'placements', jsonb_array_length(snapshot->'placements'), 'edition', snapshot->'field_maps'->0->>'form_edition', 'boxes', jsonb_array_length(snapshot->'field_maps'->0->'entries')) from config_release where combination_id='${VV()}' order by version desc limit 1`));
  const staff = { questions: v.summary?.questions, sections: new Set(v.sections.map((s) => s.title)).size, forms: (forms.forms ?? forms).length, people: new Set((forms.forms ?? forms).map((x) => x.subject_id)).size, mapped_on_page: (await text()).match(/of (\d+) form fields/)?.[1] };
  info("8 release vs staff", { release: rel, staff, mapped_in_release: sql(`select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label='${rel.edition}' and m.outcome='mapped'`) });
  verdict(8, "What staff see matches the release", staff.sections === rel.sections && staff.forms === 3 && staff.people === 3 && staff.questions === 231);

  // ---------------------------------------------------------------- end
  info("axe violations per state", axeOut); info("sideways scroll px per width", wide); info("timings", timings); if (errs.length) info("page errors", errs.slice(0, 5));
  await browser.close(); execFileSync("zsh", [path.join(S, "tools/isolated.sh"), NAME, String(PORT), "stop"], { cwd: S, stdio: "pipe" });
  const passed = results.filter((r) => r.ok).length; console.log(`\n${passed} of ${results.length} steps pass; first failing step: ${results.find((r) => !r.ok)?.n ?? "none"}; screenshots ${OUT}`);
  process.exitCode = passed === results.length ? 0 : 1;
})().catch((e) => { console.error("CRASH", e); process.exit(2); });
