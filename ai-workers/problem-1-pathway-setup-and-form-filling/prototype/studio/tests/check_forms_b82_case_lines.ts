// B82 (QA-233, QA gate A on #1058, tech lead's ruling there): on a fresh copy of the six, Visitor visa's checklist lines
// and the facts their conditions read go in by the people's steps and release, and each conditional line then reaches a
// person on a case: shown while its fact is unanswered, needed when the answer calls for it, not needed when it does not.
// The facts are asked of a person, and no form reads them, so the paid pairs' saved rounds still replay. Sample, US$0, no
// model call.
//   zsh studio/tools/isolated.sh forms_b82 4471 start && tsx studio/tests/check_forms_b82_case_lines.ts 4471 xr_studio_forms_b82
import { conditionFactProblems, conditionFactsNobodyAsked, formReadFacts } from "../engine/coverage.ts";
import { validate } from "../engine/validate.ts";
import { APPROVER, AUTHOR, pack2, REVIEWER, run } from "../acceptance/lib/pack2.ts";
import { openCase, answer, OFFICER, call as caseCall } from "../acceptance/lib/m3.ts";
import type { Snapshot } from "../engine/snapshot.ts";

const T = pack2("B82-case-lines");
const { call, sql, ok, words } = T;
const LINES: { label: RegExp; fact: string; calls: unknown; not: unknown }[] = [
  { label: /US nonimmigrant visa/i, fact: "person.holds_valid_us_nonimmigrant_visa", calls: true, not: false },
  { label: /photos/i, fact: "person.biometrics_required", calls: false, not: true },
  { label: /legal status/i, fact: "person.residence_differs_from_citizenship", calls: true, not: false },
];
const need = (l: { need?: string; state?: string } | undefined) => l?.need ?? l?.state;

