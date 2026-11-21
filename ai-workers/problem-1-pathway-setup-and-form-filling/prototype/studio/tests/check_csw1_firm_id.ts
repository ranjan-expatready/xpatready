// CS-W1 part 1 (BACKLOG CS-W1; brief design/briefs/CS-W1.md; contract v0.1 §8 step 1, conditions 1 and 3; P-575, P-588 (4)):
// the platform firm id beside the text firm key on runtime_case, case_stage and firm_case_counter.
//   1. a scratch database: every migration before 20261118090000_csw1_firm_id, two Sample firms in platform_firm, cases,
//      stages and counters of both firms and of a key with no platform firm; then the migration and every later one.
//      DW1 (backfill), DW2 (the fill triggers), DW7 (names, INVOKER, the one definer), DW9 (the lookup past PF-12's
//      forced wall), DW10 (xr_case_lookup's rights).
//   2. the isolated copy this suite runs on (migrate, then start with the repository's settings): DW5, both Sample firms
//      exist, every case is filled, and the demo reset deletes the demo workspace's cases of both firms and nothing else.
// Each rule has a pass and a fail. No model call (US$0). `migrate diff` (DW7) is check_prisma_schema.ts's.
//   zsh studio/tools/isolated.sh rt_csw1 4493 start && tsx studio/tests/check_csw1_firm_id.ts 4493 xr_studio_rt_csw1
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { call, sql as copySql } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), NEW = "20261118090000_csw1_firm_id";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", DB = `xr_studio_csw1_mig_${process.pid}`, HOST = "127.0.0.1:54329";
const url = (user: string) => `postgresql://${user}@${HOST}/${DB}`;
const psql = (args: string[], user = "xr_studio") => execFileSync(join(BIN, "psql"), [url(user), "-X", "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (q: string, user?: string) => psql(["-Atc", q], user);
const err = (q: string, user?: string) => { try { sql(q, user); return ""; } catch (e) { return String((e as { stderr?: string }).stderr ?? e); } };
const file = (f: string) => psql(["-f", f]);
const pg = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [W, CMB, F1, F2] = [u(1), u(2), u(3), u(4)];                 // workspace, combination, sample-firm, sample-solo
const [K1, K2, K3] = [u(11), u(12), u(13)];                         // a case of each firm, and one of a key with no firm

execFileSync(join(BIN, "dropdb"), [...pg, "--if-exists", "--force", DB]);
execFileSync(join(BIN, "createdb"), [...pg, DB]);
try {
  const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
  for (const d of all.filter((x) => x < NEW)) file(join(MIG, d, "migration.sql"));
  // The rows the migration reads, in the old shape; foreign keys and triggers off while seeding (as a dump restore).
  sql(`set session_replication_role = replica;
    insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values ('${F1}', 'sample-firm', 'Sample Firm', 'CA', 'a@sample-firm.example.com', now()), ('${F2}', 'sample-solo', 'Sample Solo', 'CA', 'a@sample-solo.example.com', now());
    insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by) values ('${CMB}', '${W}', '${W}', 'vv.single', 'Visitor visa', '[]', 't');
    insert into runtime_case (id, workspace_id, combination_id, reference, client_actor_id, created_by, firm_key, case_number) values
      ('${K1}', '${W}', '${CMB}', 'OLD-1', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001'), ('${K2}', '${W}', '${CMB}', 'OLD-2', 'user-P', 'user-S', 'sample-solo', 'C-2026-00001'),
      ('${K3}', '${W}', '${CMB}', 'OLD-3', 'user-P', 'user-X', 'ghost-firm', 'C-2026-00001');
    insert into party (id, workspace_id) values ('${u(6)}', '${W}');
    insert into answer_subject (id, workspace_id, party_id, subject_kind, label) select ('00000000-0000-4000-8000-0000000005' || k || r)::uuid, '${W}', '${u(6)}', s, s
      from (values ('1'), ('2'), ('3')) a(k), (values ('0', 'case'), ('1', 'principal')) b(r, s);
    insert into case_participant (id, workspace_id, case_id, subject_id, role, "order") select gen_random_uuid(), '${W}', ('00000000-0000-4000-8000-00000000001' || k)::uuid, ('00000000-0000-4000-8000-0000000005' || k || r)::uuid, s, r::int
      from (values ('1'), ('2'), ('3')) a(k), (values ('0', 'case'), ('1', 'principal')) b(r, s);
    insert into case_stage (id, workspace_id, case_id, firm_key, ord, stage_key, staff_name, client_name, combination_id, state, application_subject_id, started_from) values
      ('${u(21)}', '${W}', '${K1}', 'sample-firm', 1, 'vv', 'V', 'V', '${CMB}', 'CURRENT', '${u(510)}', 'BEGIN'), ('${u(22)}', '${W}', '${K2}', 'sample-solo', 1, 'vv', 'V', 'V', '${CMB}', 'CURRENT', '${u(520)}', 'BEGIN'),
      ('${u(23)}', '${W}', '${K3}', 'ghost-firm', 1, 'vv', 'V', 'V', '${CMB}', 'CURRENT', '${u(530)}', 'BEGIN');
    insert into firm_case_counter (workspace_id, firm_key, year, next_value) values ('${W}', 'sample-firm', 2026, 2), ('${W}', 'sample-solo', 2026, 2), ('${W}', 'ghost-firm', 2026, 2);`);
  const procs = () => sql(`select string_agg(n.nspname || '.' || p.proname, ',' order by 1) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'case_lookup')`).split(",");
  const before = new Set(procs());
  file(join(MIG, NEW, "migration.sql"));
  const added = procs().filter((p) => !before.has(p));
  for (const d of all.filter((x) => x > NEW)) file(join(MIG, d, "migration.sql"));

  // ---------------------------------------------------------------- DW1: the backfill
  const firmOf = (t: string) => sql(`select string_agg(firm_key || '=' || coalesce(firm_id::text, 'null'), ',' order by firm_key) from ${t}`);
  const want = `ghost-firm=null,sample-firm=${F1},sample-solo=${F2}`;
  ok("CS-W1 DW1 pass: after the migration every case, stage and counter whose key has a platform firm carries that firm's id",
    firmOf("runtime_case") === want && firmOf("case_stage") === want && firmOf("firm_case_counter") === want, [firmOf("runtime_case"), firmOf("case_stage"), firmOf("firm_case_counter")]);
  ok("CS-W1 DW1 fail: the case, stage and counter of a key with no platform firm stay null (never another firm's id)",
    sql(`select count(*) from (select firm_id from runtime_case where firm_key = 'ghost-firm' union all select firm_id from case_stage where firm_key = 'ghost-firm' union all select firm_id from firm_case_counter where firm_key = 'ghost-firm') x where firm_id is not null`) === "0");
  ok("CS-W1 DW1: the column is nullable in part 1, and each table has its (firm_id, …) index",
    sql(`select count(*) from information_schema.columns where column_name = 'firm_id' and is_nullable = 'YES' and table_name in ('runtime_case', 'case_stage', 'firm_case_counter')`) === "3"
    && sql(`select string_agg(indexname, ',' order by indexname) from pg_indexes where indexname like '%firm_id%' and tablename in ('runtime_case', 'case_stage', 'firm_case_counter')`) === "case_stage_firm_id_case_id_idx,firm_case_counter_firm_id_year_idx,runtime_case_firm_id_created_at_idx");

  // ---------------------------------------------------------------- DW2: the fill triggers (each insert rolled back)
  const caseRow = (id: string, key: string, firm?: string) => `insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number${firm ? ", firm_id" : ""})
    values ('${id}', '${W}', '${CMB}', 'user-P', 'user-O', '${key}', 'C-2026-0${id.slice(-4)}'${firm ? `, '${firm}'` : ""}) returning coalesce(firm_id::text, 'null')`;
  const rolledBack = (q: string, user?: string) => sql(`begin; ${q}; rollback;`, user);
  ok("CS-W1 DW2 pass: a case inserted with no firm_id gets its key's platform firm", rolledBack(caseRow(u(31), "sample-solo")) === F2);
  ok("CS-W1 DW2 pass: a case inserted with its key's own firm id is kept", rolledBack(caseRow(u(32), "sample-firm", F1)) === F1);
  ok("CS-W1 DW1/DW2 pass: a case whose key has no platform firm still inserts, its firm_id null (part 1 never refuses)", rolledBack(caseRow(u(33), "ghost-firm")) === "null");
  const e1 = err(`begin; ${caseRow(u(34), "sample-firm", F2)}; rollback;`);
  ok("CS-W1 DW2 fail: a case whose firm_id names the other Sample firm is refused, in plain words naming the key",
    /case_firm_from_key: the firm id given is not the platform firm of key "sample-firm"/.test(e1) && !e1.includes(F2), e1.split("\n")[0]);
  ok("CS-W1 DW2 fail: a firm_id with a key that has no platform firm is refused", /case_firm_from_key/.test(err(`begin; ${caseRow(u(35), "ghost-firm", F1)}; rollback;`)));
  const stageRow = (id: string, kase: string, firm?: string) => `insert into case_stage (id, workspace_id, case_id, firm_key, ord, stage_key, staff_name, client_name, combination_id, state${firm ? ", firm_id" : ""})
    values ('${id}', '${W}', '${kase}', 'sample-firm', 9, 'x${id.slice(-2)}', 'X', 'X', '${u(2)}', 'NOT_STARTED'${firm ? `, '${firm}'` : ""}) returning coalesce(firm_id::text, 'null')`;
  sql(`set session_replication_role = replica; insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by) values ('${u(5)}', '${W}', '${u(7)}', 'sp.outside', 'Study permit', '[]', 't')`);
  const stage = (id: string, kase: string, firm?: string) => stageRow(id, kase, firm).replace(`'${u(2)}', 'NOT_STARTED'`, `'${u(5)}', 'NOT_STARTED'`);
  ok("CS-W1 DW2 pass: a stage inserted with no firm_id gets its case's firm (case_firm_fill)", rolledBack(stage(u(41), K1)) === F1 && rolledBack(stage(u(42), K2)) === F2);
  ok("CS-W1 DW2 pass: a stage of a case with no firm yet stays null", rolledBack(stage(u(43), K3)) === "null");
  const e2 = err(`begin; ${stage(u(44), K1, F2)}; rollback;`);
  ok("CS-W1 DW2 fail: a case_stage row whose firm differs from its case's is refused", /case_firm_fill: a case_stage row's firm must be its runtime_case row's firm/.test(e2), e2.split("\n")[0]);
  ok("CS-W1 DW2 fail: a stage naming a firm on a case with none is refused", /case_firm_fill/.test(err(`begin; ${stage(u(45), K3, F1)}; rollback;`)));
  ok("CS-W1 DW2 pass: a new counter row (runtime_next_case_number) gets its key's firm",
    sql(`begin; select runtime_next_case_number('${W}', 'sample-solo', '2031-06-01'); select firm_id from firm_case_counter where firm_key = 'sample-solo' and year = 2031; rollback;`).split("\n").pop() === F2);
  ok("CS-W1 DW2 fail: a counter row naming the other firm is refused",
    /case_firm_from_key: the firm id given is not the platform firm of key "sample-solo"/.test(err(`begin; insert into firm_case_counter (workspace_id, firm_key, year, next_value, firm_id) values ('${W}', 'sample-solo', 2032, 1, '${F1}'); rollback;`)));
  ok("CS-W1 DW2 pass: the session's firm (app.firm_id) is the default, and matches the key's: kept",
    sql(`begin; select set_config('app.firm_id', '${F1}', true); ${caseRow(u(36), "sample-firm")}; rollback;`).split("\n").pop() === F1);
  ok("CS-W1 DW2 fail: a session in firm A opening a case keyed to firm B is refused (the default never crosses firms)",
    /case_firm_from_key/.test(err(`begin; select set_config('app.firm_id', '${F1}', true); ${caseRow(u(37), "sample-solo")}; rollback;`)));
  ok("CS-W1 DW2 pass: an empty app.firm_id (after a SET LOCAL ends) is read as none, and the key fills it",
    sql(`begin; select set_config('app.firm_id', '', true); ${caseRow(u(38), "sample-firm")}; rollback;`).split("\n").pop() === F1);

  // ---------------------------------------------------------------- DW7: names, rights of the functions
  ok("CS-W1 DW7 pass: every function the migration adds is named case_firm_*", added.length === 4 && added.every((p) => /^(public|case_lookup)\.case_firm_/.test(p)), added);
  const defs = sql(`select string_agg(n.nspname || '.' || p.proname || ':' || p.prosecdef || ':' || coalesce(array_to_string(p.proconfig, ';'), ''), ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname like 'case_firm%'`);
  ok("CS-W1 DW7 pass: the lookup is the only definer, its search_path pinned with pg_temp last",
    defs.includes("case_lookup.case_firm_id_of_key:true:search_path=pg_catalog, public, case_lookup, pg_temp"), defs);
  ok("CS-W1 DW7 fail: no trigger function of the migration runs as definer (contract §8 condition 3)",
    /public\.case_firm_fill:false:/.test(defs) && /public\.case_firm_from_key:false:/.test(defs) && /public\.case_firm_backfill:false:/.test(defs)
    && sql(`select count(*) from pg_trigger t join pg_proc p on p.oid = t.tgfoid where not t.tgisinternal and p.proname like 'case_firm%' and p.prosecdef`) === "0"
    && sql(`select string_agg(c.relname || '.' || t.tgname, ',' order by c.relname, t.tgname) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid where not t.tgisinternal and p.proname like 'case_firm%'`) === "case_stage.case_firm_fill,firm_case_counter.case_firm_from_key,runtime_case.case_firm_from_key", defs);
  ok("CS-W1 DW7: the migration's own text says how to roll back", /Rollback \(in this order\)/.test(readFileSync(join(MIG, NEW, "migration.sql"), "utf8")));

  // ---------------------------------------------------------------- DW9: the lookup under PF-12's forced wall
  ok("CS-W1 DW9 (setup): platform_firm has row-level security enabled and forced (PF-12, on main)", sql(`select relrowsecurity and relforcerowsecurity from pg_class where relname = 'platform_firm'`) === "t");
  ok("CS-W1 DW9 pass: as the app (xr_app) with no firm set, the lookup still returns the id", sql(`select case_lookup.case_firm_id_of_key('sample-firm')`, "xr_app") === F1);
  ok("CS-W1 DW9 fail: as the app with no firm set, a plain select on platform_firm returns nothing", sql(`select count(*) from platform_firm`, "xr_app") === "0");
  ok("CS-W1 DW9 pass: as the app with no firm set, a case insert still gets its firm_id", rolledBack(caseRow(u(39), "sample-solo"), "xr_app") === F2);
  ok("CS-W1 DW9 fail (odd keys): the lookup returns one id or nothing — never a row for an empty, null, wildcard or injected key",
    ["''", "null", "'%'", "'sample-firm'' or ''1''=''1'", "'SAMPLE-FIRM'", "' sample-firm'"].every((k) => sql(`select coalesce(case_lookup.case_firm_id_of_key(${k})::text, 'none')`, "xr_app") === "none"));
  ok("CS-W1 DW9 fail: PUBLIC holds no EXECUTE on the lookup and no USAGE on case_lookup (only xr_data's members call it)",
    sql(`select has_function_privilege('public', 'case_lookup.case_firm_id_of_key(text)', 'EXECUTE') or has_schema_privilege('public', 'case_lookup', 'USAGE')`) === "f"
    && sql(`select has_function_privilege('xr_staff_bypass', 'case_lookup.case_firm_id_of_key(text)', 'EXECUTE')`) === "t");

  // ---------------------------------------------------------------- DW10: xr_case_lookup's rights
  const R = "xr_case_lookup";
  const roleState = () => sql(`select r.rolcanlogin || r.rolsuper::text || r.rolbypassrls || r.rolcreaterole || r.rolcreatedb || ':' || coalesce((select string_agg(m.roleid::regrole || '>' || m.member::regrole, ',' order by 1) from pg_auth_members m where m.roleid = r.oid or m.member = r.oid), '') from pg_roles r where r.rolname = '${R}'`);
  const r0 = roleState();
  ok("CS-W1 DW10 pass: xr_case_lookup cannot log in, is no superuser and passes no wall", r0.startsWith("falsefalsefalsefalsefalse:"), r0);
  ok("CS-W1 DW10 pass: it owns the lookup and no table, and the function lives in case_lookup",
    sql(`select count(*) from pg_class where relowner = '${R}'::regrole`) === "0"
    && sql(`select n.nspname || ':' || p.proowner::regrole from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'case_firm_id_of_key'`) === `case_lookup:${R}`);
  ok("CS-W1 DW10 fail: it holds no INSERT, UPDATE, DELETE, TRUNCATE or REFERENCES on any table, and no table-wide SELECT",
    sql(`select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind in ('r', 'p', 'v') and n.nspname not in ('pg_catalog', 'information_schema')
      and (has_table_privilege('${R}', c.oid, 'INSERT') or has_table_privilege('${R}', c.oid, 'UPDATE') or has_table_privilege('${R}', c.oid, 'DELETE') or has_table_privilege('${R}', c.oid, 'TRUNCATE') or has_table_privilege('${R}', c.oid, 'REFERENCES') or has_table_privilege('${R}', c.oid, 'SELECT'))`) === "0"
    && sql(`select count(*) from information_schema.role_table_grants where grantee = '${R}'`) === "0");
  // CS-W3 part 1 (migration 20261121100000_csw3_case_door, applied above as a later migration) adds the columns its own
  // lookups read; its check_csw3_firm_scope.ts DW8 asserts the role's whole list. This line keeps CS-W1's own grant exact.
  ok("CS-W1 DW10 pass: its only column SELECT on platform_firm is (id, key)",
    sql(`select string_agg(table_name || '.' || column_name || ':' || privilege_type, ',' order by column_name) from information_schema.column_privileges where grantee = '${R}' and table_name = 'platform_firm'`) === "platform_firm.id:SELECT,platform_firm.key:SELECT");
  ok("CS-W1 DW10 fail: CREATE on case_lookup only, never on public",
    sql(`select has_schema_privilege('${R}', 'public', 'CREATE')::text || has_schema_privilege('${R}', 'case_lookup', 'CREATE')::text`) === "falsetrue");
  ok("CS-W1 DW10 pass (breaker R2-m1): its USAGE on public is its own grant, not only PUBLIC's default (a re-made public schema keeps the lookup working)",
    sql(`select count(*) from pg_namespace n, aclexplode(n.nspacl) a where n.nspname = 'public' and a.grantee = '${R}'::regrole and a.privilege_type = 'USAGE'`) === "1");
  ok("CS-W1 DW10 fail: the app's SET ROLE xr_case_lookup is refused", /permission denied to set role "xr_case_lookup"/.test(err(`set role ${R}`, "xr_app")));
  const roles = readFileSync(join(MIG, NEW, "migration.sql"), "utf8").match(/DO \$\$[\s\S]*?END \$\$;/)![0];
  sql(roles);
  ok("CS-W1 DW10 pass: running the migration's role block where the role already exists changes nothing", roleState() === r0, [r0, roleState()]);

  // ---------------------------------------------------------------- the code's lookups, as the API (xr_app) through Prisma (breaker m3)
  const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: url("xr_app"), options: "-c TimeZone=UTC" }) });
  try {
    const { firmIdByKey, firmIdOfActor, fillCaseFirmIds, forgetFirmIds } = await import("../api/src/firms.ts");
    forgetFirmIds();
    ok("CS-W1 firms.ts pass: firmIdByKey and firmIdOfActor give the platform firm id (user-S: sample-solo; user-O: sample-firm)",
      (await firmIdByKey(app, "sample-solo")) === F2 && (await firmIdOfActor(app, { id: "user-S" } as never)) === F2 && (await firmIdOfActor(app, { id: "user-O" } as never)) === F1);
    ok("CS-W1 firms.ts fail: a key with no platform firm, and a person in no firm (user-A, a configuration author), give null",
      (await firmIdByKey(app, "ghost-firm")) === null && (await firmIdOfActor(app, { id: "user-A" } as never)) === null);

    // ---------------------------------------------------------------- DW1 (breaker M1): a database whose firms come after the migration
    ok("CS-W1 DW1 fail (breaker M1): before its platform firm exists, the backfill fills nothing for that key", (await fillCaseFirmIds(app)) === 0 && firmOf("runtime_case").startsWith("ghost-firm=null"));
    sql(`set session_replication_role = replica; insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values ('${u(8)}', 'ghost-firm', 'Ghost', 'CA', 'a@ghost.example.com', now())`);
    const filled = await fillCaseFirmIds(app);
    ok("CS-W1 DW1 pass (breaker M1): once the firm exists (the seed after the migration), the backfill run by the API fills that key's case, stage and counter",
      filled === 3 && [firmOf("runtime_case"), firmOf("case_stage"), firmOf("firm_case_counter")].every((x) => x.startsWith(`ghost-firm=${u(8)},`)), [filled, firmOf("runtime_case")]);
    ok("CS-W1 DW1 pass: a second run changes nothing, and the firm id already found is not looked up again", (await fillCaseFirmIds(app)) === 0 && (await firmIdByKey(app, "ghost-firm")) === u(8));
  } finally { await app.$disconnect(); }
} finally {
  execFileSync(join(BIN, "dropdb"), [...pg, "--if-exists", "--force", DB]);
}

