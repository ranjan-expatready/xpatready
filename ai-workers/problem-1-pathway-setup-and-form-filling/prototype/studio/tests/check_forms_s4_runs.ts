// S4 slice 2 (W1-07 shared run experience, P-110; challenge M1, M7, m4): the run API every background run uses, a Stop
// that really ends a running AI call, the Wave 1 cap (US$60) and Upload PDF read rules first. On the loaded demo: a rules
// finder run read through GET /api/runs/:id (steps, kinds, times, "usually about" from the run before) → a live finder
// run through the stand-in launcher whose AI call hangs: it shows in GET /api/runs?active=1, and Stop ends the call's
// process group within seconds → Upload PDF: an official form read by rules ("no AI call was made") and added; a file
// that is not a PDF refused; a PDF the rules cannot read held for a person with no AI call → the Wave 1 cap refuses a
// reservation above US$60 (on a scratch ledger). US$0: nothing calls a model or canada.ca (recorded copies).
//   zsh studio/tools/isolated.sh forms_s4r 4456 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_s4_runs.ts 4456 xr_studio_forms_s4r
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { normaliseCode } from "../contracts/form-library.ts";
import { pageText } from "../engine/canada.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BudgetExceeded, SpendLedger } from "../../p2/ledger.ts";
import { WAVE1_CAP_USD } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_s4r";
const STUDIO = join(import.meta.dirname, ".."), OFFICIAL = join(STUDIO, "..", "..", "official-sources", "ircc"), P2 = join(STUDIO, "..", "p2");
const VAR = join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`); // the copy's own folder, whatever its name (run-suites prefixes it)
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const blankPdf = (): Buffer => { const out = join(tmpdir(), `s4-blank-${process.pid}.pdf`); execFileSync(join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python"), ["-I", "-c", "import pypdf,sys; w=pypdf.PdfWriter(); w.add_blank_page(200,200); w.write(sys.argv[1])", out]); return readFileSync(out); };
/** A real one-page PDF with no form on it: it opens, but the rules find no form number (made with pypdf at run time). */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const upload = async (name: string, bytes: Buffer, actor = "user-A") => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), name);
  const r = await fetch(`http://localhost:${PORT}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: r.status, body: await r.json() as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const settle = async (id: string, limit = 60): Promise<Res> => { let r: Res = { status: 0, body: null }; for (let i = 0; i < limit * 4; i++) { r = await call("GET", `/runs/${id}`); if (!["queued", "running", "stopping"].includes(r.body?.status)) return r; await sleep(250); } return r; };
const jobsBefore = new Set(existsSync(join(P2, "jobs")) ? execFileSync("ls", [join(P2, "jobs")], { encoding: "utf8" }).split("\n") : []);

