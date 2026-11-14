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
const At = z.coerce.date().refine((d) => Number.isFinite(d.getTime()), "a time");

/** A purpose a channel can hold: a SERVICE consent is WhatsApp's opt-in only. */
const purposeFits = (v: { channel: Channel; purpose: Purpose }) => v.purpose === "MARKETING" || v.channel === "WHATSAPP";
const PURPOSE_MSG = "service email needs no consent: a SERVICE consent is the WhatsApp opt-in only";

/** The one form an address is kept and looked up in (msg_address_ok in the migration): email trimmed and lower case,
 *  a WhatsApp number in E.164 (spaces, dots, dashes and brackets dropped). Throws on an address that is neither. */
export function normaliseAddress(channel: Channel, raw: string): string {
  if (channel === "EMAIL") {
    const a = raw.trim().toLowerCase();
    if (a.length > 320 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) throw new z.ZodError([{ code: "custom", path: ["address"], message: "not an email address", input: raw }]);
    return a;
  }
  const n = raw.replace(/[\s.()-]/g, "");
  if (!/^\+[1-9][0-9]{6,14}$/.test(n)) throw new z.ZodError([{ code: "custom", path: ["address"], message: "not a phone number in +<country><number> form", input: raw }]);
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
  sourceRef: z.string().min(1).max(200).optional(),
  evidenceRef: z.string().min(1).max(200).optional(),
  locale: Locale.optional(),
  /** sha256 hex of the visitor's address, web form only. */
  ipHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  recordedKind: RecorderKind,
  recordedBy: AuditActor,
  /** A Link or Merge copy names the row it copies (recordedKind SYSTEM, AG-2-83 rule 8). */
  copiedFromId: Uuid.optional(),
  /** When the person gave it (a copy keeps the original's time); defaults to the adapter's clock. */
  givenAt: At.optional(),
})
  .refine(purposeFits, PURPOSE_MSG)
  .refine((c) => c.basis === "IMPORT_DECLARED" || c.wordingId !== undefined, "a consent names the wording the person saw")
  .refine((c) => (c.basis === "IMPORT_DECLARED") === (c.source === "IMPORT_DECLARED"), "an importer's declaration is basis and source IMPORT_DECLARED")
  .refine((c) => (c.recordedKind === "SYSTEM") === (c.copiedFromId !== undefined), "a SYSTEM row is a copy and names the row it copies")
  .refine((c) => c.ipHash === undefined || c.source === "WEB_FORM", "only a web form stores the visitor address hash");
export type ConsentRecordInput = z.input<typeof ConsentRecordInput>;

/** withdraw(): every live consent of this subject, channel and purpose is withdrawn at once (AG-10-24: an unsubscribe
 *  click, STOP, or a staff member by hand); giving it again is a new record(). */
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

/** suppress(): this address gets nothing more from the firm, transactional included (AG-10-25). A second suppression
 *  of the same address changes nothing (created: false). */
export const SuppressInput = z.strictObject({
  firmId: FirmId,
  channel: Channel,
  address: z.string().min(3).max(320),
  reason: SuppressionReason,
  by: AuditActor,
  note: z.string().trim().min(1).max(500).optional(),
});
export type SuppressInput = z.input<typeof SuppressInput>;

/** allows(): may this message go to this subject at this address now? The consent purpose follows from the class:
 *  MARKETING needs a live MARKETING consent on the channel; SERVICE on WhatsApp needs the live opt-in (SERVICE); service
 *  email and TRANSACTIONAL need none. A suppressed address stops every class. A copy to a case's copy list carries the
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
  | { allowed: false; reason: "SUPPRESSED"; suppression: SuppressionReason }
  | { allowed: false; reason: "NO_CONSENT" | "WITHDRAWN"; purpose: Purpose };

/** publishWording(): a new version of the firm's wording for a channel, purpose and language (SA-11-29: never edited,
 *  only added to). The version is the next number for that key; the hash is the SHA-256 of the text. */
export const PublishWordingInput = z.strictObject({
  firmId: FirmId,
  channel: Channel,
  purpose: Purpose,
  locale: Locale,
  text: z.string().trim().min(1).max(4000),
  by: AuditActor,
}).refine(purposeFits, PURPOSE_MSG);
export type PublishWordingInput = z.input<typeof PublishWordingInput>;
export type PublishedWording = { id: string; version: number; textHash: string };

/** The port. `Tx` is the caller's transaction (a Prisma transaction client in the API). Writes never open their own
 *  transaction; allows() reads through whatever it is given (a transaction or the client). */
export interface ConsentPort<Tx = unknown> {
  record(tx: Tx, consent: ConsentRecordInput): Promise<{ id: string }>;
  withdraw(tx: Tx, w: WithdrawInput): Promise<{ withdrawn: number }>;
  suppress(tx: Tx, s: SuppressInput): Promise<{ created: boolean }>;
  allows(db: Tx, q: AllowsQuery): Promise<ConsentDecision>;
  publishWording(tx: Tx, w: PublishWordingInput): Promise<PublishedWording>;
}

/** Refused: a wording that is not this firm's for this channel and purpose, or a copy of a consent not in the firm. */
export class ConsentRefused extends Error {
  constructor(message: string) { super(message); this.name = "ConsentRefused"; }
}

