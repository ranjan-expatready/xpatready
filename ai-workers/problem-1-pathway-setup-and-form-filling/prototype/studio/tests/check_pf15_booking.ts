// PF-15 part 1b (brief design/lead-b-briefs/PF-15.md, DW3's booking, DW4, DW5; SA-3-58..61, SA-4-56): a booked move to
// another plan, a pass and a fail per Done when line: DW3 a booking refused with the conflict and accepted without it ·
// DW4 while a lower move is booked the real invite route uses the lower limit, withdrawn → allowed again · DW5 during a
// trial the move applies at once with the trial end unchanged; after a trial at the renewal, by the daily job, once ·
// the breaker's cases (two bookings at once, a withdrawn booking still lowering a limit, a stale booking) · the
// migration's rules and PF-12's walls. A scratch database (removed), PF-4's classes in a Nest app with the local
// stand-in, a fake clock and the fake job runner. No server, no browser, no model call, no Stripe call (US$0).
//   tsx studio/tests/check_pf15_booking.ts
import "reflect-metadata";
import { Module } from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fakeCaseCount } from "../ports/case-count.ts";
import { FakeClock } from "../ports/clock.ts";
import { fakeJobs } from "../ports/jobs.ts";
import { fakeMail } from "../ports/mail.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const BREW = "/opt/homebrew/opt/postgresql@18/bin", bin = (n: string) => (existsSync(join(BREW, n)) ? join(BREW, n) : n);
const PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_pf15b_${process.pid}`, urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `pf15b-check-${process.pid}`);
const sql = (q: string) => execFileSync(bin("psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const refused = (q: string, re: RegExp) => { try { sql(q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 600)}` : ""}`); };
const call = async (base: string, method: string, path: string, o: { token?: string; body?: unknown } = {}) => {
  const r = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  const text = await r.text(); let body: any = text; try { body = JSON.parse(text); } catch { /* text */ }
  return { status: r.status, body };
};
const problemOf = async (f: () => Promise<unknown>) => { try { await f(); return null; } catch (e) { const x = e as { getStatus?: () => number; getResponse?: () => unknown }; return x.getStatus ? { status: x.getStatus(), body: x.getResponse?.() as Record<string, any> } : { status: 0, body: { error: String(e) } as Record<string, any> }; } };

execFileSync(bin("dropdb"), [...PG, "--if-exists", DB]); execFileSync(bin("createdb"), [...PG, DB]);
const all = readdirSync(MIG).filter((x) => /^\d{14}_/.test(x)).sort(), NEW = all.find((d) => /_pf15b_plan_booking$/.test(d))!;
for (const d of all) execFileSync(bin("psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
process.env.DATABASE_URL = urlOf(DB);
for (const k of ["PLATFORM_IDENTITY", "PLATFORM_ENVIRONMENT", "PLATFORM_SAMPLE_SEED", "PLATFORM_LOCAL_SECRET"]) delete process.env[k];

const { ConfigReadGuard, Db } = await import("../api/src/core.ts");
const { seedSampleFirms } = await import("../api/src/platform/seed-sample-firms.ts");
const { PlatformClock } = await import("../api/src/platform/identity/port.ts");
const { LocalIdentity } = await import("../api/src/platform/identity/local.ts");
const { IDENTITY_PORT, PlatformIdentity } = await import("../api/src/platform/identity/service.ts");
const { PlatformGuard } = await import("../api/src/platform/identity/guard.ts");
const { PlatformIdentityController } = await import("../api/src/platform/identity/routes.ts");
const { MAIL_PORT } = await import("../api/src/platform/identity/session/mail.ts");
const { PgEntitlements } = await import("../api/src/platform/entitlements/limits.ts");
const { PlanBookings, BOOKING_DAILY_QUEUE } = await import("../api/src/platform/entitlements/plan-booking.ts");
const walls = await import("../api/src/platform/firm-scope.ts");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(DB), options: "-c TimeZone=UTC" }) });
const fake = new FakeClock(new Date());   // the database stamps bookings with its own clock, so the fake starts at today
const clock = new (class extends PlatformClock { override now() { return fake.now().getTime(); } })();
const local = new LocalIdentity("pf15b-check-signing-key-0123456789abcdef", () => clock.now());
const cases = fakeCaseCount();
const files = { usedBytes: async () => 0 };
const bookings = new PlanBookings({ db, now: () => clock.now(), files, cases: () => cases });
const OWNER = "staff:pf15b-owner";

let app: { close(): Promise<void> } | null = null;
mkdirSync(WORK, { recursive: true });
try {
  // ------------------------------------------------------------------------------------------ the migration's rules
  ok("PF-15b schema pass: platform_subscription_change is behind PF-12's wall (forced row-level security, its policy)", sql(`select relforcerowsecurity::text || (select count(*) from pg_policy where polrelid = 'platform_subscription_change'::regclass)::text from pg_class where relname = 'platform_subscription_change'`) === "true1");
  ok("PF-15b schema fail: the app's role never deletes a booking (DELETE and TRUNCATE revoked from xr_data); it may insert and update its own", sql(`select string_agg(has_table_privilege('xr_data', 'platform_subscription_change', p)::text, ',') from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE']) p`) === "true,true,false,false");
  ok("PF-15b schema fail: the migration does not apply twice", (() => { try { execFileSync(bin("psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, NEW, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] }); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: Buffer }).stderr ?? e)); } })());
  {
    const cfg = join(WORK, "prisma.config.ts");
    writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(DB))} } });\n`);
    const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--script"], { cwd: STUDIO, encoding: "utf8" });
    const lines = `${r.stdout}`.split("\n").filter((l) => /platform_subscription_change/.test(l));
    ok("PF-15b schema pass: prisma migrate diff names no part 1b table, index or key", r.status === 0 && lines.length === 0, { status: r.status, lines, err: r.stderr.slice(0, 300) });
  }

  // ------------------------------------------------------------------------------------- the app and the Sample firms
  const providers = [Db, { provide: APP_GUARD, useClass: ConfigReadGuard }, { provide: PlatformClock, useValue: clock }, { provide: IDENTITY_PORT, useValue: local }, PlatformIdentity, PlatformGuard, { provide: APP_GUARD, useExisting: PlatformGuard }, { provide: MAIL_PORT, useValue: fakeMail() }];
  @Module({ controllers: [PlatformIdentityController] as never[], providers: providers as never[] }) class TestApp {}
  const nest = await NestFactory.create(TestApp, { logger: false }); await nest.listen(0, "127.0.0.1"); app = nest;
  const base = `http://127.0.0.1:${(nest.getHttpServer().address() as { port: number }).port}`;
  await seedSampleFirms(db);
  const FIRM_A = sql(`select id from platform_firm where key = 'sample-firm'`), FIRM_B = sql(`select id from platform_firm where key = 'sample-solo'`);
  const PLAN_A = sql(`select plan_id from platform_subscription where firm_id = '${FIRM_A}' and status <> 'ENDED'`), CODE_A = sql(`select code from platform_plan where id = '${PLAN_A}'`);
  const signIn = async (actorId: string) => (await call(base, "POST", "/api/platform/session/local", { body: { firmKey: "sample-firm", actorId, secondStep: true } })).body.token as string;
  const tR = await signIn("user-R");
  const used = () => Number(sql(`select ((select count(*) from platform_staff where firm_id = '${FIRM_A}' and status in ('ACTIVE','SUSPENDED')) + (select count(*) from platform_invitation where firm_id = '${FIRM_A}' and accepted_at is null and revoked_at is null and expires_at > now()))::int`));
  const clearInvites = () => sql(`update platform_invitation set revoked_at = now() where firm_id = '${FIRM_A}' and accepted_at is null and revoked_at is null`);
  let n = 0;
  const invite = () => call(base, "POST", "/api/platform/staff/invitations", { token: tR, body: { email: `pf15b.person${++n}@example.com`, roles: ["CASE_OFFICER"] } });
  const addInvites = (k: number) => { for (let i = 0; i < k; i++) sql(`insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at) values (gen_random_uuid(), '${FIRM_A}', 'pf15b.seed${++n}@example.com', '{CASE_OFFICER}', 'pf15b-${n}', 'seed:pf15b', now() + interval '72 hours')`); };
  const planOf = (firm: string) => sql(`select p.code from platform_subscription s join platform_plan p on p.id = s.plan_id where s.firm_id = '${firm}' and s.status <> 'ENDED'`);
  const lines = (action: string) => Number(sql(`select count(*) from audit_event where action = '${action}' and detail->>'firmId' = '${FIRM_A}'`));
  const book = (plan: string, firm = FIRM_A) => walls.withFirm(firm, () => bookings.book(firm, plan, OWNER));
  const withdraw = (firm = FIRM_A) => walls.withFirm(firm, () => bookings.withdraw(firm, OWNER));
  clearInvites();
  const u0 = used();
  // Firm A: a paying firm (ACTIVE), its Stripe period ending in 10 days; its plan allows u0 + 7 seats.
  sql(`update platform_subscription set status = 'ACTIVE', current_period_end = now() + interval '10 days' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  sql(`update platform_plan set seats_limit = ${u0 + 7} where id = '${PLAN_A}'`);
  // The lower plan: exactly u0 seats (full at today's staff), 2 active individual cases, 10 corporate, no storage row.
  const LOW = sql(`insert into platform_plan (id, code, name, seats_limit) values (gen_random_uuid(), 'pf15b-low', 'Low (Sample)', ${u0}) returning id`).split("\n")[0];
  sql(`insert into platform_plan_limit (plan_id, metric, limit_value) values ('${LOW}', 'ACTIVE_INDIVIDUAL_CASES', 2), ('${LOW}', 'ACTIVE_CORPORATE_CASES', 10)`);
  const limitA = async (m: "seats" | "active_individual_cases" | "active_corporate_cases" | "storage_mb") => (await new PgEntitlements(db, () => clock.now()).limitOf(FIRM_A, m)).limit;
  const teamCases = await limitA("active_individual_cases"), teamCorp = await limitA("active_corporate_cases");

  // ------------------------------------------------------------------------------------- DW3: refused, then booked
  addInvites(5);
  const p3 = await problemOf(() => book("pf15b-low"));
  const seatC = p3?.body.conflicts?.find((c: { metric: string }) => c.metric === "seats");
  ok("PF-15 DW3 fail (booking): with 5 people over the lower plan's seats the booking is refused 409 DOWNGRADE_CONFLICTS with { seats, used, limit, reduce: 5 } and SA-4-56's words; nothing booked",
    p3?.status === 409 && p3.body.code === "DOWNGRADE_CONFLICTS" && seatC?.used === u0 + 5 && seatC.limit === u0 && seatC.reduce === 5 && /Remove 5 staff or choose a larger plan\. Nothing was booked\./.test(p3.body.detail) && sql(`select count(*) from platform_subscription_change`) === "0", p3);
  cases.set({ individual: 3, corporate: 0 }); clearInvites();
  const pc = await problemOf(() => book("pf15b-low"));
  ok("PF-15 DW3 fail (booking): an over-limit case metric (3 active individual cases on a 2-case plan) also refuses it (every metric, part 2's check)", pc?.status === 409 && pc.body.conflicts.length === 1 && pc.body.conflicts[0].metric === "active_individual_cases" && pc.body.conflicts[0].reduce === 1, pc);
  // Review M2: a case opening holds its own lock (runtime.ts createCase: case-open:<key>), not the firm row. Held from a
  // second connection, the booking waits for it, and then counts the case opened meanwhile.
  cases.set({ individual: 2, corporate: 0 });
  {
    const db2 = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(DB) }) });
    let release!: () => void; const held = new Promise<void>((r) => { release = r; }); let locked!: () => void; const isLocked = new Promise<void>((r) => { locked = r; });
    const opener = db2.$transaction(async (tx) => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('case-open:sample-firm'))`; locked(); await held; }, { timeout: 30_000 });
    await isLocked;
    let settled = false; const pending = problemOf(() => book("pf15b-low")).then((r) => { settled = true; return r; });
    await new Promise((r) => setTimeout(r, 700));
    const waited = !settled;
    cases.set({ individual: 3, corporate: 0 }); release(); await opener; await db2.$disconnect();
    const pm = await pending;
    ok("PF-15 DW3 fail (review M2): a booking waits for a case opening in progress (its case-open lock) and then counts that case: 3 on a 2-case plan → 409, nothing booked", waited && pm?.body.code === "DOWNGRADE_CONFLICTS" && sql(`select count(*) from platform_subscription_change`) === "0", { waited, pm });
  }
  cases.set({ individual: 2, corporate: 0 });
  const b1 = await book("pf15b-low");
  const pe = sql(`select to_char(current_period_end at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS') from platform_subscription where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  ok("PF-15 DW3 pass (booking): with no conflict the move is booked, for the renewal (Stripe's period end, SA-3-60), not applied, the plan unchanged, one audit line",
    !b1.atOnce && b1.appliedAt === null && b1.fromPlan === CODE_A && b1.toPlan === "pf15b-low" && Math.abs(Date.parse(b1.effectiveAt) - Date.parse(`${pe}Z`)) <= 1 && planOf(FIRM_A) === CODE_A && lines("plan.change.booked") === 1, { b1, pe });

  // ------------------------------------------------------------------------- DW4: the lower limits apply at once
  const inv4 = await invite();
  ok("PF-15 DW4 fail: while the lower move is booked, an invitation on a plan that allows " + (u0 + 7) + " but books " + u0 + " is refused 409 PLAN_LIMIT_REACHED (SA-3-59) on the real invite route", inv4.status === 409 && inv4.body.code === "PLAN_LIMIT_REACHED" && inv4.body.limit === u0 && used() === u0, inv4);
  ok("PF-15 DW4 fail: every metric is the lower one while booked: individual cases 2 (not " + teamCases + "), corporate 10 (not " + teamCorp + "), storage 0 (the target has no row: fail closed)",
    (await limitA("active_individual_cases")) === 2 && (await limitA("active_corporate_cases")) === 10 && (await limitA("storage_mb")) === 0);
  ok("PF-15 fail (review m3): an open booking cannot be applied at an infinite time (the check refuses it; the plan stays)", refused(`update platform_subscription_change set applied_at = 'infinity' where withdrawn_at is null and applied_at is null`, /platform_subscription_change_values_ok/) && planOf(FIRM_A) === CODE_A);
  const dup = await problemOf(() => book("solo"));
  ok("PF-15 fail (one open booking): a second booking while one is open → 409 PLAN_CHANGE_BOOKED, the first kept", dup?.status === 409 && dup.body.code === "PLAN_CHANGE_BOOKED" && sql(`select count(*) from platform_subscription_change where withdrawn_at is null and applied_at is null`) === "1", dup);
  ok("PF-15 fail (one open booking): a second open row written straight to the table is refused by the partial unique index", refused(`insert into platform_subscription_change (id, firm_id, subscription_id, from_plan_id, to_plan_id, booked_by, booked_at, effective_at) select gen_random_uuid(), firm_id, id, plan_id, (select id from platform_plan where code = 'solo'), 'system:t', now(), now() from platform_subscription where firm_id = '${FIRM_A}' and status <> 'ENDED'`, /platform_subscription_change_one_open/));
  const w = await withdraw();
  const inv4b = await invite();
  ok("PF-15 DW4 pass: withdrawn → the same invitation is allowed again (201), the limits are the firm's own plan's", w.toPlan === "pf15b-low" && inv4b.status === 201 && (await limitA("seats")) === u0 + 7 && (await limitA("active_individual_cases")) === teamCases && lines("plan.change.withdrawn") === 1, inv4b);
  ok("PF-15 pass (review m4): the booking's after and the withdrawal's before are the same shape (plan, bookedPlan, effectiveAt)", sql(`select string_agg(action || '=' || coalesce(detail->>'bookedPlan_after', detail->>'bookedPlan_before', '-'), ',' order by at) from audit_event where action in ('plan.change.booked', 'plan.change.withdrawn') and detail->>'firmId' = '${FIRM_A}'`) === "plan.change.booked=pf15b-low,plan.change.withdrawn=pf15b-low");
  ok("PF-15 fail (breaker: a withdrawn booking still lowering a limit): no limit reads the withdrawn target; withdrawing again → 404", (await limitA("storage_mb")) > 0 && (await problemOf(() => withdraw()))?.status === 404);
  ok("PF-15 fail (records): a booking is never deleted, never re-opened, never changed in its plan or date", refused(`delete from platform_subscription_change`, /never removed/)
    && refused(`update platform_subscription_change set withdrawn_at = null`, /only an open booking/) && refused(`update platform_subscription_change set effective_at = now() + interval '1 year'`, /only an open booking/));
  clearInvites();

  // ------------------------------------------------------------- review m5: Unlimited now, a pending lowering of seats
  sql(`update platform_plan_limit set limit_value = null where plan_id = '${PLAN_A}' and metric = 'ACTIVE_CORPORATE_CASES'`);
  sql(`update platform_plan_limit set limit_value = 4 where plan_id = '${LOW}' and metric = 'ACTIVE_CORPORATE_CASES'`);
  sql(`insert into platform_limit_change (id, plan_id, metric, new_value, reason, approved_by, approved_at) values (gen_random_uuid(), '${PLAN_A}', 'SEATS', ${u0 + 2}, 'pf15b pending lowering', 'staff:pf15b', now())`);
  const keptSeats = await limitA("seats");
  const bm = await book("pf15b-low");
  ok("PF-15 pass (review m5): while booked, an Unlimited current limit and a finite target give the target (corporate 4); seats with a part-2 lowering still pending give the lower of what the firm keeps (" + (u0 + 7) + ") and the target (" + u0 + ")",
    keptSeats === u0 + 7 && (await limitA("active_corporate_cases")) === 4 && (await limitA("seats")) === u0, { keptSeats });
  await withdraw();
  ok("PF-15 fail (review m5): withdrawn, corporate is Unlimited again and seats are the kept " + (u0 + 7), bm.toPlan === "pf15b-low" && (await limitA("active_corporate_cases")) === null && (await limitA("seats")) === u0 + 7);
  sql(`insert into platform_limit_change (id, plan_id, metric, new_value, reason, approved_by, approved_at) values (gen_random_uuid(), '${PLAN_A}', 'SEATS', ${u0 + 7}, 'pf15b raise back', 'staff:pf15b', now())`);
  sql(`update platform_plan_limit set limit_value = ${teamCorp} where plan_id = '${PLAN_A}' and metric = 'ACTIVE_CORPORATE_CASES'`);

  // ------------------------------------------------------------ review m2: a raise is never booked for the renewal
  sql(`update platform_plan set monthly_price_cents = case code when '${CODE_A}' then 10000 when 'pf15b-low' then 5000 when 'firm' then 20000 end where code in ('${CODE_A}', 'pf15b-low', 'firm')`);
  const raise = await problemOf(() => book("firm"));
  const lower = await book("pf15b-low"); await withdraw();
  sql(`update platform_plan set monthly_price_cents = null where code in ('${CODE_A}', 'pf15b-low', 'firm')`);
  ok("PF-15 fail (review m2): outside a trial a move to a dearer plan is refused 409 PLAN_RAISE_NOT_BOOKED (it applies at once through billing, PF-16); a cheaper one books", raise?.body.code === "PLAN_RAISE_NOT_BOOKED" && lower.toPlan === "pf15b-low", raise);
  const wd = lines("plan.change.withdrawn");

  // ------------------------------------------------------------------- the breaker: two bookings at the same moment
  const race = await Promise.allSettled([book("pf15b-low"), book("pf15b-low")]);
  const raceCodes = await Promise.all(race.map(async (r) => (r.status === "fulfilled" ? "booked" : ((r.reason as { getResponse?: () => { code?: string } }).getResponse?.()?.code ?? String(r.reason)))));
  ok("PF-15 pass (breaker: a downgrade booked twice at once): one is booked, the other 409 PLAN_CHANGE_BOOKED; one open row", raceCodes.sort().join() === "PLAN_CHANGE_BOOKED,booked" && sql(`select count(*) from platform_subscription_change where withdrawn_at is null and applied_at is null`) === "1", raceCodes);

  // --------------------------------------------------------------------- DW5 after a trial: at the renewal, by the job
  const jobs = fakeJobs(fake);
  await bookings.register(jobs);
  await fake.advance({ days: 5 });
  ok("PF-15 DW5 fail (after a trial): before the renewal the daily job applies nothing (5 days on, renewal in 10)", planOf(FIRM_A) === CODE_A && lines("plan.change.applied") === 0);
  await fake.advance({ days: 6 });
  ok("PF-15 DW5 pass (after a trial): after the renewal the daily job (" + BOOKING_DAILY_QUEUE + ") applies it, once: the plan is the lower one and one audit line, though the job ran on several days",
    planOf(FIRM_A) === "pf15b-low" && lines("plan.change.applied") === 1 && sql(`select count(*) from platform_subscription_change where applied_at is not null`) === "1", { plan: planOf(FIRM_A), applied: lines("plan.change.applied") });
  await fake.advance({ days: 1 });
  ok("PF-15 DW5 fail (after a trial): a later run applies nothing again (no second line, no second change)", lines("plan.change.applied") === 1);

  // ---------------------------------------------------------------- a stale booking (the plan moved another way)
  sql(`update platform_subscription set plan_id = '${PLAN_A}', current_period_end = now() + interval '20 days' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  const b2 = await book("pf15b-low");
  const FIRM_PLAN = sql(`select id from platform_plan where code = 'firm'`), firmSeats = Number(sql(`select seats_limit from platform_plan where code = 'firm'`));
  sql(`update platform_subscription set plan_id = '${FIRM_PLAN}' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);   // e.g. a raise through Stripe meanwhile
  ok("PF-15 fail (stale booking): once the subscription is on another plan than the one booked from, the booking no longer lowers any limit", !b2.atOnce && (await limitA("seats")) === firmSeats);
  await fake.advance({ days: 40 });
  ok("PF-15 fail (stale booking, review m1): the job does not apply it; it withdraws it with its own line (reason STALE), so nothing stays stuck; the plan is unchanged", planOf(FIRM_A) === "firm" && sql(`select count(*) from platform_subscription_change where id = '${b2.id}' and applied_at is null and withdrawn_at is not null`) === "1" && lines("plan.change.withdrawn") === wd + 1 && sql(`select count(*) from audit_event where action = 'plan.change.withdrawn' and detail->>'reason' = 'STALE'`) === "1");
  // Review m1: a resubscription (the old subscription ended, a new one live on the same plan) leaves no booking lowering.
  sql(`update platform_subscription set current_period_end = now() + interval '5 days' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  await book("pf15b-low");
  sql(`update platform_subscription set status = 'ENDED' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  sql(`insert into platform_subscription (id, firm_id, plan_id, status, current_period_end, updated_at) values (gen_random_uuid(), '${FIRM_A}', '${PLAN_A}', 'ACTIVE', now() + interval '30 days', now())`);
  ok("PF-15 fail (review m1): after a resubscription on the same plan the old subscription's booking lowers nothing", (await limitA("seats")) === u0 + 7 && (await limitA("active_individual_cases")) === teamCases);
  await fake.advance({ days: 10 });
  ok("PF-15 pass (review m1): and the daily job withdraws it (nothing stays open), the new subscription untouched", sql(`select count(*) from platform_subscription_change where withdrawn_at is null and applied_at is null`) === "0" && planOf(FIRM_A) === CODE_A);
  // Break m2: a plan switched off after the booking is never applied; the job withdraws it.
  sql(`update platform_subscription set current_period_end = now() + interval '5 days' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  await book("pf15b-low");
  sql(`update platform_plan set active = false where id = '${LOW}'`);
  await fake.advance({ days: 10 });
  sql(`update platform_plan set active = true where id = '${LOW}'`);
  ok("PF-15 fail (break m2): a booking whose target plan was switched off meanwhile is not applied at its renewal; the job withdraws it", planOf(FIRM_A) === CODE_A && sql(`select count(*) from platform_subscription_change where withdrawn_at is null and applied_at is null`) === "0");
  // Break B1: no raise is ever booked: a larger plan (more seats) outside a trial, prices unknown → refused.
  const big = await problemOf(() => book("firm"));
  ok("PF-15 fail (break B1): with no prices on the plans, a move to a plan allowing more (seats or any limit) outside a trial → 409 PLAN_RAISE_NOT_BOOKED; nothing booked", big?.body.code === "PLAN_RAISE_NOT_BOOKED" && sql(`select count(*) from platform_subscription_change where withdrawn_at is null and applied_at is null`) === "0", big);
  // Break m4: a withdrawal is stamped with the database's time, whatever the caller writes.
  const b5 = await book("pf15b-low");
  sql(`update platform_subscription_change set withdrawn_at = '2000-01-01' where id = '${b5.id}'`);
  ok("PF-15 fail (break m4): a withdrawal written with a back-dated time gets the database's own time (on or after the booking)", sql(`select (withdrawn_at >= booked_at)::text from platform_subscription_change where id = '${b5.id}'`) === "true");

  // ---------------------------------------------------------------------- DW5 during a trial: at once, end unchanged
  sql(`update platform_subscription set status = 'TRIAL', current_period_end = null, trial_ends_at = '2030-01-15T12:00:00Z' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  const b3 = await book("pf15b-low");
  ok("PF-15 DW5 pass (trial): during a trial the move applies at once (SA-3-61, SA-4-56): plan changed now, the trial end unchanged, one 'applied' line",
    b3.atOnce && b3.appliedAt === b3.bookedAt && planOf(FIRM_A) === "pf15b-low" && sql(`select to_char(trial_ends_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') from platform_subscription where firm_id = '${FIRM_A}' and status <> 'ENDED'`) === "2030-01-15 12:00" && lines("plan.change.applied") === 2, b3);
  ok("PF-15 DW5 fail (trial): nothing stays open after a trial switch (the next switch needs no withdrawal), and the limits are the new plan's own", sql(`select count(*) from platform_subscription_change where withdrawn_at is null and applied_at is null`) === "0" && (await limitA("seats")) === u0);
  const b4 = await book(CODE_A);
  sql(`update platform_subscription set trial_ends_at = now() - interval '1 day', current_period_end = now() + interval '7 days' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  const b6 = await book("pf15b-low"); await withdraw();
  sql(`update platform_subscription set trial_ends_at = '2030-01-15T12:00:00Z', current_period_end = null where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  ok("PF-15 fail (break m3): a firm still marked TRIAL after its trial end gets no free switch at once: the move is booked for the renewal", !b6.atOnce && b6.appliedAt === null && planOf(FIRM_A) === CODE_A, b6);
  ok("PF-15 DW5 pass (trial): switching back up during the trial is also at once and free", b4.atOnce && planOf(FIRM_A) === CODE_A);

  // ----------------------------------------------------------------------------- the database refuses the rest
  const same = await problemOf(() => book(CODE_A));
  const nope = await problemOf(() => book("pf15b-no-such-plan"));
  sql(`update platform_subscription set status = 'PAYMENT_HOLD' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  const hold = await problemOf(() => book("pf15b-low"));
  sql(`update platform_subscription set status = 'TRIAL' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
  ok("PF-15 fail: the same plan → 409 SAME_PLAN; an unknown plan → 404; a firm on payment hold → 409 BILLING_NOT_ACTIVE; none books anything",
    same?.body.code === "SAME_PLAN" && nope?.status === 404 && hold?.body.code === "BILLING_NOT_ACTIVE" && sql(`select count(*) from platform_subscription_change where withdrawn_at is null and applied_at is null`) === "0", { same, nope, hold });
  ok("PF-15 fail: an actor that is neither staff:<id> nor system:<name> is refused before anything is read", (await problemOf(() => walls.withFirm(FIRM_A, () => bookings.book(FIRM_A, "solo", "anyone")))) !== null);

  // ------------------------------------------------------------------------------------------- PF-12's walls
  const SUB_A = sql(`select id from platform_subscription where firm_id = '${FIRM_A}' and status <> 'ENDED'`), PLAN_NOW = sql(`select plan_id from platform_subscription where id = '${SUB_A}'`);
  const asApp = (firm: string, q: string) => sql(`begin; set local role xr_app; select set_config('app.firm_id', '${firm}', true); ${q}; commit`);
  ok("PF-15 fail (walls): firm B's session cannot book for firm A (the policy refuses the row)", (() => { try { asApp(FIRM_B, `insert into platform_subscription_change (id, firm_id, subscription_id, from_plan_id, to_plan_id, booked_by, booked_at, effective_at) values (gen_random_uuid(), '${FIRM_A}', '${SUB_A}', '${PLAN_NOW}', '${LOW}', 'staff:x', now(), now())`); return false; } catch (e) { return /row-level security|42501|another firm|firm/.test(String((e as { stderr?: string }).stderr ?? e)); } })()
    && sql(`select count(*) from platform_subscription_change where booked_by = 'staff:x'`) === "0");
  walls.wallUnscopedQueries();
  const walled = new Db();
  try {
    ok("PF-15 fail (walls): in firm B's session, firm A's bookings are not visible", (await walls.withFirm(FIRM_B, () => walled.platformSubscriptionChange.findMany({ where: { firmId: FIRM_A } }))).length === 0 && Number(sql(`select count(*) from platform_subscription_change where firm_id = '${FIRM_A}'`)) > 0);
    const walledBookings = new PlanBookings({ db: walled, now: () => clock.now(), files, cases: () => cases });
    const wb = await walls.withFirm(FIRM_A, () => walledBookings.book(FIRM_A, "pf15b-low", OWNER));
    ok("PF-15 pass (walls): on the walled pool (xr_app), in the firm's own scope, a trial switch books and applies (the definer triggers write the subscription)", wb.atOnce && planOf(FIRM_A) === "pf15b-low", wb);
    await walls.withFirm(FIRM_A, () => walledBookings.book(FIRM_A, CODE_A, OWNER));   // back up, still in the trial: at once
    sql(`update platform_subscription set status = 'ACTIVE', current_period_end = now() + interval '3 days' where firm_id = '${FIRM_A}' and status <> 'ENDED'`);
    await walls.withFirm(FIRM_A, () => walledBookings.book(FIRM_A, "pf15b-low", OWNER));
    // Its own clock 4 days on (moving the fake clock would let the direct pool's registered job apply it first).
    const d = await new PlanBookings({ db: walled, now: () => clock.now() + 4 * 86_400_000, files, cases: () => cases }).daily();
    ok("PF-15 pass (walls): the daily job on the walled pool, through its named crossing, applies the due booking in the firm's own scope", d.applied === 1 && d.failed === 0 && planOf(FIRM_A) === "pf15b-low", d);
    ok("PF-15 pass (PF-12b): the daily job's crossing wrote one platform.bypass line to the firm it handled", Number(sql(`select count(*) from audit_event where action = 'platform.bypass' and detail->>'firmId' = '${FIRM_A}' and summary like '%booking_daily%'`)) >= 1);
  } finally { await walled.$disconnect(); }
} catch (e) {
  fail++; console.log(`FAIL  PF-15b: the check stopped — ${String((e as Error)?.stack ?? e).slice(0, 800)}`);
} finally {
  await app?.close();
  await db.$disconnect();
  execFileSync(bin("dropdb"), [...PG, "--if-exists", "--force", DB]);
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
