// PF-5 part 1 (contracts §7 §1.1; P-566; Lead B's rulings on #1815): sign-up to a no-card trial. The migration and its
// rules, BillingPort's contract (the fake and the Stripe adapter on recorded Stripe answers through the library's fetch
// client: no network), and the sign-up service, each "Done when" line of part 1 with a pass and a fail. One scratch
// database with every migration; the clock is a FakeClock; the identity side is the local stand-in; mail is fakeMail;
// audit is the real interim adapter (a wrapper forces its failure). No browser, no model call, no Stripe call (US$0).
// Part 2: Stripe's events (signed by the fake, or by Stripe's library on recorded answers), the moves, the hold and the
// billing routes, the last through a small Nest app of PF-4's guard and these routes (raw body, 402).
//   tsx studio/tests/check_pf5_signup_billing.ts
import "reflect-metadata";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";
import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, NestFactory } from "@nestjs/core";
import Stripe from "stripe";
import { eventFacts, fakeBilling, type BillingPrice, type BillingSubscription } from "../ports/billing.ts";
import { FakeClock } from "../ports/clock.ts";
import { runContract } from "../ports/contracts/contract.ts";
import { billingPortContract } from "../ports/contracts/billing-port.contract.ts";
import { EVENT } from "../ports/events.ts";
import { fakeJobs } from "../ports/jobs.ts";
import { fakeMail } from "../ports/mail.ts";
import { randomUUID } from "node:crypto";
import { asBypass } from "../api/src/platform/firm-scope.ts";
import { runtimeSignUpPorts } from "../api/src/platform/firms/runtime-ports.ts";
import { Runtime, RuntimeController } from "../api/src/runtime.ts";
import { auditEvent } from "../api/src/platform/audit/audit-event.ts";
import { StripeBilling } from "../api/src/platform/billing/stripe.ts";
import { PlatformSignUpController } from "../api/src/platform/firms/routes.ts";
import { LocalSignUp } from "../api/src/platform/firms/signup-identity.ts";
import { BillingEvents, ADDRESS_NEEDED } from "../api/src/platform/billing/webhook.ts";
import { BillingAccount } from "../api/src/platform/billing/account.ts";
import { BILLING_PORTS, BillingController, HOLD_WORDS, PaymentHoldGate, PlatformBillingAccount, PlatformBillingEvents, StripeHookController, stripeRawBody } from "../api/src/platform/billing/routes.ts";
import { ConfigReadGuard, Db } from "../api/src/core.ts";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";
import { PlatformClock } from "../api/src/platform/identity/port.ts";
import { LocalIdentity } from "../api/src/platform/identity/local.ts";
import { IDENTITY_PORT, PlatformIdentity } from "../api/src/platform/identity/service.ts";
import { PlatformGuard } from "../api/src/platform/identity/guard.ts";
import { PlatformIdentityController } from "../api/src/platform/identity/routes.ts";
import { PlatformTermsController } from "../api/src/platform/terms/routes.ts"; import { PlatformTerms } from "../api/src/platform/terms/service.ts"; import { TERMS_GATE } from "../api/src/platform/terms/gate.ts";
import { ACCEPTED, ALREADY, FirmSignUp, PURGE_JOB, TAX_NOTE, type SignUpPorts } from "../api/src/platform/firms/signup.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261115180000_pf5_signup_terms";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_pf5_${process.pid}`, URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
const WORK = join(STUDIO, "var", `pf5-check-${process.pid}`);
const PASSWORD = "correct horse battery staple 77";
const TRIAL_END = new Date(1_764_000_000_000), WHSEC = "whsec_recordedOnly0000";
const PRICES: BillingPrice[] = [{ id: "price_teamMonthly", unitAmount: 4900, currency: "cad", interval: "month", active: true }, { id: "price_teamYearly", unitAmount: 49000, currency: "cad", interval: "year", active: true }];

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const sql = (q: string) => execFileSync(join(BIN, "psql"), [URL, "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const refused = (q: string, re: RegExp) => { try { sql(q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const problemOf = async (f: () => Promise<unknown>) => { try { await f(); return null; } catch (e) { const x = e as { getStatus?: () => number; getResponse?: () => unknown }; return x.getStatus ? { status: x.getStatus(), body: x.getResponse?.() as Record<string, unknown> } : { status: 0, body: { error: String(e) } }; } };
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Recorded Stripe answers (the shapes Stripe's API returns, cut to the fields the adapter reads), served to the library's
 *  fetch client: idempotency keys give the same answer, as Stripe does within 24 hours. */
function recordedStripe() {
  const byKey = new Map<string, { status: number; body: unknown }>();
  let n = 0, lastCheckout: URLSearchParams | null = null, portalConfig: URLSearchParams | null = null;
  const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new globalThis.URL(String(input)), method = init?.method ?? "GET";
    const headers = new Headers(init?.headers), key = headers.get("idempotency-key");
    const answer = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "request-id": `req_rec${++n}` } });
    if (key && byKey.has(`${url.pathname}:${key}`)) { const a = byKey.get(`${url.pathname}:${key}`)!; return answer(a.status, a.body); }
    const form = new URLSearchParams(typeof init?.body === "string" ? init.body : "");
    let out: { status: number; body: unknown };
    const price = method === "GET" && /^\/v1\/prices\/(.+)$/.exec(url.pathname);
    if (price) {
      const p = PRICES.find((x) => x.id === price[1]);
      out = p ? { status: 200, body: { id: p.id, object: "price", active: p.active, currency: p.currency, unit_amount: p.unitAmount, recurring: { interval: p.interval } } }
        : { status: 404, body: { error: { type: "invalid_request_error", code: "resource_missing", message: `No such price: '${price[1]}'` } } };
    } else if (method === "POST" && url.pathname === "/v1/customers") out = { status: 200, body: { id: `cus_rec${String(++n).padStart(6, "0")}`, object: "customer", email: form.get("email") } };
    else if (method === "POST" && url.pathname === "/v1/checkout/sessions") {
      lastCheckout = form;
      const id = `cs_test_rec${String(++n).padStart(6, "0")}`;
      out = { status: 200, body: { id, object: "checkout.session", mode: form.get("mode"), url: `https://checkout.stripe.com/c/pay/${id}` } };
    } else if (method === "GET" && url.pathname === "/v1/subscriptions/sub_c1") out = { status: 200, body: { id: "sub_c1", object: "subscription", customer: "cus_c1", status: "trialing", trial_end: TRIAL_END.getTime() / 1000, cancel_at_period_end: false, default_payment_method: null, metadata: {}, latest_invoice: null, items: { data: [{ current_period_end: TRIAL_END.getTime() / 1000 }] } } };
    else if (method === "GET" && url.pathname === "/v1/subscriptions/sub_c2") out = { status: 200, body: { id: "sub_c2", object: "subscription", customer: "cus_c1", status: "active", trial_end: null, cancel_at_period_end: false, default_payment_method: "pm_1", metadata: {}, items: { data: [] }, latest_invoice: { id: "in_c2", object: "invoice", status: "open", automatic_tax: { enabled: false, status: null, disabled_reason: "finalization_requires_location_inputs" } } } };
    else if (method === "GET" && url.pathname === "/v1/billing_portal/configurations") out = { status: 200, body: { object: "list", data: [], has_more: false } };
    else if (method === "POST" && url.pathname === "/v1/billing_portal/configurations") { portalConfig = form; out = { status: 200, body: { id: "bpc_rec1", object: "billing_portal.configuration" } }; }
    else if (method === "POST" && url.pathname === "/v1/billing_portal/sessions") out = { status: 200, body: { id: "bps_rec1", object: "billing_portal.session", url: "https://billing.stripe.com/p/session/rec1", configuration: form.get("configuration") } };
    else out = { status: 404, body: { error: { type: "invalid_request_error", message: `unrecorded ${method} ${url.pathname}` } } };
    if (key) byKey.set(`${url.pathname}:${key}`, out);
    return answer(out.status, out.body);
  }) as typeof fetch;
  return {
    port: StripeBilling.fromKey("sk_test_recordedOnly000000", fetchFn, WHSEC), priceId: PRICES[0].id, subscriptionId: "sub_c1", trialEnd: TRIAL_END,
    sign: (payload: string) => Stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC }), portalConfig: () => portalConfig,
    lastCheckoutParams: () => lastCheckout && { mode: lastCheckout.get("mode"), payment_method_collection: lastCheckout.get("payment_method_collection"),
      missing_payment_method: lastCheckout.get("subscription_data[trial_settings][end_behavior][missing_payment_method]"), trial_period_days: Number(lastCheckout.get("subscription_data[trial_period_days]")),
      automatic_tax: lastCheckout.get("automatic_tax[enabled]"), customer_update_address: lastCheckout.get("customer_update[address]") },
  };
}

