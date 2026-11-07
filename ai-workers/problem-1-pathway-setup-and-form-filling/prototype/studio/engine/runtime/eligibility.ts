// C6.9 part 2 (M3-D, concept screens/C6.9/concept.md BR-9…BR-13, BR-18; stand-in SI-1): the stand-in adapter that
// reads a release's eligibility gates (snapshot.eligibility, part 1) against one person's known facts and fills AG-03's
// result shape (AG-03 §7 AssessmentProgramResult): three outcomes, no score. Pure: no database, no clock, no model call
// (US$0). The shared `evaluate` is not changed (show/hide rules rely on it): a missing fact under `exists` is rewritten
// here so it reads "cannot tell" instead of false (AG-3-12: never a false Not eligible). When the team's AG-03 Qualifier
// is connected (SI-2) it replaces this file; the result shape stays.
import { canonical } from "../../../contracts/rules.ts";
import { gateFacts, type Gate, type SnapshotEligibility, type WhenNotMet } from "../eligibility-gates.ts";
import { evalCondition, kkey, type Known } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import { present, valueHolder } from "../resolver.ts";

/** The founder's answer to C6.9 Q3 (P-229 (3), 2 Nov): one failed rule gives Not eligible even while other facts are
 *  missing, and the missing facts are listed too. Our addition to AG-03's AG-3-13 for the team (AG-3-13 gives Not
 *  eligible only "when all gate inputs are present"). Gates are joined by AND, so no missing answer can undo a failed one. */
export const FAIL_BEATS_MISSING = true;
export const STAND_IN = { id: "SI-1", words: "Today: our own checks on this application's rules, three outcomes and no score. Later: the team's AG-03 Qualifier fills this page and adds scores, cut-offs and advice." } as const;
export const DISCLAIMER_LOCALE = "en-CA";

export type Outcome = "LIKELY_ELIGIBLE" | "ELIGIBLE_BELOW_CUTOFF" | "POSSIBLY_ELIGIBLE" | "NOT_ELIGIBLE";
export type GateState = "met" | "not_met" | "not_answered";
export type GateResult = { key: string; label: string; state: GateState; facts: string[]; values: Record<string, unknown>; missing: string[]; whenNotMet: WhenNotMet;
  /** Answered facts not confirmed yet (concept BR-9: they count, and the page marks them "Not confirmed yet"). */
  unconfirmed: string[];
  /** B124 (P-393), worked out when read: the unconfirmed answers this gate's Met or Not met rests on (restsOn). */
  restsOn?: string[] };
/** AG-03 §7 AssessmentProgramResult, plus our `gates` and `judgement` (concept §1 "Our additions"). */
export type ProgramResult = {
  programKey: string; programLabel: string; outcome: Outcome;
  score: null; maxScore: null; passMark: null; selectionModel: null; competitivenessBand: null; gapToPass: null;
  failedGates: string[]; missingInputs: string[]; breakdown: Record<string, never>; recommendations: never[];
  /** Ours (P-230 (1)): gates not met whose "when not met" is needs_review; the representative reviews them. */
  reviewGates: string[];
  gates: GateResult[]; judgement: string[];
};
/** One fact a run read: whose (`case` or the person's subject id), its value (null when unanswered) and the answer id
 *  (kept for tracing only; out of date compares values, BR-13). */
export type Input = { fact: string; about: string; value: unknown; answerId: string | null };

/** Whose value a gate fact is: the resolver's R6b (contracts/resolver.ts; SH3 follow-up d1). */
export const aboutOf = valueHolder;
const valueOf = (known: Known, fact: string, person: string) => known.get(kkey(aboutOf(known, fact, person), fact))?.value;

/** BR-9: every `exists f` leaf on a fact the person has not answered becomes a leaf that `evaluate` reads as "cannot
 *  tell" and lists `f` as missing; every other leaf stays. The sentinel never equals a real answer, because `f` is absent. */
export function rewriteMissing(node: unknown, missing: (fact: string) => boolean): unknown {
  if (!node || typeof node !== "object") return node;
  const n = node as { op?: string; field?: string; args?: unknown[]; arg?: unknown };
  if (n.op === "exists" && typeof n.field === "string" && missing(n.field)) return { op: "eq", field: n.field, value: "__missing__" };
  return { ...n, ...(Array.isArray(n.args) ? { args: n.args.map((a) => rewriteMissing(a, missing)) } : {}), ...(n.arg ? { arg: rewriteMissing(n.arg, missing) } : {}) };
}

