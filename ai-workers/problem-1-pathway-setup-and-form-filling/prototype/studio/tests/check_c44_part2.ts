// C4.4 part 2 (runtime lane, swarm B3c; P-47 tiers 2 and 3, PQR mode, RT-7; P-71): what part 1 left. A pass and a fail
// per rule, on the engine (no server) and on a Visitor visa case through the API:
//   R1 each section carries an error summary (GOV.UK pattern): every answer with a problem and every fired section check
//      on it, each naming its field (and row) so the screen links to it; a section with neither has an empty summary.
//   R2 a fired section check keeps the forms that read its fact from being ready to file, in its own words ("a check
//      fired"); it never blocks saving (P-71); once the answers no longer fire it, it no longer blocks.
//   R3 rules as data (RT-7): the author adds a section check to a combination's draft through the API; a case officer
//      cannot (403); a condition outside the closed vocabulary, a message under 5 characters, a question that is not a
//      library field or another group are refused in words (400); no source quote = labelled Sample, a quote = not.
//   R4 tier 3: the independent review is the officer's (a client gets 403); with live AI off it is refused in words at
//      US$0 and changes no answer (P-175).
//   R5 PQR mode: only the questions the release ticks Prospect questionnaire (PQR), per person role, with one plain result line
//      that never decides eligibility: what is left to answer, else "Looks eligible so far"; none ticked says so.
// Adopts acceptance/C4.4.test.ts part 2 (pack 3). Rules only, no AI (US$0). Sample values.
// The suite prepares its own copy (tests/runtime/prepare_c44.cjs: the Visitor visa release, then the C4.4 Sample types).
//   zsh studio/tools/isolated.sh runtime_c44p2 4439 start && tsx studio/tests/check_c44_part2.ts 4439 xr_studio_runtime_c44p2
import { caseView, pqrView, type Answer, type Participant } from "../engine/runtime/case.ts";
import { readiness } from "../engine/runtime/forms.ts";
import { client, recorder } from "./runtime/api.ts";
import { createRequire } from "node:module";
const { prepareC44 } = createRequire(import.meta.url)("./runtime/prepare_c44.cjs") as { prepareC44: (port: number, db: string) => void };

const PORT = Number(process.argv[2] ?? 4439), DB = process.argv[3] ?? "xr_studio_runtime_c44p2";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", OFFICER = "user-O", CLIENT = "user-P";
const words = (r: { body: unknown }) => { const b = r.body as { detail?: string; message?: string; errors?: { message: string }[] } | null; return String(b?.errors?.[0]?.message ?? b?.detail ?? b?.message ?? ""); };
type Q = { fact: string; subjectId: string; pre_qualification?: boolean; answer: unknown };
type Sec = { subjectId: string; section: string; questions: Q[]; problems: { kind: string; field: string; subjectId: string; row: string | null; label: string; message: string; check?: string }[] };

