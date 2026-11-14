// PF-19a (rows rev 14/16, P-584 (1); contracts §9): ConsentPort over msg_consent, msg_consent_wording and msg_suppression
// (platform-messages.prisma). The only writer of those tables. Every write runs inside the caller's transaction and
// writes one audit line through AuditPort.record(tx, …) (fail-closed: a failed line rolls the change back). Every query
// is scoped by firmScope (api/src/platform/firm-scope.ts); the database adds the rest (composite keys keep a consent on
// its own firm's wording; triggers keep wording write-once and a withdrawal set once). Audit detail carries ids and
// enum words only: never an address, a name or the wording's text.
import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuditPort } from "../../../../../ports/audit.ts";
import { systemClock, type ClockPort } from "../../../../../ports/clock.ts";
import {
  AllowsQuery, ConsentRecordInput, ConsentRefused, PublishWordingInput, SuppressInput, WithdrawInput, decide,
  normaliseAddress, purposeNeeded, sha256Hex,
  type ConsentDecision, type ConsentPort, type PublishedWording,
} from "../../../../../ports/consent.ts";
import { firmScope } from "../../firm-scope.ts";
import { ensureMessagesFirm } from "./messages-firm.ts";

type Tx = Prisma.TransactionClient;
type DbOrTx = PrismaClient | Tx;

export class ConsentStore implements ConsentPort<Tx> {
  constructor(private readonly audit: AuditPort<Tx>, private readonly clock: ClockPort = systemClock) {}

  async record(tx: Tx, input: Parameters<ConsentPort["record"]>[1]): Promise<{ id: string }> {
    const c = ConsentRecordInput.parse(input);
    const { firmId } = firmScope(c.firmId);
    await ensureMessagesFirm(tx, firmId);
    if (c.wordingId) {
      const w = await tx.msgConsentWording.findFirst({ where: firmScope(firmId, { id: c.wordingId, channel: c.channel, purpose: c.purpose }), select: { id: true } });
      if (!w) throw new ConsentRefused(`wording ${c.wordingId} is not this firm's ${c.channel} ${c.purpose} wording`);
    }
    if (c.copiedFromId) {
      const from = await tx.msgConsent.findFirst({ where: firmScope(firmId, { id: c.copiedFromId }), select: { id: true } });
      if (!from) throw new ConsentRefused(`consent ${c.copiedFromId} is not in this firm`);
    }
    const row = await tx.msgConsent.create({
      data: {
        firmId, subjectKind: c.subject.kind, subjectId: c.subject.id.toLowerCase(), channel: c.channel, purpose: c.purpose,
        wordingId: c.wordingId ?? null, basis: c.basis, source: c.source, sourceRef: c.sourceRef ?? null, evidenceRef: c.evidenceRef ?? null,
        locale: c.locale ?? null, ipHash: c.ipHash ?? null, recordedKind: c.recordedKind, recordedBy: c.recordedBy,
        copiedFromId: c.copiedFromId ?? null, givenAt: c.givenAt ?? this.clock.now(),
      },
      select: { id: true },
    });
    await this.audit.record(tx, {
      firmId, actor: c.recordedBy, action: "consent.recorded", entity: "msg_consent", entityKey: row.id,
      summary: `Consent recorded: ${c.channel.toLowerCase()} ${c.purpose.toLowerCase()}, from ${c.source.toLowerCase().replace(/_/g, " ")}.`,
      detail: { subjectKind: c.subject.kind, subjectId: c.subject.id.toLowerCase(), channel: c.channel, purpose: c.purpose, basis: c.basis, source: c.source, wordingId: c.wordingId ?? null, copiedFromId: c.copiedFromId ?? null },
    });
    return row;
  }

