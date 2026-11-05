// Needed-fact coverage (S5 slice 2; Screen 03 challenge point 3, Lead 25 Oct; P-62 §2, §5.3): every fact a mapped form
// field needs, for a person role the combination has, is asked in a selected library section or filled by the case
// officer. What is left is a gap, named by fact and role with the fix; a gap blocks release (engine/validate.ts). The
// sample data is fixed when a gap shows, never the rule. Carried by a linked case comes later (P-106, the case link).
import { peopleFor, render, type Person } from "./render.ts";
import type { Snapshot } from "./snapshot.ts";
import { documentFacts } from "./sources.ts";
import { FILING, sourceKey } from "../contracts/resolver.ts";
import { roleOf as resolvedRole } from "./resolver.ts";

export type CoverageGap = { fact: string; role: string; forms: string[]; boxes: number; why: string };
export const COVERAGE_FIXES = "ask it in a library section this combination uses, or have the case officer fill it";

/** The gaps for the largest household the combination allows (each role at its most, at least one, two at most), so a
 *  fact only a child's form needs is found too. Form fields about someone the combination does not have stay blank. */
/** Whether any form field of the snapshot reads a fact (nothing mapped, nothing needed: no render). */
export const anyMapped = (s: Snapshot) => (s.field_maps as { entries: { outcome: string; fact?: string | null }[] }[]).some((m) => m.entries.some((e) => e.outcome === "mapped" && e.fact));
const previews = new WeakMap<Snapshot, { people: Person[]; r: ReturnType<typeof render> }>();
/** The largest household the combination allows, rendered once per snapshot (the coverage gate and W1-15's sources
 *  both read it; the catalogue validates every combination, STANDARDS §9). */
export function previewRender(s: Snapshot) {
  let x = previews.get(s);
  if (!x) {
    const participants = ((s.combination.participants ?? []) as { role: string; max?: number; min?: number }[]).filter((p) => (p.max ?? 0) > 0).map((p) => ({ ...p, preview: Math.max(1, Math.min(p.max ?? 1, 2)) }));
    const people = peopleFor(participants);
    x = { people, r: render(s, people, new Map()) }; previews.set(s, x);
  }
  return x;
}
export function coverageGaps(s: Snapshot): CoverageGap[] {
  // Nothing mapped, nothing needed: no render (the catalogue validates every combination, STANDARDS §9).
  if (!anyMapped(s)) return [];
  const { people, r } = previewRender(s);
  // SH3 R4/R8: the resolver's roleOf; the gap names the filing "the application" in words.
  const roleOf = (about: string) => (about === FILING ? "the application" : resolvedRole(people, about));
  const field = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id));
  const placed = new Set((s.placements as { fact: string }[]).map((p) => p.fact));
  // W1-15 challenge M3: a document covers a fact only for the people its checklist line names (a passport asked of the
  // principal does not cover the spouse's passport number).
  const docFacts = documentFacts(s, people);
  const gaps = new Map<string, CoverageGap>();
  for (const c of r.coverage) for (const b of c.boxes) {
    // Covered: placed in a selected section (asked of the client, or filled by the officer from a record or working
    // view), or supplied by a document type the combination asks for. A fact not in the library is already an error.
    if (!b.fact || !b.about || !field.has(b.fact) || placed.has(b.fact) || docFacts.get(b.about)?.has(b.fact)) continue;
    const role = roleOf(b.about), k = sourceKey(role, b.fact);
    const g = gaps.get(k) ?? { fact: b.fact, role, forms: [], boxes: 0, why: "nobody is asked for it" };
    if (!g.forms.includes(c.form)) g.forms.push(c.form);
    g.boxes++; gaps.set(k, g);
  }
  return [...gaps.values()].sort((a, b) => a.role.localeCompare(b.role) || a.fact.localeCompare(b.fact));
}

/** B82 (tech lead's ruling on qa's gate A, #1058): a fact in the library that a conditional document line's condition
 *  reads, that nobody is asked, nothing works out and no other document supplies. On a case such a line can never be
 *  decided. A fact not in the library is already an error (engine/validate.ts); a base line ignores its condition; a
 *  condition on a document's own contents is read from the document, never asked. */
export function conditionFactsNobodyAsked(s: Snapshot): { fact: string; documents: string[] }[] {
  const field = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id));
  const derived = new Set((s.derived_fields as { id: string }[]).map((d) => d.id));
  const placed = new Set((s.placements as { fact: string }[]).map((p) => p.fact));
  const types = (s.document_types ?? []) as { key: string; supplies_facts?: string[] }[];
  const by = new Map<string, Set<string>>();
  for (const d of s.document_requirements as { document_type: string; document_type_key?: string; base_or_conditional?: string; condition?: { subjectKind?: string } | null }[]) {
    if (d.base_or_conditional === "base" || d.condition?.subjectKind === "DOCUMENT") continue;
    for (const m of JSON.stringify(d.condition ?? null).matchAll(/"field":"([^"]+)"/g)) {
      const supplied = types.some((t) => t.key !== d.document_type_key && (t.supplies_facts ?? []).includes(m[1])); // the document it decides cannot supply it
      if (field.has(m[1]) && !derived.has(m[1]) && !placed.has(m[1]) && !supplied) by.set(m[1], (by.get(m[1]) ?? new Set()).add(d.document_type));
    }
  }
  return [...by].sort(([a], [b]) => a.localeCompare(b)).map(([fact, documents]) => ({ fact, documents: [...documents].sort() }));
}

/** B82: the draft's lines for those facts, refused at Submit (a warning shows on no screen). The draft only, beside
 *  filingProblems and draftSourceProblems: a release already made keeps its status and can still open cases. */
export function conditionFactProblems(s: Snapshot): { level: "error"; where: string; item: string; message: string }[] {
  const meaning = new Map((s.canonical_fields as { id: string; meaning?: string }[]).map((f) => [f.id, f.meaning ?? f.id]));
  return conditionFactsNobodyAsked(s).flatMap((g) => g.documents.map((item) => ({ level: "error" as const, where: "Documents", item,
    message: `The condition reads "${(meaning.get(g.fact) ?? g.fact).trim().replace(/\.$/, "")}", which nobody is asked, so on a case this document can never be decided. Ask it: Smart questionnaire › Ask them in their forms' sections.` })));
}

/** The facts a form field of this combination reads: their question belongs to the form's own section. */
export const formReadFacts = (s: Snapshot) => new Set((s.field_maps as { entries: { outcome: string; fact?: string | null }[] }[]).flatMap((m) => m.entries).filter((e) => e.outcome === "mapped" && e.fact).map((e) => e.fact as string));
