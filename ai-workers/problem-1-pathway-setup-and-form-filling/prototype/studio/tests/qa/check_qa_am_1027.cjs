// qa lane, /qa after-merge on main 76628a4 (27 Oct): S1 Structure (PRs #40, #42) walked like a content publisher who
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
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-27-after-merge");
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

  // ═════════════════════════ Part A: S1 Structure, typed on the page (empty copy, Reset state)
  {
    const call = callOn(PA), sql = sqlOn(DBA);
    const p = await page(PA, "user-A", 1440);
    const item = (name) => p.getByRole("treeitem").filter({ has: p.getByText(name, { exact: true }) }).first();
    const addRow = (re) => p.getByRole("textbox", { name: re });
    const typeAdd = async (box, name) => { await box.fill(name); await p.locator("[data-add-row]").getByText(/No exact match/).waitFor({ timeout: 10000 }); await box.press("Enter"); await p.locator("[data-done]").filter({ hasText: name.slice(0, 20) }).waitFor({ timeout: 10000 }); };
    await p.goto(`${p.base}/structure`);
    await p.getByText("No structure yet").waitFor();
    step("C11.3 Structure after Reset: an empty state with one next step (Add pathway), no cards row", await p.getByRole("button", { name: "Add pathway" }).count() === 1 && await p.locator("[data-pathway-cards]").count() === 0);
    await axe(p, "Structure empty at 1440 px");
    await p.getByRole("button", { name: "Add pathway" }).click();
    const pw = addRow(/New pathway name in Retail/);
    await typeAdd(pw, "Temporary residence");
    // QA-44: a person who starts typing the next name while the first one is still being added loses what they typed.
    await pw.fill("Permanent residence"); await p.waitForFunction(() => !/Checking the names/.test(document.querySelector("[data-add-row]")?.textContent ?? ""));
    await pw.press("Enter"); await pw.pressSequentially("Corporate and employers", { delay: 25 });
    await p.locator("[data-done]").filter({ hasText: "Permanent residence" }).waitFor().catch(() => {});
    await wait(600);
    const kept = await pw.inputValue();
    step("QA-44 C11.3: what a person types right after Enter (while the add is saving) is kept in the row for the next name", kept === "Corporate and employers", `the row holds "${kept}"`);
    await pw.fill(""); await p.keyboard.press("Escape");
    step("C11.3 two Retail Pathways added on the page are stored as Pathway rows in Retail", sql("select string_agg(label,'|' order by label) from program_def where node_kind='PATHWAY' and client_type='INDIVIDUAL'") === "Permanent residence|Temporary residence");

    // Programs, categories and a sub-category through the ghost rows, as a person.
    await item("Temporary residence").click();
    await p.getByRole("treeitem").filter({ hasText: /^Add program$/ }).first().click();
    const prog = addRow(/New program name under Temporary residence/);
    await typeAdd(prog, "Visitors"); await typeAdd(prog, "Study permits"); await p.keyboard.press("Escape");
    await item("Visitors").click(); await p.getByRole("button", { name: "Close the details" }).click().catch(() => {});
    await p.getByRole("treeitem").filter({ hasText: /^Add category$/ }).first().click();
    const cat = addRow(/New category name under Visitors/);
    await p.getByRole("radiogroup", { name: "Cases may be opened from" }).getByRole("radio", { name: "Outside" }).click().catch(() => {});
    await typeAdd(cat, "Visitor visa");
    // Duplicate and close-name checks as typed.
    await cat.fill("visitor-VISA"); await p.getByText(/already exists under Visitors/).waitFor({ timeout: 8000 }).catch(() => {});
    const dupMsg = await p.locator("[data-add-row] [role=alert]").innerText().catch(() => "");
    step("C11.3 an exact twin typed with other case and a hyphen is refused on the row in plain words, Add disabled", /"Visitor visa" already exists under Visitors\. Choose it instead\./.test(dupMsg) && await p.locator("[data-add-row]").getByRole("button", { name: "Add" }).isDisabled(), dupMsg);
    await cat.fill("Visiter visa"); await p.getByText(/Did you mean/).waitFor({ timeout: 8000 }).catch(() => {});
    step("C11.3 a close spelling ('Visiter visa') asks 'Did you mean … Visitor visa' with Use existing and Add mine anyway", /Did you mean .*Visitor visa/.test(await text(p, "[data-add-row]")) && await p.getByRole("button", { name: "Add mine anyway" }).count() === 1);
    await shot(p, "s1-close-name");
    await typeAdd(cat, "Tourist visa (to remove)");
    const longName = "A".repeat(10) + " very long category name ".repeat(12);
    await cat.fill(longName); await p.locator("[data-add-row]").getByText(/No exact match|already|Did you mean/).waitFor({ timeout: 10000 }).catch(() => {});
    const longRes = p.waitForResponse((r) => /\/structure\/nodes$/.test(r.url()) && r.request().method() === "POST");
    await cat.press("Enter"); const lr = await longRes;
    const longMsg = await text(p, "[data-add-row]");
    step("C11.3 a 300-character name is refused on the row with a plain limit (not stored, no server error)", lr.status() === 400 && /characters|too long|at most/i.test(longMsg), `${lr.status()} · ${longMsg.slice(0, 160)}`);
    await typeAdd(cat, "Visa de résident temporaire — 签证");
    step("C11.3 a non-English name is stored exactly as typed", sql("select count(*) from program_def where label='Visa de résident temporaire — 签证'") === "1");
    await p.keyboard.press("Escape");
    await item("Study permits").click(); await p.getByRole("button", { name: "Close the details" }).click().catch(() => {});
    const addCats = p.getByRole("treeitem").filter({ hasText: /^Add category$/ });
    await addCats.nth(1).click();
    const cat2 = addRow(/New category name under Study permits/);
    await typeAdd(cat2, "Study permit"); await p.keyboard.press("Escape");
    await item("Study permit").click();
    await p.getByRole("button", { name: "Add sub-category" }).click();
    // QA-45: the panel's "Add sub-category" (the only way to add a first sub-category on the page) opens no row.
    const sub = addRow(/New sub-category name under Study permit/);
    const opened = await sub.waitFor({ timeout: 4000 }).then(() => true, () => false);
    step("QA-45 C11.3 BR-2: 'Add sub-category' on a category without sub-categories opens the add row under it", opened, opened ? undefined : `panel closed, no row; inputs: ${await p.locator("input").count()}`);
    if (!opened) await shot(p, "qa45-no-subcategory-row");
    if (opened) { const subLoc = await sub.locator("xpath=..").getByRole("radio", { checked: true }).innerText().catch(() => ""); await typeAdd(sub, "Outside Canada"); await p.keyboard.press("Escape"); step("C11.3 a sub-category starts from its category's locations (category default Both)", /Both/.test(subLoc), subLoc); }
    else await call("POST", "/structure/nodes", { pathwayType: "INDIVIDUAL", level: "subCategory", label: "Outside Canada", parentKey: sql("select program_node_key from program_def where label='Study permit'") });
    await p.reload(); await p.getByRole("tree").waitFor();
    const cnt = Number(sql("select count(*) from program_def"));
    step("C11.3 the outline the page built is stored (2 pathways, 2 programs, 4 categories, 1 sub-category)", cnt === 9, cnt);

    // Pathway cards, Used by.
    const cards = p.locator("[data-pathway-cards]");
    step("S1 cards: All pathways, one card per Pathway, + Add pathway", await cards.getByRole("button").count() === 4, await cards.innerText().then((t) => t.replace(/\s+/g, " ")));
    await cards.getByRole("button", { name: /^Permanent residence/ }).click();
    await wait(300);
    step("S1 cards: a Pathway card opens only that tree and is in the address", /[?&]p=/.test(p.url()) && await item("Temporary residence").getAttribute("aria-expanded") === "false");
    await cards.getByRole("button", { name: /^All pathways/ }).click(); await wait(300);
    await item("Temporary residence").click();
    const usedBy = await text(p, "[data-used-by]");
    step("S1 Used by on a Pathway names every combination under it by its path, Not started without Open", /Visitors › Visitor visa/.test(usedBy) && /Study permits › Study permit › Outside Canada/.test(usedBy) && /Not started/.test(usedBy), usedBy.slice(0, 220));
    await axe(p, "Structure with panel at 1440 px");
    await shot(p, "s1-used-by");

    // Rename, reorder, a stale save from a second tab.
    const usesLoaded = p.waitForResponse((r) => /\/uses$/.test(new URL(r.url()).pathname));
    await item("Visitors").click(); await usesLoaded; await wait(600);
    const nameBox = p.getByLabel(/^Name/);
    await nameBox.fill("Visitor programs"); await p.getByRole("button", { name: "Save" }).click();
    await p.getByText(/^Saved/).waitFor({ timeout: 8000 }).catch(() => {});
    step("C11.3 rename in the panel keeps the key and says it is saved, in the panel (no toast)", sql("select label from program_def where label like 'Visitor progr%'") === "Visitor programs" && await p.locator("[role=status]").filter({ hasText: /^Saved/ }).count() >= 1 && await p.locator("li[data-sonner-toast], [data-radix-toast-viewport] li").count() === 0);
    await p.getByRole("button", { name: "Move down" }).click(); await p.getByText(/Moved "Visitor programs" down/).waitFor({ timeout: 8000 }).catch(() => {});
    step("C11.9 Move down applies at once (Study permits now first)", sql("select string_agg(label,'|' order by display_order) from program_def where node_kind='PROGRAM'") === "Study permits|Visitor programs");
    const p2 = await page(PA, "user-A", 1440);
    await p2.goto(p.url()); await p2.getByLabel(/^Name/).waitFor();
    await p2.getByLabel(/^Name/).fill("Visitor programs (tab 2)"); await p2.getByRole("button", { name: "Save" }).click(); await p2.getByText(/^Saved/).waitFor().catch(() => {});
    await nameBox.fill("Visitor programs (tab 1)"); await p.getByRole("button", { name: "Save" }).click();
    await p.getByText("Changed meanwhile").waitFor({ timeout: 8000 }).catch(() => {});
    step("C11.3 two tabs: the older tab's save is refused 'Changed meanwhile' with Reload and keeps what was typed", await p.getByText("Changed meanwhile").count() === 1 && await nameBox.inputValue() === "Visitor programs (tab 1)" && sql("select count(*) from program_def where label='Visitor programs (tab 2)'") === "1");
    await p.getByRole("button", { name: "Reload" }).click(); await p2.close();

    // Remove an unused name: second person approves on To review, the name is gone.
    await item("Tourist visa (to remove)").click();
    await p.getByRole("button", { name: "Remove" }).click();
    await p.getByLabel(/Why remove/).fill("Added by mistake (qa walk)"); await p.getByRole("button", { name: "Send for approval" }).click();
    await p.getByText(/Sent to a second person on To review/).waitFor({ timeout: 8000 }).catch(() => {});
    const chg = sql("select id from library_change where status='WAITING' order by proposed_at desc limit 1");
    step("C11.9 Remove waits for a second person (the name stays until approved)", !!chg && sql("select count(*) from program_def where label='Tourist visa (to remove)'") === "1");
    const self = await call("POST", `/library/changes/${chg}/approve`, {});
    step("C11.9 the person who asked cannot approve their own removal (403)", self.status === 403, self.status);
    const b = await page(PA, "user-B", 1440);
    await b.goto(`${b.base}/review`); await b.getByRole("link", { name: "Approve or return" }).first().click();
    await b.getByRole("heading", { name: /Tourist visa \(to remove\)/ }).waitFor();
    const reviewTitle = await b.getByRole("heading", { level: 1 }).innerText();
    await b.getByRole("button", { name: "Approve" }).click(); await b.waitForURL(/\/review$/);
    await wait(1500);
    step("C11.9 the approver approves on To review and the unused name is removed at once", sql("select count(*) from program_def where label='Tourist visa (to remove)'") === "0", sql(`select status from library_change where id='${chg}'`));
    step("QA-46 P-116: To review names the action as the page does ('Remove', not 'Delete')", !/^Delete/.test(reviewTitle), reviewTitle);
    // Read-only approver on the Structure page; the server refuses writes.
    await b.goto(`${b.base}/structure`); await b.getByRole("treeitem").filter({ has: b.getByText("Temporary residence", { exact: true }) }).first().click();
    step("BR-15 approver: Add pathway, the name and Save are disabled on the page", await b.locator("[data-pathway-cards]").getByRole("button", { name: /Add pathway/ }).isDisabled() && await b.getByLabel(/^Name/).isDisabled() && await b.getByRole("button", { name: "Save" }).isDisabled());
    const r403 = await call("POST", "/structure/nodes", { pathwayType: "INDIVIDUAL", level: "pathway", label: "By approver" }, "user-B");
    step("BR-15 approver by API: adding a name is 403 in plain words", r403.status === 403 && !!(r403.body?.detail), `${r403.status} ${r403.body?.detail}`);
    await axe(b, "Structure read-only (approver)");

    // Keyboard only: into the tree, arrows, Enter selects, add with Enter.
    const k = await page(PA, "user-A", 1440);
    await k.goto(`${k.base}/structure`); await k.getByRole("tree").waitFor();
    await k.getByRole("tree").locator("[tabindex='0']").first().focus();
    await k.keyboard.press("ArrowDown"); await k.keyboard.press("Enter");
    const panelOpen = await k.locator("aside[aria-label$='details']").count();
    step("Keyboard: arrow into the outline and Enter opens the details of the focused name", panelOpen === 1);
    await k.keyboard.press("End"); await k.keyboard.press("Enter");
    const endBox = k.getByRole("textbox", { name: /New pathway name in Retail/ });
    step("Keyboard: End reaches '+ Add pathway' and Enter opens its row, focused", await endBox.evaluate((e) => e === document.activeElement).catch(() => false));

    // Widths: 1024 px, 390 px.
    for (const w of [1024, 390]) {
      const s = await page(PA, "user-A", w);
      await s.goto(`${s.base}/structure`); await s.getByRole("tree").waitFor();
      step(`Structure at ${w} px: no sideways scroll`, await sideways(s) <= 0, `${await sideways(s)} px`);
      await s.getByRole("treeitem").filter({ hasText: /^Visitor programs/ }).first().click();
      const aside = s.locator("aside[aria-label$='details']");
      await aside.waitFor();
      const box = await aside.boundingBox();
      step(`Structure at ${w} px: the details panel fits the screen and closes`, !!box && box.x >= 0 && box.x + box.width <= w + 1 && await sideways(s) <= 0, box && `${Math.round(box.x)}+${Math.round(box.width)}`);
      if (w === 390) { await shot(s, "s1-390-panel"); await axe(s, "Structure with panel at 390 px"); }
      await s.getByRole("button", { name: "Close the details" }).click();
      await s.context().close();
    }
    // The Programs page lists the Not started combinations the Structure made.
    const pr = await call("GET", "/catalogue");
    step("C11.3 each last level added on the Structure is a combination listed Not started on Programs", (pr.body?.rows ?? []).length === 3 && pr.body.rows.every((r) => /not started/i.test(r.statusText ?? r.status ?? "")), (pr.body?.rows ?? []).map((r) => `${r.trail?.slice(2).join(" › ")}: ${r.status}`));
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
    await a.reload(); await a.getByRole("heading", { name: "Visitor visa", level: 1 }).waitFor();
    await a.getByText(/needs the browser extension \(later wave\)/i).first().waitFor({ timeout: 10000 }).catch(() => {});
    step("C11.1 W1-02: a line filed Online says it needs the browser extension (later wave)", /needs the browser extension \(later wave\)/i.test(await text(a)), (await text(a)).match(/.{40}later wave.{40}/i)?.[0]);
    await a.goto(`${a.base}/c/${vv}/preview`); await a.waitForLoadState("networkidle");
    await a.getByRole("button", { name: "Forms and coverage" }).click(); await a.waitForLoadState("networkidle");
    const prev = await text(a);
    step("C11.1 W1-02: Preview (draft) offers no Fill PDF on the Online line and says why", /needs the browser extension \(later wave\)/i.test(prev), prev.match(/.{60}IMM 5707.{80}/)?.[0] ?? prev.slice(0, 160));
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
      step("QA-40 C7.6: a case whose release files IMM 5707 Online still names IMM 5707 and says it is filed Online (later wave)", /IMM 5707/.test(casePage) && /Online|later wave/i.test(casePage.match(/.{0,120}IMM 5707.{0,160}/)?.[0] ?? ""), casePage.match(/.{0,80}IMM 5707.{0,120}/)?.[0] ?? "IMM 5707 not on the case page");
    } else step("QA-40 setup: a release with an Online IMM 5707 line and a case on it", false, `approve ${ap3.status} ${ap3.body?.detail ?? ""} · case ${oc.status} ${oc.body?.detail ?? ""}`);
    await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD" });

    // Retire a Live combination; the approver approves; the release applies it; then Restore (P-116, L2–L4).
    const leaf = sql("select program_node_key from program_def where label='Visitor visa'");
    const panel = async () => { await a.goto(`${a.base}/structure?node=${encodeURIComponent(leaf)}`); await a.locator("aside[aria-label$='details']").waitFor(); await a.getByText("Where used", { exact: true }).waitFor(); await wait(500); };
    await panel();
    const usedLeaf = await text(a, "[data-used-by]");
    step("S1 Used by on a Live combination says its state with Open to its page", /Live/.test(usedLeaf) && await a.locator("[data-used-by]").getByRole("link", { name: "Open" }).getAttribute("href") === `/c/${vv}`, usedLeaf);
    const whereUsed = await text(a, "section[aria-label='Where used']");
    const retireLeafOff = await a.getByRole("button", { name: "Retire" }).isDisabled();
    step("C11.9 a released name cannot be removed; its Retire waits until its combination is retired, and Where used says so", await a.getByRole("button", { name: "Remove" }).isDisabled() && retireLeafOff && /retire it first/.test(whereUsed), whereUsed.slice(0, 200));
    // QA-48: "retire it first" — but no screen retires a combination (Structure panel on the leaf, combination page, Programs).
    await a.goto(`${a.base}/c/${vv}`); await a.getByRole("heading", { name: "Visitor visa", level: 1 }).waitFor();
    const comboRetire = await a.getByRole("button", { name: /^Retire/ }).count();
    await a.goto(`${a.base}/`); await a.waitForLoadState("networkidle");
    const programsRetire = await a.getByRole("button", { name: /^Retire/ }).count() + await a.getByRole("menuitem", { name: /^Retire/ }).count();
    step("QA-48 C11.9 P-116: a person can retire a released combination on a screen (the Structure says 'retire it first')", comboRetire + programsRetire > 0, `combination page ${comboRetire}, Programs ${programsRetire}: only POST /combinations/:id/retire`);
    // The rest through the API, as no screen offers it yet.
    await call("POST", `/combinations/${vv}/retire`, { reason: "Replaced by a new program (qa walk)" });
    const rc = sql("select id from library_change where action='RETIRE' and status='WAITING' limit 1");
    const selfOk = await call("POST", `/library/changes/${rc}/approve`, {}, "user-A");
    const apr = await call("POST", `/library/changes/${rc}/approve`, {}, "user-B");
    const rel = await release("qa: retire");
    const stillListed = await listed("all");
    const retiredList = await listed("retired");
    const newCase = await call("POST", "/runtime/cases", { combinationId: vv, reference: "QA-RET-1", clientActor: "user-P", principal: { displayName: "Sample Applicant R" } }, "user-O");
    step("C11.9 retiring a combination: the asker cannot approve (403); after approval and release it leaves 'All', shows under Retired, and no new case opens (409, plain)", selfOk.status === 403 && apr.status < 300 && rel.status < 300 && !stillListed && retiredList && newCase.status === 409, `self ${selfOk.status} approve ${apr.status} release ${rel.status} listed=${stillListed} retired=${retiredList} case=${newCase.status} ${newCase.body?.detail ?? ""}`);
    // Now the name itself can be retired on the page.
    await panel();
    const leafNow = await a.getByRole("button", { name: "Retire" }).isEnabled();
    if (leafNow) { await a.getByRole("button", { name: "Retire" }).click(); await a.getByLabel(/Why retire/).fill("Replaced by a new program (qa walk)"); await a.getByRole("button", { name: "Send for approval" }).click(); await a.getByText(/Sent to a second person/).waitFor({ timeout: 8000 }).catch(() => {}); }
    const rn = sql("select id from library_change where action='RETIRE' and kind='structure_node' and status='WAITING' limit 1");
    if (rn) { await call("POST", `/library/changes/${rn}/approve`, {}, "user-B"); await release("qa: retire name"); }
    const pick = JSON.stringify((await call("GET", "/path-options?pathway=INDIVIDUAL")).body?.programs ?? []); const leafRetired = sql(`select retired_at is not null from program_def where program_node_key='${leaf}'`);
    step("C11.9 once its combination is retired, the name retires from the panel and leaves the pickers", leafNow && !!rn && sql(`select retired_at is not null from program_def where program_node_key='${leaf}'`) === "t" && !pick.includes("Visitor visa"), `enabled=${leafNow} change=${!!rn} retired=${leafRetired} in pickers=${pick.includes("Visitor visa")}`);
    // Restore: the name from the panel, then the combination (API only, QA-48).
    await panel();
    const restoreOn = await a.getByRole("button", { name: "Restore" }).isEnabled();
    if (restoreOn) { await a.getByRole("button", { name: "Restore" }).click(); await a.getByLabel(/Why restore/).fill("Still filed (qa walk)"); await a.getByRole("button", { name: "Send for approval" }).click(); await a.getByText(/Sent to a second person/).waitFor({ timeout: 8000 }).catch(() => {}); }
    const rs = sql("select id from library_change where action='RESTORE' and kind='structure_node' and status='WAITING' limit 1");
    if (rs) { await call("POST", `/library/changes/${rs}/approve`, {}, "user-B"); await release("qa: restore name"); }
    await call("POST", `/combinations/${vv}/restore`, { reason: "Still filed (qa walk)" });
    const crs = sql("select id from library_change where action='RESTORE' and kind='combination' and status='WAITING' limit 1");
    if (crs) { await call("POST", `/library/changes/${crs}/approve`, {}, "user-B"); await release("qa: restore combination"); }
    const back = await listed("all");
    const case2 = await call("POST", "/runtime/cases", { combinationId: vv, reference: "QA-RET-2", clientActor: "user-P", principal: { displayName: "Sample Applicant R" } }, "user-O");
    step("C11.9 Restore: the name from the panel, then the combination, each approved and released; it is back and cases open again", restoreOn && !!rs && back && case2.status < 300, `panel restore=${restoreOn} name change=${!!rs} listed=${back} case=${case2.status} ${case2.body?.detail ?? ""}`);
  }

  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
