// C4.11 acceptance (P-220 pack 2; P-130, P-131, P-139, P-121): "Draft questions and documents" is one run of 7 steps for a
// combination — (1) facts per person role, (2) documents per person and when, (3) facts each document supplies,
// (4) where each fact comes from, (5) conditional questions, (6) PQR picks, (7) an independent checker plus the rules —
// planned first (each step Live, Replay (a saved run) or Rules only, with its cost), every proposal into the one review queue. Live once
// on Visitor visa (founder-approved), saved after; this test uses Replay and Rules only (US$0).
// Today none of it exists (no plan, no run), so this fails.
// ROUTES (concept W1-ai-drafting §7). Questions for the tech lead: (a) the concept names 3 kinds (who_and_when · documents
// · checks) where the capability names 7 steps — this test uses the 7 step keys below; (b) the mode word: the concept says
// "saved", the code (people-ai, field drafts, checklist) says "replay" — this test uses "replay", the API's word.
//   POST /combinations/:id/draft/plan {steps:[{step, mode: "live"|"replay"|"rules"}]}
//   POST /combinations/:id/draft {planSha256, idempotencyKey, spendLimitUsd}
// IRCC rules the checker enforces (compliance trace, Pack 2): the checklist's documents per person (IRCC-P2-10..15), each
// family member's own forms (IRCC-P2-02), every background question answered (IRCC-P2-19).
// Needs first: the saved runs of the AI steps on Visitor visa, recorded once in the founder-approved live trial (P-131;
// its cost stated before it is spent) and committed with the build.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.11.test.ts 4440 xr_studio_accept
// Each step's line is labelled C4.11-<n> (C4.11-G5 for G5; C4.11-0 only when the plan is refused) so a PR can name the
// steps it makes green (gate B, tools/gate-b.mjs stepsVerdict; qa lane, 4 Nov, Lead 8's ruling on #967).
// Run it on a fresh copy each time (review m6, 4 Nov): G5 accepts the run's Ready items, so a second run on the same copy
// finds none left to accept.
import { randomUUID } from "node:crypto";
import { APPROVER, AUTHOR, pack2, REVIEWER, run, VV_PEOPLE } from "./lib/pack2.ts";
import { WHO_HOLDERS, WHO_ROLES, type Who } from "../contracts/resolver.ts";

