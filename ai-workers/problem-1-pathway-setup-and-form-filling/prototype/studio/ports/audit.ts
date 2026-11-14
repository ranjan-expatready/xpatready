// PF-0p (rows rev 16, P-576, P-600): the audit port. One trail (contracts §7 §0, Lead 37's ruling): every changing
// transaction calls AuditPort.record(tx, entry) inside the caller's own transaction, so a failed audit line rolls the
// change back (fail-closed). The interim adapter writes audit_event's existing columns (api/src/platform/audit/
// audit-event.ts); AUD-1 swaps the adapter (firm_id column, insert-only trigger, hash chain) and this port stays.
// This folder imports only zod and its own files (case-side contract v0.1 §1 rule 3).
import { z } from "zod";

/** A firm id: the same lenient uuid form firmScope accepts (api/src/platform/firm-scope.ts). */
export const FirmId = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "a firm id (uuid)");

/** Who did it: `staff:<staff id>` (a signed-in staff member, PF-4's actor word), `system:<door>` (a job, a webhook, a
 *  public door) or `seed:<row>` (a seed or a demo loader). */
export const AuditActor = z.string().regex(/^(staff|system|seed):[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/, "staff:<id>, system:<door> or seed:<row>");

const EMAILISH = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const DetailScalar = z.union([z.string().max(200), z.number(), z.boolean(), z.null()]);
/** Ids and facts only, never personal data (no names, emails, phone numbers, licence numbers, addresses): flat values, a
 *  string at most 200 characters, and nothing shaped like an email address (the mechanical floor; ids-only is the
 *  caller's duty). */
export const AuditDetail = z
  .record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/, "a field name"), z.union([DetailScalar, z.array(DetailScalar).max(50)]))
  .refine((d) => !Object.values(d).flat().some((v) => typeof v === "string" && EMAILISH.test(v)), "detail holds ids only: no email address");

export const AuditEntry = z.strictObject({
  firmId: FirmId,
  actor: AuditActor,
  /** What happened, a dotted verb (`staff.role.granted`, `retainer.sent`). */
  action: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, "a dotted lower-case action").max(120),
  /** The table or thing changed (`platform_staff`, `fo_retainer`). */
  entity: z.string().regex(/^[a-z][a-z0-9_]*$/, "a lower-case entity name").max(120),
  /** The changed row's id or key. */
  entityKey: z.string().min(1).max(200),
  /** One plain sentence a person reads in the trail (at most 600 characters). */
  summary: z.string().trim().min(1).max(600),
  detail: AuditDetail.default({}),
});
export type AuditEntry = z.input<typeof AuditEntry>;

/** The port. `Tx` is the caller's transaction (a Prisma transaction client in the API); the port never opens its own. */
export interface AuditPort<Tx = unknown> {
  /** Records one line inside `tx`. Throws on a refused entry or a failed write, so the caller's transaction rolls back. */
  record(tx: Tx, entry: AuditEntry): Promise<void>;
}

/** The forced failure of the fake (a test's `failOn` matched). */
export class AuditFailure extends Error {
  constructor(readonly entry: AuditEntry) { super(`forced audit failure: ${entry.action} ${entry.entity}/${entry.entityKey}`); this.name = "AuditFailure"; }
}

export type FakeAudit = AuditPort<unknown> & {
  /** The lines recorded, in order (a line whose transaction the test discarded is gone). */
  readonly entries: ReadonlyArray<z.output<typeof AuditEntry>>;
  /** How many records were refused by `failOn`. */
  readonly failures: number;
  /** Drops the lines recorded under `tx` (a test standing in for a rolled-back transaction). */
  discard(tx: unknown): void;
  /** Runs `fn` with a fresh in-memory transaction token: its lines stay only if `fn` resolves. */
  transaction<T>(fn: (tx: object) => Promise<T>): Promise<T>;
};

/** The fake: validates like the real adapter, records in memory, and throws AuditFailure when `failOn` matches, so each
 *  row can prove "a forced audit failure rolls the change back" (call it inside the row's real transaction). */
export function fakeAudit(opts: { failOn?: (e: z.output<typeof AuditEntry>) => boolean } = {}): FakeAudit {
  const rows: { tx: unknown; entry: z.output<typeof AuditEntry> }[] = [];
  let failures = 0;
  const fake: FakeAudit = {
    async record(tx, entry) {
      const e = AuditEntry.parse(entry);
      if (opts.failOn?.(e)) { failures++; throw new AuditFailure(entry); }
      rows.push({ tx, entry: e });
    },
    get entries() { return rows.map((r) => r.entry); },
    get failures() { return failures; },
    discard(tx) { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].tx === tx) rows.splice(i, 1); },
    async transaction(fn) {
      const tx = {};
      try { return await fn(tx); } catch (err) { fake.discard(tx); throw err; }
    },
  };
  return fake;
}
