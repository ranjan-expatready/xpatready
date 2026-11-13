// QA-237, QA-239 (Major, C4.11; Bake row 6, P-447 (1); B86, B88): the bugs' reproductions from qa/BUGS.md, by route on the
// six through people's steps. QA-237: accepting a proposed condition and having a second person approve it made the draft
// refuse "Hiding a value a form reads". QA-239: the same approval on Visitor visa held every other combination whose form
// reads the question. Now such a condition is held where it cannot be honoured (engine/held-conditions.ts): the question
// is asked every time there, Review and release warns why, and the release goes through; confirming the form field (B86)
// still puts the condition in force. Nothing a form reads is ever hidden. Saved answers only: US$0, live AI off, the
// ledger unchanged. Every condition is Sample, Unconfirmed: expert. Fails on origin/main fbfb263c7 (the refusal).
//   zsh studio/tools/isolated.sh forms_held 4451 start && tsx studio/tests/check_forms_qa237_qa239_held.ts 4451 xr_studio_forms_held
import { randomUUID } from "node:crypto";
import { APPROVER, AUTHOR, REVIEWER, pack2, run } from "../acceptance/lib/pack2.ts";

const T = pack2("QA237");
const { call, sql, ok, until, words, done } = T;
const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"];
const AI = new Set(["documents", "conditions", "pqr_picks", "checker"]);
const HIDING = /^Hiding a value a form reads/, HELD = /^Condition not used on this combination: /;
const FIELDS = (id: string, fact: string) => `/combinations/${id}/questions/${encodeURIComponent(fact)}/form-fields`;
type Problem = { level?: string; item?: string; message?: string };
type Placement = { fact: string; condition?: unknown };
type Held = { fact: string; condition: unknown; why: string[] };