/** BR-9: one gate for one person. True is Met, false Not met, cannot tell Not answered (with the facts it waits for). */
export function gateResult(s: Snapshot, known: Known, gate: Gate, person: string): GateResult {
  const facts = gateFacts({ gates: [gate] });
  const values = Object.fromEntries(facts.map((f) => [f, present(valueOf(known, f, person)) ? valueOf(known, f, person) : null]));
  const unconfirmed = facts.filter((f) => present(values[f]) && known.get(kkey(aboutOf(known, f, person), f))?.status !== "confirmed");
  const tree = rewriteMissing(gate.condition, (f) => !present(valueOf(known, f, person)));
  const e = evalCondition(s, known, tree, person);
  const state: GateState = e.applies === true ? "met" : e.applies === false ? "not_met" : "not_answered";
  // A rule that cannot run at all (a calculation with no helper) waits on the facts it reads: never a verdict. A gate
  // not met still names the facts it could not read (break m1 on fd26c492, P-229 (3): "the missing facts are listed too").
  const read = e.missing.filter((m) => facts.includes(m));
  const missing = state === "met" ? [] : state === "not_met" ? read : read.length ? read : facts.filter((f) => !present(values[f]));
  return { key: gate.key, label: gate.label, state, facts, values, missing, whenNotMet: gate.whenNotMet === "needs_review" ? "needs_review" : "not_eligible", unconfirmed };
}

/** BR-10: the outcome from the gate states. Both lists are always filled; `FAIL_BEATS_MISSING` decides the one case the
 *  team's text leaves open (a failed gate while another fact is missing). P-230 (1): a gate not met whose "when not met"
 *  is needs_review never gives Not eligible: it is listed in `reviewGates` (not `failedGates`) and the result is Possibly
 *  eligible, the representative reviewing it. The outcome set is unchanged. */
export function outcomeOf(gates: GateResult[], failBeatsMissing = FAIL_BEATS_MISSING): { outcome: Outcome; failedGates: string[]; missingInputs: string[]; reviewGates: string[] } {
  const notMet = gates.filter((g) => g.state === "not_met");
  const failedGates = notMet.filter((g) => g.whenNotMet !== "needs_review").map((g) => g.key);
  const reviewGates = notMet.filter((g) => g.whenNotMet === "needs_review").map((g) => g.key);
  const missingInputs = [...new Set(gates.flatMap((g) => g.missing))];
  const outcome: Outcome = failedGates.length && (failBeatsMissing || !missingInputs.length) ? "NOT_ELIGIBLE" : missingInputs.length || reviewGates.length ? "POSSIBLY_ELIGIBLE" : "LIKELY_ELIGIBLE";
  return { outcome, failedGates, missingInputs, reviewGates };
}

/** BR-9…BR-12, BR-18: the one result for the case's own combination. Never a score (SI-1, BR-11); the officer's
 *  judgement lines are copied, never judged (BR-12). Null when the release has no gate (BR-10: zero gates is no result). */
export function assess(s: Snapshot, known: Known, person: string, failBeatsMissing = FAIL_BEATS_MISSING): ProgramResult | null {
  const e = s.eligibility as SnapshotEligibility | undefined;
  if (!e?.gates?.length) return null;
  const gates = e.gates.map((g) => gateResult(s, known, g, person));
  return {
    programKey: s.combination.key, programLabel: s.combination.label, ...outcomeOf(gates, failBeatsMissing),
    score: null, maxScore: null, passMark: null, selectionModel: null, competitivenessBand: null, gapToPass: null,
    breakdown: {}, recommendations: [], gates, judgement: [...(e.judgement ?? [])],
  } as ProgramResult;
}

/** BR-8: the facts a run read, in gate order, with their values today (null when unanswered). */
export function inputsOf(s: Snapshot, known: Known, person: string, answerId: (about: string, fact: string) => string | null): Input[] {
  return gateFacts(s.eligibility as SnapshotEligibility | undefined).map((fact) => {
    const about = aboutOf(known, fact, person), v = valueOf(known, fact, person);
    return { fact, about, value: present(v) ? v : null, answerId: present(v) ? answerId(about, fact) : null };
  });
}

