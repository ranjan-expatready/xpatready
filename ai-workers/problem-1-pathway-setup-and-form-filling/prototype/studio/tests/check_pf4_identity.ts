// PF-4 (BACKLOG row PF-4; contracts §1.2 and §7 §1.2, binding; tech gate entry 2): staff sign-in behind IdentityPort,
// the platform guard with declared permission keys, the staff and invitation routes and their guardrails, two-step
// sign-in fixed on, PF-3 review items m4/m6/m8/m9/m10, the Sample seed line (P-571 (2)) and the demo reset's platform
// step (P-571 (1), B-6). Every line of the row's "Done when", each with a passing and a failing case.
// Part A runs in this process: a scratch database (every migration, PF-3's Sample seed) and two small Nest apps built
// from the feature's own classes beside core.ts's ConfigReadGuard and a stand-in "existing" route: one with the local
// stand-in and a test clock, one with the Cognito adapter loaded with a test key set (cacheJwks: never the network).
// Part B reads the isolated copy started by the usage line (the real main.ts with PLATFORM_IDENTITY=local and
// PLATFORM_SAMPLE_SEED=on): the seed line ran, user-R signs in through the stand-in, the existing routes and the
// simulated-person header behave as before, and the real demo reset keeps every platform audit line. No model call (US$0).
//   zsh studio/tools/isolated.sh pf4 4541 start PLATFORM_IDENTITY=local PLATFORM_SAMPLE_SEED=on && tsx studio/tests/check_pf4_identity.ts 4541
import "reflect-metadata";
import { Controller, Get, Module, Post } from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { createSign, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations");
const PORT = Number(process.argv[2] ?? 4541), BASE = `http://localhost:${PORT}`, COPY_DB = process.env.STUDIO_DB ?? "xr_studio_pf4";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_pf4_scratch_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const sql = (db: string, q: string) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
const throwsLike = async (f: () => unknown, test: (e: unknown) => boolean) => { try { await f(); return false; } catch (e) { return test(e); } };

// Everything this process prints, to scan for licence numbers (a log line must never carry one).
let printed = "";
for (const s of [process.stdout, process.stderr]) { const w = s.write.bind(s); s.write = ((chunk: unknown, ...a: unknown[]) => { printed += String(chunk); return (w as (...x: unknown[]) => boolean)(chunk, ...a); }) as typeof s.write; }

type Res = { status: number; body: any };
const call = async (base: string, method: string, path: string, o: { token?: string; auth?: string; actor?: string; body?: unknown } = {}): Promise<Res> => {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (o.token) headers.authorization = `Bearer ${o.token}`;
  if (o.auth) headers.authorization = o.auth;
  if (o.actor) headers["x-actor"] = o.actor;
  const r = await fetch(`${base}${path}`, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  const text = await r.text();
  let body: any = text; try { body = JSON.parse(text); } catch { /* text */ }
  return { status: r.status, body };
};

// ------------------------------------------------------------------------------------------- the scratch database
execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", DB]); execFileSync(join(BIN, "createdb"), [...PG, DB]);
for (const d of readdirSync(MIG).filter((x) => /^\d{14}_/.test(x)).sort()) execFileSync(join(BIN, "psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
process.env.DATABASE_URL = urlOf(DB);
for (const k of ["PLATFORM_IDENTITY", "PLATFORM_ENVIRONMENT", "PLATFORM_SAMPLE_SEED", "PLATFORM_POOL_MFA_REQUIRED", "PLATFORM_LOCAL_SECRET"]) delete process.env[k];

const { ConfigReadGuard, Db } = await import("../api/src/core.ts");
const { seedSampleFirms, readSampleFirms } = await import("../api/src/platform/seed-sample-firms.ts");
const { readSetting, writeSetting, SettingRefused } = await import("../api/src/platform/settings.ts");
const { PlatformClock, IdentityRefused, identityConfig } = await import("../api/src/platform/identity/port.ts");
const { LocalIdentity } = await import("../api/src/platform/identity/local.ts");
const { CognitoIdentity } = await import("../api/src/platform/identity/cognito.ts");
const { IDENTITY_PORT, PlatformIdentity, ONLY_OWNER, ANOTHER_DEVICE, emailOf } = await import("../api/src/platform/identity/service.ts");
const { PlatformGuard, assertEveryRouteDeclared } = await import("../api/src/platform/identity/guard.ts");
const { PlatformIdentityController } = await import("../api/src/platform/identity/routes.ts");
const { PermissionKeys } = await import("../api/src/platform/identity/keys.ts");
const { platformAuditWorkspaceId, PLATFORM_AUDIT_WORKSPACE } = await import("../api/src/platform/identity/audit.ts");
const { EVENT, StaffEventPayload, StaffRolesChanged } = await import("../ports/events.ts");
const { resetSampleFirmSettings } = await import("../api/src/platform/identity/demo-reset.ts");
const { sampleSeedDecision, seedSampleOnStart } = await import("../api/src/platform/identity/sample-seed.ts");
const feature = (await import("../api/src/features/platform-identity.ts")).default;

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(DB), options: "-c TimeZone=UTC" }) });

// A stand-in for every existing route: a configuration read, guarded by core.ts as before.
@Controller("api/probe") class ProbeController { @Get() read() { return { ok: true }; } }
// Routes that must stop the start-up.
@Controller("api/platform") class UndeclaredController { @Get("undeclared-thing") thing() { return 1; } }
@Controller("api/front-office") class SystemKeyController { @Post("verify-firm") @PermissionKeys("system/firm:verify") verify() { return 1; } }

const clock = new (class extends PlatformClock { t = Date.now(); override now() { return this.t; } })();
const local = new LocalIdentity("pf4-check-signing-key-0123456789abcdef", () => clock.now());
const POOL = "ca-central-1_PF4Check", CLIENT = "pf4checkclient";
const cognito = new CognitoIdentity({ userPoolId: POOL, clientId: CLIENT, mfaRequired: true });

async function makeApp(port: unknown, extra: unknown[] = []) {
  const providers = [Db, { provide: APP_GUARD, useClass: ConfigReadGuard }, { provide: PlatformClock, useValue: clock }, { provide: IDENTITY_PORT, useValue: port }, PlatformIdentity, PlatformGuard, { provide: APP_GUARD, useExisting: PlatformGuard }];
  @Module({ controllers: [ProbeController, PlatformIdentityController, ...extra] as never[], providers: providers as never[] }) class TestApp {}
  const app = await NestFactory.create(TestApp, { logger: false });
  await app.listen(0, "127.0.0.1");
  const addr = app.getHttpServer().address() as { port: number };
  return { app, base: `http://127.0.0.1:${addr.port}` };
}

