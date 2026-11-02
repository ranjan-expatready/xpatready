// C4.11 acceptance contract, part 4a (forms lane; acceptance/C4.11.test.ts, concept W1-ai-drafting §7): the plan and the
// run by the seven step keys over the same run engine. A passing and a failing case per rule, through the API on an
// isolated copy with the sample loaded (Work permit, family). Rules and saved answers only: NO model call, US$0.
//   P  plan: 7 steps in order, each with mode and cost {usual, worst}, a saved result for a replayed step, plan_sha256
//   V  refused in words: unknown step, out of order, an input not planned, a rules step not as rules, mixed AI modes
//   L  live is refused before anything runs (409, live.approved false) · A  only an author runs it
//   R  run: a plan not shown is refused (409); the same idempotency key is one run; BR-12 the spend limit is checked
//   S  /api/runs/:id names each step by its key with its outcome (done, nothing_to_do, …)
//   zsh studio/tools/isolated.sh forms_c411k 4455 start && tsx studio/tests/check_forms_c411_contract.ts 4455 xr_studio_forms_c411k
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const PORT = Number(process.argv[2] ?? 4455), DB = process.argv[3] ?? "xr_studio_forms_c411k";
type J = Record<string, any>;
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<{ status: number; body: J }> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: J = {}; try { j = JSON.parse(t); } catch { j = { text: t }; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: J }) => String(r.body?.detail ?? r.body?.message ?? "");
const STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"];
const AI = new Set(["documents", "conditions", "pqr_picks", "checker"]);
const asPlan = (ai: string) => STEPS.map((step) => ({ step, mode: AI.has(step) ? ai : "rules" }));

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load", {})).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const P = (steps: unknown, actor = "user-A") => call("POST", `/combinations/${wp}/draft/plan`, { steps }, actor);
  const spentBefore = sql("select coalesce(sum(cost_usd),0) from drafting_job");

  // P: the plan
  let r = await P(asPlan("replay"));
  const plan = r.body;
  ok("C4.11 P pass: the plan lists the 7 steps in order", r.status === 200 && JSON.stringify((plan.steps ?? []).map((s: J) => s.step)) === JSON.stringify(STEPS), r.status >= 300 ? words(r) : plan.steps);
  ok("C4.11 P pass: each step says its mode and its cost (usual and worst), US$0 for saved answers and rules", (plan.steps ?? []).length === 7 && plan.steps.every((s: J) => ["replay", "rules"].includes(s.mode) && s.cost?.usual === 0 && s.cost?.worst === 0) && plan.totals?.worst_usd === 0);
  ok("C4.11 P pass: a replayed step says what is known of its saved result (state, US$0); a rules step has none", plan.steps?.filter((s: J) => s.mode === "replay").every((s: J) => s.saved && s.saved.usd === 0 && typeof s.saved.state === "string") && plan.steps?.filter((s: J) => s.mode === "rules").every((s: J) => s.saved === null));
  ok("C4.11 P pass: the plan carries its fingerprint (plan_sha256)", /^[0-9a-f]{64}$/.test(String(plan.plan_sha256 ?? "")));
  const rulesPlan = (await P(asPlan("rules"))).body;
  ok("C4.11 P pass: rules only is another plan, with another fingerprint and no AI step", /^[0-9a-f]{64}$/.test(String(rulesPlan.plan_sha256 ?? "")) && rulesPlan.plan_sha256 !== plan.plan_sha256 && rulesPlan.steps?.every((s: J) => !s.uses_ai));

  // V: refused in words
  r = await P([{ step: "pqr_picks", mode: "replay" }, { step: "facts", mode: "rules" }]);
  ok("C4.11 V fail: steps out of order are refused (400, in words)", r.status === 400 && /order/i.test(words(r)), [r.status, words(r)]);
  r = await P([{ step: "documents", mode: "replay" }]);
  ok("C4.11 V fail: a step whose input is not planned is refused (400, naming it)", r.status === 400 && /documents needs facts/.test(words(r)), [r.status, words(r)]);
  r = await P([...asPlan("replay").slice(0, 6), { step: "summary", mode: "rules" }]);
  ok("C4.11 V fail: a step that is not one of the seven is refused (400, naming the seven)", r.status === 400 && /summary/.test(words(r)) && /comes_from/.test(words(r)), [r.status, words(r)]);
  r = await P(asPlan("replay").map((s) => (s.step === "facts" ? { ...s, mode: "replay" } : s)));
  ok("C4.11 V fail: a rules step planned as replay is refused (400: it is worked out by the rules)", r.status === 400 && /facts is worked out by the rules/.test(words(r)), [r.status, words(r)]);
  r = await P(asPlan("replay").map((s) => (s.step === "conditions" ? { ...s, mode: "rules" } : s)));
  ok("C4.11 V fail: mixed ways for the AI steps are refused for now (400, in words)", r.status === 400 && /one way|choose one/i.test(words(r)), [r.status, words(r)]);
  r = await P(asPlan("replay").slice(0, 3));
  ok("C4.11 V fail: a part of the run is refused for now (400: plan every step)", r.status === 400 && /comes_from/.test(words(r)), [r.status, words(r)]);

  // L: live waits for the founder's Go
  r = await P(STEPS.map((step) => ({ step, mode: AI.has(step) ? "live" : "rules" })));
  ok("C4.11 L pass: a plan with live steps is shown with live.approved false, its live costs not invented (null, in words)", r.status === 200 && r.body?.live?.approved === false && r.body.steps?.filter((s: J) => s.mode === "live").every((s: J) => s.cost?.worst === null && /founder/.test(s.cost?.why ?? "")) && r.body.totals?.worst_usd === null, [r.status, words(r), r.body?.live]);
  const batchesBefore = sql("select count(*) from ai_batch");
  const liveRun = await call("POST", `/combinations/${wp}/draft`, { planSha256: r.body?.plan_sha256 ?? "0".repeat(64), idempotencyKey: randomUUID(), spendLimitUsd: 0.01 });
  ok("C4.11 L fail (BR-12): running a live plan is refused before any call (409: use saved results or rules only)", liveRun.status === 409 && /saved results or rules only/.test(words(liveRun)) && sql("select count(*) from ai_batch") === batchesBefore, [liveRun.status, words(liveRun)]);

  const b0 = sql("select count(*) from ai_batch");
  r = await P(STEPS.map((step) => ({ step, mode: "live" })));
  ok("C4.11 L fail (review M1): every step asked live gets the live answer first (409, live.approved false, naming the rules steps); nothing starts", r.status === 409 && r.body?.live?.approved === false && /founder/.test(words(r)) && /facts/.test(words(r)) && sql("select count(*) from ai_batch") === b0, [r.status, words(r)]);
  // R and A: the run
  const key = randomUUID();
  r = await call("POST", `/combinations/${wp}/draft`, { planSha256: "0".repeat(64), idempotencyKey: key, spendLimitUsd: 0 });
  ok("C4.11 R fail: a run of a plan that was not shown is refused (409: plan again)", r.status === 409 && /plan again/i.test(words(r)), [r.status, words(r)]);
  r = await call("POST", `/combinations/${wp}/draft`, { planSha256: plan.plan_sha256, idempotencyKey: key, spendLimitUsd: 0 }, "user-B");
  ok("C4.11 A fail: the second person (not an author) cannot run it (403)", r.status === 403, r.status);
  r = await call("POST", `/combinations/${wp}/draft`, { planSha256: plan.plan_sha256, idempotencyKey: "short", spendLimitUsd: 0 });
  ok("C4.11 R fail: a request without a proper idempotency key is refused (400, in words)", r.status === 400 && /idempotency/i.test(words(r)), [r.status, words(r)]);
  r = await call("POST", `/combinations/${wp}/draft`, { planSha256: plan.plan_sha256, idempotencyKey: key, spendLimitUsd: 0 });
  const runId = r.body?.runId;
  ok("C4.11 R pass: the shown plan runs (201) with a run id, within a US$0 spend limit (BR-12)", r.status === 201 && /^[0-9a-f-]{36}$/.test(String(runId)), [r.status, words(r)]);
  const again = await call("POST", `/combinations/${wp}/draft`, { planSha256: plan.plan_sha256, idempotencyKey: key, spendLimitUsd: 0 });
  ok("C4.11 R pass: the same click twice (same idempotency key) is the same run, not a second one", again.body?.runId === runId && Number(sql(`select count(*) from ai_batch where idempotency_key like 'qd-key-${wp}-${key}'`)) === 1, [again.status, again.body]);
  const reused = await call("POST", `/combinations/${wp}/draft`, { planSha256: rulesPlan.plan_sha256, idempotencyKey: key, spendLimitUsd: 0 });
  ok("C4.11 R fail (review m2): a key already used for another plan is refused (409), never a quiet return of the other run", reused.status === 409 && /another plan/.test(words(reused)), [reused.status, words(reused)]);
  // S: the run view names each step by its key with its outcome
  let view: J = {};
  for (let i = 0; i < 120; i++) { view = (await call("GET", `/runs/${runId}`)).body; if (["done", "done_with_problems", "failed", "stopped"].includes(view.status)) break; await new Promise((res) => setTimeout(res, 500)); }
  if (!["done", "done_with_problems", "failed", "stopped"].includes(view.status)) { ok("C4.11 S: the run ended within a minute", false, view.status); }
  ok("C4.11 S pass: the run view names the 7 steps by their keys, in order", JSON.stringify((view.steps ?? []).map((s: J) => s.step)) === JSON.stringify(STEPS), (view.steps ?? []).map((s: J) => s.step));
  ok("C4.11 S pass: each step has its outcome in the contract's words (done, nothing_to_do, failed, …)", (view.steps ?? []).length === 7 && view.steps.every((s: J) => ["done", "nothing_to_do", "failed", "stopped"].includes(s.state)), (view.steps ?? []).map((s: J) => `${s.step}:${s.state}`));
  ok("C4.11 S pass: the rules steps are done", (view.steps ?? []).filter((s: J) => ["facts", "document_facts", "comes_from", "checker"].includes(s.step)).every((s: J) => s.state === "done"), (view.steps ?? []).map((s: J) => `${s.step}:${s.state}`));
  ok("C4.11 S pass: the run card keeps its own fields (status word, label, Stop flag)", typeof view.status_word === "string" && typeof view.label === "string" && "can_stop" in view);

  // A rules-only run: the AI steps have nothing to do (they are AI work), never a pretend result.
  const k2 = randomUUID();
  const rr = await call("POST", `/combinations/${wp}/draft`, { planSha256: rulesPlan.plan_sha256, idempotencyKey: k2, spendLimitUsd: 0 });
  let v2: J = {};
  if (rr.status === 201) for (let i = 0; i < 120; i++) { v2 = (await call("GET", `/runs/${rr.body.runId}`)).body; if (["done", "done_with_problems", "failed", "stopped"].includes(v2.status)) break; await new Promise((res) => setTimeout(res, 500)); }
  ok("C4.11 S fail: with rules only, documents and conditions are nothing_to_do (reading IRCC's text is AI work)", (v2.steps ?? []).filter((s: J) => ["documents", "conditions"].includes(s.step)).every((s: J) => s.state === "nothing_to_do") && (v2.steps ?? []).length === 7, [rr.status, words(rr), (v2.steps ?? []).map((s: J) => `${s.step}:${s.state}`)]);

  // Review m5: two identical clicks at the same moment are one run.
  const k3 = randomUUID();
  for (let i = 0; i < 120 && !["done", "done_with_problems", "failed", "stopped"].includes((await call("GET", `/runs/${rr.body?.runId}`)).body?.status); i++) await new Promise((res) => setTimeout(res, 500));
  const twin = await Promise.all([0, 1].map(() => call("POST", `/combinations/${wp}/draft`, { planSha256: rulesPlan.plan_sha256, idempotencyKey: k3, spendLimitUsd: 0 })));
  ok("C4.11 R pass (review m5): two identical clicks at the same moment are one run (same run id, one batch)", twin.every((x) => x.status === 201) && twin[0].body?.runId === twin[1].body?.runId && sql(`select count(*) from ai_batch where idempotency_key='qd-key-${wp}-${k3}'`) === "1", twin.map((x) => [x.status, x.body?.runId, words(x)]));
  ok("C4.11: the whole check spent US$0 (no model call)", sql("select coalesce(sum(cost_usd),0) from drafting_job") === spentBefore || Number(sql("select coalesce(sum(cost_usd),0) from drafting_job")) === 0);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
