// PF-15 part 1b (brief design/lead-b-briefs/PF-15.md, DW3's booking, DW4, DW5; SA-3-58..61, SA-4-56): a firm's move to
// another plan. PlanBookings books it only when checkDowngrade finds no conflict (SA-3-58: no booking while any remains,
// no override), under the firm's row lock (the one staff changes hold), so no invite slips in between the check and the
// booking. The database stamps the booking (migration 20261121130000_pf15b_plan_booking): during a trial it applies at
// once with the trial end unchanged (SA-3-61, SA-4-56), otherwise at the next renewal (SA-3-60); while it is open every
// limit is the lower of the two plans' (SA-3-59, in platform_entitlement_limit). The daily job applies due bookings.
// No route here: PF-16 calls `book` and `withdraw` from POST /api/platform/billing/change-plan (Owner only) after its
// Stripe call. Every booking, withdrawal and apply writes one audit line in the same transaction.
import { HttpException, HttpStatus } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { AuditPort } from "../../../../ports/audit.ts";
import type { CaseCountPort } from "../../../../ports/case-count.ts";
import type { FilesPort } from "../../../../ports/files.ts";
import type { JobPort } from "../../../../ports/jobs.ts";
import { auditEvent } from "../audit/audit-event.ts";
import { asBypass, firmScope, touchEachFirm, withFirm } from "../firm-scope.ts";
import { logPort } from "../observability/log.ts";
import { checkDowngrade, type DowngradeConflict } from "./limits.ts";

type Tx = Prisma.TransactionClient;

/** The daily apply: 12:30 Toronto, outside 01:00-03:00 in every Canadian zone (ports/jobs.ts), after the storage measure. */
export const BOOKING_DAILY_QUEUE = "platform.entitlements.booking_daily", BOOKING_DAILY_CRON = "30 12 * * *", BOOKING_DAILY_ZONE = "America/Toronto";

export type PlanBookingDeps = {
  db: PrismaClient; now: () => number;
  files: Pick<FilesPort, "usedBytes">;
  /** The case side's count bound to one firm (by its key), never by an argument a client sends. */
  cases: (firmKey: string) => CaseCountPort;
  audit?: AuditPort<Tx>;
};
export type Booking = { id: string; fromPlan: string; toPlan: string; bookedAt: string; effectiveAt: string; appliedAt: string | null; atOnce: boolean };

const Actor = z.string().regex(/^(staff|system):[A-Za-z0-9._:-]{1,120}$/, "staff:<id> or system:<name>");

function problem(status: number, code: string, title: string, detail: string, extra: Record<string, unknown> = {}): never {
  throw new HttpException({ type: `https://expatready.local/problems/${code.toLowerCase().replace(/_/g, "-")}`, title, status, code, detail, ...extra }, status as HttpStatus);
}

export class PlanBookings {
  constructor(private readonly d: PlanBookingDeps) {}
  private get audit() { return this.d.audit ?? auditEvent; }

  /** The firm's open booking, or null (its own scope). */
  async open(firmId: string): Promise<Booking | null> {
    const id = firmScope(firmId).firmId;
    const r = await this.d.db.platformSubscriptionChange.findFirst({ where: firmScope(id, { withdrawnAt: null, appliedAt: null }), include: { fromPlan: { select: { code: true } }, toPlan: { select: { code: true } } } });
    return r ? { id: r.id, fromPlan: r.fromPlan.code, toPlan: r.toPlan.code, bookedAt: r.bookedAt.toISOString(), effectiveAt: r.effectiveAt.toISOString(), appliedAt: null, atOnce: false } : null;
  }

