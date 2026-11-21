// PF-5 part 1 (contracts §7 §1.1, binding; P-566; Lead B's rulings on #1815): self-serve sign-up to a no-card trial.
//   * plans: the active plans with Stripe's prices ("+ applicable taxes"), the current terms and the form's load stamp;
//   * sign-up: work email, password (to the identity provider only), firm name, country CA, plan and period, the current
//     terms accepted. The door's protections (honeypot, minimum fill time, per-IP limit) and one answer whether or not
//     the email is known: a known email gets "You already have an account. Sign in." by email; a live sign-up for the
//     email sends nothing new; a honeypot or too-fast form stores and sends nothing;
//   * verify (POST only, so opening the link changes nothing): the code confirmed with the provider, then one transaction
//     makes the firm (PROVISIONING), its Owner, the Owner's terms acceptances and the trial subscription, each with its
//     audit line through AuditPort, and the firm.created outbox row last; the token is used once (a second or late use
//     is the one 404). After the commit, the firm's Stripe customer and its no-card trial Checkout through BillingPort.
//   * purge: expired pending sign-ups removed (the email is personal data), hourly through JobPort.
import { HttpException } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AuditPort } from "../../../../ports/audit.ts";
import type { BillingPort } from "../../../../ports/billing.ts";
import type { ClockPort } from "../../../../ports/clock.ts";
import { EVENT } from "../../../../ports/events.ts";
import type { JobPort } from "../../../../ports/jobs.ts";
import type { MailPort } from "../../../../ports/mail.ts";
import { asBypass, firmScope, touchFirm, touchFirms } from "../firm-scope.ts";
import { writeMoneyKeysGranted } from "../identity/money-line.ts";
import { emailOf } from "../identity/service.ts";
import type { SignUpIdentity } from "./signup-identity.ts";

type Tx = Prisma.TransactionClient;
export type SignUpPorts = {
  audit: AuditPort<Tx>; billing: BillingPort; identity: SignUpIdentity; mail: MailPort; clock: ClockPort; jobs?: JobPort | null;
  /** Our app's address (links in emails, Checkout's return pages). */
  appUrl: string;
  limits?: Partial<Limits>; formKey?: Buffer;
  /** Why this server cannot take sign-ups (a provider not set up), or null: the door answers 503 with it. */
  notReady?: string | null;
};
type Limits = { signupPerIp: number; verifyPerIp: number; windowMinutes: number; minFillSeconds: number };
const LIMITS: Limits = { signupPerIp: 10, verifyPerIp: 30, windowMinutes: 10, minFillSeconds: 3 };
/** A pending sign-up lives 24 hours (Sample; the migration's ceiling). */
export const PENDING_HOURS = 24;
const WRONG_CODES = 5, MAILS_PER_EMAIL_HOUR = 3;
export const PURGE_JOB = "platform.signup.purge";
export const ACCEPTED = "If this email can be used, we have sent a message to it. Open it to confirm your sign-up.";
export const ALREADY = "You already have an account. Sign in.";
export const TAX_NOTE = "+ applicable taxes";
const ACTOR = "system:sign-up";

