// qa lane, R1a runtime thin slice (case, people, answers, Confirm section): independent API probes of C6.1, C6.2, C6.3,
// C6.6 and C6.10 with inputs the builders' suite does not use — wrong role and wrong case by id, an unreleased or unknown
// combination, answers of the wrong type, very long and non-English text, impossible and future dates, the same person
// added twice, two confirmations at once, stale versions, answers for a minor and for an adult (P-78), confirmed and
// unconfirmed facts at the fill boundary (P-72), and the Problem Details shape and words of every refusal. Reproduces
// the open PR-review findings D1 (Confirm section blocked by a removed row's answers) and D2 (`ageOn` accepts impossible
// and future dates): both FAIL until fixed. No browser, no model call (US$0). Every person and value is Sample.
// The fill itself is R1d (not built): P-72 is checked where the fill reads, the renderer's box coverage (fill.ts writes
// only boxes whose coverage is "confirmed fact").
//   zsh tools/isolated.sh qa_rt 4474 start
//   tsx --tsconfig api/tsconfig.json tests/runtime/setup_visitor_visa.ts 4474 xr_studio_qa_rt
//   tsx --tsconfig api/tsconfig.json tests/qa/check_qa_r1a_probe.ts 4474 xr_studio_qa_rt
// Rerunnable on the same copy (each run opens its own cases). Exit 1 on any FAIL.
import { execFileSync } from "node:child_process";
import { request } from "node:http";
import { render, type Person } from "../../engine/render.ts";
import { knownOf, type Answer, type Participant, type Row } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";

