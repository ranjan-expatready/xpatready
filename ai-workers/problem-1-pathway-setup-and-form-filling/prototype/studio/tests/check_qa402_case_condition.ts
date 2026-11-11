// QA-402 (Major, journey; qa walk 0; C4.11 held conditions, #1534, P-477): the author's condition on a question asked once
// per application is put in force on its own pathway, by the product's routes only, on the configured checkpoint. On
// Visitor visa the author sets, by hand as step 5 advises, "Visit purpose other: show only when Visit purpose is Other".
// IMM 5257 writes that answer only under its own cited gate, the same condition (B107), so nothing reads it outside the
// condition: Review and release has no held warning and no refusal for it, and the release goes through (author, content
// reviewer, approver). On a case of the new release the question is asked only when the purpose is Other: the client and
// the officer see it with Other, not with another purpose. A condition other than the form's own stays held, saying the
// form's own condition and a way out that fits. Each rule with a pass and a fail line. US$0, no AI, live off.
//   zsh studio/tools/isolated.sh rt_q402 4491 start && tsx studio/tests/check_qa402_case_condition.ts 4491 xr_studio_rt_q402
import { APPROVER, AUTHOR, REVIEWER } from "../acceptance/lib/pack2.ts";
import * as m3 from "../acceptance/lib/m3.ts";

