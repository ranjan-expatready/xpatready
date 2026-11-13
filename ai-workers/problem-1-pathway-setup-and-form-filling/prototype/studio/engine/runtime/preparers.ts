// BK-18 (QA-448, qa's walk 1 step S8 W5; P-525 (1), P-510 (4), P-154, P-155 (1)): who really prepared a case's filings,
// so that the record a filing carries names the people who did the work and never a second review that never happened.
// Pure rules; who is staff and what the case holds come in as data (api/src/case-work.ts reads them).

/** One act a person did on the case: who, and when. */
export type WorkAct = { actor: string; at: Date | string | null };

/** The firm's people whose own work the case holds, earliest act first: the person who opened the case, and everyone who
 *  typed or confirmed a fact on it. Being named on the case team is not work, so a case officer assigned to the case who
 *  did nothing never appears (QA-448: the record named one as preparer). A client's own answers are the client's
 *  declaration (P-242), never the firm's preparation, so `staff` leaves the client and configuration people out.
 *  The case is the grain, as the filing record's preparer is (QA-295, review m2): the data holds no per-filing preparer,
 *  so every filing of a case names the same people. Acts that are only reading, or the review itself, are not passed in. */
export function preparersOf(acts: WorkAct[], staff: (id: string) => boolean): string[] {
  const first = new Map<string, number>();
  for (const a of acts) {
    if (!a.actor || !staff(a.actor)) continue;
    const t = a.at ? new Date(a.at).getTime() : 0;
    const seen = first.get(a.actor);
    if (seen === undefined || (Number.isFinite(t) && t < seen)) first.set(a.actor, Number.isFinite(t) ? t : 0);
  }
  return [...first].sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0])).map(([id]) => id);
}

/** What one filing's "Prepared by · Reviewed by" record says, from who acted. Self-reviewed when the person who reviewed
 *  it is the only person who prepared it (P-154: the preparer may be the reviewer; P-510 (4): the record then says
 *  "Self-reviewed" with their name, licence number and time, never a second person), or when the review was logged with
 *  the representative's own statement (P-155 (1), kind `self_reviewed`). Otherwise it names the people who prepared it,
 *  the reviewer among them when they also did the work: a record never hides who did what. Nobody recorded as having
 *  prepared it leaves the list empty, said plainly on the screen, never guessed from the case team. */
export function reviewRecordOf(x: { preparers: string[]; reviewedBy: string | null; kind?: string | null }): { self: boolean; preparedBy: string[] } {
  const alone = x.preparers.length > 0 && !!x.reviewedBy && x.preparers.every((p) => p === x.reviewedBy);
  const self = alone || (x.kind === "self_reviewed" && (!x.preparers.length || alone));
  return { self, preparedBy: self ? [] : x.preparers };
}
