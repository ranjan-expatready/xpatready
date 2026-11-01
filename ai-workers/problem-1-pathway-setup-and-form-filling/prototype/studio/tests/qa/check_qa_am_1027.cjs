// qa lane, /qa after-merge on main 76628a4 (27 Oct; moved to Program structure round 3 on 28 Oct, main dccd87e): S1 Structure (PRs #40, #42) walked like a content publisher who
// types everything on the page, and W1-02 (PR #39, the browser extension parked) checked for clean removal with the PDF
// path still working. Part A runs on an empty copy (Reset state) and builds the structure only through the page; part B
// runs on a copy where Visitor visa was configured and released through the PDF path (setup_visitor_visa.ts, replayed
// AI). Findings fail here today and pass when fixed (QA-44 onwards; QA-38, QA-41, QA-42 re-checked); the rest guard what
// works. Every name and person is Sample. No model call (US$0).
//   zsh studio/tools/isolated.sh qa_am1027 4471 start
//   zsh studio/tools/isolated.sh qa_x1 4476 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4476 xr_studio_qa_x1
//   node studio/tests/qa/check_qa_am_1027.cjs 4471 xr_studio_qa_am1027 4476 xr_studio_qa_x1      (QA_HEADED=1 shows the browser)
const fs = require("node:fs"); const path = require("node:path"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const [PA, DBA, PB, DBB] = [process.argv[2] ?? "4471", process.argv[3] ?? "xr_studio_qa_am1027", process.argv[4] ?? "4476", process.argv[5] ?? "xr_studio_qa_x1"];
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => fs.existsSync(p));
const sqlOn = (db) => (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${db}`, "-Atc", q], { encoding: "utf8" }).trim();
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-28-after-merge-r3");
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const callOn = (port) => async (method, url, body, actor = "user-A") => { const r = await fetch(`http://localhost:${port}/api${url}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: !process.env.QA_HEADED });
  const errors = [];
  const page = async (port, actor, width) => {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("qa-init")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("qa-init", "1"); } } catch { /* private window */ } }, actor);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(String(e))); p.base = `http://localhost:${port}`; return p;
  };
  const axe = async (p, name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()).violations; step(`${name}: axe clean`, !v.length, v.map((x) => `${x.id} (${x.nodes.length})`).join(", ") || "clean"); };
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: true });
  const text = async (p, sel = "main") => (await p.locator(sel).first().innerText()).replace(/\s+/g, " ");

  // ═════════════════════════ Part A: Program structure round 3 (P-128), built by typing in the one Add pop-up (empty copy, Reset state)
  // Moved to round 3 on 28 Oct (main dccd87e): the round 2 ghost rows, Pathway cards and the panel's Add sub-category are
  // gone (P-128 (2), (4)); every finding's step is kept, only the way in changed.
  {
    const call = callOn(PA), sql = sqlOn(DBA);
    await call("POST", "/demo/reset", { confirm: "RESET" });
    const p = await page(PA, "user-A", 1440);
    const esc = (x) => x.replace(/[()]/g, "\\$&");
    const row = (name) => p.locator("[data-row]").filter({ has: p.locator("[data-name]", { hasText: new RegExp(`^${esc(name)}$`) }) }).first();
    const dlg = p.getByRole("dialog");
    const field = (lv) => dlg.locator(`[data-field=${lv}] input[role=combobox]`);
    const pickOrType = async (lv, name) => { await field(lv).fill(name); await wait(700); const opt = dlg.getByRole("option", { name, exact: true }); if (await opt.count()) await opt.click(); else await field(lv).press("Tab"); await wait(300); };
    const addLine = async (parts, { again = false } = {}) => {
      if (!(await dlg.isVisible())) { await p.locator("[data-add-open]").click(); await dlg.waitFor(); await wait(400); }
      for (const [lv, name] of parts) {
        if (lv === "subCategory" && await dlg.locator("[data-none]").isChecked().catch(() => false)) { await dlg.locator("[data-none]").click(); await wait(200); }
        await pickOrType(lv, name);
      }
      const done = p.waitForResponse((r) => /\/structure\/path$/.test(r.url()) && r.request().method() === "POST");
      await dlg.locator(again ? "[data-add-again]" : "[data-add-submit]").click();
      return done;
    };
    await p.goto(`${p.base}/structure`);
    await p.getByText("No structure yet").waitFor();
    step("C11.3 Program structure after Reset: an empty state with one next step (Add pathway), no Pathway cards", await p.getByRole("button", { name: "Add pathway" }).count() === 1 && await p.locator("[data-pathway-cards]").count() === 0);
    await axe(p, "Program structure empty at 1440 px");
    await p.getByRole("button", { name: "Add pathway" }).click(); await dlg.waitFor(); await wait(400);
    await addLine([["pathway", "Temporary residence"], ["program", "Visitors"], ["category", "Visitor visa"]], { again: true });
    // QA-44 (pop-up): what a person types right after "Add and add another", while the add is saving, is kept for the next name.
    const cat = field("category");
    await cat.pressSequentially("Tourist visa (to remove)", { delay: 20 });
    await wait(1200);
    const kept = await cat.inputValue();
    step("QA-60 (QA-44 in the pop-up) C11.3: what a person types right after 'Add and add another' (while the add is saving) is kept for the next name", kept === "Tourist visa (to remove)", `the field holds "${kept}"`);
    step("C11.3 'Add and add another' keeps the levels above (Pathway, Program) for the next line", await field("pathway").inputValue() === "Temporary residence" && await field("program").inputValue() === "Visitors");
    if (kept !== "Tourist visa (to remove)") await cat.fill("Tourist visa (to remove)"); // QA-60: the rest of the walk needs the whole name
    await cat.press("Tab"); await wait(300);
    await addLine([], { again: true });
    // Duplicate and close-name checks as typed.
    await cat.fill("visitor-VISA"); await wait(900);
    const dupMsg = (await dlg.innerText()).replace(/\s+/g, " ");
    step("C11.3 an exact twin typed with other case and a hyphen is recognised as the existing name; nothing new is added", /Uses the existing category|already in the Program structure/i.test(dupMsg) && !/1 new name/.test(dupMsg), dupMsg.match(/You are adding.{0,120}/)?.[0]);
    await cat.fill("Visiter visa"); await wait(1200);
    step("C11.3 a close spelling ('Visiter visa') asks 'Did you mean … Visitor visa' with Use it and Keep mine", /Did you mean .*Visitor visa/.test(await text(p, "[role=dialog]")) && await dlg.locator("[data-keep]").count() === 1);
    await shot(p, "s1-close-name");
    const longName = "A".repeat(10) + " very long category name ".repeat(12);
    await cat.fill(longName); await cat.press("Tab"); await wait(900);
    const addBtn = dlg.locator("[data-add-submit]");
    const longOff = await addBtn.isDisabled();
    let longStatus = "not sent";
    if (!longOff) { const lr = p.waitForResponse((r) => /\/structure\/path$/.test(r.url())); await addBtn.click(); longStatus = (await lr).status(); await wait(300); }
    const longMsg = (await dlg.innerText().catch(() => "")).replace(/\s+/g, " ");
    step("C11.3 a 300-character name is refused in the pop-up with a plain limit (not stored, no server error)", (longOff || longStatus === 400) && /characters|too long|at most/i.test(longMsg) && sql("select count(*) from program_def where length(label) > 200") === "0", `${longStatus} · ${longMsg.match(/.{0,40}(characters|too long|at most).{0,60}/i)?.[0] ?? longMsg.slice(0, 120)}`);
    await cat.fill("Visa de résident temporaire — 签证"); await cat.press("Tab"); await wait(900);
    await addLine([], { again: true });
    step("C11.3 a non-English name is stored exactly as typed", sql("select count(*) from program_def where label='Visa de résident temporaire — 签证'") === "1");
    await addLine([["program", "Study permits"], ["category", "Study permit"]]);
    await dlg.waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
    // QA-45 (round 3): the first sub-category under a category that is already a combination, through the one Add.
    await addLine([["pathway", "Temporary residence"], ["program", "Study permits"], ["category", "Study permit"], ["subCategory", "Outside Canada"]]);
    await dlg.waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
    step("QA-45 C11.3 BR-2: a first sub-category is added under a category that had none (through Add)", sql("select count(*) from program_def where label='Outside Canada'") === "1", await p.locator("[data-page-note]").innerText().catch(() => ""));
    await addLine([["pathway", "Permanent residence"]]);
    await dlg.waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
    step("C11.3 two Retail Pathways added in the pop-up are stored as Pathway rows in Retail", sql("select string_agg(label,'|' order by label) from program_def where node_kind='PATHWAY' and client_type='INDIVIDUAL'") === "Permanent residence|Temporary residence");
    await p.reload(); await p.locator("[data-row]").first().waitFor();
    const cnt = Number(sql("select count(*) from program_def"));
    step("C11.3 the outline the pop-up built is stored (2 pathways, 2 programs, 4 categories, 1 sub-category)", cnt === 9, cnt);

    // Pathway chips (P-128 (4)), Used by.
    const chips = p.locator("[data-pathway-chip]");
    step("P-128 (4): the filter bar has All and one chip per Pathway (no cards)", await chips.count() === 3 && await p.locator("[data-pathway-cards]").count() === 0, (await chips.allInnerTexts()).join(" | "));
    await chips.filter({ hasText: "Permanent residence" }).click(); await wait(400);
    step("P-128 (4): a Pathway chip shows only that Pathway and is in the address", /[?&]p=/.test(p.url()) && await row("Temporary residence").count() === 0);
    await p.locator("[data-clear-all]").click(); await wait(300);
    await row("Temporary residence").locator("[data-edit]").click(); await p.locator("[data-panel]").waitFor();
    const usedBy = await text(p, "[data-used-by]");
    step("S1 Used by on a Pathway names every combination under it by its path, Not started without Open", /Visitors › Visitor visa/.test(usedBy) && /Study permits › Study permit › Outside Canada/.test(usedBy) && /Not started/.test(usedBy), usedBy.slice(0, 220));
    await axe(p, "Program structure with the Edit panel at 1440 px");
    await shot(p, "s1-used-by");
    await p.getByRole("button", { name: "Close the details" }).click();

    // Rename, reorder, a stale save from a second tab.
    const usesLoaded = p.waitForResponse((r) => /\/uses$/.test(new URL(r.url()).pathname));
    await row("Visitors").locator("[data-edit]").click(); await usesLoaded.catch(() => {}); await wait(600);
    const nameBox = p.locator("#structure-name");
    await nameBox.fill("Visitor programs"); await p.getByRole("button", { name: "Save" }).click();
    await p.getByText(/^Saved/).first().waitFor({ timeout: 8000 }).catch(() => {});
    step("C11.3 rename in the Edit panel keeps the key and says it is saved, in the panel (no toast)", sql("select label from program_def where label like 'Visitor progr%'") === "Visitor programs" && await p.locator("[role=status]").filter({ hasText: /^Saved/ }).count() >= 1 && await p.locator("li[data-sonner-toast], [data-radix-toast-viewport] li").count() === 0);
    await p.getByRole("button", { name: "Move down" }).click(); await wait(1200);
    step("C11.9 Move down applies at once (Study permits now first)", sql("select string_agg(label,'|' order by display_order) from program_def where node_kind='PROGRAM'") === "Study permits|Visitor programs");
    const p2 = await page(PA, "user-A", 1440);
    await p2.goto(p.url()); await p2.locator("#structure-name").waitFor();
    await p2.locator("#structure-name").fill("Visitor programs (tab 2)"); await p2.getByRole("button", { name: "Save" }).click(); await p2.getByText(/^Saved/).first().waitFor().catch(() => {});
    await nameBox.fill("Visitor programs (tab 1)"); await p.getByRole("button", { name: "Save" }).click();
    await p.getByText("Changed meanwhile").waitFor({ timeout: 8000 }).catch(() => {});
    step("C11.3 two tabs: the older tab's save is refused 'Changed meanwhile' with Reload and keeps what was typed", await p.getByText("Changed meanwhile").count() === 1 && await nameBox.inputValue() === "Visitor programs (tab 1)" && sql("select count(*) from program_def where label='Visitor programs (tab 2)'") === "1");
    await p.getByRole("button", { name: "Reload" }).click(); await p2.close();
    await p.getByRole("button", { name: "Close the details" }).click().catch(() => {});

    // Delete an unused name another author added: the second person approves on To review (an own draft goes at once,
    // tested in check_qa_am_r3_1028.cjs).
    sql("update program_def set created_by='user-C' where label='Tourist visa (to remove)'");
    await p.reload(); await p.locator("[data-row]").first().waitFor();
    await row("Tourist visa (to remove)").locator("[data-action]").click();
    const imp = p.locator("aside").filter({ hasText: /Delete "Tourist visa \(to remove\)"/ }); await imp.waitFor();
    await imp.locator("#lifecycle-reason").fill("Added by mistake (qa walk)"); await imp.locator("[data-confirm-send]").click();
    await wait(1500);
    const chg = sql("select id from library_change where status='WAITING' order by proposed_at desc limit 1");
    step("C11.9 Delete of another author's unused name waits for a second person (the name stays until approved)", !!chg && sql("select count(*) from program_def where label='Tourist visa (to remove)'") === "1");
    const self = await call("POST", `/library/changes/${chg}/approve`, {});
    step("C11.9 the person who asked cannot approve their own deletion (403)", self.status === 403, self.status);
    const b = await page(PA, "user-B", 1440);
    await b.goto(`${b.base}/review`); await b.getByRole("link", { name: "Approve or return" }).first().click();
    await b.getByRole("heading", { name: /Tourist visa \(to remove\)/ }).waitFor();
    const reviewTitle = await b.getByRole("heading", { level: 1 }).innerText();
    await b.getByRole("button", { name: "Approve", exact: true }).click(); await b.waitForURL(/\/review$/).catch(() => {});
    await wait(1500);
    step("C11.9 the approver approves on To review and the unused name is deleted at once", sql("select count(*) from program_def where label='Tourist visa (to remove)'") === "0", sql(`select status from library_change where id='${chg}'`));
    step("QA-46 P-116: To review names the action as the page does ('Delete', not 'Remove'; P-128)", /^Delete/.test(reviewTitle), reviewTitle);
    // Read-only approver on the page; the server refuses writes.
    await b.goto(`${b.base}/structure`); await b.locator("[data-row]").first().waitFor();
    await b.locator("[data-row] [data-edit]").first().click(); await b.locator("[data-panel]").waitFor();
    step("BR-15 approver: Add, the name and Save are disabled on the page", await b.locator("[data-add-open]").isDisabled() && await b.locator("#structure-name").isDisabled() && await b.getByRole("button", { name: "Save" }).isDisabled());
    const r403 = await call("POST", "/structure/nodes", { pathwayType: "INDIVIDUAL", level: "pathway", label: "By approver" }, "user-B");
    step("BR-15 approver by API: adding a name is 403 in plain words", r403.status === 403 && !!(r403.body?.detail), `${r403.status} ${r403.body?.detail}`);
    await axe(b, "Program structure read-only (approver)");

    // Keyboard only: into the outline, arrows, Enter opens Edit, End reaches the last row.
    const k = await page(PA, "user-A", 1440);
    await k.goto(`${k.base}/structure`); await k.locator("[data-row]").first().waitFor();
    await k.locator("[data-row] [data-edit]").first().focus();
    await k.keyboard.press("ArrowDown"); await k.keyboard.press("Enter"); await wait(500);
    step("Keyboard: arrow into the outline and Enter opens the Edit panel of the focused name", await k.locator("[data-panel]").count() === 1);
    await k.keyboard.press("Escape"); await wait(200);
    await k.locator("[data-row] [data-edit]").first().focus(); await k.keyboard.press("End"); await wait(200);
    const last = await k.evaluate(() => document.activeElement?.closest("[data-row]")?.querySelector("[data-name]")?.textContent);
    const rowsAll = await k.locator("[data-row] [data-name]").allInnerTexts();
    step("Keyboard: End reaches the last row of the outline", last === rowsAll[rowsAll.length - 1], `${last} / ${rowsAll[rowsAll.length - 1]}`);

    // Width: 1024 px (desktop only in wave 1, P-128).
    const s = await page(PA, "user-A", 1024);
    await s.goto(`${s.base}/structure`); await s.locator("[data-row]").first().waitFor();
    step("Program structure at 1024 px: no sideways scroll", await sideways(s) <= 0, `${await sideways(s)} px`);
    await s.locator("[data-row]").filter({ hasText: "Visitor programs" }).first().locator("[data-edit]").click();
    const aside = s.locator("[data-panel]"); await aside.waitFor();
    const box = await aside.boundingBox();
    step("Program structure at 1024 px: the Edit panel fits the screen and closes", !!box && box.x >= 0 && box.x + box.width <= 1025 && await sideways(s) <= 0, box && `${Math.round(box.x)}+${Math.round(box.width)}`);
    await s.getByRole("button", { name: "Close the details" }).click();
    await s.context().close();
    // Immigration programs lists the Not started combinations the structure made.
    const pr = await call("GET", "/catalogue");
    step("C11.3 each last level added on Program structure is a combination listed Not started on Immigration programs", (pr.body?.rows ?? []).length === 3 && pr.body.rows.every((r) => /not started/i.test(r.statusText ?? r.status ?? "")), (pr.body?.rows ?? []).map((r) => `${r.trail?.slice(2).join(" › ")}: ${r.status}`));
  }

  // ═════════════════════════ Part B: W1-02 removal and the PDF path; Retire / Restore on a Live combination; QA-38/41/42
  {
    const call = callOn(PB), sql = sqlOn(DBB);
    const vv = sql("select id from combination where combination_key='vv.single'");
    const release = async (note) => { const d = (await call("GET", "/draft", undefined, "user-B")).body; return call("POST", "/pack/release", { note, expectedChanges: d?.changes ?? 0 }, "user-B"); };
    const listed = async (filter) => ((await call("GET", `/catalogue?filter=${filter}`)).body.rows ?? []).some((r) => r.combinationId === vv);
    step("setup: Visitor visa configured and released through the PDF path on main (intake, replayed AI field maps, release)", Number(sql(`select count(*) from config_release where combination_id='${vv}'`)) >= 1);
    // Removed endpoints answer 404, never 5xx.
    const gone = [["POST", "/captures"], ["GET", "/captures"], ["GET", "/extension/sessions"], ["POST", "/extension/pair"], ["GET", "/portals"], ["PATCH", `/combinations/${vv}/portal`], ["GET", `/combinations/${vv}/online-forms`], ["POST", "/online-versions/x/screen-map/draft"]];
    const res = []; for (const [m, u] of gone) res.push([`${m} ${u}`, (await call(m, u, m === "GET" ? undefined : {})).status]);
    step("C11.1 W1-02: capture, pairing, portal and screen-map endpoints are gone (404), none answers 5xx", res.every(([, s]) => s === 404), res);
    const a = await page(PB, "user-A", 1440);
    for (const u of ["/extension", "/review/capture/x", "/review/screen-map/x"]) {
      await a.goto(`${a.base}${u}`); await a.waitForLoadState("networkidle");
      step(`C11.1 W1-02: ${u} shows 'Page not found' with a way back, no page error`, await a.getByText("Page not found").count() === 1 && !errors.length, errors[0]);
    }
    await a.goto(`${a.base}/c/${vv}`); await a.getByRole("heading", { name: "Visitor visa", level: 1 }).waitFor();
    const body = await text(a, "body");
    step("C11.1 W1-02: no Extension, capture, pairing or 'Add an online form' anywhere on the menu or the combination page", !/Extension|Add an online form|Pair|Capture/i.test(body.replace(/browser extension \(later wave\)/gi, "")), body.match(/.{30}(Extension|Add an online form|Pair|Capture).{30}/i)?.[0]);
    // An Online line shows the later-wave note (set through the API: the channel choice is not under test).
    await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "ONLINE" });
    // Drift fixed 1 Nov: the later-wave words sit under the line's Filed as on the Forms tab, not on the combination page.
    await a.goto(`${a.base}/c/${vv}/forms`); await a.locator('tr[data-line="IMM 5707"]').waitFor({ timeout: 15000 }).catch(() => {});
    await a.getByText(/needs the browser extension \(later wave\)/i).first().waitFor({ timeout: 10000 }).catch(() => {});
    step("C11.1 W1-02: a line filed Online says it needs the browser extension (later wave)", /needs the browser extension \(later wave\)/i.test(await text(a)), (await text(a)).match(/.{40}later wave.{40}/i)?.[0]);
    await a.goto(`${a.base}/c/${vv}/preview`); await a.waitForLoadState("networkidle");
    // S5 (PR #71): the "Forms and coverage" button is gone; Preview lists each person's forms with how each is filed.
    const pf = a.locator('[data-preview-form="IMM 5707"]').first();
    await pf.waitFor({ timeout: 15000 }).catch(() => {});
    const prev = await pf.innerText().catch(() => text(a));
    step("C11.1 W1-02: Preview (draft) names the Online line as later wave and offers no Fill PDF on it", /later wave/i.test(prev) && !/Fill PDF/.test(prev), prev.slice(0, 160));
    const refuse = await call("POST", `/combinations/${vv}/fill`, { form: "IMM 5707", person: "principal", mode: "draft" });
    step("C11.1 W1-02: the Studio fill of an Online line is refused (409) with the later-wave words", refuse.status === 409 && /later wave/.test(refuse.body?.detail ?? ""), `${refuse.status} ${refuse.body?.detail}`);
    await shot(a, "w102-preview-online-line");
    await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD" });
    // Held file: an unapproved PDF is held, listed on To review, and the held page opens.
    const held = (await call("GET", "/intake/held")).body;
    step("C11.1 W1-02 intake: the held list answers (C2.2)", Array.isArray(held) || Array.isArray(held?.items), typeof held);
    await a.goto(`${a.base}/review`); await a.getByRole("heading", { level: 1 }).waitFor();
    step("To review opens for the author with no page error", !errors.length, errors[0]);
    // PDF fill from the Studio still answers.
    const fill = await call("POST", `/combinations/${vv}/fill`, { form: "IMM 5257", person: "principal", mode: "release" });
    step("C11.1 W1-02 PDF fill: IMM 5257 from the release fills, reads back equal and stays intact", fill.status < 300 && fill.body?.report?.intact === true && fill.body.report.read_back_equal === fill.body.report.written, `${fill.status} ${fill.body?.report ? `${fill.body.report.read_back_equal}/${fill.body.report.written} intact ${fill.body.report.intact}` : fill.body?.detail}`);
    const bad = await call("POST", `/combinations/${vv}/fill`, {});
    step("QA-47 STANDARDS §4: a fill request with no form or person is refused 400 in plain words (not 404 'undefined does not apply')", bad.status === 400 && !/undefined/.test(bad.body?.detail ?? ""), `${bad.status} ${bad.body?.detail}`);

    // QA-38, QA-41: a second release, then the officer's Open a case dialog.
    const visitors = sql("select program_node_key from program_def where label='Visitors' and node_kind='PROGRAM'");
    const nodeV = (await call("GET", "/structure?pathwayType=INDIVIDUAL")).body.nodes.find((n) => n.key === visitors);
    const ren = await call("PATCH", `/structure/nodes/${encodeURIComponent(visitors)}`, { version: nodeV.version, label: "Visitors (Sample)", decision: "new" });
    const releasedUnder = Number(sql(`select count(*) from combination c join program_def d on d.id=c.program_def_id where d.program_node_key like '${visitors}.%'`));
    step(`S1 rename of a program gives one name-only change per combination under it (${releasedUnder})`, ren.status === 200 && ren.body?.affected === releasedUnder, `${ren.status} ${JSON.stringify(ren.body).slice(0, 120)}`);
    await call("POST", `/combinations/${vv}/submit`, { note: "qa: name-only change" });
    const subm = (await call("GET", `/combinations/${vv}/review`, undefined, "user-C")).body?.submission;
    if (subm?.changeSummary?.length) await call("POST", `/combinations/${vv}/signoff`, { items: subm.changeSummary.map((x) => `${x.kind}|${x.key}`), action: "signed" }, "user-C");
    const ap = await call("POST", `/combinations/${vv}/approve`, undefined, "user-B");
    const latest = Number(sql(`select max(version) from config_release where combination_id='${vv}'`));
    step("S1 the name-only change releases as release 2; release 1 keeps the old name", latest === 2 && /Visitors"?[,}]|"Visitors"/.test(sql(`select snapshot::text from config_release where combination_id='${vv}' and version=1`).slice(0, 400000)), `${ap.status} latest ${latest}`);
    const o = await page(PB, "user-O", 1440);
    await o.goto(`${o.base}/cases`); await o.getByRole("button", { name: "Open a case" }).click();
    const dlg = o.getByRole("dialog"); await dlg.waitFor(); await wait(300);
    const foc = await o.evaluate(() => { const e = document.activeElement; return `${e?.tagName.toLowerCase()} ${(e?.getAttribute("aria-label") || (e?.labels?.[0]?.textContent) || e?.textContent || "").trim().slice(0, 40)}`; });
    step("QA-41 C6.1: the Open a case dialog puts focus on its first field, not on Close", /^(select|input)/.test(foc), foc);
    const label = (await dlg.locator("select").first().locator("option").allInnerTexts()).find((x) => x.startsWith("Visitor visa"));
    step(`QA-38 C6.1: the combination list names the release the case will use (Visitor visa · release ${latest})`, label === `Visitor visa · release ${latest}`, label);
    await o.keyboard.press("Escape");
    await a.goto(`${a.base}/c/${vv}`); await a.getByRole("heading", { name: "Visitor visa", level: 1 }).waitFor();
    step("QA-42 C1.4: a Live combination with released forms does not say its forms are 'not set up yet'", !/not set up yet/.test(await text(a)), (await text(a)).match(/Sample: [^.]*not set up yet\./)?.[0]);

    // QA-40 under W1-02: a release whose IMM 5707 line is filed Online (later wave); the case's forms panel should still name it.
    await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "ONLINE" });
    await call("POST", `/combinations/${vv}/submit`, { note: "qa: IMM 5707 filed Online (later wave)" });
    const sub3 = (await call("GET", `/combinations/${vv}/review`, undefined, "user-C")).body?.submission;
    if (sub3?.changeSummary?.length) await call("POST", `/combinations/${vv}/signoff`, { items: sub3.changeSummary.map((x) => `${x.kind}|${x.key}`), action: "signed" }, "user-C");
    const ap3 = await call("POST", `/combinations/${vv}/approve`, undefined, "user-B");
    const oc = await call("POST", "/runtime/cases", { combinationId: vv, reference: "QA-ONL-1", clientActor: "user-P", principal: { displayName: "Sample Applicant N" } }, "user-O");
    if (ap3.status < 300 && oc.status < 300) {
      await o.goto(`${o.base}/cases/${oc.body.id ?? oc.body.case?.id}`); await o.getByRole("heading", { name: /IMM 5257 for Sample Applicant N/ }).waitFor({ timeout: 15000 }).catch(() => {});
      const casePage = await text(o);
      step("QA-40 C7.6: a case whose release files IMM 5707 Online still names IMM 5707 and says it is filed Online (later wave)", /IMM 5707 · filed Online \(later wave\)/.test(casePage), casePage.match(/.{0,40}IMM 5707 · filed.{0,120}/)?.[0] ?? casePage.match(/.{0,80}IMM 5707.{0,120}/)?.[0] ?? "IMM 5707 not on the case page"); // drift fixed 1 Nov: the first "IMM 5707" on the page is now the What blocks filing list (P-145 copy); the forms panel heads its own card "IMM 5707 · filed Online (later wave)"
    } else step("QA-40 setup: a release with an Online IMM 5707 line and a case on it", false, `approve ${ap3.status} ${ap3.body?.detail ?? ""} · case ${oc.status} ${oc.body?.detail ?? ""}`);
    await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD" });

    // Retire a Live combination from its Program structure row (round 3, Lead (1)): the name and its combination retire
    // together in one approval, at the release; then Restore from the row (P-116 amended, P-128 (3)).
    const leaf = sql("select program_node_key from program_def where label='Visitor visa'");
    const rowOf = async (qs = "") => { await a.goto(`${a.base}/structure${qs}`); await a.locator("[data-row]").first().waitFor(); await wait(400); return a.locator(`[data-row="${leaf}"]`); };
    let r = await rowOf();
    await r.locator("[data-edit]").click(); await a.locator("[data-panel]").waitFor(); await wait(500);
    const usedLeaf = await text(a, "[data-used-by]");
    step("S1 Used by on a Live combination says its state with Open to its page", /Live/.test(usedLeaf) && await a.locator("[data-used-by]").getByRole("link", { name: "Open" }).getAttribute("href") === `/c/${vv}`, usedLeaf);
    await a.getByRole("button", { name: "Close the details" }).click();
    const act = await r.locator("[data-action]").getAttribute("data-action"), actOff = await r.locator("[data-action]").getAttribute("aria-disabled");
    // QA-48: a released combination is retired on a screen (round 3: its Structure row).
    step("QA-48 C11.9 P-116: a person can retire a released combination on a screen (its Program structure row offers Retire)", act === "RETIRE" && actOff !== "true", `${act} disabled=${actOff}`);
    if (act === "RETIRE" && actOff !== "true") {
      await r.locator("[data-action]").click();
      const imp = a.locator("aside").filter({ hasText: /Retire "Visitor visa"/ }); await imp.waitFor();
      step("C11.9 the Retire impact panel says its combination is retired with it and takes effect with the next release", /combination is retired with it/.test(await imp.innerText()) && /next release/.test(await imp.innerText()));
      await imp.locator("#lifecycle-reason").fill("Replaced by a new program (qa walk)"); await imp.locator("[data-confirm-send]").click(); await wait(1500);
    } else await call("POST", `/structure/nodes/${encodeURIComponent(leaf)}/retire`, { reason: "Replaced by a new program (qa walk)" });
    const rc = sql("select id from library_change where action='RETIRE' and status='WAITING' limit 1");
    const selfOk = await call("POST", `/library/changes/${rc}/approve`, {}, "user-A");
    const apr = await call("POST", `/library/changes/${rc}/approve`, {}, "user-B");
    const before = await listed("all");
    const rel = await release("qa: retire");
    const stillListed = await listed("all");
    const retiredList = await listed("retired");
    const newCase = await call("POST", "/runtime/cases", { combinationId: vv, reference: "QA-RET-1", clientActor: "user-P", principal: { displayName: "Sample Applicant R" } }, "user-O");
    step("C11.9 retiring from the row: the asker cannot approve (403); it stays until the release; after it, it leaves 'All', shows under Retired, and no new case opens (409, plain)", selfOk.status === 403 && apr.status < 300 && before && rel.status < 300 && !stillListed && retiredList && newCase.status === 409, `self ${selfOk.status} approve ${apr.status} before release listed=${before} release ${rel.status} listed=${stillListed} retired=${retiredList} case=${newCase.status} ${newCase.body?.detail ?? ""}`);
    const pick = JSON.stringify((await call("GET", "/path-options?pathway=INDIVIDUAL")).body?.programs ?? []);
    step("C11.9 the name retires with its combination and leaves the pickers", sql(`select retired_at is not null from program_def where program_node_key='${leaf}'`) === "t" && !pick.includes("Visitor visa"), `retired=${sql(`select retired_at is not null from program_def where program_node_key='${leaf}'`)} in pickers=${pick.includes("Visitor visa")}`);
    // Restore: from the row under Show retired; the combination comes back with it.
    r = await rowOf("?r=1");
    const restoreOn = await r.locator("[data-action]").getAttribute("data-action") === "RESTORE" && await r.locator("[data-action]").getAttribute("aria-disabled") !== "true";
    if (restoreOn) { await r.locator("[data-action]").click(); const imp = a.locator("aside").filter({ hasText: /Restore "Visitor visa"/ }); await imp.waitFor(); await imp.locator("#lifecycle-reason").fill("Still filed (qa walk)"); await imp.locator("[data-confirm-send]").click(); await wait(1500); }
    const rs = sql("select id from library_change where action='RESTORE' and status='WAITING' limit 1");
    if (rs) { await call("POST", `/library/changes/${rs}/approve`, {}, "user-B"); await release("qa: restore"); }
    const back = await listed("all");
    const case2 = await call("POST", "/runtime/cases", { combinationId: vv, reference: "QA-RET-2", clientActor: "user-P", principal: { displayName: "Sample Applicant R" } }, "user-O");
    step("C11.9 Restore from the row: one approval and the release bring the name and its combination back; cases open again", restoreOn && !!rs && back && case2.status < 300, `row restore=${restoreOn} change=${!!rs} listed=${back} case=${case2.status} ${case2.body?.detail ?? ""}`);
  }

  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
