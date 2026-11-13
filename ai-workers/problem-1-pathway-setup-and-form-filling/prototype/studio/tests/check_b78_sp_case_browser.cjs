// B78 (review M3; P-294, Lead 13, condition 4): on the configured checkpoint a case officer opens a case for the Student on
// the Study permit through the screens (BR-8 reads the one list Preview and a case show), and the client's own questionnaire
// lists the sections people named. It prints what Preview and the case each ask the Student, and fails if they differ.
// On an isolated copy. No model call, US$0. With SHOTS=<folder>, the walk's screenshots are written there (for the PR).
//   zsh studio/tools/isolated.sh b78_case 4418 start && node studio/tests/check_b78_sp_case_browser.cjs 4418 xr_studio_b78_case
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4418), DB = process.argv[3] ?? "xr_studio_b78_case", BASE = `http://localhost:${PORT}`, SHOTS = process.env.SHOTS || null;
const PSQL = fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, failed = 0;
const step = (name, c, detail) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };
  const api = async (method, pth, json, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, data: json, timeout: 1200000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (actor) => { await p.goto(BASE); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  await api("POST", "/demo/reset", { confirm: "RESET" });
  const load = await api("POST", "/demo/load", { sample: "configured" });
  step("setup: the configured checkpoint loads, row 7 done", load.status < 300 && load.body.checkpoint.find((x) => x.row === "7")?.status === "done", load.status);
  const sp = sql("select id from combination where combination_key = 'sp.outside'");

  await as("user-O"); await p.goto(`${BASE}/cases`);
  await p.getByRole("button", { name: "Open a case" }).click();
  const dialog = p.getByRole("dialog");
  const combo = dialog.getByLabel("Combination (released)");
  await combo.waitFor({ timeout: 30000 });
  const offered = await combo.locator("option").allTextContents();
  const option = offered.find((x) => /^Outside Canada/.test(x));
  step("B78 pass: the Study permit is offered to open a case (its release is startable, no \"No questions yet\")", !!option, offered);
  if (option) await combo.selectOption({ label: option });
  await dialog.getByLabel("Your own reference (optional)").fill("B78-SP-1");
  await dialog.getByLabel("Principal applicant's name").fill("Sample Student (Sample)");
  await shot("7-study-permit-open-a-case-1440");
  await dialog.getByRole("button", { name: "Open case" }).click();
  await p.waitForURL(/\/cases\/[0-9a-f-]{36}/, { timeout: 60000 });
  const id = /\/cases\/([0-9a-f-]{36})/.exec(p.url())[1];
  step("B78 pass: the case officer opens the case through the screen, on the Study permit's release", sql(`select count(*) from runtime_case c where c.id = '${id}' and c.combination_id = '${sp}'`) === "1", id);

  // One list (condition 1): what Preview shows the Student and what the case asks that person, fact by fact.
  const person = (q) => q.about === "principal" && q.status !== "hidden by a condition";
  const preview = ((await api("GET", `/combinations/${sp}/preview`)).body?.questions ?? []).filter(person).map((q) => q.fact);
  const student = ((await api("GET", `/runtime/cases/${id}`, undefined, "user-O")).body?.people ?? []).find((x) => x.role === "principal")?.subject_id;
  const sections = (await api("GET", `/runtime/cases/${id}/questionnaire?mode=agent`, undefined, "user-O")).body?.sections ?? [];
  // QA-165 (#1318): as on Preview's side, a question its condition hides now (a Yes/No question's details before a Yes) is not
  // one the case asks; the view still lists it, marked hidden.
  const inCase = new Set(sections.filter((x) => x.subjectId === student).flatMap((x) => x.questions.filter((q) => !q.hidden).map((q) => q.fact)));
  const onlyPreview = preview.filter((f) => !inCase.has(f)), onlyCase = [...inCase].filter((f) => !preview.includes(f));
  console.log(`      B78 measured: Preview asks the Student ${preview.length} questions, the case ${inCase.size}; only on Preview: ${onlyPreview.join(", ") || "none"}; only on the case: ${onlyCase.join(", ") || "none"}`);
  step("B78 pass (one list): the case asks the Student what Preview shows", preview.length > 0 && onlyPreview.length === 0 && onlyCase.length === 0, { onlyPreview, onlyCase });
  step("B78 pass: Preview lists questions for the Student", preview.length > 0, preview.length);

  await as("user-P"); await p.goto(`${BASE}/cases/${id}/questionnaire`);
  await p.getByRole("heading", { name: "Client questionnaire" }).waitFor({ timeout: 60000 });
  await p.getByRole("button", { name: /^Start/ }).waitFor({ timeout: 60000 });
  const text = await p.locator("body").innerText();
  await shot("9-study-permit-client-questionnaire-1440");
  step("B78 pass: the client's questionnaire lists a section people named, in words", /Custodianship declaration|Your full name, date of birth and application|Appointing or cancelling a representative/.test(text), text.slice(0, 200));
  step("B78 fail-guard: the client sees no placeholder or internal part name", !/Unnamed section|Table1|Page wrapper/.test(text));
  step("no page errors", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
