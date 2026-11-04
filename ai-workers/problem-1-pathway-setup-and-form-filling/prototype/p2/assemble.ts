// Assembler v2 (20 Oct 2026; answers P2-M2 and applies D12). The v1 assembler (p2/assemble.v1.ts, frozen)
// unioned canonical fields by id and checked only types: one id with two meanings kept the first definition, and
// two ids with one meaning stayed separate. v2 (1) lists every id defined with different words by different runs
// and every pair of ids whose definitions look alike, as items a person decides, unless the reviewed field file
// settles them; (2) applies the reviewed merges and splits from p2/field-review.c1.json, rewriting every
// reference (maps, placements, conditions, checks, calculations); (3) keeps a form's package edition, its internal
// template identifier and its SHA-256 as separate metadata (D12); (4) applies listed content repairs
// (p2/repairs.c1.json). Each step is recorded in structure.field_review and structure.repairs, separately from
// model output. Without a review file it only detects and lists. v2.1 (P2-R2-M2): a split moves each dependent
// check by its scope (box or source run), lists unscoped references for a person, and verifies that every
// form-native check reads its box's fact; provenance paths are relative to the solution folder (P2-R2-m2).
//
// Assembles one draft configuration for combination 1 from the drafting runs (rules, no AI): canonical
// fields, field maps, forms, document requirements, rules, sections, placements and checks, plus the two
// check groups made by rules (form-native checks from each form's own inventory; read-back per form) and
// the structure checks of activity 4.1 (coverage, references, quotes found in their cited source). Every
// failing structure item is listed as unresolved, never hidden. The result is a DRAFT: nothing uses it
// until people review and release it (D254, AIW-D263).
import { Ajv } from "ajv";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { CALCULATIONS, validatePredicate } from "../contracts/rules.ts";
import { LABEL, PROTOTYPE, SOLUTION } from "./policy.ts";

type Env = { caller: string; drafting_run: any; raw_output: string; launch_evidence: any };
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export type AssembleOptions = { review?: string | null; repairs?: string | null; allowV1Names?: boolean };
const normM = (m: string) => m.replace(/\s+/g, " ").trim().replace(/\.$/, "").toLowerCase();
const CONTRAST = new Set(["start", "end", "from", "to", "issue", "expiry", "family", "given", "phone", "fax", "number", "name", "street", "location", "province", "medical", "immigration", "city", "country", "postal", "unit", "full", "names"]);
const SAME_WORD: Record<string, string> = { born: "birth", presently: "current", currently: "current", present: "current", lives: "live", lived: "live", home: "residence", residential: "residence", physically: "", physical: "" };
const words = (m: string) => new Set(normM(m).replace(/[^a-z0-9 ]/g, " ").split(" ").map((w) => SAME_WORD[w] ?? w).filter((w) => w.length > 3 && !["person", "whether", "their", "which", "where", "that", "this", "from", "with", "used"].includes(w)));

