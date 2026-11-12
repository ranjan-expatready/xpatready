// C6.17 (B139; concept §2, §6 "Migration test"; challenge M5): the case-stages migration on a copy holding cases made
// before it. A scratch database gets every migration before 20261109130000_c617_case_stages, then two cases in the old
// shape (one with a family group, filings, checklist lines, a finding and a task; one with nothing yet), then the
// migration and every later one. Each row is read back, and each database rule the migration adds is refused and allowed.
// No server, no browser, no model call (US$0).
//   tsx studio/tests/check_c617_stages_migration.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), NEW = "20261109130000_c617_case_stages";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", DB = `xr_studio_c617_mig_${process.pid}`, URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const psql = (args: string[]) => execFileSync(join(BIN, "psql"), [URL, "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (q: string) => psql(["-Atc", q]);
const refused = (q: string, re: RegExp) => { try { sql(q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const file = (f: string) => psql(["-f", f]);
const pg = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];

execFileSync(join(BIN, "dropdb"), [...pg, "--if-exists", DB]);
execFileSync(join(BIN, "createdb"), [...pg, DB]);
try {
  const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
  for (const d of all.filter((x) => x < NEW)) file(join(MIG, d, "migration.sql"));
  const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const [W, CMB, CMB2, PARTY, K1, K2, APP1, PRIN1, APP2, PRIN2, GRP, FIL, LINE, FIND, TASK] = Array.from({ length: 15 }, (_, i) => u(i + 1));
  // Only the rows this migration reads; foreign keys are not checked while seeding (replica role), as a dump restore does.
  sql(`set session_replication_role = replica;
    insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by) values ('${CMB}', '${W}', '${W}', 'sp.outside', 'Study permit', '[]', 't'), ('${CMB2}', '${W}', '${u(99)}', 'wp.lmia_inside', 'Work permit', '[]', 't');
    insert into party (id, workspace_id) values ('${PARTY}', '${W}');
    insert into answer_subject (id, workspace_id, party_id, subject_kind, label) values ('${APP1}', '${W}', '${PARTY}', 'case', 'The application'), ('${PRIN1}', '${W}', '${PARTY}', 'principal', 'Client A'),
      ('${APP2}', '${W}', '${PARTY}', 'case', 'The application'), ('${PRIN2}', '${W}', '${PARTY}', 'principal', 'Client B'), ('${u(51)}', '${W}', '${PARTY}', 'case', 'The application');
    insert into runtime_case (id, workspace_id, combination_id, reference, client_actor_id, created_by, firm_key) values ('${K1}', '${W}', '${CMB}', 'OLD-1', 'user-P', 'user-O', 'sample-firm'), ('${K2}', '${W}', '${CMB}', 'OLD-2', 'user-P', 'user-O', 'sample-firm');
    insert into case_participant (id, workspace_id, case_id, subject_id, role, "order") values (gen_random_uuid(), '${W}', '${K1}', '${APP1}', 'case', 0), (gen_random_uuid(), '${W}', '${K1}', '${PRIN1}', 'principal', 1),
      (gen_random_uuid(), '${W}', '${K2}', '${APP2}', 'case', 0), (gen_random_uuid(), '${W}', '${K2}', '${PRIN2}', 'principal', 1);
    insert into submission_group (id, workspace_id, case_id, kind) values ('${GRP}', '${W}', '${K1}', 'FAMILY');
    insert into filing (id, workspace_id, case_id, submission_group_id, subject_id, combination_key, mode) values ('${FIL}', '${W}', '${K1}', '${GRP}', '${PRIN1}', 'sp.outside', 'files_own');
    insert into checklist_line (id, workspace_id, case_id, subject_id, document_type, lineage) values ('${LINE}', '${W}', '${K1}', '${PRIN1}', 'passport_information_page_copy', 'x');
    insert into review_finding (id, workspace_id, case_id, subject_id, severity, source, quote, created_by, fingerprint, rule_key) values ('${FIND}', '${W}', '${K1}', '${PRIN1}', 'MINOR', 'rules', 'q', 't', 'fp1', 'r1');
    insert into case_task (id, workspace_id, case_id, kind, words, created_by, filing_id) values ('${TASK}', '${W}', '${K1}', 'after_filing_change', 'w', 't', '${FIL}');
    insert into filing_item (id, workspace_id, case_id, filing_id, kind, item_key, subject_id) values ('${u(80)}', '${W}', '${K1}', '${FIL}', 'form', 'IMM 5476', '${PRIN1}');`);
  const before = sql(`select (select count(*) from filing) || ',' || (select count(*) from submission_group) || ',' || (select count(*) from checklist_line) || ',' || (select count(*) from review_finding) || ',' || (select count(*) from case_task)`);
  for (const d of all.filter((x) => x >= NEW)) file(join(MIG, d, "migration.sql"));

  // ---------------------------------------------------------------- the backfill
  ok("C6.17 M5: each case made before the migration has exactly one stage, CURRENT, on its own combination, started from BEGIN, with its own application subject",
    sql(`select string_agg(k.reference || ':' || s.ord || ':' || s.state || ':' || s.started_from || ':' || (s.combination_id = k.combination_id) || ':' || (s.application_subject_id = p.subject_id) || ':' || s.stage_key, ',' order by k.reference)
      from runtime_case k join case_stage s on s.case_id = k.id join case_participant p on p.case_id = k.id and p.role = 'case'`) === "OLD-1:1:CURRENT:BEGIN:true:true:sp.outside,OLD-2:1:CURRENT:BEGIN:true:true:sp.outside");
  ok("C6.17 M5: every row of the five tables kept, each on its case's stage, and stage_id is now required",
    sql(`select (select count(*) from filing) || ',' || (select count(*) from submission_group) || ',' || (select count(*) from checklist_line) || ',' || (select count(*) from review_finding) || ',' || (select count(*) from case_task)`) === before
    && sql(`select count(*) from (select stage_id, case_id from filing union all select stage_id, case_id from submission_group union all select stage_id, case_id from checklist_line union all select stage_id, case_id from review_finding union all select stage_id, case_id from case_task) x join case_stage s on s.id = x.stage_id and s.case_id = x.case_id and s.state = 'CURRENT'`) === "5"
    && sql(`select count(*) from information_schema.columns where column_name='stage_id' and is_nullable='NO' and table_name in ('filing','submission_group','checklist_line','review_finding','case_task')`) === "5", before);
  ok("C6.17: the migration's own text says how to roll back", /Rollback/.test(readFileSync(join(MIG, NEW, "migration.sql"), "utf8")));
  const S1 = sql(`select id from case_stage where case_id='${K1}'`);

  // ---------------------------------------------------------------- the rules the migration adds
  ok("C6.17 B2 fail: a second FAMILY group on the same case and stage is refused", refused(`insert into submission_group (id, workspace_id, case_id, kind, stage_id) values (gen_random_uuid(), '${W}', '${K1}', 'FAMILY', '${S1}')`, /submission_group_one_family/));
  ok("C6.17 fail: a second filing for the same person on the same stage is refused", refused(`insert into filing (id, workspace_id, case_id, submission_group_id, subject_id, combination_key, mode, stage_id) values (gen_random_uuid(), '${W}', '${K1}', '${GRP}', '${PRIN1}', 'sp.outside', 'files_own', '${S1}')`, /filing_case_id_stage_id_subject_id_key/));
  ok("C6.17 fail: a second CURRENT stage on a case is refused", refused(`insert into case_stage (id, workspace_id, case_id, firm_key, ord, stage_key, staff_name, client_name, combination_id, application_subject_id, state, started_from) values (gen_random_uuid(), '${W}', '${K1}', 'sample-firm', 2, 'wp', 'Work permit', 'Work permit', '${CMB2}', '${u(51)}', 'CURRENT', 'NEXT_STAGE')`, /case_stage_one_current/));
  ok("C6.17 fail: the case's combination cannot move away from its current stage's (checked at commit)", refused(`update runtime_case set combination_id='${CMB2}' where id='${K1}'`, /case_stage_current/));
  ok("C6.17 fail: a case with no current stage is refused at commit (every case writes one, M5)", refused(`insert into runtime_case (id, workspace_id, combination_id, reference, client_actor_id, created_by, case_number) values (gen_random_uuid(), '${W}', '${CMB}', 'NEW-0', 'user-P', 'user-O', 'C-2026-90000')`, /case_stage_current/));
  ok("C6.17 fail: a stage never moves backward (CURRENT to NOT_STARTED refused)", refused(`update case_stage set state='NOT_STARTED' where id='${S1}'`, /case_stage_forward/));
  ok("C6.17 fail: a done-before stage has no application subject and no start (rule 4)", refused(`insert into case_stage (id, workspace_id, case_id, firm_key, ord, stage_key, staff_name, client_name, combination_id, started_from, state) values (gen_random_uuid(), '${W}', '${K2}', 'sample-firm', 0, 'x', 'X', 'X', '${CMB2}', 'BEGIN', 'DONE_BEFORE')`, /case_stage_worked_has_subject/));

  // C6.17 × C7.8 (review of #1262 M2): a form added to the first stage's filing while that stage is current.
  const ADD = u(90), addRow = (id: string, filing: string, form: string) => `insert into filing_form_addition (id, workspace_id, case_id, filing_id, subject_id, form_key, edition_id, edition_label, kind, frozen, frozen_sha256, channel, signature, added_by)
    values ('${id}', '${W}', '${K1}', '${filing}', '${PRIN1}', '${form}', '${u(91)}', 'Sample edition', 'blank', '{}', '${"0".repeat(64)}', 'PDF_UPLOAD', 'HAND_SCANNED', 't') returning form_key`;
  ok("C6.17 × C7.8 pass: a form is added to a filing of the current stage", sql(addRow(ADD, FIL, "IMM 5257")) === "IMM 5257");

  // Start next stage on case 1, as the API does it in one transaction: the current stage ends, the next one starts, the
  // case's combination follows; then the ended stage's rows are history.
  const NEXTAPP = u(50);
  sql(`set session_replication_role = replica; insert into answer_subject (id, workspace_id, party_id, subject_kind, label) values ('${NEXTAPP}', '${W}', '${PARTY}', 'case', 'The application');`);
  sql(`begin;
    insert into case_stage (id, workspace_id, case_id, firm_key, ord, stage_key, staff_name, client_name, combination_id, state) values ('${u(60)}', '${W}', '${K1}', 'sample-firm', 2, 'wp', 'Work permit', 'Work permit', '${CMB2}', 'NOT_STARTED');
    update case_stage set state='ENDED_NEXT_STARTED', ended_at=now() where id='${S1}';
    update case_stage set state='CURRENT', started_from='NEXT_STAGE', application_subject_id='${NEXTAPP}' where id='${u(60)}';
    update runtime_case set combination_id='${CMB2}' where id='${K1}';
    commit;`);
  ok("C6.17 pass: ending a stage and starting the next in one transaction commits (one CURRENT, on the case's new combination)", sql(`select string_agg(ord || ':' || state, ',' order by ord) from case_stage where case_id='${K1}'`) === "1:ENDED_NEXT_STARTED,2:CURRENT" && sql(`select combination_id from runtime_case where id='${K1}'`) === CMB2);
  ok("C6.17 BR-10 fail: a new row on the ended stage is refused (filing, checklist line, finding)",
    refused(`insert into checklist_line (id, workspace_id, case_id, subject_id, document_type, lineage, stage_id) values (gen_random_uuid(), '${W}', '${K1}', '${PRIN1}', 'other', 'x', '${S1}')`, /case_stage_ended/)
    && refused(`insert into review_finding (id, workspace_id, case_id, subject_id, severity, source, quote, created_by, stage_id) values (gen_random_uuid(), '${W}', '${K1}', '${PRIN1}', 'MINOR', 'manual', 'q', 't', '${S1}')`, /case_stage_ended/));
  ok("C6.17 BR-5 fail: a row of the ended stage is never changed (filing status, line state)", refused(`update filing set status='READY_TO_FILE' where id='${FIL}'`, /case_stage_ended/) && refused(`update checklist_line set state='received' where id='${LINE}'`, /case_stage_ended/));
  ok("C6.17 breaker M1 fail: a row hanging off the ended stage's filing (its form item; a person's UCI record) is never changed or added",
    refused(`update filing_item set active=false where id='${u(80)}'`, /case_stage_ended/) && refused(`insert into filing_person_record (id, filing_id, subject_id, uci) values (gen_random_uuid(), '${FIL}', '${PRIN1}', '12345678')`, /case_stage_ended|null value|violates/));
  ok("C6.17 Lead 38 (1) fail: a row of the ended stage, or one hanging off its filing, is never deleted (finding, task, form item)",
    refused(`delete from review_finding where id='${FIND}'`, /case_stage_ended/) && refused(`delete from case_task where id='${TASK}'`, /case_stage_ended/) && refused(`delete from filing_item where id='${u(80)}'`, /case_stage_ended/));
  ok("C6.17 × C7.8 M2 fail (BR-10): on the ended stage's filing a form is not added, its addition not marked removed, nor deleted",
    refused(addRow(u(92), FIL, "IMM 5645"), /case_stage_ended/)
    && refused(`update filing_form_addition set removed_at=now(), removed_by='t', removed_reason='Sample' where id='${ADD}'`, /case_stage_ended/)
    && refused(`delete from filing_form_addition where id='${ADD}'`, /case_stage_ended/) && sql(`select removed_at is null from filing_form_addition where id='${ADD}'`) === "t");
  ok("C6.17 fail: a row cannot be moved to another stage", refused(`update case_task set stage_id='${u(60)}' where id='${TASK}'`, /case_stage_ended|keeps its stage/));
  ok("C6.17 B2 pass: the new stage takes its own FAMILY group, filing for the same person and checklist line of the same type",
    sql(`insert into submission_group (id, workspace_id, case_id, kind, stage_id) values ('${u(70)}', '${W}', '${K1}', 'FAMILY', '${u(60)}') returning kind`) === "FAMILY"
    && sql(`insert into filing (id, workspace_id, case_id, submission_group_id, subject_id, combination_key, mode, stage_id) values ('${u(93)}', '${W}', '${K1}', '${u(70)}', '${PRIN1}', 'wp.lmia_inside', 'files_own', '${u(60)}') returning mode`) === "files_own"
    && sql(`insert into checklist_line (id, workspace_id, case_id, subject_id, document_type, lineage, stage_id) values (gen_random_uuid(), '${W}', '${K1}', '${PRIN1}', 'passport_information_page_copy', 'x', '${u(60)}') returning state`) === "not_requested");
  ok("C6.17 × C7.8 pass: the new stage's filing takes the same form, added and then marked removed",
    sql(addRow(u(94), u(93), "IMM 5257")) === "IMM 5257" && sql(`update filing_form_addition set removed_at=now(), removed_by='t', removed_reason='Sample' where id='${u(94)}' returning id`) === u(94));
  ok("C6.17 Lead 38 (1) pass: a row of the current stage is deleted as before (a family group's filing removed, then the group)",
    sql(`insert into submission_group (id, workspace_id, case_id, kind, reason, stage_id) values ('${u(71)}', '${W}', '${K1}', 'SEPARATE', 'Sample: sent on its own', '${u(60)}') returning kind`) === "SEPARATE" && sql(`delete from submission_group where id='${u(71)}' returning kind`) === "SEPARATE");
  ok("C6.17 fail: a row naming another case's stage is refused", refused(`insert into case_task (id, workspace_id, case_id, kind, words, created_by, stage_id) values (gen_random_uuid(), '${W}', '${K2}', 'k', 'w', 't', '${u(60)}')`, /not this case/));
  ok("C6.17 pass: deleting a case removes its stages and rows (a reset), with the ended stage's rows", (() => { sql(`delete from runtime_case where id='${K1}'`); return sql(`select count(*) from case_stage where case_id='${K1}'`) === "0" && sql(`select count(*) from filing where case_id='${K1}'`) === "0"; })());
} catch (e) {
  ok("the migration test ran to the end", false, String((e as { stderr?: string }).stderr ?? e).slice(0, 400));
} finally {
  execFileSync(join(BIN, "dropdb"), [...pg, "--if-exists", DB]);
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
