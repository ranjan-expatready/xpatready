// PF-19a (rows rev 14/16, P-584 (1); contracts §9: the consent store is the platform's): the consent port. Both sides
// record consent and ask the gate through it; the store is msg_consent, msg_consent_wording and msg_suppression in
// platform-messages.prisma, written only by api/src/platform/messages/. FO-2 calls record() at capture; PF-19b asks allows()
// at send time. Writes run inside the caller's transaction and audit through AuditPort.record(tx, …) (fail-closed).
// The CASL reading behind "marketing needs express consent on that channel" is Unconfirmed: no counsel.
// This folder imports only zod and its own files (sha256 by the platform's Web Crypto, a global: no import).
import { z } from "zod";
import { AuditActor, FirmId } from "./audit.ts";

const Uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "a uuid");

export const Channel = z.enum(["EMAIL", "WHATSAPP"]);
export type Channel = z.infer<typeof Channel>;
/** MARKETING on EMAIL = MARKETING_EMAIL; MARKETING on WHATSAPP = WHATSAPP_MARKETING; SERVICE on WHATSAPP = the WhatsApp
 *  service opt-in (WHATSAPP_OPT_IN, never marketing). Service email needs no consent (AG-2-83 rule 3, SA-11-29). */
export const Purpose = z.enum(["SERVICE", "MARKETING"]);
export type Purpose = z.infer<typeof Purpose>;
/** The class the gate judges a message by (AG-10-22). */
export const MessageClass = z.enum(["TRANSACTIONAL", "SERVICE", "MARKETING"]);
export type MessageClass = z.infer<typeof MessageClass>;
export const SubjectKind = z.enum(["FO_PERSON", "CASE_PARTY", "STAFF"]);
export const Subject = z.strictObject({ kind: SubjectKind, id: Uuid });
export type Subject = z.infer<typeof Subject>;
export const ConsentSource = z.enum(["WEB_FORM", "META_LEAD_AD", "WHATSAPP_OPT_IN_REPLY", "BOOKING_FORM", "STAFF_RECORDED", "IMPORT_DECLARED", "PORTAL", "API"]);
export const RecorderKind = z.enum(["SELF_SERVICE", "USER", "SYSTEM"]);
export const WithdrawalVia = z.enum(["UNSUBSCRIBE", "STOP", "STAFF", "PORTAL", "COMPLAINT"]);
export const SuppressionReason = z.enum(["HARD_BOUNCE", "COMPLAINT", "UNSUBSCRIBE", "STOP", "STAFF"]);
export type SuppressionReason = z.infer<typeof SuppressionReason>;
const Locale = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "a language tag (en, fr-CA)");
/** A time: a Date or an ISO date-time with its offset (never a number, boolean or null), from 2000 on. */
const At = z.union([z.date(), z.iso.datetime({ offset: true })]).transform((d) => new Date(d))
  .refine((d) => Number.isFinite(d.getTime()) && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() < 10000, "a time from 2000 on");
/** Free text the database stores: no NUL character (PostgreSQL refuses it). */
const Text = (max: number) => z.string().trim().min(1).max(max).refine((t) => !t.includes("\u0000"), "no NUL character");
/** Zero-width and other invisible characters a pasted address or wording can carry. */
const INVISIBLE = /[\u00AD\u034F\u115F\u1160\u200B-\u200F\u2028-\u202F\u2060-\u206F\u3164\uFEFF\uFFA0]/g;

/** A purpose a channel can hold: a SERVICE consent is WhatsApp's opt-in only. */
const purposeFits = (v: { channel: Channel; purpose: Purpose }) => v.purpose === "MARKETING" || v.channel === "WHATSAPP";
const PURPOSE_MSG = "service email needs no consent: a SERVICE consent is the WhatsApp opt-in only";

/** The kept form of an email address (the same pattern as msg_address_ok in the migration): ASCII, lower case, a dotted
 *  domain with no trailing dot. A non-ASCII domain is written in its xn-- form by the caller. */
export const EMAIL_KEPT = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const badAddress = (raw: string, message: string) => new z.ZodError([{ code: "custom", path: ["address"], message, input: raw }]);

/** The one form an address is kept and looked up in, so a suppressed address cannot come back in another spelling
 *  (break report 4, 5): email has invisible characters, surrounding <> and a trailing dot removed, then lower case; a
 *  WhatsApp number in E.164 (spaces, dots, dashes and brackets dropped, and a national trunk "(0)" after the country
 *  code, as in +44 (0)7700 900123). Throws on an address that is neither. */
