// S4 slice 3 (W1-06, P-123, P-116; walkthrough v2 S4): Shared library › Forms walked like a person in a real browser.
// Empty before anything is loaded → the sample → one list with Type / Used by / Status filters and a search → a guide
// stored by the form finder (rules only, US$0) → Upload PDF with two files (two run cards) → the row drawer (Definition,
// What IRCC accepts, Where used, History) by mouse and keyboard → the ⋯ menu (Replace, Re-read with AI, Where used,
// Retire, Delete) → Retire refused with the reason → Delete of an unused form asked of a second person → read-only for
// a person without the author duty → a long title → no match → what IRCC accepts set by hand and approved by a second
// person (C11.18). Screenshots at 1440, 1024 and 390 px (FINISH) into
// product/screens/W1-form-library/screenshots/slice3/, axe (WCAG 2.2 AA) on each state. US$0 (no model call).
//   zsh studio/tools/isolated.sh forms_s4l 4458 start && node studio/tests/check_forms_s4_library_browser.cjs 4458 xr_studio_forms_s4l
const path = require("node:path"); const fs = require("node:fs"); const os = require("node:os"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { speed } = require("./speed_budget.cjs"); // P-184: speed budgets judged only when the Mac is not busy
const PORT = Number(process.argv[2] ?? 4458), DB = process.argv[3] ?? "xr_studio_forms_s4l";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-form-library", "screenshots", "slice3"); fs.mkdirSync(SHOTS, { recursive: true });
const PDF = path.join(ROOT, "official-sources", "ircc", "forms", "imm5604e.pdf"), PDF2 = path.join(ROOT, "official-sources", "ircc", "forms", "imm1344e.pdf");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.json !== undefined ? JSON.stringify(init.json) : undefined }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  const shot = async (name) => { for (const w of [1440, 1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await sleep(150); await p.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`), fullPage: true }); } await p.setViewportSize({ width: 1440, height: 900 }); };
  const axe = async (label) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe (WCAG 2.2 AA): ${label}`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes.map((n) => `${n.target.join(" ")} ${(n.any[0]?.message ?? "").slice(0, 120)}`).join(" | ")})`).join("; ")); };
  const as = async (id) => { await p.evaluate((x) => localStorage.setItem("xr-actor", x), id); };
  const rows = () => p.locator("tr[data-form]");
  const forms = async () => (await rows().evaluateAll((els) => els.map((e) => e.getAttribute("data-form"))));
  const open = async () => { await p.goto(`${BASE}/library/forms`); await p.waitForFunction(() => !document.querySelector('[aria-label="Loading forms"]') && (document.querySelector("tr[data-form]") || /No forms yet|No form matches/.test(document.querySelector("main")?.textContent ?? "")), null, { timeout: 30_000 }); };
  try {
    await p.goto(`${BASE}/`); await as("user-A");
    let t0 = Date.now(); await open(); const cold = Date.now() - t0; // the server's and browser's first page: reported, not judged
    t0 = Date.now(); await open();
    { const s = speed("performance: Forms first view under 1 s (empty library)", Date.now() - t0 < 1000, `${Date.now() - t0} ms (cold first page ${cold} ms)`); step(s.label, s.ok, s.detail); }
    step("C11.11: an empty library teaches the first action (the finder brings forms in; or Upload PDF)", /No forms yet/.test(await p.locator("main").textContent()) && /form finder/.test(await p.locator("main").textContent()));
    await axe("empty library"); await shot("01-empty");

    await api("/demo/load", { method: "POST" });
    const vv = sql(`select id from combination where label='Visitor visa' limit 1`);
    const plan = (await api(`/combinations/${vv}/forms/find/plan`, { method: "POST", json: { mode: "rules" } })).body;
    const run = (await api(`/combinations/${vv}/forms/find`, { method: "POST", json: { mode: "rules", planSha256: plan.plan_sha256, idempotencyKey: `s4l-${Date.now()}` } })).body;
    for (let i = 0; i < 60 && ["queued", "running"].includes((await api(`/runs/${run.id}`)).body?.status); i++) await sleep(500);
    t0 = Date.now(); await open();
    { const s = speed("performance: Forms first view under 1 s with the sample", Date.now() - t0 < 1000, `${Date.now() - t0} ms`); step(s.label, s.ok, s.detail); }
    const head = await p.locator("thead").innerText();
    step("C11.11: one list with the board's columns (Number, Title, Type, Edition, Field map, IRCC accepts, Used by, Status)", ["Number", "Title", "Type", "Edition", "Field map", "IRCC accepts", "Used by", "Status"].every((h) => head.includes(h)), head);
    step("C11.11: forms, guides and checklists in one list (no groups); the guide the finder read is in it", (await forms()).includes("IMM 5257") && (await forms()).includes("Guide 5256") && (await forms()).includes("IMM 5484"), (await forms()).join(","));
    step("C11.11 (change 2): IRCC accepts shows the value with who said it (IMM 5476: PDF upload · Sample · canada.ca words); a form whose page says nothing shows Not set yet (IMM 5257)", /PDF upload\s*Sample · canada\.ca words/.test(await rows().filter({ hasText: "IMM 5476" }).first().innerText()) && /Not set yet/.test(await rows().filter({ hasText: "IMM 5257" }).first().innerText()), await rows().filter({ hasText: "IMM 5476" }).first().innerText());
    step("C11.11 (change 2): guides and checklists say Not filed", /Not filed/.test(await rows().filter({ hasText: "IMM 5484" }).first().innerText()) && /Not filed/.test(await rows().filter({ hasText: "Guide 5256" }).first().innerText()));
    step("C11.11 (change 3): a guide's date says what it is (Updated on canada.ca, or when it was read), never an edition", /Updated on canada\.ca|Read from canada\.ca on/.test(await rows().filter({ hasText: "Guide 5256" }).first().innerText()), await rows().filter({ hasText: "Guide 5256" }).first().innerText());
    step("C11.11 (change 1): Used by shows the combination's place", / › /.test(await rows().filter({ hasText: "IMM 1295" }).first().innerText()), await rows().filter({ hasText: "IMM 1295" }).first().innerText());
    // C3.12 (P-123): the Field map column, from the current edition's own rows (the sample's IMM 1295 has form fields with no decision yet).
    const fm1295 = sql(`with r as (select distinct on (data_path) status, outcome from form_field_map where form_edition_id = (select id from form_edition where edition_label = 'IMM 1295 (09-2023)') and status in ('DRAFT', 'PUBLISHED', 'RETIRED') order by data_path, (status = 'DRAFT') desc, version desc) select count(*) filter (where status <> 'RETIRED' and outcome <> 'unresolved') || ' of ' || count(*) filter (where status <> 'RETIRED') from r`);
    step("C3.12: a Field map column; IMM 1295 says how many of its form fields are decided (the database's count), a guide says No field map", head.includes("Field map") && (await rows().filter({ hasText: "IMM 1295" }).first().locator("[data-field-map]").innerText()).includes(`${fm1295} form fields decided`) && (await rows().filter({ hasText: "Guide 5256" }).first().locator("[data-field-map]").innerText()) === "No field map", { head, fm1295, cell: await rows().filter({ hasText: "IMM 1295" }).first().locator("[data-field-map]").innerText().catch((e) => String(e)) });
    await axe("list with the sample"); await shot("02-list");

    // Upload PDF: one way in, many files (two cards)
    step("C11.11 (Lead fix 4): one way in: Upload PDF, no second \"Choose files\" box", (await p.getByRole("button", { name: "Upload PDF" }).count()) === 1 && (await p.getByText("Add forms to the library").count()) === 0);
    await p.setInputFiles('input[aria-label="Choose PDFs to upload"]', [PDF, PDF2]);
    await p.locator("section[data-run-status]").nth(1).waitFor({ timeout: 30_000 });
    for (let i = 0; i < 120 && (await p.locator('section[data-run-status="done"]').count()) < 2; i++) await sleep(500);
    step("C11.11: two files, two run cards, both Done (rules read them, no AI call)", (await p.locator('section[data-run-status="done"]').count()) === 2 && (await p.locator("section[data-run-status]").allInnerTexts()).every((t) => /No AI call was made/.test(t)));
    // DV-bb-1 (outside review, screens lane): finished upload results can be put away, one at a time; they do not stack forever.
    const cards = p.locator("section[data-run-status]"), firstName = await cards.first().getAttribute("aria-label");
    await cards.first().locator("[data-run-dismiss]").click(); await sleep(300);
    step("DV-bb-1 pass: a finished upload card has Dismiss; it removes that card only", (await cards.count()) === 1 && (await cards.first().getAttribute("aria-label")) !== firstName && (await cards.first().locator("[data-run-dismiss]").count()) === 1, `${await cards.count()} card(s) left`);
    await open();
    step("DV-bb-1 fail: a dismissed card does not come back after the page reloads", (await cards.count()) === 1, `${await cards.count()} card(s) after reload`);
    await cards.first().locator("[data-run-dismiss]").click(); await sleep(300);
    step("C11.11: the uploaded forms are in the list afterwards", (await forms()).includes("IMM 5604") && (await forms()).includes("IMM 1344"));
    // DV-bb-5 (outside review): the form number is in the row's own typeface (same family as the title), not a mono type.
    const fonts = await p.locator("tr[data-form]").first().evaluate((tr) => [...tr.querySelectorAll("td")].slice(0, 2).map((td) => getComputedStyle(td.querySelector("button, span") ?? td).fontFamily));
    step("DV-bb-5 pass: the form number and the title use one font family", fonts.length === 2 && fonts[0] === fonts[1], fonts.join(" | "));
    step("DV-bb-5 fail: no mono type on the form number", !/mono/i.test(fonts[0] ?? "") && (await p.locator("tr[data-form] td.mono").count()) === 0, fonts[0]);
    await p.setInputFiles('input[aria-label="Choose PDFs to upload"]', [PDF, PDF2]); await p.locator("section[data-run-status]").nth(1).waitFor();
    await shot("03-upload-two-files");

    // Filters and search
    await open();
    await p.getByRole("button", { name: /^Guides/ }).click(); await sleep(400);
    step("C11.11: Type = Guides lists guides only", (await forms()).length > 0 && (await forms()).every((c) => /^Guide /.test(c)), (await forms()).join(","));
    await axe("filtered to guides"); await shot("04-filter-guides");
    await p.getByRole("button", { name: /^All/ }).click(); await sleep(300);
    const lmia = await p.getByLabel("Used by", { exact: true }).locator("option").filter({ hasText: "With an LMIA" }).first();
    step("C11.11 (change 1), C11.3 QA-150: the Used by choices name each combination first, then its full place from the Pathway type (a closed filter still tells them apart)", /^With an LMIA · Retail › .* › /.test(await lmia.textContent()), await lmia.textContent());
    await p.getByLabel("Used by", { exact: true }).selectOption(await lmia.getAttribute("value")); await sleep(400);
    const wp = sql(`select id from combination where label='With an LMIA' limit 1`);
    const vvForms = sql(`select string_agg(lineage_key, ',') from (select distinct on (lineage_key) lineage_key, status from combination_form where combination_id='${wp}' order by lineage_key, version desc) x where status <> 'RETIRED'`).split(",").filter(Boolean);
    // Lead note 28 Oct: Load sample puts its guide in the library too (Guide 5487, which the combination reads as a source).
    // C11.11 (QA-101): its checklists IMM 5488 and IMM 5905 are sources it reads, never lines it files; Used by lists them.
    const wpFiles = [...vvForms, "Guide 5487", "IMM 5488", "IMM 5905"];
    step("C11.11: Used by = With an LMIA lists exactly the forms it files and the guide and checklists it reads (and only those)", !vvForms.includes("IMM 5488") && !vvForms.includes("IMM 5905") && vvForms.length > 0 && JSON.stringify((await forms()).sort()) === JSON.stringify(wpFiles.sort()), `${(await forms()).join(",")} | ${wpFiles.join(",")}`);
    await p.getByLabel("Used by", { exact: true }).selectOption(""); await sleep(300);
    sql(`update gov_form_def set retired_at = now(), retired_by = 'user-A' where form_key = 'IMM 5488'`);
    await open(); await p.getByRole("button", { name: /^Retired/ }).click(); await sleep(400);
    step("C11.11: Status = Retired lists the retired form, marked Retired", JSON.stringify(await forms()) === JSON.stringify(["IMM 5488"]) && /Retired/.test(await rows().first().innerText()));
    await shot("05-filter-retired");
    await p.getByRole("button", { name: /^Retired/ }).click(); await sleep(300);
    await p.getByLabel("Search number or title").fill("zzz-no-such-form"); await sleep(500);
    step("C11.11: a search that matches nothing says so and offers Clear filters", /No form matches/.test(await p.locator("main").textContent()) && (await p.getByRole("button", { name: "Clear filters" }).count()) === 1);
    await axe("no match"); await shot("06-no-match");
    await p.getByRole("button", { name: "Clear filters" }).click(); await sleep(300);
    await p.getByLabel("Search number or title").fill("1295"); await sleep(500);
    step("C11.11: search finds a form by its number", (await forms()).includes("IMM 1295") && (await forms()).every((c) => /1295/.test(c)), (await forms()).join(","));

    // Drawer by keyboard
    await p.getByRole("button", { name: "IMM 1295", exact: true }).focus(); await p.keyboard.press("Enter");
    const dlg = p.getByRole("dialog"); await dlg.waitFor();
    await dlg.getByText("With an LMIA").first().waitFor({ timeout: 10_000 });
    const dt = await dlg.innerText();
    step("C11.11: the row drawer opens by keyboard with Definition, What IRCC accepts, Where it is used and History", ["Definition", "What IRCC accepts", "Where it is used", "History"].every((h) => dt.includes(h)), dt.slice(0, 200));
    step("C11.11: the drawer says where the form came from and whether canada.ca was compared, the fingerprint kept in Details", /Official copy loaded with the sample|Downloaded from canada.ca|Uploaded by a person/.test(dt) && /checked|No canada\.ca page recorded yet/.test(dt) && (await dlg.locator("details").count()) === 1);
    step("C11.11: Where it is used lists the LMIA combination and its release", /With an LMIA/.test(dt) && /release/.test(dt), dt.slice(dt.indexOf("Where it is used"), dt.indexOf("Where it is used") + 200));
    step("C3.12: the drawer's Definition says the field map of the current edition, with what it means", /Field map: \d+ of \d+ form fields decided/.test(dt) && /from an earlier release, not decided yet/.test(dt) && !/on To review/.test(dt.slice(dt.indexOf("Field map:"), dt.indexOf("Field map:") + 400)), dt.slice(0, 400));
    step("C3.12 K3 pass: the drawer says IRCC's month and where it is read (IMM 1295: Published 2023-09, printed on the form)", /Published 2023-09 \(printed on the form\)/.test(dt), dt.slice(0, 300));
    step("C3.12 K3 pass: the file's own date is kept apart and said not to be IRCC's (file saved 2026-06-04)", /File saved 2026-06-04: the PDF's own date, not when IRCC published it/.test(dt), dt.slice(0, 400));
    step("C3.12 K3 fail: the drawer never presents the PDF file's date as the published date", !/Published 2026-06-04/.test(dt));
    await axe("row drawer"); await shot("07-drawer");
    await p.keyboard.press("Escape"); await sleep(300);
    step("review M8: closing the drawer puts focus back on the number that opened it", await p.evaluate(() => document.activeElement?.textContent === "IMM 1295"), await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
    step("review minor: the table's name includes every column, IRCC accepts too", /IRCC accepts/.test((await p.locator('[role="region"][aria-label^="Table:"]').first().getAttribute("aria-label")) ?? ""));
    step("review M8: the hidden file input is not a stop of its own when tabbing", (await p.locator('input[type="file"]').getAttribute("tabindex")) === "-1");
    // C3.12 published date in the list: its own line under the edition at 1440, in the short line at 1024 and 400; no sideways scroll.
    await p.getByLabel("Search number or title").fill("1295"); await sleep(500);
    step("C3.12 K3 pass: at 1440 the Edition column shows IRCC's published month under the edition", /^Published 2023-09$/.test((await p.locator('tr[data-form="IMM 1295"] [data-published]').innerText()).trim()));
    sql("update form_edition set published = '' where edition_label = 'IMM 5409 (01-2023)'");
    await open(); await p.getByLabel("Search number or title").fill("5409"); await sleep(600);
    step("C3.12 K3 fail: a file that names no date of its own still shows IRCC's printed month (IMM 5409: Published 2023-01)", /^Published 2023-01$/.test((await p.locator('tr[data-form="IMM 5409"] [data-published]').innerText()).trim()));
    sql("update form_edition set published = '?' where edition_label = 'IMM 5409 (01-2023)'");
    await open(); await p.getByLabel("Search number or title").fill("5409"); await sleep(600);
    step("C3.12 K3 fail: a file that could not be read never hides IRCC's printed month (IMM 5409: Published 2023-01)", /^Published 2023-01$/.test((await p.locator('tr[data-form="IMM 5409"] [data-published]').innerText()).trim()));
    await p.getByLabel("Search number or title").fill(""); await sleep(500);
    for (const w of [1440, 1024, 400]) {
      await p.setViewportSize({ width: w, height: 900 }); await sleep(300);
      const sh = w < 1280 ? (await p.locator('tr[data-form="IMM 1295"] [data-published-short]').innerText().catch(() => "")).trim() : "wide";
      const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (w < 1280) { const lines = await p.locator('tr[data-form="IMM 1295"] [data-published-short] [data-published-date]').evaluate((e) => e.getClientRects().length); step(`C3.12 review m1 fail: at ${w} px the date never breaks in the middle (one line box)`, lines === 1, lines); }
      step(`C3.12 published: at ${w} px the date is shown${w < 1280 ? " in the row's short line" : ""} and the page has no sideways scroll`, (w >= 1280 || /Published 2023-09/.test(sh)) && !wide, `${sh} · wide=${wide}`);
      if (w === 400) { await axe("Forms list at 400 px with published dates"); await p.screenshot({ path: path.join(SHOTS, "c312-published-400.png"), fullPage: true }); }
    }
    await p.setViewportSize({ width: 1440, height: 900 }); await sleep(200);
    await p.locator('tr[data-form="IMM 1295"]').scrollIntoViewIfNeeded(); // review m3: the evidence shows the dates, not the upload cards
    await p.screenshot({ path: path.join(SHOTS, "c312-published-1440.png") });
    await p.getByLabel("Search number or title").fill(""); await sleep(500);
    await p.setViewportSize({ width: 1024, height: 900 }); await sleep(300);
    const fits = await p.evaluate(() => { const reg = document.querySelector('[role="region"][aria-label^="Table:"]'); return !!reg && reg.scrollWidth <= reg.clientWidth + 1 && [...document.querySelectorAll('tr[data-form] td:last-child button')].every((b) => b.getBoundingClientRect().right <= reg.getBoundingClientRect().right + 1); });
    step("review round 2 M1: at 1024 px with every sample row, the table fits: every ⋯ in view, no sideways scroll", fits, await p.evaluate(() => { const reg = document.querySelector('[role="region"][aria-label^="Table:"]'); return reg ? [reg.scrollWidth, reg.clientWidth] : null; }));
    await p.getByRole("button", { name: /^All/ }).first().focus(); await p.keyboard.press("Tab"); await p.keyboard.press("Shift+Tab");
    step("review round 2 M5: keyboard focus is visible on a filter chip (a ring, not nothing)", await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.boxShadow !== "none" || (s.outlineStyle !== "none" && s.outlineWidth !== "0px"); }), await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
    const inView = await p.evaluate(() => { const r = document.querySelector('tr[data-form] td:last-child button')?.getBoundingClientRect(), t = [...document.querySelectorAll('tr[data-form] td')].find((td) => td.textContent?.match(/Ready|Needs your OK|Newer file|Retired/))?.getBoundingClientRect(); return !!r && !!t && r.right <= window.innerWidth && t.right <= window.innerWidth; });
    step("review M5: at 1024 px the Status and ⋯ columns stay in view (no sideways scroll to reach them)", inView);
    step("review M5: Used by shows the combination's own name first, its place after it, muted", /^With an LMIA · /.test((await p.locator('tr[data-form="IMM 1295"] td').nth(6).innerText()).trim()), await p.locator('tr[data-form="IMM 1295"] td').nth(6).innerText());
    await p.setViewportSize({ width: 1440, height: 900 }); await sleep(200);

    // P-116 amended (28 Oct): one written row action from the state, its reason as visible text; the ⋯ menu keeps the rest
    await p.getByLabel("Search number or title").fill(""); await sleep(400);
    const row1295 = p.locator('tr[data-form="IMM 1295"]'), act1295 = row1295.locator("[data-action]");
    const why1295 = await p.locator('tr[data-reason-for="IMM 1295"] [data-blocked-line]').innerText().catch(() => "no reason line");
    step("P-116 amended: IMM 1295 (filed by a release) shows one written action, Retire, greyed with the guard's reason as visible text", (await act1295.getAttribute("data-action")) === "RETIRE" && (await act1295.getAttribute("aria-disabled")) === "true" && /Still used|Not possible|retire/i.test(why1295), why1295);
    await act1295.click({ force: true }); await sleep(300); // aria-disabled: the click is forced to prove it opens nothing
    step("P-116 amended fail: the greyed action is described by its reason (aria-describedby) and opens nothing", (await act1295.getAttribute("aria-describedby")) === (await p.locator('tr[data-reason-for="IMM 1295"] [data-blocked-line]').getAttribute("id")) && (await p.locator("[data-impact-panel]").count()) === 0);
    await p.getByRole("button", { name: "Actions for IMM 1295", exact: true }).click();
    const menu = p.getByRole("menu"); await menu.waitFor();
    const mt = await menu.innerText();
    step("C11.11 (P-123, P-116 amended): the ⋯ menu keeps Replace, Re-read with AI and See where it is used; Retire and Delete are the row's written action, not in it", ["Replace with a new edition", "Re-read with AI", "See where it is used"].every((x) => mt.includes(x)) && !/Retire|Delete/.test(mt), mt);
    await shot("08-row-menu"); await p.keyboard.press("Escape"); await sleep(200);
    await axe("row actions with a reason shown"); await shot("09-retire-refused");
    // Review must 1 (P-51): IMM 5604 is canada.ca's own file (its upload matched the form page), so its action is Retire, never Delete.
    const row5604 = p.locator('tr[data-form="IMM 5604"]'), act5604 = row5604.locator("[data-action]");
    step("review must 1 (P-51): an official canada.ca file's action is Retire, never Delete (it is kept)", (await act5604.getAttribute("data-action")) === "RETIRE" && (await act5604.getAttribute("aria-disabled")) === null);
    await act5604.click();
    const pane = p.locator("[data-impact-panel]"); await pane.waitFor();
    const paneText = await pane.innerText();
    step("P-116 amended: the confirm opens in the right panel: what happens, who approves and when (never a centred modal)", /Retire "IMM 5604/.test(paneText) && /A second person, on To review/.test(paneText) && (await p.getByRole("dialog").count()) === 0, paneText.slice(0, 200));
    step("P-116 amended fail: Send for approval waits for a reason", await pane.locator("[data-confirm-send]").isDisabled());
    step("QA-64: the confirm says a library retire takes effect when it is approved, not with the next release", /When it is approved/.test(paneText) && !/next release/.test(paneText), paneText.slice(0, 300));
    await pane.getByLabel(/Why retire it/).fill("Uploaded by mistake; no combination uses it");
    await sleep(400); // Send has just turned from disabled to enabled: scan after its colour transition, not mid-way
    await axe("retire confirm (impact panel)");
    await pane.locator("[data-confirm-send]").click();
    for (let i = 0; i < 20 && !sql(`select status from library_change where kind='library_form' and key='IMM 5604'`); i++) await sleep(250);
    step("C11.11 (P-116): Retire of an unused official form is asked of a second person (waiting on To review)", sql(`select status from library_change where kind='library_form' and key='IMM 5604'`) === "WAITING");
    await sleep(800);
    step("break minor: the row shows the request waiting (\"Retire waiting\"), not just Ready", /Retire waiting/.test(await row5604.innerText()));
    step("P-116 amended: the author's own waiting change makes the row's action Withdraw, and the Undo toast shows", (await act5604.getAttribute("data-action")) === "WITHDRAW" && (await p.locator("[data-undo-toast]").count()) === 1, await act5604.getAttribute("data-action"));
    // takesEffect (Lead 28 Oct, with R69): only a library Retire or Restore says "When it is approved"; Withdraw has no Takes effect line.
    await act5604.click(); await pane.waitFor();
    const wText = await pane.innerText();
    step("R69 takesEffect fail: the Withdraw confirm has no Takes effect line (the override is for Retire and Restore only)", /Withdraw/.test(wText) && !/Takes effect/.test(wText), wText.slice(0, 200));
    await pane.getByRole("button", { name: "Cancel" }).click(); await sleep(200);
    // R69-2: the list's cache is keyed by the person, so switching person (no reload) reads their own row actions.
    await p.getByLabel("Simulated person").first().selectOption("user-B");
    await p.waitForFunction(() => document.querySelector('tr[data-form="IMM 5604"] [data-action]')?.getAttribute("data-action") !== "WITHDRAW", null, { timeout: 5000 });
    step("R69-2 fail: after switching to another person without reloading, the author's Withdraw is not shown to them (their own action, greyed)", (await act5604.getAttribute("data-action")) === "RETIRE" && (await act5604.getAttribute("aria-disabled")) === "true", await act5604.getAttribute("data-action"));
    await p.getByLabel("Simulated person").first().selectOption("user-A");
    await p.waitForFunction(() => document.querySelector('tr[data-form="IMM 5604"] [data-action]')?.getAttribute("data-action") === "WITHDRAW", null, { timeout: 5000 });
    step("R69-2 pass: switching back to the author shows Withdraw of their own waiting change again", (await act5604.getAttribute("data-action")) === "WITHDRAW");
    // QA-66 (R69-1) and QA-68: the second person returns the retire; the author's row says so and keeps Withdraw, and the
    // change's page sends it again with what changed only (no Name or Meaning to edit).
    const rid5604 = sql(`select id from library_change where kind='library_form' and key='IMM 5604' and status='WAITING' limit 1`);
    await api(`/library/changes/${rid5604}/return`, { method: "POST", json: { note: "Say why it was uploaded by mistake" }, actor: "user-B" });
    await open();
    step("QA-66 pass: the author's row says the retire was returned and offers Withdraw (never a greyed Delete)", /Retire returned/.test(await row5604.innerText()) && (await act5604.getAttribute("data-action")) === "WITHDRAW" && (await act5604.getAttribute("aria-disabled")) === null, (await row5604.innerText()).replace(/\s+/g, " ").slice(0, 160));
    await p.goto(`${BASE}/review/change/${rid5604}`); await p.locator("[data-send-again]").waitFor();
    const again = p.locator("[data-send-again]");
    step("QA-68 fail: a returned retire's page offers no Name or Meaning to edit (they would be dropped)", (await again.getByLabel("Name", { exact: true }).count()) === 0 && (await again.getByLabel("Meaning", { exact: true }).count()) === 0 && (await p.locator("[data-correct]").count()) === 0);
    await axe("returned retire: send again");
    await again.getByLabel("What you corrected").fill("Checked again: no combination uses it");
    await again.getByRole("button", { name: "Send again" }).click();
    for (let i = 0; i < 20 && sql(`select status from library_change where id='${rid5604}'`) !== "WAITING"; i++) await sleep(250);
    step("QA-68 pass: Send again with only what changed puts it back with a second person", sql(`select status || '|' || reason from library_change where id='${rid5604}'`) === "WAITING|Checked again: no combination uses it");
    await open();
    await shot("10-delete-asked");

    // Read-only, long title
    await as("user-B"); await open();
    step("C11.11: a person without the author duty sees no Upload PDF", (await p.getByRole("button", { name: "Upload PDF" }).count()) === 0);
    step("P-116 amended: and the row's action is greyed for them", (await p.locator('tr[data-form="IMM 1295"] [data-action]').getAttribute("aria-disabled")) === "true");
    await p.getByRole("button", { name: "Actions for IMM 1295", exact: true }).click();
    step("C11.11: and every changing menu action is disabled; See where it is used stays", (await p.getByRole("menuitem", { name: /Replace/ }).getAttribute("data-disabled")) !== null && (await p.getByRole("menuitem", { name: /See where it is used/ }).getAttribute("data-disabled")) === null);
    await p.keyboard.press("Escape"); await axe("read-only"); await shot("11-read-only");
    // Lead 28 Oct (carried should, P-116): the second person sees Where used on the retire's approval page before deciding
    const retireId = sql(`select id from library_change where kind='library_form' and key='IMM 5604' and status='WAITING' limit 1`);
    await p.goto(`${BASE}/review/change/${retireId}`); await p.locator("[data-change-uses]").getByText(/Nothing uses it|·/).first().waitFor();
    const usesText = await p.locator("[data-change-uses]").innerText();
    step("P-116: the second person's retire page shows Where it is used before Approve (IMM 5604: nothing uses it)", /Where it is used/.test(usesText) && /Nothing uses it/.test(usesText) && !/Retire waiting/.test(usesText) && (await p.getByRole("button", { name: "Approve" }).count()) === 1, usesText.replace(/\s+/g, " ").slice(0, 160));
    await axe("retire approval with where used");
    await as("user-A");
    sql(`update gov_form_def set display_name = 'Application to Change Conditions, Extend my Stay or Remain in Canada as a Worker, with a much longer title than any IRCC form usually has, for the long-content state' where form_key = 'IMM 1344'`);
    await open();
    const long = rows().filter({ hasText: "IMM 1344" }).first().locator("td").nth(1).locator("span[title]");
    step("C11.11: a long title is clamped to two lines and kept whole in its tooltip", (await long.count()) === 1 && /long-content state/.test(await long.getAttribute("title")) && /line-clamp-2/.test(await long.getAttribute("class")), `${await long.count()} ${await rows().filter({ hasText: "IMM 1344" }).first().innerHTML().catch(() => "no row")}`.slice(0, 300));
    await shot("12-long-title");

    // C11.18: set what IRCC accepts by hand in the side panel; a second person approves on To review
    await p.getByRole("button", { name: "IMM 1295", exact: true }).click();
    const sp = p.getByRole("dialog"); await sp.waitFor();
    await sp.getByRole("button", { name: /Set what IRCC accepts|Correct what IRCC accepts/ }).click();
    await sp.getByRole("checkbox", { name: "PDF upload", exact: true }).check(); await sp.getByRole("checkbox", { name: "Online", exact: true }).check(); // P-143: ways IRCC accepts, for any account
    await sp.getByRole("button", { name: "Send for a second person" }).click(); await sleep(500);
    step("C11.18 fail: sending with neither the canada.ca line nor a reason says what is missing, nothing is sent", /canada\.ca line|say why/i.test(await sp.innerText()) && sql(`select count(*) from library_change where kind='form_accepts'`) === "0");
    await axe("set what IRCC accepts"); await shot("13-set-accepts");
    await sp.getByLabel("The canada.ca line it comes from").fill("You can apply online or on paper with this form.");
    await sp.getByRole("button", { name: "Send for a second person" }).click();
    for (let i = 0; i < 20 && sql(`select count(*) from library_change where kind='form_accepts' and status='WAITING'`) !== "1"; i++) await sleep(250);
    step("C11.18 pass: with the line, it waits for a second person; the row says Change waiting", sql(`select count(*) from library_change where kind='form_accepts' and status='WAITING'`) === "1");
    await p.keyboard.press("Escape"); await open();
    step("C11.18: the row shows the change waiting", /Change waiting/.test(await rows().filter({ hasText: "IMM 1295" }).first().innerText()));
    await shot("14-accepts-waiting");
    const accId = sql(`select id from library_change where kind='form_accepts' and status='WAITING' limit 1`);
    await api(`/library/changes/${accId}/approve`, { method: "POST", json: { note: "Matches the form page" }, actor: "user-B" });
    await open();
    step("C11.18 pass: after the second person approves, the row shows PDF upload · Online, set by a person · Sample", /PDF upload · Online\s*Set by a person · Sample/.test(await rows().filter({ hasText: "IMM 1295" }).first().innerText()), await rows().filter({ hasText: "IMM 1295" }).first().innerText());
    await shot("15-accepts-approved");
    // N8 DV-d1-1 (The outside check D1 walk): "2 combinations" in Used by read as struck through (a dotted line through the words). It
    // is a plain link-style button now: no dotted decoration, and it opens the form's drawer (where it is used).
    const count = p.locator("[data-used-by-count]").first();
    const deco = await count.evaluate((e) => { const cs = getComputedStyle(e); return { tag: e.tagName, style: cs.textDecorationStyle, line: cs.textDecorationLine, text: e.textContent }; });
    step("N8 DV-d1-1 fail: the Used-by count is a button with no dotted line (before: a dotted underline that read as struck through)", deco.tag === "BUTTON" && deco.style !== "dotted" && !/line-through/.test(deco.line) && /^\d+ combinations$/.test(deco.text ?? ""), JSON.stringify(deco));
    await count.click();
    step("N8 DV-d1-1 pass: the count opens the form's drawer, which says where it is used", await p.getByRole("dialog").filter({ hasText: /Where used|where it is used/i }).count() === 1);
    await p.keyboard.press("Escape");
    // N8 DV-d1-2 (The outside check D1 walk): the loading list was a div with a label and no role (axe aria-prohibited-attr, seen at
    // 1440 px while the list loaded). The list is held back for a moment so axe sees the loading state.
    await p.route("**/api/library/forms/list**", async (route) => { await new Promise((r) => setTimeout(r, 2_000)); await route.continue(); });
    await p.goto(`${BASE}/library/forms`);
    await p.locator('[aria-label="Loading forms"]').waitFor({ timeout: 10_000 });
    step("N8 DV-d1-2: the loading list says so as a status (role status, busy)", (await p.locator('[aria-label="Loading forms"]').getAttribute("role")) === "status" && (await p.locator('[aria-label="Loading forms"]').getAttribute("aria-busy")) === "true");
    await axe("N8 DV-d1-2 fail: Forms while the list loads, 1440 px (before: aria-prohibited-attr on the loading list)");
    await p.unrouteAll({ behavior: "ignoreErrors" }); // the held list request may still be pending: it must not fail the page that comes next
    // X5 slice a (P-156 (1)): the author fills the library from IRCC's forms list (US$0); new rows read "Listed by IRCC · no
    // file yet". A person without the author duty has no such button.
    await as("user-A"); await open();
    // X5 review (86f9447c) m4: a double click sends one fill (the button guards a fill in flight).
    let fillPosts = 0; const countFill = (r) => { if (r.method() === "POST" && r.url().includes("/library/forms/fill-from-index")) fillPosts++; };
    p.on("request", countFill);
    await p.locator("[data-fill-index]").dblclick();
    await p.getByText(/Filled from IRCC's forms list: \d+ new forms listed/).first().waitFor({ timeout: 30_000 });
    await sleep(500); p.off("request", countFill);
    step("X5 review m4 fail: a double click on Fill sends one fill (before: two)", fillPosts === 1, `requests ${fillPosts}`);
    await p.getByText("Listed by IRCC · no file yet").first().waitFor({ timeout: 30_000 });
    step("X5 C2.6 pass: Fill from IRCC's forms list adds the listed forms, each 'Listed by IRCC · no file yet' (the first 50 shown, then Show more)", (await p.getByText("Listed by IRCC · no file yet").count()) >= 40 && /Showing 50 of \d+/.test((await p.locator("[data-show-more]").textContent()) ?? ""), await p.locator("[data-show-more]").textContent().catch(() => "none"));
    // X5 review m5 (WCAG 2.4.3): after the fill, focus is back on the button (before: on the page).
    let fillFocused = false; for (let i = 0; i < 50 && !fillFocused; i++) { fillFocused = await p.evaluate(() => document.activeElement?.hasAttribute("data-fill-index") ?? false); if (!fillFocused) await sleep(100); }
    step("X5 review m5 fail: after Fill, keyboard focus is on the Fill button again", fillFocused, await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 100)));
    // X5 break M5: the "No file yet" chip shows only those rows; "Ready" only the forms with a file.
    await p.getByRole("button", { name: /^Ready\s*\d+$/ }).click(); await sleep(400);
    const readyRows = await p.locator("[data-row-status]").evaluateAll((els) => els.map((e) => e.getAttribute("data-row-status")));
    step("X5 break M5 fail: the Ready chip shows only forms with a file (before: no such chip)", readyRows.length > 0 && readyRows.every((x) => x === "ready"), readyRows.slice(0, 5).join());
    await p.getByRole("button", { name: /^Ready\s*\d+$/ }).click(); await sleep(400);
    // X5 review (86f9447c) M1, STANDARDS §9 (< 200 ms): search and a chip press after the fill, timed in the page from the
    // keystroke or click to the filtered rows on screen; the best of three (a busy runner adds noise, not the page).
    const searchBox = p.getByRole("searchbox", { name: "Search number or title" });
    const timeSearch = async (term) => { await searchBox.fill(""); await sleep(300); return p.evaluate(async (t) => { const box = document.querySelector('input[aria-label="Search number or title"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; const t0 = performance.now(); setter.call(box, t); box.dispatchEvent(new Event("input", { bubbles: true })); for (;;) { const rows = [...document.querySelectorAll("tr[data-form]")]; if (rows.length && rows.every((r) => r.textContent.toLowerCase().includes(t.toLowerCase()))) return performance.now() - t0; await new Promise((r) => requestAnimationFrame(r)); } }, term); };
    const searches = [await timeSearch("IMM 5257"), await timeSearch("visitor"), await timeSearch("IMM 1295")];
    await searchBox.fill(""); await sleep(300);
    const guidesMs = await p.evaluate(async () => { const b = [...document.querySelectorAll("button")].find((x) => /^Guides\s*\d+$/.test(x.textContent.trim())); const t0 = performance.now(); b.click(); for (;;) { const rows = [...document.querySelectorAll("tr[data-form]")]; if (rows.length && rows.length <= 10) return performance.now() - t0; await new Promise((r) => requestAnimationFrame(r)); } });
    // Review (5a5f0d16) M1: widening back to the whole list (All after Guides) is timed too (before: 316-325 ms).
    const allMs = await p.evaluate(async () => { const b = [...document.querySelectorAll("button")].find((x) => /^All\s*\d+$/.test(x.textContent.trim())); const t0 = performance.now(); b.click(); for (;;) { if (document.querySelectorAll("tr[data-form]").length >= 40) return performance.now() - t0; await new Promise((r) => requestAnimationFrame(r)); } });
    step("X5 review (86f9447c, 5a5f0d16) M1 fail: after the fill, search, the Guides chip and widening back to All answer in under 200 ms (STANDARDS §9; before: 184-375, 207-217 and 316-325 ms)", Math.min(...searches) < 200 && guidesMs < 200 && allMs < 200, JSON.stringify({ searches: searches.map((x) => Math.round(x)), guidesMs: Math.round(guidesMs), allMs: Math.round(allMs) }));
    await p.getByRole("button", { name: /^All\s*\d+$/ }).click(); await sleep(300); // back to every type
    // the outside check on #145: a listed form with no file offers no "Set what IRCC accepts" (it would answer "No edition yet"); the
    // drawer says what comes first.
    await p.locator('tr[data-form]').filter({ hasText: "Listed by IRCC · no file yet" }).first().getByRole("button").first().click();
    await p.getByRole("dialog").waitFor();
    step("X5 the outside check (#145) fail: a form with no file offers no 'Set what IRCC accepts'; the drawer says to upload or find its PDF first", (await p.getByRole("dialog").getByRole("button", { name: /what IRCC accepts/ }).count()) === 0 && (await p.getByRole("dialog").locator("[data-accepts-needs-file]").count()) === 1);
    await p.keyboard.press("Escape"); await sleep(300);
    // X5 review/break (57f7d79d) m1, m11, m12: Show more puts focus on the first row it added, the count is a status, the last
    // press leaves focus on a row (before: on the page), and any filter or search change starts again at 50.
    const pager = p.locator("[data-show-more]");
    const total = Number(((await pager.textContent()) ?? "").match(/of (\d+)/)?.[1] ?? 0);
    await pager.getByRole("button", { name: /^Show \d+ more forms$/ }).focus(); await p.keyboard.press("Enter"); await sleep(300); // by keyboard, as the focus ring is for keyboard users
    const focusAfter = await p.evaluate(() => { const tr = document.activeElement?.closest("tr[data-form]"); return tr ? [...document.querySelectorAll("tr[data-form]")].indexOf(tr) : -1; });
    step("X5 review m1 fail: Show more moves focus to the first row it added (row 51; before: the button below the new rows)", focusAfter === 50, `focused row index ${focusAfter}`);
    // Review / break (0fc3f8a7) M7: the focused row shows its focus (before: outline-none won, nothing was drawn).
    const outline = await p.evaluate(() => { const a = document.activeElement; const c = a ? getComputedStyle(a) : null; return c ? `${c.outlineStyle} ${c.outlineWidth}` : "none"; });
    step("X5 review (0fc3f8a7) M7 fail: the row Show more focuses draws a visible outline (WCAG 2.4.7; before: outline-style none)", !/^none/.test(outline) && outline !== "", outline);
    const countSays = async () => (await p.locator('[data-list-count][role="status"]').textContent()) ?? "";
    step("X5 review m2 fail: the count is a status, and the button says forms", /^Showing 100 of \d+ forms$/.test(await countSays()) && /Show \d+ more forms/.test((await pager.textContent()) ?? ""), await countSays());
    // Review (310acb9c) 1 / break m16: a second Enter after Show more opens no drawer (focus is on the row, not its button).
    // The second Enter waits for the first one's rows and focus (before: a fixed 60 ms, which under load pressed Show more
    // twice; 91/92 on main). The wait fails loudly: no .catch, so a Show more that never lands focus on row 101 fails here.
    await pager.getByRole("button").focus(); await p.keyboard.press("Enter");
    await p.waitForFunction(() => { const rows = [...document.querySelectorAll("tr[data-form]")]; const tr = document.activeElement?.closest("tr[data-form]"); return rows.length === 150 && !!tr && rows.indexOf(tr) === 100; }, null, { timeout: 10000 });
    await p.keyboard.press("Enter"); await sleep(300);
    step("X5 review (310acb9c) 1 fail: a second Enter after Show more opens no drawer (before: row 51's drawer opened)", (await p.getByRole("dialog").count()) === 0 && (await p.locator("tr[data-form]").count()) === 150, `dialogs ${await p.getByRole("dialog").count()}, rows ${await p.locator("tr[data-form]").count()}`);
    if (await p.getByRole("dialog").count()) { await p.keyboard.press("Escape"); await sleep(200); }
    while (await pager.count()) { await pager.getByRole("button").click(); await sleep(200); }
    const lastFocus = await p.evaluate(() => !!document.activeElement?.closest("tr[data-form]"));
    const lastCode = await p.locator("tr[data-form]").last().getAttribute("data-form");
    step("X5 review (310acb9c) 2 fail: after the last Show more the count is still said (before: the status left with the button)", (await countSays()) === `Showing ${total} of ${total} forms`, await countSays());
    step("X5 break m11 fail: after the last Show more, focus is on a row it added (before: the page body)", lastFocus && (await p.locator("tr[data-form]").count()) === total, `rows ${await p.locator("tr[data-form]").count()} of ${total}`);
    // Review (310acb9c) 3: the count starts again at 50 in the same render as the filter change: pressing a chip with every row
    // shown never renders more than 50 rows (before, an effect drew every match first; read render by render from the
    // count's data-shown, since both renders land in one task).
    const shownSeq = await p.evaluate(async () => { const el = document.querySelector("[data-list-count]"); const seen = []; const obs = new MutationObserver((recs) => { for (const r of recs) seen.push(Number(r.oldValue)); }); obs.observe(el, { attributes: true, attributeFilter: ["data-shown"], attributeOldValue: true }); const b = [...document.querySelectorAll("button")].find((x) => /^No file yet\s*\d+$/.test(x.textContent.trim())); b.click(); await new Promise((r) => setTimeout(r, 600)); obs.disconnect(); seen.push(Number(el.getAttribute("data-shown"))); b.click(); await new Promise((r) => setTimeout(r, 400)); return seen; });
    const mostMounted = Math.max(0, ...shownSeq.slice(1));
    step("X5 review (310acb9c) 3 fail: a chip pressed with every row shown shows at most 50 rows on every render (before: every match, then cut to 50)", shownSeq.length >= 2 && mostMounted > 0 && mostMounted <= 50, `rows shown, render by render: ${shownSeq.join(" > ")}`);
    await p.getByRole("button", { name: /^Guides\s*\d+$/ }).click(); await sleep(300);
    step("X5 review (310acb9c) 2 fail: a short filter (no pager) still says its count", /^Showing (\d+) of \1 forms$/.test(await countSays()), await countSays());
    await p.getByRole("button", { name: /^All\s*\d+$/ }).click(); await sleep(300);
    step("X5 review m3 fail: a filter change starts the list again at 50 (Showing 50 of N)", (await p.locator("tr[data-form]").count()) === 50 && /Showing 50 of/.test((await pager.textContent()) ?? ""), await pager.textContent().catch(() => "none"));
    // A search finds a form past the first 50 (the last row of the whole list).
    await searchBox.fill(lastCode ?? "none"); await sleep(400);
    step("X5 review m3 fail: a search finds a form past the first 50 rows", lastCode !== null && (await p.locator(`tr[data-form="${lastCode}"]`).count()) === 1, String(lastCode));
    await searchBox.fill(""); await sleep(300);
    // Review (0fc3f8a7) 2: typing speaks the count once it pauses, not per keystroke.
    const spokenUpdates = await p.evaluate(async () => { const el = document.querySelector("[data-list-count]"); let n = 0; const obs = new MutationObserver(() => n++); obs.observe(el, { childList: true, characterData: true, subtree: true }); const box = document.querySelector('input[aria-label="Search number or title"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; for (const t of ["i", "im", "imm", "imm ", "imm 5", "imm 52", "imm 525", "imm 5257"]) { setter.call(box, t); box.dispatchEvent(new Event("input", { bubbles: true })); await new Promise((r) => setTimeout(r, 60)); } await new Promise((r) => setTimeout(r, 1200)); obs.disconnect(); return { n, text: el.textContent }; });
    step("X5 review (0fc3f8a7) 2 fail: typing a search speaks the count once it pauses (before: 5 updates for 8 keys)", spokenUpdates.n <= 2 && /^Showing \d+ of \d+ forms$/.test(spokenUpdates.text ?? ""), JSON.stringify(spokenUpdates));
    await searchBox.fill(""); await sleep(1000);
    // Review (337cdfd5) 2 / break m22: Clear filters (which also empties the search) says the new count at once.
    await searchBox.fill("zzzq"); await p.getByText("No form matches").first().waitFor(); await sleep(900);
    // Review (e466adb1) 2: an edit and its undo in one task (the search ends where it was) must not leave typing pending.
    await p.evaluate(() => { const box = document.querySelector('input[aria-label="Search number or title"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(box, "zzzqa"); box.dispatchEvent(new Event("input", { bubbles: true })); set.call(box, "zzzq"); box.dispatchEvent(new Event("input", { bubbles: true })); }); await sleep(900);
    await p.getByRole("button", { name: "Clear filters" }).click(); await sleep(250);
    step("X5 review (337cdfd5) 2 fail: Clear filters says the new count at once (before: 'No form matches' for 700 ms more)", /^Showing 50 of \d+ forms$/.test((await p.locator("[data-list-count]").textContent()) ?? ""), await p.locator("[data-list-count]").textContent());
    // Review (337cdfd5) 1 / break m21: a count still waiting on typing is said when a drawer opens, before it hides the page.
    await searchBox.fill("imm"); await sleep(250);
    await p.locator("tr[data-form]").first().getByRole("button").first().click(); await sleep(60);
    const saidAtOpen = (await p.locator("[data-list-count]").textContent()) ?? "";
    step("X5 review (337cdfd5) 1 fail: opening a drawer while the count waits on typing says it then (before: it landed behind the drawer, never heard)", /^Showing \d+ of \d+ forms$/.test(saidAtOpen) && !saidAtOpen.endsWith(" 237 forms"), saidAtOpen);
    await p.keyboard.press("Escape"); await sleep(300); await searchBox.fill(""); await sleep(1000);
    // Break (0fc3f8a7) m20: when the list cannot be loaded again, no count of the old list is said.
    await p.route("**/api/library/forms/list**", (r) => r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ title: "Broken", detail: "test" }) }));
    await p.locator("[data-fill-index]").click();
    await p.getByText("The forms could not be loaded").waitFor({ timeout: 15_000 });
    step("X5 break (0fc3f8a7) m20 / (337cdfd5) m24 fail: when the list fails to load, the count says nothing and shows no rows (before: the old list's 'Showing 100 of 237', data-shown 50)", ((await p.locator("[data-list-count]").textContent()) ?? "") === "" && (await p.locator("[data-list-count]").getAttribute("data-shown")) === "0", `${await p.locator("[data-list-count]").textContent()} | ${await p.locator("[data-list-count]").getAttribute("data-shown")}`);
    await p.unrouteAll({ behavior: "ignoreErrors" }); await p.getByRole("button", { name: "Try again" }).click(); await p.locator("tr[data-form]").first().waitFor();
    await axe("X5: the library after the fill from IRCC's forms list");
    // One readable view (the whole list is now some 240 rows): the first screen at 1440 px.
    await p.setViewportSize({ width: 1440, height: 900 }); await p.getByText("Listed by IRCC · no file yet").first().evaluate((e) => e.scrollIntoView({ block: "center" })); await sleep(150);
    await p.screenshot({ path: path.join(SHOTS, "16-filled-from-index-1440.png") });
    // X5 slice c (review 00007dd0 1, 2): two remembered deletions; the section passes axe (the button's name holds its visible
    // words, WCAG 2.5.3), List again works by keyboard and focus moves to the next List again, then to the heading.
    for (const code of ["IMM 0008 SCH4", "IMM 0008 SCH5"]) {
      const d = await api(`/library/forms/${encodeURIComponent(code)}`, { method: "DELETE", json: { reason: "Not needed in this library" } });
      await api(`/library/changes/${d.body?.id}/approve`, { method: "POST", json: { note: "Checked: unused" }, actor: "user-B" });
    }
    await open(); const sec = p.locator("[data-remembered-deletions]"); await sec.waitFor({ timeout: 15_000 }); await sec.scrollIntoViewIfNeeded();
    step("X5 slice c pass: the library names the forms deleted from it, each with List again", (await sec.locator("[data-list-again]").count()) === 2 && /Deleted from the library \(2\)/.test((await sec.textContent()) ?? ""));
    await axe("X5 slice c: deleted forms with List again");
    await sec.locator('[data-list-again="IMM 0008 SCH4"]').focus(); await p.keyboard.press("Enter");
    await p.getByText("IMM 0008 SCH4 is listed again").first().waitFor({ timeout: 15_000 });
    await p.waitForFunction(() => document.activeElement?.getAttribute("data-list-again") === "IMM 0008 SCH5", null, { timeout: 10_000 });
    step("X5 slice c (review 00007dd0 2) fail: after List again by keyboard, focus is on the next List again (before: the page)", (await p.evaluate(() => document.activeElement?.getAttribute("data-list-again"))) === "IMM 0008 SCH5");
    await p.keyboard.press("Enter"); await p.getByText("IMM 0008 SCH5 is listed again").first().waitFor({ timeout: 15_000 });
    await p.waitForFunction(() => !document.querySelector("[data-remembered-deletions]") && document.activeElement?.hasAttribute("data-fill-index"), null, { timeout: 10_000 });
    step("X5 slice c fail: with the last one listed again the section goes and focus lands on Fill from IRCC's forms list", (await p.locator("[data-remembered-deletions]").count()) === 0 && await p.evaluate(() => document.activeElement?.hasAttribute("data-fill-index")));
    await as("user-B"); await open();
    step("X5 C2.6 fail: a person without the author duty has no Fill from IRCC's forms list", (await p.locator("[data-fill-index]").count()) === 0);
    step("no page errors", errs.length === 0, errs.join(" | "));
  } catch (e) { fail++; console.log(`FAIL  unexpected ${e.stack}`); } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
void os;
