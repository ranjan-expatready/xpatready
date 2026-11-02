// S6 Shared library, queue item (2a) in the browser at 1440 and 1024 px (screens lane; P-158 items 1 and 6, P-162 source
// part, C3.6, C3.13, C3.15): Fields, a field, Sections and Document types offer no Add, say in one line where their items
// come from, show each row's source (an item with none flagged) and where it is used; a field and a section are renamed
// on the page, and a name already taken is refused in words. Sample inputs; no AI call (US$0). Screenshots into
// product/screens/W1-shared-library/screenshots/2a/, axe (WCAG 2.2 AA) on each page.
//   zsh studio/tools/isolated.sh screens_libui 4446 start && node studio/tests/check_s6_library_pages_browser.cjs 4446 xr_studio_screens_libui
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_screens_libui";
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "W1-shared-library", "screenshots", "2a"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const go = async (u) => { await p.goto(`${BASE}${u}`); await p.waitForLoadState("networkidle"); await p.waitForFunction(() => !!document.querySelector("main h1"), null, { timeout: 30000 }); };
  const main = () => p.locator("main").innerText();
  const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(400); };
  const fits = () => p.evaluate(() => { const f = document.querySelector("main table").parentElement; return { ok: f.scrollWidth <= f.clientWidth + 1, scroll: f.scrollWidth, width: f.clientWidth }; });
  const axe = async (name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id}: ${x.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    step("setup: sample inputs loaded", (await api("/demo/load", { method: "POST" })).status === 201);
    // A field made by hand before P-158 has no source: the pages flag it.
    sql("insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by) select gen_random_uuid(), id, 'person.old_hand_made', 1, 'DRAFT', 'A field made by hand before P-158.', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A' from workspace where key='demo'");
    sql("insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), id, 'user-A', 'created', 'field', 'person.old_hand_made', 'test setup' from workspace where key='demo'");

    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      await p.setViewportSize({ width: w, height: h });
      await go("/library/fields");
      const fl = await main();
      step(`C3.6 P-158 (${w}): Fields offers no Add and says in one line where fields come from`, (await p.getByRole("button", { name: /Add a field/ }).count()) === 0 && (await p.locator("[data-origin]").count()) === 1 && /Where these come from: each field is read from a form field/.test(fl), fl.slice(0, 200));
      const rows = await p.locator("main table tbody tr").count(), noted = await p.locator("main table tbody tr [data-source]").count();
      step(`P-162 (${w}): every Fields row shows its source ("From: IMM …" or "From a reviewed release"); no page says "box" (P-63)`, rows > 100 && noted === rows && !/\bbox(es)?\b/i.test(fl) && /From: IMM 1295 \(09-2023\) form field/.test(fl) && /From a reviewed release/.test(fl), `${noted} of ${rows}`);
      step(`P-162 fail (${w}): a field with no source is flagged "No source recorded", never blank`, /No source recorded/.test(await p.locator("main table tbody tr", { hasText: "person.old_hand_made" }).innerText()));
      step(`C3.13 (${w}): where used: a field's forms, form fields and combinations`, /IMM 1295[^\n]* · \d+ form fields? · 1 combination/.test(fl));
      const f = await fits(); step(`QA-39 (${w}): the Fields table still fits without sideways scroll`, f.ok, JSON.stringify(f));
      await p.screenshot({ path: path.join(SHOTS, `fields-${w}.png`) });
      await go("/library/sections");
      const sc = await main();
      step(`C3.6 P-158 (${w}): Sections offers no Add and says where sections come from`, (await p.getByLabel("New section title").count()) === 0 && (await p.getByRole("button", { name: "Add", exact: true }).count()) === 0 && /Where these come from: the forms' own parts/.test(sc));
      step(`C3.13 (${w}): Sections shows each one's source and the combinations using it by name`, /Its questions read form fields on IMM 1295/.test(sc) && /With an LMIA/.test(sc) && (await p.locator("main table tbody tr [data-source]").count()) === (await p.locator("main table tbody tr").count()));
      const sf = await fits(); step(`QA-39 (${w}): the Sections table fits without sideways scroll`, sf.ok, JSON.stringify(sf));
      await p.screenshot({ path: path.join(SHOTS, `sections-${w}.png`) });
      await go("/library/documents");
      const dt = await main();
      step(`C3.13 P-158 (${w}): Document types says where they come from; each row names its checklist and where it is used`, /Where these come from: the document checklist lines/.test(dt) && /From: checklist IMM 5488/.test(dt) && /Used by combinations/.test(dt) && /With an LMIA/.test(dt));
      const df = await fits(); step(`QA-39 (${w}): the Document types table fits without sideways scroll`, df.ok, JSON.stringify(df));
      await p.screenshot({ path: path.join(SHOTS, `documents-${w}.png`) });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    await go("/library/fields"); await axe("Fields");
    await go("/library/sections"); await axe("Sections");
    await go("/library/documents"); await axe("Document types");

    // A field's page: where it comes from, where used, and the rename (C3.15)
    await go("/library/fields/person.family_name");
    let fd = await main();
    step("P-158 item 6: a field's page lists where it comes from, box by box, and the combinations using it", /Where it comes from/.test(fd) && /From: IMM 1295 \(09-2023\) form field "Family name/.test(fd) && /Used in combinations: With an LMIA/.test(fd), fd.slice(0, 200));
    // G-CORE B2: Rename opens a dialog with "What this change touches"; a released field's rename waits for a second person (P-266).
    await p.getByLabel("Name", { exact: true }).fill("Surname"); await p.getByRole("button", { name: "Rename" }).click();
    const dlg = p.getByRole("dialog");
    await dlg.locator('[data-change-preview="ok"]').waitFor({ timeout: 30000 });
    const panel = await dlg.innerText();
    step("G-CORE BR-3: the rename dialog shows what the change touches (checks, tier in words, sections, forms, combinations, releases, open cases) before the confirm", /What this change touches/.test(panel) && /Checks passed/.test(panel) && /Waits for a second person/.test(panel) && /SECTIONS \(\d+\)|Sections \(\d+\)/i.test(panel) && /Forms \(\d+\)/i.test(panel) && /Combinations \(\d+\)/i.test(panel) && /Releases \(\d+\)/i.test(panel) && /Open cases \(\d+\)/i.test(panel), panel.slice(0, 300));
    await p.screenshot({ path: path.join(SHOTS, "field-rename-preview.png"), fullPage: true });
    await axe("the rename dialog with its change preview");
    await dlg.getByRole("button", { name: "Send for approval" }).click(); await settle();
    fd = await main();
    step("G-CORE P-266: sent for approval, the name is unchanged and the page says it waits for a second person", !/^Surname$/m.test(fd) && /waits for a second person on To review/.test(fd), fd.slice(0, 200));
    const waiting = sql("select id from library_change where key='person.family_name' and action='RENAME' and status='WAITING'");
    step("G-CORE: the approver approves it", (await api(`/library/changes/${waiting}/approve`, { method: "POST", actor: "user-B", data: {} })).status < 300);
    await go("/library/fields/person.family_name");
    fd = await main();
    step("C3.15: approved, the heading shows the new name, a new draft version, and Undo rename is offered", /^Surname$/m.test(fd) && /v2 draft/.test(fd) && (await p.getByRole("button", { name: "Undo rename" }).count()) === 1, fd.slice(0, 160));
    await p.screenshot({ path: path.join(SHOTS, "field-renamed.png"), fullPage: true });
    await axe("a field's page");
    await go("/library/fields/person.given_names");
    await p.getByLabel("Name", { exact: true }).fill("surname"); await p.getByRole("button", { name: "Rename" }).click();
    await p.getByRole("dialog").locator('[data-change-preview="refused"]').waitFor({ timeout: 30000 });
    const refused = await p.getByRole("dialog").innerText();
    step("C3.15 fail: renaming onto another field's name is refused in words before the confirm (which stays off), the old name kept", /already the name of Surname/.test(refused) && await p.getByRole("dialog").getByRole("button", { name: /Rename|Send for approval/ }).last().isDisabled() && sql("select label_checked from canonical_field where canonical_field_key='person.given_names' order by version desc limit 1") === "f", refused.match(/.*already.*/)?.[0]);
    await p.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await go("/library/fields/person.old_hand_made");
    step("P-162 fail: a field with no source says so on its page", /No source recorded/.test(await main()));

    // Sections: rename in a dialog with the change preview, a taken title refused
    await go("/library/sections");
    await p.getByRole("button", { name: "Edit Languages", exact: true }).click(); // C11.9: the row's Edit opens the rename
    await p.getByLabel("Title").fill("Languages spoken");
    await p.getByRole("dialog").locator('[data-change-preview="ok"]').waitFor({ timeout: 30000 });
    await p.getByRole("dialog").getByRole("button", { name: /^(Rename|Send for approval)$/ }).click(); await settle();
    const secWait = sql("select id from library_change where kind='section' and key='languages' and action='RENAME' and status='WAITING'");
    if (secWait) await api(`/library/changes/${secWait}/approve`, { method: "POST", actor: "user-B", data: {} });
    await go("/library/sections");
    step("C3.15: an author renames a section on the Sections page (approved by a second person when released)", /Languages spoken/.test(await main()) && sql("select title from logical_section where section_key='languages' order by version desc limit 1") === "Languages spoken");
    await p.getByRole("button", { name: "Edit Languages spoken", exact: true }).click();
    await p.getByLabel("Title").fill("personal details");
    await p.getByRole("dialog").locator('[data-change-preview="refused"]').waitFor({ timeout: 30000 });
    step("C3.15 fail: another section's title is refused in words", /already a section called "Personal details"/.test(await p.getByRole("dialog").innerText()));
    await p.screenshot({ path: path.join(SHOTS, "section-rename-refused.png") });
    await p.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

    const r = await api("/library/fields", { method: "POST", data: { key: "person.free_add", meaning: "A field typed in by hand.", valueType: "text" } });
    step("C3.6 P-158 fail: the free add is gone underneath too (410)", r.status === 410, r.status);
    step("no page error", !errs.length, errs.join(" | "));
  } finally { await b.close(); }
  console.log(`\n${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
