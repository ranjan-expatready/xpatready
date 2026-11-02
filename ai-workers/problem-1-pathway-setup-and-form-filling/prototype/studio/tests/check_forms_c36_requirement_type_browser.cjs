// C3.6, the part not held (P-149, P-158; P-265): a document type named while adding a requirement, walked in a real
// browser as two people. The author names a new type in "Add a document": it waits as a library proposal, the dialog
// stays open with the line's details; a twin name is refused in words; the second person opens it on To review ›
// Proposals (the author's source quote is there) and accepts it; the author's dialog then chooses the type by itself and
// the line is saved. Wrong role: the content reviewer has no Add. axe (WCAG 2.2 AA) on the waiting dialog; no sideways
// scroll at 400 px. Demo › Reset to the six on an isolated copy; no model call (US$0).
//   zsh studio/tools/isolated.sh forms_c36rb 4456 start && node studio/tests/check_forms_c36_requirement_type_browser.cjs 4456 xr_studio_forms_c36rb
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_c36rb";
const BASE = `http://localhost:${PORT}`;
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql"].find((x) => fs.existsSync(x)) ?? "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, failed = 0;
const step = (name, c, detail) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const NAME = "Proof of hotel booking (Sample)", QUOTE = "Sample: a hotel booking for the whole stay (not an official quote).";

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const person = async (actor, width = 1280) => {
    const ctx = await b.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await ctx.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor);
    const pg = await ctx.newPage(); const errors = []; pg.on("pageerror", (e) => errors.push(e.message)); return { pg, errors };
  };
  const { pg: p, errors } = await person("user-A");
  const toast = async (re) => { const t = p.locator("[aria-live=polite] p", { hasText: re }).last(); await t.waitFor({ timeout: 15000 }).catch(() => {}); return (await t.count()) ? await t.innerText() : ""; };
  try {
    const reset = await p.request.fetch(`${BASE}/api/demo/reset-to-six`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: { confirm: "RESET" } });
    step("setup: Demo › Reset to the six", reset.status() < 300, reset.status());
    const wp = sql("select id from combination where combination_key like 'wp.%' order by combination_key limit 1");
    const lines0 = sql(`select count(*) from document_requirement where combination_id = '${wp}'`), types0 = sql("select count(*) from document_type");

    // ── 1. The author names a new type while adding a document.
    await p.goto(`${BASE}/c/${wp}/configuration?area=documents`);
    const add = p.getByRole("button", { name: "Add a document", exact: true }); await add.waitFor({ timeout: 30000 }); await add.click();
    const dlg = p.getByRole("dialog"); await dlg.waitFor();
    await dlg.getByLabel("New document type name").fill(NAME);
    await dlg.getByLabel("Whose document").selectOption("principal_applicant");
    await dlg.getByLabel("Source quote").fill(QUOTE);
    const sent = p.waitForResponse((r) => /\/requirements$/.test(r.url()) && r.request().method() === "POST");
    await dlg.getByRole("button", { name: "Save to draft" }).click();
    const res = await sent;
    const waiting = dlg.locator("[data-requirement-type-waiting]"); await waiting.waitFor({ timeout: 15000 }).catch(() => {});
    step("C3.6 pass: Save with a new type name waits as a library proposal (202) and says so in the dialog, with a link to To review › Proposals", res.status() === 202 && /waits for a second person on To review › Proposals/.test(await waiting.innerText().catch(() => "")) && (await dlg.getByRole("link", { name: "Open To review › Proposals" }).getAttribute("href").catch(() => "")) === `/review/proposals?group=${encodeURIComponent(`combination:${wp}`)}`, res.status());
    step("C3.6 pass: the dialog stays open and keeps the line's details (whose, source quote)", (await dlg.getByLabel("Whose document").inputValue()) === "principal_applicant" && (await dlg.getByLabel("Source quote").inputValue()) === QUOTE);
    step("C3.6 fail: no type and no line are written by hand", sql("select count(*) from document_type") === types0 && sql(`select count(*) from document_requirement where combination_id = '${wp}'`) === lines0);
    const axe = await new AxeBuilder({ page: p }).include("[role=dialog]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    step("C3.6 pass: axe finds no WCAG 2.2 AA violation in the waiting dialog", axe.violations.length === 0, axe.violations.map((v) => v.id));

    // ── 2. A twin of the waiting name is refused in words; the dialog stays.
    await dlg.getByLabel("New document type name").fill("proof of HOTEL  booking (sample)");
    await dlg.getByRole("button", { name: "Save to draft" }).click();
    const twin = await toast(/already waiting/);
    step("C3.6 fail: a letter-case and spacing twin is refused in words while the first waits; the dialog stays open", /"Proof of hotel booking \(Sample\)" is already waiting on To review › Proposals/.test(twin) && (await dlg.count()) === 1, twin);
    await dlg.getByLabel("New document type name").fill("");

    // ── 3. At 400 px the waiting dialog has no sideways scroll.
    await p.setViewportSize({ width: 400, height: 800 });
    step("C3.6 pass: at 400 px the waiting dialog has no sideways scroll", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await p.setViewportSize({ width: 1280, height: 900 });

    // ── 4. The second person accepts it on To review › Proposals.
    const { pg: q, errors: qErrors } = await person("user-B");
    await q.goto(`${BASE}/review/proposals?group=${encodeURIComponent(`combination:${wp}`)}`); // the dialog's own link
    const open = q.getByRole("button", { name: new RegExp(`^Open ${NAME.replace(/[()]/g, "\\$&")}`) }).first();
    await open.waitFor({ timeout: 30000 }); await open.click();
    const panel = q.getByRole("dialog").last(); await panel.waitFor();
    step("C3.6 pass: the second person reads the author's source quote with the proposal", (await panel.innerText()).includes(QUOTE), (await panel.innerText()).slice(0, 300));
    await panel.getByRole("button", { name: "Accept", exact: true }).click();
    const closed = await panel.waitFor({ state: "hidden", timeout: 15000 }).then(() => true, () => false);
    const key = sql(`select coalesce(decided_key, '') from proposal_item where kind = 'document_type' and payload->>'name' = '${NAME}'`);
    step("C3.6 pass: accepted on To review: a draft type made by a person, its ADD waiting with the author as its proposer", closed && !!key && sql(`select status || '|' || origin from document_type where document_type_key = '${key}'`) === "DRAFT|HUMAN" && sql(`select status || '|' || proposed_by from library_change where kind = 'document_type' and key = '${key}'`) === "WAITING|user-A", key);

    // ── 5. Back with the author: the dialog chooses the type by itself; Save adds the line.
    const done = dlg.locator("[data-requirement-type-accepted]"); await done.waitFor({ timeout: 20000 }).catch(() => {});
    step("C3.6 pass: the author's open dialog sees the accepted type and chooses it (no retyping)", (await done.count()) === 1 && (await dlg.getByLabel("Document type", { exact: true }).inputValue()) === key, await dlg.getByLabel("Document type", { exact: true }).inputValue().catch(() => ""));
    await dlg.getByRole("button", { name: "Save to draft" }).click();
    const added = await toast(/added to the draft/);
    step("C3.6 pass: the line is added with the new type and the details typed before the wait", /added to the draft/.test(added) && sql(`select count(*) from document_requirement where combination_id = '${wp}' and document_type_key = '${key}' and applies_to_roles = 'principal_applicant' and source_quote = '${QUOTE.replace(/'/g, "''")}'`) === "1", added);

    // ── 6. Wrong role: the content reviewer cannot add a document.
    const { pg: c } = await person("user-C");
    await c.goto(`${BASE}/c/${wp}/configuration?area=documents`); await c.locator("main h1").waitFor({ timeout: 30000 });
    await c.waitForLoadState("networkidle");
    step("C3.6 fail: the content reviewer has no Add a document button", (await c.getByRole("button", { name: "Add a document", exact: true }).count()) === 0);
    step("no page error", !errors.length && !qErrors.length, [...errors, ...qErrors]);
  } catch (e) { step("the run finished", false, e.stack ?? e.message); }
  await b.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