  async withdraw(tx: Tx, input: Parameters<ConsentPort["withdraw"]>[1]): Promise<{ withdrawn: number }> {
    const w = WithdrawInput.parse(input);
    const { firmId } = firmScope(w.firmId);
    const at = w.at ?? this.clock.now();
    // Every live row of the key at once; a row given after `at` (a clock step) is withdrawn at its own given time, so
    // withdrawn_at never precedes given_at (check).
    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "msg_consent" SET "withdrawn_at" = greatest(${at}::timestamptz, "given_at"), "withdrawn_by" = ${w.by}, "withdrawn_via" = ${w.via}::"MsgWithdrawalVia"
      WHERE "firm_id" = ${firmId}::uuid AND "subject_kind" = ${w.subject.kind}::"MsgSubjectKind" AND "subject_id" = ${w.subject.id.toLowerCase()}::uuid
        AND "channel" = ${w.channel}::"MsgChannel" AND "purpose" = ${w.purpose}::"MsgPurpose" AND "withdrawn_at" IS NULL
      RETURNING "id"::text AS id`;
    if (rows.length) {
      await this.audit.record(tx, {
        firmId, actor: w.by, action: "consent.withdrawn", entity: "msg_consent", entityKey: `${w.subject.kind}:${w.subject.id.toLowerCase()}`,
        summary: `Consent withdrawn: ${w.channel.toLowerCase()} ${w.purpose.toLowerCase()}, by ${w.via.toLowerCase()} (${rows.length} record${rows.length === 1 ? "" : "s"}).`,
        detail: { subjectKind: w.subject.kind, subjectId: w.subject.id.toLowerCase(), channel: w.channel, purpose: w.purpose, via: w.via, consentIds: rows.slice(0, 50).map((r) => r.id), count: rows.length },
      });
    }
    return { withdrawn: rows.length };
  }

  async suppress(tx: Tx, input: Parameters<ConsentPort["suppress"]>[1]): Promise<{ created: boolean }> {
    const s = SuppressInput.parse(input);
    const { firmId } = firmScope(s.firmId);
    const address = normaliseAddress(s.channel, s.address);
    await ensureMessagesFirm(tx, firmId);
    // ON CONFLICT DO NOTHING: a second bounce changes nothing and never aborts the caller's transaction.
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "msg_suppression" ("id", "firm_id", "channel", "address", "reason", "note", "created_by")
      VALUES (gen_random_uuid(), ${firmId}::uuid, ${s.channel}::"MsgChannel", ${address}, ${s.reason}::"MsgSuppressionReason", ${s.note ?? null}, ${s.by})
      ON CONFLICT ("firm_id", "channel", "address") DO NOTHING RETURNING "id"::text AS id`;
    if (!rows.length) return { created: false };
    await this.audit.record(tx, {
      firmId, actor: s.by, action: "message.address.suppressed", entity: "msg_suppression", entityKey: rows[0].id,
      summary: `An ${s.channel === "EMAIL" ? "email address" : "WhatsApp number"} was suppressed: ${s.reason.toLowerCase().replace(/_/g, " ")}.`,
      detail: { channel: s.channel, reason: s.reason },
    });
    return { created: true };
  }

  async allows(db: DbOrTx, input: Parameters<ConsentPort["allows"]>[1]): Promise<ConsentDecision> {
    const q = AllowsQuery.parse(input);
    const { firmId } = firmScope(q.firmId);
    const address = normaliseAddress(q.channel, q.address);
    const sup = await db.msgSuppression.findFirst({ where: firmScope(firmId, { channel: q.channel, address }), select: { reason: true } });
    const purpose = purposeNeeded(q.class, q.channel);
    const rows = q.subject && purpose && !sup
      ? await db.msgConsent.findMany({
        where: firmScope(firmId, { subjectKind: q.subject.kind, subjectId: q.subject.id.toLowerCase(), channel: q.channel, purpose }),
        select: { id: true, givenAt: true, withdrawnAt: true },
      })
      : [];
    return decide(q, sup?.reason ?? null, rows);
  }

  async publishWording(tx: Tx, input: Parameters<ConsentPort["publishWording"]>[1]): Promise<PublishedWording> {
    const w = PublishWordingInput.parse(input);
    const { firmId } = firmScope(w.firmId);
    await ensureMessagesFirm(tx, firmId);
    // One publisher at a time per firm, channel, purpose and language, so two publishers never take one number.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`msg_consent_wording:${firmId}:${w.channel}:${w.purpose}:${w.locale}`}))`;
    const last = await tx.msgConsentWording.aggregate({ where: firmScope(firmId, { channel: w.channel, purpose: w.purpose, locale: w.locale }), _max: { version: true } });
    const version = (last._max.version ?? 0) + 1;
    const textHash = await sha256Hex(w.text);
    const row = await tx.msgConsentWording.create({
      data: { firmId, channel: w.channel, purpose: w.purpose, locale: w.locale, version, text: w.text, textHash, publishedBy: w.by },
      select: { id: true },
    });
    await this.audit.record(tx, {
      firmId, actor: w.by, action: "consent.wording.published", entity: "msg_consent_wording", entityKey: row.id,
      summary: `Consent wording published: ${w.channel.toLowerCase()} ${w.purpose.toLowerCase()} (${w.locale}), version ${version}.`,
      detail: { channel: w.channel, purpose: w.purpose, locale: w.locale, version, textHash },
    });
    return { id: row.id, version, textHash };
  }
}