export function normaliseAddress(channel: Channel, raw: string): string {
  const s = raw.normalize("NFKC").replace(INVISIBLE, "").trim();
  if (channel === "EMAIL") {
    const a = s.replace(/^<(.*)>$/, "$1").trim().replace(/\.$/, "").toLowerCase();
    if (a.length > 320 || !EMAIL_KEPT.test(a)) throw badAddress(raw, "not an email address");
    return a;
  }
  const n = s.replace(/\(0\)/g, "").replace(/[\s.()-]/g, "");
  if (!/^\+[1-9][0-9]{6,14}$/.test(n)) throw badAddress(raw, "not a phone number in +<country><number> form");
  return n;
}

/** record(): one consent the person gave, with its evidence (AG-2-83 rules 2-4). A wording of the same firm, channel and
 *  purpose is required except for an importer's declaration (basis IMPORT_DECLARED, source IMPORT_DECLARED). */
export const ConsentRecordInput = z.strictObject({
  firmId: FirmId,
  subject: Subject,
  channel: Channel,
  purpose: Purpose,
  wordingId: Uuid.optional(),
  basis: z.enum(["EXPRESS", "IMPORT_DECLARED"]).default("EXPRESS"),
  source: ConsentSource,
  sourceRef: Text(200).optional(),
  evidenceRef: Text(200).optional(),
  locale: Locale.optional(),
  /** sha256 hex of the visitor's address, web form only. */
  ipHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  /** The law it was taken under (AG-10-26): ISO country or country-province, `CA`, `CA-QC`. */
  jurisdiction: z.string().regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/, "CA or CA-QC").optional(),
  recordedKind: RecorderKind,
  recordedBy: AuditActor,
  /** A Link or Merge copy names the row it copies (recordedKind SYSTEM, AG-2-83 rule 8). It keeps the original's
   *  channel, purpose, wording and time (a different one is refused), and a copy of a withdrawn consent is written
   *  withdrawn (never brought back to life). */
  copiedFromId: Uuid.optional(),
  /** When the person gave it (a copy keeps the original's time); defaults to the adapter's clock; never in the future. */
  givenAt: At.optional(),
})
  .refine(purposeFits, PURPOSE_MSG)
  .refine((c) => c.basis === "IMPORT_DECLARED" || c.wordingId !== undefined, "a consent names the wording the person saw")
  .refine((c) => (c.basis === "IMPORT_DECLARED") === (c.source === "IMPORT_DECLARED"), "an importer's declaration is basis and source IMPORT_DECLARED")
  .refine((c) => (c.recordedKind === "SYSTEM") === (c.copiedFromId !== undefined), "a SYSTEM row is a copy and names the row it copies")
  .refine((c) => c.ipHash === undefined || c.source === "WEB_FORM", "only a web form stores the visitor address hash");
export type ConsentRecordInput = z.input<typeof ConsentRecordInput>;

/** withdraw(): writes the withdrawal as its own row, whether or not a live consent exists (AG-10-24 "SHALL write a
 *  withdrawal"; AG-2-83 rule 7), and ends every consent of this subject, channel and purpose given at or before `at`
 *  (a late-processed withdrawal never ends a consent given after it). Giving consent again is a new record() after it. */
export const WithdrawInput = z.strictObject({
  firmId: FirmId,
  subject: Subject,
  channel: Channel,
  purpose: Purpose,
  via: WithdrawalVia,
  by: AuditActor,
  at: At.optional(),
}).refine(purposeFits, PURPOSE_MSG);
export type WithdrawInput = z.input<typeof WithdrawInput>;
export type Withdrawn = { withdrawalId: string; withdrawn: number };

/** suppress(): this address gets nothing more from the firm, transactional included (AG-10-25). A second suppression
 *  of the same address changes nothing (created: false). */
export const SuppressInput = z.strictObject({
  firmId: FirmId,
  channel: Channel,
  address: z.string().min(3).max(320),
  reason: SuppressionReason,
  by: AuditActor,
  note: Text(500).optional(),
});
export type SuppressInput = z.input<typeof SuppressInput>;

/** allows(): may this message go to this subject at this address now? The consent purpose follows from the class:
 *  MARKETING needs a live MARKETING consent on the channel; every other WhatsApp message (service or transactional) needs
 *  the live opt-in (SERVICE; WhatsApp's business-initiated messages need the person's opt-in); service and transactional
 *  email need none. A suppressed address stops every class. A copy to a case's copy list carries the
 *  class of the email it copies and is never MARKETING (AG-10-22, AG-10-89): the caller passes that class. */
