// Period history (P-47 question type, C4.4): pure helpers with no Node imports, so the engine, the evaluator's
// calculations (rules.ts) and the web renderer read gaps the same way.
/** A period history (P-47 question type): rows of { from, to, what }, months as "YYYY-MM"; an empty `to` means "to now". */
export type Period = { from?: unknown; to?: unknown; what?: unknown };
export const monthIndex = (s: unknown): number | undefined => {
  const m = typeof s === "string" ? /^(\d{4})-(\d{2})$/.exec(s.trim()) : null;
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? Number(m[1]) * 12 + Number(m[2]) - 1 : undefined;
};
export const monthName = (i: number) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i % 12]} ${Math.floor(i / 12)}`;

/** The months a period history leaves out in the `years` before the reference date, both ends included (P-47 tier 2:
 *  "history covers 10 years, no gaps"), as runs { from, to, words }. Undefined when the history or the date cannot be
 *  read (a row without a real month, or ending before it starts): "cannot tell", never a guess. */
export function historyGaps(history: unknown, referenceDate: unknown, years: number): { from: string; to: string; months: number; words: string }[] | undefined {
  const r = typeof referenceDate === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(referenceDate) : null;
  if (!r || !Array.isArray(history)) return undefined;
  const end = Number(r[1]) * 12 + Number(r[2]) - 1, start = end - years * 12;
  const covered = new Set<number>();
  for (const row of history as Period[]) {
    const a = monthIndex(row?.from), b = row?.to === undefined || row?.to === null || row?.to === "" ? end : monthIndex(row.to);
    if (a === undefined || b === undefined || b < a) return undefined;
    for (let i = Math.max(a, start); i <= Math.min(b, end); i++) covered.add(i);
  }
  const out: { from: string; to: string; months: number; words: string }[] = [];
  for (let i = start; i <= end; i++) {
    if (covered.has(i)) continue;
    let j = i; while (j + 1 <= end && !covered.has(j + 1)) j++;
    const ym = (k: number) => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}`;
    out.push({ from: ym(i), to: ym(j), months: j - i + 1, words: i === j ? `${monthName(i)} is not covered` : `${monthName(i)} to ${monthName(j)} is not covered` });
    i = j;
  }
  return out;
}

