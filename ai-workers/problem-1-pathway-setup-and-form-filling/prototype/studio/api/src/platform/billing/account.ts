// PF-5 part 2 (contracts §7 §1.1; SA-4-54, -67, SA-4-52, AG-1-65, SA-2-24): the firm's billing page and its profile.
//   * view: plan, status, trial or period end, seats used of the limit, card on file and cancel at period end (Stripe's,
//     read through BillingPort; null when Stripe is unreachable, never guessed), why the firm is held, and the deletion
//     date (90 days from the hold, contracts §7 "Firm exit"; the clock that acts on it is part 3);
//   * invoices: our invoices to the firm with Stripe's hosted links (drafts never shown);
//   * address: the business address (platform_firm.business_address, the office shape), also put on the Stripe customer
//     so Stripe Tax can tax the first invoice (Lead B, step 0 fact 3); works on hold;
//   * card and portal hand-offs: a card Checkout (its completion resumes a held subscription, webhook.ts) and the
//     Customer Portal (plan switching off; PF-16's). The firm profile (GET|PUT firm/profile) is part 3's (P-610 size).
// Stripe not set up or unreachable answers 503 with plain words, never a made-up link (break m5, m6).
import { HttpException } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { BillingAddress } from "../../../../ports/billing.ts";
import { EVENT } from "../../../../ports/events.ts";
import { firmScope } from "../firm-scope.ts";
import type { StaffContext } from "../identity/keys.ts";
import { ADDRESS_NEEDED, type BillingPorts } from "./webhook.ts";

