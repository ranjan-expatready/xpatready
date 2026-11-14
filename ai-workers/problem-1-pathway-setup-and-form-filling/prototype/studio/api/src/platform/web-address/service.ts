// PF-25 (rows rev 15, rev 16; SA-2-27, SA2-D8, AG-4-16, AG-4-17, AG01-1): each firm's own web address.
//   * availability and suggestion: what a person typing an address at sign-up sees (PF-5's sign-up, PF-5s's field);
//   * claimAtSignUp: the address a new firm chose, set once inside the sign-up's own transaction (PF-5);
//   * change: afterwards only ExpatReady staff (key system/firm:address, PF-4s; PF-17's console) change it, with a
//     reason; the old address redirects (301) for 90 days on the clock and no other firm may take it meanwhile;
//   * resolveHost: a request's host → the firm whose public pages it serves (its id only, AG-4-17), a redirect to the
//     firm's current address, ExpatReady's own site, or nothing (the one plain not-found).
// Ports (PF-0p): ClockPort for every time decision, AuditPort inside the change's own transaction (a failed audit line
// rolls the change back), StaffContext as the caller. The database refuses what this refuses too (migration
// 20261114230000_pf25_web_address): shape, reserved names, a held address, a change without its redirect record.
import { HttpException, HttpStatus } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { AuditPort } from "../../../../ports/audit.ts";
import type { ClockPort } from "../../../../ports/clock.ts";
import type { StaffContext } from "../../../../ports/staff.ts";
import { firmScope } from "../firm-scope.ts";
import { REDIRECT_DAYS, addressBaseFromName, candidate, checkAddressShape, readHost, type AddressRefusal } from "./rules.ts";

type Tx = Prisma.TransactionClient;
export type WebAddressDeps = { db: PrismaClient; audit: AuditPort<Tx>; clock: ClockPort };

/** ExpatReady staff's key for changing a firm's address after sign-up (SA-2-27; SA-06 system/* keys, PF-4s). A firm's
 *  own staff hold agent/* keys only (SA-6-4), so they never have it. */
export const ADDRESS_CHANGE_KEY = "system/firm:address";
/** The firm states whose public pages an address serves (AG-4-17 "an active firm"; Sample until the founder rules on
 *  PAYMENT_HOLD and SECURITY_LOCK). Any other state answers like an unknown address. */
