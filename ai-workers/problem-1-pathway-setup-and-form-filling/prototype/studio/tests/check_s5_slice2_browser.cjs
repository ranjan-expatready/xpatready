// S5 Combination workspace slice 2 and the slice 1 early-look fixes (Lead note 27 Oct 23:05) walked in a real browser like
// a person: Forms lists each form once with its reading status in its row and the sources in one line (fix 1); filing
// warnings in business words (fix 2); Questionnaires per person with question wording, who fills it, the forms that need
// it and a side panel that alone shows the field code (fix 3), a coverage gap blocking release; Preview with one section
// open and a jump list (fix 4). Screenshots at 1440 and 1024 px into
// product/screens/W1-combination-workspace/screenshots/slice2/, axe (WCAG 2.2 AA) on each state. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_s5e 4435 start && node studio/tests/check_s5_slice2_browser.cjs 4435 xr_studio_runtime_s5e
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_s5e";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-combination-workspace", "screenshots", "slice2"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const CODE = /\b(case|person|relationship|organisation)\.[a-z_]+\b/;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const panel = () => p.getByRole("tabpanel");
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const served = (await api("/session")).body.workspace.id;
  const leaves = []; const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x.kind === "combination" && x.combinationId) leaves.push(x); Object.values(x).forEach(walk); } };
  walk((await api("/catalogue")).body);
  const C = leaves.find((l) => l.status === "READY").combinationId;
  const VV = leaves.find((l) => l.label === "Visitor visa").combinationId;
  const go = async (id, tab, qs = "") => { await p.goto(`${BASE}/c/${id}/${tab}${qs}`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await settle(); };

  // ======================================================== fix 1 and fix 2: Forms
  await go(C, "forms");
  const text = await panel().innerText();
  step("fix 1: each form appears once (no second list of the same forms)", text.split("IMM 5409 (01-2023)").length === 2 && await p.locator("[data-reading]").count() === 0, text.split("IMM 5409 (01-2023)").length - 1);
  step("fix 1: the row shows its reading status and last step; the sources are one compact line", /In the library/.test(await p.locator('[data-line="IMM 5409"]').innerText()) && await p.locator("[data-sources]").count() === 1);
  const warnings = await p.getByRole("list", { name: "Filing problems" }).innerText().catch(() => "");
  step("fix 2: the list warning says what it means and where it is set, with a real example (never \"no purpose yet\", never an empty or technical example)", /rows of its lists \(for example "[A-Z][^"]+"\) do not say yet what the list holds/.test(warnings) && !/no purpose yet|for example \)|for example "[A-Z_0-9]+\[/.test(warnings), warnings.split("\n")[0]);
  await state("forms-listed-once");
  await p.getByRole("button", { name: "Change IMM 5409" }).click();
  const drawer = p.getByRole("dialog");
  step("fix 1: the form's side panel holds its reading and matching steps and its file", /Reading and matching/.test(await drawer.innerText()) && await drawer.locator("[data-reading-steps]").count() === 1);
  await state("forms-drawer-reading");
  await drawer.getByRole("button", { name: "Cancel" }).click();
  await go(VV, "forms");
  step("fix 1: forms attached but not set up yet are their own rows with their next step (Read form or Draft with AI)", await p.locator("[data-pending]").count() >= 1 && (await p.getByRole("button", { name: /Read form|Draft with AI|Add from library/ }).count()) >= 1, await p.locator("[data-pending]").count());
  await state("forms-attached-not-set-up");

  // ======================================================== fix 3 and slice 2: Questionnaires per person
  await go(C, "questionnaires");
  const q = p.locator("[data-questions]");
  step("one section open at first; the others fold (the page stays short)", await p.locator("[data-section] [aria-expanded=true]").count() === 1 && await p.locator("[data-section]").count() > 5);
  await state("questionnaires-per-person");
  await q.getByRole("button", { name: "Open all sections" }).click(); await settle();
  const qText = await q.innerText();
  step("fix 3: the questions show their wording; no field code and no \"(uses the field meaning)\" on the main path", (await p.locator("[data-question]").count()) > 20 && !CODE.test(qText) && !/uses the field meaning/.test(qText), (qText.match(CODE) ?? [""])[0]);
  step("C4.1: one chip per person with a question count; who fills each question and the forms that need it are shown", await p.locator("[data-role-chip]").count() === 4 && /Client|Case officer/.test(qText) && /IMM \d{4}/.test(qText));
  step("coverage: the person's line says how many answers the forms need and who gives them (none asked of nobody on the sample)", /the forms need \d+ answers about this person · \d+ asked of the client · \d+ filled by the case officer/.test(await p.locator("[data-coverage]").innerText()) && !/asked of nobody/.test(await p.locator("[data-coverage]").innerText()));
  await p.locator("[data-question]").first().getByRole("button", { name: /^Details of/ }).click();
  const det = p.getByRole("dialog");
  step("fix 3: the field code shows only in the question's side panel, as its System name", /System name/.test(await det.innerText()) && CODE.test(await det.locator("[data-question-details]").innerText()));
  await state("question-details");
  await det.getByRole("button", { name: "Close" }).first().click();
  await p.locator('[data-role-chip="spouse_or_partner"]').click(); await settle();
  await p.waitForFunction(() => /Spouse or partner:/.test(document.querySelector("[data-coverage]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  step("C4.1: choosing the spouse shows the spouse's questions (the address keeps the person)", /role=spouse_or_partner/.test(p.url()) && /Spouse or partner:/.test(await p.locator("[data-coverage]").innerText()));
  // A needed answer asked of nobody: the gap shows on the chip and the page, and release waits (BR-11).
  const fact = (await api(`/combinations/${C}/workspace?tab=questionnaires`)).body.questionnaire.sections.flatMap((s) => s.questions).find((x) => x.neededBy.length && x.filledBy === "CLIENT").fact;
  const before = sql(`select string_agg(id || '=' || status, ',' order by id) from section_question where canonical_field_key='${fact}' and workspace_id='${served}'`);
  sql(`update section_question set status='RETIRED' where canonical_field_key='${fact}' and workspace_id='${served}'`);
  await go(C, "questionnaires");
  step("BR-11 fail: an answer the forms need but nobody is asked shows on the person's chip and in a notice that release waits", /not asked/.test(await p.locator("[data-role-chip]").first().innerText()) && /needed but asked of nobody: release waits/.test(await q.innerText()) && !CODE.test(await p.locator("[data-gaps]").innerText()));
  await state("questionnaires-coverage-gap");
  for (const pair of before.split(",")) { const [qid, st] = pair.split("="); sql(`update section_question set status='${st}' where id='${qid}'`); }
  await go(C, "questionnaires");
  step("BR-11 pass: asked again, the gap is gone", !/asked of nobody/.test(await p.locator("[data-coverage]").innerText()));

  // ======================================================== fix 4: Preview, one section at a time
  await go(C, "preview", "?family=family2&person=principal");
  const jumps = await p.locator("[data-section-jump] button").count();
  step("fix 4: Preview opens one section with a jump list of every section (the phone column stays short); three columns kept", jumps > 3 && await p.locator("[data-preview-section]").count() === 1 && /Documents \(\d+\)/.test(await panel().innerText()) && /Forms \(\d+\)/.test(await panel().innerText()), `${jumps} sections`);
  const h0 = await p.locator("[data-preview-questions]").evaluate((e) => Math.round(e.getBoundingClientRect().height));
  await p.locator("[data-section-jump] button").nth(2).click(); await p.waitForTimeout(200);
  step("fix 4: the jump list opens another section (Section 3 of N); Next section moves on", /Section 3 of \d+/.test(await p.locator("[data-preview-section]").innerText()), h0);
  await p.getByRole("button", { name: "Next section" }).click();
  step("fix 4: Next section opens the fourth", /Section 4 of \d+/.test(await p.locator("[data-preview-section]").innerText()));
  step("fix 4: the phone column is about one screen long (under 1,800 px), not twelve", h0 < 1800, `${h0} px`);
  await state("preview-one-section");

  step("no page errors in the walk", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