(async () => {
  try { prepareC44(PORT, DB); } catch (e) { ok("setup: the copy is prepared (Visitor visa released, C4.4 Sample types added)", false, String(e)); summary(); process.exit(1); }
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  const rel = sql(`select snapshot::text from config_release where combination_id = '${vv}' order by version desc limit 1`);
  if (!vv || !rel) { ok("setup: the Visitor visa release exists (run setup_visitor_visa.ts and setup_c44_types.ts first)", false); summary(); process.exit(1); }
  const snap = JSON.parse(rel);

  // ── R5 on the engine: no ticks → no questions and a line that says so (fail side); ticks → only those (pass side).
  const people: Participant[] = [{ subjectId: "c", role: "case", label: "The application", applies: true }, { subjectId: "p1", role: "principal", label: "Sample Applicant A", applies: true }];
  const none = pqrView({ ...snap, fact_sources: [] }, people, caseView({ ...snap, fact_sources: [] }, people, [], [], "agent"));
  ok("R5 fail: a release with no Prospect questionnaire (PQR) ticks asks nothing in PQR mode and says so in words", none.questions.length === 0 && /No Prospect questionnaire \(PQR\) questions/.test(none.result), none.result);
  const ticked = pqrView(snap, people, caseView(snap, people, [], [], "agent"));
  ok("R5 pass: PQR asks only the ticked facts for the ticked role, each flagged pre_qualification", ticked.questions.length === 2 && ticked.questions.every((q) => q.pre_qualification === true && q.subjectId === "p1" && ["person.refused_visa_or_entry", "person.criminal_history"].includes(q.fact)), ticked.questions.map((q) => q.fact));
  ok("R5 fail: with the ticked questions unanswered the result says how many are left, never a verdict", /^2 of 2 Prospect questionnaire \(PQR\) questions still to answer/.test(ticked.result), ticked.result);
  const ans = (field: string, value: unknown): Answer => ({ id: field, subjectId: "p1", field, rowKey: null, value, status: "DECLARED", channel: "agent_view", actor: OFFICER, at: "2026-11-01T12:00:00Z" });
  const done = pqrView(snap, people, caseView(snap, people, [ans("person.refused_visa_or_entry", false), ans("person.criminal_history", false)], [], "agent"));
  ok("R5 pass: with both answered the result is \"Looks eligible so far\" and says it is not a decision", /^Looks eligible so far/.test(done.result) && /not a decision/.test(done.result), done.result);

  // ── R1 and R2 on the engine: a fired section check on a fact a form reads blocks that form, named by its words.
  const vcase = (answers: Answer[]) => caseView(snap, people, answers, [], "agent", new Date("2026-11-01T12:00:00Z"));
  const caseAns = (field: string, value: unknown): Answer => ({ ...ans(field, value), subjectId: "c" });
  const crossed = vcase([caseAns("case.intended_stay_from", "2027-03-10"), caseAns("case.intended_stay_to", "2027-03-01")]);
  const fired = crossed.checks.find((c) => /ends before it starts/.test(c.message));
  const blocker = (v: typeof crossed) => readiness(v, "IMM 5257", "p1").missing.find((m) => m.reason === "a check fired" && /ends before it starts/.test(m.label));
  ok("R2 fail: the visit ending before it starts keeps IMM 5257 from being ready to file for the principal, in the check's words", !!fired && !!blocker(crossed) && readiness(crossed, "IMM 5257", "p1").ready === false, readiness(crossed, "IMM 5257", "p1").missing.filter((m) => m.reason === "a check fired"));
  const straight = vcase([caseAns("case.intended_stay_from", "2027-03-01"), caseAns("case.intended_stay_to", "2027-03-10")]);
  ok("R2 pass: dates in order fire no check, so no check blocks IMM 5257", !straight.checks.some((c) => /ends before it starts/.test(c.message)) && !blocker(straight));
  // Review c44-part2 M1 (P-168, P-136): only a section check blocks; advice, readiness warnings and official rules still
  // waiting for the expert fire on the same fact and only warn.
  const onTo = { subjectKind: "CASE", op: "eq", field: "case.intended_stay_to", value: "2027-03-10" };
  const advisory = { ...snap, checks: [...snap.checks, { id: "T_ADVISE", group: "readiness_warning", severity: "advise", condition: onTo, applies_to: "case.intended_stay_to", message: "Sample advice on the end date.", illustrative: true }, { id: "T_SME", group: "official_rule", severity: "sme_pending", condition: onTo, applies_to: "case.intended_stay_to", message: "Sample official rule waiting for the expert.", illustrative: true }] };
  const adv = caseView(advisory, people, [caseAns("case.intended_stay_from", "2027-03-01"), caseAns("case.intended_stay_to", "2027-03-10")], [], "agent", new Date("2026-11-01T12:00:00Z"));
  ok("R2 pass: an advisory readiness warning and an official rule waiting for the expert fire on the end date and only warn: IMM 5257 has no \"a check fired\"", ["T_ADVISE", "T_SME"].every((id) => adv.checks.some((c) => c.id === id)) && !readiness(adv, "IMM 5257", "p1").missing.some((m) => m.reason === "a check fired"), { fired: adv.checks.map((c) => c.id), blocked: readiness(adv, "IMM 5257", "p1").missing.filter((m) => m.reason === "a check fired") });
  const secOf = (v: typeof crossed, fact: string) => (v.sections as Sec[]).find((s) => s.questions.some((q) => q.fact === fact));
  const crossedSec = secOf(crossed, "case.intended_stay_to");
  ok("R1 fail: the section holding the dates lists the fired check in its error summary, linked to its field", !!crossedSec?.problems.some((p) => p.kind === "check" && p.field === "case.intended_stay_to" && p.subjectId === "c" && /ends before it starts/.test(p.message) && p.check === fired?.id), crossedSec?.problems);
  ok("R1 pass: with the dates in order that section's summary is empty", (secOf(straight, "case.intended_stay_to")?.problems ?? [null]).length === 0, secOf(straight, "case.intended_stay_to")?.problems);
  const badBirth = vcase([ans("person.date_of_birth", "2031-13-40")]);
  const birthSec = secOf(badBirth, "person.date_of_birth");
  ok("R1 fail: an answer with a problem is listed in its section's summary, with the question's words and the problem", !!birthSec?.problems.some((p) => p.kind === "field" && p.field === "person.date_of_birth" && p.subjectId === "p1" && p.row === null && p.label.length > 3 && p.message.length > 8), birthSec?.problems);
  ok("R1 pass: a valid birth date leaves nothing in that summary for it", !(secOf(vcase([ans("person.date_of_birth", "1990-05-17")]), "person.date_of_birth")?.problems ?? []).some((p) => p.field === "person.date_of_birth"));

  // ── Through the API: a Visitor visa case.
  const c = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C44P2-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  const caseId = c.body?.id ?? c.body?.case?.id;
  const got = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body;
  const principal = got?.people?.find((p: { role: string }) => p.role === "principal")?.subject_id, caseSubject = got?.people?.find((p: { role: string }) => p.role === "case")?.subject_id;
  ok("setup: a Visitor visa case with its principal applicant", !!caseId && !!principal && !!caseSubject, { status: c.status, words: words(c) });
  if (!caseId || !principal || !caseSubject) { summary(); process.exit(1); }
  const put = (subject: string, field: string, value: unknown, actor = OFFICER, expectedId: string | null = null) => call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${field}`, { value, expectedId }, actor);

  // R2 through the API: saving the crossed dates is never refused (P-71), and the form says why it is not ready.
  const s1 = await put(caseSubject, "case.intended_stay_from", "2027-03-10"), s2 = await put(caseSubject, "case.intended_stay_to", "2027-03-01");
  ok("R2 pass (P-71): the dates that fire the check are saved (200), never refused", s1.status === 200 && s2.status === 200, [s1.status, s2.status]);
  const forms = async () => { const b = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body; return ((Array.isArray(b) ? b : b?.forms ?? []) as { form: string; subject_id: string; readiness: { ready: boolean; missing: { reason: string; label: string }[] } }[]).find((f) => f.form === "IMM 5257" && f.subject_id === principal); };
  const f1 = await forms();
  ok("R2 fail (API): IMM 5257 for the principal is not ready to file and names the fired check", f1?.readiness.ready === false && f1.readiness.missing.some((m) => m.reason === "a check fired" && /ends before it starts/.test(m.label)), f1?.readiness.missing.filter((m) => m.reason === "a check fired"));
  const v1 = (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body;
  ok("R1 (API): the agent view's section carries the fired check in its summary", (v1?.sections as Sec[] | undefined)?.some((s) => s.problems.some((p) => p.kind === "check" && /ends before it starts/.test(p.message))) === true);
  const s3 = await put(caseSubject, "case.intended_stay_to", "2027-03-20", OFFICER, s2.body?.answer?.id ?? null);
  ok("setup: the end date is corrected (200)", s3.status === 200, { status: s3.status, words: words(s3) });
  const f2 = await forms();
  ok("R2 pass (API): once the visit ends after it starts, the check no longer blocks IMM 5257", !!f2 && !f2.readiness.missing.some((m) => m.reason === "a check fired"), f2?.readiness.missing.filter((m) => m.reason === "a check fired"));

  // R3: authoring a section check through the API (RT-7).
  const cond = { subjectKind: "CASE", op: "lt", field: "case.funds_available_cad", value: 1000 };
  const base = { group: "section_check", appliesTo: "case.funds_available_cad", condition: cond, message: "Funds under CAD 1,000 for the visit. Check the amount (Sample threshold)." };
  const a1 = await call("POST", `/combinations/${vv}/checks`, base, AUTHOR);
  ok("R3 pass: the author adds a section check to the draft (2xx), kept as data, labelled Sample without a source", a1.status >= 200 && a1.status < 300 && a1.body?.illustrative === true && sql(`select status || '|' || illustrative || '|' || check_group from check_def where combination_id = '${vv}' and check_key = '${a1.body?.key}'`) === "DRAFT|true|section_check", { status: a1.status, body: a1.body });
  const a2 = await call("POST", `/combinations/${vv}/checks`, { ...base, message: "Funds under CAD 900 (Sample).", condition: { ...cond, value: 900 }, sourceQuote: "Sample quote for the test, not IRCC's words." }, AUTHOR);
  ok("R3 pass: a check with a source quote is not labelled Sample", a2.status >= 200 && a2.status < 300 && a2.body?.illustrative === false, a2.body);
  const before = sql(`select count(*) from check_def where combination_id = '${vv}'`);
  const dup = await call("POST", `/combinations/${vv}/checks`, base, AUTHOR);
  ok("R3 fail (review m1): the same check again is refused (409), never saved twice", dup.status === 409 && /already in the draft/.test(words(dup)), { status: dup.status, words: words(dup) });
  const off = await call("POST", `/combinations/${vv}/checks`, base, OFFICER);
  ok("R3 fail: a case officer cannot author a check (403)", off.status === 403, off.status);
  const badOp = await call("POST", `/combinations/${vv}/checks`, { ...base, condition: { ...cond, op: "covers_years" } }, AUTHOR);
  ok("R3 fail: a condition outside the closed vocabulary is refused in words (400)", badOp.status === 400 && /Condition/.test(words(badOp)), { status: badOp.status, words: words(badOp) });
  const short = await call("POST", `/combinations/${vv}/checks`, { ...base, message: "x" }, AUTHOR);
  ok("R3 fail: a message under 5 characters is refused in words (400)", short.status === 400 && /plain words/.test(words(short)), words(short));
  const phrase = await call("POST", `/combinations/${vv}/checks`, { ...base, appliesTo: "Funds for the visit" }, AUTHOR);
  ok("R3 fail: a question named by a phrase, not a library field, is refused in words (400)", phrase.status === 400 && /field of the library/.test(words(phrase)), words(phrase));
  const group = await call("POST", `/combinations/${vv}/checks`, { ...base, group: "official_rule" }, AUTHOR);
  ok("R3 fail: another group of check is refused here (400)", group.status === 400 && /section check/.test(words(group)), words(group));
  ok("R3: no refused request wrote a check", sql(`select count(*) from check_def where combination_id = '${vv}'`) === before);

  // R4: tier 3, the independent review (live AI is off on every test copy).
  const answers = () => sql(`select count(*) || '§' || coalesce(max(effective_at)::text, '') from client_canonical_answer`);
  const at = answers();
  const rv = await call("POST", `/runtime/cases/${caseId}/review`, {}, OFFICER);
  ok("R4 pass: the officer's review is refused in words at US$0 while live AI is off (409), changing no answer", rv.status === 409 && /live AI is off/.test(words(rv)) && /US\$0/.test(words(rv)) && answers() === at, { status: rv.status, words: words(rv) });
  const rc = await call("POST", `/runtime/cases/${caseId}/review`, {}, CLIENT);
  ok("R4 fail: a client cannot run the review (403)", rc.status === 403, rc.status);

  // R5 through the API: the officer's PQR and the client's (PQR ⊂ SQR).
  const pq = await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=pqr`, undefined, OFFICER);
  ok("R5 pass (API): PQR answers 200 with the two ticked questions for the principal and a result line", pq.status === 200 && pq.body?.mode === "pqr" && (pq.body?.questions as Q[]).length === 2 && (pq.body.questions as Q[]).every((q) => q.pre_qualification && q.subjectId === principal) && typeof pq.body?.result === "string", { status: pq.status, n: pq.body?.questions?.length, result: pq.body?.result });
  await put(principal, "person.refused_visa_or_entry", false, CLIENT); await put(principal, "person.criminal_history", false, CLIENT);
  const pc = await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=pqr`, undefined, CLIENT);
  ok("R5 pass (API): the client's PQR shows the same two questions, answered, and \"Looks eligible so far\"", pc.status === 200 && (pc.body?.questions as Q[]).length === 2 && (pc.body.questions as Q[]).every((q) => !!q.answer) && /^Looks eligible so far/.test(pc.body?.result), { status: pc.status, result: pc.body?.result });
  const other = await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=pqr`, undefined, "user-Q");
  ok("R5 fail (API): someone not on the case reaches no PQR", other.status === 403 || other.status === 404 || other.status === 401, other.status);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { ok("the run ends without an error", false, String(e)); summary(); process.exit(1); });