  /** Books the firm's move to `targetPlan` (in the caller's firm scope). 409 DOWNGRADE_CONFLICTS with every conflict
   *  (usage, target limit, amount to reduce, SA-4-56's words) and nothing booked; 409 PLAN_CHANGE_BOOKED while one is
   *  open (withdraw it first); 409 for no live subscription, a payment hold or the same plan; 404 for no such plan. */
  async book(firmId: string, targetPlan: string, actor: string): Promise<Booking> {
    const id = firmScope(firmId).firmId, plan = z.string().trim().min(1).max(64).parse(targetPlan), by = Actor.parse(actor);
    return this.d.db.$transaction(async (tx) => {
      const firm = (await tx.$queryRaw<{ key: string }[]>`select key from platform_firm where id = ${id}::uuid for no key update`)[0];   // the staff changes' lock: no invite between the check and the booking
      if (!firm) problem(404, "NOT_FOUND", "Not found", "No such firm.");
      // Review M2: a case opening serialises on its own lock (runtime.ts createCase), not the firm row; take it too, so no
      // case is opened between the count below and the booking (SA-3-58). Same order as nothing else takes both.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`case-open:${firm.key}`}))`;
      const had = await tx.platformSubscriptionChange.findFirst({ where: firmScope(id, { withdrawnAt: null, appliedAt: null }), select: { id: true, effectiveAt: true } });
      if (had) problem(409, "PLAN_CHANGE_BOOKED", "A plan change is already booked", `A plan change is already booked for ${had.effectiveAt.toISOString().slice(0, 10)}. Withdraw it first.`, { bookingId: had.id });
      const check = await checkDowngrade(tx, { files: this.d.files, cases: bindTx(this.d.cases(firm.key), tx) }, id, plan);
      if (check.conflicts.length) conflicts(check.conflicts, check.features);
      let row: { id: string; bookedAt: Date; effectiveAt: Date; appliedAt: Date | null; from: string; to: string };
      try {
        row = (await tx.$queryRaw<typeof row[]>`
          WITH b AS (INSERT INTO platform_subscription_change (id, firm_id, subscription_id, from_plan_id, to_plan_id, booked_by, booked_at, effective_at)
            SELECT gen_random_uuid(), ${id}::uuid, s.id, s.plan_id, p.id, ${by}, now(), now() FROM platform_subscription s, platform_plan p
            WHERE s.firm_id = ${id}::uuid AND s.status <> 'ENDED' AND p.code = ${plan}
            RETURNING id, booked_at, effective_at, applied_at, from_plan_id, to_plan_id)
          SELECT b.id::text AS id, b.booked_at AS "bookedAt", b.effective_at AS "effectiveAt", b.applied_at AS "appliedAt", f.code AS from, t.code AS to
          FROM b JOIN platform_plan f ON f.id = b.from_plan_id JOIN platform_plan t ON t.id = b.to_plan_id`)[0];
      } catch (e) { return refusedBy(e); }
      if (!row) problem(409, "NO_LIVE_SUBSCRIPTION", "No live subscription", "Your firm has no live subscription, so its plan cannot change.");
      const atOnce = row.appliedAt !== null, when = row.effectiveAt.toISOString();
      await this.audit.record(tx, { firmId: id, actor: by, action: atOnce ? "plan.change.applied" : "plan.change.booked", entity: "platform_subscription_change", entityKey: row.id,
        summary: atOnce ? `The plan changed from ${row.from} to ${row.to} at once (trial: nothing charged, the trial end unchanged).` : `A move from ${row.from} to ${row.to} is booked for the renewal on ${when.slice(0, 10)}; until then every limit is the lower of the two plans'.`,
        detail: { fromPlan: row.from, toPlan: row.to, effectiveAt: when }, before: shape(row.from), after: atOnce ? shape(row.to) : shape(row.from, row.to, when) });
      return { id: row.id, fromPlan: row.from, toPlan: row.to, bookedAt: row.bookedAt.toISOString(), effectiveAt: when, appliedAt: row.appliedAt?.toISOString() ?? null, atOnce };
    }, { timeout: 30_000 });
  }

