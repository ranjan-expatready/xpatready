// B170i (P-469, P-464, P-465, P-467, P-470, P-474, P-506 D6): the writer trial. A decision gate, not a swap: nothing here
// changes the app's fill step (api/src/fill.ts) or the engine (packages/xfa-engine). For every Paper form the latest
// releases fill, it fills the same box values twice, from the same Sample facts:
//   ours:   the app's own step, writeForm (api/src/fill.ts: value step, then p5/fill.py writes, reads back and checks);
//   theirs: the same value step, the same data written into the form's data part, then the engine's incremental write
//           (openXfaPdf + withPacket, packages/xfa-engine). The engine has no page-field writer, so a static form's page
//           fields (shown outside Adobe) are not set on its copy.
// Then both copies are read by our reader (tools/xfa_writer_trial_check.py) and by the engine's, and compared leaf by
// leaf. Also: the engine's form-script part on each blank (does it read the form, or refuse it, and why), and the
// form's own barcode texts on both copies where the engine reads the form. Test PDFs stay out of git (var/, --out).
// Usage (an isolated copy after Demo › Load the finished story; the API answers on STUDIO_URL):
//   cd prototype/studio && DATABASE_URL=postgresql://xr_studio@127.0.0.1:54329/<db> STUDIO_URL=http://localhost:<port> \
//     TSX_TSCONFIG_PATH=api/tsconfig.json node --import tsx tools/xfa-writer-trial.ts --out <dir> [--runs 5] [--story-only]
// Prints one JSON document (the per-form rows of design/xfa-writer-trial-2026-11-13.md) and writes it to <dir>/trial.json.
// --story-only: only the engine-written copy of the finished story's Paper IMM 5257 (<dir>/story-engine.pdf), for Adobe
// Validate on the Mac (tools/xfa-writer-trial-mac.sh).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { performance } from "node:perf_hooks";
import { Db, PROTOTYPE, PY, ROOT, SOLUTION, STUDIO } from "../api/src/core.ts";
import { solutionFile, writeForm } from "../api/src/fill.ts";
import { SAMPLE_CASE } from "../api/src/sample-case.ts";
import { copiesWithHash } from "../api/src/sample-validated.ts";
import { formValues } from "../engine/form-values.ts";
import { personSteps } from "../engine/form-steps.ts";
import { pdfMapInUse } from "../engine/programs.ts";

const ENGINE = join(ROOT, "packages", "xfa-engine");
// The engine is its own package (built with `npm ci && npm run build` in packages/xfa-engine); its XML parser is its own.
const X = await import(join(ENGINE, "dist", "index.js"));
const { DOMParser, XMLSerializer } = await import(join(ENGINE, "node_modules", "@xmldom", "xmldom", "lib", "index.js"));
const XDATA = "http://www.xfa.org/schema/xfa-data/1.0/";
/** One field map as a release snapshot carries it (engine/snapshot.ts), the parts this trial reads. */
type PdfMap = { form_number: string; form_edition?: string | null; channel?: string | null; official_file?: string | null; inventory_file?: string | null; form_sha256?: string | null; entries: any[] };
const mapOf = (snapshot: any, form: string) => pdfMapInUse<PdfMap>(snapshot.field_maps as PdfMap[], form);
const PACKS = join(ENGINE, "src", "__tests__", "fixtures", "form-data");
const { values: opt } = parseArgs({ options: { out: { type: "string" }, runs: { type: "string" }, "story-only": { type: "boolean" } } });
const OUT = resolve(opt.out ?? join(STUDIO, "var", "xfa-writer-trial")); mkdirSync(OUT, { recursive: true });
const RUNS = Math.max(1, Number(opt.runs ?? 5));
const API = process.env.STUDIO_URL ?? "http://localhost:4400";
const SOURCES = join(SOLUTION, "official-sources", "ircc");
const MANIFEST = new Map<string, string>((JSON.parse(readFileSync(join(SOURCES, "manifest.json"), "utf8")).items as { file: string; path: string }[]).map((i) => [i.file, i.path]));
const blankOf = (file: string) => join(SOURCES, MANIFEST.get(file)!);
const sha = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");
const ms = (t0: number) => Math.round((performance.now() - t0) * 10) / 10;

