// FO-13 (P-579, P-584 (8), P-599, P-600; BACKLOG row FO-13 and its brief; contracts §0, §7; case-side contract v0.1
// §3.1): the compliance tables (conflict check, identity check) and their database rules, each with a passing and a
// failing case. Three scratch databases: "empty" gets every migration; "demo" gets every migration before FO-13's, then
// demo-shaped rows (Sample cases, an audit line, the Sample firms and staff), then FO-13's migration and any later one;
// "bare" stops before FO-13. No server, no browser, no model call (US$0). Every value is Sample; no real person.
// All are dropped at the end.
//   tsx studio/tests/check_fo13_compliance_schema.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114190000_fo13_compliance_tables", PF3 = "20261114015002_pf3_platform_tables";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_fo13_empty_${process.pid}`, DEMO = `xr_studio_fo13_demo_${process.pid}`, BARE = `xr_studio_fo13_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `fo13-check-${process.pid}`);
const TABLES = ["fo_conflict_check", "fo_identity_check"];

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
// Refused with this SQLSTATE and a message matching re (psql's verbose errors print "ERROR:  <code>: …").
const refusedCode = (db: string, q: string, code: string, re: RegExp) => { try { psql(db, ["-v", "VERBOSITY=verbose", "-Atc", q]); return false; } catch (e) { const err = String((e as { stderr?: string }).stderr ?? e); return err.includes(`ERROR:  ${code}:`) && re.test(err); } };
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const client = (db: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), options: "-c TimeZone=UTC" }) });
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

