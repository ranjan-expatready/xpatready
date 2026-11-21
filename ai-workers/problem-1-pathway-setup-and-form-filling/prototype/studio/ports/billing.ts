// PF-5 (contracts §0.3, §7 §1.1): the billing port, our one door to Stripe Billing for firms' subscriptions to us. Two
// adapters: the fake here (in-process, deterministic, every CI check) and the Stripe adapter
// (api/src/platform/billing/stripe.ts, test-mode keys only, never in a lane). Part 1: the plans' prices, the firm's
// customer and the no-card trial's Checkout. Part 2: Stripe's signed events, the subscription as Stripe has it now, the
// card that resumes a paused (held) subscription, invoices, the address, and the Checkout and Customer Portal hand-offs.
// This folder imports only zod and its own files.
import { z } from "zod";
import { FirmId } from "./audit.ts";

export const PriceId = z.string().regex(/^price_[A-Za-z0-9]{1,200}$/, "a Stripe price id");
export const CustomerId = z.string().regex(/^cus_[A-Za-z0-9]{1,200}$/, "a Stripe customer id");

/** A price as the pricing page shows it: amount in cents, before tax ("+ applicable taxes"). */
export const BillingPrice = z.strictObject({
  id: PriceId, unitAmount: z.number().int().min(0), currency: z.string().regex(/^[a-z]{3}$/), interval: z.enum(["month", "year"]), active: z.boolean(),
});
export type BillingPrice = z.infer<typeof BillingPrice>;

/** The business address (samples/firms.json's office shape, the fields Stripe Tax reads). */
export const BillingAddress = z.strictObject({
  line1: z.string().min(1).max(200), line2: z.string().max(200).optional(), city: z.string().min(1).max(100),
  province: z.string().min(1).max(100), postalCode: z.string().min(1).max(20), country: z.string().regex(/^[A-Z]{2}$/),
});
export type BillingAddress = z.infer<typeof BillingAddress>;

export const CustomerInput = z.strictObject({ firmId: FirmId, email: z.email(), name: z.string().min(1).max(200), address: BillingAddress.optional() });
export type CustomerInput = z.infer<typeof CustomerInput>;

/** The no-card trial (A46 row 90; step 0 fact 1): Checkout in subscription mode, card collected only if required, the
 *  trial's days, and at trial end with no card the subscription pauses. */
export const TrialCheckoutInput = z.strictObject({
  firmId: FirmId, customerId: CustomerId, priceId: PriceId, trialDays: z.number().int().min(1).max(90),
  successUrl: z.url(), cancelUrl: z.url(),
});
export type TrialCheckoutInput = z.infer<typeof TrialCheckoutInput>;
export const TrialCheckout = z.strictObject({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_]{1,300}$/), url: z.url() });
export type TrialCheckout = z.infer<typeof TrialCheckout>;

export const SubscriptionId = z.string().regex(/^sub_[A-Za-z0-9]{1,200}$/, "a Stripe subscription id");
export const InvoiceId = z.string().regex(/^in_[A-Za-z0-9]{1,200}$/, "a Stripe invoice id");
export const SetupIntentId = z.string().regex(/^seti_[A-Za-z0-9]{1,200}$/, "a Stripe setup intent id");
/** Stripe's subscription statuses (library 23.1.0, Subscription.Status). */
export const STRIPE_STATUSES = ["trialing", "active", "past_due", "unpaid", "paused", "canceled", "incomplete", "incomplete_expired"] as const;

/** The subscription as Stripe has it now (read after an event, so events that arrive out of order converge). */
export const BillingSubscription = z.strictObject({
  id: SubscriptionId, customerId: CustomerId, firmId: FirmId.nullable(), status: z.enum(STRIPE_STATUSES),
  trialEnd: z.date().nullable(), periodEnd: z.date().nullable(), cancelAtPeriodEnd: z.boolean(), hasCard: z.boolean(),
  /** The newest invoice; `taxNeedsAddress` is Stripe Tax's `requires_location_inputs` (Lead B, step 0 fact 3). */
  latestInvoice: z.strictObject({ id: InvoiceId, status: z.enum(["draft", "open", "paid", "uncollectible", "void"]), taxNeedsAddress: z.boolean() }).nullable(),
});
export type BillingSubscription = z.infer<typeof BillingSubscription>;

