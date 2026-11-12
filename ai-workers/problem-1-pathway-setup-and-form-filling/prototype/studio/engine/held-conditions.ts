// QA-237, QA-239 (Bake row 6; B86, B88): a question's "asked only when" condition lives on the shared library question, so
// approving one on a combination reaches every combination that asks that question. A combination whose forms, rules or
// questions cannot honour it (a form field reads the answer outside the condition, a rule or line reads it, or the
// deciding question is never asked) does not hide the question: the condition is held there, the question is asked every
// time, and Review and release says why as a warning. The guard rail stays whole (SA-1B-7 rule 3): nothing a form or
// rule reads is ever hidden; only the dead end is gone. Once the combination's form fields hold the same condition
// (B86's door, B88's ask), nothing reads the answer outside it and the condition is in force there.
// Pure: one place decides, for the snapshot builder (engine/snapshot.ts) and the release check (engine/validate.ts).
import { canonical } from "../../contracts/rules.ts";
import type { Snapshot } from "./snapshot.ts";

/** A condition without whose answer it is read from, to compare two of them; null for anything that is not a condition
 *  (a form field's words are never one, B86). */
export const bareCond = (c: any) => { if (!c || typeof c !== "object") return null; const { subjectKind: _k, ...n } = c; return canonical(n); };
/** QA-402: a form field's gate (B107, engine/form-field-condition.ts boxGate, kept here so this module imports nothing
 *  heavy): the form's own condition for writing the answer, with its words; null for a B86 rule or none. */
const gateOf = (rule: unknown): { tree: unknown; words: string } | null => {
  const g = rule && typeof rule === "object" && !Array.isArray(rule) ? (rule as { gate?: unknown; words?: unknown }) : null;
  return g && g.gate && typeof g.gate === "object" && typeof g.words === "string" ? { tree: g.gate, words: g.words } : null;
};
const fieldsOf = (c: unknown): string[] => (c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : []);

/** What reads one conditioned question's answer outside its condition, on this snapshot. */
export type ConditionConflict = {
  placement: { lineage: string; fact: string; condition: unknown; condition_effect?: string | null; condition_plain?: string | null };
  /** Each form that reads the answer, and whether every form field of it that does applies under the same condition.
   *  QA-402: `gate`, the form's own words of when it writes the answer, when a form field holding a gate (B107) is why. */
  forms: { form: string; ok: boolean; formConditioned: boolean; gate: string | null }[];
  /** Each condition (rule, document line, form line, check) that reads the answer outside the question's own condition. */
  conditions: string[];
  /** Deciding facts no question, supported document or derived definition supplies. */
  unreachable: string[];
};

/** Grounding audit finding 3 (W1 3.4, 3.5), the facts behind it: per SHOW or HIDE placement with a condition, the forms,
 *  conditions and deciding facts that make hiding it unsafe here. A form or form field that applies under the same SHOW
 *  condition is compatible. */
