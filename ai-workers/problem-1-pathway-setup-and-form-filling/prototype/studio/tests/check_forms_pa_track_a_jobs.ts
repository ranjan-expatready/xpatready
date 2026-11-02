// PA (Track A; P-225, P-227, P-232; forms "ai-runs"): the committed launcher jobs of the paid runs the Mac paid runner
// records for Visitor visa (C4.7 PQR picks, C4.11 step 5 conditions; a draft and a blind checker round each). Proves,
// with NO model call (US$0), that each job is ready to run and that what it records is what the app replays:
//   J  each committed job equals the job the app's live round would write now (tools/track-a-jobs.ts → rounds.ts roundJob)
//   K  the run contract admits both kinds (a run of an unknown kind is refused), so a recorded run is contract-valid
//   S  each job's stub pass through the real guarded launcher (p2/launch.ts --stub) exits 0, one stub call, US$0, ledger untouched
//   R  a launcher-shaped saved live run of each job is the one the app's own Replay uses (C4.7 picks, C4.11 step 5);
//      the same run under another combination's key is never used
//   W  each job's worst case (the runner's reservation) fits its budget and the US$5 run cap; the four together ≤ US$2.70
// Files it writes (saved runs, stub runs) are removed after; the committed stub passes and canary digest are restored.
//   zsh studio/tools/isolated.sh forms_pa 4453 start && tsx studio/tests/check_forms_pa_track_a_jobs.ts 4453 xr_studio_forms_pa
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv } from "ajv";

