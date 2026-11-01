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
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.11.test.ts 4440 xr_studio_accept
import { randomUUID } from "node:crypto";
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.11");
const { call, sql, ok, words } = T;
export const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"] as const;
const AI_STEPS = new Set(["documents", "conditions", "pqr_picks", "checker"]); // AI steps; the rest are rules

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  const before = T.spent();

  // ---------------------------------------------------------------- the plan
  const saved = STEPS.map((step) => ({ step, mode: AI_STEPS.has(step) ? "replay" : "rules" }));
  let r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: saved }, AUTHOR);
  ok("C4.11 pass: the plan lists the 7 steps in order", r.status < 300 && JSON.stringify((r.body?.steps ?? []).map((s: any) => s.step)) === JSON.stringify(STEPS), r.status >= 300 ? words(r) : (r.body?.steps ?? []).map((s: any) => s.step));
  const plan = r.body;
  ok("C4.11 pass: each step says its mode and its cost (usual and worst); Saved and Rules cost US$0", (plan?.steps ?? []).length === 7 && plan.steps.every((s: any) => ["replay", "rules"].includes(s.mode) && s.cost?.worst === 0 && s.cost?.usual === 0));
  ok("C4.11 pass: a Saved step names its saved result (date, edition, US$0, current)", (plan?.steps ?? []).length === 7 && (plan?.steps ?? []).filter((s: any) => s.mode === "replay").every((s: any) => s.saved && s.saved.usd === 0 && s.saved.state === "current" && !!s.saved.date));
  ok("C4.11 pass: the plan carries its fingerprint (plan_sha256)", /^[0-9a-f]{64}$/.test(String(plan?.plan_sha256 ?? plan?.planSha256 ?? "")));
  r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: STEPS.map((step) => ({ step, mode: "live" })) }, AUTHOR);
  ok("C4.11 fail: a plan with Live steps on a copy without the founder's Go says so and cannot run (live.approved false, in words)", r.status === 409 || r.body?.live?.approved === false, r.status >= 300 ? words(r) : r.body?.live);
  r = await call("POST", `/combinations/${vv}/draft/plan`, { steps: [{ step: "pqr_picks", mode: "replay" }, { step: "facts", mode: "rules" }] }, AUTHOR);
  ok("C4.11 fail: steps out of order, or a step whose inputs are not planned, are refused (400, in words)", r.status === 400, words(r));

  // ---------------------------------------------------------------- the run
  const key = randomUUID();
  r = await call("POST", `/combinations/${vv}/draft`, { planSha256: "0".repeat(64), idempotencyKey: key, spendLimitUsd: 0 }, AUTHOR);
  ok("C4.11 fail: a run of a plan that is not the one shown is refused (409: plan changed)", r.status === 409, words(r));
  r = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: key, spendLimitUsd: 0 }, AUTHOR);
  ok("C4.11 pass: the run starts (202 or 201) with a run id", r.status < 300 && !!r.body?.runId, r.status >= 300 ? words(r) : r.body);
  const runId = r.body?.runId;
  const again = await call("POST", `/combinations/${vv}/draft`, { planSha256: plan?.plan_sha256 ?? plan?.planSha256, idempotencyKey: key, spendLimitUsd: 0 }, AUTHOR);
  ok("C4.11 pass: the same click twice is one run (idempotency key)", !!runId && again.body?.runId === runId);
  const done = !!runId && await T.until(async () => ["COMPLETED", "FAILED"].includes(String((await call("GET", `/runs/${runId}`)).body?.status ?? "").toUpperCase()), 120_000);
  const view = (await call("GET", `/runs/${runId}`)).body;
  ok("C4.11 pass: the run finishes, each of the 7 steps with its outcome", done && (view?.steps ?? []).length === 7 && view.steps.every((s: any) => ["done", "nothing_to_do"].includes(s.state)), (view?.steps ?? []).map((s: any) => `${s.step}:${s.state}`));

  // ---------------------------------------------------------------- what waits in the queue
  const items = await T.queued(vv);
  const kinds = new Set(items.map((x: any) => x.kind));
  ok("C4.11 pass: the queue gets documents per person, where facts come from, conditions and PQR picks", ["requirement_line", "comes_from", "condition", "pqr_pick"].every((k) => kinds.has(k)), [...kinds]);
  const runSteps = new Set((view?.steps ?? []).map((s: any) => s.step));
  ok("C4.11 pass: every item names a step of this run (acceptance rate per step, P-130 §6.3)", items.length > 0 && items.every((x: any) => runSteps.has(x.step)), [...new Set(items.map((x: any) => x.step))]);
  ok("C4.11 pass: every AI item has both readings (draft and the independent checker) or is marked One reading only", items.length > 0 && items.filter((x: any) => x.origin === "ai").every((x: any) => (x.readings?.draft && x.readings?.check) || x.agreement === "one_round"));
  ok("C4.11 pass: every requirement line and condition rests on an official file with its quote found", items.length > 0 && items.filter((x: any) => ["requirement_line", "condition"].includes(x.kind)).every((x: any) => x.source?.quote_found === true));
  // Checker rules (step 7): a PQR pick is only for a fact a question asks (PQR ⊂ SQR, P-76); every fact said to come
  // from a document has that document on the person's checklist.
  const asked = new Set(items.filter((x: any) => x.kind === "comes_from" && x.readings?.draft?.payload?.from !== "case_officer").map((x: any) => `${x.readings.draft.payload.role}|${x.readings.draft.payload.factKey}`));
  ok("C4.11 pass (checker): every PQR pick is a fact a client or document question asks (PQR ⊂ SQR)", items.length > 0 && items.filter((x: any) => x.kind === "pqr_pick").every((x: any) => asked.has(`${x.readings?.draft?.payload?.role}|${x.readings?.draft?.payload?.factKey}`) || x.band === "decide"));
  const docs = new Set(items.filter((x: any) => x.kind === "requirement_line").map((x: any) => x.readings?.draft?.payload?.documentType));
  ok("C4.11 pass (checker): every fact from a document names a document on the checklist", items.length > 0 && items.filter((x: any) => x.kind === "comes_from" && x.readings?.draft?.payload?.from === "document").every((x: any) => docs.has(x.readings.draft.payload.documentType) || x.band !== "ready"));
  ok("C4.11 data: every item is Sample; nothing is in the combination's draft until accepted", items.length > 0 && items.every((x: any) => x.basis === "SAMPLE") && sql(`select count(*) from document_requirement where combination_id='${vv}'`) === "0");
  ok("C4.11 pass: the whole run spent US$0 (Replay and Rules only)", !!view && T.spent() === before && Number(view?.usd ?? 0) === 0);
  T.done();
});
