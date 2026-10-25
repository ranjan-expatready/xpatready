// R1d checks (runtime lane, plan §8 RT-13…RT-17): a case's IMM 5257 filled from confirmed facts only, through the
// shared filler (read back, signatures checked); a new copy only when the officer asks; out of date and stale after a
// fact changes; a locked copy never changes (service and database); audit without values. Every rule with a passing and
// a failing case, on an isolated copy where setup_visitor_visa.ts released the visitor visa. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
//   tsx studio/tests/runtime/check_runtime_r1d.ts 4430 xr_studio_runtime_r1
import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, readFileSync, renameSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { request } from "node:http";
import { join } from "node:path";
import { client, recorder } from "./api.ts";
import { trialPassed } from "../../api/src/fill-case.ts";

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
type Copy = { id: string; status: string; locked: { kind: string } | null; out_of_date: boolean; stale: boolean; changed: string[]; counts: { written: number; not_written: number } | null; intact: boolean | null; file_ok: boolean };
type Q = { subjectId: string; fact: string; value_type: string; shape: { datePrecision: string; phone: boolean }; options: { key: string }[] | null; required: boolean; hidden: boolean; group: string | null; fills: { form: string; person: string }[]; answer: { confirmed: boolean } | null };
type Form = { form: string; subject_id: string; applies: boolean; person: string; draft: { written_now: number; mapped: number; unconfirmed: number }; readiness: { ready: boolean; missing: { fact: string; reason: string }[] }; copies: Copy[] };