const PORT = Number(process.argv[2] ?? 4474), DB = process.argv[3] ?? "xr_studio_qa_rt";
if (PORT === 4400) { console.error("refused: never the shared demo on :4400"); process.exit(2); }
const OFFICER = "user-O", CLIENT = "user-P", CLIENT_B = "user-Q", AUTHOR = "user-A";
const run = Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); return c; };
const note = (name: string, detail?: unknown) => console.log(`NOTE  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
const sql = (q: string) => execFileSync("/usr/local/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
type Res = { status: number; type: string; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose test reads
/** node:http without keep-alive (fetch reuses sockets the server closed); `raw` sends the body as given (malformed JSON). */
const call = (method: string, path: string, body?: unknown, actor: string | null = OFFICER, raw?: string): Promise<Res> => new Promise((resolve, reject) => {
  const data = raw !== undefined ? Buffer.from(raw) : body === undefined ? undefined : Buffer.from(JSON.stringify(body));
  const headers: Record<string, string | number> = { "content-type": "application/json", ...(data ? { "content-length": data.length } : {}) };
  if (actor !== null) headers["x-actor"] = actor;
  const req = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method, headers, agent: false }, (res) => {
    const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c));
    res.on("end", () => { const t = Buffer.concat(chunks).toString("utf8"); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } resolve({ status: res.statusCode ?? 0, type: String(res.headers["content-type"] ?? ""), body: j }); });
  });
  req.on("error", reject); if (data) req.write(data); req.end();
});

/** Every refusal: RFC 9457 shape, the problem media type, no server error and no database or stack text (the library's
 *  default wording is checked on the lines that send such input). */
const problems: { where: string; status: number; detail: string }[] = [];
const ZOD_OR_TECH = /Invalid uuid|Invalid UUID|Invalid input|Expected \w+, received|Required$|Invalid input|prisma|Prisma|P20\d\d|at [A-Za-z]+ \(|TypeError|undefined|null value|violates|constraint/;
const refusal = (where: string, r: Res) => {
  const b = r.body ?? {};
  const words = [b.detail, ...(b.errors ?? []).map((e: { message: string }) => e.message)].filter(Boolean).join(" | ");
  const shaped = typeof b === "object" && typeof b.type === "string" && typeof b.title === "string" && b.status === r.status && typeof b.detail === "string" && /application\/problem\+json/.test(r.type);
  if (!shaped || /prisma|Prisma|P20\d\d|at [A-Za-z]+ \(|TypeError|violates|constraint/.test(words) || r.status >= 500) problems.push({ where, status: r.status, detail: words.slice(0, 160) });
  return r;
};

type Q = { subjectId: string; fact: string; section: string; group: string | null; answer: any; rows: any[]; options: { key: string }[] | null }; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose test reads
const qs = (v: any): Q[] => (v?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions); // eslint-disable-line @typescript-eslint/no-explicit-any -- loose test reads

async function main() {
  const vv = sql("select id from combination where combination_key='vv.single'");
  if (!vv || sql(`select count(*) from config_release where combination_id='${vv}'`) === "0") { console.log("Run setup_visitor_visa.ts on this copy first: the visitor visa is not released here."); process.exit(2); }

  // ── helpers bound to one case
  const open = async (tag: string, clientActor = CLIENT) => {
    const r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `QA-${tag}-${run}`, clientActor, principal: { displayName: `Sample Applicant ${tag}` } });
    if (r.status !== 201) throw new Error(`could not open a case: ${r.status} ${JSON.stringify(r.body)}`);
    const people = r.body.people as { subject_id: string; role: string }[];
    return { id: r.body.id as string, principal: people.find((p) => p.role === "principal")!.subject_id, app: people.find((p) => p.role === "case")!.subject_id };
  };
  const agent = async (caseId: string) => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`)).body;
  const q = async (caseId: string, subject: string, fact: string) => qs(await agent(caseId)).find((x) => x.subjectId === subject && x.fact === fact);
  const put = (caseId: string, subject: string, fact: string, value: unknown, expectedId: string | null, actor = CLIENT, row?: string) =>
    call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId, ...(row ? { row } : {}) }, actor);
  /** Answer against whatever is current now (a person who just looked). */
  const answer = async (caseId: string, subject: string, fact: string, value: unknown, actor = CLIENT, row?: string) => {
    const cur = await q(caseId, subject, fact);
    const exp = row ? cur?.rows.find((x) => x.row === row)?.answer?.id ?? null : cur?.answer?.id ?? null;
    return put(caseId, subject, fact, value, exp, actor, row);
  };
  const seenIn = async (caseId: string, subject: string, section: string) => (await agent(caseId)).sections
    .filter((s: { subjectId: string; section: string }) => s.subjectId === subject && s.section === section)
    .flatMap((s: { questions: Q[] }) => s.questions).flatMap((x: Q) => (x.group ? x.rows.map((r) => r.answer?.id) : [x.answer?.id])).filter(Boolean) as string[];
  const confirm = (caseId: string, section: string, subjectId: string, seen: string[], actor = OFFICER) => call("POST", `/runtime/cases/${caseId}/sections/${section}/confirm`, { subjectId, seen }, actor);

  // ================================================================ C6.1 open a case: wrong role, unknown or unreleased combination
  let r = refusal("create by client", await call("POST", "/runtime/cases", { combinationId: vv, reference: `QA-X-${run}`, clientActor: CLIENT, principal: { displayName: "Sample X" } }, CLIENT));
  ok("C6.1 a client cannot open a case (403)", r.status === 403, r.body?.detail);
  r = refusal("create unknown combination", await call("POST", "/runtime/cases", { combinationId: "00000000-0000-4000-8000-000000000000", reference: `QA-U-${run}`, clientActor: CLIENT, principal: { displayName: "Sample U" } }));
  ok("C6.1 an unknown combination id is a 404 in plain words", r.status === 404 && /No such combination/.test(r.body?.detail), r.body?.detail);
  const draftOnly = sql(`select c.id from combination c where not exists (select 1 from config_release r where r.combination_id=c.id) order by c.combination_key limit 1`);
  r = refusal("create unreleased", await call("POST", "/runtime/cases", { combinationId: draftOnly, reference: `QA-NR-${run}`, clientActor: CLIENT, principal: { displayName: "Sample NR" } }));
  ok("C6.1 a combination with no release takes no case (409) and nothing is written", r.status === 409 && /no released version/.test(r.body?.detail) && sql(`select count(*) from runtime_case where reference='QA-NR-${run}'`) === "0", r.body?.detail);
  r = refusal("create bad combination id", await call("POST", "/runtime/cases", { combinationId: "visitor-visa", reference: `QA-B-${run}`, clientActor: CLIENT, principal: { displayName: "Sample B" } }));
  ok("C6.1 a combination named by text, not id, is a 400 field error", r.status === 400 && r.body?.errors?.[0]?.field === "combinationId", r.body?.errors);
  r = refusal("create malformed JSON", await call("POST", "/runtime/cases", undefined, OFFICER, "{\"combinationId\": "));
  ok("C6.1 a malformed request body is a 400, not a server error", r.status === 400, { status: r.status, detail: r.body?.detail });
  const ref = "Référence — दिल्ली 北京 ✈";
  r = await call("POST", "/runtime/cases", { combinationId: vv, reference: `${ref} ${run}`, clientActor: CLIENT, principal: { displayName: "Client Á (Sample) — Ærøskøbing Ñandú" } });
  ok("C6.1 a non-English reference and principal label are kept exactly", r.status === 201 && r.body.reference === `${ref} ${run}` && r.body.people.some((p: { label: string }) => p.label === "Client Á (Sample) — Ærøskøbing Ñandú"), { reference: r.body?.reference });

  const A = await open("A");
  const B = await open("B", CLIENT_B);

  // ================================================================ C6.10 wrong case by id, wrong role
  r = refusal("client B reads A", await call("GET", `/runtime/cases/${A.id}/questionnaire`, undefined, CLIENT_B));
  const rb1 = refusal("client B answers A", await put(A.id, A.principal, "person.marital_status", "single", null, CLIENT_B));
  const rb2 = refusal("client B adds row on A", await call("POST", `/runtime/cases/${A.id}/groups/${A.principal}/rows`, { group: "employment_history" }, CLIENT_B));
  ok("C6.10 another client is told case A does not exist, for reading, answering and adding a row (404)", [r.status, rb1.status, rb2.status].every((s) => s === 404), [r.status, rb1.status, rb2.status]);
  r = refusal("A path, B person", await put(A.id, B.principal, "person.marital_status", "single", null, CLIENT));
  ok("C6.10 a person of another case named on this case's address is refused (404) and nothing is stored on either", r.status === 404 && sql(`select count(*) from client_canonical_answer where subject_id='${B.principal}'`) === "0", r.body?.detail);
  r = refusal("confirm other case person", await confirm(A.id, "personal_details", B.principal, []));
  ok("C6.10 Confirm section for a person of another case is refused (404)", r.status === 404, r.body?.detail);
  r = refusal("unknown actor", await put(A.id, A.principal, "person.marital_status", "single", null, "admin"));
  const r2 = refusal("no actor", await put(A.id, A.principal, "person.marital_status", "single", null, null));
  ok("C6.10 an unknown or missing person is refused (401) before anything else", r.status === 401 && r2.status === 401, [r.status, r2.status]);
  r = refusal("author answers", await put(A.id, A.app, "case.funds_available_cad", 100, null, AUTHOR));
  const ra = refusal("approver confirms", await confirm(A.id, "personal_details", A.principal, [], "user-B"));
  ok("C6.10 configuration people (author, approver) cannot answer or confirm (403)", r.status === 403 && ra.status === 403, [r.status, ra.status]);
  r = refusal("client confirms", await confirm(A.id, "personal_details", A.principal, [], CLIENT));
  ok("C6.10 the client cannot press Confirm section (403)", r.status === 403, r.body?.detail);
  r = refusal("client types passport", await put(A.id, A.principal, "person.passport_number", "SAMPLE-X1", null, CLIENT));
  const rd = refusal("client types DOB", await put(A.id, A.principal, "person.date_of_birth", "1990-01-01", null, CLIENT));
  ok("C6.10 the client cannot type document facts (passport number, date of birth): 403", r.status === 403 && rd.status === 403, [r.status, rd.status]);
  r = refusal("case id not a uuid", await call("GET", "/runtime/cases/not-a-case/questionnaire?mode=agent"));
  const rr = refusal("row id not a uuid", await call("DELETE", `/runtime/cases/${A.id}/groups/${A.principal}/rows/not-a-row`, undefined, CLIENT));
  ok("C6.10 an id that is not an id (case, row) is a 404, never a server error", r.status === 404 && rr.status === 404, [r.status, rr.status]);

  // ================================================================ C6.2 people: duplicates, limits, wrong values
  const addChild = (caseId: string, name: string, extra: Record<string, unknown> = {}) => call("POST", `/runtime/cases/${caseId}/people`, { role: "child", displayName: name, ...extra });
  const spouse = (await call("POST", `/runtime/cases/${A.id}/people`, { role: "spouse_or_partner", displayName: "Sample Spouse Ä" })).body.subject_id as string;
  const c1 = await addChild(A.id, "Sample Child Ω"), c2 = await addChild(A.id, "Sample Child Ω");
  ok("C6.2 two children with the same display name (twins, or a double click) are both added as separate people", c1.status === 201 && c2.status === 201 && c1.body.subject_id !== c2.body.subject_id, [c1.status, c2.status]);
  // QA-28 (fixed on 12e7207 with an idempotency key): a double click sends the same key twice at once → one person.
  const kc = `qa-dbl-${run}`, K = await open("K"); // its own case, so the children limit of case A is untouched
  const [dbl1, dbl2] = await Promise.all([addChild(K.id, "Sample Child Dbl", { idempotencyKey: kc }), addChild(K.id, "Sample Child Dbl", { idempotencyKey: kc })]);
  const dblRows = Number(sql(`select count(*) from case_participant where case_id='${K.id}' and idempotency_key='${kc}'`));
  ok("QA-28 a double click on Add child (the same idempotency key sent twice at once) adds one person; both answers name it", dbl1.status < 300 && dbl2.status < 300 && dbl1.body?.subject_id === dbl2.body?.subject_id && dblRows === 1, { statuses: [dbl1.status, dbl2.status], rows: dblRows });
  const dbl3 = refusal("add person, key reused", await addChild(K.id, "Sample Child Other", { idempotencyKey: kc }));
  ok("QA-28 the same key with a different person is refused (409) and adds nothing", dbl3.status === 409, { status: dbl3.status, detail: dbl3.body?.detail });
  const child = c1.body.subject_id as string, child2 = c2.body.subject_id as string;
  r = refusal("person applies wrong type", await addChild(A.id, "Sample Child T", { applies: "yes" }));
  ok("C6.2 'travelling' given as text is a 400 field error in plain words (not the library's default wording)", r.status === 400 && r.body?.errors?.[0]?.field === "applies" && !ZOD_OR_TECH.test(r.body?.errors?.[0]?.message ?? ""), r.body?.errors);
  r = refusal("person role case", await call("POST", `/runtime/cases/${A.id}/people`, { role: "case", displayName: "The application again" }));
  // Drift fixed 1 Nov: the app now checks the role against the release's "who can be in this application" and answers
  // 422 (a valid request the release does not allow), not a 400 shape error. Its words are QA-135 (the role name "case").
  ok("C6.2 a second 'application' subject cannot be added as a person (422, nothing stored)", r.status === 422 && !!r.body?.detail, { status: r.status, detail: r.body?.detail });
  r = refusal("person name too long", await addChild(A.id, "N".repeat(121)));
  ok("C6.2 a display name over 120 characters is refused with the limit", r.status === 400 && /120/.test(r.body?.detail), r.body?.detail);
  r = refusal("person name control", await addChild(A.id, "Sample\u001b[31mChild"));
  ok("C6.2 a display name with a terminal escape (control character) is refused", r.status === 400, r.body?.detail);
  r = refusal("principal not travelling", await call("PATCH", `/runtime/cases/${A.id}/people/${A.principal}`, { applies: false }));
  ok("C6.2 the principal cannot be marked not travelling (404, plain words)", r.status === 404 && /spouse, partner or child/.test(r.body?.detail), r.body?.detail);
  r = refusal("client adds person", await call("POST", `/runtime/cases/${A.id}/people`, { role: "child", displayName: "Sample Child C" }, CLIENT));
  ok("C6.2 the client cannot add people (403)", r.status === 403, r.status);
  const count = sql(`select count(*) from case_participant where case_id='${A.id}' and role in ('child','spouse_or_partner')`);
  ok("C6.2 people count after the probes: spouse + 2 children (refusals added nobody)", count === "3", count);

  // ================================================================ C6.3 answers: wrong types, long and non-English text, impossible dates
  const types: [string, string, string, unknown, string][] = [
    ["yes/no as text", A.principal, "person.criminal_history", "true", "Answer yes or no"],
    ["text as a number", A.principal, "person.marital_status", 7, "Choose an answer"],
    ["address as text", A.principal, "person.mailing_address", "12 Sample Road, Sample City", "address in its parts"],
    ["address as a list", A.principal, "person.mailing_address", ["12 Sample Road"], "address in its parts"],
    ["money as text with a currency", A.app, "case.funds_available_cad", "CAD 3,000", "digits only"],
    ["money far too big", A.app, "case.funds_available_cad", 1e300, "0 or more"],
    ["phone as text", A.principal, "person.telephone_number", "+91 98765 43210", "country code"],
  ];
  for (const [what, subject, fact, value, msg] of types) {
    const x = await answer(A.id, subject, fact, value);
    const probs = (x.body?.answer?.problems ?? []) as string[];
    ok(`C6.3 wrong type (${what}) is saved and flagged with a plain message, never a server error`, x.status === 200 && probs.some((p) => p.includes(msg)), { status: x.status, problems: probs, detail: x.body?.detail });
  }
  r = refusal("expectedId not a uuid", await put(A.id, A.principal, "person.marital_status", "single", "abc"));
  ok("C6.3 an answer version that is not an id is a 400 field error in plain words (not the library's default wording)", r.status === 400 && r.body?.errors?.[0]?.field === "expectedId" && !ZOD_OR_TECH.test(r.body?.errors?.[0]?.message ?? ""), r.body?.errors);
  r = refusal("seen not uuids", await confirm(A.id, "personal_details", A.principal, ["first", "second"]));
  ok("C6.6 Confirm section with reviewed ids that are not ids is a 400 in plain words (not the library's default wording)", r.status === 400 && !ZOD_OR_TECH.test(r.body?.errors?.[0]?.message ?? ""), r.body?.errors);
  r = refusal("answer body missing value", await call("PUT", `/runtime/cases/${A.id}/answers/${A.principal}/person.marital_status`, { expectedId: null }, CLIENT));
  ok("C6.3 an answer with no value is a 400 with the reason", r.status === 400 && r.body?.errors?.[0]?.field === "value", r.body?.errors);

  // Non-English and long text: kept exactly, counted as a person counts
  // Place and object phrases, never personal names (AGENTS.md rule 5): diacritics, stacked Vietnamese marks, Arabic, Devanagari combining marks, Chinese, Polish letters.
  const phrases = ["Phố cổ Hội An", "مكتبة المدينة", "राष्ट्रीय पुस्तकालय", "北京火车站", "Café Noël — Łódź-Śródmieście"];
  let kept = 0;
  for (const [i, n] of phrases.entries()) {
    const fam = await answer(A.id, i === 0 ? A.principal : i === 1 ? spouse : A.principal, "person.criminal_history_details", n);
    const stored = fam.body?.answer?.id ? sql(`select value_json #>> '{}' from client_canonical_answer where id='${fam.body.answer.id}'`) : "";
    if (fam.status === 200 && stored === n && (fam.body?.answer?.problems ?? []).length === 0) kept++; else note("non-English text", { n, status: fam.status, stored, problems: fam.body?.answer?.problems, detail: fam.body?.detail });
  }
  ok("C6.3 Vietnamese, Arabic, Devanagari, Chinese and Polish text is accepted and stored exactly", kept === phrases.length, { kept, of: phrases.length });
  const long = "ह".repeat(201);
  let x = await answer(A.id, A.principal, "person.criminal_history_details", long);
  ok("C6.3 201 Devanagari characters in a 200-character box is saved and flagged with the count", x.status === 200 && (x.body?.answer?.problems ?? []).some((p: string) => /200 characters \(it is 201\)/.test(p)), x.body?.answer?.problems);
  x = refusal("value over 4000", await answer(A.id, A.principal, "person.criminal_history_details", "北".repeat(4001)));
  ok("C6.3 4,001 Chinese characters is refused (400), not stored", x.status === 400 && sql(`select count(*) from client_canonical_answer where subject_id='${A.principal}' and canonical_field_key='person.criminal_history_details' and length(value_json #>> '{}') > 4000`) === "0", x.body?.detail);
  x = await answer(A.id, A.principal, "person.criminal_history_details", "Engineer\u001b[2J\u0007");
  ok("C6.3 typed text with a terminal escape and a bell character is refused or flagged (build notes: typed text refuses control characters)", x.status === 400 || (x.body?.answer?.problems ?? []).length > 0, { status: x.status, problems: x.body?.answer?.problems });
  x = await answer(A.id, A.principal, "person.criminal_history_details", "   ");
  ok("C6.3 an answer of spaces only is flagged as no answer", x.status === 200 && (x.body?.answer?.problems ?? []).length > 0, x.body?.answer?.problems);

  // Impossible dates on dates other than the birth date (officer facts)
  const dates: [string, unknown][] = [["29 February in a non-leap year", "2025-02-29"], ["month 13", "2030-13-01"], ["day 00", "2030-01-00"], ["year 1850", "1850-05-05"], ["a number", 20300101], ["day first", "01/05/2030"]];
  for (const [what, value] of dates) {
    x = await answer(A.id, A.principal, "person.passport_expiry_date", value, OFFICER);
    ok(`C6.3 passport expiry ${what} (${JSON.stringify(value)}) is saved and flagged as not a real date`, x.status === 200 && (x.body?.answer?.problems ?? []).some((p: string) => /real date/.test(p)), x.body?.answer?.problems ?? x.body?.detail);
  }
  x = await answer(A.id, A.principal, "person.date_of_birth", "2031-01-01", OFFICER);
  ok("C6.3 a future date of birth for the principal is flagged", x.status === 200 && (x.body?.answer?.problems ?? []).some((p: string) => /future/.test(p)), x.body?.answer?.problems);

  // ================================================================ C6.3 stale versions
  const ms = await answer(A.id, A.principal, "person.marital_status", "married");
  const first = ms.body?.answer?.id as string;
  const ms2 = await put(A.id, A.principal, "person.marital_status", "single", first);
  r = refusal("stale superseded id", await put(A.id, A.principal, "person.marital_status", "married", first));
  ok("C6.3 a save based on a superseded answer is refused (409) and shows the newer answer", r.status === 409 && r.body?.current?.id === ms2.body?.answer?.id, { status: r.status, current: r.body?.current?.id });
  const other = (await q(A.id, A.principal, "person.criminal_history"))?.answer?.id;
  r = refusal("stale other field id", await put(A.id, A.principal, "person.marital_status", "married", other));
  ok("C6.3 a version id belonging to another question is refused (409), never accepted", r.status === 409, r.status);
  r = refusal("stale invented id", await put(A.id, A.app, "case.intended_stay_from", "2027-01-01", "11111111-1111-4111-8111-111111111111"));
  ok("C6.3 a first answer sent with an invented version id is refused (409)", r.status === 409, r.status);
  r = await put(A.id, A.principal, "person.marital_status", "married", null);
  ok("C6.3 a 'first answer' when one already exists is refused (409), the existing one shown", r.status === 409 && !!r.body?.current?.id, r.status);
  const history = sql(`select count(*) || '/' || count(*) filter (where superseded_by_id is null) from client_canonical_answer where subject_id='${A.principal}' and canonical_field_key='person.marital_status'`);
  ok("C6.3 after the refused saves the marital status has its history and exactly one current answer", /\/1$/.test(history), history);

  // ================================================================ C6.6 P-78: minor child, adult spouse, and D2
  const childStatus = async (subject: string) => (await q(A.id, subject, "person.marital_status"))?.answer;
  await answer(A.id, spouse, "person.marital_status", "married");
  let s = await childStatus(spouse);
  ok("C6.6 P-78 the principal's answer for the adult spouse waits ('answered by the principal'), not confirmed", s?.confirmed === false && /Answered by the principal/.test(s.why) && s.by === CLIENT, s?.why);
  await answer(A.id, child, "person.marital_status", "single");
  await answer(A.id, child, "person.date_of_birth", "2016-07-14", OFFICER);
  s = await childStatus(child);
  ok("C6.6 P-78 the principal's answer for a child of 10 counts as confirmed", s?.confirmed === true && /under 18/.test(s.why), s?.why);
  // D2: an impossible birth date (30 February) and a future one must not make the child a minor
  await answer(A.id, child, "person.date_of_birth", "2015-02-30", OFFICER);
  s = await childStatus(child);
  const dobQ = await q(A.id, child, "person.date_of_birth");
  ok("D2 (PR review) fail: with an impossible birth date (2015-02-30, flagged as not a real date) the child's answers given by the principal must wait, not count as confirmed", s?.confirmed === false, { confirmed: s?.confirmed, why: s?.why, dob_problems: dobQ?.answer?.problems });
  await answer(A.id, child, "person.date_of_birth", "2030-01-01", OFFICER);
  s = await childStatus(child);
  ok("D2 (PR review) fail: with a future birth date (2030-01-01) the child's answers given by the principal must wait, not count as confirmed", s?.confirmed === false, { confirmed: s?.confirmed, why: s?.why });
  await answer(A.id, child, "person.date_of_birth", "2008-13-40", OFFICER);
  s = await childStatus(child);
  ok("D2 (PR review) fail: with a birth date of month 13, day 40 the child's answers must wait", s?.confirmed === false, { confirmed: s?.confirmed, why: s?.why });
  await answer(A.id, child2, "person.marital_status", "single");
  await answer(A.id, child2, "person.date_of_birth", "2001-03-03", OFFICER);
  s = await childStatus(child2);
  ok("C6.6 P-78 a 'child' who is 25 is an adult: the principal's answer waits", s?.confirmed === false && /the child is 25/.test(s.why), s?.why);
  const minorByUnconfirmed = await childStatus(child);
  note("C6.6 P-78 the age that decides 'minor' is read from the officer's typed birth date before anyone confirms it (officer-entered, so not client-controlled)", { child_dob_confirmed: (await q(A.id, child, "person.date_of_birth"))?.answer?.confirmed, child_answer_confirmed: minorByUnconfirmed?.confirmed });

  // ================================================================ C6.6 Confirm section: two at once, unseen, other person's ids
  await answer(A.id, spouse, "person.date_of_birth", "1991-09-09", OFFICER);
  const seenSp = await seenIn(A.id, spouse, "personal_details");
  const [k1, k2] = await Promise.all([confirm(A.id, "personal_details", spouse, seenSp), confirm(A.id, "personal_details", spouse, seenSp)]);
  const verified = sql(`select count(*) from client_canonical_answer where subject_id='${spouse}' and status='VERIFIED' and superseded_by_id is null`);
  const verifiedAll = sql(`select count(*) from client_canonical_answer where subject_id='${spouse}' and status='VERIFIED'`);
  ok("C6.6 two Confirm section presses at the same moment: one confirms, the other is refused or confirms nothing; each answer verified once", [k1.status, k2.status].includes(201) && verified === String(seenSp.length) && verifiedAll === String(seenSp.length) && [k1, k2].every((k) => k.status === 201 || k.status === 409), { statuses: [k1.status, k2.status], confirmed: [k1.body?.confirmed, k2.body?.confirmed], seen: seenSp.length, verified, verifiedAll });
  refusal("double confirm loser", k1.status === 409 ? k1 : k2.status === 409 ? k2 : { status: 409, type: "application/problem+json", body: { type: "x", title: "x", status: 409, detail: "x" } });
  s = await childStatus(spouse);
  ok("C6.6 after Confirm section the spouse's answer is confirmed by the officer (P-78)", s?.confirmed === true && s.status === "VERIFIED", s?.why);
  await answer(A.id, spouse, "person.marital_status", "common_law");
  s = await childStatus(spouse);
  ok("C6.6 the principal then changing the spouse's confirmed answer makes it wait again", s?.confirmed === false && /Answered by the principal/.test(s.why), s?.why);
  r = refusal("confirm with other person's ids", await confirm(A.id, "personal_details", spouse, await seenIn(A.id, A.principal, "personal_details")));
  ok("C6.6 Confirm section sent with another person's answer ids is refused (409), nothing verified", r.status === 409 && sql(`select count(*) from client_canonical_answer where subject_id='${spouse}' and status='VERIFIED' and superseded_by_id is null`) === String(Number(verified) - 1), { status: r.status, changed: r.body?.changed });
  r = refusal("confirm unknown section", await confirm(A.id, "no_such_section", spouse, []));
  ok("C6.6 Confirm section on a section the release does not have is a 404", r.status === 404, r.body?.detail);

  // D1: a removed row's answers block Confirm section for good
  const row1 = (await call("POST", `/runtime/cases/${A.id}/groups/${spouse}/rows`, { group: "employment_history" }, CLIENT)).body.row as string;
  const row2 = (await call("POST", `/runtime/cases/${A.id}/groups/${spouse}/rows`, { group: "employment_history" }, CLIENT)).body.row as string;
  await answer(A.id, spouse, "person.employment_employer_name", "Sample Employer Ü", CLIENT, row1);
  await answer(A.id, spouse, "person.employment_employer_name", "Sample Employer 東", CLIENT, row2);
  const del = await call("DELETE", `/runtime/cases/${A.id}/groups/${spouse}/rows/${row2}`, undefined, CLIENT);
  const looked = await seenIn(A.id, spouse, "employment_history");
  const d1 = await confirm(A.id, "employment_history", spouse, looked);
  ok("D1 (PR review) fail: after a row is removed, the officer confirms the spouse's job section with every answer shown (201), not 409 for the removed row's answer", del.status === 200 && d1.status === 201, { delete: del.status, confirm: d1.status, shown: looked.length, changed: d1.body?.changed, detail: d1.body?.detail });
  const d1b = await confirm(A.id, "employment_history", spouse, await seenIn(A.id, spouse, "employment_history"));
  ok("D1 (PR review) fail: confirming again after refreshing still fails, so the section can never be confirmed", d1b.status === 201, { confirm: d1b.status });
  ok("D1 the removed row's answer stays stored (history kept)", sql(`select count(*) from client_canonical_answer where row_key='${row2}'`) !== "0");

  // ================================================================ P-72 at the fill boundary (renderer coverage the fill reads)
  await answer(A.id, A.principal, "person.passport_number", "SAMPLE-P-9001", OFFICER);
  await answer(A.id, child, "person.date_of_birth", "2016-07-14", OFFICER);
  await answer(A.id, child2, "person.date_of_birth", "2015-02-30", OFFICER); // D2 again, on the second child
  const snap = JSON.parse(sql(`select r.snapshot from config_release r join pack_work_pin p on p.config_release_id = r.id where p.case_id='${A.id}' and p.revision = (select max(z.revision) from pack_work_pin z where z.case_id = p.case_id)`)) as Snapshot;
  const parts = JSON.parse(sql(`select json_agg(json_build_object('subjectId', p.subject_id, 'role', p.role, 'label', s.label, 'applies', p.applies)) from case_participant p join answer_subject s on s.id=p.subject_id where p.case_id='${A.id}'`)) as Participant[];
  const subj = parts.map((p) => `'${p.subjectId}'`).join(",");
  const ans = JSON.parse(sql(`select coalesce(json_agg(json_build_object('id', id, 'subjectId', subject_id, 'field', canonical_field_key, 'rowKey', row_key, 'value', value_json, 'status', status, 'channel', source_json->>'channel', 'actor', source_json->>'actor', 'at', source_json->>'at')), '[]') from client_canonical_answer where subject_id in (${subj}) and superseded_by_id is null`)) as Answer[];
  const rws = JSON.parse(sql(`select coalesce(json_agg(json_build_object('rowKey', row_key, 'subjectId', subject_id, 'group', group_key, 'order', "order")), '[]') from client_fact_record where subject_id in (${subj}) and superseded_by_id is null and not tombstone`)) as Row[];
  const { known } = knownOf(snap, parts, ans, rws, new Date());
  const people: Person[] = parts.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Person["role"], label: p.label, applies: p.applies }));
  const cov = render(snap, people, known).coverage;
  const boxes = (subject: string, fact: string) => cov.flatMap((c) => c.boxes.filter((b) => b.about === subject && b.fact === fact).map((b) => `${c.form}:${b.coverage}`));
  const passport = boxes(A.principal, "person.passport_number");
  ok("P-72 an officer-typed passport number not yet confirmed reaches the fill as 'answered on screen' (fill.ts leaves it blank)", passport.length > 0 && passport.every((b) => b.endsWith("answered on screen")), passport);
  const spouseMs = boxes(spouse, "person.marital_status");
  ok("P-72/P-78 the principal's unconfirmed answer for the spouse reaches no box as a confirmed fact", spouseMs.length > 0 && spouseMs.every((b) => !b.endsWith("confirmed fact")), spouseMs);
  const spouseDob = boxes(spouse, "person.date_of_birth");
  ok("P-72 the spouse's officer-confirmed birth date reaches the fill as a confirmed fact", spouseDob.length > 0 && spouseDob.every((b) => b.endsWith("confirmed fact")), spouseDob);
  const minorMs = boxes(child, "person.marital_status");
  ok("P-72/P-78 the principal's answer for a 10-year-old child reaches the fill as a confirmed fact", minorMs.length > 0 && minorMs.every((b) => b.endsWith("confirmed fact")), minorMs);
  const impossibleMs = boxes(child2, "person.marital_status");
  ok("D2 at the fill (P-72) fail: with the impossible birth date 2015-02-30 the principal's answer for that child must not be written as a confirmed fact", impossibleMs.length > 0 && impossibleMs.every((b) => !b.endsWith("confirmed fact")), impossibleMs);

  // ================================================================ Problem Details shape and words of every refusal above
  ok("Problem Details: every refusal above has type, title, status, detail, the problem media type, no server error and no database or stack text", problems.length === 0, problems);

  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
