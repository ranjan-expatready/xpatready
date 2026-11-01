// C6.4 API checks (M3-B, runtime lane): GET /api/runtime/cases/:id/checklist on a Visitor visa released with Sample
// document lines (passport and photographs for each applicant, a birth certificate for each child, a police certificate
// for each person 18 or older), on an isolated copy where setup_visitor_visa.ts released it first. The list is per
// person, follows the case's answers (birth dates) and carries the police certificate's 6-month rule; who may read it.
// Each rule has a passing and a failing case. No model call (US$0). Lines and values Sample until the expert confirms.
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
//   tsx studio/tests/runtime/check_vv_checklist_api.ts 4430 xr_studio_runtime_r1
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4430), DB = process.argv[3] ?? "xr_studio_runtime_r1";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";
const run = Date.now().toString(36);
type Line = { document: { key: string; name: string }; state: string; why: string; missing: string[]; rule: null | { kind: string; months: number; source: { quote: string } } };
type Person = { subject: string; role: string; lines: Line[] };

(async () => {
  const vv = sql("select id from combination where combination_key='vv.single'");
  // Sample document lines, released through the screens' own routes (scaffolding for this check, P-33).
  if (sql(`select count(*) from document_requirement where combination_id='${vv}' and status <> 'RETIRED'`) === "0") {
    const add = (b: object) => call("POST", `/combinations/${vv}/requirements`, b, AUTHOR);
    const results = [
      await add({ documentTypeKey: "passport_or_travel_document_information_page_photocopy", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant" }),
      await add({ documentTypeKey: "visa_application_photographs", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant" }),
      await add({ documentTypeKey: "birth_certificate_of_accompanying_dependent_child", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_dependent_child" }),
      await add({ newTypeName: "Police certificate", attachMode: "ANSWER_CONDITIONAL", appliesToRoles: "each_applicant", condition: { subjectKind: "EACH_APPLICANT", op: "gte", field: "person.age_years", value: 18 }, conditionPlain: "the person is 18 or older" }),
    ];
    ok("setup: four Sample document lines added to the Visitor visa draft", results.every((x) => x.status < 300), results.map((x) => x.status < 300 ? x.status : x.body));
    for (const c of (await call("GET", "/library/changes?status=WAITING")).body) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
    let r = await call("POST", `/combinations/${vv}/submit`, { note: "C6.4 check: Sample document lines" }, AUTHOR);
    ok("setup: submitted", r.status < 300, r.body);
    const sub = (await call("GET", `/combinations/${vv}/review`)).body.submission;
    const refs = (sub?.changeSummary ?? sub?.change_summary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
    r = await call("POST", `/combinations/${vv}/signoff`, { items: refs, action: "signed" }, REVIEWER);
    r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
    ok("setup: released by a different person", r.status < 300, r.body);
  }
  let r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `M3B-C64-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  const caseId: string = r.body?.id;
  ok("setup: a Visitor visa case opens on the release with document lines", r.status < 300 && !!caseId, r.body?.detail);
  const spouse = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse A" }, OFFICER)).body?.subject_id as string;
  const child = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: "Sample Child 1" }, OFFICER)).body?.subject_id as string;
  const everyone = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body.people as { role: string; subject_id: string }[];
  const principal = everyone.find((p) => p.role === "principal")!.subject_id, theCase = everyone.find((p) => p.role === "case")!.subject_id;
  const birth = (subject: string, value: string) => call("PUT", `/runtime/cases/${caseId}/answers/${subject}/person.date_of_birth`, { value, expectedId: null }, OFFICER);
  const list = (who = OFFICER) => call("GET", `/runtime/cases/${caseId}/checklist`, undefined, who);
  const of = (b: { people: Person[] }, s: string) => b.people.find((p) => p.subject === s)!;
  const police = (p: Person) => p.lines.find((l) => /police/i.test(l.document.name));

  r = await list();
  ok("C6.4 pass: one checklist per person on the case (three), none for the case row", r.status === 200 && r.body.derived === true && r.body.people.length === 3 && !r.body.people.some((p: Person) => p.role === "case"), r.body);
  ok("C6.4 pass: each applicant has their own passport and photographs lines", [principal, spouse, child].every((s) => of(r.body, s).lines.some((l) => /passport/i.test(l.document.key)) && of(r.body, s).lines.some((l) => /photograph/i.test(l.document.key))));
  ok("C6.4 fail: the child's birth certificate is only on the child's list", of(r.body, child).lines.some((l) => /birth_certificate/.test(l.document.key)) && !of(r.body, principal).lines.some((l) => /birth_certificate/.test(l.document.key)));
  ok("C6.4 fail: with no birth dates yet, each police line says answer first, naming the birth date", [principal, spouse, child].every((s) => police(of(r.body, s))?.state === "answer_first" && police(of(r.body, s))!.missing.includes("person.date_of_birth")), police(of(r.body, principal)));
  r = await call("PUT", `/runtime/cases/${caseId}/answers/${theCase}/case.application_date`, { value: "2026-11-01", expectedId: null }, OFFICER);
  ok("setup: the application date answered (the age is worked out on it)", r.status < 300, r.body);

  await birth(principal, "1980-05-01"); await birth(spouse, "1982-02-02"); r = await birth(child, "2015-03-03");
  ok("setup: birth dates answered by the officer", r.status < 300, r.body);
  r = await list();
  ok("C6.4 pass: the adults need a police certificate, with IRCC's 6-month rule on the line", [principal, spouse].every((s) => police(of(r.body, s))?.state === "needed" && police(of(r.body, s))!.rule?.kind === "police_age" && police(of(r.body, s))!.rule!.months === 6 && /no more than 6 months before the date you submit/.test(police(of(r.body, s))!.rule!.source.quote)));
  ok("C6.4 fail: the 11-year-old child needs none, and the reason names the condition", police(of(r.body, child))?.state === "not_needed" && /18 or older/.test(police(of(r.body, child))!.why), police(of(r.body, child)));

  // Dynamic: the child's birth date is corrected to an adult's: the police line becomes needed on the next read.
  const prior = sql(`select a.id from client_canonical_answer a join answer_subject s on s.id = a.subject_id where s.id='${child}' and a.canonical_field_key='person.date_of_birth' and a.superseded_by_id is null`);
  r = await call("PUT", `/runtime/cases/${caseId}/answers/${child}/person.date_of_birth`, { value: "2000-03-03", expectedId: prior || null }, OFFICER);
  r = await list();
  ok("C6.4 pass: the list follows the answers: a corrected birth date makes the police line needed", police(of(r.body, child))?.state === "needed", police(of(r.body, child)));

  // A person who stops travelling has no applicant lines.
  await call("PATCH", `/runtime/cases/${caseId}/people/${spouse}`, { applies: false }, OFFICER);
  r = await list();
  ok("C6.4 fail: a person not applying has an empty list", of(r.body, spouse).lines.length === 0 && of(r.body, principal).lines.length > 0);

  // Who may read it.
  ok("C6.4 fail: the client cannot read the checklist here (403)", (await list(CLIENT)).status === 403);
  ok("C6.4 fail: a configuration person cannot (403)", (await list(AUTHOR)).status === 403);
  ok("C6.4 fail: an unknown case is not found (404)", (await call("GET", "/runtime/cases/00000000-0000-4000-8000-000000000000/checklist", undefined, OFFICER)).status === 404);
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
