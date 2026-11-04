// C11.16 "one way in" (P-125 amended by P-128 (5)): the acceptance walk of the whole capability in a real browser, as an
// author at 1440 px. Names enter only on Program structure (no New combination page, no other endpoint makes a name);
// each combination the structure defines is a card on Immigration programs; clicking a card never goes to Program
// structure; "Add combination" on Immigration programs opens the same "Add to Program structure" pop-up in place (P-128
// (5) replaced the plain link of P-125 (4)); Start setup opens the workspace with its place read-only and either the
// finder's saved answer (US$0, loaded by itself) or "Find forms with AI" with its price, run only on a click (never
// clicked here); a set-up card opens its workspace; the menu is in setup order. No new build: this proves what is on main.
// Scaffolding (P-33, said here): the only saved finder answer is the sample's Visitor visa; the check copies it under its
// own Visitor visa's key and removes the copies at the end (as check_w1_start_setup.ts does). The AI is the fake launcher
// and is never called: US$0.
//   zsh studio/tools/isolated.sh screens_c1116 4446 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_c1116_one_way_in_browser.cjs 4446 xr_studio_screens_c1116
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_c1116";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-start-setup", "screenshots", "c1116"); fs.mkdirSync(SHOTS, { recursive: true });
const RUNS = path.join(__dirname, "..", "..", "p2", "runs");
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql"].find((p) => fs.existsSync(p)) ?? "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const COST = /^Find forms with AI \((about US\$\d+\.\d\d · )?at most US\$\d+\.\d\d\)$/;
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).replace(/\s+/g, " ").slice(0, 220)}` : ""}`); };

