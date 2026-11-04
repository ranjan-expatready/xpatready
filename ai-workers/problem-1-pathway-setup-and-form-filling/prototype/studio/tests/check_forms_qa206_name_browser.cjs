// QA-206 (C3.4, C4.1; P-158, PRODUCT §4) in a browser at 1440 px: after the C3.4 rules pass (no AI, US$0), To review ›
// Proposals shows IMM 5257's sections under the headings printed on the form ("Personal details", "Details of visit to
// Canada"), never the PDF's part names ("Page wrapper", "Nat id"); an IMM 5475 part with no printed heading says it must
// be named, its Accept stays off until a person types a name, and it then lands under that name. axe (WCAG 2.2 AA) on
// the panel; no page errors. With SHOTS=<folder>, the walk's screenshots are written there (for the PR). On an isolated
// copy with the six loaded (Demo load).
//   zsh studio/tools/isolated.sh forms_qa206b 4436 start && node studio/tests/check_forms_qa206_name_browser.cjs 4436 xr_studio_forms_qa206b
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_forms_qa206b", BASE = `http://localhost:${PORT}`, SHOTS = process.env.SHOTS || null;
const PSQL = fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, failed = 0;
const step = (name, c, detail) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const PART_NAMES = /^(Page wrapper|Nat id|Us card|Contacts row2|Background info2?|Consent1|Five|Seven|App details|Table1)$/i;

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };
  const api = async (pth, json) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: json }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await api("/demo/reset", { confirm: "RESET" });
  step("setup: the six load", (await api("/demo/load", { sample: "six" })).status === 201);
  const groups = {};
  for (const [file, form] of [["imm5257e", "IMM 5257"], ["imm5475e", "IMM 5475"]]) {
    const att = sql(`select a.id from source_attachment a join combination c on c.id = a.combination_id where c.combination_key = 'vv.single' and lower(a.file_name) like '%${file}.pdf' order by a.created_at limit 1`);
    const r = await api(`/attachments/${att}/draft-masters`, { mode: "rules" });
    groups[form] = r.body?.group;
    step(`setup: ${form}'s rules pass drafts its sections and answer lists (201, US$0)`, r.status === 201 && String(groups[form]).startsWith(`edition:${form} (`), r.body?.group);
  }
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });

  // IMM 5257: the sections carry the form's printed headings.
  await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent(groups["IMM 5257"])}`);
  const rowOf = (title) => p.locator("tr", { has: p.getByText(title, { exact: true }) });
  await rowOf("Details of visit to Canada").first().waitFor({ timeout: 30000 });
  const sectionRows = p.locator("tr", { has: p.getByText("Section", { exact: true }) });
  const titles = (await sectionRows.allInnerTexts()).map((t) => t.split("\t").map((x) => x.trim()).filter(Boolean)[0]);
  step("QA-206 pass: To review shows IMM 5257's sections under their printed headings", ["Personal details", "Contact information", "Details of visit to Canada", "Education", "Employment", "Background information"].every((t) => titles.includes(t)), titles);
  step("QA-206 fail: no IMM 5257 section on To review carries a PDF part name (Page wrapper, Nat id, Us card …)", titles.length > 0 && titles.every((t) => !PART_NAMES.test(t)), titles);
  step("QA-206 pass: a row says which printed heading its boxes sit under", /under the printed heading "DETAILS OF VISIT TO CANADA"/.test(await rowOf("Details of visit to Canada").first().innerText()));
  await rowOf("Details of visit to Canada").first().scrollIntoViewIfNeeded();
  await shot("1-imm5257-sections-printed-headings-1440");

  // IMM 5475: one part has a printed heading; the others must be named before Accept.
  await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent(groups["IMM 5475"])}`);
  await rowOf("Your declaration").first().waitFor({ timeout: 30000 });
  const unnamed = p.locator("tr", { has: p.getByText(/^Unnamed section \d of IMM 5475$/) });
  step("QA-206 pass: IMM 5475's part \"Seven\" shows as \"Your declaration\"; the two parts with no printed heading say so", (await unnamed.count()) === 2 && (await p.getByText(/^(Five|Seven)$/).count()) === 0 && /No printed heading was found above these boxes/.test(await unnamed.first().innerText()));
  await shot("2-imm5475-unnamed-say-so-1440");
  await unnamed.first().getByRole("button", { name: /^Open / }).click();
  const panel = p.getByRole("dialog");
  const accept = panel.getByRole("button", { name: "Accept with this name" });
  await accept.waitFor({ timeout: 20000 });
  step("QA-206 fail: Accept of an unnamed section stays off, and says why", await accept.isDisabled() && /Accept stays off until you give the section a name/.test(await panel.innerText()));
  const axe = await new AxeBuilder({ page: p }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("QA-206 pass: axe finds no WCAG 2.2 AA violation in the panel", axe.violations.length === 0, axe.violations.map((v) => v.id));
  await shot("3-imm5475-accept-off-until-named-1440");
  const name = panel.getByLabel(/Section name/);
  await name.fill("Unnamed section 1 of IMM 5475");
  step("QA-206 fail: the placeholder name, or another \"Unnamed section\" name, keeps Accept off", await accept.isDisabled());
  const w0 = Number(sql("select count(*) from library_change where status = 'WAITING' and kind = 'section'"));
  await name.fill("Applicant and application details");
  step("QA-206 pass: once a name is typed, Accept is on", await accept.isEnabled());
  await shot("4-imm5475-named-1440");
  await accept.click();
  await p.getByText(/Decided\. It landed as/).first().waitFor({ timeout: 20000 });
  step("QA-206 pass: it lands under the typed name, waiting for a second person", sql("select count(*) from logical_section where title = 'Applicant and application details' and status = 'DRAFT'") === "1" && Number(sql("select count(*) from library_change where status = 'WAITING' and kind = 'section'")) === w0 + 1);
  step("no page errors", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
