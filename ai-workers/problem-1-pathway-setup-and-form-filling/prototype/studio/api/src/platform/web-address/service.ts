// PF-25 (rows rev 15, rev 16; SA-2-27, SA2-D8, AG-4-16, AG-4-17, AG01-1): each firm's own web address.
//   * availability and suggestion: what a person typing an address at sign-up sees (PF-5's sign-up, PF-5s's field);
//   * claimAtSignUp: the address a new firm chose, set once inside the sign-up's own transaction (PF-5);
//   * change: afterwards only ExpatReady staff (key system/firm:address, PF-4s; PF-17's console) change it, with a
//     reason kept in the history (also for a firm's first address); the old address redirects (301) for 90 days and no
//     other firm may take it meanwhile;
//   * resolveHost: a request's host → the firm whose public pages it serves (its id only, AG-4-17), a redirect to the
//     firm's current address, ExpatReady's own site, or nothing (the one plain not-found).
// Ports (PF-0p): ClockPort for every time decision here, AuditPort inside the change's own transaction (a failed audit
// line rolls the change back), StaffContext as the caller. The database refuses what this refuses too, on its own clock
// (the same time in production), as the backstop (migration 20261114230000_pf25_web_address); a refusal there that a
// race gets past the checks here is answered 409 like the check itself (break m5, review m1).
import { HttpException, HttpStatus } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuditPort } from "../../../../ports/audit.ts";
import type { ClockPort } from "../../../../ports/clock.ts";
import type { StaffContext } from "../../../../ports/staff.ts";
import { firmScope } from "../firm-scope.ts";
import { addressBaseFromName, candidate, checkAddressChoice, readHost, type AddressRefusal } from "./rules.ts";

type Tx = Prisma.TransactionClient;
export type WebAddressDeps = { db: PrismaClient; audit: AuditPort<Tx>; clock: ClockPort };

/** ExpatReady staff's key for changing a firm's address after sign-up (SA-2-27; SA-06 system/* keys, PF-4s). A firm's
 *  own staff hold agent/* keys only (SA-6-4), so they never have it. */
export const ADDRESS_CHANGE_KEY = "system/firm:address";
/** The firm states whose public pages an address serves (AG-4-17 "an active firm"; Sample until the founder rules on
 *  PAYMENT_HOLD and SECURITY_LOCK). Any other state answers like an unknown address. */
export const SERVING_STATUSES: readonly string[] = ["TRIAL", "ACTIVE"];
/** How many numbered suggestions are tried (`maple-2` … `maple-50`), all in one lookup. */
const SUGGESTION_TRIES = 50;

export type Availability =
  | { address: string; available: true }
  | { address: string; available: false; reason: AddressRefusal | "taken"; message: string; suggestion: string | null };

export type HostAnswer =
  | { kind: "main" }
  | { kind: "firm"; firmId: string; address: string }
  | { kind: "redirect"; address: string; suffix: string; port: string }
  | { kind: "unknown" };

const problem = (status: number, code: string, title: string, detail: string, extra: Record<string, unknown> = {}): never => {
  throw new HttpException({ type: `https://expatready.local/problems/${code}`, title, status, detail, code: code.toUpperCase().replace(/-/g, "_"), ...extra }, status as HttpStatus);
};

/** Spaces of any kind at either end (also no-break and zero-width), and characters a reason may not hold (controls and
 *  direction changes: break m9); the migration's platform_web_address_reason_ok is the same rule. */
const EDGE_SPACE = /^[\s\u00a0\u1680\u180e\u2000-\u200d\u2028\u2029\u202f\u205f\u2060\u3000\ufeff]+|[\s\u00a0\u1680\u180e\u2000-\u200d\u2028\u2029\u202f\u205f\u2060\u3000\ufeff]+$/g;
// eslint-disable-next-line no-control-regex
const BAD_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u180e\u200e\u200f\u202a-\u202e\u2061-\u2064\u2066-\u206f]/;

/** The reason as kept, or the message for the field. */
export function readReason(input: unknown): { ok: true; reason: string } | { ok: false; message: string } {
  if (typeof input !== "string") return { ok: false, message: "Give the reason for the change (at least 3 characters)." };
  if (BAD_CHARS.test(input)) return { ok: false, message: "Remove the control or direction characters." };
  const reason = input.replace(EDGE_SPACE, "");
  if (reason.length < 3) return { ok: false, message: "Give the reason for the change (at least 3 characters)." };
  if (reason.length > 500) return { ok: false, message: "Keep the reason to 500 characters." };
  return { ok: true, reason };
}

/** A database refusal of a taken or held address (the unique index, or the hold trigger), which a race can reach past
 *  the service's own check. */
