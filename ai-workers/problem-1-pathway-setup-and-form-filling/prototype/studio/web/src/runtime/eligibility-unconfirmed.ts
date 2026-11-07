// B124 (M3 row A8, P-393; C6.9): an outcome says when it rests on answers not confirmed yet. BR-9 still counts an
// unconfirmed answer as answered; this only names, beside "Likely eligible" and "Not eligible", the deciding facts that
// are not confirmed, so a person sees a pre-check from self-reported answers apart from one on confirmed facts (lending:
// pre-qualification vs pre-approval; IRS Direct File: placeholder vs complete facts; reports/best-in-class-C6.9-A4-
// 2026-11-07.md, improvement 7). "Possibly eligible" (can't tell yet) is unchanged. Pure (no React), so a test imports it.
// Unconfirmed: no counsel on the wording.

/** What the page reads of a result: the outcome and, per gate, its state, what "not met" means and the facts it read
 *  that are answered but not confirmed now (engine/runtime/eligibility.ts withUnconfirmedNow, worked out when read). */
export type ResultLite = { outcome: string; gates: { state: string; whenNotMet?: string; facts: string[]; unconfirmed?: string[]; restsOn?: string[] }[] };

/** The deciding facts not confirmed yet, in gate order, each once. Likely eligible rests on every gate (all are met);
 *  Not eligible rests on the gates it fails (a "the representative reviews it" gate never gives Not eligible, so it
 *  does not decide one); any other outcome rests on nothing here. */
export function restingOn(r: ResultLite | undefined): string[] {
  if (!r) return [];
  const deciding = r.outcome === "LIKELY_ELIGIBLE" ? r.gates
    : r.outcome === "NOT_ELIGIBLE" ? r.gates.filter((g) => g.state === "not_met" && g.whenNotMet !== "needs_review")
    : [];
  // `restsOn` (the server, review Major 1): only the answers the gate's state rests on; an "or" branch met on a
  // confirmed answer leaves the other branch's answer out. Without it (an older server), every unconfirmed answer.
  return [...new Set(deciding.flatMap((g) => (g.restsOn ?? g.unconfirmed ?? []).filter((f) => g.facts.includes(f))))];
}

/** ", on 3 answers not yet confirmed" (empty when nothing rests on an unconfirmed answer). */
export const restingWords = (n: number) => (n ? `, on ${n} answer${n === 1 ? "" : "s"} not yet confirmed` : "");