const apps: { close(): Promise<void> }[] = [];
try {
  const seeded = await seedSampleFirms(db);
  ok("setup: PF-3's Sample seed in the scratch database (2 firms, 4 staff)", seeded.firmsAdded === 2 && seeded.staffAdded === 4, seeded);
  const firm = async (key: string) => (await db.platformFirm.findUniqueOrThrow({ where: { key } })).id;
  const staffId = async (actorId: string) => (await db.platformStaff.findFirstOrThrow({ where: { actorId } })).id;
  const FIRM_A = await firm("sample-firm"), FIRM_B = await firm("sample-solo");
  const R = await staffId("user-R"), O = await staffId("user-O"), T = await staffId("user-T"), S = await staffId("user-S");
  const L = await makeApp(local); apps.push(L.app);
  const signIn = async (actorId: string, firmKey = "sample-firm", secondStep: unknown = true) => call(L.base, "POST", "/api/platform/session/local", { body: { firmKey, actorId, secondStep } });
  const tokenOf = async (actorId: string, firmKey = "sample-firm") => { const r = await signIn(actorId, firmKey); if (r.status !== 200) throw new Error(`sign-in ${actorId}: ${JSON.stringify(r.body)}`); return r.body.token as string; };

  // ---------------------------------------------------------------------------- the start-up rule (default deny)
  ok("PF-4 pass: the feature's own routes all declare their access, so the app starts", !!L.base);
  ok("PF-4 pass: the feature registers the guard after core.ts's own (APP_GUARD) and the routes",
    feature.controllers.includes(PlatformIdentityController) && (feature.providers as unknown[]).some((p) => (p as { provide?: unknown }).provide === APP_GUARD));
  ok("PF-4 fail: a platform route with no declared keys stops the start-up, naming it",
    await throwsLike(async () => { const a = await makeApp(local, [UndeclaredController]); apps.push(a.app); }, (e) => /UndeclaredController\.thing \(GET \/api\/platform\/undeclared-thing\)/.test(String(e))));
  ok("PF-4 fail: a firm route declaring a system/* key stops the start-up, naming it (firm routes accept only agent/* keys)",
    await throwsLike(async () => { const a = await makeApp(local, [SystemKeyController]); apps.push(a.app); }, (e) => /agent\/\* keys.*SystemKeyController\.verify .*system\/firm:verify/.test(String(e))));
  ok("PF-4 pass: the rule itself accepts declared agent/* routes and refuses none of them",
    !(await throwsLike(() => assertEveryRouteDeclared([{ name: "X.y", method: "GET", path: "/api/platform/x", access: { kind: "keys", keys: ["agent/staff:manage"] } }]), () => true)));

  // ------------------------------------------------------------------- the local stand-in and two-step sign-in
  ok("PF-4 fail: PLATFORM_IDENTITY=local is refused in the test environment and in production",
    await throwsLike(() => identityConfig({ PLATFORM_IDENTITY: "local", PLATFORM_ENVIRONMENT: "test" }), (e) => /never runs in the test environment or production/.test(String(e)))
    && await throwsLike(() => identityConfig({ PLATFORM_IDENTITY: "local", PLATFORM_ENVIRONMENT: "production" }), (e) => /never runs/.test(String(e))));
  ok("PF-4 pass: PLATFORM_IDENTITY=local is accepted where the environment is local (what this check sets)", identityConfig({ PLATFORM_IDENTITY: "local" }).identity === "local");
  const noSecond = await signIn("user-R", "sample-firm", false);
  ok("PF-4 fail: two-step is required — a sign-in without the second step is refused (401 TWO_STEP_REQUIRED)", noSecond.status === 401 && noSecond.body.code === "TWO_STEP_REQUIRED", noSecond);
  const halfToken = local.issue(R, { authTimeMs: clock.now(), secondStep: false });
  const half = await call(L.base, "GET", "/api/platform/me", { token: halfToken });
  ok("PF-4 fail: a stand-in token that says the second step was not done is refused by the guard", half.status === 401 && half.body.code === "TWO_STEP_REQUIRED", half);
  ok("PF-4 pass: the firm switch \"Require two-step sign-in for all staff\" reads on, and it cannot be turned off (fixed, not a choice)",
    await readSetting(db, FIRM_A, "platform.require_two_step") === true
    && await throwsLike(() => writeSetting(db, { firmId: FIRM_A, key: "platform.require_two_step", value: false, by: "check", workspaceId: randomUUID() }), (e) => e instanceof SettingRefused));

  // ---------------------------------------------------------------------- user-R: a Case Manager with a licence
  let tR = await tokenOf("user-R");
  const meR = await call(L.base, "GET", "/api/platform/me", { token: tR });
  ok("PF-4 pass: user-R signs in through the local stand-in as a Case Manager with a licence, and its duties include represent",
    meR.status === 200 && meR.body.roles.includes("CASE_MANAGER") && meR.body.licensed === true && meR.body.duties.includes("represent") && meR.body.duties.includes("firm_admin") && meR.body.keys.includes("agent/case:form-approve"), meR.body);
  const tO = await tokenOf("user-O");
  const meO = await call(L.base, "GET", "/api/platform/me", { token: tO });
  ok("PF-4 fail: user-O (Case Officer, no licence) has the case duty but neither represent nor firm_admin",
    meO.status === 200 && meO.body.duties.join() === "case" && meO.body.licensed === false, meO.body);
  ok("PF-4 pass: every key the guard reads is a firm key (agent/*); none is system/*", [...meR.body.keys, ...meO.body.keys].every((k: string) => k.startsWith("agent/")));
  const noToken = await Promise.all(["user-R", "representative", "user-A"].map((actor) => call(L.base, "GET", "/api/platform/me", { actor })));
  ok("PF-4 fail (Lead 43's condition on core.ts's line): the simulated-person header alone (X-Actor: user-R, its persona name, a configuration person) is refused 401 on a platform route",
    noToken.every((r) => r.status === 401 && r.body.code === "NOT_SIGNED_IN"), noToken.map((r) => [r.status, r.body.code]));
  // An adult's link session token has exactly this shape (person-link.ts: 32 random bytes, base64url, 43 characters).
  const linkToken = randomBytes(32).toString("base64url");
  const asLink = await Promise.all([call(L.base, "GET", "/api/platform/me", { auth: `Bearer ${linkToken}` }), call(L.base, "GET", "/api/platform/staff/invitations", { auth: `Bearer ${linkToken}`, actor: "user-R" })]);
  ok("PF-4 fail (Lead 43's condition on core.ts's line): a link-session Bearer token on GET /api/platform/me is refused 401 (also with a simulated person beside it)",
    linkToken.length === 43 && asLink.every((r) => r.status === 401 && r.body.code === "TOKEN_REFUSED"), asLink.map((r) => [r.status, r.body.code]));
  const missingKey = await call(L.base, "GET", "/api/platform/staff/invitations", { token: tO });
  ok("PF-4 fail: a route's declared key that the person lacks is refused 403 (default deny)", missingKey.status === 403 && missingKey.body.code === "MISSING_PERMISSION", missingKey);

  // ----------------------------------------------------- every other route and the simulated-person header as before
  const probe = await Promise.all([call(L.base, "GET", "/api/probe", { actor: "user-A" }), call(L.base, "GET", "/api/probe"), call(L.base, "GET", "/api/probe", { actor: "user-O" }), call(L.base, "GET", "/api/probe", { token: tR }), call(L.base, "GET", "/api/probe", { token: tR, actor: "user-A" })]);
  ok("PF-4 pass: an existing route still reads the simulated-person header (user-A 200)", probe[0].status === 200);
  ok("PF-4 fail: an existing route still refuses nobody (401), a case person on a configuration read (403), and any Bearer header (403 link-only), so a staff session gives no access outside the platform paths",
    probe[1].status === 401 && probe[2].status === 403 && probe[3].status === 403 && /link/i.test(JSON.stringify(probe[3].body)) && probe[4].status === 403, probe.map((p) => p.status));

  // --------------------------------------------------------------------------------- the Cognito path (test keys)
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const KID = "pf4-check-key";
  cognito.cacheJwks({ keys: [{ ...(publicKey.export({ format: "jwk" }) as Record<string, string>), kid: KID, alg: "RS256", use: "sig" }] } as never);
  const ISS = `https://cognito-idp.ca-central-1.amazonaws.com/${POOL}`;
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = (claims: Record<string, unknown>, key = privateKey) => { const body = `${b64({ alg: "RS256", kid: KID, typ: "JWT" })}.${b64(claims)}`; return `${body}.${createSign("RSA-SHA256").update(body).sign(key).toString("base64url")}`; };
  const nowS = () => Math.floor(Date.now() / 1000);
  const access = (o: Record<string, unknown> = {}) => jwt({ sub: "cognito-sub-T", iss: ISS, client_id: CLIENT, token_use: "access", scope: "aws.cognito.signin.user.admin", auth_time: nowS() - 30, iat: nowS() - 30, exp: nowS() + 3600, jti: randomUUID(), origin_jti: randomUUID(), username: "t", ...o });
  await db.platformStaff.update({ where: { id: T }, data: { identitySubject: "cognito-sub-T" } });
  const C = await makeApp(cognito); apps.push(C.app);
  const cGood = await call(C.base, "GET", "/api/platform/me", { token: access() });
  ok("PF-4 pass: Cognito path — an access token signed by the pool's (test) key, right issuer and client, maps to its staff member", cGood.status === 200 && cGood.body.staffId === T && cGood.body.via === "cognito", cGood);
  const cases: [string, string, (b: any) => boolean][] = [
    ["wrong issuer", access({ iss: "https://cognito-idp.ca-central-1.amazonaws.com/ca-central-1_Other" }), (b) => /another sign-in service/.test(b.detail)],
    ["wrong client (audience)", access({ client_id: "another-client" }), (b) => /another application/.test(b.detail)],
    ["expired", access({ exp: nowS() - 10, iat: nowS() - 4000, auth_time: nowS() - 4000 }), (b) => b.code === "TOKEN_EXPIRED"],
    ["an ID token for an access token", jwt({ sub: "cognito-sub-T", iss: ISS, aud: CLIENT, token_use: "id", auth_time: nowS() - 30, iat: nowS() - 30, exp: nowS() + 3600, email: "x@example.com" }), (b) => /ID token/.test(b.detail)],
    ["unknown subject", access({ sub: "cognito-sub-nobody" }), (b) => b.code === "UNKNOWN_STAFF"],
    ["signed with another key", access({}).split(".").slice(0, 2).join(".") + "." + createSign("RSA-SHA256").update(access({}).split(".").slice(0, 2).join(".")).sign(other.privateKey).toString("base64url"), (b) => /signature/i.test(b.detail)],
  ];
  for (const [what, token, why] of cases) { const r = await call(C.base, "GET", "/api/platform/me", { token }); ok(`PF-4 fail: Cognito path — ${what} → 401`, r.status === 401 && why(r.body), r); }
  const cOlder = access({ auth_time: nowS() - 600, iat: nowS() - 60 });
  const cNewer = access({ auth_time: nowS() - 5 });
  const newer = await call(C.base, "GET", "/api/platform/me", { token: cNewer }), older = await call(C.base, "GET", "/api/platform/me", { token: cOlder });
  ok("PF-4 pass/fail: Cognito path — a newer sign-in works and ends the older session (\"You signed in on another device\")", newer.status === 200 && older.status === 401 && older.body.detail === ANOTHER_DEVICE, [newer.status, older.body]);
  const fresh = await db.platformStaff.create({ data: { firmId: FIRM_B, email: "cognito.new@sample-solo.example.com", displayName: "New person (Sample)", status: "ACTIVE", identitySubject: "cognito-sub-new" } });
  await db.platformRoleGrant.create({ data: { firmId: FIRM_B, staffId: fresh.id, role: "READ_ONLY", grantedBy: "check" } });
  const deviceA = access({ sub: "cognito-sub-new", auth_time: nowS() - 600, iat: nowS() - 60 }), deviceB = access({ sub: "cognito-sub-new", auth_time: nowS() - 60 });
  const firstB = await call(C.base, "GET", "/api/platform/me", { token: deviceB }), thenA = await call(C.base, "GET", "/api/platform/me", { token: deviceA });
  ok("PF-4 fail (review r2-m1): a never-used account's first sign-ins — device B (newer) calls first, then device A (older, never used) is refused \"You signed in on another device\"",
    firstB.status === 200 && thenA.status === 401 && thenA.body.detail === ANOTHER_DEVICE, [firstB.status, thenA.body]);
  await db.platformRoleGrant.updateMany({ where: { staffId: fresh.id }, data: { endedAt: new Date(), endedBy: "check" } });
  await db.platformStaff.update({ where: { id: fresh.id }, data: { status: "DEACTIVATED", deactivationReason: "check person" } });
  const noMfa = new CognitoIdentity({ userPoolId: POOL, clientId: CLIENT, mfaRequired: false });
  ok("PF-4 fail: PLATFORM_POOL_MFA_REQUIRED=false makes every Cognito sign-in refused, saying why",
    await throwsLike(() => noMfa.verify(cNewer), (e) => (e as { code?: string }).code === "TWO_STEP_REQUIRED" && /PLATFORM_POOL_MFA_REQUIRED=false/.test((e as Error).message)));
  ok("PF-4 fail: a pool outside ca-central-1, or none, is not set up (every token refused, saying why)",
    !new CognitoIdentity({ userPoolId: "us-east-1_X", clientId: "c", mfaRequired: true }).ready && await throwsLike(() => new CognitoIdentity({ userPoolId: null, clientId: null, mfaRequired: true }).verify("x"), (e) => (e as { code?: string }).code === "SIGN_IN_NOT_SET_UP"));
  const cLocal = await call(C.base, "POST", "/api/platform/session/local", { body: { firmKey: "sample-firm", actorId: "user-R", secondStep: true } });
  ok("PF-4 fail: POST /api/platform/session/local is refused when PLATFORM_IDENTITY is not local", cLocal.status === 403 && cLocal.body.code === "LOCAL_SIGN_IN_OFF", cLocal);

  // --------------------------------------------------------------------------------- one session at a time
  const tR2 = await tokenOf("user-R");
  const [first, second] = [await call(L.base, "GET", "/api/platform/me", { token: tR }), await call(L.base, "GET", "/api/platform/me", { token: tR2 })];
  ok("PF-4 pass: the new sign-in's session works", second.status === 200);
  ok("PF-4 fail: a second sign-in revokes the first session — its next call is 401 \"You signed in on another device\"", first.status === 401 && first.body.detail === ANOTHER_DEVICE && first.body.code === "SIGNED_IN_ELSEWHERE", first.body);
  tR = tR2;

  // ------------------------------------------------------------------------------------------------ roles
  const own = await call(L.base, "PATCH", `/api/platform/staff/${R}/roles`, { token: tR, body: { roles: ["OWNER"] } });
  ok("PF-4 fail: nobody changes their own roles (403 OWN_ROLES)", own.status === 403 && own.body.code === "OWN_ROLES", own);
  const makeAdmin = await call(L.base, "PATCH", `/api/platform/staff/${O}/roles`, { token: tR, body: { roles: ["CASE_OFFICER", "ADMIN"] } });
  ok("PF-4 pass: an Owner changes another person's roles (user-O: Case Officer + Admin); one audit line and one staff.roles_changed event",
    makeAdmin.status === 200 && makeAdmin.body.changed && sql(DB, `select count(*) from audit_event where entity = 'platform_staff' and action = 'platform.staff.roles_changed' and entity_key = '${O}'`) === "1"
    && sql(DB, `select count(*) from module_event where type = 'staff.roles_changed' and subject_id = '${O}'`) === "1", makeAdmin);
  const extra = await db.platformStaff.create({ data: { firmId: FIRM_A, email: "extra@sample-firm.example.com", displayName: "Extra person (Sample)", status: "ACTIVE" } });
  await db.platformRoleGrant.create({ data: { firmId: FIRM_A, staffId: extra.id, role: "READ_ONLY", grantedBy: "check" } });
  const tAdmin = await tokenOf("user-O");
  const adminKeys = new Set(sql(DB, `select string_agg(permission_key, ',') from platform_role_permission where role = 'ADMIN'`).split(","));
  const cmBeyond = sql(DB, `select count(*) from platform_role_permission where role = 'CASE_MANAGER' and permission_key not in (select permission_key from platform_role_permission where role in ('ADMIN','CASE_OFFICER'))`);
  const within = (["CASE_OFFICER", "READ_ONLY", "BILLING_FINANCE"] as const).find((role) => sql(DB, `select string_agg(permission_key, ',') from platform_role_permission where role = '${role}'`).split(",").every((k) => adminKeys.has(k)));
  const beyond = await call(L.base, "PATCH", `/api/platform/staff/${extra.id}/roles`, { token: tAdmin, body: { roles: ["READ_ONLY", "CASE_MANAGER"] } });
  ok(`PF-4 fail: an Admin cannot give a role holding a key it lacks (Case Manager: ${cmBeyond} sign-off keys beyond the Admin's) — 403 ROLE_BEYOND_OWN_KEYS`, Number(cmBeyond) > 0 && beyond.status === 403 && beyond.body.code === "ROLE_BEYOND_OWN_KEYS", beyond);
  const allowed = within && await call(L.base, "PATCH", `/api/platform/staff/${extra.id}/roles`, { token: tAdmin, body: { roles: [...new Set(["READ_ONLY", within])] } });
  ok(`PF-4 pass: an Admin gives a role whose every key it holds (${within})`, !!allowed && allowed.status === 200, allowed);
  const adminOwner = await call(L.base, "PATCH", `/api/platform/staff/${T}/roles`, { token: tAdmin, body: { roles: ["CASE_MANAGER", "OWNER"], reason: "second owner" } });
  ok("PF-4 fail: only an Owner gives the Owner role (an Admin → 403 OWNER_ONLY)", adminOwner.status === 403 && adminOwner.body.code === "OWNER_ONLY", adminOwner);
  const noReason = await call(L.base, "PATCH", `/api/platform/staff/${T}/roles`, { token: tR, body: { roles: ["CASE_MANAGER", "OWNER"] } });
  ok("PF-4 fail: giving the Owner role without a reason is refused (400 REASON_REQUIRED)", noReason.status === 400 && noReason.body.code === "REASON_REQUIRED", noReason);
  clock.t += 6 * 60 * 1000;
  const stale = await call(L.base, "PATCH", `/api/platform/staff/${T}/roles`, { token: tR, body: { roles: ["CASE_MANAGER", "OWNER"], reason: "second owner" } });
  ok("PF-4 fail: giving the Owner role with an identity check older than 5 minutes is refused (403 STEP_UP_REQUIRED)", stale.status === 403 && stale.body.code === "STEP_UP_REQUIRED", stale);
  tR = await tokenOf("user-R");
  const giveOwner = await call(L.base, "PATCH", `/api/platform/staff/${T}/roles`, { token: tR, body: { roles: ["CASE_MANAGER", "OWNER"], reason: "second owner for cover" } });
  ok("PF-4 pass: an Owner gives the Owner role with a reason and a fresh identity check (sign-in under 5 minutes ago); the reason is on the audit line",
    giveOwner.status === 200 && sql(DB, `select detail->>'reason' from audit_event where action = 'platform.staff.roles_changed' and entity_key = '${T}' order by at desc limit 1`) === "second owner for cover", giveOwner);

  // --------------------------------------------------------------------------------------- the only-Owner guard
  const tS = await tokenOf("user-S", "sample-solo");
  const before = sql(DB, `select count(*) from audit_event where action = 'platform.staff.only_owner_refused'`);
  const soloSelf = await call(L.base, "POST", `/api/platform/staff/${S}/deactivate`, { token: tS, body: { reason: "leaving" } });
  ok("PF-4 fail: deactivating the firm's only active Owner → 403 with the fixed message, and an audit line (kept although refused)",
    soloSelf.status === 403 && soloSelf.body.detail === ONLY_OWNER && Number(sql(DB, `select count(*) from audit_event where action = 'platform.staff.only_owner_refused'`)) === Number(before) + 1
    && sql(DB, `select status from platform_staff where id = '${S}'`) === "ACTIVE", soloSelf);
  const tT = await tokenOf("user-T");
  const both = await Promise.all([call(L.base, "POST", `/api/platform/staff/${T}/deactivate`, { token: tR, body: { reason: "race" } }), call(L.base, "POST", `/api/platform/staff/${R}/deactivate`, { token: tT, body: { reason: "race" } })]);
  // The loser is refused either by the only-Owner guard (403) or, when the winner's change committed first, because its own
  // sender was deactivated meanwhile (401, re-checked under the firm lock: break m2). Either way exactly one Owner is left.
  const lost = both.find((b) => b.status !== 200);
  ok("PF-4 fail: two Owners deactivating each other at once — one wins, the other is refused (only-Owner 403, or 401 its sender deactivated); one active Owner remains",
    both.filter((b) => b.status === 200).length === 1 && !!lost && ((lost.status === 403 && lost.body.detail === ONLY_OWNER) || (lost.status === 401 && lost.body.code === "SESSION_REVOKED"))
    && sql(DB, `select count(*) from platform_role_grant g join platform_staff s on s.id = g.staff_id where g.firm_id = '${FIRM_A}' and g.role = 'OWNER' and g.ended_at is null and s.status = 'ACTIVE'`) === "1", both);
  const [winner, loser] = both[0].status === 200 ? [{ id: R, token: tR, actor: "user-R" }, { id: T, actor: "user-T" }] : [{ id: T, token: tT, actor: "user-T" }, { id: R, actor: "user-R" }];

  // ------------------------------------------------------------------------- deactivation is at once; reactivation
  const lockedOut = await call(L.base, "GET", "/api/platform/me", { token: loser.id === R ? tR : tT });
  ok("PF-4 fail: a deactivated person's next request → 401 at once (same token that worked a moment ago)", lockedOut.status === 401 && lockedOut.body.code === "STAFF_NOT_ACTIVE", lockedOut);
  const signBack = await signIn(loser.actor);
  ok("PF-4 fail: a deactivated person cannot sign in", signBack.status === 401, signBack);
  const shortReason = await call(L.base, "POST", `/api/platform/staff/${loser.id}/reactivate`, { token: winner.token, body: { reason: "x".repeat(201) } });
  ok("PF-4 fail: a reason over 200 characters is refused (400)", shortReason.status === 400 && shortReason.body.code === "REASON_TOO_LONG", shortReason);
  const back = await call(L.base, "POST", `/api/platform/staff/${loser.id}/reactivate`, { token: winner.token, body: { reason: "back from leave" } });
  ok("PF-4 pass: an Owner reactivates them (seat checked: 4 of 5 used); they sign in again", back.status === 200 && (await signIn(loser.actor)).status === 200, back);
  const oldAfterBack = await call(L.base, "GET", "/api/platform/me", { token: loser.id === R ? tR : tT });
  ok("PF-4 fail: the session from before the deactivation stays dead after reactivation", oldAfterBack.status === 401, oldAfterBack);
  tR = await tokenOf("user-R");

  // ----------------------------------------------------------------------------------- firm A against firm B
  const cross = await Promise.all([
    call(L.base, "POST", `/api/platform/staff/${S}/deactivate`, { token: tR, body: { reason: "cross" } }),
    call(L.base, "PATCH", `/api/platform/staff/${S}/roles`, { token: tR, body: { roles: ["READ_ONLY"] } }),
    call(L.base, "PUT", `/api/platform/staff/${S}/credential`, { token: tR, body: { representativeType: "RCIC", licensingBody: "CICC", licenceNumber: "R000000" } }),
  ]);
  ok("PF-4 fail: firm A's Owner acting on firm B's staff → 404 (never 403), nothing changed", cross.every((c) => c.status === 404) && sql(DB, `select status from platform_staff where id = '${S}'`) === "ACTIVE", cross.map((c) => c.status));
  const ownStaff = await call(L.base, "PATCH", `/api/platform/staff/${extra.id}/roles`, { token: tR, body: { roles: ["READ_ONLY"] } });
  ok("PF-4 pass: the same call on firm A's own staff works", ownStaff.status === 200, ownStaff);

  // ------------------------------------------------------------------------------------- invitations and seats
  const bad = await Promise.all([" a@x.example.com", "a@x.example.com\u2003", "a\u200e@x.example.com", "a\u00ad@x.example.com", "a@x\u3000.example.com", "not-an-email"].map((email) => call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email, roles: ["CASE_OFFICER"] } })));
  ok("PF-4 fail (PF-3 review m9): an email with a space, an em space, a direction mark, a soft hyphen, an ideographic space, or no @ is refused (400)", bad.every((b) => b.status === 400), bad.map((b) => b.status));
  ok("PF-4 pass (m9): an ordinary email is accepted and kept in lower case", emailOf("New.Person@Example.com") === "new.person@example.com");
  const inv1 = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "Invitee.One@example.com", roles: ["CASE_OFFICER"] } });
  ok("PF-4 pass: an invitation within the seat limit (5th of 5: 4 active + 1 invited); no token in the answer (only its hash is stored)",
    inv1.status === 201 && inv1.body.status === "PENDING" && !JSON.stringify(inv1.body).match(/token/i) && sql(DB, `select length(token_hash) from platform_invitation where id = '${inv1.body.id}'`) === "64", inv1);
  ok("PF-4 pass (PF-3 review m6): the 72 hours run from the database's clock (created_at = now(), expires_at = created_at + 72 h), whatever the app's clock says",
    sql(DB, `select (expires_at - created_at = interval '72 hours') and abs(extract(epoch from created_at - now())) < 60 from platform_invitation where id = '${inv1.body.id}'`) === "t");
  const inv2 = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "invitee.two@example.com", roles: ["CASE_OFFICER"] } });
  ok("PF-4 fail: an invitation over the seat limit → 409 PLAN_LIMIT_REACHED (active + suspended + pending count)", inv2.status === 409 && inv2.body.code === "PLAN_LIMIT_REACHED" && inv2.body.seatsLimit === 5 && inv2.body.seatsUsed === 5, inv2);
  const twice = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "invitee.one@example.com", roles: ["CASE_OFFICER"] } });
  ok("PF-4 fail: the same person invited twice → 409 ALREADY_INVITED (resend instead)", twice.status === 409 && twice.body.code === "ALREADY_INVITED", twice);
  const resent = await call(L.base, "POST", `/api/platform/staff/invitations/${inv1.body.id}/resend`, { token: tR });
  ok("PF-4 pass: resend makes a new link and voids the old one (old row revoked, a new hash, 72 h from now)",
    resent.status === 200 && resent.body.replaces === inv1.body.id && sql(DB, `select (revoked_at is not null)::text from platform_invitation where id = '${inv1.body.id}'`) === "true"
    && sql(DB, `select count(distinct token_hash) from platform_invitation where email = 'invitee.one@example.com'`) === "2", resent);
  const resendOld = await call(L.base, "POST", `/api/platform/staff/invitations/${inv1.body.id}/resend`, { token: tR });
  ok("PF-4 fail: the voided invitation cannot be resent or used again (409 INVITATION_CLOSED)", resendOld.status === 409 && resendOld.body.code === "INVITATION_CLOSED", resendOld);
  const revoked = await call(L.base, "POST", `/api/platform/staff/invitations/${resent.body.id}/revoke`, { token: tR });
  const inv2b = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "invitee.two@example.com", roles: ["CASE_OFFICER"] } });
  ok("PF-4 pass: a revoked invitation frees the seat (the refused invitation now goes through)", revoked.status === 200 && inv2b.status === 201, [revoked, inv2b]);
  sql(DB, `update platform_invitation set created_at = now() - interval '80 hours', expires_at = now() - interval '8 hours' where id = '${inv2b.body.id}'`);
  const list = await call(L.base, "GET", "/api/platform/staff/invitations", { token: tR });
  const inv3 = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "invitee.three@example.com", roles: ["READ_ONLY"] } });
  ok("PF-4 pass: the list shows each invitation's state by the database's clock; an expired one holds no seat",
    list.status === 200 && list.body.invitations.map((i: { status: string }) => i.status).sort().join() === "EXPIRED,REVOKED,REVOKED" && inv3.status === 201, [list.body, inv3.status]);
  const giveOwnerByInvite = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tAdmin, body: { email: "owner2@example.com", roles: ["OWNER"], reason: "x" } });
  ok("PF-4 fail: the role rules hold for invitations too (an Admin cannot invite an Owner)", giveOwnerByInvite.status === 403, giveOwnerByInvite);
  const seatReactivate = await (async () => {
    await call(L.base, "POST", `/api/platform/staff/${extra.id}/deactivate`, { token: tR, body: { reason: "frees a seat" } });
    await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "invitee.four@example.com", roles: ["READ_ONLY"] } });
    return call(L.base, "POST", `/api/platform/staff/${extra.id}/reactivate`, { token: tR, body: { reason: "back" } });
  })();
  ok("PF-4 fail: reactivation is seat-checked (the freed seat went to an invitation) → 409 PLAN_LIMIT_REACHED", seatReactivate.status === 409 && seatReactivate.body.code === "PLAN_LIMIT_REACHED", seatReactivate);
  const wrongId = await call(L.base, "POST", `/api/platform/staff/invitations/${randomUUID()}/revoke`, { token: tR });
  ok("PF-4 fail: an invitation that is not the firm's → 404", wrongId.status === 404);

  // ------------------------------------------------------------------------------------------ licence records
  const NUMBER = "R7654321";
  const ownCred = await call(L.base, "PUT", `/api/platform/staff/${O}/credential`, { token: tAdmin, body: { representativeType: "RCIC", licensingBody: "CICC", licenceNumber: NUMBER } });
  ok("PF-4 pass: a person saves their own licence record (no key needed); the answer does not echo the number", ownCred.status === 200 && !JSON.stringify(ownCred.body).includes(NUMBER), ownCred);
  const tO2 = await tokenOf("user-T").catch(() => "");
  const otherCred = tO2 && await call(L.base, "PUT", `/api/platform/staff/${O}/credential`, { token: tO2, body: { representativeType: "RCIC", licensingBody: "CICC", licenceNumber: "R1111111" } });
  ok("PF-4 pass/fail: another person's licence record needs agent/firm-credential:manage (user-T, Owner by now, holds it; the refusal itself is proven with a Read-only person below)",
    !!otherCred && (otherCred.status === 403 || (await call(L.base, "GET", "/api/platform/me", { token: tO2 })).body.keys.includes("agent/firm-credential:manage")), otherCred);

  // ------------------------------------------------------------- the breaker's findings at 695051a3 (break-report.md)
  const ch = (...c: number[]) => String.fromCharCode(...c);
  const mixed = await Promise.all([
    call(L.base, "POST", "/api/Platform/staff/invitations", { body: { email: "m1@example.com", roles: ["READ_ONLY"] } }),
    call(L.base, "PATCH", `/api/PLATFORM/staff/${O}/roles`, { body: { roles: ["READ_ONLY"] } }),
    call(L.base, "GET", "/api/Platform/me", { actor: "user-A" }),
  ]);
  const mixedToken = await call(L.base, "GET", "/api/Platform/me", { token: tR });
  ok("PF-4 fail (break M1): a platform route in other letter case is still guarded — no session → 401 (never the handler, never a 500), a simulated person → 401; a staff session there is refused by core's link-only rule (403), never answered",
    mixed.every((r) => r.status === 401) && mixedToken.status === 403, [...mixed.map((r) => [r.status, r.body.code]), mixedToken.status]);
  const pending = (await call(L.base, "GET", "/api/platform/staff/invitations", { token: tR })).body.invitations as { id: string; email: string; status: string }[];
  const four = pending.find((i) => i.email === "invitee.four@example.com" && i.status === "PENDING");
  if (four) await call(L.base, "POST", `/api/platform/staff/invitations/${four.id}/revoke`, { token: tR });
  const ownerInv = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "owner.invite@example.com", roles: ["OWNER"], reason: "a second Owner for cover" } });
  const adminResend = await call(L.base, "POST", `/api/platform/staff/invitations/${ownerInv.body.id}/resend`, { token: tAdmin });
  ok("PF-4 fail (break M2): an Admin cannot resend an Owner invitation (403 OWNER_ONLY); the invitation stays as it was",
    ownerInv.status === 201 && adminResend.status === 403 && adminResend.body.code === "OWNER_ONLY" && sql(DB, `select (revoked_at is null)::text from platform_invitation where id = '${ownerInv.body.id}'`) === "true", [ownerInv, adminResend]);
  const ownerResend = await call(L.base, "POST", `/api/platform/staff/invitations/${ownerInv.body.id}/resend`, { token: tR, body: { reason: "a second Owner for cover" } });
  ok("PF-4 pass (M2): an Owner resends it, with a reason and a fresh identity check", ownerResend.status === 200, ownerResend);
  const deactT = await call(L.base, "POST", `/api/platform/staff/${T}/deactivate`, { token: tR, body: { reason: "on leave" } });
  clock.t += 6 * 60 * 1000;
  const staleReact = await call(L.base, "POST", `/api/platform/staff/${T}/reactivate`, { token: tR, body: { reason: "back" } });
  ok("PF-4 fail (break M3): reactivating an Owner with an identity check older than 5 minutes → 403 STEP_UP_REQUIRED (deactivating them with a fresh one passed)",
    deactT.status === 200 && staleReact.status === 403 && staleReact.body.code === "STEP_UP_REQUIRED" && sql(DB, `select status from platform_staff where id = '${T}'`) === "DEACTIVATED", [deactT.status, staleReact]);
  tR = await tokenOf("user-R");
  const freshReact = await call(L.base, "POST", `/api/platform/staff/${T}/reactivate`, { token: tR, body: { reason: "back" } });
  clock.t += 6 * 60 * 1000;
  const staleDeact = await call(L.base, "POST", `/api/platform/staff/${T}/deactivate`, { token: tR, body: { reason: "again" } });
  ok("PF-4 fail (break M3): deactivating an Owner with an identity check older than 5 minutes → 403 STEP_UP_REQUIRED (reactivating with a fresh one passed)",
    freshReact.status === 200 && staleDeact.status === 403 && staleDeact.body.code === "STEP_UP_REQUIRED" && sql(DB, `select status from platform_staff where id = '${T}'`) === "ACTIVE", [freshReact.status, staleDeact]);
  tR = await tokenOf("user-R");
  const many = await Promise.all(Array.from({ length: 8 }, () => signIn("user-S", "sample-solo")));
  const live = await Promise.all(many.map((m) => call(L.base, "GET", "/api/platform/me", { token: m.body.token })));
  ok("PF-4 fail (break m1): eight sign-ins at once leave exactly one live session (each ends the one before it)", many.every((m) => m.status === 200) && live.filter((r) => r.status === 200).length === 1, live.map((r) => r.status));
  const identity = L.app.get(PlatformIdentity);
  const ctxO = await identity.authenticate(tAdmin);
  await tokenOf("user-O");   // user-O signs in elsewhere: the session behind ctxO is ended while its request is "in flight"
  const inFlight = await identity.revoke(ctxO, ownerResend.body.id).then(() => null, (e) => e as { getStatus?: () => number; getResponse?: () => { code?: string } });
  ok("PF-4 fail (break m2): a request already past the guard when its session ended changes nothing (re-checked under the firm lock: 401)",
    inFlight?.getStatus?.() === 401 && inFlight.getResponse?.().code === "SESSION_REVOKED" && sql(DB, `select (revoked_at is null)::text from platform_invitation where id = '${ownerResend.body.id}'`) === "true", inFlight?.getResponse?.());
  const reasons = await Promise.all([ch(0x200b), ch(0x200b, 0x2060), `a${ch(0)}b`, `x${ch(0xd800)}`].map((reason) => call(L.base, "POST", `/api/platform/staff/${extra.id}/reactivate`, { token: tR, body: { reason } })));
  ok("PF-4 fail (break m3, m4, m7): a reason of invisible characters only, with a NUL, or with broken text → 400 (never a 404 or a save)", reasons.every((r) => r.status === 400), reasons.map((r) => [r.status, r.body.code]));
  const emails = await Promise.all([`jose${ch(0x301)}@example.com`, `${ch(0xff41)}bc@example.com`, "<script>x@x.co", "a,b@x.co"].map((email) => call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email, roles: ["READ_ONLY"] } })));
  ok("PF-4 fail (break m5): an accent typed as a separate mark, full-width letters, <script> or a comma in an email → 400", emails.every((r) => r.status === 400 && r.body.code === "EMAIL_INVALID"), emails.map((r) => r.status));
  ok("PF-4 pass (m5): the same address with its accent as one letter is a valid email", emailOf(`jos${ch(0xe9)}@example.com`) === `jos${ch(0xe9)}@example.com`);
  const tT2 = await tokenOf("user-T");
  const crossCred = await call(L.base, "PUT", `/api/platform/staff/${S}/credential`, { token: tT2, body: { representativeType: "RCIC", licensingBody: "CICC", licenceNumber: "R2222222" } });
  ok("PF-4 fail (break m6): another firm's staff id on the licence route → 404 even without the key (never 403)", crossCred.status === 404, crossCred);
  const junk = await call(L.base, "GET", "/api/platform/me", { token: `${tR}!!` });
  ok("PF-4 fail (break m7): a stand-in token with junk after its signature → 401", junk.status === 401, junk);

  // ------------------------------------------------------------- the reviewer's Minors at 695051a3 (review.md m2, m3)
  const reader = await db.platformStaff.create({ data: { firmId: FIRM_A, email: "reader@sample-firm.example.com", displayName: "Reader (Sample)", status: "ACTIVE" } });
  await db.platformRoleGrant.create({ data: { firmId: FIRM_A, staffId: reader.id, role: "READ_ONLY", grantedBy: "check" } });
  const tReader = (await call(L.base, "POST", "/api/platform/session/local", { body: { firmKey: "sample-firm", email: "reader@sample-firm.example.com", secondStep: true } })).body.token as string;
  const readerKeys = (await call(L.base, "GET", "/api/platform/me", { token: tReader })).body.keys as string[];
  const readerOther = await call(L.base, "PUT", `/api/platform/staff/${O}/credential`, { token: tReader, body: { representativeType: "RCIC", licensingBody: "CICC", licenceNumber: "R3333333" } });
  const readerOwn = await call(L.base, "PUT", `/api/platform/staff/${reader.id}/credential`, { token: tReader, body: { representativeType: "RCIC", licensingBody: "CICC", licenceNumber: "R4444444" } });
  ok("PF-4 fail (review m2): a person without agent/firm-credential:manage cannot change another person's licence record (403); their own saves (200)",
    !readerKeys.includes("agent/firm-credential:manage") && readerOther.status === 403 && readerOther.body.code === "NOT_ALLOWED" && readerOwn.status === 200, [readerOther.status, readerOwn.status]);
  for (const i of (await call(L.base, "GET", "/api/platform/staff/invitations", { token: tR })).body.invitations as { id: string; status: string }[]) if (i.status === "PENDING") await call(L.base, "POST", `/api/platform/staff/invitations/${i.id}/revoke`, { token: tR });
  sql(DB, `update platform_staff set status = 'SUSPENDED' where id = '${extra.id}'`);
  const withSuspended = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "seat.five@example.com", roles: ["READ_ONLY"] } });
  sql(DB, `update platform_staff set status = 'DEACTIVATED' where id = '${extra.id}'`);
  const afterSuspended = await call(L.base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: "seat.five@example.com", roles: ["READ_ONLY"] } });
  ok("PF-4 fail (review m2): a suspended person holds a seat (4 active + 1 suspended = 5 of 5 → 409); deactivated, the seat is free (201)",
    withSuspended.status === 409 && withSuspended.body.seatsUsed === 5 && afterSuspended.status === 201, [withSuspended.body, afterSuspended.status]);
  let t2 = clock.now();
  const l2 = new LocalIdentity("pf4-check-signing-key-0123456789abcdef", () => t2), lOther = new LocalIdentity("another-signing-key-0123456789abcdefgh", () => t2);
  const good = l2.issue(R, { authTimeMs: t2, secondStep: true }), [h2, p2, sig2] = good.split(".");
  const forgedSub = `${h2}.${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p2, "base64url").toString()), sub: O })).toString("base64url")}.${sig2}`;
  const refusedBy = async (token: string, code?: string) => throwsLike(() => l2.verify(token), (e) => e instanceof IdentityRefused && (!code || e.code === code));
  const verifiedNow = await l2.verify(good).then((v) => "staffId" in v.lookup && v.lookup.staffId === R, () => false);
  ok("PF-4 fail (review m2): the stand-in refuses a changed payload under the old signature, and a token signed with another key; it accepts its own",
    verifiedNow && await refusedBy(forgedSub) && await refusedBy(lOther.issue(R, { authTimeMs: t2, secondStep: true })));
  t2 += 3601 * 1000;
  ok("PF-4 fail (review m2): the stand-in refuses its own token after its hour (TOKEN_EXPIRED)", await refusedBy(good, "TOKEN_EXPIRED"));
  const ctxR = await identity.authenticate(tR);
  sql(DB, `update platform_role_grant set ended_at = now(), ended_by = 'check', end_reason = 'review m3' where staff_id = '${R}' and role = 'CASE_MANAGER' and ended_at is null`);
  const raced = await identity.changeRoles(ctxR, reader.id, { roles: ["READ_ONLY", "CASE_OFFICER"] }).then(() => null, (e) => e as { getStatus?: () => number; getResponse?: () => { code?: string } });
  ok("PF-4 fail (review m3): a change sent with roles that changed meanwhile (read again under the firm lock) is refused 409 ROLES_CHANGED, nothing saved",
    raced?.getStatus?.() === 409 && raced.getResponse?.().code === "ROLES_CHANGED" && sql(DB, `select count(*) from platform_role_grant where staff_id = '${reader.id}' and ended_at is null`) === "1", raced?.getResponse?.());
  await db.platformRoleGrant.create({ data: { firmId: FIRM_A, staffId: R, role: "CASE_MANAGER", grantedBy: "check" } });

  // ---------------------------------------------------- every change writes one audit line, in its transaction
  sql(DB, `create function pf4_force_audit_fail() returns trigger language plpgsql as $$ begin if new.action = 'platform.staff.deactivated' then raise exception 'pf4 forced audit failure'; end if; return new; end $$;
    create trigger pf4_force_audit_fail before insert on audit_event for each row execute function pf4_force_audit_fail()`);
  const revBefore = sql(DB, `select count(*) from platform_session_revocation where staff_id = '${O}'`);
  const forced = await call(L.base, "POST", `/api/platform/staff/${O}/deactivate`, { token: tR, body: { reason: "forced audit failure" } });
  ok("PF-4 fail: a forced audit failure rolls the change back (status, session revocation and event all unwritten)",
    forced.status === 500 && sql(DB, `select status from platform_staff where id = '${O}'`) === "ACTIVE" && sql(DB, `select count(*) from platform_session_revocation where staff_id = '${O}'`) === revBefore
    && sql(DB, `select count(*) from module_event where type = 'staff.deactivated' and subject_id = '${O}'`) === "0", forced);
  sql(DB, `drop trigger pf4_force_audit_fail on audit_event; drop function pf4_force_audit_fail()`);
  const audited = sql(DB, `select count(*) from audit_event where entity in ('platform_staff','platform_invitation')`);
  ok(`PF-4 pass: every change above wrote its audit line (${audited} lines: sign-ins, roles, deactivations, reactivations, licence records, invitations)`,
    ["platform.staff.sign_in", "platform.staff.roles_changed", "platform.staff.deactivated", "platform.staff.reactivated", "platform.staff.credential_saved", "platform.invitation.created", "platform.invitation.resent", "platform.invitation.revoked"].every((a) => Number(sql(DB, `select count(*) from audit_event where action = '${a}'`)) >= 1));
  ok("PF-4 pass: platform audit lines carry the platform's own audit workspace (never the demo workspace's)",
    sql(DB, `select count(distinct workspace_id) from audit_event where entity in ('platform_staff','platform_invitation')`) === "1"
    && sql(DB, `select w.key from audit_event a join workspace w on w.id = a.workspace_id where a.entity = 'platform_staff' limit 1`) === PLATFORM_AUDIT_WORKSPACE);
  const staffEvents = JSON.parse(sql(DB, `select coalesce(json_agg(json_build_object('type', type, 'firmId', firm_id, 'payload', payload)), '[]') from module_event where type like 'staff.%'`)) as { type: string; firmId: string; payload: unknown }[];
  ok("PF-4 pass (B164; ports/events.ts): every staff event is named from EVENT and its payload is ids only (staffId), as its zod shape says",
    staffEvents.length >= 2 && staffEvents.every((e) => [EVENT.STAFF_ROLES_CHANGED, EVENT.STAFF_DEACTIVATED].includes(e.type as never) && StaffEventPayload.safeParse(e.payload).success)
    && staffEvents.some((e) => StaffRolesChanged.safeParse(e).success), staffEvents.slice(0, 3));
  ok("PF-4 fail: a payload with more than ids (a role word, a name) is refused by the shape", !StaffEventPayload.safeParse({ staffId: R, roles: ["OWNER"] }).success && !StaffEventPayload.safeParse({ staffId: "user-R" }).success);
  ok("PF-4 fail: a refused change writes no event (the refused role changes and deactivations above left none)",
    sql(DB, `select count(*) from module_event where type = 'staff.deactivated'`) === sql(DB, `select count(*) from audit_event where action = 'platform.staff.deactivated'`));

  // --------------------------------------------- a licence number never in a log line, event payload or email
  const numbers = [...readSampleFirms().flatMap((f) => f.users.map((u) => u.licence?.number).filter((n): n is string => !!n)), NUMBER];
  const leaks = (text: string) => numbers.filter((n) => text.includes(n));
  const auditText = sql(DB, `select coalesce(string_agg(summary || ' ' || coalesce(detail::text, ''), ' | '), '') from audit_event`);
  const eventText = sql(DB, `select coalesce(string_agg(payload::text || ' ' || type, ' | '), '') from module_event`);
  ok(`PF-4 pass: no licence number (${numbers.length} known: the Sample ones and the one saved above) in any log line this run printed, any audit line or any event payload; this row sends no email (PF-4b's MailPort)`,
    leaks(printed).length === 0 && leaks(auditText).length === 0 && leaks(eventText).length === 0, { printed: leaks(printed), audit: leaks(auditText), events: leaks(eventText) });
  ok("PF-4 fail: the scan finds a planted number (it is not blind)", leaks(`something ${NUMBER} something`).length === 1);

  // ----------------------------------------------------------------- settings: PF-3 review m4, m10; demo reset B-6
  const zone = async (v: string) => writeSetting(db, { firmId: FIRM_A, key: "platform.time_zone", value: v, by: "check", workspaceId: await platformAuditWorkspaceId(db) }).then(() => true, () => false);
  ok("PF-4 fail (PF-3 review m10; PF-4 review m6): a time zone in other capitals is refused (America/TORONTO, AMERICA/Toronto, Asia/KOLKATA, Asia/KolKata, ETC/GMT+5)",
    !(await zone("America/TORONTO")) && !(await zone("AMERICA/Toronto")) && !(await zone("Asia/KOLKATA")) && !(await zone("Asia/KolKata")) && !(await zone("ETC/GMT+5")));
  ok("PF-4 pass (m10): IANA's own spellings are accepted (America/Toronto, Asia/Kolkata, Europe/Kyiv, Etc/GMT+5, America/Port-au-Prince, Asia/Ho_Chi_Minh, UTC)",
    (await zone("Asia/Kolkata")) && (await zone("Europe/Kyiv")) && (await zone("Etc/GMT+5")) && (await zone("America/Port-au-Prince")) && (await zone("Asia/Ho_Chi_Minh")) && (await zone("UTC")) && (await zone("America/Toronto")));
  ok("PF-4 pass (PF-3 review m4): the stored value_schema is as strict as JSON Schema can say (time zone pattern, two-step const true) and names the code's other checks",
    sql(DB, `select (value_schema ? 'pattern')::text || ':' || (value_schema->>'description' like '%checked in code%')::text from platform_setting_definition where key = 'platform.time_zone'`) === "true:true"
    && sql(DB, `select value_schema->>'const' from platform_setting_definition where key = 'platform.require_two_step'`) === "true");
  ok("PF-4 fail (m4): a value the stored pattern refuses is refused by the code too (Mars/Olympus fits the pattern but no zone: code refuses)", !(await zone("Mars/Olympus")));
  await writeSetting(db, { firmId: FIRM_A, key: "platform.language", value: "fr", by: "staff:check", workspaceId: await platformAuditWorkspaceId(db) });
  await writeSetting(db, { firmId: FIRM_B, key: "platform.currency", value: "USD", by: "staff:check", workspaceId: await platformAuditWorkspaceId(db) });
  const platformLines = () => Number(sql(DB, `select count(*) from audit_event where entity in ('platform_firm_setting','platform_staff','platform_invitation')`));
  const linesBefore = platformLines();
  // The demo reset's own rule, played here on the scratch database: the demo workspace's lines go (Demo.wipe), then the
  // platform step. (Part B runs the real reset on the copy.)
  const demoWs = await db.workspace.upsert({ where: { key: "demo" }, update: {}, create: { key: "demo", label: "demo (check)" } });
  await db.auditEvent.create({ data: { workspaceId: demoWs.id, actor: "user-A", action: "check", entity: "demo workspace", summary: "a demo line" } });
  await db.auditEvent.deleteMany({ where: { workspaceId: demoWs.id } });
  const reset = await resetSampleFirmSettings(db);
  ok("PF-4 pass (P-571 (1)): the reset returns the Sample firms' settings to their seed values through the settings write path (a value already at its seed value is left alone)",
    reset.changed.length >= 2 && await readSetting(db, FIRM_A, "platform.language") === "en" && await readSetting(db, FIRM_B, "platform.currency") === "CAD" && await readSetting(db, FIRM_A, "platform.time_zone") === "America/Toronto", reset);
  ok("PF-4 pass (B-6): each reset change has one audit line (actor system, reason \"demo reset\"), and no platform line was deleted",
    Number(sql(DB, `select count(*) from audit_event where entity = 'platform_firm_setting' and actor = 'system' and detail->>'reason' = 'demo reset'`)) === reset.changed.length && platformLines() === linesBefore + reset.changed.length);
  // The fail test: every stored setting value has its trail — the newest audit line of each firm and key says it was set
  // to exactly the stored value.
  const untrailed = sql(DB, `select coalesce(string_agg(s.key, ','), '') from platform_firm_setting s where not exists (select 1 from audit_event a where a.entity = 'platform_firm_setting' and a.entity_key = s.firm_id || ':' || s.key
    and a.detail->'to' = s.value and a.at = (select max(b.at) from audit_event b where b.entity = 'platform_firm_setting' and b.entity_key = a.entity_key))`);
  ok("PF-4 fail (B-6): after the reset no setting value is without its trail (each value's newest audit line names it)", untrailed === "", untrailed);
  ok("PF-4 fail (B-6): a second reset changes nothing and writes no line", (await resetSampleFirmSettings(db)).changed.length === 0 && platformLines() === linesBefore + reset.changed.length);

  // ---------------------------------------------------------------------------- the seed line (P-571 (2))
  let seedRuns = 0; const spy = async () => { seedRuns++; return {} as never; };
  ok("PF-4 fail (P-571 (2)): a production configuration never runs the Sample seed, even with the setting on", !sampleSeedDecision({ PLATFORM_SAMPLE_SEED: "on", PLATFORM_ENVIRONMENT: "production" }).run && (await seedSampleOnStart({ PLATFORM_SAMPLE_SEED: "on", PLATFORM_ENVIRONMENT: "production" }, spy)) === null && seedRuns === 0);
  ok("PF-4 fail: the setting defaults off (unset → no seed)", !sampleSeedDecision({}).run && (await seedSampleOnStart({}, spy)) === null && seedRuns === 0);
  ok("PF-4 fail: an unknown value of the setting stops the start-up with its name", await throwsLike(() => sampleSeedDecision({ PLATFORM_SAMPLE_SEED: "yes" }), (e) => /PLATFORM_SAMPLE_SEED "yes"/.test(String(e))));
  await seedSampleOnStart({ PLATFORM_SAMPLE_SEED: "on", DATABASE_URL: urlOf(DB) }, spy);
  ok("PF-4 pass: PLATFORM_SAMPLE_SEED=on (outside production) runs it", seedRuns === 1);
  const main = readFileSync(join(STUDIO, "api", "src", "main.ts"), "utf8");
  ok("PF-4 pass: main.ts runs it in one line after the features register (migrations ran before the API starts) and before the app is made",
    /await registerFeatures\(AppModule\);\n  await \(await import\("\.\/platform\/identity\/sample-seed\.ts"\)\)\.seedSampleOnStart\(\);[^\n]*\n  const app = await NestFactory\.create/.test(main));
  const demoSrc = readFileSync(join(STUDIO, "api", "src", "demo.ts"), "utf8");
  ok("PF-4 pass: the demo reset's platform step is one call, after the wipe", (demoSrc.match(/resetSampleFirmSettings/g) ?? []).length === 1 && demoSrc.indexOf("resetSampleFirmSettings") > demoSrc.indexOf("await this.sweepOrphans();"));
} finally {
  for (const a of apps) await a.close().catch(() => {});
  await db.$disconnect();
  try { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]); } catch { /* left for prune-test-dbs.sh */ }
}

