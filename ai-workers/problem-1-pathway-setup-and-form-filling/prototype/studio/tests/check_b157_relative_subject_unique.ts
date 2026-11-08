// B157 (STANDARDS §3.4: every link checked twice, database constraint and service rule; B128 #1256, B155 #1367): a person
// (party) holds at most one answer subject per relation a form describes ('parent_1', 'parent_2', 'sibling'). Before, only
// the API's advisory lock (api/src/runtime.ts subjectFor) kept it so; now the database refuses a second one too, with a
// partial unique index (migration 20261108050000_b157_one_relative_subject). A party's 'case' and 'principal' subjects, one
// per case it is on, stay as they were. Concurrent: parallel raw inserts that pass no lock, then parallel first answers and
// entries through the API. Fail first: the same inserts with the index dropped (in a transaction rolled back) make two.
// Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh forms_b157 4463 start && tsx studio/tests/check_b157_relative_subject_unique.ts 4463 xr_studio_forms_b157
// It resets its copy and loads the configured checkpoint itself for the API part (as check_b155_siblings.ts does).
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { AUTHOR, PORT, DB, call, firms, main, needVisitorVisa, ok, openCase } from "../acceptance/lib/m3.ts";

const PSQL = "/opt/homebrew/opt/postgresql@18/bin/psql", URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
const run = promisify(execFile);
const q = (sql: string) => execFileSync(PSQL, [URL, "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const INDEX = "answer_subject_one_relative_per_party";
/** `n` sessions insert the same party and kind at once, none taking the API's lock: how many went in, how many the database refused. */
async function race(party: string, kind: string, n = 8) {
  const w = q(`select workspace_id from party where id = '${party}'`);
  const one = () => run(PSQL, [URL, "-v", "ON_ERROR_STOP=1", "-Atc", `insert into answer_subject (id, workspace_id, party_id, subject_kind, label) values (gen_random_uuid(), '${w}', '${party}', '${kind}', 'B157 race')`])
    .then(() => "ok", (e: { stderr?: string }) => (/duplicate key value violates unique constraint "answer_subject_one_relative_per_party"/.test(e.stderr ?? "") ? "refused" : `error: ${(e.stderr ?? "").trim().slice(0, 160)}`));
  const out = await Promise.all(Array.from({ length: n }, one));
  return { ok: out.filter((x) => x === "ok").length, refused: out.filter((x) => x === "refused").length, other: out.filter((x) => x !== "ok" && x !== "refused"), rows: Number(q(`select count(*) from answer_subject where party_id = '${party}' and subject_kind = '${kind}'`)) };
}
const party = () => q(`insert into party (id, workspace_id) select gen_random_uuid(), id from workspace order by created_at limit 1 returning id`).split("\n")[0];

await main("B157", "one answer subject per person and relation, held by the database", async () => {
  if (PORT === 4400) { console.log("STOP  never the demo (:4400): this check resets its copy"); process.exit(2); }
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR), load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
  if (![reset.status, load.status].every((s) => s >= 200 && s < 300)) { console.log(`STOP  the configured checkpoint did not load: reset ${reset.status}, load ${load.status}`); process.exit(2); }

  // ---- The index, as the migration made it. ----
  const def = q(`select indexdef from pg_indexes where tablename = 'answer_subject' and indexname = '${INDEX}'`);
  ok("B157-1 pass: answer_subject has the unique index on (party_id, subject_kind), only for parent_1, parent_2 and sibling", /UNIQUE INDEX/.test(def) && /\(party_id, subject_kind\)/.test(def) && /WHERE/.test(def) && ["parent_1", "parent_2", "sibling"].every((k) => def.includes(`'${k}'`)) && !/'case'|'principal'/.test(def), def);

  // ---- Fail first: without the index (dropped in a transaction rolled back), two subjects of one relation go in. ----
  const P0 = party();
  const without = q(`begin; drop index if exists "${INDEX}"; insert into answer_subject (id, workspace_id, party_id, subject_kind, label) select gen_random_uuid(), workspace_id, id, 'parent_1', 'B157 control' from party where id = '${P0}'; insert into answer_subject (id, workspace_id, party_id, subject_kind, label) select gen_random_uuid(), workspace_id, id, 'parent_1', 'B157 control' from party where id = '${P0}'; select count(*) from answer_subject where party_id = '${P0}' and subject_kind = 'parent_1'; rollback;`);
  ok("B157-2 fail (control, the state before B157): with the index dropped, a second parent_1 subject for the same person goes in (2 rows), and the rollback leaves none", without.split("\n").includes("2") && q(`select count(*) from answer_subject where party_id = '${P0}'`) === "0" && !!q(`select 1 from pg_indexes where indexname = '${INDEX}'`), without);

  // ---- Concurrent raw inserts, no lock: the database keeps exactly one per person and relation. ----
  for (const kind of ["parent_1", "parent_2", "sibling"]) {
    const r = await race(party(), kind);
    ok(`B157-3 pass (${kind}): 8 sessions insert at once with no lock: exactly 1 goes in, the 7 others are refused by the index`, r.ok === 1 && r.refused === 7 && r.rows === 1 && !r.other.length, r);
  }
  const P1 = party();
  const twoParents = [await race(P1, "parent_1", 2), await race(P1, "parent_2", 2), await race(P1, "sibling", 2)];
  ok("B157-4 pass: one person keeps one subject for each relation side by side (parent_1, parent_2 and sibling)", twoParents.every((r) => r.ok === 1 && r.rows === 1), twoParents);
  const P2 = party(), P3 = party(), other = [await race(P2, "sibling", 1), await race(P3, "sibling", 1)];
  ok("B157-5 pass: two different persons each have their own sibling subject", other.every((r) => r.ok === 1 && r.rows === 1), other);

  // ---- No behaviour change: a party's subjects for the case and as principal (one per case) are not limited. ----
  const P4 = party(), cases = await race(P4, "case", 3), principal = await race(P4, "principal", 3);
  ok("B157-6 fail (no behaviour change): a person's 'case' and 'principal' subjects are not limited by the index (3 each go in)", cases.ok === 3 && cases.rows === 3 && principal.ok === 3 && principal.rows === 3, { cases, principal });

  // ---- Through the API: parallel first answers and first entries never make two subjects, never a 500. ----
  const vv = needVisitorVisa(), f = await firms(), officer = f.officer!;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client K", dob: "1980-01-01" }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client K"], partyOf = q(`select party_id from answer_subject where id = '${P}'`);
  const answers = await Promise.all(Array.from({ length: 8 }, (_, i) => call("PUT", `/runtime/cases/${c.id}/answers/${P}/parent_1/person.full_name`, { value: `Sample Mother K${i}`, expectedId: null }, officer)));
  const st = answers.map((r) => r.status);
  ok("B157-7 pass: 8 first answers about the mother at once: 1 saved, the rest told someone answered at the same moment (409), none a 500; one parent_1 subject", st.filter((x) => x === 200).length === 1 && st.every((x) => x === 200 || x === 409) && q(`select count(*) from answer_subject where party_id = '${partyOf}' and subject_kind = 'parent_1'`) === "1", st);
  const rows = await Promise.all(Array.from({ length: 8 }, () => call("POST", `/runtime/cases/${c.id}/groups/${P}/sibling/rows`, { group: "sibling" }, officer)));
  ok("B157-8 pass: 8 first entries for the brothers and sisters at once: all 8 saved (201) on one sibling subject", rows.every((r) => r.status === 201) && q(`select count(*) from answer_subject where party_id = '${partyOf}' and subject_kind = 'sibling'`) === "1" && q(`select count(*) from client_fact_record r join answer_subject s on s.id = r.subject_id where s.party_id = '${partyOf}' and s.subject_kind = 'sibling' and r.superseded_by_id is null and not r.tombstone`) === "8", rows.map((r) => r.status));
});
