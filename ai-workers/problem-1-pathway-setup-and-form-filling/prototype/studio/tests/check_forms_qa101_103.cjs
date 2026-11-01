// F2 C11.15 / C11.11 (forms lane; QA-101, QA-102, QA-103 from the 29 Oct live find on Study permit): on the loaded demo's
// Study permit, a find whose two AI rounds (the stand-in launcher) both name IMM 5483 (a Document Checklist), IMM 1294 (a
// form not in the library) and IMM 5707 (already attached by a person; the rounds disagree on it).
// * QA-101 (P-118, P-156): the checklist is downloaded into the library as a checklist and is never a filed line.
// * QA-102 (P-123): a form already on the combination is not offered again ("Add to this combination").
// * QA-103 (PRODUCT §4): the line the finder downloaded and attached says its file is in the library and the next step,
//   never "Not attached".
// Axe (WCAG 2.2 AA) on the Forms tab. US$0: the AI is tests/fixtures/fake-launch.mjs (honoured only in an isolated copy);
// canada.ca is the recorded copies; nothing calls a model or canada.ca.
//   zsh studio/tools/isolated.sh forms_qa101 4462 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_forms_qa101_103.cjs 4462 xr_studio_forms_qa101
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4462), DB = process.argv[3] ?? "xr_studio_forms_qa101";
const BASE = `http://localhost:${PORT}`;
const VAR = path.join(__dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`); // the copy's own folder, whatever its name (run-suites prefixes it)
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, pth, body, actor = "user-A") => {
  const r = await fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const finish = async (id) => {
  let r;
  for (let i = 0; i < 180; i++) { r = await call("GET", `/form-finder/runs/${id}`); if (!["QUEUED", "RUNNING"].includes(r.body?.status)) return r.body; await sleep(500); }
  throw new Error(`the find did not end in 90 s: ${JSON.stringify(r?.body?.steps).slice(0, 300)}`);
};
const find = async (combo, mode, key) => {
  const plan = (await call("POST", `/combinations/${combo}/forms/find/plan`, { mode })).body;
  const run = await call("POST", `/combinations/${combo}/forms/find`, { mode, planSha256: plan.plan_sha256, idempotencyKey: key });
  if (run.status >= 300) throw new Error(`find: ${JSON.stringify(run.body).slice(0, 300)}`);
  return finish(run.body.id);
};
const lineOf = (combo, code) => sql(`select coalesce((select status::text from combination_form where combination_id='${combo}' and lineage_key='${code}' order by version desc limit 1), 'none')`);

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  if (load.status >= 300) throw new Error(`demo load: ${JSON.stringify(load.body).slice(0, 300)}`);
  const sp = sql("select id from combination where label='Study permit' limit 1"), vv = sql("select id from combination where label='Visitor visa' limit 1");

  // Rules first: the numbers printed on Study permit's pages, each with its sentence (the quotes the rounds must use).
  const rules = await find(sp, "rules", "qa101-rules-1");
  const printed = rules.result?.rules_only ?? [];
  const q = (c) => printed.find((p) => p.code === c)?.sentence;
  step("setup: Study permit's pages print IMM 5483, IMM 1294 and IMM 5707", ["IMM 5483", "IMM 1294", "IMM 5707"].every((c) => !!q(c)), printed.map((p) => p.code));
  step("setup: IMM 5707 is in the library as a filed form; IMM 5483 and IMM 1294 are not yet", sql("select string_agg(form_key || ':' || form_kind, ',' order by form_key) from gov_form_def where form_key in ('IMM 5483','IMM 1294','IMM 5707')") === "IMM 5707:data_form");
  // QA-102's starting point: a person attached IMM 5707 by hand.
  const added = await call("POST", `/combinations/${sp}/forms`, { formKey: "IMM 5707" });
  step("setup: a person attaches IMM 5707 to Study permit", added.status < 300 && lineOf(sp, "IMM 5707") !== "none", added.body);

  // Safety first: the stand-in launcher must answer, or no live step runs (a wrong path would use the real launcher).
  fs.mkdirSync(VAR, { recursive: true }); fs.rmSync(path.join(VAR, "fake-launch.log"), { force: true });
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: "QA-101 check: stand-in probe" } }));
  const probeAtt = sql(`select id from source_attachment where combination_id='${vv}' and edition like 'IMM 5257 (%' limit 1`);
  await call("POST", `/attachments/${probeAtt}/draft`, { mode: "stub" });
  for (let i = 0; i < 120 && !fs.existsSync(path.join(VAR, "fake-launch.log")); i++) await sleep(500);
  const standIn = fs.existsSync(path.join(VAR, "fake-launch.log"));
  step("safety: the stand-in launcher answers (nothing is ever sent to a model)", standIn);
  if (!standIn) throw new Error("the stand-in launcher is not active: start the copy as the usage line says");

  const P = (code, applies, condition = null, who = "each_applicant") => ({ code, title: null, applies, condition, who, quote: q(code), filed_note: null });
  const draft = { forms: [P("IMM 5483", "always"), P("IMM 1294", "always"), P("IMM 5707", "always")], unresolved: [] };
  const check = { forms: [P("IMM 5483", "always"), P("IMM 1294", "always"), P("IMM 5707", "condition", "Each applicant 18 or older")], unresolved: [] };
  const rec = (o) => ({ label: "QA-101 check", caller: "live", drafting_run: { run_id: "fake", status: "completed", usage: { cost_usd: 0.04, input_tokens: 9000, output_tokens: 800 } }, contract_valid: true, raw_output: JSON.stringify(o) });
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ jobs: {
    "studio-finder-forms-check-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, record: rec(check) } },
    "studio-finder-forms-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, record: rec(draft) } } } }));
  const run = await find(sp, "live", "qa101-live-1");
  const res = run.result ?? {};
  const codes = (xs) => (xs ?? []).map((x) => x.code).sort().join(",");

  // QA-101: the checklist is in the library as a checklist and never a filed line.
  step("QA-101 pass (API): IMM 5483 is downloaded into the library as a checklist", sql("select form_kind from gov_form_def where form_key='IMM 5483'") === "checklist" && sql("select count(*) from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5483'") === "1");
  step("QA-101 fail (API): IMM 5483 is not attached as a line on Study permit", lineOf(sp, "IMM 5483") === "none" && !codes(res.attach).includes("IMM 5483"), { line: lineOf(sp, "IMM 5483"), attach: codes(res.attach) });
  step("QA-101 pass (API): the run lists it as kept in the library as a checklist, and its step says so", res.checklists?.some((c) => c.code === "IMM 5483" && c.kind === "checklist") && /kept in the library as a checklist/.test(run.steps?.find((s) => s.kind === "finder_attach")?.message ?? ""), { checklists: res.checklists, msg: run.steps?.map((s) => s.message) });
  step("QA-101 fail (API): the filed form named with it (IMM 1294) is still downloaded and attached", codes(res.attach) === "IMM 1294" && lineOf(sp, "IMM 1294") === "DRAFT", { attach: codes(res.attach), line: lineOf(sp, "IMM 1294") });
  const latest = (await call("GET", `/combinations/${sp}/forms/find/latest`)).body;
  const row = (c) => latest.forms.find((f) => f.code === c);
  step("QA-101 pass (API): the Forms tab's read gives IMM 5483 the state 'checklist in the library'", row("IMM 5483")?.state === "CHECKLIST_IN_LIBRARY", row("IMM 5483"));

  // QA-102: the rounds disagree on IMM 5707, but it is already on the combination: not offered again.
  step("QA-102 pass (API): IMM 5707 still goes to a person to decide in the run (the rounds disagree)", res.decide?.some((d) => d.code === "IMM 5707"), res.decide);
  step("QA-102 fail (API): IMM 5707, already on Study permit, reads as on this combination, not 'you decide'", row("IMM 5707")?.state === "ATTACHED", row("IMM 5707"));
  // QA-103: the downloaded line knows its library edition.
  step("QA-103 pass (API): the downloaded line's row carries the library edition it was attached with", row("IMM 1294")?.state === "DOWNLOADED_ATTACHED" && /^IMM 1294 \(/.test(row("IMM 1294")?.edition ?? ""), row("IMM 1294"));

  // On the page, like a person.
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await p.goto(`${BASE}/c/${sp}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
    await p.locator('[data-line="IMM 1294"]').waitFor({ timeout: 15_000 });
    const checklistRow = p.locator('[data-finder-row="IMM 5483"]');
    await checklistRow.waitFor({ timeout: 15_000 });
    step("QA-101 pass (page): IMM 5483 shows as a checklist in the library, not filed, with a way to the Form library", /Checklist · in the library, read for documents, not filed/.test(await checklistRow.innerText()) && (await checklistRow.getByRole("link", { name: "Open the Form library" }).count()) === 1, await checklistRow.innerText());
    step("QA-101 fail (page): IMM 5483 is not a line in the forms table", (await p.locator('[data-line="IMM 5483"]').count()) === 0);
    step("QA-102 fail (page): IMM 5707 has no finder row offering 'Add to this combination'", (await p.locator('[data-finder-row="IMM 5707"]').count()) === 0 && (await p.getByRole("button", { name: /Add to this combination/ }).count()) === 0);
    const l1294 = p.locator('[data-line="IMM 1294"]');
    const t1294 = await l1294.innerText();
    step("QA-103 fail (page): the line the finder attached never says 'Not attached' or 'No edition read yet'", !/Not attached|No edition read yet/.test(t1294), t1294);
    step("QA-103 pass (page): it names the library edition, says the file is in the library and gives the next step with a link", /IMM 1294 \(/.test(t1294) && /File in the library/.test(t1294) && /Next: read its form fields/.test(t1294) && (await l1294.locator('[data-line-next="read"] a[href="/library/forms"]').count()) === 1, t1294);
    const ax = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step("axe (WCAG 2.2 AA): the Forms tab with the finder rows and lines", ax.violations.length === 0, ax.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`).join(" ; "));
    step("no page errors", errs.length === 0, errs.join(" | "));
  } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