export function assemble(mode: string, runFiles: string[], opts: AssembleOptions = {}) {
  const envs = runFiles.map((f) => ({ file: f, env: JSON.parse(readFileSync(f, "utf8")) as Env }));
  const byKind = (k: string) => envs.filter((e) => e.env.launch_evidence.schema_file.startsWith(k));
  const maps = byKind("field-map"), [req] = byKind("requirements"), [sec] = byKind("sections"), [chk] = byKind("checks");
  const out = (e: { env: Env }) => JSON.parse(e.env.raw_output);
  const unresolved: { from: string; item: string; reason: string }[] = [];
  const sources = new Map<string, string>();
  const sourceText = new Map<string, string>(); // admitted input path -> searchable text

  // Canonical fields: union across drafts; one id with two meanings or types is a 'decide' item (3.1).
  const fields = new Map<string, { id: string; meaning: string; value_type: string; proposed_by: string[]; decide?: string }>();
  const defs = new Map<string, { run: string; meaning: string; value_type: string }[]>();
  const addField = (f: { id: string; meaning: string; value_type: string }, run: string) => {
    (defs.get(f.id) ?? defs.set(f.id, []).get(f.id)!).push({ run, meaning: f.meaning, value_type: f.value_type });
    const have = fields.get(f.id);
    if (!have) fields.set(f.id, { ...f, proposed_by: [run] });
    else {
      have.proposed_by.push(run);
      if (have.value_type !== f.value_type) have.decide = `value type differs between drafts (${have.value_type} / ${f.value_type}); a person decides`;
    }
  };

  const fieldMaps = maps.map((m) => {
    const run = m.env.drafting_run, o = out(m);
    for (const f of o.canonical_fields) addField(f, run.run_id);
    const invFile = run.inputs.official_files[0].file as string;
    const inv = JSON.parse(readFileSync(join(SOLUTION, invFile), "utf8"));
    sources.set(inv.summary.file, inv.summary.sha256);
    // Captions, headings and answer-option labels: a draft may cite an option label (found on the first live run).
    sourceText.set(invFile, (inv.fields ?? []).map((f: any) => [f.caption ?? "", f.heading ?? "", ...((f.options_resolved ?? f.options ?? [])[0] ?? [])].join("\n")).join("\n"));
    // 3.2 ready: every data-bound box has exactly one entry; no entry names a box the form does not have.
    const boxes = new Set<string>((inv.fields ?? []).filter((f: any) => f.data_path).map((f: any) => f.data_path));
    const seen = new Map<string, number>();
    for (const e of run.entries ?? []) seen.set(e.data_path, (seen.get(e.data_path) ?? 0) + 1);
    for (const b of boxes) if (!seen.has(b)) unresolved.push({ from: run.run_id, item: b, reason: "data-bound box has no map entry (3.2 ready)" });
    for (const [b, n] of seen) {
      if (!boxes.has(b)) unresolved.push({ from: run.run_id, item: b, reason: "map entry names a box that is not in the form's inventory" });
      if (n > 1 && !(run.entries ?? []).some((e: any) => e.data_path === b && e.row !== undefined)) unresolved.push({ from: run.run_id, item: b, reason: `${n} entries for one box` });
    }
    for (const e of run.entries ?? []) {
      if (e.outcome === "unresolved") unresolved.push({ from: run.run_id, item: e.data_path, reason: `unresolved by the draft: ${e.unresolved_reason}` });
      if (e.outcome === "mapped" && e.evidence && !norm(sourceText.get(invFile)!).includes(norm(e.evidence.quote))) unresolved.push({ from: run.run_id, item: e.data_path, reason: `evidence quote not found in the form's captions or headings: "${e.evidence.quote}"` });
    }
    // The edition is the official manifest's (p2/convert.ts); the model's own reading stays in the run record.
    // D12: the package edition (official manifest, the date canada.ca lists), the form's internal template or
    // barcode identifier (may be older: IMM 1295's barcodes say IMM1295_06-2018) and the exact file hash are
    // three different facts, kept side by side; none is rewritten to match another.
    const manifestItem = JSON.parse(readFileSync(join(SOLUTION, "official-sources", "ircc", "manifest.json"), "utf8")).items.find((i: any) => `official-sources/ircc/${i.path}` === inv.summary.file);
    const internal = [...new Set<string>((JSON.stringify(inv).match(/(?:IMM|IRM)[0-9A-Z]+_[0-9]{2}-[0-9]{4}/g) ?? []))];
    const edition_metadata = { package_edition: manifestItem?.edition ?? null, package_url: manifestItem?.url ?? null, internal_template_identifiers: internal, internal_identifier_note: internal.length ? "read from the form's own barcode/template data; differs from the package edition where the form was repackaged without a new template" : "none found in the form's inventory", model_read_edition: o.form_edition, artifact_sha256: inv.summary.sha256 };
    return { form_edition: (run.entries ?? [])[0]?.form_edition ?? o.form_edition, drafted_edition: o.form_edition, edition_metadata, form_sha256: inv.summary.sha256, drafting_run_id: run.run_id, inventory: invFile, entries: run.entries ?? [], boxes: boxes.size, inv };
  });

  // Text inventories cited by the requirements and checks drafts.
  for (const e of [req, chk].filter(Boolean)) for (const f of e!.env.drafting_run.inputs.official_files) {
    if (!String(f.file).endsWith(".text.inventory.json")) continue;
    const t = JSON.parse(readFileSync(join(SOLUTION, f.file), "utf8"));
    sources.set(t.summary.file, t.summary.sha256);
    sourceText.set(f.file, t.text); sourceText.set(t.summary.file, t.text);
  }
  const quoteFound = (file: string, quote: string) => {
    const text = sourceText.get(file) ?? [...sourceText.entries()].find(([k]) => k.endsWith(basename(file)))?.[1];
    return !!text && norm(text).includes(norm(quote));
  };

  const r = req ? out(req) : { forms: [], documents: [], rules: [], proposed_fields: [], unresolved: [] };
  for (const f of r.proposed_fields) addField(f, req!.env.drafting_run.run_id);
  for (const [kind, list] of [["form", r.forms], ["document", r.documents], ["rule", r.rules]] as const) {
    for (const x of list as any[]) if (!quoteFound(x.source_file, x.source_quote)) unresolved.push({ from: req!.env.drafting_run.run_id, item: `${kind}: ${x.form_number ?? x.document_type ?? x.when}`, reason: `quote not found in ${x.source_file}: "${String(x.source_quote).slice(0, 120)}"` });
  }
  for (const u of r.unresolved) unresolved.push({ from: req!.env.drafting_run.run_id, item: u.passage_quote, reason: u.reason });

  const s = sec ? out(sec) : { sections: [], placements: [], unresolved: [] };
  const sectionIds = new Set(s.sections.map((x: any) => x.id));
  for (const p of s.placements) {
    if (!sectionIds.has(p.section_id)) unresolved.push({ from: sec!.env.drafting_run.run_id, item: p.fact, reason: `placed in unknown section ${p.section_id}` });
    if (!fields.has(p.fact)) unresolved.push({ from: sec!.env.drafting_run.run_id, item: p.fact, reason: "placement names a fact no draft defines" });
  }
  const placed = new Set(s.placements.map((p: any) => p.fact));
  const used = new Set<string>(fieldMaps.flatMap((m) => m.entries.filter((e: any) => e.outcome === "mapped").map((e: any) => e.fact)));
  for (const f of used) {
    if (!fields.has(f)) unresolved.push({ from: "assembly", item: f, reason: "mapped fact is not a canonical field" });
    if (sec && !placed.has(f)) unresolved.push({ from: sec.env.drafting_run.run_id, item: f, reason: "fact used by a form map has no placement (3.4 ready)" });
  }
  for (const u of s.unresolved) unresolved.push({ from: sec!.env.drafting_run.run_id, item: u.fact, reason: u.reason });

  // Checks: AI-drafted groups, plus rule-made form-native and read-back checks.
  const c = chk ? out(chk) : { checks: [] };
  const checks: any[] = c.checks.map((x: any) => ({ ...x, made_by: "ai_draft" }));
  for (const x of c.checks) if (!quoteFound(x.source_file, x.source_quote)) unresolved.push({ from: chk!.env.drafting_run.run_id, item: `check ${x.id}`, reason: `quote not found in ${x.source_file}` });
  for (const m of fieldMaps) {
    const fact = new Map(m.entries.filter((e: any) => e.outcome === "mapped").map((e: any) => [e.data_path, e.fact]));
    for (const f of (m.inv.fields ?? []).filter((f: any) => f.data_path)) {
      const base = { group: "form_native", made_by: "rule", applies_to: `${m.form_edition} ${f.data_path}`, inputs: fact.has(f.data_path) ? [fact.get(f.data_path)] : [], source_file: m.inv.summary.file, source_quote: f.data_path, runs_when: ["form_rendered"] };
      // Each check gets its own inputs list: a shared list made a rewrite of one check silently rewrite the other (found in P2-R2-M2).
      if (f.required) checks.push({ ...base, inputs: [...base.inputs], id: `fn-required:${f.data_path}`, condition: "exists(value)", severity: "block", user_action: "complete the fact before the form is rendered" });
      if (f.max_chars) checks.push({ ...base, inputs: [...base.inputs], id: `fn-length:${f.data_path}`, condition: `length(value) <= ${f.max_chars}`, severity: "warn", user_action: "continuation sheet or shorten; never silently truncated" });
      const opts = f.options_resolved ?? f.options;
      if (Array.isArray(opts) && opts.length) checks.push({ ...base, id: `fn-option:${f.data_path}`, condition: "value in the form's own option list", severity: "block", user_action: "an answer with no matching option is refused, never guessed" });
    }
    checks.push({ id: `read-back:${m.form_edition}`, group: "read_back", made_by: "rule", severity: "block", applies_to: m.form_edition, inputs: [], condition: "every written value equals the fact after its map entry's transform", source_file: m.inv.summary.file, source_quote: m.form_edition, runs_when: ["form_rendered"], user_action: "a mismatch stops the form until corrected" });
  }

  // Conditions (AIW-D264): each becomes the team's root shape (subjectKind on the root), validated against
  // the portable contract; every field it reads must be a canonical or a declared derived field; a derived
  // field is executable only when its calculation has a tested helper, otherwise a recorded dependency.
  const pajv = new Ajv({ allErrors: true, strict: false });
  pajv.addSchema(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", "predicate.v0.schema.json"), "utf8")));
  const nodeOk = pajv.getSchema("https://expatready.local/contracts/predicate.v0.json#/definitions/node")!;
  const derived = [...(r.derived_fields ?? []), ...(c.derived_fields ?? [])].map((d: any) => ({ ...d, executable: !!CALCULATIONS[d.calculation] }));
  for (const d of derived) if (!d.executable) unresolved.push({ from: "assembly", item: d.id, reason: `calculation '${d.calculation}' (${d.plain}) has no tested helper: a recorded dependency, not executable (AIW-D264)` });
  const known = (f: string) => fields.has(f) || derived.some((d: any) => d.id === f);
  const fieldsOf = (n: any): string[] => (n ? [n.field, ...(n.args ?? []).flatMap(fieldsOf), ...fieldsOf(n.arg)].filter(Boolean) : []);
  let renamedKeys = 0;
  const toRoot = (cond: any, where: string, from: string) => {
    if (!cond) return null;
    // The model writes the tree as JSON text (tree_json): a nested structured-output schema was rejected as
    // "compiled grammar too large" on the first live chain (discovery D17). Parsed and validated here.
    let tree: any = cond.tree;
    if (tree === undefined) { try { tree = JSON.parse(cond.tree_json); } catch { unresolved.push({ from, item: where, reason: "condition: tree_json is not valid JSON" }); return null; } }
    // The first live drafts named branch keys "conditions"/"condition" because the prompt did not give the
    // team's key names (fixed in the prompt). This unambiguous rename is counted and reported (discovery D18).
    const rename = (n: any): any => {
      if (!n || typeof n !== "object" || Array.isArray(n)) return n;
      const o: any = {};
      for (const [k, v] of Object.entries(n)) {
        if (k === "conditions" && (n.op === "and" || n.op === "or")) { o.args = (v as any[]).map(rename); renamedKeys++; }
        else if (k === "condition" && n.op === "not") { o.arg = rename(v); renamedKeys++; }
        else o[k] = v;
      }
      return o;
    };
    tree = rename(tree);
    cond = { ...cond, tree };
    const root = { subjectKind: String(cond.subject_kind ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "_"), ...tree };
    for (const e of validatePredicate(root, nodeOk)) unresolved.push({ from, item: where, reason: `condition: ${e}` });
    for (const f of fieldsOf(cond.tree)) if (!known(f)) unresolved.push({ from, item: where, reason: `condition reads '${f}', which is neither a canonical field nor a declared derived field` });
    return root;
  };
  const reqRun = req?.env.drafting_run.run_id ?? "", chkRun = chk?.env.drafting_run.run_id ?? "";
  r.forms = r.forms.map((x: any) => ({ ...x, condition: toRoot(x.condition, `form ${x.form_number}`, reqRun) }));
  r.documents = r.documents.map((x: any) => ({ ...x, condition: toRoot(x.condition, `document ${x.document_type}`, reqRun) }));
  r.rules = r.rules.map((x: any) => ({ ...x, when: toRoot(x.when, `rule: ${x.when_plain}`, reqRun) }));
  for (const x of checks) if (x.made_by === "ai_draft") x.condition = toRoot(x.condition, `check ${x.id}`, chkRun);

  const config = {
    contract_version: "combination-config/v0", combination: "1: work permit applied from outside Canada", configuration_version: `c1-draft-1-${mode}`,
    status: "draft", label: LABEL,
    sources: [...sources].map(([file, sha256]) => ({ file, sha256 })),
    drafting_run_ids: envs.map((e) => e.env.drafting_run.run_id),
    canonical_fields: [...fields.values()],
    field_maps: fieldMaps.map(({ inv: _i, boxes: _b, inventory: _v, ...m }) => m),
    forms: r.forms, document_requirements: r.documents, rules: r.rules,
    derived_fields: derived,
    sections: s.sections, placements: s.placements, checks,
    structure: {
      boxes_per_form: Object.fromEntries(fieldMaps.map((m) => [m.form_edition, { data_bound_boxes: m.boxes, entries: m.entries.length, mapped: m.entries.filter((e: any) => e.outcome === "mapped").length, unresolved: m.entries.filter((e: any) => e.outcome === "unresolved").length }])),
      canonical_fields: fields.size, decide_items: [...fields.values()].filter((f) => f.decide).length,
      checks_by_group: checks.reduce((a: Record<string, number>, x: any) => ({ ...a, [x.group]: (a[x.group] ?? 0) + 1 }), {}),
      unresolved: unresolved.length,
      condition_keys_renamed: renamedKeys,
    },
    unresolved,
  };
  reviewFields(config, defs, opts.review ? JSON.parse(readFileSync(opts.review, "utf8")) : null, opts.review ?? null);
  applyRepairs(config, opts.repairs ? JSON.parse(readFileSync(opts.repairs, "utf8")) : null, opts.repairs ?? null);
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addSchema(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", "field-map-entry.v0.schema.json"), "utf8")));
  const validate = ajv.compile(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", "combination-config.v0.schema.json"), "utf8")));
  const valid = validate(config) as boolean;
  mkdirSync(join(PROTOTYPE, "p2", "config"), { recursive: true });
  const file = join(PROTOTYPE, "p2", "config", `c1-draft-1-${mode}.json`);
  if (/^(live|stub|live-fieldmaps|live-slice|spread-trial-[0-9]+)$/.test(mode) && !opts.allowV1Names) throw new Error(`mode '${mode}' would overwrite a v1 configuration kept as evidence; use a new label (e.g. ${mode}-r2)`);
  writeFileSync(file, JSON.stringify(config, null, 1) + "\n");
  return { file, valid, errors: valid ? null : validate.errors };
}

/** Rewrites every reference from one field id to another (map facts, condition fields, calculation inputs and
 *  references, ids); returns the count. */
export function rewriteRefs(node: any, from: string, to: string): number {
  let n = 0;
  if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) { if (node[i] === from) { node[i] = to; n++; } else n += rewriteRefs(node[i], from, to); } return n; }
  if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) {
    if (["fact", "field", "reference", "id"].includes(k) && v === from) { node[k] = to; n++; }
    else if (k === "inputs" && Array.isArray(v)) { for (let i = 0; i < v.length; i++) if (v[i] === from) { v[i] = to; n++; } }
    else if (typeof v === "object") n += rewriteRefs(v, from, to);
  }
  return n;
}
const refersTo = (node: any, id: string): boolean => rewriteRefs(structuredClone(node), id, "\u0000") > 0;

