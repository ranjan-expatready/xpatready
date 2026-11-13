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
  /** The ids of the answers the officer sees in one person's section (what "Confirm section" vouches for). */
  const seenIn = async (subject: string, section: string) => (await agent()).sections.filter((x: { subjectId: string; section: string }) => x.subjectId === subject && x.section === section).flatMap((x: { questions: Q[] }) => x.questions).flatMap((q: Q) => (q.group ? q.rows.map((r) => r.answer?.id) : [q.answer?.id])).filter(Boolean) as string[];
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
  ok("RT-10 pass (P-242, QA-301): the client's own answer on a client field is Declared and needs no officer confirmation", a?.confirmed === true && /^Declared: the client's own answer/.test(a.why) && a.mark === "declared", a?.why);
  await check(spouse, "person.marital_status", "married");
  a = await conf(spouse, "person.marital_status");
  ok("RT-10 fail (P-78, P-411 (1)): the principal's answer for the adult spouse shows \"answered by the principal for\" the spouse's name and is not confirmed", a?.confirmed === false && /^Answered by the principal for Sample Spouse/.test(a.why) && a.mark === "by_principal", a?.why);
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
  const looked = await seenIn(principal, "travel_document");
  r = await call("POST", `/runtime/cases/${caseId}/sections/travel_document/confirm`, { subjectId: principal, seen: looked }, CLIENT);
  const clientConfirm = r.status;
  await check(principal, "person.passport_number", "SAMPLE-P-7654321", OFFICER); // changed after the officer looked
  r = await call("POST", `/runtime/cases/${caseId}/sections/travel_document/confirm`, { subjectId: principal, seen: looked }, OFFICER);
  ok("RT-10 fail (review Must 2): confirming a section whose answer changed after the officer looked is refused (409) and names the fact; nothing is verified", r.status === 409 && r.body?.changed?.includes("person.passport_number") && sql(`select count(*) from client_canonical_answer where subject_id='${principal}' and status='VERIFIED'`) === "0", r.body);
  r = await call("POST", `/runtime/cases/${caseId}/sections/travel_document/confirm`, { subjectId: principal }, OFFICER);
  ok("RT-10 fail: a confirm that does not say which answers were reviewed is refused (400)", r.status === 400 && r.body?.errors?.[0]?.field === "seen", r.body?.errors);
  r = await call("POST", `/runtime/cases/${caseId}/sections/travel_document/confirm`, { subjectId: principal, seen: await seenIn(principal, "travel_document") }, OFFICER);
  a = await conf(principal, "person.passport_number");
  ok("RT-10 pass: the officer's \"Confirm section\" confirms the passport number (VERIFIED, history kept); the client cannot (403)", waited && clientConfirm === 403 && r.status === 201 && r.body.confirmed >= 1 && a?.confirmed === true && a.status === "VERIFIED" && Array.isArray(r.body.missing), { waited, clientConfirm, confirmed: r.body?.confirmed, missing: r.body?.missing?.length });

  // ── RT-11 agent-view edit: names every form it fills; needs confirming again
  r = await check(principal, "person.date_of_birth", "1990-04-13", OFFICER);
  ok("RT-11 pass: an officer's edit says which forms it changes (IMM 5257 and IMM 5707)", /IMM 5257/.test(r.body?.message) && /IMM 5707/.test(r.body?.message), r.body?.message);
  a = await conf(principal, "person.date_of_birth");
  ok("RT-11 fail-guard: an edited fact is not confirmed until its section is confirmed again", a?.confirmed === false && a.channel === "agent_view", a?.why);

  // ── RT-12 who may do what (deny by default)
  r = await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, CLIENT);
  ok("RT-12 fail: the client cannot open the Agent view (403)", r.status === 403);
  r = await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, CLIENT);
  ok("RT-12 pass: the client opens their own questionnaire, which shows only client fields", r.status === 200 && !qs(r.body).some((q) => q.fact === "person.passport_number") && qs(r.body).some((q) => q.fact === "person.marital_status"));
  r = await call("GET", `/runtime/cases/${caseId}`, undefined, CLIENT_B);
  ok("RT-12 fail: another client cannot see this case (404, as if it did not exist)", r.status === 404);
  const ra = await call("GET", `/runtime/cases/${caseId}`, undefined, AUTHOR), rp = await put(theCase, "case.funds_available_cad", 1, null, AUTHOR);
  ok("RT-12 fail: configuration people reach no case (403)", ra.status === 403 && rp.status === 403);
  r = await call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: "Sample Child X" }, CLIENT);
  ok("RT-12 fail: only the officer adds people (403)", r.status === 403);
  ok("RT-12 pass: the officer lists the workspace's cases; a client cannot list them", (await call("GET", "/runtime/cases?take=100", undefined, OFFICER)).body.cases.some((c: { id: string }) => c.id === caseId) && (await call("GET", "/runtime/cases", undefined, CLIENT)).status === 403);

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

  // ── S-9 a release publishes the answer lists its choice fields take (else the published copy differs from the reviewed one)
  ok("S-9 pass: every answer list the visitor visa's fields take is published with its release; none is left in draft", sql(`select count(*) from answer_list where answer_list_key in (select distinct answer_list_key from canonical_field where answer_list_key is not null) and status = 'DRAFT'`) === "0" && Number(sql("select count(*) from answer_list where status = 'PUBLISHED'")) >= 13);

  // ── R1a FIX: review and break-report findings, each with a passing and a failing case
  r = await call("GET", "/activity", undefined, CLIENT); const r2 = await call("GET", "/activity", undefined, null);
  ok("FIX Must 1 fail: a client or an unknown caller cannot read the activity feed (403, 401)", r.status === 403 && r2.status === 401, [r.status, r2.status]);
  ok("FIX Must 1 pass: the officer and configuration people read it", (await call("GET", "/activity", undefined, OFFICER)).status === 200 && (await call("GET", "/activity", undefined, AUTHOR)).status === 200);
  v = await agent();
  const asked = qs(v);
  ok("FIX Major 3 pass: every question of the case fills a form box or decides something (P-62); questions no form reads are not asked", asked.every((q) => q.fills.length > 0 || (q as unknown as { decides?: unknown[] }).decides?.length) && v.summary.not_asked > 0, { asked: asked.length, not_asked: v.summary.not_asked });
  ok("FIX Major 3 fail: the duplicate and representative questions are gone (email_address, phone_number, mailing-address parts, representative licence)", !asked.some((q) => ["person.email_address", "person.phone_number", "person.mailing_address_city", "representative.membership_id", "person.previous_marriage_or_common_law"].includes(q.fact)));
  r = await put(principal, "representative.membership_id", "X-1", null, CLIENT);
  ok("FIX B2 fail: the client cannot answer the representative's own facts (403 or not in the release's questions)", r.status === 403 || r.status === 404, r.status);
  const detailsReq = async (yes: boolean) => { await check(principal, "person.criminal_history", yes); return qs(await agent()).find((q) => q.subjectId === principal && q.fact === "person.criminal_history_details")!.required; };
  ok("FIX Major 4 pass and fail: criminal-history details are optional after no and required after yes (release rule)", (await detailsReq(false)) === false && (await detailsReq(true)) === true);
  const nid = qs(await agent()).filter((q) => q.subjectId === principal && q.fact.startsWith("person.national_id"));
  ok("FIX Major 4 pass: a national ID is optional, and its dates and country are required only once a number is given", nid.length === 4 && nid.every((q) => q.required === false));
  r = await check(theCase, "case.visa_type_requested", "I want a golden visa");
  const golden = r.problems.length > 0;
  r = await check(theCase, "case.visa_type_requested", "VisitorVisa");
  ok("FIX Major 5 pass and fail: a choice without an answer list takes only the codes its form lists", golden && r.problems.length === 0);
  r = await put(principal, "person.email", "x".repeat(5000), (qs(await agent()).find((q) => q.subjectId === principal && q.fact === "person.email")!.answer?.id) ?? null, CLIENT);
  const big = r.status;
  let deep: unknown = "x"; for (let i = 0; i < 6; i++) deep = { d: deep };
  const rd = await put(principal, "person.mailing_address", deep, (qs(await agent()).find((q) => q.subjectId === principal && q.fact === "person.mailing_address")!.answer?.id) ?? null, CLIENT);
  const rn = await put(principal, "person.email", "a\u0000b@example.com", null, CLIENT);
  ok("FIX Major 6 / B3 B6 B7 fail: an answer over 4,000 characters, nested over 3 levels, or holding a NUL character is refused (400), not stored", big === 400 && rd.status === 400 && rn.status === 400, [big, rd.status, rn.status]);
  r = await call("PUT", `/runtime/cases/${caseId}/answers/${principal}/bad%00key`, { value: "x", expectedId: null }, CLIENT);
  ok("FIX B6 fail: a NUL character in a question key is a 404, not a server error", r.status === 404, r.status);
  const k2 = `r1a-key-${run}`;
  const same = await Promise.all(Array.from({ length: 6 }, () => call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-K-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant K" }, idempotencyKey: k2 }, OFFICER)));
  ok("FIX B5 pass: six simultaneous creates with one key all answer with the same case", same.every((x) => x.status < 300 && x.body.id === same[0].body.id) && sql(`select count(*) from runtime_case where idempotency_key='${k2}'`) === "1", same.map((x) => x.status));
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-K2-${run}`, clientActor: CLIENT_B, principal: { displayName: "Sample Applicant Z" }, idempotencyKey: k2 }, OFFICER);
  ok("FIX B1 fail: reusing an idempotency key for a different request is refused (409), never answered with another case", r.status === 409, r.body?.detail);
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-K-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant K" } }, OFFICER);
  ok("FIX B16 fail: a second case with the same reference is refused (409)", r.status === 409, r.body?.detail);
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-U-${run}`, clientActor: "nobody", principal: { displayName: "Sample Applicant U" } }, OFFICER);
  ok("FIX B13 fail: an unknown client login is a 400 on that field, not a 401", r.status === 400 && r.body?.errors?.[0]?.field === "clientActor", r.body);
  const fresh = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1A-C-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant C" } }, OFFICER)).body.id;
  const adds = await Promise.all(Array.from({ length: 3 }, (_, i) => call("POST", `/runtime/cases/${fresh}/people`, { role: "child", displayName: `Sample Child C${i}` }, OFFICER)));
  ok("FIX minor (people race) pass: three lawful simultaneous child adds all succeed with distinct places", adds.every((x) => x.status === 201) && sql(`select count(distinct "order") from case_participant where case_id='${fresh}' and role='child'`) === "3", adds.map((x) => x.status));
  const freshPrincipal = sql(`select subject_id from case_participant where case_id='${fresh}' and role='principal'`);
  const radds = await Promise.all(Array.from({ length: 10 }, () => call("POST", `/runtime/cases/${fresh}/groups/${freshPrincipal}/rows`, { group: "employment_history" }, CLIENT)));
  ok("FIX B10 pass: ten simultaneous row adds get ten distinct places", radds.every((x) => x.status === 201) && sql(`select count(distinct "order") from client_fact_record where subject_id='${freshPrincipal}' and superseded_by_id is null`) === "10", radds.map((x) => x.status));
  const freshCase = sql(`select subject_id from case_participant where case_id='${fresh}' and role='case'`);
  const rg1 = await call("POST", `/runtime/cases/${fresh}/groups/${freshPrincipal}/rows`, { group: "your_visit" }, CLIENT), rg2 = await call("POST", `/runtime/cases/${fresh}/groups/${freshCase}/rows`, { group: "employment_history" }, CLIENT);
  ok("FIX B12 fail: an application-level group cannot get rows on a person, nor a person's group on the application (422)", rg1.status === 422 && rg2.status === 422, [rg1.status, rg2.status]);
  const rowK = radds[0].body.row;
  const [del, ansr] = await Promise.all([call("DELETE", `/runtime/cases/${fresh}/groups/${freshPrincipal}/rows/${rowK}`, undefined, CLIENT), call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.employment_employer_name`, { value: "Sample Employer R", expectedId: null, row: rowK }, CLIENT)]);
  const lost = ansr.status === 200 && sql(`select count(*) from client_fact_record where row_key='${rowK}' and tombstone`) === "1" && sql(`select count(*) from client_canonical_answer where row_key='${rowK}'`) === "0";
  ok("FIX B11 fail-guard: removing a row while answering into it never reports a saved answer that is lost", del.status === 200 && !lost, [del.status, ansr.status]);
  // PR 7 review D1: a removed row's answers no longer block "Confirm section"; they stay stored, unverified
  const d1Row = (await call("POST", `/runtime/cases/${fresh}/groups/${freshPrincipal}/rows`, { group: "employment_history" }, CLIENT)).body.row;
  const d1Ans = await call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.employment_employer_name`, { value: "Sample Employer D1", expectedId: null, row: d1Row }, CLIENT);
  await call("DELETE", `/runtime/cases/${fresh}/groups/${freshPrincipal}/rows/${d1Row}`, undefined, CLIENT);
  const freshSeen = async () => (await call("GET", `/runtime/cases/${fresh}/questionnaire?mode=agent`, undefined, OFFICER)).body.sections.filter((x: { subjectId: string; section: string }) => x.subjectId === freshPrincipal && x.section === "employment_history").flatMap((x: { questions: Q[] }) => x.questions).flatMap((q: Q) => (q.group ? q.rows.map((r) => r.answer?.id) : [q.answer?.id])).filter(Boolean) as string[];
  const d1Seen = await freshSeen();
  const liveRow = radds[1].body.row;
  await call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.employment_employer_name`, { value: "Sample Employer D1 live", expectedId: null, row: liveRow }, CLIENT);
  r = await call("POST", `/runtime/cases/${fresh}/sections/employment_history/confirm`, { subjectId: freshPrincipal, seen: d1Seen }, OFFICER);
  ok("D1 fail: an answer arriving in a live row after the officer looked is still refused (409) and named", r.status === 409 && r.body?.changed?.includes("person.employment_employer_name"), r.body);
  r = await call("POST", `/runtime/cases/${fresh}/sections/employment_history/confirm`, { subjectId: freshPrincipal, seen: [...await freshSeen(), d1Ans.body?.answer?.id].filter(Boolean) }, OFFICER);
  // QA-446 (P-510 (2)): the live row's answer is the principal's own (Declared), never on the officer's Confirm list, so
  // the confirm goes through confirming nothing; before P-510 it was turned into the officer's (confirmed >= 1).
  ok("D1 pass: after a row is removed the section can be confirmed; the removed row's answer stays stored and unverified (history kept); the live row's own answer stays Declared", d1Ans.status === 200 && r.status === 201 && r.body.confirmed === 0 && sql(`select count(*) from client_canonical_answer where row_key='${liveRow}' and status='DECLARED' and superseded_by_id is null`) === "1" && sql(`select count(*) from client_canonical_answer where row_key='${d1Row}' and status='DECLARED' and superseded_by_id is null`) === "1" && sql(`select count(*) from client_canonical_answer where row_key='${d1Row}' and status='VERIFIED'`) === "0", { answer: d1Ans.status, confirm: r.status, body: r.body });
  // qa QA-25: control characters are refused anywhere in an answer (tab, line feed, carriage return allowed)
  const ctl = await Promise.all([
    call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.other_family_name`, { value: "Sample\u0007Name", expectedId: null }, CLIENT),
    call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.mailing_address`, { value: { street_name: "Sample\u0001Road", city: "Toronto", country: "Canada" }, expectedId: null }, CLIENT),
    call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.other_given_names`, { value: "Sample\u007fName", expectedId: null }, CLIENT),
  ]);
  ok("QA-25 fail: a bell, a control character inside an address part, or DEL is refused (400) with a plain reason, not stored", ctl.every((x) => x.status === 400 && /control characters/.test(x.body?.detail ?? "")) && sql(`select count(*) from client_canonical_answer where subject_id='${freshPrincipal}' and canonical_field_key in ('person.other_family_name','person.mailing_address','person.other_given_names')`) === "0", ctl.map((x) => x.status));
  r = await call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.criminal_history_details`, { value: "Line one\n\tLine two\r\nLine three", expectedId: null }, CLIENT);
  ok("QA-25 pass: long text keeps its line breaks and tabs", r.status === 200, r.status);
  // qa QA-26: refusals about ids say what to send, never "Invalid UUID"
  const ids = await Promise.all([
    call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.other_family_name`, { value: "Sample", expectedId: "abc" }, CLIENT),
    call("POST", `/runtime/cases/${fresh}/sections/contact/confirm`, { subjectId: freshPrincipal, seen: ["abc"] }, OFFICER),
    call("POST", `/runtime/cases/${fresh}/sections/contact/confirm`, { subjectId: "abc", seen: [] }, OFFICER),
    call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.employment_employer_name`, { value: "Sample", expectedId: null, row: "abc" }, CLIENT),
    call("POST", "/runtime/cases", { combinationId: "abc", reference: `R1A-ID-${run}`, clientActor: CLIENT, principal: { displayName: "Sample" } }, OFFICER),
  ]);
  ok("QA-26 fail: every refused id (answer seen, reviewed answers, person, row, combination) is a 400 in plain words, never \"Invalid UUID\"", ids.every((x) => x.status === 400 && !/invalid uuid/i.test(JSON.stringify(x.body))), ids.map((x) => x.body?.detail));
  ok("QA-26 pass: the stale-id refusal says what to send", /id of the answer you saw/.test(ids[0].body?.detail ?? "") && /reviewed answer/.test(ids[1].body?.detail ?? ""), [ids[0].body?.detail, ids[1].body?.detail]);
  // qa QA-28: pressing "Add child" twice adds one child
  const twice = await Promise.all([0, 1].map(() => call("POST", `/runtime/cases/${fresh}/people`, { role: "child", displayName: "Sample Child QA28", idempotencyKey: `qa28-${run}` }, OFFICER)));
  ok("QA-28 pass: two presses with one key add one child and both answer with that child", twice.every((x) => x.status === 201 && x.body.subject_id === twice[0].body.subject_id) && sql(`select count(*) from case_participant p join answer_subject s on s.id = p.subject_id where p.case_id='${fresh}' and s.label='Sample Child QA28'`) === "1", twice.map((x) => [x.status, x.body?.subject_id]));
  r = await call("POST", `/runtime/cases/${fresh}/people`, { role: "child", displayName: "Another Child QA28", idempotencyKey: `qa28-${run}` }, OFFICER);
  ok("QA-28 fail: the same key for a different person is refused (409); nobody is added", r.status === 409 && sql(`select count(*) from answer_subject where label='Another Child QA28'`) === "0", r.body?.detail);
  // R1c break report: hostile text never reaches the database as a 500; rules compare numbers; release data fixes
  // A 5,000-deep value, written as text (the test's own JSON.stringify would overflow building it).
  const deepest = (async () => { const res = await fetch(`http://localhost:${PORT}/api/runtime/cases/${fresh}/answers/${freshPrincipal}/person.other_family_name`, { method: "PUT", headers: { "content-type": "application/json", "x-actor": CLIENT, connection: "close" }, body: `{"value":${"[".repeat(5000)}"x"${"]".repeat(5000)},"expectedId":null}` }); return { status: res.status, body: await res.json().catch(() => null) }; })();
  const hostile = await Promise.all([
    call("PUT", `/runtime/cases/${fresh}/answers/${freshPrincipal}/person.other_family_name`, { value: "a\ud800b", expectedId: null }, CLIENT),
    deepest,
    call("POST", `/runtime/cases/${fresh}/people`, { role: "child", displayName: "Sample", idempotencyKey: "abcdefgh\u0000" }, OFFICER),
    call("POST", "/runtime/cases", { combinationId: vv, reference: "REF\u202eabc", clientActor: CLIENT, principal: { displayName: "Sample\u007f" } }, OFFICER),
  ]);
  ok("R1c break m1–m4 fail: a lone surrogate, a 5,000-deep value, a NUL in an idempotency key, a bidi override or DEL in a reference or name are 400 with plain words, never 500", hostile.every((x) => x.status === 400), hostile.map((x) => [x.status, x.body?.detail?.slice(0, 60)]));
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `R1C-ok-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant É 漢字 👩‍👧" } }, OFFICER);
  ok("R1c break m4 pass: accents, other scripts and emoji with joiners stay allowed in names", r.status === 201, r.body?.detail);
  const fv = (await call("GET", `/runtime/cases/${fresh}/questionnaire?mode=agent`, undefined, OFFICER)).body;
  const caseSubj = fv.case.people.find((p: { role: string }) => p.role === "case").subject_id;
  await call("PUT", `/runtime/cases/${fresh}/answers/${caseSubj}/case.funds_available_cad`, { value: "000", expectedId: null }, CLIENT);
  const fv2 = (await call("GET", `/runtime/cases/${fresh}/questionnaire`, undefined, CLIENT)).body;
  ok("R1c break m9 fail-guard: an amount of \"000\" triggers the funds-above-0 check (numbers compare as numbers)", fv2.checks.some((c: { id: string }) => c.id === "VV_FUNDS_ABOVE_ZERO"), fv2.checks);
  const qf = (f: string) => fv.sections.flatMap((x: { questions: Q[] }) => x.questions).filter((q: Q) => q.fact === f);
  ok("R1c break M2/M4 pass: present occupation and current residence country are asked once per person; the union date is not required of a single applicant", qf("person.occupation").every((q: Q) => q.group === null) && qf("person.current_residence_country").every((q: Q) => q.group === null) && qf("relationship.start_date").every((q: Q) => q.required === false), { occupation: qf("person.occupation").map((q: Q) => q.group), start: qf("relationship.start_date").map((q: Q) => q.required) });
  // qa QA-26 (rest) and QA-37: plain words for "applies"; save messages say "form fields" (P-63)
  r = await call("POST", `/runtime/cases/${fresh}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse QA26", applies: "yes" }, OFFICER);
  ok("QA-26 fail: \"applies\" given as text is a 400 in plain words", r.status === 400 && /travelling \(true or false\)/.test(r.body?.detail ?? "") && !/expected boolean/.test(r.body?.detail ?? ""), r.body?.detail);
  const msg = (await call("PUT", `/runtime/cases/${fresh}/answers/${caseSubj}/case.funds_available_cad`, { value: "4000", expectedId: (await call("GET", `/runtime/cases/${fresh}/questionnaire`, undefined, CLIENT)).body.sections.flatMap((x: { questions: Q[] }) => x.questions).find((q: Q) => q.fact === "case.funds_available_cad").answer.id }, CLIENT)).body?.message ?? "";
  ok("QA-37 pass (P-63): the save message names form fields, never boxes", /form fields?\)/.test(msg) && !/\bbox(es)?\b/.test(msg), msg);
  const dbRefuses = (q: string) => { try { sql(q); return false; } catch { return true; } };
  const pinId = sql(`select id from pack_work_pin where case_id='${caseId}' order by revision desc limit 1`), relId = sql(`select config_release_id from pack_work_pin where case_id='${caseId}' order by revision desc limit 1`);
  ok("FIX B4 fail (database): a case's pin cannot be changed, and its release or combination cannot be deleted", dbRefuses(`update pack_work_pin set content_hash='x' where id='${pinId}'`) && dbRefuses(`delete from config_release where id='${relId}'`) && dbRefuses(`delete from combination where id='${vv}'`));
  ok("FIX B4 fail (database): a second pin for the same case and combination is refused", dbRefuses(`insert into pack_work_pin (id, workspace_id, case_id, combination_id, party_id, config_release_id, content_hash, revision, actor_id) select gen_random_uuid(), workspace_id, case_id, combination_id, party_id, config_release_id, content_hash, 2, actor_id from pack_work_pin where id='${pinId}'`));
  const ansId = sql(`select id from client_canonical_answer where subject_id='${principal}' and superseded_by_id is null limit 1`);
  ok("FIX B14 fail (database): an answer cannot be changed in place, supersede itself, or name another person's party; a participant's role is checked", dbRefuses(`update client_canonical_answer set value_json='"x"' where id='${ansId}'`) && dbRefuses(`update client_canonical_answer set superseded_by_id=id where id='${ansId}'`) && dbRefuses(`insert into client_canonical_answer (id, workspace_id, party_id, subject_id, canonical_field_id, canonical_field_key, value_json, status, source_json) select gen_random_uuid(), workspace_id, gen_random_uuid(), subject_id, canonical_field_id, 'person.x', value_json, status, source_json from client_canonical_answer where id='${ansId}'`) && dbRefuses(`update case_participant set role='owner' where case_id='${caseId}' and role='child'`));
  ok("FIX B15 pass: the reset preview lists cases, people and case answers", (await call("GET", "/demo/status", undefined, AUTHOR)).body?.scope?.rows?.Cases > 0 || JSON.stringify((await call("GET", "/demo/status", undefined, AUTHOR)).body).includes("Cases"));

  // ── RT-17 audit and logs never hold answer values
  const audit = sql("select coalesce(string_agg(summary || ' ' || coalesce(detail::text, ''), ' '), '') from audit_event where entity in ('case', 'case fact', 'person', 'row', 'section')");
  const log = readFileSync(LOG, "utf8");
  const secrets = ["SAMPLE-P-1234567", "Sample Employer 3", "client.a@example.com", "Sample Road", "Sample Spouse A", "1990-04-13"];
  ok("RT-17 pass: answers are recorded in the audit trail (who, what, when)", /answered person.passport_number/.test(audit) && /confirmed \d+ answer/.test(audit));
  ok("RT-17 fail-guard: no answer value, name or typed reference appears in the audit trail or the server log (errors only; the bad requests above leave none)", !audit.includes(`R1A-${run}`) && secrets.every((x) => !audit.includes(x) && !log.includes(x)), secrets.filter((x) => audit.includes(x) || log.includes(x)));

  // ── S-7 reset (last: it empties the copy): cases, people and answers go with the disposable workspace
  if (process.argv.includes("--reset")) {
    r = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    ok("S-7 pass: reset removes cases, people, answers and rows with the workspace", r.status < 300 && ["runtime_case", "party", "answer_subject", "client_canonical_answer", "client_fact_record", "pack_work_pin"].every((t) => sql(`select count(*) from ${t}`) === "0"), r.status < 300 ? undefined : r.body);
  }

  process.exitCode = summary() ? 1 : 0;
}

await main();
