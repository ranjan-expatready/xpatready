// PF-19a (rows rev 14/16, P-584 (1), P-600; contracts §9; AG-10-22 to -27, AG-2-83, SA-11-29): the platform's messages
// tables and the consent store. Every line of the row's "Done when" and the brief's tests, each with a passing and a failing
// case: the migration on empty and demo-data copies with migrate diff empty; wording, template versions and delivery events
// write-once; a withdrawal set once and never cleared; the gate (allows) for every class, suppression and withdrawal;
// firm_id first in every index; firm A never reads firm B's consent or names B's wording; a forced audit failure rolls a
// record back. Three scratch databases: "empty" gets every migration; "demo" gets every migration before PF-19a's, then
// demo-shaped rows (Sample cases, an audit line, the Sample firms and staff), then PF-19a's and any later one; "bare"
// stops before PF-19a. No server, no browser, no model call, no mail (US$0). All are dropped at the end.
//   tsx studio/tests/check_pf19a_messages_schema.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ConsentStore } from "../api/src/platform/messages/consent/consent-store.ts";
import { auditEvent } from "../api/src/platform/audit/audit-event.ts";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";
import { AuditFailure, fakeAudit } from "../ports/audit.ts";
import { FakeClock } from "../ports/clock.ts";
import { ConsentRefused, fakeConsent, normaliseAddress, sha256Hex, type ConsentPort, type ConsentRecordInput } from "../ports/consent.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114190000_pf19a_platform_messages";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_pf19a_empty_${process.pid}`, DEMO = `xr_studio_pf19a_demo_${process.pid}`, BARE = `xr_studio_pf19a_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `pf19a-check-${process.pid}`);
const MSG_TABLES = ["msg_firm", "msg_consent_wording", "msg_consent", "msg_consent_withdrawal", "msg_suppression", "msg_template", "msg_template_version", "msg_outbox", "msg_event", "msg_send_counter"];

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const refusedCode = (db: string, q: string, code: string, re: RegExp) => { try { psql(db, ["-v", "VERBOSITY=verbose", "-Atc", q]); return false; } catch (e) { const err = String((e as { stderr?: string }).stderr ?? e); return err.includes(`ERROR:  ${code}:`) && re.test(err); } };
const throwsLike = async (f: () => unknown, test: (e: unknown) => boolean) => { try { await f(); return false; } catch (e) { return test(e); } };
const client = (db: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), options: "-c TimeZone=UTC" }) });
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const hex = (n: number) => n.toString(16).padStart(64, "0");

// prisma migrate diff from a database to the schema folder: the lines that name a PF-19a table or type.
function msgDiff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /msg_|Msg[A-Z]/.test(l));
}
// The non-primary-key indexes of the listed tables whose first column is not firm_id, other than the two partial indexes
// over the platform's own templates (rows with no firm: WHERE firm_id IS NULL).
const indexesNotFirmFirst = (db: string, tables: string[]) => sql(db, `select coalesce(string_agg(ic.relname, ',' order by ic.relname), '') from pg_index i
  join pg_class c on c.oid = i.indrelid join pg_class ic on ic.oid = i.indexrelid
  left join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
  where c.relnamespace = 'public'::regnamespace and c.relname = any('{${tables.join(",")}}') and not i.indisprimary and coalesce(a.attname, '') <> 'firm_id'
    and coalesce(pg_get_expr(i.indpred, i.indrelid), '') <> '(firm_id IS NULL)'`);
const platformOnlyIndexes = (db: string) => sql(db, `select coalesce(string_agg(ic.relname, ',' order by ic.relname), '') from pg_index i join pg_class c on c.oid = i.indrelid join pg_class ic on ic.oid = i.indexrelid
  where c.relname like 'msg\\_%' and pg_get_expr(i.indpred, i.indrelid) = '(firm_id IS NULL)'`);
