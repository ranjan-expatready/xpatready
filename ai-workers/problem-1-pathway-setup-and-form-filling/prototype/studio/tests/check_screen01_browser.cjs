// Screen 01 (Programs, Layout v2 after the early look: P-49, P-50, P-51) in a real browser, on an isolated copy started
// fresh: sample inputs loaded, one replay of a saved real AI run on Super visa (no model call, US$0). Every state at 1440
// and 1024 px into product/screens/01-programs-catalogue/screenshots/, axe-core (WCAG 2.2 AA rules) on each state, the
// keyboard path (pathway → view → list → Enter opens the combination → Back), first-view and filter timings, and the
// journeys: Needs work / Live / All, status sort, row opens the combination page, clickable path, Back keeps the place
// and highlights the row, "+ Add form" through the one intake with an approved older edition held, not-started row, non-author.
//   zsh studio/tools/isolated.sh s01ui 4404 start && node studio/tests/check_screen01_browser.cjs 4404
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
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
const step = (name, ok, detail) => { log.push({ name, ok: !!ok, detail: detail === undefined ? undefined : String(detail).slice(0, 400) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 200)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: init.timeout ?? 30000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const idle = async () => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(120); };
  const grid = () => p.getByRole("grid", { name: "Combinations" });
  const row = (label) => grid().locator(`[role="row"][data-label="${label.replace(/"/g, '\\"')}"]`).first();
  const as = async (id) => { await p.getByLabel("Simulated person").selectOption(id); await idle(); };
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
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  // A release needs its review first (QA-1): the author submits, the content reviewer signs any expert change.
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
  step("performance: first view under 1 s with the sample data (app files cached)", timings.first_view_ms < 1000, `${timings.first_view_ms} ms (cold browser ${timings.cold_first_view_ms} ms)`);
  await idle();
  const pressed = async () => (await p.getByRole("group", { name: "Show combinations" }).locator('[aria-pressed="true"]').textContent()) ?? "";
  step("P-49: Needs work is the default view, with its count", /^Needs work · \d+$/.test(await pressed()), await pressed());
  const labels = await p.getByRole("group", { name: "Show combinations" }).getByRole("button").allTextContents();
  step("P-49: the three views are Needs work · Live · All, each with a count", labels.length === 3 && /^Needs work/.test(labels[0]) && /^Live · \d/.test(labels[1]) && /^All · \d/.test(labels[2]), labels.join(" | "));
  const heads = await grid().getByRole("columnheader").allTextContents();
  const upper = await grid().getByRole("columnheader").first().evaluate((e) => getComputedStyle(e.parentElement).textTransform);
  step("item 4: sentence-case column headers (Combination · Status · Next step), no capitals styling", heads.map((h) => h.trim()).join("|") === "Combination|Status|Next step" && upper === "none", `${heads.join("|")} / ${upper}`);
  step("P-49: \"Ready\" never appears; statuses say In setup, Not ready or Live", !(await grid().textContent()).includes("Ready"));
  step("P-50: no side panel or sheet on Programs", await p.getByRole("complementary").count() === 0 && await p.getByRole("dialog").count() === 0);
  const svRow = row("Super visa");
  step("AI proposals waiting: the row's next step is Review N AI proposals", /^Review \d+ AI proposals?$/.test((await svRow.getByRole("button").textContent()) ?? ""), await svRow.getByRole("button").textContent());
  // item 3: two lines, nothing cut in the middle
  const lines = await row("Permanent residence application").locator('[role="gridcell"]').first().evaluate((c) => [...c.children].map((e) => ({ t: e.textContent, cut: e.scrollWidth > e.clientWidth + 1, ell: getComputedStyle(e).textOverflow })));
  step("item 3: path on two lines — muted Program › Category above, the combination's name below; nothing truncated", lines[0].t === "Economic immigration › Express Entry" && lines[1].t === "Permanent residence application" && lines.every((l) => !l.cut && l.ell !== "ellipsis"), JSON.stringify(lines.slice(0, 2)));
  await state("programs-needs-work-default");
  step("F3: AI steps carry the AI mark (Sparkles, labelled) in the Next step column", await svRow.getByRole("button").locator('[aria-label="AI step:"]').count() === 1 && await grid().locator('[data-next-step="add_from_library"] [aria-label="AI step:"]').count() === 0);
  // Keyboard path (as a person): focus the row, then Tab to its next step (the chip comes first).
  await svRow.focus(); for (let i = 0; i < 4 && !(await p.evaluate(() => document.activeElement?.hasAttribute("data-next-step"))); i++) await p.keyboard.press("Tab");
  await p.waitForTimeout(400);
  step("F3: the AI step's tooltip says what AI did and that nothing changes until a person accepts", /AI proposed these\. A person accepts/.test((await p.getByRole("tooltip").first().textContent().catch(() => "")) ?? ""));
  const libBtn = grid().locator('[data-next-step="add_from_library"]').first();
  await libBtn.focus(); await p.waitForTimeout(400);
  const libTip = (await p.getByRole("tooltip").first().textContent().catch(() => "")) ?? "";
  step("F3: \"Add N forms from the library\" has a tooltip naming the forms: reuses field maps, no AI, draft only", /IMM \d{4}.*reuses field maps already in the library\. No AI\. Adds to the draft only; nothing changes for firms until release\./.test(libTip), libTip);
  await grid().locator('[role="row"][tabindex="0"]').first().focus();
  await p.keyboard.press("Tab"); await p.waitForTimeout(300);
  step("review #7: Tab from the active row reaches its status chip, which explains itself", (await p.evaluate(() => document.activeElement?.getAttribute("data-status"))) !== null && /firms can|released|setup|startable/i.test((await p.getByRole("tooltip").first().textContent().catch(() => "")) ?? ""));
  step("item 5: Super visa is one row, Visitors › Super visa (no Parent / Grandparent)", await row("Parent").count() === 0 && await row("Grandparent").count() === 0 && (await svRow.textContent()).startsWith("VisitorsSuper visa"), await svRow.textContent());
  await p.mouse.move(0, 0); await p.keyboard.press("Escape"); await p.evaluate(() => document.activeElement?.blur()); await idle();

  // Measured inside the page: from the click to the list showing the new view (request + render), no test-driver overhead.
  timings.filter_ms = await p.evaluate(async () => {
    const btn = [...document.querySelectorAll('[aria-label="Show combinations"] button')].find((x) => x.textContent.startsWith("Live"));
    const done = () => btn.getAttribute("aria-pressed") === "true" && document.querySelectorAll('[role="row"][data-node]').length === 1;
    const t = performance.now(); btn.click();
    await new Promise((res) => { const o = new MutationObserver(() => { if (done()) { o.disconnect(); res(); } }); o.observe(document.body, { subtree: true, childList: true, attributes: true }); });
    return Math.round(performance.now() - t);
  });
  step("performance: changing the view answers under 200 ms", timings.filter_ms < 200, `${timings.filter_ms} ms`);
  await idle();
  const liveRows = await grid().locator('[role="row"][data-node]').count();
  step("F1: Live shows every row whose status is Live", liveRows === 1 && (await row("With an LMIA").textContent()).includes("Live"), liveRows);
  await state("programs-live");

  await p.getByRole("button", { name: /^All · / }).click(); await idle();
  await p.getByRole("button", { name: /^Status/ }).click(); await idle();
  const sortState = await grid().getByRole("columnheader", { name: /Status/ }).getAttribute("aria-sort");
  const firstStatus = await grid().locator('[role="row"][data-node]').first().locator("[data-status]").getAttribute("data-status");
  step("P-49: the Status column is sortable (Not ready / In setup first, then Live) and says so to screen readers", sortState === "ascending" && firstStatus !== "READY" && p.url().includes("sort=status"), `${sortState} ${firstStatus}`);
  await p.getByRole("button", { name: /^Status/ }).click(); await idle();
  step("P-49: sorting again puts Live first (descending)", (await grid().locator('[role="row"][data-node]').first().locator("[data-status]").getAttribute("data-status")) === "READY" && (await grid().getByRole("columnheader", { name: /Status/ }).getAttribute("aria-sort")) === "descending");
  await state("programs-all-sorted-by-status");
  await p.getByRole("button", { name: /^Status/ }).click(); await idle();

  await p.getByRole("button", { name: /^Program:/ }).click(); await p.getByRole("menuitemradio", { name: /Work permits/ }).click(); await idle();
  step("Program filter: only Work permits rows, in path order", (await grid().locator('[role="row"][data-node]').evaluateAll((rs) => rs.every((x) => x.getAttribute("data-node").startsWith("individual.work_permits")))) && p.url().includes("prog="));
  await state("programs-program-filter-work-permits");
  await p.getByRole("button", { name: /^Program:/ }).click(); await p.getByRole("menuitemradio", { name: /All programs/ }).click(); await idle();

  await p.keyboard.press("Meta+k"); await p.keyboard.type("imm 5409"); await p.waitForTimeout(400); await idle();
  await grid().getByText("Matches: IMM 5409").first().waitFor({ timeout: 5000 }).catch(() => {}); // a busy machine answers late; the check below still decides
  step("⌘K search finds a form code and says what matched", (await grid().textContent()).includes("Matches: IMM 5409"));
  await state("programs-search-form-code");
  await p.getByRole("button", { name: "Clear search" }).click(); await idle();
  await p.getByLabel("Search combinations, form codes and documents").fill("zzzz"); await p.waitForTimeout(400); await idle();
  step("nothing matches: an empty state with a way back", await p.getByRole("heading", { name: "Nothing matches" }).count() === 1);
  await state("programs-nothing-matches");
  await p.getByRole("button", { name: "Show all" }).click(); await p.waitForTimeout(500); await idle();
  step("regression: \"Show all\" keeps the All view after the search box settles (no stale URL rewrite)", new URL(p.url()).searchParams.get("f") === "all" && !new URL(p.url()).searchParams.get("q"), p.url());

  await p.getByRole("button", { name: /^Corporate and employers/ }).click(); await row("High-wage position").waitFor(); await idle();
  step("item 5: Corporate shows the demo names (LMIA › High-wage position, Low-wage position, Global Talent Stream, In-home caregiver)", await row("High-wage position").count() === 1 && await row("Low-wage position").count() === 1 && await row("Global Talent Stream").count() === 1 && await row("In-home caregiver").count() === 1 && (await row("High-wage position").textContent()).startsWith("LMIA"));
  await state("programs-corporate");
  await p.getByRole("button", { name: /^Individual/ }).click(); await idle();

  // ======================================================== keyboard: list → Enter opens the combination page
  await p.goto(`${BASE}/?f=all`); await idle();
  await grid().locator('[role="row"][tabindex="0"]').focus();
  await p.keyboard.press("End"); await p.keyboard.press("ArrowUp"); await p.waitForTimeout(100); // focus moves on the next frame
  const focusedLabel = await p.evaluate(() => document.activeElement?.getAttribute("data-label"));
  const scrollBefore = await p.evaluate(() => Math.round(window.scrollY));
  await p.keyboard.press("Enter"); await p.waitForURL(/\/c\//); await idle();
  step("keyboard: one tab stop, ↑/↓/Home/End move, Enter opens the combination page (P-50)", /\/c\/[0-9a-f-]+$/.test(p.url()) && (await p.getByRole("heading", { level: 1 }).textContent()) === focusedLabel, `${focusedLabel} → ${p.url()}`);
  await p.getByRole("navigation", { name: "Path" }).getByRole("link", { name: "Programs" }).click(); await idle();
  const back = await p.evaluate(() => ({ url: location.search, sel: document.querySelector('[role="row"][aria-selected="true"]')?.getAttribute("data-label"), y: Math.round(window.scrollY), focus: document.activeElement?.getAttribute("data-label") }));
  step("P-50: Back keeps the view (All), highlights the opened row and restores the scroll", back.url.includes("f=all") && back.sel === focusedLabel && Math.abs(back.y - scrollBefore) < 40 && back.focus === focusedLabel, JSON.stringify({ ...back, scrollBefore }));
  await state("programs-back-row-highlighted", { viewport: true });
  // Review should 5: the browser's own Back button does the same.
  await row("Super visa").click(); await p.waitForURL(/\/c\//); await idle(); // a row already set up (opening a not-started one would start it)
  await p.goBack(); await grid().waitFor(); await idle(); await p.waitForTimeout(200);
  const backBtn = await p.evaluate(() => ({ sel: document.querySelector('[role="row"][aria-selected="true"]')?.getAttribute("data-label"), focus: document.activeElement?.getAttribute("data-label"), url: location.search }));
  step("review should 5: the browser's Back button returns to the list with the opened row highlighted and focused", backBtn.sel === "Super visa" && backBtn.focus === "Super visa" && backBtn.url.includes("f=all"), JSON.stringify(backBtn));

  // ======================================================== the combination page (row target)
  await p.goto(`${BASE}/?f=all`); await idle();
  const vvRowStep = (await row("Visitor visa").locator("[data-next-step]").textContent()).trim();
  await row("Visitor visa").click(); await p.waitForURL(/\/c\//); await idle();
  const crumbs = await p.getByRole("navigation", { name: "Path" }).getByRole("link").allTextContents();
  step("P-50: the page header carries the full path, every level a link (Programs › Individual › Visitors › Visitor visa)", crumbs.join(" › ") === "Programs › Individual › Visitors › Visitor visa", crumbs.join(" › "));
  // Lead check item 1: one next step on the page — the row, the header and the first missing line say the same thing.
  await p.getByRole("region", { name: /Missing before firms can use it/ }).locator("li").first().waitFor();
  const vvHeadStep = (await p.locator("main [data-next-step]").first().textContent()).trim();
  const vvMiss = await p.getByRole("region", { name: /Missing before firms can use it/ }).locator("li").allTextContents();
  step("item 1: Visitor visa — row step = header step = the missing list's one shared step (said once); sources and set-up forms counted apart", vvRowStep === "Add 1 form from the library" && vvHeadStep === vvRowStep && vvMiss[0]?.trim() === "2 forms attached as sources, 0 set up." && (await p.locator("[data-shared-step]").textContent()) === `Next step for all of these: ${vvRowStep}.` && !vvMiss.some((x) => /Next step/.test(x)) && !vvMiss.some((x) => /No forms yet|Add sources/.test(x)), `${vvRowStep} | ${vvHeadStep} | ${vvMiss.join(" | ")}`);
  // Lead check items 3 and 5: no warnings on a combination with no setup; the Questions tile says what it counts.
  const vvTiles = await p.locator("main").textContent();
  step("item 3: a combination with no setup shows no warnings (\"no problems\")", !/\d+ warnings?/.test(vvTiles) && /no problems/.test(vvTiles));
  step("item 5: the Questions tile names what its number counts", /questions across all people \(each person role counted\)/.test(vvTiles));
  const body = await p.locator("main").textContent();
  step("item 7: no technical key on the main path", !/individual\.visitors|vv\.single/.test(body));
  step("item 7: no floating \"AI for this combination\" button (one AI place: the next step)", await p.getByRole("button", { name: /AI for this combination/ }).count() === 0);
  const facts = await p.locator("h1 + *, h1").first().locator("xpath=../following-sibling::p[1]").textContent().catch(() => "");
  step("item 7: the facts sit in one muted line under the title", /Not released yet|In Release \d|Released/.test(facts) && !/Released v\d/.test(facts) && /people:/.test(facts) && !/\b[a-z]+\.[a-z_]+\.[a-z_]+\b/.test(facts), facts);
  step("item 1: \"+ Add form\" lives on the combination page", await p.getByRole("button", { name: "Add form" }).count() === 1);
  const vvList = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === "individual.visitors.visitor_visa").nextAction;
  const vvPage = (await p.locator("[data-next-step]").first().textContent())?.trim();
  step("review #1: the page's next step is the row's (same words, same action)", vvList && vvPage === vvList.label && (await p.locator("[data-next-step]").first().getAttribute("data-next-step")) === vvList.kind, `${vvList?.label} / ${vvPage}`);
  step("review #1: a form already mapped in the library is not called unmapped", !/IMM 5707[^\n]*not mapped yet/.test(await p.locator("main").textContent()) && /already mapped in the library/.test(await p.locator("main").textContent()));
  await state("combination-page-overview");

  // "+ Add form" through the one intake: one new approved form, one approved older edition (held), one identical file — in one go.
  await p.getByRole("button", { name: "Add form" }).click();
  const panel = p.getByRole("dialog", { name: "Add a form" });
  await panel.waitFor();
  step("+ Add form opens a right panel (team pattern), not a centred modal", await panel.evaluate((e) => { const r = e.getBoundingClientRect(); return Math.abs(r.right - window.innerWidth) < 2 && r.height >= window.innerHeight - 2; }));
  await panel.getByLabel("Choose files to upload").setInputFiles([path.join(OFFICIAL, "forms", "imm1344e.pdf"), path.join(OFFICIAL, "previous-editions", "imm5257e-pre-2023.pdf"), path.join(OFFICIAL, "forms", "imm5707e.pdf")]);
  await panel.getByRole("list", { name: "Upload results" }).waitFor(); await idle();
  const res = await panel.getByRole("list", { name: "Upload results" }).getByRole("listitem").allTextContents();
  step("item 9 / #5: one intake, many files, one result per file (added · older edition not used · already in the library)", res.length === 3 && /Added to the library/.test(res[0]) && /Older edition: not used/.test(res[1]) && /Already in the library/.test(res[2]), res.map((x) => x.slice(0, 70)).join(" | "));
  step("item 9: what the file says is shown (code, kind, title, published date)", /IMM 1344 \(09-2024\)/.test(res[0]) && /Form/.test(res[0]) && /published 2026-09-17/.test(res[0]));
  await state("add-form-panel-intake-results", { viewport: true });
  await panel.getByRole("button", { name: "Close" }).first().click(); await idle();
  const lib = (await api("/library/forms")).body;
  step("item 8: the held edition is not in the library and not attached here (never silently)", !lib.find((f) => f.code === "IMM 5257").editions.some((e) => e.label === "IMM 5257 (06-2019)") && !(await api(`/combinations/${p.url().split("/c/")[1]}/attachments`)).body.some((a) => /06-2019/.test(a.edition ?? "")));
  const heldText = await p.getByRole("region", { name: /Held for a person/ }).textContent();
  step("held for a person: the page lists the older edition as not used", heldText.includes("IMM 5257 (06-2019)") && /Older edition: not used/.test(heldText), heldText);
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
    const chips = await grid().locator('[data-status="READY"]').count();
    const liveBtn = (await p.getByRole("button", { name: /^Live · / }).textContent()) ?? "";
    await p.getByRole("button", { name: /^Live · / }).click(); await idle();
    const shown = await grid().locator('[role="row"][data-node]').count().catch(() => 0);
    step(`F1: ${pw ? "Corporate" : "Individual"}: the Live count equals the rows showing Live, and the Live view lists them`, Number(liveBtn.split("· ")[1]) === chips && (chips === 0 || shown === chips), `${liveBtn} · chips ${chips} · shown ${shown}`);
  }
  await p.goto(`${BASE}/?f=all`); await idle();
  await row("With an LMIA").click(); await p.waitForURL(/\/c\//); await idle();
  await p.getByText(/In Release \d/).first().waitFor(); // the header facts arrive with the page summary
  step("review #3: released version and approver role appear without a technical fingerprint", /Release 1/.test(await p.locator("main").textContent()) && !/user-B|\bv1\b|[0-9a-f]{12,}/.test(await p.locator("main").textContent()));
  step("source-trust: unverified upload remains outside the combination's release workflow", (await api("/draft")).body.rows.every((r) => r.label !== "With an LMIA"));
  // Lead check item 6: the sample note names every form and checklist the page lists.
  const lmiaMain = await p.locator("main").textContent();
  const lmiaCodes = (await p.getByRole("region", { name: "Forms" }).locator("tbody tr td:first-child .mono").allTextContents()).map((c) => c.trim());
  step("item 6: the With an LMIA sample note lists the six forms and two checklists the page shows", lmiaCodes.length === 8 && lmiaCodes.every((c) => lmiaMain.includes(`Sample: starts from`) && new RegExp(`\\(forms [^)]*${c.replace(/ /g, "\\s")}`).test(lmiaMain)), lmiaCodes.join(", "));
  // Lead check item 3: a Live row's warnings are its own and lead to where each one is listed.
  const warnLink = p.getByRole("link", { name: /\d+ warnings?: see them/ });
  const warnCount = await warnLink.count() ? Number((await warnLink.textContent()).match(/\d+/)[0]) : 0;
  const ownWarnings = (await api(p.url().replace(/^.*\/c\/([^/?]+).*$/, "/combinations/$1"))).body.draft.problems.filter((x) => x.level === "warning").length;
  step("item 3: the warnings on a Live row are this combination's own and link to Review and release", warnCount === ownWarnings && (warnCount === 0 || (await warnLink.getAttribute("href")).endsWith("/review")), `${warnCount} shown, ${ownWarnings} own`);
  await state("combination-page-live-unverified-source-held");

  // See N missing → the combination page with the missing list.
  await p.goto(`${BASE}/?f=all`); await idle();
  await row("Spouse of a student").getByRole("button", { name: /^See \d+ missing$/ }).click(); await p.waitForURL(/show=missing/); await idle();
  await p.getByRole("region", { name: /Missing before firms can use it|Why firms cannot use it/ }).locator("li").first().waitFor(); // the list arrives with the page summary
  const miss = await p.getByRole("region", { name: /Missing before firms can use it|Why firms cannot use it/ }).locator("li").allTextContents();
  step("See N missing opens the combination page with each missing item", miss.length >= 1, miss.join(" | "));
  const shared = await p.locator("[data-shared-step]").count();
  step("F2: one cause, one line; the next step said once (under the list when shared, else on each line); no line per person role", (shared ? miss.length > 1 && !miss.some((x) => /Next step/.test(x)) : miss.every((x) => /Next step: /.test(x))) && !miss.some((x) => /has no questions/.test(x)) && miss.filter((x) => /No questions yet for/.test(x)).length <= 1, miss.join(" | "));
  await state("combination-page-show-missing");

  // A not-started row opens a page too (the author starts it); a non-author is told who does.
  await p.goto(`${BASE}/?f=all`); await idle();
  await row("Grant of citizenship").click(); await p.waitForURL(/\/c\//); await p.getByText("No forms yet.", { exact: false }).first().waitFor(); await idle();
  step("the header's draft count matches the list and draft bar (an empty draft shows no changes)", !/\d+ draft changes?/.test(await p.locator("h1").locator("xpath=../following-sibling::p[1]").textContent()));
  step("a not-started row opens its (new, empty) combination page for the author", (await p.getByRole("heading", { level: 1 }).textContent()) === "Grant of citizenship" && /No forms yet/.test(await p.locator("main").textContent()));
  await state("combination-page-not-started");
  await p.goto(`${BASE}/?f=all`); await idle();
  await as("user-B");
  const muted = await row("Extend stay in Canada").locator('[role="gridcell"]').nth(2).locator("button").count();
  await row("Extend stay in Canada").click(); await idle();
  step("non-author: author-only next steps are shown, not offered; a not-started row says who starts it", muted === 0 && /A configuration author starts it/.test(await p.locator('[aria-live="polite"]').textContent()) && !p.url().includes("/c/"));
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

  // New combination (unchanged since the early look) still opens and lands back in the list.
  await p.getByRole("button", { name: "New combination" }).click(); await idle();
  step("New combination opens the path builder page", /\/new/.test(p.url()) && await p.getByRole("heading", { name: /New combination/ }).count() === 1);
  const placeholdersFit = await p.locator('input[role="combobox"]').evaluateAll((xs) => xs.every((x) => { const c = document.createElement("canvas").getContext("2d"); c.font = getComputedStyle(x).font; return c.measureText(x.placeholder).width <= x.clientWidth - 24; }));
  step("review #10: a path back to Programs, no stray hint under Pathway, placeholders not cut", await p.getByRole("navigation", { name: "Path" }).getByRole("link", { name: "Programs" }).count() === 1 && !/^exists$/m.test(await p.locator("main").innerText()) && placeholdersFit);
  await state("new-combination-path-builder");

  // ======================================================== fix pass (Lead note 23 Oct): QA-6, QA-7, QA-11, QA-1, QA-10, P-63
  const level = async (i, text, choose = /^Create/) => {
    const box = p.locator('main input[placeholder="Choose or type"]').nth(i);
    await box.click(); await box.fill(text); await p.waitForTimeout(250);
    const opt = p.getByRole("option", { name: choose }).first();
    if (await opt.count()) await opt.click();
    await idle();
  };
  await p.goto(`${BASE}/new`); await idle();
  await level(0, "A".repeat(60) + " " + "B".repeat(70)); await level(1, "Long test");
  const longMsg = await p.locator("#pk-program-hint").textContent();
  step("QA-7: a 131-character program name shows \"Keep the name under 120 characters.\" on its field, and Create is not offered", longMsg === "Keep the name under 120 characters." && await p.getByRole("button", { name: "Create and add sources" }).isDisabled() && (await api("/path-options?pathway=INDIVIDUAL")).body.programs.every((x) => x.label.length <= 120), longMsg);
  await state("new-combination-name-too-long", { viewport: true });
  await p.goto(`${BASE}/new`); await idle();
  await level(0, "!!!"); await level(1, "???");
  const symMsg = await p.locator("#pk-program-hint").textContent();
  step("QA-6: a name of symbols only says to use letters or digits; nothing can be created", /letters or digits/.test(symMsg) && await p.getByRole("button", { name: "Create and add sources" }).isDisabled(), symMsg);
  await p.goto(`${BASE}/new`); await idle();
  await level(0, "Work permits", /^Work permits/); await level(1, "Employer-specific", /^Employer-specific/); await level(2, "With an LMIA", /^With an LMIA/);
  const wpId = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === "individual.work_permits.employer_specific.with_lmia").combinationId;
  await p.getByRole("button", { name: "Open the existing combination" }).click(); await p.waitForURL(/\/c\//, { timeout: 5000 }).catch(() => {}); await idle();
  step("QA-11: \"Open the existing combination\" opens that combination's page (not the list)", p.url().endsWith(`/c/${wpId}`), p.url());
  // QA-1 on the shared Release page: a changed combination nobody submitted is held back with the reason.
  await p.goto(`${BASE}/release`); await idle();
  const relRow = p.getByRole("row", { name: /Study permit/ }).first();
  const relText = (await relRow.textContent()) ?? "";
  step("QA-1: the shared Release page holds back a combination nobody submitted, saying why", /Held back: Not submitted for review/.test(relText), relText);
  await as("user-B"); await idle();
  step("QA-1: with nothing reviewed, the approver has nothing to release (button off)", await p.getByRole("button", { name: "Nothing ready to release" }).isDisabled());
  await state("release-page-held-not-submitted");
  await as("user-A");
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
    const narrow = await p.evaluate(() => { const c = document.querySelector('[role="row"][data-node] [role="gridcell"]'); const steps = [...document.querySelectorAll('[role="row"][data-node] [role="gridcell"]:nth-child(3)')]; return { nameW: Math.round(c.getBoundingClientRect().width), over: document.documentElement.scrollWidth - innerWidth, clipped: steps.filter((x) => x.scrollWidth > x.clientWidth + 1).length }; });
    step(`narrow ${w} px: the combination's name keeps its width (≥ 200 px), next steps are not clipped, no sideways scroll`, narrow.nameW >= 200 && narrow.over <= 0 && narrow.clipped === 0, JSON.stringify(narrow));
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  // ======================================================== P-74: forms decisions visible (C1.6, C1.7, C2.7, C2.10)
  await p.goto(`${BASE}/?f=all`); await idle();
  step("C1.6: the Programs row says how the combination is filed", /Filed: PDF only/.test(await row("With an LMIA").textContent()));
  await p.goto(`${BASE}/c/${wpId}`); await idle();
  const forms = p.getByRole("region", { name: "Forms" });
  step("C1.6: the combination page shows the filing method and each line's channel", /Filing: PDF only/.test(await forms.textContent()) && await forms.getByRole("combobox", { name: /^How IMM \d+.* is filed$/ }).count() >= 6);
  await forms.getByRole("combobox", { name: "How IMM 1295 is filed" }).selectOption("SIGNED_PDF_UPLOAD"); await idle();
  await p.waitForFunction(() => /signed by hand, scanned/.test(document.querySelector('[aria-labelledby="ov-forms"]')?.textContent ?? ""), null, { timeout: 5000 }).catch(() => {});
  step("C1.6: the author sets a line's channel; the line's signature follows and the filing method stays in C1.6's short words", /Filing: PDF only/.test(await p.locator("[data-filing]").textContent()) && /some signed by hand/.test((await p.locator("[data-filing] [title]").getAttribute("title")) ?? "") && /signed by hand, scanned/.test(await forms.textContent()));
  await forms.getByRole("combobox", { name: "How IMM 1295 is filed" }).selectOption("PDF_UPLOAD"); await idle();
  await forms.getByRole("combobox", { name: "Portal" }).selectOption("ircc_portal"); await idle();
  await p.waitForFunction(() => /IRCC Portal/.test(document.querySelector("main")?.textContent ?? "") && !document.querySelector("[data-filing] select:disabled"), null, { timeout: 5000 }).catch(() => {});
  step("C1.7: the author picks the combination's portal", (await forms.getByRole("combobox", { name: "Portal" }).inputValue()) === "ircc_portal");
  await forms.getByRole("button", { name: "Add an online form" }).click();
  const op = p.getByRole("dialog", { name: "Add an online form" }); await op.waitFor();
  for (let i = 0; i < 25 && (await op.getByRole("combobox", { name: "Portal" }).inputValue()) !== "ircc_portal"; i++) await p.waitForTimeout(200); // the summary refresh after the portal save
  step("C2.7: \"Add an online form\" opens a right panel with the combination's portal chosen", (await op.getByRole("combobox", { name: "Portal" }).inputValue()) === "ircc_portal");
  await op.getByLabel("Form code").fill("IMM 5707"); await op.getByLabel("Title as the portal shows it").fill("Family information (online)");
  await op.getByLabel("Choose blank screens").setInputFiles(path.join(__dirname, "fixtures", "portal", "imm5257-online-s1-personal-with-answers.html"));
  await op.getByRole("button", { name: "Add and send for approval" }).click();
  await op.getByText(/nothing was kept/).waitFor({ timeout: 30000 }).catch(() => {}); await idle();
  step("review 2 should 1: a page holding an answer is refused and nothing is left behind (no \"being captured\" row)", /nothing was kept/.test(await op.textContent()) && !/Being captured/.test((await p.locator("[data-online-forms]").textContent().catch(() => "")) ?? ""));
  await op.getByLabel("Choose blank screens").setInputFiles(["imm5257-online-s1-personal.html", "imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"].map((f) => path.join(__dirname, "fixtures", "portal", f)));
  await state("add-online-form-panel", { viewport: true });
  await op.getByRole("button", { name: "Add and send for approval" }).click();
  await op.getByText(/online form added/).waitFor({ timeout: 30000 }).catch(() => {});
  step("C2.7: the screens are read, checked for answers and sent for approval", /Awaiting a second person/.test(await op.textContent()) && (await op.getByRole("list", { name: "Screen results" }).getByText("Added").count()) === 3);
  await op.getByRole("button", { name: "Close" }).first().click(); await idle();
  step("C2.7: the combination lists the online form as \"Awaiting a second person\"", /IMM 5707.*Awaiting a second person/s.test(await p.locator("[data-online-forms]").textContent()));
  await state("combination-online-form-awaiting");
  await as("user-B");
  step("C1.6/C1.7: someone without the author duty sees the channels and the portal, but cannot change them", await forms.getByRole("combobox").count() === 0 && /IRCC Portal/.test(await forms.textContent()) && await forms.getByRole("button", { name: "Add an online form" }).count() === 0);
  await as("user-A");
  await p.goto(`${BASE}/c/${wpId}/sources`); await idle();
  const dsrc = p.locator("[data-drafting-sources]");
  step("C2.10: the sources tab says, per form, what drafting reads (PDF version first by default)", /Reads the PDF version \(IMM 1295/.test(await dsrc.textContent()) && (await dsrc.getByRole("combobox", { name: "What drafting reads for IMM 1295" }).inputValue()) === "PDF_FIRST");
  await dsrc.getByRole("combobox", { name: "What drafting reads for IMM 1295" }).selectOption("ONLINE_ONLY"); await idle();
  await p.waitForFunction(() => /Online screens only, but no online version/.test(document.querySelector("[data-drafting-sources]")?.textContent ?? ""), null, { timeout: 5000 }).catch(() => {});
  step("C2.10: the author changes it per form and the line says what that means", /Online screens only, but no online version from the IRCC Portal has been approved yet/.test(await dsrc.textContent()));
  await dsrc.getByRole("combobox", { name: "What drafting reads for IMM 1295" }).selectOption("PDF_FIRST"); await idle();
  await state("sources-tab-drafting-reads");

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
})().catch((e) => { console.error(e); process.exit(2); });
