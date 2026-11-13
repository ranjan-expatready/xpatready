// BK-18 (QA-448, qa's walk 1 step S8 W5; P-525 (1), P-510 (4), P-154, P-155 (1)): who really prepared a case's filings,
// so that the record a filing carries names the people who did the work and never a second review that never happened.
// Pure rules; who is staff and what the case holds come in as data (api/src/case-work.ts reads them).

/** One act a person did on the case: who, when they first did it (null when the row keeps no time), and whether it is a
 *  `weak` act — opening the case, or sending the filing for review. Neither is preparing the filing: one chooses the
 *  combination and types a name, the other moves work to the representative. */
export type WorkAct = { actor: string; at: Date | string | null; weak?: boolean };

const mineUntil = (acts: WorkAct[], staff: (id: string) => boolean, until?: Date | string | null) => {
  const end = until ? new Date(until).getTime() : null;
  return acts.filter((a) => {
    if (!a.actor || !staff(a.actor)) return false;
    const t = a.at ? new Date(a.at).getTime() : NaN;
    return !(end !== null && Number.isFinite(t) && t > end);
  });
};
const earliestFirst = (acts: WorkAct[]) => {
  const first = new Map<string, number>();
  for (const a of acts) {
    const t = a.at ? new Date(a.at).getTime() : NaN, when = Number.isFinite(t) ? t : 0;
    const seen = first.get(a.actor);
    if (seen === undefined || when < seen) first.set(a.actor, when);
  }
  return [...first].sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0])).map(([id]) => id);
};

/** The firm's people the record names as having prepared the filings: those whose own work the case holds, earliest act
 *  first. Being named on the case team is not work, so a case officer assigned to the case who did nothing never appears
 *  (QA-448: the record named one as preparer); neither does a person whose only acts are weak — opening a case or
 *  sending a filing for review never names anybody as a preparer, however little anyone else did (review 2 B1, M1).
 *  A client's own answers are the client's declaration (P-242), never the firm's preparation, so `staff` leaves the
 *  client and configuration people out.
 *  `until` is the moment the record speaks of — the review's own time: work done after a review never rewrites what that
 *  review recorded (review B2, breaker B3). An act whose row keeps no time counts whatever `until` says: a record that
 *  names one person too many is poor, but one that claims a person worked alone when another did part of it is false.
 *  The case is the grain, as the filing record's preparer is (QA-295, review m2): the data holds no per-filing preparer,
 *  so every filing of a case names the same people. */
export const preparersOf = (acts: WorkAct[], staff: (id: string) => boolean, until?: Date | string | null): string[] =>
  earliestFirst(mineUntil(acts, staff, until).filter((a) => !a.weak));

/** The people who stood behind the filings without preparing them: they opened the case, or sent a filing for review.
 *  This never names a preparer on the record (review 2 B1); it only answers whether the person who reviewed a filing had
 *  it in their own hands, which is what a self-review on a case holding nobody's work rests on (walk 1's step S8: the
 *  representative opened the case, sent it for review and approved it, and nobody else touched it). */
export const behindOf = (acts: WorkAct[], staff: (id: string) => boolean, until?: Date | string | null): string[] =>
  earliestFirst(mineUntil(acts, staff, until).filter((a) => a.weak));

/** What BR-8 counts as this person's own authorship (api/src/readiness.ts and api/src/review-rounds.ts hand it to
 *  `selfReviewOf`): the people who prepared it, or — when nobody prepared it — this person alone when they stood behind
 *  it. A person who only opened the case, or only sent work another person prepared, is never an author, so the review
 *  is neither refused as a second person's (review 2 M1) nor logged as a self-review in their name. */
export const authorsFor = (actor: string, preparers: string[], behind: string[]): Set<string> =>
  new Set(preparers.length ? preparers : behind.filter((b) => b === actor));

/** What one filing's "Prepared by · Reviewed by" record says, from who acted. Self-reviewed when the person who reviewed
 *  it is the only person who prepared it (P-154: the preparer may be the reviewer; P-510 (4): the record then says
 *  "Self-reviewed" with their name, licence number and time, never a second person), or when nobody prepared it and the
 *  reviewer is the one who stood behind it. Otherwise it names the people who prepared it, the reviewer among them when
 *  they also did the work: a record never hides who did what. A case holding nobody's work and no act of the reviewer's
 *  own leaves the list empty, said plainly on the screen, never guessed from the case team. */
export function reviewRecordOf(x: { preparers: string[]; reviewedBy: string | null; kind?: string | null; behind?: string[] }): { self: boolean; preparedBy: string[] } {
  const alone = x.preparers.length > 0 && !!x.reviewedBy && x.preparers.every((p) => p === x.reviewedBy);
  const stood = !x.preparers.length && !!x.reviewedBy && (x.behind ?? []).includes(x.reviewedBy);
  const self = alone || stood || (x.kind === "self_reviewed" && !x.preparers.length);
  return { self, preparedBy: self ? [] : x.preparers };
}
