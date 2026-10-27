// S4 slice 2 (W1-07 shared run experience, P-110; challenge M1, M7, m4): the run API every background run uses, a Stop
// that really ends a running AI call, the Wave 1 cap (US$60) and Upload PDF read rules first. On the loaded demo: a rules
// finder run read through GET /api/runs/:id (steps, kinds, times, "usually about" from the run before) → a live finder
// run through the stand-in launcher whose AI call hangs: it shows in GET /api/runs?active=1, and Stop ends the call's
// process group within seconds → Upload PDF: an official form read by rules ("no AI call was made") and added; a file
// that is not a PDF refused; a PDF the rules cannot read held for a person with no AI call → the Wave 1 cap refuses a
// reservation above US$60 (on a scratch ledger). US$0: nothing calls a model or canada.ca (recorded copies).
//   zsh studio/tools/isolated.sh forms_s4r 4456 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_s4_runs.ts 4456 xr_studio_forms_s4r
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { normaliseCode } from "../contracts/form-library.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BudgetExceeded, SpendLedger } from "../../p2/ledger.ts";
import { WAVE1_CAP_USD } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_s4r";
const STUDIO = join(import.meta.dirname, ".."), OFFICIAL = join(STUDIO, "..", "..", "official-sources", "ircc"), P2 = join(STUDIO, "..", "p2");
const VAR = join(STUDIO, "var", "isolated-forms_s4r");
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

  // --- Slice 3 changes: Used by as a trail; Load sample fills canada.ca pages and what IRCC accepts (US$0, nothing invented)
  let lib = (await call("GET", "/library/forms/list")).body;
  const lrow = (c: string) => lib.rows.find((x: any) => x.code === c);
  ok("C11.11 (change 1): Used by names each combination by its place (Program › Category › Sub-category)", lrow("IMM 1295")?.used_by?.[0]?.label?.includes(" › ") && /With an LMIA$/.test(lrow("IMM 1295").used_by[0].label) && lib.combinations.every((x: any) => x.label.includes(" › ")), lrow("IMM 1295")?.used_by);
  ok("C11.11 (change 4): Load sample records each form's canada.ca page and Last updated from the recorded copies", !!lrow("IMM 1295")?.form_page_url && lrow("IMM 1295")?.canada_updated === "2023-09" && !!lrow("IMM 1295")?.checked_at, { page: lrow("IMM 1295")?.form_page_url, updated: lrow("IMM 1295")?.canada_updated });
  ok("C11.11 (change 4): what IRCC accepts comes from a saved real finder answer where one quotes it (IMM 5257: PDF upload, AI · Sample)", lrow("IMM 5257")?.accepts === "PDF" && lrow("IMM 5257")?.accepts_basis === "AI_SAMPLE" && /fill out the form on a computer/i.test(lrow("IMM 5257")?.accepts_quote ?? ""), lrow("IMM 5257"));
  ok("C11.11 (change 4): a form no saved answer speaks about stays Not set yet (never invented)", lrow("IMM 1295")?.accepts === null && lrow("IMM 1295")?.accepts_basis === null, lrow("IMM 1295")?.accepts);
  ok("C11.11 (change 2): checklists are not filed (Read by AI on the server, \"Not filed\" on the page)", lrow("IMM 5484")?.accepts === "READ_BY_AI");
  ok("review M2: Load sample also puts each sample combination's guide in the library, found by rules alone (US$0)", lib.rows.some((x: any) => x.type === "guide" && /^Guide \d+/.test(x.code) && /^https:\/\/www\.canada\.ca\//.test(x.form_page_url ?? "")), lib.rows.filter((x: any) => x.type === "guide").map((x: any) => x.code));
  ok("break minor: a number written loosely is understood in the path and in search (imm1295 is IMM 1295)", (await call("GET", "/library/forms/imm1295/uses")).body?.key === "IMM 1295" && (await call("GET", "/library/forms/list?q=imm1295")).body.rows?.[0]?.code === "IMM 1295");
  const refused = (q: string) => { try { sql(q); return false; } catch { return true; } };
  const ed = sql(`select id from form_edition limit 1`);
  ok("Lead 27 Oct: the database refuses what the contracts refuse (IRCC accepts, who said it, where an edition came from)", refused(`update form_edition set accepted_channels='FAX' where id='${ed}'`) && refused(`update form_edition set accepted_basis='GUESS' where id='${ed}'`) && refused(`update form_edition set origin='EMAIL' where id='${ed}'`) && !refused(`update form_edition set accepted_channels=accepted_channels where id='${ed}'`));
  ok("break minor: a schedule with a letter is one number (IMM 5406 SCH4A)", normaliseCode("imm5406 sch4a") === "IMM 5406 SCH4A");
  r = await call("POST", `/combinations/${sql(`select id from combination where label = 'Visitor visa' limit 1`)}/forms`, { formKey: "IMM 0008 SCH4A" });
  ok("break minor: a real IRCC number with a lettered schedule passes the number check (404 not in the library, not 400)", r.status === 404, r.body?.detail);
  ok("break minor: Replace on a combination that does not exist is a 404 in words", (await call("POST", `/combinations/00000000-0000-4000-8000-000000000000/forms/${encodeURIComponent("IMM 1295")}/replace`, {})).status === 404);

  // --- C11.18: a person sets what IRCC accepts with the canada.ca line or a reason; a second person approves
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: "PDF" });
  ok("C11.18 fail: neither the canada.ca line nor a reason is refused (400, on the field)", r.status === 400 && /canada\.ca line|say why/i.test(r.body.detail), r.body.detail);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: "PDF", reason: "Paper and portal both take it" }, "user-B");
  ok("C11.18 fail: a person without the author duty cannot propose it (403)", r.status === 403, r.status);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5484")}/accepts`, { channels: "PDF", reason: "test" });
  ok("C11.18 fail: a checklist is never filed, so it takes no channel (409, in words)", r.status === 409 && /never filed/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: "PDF_OR_ONLINE", quote: "You can apply online or on paper with this form." });
  ok("C11.18 pass: with the canada.ca line, it waits for a second person on To review", r.status < 300 && r.body.status === "WAITING" && sql(`select count(*) from library_change where kind='form_accepts' and key='IMM 1295' and status='WAITING'`) === "1", r.body);
  const acc = r.body.id;
  const detail = (await call("GET", `/library/changes/${acc}`)).body;
  ok("review: the second person reads the change in words: before → after, IRCC's line and the form's canada.ca page", detail?.accepts?.before === "Not set yet" && detail.accepts.after === "PDF upload · Online" && /apply online or on paper/.test(detail.accepts.quote ?? "") && /^https:\/\/www\.canada\.ca\//.test(detail.accepts.form_page ?? ""), detail?.accepts);
  ok("C11.18: the library shows the change waiting and keeps the old value until approved", (await call("GET", "/library/forms/list?q=1295")).body.rows[0]?.accepts_waiting === true && (await call("GET", "/library/forms/list?q=1295")).body.rows[0]?.accepts === null);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: "PDF", reason: "another" });
  ok("C11.18 fail: a second change while one waits is refused (409)", r.status === 409 && /already waits/.test(r.body.detail), r.body.detail);
  ok("C11.18 fail: the proposer cannot approve it (author ≠ approver)", (await call("POST", `/library/changes/${acc}/approve`, { note: "ok" }, "user-A")).status >= 400);
  r = await call("POST", `/library/changes/${acc}/approve`, { note: "Matches the form page" }, "user-B");
  lib = (await call("GET", "/library/forms/list")).body;
  ok("C11.18 pass: a second person approves: the form shows PDF upload · Online, set by a person · Sample, with the line", r.status < 300 && lrow("IMM 1295")?.accepts === "PDF_OR_ONLINE" && lrow("IMM 1295")?.accepts_basis === "PERSON_SAMPLE" && /apply online or on paper/.test(lrow("IMM 1295")?.accepts_quote ?? "") && !lrow("IMM 1295")?.accepts_waiting, lrow("IMM 1295"));
  const twice = await Promise.all(["PDF", "ONLINE"].map((c) => call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { channels: c, reason: `Both at once ${c}` })));
  ok("break minor: two people proposing at the same moment leave one change waiting; the other is refused (409)", twice.filter((x) => x.status < 300).length === 1 && twice.filter((x) => x.status === 409).length === 1 && sql(`select count(*) from library_change where kind='form_accepts' and key='IMM 1295' and status='WAITING'`) === "1", twice.map((x) => x.status));
  sql(`delete from library_change where kind='form_accepts' and key='IMM 1295' and status='WAITING'`);
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
  ok("C11.11: rules compare it with canada.ca: the very file the form page links", /The very file canada\.ca's form page links/.test(step("upload_compare")?.message ?? ""), step("upload_compare")?.message);
  ok("C11.11: it joins the library through the one intake, the run ends Done, US$0", run.status === "done" && step("upload_add")?.status === "COMPLETED" && sql(`select count(*) from gov_form_def where form_key='IMM 5604'`) === "1" && run.usd.spent === 0, { status: run.status, add: step("upload_add")?.message });
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
  ok("C11.11 (Lead fix 2): the waiting reason is said once: the run's box says what happens next, not the step's words again", run.error && run.error.what !== run.steps[1].message && /second person/.test(run.error.what), run.error);
  ok("C11.11: the unread upload is held for a second person (P-80), not in the library", sql(`select count(*) from intake_item where file_name='scan.pdf' and status='HELD'`) === "1");
  ok("review M6: the held upload's next step opens its own To review item (record the IRCC page), not the page already open", run.error?.next?.href === `/review/held/${sql(`select id from intake_item where file_name='scan.pdf' and status='HELD'`)}` && /IRCC page/.test(run.error.next.label), run.error?.next);
  const fd = new FormData(); for (const [n, b] of [["imm5604e.pdf", official], ["damaged-2.pdf", Buffer.from("%PDF-1.4\n%%EOF\n")]] as const) fd.append("files", new Blob([new Uint8Array(b)], { type: "application/pdf" }), n);
  const many = await (await fetch(`http://localhost:${PORT}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json() as { runIds?: string[] };
  ok("C11.11 (Lead fix 4): one Upload PDF takes many files, one run (card) each", many.runIds?.length === 2, many);
})().catch((e) => { fail++; console.log(`FAIL  the check stopped: ${(e as Error).stack}`); }).finally(() => {
  for (const f of existsSync(join(P2, "jobs")) ? execFileSync("ls", [join(P2, "jobs")], { encoding: "utf8" }).split("\n").filter(Boolean) : []) if (f.startsWith("studio-finder-") && !jobsBefore.has(f)) rmSync(join(P2, "jobs", f), { force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
