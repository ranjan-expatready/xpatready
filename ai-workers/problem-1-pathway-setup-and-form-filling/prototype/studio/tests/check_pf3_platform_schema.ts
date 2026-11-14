// PF-3 (P-558, P-559; BACKLOG row PF-3 rev 3.1; contracts §0, §1.1, §1.2, §7): the platform tables, their database rules,
// the firm filter, the settings home and the Sample firm seed. Every line of the row's "Done when", each with a passing
// and a failing case. Two scratch databases: "empty" gets every migration; "demo" gets every migration before PF-3's,
// then demo-shaped rows (Sample cases of both firms, an audit line), then PF-3's migration and any later one. No server,
// no browser, no model call (US$0). Both databases are dropped at the end.
//   tsx studio/tests/check_pf3_platform_schema.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { firmScope, FirmScopeError, inFirm } from "../api/src/platform/firm-scope.ts";
import { readSampleFirms, seedSampleFirms, unmatchedCaseFirmKeys } from "../api/src/platform/seed-sample-firms.ts";
import { readSetting, readSettings, registerSetting, SettingRefused, writeSetting } from "../api/src/platform/settings.ts";
import { z } from "zod";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114015002_pf3_platform_tables";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_pf3_empty_${process.pid}`, DEMO = `xr_studio_pf3_demo_${process.pid}`, BARE = `xr_studio_pf3_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `pf3-check-${process.pid}`);

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const throwsLike = async (f: () => unknown, test: (e: unknown) => boolean) => { try { await f(); return false; } catch (e) { return test(e); } };
const client = (db: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), options: "-c TimeZone=UTC" }) });
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const PLATFORM_TABLES = ["platform_firm", "platform_setting_definition", "platform_firm_setting", "platform_plan", "platform_subscription", "platform_signup_link", "platform_staff", "platform_staff_credential", "platform_role_grant", "platform_role_permission", "platform_invitation", "platform_session_revocation", "webhook_receipt", "module_event"];
const CATALOGUES = new Set(["platform_plan", "platform_role_permission", "platform_setting_definition"]);

// prisma migrate diff from a database to the schema folder: the lines that name a PF-3 table or type (main's own known
// drift, listed in tests/check_prisma_schema.ts KNOWN, is not this row's).
function platformDiff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /platform|webhook_receipt|module_event|Platform/.test(l));
}
// The tables (of a list) with no index whose first column is firm_id (platform_firm: its id is the firm id).
const tablesWithoutFirmFirst = (db: string, tables: string[]) => sql(db, `select coalesce(string_agg(t, ',' order by t), '') from unnest(array[${tables.map((t) => `'${t}'`).join(",")}]) t
  where not exists (select 1 from pg_index i join pg_class c on c.oid = i.indrelid join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
    where c.relname = t and c.relnamespace = 'public'::regnamespace and a.attname = case when t = 'platform_firm' then 'id' else 'firm_id' end)`);
