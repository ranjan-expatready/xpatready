// P-179 (C11.8): one cost check before any AI start. Pure: it uses the same numbers and the same comparisons as
// p2/ledger.ts SpendLedger.reserve, so the warning never says "fits" when the ledger would refuse, and never warns when
// it would not. Over a limit a person may Continue (a recorded override) for this run's worst case only, and only while
// spend so far plus that worst case stays within the ceiling (US$132, the experiment cap + 10%); past it, no Continue.
import { EXPERIMENT_CAP_USD, MAX_ATTEMPTS, MAX_PAID_ATTEMPTS_PER_FORM, OVERRIDE_CEILING_USD, RUN_CAP_USD, WAVE1_CAP_USD } from "../../p2/policy.ts";

import type { CostCheck, CostOver } from "../contracts/cost-check.ts";
export type { CostCheck, CostLimit, CostOver } from "../contracts/cost-check.ts";
export type CostCheckInput = {
  /** US$ committed in the shared ledger (settled at cost, unsettled at worst case). */
  spent: number;
  /** US$ committed since the wave started, and the wave's name. */
  wave: { spent: number; name?: string };
  /** This start's worst case (every attempt of every step) and its expected cost (null: not known). */
  worst: number; expected?: number | null;
  /** The largest single run's worst case in this start (each run is held to the run cap); defaults to `worst`. */
  run?: number;
  /** Paid attempts per form: the forms in this start that have no paid run left (G4), by name. */
  attempts?: { spentForms: string[] };
  caps?: { experiment?: number; wave?: number; run?: number; ceiling?: number };
};

const usd = (n: number) => `US$${n.toFixed(2)}`;

export function costCheck(i: CostCheckInput): CostCheck {
  const cap = i.caps?.experiment ?? EXPERIMENT_CAP_USD, waveCap = i.caps?.wave ?? WAVE1_CAP_USD, runCap = i.caps?.run ?? RUN_CAP_USD, ceiling = i.caps?.ceiling ?? OVERRIDE_CEILING_USD;
  if (![i.spent, i.wave.spent, i.worst, i.run ?? 0].every((n) => Number.isFinite(n) && n >= 0)) throw new Error("cost check: every amount must be a number of US$ at or above 0");
  const expected = i.expected ?? null, run = i.run ?? i.worst, waveName = i.wave.name ?? "Wave 1";
  if (expected !== null && expected > i.worst + 1e-9) throw new Error("cost check: the expected cost cannot be above the worst case");
  const over: CostOver[] = [];
  // The same comparisons as SpendLedger.reserve: a reservation that would make the total pass a cap is refused.
  if (run > runCap) over.push({ limit: "run", limit_usd: runCap, after_usd: run, words: `One AI run could cost up to ${usd(run)}, above the ${usd(runCap)} each run may use.` });
  const forms = i.attempts?.spentForms ?? [];
  if (forms.length) over.push({ limit: "attempts", limit_usd: null, after_usd: null, words: `${forms.join(", ")} ${forms.length === 1 ? "has" : "have"} used ${forms.length === 1 ? "its" : "their"} ${MAX_PAID_ATTEMPTS_PER_FORM} paid AI attempts (${MAX_ATTEMPTS} per run). Continue allows exactly one more run of ${forms.length === 1 ? "it" : "each"}.` });
  // A start that can spend nothing (rules only, saved answers, a stub pass) passes no money limit, even with spend already
  // past a cap after a Continue: it never reserves a paid call (found by check_cost_override, 30 Oct).
  // Review m5: the limit's words say where this run could take spend; spend so far is said once, beside the cap.
  if (i.worst > 0 && i.spent + i.worst > cap) over.push({ limit: "experiment", limit_usd: cap, after_usd: i.spent + i.worst, words: `This run could reach ${usd(i.spent + i.worst)}, past the ${usd(cap)} AI spending cap.` });
  if (i.worst > 0 && i.wave.spent + i.worst > waveCap) over.push({ limit: "wave", limit_usd: waveCap, after_usd: i.wave.spent + i.worst, words: `${waveName} has spent ${usd(i.wave.spent)} of its ${usd(waveCap)}. This run could take it to ${usd(i.wave.spent + i.worst)}.` });
  const pastCeiling = i.spent + i.worst > ceiling;
  const can_continue = over.length > 0 && !pastCeiling;
  const words = !over.length ? `Fits: spent so far ${usd(i.spent)} of ${usd(cap)}; this run could cost up to ${usd(i.worst)}.`
    : pastCeiling ? `This run could reach ${usd(i.spent + i.worst)}, past the ${usd(ceiling)} the founder allows on a click. The founder must raise the cap.`
    : `Over ${over.length === 1 ? "a limit" : `${over.length} limits`}: ${over.map((o) => o.words).join(" ")} Continue records your name and this run's worst case (${usd(i.worst)}); Cancel starts nothing.`;
  return { ok: !over.length, over, can_continue, words, expected_usd: expected, worst_usd: i.worst, spent_usd: i.spent, cap_usd: cap, ceiling_usd: ceiling, wave: { name: waveName, spent_usd: i.wave.spent, cap_usd: waveCap } };
}