const config = async (id: string) => (await call("GET", `/combinations/${id}/config?mode=draft`)).body as { sha256: string; snapshot: { placements: Placement[]; held_conditions?: Held[] } };
const problems = async (id: string) => ((await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? []) as Problem[];
const approveWaiting = async () => { for (const c of sql("select id from library_change where status='WAITING'").split("\n").filter(Boolean)) await call("POST", `/library/changes/${c}/approve`, { note: "QA-237 test" }, APPROVER); };
/** Submit, sign and release as the three people do (B114's steps); the status of the release, and its words. */
async function release(id: string) {
  const sub = await call("POST", `/combinations/${id}/submit`, { note: "QA-239" }, AUTHOR);
  if (sub.status >= 300) return { status: sub.status, why: `submit: ${words(sub)} ${JSON.stringify((sub.body?.errors ?? []).slice(0, 3))}`.slice(0, 600) };
  const v = (await call("GET", `/combinations/${id}/review`, undefined, REVIEWER)).body?.submission;
  const items = (v?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
  const s = await call("POST", `/combinations/${id}/signoff`, { items, action: "signed" }, REVIEWER);
  if (s.status >= 300) return { status: s.status, why: `signoff: ${words(s)}`.slice(0, 300) };
  const r = await call("POST", `/combinations/${id}/approve`, undefined, APPROVER);
  return { status: r.status, why: words(r).slice(0, 300) };
}
/** Everything Study permit needs before Submit, by the people's steps (B114's `configured`). */
async function configured(id: string) {
  await T.questionsBySteps(id);
  const line = { attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client", sourceQuote: "QA-239 test line." };
  await call("POST", `/combinations/${id}/requirements`, { ...line, newTypeName: `QA-239 letter ${id.slice(0, 4)}` }, AUTHOR);
  let type = "";
  for (const p of sql("select id from proposal_item where kind='document_type' and status='waiting'").split("\n").filter(Boolean)) type = (await call("POST", "/review/proposals/decide", { ids: [p], action: "accept", reason: "QA-239 test line" }, AUTHOR)).body?.items?.[0]?.landedAs ?? type;
  await approveWaiting();
  const added = await call("POST", `/combinations/${id}/requirements`, { ...line, documentTypeKey: type }, AUTHOR);
  ok("setup: one document line on Study permit", added.status < 300, words(added).slice(0, 200));
  const unasked = async () => [...new Set((await problems(id)).filter((p) => /nobody is asked for it/.test(p.message ?? "")).map((p) => p.item!))];
  const chosen = sql(`select section_key from sqr_section_selection where combination_id='${id}' order by section_order limit 1`);
  const section = chosen || ((await config(id)).snapshot?.placements?.[0] as { section_id?: string } | undefined)?.section_id || "";
  for (const k of await unasked()) await call("POST", `/library/fields/${encodeURIComponent(k)}/placement`, { sectionKey: section, collectedFrom: "client_questionnaire", repeats: k.startsWith("case.") ? "once_per_case" : "per_person", tier: "case" }, AUTHOR);
  await approveWaiting();
  ok("setup: every fact Study permit's forms need is asked", (await unasked()).length === 0);
  await T.sourceGate(id);
}

run(async () => {
  ok("setup: Reset to the six", (await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR)).status < 300);
  await T.ready();
  const vv = T.combo("vv.single"), sp = T.combo("sp.outside");
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  await T.needQuestions(vv);
  const list = (await call("POST", `/combinations/${vv}/pqr-picks/plan`, { mode: "replay" }, AUTHOR)).body?.guide?.questions;
  ok("C4.11 pass: Visitor visa's question list is still vv.single-ae2133b8a398, so the saved run replays", String(list).endsWith("/vv.single-ae2133b8a398.questions.json"), list);
  await configured(sp);
  const spBefore = await config(sp);
  ok("setup: before any condition, Study permit holds none and has no Hiding error", !spBefore.snapshot.held_conditions && !(await problems(sp)).some((p) => HIDING.test(p.message ?? "")));
  const before = T.spent();

  // ---------------------------------------------------------------- the product's steps: draft, accept, a second person approves
  const plan = (await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI.has(step) ? "replay" : "rules" })) }, AUTHOR)).body;
  const r0 = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  await until(async () => ["COMPLETED", "DONE", "FAILED", "STOPPED", "CANCELLED"].includes(String((await call("GET", `/runs/${r0.body?.runId}`)).body?.status ?? "").toUpperCase()), 180_000);
  const queued = (await T.queued(vv)).filter((x: { kind: string; form_fields?: { fact?: string } }) => x.kind === "condition" && x.form_fields?.fact);
  const one = new Map<string, string>(); for (const x of queued) if (!one.has(x.form_fields.fact)) one.set(x.form_fields.fact, x.id);
  for (const id of one.values()) await call("POST", "/review/proposals/decide", { ids: [id], action: "accept", reason: "Accepted by a test as the person deciding (QA-237)." }, AUTHOR);
  let approved = 0;
  for (const c of sql(`select id from library_change where kind='placement_condition' and status='WAITING' order by proposed_at`).split("\n").filter(Boolean)) if ((await call("POST", `/library/changes/${c}/approve`, { note: "Approved by a test as the second person (QA-237)." }, APPROVER)).status < 300) approved++;
  const facts = [...one.keys()];
  ok("setup: Visitor visa's saved run proposes conditions on 7 questions; all accepted there and approved by a second person", one.size === 7 && approved === 7, { facts, approved });
  ok("C4.11: the whole run spent US$0 (Saved and Rules only)", T.spent() === before, T.spent());
  // QA-239: read here, after the conditions are approved on Visitor visa and before the B86 step below confirms one of its
  // form fields. That step is "for every combination that files the form": since BK-16 PR 2 (P-490) the Study permit files
  // IMM 5257 too (a child who will not study 6 months or more), so the confirmed condition is then in force there as well.
  const spMid = await config(sp);

  // ---------------------------------------------------------------- QA-237: the draft that accepted them
  const vvProblems = await problems(vv);
  const vvHiding = vvProblems.filter((p) => p.level === "error" && HIDING.test(p.message ?? "") && facts.includes(p.item ?? ""));
  const vvHeld = vvProblems.filter((p) => p.level === "warning" && HELD.test(p.message ?? ""));
  ok("C4.11 pass (QA-237): accepting and approving the proposed conditions leaves Visitor visa's draft with no \"Hiding a value a form reads\" error", vvHiding.length === 0, vvHiding.map((p) => p.message));
  const submitted = await call("POST", `/combinations/${vv}/submit`, { note: "QA-237" }, AUTHOR);
  const refusedFor = ((submitted.body?.errors ?? []) as Problem[]).filter((e) => HIDING.test(e.message ?? "") || facts.includes(e.item ?? ""));
  ok("C4.11 pass (QA-237): Submit refuses nothing for those conditions (the draft stays saveable)", refusedFor.length === 0, { status: submitted.status, refusedFor: refusedFor.map((e) => e.message) });
  ok("C4.11 pass (QA-237): instead, each condition Visitor visa's forms read outside it is a warning saying why and how to use it, in words, no field code", vvHeld.length > 0 && vvHeld.every((p) => /is asked every time here, because .+ reads its answer/.test(p.message ?? "") && /To use the condition here, make the form or its form fields apply under the same condition/.test(p.message ?? "") && !/person\.|case\.|form1\[/.test(p.message ?? "")), vvHeld.map((p) => p.message));
  const vvSnap = await config(vv);
  const vvHeldRows = vvSnap.snapshot.held_conditions ?? [];
  ok("C4.11 pass (QA-237, the guard rail): a held question carries no condition, so nothing a form reads is hidden; the library's condition is kept beside it", vvHeldRows.length === vvHeld.length && vvHeldRows.every((h) => !!h.condition && h.why.length > 0 && vvSnap.snapshot.placements.filter((p) => p.fact === h.fact).every((p) => !p.condition)), vvHeldRows.map((h) => h.fact));

  // The way to use it here is unchanged (B86): confirm the form field, a second person approves, and the condition is in force.
  const target = vvHeldRows.map((h) => h.fact).find((f) => vvHeld.some((p) => p.item === f && /IMM 5257 reads its answer whenever/.test(p.message ?? "") && !/; and /.test(p.message ?? "")));
  const rows = target ? ((await call("GET", FIELDS(vv, target), undefined, AUTHOR)).body?.rows ?? []) as { state: string; can_confirm: boolean; form_edition_id: string; data_path: string }[] : [];
  ok("C4.11 pass (QA-237): the panel still reads the library's condition for a held question and offers the confirmation", rows.length > 0 && rows.some((x) => x.state === "not_confirmed" && x.can_confirm), { target, rows: rows.map((x) => x.state) });
  for (const x of rows.filter((y) => y.can_confirm)) {
    const r = await call("POST", "/library/form-field-conditions", { combinationId: vv, fact: target, formEditionId: x.form_edition_id, dataPath: x.data_path, reason: "The form field's words say the same (QA-237 test)." }, AUTHOR);
    if (r.status < 300) await call("POST", `/library/changes/${r.body?.id ?? r.body?.changeId}/approve`, { note: "Checked by a test (QA-237)." }, APPROVER);
  }
  await approveWaiting();
  const after = await config(vv);
  ok("C4.11 pass (QA-237): once its form field holds the same condition, the question is no longer held and carries the condition again", !!target && !(after.snapshot.held_conditions ?? []).some((h) => h.fact === target) && after.snapshot.placements.some((p) => p.fact === target && !!p.condition), { target, held: (after.snapshot.held_conditions ?? []).map((h) => h.fact) });
  ok("C4.11 fail (control): every other held question is still held, so the step above can fail", (after.snapshot.held_conditions ?? []).length === vvHeldRows.length - 1, (after.snapshot.held_conditions ?? []).length);

  // ---------------------------------------------------------------- QA-239: another pathway that reads the same questions
  const spNow = await config(sp), spProblems = await problems(sp);
  const spHiding = spProblems.filter((p) => p.level === "error" && (HIDING.test(p.message ?? "") || /^Hiding a value a condition reads|^Unreachable question/.test(p.message ?? "")));
  ok("C4.11 setup (QA-239): Study permit reads at least one of the questions Visitor visa conditioned (the bug can show)", (spNow.snapshot.held_conditions ?? []).some((h) => facts.includes(h.fact)), (spNow.snapshot.held_conditions ?? []).map((h) => h.fact));
  ok("C4.11 pass (QA-239): the conditions approved on Visitor visa put no Hiding or Unreachable error on Study permit, whose author did nothing", spHiding.length === 0, spHiding.map((p) => p.message));
  ok("C4.11 pass (QA-239): Study permit's draft fingerprint is unchanged by another combination's condition", spMid.sha256 === spBefore.sha256, { before: spBefore.sha256, now: spMid.sha256 });
  // BK-16 PR 2: after the B86 step, the only question that newly carries a condition on the Study permit is the one whose IMM 5257
  // form field was confirmed, and only because the Study permit files IMM 5257 (its own form line); the rest stay held.
  const conditioned = (c: Awaited<ReturnType<typeof config>>) => new Set(c.snapshot.placements.filter((p) => !!p.condition).map((p) => p.fact));
  const spConditioned = [...conditioned(spNow)].filter((f) => !conditioned(spBefore).has(f));
  const spFiles5257 = (spNow.snapshot as { forms?: { form_number: string }[] }).forms?.some((f) => f.form_number === "IMM 5257") ?? false;
  ok("C4.11 pass (B86, BK-16 PR 2): the confirmed IMM 5257 form field puts only its own condition in force on the Study permit, which files IMM 5257", spFiles5257 ? JSON.stringify(spConditioned) === JSON.stringify([target]) : spNow.sha256 === spBefore.sha256, { spFiles5257, spConditioned, target });
  const rel = await release(sp);
  ok("C4.11 pass (QA-239): Study permit releases after the condition is approved on Visitor visa, 201", rel.status === 201, rel);
  const relSnap = (await call("GET", `/combinations/${sp}/config?mode=published`)).body?.snapshot as { placements: Placement[]; held_conditions?: Held[] } | undefined;
  const asked = (relSnap?.held_conditions ?? []).map((h) => h.fact);
  ok("C4.11 pass (QA-239): in Study permit's release those questions are asked every time (no condition), so its forms always have the answer", asked.length > 0 && asked.every((f) => (relSnap?.placements ?? []).filter((p) => p.fact === f).every((p) => !p.condition)), asked);
  ok("C4.11: the run still spent US$0", T.spent() === before, T.spent());
  done();
});