const T = pack2("C4.11");
const { call, sql, ok, words } = T;
export const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"] as const;
const AI_STEPS = new Set(["documents", "conditions", "pqr_picks", "checker"]); // AI steps; the rest are rules

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  // P-322 (QA-144 part 1, B52): on the six the questions come from the people's own steps (acceptance/lib/pack2.ts
  // questionsBySteps), as C4.7's pack does; on the fixture they are there already.
  await T.needQuestions(vv);
  const before = T.spent();

  // ---------------------------------------------------------------- the plan
  const saved = STEPS.map((step) => ({ step, mode: AI_STEPS.has(step) ? "replay" : "rules" }));
  let r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: saved }, AUTHOR);
  // QA-144 (placement, #798): on the six from the Demo menu no combination asks any question yet, and Visitor visa's
  // IMM 5257 map may not be applied, so nothing can be drafted or land. Each line that this blocks names QA-144.
  const roles = (await call("GET", `/combinations/${vv}/workspace?tab=questionnaires`)).body?.questionnaire?.roles ?? [];
  const blocked = !roles.some((x: any) => x.questions > 0) ? " — blocked by QA-144 (no question of this combination is placed yet)" : "";
  if (r.status >= 300 && blocked) {
    ok(`C4.11-0 blocked by QA-144: the plan is refused because Visitor visa has no questions placed and no form fields mapped from the Demo menu, so the 7 steps cannot run here (run it on Visitor visa set up by tests/runtime/setup_visitor_visa.ts)`, false, words(r));
    T.done();
  }
  ok("C4.11-1 pass: the plan lists the 7 steps in order", r.status < 300 && JSON.stringify((r.body?.steps ?? []).map((s: any) => s.step)) === JSON.stringify(STEPS), r.status >= 300 ? words(r) : (r.body?.steps ?? []).map((s: any) => s.step));
  const plan = r.body;
  ok("C4.11-2 pass: each step says its mode and its cost (usual and worst); Saved and Rules cost US$0", (plan?.steps ?? []).length === 7 && plan.steps.every((s: any) => ["replay", "rules"].includes(s.mode) && s.cost?.worst === 0 && s.cost?.usual === 0));
  ok("C4.11-3 pass: a Saved step names its saved result (date, edition, US$0, current)", (plan?.steps ?? []).length === 7 && (plan?.steps ?? []).filter((s: any) => s.mode === "replay").every((s: any) => s.saved && s.saved.usd === 0 && s.saved.state === "current" && !!s.saved.date));
  ok("C4.11-4 pass: the plan carries its fingerprint (plan_sha256)", /^[0-9a-f]{64}$/.test(String(plan?.plan_sha256 ?? plan?.planSha256 ?? "")));
  r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: "live" })) }, AUTHOR);
  ok("C4.11-5 fail: a plan with Live steps on a copy without the founder's Go says so and cannot run (live.approved false, in words)", r.status === 409 || r.body?.live?.approved === false, r.status >= 300 ? words(r) : r.body?.live);
  r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: [{ step: "pqr_picks", mode: "replay" }, { step: "facts", mode: "rules" }] }, AUTHOR);
  ok("C4.11-6 fail: steps out of order, or a step whose inputs are not planned, are refused (400, in words)", r.status === 400, words(r));

  // ---------------------------------------------------------------- the run
  const key = randomUUID();
  r = await call("POST", `/combinations/${vv}/draft`, { planSha256: "0".repeat(64), idempotencyKey: key, spendLimitUsd: 0 }, AUTHOR);
  ok("C4.11-7 fail: a run of a plan that is not the one shown is refused (409: plan changed)", r.status === 409, words(r));
  r = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: key, spendLimitUsd: 0 }, AUTHOR);
  ok("C4.11-8 pass: the run starts (202 or 201) with a run id", r.status < 300 && !!r.body?.runId, r.status >= 300 ? words(r) : r.body);
  const runId = r.body?.runId;
  const again = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: key, spendLimitUsd: 0 }, AUTHOR);
  ok("C4.11-9 pass: the same click twice is one run (idempotency key)", !!runId && again.body?.runId === runId);
  // QA-162 (4 Nov): the run view says its state in words (done, failed, stopped), as the run card shows it.
  const ENDED = ["COMPLETED", "DONE", "FAILED", "STOPPED", "CANCELLED"];
  const done = !!runId && await T.until(async () => ENDED.includes(String((await call("GET", `/runs/${runId}`)).body?.status ?? "").toUpperCase()), 120_000);
  const view = (await call("GET", `/runs/${runId}`)).body;
  ok("C4.11-10 pass: the run finishes, each of the 7 steps with its outcome", done && (view?.steps ?? []).length === 7 && view.steps.every((s: any) => ["done", "nothing_to_do"].includes(s.state)), (view?.steps ?? []).map((s: any) => `${s.step}:${s.state}`));

  // ---------------------------------------------------------------- what waits in the queue
  const items = await T.queued(vv);
  const kinds = new Set(items.map((x: any) => x.kind));
  ok(`C4.11-11 pass: the queue gets documents per person, conditions and PQR picks${blocked}`, ["requirement_line", "condition", "pqr_pick"].every((k) => kinds.has(k)), [...kinds]);
  // Step 4 is rules only: where each answer comes from applies at once and a person changes it on the Questions tab
  // (its run step says so); nothing of it waits on To review. Every fact a form needs has its source.
  const fs = (await call("GET", `/combinations/${vv}/fact-sources`, undefined, AUTHOR)).body;
  const step4 = (view?.steps ?? []).find((s: any) => s.step === "comes_from");
  ok("C4.11-12 pass: step 4 gives every fact a form needs its source (document, client or case officer), changeable on the Questions tab", (fs?.facts ?? []).length > 0 && fs.facts.every((f: any) => ["DOCUMENT", "CLIENT", "AGENT"].includes(f.source)) && /Questions tab/.test(String(step4?.message ?? "")), { facts: fs?.facts?.length, step4: step4?.message });
  // Step 2 replays the checklist's own saved reading (the one door, QA-157), so its items carry the checklist's step name.
  const runSteps = new Set([...(view?.steps ?? []).flatMap((s: any) => [s.step, s.kind]), ...((view?.steps ?? []).some((s: any) => s.step === "documents") ? ["checklist_draft"] : [])]);
  ok("C4.11-13 pass: every item names a step of this run (acceptance rate per step, P-130 §6.3)", items.length > 0 && items.every((x: any) => runSteps.has(x.step)), [...new Set(items.map((x: any) => x.step))]);
  ok("C4.11-14 pass: every AI item has both readings (draft and the independent checker) or is marked One reading only", items.length > 0 && items.filter((x: any) => x.origin === "ai").every((x: any) => (x.readings?.draft && x.readings?.check) || x.agreement === "one_round"));
  ok("C4.11-15 pass: every requirement line and condition rests on an official file with its quote found", items.length > 0 && items.filter((x: any) => ["requirement_line", "condition"].includes(x.kind)).every((x: any) => x.source?.quote_found === true));
  // Checker rules (step 7): a PQR pick is only for a fact a question asks (PQR ⊂ SQR, P-76); every fact said to come
  // from a document has that document on the person's checklist.
  const asked = new Set((fs?.facts ?? []).filter((f: any) => f.placed && f.source !== "AGENT").map((f: any) => `${f.role}|${f.fact}`));
  const pick = (x: any) => x.readings?.draft?.payload ?? x.readings?.check?.payload;
  ok(`C4.11-16 pass (checker): every PQR pick is a fact a client or document question asks (PQR ⊂ SQR)${blocked}`, items.some((x: any) => x.kind === "pqr_pick") && items.filter((x: any) => x.kind === "pqr_pick").every((x: any) => asked.has(`${pick(x)?.role}|${pick(x)?.factKey}`)), items.filter((x: any) => x.kind === "pqr_pick").map((x: any) => `${pick(x)?.role}|${pick(x)?.factKey}`));
  const docs = new Set(items.filter((x: any) => x.kind === "requirement_line").map((x: any) => x.readings?.draft?.payload?.documentType));
  // Review m5: read from the fact sources (step 4 puts nothing on To review); a document must be one the checklist lines name.
  const fromDoc = (fs?.facts ?? []).filter((f: any) => f.source === "DOCUMENT");
  ok("C4.11-17 pass (checker): every fact from a document names a document on the checklist", (fs?.facts ?? []).length > 0 && fromDoc.every((f: any) => !!f.document && docs.has(f.document)), { from_documents: fromDoc.length, missing: fromDoc.filter((f: any) => !docs.has(f.document)).map((f: any) => `${f.role}|${f.fact}|${f.document}`).slice(0, 5) });
  ok("C4.11-18 data: every item is Sample; nothing is in the combination's draft until accepted", items.length > 0 && items.every((x: any) => x.basis === "SAMPLE") && sql(`select count(*) from document_requirement where combination_id='${vv}'`) === "0");
  // BR-7: a role not in "Who can be in this application" never reaches the queue (Visitor visa lists no sponsor).
  // A line's "who" may be a group (each_applicant, couple_once): it names the roles WHO_ROLES gives (none for every applicant).
  const can = new Set([...VV_PEOPLE.map((p) => p.role), "case"]);
  const rolesOf = (x: any) => { const p = pick(x) ?? {}; return (p.roles ?? [p.role].filter(Boolean)).flatMap((r: string) => r in WHO_HOLDERS ? (WHO_ROLES[r as Who] ?? []) : [r]); };
  ok("C4.11-19 pass (BR-7): no item names a person role that Who can be does not list", items.length > 0 && items.every((x: any) => rolesOf(x).every((role: string) => can.has(role))), [...new Set(items.flatMap(rolesOf))]);
  // G5 (qa-1): after accepting every Ready item, no fact a form needs is asked of nobody.
  const ready = items.filter((x: any) => x.band === "ready").map((x: any) => x.id);
  // P-305 (review M1): an item that changes the shared library (a condition, a new item) is accepted on its own.
  const together = items.filter((x: any) => x.band === "ready" && !x.bulk_why).map((x: any) => x.id), alone = ready.filter((id: string) => !together.includes(id));
  for (let i = 0; i < together.length; i += 200) await call("POST", "/review/proposals/decide", { ids: together.slice(i, i + 200), action: "accept" }, AUTHOR);
  for (const id of alone) await call("POST", "/review/proposals/decide", { ids: [id], action: "accept" }, AUTHOR);
  const nobody = ((await call("GET", `/combinations/${vv}`)).body?.draft?.problems ?? []).filter((p: any) => /nobody is asked for it/.test(p.message));
  ok(`C4.11-G5 pass (G5): with the run's Ready items accepted, no fact a form needs is asked of nobody (any role)${blocked}`, ready.length > 0 && nobody.length === 0, { ready: ready.length, nobody: nobody.length });
  // BR-12: a live plan whose worst case is over what is left of the cap is refused before it starts (409, in words).
  r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: AI_STEPS.has(step) ? "live" : "rules" })) }, AUTHOR);
  const livePlan = r.body;
  // Never on a copy where live AI is approved (it could spend): the test says so and fails instead of calling.
  if (livePlan?.live?.approved !== false) r = { status: 0, body: { detail: "not tested: this copy did not say live AI is off (live.approved false)" } };
  else r = await call("POST", `/combinations/${vv}/draft`, { planSha256: livePlan?.plan_sha256 ?? livePlan?.planSha256 ?? "0".repeat(64), idempotencyKey: randomUUID(), spendLimitUsd: 0.01 }, AUTHOR);
  ok("C4.11-20 fail (BR-12): a live run whose worst case is over the spend limit is refused before any call (409, 'use saved results or rules only')", !!livePlan?.steps && r.status === 409 && /saved|rules only/i.test(words(r)), words(r));
  // BR-10: a newer text of the checklist is never replayed with an older reading. A saved reading is matched to the
  // checklist's text by checksum, not by its edition label (relabelling the same text changes nothing): here the
  // combination's checklist becomes a text no saved reading has read, so Saved is not offered for it. The exact
  // "earlier text → Out of date" rule is checked on scratch files by check_forms_c411_contract (O).
  const ckl = sql(`select id || '|' || coalesce(official_file, '') from source_attachment where combination_id='${vv}' and file_name='imm5484e.pdf' limit 1`).split("|");
  sql(`update source_attachment set official_file='imm5484e-newer-text.pdf' where id='${ckl[0]}'`);
  r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: saved }, AUTHOR);
  sql(`update source_attachment set official_file=${ckl[1] ? `'${ckl[1]}'` : "null"} where id='${ckl[0]}'`);
  const docStep = (r.body?.steps ?? []).find((s: any) => s.step === "documents");
  ok("C4.11-21 fail (BR-10): a checklist text no saved reading has read is not offered as Saved (Out of date or none, with the reason), never replayed silently", ["out_of_date", "none"].includes(docStep?.saved?.state) && !!docStep?.saved?.why, docStep?.saved);
  // Stop: a run can be stopped; it says so and adds nothing more.
  r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: "rules" })) }, AUTHOR);
  r = await call("POST", `/combinations/${vv}/draft`, { planSha256: r.body?.plan_sha256 ?? r.body?.planSha256 ?? "0".repeat(64), idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  const stopRun = r.body?.runId;
  const st = await call("POST", `/runs/${stopRun ?? randomUUID()}/stop`, {}, AUTHOR);
  const after = (await call("GET", `/runs/${stopRun ?? randomUUID()}`)).body;
  ok("C4.11-22 pass: Stop stops a run (its state says stopped or finished, in words)", !!stopRun && st.status < 300 && /stop|complet|finish|done/i.test(String(after?.status ?? "")), { stop: st.status, status: after?.status });
  // The run view gives its cost as { spent, worst } (US$).
  ok("C4.11-23 pass: the whole run spent US$0 (Replay and Rules only)", !!view && T.spent() === before && Number(view?.usd?.spent ?? view?.usd ?? NaN) === 0, view?.usd);
  // QA-237, B86 (P-322; qa's wording on #1053, P-334 (4)): a person accepts a condition, a second person approves it, and the way
  // out of "Hiding a value a form reads" works through the product's own routes. The draft's problems, not a full Submit, until
  // B82 is on main (Submit on the six is still refused for other reasons, QA-233), naming the exact question.
  const FF = "person.other_family_name", held = (await T.queued(vv)).find((x: any) => x.kind === "condition" && x.form_fields?.fact === FF);
  const hidingOf = async () => (((await call("GET", `/combinations/${vv}`)).body?.draft?.problems ?? []) as any[]).filter((p) => p.item === FF && /^Hiding a value a form reads/.test(p.message ?? ""));
  const asSecond = { note: "Approved by the C4.11 pack as the second person (QA-237)." };
  r = await call("POST", "/review/proposals/decide", { ids: [held?.id ?? randomUUID()], action: "accept" }, AUTHOR);
  const accepted = r;
  const change = (((await call("GET", "/library/changes?status=WAITING", undefined, APPROVER)).body ?? []) as any[]).find((c) => c.kind === "placement_condition" && c.key === FF);
  const second = change ? await call("POST", `/library/changes/${change.id}/approve`, asSecond, APPROVER) : { status: 0, body: null };
  const refused = await hidingOf();
  ok("C4.11-24 fail (QA-237): a condition accepted and approved, its form field not confirmed: the draft holds \"Hiding a value a form reads\" for that question, in the rule's words", accepted.status < 300 && second.status < 300 && refused.length > 0 && /Make the form or its form fields apply under the same condition, or remove the question's condition\.$/.test(refused[0]?.message ?? ""), refused[0]?.message ?? { accepted: words(accepted), second: words(second as any), change: change?.id ?? null });
  const boxes = (await call("GET", `/combinations/${vv}/questions/${encodeURIComponent(FF)}/form-fields`, undefined, AUTHOR)).body?.rows ?? [];
  const toConfirm = boxes.filter((x: any) => x.can_confirm);
  for (const x of toConfirm) {
    const c = await call("POST", "/library/form-field-conditions", { combinationId: vv, fact: FF, formEditionId: x.form_edition_id, dataPath: x.data_path }, AUTHOR);
    if (c.body?.id) await call("POST", `/library/changes/${c.body.id}/approve`, asSecond, APPROVER);
  }
  const left = await hidingOf();
  const inForce = (await call("GET", `/combinations/${vv}/questions/${encodeURIComponent(FF)}/form-fields`, undefined, AUTHOR)).body;
  ok("C4.11-25 pass (QA-237): the author confirms the form field through the new route, showing its own words, a second person approves: that error is gone for that question and the condition is still in force in the draft", toConfirm.length > 0 && toConfirm.every((x: any) => !!x.words) && left.length === 0 && !!inForce?.sentence && (inForce?.rows ?? []).length > 0 && inForce.rows.every((x: any) => x.state === "confirmed"), { confirmed: toConfirm.length, left: left.map((e) => e.message), rows: inForce?.rows?.map((x: any) => x.state) });
  // qa's wording on #1053 (the fill, BR-5): on a real case of a real release, Yes, a typed name, then No leaves no name for the form.
  // Visitor visa released through people's steps (B82 on main); its other problems are not this step's to prove, so it says them if refused.
  await T.people(vv, VV_PEOPLE.filter((p) => p.role === "principal"));
  await T.documentsBySteps(vv);
  await T.sourceGate(vv);
  const CLIENT = "user-P", OFFICER = "user-O";
  let release: { status: number; body: any } = await call("POST", `/combinations/${vv}/submit`, { note: "C4.11 pack: a release for the fill (QA-237)" }, AUTHOR);
  const refusedBy = release.status >= 300 ? ((release.body?.errors ?? []) as any[]).map((e) => String(e.message ?? "").slice(0, 160)) : [];
  if (release.status < 300) {
    const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
    await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? sub?.change_summary ?? []).map((x: any) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
    release = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  }
  const opened = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `C411-${randomUUID().slice(0, 8)}`, clientActor: CLIENT, principal: { displayName: "Sample Client A" } }, OFFICER)).body;
  const caseId = opened?.id;
  const subject = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people?.find((p: any) => p.role === "principal")?.subject_id;
  const say = async (fact: string, value: unknown) => {
    const view = (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body;
    const q = (view?.sections ?? []).flatMap((s: any) => s.questions).find((x: any) => x.subjectId === subject && x.fact === fact);
    return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId: q?.answer?.id ?? null }, CLIENT);
  };
  const copyOf = async (form: string) => {
    const g = await call("POST", `/runtime/cases/${caseId}/forms/${encodeURIComponent(form)}/${subject}/generate`, { idempotencyKey: randomUUID() }, OFFICER);
    await T.until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${g.body?.id}`, undefined, OFFICER)).body?.status), 90_000);
    return (await call("GET", `/runtime/form-copies/${g.body?.id}`, undefined, OFFICER)).body;
  };
  const GATE = "person.has_used_other_name", OLD = "Sample Old Name";
  // What a copy wrote, read back from its own record (the view holds no values): each form field's result and the facts frozen with it.
  const written = (id: string) => {
    const facts = JSON.parse(T.sql(`select s.facts_json::text from form_instance f join answer_snapshot s on s.id = f.snapshot_id where f.id = '${id}'`) || "[]") as any[];
    const boxes = (JSON.parse(T.sql(`select result_json::text from form_instance where id = '${id}'`) || "{}").boxes ?? []) as any[];
    return { name: facts.find((x) => x.fact === FF)?.value, gate: facts.find((x) => x.fact === GATE)?.value, box: boxes.find((x) => x.fact === FF), yesNo: boxes.find((x) => x.fact === GATE) };
  };
  const saidYes = await say(GATE, true), typed = await say(FF, OLD), saidNo = await say(GATE, false);
  const whenNo = await copyOf(toConfirm[0]?.form ?? ""), no = written(whenNo?.id);
  const saidYesAgain = await say(GATE, true);
  const whenYes = await copyOf(toConfirm[0]?.form ?? ""), yes = written(whenYes?.id);
  ok("C4.11-26 pass (the fill, BR-5): with the deciding answer No, that form field is not written, whatever is stored: Yes, a typed name, then No leaves no name for the form, and the form's Yes/No is written from the No", release.status < 300 && saidYes.status < 300 && typed.status < 300 && saidNo.status < 300 && whenNo?.status === "GENERATED" && no.name === undefined && no.box?.result === "not written" && /^Not needed/.test(no.box?.why ?? "") && no.gate === false && no.yesNo?.result === "written", { release: release.status, refusedBy, answers: [saidYes.status, typed.status, saidNo.status], copy: whenNo?.status, no });
  ok("C4.11-26 control: with the answer Yes again the same form field is written with the name, so the step above can fail", saidYesAgain.status < 300 && whenYes?.status === "GENERATED" && yes.name === OLD && yes.box?.result === "written" && yes.gate === true, { copy: whenYes?.status, yes });
  T.done();
});
