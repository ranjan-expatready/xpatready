// R1a checks (runtime lane, plan §8 RT-1…RT-12, RT-17, S-1): every rule with a passing and a failing case, on an
// isolated copy where setup_visitor_visa.ts has released the visitor visa. No browser, no model call (US$0). All
// people and values are Sample.
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
//   tsx studio/tests/runtime/check_runtime_r1a.ts 4430 xr_studio_runtime_r1
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4430), DB = process.argv[3] ?? "xr_studio_runtime_r1";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", CLIENT_B = "user-Q", AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";
const LOG = join(import.meta.dirname, "..", "..", "var", `isolated-${DB.replace("xr_studio_", "")}`, "api.log");
const run = Date.now().toString(36);
type Q = { subjectId: string; fact: string; label: string; required: boolean; group: string | null; capacity: number | null; answer: any; rows: any[]; fills: { form: string; person: string; boxes: number }[]; options: { key: string }[] | null }; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose test reads

async function main() {
  const vv = sql("select id from combination where combination_key='vv.single'");
  const releases = Number(sql(`select count(*) from config_release where combination_id='${vv}'`));
  if (!releases) { console.log("Run setup_visitor_visa.ts first: the visitor visa is not released in this copy."); process.exitCode = 2; return; }

  // ── S-1 deny by default
  let r = await call("GET", "/session", undefined, "nobody");
  const r0 = await call("GET", "/session", undefined, null);
  ok("S-1 fail: an unknown or missing person is refused (401), never treated as the author", r.status === 401 && r0.status === 401, [r.status, r0.status]);
  ok("S-1 pass: a known person is let in", (await call("GET", "/session", undefined, AUTHOR)).status === 200);

  // ── RT-1 a case opens only on a released combination; it pins the latest release; idempotent
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, AUTHOR);
  ok("RT-1 fail: a configuration person cannot open a case (403)", r.status === 403, r.body?.detail);
  const unreleased = sql(`select c.id from combination c where not exists (select 1 from config_release r where r.combination_id=c.id) limit 1`);
  r = await call("POST", "/runtime/cases", { combinationId: unreleased, reference: `R1A-NR-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant" } }, OFFICER);
  ok("RT-1 fail: a combination with no release cannot have a case (409)", r.status === 409 && /no released version/.test(r.body?.detail), r.body?.detail);
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-${run}`, clientActor: AUTHOR, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  ok("RT-1 fail: the client login must be a client (400)", r.status === 400, r.body?.detail);
  const key = `r1a-case-${run}`;
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" }, idempotencyKey: key }, OFFICER);
  const caseId: string = r.body?.id;
  const latest = sql(`select version || '|' || sha256 from config_release where combination_id='${vv}' order by version desc limit 1`).split("|");
  ok("RT-1 pass: the officer opens a case on the released visitor visa, pinned to its latest release", r.status === 201 && r.body.created === true && r.body.pin.release_version === Number(latest[0]) && r.body.pin.sha256 === latest[1], r.body?.pin);
  const again = await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" }, idempotencyKey: key }, OFFICER);
  ok("RT-1 pass: the same idempotency key twice gives the same case, not a second one", again.body?.id === caseId && again.body.created === false && sql(`select count(*) from runtime_case where idempotency_key='${key}'`) === "1");
  const people = () => call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER).then((x) => x.body.people as { subject_id: string; role: string }[]);
  const principal = (await people()).find((p) => p.role === "principal")!.subject_id, theCase = (await people()).find((p) => p.role === "case")!.subject_id;

  // ── RT-3 people within the pinned release's limits
  r = await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse A" }, OFFICER);
  const spouse: string = r.body?.subject_id;
  ok("RT-3 pass: the officer adds a spouse", r.status === 201 && !!spouse);
  r = await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse B" }, OFFICER);
  ok("RT-3 fail: a second spouse is refused by the release's limit (422)", r.status === 422 && /at most 1/.test(r.body?.detail), r.body?.detail);
  const kids: string[] = [];
  for (let i = 1; i <= 4; i++) kids.push((await call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: `Sample Child ${i}` }, OFFICER)).body.subject_id);
  r = await call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: "Sample Child 5" }, OFFICER);
  ok("RT-3 fail: a fifth child is refused (the release allows 4)", r.status === 422 && kids.every(Boolean), r.body?.detail);
  r = await call("POST", `/runtime/cases/${caseId}/people`, { role: "principal", displayName: "Second principal" }, OFFICER);
  ok("RT-3 fail: a second principal cannot be added (400, field error)", r.status === 400 && r.body?.errors?.[0]?.field === "role", r.body?.errors);
  ok("RT-3 pass: the people are linked to the principal by relationship edges (team PartyRelationship)", sql(`select string_agg(relationship_type, ',' order by relationship_type) from party_relationship pr join answer_subject s on s.party_id = pr.to_party_id join case_participant cp on cp.subject_id = s.id where cp.case_id='${caseId}'`) === "CHILD,CHILD,CHILD,CHILD,SPOUSE_OR_PARTNER");
  let selfEdge = ""; try { sql(`insert into party_relationship (id, workspace_id, from_party_id, to_party_id, relationship_type) select gen_random_uuid(), workspace_id, id, id, 'SELF' from party limit 1`); } catch (e) { selfEdge = String((e as Error).message); }
  ok("RT-3 fail (database): a person related to themself is refused by a CHECK", /ck_party_relationship_not_self/.test(selfEdge));
  // Mark three of the children as not travelling: one child stays to prove the child rule.
  for (const k of kids.slice(1)) await call("PATCH", `/runtime/cases/${caseId}/people/${k}`, { applies: false }, OFFICER);
  const child = kids[0];

  // ── RT-4 asked once however many forms and boxes read the fact
  const agent = async () => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body;
  const qs = (v: { sections: { questions: Q[] }[] }) => v.sections.flatMap((s) => s.questions);
  let v = await agent();
  const keys = qs(v).map((q) => `${q.subjectId}|${q.fact}`);
  ok("RT-4 fail-guard: no person is asked the same fact twice", new Set(keys).size === keys.length, keys.length);
  const spouseName = qs(v).find((q) => q.subjectId === spouse && q.fact === "person.family_name")!;
  const forms = spouseName.fills.map((f) => `${f.form} for ${f.person}`);
  ok("RT-4 pass: the spouse's family name is asked once and fills the principal's IMM 5257, the spouse's own IMM 5257 and IMM 5707", forms.includes("IMM 5257 for Sample Applicant A") && forms.includes("IMM 5257 for Sample Spouse A") && forms.some((f) => f.startsWith("IMM 5707")), forms);

  // ── RT-5 one current answer, append-only, stale and concurrent edits
  const put = (subject: string, field: string, value: unknown, expectedId: string | null, actor = CLIENT, row?: string) => call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${field}`, { value, expectedId, ...(row ? { row } : {}) }, actor);
  const purposes = qs(v).find((q) => q.fact === "case.visit_purpose")!.options!.map((o) => o.key);
  r = await put(theCase, "case.visit_purpose", purposes[0], null);
  const first: string = r.body?.answer?.id;
  ok("RT-5 pass: the client answers the visit purpose once for the application", r.status === 200 && !!first && r.body.answer.problems.length === 0, r.body?.message);
  r = await put(theCase, "case.visit_purpose", purposes[1], null);
  ok("RT-5 fail: a save based on an old view is refused (409) and shows the newer answer", r.status === 409 && r.body?.current?.id === first, r.body?.detail);
  r = await put(theCase, "case.visit_purpose", purposes[1], first);
  ok("RT-5 pass: a change keeps history: two rows, one current", r.status === 200 && sql(`select count(*) || '/' || count(*) filter (where superseded_by_id is null) from client_canonical_answer where subject_id='${theCase}' and canonical_field_key='case.visit_purpose'`) === "2/1");
  const [c1, c2] = await Promise.all([put(principal, "person.marital_status", "married", null), put(principal, "person.marital_status", "single", null)]);
  ok("RT-5 fail: two first answers at the same moment: one is kept, the other gets 409", [c1.status, c2.status].sort().join(",") === "200,409" && sql(`select count(*) from client_canonical_answer where subject_id='${principal}' and canonical_field_key='person.marital_status' and superseded_by_id is null`) === "1", [c1.status, c2.status]);
  let dup = ""; try { sql(`insert into client_canonical_answer (id, workspace_id, party_id, subject_id, canonical_field_id, canonical_field_key, value_json, status, source_json) select gen_random_uuid(), workspace_id, party_id, subject_id, canonical_field_id, canonical_field_key, value_json, status, source_json from client_canonical_answer where subject_id='${theCase}' and superseded_by_id is null and canonical_field_key='case.visit_purpose'`); } catch (e) { dup = String((e as Error).message); }
  ok("RT-5 fail (database): a second current answer is refused by the partial unique index", /uq_answer_current/.test(dup));

  // ── RT-6 field checks by type: saved and flagged, never blocked
  const check = async (subject: string, field: string, value: unknown, actor = CLIENT, row?: string) => { const cur = qs(await agent()).find((q) => q.subjectId === subject && q.fact === field)!; const exp = row ? cur.rows.find((x) => x.row === row)?.answer?.id ?? null : cur.answer?.id ?? null; const x = await put(subject, field, value, exp, actor, row); return { status: x.status, problems: (x.body?.answer?.problems ?? []) as string[], body: x.body }; };
  const cases: [string, string, unknown, boolean, string?][] = [
    [theCase, "case.funds_available_cad", 3000, true], [theCase, "case.funds_available_cad", 30.5, false], [theCase, "case.funds_available_cad", -5, false],
    [principal, "person.criminal_history", false, true], [principal, "person.criminal_history", "maybe", false],
    [principal, "person.criminal_history_details", "x".repeat(200), true], [principal, "person.criminal_history_details", "x".repeat(201), false],
    [principal, "person.marital_status", "nonsense", false], [principal, "person.marital_status", "married", true],
    [principal, "person.email", "client.a@example.com", true], [principal, "person.email", "client.a@", false],
    [principal, "person.telephone_number", { country_code: "91", number: "9876543210" }, true], [principal, "person.telephone_number", { country_code: "+91", number: "98x" }, false],
    [principal, "person.mailing_address", { street_number: "12", street_name: "Sample Road", city: "Sample City", country: "India" }, true], [principal, "person.mailing_address", { street_name: "Sample Road" }, false],
    [principal, "person.date_of_birth", "1990-02-31", false, OFFICER], [principal, "person.date_of_birth", "1990-04-12", true, OFFICER],
  ];
  for (const [subject, field, value, valid, actor] of cases) {
    const x = await check(subject, field, value, actor ?? CLIENT);
    ok(`RT-6 ${valid ? "pass" : "fail"}: ${field} = ${JSON.stringify(value).slice(0, 40)} is ${valid ? "accepted" : "saved and flagged"}`, x.status === 200 && (valid ? x.problems.length === 0 : x.problems.length > 0), x.problems.length ? x.problems : x.body?.detail);
  }

  // ── RT-9 repeating rows: stable ids, tombstone removal, overflow kept and flagged; RT-6 month-and-year precision
  const rows: string[] = [];
  for (let i = 0; i < 4; i++) rows.push((await call("POST", `/runtime/cases/${caseId}/groups/${principal}/rows`, { group: "employment_history" }, CLIENT)).body.row);
  for (const [i, row] of rows.entries()) await put(principal, "person.employment_employer_name", `Sample Employer ${i + 1}`, null, CLIENT, row);
  let m = await check(principal, "person.employment_from_date", "2019-06", CLIENT, rows[0]);
  const m2 = await check(principal, "person.employment_from_date", "2019-06-15", CLIENT, rows[1]);
  ok("RT-6 month and year: IMM 5257 writes only month and year for job dates, so 2019-06 is accepted and a full date is flagged", m.problems.length === 0 && m2.problems.some((p) => /month and year/.test(p)), m2.problems);
  v = await agent();
  let job = qs(v).find((q) => q.subjectId === principal && q.fact === "person.employment_employer_name")!;
  ok("RT-9 pass: four job rows kept; IMM 5257 has room for three, so the fourth is flagged, not dropped", job.rows.length === 4 && job.capacity === 3 && job.rows.filter((x) => !x.fits).length === 1 && !job.rows[3].fits, job.rows.map((x) => x.fits));
  r = await call("DELETE", `/runtime/cases/${caseId}/groups/${principal}/rows/${rows[1]}`, undefined, CLIENT);
  v = await agent(); job = qs(v).find((q) => q.subjectId === principal && q.fact === "person.employment_employer_name")!;
  ok("RT-9 pass: removing row 2 tombstones it; its answer stays stored, the others move up and all now fit", r.status === 200 && job.rows.length === 3 && job.rows.every((x) => x.fits) && job.rows[1].answer?.value === "Sample Employer 3" && sql(`select count(*) from client_canonical_answer where row_key='${rows[1]}'`) !== "0" && sql(`select count(*) from client_fact_record where row_key='${rows[1]}' and tombstone`) === "1", job.rows.map((x) => x.answer?.value));
  r = await put(principal, "person.employment_employer_name", "Sample Employer X", null, CLIENT);
  ok("RT-9 fail: a row question answered without its row is refused (422)", r.status === 422, r.body?.detail);
  r = await put(principal, "person.employment_employer_name", "Sample Employer X", null, CLIENT, rows[1]);
  ok("RT-9 fail: a removed row takes no new answers (404)", r.status === 404, r.body?.detail);

  // ── RT-8 a rule from the release: "describe that status" is required only when the status is Other
  const statuses = qs(v).find((q) => q.fact === "person.current_residence_status")!.options!.map((o) => o.key);
  await check(principal, "person.current_residence_status", statuses.find((k) => k !== "other")!);
  const notReq = qs(await agent()).find((q) => q.subjectId === principal && q.fact === "person.current_residence_status_other")!.required;
  await check(principal, "person.current_residence_status", "other");
  const req = qs(await agent()).find((q) => q.subjectId === principal && q.fact === "person.current_residence_status_other")!.required;
  ok("RT-8 pass and fail: the follow-up is optional for another status and required for Other (rule read from the release)", notReq === false && req === true, { notReq, req });

  // ── RT-10 confirmation (P-72, founder question 1 as recommended)
  const conf = async (subject: string, field: string) => qs(await agent()).find((q) => q.subjectId === subject && q.fact === field)!.answer;
  let a = await conf(principal, "person.marital_status");
  ok("RT-10 pass: the client's own answer on a client field counts as confirmed", a?.confirmed === true && /client's own/.test(a.why), a?.why);
  await check(spouse, "person.marital_status", "married");
  a = await conf(spouse, "person.marital_status");
  ok("RT-10 fail: the client's answer for the adult spouse waits for the officer", a?.confirmed === false && /adult/.test(a.why), a?.why);
  await check(child, "person.marital_status", "single");
  const before = (await conf(child, "person.marital_status"))?.confirmed;
  await check(child, "person.date_of_birth", "2015-05-01", OFFICER);
  const minor = (await conf(child, "person.marital_status"))?.confirmed;
  await check(child, "person.date_of_birth", "2000-05-01", OFFICER);
  const adult = (await conf(child, "person.marital_status"))?.confirmed;
  ok("RT-10 pass and fail: a child's answer counts as confirmed only once the child is known to be under 18", before === false && minor === true && adult === false, { before, minor, adult });
  r = await put(principal, "person.passport_number", "SAMPLE-P-1234567", null, CLIENT);
  ok("RT-10 fail: the client cannot type a fact the officer takes from a document (403)", r.status === 403, r.body?.detail);
  await check(principal, "person.passport_number", "SAMPLE-P-1234567", OFFICER);
  a = await conf(principal, "person.passport_number");
  const waited = a?.confirmed === false;
  r = await call("POST", `/runtime/cases/${caseId}/sections/travel_document/confirm`, { subjectId: principal }, CLIENT);
  const clientConfirm = r.status;
  r = await call("POST", `/runtime/cases/${caseId}/sections/travel_document/confirm`, { subjectId: principal }, OFFICER);
  a = await conf(principal, "person.passport_number");
  ok("RT-10 pass: the officer's \"Confirm section\" confirms the passport number (VERIFIED, history kept); the client cannot (403)", waited && clientConfirm === 403 && r.status === 201 && r.body.confirmed >= 1 && a?.confirmed === true && a.status === "VERIFIED" && Array.isArray(r.body.missing), { waited, clientConfirm, confirmed: r.body?.confirmed, missing: r.body?.missing?.length });

  // ── RT-11 agent-view edit: names every form it fills; needs confirming again
  r = await check(principal, "person.date_of_birth", "1990-04-13", OFFICER);
  ok("RT-11 pass: an officer's edit says which forms it changes (IMM 5257 and IMM 5707)", /IMM 5257/.test(r.body?.message) && /IMM 5707/.test(r.body?.message), r.body?.message);
  a = await conf(principal, "person.date_of_birth");
  ok("RT-11 fail-guard: an edited fact is not confirmed until its section is confirmed again", a?.confirmed === false && a.channel === "agent_view", a?.why);

  // ── RT-12 who may do what (deny by default)
  r = await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, CLIENT);
  ok("RT-12 fail: the client cannot open the agent view (403)", r.status === 403);
  r = await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, CLIENT);
  ok("RT-12 pass: the client opens their own questionnaire, which shows only client fields", r.status === 200 && !qs(r.body).some((q) => q.fact === "person.passport_number") && qs(r.body).some((q) => q.fact === "person.marital_status"));
  r = await call("GET", `/runtime/cases/${caseId}`, undefined, CLIENT_B);
  ok("RT-12 fail: another client cannot see this case (404, as if it did not exist)", r.status === 404);
  const ra = await call("GET", `/runtime/cases/${caseId}`, undefined, AUTHOR), rp = await put(theCase, "case.funds_available_cad", 1, null, AUTHOR);
  ok("RT-12 fail: configuration people reach no case (403)", ra.status === 403 && rp.status === 403);
  r = await call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: "Sample Child X" }, CLIENT);
  ok("RT-12 fail: only the officer adds people (403)", r.status === 403);
  ok("RT-12 pass: the officer lists the workspace's cases; a client cannot list them", (await call("GET", "/runtime/cases", undefined, OFFICER)).body.some((c: { id: string }) => c.id === caseId) && (await call("GET", "/runtime/cases", undefined, CLIENT)).status === 403);

  // ── RT-2 the pin is frozen: a later release does not change an open case; a new case gets the new release
  const oldLabel = qs(await agent()).find((q) => q.fact === "case.visit_purpose")!.label;
  const vp = sql("select id from section_question where canonical_field_key='case.visit_purpose' order by version desc limit 1");
  r = await call("POST", "/library/fields/case.visit_purpose/placement", { sectionKey: "your_visit", collectedFrom: "client_questionnaire", repeats: "once_per_case", tier: "case", questionText: `What is the main reason for the visit? (${run})` }, AUTHOR);
  await call("POST", `/combinations/${vv}/submit`, { note: "R1a check: a later release" }, AUTHOR);
  const sub = (await call("GET", `/combinations/${vv}/review`)).body.submission;
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
  const rel = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  const caseNow = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body;
  const labelNow = qs(await agent()).find((q) => q.fact === "case.visit_purpose")!.label;
  const newer = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A2-${run}`, clientActor: CLIENT_B, principal: { displayName: "Sample Applicant B" } }, OFFICER)).body;
  const newLabel = qs((await call("GET", `/runtime/cases/${newer.id}/questionnaire?mode=agent`, undefined, OFFICER)).body).find((q) => q.fact === "case.visit_purpose")!.label;
  ok("RT-2 pass and fail: after a newer release the open case keeps its release and wording; a new case gets the newer one", !!vp && rel.status === 201 && caseNow.pin.release_version === Number(latest[0]) && labelNow === oldLabel && newer.pin.release_version === Number(latest[0]) + 1 && newLabel.includes(run), { old: caseNow.pin.release_version, new: newer.pin?.release_version, labelNow, newLabel });

  // ── RT-17 audit and logs never hold answer values
  const audit = sql("select coalesce(string_agg(summary || ' ' || coalesce(detail::text, ''), ' '), '') from audit_event where entity in ('case', 'case fact', 'person', 'row', 'section')");
  const log = readFileSync(LOG, "utf8");
  const secrets = ["SAMPLE-P-1234567", "Sample Employer 3", "client.a@example.com", "Sample Road", "Sample Spouse A", "1990-04-13"];
  ok("RT-17 pass: answers are recorded in the audit trail (who, what, when)", /answered person.passport_number/.test(audit) && /confirmed \d+ answer/.test(audit));
  ok("RT-17 fail-guard: no answer value or name appears in the audit trail or the server log", secrets.every((x) => !audit.includes(x) && !log.includes(x)), secrets.filter((x) => audit.includes(x) || log.includes(x)));

  // ── S-7 reset (last: it empties the copy): cases, people and answers go with the disposable workspace
  if (process.argv.includes("--reset")) {
    r = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    ok("S-7 pass: reset removes cases, people, answers and rows with the workspace", r.status < 300 && ["runtime_case", "party", "answer_subject", "client_canonical_answer", "client_fact_record", "pack_work_pin"].every((t) => sql(`select count(*) from ${t}`) === "0"), r.status < 300 ? undefined : r.body);
  }

  process.exitCode = summary() ? 1 : 0;
}

await main();