/** A verified Stripe event, cut to what tells us which firm and subscription changed (never card data). */
export const BillingEvent = z.strictObject({
  id: z.string().regex(/^evt_[A-Za-z0-9_]{1,200}$/), type: z.string().min(1).max(100), created: z.date(),
  firmId: FirmId.nullable(), customerId: CustomerId.nullable(), subscriptionId: SubscriptionId.nullable(), setupIntentId: SetupIntentId.nullable(),
});
export type BillingEvent = z.infer<typeof BillingEvent>;

export const BillingInvoice = z.strictObject({
  id: InvoiceId, number: z.string().nullable(), status: z.enum(["draft", "open", "paid", "uncollectible", "void"]),
  amountDueCents: z.number().int().min(0), currency: z.string().regex(/^[a-z]{3}$/), createdAt: z.date(), hostedUrl: z.url().nullable(),
});
export type BillingInvoice = z.infer<typeof BillingInvoice>;

export const CardCheckoutInput = z.strictObject({ firmId: FirmId, customerId: CustomerId, successUrl: z.url(), cancelUrl: z.url() });
export type CardCheckoutInput = z.infer<typeof CardCheckoutInput>;
export const PortalInput = z.strictObject({ customerId: CustomerId, returnUrl: z.url() });
export type PortalInput = z.infer<typeof PortalInput>;

/** The facts of a Stripe event object (`{ id, type, created, data: { object } }`), shared by both adapters: which firm,
 *  customer, subscription or saved card it is about. A field Stripe expanded to an object gives its id; anything that is
 *  not a well-formed id is null (never trusted further). */
export function eventFacts(e: unknown): BillingEvent {
  const ev = z.object({ id: z.string(), type: z.string(), created: z.number(), data: z.object({ object: z.record(z.string(), z.unknown()) }) }).parse(e), o = ev.data.object;
  const idOf = (v: unknown) => (typeof v === "string" ? v : v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : null);
  const get = (v: unknown, ...path: string[]) => path.reduce<unknown>((x, k) => (x && typeof x === "object" ? (x as Record<string, unknown>)[k] : undefined), v);
  const safe = <T>(schema: z.ZodType<T>, v: unknown) => { const r = schema.safeParse(v); return r.success ? r.data : null; };
  const kind = o.object;
  const sub = kind === "subscription" ? o.id : kind === "invoice" ? idOf(get(o, "parent", "subscription_details", "subscription")) : idOf(o.subscription);
  const firm = kind === "checkout.session" ? o.client_reference_id ?? get(o, "metadata", "firm_id") : kind === "invoice" ? get(o, "parent", "subscription_details", "metadata", "firm_id") : get(o, "metadata", "firm_id");
  return BillingEvent.parse({
    id: ev.id, type: ev.type, created: new Date(ev.created * 1000), firmId: safe(FirmId, typeof firm === "string" ? firm.toLowerCase() : firm),
    customerId: safe(CustomerId, kind === "customer" ? o.id : idOf(o.customer)), subscriptionId: safe(SubscriptionId, sub), setupIntentId: safe(SetupIntentId, kind === "checkout.session" ? idOf(o.setup_intent) : null),
  });
}

/** A webhook whose signature is missing, wrong or too old (Stripe's tolerance, 300 seconds). */
export class BillingSignatureError extends Error { constructor() { super("the Stripe signature does not match"); this.name = "BillingSignatureError"; } }

