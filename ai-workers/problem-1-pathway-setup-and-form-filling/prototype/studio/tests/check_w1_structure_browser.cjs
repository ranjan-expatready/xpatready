// W1-03 Program structure, round 2 (P-127, layout A; board screens/W1-visual-system/design/draft-structure-v2.html)
// walked like a person in a real browser. Empty after Reset → the first Pathway through the one "Add to Program
// structure" pop-up → a branch with "Add and add another" → the P-112 Sample names (the rest through the same
// POST /structure/path the pop-up calls) → layout A: Pathway cards, Program sections, one line per combination → the
// pop-up's checks (picks an exact twin, "Did you mean", Keep mine, already in the structure, None and a category with
// setup, a failed save) → the details panel (trail, where used, rename, stale conflict, remove waiting and withdraw,
// sub-category refused) → order from the ⋯ menus (and on Immigration programs) → keyboard → Find across Pathways and
// the other tab → read-only approver → 390 px → long names, loading, error. Screenshots at 1440, 1024 and 390 px into
// product/screens/W1-visual-system/screenshots/structure/, axe (WCAG 2.2 AA) on each. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_s2 4444 start && node studio/tests/check_w1_structure_browser.cjs 4444 xr_studio_screens_s2
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4444), DB = process.argv[3] ?? "xr_studio_screens_s2";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-visual-system", "screenshots", "structure"); fs.mkdirSync(SHOTS, { recursive: true });
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
  /** A line by its own name: "Visitor visa", or "Study permit › Outside Canada" for a sub-category. */
  const line = (name) => p.locator("[data-line]").filter({ has: p.locator("[data-open]", { hasText: new RegExp(`^${esc(name)}$`) }) }).first();
  const section = (name) => p.locator("[data-section]").filter({ has: p.locator("[data-section-title]", { hasText: new RegExp(`^${esc(name)}$`) }) }).first();
  const band = (name) => p.locator("[data-band]").filter({ has: p.locator("[data-band-title]", { hasText: new RegExp(`^${esc(name)}$`) }) }).first();
  const dialog = () => p.locator("[data-add-dialog]");
  const field = (lv) => p.locator(`[data-field="${lv}"] input[role="combobox"]`);
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && (document.querySelector("[data-structure-a]") || /No structure yet|No name matches|could not load/.test(document.querySelector("main")?.textContent ?? "")), null, { timeout: 30000 });
  const open = async (qs = "") => { await p.goto(`${BASE}/structure${qs}`); await ready(); };
  /** Opens the details panel by a person's click: the band, section or line title (a category with sub-categories through its line's ⋯). */
  const details = async (name) => {
    const t = p.locator("[data-band-title], [data-section-title], [data-line] [data-open]").filter({ hasText: new RegExp(`^${esc(name)}$`) }).first();
    if (await t.count()) await t.click();
    else { const l = p.locator("[data-line]").filter({ has: p.locator("[data-open]", { hasText: new RegExp(`^${esc(name)} › `) }) }).first(); await l.locator("[data-row-menu]").click(); await p.getByRole("menuitem", { name: `${name}: details` }).click(); }
    await p.waitForFunction((x) => document.querySelector("aside h2")?.textContent === x && !document.querySelector("aside [aria-label='Where used'] .animate-pulse"), name); await p.waitForTimeout(150);
  };
  const typeIn = async (lv, text) => { await field(lv).fill(text); await p.waitForTimeout(450); };
  let n = 0;
  const state = async (name, opts = {}) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForTimeout(400); // colour transitions (150 ms) finish before axe reads contrast
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: !opts.dialog });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    for (const [w, h] of [[1024, 768], [390, 844]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(150);
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: !opts.dialog });
      step(`${w} px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), await p.evaluate(() => document.documentElement.scrollWidth));
    }
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
  await band("Temporary residence").waitFor();
  step("C11.3 AD-3/AD-7: Add may stop at a Pathway; the pop-up closes and the Pathway shows with 'No programs yet' (no setup, nothing else)", sql("select count(*) from program_def where node_kind='PATHWAY' and label='Temporary residence'") === "1" && await p.locator("[data-empty-pathway]").count() === 1 && sql("select count(*) from combination") === "0");
  step("C11.3 S1-finish: success is said on the page, never in a toast", /Added "Temporary residence"/.test(await p.locator("[data-page-note]").textContent()) && await p.locator("div.fixed.bottom-4.right-4 > div").count() === 0);

  // ======================================================== a branch with "Add and add another"
  await band("Temporary residence").locator("[data-add-program]").click();
  await dialog().waitFor();
  step("C11.3 AD-8: '+ Add program' on a band opens the pop-up with the Pathway filled and the Program focused", (await field("pathway").inputValue()) === "Temporary residence" && await field("program").evaluate((e) => e === document.activeElement));
  await typeIn("program", "Visitors"); await typeIn("category", "Visitor visa");
  await p.getByRole("radiogroup", { name: "Cases may be opened from" }).getByRole("radio", { name: "Outside" }).click();
  const summary = (await p.locator("[data-adding-summary]").textContent()).trim();
  step("C11.3 AD-2/AD-6: Sub-category starts at None; the preview says 2 new names, 1 combination, Not started, no setup", await p.locator("[data-none]").isChecked() && summary === "2 new names · 1 combination, listed on Immigration programs as Not started; no setup starts." && (await p.locator("[data-add-submit]").textContent()) === "Add 2 names", summary);
  step("C11.3 M5/AD-5: the last level gets 'Cases may be opened from' (Sample)", await p.getByRole("radiogroup", { name: "Cases may be opened from" }).count() === 1);
  await state("pop-up-branch", { dialog: true });
  await p.locator("[data-add-again]").click();
  await p.waitForFunction(() => (document.querySelector('[data-field="category"] input')?.value ?? "x") === "" && /Uses the existing program/.test(document.querySelector('[data-field="program"]')?.textContent ?? ""), null, { timeout: 10000 });
  step("C11.3 AD-7: 'Add and add another' keeps the levels above (Visitors, now existing) and clears the next one, focused", (await field("program").inputValue()) === "Visitors" && await field("category").evaluate((e) => e === document.activeElement), await field("program").inputValue());
  await typeIn("category", "Super visa");
  await p.locator("[data-add-submit]").click(); await dialog().waitFor({ state: "detached" });
  await line("Super visa").waitFor();
  const vvRow = sql("select allowed_locations::text from program_def where label='Visitor visa'");
  step("C11.3 AD-7: one Add wrote only the new names (Visitors, Visitor visa outside Canada, Super visa); no setup started", sql("select count(*) from program_def where label in ('Visitors','Visitor visa','Super visa')") === "3" && /outside_canada/.test(vvRow) && !/inside/.test(vvRow) && sql("select count(*) from combination") === "0", vvRow);
  step("C11.3 AD-7: the new line is tagged 'Just added' (no toast)", await line("Super visa").locator("[data-just-added]").count() === 1);

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

  // ======================================================== layout A: Pathway cards → Program sections → one line per combination
  await open("?p=all");
  const stats = await p.locator("[data-stats]").textContent();
  step("C11.3 stats line counts each level and the combinations", /2 pathways · 6 programs · 7 categories · 2 sub-categories · 7 combinations/.test(stats), stats);
  step("C11.3 P-127 A: Program sections, one line per combination; no tree, no add rows", await p.getByRole("tree").count() === 0 && await p.locator("[data-add-row]").count() === 0 && await section("Visitors").locator("[data-line]").count() === 2 && await p.locator("[data-band]").count() === 2);
  step("C11.3 P-127 Q3: a sub-category is its own line, the category repeated (Study permit › Outside Canada)", await line("Study permit › Outside Canada").count() === 1 && await line("Study permit").count() === 0);
  step("C11.3 BR-2: Visitor visa shows In setup; a just-added category is Not started", /In setup/.test(await line("Visitor visa").textContent()) && /Not started/.test(await line("Express Entry stream").textContent()));
  step("C11.3 M5: a line shows where cases may be opened", /Outside Canada/.test(await line("Visitor visa").locator("[data-loc]").textContent()) && /Inside or outside Canada/.test(await line("Express Entry stream").locator("[data-loc]").textContent()));
  // Drift check 3 (P-127 (1)): each line says what uses it; the column names show at 1024 px and wider, panel closed.
  const usedOf = async (name) => (await line(name).locator("[data-used-by-line]").textContent()).replace(/^Used by: /, "");
  step("C11.3 P-127 used by pass: a started combination says 'Setup draft'; a Not started one 'Nothing yet'", await usedOf("Visitor visa") === "Setup draft" && await usedOf("Express Entry stream") === "Nothing yet", `${await usedOf("Visitor visa")} / ${await usedOf("Express Entry stream")}`);
  const heads = p.locator("[data-line-heads]");
  step("C11.3 P-127 used by: the column names (Status · Cases may be opened from · Used by) show at 1440 px with no panel open", await heads.isVisible() && /Status\s*Cases may be opened from\s*Used by/.test(await heads.textContent()));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);
  const vvBox = await line("Visitor visa").boundingBox(), useBox = await line("Visitor visa").locator("[data-used-by-line]").boundingBox();
  step("C11.3 P-127 used by fail-guard: at 390 px the column names hide and Used by wraps inside its line (no sideways scroll)", !(await heads.isVisible()) && useBox.x + useBox.width <= vvBox.x + vvBox.width + 1 && !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), JSON.stringify({ vvBox, useBox }));
  await p.setViewportSize({ width: 1440, height: 900 });
  await line("Visitor visa").locator("[data-open]").click(); await panel().waitFor();
  step("C11.3 P-127 used by: with the details panel open the column names hide; the panel says what uses it", !(await heads.isVisible()) && /This combination/.test(await panel().locator("[data-used-by]").textContent()));
  await open("?p=all");
  step("VS-1: the band, section and line carry the Pathway ■, Program ● and Category ◆ marks", await band("Temporary residence").locator('[data-level-mark="pathway"]').count() === 1 && await section("Visitors").locator('[data-level-mark="program"]').count() === 1 && await line("Study permit › Outside Canada").locator('[data-level-mark="category"], [data-level-mark="subCategory"]').count() === 2);
  step("VS-9: each Pathway card and band has its accent stripe", (await p.locator("[data-pathway-cards] [data-pathway]").evaluateAll((a) => a.map((x) => getComputedStyle(x).borderLeftWidth))).every((w) => w === "4px"));
  await state("layout-a-all-pathways");
  await p.locator("[data-pathway-cards]").getByRole("button", { name: /^Permanent residence/ }).click();
  await p.waitForFunction(() => document.querySelectorAll("[data-band]").length === 1);
  step("C11.3 P-127: a Pathway card shows that Pathway's band only; the choice is kept in the address", await band("Permanent residence").count() === 1 && /[?&]p=/.test(p.url()));
  await p.goto(`${BASE}/structure`); await ready();
  step("C11.3 P-127: the page opens on the Pathway this person last chose", await p.locator("[data-band]").count() === 1 && await band("Permanent residence").count() === 1);
  await p.locator("[data-pathway-cards]").getByRole("button", { name: /^All pathways/ }).click(); await p.waitForFunction(() => document.querySelectorAll("[data-band]").length === 2);

  // ======================================================== the pop-up's checks (AD-2, AD-4, AD-7)
  await section("Visitors").locator("[data-add-category]").click(); await dialog().waitFor();
  step("C11.3 AD-8: '+ Add category' on a section fills Pathway and Program and focuses Category", (await field("program").inputValue()) === "Visitors" && await field("category").evaluate((e) => e === document.activeElement));
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
  await section("Study permits").locator("[data-add-category]").click(); await dialog().waitFor();
  await field("category").fill("Study permit"); await p.waitForTimeout(500);
  step("C11.3 AD-2: None is unavailable for a category that has sub-categories, with the reason", await p.locator("[data-none]").isDisabled() && /has sub-categories/.test(await p.locator('[data-field="subCategory"]').textContent()));
  await field("category").fill("Visitor visa"); await p.waitForTimeout(300);
  await p.keyboard.press("Escape"); await dialog().waitFor({ state: "detached" }).catch(() => undefined);
  await section("Visitors").locator("[data-add-category]").click(); await dialog().waitFor();
  await typeIn("category", "Visitor visa");
  step("C11.3 AD-2 P-26: the Sub-category field is off with the reason for a category that has its own setup", /already has its own setup, so it is the combination/.test(await p.locator("[data-sub-off]").textContent().catch(() => "")));
  await typeIn("category", "Transit visa");
  await p.route("**/api/structure/path", (r) => r.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ title: "Server error", status: 500, detail: "The database did not answer." }) }));
  await p.locator("[data-add-submit]").click(); await p.locator("[data-add-problem]").waitFor();
  step("C11.3 AD-7 fail: a save error says 'Nothing was added' and keeps what was typed", /Nothing was added/.test(await p.locator("[data-add-problem]").textContent()) && (await field("category").inputValue()) === "Transit visa" && sql("select count(*) from program_def where label='Transit visa'") === "0");
  await p.unroute("**/api/structure/path");
  await p.getByRole("button", { name: "Cancel" }).click(); await dialog().waitFor({ state: "detached" });

  // ======================================================== details panel: trail, where used, remove waiting, refused sub-category, rename, conflict
  await details("Study permit");
  step("C11.3 BR-7: the panel shows the full trail, the last part bold", /Retail › Temporary residence › Study permits › Study permit/.test(await panel().locator("[data-trail]").textContent()) && await panel().locator("[data-trail] b").textContent() === "Study permit");
  step("C11.9: the panel shows where it is used", /1 combination/.test(await panel().textContent()) && await panel().getByRole("heading", { name: "Where used" }).count() === 1);
  await panel().getByRole("button", { name: "Close the details" }).click();
  await details("Visiter visa");
  await p.waitForFunction(() => /Used nowhere/.test(document.querySelector("aside")?.textContent ?? ""));
  step("C11.9 L1: an unused draft name may be removed; retire says why not", await panel().getByRole("button", { name: "Remove" }).isEnabled() && await panel().getByRole("button", { name: "Retire" }).isDisabled());
  await panel().getByRole("button", { name: "Remove" }).click();
  await panel().getByLabel(/Why remove/).fill("Typing slip; Visitor visa exists.");
  await panel().getByRole("button", { name: "Send for approval" }).click();
  await p.waitForFunction(() => /Removal waiting for a second person/.test(document.querySelector("aside")?.textContent ?? ""));
  await p.waitForFunction(() => /Removal waiting/.test(document.querySelector("[data-structure-a]")?.textContent ?? ""), null, { timeout: 5000 }).catch(() => undefined);
  step("C11.9 L4: the removal waits for a second person (still listed, marked on its line)", /Removal waiting/.test(await line("Visiter visa").textContent()) && sql("select count(*) from library_change where kind='structure_node' and status='WAITING'") === "1");
  await state("remove-waiting");
  await panel().getByRole("button", { name: "Withdraw" }).click();
  await panel().getByLabel(/Why withdraw/).fill("Keep it for now.");
  await panel().getByRole("button", { name: "Withdraw" }).last().click();
  await p.waitForFunction(() => !/Removal waiting/.test(document.querySelector("[data-structure-a]")?.textContent ?? ""));
  step("C11.9 L1 Undo: the author withdraws the waiting removal", sql("select status from library_change where kind='structure_node'") === "WITHDRAWN");
  await details("Visitor visa");
  const addSub = panel().getByRole("button", { name: "Add sub-category" });
  step("C11.3 P-26: the panel's 'Add sub-category' is off on a category that has its own setup", await addSub.isDisabled());
  await addSub.locator("..").hover(); await p.waitForTimeout(400);
  step("C11.3 P-26: the reason is in the tooltip", /already has its own setup, so it is the combination/.test(await p.getByRole("tooltip").textContent().catch(() => "")));
  await details("Super visa");
  await panel().getByRole("button", { name: "Add sub-category" }).click(); await dialog().waitFor();
  step("C11.3 AD-8 (QA-45): the panel's 'Add sub-category' opens the pop-up down to the category, focused on Sub-category", (await field("category").inputValue()) === "Super visa" && await field("subCategory").evaluate((e) => e === document.activeElement) && !(await p.locator("[data-none]").isChecked()));
  await p.getByRole("button", { name: "Cancel" }).click(); await dialog().waitFor({ state: "detached" });
  await details("Visitors");
  await panel().getByLabel("Name Required").fill("Visitor programs");
  await panel().getByRole("button", { name: "Save" }).click();
  await section("Visitor programs").waitFor();
  step("C11.3 BR-6: a rename saves; the section shows the new name at once", sql(`select label from program_def where program_node_key='${visitors}'`) === "Visitor programs");
  await details("Study permits");
  await panel().getByLabel("Name Required").fill("Study permit programs");
  await api(`/structure/nodes/${studyP}`, { method: "PATCH", data: { label: "Study permits (students)", version: 1 } });
  await panel().getByRole("button", { name: "Save" }).click();
  await p.waitForFunction(() => /Changed meanwhile/.test(document.querySelector("aside")?.textContent ?? ""));
  step("C11.3 BR-6: a stale edit shows the conflict with Reload, nothing overwritten", sql(`select label from program_def where program_node_key='${studyP}'`) === "Study permits (students)");
  await state("conflict");
  await panel().getByRole("button", { name: "Reload" }).click();
  await panel().getByRole("button", { name: "Close the details" }).click();

  // ======================================================== order from the ⋯ menus (P-116); Immigration programs follows (QA-49)
  await line("Super visa").locator("[data-row-menu]").click(); await p.getByRole("menuitem", { name: "Move up" }).click();
  await p.waitForFunction(() => [...document.querySelectorAll("[data-line] [data-open]")].map((x) => x.textContent).indexOf("Super visa") < [...document.querySelectorAll("[data-line] [data-open]")].map((x) => x.textContent).indexOf("Visitor visa"));
  step("C11.9: a line's ⋯ Move up reorders at once, with an audit line", sql("select count(*) from audit_event where action='reordered'") === "1" && /Immigration programs follows this order/.test(await p.locator("[data-page-note]").textContent()));
  await section("Work permits").locator("[data-row-menu]").first().click(); await p.getByRole("menuitem", { name: "Move up" }).click();
  await p.waitForFunction(() => [...document.querySelectorAll("[data-section-title]")].map((x) => x.textContent).indexOf("Work permits") < [...document.querySelectorAll("[data-section-title]")].map((x) => x.textContent).indexOf("Study permits (students)"));
  const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.map((r) => r.label);
  step("QA-49: Immigration programs follows: Super visa before Visitor visa, Work permits before Study permits", rows.indexOf("Super visa") < rows.indexOf("Visitor visa") && rows.indexOf("With an LMIA – inside Canada") < rows.indexOf("Outside Canada"), rows.join(", "));

  // ======================================================== keyboard: ↑ / ↓ between lines, Enter opens details
  await line("Super visa").locator("[data-open]").focus();
  await p.keyboard.press("ArrowDown");
  step("keyboard: Down moves to the next line", (await p.evaluate(() => document.activeElement?.textContent)) === "Visitor visa", await p.evaluate(() => document.activeElement?.textContent));
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.querySelector("aside h2")?.textContent === "Visitor visa", null, { timeout: 5000 }).catch(() => undefined);
  step("keyboard: Enter opens that line's details", (await panel().locator("h2").textContent()) === "Visitor visa");
  await panel().getByRole("button", { name: "Close the details" }).click();

  // ======================================================== Find across Pathways; no match here, one in the other tab
  await p.getByPlaceholder("Find a name").fill("visa");
  await p.waitForTimeout(400);
  step("C11.3 P-127: Find filters lines in every Pathway; the cards count the matches", /3 matches/.test(await p.locator("[data-pathway-cards]").getByRole("button", { name: /^Temporary residence/ }).textContent()) && /\d+ match/.test(await p.locator("[data-pathway-cards]").getByRole("button", { name: /^Permanent residence/ }).textContent()), await p.locator("[data-pathway-cards]").textContent());
  await p.getByPlaceholder("Find a name").fill("High-wage");
  await p.waitForFunction(() => /1 match in Corporate and employers/.test(document.querySelector("main")?.textContent ?? ""));
  step("C11.5: Find with no match in Retail says where it is", await p.getByRole("heading", { name: /No name matches "High-wage" in Retail/ }).count() === 1);
  await state("find-no-match");
  await p.getByRole("button", { name: "Show it" }).click();
  await p.waitForFunction(() => /High-wage position/.test(document.querySelector("[data-structure-a]")?.textContent ?? ""));
  step("C11.5 BR-8: 'Show it' opens the Corporate tab with the match and its section", await section("Labour market impact assessment").count() === 1 && await p.getByRole("group", { name: "Pathway type" }).getByRole("button", { name: "Corporate and employers" }).getAttribute("aria-pressed") === "true");
  await p.getByRole("button", { name: "Clear the search" }).click();
  await state("corporate-tab");

  // ======================================================== read-only approver
  await as("user-B"); await open("?p=all");
  step("BR-15 read-only: '+ Add', 'Add program' and 'Add category' are disabled for the approver", await p.locator("[data-add-open]").isDisabled() && await p.locator("[data-add-program]").first().isDisabled() && await p.locator("[data-add-category]").first().isDisabled());
  await details("Express Entry stream");
  step("BR-15 read-only: name, Save and lifecycle actions are disabled", await panel().getByLabel("Name Required").isDisabled() && await panel().getByRole("button", { name: "Save" }).isDisabled() && await panel().getByRole("button", { name: "Remove" }).isDisabled());
  step("BR-15 server: the approver's Add is refused (403)", (await api("/structure/path", { method: "POST", actor: "user-B", data: { pathwayType: "INDIVIDUAL", pathway: { label: "Citizenship" } } })).status === 403);
  await state("read-only-approver");
  await as("user-A");

  // ======================================================== the pop-up at 390 px; long names; loading; error
  await open("?p=all");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator("[data-add-open]").click(); await dialog().waitFor(); await p.waitForTimeout(300);
  const box = await p.locator('[role="dialog"]').boundingBox();
  step("390 px: the pop-up fills the phone's width and the page does not scroll sideways", box.width >= 350 && !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), JSON.stringify(box));
  await p.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-pop-up-390.png`) });
  await p.keyboard.press("Escape"); await p.setViewportSize({ width: 1440, height: 900 });
  const longName = "With an LMIA – inside Canada, for a worker whose employer holds a positive assessment";
  await path_({ pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { key: key("Work permits") }, category: { key: esw }, subCategory: { label: longName } });
  await open("?p=all");
  step("long names wrap inside their line; no sideways scroll", (await line(`Employer-specific work permit › ${longName}`).boundingBox()).height > 40 && !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
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
  await p.locator("[data-structure-a]").waitFor();
  step("error: Retry loads the page", await p.locator("[data-structure-a]").count() === 1);

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