const timesWithoutZone = (db: string, tables: string[]) => sql(db, `select coalesce(string_agg(table_name || '.' || column_name, ',' order by 1), '') from information_schema.columns
  where table_schema = 'public' and table_name = any('{${tables.join(",")}}') and data_type in ('timestamp without time zone', 'time without time zone', 'time with time zone', 'date')`);

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
try {
  const before = all.filter((d) => d < NEW);
  ok(`PF-19a: the migration has its own stamp, later than every one before it (newest before it: ${before.at(-1)}; P-348 (8), P-600 (4))`,
    all.includes(NEW) && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));
  const migSql = readFileSync(join(MIG, NEW, "migration.sql"), "utf8");
  const fns = [...migSql.matchAll(/CREATE (?:OR REPLACE )?FUNCTION\s+"?([a-z0-9_]+)/gi)].map((m) => m[1]), trg = [...migSql.matchAll(/CREATE TRIGGER\s+"?([a-z0-9_]+)/gi)].map((m) => m[1]);
  ok(`PF-19a (P-600 (3), rows rev 15.2): every function and trigger the migration creates is prefixed msg_ (${fns.length} functions, ${trg.length} triggers)`,
    fns.length >= 5 && trg.length >= 8 && [...fns, ...trg].every((n) => n.startsWith("msg_")), [...fns, ...trg].filter((n) => !n.startsWith("msg_")));
  ok("PF-19a (P-600 (2)): the migration alters or drops no table that is not msg_ (additive on its own tables)",
    ![...migSql.matchAll(/(?:ALTER|DROP)\s+TABLE\s+"?([a-z0-9_]+)/gi)].some((m) => !m[1].startsWith("msg_")) && !/DROP\s+(TYPE|FUNCTION|INDEX)/i.test(migSql));

  // ---------------------------------------------------------------------------- migration on empty and demo-data copies
  for (const d of before) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-19a fail: before its migration there is no msg_ table and the schema differs (diff names msg_consent)",
    sql(BARE, `select count(*) from pg_tables where tablename like 'msg\\_%'`) === "0" && msgDiff(BARE).some((l) => /msg_consent/.test(l)));
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-19a pass: every migration applies to an empty database; the ten msg_ tables exist",
    sql(EMPTY, `select count(*) from pg_tables where schemaname='public' and tablename = any('{${MSG_TABLES.join(",")}}')`) === "10");
  ok("PF-19a pass: migrate diff from the migrated empty database to the schema names no msg_ table or type", msgDiff(EMPTY).length === 0, msgDiff(EMPTY));
  ok("PF-19a fail: the migration does not apply twice (it is never re-run silently)", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  for (const d of before) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  const W = u(1), CMB = u(2);
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values
      ('${u(10)}', '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001'), ('${u(12)}', '${W}', '${CMB}', 'user-P', 'user-S', 'sample-solo', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, action, entity, summary) values (gen_random_uuid(), '${W}', 'user-R', 'case.open', 'runtime_case', 'Sample');`);
  const pre = client(DEMO); dbs.push(pre);
  await seedSampleFirms(pre);
  await pre.$disconnect();
  const demoRows = `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select count(*) from platform_firm) || ':' || (select count(*) from platform_staff) || ':' || (select string_agg(id::text, ',' order by id) from platform_firm)`;
  const was = sql(DEMO, demoRows);
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-19a pass: the migration applies to a demo-data copy (cases, audit, the Sample firms and staff) and leaves its rows as they were", sql(DEMO, demoRows) === was, was);
  ok("PF-19a pass: migrate diff after it on the demo-data copy names no msg_ table or type", msgDiff(DEMO).length === 0, msgDiff(DEMO));
  ok("PF-19a: no msg_ row exists until the messages code writes one (the migration writes no data)", sql(DEMO, MSG_TABLES.map((t) => `(select count(*) from ${t})`).join(" + ").replace(/^/, "select ")) === "0");

  // -------------------------------------------------------------------------------------------- shape: indexes, times
  ok("PF-19a pass: firm_id is first in every msg_ index (primary keys aside) but the platform's own template indexes", indexesNotFirmFirst(DEMO, MSG_TABLES) === "", indexesNotFirmFirst(DEMO, MSG_TABLES));
  ok("PF-19a: the only msg_ indexes not led by firm_id are the two partial ones over rows with no firm (the platform's templates)",
    platformOnlyIndexes(DEMO) === "msg_template_platform_key,msg_template_version_platform_version", platformOnlyIndexes(DEMO));
  sql(DEMO, `create index msg_probe_bad on msg_consent (subject_id)`);
  ok("PF-19a fail: the index check catches an index not led by firm_id (a probe index on msg_consent(subject_id))", indexesNotFirmFirst(DEMO, MSG_TABLES) === "msg_probe_bad");
  sql(DEMO, `drop index msg_probe_bad`);
  ok("PF-19a pass: every msg_ time is timestamptz (the send counter's day is a date, the one non-time)", timesWithoutZone(DEMO, MSG_TABLES) === "msg_send_counter.day", timesWithoutZone(DEMO, MSG_TABLES));

  const db = client(DEMO); dbs.push(db);
  const firmA = sql(DEMO, `select id from platform_firm where key='sample-firm'`), firmB = sql(DEMO, `select id from platform_firm where key='sample-solo'`);
  const staffR = sql(DEMO, `select id from platform_staff where actor_id='user-R'`);
  const byR = `staff:${staffR}`;
  const clock = new FakeClock("2026-11-24T14:00:00.000Z");
  const store = new ConsentStore(auditEvent, clock); // the real interim audit adapter (PF-0p), a fake clock
  const tx = <T>(f: (t: Parameters<ConsentPort["record"]>[0]) => Promise<T>) => db.$transaction((t) => f(t as never));

  // ------------------------------------------------------------------------------------------- consent wording (SA-11-29)
  const text1 = "Yes, email me news and offers from Sample Firm. I can unsubscribe at any time.";
  const w1 = await tx((t) => store.publishWording(t as never, { firmId: firmA, channel: "EMAIL", purpose: "MARKETING", locale: "en", text: text1, by: byR }));
  const w2 = await tx((t) => store.publishWording(t as never, { firmId: firmA, channel: "EMAIL", purpose: "MARKETING", locale: "en", text: text1 + " Updated.", by: byR }));
  ok("PF-19a pass: publishWording gives version 1 then 2 for a firm, channel, purpose and language, with the SHA-256 of the text",
    w1.version === 1 && w2.version === 2 && w1.textHash === (await sha256Hex(text1)) && sql(DEMO, `select text_hash = encode(sha256(convert_to(text, 'UTF8')), 'hex') from msg_consent_wording where id = '${w1.id}'`) === "t");
  ok("PF-19a pass: publishing wrote one audit line per version through AuditPort (audit_event, the platform's audit workspace; no wording text in it)",
    sql(DEMO, `select count(*) from audit_event where action = 'consent.wording.published' and entity_key in ('${w1.id}', '${w2.id}') and detail->>'firmId' = '${firmA}' and detail::text not like '%unsubscribe%'`) === "2");
  ok("PF-19a fail: a consent wording version refuses edit (its text) and delete",
    refused(DEMO, `update msg_consent_wording set text = 'Changed' where id = '${w1.id}'`, /msg_consent_wording is write-once: UPDATE refused/)
    && refused(DEMO, `delete from msg_consent_wording where id = '${w1.id}'`, /msg_consent_wording is write-once: DELETE refused/)
    && refused(DEMO, `truncate msg_consent_wording cascade`, /write-once: TRUNCATE refused/)
    && sql(DEMO, `select text from msg_consent_wording where id = '${w1.id}'`) === text1);
  ok("PF-19a fail: a wording whose hash is not its text's, a second version 1, or a SERVICE wording for email is refused",
    refused(DEMO, `insert into msg_consent_wording (id, firm_id, channel, purpose, locale, version, text, text_hash, published_by) values (gen_random_uuid(), '${firmA}', 'EMAIL', 'MARKETING', 'fr', 1, 'Oui', '${hex(1)}', '${byR}')`, /msg_consent_wording_hash_check/)
    && refused(DEMO, `insert into msg_consent_wording (id, firm_id, channel, purpose, locale, version, text, text_hash, published_by) values (gen_random_uuid(), '${firmA}', 'EMAIL', 'MARKETING', 'en', 1, 'X', encode(sha256('X'), 'hex'), '${byR}')`, /msg_consent_wording_firm_id_channel_purpose_locale_version_key/)
    && await throwsLike(() => tx((t) => store.publishWording(t as never, { firmId: firmA, channel: "EMAIL", purpose: "SERVICE", locale: "en", text: "X", by: byR })), (e) => /service email needs no consent/.test(String(e))));
  const wB = await tx((t) => store.publishWording(t as never, { firmId: firmB, channel: "EMAIL", purpose: "MARKETING", locale: "en", text: "Yes, email me news from Sample Solo.", by: "seed:PF-19a" }));
  const wWa = await tx((t) => store.publishWording(t as never, { firmId: firmA, channel: "WHATSAPP", purpose: "SERVICE", locale: "en", text: "Reply YES to get updates about your file on WhatsApp.", by: byR }));
  ok("PF-19a pass: versions count per firm (firm B's first wording is version 1) and the WhatsApp opt-in is its own key", wB.version === 1 && wWa.version === 1);

  // ------------------------------------------------------------------------------------- record (AG-2-83) and its walls
  const P1 = { kind: "FO_PERSON" as const, id: u(501) }, P2 = { kind: "FO_PERSON" as const, id: u(502) };
  const webTick = (subject = P1, wordingId = w2.id, extra: Partial<ConsentRecordInput> = {}): ConsentRecordInput => ({
    firmId: firmA, subject, channel: "EMAIL", purpose: "MARKETING", wordingId, source: "WEB_FORM", sourceRef: u(900), locale: "en",
    ipHash: hex(7), recordedKind: "SELF_SERVICE", recordedBy: "system:web-form", ...extra });
  const c1 = await tx((t) => store.record(t as never, webTick()));
  ok("PF-19a pass: record writes the consent with its evidence (source, reference, wording, language, recorder system:web-form) and one audit line",
    sql(DEMO, `select source || ':' || wording_id || ':' || locale || ':' || recorded_kind || ':' || recorded_by || ':' || (withdrawn_at is null) from msg_consent where id = '${c1.id}'`) === `WEB_FORM:${w2.id}:en:SELF_SERVICE:system:web-form:true`
    && sql(DEMO, `select count(*) from audit_event where action = 'consent.recorded' and entity_key = '${c1.id}' and actor = 'system:web-form'`) === "1");
  ok("PF-19a fail: a consent naming firm B's wording is refused by the store (and by the composite key underneath: 23503)",
    await throwsLike(() => tx((t) => store.record(t as never, webTick(P1, wB.id))), (e) => /not this firm's EMAIL MARKETING wording/.test(String(e)))
    && refusedCode(DEMO, `insert into msg_consent (id, firm_id, subject_kind, subject_id, channel, purpose, wording_id, basis, source, recorded_kind, recorded_by, given_at) values (gen_random_uuid(), '${firmA}', 'FO_PERSON', '${u(501)}', 'EMAIL', 'MARKETING', '${wB.id}', 'EXPRESS', 'WEB_FORM', 'SELF_SERVICE', 'system:web-form', now())`, "23503", /msg_consent_firm_id_wording_id_channel_purpose_fkey/));
  ok("PF-19a fail: a consent naming the firm's own wording of another channel or purpose is refused (23503: the WhatsApp opt-in wording on an email marketing consent)",
    refusedCode(DEMO, `insert into msg_consent (id, firm_id, subject_kind, subject_id, channel, purpose, wording_id, basis, source, recorded_kind, recorded_by, given_at) values (gen_random_uuid(), '${firmA}', 'FO_PERSON', '${u(501)}', 'EMAIL', 'MARKETING', '${wWa.id}', 'EXPRESS', 'WEB_FORM', 'SELF_SERVICE', 'system:web-form', now())`, "23503", /msg_consent_firm_id_wording_id_channel_purpose_fkey/));
  ok("PF-19a fail: a consent without a wording (not an import), an ip hash off the web form, or a recorder that is not staff:/system:/seed: is refused",
    await throwsLike(() => tx((t) => store.record(t as never, webTick(P1, w2.id, { wordingId: undefined }))), (e) => /names the wording/.test(String(e)))
    && refused(DEMO, `insert into msg_consent (id, firm_id, subject_kind, subject_id, channel, purpose, basis, source, recorded_kind, recorded_by, given_at) values (gen_random_uuid(), '${firmA}', 'FO_PERSON', '${u(501)}', 'EMAIL', 'MARKETING', 'EXPRESS', 'WEB_FORM', 'SELF_SERVICE', 'system:web-form', now())`, /msg_consent_wording_check/)
    && refused(DEMO, `insert into msg_consent (id, firm_id, subject_kind, subject_id, channel, purpose, wording_id, basis, source, ip_hash, recorded_kind, recorded_by, given_at) values (gen_random_uuid(), '${firmA}', 'FO_PERSON', '${u(501)}', 'EMAIL', 'MARKETING', '${w2.id}', 'EXPRESS', 'API', '${hex(1)}', 'SELF_SERVICE', 'system:api', now())`, /msg_consent_ip_hash_check/)
    && refused(DEMO, `insert into msg_consent (id, firm_id, subject_kind, subject_id, channel, purpose, wording_id, basis, source, recorded_kind, recorded_by, given_at) values (gen_random_uuid(), '${firmA}', 'FO_PERSON', '${u(501)}', 'EMAIL', 'MARKETING', '${w2.id}', 'EXPRESS', 'WEB_FORM', 'SELF_SERVICE', 'Lena Park', now())`, /msg_consent_by_check/));
  const imp = await tx((t) => store.record(t as never, { firmId: firmA, subject: { kind: "FO_PERSON", id: u(503) }, channel: "EMAIL", purpose: "MARKETING", basis: "IMPORT_DECLARED", source: "IMPORT_DECLARED", evidenceRef: "batch-7", recordedKind: "USER", recordedBy: byR }));
  ok("PF-19a pass: an importer's declaration is recorded without a wording (AG-2-83 rule 5)", sql(DEMO, `select basis || ':' || (wording_id is null) from msg_consent where id = '${imp.id}'`) === "IMPORT_DECLARED:true");
  const firmC = sql(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-c', 'C', 'CA', 'c@firm-c.example.com', now()) returning id`);
  ok("PF-19a pass: the first write for a firm makes its msg_firm row (firm C had none); a firm id that is no firm is refused (P2003)",
    sql(DEMO, `select count(*) from msg_firm where firm_id = '${firmC}'`) === "0"
    && (await tx((t) => store.publishWording(t as never, { firmId: firmC, channel: "EMAIL", purpose: "MARKETING", locale: "fr-CA", text: "Oui", by: "seed:PF-19a" }))).version === 1
    && sql(DEMO, `select count(*) from msg_firm where firm_id = '${firmC}'`) === "1"
    && await throwsLike(() => tx((t) => store.publishWording(t as never, { firmId: u(999), channel: "EMAIL", purpose: "MARKETING", locale: "en", text: "X", by: "seed:PF-19a" })), (e) => /msg_firm_firm_id_fkey|Foreign key/i.test(String(e))));
  ok("PF-19a fail (RESTRICT): a firm with messages rows cannot be deleted", refusedCode(DEMO, `delete from platform_firm where id = '${firmC}'`, "23001", /msg_firm_firm_id_fkey/));

  // ---------------------------------------------------------------------- forced audit failure rolls a record back (brief)
  const failing = new ConsentStore(fakeAudit({ failOn: (e) => e.action === "consent.recorded" }), clock);
  const n0 = sql(DEMO, `select count(*) from msg_consent`);
  ok("PF-19a fail: a forced audit failure rolls the record back (AuditFailure thrown, no consent row written)",
    await throwsLike(() => tx((t) => failing.record(t as never, webTick(P2))), (e) => e instanceof AuditFailure) && sql(DEMO, `select count(*) from msg_consent`) === n0);
  const failWording = new ConsentStore(fakeAudit({ failOn: (e) => e.action === "consent.wording.published" }), clock);
  ok("PF-19a fail: a forced audit failure rolls a wording publish back (no version 3)",
    await throwsLike(() => tx((t) => failWording.publishWording(t as never, { firmId: firmA, channel: "EMAIL", purpose: "MARKETING", locale: "en", text: "V3", by: byR })), (e) => e instanceof AuditFailure)
    && sql(DEMO, `select max(version) from msg_consent_wording where firm_id = '${firmA}' and channel = 'EMAIL' and purpose = 'MARKETING' and locale = 'en'`) === "2");
  const passing = new ConsentStore(fakeAudit(), clock);
  ok("PF-19a pass: the same record with a working audit is written", typeof (await tx((t) => passing.record(t as never, webTick(P2)))).id === "string");

  // ------------------------------------------------------------------------------------------------------ the gate
  const mail = (subject: typeof P1 | undefined, cls: "TRANSACTIONAL" | "SERVICE" | "MARKETING", address = "lena.park@example.com", channel: "EMAIL" | "WHATSAPP" = "EMAIL") =>
    store.allows(db as never, { firmId: firmA, subject, channel, address, class: cls });
  const P3 = { kind: "FO_PERSON" as const, id: u(504) };
  ok("PF-19a fail: allows for marketing without a consent row → false (NO_CONSENT)", (await mail(P3, "MARKETING")).reason === "NO_CONSENT" && !(await mail(P3, "MARKETING")).allowed);
  ok("PF-19a pass: allows for a transactional class without any consent → true (TRANSACTIONAL); service email → true (SERVICE_EMAIL)",
    (await mail(P3, "TRANSACTIONAL")).allowed && (await mail(undefined, "TRANSACTIONAL")).reason === "TRANSACTIONAL" && (await mail(P3, "SERVICE")).reason === "SERVICE_EMAIL");
  const d1 = await mail(P1, "MARKETING");
  ok("PF-19a pass: allows for marketing with a live consent → true, naming the consent that allows it (AG-10-27)", d1.allowed && d1.reason === "CONSENT" && d1.consentId === c1.id);
  ok("PF-19a fail: a WhatsApp service message without the opt-in → false; marketing email consent never counts for WhatsApp (channel only, AG-2-83 rule 2)",
    !(await mail(P1, "SERVICE", "+1 (416) 555-0100", "WHATSAPP")).allowed && (await mail(P1, "MARKETING", "+14165550100", "WHATSAPP")).reason === "NO_CONSENT");
  ok("PF-19a fail (review m3): a transactional WhatsApp message without the opt-in → false (every business-initiated WhatsApp message needs it); transactional email needs none",
    (await mail(P1, "TRANSACTIONAL", "+14165550100", "WHATSAPP")).reason === "NO_CONSENT" && (await mail(P1, "TRANSACTIONAL")).allowed);
  await tx((t) => store.record(t as never, { firmId: firmA, subject: P1, channel: "WHATSAPP", purpose: "SERVICE", wordingId: wWa.id, source: "WHATSAPP_OPT_IN_REPLY", recordedKind: "SELF_SERVICE", recordedBy: "system:whatsapp", jurisdiction: "CA" }));
  ok("PF-19a pass: after the opt-in reply, a WhatsApp service message is allowed; WhatsApp marketing still is not (the opt-in is never marketing)",
    (await mail(P1, "SERVICE", "+14165550100", "WHATSAPP")).allowed && !(await mail(P1, "MARKETING", "+14165550100", "WHATSAPP")).allowed);

  // Withdrawal: at once, set once, never cleared.
  await clock.advance({ minutes: 5 });
  const wd = await tx((t) => store.withdraw(t as never, { firmId: firmA, subject: P1, channel: "EMAIL", purpose: "MARKETING", via: "UNSUBSCRIBE", by: "system:unsubscribe" }));
  const d2 = await mail(P1, "MARKETING");
  ok("PF-19a fail: a withdrawn consent makes allows false at once (WITHDRAWN); the withdrawal is its own row and its audit line names the consent it ended",
    wd.withdrawn === 1 && !d2.allowed && d2.reason === "WITHDRAWN"
    && sql(DEMO, `select via || ':' || withdrawn_by from msg_consent_withdrawal where id = '${wd.withdrawalId}'`) === "UNSUBSCRIBE:system:unsubscribe"
    && sql(DEMO, `select count(*) from audit_event where action = 'consent.withdrawn' and entity_key = '${wd.withdrawalId}' and detail->'consentIds' ? '${c1.id}'`) === "1");
  ok("PF-19a fail: a withdrawal row refuses update, delete and truncate",
    refused(DEMO, `update msg_consent_withdrawal set via = 'STAFF' where id = '${wd.withdrawalId}'`, /msg_consent_withdrawal is write-once: UPDATE refused/)
    && refused(DEMO, `delete from msg_consent_withdrawal where id = '${wd.withdrawalId}'`, /msg_consent_withdrawal is write-once: DELETE refused/)
    && refused(DEMO, `truncate msg_consent_withdrawal`, /write-once: TRUNCATE refused/));
  ok("PF-19a pass: the withdrawal leaves the person's other consents (the WhatsApp opt-in) and transactional mail as they were",
    (await mail(P1, "SERVICE", "+14165550100", "WHATSAPP")).allowed && (await mail(P1, "TRANSACTIONAL")).allowed);
  ok("PF-19a fail: a withdrawn_at is never cleared, changed again, or set with any other column; a consent is never deleted",
    refused(DEMO, `update msg_consent set withdrawn_at = null, withdrawn_by = null, withdrawn_via = null where id = '${c1.id}'`, /a withdrawn consent never changes/)
    && refused(DEMO, `update msg_consent set withdrawn_at = now() where id = '${c1.id}'`, /a withdrawn consent never changes/)
    && refused(DEMO, `update msg_consent set source = 'API', withdrawn_at = now(), withdrawn_by = 'staff:x', withdrawn_via = 'STAFF' where id = '${imp.id}'`, /only the withdrawal is ever set/)
    && refused(DEMO, `update msg_consent set locale = 'fr' where id = '${imp.id}'`, /only the withdrawal is ever set/)
    && refused(DEMO, `delete from msg_consent where id = '${imp.id}'`, /msg_consent is evidence: DELETE refused/)
    && refused(DEMO, `truncate msg_consent cascade`, /msg_consent is evidence: TRUNCATE refused/));
  ok("PF-19a pass: setting the withdrawal once on a live consent is accepted (the one change a consent takes)",
    sql(DEMO, `update msg_consent set withdrawn_at = given_at + interval '1 minute', withdrawn_by = '${byR}', withdrawn_via = 'STAFF' where id = '${imp.id}' returning 1`) === "1");
  ok("PF-19a fail: a withdrawal before the consent was given, or without who and how, is refused (check)",
    refused(DEMO, `update msg_consent set withdrawn_at = given_at - interval '1 day', withdrawn_by = '${byR}', withdrawn_via = 'STAFF' where id = '${c1.id}'`, /a withdrawn consent never changes|msg_consent_withdrawal_check/)
    && refused(DEMO, `insert into msg_consent (id, firm_id, subject_kind, subject_id, channel, purpose, wording_id, basis, source, recorded_kind, recorded_by, given_at, withdrawn_at) values (gen_random_uuid(), '${firmA}', 'FO_PERSON', '${u(505)}', 'EMAIL', 'MARKETING', '${w2.id}', 'EXPRESS', 'WEB_FORM', 'SELF_SERVICE', 'system:web-form', now(), now())`, /msg_consent_withdrawal_check/)
    && refused(DEMO, `update msg_consent set withdrawn_at = given_at - interval '1 second', withdrawn_by = '${byR}', withdrawn_via = 'STAFF' where id = '${c1.id}'`, /a withdrawn consent never changes/));
  const copy = await tx((t) => store.record(t as never, { ...webTick(P1), recordedKind: "SYSTEM", recordedBy: "system:link", copiedFromId: c1.id, ipHash: undefined, source: "WEB_FORM" }));
  ok("PF-19a fail (break 1): a Link copy of the withdrawn consent onto the same person keeps the original's time and its withdrawal: still WITHDRAWN",
    !!copy.id && (await mail(P1, "MARKETING")).reason === "WITHDRAWN"
    && sql(DEMO, `select (c.given_at = o.given_at) || ':' || (c.withdrawn_at is not null) from msg_consent c join msg_consent o on o.id = c.copied_from_id where c.id = '${copy.id}'`) === "true:true");
  ok("PF-19a fail (break 14): a copy that changes channel, purpose, wording or time is refused",
    await throwsLike(() => tx((t) => store.record(t as never, { firmId: firmA, subject: P1, channel: "WHATSAPP", purpose: "SERVICE", wordingId: wWa.id, source: "WEB_FORM", recordedKind: "SYSTEM", recordedBy: "system:link", copiedFromId: c1.id })), (e) => /keeps the original's channel and purpose/.test(String(e)))
    && await throwsLike(() => tx((t) => store.record(t as never, { ...webTick(P1, w1.id), recordedKind: "SYSTEM", recordedBy: "system:link", copiedFromId: c1.id, ipHash: undefined })), (e) => /keeps the original's wording/.test(String(e)))
    && await throwsLike(() => tx((t) => store.record(t as never, { ...webTick(P1), recordedKind: "SYSTEM", recordedBy: "system:link", copiedFromId: c1.id, ipHash: undefined, givenAt: new Date("2026-11-24T13:00:00Z") })), (e) => /keeps the original's time/.test(String(e))));
  // Review M1: a Merge copy of a withdrawn consent onto another person (now, after the withdrawal) is written withdrawn.
  const P4 = { kind: "FO_PERSON" as const, id: u(506) };
  const merged = await tx((t) => store.record(t as never, { ...webTick(P4), recordedKind: "SYSTEM", recordedBy: "system:merge", copiedFromId: c1.id, ipHash: undefined }));
  ok("PF-19a fail (review M1): a Merge copy of a withdrawn consent is written withdrawn (who and how copied) and never makes the target allowed",
    sql(DEMO, `select (withdrawn_at is not null) || ':' || withdrawn_via || ':' || withdrawn_by from msg_consent where id = '${merged.id}'`) === "true:UNSUBSCRIBE:system:unsubscribe"
    && (await mail(P4, "MARKETING")).reason === "WITHDRAWN");
  // Review M2: an unsubscribe with no live consent is still kept, audited and blocks an older grant copied in later.
  const P5 = { kind: "FO_PERSON" as const, id: u(507) }, P6 = { kind: "FO_PERSON" as const, id: u(508) };
  const g6 = await tx((t) => store.record(t as never, webTick(P6)));
  await clock.advance({ minutes: 1 });
  const w5 = await tx((t) => store.withdraw(t as never, { firmId: firmA, subject: P5, channel: "EMAIL", purpose: "MARKETING", via: "UNSUBSCRIBE", by: "system:unsubscribe" }));
  ok("PF-19a fail (review M2): an unsubscribe by a person with no consent writes a withdrawal row and an audit line (AG-10-24)",
    w5.withdrawn === 0 && sql(DEMO, `select count(*) from msg_consent_withdrawal where id = '${w5.withdrawalId}'`) === "1"
    && sql(DEMO, `select count(*) from audit_event where action = 'consent.withdrawn' and entity_key = '${w5.withdrawalId}'`) === "1"
    && (await mail(P5, "MARKETING")).reason === "WITHDRAWN");
  const g6At = (await db.msgConsent.findUniqueOrThrow({ where: { id: g6.id } })).givenAt;
  await tx((t) => store.record(t as never, { ...webTick(P5), recordedKind: "SYSTEM", recordedBy: "system:link", copiedFromId: g6.id, ipHash: undefined, givenAt: g6At }));
  ok("PF-19a fail (review M2): a Link copy of an older live grant, after that unsubscribe, leaves the person WITHDRAWN", (await mail(P5, "MARKETING")).reason === "WITHDRAWN");
  // Review m1: a withdrawal processed late (its click time is in the past) never ends a consent given after it.
  const P7 = { kind: "FO_PERSON" as const, id: u(509) };
  const g7 = await tx((t) => store.record(t as never, webTick(P7)));
  const late = await tx((t) => store.withdraw(t as never, { firmId: firmA, subject: P7, channel: "EMAIL", purpose: "MARKETING", via: "UNSUBSCRIBE", by: "system:unsubscribe", at: new Date(clock.now().getTime() - 3_600_000) }));
  ok("PF-19a pass (review m1): a late-processed withdrawal from an hour ago leaves a consent given since live", late.withdrawn === 0 && (await mail(P7, "MARKETING")).consentId === g7.id);
  ok("PF-19a fail (review m2): a consent given, or a withdrawal made, more than five minutes in the future is refused",
    await throwsLike(() => tx((t) => store.record(t as never, webTick(P7, w2.id, { givenAt: new Date(clock.now().getTime() + 3_600_000) }))), (e) => e instanceof ConsentRefused && /in the future/.test(String(e)))
    && await throwsLike(() => tx((t) => store.withdraw(t as never, { firmId: firmA, subject: P7, channel: "EMAIL", purpose: "MARKETING", via: "STAFF", by: byR, at: new Date(clock.now().getTime() + 3_600_000) })), (e) => e instanceof ConsentRefused));
  ok("PF-19a fail (break 8-10): a bare client in place of the transaction, a time that is not a time (true, 0, year 1500, infinity), a NUL character, or an invisible-only wording is refused cleanly",
    await throwsLike(() => store.record(db as never, webTick(P7)), (e) => /pass the caller's transaction/.test(String(e)))
    && (await Promise.all([true, 0, null, new Date("1500-01-01T00:00:00Z")].map((g) => throwsLike(() => tx((t) => store.record(t as never, webTick(P7, w2.id, { givenAt: g as never }))), (e) => /ZodError|a time/.test(String(e)) || (e as { name?: string }).name === "ZodError")))).every(Boolean)
    && refused(DEMO, `insert into msg_consent (id, firm_id, subject_kind, subject_id, channel, purpose, wording_id, basis, source, recorded_kind, recorded_by, given_at) values (gen_random_uuid(), '${firmA}', 'FO_PERSON', '${u(510)}', 'EMAIL', 'MARKETING', '${w2.id}', 'EXPRESS', 'WEB_FORM', 'SELF_SERVICE', 'system:web-form', 'infinity')`, /msg_consent_times_check/)
    && await throwsLike(() => tx((t) => store.record(t as never, webTick(P7, w2.id, { sourceRef: "a\u0000b" }))), (e) => /no NUL character/.test(String(e)))
    && await throwsLike(() => tx((t) => store.publishWording(t as never, { firmId: firmA, channel: "EMAIL", purpose: "MARKETING", locale: "en", text: "\u200b\u200b", by: byR })), (e) => /visible words|too_small/.test(String(e))));
  ok("PF-19a pass/fail (review m5): a consent keeps its jurisdiction (CA); one that is not a country code is refused",
    sql(DEMO, `select count(*) from msg_consent where jurisdiction = 'CA' and channel = 'WHATSAPP'`) === "1"
    && refused(DEMO, `update msg_consent set jurisdiction = 'Canada' where id = '${g7.id}'`, /only the withdrawal is ever set|msg_consent_jurisdiction_check/)
    && refused(DEMO, `insert into msg_consent (id, firm_id, subject_kind, subject_id, channel, purpose, wording_id, basis, source, recorded_kind, recorded_by, given_at, jurisdiction) values (gen_random_uuid(), '${firmA}', 'FO_PERSON', '${u(510)}', 'EMAIL', 'MARKETING', '${w2.id}', 'EXPRESS', 'WEB_FORM', 'SELF_SERVICE', 'system:web-form', now(), 'Canada')`, /msg_consent_jurisdiction_check/));
  await clock.advance({ minutes: 5 });
  const again = await tx((t) => store.record(t as never, webTick(P1)));
  const d3 = await mail(P1, "MARKETING");
  ok("PF-19a pass: giving consent again (a new row after the withdrawal) makes allows true, naming the new row", d3.allowed && d3.reason === "CONSENT" && d3.consentId === again.id);

  // Suppression: stops every class.
  const s1 = await tx((t) => store.suppress(t as never, { firmId: firmA, channel: "EMAIL", address: "  Lena.Park@Example.com ", reason: "HARD_BOUNCE", by: "system:ses" }));
  const s2 = await tx((t) => store.suppress(t as never, { firmId: firmA, channel: "EMAIL", address: "lena.park@example.com", reason: "COMPLAINT", by: "system:ses" }));
  const allClasses = await Promise.all((["TRANSACTIONAL", "SERVICE", "MARKETING"] as const).map((c) => mail(P1, c, "LENA.PARK@example.com")));
  ok("PF-19a fail: a suppressed address → false for every class, transactional included (SUPPRESSED, HARD_BOUNCE)",
    allClasses.every((d) => !d.allowed && d.reason === "SUPPRESSED" && d.suppression === "HARD_BOUNCE"), allClasses);
  ok("PF-19a pass: the address is kept once in lower case (a second suppression changes nothing) and the audit line carries no address",
    s1.created && !s2.created && sql(DEMO, `select address || ':' || reason from msg_suppression where firm_id = '${firmA}'`) === "lena.park@example.com:HARD_BOUNCE"
    && sql(DEMO, `select count(*) from audit_event where action = 'message.address.suppressed' and detail::text not like '%@%' and summary not like '%@%'`) === "1");
  ok("PF-19a pass: the same person at another address is still reachable for transactional mail; firm B's copy of the address is not suppressed",
    (await mail(P1, "TRANSACTIONAL", "lena@work.example.com")).allowed
    && (await store.allows(db as never, { firmId: firmB, channel: "EMAIL", address: "lena.park@example.com", class: "TRANSACTIONAL" })).allowed);
  ok("PF-19a fail: an address not in its kept form is refused by the database (upper case email; a WhatsApp number not in E.164)",
    refused(DEMO, `insert into msg_suppression (id, firm_id, channel, address, reason, created_by) values (gen_random_uuid(), '${firmA}', 'EMAIL', 'A@B.example.com', 'STAFF', '${byR}')`, /msg_suppression_address_check/)
    && refused(DEMO, `insert into msg_suppression (id, firm_id, channel, address, reason, created_by) values (gen_random_uuid(), '${firmA}', 'WHATSAPP', '416-555-0100', 'STOP', '${byR}')`, /msg_suppression_address_check/)
    && normaliseAddress("WHATSAPP", "+1 416.555 (0100)") === "+14165550100");
  ok("PF-19a fail (break 5): a suppressed email cannot come back as <…>, with a trailing dot, or with a zero-width space; the database refuses those forms",
    (await Promise.all(["<lena.park@example.com>", "lena.park@example.com.", "lena.park@example.com\u200b", " LENA.park@EXAMPLE.com "].map((a) => mail(P1, "TRANSACTIONAL", a)))).every((d) => d.reason === "SUPPRESSED")
    && refused(DEMO, `insert into msg_suppression (id, firm_id, channel, address, reason, created_by) values (gen_random_uuid(), '${firmA}', 'EMAIL', 'x@example.com.', 'STAFF', '${byR}')`, /msg_suppression_address_check/));
  await tx((t) => store.suppress(t as never, { firmId: firmA, channel: "WHATSAPP", address: "+44 7700 900123", reason: "STOP", by: "system:whatsapp" }));
  ok("PF-19a fail (break 4): a STOPped UK number cannot come back with its trunk (0): +44 (0)7700 900123 is suppressed too",
    (await mail(P1, "TRANSACTIONAL", "+44 (0)7700 900123", "WHATSAPP")).reason === "SUPPRESSED" && normaliseAddress("WHATSAPP", "+44 (0)7700 900123") === "+447700900123");

  // --------------------------------------------------------------------------------- firm A never reads firm B's consent
  const cB = await tx((t) => store.record(t as never, { firmId: firmB, subject: P3, channel: "EMAIL", purpose: "MARKETING", wordingId: wB.id, source: "STAFF_RECORDED", recordedKind: "USER", recordedBy: "staff:solo-owner" }));
  ok("PF-19a fail: firm A never reads firm B's consent (the same person id has consent in B; A's gate says NO_CONSENT, B's says CONSENT)",
    (await mail(P3, "MARKETING", "x@example.com")).reason === "NO_CONSENT"
    && (await store.allows(db as never, { firmId: firmB, subject: P3, channel: "EMAIL", address: "x@example.com", class: "MARKETING" })).consentId === cB.id);
  ok("PF-19a fail: firm A cannot withdraw firm B's consent (withdraw in A changes nothing in B) nor copy it (refused)",
    (await tx((t) => store.withdraw(t as never, { firmId: firmA, subject: P3, channel: "EMAIL", purpose: "MARKETING", via: "STAFF", by: byR }))).withdrawn === 0
    && sql(DEMO, `select withdrawn_at is null from msg_consent where id = '${cB.id}'`) === "t"
    && await throwsLike(() => tx((t) => store.record(t as never, { ...webTick(P3), recordedKind: "SYSTEM", recordedBy: "system:link", copiedFromId: cB.id, ipHash: undefined })), (e) => /not in this firm/.test(String(e))));
  ok("PF-19a fail: a malformed firm id is refused before any query (firmScope)",
    await throwsLike(() => store.allows(db as never, { firmId: "sample-firm", channel: "EMAIL", address: "a@b.example.com", class: "TRANSACTIONAL" }), (e) => /firm id/.test(String(e))));

  // ---------------------------------------------------------------- templates, outbox and delivery events (schema rules)
  const tP = sql(DEMO, `insert into msg_template (id, firm_id, owner, key, kind, channel, language, updated_at) values (gen_random_uuid(), null, 'PLATFORM', 'staff.invitation', 'NOTICE', 'EMAIL', 'en', now()) returning id`);
  const tA = sql(DEMO, `insert into msg_template (id, firm_id, owner, key, kind, channel, language, updated_at) values (gen_random_uuid(), '${firmA}', 'FIRM', 'enquiry.thanks', 'SERVICE', 'EMAIL', 'en', now()) returning id`);
  ok("PF-19a pass: a PLATFORM template has no firm, a FIRM template has one", !!tP && !!tA);
  ok("PF-19a fail: a PLATFORM template with a firm, a FIRM template without one, or a second platform template with the same key is refused",
    refused(DEMO, `insert into msg_template (id, firm_id, owner, key, kind, channel, language, updated_at) values (gen_random_uuid(), '${firmA}', 'PLATFORM', 'x', 'NOTICE', 'EMAIL', 'en', now())`, /msg_template_owner_check/)
    && refused(DEMO, `insert into msg_template (id, firm_id, owner, key, kind, channel, language, updated_at) values (gen_random_uuid(), null, 'FIRM', 'x', 'NOTICE', 'EMAIL', 'en', now())`, /msg_template_owner_check/)
    && refused(DEMO, `insert into msg_template (id, firm_id, owner, key, kind, channel, language, updated_at) values (gen_random_uuid(), null, 'PLATFORM', 'staff.invitation', 'NOTICE', 'EMAIL', 'en', now())`, /msg_template_platform_key/)
    && refused(DEMO, `update msg_template set firm_id = '${firmB}' where id = '${tA}'`, /owner, firm_id and channel never change/));
  const vP = sql(DEMO, `insert into msg_template_version (id, firm_id, template_id, version, subject, body, must_keep, published_by) values (gen_random_uuid(), null, '${tP}', 1, 'You are invited', 'Hello {{name}}', '{name}', 'seed:PF-19a') returning id`);
  const vA = sql(DEMO, `insert into msg_template_version (id, firm_id, template_id, version, body, published_by) values (gen_random_uuid(), '${firmA}', '${tA}', 1, 'Thanks for your enquiry.', '${byR}') returning id`);
  ok("PF-19a fail: template versions refuse edit and delete; a version in another firm than its template's, or a second platform version 1, is refused",
    !!vP && !!vA
    && refused(DEMO, `update msg_template_version set body = 'Changed' where id = '${vA}'`, /msg_template_version is write-once: UPDATE refused/)
    && refused(DEMO, `delete from msg_template_version where id = '${vP}'`, /msg_template_version is write-once: DELETE refused/)
    && refused(DEMO, `insert into msg_template_version (id, firm_id, template_id, version, body, published_by) values (gen_random_uuid(), '${firmB}', '${tA}', 2, 'X', '${byR}')`, /is not its template's firm/)
    && refused(DEMO, `insert into msg_template_version (id, firm_id, template_id, version, body, published_by) values (gen_random_uuid(), null, '${tP}', 1, 'X', 'seed:PF-19a')`, /msg_template_version_platform_version/));
  const ob = (firm: string, version: string | null, extra = "") => `insert into msg_outbox (id, firm_id, channel, address, template_version_id, rendered_hash, class, updated_at${extra ? ", consent_id" : ""}) values (gen_random_uuid(), '${firm}', 'EMAIL', 'lena@work.example.com', ${version ? `'${version}'` : "null"}, '${hex(3)}', 'MARKETING', now()${extra ? `, '${extra}'` : ""}) returning id`;
  const o1 = sql(DEMO, ob(firmA, vA, again.id)), o2 = sql(DEMO, ob(firmB, vP));
  ok("PF-19a pass: an outbox row names its own firm's version or the platform's, and the consent that allowed it (state QUEUED)",
    !!o1 && !!o2 && sql(DEMO, `select state from msg_outbox where id = '${o1}'`) === "QUEUED");
  ok("PF-19a fail: an outbox row naming firm A's template version from firm B, or firm B naming firm A's consent, is refused",
    refused(DEMO, ob(firmB, vA), /is not the platform's or firm/) && refusedCode(DEMO, ob(firmB, null, again.id), "23503", /msg_outbox_firm_id_consent_id_fkey/));
  const e1 = sql(DEMO, `insert into msg_event (id, firm_id, outbox_id, kind, provider_event_id, occurred_at, detail) values (gen_random_uuid(), '${firmA}', '${o1}', 'DELIVERED', 'ses-1', now(), '{"code": 250}') returning id`);
  ok("PF-19a pass: a delivery event is written for its outbox row", !!e1);
  ok("PF-19a fail: delivery events refuse update, delete and truncate; an event of firm B on firm A's outbox row is refused (23503)",
    refused(DEMO, `update msg_event set kind = 'BOUNCED' where id = '${e1}'`, /msg_event is write-once: UPDATE refused/)
    && refused(DEMO, `delete from msg_event where id = '${e1}'`, /msg_event is write-once: DELETE refused/)
    && refused(DEMO, `truncate msg_event`, /msg_event is write-once: TRUNCATE refused/)
    && refusedCode(DEMO, `insert into msg_event (id, firm_id, outbox_id, kind, occurred_at) values (gen_random_uuid(), '${firmB}', '${o1}', 'BOUNCED', now())`, "23503", /msg_event_firm_id_outbox_id_fkey/));
  ok("PF-19a pass/fail: the send counter keeps one row per firm and day and never goes below zero",
    sql(DEMO, `insert into msg_send_counter (firm_id, day, sent, updated_at) values ('${firmA}', '2026-11-24', 1, now()) returning sent`) === "1"
    && refused(DEMO, `insert into msg_send_counter (firm_id, day, sent, updated_at) values ('${firmA}', '2026-11-24', 1, now())`, /msg_send_counter_pkey/)
    && refused(DEMO, `update msg_send_counter set sent = -1 where firm_id = '${firmA}'`, /msg_send_counter_sent_check/));

  // ------------------------------------------------------------------- the fake decides as the store does (ports/consent.ts)
  const fk = fakeConsent({ now: () => clock.now() });
  const fw = await fk.publishWording(null, { firmId: firmA, channel: "EMAIL", purpose: "MARKETING", locale: "en", text: text1, by: byR });
  const fwB = await fk.publishWording(null, { firmId: firmB, channel: "EMAIL", purpose: "MARKETING", locale: "en", text: text1, by: byR });
  const fc = await fk.record(null, webTick(P1, fw.id));
  const fq = (cls: "TRANSACTIONAL" | "MARKETING", firm = firmA) => fk.allows(null, { firmId: firm, subject: P1, channel: "EMAIL", address: "lena.park@example.com", class: cls });
  const seq = [(await fq("MARKETING")).reason, (await fq("MARKETING", firmB)).reason];
  await clock.advance({ minutes: 1 });
  await fk.withdraw(null, { firmId: firmA, subject: P1, channel: "EMAIL", purpose: "MARKETING", via: "STOP", by: "system:whatsapp" });
  seq.push((await fq("MARKETING")).reason, (await fq("TRANSACTIONAL")).reason);
  await fk.suppress(null, { firmId: firmA, channel: "EMAIL", address: "Lena.Park@example.com", reason: "HARD_BOUNCE", by: "system:ses" });
  seq.push((await fq("TRANSACTIONAL")).reason);
  const P8 = { kind: "FO_PERSON" as const, id: u(511) };
  await fk.withdraw(null, { firmId: firmA, subject: P8, channel: "EMAIL", purpose: "MARKETING", via: "UNSUBSCRIBE", by: "system:unsubscribe" });
  await fk.record(null, { ...webTick(P8, fw.id), recordedKind: "SYSTEM", recordedBy: "system:merge", copiedFromId: fc.id, ipHash: undefined });
  seq.push((await fk.allows(null, { firmId: firmA, subject: P8, channel: "EMAIL", address: "p8@example.com", class: "MARKETING" })).reason);
  ok("PF-19a pass: fakeConsent gives the store's answers in the same story (CONSENT, other firm NO_CONSENT, WITHDRAWN, TRANSACTIONAL, SUPPRESSED, a merge copy after an unsubscribe WITHDRAWN); its wording hash is the database's",
    JSON.stringify(seq) === JSON.stringify(["CONSENT", "NO_CONSENT", "WITHDRAWN", "TRANSACTIONAL", "SUPPRESSED", "WITHDRAWN"]) && fw.textHash === w1.textHash && !!fc.id, seq);
  ok("PF-19a fail: fakeConsent refuses another firm's wording, as the store does",
    await throwsLike(() => fk.record(null, webTick(P2, fwB.id)), (e) => /not this firm's/.test(String(e))));
  ok("PF-19a: no secret column — no msg_ column is named like a password, secret, token or key",
    sql(DEMO, `select count(*) from information_schema.columns where table_name = any('{${MSG_TABLES.join(",")}}') and column_name ~ '(password|secret|token|api_key)'`) === "0");
} finally {
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
