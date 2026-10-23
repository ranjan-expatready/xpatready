// P5 case server (demonstration-only; plain Node, no framework): the client portal and the agent screens over one
// case record per case (p5/case/<id>/case.json), the released configuration c1-v3, one reader path for every upload
// and the PDF filler. Simulated users are labelled on screen.
//   node p5/server.ts [--port 4319] [--reader local|ai|hybrid]
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { ASSETS, BRAND } from "../p4/generate.ts";
import * as E from "./engine.ts";
import { readUpload } from "./reader/adapter.ts";

const arg = (n: string, d: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg("port", "4319"));
let READER_MODE = arg("reader", "hybrid") as "local" | "ai" | "hybrid";
const ROOT = join(import.meta.dirname, "case"), UI = join(import.meta.dirname, "ui");
const PY = join(E.PROTOTYPE, "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
const R = E.loadRelease();
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
mkdirSync(ROOT, { recursive: true });
export const USERS = { client: "Client A (simulated client)", "agent-1": "Case officer (simulated)", "consultant-1": "Licensed consultant (simulated)" } as Record<string, string>;

const dir = (id: string) => { if (!/^[a-z0-9-]+$/.test(id)) throw new Error("bad case id"); return join(ROOT, id); };
const load = (id: string): E.Case => JSON.parse(readFileSync(join(dir(id), "case.json"), "utf8"));
const save = (c: E.Case) => { mkdirSync(dir(c.case_id), { recursive: true }); writeFileSync(join(dir(c.case_id), "case.json"), JSON.stringify(c, null, 1) + "\n"); };
const cases = () => readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, "case.json"))).map(load);
const extractionOf = (c: E.Case, d: E.DocRecord) => (d.extraction_file ? JSON.parse(readFileSync(join(dir(c.case_id), d.extraction_file), "utf8")) : null);

function view(c: E.Case) {
  const items = c.items.map((i) => ({ ...i, person_label: c.people.find((p) => p.id === i.about)?.label ?? (i.about === "case" ? "The application" : i.about), fact_label: R.field.get(i.fact)?.meaning ?? i.fact }));
  const forms = E.formsFor(c, R);
  return {
    case: c, users: USERS, reader_mode: READER_MODE, release: { hash: R.hash, version: R.config.configuration_version, label: R.config.label },
    checklist: E.checklist(c, R), forms, condition_inputs: E.conditionInputs(c, R),
    questions: { principal: E.questions(c, R, "principal"), partner: E.questions(c, R, "partner") },
    items, open_items: items.filter((i) => !i.decision).length,
    facts: c.facts.filter((f) => f.status === "verified" || f.status === "proposed").map((f) => ({ ...f, label: R.field.get(f.fact)?.meaning ?? f.fact, section: E.sectionOf(R, f.fact) })),
  };
}

function configurator() {
  const cfg = R.config, rel = JSON.parse(readFileSync(join(E.RELEASE_DIR, "release.json"), "utf8"));
  return {
    release: rel, label: cfg.label, sources: cfg.sources, drafting_runs: cfg.drafting_run_ids,
    counts: { canonical_fields: cfg.canonical_fields.length, sections: cfg.sections.length, placements: cfg.placements.length, forms: cfg.forms.length, field_maps: cfg.field_maps.length, map_entries: cfg.field_maps.reduce((a: number, m: any) => a + m.entries.length, 0), document_requirements: cfg.document_requirements.length, rules: cfg.rules.length, derived_fields: cfg.derived_fields.length, checks: cfg.checks.length },
    sections: cfg.sections.map((s: any) => ({ title: s.title, meaning: s.meaning, facts: cfg.placements.filter((p: any) => p.section_id === s.id).length })),
    documents: cfg.document_requirements.map((d: any) => ({ type: d.document_type, who: d.who, base_or_conditional: d.base_or_conditional, status: d.status, when: d.condition_plain, quote: d.source_quote })),
    forms: cfg.forms.map((f: any) => ({ form: f.form_number, title: f.title, who: f.who, status: f.status, when: f.condition_plain })),
    sample_maps: cfg.field_maps.filter((m: any) => /IMM 1295/.test(m.form_edition)).flatMap((m: any) => m.entries.filter((e: any) => e.outcome === "mapped" && /intended|passport|family_name/.test(e.fact)).slice(0, 12).map((e: any) => ({ form: m.form_edition, box: e.data_path, person: e.person, fact: e.fact, transform: e.transform, confidence: e.confidence }))),
  };
}

