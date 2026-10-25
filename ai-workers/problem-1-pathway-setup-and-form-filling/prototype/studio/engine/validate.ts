// Draft validation and release differences. Problems are stated in plain words with where they are; errors block
// submission, warnings are shown and recorded. Conditions are checked against the portable copy of the team's
// closed predicate contract (contracts/predicate.v0.schema.json) and against the library's field types.
import { Ajv } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonical, CALCULATIONS, validatePredicate } from "../../contracts/rules.ts";
import type { Snapshot } from "./snapshot.ts";
import { channelProblems } from "./channels.ts";
import { COVERAGE_FIXES, coverageGaps } from "./coverage.ts";

const schema = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "contracts", "predicate.v0.schema.json"), "utf8"));
const ajv = new Ajv({ strict: false, allErrors: true });
ajv.addSchema(schema); // the same lookup as tests/check_conditions.ts
const nodeValid = ajv.getSchema(`${schema.$id}#/definitions/node`)!;
export const isNode = (n: unknown) => nodeValid(n) as boolean;

export type Problem = { level: "error" | "warning"; where: string; item: string; message: string };
const ORDERED = new Set(["gt", "gte", "lt", "lte"]);

export function checkCondition(tree: any, fieldTypes: Map<string, string>, derived: Set<string>): string[] {
  if (!tree) return [];
  const errs = validatePredicate(tree, isNode);
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (n.field) {
      if (!fieldTypes.has(n.field) && !derived.has(n.field)) errs.push(`reads ${n.field}, which is not in the library`);
      else if (ORDERED.has(n.op) && !derived.has(n.field) && !["date", "number"].includes(fieldTypes.get(n.field) ?? "")) errs.push(`compares ${n.field} with "${n.op}", but it is a ${fieldTypes.get(n.field)} field`);
    }
    (n.args ?? []).forEach(walk); if (n.arg) walk(n.arg);
  };
  const { subjectKind: _k, ...node } = tree;
  walk(node);
  return errs;
}

export function validate(s: Snapshot, library: { key: string; valueType: string }[], derivedRows: { id: string; calculation: string }[]): Problem[] {
  const out: Problem[] = [];
  const types = new Map(library.map((f) => [f.key, f.valueType]));
  const derived = new Set(derivedRows.map((d) => d.id));
  const placed = new Set(s.placements.map((p) => p.fact));
  const docFacts = new Set((s.document_types ?? []).flatMap((t) => t.supplies_facts ?? []));
  const sectionIds = new Set(s.sections.map((x) => x.id));
  // No forms is not a warning here: the missing list (BR-8, engine/programs.ts) says it once, with its next step.
  for (const f of s.forms) {
    for (const e of checkCondition(f.condition, types, derived)) out.push({ level: "error", where: "Forms", item: f.form_number, message: `Condition ${e}.` });
    if ((f.form_kind ?? "data_form") === "data_form" && !s.field_maps.some((m) => m.form_number === f.form_number)) out.push({ level: "warning", where: "Forms", item: f.form_number, message: "No field map yet: the form cannot be filled." });
  }
  const unplaced = new Map<string, number>();
  for (const m of s.field_maps) for (const e of m.entries) {
    if (e.outcome !== "mapped" || !e.fact) continue;
    if (!types.has(e.fact)) out.push({ level: "error", where: `Field map ${m.form_edition}`, item: e.data_path, message: `The form field reads ${e.fact}, which is not in the library.` });
    else if (!placed.has(e.fact) && !docFacts.has(e.fact)) unplaced.set(e.fact, (unplaced.get(e.fact) ?? 0) + 1);
  }
  // Screen 03 S2, BR-7 (P-62 §2, §5.3): every fact a form field needs for a person role the combination has is asked, filled
  // by the case officer, or carried by a link; otherwise release is blocked, per role, naming the fact and the three fixes.
  // The gate follows what a case on this configuration asks (Lead, 25 Oct): a placement outside the selected sections counts.
  const roleLabel = new Map(((s.combination.participants ?? []) as { role: string; label?: string }[]).map((p) => [p.role, p.label ?? p.role]));
  const meaning = new Map((s.canonical_fields as { id: string; meaning?: string }[]).map((f) => [f.id, f.meaning ?? f.id]));
  const gaps = coverageGaps(s).filter((g) => types.has(g.fact)); // a field not in the library is already an error above
  for (const g of gaps) out.push({ level: "error", where: "SQR", item: g.fact, message: `${roleLabel.get(g.role) ?? (g.role === "the application" ? "The application" : g.role)}: "${meaning.get(g.fact) ?? g.fact}" is needed by ${g.forms.join(", ")} but nobody is asked for it. Fix: ${COVERAGE_FIXES}.` });
  for (const g of gaps) unplaced.delete(g.fact);
  for (const [fact, n] of unplaced) out.push({ level: "warning", where: "Library", item: fact, message: `${n} form field${n > 1 ? "s read" : " reads"} this field, but nobody is asked for it and no supported document supplies it: in a case it stays unresolved until a placement is added.` });
  for (const p of s.placements) {
    if (!sectionIds.has(p.section_id)) out.push({ level: "warning", where: "Questions", item: p.fact, message: `Placed in section ${p.section_id}, which this combination's questionnaire does not use.` });
    for (const e of checkCondition(p.condition, types, derived)) out.push({ level: "error", where: "Questions", item: p.fact, message: `Condition ${e}.` });
    if (p.condition && !p.condition_effect) out.push({ level: "error", where: "Questions", item: p.fact, message: "A condition needs an effect (show, hide, require or optional)." });
  }
  for (const d of s.document_requirements) {
    for (const e of checkCondition(d.condition, types, derived)) out.push({ level: "error", where: "Documents", item: d.document_type, message: `Condition ${e}.` });
    if (d.base_or_conditional === "conditional" && !d.condition) out.push({ level: "error", where: "Documents", item: d.document_type, message: "A conditional requirement needs a condition." });
  }
  for (const r of s.rules) for (const e of checkCondition(r.when, types, derived)) out.push({ level: "error", where: "Rules", item: r.id, message: `Condition ${e}.` });
  for (const c of s.checks.filter((x) => x.condition && typeof x.condition === "object")) for (const e of checkCondition(c.condition, types, derived)) out.push({ level: "warning", where: "Checks", item: c.id, message: `Condition ${e}; the check is not evaluated.` });
  out.push(...reachability(s, placed, docFacts, derived));
  // Only the derived definitions this combination reads (Lead check item 3): the library holds every definition, and
  // one nobody here uses is not this combination's warning.
  const reads = derivedRead(s);
  for (const d of derivedRows) if (reads.has(d.id) && !CALCULATIONS[d.calculation]) out.push({ level: "warning", where: "Derived fields", item: d.id, message: `Calculation ${d.calculation} has no tested helper: recorded, never evaluated.` });
  out.push(...channelProblems(s)); // F1 (forms lane): filing channels, online versions and option maps
  return out;
}

