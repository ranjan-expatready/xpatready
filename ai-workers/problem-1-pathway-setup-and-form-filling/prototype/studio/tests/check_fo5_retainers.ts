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
  const SEED = "seed:FO-5";
  const tpl = (id: string, firm: string, name: string, kind = "RETAINER", ph = "{client.name,fees}") =>
    `insert into fo_retainer_template (id, firm_id, name, kind, file_key, file_sha256, placeholders, created_by, updated_by, updated_at) values ('${id}', '${firm}', '${name}', '${kind}', '${KEY(id, 1)}', '${hex(1)}', '${ph}', '${SEED}', '${SEED}', now()) returning version`;
  const tplRaw = (cols: Record<string, string>) => {
    const c: Record<string, string> = { id: `'${u(103)}'`, firm_id: `'${firmA}'`, name: "'X'", file_key: `'${KEY(u(103), 1)}'`, file_sha256: `'${hex(1)}'`, placeholders: "'{}'", created_by: `'${SEED}'`, updated_by: `'${SEED}'`, updated_at: "now()", ...cols };
    return `insert into fo_retainer_template (${Object.keys(c).join(", ")}) values (${Object.values(c).join(", ")})`;
  };
  const TA = u(100), TC = u(101), TB = u(102), TD = u(104);
  ok("FO-5 pass: a template is written at version 1, active, kind RETAINER by default", sql(DEMO, tpl(TA, firmA, "Standard retainer")) === "1" && sql(DEMO, `select active || ':' || kind from fo_retainer_template where id='${TA}'`) === "true:RETAINER");
  ok("FO-5 pass: a CONSULTATION template, and the same name in another firm, are accepted", sql(DEMO, tpl(TC, firmA, "Consultation agreement", "CONSULTATION")) === "1" && sql(DEMO, tpl(TB, firmB, "Standard retainer")) === "1");
  ok("FO-5 fail: the same template name twice in a firm is refused, also in another case or spacing (B-15)",
    refused(DEMO, tpl(u(103), firmA, "Standard retainer"), /fo_retainer_template_firm_id_name_key/)
    && refused(DEMO, tpl(u(103), firmA, "standard  RETAINER"), /fo_retainer_template_firm_id_name_norm_key/)
    && refused(DEMO, tpl(u(103), firmA, "Standard retainer"), /fo_retainer_template_firm_id_name_norm_key/));
  ok("FO-5 fail: a blank, padded, zero-width or two-line name, a bad sha256, a key not named by the template and version (.., upper case, another template's), a placeholder that is not a dotted lower-case name or is listed twice, a blank actor",
    refused(DEMO, tpl(u(103), firmA, " "), /fo_retainer_template_name_check/)
    && refused(DEMO, tpl(u(103), firmA, " Padded"), /fo_retainer_template_name_check/)
    && refused(DEMO, tpl(u(103), firmA, "​​"), /fo_retainer_template_name_check/)
    && refused(DEMO, tplRaw({ name: "E'Two\\nlines'" }), /fo_retainer_template_name_check/)
    && refused(DEMO, tplRaw({ file_sha256: "'ABC'" }), /fo_retainer_template_file_sha256_check/)
    && refused(DEMO, tplRaw({ file_key: `'retainer-templates/${u(103)}/../v1.docx'` }), /fo_retainer_template_file_key_check/)
    && refused(DEMO, tplRaw({ file_key: `'${KEY(TA, 1)}'` }), /fo_retainer_template_file_key_check/)
    && refused(DEMO, tplRaw({ placeholders: "'{Client.Passport}'" }), /fo_retainer_template_placeholders_check/)
    && refused(DEMO, tplRaw({ placeholders: "'{fees,fees}'" }), /fo_retainer_template_placeholders_check/)
    && refused(DEMO, tplRaw({ created_by: "''" }), /fo_retainer_template_actors_check/));
  ok("FO-5 fail: a template is not written at version 3", refused(DEMO, tplRaw({ version: "3", file_key: `'retainer-templates/${u(103)}/v3.docx'` }), /starts at version 1/));
  ok("FO-5 pass: a new file makes version 2 under its own key (BR-1)",
    sql(DEMO, `update fo_retainer_template set version = 2, file_key = '${KEY(TA, 2)}', file_sha256 = '${hex(2)}', placeholders = '{client.name,fees,representative.name}' where id = '${TA}' returning version`) === "2");
  ok("FO-5 fail: the file changes without a new version, the version jumps or goes back, a new version keeps the old key (B-16), the kind, the id or the firm changes",
    refused(DEMO, `update fo_retainer_template set file_sha256 = '${hex(3)}' where id = '${TA}'`, /a new file makes version 3/)
    && refused(DEMO, `update fo_retainer_template set version = 4, file_key = '${KEY(TA, 4)}' where id = '${TA}'`, /version moves from 2 to 3, not 4/)
    && refused(DEMO, `update fo_retainer_template set version = 1, file_key = '${KEY(TA, 1)}' where id = '${TA}'`, /version moves from 2 to 3, not 1/)
    && refused(DEMO, `update fo_retainer_template set version = 3 where id = '${TA}'`, /fo_retainer_template_file_key_check/)
    && refused(DEMO, `update fo_retainer_template set kind = 'CONSULTATION' where id = '${TA}'`, /kind, created_by and created_at never change/)
    && refused(DEMO, `update fo_retainer_template set id = '${u(109)}', file_key = '${KEY(u(109), 2)}' where id = '${TA}'`, /firm_id and id never change/)
    && refused(DEMO, `update fo_retainer_template set firm_id = '${firmB}' where id = '${TA}'`, /firm_id and id never change/));
  ok("FO-5 pass: a template can be switched off and on, and renamed", sql(DEMO, `update fo_retainer_template set active = false, name = 'Standard retainer 2026' where id = '${TA}' returning 1`) === "1" && sql(DEMO, `update fo_retainer_template set active = true where id = '${TA}' returning 1`) === "1");
  sql(DEMO, tpl(TD, firmA, "Express Entry retainer"));

  // ------------------------------------------------------------------------------------- retainers with their versions
  // A retainer and each edit write their version in the same transaction (one psql call = one transaction).
  const P1 = u(300), P2 = u(301), P3 = u(302), P5 = u(303), P6 = u(304), PERSON = u(310), CO = u(320);
  type RetOpts = { firm?: string; prospect?: string | null; t?: string; tv?: number; key?: string; kind?: string; staff?: string; subject?: string; company?: string | null; status?: string };
  const ret = (id: string, o: RetOpts = {}) =>
    `insert into fo_retainer (id, firm_id, kind, prospect_id, subject, signer_person_id, company_id, representative_staff_id, template_id, template_version, template_file_key, created_by, updated_at${o.status ? ", status" : ""})
     values ('${id}', '${o.firm ?? firmA}', '${o.kind ?? "RETAINER"}', ${o.prospect === null ? "null" : `'${o.prospect ?? P1}'`}, '${o.subject ?? "PERSON"}', '${PERSON}', ${o.company ? `'${o.company}'` : "null"}, '${o.staff ?? staffR}', '${o.t ?? TA}', ${o.tv ?? 2}, '${o.key ?? KEY(o.t ?? TA, o.tv ?? 2)}', 'staff:${staffR}', now()${o.status ? `, '${o.status}'` : ""})`;
  const ver = (id: string, r: string, n: number, extra = "") =>
    `insert into fo_retainer_version (id, firm_id, retainer_id, n, merge_values, file_key, original_sha256, created_by${extra ? ", " + extra.split("=")[0] : ""}) values ('${id}', '${firmA}', '${r}', ${n}, '{"client.name":"Client A"}', 'retainers/${r}/v${n}.docx', '${hex(10 + n)}', 'staff:${staffR}'${extra ? ", " + extra.split("=").slice(1).join("=") : ""})`;
  const fee = (id: string, v: string, pos: number, amount: string | null = "250000", when = "ON_SIGNING", due: string | null = null, label = "'Deposit on signing'") =>
    `insert into fo_retainer_fee_row (id, firm_id, version_id, position, label, amount_minor, "when", due_on) values ('${id}', '${firmA}', '${v}', ${pos}, ${label}, ${amount ?? "null"}, '${when}', ${due ? `'${due}'` : "null"})`;
  const state = (r: string) => sql(DEMO, `select status || ':' || current_version from fo_retainer where id = '${r}'`);
  const draft = (r: string, v: string, o: RetOpts = {}, fees: string[] = []) => sql(DEMO, [ret(r, o), ver(v, r, 1), ...fees].join("; ") + "; select 1");
  const send = (r: string, v: string) => `update fo_retainer_version set sent_at = now() where id = '${v}'; update fo_retainer set status = 'SENT' where id = '${r}'`;
  const end = (r: string, v: string, why: string, retSet: string) => `update fo_retainer_version set ended_at = now(), end_reason = '${why}' where id = '${v}'; update fo_retainer set ${retSet} where id = '${r}'`;
  const R1 = u(400), V1 = u(500), V2 = u(501), V3 = u(502);
  ok("FO-5 pass: a retainer is written DRAFT at version 1 with its version 1 (the merge values snapshot) and fee rows (CAD, minor units; one with no amount yet)",
    draft(R1, V1, {}, [fee(u(600), V1, 1), fee(u(601), V1, 2, null, "ON_DATE", "2027-01-15")]) === "1" && state(R1) === "DRAFT:1"
    && sql(DEMO, `select string_agg(currency || coalesce(amount_minor::text, '-'), ',' order by position) from fo_retainer_fee_row where version_id = '${V1}'`) === "CAD250000,CAD-");
  ok("FO-5 fail: a retainer without its version, or a second live retainer for the same prospect, is refused (at commit; one live per prospect, BR-10)",
    refused(DEMO, ret(u(401), { prospect: P2 }), /has no version 1/) && refused(DEMO, `${ret(u(401))}; ${ver(u(503), u(401), 1)}`, /fo_retainer_one_live_per_prospect/));
  ok("FO-5 fail: written in another status, from an older or later template version than its current one, with another key, a CONSULTATION template for a RETAINER, an inactive template",
    refused(DEMO, ret(u(401), { prospect: P2, status: "SENT" }), /written DRAFT at version 1/)
    && refused(DEMO, ret(u(401), { prospect: P2, tv: 3 }), /takes the template's current version \(2\) and its file, not version 3/)
    && refused(DEMO, ret(u(401), { prospect: P2, tv: 1 }), /takes the template's current version \(2\) and its file, not version 1/)
    && refused(DEMO, ret(u(401), { prospect: P2, key: KEY(TD, 1) }), /takes the template's current version \(2\) and its file/)
    && refused(DEMO, ret(u(401), { prospect: P2, t: TC, tv: 1 }), /a CONSULTATION template cannot make a RETAINER agreement/)
    && (sql(DEMO, `update fo_retainer_template set active = false where id = '${TA}'`), refused(DEMO, ret(u(401), { prospect: P2 }), /inactive template/))
    && sql(DEMO, `update fo_retainer_template set active = true where id = '${TA}' returning 1`) === "1");
  ok("FO-5 fail: firm A's retainer naming firm B's template or firm B's staff member is refused (composite keys)",
    refused(DEMO, ret(u(401), { prospect: P2, t: TB, tv: 1 }), /fo_retainer_firm_id_template_id_fkey/)
    && refused(DEMO, ret(u(401), { prospect: P2, staff: staffS }), /fo_retainer_firm_id_representative_staff_id_fkey/));
  ok("FO-5 fail: a RETAINER without a prospect, a COMPANY subject without a company, a PERSON subject with one, are refused",
    refused(DEMO, ret(u(401), { prospect: null }), /fo_retainer_prospect_check/)
    && refused(DEMO, ret(u(401), { prospect: P2, subject: "COMPANY" }), /fo_retainer_subject_check/)
    && refused(DEMO, ret(u(401), { prospect: P2, company: CO }), /fo_retainer_subject_check/));
  ok("FO-5 pass: a CONSULTATION agreement without a prospect, and a COMPANY retainer with its company, are accepted",
    draft(u(402), u(504), { prospect: null, kind: "CONSULTATION", t: TC, tv: 1 }) === "1" && draft(u(403), u(505), { prospect: u(307), subject: "COMPANY", company: CO }) === "1");
  ok("FO-5 fail: a version that is not the retainer's current one, or written already sent, is refused",
    refused(DEMO, ver(u(506), R1, 2), /written only as the current version \(1\)/)
    && refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1, "sent_at=now()")}`, /written unsent/));
  ok("FO-5 fail: a fee row in another currency, negative, over CAD 100 million, a due date on a non-date row or out of range (infinity, BC; B-13), position 0, a blank, zero-width or two-line label (B-14)",
    refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1)}; ${fee(u(602), u(506), 1).replace("due_on)", "due_on, currency)").replace("null)", "null, 'USD')")}`, /fo_retainer_fee_row_currency_check/)
    && [["-1"], ["10000000001"]].every(([a]) => refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1)}; ${fee(u(602), u(506), 1, a)}`, /fo_retainer_fee_row_amount_check/))
    && [["ON_SIGNING", "2027-01-01"], ["ON_DATE", "infinity"], ["ON_DATE", "0001-01-01 BC"]].every(([w, d]) => refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1)}; ${fee(u(602), u(506), 1, "100", w, d)}`, /fo_retainer_fee_row_due_on_check/))
    && refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1)}; ${fee(u(602), u(506), 0)}`, /fo_retainer_fee_row_position_check/)
    && ["'  '", "E'\\u200b'", "E'Two\\nlines'"].every((l) => refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1)}; ${fee(u(602), u(506), 1, "100", "ON_SIGNING", null, l)}`, /fo_retainer_fee_row_label_check/)));
  ok("FO-5 fail: merge values over 64 KB, or not an object, are refused (B-14)",
    refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1).replace(`'{"client.name":"Client A"}'`, `jsonb_build_object('x', repeat('a', 70000))`)}`, /fo_retainer_version_merge_values_check/)
    && refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1).replace(`'{"client.name":"Client A"}'`, `'[1]'`)}`, /fo_retainer_version_merge_values_check/));
  ok("FO-5 fail: a fee row added in a later transaction than its version (its file is already stored) is refused (review m1)", refused(DEMO, fee(u(603), V1, 3), /written in the transaction that wrote their version/));
  ok("FO-5 fail: a fee row or a version never changes, and is never deleted or truncated (AG-5-3)",
    refused(DEMO, `update fo_retainer_fee_row set amount_minor = 1 where id = '${u(600)}'`, /fee rows never change/)
    && refused(DEMO, `delete from fo_retainer_fee_row where id = '${u(600)}'`, /never deleted/)
    && refused(DEMO, `truncate fo_retainer_fee_row`, /never deleted/)
    && refused(DEMO, `update fo_retainer_version set merge_values = '{"client.name":"Someone else"}' where id = '${V1}'`, /a version never changes/)
    && refused(DEMO, `update fo_retainer_version set original_sha256 = '${hex(99)}' where id = '${V1}'`, /a version never changes/)
    && refused(DEMO, `delete from fo_retainer_version where id = '${V1}'`, /never deleted/)
    && refused(DEMO, `delete from fo_retainer where id = '${R1}'`, /never deleted/)
    && refused(DEMO, `update fo_retainer set id = '${u(499)}' where id = '${R1}'`, /firm_id and id never change|fo_retainer_version_firm_id_retainer_id_fkey/));

  // Send (FO-6 moves it on): the version's request and the status together; never apart (B-8).
  ok("FO-5 fail: SENT while the version is unsent, or a sent version on a DRAFT retainer, is refused at commit (B-8)",
    refused(DEMO, `update fo_retainer set status = 'SENT' where id = '${R1}'`, /a SENT retainer's current version 1 has request sent f/)
    && refused(DEMO, `update fo_retainer_version set sent_at = now() where id = '${V1}'`, /a DRAFT retainer's current version 1 has request sent t/));
  ok("FO-5 pass: DRAFT → SENT with version 1's request sent, in one transaction", (sql(DEMO, `${send(R1, V1)}; select 1`), state(R1) === "SENT:1"));
  ok("FO-5 fail: sent_at is set once; SENT does not come back to DRAFT without a new version; a fee row on a sent version is refused",
    refused(DEMO, `update fo_retainer_version set sent_at = now() - interval '1 day' where id = '${V1}'`, /sent_at is set once/)
    && refused(DEMO, `update fo_retainer set status = 'DRAFT' where id = '${R1}'`, /comes back to DRAFT only with a new version/)
    && refused(DEMO, fee(u(604), V1, 3), /only with the current unsent version of a DRAFT retainer/));
  ok("FO-5 fail: the representative or signer of a sent retainer changes only by an edit", refused(DEMO, `update fo_retainer set signer_person_id = '${u(311)}' where id = '${R1}'`, /change only by an edit/));
  ok("FO-5 fail: version 2 before version 1's request ended is refused (BR-9: the old request ends first)",
    refused(DEMO, `update fo_retainer set status = 'DRAFT', current_version = 2 where id = '${R1}'; ${ver(V2, R1, 2)}`, /version 1's request must end before version 2/));
  ok("FO-5 fail: a new version number with no version row is refused at commit (B-8)", refused(DEMO, `${end(R1, V1, "UPDATED", "status = 'DRAFT', current_version = 2")}`, /has no version 2/));
  ok("FO-5 pass: an edit before any signature: v1's request ends (UPDATED), version 2 with its own fee rows, in one transaction",
    (sql(DEMO, `${end(R1, V1, "UPDATED", "status = 'DRAFT', current_version = 2")}; ${ver(V2, R1, 2)}; ${fee(u(605), V2, 1, "300000")}; select 1`), state(R1) === "DRAFT:2"));
  ok("FO-5 fail: a request ends once; an ended_at without its reason is refused; the version count does not jump",
    refused(DEMO, `update fo_retainer_version set end_reason = 'WITHDRAWN' where id = '${V1}'`, /a request ends once/)
    && refused(DEMO, `update fo_retainer_version set ended_at = now() where id = '${V2}'`, /fo_retainer_version_end_check/)
    && refused(DEMO, `update fo_retainer set current_version = 4 where id = '${R1}'`, /current_version moves from 2 to 3, not 4/));
  ok("FO-5 pass: version 1 still holds its own values and fee (a later edit never alters it, AG-5-3)",
    sql(DEMO, `select merge_values->>'client.name' || ':' || (select string_agg(amount_minor::text, ',' order by position) from fo_retainer_fee_row where version_id = '${V1}') from fo_retainer_version where id = '${V1}'`) === "Client A:250000");

  // A draft is edited, never stuck (review M1, break B-12): template, subject and signer change with a new version.
  const R5 = u(406), V51 = u(520), V52 = u(521), V53 = u(522);
  draft(R5, V51, { prospect: P5 });
  ok("FO-5 fail: a draft's template, signer or subject does not change without a new version",
    refused(DEMO, `update fo_retainer set template_id = '${TD}', template_version = 1, template_file_key = '${KEY(TD, 1)}' where id = '${R5}'`, /change only by an edit/)
    && refused(DEMO, `update fo_retainer set signer_person_id = '${u(311)}' where id = '${R5}'`, /change only by an edit/));
  ok("FO-5 fail: an edit to an inactive template, an older version of it, or a CONSULTATION template is refused",
    (sql(DEMO, `update fo_retainer_template set active = false where id = '${TD}'`), refused(DEMO, `update fo_retainer set template_id = '${TD}', template_version = 1, template_file_key = '${KEY(TD, 1)}', current_version = 2 where id = '${R5}'`, /inactive template/))
    && sql(DEMO, `update fo_retainer_template set active = true where id = '${TD}' returning 1`) === "1"
    && refused(DEMO, `update fo_retainer set template_version = 1, template_file_key = '${KEY(TA, 1)}', current_version = 2 where id = '${R5}'`, /current version \(2\) and its file, not version 1/)
    && refused(DEMO, `update fo_retainer set template_id = '${TC}', template_version = 1, template_file_key = '${KEY(TC, 1)}', current_version = 2 where id = '${R5}'`, /a CONSULTATION template cannot make a RETAINER/));
  ok("FO-5 pass: a draft switches to another template, then to another signer and to a company subject, each with a new version (M1)",
    (sql(DEMO, `update fo_retainer set template_id = '${TD}', template_version = 1, template_file_key = '${KEY(TD, 1)}', current_version = 2 where id = '${R5}'; ${ver(V52, R5, 2)}; select 1`),
     sql(DEMO, `update fo_retainer set signer_person_id = '${u(311)}', subject = 'COMPANY', company_id = '${CO}', current_version = 3 where id = '${R5}'; ${ver(V53, R5, 3)}; select 1`),
     sql(DEMO, `select status || ':' || current_version || ':' || template_id || ':' || subject from fo_retainer where id = '${R5}'`) === `DRAFT:3:${TD}:COMPANY`));
  ok("FO-5 fail: an older, never-sent version is not sent or ended once a newer one exists (B-7: one open request)",
    refused(DEMO, `update fo_retainer_version set sent_at = now() where id = '${V51}'`, /only the current version \(3\) is sent or ended, not version 1/)
    && refused(DEMO, `update fo_retainer_version set ended_at = now(), end_reason = 'UPDATED' where id = '${V52}'`, /only the current version \(3\) is sent or ended, not version 2/));
  ok("FO-5 pass: Signed offline straight from a draft (the unsent request ends SIGNED_OFFLINE; BR-11)",
    (sql(DEMO, `${end(R5, V53, "SIGNED_OFFLINE", `status = 'SIGNED_OFFLINE', offline_at = now(), offline_by = 'staff:${staffR}', offline_reason = 'Signed at the office', offline_file_key = 'retainers/${R5}/signed-offline.pdf', offline_file_sha256 = '${hex(76)}'`)}; select 1`), state(R5) === "SIGNED_OFFLINE:3"));

  // Client signed: no edit (AG-5-65); withdraw needs a reason; Signed offline needs its file, reason and actor, and is final.
  sql(DEMO, `${send(R1, V2)}; update fo_retainer set status = 'VIEWED' where id = '${R1}'; update fo_retainer set status = 'CLIENT_SIGNED' where id = '${R1}'`);
  ok("FO-5 pass: SENT → VIEWED → CLIENT_SIGNED with the request open", state(R1) === "CLIENT_SIGNED:2");
  ok("FO-5 fail: an edit after the client signed is refused (AG-5-65), and CLIENT_SIGNED never expires (BR-16)",
    refused(DEMO, `${end(R1, V2, "UPDATED", "status = 'DRAFT', current_version = 3")}`, /request of a CLIENT_SIGNED|status cannot move from CLIENT_SIGNED to DRAFT/)
    && refused(DEMO, `update fo_retainer set status = 'DRAFT', current_version = 3 where id = '${R1}'`, /status cannot move from CLIENT_SIGNED to DRAFT/)
    && refused(DEMO, `${end(R1, V2, "EXPIRED", "status = 'EXPIRED'")}`, /status cannot move from CLIENT_SIGNED to EXPIRED/));
  const withdraw = (r: string, v: string, reason: string) => end(r, v, "WITHDRAWN", `status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:${staffR}', withdrawn_reason = ${reason}`);
  ok("FO-5 fail: withdraw without a reason, with a blank or line-break-only one, one over 200 characters, or a blank actor, is refused (AG-5-34, B-14)",
    refused(DEMO, `${end(R1, V2, "WITHDRAWN", `status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x'`)}`, /fo_retainer_withdrawn_check/)
    && ["'   '", "E'\\n\\t'", "repeat('x', 201)"].every((r) => refused(DEMO, withdraw(R1, V2, r), /fo_retainer_withdrawn_check/))
    && refused(DEMO, withdraw(R1, V2, "'x'").replace(`withdrawn_by = 'staff:${staffR}'`, "withdrawn_by = ''"), /fo_retainer_actors_check/));
  ok("FO-5 fail: WITHDRAWN while the request is still open is refused at commit (B-9)",
    refused(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x', withdrawn_reason = 'x' where id = '${R1}'`, /a WITHDRAWN retainer's current version 2 has request sent t, ended f/));
  const offline = (r: string, v: string, over: Record<string, string> = {}) => {
    const cols: Record<string, string> = { status: "'SIGNED_OFFLINE'", offline_at: "now()", offline_by: `'staff:${staffR}'`, offline_reason: "'Signed at the office'", offline_file_key: `'retainers/${r}/signed-offline.pdf'`, offline_file_sha256: `'${hex(77)}'`, ...over };
    return end(r, v, "SIGNED_OFFLINE", Object.entries(cols).map(([k, x]) => `${k} = ${x}`).join(", "));
  };
  ok("FO-5 fail: Signed offline without the PDF, without a reason, with a bad hash or another retainer's file key is refused (AG-5-39, AG-5-47)",
    refused(DEMO, offline(R1, V2, { offline_file_key: "null" }), /fo_retainer_offline_check/)
    && refused(DEMO, offline(R1, V2, { offline_reason: "null" }), /fo_retainer_offline_check/)
    && refused(DEMO, offline(R1, V2, { offline_file_sha256: "'nope'" }), /fo_retainer_offline_check/)
    && refused(DEMO, offline(R1, V2, { offline_file_key: `'retainers/${R5}/signed-offline.pdf'` }), /fo_retainer_offline_check/));
  ok("FO-5 pass: Signed offline from Client signed, with its file, reason and actor", (sql(DEMO, `${offline(R1, V2)}; select 1`), state(R1) === "SIGNED_OFFLINE:2"));
  ok("FO-5 fail: a Signed offline retainer cannot be undone, withdrawn or changed, and its request does not change (final)",
    refused(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x', withdrawn_reason = 'x' where id = '${R1}'`, /a SIGNED_OFFLINE retainer does not change/)
    && refused(DEMO, `update fo_retainer set offline_reason = 'changed' where id = '${R1}'`, /a SIGNED_OFFLINE retainer does not change/));

  // Withdraw from SENT and from CLIENT_SIGNED with a reason frees the prospect; WITHDRAWN and SIGNED are final; a DECLINED
  // or EXPIRED one comes back to DRAFT only by an edit (AG-5-65 r1); a DRAFT is not withdrawn (BR-10).
  const R3 = u(404), R4 = u(405), R6 = u(407), R7 = u(408);
  draft(R3, u(510), { prospect: P3 });
  sql(DEMO, send(R3, u(510)));
  ok("FO-5 fail: a DRAFT retainer is not withdrawn (BR-10)", refused(DEMO, withdraw(u(403), u(505), "'x'"), /status cannot move from DRAFT to WITHDRAWN/));
  ok("FO-5 pass: withdraw from SENT with a reason; the prospect then takes a new retainer",
    (sql(DEMO, `${withdraw(R3, u(510), "'Client changed plans'")}; select 1`), state(R3) === "WITHDRAWN:1") && draft(R4, u(511), { prospect: P3 }) === "1");
  ok("FO-5 fail: a WITHDRAWN retainer does not change, and its request does not change",
    refused(DEMO, `update fo_retainer set withdrawn_reason = 'other' where id = '${R3}'`, /a WITHDRAWN retainer does not change/)
    && refused(DEMO, `update fo_retainer_version set sent_at = now() where id = '${u(510)}'`, /sent_at is set once/));
  sql(DEMO, `${send(R4, u(511))}`);
  sql(DEMO, end(R4, u(511), "DECLINED", "status = 'DECLINED'"));
  ok("FO-5 fail: a DECLINED retainer keeps the prospect (no second live one) and does not go back to SENT",
    refused(DEMO, `${ret(u(409), { prospect: P3 })}; ${ver(u(530), u(409), 1)}`, /fo_retainer_one_live_per_prospect/) && refused(DEMO, `update fo_retainer set status = 'SENT' where id = '${R4}'`, /status cannot move from DECLINED to SENT/));
  ok("FO-5 pass: Edit and resend from DECLINED makes version 2 (AG-5-65 r1)",
    (sql(DEMO, `update fo_retainer set status = 'DRAFT', current_version = 2 where id = '${R4}'; ${ver(V3, R4, 2)}; select 1`), state(R4) === "DRAFT:2"));
  draft(R6, u(512), { prospect: P6 });
  sql(DEMO, send(R6, u(512)));
  sql(DEMO, end(R6, u(512), "EXPIRED", "status = 'EXPIRED'"));
  ok("FO-5 pass: Edit and resend from EXPIRED makes version 2 while no other retainer took the prospect", (sql(DEMO, `update fo_retainer set status = 'DRAFT', current_version = 2 where id = '${R6}'; ${ver(u(513), R6, 2)}; select 1`), state(R6) === "DRAFT:2"));
  sql(DEMO, `${send(R6, u(513))}; update fo_retainer set status = 'CLIENT_SIGNED' where id = '${R6}'`);
  ok("FO-5 pass: withdraw from CLIENT_SIGNED with a reason (BR-10)", (sql(DEMO, `${withdraw(R6, u(513), "'Firm cannot act'")}; select 1`), state(R6) === "WITHDRAWN:2"));
  draft(R7, u(514), { prospect: u(305) });
  sql(DEMO, `${send(R7, u(514))}; update fo_retainer set status = 'CLIENT_SIGNED' where id = '${R7}'; update fo_retainer set status = 'SIGNED' where id = '${R7}'`);
  ok("FO-5 pass: CLIENT_SIGNED → SIGNED (FO-6's completion) with the request open", state(R7) === "SIGNED:1");
  ok("FO-5 fail: a SIGNED retainer does not change, and its request is not ended later (B-9)",
    refused(DEMO, `update fo_retainer set status = 'WITHDRAWN', withdrawn_at = now(), withdrawn_by = 'staff:x', withdrawn_reason = 'x' where id = '${R7}'`, /a SIGNED retainer does not change/)
    && refused(DEMO, `update fo_retainer_version set ended_at = now(), end_reason = 'DECLINED' where id = '${u(514)}'`, /the request of a SIGNED retainer does not change/));
  ok("FO-5 fail: a fee row names firm B's version → refused (composite key)", refused(DEMO, `${ret(u(401), { prospect: P2 })}; ${ver(u(506), u(401), 1)}; ${fee(u(606), u(506), 1).replace(`'${firmA}'`, `'${firmB}'`)}`, /fo_retainer_fee_row_firm_id_version_id_fkey/));
  ok("FO-5 fail: firm_id of a retainer never changes", refused(DEMO, `update fo_retainer set firm_id = '${firmB}' where id = '${R4}'`, /firm_id and id never change/));
} catch (e) {
  fail++;
  console.log(`FAIL  FO-5: the check stopped — ${String((e as { stderr?: string }).stderr ?? "").trim().slice(0, 600)} ${String((e as Error).stack ?? e).slice(0, 400)}`);
} finally {
  for (const db of [EMPTY, DEMO]) { try { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db]); } catch { /* reported by the next run's createdb */ } }
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\nFO-5 retainers: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
