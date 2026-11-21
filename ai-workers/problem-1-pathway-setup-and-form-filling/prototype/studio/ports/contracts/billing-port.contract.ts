// PF-5: BillingPort's contract (ports/billing.ts). Run by fakeBilling and by StripeBilling (on recorded Stripe answers in
// CI; on test-mode keys only on the Mac). What callers rely on: prices answer only the ids asked, a firm has one customer,
// and the trial's Checkout asks for no card and pauses at trial end (step 0 fact 1), once per firm and price.
import { defineContract, expect, expectRefused } from "./contract.ts";
import type { BillingPort } from "../billing.ts";

/** The adapter, plus what the contract may read back: the parameters its last Checkout session was created with; part 2:
 *  a signer of raw bodies (Stripe's header) and a subscription Stripe has, trialing with no card, ending at `trialEnd`. */
export type BillingHarness = { port: BillingPort; priceId: string; lastCheckoutParams(): Record<string, unknown> | null; sign(raw: string): string; subscriptionId: string; trialEnd: Date };
const event = (id: string, firm: string) => JSON.stringify({ id, object: "event", type: "checkout.session.completed", created: 1_763_000_000, data: { object: { object: "checkout.session", client_reference_id: firm, customer: "cus_c1", subscription: "sub_c1", setup_intent: null } } });
const FIRM = "0f5a0000-0000-4000-8000-000000000001";

export const billingPortContract = defineContract("BillingPort", (make: () => BillingHarness) => [
  {
    name: "prices answer only the ids asked, with amount, currency and interval",
    async run() {
      const h = make(), got = await h.port.prices([h.priceId, "price_unknown0"]);
      expect(got.length === 1 && got[0].id === h.priceId && Number.isInteger(got[0].unitAmount) && /^[a-z]{3}$/.test(got[0].currency) && ["month", "year"].includes(got[0].interval), "one price, shaped", got);
    },
  },
  {
    name: "a firm has one customer (the same firm twice gives the same id)",
    async run() {
      const h = make(), a = await h.port.ensureCustomer({ firmId: FIRM, email: "owner@firm.example.com", name: "Firm" });
      const b = await h.port.ensureCustomer({ firmId: FIRM, email: "owner@firm.example.com", name: "Firm" });
      expect(/^cus_/.test(a.customerId) && a.customerId === b.customerId, "one customer id", [a, b]);
    },
  },
  {
    name: "the trial's Checkout asks for no card and pauses at trial end, once per firm and price",
    async run() {
      const h = make(), { customerId } = await h.port.ensureCustomer({ firmId: FIRM, email: "owner@firm.example.com", name: "Firm" });
      const input = { firmId: FIRM, customerId, priceId: h.priceId, trialDays: 14, successUrl: "https://app.example.com/ok", cancelUrl: "https://app.example.com/no" };
      const a = await h.port.startTrialCheckout(input), b = await h.port.startTrialCheckout(input), p = h.lastCheckoutParams();
      expect(/^cs_/.test(a.sessionId) && a.sessionId === b.sessionId && /^https:\/\//.test(a.url), "one session with a url", [a, b]);
      expect(p?.payment_method_collection === "if_required" && p?.missing_payment_method === "pause" && p?.trial_period_days === 14 && p?.mode === "subscription", "no card, pause, 14 days", p);
    },
  },
  {
    name: "a signed event is read (firm, customer, subscription); unsigned or changed bytes are refused",
    async run() {
      const h = make(), raw = event("evt_c1", FIRM.toUpperCase()), e = h.port.readEvent(raw, h.sign(raw));
      expect(e.id === "evt_c1" && e.firmId === FIRM && e.customerId === "cus_c1" && e.subscriptionId === "sub_c1" && e.setupIntentId === null, "the event's facts", e);
      await expectRefused(async () => h.port.readEvent(raw, undefined), "no signature");
      await expectRefused(async () => h.port.readEvent(raw.replace("cus_c1", "cus_c2"), h.sign(raw)), "changed bytes");
    },
  },
  {
    name: "the subscription as Stripe has it: trialing, no card, the trial's end",
    async run() {
      const h = make(), s = await h.port.subscription(h.subscriptionId);
      expect(s.id === h.subscriptionId && s.status === "trialing" && !s.hasCard && s.trialEnd?.getTime() === h.trialEnd.getTime(), "trialing, no card, its end", s);
    },
  },
  {
    name: "a malformed input is refused before any call",
    async run() {
      const h = make();
      await expectRefused(() => h.port.ensureCustomer({ firmId: "not-a-firm", email: "x@y.example.com", name: "X" }), "a bad firm id");
      await expectRefused(() => h.port.startTrialCheckout({ firmId: FIRM, customerId: "cus_x", priceId: "nope", trialDays: 14, successUrl: "https://a.example.com", cancelUrl: "https://a.example.com" }), "a bad price id");
    },
  },
]);
