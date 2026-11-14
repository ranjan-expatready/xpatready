// FO-7a (P-558, P-559, P-575 (1), P-599, P-600; BACKLOG row FO-7a rows rev 7, rev 10 part 2, rev 13; contracts §2.5,
// §7 §2.5, §8; AG-6-1, -4, -19, -44, -46, -59, -60, -61, -63, -69, -73, -76; Code SOR/2022-128 s. 32, s. 33(3),
// Unconfirmed: no counsel): the client-money tables and their database rules. Every line of the row's "Done when" plus
// the rev 13 lines, each with a passing and a failing case; numbers under 20 parallel writers and trust withdrawals and
// moves under parallel writers are proved on real connections (READ COMMITTED and REPEATABLE READ). Three scratch
// databases: "empty" gets every migration; "demo" gets every migration before FO-7a's, then demo-shaped rows (Sample
// cases, an audit line, the Sample firms and staff), then FO-7a's migration and any later one; "bare" stops before it.
// No server, no browser, no model call, no Stripe call (US$0). All are dropped at the end.
//   tsx studio/tests/check_fo7a_money_schema.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114131305_fo7a_client_money_tables", PF3 = "20261114015002_pf3_platform_tables";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_fo7a_empty_${process.pid}`, DEMO = `xr_studio_fo7a_demo_${process.pid}`, BARE = `xr_studio_fo7a_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `fo7a-check-${process.pid}`);
const TABLES = ["money_payment_settings", "money_payment_account", "money_number_series", "money_invoice", "money_invoice_line", "money_credit_note",
  "money_payment", "money_refund", "money_receipt", "money_trust_request", "money_trust_entry", "money_write_off", "money_move_batch", "money_move_line"];
const INSERT_ONLY = ["money_credit_note", "money_refund", "money_receipt", "money_trust_entry", "money_write_off", "money_move_batch", "money_move_line"];

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
// Several statements in one transaction (psql -c): the last statement's result.
const sqlLast = (db: string, q: string) => sql(db, q).split("\n").at(-1) ?? "";
// Refused with a message matching re (and, with code, this SQLSTATE: psql's verbose errors print "ERROR:  <code>: …").
const refused = (db: string, q: string, re: RegExp, code?: string) => {
  try { psql(db, ["-v", "VERBOSITY=verbose", "-Atc", q]); return false; }
  catch (e) { const err = String((e as { stderr?: string }).stderr ?? e); return re.test(err) && (!code || err.includes(`ERROR:  ${code}:`)); }
};
const client = (db: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), options: "-c TimeZone=UTC" }) });
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// prisma migrate diff from a database to the schema folder: the lines that name a money table or type.
function moneyDiff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /money_|Money[A-Z]/.test(l));
}
const indexesNotFirmFirst = (db: string) => sql(db, `select coalesce(string_agg(ic.relname, ',' order by ic.relname), '') from pg_index i
  join pg_class c on c.oid = i.indrelid join pg_class ic on ic.oid = i.indexrelid
  left join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
  where c.relnamespace = 'public'::regnamespace and c.relname like 'money\\_%' and not i.indisprimary and coalesce(a.attname, '') <> 'firm_id'
    and ic.relname <> 'money_payment_account_stripe_account_id_key'`);

