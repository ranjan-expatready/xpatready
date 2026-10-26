// F3a-1c (forms lane, F3 plan D4, slice 2): the second-draft guard. The same file (checksum) being mapped in another
// combination is never drafted again: the AI plan skips it with where and how far it is, the form's own Draft setup
// button is refused too, and two launches of one file at the same moment queue one job. On the loaded demo, IMM 5257 is
// attached to the Visitor visa and the Super visa (the same official file, no field map yet). The other combination's
// drafting step is set into each state by the check (queued, waiting with proposals, decided, applied, stub, superseded):
// a real non-stub draft needs a paid call or a saved answer, and IMM 5257 has no saved answer. The race uses IMM 5707's
// saved answer (replayed). Isolated copy with the queue held (steps stay queued), NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_f3a1c 4454 start STUDIO_HOLD_QUEUE=1 && tsx studio/tests/check_forms_f3a1c.ts 4454 xr_studio_forms_f3a1c
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4454), DB = process.argv[3] ?? "xr_studio_forms_f3a1c";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const planOf = async (attachmentId: string, mode = "STUB", draftAgain = false) => (await call("POST", "/ai/plan", { scope: { kind: "source", ids: [attachmentId] }, mode, draftAgain })).body.targets[0];

(async () => {
  let r = await call("POST", "/demo/load");
  ok("setup: the demo loads (Visitor visa and Super visa both attach the official IMM 5257, which has no field map yet)", r.status < 300, r.body?.message ?? r.status);
  const att = (label: string) => sql(`select a.id from source_attachment a join combination c on c.id = a.combination_id where c.label = '${label}' and a.edition like 'IMM 5257 (%' limit 1`);
  const aV = att("Visitor visa"), aS = att("Super visa"), vv = sql(`select combination_id from source_attachment where id='${aV}'`);
  ok("setup: one file, two combinations (same checksum, no field map in the library)", !!aV && !!aS && sql(`select count(distinct sha256) from source_attachment where id in ('${aV}','${aS}')`) === "1" && sql(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.sha256 = (select sha256 from source_attachment where id='${aV}')`) === "0");
  let t = await planOf(aS);
  ok("C3.1: D4 pass: nothing is being mapped elsewhere, so the Super visa's IMM 5257 is planned (stub pass)", t.action === "draft" && !t.elsewhere, t);

  // The Visitor visa's draft of the same file, in each state (the check sets the state; see the header).
  const job = sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by, message) select gen_random_uuid(), workspace_id, combination_id, id, 'field_map', 'REPLAY', 'QUEUED', 'user-A', 'F3a-1c check' from source_attachment where id='${aV}' returning id`).split("\n")[0];
  t = await planOf(aS);
  ok("C3.1: BR-7 fail case: IMM 5257 queued for the Visitor visa: the Super visa's plan skips it, says where and how far, and links to that job", t.action === "skip" && /^Being mapped in Visitor visa: the AI draft is queued\. Its decisions are reused here once they are added to the draft; no second AI draft\.$/.test(t.why) && t.elsewhere?.combination === "Visitor visa" && t.elsewhere?.job_href === `/c/${vv}/jobs/${job}`, t);
  for (const mode of ["REPLAY", "LIVE"]) { const x = await planOf(aS, mode); ok(`C3.1: D4 fail case: in ${mode.toLowerCase()} mode too (a saved answer or a paid call): skipped, no cost`, x.action === "skip" && x.worst_usd === 0 && !!x.elsewhere, x); }
  const before = sql(`select count(*) from drafting_job where attachment_id='${aS}'`);
  r = await call("POST", `/attachments/${aS}/draft`, { mode: "stub" });
  ok("C3.1: D4 fail case: the form's own Draft setup button (draft again) is refused too (409, in words), and no job is made", r.status === 409 && /Being mapped in Visitor visa/.test(r.body.message) && sql(`select count(*) from drafting_job where attachment_id='${aS}'`) === before, r.body.message);
  sql(`update drafting_job set status='RUNNING' where id='${job}'`);
  ok("C3.1: BR-7 running: \"the AI draft is running\"", /the AI draft is running/.test((await planOf(aS)).why));
  sql(`update drafting_job set status='COMPLETED' where id='${job}'`);
  sql(`insert into normalization_item (id, workspace_id, job_id, proposed_key, proposed_meaning, proposed_type, outcome, candidates, persons, boxes, evidence, affected, reason) select gen_random_uuid(), workspace_id, '${job}', 'person.sample_' || g, 'Sample proposal ' || g, 'string', 'new', '[]', '{}', '[]', '[]', '[]', 'F3a-1c check' from drafting_job, generate_series(1, 12) g where id='${job}'`);
  t = await planOf(aS, "STUB", true);
  ok("C3.1: BR-7 done with 12 proposals to decide: \"12 proposals left · a content publisher\" (draft again changes nothing)", t.action === "skip" && /Being mapped in Visitor visa: 12 proposals left · a content publisher\./.test(t.why), t.why);
  sql(`update normalization_item set decision='REUSE' where job_id='${job}'`);
  ok("C3.1: BR-7 every proposal decided, not yet added: still skipped (\"the configuration author adds them to the draft\")", /every proposal is decided · the configuration author adds them to the draft/.test((await planOf(aS)).why));
  sql(`update drafting_job set status='APPLIED' where id='${job}'`);
  t = await planOf(aS);
  ok("C3.1: D4 applied elsewhere: no longer \"being mapped\" (an applied draft is in the library and is added from there)", t.action !== "skip" && !t.elsewhere, t);
  const ed = sql(`select id from form_edition where sha256 = (select sha256 from source_attachment where id='${aV}')`);
  sql(`insert into form_field_map (id, workspace_id, form_edition_id, data_path, outcome, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, id, 'f3a1c.check', 'not_a_fact', 1, 'PUBLISHED', 'HUMAN', 'user-A' from form_edition where id='${ed}'`);
  t = await planOf(aS);
  ok("C3.1: BR-6 applied and in the library: the Super visa is offered \"Add from library\" (no AI call, US$0)", t.action === "reuse_library" && t.worst_usd === 0, t);
  sql(`delete from form_field_map where data_path='f3a1c.check'`);
  // Stub passes and superseded drafts never block.
  sql(`update drafting_job set status='COMPLETED', started_at = now() - interval '1 hour' where id='${job}'`);
  sql(`update normalization_item set decision='PENDING' where job_id='${job}'`);
  sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by, message) select gen_random_uuid(), workspace_id, combination_id, id, 'field_map', 'STUB', 'COMPLETED', 'user-A', 'F3a-1c check (stub, newer)' from source_attachment where id='${aV}'`);
  t = await planOf(aS);
  ok("C3.1: D4 an older draft superseded by a newer stub pass never blocks (the newest step counts, and a stub pass is not a draft to review)", t.action === "draft" && !t.elsewhere, t);
  sql(`delete from drafting_job where attachment_id='${aV}' and mode='STUB'`);
  ok("setup: the older draft is the newest again: skipped", (await planOf(aS)).action === "skip");
  // Keyed by checksum: a byte-different file is its own file.
  const sha = sql(`select sha256 from source_attachment where id='${aV}'`);
  sql(`update source_attachment set sha256 = repeat('a', 64) where id='${aV}'`);
  t = await planOf(aS);
  ok("C3.1: D4 a byte-different file (another checksum) waiting elsewhere does not block: planned", t.action === "draft" && !t.elsewhere, t);
  sql(`update source_attachment set sha256 = '${sha}' where id='${aV}'`);

  // A stub pass is no draft to review (no AI, nothing to decide): two at the same moment both queue (break B3 of slice 2).
  sql(`delete from normalization_item where job_id='${job}'`); sql(`delete from drafting_job where id='${job}'`);
  const stubs = await Promise.all([call("POST", `/attachments/${aV}/draft`, { mode: "stub" }), call("POST", `/attachments/${aS}/draft`, { mode: "stub" })]);
  ok("C3.1: D4 two stub passes of one file at the same moment both queue (no AI, nothing to review, US$0)", stubs.every((x) => x.status < 300), stubs.map((x) => x.status));
  sql(`delete from drafting_job where attachment_id in ('${aV}','${aS}')`);

  // Race: two real drafts of one file at the same moment queue one job. IMM 5707 (both visas attach it) has saved AI
  // answers; its library field map is taken out here so a draft is planned (the saved answer is replayed: no model call).
  const v5707 = sql(`select a.id from source_attachment a join combination c on c.id = a.combination_id where c.label = 'Visitor visa' and a.edition like 'IMM 5707 (%'`);
  const s5707 = sql(`select a.id from source_attachment a join combination c on c.id = a.combination_id where c.label = 'Super visa' and a.edition like 'IMM 5707 (%'`);
  sql(`delete from form_field_map where form_edition_id in (select id from form_edition where edition_label like 'IMM 5707 (%')`);
  const [pV, pS] = await Promise.all([call("POST", "/ai/plan", { scope: { kind: "source", ids: [v5707] }, mode: "REPLAY" }), call("POST", "/ai/plan", { scope: { kind: "source", ids: [s5707] }, mode: "REPLAY" })]);
  ok("setup: both visas' IMM 5707 are planned from the saved AI answer before either launch (US$0)", pV.body.targets[0].action === "reuse_saved_output" && pS.body.targets[0].action === "reuse_saved_output", [pV.body.targets[0], pS.body.targets[0]].map((x) => `${x.action}: ${x.why}`));
  const both = await Promise.all([
    call("POST", "/ai/batches", { scope: { kind: "source", ids: [v5707] }, mode: "REPLAY", idempotencyKey: `f3a1c-v-${Date.now()}`, planSha256: pV.body.plan_sha256 }),
    call("POST", "/ai/batches", { scope: { kind: "source", ids: [s5707] }, mode: "REPLAY", idempotencyKey: `f3a1c-s-${Date.now()}`, planSha256: pS.body.plan_sha256 }),
  ]);
  const jobs = sql(`select count(*) from drafting_job where kind='field_map' and attachment_id in ('${v5707}','${s5707}')`);
  ok("C3.1: D4 race fail case: two drafts of one file at the same moment: one is queued, the other refused (409 \"Being mapped in …\"), one job", both.filter((x) => x.status < 300).length === 1 && both.some((x) => x.status === 409 && /Being mapped in (Visitor|Super) visa/.test(x.body.message)) && jobs === "1", { statuses: both.map((x) => x.status), messages: both.map((x) => x.body?.message), jobs });
  const queuedFor = sql(`select attachment_id from drafting_job where kind='field_map' and attachment_id in ('${v5707}','${s5707}')`);
  const otherSide = queuedFor === v5707 ? s5707 : v5707;
  r = await call("POST", `/attachments/${otherSide}/draft`, { mode: "replay" });
  ok("C3.1: D4 while that draft is queued, a later draft of the same file in the other visa is refused (409, in words)", r.status === 409 && /Being mapped in (Visitor|Super) visa: the AI draft is queued/.test(r.body.message), r.body.message);
  ok("C3.1: D4 no model call was made: no drafting step of IMM 5257 or IMM 5707 is live (US$0)", sql(`select count(*) from drafting_job where mode='LIVE' and attachment_id in ('${aV}','${aS}','${v5707}','${s5707}')`) === "0");

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 300)}`); console.error(e); process.exit(1); });
