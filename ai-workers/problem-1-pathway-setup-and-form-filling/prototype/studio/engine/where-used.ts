// SH2 (P-258, inside G-CORE P-253): where a library item is used, worked out once. Pure (P-249 lift-ready): no database,
// no framework, no vendor call; api/src/where-used.ts reads the rows and passes them in. Callers: the shared library's
// used-in lists and lifecycle guard (library-sources.ts, library-items.ts), a library form's uses (form-uses.ts), a new
// edition's impact review (impact.ts), and G-CORE's impact preview.
import { newestEdition } from "./programs.ts";

type Versioned = { version: number; status: string };

/** Each row's newest version, whatever its status (a retired newest one is still the newest: it hides the older ones). */
export const newestBy = <T extends { version: number }>(rows: T[], idOf: (r: T) => string): T[] => {
  const top = new Map<string, T>(); for (const r of rows) { const k = idOf(r), t = top.get(k); if (!t || r.version > t.version) top.set(k, r); }
  return [...top.values()];
};
/** PR #96 finding (a): only each row's newest version counts, and only while that version is a draft or published. */
export const current = <T extends Versioned>(rows: T[], idOf: (r: T) => string): T[] =>
  newestBy(rows, idOf).filter((r) => r.status === "PUBLISHED" || r.status === "DRAFT");

/** The shared fields a condition reads (the engine's own reading, engine/validate.ts). */
export const fieldsOf = (c: unknown) => (c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : []);

/** The rows a field's or an answer list's uses are read from (each table's own columns, as the database holds them). */
export type FieldUseRows = {
  /** Current mapped form fields with their edition. */
  boxes: { canonicalFieldKey: string | null; edition: { id: string; govFormDefId: string; channel: string; editionLabel: string; published?: string | null } }[];
  lines: (Versioned & { combinationId: string; lineageKey: string; govFormDefId: string; predicateJson: unknown })[];
  rules: (Versioned & { combinationId: string; predicateKey: string; predicateJson: unknown })[];
  docs: (Versioned & { combinationId: string; lineageKey: string; predicateJson: unknown })[];
  checks: (Versioned & { combinationId: string; checkKey: string; predicateJson: unknown })[];
  questions: (Versioned & { lineageKey: string; sectionKey: string; canonicalFieldKey: string; predicateJson: unknown })[];
  picks: { sectionKey: string; combinationId: string }[];
};

/** Every (field, combination) pair where a combination uses a shared field: its form reads it (on the form's current
 *  edition per channel), or its form conditions, rules, document lines or checks read it, or its questionnaire asks it
 *  (a question in a section the combination selects, or that question's condition) (PR #96 finding (b)). */
export function fieldUses(r: FieldUseRows): [string, string][] {
  const uses: [string, string][] = [];
  const formLines = current(r.lines, (l) => `${l.combinationId}|${l.lineageKey}`);
  const combosOf = new Map<string, string[]>(); for (const l of formLines) combosOf.set(l.govFormDefId, [...(combosOf.get(l.govFormDefId) ?? []), l.combinationId]);
  // PR #108 minor (a): a combination fills its form's current edition (per channel: the newest one mapped; a newer
  // edition not mapped yet leaves the older in use), so a field mapped only on a superseded edition is not used there.
  const chan = (e: FieldUseRows["boxes"][number]["edition"]) => `${e.govFormDefId}|${e.channel}`;
  const editions = [...new Map(r.boxes.map((b) => [b.edition.id, b.edition])).values()];
  const currentOf = new Map<string, string>(); for (const k of new Set(editions.map(chan))) currentOf.set(k, newestEdition(editions.filter((e) => chan(e) === k))!.id);
  for (const b of r.boxes) if (b.canonicalFieldKey && currentOf.get(chan(b.edition)) === b.edition.id) for (const c of combosOf.get(b.edition.govFormDefId) ?? []) uses.push([b.canonicalFieldKey, c]);
  for (const l of formLines) for (const f of fieldsOf(l.predicateJson)) uses.push([f, l.combinationId]);
  for (const x of current(r.rules, (x) => `${x.combinationId}|${x.predicateKey}`)) for (const f of fieldsOf(x.predicateJson)) uses.push([f, x.combinationId]);
  for (const d of current(r.docs, (d) => `${d.combinationId}|${d.lineageKey}`)) for (const f of fieldsOf(d.predicateJson)) uses.push([f, d.combinationId]);
  for (const k of current(r.checks, (k) => `${k.combinationId}|${k.checkKey}`)) for (const f of fieldsOf(k.predicateJson)) uses.push([f, k.combinationId]);
  const combosOfSection = new Map<string, string[]>(); for (const p of r.picks) combosOfSection.set(p.sectionKey, [...(combosOfSection.get(p.sectionKey) ?? []), p.combinationId]);
  for (const q of current(r.questions, (q) => q.lineageKey)) for (const f of [q.canonicalFieldKey, ...fieldsOf(q.predicateJson)]) for (const c of combosOfSection.get(q.sectionKey) ?? []) uses.push([f, c]);
  return uses;
}

