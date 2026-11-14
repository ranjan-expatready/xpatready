// FO-3 (AG-4-36, -37, -38; BR-10; FO-1b's fo_booking_token): the self-service link's token. A token is
// `<selector>.<verifier>`: the selector is the token row's id (looked up by primary key, no firm needed), the verifier 32
// random bytes (base64url) of which only the SHA-256 hash is stored, compared in constant time. Several may be live for
// one booking (one per email); the database voids every live one when the booking is cancelled, answered or moved, and a
// token expires when the meeting ends. Every failure (malformed, unknown, wrong verifier, voided, expired, a booking no
// longer active) is the same "not found", so a link tells a guesser nothing.
import type { Prisma } from "@prisma/client";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

type Tx = Prisma.TransactionClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VERIFIER = /^[A-Za-z0-9_-]{43}$/;

export const hashVerifier = (verifier: string) => createHash("sha256").update(verifier, "utf8").digest("hex");

/** Writes a live token for an active booking (expiring at its end) and returns the token the link carries. */
export async function issueToken(tx: Tx, firmId: string, bookingId: string, endsAt: Date): Promise<string> {
  const id = randomUUID(), verifier = randomBytes(32).toString("base64url");
  await tx.foBookingToken.create({ data: { id, firmId, bookingId, tokenHash: hashVerifier(verifier), expiresAt: endsAt } });
  return `${id}.${verifier}`;
}

export function parseToken(raw: unknown): { id: string; verifier: string } | null {
  if (typeof raw !== "string" || raw.length > 100) return null;
  const [id, verifier, extra] = raw.split(".");
  if (extra !== undefined || !UUID.test(id ?? "") || !VERIFIER.test(verifier ?? "")) return null;
  return { id, verifier };
}

/** The live token's row, or null for every kind of failure. `now` is the clock's (expiry is the meeting's end). */
export async function liveToken(db: Tx | Prisma.DefaultPrismaClient, raw: unknown, now: Date): Promise<{ id: string; firmId: string; bookingId: string } | null> {
  const t = parseToken(raw);
  if (!t) return null;
  const row = await db.foBookingToken.findUnique({ where: { id: t.id }, select: { id: true, firmId: true, bookingId: true, tokenHash: true, expiresAt: true, voidedAt: true } });
  const want = Buffer.from(hashVerifier(t.verifier), "hex");
  const have = Buffer.from(row?.tokenHash ?? "0".repeat(64), "hex");
  const same = have.length === want.length && timingSafeEqual(have, want);
  if (!row || !same || row.voidedAt || row.expiresAt.getTime() <= now.getTime()) return null;
  return { id: row.id, firmId: row.firmId, bookingId: row.bookingId };
}