export interface BillingPort {
  /** The prices named (unknown ids are left out). */
  prices(ids: string[]): Promise<BillingPrice[]>;
  /** The firm's one Stripe customer: the same firm always gets the same customer (idempotent by firm id). */
  ensureCustomer(input: CustomerInput): Promise<{ customerId: string }>;
  /** A Checkout session that starts the trial with no card; the same firm and price give the same session. */
  startTrialCheckout(input: TrialCheckoutInput): Promise<TrialCheckout>;
  /** The event in a webhook's raw body, after its signature is checked (BillingSignatureError otherwise). No network. */
  readEvent(rawBody: string, signature: string | undefined): BillingEvent;
  /** An event read again by id (a stored receipt whose handling did not finish). */
  event(id: string): Promise<BillingEvent>;
  subscription(id: string): Promise<BillingSubscription>;
  /** The card saved by a card Checkout becomes the subscription's; a paused subscription is resumed (a new period from
   *  now; Stripe finalizes the resumption invoice, step 0 fact 2). */
  useCardAndResume(subscriptionId: string, setupIntentId: string): Promise<void>;
  /** A draft invoice is kept from finalizing (auto_advance off): never an invoice without its tax. `release` lets it
   *  finalize again once the address is on the customer (break M3). */
  holdDraftInvoice(invoiceId: string, release?: boolean): Promise<void>;
  invoices(customerId: string): Promise<BillingInvoice[]>;
  updateCustomerAddress(customerId: string, address: BillingAddress): Promise<void>;
  /** A Checkout that saves a card (setup mode); its completion is a `checkout.session.completed` event. */
  cardCheckout(input: CardCheckoutInput): Promise<{ url: string }>;
  /** The Customer Portal: card, invoices and cancel at period end on; plan switching off (rows rev 13, PF-16's). */
  portal(input: PortalInput): Promise<{ url: string }>;
}

/** The portal's set-up (BillingPortal.Configuration features): what the Stripe adapter creates once. */
export const PORTAL_FEATURES = {
  subscription_update: { enabled: false }, payment_method_update: { enabled: true }, invoice_history: { enabled: true },
  subscription_cancel: { enabled: true, mode: "at_period_end" }, customer_update: { enabled: false },
} as const;

/** What the fake keeps of one Checkout session: the parameters Stripe would receive. */
export type FakeCheckout = TrialCheckout & { input: TrialCheckoutInput; paymentMethodCollection: "if_required"; missingPaymentMethod: "pause" };

export type FakeBilling = BillingPort & {
  readonly customers: ReadonlyArray<CustomerInput & { customerId: string }>;
  readonly checkouts: ReadonlyArray<FakeCheckout>;
  /** Stripe's side, set by the test: subscriptions, events (by id) and invoices (by customer). */
  readonly subs: Map<string, BillingSubscription>;
  readonly events: Map<string, BillingEvent>;
  readonly invoiceList: Map<string, BillingInvoice[]>;
  readonly resumed: string[]; readonly heldDrafts: string[]; readonly portals: string[];
  /** The fake's signature of a raw body (Stripe's header shape `t=…,v1=…`; a plain hash, not Stripe's HMAC). */
  sign(rawBody: string, at?: Date): string;
  /** How many calls reached the fake (each idempotent repeat counted). */
  readonly calls: number;
};

/** The fake: validates like the real adapter, keeps its customers and sessions in memory, and fails when `failOn` names
 *  the call. Ids are counters (`cus_fake000001`), so a run is deterministic. */
