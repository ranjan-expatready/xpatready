// PF-4 (contracts §1.2 as changed by §7, binding; trace t3 §2): who a token is, and the staff changes with their
// guardrails. Every change runs in one transaction that first locks the firm's row (so two Owners deactivating each other
// at once are taken one after the other and the only-Owner guard holds), writes its audit line in the same transaction
// (audit.ts; a failed line rolls the change back) and writes its module_event row last (PF-3 review m8). Invitation
// lifetimes and expiry are measured with the database's clock (`now()`), never a writer-set time (PF-3 review m6). A
// licence number never appears in an audit line, an event payload or an answer other than the person's own record.
import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";   // applied as calls below the class (keys.ts says why)
import { PlatformRole, type Prisma } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { Db } from "../../core.ts";
import { EVENT, StaffEventPayload } from "../../../../ports/events.ts";
import { firmScope, notInFirm } from "../firm-scope.ts";
import { actorWord, auditInvitation, auditStaff } from "./audit.ts";
import { CognitoIdentity } from "./cognito.ts";
import { FIRM_KEY, dutiesOf, forbidden, problem, unauthorized, type StaffContext } from "./keys.ts";
import { LocalIdentity } from "./local.ts";
import { IdentityRefused, PlatformClock, identityConfig, type IdentityPort } from "./port.ts";

type Tx = Prisma.TransactionClient;
export const IDENTITY_PORT = Symbol("IdentityPort");
export const ROLES = Object.values(PlatformRole) as PlatformRole[];
/** The only-Owner guard's words (contracts §7 §1.2; SA-6-44, AG-1-22): fixed, word for word. */
export const ONLY_OWNER = "This is your firm's only active Owner. Give the Owner role to another person first.";
export const ANOTHER_DEVICE = "You signed in on another device";
/** An Owner change needs an identity check this recent (AG-1-42). */
export const STEP_UP_SECONDS = 5 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The port this server's configuration names (PLATFORM_IDENTITY). Unset: an adapter that refuses every token. */
export function identityPortFromConfig(clock: PlatformClock): IdentityPort {
  const c = identityConfig();
  if (c.identity === "local") return new LocalIdentity(c.localSecret, () => clock.now());
  if (c.identity === "cognito") return new CognitoIdentity(c.cognito);
  return { via: "cognito", async verify() { throw new IdentityRefused("Staff sign-in is not set up on this server (PLATFORM_IDENTITY is not set).", "SIGN_IN_NOT_SET_UP"); } };
}

// --------------------------------------------------------------------------------------------------------- input checks
/** PF-3 review m9: an email with any space, line break, control or invisible format character is refused (not trimmed),
 *  so two addresses that look the same can never sit side by side. */
