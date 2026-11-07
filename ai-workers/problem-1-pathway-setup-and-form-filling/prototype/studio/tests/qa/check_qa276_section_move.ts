// QA-276 (C4.11, C5.1): moving a question to a section the combination did not choose must not leave release repeating
// the false "changed while it was being released" refusal. Moving it back is the recovery. Live AI off, US$0.
//   zsh studio/tools/isolated.sh qa_section_move 4472 start && tsx studio/tests/qa/check_qa276_section_move.ts 4472 xr_studio_qa_section_move
import { APPROVER, AUTHOR, REVIEWER, pack2, run } from "../../acceptance/lib/pack2.ts";

const T = pack2("QA276");
const { call, sql, ok, words, done } = T;
const config = async (id: string) => (await call("GET", `/combinations/${id}/config?mode=draft`)).body;
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
  ok("QA-276 setup: one Sample document line", added.status < 300, words(added).slice(0, 200));
  const unasked = async () => [...new Set(((await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? []).filter((p: { message?: string }) => /nobody is asked for it/.test(p.message ?? "")).map((p: { item: string }) => p.item))] as string[];
  const section = sql(`select section_key from sqr_section_selection where combination_id='${id}' order by section_order limit 1`);
  for (const key of await unasked()) await call("POST", `/library/fields/${encodeURIComponent(key)}/placement`, { sectionKey: section, collectedFrom: "client_questionnaire", repeats: key.startsWith("case.") ? "once_per_case" : "per_person", tier: "case" }, AUTHOR);
  await approveWaiting();
  ok("QA-276 setup: every fact the forms need is asked", (await unasked()).length === 0);
  await T.sourceGate(id);
}

run(async () => {
  ok("QA-276 setup: Reset to the six", (await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR)).status < 300);
  await T.ready();
  const sp = T.combo("sp.outside"), vv = T.combo("vv.single");
  // B114's fresh-six setup: Visitor visa's saved maps supply the shared IMM 5409 map before Study permit adds that line.
  await T.people(vv);
  for (const form of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: form }, AUTHOR);
  await T.needQuestions(vv);
  await configured(sp);
  const selected = sql(`select section_key from sqr_section_selection where combination_id='${sp}' order by section_order limit 1`);
  const other = sql(`select distinct section_key from section_question where section_key <> '${selected}' order by section_key limit 1`);
  const placed = facts(await config(sp));
  // Labelled SQL on this isolated copy: a new Sample field with no form or rule reader. The placement itself goes through the product route.
  sql("insert into canonical_field (id,workspace_id,canonical_field_key,version,status,meaning,value_type,data_type,scope,subject_kind,origin,label,group_key,label_checked,updated_by) select gen_random_uuid(),workspace_id,'qa276.movable_question',1,'PUBLISHED','A movable Sample question','text','STRING','CLIENT_LEVEL','PERSON','HUMAN','QA-276 movable question','person',true,'user-A' from canonical_field limit 1");
  const row = { canonical_field_key: "qa276.movable_question", collected_from: "client_questionnaire", repeats: "per_person", tier: "case" };
  ok("QA-276 setup: a Sample question no form or rule on this combination reads", !!row.canonical_field_key && !!selected && !!other && placed.length > 0, { fact: row.canonical_field_key, selected, other });
  const place = (sectionKey: string) => call("POST", `/library/fields/${encodeURIComponent(row.canonical_field_key)}/placement`, { sectionKey, collectedFrom: row.collected_from, repeats: row.repeats, tier: row.tier }, AUTHOR);
  const firstPlacement = await place(selected);
  await approveWaiting();
  ok("QA-276 setup: the question is placed in a section Study permit chose", firstPlacement.status < 300 && facts(await config(sp)).includes(row.canonical_field_key), words(firstPlacement));
  const first = await release(sp);
  ok("QA-276 setup: the initial configuration releases", first.status === 201, first);
  const moved = await place(other);
  await approveWaiting();
  ok("QA-276 setup: the shared question moves to a section Study permit did not choose", moved.status < 300, words(moved));
  const second = await release(sp);
  ok("QA-276 fail (C5.1): Approve and release succeeds after the deliberate section move", second.status === 201, second);
  ok("QA-276 fail: a refusal names the moved question and section, never a fictitious concurrent editor", second.status === 201 || !/changed while it was being released/.test(second.why), second);
  const back = await place(selected);
  await approveWaiting();
  ok("QA-276 setup: moving the question back is accepted", back.status < 300, words(back));
  const recovered = await release(sp);
  const draft = await config(sp), published = await call("GET", `/combinations/${sp}/config?mode=published`);
  ok("QA-276 recovery: moving the question back releases, or restores the existing release exactly so nothing new needs releasing", recovered.status === 201 || (/Nothing has changed/.test(recovered.why) && draft?.sha256 === published.body?.release?.sha256), { recovered, draft: draft?.sha256, published: published.body?.release?.sha256 });
  done();
});
