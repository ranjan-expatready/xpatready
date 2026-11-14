// FO-1a (P-558, P-559; rows rev 3.1; contracts §0, §2.1, §2.6, §7; AG-02): the front-office sales tables, their database
// rules and the per-firm seed. Every line of the row's "Done when", each with a passing and a failing case, plus the rules
// the migration's triggers carry. Consent is not here (rows rev 14, P-584 (1): the platform's msg_consent_wording, PF-19a),
// so the row's "consent wording refuses update and delete" is PF-19a's check. Three scratch databases: "empty" gets every
// migration; "demo" gets every migration before FO-1a's, then demo-shaped rows (the Sample firms and staff by PF-3's
// seed, a case, released and unreleased combinations), then FO-1a's migration and any later one; "bare" stops before
// FO-1a's. No server, no browser, no model call (US$0). All three are dropped at the end.
//   tsx studio/tests/check_fo1a_sales_schema.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { onFirmCreated, REASONS, seedCreatedFirms, seedFirmFrontOffice, seedSampleFirmsFrontOffice, STAGES } from "../api/src/front-office/firm-seed.ts";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114063000_fo1a_front_office_sales", NEWEST_BEFORE = "20261114015002_pf3_platform_tables";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_fo1a_empty_${process.pid}`, DEMO = `xr_studio_fo1a_demo_${process.pid}`, BARE = `xr_studio_fo1a_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `fo1a-check-${process.pid}`);

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const throwsLike = async (f: () => unknown, test: (e: unknown) => boolean) => { try { await f(); return false; } catch (e) { return test(e); } };
const client = (db: string, max = 10) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), max, options: "-c TimeZone=UTC" }) });
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const FO_TABLES = ["fo_sales_setup", "fo_person", "fo_arrival_receipt", "fo_lead", "fo_lead_attribution", "fo_company", "fo_company_contact", "fo_prospect", "fo_stage", "fo_reason", "fo_call", "fo_note", "fo_stage_move", "fo_web_form", "fo_service"];

// prisma migrate diff from a database to the schema folder: the lines that name an FO-1a table or type (main's own known
// drift, listed in tests/check_prisma_schema.ts KNOWN, is not this row's).
function salesDiff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /fo_|Fo[A-Z]/.test(l));
}
// The tables (of a list) with no index whose first column is firm_id.
const tablesWithoutFirmFirst = (db: string, tables: string[]) => sql(db, `select coalesce(string_agg(t, ',' order by t), '') from unnest(array[${tables.map((t) => `'${t}'`).join(",")}]) t
  where not exists (select 1 from pg_index i join pg_class c on c.oid = i.indrelid join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
    where c.relname = t and c.relnamespace = 'public'::regnamespace and a.attname = 'firm_id')`);
// fo_lead's columns that would give a lead a stage, a type, a pipeline or a value (BR-22).
const leadSalesColumns = (db: string) => sql(db, `select coalesce(string_agg(column_name, ',' order by column_name), '') from information_schema.columns
  where table_schema = 'public' and table_name = 'fo_lead' and column_name ~ '(stage|type|pipeline|value|amount)'`);
// Every FO-1a table's rows, as one text (to see that a second seed changes nothing, timestamps included).
const snapshot = (db: string) => FO_TABLES.map((t) => sql(db, `select coalesce(string_agg(to_jsonb(x)::text, '|' order by to_jsonb(x)::text), '') from "${t}" x`)).join("\n");