const SAVED = ["studio-finder-forms-individual-visitors-visitor-visa-live-20261027t072426546z-4d8a0d.json", "studio-finder-forms-check-individual-visitors-visitor-visa-live-20261027t072500006z-a569fb.json"];
const copies = [];
const saveFor = (key) => SAVED.forEach((f, i) => {
  const r = JSON.parse(fs.readFileSync(path.join(RUNS, f), "utf8")); r.drafting_run.inputs.combination = key;
  const name = `${i ? "studio-finder-forms-check" : "studio-finder-forms"}-c1116-live-20261101t00000000${i}z-c1116${process.pid}.json`;
  fs.writeFileSync(path.join(RUNS, name), JSON.stringify(r)); copies.push(name);
});

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 60000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector("[data-view], [data-slot='empty-state'], main h1"), null, { timeout: 30000 });
  const shot = async (name) => { await p.waitForTimeout(300); await p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`), fullPage: true }); };
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe (WCAG 2.2 AA): ${name}`, r.violations.length === 0, r.violations.map((v) => v.id).join(",")); };
  const combos = () => Number(sql("select count(*) from combination"));
  const card = (key) => p.locator(`article[data-node="${key}"]`);
  const keyOf = async (label) => ((await api("/structure?pathwayType=INDIVIDUAL")).body?.nodes ?? []).find((n) => n.label === label && !n.retiredAt)?.key ?? "";
  try {
    const served = (await api("/session")).body?.workspace?.id;
    if (!served || sql(`select count(*) from workspace where id='${served}'`) !== "1") { console.error(`STOP  ${DB} is not the database of :${PORT}`); process.exit(2); }
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    const committed = async () => (await api("/ledger")).body?.committed_usd;
    const usd0 = await committed();
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });

    // ---------------------------------------------------------------- the menu, in setup order
    await p.goto(`${BASE}/structure`); await ready();
    const menu = (await p.locator('nav[aria-label="Studio"] a').allInnerTexts()).map((t) => t.replace(/\s*\d+\s*$/, "").trim());
    const at = (w) => menu.indexOf(w);
    step("C11.16: the menu reads Program structure · Immigration programs · To review, in that order, first", at("Program structure") === 0 && at("Immigration programs") === 1 && at("To review") === 2, menu.slice(0, 4));
    step("C11.16 fail: no menu item makes a combination outside Program structure (no New combination)", !menu.some((t) => /new combination/i.test(t)), menu);

    // ---------------------------------------------------------------- names enter only on Program structure
    await p.locator("[data-add-open]").first().click(); await p.locator("[data-add-dialog]").waitFor();
    const fld = (lv) => p.locator(`[data-add-dialog] [data-field="${lv}"] input[role="combobox"]`);
    await fld("pathway").fill("Temporary residence (C11.16)"); await p.waitForTimeout(300); await fld("pathway").press("Enter");
    await fld("program").fill("Visitors"); await p.waitForTimeout(300); await fld("program").press("Enter");
    await fld("category").fill("Visitor visa"); await p.waitForTimeout(500);
    await p.locator("[data-add-submit]").click(); await p.locator("[data-add-dialog]").waitFor({ state: "detached" });
    const vvKey = await keyOf("Visitor visa");
    step("C11.16: a name typed on Program structure's Add is saved there (Visitor visa, Not started), and no combination is made yet", !!vvKey && combos() === 0, { vvKey, combos: combos() });
    const ns = (await api("/structure?pathwayType=INDIVIDUAL")).body?.nodes ?? [];
    const trKey = ns.find((n) => n.label === "Temporary residence (C11.16)")?.key, visKey = ns.find((n) => n.label === "Visitors" && String(n.key).startsWith(`${trKey}.`))?.key;
    const r1 = await api("/structure/path", { method: "POST", data: { pathwayType: "INDIVIDUAL", pathway: { key: trKey }, program: { key: visKey }, category: { label: "Transit visa" }, subCategory: null } });
    const tvKey = r1.body?.leaf?.key;
    step("setup: a second name, Transit visa, under the same Program", r1.status < 300 && !!tvKey, r1.status);
    const gone = [await api("/combinations", { method: "POST", data: { pathway: "INDIVIDUAL", label: "Made elsewhere" } }), await api("/combinations", { method: "POST", data: { nodeKey: "made_elsewhere.x.y", label: "Made elsewhere" } }), await api("/path-proposal", { method: "POST", data: { pathway: "INDIVIDUAL", description: "visitor visa" } })];
    step("C11.16 fail: no other endpoint makes a name: a combination only starts from a name already on Program structure (a label alone 400, an unknown name 404), /path-proposal is gone (404); nothing made", gone[0].status === 400 && gone[1].status === 404 && gone[2].status === 404 && combos() === 0 && !(await keyOf("Made elsewhere")), gone.map((g) => g.status));
    await p.goto(`${BASE}/new`); await p.getByText("Page not found").first().waitFor({ timeout: 15000 });
    step("C11.16 fail: there is no New combination page (/new is Page not found)", /Page not found/.test(await p.locator("main").innerText()));

    // ---------------------------------------------------------------- each combination is a card on Immigration programs
    await p.goto(`${BASE}/?pathway=INDIVIDUAL&filter=all`); await ready();
    await card(vvKey).waitFor({ timeout: 15000 });
    // The truth is Program structure's own tree (a last-level name: no child below it), not the page's feed.
    const nodes = ((await api("/structure?pathwayType=INDIVIDUAL")).body?.nodes ?? []).filter((n) => !n.retiredAt);
    const leaves = nodes.filter((n) => ["category", "subCategory", "sub_category"].includes(n.level) && !nodes.some((c) => String(c.key).startsWith(`${n.key}.`))).map((n) => n.key);
    const shown = await p.locator("article[data-node]").evaluateAll((els) => els.map((e) => e.getAttribute("data-node")));
    step("C11.16: every combination Program structure defines is a card on Immigration programs, one each", leaves.length >= 2 && leaves.includes(vvKey) && leaves.includes(tvKey) && leaves.every((k) => shown.filter((s) => s === k).length === 1), { leaves: leaves.length, cards: shown.length });
    step("C11.16: a Not started card says 0 of 5 steps and offers Start setup", (await card(tvKey).getAttribute("data-state")) === "NOT_STARTED" && /0 of 5 steps/.test(await card(tvKey).innerText()) && await card(tvKey).locator("[data-start-setup]").count() === 1);
    await shot("01-cards"); await axe("Immigration programs with two Not started cards");
    await card(tvKey).locator("h3, [data-card-title], p").first().click({ force: true });
    await p.waitForURL(/[?&]sel=/, { timeout: 5000 }).catch(() => { throw new Error("C11.16: a Not started card's click did nothing"); });
    step("C11.16 fail: clicking a Not started card (not its button) never goes to Program structure and makes nothing", new URL(p.url()).pathname === "/" && combos() === 0, p.url());

    // ---------------------------------------------------------------- Add combination: the same pop-up, in place (P-128 (5))
    step("C11.16 (P-128 (5)): Add combination is the in-place way to add on Immigration programs (one button)", await p.locator("[data-add-combination]").count() === 1);
    await p.locator("[data-add-combination]").click(); await p.locator("[data-add-dialog]").waitFor();
    const title = await p.getByRole("dialog").getByRole("heading").first().innerText();
    step("C11.16: Add combination opens the one 'Add to Program structure' pop-up here, on Immigration programs", title === "Add to Program structure" && new URL(p.url()).pathname === "/", title);
    await fld("pathway").fill("Temporary residence (C11.16)"); await p.waitForTimeout(300); await fld("pathway").press("Enter");
    await fld("program").fill("Visitors"); await p.waitForTimeout(300); await fld("program").press("Enter");
    await fld("category").fill("Super visa (C11.16)"); await p.waitForTimeout(500);
    await p.locator("[data-add-submit]").click(); await p.locator("[data-add-dialog]").waitFor({ state: "detached" });
    const svKey = await keyOf("Super visa (C11.16)");
    await card(svKey).waitFor({ timeout: 15000 }).catch(() => undefined);
    step("C11.16: the name added there is saved in Program structure and its card shows in place, Not started", !!svKey && await card(svKey).count() === 1 && combos() === 0, svKey);
    await p.goto(`${BASE}/structure`); await ready();
    step("C11.16: Program structure lists the name added from Immigration programs (one structure, one place)", (await p.locator("main").innerText()).includes("Super visa (C11.16)"));

    // ---------------------------------------------------------------- Start setup without a saved answer: the price, no run
    await p.goto(`${BASE}/?pathway=INDIVIDUAL&filter=all`); await ready();
    await card(tvKey).locator("[data-start-setup]").click();
    await p.waitForURL(/\/c\/[^/]+\/forms/, { timeout: 15000 }); await ready();
    // Batch flake (#883, run 41854761362): ready() accepts the workspace's h1, which renders before its header's Path, so
    // on a loaded runner the step below read the trail too early. Wait for what it reads: the Path with this place.
    await p.waitForFunction(() => { const n = document.querySelector('nav[aria-label="Path"]'); const m = document.querySelector("main")?.innerText ?? ""; return !!n && /Transit visa/.test(m) && /Visitors/.test(m); }, null, { timeout: 30000 });
    const tvId = p.url().match(/\/c\/([^/]+)\//)[1];
    step("C11.16: Start setup on a card opens that combination's workspace (Forms tab)", combos() === 1 && !!tvId, p.url());
    const EDIT = "input, select, textarea, [role='combobox'], [contenteditable='true']";
    const editable = await p.locator('nav[aria-label="Path"]').locator(EDIT).count() + await p.locator("main h1").first().locator("xpath=..").locator(EDIT).count() + await p.locator(`main h1[contenteditable="true"]`).count();
    const trail = await p.locator("main").innerText();
    step("C11.16: the place is shown read-only (Pathway, Program and Category in the header, no field to change them)", trail.includes("Temporary residence (C11.16)") && trail.includes("Visitors") && trail.includes("Transit visa") && await p.locator('nav[aria-label="Path"]').count() === 1 && editable === 0, { editable });
    // ...and the server holds it too (review Major 2): a rename or a move from the setup is refused, nothing changes.
    const before = sql(`select label||'|'||program_def_id from combination where id='${tvId}'`);
    const rn = await api(`/combinations/${tvId}`, { method: "PATCH", data: { label: "Renamed in setup (C11.16)" } });
    const mv = await api(`/combinations/${tvId}`, { method: "PATCH", data: { nodeKey: vvKey, programKey: vvKey } });
    step("C11.16 fail: a rename in the setup is refused in plain words (rename it on Program structure); nothing changes", rn.status === 400 && /Program structure/.test(rn.body?.detail ?? rn.body?.message ?? "") && sql(`select label||'|'||program_def_id from combination where id='${tvId}'`) === before, { status: rn.status, detail: rn.body?.detail });
    step("C11.16 fail: a move to another place from the setup is refused in plain words; nothing changes", mv.status === 400 && /Program structure/.test(mv.body?.detail ?? mv.body?.message ?? "") && sql(`select label||'|'||program_def_id from combination where id='${tvId}'`) === before, { status: mv.status, detail: mv.body?.detail });
    const locs = () => sql(`select array_to_string(allowed_locations, ',') from program_def p join combination c on c.program_def_id=p.id where c.id='${tvId}'`);
    const locsBefore = locs();
    const both = await api(`/combinations/${tvId}`, { method: "PATCH", data: { allowedLocations: ["inside_canada"], label: "Sneaky rename (C11.16)" } });
    step("C11.16 fail (review M1): a rename sent with another change is refused before anything is saved (where cases open unchanged)", both.status === 400 && locs() === locsBefore && sql(`select label||'|'||program_def_id from combination where id='${tvId}'`) === before, { status: both.status, before: locsBefore, after: locs() });
    const find = p.locator("[data-find-forms]").first();
    await find.waitFor({ timeout: 15000 });
    const findText = (await find.innerText()).trim();
    step("C11.16: with no saved answer it offers 'Find forms with AI' with its price", COST.test(findText), findText);
    const offer = (await api(`/combinations/${tvId}/start-setup`)).body;
    step("C11.16 fail: nothing ran and nothing was spent before a click (no finder run, no AI step)", offer?.run === null && sql(`select count(*) from drafting_job where combination_id='${tvId}'`) === "0" && (await committed()) === usd0, { run: offer?.run, ledger: await committed() });
    await shot("02-start-setup-offer"); await axe("workspace after Start setup, with the offer");

    // ---------------------------------------------------------------- Start setup with a saved answer: loaded by itself, US$0
    saveFor(vvKey);
    await p.goto(`${BASE}/?pathway=INDIVIDUAL&filter=all`); await ready();
    await card(vvKey).locator("[data-start-setup]").click();
    await p.waitForURL(/\/c\/[^/]+\/forms/, { timeout: 15000 }); await ready();
    const vvId = p.url().match(/\/c\/([^/]+)\//)[1];
    const st = (await api(`/combinations/${vvId}/start-setup`)).body;
    let v = null;
    for (let i = 0; st?.run && i < 120; i++) { v = (await api(`/form-finder/runs/${st.run}`)).body; if (!["QUEUED", "RUNNING"].includes(v?.status)) break; await p.waitForTimeout(500); }
    const mode = v?.mode, spent = v?.usd?.spent;
    const forms = Number(sql(`select count(*) from combination_form where combination_id='${vvId}'`));
    step("C11.16: with a saved answer, Start setup loads it by itself (replay), attaches the forms and spends US$0", mode === "replay" && spent === 0 && forms > 0 && (await committed()) === usd0, { status: v?.status, mode, forms, spent });
    await p.reload(); await ready(); await p.waitForTimeout(800);
    step("C11.16: the saved answer's forms are on the Forms tab, with no paid offer in front of them", (await p.locator("tr[data-line]").count()) > 0 && await p.locator('[data-find-forms="live"]').count() === 0 && /AI found \d+ forms?/.test(await p.locator("[data-finder]").first().innerText()), { rows: await p.locator("tr[data-line]").count(), live: await p.locator('[data-find-forms="live"]').count() });

    // ---------------------------------------------------------------- a set-up card opens its workspace
    await p.goto(`${BASE}/?pathway=INDIVIDUAL&filter=all`); await ready();
    const btn = card(vvKey).locator("[data-card-button]");
    const word = (await btn.innerText()).trim();
    step("C11.16: a set-up card's button is Resume setup or Open (no Start setup again)", /^(Resume setup|Open)$/.test(word) && await card(vvKey).locator("[data-start-setup]").count() === 0, word);
    await btn.click(); await p.waitForURL(new RegExp(`/c/${vvId}`), { timeout: 15000 });
    step("C11.16: it opens that combination's workspace, not Program structure", new URL(p.url()).pathname.startsWith(`/c/${vvId}`), p.url());
    await p.goto(`${BASE}/?pathway=INDIVIDUAL&filter=all`); await ready();
    await card(vvKey).click({ position: { x: 12, y: 12 } }); await p.waitForURL(new RegExp(`/c/${vvId}`), { timeout: 15000 }).catch(() => undefined);
    step("C11.16: clicking the set-up card itself opens its workspace too", new URL(p.url()).pathname.startsWith(`/c/${vvId}`), p.url());
    step("C11.16: the cards stay one per name after the starts (no second card for a started name)", (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.filter((r) => r.nodeKey === vvKey).length === 1);

    // ---------------------------------------------------------------- a reader cannot add names
    await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-B"); } catch { /* ignore */ } });
    const who = (await api("/session", { actor: "user-B" })).body?.actor?.role ?? "";
    await p.goto(`${BASE}/?pathway=INDIVIDUAL&filter=all`); await ready();
    const off = await p.locator("[data-add-combination]").isDisabled();
    const r2 = await api("/structure/path", { method: "POST", actor: "user-B", data: { pathwayType: "INDIVIDUAL", pathway: { label: "Temporary residence (C11.16)" }, program: { label: "Visitors" }, category: { label: "Not allowed (C11.16)" }, subCategory: null } });
    step("C11.16 fail: a person who is not an author cannot add a name (button off, server 403)", !/author/i.test(who) && off && r2.status === 403, { who, off, status: r2.status });
    step("US$0: the walk spent nothing (ledger unchanged, no live AI job)", (await committed()) === usd0 && sql("select count(*) from drafting_job where mode='LIVE'") === "0", { before: usd0, after: await committed() });
    step("no page errors", errs.length === 0, errs.slice(0, 3));
  } catch (e) { step("unexpected", false, e.message); }
  finally {
    for (const f of copies) fs.rmSync(path.join(RUNS, f), { force: true });
    await b.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
