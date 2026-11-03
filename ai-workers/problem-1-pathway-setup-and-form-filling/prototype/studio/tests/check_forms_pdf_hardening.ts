// PDF ingestion hardening (forms lane, Lead brief 26 Oct): every official PDF of the two demo combinations (DEMO.md: A
// visitor visa, B LMIA work permit) goes through the one intake with no AI, its code, printed edition and checksum read
// from the file and compared with the official manifest; the mapping is replayed from a saved AI answer (REPLAY, US$0)
// and the validator passes. Then hostile and awkward files, each refused or held with a plain reason and nothing used
// silently. A passing and a failing case per rule. Isolated copy, no browser, NO model call (US$0). Hostile files are
// generated here, deterministically, into the copy's own working folder (gitignored); none is committed.
//   C2.1 code, edition, published date and checksum read without AI · C2.2 a file not on the approved list is held
//   C2.3 held files wait for a person · C3.1 the saved AI answer replayed and applied · C9.1 an older edition is not used
//   zsh studio/tools/isolated.sh forms_pdf 4450 start && tsx studio/tests/check_forms_pdf_hardening.ts 4450 xr_studio_forms_pdf
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validate } from "../engine/validate.ts";
import { acceptCleanOneByOne } from "./lib/accept-draft.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_pdf";
const NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", "..");
const OFFICIAL = join(SOLUTION, "official-sources", "ircc");
const WORK = join(STUDIO, "var", `isolated-${NAME}`, "hostile"); // the copy's own working folder: removed by its next start
const PY = join(SOLUTION, "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
let pass = 0, fail = 0, last = "(before the first step)";
const ok = (name: string, c: unknown, detail?: unknown) => { last = name; c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const intakeAll = async (files: [string, Buffer][], combinationId?: string, actor = "user-A"): Promise<Res> => {
  const fd = new FormData(); for (const [name, bytes] of files) fd.append("files", new Blob([new Uint8Array(bytes)]), name); if (combinationId) fd.append("combinationId", combinationId);
  const r = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const intake = async (name: string, bytes: Buffer, combinationId?: string) => (await intakeAll([[name, bytes]], combinationId)).body?.results?.[0];
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const until = async (fn: () => Promise<boolean>, ms = 180_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const official = (path: string) => readFileSync(join(OFFICIAL, path));
const plainWords = (m: unknown) => typeof m === "string" && m.length > 20 && !/error|exception|traceback|undefined|null|\[object/i.test(m);

/** A one-page PDF built by hand (title and one line of text), optionally with an XFA template and no page text. */
function pdf(title: string, text: string, xfa?: string) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R" + (xfa ? " /AcroForm 7 0 R" : "") + " >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  if (xfa) { objs.push("<< /Fields [] /XFA [(template) 8 0 R] >>"); objs.push(`<< /Length ${Buffer.byteLength(xfa, "latin1")} >>\nstream\n${xfa}\nendstream`); }
  let out = "%PDF-1.7\n"; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
/** A password-protected copy of a PDF (pypdf, RC4-128: needs no extra package), written in the copy's working folder. */
function encrypted(bytes: Buffer) {
  mkdirSync(WORK, { recursive: true });
  const src = join(WORK, "plain.pdf"), dst = join(WORK, "encrypted.pdf");
  writeFileSync(src, bytes);
  execFileSync(PY, ["-I", "-c", "import sys,pypdf\nw=pypdf.PdfWriter(clone_from=sys.argv[1])\nw.encrypt(sys.argv[3],sys.argv[4],algorithm='RC4-128')\nw.write(sys.argv[2])", src, dst, "sample-open", "sample-owner"], { stdio: ["ignore", "pipe", "pipe"] });
  return readFileSync(dst);
}

// The demo's official PDFs (DEMO.md): A visitor visa; B LMIA work permit (IMM 1295 new, the rest reused or its own sources).
const A = ["forms/imm5257e.pdf", "forms/imm5707e.pdf", "forms/imm5476e.pdf", "checklists/imm5484e.pdf", "checklists/IMM5881E.pdf"];
const B = ["forms/imm1295e.pdf", "forms/imm5409e.pdf", "forms/imm5475e.pdf", "forms/imm5257_1e.pdf", "checklists/imm5488e.pdf", "instructions/IMM5905E.pdf"];
/** Where the printed edition differs from the manifest's label; the intake reads what is printed (reported to the Lead). */
const PRINTED_NOT_MANIFEST: Record<string, string> = { "IMM 5475": "IMM 5475 (05-2021)" };

(async () => {
  try {
    const manifest = JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")).items as { file: string; path: string; sha256: string; edition: string }[];
    const item = (p: string) => manifest.find((i) => i.path === p)!;
    const expected = (p: string) => { const m = /^(IMM \d{4}(?: SCH1)?)(?: E)? \((\d{2}-\d{4})\)/.exec(item(p).edition); return m ? { code: m[1], label: `${m[1]} (${m[2]})` } : null; };

    // ─────────────────────────────── a) the two combinations' official PDFs through the one intake, no AI
    await call("POST", "/demo/reset", { confirm: "RESET" });
    let r = await intakeAll([...A, ...B].map((p) => [p.split("/").pop()!, official(p)]));
    const res = r.body?.results ?? [];
    ok("setup: one batch of the 11 official PDFs of combinations A and B goes through the intake (library door)", r.status === 201 && res.length === 11, r.body?.summary);
    for (const [i, p] of [...A, ...B].entries()) {
      const x = res[i] ?? {}, want = expected(p)!, kindWanted = p.startsWith("forms/") ? "form" : "checklist";
      const edition = PRINTED_NOT_MANIFEST[want.code] ?? want.label;
      ok(`C2.1: ${p.split("/").pop()} read without AI: code ${want.code}, printed edition ${edition}, checksum as the manifest, ${kindWanted}, added to the library`, x.outcome === "added" && x.code === want.code && x.edition === edition && x.sha256 === item(p).sha256 && x.kind === kindWanted && /^\d{4}-\d{2}-\d{2}$/.test(x.published ?? ""), { outcome: x.outcome, code: x.code, edition: x.edition, kind: x.kind, published: x.published });
    }
    ok("C2.1: the printed edition is read from the file, not copied from the manifest: IMM 5475 prints (05-2021) where the manifest label says (12-2022)", res[A.length + 2]?.edition === "IMM 5475 (05-2021)" && /12-2022/.test(item("forms/imm5475e.pdf").edition), item("forms/imm5475e.pdf").edition);
    ok("C2.1: no AI step ran for any of them (no drafting job, no AI work)", sql("select count(*) from drafting_job") === "0" && sql("select count(*) from ai_batch") === "0");
    const editions = sql("select count(*) from form_edition");
    r = await intakeAll([...A, ...B].map((p) => [`again-${p.split("/").pop()}`, official(p)]));
    ok("C2.1 fail: the same 11 files again are each \"in the library\": nothing duplicated, no new library row", (r.body?.results ?? []).every((x: { outcome: string }) => x.outcome === "in_library") && sql("select count(*) from form_edition") === editions, r.body?.summary);
    r = await intakeAll([["twice-a.pdf", official("forms/imm1344e.pdf")], ["twice-b.pdf", official("forms/imm1344e.pdf")]]);
    ok("C2.1 fail: two copies of one new form in one batch: added, then in the library; one library row", r.body?.results?.[0]?.outcome === "added" && r.body.results[1]?.outcome === "in_library" && sql("select count(*) from form_edition where edition_label='IMM 1344 (09-2024)'") === "1", r.body?.results?.map((x: { outcome: string }) => x.outcome));

    // ─────────────────────────────── b) hostile and awkward files: refused or held with a plain reason, never used silently
    const beforeRows = () => sql("select count(*) from form_edition") + "/" + sql("select count(*) from gov_form_def");
    let rows = beforeRows();
    // A real dynamic XFA form that prints its edition nowhere next to its code (IMM 5669, on the manifest): since C11.7
    // (P-297 (2)) the edition is read from the form template's own Version variable, and the intake says so. A coded XFA
    // form with no edition anywhere is still held (dynamic-coded.pdf below).
    let x = await intake("imm5669e.pdf", official("forms/imm5669e.pdf"));
    ok("C2.1 (C11.7): the official IMM 5669, a dynamic XFA form with no printed edition, is added with the edition from its form template (05-2021), said in plain words, no crash", x?.outcome === "added" && x.edition === "IMM 5669 (05-2021)" && x.editionFrom === "form_template" && /template/.test(x.message) && plainWords(x.message), x?.message);
    rows = beforeRows();
    x = await intake("dynamic.pdf", pdf("", "", '<template xmlns="http://www.xfa.org/schema/xfa-template/3.3/"><subform name="form1"><draw><value><text>Please wait...</text></value></draw></subform></template>'));
    ok("C2.2: an XFA-only form with no code anywhere is held (\"no form code\"), not added", x?.outcome === "held" && /no form code/.test(x.message) && beforeRows() === rows, x?.message);
    x = await intake("dynamic-coded.pdf", pdf("IMM 9998 E: Sample dynamic form", "", '<template xmlns="http://www.xfa.org/schema/xfa-template/3.3/"><subform name="form1"><draw><value><text>IMM 9998 Sample form</text></value></draw></subform></template>'));
    ok("C2.2: an XFA form with a code but no printed edition is held (\"no edition date\"), not added", x?.outcome === "held" && x.code === "IMM 9998" && /no edition date/.test(x.message) && beforeRows() === rows, x?.message);
    // Password-protected.
    x = await intake("protected.pdf", encrypted(pdf("IMM 9997 E: Sample protected form", "IMM 9997 (01-2026) E")));
    ok("C2.2: a password-protected PDF is held and says it is password-protected (no crash, nothing read)", x?.outcome === "held" && /password-protected/.test(x.message) && plainWords(x.message) && beforeRows() === rows, x?.message);
    // Damaged: an official form cut to its first third, and a PDF header followed by noise.
    const full = official("forms/imm5257e.pdf");
    x = await intake("imm5257e-cut.pdf", full.subarray(0, Math.floor(full.length / 3)));
    ok("C2.2: a truncated PDF is held (not on the approved list, or unreadable), never added or crashing", x?.outcome === "held" && plainWords(x.message) && beforeRows() === rows, x?.message);
    const noise = Buffer.concat([Buffer.from("%PDF-1.7\n", "latin1"), createHash("sha512").update("noise").digest(), Buffer.alloc(4000, 0x5a)]);
    x = await intake("noise.pdf", noise);
    ok("C2.2: a damaged PDF (a header and noise) is held with \"could not be opened as a PDF\", no error class shown", x?.outcome === "held" && /could not be opened as a PDF/.test(x.message) && plainWords(x.message), x?.message);
    // A wrong form: the file name says IMM 5257, the content is IMM 5409.
    x = await intake("imm5257e.pdf", official("forms/imm5409e.pdf"));
    ok("C2.1 fail: a file named like one form but holding another is read by its content (IMM 5409), never by its name", x?.code === "IMM 5409" && x.outcome === "in_library", { code: x?.code, outcome: x?.outcome });
    // An older edition of a form the library has.
    x = await intake("imm5476e-2021.pdf", official("previous-editions/imm5476e-2021.pdf"));
    ok("C9.1: an older edition (IMM 5476 2021 under the library's 11-2025) is kept aside: \"Older edition: not used\"", x?.outcome === "older_edition_held" && /Older edition: not used/.test(x.message) && sql("select count(*) from form_edition where edition_label='IMM 5476 (11-2021)'") === "0", x?.message);
    x = await intake("imm5257e-pre-2023.pdf", official("previous-editions/imm5257e-pre-2023.pdf"));
    ok("C9.1: a second older edition (IMM 5257 2019) is kept aside too, not added", x?.outcome === "older_edition_held" && beforeRows() === rows, x?.edition);
    // An off-list file: the official IMM 5257 with one extra comment line (same form, a checksum not on the manifest).
    const offList = Buffer.concat([full, Buffer.from("\n% hardening check: not the official file\n", "latin1")]);
    x = await intake("imm5257e-modified.pdf", offList);
    ok("C2.2: an off-list file (same code and edition, other checksum) is held for source verification: not added, attached or sent to AI", x?.outcome === "held" && /not on the approved source list/.test(x.message) && beforeRows() === rows, x?.message);
    const held = (await call("GET", "/intake/held")).body as { sha256: string; reason: string }[];
    ok("C2.3: the held files wait in the To review list with their reason", held.some((h) => h.sha256 === sha(offList) && /approved source manifest/.test(h.reason)) && held.some((h) => /could not read/i.test(h.reason ?? "")), held.length);
    x = await intake("imm5257e-modified-again.pdf", offList);
    ok("C2.2 fail: the same off-list file again is \"already waiting\": one held record, not two", /Already waiting for a person/.test(x?.message) && sql(`select count(*) from intake_item where sha256='${sha(offList)}' and status='HELD'`) === "1", x?.message);
    // French: a French version prints the English edition's code and edition.
    x = await intake("imm5257f.pdf", pdf("IMM 5257 F : Demande de visa de r\xe9sident temporaire (visa de visiteur)", "IMM 5257 (09-2023) F"));
    ok("C2.2: a French version (IMM 5257 (09-2023) F) is held as the French version, never taken for the English edition", x?.outcome === "held" && x.edition === "IMM 5257 (09-2023)" && /French version of IMM 5257 \(09-2023\)/.test(x.message) && x.title?.startsWith("Demande") && beforeRows() === rows, { message: x?.message, title: x?.title });
    const frId = sql(`select id from intake_item where file_name='imm5257f.pdf' and status='HELD'`);
    await call("PATCH", `/intake/held/${frId}`, { irccPage: "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/demande/formulaires-demande-guides/imm5257.html" });
    r = await call("POST", `/intake/held/${frId}/approve`, {}, "user-C");
    ok("C2.3 fail: a French version cannot be approved as the English edition's source (409, plain reason)", r.status === 409 && /French version/.test(r.body?.detail) && sql("select count(*) from approved_source") === "0", r.body?.detail);
    x = await intake("liste.pdf", pdf("IMM 5484 F : Liste de contr\xf4le des documents", "IMM 5484 (05-2026) F"));
    ok("C2.2: a French checklist is read as a checklist and held as a French version", x?.kind === "checklist" && x.outcome === "held" && /French version/.test(x.message), { kind: x?.kind, message: x?.message });
    // Not a PDF, empty, a path in the name, too large.
    x = await intake("notes.pdf", Buffer.from("PK\x03\x04 this is a zip archive, not a PDF", "latin1"));
    ok("C2.2: not a PDF (whatever its name) is refused before anything reads it", x?.outcome === "refused" && /Only PDF files and saved web pages/.test(x.message), x?.message);
    x = await intake("empty.pdf", Buffer.alloc(0));
    ok("C2.2: an empty file is refused, or rejected as no file, with a plain reason", (x?.outcome === "refused" && /empty/.test(x.message)) || x === undefined, x?.message);
    x = await intake("../../../etc/imm5707e.pdf", official("forms/imm5707e.pdf"));
    ok("C2.1: a path in the file name is cut to its last part (the file is stored only in the intake folder)", x?.file === "imm5707e.pdf" && x.outcome === "in_library", x?.file);
    r = await intakeAll([["big.pdf", Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(26 * 1024 * 1024, 0x20)])]]);
    ok("C2.2: a file over 25 MB is refused with a plain 413, not a server error", r.status === 413 && plainWords(r.body?.detail), { status: r.status, detail: r.body?.detail });
    // One bad file in a batch: the others still go through.
    rows = beforeRows();
    r = await intakeAll([["readme.txt", Buffer.from("plain text")], ["imm5257e-cut-again.pdf", full.subarray(0, 50_000)], ["imm1294e.pdf", official("forms/imm1294e.pdf")]]);
    const outs = (r.body?.results ?? []).map((y: { outcome: string }) => y.outcome);
    ok("C2.2: a batch with bad files: each file gets its own result; the good one is added", r.status === 201 && outs.join() === "refused,held,added" && r.body.summary.refused === 1 && r.body.summary.held === 1 && r.body.summary.added === 1, outs);
    ok("C2.2: only the good file of the batch changed the library (one new form, one edition)", beforeRows() !== rows && sql("select count(*) from form_edition where edition_label='IMM 1294 (06-2026)'") === "1");
    ok("C2.2: no held, refused or failed file of this run reached a drafting job (nothing sent to AI)", sql("select count(*) from drafting_job") === "0");
    ok("C2.2: no upload ever ended as \"failed\" (an unexpected server error)", sql("select count(*) from intake_item where outcome='failed'") === "0", sql("select outcome, count(*) from intake_item group by 1"));

    // ─────────────────────────────── on a combination: held files are never attached; in-library files attach once
    await call("POST", "/demo/reset", { confirm: "RESET" });
    r = await call("POST", "/demo/load");
    ok("setup: the demo combinations load through the same intake", r.status === 201, r.body?.seconds);
    const vv = sql("select id from combination where label='Visitor visa' limit 1"), lm = sql("select id from combination where label='With an LMIA' limit 1");
    const attached = (id: string) => sql(`select count(*) from source_attachment where combination_id='${id}'`);
    let n = attached(vv);
    r = await intakeAll(A.map((p) => [p.split("/").pop()!, official(p)]), vv);
    ok("C2.1: A's official PDFs uploaded again on Visitor visa are in the library (or attached once), never duplicated", (r.body?.results ?? []).every((y: { outcome: string }) => y.outcome === "in_library") && Number(attached(vv)) === Number(n) + 1 && (r.body.results as { message: string }[]).filter((y) => /Already attached/.test(y.message)).length === 4, r.body?.results?.map((y: { message: string }) => y.message.slice(-40)));
    n = attached(lm);
    r = await intakeAll(B.map((p) => [p.split("/").pop()!, official(p)]), lm);
    ok("C2.1: B's official PDFs uploaded again on the LMIA combination are in the library and already attached", (r.body?.results ?? []).every((y: { outcome: string }) => y.outcome === "in_library") && attached(lm) === n, r.body?.summary);
    n = attached(vv);
    x = await intake("imm5257e-modified.pdf", offList, vv);
    ok("C2.2 fail: an off-list file uploaded on a combination is held and NOT attached (no source row, so it cannot be read or drafted)", x?.outcome === "held" && !x.attachmentId && attached(vv) === n, x?.message);

    // ─────────────────────────────── a) continued: the mapping replayed from a saved AI answer (US$0), then the validator
    const plan = (await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [vv] }, mode: "REPLAY" })).body;
    const t5257 = plan.targets?.find((t: { source: string }) => /^IMM 5257 \(/.test(t.source));
    ok("C3.1: the plan for Visitor visa replays the saved AI answer for IMM 5257 (no model call, US$0)", t5257?.action === "reuse_saved_output" && plan.totals.model_calls === 0 && plan.totals.worst_usd === 0, t5257?.why);
    r = await call("POST", "/ai/batches", { scope: { kind: "combination", ids: [vv] }, mode: "REPLAY", idempotencyKey: `hardening-${Date.now()}`, planSha256: plan.plan_sha256 });
    const batchId = r.body?.id;
    await until(async () => ["COMPLETED", "PARTIAL", "FAILED"].includes((await call("GET", `/ai/batches/${batchId}`)).body?.status));
    const batch = (await call("GET", `/ai/batches/${batchId}`)).body;
    const replay = batch.jobs?.find((j: { kind: string }) => j.kind === "field_map");
    ok("C3.1: the replay completes at US$0 (REPLAY mode) and the library form is added with no AI", batch.status === "COMPLETED" && replay?.mode === "REPLAY" && replay.status === "COMPLETED" && batch.spent_usd === 0, { status: batch.status, message: replay?.message });
    const job = (await call("GET", `/jobs/${replay.id}`)).body;
    await acceptCleanOneByOne(call, replay.id, ["REUSE", "NEW"], "user-C");
    for (const it of ((await call("GET", `/jobs/${replay.id}`)).body.items as { id: string; decision: string }[]).filter((i) => i.decision === "PENDING"))
      await call("POST", `/jobs/${replay.id}/items/${it.id}`, { decision: "RETURNED", note: "Hardening check: left for a person." }, "user-C");
    r = await call("POST", `/jobs/${replay.id}/apply`, {});
    ok("C3.1: the replayed draft is decided and applied to the configuration (every entry from the saved answer)", r.status === 201 && r.body.boxes > 0 && r.body.edition === "IMM 5257 (09-2023)", { items: job.items?.length, applied: r.body });
    const cfg = (await call("GET", `/combinations/${vv}/config?mode=draft`)).body.snapshot;
    const lib = sql("select distinct canonical_field_key || '|' || value_type from canonical_field where status <> 'RETIRED'").split("\n").filter(Boolean).map((l) => { const [key, valueType] = l.split("|"); return { key, valueType }; });
    const problems = validate(cfg, lib, (cfg.derived_fields ?? []).map((d: { id: string; calculation: string }) => ({ id: d.id, calculation: d.calculation })));
    const mapErrors = problems.filter((p) => p.level === "error" && (p.where.startsWith("Field map") || p.where === "Forms"));
    ok("C3.1: the validator passes the replayed field map: every mapped form field reads a library field (no field-map or form error)", cfg.field_maps.some((m: { form_number: string }) => m.form_number === "IMM 5257") && mapErrors.length === 0, mapErrors.slice(0, 2));
    const bad = { ...cfg, field_maps: cfg.field_maps.map((m: { form_number: string; entries: { outcome: string; fact?: string }[] }, i: number) => i ? m : { ...m, entries: [{ ...m.entries.find((e) => e.outcome === "mapped"), fact: "person.not_in_the_library" }, ...m.entries] }) };
    ok("C3.1 fail: the same validator refuses a field map that reads a field not in the library", validate(bad, lib, []).some((p) => p.level === "error" && /person\.not_in_the_library, which is not in the library/.test(p.message)));
    const review = (await call("GET", `/combinations/${lm}`)).body;
    ok("C3.1: combination B (IMM 1295 new, the rest reused) passes the same validator with no field-map error", !(review.draft?.problems ?? []).some((p: { level: string; where: string }) => p.level === "error" && p.where.startsWith("Field map")), (review.draft?.problems ?? []).filter((p: { level: string }) => p.level === "error").slice(0, 2));
  } catch (e) {
    ok(`no crash (last step: ${last})`, false, (e as Error).stack?.slice(0, 600));
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
