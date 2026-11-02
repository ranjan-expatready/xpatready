// C8.2 filing record, slice 1 (runtime lane, M3-F; the team's AG-07 AG-7-95; tech lead on #509 Q4 and #541): an
// application number on each filing, the UCI on the person. Pure (P-249): the pattern comes in as data
// (samples/filing-numbers.json, Sample), nothing here names a country. Recording the submission per group (AG-7-31,
// pack 4's acceptance/C8.2.test.ts) waits for Ready to file (L-SA3, held under P-251).

export type NumberRule = { pattern: string; words: string; example: string };

/** AG-7-95 rule 1: stored upper-case with spaces and hyphens removed. */
export const normaliseNumber = (raw: string) => raw.replace(/[\s-]+/g, "").toUpperCase();

/** A filing's application number: null clears it; otherwise the normalised value, or why it is refused (never warned). */
export function checkApplicationNumber(raw: string | null | undefined, rule: NumberRule): { value: string | null } | { error: string } {
  if (raw === null || raw === undefined || !raw.trim()) return { value: null };
  const value = normaliseNumber(raw);
  return new RegExp(rule.pattern).test(value) ? { value } : { error: `Application numbers look like ${rule.example} (${rule.words}).` };
}

/** AG-7-95 rule 4: the same number on another filing of the firm warns and still saves. */
export const duplicateWarning = (others: { reference: string }[]) =>
  others.length ? `Already on case ${[...new Set(others.map((o) => o.reference))].join(", ")}.` : null;