/** Process every unprocessed upload of the case's open batch: duplicates by content hash, one reader path, person
 *  association, reconciliation. One unreadable or failing file never discards the others. */
function processBatch(c: E.Case, by: string) {
  const batch = c.batches;
  const t0 = Date.now(), summary: any[] = [];
  for (const d of c.documents.filter((x) => x.batch === batch && !x.extraction_file && x.processing !== "duplicate")) {
    const path = join(dir(c.case_id), d.file);
    try {
      const rr = readUpload(path, d.claimed_type, READER_MODE);
      const ex = { reader: rr.reader, method: rr.method, cached: rr.cached, cost_usd: rr.cost_usd, ms: rr.ms, refused: rr.refused ?? null, checks: rr.checks ?? null, run_file: rr.run_file ?? null, output: rr.output };
      d.extraction_file = `extractions/${d.doc_id}.json`; mkdirSync(join(dir(c.case_id), "extractions"), { recursive: true });
      writeFileSync(join(dir(c.case_id), d.extraction_file), JSON.stringify(ex, null, 1) + "\n");
      d.reader = rr.reader; d.kind_seen = rr.output.document.kind_seen; d.issues = [...rr.output.document.issues, ...(rr.refused ? [rr.refused] : [])];
      d.letter_date = rr.output.document.issued_or_written_on ?? null;
      if (rr.output.document.readable === "no") { d.processing = "unreadable"; d.association = "unreadable"; d.status = "Needs replacing"; d.status_reason = "the file cannot be read; please upload a clearer copy"; }
      else if (d.claimed_type !== "unknown" && !rr.output.document.matches_claimed_kind) { d.processing = "wrong_type"; d.status = "Needs replacing"; d.status_reason = `uploaded as ${d.claimed_type} but it is ${d.kind_seen}`; }
      else {
        d.processing = rr.cached ? "reused_cached_extraction" : "read";
        const a = E.associate(c, rr.output, d.for_person); d.about = a.about; d.association = a.association; d.association_reason = a.reason;
        if (a.association === "wrong_person") { d.status = "Needs replacing"; d.status_reason = a.reason; }
        else E.reconcile(c, R, d, rr.output, batch);
      }
      summary.push({ doc_id: d.doc_id, name: d.original_name, kind: d.kind_seen, about: d.about, association: d.association, processing: d.processing, reader: rr.method, cost_usd: rr.cost_usd });
    } catch (e) { d.processing = "failed"; d.issues = [(e as Error).message.slice(0, 200)]; summary.push({ doc_id: d.doc_id, name: d.original_name, processing: "failed", error: d.issues[0] }); }
  }
  c.events.push({ at: new Date().toISOString(), what: `batch ${batch} processed in ${Date.now() - t0} ms: ${summary.map((s) => `${s.name}=${s.processing}`).join(", ")}`, by });
  return { batch, ms: Date.now() - t0, files: summary };
}

function fill(c: E.Case, form: string, person: string, by: string) {
  const fv = E.formValues(c, R, form, person);
  const checks = E.formChecks(R, form, fv);
  const formFile = { "IMM 1295": "imm1295e.pdf", "IMM 5707": "imm5707e.pdf", "IMM 5409": "imm5409e.pdf", "IMM 5476": "imm5476e.pdf", "IMM 5475": "imm5475e.pdf", "IMM 5257 SCH1": "imm5257_1e.pdf" }[form];
  if (!formFile) throw new Error(`no fillable PDF for ${form}`);
  const name = `${form.replace(/\W+/g, "")}-${person}-${fv.values_sha256.slice(0, 8)}.pdf`;
  const out = join(dir(c.case_id), "outputs", name);
  const reqFile = join(dir(c.case_id), "outputs", `${name}.request.json`);
  mkdirSync(join(dir(c.case_id), "outputs"), { recursive: true });
  writeFileSync(reqFile, JSON.stringify({ form_file: formFile, values: fv.values, out }, null, 1));
  const p = spawnSync(PY, ["-I", join(import.meta.dirname, "fill.py"), reqFile], { encoding: "utf8", timeout: 120_000 });
  const report = JSON.parse(p.stdout.trim().split("\n").pop() ?? "{}");
  report.checks = checks; report.hand = fv.boxes.filter((b) => b.status === "hand").length; report.values_sha256 = fv.values_sha256; report.download = name;
  writeFileSync(join(dir(c.case_id), "outputs", `${name}.report.json`), JSON.stringify(report, null, 1));
  c.events.push({ at: new Date().toISOString(), what: `${by} filled ${form} for ${person}: ${report.read_back_equal}/${report.written} read back, intact ${report.intact}`, by });
  return { report, form: fv };
}