// ---- the engine's side: the same data written into the data part, then its incremental write ----
/** p1/e5_roundtrip.py new_datasets, in TypeScript on the engine's XML parser: each data path made if missing ("[*]" is
 *  row 0), its children removed, its text set. What a swap would need beside the engine (the engine has no such step
 *  outside its form-script part, which reads 2 of our forms). */
function newDatasets(xml: string, values: Record<string, string>): string {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const data = [...doc.getElementsByTagNameNS(XDATA, "data")][0];
  for (const [path, v] of Object.entries(values)) {
    let node = data;
    for (const step of path.split(".")) {
      const m = /^(.+)\[(\d+|\*)\]$/.exec(step); const name = m ? m[1] : step; const idx = m && m[2] !== "*" ? Number(m[2]) : 0;
      const kids = [...node.childNodes].filter((c: any) => c.nodeType === 1 && !c.namespaceURI && c.nodeName === name); // as ET: a plain name matches only an element in no namespace
      while (kids.length <= idx) kids.push(node.appendChild(doc.createElement(name)));
      node = kids[idx];
    }
    while (node.firstChild) node.removeChild(node.firstChild);
    node.appendChild(doc.createTextNode(v));
  }
  return new XMLSerializer().serializeToString(doc);
}

/** The app's step with the engine as the writer: writeForm's value step unchanged, then the engine writes. No checks
 *  (the engine has none of ours: no signature check, no read-back); `check` adds the engine's own read-back. */
async function engineWriteForm(snapshot: any, cov: { boxes: any[] }, form: string, out: string, check = false) {
  const map = mapOf(snapshot, form)!;
  const inv = JSON.parse(readFileSync(solutionFile(map.inventory_file)!, "utf8"));
  const { values } = formValues(snapshot, map, inv, cov.boxes);
  personSteps(inv.fields, values, inv.groups ?? []);
  return engineWrite(map.official_file!, values as Record<string, string>, out, check);
}
async function engineWrite(file: string, values: Record<string, string>, out: string, check: boolean) {
  const pdf = await X.openXfaPdf(new Uint8Array(readFileSync(blankOf(file))));
  const ds = newDatasets(pdf.packet("datasets").text(), Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])));
  const bytes: Uint8Array = await pdf.withPacket("datasets", new TextEncoder().encode(ds));
  writeFileSync(out, bytes);
  if (check) { const back = leaves(await X.openXfaPdf(new Uint8Array(readFileSync(out)))); for (const [p, v] of Object.entries(values)) if (back[p.replace(/\[\*\]/g, "[0]").split(".").map((s) => /\[\d+\]$/.test(s) ? s : `${s}[0]`).join(".")] !== String(v)) throw new Error(`engine read-back: ${p}`); }
  return values;
}

/** Every data leaf by path (name[i] at each step), as the engine's reader sees the copy: same shape as our reader's. */
function leaves(pdf: any): Record<string, string> {
  const doc = new DOMParser().parseFromString(pdf.packet("datasets").text(), "text/xml");
  const out: Record<string, string> = {};
  const walk = (e: any, p: string) => {
    const kids = [...e.childNodes].filter((c: any) => c.nodeType === 1);
    if (!kids.length) { out[p] = [...e.childNodes].filter((c: any) => c.nodeType === 3 || c.nodeType === 4).map((c: any) => c.data).join(""); return; }
    const seen: Record<string, number> = {};
    // Named as our reader (ElementTree) names a tag: {namespace}local, whatever prefix the file uses.
    for (const c of kids) { const t = c.namespaceURI ? `{${c.namespaceURI}}${c.localName}` : c.localName; const i = seen[t] = (seen[t] ?? -1) + 1; walk(c, p ? `${p}.${t}[${i}]` : `${t}[${i}]`); }
  };
  const data = [...doc.getElementsByTagNameNS(XDATA, "data")][0];
  if (data) walk(data, "");
  return out;
}
const diff = (a: Record<string, unknown>, b: Record<string, unknown>) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => (a[k] ?? null) !== (b[k] ?? null));

/** The engine's form-script part on a copy: loads it, or names why not; on the forms it reads with a pack, the form's own
 *  Validate and its barcode texts. Fixed clock and zone, so both copies are judged alike. */
