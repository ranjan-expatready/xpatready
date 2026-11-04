// C8.2 Record the submission (runtime lane, M3-F; r5c BR-11, BR-12, BR-15; P-142 D7, P-168): the pure rules. Nothing here
// names a country or a form: the number's pattern comes in as data (samples/filing-numbers.json, Sample).

/** "Submitted on" is a real calendar date and not after today. Today is the latest calendar date anywhere on earth
 *  (UTC+14), so a firm's own today is never refused, wherever its clock is. */
export function submittedOnProblem(date: string, now = new Date()): string | null {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return "Give the date it was submitted as a real date (YYYY-MM-DD).";
  const latest = new Date(now.getTime() + 14 * 3_600_000).toISOString().slice(0, 10);
  if (date > latest) return "The submission date is after today: give the date IRCC acknowledged it (not a future date).";
  if (date < "1990-01-01") return "The submission date is too far in the past: give the date IRCC acknowledged it.";
  return null;
}

/** The lines must name each filing of the group exactly once, and nothing else. */
export function coverageProblem(want: string[], got: string[]): string | null {
  const seen = new Set<string>();
  for (const g of got) { if (!want.includes(g)) return "A line names a filing that is not in this submission group: Reload."; if (seen.has(g)) return "A filing is listed twice: record each filing once."; seen.add(g); }
  const missing = want.filter((w) => !seen.has(w)).length;
  return missing ? `Record every filing of this group at once: ${missing} ${missing === 1 ? "is" : "are"} missing (one submission, one record).` : null;
}

/** Two filings of one submission never share an application number. */
export const duplicateInGroup = (numbers: string[]) => new Set(numbers).size !== numbers.length;

type Fact = { box: string; fact: string; about: string; value: unknown };
/** The facts (with whose they are) a form was filed with that differ now: changed, added, or no longer confirmed. */
export function changedSince(then: Fact[], now: Fact[]): { fact: string; about: string }[] {
  const a = new Map(then.map((f) => [f.box, f])), b = new Map(now.map((f) => [f.box, f]));
  const out = new Map<string, { fact: string; about: string }>();
  const add = (f: Fact) => out.set(`${f.about}|${f.fact}`, { fact: f.fact, about: f.about });
  for (const [k, f] of a) if (!b.has(k) || JSON.stringify(b.get(k)!.value) !== JSON.stringify(f.value)) add(f);
  for (const [k, f] of b) if (!a.has(k)) add(f);
  return [...out.values()].sort((x, y) => x.about.localeCompare(y.about) || x.fact.localeCompare(y.fact));
}
/** A fact in words: its last part, without underscores ("person.family_name" → "family name"). */
export const factWords = (fact: string) => (fact.split(".").pop() ?? fact).replace(/_/g, " ");

/** BR-12 (P-142 D7): the words on a form filed with a value that changed since, naming whose fact. Unconfirmed: no counsel. */
export const filedEarlierWords = (form: string, changed: { fact: string; person: string }[], on: string) => {
  const list = changed.map((c) => `${c.person}'s ${factWords(c.fact)}`);
  const shown = list.length > 3 ? `${list.slice(0, 3).join(", ")} and ${list.length - 3} more` : list.join(", ");
  return `Filed with an earlier value: ${shown} changed after ${form} was filed on ${on}. Re-sign it, or tell IRCC of the change (Unconfirmed: no counsel).`;
};
