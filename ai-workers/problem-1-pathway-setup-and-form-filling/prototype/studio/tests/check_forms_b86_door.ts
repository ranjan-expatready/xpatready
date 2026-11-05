// B86 (QA-237, C4.11; concept BR-1 to BR-3, BR-6, BR-7, Done when 1-4, 6, 7): on the six through people's steps, an author says
// a form field's words say the same as a question's condition, a second person approves, and Submit no longer refuses that
// question. The rule's refusals stay. Saved answers only: US$0, live AI off, the ledger unchanged. All conditions are Sample.
//   zsh studio/tools/isolated.sh forms_b86 4451 start && tsx studio/tests/check_forms_b86_door.ts 4451 xr_studio_forms_b86
import { randomUUID } from "node:crypto";
import { APPROVER, AUTHOR, pack2, REVIEWER, run } from "../acceptance/lib/pack2.ts";

const T = pack2("B86");
const { call, sql, ok, words, until } = T;
const LIST = "vv.single-ae2133b8a398";
const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"], AI = new Set(["documents", "conditions", "pqr_picks", "checker"]);
const NAME = "person.other_family_name", GIVEN = "person.other_given_names", GATE = "person.has_used_other_name";
const FIELDS = (vv: string, fact: string, item?: string) => `/combinations/${vv}/questions/${encodeURIComponent(fact)}/form-fields${item ? `?item=${item}` : ""}`;

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  await T.needQuestions(vv);
  const before = T.spent();
  const itemOf = (fact: string) => sql(`select id from proposal_item where combination_id='${vv}' and kind='condition' and status='waiting' and identity_key like '%|${fact}|%' limit 1`);
  const bandOf = (fact: string) => sql(`select confidence from proposal_item where combination_id='${vv}' and kind='condition' and identity_key like '%|${fact}|%' limit 1`);
  const saved = async () => {
    const plan = (await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI.has(step) ? "replay" : "rules" })) }, AUTHOR)).body;
    const r = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
    await until(async () => ["COMPLETED", "DONE", "FAILED", "STOPPED", "CANCELLED"].includes(String((await call("GET", `/runs/${r.body?.runId}`)).body?.status ?? "").toUpperCase()), 180_000);
    return (await call("GET", `/runs/${r.body?.runId}`)).body;
  };
  const changes = () => sql(`select count(*) from library_change where kind='form_field_condition'`);
  const ruleOf = (id: string, path: string) => sql(`select coalesce(condition_rule::text,'') from form_field_map where form_edition_id='${id}' and data_path='${path.replace(/'/g, "''")}' order by version desc limit 1`);
  // The draft's errors are what Submit refuses on; until B82 is on main Submit on the six stops earlier, for other reasons (QA-233).
  const hiding = async (fact: string) => {
    const errors = ((await call("GET", `/combinations/${vv}`)).body?.draft?.problems ?? []) as { item?: string; message?: string; level?: string }[];
    return { lines: errors.filter((e) => e.level === "error" && e.item === fact && /^Hiding a value a form reads/.test(e.message ?? "")).map((e) => e.message ?? "") };
  };
  const approve = (id: string, by = APPROVER) => call("POST", `/library/changes/${id}/approve`, { note: "Checked against the form's words by a test (B86)." }, by);

  // ---------------------------------------------------------------- Done when 7: the saved list
  await saved();
  const listFile = (await call("POST", `/combinations/${vv}/pqr-picks/plan`, { mode: "replay" }, AUTHOR)).body?.guide?.questions as string | null;
  console.log(`LIST ${listFile}`);
  ok(`Done when 7 pass: the people's-steps question list is exactly ${LIST}, so the saved pairs still replay`, listFile === `prototype/p2/question-lists/${LIST}.questions.json`, listFile);
  const item = itemOf(NAME);
  ok("setup: the saved pair proposes the condition on Other family name, held at Check by the form", !!item && bandOf(NAME) === "check", bandOf(NAME));

  // ---------------------------------------------------------------- the panel's words
  let r = await call("GET", FIELDS(vv, NAME, item), undefined, AUTHOR);
  const row = (r.body?.rows ?? [])[0];
  ok("BR-2 pass: the form field that reads the answer, with its own words, not confirmed", r.status === 200 && r.body.rows.length === 1 && row.state === "not_confirmed" && row.can_confirm === true && /one name only on the form/.test(row.words), r.body);
  ok("Done when 9 pass: no field code in the words a person reads", !/AliasNameIndicator|person\.|form1\[/.test(`${row?.words} ${row?.caption} ${r.body?.question}`), row?.words);
  r = await call("GET", FIELDS(vv, GATE), undefined, AUTHOR);
  ok("BR-2 fail: a worked-out Yes/No cannot be confirmed; the row says why", (r.body?.rows ?? []).length >= 1 && r.body.rows.every((x: { state: string; can_confirm: boolean; why: string | null }) => x.state === "worked_out" && !x.can_confirm && /must write No/.test(x.why ?? "")), r.body?.rows);

  // ---------------------------------------------------------------- Done when 4: refusals, each in words, none writes
  const body = { combinationId: vv, fact: NAME, formEditionId: row.form_edition_id, dataPath: row.data_path, item };
  const count0 = changes();
  r = await call("POST", "/library/form-field-conditions", body, null);
  ok("Done when 4 fail: no person: 401", r.status === 401, r.status);
  r = await call("POST", "/library/form-field-conditions", body, REVIEWER);
  ok("Done when 4 fail: not an author: 403, in words", r.status === 403 && words(r).length > 10, words(r));
  r = await call("POST", "/library/form-field-conditions", { ...body, dataPath: "form1[0].NotThere[0]" }, AUTHOR);
  ok("Done when 4 fail: no such form field: 404, in words", r.status === 404 && /no such form field/.test(words(r)), words(r));
  r = await call("POST", "/library/form-field-conditions", { ...body, item: undefined }, AUTHOR);
  ok("Done when 4 fail: no card and no condition on the question: 409, in words", r.status === 409 && /no condition/i.test(words(r)), words(r));
  r = await call("POST", "/library/form-field-conditions", { ...body, tree: { op: "eq", field: GATE, value: false } }, AUTHOR);
  ok("BR-1 fail: a condition cannot be typed: the route takes none (400)", r.status === 400, words(r));
  r = await call("POST", "/library/form-field-conditions", { ...body, item: itemOf(GIVEN) }, AUTHOR);
  ok("BR-1 fail: another question's card is refused: 409, in words", r.status === 409 && /not a condition on this question/.test(words(r)), words(r));
  ok("Done when 4: a refusal changes nothing", changes() === count0, changes());

  // ---------------------------------------------------------------- Done when 2: without the confirmation
  // Condition on the given names accepted and approved, its form field not confirmed.
  const given = itemOf(GIVEN);
  r = await call("POST", "/review/proposals/decide", { ids: [given], action: "accept" }, AUTHOR);
  ok("setup: a person accepts the condition on the given names", r.status < 300, words(r));
  const cond = sql(`select id from library_change where kind='placement_condition' and key='${GIVEN}' and status='WAITING'`);
  ok("setup: a second person approves it", (await approve(cond)).status < 300);
  let h = await hiding(GIVEN);
  ok("Done when 2 fail: approved, not confirmed: the draft's error, in the rule's words", h.lines.length === 1 && /Make the form or its form fields apply under the same condition, or remove the question's condition\.$/.test(h.lines[0]), h);

  // ---------------------------------------------------------------- the way out on Review and release (no card any more)
  r = await call("GET", FIELDS(vv, GIVEN), undefined, AUTHOR);
  const g = r.body.rows[0];
  ok("Done when 1: after approval the question's own condition is what the form field is compared with", g.can_confirm === true && !!r.body.sentence, r.body);
  r = await call("POST", "/library/form-field-conditions", { combinationId: vv, fact: GIVEN, formEditionId: g.form_edition_id, dataPath: g.data_path }, AUTHOR);
  const gc = r.body?.id;
  ok("Done when 1: the author confirms it through the product's own route", r.status < 300 && !!gc, words(r));
  ok("Done when 4 fail: the author alone cannot approve", (await approve(gc, AUTHOR)).status >= 400 && ruleOf(g.form_edition_id, g.data_path) === "");
  r = await call("GET", `/library/changes/${gc}`, undefined, APPROVER);
  ok("BR-3 pass: the second person reads the form field, its own words and what is proposed; no field code", /one name only on the form/.test(r.body?.form_field?.words ?? "") && !!r.body?.form_field?.sentence && !/form1\[/.test(JSON.stringify(r.body?.form_field ?? {}).replace(r.body?.key ?? "", "")), r.body?.form_field);
  r = await call("POST", "/library/form-field-conditions", { combinationId: vv, fact: GIVEN, formEditionId: g.form_edition_id, dataPath: g.data_path }, AUTHOR);
  ok("Done when 4 fail: while one waits, a second is refused: 409, in words", r.status === 409 && /Already|waits/i.test(words(r)), words(r));
  ok("BR-3 pass: a second person approves", (await approve(gc)).status < 300 && ruleOf(g.form_edition_id, g.data_path).includes(GATE), ruleOf(g.form_edition_id, g.data_path));
  ok("Done when 6 pass: the form field's words are kept as they were", sql(`select condition from form_field_map where form_edition_id='${g.form_edition_id}' and data_path='${g.data_path.replace(/'/g, "''")}' order by version desc limit 1`).includes("one name only on the form"));
  h = await hiding(GIVEN);
  ok("Done when 1 pass: the draft's errors no longer hold \"Hiding a value\" for that question", h.lines.length === 0, h);
  r = await call("GET", `/combinations/${vv}/form-field-conditions`, undefined, AUTHOR);
  ok("BR-7 pass: Review and release's one request still lists a confirmed form field, with its Undo", (r.body?.questions ?? []).some((q: { fact: string; rows: { state: string; can_undo: boolean }[] }) => q.fact === GIVEN && q.rows.some((x) => x.state === "confirmed" && x.can_undo)), r.body?.questions?.map((q: { fact: string }) => q.fact));
  r = await call("GET", FIELDS(vv, GIVEN), undefined, AUTHOR);
  ok("the row now reads Confirmed, with Undo", r.body.rows[0].state === "confirmed" && r.body.rows[0].can_undo === true && !r.body.rows[0].can_confirm, r.body.rows[0]);

  // ---------------------------------------------------------------- BR-6: Ready is earned, both ways
  const one = sql(`select identity_key from proposal_item where combination_id='${vv}' and kind='condition' and status='waiting' and agreement='one_round' limit 1`);
  r = await call("POST", "/library/form-field-conditions", body, AUTHOR);
  const nc = r.body?.id;
  ok("Done when 3: from the waiting card the author confirms Other family name; a second person approves", r.status < 300 && (await approve(nc)).status < 300, words(r));
  const run2 = await saved();
  ok("Done when 3 pass: a new Saved draft shows it Ready (both rounds agree)", bandOf(NAME) === "ready", { band: bandOf(NAME), status: run2?.status });
  ok("Done when 3 pass: a one-round condition stays Decide", sql(`select confidence from proposal_item where identity_key='${one}' and combination_id='${vv}' limit 1`) === "decide");

  // ---------------------------------------------------------------- BR-7: the way back, before any release
  const clear = { combinationId: vv, fact: NAME, formEditionId: row.form_edition_id, dataPath: row.data_path, clear: true };
  r = await call("POST", "/library/form-field-conditions", clear, AUTHOR);
  const back = r.body?.id;
  ok("BR-7 pass: approved and not released, it can be undone (a new change)", r.status < 300 && !!back, words(r));
  r = await call("POST", `/library/changes/${back}/return`, { note: "Returned by a test: keep it for now (B86)." }, APPROVER);
  ok("BR-7: a second person can return it", r.status < 300, words(r));
  r = await call("POST", `/library/changes/${back}/resubmit`, { reason: "Sent again by a test (B86)." }, AUTHOR);
  ok("BR-7 fail: a returned change is not sent again: 409, in words", r.status === 409 && /withdraw it/.test(words(r)), words(r));
  r = await call("POST", `/library/changes/${back}/withdraw`, { note: "Withdrawn by a test (B86)." }, AUTHOR);
  ok("BR-7 pass: a returned change can be withdrawn", r.status < 300, words(r));
  r = await call("POST", "/library/form-field-conditions", clear, AUTHOR);
  const back2 = r.body?.id;
  ok("BR-7 pass: proposed again, then approved, the form field holds nothing", r.status < 300 && (await approve(back2)).status < 300 && ruleOf(row.form_edition_id, row.data_path) === "", ruleOf(row.form_edition_id, row.data_path));
  ok("BR-7 pass: the earlier approved change is closed, not left open", sql(`select status from library_change where id='${nc}'`) === "WITHDRAWN", sql(`select status from library_change where id='${nc}'`));
  await saved();
  ok("BR-6 pass: un-confirmed, a new Saved draft takes it back to Check", bandOf(NAME) === "check", bandOf(NAME));

  // ---------------------------------------------------------------- BR-3: checked again at approval
  r = await call("POST", "/library/form-field-conditions", body, AUTHOR);
  const stale = r.body?.id;
  const words0 = sql(`select condition from form_field_map where form_edition_id='${row.form_edition_id}' and data_path='${row.data_path.replace(/'/g, "''")}' order by version desc limit 1`);
  sql(`update form_field_map set condition='Changed words (test)' where form_edition_id='${row.form_edition_id}' and data_path='${row.data_path.replace(/'/g, "''")}'`);
  r = await approve(stale);
  ok("BR-3 fail: its words changed after it was proposed: 409, it still waits, nothing applied", r.status === 409 && sql(`select status from library_change where id='${stale}'`) === "WAITING" && ruleOf(row.form_edition_id, row.data_path) === "", words(r));
  sql(`update form_field_map set condition=$$${words0}$$ where form_edition_id='${row.form_edition_id}' and data_path='${row.data_path.replace(/'/g, "''")}'`);
  await call("POST", `/library/changes/${stale}/withdraw`, { note: "Withdrawn by a test (B86)." }, AUTHOR);
  sql(`update form_field_map set condition=null where form_edition_id='${row.form_edition_id}' and data_path='${row.data_path.replace(/'/g, "''")}'`);
  r = await call("POST", "/library/form-field-conditions", body, AUTHOR);
  ok("BR-2 fail: a form field with no words cannot be confirmed: 409, saying what it holds", r.status === 409 && /no words/.test(words(r)) && /stays held/.test(words(r)), words(r));
  sql(`update form_field_map set condition=$$${words0}$$ where form_edition_id='${row.form_edition_id}' and data_path='${row.data_path.replace(/'/g, "''")}'`);

  // ---------------------------------------------------------------- ruling 3: the second person is told the spread
  const other = T.combo("sp.outside");
  await T.people(other);
  await T.questionsBySteps(other);
  r = await call("GET", FIELDS(vv, NAME, itemOf(NAME)), undefined, AUTHOR);
  ok("ruling 3 pass: the panel names how many other combinations and form fields this holds", /other combination/.test(r.body?.spread ?? "") && /form field/.test(r.body?.spread ?? "") && /cannot be released/.test(r.body?.spread ?? ""), r.body?.spread);
  r = await call("POST", "/library/form-field-conditions", body, AUTHOR);
  const spread = await call("GET", `/library/changes/${r.body?.id}`, undefined, APPROVER);
  ok("ruling 3 pass: so does the second person's line", /other combination/.test(spread.body?.form_field?.spread ?? ""), spread.body?.form_field);

  ok("US$0: nothing was spent", T.spent() === before, { before, after: T.spent() });
  T.done();
});
