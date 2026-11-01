// C4.11 part 1 (P-130, P-131, P-121, P-123; W1-questions-and-documents concept §4; forms lane, swarm builder B4b):
// "Draft questions and documents", one run of seven steps on the shared run card, its items into the one review queue.
// A passing and a failing case per rule, through the API on an isolated copy with the sample loaded (Work permit,
// family: Guide 5487). Saved AI answers are written for this check into p2/runs and removed after. NO model call: US$0.
//   P  plan first: seven steps, how each runs, US$0, plan checksum · L  only US$0 ways (AI now waits for P-131)
//   A  author duty · R  one run, seven steps, on /api/runs/:id with its label, Stop between steps, one run at a time
//   S6 step 6 is C4.7's producer: rules picks into the queue, no duplicates; saved answers replayed (never shown live)
//   N  steps 2 and 5 say "not available yet", never a pretend result
//   K  step 7 rules: PQR ⊂ SQR · a document fact's document on the checklist (each with its rule named)
//   zsh studio/tools/isolated.sh forms_c411 4463 start STUDIO_SLOW_QD_STEP=150 && tsx studio/tests/check_forms_c411_draft_qd.ts 4463 xr_studio_forms_c411
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4463), DB = process.argv[3] ?? "xr_studio_forms_c411";
const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", ".."), RUNS = join(SOLUTION, "prototype", "p2", "runs"), PROMPTS = join(SOLUTION, "prototype", "p2", "prompts");
type J = Record<string, any>;
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0; const written: string[] = [];
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<{ status: number; body: J }> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: J = {}; try { j = JSON.parse(t); } catch { j = { text: t }; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const words = (r: { body: J }) => String(r.body?.detail ?? r.body?.message ?? r.body?.note ?? "");
const QUOTE = "You must show the officer that you are eligible under Canada’s Immigration law and that you will be in Canada for a temporary stay.";
const pick = (asks: string, why = "The officer tests it to decide eligibility, so a prospect is asked it first.") => ({ role: "principal", asks, quote: QUOTE, why });

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load", {})).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const plan = (mode: string, id = wp) => call("POST", `/combinations/${id}/draft-qd/plan`, { mode });
  /** The run goes on in the background (review M1): its result is read once it has ended (waits fail loudly). */
  const result = async (runId: string): Promise<{ status: number; body: J }> => {
    for (let i = 0; i < 300; i++) { const x = await call("GET", `/combinations/${wp}/draft-qd/${runId}`); if (x.status !== 409) return x; await new Promise((res) => setTimeout(res, 100)); }
    throw new Error(`run ${runId} did not end within 30 s`);
  };
  const run = async (mode: string, actor = "user-A") => { const p = await plan(mode); const s0 = await call("POST", `/combinations/${wp}/draft-qd`, { mode, planSha256: p.body?.plan_sha256 }, actor); if (s0.status !== 201) return s0; const x = await result(s0.body.runId); return { status: s0.status, body: { ...x.body, started: s0.body } }; };
  const waiting = (origin: string) => Number(sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='pqr_pick' and status='waiting' and origin='${origin}'`));
  const step = (r: { body: J }, kind: string) => (r.body.steps as { kind: string; status: string; message: string }[] | undefined)?.find((s) => s.kind === kind);

  // ---------------------------------------------------------------- P: the plan first
  let r = await plan("rules");
  const kinds = (r.body.steps ?? []).map((s: J) => s.kind).join(",");
  ok("C4.11 P pass: the plan lists the seven steps in order, how each runs, US$0, before anything runs", r.status === 200 && kinds === "qd_facts,qd_documents,qd_document_facts,qd_sources,qd_conditions,pqr_picks,qd_check" && r.body.totals.worst_usd === 0 && r.body.facts.total > 0 && /^[0-9a-f]{64}$/.test(r.body.plan_sha256), { kinds, facts: r.body.facts?.total });
  ok("C4.11 N pass: the plan says steps 2 and 5 are AI work, not run with rules only; no step is a pretend result", r.body.steps?.filter((s: J) => s.how === "not_yet").length === 0 && r.body.steps?.[1]?.how === "ai_only" && r.body.steps?.[4]?.how === "ai_only", r.body.steps?.map((s: J) => s.how));
  r = await call("POST", `/combinations/${wp}/draft-qd`, { mode: "rules", planSha256: "0".repeat(64) });
  ok("C4.11 P fail: a run whose plan was not looked at (another checksum) is refused in words (409), nothing started", r.status === 409 && /plan again/.test(words(r)) && sql(`select count(*) from ai_batch where operation='draft_questions_documents'`) === "0", words(r));
  r = await plan("fast");
  ok("C4.11 P fail: an unknown way is refused in words (400)", r.status === 400 && /rules only or saved AI answers/.test(words(r)), words(r));
  r = await plan("rules", "00000000-0000-4000-8000-000000000000");
  ok("C4.11 P fail: an unknown combination is refused in words (404)", r.status === 404 && /does not exist/.test(words(r)), words(r));

  r = await call("POST", `/combinations/${wp}/draft-qd/plan`, { mode: "rules" }, "user-O");
  ok("C4.11 A fail (break m2): the case officer cannot read the plan (403)", r.status === 403, r.status);

  // ---------------------------------------------------------------- L: only US$0 ways
  r = await plan("live");
  ok("C4.11 L fail: AI now is refused in words until the founder's live trial (409)", r.status === 409 && /live trial/.test(words(r)), words(r));
  r = await plan("replay");
  ok("C4.11 L pass: saved AI answers plan at US$0, step 6 marked as saved AI answers", r.status === 200 && r.body.totals.worst_usd === 0 && r.body.steps.find((s: J) => s.kind === "pqr_picks")?.how === "saved", r.body.steps?.find((s: J) => s.kind === "pqr_picks"));

  // ---------------------------------------------------------------- A: author duty
  r = await run("rules", "user-B");
  ok("C4.11 A fail: the approver (no author duty) cannot start the run (403)", r.status === 403, r.status);

  // ---------------------------------------------------------------- S6 replay fail: nothing saved → says so, never looks live
  r = await run("replay");
  const c5none = step(r, "qd_conditions");
  ok("C4.11 C fail: with no saved AI answer for the conditions, step 5 says so, proposes nothing, US$0", c5none?.status === "FAILED" && /No saved AI answer/.test(c5none.message) && sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition'`) === "0", c5none);
  const s6none = step(r, "pqr_picks"), firstDocs = step(r, "qd_documents"), firstLines = Number(sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='requirement_line' and status='waiting'`));
  ok("C4.11 S6 fail: with no saved AI answer, step 6 says so and proposes nothing, US$0; step 7 still runs", r.status === 201 && waiting("ai") === 0 && r.body.usd === 0 && s6none?.status === "FAILED" && /No saved AI answer/.test(s6none.message) && step(r, "qd_check")?.status === "COMPLETED", s6none);
  ok("C4.11 S6 fail (break m4): the reply says the run had a problem and names step 6, never only \"rules pass\"", r.body.status === "done_with_problems" && /Not done:.*Pre-qualification picks/.test(r.body.note), r.body.note);
  let card = await call("GET", `/runs/${r.body.runId}`);
  ok("C4.11 R pass: the run shows on the shared run card with its label, seven steps and Done with problems (step 6)", card.status === 200 && card.body.label === "Drafting questions and documents" && card.body.steps.length === 7 && card.body.status === "done_with_problems" && card.body.usd.spent === 0 && card.body.error?.next === null, { label: card.body.label, status: card.body.status, steps: card.body.steps?.length });

  // ---------------------------------------------------------------- S6 replay pass: saved answers replayed, labelled as saved
  const guideFile = (await call("POST", `/combinations/${wp}/pqr-picks/plan`, { mode: "replay" })).body.guide.file as string;
  const inputs = [{ file: guideFile, sha256: sha(readFileSync(join(SOLUTION, guideFile))) }];
  const save = (check: boolean, picks: unknown[]) => {
    const f = `studio-pqr-picks${check ? "-check" : ""}-c411-test-live-20261101t150000000z-${check ? "c" : "d"}${Date.now().toString(36)}.json`;
    mkdirSync(RUNS, { recursive: true });
    writeFileSync(join(RUNS, f), JSON.stringify({ caller: "live", contract_valid: true, launch_evidence: { template_sha256: sha(readFileSync(join(PROMPTS, check ? "pqr-picks-check.v1.md" : "pqr-picks.v1.md"))) }, drafting_run: { status: "completed", inputs: { official_files: inputs, combination: "wp.family" }, usage: { cost_usd: 0.4 } }, raw_output: JSON.stringify({ picks, unresolved: [] }) }));
    written.push(join(RUNS, f));
  };
  save(false, [pick("Date of birth", "The guide tests age-related eligibility.")]); save(true, [pick("Date of birth", "The guide tests age-related eligibility.")]);
  r = await run("replay");
  const s6saved = step(r, "pqr_picks");
  ok("C4.11 S6 pass: saved AI answers are replayed into the queue at US$0, as AI items", r.status === 201 && r.body.proposed > 0 && r.body.usd === 0 && s6saved?.status === "COMPLETED" && waiting("ai") === r.body.proposed, { proposed: r.body.proposed, ai: waiting("ai"), s6saved });
  card = await call("GET", `/runs/${r.body.runId}`);
  ok("C4.11 S6 pass: the card shows step 6 as AI work but spent US$0, never as a live run", card.body.steps?.find((s: J) => s.kind === "pqr_picks")?.uses === "ai" && card.body.usd.spent === 0 && sql(`select mode from ai_batch where id='${r.body.runId}'`) === "REPLAY", card.body.steps?.find((s: J) => s.kind === "pqr_picks"));

  // ---------------------------------------------------------------- R + S6 rules: the whole run, rules only
  r = await run("rules");
  const rulesProposed = r.body.proposed;
  ok("C4.11 R pass (review M1): starting answers at once with the run id while the steps go on (the card and Stop show at once)", r.body.started?.status === "running" && r.body.started?.runId === r.body.runId, r.body.started);
  ok("C4.11 R pass: rules only runs all seven steps as one run; step 6 puts the rules' picks on the queue, US$0", r.status === 201 && r.body.status === "done" && r.body.steps.length === 7 && rulesProposed > 0 && waiting("rules") === rulesProposed && r.body.usd === 0
    && ["qd_facts", "qd_document_facts", "qd_sources", "pqr_picks", "qd_check"].every((k) => step(r, k)?.status === "COMPLETED"), r.body.steps?.map((s: J) => `${s.kind}:${s.status}`));
  ok("C4.11 N pass: with rules only, steps 2 and 5 say they are AI work and are not run", step(r, "qd_conditions")?.status === "SKIPPED" && /AI work/.test(step(r, "qd_conditions")?.message ?? "") && step(r, "qd_documents")?.status === "SKIPPED" && /saved AI answers/.test(step(r, "qd_documents")?.message ?? ""), step(r, "qd_documents"));
  ok("C4.11 R pass: one run is one batch with exactly its seven steps", sql(`select count(*) from drafting_job where batch_id='${r.body.runId}'`) === "7", sql(`select string_agg(kind, ',') from drafting_job where batch_id='${r.body.runId}'`));
  ok("C4.11 pass: step 1 says the facts per person, step 4 where each answer comes from, in words", /facts the forms need: .+ \d+/.test(step(r, "qd_facts")?.message ?? "") && /Document \d+ · Client \d+ · Case officer \d+/.test(step(r, "qd_sources")?.message ?? ""), [step(r, "qd_facts")?.message, step(r, "qd_sources")?.message]);
  const r2 = await run("rules");
  ok("C4.11 S6 fail: running it again puts no pick on the queue twice", r2.status === 201 && r2.body.proposed === 0 && waiting("rules") === rulesProposed, { again: r2.body.proposed, waiting: waiting("rules") });

  // ---------------------------------------------------------------- R: one run at a time; Stop between steps
  const p1 = (await plan("rules")).body.plan_sha256;
  const two = await Promise.all([1, 2].map(() => call("POST", `/combinations/${wp}/draft-qd`, { mode: "rules", planSha256: p1 })));
  const started = two.filter((x) => x.status === 201).map((x) => x.body.runId as string);
  for (const id of started) await result(id);
  const overlap = started.length === 2 && sql(`select count(*) from ai_batch a join ai_batch b on a.id='${started[0]}' and b.id='${started[1]}' where a.started_at < b.finished_at and b.started_at < a.finished_at`) === "1";
  ok("C4.11 R fail: two runs started at the same moment never run together: the second is refused in words (409)", started.length >= 1 && !overlap && two.every((x) => x.status === 201 || (x.status === 409 && /being drafted already/.test(words(x)))), two.map((x) => `${x.status} ${words(x).slice(0, 60)}`));
  const p2 = (await plan("rules")).body.plan_sha256;
  const going = call("POST", `/combinations/${wp}/draft-qd`, { mode: "rules", planSha256: p2 });
  let stopped: { status: number; body: J } | null = null;
  for (let i = 0; i < 100 && !stopped; i++) {
    const id = sql(`select id from ai_batch where operation='draft_questions_documents' and status='RUNNING' limit 1`);
    if (id) {
      const other = await call("POST", `/runs/${id}/stop`, undefined, "user-B");
      ok("C4.11 R fail (break M1): the approver (no author duty) cannot stop a run (403)", other.status === 403, other.status);
      stopped = await call("POST", `/runs/${id}/stop`);
    }
    else await new Promise((res) => setTimeout(res, 20));
  }
  const ended = await result((await going).body.runId);
  ok("C4.11 R pass: Stop ends the run between steps; later steps are not run", !!stopped && stopped.status < 300 && ended.body.status === "stopped" && ended.body.steps.at(-1)?.status === "CANCELLED" && ended.body.steps[0]?.status !== "WAITING" && sql(`select status from ai_batch where id='${ended.body.runId}'`) === "CANCELLED", { stop: stopped?.status, status: ended.body.status, steps: ended.body.steps?.map((s: J) => s.status) });
  ok("C4.11 R pass (break M1): the activity log says who stopped the run", sql(`select count(*) from audit_event where action='stopped' and entity_key='${ended.body.runId}'`) === "1", sql(`select string_agg(summary, ' | ') from audit_event where entity_key='${ended.body.runId}'`));
  r = await call("POST", `/runs/${ended.body.runId}/stop`);
  ok("C4.11 R fail: a run that has ended cannot be stopped again (409)", r.status === 409 && /already ended/.test(words(r)), words(r));

  // ---------------------------------------------------------------- D: step 2, documents and when (C2.6's saved readings)
  // The sample attaches IMM 5488 to this combination; with it set aside, there is no checklist to read.
  sql(`update source_attachment set recognised=false where combination_id='${wp}' and kind='Document checklist'`);
  r = await run("replay");
  sql(`update source_attachment set recognised=true where combination_id='${wp}' and kind='Document checklist'`);
  ok("C4.11 D fail: with no official checklist among its sources, step 2 says how to get one and proposes nothing", step(r, "qd_documents")?.status === "FAILED" && /No official document checklist/.test(step(r, "qd_documents")?.message ?? ""), step(r, "qd_documents"));
  for (const name of ["imm5488e.pdf", "imm5483e.pdf"]) {
    const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(SOLUTION, "official-sources", "ircc", "checklists", name)))]), name); fd.append("combinationId", wp);
    const x = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
    if (!x.ok) throw new Error(`intake of ${name} answered ${x.status}`);
  }
  ok("C4.11 D pass: the first saved-answers run replays IMM 5488's saved reading into requirement lines for To review (US$0)", firstDocs?.status === "COMPLETED" && /IMM 5488[^;]*: \d+ document requirements? for To review/.test(firstDocs.message) && firstLines > 0, { firstLines, message: firstDocs?.message });
  const lines = () => Number(sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='requirement_line' and status='waiting'`));
  r = await run("replay");
  const d2 = step(r, "qd_documents");
  ok("C4.11 D pass: with two checklists, step 2 names each: IMM 5488 replayed before (no line twice), IMM 5483 has no saved reading", d2?.status === "COMPLETED" && lines() === firstLines && /IMM 5488[^;]*: replayed before/.test(d2.message) && /IMM 5483[^;]*: no saved AI reading/.test(d2.message) && r.body.usd === 0, { lines: lines(), message: d2?.message });
  ok("C4.11 D pass: the lines are the checklist page's own draft (decided and applied there), each a requirement line with its quote", sql(`select count(distinct p.run_id) from proposal_item p join drafting_job j on j.id=p.run_id where p.combination_id='${wp}' and p.kind='requirement_line' and j.kind='checklist_draft' and j.mode='REPLAY'`) === "1" && sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='requirement_line' and (source->>'quote') is null`) === "0");
  const n2 = lines();
  r = await run("replay");
  ok("C4.11 D fail: drafting again puts no requirement line on the queue twice", lines() === n2 && /replayed before/.test(step(r, "qd_documents")?.message ?? ""), { before: n2, after: lines(), message: step(r, "qd_documents")?.message });

  // ---------------------------------------------------------------- C: step 5, conditional questions (saved answers)
  const facts5 = ((await call("GET", `/combinations/${wp}/fact-sources`)).body.facts ?? []) as { role: string; fact: string; label: string; placed: boolean; forms: string[] }[];
  const mine5 = facts5.filter((f) => f.role === "principal" && f.placed && f.forms.length);
  const uniq = mine5.filter((f) => mine5.filter((g) => g.label.toLowerCase() === f.label.toLowerCase()).length === 1);
  const typeOf = new Map(sql(`select distinct on (canonical_field_key) canonical_field_key || '|' || value_type from canonical_field order by canonical_field_key, version desc`).split("\n").map((l) => l.split("|") as [string, string]));
  const yesNo = uniq.filter((f) => typeOf.get(f.fact) === "yes_no"), text = uniq.filter((f) => typeOf.get(f.fact) === "text");
  const others = uniq.filter((f) => !yesNo.slice(0, 2).includes(f) && !text.slice(0, 1).includes(f));
  const [cd1, cd2] = yesNo, [ctext] = text, [ct1, ct2, ct3] = others;
  const cond = (asks: string, depends_on: string, when = "yes", quote = QUOTE) => ({ role: "principal", asks, depends_on, when, quote, why: "The guide asks it only in this case." });
  const saveC = (check: boolean, conditions: unknown[]) => {
    const f = `studio-qd-conditions${check ? "-check" : ""}-c411-test-live-20261101t170000000z-${check ? "c" : "d"}${Date.now().toString(36)}.json`;
    writeFileSync(join(RUNS, f), JSON.stringify({ caller: "live", contract_valid: true, launch_evidence: { template_sha256: sha(readFileSync(join(PROMPTS, check ? "conditions-check.v1.md" : "conditions.v1.md"))) }, drafting_run: { status: "completed", inputs: { official_files: inputs, combination: "wp.family" }, usage: { cost_usd: 0.5 } }, raw_output: JSON.stringify({ conditions, unresolved: [] }) }));
    written.push(join(RUNS, f));
  };
  if (cd1 && cd2 && ctext && ct1 && ct2 && ct3) {
    saveC(false, [cond(ct1.label, cd1.label), cond(ct2.label, cd2.label, "no"), cond("A made up question", cd1.label), cond(ct3.label, cd1.label, "yes", "This sentence is not anywhere in the guide at all."), cond(ct3.label, ctext.label, "yes")]);
    saveC(true, [cond(ct1.label, cd1.label), cond(ct2.label, cd2.label, "yes"), cond(ct3.label, ctext.label, "yes")]);
    r = await run("replay");
    const c5 = step(r, "qd_conditions");
    const item = (t: string, d: string) => sql(`select agreement || '|' || confidence || '|' || (select bool_and((x->>'passed')::boolean) from jsonb_array_elements(rules) x) || '|' || (payload->'condition'->'tree'->>'value') from proposal_item where combination_id='${wp}' and kind='condition' and identity_key='principal|${t}|${d}'`).split("|");
    const [ag1, cf1, rules1, v1] = item(ct1.fact, cd1.fact), [ag2, cf2] = item(ct2.fact, cd2.fact);
    ok("C4.11 C pass: both readings give the same question, deciding yes-no question and answer: agreed, value true; Ready when every rule passes, else Check with the reason", c5?.status === "COMPLETED" && ag1 === "agreed" && v1 === "true" && cf1 === (rules1 === "t" ? "ready" : "check"), { ag1, cf1, rules1, v1, message: c5?.message });
    ok("C4.11 C fail: the readings give different deciding answers: Check, never Ready", ag2 === "differ" && cf2 === "check", { ag2, cf2 });
    const details = sql(`select detail->>'details' from drafting_job where batch_id='${r.body.runId}' and kind='qd_conditions'`);
    ok("C4.11 C fail (review M1): a free-text deciding question cannot decide by one answer: left out with the reason, never Ready", /free-text|text form/.test(details) && item(ct3.fact, ctext.fact)[0] === "", details.split("\n").find((l) => /text form/.test(l)));
    ok("C4.11 C fail: a question this combination does not ask, and a sentence not in the guide, are left out with the reason (never guessed)", /not exactly one question/.test(details) && /not in Guide 5487/.test(details) && sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition'`) === "2", c5?.message);
    ok("C4.11 C pass: each condition names the question it hides, quotes the guide, and reads the deciding question", sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition' and origin='ai' and source->>'quote' is not null and payload->'condition'->'tree'->>'field' in ('${cd1.fact}','${cd2.fact}') and payload->'condition'->>'sentence' like '"%" is asked only when %'`) === "2");
    r = await run("replay");
    ok("C4.11 C fail: drafting again puts no condition on the queue twice", sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition'`) === "2" && /2 already waiting/.test(step(r, "qd_conditions")?.message ?? ""), step(r, "qd_conditions")?.message);
    const cid = sql(`select id from proposal_item where combination_id='${wp}' and kind='condition' and identity_key='principal|${ct2.fact}|${cd2.fact}'`);
    const acc = await call("POST", "/review/proposals/decide", { ids: [cid], action: "accept" });
    ok("C4.11 C fail: a condition is not yet accepted on the queue (its lander is part 3): refused in words, nothing changes", acc.status === 409 && /not yet on this queue/.test(words(acc)) && sql(`select status from proposal_item where id='${cid}'`) === "waiting", words(acc));
    const rej = await call("POST", "/review/proposals/decide", { ids: [cid], action: "reject", reason: "The guide means something else here." });
    r = await run("replay");
    ok("C4.11 C fail (review m1): a condition a person removed is not proposed again", rej.status < 300 && sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition' and status='waiting'`) === "1" && /1 a person removed before/.test(step(r, "qd_conditions")?.message ?? ""), { rej: rej.status, message: step(r, "qd_conditions")?.message });
  } else ok("C4.11 C setup: the sample has two yes-no, one free-text and three other principal questions with distinct names", false, { yesNo: yesNo.length, text: text.length, others: others.length });

  // ---------------------------------------------------------------- R: a run its server left running never blocks for good (review M3)
  const wsId = sql(`select workspace_id from combination where id='${wp}'`);
  sql(`insert into ai_batch (id, workspace_id, idempotency_key, operation, scope_kind, scope_label, mode, status, plan_sha256, plan, spend_limit_usd, worst_case_usd, started_by, started_at) values ('11111111-1111-4111-8111-111111111111', '${wsId}', 'qd-stale-test', 'draft_questions_documents', 'combination', 'stale', 'LOCAL', 'RUNNING', 'x', '{"combination":{"id":"${wp}"}}', 0, 0, 'user-A', now() - interval '1 minute')`);
  r = await run("rules");
  ok("C4.11 R fail (review M3): a run still moving (started a minute ago) blocks a new one (409) with its run id", r.status === 409 && r.body.runId === "11111111-1111-4111-8111-111111111111", { status: r.status, runId: r.body.runId });
  sql(`update ai_batch set started_at = now() - interval '1 hour' where id='11111111-1111-4111-8111-111111111111'`);
  r = await run("rules");
  ok("C4.11 R pass (review M3): a run that stopped moving (an hour, its server gone) ends as Failed and a new run starts", r.status === 201 && sql(`select status from ai_batch where id='11111111-1111-4111-8111-111111111111'`) === "FAILED", { status: r.status, old: sql(`select status || ' ' || coalesce(message,'') from ai_batch where id='11111111-1111-4111-8111-111111111111'`) });

  // ---------------------------------------------------------------- K: step 7 rules
  r = await run("rules");
  const base = (rule: string) => (r.body.findings as { rule: string }[]).filter((f) => f.rule === rule).length;
  ok("C4.11 K pass: on the sample the PQR ⊂ SQR and document-on-checklist rules pass", r.status === 201 && base("pqr_subset") === 0 && base("document_on_checklist") === 0 && step(r, "qd_check")?.status === "COMPLETED", r.body.findings?.slice(0, 3));
  // A person's choices that break the rules, written straight into the draft (the save refuses them, so the run's own
  // check is what is tested): a PQR tick on a fact the case officer gives, and a document not on the person's checklist.
  const fs = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  const facts = (fs.facts ?? []) as { role: string; fact: string; ruleSource: string; clientOnly: boolean; placed: boolean; forms: string[] }[];
  const agentFact = facts.find((f) => f.ruleSource === "AGENT" && f.forms.length), clientFact = facts.find((f) => f.ruleSource === "CLIENT" && !f.clientOnly && f.forms.length > 0);
  const ws = sql(`select workspace_id from combination where id='${wp}'`);
  const plant = (f: { role: string; fact: string }, cols: string, vals: string) => sql(`insert into fact_source (id, workspace_id, combination_id, lineage_key, role, canonical_field_key, version, status, origin, updated_by, updated_at, ${cols}) values (gen_random_uuid(), '${ws}', '${wp}', '${f.role}|${f.fact}', '${f.role}', '${f.fact}', 99, 'DRAFT', 'HUMAN', 'user-A', now(), ${vals})`);
  if (agentFact && clientFact) {
    plant(agentFact, "prequalification", "true");
    plant(clientFact, "source, document_type_key", "'DOCUMENT', 'no_such_document'");
    r = await run("rules");
    const pqr = (r.body.findings as { rule: string; message: string }[]).filter((f) => f.rule === "pqr_subset"), doc = (r.body.findings as { rule: string; message: string }[]).filter((f) => f.rule === "document_on_checklist");
    ok("C4.11 K fail: a PQR tick on a fact the case officer gives is found by step 7, named under PQR ⊂ SQR", pqr.length >= 1 && /pre-qualification/.test(pqr[0].message) && r.body.rules?.pqr_subset?.includes("PQR"), pqr[0]);
    ok("C4.11 K fail: a document fact whose document is not on the checklist is found by step 7, under its rule", doc.length >= 1 && /not on this person's checklist/.test(doc[0].message), doc[0]);
    ok("C4.11 K pass: findings are for a person to fix; the run still ends Done and changes nothing in the draft", r.body.status === "done" && sql(`select count(*) from fact_source where combination_id='${wp}' and version=99`) === "2", r.body.note);
  } else ok("C4.11 K setup: the sample has a case officer fact and a client fact", false, { agentFact, clientFact });
  // K, pure (review m2): "deciding fact asked first" on a small snapshot: a question decided by an answer nobody gives.
  const { qdChecks } = await import("../engine/draft-qd.ts");
  const snap = (cond: string) => ({ placements: [{ fact: "q.details", condition: { op: "eq", field: cond, value: true } }, { fact: "q.flag" }], document_types: [], derived_fields: [], canonical_fields: [{ id: "q.details", meaning: "Details" }, { id: "q.flag", meaning: "Has a flag" }], field_maps: [], fact_sources: [], rules: [], document_requirements: [], forms: [], checks: [], combination: { participants: [] } });
  const okSnap = qdChecks(snap("q.flag") as never), badSnap = qdChecks(snap("q.nobody") as never);
  ok("C4.11 K pass: a question decided by an answer that is asked has no asked-first finding", !okSnap.some((f) => f.rule === "asked_first"), okSnap);
  ok("C4.11 K fail: a question decided by an answer nobody gives is an asked-first finding", badSnap.some((f) => f.rule === "asked_first" && /Unreachable question/.test(f.message)), badSnap);
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  for (const f of written) rmSync(f, { force: true });
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_c411_draft_qd.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