  /** Withdraws the firm's open booking (its limits are its own plan's again). 404 when none is open. */
  async withdraw(firmId: string, actor: string): Promise<{ id: string; toPlan: string }> {
    const id = firmScope(firmId).firmId, by = Actor.parse(actor);
    return this.d.db.$transaction(async (tx) => {
      await tx.$queryRaw`select id from platform_firm where id = ${id}::uuid for no key update`;
      const r = (await tx.$queryRaw<{ id: string; to: string; from: string; effectiveAt: Date }[]>`
        UPDATE platform_subscription_change c SET withdrawn_at = greatest(clock_timestamp(), c.booked_at) FROM platform_plan t, platform_plan f
        WHERE c.firm_id = ${id}::uuid AND c.withdrawn_at IS NULL AND c.applied_at IS NULL AND t.id = c.to_plan_id AND f.id = c.from_plan_id
        RETURNING c.id::text AS id, t.code AS to, f.code AS from, c.effective_at AS "effectiveAt"`)[0];
      if (!r) problem(404, "NO_PLAN_CHANGE_BOOKED", "No plan change is booked", "There is no booked plan change to withdraw.");
      await this.audit.record(tx, { firmId: id, actor: by, action: "plan.change.withdrawn", entity: "platform_subscription_change", entityKey: r.id,
        summary: `The booked move from ${r.from} to ${r.to} was withdrawn; the limits are ${r.from}'s again.`, detail: { fromPlan: r.from, toPlan: r.to }, before: shape(r.from, r.to, r.effectiveAt.toISOString()), after: shape(r.from) });
      return { id: r.id, toPlan: r.to };
    });
  }

  /** Applies the firm's booking once its renewal has come (in the caller's firm scope). Once: a second call, or a
   *  withdrawn booking, applies nothing. A booking that can no longer apply (its subscription ended, or the plan moved
   *  another way meanwhile; review m1) is withdrawn by the job with its own line, so nothing stays stuck; it already
   *  lowered nothing (platform_entitlement_limit). A firm on payment hold keeps it open: the database refuses the apply. */
  async applyDue(firmId: string): Promise<{ applied: boolean; toPlan?: string; withdrawn?: boolean }> {
    const id = firmScope(firmId).firmId, now = new Date(this.d.now());
    return this.d.db.$transaction(async (tx) => {
      await tx.$queryRaw`select id from platform_firm where id = ${id}::uuid for no key update`;
      const stale = (await tx.$queryRaw<{ id: string; to: string; from: string; effectiveAt: Date }[]>`
        UPDATE platform_subscription_change c SET withdrawn_at = greatest(clock_timestamp(), c.booked_at) FROM platform_plan t, platform_plan f
        WHERE c.firm_id = ${id}::uuid AND c.withdrawn_at IS NULL AND c.applied_at IS NULL AND c.effective_at <= ${now} AND t.id = c.to_plan_id AND f.id = c.from_plan_id
          AND (NOT EXISTS (SELECT 1 FROM platform_subscription s WHERE s.id = c.subscription_id AND s.status <> 'ENDED' AND s.plan_id = c.from_plan_id) OR NOT t.active)
        RETURNING c.id::text AS id, t.code AS to, f.code AS from, c.effective_at AS "effectiveAt"`)[0];
      if (stale) {
        await this.audit.record(tx, { firmId: id, actor: "system:platform.entitlements", action: "plan.change.withdrawn", entity: "platform_subscription_change", entityKey: stale.id,
          summary: `The booked move from ${stale.from} to ${stale.to} was withdrawn at its renewal: the subscription had ended or moved to another plan meanwhile, or the plan is no longer offered.`, detail: { fromPlan: stale.from, toPlan: stale.to, reason: "STALE" }, before: shape(stale.from, stale.to, stale.effectiveAt.toISOString()), after: shape(stale.from) });
        return { applied: false, withdrawn: true };
      }
      const r = (await tx.$queryRaw<{ id: string; to: string; from: string; effectiveAt: Date }[]>`
        UPDATE platform_subscription_change c SET applied_at = ${now} FROM platform_plan t, platform_plan f
        WHERE c.firm_id = ${id}::uuid AND c.withdrawn_at IS NULL AND c.applied_at IS NULL AND c.effective_at <= ${now} AND t.id = c.to_plan_id AND f.id = c.from_plan_id
        RETURNING c.id::text AS id, t.code AS to, f.code AS from, c.effective_at AS "effectiveAt"`)[0];
      if (!r) return { applied: false };
      await this.audit.record(tx, { firmId: id, actor: "system:platform.entitlements", action: "plan.change.applied", entity: "platform_subscription_change", entityKey: r.id,
        summary: `At the renewal on ${r.effectiveAt.toISOString().slice(0, 10)} the plan changed from ${r.from} to ${r.to}.`, detail: { fromPlan: r.from, toPlan: r.to, effectiveAt: r.effectiveAt.toISOString() }, before: shape(r.from, r.to, r.effectiveAt.toISOString()), after: shape(r.to) });
      return { applied: true, toPlan: r.to };
    });
  }

