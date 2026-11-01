// X1 (W1 setup checklist slice C2; concept §B/§C, board v3 "Forms 5"): each setup tab of a combination says how many
// open setup items land on it (StepBadge, counted from the summary's checklist, never recounted), and a ?focus= link
// from the checklist lands on its place on Documents and Questionnaires (focused, outlined 2 s, address cleared), as it
// already does on Forms (C1). Walked in a real browser; axe (WCAG 2.2 AA) on the landed pages. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_x1 4442 start && node studio/tests/check_x1_tabs_focus_browser.cjs 4442 xr_studio_screens_x1
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { tabCounts, tabOfFocus } = require("../contracts/setup-checklist.ts");
const PORT = Number(process.argv[2] ?? 4442), DB = process.argv[3] ?? "xr_studio_screens_x1";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "F1-setup", "screenshots", "x1"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail.slice(0, 240) : JSON.stringify(detail).slice(0, 240)}` : ""}`); };

(async () => {
  // ---------------------------------------------------------------- pure rules
  step("C11.10 X1 (rule): Before forms' pages and people, and forms items, count on Forms", tabOfFocus("pages:record") === "forms" && tabOfFocus("people:card") === "forms" && tabOfFocus("forms:lines") === "forms" && tabOfFocus("people proposal") === "forms");
  step("C11.10 X1 (rule): documents and questionnaires items count on their own tabs; release counts on none", tabOfFocus("documents:lines") === "documents" && tabOfFocus("questionnaires:gaps") === "questionnaires" && tabOfFocus("release") === null);
  step("C11.10 X1 (rule, review M3): proposals take their step's tab; a Not ready step-level key takes its step's tab", tabOfFocus("review:forms") === "forms" && tabOfFocus("review:people") === "forms" && tabOfFocus("review:documents") === "documents" && tabOfFocus("review:questions") === "questionnaires" && tabOfFocus("questions_documents:problems", "documents") === "documents" && tabOfFocus("questions_documents:problems", "review") === null);
  const c = tabCounts({ steps: [{ tab: "forms", open: [{ focus: "forms:sources", count: 3 }, { focus: "review:forms", count: 1 }, { focus: "forms:problems", count: 1 }] }, { tab: "documents", open: [{ focus: "documents:lines", count: 1 }, { focus: "questions_documents:problems", count: 2 }] }, { tab: "review", open: [{ focus: "release", count: 1 }] }] });
  step("C11.10 X1 (rule, review M3): a tab counts the sum of its items' counts, as the board's 'Forms 5' = 3 found + 1 proposal + 1 problem", c.forms === 5 && c.documents === 3 && c.questionnaires === 0, c);
  step("C11.10 X1 fail (rule): no checklist counts nothing (never a guess)", JSON.stringify(tabCounts(null)) === JSON.stringify({ forms: 0, documents: 0, questionnaires: 0 }));

  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  if (!(await api("/demo/status")).body?.loaded) step("setup: the sample loads", (await api("/demo/load", { method: "POST" })).status === 201);
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const landed = async (key) => {
    await p.locator(`[data-focus="${key}"][data-focused]`).waitFor({ timeout: 10000 });
    return p.evaluate((k) => { const el = document.querySelector(`[data-focus="${k}"]`); return { outlined: !!el?.hasAttribute("data-focused"), focused: !!el && (el === document.activeElement || el.contains(document.activeElement)), focusInUrl: new URLSearchParams(location.search).has("focus") }; }, key);
  };

  // ---------------------------------------------------------------- badges on the tabs (Super visa: forms and documents open)
  const sv = sql("select id from combination where combination_key='sv.super_visa'");
  const sum = (await api(`/combinations/${sv}/summary`)).body;
  const want = tabCounts(sum.setup);
  await p.goto(`${BASE}/c/${sv}/overview`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  await p.locator("[data-step-badge]").first().waitFor({ timeout: 10000 });
  const badge = async (label) => { const t = p.getByRole("tab", { name: new RegExp(`^${label}`) }); return { n: Number(await t.locator("[data-step-badge]").getAttribute("data-step-badge").catch(() => "0") ?? 0), name: await t.innerText() }; };
  const bf = await badge("Forms"), bd = await badge("Documents"), bq = await badge("Questionnaires");
  step("C11.10 X1 pass: the Forms tab shows the number of open setup items that land on it", want.forms > 0 && bf.n === want.forms, { want, got: bf });
  step("C11.10 X1 pass: the Documents tab shows its number", want.documents > 0 && bd.n === want.documents, { want, got: bd });
  step("C11.10 X1 fail: a tab with nothing open shows no badge", want.questionnaires === 0 && bq.n === 0, { want, got: bq });
  step("C11.10 X1: the badge is read as words by a screen reader", /setup items? open/.test(await p.getByRole("tab", { name: /^Forms/ }).locator(".sr-only").innerText()));
  await p.screenshot({ path: path.join(SHOTS, "01-tab-badges-1440.png"), clip: { x: 0, y: 0, width: 1440, height: 520 } });

  // ---------------------------------------------------------------- Documents: the checklist's own link lands
  const docItem = sum.setup.steps.flatMap((s) => s.open).find((i) => i.focus === "documents:lines");
  step("setup: Super visa's checklist has a documents item", !!docItem, sum.setup.steps.map((s) => s.open.map((i) => i.focus)));
  await p.goto(`${BASE}/c/${sv}/documents?focus=documents%3Alines`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  let l = await landed("documents:lines");
  step("C11.10 X1 pass: ?focus=documents:lines lands on the Documents tab's checklist: focused, outlined, the address cleared", l.outlined && l.focused && !l.focusInUrl, l);
  await p.screenshot({ path: path.join(SHOTS, "02-documents-landed-1440.png") });
  await axe("Documents, landed");
  await p.waitForTimeout(2300);
  step("C11.10 X1: the outline goes after 2 s", await p.locator('[data-focus="documents:lines"][data-focused]').count() === 0);

  const wp = sql("select id from combination where combination_key='wp.family'");
  // Review M1, M2: a document line's condition naming a field that does not exist is a Documents problem; "Fix 1 problem"
  // lands on the notice that lists it (never on a chip showing 0), and the Not ready key lands there too.
  step("C11.10 X1 fail (setup): no documents problems notice while there is nothing to fix", await (async () => { await p.goto(`${BASE}/c/${wp}/documents`); await p.locator("[data-documents]").waitFor(); return (await p.locator("[data-part-problems]").count()) === 0; })());
  const line = sql(`select lineage_key from document_requirement where combination_id='${wp}' and status <> 'RETIRED' order by lineage_key limit 1`);
  sql(`update document_requirement set attach_mode='ANSWER_CONDITIONAL', predicate_json='{"subjectKind":"PRINCIPAL","op":"eq","field":"person.no_such_fact_x1","value":true}', condition_plain='Has a fact that does not exist' where combination_id='${wp}' and lineage_key='${line}' and status <> 'RETIRED'`);
  // The written line bypasses the server's per-workspace checklist cache: restart this copy (same database) so it reads it.
  execFileSync("zsh", [path.join(__dirname, "..", "tools", "isolated.sh"), DB.replace(/^xr_studio_/, ""), String(PORT), "restart"], { stdio: "ignore" });
  const sum2 = (await api(`/combinations/${wp}/summary`)).body;
  const docProblems = sum2.setup.steps.flatMap((x) => x.open).filter((i) => i.focus === "documents:problems");
  step("setup: the broken condition is one documents problem on the checklist", docProblems.length === 1, sum2.setup.steps.flatMap((x) => x.open).map((i) => `${i.focus}:${i.count}`));
  await p.goto(`${BASE}/c/${wp}/documents?focus=documents%3Aproblems`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  l = await landed("documents:problems");
  const notice = await p.locator('[data-part-problems="documents"]').innerText();
  step("C11.10 X1 pass (review M2): 'Fix 1 problem' lands on the notice that lists the documents problem: focused, outlined, the address cleared", l.outlined && l.focused && !l.focusInUrl && /1 problem to fix in the documents/.test(notice) && /does not exist|no_such_fact_x1|Condition/i.test(notice), { l, notice: notice.slice(0, 160) });
  const bd2 = await badge("Documents");
  step("C11.10 X1 pass (review M3): the Documents badge counts it", bd2.n === tabCounts(sum2.setup).documents && bd2.n >= 1, { want: tabCounts(sum2.setup), got: bd2 });
  await p.screenshot({ path: path.join(SHOTS, "04-documents-problems-landed-1440.png") });
  await p.goto(`${BASE}/c/${wp}/documents?focus=questions_documents%3Aproblems`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  await p.locator('[data-focus-also~="questions_documents:problems"][data-focused]').waitFor({ timeout: 10000 });
  step("C11.10 X1 pass (review M1): a Not ready item's questions_documents:problems lands on the same notice and the address is cleared", !new URLSearchParams(new URL(p.url()).search).has("focus"));
  sql(`update document_requirement set attach_mode='COMBINATION_MANDATORY', predicate_json=null, condition_plain=null where combination_id='${wp}' and lineage_key='${line}' and status <> 'RETIRED'`);
  execFileSync("zsh", [path.join(__dirname, "..", "tools", "isolated.sh"), DB.replace(/^xr_studio_/, ""), String(PORT), "restart"], { stdio: "ignore" });

  // ---------------------------------------------------------------- Questionnaires
  for (const key of ["questionnaires:gaps"]) {
    await p.goto(`${BASE}/c/${wp}/questionnaires?focus=${encodeURIComponent(key)}`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
    l = await landed(key);
    step(`X1 pass: ?focus=${key} lands on the Questionnaires tab: focused, outlined, the address cleared`, l.outlined && l.focused && !l.focusInUrl, l);
  }
  await p.screenshot({ path: path.join(SHOTS, "03-questionnaires-landed-1440.png") });
  await axe("Questionnaires, landed");

  await p.goto(`${BASE}/c/${wp}/questionnaires?focus=questionnaires%3Aproblems`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  await p.locator("[data-questions]").waitFor(); await p.waitForTimeout(500);
  step("C11.10 X1 fail (review M2): with no question problems, questionnaires:problems outlines nothing (never a chip showing 0)", await p.locator("[data-focused]").count() === 0 && await p.locator('[data-part-problems="questions"]').count() === 0);

  // Review M1 (second pass): a problem only in the released version (draft clean). The checklist's own link must lead to
  // the Questionnaires notice that says the released version has it and what is left to do.
  const relId = sql(`select id from config_release where combination_id='${wp}' order by version desc limit 1`);
  const relWhen = sql(`select coalesce((snapshot->'rules'->0->'when')::text, '') from config_release where id='${relId}'`);
  step("setup: the released version has a rule to break", !!relId && relWhen !== "");
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{rules,0,when}', '{"subjectKind":"PRINCIPAL","op":"eq","field":"person.no_such_fact_x1r","value":true}') where id='${relId}'`);
  execFileSync("zsh", [path.join(__dirname, "..", "tools", "isolated.sh"), DB.replace(/^xr_studio_/, ""), String(PORT), "restart"], { stdio: "ignore" });
  const sum3 = (await api(`/combinations/${wp}/summary`)).body;
  const href = sum3.setup?.next?.href ?? "";
  step("C11.10 X1 pass: a Not ready rule problem's link goes to Questionnaires, not Documents", /\/questionnaires\?focus=questionnaires%3Aproblems/.test(href) && sum3.setup.next.item.fromRelease === true, href);
  await p.goto(`${BASE}${href}`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  l = await landed("questionnaires:problems");
  const relNotice = await p.locator('[data-part-problems="questions"]').innerText();
  step("C11.10 X1 pass: it lands on the notice saying the released version has the problem and the draft is clean (release it)", l.outlined && l.focused && !l.focusInUrl && (await p.locator("[data-from-release]").count()) === 1 && /released version has 1 problem/.test(relNotice), { l, relNotice: relNotice.slice(0, 160) });
  const bq2 = await badge("Questionnaires"), bd3 = await badge("Documents");
  step("C11.10 X1 pass: the Questionnaires badge counts it; Documents does not", bq2.n >= 1 && bq2.n === tabCounts(sum3.setup).questionnaires && bd3.n === tabCounts(sum3.setup).documents, { want: tabCounts(sum3.setup), q: bq2.n, d: bd3.n });
  await p.screenshot({ path: path.join(SHOTS, "05-not-ready-release-only-1440.png") });
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{rules,0,when}', $q$${relWhen}$q$::jsonb) where id='${relId}'`);
  step("setup: the released version is put back as it was", sql(`select (snapshot->'rules'->0->'when')::text from config_release where id='${relId}'`) === relWhen);
  execFileSync("zsh", [path.join(__dirname, "..", "tools", "isolated.sh"), DB.replace(/^xr_studio_/, ""), String(PORT), "restart"], { stdio: "ignore" });

  // ---------------------------------------------------------------- fail: a focus that names nothing
  await p.goto(`${BASE}/c/${wp}/documents?focus=documents%3Anothing`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  await p.locator("[data-documents]").waitFor();
  await p.waitForTimeout(500);
  step("C11.10 X1 fail: a focus that names nothing on the page outlines nothing and breaks nothing", await p.locator("[data-focused]").count() === 0 && errs.length === 0);

  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
