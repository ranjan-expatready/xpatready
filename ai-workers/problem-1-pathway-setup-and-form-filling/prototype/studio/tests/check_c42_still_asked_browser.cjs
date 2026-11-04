// C4.2 (screens; P-294 (B), P-91, P-76): a section taken out of a combination's questionnaire still asks what its forms
// need (forms pull their questions), and every screen says so in words: the Smart questionnaire (SQR) tab shows
// "Still asked: <forms> need(s) these answers." on that section, and its title is the library's plain name, never its key
// ("personal_details"), on the tab and in Preview (client and agent view). A chosen section has no such line. On the
// suites' fixture (Work permit family, `wp.family`), walked in a real browser at 1440 px with screenshots, axe (WCAG 2.2
// AA). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c42 4445 start && node studio/tests/check_c42_still_asked_browser.cjs 4445 xr_studio_screens_c42 [screenshot dir]
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4445), DB = process.argv[3] ?? "xr_studio_screens_c42", SHOTS = process.argv[4] ?? "";
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };
const SEC = "personal_details";

(async () => {
  if (PORT === 4400) { console.error("refused: never the shared demo on :4400"); process.exit(2); }
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  if (!(await api("/demo/status")).body?.loaded) await api("/demo/load", { method: "POST", data: {} });
  const wp = sql("select id from combination where combination_key = 'wp.family'");
  const title = sql(`select title from logical_section where section_key = '${SEC}' order by version desc limit 1`);
  const shot = async (name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name), fullPage: false }); };

  // Before: the section is chosen, so it has no "Still asked" line.
  await p.goto(BASE); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  await p.goto(`${BASE}/c/${wp}/questionnaires`);
  const sec = p.locator(`[data-section="${SEC}"]`);
  await sec.waitFor({ timeout: 30000 });
  step("C4.2 pass: a chosen section has no \"Still asked\" line", (await sec.locator("[data-still-asked]").count()) === 0);
  await sec.scrollIntoViewIfNeeded(); await shot("1-before-chosen-1440.png");

  // Taken out (the combination's section choice; the API the screen's removal calls).
  const out = await api(`/combinations/${wp}/sections/${SEC}`, { method: "DELETE" });
  const view = (await api(`/combinations/${wp}/workspace?tab=questionnaires&role=principal`)).body?.questionnaire;
  const v = (view?.sections ?? []).find((s) => s.id === SEC);
  step("setup: Personal details is taken out of the work permit's questionnaire", out.status < 300 && !!title && title !== SEC, JSON.stringify({ status: out.status, title }));
  step("C4.2 pass (P-294 (B)): its questions are still asked, because forms need them, and the view names those forms", !!v && v.questions.length > 0 && (v.stillAsked?.forms ?? []).length > 0 && v.stillAsked.forms.every((f) => v.questions.some((q) => q.neededBy.includes(f))), JSON.stringify(v ? { questions: v.questions.length, stillAsked: v.stillAsked } : null));
  step("C4.2 fail case: no chosen section carries \"Still asked\"", (view?.sections ?? []).filter((s) => s.id !== SEC).every((s) => !s.stillAsked || !sql(`select 1 from sqr_section_selection where combination_id='${wp}' and section_key='${s.id}' limit 1`)));

  await p.reload();
  await sec.waitFor({ timeout: 30000 });
  const line = sec.locator("[data-still-asked]");
  await line.waitFor({ timeout: 15000 });
  const said = (await line.innerText()).trim();
  const forms = v?.stillAsked?.forms ?? [];
  step("C4.2 pass: the tab says in words that the section is still asked and which forms need it", /^Still asked: .+ needs? these answers\./.test(said) && forms.every((f) => said.includes(f)), said);
  const head = (await sec.locator(".font-medium").first().innerText()).trim();
  step("P-91 pass: the section taken out keeps its plain name on the tab, never its key", head === title && !(await sec.innerText()).includes(SEC), JSON.stringify({ head, title }));
  await sec.scrollIntoViewIfNeeded(); await shot("2-taken-out-still-asked-1440.png");
  await sec.locator("button[aria-expanded]").first().click();
  await sec.locator("table").first().waitFor({ timeout: 15000 });
  await shot("3-taken-out-open-1440.png");
  const a = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  step("axe: the Smart questionnaire tab has no WCAG A/AA violation", a.violations.length === 0, a.violations.map((x) => `${x.id} (${x.nodes.length})`).join(" | "));
  step("1440 px: no sideways page scroll", !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));

  // Preview (client and agent view) read the same section by its title (render.ts, the release's section_titles).
  const prev = (await api(`/combinations/${wp}/workspace?tab=preview`)).body;
  const titles = [...new Set((JSON.stringify(prev).match(/"section_title":"[^"]*"/g) ?? []))];
  step("P-91 fail case: Preview never titles a section with its key (personal_details)", titles.includes(`"section_title":"${title}"`) && !titles.includes(`"section_title":"${SEC}"`), titles.join(" "));
  await p.goto(`${BASE}/c/${wp}/preview`);
  const named = p.getByText(title, { exact: true }).first();
  await named.waitFor({ timeout: 30000 }); await named.scrollIntoViewIfNeeded();
  step("P-91 pass: Preview shows \"Personal details\", never personal_details", !(await p.locator("main").innerText()).includes(SEC));
  await shot("4-preview-title-1440.png");

  // Put back: the line goes.
  await api(`/combinations/${wp}/sections/${SEC}`, { method: "POST", data: { sectionOrder: 1 } });
  const back = (await api(`/combinations/${wp}/workspace?tab=questionnaires&role=principal`)).body?.questionnaire;
  step("C4.2 pass: added back, the section is chosen again and has no \"Still asked\"", !((back?.sections ?? []).find((s) => s.id === SEC)?.stillAsked), JSON.stringify((back?.sections ?? []).find((s) => s.id === SEC)?.stillAsked ?? null));
  step("no page error", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C4.2 the check itself stopped:", e); process.exit(1); });
