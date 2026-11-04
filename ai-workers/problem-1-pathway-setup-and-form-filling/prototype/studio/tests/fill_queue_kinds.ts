/* eslint-disable @typescript-eslint/no-explicit-any -- test input reads responses loosely */
// Test input for the To review suites (F2 C2.12; written by the reviewer of 9f2132bd): leaves every To review kind open on
// one isolated copy, through the product's routes plus a few SQL rows marked as test input. US$0 (one saved AI answer
// replayed, stub steps). Not a suite: check_forms_c212_queue_forms.ts calls fillAllKinds(port, db).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { acceptCleanOneByOne } from "./lib/accept-draft.ts";
const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
let PORT = 0, DB = "";
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const intake = async (name: string, bytes: Buffer, combinationId?: string, actor = "user-A") => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(bytes)]), name); if (combinationId) fd.append("combinationId", combinationId);
  return (await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": actor }, body: fd })).json()).results?.[0];
};
function pdf(title: string, text: string) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`; objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs: number[] = []; objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
const until = async (f: () => Promise<boolean>) => { for (let i = 0; i < 150; i++) { if (await f()) return; await new Promise((r) => setTimeout(r, 400)); } };
const log = (..._a: unknown[]) => undefined;
export async function fillAllKinds(port: number, db: string) {
  PORT = port; DB = db;
  const lineCodes = (cid: string) => sql(`select distinct lineage_key from combination_form where combination_id='${cid}'`).split("\n");
  await call("POST", "/demo/reset", { confirm: "RESET" });
  log("load", (await call("POST", "/demo/load")).status);
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const coverAll = async (cid: string) => {
    const sec = ((await call("GET", "/library/sections")).body as { key: string }[])[0]?.key;
    for (const x of ((await call("GET", `/combinations/${cid}`)).body.draft.problems as { where: string; item: string }[]).filter((p) => p.where === "Questionnaires"))
      await call("POST", `/library/fields/${encodeURIComponent(x.item)}/placement`, { sectionKey: sec, collectedFrom: "staff_working_view", repeats: x.item.startsWith("case.") ? "once_per_case" : "per_person" });
  };
  // Job 1: replay, decide all, apply -> field ADDs waiting; decide form fields; submit -> release (waiting on fields)
  const att = (await call("GET", `/combinations/${sv}/attachments`)).body.find((a: any) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await call("GET", `/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x: any) => x.valid);
  let r = await call("POST", `/attachments/${att.id}/draft`, { mode: "replay", runFile: run.file });
  const jobId = r.body?.id ?? sql(`select id from drafting_job where combination_id='${sv}' and kind='field_map' order by started_at desc limit 1`);
  await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED");
  await acceptCleanOneByOne(call, jobId, ["REUSE", "NEW"]);
  let job = (await call("GET", `/jobs/${jobId}`)).body;
  for (const i of job.items.filter((x: any) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: "Test: a different meaning from the library field that could fit." });
  r = await call("POST", `/jobs/${jobId}/apply`, { who: "each_applicant" }); log("apply", r.status, r.body?.new_fields);
  // C3.8 [IRCC-F09]: the super visa's package lists IMM 5707, so it is added from the library before the release is submitted.
  const fam = (await call("GET", `/combinations/${sv}/attachments`)).body.find((a: any) => /IMM 5707 \(/.test(a.edition ?? ""));
  if (fam) log("family form", (await call("POST", `/attachments/${fam.id}/reuse`, {})).status);
  await coverAll(sv);
  const ff = (await call("GET", `/jobs/${jobId}/form-fields`)).body;
  const open = ff.fields.filter((f: any) => f.outcome === "unresolved");
  for (const [n, f] of open.entries()) await call("POST", `/editions/${ff.edition.id}/form-fields/decision`, { dataPath: f.dataPath, decision: n === 0 || f.background ? "by_hand" : "not_a_fact", reason: n === 0 || f.background ? "Signed and dated by the applicant on paper." : "Office use or a document upload: no case fact fills it." });
  // G5 (C5.1, P-248, #868): a release needs a document line beside its forms; one with a type the library has released.
  const docKey = sql("select document_type_key from document_type where status = 'PUBLISHED' order by document_type_key limit 1");
  if (docKey) log("document line", (await call("POST", `/combinations/${sv}/requirements`, { documentTypeKey: docKey, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" })).status);
  r = await call("POST", `/combinations/${sv}/submit`, {}); log("submit", r.status, r.body?.detail);
  // A second form line on the submitted combination (its release then belongs to two forms; plan §7's two-form case).
  const second = ((await call("GET", "/library/forms/list?for=picker")).body.rows as any[]).map((x) => x.code).find((c: string) => /^IMM /.test(c) && !lineCodes(sv).includes(c));
  if (second) log("attach2", (await call("POST", `/combinations/${sv}/forms`, { formKey: second })).status);
  // Return one field change so a RETURNED change exists too.
  const ch = (await call("GET", "/library/changes?status=WAITING")).body as any[];
  if (ch[0]) log("return", (await call("POST", `/library/changes/${ch[0].id}/return`, { note: "Test: say what the form means here." }, "user-C")).status);
  // Job 2: a second replay on the same file, left undecided -> ai_proposals needs
  for (const cid of sql(`select id from combination where id<>'${sv}'`).split("\n")) {
    const a = ((await call("GET", `/combinations/${cid}/attachments`)).body as any[]).find((x: any) => /IMM 5257 \(/.test(x.edition ?? ""));
    if (!a) continue;
    const rr = ((await call("GET", `/attachments/${a.id}/draft-options`)).body.saved_runs ?? []).find((x: any) => x.valid);
    if (!rr) continue;
    r = await call("POST", `/attachments/${a.id}/draft`, { mode: "replay", runFile: rr.file }); log("replay2", cid, r.status, r.body?.detail);
    if (r.status < 300) break;
  }
  await until(async () => (await call("GET", "/review-queue?filter=all&kind=ai_proposals")).body.items.length > 0);
  sql(`insert into proposal_item (id, workspace_id, kind, step, combination_id, lands_on, reuse, payload, rounds, agreement, confidence, origin, identity, identity_key)
    values (gen_random_uuid(), (select id from workspace where key='demo'), 'field', 'checklist_draft', '${sv}', 'combination', '{"match":"new","existingKey":null}', '{"kind":"field","label":"Rv c"}', '{"draft":null,"check":null}', 'rules_only', 'check', 'ai', '{"key":"person.rv_c","near":[]}', 'person.rv_c')`);
  // Checklist stub -> S6 proposals rows (combination scope)
  const ck = (await call("GET", `/combinations/${sv}/attachments`)).body.find((a: any) => a.recognised && a.kind === "Document checklist");
  if (ck) log("checklist", (await call("POST", `/attachments/${ck.id}/draft-checklist`, { mode: "stub" })).status);
  // S6 proposals with a form edition scope (test input), and a two-item change batch
  const ws = sql("select id from workspace where key='demo'");
  const ed = sql("select edition_label from form_edition where edition_label like 'IMM 5707 (%' limit 1");
  for (const k of ["a", "b"]) sql(`insert into proposal_item (id, workspace_id, kind, step, form_edition, lands_on, reuse, payload, rounds, agreement, confidence, origin, identity, identity_key)
    values (gen_random_uuid(), '${ws}', 'field', 'field_map_edition', '${ed}', 'library', '{"match":"new","existingKey":null}', '{"kind":"field","label":"Rv ${k}"}', '{"draft":null,"check":null}', 'rules_only', 'ready', 'ai', '{"key":"person.rv_${k}","near":[]}', 'person.rv_${k}')`);
  const bid = sql("select gen_random_uuid()");
  for (const k of ["x", "y"]) sql(`insert into library_change (id, workspace_id, kind, key, label, action, status, proposed_by, batch_id) values (gen_random_uuid(), '${ws}', 'field', '${(sql("select distinct canonical_field_key from form_field_map where canonical_field_key is not null and status='PUBLISHED' order by canonical_field_key limit 1 offset " + (k === "x" ? 3 : 4)))}', 'Rv batch ${k}', 'EDIT', 'WAITING', 'user-C', '${bid}')`);
  // Merge
  const [mk, mm] = sql("select canonical_field_key from canonical_field where value_type='text' and status='PUBLISHED' and merged_into_key is null group by canonical_field_key order by canonical_field_key desc limit 2").split("\n");
  log("merge", (await call("POST", "/library/merges", { keep: mk, merge: mm, reason: "Test input: the same meaning under two keys." })).status);
  // Held files: unreadable; readable with a code (off list); an older edition
  log("held0", (await intake("unreadable.pdf", pdf("A letter", "Nothing that names a form")))?.outcome);
  log("held1", (await intake("imm5476-next.pdf", pdf("IMM 5476 E: Use of a representative (test edition)", "IMM 5476 (01-2027) E"), sv))?.outcome);
  log("older", (await intake("imm5476e-2021.pdf", readFileSync(`${OFFICIAL}/previous-editions/imm5476e-2021.pdf`)))?.outcome);
  log("older5257", (await intake("imm5257e-pre-2023.pdf", readFileSync(`${OFFICIAL}/previous-editions/imm5257e-pre-2023.pdf`)))?.outcome);
  // Library form delete, accepts, who fills, combination retire, structure node retire
  sql(`insert into gov_form_def select (jsonb_populate_record(null::gov_form_def, to_jsonb(d) || jsonb_build_object('id', gen_random_uuid(), 'form_key', 'IMM 0100', 'display_name', 'Rv form', 'form_page_url', null, 'retired_at', null, 'retired_by', null))).* from gov_form_def d where form_key='IMM 5488'`);
  log("delform", (await call("DELETE", `/library/forms/${encodeURIComponent("IMM 0100")}`, { reason: "Not used by any combination" })).status);
  log("accepts", (await call("POST", `/library/forms/${encodeURIComponent("IMM 1295")}/accepts`, { account: "ANY", channels: ["PDF_UPLOAD", "ONLINE"], reason: "Reviewer test input" })).status);
  const fact = sql("select canonical_field_key from section_question where status='PUBLISHED' limit 1");
  log("fills", (await call("POST", `/library/fields/${encodeURIComponent(fact)}/fills`, { to: "CASE_OFFICER", reason: "Sample: reviewer test" })).status);
  // A combination with form lines (so its change belongs to forms): deleted if never released, else retired.
  const other = sql(`select combination_id from combination_form where combination_id<>'${sv}' and status<>'RETIRED' group by combination_id order by count(*) desc limit 1`);
  const cd = await call("DELETE", `/combinations/${other}`, { reason: "Reviewer test input" });
  if (cd.status >= 300) log("comboRetire", (await call("POST", `/combinations/${other}/retire`, { reason: "Reviewer test input" })).status);
  // Form fields: an unresolved DRAFT row on IMM 5707's edition (test input)
  sql(`update form_field_map set outcome='unresolved', status='DRAFT', canonical_field_key=null where id=(select m.id from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label like 'IMM 5409 (%' order by m.data_path limit 1)`);
  // Running: a batch with two jobs (test input)
  const bat = sql(`insert into ai_batch (id, workspace_id, idempotency_key, operation, scope_kind, scope_label, mode, status, plan_sha256, plan, spend_limit_usd, worst_case_usd, started_by) values (gen_random_uuid(), '${ws}', 'rv-'||gen_random_uuid(), 'draft', 'combination', 'Rv running batch', 'STUB', 'RUNNING', 'x', '{}', 1, 0.5, 'user-A') returning id`).split("\n")[0];
  const a2 = sql(`select id from source_attachment where edition like 'IMM 5707 (%' limit 1`);
  sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by, batch_id) values (gen_random_uuid(), '${ws}', '${sv}', '${att.id}', 'read_form', 'STUB', 'RUNNING', 'user-A', '${bat}'), (gen_random_uuid(), '${ws}', '${sv}', ${a2 ? `'${a2}'` : "null"}, 'read_form', 'STUB', 'QUEUED', 'user-A', '${bat}')`);
  // AI proposals (test input copies of job 1): one with proposals waiting on another combination's IMM 5257, one decided on IMM 5707
  const a3 = sql(`select a.id || '|' || a.combination_id from source_attachment a where a.edition like 'IMM 5257 (%' and a.combination_id<>'${sv}' limit 1`).split("|");
  const j2 = sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by, finished_at, detail, cost_usd) select gen_random_uuid(), workspace_id, '${a3[1]}', '${a3[0]}', 'field_map', 'REPLAY', 'COMPLETED', 'user-C', now(), detail, 0 from drafting_job where id='${jobId}' returning id`).split("\n")[0];
  sql(`insert into proposal_item (id, workspace_id, kind, run_id, step, form_edition, combination_id, lands_on, reuse, payload, rounds, agreement, confidence, origin, identity, identity_key, status) select gen_random_uuid(), workspace_id, kind, '${j2}', step, form_edition, '${a3[1]}', lands_on, reuse, payload, rounds, agreement, confidence, origin, identity, identity_key, 'waiting' from proposal_item where run_id='${jobId}' limit 5`);
  if (a2) sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by, finished_at, detail, cost_usd) select gen_random_uuid(), workspace_id, '${sv}', '${a2}', 'field_map', 'REPLAY', 'COMPLETED', 'user-B', now(), detail, 0 from drafting_job where id='${jobId}'`);
  const q = (await call("GET", "/review-queue?filter=all")).body;
  log("kinds", q.kinds, q.counts);
  return { sv, other };
}
