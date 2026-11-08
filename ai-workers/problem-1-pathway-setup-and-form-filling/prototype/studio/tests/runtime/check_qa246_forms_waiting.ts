// QA-246 (Bug · Major; C7.7 · VV-R07, VV-R09, VV-R10): GET …/forms listed every PDF form of the release for each person,
// a form whose rule is not answered yet ("cannot tell": IMM 5409's marital status, IMM 5475's release to a designated
// person, IRM 0002's gender identifier on release 2) included, as a form to fill with "N missing": adults 7 forms,
// children 4, where /prepare (C7.7) lists 4 and 1 and the forms panel would offer Generate on a form that may never
// apply. Now a form is listed once its rule says it applies; one that waits for an answer is not (until it has copies,
// which stay in view: break M4). Which lines wait, on which fact and value, is read from the case's own release
// (expectedLines and the release's form conditions), never a form number written here (P-319). Sample data, live AI
// off, no model call (US$0).
//   zsh studio/tools/isolated.sh rt_q246 4446 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/runtime/check_qa246_forms_waiting.ts 4446 xr_studio_rt_q246
import { FAMILY, answer, call, expectedFor, main, needVisitorVisa, ok, openCase, sql } from "../../acceptance/lib/m3.ts";

type Listed = { form: string; subject_id: string; person: string; applies: boolean };
const REP = "case.uses_representative";

await main("QA-246", "GET …/forms lists a form once its rule says it applies, never one still waiting for an answer", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const names = Object.keys(c.subjects);
  const ex = await expectedFor(c.id);
  ok("setup: the case's release lines are read (expectedLines)", !!ex && names.every((n) => !!ex[n]), names);
  // What each person is expected to be offered before any answer: the lines that always apply, plus those that wait only
  // on "uses a representative", which the case team answers (A2), exactly as C7.7-1 reads them.
  const want = (n: string) => [...(ex?.[n]?.forms ?? []), ...(ex?.[n]?.waiting ?? []).filter((l) => (l.waitsOn ?? []).length > 0 && l.waitsOn!.every((f) => f === REP))].map((l) => l.form).sort();
  const waiting = (n: string) => (ex?.[n]?.waiting ?? []).filter((l) => !(l.waitsOn ?? []).every((f) => f === REP)).map((l) => l.form);
  const listed = async () => ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, c.officer)).body?.forms ?? []) as Listed[];
  const formsOf = (all: Listed[], n: string) => all.filter((f) => f.subject_id === c.subjects[n]).map((f) => f.form).sort();
  let all = await listed();
  const shown = Object.fromEntries(names.map((n) => [n, formsOf(all, n)]));
  ok("QA-246 fail: before any answer, no form whose rule still waits for an answer is listed for anyone (release 2: IMM 5409, IMM 5475, IRM 0002)",
    names.every((n) => waiting(n).length > 0) && names.every((n) => !shown[n].some((f) => waiting(n).includes(f))), shown);
  ok("QA-246 pass: each person is listed exactly the forms that apply to them now, as /prepare lists them (release 2: adults 4, children 1)",
    names.every((n) => JSON.stringify(shown[n]) === JSON.stringify(want(n))), names.map((n) => [n, shown[n], want(n)]));
  // A rule answered so its form applies: the form then appears for that person only. The fact and the value are the
  // release's own (its form condition), read for the first waiting line asked per person.
  const P = names.find((n) => /Client/.test(n))!, rel = sql(`select config_release_id from pack_work_pin where case_id='${c.id}' order by revision desc limit 1`);
  const conds = JSON.parse(sql(`select coalesce(json_agg(json_build_object('form', x->>'form_number', 'cond', x->'condition')), '[]') from config_release, jsonb_array_elements(snapshot->'forms') x where id='${rel}'`) ?? "[]") as { form: string; cond: { op?: string; field?: string; value?: unknown; subjectKind?: string } | null }[];
  const per = conds.find((x) => waiting(P).includes(x.form) && x.cond?.op === "eq" && x.cond.subjectKind === "EACH_APPLICANT" && !!x.cond.field);
  const put = per ? await answer(c.id, c.subjects[P], per.cond!.field!, per.cond!.value, c.officer) : { status: 0 };
  all = await listed();
  const others = names.filter((n) => n !== P);
  ok(`QA-246 pass: once ${P}'s answer makes ${per?.form ?? "a waiting form"} apply, it is listed for ${P} only, as a form that applies`,
    !!per && put.status === 200 && formsOf(all, P).includes(per.form) && all.find((f) => f.form === per.form && f.subject_id === c.subjects[P])?.applies === true && others.every((n) => !formsOf(all, n).includes(per.form)), { form: per?.form, put: put.status, P: formsOf(all, P) });
  // The case-level rule answered so its form does not apply: it stays off the list for everyone.
  const caseRule = conds.find((x) => waiting(P).includes(x.form) && x.cond?.op === "eq" && x.cond.subjectKind === "CASE" && typeof x.cond.value === "boolean");
  const no = caseRule ? await answer(c.id, c.caseSubject, caseRule.cond!.field!, !caseRule.cond!.value, c.officer) : { status: 0 };
  all = await listed();
  ok(`QA-246 fail: a case rule answered so ${caseRule?.form ?? "its form"} does not apply keeps it off the list for everyone`, !!caseRule && no.status === 200 && names.every((n) => !formsOf(all, n).includes(caseRule.form)), { form: caseRule?.form, put: no.status });
});