export function conditionConflicts(s: Snapshot, placed = new Set(s.placements.map((p) => p.fact)), docFacts = new Set((s.document_types ?? []).flatMap((t) => t.supplies_facts ?? [])), derived = new Set((s.derived_fields as { id: string }[]).map((d) => d.id))): ConditionConflict[] {
  const readers = new Map<string, { form: string; formCond: any; boxCond: any }[]>();
  for (const m of s.field_maps) { const f = s.forms.find((x) => x.form_number === m.form_number); if (!f) continue; for (const e of m.entries) if (e.outcome === "mapped" && e.fact) readers.set(e.fact, [...(readers.get(e.fact) ?? []), { form: f.form_number, formCond: f.condition, boxCond: e.condition_rule }]); }
  const conditions = [...s.rules.map((r) => ({ what: `rule ${r.id}`, tree: r.when })), ...s.document_requirements.map((d) => ({ what: `document "${d.document_type}"`, tree: d.condition })), ...s.forms.map((f) => ({ what: `form ${f.form_number}`, tree: f.condition })), ...(s.checks ?? []).filter((c) => c.condition && typeof c.condition === "object").map((c) => ({ what: `check ${c.id}`, tree: c.condition }))];
  const out: ConditionConflict[] = [];
  for (const p of s.placements) {
    if (!p.condition) continue;
    const eff = p.condition_effect ?? "SHOW";
    const c: ConditionConflict = { placement: p, forms: [], conditions: [], unreachable: [] };
    if (eff === "SHOW" || eff === "HIDE") {
      const own = bareCond(p.condition);
      const forms = new Map<string, boolean>(), gates = new Map<string, string>();
      // QA-402: a form field the form itself writes only under a gate (B107: IMM 5257's "b) Other" only when the purpose is
      // Other) reads the answer only under that gate, so a question shown under the same condition is compatible; under
      // another, the reason is the form's own condition in its words, never "whenever the form applies".
      for (const r of readers.get(p.fact) ?? []) {
        const gate = gateOf(r.boxCond);
        const ok = eff === "SHOW" && [r.formCond, r.boxCond, gate?.tree].some((x) => bareCond(x) === own);
        forms.set(r.form, (forms.get(r.form) ?? true) && ok);
        if (!ok && gate && !gates.has(r.form)) gates.set(r.form, gate.words);
      }
      for (const [form, ok] of forms) c.forms.push({ form, ok, formConditioned: !!s.forms.find((x) => x.form_number === form)?.condition, gate: ok ? null : gates.get(form) ?? null });
      for (const x of conditions) if (fieldsOf(x.tree).includes(p.fact) && !(eff === "SHOW" && own && canonical(x.tree).includes(own))) c.conditions.push(x.what);
    }
    for (const f of fieldsOf(p.condition)) if (!placed.has(f) && !docFacts.has(f) && !derived.has(f)) c.unreachable.push(f);
    out.push(c);
  }
  return out;
}

/** QA-237, QA-239: the conditions this combination holds (asks the question every time), each with why in plain words.
 *  Only a condition that would hide a question (SHOW or HIDE) and only for a reason this combination's content gives; a
 *  deciding fact the library does not define at all is not a reason to hold, so its own error stays. */
export function conditionsToHold(s: Snapshot): { lineage: string; fact: string; why: string[] }[] {
  const known = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id));
  const words = (f: string) => `"${heldWords(s, f)}"`;
  const out: { lineage: string; fact: string; why: string[] }[] = [];
  for (const c of conditionConflicts(s)) {
    const eff = c.placement.condition_effect ?? "SHOW";
    if (eff !== "SHOW" && eff !== "HIDE") continue;
    const why = [
      ...c.forms.filter((f) => !f.ok).map((f) => `${f.form} reads its answer ${readsWhen(f)}`),
      ...c.conditions.map((w) => `${w} reads its answer`),
      ...c.unreachable.filter((f) => known.has(f)).map((f) => `it depends on ${words(f)}, which no question, supported document or derived definition supplies here`),
    ];
    if (why.length) out.push({ lineage: c.placement.lineage, fact: c.placement.fact, why });
  }
  return out;
}

/** A field's meaning as Review prints it (engine/sources.ts factWords, kept here so this module imports nothing heavy). */
export const heldWords = (s: Pick<Snapshot, "canonical_fields">, fact: string) => {
  const m = ((s.canonical_fields as { id: string; meaning?: string }[]).find((f) => f.id === fact)?.meaning ?? fact).trim().replace(/\.$/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/** When a form reads a conditioned question's answer outside the condition, in words (QA-402: a gate says the form's own). */
export const readsWhen = (f: { formConditioned: boolean; gate?: string | null }) =>
  f.gate ? `only when ${f.gate.trim().replace(/[.\s]+$/, "")} (the form's own condition)` : f.formConditioned ? "under a different condition" : "whenever the form applies";
/** The opening words of the warning (Review and release shows "Form fields that read this answer" under it, B86). */
export const HELD_OPENING = "Condition not used on this combination";

/** The held conditions put back on their questions: the library's view, for the screens that set conditions and form fields
 *  (B86's and B88's door), which compare a form field with its question's own condition, held here or not. */
export function withHeldConditions<S extends Pick<Snapshot, "placements" | "held_conditions">>(s: S): S {
  if (!s.held_conditions?.length) return s;
  const by = new Map(s.held_conditions.map((h) => [h.lineage, h]));
  return { ...s, placements: s.placements.map((p) => { const h = by.get(p.lineage); return h ? { ...p, condition: h.condition, condition_effect: h.condition_effect, condition_plain: h.condition_plain } : p; }) };
}