run(async () => {
  // Pure first: what counts as a fact nobody is asked.
  const snap = (x: Partial<Snapshot>) => ({ canonical_fields: [{ id: "person.a" }, { id: "person.b" }, { id: "person.c" }], derived_fields: [{ id: "person.d" }], placements: [{ fact: "person.b" }], document_types: [{ key: "t", supplies_facts: ["person.c"] }], document_requirements: [], ...x }) as unknown as Snapshot;
  const line = (field: string) => ({ document_type: "doc", condition: { op: "eq", field, value: true } });
  ok("C2.6 B82 pass: a condition on a library fact nobody is asked is named, with its document", JSON.stringify(conditionFactsNobodyAsked(snap({ document_requirements: [line("person.a")] }))) === JSON.stringify([{ fact: "person.a", documents: ["doc"] }]));
  ok("C2.6 B82 fail: a fact asked, supplied by a document, worked out, or not in the library (an error of its own) is not named", conditionFactsNobodyAsked(snap({ document_requirements: [line("person.b"), line("person.c"), line("person.d"), line("person.z")] })).length === 0);
  const cond = (field: string, extra: object = {}) => ({ document_type: "doc", document_type_key: "doc", base_or_conditional: "conditional", condition: { op: "eq", field, value: true, ...extra } });
  ok("C2.6 B82 fail (m14): a base line ignores its condition, so it names nothing", conditionFactsNobodyAsked(snap({ document_requirements: [{ ...cond("person.a"), base_or_conditional: "base" }] as never })).length === 0);
  ok("C2.6 B82 fail (m15): a condition on a document's own contents is read from it, never asked", conditionFactsNobodyAsked(snap({ document_requirements: [cond("person.a", { subjectKind: "DOCUMENT" })] as never })).length === 0);
  const own = snap({ document_types: [{ key: "doc", supplies_facts: ["person.a"] }], document_requirements: [cond("person.a")] as never });
  ok("C2.6 B82 pass (m12): the document a fact decides cannot itself supply that fact", conditionFactsNobodyAsked(own).length === 1);
  const problems = conditionFactProblems(snap({ document_requirements: [line("person.a")] }));
  ok("C2.6 B82 pass: the draft's refusal is an error naming the step that fixes it", problems.length === 1 && problems[0].level === "error" && /Ask them in their forms' sections/.test(problems[0].message), problems);
  const released = { ...snap({ document_requirements: [line("person.a")] }), mode: "released", forms: [], field_maps: [], sections: [], rules: [], checks: [], combination: { participants: [] } } as unknown as Snapshot;
  let judged: { message: string }[] = []; try { judged = validate(released, [{ key: "person.a", valueType: "yes_no" }], []); } catch (e) { judged = [{ message: `validate threw: ${(e as Error).message}` }]; }
  ok("C2.6 B82 fail (M3): a release already made is not re-judged for it: validate() does not name it, so its cases can still open", !judged.some((p) => /nobody is asked|validate threw/.test(p.message)), judged.map((p) => p.message).slice(0, 3));
  const maps = snap({ field_maps: [{ entries: [{ outcome: "mapped", fact: "person.a" }, { outcome: "unmapped", fact: "person.c" }] }] as never });
  ok("C2.6 B82 fail (M1): a fact a form field reads is the forms' to place, so the condition pass never moves its question", formReadFacts(maps).has("person.a") && !formReadFacts(maps).has("person.c"));
  ok("C2.6 B82 fail: a line with no condition names nothing", conditionFactsNobodyAsked(snap({ document_requirements: [{ document_type: "doc", condition: null }] as never })).length === 0);

  await T.ready();
  const vv = T.combo("vv.single");
  await T.needQuestions(vv);
  const replay = async () => (await call("POST", `/combinations/${vv}/draft-qd/plan`, { mode: "replay" }, AUTHOR)).body?.saved;
  const savedBefore = await replay();
  const d = await T.documentsBySteps(vv);
  ok("setup: the lines, their types and their facts land by the people's steps, and their facts are asked", d.refused.length === 0 && d.accepted > 0, d);
  // M1 end to end: this combination's questions are placed, so a second press moves nothing a form reads.
  const whereNow = () => sql(`select canonical_field_key||':'||section_key||':'||repeats from section_question where status <> 'RETIRED' order by 1`);
  const before = whereNow();
  const again = await call("POST", `/combinations/${vv}/place-from-form-parts`, {}, AUTHOR);
  ok("C2.6 B82 fail (M1): pressing the step again places nothing and moves no question", again.status < 300 && (again.body?.placed ?? []).length === 0 && whereNow() === before, again.body?.placed);
  for (const l of LINES) {
    ok(`C2.6 B82 pass: ${l.fact} is asked of a person, in the client's questionnaire`, sql(`select count(*) from section_question where canonical_field_key='${l.fact}' and collected_from='client_questionnaire' and status <> 'RETIRED'`) === "1");
    ok(`C2.6 B82 pass: no form field reads ${l.fact}, so it stays off the paid runs' question list`, sql(`select count(*) from form_field_map where canonical_field_key='${l.fact}'`) === "0");
  }
  const savedAfter = await replay();
  const files = (x: any) => JSON.stringify(x?.files?.qd_conditions ?? []);
  ok("C2.6 B82 pass: asking those facts keeps the paid pairs' saved rounds usable (the same saved runs replay on the same input list)", (savedBefore?.files?.qd_conditions ?? []).length > 0 && files(savedAfter) === files(savedBefore) && JSON.stringify(savedAfter?.files?.pqr_picks) === JSON.stringify(savedBefore?.files?.pqr_picks), { before: savedBefore?.files, after: savedAfter?.files, why: savedAfter?.why_none });
  const warnings = ((await call("GET", `/combinations/${vv}`)).body?.draft?.problems ?? []).filter((x: any) => String(x.message).includes("which nobody is asked"));
  ok("C2.6 B82 pass: with the facts asked, Review has no problem about them", warnings.filter((x: any) => LINES.some((l) => String(x.message).toLowerCase().includes(l.fact))).length === 0 && !warnings.some((x: any) => /nonimmigrant|photos|legal status/i.test(x.message)), warnings.map((x: any) => x.message));

  // Release, as C4.8 does.
  await T.sourceGate(vv);
  let r = await call("POST", `/combinations/${vv}/submit`, { note: "B82 case lines (test)" }, AUTHOR);
  ok("setup: the author submits", r.status < 300, words(r));
  for (const c of (r.body?.changeSummary ?? []) as any[]) await call("POST", `/combinations/${vv}/signoff`, { items: [`${c.kind}|${c.key}`], action: "signed" }, REVIEWER);
  r = await call("POST", `/combinations/${vv}/approve`, {}, APPROVER);
  ok("setup: the second person releases Visitor visa with its checklist lines", r.status < 300, words(r));

  // The case: each line reaches a person, and only when their answers call for it.
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: "1985-03-14" }] as never);
  const P = c.subjects["Sample Client A"];
  const lines = async () => {
    const b = (await caseCall("GET", `/runtime/cases/${c.id}/checklist`, undefined, c.officer ?? OFFICER)).body;
    const me = (b?.people ?? []).find((x: any) => x.subject === P);
    return [...(me?.lines ?? []), ...(me?.waiting ?? []), ...(me?.not_needed ?? [])] as { label: string; need?: string; state?: string; missing?: { key: string }[] }[];
  };
  const asked = ((await caseCall("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, c.officer ?? OFFICER)).body?.sections ?? []).flatMap((s: any) => s.questions).filter((q: any) => q.subjectId === P).map((q: any) => q.fact);
  let now = await lines();
  for (const l of LINES) {
    ok(`C2.6 B82 pass: the case asks the person ${l.fact}`, asked.includes(l.fact), asked.length);
    const it = now.find((x) => l.label.test(x.label));
    ok(`C2.6 B82 pass: before the answer, the ${l.label.source} line is on the checklist and says what it waits for`, !!it && need(it) === "answer_first" && (it.missing ?? []).some((m) => m.key === l.fact), it);
  }
  for (const l of LINES) { const a = await answer(c.id, P, l.fact, l.calls, c.officer ?? OFFICER); ok(`setup: ${l.fact} is answered`, a.status < 300, a.status); }
  now = await lines();
  for (const l of LINES) ok(`C2.6 B82 pass: the answer that calls for it makes the ${l.label.source} line needed`, need(now.find((x) => l.label.test(x.label))) === "needed", now.find((x) => l.label.test(x.label)));
  for (const l of LINES) await answer(c.id, P, l.fact, l.not, c.officer ?? OFFICER);
  now = await lines();
  for (const l of LINES) ok(`C2.6 B82 fail: the answer that does not call for it makes the ${l.label.source} line not needed`, need(now.find((x) => l.label.test(x.label))) === "not_needed", now.find((x) => l.label.test(x.label)));
  T.done();
});
