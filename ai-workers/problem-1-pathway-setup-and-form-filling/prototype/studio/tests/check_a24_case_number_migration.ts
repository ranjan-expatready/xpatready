// A24-1 (P-492; design product/design/case-structure-a24-2026-11-12.md §5.2 CS-1, CS-7, §5.3, §8): the case-number
// migration on a copy holding cases made before it, and the database rules it adds. A scratch database gets every
// migration before 20261112150000_a24_case_number, then five cases in the old shape (two firms; one opened late on
// 31 Dec in Toronto, which is already 1 Jan in UTC; written out of opening order), then the migration and every later
// one. Each rule is checked passing and failing. No server, no browser, no model call (US$0).
//   tsx studio/tests/check_a24_case_number_migration.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), NEW = "20261112150000_a24_case_number";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", DB = `xr_studio_a24_mig_${process.pid}`, URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const psql = (args: string[]) => execFileSync(join(BIN, "psql"), [URL, "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (q: string) => psql(["-Atc", q]);
const refused = (q: string, re: RegExp) => { try { sql(q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const pg = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];

execFileSync(join(BIN, "dropdb"), [...pg, "--if-exists", DB]);
execFileSync(join(BIN, "createdb"), [...pg, DB]);
try {
  const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
  for (const d of all.filter((x) => x < NEW)) psql(["-f", join(MIG, d, "migration.sql")]);
  const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const W = u(1), CMB = u(2), PARTY = u(3);
  // Five cases: K[i] with its application subject A[i] and principal P[i]. Written in this order; opened (created_at) in
  // another. Sample firm: 2025-12-31 23:30 Toronto (2026-01-01 04:30 UTC), then three in 2026, one of them at the same
  // instant as another (ordered by id); a second firm: one in 2026.
  const K = [10, 11, 12, 13, 14].map(u), A = [20, 21, 22, 23, 24].map(u), P = [30, 31, 32, 33, 34].map(u);
  const opened: [string, string][] = [["sample-firm", "2026-03-02 10:00:00-05"], ["sample-firm", "2025-12-31 23:30:00-05"], ["sample-firm", "2026-01-15 09:00:00-05"], ["sample-firm", "2026-03-02 10:00:00-05"], ["solo-firm", "2026-02-01 12:00:00-05"]];
  sql(`set session_replication_role = replica;
    insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by) values ('${CMB}', '${W}', '${W}', 'k', 'Sample combination', '[]', 't');
    insert into party (id, workspace_id) values ('${PARTY}', '${W}');
    insert into answer_subject (id, workspace_id, party_id, subject_kind, label) values ${K.map((_, i) => `('${A[i]}', '${W}', '${PARTY}', 'case', 'The application'), ('${P[i]}', '${W}', '${PARTY}', 'principal', 'Client ${i}')`).join(", ")},
      ('${u(40)}', '${W}', '${PARTY}', 'spouse_or_partner', 'Spouse 0'), ('${u(41)}', '${W}', '${PARTY}', 'child', 'Child 0'), ('${u(42)}', '${W}', '${PARTY}', 'child', 'Child 0b');
    insert into runtime_case (id, workspace_id, combination_id, reference, client_actor_id, created_by, firm_key, created_at) values ${K.map((k, i) => `('${k}', '${W}', '${CMB}', 'OLD-${i}', 'user-P', 'user-O', '${opened[i][0]}', '${opened[i][1]}')`).join(", ")};
    insert into case_participant (id, workspace_id, case_id, subject_id, role, "order") values ${K.map((k, i) => `(gen_random_uuid(), '${W}', '${k}', '${A[i]}', 'case', 0), (gen_random_uuid(), '${W}', '${k}', '${P[i]}', 'principal', 1)`).join(", ")},
      (gen_random_uuid(), '${W}', '${K[0]}', '${u(40)}', 'spouse_or_partner', 2);
    insert into case_stage (id, workspace_id, case_id, firm_key, ord, stage_key, staff_name, client_name, combination_id, application_subject_id, state, started_from)
      select gen_random_uuid(), workspace_id, id, firm_key, 1, 'k', 'S', 'S', combination_id, ('{${A.join(",")}}'::uuid[])[array_position('{${K.join(",")}}'::uuid[], id)], 'CURRENT', 'BEGIN' from runtime_case;`);
  for (const d of all.filter((x) => x >= NEW)) psql(["-f", join(MIG, d, "migration.sql")]);
  // The workspace's person roles (the database refuses a role that is not one; the Sample import writes them).
  sql(`insert into person_role (workspace_id, role_key, label, meaning, takes_part_in_case, may_be_applicant) values ${["principal", "spouse_or_partner", "child"].map((r) => `('${W}', '${r}', '${r}', 'Sample', true, true)`).join(", ")}`);
  const numberOf = (k: string) => sql(`select case_number from runtime_case where id='${k}'`);

  // ---------------------------------------------------------------- the backfill (CS-7)
  // Sample firm 2026 by opening: K2 (15 Jan), then K0 and K3 at the same instant, by id (K0 < K3).
  ok("A24-1 CS-7 backfill: every case made before has a number, in opening order per firm and year, from 00001 with no gap",
    [numberOf(K[1]), numberOf(K[2]), numberOf(K[0]), numberOf(K[3]), numberOf(K[4])].join(",") === "C-2025-00001,C-2026-00001,C-2026-00002,C-2026-00003,C-2026-00001",
    [K.map(numberOf)]);
  ok("A24-1 CS-7 backfill: the year is the opening's in Toronto (31 Dec 23:30 there is 1 Jan in UTC, and stays 2025)", numberOf(K[1]) === "C-2025-00001");
  ok("A24-1 CS-7 backfill: each firm's counter is set after its numbers (2025: 2, 2026: 4; the second firm: 2)",
    sql(`select string_agg(firm_key || ':' || year || ':' || next_value, ',' order by firm_key, year) from firm_case_counter`) === "sample-firm:2025:2,sample-firm:2026:4,solo-firm:2026:2");
  ok("A24-1 CS-7 backfill: then required (NOT NULL); the reference is now optional",
    sql(`select string_agg(column_name || ':' || is_nullable, ',' order by column_name) from information_schema.columns where table_name='runtime_case' and column_name in ('case_number','reference')`) === "case_number:NO,reference:YES");
  ok("A24-1: the migration's own text says how to roll back", /Rollback/.test(readFileSync(join(MIG, NEW, "migration.sql"), "utf8")));

  // ---------------------------------------------------------------- allocation (runtime_next_case_number)
  const next = (firm: string, at: string) => sql(`select runtime_next_case_number('${W}', '${firm}', '${at}')`);
  ok("A24-1 CS-7 pass: the next number of a firm follows its last one (format C-<year>-<5 digits>)", next("sample-firm", "2026-11-12 10:00:00-05") === "C-2026-00004");
  ok("A24-1 CS-7 pass: another firm counts on its own", next("solo-firm", "2026-11-12 10:00:00-05") === "C-2026-00002");
  ok("A24-1 CS-7 pass: a firm with no case yet starts at 00001", next("new-firm", "2026-11-12 10:00:00-05") === "C-2026-00001");
  ok("A24-1 CS-7 pass: a new year starts again at 00001", next("sample-firm", "2027-01-01 00:00:00-05") === "C-2027-00001");
  ok("A24-1 CS-7 pass: 31 Dec late in Toronto is still that year's", next("sample-firm", "2026-12-31 23:59:00-05") === "C-2026-00005");
  ok("A24-1 CS-7 fail: a refused opening gives its number back (rolled back with its transaction, no gap)",
    refused(`begin; select runtime_next_case_number('${W}', 'sample-firm', '2026-11-12 10:00:00-05'); select 1/0; commit;`, /division by zero/) && next("sample-firm", "2026-11-12 10:00:00-05") === "C-2026-00006");
  sql(`update firm_case_counter set next_value = 99999 where firm_key='new-firm' and year=2026`);
  ok("A24-1 CS-7 pass: past 99999 the number grows to 6 digits and keeps working", next("new-firm", "2026-11-12 10:00:00-05") === "C-2026-99999" && next("new-firm", "2026-11-12 10:00:00-05") === "C-2026-100000");

  // ---------------------------------------------------------------- the number's own rules
  ok("A24-1 CS-7 fail: a case number is never changed", refused(`update runtime_case set case_number='C-2026-00099' where id='${K[0]}'`, /case_number_fixed/) && numberOf(K[0]) === "C-2026-00002");
  ok("A24-1 CS-7 pass: the rest of a case still changes (its status)", sql(`update runtime_case set status='OPEN' where id='${K[0]}' returning case_number`) === "C-2026-00002");
  ok("A24-1 CS-7 fail: two cases of one firm never share a number", refused(`set session_replication_role = replica; insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values (gen_random_uuid(), '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00002')`, /runtime_case_workspace_id_firm_key_case_number_key/));
  ok("A24-1 CS-7 pass: another firm may hold the same number", sql(`set session_replication_role = replica; insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values ('${u(90)}', '${W}', '${CMB}', 'user-P', 'user-O', 'other-firm', 'C-2026-00002') returning reference is null`) === "t");
  ok("A24-1 CS-7 fail: a case with no number, or one in another shape, is refused",
    refused(`set session_replication_role = replica; insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by) values (gen_random_uuid(), '${W}', '${CMB}', 'user-P', 'user-O')`, /case_number/)
    && refused(`set session_replication_role = replica; insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, case_number) values (gen_random_uuid(), '${W}', '${CMB}', 'user-P', 'user-O', 'C-26-1')`, /runtime_case_number_check/));
  ok("A24-1 CS-7 fail (break m2): one running number has one spelling: a leading zero past 5 digits, or year 0000, is refused",
    ["C-2026-000031", "C-0000-00001"].every((n) => refused(`set session_replication_role = replica; insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, case_number) values (gen_random_uuid(), '${W}', '${CMB}', 'user-P', 'user-O', '${n}')`, /runtime_case_number_check/)));
  sql(`set session_replication_role = replica; delete from runtime_case where id='${u(90)}'`);

  // ---------------------------------------------------------------- one principal per case (CS-1)
  ok("A24-1 CS-1 fail: a second principal on a case is refused (at commit)", refused(`insert into case_participant (id, workspace_id, case_id, subject_id, role, "order") values (gen_random_uuid(), '${W}', '${K[0]}', '${u(41)}', 'principal', 3)`, /case_participant_one_principal/));
  ok("A24-1 CS-1 fail: making the spouse principal without moving the principal is refused", refused(`update case_participant set role='principal' where subject_id='${u(40)}'`, /case_participant_one_principal/));
  ok("A24-1 CS-1 fail: a case left with no principal is refused at commit", refused(`update case_participant set role='child' where subject_id='${P[0]}'`, /case_one_principal/)
    && refused(`delete from case_participant where subject_id='${P[0]}'`, /case_one_principal/));
  ok("A24-1 CS-1 pass: Make principal's two updates in one transaction (the roles swapped) are kept",
    (() => { sql(`begin; update case_participant set role='principal' where subject_id='${u(40)}'; update case_participant set role='spouse_or_partner' where subject_id='${P[0]}'; commit;`);
      return sql(`select string_agg(role, ',' order by "order") from case_participant where case_id='${K[0]}' and role <> 'case'`) === "spouse_or_partner,principal"; })());
  ok("A24-1 CS-1 pass: other people are still added (a child)", sql(`insert into case_participant (id, workspace_id, case_id, subject_id, role, "order") values (gen_random_uuid(), '${W}', '${K[0]}', '${u(41)}', 'child', 3) returning role`) === "child");
  ok("A24-1 CS-1 fail: a new case with no principal is refused at commit (after its stage is checked)",
    refused(`begin; insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, case_number) values ('${u(91)}', '${W}', '${CMB}', 'user-P', 'user-O', 'C-2026-00091');
      insert into case_stage (id, workspace_id, case_id, firm_key, ord, stage_key, staff_name, client_name, combination_id, application_subject_id, state, started_from) values (gen_random_uuid(), '${W}', '${u(91)}', 'sample-firm', 1, 'k', 'S', 'S', '${CMB}', '${u(42)}', 'CURRENT', 'BEGIN'); commit;`, /case_one_principal/));
  ok("A24-1 CS-1 pass: a new case with its principal, written in one transaction, is kept",
    (() => { sql(`begin; insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, case_number) values ('${u(91)}', '${W}', '${CMB}', 'user-P', 'user-O', 'C-2026-00091');
      insert into case_stage (id, workspace_id, case_id, firm_key, ord, stage_key, staff_name, client_name, combination_id, application_subject_id, state, started_from) values (gen_random_uuid(), '${W}', '${u(91)}', 'sample-firm', 1, 'k', 'S', 'S', '${CMB}', '${u(42)}', 'CURRENT', 'BEGIN');
      insert into case_participant (id, workspace_id, case_id, subject_id, role, "order") values (gen_random_uuid(), '${W}', '${u(91)}', '${u(42)}', 'principal', 1); commit;`);
      return sql(`select count(*) from case_participant where case_id='${u(91)}' and role='principal'`) === "1"; })());
  ok("A24-1 CS-1 pass: deleting a case (a reset) takes its people with it, principal included", (() => { sql(`delete from runtime_case where id='${K[0]}'`); return sql(`select count(*) from case_participant where case_id='${K[0]}'`) === "0"; })());
} finally {
  execFileSync(join(BIN, "dropdb"), [...pg, "--if-exists", DB]);
}

// Break m3: a copy holding a case with no principal stops the migration in words (never a 500 later on that case).
const DB2 = `${DB}_b`, URL2 = `postgresql://xr_studio@127.0.0.1:54329/${DB2}`;
const psql2 = (args: string[]) => execFileSync(join(BIN, "psql"), [URL2, "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
execFileSync(join(BIN, "dropdb"), [...pg, "--if-exists", DB2]);
execFileSync(join(BIN, "createdb"), [...pg, DB2]);
try {
  const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
  for (const d of all.filter((x) => x < NEW)) psql2(["-f", join(MIG, d, "migration.sql")]);
  const z = "00000000-0000-4000-8000-0000000000a1";
  psql2(["-c", `set session_replication_role = replica; insert into runtime_case (id, workspace_id, combination_id, reference, client_actor_id, created_by) values ('${z}', '${z}', '${z}', 'NO-PRINCIPAL', 'user-P', 'user-O');`]);
  let words = "";
  try { psql2(["-f", join(MIG, NEW, "migration.sql")]); } catch (e) { words = String((e as { stderr?: string }).stderr ?? e); }
  ok("A24-1 CS-1 fail (break m3): a copy with a case that has no principal stops the migration, saying how many and what to do", /a24_case_number: 1 case\(s\) without exactly one principal; reset the demo/.test(words), words.slice(0, 200));
  ok("A24-1 CS-1 (data): nothing of the migration is left half done on that copy", psql2(["-Atc", "select count(*) from information_schema.columns where table_name='runtime_case' and column_name='case_number'"]) === "0");
} finally {
  execFileSync(join(BIN, "dropdb"), [...pg, "--if-exists", DB2]);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
