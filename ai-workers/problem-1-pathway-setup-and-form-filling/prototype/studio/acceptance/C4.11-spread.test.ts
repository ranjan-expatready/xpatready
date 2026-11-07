// C4.11-27 (QA-239, B88; qa's terms on #1068, P-334 (4)): a question's condition is library-wide, so conditions accepted on
// Visitor visa hold other combinations whose authors did nothing. On the six through people's steps, each of the four
// other combinations that read those questions (Spouse, Express Entry, Study permit, With an LMIA) has its "Hiding a value
// a form reads" errors cleared only through the people's routes: B86's door for plain form fields, B88's for the worked-out
// Yes/No that prints its condition's deciding question, each approved by a second person. Nothing is written directly; the
// rule (engine/validate.ts) is not relaxed. Its own file, so C4.11.test.ts stays quick. Saved answers only: US$0, live AI
// off. Every condition is Sample, Unconfirmed: expert.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.11-spread.test.ts 4440 xr_studio_accept
import { randomUUID } from "node:crypto";
import { APPROVER, AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.11-spread");
const { call, sql, ok, words, until } = T;
const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"], AI = new Set(["documents", "conditions", "pqr_picks", "checker"]);
/** The four other combinations that read Visitor visa's conditioned questions, by name (qa: read by name). */
const FOUR = { "fs.spouse": "Spouse", "pnp.express_entry": "Express Entry", "sp.outside": "Study permit", "wp.lmia_inside": "With an LMIA" } as const;
type Row = { form_edition_id: string; data_path: string; edition: string; caption: string; state: string; can_confirm: boolean; can_ask: boolean };

run(async () => {
  const t0 = Date.now();
  await T.ready();
  const vv = T.combo("vv.single");
  // The people's steps: Visitor visa's questions first (its saved list replays only on that order), then the four's.
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  await T.needQuestions(vv);
  for (const k of Object.keys(FOUR)) await T.questionsBySteps(T.combo(k));
  const before = T.spent();
  const plan = (await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI.has(step) ? "replay" : "rules" })) }, AUTHOR)).body;
  const r0 = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  await until(async () => ["COMPLETED", "DONE", "FAILED", "STOPPED", "CANCELLED"].includes(String((await call("GET", `/runs/${r0.body?.runId}`)).body?.status ?? "").toUpperCase()), 180_000);
  const errors = async (id: string) => ((await call("POST", `/combinations/${id}/submit`, { note: "C4.11-27" }, AUTHOR)).body?.errors ?? []) as { item?: string; message?: string }[];
  // Submit's errors[] name the question first ("<label>: Hiding a value …"), so the match is not anchored.
  const hiding = async (id: string) => (await errors(id)).filter((e) => /Hiding a value a form reads/.test(e.message ?? ""));
  const unreachable = async (id: string) => (await errors(id)).filter((e) => /Unreachable question/.test(e.message ?? ""));

  // Visitor visa's conditions: accepted there by the author (one card per question), approved by a second person.
  const one = new Map<string, string>();
  for (const x of (await T.queued(vv)).filter((y: any) => y.kind === "condition" && y.form_fields?.fact)) if (!one.has(x.form_fields.fact)) one.set(x.form_fields.fact, x.id);
  for (const id of one.values()) await call("POST", "/review/proposals/decide", { ids: [id], action: "accept", reason: "Accepted by the C4.11 pack as the person deciding (C4.11-27)." }, AUTHOR);
  for (const c of sql(`select id from library_change where kind='placement_condition' and status='WAITING' order by proposed_at`).split("\n").filter(Boolean)) await call("POST", `/library/changes/${c}/approve`, { note: "Approved by the C4.11 pack as the second person (C4.11-27)." }, APPROVER);
  const conditioned = Number(sql(`select count(distinct lineage_key) from section_question where predicate_json is not null and status in ('DRAFT','PUBLISHED') and lineage_key in (${[...one.keys()].map((f) => `'${f}'`).join(",") || "''"})`));
  ok("C4.11-27 setup: Visitor visa's saved run proposes conditions, accepted there and approved by a second person; all in force", one.size > 0 && conditioned === one.size, { questions: [...one.keys()], in_force: conditioned });

  const held: Record<string, number> = {};
  for (const [k, name] of Object.entries(FOUR)) held[name] = (await hiding(T.combo(k))).length;
  console.log(`NOTE  C4.11-27 Hiding errors before clearing: ${JSON.stringify(held)}`);
  ok("C4.11-27 fail (QA-239): each of the four other combinations, set up by the people's steps, is held by Visitor visa's conditions (Hiding > 0)", Object.values(held).every((n) => n > 0), held);
  const unr: Record<string, number> = {}; for (const [k, name] of Object.entries(FOUR)) unr[name] = (await unreachable(T.combo(k))).length;
  ok("C4.11-27: no Unreachable question on the four", Object.values(unr).every((n) => n === 0), unr);

  // Each combination: B86's door for the plain form fields first, then B88's for the worked-out Yes/No; a second person each time.
  const rowsOf = async (id: string, fact: string) => ((await call("GET", `/combinations/${id}/questions/${encodeURIComponent(fact)}/form-fields`, undefined, AUTHOR)).body?.rows ?? []) as Row[];
  const through = async (id: string, fact: string, x: Row, ask: boolean) => {
    const p = await call("POST", "/library/form-field-conditions", { combinationId: id, fact, formEditionId: x.form_edition_id, dataPath: x.data_path, ...(ask ? { ask: true } : {}) }, AUTHOR);
    const a = p.status < 300 ? await call("POST", `/library/changes/${p.body.id}/approve`, { note: "Checked against the form's words by the C4.11 pack as the second person (C4.11-27)." }, APPROVER) : p;
    return a.status < 300 ? null : `${x.edition} ${x.caption}: ${a.status} ${words(a).slice(0, 120)}`;
  };
  const after: Record<string, number> = {}, refused: string[] = [];
  let worked = 0, keptByYesNo = 0;
  for (const [k, name] of Object.entries(FOUR)) {
    const id = T.combo(k), facts = [...new Set((await hiding(id)).map((e) => e.item!))];
    for (const f of facts) for (const x of (await rowsOf(id, f)).filter((y) => y.can_confirm)) { const why = await through(id, f, x, false); if (why) refused.push(`${name} ${why}`); }
    const asks = (await Promise.all(facts.map(async (f) => (await rowsOf(id, f)).filter((y) => y.can_ask).map((x) => ({ f, x }))))).flat();
    const still = (await hiding(id)).length;
    if (asks.length) { worked += asks.length; if (still > 0) keptByYesNo++; }
    console.log(`NOTE  C4.11-27 ${name}: ${still} Hiding left with its plain form fields confirmed and ${asks.length} worked-out Yes/No not yet asked`);
    for (const { f, x } of asks) { const why = await through(id, f, x, true); if (why) refused.push(`${name} ${why}`); }
    after[name] = (await hiding(id)).length;
  }
  ok("C4.11-27 fail: with every plain form field confirmed, each combination with a worked-out Yes/No still holds its Hiding error until that Yes/No is asked, so B88's door is what clears it", worked > 0 && keptByYesNo === Object.values(FOUR).length, { worked_out: worked, combinations_still_held: keptByYesNo });
  ok("C4.11-27 pass (QA-239): through B86's and B88's doors only, each with a second person, Hiding is 0 on Spouse, Express Entry, Study permit and With an LMIA", Object.values(after).every((n) => n === 0) && !refused.length, { after, refused });
  const still = Number(sql(`select count(distinct lineage_key) from section_question where predicate_json is not null and status in ('DRAFT','PUBLISHED') and lineage_key in (${[...one.keys()].map((f) => `'${f}'`).join(",") || "''"})`));
  ok("C4.11-27 pass: the conditions are still in force (none was removed to get there)", still === one.size, { in_force: still, of: one.size });
  const unr2: Record<string, number> = {}; for (const [k, name] of Object.entries(FOUR)) unr2[name] = (await unreachable(T.combo(k))).length;
  ok("C4.11-27: still no Unreachable question on the four", Object.values(unr2).every((n) => n === 0), unr2);
  ok("C4.11-27: US$0 (Replay and Rules only; the ledger unchanged)", T.spent() === before, { before, after: T.spent() });
  console.log(`NOTE  C4.11-27 took ${Math.round((Date.now() - t0) / 1000)} s`);
  T.done();
});
