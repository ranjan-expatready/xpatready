// PF-5: BillingPort's real adapter, Stripe Billing through Stripe's own library (tech gate entry 1; PF-L's exact version).
// Test-mode keys only (PLATFORM_STRIPE_SECRET_KEY; config refuses a live key outside production), never in a lane: CI runs
// this adapter on recorded Stripe answers through the library's fetch client (tests/check_pf5_signup_billing.ts). Each
// creating call carries an idempotency key, so a retried request never makes a second customer or session.
import Stripe from "stripe";
// Part 2: events are read with the library's own signature check (constructEvent: HMAC SHA-256 over `t.payload`, 300
// seconds' tolerance, Webhooks.js DEFAULT_TOLERANCE); the portal's one configuration is found by its metadata or made once.
import { FirmId } from "../../../../ports/audit.ts";
import { BillingAddress, BillingInvoice, BillingPrice, BillingSignatureError, BillingSubscription, CardCheckoutInput, CustomerId, CustomerInput, InvoiceId, PORTAL_FEATURES, PortalInput, PriceId, SetupIntentId, SubscriptionId, TrialCheckoutInput, eventFacts, type BillingPort } from "../../../../ports/billing.ts";

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id ?? null);
const at = (s: number | null | undefined) => (typeof s === "number" ? new Date(s * 1000) : null);
const PORTAL_TAG = "pf5-portal-v1";

export class StripeBilling implements BillingPort {
  private portalConfig: string | null = null;
  constructor(private readonly stripe: Stripe, private readonly webhookSecret: string | null = null) {}

