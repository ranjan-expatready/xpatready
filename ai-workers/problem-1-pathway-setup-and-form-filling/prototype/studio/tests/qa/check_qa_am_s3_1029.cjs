// qa after-merge S3 Start setup (main f7cb40d9, PR #76), 29 Oct: what the builder's own suites do not try. C11.15, C11.10,
// C11.3, C2.1. API probes (wrong role, nobody, client, a name that is not last-level, an unknown name, two starts at once)
// then the browser as the author at 1440 and 1024 px (card → Start setup → Forms tab with one offer, /new is Page not
// found, keyboard, axe) and the three DV-bb fixes that rode with it (DV-bb-1, DV-bb-6b, DV-bb-6c). No AI: the offer is read,
// never clicked. Isolated copy only, US$0.
//   zsh studio/tools/isolated.sh qa_s3 4477 start && node studio/tests/qa/check_qa_am_s3_1029.cjs 4477 xr_studio_qa_s3
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4477), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_qa_s3";
const SHOTS = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-10-29-after-merge-s3"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 280)}` : ""}`); };
const api = async (p, { method = "GET", actor = "user-A", data } = {}) => {
  const h = { "content-type": "application/json" }; if (actor) h["x-actor"] = actor;
  const r = await fetch(`${BASE}/api${p}`, { method, headers: h, body: data === undefined ? undefined : JSON.stringify(data) });
  const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b };
};
const COST = /^Find forms with AI \((about US\$\d+\.\d\d · )?at most US\$\d+\.\d\d\)$/;
const TECH = /\b(P|D)-\d+\b|nodeKey|undefined|null\b|\[object/;

(async () => {
  const served = (await api("/session")).body?.workspace?.id;
  if (!served || sql(`select count(*) from workspace where id='${served}'`) !== "1") { console.error(`STOP  ${DB} is not the database of :${PORT}`); process.exit(2); }
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  let r = await api("/structure/path", { method: "POST", data: { pathwayType: "INDIVIDUAL", pathway: { label: "Temporary residence (qa S3)" }, program: { label: "Workers (qa)" }, category: { label: "Open work permit (qa)" }, subCategory: null, allowedLocations: ["inside_canada"] } });
  const prog = r.body.created?.find((c) => c.level === "program")?.key, owp = r.body.leaf?.key, owpLabel = "Open work permit (qa)";
  r = await api("/structure/path", { method: "POST", data: { pathwayType: "INDIVIDUAL", pathway: { key: r.body.created?.find((c) => c.level === "pathway")?.key }, program: { key: prog }, category: { label: "Employer work permit (qa)" }, subCategory: null } });
  const ewp = r.body.leaf?.key;
  step("setup: two Not started names on Program structure, no combination yet", !!owp && !!ewp && sql("select count(*) from combination") === "0", { owp, ewp });

  // ------------------------------------------------------------------ API: who, what, and twice at once
  const combos = () => Number(sql("select count(*) from combination"));
  r = await api("/combinations/start", { method: "POST", actor: null, data: { nodeKey: owp } });
  step("C11.15 nobody: Start setup without a person is 401", r.status === 401, r.status);
  r = await api("/combinations/start", { method: "POST", actor: "user-P", data: { nodeKey: owp } });
  step("C11.15 client: a client cannot start setup (403, plain words)", r.status === 403 && !!r.body?.detail && !TECH.test(r.body.detail), `${r.status} ${r.body?.detail}`);
  r = await api("/combinations/start", { method: "POST", actor: "user-O", data: { nodeKey: owp } });
  step("C11.15 officer: an officer cannot start setup (403)", r.status === 403, `${r.status} ${r.body?.detail}`);
  r = await api("/combinations/start", { method: "POST", data: { nodeKey: prog } });
  step("C11.15 fail: a program that has categories is not a last-level name; Start setup refuses it in plain words, nothing created", r.status >= 400 && r.status < 500 && combos() === 0 && !TECH.test(String(r.body?.detail ?? "")), `${r.status} ${r.body?.detail}`);
  r = await api("/combinations/start", { method: "POST", data: { nodeKey: "INDIVIDUAL/no-such-name" } });
  step("C11.15 fail: an unknown name is refused (404 or 400), nothing created", [400, 404].includes(r.status) && combos() === 0, `${r.status} ${r.body?.detail}`);
  r = await api("/combinations/start", { method: "POST", data: { nodeKey: 42 } });
  step("C11.15 fail: a name that is not text is 400, in plain words", r.status === 400 && /Choose a category or sub-category/.test(JSON.stringify(r.body)), r.body?.detail);
  r = await api("/combinations/start", { method: "POST", data: { nodeKey: "x".repeat(5000) } });
  step("C11.15 fail: a very long name is refused, not a server error", r.status >= 400 && r.status < 500, r.status);
  const two = await Promise.all([1, 2].map(() => api("/combinations/start", { method: "POST", data: { nodeKey: owp } })));
  const ids = new Set(two.map((x) => x.body?.combination?.id));
  step("C11.15 two at once: two Start setup requests at the same moment make one combination (one 201, one 200)", ids.size === 1 && combos() === 1 && two.map((x) => x.status).sort().join() === "200,201", two.map((x) => `${x.status} ${x.body?.detail ?? x.body?.combination?.id}`));
  const owpId = [...ids][0];
  r = await api(`/combinations/${owpId}/start-setup`, { actor: null });
  step("C11.15 nobody: the landing's offer is not read without a person (401, QA-53 rule)", r.status === 401, r.status);
  r = await api(`/combinations/${owpId}/start-setup`, { actor: "user-P" });
  step("C11.15 client: a client cannot read the offer or its cost (403)", r.status === 403, r.status);
  r = await api("/combinations/00000000-0000-0000-0000-000000000000/start-setup");
  step("C11.15 fail: the offer of an unknown combination is 404 in plain words, not a server error", r.status === 404 && !!r.body?.detail, `${r.status} ${r.body?.detail ?? JSON.stringify(r.body).slice(0, 120)}`);
  const offer = (await api(`/combinations/${owpId}/start-setup`)).body;
  step("C11.15 cost line: the one offer reads 'Find forms with AI (about US$… · at most US$…)' or, with no usual cost yet, the ceiling only", offer?.offer?.mode === "live" ? COST.test(offer.offer.label) : offer?.offer?.mode === "rules", offer?.offer?.label);
  step("C11.15: nothing ran and nothing was spent by Start setup (no run, no ledger line)", offer?.run === null && sql(`select count(*) from drafting_job where combination_id='${owpId}'`) === "0", offer?.run);
  step("C2.1 audit: the start is in the audit trail with the author", Number(sql(`select count(*) from audit_event where actor='user-A' and at > now() - interval '5 minutes'`)) > 0);

  // ------------------------------------------------------------------ DV-bb-6b: reset counts roles someone added
  const ws = (await api("/session")).body.workspace.id;
  sql(`insert into person_role (id, workspace_id, role_key, label, meaning, takes_part_in_case, may_be_applicant, basis, built_in, display_order) values (gen_random_uuid(), '${ws}', 'qa-grandparent', 'Grandparent (qa)', 'Sample', true, false, 'Sample', false, 99)`);
  const st = (await api("/demo/status")).body?.scope;
  step("DV-bb-6b: the reset preview counts the person role someone added, and names the 6 built-in ones apart", st?.rows?.["Person roles added here"] === 1 && st?.built_in_rows === 6, { added: st?.rows?.["Person roles added here"], builtIn: st?.built_in_rows });
  const rs = (await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } })).body;
  step("DV-bb-6b: after reset the added role is gone and only the 6 built-in roles stay; 0 rows remain", rs?.remaining_rows === 0 && rs?.remaining_built_in === 6 && sql(`select count(*) from person_role where role_key='qa-grandparent'`) === "0", { remaining: rs?.remaining_rows, builtIn: rs?.remaining_built_in });

  // ------------------------------------------------------------------ browser, as the author
  r = await api("/structure/path", { method: "POST", data: { pathwayType: "INDIVIDUAL", pathway: { label: "Temporary residence (qa S3)" }, program: { label: "Workers (qa)" }, category: { label: owpLabel }, subCategory: null, allowedLocations: ["inside_canada"] } });
  const tr2 = r.body.created?.find((c) => c.level === "pathway")?.key, prog2 = r.body.created?.find((c) => c.level === "program")?.key;
  await api("/structure/path", { method: "POST", data: { pathwayType: "INDIVIDUAL", pathway: { key: tr2 }, program: { key: prog2 }, category: { label: "Employer work permit (qa)" }, subCategory: null } });
  const NAME = { 1440: owpLabel, 1024: "Employer work permit (qa)" };
  const b = await chromium.launch();
  for (const w of [1440, 1024]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, extraHTTPHeaders: { "x-actor": "user-A" } });
    await ctx.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} });
    const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(`${BASE}/new`); await p.waitForLoadState("networkidle");
    step(`C11.15 M2 (${w}): /new shows Page not found with a way back`, await p.getByText("Page not found").isVisible() && await p.getByRole("link", { name: "Back to Immigration programs" }).isVisible());
    await p.goto(`${BASE}/?pathway=INDIVIDUAL&filter=all`); await p.waitForLoadState("networkidle");
    const btn = p.locator(`[data-start-setup][aria-label="Start setup: ${NAME[w]}"]`).first();
    const n0 = combos();
    const vis = await btn.isVisible().catch(() => false);
    step(`C11.10 (${w}): the Not started card offers Start setup, not greyed`, vis && (await btn.getAttribute("aria-disabled")) === null);
    if (!vis) { await p.screenshot({ path: path.join(SHOTS, `card-missing-${w}.png`), fullPage: true }); await ctx.close(); continue; }
    if (w === 1024) { await btn.focus(); await p.keyboard.press("Enter"); } else await btn.dblclick();
    await p.waitForURL(/\/c\/[0-9a-f-]+\/forms/, { timeout: 15000 }).catch(() => {});
    step(`C11.15 (${w}): ${w === 1024 ? "Enter on the focused button" : "a double click"} starts one setup and lands on the Forms tab`, /\/c\/[0-9a-f-]+\/forms/.test(p.url()) && combos() === n0 + 1, `${p.url().replace(BASE, "")} ${n0}→${combos()}`);
    await p.locator("[data-finder-start]").first().waitFor({ timeout: 10000 }).catch(() => {});
    const offers = await p.locator("[data-find-forms]").count();
    const label = offers ? (await p.locator("[data-find-forms]").first().innerText()).trim() : "";
    step(`C11.15 (${w}): the Forms tab shows one offer to find the forms, with the cost in the one wording`, offers === 1 && (COST.test(label) || /Find form numbers by rules \(free\)/.test(label)), `${offers}: ${label}`);
    const main = await p.locator("main").innerText();
    step(`C11.15 (${w}): no decision number or raw value on the landing`, !TECH.test(main), (main.match(TECH) ?? [])[0]);
    step(`C11.15 (${w}): nothing ran on landing (no run until the click)`, sql(`select count(*) from drafting_job where combination_id = '${(/\/c\/([0-9a-f-]+)\//.exec(p.url()) ?? [])[1]}'`) === "0");
    const ax = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    step(`C11.15 axe (${w}): the landing is clean`, ax.violations.length === 0, ax.violations.map((v) => v.id));
    await p.screenshot({ path: path.join(SHOTS, `landing-${w}.png`), fullPage: true });
    await p.goBack(); await p.waitForLoadState("networkidle");
    step(`C11.15 (${w}): Back returns to Immigration programs; the card now says Set up / opens the setup, not Start setup`, !/\/c\//.test(p.url()) && !(await p.locator(`[data-start-setup][aria-label="Start setup: ${NAME[w]}"]`).count()), p.url().replace(BASE, ""));
    // QA-70: a sidebar link reached by Tab shows where the focus is (WCAG 2.4.7); the app sets :focus-visible { outline: none }
    await p.locator("nav a", { hasText: "Program structure" }).first().focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab");
    const ring = await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { ok: cs.boxShadow !== "none" || cs.outlineStyle !== "none", what: `${a?.tagName} ${a?.textContent?.trim().slice(0, 30)}` }; });
    step(`QA-70 (${w}): a sidebar link focused by the keyboard shows a focus ring`, ring.ok, ring.what);
    // DV-bb-6c: the Program structure footer
    await p.goto(`${BASE}/structure`); await p.waitForLoadState("networkidle");
    const foot = await p.locator("main").innerText();
    step(`DV-bb-6c (${w}): Program structure shows no "(P-95)" or other decision number`, !/\(P-\d+\)|\bP-95\b/.test(foot), (foot.match(/P-\d+/) ?? [])[0]);
    step(`C11.15 (${w}): no page error`, errs.length === 0, errs);
    await ctx.close();
  }
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
