// FO-5 (P-558, P-559, P-576, P-600; BACKLOG row FO-5 rows rev 6.2, 9, 10 part 2; contracts §2.3, §7; concept
// fo-5s-retainer-signing r2 BR-1..BR-11; AG-5-3, -9, -34, -39, -47, -50, -64, -65): retainer agreements. Part 1, the
// schema step: the four tables and every database rule of the migration, each with a passing and a failing case. Two
// scratch databases: "empty" gets every migration; "demo" gets every migration before FO-5's, then demo-shaped rows (a
// Sample case, an audit line, the Sample firms and staff), then FO-5's migration and any later one. No server, no
// browser, no model call (US$0). Both are dropped at the end.
//   tsx studio/tests/check_fo5_retainers.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114210000_fo5_retainer_tables";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_fo5_empty_${process.pid}`, DEMO = `xr_studio_fo5_demo_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `fo5-check-${process.pid}`);
const TABLES = ["fo_retainer_template", "fo_retainer", "fo_retainer_version", "fo_retainer_fee_row"];

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { const m = String((e as { stderr?: string }).stderr ?? e); if (!re.test(m)) console.log(`      (refused, but not as expected: ${m.trim().slice(0, 300)})`); return re.test(m); } };
const client = (db: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), options: "-c TimeZone=UTC" }) });
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const hex = (n: number) => n.toString(16).padStart(64, "0");

