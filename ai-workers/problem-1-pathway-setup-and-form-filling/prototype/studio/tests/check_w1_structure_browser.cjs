// W1-03 Program structure, round 3 (P-128, supersedes P-127; board screens/W1-visual-system/design/draft-r3-program-structure.html
// option A) walked like a person in a real browser, desktop only (1440 and 1024 px). Empty after Reset → the first
// Pathway through the one "Add to Program structure" pop-up → a branch with "Add and add another", prefilled from the
// filters → the P-112 Sample names (the rest through the same POST /structure/path) → the Tree: numbered outline, Pathway
// and Program blocks, names in text colour, Edit and one action on every row, Used by → row actions on the shared pattern
// (P-116 amended): a greyed Delete says why in visible text, See where used; the author's own draft deletes at once with
// Undo; someone else's goes to a second person (ImpactPanel, Undo = Withdraw), approved on To review after the
// re-check is shown → the List: full trail, the same
// numbers, A to Z, remembered per person → the filter bar (Pathway chips, Program, Status, chips and Clear all, kept in
// the address) → the pop-up's checks → the Edit panel (trail, where used, order, rename, conflict) → keyboard (one Tab
// stop, ↑ / ↓, Enter, Delete) → Find and the other tab → Show retired (numbers never move) → read-only approver → long
// names, loading, error. Screenshots at 1440 and 1024 px into product/screens/W1-visual-system/screenshots/structure/,
// axe (WCAG 2.2 AA) on each. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_s2 4444 start && node studio/tests/check_w1_structure_browser.cjs 4444 xr_studio_screens_s2
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4444), DB = process.argv[3] ?? "xr_studio_screens_s2";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-visual-system", "screenshots", "structure"); fs.mkdirSync(SHOTS, { recursive: true });
for (const f of fs.readdirSync(SHOTS)) if (f.endsWith(".png")) fs.rmSync(path.join(SHOTS, f)); // this run's states only
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d|status of 500/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const panel = () => p.locator("aside[aria-label$='details']");
  /** A Tree row by its own name. */
  const row = (name) => p.locator("[data-row]").filter({ has: p.locator("[data-name]", { hasText: new RegExp(`^${esc(name)}$`) }) }).first();
  const numOf = async (name) => (await row(name).locator("[data-num]").textContent()).trim();
  const dialog = () => p.locator("[data-add-dialog]");
  const field = (lv) => p.locator(`[data-field="${lv}"] input[role="combobox"]`);
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && (document.querySelector("[data-tree], [data-list]") || /No structure yet|No name matches|Nothing matches|could not load/.test(document.querySelector("main")?.textContent ?? "")), null, { timeout: 30000 });
  const open = async (qs = "") => { await p.goto(`${BASE}/structure${qs}`); await ready(); await p.waitForTimeout(150); };
  const edit = async (name) => { await row(name).locator("[data-edit]").click(); await p.waitForFunction((x) => document.querySelector("aside h2")?.textContent?.endsWith(x) && !document.querySelector("aside [aria-label='Where used'] .animate-pulse"), name); await p.waitForTimeout(150); };
  const tipOf = async (loc) => { await p.mouse.move(0, 0); await loc.focus(); await p.waitForTimeout(500); let t = (await p.getByRole("tooltip").allTextContents().catch(() => [])).join(" | "); if (!t) { await loc.hover(); await p.waitForTimeout(900); t = (await p.getByRole("tooltip").allTextContents().catch(() => [])).join(" | "); } await loc.evaluate((e) => e.blur()); await p.mouse.move(0, 0); await p.waitForTimeout(150); return t; };
  const typeIn = async (lv, text) => { await field(lv).fill(text); await p.waitForTimeout(450); };
  const noSideways = () => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  /** The word a button shows (its screen-reader-only text left out). */
  const shownWord = (loc) => loc.evaluate((x) => [...x.childNodes].filter((c) => !(c.classList && c.classList.contains("sr-only"))).map((c) => c.textContent).join("").trim());
  let n = 0;
  const state = async (name, opts = {}) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForTimeout(400); // colour transitions (150 ms) finish before axe reads contrast
    if (!opts.dialog) await p.evaluate(() => window.scrollTo(0, 0)); // a full-page shot from the top keeps the sticky bar there
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: !opts.dialog });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(150);
    if (!opts.dialog) await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: !opts.dialog });
    step(`1024 px: ${name} has no sideways scroll`, await noSideways(), await p.evaluate(() => document.documentElement.scrollWidth));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== empty after Reset; the first Pathway through the pop-up
  await p.goto(BASE); await as("user-A"); await open();
  const navText = (await p.getByRole("navigation", { name: "Studio" }).textContent()).replace(/\s+/g, " ");
  step("C11.3 P-125: the menu is in setup order: Program structure · Immigration programs · To review", /Configure\s*Program structure\s*Immigration programs\s*To review\s*Shared library/.test(navText), navText.slice(0, 90));
  step("C11.3 P-127: the page is called Program structure", (await p.getByRole("heading", { level: 1 }).textContent()) === "Program structure");
  step("C11.3 empty: no structure yet, with Add pathway (both tabs empty after Reset)", await p.getByRole("heading", { name: "No structure yet" }).count() === 1 && await p.getByRole("button", { name: "Add pathway" }).count() === 1);
  await state("empty-after-reset");
  await p.getByRole("main").getByRole("button", { name: "Add pathway" }).click();
  await dialog().waitFor();
  step("C11.3 AD-8: Add pathway opens the one pop-up with the Pathway focused and the type from the tab", await field("pathway").evaluate((e) => e === document.activeElement) && (await p.getByRole("radiogroup", { name: "Pathway type" }).getByRole("radio", { name: "Retail" }).getAttribute("aria-checked")) === "true");
  step("C11.3 AD-1: the levels below wait for the one above (Program, Category, Sub-category off)", await field("program").isDisabled() && await field("category").isDisabled() && await field("subCategory").isDisabled());
  await typeIn("pathway", "Temporary residence");
  step("C11.3 AD-1/AD-6: a typed name is New, the button says what it writes, the preview shows the path", await p.locator('[data-field="pathway"] [data-new]').count() === 1 && (await p.locator("[data-add-submit]").textContent()) === "Add pathway" && /You are adding Retail › Temporary residenceNew/.test((await p.locator("[data-you-are-adding]").textContent()).replace(/\s+/g, " ").replace(/ New/g, "New")), await p.locator("[data-you-are-adding]").textContent());
  await state("pop-up-new-pathway", { dialog: true });
  await p.locator("[data-add-submit]").click();
  await dialog().waitFor({ state: "detached" });
  await row("Temporary residence").waitFor();
  step("C11.3 AD-3/AD-7: Add may stop at a Pathway; the pop-up closes and the Pathway shows with nothing under it (no setup)", sql("select count(*) from program_def where node_kind='PATHWAY' and label='Temporary residence'") === "1" && await p.locator("[data-empty-pathway]").count() === 1 && sql("select count(*) from combination") === "0");
  step("C11.3 S1-finish: success is said on the page, never in a toast", /Added "Temporary residence"/.test(await p.locator("[data-page-note]").textContent()) && await p.locator("div.fixed.bottom-4.right-4 > div").count() === 0);

  // ======================================================== a branch with "Add and add another", prefilled from the filters
  await p.locator('[data-pathway-chip]').filter({ hasText: /^Temporary residence/ }).click();
  await p.waitForFunction(() => /[?&]p=/.test(location.search));
  await p.locator("[data-add-open]").click(); await dialog().waitFor();
  step("C11.3 R3-7 / AD-8: the one Add is prefilled from the Pathway filter and starts at Program", (await field("pathway").inputValue()) === "Temporary residence" && await field("program").evaluate((e) => e === document.activeElement));
  await typeIn("program", "Visitors"); await typeIn("category", "Visitor visa");
  await p.getByRole("radiogroup", { name: "Cases may be opened from" }).getByRole("radio", { name: "Outside" }).click();
  const summary = (await p.locator("[data-adding-summary]").textContent()).trim();
  step("C11.3 AD-2/AD-6: Sub-category starts at None; the preview says 2 new names, 1 combination, Not started, no setup", await p.locator("[data-none]").isChecked() && summary === "2 new names · 1 combination, listed on Immigration programs as Not started; no setup starts." && (await p.locator("[data-add-submit]").textContent()) === "Add 2 names", summary);
  await state("pop-up-branch", { dialog: true });
  await p.locator("[data-add-again]").click();
  await p.waitForFunction(() => (document.querySelector('[data-field="category"] input')?.value ?? "x") === "" && /Uses the existing program/.test(document.querySelector('[data-field="program"]')?.textContent ?? ""), null, { timeout: 10000 });
  step("C11.3 AD-7: 'Add and add another' keeps the levels above (Visitors, now existing) and clears the next one, focused", (await field("program").inputValue()) === "Visitors" && await field("category").evaluate((e) => e === document.activeElement), await field("program").inputValue());
  await typeIn("category", "Super visa");
  await p.locator("[data-add-submit]").click(); await dialog().waitFor({ state: "detached" });
  await row("Super visa").waitFor();
  const vvRow = sql("select allowed_locations::text from program_def where label='Visitor visa'");
  step("C11.3 AD-7: one Add wrote only the new names (Visitors, Visitor visa outside Canada, Super visa); no setup started", sql("select count(*) from program_def where label in ('Visitors','Visitor visa','Super visa')") === "3" && /outside_canada/.test(vvRow) && !/inside/.test(vvRow) && sql("select count(*) from combination") === "0", vvRow);
  step("C11.3 AD-7: the new row is tagged 'Just added' (no toast)", await row("Super visa").locator("[data-just-added]").count() === 1);

  // ======================================================== the rest of the P-112 Sample names, through the same endpoint
  const path_ = async (body) => (await api("/structure/path", { method: "POST", data: body })).body;
  const st0 = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes;
  const tr = st0.find((x) => x.label === "Temporary residence").key, visitors = st0.find((x) => x.label === "Visitors").key, vv = st0.find((x) => x.label === "Visitor visa").key;
  await path_({ pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { label: "Study permits" }, category: { label: "Study permit" }, subCategory: { label: "Outside Canada" }, allowedLocations: ["outside_canada"] });
  await path_({ pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { label: "Work permits" }, category: { label: "Employer-specific work permit" }, subCategory: { label: "With an LMIA – inside Canada" }, allowedLocations: ["inside_canada"] });
  await path_({ pathwayType: "INDIVIDUAL", pathway: { label: "Permanent residence" }, program: { label: "Provincial nominees" }, category: { label: "Express Entry stream" }, subCategory: null });
  const prKey = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.find((x) => x.label === "Permanent residence").key;
  await path_({ pathwayType: "INDIVIDUAL", pathway: { key: prKey }, program: { label: "Family sponsorship" }, category: { label: "Spouse or common-law partner" }, subCategory: null });
  await path_({ pathwayType: "CORPORATE", pathway: { label: "Temporary residence" }, program: { label: "Labour market impact assessment" }, category: { label: "High-wage position" }, subCategory: null, allowedLocations: ["inside_canada"] });
  const st = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes;
  const key = (label) => st.find((x) => x.label === label).key;
  const studyP = key("Study permits"), esw = key("Employer-specific work permit");
  const combo = (await api("/combinations", { method: "POST", data: { nodeKey: vv } })).body.combination;
  step("setup: the P-112 Sample structure (6 Retail combinations + 1 Corporate), Visitor visa started", !!combo?.id && sql("select count(*) from program_def") === "18", sql("select count(*) from program_def"));
  const race = await Promise.all([0, 1, 2, 3].map(() => api("/structure/path", { method: "POST", data: { pathwayType: "INDIVIDUAL", pathway: { key: prKey }, program: { label: "Economic immigration" }, category: { label: "Start-up visa" } } })));
  step("C11.3 AD-7: four identical Adds at once store one branch; the others are refused, nothing doubled", race.filter((r) => r.status === 201).length === 1 && sql("select count(*) from program_def where label in ('Economic immigration','Start-up visa')") === "2", race.map((r) => r.status).join(" "));

  // ======================================================== the Tree (option A): numbered outline, blocks, Edit and an action on every row
  await open("?v=tree");
  const stats = await p.locator("[data-stats]").textContent();
  step("C11.3 stats line counts each level and the combinations", /2 pathways · 6 programs · 7 categories · 2 sub-categories · 7 combinations/.test(stats), stats);
  step("C11.3 R3-1: the outline is numbered 1, 1.1, 1.1.1, 1.1.1.1 in page order", await numOf("Temporary residence") === "1" && await numOf("Visitors") === "1.1" && await numOf("Visitor visa") === "1.1.1" && await numOf("Super visa") === "1.1.2" && await numOf("Study permit") === "1.2.1" && await numOf("Outside Canada") === "1.2.1.1" && await numOf("Permanent residence") === "2", [await numOf("Visitors"), await numOf("Study permit"), await numOf("Outside Canada")].join(" "));
  step("C11.3 R3-1: the number's tooltip says it is a position on this page, not an IRCC code", /Not an IRCC code/.test(await tipOf(row("Visitors").locator("[data-num]"))));
  step("C11.3 P-128 (1): each Pathway is a tinted block with its stripe; each Program a block inside it", await p.locator("[data-band]").count() === 2 && await p.locator("[data-block]").count() === 6 && (await p.locator("[data-band]").first().evaluate((e) => getComputedStyle(e).borderLeftWidth)) === "4px");
  const rows = await p.locator("[data-row]").count();
  step("C11.3 R3-2: every row shows Edit and one action; no ⋯ menus, no row Add buttons", rows === 17 && await p.locator("[data-row] [data-edit]").count() === rows && await p.locator("[data-row] [data-action]").count() === rows && await p.locator("[data-row-menu], [data-add-program], [data-add-category]").count() === 0, rows);
  step("C11.3 P-127: a category with sub-categories is its own row; its sub-category sits under it", await row("Study permit").count() === 1 && (await row("Study permit").getAttribute("data-level")) === "category" && (await row("Outside Canada").getAttribute("data-level")) === "subCategory");
  step("C11.3 BR-2 / P-127 (1): Visitor visa is In setup, used by its Setup draft; Express Entry stream Not started, Nothing yet", /In setup/.test(await row("Visitor visa").textContent()) && /Setup draft/.test(await row("Visitor visa").locator("[data-used-by-line]").textContent()) && /Not started/.test(await row("Express Entry stream").textContent()) && /Nothing yet/.test(await row("Express Entry stream").locator("[data-used-by-line]").textContent()));
  step("C11.3 M5: a combination row shows where cases may be opened", /Outside Canada/.test(await row("Visitor visa").locator("[data-loc]").textContent()) && /Inside or outside Canada/.test(await row("Express Entry stream").locator("[data-loc]").textContent()));
  const colours = await p.evaluate(() => { const body = getComputedStyle(document.querySelector("main")).color; const r = [...document.querySelectorAll('[data-row][data-level="program"]')][0]; return { body, name: getComputedStyle(r.querySelector("[data-name]")).color, num: getComputedStyle(r.querySelector("[data-num]")).color }; });
  step("C11.3 P-128 (6) calmer look: names in text colour; the level colour only on the mark and number", colours.name === colours.body && colours.num !== colours.body, JSON.stringify(colours));
  const heads = p.locator("[data-line-heads]");
  step("C11.3 P-127 (1): the column names show Status · Cases may be opened from · Used by at 1440 px", await heads.isVisible() && /Status\s*Cases may be opened from\s*Used by/.test(await heads.textContent()));
  await state("tree");
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
  const words1024 = [await shownWord(row("Visitor visa").locator("[data-edit]")), await shownWord(row("Visitor visa").locator("[data-action]"))];
  step("C11.3 minor 6: at 1024 px Edit and the action stay written; Used by moves to the Edit panel", words1024.join("|") === "Edit|Delete" && !(await row("Visitor visa").locator("[data-used-by-line]").isVisible()) && await noSideways(), words1024.join("|"));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);

  // ======================================================== row actions (P-116 amended, the shared pattern): why not, own draft, second person
  const blocked = (name) => row(name).locator("[data-blocked-line]");
  step("C11.9 P-116 amended fail: a combination row with a setup draft has a greyed Delete; the reason is visible text under it", (await row("Visitor visa").locator("[data-action]").getAttribute("aria-disabled")) === "true" && (await blocked("Visitor visa").innerText()).startsWith("Can't delete: its setup draft uses it.") && (await row("Visitor visa").locator("[data-action]").getAttribute("aria-describedby")) === `why-${vv}`, await blocked("Visitor visa").innerText().catch(() => ""));
  step("C11.9 R3-4 fail: a Program with a setup draft under it has a greyed Delete naming it, in plain words (no rule codes)", /^Can't delete: "Visitor visa" under it has a setup draft\./.test(await blocked("Visitors").innerText()) && !/\(L\d\)/.test(await p.locator("[data-tree]").innerText()));
  await row("Visitors").locator("[data-action]").click({ force: true });
  step("C11.9 R3-2 fail: clicking a greyed Delete opens nothing", await p.locator("[data-impact-panel]").count() === 0);
  await blocked("Visitors").getByRole("button", { name: "See where used" }).click();
  await panel().locator("[data-where-panel]").waitFor(); await p.waitForFunction(() => !document.querySelector("[data-where-panel] [role=status]"));
  step("C11.9 WherePanel: 'See where used' opens Edit; what stops it is listed apart from what is kept", /Visitor visa/.test(await panel().locator("[data-where-panel] [data-stops]").innerText().catch(() => "")), await panel().locator("[data-where-panel]").innerText());
  await panel().getByRole("button", { name: "Close the details" }).click();
  // The author's own draft (every name here was added by this author): deleted at once, Undo brings it back.
  await row("Family sponsorship").locator("[data-action]").click();
  const impact = p.locator("[data-impact-panel]");
  await impact.waitFor();
  step("C11.9 ImpactPanel pass (own draft): the confirm is in the right panel, lists what goes with it, numbered, and needs no reason", /Delete "Family sponsorship" and everything under it\?/.test(await impact.innerText()) && /2\.2\.1 Spouse or common-law partner/.test(await impact.locator("[data-goes-with]").innerText()) && await impact.locator("[data-own-draft]").count() === 1 && await impact.getByRole("textbox").count() === 0 && (await impact.locator("[data-confirm-send]").innerText()).trim() === "Delete");
  await state("delete-own-draft");
  await impact.locator("[data-confirm-send]").click();
  await p.locator("[data-undo-toast]").waitFor();
  await row("Family sponsorship").waitFor({ state: "detached", timeout: 8000 }).catch(() => undefined);
  step("C11.9 P-116 amended pass: the author's own draft is deleted at once (nothing waits on To review); the Undo toast says so", await row("Family sponsorship").count() === 0 && sql(`select count(*) from program_def where label in ('Family sponsorship','Spouse or common-law partner')`) === "0" && sql("select count(*) from library_change where status='WAITING'") === "0" && /Deleted "Family sponsorship" and the 1 name under it\./.test(await p.locator("[data-undo-toast]").innerText()), `rows ${await row("Family sponsorship").count()} · db ${sql(`select count(*) from program_def where label in ('Family sponsorship','Spouse or common-law partner')`)} · waiting ${sql("select count(*) from library_change where status='WAITING'")} · toast ${await p.locator("[data-undo-toast]").innerText()}`);
  await p.locator("[data-undo-toast] [data-undo]").click();
  await row("Family sponsorship").waitFor();
  step("C11.9 P-116 amended pass: Undo brings the names back in place (same numbers)", await numOf("Family sponsorship") === "2.2" && await numOf("Spouse or common-law partner") === "2.2.1" && /Undone: "Family sponsorship" is back/.test(await p.locator("[data-page-note]").innerText()));
  // Someone else's draft: it goes to a second person.
  sql(`update program_def set created_by = 'user-C' where label in ('Family sponsorship','Spouse or common-law partner')`);
  await open();
  await row("Family sponsorship").locator("[data-action]").click(); await impact.waitFor();
  step("C11.9 ImpactPanel pass (second person): it says who approves and when it takes effect, and Send waits for a reason", /Approves\s*A second person, on To review/.test(await impact.innerText()) && /Takes effect\s*When it is approved/.test(await impact.innerText()) && await impact.locator("[data-confirm-send]").isDisabled() && (await impact.locator("[data-confirm-send]").innerText()).trim() === "Send for approval");
  await state("delete-branch-confirm");
  await impact.getByLabel(/Why delete it\?/).fill("Not offered (Sample).");
  await impact.locator("[data-confirm-send]").click();
  await p.waitForFunction(() => /Deletion waiting/.test([...document.querySelectorAll("[data-row]")].find((r) => r.querySelector("[data-name]")?.textContent === "Family sponsorship")?.textContent ?? ""));
  step("C11.9 L4: the deletion waits for a second person: marked on the row, the action is now Withdraw, nothing deleted", (await row("Family sponsorship").locator("[data-action]").getAttribute("data-action")) === "WITHDRAW" && sql(`select count(*) from program_def where label in ('Family sponsorship','Spouse or common-law partner')`) === "2" && /Sent for approval: Delete "Family sponsorship"\./.test(await p.locator("[data-undo-toast]").innerText()));
  await p.locator("[data-undo-toast] [data-undo]").click();
  await p.waitForFunction(() => [...document.querySelectorAll("[data-row]")].find((r) => r.querySelector("[data-name]")?.textContent === "Family sponsorship")?.querySelector("[data-action]")?.getAttribute("data-action") === "DELETE");
  step("C11.9 Undo toast: Undo withdraws the waiting deletion at once; Delete is back", sql("select status from library_change where kind='structure_node' order by proposed_at desc limit 1") === "WITHDRAWN");
  await row("Family sponsorship").locator("[data-action]").click(); await impact.waitFor();
  await impact.getByLabel(/Why delete it\?/).fill("Not offered (Sample)."); await impact.locator("[data-confirm-send]").click();
  await p.waitForFunction(() => /Deletion waiting/.test(document.querySelector("[data-tree]")?.textContent ?? ""));
  await state("delete-waiting");
  const chg = sql("select id from library_change where kind='structure_node' and status='WAITING'");
  await as("user-B"); await p.goto(`${BASE}/review/change/${chg}`); await p.locator("main h1").waitFor();
  step("C11.9 R3-4: the approver sees 'Delete structure name' and every name that goes with it", /^Delete structure name: Retail › Permanent residence › Family sponsorship/.test(await p.locator("main h1").textContent()) && /Spouse or common-law partner/.test(await p.locator("[data-goes-with]").textContent()));
  step("C11.9 ReviewCard: the re-check is said before the click", /Checked again just now: nothing new uses it/.test(await p.locator('[data-recheck="ok"]').innerText().catch(() => "")));
  await p.getByRole("button", { name: "Approve", exact: true }).click();
  const toast = await p.getByText(/approved/).first().innerText({ timeout: 10000 }).catch(() => "");
  step("C11.9 R3-4 pass: approved, the Program and its category are deleted at once, and the message says so", /approved and deleted/.test(toast) && sql(`select count(*) from program_def where label in ('Family sponsorship','Spouse or common-law partner')`) === "0", toast);
  await as("user-A");

  // ======================================================== the List: full trail, the Tree's numbers, A to Z, remembered
  await open();
  const treeNums = { vv: await numOf("Visitor visa"), oc: await numOf("Outside Canada") };
  await p.locator('[data-view-choice="list"]').click(); await p.locator("[data-list]").waitFor();
  const listRows = () => p.locator("[data-list] [data-row]");
  const listText = async (k) => (await listRows().filter({ has: p.locator(`[data-trail-line]`, { hasText: k }) }).first().innerText()).replace(/\s+/g, " ");
  step("C11.3 R3-5: the List is one line per combination (6 now) with the full trail", await listRows().count() === 6 && /Retail › Temporary residence › Visitors › Visitor visa › No sub-category/.test(await listText("Visitor visa")), await listRows().count());
  step("C11.3 R3-1: the List's No. is the Tree number", (await listText("Visitor visa")).startsWith(treeNums.vv) && (await listText("Study permit › Outside Canada")).startsWith(treeNums.oc), [treeNums.vv, treeNums.oc].join(" "));
  const firstTrail = async () => (await listRows().first().locator("[data-trail-line]").innerText()).replace(/\s+/g, " ");
  const pageFirst = await firstTrail();
  await p.locator("[data-sort]").selectOption("az"); await p.waitForTimeout(250);
  step("C11.3 R3-5: page order by default; 'A to Z' sorts by the trail", /Visitors › Visitor visa/.test(pageFirst) && /Permanent residence › Economic immigration › Start-up visa/.test(await firstTrail()), `${pageFirst} → ${await firstTrail()}`);
  await state("list");
  await p.goto(`${BASE}/structure`); await ready();
  step("C11.3 P-128 (1): the view is remembered for this person (List again on a plain open)", await p.locator("[data-list]").count() === 1);
  await p.locator('[data-view-choice="tree"]').click(); await p.locator("[data-tree]").waitFor();

  // ======================================================== the filter bar: Pathway chips, Program, Status, chips and Clear all
  const chipText = (await p.locator("[data-pathway-chip]").allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim());
  step("C11.3 R3-6: Pathway chips with their counts (All 6 · Temporary residence 4 · Permanent residence 2)", chipText.join("|") === "All 6|Temporary residence 4|Permanent residence 2", chipText.join("|"));
  await p.locator("[data-status-filter]").selectOption("setup"); await p.waitForTimeout(250);
  step("C11.3 R3-6: Status 'In setup' leaves only Visitor visa, with the names above it; the counts say so", await p.locator('[data-row][data-level="category"], [data-row][data-level="subCategory"]').count() === 1 && await row("Visitor visa").count() === 1 && /Showing 1 of 6 combinations/.test(await p.locator("[data-stats]").textContent()));
  await p.locator("[data-status-filter]").selectOption("");
  await p.locator("[data-pathway-chip]").filter({ hasText: /^Temporary residence/ }).click();
  await p.locator("[data-program-filter]").selectOption({ label: "Work permits" });
  await p.waitForFunction(() => document.querySelectorAll(`[data-row][data-level="program"]`).length === 1 && /[?&]prog=/.test(location.search), null, { timeout: 5000 }).catch(() => undefined);
  step("C11.3 R3-6: a Pathway chip and a Program leave that Program only; both show as chips with Clear all", await p.locator('[data-row][data-level="program"]').count() === 1 && await row("Work permits").count() === 1 && /Temporary residence/.test(await p.locator("[data-stats]").textContent()) && await p.locator("[data-clear-all]").count() === 1);
  await p.reload(); await ready();
  step("C11.3 P-115: the filters live in the address and survive a reload", await p.locator('[data-row][data-level="program"]').count() === 1 && /[?&]prog=/.test(p.url()));
  await state("filters");
  await p.locator("[data-add-open]").click(); await dialog().waitFor();
  await p.waitForTimeout(300);
  step("C11.3 R3-7: Add is prefilled from the Pathway and Program filters and starts at Category", (await field("program").inputValue()) === "Work permits" && await field("category").evaluate((e) => e === document.activeElement), `${await field("program").inputValue()} / focus ${await p.evaluate(() => document.activeElement?.closest("[data-field]")?.getAttribute("data-field") ?? document.activeElement?.tagName)}`);
  await p.getByRole("button", { name: "Cancel" }).click(); await dialog().waitFor({ state: "detached" });
  // Lead review 3: Add on Retail, close, switch to Corporate with its Pathway chip: the pop-up is seeded from Corporate.
  await p.locator("[data-clear-all]").click(); await p.waitForTimeout(250);
  await p.locator("[data-add-open]").click(); await dialog().waitFor(); await p.getByRole("button", { name: "Cancel" }).click(); await dialog().waitFor({ state: "detached" });
  await p.getByRole("group", { name: "Pathway type" }).getByRole("button", { name: /^Corporate and employers/ }).click(); await ready();
  await p.locator("[data-pathway-chip]").filter({ hasText: /^Temporary residence/ }).click(); await p.waitForFunction(() => /[?&]p=/.test(location.search));
  await p.locator("[data-add-open]").click(); await dialog().waitFor(); await p.waitForTimeout(500);
  const corpRadio = await p.getByRole("radiogroup", { name: "Pathway type" }).getByRole("radio", { name: "Corporate and employers" }).getAttribute("aria-checked");
  step("C11.3 lead review 3 pass: after Retail, Add on Corporate is prefilled from the Corporate Pathway filter (type Corporate, Pathway filled, Program open)", corpRadio === "true" && (await field("pathway").inputValue()) === "Temporary residence" && !(await field("program").isDisabled()), `${corpRadio} · ${await field("pathway").inputValue()}`);
  await p.getByRole("button", { name: "Cancel" }).click(); await dialog().waitFor({ state: "detached" });
  await p.locator("[data-pathway-chip]").filter({ hasText: /^All/ }).click(); await p.waitForFunction(() => !/[?&]p=/.test(location.search));
  await p.locator("[data-add-open]").click(); await dialog().waitFor(); await p.waitForTimeout(500);
  step("C11.3 lead review 3 fail-guard: with no Pathway filter, Add on Corporate starts empty at Pathway (nothing carried over from Retail)", (await field("pathway").inputValue()) === "" && await field("pathway").evaluate((e) => e === document.activeElement) && (await p.getByRole("radiogroup", { name: "Pathway type" }).getByRole("radio", { name: "Corporate and employers" }).getAttribute("aria-checked")) === "true");
  await p.getByRole("button", { name: "Cancel" }).click(); await dialog().waitFor({ state: "detached" });
  await open();
  step("C11.3 R3-6: Clear all brings every row back", await p.locator("[data-row]").count() === 15 && !/[?&](p|prog)=/.test(p.url()), await p.locator("[data-row]").count());

  // ======================================================== the pop-up's checks (AD-2, AD-4, AD-7)
  await open(`?p=${encodeURIComponent(tr)}&prog=${encodeURIComponent(visitors)}`);
  await p.locator("[data-add-open]").click(); await dialog().waitFor();
  await typeIn("category", "visitor-VISA");
  step("C11.3 AD-4: an exact twin (ignoring case and punctuation) picks the existing name: 'Already in the Program structure: Show it'", /Uses the existing category/.test(await p.locator('[data-field="category"]').textContent()) && await p.locator("[data-add-exists]").count() === 1 && await p.locator("[data-add-submit]").isDisabled());
  await typeIn("category", "Visiter visa");
  await p.locator('[data-field="category"] [data-close]').waitFor({ timeout: 5000 }).catch(() => undefined);
  step("C11.3 AD-4 BR-5: a close spelling warns under its field with the trail and why (free)", /Did you mean Retail › Temporary residence › Visitors › Visitor visa \(1 letter apart\)/.test(await p.locator('[data-field="category"] [data-close]').textContent().catch(() => "")));
  await state("pop-up-close-name", { dialog: true });
  await p.locator("[data-add-submit]").click(); await p.locator("[data-add-problem]").waitFor();
  step("C11.3 AD-4 fail: Add without deciding is refused; nothing is added", /Nothing was added/.test(await p.locator("[data-add-problem]").textContent()) && sql("select count(*) from program_def where label='Visiter visa'") === "0");
  await p.locator('[data-field="category"] [data-keep]').click();
  await p.locator("[data-add-submit]").click(); await dialog().waitFor({ state: "detached" });
  step("C11.3 AD-4 BR-5: 'Keep mine' adds it, and Activity records that close names existed", sql("select count(*) from program_def where label='Visiter visa'") === "1" && Number(sql("select count(*) from audit_event where summary like '%although close names exist%'")) === 1);
  await open(`?p=${encodeURIComponent(tr)}&prog=${encodeURIComponent(studyP)}`);
  await p.locator("[data-add-open]").click(); await dialog().waitFor();
  await field("category").fill("Study permit"); await p.waitForTimeout(500);
  step("C11.3 AD-2: None is unavailable for a category that has sub-categories, with the reason", await p.locator("[data-none]").isDisabled() && /has sub-categories/.test(await p.locator('[data-field="subCategory"]').textContent()));
  await p.keyboard.press("Escape"); await dialog().waitFor({ state: "detached" }).catch(() => undefined);
  await open(`?p=${encodeURIComponent(tr)}&prog=${encodeURIComponent(visitors)}`);
  await p.locator("[data-add-open]").click(); await dialog().waitFor();
  await typeIn("category", "Visitor visa");
  step("C11.3 AD-2 P-26: the Sub-category field is off with the reason for a category that has its own setup", /already has its own setup, so it is the combination/.test(await p.locator("[data-sub-off]").textContent().catch(() => "")));
  await typeIn("category", "Transit visa");
  await p.route("**/api/structure/path", (r) => r.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ title: "Server error", status: 500, detail: "The database did not answer." }) }));
  await p.locator("[data-add-submit]").click(); await p.locator("[data-add-problem]").waitFor();
  step("C11.3 AD-7 fail: a save error says 'Nothing was added' and keeps what was typed", /Nothing was added/.test(await p.locator("[data-add-problem]").textContent()) && (await field("category").inputValue()) === "Transit visa" && sql("select count(*) from program_def where label='Transit visa'") === "0");
  await p.unroute("**/api/structure/path");
  await p.getByRole("button", { name: "Cancel" }).click(); await dialog().waitFor({ state: "detached" });

  // ======================================================== the Edit panel: trail, where used, order, rename, conflict
  await open();
  await edit("Study permit");
  step("C11.3 BR-7: Edit shows the full trail, the last part bold, and the row's number", /Retail › Temporary residence › Study permits › Study permit/.test(await panel().locator("[data-trail]").textContent()) && await panel().locator("[data-trail] b").textContent() === "Study permit" && (await panel().locator("[data-panel-num]").textContent()) === "1.2.1");
  step("C11.9: Edit shows where it is used; adding goes through the one Add (no Add sub-category in the panel)", /1 combination/.test(await panel().textContent()) && await panel().getByRole("heading", { name: "Where used" }).count() === 1 && await panel().getByRole("button", { name: "Add sub-category" }).count() === 0);
  await panel().getByRole("button", { name: "Close the details" }).click();
  await edit("Super visa");
  await panel().getByRole("button", { name: "Move up" }).click();
  await p.waitForFunction(() => { const t = [...document.querySelectorAll("[data-row] [data-name]")].map((x) => x.textContent); return t.indexOf("Super visa") < t.indexOf("Visitor visa"); });
  step("C11.9 R3-2: Move up sits in the Edit panel; it reorders at once with an audit line; the numbers follow", sql("select count(*) from audit_event where action='reordered'") === "1" && await numOf("Super visa") === "1.1.1" && await numOf("Visitor visa") === "1.1.2");
  const cat = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.map((r) => r.label);
  step("QA-49: Immigration programs follows: Super visa before Visitor visa", cat.indexOf("Super visa") < cat.indexOf("Visitor visa"), cat.join(", "));
  await panel().getByRole("button", { name: "Close the details" }).click();
  await edit("Visitors");
  await panel().getByLabel("Name Required").fill("Visitor programs");
  await panel().getByRole("button", { name: "Save" }).click();
  await row("Visitor programs").waitFor();
  step("C11.3 BR-6: a rename saves; the row shows the new name at once", sql(`select label from program_def where program_node_key='${visitors}'`) === "Visitor programs");
  await panel().getByRole("button", { name: "Close the details" }).click().catch(() => undefined);
  await edit("Study permits");
  await panel().getByLabel("Name Required").fill("Study permit programs");
  await api(`/structure/nodes/${studyP}`, { method: "PATCH", data: { label: "Study permits (students)", version: 1 } });
  await panel().getByRole("button", { name: "Save" }).click();
  await p.waitForFunction(() => /Changed meanwhile/.test(document.querySelector("aside")?.textContent ?? ""));
  step("C11.3 BR-6: a stale edit shows the conflict with Reload, nothing overwritten", sql(`select label from program_def where program_node_key='${studyP}'`) === "Study permits (students)");
  await state("conflict");
  await panel().getByRole("button", { name: "Reload" }).click();
  await panel().getByRole("button", { name: "Close the details" }).click();

  // ======================================================== kept from S1-finish (its own check retired with P-128): Used by names each combination; the menu column
  await edit("Temporary residence");
  const usedText = await panel().locator("[data-used-by]").textContent();
  const openLinks = panel().locator("[data-used-by]").getByRole("link", { name: /^Open / });
  step("S1-2: Edit on a Pathway names each combination below it by its path; one with setup has Open, a Not started one says so", /Visitor programs › Visitor visa/.test(usedText) && /Study permit › Outside Canada/.test(usedText) && await openLinks.count() === 1 && await openLinks.first().getAttribute("href") === `/c/${combo.id}` && /Not started/.test(usedText), usedText.slice(0, 160));
  await panel().getByRole("button", { name: "Close the details" }).click();
  const column = await p.evaluate(() => { const c = document.querySelector("[data-menu-column]").getBoundingClientRect(), m = document.querySelector("main").getBoundingClientRect(); return { col: Math.round(c.bottom + scrollY), main: Math.round(m.bottom + scrollY), doc: document.documentElement.scrollHeight, bg: getComputedStyle(document.querySelector("[data-menu-column]")).backgroundColor }; });
  step("S1-4: on a long page the menu column reaches the bottom of the page, white; the menu itself stays in view", column.col >= column.main - 1 && column.col >= column.doc - 1 && column.bg !== "rgba(0, 0, 0, 0)" && await p.evaluate(() => getComputedStyle(document.querySelector('nav[aria-label="Studio"]')).position) === "sticky", JSON.stringify(column));

  // ======================================================== keyboard: one Tab stop; ↑ / ↓; Enter is Edit; Delete is the action
  await open();
  const tabbable = await p.locator("[data-tree] [data-edit][tabindex='0'], [data-tree] [data-action][tabindex='0']").count();
  step("C11.3 minor 7: the outline is one Tab stop (only the current row's two buttons are in the Tab order)", tabbable === 2, tabbable);
  await row("Temporary residence").locator("[data-edit]").focus();
  await p.keyboard.press("ArrowDown"); await p.waitForTimeout(100);
  const focused = async () => p.evaluate(() => document.activeElement?.closest("[data-row]")?.querySelector("[data-name]")?.textContent);
  step("keyboard: Down moves to the next row's Edit", await focused() === "Visitor programs", await focused());
  await p.keyboard.press("End"); await p.waitForTimeout(100);
  step("keyboard: End goes to the last row", await focused() === "Start-up visa", await focused());
  await p.keyboard.press("Delete"); await p.waitForTimeout(200);
  step("keyboard: the Delete key opens the row's own action (Delete on an unused line, confirmed in the right panel)", await p.locator("[data-impact-panel]").count() === 1 && /Delete "Start-up visa"\?/.test(await p.locator("[data-impact-panel]").innerText()));
  await p.locator("[data-impact-panel]").getByRole("button", { name: "Cancel" }).click();
  await row("Start-up visa").locator("[data-edit]").focus(); await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.querySelector("aside h2")?.textContent?.endsWith("Start-up visa"), null, { timeout: 5000 }).catch(() => undefined);
  step("keyboard: Enter on a row opens Edit", /Start-up visa$/.test(await panel().locator("h2").textContent()));
  await panel().getByRole("button", { name: "Close the details" }).click();

  // ======================================================== Find across Pathways; no match here, one in the other tab
  await p.getByPlaceholder("Find a name in Retail").fill("visa"); await p.waitForTimeout(400);
  step("C11.3 R3-6: Find keeps the combinations whose trail matches, in every Pathway", await p.locator('[data-row][data-level="category"]').count() === 4 && /Showing 4 of/.test(await p.locator("[data-stats]").textContent()), await p.locator('[data-row][data-level="category"]').count());
  await p.getByPlaceholder("Find a name in Retail").fill("High-wage");
  await p.waitForFunction(() => /1 match in Corporate and employers/.test(document.querySelector("main")?.textContent ?? ""));
  step("C11.5: Find with no match in Retail says where it is", await p.getByRole("heading", { name: /No name matches "High-wage" in Retail/ }).count() === 1);
  await state("find-no-match");
  await p.getByRole("button", { name: "Show it" }).click();
  await p.waitForFunction(() => /High-wage position/.test(document.querySelector("[data-tree]")?.textContent ?? ""));
  step("C11.5 BR-8: 'Show it' opens the Corporate tab with the match", await row("High-wage position").count() === 1 && await p.getByRole("group", { name: "Pathway type" }).getByRole("button", { name: /^Corporate and employers/ }).getAttribute("aria-pressed") === "true");
  await p.getByRole("button", { name: "Clear the search" }).click();
  await state("corporate-tab");

  // ======================================================== Show retired (minor 5: the numbers never move)
  await open();
  const before = await p.locator("[data-row] [data-num]").allInnerTexts();
  sql(`update program_def set retired_at = now() where label = 'Express Entry stream'`);
  await open();
  const hidden = await row("Express Entry stream").count();
  await p.locator("[data-show-retired]").click(); await p.waitForFunction(() => /[?&]r=1/.test(location.search)); await p.waitForTimeout(300);
  const retiredNum = (await row("Express Entry stream").locator("[data-num]").textContent()).trim();
  const after = await p.locator("[data-row]").evaluateAll((a) => a.filter((r) => !/Express Entry stream/.test(r.querySelector("[data-name]")?.textContent ?? "")).map((r) => r.querySelector("[data-num]").textContent.trim()));
  step("C11.9 Show retired: a retired name is hidden, then shown with Retired and Restore (QA-48's view)", hidden === 0 && /Retired/.test(await row("Express Entry stream").textContent()) && (await row("Express Entry stream").locator("[data-action]").getAttribute("data-action")) === "RESTORE");
  step("C11.3 minor 5: a retired row shows '—' and every other number stays as it was", retiredNum === "—" && JSON.stringify(after) === JSON.stringify(before.filter((x) => x !== "2.1.1")), `${retiredNum} · ${after.join(" ")}`);
  await state("show-retired");
  sql(`update program_def set retired_at = null where label = 'Express Entry stream'`);

  // ======================================================== lead review 2: reorder past a retired sibling (it keeps its place)
  sql(`update program_def set retired_at = now() where label = 'Visitor visa'`);
  await open("?r=1");
  const order = () => sql(`select string_agg(label, '|' order by display_order) from program_def where parent_node_key = '${visitors}'`);
  const before2 = order();
  await edit("Visiter visa");
  await panel().getByRole("button", { name: "Move up" }).click();
  await p.waitForFunction(() => /^Moved/.test(document.querySelector("[data-panel-note]")?.textContent ?? ""), null, { timeout: 8000 }).catch(() => undefined);
  const after2 = order();
  step("C11.9 lead review 2 pass: with a retired sibling between them, Move up swaps the two active names; the retired one keeps its place", before2 === "Super visa|Visitor visa|Visiter visa" && after2 === "Visiter visa|Visitor visa|Super visa" && /^Moved/.test(await panel().locator("[data-panel-note]").innerText()), `${before2} → ${after2}`);
  step("C11.9 lead review 2: now first of the active names, Move up is off", await panel().getByRole("button", { name: "Move up" }).isDisabled());
  const activeKeys = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.filter((n) => n.parentKey === visitors && !n.retired).map((n) => n.key);
  const activeOnly = await api("/structure/reorder", { method: "POST", data: { pathwayType: "INDIVIDUAL", parentKey: visitors, keys: activeKeys } });
  step("C11.9 lead review 2 fail: the server still refuses a list without the retired name (it must hold every name there)", activeOnly.status === 409, `${activeOnly.status} · sent ${activeKeys.length} keys · ${order()}`);
  await panel().getByRole("button", { name: "Close the details" }).click();
  sql(`update program_def set retired_at = null where label = 'Visitor visa'`);

  // ======================================================== read-only approver
  await as("user-B"); await open("?add=1");
  step("C11.3 minor 8: a reader opening ?add=1 gets no pop-up", await dialog().count() === 0);
  step("BR-15 read-only: Add is off; every row offers View and a greyed action", await p.locator("[data-add-open]").isDisabled() && (await shownWord(row("Visitor visa").locator("[data-edit]"))) === "View" && (await row("Start-up visa").locator("[data-action]").getAttribute("aria-disabled")) === "true");
  step("BR-15 read-only: the greyed action says only an author changes names", /Only a configuration author/.test(await tipOf(row("Start-up visa").locator("[data-action]"))));
  await edit("Express Entry stream");
  step("BR-15 read-only: name, Save and the panel's actions are disabled", await panel().getByLabel("Name Required").isDisabled() && await panel().getByRole("button", { name: "Save" }).isDisabled() && await panel().getByRole("button", { name: "Delete" }).isDisabled());
  step("BR-15 server: the approver's Add is refused (403)", (await api("/structure/path", { method: "POST", actor: "user-B", data: { pathwayType: "INDIVIDUAL", pathway: { label: "Citizenship" } } })).status === 403);
  await state("read-only-approver");
  await as("user-A");

  // ======================================================== long names; loading; error
  const longName = "With an LMIA – inside Canada, for a worker whose employer holds a positive assessment";
  await path_({ pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { key: key("Work permits") }, category: { key: esw }, subCategory: { label: longName } });
  await open();
  step("long names wrap inside their row; no sideways scroll", (await row(longName).boundingBox()).height > 40 && await noSideways());
  await state("long-name");
  await p.route("**/api/structure?*", async (r) => { await new Promise((x) => setTimeout(x, 1500)); await r.continue().catch(() => undefined); });
  await p.goto(`${BASE}/structure`);
  await p.locator('[aria-busy="true"]').waitFor();
  step("loading: skeleton lines with a status for screen readers", await p.getByRole("status").filter({ hasText: "Loading the program structure" }).count() === 1);
  await p.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-loading-1440.png`) });
  await p.unroute("**/api/structure?*");
  await p.route("**/api/structure?*", (r) => r.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ title: "Server error", status: 500, detail: "Something went wrong on the server." }) }));
  await p.goto(`${BASE}/structure`);
  await p.getByText("The program structure could not load").waitFor({ timeout: 8000 });
  step("error: a plain message, 'Your work is safe', and a real Retry", /Your work is safe/.test(await p.locator("main").textContent()) && await p.getByRole("button", { name: "Retry" }).count() === 1);
  await state("error");
  await p.unroute("**/api/structure?*");
  await p.getByRole("button", { name: "Retry" }).click();
  await p.locator("[data-tree]").waitFor();
  step("error: Retry loads the page", await p.locator("[data-tree]").count() === 1);

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
