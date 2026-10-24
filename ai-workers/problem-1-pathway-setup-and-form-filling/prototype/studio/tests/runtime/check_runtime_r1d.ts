// R1d checks (runtime lane, plan §8 RT-13…RT-17): a case's IMM 5257 filled from confirmed facts only, through the
// shared filler (read back, signatures checked); a new copy only when the officer asks; out of date and stale after a
// fact changes; a locked copy never changes (service and database); audit without values. Every rule with a passing and
// a failing case, on an isolated copy where setup_visitor_visa.ts released the visitor visa. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
//   tsx studio/tests/runtime/check_runtime_r1d.ts 4430 xr_studio_runtime_r1
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4430), DB = process.argv[3] ?? "xr_studio_runtime_r1";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", CLIENT_B = "user-Q", AUTHOR = "user-A";
const ROOT = join(import.meta.dirname, "..", "..", "..", "..", "..", "..");
const run = Date.now().toString(36);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const bytes = (path: string, actor: string) => new Promise<{ status: number; body: Buffer }>((resolve, reject) => {
  const req = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, headers: { "x-actor": actor }, agent: false }, (res) => { const c: Buffer[] = []; res.on("data", (x: Buffer) => c.push(x)); res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(c) })); });
  req.on("error", reject); req.end();
});
type Copy = { id: string; status: string; locked: { kind: string } | null; out_of_date: boolean; stale: boolean; changed: string[]; counts: { written: number; not_written: number } | null; intact: boolean | null };
type Form = { form: string; subject_id: string; person: string; draft: { written_now: number; mapped: number; unconfirmed: number }; readiness: { ready: boolean; missing: { fact: string }[] }; copies: Copy[] };

