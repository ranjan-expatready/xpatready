// C8.2 Record the submission (runtime lane, M3-F; r5c BR-11, BR-12, BR-15; P-142 D7, P-168): the pure rules. Nothing here
// names a country or a form: the number's pattern comes in as data (samples/filing-numbers.json, Sample).

/** "Submitted on" is a real calendar date and not after today. The firms are in Canada; today is the UTC date, which is
 *  never behind any Canadian calendar date, so a firm's own today is never refused, and a Canadian "tomorrow" passes only
 *  in the evening hours after UTC midnight (review m1: UTC+14 let tomorrow through for most of the working day). */
export function submittedOnProblem(date: string, now = new Date()): string | null {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return "Give the date it was submitted as a real date (YYYY-MM-DD).";
  const latest = now.toISOString().slice(0, 10);
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
type Box = { box: string; fact?: string | null; about?: string | null; row: number | null; coverage: string; value?: unknown };
/** A form's boxes as answered now, confirmed or not (break M4 on #924): a value typed again unchanged, or confirmed
 *  later, is no change; a different value, or one cleared, is. */
export const currentValues = (boxes: Box[]): Fact[] => boxes.filter((b) => b.fact && (b.coverage === "confirmed fact" || b.coverage === "answered on screen"))
  .map((b) => ({ box: b.box, fact: b.fact!, about: b.about ?? "", row: b.row, value: b.value }));
/** The facts (with whose they are) a form was filed with that differ now: a value changed or gone, or one added. */
export function changedSince(then: Fact[], now: Fact[]): { fact: string; about: string }[] {
  const a = new Map(then.map((f) => [f.box, f])), b = new Map(now.map((f) => [f.box, f]));
  const out = new Map<string, { fact: string; about: string }>();
  const add = (f: Fact) => out.set(`${f.about}|${f.fact}`, { fact: f.fact, about: f.about });
  for (const [k, f] of a) if (!b.has(k) || JSON.stringify(b.get(k)!.value) !== JSON.stringify(f.value)) add(f);
  for (const [k, f] of b) if (!a.has(k)) add(f);
  return [...out.values()].sort((x, y) => x.about.localeCompare(y.about) || x.fact.localeCompare(y.fact));
}
/** A fact in words when the case has no question for it: its last part, without underscores. */
export const factWords = (fact: string) => (fact.split(".").pop() ?? fact).replace(/_/g, " ");

/** BR-12 (P-142 D7): the words on a form filed with a value that changed since, naming whose answer and the question it
 *  answers. Unconfirmed: no counsel. */
export const filedEarlierWords = (form: string, owner: string, changed: { label: string; person: string }[], on: string) => {
  const list = changed.map((c) => `${c.person}'s answer to “${c.label}”`);
  const shown = list.length > 3 ? `${list.slice(0, 3).join(", ")} and ${list.length - 3} more` : list.join(", ");
  const day = new Date(`${on}T12:00:00Z`).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `Filed with an earlier value: ${shown} changed after ${owner}'s ${form} was filed on ${day}. Re-sign it, or tell IRCC of the change (Unconfirmed: no counsel).`;
};

/** QA-295 (P-155 (1)): who the filing record names as having prepared and reviewed a filing, whoever records it.
 *  `review` is the review that counts for Ready to file (readiness: by the representative of record, for the facts as
 *  they are now; api/src/readiness-inputs.ts), or null when none counts (the review warning was passed with a reason).
 *  Reviewer: that review's author, or nobody: a record never claims a review that did not happen (review M1).
 *  Preparer: a self-review names the reviewer. Otherwise the person the case's own work record names (BK-18, QA-448:
 *  `preparers`, who had worked on it when the review was made, earliest act first, api/src/case-work.ts), so this record
 *  and Ready to file's say the same thing (breaker B4). Only when the case holds nobody's work does it fall back to the
 *  case team: a case officer on the team when the review was made (else now), never the reviewer; else the officer who
 *  left last; the one recording only when the case never had a case officer. With two officers at once the earliest
 *  assigned stands in: the data holds no per-filing preparer (review m2). */
export function recordedPeople(
  review: { by: string; kind: string; at: string | Date } | null,
  team: { userId: string; role: string; assignedAt: Date; endedAt: Date | null; id: string }[],
  recorder: string, now: Date = new Date(), preparers: string[] = [],
): { preparedBy: string; reviewedBy: string | null } {
  if (review?.kind === "self_reviewed") return { preparedBy: review.by, reviewedBy: review.by };
  const worked = preparers.find((p) => p !== review?.by) ?? preparers[0];
  if (worked) return { preparedBy: worked, reviewedBy: review?.by ?? null };
  const officers = team.filter((m) => m.role === "OFFICER" && m.userId !== review?.by);
  const byAssigned = (a: (typeof team)[number], b: (typeof team)[number]) => a.assignedAt.getTime() - b.assignedAt.getTime() || a.id.localeCompare(b.id);
  const activeAt = (t: number) => officers.filter((m) => m.assignedAt.getTime() <= t && (!m.endedAt || m.endedAt.getTime() > t)).sort(byAssigned)[0];
  const lastLeft = [...officers].filter((m) => m.endedAt).sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime() || a.id.localeCompare(b.id))[0];
  const officer = (review ? activeAt(new Date(review.at).getTime()) : undefined) ?? activeAt(now.getTime()) ?? lastLeft;
  return { preparedBy: officer?.userId ?? recorder, reviewedBy: review?.by ?? null };
}