/** The facts a combination reads (its boxes and every condition on forms, questions, documents, rules and checks), then
 *  the inputs of the derived definitions among them, until nothing new is added. */
export function derivedRead(s: Snapshot): Set<string> {
  const fieldsOf = (c: unknown) => c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : [];
  const out = new Set<string>([...s.field_maps.flatMap((m) => m.entries.map((e: { fact?: string | null }) => e.fact ?? "")).filter(Boolean),
    ...[...s.forms.map((f) => f.condition), ...s.placements.map((p) => p.condition), ...s.document_requirements.map((d) => d.condition), ...s.rules.map((r) => r.when), ...(s.checks ?? []).map((c) => c.condition)].flatMap(fieldsOf)]);
  for (let grew = true; grew;) {
    grew = false;
    for (const d of s.derived_fields) if (out.has(d.id)) for (const i of [...(d.inputs ?? []), d.reference].filter(Boolean)) if (!out.has(i)) { out.add(i); grew = true; }
  }
  return out;
}

/** Grounding audit finding 3 (W1 3.4, 3.5): a question's condition must never hide a value that something applicable
 *  still reads, every value that decides a question must be obtainable, and questions must not decide each other in a
 *  loop. Errors block submission and release. A form or box that applies under the same condition is compatible. */
function reachability(s: Snapshot, placed: Set<string>, docFacts: Set<string>, derived: Set<string>): Problem[] {
  const out: Problem[] = [];
  const bareCond = (c: any) => { if (!c || typeof c !== "object") return null; const { subjectKind: _k, ...n } = c; return canonical(n); };
  const fieldsOf = (c: any) => c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : [];
  const readers = new Map<string, { form: string; formCond: any; boxCond: any }[]>();
  for (const m of s.field_maps) { const f = s.forms.find((x) => x.form_number === m.form_number); if (!f) continue; for (const e of m.entries) if (e.outcome === "mapped" && e.fact) readers.set(e.fact, [...(readers.get(e.fact) ?? []), { form: f.form_number, formCond: f.condition, boxCond: e.condition }]); }
  const conditions = [...s.rules.map((r) => ({ what: `rule ${r.id}`, tree: r.when })), ...s.document_requirements.map((d) => ({ what: `document "${d.document_type}"`, tree: d.condition })), ...s.forms.map((f) => ({ what: `form ${f.form_number}`, tree: f.condition })), ...(s.checks ?? []).filter((c) => c.condition && typeof c.condition === "object").map((c) => ({ what: `check ${c.id}`, tree: c.condition }))];
  for (const p of s.placements) {
    if (!p.condition) continue;
    const eff = p.condition_effect ?? "SHOW";
    if (eff === "SHOW" || eff === "HIDE") {
      const own = bareCond(p.condition), when = p.condition_plain ?? "its condition";
      const forms = new Map<string, boolean>();
      for (const r of readers.get(p.fact) ?? []) { const ok = eff === "SHOW" && [r.formCond, r.boxCond].some((c) => bareCond(c) === own); forms.set(r.form, (forms.get(r.form) ?? true) && ok); }
      for (const [form, ok] of forms) if (!ok) out.push({ level: "error", where: "Questions", item: p.fact, message: `Hiding a value a form reads: the question for ${p.fact} is ${eff === "HIDE" ? "hidden when" : "shown only when"} "${when}", but ${form} reads it ${s.forms.find((x) => x.form_number === form)?.condition ? "under a different condition" : "whenever the form applies"}. Make the form or its form fields apply under the same condition, or remove the question's condition.` });
      for (const c of conditions) if (fieldsOf(c.tree).includes(p.fact) && !(eff === "SHOW" && own && canonical(c.tree).includes(own))) out.push({ level: "error", where: "Questions", item: p.fact, message: `Hiding a value a condition reads: ${c.what} reads ${p.fact}, whose question is ${eff === "HIDE" ? "hidden when" : "shown only when"} "${when}". The condition could never be decided while the question is hidden.` });
    }
    for (const f of fieldsOf(p.condition)) if (!placed.has(f) && !docFacts.has(f) && !derived.has(f)) out.push({ level: "error", where: "Questions", item: p.fact, message: `Unreachable question: it depends on ${f}, which no question, supported document or derived definition supplies, so it can never be decided.` });
  }
  // Loops: question A depends on B, which depends (directly or through others) on A.
  const dep = new Map<string, string[]>();
  for (const p of s.placements) if (p.condition) dep.set(p.fact, [...new Set([...(dep.get(p.fact) ?? []), ...fieldsOf(p.condition)])]);
  const reported = new Set<string>();
  const visit = (start: string, at: string, path: string[]) => {
    for (const next of dep.get(at) ?? []) {
      if (next === start) { const loop = [...path, start]; const k = [...loop].sort().join(","); if (!reported.has(k)) { reported.add(k); out.push({ level: "error", where: "Questions", item: start, message: `Questions decide each other in a loop: ${loop.join(" → ")}. None of them can be shown first.` }); } }
      else if (!path.includes(next) && path.length < 12) visit(start, next, [...path, next]);
    }
  };
  for (const f of dep.keys()) visit(f, f, [f]);
  return out;
}

