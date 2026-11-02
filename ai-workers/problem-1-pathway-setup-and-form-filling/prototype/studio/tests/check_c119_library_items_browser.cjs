// C11.9 in the browser (screens lane, J5; P-116 amended, Screen 04 BR-8 to BR-10): on Fields and Document types each row
// has Edit and one written action from its state; opening a refused action shows why and every use with a link (where
// used first); an allowed one is confirmed in the right panel with a reason, then the Undo toast; a retired item is listed
// only under "Retired", with Restore. Keyboard: the panel's Cancel or Close returns focus to the row's action. Sample
// inputs; no AI call (US$0). Screenshots into product/screens/04-shared-library/screenshots/c119/, axe on each state.
//   zsh studio/tools/isolated.sh screens_c119ui 4472 start && node studio/tests/check_c119_library_items_browser.cjs 4472 xr_studio_screens_c119ui
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4447), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_b5b";
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "04-shared-library", "screenshots", "c119"); fs.mkdirSync(SHOTS, { recursive: true });
const PSQL = fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql"; // the Mac, else the cloud copy's own
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const go = async (u) => { await p.goto(`${BASE}${u}`); await p.waitForLoadState("networkidle"); await p.waitForFunction(() => !!document.querySelector("main h1"), null, { timeout: 30000 }); };
  const axe = async (name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id}: ${x.nodes.length}`).join("; ")); };
  const row = (key) => p.locator(`tr[data-item="${key}"]`);
  const search = async (text) => { await p.getByLabel("Search fields").fill(text); await p.waitForTimeout(200); };
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    step("setup: sample inputs loaded", (await api("/demo/load", { method: "POST" })).status === 201);
    sql("insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label, label_checked) select gen_random_uuid(), id, 'person.c119_spare', 1, 'PUBLISHED', 'A spare field no setup reads.', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A', 'Spare test field', true from workspace where key='demo'");

    // ── a refused Retire: why, and every use with a link
    await go("/library/fields"); await search("family_name");
    const fam = row("person.family_name");
    step("C11.9 row: a released field's row offers Edit and Retire", (await fam.locator("[data-edit]").count()) === 1 && (await fam.locator('[data-action="RETIRE"]').count()) === 1);
    await fam.locator('[data-action="RETIRE"]').click();
    const panel = p.locator('[data-item-panel="person.family_name"]');
    await panel.locator("[data-where-panel] [data-stops]").waitFor({ timeout: 15000 });
    const pt = await panel.innerText();
    step("C11.9 BR-9 fail: Retire of a used field shows why in words and what stops it, each with a link", /Can't retire yet: .* still uses? it: remove it there first/.test(pt) && (await panel.locator("[data-stops] a[href^='/c/']").count()) >= 1 && !/BR-\d|\bL\d\b/.test(pt), pt.slice(0, 200));
    step("C11.9 where used: releases and the library form fields that read it are kept for a Retire (they do not stop it); no Send button", (await panel.locator("[data-kept]").count()) === 1 && /release \d/.test(await panel.locator("[data-kept]").innerText()) && /form fields? on IMM/.test(await panel.locator("[data-kept]").innerText()) && !/form fields? on IMM/.test(await panel.locator("[data-stops]").innerText()) && (await panel.locator("[data-confirm-send]").count()) === 0);
    await p.screenshot({ path: path.join(SHOTS, "fields-retire-refused-1440.png") });
    await axe("Fields, a refused Retire");
    await panel.getByRole("button", { name: "Close" }).click();
    // The focus moves after the panel unmounts (a 0 ms timer): wait for it; a timeout is this step's FAIL.
    step("C11.9 keyboard: Close returns focus to the row's action", await p.waitForFunction(() => document.activeElement?.closest("tr")?.getAttribute("data-item") === "person.family_name" && document.activeElement?.getAttribute("data-action") === "RETIRE", null, { timeout: 5000 }).then(() => true, () => false));

    // ── an allowed Retire: confirm with a reason, Undo, then a second person approves
    await search("c119_spare");
    await row("person.c119_spare").locator('[data-action="RETIRE"]').click();
    const imp = p.locator('[data-impact-panel="RETIRE"]');
    await imp.waitFor({ timeout: 15000 });
    step("C11.9 confirm: the panel says what Retire does, who approves and when it takes effect", /disappears from pickers and AI suggestions/.test(await imp.innerText()) && /When it is approved/.test(await imp.innerText()));
    step("C11.9 confirm fail: Send stays off until a reason is given", await imp.locator("[data-confirm-send]").isDisabled());
    await axe("Fields, the Retire confirm");
    await imp.locator("#lifecycle-reason").fill("No setup reads it any more.");
    await imp.locator("[data-confirm-send]").click();
    await p.locator("[data-undo-toast]").waitFor({ timeout: 10000 });
    await p.waitForFunction(() => /Retire waiting/.test(document.querySelector('tr[data-item="person.c119_spare"]')?.textContent ?? ""), null, { timeout: 10000 });
    step("C11.9 pass: sent for approval, the toast says so with Undo; the row says Retire waiting", /Sent for approval: Retire "Spare test field"/.test(await p.locator("[data-undo-toast]").innerText()) && /Retire waiting/.test(await row("person.c119_spare").innerText()));
    await p.screenshot({ path: path.join(SHOTS, "fields-retire-sent-1440.png") });
    await p.locator("[data-undo]").click();
    await p.waitForFunction(() => !/Retire waiting/.test(document.querySelector('tr[data-item="person.c119_spare"]')?.textContent ?? ""), null, { timeout: 10000 });
    step("C11.9 Undo pass: Undo takes the request back; the row offers Retire again", (await row("person.c119_spare").locator('[data-action="RETIRE"]').count()) === 1 && sql("select status from library_change where key='person.c119_spare'") === "WITHDRAWN");
    const c = await api("/library/fields/person.c119_spare/retire", { method: "POST", data: { reason: "No setup reads it any more." } });
    await api(`/library/changes/${c.body.id}/approve`, { method: "POST", data: {}, actor: "user-B" });
    await go("/library/fields"); await search("c119_spare");
    step("C11.9 BR-10 pass: a retired field is not listed under All fields", (await row("person.c119_spare").count()) === 0);
    await p.getByLabel("Filter").selectOption("retired");
    await row("person.c119_spare").waitFor({ timeout: 10000 });
    step("C11.9 BR-10 pass: under Retired it is listed, says so, and offers Restore", /Retired: hidden from pickers/.test(await row("person.c119_spare").innerText()) && (await row("person.c119_spare").locator('[data-action="RESTORE"]').count()) === 1);
    await p.screenshot({ path: path.join(SHOTS, "fields-retired-filter-1440.png") });
    await axe("Fields, the Retired filter");

    // ── Document types: a refused Retire links the combination's Documents tab; Retired filter
    await go("/library/documents");
    const first = p.locator("main tbody tr[data-item]").first();
    await first.locator('[data-action="RETIRE"]').click();
    await p.locator("[data-item-panel] [data-stops]").waitFor({ timeout: 15000 });
    step("C11.9 BR-9 fail: a used document type's Retire is refused, linking the combination's Documents tab", (await p.locator("[data-item-panel] [data-stops] a[href$='/documents']").count()) >= 1);
    await p.screenshot({ path: path.join(SHOTS, "document-types-retire-refused-1440.png") });
    await axe("Document types, a refused Retire");
    await p.locator("[data-item-panel]").getByRole("button", { name: "Close" }).click();
    // Review Ma1: on Document types the first button is View (no page of its own) and opens where used and history only.
    // Nightly 41365074483 (Mac): the where-used panel shows at once with a loading skeleton; History arrives with the
    // answer. The uses answer is held back 1.5 s here (as on a slow machine), and the step waits for History first.
    const slow = async (r) => { await new Promise((s) => setTimeout(s, 1500)); await r.continue(); };
    await p.route("**/uses", slow);
    await first.locator("[data-edit]").click();
    await p.locator("[data-item-view] [data-where-panel]").waitFor({ timeout: 15000 });
    await p.locator("[data-item-view]").getByText(/^(History|No history yet\.)$/).first().waitFor({ timeout: 15000 });
    await p.unroute("**/uses", slow);
    step("C11.9 Ma1 pass: View on a document type opens where it is used and its history, with no action to send", (await first.locator("[data-edit]").innerText()).startsWith("View") && (await p.locator("[data-item-view]").count()) === 1 && (await p.locator("[data-impact-panel], [data-confirm-send]").count()) === 0 && /History|No history yet/.test(await p.locator("[data-item-view]").innerText()));
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => !document.querySelector("[data-item-panel]"), null, { timeout: 5000 });
    step("C11.9 minor pass: Escape closes the panel", (await p.locator("[data-item-panel]").count()) === 0);
    await p.getByLabel("Filter").selectOption("retired");
    step("C11.9 BR-10: the Retired filter says when nothing is retired", /No document type is retired/.test(await p.locator("main").innerText()));

    // ── Sections (same guard): a used section's Retire is refused, linking each combination
    await go("/library/sections");
    const sec = row(sql("select section_key from sqr_section_selection group by section_key order by count(*) desc limit 1"));
    await sec.locator('[data-action="RETIRE"]').click();
    await p.locator("[data-item-panel] [data-stops]").waitFor({ timeout: 15000 }); // the uses are read (the panel shows before they load)
    step("C11.9 sections: a used section's Retire is refused in words, each use linked", /Can't retire yet/.test(await p.locator("[data-item-panel]").innerText()) && (await p.locator("[data-item-panel] [data-stops] a[href^='/c/']").count()) >= 1);
    await p.keyboard.press("Escape");
    // ── the author's own draft: Delete at once, then Undo (P-116 amended)
    sql("insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label, label_checked) select gen_random_uuid(), id, 'person.c119_mine', 1, 'DRAFT', 'My own draft field.', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A', 'My draft field', true from workspace where key='demo'");
    await go("/library/fields"); await search("c119_mine");
    await row("person.c119_mine").locator('[data-action="DELETE"]').click();
    const own = p.locator('[data-impact-panel="DELETE"]'); await own.waitFor({ timeout: 15000 });
    step("C11.9 own draft: the confirm deletes at once (no reason, no second person)", (await own.locator("#lifecycle-reason").count()) === 0 && /^Delete$/.test((await own.locator("[data-confirm-send]").innerText()).trim()));
    await own.locator("[data-confirm-send]").click();
    await p.locator("[data-undo-toast]").waitFor({ timeout: 10000 });
    await p.waitForFunction(() => !document.querySelector('tr[data-item="person.c119_mine"]'), null, { timeout: 10000 });
    step("C11.9 own draft pass: it is gone from the list and the toast says Deleted with Undo", /Deleted "My draft field"/.test(await p.locator("[data-undo-toast]").innerText()) && sql("select count(*) from canonical_field where canonical_field_key='person.c119_mine'") === "0");
    await p.locator("[data-undo]").click();
    await p.waitForFunction(() => !!document.querySelector('tr[data-item="person.c119_mine"]'), null, { timeout: 10000 });
    step("C11.9 own draft Undo pass: it is back as the same draft", sql("select status from canonical_field where canonical_field_key='person.c119_mine'") === "DRAFT");

    // ── the filing order of a combination's forms (Forms tab): Down, then Save to draft
    const sv = sql("select f.combination_id from combination_form f join combination c on c.id = f.combination_id where c.retired_at is null and f.status in ('DRAFT','PUBLISHED') group by f.combination_id having count(distinct f.gov_form_def_id) >= 2 order by 1 limit 1");
    await go(`/c/${sv}/forms`);
    await p.locator("[data-filing-order-open]").click();
    const firstCode = (await p.locator("[data-order-row]").first().getAttribute("data-order-row"));
    await p.getByRole("button", { name: `Move ${firstCode} down` }).click();
    const sent = p.waitForResponse((r) => r.url().endsWith(`/combinations/${sv}/forms/reorder`), { timeout: 10000 });
    await p.locator("[data-filing-order-save]").click();
    const rr = await sent;
    const draft = (await api(`/combinations/${sv}/config?mode=draft`)).body?.snapshot?.forms?.map((f) => f.form_number) ?? [];
    step("C11.9 filing order pass: moved down and saved, the draft files that form second", rr.status() === 200 && draft[1] === firstCode, [rr.status(), draft.join(",")]);

    // ── round 4 Major 1: an own new document type, named through a checklist line (the product's path), returned by the
    // second person after the line was removed: its row offers Delete, which deletes it at once with its ADD.
    const cid = sql("select id from combination where retired_at is null order by label limit 1");
    const made = await api(`/combinations/${cid}/requirements`, { method: "POST", data: { newTypeName: "C119 own new type", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client" } });
    await api(`/combinations/${cid}/requirements/${encodeURIComponent(made.body.lineageKey)}`, { method: "PATCH", data: { retire: true } });
    const addId = sql("select id from library_change where key='c119_own_new_type' and action='ADD'");
    await api(`/library/changes/${addId}/return`, { method: "POST", data: { note: "Use the existing type." }, actor: "user-B" });
    await go("/library/documents");
    const ownRow = row("c119_own_new_type");
    step("C11.9 round-4 Major 1 pass: the own new type's row offers Delete, not greyed", (await ownRow.locator('[data-action="DELETE"]:not([aria-disabled])').count()) === 1, await ownRow.innerText().catch(() => "no row"));
    await ownRow.locator('[data-action="DELETE"]').click();
    const ownPanel = p.locator('[data-impact-panel="DELETE"]'); await ownPanel.waitFor({ timeout: 15000 });
    await ownPanel.locator("[data-confirm-send]").click();
    await p.locator("[data-undo-toast]").waitFor({ timeout: 10000 });
    step("C11.9 round-4 Major 1 pass: deleted at once with its ADD withdrawn", sql("select count(*) from document_type where document_type_key='c119_own_new_type'") === "0" && sql(`select status from library_change where id='${addId}'`) === "WITHDRAWN");

    // ── the Fields table fits at 1024 px (the action sits in the Status cell, no extra column)
    await p.setViewportSize({ width: 1024, height: 800 }); await go("/library/fields");
    step("C11.9 1024 px pass: Fields has no sideways scroll", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && [...document.querySelectorAll("main table")].every((t) => (t.parentElement?.scrollWidth ?? 0) <= (t.parentElement?.clientWidth ?? 0) + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });

    // ── a reader without the author duty sees the action greyed with the reason
    await p.evaluate(() => { localStorage.setItem("xr-actor", "user-B"); });
    await go("/library/fields"); await search("family_name");
    step("C11.9 duty fail: without the author duty the action is greyed (aria-disabled) and opens nothing", (await row("person.family_name").locator('[data-action="RETIRE"][aria-disabled="true"]').count()) === 1);
    step("no page error", !errs.length, errs.join(" | "));
  } catch (e) { step("the run finished", false, e.stack ?? e.message); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
