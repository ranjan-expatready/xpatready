// C6.4 API checks (M3-B, runtime lane): GET /api/runtime/cases/:id/checklist on a Visitor visa released with Sample
// document lines (passport and photographs for each applicant, a birth certificate for each child, a police certificate
// for each person 18 or older), on an isolated copy where setup_visitor_visa.ts released it first. The list is per
// person, follows the case's answers (birth dates) and carries the police certificate's 6-month rule as release data (a
// document_validity check seeded here as Sample data, as setup_visitor_visa.ts seeds its section checks: no screen
// authors checks yet); answers with problems are not used; who may read it; 409 and "not derived" at API level.
// Each rule has a passing and a failing case. No model call (US$0). Lines and values Sample until the expert confirms.
// Run by run-suites.sh on its own copy (runtime_vv), after setup_visitor_visa.ts:
// The check releases the Visitor visa itself (setup_visitor_visa.ts) when its copy has none, so run-suites.sh runs it
// from this usage line like any other suite (C6.4 review R2):
//   zsh studio/tools/isolated.sh runtime_vv 4431 start && tsx studio/tests/check_vv_checklist_api.ts 4431 xr_studio_runtime_vv
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_runtime_vv";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";
const run = Date.now().toString(36);
type Line = { id: string; document_type: string; label: string; state: string; reason: string; required: boolean; need: string; document: { key: string; name: string }; missing: { key: string; question: string }[]; rule: null | { kind: string; months: number; source: { quote: string; url: string; read: string } } };
type Person = { subject: string; role: string; lines: Line[]; waiting: Line[]; not_needed: Line[] };
const ALL = (p: Person) => [...p.lines, ...p.waiting, ...p.not_needed];

