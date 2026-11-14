// FO-1b (P-558, P-559 (2); BACKLOG row FO-1b rows rev 3.1; contracts §2.2, §7; AG-4-1, -4, -9, -26, -36, -62, BR-3): the
// booking tables, their database rules and the staff-hours seed. Every line of the row's "Done when", each with a passing
// and a failing case; the overlap rule is proved with two real connections (AG-4-26: "a live two-connection test, not a
// mock"). Three scratch databases: "empty" gets every migration; "demo" gets every migration before FO-1b's, then
// demo-shaped rows (Sample cases, an audit line, the Sample firms and staff), then FO-1b's migration and any later one;
// "bare" stops before FO-1b. No server, no browser, no model call (US$0). All are dropped at the end.
//   tsx studio/tests/check_fo1b_booking_schema.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { copyFirmHoursTo, seedSampleStaffHours, windowsOf } from "../api/src/front-office/booking-seed.ts";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";
import { BUSINESS_HOURS, writeSetting } from "../api/src/platform/settings.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114120000_fo1b_booking_tables", PF3 = "20261114015002_pf3_platform_tables";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_fo1b_empty_${process.pid}`, DEMO = `xr_studio_fo1b_demo_${process.pid}`, BARE = `xr_studio_fo1b_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `fo1b-check-${process.pid}`);
const FO_TABLES = ["fo_consultation_type", "fo_availability", "fo_time_off", "fo_booking", "fo_booking_token"];

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const throwsLike = async (f: () => unknown, test: (e: unknown) => boolean) => { try { await f(); return false; } catch (e) { return test(e); } };
const client = (db: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), options: "-c TimeZone=UTC" }) });
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const hex = (n: number) => n.toString(16).padStart(64, "0");

// prisma migrate diff from a database to the schema folder: the lines that name an FO-1b table or type.
function foDiff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /fo_|Fo[A-Z]/.test(l));
}
// The non-primary-key indexes (exclusion constraints included) of the listed tables whose first column is not firm_id.
const indexesNotFirmFirst = (db: string, tables: string[]) => sql(db, `select coalesce(string_agg(ic.relname, ',' order by ic.relname), '') from pg_index i
  join pg_class c on c.oid = i.indrelid join pg_class ic on ic.oid = i.indexrelid
  left join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
  where c.relnamespace = 'public'::regnamespace and c.relname = any('{${tables.join(",")}}') and not i.indisprimary and coalesce(a.attname, '') <> 'firm_id'`);