// prisma migrate diff from a database to the schema folder: the lines that name an FO-5 table or type.
function foDiff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /fo_retainer|FoRetainer/.test(l));
}
const indexesNotFirmFirst = (db: string) => sql(db, `select coalesce(string_agg(ic.relname, ',' order by ic.relname), '') from pg_index i
  join pg_class c on c.oid = i.indrelid join pg_class ic on ic.oid = i.indexrelid
  left join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
  where c.relnamespace = 'public'::regnamespace and c.relname = any('{${TABLES.join(",")}}') and not i.indisprimary and coalesce(a.attname, '') <> 'firm_id'`);

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
try {
  // ------------------------------------------------------------------------------------------- the migration (P-600)
  const newest = all.filter((d) => d < NEW).at(-1) ?? "";
  ok(`FO-5: the migration has its own stamp, later than every one before it (newest before it: ${newest}; P-600 (4))`,
    all.includes(NEW) && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1 && newest < NEW, all.slice(-3));
  ok("FO-5: every database function of the migration carries the fo_retainer_ prefix (rows rev 15.2)",
    [...readFileSync(join(MIG, NEW, "migration.sql"), "utf8").matchAll(/CREATE FUNCTION (\w+)/g)].every((m) => m[1].startsWith("fo_retainer_")));
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-5 pass: every migration applies to an empty database and makes the four tables",
    sql(EMPTY, `select count(*) from pg_tables where schemaname='public' and tablename = any('{${TABLES.join(",")}}')`) === "4");
  ok("FO-5 pass: migrate diff from the migrated empty database to the schema names no FO-5 table or type", foDiff(EMPTY).length === 0, foDiff(EMPTY));
  ok("FO-5 pass: every index but a primary key starts with firm_id (contracts §0.2)", indexesNotFirmFirst(EMPTY) === "", indexesNotFirmFirst(EMPTY));
  ok("FO-5 fail: the migration does not apply twice", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  for (const d of all.filter((x) => x < NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-5 fail: before FO-5's migration there is no fo_retainer table and the schema differs", sql(DEMO, `select count(*) from pg_tables where tablename like 'fo\\_retainer%'`) === "0" && foDiff(DEMO).length > 0);
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values ('${u(10)}', '${u(1)}', '${u(2)}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, action, entity, summary) values (gen_random_uuid(), '${u(1)}', 'user-R', 'case.open', 'runtime_case', 'Sample');`);
  const pre = client(DEMO);
  await seedSampleFirms(pre);
  await pre.$disconnect();
  const demoRows = `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select count(*) from platform_firm) || ':' || (select count(*) from platform_staff)`;
  const before = sql(DEMO, demoRows);
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-5 pass: the migration applies to a demo-data copy (a case, an audit line, the Sample firms and staff) and leaves its rows as they were", sql(DEMO, demoRows) === before, before);
  ok("FO-5 pass: migrate diff after it on the demo-data copy names no FO-5 table or type", foDiff(DEMO).length === 0, foDiff(DEMO));

  const firmA = sql(DEMO, `select id from platform_firm where key='sample-firm'`), firmB = sql(DEMO, `select id from platform_firm where key='sample-solo'`);
  const staffR = sql(DEMO, `select id from platform_staff where actor_id='user-R'`), staffS = sql(DEMO, `select id from platform_staff where actor_id='user-S'`);

  // ------------------------------------------------------------------------------------------------------ templates
  const KEY = (t: string, n: number) => `retainer-templates/${t}/v${n}.docx`;
  const tpl = (id: string, firm: string, name: string, kind = "RETAINER", ph = "{client.name,fees}") =>
    `insert into fo_retainer_template (id, firm_id, name, kind, file_key, file_sha256, placeholders, created_by, updated_by, updated_at) values ('${id}', '${firm}', '${name}', '${kind}', '${KEY(id, 1)}', '${hex(1)}', '${ph}', 'seed:FO-5', 'seed:FO-5', now()) returning version`;
  const TA = u(100), TC = u(101), TB = u(102);
  ok("FO-5 pass: a template is written at version 1, active, kind RETAINER by default", sql(DEMO, tpl(TA, firmA, "Standard retainer")) === "1" && sql(DEMO, `select active || ':' || kind from fo_retainer_template where id='${TA}'`) === "true:RETAINER");
  ok("FO-5 pass: a CONSULTATION template, and the same name in another firm, are accepted", sql(DEMO, tpl(TC, firmA, "Consultation agreement", "CONSULTATION")) === "1" && sql(DEMO, tpl(TB, firmB, "Standard retainer")) === "1");
  ok("FO-5 fail: the same template name twice in a firm is refused", refused(DEMO, tpl(u(103), firmA, "Standard retainer"), /fo_retainer_template_firm_id_name_key/));
  ok("FO-5 fail: a blank or padded name, a bad sha256, a key with .. or upper case, a placeholder that is not a dotted lower-case name or is listed twice, are refused",
    refused(DEMO, tpl(u(103), firmA, " "), /fo_retainer_template_name_check/)
    && refused(DEMO, tpl(u(103), firmA, " Padded"), /fo_retainer_template_name_check/)
    && refused(DEMO, `insert into fo_retainer_template (id, firm_id, name, file_key, file_sha256, placeholders, created_by, updated_by, updated_at) values ('${u(103)}', '${firmA}', 'X', 'a/b.docx', 'ABC', '{}', 's', 's', now())`, /fo_retainer_template_file_sha256_check/)
    && refused(DEMO, `insert into fo_retainer_template (id, firm_id, name, file_key, file_sha256, placeholders, created_by, updated_by, updated_at) values ('${u(103)}', '${firmA}', 'X', 'a/../b.docx', '${hex(1)}', '{}', 's', 's', now())`, /fo_retainer_template_file_key_check/)
    && refused(DEMO, `insert into fo_retainer_template (id, firm_id, name, file_key, file_sha256, placeholders, created_by, updated_by, updated_at) values ('${u(103)}', '${firmA}', 'X', 'A/b.docx', '${hex(1)}', '{}', 's', 's', now())`, /fo_retainer_template_file_key_check/)
    && refused(DEMO, tpl(u(103), firmA, "X", "RETAINER", "{Client.Passport}"), /fo_retainer_template_placeholders_check/)
    && refused(DEMO, tpl(u(103), firmA, "X", "RETAINER", "{fees,fees}"), /fo_retainer_template_placeholders_check/));
  ok("FO-5 fail: a template is not written at version 3", refused(DEMO, tpl(u(103), firmA, "Y").replace("(id, firm_id,", "(version, id, firm_id,").replace(`values ('${u(103)}'`, `values (3, '${u(103)}'`), /starts at version 1/));
  ok("FO-5 pass: a new file makes version 2 under its own key (BR-1)",
    sql(DEMO, `update fo_retainer_template set version = 2, file_key = '${KEY(TA, 2)}', file_sha256 = '${hex(2)}', placeholders = '{client.name,fees,representative.name}' where id = '${TA}' returning version`) === "2");
  ok("FO-5 fail: the file changes without a new version, the version jumps or goes back, a new version reuses the key, the kind or the firm changes",
    refused(DEMO, `update fo_retainer_template set file_sha256 = '${hex(3)}' where id = '${TA}'`, /a new file makes version 3/)
    && refused(DEMO, `update fo_retainer_template set version = 4, file_key = '${KEY(TA, 4)}' where id = '${TA}'`, /version moves from 2 to 3, not 4/)
    && refused(DEMO, `update fo_retainer_template set version = 1 where id = '${TA}'`, /version moves from 2 to 3, not 1/)
    && refused(DEMO, `update fo_retainer_template set version = 3 where id = '${TA}'`, /needs its own file key/)
    && refused(DEMO, `update fo_retainer_template set kind = 'CONSULTATION' where id = '${TA}'`, /kind, created_by and created_at never change/)
    && refused(DEMO, `update fo_retainer_template set firm_id = '${firmB}' where id = '${TA}'`, /firm_id never changes/));
  ok("FO-5 pass: a template can be switched off and on, and renamed", sql(DEMO, `update fo_retainer_template set active = false, name = 'Standard retainer 2026' where id = '${TA}' returning 1`) === "1" && sql(DEMO, `update fo_retainer_template set active = true where id = '${TA}' returning 1`) === "1");

  // ------------------------------------------------------------------------------------------------------ retainers
  const P1 = u(300), P2 = u(301), P3 = u(302), PERSON = u(310), CO = u(320);
  const ret = (id: string, o: { firm?: string; prospect?: string | null; t?: string; tv?: number; kind?: string; staff?: string; subject?: string; company?: string | null; status?: string } = {}) =>
    `insert into fo_retainer (id, firm_id, kind, prospect_id, subject, signer_person_id, company_id, representative_staff_id, template_id, template_version, template_file_key, created_by, updated_at${o.status ? ", status" : ""})
     values ('${id}', '${o.firm ?? firmA}', '${o.kind ?? "RETAINER"}', ${o.prospect === null ? "null" : `'${o.prospect ?? P1}'`}, '${o.subject ?? "PERSON"}', '${PERSON}', ${o.company ? `'${o.company}'` : "null"}, '${o.staff ?? staffR}', '${o.t ?? TA}', ${o.tv ?? 2}, '${KEY(o.t ?? TA, o.tv ?? 2)}', 'staff:${staffR}', now()${o.status ? `, '${o.status}'` : ""}) returning status || ':' || current_version`;
  const R1 = u(400);
  ok("FO-5 pass: a retainer is written DRAFT at version 1 from the template's current version", sql(DEMO, ret(R1)) === "DRAFT:1");
  ok("FO-5 fail: a second live retainer for the same prospect is refused (one live per prospect, BR-10)", refused(DEMO, ret(u(401)), /fo_retainer_one_live_per_prospect/));
  ok("FO-5 fail: written in another status, from a later template version than exists, a CONSULTATION template for a RETAINER, an inactive template",
    refused(DEMO, ret(u(401), { prospect: P2, status: "SENT" }), /written DRAFT at version 1/)
    && refused(DEMO, ret(u(401), { prospect: P2, tv: 3 }), /template version 3 does not exist yet/)
    && refused(DEMO, ret(u(401), { prospect: P2, t: TC, tv: 1 }), /a CONSULTATION template cannot make a RETAINER agreement/)
    && (sql(DEMO, `update fo_retainer_template set active = false where id = '${TA}' returning 1`), refused(DEMO, ret(u(401), { prospect: P2 }), /inactive template/))
    && sql(DEMO, `update fo_retainer_template set active = true where id = '${TA}' returning 1`) === "1");
  ok("FO-5 fail: firm A's retainer naming firm B's template or firm B's staff member is refused (composite keys)",
    refused(DEMO, ret(u(401), { prospect: P2, t: TB, tv: 1 }), /fo_retainer_firm_id_template_id_fkey/)
    && refused(DEMO, ret(u(401), { prospect: P2, staff: staffS }), /fo_retainer_firm_id_representative_staff_id_fkey/));
  ok("FO-5 fail: a RETAINER without a prospect, a COMPANY subject without a company, a PERSON subject with one, are refused",
    refused(DEMO, ret(u(401), { prospect: null }), /fo_retainer_prospect_check/)
    && refused(DEMO, ret(u(401), { prospect: P2, subject: "COMPANY" }), /fo_retainer_subject_check/)
    && refused(DEMO, ret(u(401), { prospect: P2, company: CO }), /fo_retainer_subject_check/));
  ok("FO-5 pass: a CONSULTATION agreement without a prospect, and a COMPANY retainer with its company, are accepted",
    sql(DEMO, ret(u(402), { prospect: null, kind: "CONSULTATION", t: TC, tv: 1 })) === "DRAFT:1" && sql(DEMO, ret(u(403), { prospect: P2, subject: "COMPANY", company: CO })) === "DRAFT:1");

  // ------------------------------------------------------------------------------------------- versions and fee rows
  const ver = (id: string, r: string, n: number, sha = hex(10 + n)) =>
    `insert into fo_retainer_version (id, firm_id, retainer_id, n, merge_values, file_key, original_sha256, created_by) values ('${id}', '${firmA}', '${r}', ${n}, '{"client.name":"Client A"}', 'retainers/${r}/v${n}.docx', '${sha}', 'staff:${staffR}') returning n`;
  const fee = (id: string, v: string, pos: number, amount: string | null = "250000", when = "ON_SIGNING", due: string | null = null) =>
    `insert into fo_retainer_fee_row (id, firm_id, version_id, position, label, amount_minor, "when", due_on) values ('${id}', '${firmA}', '${v}', ${pos}, 'Deposit on signing', ${amount ?? "null"}, '${when}', ${due ? `'${due}'` : "null"}) returning currency`;
  const V1 = u(500), V2 = u(501), V3 = u(502);
  ok("FO-5 pass: version 1 holds the merge values snapshot and its fee rows (CAD, minor units; one with no amount yet)",
    sql(DEMO, ver(V1, R1, 1)) === "1" && sql(DEMO, fee(u(600), V1, 1)) === "CAD" && sql(DEMO, fee(u(601), V1, 2, null, "ON_DATE", "2027-01-15")) === "CAD");
  ok("FO-5 fail: a version that is not the retainer's current one, or written already sent, is refused",
    refused(DEMO, ver(u(503), R1, 2), /written only as the current version \(1\)/)
    && refused(DEMO, ver(u(503), u(403), 1).replace("created_by)", "created_by, sent_at)").replace(`'staff:${staffR}')`, `'staff:${staffR}', now())`), /written unsent/));
  ok("FO-5 fail: a fee row in another currency, negative, over CAD 100 million, a due date on a non-date row, position 0, a blank label",
    refused(DEMO, fee(u(602), V1, 3).replace("due_on)", "due_on, currency)").replace("null) returning", "null, 'USD') returning"), /fo_retainer_fee_row_currency_check/)
    && refused(DEMO, fee(u(602), V1, 3, "-1"), /fo_retainer_fee_row_amount_check/)
    && refused(DEMO, fee(u(602), V1, 3, "10000000001"), /fo_retainer_fee_row_amount_check/)
    && refused(DEMO, fee(u(602), V1, 3, "100", "ON_SIGNING", "2027-01-01"), /fo_retainer_fee_row_due_on_check/)
    && refused(DEMO, fee(u(602), V1, 0), /fo_retainer_fee_row_position_check/)
    && refused(DEMO, fee(u(602), V1, 3).replace("'Deposit on signing'", "'  '"), /fo_retainer_fee_row_label_check/));
  ok("FO-5 fail: a fee row or a version never changes, and is never deleted or truncated (AG-5-3)",
    refused(DEMO, `update fo_retainer_fee_row set amount_minor = 1 where id = '${u(600)}'`, /fee rows never change/)
    && refused(DEMO, `delete from fo_retainer_fee_row where id = '${u(600)}'`, /never deleted/)
    && refused(DEMO, `truncate fo_retainer_fee_row`, /never deleted/)
    && refused(DEMO, `update fo_retainer_version set merge_values = '{"client.name":"Someone else"}' where id = '${V1}'`, /a version never changes/)
    && refused(DEMO, `update fo_retainer_version set original_sha256 = '${hex(99)}' where id = '${V1}'`, /a version never changes/)
    && refused(DEMO, `delete from fo_retainer_version where id = '${V1}'`, /never deleted/)
    && refused(DEMO, `delete from fo_retainer where id = '${R1}'`, /never deleted/));

  // Send (FO-6 moves it on), an edit before any signature: v1's request ends, then version 2 as a draft.
  ok("FO-5 pass: DRAFT → SENT and version 1's sent_at set once", sql(DEMO, `update fo_retainer set status = 'SENT' where id = '${R1}' returning status`) === "SENT" && sql(DEMO, `update fo_retainer_version set sent_at = now() where id = '${V1}' returning 1`) === "1");
  ok("FO-5 fail: sent_at is set once; SENT does not come back to DRAFT without a new version; a fee row on a sent version is refused",
    refused(DEMO, `update fo_retainer_version set sent_at = now() - interval '1 day' where id = '${V1}'`, /sent_at is set once/)
    && refused(DEMO, `update fo_retainer set status = 'DRAFT' where id = '${R1}'`, /comes back to DRAFT only with a new version/)
    && refused(DEMO, fee(u(603), V1, 3), /only with the current unsent version of a DRAFT retainer/));
  ok("FO-5 fail: the representative or signer of a sent retainer changes only by an edit", refused(DEMO, `update fo_retainer set signer_person_id = '${u(311)}' where id = '${R1}'`, /change only by an edit/));
  sql(DEMO, `update fo_retainer set status = 'DRAFT', current_version = 2 where id = '${R1}'`);
  ok("FO-5 fail: version 2 before version 1's request ended is refused (BR-9: the old request ends first)", refused(DEMO, ver(V2, R1, 2), /version 1's request must end before version 2/));
  ok("FO-5 pass: v1's request ends (UPDATED), then version 2 with its own fee rows",
    sql(DEMO, `update fo_retainer_version set ended_at = now(), end_reason = 'UPDATED' where id = '${V1}' returning 1`) === "1" && sql(DEMO, ver(V2, R1, 2)) === "2" && sql(DEMO, fee(u(604), V2, 1, "300000")) === "CAD");
  ok("FO-5 fail: a request ends once; an ended_at without its reason is refused; the version count does not jump",
    refused(DEMO, `update fo_retainer_version set end_reason = 'WITHDRAWN' where id = '${V1}'`, /a request ends once/)
    && refused(DEMO, `update fo_retainer_version set ended_at = now() where id = '${V2}'`, /fo_retainer_version_end_check/)
    && refused(DEMO, `update fo_retainer set current_version = 4 where id = '${R1}'`, /current_version moves from 2 to 3, not 4/));
  ok("FO-5 pass: version 1 still holds its own values and fee (a later edit never alters it, AG-5-3)",
    sql(DEMO, `select merge_values->>'client.name' || ':' || (select string_agg(amount_minor::text, ',' order by position) from fo_retainer_fee_row where version_id = '${V1}') from fo_retainer_version where id = '${V1}'`) === "Client A:250000");

  // Client signed: no edit (AG-5-65); withdraw needs a reason; Signed offline needs its file, reason and actor, and is final.
  sql(DEMO, `update fo_retainer_version set sent_at = now() where id = '${V2}'; update fo_retainer set status = 'SENT' where id = '${R1}'; update fo_retainer set status = 'CLIENT_SIGNED' where id = '${R1}'`);
  ok("FO-5 fail: an edit after the client signed is refused (AG-5-65), and CLIENT_SIGNED never expires (BR-16)",
    refused(DEMO, `update fo_retainer set status = 'DRAFT', current_version = 3 where id = '${R1}'`, /status cannot move from CLIENT_SIGNED to DRAFT/)
    && refused(DEMO, `update fo_retainer set status = 'EXPIRED' where id = '${R1}'`, /status cannot move from CLIENT_SIGNED to EXPIRED/));
  ok("FO-5 fail: withdraw without a reason, with a blank one or one over 200 characters, is refused (AG-5-34)",
    refused(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x' where id = '${R1}'`, /fo_retainer_withdrawn_check/)
    && refused(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x', withdrawn_reason = '   ' where id = '${R1}'`, /fo_retainer_withdrawn_check/)
    && refused(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x', withdrawn_reason = repeat('x', 201) where id = '${R1}'`, /fo_retainer_withdrawn_check/));
  const offline = (r: string, over: Record<string, string> = {}) => {
    const cols: Record<string, string> = { status: "'SIGNED_OFFLINE'", offline_at: "now()", offline_by: `'staff:${staffR}'`, offline_reason: "'Signed at the office'", offline_file_key: `'retainers/${r}/signed-on-paper.pdf'`, offline_file_sha256: `'${hex(77)}'`, ...over };
    return `update fo_retainer set ${Object.entries(cols).map(([k, v]) => `${k} = ${v}`).join(", ")} where id = '${r}' returning status`;
  };
  ok("FO-5 fail: Signed offline without the PDF or without a reason is refused (AG-5-39, AG-5-47)",
    refused(DEMO, offline(R1, { offline_file_key: "null" }), /fo_retainer_offline_check/)
    && refused(DEMO, offline(R1, { offline_reason: "null" }), /fo_retainer_offline_check/)
    && refused(DEMO, offline(R1, { offline_file_sha256: "'nope'" }), /fo_retainer_offline_check/));
  ok("FO-5 pass: Signed offline from Client signed, with its file, reason and actor", sql(DEMO, offline(R1)) === "SIGNED_OFFLINE");
  ok("FO-5 fail: a Signed offline retainer cannot be undone, withdrawn or changed (final)",
    refused(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x', withdrawn_reason = 'x' where id = '${R1}'`, /a SIGNED_OFFLINE retainer does not change/)
    && refused(DEMO, `update fo_retainer set offline_reason = 'changed' where id = '${R1}'`, /a SIGNED_OFFLINE retainer does not change/));

  // Withdraw from SENT with a reason frees the prospect for a new retainer; a DECLINED one stays live and comes back to
  // DRAFT only by an edit (AG-5-65 r1); a DRAFT is not withdrawn (BR-10: from Sent, Viewed or Client signed).
  const R3 = u(404), R4 = u(405);
  sql(DEMO, `${ret(R3, { prospect: P3 })}; ${ver(u(510), R3, 1)}; update fo_retainer set status = 'SENT' where id = '${R3}'`);
  ok("FO-5 fail: a DRAFT retainer is not withdrawn (BR-10)", refused(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x', withdrawn_reason = 'x' where id = '${u(403)}'`, /status cannot move from DRAFT to WITHDRAWN/));
  ok("FO-5 pass: withdraw from SENT with a reason; the prospect then takes a new retainer",
    sql(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:${staffR}', withdrawn_reason = 'Client changed plans' where id = '${R3}' returning status`) === "WITHDRAWN" && sql(DEMO, ret(R4, { prospect: P3 })) === "DRAFT:1");
  sql(DEMO, `${ver(u(511), R4, 1)}; update fo_retainer_version set sent_at = now() where id = '${u(511)}'; update fo_retainer set status = 'SENT' where id = '${R4}'; update fo_retainer set status = 'DECLINED' where id = '${R4}'`);
  ok("FO-5 fail: a DECLINED retainer keeps the prospect (no second live one) and does not go back to SENT",
    refused(DEMO, ret(u(406), { prospect: P3 }), /fo_retainer_one_live_per_prospect/) && refused(DEMO, `update fo_retainer set status = 'SENT' where id = '${R4}'`, /status cannot move from DECLINED to SENT/));
  ok("FO-5 pass: Edit and resend from DECLINED makes version 2 (AG-5-65 r1)",
    sql(DEMO, `update fo_retainer_version set ended_at = now(), end_reason = 'DECLINED' where id = '${u(511)}'; update fo_retainer set status = 'DRAFT', current_version = 2 where id = '${R4}' returning status || ':' || current_version`) === "DRAFT:2" && sql(DEMO, ver(V3, R4, 2)) === "2");
  ok("FO-5 fail: a fee row names firm B's version → refused (composite key)", refused(DEMO, fee(u(605), V3, 1).replace(`'${firmA}'`, `'${firmB}'`), /fo_retainer_fee_row_firm_id_version_id_fkey/));
  ok("FO-5 fail: firm_id of a retainer never changes", refused(DEMO, `update fo_retainer set firm_id = '${firmB}' where id = '${R4}'`, /firm_id never changes|fkey/));
} catch (e) {
  fail++;
  console.log(`FAIL  FO-5: the check stopped — ${String((e as Error).stack ?? e).slice(0, 800)}`);
} finally {
  for (const db of [EMPTY, DEMO]) { try { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db]); } catch { /* reported by the next run's createdb */ } }
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\nFO-5 retainers: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
