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
    step("performance: Forms first view under 1 s (empty library)", Date.now() - t0 < 1000, `${Date.now() - t0} ms (cold first page ${cold} ms)`);
    step("C11.11: an empty library teaches the first action (the finder brings forms in; or Upload PDF)", /No forms yet/.test(await p.locator("main").textContent()) && /form finder/.test(await p.locator("main").textContent()));
    await axe("empty library"); await shot("01-empty");

    await api("/demo/load", { method: "POST" });
    const vv = sql(`select id from combination where label='Visitor visa' limit 1`);
    const plan = (await api(`/combinations/${vv}/forms/find/plan`, { method: "POST", json: { mode: "rules" } })).body;
    const run = (await api(`/combinations/${vv}/forms/find`, { method: "POST", json: { mode: "rules", planSha256: plan.plan_sha256, idempotencyKey: `s4l-${Date.now()}` } })).body;
    for (let i = 0; i < 60 && ["queued", "running"].includes((await api(`/runs/${run.id}`)).body?.status); i++) await sleep(500);
    t0 = Date.now(); await open();
    step("performance: Forms first view under 1 s with the sample", Date.now() - t0 < 1000, `${Date.now() - t0} ms`);
    const head = await p.locator("thead").innerText();
    step("C11.11: one list with the board's columns (Number, Title, Type, Edition, IRCC accepts, Used by, Status)", ["Number", "Title", "Type", "Edition", "IRCC accepts", "Used by", "Status"].every((h) => head.includes(h)), head);
    step("C11.11: forms, guides and checklists in one list (no groups); the guide the finder read is in it", (await forms()).includes("IMM 5257") && (await forms()).includes("Guide 5256") && (await forms()).includes("IMM 5484"), (await forms()).join(","));
    step("C11.11 (change 2): IRCC accepts shows the value with who said it (IMM 5476: PDF upload · Sample · canada.ca words); a form whose page says nothing shows Not set yet (IMM 5257)", /PDF upload\s*Sample · canada\.ca words/.test(await rows().filter({ hasText: "IMM 5476" }).first().innerText()) && /Not set yet/.test(await rows().filter({ hasText: "IMM 5257" }).first().innerText()), await rows().filter({ hasText: "IMM 5476" }).first().innerText());
    step("C11.11 (change 2): guides and checklists say Not filed", /Not filed/.test(await rows().filter({ hasText: "IMM 5484" }).first().innerText()) && /Not filed/.test(await rows().filter({ hasText: "Guide 5256" }).first().innerText()));
    step("C11.11 (change 3): a guide's date says what it is (Updated on canada.ca, or when it was read), never an edition", /Updated on canada\.ca|Read from canada\.ca on/.test(await rows().filter({ hasText: "Guide 5256" }).first().innerText()), await rows().filter({ hasText: "Guide 5256" }).first().innerText());
    step("C11.11 (change 1): Used by shows the combination's place", / › /.test(await rows().filter({ hasText: "IMM 1295" }).first().innerText()), await rows().filter({ hasText: "IMM 1295" }).first().innerText());
    await axe("list with the sample"); await shot("02-list");

    // Upload PDF: one way in, many files (two cards)
    step("C11.11 (Lead fix 4): one way in: Upload PDF, no second \"Choose files\" box", (await p.getByRole("button", { name: "Upload PDF" }).count()) === 1 && (await p.getByText("Add forms to the library").count()) === 0);
    await p.setInputFiles('input[aria-label="Choose PDFs to upload"]', [PDF, PDF2]);
    await p.locator("section[data-run-status]").nth(1).waitFor({ timeout: 30_000 });
    for (let i = 0; i < 120 && (await p.locator('section[data-run-status="done"]').count()) < 2; i++) await sleep(500);
    step("C11.11: two files, two run cards, both Done (rules read them, no AI call)", (await p.locator('section[data-run-status="done"]').count()) === 2 && (await p.locator("section[data-run-status]").allInnerTexts()).every((t) => /No AI call was made/.test(t)));
    await open();
    step("C11.11: the uploaded forms are in the list afterwards", (await forms()).includes("IMM 5604") && (await forms()).includes("IMM 1344"));
    await p.setInputFiles('input[aria-label="Choose PDFs to upload"]', [PDF, PDF2]); await p.locator("section[data-run-status]").nth(1).waitFor();
    await shot("03-upload-two-files");

    // Filters and search
    await open();
    await p.getByRole("button", { name: /^Guides/ }).click(); await sleep(400);
    step("C11.11: Type = Guides lists guides only", (await forms()).length > 0 && (await forms()).every((c) => /^Guide /.test(c)), (await forms()).join(","));
    await axe("filtered to guides"); await shot("04-filter-guides");
    await p.getByRole("button", { name: /^All/ }).click(); await sleep(300);
    const lmia = await p.getByLabel("Used by", { exact: true }).locator("option").filter({ hasText: "With an LMIA" }).first();
    step("C11.11 (change 1): the Used by choices are each combination's place (Program › Category › Sub-category)", / › .* › With an LMIA$/.test(await lmia.textContent()), await lmia.textContent());
    await p.getByLabel("Used by", { exact: true }).selectOption(await lmia.getAttribute("value")); await sleep(400);
    const wp = sql(`select id from combination where label='With an LMIA' limit 1`);
    const vvForms = sql(`select string_agg(lineage_key, ',') from (select distinct on (lineage_key) lineage_key, status from combination_form where combination_id='${wp}' order by lineage_key, version desc) x where status <> 'RETIRED'`).split(",").filter(Boolean);
    // Lead note 28 Oct: Load sample puts its guide in the library too (Guide 5487, which the combination reads as a source).
    const wpFiles = [...vvForms, "Guide 5487"];
    step("C11.11: Used by = With an LMIA lists exactly the forms it files and the guide it reads (and only those)", vvForms.length > 0 && JSON.stringify((await forms()).sort()) === JSON.stringify(wpFiles.sort()), `${(await forms()).join(",")} | ${wpFiles.join(",")}`);
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
    await dlg.getByText("With an LMIA").first().waitFor({ timeout: 10_000 }).catch(() => {});
    const dt = await dlg.innerText();
    step("C11.11: the row drawer opens by keyboard with Definition, What IRCC accepts, Where it is used and History", ["Definition", "What IRCC accepts", "Where it is used", "History"].every((h) => dt.includes(h)), dt.slice(0, 200));
    step("C11.11: the drawer says where the form came from and whether canada.ca was compared, the fingerprint kept in Details", /Official copy loaded with the sample|Downloaded from canada.ca|Uploaded by a person/.test(dt) && /checked|No canada\.ca page recorded yet/.test(dt) && (await dlg.locator("details").count()) === 1);
    step("C11.11: Where it is used lists the LMIA combination and its release", /With an LMIA/.test(dt) && /release/.test(dt), dt.slice(dt.indexOf("Where it is used"), dt.indexOf("Where it is used") + 200));
    await axe("row drawer"); await shot("07-drawer");
    await p.keyboard.press("Escape"); await sleep(300);
    step("review M8: closing the drawer puts focus back on the number that opened it", await p.evaluate(() => document.activeElement?.textContent === "IMM 1295"), await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
    step("review minor: the table's name includes every column, IRCC accepts too", /IRCC accepts/.test((await p.locator('[role="region"][aria-label^="Table:"]').first().getAttribute("aria-label")) ?? ""));
    step("review M8: the hidden file input is not a stop of its own when tabbing", (await p.locator('input[type="file"]').getAttribute("tabindex")) === "-1");
    await p.getByLabel("Search number or title").fill(""); await sleep(500);
    await p.setViewportSize({ width: 1024, height: 900 }); await sleep(300);
    const fits = await p.evaluate(() => { const reg = document.querySelector('[role="region"][aria-label^="Table:"]'); return !!reg && reg.scrollWidth <= reg.clientWidth + 1 && [...document.querySelectorAll('tr[data-form] td:last-child button')].every((b) => b.getBoundingClientRect().right <= reg.getBoundingClientRect().right + 1); });
    step("review round 2 M1: at 1024 px with every sample row, the table fits: every ⋯ in view, no sideways scroll", fits, await p.evaluate(() => { const reg = document.querySelector('[role="region"][aria-label^="Table:"]'); return reg ? [reg.scrollWidth, reg.clientWidth] : null; }));
    await p.getByRole("button", { name: /^All/ }).first().focus(); await p.keyboard.press("Tab"); await p.keyboard.press("Shift+Tab");
    step("review round 2 M5: keyboard focus is visible on a filter chip (a ring, not nothing)", await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.boxShadow !== "none" || (s.outlineStyle !== "none" && s.outlineWidth !== "0px"); }), await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
    const inView = await p.evaluate(() => { const r = document.querySelector('tr[data-form] td:last-child button')?.getBoundingClientRect(), t = [...document.querySelectorAll('tr[data-form] td')].find((td) => td.textContent?.match(/Ready|Needs your OK|Newer file|Retired/))?.getBoundingClientRect(); return !!r && !!t && r.right <= window.innerWidth && t.right <= window.innerWidth; });
    step("review M5: at 1024 px the Status and ⋯ columns stay in view (no sideways scroll to reach them)", inView);
    step("review M5: Used by shows the combination's own name first, its place after it, muted", /^With an LMIA · /.test((await p.locator('tr[data-form="IMM 1295"] td').nth(5).innerText()).trim()), await p.locator('tr[data-form="IMM 1295"] td').nth(5).innerText());
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
    await p.waitForFunction(() => document.querySelector('tr[data-form="IMM 5604"] [data-action]')?.getAttribute("data-action") !== "WITHDRAW", null, { timeout: 5000 }).catch(() => {});
    step("R69-2 fail: after switching to another person without reloading, the author's Withdraw is not shown to them (their own action, greyed)", (await act5604.getAttribute("data-action")) === "RETIRE" && (await act5604.getAttribute("aria-disabled")) === "true", await act5604.getAttribute("data-action"));
    await p.getByLabel("Simulated person").first().selectOption("user-A");
    await p.waitForFunction(() => document.querySelector('tr[data-form="IMM 5604"] [data-action]')?.getAttribute("data-action") === "WITHDRAW", null, { timeout: 5000 }).catch(() => {});
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
    await sp.getByLabel("IRCC accepts", { exact: true }).selectOption("PDF_OR_ONLINE");
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
    step("no page errors", errs.length === 0, errs.join(" | "));
  } catch (e) { fail++; console.log(`FAIL  unexpected ${e.stack}`); } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
void os;
