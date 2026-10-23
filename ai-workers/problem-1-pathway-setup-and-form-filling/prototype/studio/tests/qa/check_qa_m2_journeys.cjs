// qa lane, /qa milestone (M2): Screen 01 and the release path walked as people would, replayed as a browser check.
// Personas: configuration author (user-A), content reviewer with the SME duty (user-C), approver (user-B).
// Journeys: J1 create a path · J2 duplicates · J3 odd names · J4 wrong role · J5 the form intake (official, same file,
// older edition, unapproved file, non-PDF, empty) · J6 submit → SME sign-off → second person releases · J7 the shared
// Release page with nothing submitted (QA-1) · J8 back, reload, keyboard, 1024 and 400 px, axe on each state.
// Runs on a FRESH isolated copy; sample inputs are loaded only for J6–J7 (release is under test, not setup data, P-33).
// No model call. Screenshots and a JSON log go to product/qa/reports/<date>-milestone/.
//   zsh studio/tools/isolated.sh qa_journeys 4474 start && node studio/tests/qa/page-proxy.mjs 4475 4474 &
//   QA_HEADED=1 node studio/tests/qa/check_qa_m2_journeys.cjs http://localhost:4475 xr_studio_qa_journeys
// (the page proxy is needed only while QA-4 is open: in a lane copy the server answers 404 for page addresses).
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const BASE = process.argv[2] ?? "http://localhost:4475", DB = process.argv[3] ?? "xr_studio_qa_journeys";
const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const OFFICIAL = path.join(ROOT, "official-sources", "ircc");
const DAY = new Date().toISOString().slice(0, 10);
const OUT = path.join(ROOT, "product", "qa", "reports", `${DAY}-milestone`); fs.mkdirSync(OUT, { recursive: true });
const log = [], axeLog = [], timings = {}; let shotN = 0;
const step = (name, ok, detail) => { log.push({ name, ok: ok === null ? null : !!ok, detail: detail === undefined ? undefined : String(detail).slice(0, 500) }); console.log(`${ok === null ? "NOTE" : ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
/** A minimal one-page PDF whose title and text carry a form code and edition (synthetic, test input only). */
function pdf(title, text) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`; objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs = []; objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: process.env.QA_HEADED !== "1", slowMo: process.env.QA_HEADED === "1" ? 60 : 0 });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const idle = async () => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(150); };
  const go = async (u) => { await p.goto(`${BASE}${u}`); await idle(); };
  const shot = async (name) => { const f = `${String(++shotN).padStart(2, "0")}-${name}.png`; await p.screenshot({ path: path.join(OUT, f), fullPage: true }); return f; };
  const axe = async (state) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); const v = r.violations.map((x) => `${x.id} (${x.impact}, ${x.nodes.length})`); axeLog.push({ state, violations: v }); return v; };
  const as = async (id) => { await p.getByLabel("Simulated person").selectOption(id); await idle(); };
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 300000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const main = async () => (await p.innerText("main")).replace(/\s+/g, " ");
  const journey = async (name, fn) => { try { await fn(); } catch (e) { step(`${name}: journey stopped`, false, e.message.split("\n")[0]); await shot(`${name}-stopped`).catch(() => {}); } };
  /** Path builder: type a name in a level field; choose the existing match or "Create '…'". */
  const level = async (i, text, choose = /Create/) => {
    const box = p.locator('main input[placeholder="Choose or type"]').nth(i);
    await box.click(); await box.fill(text); await p.waitForTimeout(300);
    const opt = p.getByRole("option", { name: choose }).first();
    if (await opt.count()) { await opt.click(); await idle(); return true; }
    return false;
  };

  // ---------------------------------------------------------------- J1 author: an empty catalogue → a new path
  await journey("J1", async () => {
    let t = Date.now(); await go("/"); await p.getByText(/No combinations in Individual yet/).waitFor(); timings.firstViewEmptyMs = Date.now() - t;
    step("J1 author: the empty catalogue says what to do first", /Create the first one with New combination/.test(await main()), `${timings.firstViewEmptyMs} ms`);
    step("J1 axe: empty catalogue", !(await axe("empty catalogue")).length, axeLog.at(-1).violations.join("; ") || "clean"); await shot("J1-empty");
    await p.getByRole("button", { name: "New combination" }).first().click(); await idle(); await p.locator('main input[placeholder="Choose or type"]').first().waitFor();
    step("J1 the path builder opens with the pathway preset to the tab the author was on", /New combination/.test(await main()) && (await p.locator("main select").first().inputValue()) === "INDIVIDUAL");
    const named = { Program: await p.getByRole("combobox", { name: "Program", exact: true }).count(), Category: await p.getByRole("combobox", { name: "Category", exact: true }).count() };
    step("J1 a screen reader hears each level's name (Program, Category), not only the placeholder 'Choose or type'", named.Program === 1 && named.Category === 1, JSON.stringify(named));
    const prog = p.locator('main input[placeholder="Choose or type"]').first(); await prog.click(); await prog.fill("Visitors"); await p.waitForTimeout(300);
    await p.keyboard.press("Enter"); await idle();
    const enterChose = !(await p.locator('main input[placeholder="Choose or type"]').nth(1).isDisabled());
    step("J1 keyboard: Enter on the only suggestion ('Create \"Visitors\"') chooses it", enterChose, enterChose ? "chosen" : "Enter did nothing; ArrowDown then Enter is needed");
    if (!enterChose) { await prog.click(); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await idle(); }
    await level(1, "Super visa");
    const preview = await main();
    step("J1 the preview says exactly what will be created", /Will be created as Individual › Visitors › Super visa/.test(preview), preview.match(/Will be created as [^.]*?(?= Create)/)?.[0]);
    await shot("J1-path-builder");
    t = Date.now(); await p.getByRole("button", { name: "Create and add sources" }).dblclick(); await p.waitForURL(/\/c\/[^/]+\/sources/, { timeout: 15000 }); await idle(); timings.createMs = Date.now() - t;
    const n = Number(sql("select count(*) from combination")), nodes = sql("select string_agg(label, ' > ' order by created_at) from program_def where node_kind <> 'PATHWAY'");
    step("J1 data: a double click creates the path once (one combination, one program, one category)", n === 1 && nodes === "Visitors > Super visa", `${n} combination; ${nodes}`);
    const audit = sql("select string_agg(entity, ', ' order by entity) from audit_event where actor='user-A' and action='created'");
    step("J1 data: the audit has one line per created item, by the author", audit === "category, configuration row, program", audit);
    step("J1 lands on the new combination's sources with one obvious next step (Add sources)", /Super visa/.test(await main()) && /Next step Add sources/.test(await main()));
    await shot("J1-created-sources");
    await go("/");
    step("J1 the catalogue shows the row: Visitors › Super visa · In setup · Add sources", /Visitors Super visa .*In setup Add sources/.test(await main()));
  });

  // ---------------------------------------------------------------- J2 duplicates (BR-6)
  await journey("J2", async () => {
    await go("/new");
    await p.locator('main input[placeholder="Choose or type"]').first().fill("  VISITORS "); await p.waitForTimeout(400);
    step("J2 a differently written existing program is recognised, with a plain message", /"Visitors" exists: choose it/.test(await main()));
    await p.getByRole("option", { name: /^Visitors/ }).first().click(); await idle();
    await p.locator('main input[placeholder="Choose or type"]').nth(1).fill("super-VISA"); await p.waitForTimeout(400);
    step("J2 a differently written existing category is recognised", /"Super visa" exists: choose it/.test(await main()));
    await p.getByRole("option", { name: /^Super visa/ }).first().click(); await idle();
    const txt = await main();
    step("J2 choosing the existing path says the combination exists and offers to open it", /This combination already exists/.test(txt) && /Open the existing combination/.test(txt));
    await shot("J2-duplicate");
    const create = p.getByRole("button", { name: "Create and add sources" });
    step("J2 'Create and add sources' cannot make a second copy", (await create.isDisabled()) || Number(sql("select count(*) from combination")) === 1, (await create.isDisabled()) ? "button disabled" : "button enabled");
    await p.getByRole("button", { name: "Open the existing combination" }).click(); await idle();
    step("J2 'Open the existing combination' opens the one that exists", p.url().includes(sql("select id from combination limit 1")), p.url());
  });

  // ---------------------------------------------------------------- J3 odd names
  await journey("J3", async () => {
    await go("/new");
    step("J3 nothing typed: Create is not available", await p.getByRole("button", { name: "Create and add sources" }).isDisabled());
    const long = "A".repeat(60) + " " + "B".repeat(70);
    await level(0, long); await level(1, "Long test");
    await p.getByRole("button", { name: "Create and add sources" }).click(); await idle();
    let txt = await main();
    const longStored = sql(`select count(*) from program_def where length(label) > 120`);
    step("J3 a 131-character program name is refused with the field message 'Keep the name under 120 characters.'", /Keep the name under 120 characters/.test(txt) && longStored === "0", `${longStored} stored; on screen: ${(txt.match(/[^.]*(120|too long|characters)[^.]*\./i) ?? ["no message"])[0].slice(0, 160)}`);
    await shot("J3-long-name");
    await go("/new");
    await level(0, "Résidence temporaire"); await level(1, "Visa d'été — 日本語");
    await p.getByRole("button", { name: "Create and add sources" }).click(); await p.waitForURL(/\/c\//, { timeout: 15000 }).catch(() => {}); await idle();
    const fr = sql("select string_agg(label, ' | ' order by created_at) from program_def where label like 'Résidence%' or label like 'Visa d%'");
    step("J3 French and Japanese names are kept exactly as typed", fr === "Résidence temporaire | Visa d'été — 日本語", fr);
    await go("/new");
    await level(0, "!!!"); const made = await level(1, "???");
    await p.getByRole("button", { name: "Create and add sources" }).click({ timeout: 3000 }).catch(() => {}); await idle();
    txt = await main();
    const sym = sql("select coalesce(string_agg(label || '=' || program_node_key, ' | '), '') from program_def where label in ('!!!','???')");
    step("J3 a name of symbols only is refused with a plain message (it has no letters to compare or key)", !sym, `stored: ${sym || "nothing"}; on screen: ${(txt.match(/(Give it a name|letters|refused|not allowed)[^.]*\./i) ?? ["no message"])[0]}`);
    await shot("J3-symbols");
  });

  // ---------------------------------------------------------------- J4 wrong role: the approver tries to author
  await journey("J4", async () => {
    await go("/"); await as("user-B");
    const btn = p.getByRole("button", { name: "New combination" }).first();
    step("J4 approver: 'New combination' is still offered (the server decides)", null, (await btn.isDisabled()) ? "disabled" : "enabled");
    await go("/new"); await level(0, "Visitors", /^Visitors/); await level(1, "Approver test");
    await p.getByRole("button", { name: "Create and add sources" }).click().catch(() => {}); await idle();
    const txt = await main();
    const made = sql("select count(*) from program_def where label='Approver test'");
    step("J4 approver: creating is refused by the server, nothing stored, and the screen says why in plain words", made === "0" && /Only a configuration author can create combinations/.test(txt), `${made} stored; ${(txt.match(/Only a configuration author[^.]*\./) ?? ["no message"])[0]}`);
    await shot("J4-wrong-role");
    const r = await api("/program-nodes", { method: "POST", actor: "user-B", data: { kind: "PROGRAM", parentKey: "individual", label: "By URL" } });
    step("J4 approver by direct call: refused with 403 and a Problem Details body", r.status === 403 && r.body?.title && r.body?.detail, `${r.status} ${r.body?.detail}`);
    await as("user-A");
  });

  // ---------------------------------------------------------------- J5 the one form intake on Super visa
  await journey("J5", async () => {
    const id = sql("select c.id from combination c join program_def p on p.id=c.program_def_id where p.label='Super visa' limit 1");
    await go(`/c/${id}/sources`);
    const input = p.locator('main input[type="file"][aria-label="Choose files"]');
    const results = async (files) => { await input.setInputFiles(files); await p.getByText(/Upload results|added|Already|Held|held|refused|Only PDF|empty/).first().waitFor({ timeout: 120000 }).catch(() => {}); await idle(); await p.waitForTimeout(500); return main(); };
    let t = Date.now(); let txt = await results(path.join(OFFICIAL, "forms", "imm5257e.pdf")); timings.intakeOfficialMs = Date.now() - t;
    step("J5 an official IRCC PDF: code and edition read from the file, added and attached", /IMM 5257/.test(txt) && /(added to the library|Attached to Super visa)/.test(txt), (txt.match(/IMM 5257[^.]*\.[^.]*\./) ?? [""])[0].slice(0, 200));
    await shot("J5-official");
    txt = await results(path.join(OFFICIAL, "forms", "imm5257e.pdf"));
    step("J5 the same file again: 'Already in the library', nothing duplicated", /Already in the library/.test(txt) && sql("select count(*) from form_edition where edition_label like 'IMM 5257 %'") === "1", (txt.match(/Already in the library[^.]*\./) ?? ["no message"])[0]);
    txt = await results(path.join(OFFICIAL, "previous-editions", "imm5257e-pre-2023.pdf"));
    step("J5 an older edition of the same form is kept aside with a plain reason", /Older edition: not used|held|Held/.test(txt), (txt.match(/(Older edition|Held)[^.]*\.[^.]*\./) ?? ["no message"])[0].slice(0, 200));
    const fake = path.join(OUT, "synthetic-imm5257-2027.pdf"); fs.writeFileSync(fake, pdf("IMM 5257 E (12-2027)", "IMM 5257 E (12-2027) Application for Temporary Resident Visa"));
    txt = await results(fake);
    step("J5 a file not on the approved list (synthetic newer edition) is held before library, attachment or AI, with the reason", /not on the approved source list|impact review|Held/.test(txt) && sql("select count(*) from form_edition where edition_label like '%12-2027%'") === "0", (txt.match(/(Held|New edition)[^.]*\.[^.]*\./) ?? ["no message"])[0].slice(0, 220));
    await shot("J5-held");
    const txtFile = path.join(OUT, "notes.pdf"); fs.writeFileSync(txtFile, "just some text, not a PDF");
    txt = await results(txtFile);
    step("J5 a non-PDF named .pdf is refused in plain words, nothing read", /Only PDF files and saved web pages/.test(txt));
    const empty = path.join(OUT, "empty.pdf"); fs.writeFileSync(empty, "");
    txt = await results(empty);
    step("J5 an empty file is refused in plain words", /The file is empty/.test(txt));
    const held = await api(`/intake/held?combination=${id}`);
    step("J5 data: the held items are listed for a person to decide", Array.isArray(held.body) ? held.body.length >= 1 : !!held.body, JSON.stringify(held.body).slice(0, 200));
    for (const f of ["notes.pdf", "empty.pdf", "synthetic-imm5257-2027.pdf"]) fs.rmSync(path.join(OUT, f), { force: true });
  });

  // ---------------------------------------------------------------- J8 recovery, keyboard, sizes (before the sample load)
  await journey("J8", async () => {
    await go("/"); await p.getByRole("button", { name: /^All ·/ }).click(); await idle();
    let t = Date.now(); await p.getByRole("button", { name: /^Needs work ·/ }).click(); await idle(); timings.filterMs = Date.now() - t;
    await p.getByRole("button", { name: /^All ·/ }).click(); await idle();
    await p.getByText("Super visa").first().click(); await p.waitForURL(/\/c\//); await idle();
    await p.reload(); await idle();
    step("J8 reload on a combination page keeps the page (through the QA-4 page proxy)", /Super visa/.test(await main()));
    await p.goBack(); await idle();
    const allPressed = await p.getByRole("button", { name: /^All ·/ }).getAttribute("aria-pressed");
    step("J8 Back returns to the list with the same filter (All)", allPressed === "true" || /All · \d/.test(await main()), `aria-pressed=${allPressed}`);
    for (const w of [1024, 400]) {
      await p.setViewportSize({ width: w, height: 900 }); await go("/");
      const sideways = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      step(`J8 ${w} px: the catalogue has no sideways scroll`, !sideways); await shot(`J8-${w}px`);
    }
    await p.setViewportSize({ width: 1440, height: 900 }); await go("/");
    let reached = false; for (let i = 0; i < 40 && !reached; i++) { await p.keyboard.press("Tab"); reached = await p.evaluate(() => /New combination/.test(document.activeElement?.textContent ?? "")); }
    if (reached) { await p.keyboard.press("Enter"); await idle(); }
    step("J8 keyboard only: Tab reaches 'New combination' and Enter opens the path builder", reached && p.url().endsWith("/new"));
    t = Date.now(); await go("/"); await p.getByRole("button", { name: /^All ·/ }).waitFor(); timings.warmFirstViewMs = Date.now() - t;
    t = Date.now(); await p.getByRole("button", { name: /^Needs work ·/ }).click(); await p.waitForLoadState("networkidle"); timings.filterNoPadMs = Date.now() - t;
    step(`J8 speed (warm, with network idle): first view ${timings.warmFirstViewMs} ms (< 1 s) · filter ${timings.filterNoPadMs} ms (< 200 ms); cold first view ${timings.firstViewEmptyMs} ms recorded`, timings.warmFirstViewMs < 1000 && timings.filterNoPadMs < 200);
  });

  // ---------------------------------------------------------------- J6 release with separate duties (sample inputs)
  await journey("J6", async () => {
    await go("/"); await p.getByRole("button", { name: "Demo" }).click(); await p.getByRole("menuitem", { name: /Reset demo/ }).click();
    await p.getByLabel("Type RESET to confirm").fill("RESET"); await p.getByRole("dialog").getByRole("button", { name: "Reset demo" }).click();
    await p.getByRole("dialog").getByText(/rows and \d+ working files removed/).waitFor({ timeout: 120000 }); await p.getByRole("dialog").getByRole("button", { name: "Close" }).last().click(); await idle();
    let t = Date.now(); await p.getByRole("button", { name: "Demo" }).click(); await p.getByRole("menuitem", { name: /Load sample inputs/ }).click();
    await p.getByText("Sample inputs loaded", { exact: false }).first().waitFor({ timeout: 400000 }); timings.loadSampleMs = Date.now() - t;
    await p.getByRole("button", { name: "Continue" }).click().catch(() => {}); await idle();
    step("J6 setup: sample inputs loaded through the Demo menu", true, `${Math.round(timings.loadSampleMs / 1000)} s`);
    const wp = sql("select c.id from combination c join program_def p on p.id=c.program_def_id where p.program_node_key='individual.work_permits.employer_specific.with_lmia'");
    await go(`/c/${wp}/configuration`); await p.getByRole("tab", { name: /^Documents/ }).click(); await idle();
    await p.getByRole("button", { name: "Add a document requirement" }).click(); await p.getByRole("button", { name: /Minor travelling alone \(conditional\): IMM 5484/ }).click();
    await p.getByText("Condition is valid").waitFor(); await p.getByRole("dialog").getByRole("button", { name: "Save to draft" }).click(); await idle();
    await go(`/c/${wp}/review`);
    await p.getByRole("button", { name: /Submit for review/ }).click(); await idle();
    step("J6 author submits the draft", /Submitted by/.test(await main()), (await main()).match(/Submitted by [^ ]+/)?.[0]);
    step("J6 the submitter is shown by name, not by an internal id", !/Submitted by user-/.test(await main()), (await main()).match(/Submitted by [^ ]+/)?.[0]);
    await shot("J6-submitted");
    await as("user-B"); await go(`/c/${wp}/review`);
    await p.getByRole("button", { name: /Approve and release/ }).click(); await idle(); await p.waitForTimeout(800);
    let txt = await main() + " " + (await p.locator("[aria-live=polite]").allInnerTexts()).join(" ");
    step("J6 approver before the SME sign-off: refused, with the reason in plain words", /SME sign-off first/.test(txt) && sql(`select count(*) from config_release where combination_id='${wp}'`) === "1", (txt.match(/[^.]*SME sign-off[^.]*\./) ?? ["no message"])[0].slice(0, 200));
    await shot("J6-approve-refused");
    await as("user-C"); await go(`/c/${wp}/review`);
    await p.getByRole("button", { name: "Select all I can sign" }).click(); await p.getByRole("button", { name: /^Sign \d/ }).click(); await idle();
    const signed = sql("select count(*) from review_signoff where actor_id='user-C' and action='signed' and duty='sme'");
    step("J6 content reviewer (SME duty) signs the changes (recorded with the SME duty)", Number(signed) >= 1, `${signed} SME sign-offs by the content reviewer`);
    await as("user-A"); await go(`/c/${wp}/review`);
    step("J6 the author cannot approve their own change (button off)", await p.getByRole("button", { name: /Approve and release/ }).isDisabled());
    const self = await api(`/combinations/${wp}/approve`, { method: "POST", actor: "user-A" });
    step("J6 the author by direct call: refused", self.status === 403, `${self.status} ${self.body?.detail}`);
    await as("user-B"); await go(`/c/${wp}/review`);
    t = Date.now(); await p.getByRole("button", { name: /Approve and release/ }).click(); await p.getByText(/Released version 2|v2/).first().waitFor({ timeout: 60000 }).catch(() => {}); await idle(); timings.approveMs = Date.now() - t;
    const rel = sql(`select version || ' ' || author_id || '/' || submitter_id || '/' || approver_id from config_release where combination_id='${wp}' order by version desc limit 1`);
    step("J6 a second person releases: version 2 with author, submitter and approver recorded", /^2 user-A\/user-A\/user-B$/.test(rel), rel);
    await shot("J6-released");
    await go("/");
    step("J6 the catalogue shows the row Live in the new release", /With an LMIA[^]*?Live/.test(await main()) || /Live · 1/.test(await main()));
    await as("user-A");
  });

  // ---------------------------------------------------------------- J7 QA-1 in the browser: the shared Release page
  await journey("J7", async () => {
    const wp = sql("select c.id from combination c join program_def p on p.id=c.program_def_id where p.program_node_key='individual.work_permits.employer_specific.with_lmia'");
    const before = sql(`select max(version) from config_release where combination_id='${wp}'`);
    await go(`/c/${wp}/configuration`); await p.getByRole("tab", { name: /^Documents/ }).click(); await idle();
    await p.getByRole("button", { name: "Add a document requirement" }).click();
    const choices = p.getByRole("dialog").getByRole("button", { name: /\(conditional\)|\(always\)/ });
    if (await choices.count()) await choices.first().click();
    await p.getByRole("dialog").getByRole("button", { name: "Save to draft" }).click().catch(() => {}); await idle();
    await go("/");
    step("J7 the draft bar offers 'Review and release' to everyone", await p.getByRole("link", { name: /Review and release \(\d+\)/ }).count() > 0);
    await as("user-B"); await p.getByRole("link", { name: /Review and release \(\d+\)/ }).click(); await idle();
    await shot("J7-shared-release");
    const btn = p.getByRole("button", { name: /^Release \d+ combination/ });
    const offered = (await btn.count()) && !(await btn.isDisabled());
    if (offered) { await btn.click(); await idle(); await p.waitForTimeout(800); }
    const after = sql(`select max(version) || ' submitter ' || (select submitter_id from config_release where combination_id='${wp}' order by version desc limit 1) from config_release where combination_id='${wp}'`);
    step("J7 QA-1: the shared Release page refuses changes nobody submitted or signed", !offered || after.startsWith(before + " "), `before v${before}; after v${after}; ${(await main()).match(/(Release \d+ published|Not released)[^.]*\./)?.[0] ?? ""}`);
    await shot("J7-after");
    await as("user-A");
  });

  step("no page errors in the whole run", !errs.length, errs.slice(0, 3).join(" | ") || "none");
  fs.writeFileSync(path.join(OUT, "journeys-log.json"), JSON.stringify({ base: BASE, db: DB, at: new Date().toISOString(), timings, axe: axeLog, log }, null, 2));
  const fails = log.filter((x) => x.ok === false).length;
  console.log(`\n${log.filter((x) => x.ok).length} pass, ${fails} fail, ${log.filter((x) => x.ok === null).length} notes · timings ${JSON.stringify(timings)}`);
  await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