/** Pairs into item key → the combinations using it. `keyOf` turns a pair's key into the item's (a field into its answer
 *  list); a pair with no item is left out. */
export function byItem(pairs: Iterable<[string, string]>, keyOf: (k: string) => string | null | undefined = (k) => k): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [k, c] of pairs) { const key = keyOf(k); if (!key) continue; const s = out.get(key) ?? new Set(); s.add(c); out.set(key, s); }
  return out;
}

/** A library form's line on each combination: the newest version of the combination's line for it, retired or not. */
export const formLineByCombination = <T extends { combinationId: string; version: number }>(lines: T[]): Map<string, T> =>
  new Map(newestBy(lines, (l) => l.combinationId).map((l) => [l.combinationId, l]));

/** The combinations whose newest line files the form (not retired). */
export const filingCombinations = <T extends { combinationId: string; version: number; status: string }>(lines: T[]): T[] =>
  [...formLineByCombination(lines).values()].filter((l) => l.status !== "RETIRED");

/** Releases that carry an item, per combination: each release with whether it is that combination's latest. */
export const releaseUses = (rows: { combinationId: string; version: number; latest: number }[]) =>
  rows.map((r) => ({ combinationId: r.combinationId, version: Number(r.version), latest: Number(r.version) === Number(r.latest) }));

/** G-CORE preview (P-253 step 4): the rules, form and document lines, checks and questions that read one field, each named
 *  by its table and key, with its combination (a question: each combination selecting its section). */
export type Reader = { kind: "form_line" | "rule" | "document_line" | "check" | "question"; key: string; combinationId: string; /** The current version's condition. */ tree: unknown };
export function fieldReaders(r: FieldUseRows, field: string): Reader[] {
  const out: Reader[] = [];
  const reads = (c: unknown) => fieldsOf(c).includes(field);
  for (const l of current(r.lines, (l) => `${l.combinationId}|${l.lineageKey}`)) if (reads(l.predicateJson)) out.push({ kind: "form_line", key: l.lineageKey, combinationId: l.combinationId, tree: l.predicateJson });
  for (const x of current(r.rules, (x) => `${x.combinationId}|${x.predicateKey}`)) if (reads(x.predicateJson)) out.push({ kind: "rule", key: x.predicateKey, combinationId: x.combinationId, tree: x.predicateJson });
  for (const d of current(r.docs, (d) => `${d.combinationId}|${d.lineageKey}`)) if (reads(d.predicateJson)) out.push({ kind: "document_line", key: d.lineageKey, combinationId: d.combinationId, tree: d.predicateJson });
  for (const k of current(r.checks, (k) => `${k.combinationId}|${k.checkKey}`)) if (reads(k.predicateJson)) out.push({ kind: "check", key: k.checkKey, combinationId: k.combinationId, tree: k.predicateJson });
  for (const q of current(r.questions, (q) => q.lineageKey)) if (reads(q.predicateJson)) for (const p of r.picks) if (p.sectionKey === q.sectionKey) out.push({ kind: "question", key: q.lineageKey, combinationId: p.combinationId, tree: q.predicateJson });
  return out;
}

/** C9.1 (P-32): what a changed form field's shared field touches beyond the form, on the given combinations: the sections
 *  whose questions ask it or whose question conditions read it (where the combination asks that question), the document
 *  types a checklist line lists under a condition that reads it or that a fact of it is read from, the rules and checks
 *  whose conditions read it, and a form's own rule (when it is filed) that reads it. One entry per (kind, key, field,
 *  combination), with how it is used. */
