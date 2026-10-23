// FROZEN v1 (20 Oct 2026, before P2-M2): the assembler that produced the original P2 configurations; kept to
// reproduce them byte for byte. Superseded by p2/assemble.ts (v2). Do not edit.
// Assembles one draft configuration for combination 1 from the drafting runs (rules, no AI): canonical
// fields, field maps, forms, document requirements, rules, sections, placements and checks, plus the two
// check groups made by rules (form-native checks from each form's own inventory; read-back per form) and
// the structure checks of activity 4.1 (coverage, references, quotes found in their cited source). Every
// failing structure item is listed as unresolved, never hidden. The result is a DRAFT: nothing uses it
// until people review and release it (D254, AIW-D263).
import { Ajv } from "ajv";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { CALCULATIONS, validatePredicate } from "../contracts/rules.ts";
import { LABEL, PROTOTYPE, SOLUTION } from "./policy.ts";

type Env = { caller: string; drafting_run: any; raw_output: string; launch_evidence: any };
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function assemble(mode: string, runFiles: string[]) {
  const envs = runFiles.map((f) => ({ file: f, env: JSON.parse(readFileSync(f, "utf8")) as Env }));
  const byKind = (k: string) => envs.filter((e) => e.env.launch_evidence.schema_file.startsWith(k));
  const maps = byKind("field-map"), [req] = byKind("requirements"), [sec] = byKind("sections"), [chk] = byKind("checks");
  const out = (e: { env: Env }) => JSON.parse(e.env.raw_output);
  const unresolved: { from: string; item: string; reason: string }[] = [];
  const sources = new Map<string, string>();
  const sourceText = new Map<string, string>(); // admitted input path -> searchable text

  // Canonical fields: union across drafts; one id with two meanings or types is a 'decide' item (3.1).
  const fields = new Map<string, { id: string; meaning: string; value_type: string; proposed_by: string[]; decide?: string }>();
  const addField = (f: { id: string; meaning: string; value_type: string }, run: string) => {
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
    return { form_edition: (run.entries ?? [])[0]?.form_edition ?? o.form_edition, drafted_edition: o.form_edition, form_sha256: inv.summary.sha256, drafting_run_id: run.run_id, inventory: invFile, entries: run.entries ?? [], boxes: boxes.size, inv };
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
      if (f.required) checks.push({ ...base, id: `fn-required:${f.data_path}`, condition: "exists(value)", severity: "block", user_action: "complete the fact before the form is rendered" });
      if (f.max_chars) checks.push({ ...base, id: `fn-length:${f.data_path}`, condition: `length(value) <= ${f.max_chars}`, severity: "warn", user_action: "continuation sheet or shorten; never silently truncated" });
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
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addSchema(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", "field-map-entry.v0.schema.json"), "utf8")));
  const validate = ajv.compile(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", "combination-config.v0.schema.json"), "utf8")));
  const valid = validate(config) as boolean;
  mkdirSync(join(PROTOTYPE, "p2", "config"), { recursive: true });
  const file = join(PROTOTYPE, "p2", "config", `c1-draft-1-${mode}.json`);
  writeFileSync(file, JSON.stringify(config, null, 1) + "\n");
  return { file, valid, errors: valid ? null : validate.errors };
}
