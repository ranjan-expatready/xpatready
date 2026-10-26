// Forms lane, Lead note 26 Oct Pass B item 4 (P-93 DEMO.md rows 1, 2, 7, 13; P-98 the APR Portal): the forms part of
// the demo story, seeded through the same services as the screens, on the runtime lane's released Visitor visa. Row 1:
// the official forms and checklists through the one intake, an off-list copy held and approved by a second person;
// row 2: IMM 5257 online captured from the Sample APR screens (the spouse branch not seen) and approved by a second
// person; row 7: the checklist drafting stub pass; row 13: IMM 5257 filed Online on the APR Portal, so the next release
// files it online (submitted and released here as the runtime lane will). Who may run it, and twice. No model call (US$0).
//   zsh studio/tools/isolated.sh forms_demo 4452 start && tsx studio/tests/check_forms_demo.ts 4452 xr_studio_forms_demo
import { execFileSync } from "node:child_process";
import { setupVisitorVisa } from "./forms_f2_setup.ts";

const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_demo";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

(async () => {
  setupVisitorVisa(PORT, DB);
  const vv = sql("select id from combination where combination_key='vv.single'");
  ok("setup: the runtime lane's Visitor visa is released (release 1, every form a PDF)", !!vv && sql(`select count(*) from config_release where combination_id='${vv}'`) === "1");
  let r = await call("POST", "/demo/forms-story", { combinationId: vv, online: true }, "user-C");
  ok("demo fail: only an author runs the forms part of the story (the content reviewer: 403); nothing is seeded", r.status === 403 && sql("select count(*) from portal_capture") === "0", r.body.message);
  r = await call("POST", "/demo/forms-story", { combinationId: "00000000-0000-4000-8000-000000000000" });
  ok("demo fail: a combination that does not exist (404)", r.status === 404, r.body.message);

  r = await call("POST", "/demo/forms-story", { combinationId: vv, online: true });
  ok("demo: the forms part of the story runs and says what it did, row by row", r.status === 201 && ["row 1:", "row 2:", "row 7:", "row 13:"].every((x) => (r.body.log as string[]).some((l) => l.startsWith(x))), r.body.log ?? r.body.message);
  const files = sql(`select string_agg(distinct split_part(edition, ' (', 1), ',' order by split_part(edition, ' (', 1)) from source_attachment where combination_id='${vv}' and recognised`);
  ok("C2.1: DEMO row 1 the visitor visa's official forms and checklists are attached through the one intake, read without AI", ["IMM 5257", "IMM 5707", "IMM 5476", "IMM 5484", "IMM 5881"].every((c) => files.includes(c)), files);
  ok("C2.2/C2.3: DEMO row 1 an off-list copy was held, then approved by a second person (the reviewer, not the uploader)", r.body.held_approved === true && sql("select uploaded_by || '>' || approved_by || '|' || code from approved_source") === "user-A>user-C|IMM 5257 SCH1", sql("select uploaded_by || '>' || approved_by || '|' || code from approved_source"));
  const cap = sql(`select portal_key || '|' || status || '|' || jsonb_array_length(record->'screens') || '|' || coalesce(approved_by, '') from portal_capture where id='${r.body.capture_id}'`);
  ok("C2.5/C2.8: DEMO row 2 IMM 5257 online captured from the Sample APR screens (5, the spouse branch not seen), approved by a second person", cap === "apr_portal|APPROVED|5|user-B", cap);
  ok("C2.6: DEMO row 7 the checklist drafting path ran its stub pass (US$0, nothing proposed until the founder's live run)", !!r.body.checklist_job_id && sql(`select kind || '|' || mode || '|' || cost_usd from drafting_job where id='${r.body.checklist_job_id}'`) === "checklist_draft|STUB|0", sql(`select kind || '|' || mode from drafting_job where id='${r.body.checklist_job_id}'`));
  ok("C1.7: DEMO row 13 the Visitor visa files through the APR Portal, IMM 5257 Online, its screen map decided", sql(`select portal_key from combination where id='${vv}'`) === "apr_portal" && sql(`select count(*) from form_field_map where form_edition_id='${r.body.online_version_id}' and outcome='unresolved'`) === "0" && Number(sql(`select count(*) from form_field_map where form_edition_id='${r.body.online_version_id}'`)) > 0);
  // What the runtime lane does next (release 2), here to prove the seed leaves a releasable combination.
  await call("POST", `/combinations/${vv}/submit`, { note: "Demo story: release 2, IMM 5257 Online on the APR Portal" });
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, "user-C")).body.submission;
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, "user-C");
  const rel = await call("POST", `/combinations/${vv}/approve`, undefined, "user-B");
  const online = sql(`select count(*) from config_release, jsonb_array_elements(snapshot->'field_maps') m where combination_id='${vv}' and version=2 and m->>'form_number'='IMM 5257' and m->>'channel'='ONLINE'`);
  ok("C7.4: DEMO row 13 release 2 goes out with IMM 5257 filed Online on the APR Portal (ready for the extension to fill)", rel.status < 300 && Number(online) > 0, rel.body?.message ?? online);
  r = await call("POST", "/demo/forms-story", { combinationId: vv });
  ok("demo fail: run twice on the same combination, it is refused in words (409) and nothing is added twice", r.status === 409 && /reset the demo/.test(r.body.message) && sql("select count(*) from portal_capture where portal_key='apr_portal'") === "1", r.body.message);
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("demo: a reset removes the story's captures and approvals (blank again)", r.status < 300 && sql("select (select count(*) from portal_capture) + (select count(*) from approved_source)") === "0", r.status);

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 300)}`); console.error(e); process.exit(1); });
