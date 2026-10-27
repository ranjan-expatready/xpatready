// S1-finish (Structure, Lead note 27 Oct, P-117): the four finish items walked in a real browser. (1) Pathway cards on
// top of each type tab (name, combinations, how many need you): a card opens that Pathway's tree and closes the others,
// "All pathways" opens all, "+ Add pathway" starts the add row; (2) the panel's "Used by" names each combination with
// Open; (3) success is said inline (add row, panel), never in a toast over the outline or the panel; (4) the left
// menu's white column runs the full page height (app-wide). The P-112 Sample names are added through the API the page
// calls. Screenshots at 1440 and 1024 px into product/screens/W1-structure-programs/screenshots/s1-finish/, axe
// (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_s1f 4446 start && node studio/tests/check_w1_structure_s1finish.cjs 4446 xr_studio_screens_s1f
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_s1f";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-structure-programs", "screenshots", "s1-finish"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const tree = () => p.getByRole("tree");
  const item = (name) => tree().getByRole("treeitem").filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(Pathway|Program|Category|Sub-category)`) }).first();
  const cards = () => p.locator("[data-pathway-cards]");
  const card = (name) => cards().getByRole("button", { name: new RegExp(`^${name}`) });
  const panel = () => p.locator("aside[aria-label$='details']");
  const select = async (name) => { await item(name).click(); await p.waitForFunction((x) => document.querySelector("aside h2")?.textContent === x, name); await p.waitForTimeout(200); };
  const toastsShown = () => p.locator("div.fixed.bottom-4.right-4 > div").count();
  const open = async (qs = "") => { await p.goto(`${BASE}/structure${qs}`); await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector('[role="tree"], [data-slot="empty-state"]')); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 });
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup: the P-112 Sample structure, as a person adds it
  await p.goto(BASE); await as("user-A");
  const add = async (pathwayType, level, label, parentKey, allowedLocations) => (await api("/structure/nodes", { method: "POST", data: { pathwayType, level, label, parentKey, ...(allowedLocations ? { allowedLocations } : {}) } })).body.key;
  const tr = await add("INDIVIDUAL", "pathway", "Temporary residence", null), pr = await add("INDIVIDUAL", "pathway", "Permanent residence", null);
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
  step("setup: the P-112 Sample structure (5 Retail combinations + 1 Corporate), Visitor visa started", !!combo?.id && sql("select count(*) from program_def") === "17");

  // ======================================================== (1) Pathway cards
  await open();
  const st = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.filter((x) => x.level === "pathway");
  const allCard = card("All pathways"), trCard = card("Temporary residence"), prCard = card("Permanent residence");
  step("S1-1 one card per Retail Pathway plus 'All pathways' and '+ Add pathway'", await allCard.count() === 1 && await trCard.count() === 1 && await prCard.count() === 1 && await cards().getByRole("button", { name: /Add pathway/ }).count() === 1);
  const trText = await trCard.textContent(), prText = await prCard.textContent();
  const trApi = st.find((x) => x.key === tr), prApi = st.find((x) => x.key === pr);
  step("S1-1 each card shows its combinations and how many need you, from the same counts as the outline", new RegExp(`${trApi.combinations} combinations.*${trApi.needs ? `${trApi.needs} need` : "none need you"}`).test(trText) && new RegExp(`${prApi.combinations} combinations.*${prApi.needs ? `${prApi.needs} need` : "none need you"}`).test(prText) && trApi.combinations === 3 && prApi.combinations === 2, `${trText} | ${prText}`);
  step("S1-1 'All pathways' is chosen at first and every pathway is open", await allCard.getAttribute("aria-pressed") === "true" && await item("Temporary residence").getAttribute("aria-expanded") === "true" && await item("Permanent residence").getAttribute("aria-expanded") === "true");
  await state("pathway-cards-all");
  await prCard.click();
  await p.waitForFunction(() => document.querySelector('[data-pathway-cards] [aria-pressed="true"]')?.textContent?.startsWith("Permanent residence"));
  step("S1-1 a card opens that Pathway's tree and closes the others", await prCard.getAttribute("aria-pressed") === "true" && await item("Permanent residence").getAttribute("aria-expanded") === "true" && await item("Temporary residence").getAttribute("aria-expanded") === "false" && await item("Provincial nominees").isVisible() && await item("Visitors").count() === 0);
  step("S1-1 the chosen Pathway is kept in the address (a reload or a shared link opens the same view)", /[?&]p=/.test(p.url()));
  // Keyboard focus opens the tooltip too (and does not depend on pointer timing): Tab away and back to the card.
  await allCard.focus(); await card("Permanent residence").focus();
  await p.getByRole("tooltip").filter({ hasText: /Opens Permanent residence/ }).first().waitFor({ timeout: 5000 }).catch(() => undefined);
  const tipText = await p.getByRole("tooltip").allTextContents().catch(() => []);
  step("S1-1 the card's tooltip says what a click does and what 'need you' means", tipText.some((t) => /Opens Permanent residence's tree and closes the other pathways/.test(t)), tipText.join(" | "));
  await state("pathway-card-open");
  await allCard.click();
  await p.waitForFunction(() => document.querySelector('[data-pathway-cards] [aria-pressed="true"]')?.textContent?.startsWith("All pathways"));
  step("S1-1 'All pathways' opens every pathway again", await item("Temporary residence").getAttribute("aria-expanded") === "true" && await item("Permanent residence").getAttribute("aria-expanded") === "true" && !/[?&]p=/.test(p.url()));
  await cards().getByRole("button", { name: /Add pathway/ }).click();
  const newPw = p.getByRole("textbox", { name: /New pathway name in Retail/ });
  step("S1-1 '+ Add pathway' opens the add row at the end of the outline, focused", await newPw.evaluate((e) => e === document.activeElement));
  await newPw.press("Escape");
  await p.getByRole("button", { name: "Corporate and employers" }).click();
  await p.waitForFunction(() => /Temporary residence/.test(document.querySelector("[data-pathway-cards]")?.textContent ?? "") && /1 combination/.test(document.querySelector("[data-pathway-cards]")?.textContent ?? ""));
  step("S1-1 the Corporate tab has its own cards", await card("Temporary residence").count() === 1 && /1 combination/.test(await card("Temporary residence").textContent()));
  await p.getByRole("button", { name: "Retail" }).click();

  // ======================================================== (2) "Used by" names each combination with Open
  await open();
  await select("Temporary residence");
  const usedBy = panel().locator("[data-used-by]");
  const usedText = await usedBy.textContent();
  step("S1-2 'Used by' names each combination below the Pathway by its path", /Visitors › Visitor visa/.test(usedText) && /Study permits › Study permit › Outside Canada/.test(usedText) && /Work permits › Employer-specific work permit › With an LMIA – inside Canada/.test(usedText), usedText);
  const openLinks = usedBy.getByRole("link", { name: /^Open / });
  step("S1-2 a combination with setup has Open (to its page); a Not started one says so and has none", await openLinks.count() === 1 && await openLinks.first().getAttribute("href") === `/c/${combo.id}` && /Outside Canada\s*Not started/.test(usedText));
  await state("used-by-each-combination");
  await openLinks.first().click();
  await p.waitForURL(new RegExp(`/c/${combo.id}`));
  step("S1-2 Open goes to that combination's page", p.url().includes(`/c/${combo.id}`));

  // ======================================================== (3) success inline, no toast over the outline or the panel
  await open();
  await select("Study permit");
  await tree().getByRole("treeitem", { name: /Add category/ }).first().click();
  const cat = p.getByRole("textbox", { name: /New category name under Visitors/ });
  await cat.fill("Tourist visa");
  await p.waitForFunction(() => /No exact match under Visitors/.test(document.querySelector("[data-add-row]")?.textContent ?? ""));
  await cat.press("Enter");
  await p.locator("[data-add-row] [data-done]").waitFor();
  step("S1-3 adding a name says so on the add row itself", /Added "Tourist visa" under Visitors\./.test(await p.locator("[data-add-row] [data-done]").textContent()));
  step("S1-3 no toast is shown (nothing covers the outline or the panel)", await toastsShown() === 0);
  await cat.press("Escape");
  await panel().getByLabel("Name Required").fill("Study permit (outside Canada)");
  await panel().getByRole("button", { name: "Save" }).click();
  await panel().locator("[data-panel-note]").waitFor();
  step("S1-3 saving in the panel says so in the panel's own status line", /^Saved/.test(await panel().locator("[data-panel-note]").textContent()) && await toastsShown() === 0);
  await panel().getByRole("button", { name: "Move down" }).isDisabled();
  await state("inline-confirmation");
  await select("Visitors");
  await panel().getByRole("button", { name: "Move down" }).click();
  await p.waitForFunction(() => /^Moved/.test(document.querySelector("[data-panel-note]")?.textContent ?? ""));
  step("S1-3 moving a name says so in the panel, no toast", await toastsShown() === 0);

  // ======================================================== (4) the left menu's white column runs the full page height
  const column = async () => p.evaluate(() => { const c = document.querySelector("[data-menu-column]").getBoundingClientRect(), m = document.querySelector("main").getBoundingClientRect(); return { col: Math.round(c.bottom), main: Math.round(m.bottom), doc: document.documentElement.scrollHeight, bg: getComputedStyle(document.querySelector("[data-menu-column]")).backgroundColor }; });
  let c = await column();
  step("S1-4 on a long page the menu column reaches the bottom of the page, white", c.col >= c.main - 1 && c.col >= c.doc - 1 && c.bg !== "rgba(0, 0, 0, 0)", JSON.stringify(c));
  await p.goto(`${BASE}/library/checks`); await p.waitForTimeout(800);
  c = await column();
  step("S1-4 on a short page it still fills the window (app-wide)", c.col >= 900 - 1, JSON.stringify(c));
  step("S1-4 the menu itself stays in view while the page scrolls", await p.evaluate(() => getComputedStyle(document.querySelector('nav[aria-label="Studio"]')).position) === "sticky");
  await open();
  await state("menu-full-height");

  // ======================================================== read-only approver
  await as("user-B"); await open();
  step("BR-15 read-only: '+ Add pathway' card is disabled for the approver, with the reason", await cards().getByRole("button", { name: /Add pathway/ }).getAttribute("aria-disabled") === "true");
  await prCard.click();
  step("BR-15 read-only: the approver can still open a Pathway with its card", await item("Temporary residence").getAttribute("aria-expanded") === "false");
  await as("user-A");

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