// ---------------------------------------------------------------- DW5: the copy (migrate, then start with the repository's settings)
const firmsOn = () => copySql(`select string_agg(key, ',' order by key) from platform_firm where key in ('sample-firm', 'sample-solo')`);
ok("CS-W1 DW5 pass: a fresh copy started with the repository's settings has both Sample firms in platform_firm", firmsOn() === "sample-firm,sample-solo", firmsOn());
if (!copySql(`select id from combination where combination_key = 'vv.single'`)) await call("POST", "/demo/load", { sample: "configured" }, "user-A");
const vv = copySql(`select c.id from combination c where c.combination_key = 'vv.single' and exists (select 1 from config_release r where r.combination_id = c.id)`);
const solo = await call("POST", "/runtime/cases", { combinationId: vv, clientActor: "user-P", principal: { displayName: "Sample Client W" } }, "user-S");
ok("CS-W1 DW5 pass: a case opened by sample-solo's staff through the API carries sample-solo's platform firm",
  solo.status === 201 && copySql(`select (c.firm_id = f.id)::text from runtime_case c join platform_firm f on f.key = 'sample-solo' where c.id = '${solo.body?.id}'`) === "true", [solo.status, solo.body?.detail]);
const counts = () => copySql(`select count(*) filter (where firm_id is null) || ':' || count(*) || ':' || count(distinct firm_key) from runtime_case`);
ok("CS-W1 DW5 pass: every case on the copy is filled (both firms)", /^0:\d+:2$/.test(counts() ?? "") && Number((counts() ?? "0:0").split(":")[1]) >= 2 && copySql(`select count(*) from case_stage where firm_id is null`) === "0", counts());
const OTHER = u(77), OTHER_CASE = u(78);
copySql(`insert into workspace (id, key, label) values ('${OTHER}', 'csw1-other-${process.pid}', 'Another workspace (CS-W1 check)'); set session_replication_role = replica; insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by) values ('${u(79)}', '${OTHER}', '${u(80)}', 'vv.single', 'Visitor visa', '[]', 't'); insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values ('${OTHER_CASE}', '${OTHER}', '${u(79)}', 'user-P', 'user-O', 'sample-firm', 'C-2026-77777')`);
const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, "user-A");
const demoWs = copySql(`select id from workspace where key = 'demo'`);
ok("CS-W1 DW5 pass: the demo reset deletes the demo workspace's cases of both firms, and both Sample firms are still there",
  reset.status < 300 && copySql(`select count(*) from runtime_case where workspace_id = '${demoWs}'`) === "0" && firmsOn() === "sample-firm,sample-solo", [reset.status, reset.body?.detail]);
