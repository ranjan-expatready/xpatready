// P-179 (C11.8): the cost check every AI start's plan carries, and the one way past it: a person's Continue, recorded in
// the shared ledger (QA-90) and used once to start that run. Hard limits stay the default: a start over a limit without
// an override is refused exactly as before. The ledger checks the override again inside the drafting process.
import { HttpStatus } from "@nestjs/common";
import { createHash } from "node:crypto";
import { costCheck, type CostCheck } from "../../engine/cost-check.ts";
import { BudgetExceeded, LedgerBusy, OverrideRefused, SpendLedger, type OverrideLimit } from "../../../p2/ledger.ts";
import { LEDGER_DIR, WAVE1_START } from "../../../p2/policy.ts";
import { OverrideBody, type OverrideRef } from "../../contracts/cost-check.ts";
import { fail, need, type Actor } from "./core.ts";

/** Break n1 (N6): the API waits at most 2 s for another process's short ledger lock. The wait holds the API's one thread,
 *  so every request waited with it (10 s before); past it, the start is refused as busy, in words. */
export const apiLedger = () => new SpendLedger(LEDGER_DIR, undefined, { waitMs: 2_000 });

/** The cost check for a start and its run key, against what the shared ledger holds now (the same numbers reserve and
 *  recordOverride use). N6 (review N2): what other starts' Continues still hold counts against the ceiling, as the ledger
 *  counts it when Continue is recorded, so the dialog never offers a Continue the ledger would refuse; this start's own
 *  run key holds nothing against itself. The run key does not depend on what is held (only on the plan, worst case and
 *  limits), so it is made first. */
export function costPlanNow(operation: string, planSha256: string, i: { worst: number; expected?: number | null; run?: number; spentForms?: string[] }, ended: ReadonlySet<string> = new Set()): { cost_check: CostCheck; run_key: string } {
  const l = new SpendLedger(LEDGER_DIR);
  return ledgerRead(() => {
    const input = { spent: l.committed(), wave: { spent: l.committedSince(WAVE1_START) }, worst: i.worst, expected: i.expected ?? null, run: i.run, attempts: i.spentForms?.length ? { spentForms: i.spentForms } : undefined };
    const base = costCheck(input), run_key = runKeyOf(operation, planSha256, base);
    if (base.ok) return { cost_check: base, run_key };
    return { cost_check: costCheck({ ...input, held: l.heldByOverridesUsd(undefined, undefined, run_key, ended) }), run_key };
  });
}

/** N6 (break n2): the Continues whose run has ended in this copy (finished, failed or stopped): they hold nothing more
 *  against the ceiling. Another copy's run is not seen here: its Continue holds until it reserves or expires (the safe side). */
export async function endedOverrides(db: { $queryRawUnsafe: <T>(q: string) => Promise<T> }): Promise<Set<string>> {
  const rows = await db.$queryRawUnsafe<{ id: string | null }[]>(`select plan->'override'->>'id' as id from ai_batch where status in ('COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED') and plan ? 'override'`);
  return new Set(rows.map((r) => r.id).filter((x): x is string => !!x));
}

/** One run key per start: what it does (the plan's fingerprint) and what it could cost. A changed plan has another key,
 *  so an override never starts a run other than the one the person saw. Plain hex: it passes to the launcher as is. */
export const runKeyOf = (operation: string, planSha256: string, check: CostCheck) =>
  createHash("sha256").update(JSON.stringify([operation, planSha256, check.worst_usd, check.over.map((o) => o.limit)])).digest("hex").slice(0, 40);

/** The checks of POST /ai/overrides before anything is written: an author only, the plan re-made now has the same run key,
 *  worst case and limits, it is over a limit, and within the ceiling. Answers the limits to record. */
export function overrideAllowed(actor: Actor, body: unknown, plan: { run_key: string; cost_check: CostCheck }): { run_key: string; worst_usd: number; limits: OverrideLimit[]; reason?: string } {
  need(actor, "author");
  const b = OverrideBody.safeParse(body);
  if (!b.success) fail(b.error.issues[0]?.message ?? "Say which run to continue and its worst case.");
  const { run_key, worst_usd, limits, reason } = b.data!;
  const cc = plan.cost_check;
  if (plan.run_key !== run_key) fail("The work changed since you looked at the cost (another step, source or price). Look at it again; nothing was recorded.", HttpStatus.CONFLICT);
  if (cc.ok) fail("This start fits every limit: there is nothing to continue past. Start it as usual; nothing was recorded.", HttpStatus.CONFLICT);
  if (Math.abs(cc.worst_usd - worst_usd) > 1e-9) fail(`The worst case is now US$${cc.worst_usd.toFixed(2)}, not the US$${worst_usd.toFixed(2)} you saw. Look at the cost again; nothing was recorded.`, HttpStatus.CONFLICT);
  const now = cc.over.map((o) => o.limit).sort().join(","), saw = [...limits].sort().join(",");
  if (now !== saw) fail(`The limits this start passes changed (now: ${now}). Look at the cost again; nothing was recorded.`, HttpStatus.CONFLICT);
  if (!cc.can_continue) fail(cc.words, HttpStatus.CONFLICT);
  return { run_key, worst_usd, limits: limits as OverrideLimit[], ...(reason?.trim() ? { reason: reason.trim() } : {}) };
}