const isTakenRefusal = (e: unknown) => {
  const x = e as { code?: string; message?: string; cause?: { code?: string; originalCode?: string } };
  return x?.code === "P2002" || x?.cause?.originalCode === "23505" || x?.cause?.code === "23505" || /held for another firm's redirect|platform_firm_web_address_address_key/.test(String(x?.message ?? ""));
};

export class WebAddresses {
  constructor(private readonly deps: WebAddressDeps) {}

  /** Of `addresses`, those another firm has now or held less than 90 days ago on the clock (`forFirmId`'s own count as
   *  free). Two lookups whatever the number. */
  private async takenOf(db: PrismaClient | Tx, addresses: string[], forFirmId?: string): Promise<Set<string>> {
    const self = forFirmId?.toLowerCase();
    const [own, held] = await Promise.all([
      db.platformFirmWebAddress.findMany({ where: { address: { in: addresses } }, select: { address: true, firmId: true } }),
      db.platformFirmAddressHistory.findMany({ where: { oldAddress: { in: addresses }, until: { gt: this.deps.clock.now() } }, select: { oldAddress: true, firmId: true } }),
    ]);
    return new Set([...own.filter((r) => r.firmId !== self).map((r) => r.address), ...held.filter((r) => r.firmId !== self).map((r) => r.oldAddress!)]);
  }

  /** Whether `input` can be a firm's address (exactly as typed). Refused: the plain reason, and a suggestion when one can
   *  be made from what was typed. `forFirmId`: the firm asking (its own address and its own held ones count as free). */
  async availability(input: unknown, forFirmId?: string): Promise<Availability> {
    const typed = typeof input === "string" ? input.slice(0, 200) : "";
    const choice = checkAddressChoice(input);
    if (!choice.ok) {
      const base = typed.trim() ? addressBaseFromName(typed) : null;
      return { address: typed, available: false, reason: choice.reason, message: choice.message, suggestion: base ? await this.firstFree(base, forFirmId) : null };
    }
    if (!(await this.takenOf(this.deps.db, [choice.address], forFirmId && firmScope(forFirmId).firmId)).size) return { address: choice.address, available: true };
    return { address: choice.address, available: false, reason: "taken", message: "This address is taken.", suggestion: await this.firstFree(choice.address, forFirmId) };
  }

  /** A free address made from a firm's operating name (`Maple Immigration Inc.` → `maple-immigration`). */
  async suggest(operatingName: unknown): Promise<{ suggestion: string | null }> {
    if (typeof operatingName !== "string" || !operatingName.trim() || operatingName.length > 200) return { suggestion: null };
    return { suggestion: await this.firstFree(addressBaseFromName(operatingName)) };
  }

  private async firstFree(base: string, forFirmId?: string, db: PrismaClient | Tx = this.deps.db): Promise<string | null> {
    const tries = [...new Set(Array.from({ length: SUGGESTION_TRIES }, (_, i) => candidate(base, i + 1)))].filter((c) => checkAddressChoice(c).ok);
    const taken = await this.takenOf(db, tries, forFirmId);
    return tries.find((c) => !taken.has(c)) ?? null;
  }

  private async taken409(address: string, firmId: string): Promise<never> {
    return problem(409, "web-address-taken", "This address is taken", "This address is taken.", { suggestion: await this.firstFree(address, firmId) });
  }

  /** The address a new firm chose at sign-up (PF-5), set once, inside the sign-up's transaction. A firm that has an
   *  address is refused: afterwards only ExpatReady staff change it. */
  async claimAtSignUp(tx: Tx, firmId: string, address: string, actor: string): Promise<void> {
    const id = firmScope(firmId).firmId;
    const choice = checkAddressChoice(address);
    if (!choice.ok) problem(422, "web-address", "Check the web address", choice.message, { fields: { webAddress: choice.message } });
    // The firm's row first (as change does), then the address: one lock order, so a claim and a change never deadlock.
    if (!(await tx.$queryRaw<unknown[]>`select 1 from platform_firm where id = ${id}::uuid for no key update`).length) problem(404, "not-found", "Not found", "No such firm.");
    await tx.$executeRaw`select platform_web_address_lock(${address})`;
    if (await tx.platformFirmWebAddress.findUnique({ where: { firmId: id }, select: { firmId: true } }))
      problem(409, "web-address-set", "This firm already has a web address", "After sign-up, only ExpatReady staff change a firm's web address.");
    if ((await this.takenOf(tx, [address], id)).size) await this.taken409(address, id);
    try {
      await tx.platformFirmWebAddress.create({ data: { firmId: id, address, setBy: actor } });
    } catch (e) { if (isTakenRefusal(e)) await this.taken409(address, id); throw e; }
    await this.deps.audit.record(tx, { firmId: id, actor, action: "firm.web_address.set", entity: "platform_firm", entityKey: id, summary: `Web address set to ${address} at sign-up.`, detail: { address } });
  }