// ------------------------------------------------------------------------------- part B: the isolated copy (real main.ts)
const up = await fetch(`${BASE}/api/health`).then((r) => r.status, () => 0);
if (!up) ok(`part B: the isolated copy on :${PORT} answers (start it with the usage line)`, false);
else {
  const copy = (q: string) => sql(COPY_DB, q);
  ok("PF-4 pass (P-571 (2)): the copy started with PLATFORM_SAMPLE_SEED=on, so the seed line ran after its migrations (both Sample firms)", copy(`select count(*) from platform_firm where key in ('sample-firm','sample-solo')`) === "2");
  const sR = await call(BASE, "POST", "/api/platform/session/local", { body: { firmKey: "sample-firm", actorId: "user-R", secondStep: true } });
  const me = sR.status === 200 ? await call(BASE, "GET", "/api/platform/me", { token: sR.body.token }) : sR;
  ok("PF-4 pass: on the real server, user-R signs in through the local stand-in as a Case Manager with a licence; duties include represent",
    me.status === 200 && me.body.roles.includes("CASE_MANAGER") && me.body.licensed === true && me.body.duties.includes("represent"), me);
  // PF-7's container smoke (tools/skeleton-smoke.sh, CI `skeleton`), step 3, against this real server: it signs in with
  // PF-4's request shape and reads /me (CI red at 808b68c9: it sent {"email"} only, answered 400 FIRM_REQUIRED).
  const smoke = (env: Record<string, string>) => spawnSync("bash", [join(STUDIO, "tools", "skeleton-smoke.sh"), BASE], { encoding: "utf8", env: { ...process.env, PLATFORM_ME: "required", ...env } }).stdout ?? "";
  const smokeMe = smoke({}).split("\n").find((l) => /^(PASS|FAIL|SKIP) {2}me:/.test(l)) ?? "";
  ok("PF-4 pass (CI skeleton at 808b68c9): the skeleton smoke's sign-in and /me step passes on the real server", /^PASS {2}me: GET \/api\/platform\/me 200 with firmId/.test(smokeMe), smokeMe);
  const smokeWrong = smoke({ SMOKE_STAFF_FIRM: "no-such-firm" }).split("\n").find((l) => /^(PASS|FAIL) {2}me:/.test(l)) ?? "";
  ok("PF-4 fail: the smoke's me step still fails when the sign-in is refused (a firm that does not exist → 401, no token)", /^FAIL {2}me: the local sign-in .* answered 401 without a token/.test(smokeMe ? smokeWrong : ""), smokeWrong);
  const oldBody = await call(BASE, "POST", "/api/platform/session/local", { body: { email: "representative@sample-firm.example.com" } });
  ok("PF-4 fail (the root cause, kept refused): the old smoke body {\"email\"} alone — no firm, no second step — is refused 400 FIRM_REQUIRED", oldBody.status === 400 && oldBody.body.code === "FIRM_REQUIRED", oldBody);
  const compose = readFileSync(join(STUDIO, "deploy", "compose.test.yml"), "utf8"), appEnv = compose.slice(compose.indexOf("\n  app:"));
  ok("PF-4 pass: the container test (deploy/compose.test.yml) runs the app with the local stand-in and the Sample seed, never as test or production",
    /PLATFORM_IDENTITY: local/.test(appEnv) && /PLATFORM_SAMPLE_SEED: "on"/.test(appEnv) && !/PLATFORM_ENVIRONMENT: *"?(test|production)/.test(appEnv), appEnv.slice(0, 600));
  const linkOnCopy = await call(BASE, "GET", "/api/platform/me", { auth: `Bearer ${randomBytes(32).toString("base64url")}` });
  const actorOnCopy = await call(BASE, "GET", "/api/platform/me", { actor: "user-R" });
  const staffElsewhere = await call(BASE, "GET", "/api/structure", { token: sR.body.token, actor: "user-A" });
  ok("PF-4 fail: on the real server, a link-shaped Bearer token or the simulated-person header alone on /api/platform/me → 401; the staff session on an existing route → 403 link-only, as before",
    linkOnCopy.status === 401 && actorOnCopy.status === 401 && staffElsewhere.status === 403, [linkOnCopy.status, actorOnCopy.status, staffElsewhere.status]);
  const team = await call(BASE, "GET", "/api/session", { actor: "user-A" });
  const sessionNobody = await call(BASE, "GET", "/api/structure");
  ok("PF-4 pass/fail: existing routes behave as before on the real server (who-am-I opens; a configuration read without a person is 401)", team.status === 200 && sessionNobody.status === 401, [team.status, sessionNobody.status]);
  // The real demo reset keeps every platform audit line and returns a changed Sample setting with its trail.
  const { writeSetting: ws2 } = await import("../api/src/platform/settings.ts");
  const copyDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(COPY_DB), options: "-c TimeZone=UTC" }) });
  try {
    const firmA = copy(`select id from platform_firm where key = 'sample-firm'`);
    await ws2(copyDb, { firmId: firmA, key: "platform.language", value: "fr", by: "staff:check", workspaceId: await platformAuditWorkspaceId(copyDb) });
    const linesBefore = Number(copy(`select count(*) from audit_event where entity in ('platform_firm_setting','platform_staff','platform_invitation')`));
    const systemBefore = Number(copy(`select count(*) from audit_event where actor = 'system' and detail->>'reason' = 'demo reset'`));
    const r = await call(BASE, "POST", "/api/demo/reset", { actor: "user-A", body: { confirm: "RESET" } });
    const linesAfter = Number(copy(`select count(*) from audit_event where entity in ('platform_firm_setting','platform_staff','platform_invitation')`));
    ok("PF-4 pass (P-571 (1), B-6): the real demo reset keeps every platform audit line, returns the setting to its seed value and leaves one line (system, \"demo reset\")",
      r.status < 300 && linesAfter === linesBefore + 1 && copy(`select value::text from platform_firm_setting where firm_id = '${firmA}' and key = 'platform.language'`) === `"en"`
      && Number(copy(`select count(*) from audit_event where actor = 'system' and detail->>'reason' = 'demo reset'`)) === systemBefore + 1, { status: r.status, linesBefore, linesAfter });
  } finally { await copyDb.$disconnect(); }
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