  /** From a secret key; `fetchFn` replaces the network (recorded answers in CI). */
  static fromKey(secretKey: string, fetchFn?: typeof fetch, webhookSecret: string | null = null): StripeBilling {
    return new StripeBilling(new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 10_000, ...(fetchFn ? { httpClient: Stripe.createFetchHttpClient(fetchFn) } : {}) }), webhookSecret);
  }

  readEvent(rawBody: string, signature: string | undefined) {
    if (!this.webhookSecret) throw new Error("PLATFORM_STRIPE_WEBHOOK_SECRET is not set");
    let e: Stripe.Event;
    try { e = this.stripe.webhooks.constructEvent(rawBody, signature ?? "", this.webhookSecret); } catch { throw new BillingSignatureError(); }
    return eventFacts(e);
  }

  async event(id: string) { return eventFacts(await this.stripe.events.retrieve(id)); }

  async subscription(id: string) {
    const s = await this.stripe.subscriptions.retrieve(SubscriptionId.parse(id), { expand: ["latest_invoice"] });
    const inv = s.latest_invoice && typeof s.latest_invoice === "object" ? s.latest_invoice : null;
    const ends = s.items.data.map((i) => i.current_period_end).filter((n) => typeof n === "number");
    return BillingSubscription.parse({
      id: s.id, customerId: idOf(s.customer), firmId: FirmId.safeParse(s.metadata?.firm_id?.toLowerCase()).data ?? null, status: s.status,
      trialEnd: at(s.trial_end), periodEnd: ends.length ? at(Math.max(...ends)) : null, cancelAtPeriodEnd: s.cancel_at_period_end, hasCard: !!s.default_payment_method,
      latestInvoice: inv?.id ? { id: inv.id, status: inv.status, taxNeedsAddress: inv.automatic_tax?.status === "requires_location_inputs" || inv.automatic_tax?.disabled_reason === "finalization_requires_location_inputs" } : null,
    });
  }

  async useCardAndResume(subscriptionId: string, setupIntentId: string) {
    const sub = SubscriptionId.parse(subscriptionId), si = await this.stripe.setupIntents.retrieve(SetupIntentId.parse(setupIntentId));
    const pm = idOf(si.payment_method);
    if (si.status !== "succeeded" || !pm) throw new Error("the card Checkout saved no card");
    const s = await this.stripe.subscriptions.update(sub, { default_payment_method: pm }, { idempotencyKey: `pf5-card-${sub}-${si.id}` });
    // Step 0 fact 2: adding a card does not resume by itself. Resume with a new period from now, active only once the
    // resumption invoice is paid (payment_behavior resume_on_payment_success; our hold ends on a paid invoice anyway).
    if (s.status === "paused") await this.stripe.subscriptions.resume(sub, { billing_cycle_anchor: { type: "now" }, payment_behavior: "resume_on_payment_success" }, { idempotencyKey: `pf5-resume-${sub}-${si.id}` });
  }

  async holdDraftInvoice(invoiceId: string, release = false) { await this.stripe.invoices.update(InvoiceId.parse(invoiceId), { auto_advance: release }); }

  async invoices(customerId: string) {
    const list = await this.stripe.invoices.list({ customer: CustomerId.parse(customerId), limit: 24 });
    return list.data.filter((i) => i.id).map((i) => BillingInvoice.parse({ id: i.id, number: i.number ?? null, status: i.status, amountDueCents: i.amount_due, currency: i.currency, createdAt: at(i.created), hostedUrl: i.hosted_invoice_url ?? null }));
  }

  async updateCustomerAddress(customerId: string, address: BillingAddress) {
    const a = BillingAddress.parse(address);
    await this.stripe.customers.update(CustomerId.parse(customerId), { address: { line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.province, postal_code: a.postalCode, country: a.country } });
  }

  async cardCheckout(input: CardCheckoutInput) {
    const c = CardCheckoutInput.parse(input), firmId = c.firmId.toLowerCase();
    const s = await this.stripe.checkout.sessions.create({ mode: "setup", customer: c.customerId, currency: "cad", allowed_payment_method_types: ["card"], client_reference_id: firmId, metadata: { firm_id: firmId }, success_url: c.successUrl, cancel_url: c.cancelUrl });
    if (!s.url) throw new Error("Stripe answered a Checkout session without a url");
    return { url: s.url };
  }

  async portal(input: PortalInput) {
    const p = PortalInput.parse(input);
    if (!this.portalConfig) {
      const found = (await this.stripe.billingPortal.configurations.list({ active: true, limit: 100 })).data.find((c) => c.metadata?.pf5 === PORTAL_TAG);
      this.portalConfig = found?.id ?? (await this.stripe.billingPortal.configurations.create({ features: PORTAL_FEATURES as unknown as Stripe.BillingPortal.ConfigurationCreateParams.Features, metadata: { pf5: PORTAL_TAG } }, { idempotencyKey: PORTAL_TAG })).id;
    }
    return { url: (await this.stripe.billingPortal.sessions.create({ customer: p.customerId, return_url: p.returnUrl, configuration: this.portalConfig })).url };
  }

  async prices(ids: string[]) {
    const out: BillingPrice[] = [];
    for (const id of new Set(ids.filter((i) => PriceId.safeParse(i).success))) {
      try {
        const p = await this.stripe.prices.retrieve(id);
        const interval = p.recurring?.interval;
        if (p.unit_amount === null || (interval !== "month" && interval !== "year")) continue;
        out.push(BillingPrice.parse({ id: p.id, unitAmount: p.unit_amount, currency: p.currency, interval, active: p.active }));
      } catch (e) { if ((e as { code?: string }).code !== "resource_missing") throw e; }
    }
    return out;
  }

  async ensureCustomer(input: CustomerInput) {
    const c = CustomerInput.parse(input), firmId = c.firmId.toLowerCase();
    const a = c.address;
    const created = await this.stripe.customers.create({
      email: c.email, name: c.name, metadata: { firm_id: firmId },
      ...(a ? { address: { line1: a.line1, line2: a.line2, city: a.city, state: a.province, postal_code: a.postalCode, country: a.country } } : {}),
    }, { idempotencyKey: `pf5-customer-${firmId}` });
    return { customerId: created.id };
  }

  async startTrialCheckout(input: TrialCheckoutInput) {
    const c = TrialCheckoutInput.parse(input), firmId = c.firmId.toLowerCase();
    // Step 0 facts 1 and 3 (step0.md): no card unless required, pause at trial end with no card; the address is asked here
    // and saved on the customer, so Stripe Tax can tax the first invoice (Lead B's ruling on fact 3).
    const s = await this.stripe.checkout.sessions.create({
      mode: "subscription", customer: c.customerId, client_reference_id: firmId, line_items: [{ price: c.priceId, quantity: 1 }],
      payment_method_collection: "if_required", billing_address_collection: "required", customer_update: { address: "auto", name: "auto" },
      automatic_tax: { enabled: true },
      subscription_data: { trial_period_days: c.trialDays, trial_settings: { end_behavior: { missing_payment_method: "pause" } }, metadata: { firm_id: firmId } },
      metadata: { firm_id: firmId }, success_url: c.successUrl, cancel_url: c.cancelUrl,
    }, { idempotencyKey: `pf5-trial-${firmId}-${c.priceId}` });
    if (!s.url) throw new Error("Stripe answered a Checkout session without a url");
    return { sessionId: s.id, url: s.url };
  }
}