  /** The daily job: every firm with a booking due, each in its own firm scope; one firm's failure never stops the rest. */
  async daily(): Promise<{ applied: number; failed: number }> {
    const now = new Date(this.d.now());
    // PF-12b: the list reads every firm's bookings, so each firm listed gets its platform.bypass line first (P-607).
    const { firms, unrecorded } = await asBypass(`job:${BOOKING_DAILY_QUEUE}`, async () => {
      const due = await this.d.db.platformSubscriptionChange.findMany({ where: { withdrawnAt: null, appliedAt: null, effectiveAt: { lte: now } }, select: { firmId: true }, orderBy: { firmId: "asc" } });
      const ids = [...new Set(due.map((r) => r.firmId))], { failed: lost } = await touchEachFirm(this.d.db, ids);
      return { firms: ids.filter((f) => !lost.has(f.toLowerCase())), unrecorded: lost.size };
    });
    let applied = 0, failed = unrecorded;
    for (const f of firms) {
      try { if ((await withFirm(f, () => this.applyDue(f))).applied) applied++; } catch (e) { failed++; logPort.error("booking_daily_failed", e, { firmId: f }); }
    }
    return { applied, failed };
  }

  /** Registers the daily job (before the runner starts). */
  async register(jobs: JobPort) {
    await jobs.handle(BOOKING_DAILY_QUEUE, async () => { await this.daily(); });
    await jobs.recurring(BOOKING_DAILY_QUEUE, BOOKING_DAILY_CRON, BOOKING_DAILY_ZONE);
  }
}

/** One shape for every line's before and after (review m4): the plan, the booked plan and its date (null when none). */
const shape = (plan: string, bookedPlan: string | null = null, effectiveAt: string | null = null) => ({ plan, bookedPlan, effectiveAt });

/** The count read inside the booking's own transaction (contract §3.4). */
const bindTx = (c: CaseCountPort, tx: Tx): CaseCountPort => ({ activeCounts: () => c.activeCounts(tx) });

function conflicts(list: DowngradeConflict[], features: string[]): never {
  problem(409, "DOWNGRADE_CONFLICTS", "Reduce the usage first", `${list.map((c) => c.words).join(" ")} Nothing was booked.`, { conflicts: list, features });
}

/** The database's refusals in plain words (the booking trigger). */
function refusedBy(e: unknown): never {
  const m = String((e as { message?: string })?.message ?? e);
  if (/no such active plan/.test(m)) problem(404, "PLAN_NOT_FOUND", "Not found", "No such plan.");
  if (/already on that plan/.test(m)) problem(409, "SAME_PLAN", "Already on that plan", "Your firm is already on that plan.");
  if (/payment hold/.test(m)) problem(409, "BILLING_NOT_ACTIVE", "Pay first", "Your firm is on payment hold: pay the open invoice before changing the plan.");
  if (/a raise applies at once/.test(m)) problem(409, "PLAN_RAISE_NOT_BOOKED", "A raise applies at once", "A move to a larger or more expensive plan applies at once, charged through billing; it is never booked for the renewal.");
  if (/no live subscription/.test(m)) problem(409, "NO_LIVE_SUBSCRIPTION", "No live subscription", "Your firm has no live subscription, so its plan cannot change.");
  if (/platform_subscription_change_one_open/.test(m)) problem(409, "PLAN_CHANGE_BOOKED", "A plan change is already booked", "A plan change is already booked. Withdraw it first.");
  throw e;
}
