// BK-18 (QA-448, qa's walk 1 step S8 W5; P-525 (1), P-510 (4), P-154, P-155 (1)): who really prepared a case's filings,
// so that the record a filing carries names the people who did the work and never a second review that never happened.
// Pure rules; who is staff and what the case holds come in as data (api/src/case-work.ts reads them).

/** One act a person did on the case: who, when they first did it (null when the row keeps no time), and whether it is a
 *  `weak` act — opening the case, or sending the filing for review. Those two are not preparing the filing: one chooses
 *  the combination and types a name, the other moves work already done to the representative. */
export type WorkAct = { actor: string; at: Date | string | null; weak?: boolean };

/** The firm's people whose own work the case holds, earliest act first. Being named on the case team is not work, so a
 *  case officer assigned to the case who did nothing never appears (QA-448: the record named one as preparer), and
 *  neither does a person whose only acts are weak while somebody else really worked on it (review B1, M1: a case officer
 *  who only opened the case). When the case holds nobody's real work, the weak acts name whoever stands behind it —
 *  walk 1's step S8, where the representative opened the case, sent it for review and approved it, and nobody else
 *  touched it; a case holding neither names nobody, and the screen says so rather than guess.
 *  A client's own answers are the client's declaration (P-242), never the firm's preparation, so `staff` leaves the
 *  client and configuration people out.
 *  `until` is the moment the record speaks of — the review's own time: work done after a review never rewrites what that
 *  review recorded (review B2, breaker B3). An act whose row keeps no time counts whatever `until` says: a record that
 *  names one person too many is poor, but one that claims a person worked alone when another did part of it is false.
 *  The case is the grain, as the filing record's preparer is (QA-295, review m2): the data holds no per-filing preparer,
 *  so every filing of a case names the same people. */
export function preparersOf(acts: WorkAct[], staff: (id: string) => boolean, until?: Date | string | null): string[] {
  const end = until ? new Date(until).getTime() : null;
  const mine = acts.filter((a) => {
    if (!a.actor || !staff(a.actor)) return false;
    const t = a.at ? new Date(a.at).getTime() : NaN;
    return !(end !== null && Number.isFinite(t) && t > end);
  });
  const real = mine.filter((a) => !a.weak);
  const first = new Map<string, number>();
  for (const a of real.length ? real : mine) {
    const t = a.at ? new Date(a.at).getTime() : NaN, when = Number.isFinite(t) ? t : 0;
    const seen = first.get(a.actor);
    if (seen === undefined || when < seen) first.set(a.actor, when);
  }
  return [...first].sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0])).map(([id]) => id);
}

/** What one filing's "Prepared by · Reviewed by" record says, from who acted. Self-reviewed when the person who reviewed
 *  it is the only person who prepared it (P-154: the preparer may be the reviewer; P-510 (4): the record then says
 *  "Self-reviewed" with their name, licence number and time, never a second person), or when the review was logged with
 *  the representative's own statement and the case holds nobody else's work (P-155 (1), kind `self_reviewed`).
 *  Otherwise it names the people who prepared it, the reviewer among them when they also did the work: a record never
 *  hides who did what. Nobody recorded as having prepared it leaves the list empty, said plainly on the screen (a filing
 *  reviewed before anyone worked on it), never guessed from the case team. */
export function reviewRecordOf(x: { preparers: string[]; reviewedBy: string | null; kind?: string | null }): { self: boolean; preparedBy: string[] } {
  const alone = x.preparers.length > 0 && !!x.reviewedBy && x.preparers.every((p) => p === x.reviewedBy);
  const self = alone || (x.kind === "self_reviewed" && !x.preparers.length);
  return { self, preparedBy: self ? [] : x.preparers };
}
