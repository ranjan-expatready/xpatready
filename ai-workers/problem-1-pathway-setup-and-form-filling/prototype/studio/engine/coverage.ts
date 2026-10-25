// Needed-fact coverage (Screen 03, BR-7; P-62 §2, §5.3): every fact a mapped form field needs, for a person role the
// combination has, is asked in a selected library section, filled by the case officer, or comes from a supported
// document. What is left is a gap, named by fact and role with the fixes. Slice S1 runs it over every Sample combination
// (the Sample data is fixed, never the rule) before S2 makes a gap block release. Carried by a link comes with S3.
import { peopleFor, render } from "./render.ts";
import type { Snapshot } from "./snapshot.ts";

export type CoverageGap = { fact: string; role: string; forms: string[]; boxes: number; why: string };
export const COVERAGE_FIXES = "ask it in a library section this combination selects, mark it filled by the case officer, or carry it from a linked case";

/** The gaps for the largest household the combination allows (each role at its maximum, at least one), so a fact only a
 *  child's form needs is found too. Boxes about someone the combination does not have stay blank and are not gaps. */
export function coverageGaps(s: Snapshot): CoverageGap[] {
  const participants = ((s.combination.participants ?? []) as { role: string; max?: number; min?: number }[]).map((p) => ({ ...p, preview: Math.max(1, Math.min(p.max ?? 1, 2)) }));
  const people = peopleFor(participants);
  const r = render(s, people, new Map());
  const roleOf = (about: string) => (about === "case" ? "the application" : people.find((p) => p.id === about.split("/")[0])?.role ?? about);
  const gaps = new Map<string, CoverageGap>();
  // Covered: placed in a selected section (asked of the client, or filled by the officer from a document, record or
  // working view). A gap: the fact is not in the library, or nobody is asked for it. A placement that reads a document no
  // document type supplies yet is still the officer's to fill (the renderer flags it for the document reader, not here).
  const field = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id));
  const placed = new Set((s.placements as { fact: string }[]).map((p) => p.fact));
  for (const c of r.coverage) for (const b of c.boxes) {
    if (!b.fact || !b.about || (field.has(b.fact) && placed.has(b.fact))) continue;
    const role = roleOf(b.about), k = `${role}|${b.fact}`;
    const g = gaps.get(k) ?? { fact: b.fact, role, forms: [], boxes: 0, why: field.has(b.fact) ? "nobody is asked for it" : "the form field reads a field that is not in the library" };
    if (!g.forms.includes(c.form)) g.forms.push(c.form);
    g.boxes++; gaps.set(k, g);
  }
  return [...gaps.values()].sort((a, b) => a.role.localeCompare(b.role) || a.fact.localeCompare(b.fact));
}