const PORT = Number(process.argv[2] ?? 4453), DB = process.argv[3] ?? "xr_studio_forms_pa";
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`; // before the app's modules are loaded (core.ts reads it once)
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), ROOT = join(PROTOTYPE, "..", "..", "..");
const P2 = join(PROTOTYPE, "p2"), RUNS = join(P2, "runs"), JOBS = join(P2, "jobs");
const log: unknown[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL!, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const written: string[] = [];
const kept = new Map<string, Buffer | null>(); // committed files a stub pass rewrites, restored after
const keep = (f: string) => { if (!kept.has(f)) kept.set(f, existsSync(f) ? readFileSync(f) : null); };

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  const reset = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  if (reset.status >= 300) { console.error("STOP  Reset to the six did not finish", reset.body); process.exit(2); }
  const vv = sql(`select id from combination where combination_key='vv.single'`);
  const tool = await import("../tools/track-a-jobs.ts");

  // ---------------------------------------------------------------- J: the committed jobs are the app's own
  const derived = await tool.deriveJobs();
  ok("PA J pass: four jobs (C4.7 and C4.11 step 5, each a draft and a checker round), all for Visitor visa (vv.single, guide 5256)", derived.length === 4 && derived.every((d) => d.job.combination === "vv.single" && d.job.inputs.length === 1 && d.job.inputs[0].file === "prototype/p1/inventory/guide-5256.text.inventory.json" && d.job.known?.combination_trail === "Temporary residence › Visitors › Visitor visa"), derived.map((d) => d.job.job_id));
  for (const d of derived) {
    const f = join(JOBS, `${d.job.job_id}.json`);
    ok(`PA J pass: ${d.row} ${d.label}: the committed job file is byte for byte the job the app's live round writes now`, existsSync(f) && readFileSync(f, "utf8") === tool.jobText(d.job), d.job.job_id);
  }
  // J fail: a job made for another combination differs (its key and trail), so it could never stand in for Visitor visa.
  const { roundJob } = await import("../api/src/rounds.ts");
  const { PQR_AI } = await import("../api/src/pqr-drafts.ts");
  const other = roundJob(PQR_AI, false, { trail: "Family sponsorship › Spouse or common-law partner", contextKey: "fs.spouse", inputs: derived[0].job.inputs, batchId: tool.BATCH });
  ok("PA J fail: the same step for another combination is another job (id, key and trail differ)", other.job_id !== derived[0].job.job_id && other.combination === "fs.spouse" && tool.jobText(other as never) !== tool.jobText(derived[0].job), other.job_id);

  // ---------------------------------------------------------------- K: the run contract admits both kinds
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const s of ["field-map-entry", "drafting-run"]) ajv.addSchema(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", `${s}.v0.schema.json`), "utf8")));
  const contract = ajv.getSchema("https://expatready.local/contracts/drafting-run.v0.json")!;

  // ---------------------------------------------------------------- S: stub pass through the real launcher, US$0
  const { LEDGER_DIR } = await import("../../p2/policy.ts");
  const { SpendLedger } = await import("../../p2/ledger.ts");
  const before = new SpendLedger(LEDGER_DIR).committed();
  keep(join(P2, "screening", "canary-digest.json"));
  const stubRuns = new Map<string, any>();
  for (const d of derived) {
    keep(join(RUNS, "stub-pass", `${d.job.job_id}.json`));
    const r = spawnSync(process.execPath, [join(P2, "launch.ts"), "--job", d.job.job_id, "--stub"], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
    let out: any = null; try { out = JSON.parse(r.stdout.trim().split("\n").pop() ?? ""); } catch { out = { refused: r.stderr.slice(-300) }; }
    if (out?.run_file) written.push(out.run_file);
    const rec = out?.run_file && existsSync(out.run_file) ? JSON.parse(readFileSync(out.run_file, "utf8")) : null;
    stubRuns.set(d.job.job_id, rec);
    ok(`PA S pass: ${d.row} ${d.label}: the guarded launcher's stub pass exits 0, contract-valid, one stub call, US$0`, r.status === 0 && rec?.contract_valid === true && rec?.caller === "stub" && rec?.launch_evidence?.stub_calls === 1 && rec?.drafting_run?.usage?.cost_usd === 0 && JSON.parse(readFileSync(join(RUNS, "stub-pass", `${d.job.job_id}.json`), "utf8")).run_id === rec?.drafting_run?.run_id, { exit: r.status, refused: out?.refused, errors: rec?.contract_errors });
    ok(`PA K pass: ${d.row} ${d.label}: a recorded run of kind ${d.job.kind} is valid under the run contract`, !!rec && contract(rec.drafting_run) === true, contract.errors);
  }
  ok("PA S pass: the four stub passes add nothing to what the ledger counts against the caps (US$0 reservations only)", new SpendLedger(LEDGER_DIR).committed() === before, before);
  // S fail: the live gate (p2/pathcode.ts hasStubPass, checked by the launcher and again inside the drafting process)
  // refuses these stub passes once the screening sources differ: a live call then needs a new stub pass first.
  const { hasStubPass } = await import("../../p2/pathcode.ts");
  const passNow = JSON.parse(readFileSync(join(RUNS, "stub-pass", `${derived[0].job.job_id}.json`), "utf8"));
  const gateNow = hasStubPass(derived[0].job, passNow.screening_sources), gateStale = hasStubPass(derived[0].job, [{ file: "answer-key.changed.json", sha256: "0".repeat(64) }]);
  ok("PA S fail: the stub pass is current now, and the live gate refuses it once the screening sources change", gateNow.ok === true && gateStale.ok === false && gateStale.sources_current === false, { now: gateNow.ok, stale: gateStale.ok });
  const madeUp = { ...stubRuns.get(derived[0].job.job_id).drafting_run, kind: "made_up_step" };
  ok("PA K fail: a run of a kind the contract does not name is refused, so nothing unknown is ever replayed", contract(madeUp) === false && JSON.stringify(contract.errors).includes("/kind"), contract.errors?.[0]);

  // ---------------------------------------------------------------- R: the app's Replay uses exactly these recorded runs
  // A launcher-shaped saved live run: the stub run's record (the same job, prompt and inputs), as a live run would end. It
  // is stamped 31 Dec 2999, so it is the newest even after the Mac's real runs of these jobs are committed.
  const answer = (kind: string) => kind === "pqr_picks"
    ? { picks: [{ role: "principal", asks: "passport", quote: "valid travel document", why: "The officer checks it first." }], unresolved: [] }
    : { conditions: [{ role: "principal", asks: "travel history", depends_on: "travelled before", when: "yes", quote: "travel history", why: "Asked only after travel." }], unresolved: [] };
  const saveLive = (jobId: string, combination?: string) => {
    const rec = JSON.parse(JSON.stringify(stubRuns.get(jobId)));
    rec.caller = "live"; rec.raw_output = JSON.stringify(answer(rec.drafting_run.kind));
    if (combination) rec.drafting_run.inputs.combination = combination;
    const f = join(RUNS, `${jobId}-live-29991231t235959000z-pa${Math.random().toString(36).slice(2, 8)}.json`);
    writeFileSync(f, JSON.stringify(rec, null, 1) + "\n"); written.push(f);
    return `prototype/p2/runs/${f.split("/").pop()}`;
  };
  const pqrDraft = async () => { const p = await call("POST", `/combinations/${vv}/pqr-picks/plan`, { mode: "replay" }); return call("POST", `/combinations/${vv}/pqr-picks/draft`, { mode: "replay", planSha256: p.body?.plan_sha256 }); };
  // C4.11 step 5 on Visitor visa right after Reset to the six refuses before its steps ("no form fields mapped to facts
  // yet": the field maps wait on To review), so its replay is proved through the same call draft-qd.ts conditions() makes:
  // StepRunner.round(CONDITIONS_AI, draft | checker, { trail, combination key, [guide input], mode replay }).
  const { StepRunner } = await import("../api/src/rounds.ts");
  const { CONDITIONS_AI } = await import("../api/src/draft-qd.ts");
  const qd = derived[2].job;
  const condRounds = async () => {
    const ctx = { trail: String(qd.known?.combination_trail), contextKey: qd.combination, inputs: qd.inputs, mode: "replay" as const, wanted: async () => true, batchId: "pa-check" };
    const runner = new StepRunner(null as never);
    const d = await runner.round(CONDITIONS_AI, false, ctx), k = await runner.round(CONDITIONS_AI, true, ctx);
    return [d, k].map((x) => (x.ok ? x.runFile : null));
  };
  const [pd, pk, cd, ck] = derived.map((d) => d.job.job_id);

  // R fail first: the same recorded runs under another combination's key are never replayed for Visitor visa.
  const wrong = [saveLive(pd, "fs.spouse"), saveLive(pk, "fs.spouse"), saveLive(cd, "fs.spouse"), saveLive(ck, "fs.spouse")];
  let r = await pqrDraft();
  ok("PA R fail: C4.7 Replay never uses a recorded run of another combination, even the newest (US$0)", r.status === 201 && r.body.usd === 0 && !r.body.run_files.some((f: string) => wrong.includes(f)), { files: r.body?.run_files, note: r.body?.note });
  let q = await condRounds();
  ok("PA R fail: C4.11 step 5 Replay never uses a recorded run of another combination, even the newest", !q.some((x) => x !== null && wrong.includes(x)), q);
  for (const f of wrong) { rmSync(join(PROTOTYPE, "..", f), { force: true }); }

  const good = [saveLive(pd), saveLive(pk), saveLive(cd), saveLive(ck)];
  r = await pqrDraft();
  ok("PA R pass: C4.7 Replay on Visitor visa uses exactly the recorded runs of the committed draft and checker jobs, US$0", r.status === 201 && r.body.from === "replay" && r.body.usd === 0 && JSON.stringify(r.body.run_files) === JSON.stringify([good[0], good[1]]), { files: r.body?.run_files, note: r.body?.note });
  q = await condRounds();
  ok("PA R pass: C4.11 step 5 Replay (the rounds draft-qd.ts runs) uses exactly the recorded runs of the committed draft and checker jobs", JSON.stringify(q) === JSON.stringify([good[2], good[3]]), q);

  // ---------------------------------------------------------------- W: worst cases from the code's own estimators
  let total = 0;
  for (const d of derived) {
    const c = tool.costsOf(d.job); total += c.worst_usd;
    ok(`PA W pass: ${d.row} ${d.label}: worst US$${c.worst_usd.toFixed(2)} (the runner's reservation) fits its budget US$${c.budget_usd.toFixed(2)} and the US$5 run cap; usual ~US$${c.usual_usd.toFixed(2)}`, c.fits_budget && c.under_run_cap && c.worst_usd > 0 && c.usual_usd > 0 && c.usual_usd < c.worst_usd, c);
  }
  // W fail: the same job with a larger output limit is above its US$1 budget, and the tool says so (never sent as is).
  const big = { ...derived[0].job, settings: { ...derived[0].job.settings, max_output_tokens: 64000 } };
  const cb = tool.costsOf(big as never);
  ok(`PA W fail: a job whose worst case (US$${cb.worst_usd.toFixed(2)}) is above its budget is flagged`, cb.fits_budget === false && cb.worst_usd > cb.budget_usd, cb);
  ok(`PA W pass: the four runs together: worst US$${total.toFixed(2)}, within the US$2.70 the PR states`, total > 0 && total <= 2.70, total);
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  for (const f of written) rmSync(f.startsWith("/") ? f : join(PROTOTYPE, "..", f), { force: true });
  for (const [f, b] of kept) { if (b === null) rmSync(f, { force: true }); else writeFileSync(f, b); }
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_pa_track_a_jobs.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
