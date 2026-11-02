// C3.6 (P-158 (5); Lead, 2 Nov, for runtime-3's R3): a fact a rule needs may carry its ANSWER VALUES. A choice fact
// (code, multi_choice) is proposed with its list, written as words (the codes are built, never typed); the second person
// reads the list on To review; accepting lands the field with its answer list, a new list waiting for a second person
// beside the field, or the live list with the same codes reused (the identity rule). Undo takes the new list back too.
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
  ok("C3.6 fail: two values that make the same code are refused as the same value", /are the same answer value/.test(String(refused(() => answerValues("multi_choice", ["Both parents", "Both-parents"])))));
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
  ok("C3.6 pass: the new list waits for a second person beside the field (two ADDs)", sql(`select string_agg(kind||':'||status, ',' order by kind) from library_change where batch_id=(select batch_id from proposal_item where id='${pid}')`) === "answer_list:WAITING,field:WAITING");

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

  // ─────────────────── the identity rule: the same codes reuse the live list
  rule("r_c36_return", `{"field":"person.returns_with","op":"eq","value":"alone"}`, "ask for the return consent");
  r = await call("POST", `/combinations/${combo}/rule-facts`, { fact: "person.returns_with", rule: "r_c36_return", label: "Who the child returns with", meaning: "Who the child travels home with (Sample).", valueType: "code", values: ["Alone", "Another adult", "One parent", "Both parents"] });
  ok("setup: a third fact with the same four values is proposed", r.status === 201, msg(r));
  await call("POST", "/review/proposals/decide", { ids: [r.body?.proposalId], action: "accept" }, "user-C");
  ok("C3.6 pass: the same set of codes reuses the live list (no second copy)", sql("select answer_list_key from canonical_field where canonical_field_key='person.returns_with'") === list && sql(`select count(*) from answer_list l where (select string_agg(value_key, ',' order by value_key) from answer_list_value where answer_list_id=l.id)='alone,another_adult,both_parents,one_parent'`) === "1");
  console.log(`\n${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
