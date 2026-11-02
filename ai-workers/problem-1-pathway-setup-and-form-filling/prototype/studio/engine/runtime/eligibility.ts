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

/** The founder's answer to C6.9 Q3 (P-229 (3), 2 Nov): one failed rule gives Not eligible even while other facts are
 *  missing, and the missing facts are listed too. Our addition to AG-03's AG-3-13 for the team (AG-3-13 gives Not
 *  eligible only "when all gate inputs are present"). Gates are joined by AND, so no missing answer can undo a failed one. */
export const FAIL_BEATS_MISSING = true;
export const STAND_IN = { id: "SI-1", words: "Today: our own checks on this application's rules, three outcomes and no score. Later: the team's AG-03 Qualifier fills this page and adds scores, cut-offs and advice." } as const;
export const DISCLAIMER_LOCALE = "en-CA";

export type Outcome = "LIKELY_ELIGIBLE" | "ELIGIBLE_BELOW_CUTOFF" | "POSSIBLY_ELIGIBLE" | "NOT_ELIGIBLE";
export type GateState = "met" | "not_met" | "not_answered";
export type GateResult = { key: string; label: string; state: GateState; facts: string[]; values: Record<string, unknown>; missing: string[]; whenNotMet: WhenNotMet };
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

/** Whose value a gate fact is: a `case.*` fact is the case's, every other one the person's (render.ts factsOf). */
export const aboutOf = (fact: string, person: string) => (fact.startsWith("case.") ? "case" : person);
const present = (v: unknown) => v !== undefined && v !== null && v !== "";
const valueOf = (known: Known, fact: string, person: string) => known.get(kkey(aboutOf(fact, person), fact))?.value;

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
  const tree = rewriteMissing(gate.condition, (f) => !present(valueOf(known, f, person)));
  const e = evalCondition(s, known, tree, person);
  const state: GateState = e.applies === true ? "met" : e.applies === false ? "not_met" : "not_answered";
  // A rule that cannot run at all (a calculation with no helper) waits on the facts it reads: never a verdict.
  const missing = state !== "not_answered" ? [] : e.missing.filter((m) => facts.includes(m)).length ? e.missing.filter((m) => facts.includes(m)) : facts.filter((f) => !present(values[f]));
  return { key: gate.key, label: gate.label, state, facts, values, missing, whenNotMet: gate.whenNotMet === "needs_review" ? "needs_review" : "not_eligible" };
}

/** BR-10: the outcome from the gate states. Both lists are always filled; `FAIL_BEATS_MISSING` decides the one case the
 *  team's text leaves open (a failed gate while another fact is missing). P-230 (1): a gate not met whose "when not met"
 *  is needs_review never gives Not eligible: it is listed in `reviewGates` (not `failedGates`) and the result is Possibly
 *  eligible, the representative reviewing it. The outcome set is unchanged. */
export function outcomeOf(gates: GateResult[], failBeatsMissing = FAIL_BEATS_MISSING): { outcome: Outcome; failedGates: string[]; missingInputs: string[]; reviewGates: string[] } {
  const notMet = gates.filter((g) => g.state === "not_met");
  const failedGates = notMet.filter((g) => g.whenNotMet !== "needs_review").map((g) => g.key);
  const reviewGates = notMet.filter((g) => g.whenNotMet === "needs_review").map((g) => g.key);
  const missingInputs = [...new Set(gates.filter((g) => g.state === "not_answered").flatMap((g) => g.missing))];
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
    const about = aboutOf(fact, person), v = valueOf(known, fact, person);
    return { fact, about, value: present(v) ? v : null, answerId: present(v) ? answerId(about, fact) : null };
  });
}

/** BR-13: a run is out of date when a fact it read now has a different value (added, changed or removed), compared by
 *  canonical value, never by answer id (Confirm section writes a new row with the same value), or when the case's pin
 *  is no longer the run's release. Worked out on every read; never written. */
export function outOfDate(inputs: Input[], now: (about: string, fact: string) => unknown, sameRelease: boolean) {
  const norm = (v: unknown) => canonical((present(v) ? v : null) as never);
  const changed = inputs.filter((i) => norm(i.value) !== norm(now(i.about, i.fact))).map((i) => ({ fact: i.fact, about: i.about, was: i.value, now: present(now(i.about, i.fact)) ? now(i.about, i.fact) : null }));
  return { out_of_date: changed.length > 0 || !sameRelease, changed, release_changed: !sameRelease };
}

/** Today's value of a fact, read the same way a run reads it (for outOfDate). */
export const nowOf = (known: Known) => (about: string, fact: string) => known.get(kkey(about, fact))?.value;