/** D30 re-scope (P5 entry, 20 Oct): a fact drafted with case scope that each applicant answers for themself gets a
 *  per-person id. Every reference is rewritten; its placement repeats per person; a case-level condition that reads it
 *  is evaluated for each applicant. Used by the assembler (field review) and, on a released configuration, by
 *  p5/make_d30_draft.ts, so the draft and the release lineage get exactly the same change. */
export function applyRescope(config: any, rs: any): { moved: { from: string; to: string; references_rewritten: number }[]; conditions: number; missing: string[] } {
  const moved: { from: string; to: string; references_rewritten: number }[] = [], missing: string[] = [];
  for (const [from, to] of Object.entries(rs.ids as Record<string, string>)) {
    if (!(config.canonical_fields ?? []).some((f: any) => f.id === from) && !(config.derived_fields ?? []).some((d: any) => d.id === from)) { missing.push(from); continue; }
    const { unresolved: _u, ...rest } = config;
    const n = rewriteRefs(rest, from, to);
    for (const p of config.placements.filter((p: any) => p.fact === to)) p.repeats = rs.repeats;
    moved.push({ from, to, references_rewritten: n });
  }
  const toIds = moved.map((m) => m.to);
  let conditions = 0;
  const scope = (root: any) => { if (root && typeof root === "object" && root.subjectKind === "CASE" && toIds.some((id) => refersTo(root, id))) { root.subjectKind = rs.condition_subject_kind; conditions++; } };
  for (const x of config.forms ?? []) scope(x.condition);
  for (const x of config.document_requirements ?? []) scope(x.condition);
  for (const x of config.rules ?? []) scope(x.when);
  for (const x of config.checks ?? []) scope(x.condition);
  return { moved, conditions, missing };
}