/** BR-13: a run is out of date when a fact it read now has a different value (added, changed or removed), compared by
 *  canonical value, never by answer id (Confirm section writes a new row with the same value), or when the case's pin
 *  is no longer the run's release. Today's value is read the way the run read it (`nowOf`). Worked out on every read;
 *  never written. */
export function outOfDate(inputs: Input[], now: (fact: string) => unknown, sameRelease: boolean) {
  const norm = (v: unknown) => canonical((present(v) ? v : null) as never);
  const changed = inputs.filter((i) => norm(i.value) !== norm(now(i.fact))).map((i) => ({ fact: i.fact, about: i.about, was: i.value, now: present(now(i.fact)) ? now(i.fact) : null }));
  return { out_of_date: changed.length > 0 || !sameRelease, changed, release_changed: !sameRelease };
}

/** Today's value of a fact for this person, read the same way a run reads it (for outOfDate). */
export const nowOf = (known: Known, person: string) => (fact: string) => valueOf(known, fact, person);

/** B124 (P-393; review Major 1 on ca72fa195 and its re-review on 06cc27a24): the unconfirmed answers a gate's Met or
 *  Not met rests on. An answer `f` is named when some set S of the other unconfirmed answers can be treated as missing
 *  (as a run treats an unanswered fact) with the gate still reading the same, while S and `f` together change it: so
 *  `f` matters once S is set aside. An "or" branch met on a confirmed answer, or a false branch of a met "or", decides
 *  nothing; a passing part of a failed "and" decides nothing; `(A or B) and C` met on three unconfirmed answers rests on
 *  all three, so confirming C alone never makes the line come back with A and B. Gates read few facts; past
 *  RESTS_MAX unconfirmed answers every one is named rather than trying every set. */
export function restsOn(s: Snapshot, known: Known, gate: Gate, person: string, state: GateState, unconfirmed: string[]): string[] {
  if (!unconfirmed.length || (state !== "met" && state !== "not_met")) return [];
  const without = (drop: string[]): GateState => {
    const k = new Map(known) as Known;
    for (const f of drop) k.delete(kkey(aboutOf(known, f, person), f));
    const e = evalCondition(s, k, rewriteMissing(gate.condition, (f) => !present(valueOf(k, f, person))), person);
    return e.applies === true ? "met" : e.applies === false ? "not_met" : "not_answered";
  };
  if (without(unconfirmed) === state) return [];
  if (unconfirmed.length > RESTS_MAX) return unconfirmed;
  const memo = new Map<string, GateState>();
  const stateOf = (drop: string[]) => { const k = [...drop].sort().join("|"); if (!memo.has(k)) memo.set(k, without(drop)); return memo.get(k)!; };
  return unconfirmed.filter((f) => {
    const others = unconfirmed.filter((x) => x !== f);
    for (let mask = 0; mask < 1 << others.length; mask++) {
      const S = others.filter((_, i) => mask & (1 << i));
      if (stateOf(S) === state && stateOf([...S, f]) !== state) return true;
    }
    return false;
  });
}
const RESTS_MAX = 10;

/** BR-9, worked out when read (review minor 6 on 2572b9b0): a fact the run read unconfirmed and that is confirmed now
 *  with the same value is no longer marked "not confirmed yet". Confirm section keeps a run up to date (BR-13), so
 *  the mark must follow it too. The stored row is never changed. */
export function withUnconfirmedNow(r: ProgramResult, known: Known, person: string, rests?: { s: Snapshot; gates: Gate[] } | "none"): ProgramResult {
  return { ...r, gates: r.gates.map((g) => {
    const unconfirmed = (g.unconfirmed ?? []).filter((f) => {
      const k = known.get(kkey(aboutOf(known, f, person), f));
      return !(k && k.status === "confirmed" && canonical(k.value as never) === canonical(g.values[f] as never));
    });
    // B124: what the gate rests on, from the release the run read (same release only); an out-of-date run rests on
    // nothing here, since its band already says to run again (review minor 1).
    const gate = rests && rests !== "none" ? rests.gates.find((x) => x.key === g.key) : undefined;
    const on = rests === "none" ? [] : gate ? restsOn(rests!.s, known, gate, person, g.state, unconfirmed) : undefined;
    return { ...g, unconfirmed, ...(on ? { restsOn: on } : {}) };
  }) };
}