(async () => {
  // --- Wave 1 cap on a scratch ledger (the real ledger is evidence and is never written by a check)
  const tmp = mkdtempSync(join(tmpdir(), "s4-wave-"));
  try {
    const l = new SpendLedger(tmp, 1000);
    l.reserve("s4-wave-a", 1, WAVE1_CAP_USD - 1, 100);
    ok("C11.8 (m4): the Wave 1 cap is US$60 and a reservation inside it is accepted", WAVE1_CAP_USD === 60 && Math.abs(l.committedSince("2026-10-26T00:00:00.000Z") - 59) < 1e-9);
    let refused = ""; try { l.reserve("s4-wave-b", 1, 2, 100); } catch (e) { refused = e instanceof BudgetExceeded ? e.message : String(e); }
    ok("C11.8 (m4): a reservation above the Wave 1 cap is refused before any call (BudgetExceeded, in words)", /Wave 1 cap US\$60/.test(refused), refused);
    const bad = [Number.NaN, -1].map((x) => { try { l.reserve("s4-wave-c", 1, x, 100); return "accepted"; } catch (e) { return e instanceof BudgetExceeded ? e.message : String(e); } });
    ok("break minor: a worst case that is not a number, or below zero, is refused (it would open every cap)", bad.every((m) => /must be a number/.test(m)), bad);
  } finally { rmSync(tmp, { recursive: true, force: true }); }

  let r = await call("POST", "/demo/load");
  ok("setup: the demo loads", r.status < 300, r.status);
  const loadLog: string = (r.body?.log ?? []).join(" | ");

  // --- Slice 3 changes: Used by as a trail; Load sample fills canada.ca pages and what IRCC accepts (US$0, nothing invented)
  let lib = (await call("GET", "/library/forms/list")).body;
  const lrow = (c: string) => lib.rows.find((x: any) => x.code === c);
  ok("C11.11 (change 1): Used by names each combination by its place (Program › Category › Sub-category)", lrow("IMM 1295")?.used_by?.[0]?.label?.includes(" › ") && /With an LMIA$/.test(lrow("IMM 1295").used_by[0].label) && lib.combinations.every((x: any) => x.label.includes(" › ")), lrow("IMM 1295")?.used_by);
  ok("C11.11 (change 4): Load sample records each form's canada.ca page and Last updated from the recorded copies", !!lrow("IMM 1295")?.form_page_url && lrow("IMM 1295")?.canada_updated === "2023-09" && !!lrow("IMM 1295")?.checked_at, { page: lrow("IMM 1295")?.form_page_url, updated: lrow("IMM 1295")?.canada_updated });
  ok("Lead check 28 Oct fail: the saved real answer's line for IMM 5257 (\"Download and fill out the form on a computer\") says how to fill it, not how it is filed: Not set yet", lrow("IMM 5257")?.accepts === null && lrow("IMM 5257")?.accepts_basis === null, lrow("IMM 5257")?.accepts);
  // Lead note 28 Oct (founder change 4): the other forms from the Sample fixtures, each with IRCC's own sentence on its page.
  const fx = JSON.parse(readFileSync(join(STUDIO, "samples", "form-library-sample.json"), "utf8"));
  const canadaIdx = JSON.parse(readFileSync(join(OFFICIAL, "canada", "index.json"), "utf8")).items as { url: string; path: string }[];
  const pageWords = (url: string) => { const it = canadaIdx.find((x) => x.url === url); return it ? pageText(readFileSync(join(OFFICIAL, it.path), "utf8")).replace(/\s+/g, " ") : ""; };
  const fixed = Object.entries(fx.accepts as Record<string, { channels: string; quote: string }>).filter(([c]) => c !== "IMM 5257");
  const WORDS: Record<string, string> = { PDF: "PDF upload", ONLINE: "Online", PDF_OR_ONLINE: "PDF upload · Online" }; // P-143: the record in words, for every account
  const wrong = fixed.filter(([c, f]) => lrow(c)?.accepts !== WORDS[f.channels] || lrow(c)?.accepts_basis !== "SAMPLE_FIXTURE" || lrow(c)?.accepts_quote !== f.quote).map(([c]) => [c, lrow(c)?.accepts, lrow(c)?.accepts_basis]);
  ok("C11.11 (change 4) pass: the forms whose pages say they are uploaded get it from the Sample fixtures (IMM 5475, 5476: PDF upload, Sample · canada.ca words, the line kept)", fixed.map(([c]) => c).join() === "IMM 5475,IMM 5476" && !wrong.length, wrong);
  const notOnPage = Object.entries(fx.accepts as Record<string, { quote: string }>).filter(([c, f]) => !pageWords(lrow(c)?.form_page_url ?? "").includes(f.quote.replace(/\s+/g, " "))).map(([c]) => c);
  ok("C11.11 (change 4): each fixture's line is IRCC's own sentence on that form's recorded canada.ca page (nothing invented)", !notOnPage.length, notOnPage);
  ok("break R5-6, Lead check 28 Oct fail: a form whose page never says how it is filed stays Not set yet (IMM 1295, 5257 SCH1, 5409, 5707)", ["IMM 1295", "IMM 5257 SCH1", "IMM 5409", "IMM 5707"].every((c) => lrow(c)?.accepts === null && lrow(c)?.accepts_basis === null), ["IMM 1295", "IMM 5257 SCH1", "IMM 5409", "IMM 5707"].map((c) => lrow(c)?.accepts));
  ok("C11.11 (change 4) fail: a form neither a saved answer nor a fixture speaks about stays Not set yet (IMM 5802, an employer form)", lrow("IMM 5802")?.type === "form" && lrow("IMM 5802")?.accepts === null && lrow("IMM 5802")?.accepts_basis === null, lrow("IMM 5802")?.accepts);
  const noPage = lib.rows.filter((x: any) => x.type !== "guide" && !x.form_page_url).map((x: any) => x.code);
  ok("C11.11 (change 4): every sample form has its canada.ca page: from its recorded page, canada.ca's own list (IMM 5488) or the fixture (visa-office files); only the employer form has none", noPage.join() === "IMM 5802" && /\/imm5488\.html$/.test(lrow("IMM 5488")?.form_page_url ?? "") && lrow("IMM 5905")?.form_page_url === fx.pages["IMM 5905"].url, noPage);
  ok("C11.11 (change 2): checklists are not filed (Read by AI on the server, \"Not filed\" on the page)", lrow("IMM 5484")?.accepts === "READ_BY_AI");
  const guideRows = lib.rows.filter((x: any) => x.type === "guide");
  const wantGuides = [...new Set(Object.values(fx.guides as Record<string, { url: string | null }>).map((g) => g.url).filter(Boolean))];
  ok("review M2, Lead note 28 Oct: Load sample puts every sample combination's guide in the library (Guide 5256, 5269, 5289, 5487; US$0)", ["Guide 5256", "Guide 5269", "Guide 5289", "Guide 5487"].every((c) => guideRows.some((x: any) => x.code === c)) && wantGuides.every((u) => guideRows.some((x: any) => x.form_page_url === u)), guideRows.map((x: any) => x.code));
  ok("Lead note 28 Oct fail: a combination IRCC publishes no guide for gets none, and Load sample says why (the LMIA, an ESDC application)", /no guide, Sample: High-wage position: An employer's application to ESDC/.test(loadLog) && !/Sample fixtures not used/.test(loadLog) && guideRows.length === 4, loadLog.slice(loadLog.indexOf("library forms")));
  const ee = sql("select count(*) from form_edition_accept a join form_edition e on e.id=a.form_edition_id join gov_form_def d on d.id=e.gov_form_def_id where d.form_key in ('IMM 5669','IMM 5406')");
  ok("C1.6 C-12: the founder's IMM 5669 and IMM 5406 records wait for their forms (not in the sample library): said once, never 'not used', nothing recorded", /founder's records for IMM 5669, IMM 5406 \(P-171\) wait for the form to be in the library/.test(loadLog) && !/founder's record \(P-171\) was not used/.test(loadLog) && ee === "0", loadLog.slice(loadLog.indexOf("library forms")));
  ok("break minor: a number written loosely is understood in the path and in search (imm1295 is IMM 1295)", (await call("GET", "/library/forms/imm1295/uses")).body?.key === "IMM 1295" && (await call("GET", "/library/forms/list?q=imm1295")).body.rows?.[0]?.code === "IMM 1295");
  const refused = (q: string) => { try { sql(q); return false; } catch { return true; } };
  const ed = sql(`select id from form_edition limit 1`);
  ok("Lead 27 Oct: the database refuses what the contracts refuse (IRCC accepts, who said it, where an edition came from)", refused(`insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, set_by) select workspace_id, id, 'ANY', '{FAX}', 'AI_SAMPLE', 't' from form_edition where id='${ed}'`) && refused(`insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, set_by) select workspace_id, id, 'NOWHERE', '{ONLINE}', 'AI_SAMPLE', 't' from form_edition where id='${ed}'`) && refused(`insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, set_by) select workspace_id, id, 'ANY', '{ONLINE}', 'GUESS', 't' from form_edition where id='${ed}'`) && refused(`update form_edition set origin='EMAIL' where id='${ed}'`) && !refused(`update form_edition set origin=origin where id='${ed}'`));
  r = await call("GET", `/library/forms/${encodeURIComponent("Guide 5256")}/uses`);
  ok("break round 2 N7, review round 2 M2: a guide opens by its own key (Guide 5256), so it can be retired or deleted", r.status === 200 && r.body.key === "Guide 5256", r.body?.detail ?? r.body?.key);
  ok("review round 2 M3: the list's Used by counts checklists attached as sources, as the drawer does (IMM 5484)", (lrow("IMM 5484")?.used_by?.length ?? 0) > 0 && lrow("IMM 5484").used_by.every((u: any) => u.label.includes(" › ")), lrow("IMM 5484")?.used_by);
  ok("Lead 28 Oct fail: a form with no file is \"No file yet\", never \"Needs your OK\" (IMM 5802: nothing waits for anyone)", lrow("IMM 5802")?.status === "no_file" && !(await call("GET", "/library/forms/list?status=needs_ok")).body.rows.some((x: any) => x.code === "IMM 5802"), lrow("IMM 5802")?.status);
  ok("Lead 28 Oct pass: the No file yet filter lists it, and a form with a file is never in it", (await call("GET", "/library/forms/list?status=no_file")).body.rows.map((x: any) => x.code).join() === "IMM 5802");
  ok("review round 2 M4: a visa-office checklist is a checklist (IMM 5881); an employer's form is a form (IMM 5802)", lrow("IMM 5881")?.type === "checklist" && lrow("IMM 5802")?.type === "form", [lrow("IMM 5881")?.type, lrow("IMM 5802")?.type]);
  ok("break minor: a schedule with a letter is one number (IMM 5406 SCH4A)", normaliseCode("imm5406 sch4a") === "IMM 5406 SCH4A");
  r = await call("POST", `/combinations/${sql(`select id from combination where label = 'Visitor visa' limit 1`)}/forms`, { formKey: "IMM 0008 SCH4A" });
  ok("break minor: a real IRCC number with a lettered schedule passes the number check (404 not in the library, not 400)", r.status === 404, r.body?.detail);
  ok("break minor: Replace on a combination that does not exist is a 404 in words", (await call("POST", `/combinations/00000000-0000-4000-8000-000000000000/forms/${encodeURIComponent("IMM 1295")}/replace`, {})).status === 404);

  // --- C11.18: a person sets what IRCC accepts with the canada.ca line or a reason; a second person approves
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: ["PDF_UPLOAD"] });
  ok("C11.18 fail: neither the canada.ca line nor a reason is refused (400, on the field)", r.status === 400 && /canada\.ca line|say why/i.test(r.body.detail), r.body.detail);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: ["PDF_UPLOAD"], reason: "Paper and portal both take it" }, "user-B");
  ok("C11.18 fail: a person without the author duty cannot propose it (403)", r.status === 403, r.status);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5484")}/accepts`, { channels: ["PDF_UPLOAD"], reason: "test" });
  ok("C11.18 fail: a checklist is never filed, so it takes no channel (409, in words)", r.status === 409 && /never filed/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: ["PDF_UPLOAD", "ONLINE"], quote: "You can apply online or on paper with this form." });
  ok("C11.18 pass: with the canada.ca line, it waits for a second person on To review", r.status < 300 && r.body.status === "WAITING" && sql(`select count(*) from library_change where kind='form_accepts' and key='IMM 1295' and status='WAITING'`) === "1", r.body);
  const acc = r.body.id;
  const detail = (await call("GET", `/library/changes/${acc}`)).body;
  ok("review: the second person reads the change in words: before → after, IRCC's line and the form's canada.ca page", detail?.accepts?.before === "Not set yet" && detail.accepts.after === "PDF upload · Online" && /apply online or on paper/.test(detail.accepts.quote ?? "") && /^https:\/\/www\.canada\.ca\//.test(detail.accepts.form_page ?? ""), detail?.accepts);
  ok("C11.18: the library shows the change waiting and keeps the old value until approved", (await call("GET", "/library/forms/list?q=1295")).body.rows[0]?.accepts_waiting === true && (await call("GET", "/library/forms/list?q=1295")).body.rows[0]?.accepts === null);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: ["PDF_UPLOAD"], reason: "another" });
  ok("C11.18 fail: a second change while one waits is refused (409)", r.status === 409 && /already waits/.test(r.body.detail), r.body.detail);
  const self = await call("POST", `/library/changes/${acc}/approve`, { note: "ok" }, "user-A");
  ok("C11.18 fail: the proposer cannot approve it (author ≠ approver), told in plain words", self.status >= 400 && /You proposed this change to what IRCC accepts, so a different person/.test(self.body?.detail ?? ""), self.body?.detail);
  r = await call("POST", `/library/changes/${acc}/approve`, { note: "Matches the form page" }, "user-B");
  lib = (await call("GET", "/library/forms/list")).body;
  ok("C11.18 pass: a second person approves: the form shows PDF upload · Online, set by a person · Sample, with the line", r.status < 300 && lrow("IMM 1295")?.accepts === "PDF upload · Online" && lrow("IMM 1295")?.accepts_basis === "PERSON_SAMPLE" && /apply online or on paper/.test(lrow("IMM 1295")?.accepts_quote ?? "") && !lrow("IMM 1295")?.accepts_waiting, lrow("IMM 1295"));
  const twice = await Promise.all(["PDF_UPLOAD", "ONLINE"].map((c) => call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: [c], reason: `Both at once ${c}` })));
  ok("break minor: two people proposing at the same moment leave one change waiting; the other is refused (409)", twice.filter((x) => x.status < 300).length === 1 && twice.filter((x) => x.status === 409).length === 1 && sql(`select count(*) from library_change where kind='form_accepts' and key='IMM 1295' and status='WAITING'`) === "1", twice.map((x) => x.status));
  sql(`delete from library_change where kind='form_accepts' and key='IMM 1295' and status='WAITING'`);
  const approvedLine = sql(`select string_agg(summary, ' | ' order by at) from audit_event where action='approved' and entity_key='IMM 1295'`); // two lines in one instant: read them all
  ok("break R5-2: Activity says what was approved in words (set what IRCC accepts for), never a raw code", /\(set what IRCC accepts for\)/.test(approvedLine) && !/set_accepts/.test(approvedLine), approvedLine);
  ok("C11.18: the change is closed (applied at approval) and its history says who", sql(`select status from library_change where id='${acc}'`) === "RELEASED" && /approved what IRCC accepts for IMM 1295/.test((await call("GET", `/library/forms/${encodeURIComponent("IMM 1295")}/uses`)).body.history.map((h: any) => h.what).join(" | ")));
  const vv = sql(`select id from combination where label = 'Visitor visa' limit 1`);
  r = await call("GET", "/ledger");
  ok("C11.8 (m4): the ledger summary states the Wave 1 cap, what it spent and what is left", r.body?.wave?.cap_usd === 60 && typeof r.body.wave.spent_usd === "number" && r.body.remaining_usd <= r.body.wave.remaining_usd, r.body?.wave);

  // --- The run API on a rules finder run, twice ("usually about" comes from the run before)
  r = await call("GET", "/runs?active=1");
  ok("C11.8: nothing runs yet: the chip has nothing to show", r.status === 200 && r.body.runs.length === 0, r.body);
  ok("C11.8: the runs list asks what it is for (400 without ?active=1)", (await call("GET", "/runs")).status === 400);
  ok("C11.8: an unknown run is a 404 in words", (await call("GET", "/runs/00000000-0000-4000-8000-000000000000")).status === 404);
  const rulesRun = async (key: string) => { const plan = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "rules" })).body; const l = await call("POST", `/combinations/${vv}/forms/find`, { mode: "rules", planSha256: plan.plan_sha256, idempotencyKey: key }); return (await settle(l.body.id)).body; };
  let run = await rulesRun("s4r-rules-1");
  ok("C11.8: a finished run reads as six steps, each with its kind (rules or AI), status, words and times", run.steps?.length === 6 && run.steps.every((s: any) => ["rules", "ai"].includes(s.uses) && s.status && "started_at" in s) && run.status === "done" && run.status_word === "Done", run.steps?.map((s: any) => `${s.kind}:${s.uses}:${s.status}`));
  ok("C11.8: a first run of its kind has no \"usually about\" yet (never an invented time)", run.usual_ms === null, run.usual_ms);
  ok("C11.8: cost is stated (US$0 spent, US$0 worst case for rules)", run.usd?.spent === 0 && run.usd?.worst === 0, run.usd);
  ok("C11.8 (Lead fix 3): a first run of its kind has no usual cost yet (never invented)", run.usd?.usual === null, run.usd);
  run = await rulesRun("s4r-rules-2");
  ok("C11.8: the next run says \"usually about\" from the run before (a real duration)", typeof run.usual_ms === "number" && run.usual_ms >= 0, run.usual_ms);
  ok("C11.8 (Lead fix 3): and its usual cost, from the run before (US$0 for rules)", run.usd?.usual === 0, run.usd);
  ok("C11.8: Stop on an ended run says so (409)", (await call("POST", `/runs/${run.id}/stop`)).status === 409);

  // --- Live finder run whose AI call hangs: active, then Stop really ends it (M7)
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: "S4 runs check: stand-in probe" } }));
  rmSync(join(VAR, "fake-launch.log"), { force: true });
  const probeAtt = sql(`select id from source_attachment where combination_id='${vv}' and edition like 'IMM 5257 (%' limit 1`);
  await call("POST", `/attachments/${probeAtt}/draft`, { mode: "stub" });
  for (let i = 0; i < 120 && !existsSync(join(VAR, "fake-launch.log")); i++) await sleep(500);
  const standIn = existsSync(join(VAR, "fake-launch.log"));
  ok("safety: the stand-in launcher answers (no live step runs otherwise; nothing is ever sent to a model)", standIn);
  if (!standIn) throw new Error("the stand-in launcher is not active: start the copy as the usage line says; live steps skipped");
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs: { "studio-finder-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, sleep_ms: 30_000, out: { exit: 0 } } } } }));
  const lp = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "live" })).body;
  ok("C11.8 (m4): the live plan's worst case fits the Wave 1 cap that is left", lp.totals.worst_usd > 0 && lp.totals.worst_usd <= lp.ledger.wave.remaining_usd, { worst: lp.totals.worst_usd, wave: lp.ledger.wave });
  const live = await call("POST", `/combinations/${vv}/forms/find`, { mode: "live", planSha256: lp.plan_sha256, idempotencyKey: "s4r-live-stop" });
  let calling = false;
  for (let i = 0; i < 80 && !calling; i++) { await sleep(250); calling = readFileSync(join(VAR, "fake-launch.log"), "utf8").split("\n").some((l) => l.includes("studio-finder-forms-") && l.includes('"mode":"live"')); }
  r = await call("GET", "/runs?active=1");
  const chip = r.body.runs?.find((x: any) => x.id === live.body.id);
  ok("C11.8: while it runs, the chip's list shows it with its step (step 3 of 6, the AI call)", !!chip && chip.label === "Finding forms" && chip.step?.n === 3 && chip.step?.m === 6 && chip.href === `/ai/${live.body.id}`, chip);
  ok("setup: the stand-in AI call is in progress", calling);
  const t0 = Date.now();
  r = await call("POST", `/runs/${live.body.id}/stop`, undefined, "user-A");
  ok("C11.8: Stop is accepted and the run says Stopping", r.status < 300 && ["stopping", "stopped"].includes(r.body.status), r.body?.status);
  run = (await settle(live.body.id, 20)).body;
  const took = Date.now() - t0;
  ok("C11.8 (M7): Stop ends the running AI call within seconds (the stand-in would have taken 30 s)", run.status === "stopped" && took < 12_000, { took, status: run.status });
  ok("C11.8 (M7): the AI step says it was ended while the call ran and how it is counted; nothing after it started", /Stopped while the AI call ran/.test(run.steps[2].message ?? "") && run.steps.slice(3).every((s: any) => ["SKIPPED", "CANCELLED", "WAITING"].includes(s.status)), run.steps.map((s: any) => `${s.kind}:${s.status}`));
  const alive = (() => { try { return execFileSync("pgrep", ["-f", "fake-launch.mjs --job studio-finder-forms-"], { encoding: "utf8" }).trim(); } catch { return ""; } })();
  ok("C11.8 (M7): no launcher process of that call is left running", alive === "", alive);
  ok("break M6: each running launcher is written down (so a restarted server ends any left over) and crossed off when it ends", !(existsSync(join(VAR, "launches")) ? readdirSync(join(VAR, "launches")) : []).some((f) => f.endsWith(".pid")));

  // --- Round 5 major (option a): a form a combination reads only as a source can be retired (never deleted); QA-64
  // (P-116 amended): the approval retires it, no release needed; AI no longer plans a draft from a retired form's file.
  { r = await call("GET", `/library/forms/${encodeURIComponent("IMM 5881")}/uses`);
    ok("round 5 major: a form read only as a source may be retired, never deleted (the refusal names no missing action)", r.body.can?.retire === null && /never deleted|retire it instead|Still used/.test(r.body.can?.delete ?? "") && r.body.uses?.some((u: any) => u.retireOk), r.body.can);
    r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5881")}/retire`, { reason: "Replaced by the new visa-office checklist" });
    const rid = r.body.id;
    r = await call("POST", `/library/changes/${rid}/approve`, { note: "Checked" }, "user-B");
    ok("round 5 major: the second person approves the retire although a combination reads its file", r.status < 300, r.body?.detail ?? r.body?.status);
    ok("QA-64 pass (P-116 amended): a library retire takes effect at approval: the form is retired now, the change is done, no release needed (a source use does not hand it back)", sql(`select retired_at is not null from gov_form_def where form_key='IMM 5881'`) === "t" && sql(`select status from library_change where id='${rid}'`) === "RELEASED" && /takes effect now/.test(sql(`select summary from audit_event where entity_key='IMM 5881' and action='retired' order by at desc limit 1`)), { change: sql(`select status from library_change where id='${rid}'`) });
    r = await call("GET", "/library/forms/list?for=picker");
    ok("QA-64: a form retired at approval is gone from the picker at once", !r.body.rows.some((x: any) => x.code === "IMM 5881"));
    const rs = await call("POST", `/library/forms/${encodeURIComponent("IMM 5881")}/restore`, { reason: "Needed again for the sample" });
    await call("POST", `/library/changes/${rs.body.id}/approve`, { note: "Checked" }, "user-B");
    ok("QA-64 pass: a library restore takes effect at approval too", sql(`select retired_at is null from gov_form_def where form_key='IMM 5881'`) === "t" && sql(`select status from library_change where id='${rs.body.id}'`) === "RELEASED");
    sql(`update gov_form_def set retired_at = now() where form_key = 'IMM 5881'`); // as before this step: the rest of the check reads it retired
    sql(`update gov_form_def set retired_at = now() where form_key = 'IMM 5257'`);
    const plan = (await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [vv] }, mode: "STUB" })).body;
    sql(`update gov_form_def set retired_at = null where form_key = 'IMM 5257'`);
    const t5257 = (plan.targets ?? []).find((t: any) => /^IMM 5257 \(/.test(t.source ?? ""));
    ok("round 5 major: AI plans no draft of a retired form's file, whatever the scope (combination)", !!t5257 && t5257.action === "not_eligible" && /Retired in the library/.test(t5257.why), t5257 ?? plan); }

  // --- Round 4 review M2, golden: the two committed real AI answers (27 Oct, US$0.31) replay at US$0, and IMM 5257 (whose
  // quote sits under the heading that prints its number in guide 5256) is attached, not dropped.
  { const gp = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "replay" })).body;
    const gl = await call("POST", `/combinations/${vv}/forms/find`, { mode: "replay", planSha256: gp.plan_sha256, idempotencyKey: "s4r-golden-replay" });
    const g = (await settle(gl.body.id)).body;
    const att = (await call("GET", `/combinations/${vv}/forms/find`)).body?.result?.attach ?? [];
    ok("round 4 review M2 (golden): the committed real answers replay at US$0 and keep IMM 5257, the visitor visa application itself", g.usd?.spent === 0 && att.some((a: any) => a.code === "IMM 5257"), { status: g.status, attach: att.map((a: any) => a.code), dropped: (await call("GET", `/combinations/${vv}/forms/find`)).body?.result?.dropped?.map((d: any) => `${d.code}: ${d.why}`) });
    ok("round 4 review should: a replayed run is not called \"rules only, no AI\" (its AI steps are marked)", g.steps?.some((s: any) => s.uses === "ai"), g.steps?.map((s: any) => s.uses)); }
  { const attId = sql(`select id from source_attachment where combination_id='${vv}' and edition like 'IMM 5257 (%' limit 1`);
    sql(`update gov_form_def set retired_at = now() where form_key = 'IMM 5257'`);
    r = await call("POST", `/attachments/${attId}/draft`, { mode: "stub" });
    sql(`update gov_form_def set retired_at = null where form_key = 'IMM 5257'`);
    ok("round 4 review M1: AI does not draft a retired library form's file (409, in words)", r.status === 409 && /retired/.test(r.body?.detail ?? r.body?.message ?? ""), r.body?.detail ?? r.body); }

  // --- Upload PDF read rules first (M1)
  const official = readFileSync(join(OFFICIAL, "forms", "imm5604e.pdf"));
  ok("setup: IMM 5604 is not in the library yet", sql(`select count(*) from gov_form_def where form_key='IMM 5604'`) === "0");
  let u = await upload("imm5604e.pdf", official, "user-B");
  ok("C11.11: uploading needs the author duty (403)", u.status === 403, u.status);
  u = await upload("imm5604e.pdf", official);
  ok("C11.11: Upload PDF answers at once with a run the card follows", u.status < 300 && !!u.body.runId, u.body);
  run = (await settle(u.body.runId)).body;
  const step = (k: string) => run.steps?.find((s: any) => s.kind === k);
  ok("C11.11 (M1): rules read what the file is: \"Rules read it … No AI call was made\"", /^Rules read it: IMM 5604 \(\d{2}-\d{4}\).*No AI call was made\.$/.test(step("upload_identity")?.message ?? "") && step("upload_identity")?.uses === "rules", step("upload_identity"));
  const lmia = sql(`select combination_id from combination_form where lineage_key='IMM 1295' limit 1`);
  r = await call("PATCH", `/combinations/${lmia}/forms/imm1295`, { who: "principal_applicant" });
  ok("round 3 m1: a line edit takes the number written loosely (imm1295)", r.status < 300, r.body?.detail ?? r.status);
  ok("C11.11: rules compare it with canada.ca: the very file the form page links", /The very file canada\.ca's form page links/.test(step("upload_compare")?.message ?? ""), step("upload_compare")?.message);
  ok("C11.11: it joins the library through the one intake, the run ends Done, US$0", run.status === "done" && step("upload_add")?.status === "COMPLETED" && sql(`select count(*) from gov_form_def where form_key='IMM 5604'`) === "1" && run.usd.spent === 0, { status: run.status, add: step("upload_add")?.message });
  { const row5604 = (await call("GET", "/library/forms/list?q=5604")).body.rows?.[0];
    ok("round 6 should 1 (D18): a hand upload says it was uploaded by a person, with the canada.ca page its file matched", row5604?.origin === "UPLOADED" && /^https:\/\/www\.canada\.ca\//.test(row5604?.form_page_url ?? ""), { origin: row5604?.origin, page: row5604?.form_page_url }); }
  // Round 3 R3-1: upload for a combination's row while a retire of that form is open: kept in the library, not attached.
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5604")}/retire`, { reason: "Checking the open-retire rule" });
  ok("setup: a retire of the unused IMM 5604 waits for a second person", r.status < 300 && r.body.status === "WAITING", r.body);
  { const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(official)], { type: "application/pdf" }), "imm5604e.pdf"); fd.append("forCombination", vv); fd.append("forCode", "IMM 5604");
    const up = await (await fetch(`http://localhost:${PORT}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json() as { runId: string };
    run = (await settle(up.runId)).body;
    ok("round 3 R3-1: an upload for a combination's row is not attached while the form's retire is open, and says so", !/IMM 5604:/.test(sql(`select string_agg(lineage_key || ':' || status, ',') from combination_form where combination_id='${vv}'`) ?? "") && /Not attached to the combination|open on To review/.test(JSON.stringify(run)), run.message ?? run.error); }
  { const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(official)], { type: "application/pdf" }), "imm5604e.pdf"); fd.append("combinationId", vv);
    const res = await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json() as { results?: { message: string }[] };
    const sha5604 = sql(`select e.sha256 from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = 'IMM 5604' limit 1`);
    ok("round 4 R4-1: a combination's own upload attaches no retiring form as a source, and says why", /Not attached to .*open on To review/.test(res.results?.[0]?.message ?? "") && sql(`select count(*) from source_attachment where combination_id='${vv}' and sha256='${sha5604}'`) === "0", res.results?.[0]?.message); }
  sql(`delete from library_change where key='IMM 5604'`);
  u = await upload("notes.pdf", Buffer.from("these are notes, not a PDF"));
  run = (await settle(u.body.runId)).body;
  ok("C11.11: a file that is not a PDF is refused at the first step; nothing is read", run.status === "failed" && /not a PDF/.test(run.steps[0].message) && run.steps.slice(1).every((s: any) => s.status === "SKIPPED"), run.steps?.map((s: any) => `${s.kind}:${s.status}`));
  u = await upload("damaged.pdf", Buffer.from("%PDF-1.4\n% a header and nothing else\n%%EOF\n"));
  run = (await settle(u.body.runId)).body;
  ok("review M6: a failed upload offers no link to the page already open", (await call("GET", `/runs/${run.id}`)).body.error?.next === null);
  ok("C11.11 (Lead fix 1): a damaged PDF fails the first rules check (it does not open); nothing else runs", run.status === "failed" && run.steps[0].status === "FAILED" && /damaged or incomplete/.test(run.steps[0].message) && run.steps.slice(1).every((s: any) => s.status === "SKIPPED"), run.steps?.map((s: any) => `${s.kind}:${s.status}`));
  u = await upload("empty.pdf", Buffer.alloc(0));
  ok("C11.11 (Lead fix 1): an empty file is refused at once, in words (400)", u.status === 400 && /empty \(0 bytes\)/.test(u.body.detail), u.body?.detail);
  u = await upload("scan.pdf", blankPdf());
  run = (await settle(u.body.runId)).body;
  ok("C11.11 (M1): a PDF that opens but whose number the rules cannot read waits for a person; AI is not called on an unverified file", run.status === "needs_person" && run.steps[0].status === "COMPLETED" && /Rules could not read.*no AI call was made/.test(step("upload_identity")?.message ?? run.steps[1].message) && run.steps.every((s: any) => s.uses === "rules") && run.usd.spent === 0, run.steps?.map((s: any) => `${s.kind}:${s.status}`));
  ok("C11.11 (Lead fix 2): the waiting reason is said once: the run's box says what happens next, not the step's words again", run.error && run.error.what !== run.steps[1].message && /second person|cannot be approved/.test(run.error.what), run.error);
  ok("C11.11: the unread upload is held for a second person (P-80), not in the library", sql(`select count(*) from intake_item where file_name='scan.pdf' and status='HELD'`) === "1");
  ok("review M6, round 4 should: an unread held upload links to its To review item and says it cannot be approved (upload the official PDF), not the page already open", run.error?.next?.href === `/review/held/${sql(`select id from intake_item where file_name='scan.pdf' and status='HELD'`)}` && /Open it on To review/.test(run.error.next.label) && /cannot be approved/.test(run.error.what), run.error?.next);
  // Lead 28 Oct (carried should, drift #7): To review says what its card says; nobody records an IRCC page for it.
  const heldScan = sql(`select id from intake_item where file_name='scan.pdf' and status='HELD'`);
  const qItem = async (actor: string) => ((await call("GET", "/review-queue?filter=all", undefined, actor)).body.items as any[]).find((i) => i.id === `held:${heldScan}`); // eslint-disable-line @typescript-eslint/no-explicit-any
  const forUploader = await qItem("user-A"), forReviewer = await qItem("user-B");
  ok("Lead 28 Oct fail: To review never asks the uploader to record the IRCC page of a copy the rules could not read", /cannot be approved/.test(forUploader?.what ?? "") && !/IRCC page/.test(forUploader?.what ?? "") && forUploader?.state === "waiting" && forUploader?.next === null && /upload the official PDF/.test(forUploader?.waiting_on ?? ""), forUploader);
  ok("Lead 28 Oct pass: the second person's To review step for that copy is to reject it", forReviewer?.state === "needs" && forReviewer?.next?.label === "Reject the copy" && forReviewer?.next?.href === `/review/held/${heldScan}`, forReviewer?.next);
  // P-116 amended (28 Oct): an earlier edition says what keeps it. A test-made earlier edition of IMM 1295 that no release
  // files, then the With an LMIA release made to file it (its snapshot names that edition).
  const cur1295 = sql(`select e.id from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = 'IMM 1295' order by e.edition_label desc limit 1`);
  sql(`insert into form_edition select (jsonb_populate_record(null::form_edition, to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'edition_label', 'IMM 1295 (01-2019)'))).* from form_edition e where e.id = '${cur1295}'`);
  const keptLine = async () => ((await call("GET", "/library/forms/list?q=1295")).body.rows[0]?.older_editions ?? []).find((e: any) => e.label === "IMM 1295 (01-2019)")?.kept_by as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  const noneKeeps = await keptLine();
  ok("P-116 amended fail: an earlier edition no release files says so (kept for the record, never deleted)", /no release or open case files it now\. Never deleted\./.test(noneKeeps ?? ""), noneKeeps);
  const rel = sql(`select cr.id from config_release cr join combination c on c.id = cr.combination_id where c.label = 'With an LMIA' order by cr.version desc limit 1`);
  if (rel) sql(`update config_release set snapshot = replace(snapshot::text, '"form_edition": "IMM 1295 (09-2023)"', '"form_edition": "IMM 1295 (01-2019)"')::jsonb where id = '${rel}'`);
  const kept = await keptLine();
  ok("P-116 amended pass: an earlier edition says which release keeps it (\"Kept by Release N of With an LMIA\")", !!rel && /^Kept by Release \d+ of With an LMIA(\.| and \d+ open case)/.test(kept ?? ""), kept);
  const fd = new FormData(); for (const [n, b] of [["imm5604e.pdf", official], ["damaged-2.pdf", Buffer.from("%PDF-1.4\n%%EOF\n")]] as const) fd.append("files", new Blob([new Uint8Array(b)], { type: "application/pdf" }), n);
  const many = await (await fetch(`http://localhost:${PORT}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json() as { runIds?: string[] };
  ok("C11.11 (Lead fix 4): one Upload PDF takes many files, one run (card) each", many.runIds?.length === 2, many);
})().catch((e) => { fail++; console.log(`FAIL  the check stopped: ${(e as Error).stack}`); }).finally(() => {
  for (const f of existsSync(join(P2, "jobs")) ? execFileSync("ls", [join(P2, "jobs")], { encoding: "utf8" }).split("\n").filter(Boolean) : []) if (f.startsWith("studio-finder-") && !jobsBefore.has(f)) rmSync(join(P2, "jobs", f), { force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