export const AllowsQuery = z.strictObject({
  firmId: FirmId,
  /** The person; may be absent only for a TRANSACTIONAL message to a bare address. */
  subject: Subject.optional(),
  channel: Channel,
  address: z.string().min(3).max(320),
  class: MessageClass,
}).refine((q) => q.subject !== undefined || q.class === "TRANSACTIONAL", "a service or marketing message names its subject (consent is the person's)");
export type AllowsQuery = z.input<typeof AllowsQuery>;

/** Why a send is or is not allowed (AG-10-27: every send can show why). consentId names the consent that allowed it. */
export type ConsentDecision =
  | { allowed: true; reason: "TRANSACTIONAL" | "SERVICE_EMAIL"; consentId?: undefined }
  | { allowed: true; reason: "CONSENT"; consentId: string; purpose: Purpose }
  | { allowed: false; reason: "SUPPRESSED"; suppression: SuppressionReason; consentId?: undefined }
  | { allowed: false; reason: "NO_CONSENT" | "WITHDRAWN"; purpose: Purpose; consentId?: undefined };

/** publishWording(): a new version of the firm's wording for a channel, purpose and language (SA-11-29: never edited,
 *  only added to). The version is the next number for that key; the hash is the SHA-256 of the text. */
export const PublishWordingInput = z.strictObject({
  firmId: FirmId,
  channel: Channel,
  purpose: Purpose,
  locale: Locale,
  text: Text(4000).refine((t) => /[\p{L}\p{N}]/u.test(t.replace(INVISIBLE, "")), "wording has visible words"),
  by: AuditActor,
}).refine(purposeFits, PURPOSE_MSG);
export type PublishWordingInput = z.input<typeof PublishWordingInput>;
export type PublishedWording = { id: string; version: number; textHash: string };

/** The port. `Tx` is the caller's transaction (a Prisma transaction client in the API). Writes never open their own
 *  transaction; allows() reads through whatever it is given (a transaction or the client). */
export interface ConsentPort<Tx = unknown> {
  record(tx: Tx, consent: ConsentRecordInput): Promise<{ id: string }>;
  withdraw(tx: Tx, w: WithdrawInput): Promise<Withdrawn>;
  suppress(tx: Tx, s: SuppressInput): Promise<{ created: boolean }>;
  allows(db: Tx, q: AllowsQuery): Promise<ConsentDecision>;
  publishWording(tx: Tx, w: PublishWordingInput): Promise<PublishedWording>;
}

/** Refused: a wording that is not this firm's for this channel and purpose, a copy of a consent not in the firm, or a
 *  time in the future. */
export class ConsentRefused extends Error {
  constructor(message: string) { super(message); this.name = "ConsentRefused"; }
}

/** The consent purpose a class needs on a channel, or null when it needs none (AG-10-22, SA-11-29): marketing needs
 *  marketing consent; any other WhatsApp message needs the WhatsApp opt-in; email that is not marketing needs none.
 *  A reply inside WhatsApp's customer-service window to a person who wrote first (AG-2-83 rule 2, AG-10-41) is not a
 *  business-initiated message: PF-19b's sending path allows it before asking this gate (known, review round 2 R2-m1). */
export function purposeNeeded(cls: MessageClass, channel: Channel): Purpose | null {
  if (cls === "MARKETING") return "MARKETING";
  if (channel === "WHATSAPP") return "SERVICE";
  return null;
}

/** A copy keeps what the person agreed to: the original's channel, purpose, wording and time (AG-2-83 rule 8). */
export function copyKeeps(from: { channel: Channel; purpose: Purpose; wordingId?: string | null; givenAt: Date }, c: { channel: Channel; purpose: Purpose; wordingId?: string; givenAt?: Date }): void {
  if (from.channel !== c.channel || from.purpose !== c.purpose) throw new ConsentRefused(`a copy keeps the original's channel and purpose (${from.channel} ${from.purpose})`);
  if ((from.wordingId ?? undefined)?.toLowerCase() !== c.wordingId?.toLowerCase()) throw new ConsentRefused("a copy keeps the original's wording");
  if (c.givenAt && c.givenAt.getTime() !== from.givenAt.getTime()) throw new ConsentRefused("a copy keeps the original's time");
}

/** How far ahead of the clock a given or withdrawal time may be (clock drift between machines); later is refused. A
 *  time inside the slack is kept as the clock's now, so no consent or withdrawal is ever stored in the future (break
 *  round 2: a consent stamped ahead could not be withdrawn; a withdrawal stamped ahead blocked a real re-consent). */
