// PF-4b (contracts §7 §1.2; concept pf-6-staff BR-4, -5, -7, -9): web session and invitation acceptance. Each change: one
// transaction holding the firm's row lock, the actor re-checked under it (as PF-4), one AuditPort line in it. Ending
// sessions = a revocation row: the guard refuses every token signed in at or before it (PF-4), so all end at once.
import { Inject, Injectable } from "@nestjs/common";
import type { PlatformRole, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { EVENT, StaffJoinedPayload } from "../../../../../ports/events.ts";
import type { AuditValues } from "../../../../../ports/audit.ts";
import type { MailPort } from "../../../../../ports/mail.ts";
import { MessageRefused } from "../../../../../ports/messages.ts";
import { Db } from "../../../core.ts";
import { auditEvent } from "../../audit/audit-event.ts";
import { mailIn, mailReady } from "../../messages/send/mail.ts";
import { asBypass, firmScope, notInFirm } from "../../firm-scope.ts";
import { actorWord } from "../audit.ts";
import { writeMoneyKeysGranted } from "../money-line.ts";
import { FIRM_KEY, forbidden, problem, unauthorized, type StaffContext } from "../keys.ts";
import { PlatformClock } from "../port.ts";
import { PlatformIdentity } from "../service.ts";
import { MAIL_PORT, SYSTEM_REPLY_TO } from "./mail.ts";
import { IDENTITY_ADMIN_PORT, LocalIdentityAdmin, type IdentityAdminPort } from "./provider.ts";
import { requireStepUp } from "./step-up.ts";

type Tx = Prisma.TransactionClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
/** PF-6m2: the audit line of an invitation refused at accept because its inviter may no longer give it. */
export const INVITER_REFUSED = "platform.invitation.refused_inviter";
/** The refusal line's words per reason (role names follow the last one). */
const REFUSAL_WORDS = { inviter_not_found: "its inviter is not a staff member of this firm", inactive: "its inviter is no longer active", may_no_longer_invite: "its inviter may no longer invite people", role_no_longer_givable: "its inviter may no longer give" } as const;
/** The invite door's key (identity/routes.ts, POST staff/invitations): an inviter who lost it may no longer invite. */
const INVITE_KEY = "agent/staff:manage";
/** The Accept page's words (BR-4), fixed. */
export const INVITE_WORDS = { expired: (firm: string) => `This invitation has expired. Ask ${firm} to send a new one.`, notValid: "This invitation is no longer valid." };

type InvRow = { id: string; firm_id: string; email: string; display_name: string | null; roles: PlatformRole[]; invited_by: string; accepted_at: Date | null; revoked_at: Date | null; expired: boolean; firm_name: string; firm_key: string };

@Injectable()
export class PlatformSession {
  constructor(@Inject(Db) private readonly db: Db, @Inject(IDENTITY_ADMIN_PORT) readonly admin: IdentityAdminPort, @Inject(MAIL_PORT) readonly mail: MailPort,
    @Inject(PlatformClock) private readonly clock: PlatformClock, @Inject(PlatformIdentity) private readonly id: PlatformIdentity) {}

  /** One transaction holding the firm's row lock; the actor is checked again under it (PF-4's break m2). */
  async inFirm<T>(actor: StaffContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const firmId = firmScope(actor.firmId).firmId;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`select id from platform_firm where id = ${firmId}::uuid for update`;
      const me = await tx.platformStaff.findFirst({ where: firmScope(firmId, { id: actor.staffId }), select: { status: true, grants: { where: { endedAt: null }, select: { role: true } } } });
      const rev = await tx.platformSessionRevocation.findFirst({ where: firmScope(firmId, { staffId: actor.staffId }), orderBy: { revokedAt: "desc" }, select: { revokedAt: true } });
      if (me?.status !== "ACTIVE" || (rev && actor.authTime * 1000 <= rev.revokedAt.getTime())) unauthorized("Your session ended before this change was made. Sign in again.", "SESSION_REVOKED");
      if (me.grants.map((g) => g.role).sort().join() !== [...actor.roles].sort().join()) problem(409, "Your roles changed", "Your roles changed while this was being sent. Nothing was saved; try again.", { code: "ROLES_CHANGED" });
      return fn(tx);
    });
  }

  private async target(tx: Tx, firmId: string, id: string) {
    const t = UUID.test(id) ? await tx.platformStaff.findFirst({ where: firmScope(firmId, { id: id.toLowerCase() }), include: { grants: { where: { endedAt: null }, select: { role: true } } } }) : null;
    return t ?? notInFirm("staff member");
  }

  /** Ends every session of a person now (one revocation row; the guard reads it on their next request). */
  private async endSessions(tx: Tx, actor: StaffContext, staffId: string, reason: string) {
    // At least the person's latest sign-in (the stand-in may date one a few ms ahead of the clock: break B6).
    const last = (await tx.platformStaff.findFirst({ where: firmScope(actor.firmId, { id: staffId }), select: { lastSignInAt: true } }))?.lastSignInAt?.getTime() ?? 0;
    await tx.platformSessionRevocation.create({ data: { firmId: actor.firmId, staffId, revokedAt: new Date(Math.max(this.clock.now(), last, staffId === actor.staffId ? actor.authTime * 1000 : 0)), reason } });
  }
  /** R1.8 (QA-594): before and after are the change's values (the session revocation each of these writes). */
  private audit(tx: Tx, actor: StaffContext, action: string, entityKey: string, summary: string, detail: Record<string, string>, before: AuditValues | null, after: AuditValues | null) {
    return auditEvent.record(tx, { firmId: actor.firmId, actor: actorWord(actor.staffId), action, entity: "platform_staff", entityKey, summary, detail, before, after });
  }

  // ------------------------------------------------------------------------------------------- invitations (public)
  private async invitation(tx: Tx | Db, token: unknown, lock: boolean): Promise<InvRow | null> {
    if (typeof token !== "string" || !TOKEN.test(token)) return null;
    const hash = createHash("sha256").update(token).digest("hex");
    const rows = lock
      ? await tx.$queryRaw<InvRow[]>`select i.id, i.firm_id, i.email, i.display_name, i.roles::text[] as roles, i.invited_by, i.accepted_at, i.revoked_at, (i.expires_at <= now()) as expired, f.operating_name as firm_name, f.key as firm_key
          from platform_invitation i join platform_firm f on f.id = i.firm_id where i.token_hash = ${hash} for update of i`
      : await tx.$queryRaw<InvRow[]>`select i.id, i.firm_id, i.email, i.display_name, i.roles::text[] as roles, i.invited_by, i.accepted_at, i.revoked_at, (i.expires_at <= now()) as expired, f.operating_name as firm_name, f.key as firm_key
          from platform_invitation i join platform_firm f on f.id = i.firm_id where i.token_hash = ${hash}`;
    return rows[0] ?? null;
  }
  private static stateOf(i: InvRow | null) { return !i || i.accepted_at || i.revoked_at ? "NOT_VALID" : i.expired ? "EXPIRED" : "VALID"; }

  /** GET /api/public/invitations/:token: valid (firm, email), expired, or no longer valid (used, revoked or unknown: one answer). */
  async invitationState(token: string) {
    const i = await asBypass("platform.identity.invitation", () => this.invitation(this.db, token, false)), state = PlatformSession.stateOf(i);   // PF-12: the token is the only key
    if (state === "VALID") return { state, firmName: i!.firm_name, email: i!.email, next: "Continue to set your password" };
    if (state === "EXPIRED") return { state, firmName: i!.firm_name, words: INVITE_WORDS.expired(i!.firm_name) };
    return { state, words: INVITE_WORDS.notValid };
  }

  /** POST …/accept: one staff member and one provider user (its own email suppressed), the invitation used, the hand-off
   *  to set a password. The invitation row is locked, so a second accept (parallel or later) finds it used. */
  async accept(token: string) {
    // PF-12: the token is the only key, and the email is checked across every firm (one account, one firm), so the door
    // runs on the named bypass (BYPASS_USES "platform.identity.invitation").
    return asBypass("platform.identity.invitation", () => this.db.$transaction(async (tx) => {
      const pre = await this.invitation(tx, token, false);   // one lock order with PF-4's resend and revoke: firm, then invitation
      if (pre) await tx.$queryRaw`select id from platform_firm where id = ${pre.firm_id}::uuid for update`;
      const i = await this.invitation(tx, token, true), state = PlatformSession.stateOf(i);
      if (state === "EXPIRED") problem(410, "Invitation expired", INVITE_WORDS.expired(i!.firm_name), { code: "INVITATION_EXPIRED", state });
      if (state !== "VALID") problem(410, "Invitation not valid", INVITE_WORDS.notValid, { code: "INVITATION_NOT_VALID", state });
      const inv = i!;
      // PF-6m2 (break F1; BR-1, BR-4): the inviter is checked again here, under the firm's lock (the lock deactivation and
      // role change take first), so an inviter who has since left or lost the keys hands nothing out.
      const refused = await this.inviterRefusal(tx, inv);
      if (refused) {
        await tx.$executeRaw`update platform_invitation set revoked_at = now() where id = ${inv.id}::uuid`;
        await auditEvent.record(tx, { firmId: inv.firm_id, actor: "system:invitation-accept", action: INVITER_REFUSED, entity: "platform_invitation", entityKey: inv.id,
          summary: `an invitation was refused at accept: ${REFUSAL_WORDS[refused.reason]}${refused.roles.length ? ` ${refused.roles.join(", ")}` : ""}`,
          // The inviter only as a staff word (break F2: never a raw invited_by, which could be anything the column holds).
          detail: { invitationId: inv.id, ...(refused.by ? { invitedBy: `staff:${refused.by}` } : {}), reason: refused.reason, roles: refused.roles }, before: { status: "PENDING" }, after: { status: "REVOKED" } });
        return { refused };   // committed: the invitation stays no longer valid, and the line stays
      }
      if (await tx.platformStaff.findFirst({ where: firmScope(inv.firm_id, { email: inv.email }), select: { id: true } })) problem(410, "Invitation not valid", INVITE_WORDS.notValid, { code: "INVITATION_NOT_VALID", state: "NOT_VALID" });
      // One sign-in account is one firm's staff member (identity_subject is unique): the invitee, who holds the link, is told plainly.
      if (await tx.platformStaff.findFirst({ where: { email: inv.email }, select: { id: true } })) problem(409, "Use another email", `This email already signs in to another firm. Ask ${inv.firm_name} to invite another address.`, { code: "EMAIL_IN_ANOTHER_FIRM" });
      // PF-4dn: the name the inviter typed, else the part of the email before the @ (as before).
      const staff = await tx.platformStaff.create({ data: { firmId: inv.firm_id, email: inv.email, displayName: inv.display_name ?? inv.email.split("@")[0].slice(0, 100), status: "ACTIVE" } });
      for (const role of inv.roles) await tx.platformRoleGrant.create({ data: { firmId: inv.firm_id, staffId: staff.id, role, grantedBy: inv.invited_by } });
      // PF-6m (QA-478; PF-6b ruling 2 (b)): money keys given by an invitation write the same line as the role-change door,
      // by the inviter (as the grant rows record), before the provider call so a refusal rolls it back too.
      await writeMoneyKeysGranted(tx, { firmId: inv.firm_id, firmKey: inv.firm_key, actor: inv.invited_by, staffId: staff.id, roles: inv.roles });
      await tx.$executeRaw`update platform_invitation set accepted_at = now() where id = ${inv.id}::uuid`;
      await auditEvent.record(tx, { firmId: inv.firm_id, actor: "system:invitation-accept", action: "platform.invitation.accepted", entity: "platform_invitation", entityKey: inv.id, summary: `an invitation was accepted; a staff member joined (${inv.roles.join(", ")})`, detail: { invitationId: inv.id, staffId: staff.id, roles: inv.roles },
        before: { status: "PENDING" }, after: { status: "ACCEPTED", staffId: staff.id, email: staff.email, displayName: staff.displayName, roles: inv.roles } });
      // Last, so a refused provider call rolls everything back (AdminCreateUser with MessageAction SUPPRESS).
      const { subject } = await this.admin.createUser(inv.email);
      await tx.platformStaff.update({ where: { id: staff.id }, data: { identitySubject: subject } });
      await tx.moduleEvent.create({ data: { firmId: inv.firm_id, type: EVENT.STAFF_JOINED, subjectId: staff.id, payload: StaffJoinedPayload.parse({ staffId: staff.id, invitationId: inv.id }) } });   // last (PF-3 m8)
      return { staffId: staff.id, firmKey: inv.firm_key, roles: inv.roles, handOff: await this.admin.handOff(inv.firm_key, inv.email) };
    }).then((out) => "refused" in out ? problem(410, "Invitation not valid", INVITE_WORDS.notValid, { code: "INVITATION_NOT_VALID", state: "NOT_VALID" }) : out));
  }

  /** PF-6m2: why the inviter (`invited_by`) may no longer hand this invitation out, else null. The same rule as invite
   *  time: a staff member of the same firm, active, still holding the invite door's key, and every key of every role
   *  invited (identity/service.ts roleRules; the guard's firm keys), the Owner role only from an Owner. Role names only. */
  private async inviterRefusal(tx: Tx, inv: InvRow): Promise<{ reason: keyof typeof REFUSAL_WORDS; by: string | null; roles: PlatformRole[] } | null> {
    const id = (/^staff:(.+)$/.exec(inv.invited_by)?.[1] ?? "").toLowerCase();
    const by = UUID.test(id) ? await tx.platformStaff.findFirst({ where: firmScope(inv.firm_id, { id }), select: { id: true, status: true, grants: { where: { endedAt: null }, select: { role: true } } } }) : null;
    if (!by) return { reason: "inviter_not_found", by: null, roles: [] };   // break F3: not "inactive" when there is nobody
    if (by.status !== "ACTIVE") return { reason: "inactive", by: by.id, roles: [] };
    const held = by.grants.map((g) => g.role);
    const keys = new Set((await tx.platformRolePermission.findMany({ where: { role: { in: held } }, select: { permissionKey: true } })).map((k) => k.permissionKey).filter((k) => FIRM_KEY.test(k)));
    if (!keys.has(INVITE_KEY)) return { reason: "may_no_longer_invite", by: by.id, roles: [] };   // break F1: the invite door's own key
    const needed = await tx.platformRolePermission.findMany({ where: { role: { in: inv.roles } }, select: { role: true, permissionKey: true } });
    const beyond = inv.roles.filter((r) => (r === "OWNER" && !held.includes("OWNER")) || needed.some((k) => k.role === r && !keys.has(k.permissionKey)));
    return beyond.length ? { reason: "role_no_longer_givable", by: by.id, roles: beyond } : null;
  }

  // ---------------------------------------------------------------------------------------------------- the session
  /** POST /api/platform/session/callback { code }: the sign-in code (in the body, never in a URL or a log line) → a session (the local stand-in through PF-4's sign-in,
   *  which also ends any older session: one session at a time). */
  async callback(code: unknown) {
    if (typeof code !== "string" || !code || code.length > 2000) return unauthorized("This sign-in link has been used or has expired. Sign in again.", "SIGN_IN_CODE_REFUSED");
    const who = await this.admin.redeem(code);
    const session = await this.id.localSignIn({ firmKey: who.firmKey, email: who.email, secondStep: true });
    if (this.admin instanceof LocalIdentityAdmin) this.admin.enrolled(session.staffId);
    return session;
  }

  /** POST /api/platform/session/sign-out: this person's session ends now. */
  async signOut(actor: StaffContext) {
    await this.inFirm(actor, async (tx) => {
      await this.endSessions(tx, actor, actor.staffId, "signed-out");
      await this.audit(tx, actor, "platform.staff.signed_out", actor.staffId, "a staff member signed out", { staffId: actor.staffId }, null, { sessionsEnded: "signed-out" });
    });
    return { signedOut: true };
  }

  /** POST /api/platform/staff/:id/sign-out-everywhere (BR-7): every session of that person ends at once, without
   *  deactivating them. An Owner's sessions are ended only by an Owner (as deactivating one, PF-4). */
  async signOutEverywhere(actor: StaffContext, id: string) {
    return this.inFirm(actor, async (tx) => {
      const t = await this.target(tx, actor.firmId, id);
      if (t.grants.some((g) => g.role === "OWNER") && t.id !== actor.staffId && !actor.roles.includes("OWNER")) forbidden("Only an Owner signs an Owner out everywhere.", "OWNER_ONLY");
      await this.endSessions(tx, actor, t.id, "signed-out-everywhere");
      await this.audit(tx, actor, "platform.staff.signed_out_everywhere", t.id, "a staff member was signed out everywhere (every session ended)", { staffId: t.id }, null, { sessionsEnded: "signed-out-everywhere" });
      await this.admin.signOutEverywhere({ staffId: t.id, subject: t.identitySubject, email: t.email });
      return { staffId: t.id, signedOutEverywhere: true };
    });
  }

  /** POST /api/platform/staff/:id/reset-two-step (question 3 decided: recovery by an Owner or Admin after their own
   *  step-up; OWASP "Resetting MFA"): nobody resets their own; an Owner's only by an Owner; the person's sessions end, they
   *  are emailed through MailPort, and they set up the second step again at their next sign-in. */
  async resetTwoStep(actor: StaffContext, id: string) {
    let dispatch = async () => {};
    await mailReady(this.mail, actor.firmId);   // before the firm's row lock (break m1)
    const out = await this.inFirm(actor, async (tx) => {
      const t = await this.target(tx, actor.firmId, id);
      if (!actor.roles.includes("OWNER") && !actor.roles.includes("ADMIN")) forbidden("Only an Owner or Admin resets a person's two-step sign-in.", "OWNER_OR_ADMIN_ONLY");
      if (t.id === actor.staffId) forbidden("Nobody resets their own two-step sign-in. Ask another Owner or Admin.", "OWN_TWO_STEP");
      if (t.grants.some((g) => g.role === "OWNER") && !actor.roles.includes("OWNER")) forbidden("Only an Owner resets an Owner's two-step sign-in.", "OWNER_ONLY");
      if (t.status === "DEACTIVATED") problem(409, "Deactivated", "This person is deactivated: reactivate them first.", { code: "STAFF_NOT_ACTIVE" });
      requireStepUp(actor, this.clock.now(), "Resetting a person's two-step sign-in");
      await this.endSessions(tx, actor, t.id, "two-step-reset");
      await this.audit(tx, actor, "platform.staff.two_step_reset", t.id, "a staff member's two-step sign-in was reset by an Owner or Admin; their sessions ended", { staffId: t.id }, { twoStep: "SET_UP" }, { twoStep: "RESET", sessionsEnded: "two-step-reset" });
      // The out-of-band notice first: a mail failure changes nothing at the provider (the transaction rolls back). PF-19r:
      // written into the outbox inside this transaction (it holds the firm's row lock), sent after the commit.
      let held = false;
      try {
        ({ dispatch, held } = await mailIn(this.mail, tx, { firmId: actor.firmId, to: t.email, replyTo: SYSTEM_REPLY_TO, class: "TRANSACTIONAL", templateKey: "identity.two_step_reset", subject: "Your two-step sign-in was reset",
          person: { kind: "STAFF", id: t.id }, text: "An Owner or Admin of your firm reset your two-step sign-in. The next time you sign in, you set it up again. If you did not ask for this, tell your firm's Owner at once." }));
      } catch (e) {
        if (e instanceof MessageRefused) problem(409, "Notice not sent", "Update this person's email address first; we can't send them the reset notice (their address does not take email from the firm, for example after a bounce), so their two-step sign-in was not reset.", { code: "NOTICE_NOT_SENT" });
        throw e;
      }
      // A security notice is never left for tomorrow (break M1): the firm's daily email limit holds it, so nothing changes.
      if (held) problem(409, "Daily email limit reached", "Your firm has sent its email limit for today, so the notice to this person could not go now and their two-step sign-in was not reset. Try again tomorrow.", { code: "NOTICE_HELD_DAILY_LIMIT" });
      await this.admin.resetTwoStep({ staffId: t.id, subject: t.identitySubject, email: t.email });
      return { staffId: t.id, twoStep: { method: null }, notified: true };
    });
    await dispatch();
    return out;
  }
}
