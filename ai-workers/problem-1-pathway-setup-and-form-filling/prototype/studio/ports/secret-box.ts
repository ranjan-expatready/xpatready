// PF-24 (rows rev 15/16; SA-08 §3.1, SA-8-3, NFR5-05 until X-27): SecretBoxPort, the one door for a firm's or a person's
// own connection credentials (FO-3v's Zoom tokens, FO-3s's calendar tokens, a mailbox app password). zod and types only
// (case-side contract v0.1 §1 rule 3): no Prisma, Nest or app import. The real adapter is
// api/src/platform/secret-box/aes-gcm.ts (AES-256-GCM, node:crypto); `fakeSecretBox` below is for other rows' tests.
//
// What every adapter promises:
//  * a sealed value is one string a caller stores in its own column; it names its key version, so a key rotation finds
//    and re-seals it (the re-encrypt job, api/src/platform/secret-box/reencrypt.ts) and the old key is then retired;
//  * a value is sealed for one owner (firm, optional person, purpose) and opens only for that same owner: firm A's
//    credentials never open for firm B, and a token sealed for "zoom" never opens as "calendar";
//  * a tampered value, or one whose key version is no longer held, is refused (SecretRefused), never half-read;
//  * nothing here is ever put in a response: routes show `maskedHint` (taken when the value is sealed) and the key
//    version, never the value (SA-08 §3.1 "shown only as a masked hint").
import { z } from "zod";

/** Whose credential a sealed value is. Bound into the seal: opening it with any other owner is refused. */
export const SecretOwner = z.object({
  firmId: z.string().min(1, "firmId is required"),
  /** A person's own credential (a staff member's calendar); null or absent for a firm-wide one. */
  personId: z.string().min(1).nullish(),
  /** What the credential is for, e.g. "zoom", "calendar", "mailbox" (lower-case words and dashes). */
  purpose: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/, "purpose: lower-case letters, digits and dashes"),
});
export type SecretOwner = z.infer<typeof SecretOwner>;

/** A sealed value as stored: `<scheme>.v<keyVersion>.<…>`; the scheme says which adapter made it. */
export const SealedSecret = z.string().regex(/^(sb1|fake1)\.v[1-9][0-9]{0,5}\.[A-Za-z0-9_.-]+$/, "not a sealed secret");
export type SealedSecret = z.infer<typeof SealedSecret>;

/** What a route may show about a stored credential: never the value. */
export const MaskedSecretView = z.object({
  connected: z.boolean(),
  hint: z.string().regex(/^••••[A-Za-z0-9_-]{0,4}$/),
  keyVersion: z.number().int().positive().nullable(),
}).strict();
export type MaskedSecretView = z.infer<typeof MaskedSecretView>;

export type SecretRefusedCode = "TAMPERED_OR_OTHER_OWNER" | "KEY_RETIRED" | "NOT_SEALED" | "NOT_CONFIGURED";
/** A value the box will not open or seal. The message never holds the value, a key or a ciphertext. */
export class SecretRefused extends Error {
  constructor(readonly code: SecretRefusedCode, message: string) { super(message); this.name = "SecretRefused"; }
}

export interface SecretBoxPort {
  /** The key version new values are sealed with. */
  currentVersion(): number;
  /** Seals `plain` for `owner` with the current key. */
  seal(owner: SecretOwner, plain: string): SealedSecret;
  /** Opens a value sealed for exactly this owner; refuses (SecretRefused) a tampered value, another owner's or a retired key's. */
  open(owner: SecretOwner, sealed: SealedSecret): string;
  /** The key version a sealed value names (no key needed). */
  versionOf(sealed: SealedSecret): number;
  /** Re-seals with the current key (open, then seal); the same value back when it is already current. */
  reseal(owner: SecretOwner, sealed: SealedSecret): SealedSecret;
}

/** Version from `<scheme>.v<n>.…`, or SecretRefused NOT_SEALED. Shared by every adapter. */
export function sealedVersion(sealed: string): number {
  const m = /^(?:sb1|fake1)\.v([1-9][0-9]{0,5})\./.exec(typeof sealed === "string" ? sealed : "");
  if (!m) throw new SecretRefused("NOT_SEALED", "Not a sealed secret.");
  return Number(m[1]);
}

/** The masked hint shown in place of a credential: the last 4 characters only for a value of 16 or more, else none. */
export function maskedHint(plain: string): string {
  const tail = plain.length >= 16 ? plain.slice(-4).replace(/[^A-Za-z0-9_-]/g, "") : "";
  return `••••${tail}`;
}

