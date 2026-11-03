// QA-172 (screens; C4.1, C11.12: the author's Smart questionnaire (SQR) tab): no raw key and no field meaning as a label.
// On the released Visitor visa with IMM 5476 added, its "Name of firm or organization" question sits in the library
// section `intended_work`, which this combination has not chosen: the section shows the library's title ("Intended work
// in Canada"), never its key. A fact answered without a question (person.has_children, worked out from the child records)
// shows its short name ("Has children"), as an unwritten question does (QA-82), never its meaning. Each with its failing
// case, walked in a real browser at 1440 and 1024, axe (WCAG 2.2 AA). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_qa172 4445 start && node studio/tests/check_qa172_plain_titles_browser.cjs 4445 xr_studio_screens_qa172
const path = require("node:path"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4445), DB = process.argv[3] ?? "xr_studio_screens_qa172";
const BASE = `http://localhost:${PORT}`;
const STUDIO = path.resolve(__dirname, "..");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  if (PORT === 4400) { console.error("refused: never the shared demo on :4400"); process.exit(2); }
  // Setup: the released Visitor visa (the shared runtime setup), then IMM 5476 added from the library.
  execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 900000 });
  const vv = sql("select id from combination where combination_key = 'vv.single'");
  const title = sql("select title from logical_section where section_key = 'intended_work' order by version desc limit 1");
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const added = await api(`/combinations/${vv}/forms`, { method: "POST", data: { formKey: "IMM 5476" } });
  step("setup: the Visitor visa is released and IMM 5476 is added; the library titles intended_work", !!vv && added.status < 300 && !!title && title !== "intended_work", JSON.stringify({ status: added.status, title }));

  // The API view the page reads: no section is titled with its own key.
  const view = (await api(`/combinations/${vv}/workspace?tab=questionnaires`)).body?.questionnaire;
  const raw = (view?.sections ?? []).filter((s) => s.title === s.id);
  step("QA-172 fail case: no section of the author's questionnaire is titled with its key (intended_work, a section the combination has not chosen)", (view?.sections ?? []).some((s) => s.id === "intended_work") && raw.length === 0, JSON.stringify(raw.map((s) => s.id)));

  // The page, as the author.
  await p.goto(BASE); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  await p.goto(`${BASE}/c/${vv}/questionnaires`);
  const sec = p.locator('[data-section="intended_work"]');
  await sec.waitFor({ timeout: 30000 });
  const head = (await sec.locator(".font-medium").first().innerText()).trim();
  step("QA-172 pass: the section reads the library's title, never its key", head === title && !/intended_work/.test(await sec.innerText()), JSON.stringify({ head, title }));
  const unasked = p.locator('[data-section="unasked"] [data-fact="person.has_children"]');
  await unasked.waitFor({ timeout: 30000 });
  const label = (await unasked.locator("td button").first().innerText()).trim();
  step("QA-172 pass: a fact answered without a question shows its short name (as an unwritten question, QA-82)", label === "Has children", label);
  step("QA-172 fail case: it never shows the field's meaning as its label", !/derived from|Whether the person/i.test(label), label);
  // Review m2: its Details drawer is titled the same way, with the meaning below as "Meaning:".
  await unasked.locator("td button").first().click();
  const meaningLine = p.locator("[data-fact-meaning]").first();
  await meaningLine.waitFor({ timeout: 15000 });
  const drawer = p.getByRole("dialog").last();
  const drawerTitle = (await drawer.getByRole("heading").first().innerText()).trim();
  const drawerText = drawerTitle;
  step("QA-172 (review m2) pass: the Details drawer of an unasked fact is titled with its short name and shows its meaning as \"Meaning:\"", drawerText === "Has children" && /Meaning: Whether the person has any children/.test(await meaningLine.innerText()), JSON.stringify({ title: drawerTitle, meaning: (await meaningLine.innerText()).slice(0, 80) }));
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  const a = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  step("axe: the Smart questionnaire tab has no WCAG A/AA violation", a.violations.length === 0, a.violations.map((v) => `${v.id} (${v.nodes.length})`).join(" | "));
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(300);
  step("1024 px: the tab has no sideways page scroll, and the section still reads its title", !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) && (await sec.locator(".font-medium").first().innerText()).trim() === title);
  // Review m1 (Devin on #722): a retired section whose placed question is still asked keeps its library title. The
  // approved retire's effect is written to the section's newest row (the two-person approval is C11.9's, tested there).
  sql(`update logical_section set status = 'RETIRED' where section_key = 'intended_work' and version = (select max(version) from logical_section where section_key = 'intended_work')`);
  const after = (await api(`/combinations/${vv}/workspace?tab=questionnaires`)).body?.questionnaire;
  const iw = (after?.sections ?? []).find((s) => s.id === "intended_work");
  step("QA-172 (review m1) fail case: a retired section that still asks a question keeps its title, never its key", !!iw && iw.title === title, JSON.stringify(iw ? { id: iw.id, title: iw.title } : null));
  step("no page error", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  QA-172 the check itself stopped:", e); process.exit(1); });
