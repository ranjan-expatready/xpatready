// B114, QA-262 (Major, C4.11, C5.1): a condition approved on one combination must not stop another combination releasing.
// The draft snapshot read the deciding question of every library question's condition; a release publishes only what its
// own combination carries, so the published snapshot lacked that question and the fingerprints differed: 409 "was changed
// while it was being released" on every press, with nobody editing. Now only the questions a combination places read in.
// By route on the six, the people's steps, US$0, no live AI (Saved and Rules only). SQL only where a label says so.
//   zsh studio/tools/isolated.sh b114 4450 start && tsx studio/tests/check_forms_b114_condition_other_combination.ts 4450 xr_studio_b114
import { randomUUID } from "node:crypto";
import { APPROVER, AUTHOR, REVIEWER, pack2, run } from "../acceptance/lib/pack2.ts";

const T = pack2("B114");
const { call, sql, ok, until, words, done } = T;
const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"];
const AI = new Set(["documents", "conditions", "pqr_picks", "checker"]);
const FOREIGN = "person.criminal_history", ASKED_ON_VV = "person.criminal_history_details";

const config = async (id: string, mode = "draft") => (await call("GET", `/combinations/${id}/config?mode=${mode}`)).body;
const hiding = async (id: string) => ((await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? []).filter((p: { message?: string }) => /Hiding a value/.test(p.message ?? "")).length;
const facts = (c: { snapshot?: { placements?: { fact: string }[] } }) => (c.snapshot?.placements ?? []).map((p) => p.fact);
/** Submit, sign and release as the three people do; the status of the release, and its words. */
async function release(id: string) {
  const sub = await call("POST", `/combinations/${id}/submit`, { note: "B114" }, AUTHOR);
  if (sub.status >= 300) return { status: sub.status, why: `submit: ${words(sub)}`.slice(0, 300) };
  const v = (await call("GET", `/combinations/${id}/review`, undefined, REVIEWER)).body?.submission;
  const items = (v?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
  const s = await call("POST", `/combinations/${id}/signoff`, { items, action: "signed" }, REVIEWER);
  if (s.status >= 300) return { status: s.status, why: `signoff: ${words(s)}`.slice(0, 300) };
  const r = await call("POST", `/combinations/${id}/approve`, undefined, APPROVER);
  return { status: r.status, why: words(r).slice(0, 300) };
}
const approveWaiting = async () => { for (const c of sql("select id from library_change where status='WAITING'").split("\n").filter(Boolean)) await call("POST", `/library/changes/${c}/approve`, { note: "B114" }, APPROVER); };
/** Everything a combination needs before Submit, by the people's steps. */
async function configured(id: string) {
  await T.questionsBySteps(id);
  // One document line by hand and the form's remaining facts placed, as an author would: the saved runs read no other checklist.
  const line = { attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client", sourceQuote: "B114 test line." };
  await call("POST", `/combinations/${id}/requirements`, { ...line, newTypeName: `B114 letter ${id.slice(0, 4)}` }, AUTHOR);
  let type = "";
  for (const p of sql("select id from proposal_item where kind='document_type' and status='waiting'").split("\n").filter(Boolean)) type = (await call("POST", "/review/proposals/decide", { ids: [p], action: "accept", reason: "B114 test line" }, AUTHOR)).body?.items?.[0]?.landedAs ?? type;
  await approveWaiting();
  const added = await call("POST", `/combinations/${id}/requirements`, { ...line, documentTypeKey: type }, AUTHOR);
  ok("setup: one document line on this row", added.status < 300, words(added).slice(0, 200));
  const unasked = async () => [...new Set(((await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? []).filter((p: { message?: string }) => /nobody is asked for it/.test(p.message ?? "")).map((p: { item: string }) => p.item))] as string[];
  // #1052: on the six, pack2's steps choose no sections (sqr_section_selection is filled by the configured checkpoint's
  // loader), so the author places each fact in a section this row's draft already asks. Before Family sponsorship's
  // IMM 5532 lines no row here had a fact left unasked, and this lookup was never used.
  const chosen = sql(`select section_key from sqr_section_selection where combination_id='${id}' order by section_order limit 1`);
  const section = chosen || ((await config(id)).snapshot?.placements?.[0]?.section_id ?? "");
  ok("setup: a section this row asks, for the facts its forms need", !!section, section);
  for (const k of await unasked()) await call("POST", `/library/fields/${encodeURIComponent(k)}/placement`, { sectionKey: section, collectedFrom: "client_questionnaire", repeats: k.startsWith("case.") ? "once_per_case" : "per_person", tier: "case" }, AUTHOR);
  await approveWaiting();
  ok(`setup: every fact this row's forms need is asked`, (await unasked()).length === 0);
  await T.sourceGate(id);
}
/** Fresh six; Visitor visa set up as the saved run needs it. */
async function fresh() {
  ok("setup: Reset to the six", (await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR)).status < 300);
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  await T.needQuestions(vv);
  // The saved run replays on this exact list (P-345): the fix must not move it, compared whole.
  const list = (await call("POST", `/combinations/${vv}/pqr-picks/plan`, { mode: "replay" }, AUTHOR)).body?.guide?.questions;
  ok("C4.11 pass: Visitor visa's question list is still vv.single-ae2133b8a398", String(list).endsWith("/vv.single-ae2133b8a398.questions.json"), list);
  return vv;
}
/** The saved conditions on Visitor visa; accepts and approves the cards `pick` chooses. */
async function conditionOn(vv: string, pick: (c: { kind: string }) => boolean) {
  const plan = (await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI.has(step) ? "replay" : "rules" })) }, AUTHOR)).body;
  const r0 = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  await until(async () => ["COMPLETED", "DONE", "FAILED", "STOPPED", "CANCELLED"].includes(String((await call("GET", `/runs/${r0.body?.runId}`)).body?.status ?? "").toUpperCase()), 180000);
  const cards = (await T.queued(vv)).filter((y: { kind: string }) => y.kind === "condition").filter(pick);
  ok("setup: the saved run offers the condition card", cards.length > 0, cards.length);
  for (const c of cards) ok("setup: the author accepts it", (await call("POST", "/review/proposals/decide", { ids: [c.id], action: "accept", reason: "B114" }, AUTHOR)).status < 300);
  const waiting = sql("select id from library_change where kind='placement_condition' and status='WAITING'").split("\n").filter(Boolean);
  ok("setup: it waits for the second person", waiting.length > 0, waiting.length);
  for (const k of waiting) ok("setup: the second person approves it", (await call("POST", `/library/changes/${k}/approve`, { note: "B114" }, APPROVER)).status < 300);
}

