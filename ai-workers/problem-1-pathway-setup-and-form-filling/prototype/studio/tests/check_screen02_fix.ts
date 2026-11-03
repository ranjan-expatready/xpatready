// Screen 02 FIX round (25 Oct): one check per break (break-report.md B1, M1–M8, minors) and per reviewer Must
// (review.md), each with its failing case, through the API and the database on an isolated copy. No browser, no model
// call (one saved AI answer replayed, US$0).
//   C5.3 B1      a returned new shared field is corrected and sent again, or withdrawn; never a frozen combination
//   C3.6 BR-7    one name once per draft and workspace (M1); Accept is no way round the reason (Must 3)
//   C5.3 BR-9    the person who applied the draft does not approve its fields (M2); every new field has an ADD (M3)
//   C5.3 P-79    To review offers Release only when the release takes it (Must 1); K1 form fields have a row (Musts 4, 5)
//   C2.3 P-80    held files: uploader's step (Must 6), unreadable file refused (M4), file to compare (M6), page seen (m5)
//   C9.1         an edition approved in the product can be set aside (M5); accept needs `expected` (m6)
//   C3.4 K2      malformed checklist proposal refused before anything is written (M7); one open stub draft (m9)
//   C3.6         decisions validated (M8, m1, m3, m4, m7, m8)
//   zsh studio/tools/isolated.sh screens_fix 4444 start && tsx studio/tests/check_screen02_fix.ts 4444 xr_studio_screens_fix
import { execFileSync } from "node:child_process";
import { seedField, seedSection } from "./seed_library.cjs";
import { acceptCleanOneByOne } from "./lib/accept-draft.ts";