  /** ExpatReady staff change (or first set) a firm's address (SA-2-27): their key, a reason, one transaction with the
   *  history record (the reason; for a change also the 90-day redirect), the address and one audit line (a failed audit
   *  line rolls all of it back). */
  async change(ctx: StaffContext, firmId: string, input: { address?: unknown; reason?: unknown }) {
    if (!ctx.keys.includes(ADDRESS_CHANGE_KEY))
      problem(403, "forbidden", "Only ExpatReady staff change this", "After sign-up, a firm's web address is changed only by ExpatReady staff. Ask ExpatReady support.", { code: "MISSING_PERMISSION" });
    const id = firmScope(firmId).firmId;
    const fields: Record<string, string> = {};
    const choice = checkAddressChoice(input.address);
    if (!choice.ok) fields.address = choice.message;
    const reason = readReason(input.reason);
    if (!reason.ok) fields.reason = reason.message;
    if (!choice.ok || !reason.ok) return problem(422, "web-address-fields", "Check the highlighted fields", "Some fields need a change.", { fields });
    const address = choice.address;
    const actor = `staff:${ctx.staffId}`;
    try {
      return await this.deps.db.$transaction(async (tx) => {
        // The firm's row is the change's lock (no key update: it blocks no insert naming the firm, review m5); the
        // address is read after it, in its own statement, so a change that waited reads the one before it (break m5).
        if (!(await tx.$queryRaw<unknown[]>`select 1 from platform_firm where id = ${id}::uuid for no key update`).length) problem(404, "not-found", "Not found", "No such firm.");
        const old = (await tx.platformFirmWebAddress.findUnique({ where: { firmId: id }, select: { address: true } }))?.address ?? null;
        if (old === address) problem(409, "web-address-same", "Nothing to change", `${address} is already this firm's web address.`);
        for (const a of [old, address].filter((x): x is string => !!x).sort()) await tx.$executeRaw`select platform_web_address_lock(${a})`;
        if ((await this.takenOf(tx, [address], id)).size) await this.taken409(address, id);
        const history = await tx.platformFirmAddressHistory.create({ data: { firmId: id, oldAddress: old, newAddress: address, reason: reason.reason, changedBy: actor } });
        if (old) await tx.platformFirmWebAddress.update({ where: { firmId: id }, data: { address, setBy: actor } });
        else await tx.platformFirmWebAddress.create({ data: { firmId: id, address, setBy: actor } });
        const until = history.until?.toISOString() ?? null;
        await this.deps.audit.record(tx, {
          firmId: id, actor, action: "firm.web_address.changed", entity: "platform_firm", entityKey: id,
          summary: old ? `Web address changed from ${old} to ${address}; ${old} redirects to it until ${until!.slice(0, 10)}.` : `Web address set to ${address} by ExpatReady staff.`,
          detail: { historyId: history.id, oldAddress: old, newAddress: address, until },
        });
        return { firmId: id, address, oldAddress: old, redirectUntil: until, historyId: history.id };
      });
    } catch (e) {
      if (isTakenRefusal(e)) return this.taken409(address, id);
      throw e;
    }
  }

  /** The firm a request's host serves (AG-4-17: its id only). A current address of a serving firm → that firm; an
   *  address the firm gave up less than 90 days ago (on the clock) → a redirect to its current one; anything else under
   *  a firm suffix → unknown; ExpatReady's own hosts → main. */
  async resolveHost(hostHeader: unknown): Promise<HostAnswer> {
    const host = readHost(hostHeader);
    if (host.kind === "main") return host;
    if (host.kind === "none") return { kind: "unknown" };
    const own = await this.deps.db.platformFirmWebAddress.findUnique({ where: { address: host.address }, select: { firmId: true, firm: { select: { status: true } } } });
    if (own) return SERVING_STATUSES.includes(own.firm.status) ? { kind: "firm", firmId: own.firmId, address: host.address } : { kind: "unknown" };
    const held = await this.deps.db.platformFirmAddressHistory.findFirst({
      where: { oldAddress: host.address, until: { gt: this.deps.clock.now() } }, orderBy: { changedAt: "desc" },
      select: { firm: { select: { webAddress: { select: { address: true } }, status: true } } },
    });
    const to = held?.firm.webAddress?.address;
    if (!to || !SERVING_STATUSES.includes(held.firm.status)) return { kind: "unknown" };
    return { kind: "redirect", address: to, suffix: host.suffix, port: host.port };
  }
}