export const SERVING_STATUSES = ["TRIAL", "ACTIVE"] as const;
/** How many numbered suggestions are tried before giving up (`maple-2` … `maple-50`). */
const SUGGESTION_TRIES = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

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

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export class WebAddresses {
  constructor(private readonly deps: WebAddressDeps) {}

  /** Who holds an address now: a firm whose address it is, or a firm that gave it up less than 90 days ago (on the
   *  clock). `firmId` null: free. */
  async holderOf(db: PrismaClient | Tx, address: string): Promise<{ firmId: string; current: boolean } | null> {
    const own = await db.platformFirmWebAddress.findUnique({ where: { address }, select: { firmId: true } });
    if (own) return { firmId: own.firmId, current: true };
    const held = await db.platformFirmAddressHistory.findFirst({ where: { oldAddress: address, until: { gt: this.deps.clock.now() } }, orderBy: { changedAt: "desc" }, select: { firmId: true } });
    return held ? { firmId: held.firmId, current: false } : null;
  }

  /** Whether `input` can be a firm's address (exactly as typed). Refused: the plain reason, and a suggestion when one can
   *  be made from what was typed. `forFirmId`: the firm asking (its own address and its own held ones count as free). */
  async availability(input: unknown, forFirmId?: string): Promise<Availability> {
    const typed = typeof input === "string" ? input.slice(0, 200) : "";
    const shape = checkAddressShape(input);
    if (!shape.ok) {
      const base = typed.trim() ? addressBaseFromName(typed) : null;
      return { address: typed, available: false, reason: shape.reason, message: shape.message, suggestion: base ? await this.firstFree(base, forFirmId) : null };
    }
    const holder = await this.holderOf(this.deps.db, shape.address);
    if (!holder || (forFirmId && holder.firmId === firmScope(forFirmId).firmId)) return { address: shape.address, available: true };
    return { address: shape.address, available: false, reason: "taken", message: "This address is taken.", suggestion: await this.firstFree(shape.address, forFirmId) };
  }

  /** A free address made from a firm's operating name (`Maple Immigration Inc.` → `maple-immigration`). */
  async suggest(operatingName: unknown): Promise<{ suggestion: string | null }> {
    if (typeof operatingName !== "string" || !operatingName.trim() || operatingName.length > 200) return { suggestion: null };
    return { suggestion: await this.firstFree(addressBaseFromName(operatingName)) };
  }

  private async firstFree(base: string, forFirmId?: string): Promise<string | null> {
    for (let n = 1; n <= SUGGESTION_TRIES; n++) {
      const c = candidate(base, n);
      if (!checkAddressShape(c).ok) continue;
      const holder = await this.holderOf(this.deps.db, c);
      if (!holder || (forFirmId && holder.firmId === forFirmId.toLowerCase())) return c;
    }
    return null;
  }

  /** The address a new firm chose at sign-up (PF-5), set once, inside the sign-up's transaction. A firm that has an
   *  address is refused: afterwards only ExpatReady staff change it. */
  async claimAtSignUp(tx: Tx, firmId: string, address: string, actor: string): Promise<void> {
    const id = firmScope(firmId).firmId;
    const shape = checkAddressShape(address);
    if (!shape.ok) problem(422, "web-address", "Check the web address", shape.message, { fields: { webAddress: shape.message } });
    if (!(await tx.platformFirm.findUnique({ where: { id }, select: { id: true } }))) problem(404, "not-found", "Not found", "No such firm.");
    await tx.$executeRaw`select platform_web_address_lock(${address})`;
    if (await tx.platformFirmWebAddress.findUnique({ where: { firmId: id }, select: { firmId: true } }))
      problem(409, "web-address-set", "This firm already has a web address", "After sign-up, only ExpatReady staff change a firm's web address.");
    const holder = await this.holderOf(tx, address);
    if (holder && holder.firmId !== id) problem(409, "web-address-taken", "This address is taken", "This address is taken.", { suggestion: await this.firstFree(address, id) });
    await tx.platformFirmWebAddress.create({ data: { firmId: id, address, setBy: actor } });
    await this.deps.audit.record(tx, { firmId: id, actor, action: "firm.web_address.set", entity: "platform_firm", entityKey: id, summary: `Web address set to ${address} at sign-up.`, detail: { address } });
  }

  /** ExpatReady staff change a firm's address (SA-2-27): their key, a reason, one transaction with the redirect record,
   *  the address and one audit line (a failed audit line rolls all of it back). */
  async change(ctx: StaffContext, firmId: string, input: { address?: unknown; reason?: unknown }) {
    if (!ctx.keys.includes(ADDRESS_CHANGE_KEY))
      problem(403, "forbidden", "Only ExpatReady staff change this", "After sign-up, a firm's web address is changed only by ExpatReady staff. Ask ExpatReady support.", { code: "MISSING_PERMISSION" });
    const id = firmScope(firmId).firmId;
    const fields: Record<string, string> = {};
    const shape = checkAddressShape(input.address);
    if (!shape.ok) fields.address = shape.message;
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (reason.length < 3) fields.reason = "Give the reason for the change (at least 3 characters).";
    else if (reason.length > 500) fields.reason = "Keep the reason to 500 characters.";
    else if (CONTROL.test(reason)) fields.reason = "Remove the control characters.";
    if (Object.keys(fields).length) problem(422, "web-address-fields", "Check the highlighted fields", "Some fields need a change.", { fields });
    const address = (shape as { address: string }).address;
    const actor = `staff:${ctx.staffId}`;
    const now = this.deps.clock.now();
    const until = new Date(now.getTime() + REDIRECT_DAYS * DAY_MS);
    return this.deps.db.$transaction(async (tx) => {
      // Lock the firm's row, then both addresses in one order (the database's triggers take the same locks).
      const rows = await tx.$queryRaw<{ address: string | null }[]>`select w.address from platform_firm f left join platform_firm_web_address w on w.firm_id = f.id where f.id = ${id}::uuid for update of f`;
      if (!rows.length) problem(404, "not-found", "Not found", "No such firm.");
      const old = rows[0].address;
      if (old === address) problem(409, "web-address-same", "Nothing to change", `${address} is already this firm's web address.`);
      for (const a of [old, address].filter((x): x is string => !!x).sort()) await tx.$executeRaw`select platform_web_address_lock(${a})`;
      const holder = await this.holderOf(tx, address);
      if (holder && holder.firmId !== id) problem(409, "web-address-taken", "This address is taken", "This address is taken.", { suggestion: await this.firstFree(address, id) });
      const history = old ? await tx.platformFirmAddressHistory.create({ data: { firmId: id, oldAddress: old, newAddress: address, until, reason, changedBy: actor } }) : null;
      if (old) await tx.platformFirmWebAddress.update({ where: { firmId: id }, data: { address, setBy: actor } });
      else await tx.platformFirmWebAddress.create({ data: { firmId: id, address, setBy: actor } });
      await this.deps.audit.record(tx, {
        firmId: id, actor, action: "firm.web_address.changed", entity: "platform_firm", entityKey: id,
        summary: old ? `Web address changed from ${old} to ${address}; ${old} redirects to it until ${until.toISOString().slice(0, 10)}.` : `Web address set to ${address}.`,
        detail: { historyId: history?.id ?? null, oldAddress: old, newAddress: address, until: history ? until.toISOString() : null },
      });
      return { firmId: id, address, oldAddress: old, redirectUntil: history ? until.toISOString() : null };
    });
  }

  /** The firm a request's host serves (AG-4-17: its id only). A current address of a serving firm → that firm; an
   *  address the firm gave up less than 90 days ago (on the clock) → a redirect to its current one; anything else under
   *  a firm suffix → unknown; ExpatReady's own hosts → main. */
  async resolveHost(hostHeader: unknown): Promise<HostAnswer> {
    const host = readHost(hostHeader);
    if (host.kind === "main") return host;
    if (host.kind === "none") return { kind: "unknown" };
    const serving = [...SERVING_STATUSES];
    const own = await this.deps.db.platformFirmWebAddress.findUnique({ where: { address: host.address }, select: { firmId: true, firm: { select: { status: true } } } });
    if (own) return (serving as string[]).includes(own.firm.status) ? { kind: "firm", firmId: own.firmId, address: host.address } : { kind: "unknown" };
    const held = await this.deps.db.platformFirmAddressHistory.findFirst({
      where: { oldAddress: host.address, until: { gt: this.deps.clock.now() } }, orderBy: { changedAt: "desc" },
      select: { firm: { select: { webAddress: { select: { address: true } }, status: true } } },
    });
    const to = held?.firm.webAddress?.address;
    if (!to || !(serving as string[]).includes(held.firm.status)) return { kind: "unknown" };
    return { kind: "redirect", address: to, suffix: host.suffix, port: host.port };
  }
}