export const DELETION_DAYS = 90;
const problem = (status: number, code: string, title: string, detail: string, extra: Record<string, unknown> = {}) => new HttpException({ type: `https://expatready.local/problems/${code.toLowerCase().replace(/_/g, "-")}`, title, status, detail, code, ...extra }, status);
const fields = (e: z.ZodError) => problem(400, "CHECK_FIELDS", "Check the form", "Some answers need changing.", { errors: e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`) });
const text = (max: number) => z.string().trim().min(1).max(max).refine((s) => !/(?![\u200C\u200D])[\p{Cc}\p{Cf}]/u.test(s), "no control characters")   // ZWNJ and ZWJ are letters' joiners (break m1);

/** The office shape (samples/firms.json), as platform_firm.business_address keeps it. */
export const Address = z.strictObject({
  unit: text(20).nullable().default(null), street_number: text(20), street_name: text(150), city: text(100), province_state: z.enum(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]),
  postal_code: z.string().trim().toUpperCase().regex(/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/, "a Canadian postal code (A1A 1A1)"),   // Canada Post's letters (break m4)
});
const toStripe = (a: z.output<typeof Address>, country: string): BillingAddress => ({ line1: `${a.street_number} ${a.street_name}`, ...(a.unit ? { line2: `Unit ${a.unit}` } : {}), city: a.city, province: a.province_state, postalCode: a.postal_code, country });

/** QA-594: before and after take flat values, so the address goes in field by field (address_city, …); the firm's
 *  address is not a secret and is kept in full (P-687). */
const flatAddress = (a: Record<string, unknown>) => Object.fromEntries(Object.entries(a).filter(([k]) => /^[A-Za-z][A-Za-z0-9_]{0,55}$/.test(k))
  .map(([k, v]) => [`address_${k}`, v === null || ["string", "number", "boolean"].includes(typeof v) ? (v as string | number | boolean | null) : JSON.stringify(v)]));
const unavailable = () => problem(503, "BILLING_UNAVAILABLE", "Billing is unavailable", "We could not reach our billing provider. Try again in a few minutes.");

export class BillingAccount {
  constructor(private readonly db: PrismaClient, private readonly ports: BillingPorts) {}
  private ready() { if (this.ports.notReady) throw problem(503, "BILLING_NOT_SET_UP", "Billing is not set up here", this.ports.notReady); }

  private async current(firmId: string) {
    const sub = await this.db.platformSubscription.findFirst({ where: firmScope(firmId, { status: { not: "ENDED" as const } }), orderBy: { createdAt: "desc" }, include: { plan: true } })
      ?? await this.db.platformSubscription.findFirst({ where: firmScope(firmId), orderBy: { createdAt: "desc" }, include: { plan: true } });
    if (!sub) throw problem(404, "NOT_FOUND", "Not found", "This firm has no subscription.");
    return sub;
  }

  async view(s: StaffContext) {
    const firm = await this.db.platformFirm.findUniqueOrThrow({ where: { id: s.firmId } }), sub = await this.current(s.firmId);
    const now = this.ports.clock.now();
    const [staff, invites] = await Promise.all([
      this.db.platformStaff.count({ where: firmScope(s.firmId, { status: { in: ["ACTIVE" as const, "SUSPENDED" as const] } }) }),
      this.db.platformInvitation.count({ where: firmScope(s.firmId, { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } }) }),
    ]);
    const live = sub.stripeSubscriptionId ? await this.ports.billing.subscription(sub.stripeSubscriptionId).catch(() => null) : null;
    const hold = firm.status === "PAYMENT_HOLD" ? await this.db.moduleEvent.findFirst({ where: firmScope(s.firmId, { type: EVENT.FIRM_PAYMENT_HOLD }), orderBy: { seq: "desc" } }) : null;
    const reason = (hold?.payload as { reason?: string } | null)?.reason ?? null;
    return {
      plan: { code: sub.plan.code, name: sub.plan.name, seatsLimit: sub.plan.seatsLimit }, status: sub.status, firmStatus: firm.status,
      trialEndsAt: sub.trialEndsAt, currentPeriodEnd: sub.currentPeriodEnd, seatsUsed: staff + invites, seatsLimit: sub.plan.seatsLimit,
      cardOnFile: live?.hasCard ?? null, cancelAtPeriodEnd: live?.cancelAtPeriodEnd ?? null, billingAvailable: !sub.stripeSubscriptionId || live !== null,
      hold: hold ? { reason: reason === ADDRESS_NEEDED ? ADDRESS_NEEDED : "payment needed", since: hold.occurredAt, deletionDate: new Date(hold.occurredAt.getTime() + DELETION_DAYS * 86_400_000) } : null,
      businessAddress: firm.businessAddress ?? null,
    };
  }

  async invoices(s: StaffContext) {
    const sub = await this.current(s.firmId);
    if (!sub.stripeCustomerId) return { invoices: [] };
    this.ready();
    const list = await this.ports.billing.invoices(sub.stripeCustomerId).catch(() => { throw unavailable(); });
    return { invoices: list.filter((i) => i.status !== "draft").map((i) => ({ id: i.id, number: i.number, status: i.status, amountDueCents: i.amountDueCents, currency: i.currency.toUpperCase(), createdAt: i.createdAt, hostedUrl: i.hostedUrl })) };
  }

  async setAddress(s: StaffContext, body: unknown) {
    const p = Address.safeParse(body ?? {});
    if (!p.success) throw fields(p.error);
    const firm = await this.db.platformFirm.findUniqueOrThrow({ where: { id: s.firmId } });
    const old = (firm.businessAddress ?? {}) as Record<string, unknown>;
    const value = { ...p.data, country: old.country ?? "canada", ...(old.phone ? { phone: old.phone } : {}) } as Prisma.InputJsonValue;
    await this.db.$transaction(async (tx) => {
      await tx.platformFirm.updateMany({ where: { id: s.firmId }, data: { businessAddress: value } });
      await this.ports.audit.record(tx, { firmId: s.firmId, actor: `staff:${s.staffId}`, action: "platform.firm.address_changed", entity: "platform_firm", entityKey: s.firmId, summary: "The firm's business address was changed", detail: { province: p.data.province_state }, before: flatAddress(old), after: flatAddress(value as Record<string, unknown>) });
    });
    const sub = await this.current(s.firmId);
    const onStripe = sub.stripeCustomerId && !this.ports.notReady ? await this.ports.billing.updateCustomerAddress(sub.stripeCustomerId, toStripe(p.data, firm.countryCode)).then(() => true, () => false) : null;
    // A draft held for want of the address may finalize now, with its tax; its payment ends the hold (break M3).
    if (onStripe && sub.stripeSubscriptionId) {
      const inv = (await this.ports.billing.subscription(sub.stripeSubscriptionId).catch(() => null))?.latestInvoice;
      if (inv?.status === "draft" && !(await this.ports.billing.holdDraftInvoice(inv.id, true).then(() => true, () => false))) return { saved: true, onStripe, next: "Saved. Your held invoice could not be released yet: save the address again in a few minutes." };   // break r1
    }
    return { saved: true, onStripe, ...(onStripe === false ? { next: "Saved here. We could not update our billing provider yet: save it again in a few minutes." } : {}) };
  }

  async card(s: StaffContext) {
    const sub = await this.current(s.firmId);
    if (!sub.stripeCustomerId) throw problem(409, "NO_BILLING_ACCOUNT", "Start your trial first", "Your free trial has not started yet. Sign in again to finish starting it.");
    this.ready();
    return this.ports.billing.cardCheckout({ firmId: s.firmId, customerId: sub.stripeCustomerId, successUrl: `${this.ports.appUrl}/settings/billing?card=saved`, cancelUrl: `${this.ports.appUrl}/settings/billing` }).catch(() => { throw unavailable(); });
  }

  async portal(s: StaffContext) {
    const sub = await this.current(s.firmId);
    if (!sub.stripeCustomerId) throw problem(409, "NO_BILLING_ACCOUNT", "Start your trial first", "Your free trial has not started yet. Sign in again to finish starting it.");
    this.ready();
    return this.ports.billing.portal({ customerId: sub.stripeCustomerId, returnUrl: `${this.ports.appUrl}/settings/billing` }).catch(() => { throw unavailable(); });
  }
}