async function formScript(file: string, pack: unknown) {
  try {
    const rt = await X.createFormRuntime(await X.openXfaPdf(new Uint8Array(readFileSync(file))), { host: { name: "xfa-engine", appType: "xfa-engine", version: "0", variation: "headless", platform: "unspecified", language: "en" }, clock: { now: () => Date.parse("2026-11-13T12:00:00Z") }, timezone: "America/Toronto" });
    rt.load();
    if (!pack) { rt.dispose(); return { reads: true }; }
    const v = rt.validate(pack); const barcodes = rt.encodeBarcodes(pack); rt.dispose();
    return { reads: true, validate_complete: v.complete, barcodes };
  } catch (e: any) { return { reads: false, reason: `${e?.code ?? e?.name ?? "error"}: ${String(e?.message ?? e).slice(0, 160)}` }; }
}

function check(form_file: string, values: Record<string, unknown>, page_fields: Record<string, unknown>, copies: Record<string, string>, tag: string) {
  const req = join(OUT, `${tag}.check.json`); writeFileSync(req, JSON.stringify({ form_file, values, page_fields, copies }));
  return JSON.parse(execFileSync(PY, ["-I", join(STUDIO, "tools", "xfa_writer_trial_check.py"), req], { cwd: ROOT, maxBuffer: 64 << 20 }).toString().trim().split("\n").pop()!);
}

const db = new Db();
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// ---- the finished story's Paper IMM 5257 (C10.2): an engine-written copy of the same data ----
async function story() {
  const person: string = JSON.parse(readFileSync(join(STUDIO, "samples", "finished-story.json"), "utf8")).paper_line.person;
  const c = await db.case.findFirst({ where: { reference: SAMPLE_CASE.reference }, select: { id: true } });
  const copy = c ? (await copiesWithHash(db, c.id)).find((x) => x.person === person) : undefined;
  if (!copy?.path) return { error: `No Paper IMM 5257 copy for ${person}: load the finished story first.` };
  const ours = copy.path.startsWith("/") ? copy.path : join(ROOT, copy.path);
  const req = JSON.parse(readFileSync(ours.replace(/\.pdf$/, ".request.json"), "utf8"));
  const theirs = join(OUT, "story-engine.pdf");
  await engineWrite(req.form_file, req.values, theirs, true);
  // Beside it, the request it was written from, so tools/read_validated.py can read the Adobe-saved copy back against it.
  writeFileSync(theirs.replace(/\.pdf$/, ".request.json"), JSON.stringify({ ...req, out: theirs }, null, 1));
  if (opt["story-only"]) return { person, copy_id: copy.id, ours, theirs, sha256: sha(theirs), written: Object.keys(req.values).length };
  // The writer step alone on the same request, both sides (ours re-run into the trial folder: the app's copy is untouched).
  const rerun = join(OUT, "story-ours-rerun.pdf"), rreq = join(OUT, "story-ours-rerun.request.json");
  writeFileSync(rreq, JSON.stringify({ ...req, out: rerun }));
  const tOurs: number[] = [], tTheirs: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    let t0 = performance.now(); execFileSync(PY, ["-I", join(PROTOTYPE, "p5", "fill.py"), rreq], { cwd: ROOT, maxBuffer: 64 << 20 }); tOurs.push(ms(t0));
    t0 = performance.now(); await engineWrite(req.form_file, req.values, theirs, false); tTheirs.push(ms(t0));
  }
  const k = check(req.form_file, req.values, {}, { ours, theirs }, "story");
  const eng = { ours: leaves(await X.openXfaPdf(new Uint8Array(readFileSync(ours)))), theirs: leaves(await X.openXfaPdf(new Uint8Array(readFileSync(theirs)))) };
  const pack = JSON.parse(readFileSync(join(PACKS, "imm5257.pack.json"), "utf8"));
  const fs = { ours: await formScript(ours, pack), theirs: await formScript(theirs, pack) };
  return { person, copy_id: copy.id, ours, theirs, written: Object.keys(req.values).length, leaf_differences_our_reader: diff(k.ours.leaves, k.theirs.leaves), leaf_differences_engine_reader: diff(eng.ours, eng.theirs),
    ours_rerun_same_file_as_app_copy: sha(rerun) === sha(ours), ms_median: { ours_writer_with_checks: median(tOurs), theirs_writer: median(tTheirs) },
    ours_check: { ...k.ours, leaves: undefined }, theirs_check: { ...k.theirs, leaves: undefined }, form_script: fs,
    barcodes_equal: JSON.stringify((fs.ours as any).barcodes) === JSON.stringify((fs.theirs as any).barcodes) };
}