/** The view a route returns for a stored credential (validated, so a value can never slip in by a field name). */
export function maskedView(stored: { sealed: SealedSecret; hint: string } | null): MaskedSecretView {
  return MaskedSecretView.parse(stored ? { connected: true, hint: stored.hint, keyVersion: sealedVersion(stored.sealed) } : { connected: false, hint: "••••", keyVersion: null });
}

/**
 * Where an area keeps its sealed values (FO-3v's Zoom tokens, …). Each area that stores sealed values gives one, and the
 * re-encrypt job walks every store. `swap` is compare-and-set: it replaces only when the row still holds `from`, so a
 * value changed while the job ran is never overwritten with an older one.
 */
export interface SealedValueStore {
  readonly name: string;
  /** The firms that have at least one sealed value here. */
  firms(): Promise<string[]>;
  /** One firm's values, in a stable order, `limit` at a time after `after` (an id, or null for the start). */
  page(firmId: string, after: string | null, limit: number): Promise<{ id: string; owner: SecretOwner; sealed: SealedSecret }[]>;
  swap(id: string, from: SealedSecret, to: SealedSecret): Promise<boolean>;
}

/** The re-encrypt job's name and payload (enqueued on JobPort once per firm and key version). */
export const SECRET_BOX_REENCRYPT_JOB = "platform.secret_box.reencrypt";
export const ReencryptPayload = z.object({ firmId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "a firm id (uuid)"), toVersion: z.number().int().positive() }).strict();
export type ReencryptPayload = z.infer<typeof ReencryptPayload>;

const ownerKey = (o: SecretOwner) => JSON.stringify([o.firmId, o.personId ?? null, o.purpose]);

/**
 * The fake for other rows' tests: no encryption (base64 of the owner and the value), but the same rules: owner bound,
 * version named, a changed value refused, a version not in `versions` refused. Never used by the running app.
 */
export function fakeSecretBox(opts: { current?: number; versions?: number[] } = {}): SecretBoxPort & { rotate(to: number, keep?: number[]): void } {
  let current = opts.current ?? 1;
  let held = new Set(opts.versions ?? [current]);
  const box = {
    currentVersion: () => current,
    rotate(to: number, keep: number[] = [...held]) { current = to; held = new Set([...keep, to]); },
    seal(owner: SecretOwner, plain: string) {
      const o = SecretOwner.parse(owner);
      return `fake1.v${current}.${Buffer.from(JSON.stringify({ o: ownerKey(o), p: plain })).toString("base64url")}`;
    },
    open(owner: SecretOwner, sealed: string) {
      const v = sealedVersion(sealed), o = SecretOwner.parse(owner);
      if (!held.has(v)) throw new SecretRefused("KEY_RETIRED", `Key version ${v} is not held.`);
      let body: { o?: string; p?: string };
      try { body = JSON.parse(Buffer.from(sealed.split(".")[2] ?? "", "base64url").toString("utf8")); } catch { body = {}; }
      if (body.o !== ownerKey(o) || typeof body.p !== "string") throw new SecretRefused("TAMPERED_OR_OTHER_OWNER", "The sealed value was changed or belongs to another owner.");
      return body.p;
    },
    versionOf: sealedVersion,
    reseal(owner: SecretOwner, sealed: string) { return sealedVersion(sealed) === current ? (box.open(owner, sealed), sealed) : box.seal(owner, box.open(owner, sealed)); },
  };
  return box;
}

/** An in-memory SealedValueStore for tests. */
export function memorySealedStore(name = "memory") {
  const rows = new Map<string, { id: string; owner: SecretOwner; sealed: SealedSecret }>();
  return {
    name, rows,
    put(id: string, owner: SecretOwner, sealed: SealedSecret) { rows.set(id, { id, owner, sealed }); },
    async firms() { return [...new Set([...rows.values()].map((r) => r.owner.firmId))].sort(); },
    async page(firmId: string, after: string | null, limit: number) {
      return [...rows.values()].filter((r) => r.owner.firmId === firmId && (after === null || r.id > after)).sort((a, b) => (a.id < b.id ? -1 : 1)).slice(0, limit).map((r) => ({ ...r }));
    },
    async swap(id: string, from: SealedSecret, to: SealedSecret) { const r = rows.get(id); if (!r || r.sealed !== from) return false; r.sealed = to; return true; },
  } satisfies SealedValueStore & Record<string, unknown>;
}
