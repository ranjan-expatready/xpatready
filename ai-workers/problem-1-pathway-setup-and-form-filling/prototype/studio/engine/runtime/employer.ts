// C11.5 (P-106, BR-13; stand-in SI-10): Retail and Corporate stay apart at runtime. A worker's case may rely on an
// employer case only when its combination is Retail and its released forms read employer facts (the shared library's
// "organisation." facts, P5 finding D33); a Corporate combination is the employer's own case, which others link to.
// Pure rules, no database. The link itself (pick a Corporate case, read-only "Employer case" facts, out of date on a
// change, unlink with a reason) is the next part of C11.5 and SI-10.

export type EmployerLinkOffer = { offered: boolean; reason: string; facts: string[] };

type SnapshotPart = { combination: { label: string; client_type?: string | null }; field_maps: unknown };

/** Employer facts the released forms read, sorted (a form field mapped to an "organisation." fact). */
export function employerFacts(s: SnapshotPart): string[] {
  const facts = new Set<string>();
  for (const m of (s.field_maps ?? []) as { entries?: { outcome?: string; fact?: string | null }[] }[])
    for (const e of m.entries ?? []) if (e.outcome === "mapped" && e.fact?.startsWith("organisation.")) facts.add(e.fact);
  return [...facts].sort();
}

/** Whether a case on this release may rely on an employer case, and why (shown as written in "Open a case"). */
export function employerLinkOffer(s: SnapshotPart): EmployerLinkOffer {
  const label = s.combination.label;
  if (s.combination.client_type === "CORPORATE") return { offered: false, reason: `Not offered: "${label}" is a Corporate case, the one a worker's case links to.`, facts: [] };
  const facts = employerFacts(s);
  if (!facts.length) return { offered: false, reason: `Not offered: the ${label} has no employer facts.`, facts };
  return { offered: true, reason: `Offered: the ${label} forms read ${facts.length} employer fact${facts.length === 1 ? "" : "s"} (the employer's name, address, LMIA or offer number) from a Corporate case, read-only.`, facts };
}