if (opt["story-only"]) { const s = await story(); await db.$disconnect(); console.log(JSON.stringify(s, null, 1)); process.exit("error" in s ? 1 : 0); }

// ---- every Paper form the latest releases fill ----
const rels = await db.configRelease.findMany({ orderBy: { version: "desc" }, select: { combinationId: true, version: true, snapshot: true } });
const latest = new Map<string, any>(); for (const r of rels) if (!latest.has(r.combinationId)) latest.set(r.combinationId, r);
const rows: any[] = []; const blanks = new Map<string, unknown>();
for (const [cid, rel] of latest) {
  const snapshot: any = rel.snapshot;
  const view = await (await fetch(`${API}/api/combinations/${cid}/preview?mode=release&profile=client-a-family`, { headers: { "x-actor": "user-A" } })).json();
  for (const cov of view.coverage as any[]) {
    const line = snapshot.forms.find((f: any) => f.form_number === cov.form);
    if (!cov.applies || line?.channel === "ONLINE" || line?.channel === "NOT_NEEDED") continue;
    const map = mapOf(snapshot, cov.form);
    if (!map?.official_file || !map.inventory_file) continue;
    const tag = `${cov.form.replace(/\s+/g, "")}-${snapshot.combination?.key ?? cid.slice(0, 8)}-${cov.person}`;
    // ours: the app's own step, timed whole; theirs: the same step with the engine writing, timed bare and with its read-back.
    const tOurs: number[] = [], tTheirs: number[] = [], tTheirsChecked: number[] = [];
    let ours: any; let values: Record<string, unknown> = {};
    for (let i = 0; i < RUNS; i++) {
      let t0 = performance.now(); ours = await writeForm(snapshot, cov, cov.form, OUT, `${tag}.ours`); tOurs.push(ms(t0));
      t0 = performance.now(); values = await engineWriteForm(snapshot, cov, cov.form, join(OUT, `${tag}.theirs.pdf`)); tTheirs.push(ms(t0));
      t0 = performance.now(); await engineWriteForm(snapshot, cov, cov.form, join(OUT, `${tag}.theirs.pdf`), true); tTheirsChecked.push(ms(t0));
    }
    const pageFields = JSON.parse(readFileSync(join(OUT, `${tag}.ours.request.json`), "utf8")).page_fields;
    const shown = (seen: Record<string, unknown>) => Object.entries(pageFields).filter(([n, v]) => seen[n] === String(v)).length;
    const k = check(map.official_file, values, pageFields, { ours: ours.out, theirs: join(OUT, `${tag}.theirs.pdf`) }, tag);
    const eng = { ours: leaves(await X.openXfaPdf(new Uint8Array(readFileSync(ours.out)))), theirs: leaves(await X.openXfaPdf(new Uint8Array(readFileSync(join(OUT, `${tag}.theirs.pdf`))))) };
    const packFile = join(PACKS, `${map.official_file.replace(/e(-\d+)?\.pdf$/, "")}.pack.json`);
    const pack = existsSync(packFile) ? JSON.parse(readFileSync(packFile, "utf8")) : null;
    if (!blanks.has(map.official_file)) blanks.set(map.official_file, await formScript(blankOf(map.official_file), null));
    const fs = (blanks.get(map.official_file) as any).reads && pack ? { ours: await formScript(ours.out, pack), theirs: await formScript(join(OUT, `${tag}.theirs.pdf`), pack) } : null;
    rows.push({ form: cov.form, edition: map.form_edition, file: map.official_file, inventory: map.inventory_file, release: snapshot.combination?.key ?? cid, person: cov.person, form_kind: k.form_kind, written: Object.keys(values).length,
      app_report_intact: ours.report.intact,
      read_back: { ours: `${k.ours.read_back_equal}/${k.ours.written}`, theirs: `${k.theirs.read_back_equal}/${k.theirs.written}` },
      leaf_differences_our_reader: diff(k.ours.leaves, k.theirs.leaves), leaf_differences_engine_reader: diff(eng.ours, eng.theirs),
      readers_agree: { ours_copy: diff(k.ours.leaves, eng.ours).length, theirs_copy: diff(k.theirs.leaves, eng.theirs).length },
      page_fields: { requested: Object.keys(pageFields).length, differences: diff(k.ours.page_fields, k.theirs.page_fields).length, ours_shown: shown(k.ours.page_fields), theirs_shown: shown(k.theirs.page_fields) },
      signatures: { ours: k.ours.signatures, theirs: k.theirs.signatures }, original_bytes_kept: { ours: k.ours.original_bytes_kept, theirs: k.theirs.original_bytes_kept },
      other_data_leaves_changed: { ours: k.ours.other_data_leaves_changed, theirs: k.theirs.other_data_leaves_changed }, other_parts_unchanged: { ours: k.ours.other_parts_unchanged, theirs: k.theirs.other_parts_unchanged },
      poppler_syntax_errors: { ours: k.ours.poppler_syntax_errors, theirs: k.theirs.poppler_syntax_errors },
      bytes: { ours: k.ours.bytes, theirs: k.theirs.bytes }, added_bytes: { ours: k.ours.added_bytes, theirs: k.theirs.added_bytes },
      ms_median: { ours_app_step: median(tOurs), theirs_step: median(tTheirs), theirs_step_with_engine_read_back: median(tTheirsChecked) }, ms_all: { ours: tOurs, theirs: tTheirs, theirs_checked: tTheirsChecked },
      form_script: fs, barcodes_equal: fs ? JSON.stringify((fs.ours as any).barcodes) === JSON.stringify((fs.theirs as any).barcodes) : null });
    console.error(`${tag}: written ${Object.keys(values).length}, leaf differences ${rows.at(-1).leaf_differences_our_reader.length}/${rows.at(-1).leaf_differences_engine_reader.length}, page fields ${rows.at(-1).page_fields.differences}, ms ${median(tOurs)} vs ${median(tTheirs)}`);
  }
}
// ---- the writer alone, on every box: the E1 fill trials' inputs (a made-up value in every box, two rows of each
// repeating box), once per form edition above. Ours: p5/fill.py as the app calls it (with its checks); theirs: the
// engine's write. The Sample facts above fill few boxes on some forms (none on two); this is the full load.
const full: any[] = [];
const editions = new Map<string, { form: string; file: string; inventory: string }>();
// Every Paper line of the latest releases with a mapped PDF edition, also those no person of the Sample profile gets
// (on this checkpoint IMM 5257 is Online on the Visitor visa release, and IMM 1295, 5409, 5604 apply to nobody in it).
for (const rel of latest.values()) for (const f of (rel.snapshot as any).forms as any[]) {
  const map = mapOf(rel.snapshot, f.form_number);
  if (f.channel === "ONLINE" || f.channel === "NOT_NEEDED" || !map?.official_file || !map.inventory_file || editions.has(map.official_file)) continue;
  editions.set(map.official_file, { form: f.form_number, file: map.official_file, inventory: map.inventory_file });
  if (!blanks.has(map.official_file)) blanks.set(map.official_file, await formScript(blankOf(map.official_file), null));
}
for (const e of editions.values()) {
  const tag = `${e.form.replace(/\s+/g, "")}-every-box`;
  const invFile = solutionFile(e.inventory)!;
  const values: Record<string, string> = JSON.parse(execFileSync(PY, ["-I", join(STUDIO, "tools", "xfa_writer_trial_check.py"), "--generic", invFile], { cwd: ROOT, maxBuffer: 64 << 20 }).toString());
  const box = new Map<string, any>(JSON.parse(readFileSync(invFile, "utf8")).fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
  // As writeForm: each box's page field (its SOM name) gets the same value; p5/fill.py sets it only on a static form.
  const page_fields = Object.fromEntries(Object.entries(values).flatMap(([p, v]) => (box.get(p)?.som ? [[box.get(p).som, v]] : [])));
  const ours = join(OUT, `${tag}.ours.pdf`), theirs = join(OUT, `${tag}.theirs.pdf`), req = join(OUT, `${tag}.request.json`);
  writeFileSync(req, JSON.stringify({ form_file: e.file, values, page_fields, out: ours }));
  const tOurs: number[] = [], tTheirs: number[] = [], shaOurs = new Set<string>(), shaTheirs = new Set<string>();
  let report: any;
  for (let i = 0; i < RUNS; i++) {
    let t0 = performance.now(); report = JSON.parse(execFileSync(PY, ["-I", join(PROTOTYPE, "p5", "fill.py"), req], { cwd: ROOT, maxBuffer: 64 << 20 }).toString().trim().split("\n").pop()!); tOurs.push(ms(t0));
    t0 = performance.now(); await engineWrite(e.file, values, theirs, false); tTheirs.push(ms(t0));
    shaOurs.add(sha(ours)); shaTheirs.add(sha(theirs));
  }
  const k = check(e.file, values, page_fields, { ours, theirs }, tag);
  const shown = (seen: Record<string, unknown>) => Object.entries(page_fields).filter(([n, v]) => seen[n] === String(v)).length;
  const eng = { ours: leaves(await X.openXfaPdf(new Uint8Array(readFileSync(ours)))), theirs: leaves(await X.openXfaPdf(new Uint8Array(readFileSync(theirs)))) };
  const packFile = join(PACKS, `${e.file.replace(/e(-\d+)?\.pdf$/, "")}.pack.json`);
  const fsE = (blanks.get(e.file) as any)?.reads && existsSync(packFile) ? { ours: await formScript(ours, JSON.parse(readFileSync(packFile, "utf8"))), theirs: await formScript(theirs, JSON.parse(readFileSync(packFile, "utf8"))) } : null;
  full.push({ form: e.form, file: e.file, form_script: fsE, barcodes_equal: fsE ? JSON.stringify((fsE.ours as any).barcodes) === JSON.stringify((fsE.theirs as any).barcodes) : null, form_kind: k.form_kind, written: Object.keys(values).length, app_writer_intact: report.intact,
    read_back: { ours: `${k.ours.read_back_equal}/${k.ours.written}`, theirs: `${k.theirs.read_back_equal}/${k.theirs.written}` },
    leaf_differences_our_reader: diff(k.ours.leaves, k.theirs.leaves), leaf_differences_engine_reader: diff(eng.ours, eng.theirs),
    readers_agree: { ours_copy: diff(k.ours.leaves, eng.ours).length, theirs_copy: diff(k.theirs.leaves, eng.theirs).length },
    page_fields: { requested: Object.keys(page_fields).length, differences: diff(k.ours.page_fields, k.theirs.page_fields).length, ours_shown: shown(k.ours.page_fields), theirs_shown: shown(k.theirs.page_fields) },
    signatures: { ours: k.ours.signatures, theirs: k.theirs.signatures }, original_bytes_kept: { ours: k.ours.original_bytes_kept, theirs: k.theirs.original_bytes_kept },
    other_data_leaves_changed: { ours: k.ours.other_data_leaves_changed, theirs: k.theirs.other_data_leaves_changed }, other_parts_unchanged: { ours: k.ours.other_parts_unchanged, theirs: k.theirs.other_parts_unchanged },
    poppler_syntax_errors: { ours: k.ours.poppler_syntax_errors, theirs: k.theirs.poppler_syntax_errors },
    bytes: { ours: k.ours.bytes, theirs: k.theirs.bytes }, added_bytes: { ours: k.ours.added_bytes, theirs: k.theirs.added_bytes },
    ms_median: { ours_writer_with_checks: median(tOurs), theirs_writer: median(tTheirs) }, same_file_each_run: { ours: shaOurs.size === 1, theirs: shaTheirs.size === 1 } });
  console.error(`${tag}: written ${Object.keys(values).length}, leaf differences ${full.at(-1).leaf_differences_our_reader.length}/${full.at(-1).leaf_differences_engine_reader.length}, page fields ${full.at(-1).page_fields.differences}, ms ${median(tOurs)} vs ${median(tTheirs)}`);
}
const s = await story();
await db.$disconnect();
const result = { run_utc: new Date().toISOString(), runs_per_pair: RUNS, node: process.version, engine_commit: readFileSync(join(ENGINE, "PROVENANCE.md"), "utf8").match(/\b[0-9a-f]{8,40}\b/)?.[0],
  blanks: Object.fromEntries(blanks), rows, every_box: full, story: s };
writeFileSync(join(OUT, "trial.json"), JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