// prisma migrate diff from a database to the schema folder: the lines that name an FO-13 table or type.
function fo13Diff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /fo_conflict|fo_identity|FoConflict|FoIdentity/.test(l));
}
// The non-primary-key indexes of the listed tables whose first column is not firm_id.
const indexesNotFirmFirst = (db: string) => sql(db, `select coalesce(string_agg(ic.relname, ',' order by ic.relname), '') from pg_index i
  join pg_class c on c.oid = i.indrelid join pg_class ic on ic.oid = i.indexrelid
  left join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
  where c.relnamespace = 'public'::regnamespace and c.relname = any('{${TABLES.join(",")}}') and not i.indisprimary and coalesce(a.attname, '') <> 'firm_id'`);

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
try {
  const before = all.filter((d) => d < NEW);
  ok(`FO-13: the migration has its own stamp, later than every one before it (newest before it: ${before.at(-1)}; P-348 (8), P-600 (4)), and after PF-3's`,
    all.includes(NEW) && (before.at(-1) ?? "") >= PF3 && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));
  const text = readFileSync(join(MIG, NEW, "migration.sql"), "utf8");
  const created = [...text.matchAll(/CREATE (?:FUNCTION|TRIGGER) (\w+)/g)].map((m) => m[1]);
  ok("FO-13 (P-600 (3), rows rev 15.2): every function and trigger the migration creates carries the area prefix fo_compliance_",
    created.length >= 8 && created.every((n) => n.startsWith("fo_compliance_")), created.filter((n) => !n.startsWith("fo_compliance_")));
  ok("FO-13 (P-600 (2)): the migration only adds — no ALTER, DROP or UPDATE of a table that is not its own",
    ![...text.matchAll(/ALTER TABLE "(\w+)"/g)].some((m) => !TABLES.includes(m[1])) && !/^\s*(DROP|UPDATE|DELETE|TRUNCATE)\b/im.test(text.replace(/^--.*$/gm, "")));
  ok("FO-13 (brief, P-584 (8)): no complaint table here (PF-21's platform register)", !/complaint/i.test(text.replace(/^--.*$/gm, "")));

  // ------------------------------------------------------------------------- migration on empty and demo-data copies
  for (const d of before) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-13 fail: before FO-13's migration there is no compliance table and the schema differs (diff names fo_conflict_check)",
    sql(BARE, `select count(*) from pg_tables where tablename = any('{${TABLES.join(",")}}')`) === "0" && fo13Diff(BARE).some((l) => /fo_conflict_check/.test(l)));
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-13 pass: every migration applies to an empty database; the two tables exist",
    sql(EMPTY, `select count(*) from pg_tables where schemaname='public' and tablename = any('{${TABLES.join(",")}}')`) === "2");
  ok("FO-13 pass: migrate diff from the migrated empty database to the schema names no FO-13 table or type", fo13Diff(EMPTY).length === 0, fo13Diff(EMPTY));
  ok("FO-13 fail: the migration does not apply twice", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  for (const d of before) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  const W = u(1), CMB = u(2);
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values
      ('${u(10)}', '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, action, entity, summary) values (gen_random_uuid(), '${W}', 'user-R', 'case.open', 'runtime_case', 'Sample');`);
  const pre = client(DEMO); dbs.push(pre);
  await seedSampleFirms(pre);
  await pre.$disconnect();
  const demoRows = `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select count(*) from platform_firm) || ':' || (select string_agg(id::text, ',' order by id) from platform_staff)`;
  const was = sql(DEMO, demoRows);
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-13 pass: the migration applies to a demo-data copy (cases, audit, the Sample firms and staff) and leaves its rows as they were", sql(DEMO, demoRows) === was, was);
  ok("FO-13 pass: migrate diff after it on the demo-data copy names no FO-13 table or type", fo13Diff(DEMO).length === 0, fo13Diff(DEMO));

  ok("FO-13 pass: firm_id is first in every index of the two tables (contracts §0)", indexesNotFirmFirst(DEMO) === "", indexesNotFirmFirst(DEMO));
  ok("FO-13 fail (the probe works): an index not led by firm_id is named",
    sql(DEMO, `create index fo13_probe on fo_identity_check (person_id); select 1`) === "1" && indexesNotFirmFirst(DEMO) === "fo13_probe" && sql(DEMO, `drop index fo13_probe; select 1`) === "1");
  ok("FO-13 pass: PartySearchPort's fields are columns of fo_conflict_check (hidden_count, confirmed_by, confirmed_at; contract v0.1 §3.1)",
    sql(DEMO, `select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_name = 'fo_conflict_check' and column_name in ('hidden_count', 'confirmed_by', 'confirmed_at')`) === "confirmed_at,confirmed_by,hidden_count");

  const firmA = sql(DEMO, `select id from platform_firm where key='sample-firm'`), firmB = sql(DEMO, `select id from platform_firm where key='sample-solo'`);
  const staffR = sql(DEMO, `select id from platform_staff where actor_id='user-R'`), staffT = sql(DEMO, `select id from platform_staff where actor_id='user-T'`), staffS = sql(DEMO, `select id from platform_staff where actor_id='user-S'`);
  ok("FO-13: the Sample firms and staff are there (two firms; user-R and user-T in firm A, user-S in firm B)", [firmA, firmB, staffR, staffT, staffS].every((x) => /^[0-9a-f-]{36}$/.test(x)));

  // ------------------------------------------------------------------------------------------------- conflict checks
  const P1 = u(500), C1 = u(501);
  const MATCH = JSON.stringify([
    { source: "FRONT_OFFICE", kind: "PROSPECT", recordId: u(600), displayName: "Sample Person", matchedOn: ["NAME", "EMAIL"], score: 0.92 },
    { source: "CASE", kind: "SPONSOR", recordId: "party-17", caseId: u(10), caseNumber: "C-2026-00001", matchedOn: ["PHONE"] },
  ]);
  type CC = { id: string; firm?: string; kind?: string; person?: string | null; company?: string | null; name?: string | null; email?: string | null; phone?: string | null; matches?: string; hidden?: number; result?: string | null; disclosure?: string | null; consent?: string | null; by?: string; confirmedBy?: string | null; confirmedAt?: string | null };
  const v = (x: string | null | undefined) => (x === null || x === undefined ? "null" : q(x));
  const cc = (c: CC) => {
    const kind = c.kind ?? "PERSON";
    const person = c.person === undefined ? (kind === "PERSON" ? P1 : null) : c.person, company = c.company === undefined ? (kind === "COMPANY" ? C1 : null) : c.company;
    return `insert into fo_conflict_check (id, firm_id, party_kind, person_id, company_id, searched_name, searched_email, searched_phone, matches, hidden_count, result, disclosure_text, written_consent_ref, checked_by, confirmed_by, confirmed_at)
      values ('${c.id}', '${c.firm ?? firmA}', '${kind}', ${v(person)}, ${v(company)}, ${v(c.name === undefined ? "Sample Person" : c.name)}, ${v(c.email === undefined ? "sample.person@example.com" : c.email)}, ${v(c.phone === undefined ? "+1 416 555 0100" : c.phone)},
      ${q(c.matches ?? "[]")}::jsonb, ${c.hidden ?? 0}, ${c.result === undefined ? "'NO_CONFLICT'" : v(c.result)}::"FoConflictResult", ${v(c.disclosure)}, ${v(c.consent)}, '${c.by ?? staffR}', ${v(c.confirmedBy)}, ${c.confirmedAt ? q(c.confirmedAt) : "null"}) returning id`;
  };
  ok("FO-13 pass: a person's check with no hidden matches records NO_CONFLICT, its terms and matches (kind and record)",
    sql(DEMO, cc({ id: u(1000), matches: MATCH })) === u(1000)
    && sql(DEMO, `select jsonb_array_length(matches) || ':' || (matches->1->>'kind') || ':' || (matches->1->>'caseNumber') from fo_conflict_check where id = '${u(1000)}'`) === "2:SPONSOR:C-2026-00001");
  ok("FO-13 pass: a company's check records CONFLICT_CANNOT_ACT", sql(DEMO, cc({ id: u(1001), kind: "COMPANY", name: "Sample Company Ltd", email: null, phone: null, result: "CONFLICT_CANNOT_ACT" })) === u(1001));
  ok("FO-13 fail: a check naming no party, both parties, or a party of the other kind is refused",
    refused(DEMO, cc({ id: u(1002), person: null }), /fo_conflict_check_party_check/)
    && refused(DEMO, cc({ id: u(1002), company: C1 }), /fo_conflict_check_party_check/)
    && refused(DEMO, cc({ id: u(1002), kind: "COMPANY", person: P1, company: null }), /fo_conflict_check_party_check/));
  ok("FO-13 fail: a check with no searched term, or a blank or over-long one, is refused",
    refused(DEMO, cc({ id: u(1002), name: null, email: null, phone: null }), /fo_conflict_check_terms_check/)
    && refused(DEMO, cc({ id: u(1002), name: "  ", email: null, phone: null }), /fo_conflict_check_terms_check/)
    && refused(DEMO, cc({ id: u(1002), name: "x".repeat(301) }), /fo_conflict_check_terms_check/)
    && refused(DEMO, cc({ id: u(1002), phone: "call me" }), /fo_conflict_check_terms_check/));

  // POTENTIAL_CONFLICT and its disclosure (s. 24(3)(o)) — the brief's acceptance line.
  ok("FO-13 fail (brief): a POTENTIAL_CONFLICT check without disclosure text is refused (none, or blank)",
    refused(DEMO, cc({ id: u(1003), result: "POTENTIAL_CONFLICT" }), /fo_conflict_check_disclosure_check/)
    && refused(DEMO, cc({ id: u(1003), result: "POTENTIAL_CONFLICT", disclosure: " ​ " }), /fo_conflict_check_disclosure_check/));
  ok("FO-13 pass (brief): a POTENTIAL_CONFLICT check with its disclosure text is recorded",
    sql(DEMO, cc({ id: u(1003), result: "POTENTIAL_CONFLICT", disclosure: "Sample disclosure: the firm acts for the sponsor on another file." })) === u(1003));
  ok("FO-13 fail: a disclosure text on a check that is not POTENTIAL_CONFLICT is refused",
    refused(DEMO, cc({ id: u(1004), result: "NO_CONFLICT", disclosure: "Sample" }), /fo_conflict_check_disclosure_check/));

  // Hidden matches (contract v0.1 §3.1) — the brief's acceptance line.
  ok("FO-13 fail (brief): NO_CONFLICT with hidden_count > 0 and no confirmed_by is refused",
    refused(DEMO, cc({ id: u(1005), hidden: 2 }), /fo_conflict_check_hidden_confirmed_check/));
  ok("FO-13 pass (brief): with hidden matches the check is recorded awaiting the confirmation (no result yet)",
    sql(DEMO, cc({ id: u(1005), hidden: 2, result: null })) === u(1005));
  ok("FO-13 fail: no result is refused when there is nothing hidden to wait for", refused(DEMO, cc({ id: u(1006), result: null }), /fo_conflict_check_result_check/));
  ok("FO-13 fail: the result cannot be given later without the confirmation", refused(DEMO, `update fo_conflict_check set result = 'NO_CONFLICT' where id = '${u(1005)}'`, /fo_conflict_check_hidden_confirmed_check|result is given once/));
  ok("FO-13 fail: the checker cannot confirm their own check", refused(DEMO, `update fo_conflict_check set confirmed_by = '${staffR}', confirmed_at = now(), result = 'NO_CONFLICT' where id = '${u(1005)}'`, /fo_conflict_check_confirmation_check/));
  ok("FO-13 fail: another firm's staff member cannot confirm (23503, the (firm_id, confirmed_by) key)",
    refusedCode(DEMO, `update fo_conflict_check set confirmed_by = '${staffS}', confirmed_at = now(), result = 'NO_CONFLICT' where id = '${u(1005)}'`, "23503", /fo_conflict_check_firm_id_confirmed_by_fkey/));
  ok("FO-13 fail: a confirmation without its time, or dated before the check, is refused",
    refused(DEMO, `update fo_conflict_check set confirmed_by = '${staffT}', result = 'NO_CONFLICT' where id = '${u(1005)}'`, /fo_conflict_check_confirmation_check/)
    && refused(DEMO, `update fo_conflict_check set confirmed_by = '${staffT}', confirmed_at = checked_at - interval '1 minute', result = 'NO_CONFLICT' where id = '${u(1005)}'`, /fo_conflict_check_confirmation_check/));
  ok("FO-13 pass (brief): once another staff member of the firm confirms, the check holds NO_CONFLICT",
    sql(DEMO, `update fo_conflict_check set confirmed_by = '${staffT}', confirmed_at = now(), result = 'NO_CONFLICT' where id = '${u(1005)}' returning result`) === "NO_CONFLICT");
  ok("FO-13 pass: a check written with hidden matches and confirmed at once holds NO_CONFLICT", sql(DEMO, cc({ id: u(1007), hidden: 1, confirmedBy: staffT, confirmedAt: "now" })) === u(1007));
  ok("FO-13 fail: a confirmation on a check with nothing hidden is refused", refused(DEMO, cc({ id: u(1008), confirmedBy: staffT, confirmedAt: "now" }), /fo_conflict_check_confirmation_check/));
  ok("FO-13 pass: a check with hidden matches may hold POTENTIAL_CONFLICT before the confirmation, and be confirmed later without a change of result",
    sql(DEMO, cc({ id: u(1009), hidden: 1, result: "POTENTIAL_CONFLICT", disclosure: "Sample disclosure." })) === u(1009)
    && sql(DEMO, `update fo_conflict_check set confirmed_by = '${staffT}', confirmed_at = now() where id = '${u(1009)}' returning result`) === "POTENTIAL_CONFLICT");

  // Written once; afterwards only the confirmation and the consent, once each.
  ok("FO-13 fail: a given result never changes (NO_CONFLICT → CONFLICT_CANNOT_ACT, and POTENTIAL → NO_CONFLICT)",
    refused(DEMO, `update fo_conflict_check set result = 'CONFLICT_CANNOT_ACT' where id = '${u(1000)}'`, /result is given once/)
    && refused(DEMO, `update fo_conflict_check set result = 'NO_CONFLICT', disclosure_text = null where id = '${u(1003)}'`, /result is given once/)
    && refused(DEMO, `update fo_conflict_check set disclosure_text = 'Changed' where id = '${u(1003)}'`, /result is given once/));
  ok("FO-13 fail: the confirmation never changes once given", refused(DEMO, `update fo_conflict_check set confirmed_at = now() + interval '1 hour' where id = '${u(1005)}'`, /confirmation is given once/));
  ok("FO-13 fail: what was checked and found never changes (terms, matches, hidden count, party, checker, firm)",
    refused(DEMO, `update fo_conflict_check set searched_name = 'Other' where id = '${u(1000)}'`, /never changes/)
    && refused(DEMO, `update fo_conflict_check set matches = '[]' where id = '${u(1000)}'`, /never changes/)
    && refused(DEMO, `update fo_conflict_check set hidden_count = 0 where id = '${u(1005)}'`, /never changes/)
    && refused(DEMO, `update fo_conflict_check set person_id = '${u(502)}' where id = '${u(1000)}'`, /never changes/)
    && refused(DEMO, `update fo_conflict_check set checked_by = '${staffT}' where id = '${u(1000)}'`, /never changes/)
    && refused(DEMO, `update fo_conflict_check set firm_id = '${firmB}', checked_by = '${staffS}' where id = '${u(1000)}'`, /never changes/));
  ok("FO-13 pass (s. 15(1)): the client's written consent is recorded once on a potential conflict",
    sql(DEMO, `update fo_conflict_check set written_consent_ref = 'retainer:${u(700)}' where id = '${u(1003)}' returning 1`) === "1");
  ok("FO-13 fail: the consent reference never changes once recorded, and is refused on a check that is not POTENTIAL_CONFLICT",
    refused(DEMO, `update fo_conflict_check set written_consent_ref = 'retainer:other' where id = '${u(1003)}'`, /recorded once/)
    && refused(DEMO, `update fo_conflict_check set written_consent_ref = 'retainer:x' where id = '${u(1000)}'`, /fo_conflict_check_consent_check/));

  // Matches: kind and record, of a known shape.
  const bad = (m: unknown) => refused(DEMO, cc({ id: u(1010), matches: JSON.stringify(m) }), /fo_conflict_check_matches_check/);
  const one = { source: "FRONT_OFFICE", kind: "PERSON", recordId: u(601), matchedOn: ["NAME"] };
  ok("FO-13 fail: matches that are not an array of { source, kind, recordId, matchedOn } are refused (object, missing record, unknown kind, kind of the other side, extra key, empty or unknown matchedOn, repeated matchedOn, score above 1, bad caseId)",
    bad({}) && bad([{ ...one, recordId: undefined }]) && bad([{ ...one, kind: "FRIEND" }]) && bad([{ ...one, kind: "SPONSOR" }]) && bad([{ ...one, passport: "X" }])
    && bad([{ ...one, matchedOn: [] }]) && bad([{ ...one, matchedOn: ["DOB"] }]) && bad([{ ...one, matchedOn: ["NAME", "NAME"] }]) && bad([{ ...one, score: 1.5 }])
    && bad([{ ...one, caseId: "C-1" }]) && bad([1]) && bad([{ ...one, recordId: "has space" }]) && bad(Array.from({ length: 501 }, () => one)));
  ok("FO-13 pass: 500 well-formed matches are accepted", sql(DEMO, cc({ id: u(1010), matches: JSON.stringify(Array.from({ length: 500 }, () => one)) })) === u(1010));
  ok("FO-13 fail: a negative hidden count is refused", refused(DEMO, cc({ id: u(1011), hidden: -1, result: "CONFLICT_CANNOT_ACT" }), /fo_conflict_check_hidden_count_check/));
  ok("FO-13 fail: a checker from another firm is refused (23503)", refusedCode(DEMO, cc({ id: u(1011), by: staffS }), "23503", /fo_conflict_check_firm_id_checked_by_fkey/));
  ok("FO-13 pass: firm B records its own checks with its own staff", sql(DEMO, cc({ id: u(1012), firm: firmB, by: staffS })) === u(1012));
  ok("FO-13 fail: a conflict check is never deleted or truncated",
    refusedCode(DEMO, `delete from fo_conflict_check where id = '${u(1000)}'`, "23001", /delete is refused/) && refused(DEMO, `truncate fo_conflict_check`, /truncate is refused/)
    && sql(DEMO, `select count(*) from fo_conflict_check where id = '${u(1000)}'`) === "1");

  // ------------------------------------------------------------------------------------------------- identity checks
  type IC = { id: string; method?: string; detail?: string | null; type?: string | null; country?: string | null; expiry?: string | null; last4?: string | null; key?: string | null; sha?: string | null; details?: string; by?: string; firm?: string };
  const ic = (c: IC) => `insert into fo_identity_check (id, firm_id, person_id, method, method_detail, document_type, issuing_country, document_expiry, document_number_last4, copy_file_key, copy_sha256, details_corroborated, checked_by)
    values ('${c.id}', '${c.firm ?? firmA}', '${P1}', '${c.method ?? "VIDEO"}', ${v(c.detail)}, ${c.type === undefined ? "'PASSPORT'" : v(c.type)}::"FoIdentityDocumentType", ${c.country === undefined ? "'IN'" : v(c.country)}, ${c.expiry === undefined ? "'2031-05-31'" : v(c.expiry)}::date,
      ${c.last4 === undefined ? "'K9X2'" : v(c.last4)}, ${v(c.key)}, ${v(c.sha)}, '${c.details ?? "{NAME,HOME_ADDRESS,PHONE,EMAIL}"}', '${c.by ?? staffR}') returning id`;
  const SHA = "a".repeat(64);
  ok("FO-13 pass: an identity check records method, document type, issuing country, expiry, the last 4 characters, the copy's FilesPort key and the details corroborated",
    sql(DEMO, ic({ id: u(2000), method: "DOCUMENT_COPY", key: `firm/${firmA}/identity/${u(2000)}.pdf`, sha: SHA })) === u(2000)
    && sql(DEMO, `select document_number_last4 || ':' || issuing_country || ':' || document_expiry || ':' || array_to_string(details_corroborated, ',') from fo_identity_check where id = '${u(2000)}'`) === "K9X2:IN:2031-05-31:NAME,HOME_ADDRESS,PHONE,EMAIL");
  ok("FO-13 fail (brief): a full document number never fits — 9 characters are refused (22001, VARCHAR(4)) and so is 5",
    refusedCode(DEMO, ic({ id: u(2001), last4: "P1234567K" }), "22001", /value too long for type character varying\(4\)/)
    && refusedCode(DEMO, ic({ id: u(2001), last4: "4567K" }), "22001", /character varying\(4\)/));
  ok("FO-13 fail: fewer than 4 characters, lower case or punctuation in the last 4 are refused (exactly 4 upper-case letters or digits)",
    refused(DEMO, ic({ id: u(2001), last4: "X2" }), /fo_identity_check_number_last4_check/)
    && refused(DEMO, ic({ id: u(2001), last4: "k9x2" }), /fo_identity_check_number_last4_check/)
    && refused(DEMO, ic({ id: u(2001), last4: "9-X2" }), /fo_identity_check_number_last4_check/));
  ok("FO-13 pass: an in-person check with no document named is recorded", sql(DEMO, ic({ id: u(2001), method: "IN_PERSON", type: null, country: null, expiry: null, last4: null, details: "{NAME,BUSINESS_DETAILS}" })) === u(2001));
  ok("FO-13 fail: a document named in part (type without country or last 4, or a country, expiry or copy with no type) is refused",
    refused(DEMO, ic({ id: u(2002), country: null }), /fo_identity_check_document_check/)
    && refused(DEMO, ic({ id: u(2002), last4: null }), /fo_identity_check_document_check/)
    && refused(DEMO, ic({ id: u(2002), method: "IN_PERSON", type: null, last4: null }), /fo_identity_check_document_check/)
    && refused(DEMO, ic({ id: u(2002), method: "IN_PERSON", type: null, country: null, last4: null, key: "k", sha: SHA }), /fo_identity_check_document_check/));
  ok("FO-13 fail: a DOCUMENT_COPY check without a document is refused", refused(DEMO, ic({ id: u(2002), method: "DOCUMENT_COPY", type: null, country: null, expiry: null, last4: null }), /fo_identity_check_document_copy_method_check/));
  ok("FO-13 fail: method OTHER needs what it was; with it, it is recorded",
    refused(DEMO, ic({ id: u(2002), method: "OTHER" }), /fo_identity_check_method_detail_check/)
    && sql(DEMO, ic({ id: u(2002), method: "OTHER", detail: "Sample: confirmed by the employer's HR letter" })) === u(2002));
  ok("FO-13 fail: a country that is not two upper-case letters, or an endless expiry, is refused",
    refused(DEMO, ic({ id: u(2003), country: "in" }), /fo_identity_check_country_check/) && refused(DEMO, ic({ id: u(2003), expiry: "infinity" }), /fo_identity_check_expiry_check/));
  ok("FO-13 fail: a copy key without its sha256 (a NULL CHECK passes: found while building), a sha256 without a key, a bad sha256, or a key with spaces is refused",
    refused(DEMO, ic({ id: u(2003), key: "k" }), /fo_identity_check_copy_check/) && refused(DEMO, ic({ id: u(2003), sha: SHA }), /fo_identity_check_copy_check/) && refused(DEMO, ic({ id: u(2003), key: "k", sha: "xyz" }), /fo_identity_check_copy_check/)
    && refused(DEMO, ic({ id: u(2003), key: "a b", sha: SHA }), /fo_identity_check_copy_check/));
  ok("FO-13 fail: no detail corroborated, or one twice, is refused",
    refused(DEMO, ic({ id: u(2003), details: "{}" }), /fo_identity_check_details_check/) && refused(DEMO, ic({ id: u(2003), details: "{NAME,NAME}" }), /fo_identity_check_details_check/));
  ok("FO-13 fail: a checker from another firm is refused (23503)", refusedCode(DEMO, ic({ id: u(2003), by: staffS }), "23503", /fo_identity_check_firm_id_checked_by_fkey/));
  ok("FO-13 fail: an identity check never changes, is never deleted or truncated (a correction is a new check)",
    refusedCode(DEMO, `update fo_identity_check set document_number_last4 = 'AAAA' where id = '${u(2000)}'`, "23001", /update is refused/)
    && refusedCode(DEMO, `delete from fo_identity_check where id = '${u(2000)}'`, "23001", /delete is refused/)
    && refused(DEMO, `truncate fo_identity_check`, /truncate is refused/) && sql(DEMO, `select document_number_last4 from fo_identity_check where id = '${u(2000)}'`) === "K9X2");

  // ----------------------------------------------------------------------------------------- keys to the platform's rows
  ok("FO-13 pass: the five foreign keys to the platform are RESTRICT on delete and on update",
    sql(DEMO, `select string_agg(conname || ':' || confdeltype::text || confupdtype::text, ',' order by conname) from pg_constraint where contype = 'f' and conrelid in ('fo_conflict_check'::regclass, 'fo_identity_check'::regclass)`)
      === "fo_conflict_check_firm_id_checked_by_fkey:rr,fo_conflict_check_firm_id_confirmed_by_fkey:rr,fo_conflict_check_firm_id_fkey:rr,fo_identity_check_firm_id_checked_by_fkey:rr,fo_identity_check_firm_id_fkey:rr");
  ok("FO-13 fail: a check for a firm that does not exist is refused (23503)", refusedCode(DEMO, ic({ id: u(2004), firm: u(999) }), "23503", /fo_identity_check_firm_id/));
  const lone = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'lone@sample-firm.example.com', 'Lone', now()) returning id`);
  const confirmer = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'confirmer@sample-firm.example.com', 'Confirmer', now()) returning id`);
  const checker = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'checker@sample-firm.example.com', 'Checker', now()) returning id`);
  sql(DEMO, cc({ id: u(1013), hidden: 1, confirmedBy: confirmer, confirmedAt: "now" }));
  sql(DEMO, ic({ id: u(2005), by: checker }));
  ok("FO-13 pass: a staff member no check names can still be deleted", sql(DEMO, `delete from platform_staff where id = '${lone}' returning 1`) === "1");
  ok("FO-13 fail: a staff member who confirmed a conflict check, or checked an identity, cannot be deleted or change id (RESTRICT: 23001)",
    refusedCode(DEMO, `delete from platform_staff where id = '${confirmer}'`, "23001", /violates RESTRICT setting of foreign key constraint "fo_conflict_check_firm_id_confirmed_by_fkey"/)
    && refusedCode(DEMO, `delete from platform_staff where id = '${checker}'`, "23001", /violates RESTRICT setting of foreign key constraint "fo_identity_check_firm_id_checked_by_fkey"/)
    && refusedCode(DEMO, `update platform_staff set id = gen_random_uuid() where id = '${checker}'`, "23001", /fo_identity_check_firm_id_checked_by_fkey/));
  const firmF = sql(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-f', 'F', 'CA', 'f@firm-f.example.com', now()) returning id`);
  ok("FO-13 pass: a firm with no check can still be deleted", sql(DEMO, `delete from platform_firm where id = '${firmF}' returning 1`) === "1");
  ok("FO-13: person, company and prospect ids carry no foreign key yet (FO-1a is not on main; FO-1k adds them, rows rev 16)",
    sql(DEMO, `select count(*) from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey) where c.contype = 'f' and c.conrelid in ('fo_conflict_check'::regclass, 'fo_identity_check'::regclass) and a.attname in ('person_id', 'company_id', 'prospect_id')`) === "0");
  ok("FO-13: no full-number column — no column is named like a document number other than its last 4, a password or a secret",
    sql(DEMO, `select count(*) from information_schema.columns where table_name = any('{${TABLES.join(",")}}') and (column_name ~ '(number|password|secret|token)' and column_name <> 'document_number_last4')`) === "0");
  ok("FO-13: every date-time column is timestamptz (the expiry is a calendar date)",
    sql(DEMO, `select coalesce(string_agg(table_name || '.' || column_name, ','), '') from information_schema.columns where table_name = any('{${TABLES.join(",")}}') and data_type in ('timestamp without time zone', 'time without time zone', 'time with time zone', 'date') and column_name <> 'document_expiry'`) === "");
} finally {
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
