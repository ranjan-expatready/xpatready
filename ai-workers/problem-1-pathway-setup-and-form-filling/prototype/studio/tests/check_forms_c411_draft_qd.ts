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
  const run = async (mode: string, actor = "user-A") => { const p = await plan(mode); return call("POST", `/combinations/${wp}/draft-qd`, { mode, planSha256: p.body?.plan_sha256 }, actor); };
  const waiting = (origin: string) => Number(sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='pqr_pick' and status='waiting' and origin='${origin}'`));
  const step = (r: { body: J }, kind: string) => (r.body.steps as { kind: string; status: string; message: string }[] | undefined)?.find((s) => s.kind === kind);

  // ---------------------------------------------------------------- P: the plan first
  let r = await plan("rules");
  const kinds = (r.body.steps ?? []).map((s: J) => s.kind).join(",");
  ok("C4.11 P pass: the plan lists the seven steps in order, how each runs, US$0, before anything runs", r.status === 200 && kinds === "qd_facts,qd_documents,qd_document_facts,qd_sources,qd_conditions,pqr_picks,qd_check" && r.body.totals.worst_usd === 0 && r.body.facts.total > 0 && /^[0-9a-f]{64}$/.test(r.body.plan_sha256), { kinds, facts: r.body.facts?.total });
  ok("C4.11 N pass: the plan says steps 2 and 5 are not available yet, never a pretend result", r.body.steps?.filter((s: J) => s.how === "not_yet").map((s: J) => s.n).join(",") === "2,5", r.body.steps?.map((s: J) => s.how));
  r = await call("POST", `/combinations/${wp}/draft-qd`, { mode: "rules", planSha256: "0".repeat(64) });
  ok("C4.11 P fail: a run whose plan was not looked at (another checksum) is refused in words (409), nothing started", r.status === 409 && /plan again/.test(words(r)) && sql(`select count(*) from ai_batch where operation='draft_questions_documents'`) === "0", words(r));
  r = await plan("fast");
  ok("C4.11 P fail: an unknown way is refused in words (400)", r.status === 400 && /rules only or saved AI answers/.test(words(r)), words(r));
  r = await plan("rules", "00000000-0000-4000-8000-000000000000");
  ok("C4.11 P fail: an unknown combination is refused in words (404)", r.status === 404 && /does not exist/.test(words(r)), words(r));

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
  const s6none = step(r, "pqr_picks");
  ok("C4.11 S6 fail: with no saved AI answer, step 6 says so and proposes nothing, US$0; step 7 still runs", r.status === 201 && r.body.proposed === 0 && r.body.usd === 0 && s6none?.status === "FAILED" && /No saved AI answer/.test(s6none.message) && step(r, "qd_check")?.status === "COMPLETED", s6none);
  let card = await call("GET", `/runs/${r.body.runId}`);
  ok("C4.11 R pass: the run shows on the shared run card with its label, seven steps and Done with problems (step 6)", card.status === 200 && card.body.label === "Drafting questions and documents" && card.body.steps.length === 7 && card.body.status === "done_with_problems" && card.body.usd.spent === 0, { label: card.body.label, status: card.body.status, steps: card.body.steps?.length });

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
  ok("C4.11 R pass: rules only runs all seven steps as one run; step 6 puts the rules' picks on the queue, US$0", r.status === 201 && r.body.status === "done" && r.body.steps.length === 7 && rulesProposed > 0 && waiting("rules") === rulesProposed && r.body.usd === 0
    && ["qd_facts", "qd_document_facts", "qd_sources", "pqr_picks", "qd_check"].every((k) => step(r, k)?.status === "COMPLETED"), r.body.steps?.map((s: J) => `${s.kind}:${s.status}`));
  ok("C4.11 N pass: steps 2 and 5 end as not available yet, with what to do meanwhile", step(r, "qd_documents")?.status === "NOT_YET" && /next part/.test(step(r, "qd_conditions")?.message ?? "") && /Meanwhile/.test(step(r, "qd_documents")?.message ?? ""), step(r, "qd_documents"));
  ok("C4.11 R pass: one run is one batch with exactly its seven steps", sql(`select count(*) from drafting_job where batch_id='${r.body.runId}'`) === "7", sql(`select string_agg(kind, ',') from drafting_job where batch_id='${r.body.runId}'`));
  ok("C4.11 pass: step 1 says the facts per person, step 4 where each answer comes from, in words", /facts the forms need: .+ \d+/.test(step(r, "qd_facts")?.message ?? "") && /Document \d+ · Client \d+ · Case officer \d+/.test(step(r, "qd_sources")?.message ?? ""), [step(r, "qd_facts")?.message, step(r, "qd_sources")?.message]);
  const r2 = await run("rules");
  ok("C4.11 S6 fail: running it again puts no pick on the queue twice", r2.status === 201 && r2.body.proposed === 0 && waiting("rules") === rulesProposed, { again: r2.body.proposed, waiting: waiting("rules") });

  // ---------------------------------------------------------------- R: one run at a time; Stop between steps
  const p1 = (await plan("rules")).body.plan_sha256;
  const two = await Promise.all([1, 2].map(() => call("POST", `/combinations/${wp}/draft-qd`, { mode: "rules", planSha256: p1 })));
  const started = two.filter((x) => x.status === 201).map((x) => x.body.runId as string);
  const overlap = started.length === 2 && sql(`select count(*) from ai_batch a join ai_batch b on a.id='${started[0]}' and b.id='${started[1]}' where a.started_at < b.finished_at and b.started_at < a.finished_at`) === "1";
  ok("C4.11 R fail: two runs started at the same moment never run together: the second is refused in words (409)", started.length >= 1 && !overlap && two.every((x) => x.status === 201 || (x.status === 409 && /being drafted already/.test(words(x)))), two.map((x) => `${x.status} ${words(x).slice(0, 60)}`));
  const p2 = (await plan("rules")).body.plan_sha256;
  const going = call("POST", `/combinations/${wp}/draft-qd`, { mode: "rules", planSha256: p2 });
  let stopped: { status: number; body: J } | null = null;
  for (let i = 0; i < 100 && !stopped; i++) {
    const id = sql(`select id from ai_batch where operation='draft_questions_documents' and status='RUNNING' limit 1`);
    if (id) stopped = await call("POST", `/runs/${id}/stop`);
    else await new Promise((res) => setTimeout(res, 20));
  }
  const ended = await going;
  ok("C4.11 R pass: Stop ends the run between steps; later steps are not run", !!stopped && stopped.status < 300 && ended.body.status === "stopped" && ended.body.steps.at(-1)?.status === "CANCELLED" && ended.body.steps[0]?.status !== "WAITING" && sql(`select status from ai_batch where id='${ended.body.runId}'`) === "CANCELLED", { stop: stopped?.status, status: ended.body.status, steps: ended.body.steps?.map((s: J) => s.status) });
  r = await call("POST", `/runs/${ended.body.runId}/stop`);
  ok("C4.11 R fail: a run that has ended cannot be stopped again (409)", r.status === 409 && /already ended/.test(words(r)), words(r));

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
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  for (const f of written) rmSync(f, { force: true });
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_c411_draft_qd.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