/** Records the override in the shared ledger (the ledger re-checks the ceiling under its lock). */
export function recordOverride(actor: Actor, o: { run_key: string; worst_usd: number; limits: OverrideLimit[]; reason?: string }, ended: ReadonlySet<string> = new Set()) {
  try { return apiLedger().recordOverride({ ...o, by: actor.id }, { ended }); }
  catch (e) { if (e instanceof OverrideRefused) fail(e.why === "ceiling" || e.why === "held" ? `${e.message}. Nothing was recorded.` : e.message, HttpStatus.CONFLICT); return ledgerFail(e); }
}

const REFUSED: Record<string, string> = {
  unknown: "No such Continue was recorded. Look at the cost again.",
  used: "This Continue was already used: one click starts one run. Look at the cost again.",
  expired: "This Continue expired (10 minutes). Look at the cost again.",
  other_run: "This Continue was for another start. Look at the cost again.",
  person: "This Continue was recorded by another person: only they can start with it. Look at the cost and choose Continue yourself.",
};
const refusedWords = (e: OverrideRefused) => REFUSED[e.why] ?? REFUSED.unknown;

/** A launch with an override, before anything is written: the plan is over a limit and within the ceiling, and the
 *  override is this person's, for this run key, names every limit it passes, covers its worst case and has not expired.
 *  Refusals here leave the Continue unused. Whether it was used already is decided by `spendOverride`, inside the
 *  launch's transaction, so the same launch key sent twice at once gets its one run (review m1, break m2). */
export function checkOverride(actor: Actor, overrideId: unknown, plan: { run_key: string; cost_check: CostCheck }): OverrideRef {
  if (typeof overrideId !== "string" || !overrideId) fail(REFUSED.unknown, HttpStatus.CONFLICT);
  // Break M2: spend that arrived since the Continue may take this start past the ceiling: no start then.
  if (!plan.cost_check.ok && !plan.cost_check.can_continue) fail(plan.cost_check.words, HttpStatus.CONFLICT);
  const seen = ledgerRead(() => new SpendLedger(LEDGER_DIR).override(overrideId as string));
  if (!seen) fail(REFUSED.unknown, HttpStatus.CONFLICT);
  if (seen!.run_key !== plan.run_key) fail(REFUSED.other_run, HttpStatus.CONFLICT);
  if (seen!.by !== actor.id) fail(REFUSED.person, HttpStatus.CONFLICT); // break m7
  if (Date.now() > Date.parse(seen!.expires_at)) fail(REFUSED.expired, HttpStatus.CONFLICT);
  const missing = plan.cost_check.over.map((x) => x.limit).filter((x) => !seen!.limits.includes(x));
  if (missing.length) fail(`This Continue does not cover the ${missing.join(" and ")} limit this start now passes. Look at the cost again.`, HttpStatus.CONFLICT);
  if (plan.cost_check.worst_usd > seen!.worst_usd + 1e-9) fail(`This start could now cost US$${plan.cost_check.worst_usd.toFixed(2)}, above the US$${seen!.worst_usd.toFixed(2)} accepted. Look at the cost again.`, HttpStatus.CONFLICT);
  return { id: seen!.id, run_key: seen!.run_key, limits: seen!.limits };
}

/** Uses a checked override once (the ledger refuses a second use, another person's, an expired one). Called last inside
 *  the launch's database transaction: a refusal rolls the launch back, and a launch refused before it (a draft already
 *  under review, "Already finding", the same key twice) leaves the Continue unused. */
export function spendOverride(actor: Actor, ref: OverrideRef): void {
  try { apiLedger().useOverride(ref.id, ref.run_key, actor.id); }
  catch (e) { if (e instanceof OverrideRefused) fail(refusedWords(e), HttpStatus.CONFLICT); ledgerFail(e); }
}

/** Break m6: a ledger that cannot be read (a line that is not JSON or not an amount) stops every AI start, in words. */
export function ledgerFail(e: unknown): never {
  // Break n1 (N6): a busy ledger is not a broken one: wait a moment and try again (before: "Ask the Lead to fix the ledger line").
  if (e instanceof LedgerBusy) fail("The shared spend ledger is busy with another start. Try again in a moment; nothing was started.", HttpStatus.SERVICE_UNAVAILABLE);
  if (e instanceof BudgetExceeded) fail(`AI starts are stopped: ${e.message}. Ask the Lead to fix the ledger line; nothing was started.`, HttpStatus.SERVICE_UNAVAILABLE);
  throw e;
}
export function ledgerRead<T>(fn: () => T): T { try { return fn(); } catch (e) { return ledgerFail(e); } }