/** The consent purpose a class needs on a channel, or null when it needs none (AG-10-22, SA-11-29). */
export function purposeNeeded(cls: MessageClass, channel: Channel): Purpose | null {
  if (cls === "MARKETING") return "MARKETING";
  if (cls === "SERVICE" && channel === "WHATSAPP") return "SERVICE";
  return null;
}

/** The one rule (adapter and fake both use it). `rows` are the subject's consents for the channel and purpose. A consent is
 *  live when it is not withdrawn and was given after the latest withdrawal of that key (a Link copy with an older time
 *  never undoes a later withdrawal, AG-2-83 rule 8); the newest live one is named. */
export function decide(q: { class: MessageClass; channel: Channel }, suppression: SuppressionReason | null, rows: ReadonlyArray<{ id: string; givenAt: Date; withdrawnAt: Date | null }>): ConsentDecision {
  if (suppression) return { allowed: false, reason: "SUPPRESSED", suppression };
  const purpose = purposeNeeded(q.class, q.channel);
  if (purpose === null) return { allowed: true, reason: q.class === "TRANSACTIONAL" ? "TRANSACTIONAL" : "SERVICE_EMAIL" };
  const lastWithdrawal = Math.max(-Infinity, ...rows.filter((r) => r.withdrawnAt).map((r) => r.withdrawnAt!.getTime()));
  const live = rows.filter((r) => !r.withdrawnAt && r.givenAt.getTime() > lastWithdrawal).sort((a, b) => b.givenAt.getTime() - a.givenAt.getTime());
  if (live.length) return { allowed: true, reason: "CONSENT", consentId: live[0].id, purpose };
  return { allowed: false, reason: rows.length ? "WITHDRAWN" : "NO_CONSENT", purpose };
}

/** sha256 of a text's UTF-8 bytes, lower-case hex (the same as the migration's text_hash check). */
export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type FakeConsentRow = z.output<typeof ConsentRecordInput> & { id: string; givenAt: Date; withdrawnAt: Date | null; withdrawnVia: string | null };
type FakeWording = { id: string; firmId: string; channel: Channel; purpose: Purpose; locale: string; version: number; text: string; textHash: string };

export type FakeConsent = ConsentPort<unknown> & {
  readonly consents: ReadonlyArray<FakeConsentRow>;
  readonly wordings: ReadonlyArray<FakeWording>;
  readonly suppressions: ReadonlyArray<{ firmId: string; channel: Channel; address: string; reason: SuppressionReason }>;
};

/** The fake: the same inputs, rules and refusals as the adapter, in memory, for rows that only need the port (FO-2's
 *  capture tests, PF-19b's gate before its database). `now` is the clock (FakeClock.now works). It audits nothing: the
 *  adapter's audit is proved by its own test. */
export function fakeConsent(opts: { now?: () => Date } = {}): FakeConsent {
  const now = opts.now ?? (() => new Date());
  const consents: FakeConsentRow[] = [], wordings: FakeWording[] = [];
  const suppressions: { firmId: string; channel: Channel; address: string; reason: SuppressionReason }[] = [];
  const firmOf = (id: string) => id.toLowerCase();
  const sameKey = (r: { firmId: string; subject: Subject; channel: Channel; purpose: Purpose }, k: typeof r) =>
    firmOf(r.firmId) === firmOf(k.firmId) && r.subject.kind === k.subject.kind && r.subject.id.toLowerCase() === k.subject.id.toLowerCase() && r.channel === k.channel && r.purpose === k.purpose;
  return {
    get consents() { return consents; },
    get wordings() { return wordings; },
    get suppressions() { return suppressions; },
    async record(_tx, input) {
      const c = ConsentRecordInput.parse(input);
      if (c.wordingId && !wordings.some((w) => w.id === c.wordingId && firmOf(w.firmId) === firmOf(c.firmId) && w.channel === c.channel && w.purpose === c.purpose))
        throw new ConsentRefused(`wording ${c.wordingId} is not this firm's ${c.channel} ${c.purpose} wording`);
      if (c.copiedFromId && !consents.some((r) => r.id === c.copiedFromId && firmOf(r.firmId) === firmOf(c.firmId)))
        throw new ConsentRefused(`consent ${c.copiedFromId} is not in this firm`);
      const row: FakeConsentRow = { ...c, id: crypto.randomUUID(), givenAt: c.givenAt ?? now(), withdrawnAt: null, withdrawnVia: null };
      consents.push(row);
      return { id: row.id };
    },
    async withdraw(_tx, input) {
      const w = WithdrawInput.parse(input);
      const at = w.at ?? now();
      let n = 0;
      for (const r of consents) if (sameKey(r, w) && !r.withdrawnAt) { r.withdrawnAt = at < r.givenAt ? r.givenAt : at; r.withdrawnVia = w.via; n++; }
      return { withdrawn: n };
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
      const rows = q.subject && purpose ? consents.filter((r) => sameKey(r, { firmId: q.firmId, subject: q.subject!, channel: q.channel, purpose })) : [];
      return decide(q, sup?.reason ?? null, rows);
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