// Test rows written in SQL (updated_at has no database default: Prisma sets it).
const firm = (db: string, id: string, key: string) => sql(db, `insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values ('${id}', '${key}', 'Sample ${key}', 'CA', '${key}@example.com', now())`);
const staff = (db: string, id: string, firmId: string, email: string) => sql(db, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values ('${id}', '${firmId}', '${email}', 'Sample staff', now())`);
const person = (db: string, f: string, id: string, email = "client.a@example.com") => sql(db, `insert into fo_person (id, firm_id, given_names, email, created_by, updated_at) values ('${id}', '${f}', 'Client A', '${email}', 'test', now())`);
const leadSql = (f: string, id: string, p: string, extra = "") => `insert into fo_lead (id, firm_id, person_id, door, source, created_by, updated_at${extra ? ", " + extra.split("=")[0] : ""}) values ('${id}', '${f}', '${p}', 'MANUAL', 'WEBSITE', 'test', now()${extra ? ", " + extra.split("=").slice(1).join("=") : ""}) returning number`;
const stageId = (db: string, f: string, pipeline: string, key: string) => sql(db, `select id from fo_stage where firm_id = '${f}' and pipeline = '${pipeline}' and key = '${key}'`);
const reasonId = (db: string, f: string, kind: string, key: string) => sql(db, `select id from fo_reason where firm_id = '${f}' and kind = '${kind}' and key = '${key}'`);
const prospectSql = (f: string, id: string, lead: string, type: string, stage: string, cols: Record<string, string>) => {
  const k = Object.keys(cols), v = Object.values(cols);
  return `insert into fo_prospect (id, firm_id, lead_id, type, stage_id, created_by, updated_at${k.map((x) => ", " + x).join("")}) values ('${id}', '${f}', '${lead}', '${type}', '${stage}', 'test', now()${v.map((x) => ", " + x).join("")}) returning number`;
};

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
try {
  ok(`FO-1a: the migration has its own stamp, later than the newest on main before it (${NEWEST_BEFORE}; P-348 (8))`, all.includes(NEW) && NEW > NEWEST_BEFORE && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));

  // ------------------------------------------------------------------------- the migration on empty and demo copies
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-1a pass: every migration applies to an empty database (the 15 front-office tables exist)", sql(EMPTY, `select count(*) from pg_tables where schemaname = 'public' and tablename = any('{${FO_TABLES.join(",")}}')`) === String(FO_TABLES.length));
  ok("FO-1a pass: migrate diff from the migrated empty database to the schema names no FO-1a table or type", salesDiff(EMPTY).length === 0, salesDiff(EMPTY));
  for (const d of all.filter((x) => x < NEW)) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-1a fail: a database without FO-1a's migration differs from the schema (diff names the fo_ tables)", salesDiff(BARE).some((l) => /fo_lead/.test(l)));
  ok("FO-1a fail: the migration does not apply twice", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  // Demo-shaped copy: the Sample firms and staff (PF-3's seed), a case, one released, one retired and one unreleased
  // combination, written before FO-1a's migration.
  for (const d of all.filter((x) => x < NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  const W = u(1), CMB = u(2), CMB_RETIRED = u(3), CMB_DRAFT = u(4), CMB_BLANK = u(30);
  const SERVICE = "Sample pathway › Sample program › Sample: released combination";
  { const pre = client(DEMO); dbs.push(pre); await seedSampleFirms(pre); }
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values ('${u(10)}', '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001');
    insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by, retired_at) values
      ('${CMB}', '${W}', '${u(5)}', 'sample-released', 'Sample: released combination', '[]', 'test', null),
      ('${CMB_RETIRED}', '${W}', '${u(8)}', 'sample-retired', 'Sample: retired combination', '[]', 'test', now()),
      ('${CMB_DRAFT}', '${W}', '${u(9)}', 'sample-draft', 'Sample: never released', '[]', 'test', null);
    insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by) values ('${CMB_BLANK}', '${W}', '${u(31)}', 'sample-blank', E' \\t\\u00a0', '[]', 'test');
    insert into program_def (id, workspace_id, program_node_key, parent_node_key, node_kind, label, created_by) values
      ('${u(20)}', '${W}', 'pw', null, 'PATHWAY', 'Sample pathway', 'test'), ('${u(5)}', '${W}', 'prog-a', 'pw', 'PROGRAM', 'Sample program', 'test'),
      ('${u(8)}', '${W}', 'prog-b', 'pw', 'PROGRAM', 'Retired program', 'test'), ('${u(9)}', '${W}', 'prog-c', 'pw', 'PROGRAM', 'Draft program', 'test'),
      ('${u(31)}', '${W}', 'prog-d', 'pw', 'PROGRAM', 'Blank program', 'test');
    insert into config_release (id, workspace_id, combination_id, version, status, snapshot, sha256, summary, author_id, submitter_id, approver_id, basis) values
      ('${u(6)}', '${W}', '${CMB}', 1, 'RELEASED', '{}', 'x', '{}', 'a', 'b', 'c', 'Sample'), ('${u(7)}', '${W}', '${CMB_RETIRED}', 1, 'RELEASED', '{}', 'x', '{}', 'a', 'b', 'c', 'Sample'),
      ('${u(32)}', '${W}', '${CMB_BLANK}', 1, 'RELEASED', '{}', 'x', '{}', 'a', 'b', 'c', 'Sample');`);
  const demoFacts = `select (select count(*) from runtime_case) || ':' || (select count(*) from platform_firm) || ':' || (select count(*) from platform_staff) || ':' || (select string_agg(key, ',' order by key) from platform_firm)`;
  const before = sql(DEMO, demoFacts);
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("FO-1a pass: the migration applies to a demo-data copy and leaves its rows as they were", sql(DEMO, demoFacts) === before, before);
  ok("FO-1a pass: migrate diff after it on the demo-data copy names no FO-1a table or type", salesDiff(DEMO).length === 0, salesDiff(DEMO));

  // ------------------------------------------------------------------------- a lead has no stage, type or value (BR-22)
  ok("FO-1a pass: a lead has no stage, type, pipeline or value column (BR-22)", leadSalesColumns(DEMO) === "", leadSalesColumns(DEMO));
  sql(BARE, `create table fo_lead (id uuid, stage_id uuid, value_cents int)`);
  ok("FO-1a fail: a lead table with a stage and a value column is named by the same check", leadSalesColumns(BARE) === "stage_id,value_cents", leadSalesColumns(BARE));

  // ------------------------------------------------------------------------- firm_id first in an index
  ok("FO-1a pass: every front-office table has firm_id first in an index", tablesWithoutFirmFirst(DEMO, FO_TABLES) === "", tablesWithoutFirmFirst(DEMO, FO_TABLES));
  sql(BARE, `create table fo_unindexed (id uuid primary key, firm_id uuid); create index on fo_unindexed (id, firm_id)`);
  ok("FO-1a fail: a table whose index has firm_id only second is named", tablesWithoutFirmFirst(BARE, ["fo_unindexed"]) === "fo_unindexed");

  // ------------------------------------------------------------------------- the seed: once per firm
  const db = client(DEMO, 25); dbs.push(db);
  const sample = await seedSampleFirmsFrontOffice(db);
  const SF = sql(DEMO, `select id from platform_firm where key = 'sample-firm'`), SS = sql(DEMO, `select id from platform_firm where key = 'sample-solo'`);
  const counts = (f: string) => sql(DEMO, `select (select count(*) from fo_stage where firm_id = '${f}') || ':' || (select count(*) from fo_reason where firm_id = '${f}') || ':' || (select count(*) from fo_web_form where firm_id = '${f}' and not enabled) || ':' || (select coalesce(string_agg(label, ',' order by sort_order), '') from fo_service where firm_id = '${f}')`);
  ok("FO-1a pass: each Sample firm gets 16 stages, 14 reasons, one web form (off) and its services (the released, not retired combination, named by its place; review m6)",
    sample.missing.length === 0 && sample.results.every((r) => r.seeded) && counts(SF) === `16:14:1:${SERVICE}` && counts(SS) === counts(SF), { sample, sf: counts(SF) });
  ok("FO-1a fail: a released combination with no readable name (spaces, a tab, a no-break space) is left out, not a failed seed (break B6)", sql(DEMO, `select count(*) from fo_service where combination_id = '${CMB_BLANK}'`) === "0");
  ok("FO-1a pass: both pipelines carry AG-02's eight keys in order, with one WON, one LOST and one NURTURE each (AG-2-52)",
    ["INDIVIDUAL", "CORPORATE"].every((p) => sql(DEMO, `select string_agg(key || '/' || kind, ',' order by sort_order) from fo_stage where firm_id = '${SF}' and pipeline = '${p}'`) === STAGES.map((s) => `${s.key}/${s.kind}`).join(",")));
  ok("FO-1a pass: the reason lists are AG-02's (AG-2-80 rule 2: five offered and two set by the system; AG-2-44 rules 2-3: seven, Duplicate a system reason; AG-2-98: Combined)",
    sql(DEMO, `select string_agg(label || (case when is_system then '*' else '' end), ',' order by sort_order) from fo_reason where firm_id = '${SF}' and kind = 'LEAD_CLOSE'`) === "Not interested,Junk or spam,Added to a prospect*,Cannot reach,Outside what we do,Combined into another lead*"
    && sql(DEMO, `select string_agg(label || (case when is_system then '*' else '' end), ',' order by sort_order) from fo_reason where firm_id = '${SF}' and kind = 'PROSPECT_LOST'`) === "Not eligible,Price,Went with competitor,Unresponsive,Not ready or timing,Duplicate of another prospect*,Other,Combined into another prospect*"
    && REASONS.length === 14);
  sql(DEMO, `update fo_stage set label = 'Renamed by the firm' where firm_id = '${SF}' and key = 'QUALIFIED' and pipeline = 'INDIVIDUAL'; update fo_service set active = false where firm_id = '${SF}'`);
  const snap = snapshot(DEMO);
  const again = await seedSampleFirmsFrontOffice(db);
  ok("FO-1a pass: a second seed changes nothing, and keeps a person's changes (a renamed stage, a service turned off)", again.results.every((r) => !r.seeded) && snapshot(DEMO) === snap);
  // A new firm by firm.created; two deliveries at once seed it once.
  const NF = u(100); firm(DEMO, NF, "new-firm");
  sql(DEMO, `insert into module_event (id, firm_id, type, subject_id, payload) values ('${u(101)}', '${NF}', 'firm.created', '${NF}', '{}'), ('${u(102)}', '${SF}', 'firm.updated', '${SF}', '{}')`);
  const twice = await Promise.all([onFirmCreated(db, { type: "firm.created", firmId: NF }), onFirmCreated(db, { type: "firm.created", firmId: NF })]);
  ok("FO-1a pass: firm.created seeds a new firm once, even delivered twice at once (16 stages, reasons, one form, its services)",
    twice.filter((r) => r?.seeded).length === 1 && counts(NF) === `16:14:1:${SERVICE}`, { twice, n: counts(NF) });
  // A setup row already there but not seeded (review m7): two seeds at once still seed once (the row lock, not the insert).
  const PRE = u(105); firm(DEMO, PRE, "pre-setup"); sql(DEMO, `insert into fo_sales_setup (firm_id) values ('${PRE}')`);
  const pre = await Promise.all([1, 2, 3].map(() => onFirmCreated(db, { type: "firm.created", firmId: PRE })));
  ok("FO-1a pass: with the setup row already there, three seeds at once seed once (one web form)", pre.filter((r) => r?.seeded).length === 1 && counts(PRE) === `16:14:1:${SERVICE}`, { pre, c: counts(PRE) });
  ok("FO-1a fail: the seed mark is set once (a cleared mark would seed again over a person's changes)", refused(DEMO, `update fo_sales_setup set seeded_at = null, seeded_by = null where firm_id = '${PRE}'`, /seeded once/));
  const GONE = u(106); firm(DEMO, GONE, "gone-firm"); sql(DEMO, `update platform_firm set status = 'DELETED' where id = '${GONE}'`);
  ok("FO-1a fail: a DELETED firm gets no front office", !(await onFirmCreated(db, { type: "firm.created", firmId: GONE }))?.seeded && sql(DEMO, `select count(*) from fo_sales_setup where firm_id = '${GONE}'`) === "0");
  ok("FO-1a pass: another event type seeds nothing", (await onFirmCreated(db, { type: "firm.updated", firmId: SF })) === null);
  const NF2 = u(103); firm(DEMO, NF2, "missed-firm");
  sql(DEMO, `insert into module_event (id, firm_id, type, subject_id, payload) values ('${u(104)}', '${NF2}', 'firm.created', '${NF2}', '{}')`);
  const caught = await seedCreatedFirms(db);
  ok("FO-1a pass: a firm.created missed by the subscriber is seeded by the catch-up, and only that one", caught.length === 1 && caught[0].firmId === NF2 && caught[0].seeded && (await seedCreatedFirms(db)).length === 0, caught);
  ok("FO-1a fail: a firm id that is no platform firm is refused and seeds nothing",
    await throwsLike(() => db.$transaction((tx) => seedFirmFrontOffice(tx, u(999))), (e) => /no platform firm/.test(String(e))) && sql(DEMO, `select count(*) from fo_stage where firm_id = '${u(999)}'`) === "0");
  ok("FO-1a fail: a firm id that is not a uuid is refused before any query", await throwsLike(() => db.$transaction((tx) => seedFirmFrontOffice(tx, "sample-firm")), (e) => /not a firm id/.test(String(e))));

  // ------------------------------------------------------------------------- a repeat enquiry is a second lead
  const P1 = u(200); person(DEMO, SF, P1);
  const L1 = sql(DEMO, leadSql(SF, u(201), P1)), L2 = sql(DEMO, leadSql(SF, u(202), P1));
  ok("FO-1a pass: a repeat enquiry makes a second lead for the same person, while the first is open (AG02-D6)", L1 === "L-00001" && L2 === "L-00002" && sql(DEMO, `select count(*) from fo_lead where person_id = '${P1}' and state = 'OPEN'`) === "2", [L1, L2]);
  // A unique index over (firm_id, person_id) on fo_lead (or with state) would make a repeat enquiry fail (review: the
  // fail case names such an index).
  const perPersonUnique = (d: string) => sql(d, `select coalesce(string_agg(c.relname, ',' order by c.relname), '') from pg_index i join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'fo_lead'::regclass and i.indisunique and not exists (select 1 from unnest(i.indkey) k join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k
      where a.attname not in ('firm_id', 'person_id', 'state'))`);
  ok("FO-1a pass: no unique index on fo_lead keys a lead by its person (so a repeat enquiry is a new lead)", perPersonUnique(DEMO) === "", perPersonUnique(DEMO));
  sql(BARE, `alter table fo_lead add column firm_id uuid, add column person_id uuid; create unique index fo_lead_one_per_person on fo_lead (firm_id, person_id)`);
  ok("FO-1a fail: a one-lead-per-person unique index is named by the same check", perPersonUnique(BARE) === "fo_lead_one_per_person");
  ok("FO-1a fail: a lead without a person is refused", refused(DEMO, `insert into fo_lead (id, firm_id, door, source, created_by, updated_at) values ('${u(203)}', '${SF}', 'MANUAL', 'WEBSITE', 'test', now())`, /null value in column "person_id"/));
  ok("FO-1a fail: a lead on another firm's person is refused (firm A cannot name firm B's row)", refused(DEMO, leadSql(SS, u(204), P1), /violates foreign key constraint/));

  // ------------------------------------------------------------------------- one receipt per intake key
  const FORM = sql(DEMO, `select id from fo_web_form where firm_id = '${SF}'`);
  const receipt = (key: string, door = "WEB_FORM", form: string | null = FORM) => `insert into fo_arrival_receipt (firm_id, door, web_form_id, intake_key, payload_hash) values ('${SF}', '${door}', ${form ? `'${form}'` : "null"}, '${key}', 'h') on conflict (firm_id, door, intake_key) do nothing`;
  sql(DEMO, receipt(`form:${FORM}:sub-1`)); sql(DEMO, receipt(`form:${FORM}:sub-1`)); sql(DEMO, receipt("booking:b-1", "BOOKING", null)); sql(DEMO, receipt("booking:b-1", "BOOKING", null));
  ok("FO-1a pass: the same intake key twice is one receipt (form + submission id; booking:<id>)", sql(DEMO, `select count(*) from fo_arrival_receipt where firm_id = '${SF}'`) === "2");
  ok("FO-1a fail: a second receipt with the same key is refused when written without ON CONFLICT", refused(DEMO, receipt(`form:${FORM}:sub-1`).replace(/ on conflict.*$/, ""), /duplicate key value violates unique constraint/));
  ok("FO-1a fail: an intake key that does not carry its door and form is refused", refused(DEMO, receipt("sub-2"), /fo_arrival_receipt_key_check/) && refused(DEMO, receipt(`form:${u(9)}:sub-3`), /fo_arrival_receipt_key_check/) && refused(DEMO, receipt("form:x:1", "BOOKING", null), /fo_arrival_receipt_key_check/));
  ok("FO-1a fail: an intake key with a space or a line break is refused", refused(DEMO, receipt(`form:${FORM}:sub 4`), /fo_arrival_receipt_key_check/));
  sql(DEMO, `insert into fo_arrival_receipt (firm_id, door, intake_key, payload_hash, outcome, completed_at, person_id) values ('${SF}', 'BOOKING', 'booking:b-2', 'h', 'ON_OPEN_PROSPECT', now(), '${P1}')`);
  ok("FO-1a pass: a booking by a person with an open prospect is a receipt with no lead (AG-2-84 rule 8)", sql(DEMO, `select outcome from fo_arrival_receipt where intake_key = 'booking:b-2'`) === "ON_OPEN_PROSPECT");
  ok("FO-1a fail: that outcome on another door, or without the person, is refused", refused(DEMO, `insert into fo_arrival_receipt (firm_id, door, intake_key, payload_hash, outcome, completed_at, person_id) values ('${SF}', 'MANUAL', 'manual:x', 'h', 'ON_OPEN_PROSPECT', now(), '${P1}')`, /outcome_check/)
    && refused(DEMO, `insert into fo_arrival_receipt (firm_id, door, intake_key, payload_hash, outcome, completed_at) values ('${SF}', 'BOOKING', 'booking:b-3', 'h', 'ON_OPEN_PROSPECT', now())`, /outcome_check/));
  ok("FO-1a fail: a receipt whose lead is about another person is refused (review m4)", refused(DEMO, `insert into fo_arrival_receipt (firm_id, door, intake_key, payload_hash, outcome, completed_at, lead_id, person_id) values ('${SF}', 'MANUAL', 'manual:r-2', 'h', 'CREATED', now(), '${u(201)}', '${u(206)}')`, /foreign key/));
  ok("FO-1a fail: a receipt marked CREATED without its lead is refused", refused(DEMO, `insert into fo_arrival_receipt (firm_id, door, intake_key, payload_hash, outcome, completed_at) values ('${SF}', 'MANUAL', 'manual:r-1', 'h', 'CREATED', now())`, /fo_arrival_receipt_outcome_check/));

  // ------------------------------------------------------------------------- attribution: write-once
  sql(DEMO, `insert into fo_lead_attribution (firm_id, lead_id, utm_source, utm_medium) values ('${SF}', '${u(201)}', 'google', 'cpc')`);
  ok("FO-1a pass: a lead's attribution is written once (AG-2-8a)", sql(DEMO, `select utm_source || '/' || utm_medium from fo_lead_attribution where lead_id = '${u(201)}'`) === "google/cpc");
  ok("FO-1a fail: attribution refuses update, delete and truncate", refused(DEMO, `update fo_lead_attribution set utm_source = 'bing'`, /written once/) && refused(DEMO, `delete from fo_lead_attribution`, /written once/) && refused(DEMO, `truncate fo_lead_attribution`, /written once/));
  ok("FO-1a fail: a second attribution for the same lead is refused", refused(DEMO, `insert into fo_lead_attribution (firm_id, lead_id) values ('${SF}', '${u(201)}')`, /duplicate key/));

  // ------------------------------------------------------------------------- L-/P- numbers under 20 parallel inserts
  const parallel = async (n: number, f: (i: number) => string) => Promise.all(Array.from({ length: n }, (_, i) => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`select pg_sleep(0.05)`);
    return (await tx.$queryRawUnsafe<{ number: string }[]>(f(i)))[0].number;
  }, { timeout: 30_000 })));
  const P2 = u(300); person(DEMO, NF, P2, "client.b@example.com");
  const leadNos = await parallel(20, (i) => leadSql(NF, u(400 + i), P2));
  const want = (p: string) => Array.from({ length: 20 }, (_, i) => `${p}-${String(i + 1).padStart(5, "0")}`).join(",");
  ok("FO-1a pass: L- numbers never repeat under 20 parallel inserts (L-00001 … L-00020, no gap)", [...leadNos].sort().join(",") === want("L"), leadNos);
  const ENG = stageId(DEMO, NF, "INDIVIDUAL", "ENGAGED");
  const prosNos = await parallel(20, (i) => prospectSql(NF, u(500 + i), u(400 + i), "INDIVIDUAL", ENG, { subject_person_id: `'${P2}'`, primary_contact_person_id: `'${P2}'` }));
  ok("FO-1a pass: P- numbers never repeat under 20 parallel inserts (P-00001 … P-00020)", [...prosNos].sort().join(",") === want("P"), prosNos);
  ok("FO-1a pass: numbers are per firm (another firm starts at L-00001)", sql(DEMO, leadSql(SS, u(205), (person(DEMO, SS, u(206)), u(206)))) === "L-00001");
  ok("FO-1a fail: a number the writer gives is replaced by the next one", sql(DEMO, leadSql(NF, u(420), P2, `number='L-00001'`)) === "L-00021");
  ok("FO-1a fail: a number never changes", refused(DEMO, `update fo_lead set number = 'L-09999' where id = '${u(420)}'`, /a number never changes/));
  ok("FO-1a fail: a number counter never goes back (a wound-back counter would repeat a removed lead's number)", refused(DEMO, `update fo_sales_setup set next_lead_no = 1 where firm_id = '${NF}'`, /never goes back/));
  sql(DEMO, `update fo_sales_setup set next_lead_no = 99999 where firm_id = '${SS}'`);
  ok("FO-1a fail: past 99999 a number grows a digit, never cut to a repeat (L-99999, L-100000)", sql(DEMO, leadSql(SS, u(207), u(206))) === "L-99999" && sql(DEMO, leadSql(SS, u(208), u(206))) === "L-100000");
  const NOSETUP = u(110); firm(DEMO, NOSETUP, "no-setup");
  ok("FO-1a fail: a front-office row of a firm with no front office set up is refused", refused(DEMO, `insert into fo_person (id, firm_id, created_by, updated_at) values ('${u(111)}', '${NOSETUP}', 'test', now())`, /violates foreign key constraint/));

  // ------------------------------------------------------------------------- a prospect's stage: own firm, own pipeline
  const LP = u(209); sql(DEMO, leadSql(SF, LP, P1));
  const ENG_SF = stageId(DEMO, SF, "INDIVIDUAL", "ENGAGED");
  ok("FO-1a pass: a prospect sits on its own firm's stage of its type's pipeline", /^P-\d{5}$/.test(sql(DEMO, prospectSql(SF, u(600), LP, "INDIVIDUAL", ENG_SF, { subject_person_id: `'${P1}'`, primary_contact_person_id: `'${P1}'` }))));
  ok("FO-1a fail: a stage of the other pipeline is refused (composite key)", refused(DEMO, prospectSql(SF, u(601), LP, "INDIVIDUAL", stageId(DEMO, SF, "CORPORATE", "ENGAGED"), { subject_person_id: `'${P1}'`, primary_contact_person_id: `'${P1}'` }), /violates foreign key constraint/));
  ok("FO-1a fail: another firm's stage is refused (composite key)", refused(DEMO, prospectSql(SF, u(602), LP, "INDIVIDUAL", ENG, { subject_person_id: `'${P1}'`, primary_contact_person_id: `'${P1}'` }), /violates foreign key constraint/));
  ok("FO-1a fail: an Individual prospect whose primary contact is not its subject is refused", refused(DEMO, prospectSql(SF, u(603), LP, "INDIVIDUAL", ENG_SF, { subject_person_id: `'${P1}'`, primary_contact_person_id: `'${u(206)}'` }), /fo_prospect_subject_check|foreign key/));

  // ------------------------------------------------------------------------- Corporate: a company and a linked primary contact
  const CO = u(700), CO2 = u(701), P3 = u(702);
  person(DEMO, SF, P3, "hr@example.com");
  sql(DEMO, `insert into fo_company (id, firm_id, operating_name, normalised_name, created_by, updated_at) values ('${CO}', '${SF}', 'Sample Bakery Ltd', 'sample bakery', 'test', now()), ('${CO2}', '${SF}', 'Other Co', 'other co', 'test', now())`);
  const ENG_CO = stageId(DEMO, SF, "CORPORATE", "ENGAGED");
  const corp = (id: string, company: string | null, contact: string) => prospectSql(SF, id, LP, "CORPORATE", ENG_CO, { subject_company_id: company ? `'${company}'` : "null", primary_contact_person_id: `'${contact}'` });
  ok("FO-1a fail: a Corporate prospect without a company is refused", refused(DEMO, corp(u(710), null, P3), /fo_prospect_subject_check|live PRIMARY contact/));
  ok("FO-1a fail: a Corporate prospect whose primary contact is not linked to the company is refused (at commit)", refused(DEMO, corp(u(711), CO, P3), /linked to its company/));
  sql(DEMO, `insert into fo_company_contact (id, firm_id, company_id, person_id, role, created_by) values ('${u(720)}', '${SF}', '${CO}', '${P3}', 'PRIMARY', 'test'), ('${u(721)}', '${SF}', '${CO2}', '${P1}', 'HR', 'test')`);
  ok("FO-1a fail: a person linked to another company only is not enough", refused(DEMO, corp(u(712), CO, P1), /linked to its company/));
  ok("FO-1a pass: a Corporate prospect with its company and a contact linked to it is accepted (AG-2-77 rule 4)", /^P-/.test(sql(DEMO, corp(u(713), CO, P3))));
  ok("FO-1a fail: that contact's last link cannot be ended or removed while the prospect is open (AG-2-77 rule 6)", refused(DEMO, `update fo_company_contact set valid_to = now() where id = '${u(720)}'`, /primary contact of open prospect/) && refused(DEMO, `delete from fo_company_contact where id = '${u(720)}'`, /primary contact of open prospect/) && refused(DEMO, `truncate fo_company_contact`, /written once|never changed/));
  ok("FO-1a fail: a second live PRIMARY contact at one company is refused", refused(DEMO, `insert into fo_company_contact (firm_id, company_id, person_id, role, created_by) values ('${SF}', '${CO}', '${P1}', 'PRIMARY', 'test')`, /fo_company_contact_one_primary_key/));
  ok("FO-1a fail: the same person and role linked twice while live is refused", refused(DEMO, `insert into fo_company_contact (firm_id, company_id, person_id, role, created_by) values ('${SF}', '${CO2}', '${P1}', 'HR', 'test')`, /fo_company_contact_live_role_key/));
  // The swap (review M1, break B1): end the old PRIMARY, add the new one, repoint the prospect, in one transaction.
  sql(DEMO, `begin; update fo_company_contact set valid_to = now() where id = '${u(720)}'; insert into fo_company_contact (id, firm_id, company_id, person_id, role, created_by) values ('${u(722)}', '${SF}', '${CO}', '${P1}', 'PRIMARY', 'test'); update fo_prospect set primary_contact_person_id = '${P1}' where id = '${u(713)}'; commit;`);
  ok("FO-1a pass: the primary contact is swapped in one transaction (AG-2-77 rule 6)", sql(DEMO, `select primary_contact_person_id from fo_prospect where id = '${u(713)}'`) === P1 && sql(DEMO, `select count(*) from fo_company_contact where company_id = '${CO}' and role = 'PRIMARY' and valid_to is null and person_id = '${P1}'`) === "1");
  ok("FO-1a fail: the same swap without repointing the prospect is refused at commit, and nothing of it stays", refused(DEMO, `begin; update fo_company_contact set valid_to = now() where id = '${u(722)}'; insert into fo_company_contact (firm_id, company_id, person_id, role, created_by) values ('${SF}', '${CO}', '${P3}', 'PRIMARY', 'test'); commit;`, /primary contact of open prospect/)
    && sql(DEMO, `select person_id from fo_company_contact where company_id = '${CO}' and role = 'PRIMARY' and valid_to is null`) === P1);
  // Two transactions at once (break B2): one adds a prospect naming the contact, the other ends the contact's link.
  const P4 = u(730), CO3 = u(731); person(DEMO, SF, P4, "owner@example.com");
  sql(DEMO, `insert into fo_company (id, firm_id, operating_name, normalised_name, created_by, updated_at) values ('${CO3}', '${SF}', 'Race Co', 'race co', 'test', now()); insert into fo_company_contact (id, firm_id, company_id, person_id, role, created_by) values ('${u(732)}', '${SF}', '${CO3}', '${P4}', 'PRIMARY', 'test')`);
  const race = await Promise.allSettled([
    db.$transaction(async (tx) => { await tx.$executeRawUnsafe(`set constraints fo_prospect_contact_linked immediate`); await tx.$executeRawUnsafe(prospectSql(SF, u(733), LP, "CORPORATE", ENG_CO, { subject_company_id: `'${CO3}'`, primary_contact_person_id: `'${P4}'` }).replace(/ returning number$/, "")); await tx.$executeRawUnsafe(`select pg_sleep(0.4)`); }, { timeout: 30_000 }),
    db.$transaction(async (tx) => { await tx.$executeRawUnsafe(`select pg_sleep(0.1)`); await tx.$executeRawUnsafe(`update fo_company_contact set valid_to = now() where id = '${u(732)}'`); }, { timeout: 30_000 }),
  ]);
  const orphans = sql(DEMO, `select count(*) from fo_prospect p join fo_stage s on s.id = p.stage_id where p.type = 'CORPORATE' and s.kind not in ('WON', 'LOST')
    and not exists (select 1 from fo_company_contact c where c.company_id = p.subject_company_id and c.person_id = p.primary_contact_person_id and c.valid_to is null)`);
  // The prospect checks first (immediate) and holds its share lock while it sleeps; the link's end waits for it, then sees
  // the committed prospect and is refused. Without the lock both would commit and leave the prospect with no contact.
  ok("FO-1a fail: of a new prospect and an ending link at once, the ending is refused; no open Corporate prospect is left without its contact (break B2)",
    race[0].status === "fulfilled" && race[1].status === "rejected" && orphans === "0", { race: race.map((r) => r.status === "rejected" ? String(r.reason).slice(-160) : r.status), orphans });

  // ------------------------------------------------------------------------- stages, reasons, lost and won
  const LOST = stageId(DEMO, SF, "INDIVIDUAL", "LOST"), WON = stageId(DEMO, SF, "INDIVIDUAL", "RETAINER_SIGNED");
  ok("FO-1a fail: a move to Lost without a reason is refused (AG-2-44)", refused(DEMO, `update fo_prospect set stage_id = '${LOST}' where id = '${u(600)}'`, /lost prospect needs a reason/));
  ok("FO-1a fail: a lead-close reason cannot be a lost reason", refused(DEMO, `update fo_prospect set stage_id = '${LOST}', lost_reason_id = '${reasonId(DEMO, SF, "LEAD_CLOSE", "JUNK_OR_SPAM")}', lost_reason_kind = 'PROSPECT_LOST' where id = '${u(600)}'`, /foreign key/));
  sql(DEMO, `update fo_prospect set stage_id = '${LOST}', lost_reason_id = '${reasonId(DEMO, SF, "PROSPECT_LOST", "PRICE")}', lost_reason_kind = 'PROSPECT_LOST' where id = '${u(600)}'`);
  ok("FO-1a pass: Lost with a reason from the prospect list is accepted", sql(DEMO, `select r.key from fo_prospect p join fo_reason r on r.id = p.lost_reason_id where p.id = '${u(600)}'`) === "PRICE");
  ok("FO-1a fail: the WON stage without how it was won is refused (contracts §2.6)", refused(DEMO, `update fo_prospect set stage_id = '${WON}', lost_reason_id = null, lost_reason_kind = null where id = '${u(600)}'`, /names how it was won/));
  sql(DEMO, `update fo_prospect set stage_id = '${WON}', lost_reason_id = null, lost_reason_kind = null, won_via = 'SIGNED_OFFLINE', won_at = now() where id = '${u(600)}'`);
  ok("FO-1a pass: WON with won_via is accepted", sql(DEMO, `select won_via from fo_prospect where id = '${u(600)}'`) === "SIGNED_OFFLINE");
  sql(DEMO, `update fo_prospect set stage_id = '${stageId(DEMO, SF, "CORPORATE", "LOST")}', lost_reason_id = '${reasonId(DEMO, SF, "PROSPECT_LOST", "PRICE")}', lost_reason_kind = 'PROSPECT_LOST' where id = '${u(713)}'`);
  sql(DEMO, `update fo_company_contact set valid_to = now() where id = '${u(722)}'`);
  ok("FO-1a pass: once the Corporate prospect is lost, its contact may leave the company", sql(DEMO, `select valid_to is not null from fo_company_contact where id = '${u(722)}'`) === "t");
  ok("FO-1a fail: a stage's key never changes, and the WON stage is never removed or turned off", refused(DEMO, `update fo_stage set key = 'WON' where id = '${WON}'`, /never change/) && refused(DEMO, `update fo_stage set active = false where id = '${WON}'`, /never turned off/) && refused(DEMO, `delete from fo_stage where id = '${LOST}'`, /never removed/));
  const CONSULT = stageId(DEMO, SF, "INDIVIDUAL", "CONSULT");
  sql(DEMO, `delete from fo_stage where id = '${CONSULT}'`);
  ok("FO-1a pass: an ACTIVE stage the firm does not need can be removed (AG-2-20 rule 1)", sql(DEMO, `select count(*) from fo_stage where firm_id = '${SF}' and pipeline = 'INDIVIDUAL'`) === "7");
  ok("FO-1a fail: the last live ACTIVE stage of a pipeline is never removed or turned off (AG-2-20 rule 5; break B4)",
    refused(DEMO, `delete from fo_stage where firm_id = '${SF}' and pipeline = 'CORPORATE' and kind = 'ACTIVE'`, /at least one active ACTIVE stage/)
    && refused(DEMO, `update fo_stage set active = false where firm_id = '${SF}' and pipeline = 'CORPORATE' and kind = 'ACTIVE'`, /at least one active ACTIVE stage/)
    && sql(DEMO, `select count(*) from fo_stage where firm_id = '${SF}' and pipeline = 'CORPORATE' and kind = 'ACTIVE' and active`) === "5");
  ok("FO-1a fail: a second WON stage in one pipeline is refused", refused(DEMO, `insert into fo_stage (firm_id, pipeline, key, label, sort_order, kind) values ('${SF}', 'INDIVIDUAL', 'WON2', 'Won again', 9, 'WON')`, /fo_stage_one_end_kind_key/));
  const ADDED = reasonId(DEMO, SF, "LEAD_CLOSE", "ADDED_TO_PROSPECT");
  sql(DEMO, `update fo_reason set label = 'Joined a sale' where id = '${ADDED}'`);
  ok("FO-1a pass: a system reason may be renamed; its key stays (AG-2-80 tests)", sql(DEMO, `select key || '/' || label from fo_reason where id = '${ADDED}'`) === "ADDED_TO_PROSPECT/Joined a sale");
  ok("FO-1a fail: a system reason is never removed or turned off, and a reason's key never changes", refused(DEMO, `delete from fo_reason where id = '${ADDED}'`, /never removed/) && refused(DEMO, `delete from fo_reason where firm_id = '${SF}' and key = 'DUPLICATE_PROSPECT'`, /never removed/) && refused(DEMO, `update fo_reason set active = false where id = '${ADDED}'`, /never turned off/) && refused(DEMO, `update fo_reason set key = 'X' where firm_id = '${SF}' and key = 'PRICE'`, /never change/));

  // ------------------------------------------------------------------------- lead close fields
  ok("FO-1a fail: a CLOSED lead without a reason is refused (AG-2-80 rule 2)", refused(DEMO, `update fo_lead set state = 'CLOSED', closed_at = now() where id = '${u(202)}'`, /fo_lead_close_check/));
  ok("FO-1a fail: a lost reason cannot close a lead", refused(DEMO, `update fo_lead set state = 'CLOSED', closed_at = now(), closed_by = 'test', close_reason_id = '${reasonId(DEMO, SF, "PROSPECT_LOST", "PRICE")}', close_reason_kind = 'LEAD_CLOSE' where id = '${u(202)}'`, /foreign key/));
  sql(DEMO, `update fo_lead set state = 'CLOSED', closed_at = now(), closed_by = 'test', close_reason_id = '${reasonId(DEMO, SF, "LEAD_CLOSE", "JUNK_OR_SPAM")}', close_reason_kind = 'LEAD_CLOSE' where id = '${u(202)}'`);
  ok("FO-1a pass: a lead closes with a reason from the lead list", sql(DEMO, `select state from fo_lead where id = '${u(202)}'`) === "CLOSED");
  ok("FO-1a fail: a close without who closed it, or an engage without who engaged, is refused", refused(DEMO, `update fo_lead set closed_by = null where id = '${u(202)}'`, /fo_lead_close_check/) && refused(DEMO, `update fo_lead set state = 'ENGAGED', engaged_at = now() where id = '${u(201)}'`, /fo_lead_engaged_check/));
  sql(DEMO, `update fo_lead set state = 'ENGAGED', engaged_at = now(), engaged_by = 'test' where id = '${LP}'`);
  ok("FO-1a fail: a lead with a prospect stays ENGAGED (AG-2-80 rule 5)", refused(DEMO, `update fo_lead set state = 'OPEN', engaged_at = null, engaged_by = null where id = '${LP}'`, /stays ENGAGED/));

  // ------------------------------------------------------------------------- owners, calls, notes, moves, forms
  const ST_A = u(800), ST_B = u(801); staff(DEMO, ST_A, SF, "staff.a@example.com"); staff(DEMO, ST_B, SS, "staff.b@example.com");
  sql(DEMO, `update fo_lead set owner_staff_id = '${ST_A}' where id = '${u(201)}'`);
  ok("FO-1a pass: a lead's owner is a staff member of its firm", sql(DEMO, `select owner_staff_id from fo_lead where id = '${u(201)}'`) === ST_A);
  ok("FO-1a fail: another firm's staff member (or no staff member) as owner is refused", refused(DEMO, `update fo_lead set owner_staff_id = '${ST_B}' where id = '${u(201)}'`, /no staff member of this firm/) && refused(DEMO, `update fo_prospect set owner_staff_id = '${u(999)}' where id = '${u(713)}'`, /no staff member of this firm/));
  const call = (lead: string | null, pros: string | null, who = P1) => `insert into fo_call (firm_id, person_id, lead_id, prospect_id, direction, outcome, started_at, by_actor) values ('${SF}', '${who}', ${lead ? `'${lead}'` : "null"}, ${pros ? `'${pros}'` : "null"}, 'OUT', 'NO_ANSWER', now(), 'test')`;
  sql(DEMO, call(u(201), null));
  ok("FO-1a pass: a call is logged on a lead, about that lead's person", sql(DEMO, `select count(*) from fo_call where lead_id = '${u(201)}'`) === "1");
  ok("FO-1a fail: a call on both a lead and a prospect, or on neither, is refused", refused(DEMO, call(u(201), u(600)), /fo_call_context_check/) && refused(DEMO, call(null, null), /fo_call_context_check/));
  ok("FO-1a fail: a call on a lead about another person is refused", refused(DEMO, call(u(201), null, P3), /foreign key/));
  sql(DEMO, `insert into fo_note (firm_id, person_id, lead_id, text, by_actor) values ('${SF}', '${P1}', '${u(201)}', 'Asked about fees.', 'test')`);
  ok("FO-1a pass: a note is INTERNAL unless it says otherwise (AG-13-21)", sql(DEMO, `select visibility from fo_note where firm_id = '${SF}'`) === "INTERNAL");
  ok("FO-1a fail: a note on a lead about another person is refused (review m4)", refused(DEMO, `insert into fo_note (firm_id, person_id, lead_id, text, by_actor) values ('${SF}', '${P3}', '${u(201)}', 'x', 'test')`, /foreign key/));
  ok("FO-1a fail: a note of only spaces, tabs or no-break spaces is refused", refused(DEMO, `insert into fo_note (firm_id, person_id, text, by_actor) values ('${SF}', '${P1}', E' \\t\\u00a0\\n', 'test')`, /fo_note_context_check/));
  ok("FO-1a fail: notes are add-only (update, delete, truncate refused)", refused(DEMO, `update fo_note set text = 'x'`, /written once/) && refused(DEMO, `delete from fo_note`, /written once/) && refused(DEMO, `truncate fo_note`, /written once/));
  const move = (pros: string, from: string | null, to: string, cause: string) => `insert into fo_stage_move (firm_id, prospect_id, from_stage_id, to_stage_id, cause, by_actor) values ('${SF}', '${pros}', ${from ? `'${from}'` : "null"}, '${to}', '${cause}', 'test')`;
  sql(DEMO, move(u(600), LOST, WON, "SIGNED_OFFLINE"));
  ok("FO-1a pass: a stage move to the prospect's stage keeps its cause", sql(DEMO, `select cause from fo_stage_move where prospect_id = '${u(600)}'`) === "SIGNED_OFFLINE");
  ok("FO-1a fail: a move to a stage the prospect is not in is refused (review m3)", refused(DEMO, move(u(600), WON, LOST, "PERSON"), /goes to the prospect's stage/));
  ok("FO-1a fail: a stage move is never changed", refused(DEMO, `update fo_stage_move set cause = 'BOOKING'`, /written once/));
  // Change type (contracts §7 §2.1): the prospect moves to the other pipeline's first stage; only CHANGE_TYPE crosses.
  const LT = u(740); sql(DEMO, leadSql(SF, LT, P1)); sql(DEMO, prospectSql(SF, u(741), LT, "INDIVIDUAL", ENG_SF, { subject_person_id: `'${P1}'`, primary_contact_person_id: `'${P1}'` }));
  sql(DEMO, `insert into fo_company_contact (firm_id, company_id, person_id, role, created_by) values ('${SF}', '${CO2}', '${P1}', 'SIGNATORY', 'test'); update fo_prospect set type = 'CORPORATE', stage_id = '${ENG_CO}', subject_person_id = null, subject_company_id = '${CO2}' where id = '${u(741)}'`);
  ok("FO-1a fail: a move between pipelines with another cause is refused", refused(DEMO, move(u(741), ENG_SF, ENG_CO, "PERSON"), /only Change type/));
  sql(DEMO, move(u(741), ENG_SF, ENG_CO, "CHANGE_TYPE"));
  ok("FO-1a pass: Change type is recorded as a move between pipelines", sql(DEMO, `select cause from fo_stage_move where prospect_id = '${u(741)}'`) === "CHANGE_TYPE");
  ok("FO-1a fail: the web form is not turned on without a consent wording (SA-11-29)", refused(DEMO, `update fo_web_form set enabled = true where id = '${FORM}'`, /fo_web_form_consent_check/));
  sql(DEMO, `update fo_web_form set enabled = true, consent_wording_version_id = '${u(900)}' where id = '${FORM}'`);
  ok("FO-1a pass: with a consent wording version named, it turns on", sql(DEMO, `select enabled from fo_web_form where id = '${FORM}'`) === "t");
  ok("FO-1a fail: a front-office row never moves firm", refused(DEMO, `update fo_person set firm_id = '${SF}' where id = '${u(206)}'`, /never moves to another firm/) && refused(DEMO, `update fo_sales_setup set firm_id = '${NOSETUP}' where firm_id = '${SS}'`, /never moves to another firm/));
  ok("FO-1a fail: an email not in lower case, or an unreadable phone marked readable, is refused", refused(DEMO, `insert into fo_person (firm_id, email, created_by, updated_at) values ('${SF}', 'Client@Example.com', 'test', now())`, /fo_person_email_check/) && refused(DEMO, `insert into fo_person (firm_id, phone, created_by, updated_at) values ('${SF}', '416 555', 'test', now())`, /fo_person_phone_check/));
  ok("FO-1a pass: an unreadable phone is kept as typed when marked so (AG-2-84 rule 5)", (sql(DEMO, `insert into fo_person (firm_id, phone, phone_readable, created_by, updated_at) values ('${SF}', '416 555', false, 'test', now())`), true));
} finally {
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db]);
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
