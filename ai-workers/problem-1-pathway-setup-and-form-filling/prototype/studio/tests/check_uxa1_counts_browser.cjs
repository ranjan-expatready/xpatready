// UX-A part 1 (P-273; UX baseline 2 Nov finding 1; contracts/counts.ts): one definition and one fixed label per count,
// walked in a real browser on the demo sample (the state the UX walk saw). Visitor visa and LMIA show the same forms count
// on the setup strip, the Overview tile, the Forms tab's header and filing line; the same question count on the Overview
// (tile and strip) as the sum of the Questionnaires chips, and each chip as the Preview's person chip; the same form facts
// per person on Questionnaires and in the Draft questions and documents dialog; tab badges say what they count ("to do",
// "to fix"). Fail cases: a form attached but not set up is said apart ("· 0 set up"), a form removed in the draft leaves
// every count at once (server and Forms tab), a tab with nothing open has no number. 1440, 1024 and 400 px without
// sideways scroll; axe (WCAG 2.2 AA) on each tab. Screenshots in product/screens/UX-A/screenshots/ (uxa1-*). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_uxa1 4443 start && node studio/tests/check_uxa1_counts_browser.cjs 4443 xr_studio_screens_uxa1
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4443), DB = process.argv[3] ?? "xr_studio_screens_uxa1";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "UX-A", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  UX-A1: ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };
const formsWords = (c) => c.setUp >= c.total ? `${c.total} form${c.total === 1 ? "" : "s"}` : `${c.total} form${c.total === 1 ? "" : "s"} · ${c.setUp} set up`;

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  // The demo sample, fresh (the UX walk's state: Visitor visa with two forms attached, LMIA released).
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the demo sample loads", (await api("/demo/load", { method: "POST", data: {} })).status < 300);
  const vv = sql("select id from combination where combination_key='vv.single'"), lm = sql("select id from combination where combination_key='wp.family'");
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const main = () => p.locator("main").innerText();
  const tabs = () => p.getByRole("tablist", { name: "Combination" });
  const open = async (id, tab) => { await p.goto(`${BASE}/c/${id}/${tab}`); await tabs().waitFor(); };

  const forms = async (id, label) => {
    const sum = (await api(`/combinations/${id}/summary`)).body;
    const want = formsWords({ total: sum.setup.counts.forms, setUp: sum.setup.counts.formsSetUp });
    step(`${label}: the summary counts each form once (the Programs card's list)`, sum.setup.counts.forms === sum.row.forms.length, { counts: sum.setup.counts.forms, card: sum.row.forms.length });
    await open(id, "overview"); await p.locator("[data-step-row=forms] [data-step-summary]").waitFor();
    const strip = (await p.locator("[data-step-row=forms] [data-step-summary]").innerText()).trim();
    await p.waitForFunction(() => !/…/.test(document.querySelector("[data-overview] .grid")?.textContent ?? "…"), null, { timeout: 15000 });
    const tile = await p.locator("[data-overview] .grid > div").first().innerText();
    step(`${label}: the setup strip says the forms in the one count's words`, strip.startsWith(want), { strip, want });
    step(`${label}: the Overview's Forms tile shows the same number`, new RegExp(`^Forms\\s+${sum.setup.counts.forms}\\b`).test(tile) && (sum.setup.counts.formsSetUp < sum.setup.counts.forms ? tile.includes(`${sum.setup.counts.formsSetUp} set up`) : !/set up/.test(tile)), tile);
    await axe(`${label} Overview`);
    await open(id, "forms"); await p.locator("[data-filing]").waitFor();
    await p.waitForFunction(() => !/counting forms…/.test(document.querySelector("[data-filing]")?.textContent ?? ""), null, { timeout: 15000 });
    const filing = await p.locator("[data-filing]").innerText();
    step(`${label}: the Forms tab's filing line says the same forms`, filing.includes(`· ${want} ·`), { filing, want });
    const head = await main();
    step(`${label}: no screen calls a setup-items count "forms" (no "attached, N set up", no bare tab number)`, !/forms? attached, \d+ set up/.test(head) && (await tabs().getByRole("tab").allInnerTexts()).every((t) => !/\d\s*$/.test(t.trim())), (await tabs().getByRole("tab").allInnerTexts()).join(" | "));
    await axe(`${label} Forms`);
    // Review M1: the release check's words follow the same definition: never "no forms" while forms are on it.
    await open(id, "review"); await p.getByText(/Validation of the draft|Changes in the draft/).first().waitFor({ timeout: 15000 });
    const rel = await main();
    step(`${label}: Review and release never says "no forms" while forms are on the combination`, sum.setup.counts.forms === 0 || !/has no forms|no forms and/.test(rel), rel.match(/Nothing to release yet[^\n]*/)?.[0] ?? "(no empty-release line)");
    if (sum.setup.counts.formsSetUp === 0 && sum.setup.counts.forms > 0) step(`${label} fail case: with forms attached and none set up, the release check says none is set up`, /no form is set up on this combination/.test(rel), rel.match(/Nothing to release yet[^\n]*/)?.[0]);
    return { sum, want };
  };

  // ------------------------------------------------------------------ forms: Visitor visa (attached, not set up) and LMIA
  const v1 = await forms(vv, "Visitor visa");
  step("Visitor visa pass: two forms attached and none set up read \"2 forms · 0 set up\" everywhere (before: 4, 2 and 0)", v1.want === "2 forms · 0 set up", v1.want);
  await p.screenshot({ path: path.join(SHOTS, "uxa1-01-visitor-forms-1440.png"), fullPage: false });
  const l1 = await forms(lm, "LMIA");
  // C11.11 (QA-101): six forms; the checklists IMM 5488 and IMM 5905 are its sources, not forms it files (before: 8).
  step("LMIA pass: all forms set up read \"6 forms\" on the strip, the tile and the Forms tab (before: badge 4, Overview 8)", l1.want === "6 forms", l1.want);

  // ------------------------------------------------------------------ tab badges say what they count
  await open(vv, "overview"); await p.locator("[data-step-badge]").first().waitFor();
  const names = await tabs().getByRole("tab").evaluateAll((els) => els.map((e) => ({ name: e.getAttribute("aria-label"), text: e.textContent.trim(), tip: e.getAttribute("title"), desc: e.getAttribute("aria-describedby") ? document.getElementById(e.getAttribute("aria-describedby"))?.textContent ?? null : null, n: Number(e.querySelector("[data-step-badge]")?.getAttribute("data-step-badge") ?? 0) })));
  const badged = names.filter((x) => x.n);
  step("badges pass: every badge's text says \"to do\" or \"to fix\", the tab's name is its text, and the tip says it in full", badged.length > 0 && badged.every((x) => /\d+ to (do|fix)$/.test(x.text) && x.name === x.text && /(setup items? open on|problems? to fix before release)/.test(x.tip ?? "")), names);
  step("badges pass (review m1): each tip names the steps its items belong to, and is the tab's description for keyboard and screen readers", badged.filter((x) => /to do/.test(x.text)).every((x) => /\((Official pages|Who can be in this application|Forms|Questions and documents)[^)]*\)/.test(x.tip ?? "") && x.desc === x.tip), badged);
  step("badges fail: a tab with nothing open has no number and no tip", names.filter((x) => !x.n).every((x) => !/\d/.test(x.text) && !x.tip), names.filter((x) => !x.n));
  await p.screenshot({ path: path.join(SHOTS, "uxa1-02-tab-badges-1440.png"), clip: { x: 0, y: 0, width: 1440, height: 520 } });

  // ------------------------------------------------------------------ questions: Overview = sum of the chips; chip = Preview
  const questions = async (id, label) => {
    const sum = (await api(`/combinations/${id}/summary`)).body;
    const q = (await api(`/combinations/${id}/workspace?tab=questionnaires`)).body.questionnaire;
    const chips = q.roles.reduce((n, r) => n + r.questions, 0);
    step(`${label}: the summary's question count is the sum of the Questionnaires chips`, sum.row.counts.questions === chips && sum.setup.counts.questions === chips, { row: sum.row.counts.questions, setup: sum.setup.counts.questions, chips });
    await open(id, "overview"); await p.locator("[data-questions-sub]").waitFor();
    const strip = (await p.locator("[data-step-row=questions_documents] [data-step-summary]").innerText()).trim();
    const tile = await p.locator("[data-overview] .grid > div").nth(1).innerText();
    step(`${label}: the setup strip and the Questions tile say the same total`, strip.endsWith(`${chips} question${chips === 1 ? "" : "s"}`) && new RegExp(`^Questions\\s+${chips}\\b`).test(tile), { strip, tile, chips });
    step(`${label}: the tile names what the total is the sum of, person by person`, q.roles.every((r) => tile.includes(`${r.label} ${r.questions}`)), tile);
    await open(id, "questionnaires"); await p.locator("[data-role-chip]").first().waitFor();
    const chipTexts = await p.locator("[data-role-chip]").allInnerTexts();
    step(`${label}: each chip shows the summary's per-person count`, sum.row.counts.questionsByRole.every((r) => chipTexts.some((t) => t.startsWith(`${r.label} · ${r.questions} question`))), { chipTexts, byRole: sum.row.counts.questionsByRole });
    await axe(`${label} Questionnaires`);
    return { sum, q, chips };
  };
  const lq = await questions(lm, "LMIA");
  await p.screenshot({ path: path.join(SHOTS, "uxa1-03-lmia-questionnaires-1440.png"), fullPage: false });
  await open(lm, "overview"); await p.locator("[data-questions-sub]").waitFor();
  await p.screenshot({ path: path.join(SHOTS, "uxa1-04-lmia-overview-1440.png"), fullPage: true });

  // Preview: the principal's chip there is the same count as on Questionnaires; "asked" says it is part of it.
  await open(lm, "preview"); await p.locator("[data-person-chip]").first().waitFor({ timeout: 20000 });
  const pv = await p.locator("[data-person-chip]").first().innerText();
  const principal = lq.q.roles.find((r) => r.role === "principal");
  step("LMIA pass: the Preview's principal chip has the Questionnaires chip's number", pv.startsWith(`${principal.label} · ${principal.questions} question`), { pv, principal });
  const askedHead = await p.locator("#pv-q").innerText();
  step("LMIA pass: the Preview's \"asked\" count says what it is part of (\"83 of 143 questions\")", new RegExp(`· \\d+ of ${principal.questions} questions$`).test(askedHead.trim()), askedHead);
  await axe("LMIA Preview");

  // ------------------------------------------------------------------ form facts: Questionnaires line = dialog, per person
  await open(lm, "questionnaires"); await p.locator("[data-coverage]").waitFor();
  await p.waitForFunction(() => /form facts?/.test(document.querySelector("[data-coverage]")?.textContent ?? ""), null, { timeout: 15000 });
  const cov = await p.locator("[data-coverage]").innerText();
  const fsv = (await api(`/combinations/${lm}/fact-sources`)).body;
  const app = fsv.facts.filter((f) => f.role === "case").length, mineP = fsv.facts.filter((f) => f.role === "principal").length + app;
  step("facts pass: the principal's line counts the application's facts with them and says so", cov.includes(`${mineP} form facts (${app} of them once for the application)`), { cov, mineP, app });
  const strip = await p.locator("[data-source-strip]").innerText();
  // QA-174 (qa, 2 Nov): the strip's total is for all people, the line under the chips for one person: the strip says so.
  step("facts fail case (QA-174): the strip names its total's scope \"Form facts, all people\" (before: \"Form facts\" beside one person's \"120 form facts\")", /\bForm facts, all people\b/.test(strip) && !/Full form facts/.test(strip) && strip.includes(String(fsv.counts.facts)), strip);
  await p.locator("[data-qd-draft]").click();
  const dlg = p.getByRole("dialog");
  await dlg.locator("[data-qd-facts]").waitFor({ timeout: 20000 }).catch(() => undefined);
  if (await dlg.locator("[data-qd-facts]").count()) {
    const said = await dlg.locator("[data-qd-facts]").innerText();
    step("facts pass: the dialog gives the principal the same number as the Questionnaires line, and the strip's total", said.includes(`Principal applicant ${mineP} (${app} of them once for the application)`) && said.startsWith(`${fsv.counts.facts} form facts:`), { said, mineP, total: fsv.counts.facts });
    step("facts fail: the application is never its own person in the dialog when a principal applicant files", !/The application \d+/.test(said), said);
    await p.screenshot({ path: path.join(SHOTS, "uxa1-05-lmia-draft-dialog-1440.png"), fullPage: false });
  } else step("facts: the dialog shows the facts line (Saved mode, US$0)", false, await dlg.innerText());
  await p.keyboard.press("Escape");

  // ------------------------------------------------------------------ widths: 1024 and 400, no sideways scroll, badges whole
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h });
    for (const [id, tab, name] of [[vv, "overview", "visitor-overview"], [vv, "forms", "visitor-forms"], [lm, "questionnaires", "lmia-questionnaires"]]) {
      await open(id, tab); await p.waitForTimeout(800);
      const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const wrap = await p.locator("[data-step-badge]").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height > 24).length);
      step(`${w} px ${name}: no sideways page scroll, every badge on one line`, side <= 0 && wrap === 0, { side, wrap });
      await p.screenshot({ path: path.join(SHOTS, `uxa1-06-${name}-${w}.png`), fullPage: false });
    }
  }
  await p.setViewportSize({ width: 1440, height: 900 });

  // ------------------------------------------------------------------ fail cases: removal and a section moved
  const before = (await api(`/combinations/${lm}/summary`)).body.setup.counts;
  const code = sql(`select lineage_key from combination_form where combination_id='${lm}' and status <> 'RETIRED' and status <> 'SUPERSEDED' order by lineage_key limit 1`);
  const rm = await api(`/combinations/${lm}/forms/${encodeURIComponent(code)}`, { method: "DELETE", data: {} });
  step(`setup: ${code} is removed from LMIA's draft`, rm.status < 300, rm.status);
  const after = (await api(`/combinations/${lm}/summary`)).body.setup.counts;
  await open(lm, "forms"); await p.locator("[data-filing]").waitFor();
  await p.waitForFunction(() => !/counting forms…/.test(document.querySelector("[data-filing]")?.textContent ?? ""), null, { timeout: 15000 });
  const filing2 = await p.locator("[data-filing]").innerText();
  step("removal fail case: a form removed in the draft leaves the count (never counted as attached and waiting), on the server and the Forms tab alike", after.forms === before.forms - 1 && after.formsSetUp === before.formsSetUp - 1 && filing2.includes(`· ${formsWords({ total: after.forms, setUp: after.formsSetUp })} ·`), { before, after, filing2 });
  // Undo puts it back: every count returns together.
  await api(`/combinations/${lm}/forms`, { method: "POST", data: { formKey: code } });
  const back = (await api(`/combinations/${lm}/summary`)).body.setup.counts;
  step("removal: adding it back returns every forms count together", back.forms === before.forms && back.formsSetUp === before.formsSetUp, { before, back });

  // Break 1: a role allowed with no spouse (a single parent) keeps its chip and its count, as the form facts count it.
  const people = (await api(`/combinations/${lm}/workspace?tab=forms`)).body.people;
  const lines = people.lines.map((l) => ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.applies, filing: l.filing ?? null }));
  const single = lines.map((l) => (l.role === "spouse_or_partner" ? { ...l, min: 0, max: 0 } : l));
  const sp = await api(`/combinations/${lm}/people`, { method: "PATCH", data: { participants: single, version: people.version, confirmRemove: true } });
  step("setup (break 1): LMIA allows children but no spouse", sp.status < 300, sp.status);
  const q1 = (await api(`/combinations/${lm}/workspace?tab=questionnaires`)).body.questionnaire;
  const s1 = (await api(`/combinations/${lm}/summary`)).body;
  const plan = (await api(`/combinations/${lm}/draft-qd/plan`, { method: "POST", data: { mode: "replay" } })).body;
  const factRoles = (plan?.facts?.roles ?? []).filter((r) => r.role !== "case" && r.facts > 0).map((r) => r.role);
  step("break 1 fail case: every person role the form facts count has a Questionnaires chip, and the Overview total is the chips' sum", factRoles.length > 0 && factRoles.every((r) => q1.roles.some((x) => x.role === r && x.questions > 0)) && s1.row.counts.questions === q1.roles.reduce((n, r) => n + r.questions, 0), { factRoles, chips: q1.roles.map((r) => `${r.role}:${r.questions}`), total: s1.row.counts.questions });
  const now = (await api(`/combinations/${lm}/workspace?tab=forms`)).body.people;
  await api(`/combinations/${lm}/people`, { method: "PATCH", data: { participants: lines, version: now.version } });

  const errBefore = errs.length;
  step("no page error or console error on the walk", errBefore === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
