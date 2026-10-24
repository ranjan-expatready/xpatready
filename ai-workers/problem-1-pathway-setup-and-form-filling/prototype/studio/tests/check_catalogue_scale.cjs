// The 100-program usability exercise (D279/D283/D285/D280) on the ISOLATED copy (tools/isolated.sh scale 4401 +
// tests/fixtures/scale_100.ts), against Screen 01 Layout v2 (P-35, P-49, P-50): the flat "Combinations" grid with the
// Needs work / Live / All views, the Program filter, search, the Status sort, the path filter (?under=) and one next
// step per row. Selectors follow tests/check_screen01_browser.cjs (the authoritative Layout v2 checks). Scripted task
// runs with timings and clicks: this is a scripted check of the tasks, not a user study, and fixture rendering is not
// backend scalability proof. No AI is launched (no model call, US$0).
// Dropped with the old tree table (QA-9): inline program rename, cancel, concurrent-rename refusal (old T6–T8: Layout v2
// has no rename on Programs) and the AI batch from a program checkbox (old T12: Layout v2 has no row selection; AI is a
// row's next step, P-50). The old "?show=problems" filter is replaced by the Needs work and Not ready counts (T5).
//   node studio/tests/check_catalogue_scale.cjs 4401 [page port: a QA-4 page proxy in front of the server, optional]
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4401), API = `http://localhost:${PORT}`, BASE = `http://localhost:${Number(process.argv[3] ?? PORT)}`;
const OUT = path.join(__dirname, "..", "evidence", "scale-100"); fs.mkdirSync(OUT, { recursive: true });
const FIRST_VIEW_BUDGET_MS = 2000; // a normal visit (app files cached) to the All view of 300+ combinations
const log = []; let clicks = 0; const t0 = Date.now();
const step = (name, ok, detail) => { log.push({ name, ok: !!ok, detail: detail === undefined ? undefined : String(detail).slice(0, 400) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const SEARCH = "Search combinations, form codes and documents";

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${API}/api${pth}`, { headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, method: init.method ?? "GET", data: init.data, timeout: 60000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const cat = async (q) => (await api(`/catalogue?${q}`)).body;
  const idle = async () => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(120); };
  const click = async (loc) => { clicks++; await loc.click(); };
  const shot = (n) => p.screenshot({ path: path.join(OUT, n), fullPage: false });
  const timed = async (fn) => { const s = Date.now(); await fn(); return Date.now() - s; };
  const grid = () => p.getByRole("grid", { name: "Combinations" });
  const rowsIn = () => grid().locator('[role="row"][data-node]');
  /** Waits until the grid shows n rows (the list answers after the search box settles). */
  const shows = async (n, timeout = 15000) => { const s = Date.now(); while (Date.now() - s < timeout) { if ((await rowsIn().count().catch(() => -1)) === n) return true; await p.waitForTimeout(100); } return false; };

  const all = await cat("pathway=INDIVIDUAL&filter=all"), corp = await cat("pathway=CORPORATE&filter=all");
  const programs = all.totals.programs + corp.totals.programs, rows = all.totals.combinations + corp.totals.combinations;
  step("setup: the copy holds 100+ programs (sample + SYNTHETIC)", programs >= 100 && all.rows.some((r) => /^Synthetic /.test(r.path[0])), `${programs} programs, ${rows} combinations (Individual ${all.rows.length}, Corporate ${corp.rows.length})`);

  // T1 first display: the All view of every Individual combination, timed on a normal visit (app files cached).
  await p.goto(`${BASE}/?f=all`); await grid().waitFor({ timeout: 60000 }); await idle();
  await p.goto(`${BASE}/library/forms`); await idle();
  let ms = await timed(async () => { await p.goto(`${BASE}/?f=all`); await grid().waitFor(); await shows(all.rows.length, 30000); });
  const shownAll = await rowsIn().count();
  const allBtn = (await p.getByRole("button", { name: /^All · / }).textContent()) ?? "";
  step(`T1: every combination of the pathway in one list on first display, within ${FIRST_VIEW_BUDGET_MS} ms`, shownAll === all.rows.length && allBtn.trim() === `All · ${all.counts.all}` && ms < FIRST_VIEW_BUDGET_MS, `${shownAll} rows of ${all.rows.length} (${allBtn.trim()}), ${ms} ms; server ${JSON.stringify(all.timing_ms)}`);
  await shot("T1-first-display-1440.png");

  // T2 find a distant synthetic program's second combination by search and open its combination page.
  const target = all.rows.filter((r) => /^Synthetic 093 /.test(r.path[0]));
  const second = target[1];
  let actions = 0;
  ms = await timed(async () => {
    await p.getByLabel(SEARCH).fill("Synthetic 093"); actions++;
    await shows(target.length);
    await click(grid().locator(`[role="row"][data-node="${second.nodeKey}"]`)); actions++;
    await p.waitForURL(/\/c\/[0-9a-f-]+$/); await p.getByRole("heading", { level: 1 }).waitFor();
  });
  const h1 = await p.getByRole("heading", { level: 1 }).textContent();
  step("T2: search finds a distant synthetic program's second combination and opens its combination page", second && p.url().endsWith(`/c/${second.combinationId}`) && h1 === second.label, `${ms} ms, ${actions} actions; ${second?.path.join(" › ")} → ${p.url().replace(BASE, "")}`);
  await shot("T2-combination-page.png");

  // T3 back to Programs: the search, the view and the opened row (highlighted, focused) are restored.
  ms = await timed(async () => { await click(p.getByRole("navigation", { name: "Path" }).getByRole("link", { name: "Programs" })); await grid().waitFor(); await shows(target.length); });
  await p.waitForTimeout(200);
  const u = new URL(p.url());
  const back = await p.evaluate(() => ({ sel: document.querySelector('[role="row"][aria-selected="true"]')?.getAttribute("data-node"), focus: document.activeElement?.getAttribute("data-node") }));
  step("T3: back to Programs restores the search and the All view, and highlights and focuses the opened row", u.searchParams.get("q") === "Synthetic 093" && u.searchParams.get("f") === "all" && back.sel === second?.nodeKey && back.focus === second?.nodeKey && (await p.getByLabel(SEARCH).inputValue()) === "Synthetic 093", `${ms} ms; ${u.search}; ${JSON.stringify(back)}`);

  // T4 a form code finds every combination that files it (compared with the catalogue rows' forms), in both pathways.
  const files = (list, code) => list.rows.filter((r) => r.forms.some((f) => f.code === code));
  const want = files(all, "IMM 5409"), wantCorp = files(corp, "IMM 5409");
  await p.goto(`${BASE}/?f=all`); await grid().waitFor();
  await p.getByLabel(SEARCH).fill("IMM 5409"); await shows(want.length); await idle();
  const found = await rowsIn().evaluateAll((rs) => rs.map((r) => r.getAttribute("data-node")));
  const other = (await p.getByRole("status").filter({ hasText: /more match/ }).textContent().catch(() => "")) ?? "";
  const sameSet = found.length === want.length && want.every((r) => found.includes(r.nodeKey));
  const allSay = await rowsIn().evaluateAll((rs) => rs.every((r) => /Matches: [^\n]*IMM 5409/.test(r.textContent)));
  step("T4: a form code finds every combination that files it, says what matched, and counts the other pathway's matches", sameSet && allSay && (wantCorp.length === 0 ? other === "" : other.startsWith(`${wantCorp.length} more match`)), `${found.length} shown, ${want.length} expected; Corporate: ${other.trim() || "none"} (expected ${wantCorp.length})`);
  await shot("T4-form-code-search.png");

  // T5 Needs work (the default view) and Not ready (first under the Status sort) match the server's counts.
  ms = await timed(async () => { await p.goto(BASE); await grid().waitFor(); await shows(all.counts.needs, 30000); });
  const needsBtn = ((await p.getByRole("group", { name: "Show combinations" }).locator('[aria-pressed="true"]').textContent()) ?? "").trim();
  const needsShown = await rowsIn().count();
  const needsWant = all.rows.filter((r) => r.needs).map((r) => r.nodeKey);
  const needsKeys = await rowsIn().evaluateAll((rs) => rs.map((r) => r.getAttribute("data-node")));
  step("T5: Needs work is the default view and lists exactly the rows the server says need work", needsBtn === `Needs work · ${all.counts.needs}` && needsShown === all.counts.needs && needsWant.every((k) => needsKeys.includes(k)), `${needsBtn}; ${needsShown} shown, ${needsWant.length} expected, ${ms} ms`);
  await p.goto(`${BASE}/?f=all&sort=status`); await grid().waitFor(); await shows(all.rows.length, 30000);
  const statuses = await rowsIn().evaluateAll((rs) => rs.map((r) => r.querySelector("[data-status]")?.getAttribute("data-status")));
  const order = { NOT_READY: 0, IN_SETUP: 1, READY: 2 };
  const sorted = statuses.every((s, i) => i === 0 || order[statuses[i - 1]] <= order[s]);
  const n = (s) => statuses.filter((x) => x === s).length;
  step("T5: under the Status sort, Not ready comes first and the Not ready, In setup and Live counts match the server's", sorted && n("NOT_READY") === all.counts.not_ready && n("IN_SETUP") === all.counts.in_setup && n("READY") === all.counts.ready, `Not ready ${n("NOT_READY")}/${all.counts.not_ready}, In setup ${n("IN_SETUP")}/${all.counts.in_setup}, Live ${n("READY")}/${all.counts.ready}; sorted ${sorted}`);
  await shot("T5-status-sort.png");
  await p.getByRole("button", { name: /^Live · / }).click(); await shows(all.counts.live);
  step("T5: the Live view lists exactly the Live rows", (await rowsIn().count()) === all.counts.live && (await rowsIn().evaluateAll((rs) => rs.every((r) => r.querySelector('[data-status="READY"]')))), `${await rowsIn().count()} shown, ${all.counts.live} Live`);

  // T6 the Program filter lists every program and narrows the list to one of them.
  await p.goto(`${BASE}/?f=all`); await grid().waitFor();
  await click(p.getByRole("button", { name: /^Program:/ }));
  const items = await p.getByRole("menuitemradio").count();
  const p93 = all.programs.find((x) => /^Synthetic 093 /.test(x.label));
  await click(p.getByRole("menuitemradio", { name: new RegExp(`^${p93.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }));
  await shows(p93.combinations);
  const inProg = await rowsIn().evaluateAll((rs, keys) => rs.every((r) => keys.includes(r.getAttribute("data-node"))), target.map((r) => r.nodeKey));
  step("T6: the Program filter offers every program of the pathway and shows only the chosen program's combinations", items === all.programs.length + 1 && (await rowsIn().count()) === p93.combinations && inProg && new URL(p.url()).searchParams.get("prog") === p93.key, `${items - 1} programs offered of ${all.programs.length}; ${await rowsIn().count()} rows for ${p93.label}`);

  // T7 the path filter (?under=, the clickable path on a combination page) shows only the combinations under a level.
  const sub = all.rows.find((r) => r.level === "Sub-category" && /^Synthetic /.test(r.path[0]));
  const underKey = sub.pathKeys[1];
  const underRows = all.rows.filter((r) => r.pathKeys.includes(underKey));
  await p.goto(`${BASE}/?f=all&under=${encodeURIComponent(underKey)}`); await grid().waitFor(); await shows(underRows.length);
  const chip = (await p.getByText(/^Showing: /).textContent().catch(() => "")) ?? "";
  step("T7: the path filter shows only the combinations under one category, and says which", (await rowsIn().count()) === underRows.length && chip.includes(sub.path.slice(0, 2).join(" › ")), `${await rowsIn().count()} rows under ${sub.path.slice(0, 2).join(" › ")} (expected ${underRows.length})`);
  await shot("T7-path-filter.png");

  // T8 every row's next step is the server's (same words), across the whole list.
  await p.goto(`${BASE}/?f=all`); await grid().waitFor(); await shows(all.rows.length, 30000);
  const steps = await rowsIn().evaluateAll((rs) => rs.map((r) => [r.getAttribute("data-node"), (r.querySelector('[role="gridcell"]:nth-child(3)')?.textContent ?? "").trim()]));
  const byKey = new Map(all.rows.map((r) => [r.nodeKey, r]));
  const wrong = steps.filter(([k, s]) => { const r = byKey.get(k); return s !== (r?.nextAction ? r.nextAction.label : r?.combinationId ? "Open" : ""); });
  step("T8: every row shows the server's next step (one next step per combination)", steps.length === all.rows.length && wrong.length === 0, `${steps.length} rows checked; ${wrong.length} differ${wrong.length ? `: ${wrong.slice(0, 3).map(([k, s]) => `${k}="${s}" vs "${byKey.get(k)?.nextAction?.label}"`).join("; ")}` : ""}`);

  // T9 the approver persona cannot add to the structure (server permission, also for a direct call).
  const denied = await api("/program-nodes", { method: "POST", actor: "user-B", data: { kind: "STREAM", parentKey: p93.key, label: "Approver attempt" } });
  const after = (await cat(`pathway=INDIVIDUAL&filter=all&program=${encodeURIComponent(p93.key)}`)).rows.length;
  step("T9: the approver persona cannot add a category (server permission, also for a direct call); nothing is added", denied.status === 403 && after === p93.combinations, `${denied.status} ${denied.body?.detail ?? ""}`);

  // T10 keyboard only: ⌘K to search, Tab into the list, Enter opens the combination; focus is visible on the row.
  await p.goto(`${BASE}/?f=all`); await grid().waitFor(); await idle();
  const long = all.rows.filter((r) => /^Synthetic 042 /.test(r.path[0]));
  await p.keyboard.press("Meta+k"); await p.keyboard.type("Synthetic 042"); await shows(long.length);
  let tabs = 0; let onRow = false; const seen = [];
  for (; tabs < 15 && !onRow; tabs++) { await p.keyboard.press("Tab"); const a = await p.evaluate(() => `${document.activeElement?.getAttribute("role") ?? document.activeElement?.tagName}:${(document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? "").slice(0, 40)}`); seen.push(a); onRow = a.startsWith("row:"); }
  // Visible focus: a box-shadow layer with a non-transparent colour and a non-zero size, or a drawn outline.
  const ring = await p.evaluate(() => { const st = getComputedStyle(document.activeElement); return { shadow: st.boxShadow, outline: `${st.outlineStyle} ${st.outlineWidth}` }; });
  const ringVisible = ring.shadow.split(/,(?![^(]*\))/).some((l) => { const c = l.match(/rgba?\(([^)]*)\)/); const alpha = Number(c ? (c[1].split(/[\s,/]+/).filter(Boolean)[3] ?? 1) : 1); return alpha > 0 && (l.replace(/rgba?\([^)]*\)/, "").match(/-?[\d.]+px/g) ?? []).some((x) => parseFloat(x) !== 0); }) || (!/^none/.test(ring.outline) && !/ 0px$/.test(ring.outline));
  const focusedKey = await p.evaluate(() => document.activeElement?.getAttribute("data-node"));
  await shot("T10-keyboard-long-name.png");
  await p.keyboard.press("Enter"); await p.waitForURL(/\/c\//, { timeout: 10000 }).catch(() => {});
  const opened = long.find((r) => r.nodeKey === focusedKey);
  step("T10: keyboard only: search, Tab to the list, Enter opens the combination; the focused row is visibly marked", onRow && ringVisible && !!opened && p.url().endsWith(`/c/${opened.combinationId}`), `${tabs} Tab presses; focus ring: ${ringVisible ? ring.shadow.split(/,(?![^(]*\))/).find((l) => !/rgba\([^)]*,\s*0\)/.test(l))?.trim().slice(0, 60) : `none (${ring.shadow.slice(0, 40)}; outline ${ring.outline})`}; ${onRow ? `opened ${p.url().replace(BASE, "")}` : `focus went: ${seen.join(" > ")}`}`);

  // T11 widths: no page-level horizontal scroll; the longest program name wraps and is never cut.
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    await p.setViewportSize({ width: w, height: h }); await p.goto(`${BASE}/?f=all&q=Synthetic%20042`); await grid().waitFor(); await shows(long.length);
    const over = await p.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
    const cell = await rowsIn().first().evaluate((r) => { const cs = [...r.querySelectorAll('[role="gridcell"]')]; const box = r.closest('[role="grid"]').getBoundingClientRect(); return { cut: [...cs[0].children].some((e) => e.scrollWidth > e.clientWidth + 1), nameWidth: Math.round(cs[0].getBoundingClientRect().width), clipped: cs.some((c) => c.getBoundingClientRect().right > box.right + 1) }; });
    step(`T11: ${w}px: no horizontal page scroll; the long program name wraps, nothing cut or clipped`, over <= 0 && !cell.cut && !cell.clipped && cell.nameWidth >= 120, `overflow ${over}px; name column ${cell.nameWidth}px; text cut ${cell.cut}; columns clipped by the list frame ${cell.clipped}`);
    await shot(`T11-width-${w}.png`);
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  step("T12: no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  const passed = log.filter((l) => l.ok).length;
  fs.writeFileSync(path.join(OUT, "check_catalogue_scale.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, programs, rows, passed, total: log.length, clicks, seconds: Math.round((Date.now() - t0) / 1000), steps: log }, null, 1));
  console.log(`\n${passed}/${log.length} passed, ${clicks} clicks, ${Math.round((Date.now() - t0) / 1000)} s`);
  await b.close(); process.exit(passed === log.length ? 0 : 1);
})().catch(async (e) => { console.error(e); process.exit(2); });
