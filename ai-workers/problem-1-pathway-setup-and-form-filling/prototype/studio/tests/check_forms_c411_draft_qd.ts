// C4.11 part 1 (P-130, P-131, P-121, P-123; W1-questions-and-documents concept §4; forms lane, swarm builder B4b):
// "Draft questions and documents", one run of seven steps on the shared run card, its items into the one review queue.
// A passing and a failing case per rule, through the API on an isolated copy with the sample loaded (Work permit,
// family: Guide 5487). Saved AI answers are written for this check into p2/runs and removed after. NO model call: US$0.
//   P  plan first: seven steps, how each runs, US$0, plan checksum · L  only US$0 ways (AI now waits for P-131)
//   A  author duty · R  one run, seven steps, on /api/runs/:id with its label, Stop between steps, one run at a time
//   S6 step 6 is C4.7's producer: rules picks into the queue, no duplicates; saved answers replayed (never shown live)
//   N  steps 2 and 5 say "not available yet", never a pretend result
//   K  step 7 rules: PQR ⊂ SQR · a document fact's document on the checklist (each with its rule named)
//   LV live wiring 5a (P-227): Live only with the switch, worst case first, four rounds (steps 5, 6), a failed Live step
//      offers Saved only when it has one, a paid round's cost is said, Saved pairs both rounds of one run; Live runs on the
//      stand-in launcher only (tests/fixtures/fake-launch.mjs, P-192); at the end the copy restarts without the switch.
//   zsh studio/tools/isolated.sh forms_c411 4463 start STUDIO_SLOW_QD_STEP=150 STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_c411_draft_qd.ts 4463 xr_studio_forms_c411
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
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
  ok("C4.11 P fail: an unknown way is refused in words (400)", r.status === 400 && /Choose Live or Saved/.test(words(r)), words(r));
  r = await plan("rules", "00000000-0000-4000-8000-000000000000");
  ok("C4.11 P fail: an unknown combination is refused in words (404)", r.status === 404 && /does not exist/.test(words(r)), words(r));

  r = await call("POST", `/combinations/${wp}/draft-qd/plan`, { mode: "rules" }, "user-O");
  ok("C4.11 A fail (break m2): the case officer cannot read the plan (403)", r.status === 403, r.status);

  // ---------------------------------------------------------------- L: only US$0 ways
  // L fail (Live closed) runs at the end, after the copy restarts without the live switch.
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
  ok("C4.11 S6 fail (break m4): the reply says the run had a problem and names step 6, never only \"rules pass\"", r.body.status === "done_with_problems" && /Not done:.*Prospect questionnaire \(PQR\) picks/.test(r.body.note), r.body.note);
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
  // QA-162: plus one pick no question of this combination asks, which is left out and shown with its reason on the card.
  save(false, [pick("Date of birth", "The guide tests age-related eligibility."), pick("Favourite colour", "Not a question of this combination.")]); save(true, [pick("Date of birth", "The guide tests age-related eligibility.")]);
  r = await run("replay");
  const s6saved = step(r, "pqr_picks");
  ok("C4.11 S6 pass: saved AI answers are replayed into the queue at US$0, as AI items", r.status === 201 && r.body.proposed > 0 && r.body.usd === 0 && s6saved?.status === "COMPLETED" && waiting("ai") === r.body.proposed, { proposed: r.body.proposed, ai: waiting("ai"), s6saved });
  card = await call("GET", `/runs/${r.body.runId}`);
  const s6card = card.body.steps?.find((s: J) => s.kind === "pqr_picks");
  ok("C4.11 S6 fail (QA-162): a saved pick no question asks is left out, and the card's step 6 says so with its reason, never a bare count", /1 left out with the reason/.test(s6card?.message ?? "") && /Favourite colour: No question of this combination asks "Favourite colour"/.test(s6card?.details ?? ""), { message: s6card?.message, details: s6card?.details });
  ok("C4.11 S6 pass: the card shows step 6 as AI work but spent US$0, never as a live run", card.body.steps?.find((s: J) => s.kind === "pqr_picks")?.uses === "ai" && card.body.usd.spent === 0 && sql(`select mode from ai_batch where id='${r.body.runId}'`) === "REPLAY", card.body.steps?.find((s: J) => s.kind === "pqr_picks"));

  // ---------------------------------------------------------------- R + S6 rules: the whole run, rules only
  r = await run("rules");
  const rulesProposed = r.body.proposed;
  ok("C4.11 R pass (review M1): starting answers at once with the run id while the steps go on (the card and Stop show at once)", r.body.started?.status === "running" && r.body.started?.runId === r.body.runId, r.body.started);
  ok("C4.11 R pass: rules only runs all seven steps as one run; step 6 puts the rules' picks on the queue, US$0", r.status === 201 && r.body.status === "done" && r.body.steps.length === 7 && rulesProposed > 0 && waiting("rules") === rulesProposed && r.body.usd === 0
    && ["qd_facts", "qd_document_facts", "qd_sources", "pqr_picks", "qd_check"].every((k) => step(r, k)?.status === "COMPLETED"), r.body.steps?.map((s: J) => `${s.kind}:${s.status}`));
  ok("C4.11 N pass: with rules only, steps 2 and 5 say they are AI work and are not run", step(r, "qd_conditions")?.status === "SKIPPED" && /AI work/.test(step(r, "qd_conditions")?.message ?? "") && step(r, "qd_documents")?.status === "SKIPPED" && /Choose Live or Saved/.test(step(r, "qd_documents")?.message ?? ""), step(r, "qd_documents"));
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
  ok("C4.11 R pass (break L6): a stopped run says so in its note", /Stopped by a person/.test(ended.body.note ?? ""), ended.body.note);
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
  ok("C4.11 D pass: the lines are the checklist's own draft (decided one by one on To review, QA-157), each a requirement line with its quote", sql(`select count(distinct p.run_id) from proposal_item p join drafting_job j on j.id=p.run_id where p.combination_id='${wp}' and p.kind='requirement_line' and j.kind='checklist_draft' and j.mode='REPLAY'`) === "1" && sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='requirement_line' and (source->>'quote') is null`) === "0");
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
    ok("C4.11 C fail: a question this combination does not ask, and a sentence not in the guide, are left out with the reason (never guessed)", /is not a question this combination asks|No question of this combination asks|could be \d+ questions of this person/.test(details) && /not in Guide 5487/.test(details) && sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition'`) === "2", c5?.message);
    ok("C4.11 C pass: each condition names the question it hides, quotes the guide, and reads the deciding question", sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition' and origin='ai' and source->>'quote' is not null and payload->'condition'->'tree'->>'field' in ('${cd1.fact}','${cd2.fact}') and payload->'condition'->>'sentence' like '"%" is asked only when %'`) === "2");
    r = await run("replay");
    ok("C4.11 C fail: drafting again puts no condition on the queue twice", sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition'`) === "2" && /2 already waiting/.test(step(r, "qd_conditions")?.message ?? ""), step(r, "qd_conditions")?.message);
    const cid = sql(`select id from proposal_item where combination_id='${wp}' and kind='condition' and identity_key='principal|${ct2.fact}|${cd2.fact}'`);
    const rej = await call("POST", "/review/proposals/decide", { ids: [cid], action: "reject", reason: "The guide means something else here." });
    r = await run("replay");
    ok("C4.11 C fail (review m1): a condition a person removed is not proposed again", rej.status < 300 && sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition' and status='waiting'`) === "1" && /1 a person removed or accepted before/.test(step(r, "qd_conditions")?.message ?? ""), { rej: rej.status, message: step(r, "qd_conditions")?.message });
    // ---------------------------------------------------------------- L3: part 3, accepting a condition (tech lead's option (a), BR-6)
    const keep = sql(`select id from proposal_item where combination_id='${wp}' and kind='condition' and status='waiting' and identity_key='principal|${ct1.fact}|${cd1.fact}'`);
    const q0 = sql(`select coalesce(predicate_json::text,'none') || '|' || count(*) over () from section_question where lineage_key='${ct1.fact}' order by version desc limit 1`);
    let acc = await call("POST", "/review/proposals/decide", { ids: [keep], action: "accept" });
    const chg = sql(`select id || '|' || status from library_change where kind='placement_condition' and key='${ct1.fact}' order by proposed_at desc limit 1`).split("|");
    ok("C4.11 L3 pass (part-3 review M1): the change counts the combinations that ask the question (at least this one)", Number(sql(`select matches->>'uses' from library_change where id='${chg[0]}'`)) >= 1, sql(`select matches->>'uses' from library_change where id='${chg[0]}'`));
    const page = await call("GET", `/library/changes/${chg[0]}`, undefined, "user-B");
    ok("C4.11 L3 pass (part-3 review M2): the change reads in words on its review page, never its action code", page.status === 200 && /Change when it is asked/.test(JSON.stringify(page.body)) && !/sET_|"SET_CONDITION when/.test(JSON.stringify(page.body)), JSON.stringify(page.body).slice(0, 200));
    ok("C4.11 L3 pass: accepting a condition writes a waiting library change for a second person; the question is unchanged until then", (acc.status === 200 || acc.status === 201) && chg[1] === "WAITING" && sql(`select coalesce(predicate_json::text,'none') || '|' || count(*) over () from section_question where lineage_key='${ct1.fact}' order by version desc limit 1`) === q0, { status: acc.status, chg, words: words(acc) });
    const batch = String(acc.body.batchId ?? "");
    r = await call("POST", `/review/proposals/undo/${batch}`);
    ok("C4.11 L3 fail: Undo within the batch removes the waiting change and the condition waits on the queue again", (r.status === 200 || r.status === 201) && sql(`select count(*) from library_change where id='${chg[0]}'`) === "0" && sql(`select status from proposal_item where id='${keep}'`) === "waiting", { status: r.status, words: words(r) });
    acc = await call("POST", "/review/proposals/decide", { ids: [keep], action: "accept" });
    const chg2 = sql(`select id from library_change where kind='placement_condition' and key='${ct1.fact}' and status='WAITING' limit 1`);
    r = await call("POST", `/library/changes/${chg2}/approve`, {}, "user-A");
    ok("C4.11 L3 fail: the author cannot approve their own change of when a question is asked (second person)", r.status >= 400 && sql(`select status from library_change where id='${chg2}'`) === "WAITING", { status: r.status, words: words(r) });
    r = await call("POST", `/library/changes/${chg2}/approve`, {}, "user-B");
    const tree = sql(`select predicate_json->>'field' || '|' || coalesce(condition_effect::text,'') || '|' || status from section_question where lineage_key='${ct1.fact}' order by version desc limit 1`);
    ok("C4.11 L3 pass: the second person's approval gives the question a draft version with the condition (shown when the deciding answer is given)", r.status < 300 && tree === `${cd1.fact}|SHOW|DRAFT` && sql(`select status from library_change where id='${chg2}'`) === "APPROVED", { status: r.status, tree, words: words(r) });
    r = await run("replay");
    const again = step(r, "qd_conditions")?.message ?? "";
    ok("C4.11 L3 fail: once accepted, the same condition is not proposed again", sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='condition' and status='waiting' and identity_key='principal|${ct1.fact}|${cd1.fact}'`) === "0", again);
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
    ok("C4.11 K fail: a PQR tick on a fact the case officer gives is found by step 7, named under PQR ⊂ SQR", pqr.length >= 1 && /Prospect questionnaire \(PQR\)/.test(pqr[0].message) && r.body.rules?.pqr_subset?.includes("PQR"), pqr[0]);
    ok("C4.11 K fail: a document fact whose document is not on the checklist is found by step 7, under its rule", doc.length >= 1 && /not on this person's checklist/.test(doc[0].message), doc[0]);
    ok("C4.11 K pass: findings are for a person to fix; the run still ends Done and changes nothing in the draft", r.body.status === "done" && sql(`select count(*) from fact_source where combination_id='${wp}' and version=99`) === "2", r.body.note);
  } else ok("C4.11 K setup: the sample has a case officer fact and a client fact", false, { agentFact, clientFact });
  // K, pure (review m2): "deciding fact asked first" on a small snapshot: a question decided by an answer nobody gives.
  const { qdChecks } = await import("../engine/draft-qd.ts");
  const snap = (cond: string) => ({ placements: [{ fact: "q.details", condition: { op: "eq", field: cond, value: true } }, { fact: "q.flag" }], document_types: [], derived_fields: [], canonical_fields: [{ id: "q.details", meaning: "Details" }, { id: "q.flag", meaning: "Has a flag" }], field_maps: [], fact_sources: [], rules: [], document_requirements: [], forms: [], checks: [], combination: { participants: [] } });
  // C, pure (round 2 M2): the deciding answer must fit the deciding question; list values are { key, label }.
  const { answerOf } = await import("../engine/qd-conditions.ts");
  const list = { value_type: "code", answer_list: { values: [{ key: "common_law", label: "Common-law" }, { key: "married", label: "Married" }] } };
  const a1 = answerOf(list, "Common-law"), a2 = answerOf(list, "Divorced"), a3 = answerOf({ value_type: "yes_no" }, "Yes"), a4 = answerOf({ value_type: "yes_no" }, "maybe");
  ok("C4.11 C pass (round 2 M2): an answer given by its words is stored as the list's key; yes is true on a yes-no question", JSON.stringify(a1) === '{"value":"common_law"}' && JSON.stringify(a3) === '{"value":true}', [a1, a3]);
  ok("C4.11 C fail (round 2 M2): an answer not on the list, or not yes/no on a yes-no question, is refused with the reason", "why" in a2 && /not one of the deciding question's answers/.test(a2.why) && "why" in a4, [a2, a4]);
  const okSnap = qdChecks(snap("q.flag") as never), badSnap = qdChecks(snap("q.nobody") as never);
  ok("C4.11 K pass: a question decided by an answer that is asked has no asked-first finding", !okSnap.some((f) => f.rule === "asked_first"), okSnap);
  ok("C4.11 K fail: a question decided by an answer nobody gives is an asked-first finding", badSnap.some((f) => f.rule === "asked_first" && /Unreachable question/.test(f.message)), badSnap);

  // ---------------------------------------------------------------- LV: live wiring 5a (P-227), stand-in launcher only
  {
    const VAR = join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`); mkdirSync(VAR, { recursive: true });
    const rec = (out: unknown, usd = 0) => ({ caller: "live", contract_valid: true, raw_output: JSON.stringify(out), drafting_run: { status: "completed", usage: { cost_usd: usd }, attempts: [{ n: 1, outcome: "ok" }] } });
    const good = (out: unknown, usd = 0) => ({ stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: rec(out, usd) } });
    const failing = { stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the service did not answer" } };
    const scenario = (jobs: Record<string, unknown>) => { for (const f of ["fake-launch.log", "fake-launch.count"]) rmSync(join(VAR, f), { force: true }); writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs })); };
    const calls = () => { try { return readFileSync(join(VAR, "fake-launch.log"), "utf8").trim().split("\n").filter(Boolean).length; } catch { return 0; } };
    const condOut = { conditions: cd1 && ct1 ? [cond(ct1.label, cd1.label)] : [], unresolved: [] }, pickOut = { picks: [pick("Country of citizenship")], unresolved: [] };
    const allFail = { "studio-qd-conditions-check": failing, "studio-qd-conditions": failing, "studio-pqr-picks-check": failing, "studio-pqr-picks": failing };
    r = await plan("replay");
    ok("C4.11 LV pass: the Saved plan says which AI steps have a Saved result (steps 5 and 6 here)", r.body.saved?.available === true && r.body.saved.steps?.qd_conditions === true && r.body.saved.steps?.pqr_picks === true, r.body.saved);
    // Saved pairs both rounds of one run (C4.7 break B1): a newest checker round of another run is never paired.
    const lone = `studio-qd-conditions-check-c411-lone-live-20261102t230000000z-c${Date.now().toString(36)}.json`;
    writeFileSync(join(RUNS, lone), readFileSync(written.filter((f) => f.includes("studio-qd-conditions-check-")).pop()!)); written.push(join(RUNS, lone));
    r = await plan("replay");
    ok("C4.11 LV fail: a newest saved checker round with no first round of its own run makes step 5 not Saved", r.body.saved?.steps?.qd_conditions === false && r.body.saved?.steps?.pqr_picks === true, r.body.saved);
    rmSync(join(RUNS, lone), { force: true }); written.pop();
    // PF (#531 review m1, C4.7 break B1): a newer step-5 first round alone (a Live run whose checker round failed) never
    // pairs with an older checker round: Saved stays the complete older run, and a Saved run replays exactly that run.
    const loneD = `studio-qd-conditions-c411-lone-d-live-20261102t235900000z-d${Date.now().toString(36)}.json`;
    writeFileSync(join(RUNS, loneD), readFileSync(written.filter((f) => /studio-qd-conditions-c411-test-live-/.test(f)).pop()!)); written.push(join(RUNS, loneD));
    r = await plan("replay");
    ok("C4.11 PF pass: with a newer step-5 first round alone, step 5 is still Saved (the complete older run)", r.body.saved?.steps?.qd_conditions === true, r.body.saved);
    r = await run("replay");
    const pf = JSON.parse(sql(`select coalesce(detail->'run_files', '[]'::jsonb) from drafting_job where batch_id='${r.body.runId}' and kind='qd_conditions'`) || "[]") as string[];
    ok("C4.11 PF fail: the newer draft-only run is never paired with the older checker round (both replayed files are one run's)", step(r, "qd_conditions")?.status === "COMPLETED" && pf.length === 2 && pf.every((f) => f.includes("-c411-test-live-")) && !pf.some((f) => f.includes("lone-d")), { files: pf, step: step(r, "qd_conditions")?.status });
    rmSync(join(RUNS, loneD), { force: true }); written.pop();
    r = await plan("live");
    ok("C4.11 LV pass: Live states its worst case before it runs (four AI rounds), inside the cap; steps 5 and 6 Live, step 2 Saved", r.status === 200 && r.body.totals.worst_usd > 0 && r.body.totals.worst_usd <= r.body.totals.remaining_usd && r.body.live?.approved === true && r.body.steps?.[4]?.how === "live" && r.body.steps?.[5]?.how === "live" && r.body.steps?.[1]?.how === "saved", { totals: r.body.totals, how: r.body.steps?.map((x: J) => x.how) });
    scenario({ "studio-qd-conditions-check": good(condOut), "studio-qd-conditions": good(condOut), "studio-pqr-picks-check": good(pickOut), "studio-pqr-picks": good(pickOut) });
    r = await run("live");
    ok("C4.11 LV pass: a Live run is one LIVE run; steps 5 and 6 each run a first and a blind checker round (stub pass first: 8 launcher calls)", r.status === 201 && ["qd_conditions", "pqr_picks"].every((k) => step(r, k)?.status === "COMPLETED") && sql(`select mode from ai_batch where id='${r.body.runId}'`) === "LIVE" && calls() === 8 && /Live, US\$/.test(r.body.note), { steps: r.body.steps?.map((x: J) => `${x.kind}:${x.status}`), calls: calls(), note: r.body.note });
    scenario(allFail);
    r = await run("live");
    ok("C4.11 LV F pass: failed Live steps 5 and 6 offer Saved (each has a Saved result); nothing of them is proposed", step(r, "qd_conditions")?.status === "FAILED" && /use Saved \(US\$0\)/.test(step(r, "qd_conditions")?.message ?? "") && r.body.offer_saved === true && /use Saved \(US\$0\)/.test(r.body.note) && r.body.status === "done_with_problems", { c5: step(r, "qd_conditions")?.message, note: r.body.note });
    scenario({ ...allFail, "studio-qd-conditions": good(condOut, 0.42) });
    r = await run("live");
    ok("C4.11 LV B2 fail: a paid first round then a failed checker round says its cost (counted), never 'nothing was charged'", /US\$0\.42 \(counted\)/.test(step(r, "qd_conditions")?.message ?? "") && !/nothing was charged/i.test(step(r, "qd_conditions")?.message ?? "") && r.body.usd >= 0.42 && Number(sql(`select coalesce(sum(cost_usd),0) from drafting_job where batch_id='${r.body.runId}'`)) >= 0.42, step(r, "qd_conditions")?.message);
    const aside = written.map((f) => [f, `${f}.aside`]);
    for (const [f, t] of aside) renameSync(f, t);
    scenario(allFail);
    r = await run("live");
    ok("C4.11 LV F fail: failed Live steps with no Saved result offer nothing", r.status === 201 && r.body.offer_saved === false && !/use Saved/.test(r.body.note) && !/use Saved/.test(step(r, "qd_conditions")?.message ?? ""), r.body.note);
    for (const [f, t] of aside) renameSync(t, f);
    // Review M1 / break L1: Stop during a Live round ends that call; the checker round is never sent; the step is Cancelled.
    const slow = (out: unknown) => ({ stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: rec(out), sleep_ms: 4000 } });
    const liveLines = (prefix: string) => { try { return readFileSync(join(VAR, "fake-launch.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((x: J) => x.mode === "live" && String(x.job).startsWith(prefix)).length; } catch { return 0; } };
    const stopDuring = async (prefix: string) => {
      const p0 = (await plan("live")).body.plan_sha256;
      const s0 = await call("POST", `/combinations/${wp}/draft-qd`, { mode: "live", planSha256: p0 });
      for (let i = 0; i < 300 && liveLines(prefix) === 0; i++) await new Promise((res) => setTimeout(res, 50));
      const st = await call("POST", `/runs/${s0.body.runId}/stop`);
      return { st, x: await result(s0.body.runId) };
    };
    for (const [kind, draftJob, checkJob] of [["pqr_picks", "studio-pqr-picks-", "studio-pqr-picks-check-"], ["qd_conditions", "studio-qd-conditions-", "studio-qd-conditions-check-"]] as const) {
      scenario({ "studio-qd-conditions-check": good(condOut), "studio-qd-conditions": kind === "qd_conditions" ? slow(condOut) : good(condOut), "studio-pqr-picks-check": good(pickOut), "studio-pqr-picks": kind === "pqr_picks" ? slow(pickOut) : good(pickOut) });
      const before6 = sql(`select count(*) from proposal_item where combination_id='${wp}'`);
      const { st, x } = await stopDuring(draftJob.replace(/-$/, "-") + "");
      const checks = liveLines(checkJob), cancelled = step(x, kind)?.status;
      // Review round 2 n4: Stop ends the launcher process itself (the stand-in sleeps 4 s; it is gone well before).
      const alive = (() => { try { return execFileSync("pgrep", ["-f", `fake-launch.mjs --job ${draftJob}`], { encoding: "utf8" }).trim().split("\n").filter(Boolean).length; } catch { return 0; } })();
      // Review round 3: only a Stop signal to the running launcher gives "the call was ended" (rounds.ts); waiting alone would not.
      ok(`C4.11 M1 pass: Stop ends ${kind === "pqr_picks" ? "step 6" : "step 5"}'s running launcher call itself ("the call was ended"; no stand-in left running)`, alive === 0 && /the call was ended/.test(step(x, kind)?.message ?? ""), step(x, kind)?.message);
      ok(`C4.11 M1 fail: Stop during ${kind === "pqr_picks" ? "step 6" : "step 5"}'s first Live round ends it: the checker round is never sent, the step is Cancelled, nothing of it is proposed`, st.status < 300 && checks === 0 && cancelled === "CANCELLED" && x.body.status === "stopped" && (kind !== "pqr_picks" || sql(`select count(*) from proposal_item where combination_id='${wp}'`) === before6), { checks, cancelled, status: x.body.status, msg: step(x, kind)?.message });
    }
    // Break L2 / review m5: step 6 is held to C4.7's one draft at a time: with a picks draft running, it does not run.
    const other = sql(`insert into drafting_job (id, workspace_id, combination_id, kind, mode, status, started_by, message) select gen_random_uuid(), workspace_id, id, 'pqr_picks', 'LIVE', 'RUNNING', 'user-A', 'test: a picks draft running' from combination where id='${wp}' returning id`).split("\n")[0];
    scenario({ "studio-qd-conditions-check": good(condOut), "studio-qd-conditions": good(condOut), "studio-pqr-picks-check": good(pickOut), "studio-pqr-picks": good(pickOut) });
    r = await run("live");
    ok("C4.11 L2 fail: with a picks draft already running, step 6 of a Live run does not run (already being drafted), and no picks round is sent", step(r, "pqr_picks")?.status === "FAILED" && /already being drafted/.test(step(r, "pqr_picks")?.message ?? "") && liveLines("studio-pqr-picks") === 0, step(r, "pqr_picks")?.message);
    sql(`update drafting_job set status='COMPLETED', finished_at=now() where id='${other}'`);
    scenario({ "studio-qd-conditions-check": good(condOut), "studio-qd-conditions": good(condOut), "studio-pqr-picks-check": good(pickOut), "studio-pqr-picks": good(pickOut) });
    r = await run("live");
    ok("C4.11 L2 pass: once that draft has ended, step 6 runs", step(r, "pqr_picks")?.status === "COMPLETED" && liveLines("studio-pqr-picks") === 2, step(r, "pqr_picks")?.message);
    // Break L3: a checker round that throws after a paid first round: the cost stays counted and said.
    scenario({ ...allFail, "studio-qd-conditions": good(condOut, 0.42), "studio-qd-conditions-check": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, out: { run_file: "/nonexistent/c411-unreadable.json" } } } });
    r = await run("live");
    ok("C4.11 L3 fail: a checker round that breaks after a paid first round keeps the cost counted and said (step, job, run)", /US\$0\.42 \(counted\)/.test(step(r, "qd_conditions")?.message ?? "") && Number(sql(`select coalesce(cost_usd,0) from drafting_job where batch_id='${r.body.runId}' and kind='qd_conditions'`)) === 0.42 && r.body.usd >= 0.42, step(r, "qd_conditions")?.message);
    // Review m1: the stated worst case is what the launcher's jobs can reserve (each round's own budget), never less.
    {
      const { roundBudgetUsd, sizedBudgetUsd, worstRoundUsd } = await import("../api/src/rounds.ts");
      const { PQR_AI } = await import("../api/src/pqr-drafts.ts"), { CONDITIONS_AI } = await import("../api/src/draft-qd.ts");
      const gp = (await call("POST", `/combinations/${wp}/pqr-picks/plan`, { mode: "replay" })).body.guide, g = gp.file as string, ql = gp.questions as string | null;
      // QA-162: a Live round reads the guide and the combination's question list, so both count in its worst case.
      ok("C4.11 m1 pass (QA-162): the plan names the question list a Live round reads beside the guide", typeof ql === "string" && /^prototype\/p2\/question-lists\/wp\.family-[0-9a-f]{12}\.questions\.json$/.test(ql), ql);
      const len = String(JSON.parse(readFileSync(join(SOLUTION, g), "utf8")).text ?? "").length + (ql ? readFileSync(join(SOLUTION, ql), "utf8").length : 0), ins = [{ file: g }, ...(ql ? [{ file: ql }] : [])];
      const sum = [CONDITIONS_AI, PQR_AI].reduce((n, st) => n + roundBudgetUsd(st, false, ins, len) + roundBudgetUsd(st, true, ins, len), 0);
      const p5 = (await plan("live")).body.totals.worst_usd;
      ok("C4.11 m1 pass: Live's stated worst case is the sum of its four rounds' launcher budgets", Math.abs(p5 - Math.round(sum * 100) / 100) < 0.011, { p5, sum });
      ok("C4.11 m1 fail: a round's stated budget is never below the launcher's own or the character bound", roundBudgetUsd(PQR_AI, false, ins, len) >= worstRoundUsd(PQR_AI, len) && roundBudgetUsd(PQR_AI, false, ins, len) >= sizedBudgetUsd(PQR_AI, 0));
    }
    // L fail: the same copy restarted without the live switch: Live is refused before anything runs.
    let said = "";
    try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), DB.replace(/^xr_studio_/, ""), String(PORT), "restart", "STUDIO_SLOW_QD_STEP=150", "STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs"], { cwd: join(SOLUTION, "..", ".."), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e: any) { said = String(e?.stderr ?? e).slice(-400); }
    let up = false; for (let i = 0; i < 240 && !up; i++) { up = await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).then((x) => x.status === 200, () => false); if (!up) await new Promise((res) => setTimeout(res, 500)); }
    if (!up) throw new Error(`the copy did not come back after the restart: ${said}`);
    const before = calls();
    r = await plan("live");
    const rp = await plan("replay");
    ok("C4.11 L fail: without the live switch, Live is refused in words before anything runs (409); the Saved plan says Live is closed", r.status === 409 && /not open yet/.test(words(r)) && rp.body?.live?.approved === false, words(r));
    r = await call("POST", `/combinations/${wp}/draft-qd`, { mode: "live", planSha256: "0".repeat(64) });
    ok("C4.11 L fail: a Live run is refused (409) and the launcher is never asked", r.status === 409 && calls() === before, r.status);
  }
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  for (const f of written) rmSync(f, { force: true });
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_c411_draft_qd.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
