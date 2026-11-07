// C3.16 x C1.3 second lander (tech lead on #1054, comment 6650232198; row A5): #1051 copies employer facts with
// carriedFacts, so once C3.16 marks a field Organisation the copy must land where the one reader reads it, the case's
// own record. On the configured checkpoint (With an LMIA – inside Canada released): named scaffolding (P-33) marks the
// employer name Organisation in SQL (a published field refuses a scope through the product, SA-1B-130 rule 4), the
// release's own steps (submit, sign off, approve) release it again; then a link puts the answer on the case subject, the
// question shows it there, the principal's IMM 5710 box reads it, and a value typed beforehand shows Different and is
// replaced only when asked. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh c316l 4442 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/check_c316_link_second_lander.ts 4442 xr_studio_c316l
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4442), DB = process.argv[3] ?? "xr_studio_c316l";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const REP = "user-R", OFFICER = "user-O", CLIENT = "user-P", AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";
const EMPLOYER = "sample-employer-1", NAME = "organisation.employer_name";
const run = Date.now().toString(36);
type Q = { subjectId: string; fact: string; answer: { value: unknown; channel: string } | null; fills: { form: string; person: string; subject?: string }[] };

const wp = sql("select id from combination where combination_key='wp.lmia_inside'");
ok("setup: With an LMIA – inside Canada is released on this copy (the configured checkpoint)", !!wp && sql(`select count(*) from config_release where combination_id='${wp}'`) !== "0");
if (!wp) process.exit(2);

// Scaffolding (P-33): the scope set in SQL on the employer name, then released again through the release's own steps.
sql(`update canonical_field set scope='ORGANISATION' where canonical_field_key='${NAME}'`);
const before = Number(sql(`select coalesce(max(version),0) from config_release where combination_id='${wp}'`));
const sub = await call("POST", `/combinations/${wp}/submit`, { note: "C3.16 second lander: release again with the employer name marked Organisation (scaffolding, P-33)" }, AUTHOR);
const items = ((sub.body?.changeSummary ?? []) as { kind: string; key: string }[]).map((c) => `${c.kind}|${c.key}`);
if (sub.status < 300 && items.length) await call("POST", `/combinations/${wp}/signoff`, { items, action: "signed", note: "C3.16 second lander: signed as the SME (test)" }, REVIEWER);
const ap = sub.status < 300 ? await call("POST", `/combinations/${wp}/approve`, {}, APPROVER) : sub;
const rel = Number(sql(`select coalesce(max(version),0) from config_release where combination_id='${wp}'`));
ok("setup (scaffolding): the work permit released again through submit, sign off and approve", rel === before + 1, [sub.status, String(sub.body?.detail ?? "").slice(0, 200), ap.status, String(ap.body?.detail ?? "").slice(0, 200)]);
ok("setup (data): the new release marks the employer name's placement Organisation", sql(`select count(*) from config_release where combination_id='${wp}' and version=${rel} and snapshot->'placements' @> '[{"fact":"${NAME}","scope":"organisation"}]'`) !== "0");

const opened = await call("POST", "/runtime/cases", { combinationId: wp, reference: `C316L-${run}`, clientActor: CLIENT, principal: { displayName: "Client A" } }, REP);
const people = (opened.body?.people ?? []) as { subject_id: string; role: string }[];
const principal = people.find((p) => p.role === "principal")?.subject_id ?? "", filing = people.find((p) => p.role === "case")?.subject_id ?? "", caseId = opened.body?.id as string;
ok("setup: a work-permit case opens on the new release", !!caseId && !!filing && !!principal, opened.status);
const questions = async (): Promise<Q[]> => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions);