/** The key a form's own rule takes among a combination's rules (C9.1 components): never a rule key (those are words). */
export const formRuleKey = (form: string) => `form:${form}`;
export type ComponentUse = { kind: "section" | "document_type" | "rule" | "check"; key: string; field: string; combinationId: string; how: "asks" | "condition" | "fact" };
export type ComponentRows = Omit<FieldUseRows, "docs"> & {
  docs: (Versioned & { combinationId: string; lineageKey: string; documentTypeKey: string; predicateJson: unknown })[];
  facts: (Versioned & { combinationId: string; lineageKey: string; canonicalFieldKey: string; documentTypeKey: string | null })[];
};
export function fieldComponents(r: ComponentRows, fields: string[], combinations: Set<string>): ComponentUse[] {
  const out = new Map<string, ComponentUse>();
  const add = (u: ComponentUse) => { if (combinations.has(u.combinationId)) out.set(`${u.kind}|${u.key}|${u.field}|${u.combinationId}`, out.get(`${u.kind}|${u.key}|${u.field}|${u.combinationId}`) ?? u); };
  const want = new Set(fields);
  const picksOf = new Map<string, string[]>(); for (const p of r.picks) picksOf.set(p.sectionKey, [...(picksOf.get(p.sectionKey) ?? []), p.combinationId]);
  // QA-231: a combination asks a question when it chooses the question's section, or when its forms (a PDF edition's
  // form fields), form rules, rules or checklist lines read the question's fact: the snapshot then asks it after the
  // chosen sections (engine/snapshot.ts placements; a check never places a question, review m1). Both count: the
  // section is touched where the question is asked.
  const read = new Set(fieldUses({ ...r, boxes: r.boxes.filter((b) => b.edition.channel !== "ONLINE"), checks: [], questions: [], picks: [] }).map(([f, c]) => `${f}|${c}`));
  for (const q of current(r.questions, (q) => q.lineageKey)) {
    const reads = new Set([...(want.has(q.canonicalFieldKey) ? [q.canonicalFieldKey] : []), ...fieldsOf(q.predicateJson).filter((f) => want.has(f))]);
    const asking = new Set([...(picksOf.get(q.sectionKey) ?? []), ...[...combinations].filter((c) => read.has(`${q.canonicalFieldKey}|${c}`))]);
    for (const f of reads) for (const c of asking) add({ kind: "section", key: q.sectionKey, field: f, combinationId: c, how: f === q.canonicalFieldKey ? "asks" : "condition" });
  }
  // QA-231: a form's own rule (it is filed only when its condition holds) is a rule of the combination too.
  for (const l of current(r.lines, (l) => `${l.combinationId}|${l.lineageKey}`)) for (const f of fieldsOf(l.predicateJson)) if (want.has(f)) add({ kind: "rule", key: formRuleKey(l.lineageKey), field: f, combinationId: l.combinationId, how: "condition" });
  for (const d of current(r.docs, (d) => `${d.combinationId}|${d.lineageKey}`)) for (const f of fieldsOf(d.predicateJson)) if (want.has(f)) add({ kind: "document_type", key: d.documentTypeKey, field: f, combinationId: d.combinationId, how: "condition" });
  for (const x of current(r.facts, (x) => `${x.combinationId}|${x.lineageKey}`)) if (x.documentTypeKey && want.has(x.canonicalFieldKey)) add({ kind: "document_type", key: x.documentTypeKey, field: x.canonicalFieldKey, combinationId: x.combinationId, how: "fact" });
  for (const x of current(r.rules, (x) => `${x.combinationId}|${x.predicateKey}`)) for (const f of fieldsOf(x.predicateJson)) if (want.has(f)) add({ kind: "rule", key: x.predicateKey, field: f, combinationId: x.combinationId, how: "condition" });
  for (const k of current(r.checks, (k) => `${k.combinationId}|${k.checkKey}`)) for (const f of fieldsOf(k.predicateJson)) if (want.has(f)) add({ kind: "check", key: k.checkKey, field: f, combinationId: k.combinationId, how: "condition" });
  return [...out.values()];
}