export const FUTURE_SLACK_MS = 5 * 60_000;
export function notInFuture(at: Date, now: Date, what: string): Date {
  if (at.getTime() > now.getTime() + FUTURE_SLACK_MS) throw new ConsentRefused(`${what} ${at.toISOString()} is in the future`);
  return at.getTime() > now.getTime() ? now : at;
}

/** The withdrawal that ends a consent given at `givenAt`: the earliest of the candidates at or after it (the copied row's
 *  own, its key's withdrawal rows, the new row's key's withdrawal rows), or none. A row recorded after a withdrawal of
 *  its key, with an older time (an import, a late record), is written withdrawn, so a later copy of it cannot revive
 *  consent anywhere (break round 2, R2-1). */
export function endingWithdrawal<W extends { at: Date; by: string; via: string }>(givenAt: Date, candidates: ReadonlyArray<W | null | undefined>): W | null {
  const after = candidates.filter((w): w is W => !!w && w.at.getTime() >= givenAt.getTime()).sort((a, b) => a.at.getTime() - b.at.getTime());
  return after[0] ?? null;
}

/** The one rule (adapter and fake both use it). `rows` are the subject's consents for the channel and purpose and
 *  `withdrawals` the times of its withdrawal rows. A consent is live when it is not withdrawn and was given after the
 *  latest withdrawal of that key (a Link copy with an older time never undoes a later withdrawal, AG-2-83 rule 8); the
 *  newest live one is named. */
export function decide(q: { class: MessageClass; channel: Channel }, suppression: SuppressionReason | null, rows: ReadonlyArray<{ id: string; givenAt: Date; withdrawnAt: Date | null }>, withdrawals: ReadonlyArray<Date> = []): ConsentDecision {
  if (suppression) return { allowed: false, reason: "SUPPRESSED", suppression };
  const purpose = purposeNeeded(q.class, q.channel);
  if (purpose === null) return { allowed: true, reason: q.class === "TRANSACTIONAL" ? "TRANSACTIONAL" : "SERVICE_EMAIL" };
  const lastWithdrawal = Math.max(-Infinity, ...rows.filter((r) => r.withdrawnAt).map((r) => r.withdrawnAt!.getTime()), ...withdrawals.map((d) => d.getTime()));
  const live = rows.filter((r) => !r.withdrawnAt && r.givenAt.getTime() > lastWithdrawal).sort((a, b) => b.givenAt.getTime() - a.givenAt.getTime());
  if (live.length) return { allowed: true, reason: "CONSENT", consentId: live[0].id, purpose };
  return { allowed: false, reason: rows.length || withdrawals.length ? "WITHDRAWN" : "NO_CONSENT", purpose };
}

/** sha256 of a text's UTF-8 bytes, lower-case hex (the same as the migration's text_hash check). */
export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type FakeConsentRow = z.output<typeof ConsentRecordInput> & { id: string; givenAt: Date; withdrawnAt: Date | null; withdrawnVia: string | null };
type FakeWithdrawal = { id: string; firmId: string; subject: Subject; channel: Channel; purpose: Purpose; via: string; at: Date };
type FakeWording = { id: string; firmId: string; channel: Channel; purpose: Purpose; locale: string; version: number; text: string; textHash: string };

export type FakeConsent = ConsentPort<unknown> & {
  readonly consents: ReadonlyArray<FakeConsentRow>;
  readonly withdrawals: ReadonlyArray<FakeWithdrawal>;
  readonly wordings: ReadonlyArray<FakeWording>;
  readonly suppressions: ReadonlyArray<{ firmId: string; channel: Channel; address: string; reason: SuppressionReason }>;
};

/** The fake: the same inputs, rules and refusals as the adapter, in memory, for rows that only need the port (FO-2's
 *  capture tests, PF-19b's gate before its database). `now` is the clock (FakeClock.now works). It audits nothing: the
 *  adapter's audit is proved by its own test. */
