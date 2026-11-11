// QA-276 (Major, C4.11, C5.1): a reviewed draft that moves a question to a section the combination did not choose must
// release. The draft snapshot no longer placed the question, the release published only the draft's placements, so the
// old placement stayed published and the fingerprint check answered 409 "was changed while it was being released" on
// every press, with nobody editing. Now the release publishes the move too. A real edit during a release is still 409.
// qa's reproduction (tests/qa/check_qa276_section_move.ts) by route on the six, US$0, no live AI. SQL only where labelled.
//   zsh studio/tools/isolated.sh forms_qa276 4456 start && tsx studio/tests/check_forms_qa276_section_move.ts 4456 xr_studio_forms_qa276
import { APPROVER, AUTHOR, REVIEWER, pack2, run } from "../acceptance/lib/pack2.ts";

const T = pack2("QA276");
const { call, sql, ok, words, done } = T;
const FACT = "qa276.movable_question";
const config = async (id: string, mode = "draft") => (await call("GET", `/combinations/${id}/config?mode=${mode}`)).body;
const facts = (c: { snapshot?: { placements?: { fact: string }[] } }) => (c.snapshot?.placements ?? []).map((p) => p.fact);
const approveWaiting = async () => { for (const id of sql("select id from library_change where status='WAITING'").split("\n").filter(Boolean)) await call("POST", `/library/changes/${id}/approve`, { note: "QA-276" }, APPROVER); };
async function release(id: string) {
  const sub = await call("POST", `/combinations/${id}/submit`, { note: "QA-276" }, AUTHOR);
  if (sub.status >= 300) return { status: sub.status, why: `submit: ${words(sub)}`.slice(0, 300) };
  const review = (await call("GET", `/combinations/${id}/review`, undefined, REVIEWER)).body?.submission;
  const items = (review?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
  const signed = await call("POST", `/combinations/${id}/signoff`, { items, action: "signed" }, REVIEWER);
  if (signed.status >= 300) return { status: signed.status, why: `signoff: ${words(signed)}`.slice(0, 300) };
  const approved = await call("POST", `/combinations/${id}/approve`, undefined, APPROVER);
  return { status: approved.status, why: words(approved).slice(0, 300) };
}
async function configured(id: string) {
  await T.questionsBySteps(id);
  const line = { attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client", sourceQuote: "QA-276 Sample document line." };
  await call("POST", `/combinations/${id}/requirements`, { ...line, newTypeName: `QA-276 letter ${id.slice(0, 4)}` }, AUTHOR);
  let type = "";
  for (const p of sql("select id from proposal_item where kind='document_type' and status='waiting'").split("\n").filter(Boolean)) type = (await call("POST", "/review/proposals/decide", { ids: [p], action: "accept", reason: "QA-276 Sample document line" }, AUTHOR)).body?.items?.[0]?.landedAs ?? type;
  await approveWaiting();
  const added = await call("POST", `/combinations/${id}/requirements`, { ...line, documentTypeKey: type }, AUTHOR);
  ok("setup: one Sample document line", added.status < 300, words(added).slice(0, 200));
  const unasked = async () => [...new Set(((await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? []).filter((p: { message?: string }) => /nobody is asked for it/.test(p.message ?? "")).map((p: { item: string }) => p.item))] as string[];
  const section = sql(`select section_key from sqr_section_selection where combination_id='${id}' order by section_order limit 1`);
  for (const key of await unasked()) await call("POST", `/library/fields/${encodeURIComponent(key)}/placement`, { sectionKey: section, collectedFrom: "client_questionnaire", repeats: key.startsWith("case.") ? "once_per_case" : "per_person", tier: "case" }, AUTHOR);
  await approveWaiting();
  ok("setup: every fact the forms need is asked", (await unasked()).length === 0);
  await T.sourceGate(id);
}

run(async () => {
  ok("setup: Reset to the six", (await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR)).status < 300);
  await T.ready();
  const sp = T.combo("sp.outside"), vv = T.combo("vv.single");
  // B114's fresh-six setup: Visitor visa's saved maps supply the shared IMM 5409 map before Study permit adds that line.
  await T.people(vv);
  for (const form of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: form }, AUTHOR);
  await T.needQuestions(vv);
  await configured(sp);
  const selected = sql(`select section_key from sqr_section_selection where combination_id='${sp}' order by section_order limit 1`);
  const other = sql(`select distinct section_key from section_question where section_key not in (select section_key from sqr_section_selection where combination_id='${sp}') order by section_key limit 1`);
  // Labelled SQL on this isolated copy: a new Sample field no form or rule reads. Its placement goes through the product route.
  sql(`insert into canonical_field (id,workspace_id,canonical_field_key,version,status,meaning,value_type,data_type,scope,subject_kind,origin,label,group_key,label_checked,updated_by) select gen_random_uuid(),workspace_id,'${FACT}',1,'PUBLISHED','A movable Sample question','text','STRING','CLIENT_LEVEL','PERSON','HUMAN','QA-276 movable question','person',true,'user-A' from canonical_field limit 1`);
  ok("setup: a section Study permit chose and one it did not", !!selected && !!other, { selected, other });
  const place = (sectionKey: string) => call("POST", `/library/fields/${encodeURIComponent(FACT)}/placement`, { sectionKey, collectedFrom: "client_questionnaire", repeats: "per_person", tier: "case" }, AUTHOR);
  const placed = await place(selected);
  await approveWaiting();
  ok("setup: the question is placed in a section Study permit chose", placed.status < 300 && facts(await config(sp)).includes(FACT), words(placed));
  const first = await release(sp);
  ok("setup: the first configuration releases, 201", first.status === 201, first);

  // The row's reproduction: move the question to a section Study permit did not choose, and release.
  const moved = await place(other);
  await approveWaiting();
  ok("setup: the question moves to a section Study permit did not choose", moved.status < 300 && !facts(await config(sp)).includes(FACT), words(moved));
  const second = await release(sp);
  ok("C5.1 fail (QA-276): Approve and release goes through after the section move, 201", second.status === 201, second);
  ok("C5.1 fail (QA-276): no refusal names a concurrent edit nobody made", !/changed while it was being released/.test(second.why), second);
  const draft = await config(sp), published = await config(sp, "published");
  ok("C5.1 fail (QA-276): the released copy no longer asks the moved question", !facts(published).includes(FACT), facts(published).length);
  ok("C5.1 fail (QA-276): the draft equals the release, so nothing is left to release", draft.sha256 === published.release?.sha256, { draft: draft.sha256, release: published.release?.sha256 });
  ok("C5.1 fail (QA-276, BR-14): the person who made the move is an author of the release", sql(`select author_id from config_release where combination_id='${sp}' order by version desc limit 1`).split(",").includes(AUTHOR));
  ok("C5.1 fail (QA-276): the move is published, the old placement superseded", sql(`select status||':'||section_key from section_question where lineage_key='${FACT}' order by version`) === `SUPERSEDED:${selected}\nPUBLISHED:${other}`);

  // Moving it back releases too.
  const back = await place(selected);
  await approveWaiting();
  ok("setup: the question moves back", back.status < 300 && facts(await config(sp)).includes(FACT), words(back));

  // The fingerprint check stays: an edit that lands while a release runs is still refused, and rolled back whole. The edit
  // is a trigger on this copy's database (SQL, on the label's word), so it lands exactly between the freeze and the check.
  const releases = sql(`select count(*) from config_release where combination_id='${sp}'`);
  sql(`create or replace function qa276_edit() returns trigger as $$ begin update section_question set question_text = coalesce(question_text,'') || ' (edited during the release)' where canonical_field_key = (select p->>'fact' from jsonb_array_elements(new.snapshot->'placements') p limit 1); return new; end $$ language plpgsql`);
  sql("create trigger qa276_edit after insert on config_release for each row execute function qa276_edit()");
  const edited = await release(sp);
  sql("drop trigger qa276_edit on config_release"); sql("drop function qa276_edit()");
  ok("C5.1 fail (break M1): an edit made during the release is still refused, 409, in the same words", edited.status === 409 && /changed while it was being released/.test(edited.why), edited);
  ok("C5.1 fail (break M1): nothing was released: the refusal rolled the release back", sql(`select count(*) from config_release where combination_id='${sp}'`) === releases);
  ok("C5.1 fail (break M1): the move back was not published by the refused release", sql(`select status from section_question where lineage_key='${FACT}' order by version desc limit 1`) === "DRAFT");

  const third = await release(sp);
  ok("C5.1 pass (QA-276 recovery): moving it back releases, 201", third.status === 201, third);
  const d3 = await config(sp), p3 = await config(sp, "published");
  ok("C5.1 pass: the released copy asks the question again, and equals the draft", facts(p3).includes(FACT) && d3.sha256 === p3.release?.sha256, { draft: d3.sha256, release: p3.release?.sha256 });

  // Review Major 1: only a move out of a chosen section publishes with the release. A question in a section Study permit
  // did not choose, asked only because a rule reads it, leaves the draft when the rule is retired; an unrelated edit to its
  // words that no reviewer of this release saw stays a draft. Labelled SQL: a new Sample yes/no field, as above.
  const RULED = "qa276.rule_read";
  sql(`insert into canonical_field (id,workspace_id,canonical_field_key,version,status,meaning,value_type,data_type,scope,subject_kind,origin,label,group_key,label_checked,updated_by) select gen_random_uuid(),workspace_id,'${RULED}',1,'PUBLISHED','A Sample question a rule reads','yes_no','BOOLEAN','CLIENT_LEVEL','PERSON','HUMAN','QA-276 rule question','person',true,'user-A' from canonical_field limit 1`);
  const ask = (questionText: string) => call("POST", `/library/fields/${RULED}/placement`, { sectionKey: other, collectedFrom: "client_questionnaire", repeats: "per_person", tier: "case", questionText }, AUTHOR);
  await ask("Original words?");
  const rule = await call("POST", `/combinations/${sp}/rules`, { condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: RULED, value: true }, whenPlain: "QA-276 Sample rule", thenPlain: "nothing, a Sample check", forWhom: "each_applicant" }, AUTHOR);
  await approveWaiting();
  ok("setup (Major 1): a rule on Study permit reads a question in a section it did not choose", rule.status < 300 && facts(await config(sp)).includes(RULED), words(rule));
  const fourth = await release(sp);
  ok("setup (Major 1): released, 201", fourth.status === 201, fourth);
  const edit = await ask("EDITED words nobody reviewed?");
  const retire = await call("PATCH", `/combinations/${sp}/rules/${rule.body?.predicateKey}`, { retire: true }, AUTHOR);
  ok("setup (Major 1): its words edited and the rule retired, so the draft no longer asks it", edit.status < 300 && retire.status < 300 && !facts(await config(sp)).includes(RULED), words(retire));
  const fifth = await release(sp);
  ok("C5.1 pass (Major 1): the release goes through, 201", fifth.status === 201, fifth);
  ok("C5.1 fail (Major 1): the unrelated edit to a question dropped by a rule is not published by this release", sql(`select string_agg(status::text||':'||coalesce(question_text,''),' | ' order by version) from section_question where lineage_key='${RULED}'`) === "PUBLISHED:Original words? | DRAFT:EDITED words nobody reviewed?");
  const d5 = await config(sp), p5 = await config(sp, "published");
  ok("C5.1 pass (Major 1): the draft equals the release", d5.sha256 === p5.release?.sha256, { draft: d5.sha256, release: p5.release?.sha256 });
  done();
});