// n real connections, each in its own transaction at the given isolation, each holding a snapshot before any writes;
// then each runs its statement at once and commits. Returns per writer the first row's first value or the SQLSTATE.
const conns: pg.Client[] = [];
async function race(n: number, stmt: (i: number) => string, iso = "read committed"): Promise<{ value?: string; code?: string; message?: string }[]> {
  const cs = await Promise.all(Array.from({ length: n }, async () => { const c = new pg.Client({ connectionString: urlOf(DEMO) }); await c.connect(); conns.push(c); return c; }));
  for (const c of cs) { await c.query(`begin isolation level ${iso}`); await c.query("select 1 from money_payment_settings limit 1"); }
  const out = await Promise.all(cs.map(async (c, i) => {
    try {
      const res = await c.query(stmt(i)) as unknown as pg.QueryResult | pg.QueryResult[];
      const r = Array.isArray(res) ? res[res.length - 1] : res;
      await c.query("commit"); const row = r.rows[0]; return { value: row ? String(Object.values(row)[0]) : "" };
    }
    catch (e) { await c.query("rollback").catch(() => undefined); const err = e as { code?: string; message?: string }; return { code: err.code, message: err.message }; }
  }));
  for (const c of cs) { await c.end(); conns.splice(conns.indexOf(c), 1); }
  return out;
}
// Numbers n..m with a prefix, as the database formats them (4 digits, growing past 9999).
const series = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => `${prefix}${String(from + k).padStart(4, "0")}`);

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
try {
  const newest = all.filter((d) => d < NEW).at(-1) ?? "";
  ok(`FO-7a: the migration has its own stamp, later than every one before it (newest before it: ${newest}; P-348 (8), P-600 (4)), and after PF-3's`,
    all.includes(NEW) && newest >= PF3 && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));

  // ---------------------------------------------------------------------- migration on empty and demo-data copies
  for (const d of all.filter((x) => x < NEW)) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-7a fail: before FO-7a's migration there is no money_ table and the schema differs (diff names money_invoice)",
    sql(BARE, `select count(*) from pg_tables where tablename like 'money\\_%'`) === "0" && moneyDiff(BARE).some((l) => /money_invoice/.test(l)));
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-7a pass: every migration applies to an empty database; the fourteen money_ tables exist",
    sql(EMPTY, `select count(*) from pg_tables where schemaname='public' and tablename = any('{${TABLES.join(",")}}')`) === String(TABLES.length));
  ok("FO-7a pass: migrate diff from the migrated empty database to the schema names no money table or type", moneyDiff(EMPTY).length === 0, moneyDiff(EMPTY));
  ok("FO-7a fail: the migration does not apply twice (it is never re-run silently)", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  for (const d of all.filter((x) => x < NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  const W = u(1), CMB = u(2);
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values
      ('${u(10)}', '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001'), ('${u(12)}', '${W}', '${CMB}', 'user-P', 'user-S', 'sample-solo', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, action, entity, summary) values (gen_random_uuid(), '${W}', 'user-R', 'case.open', 'runtime_case', 'Sample');`);
  const pre = client(DEMO); dbs.push(pre);
  await seedSampleFirms(pre);
  await pre.$disconnect();
  const demoRows = `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select count(*) from platform_firm) || ':' || (select count(*) from platform_staff) || ':' || (select string_agg(id::text, ',' order by id) from platform_firm)`;
  const before = sql(DEMO, demoRows);
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-7a pass: the migration applies to a demo-data copy (cases, audit, the Sample firms and staff) and leaves its rows as they were", sql(DEMO, demoRows) === before, before);
  ok("FO-7a pass: migrate diff after it on the demo-data copy names no money table or type", moneyDiff(DEMO).length === 0, moneyDiff(DEMO));

  // ------------------------------------------------------------------------------------------------ the table shape
  ok("FO-7a pass: firm_id is first in every index of every money_ table (primary keys aside), but the one global index on the Stripe account id (webhooks are routed by it before the firm is known; review round 1, m1)",
    indexesNotFirmFirst(DEMO) === "" && sql(DEMO, `select indexdef from pg_indexes where indexname = 'money_payment_account_stripe_account_id_key'`).includes("UNIQUE INDEX money_payment_account_stripe_account_id_key ON public.money_payment_account USING btree (stripe_account_id)"), indexesNotFirmFirst(DEMO));
  ok("FO-7a fail: this check sees an index without firm_id first (one made and dropped for the test)",
    (sql(DEMO, `create index money_tmp_bad on money_invoice (number)`), indexesNotFirmFirst(DEMO) === "money_tmp_bad") && (sql(DEMO, `drop index money_tmp_bad`), indexesNotFirmFirst(DEMO) === ""));
  ok("FO-7a pass: every amount is an integer — every *_minor column is integer, and no money_ column is a float or a decimal",
    sql(DEMO, `select count(*) from information_schema.columns where table_name like 'money\\_%' and column_name like '%\\_minor' and data_type <> 'integer'`) === "0"
    && sql(DEMO, `select count(*) from information_schema.columns where table_name like 'money\\_%' and column_name like '%\\_minor'`) === "11"
    && sql(DEMO, `select count(*) from information_schema.columns where table_name like 'money\\_%' and data_type in ('real', 'double precision', 'numeric', 'money')`) === "0");
  ok("FO-7a pass: every table with an amount carries its currency, as an enum of CAD and USD",
    sql(DEMO, `select coalesce(string_agg(distinct c.table_name, ','), '') from information_schema.columns c where c.table_name like 'money\\_%' and c.column_name like '%\\_minor'
      and not exists (select 1 from information_schema.columns d where d.table_name = c.table_name and d.column_name = 'currency')`) === ""
    && sql(DEMO, `select string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'MoneyCurrency'`) === "CAD,USD");
  ok("FO-7a pass: no workspace_id (the demo reset leaves these rows), every instant is timestamptz, only due_date and transfer_date are dates",
    sql(DEMO, `select count(*) from information_schema.columns where table_name like 'money\\_%' and column_name = 'workspace_id'`) === "0"
    && sql(DEMO, `select coalesce(string_agg(table_name || '.' || column_name, ',' order by table_name, column_name), '') from information_schema.columns where table_name like 'money\\_%' and data_type in ('timestamp without time zone', 'date', 'time without time zone', 'time with time zone')`) === "money_invoice.due_date,money_move_batch.transfer_date");
  ok("FO-7a: no secret column — no money_ column is named like a password, secret, token or API key (AG-16-18)",
    sql(DEMO, `select count(*) from information_schema.columns where table_name like 'money\\_%' and column_name ~ '(password|secret|token|api_key|access_key)'`) === "0");
  // ------------------------------------------------------------------------------------------- settings and account
  const firmA = sql(DEMO, `select id from platform_firm where key='sample-firm'`), firmB = sql(DEMO, `select id from platform_firm where key='sample-solo'`);
  const settings = (f: string) => `insert into money_payment_settings (firm_id, updated_by, updated_at) values ('${f}', 'user-O', now()) returning trust_enabled || ':' || default_currency || ':' || due_in_days || ':' || tax_rates::text`;
  ok("FO-7a pass (AG-6-59, -46): a firm's money settings start with trust off, CAD, due in 14 days and no tax rates", sql(DEMO, settings(firmA)) === "false:CAD:14:[]" && sql(DEMO, settings(firmB)) === "false:CAD:14:[]");
  ok("FO-7a fail: money settings for a firm that does not exist are refused (23503), and a second row for a firm is refused",
    refused(DEMO, settings(u(999)), /money_payment_settings_firm_id_fkey/, "23503") && refused(DEMO, settings(firmA), /money_payment_settings_pkey/, "23505"));
  ok("FO-7a pass: the firm's tax rates are a list of names and rates in parts per million (Sample HST 13 %; Quebec's QST 9.975 % is exact; review round 2, Major 1)",
    sql(DEMO, `update money_payment_settings set tax_rates = '[{"name":"HST","ratePpm":130000},{"name":"GST","ratePpm":50000},{"name":"QST","ratePpm":99750}]', trust_enabled = true where firm_id = '${firmA}' returning 1`) === "1");
  ok("FO-7a fail: tax rates that are not a list of { name, ratePpm 0..1000000 } are refused",
    refused(DEMO, `update money_payment_settings set tax_rates = '{"name":"HST"}' where firm_id = '${firmA}'`, /money_payment_settings_tax_rates_check/)
    && refused(DEMO, `update money_payment_settings set tax_rates = '[{"name":"HST","ratePpm":99750.5}]' where firm_id = '${firmA}'`, /money_payment_settings_tax_rates_check/)
    && refused(DEMO, `update money_payment_settings set tax_rates = '[{"name":"HST","ratePpm":2000000}]' where firm_id = '${firmA}'`, /money_payment_settings_tax_rates_check/));
  ok("FO-7a fail: a firm's money settings never move to another firm", refused(DEMO, `update money_payment_settings set firm_id = '${firmB}' where firm_id = '${firmA}'`, /firm_id never changes|money_payment_settings_pkey/));
  const acct = (f: string, id: string | null, status: string, charges = false) =>
    `insert into money_payment_account (firm_id, stripe_account_id, status, charges_enabled, updated_at) values ('${f}', ${id ? `'${id}'` : "null"}, '${status}', ${charges}, now()) on conflict (firm_id) do update set stripe_account_id = excluded.stripe_account_id, status = excluded.status, charges_enabled = excluded.charges_enabled returning status`;
  ok("FO-7a pass (AG-16-14..18): the payment account starts NOT_CONNECTED, then PENDING and ACTIVE with charges on, with the firm's own acct_ id",
    sql(DEMO, acct(firmA, null, "NOT_CONNECTED")) === "NOT_CONNECTED" && sql(DEMO, acct(firmA, "acct_1SampleA", "PENDING")) === "PENDING" && sql(DEMO, acct(firmA, "acct_1SampleA", "ACTIVE", true)) === "ACTIVE");
  ok("FO-7a fail: an ACTIVE account without an id, charges on while PENDING, a malformed id, or another firm's account id are refused",
    refused(DEMO, acct(firmB, null, "ACTIVE"), /money_payment_account_status_check/) && refused(DEMO, acct(firmB, "acct_1SampleB", "PENDING", true), /money_payment_account_status_check/)
    && refused(DEMO, acct(firmB, "sk_live_123", "PENDING"), /money_payment_account_id_check/) && refused(DEMO, acct(firmB, "acct_1SampleA", "PENDING"), /money_payment_account_stripe_account_id_key/, "23505"));

  {
    sql(DEMO, `delete from money_payment_account where firm_id = '${firmB}'`);
    const firmC = sql(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-c', 'C', 'CA', 'c@firm-c.example.com', now()) returning id`);
    sql(DEMO, settings(firmC));
    const two = await race(2, (i) => acct([firmB, firmC][i], "acct_1Race", "PENDING"), "repeatable read");
    ok("FO-7a fail (parallel, REPEATABLE READ; review round 1 m1, break B-3): two firms connecting one Stripe account at once — one holds it, the other is refused (23505)",
      two.filter((r) => r.value === "PENDING").length === 1 && two.filter((r) => r.code === "23505").length === 1
      && sql(DEMO, `select count(*) from money_payment_account where stripe_account_id = 'acct_1Race'`) === "1", two);
  }
  // --------------------------------------------------------------------------------------------------------- invoices
  const P1 = u(500), P2 = u(501), C1 = u(502);
  const draft = (id: string, f = firmA, party = `person_id`, pid = P1, cur = "CAD") =>
    `insert into money_invoice (id, firm_id, ${party}, currency, due_date, created_by, updated_at) values ('${id}', '${f}', '${pid}', '${cur}', '2026-12-15', 'user-R', now()) returning id`;
  // bp: the rate in basis points for readability; the column holds parts per million (bp × 100; 1497.5 bp = 149750 ppm).
  const line = (inv: string, pos: number, kind: string, qty: number, unit: number, bp: number, tax: number, f = firmA, cur = "CAD") =>
    `insert into money_invoice_line (id, firm_id, invoice_id, position, kind, description, quantity, unit_amount_minor, amount_minor, tax_rate_ppm, tax_minor, currency) values (gen_random_uuid(), '${f}', '${inv}', ${pos}, '${kind}', 'Line ${pos}', ${qty}, ${unit}, ${qty * unit}, ${bp * 100}, ${tax}, '${cur}') returning id`;
  const issue = (inv: string) => `update money_invoice set issued_at = now(), issued_by = 'user-R' where id = '${inv}' returning number`;
  const I1 = u(600);
  ok("FO-7a pass (AG-6-1 rule 4): an invoice is written as a draft with no number, on a person", sql(DEMO, draft(I1)) === I1 && sql(DEMO, `select coalesce(number, '-') from money_invoice where id = '${I1}'`) === "-");
  ok("FO-7a fail: an invoice on both a person and a company, or on neither, is refused (party = a person or a company, AG-6-1 rule 1)",
    refused(DEMO, `insert into money_invoice (firm_id, person_id, company_id, created_by, updated_at) values ('${firmA}', '${P1}', '${C1}', 'user-R', now())`, /money_invoice_party_check/)
    && refused(DEMO, `insert into money_invoice (firm_id, created_by, updated_at) values ('${firmA}', 'user-R', now())`, /money_invoice_party_check/));
  ok("FO-7a fail (AG-6-44 rule 7): a draft written with a number, or given a number by hand, is refused; the number is the database's",
    refused(DEMO, `insert into money_invoice (firm_id, person_id, number, created_by, updated_at) values ('${firmA}', '${P1}', 'INV-0001', 'user-R', now())`, /written as a draft/)
    && refused(DEMO, `update money_invoice set number = 'INV-0001' where id = '${I1}'`, /number and the times are the database's/));
  ok("FO-7a fail: an invoice with no lines is not issued", refused(DEMO, issue(I1), /no lines is not issued/));
  ok("FO-7a pass (AG-6-4): a fee line taxed at 13 % (1,000.00 → 130.00) and a government fee line with no tax are added to the draft",
    !!sql(DEMO, line(I1, 1, "FEE", 1, 100000, 1300, 13000)) && !!sql(DEMO, line(I1, 2, "GOVERNMENT_FEE", 1, 25500, 0, 0)));
  ok("FO-7a fail (AG-6-4 rule 3): a government fee line with a tax rate or tax is refused",
    refused(DEMO, line(I1, 3, "GOVERNMENT_FEE", 1, 25500, 1300, 3315), /money_invoice_line_government_fee_untaxed/) && refused(DEMO, line(I1, 3, "GOVERNMENT_FEE", 1, 25500, 0, 1), /money_invoice_line_(government_fee_untaxed|tax_check)/));
  ok("FO-7a fail: a line whose amount is not quantity × unit amount, a negative unit amount, or a line in another currency is refused",
    refused(DEMO, `insert into money_invoice_line (firm_id, invoice_id, position, kind, description, quantity, unit_amount_minor, amount_minor, currency) values ('${firmA}', '${I1}', 3, 'FEE', 'x', 2, 100, 150, 'CAD')`, /money_invoice_line_amount_check/)
    && refused(DEMO, line(I1, 3, "FEE", 1, -100, 0, 0), /money_invoice_line_amount_check/) && refused(DEMO, line(I1, 3, "FEE", 1, 100, 0, 0, firmA, "USD"), /invoice's currency/));
  ok("FO-7a fail: an amount that is not a whole number of cents is refused (\"10.5\" into unit_amount_minor and amount_minor)",
    refused(DEMO, `insert into money_invoice_line (firm_id, invoice_id, position, kind, description, quantity, unit_amount_minor, amount_minor, currency) values ('${firmA}', '${I1}', 3, 'FEE', 'x', 1, '10.5', '10.5', 'CAD')`, /invalid input syntax for type integer/));
  ok("FO-7a fail: a firm B line on firm A's invoice is refused (23503; the check finds no such invoice in firm B, and the composite key would too)", refused(DEMO, line(I1, 3, "FEE", 1, 100, 0, 0, firmB), /invoice .* is not visible to this statement \(not in the firm/, "23503"));
  ok("FO-7a fail: a tax more than a cent from the line's amount at its rate is refused — 2,000,000,000 tax on a 1-cent line, or 130.02 on 1,000.00 at 13 %",
    refused(DEMO, line(I1, 3, "FEE", 1, 1, 1300, 2000000000), /money_invoice_line_tax_check/) && refused(DEMO, line(I1, 3, "FEE", 1, 100000, 1300, 13002), /money_invoice_line_tax_check/));
  ok("FO-7a pass (review round 2, Major 1; AG-6-4 rule 1): a Quebec line, GST + QST 14.975 % (149750 ppm) on 1,000.00 = 149.75, and on 3.33 with the two taxes rounded apart (0.17 + 0.33 = 0.50 against 0.4987)",
    !!sql(DEMO, `begin; ${line(I1, 3, "FEE", 1, 100000, 1497.5, 14975)}; rollback;`) && !!sql(DEMO, `begin; ${line(I1, 3, "FEE", 1, 333, 1497.5, 50)}; rollback;`)
    && !!sql(DEMO, `begin; ${line(I1, 3, "FEE", 1, 85000, 1300, 11050)}; rollback;`));
  ok("FO-7a pass: issuing takes the firm's first number, INV-0001 (AG-6-44 rule 1), stamped now even when the caller sends another time (break B-10: no backdating)",
    sql(DEMO, `update money_invoice set issued_at = '1999-01-01', issued_by = 'user-R' where id = '${I1}' returning number`) === "INV-0001"
    && sql(DEMO, `select issued_at > now() - interval '1 minute' from money_invoice where id = '${I1}'`) === "t");
  {
    const big = u(613);
    sql(DEMO, draft(big)); sql(DEMO, line(big, 1, "FEE", 1, 2147483647, 0, 0)); sql(DEMO, line(big, 2, "FEE", 1, 1, 0, 0));
    ok("FO-7a fail: an invoice whose total is past what one amount column holds (21,474,836.47) is not issued",
      refused(DEMO, issue(big), /more than one invoice can hold/) && sql(DEMO, `delete from money_invoice_line where invoice_id = '${big}' and position = 2 returning 1`) === "1"
      && !!sql(DEMO, `begin; ${issue(big)}; rollback;`));
  }
  const frozen = /issued invoices can't be edited — use a credit note/;
  ok("FO-7a fail (AG-6-1 rule 6): an issued invoice's lines, tax, party, currency and number refuse change; it is never deleted",
    refused(DEMO, `update money_invoice_line set unit_amount_minor = 1, amount_minor = 1 where invoice_id = '${I1}' and position = 1`, frozen)
    && refused(DEMO, `update money_invoice_line set tax_rate_ppm = 50000, tax_minor = 5000 where invoice_id = '${I1}' and position = 1`, frozen)
    && refused(DEMO, line(I1, 3, "FEE", 1, 100, 0, 0), frozen) && refused(DEMO, `delete from money_invoice_line where invoice_id = '${I1}'`, frozen)
    && refused(DEMO, `update money_invoice set person_id = '${P2}' where id = '${I1}'`, frozen) && refused(DEMO, `update money_invoice set person_id = null, company_id = '${C1}' where id = '${I1}'`, frozen)
    && refused(DEMO, `update money_invoice set currency = 'USD' where id = '${I1}'`, frozen) && refused(DEMO, `update money_invoice set number = 'INV-0099' where id = '${I1}'`, frozen)
    && refused(DEMO, `update money_invoice set issued_at = null, issued_by = null, number = null where id = '${I1}'`, frozen) && refused(DEMO, `delete from money_invoice where id = '${I1}'`, frozen)
    && sql(DEMO, `select number || ':' || person_id || ':' || currency || ':' || (select sum(amount_minor + tax_minor) from money_invoice_line where invoice_id = '${I1}') from money_invoice where id = '${I1}'`) === `INV-0001:${P1}:CAD:138500`);
  ok("FO-7a pass (AG-6-46 rule 2): an issued invoice's due date may still change", sql(DEMO, `update money_invoice set due_date = '2027-01-15' where id = '${I1}' returning due_date`) === "2027-01-15");
  const D1 = u(601);
  sql(DEMO, draft(D1)); sql(DEMO, line(D1, 1, "FEE", 1, 5000, 0, 0));
  ok("FO-7a pass (AG-6-1 rule 4): a draft's lines change and a draft (lines first) is deleted, using no number",
    sql(DEMO, `update money_invoice_line set unit_amount_minor = 6000, amount_minor = 6000 where invoice_id = '${D1}' returning amount_minor`) === "6000"
    && sql(DEMO, `delete from money_invoice_line where invoice_id = '${D1}' returning 1`) === "1" && sql(DEMO, `delete from money_invoice where id = '${D1}' returning 1`) === "1"
    && sql(DEMO, `select next_number from money_number_series where firm_id = '${firmA}' and kind = 'INVOICE'`) === "2");
  ok("FO-7a fail: an issue without a due date is refused (and gives its number back)",
    (sql(DEMO, draft(D1)), sql(DEMO, line(D1, 1, "FEE", 1, 5000, 0, 0)), refused(DEMO, `update money_invoice set due_date = null, issued_at = now(), issued_by = 'user-R' where id = '${D1}'`, /money_invoice_issue_check/))
    && sql(DEMO, `select next_number from money_number_series where firm_id = '${firmA}' and kind = 'INVOICE'`) === "2");

  // ---------------------------------------------------------------------------- numbers: no repeat, no skip, ever
  const drafts20 = Array.from({ length: 20 }, (_, k) => u(700 + k));
  for (const id of drafts20) { sql(DEMO, draft(id, firmA, "person_id", P2)); sql(DEMO, line(id, 1, "FEE", 1, 10000, 1300, 1300)); }
  const issued = await race(20, (i) => issue(drafts20[i]));
  const invNums = issued.map((r) => r.value ?? `ERR ${r.code} ${r.message}`).sort();
  ok("FO-7a pass (AG-6-44 rule 9, AG-6-1 rule 5): 20 parallel issues on 20 connections take INV-0002 … INV-0021 — no repeat, no skip (D1, refused above, used none)",
    JSON.stringify(invNums) === JSON.stringify(series("INV-", 2, 21)), invNums);
  sql(DEMO, `begin; ${issue(D1)}; rollback;`);
  ok("FO-7a fail → pass: an issue rolled back gives its number back; the next issue takes it (INV-0022), so no gap", sql(DEMO, issue(D1)) === "INV-0022");
  ok("FO-7a fail: next_number never goes back (numbers are never reused) and a series row is never deleted",
    refused(DEMO, `update money_number_series set next_number = 5 where firm_id = '${firmA}' and kind = 'INVOICE'`, /cannot go back|moves only by taking one/)
    && refused(DEMO, `delete from money_number_series where firm_id = '${firmA}' and kind = 'INVOICE'`, /never deleted/));
  ok("FO-7a pass (AG-6-44 rule 1): another firm counts on its own from INV-0001",
    (sql(DEMO, draft(u(800), firmB)), sql(DEMO, line(u(800), 1, "FEE", 1, 100, 0, 0, firmB)), sql(DEMO, issue(u(800)))) === "INV-0001");
  ok("FO-7a fail (break B-6; review round 2, Minor 3): once a series has given numbers it moves only by taking one — a jump, or a direct \"+ 1\" that would skip a number, is refused",
    refused(DEMO, `update money_number_series set next_number = 9999 where firm_id = '${firmB}' and kind = 'INVOICE'`, /moves only by taking one/)
    && refused(DEMO, `update money_number_series set next_number = next_number + 1 where firm_id = '${firmB}' and kind = 'INVOICE'`, /moves only by taking one/)
    && refused(DEMO, `update money_number_series set numbers_taken = 0 where firm_id = '${firmB}' and kind = 'INVOICE'`, /moves only by taking one/));
  ok("FO-7a pass (AG-6-44 rule 2; review round 2, Minor 3): before its first number a firm may correct its starting number, or remove the series",
    sql(DEMO, `insert into money_number_series (firm_id, kind, prefix, next_number) values ('${firmB}', 'TRUST_REQUEST', 'DR-', 2418) returning next_number`) === "2418"
    && sql(DEMO, `update money_number_series set next_number = 2400 where firm_id = '${firmB}' and kind = 'TRUST_REQUEST' returning next_number`) === "2400"
    && sql(DEMO, `delete from money_number_series where firm_id = '${firmB}' and kind = 'TRUST_REQUEST' returning 1`) === "1"
    && refused(DEMO, `insert into money_number_series (firm_id, kind, prefix, numbers_taken) values ('${firmB}', 'TRUST_REQUEST', 'DR-', 3)`, /numbers_taken is the database's/));
  const firmG = sql(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-g', 'G', 'CA', 'g@firm-g.example.com', now()) returning id`);
  sql(DEMO, settings(firmG));
  ok("FO-7a pass (AG-6-44 rules 1-2): a firm moving over sets its first number when it writes the series (9999), and INV-9999 is followed by INV-10000",
    sql(DEMO, `insert into money_number_series (firm_id, kind, prefix, next_number) values ('${firmG}', 'INVOICE', 'INV-', 9999) returning next_number`) === "9999"
    && (sql(DEMO, draft(u(801), firmG)), sql(DEMO, line(u(801), 1, "FEE", 1, 100, 0, 0, firmG)), sql(DEMO, issue(u(801)))) === "INV-9999"
    && (sql(DEMO, draft(u(802), firmG)), sql(DEMO, line(u(802), 1, "FEE", 1, 100, 0, 0, firmG)), sql(DEMO, issue(u(802)))) === "INV-10000");
  ok("FO-7a fail (break B-6; review round 2, Minor 4): another series' default prefix, or a prefix with a digit or no dash, is refused",
    refused(DEMO, `insert into money_number_series (firm_id, kind, prefix) values ('${firmG}', 'CREDIT_NOTE', 'INV-')`, /money_number_series_default_prefix_check/)
    && refused(DEMO, `update money_number_series set prefix = 'CN-' where firm_id = '${firmG}' and kind = 'INVOICE'`, /money_number_series_default_prefix_check/)
    && refused(DEMO, `update money_number_series set prefix = 'CN1-' where firm_id = '${firmG}' and kind = 'INVOICE'`, /money_number_series_prefix_check/)
    && refused(DEMO, `update money_number_series set prefix = 'CN' where firm_id = '${firmG}' and kind = 'INVOICE'`, /money_number_series_prefix_check/));
  ok("FO-7a pass (AG-6-44 rule 5): a prefix change applies to the next number only (TOR-10001)",
    sql(DEMO, `update money_number_series set prefix = 'TOR-' where firm_id = '${firmG}' and kind = 'INVOICE' returning prefix`) === "TOR-"
    && (sql(DEMO, draft(u(803), firmG)), sql(DEMO, line(u(803), 1, "FEE", 1, 100, 0, 0, firmG)), sql(DEMO, issue(u(803)))) === "TOR-10001"
    && sql(DEMO, `select number from money_invoice where id = '${u(802)}'`) === "INV-10000");
  ok("FO-7a fail (break B-6): two series of a firm sharing a prefix is refused (23505)",
    refused(DEMO, `insert into money_number_series (firm_id, kind, prefix) values ('${firmG}', 'CREDIT_NOTE', 'TOR-')`, /money_number_series_firm_id_prefix_key/, "23505"));
  ok("FO-7a fail: a hand-made number that repeats one already issued in the firm is refused by the unique index", refused(DEMO, `alter table money_invoice disable trigger money_invoice_write; update money_invoice set number = 'INV-0001' where id = '${u(700)}'`, /money_invoice_firm_id_number_key/, "23505")
    && sql(DEMO, `select count(*) from pg_trigger where tgname = 'money_invoice_write' and tgenabled = 'O'`) === "1");

  // ------------------------------------------------------------------------------------------ payments and refunds
  const pay = (id: string, key: string, opts: { inv?: string; req?: string; method?: string; into?: string; amount?: number; pi?: string; f?: string; cur?: string; cleared?: boolean } = {}) =>
    `insert into money_payment (id, firm_id, invoice_id, trust_request_id, method, amount_minor, currency, received_into, received_at, stripe_payment_intent_id, idempotency_key, recorded_by, cleared) values ('${id}', '${opts.f ?? firmA}', ${opts.inv ? `'${opts.inv}'` : "null"}, ${opts.req ? `'${opts.req}'` : "null"}, '${opts.method ?? "E_TRANSFER"}', ${opts.amount ?? 1000}, '${opts.cur ?? "CAD"}', '${opts.into ?? "OPERATING"}', now(), ${opts.pi ? `'${opts.pi}'` : "null"}, '${key}', ${(opts.method ?? "E_TRANSFER") === "CARD" ? "null" : "'user-R'"}, ${opts.cleared ?? true}) returning id`;
  ok("FO-7a pass (AG-6-19): an offline e-transfer and a card payment (with its payment intent) are recorded on an issued invoice",
    sql(DEMO, pay(u(900), "key-offline-0001", { inv: I1, amount: 50000 })) === u(900) && sql(DEMO, pay(u(901), "key-card-0000001", { inv: I1, method: "CARD", amount: 20000, pi: "pi_3SampleA" })) === u(901));
  ok("FO-7a fail: the same idempotency key twice in a firm, or the same payment intent id twice, is refused (a double click or a repeated webhook records one payment)",
    refused(DEMO, pay(u(902), "key-offline-0001", { inv: I1 }), /money_payment_firm_id_idempotency_key_key/, "23505")
    && refused(DEMO, pay(u(902), "key-card-0000002", { inv: I1, method: "CARD", pi: "pi_3SampleA" }), /money_payment_firm_id_stripe_payment_intent_id_key/, "23505"));
  ok("FO-7a pass: two parallel writers with one idempotency key record one payment (the other is refused 23505)",
    await race(2, (i) => pay(u(903 + i), "key-double-click", { inv: I1 })).then((r) => r.filter((x) => x.value).length === 1 && r.filter((x) => x.code === "23505").length === 1));
  ok("FO-7a fail: a payment on a draft invoice, in another currency, card into trust (contracts §7 §2.5), or a payment intent on an offline payment is refused",
    (sql(DEMO, draft(u(610))), refused(DEMO, pay(u(905), "key-draft-00001", { inv: u(610) }), /draft invoice takes no payment/))
    && refused(DEMO, pay(u(905), "key-usd-0000001", { inv: I1, cur: "USD" }), /invoice's currency/)
    && refused(DEMO, pay(u(905), "key-card-trust1", { method: "CARD", into: "TRUST", pi: "pi_3Trust" }), /money_payment_card_not_trust/)
    && refused(DEMO, pay(u(905), "key-pi-offline1", { inv: I1, pi: "pi_3Offline" }), /money_payment_intent_check/));
  ok("FO-7a fail: a firm B payment on firm A's invoice is refused (23503; no such invoice in firm B)", refused(DEMO, pay(u(905), "key-cross-00001", { inv: I1, f: firmB }), /invoice .* is not visible to this statement \(not in the firm/, "23503"));
  ok("FO-7a pass (AG-6-63 rule 7): a cheque waits to clear and is ticked Cleared once",
    sql(DEMO, pay(u(906), "key-cheque-0001", { inv: I1, method: "CHEQUE", amount: 1000, cleared: false })) === u(906)
    && sql(DEMO, `update money_payment set cleared = true, cleared_at = now(), cleared_by = 'user-R' where id = '${u(906)}' returning cleared`) === "t");
  ok("FO-7a fail: a payment never changes (amount, or un-clearing) and is never deleted",
    refused(DEMO, `update money_payment set amount_minor = 1 where id = '${u(900)}'`, /a payment never changes/) && refused(DEMO, `update money_payment set cleared = false, cleared_at = null, cleared_by = null where id = '${u(906)}'`, /a payment never changes/)
    && refused(DEMO, `delete from money_payment where id = '${u(900)}'`, /never deleted/) && refused(DEMO, `truncate money_payment cascade`, /never changed or removed/));
  const refund = (pid: string, amount: number, key: string, route = "OFFLINE", reason = "Client overpaid") =>
    `insert into money_refund (firm_id, payment_id, amount_minor, currency, reason, route, idempotency_key, created_by) values ('${firmA}', '${pid}', ${amount}, 'CAD', '${reason}', '${route}', '${key}', 'user-R') returning amount_minor`;
  ok("FO-7a pass (AG-6-23): a part refund with a reason and its own key", sql(DEMO, refund(u(900), 10000, "refund-key-0001")) === "10000");
  ok("FO-7a fail: refunds beyond the payment, without a reason, with a key used before, or to a card for an offline payment are refused",
    refused(DEMO, refund(u(900), 40001, "refund-key-0002"), /more than the payment/) && refused(DEMO, refund(u(900), 1, "refund-key-0002", "OFFLINE", " "), /money_refund_text_check/)
    && refused(DEMO, refund(u(900), 1, "refund-key-0001"), /money_refund_firm_id_idempotency_key_key/, "23505") && refused(DEMO, refund(u(900), 1, "refund-key-0003", "CARD"), /only a card payment/));

  {
    sql(DEMO, pay(u(910), "key-refund-race-rc", { inv: I1, amount: 1000 })); sql(DEMO, pay(u(911), "key-refund-race-rr", { inv: I1, amount: 1000 }));
    const rc = await race(2, (i) => refund(u(910), 700, `refund-rc-${i}-000`));
    const rr = await race(2, (i) => refund(u(911), 700, `refund-rr-${i}-000`), "repeatable read");
    ok("FO-7a fail (parallel; review round 1 Major 1, break B-2): two refunds of 700.00 on one 1,000.00 payment at once — one written, the other refused, at READ COMMITTED (23514) and at REPEATABLE READ (23505: the refund ordinal)",
      rc.filter((r) => r.value).length === 1 && rc.some((r) => r.code === "23514") && rr.filter((r) => r.value).length === 1 && rr.some((r) => r.code === "23505")
      && sql(DEMO, `select string_agg(s::text, ',' order by p) from (select payment_id p, sum(amount_minor) s from money_refund where payment_id in ('${u(910)}', '${u(911)}') group by payment_id) t`) === "700,700", { rc, rr });
  }
  ok("FO-7a fail (break B-1): a row that names another written later in the same statement is refused, not left to the foreign key at the statement's end — a payment on a draft invoice, a 1,000,000.00 USD card refund of a 1-cent cash payment",
    refused(DEMO, `with p as (insert into money_payment (firm_id, invoice_id, method, amount_minor, currency, received_into, received_at, idempotency_key, recorded_by) values ('${firmA}', '${u(614)}', 'CASH', 1, 'USD', 'OPERATING', now(), 'key-cte-draft-01', 'user-R') returning invoice_id)
      insert into money_invoice (id, firm_id, person_id, created_by, updated_at) select invoice_id, '${firmA}', '${P1}', 'user-R', now() from p`, /invoice .* is not visible to this statement/, "23503")
    && refused(DEMO, `with r as (insert into money_refund (firm_id, payment_id, amount_minor, currency, reason, route, idempotency_key, created_by) values ('${firmA}', '${u(912)}', 100000000, 'USD', 'x', 'CARD', 'refund-cte-0001', 'user-R') returning payment_id)
      insert into money_payment (id, firm_id, method, amount_minor, currency, received_into, received_at, idempotency_key, recorded_by) select payment_id, '${firmA}', 'CASH', 1, 'CAD', 'OPERATING', now(), 'key-cte-cash-001', 'user-R' from r`, /payment .* is not visible to this statement/, "23503"));
  ok("FO-7a fail: the same rows written in the other order in one statement are refused by the rules themselves (draft invoice takes no payment)",
    refused(DEMO, `with d as (insert into money_invoice (id, firm_id, person_id, created_by, updated_at) values ('${u(614)}', '${firmA}', '${P1}', 'user-R', now()) returning id)
      insert into money_payment (firm_id, invoice_id, method, amount_minor, currency, received_into, received_at, idempotency_key, recorded_by) select '${firmA}', id, 'CASH', 1, 'CAD', 'OPERATING', now(), 'key-cte-draft-02', 'user-R' from d`, /draft invoice takes no payment|not visible/));
  // ------------------------------------------------------------------------------------------ receipts, credit notes
  const receipt = (kind: string, col: string, id: string) => `insert into money_receipt (firm_id, kind, ${col}) values ('${firmA}', '${kind}', '${id}') returning number`;
  ok("FO-7a pass (AG-6-63): a payment receipt takes R-0001 from the receipt series", sql(DEMO, receipt("PAYMENT", "payment_id", u(900))) === "R-0001");
  ok("FO-7a fail: a second receipt for one payment, a receipt with a hand-made number, or a payment receipt for money with no invoice is refused",
    refused(DEMO, receipt("PAYMENT", "payment_id", u(900)), /money_receipt_firm_id_payment_id_key/, "23505")
    && refused(DEMO, `insert into money_receipt (firm_id, number, kind, payment_id) values ('${firmA}', 'R-0099', 'PAYMENT', '${u(901)}')`, /number is the database's/)
    && (sql(DEMO, pay(u(907), "key-nodoc-00001", {})), refused(DEMO, receipt("PAYMENT", "payment_id", u(907)), /payment receipt names a payment against an invoice/)));
  const pays20 = drafts20.map((inv, k) => (sql(DEMO, pay(u(1000 + k), `key-par-${String(k).padStart(8, "0")}`, { inv, amount: 100 })), u(1000 + k)));
  const rNums = (await race(20, (i) => receipt("PAYMENT", "payment_id", pays20[i]))).map((r) => r.value ?? `ERR ${r.code}`).sort();
  ok("FO-7a pass: 20 parallel receipts take R-0002 … R-0021 — no repeat, no skip", JSON.stringify(rNums) === JSON.stringify(series("R-", 2, 21)), rNums);
  const credit = (inv: string, amount: number, full = false, reason = "Fee reduced") =>
    `insert into money_credit_note (firm_id, invoice_id, "full", amount_minor, currency, reason, created_by) values ('${firmA}', '${inv}', ${full}, ${amount}, 'CAD', '${reason}', 'user-R') returning number`;
  ok("FO-7a pass (AG-6-48): a part credit note with a reason takes CN-0001", sql(DEMO, credit(I1, 8500)) === "CN-0001");
  ok("FO-7a fail: a credit note beyond what is left on the invoice, on a draft, without a reason, or a 'full' one that is not all that is left is refused",
    refused(DEMO, credit(I1, 130001), /more than is left to credit on the invoice \(130000\)/) && refused(DEMO, credit(u(610), 100), /draft invoice cannot have one/)
    && refused(DEMO, credit(I1, 100, false, ""), /money_credit_note_text_check/) && refused(DEMO, credit(I1, 100, true), /full credit note credits all that is left \(130000\)/));
  const cnNums = (await race(20, (i) => credit(drafts20[i], 1))).map((r) => r.value ?? `ERR ${r.code}`).sort();
  ok("FO-7a pass: 20 parallel credit notes take CN-0002 … CN-0021 — no repeat, no skip", JSON.stringify(cnNums) === JSON.stringify(series("CN-", 2, 21)), cnNums);
  const cnRR = await race(2, () => credit(u(705), 6000), "repeatable read");
  ok("FO-7a fail (parallel, REPEATABLE READ; review round 1): two credit notes of 60.00 at once on an invoice with 112.99 left — one written, the other fails to serialise (40001); never more than the total",
    cnRR.filter((r) => r.value).length === 1 && cnRR.some((r) => r.code === "40001") && sql(DEMO, `select sum(amount_minor) from money_credit_note where invoice_id = '${u(705)}'`) === "6001", cnRR);
  ok("FO-7a fail (break B-9): a reason that only looks written — an ideographic space, a right-to-left mark, a line separator — or one carrying a bidi override is refused",
    ["　", "‏", " ", "Fee‮reduced"].every((r) => refused(DEMO, credit(I1, 1, false, r), /money_credit_note_text_check/))
    && sql(DEMO, `begin; ${credit(I1, 1, false, "Frais réduits — 料金")}; rollback;`).startsWith("CN-"));

  // ------------------------------------------------------------------------------------------------- trust requests
  const req = (id: string, sent: boolean, party = `person_id`, pid = P1, amount = 100000, f = firmA) =>
    `insert into money_trust_request (id, firm_id, ${party}, amount_minor, currency, purpose, created_by, sent_at, sent_by, updated_at) values ('${id}', '${f}', '${pid}', ${amount}, 'CAD', 'Deposit for the work permit', 'user-R', ${sent ? "now(), 'user-R'" : "null, null"}, now()) returning coalesce(number, '-')`;
  ok("FO-7a fail (AG-6-59): with trust off (firm B never said Yes) no trust request is written and no money is received into trust",
    refused(DEMO, req(u(1099), false, "person_id", P1, 100, firmB), /trust is off/) && refused(DEMO, pay(u(1099), "key-trust-off-01", { f: firmB, into: "TRUST" }), /trust is off/));
  ok("FO-7a pass (AG-6-61, -44 rule 7): a prepared request has no number; sending it takes DR-0001, stamped now (break B-10)",
    sql(DEMO, req(u(1100), false)) === "-" && sql(DEMO, `update money_trust_request set sent_at = '1999-01-01', sent_by = 'user-R' where id = '${u(1100)}' returning number`) === "DR-0001"
    && sql(DEMO, `select sent_at > now() - interval '1 minute' from money_trust_request where id = '${u(1100)}'`) === "t");
  const reqs20 = Array.from({ length: 20 }, (_, k) => (sql(DEMO, req(u(1200 + k), false, "person_id", P2)), u(1200 + k)));
  const drNums = (await race(20, (i) => `update money_trust_request set sent_at = now(), sent_by = 'user-R' where id = '${reqs20[i]}' returning number`)).map((r) => r.value ?? `ERR ${r.code}`).sort();
  ok("FO-7a pass: 20 parallel sends take DR-0002 … DR-0021 — no repeat, no skip", JSON.stringify(drNums) === JSON.stringify(series("DR-", 2, 21)), drNums);
  ok("FO-7a fail: a sent request's party, currency and number never change; it is never deleted; a cancel needs a reason",
    refused(DEMO, `update money_trust_request set person_id = '${P2}' where id = '${u(1100)}'`, /sent request's party/) && refused(DEMO, `update money_trust_request set currency = 'USD' where id = '${u(1100)}'`, /sent request's party/)
    && refused(DEMO, `update money_trust_request set number = 'DR-0099' where id = '${u(1100)}'`, /number and the times are the database's/) && refused(DEMO, `delete from money_trust_request where id = '${u(1100)}'`, /never deleted/)
    && refused(DEMO, `update money_trust_request set cancelled_at = now(), cancelled_by = 'user-R' where id = '${u(1100)}'`, /money_trust_request_cancel_check/));
  ok("FO-7a fail: a trust request is never paid by card, nor into operating (contracts §7 §2.5)",
    refused(DEMO, pay(u(1101), "key-req-card-01", { req: u(1100), method: "CARD", pi: "pi_3Req" }), /never by card/) && refused(DEMO, pay(u(1101), "key-req-oper-01", { req: u(1100) }), /never by card/));

  // ---------------------------------------------------------------------------------------------------- trust ledger
  const entry = (kind: string, amount: number, extra: { pay?: string; inv?: string; reason?: string; party?: string; pid?: string; req?: string } = {}) =>
    `insert into money_trust_entry (firm_id, ${extra.party ?? "person_id"}, kind, amount_minor, currency, payment_id, invoice_id, trust_request_id, reason, created_by) values ('${firmA}', '${extra.pid ?? P1}', '${kind}', ${amount}, 'CAD', ${extra.pay ? `'${extra.pay}'` : "null"}, ${extra.inv ? `'${extra.inv}'` : "null"}, ${extra.req ? `'${extra.req}'` : "null"}, ${extra.reason ? `'${extra.reason}'` : "null"}, 'user-R') returning id`;
  // Money into trust and its deposit entry are one transaction (a payment into TRUST alone is refused at commit).
  const deposit = (pid: string, key: string, amount: number, opts: { req?: string; inv?: string; party?: string; who?: string } = {}) =>
    `${pay(pid, key, { req: opts.req, inv: opts.inv, into: "TRUST", amount })}; ${entry("DEPOSIT", amount, { pay: pid, party: opts.party, pid: opts.who })}`;
  const balance = (pid = P1) => sql(DEMO, `select coalesce((select balance_after_minor from money_trust_entry where firm_id = '${firmA}' and person_id = '${pid}' and currency = 'CAD' order by seq desc limit 1), 0)`);
  const DEP = sqlLast(DEMO, deposit(u(1102), "key-trust-dep-01", 100000, { req: u(1100) }));
  ok("FO-7a pass (Code s. 32(b), (d)): a deposit from a payment into trust is the party's first entry (seq 1, balance 1,000.00), names its request, and gets a TRUST receipt",
    sql(DEMO, `select seq || ':' || balance_after_minor || ':' || trust_request_id from money_trust_entry where id = '${DEP}'`) === `1:100000:${u(1100)}`
    && sql(DEMO, receipt("TRUST", "trust_entry_id", DEP)) === "R-0022");
  ok("FO-7a fail: money received into trust with no deposit entry in its transaction is refused at commit (the ledger always follows the money)",
    refused(DEMO, pay(u(1107), "key-trust-nodep-1", { req: u(1100), into: "TRUST", amount: 500 }), /recorded in the trust ledger/));
  ok("FO-7a fail: a deposit from a payment into operating, of another amount, or a deposit used twice is refused",
    (sql(DEMO, pay(u(1103), "key-trust-op-001", { amount: 500 })), refused(DEMO, entry("DEPOSIT", 500, { pay: u(1103) }), /payment received into trust/))
    && refused(DEMO, `${pay(u(1104), "key-trust-dep-02", { req: u(1100), into: "TRUST", amount: 500 })}; ${entry("DEPOSIT", 600, { pay: u(1104) })}`, /its payment's amount/)
    && refused(DEMO, entry("DEPOSIT", 100000, { pay: u(1102) }), /money_trust_entry_firm_id_payment_id_key/, "23505"));
  ok("FO-7a fail (break B-1): a 1,000,000.00 trust deposit naming a 1-cent card payment into operating that the same statement writes after it is refused",
    refused(DEMO, `with e as (insert into money_trust_entry (firm_id, person_id, kind, amount_minor, currency, payment_id, created_by) values ('${firmA}', '${P1}', 'DEPOSIT', 100000000, 'CAD', '${u(1108)}', 'user-R') returning payment_id)
      insert into money_payment (id, firm_id, method, amount_minor, currency, received_into, received_at, stripe_payment_intent_id, idempotency_key) select payment_id, '${firmA}', 'CARD', 1, 'CAD', 'OPERATING', now(), 'pi_3Cte', 'key-cte-card-001' from e`, /payment .* is not visible to this statement/, "23503")
    && refused(DEMO, `with p as (insert into money_payment (id, firm_id, method, amount_minor, currency, received_into, received_at, stripe_payment_intent_id, idempotency_key) values ('${u(1108)}', '${firmA}', 'CARD', 1, 'CAD', 'OPERATING', now(), 'pi_3Cte', 'key-cte-card-001') returning id)
      insert into money_trust_entry (firm_id, person_id, kind, amount_minor, currency, payment_id, created_by) select '${firmA}', '${P1}', 'DEPOSIT', 100000000, 'CAD', id, 'user-R' from p`, /payment received into trust|not visible/));
  ok("FO-7a fail (review round 1, m7): a payment received into trust is not refunded as a refund (it goes back as a trust entry)",
    refused(DEMO, refund(u(1102), 100, "refund-trust-001"), /goes back as a trust entry/));
  ok("FO-7a fail: trust entries refuse update, delete and truncate (insert-only)",
    refused(DEMO, `update money_trust_entry set amount_minor = 1 where id = '${DEP}'`, /never changed or removed \(UPDATE refused\)/, "42501")
    && refused(DEMO, `delete from money_trust_entry where id = '${DEP}'`, /never changed or removed \(DELETE refused\)/, "42501")
    && refused(DEMO, `truncate money_trust_entry cascade`, /never changed or removed/, "42501"));
  ok("FO-7a fail (Code s. 32(f)): a trust withdrawal without an invoice is refused", refused(DEMO, entry("WITHDRAWAL_TO_INVOICE", -1000), /money_trust_entry_withdrawal_invoice/));
  ok("FO-7a fail: a withdrawal to a draft invoice, or to another party's invoice, is refused",
    (sql(DEMO, draft(u(611))), refused(DEMO, entry("WITHDRAWAL_TO_INVOICE", -1000, { inv: u(611) }), /only to an issued invoice/))
    && refused(DEMO, entry("WITHDRAWAL_TO_INVOICE", -1000, { inv: u(700) }), /same party and currency/));
  const WD = sql(DEMO, entry("WITHDRAWAL_TO_INVOICE", -30000, { inv: I1 }));
  ok("FO-7a pass: a withdrawal of 300.00 to the party's issued invoice leaves 700.00 (seq 2)", sql(DEMO, `select seq || ':' || balance_after_minor from money_trust_entry where id = '${WD}'`) === "2:70000");
  ok("FO-7a fail: a withdrawal of 800.00 from 700.00 is refused — the balance never goes below zero", refused(DEMO, entry("WITHDRAWAL_TO_INVOICE", -80000, { inv: I1 }), /would go below zero \(held 70000 CAD/, "23514") && balance() === "70000");
  {
    const small = u(615); let WS = "";
    sql(DEMO, draft(small)); sql(DEMO, line(small, 1, "FEE", 1, 500, 0, 0)); sql(DEMO, issue(small));
    ok("FO-7a fail (review round 1 m4, break B-5): trust never pays more than is open on the invoice — 6.00 to a 5.00 invoice is refused; 5.00 is written; then 0.01 more is refused",
      refused(DEMO, entry("WITHDRAWAL_TO_INVOICE", -600, { inv: small }), /more than is open on the invoice \(500 open/) && !!(WS = sql(DEMO, entry("WITHDRAWAL_TO_INVOICE", -500, { inv: small })))
      && refused(DEMO, entry("WITHDRAWAL_TO_INVOICE", -1, { inv: small }), /500 already paid from trust/) && balance() === "69500");
    const giveBack = (amount: number) => `insert into money_trust_entry (firm_id, person_id, kind, amount_minor, currency, corrects_entry_id, reason, created_by) values ('${firmA}', '${P1}', 'CORRECTION', ${amount}, 'CAD', '${WS}', 'Returned before moving: invoice disputed', 'user-R') returning balance_after_minor`;
    ok("FO-7a pass (review round 2, Major 2): money returned to trust from an application (a correction naming it) frees that amount — 2.00 back, then 2.00 applied again, then 0.01 more refused",
      sql(DEMO, giveBack(200)) === "69700" && !!sql(DEMO, entry("WITHDRAWAL_TO_INVOICE", -200, { inv: small }))
      && refused(DEMO, entry("WITHDRAWAL_TO_INVOICE", -1, { inv: small }), /500 already paid from trust/) && balance() === "69500");
    ok("FO-7a fail: a return from an application that is negative, or more than was applied, is refused",
      refused(DEMO, giveBack(-1), /positive and at most what was applied/) && refused(DEMO, giveBack(301), /positive and at most what was applied \(500 applied, 200 returned\)/));
  }
  ok("FO-7a fail: a refund to the client or a correction without a reason is refused; with one it is written",
    refused(DEMO, entry("REFUND_TO_CLIENT", -100), /money_trust_entry_reason_check/) && refused(DEMO, entry("CORRECTION", 100), /money_trust_entry_reason_check/)
    && !!sql(DEMO, entry("REFUND_TO_CLIENT", -100, { reason: "Returned unused money" })) && balance() === "69400");
  // Ten withdrawals of 100.00 at once from 694.00, on ten connections: six succeed, four are refused, nothing overdrawn.
  const par = await race(10, () => entry("WITHDRAWAL_TO_INVOICE", -10000, { inv: I1 }));
  ok("FO-7a pass (parallel, READ COMMITTED): 10 withdrawals of 100.00 at once from 694.00 — 6 written, 4 refused (23514), balance 94.00, never below zero",
    par.filter((r) => r.value).length === 6 && par.filter((r) => r.code === "23514").length === 4 && balance() === "9400", par.map((r) => r.code ?? "ok"));
  sqlLast(DEMO, deposit(u(1105), "key-trust-dep-03", 50000, { req: u(1100) }));
  const parRR = await race(8, () => entry("WITHDRAWAL_TO_INVOICE", -1000, { inv: I1 }), "repeatable read");
  const okRR = parRR.filter((r) => r.value).length;
  ok("FO-7a pass (parallel, REPEATABLE READ, stale snapshots): 8 withdrawals of 10.00 at once from 594.00 — the ledger never forks or goes below zero; the others are refused (40001, 23505 or 23514)",
    okRR >= 1 && parRR.every((r) => r.value || ["40001", "23505", "23514"].includes(r.code ?? "")) && Number(balance()) === 59400 - okRR * 1000, parRR.map((r) => r.code ?? "ok"));
  ok("FO-7a fail: an entry on another party's trust request is refused", refused(DEMO, entry("CORRECTION", 100, { reason: "x", pid: P2, req: u(1100) }), /trust request's party/));
  ok("FO-7a fail (review round 1, m2): a \"Trust first\" payment on Client B's invoice cannot be held for Client A",
    refused(DEMO, deposit(u(1109), "key-tf-other-01", 1000, { inv: u(700) }), /held for that invoice's party/));
  const TF = sqlLast(DEMO, deposit(u(1110), "key-tf-own-0001", 1000, { inv: I1 }));
  ok("FO-7a pass / fail (AG-6-69 rule 5; review round 1, m3): a \"Trust first\" payment on the party's own invoice is held for it and gets the payment receipt; a trust receipt for it is refused",
    !!TF && refused(DEMO, receipt("TRUST", "trust_entry_id", TF), /not paid on an invoice/) && sql(DEMO, receipt("PAYMENT", "payment_id", u(1110))).startsWith("R-"));
  ok("FO-7a pass: the ledger per party sums to its entries — seq runs 1..n with no gap, and each balance is the running sum",
    sql(DEMO, `select bool_and(seq = rn and balance_after_minor = running) from (select seq, balance_after_minor, row_number() over w as rn, sum(amount_minor) over w as running
      from money_trust_entry where firm_id = '${firmA}' window w as (partition by person_id, company_id, currency order by seq)) t`) === "t");
  {
    // break B-4: a payment on a request share-locks it, so an amount change waits for the payment and then sees it.
    sql(DEMO, req(u(1111), true, "person_id", P2, 1000));
    const c1 = new pg.Client({ connectionString: urlOf(DEMO) }), c2 = new pg.Client({ connectionString: urlOf(DEMO) });
    await c1.connect(); await c2.connect(); conns.push(c1, c2);
    await c1.query("begin"); await c1.query(deposit(u(1112), "key-b4-race-0001", 1000, { req: u(1111), who: P2 }));
    await c2.query("begin");
    const change = c2.query(`update money_trust_request set amount_minor = 5 where id = '${u(1111)}'`).then(() => "changed", (e: { message?: string }) => e.message ?? "error");
    await new Promise((r) => setTimeout(r, 300));
    await c1.query("commit");
    const outcome = await change; await c2.query("rollback");
    ok("FO-7a fail (parallel, break B-4): an amount change racing a payment on the request waits for it, then is refused (money is recorded on it)",
      /has money recorded on it/.test(outcome) && sql(DEMO, `select amount_minor from money_trust_request where id = '${u(1111)}'`) === "1000", outcome);
    await c1.end(); await c2.end(); conns.splice(conns.indexOf(c1), 1); conns.splice(conns.indexOf(c2), 1);
  }

  {
    // review round 2, Minor 1: at REPEATABLE READ, an amount change whose snapshot predates a payment on the request.
    sql(DEMO, req(u(1114), true, "person_id", P2, 1000));
    const c1 = new pg.Client({ connectionString: urlOf(DEMO) }), c2 = new pg.Client({ connectionString: urlOf(DEMO) });
    await c1.connect(); await c2.connect(); conns.push(c1, c2);
    await c2.query("begin isolation level repeatable read"); await c2.query("select 1 from money_trust_request limit 1");
    await c1.query("begin"); await c1.query(deposit(u(1115), "key-b4-rr-000001", 1000, { req: u(1114), who: P2 })); await c1.query("commit");
    const outcome = await c2.query(`update money_trust_request set amount_minor = 5 where id = '${u(1114)}'`).then(() => "changed", (e: { code?: string }) => e.code ?? "error");
    await c2.query("rollback");
    ok("FO-7a fail (parallel, REPEATABLE READ; review round 2, Minor 1): an amount change whose snapshot predates a payment on the request fails to serialise (40001)",
      outcome === "40001" && sql(DEMO, `select amount_minor from money_trust_request where id = '${u(1114)}'`) === "1000", outcome);
    await c1.end(); await c2.end(); conns.splice(conns.indexOf(c1), 1); conns.splice(conns.indexOf(c2), 1);
  }
  {
    // review round 2, Minor 2: "Trust first" (deposit and withdrawal in one transaction) beside another withdrawal on the
    // same invoice and party never deadlocks.
    const tf = u(616);
    sql(DEMO, draft(tf)); sql(DEMO, line(tf, 1, "FEE", 1, 100000, 0, 0)); sql(DEMO, issue(tf));
    const codes: string[] = [];
    for (let k = 0; k < 4; k++) {
      const r = await race(2, (i) => i === 0 ? `${deposit(u(1120 + k), `key-tf-dl-${k}-0000`, 100, { inv: tf })}; ${entry("WITHDRAWAL_TO_INVOICE", -100, { inv: tf })}` : entry("WITHDRAWAL_TO_INVOICE", -100, { inv: tf }));
      codes.push(...r.map((x) => x.code ?? "ok"));
    }
    ok("FO-7a pass (parallel; review round 2, Minor 2): \"Trust first\" beside another withdrawal on the same invoice, 4 rounds — never a deadlock (40P01), every write goes through",
      codes.every((c) => c === "ok"), codes);
  }
  // ------------------------------------------------------------------------------------------------------ write-offs
  const writeOff = (inv: string, amount = 2500, reason = "Wire fee") => `insert into money_write_off (firm_id, invoice_id, amount_minor, currency, reason, created_by) values ('${firmA}', '${inv}', ${amount}, 'CAD', '${reason}', 'user-R') returning amount_minor`;
  ok("FO-7a pass (AG-6-76): a write-off of an issued invoice's small balance with a reason", sql(DEMO, writeOff(u(701))) === "2500");
  ok("FO-7a fail (rev 13): a second write-off on one invoice is refused", refused(DEMO, writeOff(u(701), 100), /money_write_off_firm_id_invoice_id_key/, "23505"));
  ok("FO-7a fail (rev 13): a write-off update or delete is refused (insert-only)",
    refused(DEMO, `update money_write_off set amount_minor = 1 where invoice_id = '${u(701)}'`, /never changed or removed/, "42501") && refused(DEMO, `delete from money_write_off where invoice_id = '${u(701)}'`, /never changed or removed/, "42501"));
  ok("FO-7a fail: a write-off on a draft, without a reason, or over what is left is refused",
    refused(DEMO, writeOff(u(610)), /draft invoice cannot have one/) && refused(DEMO, writeOff(u(702), 100, ""), /money_write_off_text_check/) && refused(DEMO, writeOff(u(702), 11300), /more than is left on the invoice \(11299\)/));
  ok("FO-7a fail (break B-8): after a full credit note nothing is left to write off (and after a write-off, a full credit note credits only the rest: 87.99)",
    sql(DEMO, credit(u(703), 11299, true)).startsWith("CN-") && refused(DEMO, writeOff(u(703), 1), /more than is left on the invoice \(0\)/)
    && refused(DEMO, credit(u(701), 8800, true), /more than is left to credit on the invoice \(8799\)/) && sql(DEMO, `begin; ${credit(u(701), 8799, true)}; rollback;`).startsWith("CN-"));

  // ------------------------------------------------------------------------------------------- the "To move" list
  const batch = (id: string, opts: { undoes?: string; reason?: string; date?: string | null } = {}) =>
    `insert into money_move_batch (id, firm_id, currency, transfer_date, undoes_batch_id, reason, recorded_by) values ('${id}', '${firmA}', 'CAD', ${opts.date === null ? "null" : `'${opts.date ?? "2026-11-20"}'`}, ${opts.undoes ? `'${opts.undoes}'` : "null"}, ${opts.reason ? `'${opts.reason}'` : "null"}, 'user-R') returning id`;
  const moveLine = (b: string, src: string, kind = "TRUST_APPLIED", dir = "TRUST_TO_OPERATING", amount = 30000) =>
    `insert into money_move_line (firm_id, batch_id, kind, direction, currency, amount_minor, ${kind === "TRUST_APPLIED" ? "source_trust_entry_id" : "source_payment_id"}) values ('${firmA}', '${b}', '${kind}', '${dir}', 'CAD', ${amount}, '${src}') returning move_ordinal`;
  // "I moved these": one click writes the batch and its lines in one transaction.
  const moved = (b: string, ...lines: string[]) => `${batch(b)}; ${lines.join("; ")}`;
  const B1 = u(1300), B2 = u(1301), UNDO = u(1302), B3 = u(1303);
  ok("FO-7a pass (AG-6-73 rule 3): \"I moved these\" — a batch with a date and the trust application (300.00, trust → operating)", sqlLast(DEMO, moved(B1, moveLine(B1, WD))) === "1");
  ok("FO-7a fail: the same trust application in a second batch while the first stands is refused", refused(DEMO, moved(B2, moveLine(B2, WD)), /already moved in batch/, "23505"));
  ok("FO-7a fail (rev 13): a move line update or delete is refused (insert-only); a batch update is refused",
    refused(DEMO, `update money_move_line set amount_minor = 1 where batch_id = '${B1}'`, /never changed or removed/, "42501") && refused(DEMO, `delete from money_move_line where batch_id = '${B1}'`, /never changed or removed/, "42501")
    && refused(DEMO, `update money_move_batch set transfer_date = '2026-11-21' where id = '${B1}'`, /never changed or removed/, "42501"));
  ok("FO-7a fail: a trust application moving more than its withdrawal or the wrong way, or a wrong-account amount the wrong way, is refused",
    refused(DEMO, moved(B2, moveLine(B2, WD, "TRUST_APPLIED", "TRUST_TO_OPERATING", 30001)), /moves at most its withdrawal/) && refused(DEMO, moved(B2, moveLine(B2, WD, "TRUST_APPLIED", "OPERATING_TO_TRUST")), /moves at most its withdrawal/)
    && refused(DEMO, moved(B2, moveLine(B2, u(1103), "WRONG_ACCOUNT", "TRUST_TO_OPERATING", 500)), /received into OPERATING moves out of it/));
  ok("FO-7a pass: money for trust received into operating moves operating → trust (wrong account)", sqlLast(DEMO, moved(B2, moveLine(B2, u(1103), "WRONG_ACCOUNT", "OPERATING_TO_TRUST", 500))) === "1");
  ok("FO-7a fail (review round 1 m5, break B-7): a recorded batch never gains a line later", refused(DEMO, moveLine(B2, u(1102), "WRONG_ACCOUNT", "TRUST_TO_OPERATING", 1), /a recorded batch is never added to/));
  ok("FO-7a fail (review round 1 m6, break B-11): a card fee on the trust account names a card payment into trust (none exists while card into trust waits)",
    refused(DEMO, moved(u(1307), moveLine(u(1307), u(1103), "CARD_FEE_ON_TRUST", "OPERATING_TO_TRUST", 1)), /card fee on the trust account is for a card payment into trust/));
  ok("FO-7a fail (rev 13): an undo batch without a reason, or with a reason but without the batch it undoes, is refused",
    refused(DEMO, batch(UNDO, { undoes: B1, date: null }), /money_move_batch_kind_check/) && refused(DEMO, batch(UNDO, { reason: "Bank transfer failed" }), /money_move_batch_kind_check/));
  ok("FO-7a pass (AG-6-73 rules 4, 6): undo names the batch it undoes and a reason; the trust application then moves again (ordinal 2), here net of 100.00 returned before moving (review round 1, m8)",
    sql(DEMO, batch(UNDO, { undoes: B1, reason: "Bank transfer failed", date: null })) === UNDO && sqlLast(DEMO, moved(B3, moveLine(B3, WD, "TRUST_APPLIED", "TRUST_TO_OPERATING", 20000))) === "2");
  ok("FO-7a fail: a batch is undone once, an undo is never undone, an undo carries no lines, and an undone batch never gains a line",
    refused(DEMO, batch(u(1304), { undoes: B1, reason: "Again" }), /money_move_batch_firm_id_undoes_batch_id_key/, "23505")
    && refused(DEMO, batch(u(1304), { undoes: UNDO, reason: "Undo the undo" }), /an undo is never undone/) && refused(DEMO, moveLine(UNDO, u(1103), "WRONG_ACCOUNT", "OPERATING_TO_TRUST", 1), /undo batch carries no lines/)
    && refused(DEMO, moveLine(B1, u(1103), "WRONG_ACCOUNT", "OPERATING_TO_TRUST", 1), /a recorded batch is never added to/));
  ok("FO-7a pass (review round 2, Minor 5): a batch written inside a savepoint takes its lines in the same transaction",
    (psql(DEMO, ["-c", `begin; savepoint s1; ${batch(u(1308))}; release savepoint s1; savepoint s2; ${moveLine(u(1308), u(1102), "WRONG_ACCOUNT", "TRUST_TO_OPERATING", 1)}; release savepoint s2; commit;`]), true)
    && sql(DEMO, `select count(*) from money_move_line where batch_id = '${u(1308)}'`) === "1");
  const W2 = sql(DEMO, entry("WITHDRAWAL_TO_INVOICE", -100, { inv: I1 }));
  const B4 = u(1305), B5 = u(1306);
  const two = await race(2, (i) => moved([B4, B5][i], moveLine([B4, B5][i], W2, "TRUST_APPLIED", "TRUST_TO_OPERATING", 100)));
  ok("FO-7a pass (parallel): two people ticking the same line at once — one batch holds it, the other is refused (23505)",
    two.filter((r) => r.value === "1").length === 1 && two.filter((r) => r.code === "23505").length === 1 && sql(DEMO, `select count(*) from money_move_line where source_trust_entry_id = '${W2}'`) === "1", two);

  // ------------------------------------------------------------------------------------- foreign keys and the firm
  ok("FO-7a pass: every money foreign key is RESTRICT on delete and on update, and every key between money rows includes firm_id",
    sql(DEMO, `select bool_and(confdeltype = 'r' and confupdtype = 'r') from pg_constraint where contype = 'f' and conrelid::regclass::text like 'money\\_%'`) === "t"
    && sql(DEMO, `select count(*) from pg_constraint c where contype = 'f' and conrelid::regclass::text like 'money\\_%' and confrelid::regclass::text like 'money\\_%'
      and not exists (select 1 from pg_attribute a where a.attrelid = c.conrelid and a.attnum = c.conkey[1] and a.attname = 'firm_id')`) === "0");
  const firmE = sql(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-e', 'E', 'CA', 'e@firm-e.example.com', now()) returning id`);
  ok("FO-7a pass: a firm with no money row can still be deleted (as before FO-7a)", sql(DEMO, `delete from platform_firm where id = '${firmE}' returning 1`) === "1");
  const firmF = sql(DEMO, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-f', 'F', 'CA', 'f@firm-f.example.com', now()) returning id`);
  sql(DEMO, settings(firmF));
  ok("FO-7a fail: a firm with money rows cannot be deleted or change id (RESTRICT: 23001)",
    refused(DEMO, `delete from platform_firm where id = '${firmF}'`, /violates RESTRICT setting of foreign key constraint "money_payment_settings_firm_id_fkey"/, "23001")
    && refused(DEMO, `update platform_firm set id = gen_random_uuid() where id = '${firmF}'`, /violates RESTRICT setting of foreign key constraint "money_payment_settings_firm_id_fkey"/, "23001"));
  ok("FO-7a pass: every insert-only money table also refuses truncate",
    INSERT_ONLY.every((t) => refused(DEMO, `truncate ${t} cascade`, /never changed or removed/, "42501")));
  const fns = (db: string) => sql(db, `select string_agg(proname, ',' order by proname) from pg_proc where pronamespace = 'public'::regnamespace`).split(",");
  const added = fns(DEMO).filter((f) => !fns(BARE).includes(f));
  ok("FO-7a pass (rows rev 15.2): every function the migration adds is named money_ (23 of them)", added.length === 23 && added.every((f) => f.startsWith("money_")), added);
} finally {
  for (const c of conns) await c.end().catch(() => undefined);
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