(async () => {
  if (sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") === "0") {
    const studio = join(import.meta.dirname, "..");
    execFileSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 });
    ok("setup: the Visitor visa released on this copy by setup_visitor_visa.ts", sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") !== "0");
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  // Sample document lines, released through the screens' own routes (scaffolding for this check, P-33).
  // G5 (P-248, #868): setup_visitor_visa.ts now releases the Visitor visa with one line (the passport, each applicant), so
  // this check adds its lines while its own are missing (the photographs line marks them), and the passport only if absent.
  const has = (key: string) => sql(`select count(*) from document_requirement where combination_id='${vv}' and document_type_key='${key}' and status <> 'RETIRED'`) !== "0";
  if (!has("visa_application_photographs")) {
    const add = (b: object) => call("POST", `/combinations/${vv}/requirements`, b, AUTHOR);
    const results = [
      has("passport_or_travel_document_information_page_photocopy") ? { status: 201, body: null } : await add({ documentTypeKey: "passport_or_travel_document_information_page_photocopy", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant" }),
      await add({ documentTypeKey: "visa_application_photographs", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant" }),
      await add({ documentTypeKey: "birth_certificate_of_accompanying_dependent_child", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_dependent_child" }),
      // C3.6 (P-158): a new type waits as a library proposal (202); a second person accepts it, then the line goes in with it.
      await (async () => { const named = await add({ newTypeName: "Police certificate", attachMode: "ANSWER_CONDITIONAL", appliesToRoles: "each_applicant", condition: { subjectKind: "EACH_APPLICANT", op: "gte", field: "person.age_years", value: 18 }, conditionPlain: "the person is 18 or older" });
        const key = named.status === 202 ? (await call("POST", "/review/proposals/decide", { ids: [named.body.proposalId], action: "accept" }, "user-B")).body?.items?.[0]?.landedAs : null;
        return key ? add({ documentTypeKey: key, attachMode: "ANSWER_CONDITIONAL", appliesToRoles: "each_applicant", condition: { subjectKind: "EACH_APPLICANT", op: "gte", field: "person.age_years", value: 18 }, conditionPlain: "the person is 18 or older" }) : named; })(),
    ];
    ok("setup: four Sample document lines added to the Visitor visa draft", results.every((x) => x.status === 201), results.map((x) => x.status < 300 ? x.status : x.body));
    // R4: the police certificate's age rule as release data, on the document type key (P-170 citation: immigration-facts
    // row 20, read 29 Oct, Lead-checked; Sample until the immigration expert confirms, P-171).
    const ws = sql(`select workspace_id from combination where id='${vv}'`);
    const policeKey = sql(`select document_type_key from document_type where workspace_id='${ws}' and name='Police certificate' order by version desc limit 1`);
    const rule = { op: "issued_within_months", months: 6, before: "case.application_date", cite: { page: "Police certificates: when you need them", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/police-certificates/when.html", read: "2026-10-29", checked: "Lead-checked record immigration-facts-2026-10-29.md row 20 (P-171)" } };
    sql(`insert into check_def (id, workspace_id, combination_id, check_key, check_group, applies_to, predicate_json, severity, message, source_quote, illustrative, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', '${vv}', 'VV_POLICE_CERT_6_MONTHS', 'document_validity', '${policeKey}', '${JSON.stringify(rule)}'::jsonb, 'warn', 'For the country where the person lives now: issued no more than 6 months before the application is submitted.', 'no more than 6 months before the date you submit your application', true, 1, 'DRAFT', 'HUMAN', '${AUTHOR}') on conflict do nothing`);
    ok("setup: the police certificate rule added to the draft as data, on its document type key", !!policeKey && sql(`select count(*) from check_def where combination_id='${vv}' and check_group='document_validity'`) === "1", policeKey);
    for (const c of (await call("GET", "/library/changes?status=WAITING")).body) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
    // G1 (C5.4): the police certificate line's "18 or older" is a published number; the Visitor visa is Sample, so the
    // demo seed answers it with a Sample source (demo workspace only; the release stays a Demo release).
    const seeded = await call("POST", `/combinations/${vv}/sources/sample`, undefined, AUTHOR);
    ok("setup: the Visitor visa's numbers answered with Sample sources (G1 demo seed)", seeded.status === 200 && seeded.body.sources.counts.held_back === 0, seeded.body);
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
  const police = (p: Person) => ALL(p).find((l) => /police/i.test(l.document.name));

  r = await list();
  ok("C6.4 pass: one checklist per person on the case (three), none for the case row", r.status === 200 && r.body.derived === true && r.body.people.length === 3 && !r.body.people.some((p: Person) => p.role === "case"), r.body);
  ok("C6.4 pass: each applicant has their own passport and photographs lines", [principal, spouse, child].every((s) => ALL(of(r.body, s)).some((l) => /passport/i.test(l.document.key)) && ALL(of(r.body, s)).some((l) => /photograph/i.test(l.document.key))));
  ok("C6.4 fail: the child's birth certificate is only on the child's list", ALL(of(r.body, child)).some((l) => /birth_certificate/.test(l.document.key)) && !ALL(of(r.body, principal)).some((l) => /birth_certificate/.test(l.document.key)));
  ok("C6.4 fail: with no birth dates yet, each police line says answer first, naming the birth date", [principal, spouse, child].every((s) => police(of(r.body, s))?.need === "answer_first" && police(of(r.body, s))!.missing.some((m) => m.key === "person.date_of_birth")), police(of(r.body, principal)));
  r = await call("PUT", `/runtime/cases/${caseId}/answers/${theCase}/case.application_date`, { value: "2026-11-01", expectedId: null }, OFFICER);
  ok("setup: the application date answered (the age is worked out on it)", r.status < 300, r.body);

  await birth(principal, "1980-05-01"); await birth(spouse, "1982-02-02"); r = await birth(child, "2015-03-03");
  ok("setup: birth dates answered by the officer", r.status < 300, r.body);
  r = await list();
  ok("C6.4 pass: the adults need a police certificate, with IRCC's 6-month rule on the line", [principal, spouse].every((s) => police(of(r.body, s))?.need === "needed" && police(of(r.body, s))!.rule?.kind === "issued_within_months" && police(of(r.body, s))!.rule!.months === 6 && /no more than 6 months before the date you submit/.test(police(of(r.body, s))!.rule!.source.quote) && police(of(r.body, s))!.rule!.source.read === "2026-10-29"));
  ok("C6.4 R4 (fail): the passport line carries no validity rule", ALL(of(r.body, principal)).find((l) => /passport/i.test(l.document.key))?.rule === null);
  ok("C6.4 fail: the 11-year-old child needs none, and the reason names the condition", police(of(r.body, child))?.need === "not_needed" && /18 or older/.test(police(of(r.body, child))!.reason), police(of(r.body, child)));

  // Dynamic: the child's birth date is corrected to an adult's: the police line becomes needed on the next read.
  const prior = sql(`select a.id from client_canonical_answer a join answer_subject s on s.id = a.subject_id where s.id='${child}' and a.canonical_field_key='person.date_of_birth' and a.superseded_by_id is null`);
  r = await call("PUT", `/runtime/cases/${caseId}/answers/${child}/person.date_of_birth`, { value: "2000-03-03", expectedId: prior || null }, OFFICER);
  r = await list();
  ok("C6.4 pass: the list follows the answers: a corrected birth date makes the police line needed", police(of(r.body, child))?.need === "needed", police(of(r.body, child)));

  // B-M2: an application date its own check rejects (2200) is not used: no age of 191, the line asks for the date again.
  const appPrior = () => sql(`select a.id from client_canonical_answer a where a.subject_id='${theCase}' and a.canonical_field_key='case.application_date' and a.superseded_by_id is null`);
  r = await call("PUT", `/runtime/cases/${caseId}/answers/${theCase}/case.application_date`, { value: "2200-01-01", expectedId: appPrior() || null }, OFFICER);
  ok("setup: an application date of 2200 is stored (answers are never blocked, P-47)", r.status < 300, r.body);
  r = await list();
  const p2200 = police(of(r.body, principal))!;
  ok("C6.4 B-M2 (fail): an application date with a problem is not used: answer first, naming the application date in words", p2200.need === "answer_first" && p2200.missing.some((m) => m.key === "case.application_date") && !/191/.test(p2200.reason), p2200);
  ok("C6.4 B-M3 (fail): the calculated age is never asked for; its input questions are", !p2200.missing.some((m) => m.key === "person.age_years") && p2200.missing.every((m) => m.question.startsWith('"')), p2200.missing);
  r = await call("PUT", `/runtime/cases/${caseId}/answers/${theCase}/case.application_date`, { value: "2026-11-01", expectedId: appPrior() || null }, OFFICER);
  r = await list();
  ok("C6.4 B-M2 pass: a good application date is used again: the adults' police lines are needed", police(of(r.body, principal))?.need === "needed", police(of(r.body, principal)));

  // 409: a release that no longer names the case's combination is refused; it reads again once it is as released.
  const rel = sql(`select r.id from config_release r join pack_work_pin p on p.config_release_id = r.id where p.case_id = '${caseId}'`);
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{combination,key}', '"wp.family"') where id = '${rel}'`);
  try {
    r = await list();
    ok("C6.4 fail: a release that no longer names the case's combination is refused (409), no checklist", r.status === 409 && /does not describe the case's own combination/.test(r.body?.detail ?? ""), r.body);
  } finally { sql(`update config_release set snapshot = jsonb_set(snapshot, '{combination,key}', '"vv.single"') where id = '${rel}'`); }
  ok("C6.4 pass: the same case reads again once the release is as released", (await list()).status === 200);

  // Not derived yet: a case on another released combination says so and lists nothing.
  const wp = sql("select c.id from combination c where c.combination_key='wp.family' and exists (select 1 from config_release r where r.combination_id=c.id)");
  if (wp) {
    const other = (await call("POST", "/runtime/cases", { combinationId: wp, reference: `M3B-C64-WP-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant B" } }, OFFICER)).body?.id as string;
    r = await call("GET", `/runtime/cases/${other}/checklist`, undefined, OFFICER);
    ok("C6.4 fail: another combination's case is not derived yet and says so, with no lists", r.status === 200 && r.body.derived === false && /not derived yet/.test(r.body.why) && !r.body.people, r.body);
  } else ok("C6.4 fail: another combination's case is not derived yet (no other released combination on this copy)", false, "release wp.family first");

  // A person who stops travelling has no applicant lines.
  await call("PATCH", `/runtime/cases/${caseId}/people/${spouse}`, { applies: false }, OFFICER);
  r = await list();
  ok("C6.4 fail: a person not applying has an empty list", ALL(of(r.body, spouse)).length === 0 && of(r.body, principal).lines.length > 0);
  ok("C6.4 pack 4 shape: storage marked Stand-in SI-14; each line has an id, document type, label, Not requested, a reason and required", r.body.stand_in === "SI-14" && (r.body.people as Person[]).flatMap(ALL).every((l) => !!l.id && !!l.document_type && !!l.label && l.state === "not_requested" && l.reason.length > 5 && typeof l.required === "boolean"));

  // Who may read it.
  ok("C6.4 fail: the client cannot read the checklist here (403)", (await list(CLIENT)).status === 403);
  ok("C6.4 fail: a configuration person cannot (403)", (await list(AUTHOR)).status === 403);
  ok("C6.4 fail: an unknown case is not found (404)", (await call("GET", "/runtime/cases/00000000-0000-4000-8000-000000000000/checklist", undefined, OFFICER)).status === 404);
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