type Call = Exclude<keyof BillingPort, "readEvent">;
export function fakeBilling(opts: { prices?: BillingPrice[]; failOn?: (call: Call) => boolean; now?: () => Date } = {}): FakeBilling {
  const prices = (opts.prices ?? []).map((p) => BillingPrice.parse(p));
  const customers: (CustomerInput & { customerId: string })[] = [];
  const checkouts: FakeCheckout[] = [];
  let calls = 0;
  const subs = new Map<string, BillingSubscription>(), events = new Map<string, BillingEvent>(), invoiceList = new Map<string, BillingInvoice[]>();
  const resumed: string[] = [], heldDrafts: string[] = [], portals: string[] = [];
  const now = opts.now ?? (() => new Date());
  const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0; return h.toString(16); };
  const sign = (raw: string, at = now()) => { const t = Math.floor(at.getTime() / 1000); return `t=${t},v1=${hash(`fake-whsec.${t}.${raw}`)}`; };
  const sub = (id: string) => { const s = subs.get(SubscriptionId.parse(id)); if (!s) throw new Error(`no such subscription: ${id}`); return s; };
  const gate = (call: Call) => { calls++; if (opts.failOn?.(call)) throw new Error(`forced billing failure: ${call}`); };
  const id = (prefix: string, n: number) => `${prefix}_fake${String(n).padStart(6, "0")}`;
  return {
    async prices(ids) { gate("prices"); const want = new Set(z.array(z.string()).parse(ids)); return prices.filter((p) => want.has(p.id)).map((p) => ({ ...p })); },
    async ensureCustomer(input) {
      gate("ensureCustomer");
      const c = CustomerInput.parse(input), firmId = c.firmId.toLowerCase();
      const had = customers.find((x) => x.firmId === firmId);
      if (had) return { customerId: had.customerId };
      const customerId = id("cus", customers.length + 1);
      customers.push({ ...c, firmId, customerId });
      return { customerId };
    },
    async startTrialCheckout(input) {
      gate("startTrialCheckout");
      const c = TrialCheckoutInput.parse(input);
      if (!customers.some((x) => x.customerId === c.customerId)) throw new Error(`no such customer: ${c.customerId}`);
      if (!prices.some((p) => p.id === c.priceId && p.active)) throw new Error(`no such active price: ${c.priceId}`);
      const had = checkouts.find((x) => x.input.firmId.toLowerCase() === c.firmId.toLowerCase() && x.input.priceId === c.priceId);
      if (had) return { sessionId: had.sessionId, url: had.url };
      const sessionId = id("cs", checkouts.length + 1);
      checkouts.push({ sessionId, url: `https://checkout.stripe.com/c/pay/${sessionId}`, input: c, paymentMethodCollection: "if_required", missingPaymentMethod: "pause" });
      return { sessionId, url: `https://checkout.stripe.com/c/pay/${sessionId}` };
    },
    readEvent(raw, signature) {
      const m = /^t=(\d+),v1=([0-9a-f]+)$/.exec(signature ?? "");
      if (!m || hash(`fake-whsec.${m[1]}.${raw}`) !== m[2] || Math.abs(now().getTime() / 1000 - Number(m[1])) > 300) throw new BillingSignatureError();
      return eventFacts(JSON.parse(raw));
    },
    async event(id) { gate("event"); const e = events.get(id); if (!e) throw new Error(`no such event: ${id}`); return { ...e }; },
    async subscription(id) { gate("subscription"); return BillingSubscription.parse(sub(id)); },
    async useCardAndResume(id, seti) {
      gate("useCardAndResume"); SetupIntentId.parse(seti);
      // Like Stripe: a resumed subscription is active once its invoice is paid or marked uncollectible (step 0 fact 2).
      const s = sub(id), back = s.status === "paused" && (s.latestInvoice?.status === "paid" || s.latestInvoice?.status === "uncollectible");
      if (s.status === "paused") resumed.push(id);
      subs.set(id, { ...s, hasCard: true, ...(back ? { status: "active" as const } : {}) });
    },
    async holdDraftInvoice(id, release = false) { gate("holdDraftInvoice"); InvoiceId.parse(id); const i = heldDrafts.indexOf(id); if (!release) heldDrafts.push(id); else if (i >= 0) heldDrafts.splice(i, 1); },
    async invoices(customerId) { gate("invoices"); return (invoiceList.get(CustomerId.parse(customerId)) ?? []).map((i) => BillingInvoice.parse(i)); },
    async updateCustomerAddress(customerId, address) {
      gate("updateCustomerAddress"); const a = BillingAddress.parse(address), i = customers.findIndex((c) => c.customerId === CustomerId.parse(customerId));
      if (i < 0) throw new Error(`no such customer: ${customerId}`); customers[i] = { ...customers[i], address: a };
    },
    async cardCheckout(input) { gate("cardCheckout"); const c = CardCheckoutInput.parse(input); return { url: `https://checkout.stripe.com/c/pay/cs_setup_${c.customerId}` }; },
    async portal(input) { gate("portal"); const p = PortalInput.parse(input); portals.push(p.customerId); return { url: `https://billing.stripe.com/p/session/${p.customerId}` }; },
    sign, subs, events, invoiceList, resumed, heldDrafts, portals,
    get customers() { return customers.map((c) => ({ ...c })); },
    get checkouts() { return checkouts.map((c) => ({ ...c, input: { ...c.input } })); },
    get calls() { return calls; },
  };
}