const body = (req: any): Promise<any> => new Promise((ok, bad) => { const ch: Buffer[] = []; req.on("data", (c: Buffer) => ch.push(c)); req.on("end", () => { try { const s = Buffer.concat(ch).toString("utf8"); ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } }); });
const send = (res: any, code: number, data: unknown, type = "application/json", extra: Record<string, string> = {}) => { res.writeHead(code, { "content-type": type, "cache-control": "no-store", ...extra }); res.end(type === "application/json" ? JSON.stringify(data) : data); };
const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const p = url.pathname;
    if (req.method === "GET" && (p === "/" || p === "/index.html" || p === "/app.js" || p === "/style.css")) { const f = p === "/" ? "index.html" : p.slice(1); return send(res, 200, readFileSync(join(UI, f)), MIME[extname(f)]); }
    const asset = p.startsWith("/brand/") ? p.slice(7) : null;
    if (req.method === "GET" && asset && Object.hasOwn(ASSETS, asset)) return send(res, 200, readFileSync(join(BRAND, ASSETS[asset])), asset.endsWith(".svg") ? "image/svg+xml" : asset.endsWith(".woff2") ? "font/woff2" : "font/otf");
    if (req.method === "GET" && p === "/api/configurator") return send(res, 200, configurator());
    // Load sample inputs (D274): the scripted made-up client's inputs and the synthetic files. The browser submits them
    // through the same upload and answer calls as a person would; nothing here reads, extracts or confirms anything.
    if (req.method === "GET" && p === "/api/samples") {
      const sc = JSON.parse(readFileSync(join(E.PROTOTYPE, "expected", "p5-case-c1.json"), "utf8"));
      const notes: Record<string, [number, string]> = { "D1-passport-principal-scan.png": [1, "principal's passport, flat scan"], "D2-passport-partner-photo.jpg": [1, "partner's passport, phone photo"], "D3-job-offer-principal.pdf": [1, "principal's job offer, PDF"], "D4-job-offer-partner-scan.jpg": [1, "partner's job offer, office scan"], "D5-birth-certificate-child.png": [1, "child's birth certificate"], "D6-passport-principal-unreadable.jpg": [1, "an unreadable photo"], "D7-passport-principal-mrz-conflict.png": [0, "a passport page that disagrees with itself"], "D8-job-offer-partner-revised.pdf": [2, "later batch: the partner's revised offer"] };
      const files = JSON.parse(readFileSync(join(E.PROTOTYPE, "p5", "reader", "docs", "manifest.json"), "utf8")).items.map((i: any) => ({ file: i.file, batch: notes[i.file]?.[0] ?? 0, note: notes[i.file]?.[1] ?? "" }));
      return send(res, 200, { label: sc.label, lead: sc.answers.filter((a: any) => a.step === "lead"), answers: sc.answers.filter((a: any) => a.step !== "lead"), staff_facts: sc.staff_facts, profile_facts: sc.profile_facts, changes: sc.changes, files });
    }
    if (req.method === "GET" && p === "/api/sample-file") {
      const f = url.searchParams.get("file") ?? "";
      const item = JSON.parse(readFileSync(join(E.PROTOTYPE, "p5", "reader", "docs", "manifest.json"), "utf8")).items.find((i: any) => i.file === f);
      if (!item) return send(res, 404, { error: "not a sample file" });
      return send(res, 200, readFileSync(join(E.PROTOTYPE, "p5", "reader", "docs", f)), item.media_type);
    }
    if (req.method === "GET" && p === "/api/cases") return send(res, 200, cases().map((c) => ({ case_id: c.case_id, people: c.people, created_at: c.created_at })));
    if (req.method === "GET" && p === "/api/state") return send(res, 200, view(load(url.searchParams.get("case") ?? "")));
    if (req.method === "GET" && p === "/api/form") { const c = load(url.searchParams.get("case")!); const fv = E.formValues(c, R, url.searchParams.get("form")!, url.searchParams.get("person")!); return send(res, 200, { ...fv, checks: E.formChecks(R, fv.form, fv), approvals: c.approvals.filter((a) => a.form === fv.form && a.person === url.searchParams.get("person")) }); }
    if (req.method === "GET" && p === "/api/download") {
      const c = load(url.searchParams.get("case")!); const f = url.searchParams.get("file")!;
      if (!/^[\w.-]+\.pdf$/.test(f)) return send(res, 400, { error: "bad file" });
      return send(res, 200, readFileSync(join(dir(c.case_id), "outputs", f)), "application/pdf", { "content-disposition": `attachment; filename="${f}"` });
    }
    if (req.method === "GET" && p === "/api/original") { const c = load(url.searchParams.get("case")!); const d = c.documents.find((x) => x.doc_id === url.searchParams.get("doc"))!; return send(res, 200, readFileSync(join(dir(c.case_id), d.file)), d.media_type); }
    if (req.method === "GET" && p === "/api/extraction") { const c = load(url.searchParams.get("case")!); const d = c.documents.find((x) => x.doc_id === url.searchParams.get("doc"))!; return send(res, 200, extractionOf(c, d)); }
    if (req.method !== "POST") return send(res, 404, { error: "not found" });
    const b = await body(req);
    if (p === "/api/reader-mode") { if (!["local", "ai", "hybrid"].includes(b.mode)) return send(res, 400, { error: "mode" }); READER_MODE = b.mode; return send(res, 200, { ok: true, mode: READER_MODE }); }
    if (p === "/api/lead/check") {
      // Duplicate check (6.2): same family name + given names + date of birth on any existing case, or same e-mail.
      const hits = cases().flatMap((c) => c.people.map((pp) => ({ c, pp, id: E.identityOf(c, pp.id), email: E.current(c, "person.email_address", pp.id)?.value })))
        .filter((x) => (x.id.family && E.norm(x.id.family) === E.norm(b.family) && E.norm(x.id.given) === E.norm(b.given)) || (b.email && x.email && E.norm(x.email) === E.norm(b.email)))
        .map((x) => ({ case_id: x.c.case_id, person: x.pp.id, label: x.pp.label, family: x.id.family, given: x.id.given, dob: x.id.dob, same_dob: !!(x.id.dob && x.id.dob === b.dob), same_email: !!(b.email && x.email && E.norm(x.email) === E.norm(b.email)) }));
      return send(res, 200, { matches: hits, rule: "a name match alone is never treated as the same person; staff decide" });
    }
    if (p === "/api/case/open") {
      const id = `case-${(cases().length + 1).toString().padStart(3, "0")}`;
      const c = E.newCase(id, R, b.people, b.by);
      for (const a of b.lead ?? []) E.propose(c, a.fact, a.about, a.value, { kind: "lead", by: b.by_client ?? "client" }, a.row);
      c.events.push({ at: new Date().toISOString(), what: `duplicate decision: ${b.duplicate_decision ?? "no possible duplicates found"}`, by: b.by });
      save(c); return send(res, 200, { ok: true, case_id: id });
    }
    const c = load(b.case);
    let out: any = { ok: true };
    if (p === "/api/answer") {
      // A client's answer is a proposal. If staff already verified a different value, the answer opens a review item
      // instead of replacing it (8.1: a client correction never silently replaces a verified value).
      const ver = E.verified(c, b.fact, b.about, b.row), cur = E.current(c, b.fact, b.about, b.row);
      if (cur && E.same(cur.value, b.value) && (b.by === "client" || cur.status === "verified")) out = { ok: true, unchanged: true };
      else if (ver && !E.same(ver.value, b.value) && b.by === "client") {
        const it: E.Item = { id: `i-${sha(String(Math.random())).slice(0, 8)}`, batch: c.batches, doc_id: "", fact: b.fact, about: b.about, section: E.sectionOf(R, b.fact), kind: "conflict", value: b.value, current: { record_id: ver.id, value: ver.value, status: ver.status, source: ver.source }, reason: "the client changed an answer staff had verified; a person decides" };
        c.items.push(it); out = { ok: true, review_item: it.id };
      } else if (b.by === "client") E.propose(c, b.fact, b.about, b.value, { kind: "questionnaire", by: "client" }, b.row);
      else E.verify(c, R, b.fact, b.about, b.value, { kind: b.kind ?? "staff", by: b.by }, b.by, b.row, b.note);
    } else if (p === "/api/upload") {
      if (b.new_batch || !c.batches) c.batches += 1;
      const bytes = Buffer.from(b.data_base64, "base64"), h = sha(bytes);
      const ext = ({ "image/png": ".png", "image/jpeg": ".jpg", "application/pdf": ".pdf" } as Record<string, string>)[b.media_type] ?? ".bin";
      const dup = c.documents.find((d) => d.sha256 === h && d.processing !== "duplicate");
      const doc: E.DocRecord = { doc_id: `doc-${(c.documents.length + 1).toString().padStart(2, "0")}`, sha256: h, file: `files/${h}${ext}`, original_name: String(b.name).slice(0, 120), media_type: b.media_type, uploaded_by: b.by === "client" ? "client" : "agent", uploaded_at: new Date().toISOString(), batch: c.batches, claimed_type: b.claimed_type ?? "unknown", ...(b.for_person ? { for_person: b.for_person } : {}), processing: dup ? "duplicate" : "read", ...(dup ? { duplicate_of: dup.doc_id, kind_seen: dup.kind_seen, about: dup.about, association: dup.association } : {}), status: "Received" };
      mkdirSync(join(dir(c.case_id), "files"), { recursive: true });
      if (!existsSync(join(dir(c.case_id), doc.file))) writeFileSync(join(dir(c.case_id), doc.file), bytes); // originals are kept, never edited
      if (dup) doc.status_reason = `same file as ${dup.doc_id} (identical content); nothing re-read, no new facts or tasks`;
      c.documents.push(doc); out = { ok: true, doc_id: doc.doc_id, duplicate_of: dup?.doc_id ?? null, batch: c.batches };
    } else if (p === "/api/batch/process") out = processBatch(c, b.by);
    else if (p === "/api/decide") out = E.decide(c, R, b.ids, b.action, b.by, b.value, b.note);
    else if (p === "/api/document/assign") { const d = c.documents.find((x) => x.doc_id === b.doc_id)!; out = { ok: true, items: E.assignDocument(c, R, b.doc_id, b.person, b.by, extractionOf(c, d).output).length }; if (d.status === "Needs replacing" && b.person) { d.status = "Received"; d.status_reason = undefined; } }
    else if (p === "/api/document/status") { const d = c.documents.find((x) => x.doc_id === b.doc_id)!; d.status = b.status; d.status_reason = b.reason; c.events.push({ at: new Date().toISOString(), what: `${b.by} set ${d.doc_id} to ${b.status}${b.reason ? `: ${b.reason}` : ""}`, by: b.by }); }
    else if (p === "/api/confirm-section") {
      // Confirm the clean, reviewed answers of one person's section together (no click per clean field).
      const recs = c.facts.filter((f) => f.status === "proposed" && f.about === b.about && E.sectionOf(R, f.fact) === b.section && !c.items.some((i) => !i.decision && i.fact === f.fact && i.about === f.about && i.kind !== "new" && i.kind !== "corroborates"));
      for (const f of recs) E.verify(c, R, f.fact, f.about, f.value, f.source, b.by, f.row);
      for (const i of c.items.filter((i) => !i.decision && i.about === b.about && i.section === b.section && (i.kind === "new" || i.kind === "corroborates"))) i.decision = { action: "confirm", by: b.by, at: new Date().toISOString(), note: "section confirmed" };
      c.events.push({ at: new Date().toISOString(), what: `${b.by} confirmed ${recs.length} value(s) in ${b.section} for ${b.about}`, by: b.by }); out = { ok: true, confirmed: recs.length };
    } else if (p === "/api/form/fill") out = fill(c, b.form, b.person, b.by);
    else if (p === "/api/form/approve") out = { ok: true, approval: E.approve(c, R, b.form, b.person, b.by) };
    else return send(res, 404, { error: "not found" });
    save(c);
    return send(res, 200, out);
  } catch (e) { return send(res, 500, { error: (e as Error).message }); }
}).listen(PORT, "127.0.0.1", () => console.log(`P5 case server on http://localhost:${PORT} (release c1-v3 ${R.hash.slice(0, 8)}, reader ${READER_MODE})`));
