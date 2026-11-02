// C3.6 (P-158 (5); Lead, 2 Nov, for runtime-3's R3): a fact a rule needs may carry its ANSWER VALUES. A choice fact
// (code, multi_choice) is proposed with its list, written as words (the codes are built, never typed); the second person
// reads the list on To review and on the field's library change; accepting lands the field with its answer list: a new
// draft list that rides with the field (approved, returned, released, withdrawn and undone with it; breaker B1, B2), or
// the released list with the same values reused. An edit on To review passes the same rules (breaker M2).
// An empty or repeated value, a choice with no values and a non-choice with values are refused in words.
// Facts: person.travels_with (both parents, one parent, another adult, alone) and person.custody (shared, sole, adopted,
// guardian): Sample until the immigration expert confirms (AGENTS rule 4). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c36v 4468 start && tsx studio/tests/check_forms_c36_answer_values.ts 4468 xr_studio_forms_c36v
import { execFileSync } from "node:child_process";
import { answerValues } from "../api/src/rule-facts.ts";

const PORT = Number(process.argv[2] ?? 4468), DB = process.argv[3] ?? "xr_studio_forms_c36v";
let pass = 0, failed = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : failed++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const msg = (r: Res) => String(r.body?.message ?? r.body?.detail ?? r.body);
const refused = (f: () => unknown) => { try { f(); return null; } catch (e) { return (e as { response?: { message?: string }; message?: string }).response?.message ?? (e as Error).message; } };
const TRAVELS = ["Both parents", "One parent", "Another adult", "Alone"], CUSTODY = ["Shared", "Sole", "Adopted", "Guardian"];

