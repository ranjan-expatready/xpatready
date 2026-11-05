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

/** B82 (tech lead's ruling on qa's gate A, #1058): a fact in the library that a document line's condition reads, that
 *  nobody is asked, no document supplies and nothing works out. On a case such a line can never reach anyone, whatever
 *  the person's situation. A fact not in the library is already an error (engine/validate.ts). */
export function conditionFactsNobodyAsked(s: Snapshot): { fact: string; documents: string[] }[] {
  const field = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id));
  const derived = new Set((s.derived_fields as { id: string }[]).map((d) => d.id));
  const placed = new Set((s.placements as { fact: string }[]).map((p) => p.fact));
  const supplied = new Set(((s.document_types ?? []) as { supplies_facts?: string[] }[]).flatMap((t) => t.supplies_facts ?? []));
  const by = new Map<string, Set<string>>();
  for (const d of s.document_requirements as { document_type: string; condition?: unknown }[]) {
    for (const m of JSON.stringify(d.condition ?? null).matchAll(/"field":"([^"]+)"/g)) if (field.has(m[1]) && !derived.has(m[1]) && !placed.has(m[1]) && !supplied.has(m[1])) by.set(m[1], (by.get(m[1]) ?? new Set()).add(d.document_type));
  }
  return [...by].sort(([a], [b]) => a.localeCompare(b)).map(([fact, documents]) => ({ fact, documents: [...documents].sort() }));
}
