// A4 (Lead check, accepted 23 Oct; F1 slice 2): a form's field map is drafted reuse first, in parts, and merged. Rules,
// no AI, no database:
//  1. reuse first: a form field an earlier edition of the same form already maps (same data path, same caption) takes
//     that mapping, and the AI never sees it;
//  2. split: the form fields left are grouped by form section ("Part1.SponsorDetails") and packed into parts of at most
//     `maxFields`, so each AI call is small and the parts run side by side (the bounded queue); a repeating row group is
//     never split, so one person's row stays in one call;
//  3. merge: the parts' answers and the reused entries become one answer; the same meaning proposed under two names in
//     different parts is flagged as a near-duplicate for a person (never merged silently).
import { normLabel } from "./twin.ts";
import type { FieldMapAnswer, FieldMapEntry } from "./ai-run.ts";

export type InvField = { data_path?: string | null; caption?: string | null; section?: string | null; in_row?: string | null; [k: string]: unknown };
export type InvGroup = { data_path?: string | null; occur?: unknown; fixed_row?: boolean | null };
/** A mapping an earlier edition of the same form holds (its newest version). */
export type Prior = { data_path: string; caption: string | null; outcome: string; fact: string | null; person: string | null; transform: string | null; row: number | null; condition: string | null; edition: string };
export type Reused = FieldMapEntry & { reused_from: string };
export type Part = { index: number; count: number; sections: string[]; fields: InvField[] };
export type DraftPlan = { total: number; reused: Reused[]; leftover: number; parts: Part[] };

export const MAX_PART_FIELDS = 60;
/** Output tokens a part may need: about 300 per form field (IMM 1295: 242 fields, 53–63 thousand), plus headroom. */
export const partOutputTokens = (fields: number) => Math.min(64_000, 4_000 + 300 * fields);

/** The section group of a form field: the first two parts of its section ("Part1.CoSigner.CosignDetails" → "Part1.CoSigner"). */
export const sectionOf = (f: InvField) => ((f.section ?? "").split(".").slice(0, 2).join(".") || String(f.data_path ?? "").split(".").slice(0, 2).join(".") || "form");

export function planDraft(inv: { fields: InvField[]; groups?: InvGroup[] }, prior: Prior[], opts: { maxFields?: number; redirect?: (key: string) => string | null } = {}): DraftPlan {
  const max = opts.maxFields ?? MAX_PART_FIELDS;
  const fields = inv.fields.filter((f) => f.data_path);
  const byPath = new Map(prior.map((p) => [p.data_path, p]));
  const reused: Reused[] = [], left: InvField[] = [];
  for (const f of fields) {
    const p = byPath.get(f.data_path!);
    const fact = p?.fact ? (opts.redirect?.(p.fact) ?? p.fact) : null;
    if (p && ["mapped", "not_a_fact", "never_filled"].includes(p.outcome) && normLabel(p.caption) === normLabel(f.caption) && (p.outcome !== "mapped" || fact)) {
      reused.push({ data_path: f.data_path!, outcome: p.outcome, person: p.person, row: p.row, fact, transform: p.transform, condition: p.condition, confidence: "high",
        unresolved_reason: p.outcome === "mapped" ? null : `as in ${p.edition}`, evidence_quote: f.caption ?? f.data_path!, reused_from: p.edition });
    } else left.push(f);
  }
  // Units that must stay together: the form fields of one repeating row (a group with an occurrence rule), else one field.
  const repeating = new Set((inv.groups ?? []).filter((g) => g.data_path && g.occur != null && !g.fixed_row).map((g) => g.data_path!));
  const units: { section: string; fields: InvField[] }[] = [];
  for (const f of left) {
    const row = f.in_row && repeating.has(f.in_row) ? f.in_row : null;
    const last = units.at(-1);
    if (row && last && last.fields[0].in_row === row) last.fields.push(f);
    else units.push({ section: sectionOf(f), fields: [f] });
  }
  // Pack units into parts in form order, a new part when the next unit would pass the limit or a new section group
  // starts once the part is at least half full.
  const parts: Omit<Part, "count">[] = [];
  let cur: Omit<Part, "count"> | null = null;
  for (const u of units) {
    const size = cur?.fields.length ?? 0;
    const newSection = !!cur && !cur.sections.includes(u.section);
    if (!cur || size + u.fields.length > max || (newSection && size >= max / 2)) { cur = { index: parts.length + 1, sections: [], fields: [] }; parts.push(cur); }
    if (!cur.sections.includes(u.section)) cur.sections.push(u.section);
    cur.fields.push(...u.fields);
  }
  return { total: fields.length, reused, leftover: left.length, parts: parts.map((p) => ({ ...p, count: parts.length })) };
}

export type NearDuplicate = { a: string; b: string; parts: [number, number]; why: string };
const words = (id: string) => id.split(".").slice(1).join("_").split("_").filter((w) => w && !["of", "the", "a", "an"].includes(w));
const normMeaning = (m: string) => m.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** One answer from the parts' answers (in part order) and the reused entries, with near-duplicate proposals flagged. */
export function mergeParts(answers: { part: number; answer: FieldMapAnswer }[], reused: Reused[]): { answer: FieldMapAnswer & { entries: (FieldMapEntry & { reused_from?: string; part?: number })[] }; near_duplicates: NearDuplicate[] } {
  const fields = new Map<string, { id: string; meaning: string; value_type: string; part: number }>();
  const near: NearDuplicate[] = [];
  for (const { part, answer } of answers) for (const c of answer.canonical_fields ?? []) {
    const had = fields.get(c.id);
    if (had) { if (normMeaning(had.meaning) !== normMeaning(c.meaning) || had.value_type !== c.value_type) near.push({ a: c.id, b: c.id, parts: [had.part, part], why: `the same name with another meaning or type in part ${part} ("${c.meaning}", ${c.value_type})` }); continue; }
    for (const o of fields.values()) {
      if (o.part === part || o.id.split(".")[0] !== c.id.split(".")[0]) continue;
      const wa = new Set(words(o.id)), wb = new Set(words(c.id));
      const shared = [...wa].filter((w) => wb.has(w)).length;
      const sameWords = shared === wa.size && shared === wb.size;
      const contained = shared >= 2 && (shared === wa.size || shared === wb.size);
      const sameMeaning = normMeaning(o.meaning) === normMeaning(c.meaning);
      if (sameWords || contained || sameMeaning) near.push({ a: o.id, b: c.id, parts: [o.part, part], why: sameMeaning ? "the same meaning under two names" : sameWords ? "the same words in another order" : "one name holds the other" });
    }
    fields.set(c.id, { ...c, part });
  }
  const seen = new Set<string>();
  const entries: (FieldMapEntry & { reused_from?: string; part?: number })[] = [];
  for (const e of reused) { seen.add(e.data_path); entries.push(e); }
  for (const { part, answer } of answers) for (const e of answer.entries ?? []) if (!seen.has(e.data_path)) { seen.add(e.data_path); entries.push({ ...e, part }); }
  return { answer: { form_edition: answers[0]?.answer.form_edition, canonical_fields: [...fields.values()].map(({ part: _p, ...c }) => c), entries }, near_duplicates: near };
}