(async () => {
  // ─────────────────── the pure part: the list the proposal carries
  const v = answerValues("code", [" Both parents", "One  parent", "Another adult", "Alone "]);
  ok("C3.6 pass: a choice's answer values become a list with built codes, in the order written", JSON.stringify(v) === JSON.stringify([{ code: "both_parents", label: "Both parents" }, { code: "one_parent", label: "One parent" }, { code: "another_adult", label: "Another adult" }, { code: "alone", label: "Alone" }]), v);
  ok("C3.6 fail: an empty answer value is refused in words, by its place", /Answer value 2 is empty/.test(String(refused(() => answerValues("code", ["Shared", "  ", "Sole"])))), refused(() => answerValues("code", ["Shared", "  ", "Sole"])));
  ok("C3.6 fail: a value listed twice is refused in words (letter case ignored)", /"sole" is listed twice/.test(String(refused(() => answerValues("code", ["Sole", "Shared", "sole"])))), refused(() => answerValues("code", ["Sole", "Shared", "sole"])));
  const tw = answerValues("multi_choice", ["C++", "C#", "18", "18+"]);
  ok("C3.6 pass (break m1): values that build one code are told apart by a number, never refused", JSON.stringify(tw?.map((x) => x.code)) === JSON.stringify(["c", "c_2", "v_18", "v_18_2"]), tw);
  const sc = answerValues("code", ["Москва", "東京", "القاهرة"]);
  ok("C3.6 pass (break M3): values in any script are accepted, codes from their place", JSON.stringify(sc) === JSON.stringify([{ code: "value_1", label: "Москва" }, { code: "value_2", label: "東京" }, { code: "value_3", label: "القاهرة" }]), sc);
  ok("C3.6 fail: a choice with no values is refused", /needs its answer values/.test(String(refused(() => answerValues("code", [])))));
  ok("C3.6 fail: a choice with one value is refused (a choice needs two or more)", /two or more/.test(String(refused(() => answerValues("code", ["Alone"])))));
  ok("C3.6 fail: a non-choice with values is refused", /Only a choice/.test(String(refused(() => answerValues("yes_no", ["Yes", "No"])))));
  ok("C3.6 pass: a non-choice without values carries none", answerValues("date", undefined) === undefined);

  await call("POST", "/demo/reset", { confirm: "RESET" }); // its own copy only
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  const combo = sql("select c.id from combination c join sqr_section_selection s on s.combination_id = c.id order by c.label limit 1");
  const ws = `(select workspace_id from combination where id='${combo}')`;
  const rule = (key: string, json: string, then: string) => sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, when_plain, then_plain, for_whom, version, status, origin, updated_by) values (gen_random_uuid(), ${ws}, '${combo}', '${key}', '${json}', 'when the test says so', '${then}', 'principal', 1, 'PUBLISHED', 'HUMAN', 'user-A')`);
  rule("r_c36_travel", `{"field":"person.travels_with","op":"eq","value":"alone"}`, "ask for the consent letter");
  rule("r_c36_custody", `{"field":"person.custody","op":"eq","value":"sole"}`, "ask for the custody order");
  const by = { fact: "person.travels_with", rule: "r_c36_travel", label: "Who the child travels with", meaning: "Who the child travels to Canada with (Sample).", valueType: "code" };

  // ─────────────────── refusals through the API, in words
  let r = await call("POST", `/combinations/${combo}/rule-facts`, { ...by, values: ["Both parents", "", "Alone"] });
  ok("C3.6 fail: the add refuses an empty answer value (400, in words)", r.status === 400 && /Answer value 2 is empty/.test(msg(r)), msg(r));
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...by, values: ["Alone", "Both parents", "alone"] });
  ok("C3.6 fail: the add refuses a repeated answer value (400, in words)", r.status === 400 && /listed twice/.test(msg(r)), msg(r));
  r = await call("POST", `/combinations/${combo}/rule-facts`, by);
  ok("C3.6 fail: the add refuses a choice with no answer values (400)", r.status === 400 && /needs its answer values/.test(msg(r)), msg(r));
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...by, valueType: "yes_no", values: ["Yes", "No"] });
  ok("C3.6 fail: the add refuses values on a yes-or-no fact (400)", r.status === 400 && /Only a choice/.test(msg(r)), msg(r));
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...by, values: [{ code: "alone", label: "Alone" }] });
  ok("C3.6 fail: typed codes are refused (values are words; the codes are built)", r.status === 400, msg(r));
  ok("C3.6 fail: nothing was proposed by the refused adds", sql("select count(*) from proposal_item where work->>'ruleFact'='person.travels_with'") === "0");

  // ─────────────────── the add with its list, by the fact (route 1)
  r = await call("POST", `/combinations/${combo}/rule-facts`, { ...by, values: TRAVELS });
  ok("C3.6 pass: person.travels_with is proposed with its four answer values (201)", r.status === 201, msg(r));
  const pid = r.body?.proposalId as string;
  const codes = sql(`select string_agg(v->>'code', ',' order by ord) from proposal_item, jsonb_array_elements(payload->'values') with ordinality as t(v, ord) where id='${pid}'`);
  ok("C3.6 pass: the proposal carries the list with built codes", codes === "both_parents,one_parent,another_adult,alone", codes);
  // The second person reads the list on To review › Proposals.
  const groups = (await call("GET", "/review/proposals", undefined, "user-C")).body?.groups ?? [];
  let seen: { values?: { code: string; label: string }[] | null } | undefined;
  for (const g of groups) {
    const one = (await call("GET", `/review/proposals?group=${encodeURIComponent(g.id)}`, undefined, "user-C")).body?.group;
    seen = Object.values(one?.bands ?? {}).flat().find((p) => (p as { id: string }).id === pid) as typeof seen;
    if (seen) break;
  }
  ok("C3.6 pass: To review shows the item's answer values, in words", JSON.stringify(seen?.values?.map((x) => x.label)) === JSON.stringify(TRAVELS), seen?.values);
  r = await call("POST", "/review/proposals/decide", { ids: [pid], action: "accept" }, "user-C");
  ok("C3.6 pass: accepting it succeeds", r.status === 201 || r.status === 200, msg(r));
  const list = sql("select answer_list_key from canonical_field where canonical_field_key='person.travels_with'");
  const vals = sql(`select string_agg(v.value_key||'='||v.label, ',' order by v.sort_order) from answer_list l join answer_list_value v on v.answer_list_id=l.id where l.answer_list_key='${list}'`);
  ok("C3.6 pass: the field arrives with its list on accept (codes, words and order)", !!list && vals === "both_parents=Both parents,one_parent=One parent,another_adult=Another adult,alone=Alone", { list, vals });
  ok("C3.6 pass (break B1): the new list rides with the field: one ADD waits (the field's), the list is a draft", sql(`select string_agg(kind||':'||status, ',' order by kind) from library_change where batch_id=(select batch_id from proposal_item where id='${pid}')`) === "field:WAITING" && sql(`select status from answer_list where answer_list_key='${list}'`) === "DRAFT");
  const ch = sql(`select id from library_change where kind='field' and key='person.travels_with'`);
  r = await call("GET", `/library/changes/${ch}`, undefined, "user-B");
  ok("C3.6 pass (review M2): the second person sees the answer values on the field's change", JSON.stringify(r.body?.field?.answer_list?.values?.map((x: { label: string }) => x.label)) === JSON.stringify(TRAVELS) && r.body?.field?.answer_list?.status === "DRAFT", r.body?.field);

  // ─────────────────── the add by a rule's key (route 2), with Undo
  const ROUTE = `/combinations/${combo}/rules/r_c36_custody/fact`;
  const custody = { label: "Custody", meaning: "Who has legal custody of the child (Sample).", valueType: "code", subject: "person" };
  r = await call("POST", ROUTE, { ...custody, values: ["Shared", "Sole", " "] });
  ok("C3.6 fail: the add by a rule's key refuses an empty value too", r.status === 400 && /Answer value 3 is empty/.test(msg(r)), msg(r));
  r = await call("POST", ROUTE, { ...custody, values: CUSTODY });
  ok("C3.6 pass: Custody is proposed by naming its rule, with its list (201)", r.status === 201, msg(r));
  const cid = r.body?.proposalId as string;
  r = await call("POST", "/review/proposals/decide", { ids: [cid], action: "accept" }, "user-C");
  const ckey = sql(`select decided_key from proposal_item where id='${cid}'`);
  const clist = sql(`select answer_list_key from canonical_field where canonical_field_key='${ckey}'`);
  ok("C3.6 pass: the custody field lands with its own list", !!clist && clist !== list && sql(`select count(*) from answer_list_value v join answer_list l on l.id=v.answer_list_id where l.answer_list_key='${clist}'`) === "4", { ckey, clist });
  r = await call("POST", `/review/proposals/undo/${r.body?.batchId}`, undefined, "user-C");
  ok("C3.6 pass: Undo takes the field and its new list back", (r.status === 201 || r.status === 200) && sql(`select count(*) from answer_list where answer_list_key='${clist}'`) === "0" && sql(`select count(*) from canonical_field where canonical_field_key='${ckey}'`) === "0", msg(r));

  // ─────────────────── breaker B2 / M1: a draft list is never reused, so Undo cannot take a list from under another field
  rule("r_c36_return", `{"field":"person.returns_with","op":"eq","value":"alone"}`, "ask for the return consent");
  const ret = { fact: "person.returns_with", rule: "r_c36_return", label: "Who the child returns with", meaning: "Who the child travels home with (Sample).", valueType: "code", values: TRAVELS };
  r = await call("POST", `/combinations/${combo}/rule-facts`, ret);
  ok("setup: a second fact with the same four values is proposed", r.status === 201, msg(r));
  const rid = r.body?.proposalId as string;
  await call("POST", "/review/proposals/decide", { ids: [rid], action: "accept" }, "user-C");
  const rlist = sql("select answer_list_key from canonical_field where canonical_field_key='person.returns_with'");
  ok("C3.6 fail (break M1): a draft list waiting with its field is not reused by another field", !!rlist && rlist !== list, { list, rlist });

  // ─────────────────── breaker B1: the list is approved and released with its field, never apart
  const rch = sql(`select id from library_change where kind='field' and key='person.returns_with'`);
  r = await call("POST", `/library/changes/${rch}/return`, { note: "Check the meaning with the immigration expert." }, "user-B");
  ok("setup: the second person returns the second field", r.status === 201 || r.status === 200, msg(r));
  r = await call("POST", `/library/changes/${ch}/approve`, {}, "user-B");
  ok("setup: the second person approves the first field", r.status === 201 || r.status === 200, msg(r));
  const draft = (await call("GET", "/draft", undefined, "user-B")).body;
  r = await call("POST", "/pack/release", { expectedChanges: draft?.changes }, "user-B");
  ok("setup: the shared release runs", r.status === 201 || r.status === 200, msg(r));
  ok("C3.6 pass (break B1): the approved field's list is released with it", sql(`select status from answer_list where answer_list_key='${list}'`) === "PUBLISHED" && sql("select status from canonical_field where canonical_field_key='person.travels_with' order by version desc limit 1") === "PUBLISHED");
  ok("C3.6 fail (break B1): the returned field's list is not released", sql(`select status from answer_list where answer_list_key='${rlist}'`) === "DRAFT");

  // ─────────────────── the identity rule: the same values reuse the released list
  rule("r_c36_escort", `{"field":"person.escorted_by","op":"eq","value":"alone"}`, "ask for the escort letter");
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.escorted_by", rule: "r_c36_escort", label: "Who escorts the child", meaning: "Who goes with the child at the border (Sample).", valueType: "code", values: TRAVELS });
  await call("POST", "/review/proposals/decide", { ids: [r.body?.proposalId], action: "accept" }, "user-C");
  ok("C3.6 pass: the same values reuse the released list (no second copy)", sql("select answer_list_key from canonical_field where canonical_field_key='person.escorted_by'") === list);

  // ─────────────────── breaker M2: an edit on To review passes the add's rules
  rule("r_c36_guard", `{"field":"person.has_guardian","op":"eq","value":true}`, "ask for the guardianship papers");
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.has_guardian", rule: "r_c36_guard", label: "Has a guardian in Canada", meaning: "Whether a guardian in Canada looks after the child (Sample).", valueType: "yes_no" });
  const gid = r.body?.proposalId as string;
  const gp = JSON.parse(sql(`select payload from proposal_item where id='${gid}'`));
  r = await call("POST", "/review/proposals/decide", { ids: [gid], action: "edit", payload: { ...gp, values: [{ code: "yes", label: "Yes" }, { code: "no", label: "No" }] } }, "user-C");
  ok("C3.6 fail (break M2): an edit cannot put values on a yes-or-no fact", r.status === 400 && /Only a choice/.test(msg(r)) && sql("select count(*) from canonical_field where canonical_field_key='person.has_guardian'") === "0", msg(r));
  r = await call("POST", "/review/proposals/decide", { ids: [gid], action: "edit", payload: { ...gp, valueType: "code" } }, "user-C");
  ok("C3.6 fail (break M2): an edit cannot make it a choice with no values", r.status === 400 && /needs its answer values/.test(msg(r)), msg(r));
  r = await call("POST", "/review/proposals/decide", { ids: [gid], action: "edit", payload: { ...gp, valueType: "code", values: [{ code: "sun", label: "A guardian" }, { code: "moon", label: "No guardian" }] } }, "user-C");
  const gl = sql("select string_agg(v.value_key, ',' order by v.sort_order) from canonical_field f join answer_list l on l.answer_list_key=f.answer_list_key join answer_list_value v on v.answer_list_id=l.id where f.canonical_field_key='person.has_guardian'");
  ok("C3.6 pass (break M2): an edit's codes are rebuilt from its words (a typed code never lands)", gl === "a_guardian,no_guardian", { status: r.status, gl, m: msg(r) });

  // ─────────────────── break R2-M2: values that miss what the rule compares are refused (the rule would never hold)
  rule("r_c36_alone", `{"field":"person.travels_alone_with","op":"eq","value":"alone"}`, "ask for the consent letter");
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.travels_alone_with", rule: "r_c36_alone", label: "Travels without whom", meaning: "Whom the child travels without (Sample).", valueType: "code", values: ["Both parents", "One parent"] });
  ok("C3.6 fail (break R2-M2): values that lack the value the rule compares are refused, naming it", r.status === 400 && /compares person\.travels_alone_with with "alone"/.test(msg(r)), msg(r));
  ok("C3.6 fail (break m-d): an invisible-only value is empty", /Answer value 2 is empty/.test(String(refused(() => answerValues("code", ["Yes", "\u200b"])))));

  // ─────────────────── break R2-M1: a draft list riding with its field is not reused by a form's list, so Undo is safe
  rule("r_c36_lang", `{"field":"person.c36_lang","op":"eq","value":"english"}`, "ask for the language test");
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.c36_lang", rule: "r_c36_lang", label: "Language for letters", meaning: "The language the person wants letters in (Sample).", valueType: "code", values: ["English", "French"] });
  const lid = r.body?.proposalId as string;
  const la = await call("POST", "/review/proposals/decide", { ids: [lid], action: "accept" }, "user-C");
  const llist = sql("select answer_list_key from canonical_field where canonical_field_key='person.c36_lang'");
  const att = sql("select id from source_attachment where lower(file_name) like '%imm5257e.pdf' order by created_at limit 1");
  r = await call("POST", `/attachments/${att}/draft-masters`, { mode: "rules" }, "user-A");
  ok("setup: the rules read IMM 5257's choices", r.status === 201 || r.status === 200, msg(r));
  const reuses = sql(`select count(*) from proposal_item where kind='answer_list' and reuse->>'existingKey'='${llist}'`);
  ok("C3.6 fail (break R2-M1): a form's list never reuses a draft list waiting with its field", !!llist && reuses === "0", { llist, reuses });
  r = await call("POST", `/review/proposals/undo/${la.body?.batchId}`, undefined, "user-C");
  ok("C3.6 pass (break R2-M1): Undo takes the field's own list back and nothing points at it", (r.status === 201 || r.status === 200) && sql(`select count(*) from answer_list where answer_list_key='${llist}'`) === "0" && sql(`select count(*) from proposal_item where decided_key='${llist}'`) === "0", msg(r));

  // ─────────────────── review m-r2a: an edit on the add-by-rule route cannot make a choice with no values
  rule("r_c36_party", `{"field":"person.c36_party","op":"exists"}`, "ask who comes along");
  r = await call("POST", `/combinations/${combo}/rules/r_c36_party/fact`, { label: "Has a travel party", meaning: "Whether others travel with the child (Sample).", valueType: "yes_no", subject: "person" });
  const pp = r.body?.proposalId as string;
  r = await call("POST", "/review/proposals/decide", { ids: [pp], action: "edit", payload: { ...JSON.parse(sql(`select payload from proposal_item where id='${pp}'`)), valueType: "code" } }, "user-C");
  ok("C3.6 fail (review m-r2a): on the add-by-rule route an edit to a choice with no values is refused", r.status === 400 && /needs its answer values/.test(msg(r)), msg(r));

  // ─────────────────── review m-r3a / m-r3b
  rule("r_c36_m3", `{"field":"person.c36_with","op":"eq","value":"alone"}`, "ask for the consent letter");
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.c36_with", rule: "r_c36_m3", label: "Who comes along", meaning: "Who comes along on the trip (Sample).", valueType: "code", values: ["Both parents", "Alone"] });
  const mid = r.body?.proposalId as string;
  r = await call("POST", "/review/proposals/decide", { ids: [mid], action: "edit", payload: { ...JSON.parse(sql(`select payload from proposal_item where id='${mid}'`)), values: [{ code: "both_parents", label: "Both parents" }, { code: "one_parent", label: "One parent" }] } }, "user-C");
  ok("C3.6 fail (review m-r3a): an edit cannot drop the value the rule compares", r.status === 400 && /compares this fact with "alone"/.test(msg(r)) && sql("select count(*) from canonical_field where canonical_field_key='person.c36_with'") === "0", msg(r));
  ok("C3.6 fail (review m-r3b): a soft hyphen does not make a second value", /listed twice/.test(String(refused(() => answerValues("code", ["Alone", "Al\u00adone"])))));

  // ─────────────────── Devin review on #426: every rule that reads the fact counts; neq does not need its value
  rule("r_c36_two_a", `{"field":"person.c36_two","op":"eq","value":"alone"}`, "ask for the consent letter");
  rule("r_c36_two_b", `{"field":"person.c36_two","op":"eq","value":"guardian"}`, "ask for the guardian papers");
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.c36_two", rule: "r_c36_two_a", label: "Who travels with", meaning: "Who travels with the child (Sample).", valueType: "code", values: ["Alone", "Both parents"] });
  ok("C3.6 fail (Devin red): another rule reading the fact is checked too, and named", r.status === 400 && /r_c36_two_b compares person\.c36_two with "guardian"/.test(msg(r)), msg(r));
  rule("r_c36_neq", `{"field":"person.c36_neq","op":"neq","value":"other"}`, "ask for the usual papers");
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.c36_neq", rule: "r_c36_neq", label: "Who travels along", meaning: "Who travels along with the child (Sample).", valueType: "code", values: ["Alone", "Both parents"] });
  ok("C3.6 pass (Devin yellow): a neq rule does not need its value among the answers", r.status === 201, msg(r));
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