async function main() {
  const vv = sql("select id from combination where combination_key='vv.single'");
  if (!vv) { console.log("Run setup_visitor_visa.ts first."); process.exitCode = 2; return; }
  const open = async (ref: string) => (await call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: CLIENT, principal: { displayName: "Sample Applicant D" } }, OFFICER)).body;
  const c = await open(`R1D-${run}`), caseId: string = c.id;
  const P: string = c.people.find((p: { role: string }) => p.role === "principal").subject_id;
  const spouse = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse D" }, OFFICER)).body.subject_id as string;
  const agent = async () => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body;
  const answer = async (subject: string, fact: string, value: unknown, actor = OFFICER) => {
    const v = await agent(); const q = v.sections.flatMap((s: { questions: { subjectId: string; fact: string; answer: { id: string } | null }[] }) => s.questions).find((x: { subjectId: string; fact: string }) => x.subjectId === subject && x.fact === fact);
    return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId: q?.answer?.id ?? null }, actor);
  };
  const confirmAll = async (subject: string) => { const v = await agent(); for (const s of v.sections.filter((x: { subjectId: string }) => x.subjectId === subject)) { const seen = s.questions.flatMap((q: { answer: { id: string } | null; rows: { answer: { id: string } | null }[] }) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]).filter(Boolean); if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${s.section}/confirm`, { subjectId: subject, seen }, OFFICER); } };
  for (const [s, f, v] of [[P, "person.family_name", "SAMPLED"], [P, "person.given_names", "APPLICANT"], [P, "person.date_of_birth", "1990-04-13"], [P, "person.passport_number", "SAMPLEP123"], [spouse, "person.family_name", "SAMPLES"], [spouse, "person.date_of_birth", "1991-05-14"]] as const) await answer(s, f, v);
  await confirmAll(P); await confirmAll(spouse);
  await answer(P, "person.other_family_name", "SAMPLE-UNCONFIRMED", CLIENT); // a client field the client answered: counts as confirmed (principal)
  await answer(spouse, "person.marital_status", "married", CLIENT);          // the principal for an adult spouse: not confirmed (P-78)
  const forms = async (actor = OFFICER) => call("GET", `/runtime/cases/${caseId}/forms`, undefined, actor);
  const formOf = async (form: string, subject: string): Promise<Form> => (await forms()).body.forms.find((f: Form) => f.form === form && f.subject_id === subject);

  // ── RT-12 roles on forms
  ok("roles fail: the client, another client and configuration people cannot see or make copies (403/404); a malformed id is 404", (await forms(CLIENT)).status === 403 && (await forms(CLIENT_B)).status === 403 && (await forms(AUTHOR)).status === 403
    && (await call("GET", "/runtime/cases/not-a-case/forms", undefined, OFFICER)).status === 404 && (await call("GET", "/runtime/form-copies/abc", undefined, OFFICER)).status === 404);
  ok("roles fail: the client cannot generate a copy (403)", (await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, {}, CLIENT)).status === 403);

  // ── RT-13 generate: confirmed facts only, through the shared filler, as a job
  let f = await formOf("IMM 5257", P);
  ok("RT-13 pass: the draft says how many form fields a copy made now writes, from confirmed facts only", !!f && f.draft.written_now >= 4 && f.draft.mapped > f.draft.written_now, f?.draft);
  let r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-1` }, OFFICER);
  ok("RT-13 pass: generating is a job: accepted (202) and queued, not written inside the request", r.status === 202 && r.body.status === "QUEUED", r.body);
  const first: string = r.body.id;
  const done = (id: string) => until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${id}`, undefined, OFFICER)).body?.status));
  ok("RT-13 pass: the copy is generated, read back and checked (intact)", await done(first) && (await call("GET", `/runtime/form-copies/${first}`, undefined, OFFICER)).body.intact === true);
  const row = JSON.parse(sql(`select json_build_object('path', path, 'sha', sha256, 'result', result_json, 'facts', (select facts_json from answer_snapshot where id = snapshot_id)) from form_instance where id='${first}'`));
  const written = (row.result.boxes as { fact: string | null; result: string }[]).filter((b) => b.result === "written").map((b) => b.fact);
  ok("RT-13 pass: exactly the confirmed facts were written (principal's names, birth date, passport; the application's facts)", ["person.family_name", "person.given_names", "person.date_of_birth", "person.passport_number"].every((x) => written.includes(x)) && row.facts.facts.length === row.result.counts.written + row.result.counts.by_hand + row.result.counts.blank, { written: written.length, facts: row.facts.facts.length });
  ok("RT-13 fail (P-72): the spouse's marital status answered by the principal is not confirmed, so the spouse's copy would not write it", (await formOf("IMM 5257", spouse)).draft.unconfirmed >= 1);
  ok("RT-13 pass: the file on disk is the one recorded (sha256), and only the officer downloads it", await (async () => { const d = await bytes(`/runtime/form-copies/${first}/file`, OFFICER); return d.status === 200 && sha(d.body) === row.sha && sha(readFileSync(join(ROOT, row.path))) === row.sha && d.body.subarray(0, 5).toString() === "%PDF-"; })() && (await bytes(`/runtime/form-copies/${first}/file`, CLIENT)).status === 403);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-1` }, OFFICER);
  ok("RT-13 pass: the same key again answers with the same copy (nothing new)", r.body.id === first && r.body.created === false && sql(`select count(*) from form_instance where case_id='${caseId}'`) === "1");
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${spouse}/generate`, { idempotencyKey: `gen-${run}-1` }, OFFICER);
  ok("RT-13 fail: the same key for another person is refused (409)", r.status === 409, r.body?.detail);
  const twice = await Promise.all([0, 1].map(() => call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${spouse}/generate`, { idempotencyKey: `gen-${run}-2` }, OFFICER)));
  ok("RT-13 pass: two simultaneous presses with one key make one copy", twice.every((x) => x.status === 202 && x.body.id === twice[0].body.id) && sql(`select count(*) from form_instance where case_id='${caseId}' and subject_id='${spouse}'`) === "1", twice.map((x) => x.status));
  const spouseCopy: string = twice[0].body.id; await done(spouseCopy);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%209999/${P}/generate`, {}, OFFICER);
  ok("RT-13 fail: a form with no PDF in the case's release is refused (404), nothing queued", r.status === 404, r.body?.detail);

  // ── RT-14 ready to file (P-71)
  f = await formOf("IMM 5257", P);
  ok("RT-14 fail: with required facts unconfirmed, IMM 5257 is not ready to file and they are listed", !f.readiness.ready && f.readiness.missing.length > 0, f.readiness.missing.length);

  // ── RT-16 lock, before anything changes
  r = await call("POST", `/runtime/form-copies/${first}/lock`, { kind: "filed" }, CLIENT);
  ok("RT-16 fail: the client cannot lock a copy (403)", r.status === 403, r.status);
  r = await call("POST", `/runtime/form-copies/${first}/lock`, { kind: "printed" }, OFFICER);
  ok("RT-16 fail: an unknown lock kind is a 400 in plain words", r.status === 400 && /validated copy uploaded back, or filed/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/form-copies/${first}/lock`, { kind: "validated_copy_uploaded" }, OFFICER);
  ok("RT-16 pass: the officer locks an up-to-date generated copy (\"validated copy uploaded back\")", r.status === 201 && r.body.locked?.kind === "validated_copy_uploaded", r.body);
  r = await call("POST", `/runtime/form-copies/${first}/lock`, { kind: "filed" }, OFFICER);
  ok("RT-16 fail: a locked copy cannot be locked again (409)", r.status === 409, r.body?.detail);
  const dbRefuses = (q: string) => { try { sql(q); return false; } catch { return true; } };
  ok("RT-16 fail (database): a locked copy's file, hash, result or lock cannot be changed; a generated copy cannot be rewritten or moved back; the facts a copy read cannot change",
    dbRefuses(`update form_instance set path='x' where id='${first}'`) && dbRefuses(`update form_instance set locked_kind='filed' where id='${first}'`)
    && dbRefuses(`update form_instance set sha256='x' where id='${spouseCopy}'`) && dbRefuses(`update form_instance set status='QUEUED' where id='${spouseCopy}'`)
    && dbRefuses(`update answer_snapshot set facts_json='[]' where id=(select snapshot_id from form_instance where id='${spouseCopy}')`));

  // ── RT-15 out of date and stale; never regenerated on its own
  const before = sql(`select count(*) from form_instance where case_id='${caseId}'`);
  await answer(P, "person.passport_number", "SAMPLEP999");
  await confirmAll(P);
  f = await formOf("IMM 5257", P);
  const locked = f.copies.find((x) => x.id === first)!;
  ok("RT-15/16 pass: after the passport number changes, the locked copy is stale and names the fact; its file and row are unchanged", locked.stale && locked.out_of_date && locked.changed.some((x) => /passport/i.test(x)) && sha(readFileSync(join(ROOT, row.path))) === row.sha && sql(`select sha256 from form_instance where id='${first}'`) === row.sha, locked);
  ok("RT-15 pass: nothing was regenerated on its own (a new copy only on the officer's request)", sql(`select count(*) from form_instance where case_id='${caseId}'`) === before);
  ok("RT-15 fail-guard: the spouse's copy, whose facts did not change, is not out of date", !(await formOf("IMM 5257", spouse)).copies[0].out_of_date);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-3` }, OFFICER);
  const second: string = r.body.id; await done(second);
  f = await formOf("IMM 5257", P);
  ok("RT-15 pass: a new copy is a new row with today's facts, up to date; the locked one stays stale and unchanged", f.copies[0].id === second && !f.copies[0].out_of_date && f.copies.find((x) => x.id === first)!.stale && sql(`select count(*) from form_instance where case_id='${caseId}' and subject_id='${P}'`) === "2");
  await answer(P, "person.given_names", "APPLICANTE"); await confirmAll(P);
  r = await call("POST", `/runtime/form-copies/${second}/lock`, { kind: "filed" }, OFFICER);
  ok("RT-16 fail: an out-of-date copy cannot be locked (409): generate a new one first", r.status === 409 && /out of date/.test(r.body?.detail ?? ""), r.body?.detail);

  // ── RT-17 audit without values
  const audit = sql(`select coalesce(string_agg(summary || ' ' || coalesce(detail::text, ''), ' '), '') from audit_event where entity = 'form copy'`);
  ok("RT-17 pass: queued, generated and locked copies are in the audit trail", /asked for a new copy of IMM 5257/.test(audit) && /generated: \d+ form fields written/.test(audit) && /locked copy/.test(audit));
  ok("RT-17 fail-guard: no answer value or typed name appears in the audit of copies", !["SAMPLED", "SAMPLEP123", "SAMPLEP999", "APPLICANTE", "1990-04-13", "Sample Applicant D", "Sample Spouse D"].some((x) => audit.includes(x)));
  process.exitCode = summary() ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
