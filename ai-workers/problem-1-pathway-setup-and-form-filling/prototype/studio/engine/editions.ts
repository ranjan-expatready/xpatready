// How IRCC editions compare, pure (moved from engine/programs.ts for B78: engine/where-used.ts needs only this, and
// engine/change-set.ts, which loads it, stays free of file and vendor modules, G-CORE P-249).
/** Edition order (review #5, P-32): an IRCC edition is the month and year printed on the form, "IMM 5476 (11-2025)",
 *  so "12-2021" is older than "11-2025" (text order says the opposite). The printed date is the edition's identity and
 *  is always present (a file without one is held by the intake); the PDF's "date modified" only breaks a tie, since any
 *  re-save changes it. A label with no readable date sorts oldest. */
export function editionMonth(label: string | null | undefined): number {
  const m = /\b(\d{1,2})-(\d{4})\b/.exec(label ?? "");
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 12 ? Number(m[2]) * 12 + Number(m[1]) - 1 : -1;
}
export function compareEditions(a: { editionLabel: string; published?: string | null }, b: { editionLabel: string; published?: string | null }) {
  return editionMonth(a.editionLabel) - editionMonth(b.editionLabel) || String(a.published ?? "").localeCompare(String(b.published ?? "")) || a.editionLabel.localeCompare(b.editionLabel);
}
/** The newest edition of a list (by compareEditions), or undefined. */
export const newestEdition = <T extends { editionLabel: string; published?: string | null }>(list: T[]): T | undefined => [...list].sort((a, b) => compareEditions(b, a))[0];