const PORT = Number(process.argv[2] ?? 4444), DB = process.argv[3] ?? "xr_studio_screens_fix";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
type R = { status: number; body: any };
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const raw = async (path: string, body: string, actor = "user-A") => (await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": actor, "content-type": "application/json" }, body })).status;
const intake = async (name: string, bytes: Buffer, combinationId?: string, actor = "user-A") => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(bytes)]), name); if (combinationId) fd.append("combinationId", combinationId);
  const r = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return (await r.json()).results?.[0];
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const until = async (fn: () => Promise<boolean>, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
const queue = async (actor: string, kind?: string) => (await call("GET", `/review-queue?filter=all${kind ? `&kind=${kind}` : ""}`, undefined, actor)).body.items as any[];
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
const PAGE = "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5476.html";
const REASON = "Test: a different meaning from the library field that could fit.";

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  let r = await call("POST", "/demo/load");
  ok("setup: sample inputs load", r.status === 201, r.body?.seconds);
  // S5 slice 2 coverage gate (BR-11): every answer the applied forms need is asked of someone before a submit. This check
  // is not about questions, so each answer the gate names is placed for the case officer to fill (a working view).
  const coverAll = async (cid: string) => {
    const sec = ((await call("GET", "/library/sections")).body as { key: string }[])[0]?.key;
    for (const x of ((await call("GET", `/combinations/${cid}`)).body.draft.problems as { where: string; item: string }[]).filter((p) => p.where === "Questionnaires"))
      await call("POST", `/library/fields/${encodeURIComponent(x.item)}/placement`, { sectionKey: sec, collectedFrom: "staff_working_view", repeats: x.item.startsWith("case.") ? "once_per_case" : "per_person" });
  };
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const att = (await call("GET", `/combinations/${sv}/attachments`)).body.find((a: any) => /IMM 5257 \(/.test(a.edition ?? ""));
  const saved = ((await call("GET", `/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x: any) => x.valid);
  r = await call("POST", `/attachments/${att.id}/draft`, { mode: "replay", runFile: saved.file });
  const jobId = r.body?.id ?? r.body?.job?.id ?? sql(`select id from drafting_job where combination_id='${sv}' and kind='field_map' order by started_at desc limit 1`);
  await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED");
  let job = (await call("GET", `/jobs/${jobId}`)).body;
  ok("setup: the saved AI answer is replayed (no model call, US$0)", job.status === "COMPLETED" && job.items.length > 0, job.items.length);
  const items = job.items as any[];
  const clean = items.filter((i) => i.outcome === "NEW" && !(i.candidates ?? []).some((c: any) => c.score >= 0.55));
  const near = items.find((i) => i.outcome === "NEW" && (i.candidates ?? []).some((c: any) => c.score >= 0.55) && !(i.evidence?.recommendation?.key && sql(`select count(*) from canonical_field where canonical_field_key='${i.evidence.recommendation.key}'`) !== "0"));

  // ─────────────────────────────── M8, m1, m3-ish, m4, m7, m8: decisions are validated
  const a = clean[0], b = clean[1], c = clean[2];
  r = await call("POST", `/jobs/${jobId}/items/${a.id}`, { decision: "BOGUS" });
  ok("C3.6 M8 fail: an unknown decision is refused (400), nothing stored", r.status === 400 && sql(`select status from proposal_item where id='${a.id}'`) === "waiting", r.body?.detail);
  r = await call("POST", `/jobs/${jobId}/items/${a.id}`, { decision: "NEW", label: "Brk value type", meaning: "A test meaning long enough.", valueType: "<script>alert(1)</script>" });
  ok("C3.6 M8 fail: an unknown kind of value is refused (400)", r.status === 400, r.body?.detail);
  r = await call("POST", `/jobs/${jobId}/items/${a.id}`, { decision: "NEW", label: "Brk long meaning", meaning: "x".repeat(200_000) });
  ok("C3.6 M8 fail: a 200,000-character meaning is refused (400)", r.status === 400, r.body?.detail);
  ok("C3.6 m1 fail: a JSON array body is a plain 400, not a 500", (await raw(`/jobs/${jobId}/items/${a.id}`, "[1,2]")) === 400);

  // ─────────────────────────────── M1: the same name once per draft and workspace
  // Decided by the content reviewer, applied later by the author (M2 below).
  r = await call("POST", `/jobs/${jobId}/items/${a.id}`, { decision: "NEW", label: "Brk duplicate name", meaning: "A test meaning long enough." }, "user-C");
  ok("C3.6 BR-7: a new name is taken once", r.status === 201, r.body?.decidedKey);
  r = await call("POST", `/jobs/${jobId}/items/${b.id}`, { decision: "NEW", label: "  BRK   Duplicate  name ", meaning: "A test meaning long enough." });
  ok("C3.6 M1 fail: the same name again in the same draft (case and spaces aside) is refused (409)", r.status === 409, r.body?.detail);
  const [x1, x2] = await Promise.all([b, c].map((i) => call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "NEW", label: "Brk race name", meaning: "A test meaning long enough." })));
  ok("C3.6 M1 fail: two decisions with one name at the same moment: one 201, one 409", [x1.status, x2.status].sort().join() === "201,409", [x1.status, x2.status]);
  const winner = x1.status === 201 ? b : c, loser = winner === b ? c : b;
  r = await call("POST", `/jobs/${jobId}/items/${loser.id}`, { decision: "NEW", label: "出生地", meaning: "A test meaning long enough." });
  ok("C3.6 m7: a non-Latin name gets its own key (never group.field)", r.status === 201 && !/\.field(_\d+)?$/.test(r.body.decidedKey), r.body?.decidedKey);

  // ─────────────────────────────── Must 3: Accept is no way round BR-7's reason
  if (near) {
    r = await call("POST", `/jobs/${jobId}/items/${near.id}`, { decision: "ACCEPTED" });
    ok("C3.6 BR-7 fail (Must 3): accepting a new field while a library field could fit, with no reason, is refused (400)", r.status === 400 && /could fit/.test(r.body?.detail), r.body?.detail);
    r = await call("POST", `/jobs/${jobId}/items/${near.id}`, { decision: "ACCEPTED", note: REASON });
    ok("C3.6 BR-7 (Must 3): with a reason it is accepted and the reason kept", r.status === 201 && r.body.decisionNote === REASON, r.body?.decidedKey);
  } else ok("C3.6 BR-7 (Must 3): the replayed answer has a new proposal near a library field", false);

  // The rest as the AI recommends (with a reason where a field could fit), applied by user-C so M2 can be checked.
  await acceptCleanOneByOne(call, jobId, ["REUSE", "NEW"]);
  job = (await call("GET", `/jobs/${jobId}`)).body;
  for (const i of job.items.filter((x: any) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: REASON });
  ok("C2.2 m2 fail: a field-map draft is not applied as a checklist (4xx)", (await call("POST", `/jobs/${jobId}/apply-checklist`)).status === 404);
  r = await call("POST", `/jobs/${jobId}/apply`, { who: "each_applicant" }, "user-A");
  ok("setup: the decided draft is applied", r.status === 201, r.body?.detail ?? r.body);
  // C3.8 [IRCC-F09]: the super visa's package lists IMM 5707, so it is added from the library before the draft is submitted.
  const fam = ((await call("GET", `/combinations/${sv}/attachments`)).body as any[]).find((a) => /IMM 5707 \(/.test(a.edition ?? ""));
  if (fam) ok("setup: IMM 5707 is added from the library (its package lists it)", (await call("POST", `/attachments/${fam.id}/reuse`, {})).status < 300);
  await coverAll(sv);
  ok("C3.6 M1: the library holds one field per new name", sql("select count(distinct canonical_field_key) from canonical_field where label='Brk race name'") === "1" && sql("select count(distinct canonical_field_key) from canonical_field where lower(label)='brk duplicate name'") === "1");
  const changes = (await call("GET", "/library/changes?status=WAITING")).body as any[];

  // ─────────────────────────────── M2: decided by the reviewer, applied by the author: the author is not the second person
  const one = changes.find((ch) => ch.label === "Brk duplicate name")!;
  r = await call("POST", `/library/changes/${one.id}/approve`, {}, "user-A");
  ok("C5.3 BR-9 fail (M2): the person who applied the draft cannot approve a field from it (403)", r.status === 403 && /applied the draft/.test(r.body?.detail), r.body?.detail);
  r = await call("POST", `/library/changes/${one.id}/approve`, {}, "user-C");
  ok("C5.3 BR-9 fail: nor can the person who decided it (403)", r.status === 403 && /proposed/.test(r.body?.detail), r.body?.detail);

  // ─────────────────────────────── K1 (Musts 4, 5): the form fields have their own To review row
  let ffRow = (await queue("user-C", "form_fields")).find((i) => i.state === "needs");
  ok("C3.8 K1 (Must 4): To review lists the applied edition's undecided form fields with a page to decide them", !!ffRow && /^\/review\/form-fields\//.test(ffRow.next?.href) && /no decision/.test(ffRow.what), ffRow?.what);
  // QA-53 (28 Oct): a case person (the officer) is not shown To review at all now (403); every Studio person holds the review duty.
  const officerQueue = await call("GET", "/review-queue?filter=all&kind=form_fields", undefined, "user-O");
  ok("C3.8 K1 (Must 4) fail: a person without the review duty does not decide that row (the case officer is refused To review, QA-53)", officerQueue.status === 403, officerQueue.status);
  r = await call("POST", `/combinations/${sv}/submit`, {});
  ok("C3.8 K1 (Must 4): the refusal says where to decide them", r.status === 400 && /To review › Form fields/.test(r.body?.detail), r.body?.detail);
  const edId = ffRow!.next.href.split("/").pop();
  r = await call("POST", `/editions/${edId}/form-fields/decision`, { dataPath: (await call("GET", `/editions/${edId}/form-fields`)).body.fields.find((f: any) => f.outcome === "unresolved").dataPath, decision: "not_a_fact", reason: "​".repeat(8) }, "user-C");
  ok("C3.8 m3 fail: a reason of zero-width spaces is refused (400)", r.status === 400, r.body?.detail);
  for (const f of (await call("GET", `/editions/${edId}/form-fields`)).body.fields.filter((f: any) => f.outcome === "unresolved"))
    await call("POST", `/editions/${edId}/form-fields/decision`, { dataPath: f.dataPath, decision: f.background ? "by_hand" : "not_a_fact", reason: f.background ? "A Background question, recorded by hand (C3.8, IRCC-F08)." : "Office use or a document upload: no case fact fills it." }, "user-C");
  ok("C3.8 K1 (Must 5): once decided, the form-fields row leaves To review", !(await queue("user-C", "form_fields")).some((i) => i.id === ffRow!.id));
  r = await call("POST", `/combinations/${sv}/submit`, {});
  ok("setup: the draft is submitted", r.status === 201, r.body?.detail);
  const sme = ((await call("GET", `/combinations/${sv}/review`)).body.submission?.changeSummary ?? []).filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${sv}/signoff`, { items: sme, action: "signed" }, "user-C");

  // ─────────────────────────────── Must 1: Release is offered only when the release takes it
  let rel = (await queue("user-B", "release")).find((i) => i.title.includes("Super visa"));
  ok("C5.3 P-79 fail (Must 1): with new fields still waiting, To review does not offer Release", rel && rel.state === "waiting" && !rel.next && /Not ready to release/.test(rel.what), rel?.what);

  // ─────────────────────────────── B1: a returned field is corrected or withdrawn, never frozen
  const [back, gone] = changes.filter((ch) => ch.id !== one.id);
  for (const ch of [back, gone]) await call("POST", `/library/changes/${ch.id}/return`, { note: "Too close to an existing field: say how it differs." }, "user-C");
  r = await call("POST", `/library/changes/${back.id}/return`, { note: "x".repeat(500_000) }, "user-C");
  ok("C5.3 m4 fail: a 500 KB note is refused (400 or 409, never stored)", [400, 409].includes(r.status) && Number(sql("select coalesce(max(length(decision_note)),0) from library_change")) <= 300, r.status);
  let row = (await queue("user-A", "library_change")).find((i) => i.id === `change:${back.id}`);
  ok("C5.3 B1: the returned field is a step for its author on To review (Correct or withdraw)", row?.state === "needs" && row?.next?.label === "Correct or withdraw", row?.next);
  r = await call("POST", `/library/changes/${back.id}/resubmit`, { reason: "short" });
  ok("C5.3 B1 fail: sending it again needs what was corrected (400)", r.status === 400, r.body?.detail);
  r = await call("POST", `/library/changes/${back.id}/resubmit`, { reason: "Narrowed the meaning to the sponsor only." }, "user-O");
  ok("C5.3 B1 fail: a person who neither proposed it nor authors cannot correct it (403)", r.status === 403, r.body?.detail);
  r = await call("POST", `/library/changes/${back.id}/resubmit`, { meaning: "Corrected meaning: the sponsor's own value only.", reason: "Narrowed the meaning to the sponsor only." });
  ok("C5.3 B1: the corrected field waits for a second person again", r.status === 201 && r.body.status === "WAITING", r.body?.status ?? r.body?.detail);
  r = await call("POST", `/library/changes/${gone.id}/withdraw`, { note: "Not needed: use the library field." });
  ok("C5.3 B1: a returned field can be withdrawn instead; its form fields go back to no decision", r.status === 201 && r.body.status === "WITHDRAWN" && Number(sql(`select count(*) from form_field_map where canonical_field_key='${gone.key}' and status='DRAFT'`)) === 0, r.body?.status ?? r.body?.detail);
  r = await call("POST", `/library/changes/${gone.id}/withdraw`, { note: "Again." });
  ok("C5.3 B1 fail: a withdrawn change cannot be withdrawn again (409)", r.status === 409, r.body?.detail);
  // Its reopened form fields are decided, the draft submitted again, every waiting field approved, then released.
  for (const f of (await call("GET", `/editions/${edId}/form-fields`)).body.fields.filter((f: any) => f.outcome === "unresolved"))
    await call("POST", `/editions/${edId}/form-fields/decision`, { dataPath: f.dataPath, decision: f.background ? "by_hand" : "not_a_fact", reason: f.background ? "A Background question, recorded by hand (C3.8, IRCC-F08)." : "Withdrawn field: no case fact fills it now." }, "user-C");
  for (const ch of (await call("GET", "/library/changes?status=WAITING")).body) if ((await call("POST", `/library/changes/${ch.id}/approve`, {}, "user-C")).status === 403) await call("POST", `/library/changes/${ch.id}/approve`, {}, "user-B");
  r = await call("POST", `/combinations/${sv}/submit`, {});
  const sme2 = ((await call("GET", `/combinations/${sv}/review`)).body.submission?.changeSummary ?? []).filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
  if (sme2.length) await call("POST", `/combinations/${sv}/signoff`, { items: sme2, action: "signed" }, "user-C");
  rel = (await queue("user-B", "release")).find((i) => i.title.includes("Super visa"));
  ok("C5.3 P-79 (Must 1): once every new field is approved, To review offers Release", rel?.state === "needs" && rel?.next?.label === "Release", rel?.what);
  // Lead re-check item 1: an approved change this combination does not use waits for the shared Release page.
  seedField(sql, { key: "person.brk_unrelated", meaning: "A test field no combination uses." }); // P-158: no free add; written as a source would
  const unrelated = sql("select id from library_change where key='person.brk_unrelated'");
  await call("POST", `/library/changes/${unrelated}/approve`, {}, "user-C");
  r = await call("POST", `/combinations/${sv}/approve`, undefined, "user-B");
  ok("C5.3 (Lead item 1): one combination's release does not publish an approved change it does not use", r.status === 201 && sql(`select status from library_change where id='${unrelated}'`) === "APPROVED" && !r.body.library?.some((l: any) => l.key === "person.brk_unrelated"), sql(`select status from library_change where id='${unrelated}'`));
  ok("C5.3 B1: after a return and a correction the combination is released (not frozen)", r.status === 201 && r.body.library?.some((l: any) => l.key === back.key) && sql(`select status from library_change where id='${back.id}'`) === "RELEASED", r.body?.detail ?? r.body?.library?.length);

  // ─────────────────────────────── Lead item 2: new sections and document types are reviewed before release too
  const secKey = seedSection(sql, { title: "Brk section", meaning: "A test section." }); // P-158: proposed from the forms' parts, not added by hand
  ok("C5.3 (Lead item 2): a new section waits as an ADD for a second person", sql(`select status from library_change where kind='section' and key='${secKey}'`) === "WAITING", secKey);
  await call("POST", `/combinations/${sv}/sections/${secKey}`);
  r = await call("POST", `/combinations/${sv}/requirements`, { newTypeName: "Brk document", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" });
  // C3.6 (P-158): it now waits as a library proposal on To review (202); its ADD is written when a second person accepts it.
  ok("C5.3 (Lead item 2): a document type named with a requirement waits for a second person (a library proposal, 202)", r.status === 202 && sql("select status from proposal_item where kind='document_type' and payload->>'name'='Brk document'") === "waiting" && sql("select count(*) from document_type where name='Brk document'") === "0", r.body?.detail ?? r.status);
  // Accepted on To review (its ADD now waits for the second person, as before), then the line is added with it.
  const brkKey = (await call("POST", "/review/proposals/decide", { ids: [r.body?.proposalId], action: "accept" }, "user-B")).body?.items?.[0]?.landedAs;
  r = await call("POST", `/combinations/${sv}/requirements`, { documentTypeKey: brkKey, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" });
  ok("C5.3 (Lead item 2): once accepted, its ADD waits for a second person and the line is added with it", r.status === 201 && sql("select status from library_change where kind='document_type' and label='Brk document'") === "WAITING", r.body?.detail ?? r.status);
  r = await call("POST", `/combinations/${sv}/submit`, {});
  const sme3 = ((await call("GET", `/combinations/${sv}/review`)).body.submission?.changeSummary ?? []).filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
  if (sme3.length) await call("POST", `/combinations/${sv}/signoff`, { items: sme3, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${sv}/approve`, undefined, "user-B");
  ok("C5.3 fail (Lead item 2): a release using a new section and document type still waiting is refused (409)", r.status === 409 && /Brk section|Brk document/.test(r.body?.detail) && /new library items|new section|new document type/.test(r.body?.detail), r.body?.detail);
  rel = (await queue("user-B", "release")).find((i) => i.title.includes("Super visa"));
  ok("C5.3 (Lead item 2): To review says the same and offers no Release", rel?.state === "waiting" && !rel?.next && /Brk/.test(rel?.what), rel?.what);
  for (const ch of (await call("GET", "/library/changes?status=WAITING")).body.filter((c: any) => c.kind !== "field")) await call("POST", `/library/changes/${ch.id}/approve`, {}, "user-C");
  r = await call("POST", `/combinations/${sv}/approve`, undefined, "user-B");
  ok("C5.3 (Lead item 2): once approved, they are published with the combination", r.status === 201 && sql(`select status from logical_section where section_key='${secKey}' order by version desc limit 1`) === "PUBLISHED" && sql("select status from document_type where name='Brk document' order by version desc limit 1") === "PUBLISHED", r.body?.detail ?? r.body?.library);

  // ─────────────────────────────── Lead item 5: one name per group in the database too
  let dbErr = "";
  try { sql("insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label, group_key) select gen_random_uuid(), workspace_id, 'person.brk_db_twin', 1, 'DRAFT', 'x', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'test', 'BRK  duplicate-name', 'case' from canonical_field where canonical_field_key='" + sql("select canonical_field_key from canonical_field where label='Brk duplicate name' limit 1") + "' limit 1"); } catch (e) { dbErr = String((e as { stderr?: string }).stderr ?? e); }
  ok("C3.6 (Lead item 5) fail: the database refuses a second key with the same name in the group (case, spaces and punctuation aside)", /canonical_field_name_unique|duplicate key/.test(dbErr), dbErr.slice(0, 160));
  ok("C3.6 (Lead item 5): the same name in another group is allowed", (() => { try { sql("insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label, group_key) select gen_random_uuid(), workspace_id, 'relationship.brk_other_group', 1, 'DRAFT', 'x', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'test', 'Brk duplicate name', 'relationship' from canonical_field limit 1"); return true; } catch { return false; } })());

  // ─────────────────────────────── M3: every new shared field has an ADD, whichever route made it
  r = await call("POST", "/library/fields", { key: "person.brk_bypass", meaning: "A test field made on the Library page.", valueType: "text" });
  ok("C3.6 P-158 fail (was M3): no field is made on the Library page at all (410), so none skips the ADD", r.status === 410 && sql("select count(*) from canonical_field where canonical_field_key='person.brk_bypass'") === "0", r.status);

  // ─────────────────────────────── Must 6, M4, M6, m5: held files
  const junk = await intake("brk-junk.pdf", Buffer.from("%PDF-1.4 junk"), sv);
  const jid = sql("select id from intake_item where file_name='brk-junk.pdf' and status='HELD' limit 1");
  ok("setup: an unreadable file is held", junk?.outcome === "held" && !!jid, junk?.outcome);
  // Lead 28 Oct (S4 carried should): a copy whose code and edition could not be read can never be approved (M4), so
  // nobody records its IRCC page: the uploader waits and the second person rejects it. The readable copy below records it.
  let hr = (await queue("user-A", "held_file")).find((i) => i.id === `held:${jid}`);
  ok("C2.3 P-80 (Lead 28 Oct) fail: an unreadable copy is never the uploader's \"record the IRCC page\" step", hr?.state === "waiting" && hr?.next === null && /cannot be approved/.test(hr?.what ?? ""), hr);
  hr = (await queue("user-C", "held_file")).find((i) => i.id === `held:${jid}`);
  ok("C2.3 P-80 (Lead 28 Oct): the second person's step for it is to reject the copy", hr?.state === "needs" && hr?.next?.label === "Reject the copy", hr?.next);
  r = await call("PATCH", `/intake/held/${jid}`, { irccPage: `${PAGE}?${"a".repeat(600)}` });
  ok("C2.3 m5 fail: a page over 500 characters is refused, not cut (400)", r.status === 400, r.body?.detail);
  await call("PATCH", `/intake/held/${jid}`, { irccPage: PAGE });
  r = await call("POST", `/intake/held/${jid}/approve`, { irccPage: PAGE }, "user-C");
  ok("C2.3 M4 fail: a file whose code and edition could not be read is not approved (409), nothing written", r.status === 409 && sql("select count(*) from approved_source") === "0" && sql(`select status from intake_item where id='${jid}'`) === "HELD", r.body?.detail);
  await call("POST", `/intake/held/${jid}/reject`, { note: "Not an official file." }, "user-C");
  const next = pdf("IMM 5476 E: Use of a representative (test edition)", "IMM 5476 (01-2030) E");
  await intake("imm5476-2030.pdf", next, sv);
  const hid = sql("select id from intake_item where file_name='imm5476-2030.pdf' and status='HELD' limit 1");
  const hv = (await call("GET", "/intake/held", undefined, "user-C")).body;
  const one5476 = (Array.isArray(hv) ? hv : hv?.items ?? []).find((h: any) => h.id === hid);
  ok("C2.3 M6: the held file reads its checksum and read code for the second person", !!one5476 && /^[0-9a-f]{64}$/.test(one5476.sha256) && one5476.stored === true, one5476 && { code: one5476.code, edition: one5476.edition });
  const file = await fetch(`http://localhost:${PORT}/api/intake/held/${hid}/file`, { headers: { "x-actor": "user-C" } });
  ok("C2.3 M6: the held PDF opens to compare, sandboxed and never sniffed", file.status === 200 && file.headers.get("content-security-policy") === "sandbox" && file.headers.get("x-content-type-options") === "nosniff");
  r = await call("GET", `/intake/held/${jid}/file`);
  ok("C2.3 M6 fail: a decided (rejected) file is no longer served (404)", r.status === 404, r.body?.detail);
  hr = (await queue("user-A", "held_file")).find((i) => i.id === `held:${hid}`);
  ok("C2.3 P-80 (Must 6): the uploader's step is to record the IRCC page (a readable copy)", hr?.state === "needs" && hr?.next?.label === "Record the IRCC page", hr?.next);
  hr = (await queue("user-C", "held_file")).find((i) => i.id === `held:${hid}`);
  ok("C2.3 P-80 (Must 6) fail: the second person waits until the page is recorded", hr?.state === "waiting" && /records the IRCC page/.test(hr?.waiting_on), hr?.waiting_on);
  await call("PATCH", `/intake/held/${hid}`, { irccPage: PAGE });
  hr = (await queue("user-C", "held_file")).find((i) => i.id === `held:${hid}`);
  ok("C2.3 P-80: once recorded, the second person checks the source", hr?.state === "needs" && hr?.next?.label === "Check the source", hr?.next);
  await call("PATCH", `/intake/held/${hid}`, { irccPage: `${PAGE}#changed` });
  r = await call("POST", `/intake/held/${hid}/approve`, { irccPage: PAGE }, "user-C");
  ok("C2.3 m5 fail: a page changed after the second person opened it is not approved (409)", r.status === 409 && /changed after you opened/.test(r.body?.detail), r.body?.detail);
  r = await call("POST", `/intake/held/${hid}/approve`, { irccPage: `${PAGE}#changed` }, "user-C");
  ok("C2.3 P-80: approved on the page that was seen", r.status === 201 && sql("select count(*) from approved_source") === "1", r.body?.result?.outcome ?? r.body?.detail);

  // ─────────────────────────────── M5, m6: an edition approved in the product
  const ne = sql("select id from intake_item where sha256=(select sha256 from approved_source limit 1) and status='HELD' and outcome='new_edition_held' order by created_at desc limit 1");
  if (ne) {
    r = await call("GET", `/intake/held/${ne}/impact`);
    ok("C9.1 M5: an edition approved in the product says it cannot be compared yet and how to clear it", r.status === 409 && /Set it aside/.test(r.body?.detail), r.body?.detail);
    r = await call("POST", `/intake/held/${ne}/impact/accept`, {});
    ok("C9.1 m6 fail: accept without the reviewed count is refused (400)", r.status === 400, r.body?.detail);
    r = await call("POST", `/intake/held/${ne}/reject`, { note: "Waiting for the official file in the library." }, "user-C");
    ok("C9.1 M5: it can be set aside with a reason, and leaves To review", r.status === 201 && !(await queue("user-A", "new_edition")).some((i) => i.id === `held:${ne}`), r.body?.detail ?? r.body);
  } else ok("C9.1 M5: the approved test edition is held as a new edition", false, sql("select outcome from intake_item where file_name='imm5476-2030.pdf' order by created_at desc limit 1"));

  // ─────────────────────────────── M7, m8, m9: checklist drafts
  const ck = (await call("GET", `/combinations/${sv}/attachments`)).body.find((a: any) => a.recognised && a.kind === "Document checklist");
  const drafts = await Promise.all(Array.from({ length: 10 }, () => call("POST", `/attachments/${ck.id}/draft-checklist`, { mode: "stub" })));
  ok("C3.4 m9: ten stub drafts at once leave one open draft", new Set(drafts.map((d) => d.body?.id)).size === 1 && Number(sql(`select count(*) from drafting_job where attachment_id='${ck.id}' and kind='checklist_draft' and status='COMPLETED'`)) === 1, drafts.map((d) => d.status));
  const ckJob = sql(`select id from drafting_job where attachment_id='${ck.id}' and kind='checklist_draft' and status='COMPLETED' order by started_at desc limit 1`);
  // Scaffolding (test input, not an AI answer): one malformed proposal, the shape a live answer could return.
  sql(`insert into proposal_item (id, workspace_id, kind, run_id, step, lands_on, reuse, payload, source, rounds, agreement, confidence, origin, identity, identity_key, work)
       select gen_random_uuid(), workspace_id, 'requirement_line', id, 'checklist_draft', 'combination', '{"match":"new","existingKey":null}', '{"who": 5}'::jsonb || '{"kind":"requirement_line"}', null, '{"draft":null,"check":null}', 'one_round', 'check', 'ai', '{"key":"requirement.brk","near":[],"nearReason":null}', 'requirement.brk', '{"proposedKey":"requirement.brk","outcome":"NEW","reason":"test input","legacyKind":"document_requirement","legacyPayload":{"who": 5},"sourceQuote":"Test input"}' from drafting_job where id='${ckJob}'`);
  const bad = sql(`select id from proposal_item where run_id='${ckJob}' and identity_key='requirement.brk'`);
  r = await call("POST", `/jobs/${ckJob}/items/${bad}`, { decision: "NEW", label: "Brk checklist", meaning: "A test meaning long enough." });
  ok("C3.4 m8 fail: a checklist proposal cannot be made a shared field (410: it is decided on the review queue only)", r.status === 410, r.body?.detail);
  const reqs = Number(sql(`select count(*) from document_requirement where combination_id='${sv}'`));
  r = await call("POST", "/review/proposals/decide", { ids: [bad], action: "accept" });
  ok("C3.4 M7 fail: a malformed line is refused at accept (400, in words) and nothing is written", r.status === 400 && /incomplete/.test(r.body?.detail ?? "") && sql(`select status from proposal_item where id='${bad}'`) === "waiting" && Number(sql(`select count(*) from document_requirement where combination_id='${sv}'`)) === reqs, r.body?.detail);

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP", e); process.exit(1); });