// Every PF-3 table's rows, as one text (to see that a second seed changes nothing, timestamps included).
const snapshot = (db: string) => PLATFORM_TABLES.map((t) => sql(db, `select coalesce(string_agg(to_jsonb(x)::text, '|' order by to_jsonb(x)::text), '') from "${t}" x`)).join("\n");

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
try {
  ok("PF-3: the migration has its own stamp, later than the newest on main before it (20261112150000_a24_case_number; P-348 (8))", all.includes(NEW) && NEW > "20261112150000_a24_case_number" && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));

  // ------------------------------------------------------------------------------------------- the migration (row line 1)
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-3 pass: every migration applies to an empty database", sql(EMPTY, `select count(*) from pg_tables where schemaname='public' and tablename = any('{${PLATFORM_TABLES.join(",")}}')`) === String(PLATFORM_TABLES.length));
  ok("PF-3 pass: migrate diff from the migrated empty database to the schema names no PF-3 table or type", platformDiff(EMPTY).length === 0, platformDiff(EMPTY));
  for (const d of all.filter((x) => x < NEW)) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-3 fail: a database without PF-3's migration differs from the schema (diff names the platform tables)", platformDiff(BARE).some((l) => /platform_firm/.test(l)));
  ok("PF-3 fail: the migration does not apply twice (it is never re-run silently)", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  // Demo-shaped copy: the Sample firms' cases and an audit line, written before PF-3's migration.
  for (const d of all.filter((x) => x < NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  const W = u(1), CMB = u(2);
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values
      ('${u(10)}', '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001'), ('${u(11)}', '${W}', '${CMB}', 'user-P', 'user-R', 'sample-firm', 'C-2026-00002'),
      ('${u(12)}', '${W}', '${CMB}', 'user-P', 'user-S', 'sample-solo', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, action, entity, summary) values (gen_random_uuid(), '${W}', 'user-R', 'case.open', 'runtime_case', 'Sample');`);
  const before = sql(DEMO, `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select string_agg(firm_key || '/' || case_number, ',' order by id) from runtime_case)`);
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-3 pass: the migration applies to a demo-data copy and leaves its rows as they were", sql(DEMO, `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select string_agg(firm_key || '/' || case_number, ',' order by id) from runtime_case)`) === before, before);
  ok("PF-3 pass: migrate diff after it on the demo-data copy names no PF-3 table or type", platformDiff(DEMO).length === 0, platformDiff(DEMO));

  // ------------------------------------------------------------------------------------------------- catalogues (data)
  const perRole = sql(DEMO, `select string_agg(role || ':' || n, ',' order by role) from (select role::text, count(*) n from platform_role_permission group by role) x`);
  ok("PF-3 pass: the starter roles' keys per role equal SA-06 v3.15 Appendix C (Owner 231, Admin 213, Case Manager 145, Case Officer 99, Billing / Finance 46, Read-only 40)",
    perRole === "ADMIN:213,BILLING_FINANCE:46,CASE_MANAGER:145,CASE_OFFICER:99,OWNER:231,READ_ONLY:40", perRole);
  ok("PF-3 pass: every seeded key is a firm (agent/*) key; Owner-only keys are on Owner alone (SA6-D5)",
    sql(DEMO, `select count(*) from platform_role_permission where permission_key not like 'agent/%'`) === "0"
    && sql(DEMO, `select string_agg(distinct role::text, ',') from platform_role_permission where permission_key in ('agent/subscription:cancel','agent/firm-profile:manage','agent/payment-rail:connect','agent/ai:switch')`) === "OWNER");
  ok("PF-3 fail: a key for a role that is not one of the six is refused", refused(DEMO, `insert into platform_role_permission values ('REPRESENTATIVE', 'agent/case:edit')`, /invalid input value for enum/));
  ok("PF-3 pass: three Sample plans, trial 14 days, no price set", sql(DEMO, `select string_agg(code || ':' || seats_limit || ':' || trial_days || ':' || coalesce(monthly_price_cents::text, '-'), ',' order by seats_limit) from platform_plan`) === "solo:1:14:-,team:5:14:-,firm:20:14:-");

  // ----------------------------------------------------------------------------------------- the seed (row lines 11-13)
  const db = client(DEMO); dbs.push(db);
  const first = await seedSampleFirms(db);
  ok("PF-3 pass: the seed adds the two Sample firms, four staff, their grants and three licence records",
    first.firmsAdded === 2 && first.staffAdded === 4 && first.credentialsAdded === 3 && first.subscriptionsAdded === 2 && first.grantsAdded === 6, first);
  ok("PF-3 pass: the Sample firms keep their keys and Canada as country", sql(DEMO, `select string_agg(key || ':' || country_code || ':' || status, ',' order by key) from platform_firm`) === "sample-firm:CA:ACTIVE,sample-solo:CA:ACTIVE");
  const snap1 = snapshot(DEMO);
  const second = await seedSampleFirms(db);
  ok("PF-3 pass: the seed run twice changes nothing (every PF-3 table's rows identical, timestamps too)", snapshot(DEMO) === snap1 && second.firmsAdded + second.staffAdded + second.grantsAdded + second.credentialsAdded + second.subscriptionsAdded === 0, second);
  sql(DEMO, `update platform_staff set display_name = 'Renamed by the firm' where actor_id = 'user-O'`);
  await seedSampleFirms(db);
  ok("PF-3 fail: a change a person made to a Sample row is not undone by the seed", sql(DEMO, `select display_name from platform_staff where actor_id = 'user-O'`) === "Renamed by the firm");
  ok("PF-3 fail: the seed into a database without the Sample plans is refused in words, and writes nothing",
    await throwsLike(async () => { const e = client(EMPTY); dbs.push(e); await e.$executeRawUnsafe(`delete from platform_plan`); await seedSampleFirms(e); }, (e) => /Sample plans are missing/.test(String(e))) && sql(EMPTY, `select count(*) from platform_firm`) === "0");
  ok("PF-3 pass: after the seed every case's firm key matches a platform firm", first.unmatchedCaseFirmKeys.length === 0 && (await unmatchedCaseFirmKeys(db)).length === 0);
  sql(DEMO, `set session_replication_role = replica; insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values ('${u(13)}', '${W}', '${CMB}', 'user-P', 'user-O', 'other-firm', 'C-2026-00009')`);
  ok("PF-3 fail: a case whose firm key no platform firm has is named", (await seedSampleFirms(db)).unmatchedCaseFirmKeys.join(",") === "other-firm");
  sql(DEMO, `set session_replication_role = replica; delete from runtime_case where id = '${u(13)}'`);
  const sampleIds = readSampleFirms().flatMap((f) => f.users.map((x) => x.id)).sort().join(",");
  ok("PF-3 pass: every Sample user has one platform_staff row with its actor id (user-O, user-R, user-S, user-T)",
    sampleIds === "user-O,user-R,user-S,user-T" && sql(DEMO, `select string_agg(actor_id || ':' || n, ',' order by actor_id) from (select actor_id, count(*) n from platform_staff group by actor_id) x`) === "user-O:1,user-R:1,user-S:1,user-T:1");
  ok("PF-3 pass: user-R and user-S are Case Managers with a licence record (and Owners: firm_admin); user-O a Case Officer",
    sql(DEMO, `select string_agg(s.actor_id || ':' || (select string_agg(g.role::text, '+' order by g.role) from platform_role_grant g where g.staff_id = s.id and g.ended_at is null) || ':' || coalesce(c.licensing_body || '/' || c.licence_number, '-'), ',' order by s.actor_id) from platform_staff s left join platform_staff_credential c on c.staff_id = s.id`)
      === "user-O:CASE_OFFICER:-,user-R:OWNER+CASE_MANAGER:CICC/R000000,user-S:OWNER+CASE_MANAGER:CICC/R000001,user-T:CASE_MANAGER:CICC/R000002");
  const firmA = sql(DEMO, `select id from platform_firm where key='sample-firm'`), firmB = sql(DEMO, `select id from platform_firm where key='sample-solo'`);
  ok("PF-3 fail: a second staff row with an actor id already used is refused", refused(DEMO, `insert into platform_staff (id, firm_id, email, display_name, actor_id, updated_at) values (gen_random_uuid(), '${firmB}', 'x@sample-solo.example.com', 'X', 'user-R', now())`, /platform_staff_actor_id_key/));

  // --------------------------------------------------------------------------------------- database rules (lines 2-7)
  ok("PF-3 pass: the rest of a firm changes (its operating name)", sql(DEMO, `update platform_firm set operating_name = 'Sample immigration firm' where id = '${firmA}' returning country_code`) === "CA");
  ok("PF-3 fail: a firm's country_code cannot change", refused(DEMO, `update platform_firm set country_code = 'US' where id = '${firmA}'`, /platform_firm_country_fixed/) && sql(DEMO, `select country_code from platform_firm where id='${firmA}'`) === "CA");
  const staffO = sql(DEMO, `select id from platform_staff where actor_id='user-O'`);
  ok("PF-3 pass: a person without a licence record gets one", sql(DEMO, `insert into platform_staff_credential (id, firm_id, staff_id, representative_type, licensing_body, licence_number, updated_by, updated_at) values (gen_random_uuid(), '${firmA}', '${staffO}', 'rcic', 'CICC', 'R000009', 't', now()) returning licence_number`) === "R000009");
  ok("PF-3 fail: a second licence record for one person is refused", refused(DEMO, `insert into platform_staff_credential (id, firm_id, staff_id, representative_type, licensing_body, licence_number, updated_by, updated_at) values (gen_random_uuid(), '${firmA}', '${staffO}', 'rcic', 'CICC', 'R000010', 't', now())`, /platform_staff_credential_firm_id_staff_id_key/));
  const newFirm = (key: string, email: string) => `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), '${key}', 'Firm ${key}', 'CA', '${email}', now()) returning id`;
  const firmC = sql(DEMO, newFirm("firm-c", "office@firm-c.example.com"));
  ok("PF-3 pass: another firm with its own contact email is accepted", /^[0-9a-f-]{36}$/.test(firmC));
  ok("PF-3 fail: a contact email belongs to one firm (the same email, or the same in capitals, is refused)",
    refused(DEMO, newFirm("firm-d", "office@firm-c.example.com"), /platform_firm_contact_email_key/) && refused(DEMO, newFirm("firm-d", "Office@Firm-C.example.com"), /platform_firm_contact_email_lower/));
  ok("PF-3 fail: a country that is not two capital letters is refused", refused(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-e', 'E', 'ca', 'e@e.example.com', now())`, /platform_firm_country_code_check/));
  const invite = (firm: string, email: string, extra = "") => `insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at${extra ? ", revoked_at" : ""}) values (gen_random_uuid(), '${firm}', '${email}', '{CASE_OFFICER}', md5(random()::text), 't', now() + interval '72 hours'${extra ? `, ${extra}` : ""}) returning id`;
  const inv1 = sql(DEMO, invite(firmA, "new@sample-firm.example.com"));
  ok("PF-3 fail: a second open invitation for the same firm and email is refused", refused(DEMO, invite(firmA, "new@sample-firm.example.com"), /platform_invitation_one_open/));
  sql(DEMO, `update platform_invitation set revoked_at = now() where id = '${inv1}'`);
  ok("PF-3 pass: once revoked, the email can be invited again; another firm may invite the same email", !!sql(DEMO, invite(firmA, "new@sample-firm.example.com")) && !!sql(DEMO, invite(firmB, "new@sample-firm.example.com")));
  ok("PF-3 fail: an invitation living longer than 72 hours is refused", refused(DEMO, `insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at) values (gen_random_uuid(), '${firmC}', 'z@z.example.com', '{ADMIN}', 'h', 't', now() + interval '73 hours')`, /platform_invitation_72_hours/));
  const hook = (service: string, ev: string) => `insert into webhook_receipt (id, service, event_id) values (gen_random_uuid(), '${service}', '${ev}') returning event_id`;
  ok("PF-3 pass: webhook receipts: one per service and event id (the same id from another service is another receipt)", sql(DEMO, hook("stripe", "evt_1")) === "evt_1" && sql(DEMO, hook("boldsign", "evt_1")) === "evt_1");
  ok("PF-3 fail: the same service and event id twice is refused (a repeat is ignored by the handler)", refused(DEMO, hook("stripe", "evt_1"), /webhook_receipt_service_event_id_key/));
  const ev = sql(DEMO, `insert into module_event (id, firm_id, type, subject_id, payload) values (gen_random_uuid(), '${firmA}', 'firm.created', '${firmA}', '{"firmId":"${firmA}"}') returning id`);
  ok("PF-3 pass: a module event is written (insert)", /^[0-9a-f-]{36}$/.test(ev));
  ok("PF-3 fail: module_event refuses update, delete and truncate",
    refused(DEMO, `update module_event set type = 'x' where id = '${ev}'`, /module_event_insert_only/) && refused(DEMO, `delete from module_event where id = '${ev}'`, /module_event_insert_only/)
    && refused(DEMO, `truncate module_event`, /module_event_insert_only/) && sql(DEMO, `select type from module_event where id='${ev}'`) === "firm.created");
  const link = sql(DEMO, `insert into platform_signup_link (id, token_hash, email, country_code, created_by, expires_at) values (gen_random_uuid(), 'h1', 'owner@new.example.com', 'CA', 't', now() + interval '14 days') returning id`);
  ok("PF-3 pass: a sign-up link is used once (it records its firm)", sql(DEMO, `update platform_signup_link set used_at = now(), firm_id = '${firmC}' where id = '${link}' returning firm_id`) === firmC);
  ok("PF-3 fail: a used sign-up link is refused a second time; one living over 14 days is refused",
    refused(DEMO, `update platform_signup_link set used_at = now(), firm_id = '${firmB}' where id = '${link}'`, /platform_signup_link_used_once/)
    && refused(DEMO, `insert into platform_signup_link (id, token_hash, email, country_code, created_by, expires_at) values (gen_random_uuid(), 'h2', 'o@n.example.com', 'CA', 't', now() + interval '15 days')`, /platform_signup_link_14_days/));
  ok("PF-3 fail: a second live subscription for one firm is refused", refused(DEMO, `insert into platform_subscription (id, firm_id, plan_id, status, updated_at) select gen_random_uuid(), '${firmA}', id, 'TRIAL', now() from platform_plan where code='team'`, /platform_subscription_one_live/));

  // --------------------------------------------------------------------------------------------- firm_id first (line 10)
  const scoped = PLATFORM_TABLES.filter((t) => !CATALOGUES.has(t));
  ok("PF-3 pass: every table but platform_plan, platform_role_permission and platform_setting_definition has firm_id first in an index", tablesWithoutFirmFirst(DEMO, scoped) === "", tablesWithoutFirmFirst(DEMO, scoped));
  sql(DEMO, `create table pf3_probe (id uuid primary key, firm_id uuid not null); create index pf3_probe_other on pf3_probe (id, firm_id)`);
  ok("PF-3 fail: a table with firm_id only second in its index is named", tablesWithoutFirmFirst(DEMO, [...scoped, "pf3_probe"]) === "pf3_probe");
  sql(DEMO, `drop table pf3_probe`);

  // ------------------------------------------------------------------------------------------ the firm filter (line 11)
  const staffA = await db.platformStaff.findMany({ where: firmScope(firmA) }), staffB = await db.platformStaff.findMany({ where: firmScope(firmB) });
  ok("PF-3 pass: firmScope(A) returns firm A's rows only (3 staff), firmScope(B) firm B's (1)", staffA.length === 3 && staffA.every((s) => s.firmId === firmA) && staffB.length === 1 && staffB[0].actorId === "user-S");
  const bId = staffB[0].id;
  ok("PF-3 fail: firm B's staff id looked up through firmScope(A) is not found (404, never 403)",
    (await db.platformStaff.findFirst({ where: firmScope(firmA, { id: bId }) })) === null
    && await throwsLike(async () => inFirm(firmA, await db.platformStaff.findFirst({ where: firmScope(firmA, { id: bId }) })), (e) => (e as { getStatus?: () => number }).getStatus?.() === 404)
    && await throwsLike(() => inFirm(firmA, staffB[0]), (e) => (e as { getStatus?: () => number }).getStatus?.() === 404));
  ok("PF-3 fail: a where clause naming firm B inside firmScope(A), or a firm id that is not one, is refused before any query",
    await throwsLike(() => firmScope(firmA, { firmId: firmB }), (e) => e instanceof FirmScopeError) && await throwsLike(() => firmScope("sample-firm"), (e) => e instanceof FirmScopeError) && await throwsLike(() => firmScope(undefined as unknown as string), (e) => e instanceof FirmScopeError));

  // ----------------------------------------------------------------------------------------------- settings (lines 8-9)
  const WS = u(1), audits = () => sql(DEMO, `select count(*) from audit_event where entity = 'platform_firm_setting'`);
  ok("PF-3 pass: an unset key reads its default (currency CAD, two-step off until founder question 3, business hours Mon-Fri 09:00-17:00)",
    await readSetting(db, firmA, "platform.currency") === "CAD" && await readSetting(db, firmA, "platform.require_two_step") === false
    && JSON.stringify(await readSetting(db, firmA, "platform.business_hours")) === JSON.stringify(["MON", "TUE", "WED", "THU", "FRI"].map((day) => ({ day, opens: "09:00", closes: "17:00" }))));
  ok("PF-3 fail: a value that fails its registered schema is refused and nothing is written",
    await throwsLike(() => writeSetting(db, { firmId: firmA, key: "platform.currency", value: "EUR", by: "user-R", workspaceId: WS }), (e) => e instanceof SettingRefused && e.getStatus() === 400)
    && await throwsLike(() => writeSetting(db, { firmId: firmA, key: "platform.business_hours", value: [{ day: "MON", opens: "17:00", closes: "09:00" }], by: "user-R", workspaceId: WS }), (e) => e instanceof SettingRefused)
    && await throwsLike(() => writeSetting(db, { firmId: firmA, key: "platform.time_zone", value: "Mars/Olympus", by: "user-R", workspaceId: WS }), (e) => e instanceof SettingRefused)
    && sql(DEMO, `select count(*) from platform_firm_setting`) === "0" && audits() === "0");
  ok("PF-3 fail: an unregistered key is refused", await throwsLike(() => writeSetting(db, { firmId: firmA, key: "platform.nothing", value: 1, by: "user-R", workspaceId: WS }), (e) => e instanceof SettingRefused));
  const saved = await writeSetting(db, { firmId: firmA, key: "platform.currency", value: "USD", by: "user-R", workspaceId: WS });
  ok("PF-3 pass: a setting change is saved and writes one audit line (who, the firm, from and to)",
    saved.changed && await readSetting(db, firmA, "platform.currency") === "USD" && await readSetting(db, firmB, "platform.currency") === "CAD" && audits() === "1"
    && sql(DEMO, `select actor || '|' || entity_key || '|' || (detail->>'from') || '|' || (detail->>'to') from audit_event where entity = 'platform_firm_setting'`) === `user-R|${firmA}:platform.currency|CAD|USD`);
  // A forced audit failure: the database refuses this one actor's audit line (a trigger of this check's own).
  sql(DEMO, `create function pf3_force_audit_fail() returns trigger language plpgsql as $$ begin if new.actor = 'force-audit-failure' then raise exception 'pf3 forced audit failure'; end if; return new; end $$;
    create trigger pf3_force_audit_fail before insert on audit_event for each row execute function pf3_force_audit_fail()`);
  ok("PF-3 fail: a forced audit failure rolls the setting change back (one transaction)",
    await throwsLike(() => writeSetting(db, { firmId: firmA, key: "platform.currency", value: "CAD", by: "force-audit-failure", workspaceId: WS }), (e) => /pf3 forced audit failure/.test(String(e)))
    && await readSetting(db, firmA, "platform.currency") === "USD" && audits() === "1");
  await db.$transaction(async (tx) => { await writeSetting(tx, { firmId: firmB, key: "platform.language", value: "fr", by: "user-S", workspaceId: WS }); });
  ok("PF-3 pass: inside a caller's transaction the change and its audit line are written together", await readSetting(db, firmB, "platform.language") === "fr" && audits() === "2");
  ok("PF-3 fail: the caller's transaction rolling back takes the setting and its audit line with it",
    await throwsLike(() => db.$transaction(async (tx) => { await writeSetting(tx, { firmId: firmB, key: "platform.language", value: "en", by: "user-S", workspaceId: WS }); throw new Error("caller failed"); }), (e) => /caller failed/.test(String(e)))
    && await readSetting(db, firmB, "platform.language") === "fr" && audits() === "2");
  ok("PF-3 pass: readSettings gives every registered key, defaults filled in", Object.keys(await readSettings(db, firmA)).length >= 7);
  ok("PF-3 fail: a firm that does not exist cannot be given a setting", await throwsLike(() => writeSetting(db, { firmId: u(99), key: "platform.language", value: "fr", by: "user-R", workspaceId: WS }), (e) => e instanceof SettingRefused));
  registerSetting({ key: "check.pf3_limit", ownerModule: "check", description: "check only", schema: z.number().int().min(1).max(5), default: 2, changePermission: "agent/settings:edit" });
  ok("PF-3 pass: another module registers its own key; the definition is stored with its JSON schema on first write",
    (await writeSetting(db, { firmId: firmA, key: "check.pf3_limit", value: 4, by: "user-R", workspaceId: WS })).value === 4
    && sql(DEMO, `select (value_schema->>'maximum') || ':' || default_value::text from platform_setting_definition where key = 'check.pf3_limit'`) === "5:2");
  ok("PF-3 fail: a key registered twice, or with a default that fails its own schema, is refused at registration",
    await throwsLike(() => registerSetting({ key: "check.pf3_limit", ownerModule: "check", description: "", schema: z.number(), default: 1, changePermission: "x" }), (e) => /already registered/.test(String(e)))
    && await throwsLike(() => registerSetting({ key: "check.pf3_bad", ownerModule: "check", description: "", schema: z.number().max(1), default: 9, changePermission: "x" }), (e) => /fails its own schema/.test(String(e))));
  // ------------------------------------------------------------------------------------------- break round 1 (B-1..B-6)
  ok("PF-3 fail (break m): a setting change with no one making it is refused", await throwsLike(() => writeSetting(db, { firmId: firmA, key: "platform.language", value: "fr", by: " ", workspaceId: WS }), (e) => e instanceof SettingRefused));
  ok("PF-3 fail (break m): a time zone not in its own spelling is refused (america/toronto)", await throwsLike(() => writeSetting(db, { firmId: firmA, key: "platform.time_zone", value: "america/toronto", by: "user-R", workspaceId: WS }), (e) => e instanceof SettingRefused));
  ok("PF-3 pass (break m): firmScope with the firm id in capitals is the same firm", (await db.platformStaff.findMany({ where: firmScope(firmA.toUpperCase()) })).length === 3 && !!inFirm(firmA.toUpperCase(), staffA[0]));
  const staffOfA = sql(DEMO, `select id from platform_staff where actor_id='user-O'`);
  ok("PF-3 fail (break B-2): a grant, licence record or session revocation of firm B naming firm A's person is refused",
    refused(DEMO, `insert into platform_role_grant (id, firm_id, staff_id, role, granted_by) values (gen_random_uuid(), '${firmB}', '${staffOfA}', 'OWNER', 't')`, /platform_role_grant_firm_id_staff_id_fkey/)
    && refused(DEMO, `insert into platform_staff_credential (id, firm_id, staff_id, representative_type, licensing_body, licence_number, updated_by, updated_at) values (gen_random_uuid(), '${firmB}', '${sql(DEMO, `select id from platform_staff where actor_id='user-T'`)}', 'rcic', 'CICC', 'R1', 't', now())`, /platform_staff_credential_firm_id_staff_id_fkey/)
    && refused(DEMO, `insert into platform_session_revocation (id, firm_id, staff_id, reason) values (gen_random_uuid(), '${firmB}', '${staffOfA}', 'x')`, /platform_session_revocation_firm_id_staff_id_fkey/));
  ok("PF-3 pass (break B-2): the same grant in the person's own firm is accepted", !!sql(DEMO, `insert into platform_role_grant (id, firm_id, staff_id, role, granted_by) values (gen_random_uuid(), '${firmA}', '${staffOfA}', 'READ_ONLY', 't') returning id`));
  sql(DEMO, `update platform_subscription set status = 'ENDED' where firm_id = '${firmB}'`);
  await seedSampleFirms(db);
  ok("PF-3 fail (break B-3): an ended Sample subscription is not brought back by the seed", sql(DEMO, `select string_agg(status::text, ',') from platform_subscription where firm_id = '${firmB}'`) === "ENDED");
  ok("PF-3 fail (break B-4): a firm's key cannot change (cases carry it)", refused(DEMO, `update platform_firm set key = 'renamed' where id = '${firmA}'`, /platform_firm_key_fixed/) && (await unmatchedCaseFirmKeys(db)).length === 0);
  sql(DEMO, `update platform_staff set actor_id = null where actor_id = 'user-T'`);
  const afterCleared = await seedSampleFirms(db);
  ok("PF-3 pass (break B-4): a Sample person whose actor id a person cleared is left as it is, and the seed still runs", afterCleared.staffAdded === 0 && sql(DEMO, `select count(*) from platform_staff where email = 'second.representative@sample-firm.example.com'`) === "1");
  sql(DEMO, `update platform_staff set actor_id = 'user-T' where email = 'second.representative@sample-firm.example.com'`);
  const old = sql(DEMO, `insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, created_at, expires_at) values (gen_random_uuid(), '${firmC}', 'late@firm-c.example.com', '{CASE_OFFICER}', 'h-old', 't', now() - interval '73 hours', now() - interval '1 hour') returning id`);
  ok("PF-3 pass (break B-5): an expired open invitation does not block a new one; it is closed at its expiry",
    !!sql(DEMO, invite(firmC, "late@firm-c.example.com")) && sql(DEMO, `select revoked_at = expires_at from platform_invitation where id = '${old}'`) === "t");
  ok("PF-3 fail (break B-5): an open invitation not yet expired still blocks a second", refused(DEMO, invite(firmC, "late@firm-c.example.com"), /platform_invitation_one_open/));
  ok("PF-3 fail (break m): an invitation both accepted and revoked, or with a null role, is refused",
    refused(DEMO, `insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at, accepted_at, revoked_at) values (gen_random_uuid(), '${firmC}', 'ar@firm-c.example.com', '{ADMIN}', 'h-ar', 't', now() + interval '1 hour', now(), now())`, /platform_invitation_one_ending/)
    && refused(DEMO, `insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at) values (gen_random_uuid(), '${firmC}', 'nr@firm-c.example.com', '{ADMIN,NULL}', 'h-nr', 't', now() + interval '1 hour')`, /platform_invitation_has_role/)
    && refused(DEMO, `insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at) values (gen_random_uuid(), '${firmC}', 'nn@firm-c.example.com', NULL, 'h-nn', 't', now() + interval '1 hour')`, /platform_invitation_has_role|null value/));
  ok("PF-3 fail (break m): an email with spaces around it, or an owner or billing email in capitals, is refused",
    refused(DEMO, newFirm("firm-sp", " sp@firm-sp.example.com"), /platform_firm_contact_email_lower/)
    && refused(DEMO, `update platform_firm set owner_email = 'Owner@Firm-C.example.com' where id = '${firmC}'`, /platform_firm_owner_email_lower/)
    && refused(DEMO, `update platform_firm set billing_email = 'b@firm-c.example.com ' where id = '${firmC}'`, /platform_firm_billing_email_lower/));
  const evIn = async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], seq?: bigint) => (await tx.moduleEvent.create({ data: { firmId: firmA, type: "check.pf3", subjectId: firmA, payload: {}, ...(seq === undefined ? {} : { seq }) } })).seq;
  let blocked = false;
  await db.$transaction(async (tx) => {
    await evIn(tx);
    blocked = refused(DEMO, `set lock_timeout = '300ms'; insert into module_event (id, firm_id, type, subject_id, payload) values (gen_random_uuid(), '${firmA}', 'check.other', '${firmA}', '{}')`, /lock timeout/);
  }, { timeout: 20000 });
  ok("PF-3 fail (break B-1): while one transaction holds an unwritten event, a second writer waits (seq follows commit order; no event is skipped by a reader)", blocked);
  const given = await db.$transaction((tx) => evIn(tx, 1000000n));
  ok("PF-3 fail (break B-1): a seq the writer gives is replaced by the next in order", given < 1000000n && given === BigInt(sql(DEMO, `select max(seq) from module_event`)));
  ok("PF-3 pass (break B-1): after both commit, seq increases in commit order", sql(DEMO, `select bool_and(seq > lag) from (select seq, lag(seq) over (order by occurred_at, seq) lag from module_event) x where lag is not null`) === "t");
  // ------------------------------------------------------------------------------------------ break round 2 (R2-2..R2-7)
  const solo = firmB;
  ok("PF-3 fail (break R2-2): a staff member cannot be moved to another firm (their grants and licence never follow)",
    refused(DEMO, `update platform_staff set firm_id = '${solo}' where actor_id = 'user-R'`, /platform_staff_firm_fixed/)
    && sql(DEMO, `select count(*) from platform_role_grant g join platform_staff s on s.id = g.staff_id where s.actor_id = 'user-R' and g.firm_id = '${firmA}' and g.role = 'OWNER'`) === "1");
  ok("PF-3 fail (break R2-2): a grant's firm cannot be changed under its person either", refused(DEMO, `update platform_role_grant set firm_id = '${solo}' where staff_id = (select id from platform_staff where actor_id = 'user-O') and role = 'CASE_OFFICER'`, /platform_role_grant_firm_id_staff_id_fkey/));
  ok("PF-3 pass (break R2-3): current IANA names are accepted (Asia/Kolkata, Europe/Kyiv, America/Argentina/Buenos_Aires, Etc/UTC)",
    await (async () => { for (const z of ["Asia/Kolkata", "Europe/Kyiv", "America/Argentina/Buenos_Aires", "Etc/UTC"]) if (!(await writeSetting(db, { firmId: firmC, key: "platform.time_zone", value: z, by: "user-R", workspaceId: WS }).then(() => true, () => false))) return false; return true; })()
    && await readSetting(db, firmC, "platform.time_zone") === "Etc/UTC");
  ok("PF-3 fail (break R2-6): an email with a tab, a newline, a non-breaking or zero-width space is refused",
    ["sp@firm-sp.example.com\t", "sp@firm-sp.example.com\n", "\u00a0sp@firm-sp.example.com", "sp\u200b@firm-sp.example.com"].every((e) => refused(DEMO, newFirm("firm-sp", e), /platform_firm_contact_email_lower/)));
  ok("PF-3 fail (break R2-7): an invitation listing a role twice, or accepted after it expired, is refused",
    refused(DEMO, `insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at) values (gen_random_uuid(), '${firmC}', 'dup@firm-c.example.com', '{ADMIN,ADMIN}', 'h-dup', 't', now() + interval '1 hour')`, /platform_invitation_roles_distinct/)
    && refused(DEMO, `update platform_invitation set accepted_at = now() where id = '${old}'`, /platform_invitation_one_ending|platform_invitation_accepted_in_time/)
    && refused(DEMO, `insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, created_at, expires_at, accepted_at) values (gen_random_uuid(), '${firmC}', 'lateacc@firm-c.example.com', '{ADMIN}', 'h-la', 't', now() - interval '2 hours', now() - interval '1 hour', now())`, /platform_invitation_accepted_in_time/));
  ok("PF-3: no secret column — no PF-3 column is named like a password, secret or raw token",
    sql(DEMO, `select count(*) from information_schema.columns where table_name = any('{${PLATFORM_TABLES.join(",")}}') and column_name ~ '(password|secret|^token$|api_key)'`) === "0");
} finally {
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