run(async () => {
  // Row 1 of qa's table: no condition anywhere.
  await fresh();
  const sp = T.combo("sp.outside");
  await configured(sp);
  const none = await release(sp);
  ok("C4.11 pass (QA-262 row 1): Study permit with no condition anywhere releases, 201", none.status === 201, none);

  // Row 2 of qa's table: one condition, approved on Visitor visa; the other combinations do not ask that question.
  const vv = await fresh();
  const asksIt = { "With an LMIA": T.combo("wp.lmia_inside") };
  const others = { "Study permit": T.combo("sp.outside"), "Express Entry": T.combo("pnp.express_entry"), Spouse: T.combo("fs.spouse") };
  for (const id of [...Object.values(others), ...Object.values(asksIt)]) await configured(id);

  // With an LMIA asks all the saved conditions' questions itself, so its condition comes first and by the field's own
  // route, on a question and a deciding question only Visitor visa asks.
  const lmia = asksIt["With an LMIA"], lmiaBefore = await config(lmia);
  const only = facts(await config(vv)).filter((f) => !facts(lmiaBefore).includes(f));
  ok("setup: two questions Visitor visa asks and With an LMIA does not", only.length >= 2, only.length);
  const row = JSON.parse(sql(`select row_to_json(q) from section_question q where canonical_field_key='${only[0]}' order by version desc limit 1`));
  const placed = await call("POST", `/library/fields/${encodeURIComponent(only[0])}/placement`, { sectionKey: row.section_key, collectedFrom: row.collected_from, repeats: row.repeats, tier: row.tier, condition: { op: "eq", field: only[1], value: true, subjectKind: "PERSON" }, conditionEffect: "SHOW", conditionPlain: "B114" }, AUTHOR);
  ok("setup: a condition on a question only Visitor visa asks", placed.status < 300, words(placed).slice(0, 200));
  await approveWaiting();
  ok("C4.11 fail (QA-262): that condition does not change With an LMIA's draft", (await config(lmia)).sha256 === lmiaBefore.sha256);
  const lmiaR = await release(lmia);
  ok("C4.11 pass (QA-262 row 2): With an LMIA releases with a condition on another combination, 201", lmiaR.status === 201, lmiaR);

  const before = new Map<string, { sha: string; asks: boolean }>();
  for (const id of Object.values(others)) { const c = await config(id); before.set(id, { sha: c.sha256, asks: facts(c).includes(FOREIGN) }); }
  // BK-16 PR 2 (P-490): the Study permit now asks the deciding question itself (IMM 1295, the spouse's form, asks it), so it
  // keeps it as its own; the bug shows on the two that do not ask it, and the Study permit is still checked below for an
  // unchanged draft, no Hiding and a 201 release.
  ok("setup: Express Entry and Spouse do not ask the deciding question, so the bug can show; the Study permit asks it itself (IMM 1295)", !before.get(others["Express Entry"])!.asks && !before.get(others.Spouse)!.asks && before.get(others["Study permit"])!.asks, [...before.entries()].map(([id, b]) => [id, b.asks]));
  await conditionOn(vv, (c) => JSON.stringify(c).includes(ASKED_ON_VV));
  const own = await config(vv);
  ok("C4.11 pass (own condition): Visitor visa still carries the question that decides its own condition", facts(own).includes(FOREIGN), facts(own).length);
  // Bake row 6 (QA-237): until IMM 5257's form field holds the same condition, Visitor visa holds it too (asked every time).
  ok("C4.11 pass (own condition): Visitor visa's question carries the condition, in force or held until its form field holds it", own.snapshot.placements.some((p: { fact: string; condition: unknown }) => p.fact === ASKED_ON_VV && p.condition) || (own.snapshot.held_conditions ?? []).some((h: { fact: string; condition: unknown }) => h.fact === ASKED_ON_VV && h.condition));
  // QA-239 (Bake row 6, PR #1534): the combination that asks the question cannot honour Visitor visa's condition (its forms
  // read the answer), so the condition is held there: the question stays asked every time, a warning says why, and nothing
  // refuses it. Before, Hiding showed on it and its Submit was refused (the bug).
  const lmiaHiding = await hiding(lmia);
  ok("C4.11 pass (QA-239): With an LMIA asks that question, and no Hiding error shows on it", lmiaHiding === 0, lmiaHiding);
  const lmiaHeld = ((await call("GET", `/combinations/${lmia}`)).body?.draft?.problems ?? []).filter((p: { level?: string; item?: string; message?: string }) => p.level === "warning" && p.item === ASKED_ON_VV && /^Condition not used on this combination: /.test(p.message ?? "")).length;
  ok("C4.11 pass (QA-239): instead the condition is held on With an LMIA, with a warning saying why", lmiaHeld === 1, lmiaHeld);
  ok("C4.11 pass (QA-239): With an LMIA's released draft is unchanged by it (the question is asked as it was released)", (await config(lmia)).sha256 === (await call("GET", `/combinations/${lmia}/config?mode=published`)).body?.release?.sha256);
  for (const [name, id] of Object.entries(others)) {
    const c = await config(id);
    ok(`C4.11 fail (QA-262): the condition on Visitor visa does not change ${name}'s draft`, c.sha256 === before.get(id)!.sha, { before: before.get(id)!.sha, now: c.sha256 });
    ok(`C4.11 fail (QA-262): ${name} does not carry the deciding question of a question it does not ask${before.get(id)!.asks ? " (it asks it itself, as before)" : ""}`, before.get(id)!.asks || !facts(c).includes(FOREIGN));
  }

  // The fingerprint check stays: an edit that lands while a release runs is still refused, and rolled back whole. The edit
  // is a trigger on this copy's database (SQL, on the label's word), so it lands exactly between the freeze and the check.
  const spouse = others.Spouse;
  sql(`create or replace function b114_edit() returns trigger as $$ begin update section_question set question_text = coalesce(question_text,'') || ' (edited during the release)' where canonical_field_key = (select p->>'fact' from jsonb_array_elements(new.snapshot->'placements') p limit 1); return new; end $$ language plpgsql`);
  sql("create trigger b114_edit after insert on config_release for each row execute function b114_edit()");
  const edited = await release(spouse);
  ok("C5.1 fail (break M1): an edit made during the release is refused, 409, in the same words", edited.status === 409 && /changed while it was being released/.test(edited.why), edited);
  ok("C5.1 fail (break M1): nothing was released: the refusal rolled the release back", sql(`select count(*) from config_release where combination_id='${spouse}'`) === "0");
  sql("drop trigger b114_edit on config_release"); sql("drop function b114_edit()");

  for (const [name, id] of Object.entries(others)) {
    ok(`C4.11 pass (QA-262 row 2): ${name} shows no Hiding from the condition on Visitor visa`, (await hiding(id)) === 0);
    const r = await release(id);
    ok(`C4.11 pass (QA-262 row 2): ${name} releases with a condition on Visitor visa, 201, with no order trick`, r.status === 201, r);
    ok(`C4.11 pass: ${name}'s released copy has no deciding question of Visitor visa's${before.get(id)!.asks ? " (its own, asked as before)" : ""}`, before.get(id)!.asks || !facts(await config(id, "published")).includes(FOREIGN));
  }

  // A condition reaches every question it needs: a placed question's deciding question is carried, and so is the deciding
  // question of that one (the repeat). SQL on this copy's published rows, put back after; the draft returns to its fingerprint.
  // Bake row 6 (QA-237, QA-239): a condition that would hide a question a form reads is held (asked every time), so the chain
  // uses "required when" (REQUIRE), which hides nothing and is never held; the original effects are put back after.
  const cp = others["Study permit"], cfg = await config(cp), mine = cfg.snapshot.placements[0].fact as string;
  const pool = sql(`select distinct canonical_field_key from section_question where status in ('PUBLISHED','DRAFT') and canonical_field_key not in (${facts(cfg).map((f) => `'${f}'`).join(",")}) order by 1 limit 2`).split("\n").filter(Boolean);
  ok("setup: two questions this combination does not ask", pool.length === 2, pool);
  const effects = new Map<string, string>();
  const set = (fact: string, on: string | null) => {
    if (!effects.has(fact)) effects.set(fact, sql(`select coalesce(condition_effect::text,'') from section_question where canonical_field_key='${fact}' order by version desc limit 1`));
    const was = effects.get(fact) ? `'${effects.get(fact)}'` : "null";
    sql(`update section_question set predicate_json = ${on ? `'{"field":"${on}","op":"exists"}'::jsonb` : "null"}, condition_effect = ${on ? "'REQUIRE'" : was} where canonical_field_key='${fact}'`);
  };
  set(mine, pool[0]); set(pool[0], pool[1]);
  const chain = facts(await config(cp));
  ok("C4.11 pass (repeat): a placed question's deciding question travels", chain.includes(pool[0]), chain.length);
  ok("C4.11 pass (repeat): the deciding question of that one travels too", chain.includes(pool[1]), chain.length);
  set(pool[0], null); set(mine, null);
  ok("C4.11 pass (repeat): with the conditions gone, the draft returns to its fingerprint", (await config(cp)).sha256 === cfg.sha256);
  done();
});