function pf5Diff(): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, "prisma.config.ts");
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(URL)} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--script"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return r.stdout.split("\n").filter((l) => /terms|signup_pending|PlatformBillingPeriod/i.test(l));
}

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", DB]); execFileSync(join(BIN, "createdb"), [...PG, DB]);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL, options: "-c TimeZone=UTC" }) });
try {
  // --------------------------------------------------------------------------------------------- the migration (P-600)
  ok(`PF-5 the migration's stamp is later than every migration before it and its own (rows rev 16.7; newest before it: ${all.filter((d) => d < NEW).at(-1)})`,
    all.includes(NEW) && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1 && (all.filter((d) => d < NEW).at(-1) ?? "") < NEW);
  for (const d of all.filter((x) => x < NEW)) execFileSync(join(BIN, "psql"), [URL, "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
  ok("PF-5 fail: before PF-5's migration the schema differs on its tables", pf5Diff().length > 0);
  execFileSync(join(BIN, "psql"), [URL, "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, NEW, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
  ok("PF-5 pass: right after its own migration, migrate diff names none of its tables (measured before any later one)", pf5Diff().length === 0, pf5Diff());
  for (const d of all.filter((x) => x > NEW)) execFileSync(join(BIN, "psql"), [URL, "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
  ok("PF-5 pass: three Sample terms versions, one of each kind", sql(`select string_agg(kind::text, ',' order by kind) from platform_terms_version`) === "TERMS_OF_SERVICE,PRIVACY_NOTICE,DATA_PROCESSING");
  ok("PF-5 fail: a terms version is never changed or removed", refused(`update platform_terms_version set url = '/x'`, /insert_only/) && refused(`delete from platform_terms_version`, /insert_only/));
  const tv = sql(`select id from platform_terms_version limit 1`);
  const pend = (email: string, hash: string, ago = "0 hours", life = "24 hours") => `insert into platform_signup_pending (id, email, firm_name, country_code, plan_code, identity_subject, terms_version_ids, terms_accepted_at, token_hash, created_at, expires_at) values (gen_random_uuid(), '${email}', 'F', 'CA', 'team', 's', array['${tv}']::uuid[], now(), '${hash}', now() - interval '${ago}', now() - interval '${ago}' + interval '${life}') returning id`;
  const live = sql(pend("rule@firm.example.com", "h1"));
  ok("PF-5 fail: one live pending sign-up per email (a second is refused)", refused(pend("rule@firm.example.com", "h2"), /one_live/));
  ok("PF-5 fail: a pending sign-up changes only its used_at, once; a live one is never removed",
    refused(`update platform_signup_pending set firm_name = 'G' where id = '${live}'`, /changes only once/) && refused(`delete from platform_signup_pending where id = '${live}'`, /only after it expires/)
    && sql(`update platform_signup_pending set used_at = now(), outcome = 'VERIFIED' where id = '${live}' returning 1`) === "1" && refused(`update platform_signup_pending set used_at = now(), outcome = 'REPLACED' where id = '${live}'`, /changes only once/));
  ok("PF-5 fail: a pending sign-up lives at most 24 hours, names existing terms and keeps the email in lower case",
    refused(pend("long@firm.example.com", "h3", "0 hours", "25 hours"), /life/) && refused(pend("Upper@firm.example.com", "h4"), /email_lower/)
    && refused(`insert into platform_signup_pending (email, id, firm_name, country_code, plan_code, identity_subject, terms_version_ids, terms_accepted_at, token_hash, expires_at) values ('t@f.example.com', gen_random_uuid(), 'F', 'CA', 'team', 's', array[gen_random_uuid()], now(), 'h5', now() + interval '1 hour')`, /do not exist/));
  ok("PF-5 pass: no password column anywhere in the pending sign-up", sql(`select count(*) from information_schema.columns where table_name = 'platform_signup_pending' and column_name ~ 'pass'`) === "0");
  sql(`update platform_plan set stripe_monthly_price_id = 'price_teamMonthly', stripe_yearly_price_id = 'price_teamYearly' where code = 'team'`);

  // ------------------------------------------------------------------------------------------------ BillingPort contract
  await runContract(billingPortContract, "fakeBilling", () => { const f = fakeBilling({ prices: PRICES }); f.subs.set("sub_c1", { id: "sub_c1", customerId: "cus_c1", firmId: null, status: "trialing", trialEnd: TRIAL_END, periodEnd: TRIAL_END, cancelAtPeriodEnd: false, hasCard: false, latestInvoice: null });
    return { port: f, priceId: PRICES[0].id, sign: (raw: string) => f.sign(raw), subscriptionId: "sub_c1", trialEnd: TRIAL_END, lastCheckoutParams: () => { const c = f.checkouts.at(-1); return c ? { mode: "subscription", payment_method_collection: c.paymentMethodCollection, missing_payment_method: c.missingPaymentMethod, trial_period_days: c.input.trialDays } : null; } }; }, ok);
  await runContract(billingPortContract, "StripeBilling", recordedStripe, ok);
  const rec = recordedStripe();
  const { customerId: cust } = await rec.port.ensureCustomer({ firmId: "0f5a0000-0000-4000-8000-000000000009", email: "a@b.example.com", name: "A" });
  await rec.port.startTrialCheckout({ firmId: "0f5a0000-0000-4000-8000-000000000009", customerId: cust, priceId: PRICES[0].id, trialDays: 14, successUrl: "https://a.example.com/ok", cancelUrl: "https://a.example.com/no" });
  ok("PF-5 (Lead B, fact 3): the trial's Checkout turns Stripe Tax on and saves the address to the customer", rec.lastCheckoutParams()?.automatic_tax === "true" && rec.lastCheckoutParams()?.customer_update_address === "auto", rec.lastCheckoutParams());
  const portal = await rec.port.portal({ customerId: "cus_c1", returnUrl: "https://a.example.com/billing" }), pc = rec.portalConfig();
  ok("PF-5 part 2 fail (Devin on #1959): tax switched off for want of the address (disabled_reason) also reads as \"address needed\"", (await rec.port.subscription("sub_c2")).latestInvoice?.taxNeedsAddress === true);
  ok("PF-5 part 2 pass/fail (rows rev 13): the Customer Portal has plan switching off, card, invoices and cancel at period end on",
    !!portal.url && pc?.get("features[subscription_update][enabled]") === "false" && pc.get("features[payment_method_update][enabled]") === "true" && pc.get("features[invoice_history][enabled]") === "true" && pc.get("features[subscription_cancel][mode]") === "at_period_end", pc && Object.fromEntries(pc));

  // ------------------------------------------------------------------------------------------------------ the service
  const clock = new FakeClock(new Date());
  const mail = fakeMail({ clock, failOn: () => failMail });
  let failAudit: string | null = null, failBilling = false;
  const billing = fakeBilling({ prices: PRICES, failOn: () => failBilling });
  const identity = new LocalSignUp(() => clock.now());
  let failMail = false;
  const ports: SignUpPorts = { audit: { record: async (tx, e) => { if (failAudit && e.action === failAudit) throw new Error("forced audit failure"); await auditEvent.record(tx, e); } }, billing, identity, mail, clock, appUrl: "https://app.expatready.test" };
  const s = new FirmSignUp(db, ports);
  /** A sign-up and the work it starts after its answer (break M1). */
  const up = async (body: unknown, ip: string) => { const r = await s.signUp(body, ip); await s.settled(); return r; };
  const plans = await s.plans();
  const team = plans.plans.find((p) => p.code === "team"), solo = plans.plans.find((p) => p.code === "solo");
  ok("PF-5 pass: GET plans reads Stripe's prices through BillingPort, marked \"+ applicable taxes\", with the current terms",
    team?.monthly?.amountCents === 4900 && team.yearly?.interval === "year" && plans.taxNote === TAX_NOTE && plans.terms.length === 3 && plans.defaultPlan === "team", plans);
  ok("PF-5 fail: a plan with no Stripe price shows no price (never an invented one)", solo?.monthly === null && solo?.yearly === null);
  const terms = plans.terms.map((t) => t.id);
  const form = async (over: Record<string, unknown> = {}) => { const p = await s.plans(); await clock.advance({ seconds: 5 }); return { email: "owner@maple.example.com", password: PASSWORD, firmName: "Maple Immigration", countryCode: "CA", acceptedTerms: terms, formStamp: p.formStamp, ...over }; };
  const pendingCount = (email: string) => sql(`select count(*) from platform_signup_pending where email = '${email}'`);
  const verifyMails = (to: string) => identity.sent.filter((m) => m.to === to);

  const noTerms = await problemOf(async () => up(await form({ acceptedTerms: terms.slice(0, 2) }), "10.0.0.1"));
  ok("PF-5 fail: a sign-up without accepting every current terms version is refused at the field, nothing stored",
    noTerms?.status === 400 && JSON.stringify(noTerms.body.errors).includes("acceptedTerms") && pendingCount("owner@maple.example.com") === "0", noTerms);
  const bot = await up(await form({ email: "bot@maple.example.com", website: "http://spam.example.com" }), "10.0.0.2");
  const fastForm = await form({ email: "fast@maple.example.com" });
  const fast = await up({ ...fastForm, formStamp: (await s.plans()).formStamp }, "10.0.0.3");   // sent at once: too fast
  ok("PF-5 fail: the honeypot or a too-fast fill is answered like any other sign-up, nothing stored or sent",
    bot.message === ACCEPTED && fast.message === ACCEPTED && pendingCount("bot@maple.example.com") === "0" && pendingCount("fast@maple.example.com") === "0" && identity.sent.length === 0);
  const first = await up(await form(), "10.0.0.4");
  const firstLink = verifyMails("owner@maple.example.com")[0]?.text ?? "";
  const second = await up(await form({ firmName: "Another Name" }), "10.0.0.5");
  ok("PF-5 pass/fail (break M2): a second sign-up for the same email while a link is live → still one live pending sign-up, the newest (the first link ends, so nobody holds another person's address), each with its one email",
    first.message === ACCEPTED && second.message === ACCEPTED && sql(`select count(*) from platform_signup_pending where email = 'owner@maple.example.com' and used_at is null`) === "1"
    && sql(`select string_agg(coalesce(outcome, 'live') || ':' || firm_name, ',' order by created_at) from platform_signup_pending where email = 'owner@maple.example.com'`) === "REPLACED:Maple Immigration,live:Another Name"
    && verifyMails("owner@maple.example.com").length === 2 && /"Another Name"/.test(verifyMails("owner@maple.example.com")[1].text));
  const oldTry = await problemOf(() => s.verify({ token: /token=([A-Za-z0-9_-]{43})/.exec(firstLink)?.[1], code: /code=(\d{6})/.exec(firstLink)?.[1] }, "10.0.1.0"));
  ok("PF-5 fail: the replaced sign-up's link → 404", oldTry?.status === 404, oldTry);
  ok("PF-5 fail: the password is never stored (not in the pending row, an audit line or an email)",
    !sql(`select row_to_json(p)::text from platform_signup_pending p`).includes(PASSWORD) && !sql(`select coalesce(string_agg(row_to_json(a)::text, ''), '') from audit_event a`).includes(PASSWORD) && !identity.sent.some((m) => m.text.includes(PASSWORD)));
  ok("PF-5 fail: an unverified sign-up creates no firm", sql(`select count(*) from platform_firm where contact_email = 'owner@maple.example.com'`) === "0");

  const link = verifyMails("owner@maple.example.com")[1].text;
  const token = /token=([A-Za-z0-9_-]{43})/.exec(link)?.[1] ?? "", code = /code=(\d{6})/.exec(link)?.[1] ?? "";
  const wrong = await problemOf(() => s.verify({ token, code: code === "000000" ? "111111" : "000000" }, "10.0.1.1"));
  ok("PF-5 fail: a wrong code is refused and makes no firm", wrong?.status === 400 && sql(`select count(*) from platform_firm where contact_email = 'owner@maple.example.com'`) === "0", wrong);
  failAudit = "platform.terms.accepted";
  const rolled = await problemOf(() => s.verify({ token, code }, "10.0.1.2"));
  failAudit = null;
  ok("PF-5 fail: a forced audit failure rolls the whole sign-up back (no firm, no Owner, the link still unused)",
    rolled !== null && sql(`select count(*) from platform_firm where contact_email = 'owner@maple.example.com'`) === "0" && sql(`select count(*) from platform_staff where email = 'owner@maple.example.com'`) === "0"
    && sql(`select count(*) from platform_signup_pending where email = 'owner@maple.example.com' and used_at is null`) === "1", rolled);
  const [a, b] = await Promise.allSettled([s.verify({ token, code }, "10.0.1.3"), s.verify({ token, code }, "10.0.1.4")]);
  const made = a.status === "fulfilled" ? a.value : b.status === "fulfilled" ? b.value : null;
  const firmId = sql(`select id from platform_firm where contact_email = 'owner@maple.example.com'`);
  ok("PF-5 pass/fail: a double submit of the verification makes one firm (PROVISIONING) and one Owner; the other is the 404",
    !!made && [a, b].filter((x) => x.status === "fulfilled").length === 1 && made.status === "PROVISIONING" && sql(`select count(*) from platform_firm where contact_email = 'owner@maple.example.com'`) === "1"
    && sql(`select string_agg(g.role::text, ',') from platform_role_grant g join platform_staff p on p.id = g.staff_id where p.email = 'owner@maple.example.com'`) === "OWNER", [a, b].map((x) => x.status === "rejected" ? String(x.reason) : "ok"));
  ok("PF-5 pass: an acceptance row per current terms version records kind, version, time and who (the Owner)",
    sql(`select string_agg(v.kind::text || '@' || v.version, ',' order by v.kind) from platform_terms_acceptance t join platform_terms_version v on v.id = t.version_id join platform_staff p on p.id = t.staff_id and p.firm_id = t.firm_id where t.firm_id = '${firmId}' and p.email = 'owner@maple.example.com' and t.accepted_at is not null`)
      === "TERMS_OF_SERVICE@sample-2026-11-15,PRIVACY_NOTICE@sample-2026-11-15,DATA_PROCESSING@sample-2026-11-15");
  const co = billing.checkouts.at(-1);
  ok("PF-5 pass (A46's weak point, tested): the trial starts through Checkout with no card (if_required), pause at trial end, the plan's 14 days and price, on the firm's own customer",
    !!made?.checkoutUrl && co?.paymentMethodCollection === "if_required" && co.missingPaymentMethod === "pause" && co.input.trialDays === 14 && co.input.priceId === "price_teamMonthly" && co.input.firmId === firmId
    && sql(`select status::text || ':' || coalesce(stripe_customer_id, '-') from platform_subscription where firm_id = '${firmId}'`) === `TRIAL:${co.input.customerId}`, { made, co });
  ok("PF-5 pass: each change has its audit line in its transaction (PF-12b: the sign-up use's platform.bypass line too), and firm.created is in the outbox once (written last)",
    sql(`select string_agg(action, ',' order by action) from audit_event where detail->>'firmId' = '${firmId}'`) === "firm.created,platform.bypass,platform.staff.money_keys_granted,platform.staff.owner_created,platform.subscription.created,platform.subscription.customer_linked,platform.terms.accepted"
    && sql(`select count(*) from module_event where firm_id = '${firmId}' and type = '${EVENT.FIRM_CREATED}'`) === "1");
  const again = await problemOf(() => s.verify({ token, code }, "10.0.1.5"));
  ok("PF-5 fail: a verification link used twice → 404", again?.status === 404, again);
  const known = await up(await form(), "10.0.0.6");
  ok("PF-5 pass/fail: a sign-up for an email that already has an account → the same answer, an email saying \"You already have an account. Sign in.\", nothing stored",
    known.message === ACCEPTED && mail.inbox("owner@maple.example.com").some((m) => m.text.startsWith(ALREADY)) && pendingCount("owner@maple.example.com") === "2" && verifyMails("owner@maple.example.com").length === 2);
  { const a = mail.inbox("owner@maple.example.com").find((m) => m.text.startsWith(ALREADY)) as { platformAccount?: true; firmId?: string; text: string } | undefined;
    ok("PF-5v part 2 (review M1 of #2456): the \"already have an account\" email is our platform account email (no firm: never the firm's sender or its daily cap) and links to the firm sign-in card", a?.platformAccount === true && a.firmId === undefined && a.text.endsWith("/account"), a); }
  await up(await form(), "10.0.0.9");
  ok("PF-5 fail (break m3): at most 3 sign-up emails to one address an hour (the 4th sends nothing, same answer)", mail.inbox("owner@maple.example.com").length === 1);
  failMail = true;
  const mailDown = await problemOf(async () => up(await form({ email: "owner2@maple.example.com" }), "10.0.0.10"));
  failMail = false;
  ok("PF-5 fail (break m4): a mail failure never changes the answer (no 500 that tells a known email apart)", mailDown === null);

  sql(pend("late@firm.example.com", sha("L".repeat(43)), "25 hours"));
  const late = await problemOf(() => s.verify({ token: "L".repeat(43), code: "123456" }, "10.0.1.6"));
  const junk = await problemOf(() => s.verify({ token: "Z".repeat(43), code: "123456" }, "10.0.1.7"));
  ok("PF-5 fail: an expired or unknown verification link → the same 404", late?.status === 404 && junk?.status === 404 && JSON.stringify(late.body) === JSON.stringify(junk.body), [late, junk]);
  const purged = await s.purgeExpired();
  ok("PF-5 pass/fail (Lead B (3)): the sweep removes expired pending sign-ups (used or not) and keeps the live ones",
    purged >= 1 && pendingCount("late@firm.example.com") === "0" && sql(`select count(*) from platform_signup_pending where expires_at > now()`) !== "0", purged);
  const resign = await up(await form({ email: "again@firm.example.com" }), "10.0.0.7");
  ok("PF-5 pass: a new email signs up and gets its one verification email", resign.message === ACCEPTED && verifyMails("again@firm.example.com").length === 1 && pendingCount("again@firm.example.com") === "1");

  failBilling = true;
  const down = await s.plans();
  ok("PF-5 fail: Stripe unreachable → the plans still show, without prices, saying so", down.pricesAvailable === false && down.plans.length === 3 && down.plans.every((p) => p.monthly === null), down);
  await up(await form({ email: "nostripe@firm.example.com", firmName: "No Stripe Law" }), "10.0.0.8");
  const ns = verifyMails("nostripe@firm.example.com")[0].text;
  const nsOut = await s.verify({ token: /token=([A-Za-z0-9_-]{43})/.exec(ns)?.[1], code: /code=(\d{6})/.exec(ns)?.[1] }, "10.0.1.8");
  failBilling = false;
  ok("PF-5 fail: Stripe unreachable after the commit → the firm stays setting up (PROVISIONING), no checkout, a plain next step",
    nsOut.checkoutUrl === null && /Sign in/.test(String(nsOut.next)) && sql(`select status from platform_firm where key = '${nsOut.firmKey}'`) === "PROVISIONING", nsOut);

  let limited: Awaited<ReturnType<typeof problemOf>> = null;
  for (let i = 0; i < 11 && !limited; i++) limited = await problemOf(async () => up(await form({ email: `burst${i}@firm.example.com` }), "10.9.9.9"));
  const otherIp = await up(await form({ email: "calm@firm.example.com" }), "10.9.9.8");
  ok("PF-5 pass/fail: the door's per-IP limit answers 429 after 10 tries in 10 minutes; another address is not held", limited?.status === 429 && otherIp.message === ACCEPTED, limited);

  const p0 = await s.plans();
  await clock.advance({ hours: 2, seconds: 1 });
  const stale = await problemOf(async () => s.signUp({ ...(await form({ email: "stale@firm.example.com" })), formStamp: p0.formStamp }, "10.8.0.1"));
  const foreign = await problemOf(async () => s.signUp({ ...(await form({ email: "foreign@firm.example.com" })), formStamp: new FirmSignUp(db, ports).stamp(clock.now()) }, "10.8.0.2"));
  ok("PF-5 fail (break M3): a form older than 2 hours or stamped by another server asks for a reload (never a silent drop)", stale?.status === 400 && stale.body.code === "RELOAD" && foreign?.status === 400 && foreign.body.code === "RELOAD", [stale, foreign]);
  const spaces = await problemOf(async () => s.signUp(await form({ email: "sp@firm.example.com", password: " ".repeat(14) }), "10.8.0.3"));
  const missing = await problemOf(async () => s.signUp({ ...(await form()), firmName: undefined }, "10.8.0.4"));
  ok("PF-5 fail (break m1, m8): a password of spaces is refused, and each field error names its field", spaces?.status === 400 && JSON.stringify(spaces.body.errors).includes("password:") && JSON.stringify(missing?.body.errors).includes("firmName:"), [spaces, missing]);
  await up(await form({ email: "guess@firm.example.com" }), "10.8.0.5");
  const g = verifyMails("guess@firm.example.com")[0].text, gTok = /token=([A-Za-z0-9_-]{43})/.exec(g)?.[1], gCode = /code=(\d{6})/.exec(g)?.[1] ?? "";
  for (let i = 0; i < 5; i++) await problemOf(() => s.verify({ token: gTok, code: String((Number(gCode) + 1 + i) % 1_000_000).padStart(6, "0") }, "10.8.1.1"));
  const afterGuesses = await problemOf(() => s.verify({ token: gTok, code: gCode }, "10.8.1.1"));
  ok("PF-5 fail (break m5): 5 wrong codes end the link (the right code after them → 404)", afterGuesses?.status === 404, afterGuesses);
  await up(await form({ email: "gone@firm.example.com", planCode: "solo" }), "10.8.0.6");
  sql(`update platform_plan set active = false where code = 'solo'`);
  const gm = verifyMails("gone@firm.example.com")[0].text;
  const gone = await problemOf(() => s.verify({ token: /token=([A-Za-z0-9_-]{43})/.exec(gm)?.[1], code: /code=(\d{6})/.exec(gm)?.[1] }, "10.8.1.2"));
  sql(`update platform_plan set active = true where code = 'solo'`);
  ok("PF-5 fail (break m7): a plan switched off before the verification → 409, no firm", gone?.status === 409 && sql(`select count(*) from platform_firm where contact_email = 'gone@firm.example.com'`) === "0", gone);
  const lone = sql(pend("rules2@firm.example.com", "h9"));
  ok("PF-5 fail (break m6): no NULL terms, no date in the future, no TRUNCATE; the end time is the database's now",
    refused(`insert into platform_signup_pending (id, email, firm_name, country_code, plan_code, identity_subject, terms_version_ids, terms_accepted_at, token_hash, expires_at) values (gen_random_uuid(), 'n@f.example.com', 'F', 'CA', 'team', 's', null, now(), 'h6', now() + interval '1 hour')`, /terms/)
    && refused(`insert into platform_signup_pending (id, email, firm_name, country_code, plan_code, identity_subject, terms_version_ids, terms_accepted_at, token_hash, created_at, expires_at) values (gen_random_uuid(), 'fu@f.example.com', 'F', 'CA', 'team', 's', array['${tv}']::uuid[], now(), 'h7', now() + interval '100 years', now() + interval '100 years 1 hour')`, /dated now or earlier/)
    && refused(`truncate platform_signup_pending`, /insert_only/)
    && sql(`update platform_signup_pending set used_at = '2000-01-01', outcome = 'VERIFIED' where id = '${lone}' returning abs(extract(epoch from used_at - now())) < 60`) === "t");

  await Promise.all([1, 2, 3].map(async (i) => s.signUp(await form({ email: "race@firm.example.com", firmName: `Race ${i}` }), `10.7.0.${i}`)));
  await s.settled();
  ok("PF-5 fail: three sign-ups for one email at once → one live pending sign-up", sql(`select count(*) from platform_signup_pending where email = 'race@firm.example.com' and used_at is null`) === "1");
  const jobs = fakeJobs(clock), swept = new FirmSignUp(db, { ...ports, jobs });
  await swept.registerJobs();
  sql(pend("sweep@firm.example.com", "h10", "25 hours"));
  await clock.advance({ hours: 1 }); await jobs.runDue();
  ok(`PF-5 pass/fail (Lead B (3)): the hourly ${PURGE_JOB} job through JobPort removes an expired sign-up`, pendingCount("sweep@firm.example.com") === "0");
  const shut = new FirmSignUp(db, runtimeSignUpPorts({ environment: "test", stripe: { secretKey: null, webhookSecret: null } }, { identity: "cognito", environment: "test", cognito: { userPoolId: null, clientId: null, mfaRequired: true }, localSecret: null }, {}));
  const shutUp = await problemOf(async () => shut.signUp(await form({ email: "shut@firm.example.com" }), "10.6.0.1"));
  const localPorts = runtimeSignUpPorts({ environment: "local", stripe: { secretKey: null, webhookSecret: null } }, { identity: "local", environment: "local", cognito: { userPoolId: null, clientId: null, mfaRequired: true }, localSecret: null }, {});
  ok("PF-5 fail (review Major 1): a server without the identity provider's sign-up or Stripe answers 503, never a \"check your email\" that sends nothing; local runs the stand-ins",
    shutUp?.status === 503 && shutUp.body.code === "SIGNUP_NOT_SET_UP" && pendingCount("shut@firm.example.com") === "0" && localPorts.notReady === null, shutUp);

  const routes = Object.getOwnPropertyNames(PlatformSignUpController.prototype).filter((k) => k !== "constructor").map((k) => {
    const h = (PlatformSignUpController.prototype as unknown as Record<string, () => unknown>)[k];
    return `${["GET", "POST"][Reflect.getMetadata(METHOD_METADATA, h) as number] ?? "?"} ${Reflect.getMetadata(PATH_METADATA, h)}`;
  });
  ok("PF-5 fail: the verification is POST only (opening the email's link changes nothing)", routes.includes("POST signup/verify") && !routes.some((r) => r.startsWith("GET signup")), routes);

  // ----------------------------------------------------------------------------- part 2: Stripe's events and the moves
  const bp = { audit: ports.audit, billing, clock, appUrl: ports.appUrl }, hooks = new BillingEvents(db, bp), acct = new BillingAccount(db, bp);
  let evn = 0;
  const raw = (type: string, object: Record<string, unknown>) => JSON.stringify({ id: `evt_t${++evn}`, object: "event", type, created: Math.floor(clock.now().getTime() / 1000), data: { object } });
  const send = async (body: string, sig: string | null = billing.sign(body)) => { const r = await problemOf(() => hooks.receive(Buffer.from(body), sig ?? undefined)); await hooks.settled(); return r; };
  const subOf = (f: string) => sql(`select status || ' ' || coalesce(to_char(trial_ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI'), '-') || ' ' || coalesce(to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD'), '-') from platform_subscription where firm_id = '${f}'`);
  const firmOf = (f: string) => sql(`select status from platform_firm where id = '${f}'`);
  const evs = (f: string, type: string) => Number(sql(`select count(*) from module_event where firm_id = '${f}' and type = '${type}'`));
  const snap = (id: string, over: Partial<BillingSubscription> = {}): BillingSubscription => ({ id, customerId: `cus_${id.slice(4)}`, firmId: null, status: "trialing", trialEnd: TRIAL_END, periodEnd: TRIAL_END, cancelAtPeriodEnd: false, hasCard: false, latestInvoice: null, ...over });
  const subEv = (id: string, type = "customer.subscription.updated") => raw(type, { object: "subscription", id, customer: `cus_${id.slice(4)}`, metadata: {} });
  const paidEv = (id: string) => raw("invoice.paid", { object: "invoice", customer: `cus_${id.slice(4)}`, parent: { subscription_details: { subscription: id, metadata: {} } } });
  const paid = (id: string) => ({ id, status: "paid" as const, taxNeedsAddress: false });
  const teamPlan = await db.platformPlan.findFirstOrThrow({ where: { code: "team" } });
  const mkFirm = async (k: string) => { const f = await db.platformFirm.create({ data: { key: `pf5p2-${k}`, operatingName: `Firm ${k}`, countryCode: "CA", status: "TRIAL", contactEmail: `${k}@p2.example.com` } });
    await db.platformSubscription.create({ data: { firmId: f.id, planId: teamPlan.id, status: "TRIAL", stripeCustomerId: `cus_${k}`, trialEndsAt: TRIAL_END } }); return f.id; };
  const P1 = new Date("2027-01-10T00:00:00Z"), P2 = new Date("2027-03-01T00:00:00Z");

  ok("PF-5 part 2 pass (QA-481): the sign-up stores the trial end, the plan's 14 days from the verification", sql(`select abs(extract(epoch from s.trial_ends_at - f.created_at) - 14 * 86400) < 120 from platform_subscription s join platform_firm f on f.id = s.firm_id where f.id = '${firmId}'`) === "t");
  const cust1 = co!.input.customerId, done1 = raw("checkout.session.completed", { object: "checkout.session", mode: "subscription", client_reference_id: firmId, customer: cust1, subscription: "sub_t1" });
  const unsigned = await send(done1, null), changed = await send(done1.replace(`"sub_t1"`, `"sub_t9"`), billing.sign(done1));
  ok("PF-5 part 2 fail: an unsigned or changed webhook → 400, nothing stored", unsigned?.status === 400 && changed?.status === 400 && sql(`select count(*) from webhook_receipt`) === "0", [unsigned, changed]);
  billing.subs.set("sub_t1", snap("sub_t1", { customerId: cust1 }));
  await send(done1);
  ok("PF-5 part 2 pass (A46's weak point): the trial's Checkout completing → Stripe's trial end stored, the firm in TRIAL, no card", subOf(firmId) === `TRIAL ${TRIAL_END.toISOString().slice(0, 16)} ${TRIAL_END.toISOString().slice(0, 10)}` && firmOf(firmId) === "TRIAL" && !billing.subs.get("sub_t1")!.hasCard, subOf(firmId));
  // PF-12b (merge of main, 21 Nov): the webhook's match read crosses the walls, so the matched firm's trail gets its
  // platform.bypass line; the refused (unsigned, changed) events above touched no firm and wrote none.
  const bypassLines = (f: string) => sql(`select count(*) from audit_event where action = 'platform.bypass' and firm_id = '${f}' and detail->>'use' = 'platform.billing.stripe-webhook'`);
  ok("PF-12b pass (PF-5 part 2): a handled Stripe event writes one platform.bypass line to the matched firm's trail", bypassLines(firmId) === "1", bypassLines(firmId));
  ok("PF-12b fail (PF-5 part 2): a refused event writes no platform.bypass line anywhere", sql(`select count(*) from audit_event where action = 'platform.bypass' and detail->>'use' = 'platform.billing.stripe-webhook' and firm_id <> '${firmId}'`) === "0");
  const synced = sql(`select count(*) from audit_event where action = 'platform.subscription.synced'`), dup = await hooks.receive(Buffer.from(done1), billing.sign(done1)); await hooks.settled();
  ok("PF-5 part 2 fail: the same event twice → answered, handled once", dup.duplicate === true && sql(`select count(*) from audit_event where action = 'platform.subscription.synced'`) === synced && sql(`select count(*) from webhook_receipt where handled_at is not null`) === "1");

  const F2 = await mkFirm("f2"), F3 = await mkFirm("f3");
  billing.subs.set("sub_f2", snap("sub_f2", { status: "active", hasCard: true, periodEnd: P1, latestInvoice: paid("in_f2") }));
  await send(paidEv("sub_f2")); await send(subEv("sub_f2", "customer.subscription.created"));
  billing.subs.set("sub_f3", snap("sub_f3")); await send(subEv("sub_f3", "customer.subscription.created"));
  const f3mid = subOf(F3).split(" ")[0];
  billing.subs.set("sub_f3", snap("sub_f3", { status: "active", hasCard: true, periodEnd: P1, latestInvoice: paid("in_f3") })); await send(paidEv("sub_f3"));
  ok("PF-5 part 2 pass/fail: paid-before-created and created-before-paid both end Active (a later trialing event never moves it back)", subOf(F2).startsWith("ACTIVE") && subOf(F3).startsWith("ACTIVE") && f3mid === "TRIAL" && firmOf(F2) === "ACTIVE" && evs(F2, EVENT.FIRM_ACTIVATED) === 1 && evs(F3, EVENT.FIRM_ACTIVATED) === 1, [subOf(F2), subOf(F3)]);
  billing.subs.set("sub_f2", snap("sub_f2", { status: "past_due", hasCard: true, periodEnd: P1, latestInvoice: { id: "in_f2b", status: "open", taxNeedsAddress: false } })); await send(subEv("sub_f2"));
  const overdue = `${subOf(F2).split(" ")[0]}/${firmOf(F2)}`;
  billing.subs.set("sub_f2", snap("sub_f2", { status: "active", hasCard: true, periodEnd: P1, latestInvoice: paid("in_f2b") })); await send(paidEv("sub_f2"));
  ok("PF-5 part 2 pass/fail: overdue is an indicator (firm stays Active); paid within grace → Active with the billing date unchanged", overdue === "OVERDUE/ACTIVE" && subOf(F2).startsWith("ACTIVE") && subOf(F2).endsWith(P1.toISOString().slice(0, 10)), [overdue, subOf(F2)]);

  const F4 = await mkFirm("f4");
  billing.subs.set("sub_f4", snap("sub_f4", { status: "paused" })); await send(subEv("sub_f4", "customer.subscription.paused"));
  ok("PF-5 part 2 pass: a trial ending with no card (Stripe pauses) → Payment hold that day, firm.payment_hold and the change in the outbox",
    subOf(F4).startsWith("PAYMENT_HOLD") && firmOf(F4) === "PAYMENT_HOLD" && evs(F4, EVENT.FIRM_PAYMENT_HOLD) === 1
    && sql(`select payload->>'old' || '>' || (payload->>'new') from module_event where firm_id = '${F4}' and type = '${EVENT.FIRM_SUBSCRIPTION_CHANGED}'`) === "TRIAL>PAYMENT_HOLD", subOf(F4));
  billing.subs.set("sub_f4", snap("sub_f4", { status: "paused", periodEnd: P2, latestInvoice: { id: "in_f4", status: "uncollectible", taxNeedsAddress: false } }));
  await send(raw("checkout.session.completed", { object: "checkout.session", mode: "setup", client_reference_id: F4, customer: "cus_f4", setup_intent: "seti_t4" }));
  const stillHeld = subOf(F4).split(" ")[0];
  billing.subs.set("sub_f4", snap("sub_f4", { status: "active", hasCard: true, periodEnd: P2, latestInvoice: paid("in_f4") })); await send(paidEv("sub_f4"));
  ok("PF-5 part 2 pass/fail: a card added to the held subscription resumes it; the hold ends only on a paid invoice (not uncollectible) and starts a new period",
    billing.resumed.includes("sub_f4") && stillHeld === "PAYMENT_HOLD" && subOf(F4).startsWith("ACTIVE") && subOf(F4).endsWith(P2.toISOString().slice(0, 10)) && firmOf(F4) === "ACTIVE" && billing.subs.get("sub_f4")!.hasCard, [stillHeld, subOf(F4)]);

  const F5 = await mkFirm("f5"); sql(`update platform_firm set status = 'DELETED' where id = '${F5}'`);
  billing.subs.set("sub_f5", snap("sub_f5", { status: "active", hasCard: true, latestInvoice: paid("in_f5") })); await send(subEv("sub_f5"));
  sql(`update platform_subscription set status = 'ENDED' where firm_id = '${F5}'`); await send(subEv("sub_f5"));
  ok("PF-5 part 2 fail: a refused move (DELETED → ACTIVE, ENDED → ACTIVE) changes nothing and is audited",
    firmOf(F5) === "DELETED" && subOf(F5).startsWith("ENDED") && evs(F5, EVENT.FIRM_ACTIVATED) === 0 && Number(sql(`select count(*) from audit_event where action = 'platform.subscription.move_refused' and detail->>'firmId' = '${F5}'`)) === 2);
  const F6 = await mkFirm("f6");
  billing.subs.set("sub_f6", snap("sub_f6", { status: "active", hasCard: true, latestInvoice: { id: "in_f6", status: "draft", taxNeedsAddress: true } })); await send(subEv("sub_f6"));
  ok("PF-5 part 2 pass/fail (Lead B, PF-5 DWn): an invoice whose tax needs the address → held \"business address needed\", the draft kept from finalizing; a taxed one is not",
    firmOf(F6) === "PAYMENT_HOLD" && billing.heldDrafts.join() === "in_f6" && sql(`select payload->>'reason' from module_event where firm_id = '${F6}' and type = '${EVENT.FIRM_PAYMENT_HOLD}'`) === ADDRESS_NEEDED && firmOf(F3) === "ACTIVE");

  const F7 = await mkFirm("f7"), p7 = subEv("sub_f7", "customer.subscription.paused");
  billing.subs.set("sub_f7", snap("sub_f7", { status: "paused" })); billing.events.set(JSON.parse(p7).id, eventFacts(JSON.parse(p7)));
  failAudit = "platform.subscription.synced"; await send(p7); failAudit = null;
  const rolledBack = `${subOf(F7).split(" ")[0]}/${firmOf(F7)}/${evs(F7, EVENT.FIRM_PAYMENT_HOLD)}/${sql(`select count(*) from webhook_receipt where event_id = '${JSON.parse(p7).id}' and handled_at is null`)}`;
  await clock.advance({ minutes: 3 }); const sweptN = await asBypass("job:platform.billing.webhook_sweep", () => hooks.sweep());   // as the job runs it (no firm)
  const sweepLines = (f: string) => sql(`select count(*) from audit_event where action = 'platform.bypass' and firm_id = '${f}' and detail->>'use' = 'job:platform.billing.webhook_sweep'`);
  ok("PF-12b pass/fail (PF-5 part 2): the sweep writes one platform.bypass line to the firm whose event it handled, none to another firm", sweepLines(F7) === "1" && sweepLines(firmId) === "0", [sweepLines(F7), sweepLines(firmId)]);
  ok("PF-5 part 2 pass/fail: a forced audit failure rolls the change and its event back (the receipt stays unhandled); the sweep handles it once",
    rolledBack === "TRIAL/TRIAL/0/1" && sweptN === 1 && firmOf(F7) === "PAYMENT_HOLD" && evs(F7, EVENT.FIRM_PAYMENT_HOLD) === 1 && (await hooks.sweep()) === 0, rolledBack);

  // ----------------------------------------------------------------------------------------- part 2: billing and profile
  const who = (f: string, roles: string[]) => ({ staffId: "0f5a0000-0000-4000-8000-0000000000aa", firmId: f, firmKey: "k", roles, keys: [], duties: [], authTime: 0, via: "local" as const });
  const v1 = await acct.view(who(firmId, ["OWNER"])), v7 = await acct.view(who(F7, ["OWNER"])), v6 = await acct.view(who(F6, ["OWNER"]));
  ok("PF-5 part 2 pass: GET billing shows plan, status, trial end, seats used of the limit and the card; a held firm its reason and deletion date (90 days)",
    v1.plan.code === "team" && v1.status === "TRIAL" && v1.trialEndsAt?.getTime() === TRIAL_END.getTime() && v1.seatsUsed === 1 && v1.seatsLimit === teamPlan.seatsLimit && v1.cardOnFile === false && v1.hold === null
    && v7.hold?.reason === "payment needed" && v7.hold.deletionDate.getTime() - v7.hold.since.getTime() === 90 * 86_400_000 && v6.hold?.reason === ADDRESS_NEEDED, { v1, v7: v7.hold });
  const addr = { unit: "4", street_number: "100", street_name: "Main Street", city: "Toronto", province_state: "ON", postal_code: "m5v 1a1" };
  const saved = await acct.setAddress(who(firmId, ["ADMIN"]), addr), badAddr = await problemOf(() => acct.setAddress(who(firmId, ["ADMIN"]), { ...addr, postal_code: "12345" }));
  ok("PF-5 part 2 pass/fail: PUT billing/address saves the business address and puts it on the Stripe customer; a bad postal code is refused at the field",
    saved.onStripe === true && billing.customers.find((c) => c.customerId === cust1)?.address?.postalCode === "M5V 1A1" && sql(`select business_address->>'postal_code' from platform_firm where id = '${firmId}'`) === "M5V 1A1"
    && badAddr?.status === 400 && JSON.stringify(badAddr.body.errors).includes("postal_code"), badAddr);
  billing.invoiceList.set(cust1, [{ id: "in_d1", number: null, status: "draft", amountDueCents: 4900, currency: "cad", createdAt: clock.now(), hostedUrl: null }, { id: "in_p1", number: "A-0001", status: "paid", amountDueCents: 4900, currency: "cad", createdAt: clock.now(), hostedUrl: "https://invoice.stripe.com/i/in_p1" }]);
  const inv = await acct.invoices(who(firmId, ["BILLING_FINANCE"]));
  ok("PF-5 part 2 pass/fail: GET billing/invoices lists our invoices with Stripe's hosted links, never a draft", inv.invoices.length === 1 && inv.invoices[0].id === "in_p1" && !!inv.invoices[0].hostedUrl, inv);

  // ------------------------------------------------------------------------------- part 2: the breaker's Majors (8c21a1e8)
  const F8 = await mkFirm("f8"), p8 = subEv("sub_f8", "customer.subscription.paused");
  billing.subs.set("sub_f8", snap("sub_f8", { status: "paused" }));
  sql(`insert into webhook_receipt (id, service, event_id, received_at) select gen_random_uuid(), 'stripe', 'evt_bad' || g, now() - interval '1 hour' from generate_series(1, 50) g`);
  failAudit = "platform.subscription.synced"; await send(p8); failAudit = null;
  const redelivered = await send(p8);
  ok("PF-5 part 2 fail (break M1): Stripe's redelivery of an event not yet handled is handled (never dropped as a repeat)", redelivered === null && firmOf(F8) === "PAYMENT_HOLD", firmOf(F8));
  for (let i = 0; i < 5; i++) await hooks.sweep();
  const keptRecent = sql(`select count(*) from webhook_receipt where event_id like 'evt_bad%' and handled_at is null`);
  sql(`update webhook_receipt set received_at = now() - interval '73 hours' where event_id like 'evt_bad%'`); await hooks.sweep();
  ok("PF-5 part 2 fail (break M1, R2): failing receipts keep being retried within Stripe's 3 days (an outage never drops a payment), then are set aside",
    keptRecent === "50" && sql(`select count(*) from webhook_receipt where event_id like 'evt_bad%' and outcome like 'set aside%'`) === "50", keptRecent);
  billing.subs.set("sub_bad1", snap("sub_bad1", { status: "active" })); const bad1 = raw("invoice.paid", {}); sql(`update webhook_receipt set event_id = '${JSON.parse(bad1).id}' where event_id = 'evt_bad1'`);
  ok("PF-5 part 2 fail (break R2): Stripe's redelivery of a set-aside event is handled again", (await send(bad1)) === null && sql(`select outcome from webhook_receipt where event_id = '${JSON.parse(bad1).id}'`).startsWith("invoice.paid"));
  billing.subs.set("sub_f8x", snap("sub_f8x", { customerId: "cus_f8", status: "canceled" }));
  await send(raw("customer.subscription.deleted", { object: "subscription", id: "sub_f8x", customer: "cus_f8", metadata: { firm_id: F8 } }));
  billing.subs.set("sub_x7", snap("sub_x7", { customerId: "cus_f3", status: "active", latestInvoice: paid("in_x7") }));
  const F10 = await mkFirm("f10"), x7 = await hooks.handle(eventFacts(JSON.parse(raw("checkout.session.completed", { object: "checkout.session", client_reference_id: F10, customer: "cus_f3", subscription: "sub_x7" }))));
  ok("PF-5 part 2 fail (review M2): an event naming a firm with another customer's subscription moves neither firm", x7.includes("another customer") && subOf(F10).startsWith("TRIAL") && subOf(F3).startsWith("ACTIVE"), x7);
  ok("PF-5 part 2 fail (break M2): an event about another subscription of the same customer never takes over the firm's own", subOf(F8).startsWith("PAYMENT_HOLD") && sql(`select stripe_subscription_id from platform_subscription where firm_id = '${F8}'`) === "sub_f8", subOf(F8));
  const F9 = await mkFirm("f9");
  await db.platformFirm.update({ where: { id: F9 }, data: { status: "ACTIVE" } });
  await billing.ensureCustomer({ firmId: F9, email: "f9@p2.example.com", name: "F9" });
  sql(`update platform_subscription set stripe_customer_id = '${billing.customers.at(-1)!.customerId}' where firm_id = '${F9}'`);
  billing.subs.set("sub_f9", snap("sub_f9", { customerId: billing.customers.at(-1)!.customerId, status: "active", hasCard: true, latestInvoice: { id: "in_f9", status: "draft", taxNeedsAddress: true } }));
  await send(raw("invoice.created", { object: "invoice", customer: billing.customers.at(-1)!.customerId, parent: { subscription_details: { subscription: "sub_f9", metadata: {} } } }));
  const heldBefore = billing.heldDrafts.includes("in_f9");
  await acct.setAddress(who(F9, ["OWNER"]), addr);
  billing.subs.set("sub_f9", snap("sub_f9", { customerId: billing.customers.at(-1)!.customerId, status: "active", hasCard: true, latestInvoice: paid("in_f9") })); await send(paidEv("sub_f9"));
  ok("PF-5 part 2 pass/fail (break M3): saving the address releases the held draft, and its payment ends the \"business address needed\" hold",
    heldBefore && !billing.heldDrafts.includes("in_f9") && subOf(F9).startsWith("ACTIVE") && firmOf(F9) === "ACTIVE", [heldBefore, subOf(F9)]);
  const shutAcct = new BillingAccount(db, { ...bp, notReady: "Stripe is not set up on this server (PLATFORM_STRIPE_SECRET_KEY)" });
  const shutCard = await problemOf(() => shutAcct.card(who(firmId, ["OWNER"]))), badD = await problemOf(() => acct.setAddress(who(firmId, ["OWNER"]), { ...addr, postal_code: "D0D 0D0" }));
  ok("PF-5 part 2 fail (break m5, m6, m4): a server without Stripe answers 503 on the card Checkout (never a made-up link); a postal code Canada never uses is refused",
    shutCard?.status === 503 && badD?.status === 400, [shutCard, badD]);

  // ------------------------------------------------------------------- part 2 over HTTP: the raw-body door and the 402
  await seedSampleFirms(db);
  // Lead B (7013594855): the case-opening route itself, with a Runtime that only counts the calls that reach it.
  const opened: string[] = [], runtime = { openCaseFromOffer: (_s: unknown, id: string) => { opened.push(id); return { opened: true }; } };
  @Module({ controllers: [PlatformIdentityController, StripeHookController, BillingController, PlatformTermsController, RuntimeController] as never[], providers: [{ provide: Db, useValue: db }, { provide: Runtime, useValue: runtime }, { provide: APP_GUARD, useClass: ConfigReadGuard }, PlatformClock, PlatformTerms, { provide: TERMS_GATE, useExisting: PlatformTerms },
    { provide: IDENTITY_PORT, useValue: new LocalIdentity("pf5-part2-check-signing-key-0123456789", () => Date.now()) }, PlatformIdentity, PlatformGuard, { provide: APP_GUARD, useExisting: PlatformGuard },
    { provide: BILLING_PORTS, useValue: bp }, PlatformBillingEvents, PlatformBillingAccount, PaymentHoldGate, { provide: APP_INTERCEPTOR, useExisting: PaymentHoldGate }] as never[] }) class BillingApp {}
  const nest = await NestFactory.create(BillingApp, { logger: false }); stripeRawBody(nest); await nest.listen(0, "127.0.0.1");
  try {
    const base = `http://127.0.0.1:${(nest.getHttpServer().address() as { port: number }).port}`;
    const call = async (method: string, path: string, o: { token?: string; body?: string; headers?: Record<string, string> } = {}) => { const r = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(o.token ? { authorization: `Bearer ${o.token}` } : {}), ...o.headers }, body: o.body }); return { status: r.status, body: await r.json().catch(() => null) as Record<string, unknown> | null }; };
    const signIn = async (actorId: string) => (await call("POST", "/api/platform/session/local", { body: JSON.stringify({ firmKey: "sample-firm", actorId, secondStep: true }) })).body?.token as string;
    const tR = await signIn("user-R"), tO = await signIn("user-O");
    const ev3 = subEv("sub_f3"), hookOk = await call("POST", "/api/hooks/stripe", { body: ev3, headers: { "stripe-signature": billing.sign(ev3) } }), hookBad = await call("POST", "/api/hooks/stripe", { body: "{}" });
    ok("PF-5 part 2 pass/fail: POST /api/hooks/stripe checks the signature on the raw bytes (200 signed, 400 unsigned)", hookOk.status === 200 && hookOk.body?.received === true && hookBad.status === 400, [hookOk, hookBad]);
    const open = async () => [(await call("GET", "/api/platform/staff/invitations", { token: tR })).status, (await call("GET", "/api/platform/billing", { token: tR })).status, (await call("GET", "/api/platform/me", { token: tR })).status];
    const before = await open();
    sql(`update platform_firm set status = 'PAYMENT_HOLD' where key = 'sample-firm'`);
    const held = await open(), words = (await call("GET", "/api/platform/staff/invitations", { token: tR })).body;
    const openCase = async () => (await call("POST", `/api/runtime/clients/${randomUUID()}/open-case`, { token: tR, body: "{}" })).status, cases = () => sql(`select count(*) from runtime_case`);
    const casesBefore = cases(), caseHeld = await openCase(), reachedHeld = opened.length;
    const addrHeld = (await call("PUT", "/api/platform/billing/address", { token: tR, body: JSON.stringify(addr) })).status;
    const v2 = sql(`insert into platform_terms_version (id, kind, version, url, published_at) values (gen_random_uuid(), 'TERMS_OF_SERVICE', 'sample-held-2', '/terms/2', now() - interval '1 minute') returning id`).split("\n")[0];
    const termsHeld = [(await call("GET", "/api/platform/billing", { token: tR })).status, (await call("POST", "/api/platform/me/terms/accept", { token: tR, body: JSON.stringify({ versionIds: [v2] }) })).status, (await call("GET", "/api/platform/billing", { token: tR })).status];
    ok("PF-5 part 2 fail (review r10, PF-5t): a held firm's Owner with new terms is never locked out: 428 on billing, accepts the terms, then billing 200", termsHeld.join() === "428,200,200", termsHeld);
    sql(`update platform_firm set status = 'ACTIVE' where key = 'sample-firm'`);
    const caseActive = await openCase();
    ok("PF-5 part 2 fail (Lead B, PF-15c break): a held firm's staff opening a case (POST clients/:id/open-case) get 402 and no case row is written", caseHeld === 402 && reachedHeld === 0 && cases() === casesBefore, { caseHeld, reachedHeld });
    ok("PF-5 part 2 pass (Lead B, PF-15c break): an active firm's same call is not refused by the hold (it reaches the case opening)", caseActive !== 402 && opened.length === 1, { caseActive, opened: opened.length });
    ok("PF-5 part 2 pass/fail: a held firm's staff get 402 on other routes and 200 on billing (address too) and their own identity; Active again → 200",
      before.join() === "200,200,200" && held.join() === "402,200,200" && words?.code === "PAYMENT_HOLD" && words.detail === HOLD_WORDS && addrHeld === 200, { before, held, addrHeld });
    const officer = [(await call("GET", "/api/platform/billing", { token: tO })).status, (await call("POST", "/api/platform/billing/portal", { token: tO })).status];
    ok("PF-5 part 2 fail: a Case Officer gets 403 on billing and the portal", officer.join() === "403,403", officer);
  } finally { await nest.close(); }
} catch (e) {
  ok("PF-5 the check ran to the end", false, e instanceof Error ? e.stack : String(e));
} finally {
  await db.$disconnect();
  execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]);
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
