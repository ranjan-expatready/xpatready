// QA-262 row 4, on main after the C4.11 stack and B114: with every saved Visitor visa condition in force and every Hiding
// door cleared through B86/B88 with a second person, release Visitor visa first or last, then open a case on the release.
// Run on a copy that has just passed acceptance/C4.11-spread.test.ts. QA262_ORDER=vv-first or vv-last (default). US$0.
//   tsx studio/acceptance/C4.11-spread.test.ts 4474 xr_studio_qa262_row4 && QA262_ORDER=vv-last tsx studio/tests/qa/check_qa262_row4.ts 4474 xr_studio_qa262_row4
import { APPROVER, AUTHOR, REVIEWER, pack2, run } from "../../acceptance/lib/pack2.ts";

const T = pack2("QA262-row4");
const { call, sql, ok, words, done } = T;
const vv = T.combo("vv.single"), sp = T.combo("sp.outside"), ee = T.combo("pnp.express_entry");
const order = process.env.QA262_ORDER === "vv-first" ? ["Visitor visa first", [vv, sp, ee]] : ["Visitor visa last", [sp, ee, T.combo("fs.spouse"), T.combo("wp.lmia_inside"), vv]];
type Row = { form_edition_id: string; data_path: string; edition: string; caption: string; can_confirm: boolean; can_ask: boolean };
const errors = async (id: string) => ((await call("POST", `/combinations/${id}/submit`, { note: "QA-262 row 4" }, AUTHOR)).body?.errors ?? []) as { item?: string; message?: string }[];
const hiding = async (id: string) => (await errors(id)).filter((e) => /Hiding a value a form reads/.test(e.message ?? ""));
const config = async (id: string, mode: string) => (await call("GET", `/combinations/${id}/config?mode=${mode}`)).body;
async function release(id: string) {
  const sub = await call("POST", `/combinations/${id}/submit`, { note: "QA-262 row 4" }, AUTHOR);
  if (sub.status >= 300) return { status: sub.status, why: `submit: ${words(sub)}`.slice(0, 400) };
  const review = (await call("GET", `/combinations/${id}/review`, undefined, REVIEWER)).body?.submission;
  const items = (review?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
  const signed = await call("POST", `/combinations/${id}/signoff`, { items, action: "signed" }, REVIEWER);
  if (signed.status >= 300) return { status: signed.status, why: `signoff: ${words(signed)}`.slice(0, 400) };
  const approved = await call("POST", `/combinations/${id}/approve`, undefined, APPROVER);
  return { status: approved.status, why: words(approved).slice(0, 400) };
}

run(async () => {
  // The spread pack clears the four other combinations. Visitor visa's own Hiding gets the same two people's doors here.
  const rowsOf = async (id: string, fact: string) => ((await call("GET", `/combinations/${id}/questions/${encodeURIComponent(fact)}/form-fields`, undefined, AUTHOR)).body?.rows ?? []) as Row[];
  const through = async (id: string, fact: string, x: Row, ask: boolean) => {
    const proposed = await call("POST", "/library/form-field-conditions", { combinationId: id, fact, formEditionId: x.form_edition_id, dataPath: x.data_path, ...(ask ? { ask: true } : {}) }, AUTHOR);
    if (proposed.status >= 300) return proposed;
    return call("POST", `/library/changes/${proposed.body.id}/approve`, { note: "QA-262 row 4: checked against the form's words by a second person." }, APPROVER);
  };
  const facts = [...new Set((await hiding(vv)).map((e) => e.item!))];
  for (const fact of facts) for (const x of (await rowsOf(vv, fact)).filter((y) => y.can_confirm)) {
    const r = await through(vv, fact, x, false);
    ok("QA-262 setup: Visitor visa's plain form-field condition is confirmed by a second person", r.status < 300, words(r));
  }
  for (const fact of facts) for (const x of (await rowsOf(vv, fact)).filter((y) => y.can_ask)) {
    const r = await through(vv, fact, x, true);
    ok("QA-262 setup: Visitor visa's worked-out Yes/No asks its deciding question through the second-person door", r.status < 300, words(r));
  }
  ok("QA-262 setup: Visitor visa's own Hiding is 0 with every condition still in force", (await hiding(vv)).length === 0, await hiding(vv));
  const conditioned = Number(sql("select count(distinct lineage_key) from section_question where predicate_json is not null and status in ('DRAFT','PUBLISHED')"));
  ok("QA-262 setup: the saved conditions remain in force", conditioned >= 7, conditioned);

  // One Sample document line and every numeric source answer on each combination, through the same routes as the screens.
  const approveWaiting = async () => { for (const id of sql("select id from library_change where status='WAITING'").split("\n").filter(Boolean)) await call("POST", `/library/changes/${id}/approve`, { note: "QA-262 row 4" }, APPROVER); };
  for (const id of new Set(order[1] as string[])) {
    const peopleView = (await call("GET", `/combinations/${id}/workspace?tab=questionnaires`)).body?.people;
    const participants = JSON.parse(sql(`select participants from combination where id='${id}'`)) as { role: string; label?: string; min: number; max: number; applies: boolean; filingMode?: string }[];
    const withModes = participants.map((p) => ({ role: p.role, label: p.label, min: p.min, max: p.max, applies: p.applies, ...(p.applies ? { filingMode: p.filingMode ?? "files_own" } : {}) }));
    const saved = await call("PATCH", `/combinations/${id}/people`, { participants: withModes, version: peopleView?.version ?? 0, confirmRemove: true }, AUTHOR);
    ok("QA-262 setup: every applying role has its filing mode through the people's route", saved.status < 300, words(saved));
    const line = { attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client", sourceQuote: "QA-262 Sample document line." };
    await call("POST", `/combinations/${id}/requirements`, { ...line, newTypeName: `QA-262 letter ${id.slice(0, 4)}` }, AUTHOR);
    let type = "";
    for (const p of sql("select id from proposal_item where kind='document_type' and status='waiting'").split("\n").filter(Boolean)) type = (await call("POST", "/review/proposals/decide", { ids: [p], action: "accept", reason: "QA-262 Sample document line" }, AUTHOR)).body?.items?.[0]?.landedAs ?? type;
    await approveWaiting();
    const added = await call("POST", `/combinations/${id}/requirements`, { ...line, documentTypeKey: type }, AUTHOR);
    ok("QA-262 setup: one Sample document line is present", added.status < 300, words(added));
    const unasked = async () => [...new Set(((await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? []).filter((p: { message?: string }) => /nobody is asked for it/.test(p.message ?? "")).map((p: { item: string }) => p.item))] as string[];
    const section = sql(`select section_key from sqr_section_selection where combination_id='${id}' order by section_order limit 1`);
    for (const key of await unasked()) await call("POST", `/library/fields/${encodeURIComponent(key)}/placement`, { sectionKey: section, collectedFrom: "client_questionnaire", repeats: key.startsWith("case.") ? "once_per_case" : "per_person", tier: "case" }, AUTHOR);
    await approveWaiting();
    ok("QA-262 setup: every fact the forms need is asked", (await unasked()).length === 0, await unasked());
    await T.sourceGate(id);
  }
  const before = T.spent();
  for (const id of order[1] as string[]) {
    const name = sql(`select label from combination where id='${id}'`);
    const r = await release(id);
    ok(`QA-262 pass (row 4, ${order[0]}): ${name} releases, 201`, r.status === 201, r);
    const draft = await config(id, "draft"), published = await config(id, "published");
    ok(`QA-262 pass: ${name}'s draft and published snapshots agree`, draft?.sha256 === (published?.release?.sha256 ?? published?.sha256), { draft: draft?.sha256, published: published?.release?.sha256 ?? published?.sha256 });
  }
  const opened = await call("POST", "/runtime/cases", { combinationId: sp, reference: `QA262-${Date.now()}`, clientActor: "user-P", principal: { displayName: "Sample Client A" } }, "user-O");
  ok("QA-262 pass (next capability's first step): a case opens on Study permit's release", opened.status === 201 && !!opened.body?.id, { status: opened.status, body: opened.body });
  ok("QA-262 pass: US$0, the saved-run ledger unchanged", T.spent() === before, { before, after: T.spent() });
  done();
});
