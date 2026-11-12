// Screen 02 slice 2 through the API and the database (Lead note 25 Oct 07:00), on an isolated copy, a passing and a
// failing case per rule. No browser, no model call (one saved AI answer replayed, US$0).
//   C9.1 BR-12  new edition: compared form field by form field without AI; accept carries unchanged maps, leaves the rest
//   C3.6 BR-7   a new shared field: name typed, key generated, exact duplicate refused, reason when a field could fit
//   C5.3 B1     apply records each new shared field as a LibraryChange ADD; a second person approves (never the maker)
//   C3.8 K1     an undecided form field of an edition changed in this draft blocks submit; "not a fact" / "filled by hand"
//   C5.3 B1     a combination using an unapproved field is not released (409); both release paths publish approved changes
//   C2.3 P-80   a held file: the uploader records the IRCC page, a second person approves; the file is then accepted
//   C1.2 P-41   "Describe it" proposes a path (no AI, US$0) · C3.4 K2 checklist drafts (stub pass; apply through the writer)
//   zsh studio/tools/isolated.sh screens_s02b 4442 start && tsx studio/tests/check_screen02_slice2.ts 4442 xr_studio_screens_s02b
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { acceptCleanOneByOne } from "./lib/accept-draft.ts";

const PORT = Number(process.argv[2] ?? 4442), DB = process.argv[3] ?? "xr_studio_screens_s02b";
const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
let pass = 0, fail = 0, last = "(before the first step)";
const ok = (name: string, c: unknown, detail?: unknown) => { last = name; c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const intake = async (files: [string, Buffer][], combinationId?: string, actor = "user-A") => {
  const fd = new FormData(); for (const [name, bytes] of files) fd.append("files", new Blob([new Uint8Array(bytes)]), name); if (combinationId) fd.append("combinationId", combinationId);
  const r = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return (await r.json()).results?.[0];
};
const official = (dir: string, name: string): [string, Buffer] => [name, readFileSync(join(OFFICIAL, dir, name))];
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const until = async (fn: () => Promise<boolean>, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
function pdf(title: string, text: string) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

(async () => {
  // ─────────────────────────────── C9.1 BR-12: a new edition on a library that holds the 2021 IMM 5476 (empty workspace)
  await call("POST", "/demo/reset", { confirm: "RESET" });
  let r: any = await intake([official("previous-editions", "imm5476e-2021.pdf")]);
  ok("setup: the 2021 IMM 5476 joins an empty library through the intake", r?.outcome === "added", r?.message);
  const nowFile = official("forms", "imm5476e.pdf");
  r = await intake([nowFile]);
  ok("C9.1: the current IMM 5476 is held as a new edition (not added, attached or used)", r?.outcome === "new_edition_held", r?.outcome);
  const held = sql("select id from intake_item where outcome='new_edition_held' and status='HELD' limit 1");
  const imp = (await call("GET", `/intake/held/${held}/impact`)).body;
  ok("C9.1 BR-12: the comparison is form field by form field, with no AI and US$0", imp.ai?.used === false && imp.ai?.cost_usd === 0 && imp.counts.form_fields > 0 && imp.counts.unchanged + imp.counts.reworded + imp.counts.new === imp.counts.form_fields, imp.counts);
  ok("C9.1: the review names both editions in plain words", /IMM 5476/.test(imp.edition) && !!imp.library_edition && imp.uploaded_by === "Configuration author", `${imp.library_edition} → ${imp.edition}`);
  r = await call("POST", `/intake/held/${held}/impact/accept`, { expected: imp.counts.form_fields }, "user-C");
  ok("C9.1 fail: a person without the author duty cannot accept the impact (403)", r.status === 403, r.body?.detail);
  r = await call("POST", `/intake/held/${held}/impact/accept`, { expected: imp.counts.form_fields + 1 });
  ok("C9.1 fail: accepting a comparison that changed since it was opened is refused (409)", r.status === 409, r.body?.detail);
  r = await call("POST", `/intake/held/${held}/impact/accept`, { expected: imp.counts.form_fields });
  const rows = Number(sql(`select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label='${imp.edition}' and m.status='DRAFT'`));
  ok("C9.1 BR-12: accepting adds the edition as draft rows (carried maps + form fields left for a person); nothing published", r.status === 201 && rows === r.body.carried + r.body.for_a_person && Number(sql(`select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label='${imp.edition}' and m.status='PUBLISHED'`)) === 0, r.body);
  r = await call("POST", `/intake/held/${held}/impact/accept`, { expected: imp.counts.form_fields });
  ok("C9.1 fail: a second accept of the same edition changes nothing (409)", r.status === 409, r.body?.detail);

  // ─────────────────────────────── the sample inputs, one replayed AI answer on Super visa
  await call("POST", "/demo/reset", { confirm: "RESET" });
  r = await call("POST", "/demo/load");
  ok("setup: sample inputs load", r.status === 201, r.body?.seconds);
  ok("C3.6 M1: every shared field has a name and a group after the load (no blank names)", Number(sql("select count(*) from canonical_field where label is null or label='' or group_key is null")) === 0, sql("select count(*) from canonical_field"));
  // S5 slice 2 coverage gate (BR-11): every answer the applied forms need is asked of someone before a submit. This check
  // is not about questions, so each answer the gate names is placed for the case officer to fill (a working view).
  const coverAll = async (cid: string) => {
    const sec = ((await call("GET", "/library/sections")).body as { key: string }[])[0]?.key;
    for (const x of ((await call("GET", `/combinations/${cid}`)).body.draft.problems as { where: string; item: string }[]).filter((p) => p.where === "Questionnaires"))
      await call("POST", `/library/fields/${encodeURIComponent(x.item)}/placement`, { sectionKey: sec, collectedFrom: "staff_working_view", repeats: x.item.startsWith("case.") ? "once_per_case" : "per_person" });
  };
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const att = (await call("GET", `/combinations/${sv}/attachments`)).body.find((a: any) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await call("GET", `/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x: any) => x.valid);
  r = await call("POST", `/attachments/${att.id}/draft`, { mode: "replay", runFile: run.file });
  const jobId = r.body?.id ?? r.body?.job?.id ?? sql(`select id from drafting_job where combination_id='${sv}' and kind='field_map' order by started_at desc limit 1`);
  await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED");
  let job = (await call("GET", `/jobs/${jobId}`)).body;
  ok("setup: the saved AI answer is replayed (no model call, US$0)", job.status === "COMPLETED" && job.items.length > 0, job.items.length);

  // ─────────────────────────────── C3.6 BR-7: a new shared field
  const pick = job.items.find((i: any) => i.outcome === "NEW" && !(i.candidates ?? []).some((c: any) => c.score >= 0.55)) ?? job.items.find((i: any) => i.outcome === "NEW");
  const near = job.items.find((i: any) => i.id !== pick.id && (i.candidates ?? []).some((c: any) => c.score >= 0.55));
  const group = pick.proposedKey.split(".")[0];
  const existing = sql(`select label from canonical_field where group_key='${group}' and status='PUBLISHED' and label is not null order by canonical_field_key limit 1`);
  r = await call("POST", `/jobs/${jobId}/items/${pick.id}`, { decision: "NEW", label: existing, meaning: "A test meaning that is long enough.", valueType: pick.proposedType });
  ok("C3.6 BR-7 fail: a name already used in the same group is refused without AI (409)", r.status === 409 && /already a shared field/.test(r.body?.detail), r.body?.detail);
  r = await call("POST", `/jobs/${jobId}/items/${pick.id}`, { decision: "NEW", label: "!!!", meaning: "A test meaning that is long enough." });
  ok("C3.6 BR-7 fail: a name of punctuation only is refused (400)", r.status === 400, r.body?.detail);
  if (near) {
    r = await call("POST", `/jobs/${jobId}/items/${near.id}`, { decision: "NEW", label: "Test field near a library field", meaning: "A test meaning that is long enough." });
    ok("C3.6 BR-7 fail: when a library field could fit, a reason is required (400)", r.status === 400 && /could fit/.test(r.body?.detail), r.body?.detail);
    r = await call("POST", `/jobs/${jobId}/items/${near.id}`, { decision: "NEW", label: "Test field near a library field", meaning: "A test meaning that is long enough.", reason: "Different person: the sponsor, not the applicant." });
    ok("C3.6 BR-7: with a reason it is accepted, and the reason is kept", r.status === 201 && r.body.decision === "NEW" && /sponsor/.test(r.body.decisionNote), r.body?.decidedKey);
  }
  r = await call("POST", `/jobs/${jobId}/items/${pick.id}`, { decision: "NEW", label: "Previous travel purpose (test)", meaning: "Why the person travelled before, as written on the form." });
  ok("C3.6 BR-7: the key is generated from the group and the name (never typed)", r.status === 201 && r.body.decidedKey === `${group}.previous_travel_purpose_test`, r.body?.decidedKey);
  const newKey = r.body.decidedKey;
  // Every other proposal decided as the AI recommends, so the draft can be applied.
  await acceptCleanOneByOne(call, jobId, ["REUSE", "NEW"]);
  job = (await call("GET", `/jobs/${jobId}`)).body;
  for (const i of job.items.filter((x: any) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: "Test: a different meaning from the library field that could fit." });
  r = await call("POST", `/jobs/${jobId}/apply`, { who: "each_applicant" });
  ok("setup: the decided draft is applied", r.status === 201, r.body?.detail ?? r.body);
  const applied = r.body;
  // C3.8 [IRCC-F09]: the super visa's package lists IMM 5707, so it is added from the library before the draft is submitted.
  const fam = ((await call("GET", `/combinations/${sv}/attachments`)).body as any[]).find((a) => /IMM 5707 \(/.test(a.edition ?? ""));
  if (fam) ok("setup: IMM 5707 is added from the library (its package lists it)", (await call("POST", `/attachments/${fam.id}/reuse`, {})).status < 300);
  await coverAll(sv);
  const changes = (await call("GET", "/library/changes?status=WAITING")).body as any[];
  const mineChange = changes.find((c) => c.key === newKey);
  r = await call("GET", `/library/changes/${mineChange.id}`);
  ok("C3.6: one change reads its field by name, meaning, kind of value and group", r.status === 200 && r.body.field?.label === "Previous travel purpose (test)" && r.body.field?.group === group && /travelled before/.test(r.body.field?.meaning), r.body?.field);
  r = await call("GET", "/library/changes/00000000-0000-0000-0000-000000000000");
  ok("C3.6 fail: an unknown change is a plain 404", r.status === 404, r.body?.detail);
  ok("C5.3 B1: every new shared field from the draft waits as a library ADD, by name, with its reason and advisory check", changes.length === applied.new_fields && mineChange?.label === "Previous travel purpose (test)" && mineChange?.action === "ADD" && !!mineChange?.ai_verdict, { waiting: changes.length, new_fields: applied.new_fields });
  const q = (await call("GET", "/review-queue?filter=all&kind=library_change")).body;
  ok("C5.3: To review lists them; the person who decided them waits", q.items.length === changes.length && q.items.every((i: any) => i.state === "waiting"), q.counts);

  // ─────────────────────────────── C3.8 K1: undecided form fields block submit
  r = await call("POST", `/combinations/${sv}/submit`, {});
  ok("C3.8 K1 fail: a draft with undecided form fields of the applied edition cannot be submitted", r.status === 400 && /no decision in this draft/.test(r.body?.detail), r.body?.detail);
  ok("C3.8 K1 (#118 review): the refusal gives the form's own words as its example, never a PDF field path", !/\[\d+\]\./.test(r.body?.detail ?? "") && !/for example \./.test(r.body?.detail ?? ""), r.body?.detail);
  const ff = (await call("GET", `/jobs/${jobId}/form-fields`)).body;
  const fe = (await call("GET", `/editions/${ff.edition.id}/form-fields`)).body;
  ok("C3.8 K1: the edition's form fields read the same list (no decision, mapped, not a fact) by edition", fe.fields.length === ff.fields.length && fe.fields.some((x: any) => x.outcome_word === "No decision"), fe.fields.length);
  const open = ff.fields.filter((f: any) => f.outcome === "unresolved");
  r = await call("POST", `/editions/${ff.edition.id}/form-fields/decision`, { dataPath: open[0].dataPath, decision: "by_hand", reason: "x" });
  ok("C3.8 K1 fail: \"filled by hand\" needs a reason (400)", r.status === 400, r.body?.detail);
  r = await call("POST", `/editions/${ff.edition.id}/form-fields/decision`, { dataPath: open[0].dataPath, decision: "by_hand", reason: "Signed and dated by the applicant on paper." }, "user-O");
  ok("C3.8 K1 fail: a person without the review duty cannot decide a form field (403)", r.status === 403, r.body?.detail);
  for (const [n, f] of open.entries()) await call("POST", `/editions/${ff.edition.id}/form-fields/decision`, { dataPath: f.dataPath, decision: n === 0 || f.background ? "by_hand" : "not_a_fact", reason: n === 0 || f.background ? "Signed and dated by the applicant on paper." : "Office use or a document upload: no case fact fills it." });
  const after = (await call("GET", `/jobs/${jobId}/form-fields`)).body.fields;
  ok("C3.8 K1: each decided form field reads its decision (filled by hand / not a fact) with the reason", after.filter((f: any) => f.outcome === "unresolved").length === 0 && after.some((f: any) => f.outcome_word === "Filled by hand" && /paper/.test(f.reason)), open.length);
  // G5 (C5.1, P-248, #868): a release needs a document line beside its forms; one with a type the library has released.
  // (the line is not one the checklist draft below proposes, so its accept steps keep their own lines)
  const docKey = sql("select document_type_key from document_type where status = 'PUBLISHED' and document_type_key not like 'birth_certificate%' order by document_type_key desc limit 1");
  ok("setup (P-248): a document line is added (a release needs one)", !!docKey && (await call("POST", `/combinations/${sv}/requirements`, { documentTypeKey: docKey, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" })).status === 201, docKey);
  r = await call("POST", `/combinations/${sv}/submit`, {});
  ok("C3.8 K1: once every form field has a decision, the draft is submitted", r.status === 201, r.body?.detail);
  const sme = ((await call("GET", `/combinations/${sv}/review`)).body.submission?.changeSummary ?? []).filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${sv}/signoff`, { items: sme, action: "signed" }, "user-C");

  // ─────────────────────────────── C5.3 B1: release refused while a field waits; approved changes released
  r = await call("POST", `/combinations/${sv}/approve`, undefined, "user-B");
  ok("C5.3 B1 fail: releasing a combination that uses a field still waiting for a second person is refused (409)", r.status === 409 && /waiting for a second person on To review/.test(r.body?.detail), r.body?.detail);
  const draft = (await call("GET", "/draft", undefined, "user-B")).body;
  ok("C5.3 B1: the Release page holds it back with the same reason", draft.rows.find((x: any) => x.combinationId === sv)?.held && /waiting for a second person/.test(draft.rows.find((x: any) => x.combinationId === sv)?.why), draft.rows.find((x: any) => x.combinationId === sv)?.why);
  r = await call("POST", `/library/changes/${mineChange.id}/approve`, {}, "user-A");
  ok("C5.3 BR-9 fail: the person who proposed the field cannot approve it (403)", r.status === 403, r.body?.detail);
  r = await call("POST", `/library/changes/${mineChange.id}/return`, {}, "user-C");
  ok("C5.3 fail: returning without a reason is refused (400)", r.status === 400, r.body?.detail);
  for (const c of changes) { r = await call("POST", `/library/changes/${c.id}/approve`, {}, "user-C"); if (r.status !== 201) break; }
  ok("C5.3: a second person approves each new field", r.status === 201 && (await call("GET", "/library/changes?status=WAITING")).body.length === 0, r.body?.detail ?? r.status);
  r = await call("POST", `/library/changes/${mineChange.id}/approve`, {}, "user-B");
  ok("C5.3 fail: a change already decided cannot be decided again (409)", r.status === 409, r.body?.detail);
  r = await call("POST", `/combinations/${sv}/approve`, undefined, "user-B");
  ok("C5.3 B1: the combination release publishes the approved fields through the one publisher", r.status === 201 && r.body.library?.length === changes.length && sql(`select status from canonical_field where canonical_field_key='${newKey}' order by version desc limit 1`) === "PUBLISHED", { library: r.body.library?.length, detail: r.body?.detail });
  ok("C5.3 B1: each released change records its release", Number(sql(`select count(*) from library_change where status='RELEASED' and released_in=${r.body.pack ?? -1}`)) === changes.length, r.body.pack);

  // ─────────────────────────────── C2.3 P-80: a held file approved in the product
  const bytes = pdf("IMM 5476 E: Use of a representative (test edition)", "IMM 5476 (01-2027) E");
  r = await intake([["imm5476-next.pdf", bytes]], sv);
  ok("setup: an unapproved file is held", r?.outcome === "held", r?.outcome);
  const hid = sql("select id from intake_item where status='HELD' and outcome='held' order by created_at desc limit 1");
  r = await call("POST", `/intake/held/${hid}/approve`, {}, "user-C");
  ok("C2.3 fail: a second person cannot approve before the uploader records the IRCC page (409)", r.status === 409, r.body?.detail);
  r = await call("PATCH", `/intake/held/${hid}`, { irccPage: "https://example.com/not-ircc" });
  ok("C2.3 fail: the page must be a canada.ca page (400)", r.status === 400, r.body?.detail);
  r = await call("PATCH", `/intake/held/${hid}`, { irccPage: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5476.html" }, "user-C");
  ok("C2.3 fail: only the uploader records the page (403)", r.status === 403, r.body?.detail);
  r = await call("PATCH", `/intake/held/${hid}`, { irccPage: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5476.html" });
  ok("C2.3: the uploader records the IRCC page", r.status === 200 && /canada\.ca/.test(r.body.irccPage), r.body?.irccPage);
  r = await call("POST", `/intake/held/${hid}/approve`, {});
  ok("C2.3 BR-9 fail: the uploader cannot approve their own file (403)", r.status === 403, r.body?.detail);
  r = await call("POST", `/intake/held/${hid}/reject`, {}, "user-C");
  ok("C2.3 fail: rejecting needs a reason (400)", r.status === 400, r.body?.detail);
  r = await call("POST", `/intake/held/${hid}/approve`, {}, "user-C");
  ok("C2.3 P-80: a second person approves it: its checksum joins the approved list and the file goes through the intake again", r.status === 201 && Number(sql("select count(*) from approved_source")) === 1 && r.body.result && r.body.result.outcome !== "held", r.body?.result?.outcome);
  r = await intake([["imm5476-next-again.pdf", bytes]]);
  ok("C2.3: the same file uploaded again is no longer held", r?.outcome !== "held", r?.outcome);

  // ─────────────────────────────── C3.9 / C3.5: the screen map and the merge read by their pages
  const ed = sql("select id from form_edition where channel='ONLINE' limit 1");
  const edId = ed || "00000000-0000-0000-0000-000000000000";
  r = await call("GET", `/online-versions/${edId}/screen-map`);
  ok("C3.9: an online version's screen map reads its state (or a plain 404 when there is none)", ed ? r.status === 200 && ["not_drafted", "drafted", "accepted"].includes(r.body.state) : r.status === 404, r.body?.state ?? r.body?.detail);
  const [mk, mm] = sql("select canonical_field_key from canonical_field where value_type='text' and status='PUBLISHED' and merged_into_key is null group by canonical_field_key order by canonical_field_key desc limit 2").split("\n");
  r = await call("POST", "/library/merges", { keep: mk, merge: mm, reason: "Test input: the same meaning under two keys." });
  const mg = (await call("GET", `/library/merges/${r.body?.id ?? sql("select id from field_merge where status='PROPOSED' limit 1")}`)).body;
  ok("C3.5: a proposed merge reads both fields by name with what moves", mg.status === "PROPOSED" && !!mg.goes?.label && !!mg.stays?.label && typeof mg.goes.form_fields === "number", `${mg.goes?.label} → ${mg.stays?.label}`);

  // ─────────────────────────────── C1.2 board view 11: "Describe it" proposes a path (no AI until paid runs are agreed)

  // ─────────────────────────────── C3.4 K2: a checklist drafted into document requirements (stub pass only)
  const ck = (await call("GET", `/combinations/${sv}/attachments`)).body.find((a: any) => a.recognised && a.kind === "Document checklist");
  const form = (await call("GET", `/combinations/${sv}/attachments`)).body.find((a: any) => a.kind === "Form");
  r = await call("POST", `/attachments/${form.id}/draft-checklist`, { mode: "stub" });
  ok("C3.4 fail: a form is not drafted as a checklist (400)", r.status === 400, r.body?.detail);
  r = await call("POST", `/attachments/${ck.id}/draft-checklist`, { mode: "live" });
  ok("C3.4 K2 fail: a live checklist draft waits for the founder's OK on its cost (409), nothing queued", r.status === 409 && /founder/.test(r.body?.detail), r.body?.detail);
  r = await call("POST", `/attachments/${ck.id}/draft-checklist`, { mode: "stub" });
  ok("C3.4 K2: the stub pass proves the path with no AI content and no cost", r.status === 201 && r.body.kind === "checklist_draft" && r.body.status === "COMPLETED" && r.body.costUsd === 0, r.body?.message);
  const ckJob = r.body.id;
  // Scaffolding (test input, not an AI answer): one requirement line in the queue's contract shape, as a replay adds it.
  const typeName = sql(`select name from document_type where status='PUBLISHED' order by document_type_key limit 1`).replace(/'/g, "''").replace(/"/g, '\\"');
  sql(`insert into proposal_item (id, workspace_id, kind, run_id, step, combination_id, lands_on, reuse, payload, source, rounds, agreement, confidence, origin, identity, identity_key, work)
       select gen_random_uuid(), workspace_id, 'requirement_line', id, 'checklist_draft', combination_id, 'combination', '{"match":"new","existingKey":null}', '{"kind":"requirement_line","documentType":"${typeName}","roles":["each_applicant"],"always":true,"condition":null,"alternativeGroup":null}', '{"file":"test-checklist.pdf","quote":"Test input: a quote from the checklist"}', '{"draft":null,"check":null}', 'one_round', 'check', 'ai', '{"key":"requirement.test","near":[],"nearReason":null}', 'requirement.test', '{"proposedKey":"requirement.test","reason":"test input","officialFile":"test-checklist.pdf","sourceQuote":"Test input: a quote from the checklist"}' from drafting_job where id='${ckJob}'`);
  const reqs = () => Number(sql(`select count(*) from document_requirement where combination_id='${sv}'`));
  const n0 = reqs();
  r = await call("POST", `/jobs/${ckJob}/apply-checklist`);
  ok("C3.4 fail (QA-157): the old apply door of a checklist draft answers 410 and writes nothing", r.status === 410 && reqs() === n0, r.body?.detail);
  const itemId = sql(`select id from proposal_item where run_id='${ckJob}'`);
  r = await call("POST", `/jobs/${ckJob}/items/${itemId}`, { decision: "ACCEPTED" });
  ok("C3.4 fail (QA-157): a checklist line is not decided on its job page (410), only on the review queue", r.status === 410 && sql(`select status from proposal_item where id='${itemId}'`) === "waiting", r.body?.detail);
  r = await call("POST", "/review/proposals/decide", { ids: [itemId], action: "accept" });
  ok("C3.4 K2: an accepted line is written through the queue's lander as a draft row with its source quote", r.status === 201 && reqs() === n0 + 1 && Number(sql(`select count(*) from document_requirement where combination_id='${sv}' and status='DRAFT' and source_quote='Test input: a quote from the checklist'`)) === 1, r.body);
  r = await call("POST", "/review/proposals/decide", { ids: [itemId], action: "accept" });
  ok("C3.4 fail: accepting twice changes nothing (409)", r.status === 409 && reqs() === n0 + 1, r.body?.detail);

  // ─────────────────────────────── A4 parts read-only (challenge point 5)
  const batches = (await call("GET", "/ai/batches")).body as any[];
  const one = (await call("GET", `/ai/batches/${batches[0].id}`)).body;
  ok("A4: each AI step carries its parts read-only, and the list names who started it by name", one.jobs.every((j: any) => Array.isArray(j.parts)) && batches[0].started_by_name === "Configuration author" && "parts" in batches[0], one.jobs.map((j: any) => j.parts.length));

  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`STOPPED after "${last}": ${String(e?.message ?? e).split("\n")[0].slice(0, 160)}`); process.exit(2); });
