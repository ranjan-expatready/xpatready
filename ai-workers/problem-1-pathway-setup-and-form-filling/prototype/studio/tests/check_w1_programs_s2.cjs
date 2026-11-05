// S2 Immigration programs (W1-04, design D, P-115; Lead note 27 Oct) walked in a real browser, plus the two S1 fixes and
// the seven S2 early-look fixes (P-112 sample Pathways, Start setup, no silent start, form counts, search width, the
// need-you rule, the Not started card).
// The page: menu and title "Immigration programs"; Retail · Corporate and employers tabs; the same Pathway cards as the
// Structure (a card shows only that Pathway's combinations, "All pathways" every Pathway's section); Cards / List,
// remembered per person; every card the full five-part trail, a calculated status, the four setup steps and "Filed:";
// "Status: All ▾" instead of a filter-tab row; search and Add combination placed (P-128: Pathway chips replace the cards); Corporate callout; read-only and
// empty states. Moved to the card v4 (P-180, concept W1-setup-checklist §6–§7): status chips All · Not started ·
// In progress · Live, Needs you is the viewer's, a card is name · full trail · "n of 5 steps" or "✓ Live" · one button,
// sections count "n of m live"; what the card no longer shows (Filed:, form counts, Step n of 4) is not checked here.
// S1 fixes: "Start setup" for a Not started combination under "Used by" (New combination with the trail
// filled), and the panel's footer (Remove / Retire, Save) fully visible at 1440×900 and 1024×768. The sample inputs and
// the P-112 Sample names are added through the API the pages call. Screenshots at 1440 and 1024 px into
// product/screens/W1-structure-programs/screenshots/s2/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_s2 4447 start && node studio/tests/check_w1_programs_s2.cjs 4447 xr_studio_screens_s2
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { speed } = require("./speed_budget.cjs"); // P-184: speed budgets judged only when the Mac is not busy
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
  // C11.12 BR-7 (P-233): a new release needs a filing mode on every applicant role; set as the author would (Sample).
  sql(`update combination set participants = (select jsonb_agg(case when x->>'role' in ('spouse_or_partner','child') then x || '{"filingMode":"files_own"}'::jsonb else x end) from jsonb_array_elements(participants) x) where id='${ss.id}'`);
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  // G5 (C5.1, P-248, #868): a release needs a document line beside its form; one with a type the library has released.
  await api(`/combinations/${ss.id}/requirements`, { method: "POST", data: { documentTypeKey: sql("select document_type_key from document_type where status = 'PUBLISHED' order by document_type_key limit 1"), attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" } });
  await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const ssSme = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (ssSme.length) await api(`/combinations/${ss.id}/signoff`, { method: "POST", actor: "user-C", data: { items: ssSme, action: "signed" } });
  const rel = await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: (await api("/draft")).body.changes } });
  // B78 (BR-8 reads the one list Preview and a case show): a release that asks each person nothing, the state this page shows as Not ready.
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{placements}', '[]'::jsonb) where combination_id = '${ss.id}'`);
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
  // Card v4 (P-180 Q2): the status is a row of chips All · Not started · In progress · Live next to the search.
  const chips = await p.locator("[data-status-chip]").evaluateAll((b) => b.map((x) => x.getAttribute("data-status-chip")));
  step("C11.10 P-180: no filter-tab row; the status is the chips All · Not started · In progress · Live next to the search", await p.getByRole("group", { name: "Show combinations" }).count() === 0 && chips.join("|") === "all|not_started|in_progress|live" && await p.locator('[data-status-chip="all"]').getAttribute("aria-pressed") === "true" && await p.getByRole("textbox", { name: /Search combinations/ }).count() === 1, chips.join("|"));
  const titleRow = await p.evaluate(() => { const h = document.querySelector("h1").getBoundingClientRect(); const bs = [...document.querySelectorAll("main button")].filter((x) => /^(Program structure|Add combination)$/.test(x.textContent.trim())); return bs.map((x) => ({ t: x.textContent.trim(), top: Math.abs(x.getBoundingClientRect().top - h.top) < 24, x: Math.round(x.getBoundingClientRect().left) })); });
  step("C11.10 P-128 (5): Program structure and Add combination sit in the title row, Add combination last", titleRow.length === 2 && titleRow.every((x) => x.top) && titleRow[1].t === "Add combination" && titleRow[0].t === "Program structure" && titleRow[1].x > titleRow[0].x, JSON.stringify(titleRow));

  // ======================================================== fix 5: the search takes the free width, its hint never cut
  for (const [w, h] of [[1440, 900], [1024, 768]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(200);
    const sb = await p.getByRole("textbox", { name: /Search combinations/ }).evaluate((x) => { const c = document.createElement("canvas").getContext("2d"); const cs = getComputedStyle(x); c.font = cs.font; const room = x.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return { w: Math.round(x.getBoundingClientRect().width), need: Math.round(c.measureText(x.placeholder).width), room: Math.round(room) }; });
    // Since P-128 (4) (board P2) the search shares its line with the Pathway chips, Program, Status and Needs you.
    step(`S2 fix 5 (P-128 board P2): at ${w} px the search grows into the free width of its line and its hint is not cut`, sb.need <= sb.room && sb.w >= 300, JSON.stringify(sb));
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // ======================================================== Pathway cards; fix 6: "need you" counts only what waits on a person
  const all = card("All");
  step("C11.10 P-128 (4): Pathway chips: All, one per Retail Pathway (no 'Individual'), and no '+ Add pathway'", await all.count() === 1 && await card("Temporary residence").count() === 1 && await card("Permanent residence").count() === 1 && await card("Citizenship").count() === 1 && await card("Individual").count() === 0 && await p.getByRole("button", { name: /Add pathway/ }).count() === 0);
  const waiting = (key) => cat.rows.filter((r) => r.pathwayKey === key && r.needsYou).length;
  const WAIT = ["review_proposals", "see_missing", "see_new_edition", "release"];
  const trS0 = cat.sections.find((x) => x.pathwayKey === tr);
  // Card v4 (P-180 Q1): Needs you is the viewer's. Super visa's AI proposals wait on the author (user-A); Spouse of a
  // student's release passes its own checks (chip Live), so nothing of it waits on user-A.
  step("S2 fix 6 (review M1) P-180: the combination waiting on this person counts, in its Pathway's section and chip", svRow.needsYou && trS0.needs >= 1 && trS0.needs === waiting(tr), `${trS0.label} ${trS0.needs}; Spouse of a student ${ssRow.needsYou}`);
  step("S2 fix 6: need you counts only combinations waiting on a person: never a Not started one, never a Live one with nothing waiting", cat.rows.every((r) => r.combinationId || !r.needsYou) && cat.rows.filter((r) => r.status === "READY" && !r.aiProposals && !r.held.length && !WAIT.includes(r.nextAction?.kind)).every((r) => !r.needsYou) && cat.sections.every((x) => x.needs === waiting(x.pathwayKey)), cat.sections.map((x) => `${x.label} ${x.needs}/${x.combinations}`).join(", "));
  const trS = cat.sections.find((x) => x.pathwayKey === tr);
  const trCard = await card("Temporary residence").evaluate((b) => ({ n: b.querySelector("[data-count]")?.textContent, need: b.querySelector("[data-need]")?.textContent ?? "" }));
  step("S2 fix 6: a Pathway chip's counts are the catalogue's (combinations, need you)", trCard.n === String(trS.combinations) && (trS.needs ? trCard.need.startsWith(String(trS.needs)) : !trCard.need), JSON.stringify(trCard));
  // CHECK 30 Oct (review M4): one count path (concept §8). The Structure's Pathway need counts are each person's own
  // Needs you, the same as the Programs sections, for the author, the approver and the expert.
  const pairs = [];
  for (const who of ["user-A", "user-B", "user-C"]) {
    const st = (await api("/structure?pathwayType=INDIVIDUAL", { actor: who })).body.nodes.filter((x) => x.level === "pathway");
    const pr = (await api("/catalogue?pathway=INDIVIDUAL&filter=all", { actor: who })).body.sections;
    pairs.push({ who, same: pr.every((x) => st.find((y) => y.key === x.pathwayKey)?.needs === x.needs), st: st.map((x) => x.needs).join(","), pr: pr.map((x) => x.needs).join(",") });
  }
  step("C11.10 concept §8: the Structure's Pathway need counts equal the Programs sections' for each person", pairs.every((x) => x.same), pairs.map((x) => `${x.who} ${x.st} vs ${x.pr}`).join(" · "));
  step("C11.10 (fail case): the counts are per person, not one number for everyone", new Set(pairs.map((x) => x.pr)).size > 1, pairs.map((x) => `${x.who} ${x.pr}`).join(" · "));
  const secs = await p.locator("[data-section]").evaluateAll((s) => s.map((x) => x.querySelector("h2").textContent));
  step("C11.10 S2 P-180: 'All pathways' (the default) shows one section per Pathway, with its 'n of m live' count", await all.getAttribute("aria-pressed") === "true" && secs.length === 3 && cat.sections.every((x, i) => secs[i].startsWith(x.label) && secs[i].includes(`${x.live} of ${x.combinations} live`)), secs.join(" | "));
  // Card v4 §7: with the Needs you toggle on, each Pathway header says how many need you; the toggle explains itself.
  const toggle = p.locator("[data-needs-you]");
  await toggle.hover(); await p.getByRole("tooltip").filter({ hasText: /waits for you/ }).first().waitFor({ timeout: 5000 }).catch(() => undefined);
  const toggleTips = await p.getByRole("tooltip").allTextContents();
  await toggle.click(); await p.waitForFunction(() => new URLSearchParams(location.search).get("n") === "1"); await ready(); await p.waitForTimeout(300);
  const chipText = (await p.locator(`[data-section="${tr}"] [data-need-you]`).textContent().catch(() => "")) ?? "";
  step("S2 fix 6 (review M1) P-180: with Needs you on, the section shows its need-you count, and the toggle explains itself", chipText.startsWith(`${trS0.needs} need`) && toggleTips.some((t) => /Combinations where something waits for you: a review or a confirmation on your duty\./.test(t)), `${chipText} / ${toggleTips.join(" | ")}`);
  await toggle.click(); await p.waitForFunction(() => !new URLSearchParams(location.search).get("n")); await ready(); await p.waitForTimeout(300);
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
  step("C11.10 S2: the card's tooltip says what a click does and what 'need you' means", tips.some((t) => /Shows only Permanent residence's combinations\..*"need you" counts those waiting for you/.test(t)), tips.join(" | "));
  await state("pathway-card-open");
  await all.click();
  await p.waitForFunction(() => document.querySelectorAll("[data-section]").length === 3);
  step("C11.10 S2: All pathways brings every section back", !/[?&]p=/.test(p.url()));

  // ======================================================== a card (concept v4 §7): name, full trail, progress, one button
  const trailOf = (r) => r.trail.filter((x) => x && x !== "No sub-category");
  const nameOf = (r) => (r.trail[4] && r.trail[4] !== "No sub-category" ? r.trail[4] : r.trail[3] ?? r.label);
  const live = cat.rows.find((r) => r.setup?.chip.status === "LIVE");
  const liveCard = p.locator(`article[data-node="${live.nodeKey}"]`);
  const liveText = await liveCard.innerText();
  step("C11.10 BR-7 P-180: a card's heading is its name and the full trail is one grey line (full trail on hover)", (await liveCard.locator("[data-trail]").textContent()) === trailOf(live).join(" › ") && (await liveCard.locator("[data-trail]").getAttribute("title")) === trailOf(live).join(" › ") && (await liveCard.locator("h3").textContent()) === nameOf(live), liveText.replace(/\s+/g, " ").slice(0, 160));
  const heads = await p.locator("article[data-node] h3").allTextContents(), trails = await p.locator("article[data-node] [data-trail]").allTextContents();
  step("C11.10 BR-7: no card heading is blank and no trail says 'No sub-category'", heads.length === cat.rows.length && heads.every((t) => t.trim().length > 0) && trails.every((t) => !/No sub-category/.test(t)));
  step("C11.10 A3 P-180: the Live card shows ✓ Live with an all-green edge bar and Open", /✓ Live/.test(liveText) && await liveCard.getAttribute("data-state") === "LIVE" && await liveCard.locator('[data-edge-bar="live"]').count() === 1 && await liveCard.locator('[data-card-button="open"]').count() === 1, liveText.replace(/\s+/g, " "));
  const nsCard = p.locator(`article[data-node="${ns.nodeKey}"]`);
  const nsText = await nsCard.innerText();
  step("S2 fix 7 P-180: a Not started card shows '0 of 5 steps' over an empty edge bar, never 'Step 1 of 4'", /0 of 5 steps/.test(nsText) && !/Step 1 of 4/.test(nsText) && await nsCard.getAttribute("data-state") === "NOT_STARTED" && await nsCard.locator('[data-edge-bar="0"]').count() === 1, nsText.replace(/\s+/g, " "));
  step("S2 fix 2: a Not started card's one button reads Start setup (no 'Add sources' anywhere on a Not started card)", (await nsCard.locator('[data-next-step="start"]').textContent()).trim() === "Start setup" && !(await p.locator('article[data-state="NOT_STARTED"]').allInnerTexts()).some((t) => /Add sources|Find forms/.test(t)));
  const vvCard = p.locator(`article[data-node="${vv}"]`);
  const vvText = await vvCard.innerText();
  step("S2 fix 4 P-180: an In progress card says 'n of 5 steps' as the checklist counts them, with Resume setup (no form count on the card)", vvText.includes(vvRow.setup.bar.text) && /^[0-5] of 5 steps$/.test(vvRow.setup.bar.text) && await vvCard.locator('[data-card-button="resume"]').count() === 1 && !/attached, not added yet|ready to add from the library/.test(vvText), vvText.replace(/\s+/g, " "));
  // fix 3: a Not started name never starts anything by itself
  const before = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.counts;
  const combos0 = sql("select count(*) from combination");
  await nsCard.locator("[data-open]").click();
  await p.waitForTimeout(400);
  const after = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.counts;
  const said = await p.locator('[aria-live="polite"]').allTextContents();
  step("S2 fix 3 / S3: clicking a Not started name opens no page and says Start setup begins it; the counts do not change and nothing is created", new URL(p.url()).pathname === "/" && said.some((t) => t.includes(`${ns.label} is not started yet. Start setup on it begins its setup.`)) && after.not_started === before.not_started && after.in_setup === before.in_setup && sql("select count(*) from combination") === combos0, `${JSON.stringify({ ns: [before.not_started, after.not_started], setup: [before.in_setup, after.in_setup] })} ${p.url()} ${ns.label}: ${(await p.locator("main").innerText()).replace(/\s+/g, " ").slice(-300)}`);
  await state("start-setup-from-card");
  await open("?v=list");
  await p.locator(`[role="row"][data-node="${ns.nodeKey}"]`).focus(); await p.keyboard.press("Enter");
  await p.waitForTimeout(400);
  step("S2 fix 3: Enter on a Not started row does the same (no start)", (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.counts.not_started === before.not_started && sql("select count(*) from combination") === combos0);
  await open();
  await vvCard.locator("[data-open]").click();
  await p.waitForURL(new RegExp(`/c/${vvRow.combinationId}`));
  step("C11.10 P-50: a set-up card's name opens the combination page", p.url().includes(`/c/${vvRow.combinationId}`));
  await p.goBack(); await ready();
  await p.waitForFunction((k) => document.activeElement?.closest("article")?.getAttribute("data-node") === k, vv, { timeout: 5000 }).catch(() => undefined);
  step("C11.10 P-50: Back returns with that card highlighted and focused", await p.evaluate((k) => document.activeElement?.closest("article")?.getAttribute("data-node") === k, vv) && /sel=/.test(p.url()));

  // ======================================================== the status chips (P-180 Q2)
  await open();
  const chipOf = async (k) => ({ t: (await p.locator(`[data-status-chip="${k}"]`).innerText()).replace(/\s+/g, " ").trim() });
  const counts0 = cat.counts, chipTexts = [];
  for (const [k, w] of [["all", "All"], ["not_started", "Not started"], ["in_progress", "In progress"], ["live", "Live"]]) chipTexts.push([(await chipOf(k)).t, `${w} ${counts0[k]}`]);
  await p.locator('[data-status-chip="live"]').hover(); await p.getByRole("tooltip").filter({ hasText: /Firms can open cases on it/ }).first().waitFor({ timeout: 5000 }).catch(() => undefined);
  step("C11.10 BR-13 P-180: the chips All (default) · Not started · In progress · Live each carry the catalogue's count, and say what they mean", chipTexts.every(([a, b]) => a === b) && (await p.getByRole("tooltip").allTextContents()).some((t) => /Firms can open cases on it/.test(t)), JSON.stringify(chipTexts));
  await p.locator('[data-status-chip="not_started"]').click(); await p.waitForFunction(() => location.search.includes("f=not_started")); await ready(); await p.waitForTimeout(300);
  const nsApi = (await api("/catalogue?pathway=INDIVIDUAL&filter=not_started")).body;
  const shownNs = await p.locator("article[data-node]").evaluateAll((a) => a.map((x) => x.getAttribute("data-node")).sort());
  step("C11.10 BR-13: Not started shows exactly the combinations with no setup yet", nsApi.rows.length > 0 && nsApi.rows.every((r) => !r.combinationId) && JSON.stringify(shownNs) === JSON.stringify(nsApi.rows.map((r) => r.nodeKey).sort()) && /showing \d+ Not started/.test(await p.locator("[data-stats]").textContent()), `${shownNs.length} shown, API ${nsApi.rows.length}`);
  const inSetup = (await api("/catalogue?pathway=INDIVIDUAL&filter=in_progress")).body.rows;
  step("C11.10 BR-13 P-180: In progress never counts Not started ones", inSetup.every((r) => !!r.combinationId) && inSetup.some((r) => r.nodeKey === vv));
  await state("status-not-started");

  // ======================================================== Cards / List, remembered per person
  await open();
  await p.getByRole("group", { name: "Show as" }).getByRole("button", { name: "List" }).click();
  await p.locator('[role="grid"][aria-label="Combinations"]').waitFor();
  const groupRows = await p.locator("[data-group]").count();
  const listRow = p.locator(`[role="row"][data-node="${live.nodeKey}"]`);
  const programBands = new Set(cat.rows.map((r) => `${r.pathwayKey}|${r.trail[2]}`)).size;
  step("C11.10 P-180: List shows the same combinations as rows, grouped by Pathway then Program (group rows collapse)", groupRows === cat.sections.length + programBands && await p.locator('[role="row"][data-node]').count() === cat.rows.length, `${groupRows} group rows; ${cat.sections.length} Pathways + ${programBands} Programs`);
  step("C11.10 BR-7 P-180: a row carries the name, the trail above it, the progress and the one button", (await listRow.locator("[data-name]").textContent()) === nameOf(live) && trailOf(live).join(" › ").startsWith(await listRow.locator("[data-trail]").textContent()) && /^Live( · Next release: \d of 5 steps? to do)?$/.test(await listRow.locator("[data-progress]").textContent()) /* QA-184 */ && await listRow.locator("[data-step-cell] [data-card-button]").count() === 1, await listRow.innerText());
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
  const shut1 = await p.locator('[data-section] h2 button[aria-expanded="false"]').count(), cards1 = await p.locator("article[data-node]").count();
  step("C11.10 P-180: a section header collapses its cards, keeping its 'n of m live' count (and the list's collapse carries over)", shut0 === 1 && shut1 === 2 && cards1 < cards0 && /\d+ of \d+ live/.test(await p.locator('[data-section] h2 button[aria-expanded="false"]').first().textContent()), `${shut0}→${shut1} shut, ${cards0}→${cards1} cards`);
  // CHECK 30 Oct (break M2): a folded Pathway's own chip is a filter, so it opens that Pathway's cards.
  const foldedKey = await p.locator('[data-section]:has(h2 button[aria-expanded="false"])').first().getAttribute("data-section");
  await p.locator(`[data-pathway-chip="${foldedKey}"]`).click();
  await p.waitForFunction((k) => new URLSearchParams(location.search).get("p") === k, foldedKey);
  await p.locator(`[data-section="${foldedKey}"] article[data-node]`).first().waitFor({ timeout: 8000 }).catch(() => undefined);
  step("C11.10 concept v4 §7: a folded Pathway's chip opens its section (a filter opens every section with a match)", await p.locator(`[data-section="${foldedKey}"] article[data-node]`).count() > 0 && await p.locator(`[data-section="${foldedKey}"] h2 button[aria-expanded="false"]`).count() === 0, foldedKey);
  await p.locator(`[data-pathway-chip="all"]`).click();
  await p.waitForFunction(() => !new URLSearchParams(location.search).get("p"));
  await p.locator(`[data-section="${foldedKey}"] h2 button[aria-expanded="false"]`).waitFor({ timeout: 8000 }).catch(() => undefined);
  step("C11.10 (fail case): back on All, the person's fold is kept", await p.locator(`[data-section="${foldedKey}"] h2 button[aria-expanded="false"]`).count() === 1);
  // Folds last per person (concept v4 §7): open everything again for the steps below.
  await p.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith("xr-programs-fold:")) localStorage.removeItem(k); } catch { /* ignore */ } });

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
  step("BR-15 read-only: Add combination is disabled; a Not started card has no step to take; a started card says Open", await p.getByRole("button", { name: "Add combination" }).isDisabled() && !/Start setup|Add sources|Find forms/.test(ro) && await p.locator(`article[data-node="${vv}"]`).locator('[data-card-button="open"]').count() === 1, ro.replace(/\s+/g, " "));
  step("BR-15 read-only: no '+ Add pathway' on this page (P-128 (4)); adding is Add combination, off for the approver", await p.getByRole("button", { name: /Add pathway/ }).count() === 0 && await p.getByRole("button", { name: "Add combination" }).isDisabled());
  await state("read-only");
  await as("user-A");

  // ======================================================== S1 fix 1: Start setup under "Used by"
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(tr)}`);
  const panel = () => p.locator("aside[aria-label$='details']");
  await panel().locator("[data-used-by]").waitFor();
  const start = panel().locator("[data-used-by]").getByRole("button", { name: `Start setup: ${nsTr.label}` }).first();
  step("S1 fix: under 'Used by' a Not started combination gets Start setup; one with setup keeps Open", await start.count() === 1 && await panel().locator("[data-used-by]").getByRole("link", { name: "Open Visitor visa" }).count() === 1);
  await start.click();
  await p.waitForURL(/\/c\/[0-9a-f-]+\/(sources|forms)/); // S3 item 5: Start setup opens the Forms tab
  const place = await p.getByRole("navigation", { name: "Path" }).innerText().catch(() => "");
  step("S3: Start setup in Edit creates the setup and opens it on its Forms tab, its place shown (read-only)", nsTr.path.every((x) => place.includes(x)) && await p.getByRole("heading", { level: 1, name: nsTr.label }).count() === 1, place);
  await p.goto(`${BASE}/structure?node=${encodeURIComponent(nsTr.nodeKey)}`);
  await panel().locator("[data-used-by]").waitFor();
  step("S3: once started, its own panel offers Open, no Start setup", await panel().locator("[data-used-by] [data-start-setup]").count() === 0 && await panel().locator("[data-used-by]").getByRole("link", { name: "Open" }).count() >= 1);

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
    // Since P-128 the panel's footer holds the row's one action (here Retire), Close and Save.
    step(`S1 fix: at ${w}×${h} the panel's footer (its action, Close, Save) is fully on screen without scrolling`, f.ok && f.words.includes("Retire") && f.words.includes("Close") && f.words.includes("Save"), JSON.stringify(f));
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
  // S3: Start setup is one request now (no page to open with a key); the same refusals come from it in plain words.
  let st = await api("/combinations/start", { method: "POST", data: { nodeKey: "nope" } });
  step("break m6 (S3): Start setup with a key that is not in the Program structure says so (404)", st.status === 404 && /does not exist/.test(st.body.detail), st.body.detail);
  st = await api("/combinations/start", { method: "POST", data: { nodeKey: "individual.work_permits.open" } });
  step("break m7 (S3): a category with sub-categories asks for one of them (400)", st.status === 400 && /Open work permit" has sub-categories: choose one of them/.test(st.body.detail), st.body.detail);

  // ======================================================== scale: 50 combinations stay quick
  for (let i = 0; i < 30; i++) await add("INDIVIDUAL", "category", `Scale sample ${String(i + 1).padStart(2, "0")}`, "individual.visitors");
  const t0 = Date.now(); await open(); const ms = Date.now() - t0;
  const fifty = await p.locator("article[data-node]").count();
  const filterMs = await p.evaluate(async () => {
    const item = document.querySelector('[data-status-chip="not_started"]');
    const done = () => new URL(location.href).searchParams.get("f") === "not_started" && !document.querySelector('[data-stats][aria-busy="true"]') && [...document.querySelectorAll("article[data-node]")].every((a) => a.getAttribute("data-state") === "NOT_STARTED");
    const t = performance.now(); item.click();
    await new Promise((res) => { const o = new MutationObserver(() => { if (done()) { o.disconnect(); res(); } }); o.observe(document.body, { subtree: true, childList: true, attributes: true }); });
    return Math.round(performance.now() - t);
  });
  { const s = speed("C11.10 scale (STANDARDS §9): with 50+ combinations a Status change answers within 200 ms in the page", filterMs < 200, `${filterMs} ms`); step(s.label, s.ok, s.detail); }
  await open();
  const t1 = Date.now(); await p.getByRole("textbox", { name: /Search combinations/ }).fill("Scale sample 2"); await p.waitForFunction(() => document.querySelectorAll("article[data-node]").length === 10 && [...document.querySelectorAll("article[data-node]")].every((a) => /Scale sample 2/.test(a.textContent))); const ms2 = Date.now() - t1;
  { const s = speed("C11.10 scale: 50+ combinations show as cards and a search narrows them (120 ms typing pause included)", ms2 < 1000, `${fifty} cards, first view ${ms} ms, search ${ms2} ms`); step(s.label, s.ok && fifty >= 50, s.detail); } // the card count is judged always (P-184 covers only the time)
  step("sanity: database still holds every Structure name", Number(sql("select count(*) from program_def")) > 50);

  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
