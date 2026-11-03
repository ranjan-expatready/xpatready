// Screen 01 (Programs, Layout v2 after the early look: P-49, P-50, P-51) in a real browser, on an isolated copy started
// fresh: sample inputs loaded, one replay of a saved real AI run on Super visa (no model call, US$0). Every state at 1440
// and 1024 px into product/screens/01-programs-catalogue/screenshots/, axe-core (WCAG 2.2 AA rules) on each state, the
// keyboard path (pathway → view → list → Enter opens the combination → Back), first-view and filter timings, and the
// journeys: Needs work / Live / All, status sort, row opens the combination page, clickable path, Back keeps the place
// and highlights the row, "+ Add form" through the one intake with an approved older edition held, not-started row, non-author.
//   zsh studio/tools/isolated.sh s01ui 4404 start && node studio/tests/check_screen01_browser.cjs 4404 [xr_studio_s01ui]
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { speed } = require("./speed_budget.cjs"); // P-184: speed budgets judged only when the Mac is not busy
const { sourceEveryNumber } = require("./fixtures/source-every-number.cjs"); // G1 (C5.4): a release needs every number sourced
const PORT = Number(process.argv[2] ?? 4404), BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const OFFICIAL = path.join(ROOT, "official-sources", "ircc");
const SHOTS = path.join(ROOT, "product", "screens", "01-programs-catalogue", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const EVID = path.join(__dirname, "..", "evidence", "screen01"); fs.mkdirSync(EVID, { recursive: true });
const log = []; const axeLog = []; const timings = {};
/** A minimal one-page PDF whose title and text carry a form code and edition (a synthetic newer edition, test input). */
function pdf(title, text) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
let lastStep = "(before the first step)"; // named when the script stops on an error (the suite table shows the last line)
const step = (name, ok, detail) => { lastStep = name; log.push({ name, ok: !!ok, detail: detail === undefined ? undefined : String(detail).slice(0, 400) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 200)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  // S2 (W1-04): Immigration programs opens as Cards by default; this suite checks the List view (the old Screen 01
  // list: rows, roving focus, sort, Back), so every person starts with List remembered.
  await p.addInitScript(() => { for (const a of ["user-A", "user-B", "user-C", "user-D"]) { try { localStorage.setItem(`xr-programs-view:${a}`, "list"); } catch { /* ignore */ } } });
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: init.timeout ?? 30000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const idle = async () => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(120); };
  const grid = () => p.getByRole("grid", { name: "Combinations" });
  const row = (label) => grid().locator(`[role="row"][data-label="${label.replace(/"/g, '\\"')}"]`).first();
  const as = async (id) => { await p.getByLabel("Simulated person").selectOption(id); await idle(); };
  /** The list has its rows (not the loading skeleton) — read nothing before it. */
  const listReady = () => p.waitForFunction(() => !document.querySelector('[aria-label="Loading programs"]') && document.querySelectorAll('[role="grid"][aria-label="Combinations"] [role="row"][data-node]').length > 0, null, { timeout: 30000 });
  /** A combination page has loaded for this row: its title and the full path in the header (CI run 40157656563: reads
   *  ran before the page had drawn on a busy runner). */
  const onCombination = async (label) => {
    await p.waitForURL(/\/c\//);
    await p.waitForFunction((l) => document.querySelector("h1")?.textContent === l && document.querySelectorAll('nav[aria-label="Path"] a').length >= 2, label, { timeout: 30000 });
    await idle();
  };
  /** Waits until keyboard focus is on the list row with this label (roving focus moves on the next frame). */
  const focusOn = (label) => p.waitForFunction((l) => document.activeElement?.getAttribute("data-label") === l, label, { timeout: 5000 });
  let n = 0;
  /** Screenshot at 1440 and 1024 (same state), and axe on it. */
  const state = async (name, opts = {}) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.waitForTimeout(150);
    const flat = opts.viewport ? null : await p.addStyleTag({ content: "header.sticky, nav.sticky { position: relative !important; top: 0 !important; }" });
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: !opts.viewport });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    axeLog.push({ state: base, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(" "), help: v.help })) });
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: !opts.viewport });
    if (flat) await flat.evaluate((e) => e.remove());
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    step(`1024 px: ${name} has no sideways scroll`, !over);
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(150);
  };

  // ======================================================== setup (scaffolding): sample inputs + one free replay
  let r = await api("/demo/load", { method: "POST", timeout: 180000 }); // setup only (not a timed budget); slow on a busy machine
  step("setup: sample inputs load through the form intake", r.status === 201, r.body?.seconds);
  const cat = (q) => api(`/catalogue?${q}`).then((x) => x.body);
  const sv = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const opts = (await api(`/attachments/${att.id}/draft-options`)).body;
  const run = (opts.saved_runs ?? []).find((x) => x.valid);
  r = await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  for (let i = 0; i < 60; i++) { const s = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === sv.nodeKey); if (s.aiProposals > 0) break; await p.waitForTimeout(500); }
  step("setup: one replay of a saved real AI run on Super visa (no model call, US$0)", r.status < 300, run?.file);
  // A released row that firms cannot use (Not ready): a form but no questions, released by a second person.
  const ss = (await api("/combinations", { method: "POST", data: { nodeKey: "individual.work_permits.open.spouse_student" } })).body.combination;
  // C11.12 BR-7 (P-233): a new release needs a filing mode on every applicant role; set as the author would (Sample).
  require("node:child_process").execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${process.argv[3] ?? "xr_studio_s01ui"}`, "-Atc", `update combination set participants = (select jsonb_agg(case when x->>'role' in ('spouse_or_partner','child') then x || '{"filingMode":"files_own"}'::jsonb else x end) from jsonb_array_elements(participants) x) where id='${ss.id}'`]);
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  // A release needs its review first (QA-1): the author submits, the content reviewer signs any expert change.
  await sourceEveryNumber(BASE, ss.id); // G1 (C5.4): the release's numbers need a source first
  await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const ssSme = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (ssSme.length) await api(`/combinations/${ss.id}/signoff`, { method: "POST", actor: "user-C", data: { items: ssSme, action: "signed" } });
  const dr = (await api("/draft")).body;
  r = await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: dr.changes } });
  step("setup: one row submitted, then released but not startable (Not ready), by a second person", r.status === 201, r.body?.detail ?? r.body?.pack);

  // ======================================================== Programs: Needs work (default)
  // Cold = first page of a freshly launched headless browser (bundle download and parse included); the budget is checked
  // on a normal visit with the app's files cached, the way a person returns to Programs.
  let t0 = Date.now(); await p.goto(BASE); await grid().waitFor(); timings.cold_first_view_ms = Date.now() - t0;
  await p.goto(`${BASE}/library/forms`); await idle();
  t0 = Date.now(); await p.goto(BASE); await grid().waitFor(); timings.first_view_ms = Date.now() - t0;
  { const s = speed("performance: first view under 1 s with the sample data (app files cached)", timings.first_view_ms < 1000, `${timings.first_view_ms} ms (cold browser ${timings.cold_first_view_ms} ms)`); step(s.label, s.ok, s.detail); }
  await idle();
  // Card v4 (P-180 Q2, amends BR-13): every combination by default; the status is one row of chips with counts.
  const chipKeys = await p.locator("[data-status-chip]").evaluateAll((cs) => cs.map((c) => `${c.dataset.statusChip}:${c.getAttribute("aria-pressed")}:${c.textContent}`));
  step("BR-13 / P-180 Q2: All is the default; the chips are All · Not started · In progress · Live, each with a count", chipKeys.length === 4 && /^all:true:All\d+$/.test(chipKeys[0]) && /^not_started:false:Not started\d+$/.test(chipKeys[1]) && /^in_progress:false:In progress\d+$/.test(chipKeys[2]) && /^live:false:Live\d+$/.test(chipKeys[3]), chipKeys.join(" | "));
  const heads = await grid().getByRole("columnheader").allTextContents();
  const upper = await grid().getByRole("columnheader").first().evaluate((e) => getComputedStyle(e.parentElement).textTransform);
  step("item 4 (card v4 List): sentence-case column headers (Combination · Trail · Progress, then Needs you and Action for screen readers)", heads.map((h) => h.trim()).join("|") === "Combination|Trail|Progress|Needs you|Action" && upper === "none", `${heads.join("|")} / ${upper}`);
  step("P-49: \"Ready\" never appears; the list says n of 5 or Live", !(await grid().textContent()).includes("Ready"));
  step("P-50: no side panel or sheet on Programs", await p.getByRole("complementary").count() === 0 && await p.getByRole("dialog").count() === 0);
  const svRow = row("Super visa");
  step("AI proposals waiting (card v4): the row's button is Resume setup and it says Needs you", (await svRow.locator("[data-step-cell]").innerText()).trim() === "Resume setup" && await svRow.locator("[data-needs-you-mark]").count() === 1, await svRow.innerText());
  // item 3: the name, then the trail above it (P-180: the trail ends in "…" when long, full on hover)
  const lines = await row("Permanent residence application").evaluate((r) => ({ name: r.querySelector("[data-name]")?.textContent, trail: r.querySelector("[data-trail]")?.textContent, title: r.querySelector("[data-trail]")?.getAttribute("title") }));
  step("item 3 + BR-7 (card v4): the name, then the trail above it, full on hover", lines.name === "Permanent residence application" && lines.trail === "Retail › Permanent residence › Economic immigration › Express Entry" && lines.title === lines.trail, JSON.stringify(lines));
  await state("programs-needs-work-default");
  // Keyboard path (as a person): focus the row, then Tab to its Needs you mark.
  await svRow.focus(); await p.keyboard.press("Tab"); await p.waitForTimeout(400);
  step("review #7 (card v4): Tab from the active row reaches its Needs you mark, which says what waits", (await p.evaluate(() => document.activeElement?.hasAttribute("data-needs-you-mark"))) && /Review \d+ proposals?/.test((await p.getByRole("tooltip").first().textContent().catch(() => "")) ?? ""));
  step("item 5: Super visa is one row, Visitors › Super visa (no Parent / Grandparent)", await row("Parent").count() === 0 && await row("Grandparent").count() === 0 && (await svRow.locator("[data-trail]").textContent()).endsWith("Visitors"), await svRow.textContent());
  await p.mouse.move(0, 0); await p.keyboard.press("Escape"); await p.evaluate(() => document.activeElement?.blur()); await idle();

  // Measured inside the page: from the click to the list showing the new view (request + render), no test-driver overhead.
  const liveWant = (await api("/catalogue?pathway=INDIVIDUAL&filter=live")).body.rows.length;
  timings.filter_ms = await p.evaluate(async (want) => {
    const btn = document.querySelector('[data-status-chip="live"]');
    const done = () => new URL(location.href).searchParams.get("f") === "live" && document.querySelectorAll('[role="row"][data-node]').length === want;
    const t = performance.now(); btn.click();
    await new Promise((res) => { const o = new MutationObserver(() => { if (done()) { o.disconnect(); res(); } }); o.observe(document.body, { subtree: true, childList: true, attributes: true }); });
    return Math.round(performance.now() - t);
  }, liveWant);
  { const s = speed("performance: changing the view answers under 200 ms", timings.filter_ms < 200, `${timings.filter_ms} ms`); step(s.label, s.ok, s.detail); }
  await idle();
  const liveRows = await grid().locator('[role="row"][data-node]').count();
  step("F1: Live shows every row that is Live", liveRows === liveWant && liveRows >= 1 && (await row("With an LMIA").innerText()).includes("Live") && await grid().locator('[role="row"][data-node]:not([data-state="LIVE"])').count() === 0, liveRows);
  await state("programs-live");

  await p.locator('[data-status-chip="all"]').click(); await idle();
  const rank = { NOT_READY: 0, IN_PROGRESS: 1, NOT_STARTED: 2, LIVE: 3 }; // the API's chip order (card v4)
  await grid().getByRole("button", { name: /^Progress/ }).click(); await idle();
  const sortState = await grid().getByRole("columnheader", { name: /Progress/ }).getAttribute("aria-sort");
  // Card v4 (P-180): rows sort inside each Program band, so the order is checked band by band.
  const bands = () => grid().locator('[role="row"][data-group], [role="row"][data-node]').evaluateAll((rs) => { const out = []; for (const r of rs) { if (r.hasAttribute("data-group")) out.push([]); else out[out.length - 1]?.push(r.getAttribute("data-state")); } return out.filter((b) => b.length); });
  const asc = await bands();
  const sortedBy = (bs, f) => bs.every((b) => b.every((s, i) => i === 0 || f(rank[b[i - 1]], rank[s])));
  step("P-49: the Progress column is sortable (not Live first, then Live, in every Program band) and says so to screen readers", sortState === "ascending" && sortedBy(asc, (a, b) => a <= b) && asc.some((b) => new Set(b).size > 1) && p.url().includes("sort=status"), `${sortState} ${JSON.stringify(asc)}`);
  await grid().getByRole("button", { name: /^Progress/ }).click(); await idle();
  const desc = await bands();
  step("P-49: sorting again puts Live first in every Program band (descending)", sortedBy(desc, (a, b) => a >= b) && (await grid().getByRole("columnheader", { name: /Progress/ }).getAttribute("aria-sort")) === "descending", JSON.stringify(desc));
  await state("programs-all-sorted-by-status");
  await grid().getByRole("button", { name: /^Progress/ }).click(); await idle();

  // S2: no Program menu (the board has none); a program in a combination's path still opens the list scoped to it.
  await p.goto(`${BASE}/?prog=individual.work_permits`); await idle(); await listReady();
  await p.waitForFunction(() => location.search.includes("prog=") && [...document.querySelectorAll('[role="row"][data-node]')].every((r) => r.getAttribute("data-node").startsWith("individual.work_permits")), null, { timeout: 5000 }).catch(() => {}); // the filtered list has arrived (review round 3)
  step("Program scope: only Work permits rows, in path order, with a 'Work permits' filter chip (P-128 (4))", (await grid().locator('[role="row"][data-node]').evaluateAll((rs) => rs.every((x) => x.getAttribute("data-node").startsWith("individual.work_permits")))) && p.url().includes("prog=") && await p.getByRole("button", { name: "Remove the filter Work permits" }).count() === 1);
  await state("programs-program-filter-work-permits");
  await p.getByRole("button", { name: "Remove the filter Work permits" }).click(); await idle();

  await p.keyboard.press("Meta+k"); await p.keyboard.type("imm 5409"); await p.waitForTimeout(400); await idle();
  await grid().getByText("Matches: IMM 5409").first().waitFor({ timeout: 5000 }).catch(() => {}); // a busy machine answers late; the check below still decides
  step("⌘K search finds a form code and says what matched", (await grid().textContent()).includes("Matches: IMM 5409"));
  await state("programs-search-form-code");
  await p.getByRole("button", { name: "Clear search" }).click(); await idle();
  await p.getByLabel("Search combinations, form numbers and documents").fill("zzzz"); await p.waitForTimeout(400); await idle();
  step("nothing matches: an empty state with a way back", await p.getByRole("heading", { name: "Nothing matches" }).count() === 1);
  await state("programs-nothing-matches");
  await p.getByRole("main").getByRole("button", { name: "Clear search" }).last().click(); await p.waitForTimeout(500); await idle();
  step("regression: \"Clear search\" keeps the All view after the search box settles (no stale URL rewrite)", !new URL(p.url()).searchParams.get("f") && !new URL(p.url()).searchParams.get("q") && await grid().count() === 1, p.url());

  const types = p.getByRole("group", { name: "Pathway type" });
  await types.getByRole("button", { name: /^Corporate and employers/ }).click(); await row("High-wage position").waitFor(); await idle();
  step("item 5: Corporate shows the demo names (LMIA › High-wage position, Low-wage position, Global Talent Stream, In-home caregiver)", await row("High-wage position").count() === 1 && await row("Low-wage position").count() === 1 && await row("Global Talent Stream").count() === 1 && await row("In-home caregiver").count() === 1 && (await row("High-wage position").locator("[data-trail]").textContent()).endsWith("› LMIA") && (await row("High-wage position").locator("[data-name]").textContent()) === "High-wage position", await row("High-wage position").innerText());
  await state("programs-corporate");
  await types.getByRole("button", { name: /^Retail/ }).click(); await idle();

  // ======================================================== keyboard: list → Enter opens the combination page
  await p.goto(`${BASE}/?f=all`); await idle(); await listReady();
  const rowLabels = await grid().locator('[role="row"][data-node]').evaluateAll((rs) => rs.map((r) => r.getAttribute("data-label")));
  await grid().locator('[role="row"][tabindex="0"]').focus();
  // Each key waits for the focus it causes (roving focus moves on the next frame): an ArrowUp pressed before End's
  // focus lands is read by the first row and does nothing.
  await p.keyboard.press("End"); await focusOn(rowLabels[rowLabels.length - 1]);
  await p.keyboard.press("ArrowUp"); await focusOn(rowLabels[rowLabels.length - 2]);
  // S2 fix 3: a Not started row opens Start setup (checked below), so Enter is tried on a row that is set up: Home,
  // then down to the first one with setup.
  const setUp = new Set((await cat("pathway=INDIVIDUAL&filter=all")).rows.filter((x) => x.combinationId).map((x) => x.label));
  await p.keyboard.press("Home"); await focusOn(rowLabels[0]);
  for (let i = 1; i < rowLabels.length && !setUp.has(await p.evaluate(() => document.activeElement?.getAttribute("data-label"))); i++) { await p.keyboard.press("ArrowDown"); await focusOn(rowLabels[i]); }
  const focusedLabel = await p.evaluate(() => document.activeElement?.getAttribute("data-label"));
  const scrollBefore = await p.evaluate(() => Math.round(window.scrollY));
  await p.keyboard.press("Enter"); await onCombination(focusedLabel);
  step("keyboard: one tab stop, ↑/↓/Home/End move, Enter opens the combination page (P-50)", /\/c\/[0-9a-f-]+$/.test(p.url()) && (await p.getByRole("heading", { level: 1 }).textContent()) === focusedLabel, `${focusedLabel} → ${p.url()}`);
  await p.getByRole("navigation", { name: "Path" }).getByRole("link", { name: "Immigration programs" }).click(); await idle(); await listReady();
  await p.waitForFunction((l) => document.querySelector('[role="row"][aria-selected="true"]')?.getAttribute("data-label") === l && document.activeElement?.getAttribute("data-label") === l, focusedLabel, { timeout: 5000 }).catch(() => {}); // the check below decides
  const back = await p.evaluate(() => ({ url: location.search, sel: document.querySelector('[role="row"][aria-selected="true"]')?.getAttribute("data-label"), y: Math.round(window.scrollY), focus: document.activeElement?.getAttribute("data-label") }));
  step("P-50: Back keeps the view (All), highlights the opened row and restores the scroll", back.url.includes("f=all") && back.sel === focusedLabel && Math.abs(back.y - scrollBefore) < 40 && back.focus === focusedLabel, JSON.stringify({ ...back, scrollBefore }));
  await state("programs-back-row-highlighted", { viewport: true });
  // Review should 5: the browser's own Back button does the same.
  await row("Super visa").click(); await onCombination("Super visa"); // a row already set up (opening a not-started one would start it)
  await p.goBack(); await listReady();
  await p.waitForFunction(() => { const s = document.querySelector('[role="row"][aria-selected="true"]'); return !!s && document.activeElement === s; }, null, { timeout: 5000 }).catch(() => {}); // the check below decides
  const backBtn = await p.evaluate(() => ({ sel: document.querySelector('[role="row"][aria-selected="true"]')?.getAttribute("data-label"), focus: document.activeElement?.getAttribute("data-label"), url: location.search }));
  step("review should 5: the browser's Back button returns to the list with the opened row highlighted and focused", backBtn.sel === "Super visa" && backBtn.focus === "Super visa" && backBtn.url.includes("f=all"), JSON.stringify(backBtn));

  // ======================================================== the combination page (row target)
  await p.goto(`${BASE}/?f=all`); await idle(); await listReady();
  // Card v4 (P-180): the row's one button is Resume setup; the step itself lives on the combination's page.
  const vvRowStep = (await row("Visitor visa").locator("[data-step-cell]").innerText()).trim();
  await row("Visitor visa").click(); await onCombination("Visitor visa");
  const crumbs = await p.getByRole("navigation", { name: "Path" }).getByRole("link").allTextContents();
  step("P-50: the page header carries the full path, every level a link (Immigration programs › Temporary residence › Visitors › Visitor visa)", crumbs.join(" › ") === "Immigration programs › Temporary residence › Visitors › Visitor visa", crumbs.join(" › "));
  // Lead check item 1: one next step on the page. X1 slice C3: the setup strip replaced the missing list; the header's step
  // and the strip's Forms row name the same one form found.
  await p.locator('[data-step-row="forms"] [data-open-item="forms:sources"]').waitFor();
  const vvHeadStep = (await p.locator("main [data-next-step]").first().textContent()).trim();
  const vvForms = (await p.locator('[data-step-row="forms"]').innerText()).replace(/\s+/g, " ");
  // QA-119: the header's step is the checklist's next item, the strip's ● Next row (Official pages first on Visitor visa).
  const vvNextRow = (await p.locator('[data-step-row][data-mark="next"]').first().innerText()).replace(/\s+/g, " ");
  step("item 1 P-180 (X1 C3, QA-119): Visitor visa — the row says Resume setup; the header's step is the strip's ● Next item; the Forms row names the one form found; no missing list", vvRowStep === "Resume setup" && vvHeadStep === "Confirm the checklist page" && vvNextRow.includes(vvHeadStep) && /Add 1 form found/.test(vvForms) && await p.getByRole("region", { name: /Missing before firms can use it/ }).count() === 0, `${vvRowStep} | ${vvHeadStep} | ${vvNextRow} | ${vvForms}`);
  // Lead check items 3 and 5: no warnings on a combination with no setup; the Questions tile says what it counts.
  const vvTiles = await p.locator("main").textContent();
  step("item 3: a combination with no setup shows no warnings (\"no rule or check problems\", UX-A1 review m2)", !/\d+ warnings?/.test(vvTiles) && /no rule or check problems/.test(vvTiles));
  step("item 5 (UX-A part 1): the Questions tile names what its number counts", /across all people/.test(vvTiles));
  const body = await p.locator("main").textContent();
  step("item 7: no technical key on the main path", !/individual\.visitors|vv\.single/.test(body));
  step("item 7: no floating \"AI for this combination\" button (one AI place: the next step)", await p.getByRole("button", { name: /AI for this combination/ }).count() === 0);
  const facts = await p.locator("h1 + *, h1").first().locator("xpath=../following-sibling::p[1]").textContent().catch(() => "");
  step("item 7: the facts sit in one muted line under the title", /Not released yet|In Release \d|Released/.test(facts) && !/Released v\d/.test(facts) && /people:/.test(facts) && !/\b[a-z]+\.[a-z_]+\.[a-z_]+\b/.test(facts), facts);
  // S5 (P-118 Q2, Q5): Overview only reports; forms are picked on the Forms tab and uploaded in the Form library.
  step("item 1 → S5: no \"+ Add form\" on the Overview (it only reports)", await p.getByRole("button", { name: "Add form" }).count() === 0);
  const vvId = p.url().split("/c/")[1].split("/")[0];
  const vvList = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === "individual.visitors.visitor_visa").nextAction;
  const vvPage = (await p.locator("[data-next-step]").first().textContent())?.trim();
  // QA-119 (replaces review #1's "the row's nextAction"): the page's one next step is the setup checklist's next item,
  // the same one the Programs card's Resume setup lands on; never the catalogue's older step when they differ.
  const vvChecklist = (await (await p.request.fetch(`${BASE}/api/combinations/${vvId}/summary`, { headers: { "x-actor": "user-A" } })).json()).setup.next;
  step("QA-119: the page's next step is the setup checklist's next item (its words and kind), not the catalogue's older step", vvChecklist && vvPage === vvChecklist.item.text && (await p.locator("[data-next-step]").first().getAttribute("data-next-step")) === vvChecklist.item.kind && vvPage !== vvList?.label, `${vvChecklist?.item.text} / ${vvPage} / old ${vvList?.label}`);
  step("review #1: a form already mapped in the library is not called unmapped", !/IMM 5707[^\n]*not mapped yet/.test(await p.locator("main").textContent()));
  await state("combination-page-overview");

  // The one intake (S5: in the Form library, P-118 Q2): one new approved form, one approved older edition (held), one
  // identical file — in one go. The combination's Forms tab only picks from the library ("Add a form from the library").
  await p.goto(`${BASE}/c/${vvId}/forms`); await idle();
  step("S5: the Forms tab offers \"Add a form from the library\" (picks only; no upload on the combination)", await p.getByRole("button", { name: "Add a form from the library" }).count() === 1 && await p.locator('main input[type="file"]').count() === 0);
  // S4 (merged, Lead fix 4): the Form library has one way in, Upload PDF, and each file runs on its own card (runtime
  // FIX L12: this check still used the older intake box, "Choose files to upload" with an "Upload results" list).
  await p.goto(`${BASE}/library/forms`); await p.getByRole("button", { name: "Upload PDF" }).waitFor(); await idle();
  const panel = p.locator("main");
  await panel.getByLabel("Choose PDFs to upload").setInputFiles([path.join(OFFICIAL, "forms", "imm1344e.pdf"), path.join(OFFICIAL, "previous-editions", "imm5257e-pre-2023.pdf"), path.join(OFFICIAL, "forms", "imm5707e.pdf")]);
  await panel.locator("section[data-run-status]").nth(2).waitFor({ timeout: 30000 });
  for (let i = 0; i < 120 && await panel.locator('section[data-run-status="running"], section[data-run-status="queued"]').count(); i++) await p.waitForTimeout(500);
  await idle();
  const res = await panel.locator("section[data-run-status]").allTextContents();
  const card = (f) => res.find((x) => x.includes(f)) ?? "";
  step("item 9 / #5: one way in, many files, one card per file (added · older edition not used · already in the library)", res.length === 3 && /Added to the library/.test(card("imm1344e.pdf")) && /Older edition: not used/.test(card("imm5257e-pre-2023.pdf")) && /Already in the library/.test(card("imm5707e.pdf")), res.map((x) => x.slice(-90)).join(" | "));
  step("item 9: what the file says is shown (code, edition and title, read by rules)", /Rules read it: IMM 1344 \(09-2024\) · Application to sponsor/.test(card("imm1344e.pdf")));
  await state("add-form-panel-intake-results", { viewport: true });
  const lib = (await api("/library/forms")).body;
  step("item 8: the held edition is not in the library and not attached here (never silently)", !lib.find((f) => f.code === "IMM 5257").editions.some((e) => e.label === "IMM 5257 (06-2019)") && !(await api(`/combinations/${vvId}/attachments`)).body.some((a) => /06-2019/.test(a.edition ?? "")));
  const held = (await api("/intake/held")).body;
  step("held for a person: the older edition waits for a person (To review and the Form library; S5: no longer on the combination)", held.some((h) => /IMM 5257 \(06-2019\)/.test(h.edition ?? "") && /older_edition/.test(h.outcome ?? "")), JSON.stringify(held.map((h) => `${h.edition}:${h.outcome}`)));
  await p.goto(`${BASE}/c/${vvId}`); await onCombination("Visitor visa");
  step("review #3: no technical words on the page (screen numbers, error names, hashes, user ids, \"inventory\")", !/Screen 0\d|Error\b|inventory|user-[A-Z]\b|\b[0-9a-f]{10}\b/.test(await p.locator("main").textContent()));
  await state("combination-page-held-new-edition");

  // The path is clickable back to the filtered list.
  await p.getByRole("navigation", { name: "Path" }).getByRole("link", { name: "Visitors" }).click(); await idle();
  step("P-50: a level in the path opens the list filtered to it, with the combination highlighted", p.url().includes("prog=individual.visitors") && (await grid().locator('[role="row"][aria-selected="true"]').getAttribute("data-label")) === "Visitor visa" && (await grid().locator('[role="row"][data-node]').evaluateAll((rs) => rs.every((x) => x.getAttribute("data-node").startsWith("individual.visitors")))));
  step("#5: an older edition never shows as a new edition on the row", !/New edition waiting: IMM 5257 \(06-2019\)|See new edition/.test(await row("Visitor visa").textContent()));
  await state("programs-filtered-from-path");

  // A readable but unapproved form must be held before it can trigger the new-edition workflow.
  const fd = await p.request.fetch(`${BASE}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, multipart: { files: { name: "imm5476-next.pdf", mimeType: "application/pdf", buffer: pdf("IMM 5476 E: Use of a representative (test edition)", "IMM 5476 (01-2027) E") } } });
  const fdBody = await fd.json();
  step("source-trust: a readable, unapproved IMM 5476 checksum is held before edition impact review", fd.status() === 201 && fdBody.results?.[0]?.outcome === "held" && /source verification/.test(fdBody.results[0].message), fdBody.results?.[0]);
  await p.goto(`${BASE}/?f=all`); await idle();
  const lmia = row("With an LMIA");
  step("source-trust: the held unapproved edition does not change a Live row or expose edition-impact review", await lmia.count() === 1 && (await lmia.textContent()).includes("Live") && await lmia.getByRole("button", { name: "See new edition" }).count() === 0, await lmia.textContent());
  await state("programs-live-row-unverified-source-held");
  // F1: the Live filter is every row showing Live, with or without a next step.
  for (const pw of ["", "pw=CORPORATE&"]) {
    await p.goto(`${BASE}/?${pw}f=all`); await idle();
    const chips = await grid().locator('[role="row"][data-state="LIVE"]').count();
    const liveBtn = ((await p.locator('[data-status-chip="live"] span').textContent()) ?? "").trim();
    await p.locator('[data-status-chip="live"]').click(); await idle();
    await p.waitForFunction(() => new URL(location.href).searchParams.get("f") === "live" && [...document.querySelectorAll('[role="row"][data-node]')].every((r) => r.dataset.state === "LIVE"), null, { timeout: 5000 }).catch(() => {}); // the view has switched
    const shown = await grid().locator('[role="row"][data-node]').count().catch(() => 0);
    step(`F1: ${pw ? "Corporate" : "Retail"}: the Live count equals the rows showing Live, and the Live view lists them`, Number(liveBtn) === chips && (chips === 0 || shown === chips), `${liveBtn} · chips ${chips} · shown ${shown}`);
  }
  await p.goto(`${BASE}/?f=all`); await idle();
  await row("With an LMIA").click(); await p.waitForURL(/\/c\//); await idle();
  await p.getByText(/In Release \d/).first().waitFor(); // the header facts arrive with the page summary
  step("review #3: released version and approver role appear without a technical fingerprint", /Release 1/.test(await p.locator("main").textContent()) && !/user-B|\bv1\b|[0-9a-f]{12,}/.test(await p.locator("main").textContent()));
  step("source-trust: unverified upload remains outside the combination's release workflow", (await api("/draft")).body.rows.every((r) => r.label !== "With an LMIA"));
  // Lead check item 6: the sample note names every form and checklist the page lists.
  const lmiaMain = await p.locator("main").textContent();
  // S5: the form lines are on the Forms tab (the Overview only reports).
  const lmiaUrl = p.url(); await p.goto(lmiaUrl.replace(/\/c\/([^/?]+).*$/, "/c/$1/forms")); await p.locator("[data-line]").first().waitFor();
  const lmiaCodes = (await p.locator("[data-line] td:first-child .mono").allTextContents()).map((c) => c.trim());
  await p.goto(lmiaUrl); await p.getByText(/In Release \d/).first().waitFor(); await idle();
  // C11.11 (QA-101): the page shows the six forms it files; the note still names its two checklists, as checklists (sources).
  step("item 6: the With an LMIA sample note lists the six forms the page shows, and names its two checklists as checklists", lmiaCodes.length === 6 && /checklists IMM 5488 and [^)]*IMM 5905/.test(lmiaMain) && !lmiaCodes.includes("IMM 5488") && !lmiaCodes.includes("IMM 5905") && lmiaCodes.every((c) => lmiaMain.includes(`Sample: starts from`) && new RegExp(`\\(forms [^)]*${c.replace(/ /g, "\\s")}`).test(lmiaMain)), lmiaCodes.join(", "));
  // Lead check item 3: a Live row's warnings are its own and lead to where each one is listed.
  const warnLink = p.getByRole("link", { name: /\d+ warnings?: see them/ });
  const warnCount = await warnLink.count() ? Number((await warnLink.textContent()).match(/\d+/)[0]) : 0;
  const ownWarnings = (await api(p.url().replace(/^.*\/c\/([^/?]+).*$/, "/combinations/$1"))).body.draft.problems.filter((x) => x.level === "warning").length;
  step("item 3: the warnings on a Live row are this combination's own and link to Review and release", warnCount === ownWarnings && (warnCount === 0 || (await warnLink.getAttribute("href")).endsWith("/review")), `${warnCount} shown, ${ownWarnings} own`);
  await state("combination-page-live-unverified-source-held");

  // The combination page at its old "missing" address (card v4, P-180; X1 slice C3: the setup strip replaced the list):
  // it lands on the strip, five steps, each with what is open.
  const ssId = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.label === "Visitor visa").combinationId;
  await p.goto(`${BASE}/c/${ssId}?show=missing`); await idle();
  await p.locator("[data-setup-strip]").waitFor(); // the strip arrives with the page summary
  const stepRows = await p.locator("[data-step-row]").allInnerTexts();
  step("?show=missing opens the combination page on the setup strip, five steps", stepRows.length === 5 && await p.evaluate(() => !!document.activeElement?.hasAttribute("data-setup-strip")), stepRows.map((x) => x.replace(/\s+/g, " ")).join(" | "));
  step("F2 (X1 C3): one line per step, never a line per person role", !stepRows.some((x) => /has no questions|No questions yet for/.test(x)));
  await state("combination-page-show-missing");

  // A not-started row opens no page and creates nothing (S2 fix 3; S3: no New combination page, P-125): it says Start setup
  // begins it; a non-author is told who starts it.
  await p.goto(`${BASE}/?f=all`); await idle();
  const notStarted0 = (await cat("pathway=INDIVIDUAL&filter=all")).counts.not_started;
  await row("Grant of citizenship").click(); await idle();
  step("S2 fix 3 / S3: a not-started row opens no page, says Start setup begins it, and starts nothing by itself", new URL(p.url()).pathname === "/" && /Grant of citizenship is not started yet\. Start setup on it begins its setup\./.test(await p.locator('[aria-live="polite"]').textContent()) && (await cat("pathway=INDIVIDUAL&filter=all")).counts.not_started === notStarted0);
  await state("combination-page-not-started");
  await p.goto(`${BASE}/?f=all`); await idle();
  await as("user-B");
  // Card v4 (P-180): anyone without the author duty gets Open, never Start setup; opening a not-started row says who starts it.
  const muted = await row("Extend stay in Canada").locator("[data-step-cell]").innerText();
  await row("Extend stay in Canada").click(); await idle();
  step("non-author P-180: a not-started row offers Open, never Start setup, and says who starts it", muted.trim() === "Open" && await row("Extend stay in Canada").locator("[data-start-setup]").count() === 0 && /A configuration author starts it/.test(await p.locator('[aria-live="polite"]').textContent()) && !p.url().includes("/c/"), muted);
  await state("programs-non-author", { viewport: true });
  await p.goto(`${BASE}/?f=all`); await idle();
  await row("Visitor visa").click(); await p.waitForURL(/\/c\//); await idle();
  step("review #6: the approver sees People read-only (no Edit), and author steps are not offered", await p.getByRole("button", { name: "Edit" }).count() === 0 && await p.getByRole("button", { name: "Add form" }).count() === 0);
  await as("user-A");

  // Draft bar (item 6) after a change.
  const st = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === "individual.study_permits.study_permit");
  for (const code of st.nextAction?.forms ?? []) await api(`/combinations/${st.combinationId}/lines`, { method: "POST", data: { kind: "FORM", formKey: code } });
  await p.goto(BASE); await idle();
  const bar = await p.getByRole("status").filter({ hasText: /changes across/ }).first().textContent();
  step("item 6: the global draft bar shows total changes and affected combination count, with one release-review link", /^Draft · \d+ changes? across \d+ combinations?/.test(bar) && /Review and release \(\d+\)/.test(bar), bar);
  await state("programs-draft-bar", { viewport: true });

  // S3 (P-125 (5)): the New combination page is gone; its address is the app's "Page not found". Its name rules are checked
  // on Program structure's endpoints (check_screen01_api) and in the Add pop-up (check_w1_structure_browser).
  await p.goto(`${BASE}/new`); await idle();
  step("S3 M2: the New combination page is gone (Page not found, with the way back)", await p.getByText("Page not found").count() === 1 && await p.getByRole("link", { name: "Back to Immigration programs" }).count() === 1);

  // The With an LMIA combination the steps below open (found on the New combination page before S3).
  const wpId = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === "individual.work_permits.employer_specific.with_lmia").combinationId;

  // QA-1 on the shared Release page: a changed combination nobody submitted is held back with the reason.
  await p.goto(`${BASE}/release`); await idle();
  const relRow = p.getByRole("row", { name: /Study permit/ }).first();
  const relText = (await relRow.textContent()) ?? "";
  step("QA-1: the shared Release page holds back a combination nobody submitted, saying why", /Held back: Not submitted for review/.test(relText), relText);
  await as("user-B"); await idle();
  step("QA-1: with nothing reviewed, the approver has nothing to release (button off)", await p.getByRole("button", { name: "Nothing ready to release" }).isDisabled());
  await state("release-page-held-not-submitted");
  await as("user-A");
  await sourceEveryNumber(BASE, st.combinationId); // G1 (C5.4): the release's numbers need a source first
  await api(`/combinations/${st.combinationId}/submit`, { method: "POST", data: {} });
  const stSme = ((await api(`/combinations/${st.combinationId}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (stSme.length) await api(`/combinations/${st.combinationId}/signoff`, { method: "POST", actor: "user-C", data: { items: stSme, action: "signed" } });
  await p.goto(`${BASE}/c/${st.combinationId}/review`); await idle();
  const stepText = await p.locator("main").textContent();
  step("QA-10: the review tab names who submitted (\"Submitted by Configuration author\"), never an internal id", /Submitted by Configuration author/.test(stepText) && !/user-[A-Z]\b/.test(stepText), (stepText.match(/Submitted by [^0-9]{0,30}/) ?? [""])[0]);
  await state("combination-review-submitted-by-name");
  await p.goto(`${BASE}/release`); await idle();
  step("QA-1: once submitted and signed, the Release page will release it", /Will be released/.test((await p.getByRole("row", { name: /Study permit/ }).first().textContent()) ?? ""));
  // QA-9 scale finding: below 640 px (a phone, or 200 % zoom) the next step moves under the name; the name keeps its width.
  for (const w of [390, 512]) {
    await p.setViewportSize({ width: w, height: 844 }); await p.goto(`${BASE}/?f=all`); await grid().waitFor(); await idle();
    const narrow = await p.evaluate(() => { const c = document.querySelector('[role="row"][data-node] [role="gridcell"]'); const steps = [...document.querySelectorAll('[role="row"][data-node] [data-step-cell]')]; return { nameW: Math.round(c.getBoundingClientRect().width), over: document.documentElement.scrollWidth - innerWidth, clipped: steps.filter((x) => x.scrollWidth > x.clientWidth + 1).length }; });
    step(`narrow ${w} px: the combination's name keeps its width (≥ 200 px), next steps are not clipped, no sideways scroll`, narrow.nameW >= 200 && narrow.over <= 0 && narrow.clipped === 0, JSON.stringify(narrow));
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  // ======================================================== P-74: forms decisions visible (C1.6; P-107 Online stays a choice, W1-02)
  await p.goto(`${BASE}/?f=all`); await idle();
  // Card v4 (P-180): the row carries five things only, so "Filed:" moved off it; the Forms tab says how it is filed (next).
  step("C1.6 P-180: the row no longer says how the combination is filed (the Forms tab does)", !/Filed:/.test(await row("With an LMIA").textContent()), await row("With an LMIA").textContent());
  await p.goto(`${BASE}/c/${wpId}/forms`); await idle();
  const forms = p.getByRole("tabpanel"); // S5: the channels moved from the Overview to the Forms tab
  step("C1.6: the combination page shows the filing method and each line's channel", /Filing: PDF only/.test(await forms.textContent()) && await forms.getByRole("combobox", { name: /^How IMM \d+.* is filed$/ }).count() >= 6);
  await forms.getByRole("combobox", { name: "How IMM 1295 is filed" }).selectOption("PAPER"); await idle(); // P-143: four channels; the signature is its own value
  await p.waitForFunction(() => /Signed in pen/.test(document.querySelector('[role="tabpanel"]')?.textContent ?? ""), null, { timeout: 5000 }).catch(() => {});
  step("C1.6: the author sets a line's channel; the line's signature follows and the filing method stays in C1.6's short words", /Filing: Mixed: PDF and paper/.test(await p.locator("[data-filing]").textContent()) && /^Paper only; plus PDF upload when needed/.test((await p.locator("[data-filing] b[title]").getAttribute("title")) ?? "") /* C11.11: the checklists are no longer always-filed PDFs */ /* the line also holds the IRCC account picker's titled select (slice 1, review M2) */ && /Signed in pen/.test(await forms.textContent()));
  await forms.getByRole("combobox", { name: "How IMM 1295 is filed" }).selectOption("PDF_UPLOAD"); await idle();
  // P-107, W1-02 (P-102): Online stays selectable and says it needs the browser extension (later wave); no portal choice,
  // no "Add an online form", no drafting-source choice (parked with the extension).
  await forms.getByRole("combobox", { name: "How IMM 1295 is filed" }).selectOption("ONLINE"); await idle();
  await p.waitForFunction(() => /is filed Online: it needs the browser extension/.test(document.querySelector('[role="tabpanel"]')?.textContent ?? ""), null, { timeout: 8000 }).catch(() => {}); // the option itself says "(later wave)": wait for the page's own words
  step("C1.6 P-107: the author files a line Online; the line says it needs the browser extension (later wave) and the filing method is Mixed", /Needs the browser extension \(later wave\)/.test(await forms.textContent()) && /Filing: Mixed: online and PDF/.test(await p.locator("[data-filing]").textContent()) && /Warning/.test(await forms.textContent()));
  await state("combination-online-later-wave");
  await forms.getByRole("combobox", { name: "How IMM 1295 is filed" }).selectOption("PDF_UPLOAD"); await idle();
  step("C1.6 P-102: no portal choice and no \"Add an online form\" on the combination page", await forms.getByRole("combobox", { name: "Portal" }).count() === 0 && await forms.getByRole("button", { name: "Add an online form" }).count() === 0);
  await as("user-B");
  // The tab redraws for the new person a moment after the switch (the session is read again): wait for it, under load too.
  // No select is also true while the tab is blank mid-redraw: wait for its forms table to be back (a "Filed as" cell).
  await p.waitForFunction(() => { const t = document.querySelector('[role="tabpanel"]'); return !!t && !t.querySelector('select, [role="combobox"]') && t.querySelector("table") && /PDF upload/.test(t.textContent ?? ""); }, null, { timeout: 8000 }).catch(() => {});
  step("C1.6: someone without the author duty sees the channels but cannot change them", await forms.getByRole("combobox").count() === 0 && /PDF upload/.test(await forms.textContent()) && await forms.getByRole("button", { name: "Add form" }).count() === 0, JSON.stringify({ boxes: await forms.getByRole("combobox").evaluateAll((xs) => xs.map((x) => x.getAttribute("aria-label"))), pdf: /PDF upload/.test(await forms.textContent()), add: await forms.getByRole("button", { name: "Add form" }).count(), text: (await forms.textContent()).replace(/\s+/g, " ").slice(0, 400) }));
  await as("user-A");
  await p.goto(`${BASE}/c/${wpId}/sources`); await idle();
  step("C1.6 P-102: the sources tab no longer offers what drafting reads online", await p.locator("[data-drafting-sources]").count() === 0);
  await p.goto(`${BASE}/extension`); await idle();
  step("C1.6 P-102: the Browser extension page and its menu entry are gone", /Page not found/.test(await p.locator("main").textContent()) && await p.getByRole("link", { name: "Browser extension" }).count() === 0);


  // QA-17: "Recent steps" say the day when a step did not run today.
  const sql17 = (q) => require("node:child_process").execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${process.argv[3] ?? "xr_studio_s01ui"}`, "-Atc", q], { encoding: "utf8" }).trim();
  const wpJob = sql17(`select id from drafting_job where combination_id='${wpId}' order by started_at limit 1`);
  if (wpJob) sql17(`update drafting_job set started_at = timestamptz '2026-10-21 17:23:20+00' where id='${wpJob}'`);
  await p.goto(`${BASE}/c/${wpId}/forms`); await idle(); // S5 (P-118 Q5): the steps moved from the Overview to each form's row in Forms › Reading and matching
  const steps = await p.locator("main").textContent();
  step("QA-17: a step run on another day shows its date (\"Oct 21, …\"); one run today says \"today\"", !!wpJob && /Oct 21, \d/.test(steps) && /today at \d/.test(steps), (steps.match(/(Oct 21, [^R]{0,12}|today [^R]{0,10})/g) ?? []).slice(0, 3).join(" | "));

  // P-63: no "box" on the pages a person reads (form field, field map).
  const boxPages = [];
  for (const u of ["/?f=all", `/c/${wpId}`, `/c/${wpId}/configuration`, `/c/${wpId}/sources`, "/library/forms", "/library/fields", "/release"]) {
    await p.goto(`${BASE}${u}`); await idle();
    if (/\bbox(es)?\b|box map/i.test(await p.locator("main").innerText())) boxPages.push(u);
  }
  step("P-63: no page says \"box\" or \"box map\" (form field, field map)", boxPages.length === 0, boxPages.join(", ") || "none");

  step("no console or page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  fs.writeFileSync(path.join(EVID, "browser-checks.json"), JSON.stringify({ at: new Date().toISOString(), timings, pass: log.filter((x) => x.ok).length, fail: log.filter((x) => !x.ok).length, log, axe: axeLog }, null, 1));
  console.log(`\n${log.filter((x) => x.ok).length} passed, ${log.filter((x) => !x.ok).length} failed · ${JSON.stringify(timings)}`);
  await b.close();
  process.exit(log.some((x) => !x.ok) ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`STOPPED after "${lastStep}": ${String(e?.message ?? e).split("\n")[0].slice(0, 160)}`); process.exit(2); });