// A value typed beforehand, on the case's own record (where the marked field is asked).
const typed = await call("PUT", `/runtime/cases/${caseId}/answers/${filing}/${NAME}`, { value: "Another Employer Ltd (Sample)", expectedId: null }, OFFICER);
ok("setup: the officer typed another employer name on the application", typed.status === 200, [typed.status, typed.body?.detail]);
const list = (await call("GET", `/runtime/cases/${caseId}/employer-cases`, undefined, OFFICER)).body;
const ec = list?.employer_cases?.find((e: { key: string }) => e.key === EMPLOYER);
const nameLine = ec?.facts?.find((f: { fact: string }) => f.fact === NAME) as { fact: string; subject_id: string; state: string; current: { answer_id: string } | null } | undefined;
ok("C3.16 x C1.3 pass: the link would write the marked employer name on the case's own record, not the principal", nameLine?.subject_id === filing, nameLine);
ok("C3.16 x C1.3 pass (BR-4): against the value typed beforehand it reads Different", nameLine?.state === "different", nameLine?.state);

const seen = Object.fromEntries((ec?.facts ?? []).map((f: { fact: string; current: { answer_id: string } | null }) => [f.fact, f.current?.answer_id ?? null]));
const keep = await call("POST", `/runtime/cases/${caseId}/employer-link`, { employerCase: EMPLOYER, seen }, OFFICER);
const afterKeep = (await questions()).filter((q) => q.fact === NAME);
ok("C3.16 x C1.3 fail (BR-4): linking without Replace keeps the typed name (nothing overwritten silently)", keep.status < 300 && afterKeep.length === 1 && afterKeep[0].answer?.value === "Another Employer Ltd (Sample)", [keep.status, keep.body?.detail, afterKeep.map((q) => q.answer?.value)]);

// A second case: no value typed, so the copy is New and lands on the case.
const second = await call("POST", "/runtime/cases", { combinationId: wp, reference: `C316L2-${run}`, clientActor: CLIENT, principal: { displayName: "Client B" } }, REP);
const p2 = (second.body?.people ?? []) as { subject_id: string; role: string }[], c2 = second.body?.id as string;
const filing2 = p2.find((p) => p.role === "case")?.subject_id ?? "", principal2 = p2.find((p) => p.role === "principal")?.subject_id ?? "";
const ec2 = (await call("GET", `/runtime/cases/${c2}/employer-cases`, undefined, OFFICER)).body?.employer_cases?.find((e: { key: string }) => e.key === EMPLOYER);
const seen2 = Object.fromEntries((ec2?.facts ?? []).map((f: { fact: string; current: { answer_id: string } | null }) => [f.fact, f.current?.answer_id ?? null]));
const linked = await call("POST", `/runtime/cases/${c2}/employer-link`, { employerCase: EMPLOYER, seen: seen2 }, OFFICER);
const onCase = sql(`select count(*) from client_canonical_answer where subject_id='${filing2}' and canonical_field_key='${NAME}' and superseded_by_id is null and source_json->>'channel'='linked_file'`);
const onPrincipal = sql(`select count(*) from client_canonical_answer where subject_id='${principal2}' and canonical_field_key='${NAME}' and superseded_by_id is null`);
ok("C3.16 x C1.3 pass: the link puts the employer name on the case subject once (linked from the employer case)", linked.status < 300 && onCase === "1", [linked.status, linked.body?.detail, onCase]);
ok("C3.16 x C1.3 fail: nothing is written on the principal's own record", onPrincipal === "0", onPrincipal);
const q2 = ((await call("GET", `/runtime/cases/${c2}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions).filter((q: Q) => q.fact === NAME);
ok("C3.16 x C1.3 pass: the question is asked once, on the application, and shows the linked value", q2.length === 1 && q2[0].subjectId === filing2 && q2[0].answer?.channel === "linked_file", q2.map((q) => [q.subjectId === filing2 ? "case" : q.subjectId, q.answer?.channel]));
ok("C3.16 x C1.3 pass: the principal's IMM 5710 box reads that one value", (q2[0]?.fills ?? []).some((f) => f.form === "IMM 5710" && (f.subject === principal2 || f.person === "Client B")), q2[0]?.fills);

process.exit(summary() ? 1 : 0);
