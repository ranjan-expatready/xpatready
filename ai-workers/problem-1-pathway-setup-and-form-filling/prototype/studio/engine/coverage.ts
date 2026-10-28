// Needed-fact coverage (S5 slice 2; Screen 03 challenge point 3, Lead 25 Oct; P-62 §2, §5.3): every fact a mapped form
// field needs, for a person role the combination has, is asked in a selected library section or filled by the case
// officer. What is left is a gap, named by fact and role with the fix; a gap blocks release (engine/validate.ts). The
// sample data is fixed when a gap shows, never the rule. Carried by a linked case comes later (P-106, the case link).
import { peopleFor, render } from "./render.ts";
import type { Snapshot } from "./snapshot.ts";

export type CoverageGap = { fact: string; role: string; forms: string[]; boxes: number; why: string };
export const COVERAGE_FIXES = "ask it in a library section this combination uses, or have the case officer fill it";

/** The gaps for the largest household the combination allows (each role at its most, at least one, two at most), so a
 *  fact only a child's form needs is found too. Form fields about someone the combination does not have stay blank. */
export function coverageGaps(s: Snapshot): CoverageGap[] {
  // Nothing mapped, nothing needed: no render (the catalogue validates every combination, STANDARDS §9).
  if (!(s.field_maps as { entries: { outcome: string; fact?: string | null }[] }[]).some((m) => m.entries.some((e) => e.outcome === "mapped" && e.fact))) return [];
  const participants = ((s.combination.participants ?? []) as { role: string; max?: number; min?: number }[]).filter((p) => (p.max ?? 0) > 0).map((p) => ({ ...p, preview: Math.max(1, Math.min(p.max ?? 1, 2)) }));
  const people = peopleFor(participants);
  const r = render(s, people, new Map());
  const roleOf = (about: string) => (about === "case" ? "the application" : people.find((p) => p.id === about.split("/")[0])?.role ?? about);
  const field = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id));
  const placed = new Set((s.placements as { fact: string }[]).map((p) => p.fact));
  const docFacts = new Set(((s.document_types ?? []) as { supplies_facts?: string[] }[]).flatMap((t) => t.supplies_facts ?? []));
  const gaps = new Map<string, CoverageGap>();
  for (const c of r.coverage) for (const b of c.boxes) {
    // Covered: placed in a selected section (asked of the client, or filled by the officer from a record or working
    // view), or supplied by a document type the combination asks for. A fact not in the library is already an error.
    if (!b.fact || !b.about || !field.has(b.fact) || placed.has(b.fact) || docFacts.has(b.fact)) continue;
    const role = roleOf(b.about), k = `${role}|${b.fact}`;
    const g = gaps.get(k) ?? { fact: b.fact, role, forms: [], boxes: 0, why: "nobody is asked for it" };
    if (!g.forms.includes(c.form)) g.forms.push(c.form);
    g.boxes++; gaps.set(k, g);
  }
  return [...gaps.values()].sort((a, b) => a.role.localeCompare(b.role) || a.fact.localeCompare(b.fact));
}
