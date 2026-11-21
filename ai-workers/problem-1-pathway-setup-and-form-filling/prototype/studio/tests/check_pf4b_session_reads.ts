// PF-4b (row PF-4b; brief on lead-b-front-office; contracts §7 §1.2): every line of the row's "Done when", a pass and a
// fail each. Part A: a scratch database and a Nest app of PF-4's and PF-4b's classes with the local stand-ins, a test
// clock and fakeMail. Part B (with a port): the isolated copy (main.ts) registers the feature. No network, US$0.
//   zsh studio/tools/isolated.sh pf4b 4542 start PLATFORM_IDENTITY=local PLATFORM_SAMPLE_SEED=on && tsx studio/tests/check_pf4b_session_reads.ts 4542
import "reflect-metadata";
import { Module } from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fakeMail } from "../ports/mail.ts";
import { runContract } from "../ports/contracts/contract.ts";
import { mailPortContract } from "../ports/contracts/mail-port.contract.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations");
const PORT = process.argv[2] ? Number(process.argv[2]) : null;
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_pf4b_scratch_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const sql = (q: string) => execFileSync(join(BIN, "psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
let printed = "";   // everything this process prints, scanned for the licence number
for (const s of [process.stdout, process.stderr]) { const w = s.write.bind(s); s.write = ((chunk: unknown, ...a: unknown[]) => { printed += String(chunk); return (w as (...x: unknown[]) => boolean)(chunk, ...a); }) as typeof s.write; }

type Res = { status: number; body: any; headers: Headers };
const call = async (base: string, method: string, path: string, o: { token?: string; body?: unknown } = {}): Promise<Res> => {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (o.token) headers.authorization = `Bearer ${o.token}`;
  const r = await fetch(`${base}${path}`, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  const text = await r.text(); let body: any = text; try { body = JSON.parse(text); } catch { /* text */ }
  return { status: r.status, body, headers: r.headers };
};

execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", DB]); execFileSync(join(BIN, "createdb"), [...PG, DB]);
for (const d of readdirSync(MIG).filter((x) => /^\d{14}_/.test(x)).sort()) execFileSync(join(BIN, "psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
process.env.DATABASE_URL = urlOf(DB);
for (const k of ["PLATFORM_IDENTITY", "PLATFORM_ENVIRONMENT", "PLATFORM_SAMPLE_SEED", "PLATFORM_LOCAL_SECRET"]) delete process.env[k];
process.env.PLATFORM_ENVIRONMENT = "local";   // PF-24w: required, no default (features/platform-messages.ts reads the loader at import)

const { ConfigReadGuard, Db } = await import("../api/src/core.ts");
const { seedSampleFirms } = await import("../api/src/platform/seed-sample-firms.ts");
const { PlatformClock } = await import("../api/src/platform/identity/port.ts");
const { LocalIdentity } = await import("../api/src/platform/identity/local.ts");
const { IDENTITY_PORT, PlatformIdentity } = await import("../api/src/platform/identity/service.ts");
const { PlatformGuard } = await import("../api/src/platform/identity/guard.ts");
const { PlatformIdentityController } = await import("../api/src/platform/identity/routes.ts");
const { auditEvent } = await import("../api/src/platform/audit/audit-event.ts");
const { IDENTITY_ADMIN_PORT, LocalIdentityAdmin, CognitoIdentityAdmin } = await import("../api/src/platform/identity/session/provider.ts");
const { MAIL_PORT, LocalMail } = await import("../api/src/platform/identity/session/mail.ts");
const { PlatformSession, INVITE_WORDS } = await import("../api/src/platform/identity/session/service.ts");
const { PlatformSessionController, PublicInvitationController } = await import("../api/src/platform/identity/session/routes.ts");
const { requireStepUp } = await import("../api/src/platform/identity/session/step-up.ts");
const { handleCustomEmail } = await import("../api/src/platform/identity/session/email-sender.ts");
const { StaffReads, TWO_STEP_WORDS } = await import("../api/src/platform/staff-read/service.ts");
const { StaffReadController } = await import("../api/src/platform/staff-read/routes.ts");
const feature = (await import("../api/src/features/platform-staff-read.ts")).default;

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(DB), options: "-c TimeZone=UTC" }) });
const clock = new (class extends PlatformClock { t = Date.now(); override now() { return this.t; } })();
const local = new LocalIdentity("pf4b-check-signing-key-0123456789abcdef", () => clock.now());
const admin = new LocalIdentityAdmin(() => clock.now());
let created = 0;
const createUser = admin.createUser.bind(admin); admin.createUser = async (e: string) => { created++; return createUser(e); };
let failMail = false;
const mail = fakeMail({ failOn: () => failMail });
const LICENCE = "LIC-PF4B-7731-Q";

let app: { close(): Promise<void> } | null = null;
try {
  const providers = [Db, { provide: APP_GUARD, useClass: ConfigReadGuard }, { provide: PlatformClock, useValue: clock }, { provide: IDENTITY_PORT, useValue: local }, PlatformIdentity, PlatformGuard, { provide: APP_GUARD, useExisting: PlatformGuard },
    { provide: IDENTITY_ADMIN_PORT, useValue: admin }, { provide: MAIL_PORT, useValue: mail }, PlatformSession, StaffReads];
  @Module({ controllers: [PlatformIdentityController, PlatformSessionController, PublicInvitationController, StaffReadController] as never[], providers: providers as never[] }) class TestApp {}
  const nest = await NestFactory.create(TestApp, { logger: false }); await nest.listen(0, "127.0.0.1"); app = nest;
  const base = `http://127.0.0.1:${(nest.getHttpServer().address() as { port: number }).port}`;

  await seedSampleFirms(db);
  const idOf = async (actorId: string) => (await db.platformStaff.findFirstOrThrow({ where: { actorId } })).id;
  const FIRM_A = (await db.platformFirm.findUniqueOrThrow({ where: { key: "sample-firm" } })).id;
  const R = await idOf("user-R"), O = await idOf("user-O"), T = await idOf("user-T"), S = await idOf("user-S");
  const signIn = async (actorId: string, firmKey = "sample-firm") => { const r = await call(base, "POST", "/api/platform/session/local", { body: { firmKey, actorId, secondStep: true } }); if (r.status !== 200) throw new Error(JSON.stringify(r.body)); return r.body.token as string; };
  const audits = (action: string) => Number(sql(`select count(*) from audit_event where action = '${action}'`));
  const revs = (staffId: string) => Number(sql(`select count(*) from platform_session_revocation where staff_id = '${staffId}'`));
  // An invitation whose token the test knows (PF-4 keeps only the hash and emails nothing yet: Question 2 on the PR).
  const invite = (email: string, o: { ageHours?: number; revoked?: boolean } = {}) => { const token = randomBytes(32).toString("base64url"), hash = createHash("sha256").update(token).digest("hex");
    const id = sql(`insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, created_at, expires_at, revoked_at) select gen_random_uuid(), '${FIRM_A}', '${email}', '{CASE_OFFICER}', '${hash}', 'staff:${R}', c, c + interval '72 hours', ${o.revoked ? "now()" : "null"} from (select now() - interval '${o.ageHours ?? 0} hours' as c) t returning id`).split("\n")[0]; return { token, id }; };
  ok("setup: the feature registers its three controllers and the session and reads services", feature.controllers.length === 3 && (feature.providers as unknown[]).includes(PlatformSession) && (feature.providers as unknown[]).includes(StaffReads));

  let tR = await signIn("user-R"); const tO = await signIn("user-O");
  // ------------------------------------------------------------------------------- firm A's list, never firm B's
  const list = await call(base, "GET", "/api/platform/staff", { token: tR });
  const ids = (list.body.staff ?? []).map((s: { id: string }) => s.id);
  ok("PF-4b pass: firm A's Owner lists firm A's staff (R, O, T) with roles, status, two-step and last sign-in", list.status === 200 && [R, O, T].every((i) => ids.includes(i)) && list.body.staff.every((s: any) => "twoStep" in s && "lastSignInAt" in s && Array.isArray(s.roles)), list.body);
  const guessed = await Promise.all([`/api/platform/staff/${S}`, "/api/platform/staff/not-a-uuid"].map((p) => call(base, "GET", p, { token: tR })));
  ok("PF-4b fail: firm A's list never shows firm B's staff, and firm B's staff id guessed on GET /staff/:id → 404 (never 403)", !ids.includes(S) && guessed.every((g) => g.status === 404), guessed.map((g) => g.status));
  const oneT = await call(base, "GET", `/api/platform/staff/${T}`, { token: tR });
  ok("PF-4b pass: GET /staff/:id answers one person of the firm, the licence's type and body but never its number", oneT.status === 200 && oneT.body.id === T && !!oneT.body.licence && !("licenceNumber" in oneT.body.licence), oneT.body);

  // ----------------------------------------------------------------------------------------------- the seat line
  sql(`update platform_staff set status = 'SUSPENDED' where id = '${T}'`);
  invite("pending.one@example.com"); invite("expired.one@example.com", { ageHours: 73 }); invite("revoked.one@example.com", { revoked: true });
  const seats = (await call(base, "GET", "/api/platform/staff", { token: tR })).body.seats;
  ok("PF-4b pass: the seat line counts active + suspended + pending (2 + 1 + 1 = 4 of the Team plan's 5)", seats?.used === 4 && seats.active === 2 && seats.suspended === 1 && seats.pending === 1 && seats.line === `4 of ${seats.limit} seats used`, seats);
  ok("PF-4b fail: an expired and a revoked invitation hold no seat (not counted)", seats?.pending === 1, seats);
  sql(`update platform_staff set status = 'ACTIVE' where id = '${T}'`);

  // ------------------------------------------------- the invitation email (Lead B ruling 2: PF-4's invite and resend)
  const tokenIn = (address: string, i: number) => /#t=([A-Za-z0-9_-]{43})/.exec(mail.inbox(address)[i]?.text ?? "")?.[1] ?? "";
  sql(`create function pf4b_refuse() returns trigger language plpgsql as $$ begin raise exception 'forced'; end $$; create trigger pf4b_refuse before insert on audit_event for each row when (new.action = 'platform.invitation.created') execute function pf4b_refuse()`);
  const rolled = await call(base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "rolled.back@example.com", roles: ["CASE_OFFICER"] } });
  sql(`drop trigger pf4b_refuse on audit_event; drop function pf4b_refuse()`);
  ok("PF-4b fail (ruling 2): an invite rolled back after its row was written (forced audit failure) sends no email and keeps no invitation", rolled.status >= 500 && mail.inbox("rolled.back@example.com").length === 0 && sql(`select count(*) from platform_invitation where email = 'rolled.back@example.com'`) === "0", rolled.status);
  const inv = await call(base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "Mailed.Invitee@example.com", roles: ["CASE_OFFICER"] } });
  const t1 = tokenIn("mailed.invitee@example.com", 0), open1 = await call(base, "GET", `/api/public/invitations/${t1}`);
  ok("PF-4b pass (ruling 2): one invite → one email (after the commit) whose link opens VALID; the answer carries no token", inv.status === 201 && inv.body.emailed === true && !/token/i.test(JSON.stringify(inv.body)) && mail.inbox("mailed.invitee@example.com").length === 1 && open1.body.state === "VALID", [inv.body, open1.body]);
  const over = await call(base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "over.limit@example.com", roles: ["CASE_OFFICER"] } });
  ok("PF-4b fail (ruling 2): an invite refused before its row (5 of 5 seats: 409 PLAN_LIMIT_REACHED) sends no email", over.status === 409 && over.body.code === "PLAN_LIMIT_REACHED" && mail.inbox("over.limit@example.com").length === 0, over.body);
  const resent = await call(base, "POST", `/api/platform/staff/invitations/${inv.body.id}/resend`, { token: tR });
  const t2 = tokenIn("mailed.invitee@example.com", 1), reopen = await Promise.all([t1, t2].map((t) => call(base, "GET", `/api/public/invitations/${t}`)));
  ok("PF-4b fail (ruling 2): after a resend the first link answers NOT_VALID and the new one VALID (a new token, a second email)", resent.status === 200 && resent.body.emailed === true && t2 && t2 !== t1 && reopen[0].body.state === "NOT_VALID" && reopen[1].body.state === "VALID", [resent.body, reopen.map((x) => x.body.state)]);
  ok("PF-4b pass (ruling 2): the plain token is never stored (only its hash) and never in a log line", sql(`select count(*) from platform_invitation where token_hash in ('${t1}','${t2}')`) === "0" && ![t1, t2].some((t) => printed.includes(t)));
  sql(`update platform_invitation set revoked_at = now() where email = 'mailed.invitee@example.com' and revoked_at is null`);   // its seat back for the steps below

  // ----------------------------------------------------------------------------- 403 on the list, 200 on own account
  const asO = await Promise.all(["/api/platform/staff", `/api/platform/staff/${R}`, "/api/platform/licences", "/api/platform/settings/two-step"].map((p) => call(base, "GET", p, { token: tO })));
  ok("PF-4b fail: a person without agent/staff:manage (Case Officer) gets 403 on the list, a person, the licences and the two-step setting", asO.every((r) => r.status === 403 && r.body.code === "MISSING_PERMISSION"), asO.map((r) => r.status));
  const saveO = await call(base, "PUT", "/api/platform/me/account", { token: tO, body: { licence: { representativeType: "College member (CICC)", licensingBody: "College of Immigration and Citizenship Consultants", licenceNumber: LICENCE } } });
  const meO = await call(base, "GET", "/api/platform/me/account", { token: tO });
  ok("PF-4b pass: the same person gets 200 on their own account (roles, own licence with its number, own two-step state; PUT saves their own licence)", saveO.status === 200 && meO.status === 200 && meO.body.staffId === O && meO.body.licence?.licenceNumber === LICENCE && meO.body.twoStep?.method === "TOTP" && meO.body.twoStepRequired === true, meO.body);
  const lic = await call(base, "GET", "/api/platform/licences", { token: tR });
  ok("PF-4b pass: the Licences list (agent/firm-credential:manage) shows everyone's licence of firm A only", lic.status === 200 && lic.body.licences.some((l: any) => l.staffId === O && l.licenceNumber === LICENCE) && !lic.body.licences.some((l: any) => l.staffId === S), lic.body);
  const two = await call(base, "GET", "/api/platform/settings/two-step", { token: tR });
  ok("PF-4b pass: the two-step setting reads \"Required for all staff\", with no switch", two.status === 200 && two.body.required === true && two.body.words === TWO_STEP_WORDS && two.body.changeable === false, two.body);

  // ---------------------------------------------------------------------------------- the public invitation door
  const fresh = invite("new.person@example.com"), expired = invite("late.person@example.com", { ageHours: 73 }), revoked = invite("gone.person@example.com", { revoked: true });
  const states = await Promise.all([fresh.token, expired.token, revoked.token, randomBytes(32).toString("base64url"), "short"].map((t) => call(base, "GET", `/api/public/invitations/${t}`)));
  ok("PF-4b pass: a valid token → VALID with the firm and the invitee's email, never cached nor sent on as a referrer", states[0].status === 200 && states[0].body.state === "VALID" && states[0].body.email === "new.person@example.com" && states[0].headers.get("cache-control") === "no-store" && states[0].headers.get("referrer-policy") === "no-referrer", states[0].body);
  ok("PF-4b fail: an expired token → EXPIRED with \"Ask <firm> to send a new one\"; revoked, unknown or malformed → NOT_VALID, one answer", states[1].body.state === "EXPIRED" && /has expired\. Ask .+ to send a new one\./.test(states[1].body.words) && states.slice(2).every((s) => s.status === 200 && s.body.state === "NOT_VALID" && s.body.words === INVITE_WORDS.notValid && !("email" in s.body)), states.map((s) => s.body));
  const mailBefore = mail.sent.length, acceptAudit = audits("platform.invitation.accepted");
  const acc = await Promise.all([1, 2].map(() => call(base, "POST", `/api/public/invitations/${fresh.token}/accept`)));
  const won = acc.find((a) => a.status === 200), lost = acc.find((a) => a.status !== 200);
  ok("PF-4b pass: accept creates one staff member with the invitation's roles and one provider user, writes one audit line, and returns the hand-off to set a password",
    !!won && won.body.handOff?.kind === "set-password" && created === 1 && sql(`select count(*) from platform_staff where email = 'new.person@example.com'`) === "1" && sql(`select string_agg(role::text, ',') from platform_role_grant where staff_id = '${won.body.staffId}'`) === "CASE_OFFICER" && audits("platform.invitation.accepted") === acceptAudit + 1, acc.map((a) => a.body));
  ok("PF-4b fail: two accepts at once → one wins, the other 410 NOT_VALID; never a second account; the provider sends no email of its own (none through MailPort either)", lost?.status === 410 && lost.body.code === "INVITATION_NOT_VALID" && mail.sent.length === mailBefore && created === 1, lost?.body);
  const joined = sql(`select count(*) || ':' || max(payload::text) from module_event where type = 'staff.joined'`);
  ok("PF-4b pass/fail (ruling 5): accept writes one staff.joined event (ids only: staff and invitation); the second accept (410) writes none", joined === `1:{"staffId": "${won!.body.staffId}", "invitationId": "${fresh.id}"}`, joined);
  const late = await Promise.all([expired.token, revoked.token, fresh.token].map((t) => call(base, "POST", `/api/public/invitations/${t}/accept`)));
  ok("PF-4b fail: accepting an expired (410 EXPIRED), revoked or used (410 NOT_VALID) token creates nobody", late[0].status === 410 && late[0].body.code === "INVITATION_EXPIRED" && late.slice(1).every((l) => l.status === 410 && l.body.code === "INVITATION_NOT_VALID") && created === 1 && sql(`select count(*) from platform_staff where email in ('late.person@example.com','gone.person@example.com')`) === "0", late.map((l) => l.body));
  const retry = invite("retry.person@example.com"), handOff = admin.handOff.bind(admin); admin.handOff = async () => { throw new Error("forced provider failure"); };
  const r1 = await call(base, "POST", `/api/public/invitations/${retry.token}/accept`); admin.handOff = handOff;
  const r2 = await call(base, "POST", `/api/public/invitations/${retry.token}/accept`), other = await call(base, "POST", `/api/public/invitations/${invite(sql(`select email from platform_staff where id = '${S}'`)).token}/accept`);
  ok("PF-4b fail (break B1, B2): a provider failure after its user was made rolls back and the retry joins (the provider user reused); an email already signing in to another firm → 409 EMAIL_IN_ANOTHER_FIRM, nobody added", r1.status === 500 && r2.status === 200 && sql(`select count(*) from platform_staff where email = 'retry.person@example.com'`) === "1" && other.status === 409 && other.body.code === "EMAIL_IN_ANOTHER_FIRM" && sql(`select count(*) from platform_staff where id <> '${S}' and email = (select email from platform_staff where id = '${S}')`) === "0", [r1.status, r2.body, other.body]);
  ok("PF-4b fail (break B5): a trigger named like an object's own property (constructor) sends nothing and never throws", (await handleCustomEmail({ triggerSource: "constructor", request: { code: "x", userAttributes: { email: "a@example.com" } } }, { decrypt: async (c) => c, mail, firmOf: async () => FIRM_A })).sent === false);
  ok("PF-4b fail: the provider's own invitation mail (AdminCreateUser) is never sent by the custom email sender", (await handleCustomEmail({ triggerSource: "CustomEmailSender_AdminCreateUser", request: { code: "x", userAttributes: { email: "new.person@example.com" } } }, { decrypt: async (c) => c, mail, firmOf: async () => FIRM_A })).sent === false && mail.sent.length === mailBefore);
  const code = /#code=([A-Za-z0-9_-]+)$/.exec(won!.body.handOff.url)?.[1] ?? "";
  const cb = await call(base, "POST", "/api/platform/session/callback", { body: { code } }), cb2 = await call(base, "POST", "/api/platform/session/callback", { body: { code } });
  const newMe = await call(base, "GET", "/api/platform/me/account", { token: cb.body.token });
  ok("PF-4b pass: the hand-off's code → a session for the new person (callback), never cached", cb.status === 200 && newMe.status === 200 && newMe.body.staffId === won!.body.staffId && cb.headers.get("cache-control") === "no-store", [cb.body, newMe.body]);
  ok("PF-4b fail: the same code twice → 401 SIGN_IN_CODE_REFUSED; none → 422 naming code (PF-28 part 2a: the one input rule)", cb2.status === 401 && cb2.body.code === "SIGN_IN_CODE_REFUSED" && (await call(base, "POST", "/api/platform/session/callback", { body: {} })).body?.fields?.code === "This is required.", cb2.body);

  // ------------------------------------------------------------------------------------- sign out, everywhere
  const oId = (await db.platformStaff.findFirstOrThrow({ where: { email: "new.person@example.com" } })).id;
  const d1 = local.issue(oId, { authTimeMs: clock.now() + 1, secondStep: true }), d2 = local.issue(oId, { authTimeMs: clock.now() + 2, secondStep: true });
  clock.t += 1000;
  const before = await Promise.all([d1, d2].map((t) => call(base, "GET", "/api/platform/me", { token: t })));
  const soeAudit = audits("platform.staff.signed_out_everywhere");
  const soe = await call(base, "POST", `/api/platform/staff/${oId}/sign-out-everywhere`, { token: tR });
  const after = await Promise.all([d1, d2].map((t) => call(base, "GET", "/api/platform/me", { token: t })));
  ok("PF-4b pass: sign-out-everywhere ends every session of that person at once (two live sessions → both 401), one audit line, the provider told", before.every((b) => b.status === 200) && soe.status === 200 && after.every((a) => a.status === 401 && a.body.code === "SESSION_REVOKED") && audits("platform.staff.signed_out_everywhere") === soeAudit + 1 && admin.signedOut.includes(oId), [soe.body, after.map((a) => a.body.code)]);
  const others = await Promise.all([call(base, "GET", "/api/platform/me", { token: tR }), call(base, "POST", `/api/platform/staff/${R}/sign-out-everywhere`, { token: tO })]);
  ok("PF-4b fail: it ends no one else's session (the Owner's still works), and a person without agent/staff:manage cannot do it (403)", others[0].status === 200 && others[1].status === 403, others.map((o) => o.status));
  const crossRev = revs(S), crossAudit = audits("platform.staff.two_step_reset") + audits("platform.staff.signed_out_everywhere"), crossMail = mail.sent.length;
  const cross = await Promise.all([`/api/platform/staff/${S}/reset-two-step`, `/api/platform/staff/${S}/sign-out-everywhere`, `/api/platform/staff/${S.toUpperCase()}/sign-out-everywhere`].map((p) => call(base, "POST", p, { token: tR })));
  ok("PF-4b fail: firm A's Owner resetting or signing out firm B's person (a guessed id, any letter case) → 404, no revocation, no audit line, no email", cross.every((c) => c.status === 404) && revs(S) === crossRev && audits("platform.staff.two_step_reset") + audits("platform.staff.signed_out_everywhere") === crossAudit && mail.sent.length === crossMail, cross.map((c) => c.status));
  const tT = await signIn("user-T"); const out = await call(base, "POST", "/api/platform/session/sign-out", { token: tT }); const afterOut = await call(base, "GET", "/api/platform/me", { token: tT });
  ok("PF-4b pass/fail: sign-out ends the person's own session (200, then 401) with one audit line", out.status === 200 && afterOut.status === 401 && audits("platform.staff.signed_out") === 1, [out.body, afterOut.body]);

  // ------------------------------------------------------------------------------ step-up and resetting two-step
  ok("PF-4b DWn pass/fail: the step-up check allows a sign-in 5 minutes old and refuses one older (401 STEP_UP_REQUIRED)", (() => { try { requireStepUp({ authTime: 1000 }, 1000_000 + 300_000, "x"); } catch { return false; } try { requireStepUp({ authTime: 1000 }, 1000_000 + 301_000, "x"); return false; } catch (e: any) { return e.getStatus() === 401 && e.getResponse().code === "STEP_UP_REQUIRED"; } })());
  sql(`insert into platform_role_grant (id, firm_id, staff_id, role, granted_by) values (gen_random_uuid(), '${FIRM_A}', '${T}', 'ADMIN', 'check')`);
  tR = await signIn("user-R"); const tTA = await signIn("user-T");
  const own = await call(base, "POST", `/api/platform/staff/${R}/reset-two-step`, { token: tR });
  const adminOwner = await call(base, "POST", `/api/platform/staff/${R}/reset-two-step`, { token: tTA });
  const byOfficer = await call(base, "POST", `/api/platform/staff/${T}/reset-two-step`, { token: tO });
  const adminSoe = await call(base, "POST", `/api/platform/staff/${R}/sign-out-everywhere`, { token: tTA });
  ok("PF-4b fail: an Admin cannot sign an Owner out everywhere (403 OWNER_ONLY); the Owner's session still works", adminSoe.status === 403 && adminSoe.body.code === "OWNER_ONLY" && (await call(base, "GET", "/api/platform/me", { token: tR })).status === 200, adminSoe.body);
  ok("PF-4b fail: nobody resets their own two-step (403 OWN_TWO_STEP); an Admin cannot reset an Owner's (403 OWNER_ONLY); a Case Officer cannot at all (403)", own.status === 403 && own.body.code === "OWN_TWO_STEP" && adminOwner.status === 403 && adminOwner.body.code === "OWNER_ONLY" && byOfficer.status === 403, [own.body, adminOwner.body, byOfficer.status]);
  clock.t += 6 * 60_000;
  const resetAudit = audits("platform.staff.two_step_reset"), revT = revs(T), sentBefore = mail.sent.length;
  const stale = await call(base, "POST", `/api/platform/staff/${T}/reset-two-step`, { token: tR });
  ok("PF-4b DWn fail: an Owner whose sign-in is older than 5 minutes → 401 STEP_UP_REQUIRED (\"Confirm it's you\"), nothing changed, nobody emailed", stale.status === 401 && stale.body.code === "STEP_UP_REQUIRED" && audits("platform.staff.two_step_reset") === resetAudit && revs(T) === revT && mail.sent.length === sentBefore, stale.body);
  tR = await signIn("user-R");
  failMail = true; const mailDown = await call(base, "POST", `/api/platform/staff/${T}/reset-two-step`, { token: tR }); failMail = false;
  ok("PF-4b fail: when the email to the person cannot be sent, the reset rolls back (no audit line, no ended session, the provider unchanged)", mailDown.status >= 500 && audits("platform.staff.two_step_reset") === resetAudit && revs(T) === revT && (await admin.twoStep({ staffId: T, subject: null, email: "" })).method === "TOTP", mailDown.status);
  const reset = await call(base, "POST", `/api/platform/staff/${T}/reset-two-step`, { token: tR });
  const tMail = mail.inbox(sql(`select email from platform_staff where id = '${T}'`));
  const tList = (await call(base, "GET", "/api/platform/staff", { token: tR })).body.staff.find((s: any) => s.id === T);
  ok("PF-4b DWn pass: within 5 minutes the Owner resets the Admin's two-step: one audit line, the person's sessions end, they are emailed through MailPort, the list shows two-step not set up",
    reset.status === 200 && audits("platform.staff.two_step_reset") === resetAudit + 1 && (await call(base, "GET", "/api/platform/me", { token: tTA })).status === 401 && tMail.length === 1 && tMail[0].templateKey === "identity.two_step_reset" && tList?.twoStep?.method === null, [reset.body, tMail.length, tList]);
  clock.t += 6 * 60_000;
  const staleOwner = await call(base, "PATCH", `/api/platform/staff/${O}/roles`, { token: tR, body: { roles: ["CASE_OFFICER", "OWNER"], reason: "cover while away" } });
  tR = await signIn("user-R");
  const freshOwner = await call(base, "PATCH", `/api/platform/staff/${O}/roles`, { token: tR, body: { roles: ["CASE_OFFICER", "OWNER"], reason: "cover while away" } });
  ok("PF-4b DWn fail (ruling 1): PF-4's Owner-role change with an auth_time older than 5 minutes → 401 STEP_UP_REQUIRED, nothing changed", staleOwner.status === 401 && staleOwner.body.code === "STEP_UP_REQUIRED" && staleOwner.body.title === "Confirm it's you", staleOwner.body);
  ok("PF-4b DWn pass (ruling 1): within 5 minutes the same change is allowed (200; O holds Owner)", freshOwner.status === 200 && freshOwner.body.roles.includes("OWNER"), freshOwner.body);
  sql(`update platform_role_grant set ended_at = now(), ended_by = 'check', end_reason = 'check' where staff_id = '${O}' and role = 'OWNER' and ended_at is null`);

  // --------------------------------------------------------------------- one audit line in the transaction, fail-closed
  const record = auditEvent.record.bind(auditEvent); const revO = revs(O);
  auditEvent.record = async () => { throw new Error("forced audit failure"); };
  const forced = await call(base, "POST", `/api/platform/staff/${O}/sign-out-everywhere`, { token: tR });
  auditEvent.record = record;
  ok("PF-4b fail: a forced audit failure rolls the change back (sign-out-everywhere: no revocation row, O's session still works)", forced.status >= 500 && revs(O) === revO && (await call(base, "GET", "/api/platform/me", { token: tO })).status === 200, forced.status);
  ok("PF-4b pass: each change wrote its line through AuditPort (platform entity, firm id in detail, ids only)", sql(`select count(*) from audit_event where action in ('platform.invitation.accepted','platform.staff.signed_out','platform.staff.signed_out_everywhere','platform.staff.two_step_reset') and detail->>'firmId' = '${FIRM_A}'`) === "5");

  // ------------------------------------------------------------------------- the custom email sender, the adapters
  const sentC = mail.sent.length;
  const forgot = await handleCustomEmail({ triggerSource: "CustomEmailSender_ForgotPassword", request: { code: "ENCRYPTED", userAttributes: { email: "New.Person@example.com", sub: "x" } } }, { decrypt: async (c) => (c === "ENCRYPTED" ? "493021" : "?"), mail, firmOf: async (w) => (w.email === "new.person@example.com" ? FIRM_A : null) });
  const stranger = await handleCustomEmail({ triggerSource: "CustomEmailSender_ForgotPassword", request: { code: "ENCRYPTED", userAttributes: { email: "nobody@example.com" } } }, { decrypt: async () => "1", mail, firmOf: async () => null });
  ok("PF-4b pass: the custom email sender decrypts the code and sends our words through MailPort (transactional, to the person)", forgot.sent && mail.sent.length === sentC + 1 && /493021/.test(mail.sent.at(-1)!.text) && mail.sent.at(-1)!.class === "TRANSACTIONAL" && mail.sent.at(-1)!.to === "new.person@example.com");
  ok("PF-4b fail: a person who is not our staff, or an unknown trigger, gets nothing", !stranger.sent && !(await handleCustomEmail({ triggerSource: "CustomEmailSender_Other", request: {} }, { decrypt: async () => "", mail, firmOf: async () => FIRM_A })).sent && mail.sent.length === sentC + 1);
  const cog = new CognitoIdentityAdmin({ userPoolId: "ca-central-1_X", clientId: "c", mfaRequired: true });
  ok("PF-4b fail: the cognito admin adapter refuses (503 SIGN_IN_NOT_SET_UP) and says why, never a silent success", await cog.createUser().then(() => false, (e: any) => e.getStatus() === 503 && /technology gate/.test(e.getResponse().detail)));
  await runContract(mailPortContract, "LocalMail", () => new LocalMail(() => clock.now()), ok);
  await runContract(mailPortContract, "fakeMail", () => fakeMail(), ok);

  // ---------------------------------------------------------------------------- a licence number never leaks
  const leaks = { log: printed.includes(LICENCE), email: mail.sent.some((m) => JSON.stringify(m).includes(LICENCE)), audit: sql(`select count(*) from audit_event where summary like '%${LICENCE}%' or detail::text like '%${LICENCE}%'`) !== "0", events: sql(`select count(*) from module_event where payload::text like '%${LICENCE}%'`) !== "0" };
  ok("PF-4b fail: the licence number saved above appears in no log line, email, audit line or event payload (scanned)", !Object.values(leaks).some(Boolean), leaks);
  ok("PF-4b pass: the scan reads the real record (the number is stored on O's licence)", sql(`select licence_number from platform_staff_credential where staff_id = '${O}'`) === LICENCE);

  // ------------------------------------------------------------------------------------- Part B: the real app
  if (PORT) {
    const B = `http://localhost:${PORT}`;
    const pub = await call(B, "GET", `/api/public/invitations/${randomBytes(32).toString("base64url")}`), list401 = await call(B, "GET", "/api/platform/staff");
    ok("PF-4b pass (isolated copy, main.ts): the feature is registered — the public door answers NOT_VALID for an unknown token", pub.status === 200 && pub.body.state === "NOT_VALID", pub);
    ok("PF-4b fail (isolated copy): GET /api/platform/staff with no session → 401", list401.status === 401, list401.status);
  } else console.log("NOTE  Part B (the isolated copy) not run: give a port");
} finally {
  await app?.close().catch(() => {});
  await db.$disconnect();
  try { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]); } catch { /* left for prune-test-dbs.sh */ }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
