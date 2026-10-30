// P-179 (C11.8): the cost check every AI start's plan carries, and the one way past it: a person's Continue, recorded in
// the shared ledger (QA-90) and used once to start that run. Hard limits stay the default: a start over a limit without
// an override is refused exactly as before. The ledger checks the override again inside the drafting process.
import { HttpStatus } from "@nestjs/common";
import { createHash } from "node:crypto";
import { costCheck, type CostCheck } from "../../engine/cost-check.ts";
import { OverrideRefused, SpendLedger, type OverrideLimit } from "../../../p2/ledger.ts";
import { LEDGER_DIR, WAVE1_START } from "../../../p2/policy.ts";
import { OverrideBody, type OverrideRef } from "../../contracts/cost-check.ts";
import { fail, need, type Actor } from "./core.ts";

/** The cost check for a start, against what the shared ledger holds now (the same numbers reserve uses). */
export function costCheckNow(i: { worst: number; expected?: number | null; run?: number; spentForms?: string[] }): CostCheck {
  const l = new SpendLedger(LEDGER_DIR);
  return costCheck({ spent: l.committed(), wave: { spent: l.committedSince(WAVE1_START) }, worst: i.worst, expected: i.expected ?? null, run: i.run, attempts: i.spentForms?.length ? { spentForms: i.spentForms } : undefined });
}

/** One run key per start: what it does (the plan's fingerprint) and what it could cost. A changed plan has another key,
 *  so an override never starts a run other than the one the person saw. Plain hex: it passes to the launcher as is. */
export const runKeyOf = (operation: string, planSha256: string, check: CostCheck) =>
  createHash("sha256").update(JSON.stringify([operation, planSha256, check.worst_usd, check.over.map((o) => o.limit)])).digest("hex").slice(0, 40);

/** The checks of POST /ai/overrides before anything is written: an author only, the plan re-made now has the same run key,
 *  worst case and limits, it is over a limit, and within the ceiling. Answers the limits to record. */
export function overrideAllowed(actor: Actor, body: unknown, plan: { run_key: string; cost_check: CostCheck }): { run_key: string; worst_usd: number; limits: OverrideLimit[] } {
  need(actor, "author");
  const b = OverrideBody.safeParse(body);
  if (!b.success) fail(b.error.issues[0]?.message ?? "Say which run to continue and its worst case.");
  const { run_key, worst_usd, limits } = b.data!;
  const cc = plan.cost_check;
  if (plan.run_key !== run_key) fail("The work changed since you looked at the cost (another step, source or price). Look at it again; nothing was recorded.", HttpStatus.CONFLICT);
  if (cc.ok) fail("This start fits every limit: there is nothing to continue past. Start it as usual; nothing was recorded.", HttpStatus.CONFLICT);
  if (Math.abs(cc.worst_usd - worst_usd) > 1e-9) fail(`The worst case is now US$${cc.worst_usd.toFixed(2)}, not the US$${worst_usd.toFixed(2)} you saw. Look at the cost again; nothing was recorded.`, HttpStatus.CONFLICT);
  const now = cc.over.map((o) => o.limit).sort().join(","), saw = [...limits].sort().join(",");
  if (now !== saw) fail(`The limits this start passes changed (now: ${now}). Look at the cost again; nothing was recorded.`, HttpStatus.CONFLICT);
  if (!cc.can_continue) fail(cc.words, HttpStatus.CONFLICT);
  return { run_key, worst_usd, limits: limits as OverrideLimit[] };
}

/** Records the override in the shared ledger (the ledger re-checks the ceiling under its lock). */
export function recordOverride(actor: Actor, o: { run_key: string; worst_usd: number; limits: OverrideLimit[] }) {
  try { return new SpendLedger(LEDGER_DIR).recordOverride({ ...o, by: actor.id }); }
  catch (e) { if (e instanceof OverrideRefused) fail(e.why === "ceiling" ? `${e.message}. Nothing was recorded.` : e.message, HttpStatus.CONFLICT); throw e; }
}

/** A launch with an override: the plan is over a limit, the override names every limit it passes, and it is used now
 *  (once, for this run key, within its time). Answers what the run's launches carry. */
export function useOverride(overrideId: string, plan: { run_key: string; cost_check: CostCheck }): OverrideRef {
  const l = new SpendLedger(LEDGER_DIR);
  if (typeof overrideId !== "string" || !overrideId) fail("No such Continue was recorded. Look at the cost again.", HttpStatus.CONFLICT);
  // Compared with the plan before it is used, so a refusal here leaves the person's Continue unused.
  const seen = l.override(overrideId);
  if (seen && seen.run_key === plan.run_key) {
    const missing = plan.cost_check.over.map((x) => x.limit).filter((x) => !seen.limits.includes(x));
    if (missing.length) fail(`This Continue does not cover the ${missing.join(" and ")} limit this start now passes. Look at the cost again.`, HttpStatus.CONFLICT);
    if (plan.cost_check.worst_usd > seen.worst_usd + 1e-9) fail(`This start could now cost US$${plan.cost_check.worst_usd.toFixed(2)}, above the US$${seen.worst_usd.toFixed(2)} accepted. Look at the cost again.`, HttpStatus.CONFLICT);
  }
  try {
    const o = l.useOverride(overrideId, plan.run_key);
    return { id: o.id, run_key: o.run_key, limits: o.limits };
  } catch (e) {
    if (e instanceof OverrideRefused) fail(e.why === "used" ? "This Continue was already used: one click starts one run. Look at the cost again." : e.why === "expired" ? "This Continue expired (10 minutes). Look at the cost again." : e.why === "other_run" ? "This Continue was for another start. Look at the cost again." : "No such Continue was recorded. Look at the cost again.", HttpStatus.CONFLICT);
    throw e;
  }
}
