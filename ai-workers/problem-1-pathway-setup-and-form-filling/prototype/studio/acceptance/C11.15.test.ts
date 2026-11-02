// C11.15 (Day-0 acceptance, P-220) — Start setup runs the form finder for the combination: library forms are used,
// canada.ca forms downloaded into the library, missing ones offered as Upload PDF (read by the rules; one they cannot read
// waits for a person) or Find again; the list is confirmed once (replaced by "no confirm step", Lead annotation of P-123,
// 27 Oct); every form has Redo with AI per stage, Replace, Remove, Undo; library Retire, Delete only when unused; "Who can
// be in this application" editable with rules on Save.
// Status (CAPABILITIES, 1 Nov): Partial. Missing: Redo with AI (no endpoint), Load sample does not replay the finder
// (P-123: "Load sample replays the finder"), QA-101..111 (live-run defects; guarded here where they show at API level:
// QA-101 checklist filed as a form, QA-102 one form two rows, QA-104 channel not one IRCC accepts).
// Decisions: P-123 (and its 27/28 Oct amendments), P-125 (amended 28 Oct), P-116 (lifecycle), P-110, P-175.
// US$0: replay of the saved Visitor visa answer and rules only; canada.ca is the recorded copies; no live switch.
// Scaffolding (P-33, said here): to make one form "missing" the check marks IMM 5475 retired in the library by SQL before
// the find, and clears that mark before Find again.
// The Redo endpoint is this file's proposal (POST /combinations/:id/forms/:code/redo {stage}: answers the plan; the same
// call with the plan's planSha256 starts it; its run is stopped with POST /runs/:id/stop); the builder may name it
// otherwise and change the call, not the rule. Delete needs a reason (AT-16): that is the app's rule today, not a
// decision (P-116 asks for a confirmation). P-116 also says Delete only what is used nowhere (AT-21, a form listed by
// IRCC with no file, planted by SQL as Sample) and Retire is refused while a current draft or the latest release still
// uses it, listing each use (AT-22); AT-17 retires a form nobody uses (IMM 1294, uploaded here as canada.ca's file).
// Sample combinations are found by their structure trail (acceptance/lib/pack1.ts): P-112's names, else today's keys.
//   zsh tools/isolated.sh acc_a2 4562 start && ./node_modules/.bin/tsx acceptance/C11.15.test.ts 4562 xr_studio_acc_a2
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 33 pass, 4 fail — failing: AT-1 (Load
// sample attaches Visitor visa's forms as sources and never replays the finder: no run, no Picked by AI line); AT-12
// twice and AT-24 (no Redo with AI endpoint: 404, so no stage can be redone or stopped). QA-101/102/104 guards, Delete
// of an unused form (AT-21), Retire refused while in use (AT-22) and Upload PDF of a readable official file (AT-23)
// pass. The first find on a fresh copy downloads from the recorded canada.ca copies and can take over a minute.
// Builder, C11.15 (2 Nov): Redo is POST …/forms/:code/redo {stage} as proposed above (api/src/form-redo.ts); AT-1 runs on
// the Demo menu's Load sample (the six), which already replays the finder; the checks after it reload the suites'
// fixture. Expected on the branch: 37 pass.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCopy, guard, needCombo, sqlFor, stop } from "./lib/pack1.ts";
const PORT = Number(process.argv[2] ?? 4562), DB = process.argv[3] ?? "xr_studio_acc_a2";
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- responses are read loosely, as in tests/check_*.ts
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  try {
    const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
    return { status: r.status, body: j ?? {} };
  } catch (e) { return { status: 0, body: { detail: String(e) } }; }
};
const sql = sqlFor(DB);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ended = async (path: string) => { for (let i = 0; i < 360; i++) { const v = (await call("GET", path)).body; if (!["QUEUED", "RUNNING", "queued", "running"].includes(v?.status)) return v; await wait(500); } return null; };
const TECH = /ENOENT|errno|syscall|\/Users\/|node:|Prisma|at [A-Za-z.]+ \(|Error:/;
const plain = (b: any) => typeof b?.detail === "string" && b.detail.length > 10 && !TECH.test(b.detail); // eslint-disable-line @typescript-eslint/no-explicit-any
const committed = async () => (await call("GET", "/ledger")).body?.committed_usd;
const enc = encodeURIComponent;
/** The newest row of each form line: code:status:origin. */
const lines = (c: string) => sql(`select coalesce(string_agg(lineage_key || ':' || status || ':' || origin, ',' order by lineage_key), '') from (select distinct on (lineage_key) * from combination_form where combination_id='${c}' order by lineage_key, version desc) x`);
const lineOf = (c: string, code: string) => sql(`select status || '|' || version from combination_form where combination_id='${c}' and lineage_key='${code}' order by version desc limit 1`);
const jobs = () => sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job");
const find = async (c: string, key: string) => {
  const plan = (await call("POST", `/combinations/${c}/forms/find/plan`, { mode: "replay" })).body;
  const r = await call("POST", `/combinations/${c}/forms/find`, { mode: "replay", planSha256: plan?.plan_sha256, idempotencyKey: `${key}-${process.pid}` });
  return r.body?.id ? await ended(`/form-finder/runs/${r.body.id}`) : { launch: r };
};
/** A real, openable PDF with no form number printed on it (the rules cannot read it). */
function letterPdf(): Buffer {
  const txt = "BT /F1 12 Tf 50 700 Td (A letter with no form number on it.) Tj ET";
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", `<< /Length ${txt.length} >>\nstream\n${txt}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let out = "%PDF-1.4\n"; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
const IRCC = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc", "forms");
const upload = async (name: string, bytes: Buffer, extra: Record<string, string>, actor = "user-A"): Promise<Res> => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), name);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  try { const r = await fetch(`http://localhost:${PORT}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": actor }, body: fd }); const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* */ } return { status: r.status, body: j }; } catch (e) { return { status: 0, body: { detail: String(e) } }; }
};

(async () => {
  await checkCopy(PORT, DB);
  // ------------------------------------------------ Load sample replays the finder (P-123)
  // Load sample is the Demo menu's (the six, P-148: {sample: "six"}). Its finder replay attaches Visitor visa's forms, so
  // the checks after AT-1 start again from the suites' fixture load (no forms attached yet: the first find downloads and
  // attaches, AT-3, AT-7, AT-9). Builder, C11.15 (2 Nov): run on the six from the start, AT-3/7/9/10 fail (30/37).
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const usdSix = await committed();
  const six = await call("POST", "/demo/load", { sample: "six" });
  if (six.status >= 300) stop(`Load sample (the six) failed (${six.status})`);
  const vvSix = await needCombo(PORT, DB, "visitor_visa");
  const land0 = (await call("GET", `/combinations/${vvSix}/start-setup`)).body;
  ok("C11.15 AT-1 Load sample replays the finder for Visitor visa: its saved answer's run is there and its forms are attached (Picked by AI), US$0",
    !!land0?.run && /:AI_FOUND/.test(lines(vvSix)) && (await committed()) === usdSix, { run: land0?.run, lines: lines(vvSix) });

  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  if (load.status >= 300) stop(`Load sample failed (${load.status})`);
  const vv = await needCombo(PORT, DB, "visitor_visa");
  const usd0 = await committed();

  // ------------------------------------------------ the finder: canada.ca only, library first, downloads, no confirm step
  const off = await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "replay", pageUrl: "https://www.example.com/visitor-forms.html" });
  ok("C11.15 AT-2 [IRCC-F01] refusal: a page outside canada.ca is refused before anything runs (400, plain words)", off.status === 400 && plain(off.body) && /canada\.ca/.test(off.body?.detail), off.body?.detail);
  sql(`update gov_form_def set retired_at = now() where form_key = 'IMM 5475'`); // scaffolding: makes IMM 5475 "missing"
  const before = jobs();
  const run = await find(vv, "acc1115-find1");
  const res = run?.result ?? {};
  const attach = (res.attach ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.15 AT-3 [IRCC-F01] the finder read only canada.ca pages and spent nothing (replay of the saved answer)",
    (res.pages ?? []).length > 0 && res.pages.every((p: any) => /^https:\/\/www\.canada\.ca\//.test(p.url)) && run?.usd?.spent === 0, { status: run?.status, message: run?.message, launch: run?.launch, pages: (res.pages ?? []).map((p: any) => p.url), usd: run?.usd }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const fromLib = attach.filter((a) => a.source === "library"), dl = attach.filter((a) => a.source === "downloaded");
  ok("C11.15 AT-3 forms already in the library are used as they are; the others are downloaded from canada.ca into the library (with its page)",
    fromLib.some((a) => a.code === "IMM 5257") && dl.length > 0 && dl.every((a) => sql(`select count(*) from form_edition e join gov_form_def f on f.id = e.gov_form_def_id where f.form_key='${a.code}' and e.origin='DOWNLOADED' and e.source_url like 'https://www.canada.ca/%'`) !== "0"), attach.map((a) => `${a.code}:${a.source}`));
  ok("C11.15 AT-4 [IRCC-F09] the finder lists the Family Information form (IMM 5707 or IMM 5645) for Visitor visa, attached",
    attach.some((a) => a.code === "IMM 5707" || a.code === "IMM 5645") && /IMM 5(707|645):DRAFT/.test(lines(vv)), attach.map((a) => a.code));
  ok("C11.15 AT-5 [IRCC-F03] every attached form names the number and edition printed on it (\"IMM 5257 (09-2023)\")",
    attach.length > 0 && attach.every((a) => new RegExp(`^${a.code.replace(/ /g, " ")} \\(\\d{2}-\\d{4}\\)$`).test(a.edition ?? "")), attach.map((a) => a.edition));
  const kinds = sql(`select coalesce(string_agg(f.form_key || ':' || f.form_kind || ':' || cf.channel, ',' order by f.form_key), '') from (select distinct on (lineage_key) * from combination_form where combination_id='${vv}' order by lineage_key, version desc) cf join gov_form_def f on f.id = cf.gov_form_def_id where cf.status <> 'RETIRED' and cf.origin = 'AI_FOUND'`);
  const libType = new Map((((await call("GET", "/library/forms/list")).body?.rows ?? []) as any[]).map((r) => [r.code, r.type])); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.15 AT-6 [IRCC-F06] the guide it read is never attached as a form; no checklist is attached as a filed form (QA-101)",
    (res.pages ?? []).some((p: any) => p.kind === "guide") && kinds.split(",").filter(Boolean).every((k) => { const [code, kind, ch] = k.split(":"); return kind !== "guide" && (libType.get(code) !== "checklist" || ch === "NOT_NEEDED"); }), kinds); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.15 AT-7 the forms both rounds agree on are attached at once, with no confirm step (P-123 Lead annotation 27 Oct)",
    attach.filter((a) => a.line === "added").length > 0 && attach.filter((a) => a.line === "added").every((a) => lineOf(vv, a.code).startsWith("DRAFT|")), attach.map((a) => `${a.code}:${a.line}`));
  const latest = (await call("GET", `/combinations/${vv}/forms/find/latest`)).body;
  const codes = ((latest?.forms ?? []) as any[]).map((f) => f.code); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.15 AT-8 one form, one row: the Forms tab's finder list names each form once (QA-102)", codes.length > 0 && new Set(codes).size === codes.length, codes);

  // ------------------------------------------------ missing: Upload PDF or Find again
  const miss = (latest?.forms ?? []).find((f: any) => f.code === "IMM 5475"); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.15 AT-9 a form the finder could not use is listed as not found, in plain words that offer Upload PDF (and the run says Done with problems)",
    miss?.state === "NOT_FOUND" && /upload/i.test(miss?.why ?? "") && !TECH.test(miss?.why ?? "") && run?.status === "PARTIAL" && !/IMM 5475:DRAFT/.test(lines(vv)), { miss, status: run?.status });
  const up = await upload("letter.pdf", letterPdf(), { forCombination: vv, forCode: "IMM 5475" });
  const upRun = up.body?.runId ? await ended(`/runs/${up.body.runId}`) : null;
  ok("C11.15 AT-10 Upload PDF: a file the rules cannot read waits for a person, with no AI call (every step by rules, US$0), nothing attached",
    upRun?.status === "needs_person" && (upRun?.steps ?? []).every((s: any) => s.uses === "rules" && s.usd === 0) && /no AI call/.test(JSON.stringify(upRun?.steps)) && !/IMM 5475:DRAFT/.test(lines(vv)), { status: upRun?.status, msg: upRun?.message }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const bad = await upload("broken.pdf", Buffer.from("%PDF-1.4\nnot really a pdf\n%%EOF\n"), { forCombination: vv, forCode: "IMM 5475" });
  const badRun = bad.body?.runId ? await ended(`/runs/${bad.body.runId}`) : null;
  ok("C11.15 AT-10 refusal: a damaged PDF is refused in plain words; nothing read, nothing added", (bad.status === 400 && plain(bad.body)) || (badRun?.status === "failed" && /damaged|could not be opened/.test(JSON.stringify(badRun?.steps)) && !TECH.test(JSON.stringify(badRun?.steps))), { status: bad.status, run: badRun?.status });
  sql(`update gov_form_def set retired_at = null where form_key = 'IMM 5475'`);
  const again = await find(vv, "acc1115-find2");
  const n5475 = sql(`select count(distinct lineage_key) from combination_form where combination_id='${vv}' and lineage_key='IMM 5475'`);
  ok("C11.15 AT-11 Find again attaches the form that was missing; forms already attached are not attached twice; US$0",
    /IMM 5475:DRAFT/.test(lines(vv)) && n5475 === "1" && (again?.result?.attach ?? []).filter((a: any) => a.code !== "IMM 5475").every((a: any) => a.line === "already") && again?.usd?.spent === 0, { lines: lines(vv), usd: again?.usd }); // eslint-disable-line @typescript-eslint/no-explicit-any

  const okUp = await upload("imm5710e.pdf", readFileSync(join(IRCC, "imm5710e.pdf")), { forCombination: vv, forCode: "IMM 5710" });
  const okRun = okUp.body?.runId ? await ended(`/runs/${okUp.body.runId}`) : null;
  const okSaid = JSON.stringify((okRun?.steps ?? []).map((x: any) => x.message)); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.15 AT-23 [IRCC-F01] Upload PDF pass: a readable official file (canada.ca's own IMM 5710) is read by the rules (no AI call, US$0), joins the library with the edition printed on it and is attached to the combination",
    okRun?.status === "done" && (okRun?.steps ?? []).every((x: any) => x.uses === "rules" && !x.usd) && /No AI call was made/.test(okSaid) && /Attached to/.test(okSaid) && /^IMM 5710 \(\d\d-\d{4}\)$/.test(sql("select e.edition_label from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5710'")), { status: okRun?.status, said: okSaid.slice(0, 300) }); // eslint-disable-line @typescript-eslint/no-explicit-any

  // ------------------------------------------------ Redo with AI per stage (missing today)
  const C5257 = enc("IMM 5257"), v5257 = Number(lineOf(vv, "IMM 5257").split("|")[1]);
  const jb = jobs();
  const redo = await call("POST", `/combinations/${vv}/forms/${C5257}/redo`, { stage: "find" });
  ok("C11.15 AT-12 Redo with AI on one form, per stage (find, read, match): it answers with the plan and its cost first and runs nothing before the click",
    redo.status < 300 && /^[0-9a-f]{64}$/.test(redo.body?.planSha256 ?? redo.body?.plan_sha256 ?? "") && jobs() === jb, { status: redo.status, body: redo.body?.detail ?? redo.body });
  const redoBad = await call("POST", `/combinations/${vv}/forms/${C5257}/redo`, { stage: "bake" });
  const redoB = await call("POST", `/combinations/${vv}/forms/${C5257}/redo`, { stage: "read" }, "user-B");
  ok("C11.15 AT-12 refusal: an unknown stage is refused in plain words (400) and only an author may redo (approver 403); nothing runs",
    redoBad.status === 400 && plain(redoBad.body) && redoB.status === 403 && jobs() === jb, [redoBad.status, redoB.status]);

  const redoStart = await call("POST", `/combinations/${vv}/forms/${C5257}/redo`, { stage: "find", mode: "replay", planSha256: redo.body?.planSha256 ?? redo.body?.plan_sha256 });
  const redoRun = redoStart.body?.id ?? redoStart.body?.runId;
  const redoStop = redoRun ? await call("POST", `/runs/${redoRun}/stop`) : { status: 0, body: null };
  const redoEnd = redoRun ? (await call("GET", `/runs/${redoRun}`)).body : null;
  ok("C11.15 AT-24 [P-123] each AI stage can be stopped: a Redo started (find, replay at US$0) is stopped with Stop; the run ends Stopped (or already ended), nothing spent, and the form's line is unchanged",
    redoStart.status < 300 && !!redoRun && redoStop.status < 500 && ["stopped", "done", "cancelled"].includes(String(redoEnd?.status)) && (redoEnd?.usd?.spent ?? 0) === 0 && lineOf(vv, "IMM 5257") === `DRAFT|${v5257}`, { start: redoStart.status, run: redoRun, stop: redoStop.status, end: redoEnd?.status });

  // ------------------------------------------------ Replace, Remove, Undo
  let r = await call("POST", `/combinations/${vv}/forms/${C5257}/replace`, { version: v5257 + 5 });
  ok("C11.15 AT-13 refusal: Replace on a line read at an old version is refused (409, plain words); the line is unchanged", r.status === 409 && plain(r.body) && lineOf(vv, "IMM 5257") === `DRAFT|${v5257}`, { status: r.status, detail: r.body?.detail });
  r = await call("POST", `/combinations/${vv}/forms/${C5257}/replace`, { version: v5257 }, "user-B");
  ok("C11.15 AT-13 refusal: Replace needs the author duty (approver 403)", r.status === 403);
  r = await call("POST", `/combinations/${vv}/forms/${C5257}/replace`, { version: v5257 });
  ok("C11.15 AT-13 [IRCC-F02] Replace compares the line with canada.ca: still the current edition, so nothing is replaced (US$0)", r.status < 300 && r.body?.outcome === "current" && lineOf(vv, "IMM 5257") === `DRAFT|${v5257}`, r.body);
  r = await call("DELETE", `/combinations/${vv}/forms/${C5257}`, { version: v5257 }, "user-B");
  ok("C11.15 AT-14 refusal: Remove needs the author duty (approver 403); the line stays", r.status === 403 && lineOf(vv, "IMM 5257").startsWith("DRAFT|"));
  r = await call("DELETE", `/combinations/${vv}/forms/${C5257}`, { version: v5257 });
  ok("C11.15 AT-14 Remove takes the form off this combination; it stays in the library", r.status < 300 && lineOf(vv, "IMM 5257").startsWith("RETIRED|") && sql(`select count(*) from gov_form_def where form_key='IMM 5257'`) === "1", lines(vv));
  r = await call("POST", `/combinations/${vv}/forms/undo`);
  ok("C11.15 AT-14 Undo brings the removed form back", r.status < 300 && lineOf(vv, "IMM 5257").startsWith("DRAFT|"), r.body);
  const C5409 = enc("IMM 5409"), v5409 = Number(lineOf(vv, "IMM 5409").split("|")[1]);
  await call("DELETE", `/combinations/${vv}/forms/${C5409}`, { version: v5409 });
  const again2 = await find(vv, "acc1115-find3");
  ok("C11.15 AT-15 Find again never attaches back a form a person removed (shown as removed, to Add back)",
    lineOf(vv, "IMM 5409").startsWith("RETIRED|") && (again2?.result?.attach ?? []).find((a: any) => a.code === "IMM 5409")?.line === "removed_by_person", { line: lineOf(vv, "IMM 5409") }); // eslint-disable-line @typescript-eslint/no-explicit-any

  // ------------------------------------------------ library: Retire; Delete only when unused
  r = await call("DELETE", `/library/forms/${C5257}`, { reason: "Not needed any more" });
  ok("C11.15 AT-16 refusal: Delete of a form in use is refused in plain words (409); it stays in the library", r.status === 409 && plain(r.body) && sql(`select count(*) from gov_form_def where form_key='IMM 5257'`) === "1", r.body?.detail);
  r = await call("DELETE", `/library/forms/${enc("IMM 5802")}`, { reason: "x" });
  ok("C11.15 AT-16 refusal: a delete without a reason is refused (400)", r.status === 400);
  const up1294 = await upload("imm1294e.pdf", readFileSync(join(IRCC, "imm1294e.pdf")), {});
  if (up1294.body?.runId) await ended(`/runs/${up1294.body.runId}`);
  if (sql("select count(*) from gov_form_def where form_key='IMM 1294'") !== "1") stop("the official IMM 1294 did not join the library");
  const C1294 = enc("IMM 1294");
  r = await call("POST", `/library/forms/${C1294}/retire`, { reason: "Not used by any combination (Sample)" });
  const change = r.body?.id;
  ok("C11.15 AT-17 Retire of a library form waits for a second person; nothing changes before", r.status < 300 && r.body?.status === "WAITING" && sql(`select retired_at is null from gov_form_def where form_key='IMM 1294'`) === "t", r.body);
  r = await call("POST", `/library/changes/${change}/approve`, { note: "mine" }, "user-A");
  ok("C11.15 AT-17 refusal: the author cannot approve their own retire", r.status >= 400 && r.status < 500 && sql(`select retired_at is null from gov_form_def where form_key='IMM 1294'`) === "t", r.status);
  r = await call("POST", `/library/changes/${change}/approve`, { note: "Checked (Sample)" }, "user-B");
  ok("C11.15 AT-17 a second person approves: the form is retired and no longer offered to attach", r.status < 300 && sql(`select retired_at is not null from gov_form_def where form_key='IMM 1294'`) === "t" && (await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 1294" })).status === 409, r.status);
  // P-116: Delete only what is used nowhere (pass case), with the second person when it was listed by IRCC.
  sql(`insert into gov_form_def (id, workspace_id, form_key, display_name, form_kind) select gen_random_uuid(), workspace_id, 'IMM 0102', 'Acceptance test form, listed only (Sample)', 'data_form' from gov_form_def where form_key='IMM 5409'`);
  const del = await call("DELETE", `/library/forms/${enc("IMM 0102")}`, { reason: "Acceptance test: used nowhere (Sample)" });
  const delOk = del.body?.status === "WAITING" ? await call("POST", `/library/changes/${del.body.id}/approve`, { note: "Checked (Sample)" }, "user-B") : del;
  ok("C11.15 AT-21 [P-116] Delete of a library form used nowhere is done (at once, or once a second person approves): it is gone from the library", del.status < 300 && delOk.status < 300 && sql("select count(*) from gov_form_def where form_key='IMM 0102' and retired_at is null") === "0", { del: [del.status, del.body?.status], approve: delOk.status });
  // P-116: Retire is refused while a current draft still uses the form, listing each use (here: Visitor visa's draft).
  const ret = await call("POST", `/library/forms/${C5257}/retire`, { reason: "Acceptance test: still in use (Sample)" });
  const retOk = ret.status < 300 && ret.body?.status === "WAITING" ? await call("POST", `/library/changes/${ret.body.id}/approve`, { note: "Checked (Sample)" }, "user-B") : null;
  const refusal = retOk ?? ret;
  ok("C11.15 AT-22 [P-116] refusal: Retire of a form a current draft still uses (IMM 5257 on Visitor visa) is refused, when proposed or when approved, naming the use in words; the form is not retired",
    refusal.status >= 400 && refusal.status < 500 && /Visitor visa/.test(JSON.stringify(refusal.body)) && sql(`select retired_at is null from gov_form_def where form_key='IMM 5257'`) === "t", { propose: [ret.status, ret.body?.status], approve: retOk?.status, words: String(refusal.body?.detail ?? "").slice(0, 160), retired: sql(`select retired_at is not null from gov_form_def where form_key='IMM 5257'`) });
  if (sql(`select retired_at is not null from gov_form_def where form_key='IMM 5257'`) === "t") sql(`update gov_form_def set retired_at = null, retired_by = null where form_key='IMM 5257'`); // put it back for the checks below

  // ------------------------------------------------ Who can be in this application: editable, rules on Save
  const ppl = (await call("GET", `/combinations/${vv}/workspace?tab=forms`)).body?.people;
  const toLine = (l: any) => ({ role: l.role, label: l.label, min: l.min, max: l.max, applies: l.applies, preview: l.preview }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const base = (ppl?.lines ?? []).map(toLine), ver = ppl?.version;
  const saved0 = sql(`select participants::text from combination where id='${vv}'`);
  const broken = base.map((l: any) => (l.role === "spouse_or_partner" ? { ...l, min: 2, max: 1 } : l)); // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: broken, version: ver });
  ok("C11.15 AT-18 refusal: Who can be in this application is checked on Save: fewest above most is refused in plain words (400), nothing saved",
    r.status === 400 && plain(r.body) && sql(`select participants::text from combination where id='${vv}'`) === saved0, r.body?.detail);
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: base, version: ver }, "user-B");
  ok("C11.15 AT-18 refusal: only an author edits it (approver 403)", r.status === 403);
  const edited = base.map((l: any) => (l.role === "child" ? { ...l, max: Math.min(9, (l.max ?? 1) + 1) } : l)); // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: edited, version: ver });
  ok("C11.15 AT-18 an author edits it: saved, the version moves on", r.status < 300 && Number(sql(`select participants_version from combination where id='${vv}'`)) === ver + 1, r.status);
  r = await call("PATCH", `/combinations/${vv}/people`, { participants: base, version: ver });
  ok("C11.15 AT-18 refusal: a save made on the old version is refused (409, plain words); the newer save stays", r.status === 409 && plain(r.body) && Number(sql(`select participants_version from combination where id='${vv}'`)) === ver + 1, r.body?.detail);

  // ------------------------------------------------ how IRCC accepts each attached form
  const wl = ((await call("GET", `/combinations/${vv}/workspace?tab=forms`)).body?.lines ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const recorded = wl.filter((l) => /^From the Form library/.test(l.acceptedBasis ?? ""));
  ok("C11.15 AT-19 [IRCC-F04] each attached form's way of filing is one the library records IRCC accepts (QA-104)",
    wl.length > 0 && recorded.every((l) => (l.accepted ?? []).includes(l.channel)), wl.map((l) => `${l.code}:${l.channel}:${(l.accepted ?? []).join("/")}`));

  ok("C11.15 AT-20 US$0: the whole file spent nothing (ledger unchanged, no live AI job)", (await committed()) === usd0 && sql("select count(*) from drafting_job where mode='LIVE'") === "0" && before !== null, { before: usd0, after: await committed() });

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { try { sql(`update gov_form_def set retired_at = null where form_key = 'IMM 5475'`); } catch { /* */ } console.error("FAIL  unexpected", e); process.exit(1); });
