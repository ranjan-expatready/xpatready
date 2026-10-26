// W1-03 slice 2: the Structure page walked like a person in a real browser (concept §2, §7; board
// design/draft-structure-v2.html). Empty after Reset → first pathway typed in place → the P-112 Sample names (the rest
// added through the same API the page calls) → typing with the free check, exact twin, close name and "Add anyway" →
// the side panel: trail, used by, locations, rename, stale conflict, order, remove waiting for a second person and its
// withdrawal → sub-category refused when the category has setup → keyboard tree → find with no match and the other
// tab → read-only approver → long names → loading and error. Screenshots of every state at 1440 and 1024 px into
// product/screens/W1-structure-programs/screenshots/slice2/, axe (WCAG 2.2 AA) on each. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_s2 4444 start && node studio/tests/check_w1_structure_browser.cjs 4444 xr_studio_screens_s2
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4444), DB = process.argv[3] ?? "xr_studio_screens_s2";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-structure-programs", "screenshots", "slice2"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d|status of 500/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const tree = () => p.getByRole("tree");
  // A row by its own name (its text starts with the name, then its level), not a longer name that contains it.
  const item = (name) => tree().getByRole("treeitem").filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(Pathway|Program|Category|Sub-category)`) }).first();
  const panel = () => p.locator("aside[aria-label$='details']");
  /** Selects a name and waits until the panel shows it, with its "where used" loaded. */
  const select = async (name) => { await item(name).click(); await p.waitForFunction((x) => document.querySelector("aside h2")?.textContent === x && !document.querySelector("aside [aria-label='Where used'] .animate-pulse"), name); await p.waitForTimeout(150); };
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && (document.querySelector('[role="tree"]') || /No structure yet|No name matches|could not load/.test(document.querySelector("main")?.textContent ?? "")));
  const open = async (qs = "") => { await p.goto(`${BASE}/structure${qs}`); await ready(); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForTimeout(400); // colour transitions (150 ms) finish before axe reads contrast
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 });
    await p.waitForTimeout(100);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== empty after Reset; the first pathway typed in place
  await p.goto(BASE); await as("user-A"); await open();
  const navText = await p.getByRole("navigation", { name: "Studio" }).textContent();
  step("C11.3 P-115: Structure is in the menu under Configure, after Programs", /Configure\s*To review.*Programs.*Structure\s*Shared library/.test(navText), navText.slice(0, 90));
  step("C11.3 empty: no structure yet, with Add pathway (both tabs empty after Reset)", await p.getByRole("heading", { name: "No structure yet" }).count() === 1 && await p.getByRole("button", { name: "Add pathway" }).count() === 1);
  await state("empty-after-reset");
  await p.getByRole("button", { name: "Add pathway" }).click();
  const newName = p.getByRole("textbox", { name: /New pathway name in Retail/ });
  step("C11.3 the add row opens in place, focused, with the keyboard hint", await newName.evaluate((e) => e === document.activeElement) && /Enter to add, Esc to cancel/.test(await p.locator("[data-add-row]").textContent()));
  await newName.fill("Temporary residence");
  await p.waitForFunction(() => /No exact match in Retail/.test(document.querySelector("[data-add-row]")?.textContent ?? ""));
  await newName.press("Enter");
  await p.waitForFunction(() => [...document.querySelectorAll('[role="treeitem"]')].some((e) => /^Temporary residence/.test(e.textContent ?? "")));
  step("C11.3 Enter adds the pathway; the row stays open for the next name", sql("select count(*) from program_def where node_kind='PATHWAY' and label='Temporary residence'") === "1" && await newName.inputValue() === "");
  await newName.fill("Permanent residence"); await p.waitForTimeout(400); await newName.press("Enter");
  await p.waitForFunction(() => [...document.querySelectorAll('[role="treeitem"]')].some((e) => /^Permanent residence/.test(e.textContent ?? "")));
  await newName.press("Escape");
  step("C11.3 Esc closes the add row", await p.locator("[data-add-row]").count() === 0);

  // ======================================================== the P-112 Sample names, as a person adds them
  const st = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes;
  const tr = st.find((x) => x.label === "Temporary residence").key, pr = st.find((x) => x.label === "Permanent residence").key;
  const add = async (pathwayType, level, label, parentKey, allowedLocations) => (await api("/structure/nodes", { method: "POST", data: { pathwayType, level, label, parentKey, ...(allowedLocations ? { allowedLocations } : {}) } })).body.key;
  const visitors = await add("INDIVIDUAL", "program", "Visitors", tr);
  const vv = await add("INDIVIDUAL", "category", "Visitor visa", visitors, ["outside_canada"]);
  const studyP = await add("INDIVIDUAL", "program", "Study permits", tr);
  const study = await add("INDIVIDUAL", "category", "Study permit", studyP, ["outside_canada"]);
  await add("INDIVIDUAL", "subCategory", "Outside Canada", study);
  const work = await add("INDIVIDUAL", "program", "Work permits", tr);
  const esw = await add("INDIVIDUAL", "category", "Employer-specific work permit", work, ["inside_canada"]);
  await add("INDIVIDUAL", "subCategory", "With an LMIA – inside Canada", esw);
  const pnp = await add("INDIVIDUAL", "program", "Provincial nominees", pr);
  await add("INDIVIDUAL", "category", "Express Entry stream", pnp);
  const fam = await add("INDIVIDUAL", "program", "Family sponsorship", pr);
  await add("INDIVIDUAL", "category", "Spouse or common-law partner", fam);
  const ctr = await add("CORPORATE", "pathway", "Temporary residence", null);
  const lmia = await add("CORPORATE", "program", "Labour market impact assessment", ctr);
  await add("CORPORATE", "category", "High-wage position", lmia, ["inside_canada"]);
  const combo = (await api("/combinations", { method: "POST", data: { nodeKey: vv } })).body.combination;
  step("setup: the P-112 Sample structure (5 Retail combinations + 1 Corporate) and Visitor visa started", !!combo?.id && sql("select count(*) from program_def") === "17");

  // ======================================================== outline, typing, panel (the board's main frame)
  await open();
  const stats = await p.locator("[data-stats]").textContent();
  step("C11.3 stats line counts each level and the combinations", /2 pathways · 5 programs · 5 categories · 2 sub-categories · 5 combinations/.test(stats), stats);
  step("C11.3 BR-2 a last level is a combination: Visitor visa shows In setup, Express Entry stream Not started", /Category · combination.*In setup/.test(await item("Visitor visa").textContent()) && /Not started/.test(await item("Express Entry stream").textContent()));
  step("C11.3 M5 a combination shows where cases may be opened", /Outside Canada/.test(await item("Visitor visa").textContent()) && /Inside or outside Canada/.test(await item("Express Entry stream").textContent()));
  await select("Study permit");
  step("C11.3 BR-7 the panel shows the full trail, the last part bold", /Retail › Temporary residence › Study permits › Study permit/.test(await panel().locator("[data-trail]").textContent()) && await panel().locator("[data-trail] b").textContent() === "Study permit");
  step("C11.9 the panel shows where it is used first", /1 combination/.test(await panel().textContent()) && await panel().getByRole("heading", { name: "Where used" }).count() === 1);
  await tree().getByRole("treeitem", { name: /Add category/ }).first().click();
  const cat = p.getByRole("textbox", { name: /New category name under Visitors/ });
  await cat.fill("Tourist visa");
  await p.waitForFunction(() => /No exact match under Visitors · no close spelling/.test(document.querySelector("[data-add-row]")?.textContent ?? ""));
  await p.locator("[data-add-row]").getByRole("radio", { name: "Outside" }).click();
  step("C11.3 M5 the add row sets where cases may be opened (Sample)", await p.locator("[data-add-row]").getByRole("radio", { name: "Outside" }).getAttribute("aria-checked") === "true");
  step("C11.3 BR-5 'Not meaning-checked' shows while the AI check is off", /Not meaning-checked/.test(await p.locator("[data-add-row]").textContent()));
  await state("outline-typing-and-panel");

  // ======================================================== exact twin, close name, add anyway
  await cat.fill("visitor-VISA");
  await p.waitForFunction(() => /already exists under Visitors/.test(document.querySelector("[data-add-row]")?.textContent ?? ""));
  step("C11.3 BR-4 an exact twin is refused as you type; Add is disabled", await p.locator("[data-add-row]").getByRole("button", { name: "Add", exact: true }).isDisabled() && await cat.getAttribute("aria-invalid") === "true");
  await state("exact-twin");
  await cat.fill("Visiter visa");
  await p.waitForFunction(() => /Did you mean/.test(document.querySelector("[data-add-row]")?.textContent ?? ""));
  step("C11.3 BR-5 a close name warns with the trail and why (free)", /Did you mean Retail › Temporary residence › Visitors › Visitor visa \(1 letter apart\)/.test(await p.locator("[data-add-row]").textContent()));
  await state("close-name");
  await p.getByRole("button", { name: "Add mine anyway" }).click();
  await p.waitForFunction(() => [...document.querySelectorAll('[role="treeitem"]')].some((e) => /^Visiter visa/.test(e.textContent ?? "")));
  step("C11.3 BR-5 'Add mine anyway' adds it and records it in Activity", sql("select count(*) from audit_event where action='added anyway'") === "1");
  await cat.press("Escape");

  // ======================================================== remove waits for a second person, then withdraw (P-116)
  await select("Visiter visa");
  await p.waitForFunction(() => /Used nowhere/.test(document.querySelector("aside")?.textContent ?? ""));
  step("C11.9 L1 an unused draft name may be removed; retire says why not", await panel().getByRole("button", { name: "Remove" }).isEnabled() && await panel().getByRole("button", { name: "Retire" }).isDisabled());
  await panel().getByRole("button", { name: "Remove" }).click();
  await panel().getByLabel(/Why remove/).fill("Typing slip; Visitor visa exists.");
  await panel().getByRole("button", { name: "Send for approval" }).click();
  await p.waitForFunction(() => /Removal waiting for a second person/.test(document.querySelector("aside")?.textContent ?? ""));
  await p.waitForFunction(() => /Removal waiting/.test(document.querySelector('[role="tree"]')?.textContent ?? ""), null, { timeout: 5000 }).catch(() => undefined);
  step("C11.9 L4 the removal waits for a second person (still listed, marked in the outline)", /Removal waiting/.test(await item("Visiter visa").textContent()) && sql("select count(*) from library_change where kind='structure_node' and status='WAITING'") === "1");
  await state("remove-waiting");
  await panel().getByRole("button", { name: "Withdraw" }).click();
  await panel().getByLabel(/Why withdraw/).fill("Keep it for now.");
  await panel().getByRole("button", { name: "Withdraw" }).last().click();
  await p.waitForFunction(() => !/Removal waiting/.test(document.querySelector('[role="tree"]')?.textContent ?? ""));
  step("C11.9 L1 Undo: the author withdraws the waiting removal", sql("select status from library_change where kind='structure_node'") === "WITHDRAWN");

  // ======================================================== sub-category refused, rename, conflict, order
  await select("Visitor visa");
  const addSub = panel().getByRole("button", { name: "Add sub-category" });
  step("C11.3 P-26 'Add sub-category' is disabled on a category that has its own setup", await addSub.isDisabled());
  await addSub.locator("..").hover(); await p.waitForTimeout(400);
  step("C11.3 P-26 the reason is in the tooltip", /already has its own setup, so it is the combination/.test(await p.getByRole("tooltip").textContent().catch(() => "")));
  await state("sub-category-refused");
  await select("Visitors");
  await panel().getByLabel("Name Required").fill("Visitor programs");
  await panel().getByRole("button", { name: "Save" }).click();
  await p.waitForFunction(() => [...document.querySelectorAll('[role="treeitem"]')].some((e) => /^Visitor programs/.test(e.textContent ?? "")));
  step("C11.3 BR-6 rename saves; the outline shows the new name at once", sql(`select label from program_def where program_node_key='${visitors}'`) === "Visitor programs");
  await select("Study permits");
  await panel().getByLabel("Name Required").fill("Study permit programs");
  await api(`/structure/nodes/${studyP}`, { method: "PATCH", data: { label: "Study permits (students)", version: 1 } });
  await panel().getByRole("button", { name: "Save" }).click();
  await p.waitForFunction(() => /Changed meanwhile/.test(document.querySelector("aside")?.textContent ?? ""));
  step("C11.3 BR-6 a stale edit shows the conflict with Reload, nothing overwritten", sql(`select label from program_def where program_node_key='${studyP}'`) === "Study permits (students)");
  await state("conflict");
  await panel().getByRole("button", { name: "Reload" }).click();
  await select("Permanent residence");
  await panel().getByRole("button", { name: "Move up" }).click();
  await p.waitForFunction(() => /^Permanent residence/.test(document.querySelectorAll('[role="treeitem"]')[0]?.textContent ?? ""));
  step("C11.9 reorder: Move up puts Permanent residence first, at once, with an audit line", sql("select count(*) from audit_event where action='reordered'") === "1");
  await panel().getByRole("button", { name: "Close the details" }).click();

  // ======================================================== keyboard tree (WAI-ARIA)
  await item("Permanent residence").focus();
  await p.keyboard.press("ArrowLeft");
  step("keyboard: Left closes an open group", await item("Permanent residence").getAttribute("aria-expanded") === "false");
  await p.keyboard.press("ArrowRight");
  step("keyboard: Right opens it again", await item("Permanent residence").getAttribute("aria-expanded") === "true");
  await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter");
  await panel().waitFor();
  await p.waitForFunction(() => document.querySelector("aside h2")?.textContent === "Provincial nominees", null, { timeout: 5000 }).catch(() => undefined);
  step("keyboard: Down then Enter selects the next name (Provincial nominees) in the panel", /Provincial nominees/.test(await panel().locator("h2").textContent()), await panel().locator("h2").textContent());
  step("keyboard: one tab stop for the whole outline", await tree().locator('[tabindex="0"]').count() === 1);
  await panel().getByRole("button", { name: "Close the details" }).click();

  // ======================================================== find: no match here, one in the other tab
  await p.getByPlaceholder("Find a name").fill("High-wage");
  await p.waitForFunction(() => /1 match in Corporate and employers/.test(document.querySelector("main")?.textContent ?? ""));
  step("C11.5 find with no match in Retail says where it is", await p.getByRole("heading", { name: /No name matches "High-wage" in Retail/ }).count() === 1);
  await state("find-no-match");
  await p.getByRole("button", { name: "Show it" }).click();
  await p.waitForFunction(() => /High-wage position/.test(document.querySelector('[role="tree"]')?.textContent ?? ""));
  step("C11.5 BR-8 'Show it' opens the Corporate tab with the match and the names above it", /Labour market impact assessment/.test(await tree().textContent()) && await p.getByRole("button", { name: "Corporate and employers" }).getAttribute("aria-pressed") === "true");
  await p.getByRole("button", { name: "Clear the search" }).click();
  await state("corporate-tab");

  // ======================================================== read-only approver
  await as("user-B"); await open();
  const ghost = tree().getByRole("treeitem", { name: /Add program/ }).first();
  step("BR-15 read-only: '+ Add' rows are disabled for the approver", await ghost.getAttribute("aria-disabled") === "true");
  await select("Express Entry stream");
  step("BR-15 read-only: name, Save and lifecycle actions are disabled", await panel().getByLabel("Name Required").isDisabled() && await panel().getByRole("button", { name: "Save" }).isDisabled() && await panel().getByRole("button", { name: "Remove" }).isDisabled());
  await state("read-only-approver");
  await as("user-A");

  // ======================================================== long names wrap, loading, error
  await open();
  const longName = "With an LMIA – inside Canada, for a worker whose employer holds a positive assessment";
  await add("INDIVIDUAL", "subCategory", longName, esw);
  await open();
  step("long names wrap inside the outline; no sideways scroll", (await item(longName).boundingBox()).height > 40 && !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await state("long-name");
  await p.route("**/api/structure?*", async (r) => { await new Promise((x) => setTimeout(x, 1500)); await r.continue().catch(() => undefined); });
  await p.goto(`${BASE}/structure`);
  await p.locator('[aria-busy="true"]').waitFor();
  step("loading: skeleton rows with a status for screen readers", await p.getByRole("status").filter({ hasText: "Loading the structure" }).count() === 1);
  await p.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-loading-1440.png`) });
  await p.unroute("**/api/structure?*");
  await p.route("**/api/structure?*", (r) => r.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ title: "Server error", status: 500, detail: "Something went wrong on the server." }) }));
  await p.goto(`${BASE}/structure`);
  await p.getByText("The structure could not load").waitFor({ timeout: 8000 });
  step("error: a plain message, 'Your work is safe', and a real Retry", /Your work is safe/.test(await p.locator("main").textContent()) && await p.getByRole("button", { name: "Retry" }).count() === 1);
  await state("error");
  await p.unroute("**/api/structure?*");
  await p.getByRole("button", { name: "Retry" }).click();
  await p.locator('[role="tree"]').waitFor();
  step("error: Retry loads the outline", await tree().count() === 1);

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
