// The 100-program usability exercise (D279/D283/D285/D280) on the ISOLATED copy (tools/isolated.sh scale 4401 +
// tests/fixtures/scale_100.ts). Scripted task runs with timings and clicks: this is a scripted check of the tasks, not a
// user study, and fixture rendering is not backend scalability proof. No AI is launched (plans only, no model call).
//   node studio/tests/check_catalogue_scale.cjs 4401
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4401), BASE = `http://localhost:${PORT}`;
const OUT = path.join(__dirname, "..", "evidence", "scale-100"); fs.mkdirSync(OUT, { recursive: true });
const log = []; let clicks = 0; const t0 = Date.now();
const step = (name, ok, detail) => { log.push({ name, ok: !!ok, detail: detail === undefined ? undefined : String(detail).slice(0, 400) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, method: init.method ?? "GET", data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const click = async (loc) => { clicks++; await loc.click(); };
  const shot = (n) => p.screenshot({ path: path.join(OUT, n), fullPage: false });
  const timed = async (fn) => { const s = Date.now(); await fn(); return Date.now() - s; };
  const cat = (await api("/catalogue")).body;
  const programs = cat.programs.length, rows = cat.totals.combinations;

  // T1 first display
  let ms = await timed(async () => { await p.goto(BASE); await p.getByRole("table", { name: "Programs and their combinations" }).waitFor(); });
  const programRows = await p.locator("tbody tr[data-row]").count();
  step("T1: all programs browsable in one table on first display", programRows === programs, `${programRows} program rows of ${programs} (${rows} combinations, collapsed), first display ${ms} ms (catalogue cached server-side ${cat.cached ? "yes" : "no"})`);
  await shot("T1-first-display-1440.png");

  // T2 find a distant program and its second combination; open the exact editor area
  const target = cat.programs.find((x) => /^Synthetic 087/.test(x.label));
  const second = target.combinations[1];
  ms = await timed(async () => {
    await p.getByLabel("Search programs, combinations, keys or forms").fill("Synthetic 087");
    await click(p.getByRole("button", { name: new RegExp(`^Expand ${target.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }));
    await p.locator(`[data-row="${second.id}"]`).waitFor();
    await click(p.locator(`[data-row="${second.id}"]`).getByRole("link", { name: /document/ }));
    await p.waitForURL(/area=documents/); await p.getByRole("tab", { name: /Documents/, selected: true }).waitFor();
  });
  step("T2: find a distant program, its second combination, and open that combination's Documents editor", /\/configuration\?area=documents/.test(p.url()), `${ms} ms, 3 actions; ${second.label}`);
  await shot("T2-documents-editor.png");

  // T3 return with context restored
  ms = await timed(async () => { await click(p.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Programs" })); await p.locator(`[data-row="${second.id}"]`).waitFor(); });
  const u = new URL(p.url());
  const restored = u.searchParams.get("q") === "Synthetic 087" && (u.searchParams.get("open") ?? "").includes(target.key) && u.searchParams.get("sel") === second.id;
  const focused = await p.evaluate((id) => !!document.activeElement?.closest(`[data-row="${id}"]`), second.id);
  step("T3: back to Programs restores search, expansion and the selected combination (focused)", restored && focused, `${ms} ms; ${u.search}; focus on row: ${focused}`);

  // T4 locate a form across combinations
  await p.goto(`${BASE}/`); await p.getByLabel("Search programs, combinations, keys or forms").fill("IMM 5409");
  await p.getByRole("status").filter({ hasText: /matching combination/ }).waitFor();
  const shown = await p.getByRole("status").filter({ hasText: /matching combination/ }).innerText();
  const expect5409 = cat.programs.flatMap((x) => x.combinations).filter((c) => c.forms.includes("IMM 5409")).length;
  step("T4: a form identifier finds every combination that files it", shown.includes(`${expect5409} matching combination`), `${shown} (expected ${expect5409})`);

  // T5 released combinations with draft problems
  await p.goto(`${BASE}/?show=problems`);
  await p.getByRole("table").waitFor();
  const problemRows = await p.locator("tbody tr[data-row]").count();
  const expectedProblemPrograms = cat.programs.filter((x) => x.combinations.some((c) => c.attention.includes("problems"))).length;
  const relWithProblem = cat.programs.flatMap((x) => x.combinations).find((c) => c.release && c.draft.errors);
  step("T5: the 'Draft problems' filter shows exactly the programs with a problem row, including released ones (released badge never hides a draft problem)", problemRows === expectedProblemPrograms && !!relWithProblem, `${problemRows} programs; e.g. ${relWithProblem?.key}: released v${relWithProblem?.release?.version} with ${relWithProblem?.draft.errors} problem(s)`);
  await shot("T5-problems-filter.png");

  // T6/T7 rename: cancel leaves it unchanged; save persists across reload
  const prog = cat.programs.find((x) => /^Synthetic 015/.test(x.label));
  await p.goto(`${BASE}/?q=Synthetic%20015`);
  await click(p.getByRole("button", { name: `Rename program ${prog.label}` }));
  await p.getByLabel("Program name").fill("Changed but cancelled");
  await click(p.getByRole("button", { name: "Cancel" }));
  const afterCancel = (await api("/catalogue")).body.programs.find((x) => x.key === prog.key).label;
  step("T6: cancelling a quick edit changes nothing", afterCancel === prog.label, afterCancel);
  await click(p.getByRole("button", { name: `Rename program ${prog.label}` }));
  await p.getByLabel("Program name").fill(`${prog.label} (renamed)`);
  await click(p.getByRole("button", { name: "Save" }));
  await p.getByText(`${prog.label} (renamed)`).first().waitFor();
  await p.reload(); await p.getByText(`${prog.label} (renamed)`).first().waitFor();
  step("T7: a permitted quick edit saves and survives a reload; the key is unchanged", (await api("/catalogue")).body.programs.some((x) => x.key === prog.key && x.label === `${prog.label} (renamed)`));

  // T8 concurrent change refused on the field
  await click(p.getByRole("button", { name: `Rename program ${prog.label} (renamed)` }));
  await p.getByLabel("Program name").fill("My stale edit");
  await api(`/programs/${encodeURIComponent(prog.key)}`, { method: "PATCH", data: { label: `${prog.label} (someone else)` } });
  await click(p.getByRole("button", { name: "Save" }));
  const alert = await p.getByRole("alert").first().innerText().catch(() => "");
  step("T8: a concurrent change by someone else is refused on the field, not overwritten", /while you were editing/.test(alert), alert);
  await p.keyboard.press("Escape");

  // T9 unauthorised change refused by the server
  const denied = await api(`/programs/${encodeURIComponent(prog.key)}`, { method: "PATCH", data: { label: "Approver edit" }, actor: "user-B" });
  step("T9: the approver persona cannot rename (server permission, also for a direct call)", denied.status === 403, denied.body?.message);

  // T10 keyboard: search, expand, open — with a visible focus indicator
  await p.goto(BASE);
  await p.getByLabel("Search programs, combinations, keys or forms").focus();
  await p.keyboard.type("Synthetic 042");
  await p.getByRole("button", { name: /^Expand Synthetic 042/ }).waitFor({ timeout: 15000 }).catch(async () => { await shot("T10-DEBUG.png"); console.log("DEBUG", p.url(), await p.getByLabel("Search programs, combinations, keys or forms").inputValue(), (await p.locator("main").innerText()).slice(0, 600).replace(/\n/g, " | ")); }); // the filtered row is on screen (the catalogue may be recomputing after T7/T8)
  await p.getByLabel("Search programs, combinations, keys or forms").focus();
  let tabs = 0; let onExpand = false; const seen = [];
  for (; tabs < 30 && !onExpand; tabs++) { await p.keyboard.press("Tab"); const a = await p.evaluate(() => `${document.activeElement?.tagName}:${(document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? "").slice(0, 30)}`); seen.push(a); onExpand = a.startsWith("BUTTON:Expand Synthetic 042"); }
  const ring = await p.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
  await p.keyboard.press("Enter");
  const expanded = await p.evaluate(() => document.activeElement?.getAttribute("aria-expanded"));
  step("T10: keyboard only: search, Tab to the program, Enter expands it; focus is visible", onExpand && expanded === "true" && ring !== "none", `${tabs} Tab presses; focus ring: ${ring.slice(0, 60)}${onExpand ? "" : `; focus went: ${seen.join(" > ")}`}`);
  await shot("T10-keyboard-long-name.png");

  // T11 widths: no page-level horizontal scroll; the long name wraps
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    await p.setViewportSize({ width: w, height: h }); await p.goto(`${BASE}/?q=Synthetic%20042&open=${encodeURIComponent(cat.programs.find((x) => /^Synthetic 042/.test(x.label)).key)}`);
    await p.getByRole("table").waitFor();
    const over = await p.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
    step(`T11: ${w}px: no horizontal page scroll (the table scrolls inside its own frame if needed)`, over <= 0, `overflow ${over}px`);
    await shot(`T11-width-${w}.png`);
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // T12 AI entry points show scope, targets and cost before anything starts (no launch)
  await p.goto(`${BASE}/?q=Synthetic%20003`);
  const p3 = cat.programs.find((x) => /^Synthetic 003/.test(x.label));
  await click(p.getByRole("checkbox", { name: `Select all combinations of ${p3.label}` }));
  await click(p.getByRole("button", { name: /AI configuration/ }));
  const dlg = p.getByRole("dialog"); await dlg.getByText(/model calls/).waitFor();
  const text = await dlg.innerText();
  step("T12: catalogue AI action on an explicit selection shows the operation, every target with its action and reason, and the cost before starting", /Draft field maps for added forms/.test(text) && new RegExp(`${p3.combinations.length} selected combination`).test(text) && /US\$/.test(text), text.slice(0, 200).replace(/\n/g, " | "));
  await shot("T12-ai-scope-dialog.png");
  await click(dlg.getByRole("button", { name: "Cancel" }));
  const batches = (await api("/ai/batches")).body;
  step("T12: nothing was started by opening or cancelling the dialog", Array.isArray(batches) && batches.length === 0, `${batches.length} AI launches`);

  step("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  const passed = log.filter((l) => l.ok).length;
  fs.writeFileSync(path.join(OUT, "check_catalogue_scale.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, programs, rows, passed, total: log.length, clicks, seconds: Math.round((Date.now() - t0) / 1000), steps: log }, null, 1));
  console.log(`\n${passed}/${log.length} passed, ${clicks} clicks, ${Math.round((Date.now() - t0) / 1000)} s`);
  await b.close(); process.exit(passed === log.length ? 0 : 1);
})().catch(async (e) => { console.error(e); process.exit(2); });