/** No lone surrogate (broken text would be stored as a replacement character, break m7): encodeURIComponent refuses one. */
const wellFormed = (s: string) => { try { encodeURIComponent(s); return true; } catch { return false; } };
const HIDDEN = /[\s\p{Zs}\p{Zl}\p{Zp}\p{Cc}\p{Cf}\u00ad\u180e\u2000-\u200f\u2028-\u202f\u205f-\u2064\u3000\ufeff]/u;
export function emailOf(v: unknown): string {
  if (typeof v !== "string" || !v) return problem(400, "Check the email", "Give the person's email address.", { code: "EMAIL_REQUIRED" });
  if (HIDDEN.test(v)) return problem(400, "Check the email", "The email contains a space or an invisible character. Type it again without them.", { code: "EMAIL_INVALID" });
  if (v.length > 254 || !/^[^@]{1,64}@[^@.]+(\.[^@.]+)+$/.test(v) || /[<>()[\]\\,;:"]/.test(v)) return problem(400, "Check the email", "That is not an email address (name@example.com).", { code: "EMAIL_INVALID" });
  // Break m5: one spelling per address. Letters typed in two ways (an accent as a separate mark) or full-width letters are
  // refused, so two addresses that look the same cannot both be stored.
  if (!wellFormed(v) || v.normalize("NFKC") !== v) return problem(400, "Check the email", "The email has unusual characters (an accent typed as a separate mark, or full-width letters). Type it again.", { code: "EMAIL_INVALID" });
  return v.toLowerCase();
}
export function rolesOf(v: unknown): PlatformRole[] {
  if (!Array.isArray(v) || !v.length) return problem(400, "Choose a role", "Give at least one role.", { code: "ROLES_REQUIRED" });
  const bad = v.filter((r) => !ROLES.includes(r as PlatformRole));
  if (bad.length) return problem(400, "Choose a role", `Not a role: ${bad.map(String).join(", ").slice(0, 120)}. Roles: ${ROLES.join(", ")}.`, { code: "ROLE_UNKNOWN" });
  if (new Set(v).size !== v.length) return problem(400, "Choose a role", "Each role once.", { code: "ROLE_TWICE" });
  return v as PlatformRole[];
}
/** A reason of 1-200 characters (AG-1-15), after trimming; required where the rule says so. Invisible characters alone are
 *  no reason (break m3); control characters and broken text are refused (break m4, m7). */
const VISIBLE = (s: string) => s.replace(/[\s\p{Z}\p{Cf}]/gu, "").length > 0;
export function reasonOf(v: unknown, required: boolean, what = "reason"): string | null {
  if (v === undefined || v === null || (typeof v === "string" && !VISIBLE(v))) return required ? problem(400, "Give a reason", `Give a ${what} (1 to 200 characters).`, { code: "REASON_REQUIRED" }) : null;
  if (typeof v !== "string") return problem(400, "Give a reason", `The ${what} is text.`, { code: "REASON_REQUIRED" });
  if (/\p{Cc}/u.test(v) || !wellFormed(v)) return problem(400, "Check the reason", `The ${what} contains a control character. Type it again.`, { code: "REASON_INVALID" });
  const t = v.trim();
  if ([...t].length > 200) return problem(400, "Shorten the reason", `The ${what} is at most 200 characters.`, { code: "REASON_TOO_LONG" });
  return t;
}
const textOf = (v: unknown, what: string) => {
  if (typeof v !== "string" || !v.trim() || [...v.trim()].length > 100 || /[\p{Cc}\p{Cf}]/u.test(v) || !wellFormed(v)) return problem(400, "Check the licence record", `Give the ${what} (1 to 100 characters).`, { code: "CREDENTIAL_INVALID" });
  return v.trim();
};

// ---------------------------------------------------------------------------------------------------------- the service
export class PlatformIdentity implements OnModuleInit {
  constructor(private readonly db: Db, readonly port: IdentityPort, private readonly clock: PlatformClock) {}

  async onModuleInit() {
    // Keys warmed at start (tech gate entry 2). A pool that cannot be reached now is fetched on the first request instead.
    if (this.port instanceof CognitoIdentity && this.port.ready) await this.port.warm().catch((e) => console.warn(`platform identity: Cognito keys not fetched at start (${String((e as Error)?.message ?? e).slice(0, 120)}); they are fetched on the first sign-in`));
  }

  /** The guard's work: a bearer token → the staff member, or a 401 at once (deactivated, revoked, no second step). */
  async authenticate(token: string | undefined): Promise<StaffContext> {
    if (!token) return unauthorized("Sign in first: this needs a staff member's session (a bearer token).");
    let id;
    try { id = await this.port.verify(token); } catch (e) { if (e instanceof IdentityRefused) return unauthorized(e.detail, e.code); throw e; }
    if (!id.secondStep) return unauthorized("Two-step sign-in is required for every staff member: finish the second step, then try again.", "TWO_STEP_REQUIRED");
    const where = "staffId" in id.lookup ? (UUID.test(id.lookup.staffId) ? { id: id.lookup.staffId.toLowerCase() } : null) : { identitySubject: id.lookup.identitySubject };
    const staff = where && await this.db.platformStaff.findFirst({ where, include: { firm: { select: { key: true } }, grants: { where: { endedAt: null }, select: { role: true } } } });
    if (!staff) return unauthorized("This sign-in is not a staff member of any firm here.", "UNKNOWN_STAFF");
    if (staff.status !== "ACTIVE") return unauthorized(staff.status === "DEACTIVATED" ? "This staff account has been deactivated. Ask your firm's Owner or Admin." : "This staff account is suspended. Ask your firm's Owner or Admin.", "STAFF_NOT_ACTIVE");
    const authMs = id.authTime * 1000;
    // Cognito: a session with a later sign-in time than the last one seen is a new sign-in, which ends the older one.
    if (id.via === "cognito" && (!staff.lastSignInAt || staff.lastSignInAt.getTime() < authMs)) await this.recordSignIn(staff.firmId, staff.firm.key, staff.id, "cognito", (last) => (last !== null && last >= authMs ? null : authMs));
    const rev = await this.db.platformSessionRevocation.findFirst({ where: firmScope(staff.firmId, { staffId: staff.id }), orderBy: { revokedAt: "desc" } });
    // A session that started at or before the person's last revocation is refused (deactivation, a newer sign-in).
    if (rev && authMs <= rev.revokedAt.getTime()) return unauthorized(rev.reason === "another-device" ? ANOTHER_DEVICE : "This session was ended. Sign in again.", rev.reason === "another-device" ? "SIGNED_IN_ELSEWHERE" : "SESSION_REVOKED");
    const roles = staff.grants.map((g) => g.role);
    const keys = (await this.db.platformRolePermission.findMany({ where: { role: { in: roles } }, select: { permissionKey: true } })).map((k) => k.permissionKey).filter((k) => FIRM_KEY.test(k));
    const set = new Set(keys);
    return { staffId: staff.id, firmId: staff.firmId, firmKey: staff.firm.key, roles, keys: [...set].sort(), duties: dutiesOf(set), authTime: id.authTime, via: id.via };
  }

  /** A new sign-in ends every older session of the person (one session at a time, AG-1-55): one revocation 1 ms before
   *  the new session's sign-in time, so a session that started earlier is refused and this one is not. The person's row is
   *  locked while the time is chosen, so parallel sign-ins are taken one after the other and each ends the one before it
   *  (break m1). atOf: the new session's time (ms) from the last sign-in and the last revocation, or null for none. */
  private async recordSignIn(firmId: string, firmKey: string, staffId: string, via: string, atOf: (lastMs: number | null, revokedMs: number | null) => number | null): Promise<number | null> {
    return this.db.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ last: Date | null }[]>`select last_sign_in_at as last from platform_staff where id = ${staffId}::uuid and firm_id = ${firmScope(firmId).firmId}::uuid for update`;
      if (!row) return null;
      const rev = await tx.platformSessionRevocation.findFirst({ where: firmScope(firmId, { staffId }), orderBy: { revokedAt: "desc" }, select: { revokedAt: true } });
      const atMs = atOf(row.last?.getTime() ?? null, rev?.revokedAt.getTime() ?? null);
      if (atMs === null) return null;   // another request recorded this sign-in already
      const at = new Date(atMs), hadSession = row.last !== null;
      await tx.platformStaff.update({ where: { id: staffId }, data: { lastSignInAt: at } });
      // Always, even on a first recorded sign-in (review r2-m1): an older session that never made a call (Cognito device A
      // signed in before device B) is ended too.
      await tx.platformSessionRevocation.create({ data: { firmId, staffId, revokedAt: new Date(atMs - 1), reason: "another-device" } });
      await auditStaff(tx, { firmId, firmKey, actor: actorWord(staffId), action: "platform.staff.sign_in", entityKey: staffId, summary: `a staff member signed in (${via}); ${hadSession ? "their older session was ended" : "first session"}`, detail: { staffId, via, at: at.toISOString() } });
      return atMs;
    });
  }

  /** The local stand-in's sign-in (POST /api/platform/session/local). */
  async localSignIn(body: { firmKey?: unknown; email?: unknown; actorId?: unknown; secondStep?: unknown }) {
    if (!(this.port instanceof LocalIdentity)) return problem(403, "Not available", "The local sign-in stand-in is off on this server (PLATFORM_IDENTITY is not local).", { code: "LOCAL_SIGN_IN_OFF" });
    if (typeof body.firmKey !== "string" || !body.firmKey) return problem(400, "Choose the firm", "Give the firm key.", { code: "FIRM_REQUIRED" });
    const firm = await this.db.platformFirm.findUnique({ where: { key: body.firmKey }, select: { id: true, key: true } });
    const who = typeof body.actorId === "string" && body.actorId ? { actorId: body.actorId } : { email: emailOf(body.email) };
    const staff = firm && await this.db.platformStaff.findFirst({ where: firmScope(firm.id, who) });
    if (!firm || !staff) return unauthorized("No staff member of that firm signs in with that name.", "UNKNOWN_STAFF");
    if (staff.status !== "ACTIVE") return unauthorized("This staff account is not active. Ask your firm's Owner or Admin.", "STAFF_NOT_ACTIVE");
    if (body.secondStep !== true) return unauthorized("Two-step sign-in is required for every staff member: finish the second step (secondStep: true).", "TWO_STEP_REQUIRED");
    // The new session starts after the last sign-in and the last revocation (a deactivation in the same millisecond).
    const authMs = await this.recordSignIn(firm.id, firm.key, staff.id, "local stand-in", (last, revoked) => Math.max(this.clock.now(), (last ?? 0) + 1, (revoked ?? 0) + 1));
    if (authMs === null) return unauthorized("No staff member of that firm signs in with that name.", "UNKNOWN_STAFF");
    return { token: this.port.issue(staff.id, { authTimeMs: authMs, secondStep: true }), tokenType: "Bearer", expiresIn: 3600, staffId: staff.id, firmKey: firm.key };
  }

  async me(s: StaffContext) {
    const staff = await this.db.platformStaff.findFirst({ where: firmScope(s.firmId, { id: s.staffId }), include: { credential: { select: { id: true } } } });
    if (!staff) return notInFirm("staff member");
    return { staffId: s.staffId, firmId: s.firmId, firmKey: s.firmKey, displayName: staff.displayName, email: staff.email, roles: s.roles, keys: s.keys, duties: s.duties, licensed: !!staff.credential, via: s.via };
  }

  // ------------------------------------------------------------------------------------------------------ shared rules
  /** One transaction holding the firm's row lock. Under the lock the actor is checked again (break m2): a request already
   *  past the guard when its sender was deactivated, or signed in elsewhere, changes nothing. */
  private inFirm<T>(actor: StaffContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const id = firmScope(actor.firmId).firmId;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`select id from platform_firm where id = ${id}::uuid for update`;
      const me = await tx.platformStaff.findFirst({ where: firmScope(id, { id: actor.staffId }), select: { status: true, grants: { where: { endedAt: null }, select: { role: true } } } });
      const rev = await tx.platformSessionRevocation.findFirst({ where: firmScope(id, { staffId: actor.staffId }), orderBy: { revokedAt: "desc" }, select: { revokedAt: true } });
      if (me?.status !== "ACTIVE" || (rev && actor.authTime * 1000 <= rev.revokedAt.getTime())) unauthorized("Your session ended before this change was made. Sign in again.", "SESSION_REVOKED");
      // Review m3: roles changed since the guard read them (someone who just lost the Owner role cannot still give it).
      if ([...me.grants.map((g) => g.role)].sort().join() !== [...actor.roles].sort().join()) problem(409, "Your roles changed", "Your roles changed while this was being sent. Nothing was saved; try again.", { code: "ROLES_CHANGED" });
      return fn(tx);
    });
  }

  /** Seats used = ACTIVE + SUSPENDED staff + invitations neither accepted, revoked nor expired (database clock); the
   *  limit is the live subscription's plan (AG-1-13, AG1-D3). Over it: 409 PLAN_LIMIT_REACHED. */
  private async seatCheck(tx: Tx, firmId: string, adding = 1) {
    const sub = await tx.platformSubscription.findFirst({ where: firmScope(firmId, { status: { not: "ENDED" as const } }), include: { plan: { select: { seatsLimit: true, name: true } } } });
    const [{ used }] = await tx.$queryRaw<{ used: number }[]>`select ((select count(*) from platform_staff where firm_id = ${firmId}::uuid and status in ('ACTIVE','SUSPENDED'))
      + (select count(*) from platform_invitation where firm_id = ${firmId}::uuid and accepted_at is null and revoked_at is null and expires_at > now()))::int as used`;
    const limit = sub?.plan.seatsLimit ?? 0;
    if (used + adding > limit) problem(409, "Plan limit reached", sub
      ? `Your plan (${sub.plan.name}) allows ${limit} ${limit === 1 ? "person" : "people"}, counting active, suspended and invited people (${used} now). Revoke a pending invitation or deactivate someone first, or change the plan.`
      : "Your firm has no live subscription, so nobody can be added.", { code: "PLAN_LIMIT_REACHED", seatsLimit: limit, seatsUsed: used });
  }

  /** The guardrails on giving or removing roles (contracts §7 §1.2; SA-6-29, AG-1-60, -66, -42). */
  private async roleRules(actor: StaffContext, targetId: string | null, added: PlatformRole[], removed: PlatformRole[], reason: string | null, tx: Tx) {
    if (targetId === actor.staffId) forbidden("Nobody changes their own roles. Ask another Owner or Admin.", "OWN_ROLES");
    if (added.includes("OWNER") || removed.includes("OWNER")) {
      if (!actor.roles.includes("OWNER")) forbidden("Only an Owner gives or removes the Owner role.", "OWNER_ONLY");
      if (!reason) problem(400, "Give a reason", "Giving or removing the Owner role needs a written reason.", { code: "REASON_REQUIRED" });
      this.stepUp(actor, "giving or removing the Owner role");
    }
    if (added.length) {
      const held = new Set(actor.keys);
      const needed = await tx.platformRolePermission.findMany({ where: { role: { in: added } }, select: { role: true, permissionKey: true } });
      const beyond = [...new Set(needed.filter((k) => !held.has(k.permissionKey)).map((k) => k.role))];
      if (beyond.length) forbidden(`You can give only roles whose every permission you hold yourself; ${beyond.join(", ")} holds permissions you do not.`, "ROLE_BEYOND_OWN_KEYS");
    }
  }

  /** An Owner-level change needs an identity check (sign-in) in the last 5 minutes (AG-1-42). */
  private stepUp(actor: StaffContext, what: string) {
    if (this.clock.now() / 1000 - actor.authTime > STEP_UP_SECONDS) forbidden(`Confirm it is you first: ${what} needs an identity check in the last 5 minutes. Sign in again, then retry.`, "STEP_UP_REQUIRED");
  }

  /** The only-Owner guard (SA-6-44, AG-1-22, BR-27): refusing writes an audit line of its own, kept although the change is
   *  refused. Called inside the locked transaction; returns true when the change must be refused. */
  private async onlyOwner(tx: Tx, actor: StaffContext, targetId: string): Promise<boolean> {
    const owners = await tx.platformRoleGrant.findMany({ where: firmScope(actor.firmId, { role: "OWNER" as const, endedAt: null, staff: { status: "ACTIVE" as const } }), select: { staffId: true } });
    return owners.length === 1 && owners[0].staffId === targetId;
  }
  private async refuseOnlyOwner(actor: StaffContext, targetId: string, attempted: string): Promise<never> {
    await this.db.$transaction(async (tx) => auditStaff(tx, { firmId: actor.firmId, firmKey: actor.firmKey, actor: actorWord(actor.staffId), action: "platform.staff.only_owner_refused", entityKey: targetId, summary: `refused: ${attempted} the firm's only active Owner`, detail: { staffId: targetId, attempted } }));
    return forbidden(ONLY_OWNER, "ONLY_OWNER");
  }

  private async target(tx: Tx, firmId: string, id: string) {
    if (!UUID.test(id)) return notInFirm("staff member");
    const t = await tx.platformStaff.findFirst({ where: firmScope(firmId, { id: id.toLowerCase() }), include: { grants: { where: { endedAt: null } } } });
    return t ?? notInFirm("staff member");
  }

  // --------------------------------------------------------------------------------------------------------- the changes
  async changeRoles(actor: StaffContext, id: string, body: { roles?: unknown; reason?: unknown }) {
    const to = rolesOf(body.roles), reason = reasonOf(body.reason, false);
    let refuse = false;
    const out = await this.inFirm(actor, async (tx) => {
      const t = await this.target(tx, actor.firmId, id);
      const from = t.grants.map((g) => g.role);
      const added = to.filter((r) => !from.includes(r)), removed = from.filter((r) => !to.includes(r));
      await this.roleRules(actor, t.id, added, removed, reason, tx);
      if (!added.length && !removed.length) return { staffId: t.id, roles: from, changed: false };
      if (removed.includes("OWNER") && t.status === "ACTIVE" && await this.onlyOwner(tx, actor, t.id)) { refuse = true; return null; }
      const now = new Date(this.clock.now());
      for (const g of t.grants.filter((g) => removed.includes(g.role))) await tx.platformRoleGrant.update({ where: { id: g.id }, data: { endedAt: now, endedBy: actorWord(actor.staffId), endReason: reason ?? "roles changed" } });
      for (const role of added) await tx.platformRoleGrant.create({ data: { firmId: actor.firmId, staffId: t.id, role, grantedBy: actorWord(actor.staffId), grantedAt: now } });
      await auditStaff(tx, { firmId: actor.firmId, firmKey: actor.firmKey, actor: actorWord(actor.staffId), action: "platform.staff.roles_changed", entityKey: t.id, summary: `roles changed: ${from.join(", ") || "none"} → ${to.join(", ")}`, detail: { staffId: t.id, before: from, after: to, reason } });
      await tx.moduleEvent.create({ data: { firmId: actor.firmId, type: EVENT.STAFF_ROLES_CHANGED, subjectId: t.id, payload: StaffEventPayload.parse({ staffId: t.id }) } });   // last (m8)
      return { staffId: t.id, roles: to, changed: true };
    });
    if (refuse) return this.refuseOnlyOwner(actor, id.toLowerCase(), "removing the Owner role from");
    return out!;
  }

  async deactivate(actor: StaffContext, id: string, body: { reason?: unknown }) {
    const reason = reasonOf(body.reason, true, "deactivation reason")!;
    let refuse = false;
    const out = await this.inFirm(actor, async (tx) => {
      const t = await this.target(tx, actor.firmId, id);
      if (t.status === "DEACTIVATED") return problem(409, "Already deactivated", "This person is already deactivated.", { code: "ALREADY_DEACTIVATED" });
      const isOwner = t.grants.some((g) => g.role === "OWNER");
      // An Owner is deactivated only by an Owner (the Owner role is protected the same way, SA-6-29; else an Admin could
      // remove an Owner by deactivating them).
      if (isOwner && !actor.roles.includes("OWNER")) forbidden("Only an Owner deactivates an Owner.", "OWNER_ONLY");
      if (isOwner) this.stepUp(actor, "deactivating an Owner");   // break M3: the same check as removing the Owner role
      if (isOwner && t.status === "ACTIVE" && await this.onlyOwner(tx, actor, t.id)) { refuse = true; return null; }
      const now = new Date(this.clock.now());
      await tx.platformStaff.update({ where: { id: t.id }, data: { status: "DEACTIVATED", deactivationReason: reason } });
      await tx.platformSessionRevocation.create({ data: { firmId: actor.firmId, staffId: t.id, revokedAt: now, reason: "deactivated" } });
      await auditStaff(tx, { firmId: actor.firmId, firmKey: actor.firmKey, actor: actorWord(actor.staffId), action: "platform.staff.deactivated", entityKey: t.id, summary: "a staff member was deactivated; their sessions ended at once", detail: { staffId: t.id, from: t.status, reason } });
      await tx.moduleEvent.create({ data: { firmId: actor.firmId, type: EVENT.STAFF_DEACTIVATED, subjectId: t.id, payload: StaffEventPayload.parse({ staffId: t.id }) } });   // last (m8)
      return { staffId: t.id, status: "DEACTIVATED" as const };
    });
    if (refuse) return this.refuseOnlyOwner(actor, id.toLowerCase(), "deactivating");
    return out!;
  }

  async reactivate(actor: StaffContext, id: string, body: { reason?: unknown }) {
    const reason = reasonOf(body.reason, true, "reactivation reason")!;
    return this.inFirm(actor, async (tx) => {
      const t = await this.target(tx, actor.firmId, id);
      if (t.status !== "DEACTIVATED") return problem(409, "Not deactivated", "Only a deactivated person can be reactivated.", { code: "NOT_DEACTIVATED" });
      if (t.grants.some((g) => g.role === "OWNER") && !actor.roles.includes("OWNER")) forbidden("Only an Owner reactivates an Owner.", "OWNER_ONLY");
      if (t.grants.some((g) => g.role === "OWNER")) this.stepUp(actor, "reactivating an Owner");   // break M3
      await this.seatCheck(tx, actor.firmId);
      await tx.platformStaff.update({ where: { id: t.id }, data: { status: "ACTIVE", deactivationReason: null } });
      await auditStaff(tx, { firmId: actor.firmId, firmKey: actor.firmKey, actor: actorWord(actor.staffId), action: "platform.staff.reactivated", entityKey: t.id, summary: "a staff member was reactivated (they sign in again)", detail: { staffId: t.id, reason } });
      return { staffId: t.id, status: "ACTIVE" as const };
    });
  }

  /** A person's licence record (AG-1-30, -31): their own without a key, anyone's with agent/firm-credential:manage. */
  async saveCredential(actor: StaffContext, id: string, body: { representativeType?: unknown; licensingBody?: unknown; licenceNumber?: unknown }) {
    const own = id.toLowerCase() === actor.staffId;
    const data = { representativeType: textOf(body.representativeType, "representative type"), licensingBody: textOf(body.licensingBody, "licensing body"), licenceNumber: textOf(body.licenceNumber, "licence number") };
    return this.inFirm(actor, async (tx) => {
      const t = await this.target(tx, actor.firmId, id);   // another firm's id: 404 first, whatever the key (break m6)
      if (!own && !actor.keys.includes("agent/firm-credential:manage")) forbidden("You can change only your own licence record.", "NOT_ALLOWED");
      const before = await tx.platformStaffCredential.findFirst({ where: firmScope(actor.firmId, { staffId: t.id }) });
      const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => !before || before[k] !== data[k]);
      await tx.platformStaffCredential.upsert({ where: { firmId_staffId: { firmId: actor.firmId, staffId: t.id } }, create: { firmId: actor.firmId, staffId: t.id, ...data, updatedBy: actorWord(actor.staffId) }, update: { ...data, updatedBy: actorWord(actor.staffId) } });
      // Field names only: the licence number itself is never written to an audit line (AG-1-31).
      await auditStaff(tx, { firmId: actor.firmId, firmKey: actor.firmKey, actor: actorWord(actor.staffId), action: "platform.staff.credential_saved", entityKey: t.id, summary: `a licence record was ${before ? "changed" : "added"} (${own ? "their own" : "by an Owner or Admin"})`, detail: { staffId: t.id, fieldsChanged: changed, own } });
      return { staffId: t.id, representativeType: data.representativeType, licensingBody: data.licensingBody, saved: true };
    });
  }

  // ------------------------------------------------------------------------------------------------------- invitations
  private static token() { const token = randomBytes(32).toString("base64url"); return { token, hash: createHash("sha256").update(token).digest("hex") }; }

  /** Inserts an invitation measured from the database's clock (72 hours from now()); the token is kept only as a hash and
   *  is not returned (contracts §7: no token returned by a route; PF-4b's MailPort sends the link). */
  private async insertInvitation(tx: Tx, firmId: string, email: string, roles: PlatformRole[], by: string) {
    const { hash } = PlatformIdentity.token();
    const [row] = await tx.$queryRaw<{ id: string; expires_at: Date; created_at: Date }[]>`insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at)
      values (gen_random_uuid(), ${firmId}::uuid, ${email}, ${roles}::"PlatformRole"[], ${hash}, ${by}, now() + interval '72 hours') returning id, expires_at, created_at`;
    return row;
  }

  async invite(actor: StaffContext, body: { email?: unknown; roles?: unknown; reason?: unknown }) {
    const email = emailOf(body.email), roles = rolesOf(body.roles), reason = reasonOf(body.reason, false);
    return this.inFirm(actor, async (tx) => {
      await this.roleRules(actor, null, roles, [], reason, tx);
      if (await tx.platformStaff.findFirst({ where: firmScope(actor.firmId, { email }), select: { id: true } })) problem(409, "Already on your staff", "This person is already on your firm's staff.", { code: "ALREADY_STAFF" });
      const [{ open }] = await tx.$queryRaw<{ open: number }[]>`select count(*)::int as open from platform_invitation where firm_id = ${actor.firmId}::uuid and email = ${email} and accepted_at is null and revoked_at is null and expires_at > now()`;
      if (open) problem(409, "Already invited", "This person already has a pending invitation: resend it instead.", { code: "ALREADY_INVITED" });
      await this.seatCheck(tx, actor.firmId);
      const row = await this.insertInvitation(tx, actor.firmId, email, roles, actorWord(actor.staffId));
      await auditInvitation(tx, { firmId: actor.firmId, firmKey: actor.firmKey, actor: actorWord(actor.staffId), action: "platform.invitation.created", entityKey: row.id, summary: `an invitation was sent (${roles.join(", ")}; 72 hours)`, detail: { invitationId: row.id, roles, reason } });
      return { id: row.id, email, roles, status: "PENDING" as const, expiresAt: row.expires_at };
    });
  }

  async invitations(actor: StaffContext) {
    const firmId = firmScope(actor.firmId).firmId;
    const rows = await this.db.$queryRaw<{ id: string; email: string; roles: PlatformRole[]; created_at: Date; expires_at: Date; status: string }[]>`select id, email, roles::text[] as roles, created_at, expires_at,
      case when accepted_at is not null then 'ACCEPTED' when revoked_at is not null then 'REVOKED' when expires_at <= now() then 'EXPIRED' else 'PENDING' end as status
      from platform_invitation where firm_id = ${firmId}::uuid order by created_at desc, id`;
    return { invitations: rows.map((r) => ({ id: r.id, email: r.email, roles: r.roles, status: r.status, createdAt: r.created_at, expiresAt: r.expires_at })) };
  }

  private async openInvitation(tx: Tx, firmId: string, id: string) {
    if (!UUID.test(id)) return notInFirm("invitation");
    const inv = await tx.platformInvitation.findFirst({ where: firmScope(firmId, { id: id.toLowerCase() }) });
    if (!inv) return notInFirm("invitation");
    if (inv.acceptedAt || inv.revokedAt) return problem(409, "Not pending", `This invitation was already ${inv.acceptedAt ? "accepted" : "revoked"}.`, { code: "INVITATION_CLOSED" });
    return inv;
  }

  /** Resend: the old link is void (revoked) and a new one runs 72 hours from now; the seat is checked again (an expired
   *  invitation held no seat). */
  async resend(actor: StaffContext, id: string, body: { reason?: unknown } = {}) {
    const reason = reasonOf(body.reason, false);
    return this.inFirm(actor, async (tx) => {
      const old = await this.openInvitation(tx, actor.firmId, id);
      // Break M2: resending gives the invitation's roles again, so the same rules as inviting apply (an Admin cannot resend
      // an Owner invitation, nor one with a role holding keys it lacks).
      await this.roleRules(actor, null, old.roles, [], reason, tx);
      await tx.$executeRaw`update platform_invitation set revoked_at = now() where id = ${old.id}::uuid`;
      await this.seatCheck(tx, actor.firmId);
      const row = await this.insertInvitation(tx, actor.firmId, old.email, old.roles, actorWord(actor.staffId));
      await auditInvitation(tx, { firmId: actor.firmId, firmKey: actor.firmKey, actor: actorWord(actor.staffId), action: "platform.invitation.resent", entityKey: row.id, summary: "an invitation was sent again; the old link no longer works", detail: { invitationId: row.id, replaces: old.id, roles: old.roles } });
      return { id: row.id, replaces: old.id, email: old.email, roles: old.roles, status: "PENDING" as const, expiresAt: row.expires_at };
    });
  }

  async revoke(actor: StaffContext, id: string) {
    return this.inFirm(actor, async (tx) => {
      const inv = await this.openInvitation(tx, actor.firmId, id);
      await tx.$executeRaw`update platform_invitation set revoked_at = now() where id = ${inv.id}::uuid`;
      await auditInvitation(tx, { firmId: actor.firmId, firmKey: actor.firmKey, actor: actorWord(actor.staffId), action: "platform.invitation.revoked", entityKey: inv.id, summary: "an invitation was revoked (its seat is free)", detail: { invitationId: inv.id } });
      return { id: inv.id, status: "REVOKED" as const };
    });
  }
}
Injectable()(PlatformIdentity);
[Db, IDENTITY_PORT, PlatformClock].forEach((token, i) => Inject(token)(PlatformIdentity, undefined, i));
