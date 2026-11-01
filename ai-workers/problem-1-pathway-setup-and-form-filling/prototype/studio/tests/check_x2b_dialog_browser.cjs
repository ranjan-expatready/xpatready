// X2b slices (c) and (d) (C1.5, concept v3 §4, board design/draft-x2b-board.html) walked in a real browser like a person:
// a form line's ⋯ menu → Copy to other combinations… → the preview with every outcome → Add → the toast → Undo; Remove
// from other combinations…; Undo refused when a target changed since (named in words); a document line's menu; Copy a
// line from another combination with one Undo for every line; the approver sees no copy controls; keyboard only (Esc
// closes, nothing changes); 390 px; axe (WCAG 2.2 AA) on each state; 150 combinations in the preview within the budget.
// Screenshots at 1440 px into product/screens/X2-links-and-copy/screenshots/x2b-c/. Rules only, no model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_x2b 4444 start && node studio/tests/check_x2b_dialog_browser.cjs 4444 xr_studio_screens_x2b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4444), DB = process.argv[3] ?? "xr_studio_screens_x2b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "X2-links-and-copy", "screenshots", "x2b-c"); fs.mkdirSync(SHOTS, { recursive: true });
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql"].find((p) => fs.existsSync(p)) ?? "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  const served = (await api("/session")).body?.workspace?.id;
  if (!served || !(() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })()) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses.`); process.exit(2); }
  // Fails loudly when the page never settles (no silent wait).
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }); await p.waitForTimeout(200); };
  let n = 0;
  const state = async (name) => {
    n++; await settle();
    await p.screenshot({ path: path.join(SHOTS, `${String(n).padStart(2, "0")}-${name}-${p.viewportSize().width}.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const asActor = async (a) => { await p.goto(BASE); await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, a); };

  await asActor("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample loads", (await api("/demo/load", { method: "POST" })).status < 300);
  const id = (k) => sql(`select id from combination where combination_key='${k}'`);
  const WP = id("wp.family"), VV = id("vv.single"), SP = id("sp.student");
  const lines = (cid, key) => sql(`select coalesce(string_agg(version||':'||status, ',' order by version), '') from combination_form where combination_id='${cid}' and lineage_key='${key}'`);
  const F = "IMM 5476";
  sql(`delete from combination_form where lineage_key='${F}' and combination_id<>'${WP}'`);

  // ------------------------------------------------------------ the line menu
  await p.goto(`${BASE}/c/${WP}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  await p.getByRole("button", { name: `Actions for ${F}` }).click();
  await p.getByRole("menuitem", { name: "Copy to other combinations…" }).waitFor({ timeout: 10000 });
  step("C1.5 menu: a form line's ⋯ menu has Copy to other combinations… and Remove from other combinations…", await p.getByRole("menuitem", { name: "Remove from other combinations…" }).isVisible());
  await state("line-menu");

  // ------------------------------------------------------------ add preview
  await p.getByRole("menuitem", { name: "Copy to other combinations…" }).click();
  const dlg = p.getByRole("dialog", { name: `Copy ${F} to other combinations` });
  await dlg.waitFor(); await dlg.locator("[data-bulk-row]").first().waitFor({ timeout: 30000 });
  const intro = await dlg.locator("[data-bulk-intro]").innerText();
  step("C1.5 preview: the line in words and the concept §5 intro", intro.includes("Nothing changes until you choose Add.") && intro.includes(F), intro);
  const willAdd = await dlg.locator('[data-bulk-row="WILL_ADD"]').count();
  const cannot = await dlg.locator('[data-bulk-row^="CANNOT"]').count();
  step("C1.5 preview: one row per other combination with its full trail, will-change rows ticked, others not tickable", willAdd > 0 && (await dlg.locator('[data-bulk-row="WILL_ADD"] input:checked').count()) === willAdd && (await dlg.locator('[data-bulk-row^="CANNOT"] input:disabled').count()) === cannot && (await dlg.locator("[data-bulk-row] td:nth-child(2)").first().innerText()).includes("›"), `${willAdd} add, ${cannot} cannot`);
  const btn = dlg.locator("[data-bulk-apply]");
  step("C1.5 preview: the button counts the ticked rows", (await btn.innerText()).trim() === `Add to ${willAdd} combination${willAdd === 1 ? "" : "s"}`, await btn.innerText());
  await state("add-preview");
  // Keyboard: Esc closes, nothing changes.
  await p.keyboard.press("Escape");
  await dlg.waitFor({ state: "hidden" });
  step("C1.5 keyboard: Esc closes the preview and nothing changes", lines(VV, F) === "" && lines(SP, F) === "");

  // Keyboard only: open the menu with the keyboard, tick off one row with Space, Add with Enter.
  await p.getByRole("button", { name: `Actions for ${F}` }).focus();
  await p.keyboard.press("Enter");
  await p.getByRole("menuitem", { name: "Copy to other combinations…" }).waitFor();
  await p.keyboard.press("ArrowDown"); // focus moves into the menu
  for (let i = 0; i < 8 && !(await p.evaluate(() => document.activeElement?.textContent?.includes("Copy to other combinations"))); i++) await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
  await dlg.waitFor(); await dlg.locator("[data-bulk-row]").first().waitFor({ timeout: 30000 }); await settle();
  // Keep two will-add rows (Visitor visa and Study permit) by unticking the rest.
  const keep = [VV, SP];
  for (const row of await dlg.locator('[data-bulk-row="WILL_ADD"]').all()) {
    const cid = await row.getAttribute("data-combination");
    if (!keep.includes(cid)) { await row.locator("input").focus(); await p.keyboard.press("Space"); }
  }
  step("C1.5 keyboard: Space unticks a row and the count follows", (await btn.innerText()).trim() === "Add to 2 combinations", await btn.innerText());
  await btn.focus(); await p.keyboard.press("Enter");
  const toast = p.locator("[data-bulk-toast]");
  await toast.waitFor({ timeout: 30000 });
  step("C1.5 after: the toast says the concept's words, with Undo", (await toast.innerText()).includes(`${F} added to 2 combinations (draft changes in each).`) && await toast.locator("[data-bulk-undo]").isVisible(), await toast.innerText());
  step("C1.5 after: each combination has its own draft line", lines(VV, F) === "1:DRAFT" && lines(SP, F) === "1:DRAFT", `${lines(VV, F)} / ${lines(SP, F)}`);
  await state("toast");
  await toast.locator("[data-bulk-undo]").click();
  await p.waitForFunction(() => /Undone: 2 combinations are back/.test(document.querySelector("[data-bulk-toast]")?.textContent ?? ""), null, { timeout: 20000 });
  step("C1.5 Undo: one Undo takes back the whole copy, in words", lines(VV, F) === "" && lines(SP, F) === "", await toast.innerText());
  await state("undone");

  // ------------------------------------------------------------ Undo refused
  const batch = await api("/lines/bulk", { method: "POST", data: { line: { combinationId: WP, kind: "form", key: F }, op: "add", combinationIds: [VV, SP], include: [VV, SP], idempotencyKey: `t-${Date.now()}` } });
  step("setup: a copy made through the API", batch.status === 200, JSON.stringify(batch.body).slice(0, 200));
  // The same through the page, so the page holds the Undo: copy to VV and SP, then change SP by hand, then Undo.
  await api(`/lines/bulk/${batch.body.batchId}/undo`, { method: "POST" });
  await p.getByRole("button", { name: `Actions for ${F}` }).click();
  await p.getByRole("menuitem", { name: "Copy to other combinations…" }).click();
  await dlg.locator("[data-bulk-row]").first().waitFor({ timeout: 30000 }); await settle();
  for (const row of await dlg.locator('[data-bulk-row="WILL_ADD"]').all()) { const cid = await row.getAttribute("data-combination"); if (!keep.includes(cid)) await row.locator("input").uncheck(); }
  await btn.click(); await p.locator("[data-bulk-toast]").filter({ hasText: "added to 2" }).waitFor({ timeout: 20000 });
  const edit = await api(`/combinations/${SP}/forms/${encodeURIComponent(F)}`, { method: "PATCH", data: { minAge: 30 } });
  step("setup: Study permit's copy is changed by hand after the copy", edit.status < 300, `${edit.status} ${JSON.stringify(edit.body).slice(0, 160)}`);
  await toast.locator("[data-bulk-undo]").click();
  const refused = p.getByRole("alertdialog").or(p.getByRole("dialog", { name: "The copy cannot be undone in one step" }));
  await refused.waitFor({ timeout: 20000 });
  const rw = await p.locator("[data-bulk-undo-refused]").innerText();
  step("C1.5 Undo refused: the combination that changed is named with what, who and when; nothing undone", /was changed after the copy \(IMM 5476 changed, by .+ at \d\d:\d\d UTC\)\. Nothing was undone\./.test(rw) && /Remove IMM 5476 by hand/.test(rw) && lines(VV, F) === "1:DRAFT", rw);
  await state("undo-refused");
  await p.getByRole("button", { name: "Close" }).first().click();

  // ------------------------------------------------------------ remove preview
  await p.getByRole("button", { name: `Actions for ${F}` }).click();
  await p.getByRole("menuitem", { name: "Remove from other combinations…" }).click();
  const rdlg = p.getByRole("dialog", { name: `Remove ${F} from other combinations` });
  await rdlg.locator("[data-bulk-row]").first().waitFor({ timeout: 30000 }); await settle();
  step("C1.5 remove preview: the combinations that have it will be removed, the rest do not have it", (await rdlg.locator('[data-bulk-row="WILL_REMOVE"]').count()) >= 2 && (await rdlg.locator('[data-bulk-row="DOES_NOT_HAVE"]').count()) > 0 && (await rdlg.locator("[data-bulk-intro]").innerText()).includes("Nothing changes until you choose Remove."));
  await state("remove-preview");
  await rdlg.locator("[data-bulk-apply]").click(); await p.locator("[data-bulk-toast]").filter({ hasText: "removed from" }).waitFor({ timeout: 20000 });
  step("C1.5 remove: the line is removed from every ticked combination as a draft change", lines(VV, F) === "1:RETIRED" || lines(VV, F) === "", lines(VV, F));

  // ------------------------------------------------------------ a document line
  await p.goto(`${BASE}/c/${WP}/documents`); await p.locator("[data-doc-line]").first().waitFor({ timeout: 30000 }); await settle();
  const docName = (await p.locator("[data-doc-line] td:first-child button").first().innerText()).trim();
  await p.locator("[data-doc-line]").first().locator("[data-row-menu]").click();
  await p.getByRole("menuitem", { name: /Copy to other combinations…/ }).click();
  const ddlg = p.getByRole("dialog", { name: `Copy ${docName} to other combinations` });
  await ddlg.locator("[data-bulk-row]").first().waitFor({ timeout: 30000 }); await settle();
  step("C1.5 documents: a document line's ⋯ menu opens the same preview", (await ddlg.locator("[data-bulk-row]").count()) > 0, docName);
  await state("document-preview");
  await ddlg.getByRole("button", { name: "Cancel" }).click();

  // ------------------------------------------------------------ copy a line from another combination
  sql(`delete from combination_form where lineage_key='IMM 5707' and combination_id='${SP}'`);
  await p.goto(`${BASE}/c/${SP}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  await p.locator("[data-copy-from-open]").first().click();
  const fdlg = p.getByRole("dialog", { name: "Copy a line from another combination" });
  await fdlg.locator("[data-copy-from-source]").waitFor();
  step("C1.5 copy from: focus starts on the combination to copy from", await p.evaluate(() => document.activeElement?.id === "bulk-from-source"));
  await fdlg.locator("[data-copy-from-source]").selectOption(WP);
  await fdlg.locator("[data-copy-from-row]").first().waitFor({ timeout: 30000 }); await settle();
  const rows = await fdlg.locator("[data-copy-from-row]").count();
  const can = await fdlg.locator('[data-copy-from-row="WILL_ADD"]').count();
  step("C1.5 copy from: its lines each say what happens here; lines that cannot come are not tickable", rows > 0 && can > 0 && (await fdlg.locator('[data-copy-from-row^="CANNOT"] input:disabled').count()) === (await fdlg.locator('[data-copy-from-row^="CANNOT"]').count()), `${rows} rows, ${can} will add`);
  await state("copy-from");
  for (const r of await fdlg.locator('[data-copy-from-row="WILL_ADD"]').all()) { if ((await r.getAttribute("data-line-key")) !== "IMM 5707") await r.locator("input").uncheck(); }
  const fbtn = fdlg.locator("[data-copy-from-apply]");
  step("C1.5 copy from: the button counts the ticked lines", (await fbtn.innerText()).trim() === "Add 1 line", await fbtn.innerText());
  await fbtn.click();
  await p.locator("[data-bulk-toast]").filter({ hasText: "copied here from" }).waitFor({ timeout: 20000 });
  step("C1.5 copy from: the line is added here as a draft", lines(SP, "IMM 5707") === "1:DRAFT", lines(SP, "IMM 5707"));
  await p.locator("[data-bulk-undo]").click();
  await p.locator("[data-bulk-toast]").filter({ hasText: "Undone:" }).waitFor({ timeout: 20000 });
  step("C1.5 copy from: one Undo takes it back", lines(SP, "IMM 5707") === "", lines(SP, "IMM 5707"));

  // ------------------------------------------------------------ 390 px
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(`${BASE}/c/${WP}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  await p.getByRole("button", { name: `Actions for ${F}` }).click();
  await p.getByRole("menuitem", { name: "Copy to other combinations…" }).click();
  await dlg.locator("[data-bulk-row]").first().waitFor({ timeout: 30000 }); await settle();
  const fit = await p.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const r = d.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: window.innerWidth, inner: d.scrollWidth - d.clientWidth }; });
  step("C1.5 390 px: the preview fits the screen (its table scrolls inside it)", fit.left >= 0 && fit.right <= fit.w + 1 && fit.inner <= 1, JSON.stringify(fit));
  await state("add-preview");
  await p.keyboard.press("Escape");
  await p.setViewportSize({ width: 1440, height: 900 });

  // ------------------------------------------------------------ the approver
  await asActor("user-B");
  await p.goto(`${BASE}/c/${WP}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  step("C1.5 approver: no copy controls on Forms, and the read-only words", (await p.locator("[data-copy-from-open]").count()) === 0 && (await p.getByRole("button", { name: `Actions for ${F}` }).count()) === 0 && (await p.locator("[data-approver-copies]").innerText()).includes("No copy controls here"));
  await state("approver");
  await p.goto(`${BASE}/c/${WP}/documents`); await p.locator("[data-doc-line]").first().waitFor({ timeout: 30000 }); await settle();
  await p.locator("[data-doc-line]").first().locator("[data-row-menu]").click();
  const item = p.locator('[data-menu-item="Copy to other combinations…"]');
  step("C1.5 approver: on Documents the copy items are greyed with their reason", (await item.getAttribute("data-disabled")) !== null && (await item.innerText()).includes("Read only"));
  await p.keyboard.press("Escape");
  await asActor("user-A");

  // ------------------------------------------------------------ 150 combinations within the budget
  const cols = sql(`select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_name='program_def'`).split(",");
  const ccols = sql(`select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_name='combination'`).split(",");
  const pd = sql(`select program_def_id from combination where id='${VV}'`);
  const have = Number(sql(`select count(*) from combination where retired_at is null`));
  const more = Math.max(0, 151 - have);
  const pick = (c, over) => (over[c] ?? c);
  sql(`insert into program_def (${cols.join(",")}) select ${cols.map((c) => pick(c, { id: "gen_random_uuid()", program_node_key: "program_node_key||'.x'||g", label: "label||' '||g", name_key: "name_key||g" })).join(",")} from program_def, generate_series(1, ${more}) g where id='${pd}'`);
  sql(`insert into combination (${ccols.join(",")}) select ${ccols.map((c) => pick(c, { id: "gen_random_uuid()", program_def_id: "(select id from program_def p where p.program_node_key = (select program_node_key from program_def where id='" + pd + "')||'.x'||g)", combination_key: "combination_key||'.x'||g", label: "label||' '||g" })).join(",")} from combination, generate_series(1, ${more}) g where id='${VV}'`);
  const total = Number(sql(`select count(*) from combination where retired_at is null`));
  await p.goto(`${BASE}/c/${WP}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle();
  await p.getByRole("button", { name: `Actions for ${F}` }).click();
  const t0 = Date.now();
  await p.getByRole("menuitem", { name: "Copy to other combinations…" }).click();
  await dlg.locator("[data-bulk-row]").nth(140).waitFor({ timeout: 30000 });
  const ms = Date.now() - t0;
  step(`C1.5 timing: the preview of ${total - 1} combinations is shown within 1 s (STANDARDS §9 first view; no request per row)`, total >= 151 && ms < 1000, `${ms} ms for ${await dlg.locator("[data-bulk-row]").count()} rows`);
  await p.keyboard.press("Escape");

  step("no page error", errs.length === 0, errs.join(" | "));
  await b.close();
  // Leave the copy's sample as it was.
  await fetch(`${BASE}/api/demo/reset`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify({ confirm: "RESET" }) });
  await fetch(`${BASE}/api/demo/load`, { method: "POST", headers: { "x-actor": "user-A" } });
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