// The date-time columns of the listed tables that are not timestamptz.
const timesWithoutZone = (db: string, tables: string[]) => sql(db, `select coalesce(string_agg(table_name || '.' || column_name, ',' order by 1), '') from information_schema.columns
  where table_schema = 'public' and table_name = any('{${tables.join(",")}}') and data_type in ('timestamp without time zone', 'date', 'time without time zone', 'time with time zone')`);

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
const conns: pg.Client[] = [];
try {
  const newest = all.filter((d) => d < NEW).at(-1) ?? "";
  ok(`FO-1b: the migration has its own stamp, later than every one before it (newest before it: ${newest}; P-348 (8)), and after PF-3's`,
    all.includes(NEW) && newest >= PF3 && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));

  // -------------------------------------------------------------------- migration on empty and demo-data copies (line 1)
  for (const d of all.filter((x) => x < NEW)) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-1b fail: before FO-1b's migration there is no btree_gist and no fo_ table, and the schema differs (diff names fo_booking)",
    sql(BARE, `select count(*) from pg_extension where extname = 'btree_gist'`) === "0" && sql(BARE, `select count(*) from pg_tables where tablename like 'fo\\_%'`) === "0" && foDiff(BARE).some((l) => /fo_booking/.test(l)));
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-1b pass: every migration applies to an empty database; the five tables exist and the migration created btree_gist",
    sql(EMPTY, `select count(*) from pg_tables where schemaname='public' and tablename = any('{${FO_TABLES.join(",")}}')`) === "5" && sql(EMPTY, `select count(*) from pg_extension where extname = 'btree_gist'`) === "1");
  ok("FO-1b pass: migrate diff from the migrated empty database to the schema names no FO-1b table or type", foDiff(EMPTY).length === 0, foDiff(EMPTY));
  ok("FO-1b fail: the migration does not apply twice (it is never re-run silently)", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  // Demo-shaped copy: Sample cases and an audit line (as PF-3's check), the Sample firms and staff (PF-3's seed), then FO-1b.
  for (const d of all.filter((x) => x < NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  const W = u(1), CMB = u(2);
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values
      ('${u(10)}', '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001'), ('${u(12)}', '${W}', '${CMB}', 'user-P', 'user-S', 'sample-solo', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, action, entity, summary) values (gen_random_uuid(), '${W}', 'user-R', 'case.open', 'runtime_case', 'Sample');`);
  const pre = client(DEMO); dbs.push(pre);
  await seedSampleFirms(pre);
  await pre.$disconnect();
  const demoRows = `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select count(*) from platform_firm) || ':' || (select count(*) from platform_staff) || ':' || (select string_agg(id::text, ',' order by id) from platform_staff)`;
  const before = sql(DEMO, demoRows);
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-1b pass: the migration applies to a demo-data copy (cases, audit, the Sample firms and staff) and leaves its rows as they were", sql(DEMO, demoRows) === before, before);
  ok("FO-1b pass: migrate diff after it on the demo-data copy names no FO-1b table or type", foDiff(DEMO).length === 0, foDiff(DEMO));

  const firmA = sql(DEMO, `select id from platform_firm where key='sample-firm'`), firmB = sql(DEMO, `select id from platform_firm where key='sample-solo'`);
  const staffR = sql(DEMO, `select id from platform_staff where actor_id='user-R'`), staffT = sql(DEMO, `select id from platform_staff where actor_id='user-T'`), staffS = sql(DEMO, `select id from platform_staff where actor_id='user-S'`);

  // ------------------------------------------------------------------------------------- consultation types and slugs
  const type = (id: string, firm: string, slug: string, hosts: string[], extra = "") =>
    `insert into fo_consultation_type (id, firm_id, slug, name, modes, host_staff_ids, minutes, updated_at${extra ? ", " + extra.split("=")[0] : ""}) values ('${id}', '${firm}', '${slug}', 'Free consultation', '{VIDEO,PHONE}', '{${hosts.join(",")}}', 30, now()${extra ? ", " + extra.split("=")[1] : ""}) returning id`;
  const TA = u(100), TB = u(101);
  ok("FO-1b pass: a type takes AG-4-66's Sample timings when none are given (gap 0 / 10 min, notice 4 h, window 60 days, self-service 4 h, interval = length)",
    sql(DEMO, type(TA, firmA, "free-consultation", [staffR, staffT])) === TA
    && sql(DEMO, `select gap_before_minutes || '/' || gap_after_minutes || '/' || min_notice_minutes || '/' || window_days || '/' || self_service_limit_minutes || '/' || coalesce(slot_interval_minutes::text, '-') || '/' || purpose from fo_consultation_type where id='${TA}'`) === "0/10/240/60/240/-/FREE_CONSULT");
  ok("FO-1b pass: the same slug in another firm is accepted (slugs are unique in the firm)", sql(DEMO, type(TB, firmB, "free-consultation", [staffS])) === TB);
  ok("FO-1b fail: a second type with the same slug in the same firm is refused", refused(DEMO, type(u(102), firmA, "free-consultation", [staffR]), /fo_consultation_type_firm_id_slug_key/));
  ok("FO-1b fail: a slug that is not lower-case words joined by - (AG-4-9 rule 2) is refused", refused(DEMO, type(u(102), firmA, "Free Consultation", [staffR]), /fo_consultation_type_slug_check/));
  ok("FO-1b fail: a host who is not staff of the type's firm is refused (firm B's person on firm A's type)", refused(DEMO, type(u(102), firmA, "other", [staffS]), /host .* is not a staff member of firm/));
  ok("FO-1b fail: a type with no mode, a mode twice, a length outside 5-480 min or a negative gap is refused",
    refused(DEMO, `insert into fo_consultation_type (id, firm_id, slug, name, modes, host_staff_ids, minutes, updated_at) values ('${u(102)}', '${firmA}', 'x', 'X', '{}', '{}', 30, now())`, /fo_consultation_type_modes_check/)
    && refused(DEMO, `insert into fo_consultation_type (id, firm_id, slug, name, modes, host_staff_ids, minutes, updated_at) values ('${u(102)}', '${firmA}', 'x', 'X', '{VIDEO,VIDEO}', '{}', 30, now())`, /fo_consultation_type_modes_check/)
    && sql(DEMO, type(u(102), firmA, "x", [])) === u(102)
    && refused(DEMO, `update fo_consultation_type set minutes = 600 where id = '${u(102)}'`, /fo_consultation_type_minutes_check/)
    && refused(DEMO, `update fo_consultation_type set gap_after_minutes = -1 where id = '${u(102)}'`, /fo_consultation_type_gaps_check/));
  ok("FO-1b fail (break B-10): a name of only non-breaking or zero-width spaces, or a meeting link with quotes or brackets, is refused",
    refused(DEMO, `update fo_consultation_type set name = E'\\u00a0\\u200b' where id = '${u(102)}'`, /fo_consultation_type_name_check/)
    && refused(DEMO, `update fo_consultation_type set meeting_link = 'https://x.example.com/"><script>' where id = '${u(102)}'`, /fo_consultation_type_link_check/));
  ok("FO-1b pass: a usual meeting link is accepted", sql(DEMO, `update fo_consultation_type set meeting_link = 'https://meet.example.com/abc-defg-hij?pwd=1%2B2' where id = '${u(102)}' returning 1`) === "1");
  ok("FO-1b fail: a type's firm cannot change", refused(DEMO, `update fo_consultation_type set firm_id = '${firmB}', host_staff_ids = '{${staffS}}', slug = 'moved' where id = '${TA}'`, /firm_id never changes/));

  // ----------------------------------------------------------------------------------- bookings: the no-overlap rule
  const book = (id: string, staff: string, from: string, to: string, t = TA, firm = firmA) =>
    `insert into fo_booking (id, firm_id, type_id, staff_id, mode, starts_at, ends_at, visitor_time_zone, updated_at) values ('${id}', '${firm}', '${t}', '${staff}', 'VIDEO', '${from}', '${to}', 'Asia/Dubai', now()) returning id`;
  const D = "2026-12-01";
  const B1 = u(200);
  ok("FO-1b pass: a booking is written SCHEDULED, sequence 0, with block_range = [start − 0, end + 10 min)",
    sql(DEMO, book(B1, staffR, `${D} 14:00Z`, `${D} 14:30Z`)) === B1
    && sql(DEMO, `select status || ':' || sequence || ':' || (lower(block_range) = '${D} 14:00Z'::timestamptz) || ':' || (upper(block_range) = '${D} 14:40Z'::timestamptz) from fo_booking where id='${B1}'`) === "SCHEDULED:0:true:true");

  // Two real connections (AG-4-26): A writes 15:00 for user-R and holds its transaction open; B writes an overlapping
  // 15:15 for user-R and waits on A; A commits; B is refused by the exclusion. Exactly one booking exists.
  const conn = async () => { const c = new pg.Client({ connectionString: urlOf(DEMO) }); await c.connect(); conns.push(c); return c; };
  const race = async (first: string, second: string) => {
    const [a, b] = [await conn(), await conn()];
    await a.query("begin"); await b.query("begin");
    await a.query(first);
    let bWaited = false;
    const bDone = b.query(second).then(() => "committed-ok", (e: { code?: string; constraint?: string }) => `${e.code}:${e.constraint}`);
    await new Promise((r) => setTimeout(r, 300));
    const waiting = await (await conn()).query(`select count(*)::int n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`);
    bWaited = waiting.rows[0].n >= 1;
    await a.query("commit");
    const outcome = await bDone;
    await b.query(outcome === "committed-ok" ? "commit" : "rollback");
    return { bWaited, outcome };
  };
  const r1 = await race(book(u(201), staffR, `${D} 15:00Z`, `${D} 15:30Z`), book(u(202), staffR, `${D} 15:15Z`, `${D} 15:45Z`));
  ok("FO-1b fail (two connections): an overlapping SCHEDULED booking for the same host waits for the first, then is refused (23P01 fo_booking_no_overlap); exactly one exists",
    r1.bWaited && r1.outcome === "23P01:fo_booking_no_overlap" && sql(DEMO, `select count(*) from fo_booking where id in ('${u(201)}','${u(202)}')`) === "1", r1);
  const r2 = await race(book(u(203), staffR, `${D} 16:00Z`, `${D} 16:30Z`), book(u(204), staffR, `${D} 16:40Z`, `${D} 17:10Z`));
  ok("FO-1b pass (two connections): a booking for the same host that does not overlap (after the 10-min gap) commits beside it",
    r2.outcome === "committed-ok" && sql(DEMO, `select count(*) from fo_booking where id in ('${u(203)}','${u(204)}')`) === "2", r2);

  // RESCHEDULED is active too: A moves a booking to 11:00 (status RESCHEDULED) and holds; B books 11:00 and is refused.
  const B5 = u(205);
  sql(DEMO, book(B5, staffT, `${D} 09:00Z`, `${D} 09:30Z`));
  const r3 = await race(`update fo_booking set status = 'RESCHEDULED', starts_at = '${D} 11:00Z', ends_at = '${D} 11:30Z' where id = '${B5}'`, book(u(206), staffT, `${D} 11:00Z`, `${D} 11:30Z`));
  ok("FO-1b fail (two connections): a booking overlapping a RESCHEDULED one of the same host is refused", r3.outcome === "23P01:fo_booking_no_overlap" && sql(DEMO, `select status from fo_booking where id = '${B5}'`) === "RESCHEDULED", r3);
  ok("FO-1b pass: the RESCHEDULED booking's old time is free again (09:00 for user-T is accepted)", sql(DEMO, book(u(207), staffT, `${D} 09:00Z`, `${D} 09:30Z`)) === u(207));
  ok("FO-1b fail: moving a booking onto another active booking of the host is refused", refused(DEMO, `update fo_booking set status = 'RESCHEDULED', starts_at = '${D} 14:10Z', ends_at = '${D} 14:40Z' where id = '${u(204)}'`, /fo_booking_no_overlap/));

  ok("FO-1b fail: before it is cancelled, user-R's 14:00 blocks another 14:00", refused(DEMO, book(u(208), staffR, `${D} 14:00Z`, `${D} 14:30Z`), /fo_booking_no_overlap/));
  sql(DEMO, `update fo_booking set status = 'CANCELLED' where id = '${B1}'`);
  ok("FO-1b pass: once CANCELLED, the same 14:00 for user-R is accepted", sql(DEMO, book(u(208), staffR, `${D} 14:00Z`, `${D} 14:30Z`)) === u(208));
  ok("FO-1b pass: two hosts may be booked at the same time (user-T at user-R's 14:00)", sql(DEMO, book(u(209), staffT, `${D} 14:00Z`, `${D} 14:30Z`)) === u(209));
  ok("FO-1b fail: the same host at the same time is still refused (user-T at 14:00 again)", refused(DEMO, book(u(210), staffT, `${D} 14:00Z`, `${D} 14:30Z`), /fo_booking_no_overlap/));

  // Gaps (AG-4-4 rule 4): gap after 10 min, so a booking ending 09:55 blocks a 10:00 start; 10:05 is free.
  const D2 = "2026-12-02";
  sql(DEMO, book(u(220), staffR, `${D2} 09:25Z`, `${D2} 09:55Z`));
  ok("FO-1b fail: a booking ending 09:55 blocks a 10:00 start for the same host when the gap after is 10 min", refused(DEMO, book(u(221), staffR, `${D2} 10:00Z`, `${D2} 10:30Z`), /fo_booking_no_overlap/));
  ok("FO-1b pass: 10:05 (end + 10 min) is accepted", sql(DEMO, book(u(221), staffR, `${D2} 10:05Z`, `${D2} 10:35Z`)) === u(221));
  const TG = u(103);
  sql(DEMO, type(TG, firmA, "no-gap", [staffR], "gap_after_minutes=0"));
  ok("FO-1b pass: with a type whose gap after is 0, back-to-back bookings touch without overlapping (11:05-11:35, then 11:35-12:05)",
    sql(DEMO, book(u(222), staffR, `${D2} 11:05Z`, `${D2} 11:35Z`, TG)) === u(222) && sql(DEMO, book(u(223), staffR, `${D2} 11:35Z`, `${D2} 12:05Z`, TG)) === u(223));
  ok("FO-1b fail: the gap before pads the start too (gap before 15 on 'no-gap': a 12:15 booking now reaches back over 12:05)",
    sql(DEMO, `update fo_consultation_type set gap_before_minutes = 15 where id = '${TG}' returning gap_before_minutes`) === "15" && refused(DEMO, book(u(224), staffR, `${D2} 12:15Z`, `${D2} 12:45Z`, TG), /fo_booking_no_overlap/));
  ok("FO-1b pass: changing a type's gaps leaves the ranges of bookings already made (AG-4-4 rule 8)", sql(DEMO, `select upper(block_range) = ends_at from fo_booking where id = '${u(223)}'`) === "t");
  ok("FO-1b fail: block_range is the database's — a value written by the app is replaced", sql(DEMO, `update fo_booking set block_range = tstzrange('2030-01-01Z', '2030-01-02Z') where id = '${u(223)}' returning upper(block_range) = ends_at`) === "t");

  // ------------------------------------------------------------------------------------------ status, sequence, firm
  ok("FO-1b fail: a booking cannot be written with a status other than SCHEDULED", refused(DEMO, `insert into fo_booking (id, firm_id, type_id, staff_id, status, mode, starts_at, ends_at, visitor_time_zone, updated_at) values ('${u(230)}', '${firmA}', '${TA}', '${staffR}', 'COMPLETED', 'VIDEO', '${D2} 20:00Z', '${D2} 20:30Z', 'UTC', now())`, /written SCHEDULED/));
  ok("FO-1b fail: a CANCELLED booking stays cancelled (no move back to SCHEDULED or RESCHEDULED)",
    refused(DEMO, `update fo_booking set status = 'SCHEDULED' where id = '${B1}'`, /cannot move from CANCELLED/) && refused(DEMO, `update fo_booking set status = 'RESCHEDULED' where id = '${B1}'`, /cannot move from CANCELLED/));
  ok("FO-1b fail (break B-6): attendance is not recorded before the meeting has started (a December meeting cannot be COMPLETED today)",
    refused(DEMO, `update fo_booking set status = 'COMPLETED' where id = '${u(222)}'`, /recorded once the meeting has started/) && sql(DEMO, `select status from fo_booking where id = '${u(222)}'`) === "SCHEDULED");
  const PAST = u(225);
  sql(DEMO, book(PAST, staffR, "2026-11-02 15:00Z", "2026-11-02 15:30Z"));
  sql(DEMO, `insert into fo_booking_token (id, firm_id, booking_id, token_hash, expires_at) values ('${u(320)}', '${firmA}', '${PAST}', '${hex(320)}', '2026-11-02 15:30Z')`);
  ok("FO-1b pass: the attendance answer of a past meeting can change later, COMPLETED ↔ NO_SHOW, sequence rises each time (AG-4-39), and recording it voids its links",
    sql(DEMO, `update fo_booking set status = 'COMPLETED' where id = '${PAST}' returning sequence`) === "1" && sql(DEMO, `update fo_booking set status = 'NO_SHOW' where id = '${PAST}' returning sequence`) === "2"
    && sql(DEMO, `select count(*) from fo_booking_token where booking_id = '${PAST}' and voided_at is null`) === "0");
  ok("FO-1b fail: a finished booking is not moved or changed (time, mode), and nothing goes back to SCHEDULED",
    refused(DEMO, `update fo_booking set status = 'RESCHEDULED', starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day' where id = '${PAST}'`, /cannot move from NO_SHOW/)
    && refused(DEMO, `update fo_booking set mode = 'PHONE' where id = '${PAST}'`, /a NO_SHOW booking is not moved or changed/)
    && refused(DEMO, `update fo_booking set status = 'SCHEDULED' where id = '${PAST}'`, /cannot move from NO_SHOW/));
  ok("FO-1b fail (break B-5): the host is one of the type's hosts and the mode one of its modes (user-T on 'no-gap', IN_PERSON on a video/phone type)",
    refused(DEMO, book(u(233), staffT, `${D2} 21:00Z`, `${D2} 21:30Z`, TG), /is not a host of consultation type/)
    && refused(DEMO, book(u(233), staffR, `${D2} 21:00Z`, `${D2} 21:30Z`).replace("'VIDEO'", "'IN_PERSON'"), /is not offered by consultation type/)
    && refused(DEMO, `update fo_booking set mode = 'IN_PERSON' where id = '${u(223)}'`, /is not offered by consultation type/));
  ok("FO-1b pass: a phone booking on a video/phone type, by one of its hosts, is accepted", sql(DEMO, book(u(233), staffT, `${D2} 21:00Z`, `${D2} 21:30Z`).replace("'VIDEO'", "'PHONE'")) === u(233));
  ok("FO-1b fail: a change of time that does not say RESCHEDULED is refused", refused(DEMO, `update fo_booking set starts_at = '${D2} 13:00Z', ends_at = '${D2} 13:30Z' where id = '${u(223)}'`, /a change of time is a reschedule/));
  ok("FO-1b pass: sequence is the database's — linking the person does not raise it, a value written by the app is ignored",
    sql(DEMO, `update fo_booking set person_id = '${u(900)}', sequence = 99 where id = '${u(223)}' returning sequence`) === "0");
  ok("FO-1b fail: a booking naming another firm's host or type is refused, and a booking's firm cannot change",
    refused(DEMO, book(u(231), staffS, `${D2} 20:00Z`, `${D2} 20:30Z`), /is not a staff member of firm/)
    && refused(DEMO, book(u(231), staffS, `${D2} 20:00Z`, `${D2} 20:30Z`, TA, firmB), /is not a type of firm/)
    && refused(DEMO, `update fo_booking set firm_id = '${firmB}' where id = '${u(223)}'`, /firm_id never changes/));
  const zoned = (z: string) => `insert into fo_booking (id, firm_id, type_id, staff_id, mode, starts_at, ends_at, visitor_time_zone, updated_at) values ('${u(232)}', '${firmA}', '${TA}', '${staffR}', 'VIDEO', '${D2} 20:00Z', '${D2} 20:30Z', '${z}', now())`;
  ok("FO-1b fail: a visitor zone that is not an IANA name (unknown, POSIX-style America/Toronto5 or Foo/Bar5: break B-4), an end not after the start, an endless or a two-day booking (break B-3) is refused",
    ["Mars/Olympus", "America/Toronto5", "Foo/Bar5", "EST5EDT"].every((z) => refused(DEMO, zoned(z), /not an IANA time zone/))
    && refused(DEMO, book(u(232), staffR, `${D2} 20:30Z`, `${D2} 20:00Z`), /ends after it starts/)
    && refused(DEMO, book(u(232), staffR, "-infinity", "infinity"), /finite times/)
    && refused(DEMO, book(u(232), staffR, `${D2} 20:00Z`, "2026-12-04 20:00Z"), /fo_booking_range_check/));
  const ianaOk = (() => { try { return sql(DEMO, zoned("Etc/GMT+5").replace(u(232), u(234)) + " returning id") === u(234) && sql(DEMO, `update fo_booking set visitor_time_zone = 'America/Argentina/Buenos_Aires' where id = '${u(234)}' returning 1`) === "1"; } catch (e) { return String((e as { stderr?: string }).stderr ?? e); } })();
  ok("FO-1b pass: IANA zones with digits or several parts are accepted (Etc/GMT+5, America/Argentina/Buenos_Aires)", ianaOk === true, ianaOk);

  // ------------------------------------------------------------------------------------------------------- tokens
  const token = (id: string, booking: string, n: number, expires = `(select ends_at from fo_booking where id = '${booking}')`) =>
    `insert into fo_booking_token (id, firm_id, booking_id, token_hash, expires_at) values ('${id}', '${firmA}', '${booking}', '${hex(n)}', ${expires}) returning id`;
  const BK = u(221);
  ok("FO-1b pass: several live tokens per booking (one per email: three are live at once)",
    [1, 2, 3].every((n) => sql(DEMO, token(u(300 + n), BK, n)) === u(300 + n)) && sql(DEMO, `select count(*) from fo_booking_token where booking_id = '${BK}' and voided_at is null`) === "3");
  ok("FO-1b fail: the same hash twice in the firm, a plain (non-hash) token, or an expiry other than the meeting's end is refused",
    refused(DEMO, token(u(310), BK, 1), /fo_booking_token_firm_id_token_hash_key/)
    && refused(DEMO, `insert into fo_booking_token (id, firm_id, booking_id, token_hash, expires_at) values ('${u(310)}', '${firmA}', '${BK}', 'plain-token', now() + interval '1 day')`, /fo_booking_token_hash_check|expires when the meeting ends/)
    && refused(DEMO, token(u(310), BK, 10, `now() + interval '90 days'`), /expires when the meeting ends/));
  ok("FO-1b fail: only voided_at changes on a token, once", refused(DEMO, `update fo_booking_token set token_hash = '${hex(50)}' where id = '${u(301)}'`, /only voided_at changes/)
    && sql(DEMO, `update fo_booking_token set voided_at = now() where id = '${u(301)}' returning (voided_at is not null)`) === "t"
    && refused(DEMO, `update fo_booking_token set voided_at = null where id = '${u(301)}'`, /only voided_at changes/));
  ok("FO-1b fail (break B-7): a token's voided_at is the database's clock (2099 is not kept), and a token is never deleted (its hash stays taken)",
    sql(DEMO, `update fo_booking_token set voided_at = '2099-01-01Z' where id = '${u(302)}' returning voided_at < now() + interval '1 minute'`) === "t"
    && refused(DEMO, `delete from fo_booking_token where id = '${u(301)}'`, /voided, never deleted/) && sql(DEMO, `select count(*) from fo_booking_token where id = '${u(301)}'`) === "1");
  sql(DEMO, `update fo_booking set status = 'RESCHEDULED', starts_at = '${D2} 15:00Z', ends_at = '${D2} 15:30Z' where id = '${BK}'`);
  ok("FO-1b pass: a reschedule voids every older token; a new one for the new end is live (AG-4-36 rule 3)",
    sql(DEMO, `select count(*) from fo_booking_token where booking_id = '${BK}' and voided_at is null`) === "0" && sql(DEMO, token(u(311), BK, 11)) === u(311));
  sql(DEMO, `update fo_booking set status = 'CANCELLED' where id = '${BK}'`);
  ok("FO-1b fail: a cancelled booking's tokens are all voided and it gets no new one",
    sql(DEMO, `select count(*) from fo_booking_token where booking_id = '${BK}' and voided_at is null`) === "0" && refused(DEMO, token(u(312), BK, 12), /a CANCELLED booking gets no self-service link/));

  // Break B-1: a token written while the booking is cancelled at the same time, at any isolation level. A REPEATABLE READ
  // cancel whose snapshot predates the token: it waits for the token's transaction, then fails 40001 (retried), never
  // leaving a CANCELLED booking with a live token. And the other way round: a REPEATABLE READ token after a cancel.
  const tokenRace = async (bookingId: string, n: number, cancelFirst: boolean) => {
    const [a, b] = [await conn(), await conn()];
    const tok = token(u(400 + n), bookingId, n), cancel = `update fo_booking set status = 'CANCELLED' where id = '${bookingId}'`;
    await b.query("begin isolation level repeatable read"); await b.query("select 1 from fo_booking limit 1");   // b's snapshot now
    await a.query("begin"); await a.query(cancelFirst ? cancel : tok);
    const bDone = b.query(cancelFirst ? tok : cancel).then(() => "ok", (e: { code?: string }) => String(e.code));
    await new Promise((r) => setTimeout(r, 300));
    await a.query("commit");
    const outcome = await bDone;
    await b.query(outcome === "ok" ? "commit" : "rollback");
    return { outcome, liveOnCancelled: sql(DEMO, `select count(*) from fo_booking_token k join fo_booking b on b.id = k.booking_id where b.status = 'CANCELLED' and k.voided_at is null`) };
  };
  const BR1 = u(240), BR2 = u(241);
  sql(DEMO, book(BR1, staffT, "2026-12-03 09:00Z", "2026-12-03 09:30Z")); sql(DEMO, book(BR2, staffT, "2026-12-03 10:00Z", "2026-12-03 10:30Z"));
  const t1 = await tokenRace(BR1, 41, false), t2 = await tokenRace(BR2, 42, true);
  ok("FO-1b fail (two connections, break B-1): a REPEATABLE READ cancel racing a token write fails 40001 instead of leaving a live token on a cancelled booking",
    t1.outcome === "40001" && t1.liveOnCancelled === "0" && sql(DEMO, `select status from fo_booking where id = '${BR1}'`) === "SCHEDULED", t1);
  ok("FO-1b fail (two connections, break B-1): a REPEATABLE READ token write racing a cancel fails 40001; no live token on a cancelled booking",
    t2.outcome === "40001" && t2.liveOnCancelled === "0" && sql(DEMO, `select status from fo_booking where id = '${BR2}'`) === "CANCELLED", t2);
  ok("FO-1b pass: after the race, the cancel retried voids the token written meanwhile",
    sql(DEMO, `update fo_booking set status = 'CANCELLED' where id = '${BR1}' returning 1`) === "1" && sql(DEMO, `select count(*) from fo_booking_token where booking_id = '${BR1}' and voided_at is null`) === "0");

  // ---------------------------------------------------------------- times timestamptz; firm_id first in every index
  ok("FO-1b pass: every date-time column of the five tables is timestamptz", timesWithoutZone(DEMO, FO_TABLES) === "", timesWithoutZone(DEMO, FO_TABLES));
  sql(DEMO, `create table fo_probe (firm_id uuid, at timestamp, staff_id uuid); create index fo_probe_staff on fo_probe (staff_id)`);
  ok("FO-1b fail: the same checks name a timestamp without zone and an index not led by firm_id (a probe table)",
    timesWithoutZone(DEMO, ["fo_probe"]) === "fo_probe.at" && indexesNotFirmFirst(DEMO, ["fo_probe"]) === "fo_probe_staff");
  sql(DEMO, `drop table fo_probe`);
  ok("FO-1b pass: firm_id is the first column of every index of the five tables but their primary keys (exclusions included)", indexesNotFirmFirst(DEMO, FO_TABLES) === "", indexesNotFirmFirst(DEMO, FO_TABLES));

  // -------------------------------------------------------------------------------- staff hours, time off, the seed
  const db = client(DEMO); dbs.push(db);
  const seeded = await seedSampleStaffHours(db);
  ok("FO-1b pass: the seed copies the firm's business hours (Sample Mon-Fri 09:00-17:00, America/Toronto) to every Sample staff member",
    seeded["sample-firm"] === 15 && seeded["sample-solo"] === 5
    && sql(DEMO, `select string_agg(distinct weekday || ':' || start_minute || '-' || end_minute || ':' || time_zone, ',') from fo_availability where staff_id = '${staffR}'`) === "1:540-1020:America/Toronto,2:540-1020:America/Toronto,3:540-1020:America/Toronto,4:540-1020:America/Toronto,5:540-1020:America/Toronto", seeded);
  const again = await seedSampleStaffHours(db);
  ok("FO-1b pass: the seed run twice adds nothing", again["sample-firm"] === 0 && again["sample-solo"] === 0 && sql(DEMO, `select count(*) from fo_availability`) === "20", again);
  sql(DEMO, `delete from fo_availability where staff_id = '${staffT}' and weekday = 5`);
  await seedSampleStaffHours(db);
  ok("FO-1b fail: a person's own change is kept (user-T's Friday removed stays removed)", sql(DEMO, `select count(*) from fo_availability where staff_id = '${staffT}'`) === "4");
  const newStaff = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'new@sample-firm.example.com', 'New person', now()) returning id`);
  await writeSetting(db, { firmId: firmA, key: BUSINESS_HOURS.key, value: [{ day: "SAT", opens: "10:00", closes: "12:00" }, { day: "MON", opens: "08:30", closes: "16:00" }], by: "user-R", workspaceId: W });
  ok("FO-1b pass: a new staff member gets the firm's current business hours (Mon 08:30-16:00, Sat 10:00-12:00)",
    await copyFirmHoursTo(db, firmA, [newStaff]) === 2 && sql(DEMO, `select string_agg(weekday || ':' || start_minute || '-' || end_minute, ',' order by weekday) from fo_availability where staff_id = '${newStaff}'`) === "1:510-960,6:600-720");
  ok("FO-1b fail: copying hours to another firm's person is refused and writes nothing",
    await throwsLike(() => copyFirmHoursTo(db, firmA, [staffS]), (e) => /not staff of firm/.test(String(e))) && sql(DEMO, `select count(*) from fo_availability where staff_id = '${staffS}'`) === "5");
  ok("FO-1b: windowsOf maps SUN to 0 and SAT to 6 (AG-4-62 rule 3)", JSON.stringify(windowsOf([{ day: "SAT", opens: "09:00", closes: "10:00" }, { day: "SUN", opens: "09:00", closes: "10:00" }]).map((w) => w.weekday)) === "[0,6]");
  const avail = (staff: string, wd: number, from: number, to: number, zone = "America/Toronto", firm = firmA) =>
    `insert into fo_availability (id, firm_id, staff_id, weekday, start_minute, end_minute, time_zone) values (gen_random_uuid(), '${firm}', '${staff}', ${wd}, ${from}, ${to}, '${zone}') returning weekday`;
  ok("FO-1b pass: a second window on a day that does not overlap is accepted (Mon 17:00-18:00 beside 08:30-16:00)", sql(DEMO, avail(newStaff, 1, 1020, 1080)) === "1");
  ok("FO-1b fail: overlapping windows on a day, end before start, weekday 7, another zone for the same person, a bad zone, or another firm's person are refused",
    refused(DEMO, avail(newStaff, 1, 900, 1000), /fo_availability_no_overlap/) && refused(DEMO, avail(newStaff, 2, 840, 780), /fo_availability_minutes_check/)
    && refused(DEMO, avail(newStaff, 7, 60, 120), /fo_availability_weekday_check/) && refused(DEMO, avail(newStaff, 3, 60, 120, "Asia/Kolkata"), /fo_availability_one_zone/)
    && refused(DEMO, avail(newStaff, 3, 60, 120, "america/toronto"), /not an IANA time zone/) && refused(DEMO, avail(staffS, 3, 60, 120, "America/Toronto", firmA), /is not a staff member of firm/));
  ok("FO-1b pass: time off is a range of instants (whole or part days) for a staff member of the firm",
    sql(DEMO, `insert into fo_time_off (id, firm_id, staff_id, starts_at, ends_at, created_by) values (gen_random_uuid(), '${firmA}', '${staffT}', '${D} 17:00Z', '${D} 22:00Z', 'user-R') returning 1`) === "1");
  ok("FO-1b fail: time off ending before it starts, or for another firm's person, is refused",
    refused(DEMO, `insert into fo_time_off (id, firm_id, staff_id, starts_at, ends_at, created_by) values (gen_random_uuid(), '${firmA}', '${staffT}', '${D} 22:00Z', '${D} 17:00Z', 'user-R')`, /fo_time_off_range_check/)
    && refused(DEMO, `insert into fo_time_off (id, firm_id, staff_id, starts_at, ends_at, created_by) values (gen_random_uuid(), '${firmA}', '${staffS}', '${D} 17:00Z', '${D} 22:00Z', 'user-R')`, /is not a staff member of firm/)
    && refused(DEMO, `insert into fo_time_off (id, firm_id, staff_id, starts_at, ends_at, created_by) values (gen_random_uuid(), '${firmA}', '${staffT}', '${D} 17:00Z', 'infinity', 'user-R')`, /fo_time_off_range_check/)
    && refused(DEMO, `insert into fo_time_off (id, firm_id, staff_id, starts_at, ends_at, created_by) values (gen_random_uuid(), '${firmA}', '${staffT}', '${D} 17:00Z', '${D} 22:00Z', ' ')`, /fo_time_off_created_by_check/));

  // Break B-2: the delete side of the references to platform rows.
  const lone = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'lone@sample-firm.example.com', 'Lone', now()) returning id`);
  ok("FO-1b pass: a staff member no front-office row names can still be deleted", sql(DEMO, `delete from platform_staff where id = '${lone}' returning 1`) === "1");
  ok("FO-1b fail (break B-2): a staff member with hours, or named only as a type's host, cannot be deleted or change id; the booking rows keep their person",
    refused(DEMO, `delete from platform_staff where id = '${newStaff}'`, /still named by front-office booking rows/)
    && refused(DEMO, `update platform_staff set id = gen_random_uuid() where id = '${newStaff}'`, /still named by front-office booking rows/)
    && (() => { const h = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'host@sample-firm.example.com', 'Host', now()) returning id`);
      sql(DEMO, `update fo_consultation_type set host_staff_ids = host_staff_ids || '${h}'::uuid where id = '${u(102)}'`);
      return refused(DEMO, `delete from platform_staff where id = '${h}'`, /still named by front-office booking rows/); })());
  const firmE = sql(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-e', 'E', 'CA', 'e@firm-e.example.com', now()) returning id`);
  ok("FO-1b pass: a firm with no front-office row can still be deleted (as before FO-1b)", sql(DEMO, `delete from platform_firm where id = '${firmE}' returning 1`) === "1");
  const firmF = sql(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-f', 'F', 'CA', 'f@firm-f.example.com', now()) returning id`);
  sql(DEMO, type(u(104), firmF, "free-consultation", []));
  ok("FO-1b fail (break B-2): a firm with a consultation type cannot be deleted or change id",
    refused(DEMO, `delete from platform_firm where id = '${firmF}'`, /still has front-office booking rows/) && refused(DEMO, `update platform_firm set id = gen_random_uuid() where id = '${firmF}'`, /still has front-office booking rows/));
  ok("FO-1b pass: time off leaves the bookings in it (AG-4-62 rule 7: user-T's 14:00 on that day is still SCHEDULED)", sql(DEMO, `select status from fo_booking where id = '${u(209)}'`) === "SCHEDULED");
  ok("FO-1b: no secret column — no FO-1b column is named like a password, secret or raw token",
    sql(DEMO, `select count(*) from information_schema.columns where table_name = any('{${FO_TABLES.join(",")}}') and column_name ~ '(password|secret|^token$|api_key)'`) === "0");
} finally {
  for (const c of conns) await c.end().catch(() => undefined);
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
