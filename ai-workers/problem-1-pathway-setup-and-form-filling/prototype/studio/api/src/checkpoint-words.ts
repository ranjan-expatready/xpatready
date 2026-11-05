// C10.1 row 9 (Lead 10's ruling (c') on #1009): what the configured checkpoint says while Visitor visa's release 2 waits
// for row B81. Nothing is set on the draft; the words come from the problems Submit would list for the family form the
// release would file (never fixed text), counted by kind, in plain words for a person (no form field codes). Pure: no
// database, no Nest (a check reads it directly).

/** One problem as Submit lists it (engine/channels.ts): its words. */
export type Listed = { message: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Row 9's reason: the application form filed Online and the family form that asks for (FORM_SETUP, FAMILY_FORM_BY_CHANNEL).
 *  `problems` null: the family form has no PDF edition read on this copy yet. */
export function releaseTwoWords({ application, form }: { application: string; form: string }, problems: Listed[] | null): string {
  const left = `Release 2 is not set up yet, and Visitor visa's draft is left as released (nothing changed on it).`;
  const waits = "Waits for row B81: a person marks a list value a form field does not print, so filling refuses it in words.";
  if (!problems) return `${left} ${form}, the family information form when ${application} is filed Online, has no PDF edition read on this copy yet. ${waits}`;
  if (!problems.length) return `${left} ${form}, the family information form when ${application} is filed Online, shows no problem with its answer lists now; its channels wait to be set on the Forms tab.`;
  const noCode = problems.filter((p) => /no code for/.test(p.message)), noMap = problems.filter((p) => /no option map yet/.test(p.message));
  const other = problems.filter((p) => !noCode.includes(p) && !noMap.includes(p));
  const parts = [
    noCode.length ? `${plural(noCode.length, "form field has", "form fields have")} no code for some values of the answer list ${noCode.length === 1 ? "it reads" : "they read"} (filling would refuse them)` : null,
    noMap.length ? `${noMap.length} ${noMap.length === 1 ? "has" : "have"} no option map yet` : null,
    // Review R2 m2: any other problem keeps its own words (at most three, then how many more).
    other.length ? `${plural(other.length, "other problem", "other problems")}: ${other.slice(0, 3).map((p) => p.message).join(" · ")}${other.length > 3 ? ` · and ${other.length - 3} more` : ""}` : null,
  ].filter(Boolean);
  const on = other.length ? `on ${form}` : `on ${form}'s choice form fields`;
  return `${left} Filed Online, ${application} needs ${form} as the family information form, and Submit would refuse it with ${plural(problems.length, "problem", "problems")} ${on}: ${parts.join("; ")}. ${noCode.length ? waits : ""}`.trim();
}