async function main() {
  const vv = sql("select id from combination where combination_key='vv.single'");
  if (!vv) { console.log("Run setup_visitor_visa.ts first."); process.exitCode = 2; return; }
  const open = async (ref: string) => (await call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: CLIENT, principal: { displayName: "Sample Applicant D" } }, OFFICER)).body;
  const c = await open(`R1D-${run}`), caseId: string = c.id;
  const P: string = c.people.find((p: { role: string }) => p.role === "principal").subject_id;
  const caseSubject: string = c.people.find((p: { role: string }) => p.role === "case").subject_id;
  const spouse = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse D" }, OFFICER)).body.subject_id as string;
  const agent = async () => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body;
  const answer = async (subject: string, fact: string, value: unknown, actor = OFFICER) => {
    const v = await agent(); const q = v.sections.flatMap((s: { questions: { subjectId: string; fact: string; answer: { id: string } | null }[] }) => s.questions).find((x: { subjectId: string; fact: string }) => x.subjectId === subject && x.fact === fact);
    return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId: q?.answer?.id ?? null }, actor);
  };
  const confirmAll = async (subject: string) => { const v = await agent(); for (const s of v.sections.filter((x: { subjectId: string }) => x.subjectId === subject)) { const seen = [...s.questions.flatMap((q: { answer: { id: string } | null; rows: { answer: { id: string } | null }[] }) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter(Boolean); if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${s.section}/confirm`, { subjectId: subject, seen }, OFFICER); } };
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

  // ── Lead answer to break M3 (P-71/P-72): a required repeating group with no entries blocks until "none apply" is
  // answered and confirmed for it; "none apply" is a fact like any other.
  type G = { subjectId: string; section: string; group: { required: boolean; client: boolean; rows: number; none_apply: { id: string; value: boolean; confirmed: boolean; status: string } | null } | null };
  const blockedGroups = (x: Form) => x.readiness.missing.filter((m) => m.fact.startsWith("group:")).map((m) => m.fact.slice(6));
  const groupsP = blockedGroups(f);
  ok("M3 fail: IMM 5257 for the principal is blocked by its required groups with no entries, each named and \"not answered\"", groupsP.length >= 2 && f.readiness.missing.filter((m) => m.fact.startsWith("group:")).every((m) => m.reason === "not answered"), groupsP);
  const sqrGroups = async (actor = CLIENT): Promise<G[]> => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, actor)).body.sections as G[]).filter((x) => x.subjectId === P && x.group);
  const gc = (await sqrGroups()).find((x) => groupsP.includes(x.section) && x.group!.client)!.section;
  const put = (g: string, noneApply: boolean, expectedId: string | null, actor = CLIENT, subject = P) => call("PUT", `/runtime/cases/${caseId}/groups/${subject}/${g}/none-apply`, { noneApply, expectedId }, actor);
  r = await put(gc, true, null);
  ok("M3 pass (P-72): the principal says none apply on their own questionnaire; it counts as confirmed", r.status === 200 && r.body.saved === true && r.body.group?.none_apply?.value === true && r.body.group.none_apply.confirmed === true, r.body);
  const naId: string = r.body.group?.none_apply?.id;
  r = await put(gc, true, naId);
  ok("M3 pass: the same answer again saves nothing new", r.status === 200 && r.body.saved === false && sql(`select count(*) from client_group_answer where subject_id='${P}' and group_key='${gc}'`) === "1", r.body);
  r = await put(gc, false, null);
  ok("M3 fail: an answer based on an older view (expectedId) is refused (409), nothing saved", r.status === 409 && /same moment/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: gc }, CLIENT);
  ok("M3 fail: an entry is not added beside \"none apply\" (409, change it first)", r.status === 409 && /change it to "entries apply" first/.test(r.body?.detail ?? ""), r.body?.detail);
  f = await formOf("IMM 5257", P);
  ok("M3 pass: with none apply confirmed, that group no longer blocks IMM 5257; the others still do", !blockedGroups(f).includes(gc) && blockedGroups(f).length === groupsP.length - 1, blockedGroups(f));
  // Entries apply after all: the change back is a new version; entries may be added; none apply is refused beside them.
  r = await put(gc, false, naId);
  const back: string = r.body.group?.none_apply?.id;
  const entry = await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: gc }, CLIENT);
  r = await put(gc, true, back);
  ok("M3 pass/fail: \"entries apply\" is saved as a new version; an entry can then be added, and none apply is refused while it exists (409)", !!back && back !== naId && entry.status === 201 && r.status === 409 && /has 1 entry; remove it first/.test(r.body?.detail ?? ""), { back: !!back, row: entry.status, again: r.body?.detail });
  await call("DELETE", `/runtime/cases/${caseId}/groups/${P}/rows/${entry.body.row}`, undefined, CLIENT);
  r = await put(gc, true, back);
  ok("M3 pass: with the entry removed, none apply is said again (history kept: three versions)", r.status === 200 && r.body.group?.none_apply?.value === true && sql(`select count(*) from client_group_answer where subject_id='${P}' and group_key='${gc}'`) === "3", r.body?.detail ?? r.status);
  // The officer's "none apply" waits for Confirm section, and is confirmed only when seen (never unseen).
  const go = groupsP.find((x) => x !== gc)!;
  r = await put(go, true, null, OFFICER);
  const goId: string = r.body.group?.none_apply?.id;
  f = await formOf("IMM 5257", P);
  ok("M3 fail (P-72): none apply entered by the officer is \"not confirmed\" until Confirm section", r.body.group?.none_apply?.confirmed === false && f.readiness.missing.some((m) => m.fact === `group:${go}` && m.reason === "not confirmed"), f.readiness.missing.filter((m) => m.fact.startsWith("group:")));
  r = await call("POST", `/runtime/cases/${caseId}/sections/${go}/confirm`, { subjectId: P, seen: [] }, OFFICER);
  ok("M3 fail: Confirm section without having seen the group's answer is refused (409) and names it", r.status === 409 && (r.body?.changed ?? []).includes(`group:${go}`), r.body);
  r = await call("POST", `/runtime/cases/${caseId}/sections/${go}/confirm`, { subjectId: P, seen: [goId] }, OFFICER);
  f = await formOf("IMM 5257", P);
  ok("M3 pass: with it seen, Confirm section confirms it (VERIFIED, a new version) and the group no longer blocks", r.status === 201 && r.body.confirmed >= 1 && !blockedGroups(f).includes(go) && sql(`select status from client_group_answer where subject_id='${P}' and group_key='${go}' and superseded_by_id is null`) === "VERIFIED", r.body);
  // Refusals in plain words, and the database rule.
  const bad = await put(gc, "yes" as unknown as boolean, null);
  const otherClient = await put(gc, true, null, CLIENT_B), noGroup = await put("no_such_group", true, null), caseGroup = await put(groupsP.find((g) => g === "your_visit") ?? gc, true, null, OFFICER);
  ok("M3 fail: a body that is not true or false is a 400 in plain words; another client cannot reach the case (404, as every case route); no such group 404; a group of the application asked for a person 422",
    bad.status === 400 && /none apply \(true\) or entries apply \(false\)/.test(JSON.stringify(bad.body)) && otherClient.status === 404 && noGroup.status === 404 && /no repeating group/.test(noGroup.body?.detail ?? "") && (!groupsP.includes("your_visit") || caseGroup.status === 422), { bad: bad.status, otherClient: otherClient.status, noGroup: noGroup.body?.detail, caseGroup: caseGroup.status });
  ok("M3 fail (database): a group answer is never changed in place", (() => { try { sql(`update client_group_answer set none_apply = false where subject_id='${P}' and group_key='${go}'`); return false; } catch (e) { return /append_only/.test((e as Error).message); } })());
  // P-78 (review m7): the principal's "none apply" for the adult spouse is "answered by the principal", not confirmed.
  const spouseGroup = ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, CLIENT)).body.sections as G[]).find((x) => x.subjectId === spouse && x.group?.client && x.group.rows === 0)!;
  r = await put(spouseGroup.section, true, null, CLIENT, spouse);
  ok("review m7 pass (P-78): the principal says none apply for the adult spouse: saved, \"answered by the principal\", not confirmed", r.status === 200 && r.body.group?.none_apply?.confirmed === false && /principal/.test(r.body.group?.none_apply?.why ?? ""), r.body?.group?.none_apply);
  // review m6: with entries, the group's earlier "entries apply" answers nothing; Confirm section neither needs nor confirms it.
  const withEntry = (await sqrGroups()).find((x) => x.section !== gc && x.section !== go && x.group!.rows === 0)!.section;
  const na1 = await put(withEntry, true, null, OFFICER);
  const ea = await put(withEntry, false, na1.body.group?.none_apply?.id ?? null, OFFICER);
  const e1 = await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: withEntry }, OFFICER);
  r = await call("POST", `/runtime/cases/${caseId}/sections/${withEntry}/confirm`, { subjectId: P, seen: [] }, OFFICER);
  const r2 = await call("POST", `/runtime/cases/${caseId}/sections/${withEntry}/confirm`, { subjectId: P, seen: [ea.body.group?.none_apply?.id] }, OFFICER);
  ok("review m6 pass: with an entry in the group, Confirm section neither asks for the hidden \"entries apply\" answer nor refuses it when sent; it stays as it was", ea.status === 200 && ea.body.saved === true && e1.status === 201 && r.status === 201 && r2.status === 201 && sql(`select status from client_group_answer where subject_id='${P}' and group_key='${withEntry}' and superseded_by_id is null`) === "DECLARED", r.body?.detail ?? r.body);
  await call("DELETE", `/runtime/cases/${caseId}/groups/${P}/rows/${e1.body.row}`, undefined, OFFICER);
  ok("M3 pass: the audit records none apply without names or values", /recorded that no entries apply in /.test(sql(`select coalesce(string_agg(summary, ' '), '') from audit_event where entity = 'group'`)));

  // ── P-71 (Lead, R1d early look): a copy is locked only when its form is ready to file (a copy made now: the
  // first one is out of date after the groups above changed)
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-p71` }, OFFICER);
  const p71: string = r.body.id; await done(p71);
  r = await call("POST", `/runtime/form-copies/${p71}/lock`, { kind: "filed" }, OFFICER);
  ok("P-71 fail: a copy of a form not ready to file cannot be filed or locked (409), with the reason", r.status === 409 && /facts? to answer or confirm before filing: do that, then generate a new copy/.test(r.body?.detail ?? ""), r.body?.detail);
  // Confirm every required fact IMM 5257 reads for the principal (Sample values by type), then make a new copy.
  const sample = (q: { value_type: string; shape: { datePrecision: string; phone: boolean }; options: { key: string }[] | null; fact: string }) => q.options?.length ? q.options[0].key : q.shape.phone ? { country_code: "1", number: "5550100" }
    : q.value_type === "yes_no" ? false : q.value_type === "date" ? (q.shape.datePrecision === "month" ? "1990-01" : "1990-01-01") : q.value_type === "number" ? "1000"
    : q.value_type === "address" ? { street_name: "Sample Road", city: "Sample City", country: "Canada" } : /email/.test(q.fact) ? "client.d@example.com" : "SAMPLE";
  const makeReady = async (subject: string, form: string) => {
    for (let pass = 0; pass < 3; pass++) {
      const f0 = await formOf(form, subject); if (f0.readiness.ready) return true;
      const v = await agent();
      const todo = v.sections.flatMap((x: { questions: Q[] }) => x.questions).filter((q: Q) => q.required && !q.hidden && !q.group && q.fills.some((x) => x.form === form && x.person === f0.person) && !q.answer?.confirmed);
      for (const q of todo) await answer(q.subjectId, q.fact, sample(q));
      // A required group with no entries (Lead, break M3): "none apply", then Confirm section.
      const groups = f0.readiness.missing.filter((m) => m.fact.startsWith("group:")).map((m) => m.fact.slice(6));
      // A group asked once for the application (the visit) is answered for the case, not the person.
      const secs = groups.map((g) => v.sections.find((x: { subjectId: string; section: string; group: unknown }) => x.section === g && x.group && (x.subjectId === subject || x.subjectId === caseSubject)));
      for (const sec of secs) if (sec) await call("PUT", `/runtime/cases/${caseId}/groups/${sec.subjectId}/${sec.section}/none-apply`, { noneApply: true, expectedId: sec.group?.none_apply?.id ?? null }, OFFICER);
      for (const subj of [...new Set([...todo.map((q: Q) => q.subjectId), ...secs.filter(Boolean).map((x: { subjectId: string }) => x.subjectId)])] as string[]) await confirmAll(subj);
    }
    return (await formOf(form, subject)).readiness.ready;
  };
  ok("P-71 pass: with every required fact confirmed, IMM 5257 for the principal is ready to file", await makeReady(P, "IMM 5257"));
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-ready` }, OFFICER);
  const locked1: string = r.body.id; await done(locked1);
  const row1 = JSON.parse(sql(`select json_build_object('path', path, 'sha', sha256) from form_instance where id='${locked1}'`));
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${spouse}/generate`, { idempotencyKey: `gen-${run}-spouse2` }, OFFICER);
  const spouse2: string = r.body.id; await done(spouse2);

  // ── RT-16 lock, before anything changes
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "filed" }, CLIENT);
  ok("RT-16 fail: the client cannot lock a copy (403)", r.status === 403, r.status);
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "printed" }, OFFICER);
  ok("RT-16 fail: an unknown lock kind is a 400 in plain words", r.status === 400 && /validated copy uploaded back, or filed/.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "validated_copy_uploaded" }, OFFICER);
  ok("RT-16 pass: the officer locks an up-to-date generated copy (\"validated copy uploaded back\")", r.status === 201 && r.body.locked?.kind === "validated_copy_uploaded", r.body);
  r = await call("POST", `/runtime/form-copies/${locked1}/lock`, { kind: "filed" }, OFFICER);
  ok("RT-16 fail: a locked copy cannot be locked again (409)", r.status === 409, r.body?.detail);
  const dbRefuses = (q: string) => { try { sql(q); return false; } catch { return true; } };
  ok("RT-16 fail (database): a locked copy's file, hash, result or lock cannot be changed; a generated copy cannot be rewritten or moved back; the facts a copy read cannot change",
    dbRefuses(`update form_instance set path='x' where id='${locked1}'`) && dbRefuses(`update form_instance set locked_kind='filed' where id='${locked1}'`)
    && dbRefuses(`update form_instance set sha256='x' where id='${spouseCopy}'`) && dbRefuses(`update form_instance set status='QUEUED' where id='${spouseCopy}'`)
    && dbRefuses(`update answer_snapshot set facts_json='[]' where id=(select snapshot_id from form_instance where id='${spouseCopy}')`));

  // ── RT-15 out of date and stale; never regenerated on its own
  const before = sql(`select count(*) from form_instance where case_id='${caseId}'`);
  await answer(P, "person.passport_number", "SAMPLEP999");
  await confirmAll(P);
  f = await formOf("IMM 5257", P);
  const locked = f.copies.find((x) => x.id === locked1)!;
  ok("RT-15/16 pass: after the passport number changes, the locked copy is stale and names the fact; its file and row are unchanged", locked.stale && locked.out_of_date && locked.changed.some((x) => /passport/i.test(x)) && sha(readFileSync(join(ROOT, row1.path))) === row1.sha && sql(`select sha256 from form_instance where id='${locked1}'`) === row1.sha, locked);
  ok("RT-15 pass: nothing was regenerated on its own (a new copy only on the officer's request)", sql(`select count(*) from form_instance where case_id='${caseId}'`) === before);
  ok("RT-15 fail-guard: the spouse's copy, whose facts did not change, is not out of date", !(await formOf("IMM 5257", spouse)).copies.find((x) => x.id === spouse2)!.out_of_date);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-3` }, OFFICER);
  const second: string = r.body.id; await done(second);
  f = await formOf("IMM 5257", P);
  ok("RT-15 pass: a new copy is a new row with today's facts, up to date; the locked one stays stale and unchanged", f.copies[0].id === second && !f.copies[0].out_of_date && f.copies.find((x) => x.id === locked1)!.stale && sql(`select count(*) from form_instance where case_id='${caseId}' and subject_id='${P}'`) === "4");
  await answer(P, "person.given_names", "APPLICANTE"); await confirmAll(P);
  r = await call("POST", `/runtime/form-copies/${second}/lock`, { kind: "filed" }, OFFICER);
  ok("RT-16 fail: an out-of-date copy cannot be locked (409): generate a new one first", r.status === 409 && /out of date/.test(r.body?.detail ?? ""), r.body?.detail);

  // ── RT-17 audit without values
  const audit = sql(`select coalesce(string_agg(summary || ' ' || coalesce(detail::text, ''), ' '), '') from audit_event where entity = 'form copy'`);
  ok("RT-17 pass: queued, generated and locked copies are in the audit trail", /asked for a new copy of IMM 5257/.test(audit) && /generated: \d+ form fields written/.test(audit) && /locked copy/.test(audit));
  ok("RT-17 fail-guard: no answer value or typed name appears in the audit of copies", !["SAMPLED", "SAMPLEP123", "SAMPLEP999", "APPLICANTE", "1990-04-13", "Sample Applicant D", "Sample Spouse D"].some((x) => audit.includes(x)));

  // ── CHECK → FIX (review-r1d.md, break-report-r1d.md): each fix with a test
  const refusedWith = (q: string, why: RegExp) => { try { sql(q); return false; } catch (e) { return why.test((e as Error).message); } };
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%20%3Cb%3Ex%3C%2Fb%3E/${P}/generate`, {}, OFFICER);
  ok("break m6 fail: a malformed form name is 404 and never echoed back", r.status === 404 && !/<b>/.test(JSON.stringify(r.body)), r.body?.detail);
  r = await call("POST", `/runtime/form-copies/${second}/lock`, { kind: "printed" }, CLIENT);
  ok("break m4 fail: the client sending a wrong lock kind is told 403 (who may lock), not 400 (what was sent)", r.status === 403, r.status);
  ok("break M5 fail (database): a copy and the facts it read cannot be deleted while their case exists",
    refusedWith(`delete from form_instance where id='${spouseCopy}'`, /runtime_copy_no_delete/) && refusedWith(`delete from answer_snapshot where id=(select snapshot_id from form_instance where id='${spouseCopy}')`, /runtime_copy_no_delete/));
  ok("break M5 fail (database): a copy cannot be inserted already generated (it starts queued and empty)",
    refusedWith(`insert into form_instance (id, workspace_id, case_id, subject_id, form_number, config_release_id, snapshot_id, status, path, created_by) select gen_random_uuid(), workspace_id, case_id, subject_id, form_number, config_release_id, snapshot_id, 'GENERATED', 'x.pdf', created_by from form_instance where id='${spouseCopy}'`, /runtime_form_instance_insert/));
  ok("break m5 fail (database): a copy keeps its workspace, and a lock cannot be backdated",
    refusedWith(`update form_instance set workspace_id=gen_random_uuid() where id='${spouse2}'`, /keeps what it is a copy of/)
    && refusedWith(`update form_instance set locked_kind='filed', locked_at=now() - interval '1 day', locked_by='user-O' where id='${spouse2}'`, /stamped when it is made/));
  // The file: missing (break m1), outside the working files (break m5), changed on disk.
  const p2 = join(ROOT, sql(`select path from form_instance where id='${second}'`)), aside = `${p2}.aside`;
  renameSync(p2, aside);
  const missingOk = (await bytes(`/runtime/form-copies/${second}/file`, OFFICER)).status === 404 && (await formOf("IMM 5257", P)).copies.find((x) => x.id === second)!.file_ok === false;
  const outside = join(tmpdir(), `r1d-${run}.pdf`); copyFileSync(aside, outside); symlinkSync(outside, p2);
  const outsideOk = (await bytes(`/runtime/form-copies/${second}/file`, OFFICER)).status === 409;
  rmSync(p2); rmSync(outside); renameSync(aside, p2);
  ok("break m1 fail: a copy whose file is missing is 404 to download and shows \"file missing\" (file_ok false)", missingOk);
  ok("break m5 fail: a copy's file that leads outside the working files (a link) is not handed over (409), even with the same bytes", outsideOk);
  ok("break m1 pass: with its file back, the copy downloads again", (await bytes(`/runtime/form-copies/${second}/file`, OFFICER)).status === 200);
  // A person marked not travelling keeps their copies in view (break M4); no new copy for them.
  await call("PATCH", `/runtime/cases/${caseId}/people/${spouse}`, { applies: false }, OFFICER);
  f = await formOf("IMM 5257", spouse);
  r = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${spouse}/generate`, { idempotencyKey: `gen-${run}-gone` }, OFFICER);
  ok("break M4 pass: a person marked not travelling still shows the form with its copies, marked as no longer applying; a new copy is refused (422)", !!f && f.applies === false && f.copies.length === 2 && r.status === 422, { applies: f?.applies, copies: f?.copies.length, status: r.status });
  await call("PATCH", `/runtime/cases/${caseId}/people/${spouse}`, { applies: true }, OFFICER);
  // One case cannot fill the queue (break m6), counted under a lock on the case (PR #12 review 3): six simultaneous
  // presses with distinct keys give at most five copies; the others are 429 in plain words.
  const burst: { status: number; body: { id?: string; detail?: string } }[] = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `gen-${run}-burst-${i}` }, OFFICER)));
  const accepted = burst.filter((x) => x.status === 202);
  ok("break m6 / PR #12 review 3 fail: six simultaneous presses with distinct keys make at most 5 copies; the rest are 429 in plain words",
    accepted.length <= 5 && burst.every((x) => x.status === 202 || (x.status === 429 && /being generated; wait for them/.test(x.body.detail ?? ""))) && burst.some((x) => x.status === 429)
    && Number(sql(`select count(*) from form_instance where case_id='${caseId}' and idempotency_key like 'gen-${run}-burst-%'`)) === accepted.length, burst.map((x) => x.status));
  for (const x of accepted) await done(x.body.id!);
  // PR #12 review 2: only the file that was made is locked: a missing or changed file is refused (409), the copy stays unlocked.
  const lockMe = accepted[0].body.id!, pl = join(ROOT, sql(`select path from form_instance where id='${lockMe}'`)), keep = `${pl}.keep`;
  copyFileSync(pl, keep); rmSync(pl);
  const lockMissing = await call("POST", `/runtime/form-copies/${lockMe}/lock`, { kind: "filed" }, OFFICER);
  copyFileSync(keep, pl); appendFileSync(pl, "%changed");
  const lockChanged = await call("POST", `/runtime/form-copies/${lockMe}/lock`, { kind: "filed" }, OFFICER);
  copyFileSync(keep, pl); rmSync(keep);
  ok("PR #12 review 2 fail: a copy whose file is missing cannot be locked (409 in plain words)", lockMissing.status === 409 && /missing from the working files/.test(lockMissing.body?.detail ?? ""), lockMissing.body?.detail);
  ok("PR #12 review 2 fail: a copy whose file changed on disk cannot be locked (409 in plain words); it stays unlocked", lockChanged.status === 409 && /changed on disk/.test(lockChanged.body?.detail ?? "") && sql(`select locked_at is null from form_instance where id='${lockMe}'`) === "t", lockChanged.body?.detail);
  r = await call("POST", `/runtime/form-copies/${lockMe}/lock`, { kind: "filed" }, OFFICER);
  ok("PR #12 review 2 pass: with its file as it was made, the same copy locks", r.status === 201 && r.body.locked?.kind === "filed", r.body?.detail ?? r.status);

  // break r1d-none-apply M1: a filed copy goes stale when a "none apply" it read is withdrawn, and not when it is said again.
  const naNow = async (g: string) => (await sqrGroups()).find((x) => x.section === g)!.group!.none_apply;
  await put(gc, false, (await naNow(gc))!.id);
  const staleCopy = (await formOf("IMM 5257", P)).copies.find((x) => x.id === lockMe)!;
  await put(gc, true, (await naNow(gc))!.id);
  const backCopy = (await formOf("IMM 5257", P)).copies.find((x) => x.id === lockMe)!;
  ok("break M1 fail/pass: withdrawing a confirmed none apply makes the filed copy stale, naming the group; saying it again (confirmed) makes it current again",
    staleCopy.stale && staleCopy.changed.some((x) => /^Entries in "/.test(x)) && !backCopy.stale && !backCopy.out_of_date, { stale: staleCopy.changed, back: backCopy.changed });
  // break m1, m4, m5: nothing new saved for "entries apply" said first or the same answer from an older view; a rule refusal is not "changed by someone else".
  const fresh = ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, CLIENT)).body.sections as G[]).find((x) => x.subjectId === spouse && x.group && !x.group.none_apply && x.section !== spouseGroup.section)!;
  const firstFalse = await put(fresh.section, false, null, CLIENT, spouse), staleSame = await put(gc, true, null);
  const e2 = await call("POST", `/runtime/cases/${caseId}/groups/${P}/rows`, { group: gc }, CLIENT);
  ok("break m1/m5/m4: \"entries apply\" said first saves nothing; the same answer from an older view saves nothing (200, not 409); a rule refusal is titled \"Not possible now\"",
    firstFalse.status === 200 && firstFalse.body.saved === false && sql(`select count(*) from client_group_answer where subject_id='${spouse}' and group_key='${fresh.section}'`) === "0"
    && staleSame.status === 200 && staleSame.body.saved === false && e2.status === 409 && e2.body?.title === "Not possible now", { firstFalse: firstFalse.body?.saved, staleSame: staleSame.status, e2: e2.body?.title });
  r = await call("POST", `/runtime/cases/${caseId}/sections/${go}/confirm`, { subjectId: P, seen: [(await naNow(gc))!.id] }, OFFICER);
  ok("break m2: Confirm section names a group only for its own changed answer, never for an id of another group", r.status === 409 && !(r.body?.changed ?? []).includes(`group:${go}`), r.body?.changed);

  // PR #12 review 1: a form the release files Online is not offered as a PDF, even when its PDF form field map exists.
  // Fixture: a copy of this release whose IMM 5257 filing line is Online, pinned by a new case, then moved below the
  // real release (version -1) so later suites keep opening cases on the real one.
  const rel = JSON.parse(sql(`select json_build_object('id', id, 'v', version) from config_release where combination_id='${vv}' order by version desc limit 1`));
  const cols = sql(`select string_agg(quote_ident(column_name), ',' order by ordinal_position) from information_schema.columns where table_name='config_release'`).split(",");
  const pick = cols.map((c) => c === "id" ? "gen_random_uuid()" : c === "version" ? `${rel.v + 1}` : c === "snapshot"
    ? `jsonb_set(snapshot, '{forms}', (select jsonb_agg(case when f->>'form_number' = 'IMM 5257' then f || '{"channel":"ONLINE"}' else f end) from jsonb_array_elements(snapshot->'forms') f))` : c);
  const onlineRel = sql(`insert into config_release (${cols.join(",")}) select ${pick.join(",")} from config_release where id='${rel.id}' returning id`).split("\n")[0];
  const oc = await open(`R1D-ONLINE-${run}`);
  sql(`update config_release set version = -1 where id='${onlineRel}'`);
  const oP: string = oc.people.find((p: { role: string }) => p.role === "principal").subject_id;
  const ol = (await call("GET", `/runtime/cases/${oc.id}/forms`, undefined, OFFICER)).body.forms as Form[];
  r = await call("POST", `/runtime/cases/${oc.id}/forms/IMM%205257/${oP}/generate`, { idempotencyKey: `gen-${run}-online` }, OFFICER);
  ok("PR #12 review 1 fail: a case whose release files IMM 5257 Online offers no IMM 5257 copy; asking for one is 422 in plain words, nothing queued",
    !ol.some((x) => x.form === "IMM 5257") && r.status === 422 && /filed Online in this case's release: its answers go on the portal sheet/.test(r.body?.detail ?? "") && sql(`select count(*) from form_instance where case_id='${oc.id}'`) === "0", { forms: ol.map((x) => x.form), status: r.status, detail: r.body?.detail });
  ok("PR #12 review 1 pass-guard: the case's other PDF forms are still offered, and the real release is the latest again", ol.length > 0 && sql(`select id from config_release where combination_id='${vv}' order by version desc limit 1`) === rel.id, ol.map((x) => x.form));
  // P-65 (a), review M1: the fill trial verdict gates filing, per form.
  ok("review M1: a form whose fill trial passed is fileable; one with no trial record, or a verdict that the product's file does not pass, is not",
    trialPassed("IMM 5257") && !trialPassed("IMM 9999") && !trialPassed("IMM 1344"), { imm1344: trialPassed("IMM 1344") });
  process.exitCode = summary() ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