const { call, sql, ok } = m3;
const FACT = "case.visit_purpose_other", DECIDER = "case.visit_purpose";
const HELD = /^Condition not used on this combination: /, HIDING = /^Hiding a value a form reads/;
type Problem = { level?: string; item?: string; message?: string };
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any -- API bodies are read loosely in checks
const problems = async (id: string) => ((await call("GET", `/combinations/${id}`, undefined, AUTHOR)).body?.draft?.problems ?? []) as Problem[];
const mine = (ps: Problem[]) => ps.filter((p) => p.item === FACT && (HELD.test(p.message ?? "") || HIDING.test(p.message ?? "")));
/** The author's "Save placement as draft" on the field's page (web/src/pages/library.tsx), with a condition. */
async function setCondition(value: string | null) {
  const f = (await call("GET", `/library/fields/${FACT}`, undefined, AUTHOR)).body;
  const place = (f?.placements ?? []).at(-1);
  const body = { sectionKey: place.sectionKey, collectedFrom: place.collectedFrom, repeats: place.repeats, tier: place.tier, questionText: place.questionText ?? "", helpText: place.helpText ?? "",
    condition: value === null ? null : { subjectKind: "EACH_APPLICANT", op: "eq", field: DECIDER, value }, conditionEffect: value === null ? null : "SHOW",
    conditionPlain: value === null ? "" : `Asked only when the visit purpose is ${value}` };
  return call("POST", `/library/fields/${FACT}/placement`, body, AUTHOR);
}
/** Submit, sign and release as the three people do (as tests/check_forms_qa237_qa239_held.ts). */
async function release(id: string) {
  const sub = await call("POST", `/combinations/${id}/submit`, { note: "QA-402" }, AUTHOR);
  if (sub.status >= 300) return { status: sub.status, why: `submit: ${words(sub)} ${JSON.stringify((sub.body?.errors ?? []).slice(0, 3))}`.slice(0, 600) };
  const v = (await call("GET", `/combinations/${id}/review`, undefined, REVIEWER)).body?.submission;
  const items = (v?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
  const s = await call("POST", `/combinations/${id}/signoff`, { items, action: "signed" }, REVIEWER);
  if (s.status >= 300) return { status: s.status, why: `signoff: ${words(s)}`.slice(0, 300) };
  const r = await call("POST", `/combinations/${id}/approve`, undefined, APPROVER);
  return { status: r.status, why: words(r).slice(0, 300), items };
}
/** Whether the question is asked on the case now, as the officer's questionnaire and the client's show it. */
async function asked(caseId: string) {
  // Review m2: a question the condition hides is still listed, marked hidden; asked means listed and not hidden.
  const view = async (mode: string, actor: string) => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=${mode}`, undefined, actor)).body?.sections ?? []) as { questions: { fact: string; hidden?: boolean }[] }[];
  const has = (ss: { questions: { fact: string; hidden?: boolean }[] }[]) => ss.some((s) => (s.questions ?? []).some((q) => q.fact === FACT && !q.hidden));
  return { officer: has(await view("agent", m3.officerOf(caseId))), client: has(await view("client", m3.CLIENT)) };
}

m3.main("QA-402", "a condition on a case-level question is in force when the form writes it under the same gate", async () => {
  let vv = sql("select id from combination where combination_key='vv.single'");
  if (!vv) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } vv = sql("select id from combination where combination_key='vv.single'"); }
  if (!vv) { console.error("STOP  no Visitor visa on this copy"); process.exit(2); }
  const gate = sql(`select m.condition_rule->'gate' from form_field_map m where m.canonical_field_key='${FACT}' and m.status='PUBLISHED' limit 1`);
  ok("setup: IMM 5257's form field for this answer holds the form's own gate, written only when the purpose is Other (B107)", /"field": "case\.visit_purpose"/.test(gate ?? "") && /"value": "Other"/.test(gate ?? ""), gate);

  // ── a condition other than the form's own: held, in the form's words, with a way out that fits ──
  ok("setup: the author saves a condition other than the form's own (Business)", (await setCondition("Business")).status < 300);
  const other = mine(await problems(vv));
  ok("QA-402 fail: a condition other than the form's own is held (the question asked every time), never a refusal", other.length === 1 && HELD.test(other[0].message ?? ""), other);
  ok("QA-402 pass: it says the form's own condition in words, and does not send the author to \"Form fields that read this answer\"",
    /IMM 5257 reads its answer only when the purpose of the visit is Other \(the form's own condition\)/.test(other[0]?.message ?? "") && /make it the same as the form's own condition/.test(other[0]?.message ?? "") && !/Form fields that read this answer/.test(other[0]?.message ?? "") && !/case\.|form1\[/.test(other[0]?.message ?? ""), other[0]?.message);

  // ── the form's own condition, as step 5 advises: in force, released, asked only when Other ──
  ok("setup: the author saves the condition \"show only when Visit purpose is Other\" by hand", (await setCondition("Other")).status < 300);
  const same = mine(await problems(vv));
  ok("QA-402 pass: Review and release neither holds nor refuses it: the condition is in force on Visitor visa", same.length === 0, same);
  const draft = (await call("GET", `/combinations/${vv}/config?mode=draft`, undefined, AUTHOR)).body?.snapshot as { placements: { fact: string; condition?: { field?: string; value?: unknown } | null }[]; held_conditions?: { fact: string }[] };
  ok("QA-402 pass: the draft pathway carries the condition on the question, not among the held ones",
    draft?.placements.find((p) => p.fact === FACT)?.condition?.field === DECIDER && !(draft?.held_conditions ?? []).some((h) => h.fact === FACT), { placement: draft?.placements.find((p) => p.fact === FACT), held: draft?.held_conditions?.map((h) => h.fact) });
  const rel = await release(vv);
  ok("QA-402 pass: the release goes through by the three people's steps (author, content reviewer, approver)", rel.status < 300, rel);
  const released = JSON.parse(sql(`select (snapshot->'placements')::text from config_release where combination_id='${vv}' order by version desc limit 1`) ?? "[]") as { fact: string; condition?: { value?: unknown } | null }[];
  ok("QA-402 pass: the released pathway holds the condition on the question", released.find((p) => p.fact === FACT)?.condition?.value === "Other", released.find((p) => p.fact === FACT));

  // ── on a case of the new release: asked only when the purpose is Other ──
  const c = await m3.openCase(vv, [{ role: "principal", name: "Sample Client Q402", dob: m3.FIXED.dob }]);
  const purpose = async (v: string) => m3.answer(c.id, c.caseSubject, DECIDER, v);
  const blank = await asked(c.id);
  ok("QA-402 fail: with the purpose not answered yet, neither the client nor the officer is asked \"Visit purpose other\"", !blank.client && !blank.officer, blank);
  const r1 = await purpose("Business");
  const notOther = await asked(c.id);
  ok("QA-402 fail: with a purpose other than Other, neither the client nor the officer is asked \"Visit purpose other\"", r1.status < 300 && !notOther.client && !notOther.officer, { status: r1.status, words: words(r1), ...notOther });
  const r2 = await purpose("Other");
  const isOther = await asked(c.id);
  ok("QA-402 pass: with Other, the client and the officer are asked \"Visit purpose other\"", r2.status < 300 && isOther.client && isOther.officer, { status: r2.status, words: words(r2), ...isOther });
});
