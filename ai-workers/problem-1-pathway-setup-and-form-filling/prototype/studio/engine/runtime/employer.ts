// C11.5 + C1.3 (P-106, BR-13; stand-in SI-10; concept screens/C1.3-employer-link r2, tech lead's ruling on #1051):
// Retail and Corporate stay apart at runtime. A worker's case may rely on an employer case only when its combination is
// Retail and its released forms read employer facts (the shared library's "organisation." facts, P5 finding D33); a
// Corporate combination is the employer's own case, which others link to. A box read for the representative's own firm
// (IMM 5475 "Name of firm or organization", person "representative") is not an employer fact: excluded by the box's
// person, never by its key (P-319). Picking the employer case copies, once, the employer facts the worker's pinned
// release reads (SA-1B-283 r4 "Copies, not live links", AG-7-55 r5). (E1, tech lead on #1632): the copy is written on
// the principal, so only boxes on forms the principal files count: a form line whose "who" (R2) does not reach the
// principal (a spouse's IMM 1295, "spouse_or_partner") reads its employer from someone else. Pure rules, no database.
import { inStoredOrder } from "./team.ts";
import { isFilingFact, scopeOf, subjectsFor } from "../resolver.ts";
import { ROLE } from "../../contracts/resolver.ts";

export type EmployerLinkOffer = { offered: boolean; reason: string; facts: string[] };

type Entry = { outcome?: string; fact?: string | null; person?: string | null };
type SnapshotPart = { combination: { label: string; client_type?: string | null }; field_maps: unknown; forms?: unknown; placements?: unknown; canonical_fields?: unknown };

/** (E1) Whether a form line's "who" reaches the principal, by the resolver's own rule (R2) on a case of one principal. */
const PRINCIPAL_ONLY = [{ id: ROLE.principal, role: ROLE.principal, label: "", applies: true }];
const principalFiles = (who: unknown) => typeof who === "string" && subjectsFor(PRINCIPAL_ONLY, who).includes(ROLE.principal);
/** The boxes on forms the principal files. A release without form lines (an older or hand-made snapshot) reads all of
 *  its field maps, as before (E1). */
const entriesOf = (s: Pick<SnapshotPart, "field_maps" | "forms">): Entry[] => {
  const lines = Array.isArray(s.forms) ? (s.forms as { form_number?: string; who?: unknown }[]) : null;
  const filed = lines && new Set(lines.filter((l) => principalFiles(l.who)).map((l) => l.form_number));
  return ((s.field_maps ?? []) as { form_number?: string; entries?: Entry[] }[]).filter((m) => !filed || filed.has(m.form_number!)).flatMap((m) => m.entries ?? []);
};
/** A box the release's forms fill from a fact about someone other than the representative (the representative's
 *  firm, address and contact are the firm record's, C7.7). */
const readsForWorker = (e: Entry) => e.outcome === "mapped" && !!e.fact && e.person !== "representative";

/** Employer facts the released forms read, sorted (a form field mapped to an "organisation." fact, not the
 *  representative's, on a form the principal files: E1). */
export function employerFacts(s: Pick<SnapshotPart, "field_maps" | "forms">): string[] {
  const facts = new Set<string>();
  for (const e of entriesOf(s)) if (readsForWorker(e) && e.fact!.startsWith("organisation.")) facts.add(e.fact!);
  return [...facts].sort();
}

/** Whether a case on this release may rely on an employer case, and why (shown as written in "Open a case"). */
export function employerLinkOffer(s: SnapshotPart): EmployerLinkOffer {
  const label = s.combination.label;
  if (s.combination.client_type === "CORPORATE") return { offered: false, reason: `Not offered: "${label}" is a Corporate case, the one a worker's case links to.`, facts: [] };
  const facts = employerFacts(s);
  if (!facts.length) return { offered: false, reason: `Not offered: the ${label} has no employer facts.`, facts };
  return { offered: true, reason: `Offered: the ${label} forms read ${facts.length} employer fact${facts.length === 1 ? "" : "s"}; you can copy them from an employer case.`, facts };
}