/** P2-R2-M2 invariant: every form-native check reads exactly the fact its box's map entry reads. */
export function formNativeConsistency(config: any): { checked: number; mismatches: { id: string; inputs: string[]; box_fact: string }[] } {
  const boxFact = (c: any) => {
    const m = config.field_maps.find((m: any) => String(c.applies_to ?? "").startsWith(m.form_edition + " "));
    return m ? m.entries.find((e: any) => e.data_path === String(c.applies_to).slice(m.form_edition.length + 1) && e.fact)?.fact : undefined;
  };
  const fn = config.checks.filter((c: any) => c.group === "form_native" && c.inputs?.length);
  return { checked: fn.length, mismatches: fn.filter((c: any) => boxFact(c) !== undefined && !(c.inputs.length === 1 && c.inputs[0] === boxFact(c))).map((c: any) => ({ id: c.id, inputs: c.inputs, box_fact: boxFact(c) })) };
}

/** P2-M2: detect, then apply the reviewed reconciliation. Every reference to a merged or split id is rewritten. */
function reviewFields(config: any, defs: Map<string, { run: string; meaning: string; value_type: string }[]>, review: any, reviewFile: string | null) {
  const log: any = { review_file: reviewFile && relative(SOLUTION, reviewFile).split(sep).join("/"), merges_applied: [], splits_applied: [], flagged: [], placements_dropped: [], unreviewed_same_id: [], unreviewed_similar: [], references_rewritten: 0 };
  const reviewedSameId = new Set<string>((review?.same_id_reviewed ?? []).map((x: any) => x.id));
  const splitIds = new Set<string>((review?.splits ?? []).map((x: any) => x.id));
  const pairKey = (a: string, b: string) => [a, b].sort().join(" | ");
  const settled = new Set<string>([...(review?.merges ?? []).map((m: any) => pairKey(m.from, m.to)), ...(review?.flags ?? []).filter((f: any) => f.ids.length === 2).map((f: any) => pairKey(f.ids[0], f.ids[1])), ...(review?.distinct_reviewed ?? []).map((d: any) => pairKey(d.ids[0], d.ids[1]))]);
  // (1) Detection: one id, different definitions across runs.
  for (const [id, ds] of defs) {
    const meanings = new Set(ds.map((d) => normM(d.meaning)));
    if (meanings.size > 1 && !reviewedSameId.has(id) && !splitIds.has(id)) {
      log.unreviewed_same_id.push({ id, definitions: ds.map((d) => ({ run: d.run, meaning: d.meaning, value_type: d.value_type })) });
      config.unresolved.push({ from: "assembly", item: id, reason: `field review: one id is defined differently by ${ds.length} drafts; same meaning or not? a person decides (P2-M2)` });
    }
  }
  const list = config.canonical_fields as any[];
  const detectSimilar = () => {
  // Detection: two ids of one value type whose definitions share most of their words.
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.value_type !== b.value_type || a.id.split(".")[0] !== b.id.split(".")[0]) continue;
    const wa = words(a.meaning), wb = words(b.meaning);
    const inter = [...wa].filter((w) => wb.has(w)).length, uni = new Set([...wa, ...wb]).size;
    const sameTail = a.id.split(".")[1].replace(/^(present|current|address|mailing_address)_/, "") === b.id.split(".")[1].replace(/^(present|current|address|mailing_address)_/, "");
    // Ids that differ by a contrasting word (start/end, family/given, phone/fax...) are different facts by name.
    const ta = new Set<string>(a.id.split(".")[1].split("_")), tb = new Set<string>(b.id.split(".")[1].split("_"));
    const diff = [...ta].filter((w) => !tb.has(w)).concat([...tb].filter((w) => !ta.has(w)));
    if (!sameTail && diff.some((w) => CONTRAST.has(w))) continue;
    if ((uni && inter / uni >= 0.5) || sameTail) {
      if (settled.has(pairKey(a.id, b.id))) continue;
      log.unreviewed_similar.push({ ids: [a.id, b.id], meanings: [a.meaning, b.meaning] });
      config.unresolved.push({ from: "assembly", item: `${a.id} / ${b.id}`, reason: "field review: two fields of one type with near-identical definitions; one meaning or two? a person decides (P2-M2)" });
    }
  }
  };
  if (!review) { detectSimilar(); config.structure.field_review = log; return; }
  const rewrite = rewriteRefs, refers = refersTo;
  // The box a form-native check guards: "<form edition> <data path>", and the fact its map entry now reads.
  const boxOf = (c: any) => { const m = config.field_maps.find((m: any) => String(c.applies_to ?? "").startsWith(m.form_edition + " ")); return m ? { m, path: String(c.applies_to).slice(m.form_edition.length + 1) } : null; };
  const boxFact = (c: any) => { const b = boxOf(c); return b ? b.m.entries.find((e: any) => e.data_path === b.path && e.fact)?.fact : undefined; };
  const runOfFile = (f: unknown) => basename(String(f ?? ""));
  // (2a) Splits: the named run's references move to the new id; the old id keeps the other run's definition.
  // P2-R2-M2 (Codex 15:36Z): every dependent reference follows the meaning it was made for, by scope. A form-native
  // check follows the map entry of the box it guards; a drafted check follows the run it cites as its source. A
  // reference that no scope ties to one meaning (a condition, a calculation, a check citing neither run) keeps the
  // old id and is listed for a person to confirm, never left silently on a meaning it may not have.
  for (const sp of review.splits ?? []) {
    const ds = defs.get(sp.id) ?? [];
    const moved = ds.find((d) => d.run.startsWith(sp.job + "-")), kept = ds.find((d) => d.run.startsWith(sp.keep_meaning_from + "-"));
    if (!moved || !kept) { config.unresolved.push({ from: "assembly", item: sp.id, reason: `field review: split not applied, run ${sp.job} or ${sp.keep_meaning_from} not in this draft` }); continue; }
    let n = 0;
    for (const m of config.field_maps) if (String(m.drafting_run_id).startsWith(sp.job + "-")) for (const e of m.entries) if (e.fact === sp.id) { e.fact = sp.new_id; n++; }
    const old = list.find((f) => f.id === sp.id);
    old.meaning = kept.meaning; old.value_type = kept.value_type; old.proposed_by = old.proposed_by.filter((x: string) => x !== moved.run);
    list.push({ id: sp.new_id, meaning: moved.meaning, value_type: moved.value_type, proposed_by: [moved.run], split_from: sp.id });
    const pl = config.placements.find((p: any) => p.fact === sp.id);
    if (pl) config.placements.push({ ...pl, fact: sp.new_id, confidence: "low", reason: `placement copied from ${sp.id} when the field was split by meaning (P2-M2); a person reviews`, repaired_by: "field review" });
    config.unresolved.push({ from: "assembly", item: `${sp.id} / ${sp.new_id}`, reason: `field review: split by meaning; ${sp.id} placement covers both until a person reviews the copied placement` });
    const mapMoved = n;
    const dep = { checks_moved: [] as string[], checks_kept: [] as string[], unscoped: [] as string[] };
    for (const c of config.checks) {
      if (!refers({ inputs: c.inputs, condition: c.condition }, sp.id)) continue;
      const scope = c.group === "form_native" ? (boxFact(c) === sp.new_id ? "moved" : boxFact(c) === sp.id ? "kept" : null)
        : runOfFile(c.source_file).startsWith(sp.job + "-") ? "moved" : runOfFile(c.source_file).startsWith(sp.keep_meaning_from + "-") ? "kept" : null;
      if (scope === "moved") { n += rewrite({ inputs: c.inputs, condition: c.condition }, sp.id, sp.new_id); dep.checks_moved.push(c.id); }
      else if (scope === "kept") dep.checks_kept.push(c.id);
      else dep.unscoped.push(`check ${c.id}`);
    }
    for (const k of ["forms", "document_requirements", "rules", "derived_fields", "sections"] as const)
      (config[k] ?? []).forEach((x: any, i: number) => { if (refers(x, sp.id)) dep.unscoped.push(`${k}[${i}] ${x.id ?? x.form_number ?? x.document_type ?? x.when_plain ?? ""}`.trim()); });
    if (dep.unscoped.length) config.unresolved.push({ from: "assembly", item: `${sp.id} / ${sp.new_id}`, reason: `field review: after the split, ${dep.unscoped.length} reference(s) to ${sp.id} cannot be tied to one meaning by box or source run; they keep '${list.find((f) => f.id === sp.id)?.meaning}' until a person confirms: ${dep.unscoped.join("; ")}` });
    log.splits_applied.push({ ...sp, map_entries_moved: mapMoved, dependent_references_moved: n - mapMoved, dependent_checks_moved: dep.checks_moved, dependent_checks_kept: dep.checks_kept, references_listed_for_review: dep.unscoped });
    log.references_rewritten += n;
  }
  // (2b) Merges: rewrite every reference from -> to, everywhere a field id appears.
  for (const m of review.merges ?? []) {
    const from = list.find((f) => f.id === m.from), to = list.find((f) => f.id === m.to);
    if (!from || !to) { config.unresolved.push({ from: "assembly", item: `${m.from} -> ${m.to}`, reason: "field review: merge not applied, a field is not in this draft" }); continue; }
    const pf = config.placements.filter((p: any) => p.fact === m.from), pt = config.placements.filter((p: any) => p.fact === m.to);
    const same = (a: any, b: any) => a.section_id === b.section_id && a.tier === b.tier && a.collected_from === b.collected_from && a.client_visible === b.client_visible;
    if (pf.length && pt.length && !pf.every((a: any) => pt.every((b: any) => same(a, b)))) { config.unresolved.push({ from: "assembly", item: `${m.from} -> ${m.to}`, reason: "field review: merge not applied, the two are placed differently; a person decides" }); continue; }
    if (pf.length && pt.length) { config.placements = config.placements.filter((p: any) => p.fact !== m.from); log.placements_dropped.push({ fact: m.from, kept: m.to }); }
    list.splice(list.indexOf(from), 1);
    to.proposed_by = [...new Set([...to.proposed_by, ...from.proposed_by])];
    if (from.value_type !== to.value_type) to.decide = `${to.decide ? to.decide + "; " : ""}merged ${m.from} has value type ${from.value_type}`;
    const { unresolved: _u, ...rest } = config;
    const n = rewrite(rest, m.from, m.to);
    // Recorded after the rewrite, so the alias keeps the old id (found in the first r2 assembly: it was rewritten too).
    to.aliases = [...(to.aliases ?? []), { id: m.from, meaning: from.meaning, reason: m.reason }];
    log.merges_applied.push({ from: m.from, to: m.to, references_rewritten: n });
    log.references_rewritten += n;
  }
  // (2c) D30 re-scopes (P5 entry, 20 Oct): a fact drafted with case scope that each applicant answers for themself
  // (IMM 1295 for each applicant, D20: "My occupation in Canada will be", the applicant's own permit type) gets a
  // per-person id. Every reference is rewritten (maps, placements, conditions, checks, calculations, the field's own
  // id); its placement repeats per person; a case-level condition that reads it is evaluated for each applicant.
  // Facts the review keeps case-wide (service language, country where applying, the couple's marriage date) are listed
  // in the same entry with their reason and stay as they are.
  for (const rs of review.rescopes ?? []) {
    const r = applyRescope(config, rs);
    for (const id of r.missing) config.unresolved.push({ from: "assembly", item: `${id} -> ${rs.ids[id]}`, reason: "field review: re-scope not applied, neither a field nor a calculation of this draft" });
    for (const m of r.moved) log.references_rewritten += m.references_rewritten;
    log.rescopes_applied = [...(log.rescopes_applied ?? []), { reason: rs.reason, citations: rs.citations, moved: r.moved, conditions_now_each_applicant: r.conditions, kept_case_wide: rs.kept_case_wide }];
  }
  for (const f of review.flags ?? []) {
    for (const id of f.ids) { const c = list.find((x) => x.id === id); if (c && f.ids.length > 1) c.decide = `${c.decide ? c.decide + "; " : ""}${f.reason}`; }
    config.unresolved.push({ from: "assembly", item: f.ids.join(" / "), reason: `field review (flag): ${f.reason}` });
    log.flagged.push(f);
  }
  const { checked, mismatches } = formNativeConsistency(config);
  log.dependent_consistency = { form_native_checks_checked: checked, mismatches };
  for (const x of mismatches) config.unresolved.push({ from: "assembly", item: x.id, reason: `field review: form-native check reads ${x.inputs.join(", ")} but its box's map entry reads ${x.box_fact}` });
  detectSimilar(); // on the reconciled list, so merged ids are not listed again
  config.structure.canonical_fields = list.length;
  config.structure.decide_items = list.filter((f) => f.decide).length;
  config.structure.field_review = log;
}

/** Listed content repairs (D20 and the like): each changes named fields of matching items and is recorded. */
function applyRepairs(config: any, repairs: any, file: string | null) {
  const log: any[] = [];
  for (const r of repairs?.repairs ?? []) {
    const hits = (config[r.target] ?? []).filter((x: any) => Object.entries(r.match).every(([k, v]) => String(x[k]).trim() === v));
    for (const x of hits) {
      const before = Object.fromEntries(Object.keys(r.set).map((k) => [k, x[k]]));
      Object.assign(x, r.set, { repaired_by: r.id });
      log.push({ id: r.id, target: r.target, match: r.match, before, after: r.set, reason: r.reason, citation: r.citation });
    }
    if (!hits.length) config.unresolved.push({ from: "assembly", item: r.id, reason: `repair not applied: no ${r.target} item matches` });
  }
  config.structure.repairs = { file: file && relative(SOLUTION, file).split(sep).join("/"), applied: log }; // relative: portable (P2-R2-m2)
  config.structure.unresolved = config.unresolved.length;
}