const KINDS: [keyof Snapshot, (x: any) => string, string][] = [
  ["canonical_fields", (x) => x.id, "Field"], ["sections", (x) => x.id, "Section"], ["placements", (x) => x.lineage, "Question placement"], ["forms", (x) => x.form_number, "Form"],
  ["document_requirements", (x) => x.lineage, "Document requirement"], ["rules", (x) => x.id, "Rule"], ["checks", (x) => x.id, "Check"],
];
const bare = (x: any) => { const { item_version, status, origin, ...r } = x; void item_version; void status; void origin; return canonical(r); };
export type Change = { kind: string; key: string; change: "added" | "changed" | "removed"; origin?: string; needs_sme: boolean; label: string };
export function diff(prev: Snapshot | null, next: Snapshot): Change[] {
  const out: Change[] = [];
  const sme = (kind: string, x: any) => ["Rule", "Document requirement", "Check"].includes(kind) || x?.origin === "AI_PROPOSAL" || (kind === "Form" && !!x?.condition);
  for (const [k, id, label] of KINDS) {
    const a = new Map(((prev?.[k] as any[]) ?? []).map((x) => [id(x), x])), b = new Map(((next[k] as any[]) ?? []).map((x) => [id(x), x]));
    for (const [key, x] of b) if (!a.has(key)) out.push({ kind: label, key, change: "added", origin: x.origin, needs_sme: sme(label, x), label: x.meaning ?? x.title ?? x.document_type ?? x.then ?? x.question_text ?? x.fact ?? key });
      else if (bare(a.get(key)) !== bare(x)) out.push({ kind: label, key, change: "changed", origin: x.origin, needs_sme: sme(label, x), label: x.meaning ?? x.title ?? x.document_type ?? x.then ?? x.fact ?? key });
    for (const [key, x] of a) if (!b.has(key)) out.push({ kind: label, key, change: "removed", needs_sme: sme(label, x), label: x.meaning ?? x.title ?? x.document_type ?? x.then ?? key });
  }
  const boxes = (s: Snapshot | null) => new Map<string, any>((s?.field_maps ?? []).flatMap((m: any) => m.entries.map((e: any) => [`${m.form_edition}|${e.data_path}`, e] as [string, any])));
  const a = boxes(prev), b = boxes(next);
  const byForm = new Map<string, { added: number; changed: number; removed: number; ai: number }>();
  const bump = (k: string, f: "added" | "changed" | "removed", ai: boolean) => { const form = k.split("|")[0]; const x = byForm.get(form) ?? { added: 0, changed: 0, removed: 0, ai: 0 }; x[f]++; if (ai) x.ai++; byForm.set(form, x); };
  for (const [k, e] of b) if (!a.has(k)) bump(k, "added", e.origin === "AI_PROPOSAL"); else if (bare(a.get(k)) !== bare(e)) bump(k, "changed", e.origin === "AI_PROPOSAL");
  for (const k of a.keys()) if (!b.has(k)) bump(k, "removed", false);
  for (const [form, x] of byForm) out.push({ kind: "Field map", key: form, change: x.added && !x.changed && !x.removed ? "added" : "changed", origin: x.ai ? "AI_PROPOSAL" : undefined, needs_sme: x.ai > 0, label: `${x.added} form fields added, ${x.changed} changed, ${x.removed} removed${x.ai ? ` (${x.ai} AI-proposed)` : ""}` });

  // Grounding audit finding 2: everything the release carries is reviewed. Who the row covers (its people and roles)
  // changes which forms, documents and questions apply, so it needs the SME duty; names and source labels are shown as
  // name-only changes. Document types (what a document supplies) and derived definitions change behaviour.
  const ca = (prev?.combination ?? null) as any, cb = next.combination as any;
  if (ca && canonical(ca.participants ?? []) !== canonical(cb.participants ?? [])) out.push({ kind: "People on this row", key: cb.key, change: "changed", needs_sme: true, label: `who this row covers: ${(cb.participants ?? []).map((p: any) => `${p.label} (${p.min}–${p.max})`).join(", ")}` });
  if (ca) { const meta = (x: any) => canonical({ key: x.key, label: x.label, program: x.program, pathway: x.pathway, source_basis: x.source_basis, basis_note: x.basis_note, path: x.path ?? null, client_type: x.client_type ?? null, allowed_locations: x.allowed_locations ?? null, portal: x.portal ?? null }); // the portal decides how lines are filed (break round 2 M1)
    if (meta(ca) !== meta(cb)) out.push({ kind: "Row details", key: cb.key, change: "changed", needs_sme: canonical(ca.allowed_locations ?? null) !== canonical(cb.allowed_locations ?? null) || ca.source_basis !== cb.source_basis, label: "name, path, portal, source basis or allowed locations (no line changed)" }); }
  for (const [k, id, label, behaviour] of [["document_types", (x: any) => x.key, "Document type", true], ["derived_fields", (x: any) => x.id, "Derived definition", true]] as const) {
    const a = new Map(((prev?.[k] as any[]) ?? []).map((x) => [id(x), x])), b = new Map(((next[k] as any[]) ?? []).map((x) => [id(x), x]));
    for (const [key, x] of b) if (!a.has(key)) out.push({ kind: label, key, change: "added", needs_sme: behaviour, label: x.name ?? x.plain ?? key });
      else if (canonical(a.get(key)) !== canonical(x)) out.push({ kind: label, key, change: "changed", needs_sme: behaviour, label: `${x.name ?? x.plain ?? key}: ${label === "Document type" ? `supplies ${(x.supplies_facts ?? []).join(", ") || "no facts"}` : `inputs ${(x.inputs ?? []).join(", ") || "none"}`}` });
    for (const [key, x] of a) if (!b.has(key)) out.push({ kind: label, key, change: "removed", needs_sme: behaviour, label: x.name ?? x.plain ?? key });
  }
  // Completeness guard: any other part of the released content that differs is listed rather than silently passed.
  const covered = new Set(["canonical_fields", "sections", "placements", "forms", "document_requirements", "rules", "checks", "field_maps", "combination", "document_types", "derived_fields", "mode", "row_versions"]);
  for (const k of new Set([...Object.keys(prev ?? {}), ...Object.keys(next)])) if (prev && !covered.has(k) && canonical((prev as any)[k] ?? null) !== canonical((next as any)[k] ?? null)) out.push({ kind: "Configuration", key: k, change: "changed", needs_sme: true, label: `${k} changed` });
  return out;
}