ok("CS-W1 DW5 fail: the reset never deletes a case of another workspace", copySql(`select firm_key from runtime_case where id = '${OTHER_CASE}'`) === "sample-firm");
ok("CS-W1 DW5 pass (breaker M1): a case left without its firm (made before the seed) gets it when the demo seeds (reset)",
  copySql(`select (c.firm_id = f.id)::text from runtime_case c join platform_firm f on f.key = c.firm_key where c.id = '${OTHER_CASE}'`) === "true");
copySql(`update runtime_case set firm_id = null where id = '${OTHER_CASE}'`);
await (await import("../api/src/firms.ts")).fillCaseFirmIdsOnStart(`postgresql://xr_studio@127.0.0.1:54329/${process.argv[3] ?? "xr_studio_accept"}`);
ok("CS-W1 DW5 pass (breaker M1): the start-up fill (main.ts, after the start-up seed) fills it too",
  copySql(`select (c.firm_id = f.id)::text from runtime_case c join platform_firm f on f.key = c.firm_key where c.id = '${OTHER_CASE}'`) === "true");
copySql(`set session_replication_role = replica; delete from runtime_case where id = '${OTHER_CASE}'; delete from combination where id = '${u(79)}'; delete from workspace where id = '${OTHER}'`);
process.exit(summary() ? 1 : 0);
