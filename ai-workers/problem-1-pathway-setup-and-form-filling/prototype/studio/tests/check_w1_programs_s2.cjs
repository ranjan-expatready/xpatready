// S2 Immigration programs (W1-04, design D, P-115; Lead note 27 Oct) walked in a real browser, plus the two S1 fixes and
// the seven S2 early-look fixes (P-112 sample Pathways, Start setup, no silent start, form counts, search width, the
// need-you rule, the Not started card).
// The page: menu and title "Immigration programs"; Retail · Corporate and employers tabs; the same Pathway cards as the
// Structure (a card shows only that Pathway's combinations, "All pathways" every Pathway's section); Cards / List,
// remembered per person; every card the full five-part trail, a calculated status, the four setup steps and "Filed:";
// "Status: All ▾" instead of a filter-tab row; search and Add combination placed (P-128: Pathway chips replace the cards); Corporate callout; read-only and
// empty states. S1 fixes: "Start setup" for a Not started combination under "Used by" (New combination with the trail
// filled), and the panel's footer (Remove / Retire, Save) fully visible at 1440×900 and 1024×768. The sample inputs and
// the P-112 Sample names are added through the API the pages call. Screenshots at 1440 and 1024 px into
// product/screens/W1-structure-programs/screenshots/s2/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_s2 4447 start && node studio/tests/check_w1_programs_s2.cjs 4447 xr_studio_screens_s2
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_screens_s2";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-structure-programs", "screenshots", "s2"); fs.mkdirSync(SHOTS, { recursive: true });
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
  // P-128 (4): the Pathway chips of the filter bar replace the Pathway cards (same choice, same counts).
  const cards = () => p.locator("[data-pathway-chips]");
  const card = (name) => cards().getByRole("button", { name: new RegExp(`^${name}`) });
  const setup = (label) => p.locator(`article[data-label="${label}"]`).first();
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector('[data-view], [data-slot="empty-state"]'), null, { timeout: 30000 });
  const open = async (qs = "") => { await p.goto(`${BASE}/${qs}`); await ready(); await p.waitForTimeout(250); };
  let n = 0;
  const state = async (name, after) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 });
    await p.waitForTimeout(200);
    if (after) await after();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup: the sample inputs, then the P-112 Sample names
  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await open();
  const emptyText = await p.locator("main").innerText();
  step("C11.10 empty after Reset: says nothing is set up and points to the Program structure (no cards, no Pathway cards)", /Nothing set up in Retail yet/.test(emptyText) && /Start with the Program structure/.test(emptyText) && await p.getByRole("button", { name: "Open Program structure" }).count() === 1 && await cards().count() === 0, emptyText.replace(/\s+/g, " ").slice(0, 200));
  await state("empty-after-reset");
  await api("/demo/load", { method: "POST" });
  const add = async (pathwayType, level, label, parentKey, allowedLocations) => (await api("/structure/nodes", { method: "POST", data: { pathwayType, level, label, parentKey, decision: "add_anyway", ...(allowedLocations ? { allowedLocations } : {}) } })).body.key;
  // The sample carries the P-112 Pathways (S2 fix 1): Retail · Temporary residence, Permanent residence, Citizenship;
  // Corporate and employers · Temporary residence, Permanent residence.
  const tr = "retail.temporary_residence", pr = "retail.permanent_residence", vv = "individual.visitors.visitor_visa";
  const catOf = async () => (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body;
  const sv = (await catOf()).rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  for (let i = 0; i < 60; i++) { if ((await catOf()).rows.find((x) => x.nodeKey === sv.nodeKey).aiProposals > 0) break; await p.waitForTimeout(500); }
  const ss = (await api("/combinations", { method: "POST", data: { nodeKey: "individual.work_permits.open.spouse_student" } })).body.combination;
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const ssSme = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (ssSme.length) await api(`/combinations/${ss.id}/signoff`, { method: "POST", actor: "user-C", data: { items: ssSme, action: "signed" } });
  const rel = await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: (await api("/draft")).body.changes } });
  const cat = await catOf();
  const svRow = cat.rows.find((x) => x.nodeKey === sv.nodeKey), ssRow = cat.rows.find((x) => x.nodeKey === "individual.work_permits.open.spouse_student");
  step("setup: two combinations wait on a person: Super visa has AI proposals (saved replay, US$0); Spouse of a student is released but Not ready", svRow?.aiProposals > 0 && ssRow?.status === "NOT_READY" && rel.status === 201, `${svRow?.aiProposals} proposals; ${ssRow?.status}`);
  const corpCat = (await api("/catalogue?pathway=CORPORATE&filter=all")).body;
  const vvRow = cat.rows.find((r) => r.nodeKey === vv);
  const nsTr = cat.rows.find((r) => r.pathwayKey === tr && !r.combinationId), ns = cat.rows.find((r) => r.pathwayKey === pr && !r.combinationId);
  step("setup: sample inputs loaded with the P-112 Pathways (3 Retail, 2 Corporate); Visitor visa in setup; Not started ones in Temporary and Permanent residence", cat.sections.map((x) => x.label).join("|") === "Temporary residence|Permanent residence|Citizenship" && corpCat.sections.map((x) => x.label).join("|") === "Temporary residence|Permanent residence" && !!vvRow?.combinationId && !!nsTr && !!ns, `${cat.sections.map((x) => `${x.label} ${x.combinations}`).join(", ")} / ${corpCat.sections.map((x) => `${x.label} ${x.combinations}`).join(", ")}`);

  // ======================================================== fix 1: the sample's Pathways are P-112 names
  step("S2 fix 1: every Retail trail names a P-112 Pathway (never 'Individual'); Visitors reads Retail › Temporary residence › Visitors", cat.rows.every((r) => ["Temporary residence", "Permanent residence", "Citizenship"].includes(r.trail[1])) && vvRow.trail.slice(0, 3).join(" › ") === "Retail › Temporary residence › Visitors", vvRow.trail.join(" › "));
  const lmiaRow = corpCat.rows.find((r) => r.trail[2] === "LMIA");
  step("S2 fix 1: Corporate's programs sit under P-112 Pathways, never the type's name (Corporate and employers › Temporary residence › LMIA)", corpCat.rows.every((r) => ["Temporary residence", "Permanent residence"].includes(r.trail[1])) && lmiaRow?.trail.slice(0, 3).join(" › ") === "Corporate and employers › Temporary residence › LMIA", lmiaRow?.trail.join(" › "));

  // ======================================================== the page: menu, title, tabs, placement
  await open();
  const navText = (await p.getByRole("navigation", { name: "Studio" }).innerText()).replace(/\s+/g, " ");
  step("C11.10 P-115 P-125: the menu item and the page title say Immigration programs (Configure › Program structure · Immigration programs · To review)", /Program structure\s*Immigration programs\s*To review/.test(navText) && (await p.getByRole("heading", { level: 1 }).textContent()) === "Immigration programs", navText.slice(0, 90));
  step("C11.10: the description line says what the page is", /Every combination your firm can open, and where its setup stands\./.test(await p.locator("main").innerText()));
  const types = p.getByRole("group", { name: "Pathway type" });
  step("C11.10 P-104: the type tabs say Retail and Corporate and employers, each with its count", /^Retail\s*\d+$/.test((await types.getByRole("button").nth(0).textContent()).trim()) && /^Corporate and employers\s*\d+$/.test((await types.getByRole("button").nth(1).textContent()).trim()));
  step("C11.10: no filter-tab row; the status is one 'Status: All' menu next to the search", await p.getByRole("group", { name: "Show combinations" }).count() === 0 && await p.getByRole("button", { name: /^Status: All/ }).count() === 1 && await p.getByRole("textbox", { name: /Search combinations/ }).count() === 1);
  const titleRow = await p.evaluate(() => { const h = document.querySelector("h1").getBoundingClientRect(); const bs = [...document.querySelectorAll("main button")].filter((x) => /^(Program structure|Add combination)$/.test(x.textContent.trim())); return bs.map((x) => ({ t: x.textContent.trim(), top: Math.abs(x.getBoundingClientRect().top - h.top) < 24, x: Math.round(x.getBoundingClientRect().left) })); });
  step("C11.10 P-128 (5): Program structure and Add combination sit in the title row, Add combination last", titleRow.length === 2 && titleRow.every((x) => x.top) && titleRow[1].t === "Add combination" && titleRow[0].t === "Program structure" && titleRow[1].x > titleRow[0].x, JSON.stringify(titleRow));

  // ======================================================== fix 5: the search takes the free width, its hint never cut
  for (const [w, h] of [[1440, 900], [1024, 768]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(200);
    const sb = await p.getByRole("textbox", { name: /Search combinations/ }).evaluate((x) => { const c = document.createElement("canvas").getContext("2d"); const cs = getComputedStyle(x); c.font = cs.font; const room = x.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return { w: Math.round(x.getBoundingClientRect().width), need: Math.round(c.measureText(x.placeholder).width), room: Math.round(room) }; });
    step(`S2 fix 5: at ${w} px the search takes the free width and its hint is not cut`, sb.need <= sb.room && sb.w >= (w === 1440 ? 600 : 300), JSON.stringify(sb));
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // ======================================================== Pathway cards; fix 6: "need you" counts only what waits on a person
  const all = card("All");
  step("C11.10 P-128 (4): Pathway chips: All, one per Retail Pathway (no 'Individual'), and no '+ Add pathway'", await all.count() === 1 && await card("Temporary residence").count() === 1 && await card("Permanent residence").count() === 1 && await card("Citizenship").count() === 1 && await card("Individual").count() === 0 && await p.getByRole("button", { name: /Add pathway/ }).count() === 0);
  const waiting = (key) => cat.rows.filter((r) => r.pathwayKey === key && r.needsYou).length;
  const WAIT = ["review_proposals", "see_missing", "see_new_edition", "release"];
  const trS0 = cat.sections.find((x) => x.pathwayKey === tr);
  step("S2 fix 6 (review M1): the two waiting combinations count, in their Pathway's section and card", svRow.needsYou && ssRow.needsYou && trS0.needs >= 2 && trS0.needs === waiting(tr), `${trS0.label} ${trS0.needs}`);
  step("S2 fix 6: need you counts only combinations waiting on a person: never a Not started one, never a Live one with nothing waiting", cat.rows.every((r) => r.combinationId || !r.needsYou) && cat.rows.filter((r) => r.status === "READY" && !r.aiProposals && !r.held.length && !WAIT.includes(r.nextAction?.kind)).every((r) => !r.needsYou) && cat.sections.every((x) => x.needs === waiting(x.pathwayKey)), cat.sections.map((x) => `${x.label} ${x.needs}/${x.combinations}`).join(", "));
  const trS = cat.sections.find((x) => x.pathwayKey === tr);
  const trCard = await card("Temporary residence").evaluate((b) => ({ n: b.querySelector("[data-count]")?.textContent, need: b.querySelector("[data-need]")?.textContent ?? "" }));
  step("S2 fix 6: a Pathway chip's counts are the catalogue's (combinations, need you)", trCard.n === String(trS.combinations) && (trS.needs ? trCard.need.startsWith(String(trS.needs)) : !trCard.need), JSON.stringify(trCard));
  const stPw = (await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.filter((x) => x.level === "pathway");
  step("S2 fix 6: the Structure's Pathway cards use the same rule (same need-you counts per Pathway)", cat.sections.every((x) => stPw.find((y) => y.key === x.pathwayKey)?.needs === x.needs), stPw.map((x) => `${x.label} ${x.needs}`).join(", "));
  const secs = await p.locator("[data-section]").evaluateAll((s) => s.map((x) => x.querySelector("h2").textContent));
  step("C11.10 S2: 'All pathways' (the default) shows one section per Pathway, with its count", await all.getAttribute("aria-pressed") === "true" && secs.length === 3 && cat.sections.every((x, i) => secs[i].startsWith(x.label) && secs[i].includes(`${x.combinations} combination`)), secs.join(" | "));
  const chip = p.locator(`[data-section="${tr}"] [data-need-you]`);
  const chipText = (await chip.textContent().catch(() => "")) ?? "";
  await chip.hover().catch(() => undefined); await p.getByRole("tooltip").filter({ hasText: /waiting for a person/ }).first().waitFor({ timeout: 5000 }).catch(() => undefined);
  step("S2 fix 6 (review M1): the section shows its need-you count, and the chip explains itself", chipText.startsWith(`${trS0.needs} need`) && (await p.getByRole("tooltip").allTextContents()).some((t) => /Combinations waiting for a person: something to review, something missing or something blocking release\./.test(t)), chipText);
  step("C11.10 BR-13: every combination is shown by default (Status: All)", await p.locator("article[data-node]").count() === cat.rows.length, `${await p.locator("article[data-node]").count()} of ${cat.rows.length}`);
  await p.mouse.move(0, 0);
  await state("cards-all-pathways");
  const prS = cat.sections.find((x) => x.pathwayKey === pr);
  await card("Permanent residence").click();
  await p.waitForFunction(() => document.querySelectorAll("[data-section]").length === 1);
  const prText = await p.locator("main").innerText();
  step("C11.10 S2: a Pathway chip shows only that Pathway's combinations; the stats line names it; kept in the address", await card("Permanent residence").getAttribute("aria-pressed") === "true" && await p.locator("article[data-node]").count() === prS.combinations && new RegExp(`${prS.combinations} combinations in Permanent residence`).test(prText) && /[?&]p=/.test(p.url()), `${await p.locator("article[data-node]").count()} cards; ${p.url()}`);
  await all.focus(); await card("Permanent residence").focus();
  await p.getByRole("tooltip").filter({ hasText: /Shows only Permanent residence/ }).first().waitFor({ timeout: 5000 }).catch(() => undefined);
  const tips = await p.getByRole("tooltip").allTextContents();
  step("C11.10 S2: the card's tooltip says what a click does and what 'need you' means", tips.some((t) => /Shows only Permanent residence's combinations\..*waiting for a person/.test(t)), tips.join(" | "));
  await state("pathway-card-open");
  await all.click();
  await p.waitForFunction(() => document.querySelectorAll("[data-section]").length === 3);
  step("C11.10 S2: All pathways brings every section back", !/[?&]p=/.test(p.url()));

  // ======================================================== a card: trail, status, setup steps, filed, next step
  const live = cat.rows.find((r) => r.status === "READY");
  const liveCard = p.locator(`article[data-node="${live.nodeKey}"]`);
  const liveText = await liveCard.innerText();
  step("C11.10 BR-7: a card carries the full five-part trail: Type › Pathway › Program muted, the category bold, the sub-category below", (await liveCard.locator("[data-trail]").textContent()) === live.trail.slice(0, 3).join(" › ") && (await liveCard.locator("h3").textContent()) === live.trail[3] && liveText.includes(live.trail[4]), liveText.replace(/\s+/g, " ").slice(0, 160));
  const subs = await p.locator("article[data-node] h3 + p").allTextContents();
  step("C11.10 BR-7: 'No sub-category' is never blank", subs.every((t) => t.trim().length > 0) && subs.includes("No sub-category"));
  step("C11.10 A3: the Live card shows Step 4 of 4 · Live and Filed: PDF", /Step 4 of 4 · Live/.test(liveText) && /Filed: PDF/.test(liveText) && await liveCard.locator('[data-status="READY"]').count() === 1);
  const nsCard = p.locator(`article[data-node="${ns.nodeKey}"]`);
  const nsText = await nsCard.innerText();
  step("S2 fix 7: a Not started card shows 'Not started' under an empty bar, not 'Step 1 of 4'", /Not started/.test(nsText) && !/Step 1 of 4/.test(nsText) && await nsCard.locator('[data-setup="0"]').count() === 1 && (await nsCard.locator("[data-setup]").getAttribute("aria-label")) === "Setup: not started", nsText.replace(/\s+/g, " "));
  step("S2 fix 2: a Not started card's one next step reads Start setup (no 'Add sources' anywhere on a Not started card)", (await nsCard.locator("[data-next-step]").textContent()).trim() === "Start setup" && !(await p.locator("article[data-node]").allInnerTexts()).some((t) => /Not started/.test(t) && /Add sources/.test(t)));
  const vvCard = p.locator(`article[data-node="${vv}"]`);
  const vvText = await vvCard.innerText(), vvStep = vvRow.nextAction;
  const k = vvStep?.kind === "add_from_library" ? (vvStep.forms ?? []).length : 0;
  step("S2 fix 4: an In setup card's form count agrees with its button in plain words", !/attached, not added yet/.test(vvText) && (!k || (vvText.includes(`${k} ready to add from the library`) && vvText.includes(`Add ${k} form`))), vvText.replace(/\s+/g, " "));
  // fix 3: a Not started name never starts anything by itself
  const before = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.counts;
  const combos0 = sql("select count(*) from combination");
  await nsCard.locator("[data-open]").click();
  await p.waitForURL(/\/new\?leaf=/);
  await p.waitForFunction((l) => [...document.querySelectorAll('main [aria-live="polite"]')].some((x) => x.textContent.includes(`› ${l}`)), ns.label, { timeout: 10000 }).catch(() => undefined);
  const after = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.counts;
  step("S2 fix 3: clicking a Not started name opens Start setup with its trail filled; the counts do not change and nothing is created", p.url().includes(`leaf=${encodeURIComponent(ns.nodeKey)}`) && (await p.locator("main").innerText()).includes(ns.label) && after.not_started === before.not_started && after.in_setup === before.in_setup && sql("select count(*) from combination") === combos0, `${JSON.stringify({ ns: [before.not_started, after.not_started], setup: [before.in_setup, after.in_setup] })} ${p.url()} ${ns.label}: ${(await p.locator("main").innerText()).replace(/\s+/g, " ").slice(-300)}`);
  await state("start-setup-from-card");
  await open("?v=list");
  await p.locator(`[role="row"][data-node="${ns.nodeKey}"]`).focus(); await p.keyboard.press("Enter");
  await p.waitForURL(/\/new\?leaf=/);
  step("S2 fix 3: Enter on a Not started row does the same (no start)", (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.counts.not_started === before.not_started && sql("select count(*) from combination") === combos0);
  await open();
  await vvCard.locator("[data-open]").click();
  await p.waitForURL(new RegExp(`/c/${vvRow.combinationId}`));
  step("C11.10 P-50: a set-up card's name opens the combination page", p.url().includes(`/c/${vvRow.combinationId}`));
  await p.goBack(); await ready();
  await p.waitForFunction((k) => document.activeElement?.closest("article")?.getAttribute("data-node") === k, vv, { timeout: 5000 }).catch(() => undefined);
  step("C11.10 P-50: Back returns with that card highlighted and focused", await p.evaluate((k) => document.activeElement?.closest("article")?.getAttribute("data-node") === k, vv) && /sel=/.test(p.url()));

  // ======================================================== Status: All ▾
  await open();
  await p.getByRole("button", { name: /^Status: All/ }).click();
  const opts = await p.getByRole("menuitemradio").allTextContents();
  step("C11.10 BR-13: Status offers All (default) · Needs work · Not started · In setup · Not ready · Live, each with its count and meaning", opts.length === 6 && /^All · default/.test(opts[0]) && /^Needs work/.test(opts[1]) && /^Not started/.test(opts[2]) && /^Live/.test(opts[5]) && /Firms can open cases on it/.test(opts[5]), opts.join(" | ").slice(0, 200));
  await p.getByRole("menuitemradio", { name: /^Not started/ }).click(); await p.waitForFunction(() => location.search.includes("f=not_started")); await ready(); await p.waitForTimeout(300);
  const nsApi = (await api("/catalogue?pathway=INDIVIDUAL&filter=not_started")).body;
  const shownNs = await p.locator("article[data-node]").evaluateAll((a) => a.map((x) => x.getAttribute("data-node")).sort());
  step("C11.10 BR-13: Not started shows exactly the combinations with no setup yet", nsApi.rows.length > 0 && nsApi.rows.every((r) => !r.combinationId) && JSON.stringify(shownNs) === JSON.stringify(nsApi.rows.map((r) => r.nodeKey).sort()) && /showing \d+ Not started/.test(await p.locator("[data-stats]").textContent()), `${shownNs.length} shown, API ${nsApi.rows.length}`);
  const inSetup = (await api("/catalogue?pathway=INDIVIDUAL&filter=in_setup")).body.rows;
  step("C11.10 BR-13: In setup no longer counts Not started ones", inSetup.every((r) => !!r.combinationId) && inSetup.some((r) => r.nodeKey === vv));
  await state("status-not-started");

  // ======================================================== Cards / List, remembered per person
  await open();
  await p.getByRole("group", { name: "Show as" }).getByRole("button", { name: "List" }).click();
  await p.locator('[role="grid"][aria-label="Combinations"]').waitFor();
  const groupRows = await p.locator("[data-group]").count();
  const listRow = p.locator(`[role="row"][data-node="${live.nodeKey}"]`);
  step("C11.10: List shows the same combinations as rows, grouped by Pathway (group rows collapse)", groupRows === cat.sections.length && await p.locator('[role="row"][data-node]').count() === cat.rows.length);
  step("C11.10 BR-7: a row carries the full five-part trail in one line, status, setup and next step", (await listRow.locator("[data-trail]").textContent()).startsWith(live.trail.join(" › ")) && await listRow.locator("[data-setup]").count() === 1 && await listRow.locator("[data-step-cell]").count() === 1, await listRow.locator("[data-trail]").textContent());
  await state("list-view");
  await p.reload(); await ready();
  step("C11.10: the List choice is remembered for this person after a reload", await p.locator('[role="grid"][aria-label="Combinations"]').count() === 1 && !/[?&]v=/.test(p.url()));
  await as("user-B"); await p.reload(); await ready();
  step("C11.10: another person still gets Cards (remembered per person)", await p.locator('[data-view="cards"]').count() === 1);
  await as("user-A"); await p.reload(); await ready();
  await p.locator('[data-group] button[aria-expanded]').first().click();
  step("C11.10: a group row collapses its Pathway in the list", await p.locator('[data-group] button[aria-expanded="false"]').count() === 1 && await p.locator('[role="row"][data-node]').count() < cat.rows.length);
  await p.getByRole("group", { name: "Show as" }).getByRole("button", { name: "Cards" }).click();
  await p.locator('[data-view="cards"]').waitFor();
  const shut0 = await p.locator('[data-section] h2 button[aria-expanded="false"]').count(), cards0 = await p.locator("article[data-node]").count();
  await p.locator('[data-section] h2 button[aria-expanded="true"]').first().click();
  step("C11.10: a section header collapses its cards, keeping its count (and the list's collapse carries over)", shut0 === 1 && await p.locator('[data-section] h2 button[aria-expanded="false"]').count() === 2 && await p.locator("article[data-node]").count() < cards0 && /\d+ combinations?/.test(await p.locator('[data-section] h2 button[aria-expanded="false"]').first().textContent()));

  // ======================================================== search, other tab, Corporate
  await open();
  await p.getByRole("textbox", { name: /Search combinations/ }).fill("caregiver");
  await p.waitForFunction(() => /Nothing matches/.test(document.querySelector("main")?.textContent ?? ""));
  step("C11.10: a search with no match says so for this tab, with Clear search", /No combination matches “caregiver” in Retail/.test(await p.locator("main").innerText()) && await p.getByRole("button", { name: "Clear search" }).count() >= 1);
  await p.getByRole("textbox", { name: /Search combinations/ }).fill("High-wage");
  await p.waitForFunction(() => /\d+ match(es)? in Corporate and employers/.test(document.querySelector("main")?.textContent ?? ""));
  step("C11.10 BR-8: a match in the other tab is offered, never mixed in", /\d+ match(es)? in Corporate and employers\. Show (it|them)/.test(await p.locator("main").innerText()) && await p.locator("article[data-node]").count() === 0 && /^0 of \d+ combinations match/.test(await p.locator("[data-stats]").textContent()));
  await state("search-other-tab");
  await p.getByRole("button", { name: /^Show (it|them)$/ }).click();
  await p.waitForFunction(() => location.search.includes("pw=CORPORATE")); await ready(); await p.waitForTimeout(300);
  step("C11.10 BR-8: Show it opens Corporate and employers with the match", await setup("High-wage position").count() === 1);
  await open("?pw=CORPORATE");
  const corp = await p.locator("main").innerText();
  step("C11.10 BR-8: the Corporate tab shows its callout (Sample examples) and its own Pathway chips", await p.locator("[data-corporate-callout]").count() === 1 && /Sample examples/.test(corp) && await card("Temporary residence").count() === 1 && await card("Permanent residence").count() === 1 && await card("Corporate and employers").count() === 0);
  await state("corporate-tab");

  // ======================================================== read-only approver
  await as("user-B"); await open();
  const ro = await p.locator(`article[data-node="${ns.nodeKey}"]`).innerText();
  step("BR-15 read-only: Add combination is disabled; a Not started card has no step to take; a started card says Open", await p.getByRole("button", { name: "Add combination" }).isDisabled() && !/Start setup|Add sources/.test(ro) && await p.locator(`article[data-node="${vv}"]`).locator('[data-next-step="open"]').count() === 1, ro.replace(/\s+/g, " "));
  step("BR-15 read-only: no '+ Add pathway' on this page (P-128 (4)); adding is Add combination, off for the approver", await p.getByRole("button", { name: /Add pathway/ }).count() === 0 && await p.getByRole("button", { name: "Add combination" }).isDisabled());
  await state("read-only");
  await as("user-A");

  // ======================================================== S1 fix 1: Start setup under "Used by"
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(tr)}`);
  const panel = () => p.locator("aside[aria-label$='details']");
  await panel().locator("[data-used-by]").waitFor();
  const start = panel().locator("[data-used-by]").getByRole("link", { name: `Start setup of ${nsTr.label}` }).first();
  step("S1 fix: under 'Used by' a Not started combination gets Start setup; one with setup keeps Open", await start.count() === 1 && await panel().locator("[data-used-by]").getByRole("link", { name: "Open Visitor visa" }).count() === 1);
  await start.click();
  await p.waitForURL(/\/new\?leaf=/);
  const nsPath = nsTr.path.join(" › ");
  await p.waitForFunction((x) => (document.querySelector("main")?.textContent ?? "").includes(x), nsPath, { timeout: 10000 }).catch(() => undefined);
  step("S1 fix: Start setup opens New combination with that trail filled in", (await p.locator("main").innerText()).includes(nsPath), `${nsPath}: ${(await p.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 240)}`);
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(nsTr.nodeKey)}`);
  await panel().locator("[data-used-by]").waitFor();
  step("S1 fix: a Not started combination's own panel offers Start setup too", await panel().locator("[data-used-by] [data-start-setup]").count() === 1);

  // ======================================================== S1 fix 2: the panel footer fully visible
  const footerFits = async () => p.evaluate(() => {
    const f = document.querySelector("[data-panel-footer]"); if (!f) return { ok: false, why: "no footer" };
    const bs = [...f.querySelectorAll("button")].map((x) => ({ t: x.textContent.trim(), r: x.getBoundingClientRect() }));
    return { ok: bs.length >= 3 && bs.every((x) => x.r.top >= 0 && x.r.bottom <= window.innerHeight && x.r.height > 0), words: bs.map((x) => x.t), bottom: Math.round(Math.max(...bs.map((x) => x.r.bottom))), h: window.innerHeight };
  });
  for (const [w, h] of [[1440, 900], [1024, 768]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`${BASE}/structure?node=${encodeURIComponent(tr)}`); await panel().locator("[data-used-by]").waitFor(); await p.waitForTimeout(400);
    let f = await footerFits();
    step(`S1 fix: at ${w}×${h} the panel's footer (Remove, Retire, Close, Save) is fully on screen without scrolling`, f.ok && f.words.includes("Remove") && f.words.includes("Retire") && f.words.includes("Save"), JSON.stringify(f));
    await p.mouse.wheel(0, 600); await p.waitForTimeout(300);
    f = await footerFits();
    step(`S1 fix: at ${w}×${h} the footer stays fully on screen after scrolling the page`, f.ok, JSON.stringify(f));
    if (w === 1440) { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200); await p.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-structure-panel-footer-1440.png`) }); }
    else await p.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-structure-panel-footer-1024.png`) });
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // ======================================================== break-report S2: the address, Back, long names, keys
  for (const [qs, what] of [["?p=nope", "an unknown"], ["?p=corporate.temporary_residence", "the other tab's"], [`?p=${"x".repeat(300)}`, "a 300-character"]]) {
    await open(qs); await p.waitForFunction(() => !/[?&]p=/.test(location.search), null, { timeout: 5000 }).catch(() => undefined);
    const st = await p.locator("[data-stats]").textContent();
    step(`break M1/m1: ${what} Pathway in the address is ignored: All pathways, real counts, no error`, await card("All").getAttribute("aria-pressed") === "true" && !/^0 combinations/.test(st) && await p.locator("[data-section]").count() === 3 && !/[?&]p=/.test(p.url()), st);
  }
  await open("?p=retail.citizenship%20");
  step("break m2: a Pathway key with spaces opens that Pathway, and its card is the pressed one", await card("Citizenship").getAttribute("aria-pressed") === "true" && await p.locator("[data-section]").count() === 1);
  await open();
  await card("Permanent residence").click(); await p.waitForFunction(() => document.querySelectorAll("[data-section]").length === 1);
  await card("Citizenship").click(); await p.waitForFunction(() => /p=retail\.citizenship/.test(location.search));
  await p.goBack(); await p.waitForFunction(() => /p=retail\.permanent_residence/.test(location.search), null, { timeout: 5000 }).catch(() => undefined);
  step("break m4: browser Back returns to the Pathway chosen before", /p=retail\.permanent_residence/.test(p.url()) && await card("Permanent residence").getAttribute("aria-pressed") === "true", p.url());
  const longPw = await add("INDIVIDUAL", "pathway", "Permanent residence for highly skilled economic immigrants and their accompanying family members", null);
  const longProg = await add("INDIVIDUAL", "program", "Programme fédéral des travailleurs qualifiés et des métiers spécialisés en Ontario", longPw);
  const longCat = await add("INDIVIDUAL", "category", "Bulk category number 01 with a fairly long descriptive name for scale testing", longProg);
  const longSub = await add("INDIVIDUAL", "subCategory", "Applicants who are currently living outside of Canada with family", longCat);
  const unbroken = await add("INDIVIDUAL", "subCategory", "Supercalifragilisticexpialidocious".repeat(3) + "Abcdefghijklmn", longCat);
  const under = await api(`/catalogue?pathway=INDIVIDUAL&filter=all&under=${encodeURIComponent(longSub)}`);
  const reo = await api("/structure/reorder", { method: "POST", data: { pathwayType: "INDIVIDUAL", parentKey: longCat, keys: [unbroken, longSub] } });
  step("break M2: keys the server makes from long names pass its own contracts (list under it, reorder)", longSub?.length > 200 && under.status === 200 && under.body.rows.length === 1 && reo.status < 300, `${longSub?.length} chars; under ${under.status}; reorder ${reo.status}`);
  for (const w of [1440, 1024]) {
    await p.setViewportSize({ width: w, height: 900 }); await open(`?p=${encodeURIComponent(longPw)}`);
    step(`break m5: at ${w} px one long unbroken name wraps inside its card (no sideways scroll)`, await p.locator(`article[data-node="${unbroken}"]`).count() === 1 && !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), await p.evaluate(() => document.documentElement.scrollWidth));
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(`${BASE}/new?leaf=nope`); await p.getByText("Check the path").waitFor({ timeout: 10000 }).catch(() => undefined);
  step("break m6: a Start setup link with a key the page cannot use says why", /not in the Program structure for Retail any more/.test(await p.locator("main").innerText()));
  await p.goto(`${BASE}/new?leaf=individual.work_permits.open`); await p.getByText("Check the path").waitFor({ timeout: 10000 }).catch(() => undefined);
  step("break m7: a category with sub-categories asks for one of them", /Open work permit has sub-categories: choose one of them below/.test(await p.locator("main").innerText()));

  // ======================================================== scale: 50 combinations stay quick
  for (let i = 0; i < 30; i++) await add("INDIVIDUAL", "category", `Scale sample ${String(i + 1).padStart(2, "0")}`, "individual.visitors");
  const t0 = Date.now(); await open(); const ms = Date.now() - t0;
  const fifty = await p.locator("article[data-node]").count();
  await p.getByRole("button", { name: /^Status: All/ }).click(); await p.getByRole("menuitemradio").first().waitFor();
  const filterMs = await p.evaluate(async () => {
    const item = [...document.querySelectorAll('[role="menuitemradio"]')].find((x) => x.textContent.startsWith("Not started"));
    const done = () => new URL(location.href).searchParams.get("f") === "not_started" && !document.querySelector('[data-stats][aria-busy="true"]') && [...document.querySelectorAll("article[data-node]")].every((a) => /Not started/.test(a.textContent));
    const t = performance.now(); item.click();
    await new Promise((res) => { const o = new MutationObserver(() => { if (done()) { o.disconnect(); res(); } }); o.observe(document.body, { subtree: true, childList: true, attributes: true }); });
    return Math.round(performance.now() - t);
  });
  step("C11.10 scale (STANDARDS §9): with 50+ combinations a Status change answers within 200 ms in the page", filterMs < 200, `${filterMs} ms`);
  await open();
  const t1 = Date.now(); await p.getByRole("textbox", { name: /Search combinations/ }).fill("Scale sample 2"); await p.waitForFunction(() => document.querySelectorAll("article[data-node]").length === 10 && [...document.querySelectorAll("article[data-node]")].every((a) => /Scale sample 2/.test(a.textContent))); const ms2 = Date.now() - t1;
  step("C11.10 scale: 50+ combinations show as cards and a search narrows them (120 ms typing pause included)", fifty >= 50 && ms2 < 1000, `${fifty} cards, first view ${ms} ms, search ${ms2} ms`);
  step("sanity: database still holds every Structure name", Number(sql("select count(*) from program_def")) > 50);

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
