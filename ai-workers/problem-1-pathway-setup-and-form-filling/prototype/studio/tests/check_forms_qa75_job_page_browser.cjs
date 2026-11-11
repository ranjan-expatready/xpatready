// QA-75 (forms; C2.x AI field-map job page, PRODUCT §4 plain words): a job page opened from AI work (/c/:id/jobs/:id)
// in a real browser. A step that waits for a person reads "Waiting for you" with the step to take (never NEEDS_PERSON), the
// heading names the form (or says no form is linked, never a bare "Form:"), the basis line is plain words, the page
// promises "the comparison below" only when proposals are shown, and the trail reads "<combination> › Forms". A rules
// step (read_form) is not called an AI field map; a running or queued step shows no step code and a rules step is never
// "the AI" (break M1); links follow the job's own combination, not the address (break m1). axe (WCAG 2.2 AA) on the page. US$0, no model call (rows are inserted).
//   zsh studio/tools/isolated.sh forms_qa75 4465 start && node studio/tests/check_forms_qa75_job_page_browser.cjs 4465 xr_studio_forms_qa75
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4465), DB = process.argv[3] ?? "xr_studio_forms_qa75";
const BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, failed = 0;
const step = (name, c, detail) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const CODE = /\b[A-Z]{2,}_[A-Z_]{2,}\b/; // a status or system code on screen (NEEDS_PERSON, IN_REVIEW …)

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.json }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await api("/demo/reset", { method: "POST", json: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST", json: {} })).status === 201);
  const [att, combo, edition] = sql("select a.id, a.combination_id, a.edition from source_attachment a where a.edition like 'IMM %' order by a.edition limit 1").split("|");
  const label = sql(`select label from combination where id = '${combo}'`);
  const ins = (attId, mode, msg, kind = "field_map", status = "NEEDS_PERSON", detail = null) => sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, message, detail, started_by, finished_at) select gen_random_uuid(), workspace_id, id, ${attId ? `'${attId}'` : "null"}, '${kind}', '${mode}', '${status}', '${msg}', ${detail ? `'${JSON.stringify(detail)}'` : "null"}, 'user-A', now() from combination where id = '${combo}' returning id`).split("\n")[0];
  const withForm = ins(att, "REPLAY", "Rules could not match this form to its field list: choose the edition on the Forms tab.");
  const noForm = ins(null, "REPLAY", "The saved AI answer is for another edition: draft the field map again.");
  const readForm = sql(`select id from drafting_job where kind = 'read_form' and attachment_id = '${att}' limit 1`) || sql("select id from drafting_job where kind = 'read_form' limit 1");
  const readCombo = sql(`select combination_id from drafting_job where id = '${readForm}'`);
  const open = async (c, j) => { await p.goto(`${BASE}/c/${c}/jobs/${j}`); await p.locator("h1").first().waitFor({ timeout: 20000 }); await p.waitForTimeout(300); return p.locator("main").innerText(); };

  const t1 = await open(combo, withForm);
  const h1 = await p.locator("h1").first().innerText();
  step("QA-75 fail: no status or system code on the page (NEEDS_PERSON)", !CODE.test(t1), t1.match(CODE)?.[0]);
  step("QA-75 pass: a step waiting for a person reads \"Waiting for you\" with the step to take", /Waiting for you/.test(t1) && t1.includes("choose the edition on the Forms tab"), t1.slice(0, 400));
  step("QA-75 pass: the heading names the form", h1.includes(edition) && /AI-proposed field map/.test(h1), h1);
  step("QA-75 fail: no internal words in the basis line (prototype-only exception, provider route)", !/prototype-only|provider route|AI-processing rule/i.test(t1), t1.match(/[^.]*(prototype-only|provider route)[^.]*/i)?.[0]);
  step("QA-75 fail: no \"comparison … below\" when no proposal is shown", !/below/.test(t1), t1.match(/[^.]*below[^.]*/)?.[0]);
  // BK-3: the job's trail is on the frame's one "where am I" line, named Path like every page's.
  const trail = p.getByRole("navigation", { name: "Path" });
  const crumbs = await trail.getByRole("link").evaluateAll((as) => as.map((a) => [a.textContent.trim(), a.getAttribute("href")]));
  step("QA-75 pass: the trail reads \"<combination> › Forms\", Forms opening the Forms tab", crumbs.length >= 2 && crumbs[0][0] === label && crumbs[1][0] === "Forms" && crumbs[1][1] === `/c/${combo}/forms`, crumbs);
  step("QA-75 fail: the trail never says \"Sources and forms\"", !/Sources and forms/.test(t1));
  const axe = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("QA-75 pass: axe finds no WCAG 2.2 AA violation on the page", axe.violations.length === 0, axe.violations.map((v) => v.id));

  const t2 = await open(combo, noForm);
  const h2 = await p.locator("h1").first().innerText();
  step("QA-75 fail: with no form linked the heading is never a bare \"Form:\" and says so in words", !/^\s*Form:/.test(h2) && /No form is linked/.test(t2), h2);
  step("QA-75 fail: no status code on the page without a form", !CODE.test(t2), t2.match(CODE)?.[0]);

  const t3 = await open(readCombo, readForm);
  const h3 = await p.locator("h1").first().innerText();
  step("QA-75 fail: a rules step that read the form is not called an AI field map", !/AI-proposed field map/.test(h3) && /Rules read the form/.test(h3) && !/The AI saw/.test(t3), h3);
  step("QA-75 fail: the mode chip of a rules step says what ran, not \"On this computer\"", !/On this computer/.test(t3) && /Rules only, no AI/.test(t3));
  step("QA-75 pass: the rules step's status is in words", /Completed/.test(t3) && !CODE.test(t3), t3.slice(0, 300));
  // Break M1: a running rules step and a queued AI step, each with step codes in its detail.
  const steps = { steps: [{ step: "pdf_inventory", exit: 0 }, { step: "xfa_extract", exit: 2 }] };
  const running = ins(att, "LOCAL", "Running", "read_form", "RUNNING", steps);
  const t4 = await open(combo, running);
  step("QA-75 fail (break M1): a running rules step shows no step code or exit number", !/exit \d|pdf_inventory|xfa_extract/.test(t4) && !CODE.test(t4), t4.match(/[^\n]*exit[^\n]*/)?.[0]);
  step("QA-75 fail (break M1): a running rules step is never \"the AI is drafting\"", !/The AI is drafting/.test(t4) && /The rules are working/.test(t4), t4.slice(0, 300));
  const queued = ins(att, "REPLAY", "Queued", "field_map", "QUEUED", { steps: [{ step: "stub pass", exit: 0 }] });
  const t5 = await open(combo, queued);
  step("QA-75 fail (break M1): a queued step says it waits to start, with no running spinner or step code", /Waiting to start/.test(t5) && !/stub pass|exit \d/.test(t5) && (await p.getByRole("status", { name: "Running" }).count()) === 0, t5.slice(0, 300));
  const waiting = ins(att, "LOCAL", "Waits for the step before it", "read_form", "WAITING");
  const t6 = await open(combo, waiting);
  step("QA-75 pass (break m6): a waiting step shows why it waits", /Waits for the step before it/.test(t6) && /Waiting/.test(t6));
  // Break m1: the job opened under another combination's address still links to its own.
  const other = sql(`select id from combination where id <> '${combo}' order by label limit 1`);
  await open(other, withForm);
  const crumbs2 = await p.getByRole("navigation", { name: "Path" }).getByRole("link").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  step("QA-75 fail (break m1): the trail follows the job's combination, not the address", crumbs2[0] === `/c/${combo}` && crumbs2[1] === `/c/${combo}/forms`, crumbs2);
  await p.setViewportSize({ width: 400, height: 900 }); await open(combo, withForm);
  step("QA-75 pass: no sideways scroll at 400 px", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  step("no page error", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