/** One Sample employer case (samples/employer-cases.json, stand-in SI-10): its firm, its words and its facts by library key. */
export type EmployerCase = { key: string; firm: string; label: string; facts: Record<string, unknown> };
/** Where a carried fact is written on the worker's case: an organisation fact on the principal (the form subject of
 *  the worker's forms, engine/resolver.ts aboutOf), a filing fact on the case subject ("The application"). */
export type CarriedFact = { fact: string; label: string; value: unknown; on: "principal" | "case" };
export type FactState = "new" | "same" | "different";

/** BR-2: the employer case's facts that the worker's pinned release reads (a box filled for the worker, not the
 *  representative) and asks (a placement), in the release's question order. Nothing else moves. */
export function carriedFacts(s: SnapshotPart, ec: EmployerCase): CarriedFact[] {
  const read = new Set(entriesOf(s).filter(readsForWorker).map((e) => e.fact!));
  const placements = (s.placements ?? []) as { fact: string; repeats?: string | null; scope?: string | null; order?: number }[];
  const labels = new Map(((s.canonical_fields ?? []) as { id: string; label?: string | null; meaning?: string }[]).map((f) => [f.id, f.label || f.meaning || f.id]));
  const out: (CarriedFact & { order: number })[] = [];
  for (const [fact, value] of Object.entries(ec.facts)) {
    const place = placements.find((p) => p.fact === fact);
    if (!read.has(fact) || !place || isBlank(value)) continue; // r5: blank stays blank
    const scope = scopeOf(fact, place);
    if (scope === "person") continue; // a worker's own facts never come from the employer (r8)
    // Where the copy is written is where the resolver reads it (tech lead on #1051): a fact stored once on the case's own
    // record (a filing fact; with C3.16 also a field marked Organisation or Household) on the case subject, otherwise
    // on the principal (an unmarked "organisation." fact is read per person, from the form's subject).
    out.push({ fact, label: labels.get(fact) ?? fact, value: inStoredOrder(value), on: isFilingFact(fact, place) ? "case" : "principal", order: place.order ?? 0 });
  }
  return out.sort((a, b) => a.order - b.order || a.fact.localeCompare(b.fact)).map(({ order: _o, ...f }) => f);
}

const isBlank = (v: unknown): boolean => v === null || v === undefined || (typeof v === "string" && !v.trim()) || (typeof v === "object" && !Array.isArray(v) && !Object.values(v as object).some((x) => !isBlank(x)));

/** BR-4: a carried value against the worker's current answer; composite values compare in stored key order (review B1). */
export function factState(value: unknown, current: { value: unknown } | null | undefined): FactState {
  if (!current) return "new";
  return JSON.stringify(comparable(value)) === JSON.stringify(comparable(current.value)) ? "same" : "different";
}
/** Break m1: values that read the same are Same: text trimmed with its inner spaces collapsed, and the country part of
 *  an address in any case ("Canada" and "canada"); a name in another case stays Different. */
function comparable(v: unknown, key?: string): unknown {
  if (typeof v === "string") { const t = v.trim().replace(/\s+/g, " "); return key === "country" ? t.toLowerCase() : t; }
  if (Array.isArray(v)) return v.map((x) => comparable(x));
  if (!v || typeof v !== "object") return v;
  return inStoredOrder(Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => !isBlank(x)).map(([k, x]) => [k, comparable(x, k)])));
}

/** The source written on a copied answer (BR-3): the team's "Linked file" (SA-1B-283 r5), shown as "Employer case". */
export const LINKED_FILE = "linked_file";
export const STAND_IN_SI10 = { id: "SI-10", words: "Today: one Sample employer case per firm; its facts are copied once. Later: the team's AG-17 Corporate cases and LMIA." } as const;
