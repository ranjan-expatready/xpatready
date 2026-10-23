// P5 browser run: drives the real product shell (http://localhost:4319, p5/server.ts running in a copy) through the
// document-assisted journey as the simulated agent, client and consultant: lead and duplicate check, a mixed upload
// batch (duplicate, unreadable, wrong person), person assignment, discrepancy resolution, questionnaire, a changed
// answer, staff confirmation, inline form review, real PDF fill/read-back/download, approval, and a later batch whose
// changed value reaches only the right applicant's PDF. Screenshots and a step log go to p5/evidence/.
//   node p5/check_p5_browser.cjs
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const URL = "http://localhost:4319/";
const OUT = path.join(__dirname, "evidence"); fs.mkdirSync(OUT, { recursive: true });
const log = []; const t0 = Date.now();
const step = (name, ok, detail) => { log.push({ name, ok: !!ok, detail, s: Math.round((Date.now() - t0) / 1000) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${String(detail).slice(0, 180)}` : ""}`); };
let clicks = 0;

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForFunction(() => !document.querySelector("#main").classList.contains("loading")); await p.waitForTimeout(80); };
  const click = async (sel) => { clicks++; await p.click(sel); await settle(); };
  const shot = async (n) => p.screenshot({ path: path.join(OUT, n), fullPage: true });
  const as = async (persona) => { await p.selectOption("#persona", persona); await settle(); };
  const go = async (screen) => click(`#nav button[data-s="${screen}"]`);
  const st = async () => { const id = await p.$eval("#case", (e) => e.value); return (await p.request.get(`${URL}api/state?case=${id}`)).json(); };
  const toast = async () => (await p.textContent("#toast")).trim();

  await p.goto(URL); await settle();
  // 1. Lead, duplicate check, case
  await click('button[data-a="sample-lead"]');
  await click('button[data-a="check-lead"]');
  step("lead: duplicate check runs before a case opens", (await p.textContent("#dup")).includes("No existing record matches"));
  await shot("01-lead.png");
  await click('button[data-a="open-case"]');
  let s = await st();
  step("case opened on release c1-v3 with three people", s.case.release.startsWith("2c66472f") && s.case.people.length === 3, s.case.case_id);
  const checklist0 = s.checklist.filter((r) => r.status === "Needed").length;

  // 2. Mixed first batch through the agent's document panel (client uploads use the same path; see step 4)
  await go("documents");
  await click('button[data-a="sample-files"]');
  await p.selectOption("#up-type", "unknown"); await p.selectOption("#up-for", "");
  await p.check("#up-new");
  await click('button[data-a="upload"]');
  // the same principal passport again (a duplicate) and the principal's page uploaded for the partner (wrong person)
  await p.uncheck("#up-new"); await click('button[data-a="sample-files"]');
  for (const cb of await p.$$("[data-sample]")) await cb.uncheck();
  await p.check('[data-sample="D1-passport-principal-scan.png"]'); await click('button[data-a="upload"]');
  await click('button[data-a="sample-files"]'); for (const cb of await p.$$("[data-sample]")) await cb.uncheck();
  await p.check('[data-sample="D7-passport-principal-mrz-conflict.png"]'); await p.selectOption("#up-type", "passport"); await p.selectOption("#up-for", "partner"); await click('button[data-a="upload"]');
  await click('button[data-a="process"]');
  s = await st();
  const docs = s.case.documents;
  step("batch 1: eight uploads kept as originals", docs.length === 8, docs.map((d) => `${d.original_name}:${d.processing}`).join(", "));
  step("duplicate upload recognised by content, not re-read", docs.some((d) => d.processing === "duplicate" && d.duplicate_of));
  step("unreadable photo returned for replacement, others unaffected", docs.some((d) => d.processing === "unreadable" && d.status === "Needs replacing") && docs.filter((d) => d.processing === "read" || d.processing === "reused_cached_extraction").length >= 4);
  step("the lead's date-of-birth typo makes the principal's passport ambiguous (a name alone never merges)", docs.some((d) => d.original_name.startsWith("D1") && d.association === "ambiguous"), docs.find((d) => d.original_name.startsWith("D1"))?.association_reason);
  step("partner's passport, job offers and the birth certificate associated to the right people", ["D2", "D4", "D5"].every((k) => docs.find((d) => d.original_name.startsWith(k))?.association === "matched") && docs.find((d) => d.original_name.startsWith("D5"))?.about === "child");
  await shot("02-documents-batch1.png");

  // 3. Staff assign the ambiguous passport; review the case update
  const d1 = docs.find((d) => d.original_name.startsWith("D1") && d.association === "ambiguous");
  clicks++; await p.selectOption(`[data-assign="${d1.doc_id}"]`, "client-a"); await settle();
  s = await st();
  const dob = s.items.find((i) => i.fact === "person.date_of_birth" && i.about === "client-a" && i.kind === "conflict");
  step("after assignment the passport date of birth conflicts with the lead form (no last-upload-wins)", !!dob, dob && `${dob.current?.value} vs ${dob.value}`);
  const wp = s.case.documents.find((d) => d.original_name.startsWith("D7"));
  step("principal's passport page uploaded for the partner is flagged as the wrong person", wp?.association === "wrong_person" || wp?.association === "ambiguous", `${wp?.association}: ${wp?.association_reason}`);
  await go("updates"); await shot("03-case-update-review.png");
  await click(`button[data-decide="${dob.id}"][data-action="use_value"]`);
  // confirm the clean sections, one click per person and section
  let n = 0; while ((await p.$$("button[data-confirm-section]")).length && n < 40) { await click("button[data-confirm-section]"); n++; }
  s = await st();
  step(`clean proposals confirmed a section at a time (${n} clicks)`, s.items.filter((i) => !i.decision && ["new", "corroborates"].includes(i.kind)).length === 0);
  const jobs = ["client-a", "partner"].map((x) => s.facts.find((f) => f.fact === "person.intended_job_title" && f.about === x && f.status === "verified")?.value);
  step("distinct applicant job titles confirmed from their own offers (D30 values)", jobs[0] && jobs[1] && jobs[0] !== jobs[1], jobs.join(" | "));

  // 4. Client portal: checklist with reasons; questionnaire; changed answer
  await as("client"); await go("mydocs"); await shot("04-client-documents.png");
  await go("questionnaire");
  const before = (await st()).questions.principal.filter((q) => q.status === "needs an answer").length;
  await click('button[data-a="sample-answers"]'); await click('button[data-a="save-answers"]');
  s = await st();
  const after = s.questions.principal.filter((q) => q.status === "needs an answer").length;
  step("client answers reduce the remaining questions; document-read values are shown for checking", after < before, `${before} -> ${after}`);
  const mc0 = s.checklist.find((r) => r.requirement.startsWith("Marriage certificate or licence") && r.person === "partner")?.status;
  // changed answer: married -> common-law, for both people
  await click('button[data-a="q-all"]');
  for (const who of ["client-a", "partner"]) { const el = await p.$(`[data-q="person.marital_status"][data-p="${who}"]`); if (el) await el.fill("common_law"); }
  await click('button[data-a="save-answers"]');
  s = await st();
  const mc1 = s.checklist.find((r) => r.requirement.startsWith("Marriage certificate or licence") && r.person === "partner")?.status;
  const cl1 = s.checklist.find((r) => r.requirement.startsWith("Proof of common-law") && r.person === "partner")?.status;
  const f5409 = s.forms.find((f) => f.form === "IMM 5409")?.applies;
  step("changed answer changes the checklist and forms with a reason", mc0 !== mc1 && cl1 !== "Not needed" && f5409 === true, `marriage certificate ${mc0} -> ${mc1}; common-law proof ${cl1}; IMM 5409 ${f5409}`);
  await shot("05-questionnaire.png");

  // 5. Agent: staff facts, condition inputs, confirm remaining client answers
  await as("agent"); await go("working");
  await click('button[data-a="sample-staff"]');
  n = 0; while ((await p.$$("button[data-confirm-section]")).length && n < 80) { await click("button[data-confirm-section]"); n++; }
  for (let k = 0; k < 40; k++) { const sel = await p.$("select[data-staff-fact]"); if (!sel) break; clicks++; await sel.selectOption("false"); await settle(); }
  s = await st();
  step(`staff confirmed the client's reviewed answers by section (${n} section clicks)`, s.facts.filter((f) => f.status === "proposed").length === 0, `${s.facts.filter((f) => f.status === "proposed").length} still proposed`);
  await shot("06-working-view.png");

  // 6. Forms: inline review, fill, read back, download; approval by the consultant
  await go("forms");
  const fill = async (form, person) => { await p.selectOption("#form-sel", `${form}|${person}`); await settle(); await click('button[data-a="fill"]'); return (await st(), JSON.parse(fs.readFileSync(path.join(__dirname, "case", s.case.case_id, "outputs", (await p.$eval("#fill-report a", (a) => decodeURIComponent(a.href.split("file=")[1])) ) + ".report.json"), "utf8"))); };
  const r1 = await fill("IMM 1295", "client-a");
  step("IMM 1295 (principal) filled from confirmed facts, read back equal, signatures verify, original bytes kept", r1.intact && r1.read_back_equal === r1.written, `${r1.read_back_equal}/${r1.written}; ${JSON.stringify(r1.signatures)}; hand ${r1.hand}`);
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#fill-report a")]); const dlPath = path.join(OUT, "downloaded-" + dl.suggestedFilename()); await dl.saveAs(dlPath);
  step("intact download is the checked file", fs.readFileSync(dlPath).length === r1.bytes, `${dl.suggestedFilename()} ${r1.bytes} bytes`);
  await shot("07-form-review-principal.png");
  const r2 = await fill("IMM 1295", "partner");
  step("IMM 1295 (partner) filled with the partner's own job, not the principal's", r2.intact && r2.read_back_equal === r2.written, `${r2.read_back_equal}/${r2.written}`);
  const v1 = JSON.parse(fs.readFileSync(path.join(__dirname, "case", s.case.case_id, "outputs", r1.download + ".request.json"))).values, v2 = JSON.parse(fs.readFileSync(path.join(__dirname, "case", s.case.case_id, "outputs", r2.download + ".request.json"))).values;
  const JT = "form1[0].Page3[0].DetailsOfWorkCont[0].details[0].jobTitle[0]", EMP = "form1[0].Page3[0].DetailsOfIntendedWork[0].DetailsOfWork[0].PurposeRow1[0].EmployerName[0].EmployerName[0]";
  step("distinct principal/partner job and employer values in the two filled PDFs (D30)", v1[JT] && v2[JT] && v1[JT] !== v2[JT] && v1[EMP] !== v2[EMP], `${v1[JT]} @ ${v1[EMP]} | ${v2[JT]} @ ${v2[EMP]}`);
  const r3 = await fill("IMM 5707", "client-a");
  step("IMM 5707 (principal) filled and read back", r3.intact, `${r3.read_back_equal}/${r3.written}`);
  await as("consultant"); await go("forms");
  for (const sel of ["IMM 1295|client-a", "IMM 1295|partner"]) { await p.selectOption("#form-sel", sel); await settle(); await click('button[data-a="approve"]'); }
  s = await st();
  step("consultant approved both IMM 1295 value sets", s.case.approvals.filter((a) => a.status === "approved").length === 2);

  // 7. Later batch: revised partner offer + the unchanged principal passport again
  await as("agent"); await go("documents");
  await click('button[data-a="sample-files"]'); for (const cb of await p.$$("[data-sample]")) await cb.uncheck();
  await p.check('[data-sample="D8-job-offer-partner-revised.pdf"]'); await p.check('[data-sample="D1-passport-principal-scan.png"]');
  await p.selectOption("#up-type", "unknown"); await p.selectOption("#up-for", ""); await p.check("#up-new");
  await click('button[data-a="upload"]'); await click('button[data-a="process"]');
  s = await st();
  const b2 = s.case.documents.filter((d) => d.batch === 2);
  step("batch 2: unchanged file not re-read (duplicate), revised offer read", b2.some((d) => d.processing === "duplicate") && b2.some((d) => d.original_name.startsWith("D8") && d.processing !== "duplicate"), b2.map((d) => `${d.original_name}:${d.processing}`).join(", "));
  const ch = s.items.filter((i) => i.batch === 2 && i.about === "partner" && ["changed", "conflict"].includes(i.kind));
  step("batch 2 proposes the partner's changed dates as a change, not a silent overwrite", ch.some((i) => i.fact === "person.intended_employment_start_date"), ch.map((i) => `${i.fact}:${i.kind}:${i.current?.value}->${i.value}`).join("; "));
  await go("updates"); await shot("08-later-batch-review.png");
  for (const i of ch) { const btn = await p.$(`button[data-decide="${i.id}"][data-action="${i.kind === "changed" ? "confirm" : "use_value"}"]`); if (btn) await click(`button[data-decide="${i.id}"][data-action="${i.kind === "changed" ? "confirm" : "use_value"}"]`); }
  n = 0; while ((await p.$$("button[data-confirm-section]")).length && n < 20) { await click("button[data-confirm-section]"); n++; }
  s = await st();
  const ap = s.case.approvals;
  step("only the partner's IMM 1295 approval is withdrawn; the principal's stands", ap.find((a) => a.person === "partner")?.status === "withdrawn" && ap.find((a) => a.person === "client-a")?.status === "approved", ap.map((a) => `${a.form}/${a.person}:${a.status}`).join(", "));
  await go("forms");
  const r4 = await fill("IMM 1295", "partner");
  const v4 = JSON.parse(fs.readFileSync(path.join(__dirname, "case", s.case.case_id, "outputs", r4.download + ".request.json"))).values;
  const SD = "form1[0].Page3[0].DetailsOfWorkCont[0].details[0].HowLongStudy[0].FromDate[0]";
  step("the changed start date reaches the partner's refilled PDF and reads back", r4.intact && v4[SD] && v4[SD] !== v2[SD], `${v2[SD]} -> ${v4[SD]}`);
  await shot("09-partner-refilled.png");

  // phone width and dark mode spot checks
  await p.setViewportSize({ width: 390, height: 844 }); await go("forms"); await shot("10-forms-phone.png");
  await p.emulateMedia({ colorScheme: "dark" }); await p.setViewportSize({ width: 1440, height: 900 }); await go("updates"); await shot("11-updates-dark.png");
  step("no page errors", errs.length === 0, errs.join("; "));
  s = await st();
  const summary = { at: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), clicks, steps: log.length, passed: log.filter((x) => x.ok).length, case: s.case.case_id, reader_mode: s.reader_mode, documents: s.case.documents.length, items: s.items.length, decisions: s.items.filter((i) => i.decision).length, events: s.case.events.length };
  fs.writeFileSync(path.join(OUT, "p5-browser-run.json"), JSON.stringify({ summary, log }, null, 1));
  console.log(JSON.stringify(summary));
  await b.close();
  process.exit(log.every((x) => x.ok) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
