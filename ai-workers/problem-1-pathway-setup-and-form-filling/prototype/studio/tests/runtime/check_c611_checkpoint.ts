// C6.11 checks on the configured checkpoint (runtime lane, #1072 review and break findings): rules the pack does not
// name, each with a passing and a failing case. Sample data, US$0, no model call. One SQL write stands for an answer
// typed before #1072 (a stored "Uses a representative"), which no route can write any more.
//   zsh studio/tools/isolated.sh rt611 4431 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/runtime/check_c611_checkpoint.ts 4431 xr_studio_rt611
import { CLIENT, call, firms, itemsOf, needVisitorVisa, ok, openCase, prepare, sql, yearsAgo, main } from "../../acceptance/lib/m3.ts";

await main("C6.11", "Firm, users and case team — checkpoint checks", async () => {
  const vv = needVisitorVisa(), f = await firms();
  const officer = f.officer!;

  // Review M1, break M1: a stored "Uses a representative" from before #1072 never blocks Confirm section.
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const caseSubject = c.caseSubject;
  const fid = sql(`select id from canonical_field where canonical_field_key='case.uses_representative' and status='PUBLISHED' order by version desc limit 1`);
  const party = sql(`select party_id from answer_subject where id='${caseSubject}'`);
  const ws = sql(`select workspace_id from runtime_case where id='${c.id}'`);
  const old = sql(`insert into client_canonical_answer (id, workspace_id, party_id, subject_id, canonical_field_id, canonical_field_key, value_json, status, source_json) values (gen_random_uuid(), '${ws}', '${party}', '${caseSubject}', '${fid}', 'case.uses_representative', 'false'::jsonb, 'DECLARED', '{"channel":"agent_view","actor":"user-O","at":"2026-11-04T10:00:00Z"}'::jsonb) returning id`)?.split("\n")[0] ?? null;
  const view = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body;
  const sec = (view?.sections ?? []).find((s: { subjectId: string; questions: { fact: string }[] }) => s.subjectId === caseSubject && s.questions.some((q) => q.fact === "case.uses_representative"));
  const shown = sec?.questions.find((q: { fact: string }) => q.fact === "case.uses_representative")?.answer;
  ok("C6.11 pass: the firm record's Yes is shown for \"Uses a representative\", not the stored No", shown?.value === true && shown?.channel === "firm_record", shown);
  // As the screen does: every answer it shows, except the firm record's (questionnaire.tsx, `seen`).
  const seen = (sec?.questions ?? []).map((q: { answer: { id: string; channel: string } | null }) => q.answer).filter((a: { id: string; channel: string } | null) => a && a.channel !== "firm_record").map((a: { id: string }) => a.id);
  const conf = await call("POST", `/runtime/cases/${c.id}/sections/${sec?.section}/confirm`, { subjectId: caseSubject, seen }, officer);
  ok("C6.11 pass (review M1): Confirm section succeeds with a stored answer the firm record replaces (no 409 the officer cannot clear)", !!old && !!sec && conf.status < 300, { status: conf.status, body: conf.body });
  ok("C6.11 fail (review M1): the replaced stored answer is neither confirmed nor changed (it stays as typed, unread)", sql(`select status||':'||coalesce(superseded_by_id::text,'none') from client_canonical_answer where id='${old}'`) === "DECLARED:none");

  // Break m1, m2: who is told what when typing "Uses a representative".
  const byOfficer = await call("PUT", `/runtime/cases/${c.id}/answers/${caseSubject}/case.uses_representative`, { value: false, expectedId: null }, officer);
  const byClient = await call("PUT", `/runtime/cases/${c.id}/answers/${caseSubject}/case.uses_representative`, { value: false, expectedId: null }, CLIENT);
  ok("C6.11 fail: staff cannot type \"Uses a representative\" (422, change the case team)", byOfficer.status === 422 && /Case team/.test(byOfficer.body?.detail ?? ""), byOfficer.body?.detail);
  ok("C6.11 fail: a client cannot type it either (403, the case team sets it)", byClient.status === 403 && /case team sets/.test(byClient.body?.detail ?? ""), [byClient.status, byClient.body?.detail]);

  // Break n1 (round 2): undo of "Uses a representative" is refused while the case has a representative of record, as
  // typing it is; before the fix it answered 200 "Undone" and wrote a hidden row. Steps as the breaker's: no
  // representative, the officer types Yes then No, the firm admin names the representative, the officer undoes. A case
  // always opens with the firm's representative, so one SQL write ends it (a case whose representative left, no route).
  const u = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  sql(`update case_team_member set ended_at=now(), ended_by='${f.admin}', end_reason='Sample: no representative of record' where case_id='${u.id}' and role='LEAD_REPRESENTATIVE' and ended_at is null`);
  const yes = await call("PUT", `/runtime/cases/${u.id}/answers/${u.caseSubject}/case.uses_representative`, { value: true, expectedId: null }, officer);
  const no = await call("PUT", `/runtime/cases/${u.id}/answers/${u.caseSubject}/case.uses_representative`, { value: false, expectedId: yes.body?.answer?.id ?? null }, officer);
  const named = await call("PUT", `/runtime/cases/${u.id}/team/representative`, { userId: f.rep, reason: "Sample reason" }, f.admin!);
  const rows = () => sql(`select count(*) from client_canonical_answer where subject_id='${u.caseSubject}' and canonical_field_key='case.uses_representative'`);
  const before = rows();
  const undo = await call("POST", `/runtime/cases/${u.id}/changes/undo`, { subjectId: u.caseSubject, fact: "case.uses_representative" }, officer);
  ok("C6.11 pass (break n1): with no representative of record the officer types Yes, then No, then the firm admin names one", yes.status < 300 && no.status < 300 && named.status < 300, [yes.status, no.status, named.status, named.body?.detail]);
  ok("C6.11 fail (break n1): undo of \"Uses a representative\" is refused while the case has a representative of record (422, Case team)", undo.status === 422 && /Case team/.test(undo.body?.detail ?? ""), [undo.status, undo.body?.detail ?? undo.body?.message]);
  ok("C6.11 fail (break n1): the refused undo writes no answer row", rows() === before, [before, rows()]);

  // VV-R10: a dependent child from 18 fills their own IMM 5476; under 18 is covered by the applicant's.
  const fam = await openCase(vv, [
    { role: "principal", name: "Sample Client A", dob: yearsAgo(50) },
    { role: "child", name: "Sample Child 19", dob: yearsAgo(19) },
    { role: "child", name: "Sample Child 17", dob: yearsAgo(17) },
  ], { representative: f.rep, caseOfficers: [officer] });
  const p = (await prepare(fam.id, officer)).p;
  ok("C6.11 pass (VV-R10): a dependent child of 19 has their own IMM 5476", itemsOf(p, fam.subjects["Sample Child 19"], "IMM 5476").length === 1, p?.items.filter((i) => i.form === "IMM 5476").map((i) => (i as { person?: string }).person));
  ok("C6.11 fail (VV-R10): a dependent child of 17 has none", itemsOf(p, fam.subjects["Sample Child 17"], "IMM 5476").length === 0);

  // Tech lead's ruling on #1072: IMM 5475's designated individual (on the checkpoint, its boxes read the representative's
  // person.address_*, person.email and person.phone_*) is never newly filled from the firm record.
  const rv = (await call("GET", `/runtime/cases/${fam.id}/questionnaire?mode=agent`, undefined, officer)).body;
  const repQs = (rv?.sections ?? []).filter((x: { subjectId: string }) => x.subjectId === "representative").flatMap((x: { questions: { fact: string; answer: { channel: string } | null; fills: { form: string }[] }[] }) => x.questions);
  const on5475 = repQs.filter((q: { fact: string; fills: { form: string }[] }) => /^person\.(address_|phone_|email$)/.test(q.fact) && q.fills.some((x) => x.form === "IMM 5475"));
  ok("C6.11 fail (ruling on #1072): no address, e-mail or phone IMM 5475 reads about the representative is filled from the firm record", on5475.length > 0 && on5475.every((q: { answer: { channel: string } | null }) => q.answer?.channel !== "firm_record"), on5475.map((q: { fact: string; answer: { channel: string } | null }) => `${q.fact}=${q.answer?.channel ?? "—"}`));
  ok("C6.11 pass: the representative's licence part (membership ID) is still from the firm record", repQs.some((q: { fact: string; answer: { channel: string } | null }) => q.fact === "representative.membership_id" && q.answer?.channel === "firm_record"));

  // Break M3: the IMM 5476 item names the representative of record; IMM 5475 (its designated individual) is not tagged.
  const i5476 = itemsOf(p, fam.subjects["Sample Client A"], "IMM 5476")[0] as { representative?: string } | undefined;
  const i5475 = itemsOf(p, fam.subjects["Sample Client A"], "IMM 5475")[0] as { representative?: string } | undefined;
  ok("C6.11 pass: the IMM 5476 item names the representative of record", i5476?.representative === f.rep, i5476);
  ok("C6.11 fail (break M3): the IMM 5475 item carries no representative (its designated individual is not the case team)", !!i5475 && !("representative" in i5475), i5475);
});
