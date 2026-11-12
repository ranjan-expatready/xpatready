// W1-10 slice 1 (plan-slice1-channels.md §2, §7; C-1, C-3, C-8): the channels migration on a copy holding every old value.
// A scratch database gets every migration before 20261030090000_w110_channels, then rows in the old spelling (a Signed
// PDF upload line in a draft and in a released version, the three old accepts values, pending and applied changes, a
// parked portal key), then the migration; each row is read back. Then the later migrations, with the database guards of
// 20261030140000_w110_channel_guards (break m3, m4) each refused and allowed. No server, no browser, no model call (US$0).
//   tsx studio/tests/check_forms_channels_migration.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), NEW = "20261030090000_w110_channels", GUARDS = "20261030140000_w110_channel_guards";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", DB = "xr_studio_fx_migration", URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const psql = (args: string[]) => execFileSync(join(BIN, "psql"), [URL, "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); // refusals the checks expect stay quiet
const sql = (q: string) => psql(["-Atc", q]);
const file = (f: string) => psql(["-f", f]);

execFileSync(join(BIN, "dropdb"), ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "--if-exists", DB]);
execFileSync(join(BIN, "createdb"), ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", DB]);
try {
  const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
  for (const d of all.filter((x) => x < NEW)) file(join(MIG, d, "migration.sql"));
  const W = "00000000-0000-4000-8000-000000000001", C = "00000000-0000-4000-8000-000000000002", F = "00000000-0000-4000-8000-000000000003";
  const E = ["00000000-0000-4000-8000-0000000000e1", "00000000-0000-4000-8000-0000000000e2", "00000000-0000-4000-8000-0000000000e3", "00000000-0000-4000-8000-0000000000e4"];
  // Only the rows this migration reads: foreign keys are not checked while seeding (replica role), as a dump restore does.
  sql(`set session_replication_role = replica;
    insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by, portal_key) values ('${C}', '${W}', '${W}', 'old.row', 'Old row', '[]', 'test', 'rep_pr_portal');
    insert into combination_form (id, workspace_id, combination_id, gov_form_def_id, lineage_key, who, attach_mode, status, origin, updated_by, channel, version) values
      (gen_random_uuid(), '${W}', '${C}', '${F}', 'IMM 5707', 'each_applicant', 'COMBINATION_MANDATORY', 'PUBLISHED', 'HUMAN', 'test', 'SIGNED_PDF_UPLOAD', 1),
      (gen_random_uuid(), '${W}', '${C}', '${F}', 'IMM 5707', 'each_applicant', 'COMBINATION_MANDATORY', 'DRAFT', 'HUMAN', 'test', 'SIGNED_PDF_UPLOAD', 2),
      (gen_random_uuid(), '${W}', '${C}', '${F}', 'IMM 5257', 'each_applicant', 'COMBINATION_MANDATORY', 'DRAFT', 'HUMAN', 'test', 'ONLINE', 1),
      (gen_random_uuid(), '${W}', '${C}', '${F}', 'IMM 5645', 'each_applicant', 'COMBINATION_MANDATORY', 'DRAFT', 'HUMAN', 'test', 'PDF_UPLOAD', 1);
    insert into form_edition (id, workspace_id, gov_form_def_id, edition_label, accepted_channels, accepted_basis, accepted_quote) values
      ('${E[0]}', '${W}', '${F}', 'A (01-2020)', 'PDF', 'AI_SAMPLE', 'Upload the form.'), ('${E[1]}', '${W}', '${F}', 'B (01-2020)', 'ONLINE', 'PERSON_SAMPLE', 'Apply online.'),
      ('${E[2]}', '${W}', '${F}', 'C (01-2020)', 'PDF_OR_ONLINE', 'SAMPLE_FIXTURE', 'Apply online or upload.'), ('${E[3]}', '${W}', '${F}', 'D (01-2020)', 'READ_BY_AI', null, null);
    insert into library_change (id, workspace_id, kind, key, action, status, proposed_by, matches) values
      (gen_random_uuid(), '${W}', 'form_accepts', 'IMM 1', 'SET_ACCEPTS', 'WAITING', 'test', '{"channels": "PDF", "before": null}'),
      (gen_random_uuid(), '${W}', 'form_accepts', 'IMM 2', 'SET_ACCEPTS', 'RETURNED', 'test', '{"channels": "PDF_OR_ONLINE", "before": "ONLINE"}'),
      (gen_random_uuid(), '${W}', 'form_accepts', 'IMM 3', 'SET_ACCEPTS', 'RELEASED', 'test', '{"channels": "ONLINE", "before": null}');`);
  file(join(MIG, NEW, "migration.sql"));
  ok("C1.6 C-1: every Signed PDF upload line (draft and released versions) is now PDF upload, signed by hand and scanned", sql("select string_agg(version || ':' || channel || ':' || signature, ',' order by version) from combination_form where lineage_key='IMM 5707'") === "1:PDF_UPLOAD:HAND_SCANNED,2:PDF_UPLOAD:HAND_SCANNED");
  ok("C1.6 C-1: other lines keep their channel and get no signature", sql("select string_agg(lineage_key || ':' || channel || ':' || signature, ',' order by lineage_key) from combination_form where lineage_key<>'IMM 5707'") === "IMM 5257:ONLINE:NONE,IMM 5645:PDF_UPLOAD:NONE");
  ok("C1.6 C-1 fail: the old spelling no longer exists in the database (a write of it is refused by the type)", sql("select string_agg(e::text, ',') from unnest(enum_range(null::\"FilingChannel\")) e") === "PDF_UPLOAD,ONLINE,PAPER,NOT_NEEDED"
    && (() => { try { sql(`update combination_form set channel='SIGNED_PDF_UPLOAD' where lineage_key='IMM 5645'`); return false; } catch { return true; } })());
  ok("C11.18 C-3: each old record became one row for every account, with its basis and line; READ_BY_AI is not a record",
    sql("select string_agg(e.edition_label || '=' || a.account || ':' || array_to_string(a.channels, '+') || ':' || a.basis, ',' order by e.edition_label) from form_edition_accept a join form_edition e on e.id=a.form_edition_id")
      === "A (01-2020)=ANY:PDF_UPLOAD:AI_SAMPLE,B (01-2020)=ANY:ONLINE:PERSON_SAMPLE,C (01-2020)=ANY:PDF_UPLOAD+ONLINE:SAMPLE_FIXTURE",
    sql("select count(*) from form_edition_accept"));
  ok("C11.18: the old columns are gone", sql("select count(*) from information_schema.columns where table_name='form_edition' and column_name like 'accepted_%'") === "0");
  ok("C11.18: pending changes (waiting, returned) take the new payload for every account; an applied one stays as history",
    sql("select string_agg(key || '=' || (matches->>'account') || ':' || (matches->'channels')::text || ':' || coalesce((matches->'before')::text, 'null'), ' | ' order by key) from library_change where status in ('WAITING','RETURNED')")
      === `IMM 1=ANY:["PDF_UPLOAD"]:null | IMM 2=ANY:["PDF_UPLOAD", "ONLINE"]:["ONLINE"]` && sql("select matches->>'channels' from library_change where key='IMM 3'") === "ONLINE");
  ok("C1.6 Q1: a parked portal key takes its account's name; an unknown account is refused by the database", sql(`select portal_key from combination where id='${C}'`) === "PR_PORTAL"
    && (() => { try { sql(`update combination set portal_key='rep_pr_portal' where id='${C}'`); return false; } catch { return true; } })());
  ok("C11.18 C-4 fail: Not needed for every account, or beside another channel, is refused by the database",
    (() => { try { sql(`insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, set_by) values ('${W}', '${E[3]}', 'ANY', '{NOT_NEEDED}', 'PERSON_SAMPLE', 't')`); return false; } catch { return true; } })()
    && (() => { try { sql(`insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, set_by) values ('${W}', '${E[3]}', 'PR_PORTAL', '{NOT_NEEDED,ONLINE}', 'PERSON_SAMPLE', 't')`); return false; } catch { return true; } })()
    && sql(`insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, set_by) values ('${W}', '${E[3]}', 'PR_PORTAL', '{NOT_NEEDED}', 'PERSON_SAMPLE', 't') returning account`) === "PR_PORTAL");
  ok("C1.6: the migration's own text says how to roll back", /Rollback/.test(readFileSync(join(MIG, NEW, "migration.sql"), "utf8")));
  // ──────────── later migrations, then the database guards (break m3, m4; review S7)
  for (const d of all.filter((x) => x > NEW)) file(join(MIG, d, "migration.sql"));
  const refused = (q: string) => { try { sql(q); return false; } catch { return true; } };
  const accept = (account: string, channels: string) => `insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, set_by) values ('${W}', '${E[2]}', '${account}', '${channels}', 'PERSON_SAMPLE', 't') returning account`;
  ok("C11.18 m4 fail: the database refuses a record of what IRCC accepts with no way, or the same way twice",
    refused(accept("IRCC_PORTAL", "{}")) && refused(accept("IRCC_PORTAL", "{PAPER,PAPER}")) && refused(accept("IRCC_PORTAL", "{ONLINE,PDF_UPLOAD,ONLINE}")));
  ok("C11.18 m4 pass: the database keeps a record with each way once", sql(accept("IRCC_PORTAL", "{ONLINE,PDF_UPLOAD}")) === "IRCC_PORTAL");
  ok("C11.18 M6 fail: the database refuses anything but Paper for no account (paper filing)", refused(accept("PAPER", "{ONLINE}")) && refused(accept("PAPER", "{PAPER,PDF_UPLOAD}")));
  ok("C11.18 M6 pass: the database keeps Paper for no account (paper filing)", sql(accept("PAPER", "{PAPER}")) === "PAPER");
  ok("C1.6 C-2 m4 fail: the database refuses a line whose signature does not fit its channel",
    refused(`update combination_form set channel='PAPER', signature='NONE' where lineage_key='IMM 5645'`) && refused(`update combination_form set channel='ONLINE', signature='HAND_SCANNED' where lineage_key='IMM 5645'`)
    && refused(`update combination_form set signature='PEN' where lineage_key='IMM 5645'`) && refused(`update combination_form set channel='NOT_NEEDED', signature='TYPED_NAME' where lineage_key='IMM 5645'`));
  ok("C1.6 C-2 m4 pass: the database keeps every pair that fits, and the migrated lines all fit",
    sql(`update combination_form set channel='PAPER', signature='PEN' where lineage_key='IMM 5645' returning signature`) === "PEN"
    && sql(`update combination_form set channel='ONLINE', signature='TYPED_NAME' where lineage_key='IMM 5645' returning signature`) === "TYPED_NAME"
    && sql(`update combination_form set channel='NOT_NEEDED', signature='NONE' where lineage_key='IMM 5645' returning signature`) === "NONE");
  const K = "00000000-0000-4000-8000-0000000000c1", I = "00000000-0000-4000-8000-0000000000f1";
  sql(`set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, reference, client_actor_id, created_by, case_number) values ('${K}', '${W}', '${C}', 'T-1', 'client', 'test', 'C-2026-90001');
    insert into form_instance (id, workspace_id, case_id, subject_id, form_number, config_release_id, snapshot_id, status, created_by) values ('${I}', '${W}', '${K}', '${W}', 'IMM 5257', '${W}', '${W}', 'GENERATED', 'test');
    insert into validated_copy (workspace_id, form_instance_id, path, sha256, facts_hash, read_back, read_by) values ('${W}', '${I}', 'v.pdf', repeat('a', 64), repeat('b', 64), '{}', 'user-O');`);
  ok("C11.6 C-10 m3 fail: the database refuses to change a validated copy read back, or to delete it while its case exists",
    refused(`update validated_copy set sha256=repeat('c', 64) where form_instance_id='${I}'`) && refused(`delete from validated_copy where form_instance_id='${I}'`)
    && sql(`select sha256 from validated_copy where form_instance_id='${I}'`) === "a".repeat(64));
  sql(`delete from runtime_case where id='${K}'`);
  ok("C11.6 C-10 m3 pass: deleting the case (the demo reset) takes its copy and the validated copy with it", sql(`select count(*) from validated_copy where form_instance_id='${I}'`) === "0" && sql(`select count(*) from form_instance where id='${I}'`) === "0");
  ok("C1.6: the guards' migration says how to roll back", /Rollback/.test(readFileSync(join(MIG, GUARDS, "migration.sql"), "utf8")));
} finally {
  execFileSync(join(BIN, "dropdb"), ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "--if-exists", DB]);
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