export function fakeConsent(opts: { now?: () => Date } = {}): FakeConsent {
  const now = opts.now ?? (() => new Date());
  const consents: FakeConsentRow[] = [], wordings: FakeWording[] = [], withdrawals: FakeWithdrawal[] = [];
  const suppressions: { firmId: string; channel: Channel; address: string; reason: SuppressionReason }[] = [];
  const firmOf = (id: string) => id.toLowerCase();
  const sameKey = (r: { firmId: string; subject: Subject; channel: Channel; purpose: Purpose }, k: typeof r) =>
    firmOf(r.firmId) === firmOf(k.firmId) && r.subject.kind === k.subject.kind && r.subject.id.toLowerCase() === k.subject.id.toLowerCase() && r.channel === k.channel && r.purpose === k.purpose;
  return {
    get consents() { return consents; },
    get withdrawals() { return withdrawals; },
    get wordings() { return wordings; },
    get suppressions() { return suppressions; },
    async record(_tx, input) {
      const c = ConsentRecordInput.parse(input);
      if (c.wordingId && !wordings.some((w) => w.id === c.wordingId!.toLowerCase() && firmOf(w.firmId) === firmOf(c.firmId) && w.channel === c.channel && w.purpose === c.purpose))
        throw new ConsentRefused(`wording ${c.wordingId} is not this firm's ${c.channel} ${c.purpose} wording`);
      const from = c.copiedFromId ? consents.find((r) => r.id === c.copiedFromId!.toLowerCase() && firmOf(r.firmId) === firmOf(c.firmId)) : undefined;
      if (c.copiedFromId && !from) throw new ConsentRefused(`consent ${c.copiedFromId} is not in this firm`);
      if (from) copyKeeps(from, c);
      const givenAt = from ? from.givenAt : notInFuture(c.givenAt ?? now(), now(), "givenAt");
      const firstOut = (k: { firmId: string; subject: Subject; channel: Channel; purpose: Purpose }) =>
        withdrawals.filter((x) => sameKey(x, k) && x.at >= givenAt).map((x) => ({ at: x.at, by: "", via: x.via })).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
      const end = endingWithdrawal(givenAt, [
        from?.withdrawnAt ? { at: from.withdrawnAt, by: "", via: from.withdrawnVia ?? "" } : null,
        from ? firstOut(from) : null,
        firstOut(c),
      ]);
      const row: FakeConsentRow = { ...c, id: crypto.randomUUID(), givenAt, withdrawnAt: end?.at ?? null, withdrawnVia: end?.via ?? null };
      consents.push(row);
      return { id: row.id };
    },
    async withdraw(_tx, input) {
      const w = WithdrawInput.parse(input);
      const at = notInFuture(w.at ?? now(), now(), "at");
      const id = crypto.randomUUID();
      withdrawals.push({ id, firmId: w.firmId, subject: w.subject, channel: w.channel, purpose: w.purpose, via: w.via, at });
      let n = 0;
      for (const r of consents) if (sameKey(r, w) && !r.withdrawnAt && r.givenAt <= at) { r.withdrawnAt = at; r.withdrawnVia = w.via; n++; }
      return { withdrawalId: id, withdrawn: n };
    },
    async suppress(_tx, input) {
      const s = SuppressInput.parse(input);
      const address = normaliseAddress(s.channel, s.address);
      if (suppressions.some((x) => firmOf(x.firmId) === firmOf(s.firmId) && x.channel === s.channel && x.address === address)) return { created: false };
      suppressions.push({ firmId: s.firmId, channel: s.channel, address, reason: s.reason });
      return { created: true };
    },
    async allows(_db, input) {
      const q = AllowsQuery.parse(input);
      const address = normaliseAddress(q.channel, q.address);
      const sup = suppressions.find((x) => firmOf(x.firmId) === firmOf(q.firmId) && x.channel === q.channel && x.address === address);
      const purpose = purposeNeeded(q.class, q.channel);
      const key = q.subject && purpose ? { firmId: q.firmId, subject: q.subject, channel: q.channel, purpose } : null;
      const rows = key ? consents.filter((r) => sameKey(r, key)) : [];
      const outs = key ? withdrawals.filter((x) => sameKey(x, key)).map((x) => x.at) : [];
      return decide(q, sup?.reason ?? null, rows, outs);
    },
    async publishWording(_tx, input) {
      const w = PublishWordingInput.parse(input);
      const version = 1 + Math.max(0, ...wordings.filter((x) => firmOf(x.firmId) === firmOf(w.firmId) && x.channel === w.channel && x.purpose === w.purpose && x.locale === w.locale).map((x) => x.version));
      const row: FakeWording = { id: crypto.randomUUID(), firmId: w.firmId, channel: w.channel, purpose: w.purpose, locale: w.locale, version, text: w.text, textHash: await sha256Hex(w.text) };
      wordings.push(row);
      return { id: row.id, version, textHash: row.textHash };
    },
  };
}