const problem = (status: number, code: string, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${code.toLowerCase().replace(/_/g, "-")}`, title, status, detail, code, ...extra }, status);
const notFound = () => problem(404, "NOT_FOUND", "Not found", "This link is not valid any more. Sign up again, or sign in.");
const fields = (errors: string[]) => problem(400, "CHECK_FIELDS", "Check the form", "Some answers need changing.", { errors });

/** QA-484: an empty field answers in plain words on its field, never the validator's. */
export const EMPTY = { email: "email: Enter your work email.", password: "password: Choose a password.", firmName: "firmName: Enter your firm's name." } as const;
const filled = (words: string, blank = (s: string) => s.trim() === "") => z.string({ error: words }).check(z.refine((s) => !blank(s), { error: words, abort: true }));
const Body = z.strictObject({
  email: filled(EMPTY.email), password: filled(EMPTY.password, (s) => s === "").check(z.minLength(12, "password: at least 12 characters"), z.regex(/\S/, "password: not only spaces"), z.maxLength(256, "password: at most 256 characters")),
  firmName: filled(EMPTY.firmName).transform((s) => s.trim()).pipe(z.string().min(2, "firmName: 2 to 120 characters").max(120, "firmName: 2 to 120 characters").refine((s) => !/[\p{Cc}\p{Cf}]/u.test(s), "firmName: no control characters")),
  countryCode: z.literal("CA", { error: "countryCode: CA only for now" }), planCode: z.string().default("team"), period: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  acceptedTerms: z.array(z.string()).default([]), website: z.string().optional(), formStamp: z.string().max(200).default(""),
});
/** A refusal in the door's words: ours as written, any other (a wrong type, an unknown key) without the validator's text. */
const words = (i: z.core.$ZodIssue) => {
  if (i.code === "unrecognized_keys") return `${i.keys.join(", ")}: not a field of this form`;
  const f = i.path.join(".") || "body";
  return i.message.startsWith(`${f}:`) ? i.message : `${f}: check this answer`;
};
const VerifyBody = z.strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code: z.string().regex(/^\d{6}$/) });
/** Pending lifetimes are measured with the database's clock, as the migration's rules are (PF-3 review m6). */
const dbNow = async (db: Tx | PrismaClient) => (await db.$queryRaw<{ now: Date }[]>`select now() as now`)[0].now;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const slug = (s: string) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 40) || "firm";

export class FirmSignUp {
  private readonly limits: Limits;
  private readonly formKey: Buffer;
  private readonly hits = new Map<string, number[]>();
  private readonly mailsTo = new Map<string, number[]>();
  private readonly wrongCodes = new Map<string, number>();
  constructor(private readonly db: PrismaClient, private readonly ports: SignUpPorts) {
    this.limits = { ...LIMITS, ...ports.limits };
    this.formKey = ports.formKey ?? randomBytes(32);
  }

  async registerJobs() {
    if (!this.ports.jobs) return;
    await this.ports.jobs.handle(PURGE_JOB, async () => { await this.purgeExpired(); });
    await this.ports.jobs.recurring(PURGE_JOB, "17 * * * *", "UTC");
  }

  /** The current version of each kind: its newest published one that is not in the future. */
  async currentTerms(db: Tx | PrismaClient = this.db) {
    const rows = await db.platformTermsVersion.findMany({ where: { publishedAt: { lte: this.ports.clock.now() } }, orderBy: { publishedAt: "desc" } });
    return [...new Map(rows.map((r) => [r.kind, r] as const).reverse()).values()].sort((a, b) => a.kind.localeCompare(b.kind));
  }

  async plans() {
    const plans = await this.db.platformPlan.findMany({ where: { active: true }, orderBy: { seatsLimit: "asc" } });
    const ids = plans.flatMap((p) => [p.stripeMonthlyPrice, p.stripeYearlyPrice]).filter((x): x is string => !!x);
    // Stripe unreachable: the plans show without prices (never an invented one) rather than no page.
    const got = ids.length ? await this.ports.billing.prices(ids).catch(() => null) : [];
    const prices = new Map((got ?? []).filter((p) => p.active).map((p) => [p.id, p]));
    const price = (id: string | null) => { const p = id ? prices.get(id) : undefined; return p ? { amountCents: p.unitAmount, currency: p.currency.toUpperCase(), interval: p.interval } : null; };
    return {
      plans: plans.map((p) => ({ code: p.code, name: p.name, seatsLimit: p.seatsLimit, trialDays: p.trialDays, monthly: price(p.stripeMonthlyPrice), yearly: price(p.stripeYearlyPrice) })),
      pricesAvailable: got !== null, taxNote: TAX_NOTE, defaultPlan: "team", defaultPeriod: "MONTHLY",
      terms: (await this.currentTerms()).map((t) => ({ id: t.id, kind: t.kind, version: t.version, url: t.url })),
      formStamp: this.stamp(this.ports.clock.now()),
    };
  }

  private ready() { if (this.ports.notReady) throw problem(503, "SIGNUP_NOT_SET_UP", "Sign-up is not open here", "Sign-up is not set up on this server yet.", { reason: this.ports.notReady }); }

  /** PF-12: the sign-up door makes a firm that does not exist yet and checks the email across every firm, so it runs on
   *  its named use (firm-scope.ts BYPASS_USES "platform.firms.signup"); so does verify. */
  signUp(body: unknown, ip: string) { return asBypass("platform.firms.signup", () => this.signUpDoor(body, ip)); }
  private async signUpDoor(body: unknown, ip: string) {
    this.ready();
    this.limit(`signup:${ip}`, this.limits.signupPerIp);
    const parsed = Body.safeParse(body ?? {});
    if (!parsed.success) throw fields([...new Set(parsed.error.issues.map(words))]);
    const b = parsed.data;
    let email: string;
    try { email = emailOf(b.email); } catch { throw fields(["email: give your work email (name@example.com)"]); }
    const terms = await this.currentTerms();
    const given = new Set(b.acceptedTerms.map((t) => t.toLowerCase()));
    if (terms.length === 0 || terms.some((t) => !given.has(t.id)) || given.size !== terms.length) throw fields(["acceptedTerms: accept the current terms of service, privacy notice and data-processing terms"]);
    const plan = await this.db.platformPlan.findFirst({ where: { code: b.planCode, active: true } });
    if (!plan) throw fields(["planCode: choose one of the plans offered"]);
    // A stamp that is not ours or is older than 2 hours (a restart, another server, a page left open) asks for a reload
    // rather than dropping a real sign-up (break M3); only a too-fast fill is silent.
    const stamp = this.stampAge(b.formStamp);
    if (stamp === null) throw problem(400, "RELOAD", "Please reload the page", "This form is too old. Reload the page and send it again.");
    // The door's protections answer like any other sign-up, storing and sending nothing (AG-4-20 rule 3, contracts §0.6).
    if (b.website || stamp < this.limits.minFillSeconds * 1000) return { status: "check-email", message: ACCEPTED };
    // The rest runs after the answer, so the answer's time says nothing about the email (break M1, m4).
    this.later(() => this.signUpWork(email, b, plan.code, terms.map((t) => t.id)));
    return { status: "check-email", message: ACCEPTED };
  }

  private async signUpWork(email: string, b: z.output<typeof Body>, planCode: string, termIds: string[]) {
    if (!this.perEmail(email)) return;   // at most 3 emails to one address an hour (break m3)
    const known = await this.knownAccount(email);
    if (known) {
      await touchFirms(this.db, [known]);   // PF-12b: the lookup read that firm's staff; its line before the email (P-607)
      // PF-5v part 2 (review M1 of #2456): our own platform account email (PF-19p), never the firm's: as the firm's it
      // would go From the firm, and anyone repeating the public form would spend the firm's daily email cap.
      await this.ports.mail.send({ platformAccount: true, to: email, replyTo: "no-reply@expatready.com", subject: "You already have an ExpatReady account", text: `${ALREADY}\n${this.ports.appUrl}/account`, class: "TRANSACTIONAL", templateKey: "platform.signup.already_have_account" });
      return;
    }
    const token = randomBytes(32).toString("base64url");
    // The newest sign-up for an email replaces a live one (its link ends), so nobody can hold another person's address
    // for 24 hours, and a mistyped password is mended by signing up again (break M2). Still one live pending sign-up.
    const { subject } = await this.ports.identity.register({ email, password: b.password, firmName: b.firmName, link: (code) => `${this.ports.appUrl}/sign-up/verify#token=${token}&code=${code}` });
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${`platform_signup:${email}`}))`;
      const now = await dbNow(tx);
      await tx.platformSignupPending.updateMany({ where: { email, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now, outcome: "REPLACED" } });
      await tx.platformSignupPending.deleteMany({ where: { email, usedAt: null, expiresAt: { lte: now } } });
      await tx.platformSignupPending.create({ data: {
        email, firmName: b.firmName, countryCode: b.countryCode, planCode, period: b.period, identitySubject: subject,
        termsVersionIds: termIds, termsAcceptedAt: now, tokenHash: sha(token), createdAt: now, expiresAt: new Date(now.getTime() + PENDING_HOURS * 3600_000),
      } });
    });
  }

  /** Work started after an answer; its failure is logged without personal data. `settled()` waits for it (tests). */
  private readonly inflight = new Set<Promise<void>>();
  private later(fn: () => Promise<void>) {
    const p = fn().catch((e) => console.warn(`[sign-up] background step failed: ${e instanceof Error ? e.name : "error"}`)).finally(() => this.inflight.delete(p));
    this.inflight.add(p);
  }
  async settled() { while (this.inflight.size) await Promise.all([...this.inflight]); }

  verify(body: unknown, ip: string) { return asBypass("platform.firms.signup", () => this.verifyDoor(body, ip)); }
  private async verifyDoor(body: unknown, ip: string) {
    this.ready();
    this.limit(`verify:${ip}`, this.limits.verifyPerIp);
    const parsed = VerifyBody.safeParse(body ?? {});
    if (!parsed.success) throw notFound();
    const now = await dbNow(this.db);
    const pending = await this.db.platformSignupPending.findUnique({ where: { tokenHash: sha(parsed.data.token) } });
    if (!pending || pending.usedAt || pending.expiresAt <= now) throw notFound();
    if ((this.wrongCodes.get(pending.id) ?? 0) >= WRONG_CODES) throw notFound();   // 5 wrong codes end the link (break m5)
    if (!(await this.ports.identity.confirm({ subject: pending.identitySubject, code: parsed.data.code }))) {
      if (this.wrongCodes.size > 50_000) this.wrongCodes.clear();   // links last 24 hours; the cap is per process
      this.wrongCodes.set(pending.id, (this.wrongCodes.get(pending.id) ?? 0) + 1);
      throw problem(400, "CODE_WRONG", "Check the code", "That code is not the one we sent. Type the 6 digits from the email.");
    }
    const existing = await this.knownAccount(pending.email);
    if (existing) { await touchFirms(this.db, [existing]); throw problem(409, "ACCOUNT_EXISTS", "Sign in instead", ALREADY); }   // PF-12b: that firm's line, then the refusal
    const plan = await this.db.platformPlan.findFirst({ where: { code: pending.planCode, active: true } });
    if (!plan) throw problem(409, "PLAN_GONE", "Choose a plan again", "The plan you chose is no longer offered. Sign up again and choose one of the plans shown.");   // break m7
    const made = await this.db.$transaction(async (tx) => {
      const used = await tx.platformSignupPending.updateMany({ where: { id: pending.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now, outcome: "VERIFIED" } });
      if (used.count !== 1) throw notFound();   // a double submit makes one firm (the row's lock orders the two)
      const firm = await tx.platformFirm.create({ data: { key: `${slug(pending.firmName)}-${randomBytes(4).toString("hex")}`, operatingName: pending.firmName, countryCode: pending.countryCode, status: "PROVISIONING", ownerEmail: pending.email, contactEmail: pending.email, billingEmail: pending.email } });
      await touchFirm(tx, firm.id);   // PF-12b: the new firm's platform.bypass line, in the transaction that creates it
      await this.ports.audit.record(tx, { firmId: firm.id, actor: ACTOR, action: "firm.created", entity: "platform_firm", entityKey: firm.id, summary: "Firm created by self-serve sign-up (setting up)", detail: { status: "PROVISIONING", country: pending.countryCode },
        before: null, after: { key: firm.key, operatingName: firm.operatingName, countryCode: firm.countryCode, status: firm.status, ownerEmail: firm.ownerEmail, contactEmail: firm.contactEmail, billingEmail: firm.billingEmail } });
      const owner = await tx.platformStaff.create({ data: { firmId: firm.id, email: pending.email, displayName: pending.email.split("@")[0], identitySubject: pending.identitySubject } });
      await tx.platformRoleGrant.create({ data: { firmId: firm.id, staffId: owner.id, role: "OWNER", grantedBy: ACTOR, grantedAt: now } });
      // PF-6m2 (break F4; PF-6b rule (2)): the first Owner's money keys are logged like any other grant, in this transaction.
      await writeMoneyKeysGranted(tx, { firmId: firm.id, firmKey: firm.key, actor: "system:signup", staffId: owner.id, roles: ["OWNER"] });
      await this.ports.audit.record(tx, { firmId: firm.id, actor: ACTOR, action: "platform.staff.owner_created", entity: "platform_staff", entityKey: owner.id, summary: "The person who signed up is the firm's Owner", detail: { staffId: owner.id }, before: null, after: { email: owner.email, displayName: owner.displayName, roles: ["OWNER"] } });
      for (const versionId of pending.termsVersionIds) await tx.platformTermsAcceptance.create({ data: { firmId: firm.id, staffId: owner.id, versionId, acceptedAt: pending.termsAcceptedAt } });
      await this.ports.audit.record(tx, { firmId: firm.id, actor: ACTOR, action: "platform.terms.accepted", entity: "platform_terms_acceptance", entityKey: owner.id, summary: "The Owner's acceptance of the current terms recorded", detail: { staffId: owner.id, versions: pending.termsVersionIds.length }, before: null, after: { versionIds: pending.termsVersionIds, acceptedAt: pending.termsAcceptedAt.toISOString() } });
      // The trial's end is stored from the start (QA-481): the plan's days from now; Stripe's own end replaces it when the
      // trial's Checkout completes (billing/webhook.ts).
      const trialEndsAt = new Date(now.getTime() + plan.trialDays * 86_400_000);
      const sub = await tx.platformSubscription.create({ data: { firmId: firm.id, planId: plan.id, status: "TRIAL", trialEndsAt } });
      await this.ports.audit.record(tx, { firmId: firm.id, actor: ACTOR, action: "platform.subscription.created", entity: "platform_subscription", entityKey: sub.id, summary: `Trial subscription on ${plan.name}, ${pending.period.toLowerCase()}`, detail: { plan: plan.code, period: pending.period, trialEndsAt: trialEndsAt.toISOString() }, before: null, after: { plan: plan.code, period: pending.period, status: sub.status, trialEndsAt: trialEndsAt.toISOString() } });
      await tx.moduleEvent.create({ data: { firmId: firm.id, type: EVENT.FIRM_CREATED, subjectId: firm.id, payload: { firmId: firm.id } } });   // last (m8)
      return { firm, owner, sub };
    });
    const checkout = await this.startTrial(made.firm, made.sub.id, plan, pending.period).catch(() => null);
    return { firmKey: made.firm.key, status: "PROVISIONING", ownerStaffId: made.owner.id, checkoutUrl: checkout?.url ?? null, ...(checkout ? {} : { next: "Sign in to finish starting your free trial." }) };
  }

  /** The Stripe customer and the no-card trial's Checkout (after the firm's commit; a failure leaves the firm setting up). */
  private async startTrial(firm: { id: string; operatingName: string; contactEmail: string }, subId: string, plan: { stripeMonthlyPrice: string | null; stripeYearlyPrice: string | null; trialDays: number }, period: "MONTHLY" | "YEARLY") {
    const priceId = period === "YEARLY" ? plan.stripeYearlyPrice : plan.stripeMonthlyPrice;
    if (!priceId) return null;
    // The customer we stored wins: Stripe keeps an idempotency key about 24 hours only (review minor).
    const had = (await this.db.platformSubscription.findFirst({ where: firmScope(firm.id, { id: subId }), select: { stripeCustomerId: true } }))?.stripeCustomerId;
    const customerId = had ?? (await this.ports.billing.ensureCustomer({ firmId: firm.id, email: firm.contactEmail, name: firm.operatingName })).customerId;
    if (!had) await this.db.$transaction(async (tx) => {
      await tx.platformSubscription.updateMany({ where: firmScope(firm.id, { id: subId, stripeCustomerId: null }), data: { stripeCustomerId: customerId } });
      await this.ports.audit.record(tx, { firmId: firm.id, actor: ACTOR, action: "platform.subscription.customer_linked", entity: "platform_subscription", entityKey: subId, summary: "The firm's billing customer was created", detail: { customerId }, before: { stripeCustomerId: null }, after: { stripeCustomerId: customerId } });
    });
    return this.ports.billing.startTrialCheckout({ firmId: firm.id, customerId, priceId, trialDays: plan.trialDays, successUrl: `${this.ports.appUrl}/sign-up/trial-started`, cancelUrl: `${this.ports.appUrl}/sign-up/trial` });
  }

  /** Removes the expired pending sign-ups (used or not). */
  async purgeExpired(): Promise<number> {
    return (await this.db.platformSignupPending.deleteMany({ where: { expiresAt: { lte: await dbNow(this.db) } } })).count;
  }

  /** The firm of a staff member or firm contact with this email (an account exists), else null. */
  private async knownAccount(email: string): Promise<string | null> {
    const staff = await this.db.platformStaff.findFirst({ where: { email }, select: { firmId: true } });
    if (staff) return staff.firmId;
    return (await this.db.platformFirm.findUnique({ where: { contactEmail: email }, select: { id: true } }))?.id ?? null;
  }

  private limit(key: string, max: number) {
    const now = this.ports.clock.now().getTime(), since = now - this.limits.windowMinutes * 60_000;
    const list = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (list.length >= max) { this.hits.set(key, list); throw problem(429, "TOO_MANY", "Please wait", "Too many tries from here. Wait a few minutes and try again."); }
    list.push(now); this.hits.set(key, list);
    if (this.hits.size > 50_000) for (const [k, v] of this.hits) if (!v.some((t) => t > since)) this.hits.delete(k);
  }

  /** The form's load stamp `<ms>.<hmac>`: a form sent sooner than minFillSeconds after it, older than 2 hours, or not ours, fails. */
  stamp(at: Date): string { const ms = String(at.getTime()); return `${ms}.${createHmac("sha256", this.formKey).update(`signup:${ms}`).digest("base64url")}`; }
  /** The stamp's age in milliseconds, or null when it is not ours or older than 2 hours. */
  private stampAge(stamp: string): number | null {
    const [ms, mac, extra] = stamp.split(".");
    if (!/^\d{1,15}$/.test(ms ?? "") || !mac || extra !== undefined) return null;
    const want = Buffer.from(this.stamp(new Date(Number(ms))).split(".")[1]), have = Buffer.from(mac);
    const age = this.ports.clock.now().getTime() - Number(ms);
    return want.length === have.length && timingSafeEqual(want, have) && age >= 0 && age <= 2 * 3600_000 ? age : null;
  }

  private perEmail(email: string): boolean {
    const now = this.ports.clock.now().getTime(), list = (this.mailsTo.get(email) ?? []).filter((t) => t > now - 3600_000);
    if (list.length >= MAILS_PER_EMAIL_HOUR) return false;
    list.push(now); this.mailsTo.set(email, list);
    if (this.mailsTo.size > 50_000) for (const [k, v] of this.mailsTo) if (!v.some((t) => t > now - 3600_000)) this.mailsTo.delete(k);
    return true;
  }

}
