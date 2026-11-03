// C4.7 v2 (QA-162; Lead 3, 3 Nov): the committed launcher jobs of the v2 PQR-picks pair the Mac paid runner records for
// Visitor visa (pqr-picks.v2.md and its checker, over guide 5256 and the combination's question list). Proves, with NO
// model call (US$0), that each job is ready to run and that what it records is what the app replays:
//   J  each committed job equals the job the app's live round writes now (tools/track-a-jobs.ts deriveC47V2Jobs → roundJob),
//      reads the guide and the question list, and never collides with the v1 jobs (#530's saved runs keep their own ids)
//   S  each job's stub pass through the real guarded launcher (p2/launch.ts --stub) exits 0, contract-valid, US$0
//   R  a launcher-shaped saved live pair of these jobs is the one the app's Saved replay uses, ahead of #530's v1 pair;
//      the same pair under another combination's key is never used
//   W  each worst case (the runner's reservation) fits its budget and the US$5 run cap; the pair ≤ US$1.65 (the runner),
//      and the app's Live plan figure (PqrDrafts.worstUsd) is US$2.00
// A fresh copy is first configured as Visitor visa with its questions by tests/runtime/setup_visitor_visa.ts (US$0), which
// this check runs itself when Visitor visa asks none yet. Files it writes (saved runs, stub runs) are removed after; the
// committed stub passes and canary digest are restored.
//   zsh studio/tools/isolated.sh c47v2 4481 start && tsx studio/tests/check_forms_c47_v2_jobs.ts 4481 xr_studio_c47v2
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv } from "ajv";

const PORT = Number(process.argv[2] ?? 4481), DB = process.argv[3] ?? "xr_studio_c47v2";
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
// As check_forms_pa_track_a_jobs.ts (break M2): simulated live runs are stamped 1 Jan 2000 (older than any real run) and
// carry a gitignored tag; a leftover of a killed check is removed when the check starts.
const FAKE = "-live-20000101t000000000z-pacheck", MINE = `${FAKE}${process.pid}x`;
const kept = new Map<string, Buffer | null>(); // committed files a stub pass rewrites, restored after
const keep = (f: string) => { if (!kept.has(f)) kept.set(f, existsSync(f) ? readFileSync(f) : null); };
const cleanUp = () => { for (const f of written) rmSync(f.startsWith("/") ? f : join(PROTOTYPE, "..", f), { force: true }); for (const [f, b] of kept) { if (b === null) rmSync(f, { force: true }); else writeFileSync(f, b); } };
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]] as const) process.on(sig, () => { cleanUp(); process.exit(code); });

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  const tool = await import("../tools/track-a-jobs.ts");
  // Visitor visa with its questions (the v2 rounds read its question list): set up here when the copy asks none yet (the
  // tool refuses then, "asks no question yet"), or when Visitor visa is not loaded at all.
  // A tsx child of this tsx process gets only the plain environment (the loader's own settings would carry the api
  // tsconfig into the setup script and stop it before its first step).
  const plainEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => ["PATH", "HOME", "TMPDIR", "LANG", "USER", "SHELL"].includes(k))) as NodeJS.ProcessEnv;
  let derived: Awaited<ReturnType<typeof tool.deriveC47V2Jobs>> | null = null, why = "";
  try { derived = await tool.deriveC47V2Jobs(); } catch (e) { why = (e as Error).message; }
  if (!derived && /asks no question yet|no vv\.single combination/.test(why)) {
    const s = spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), [join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { cwd: ROOT, encoding: "utf8", timeout: 600_000, env: plainEnv() });
    if (s.status !== 0) { console.error(`STOP  setup_visitor_visa.ts did not finish (exit ${s.status}): ${(s.stdout + s.stderr).split("\n").filter((l) => /^(FAIL|STOP)|Error/.test(l)).slice(0, 3).join(" | ") || (s.stdout + s.stderr).trim().slice(-300)}`); process.exit(2); }
    try { derived = await tool.deriveC47V2Jobs(); } catch (e) { why = (e as Error).message; }
  }
  if (!derived) { console.error(`STOP  ${why}`); process.exit(2); }
  const vv = sql(`select id from combination where combination_key='vv.single' and retired_at is null`);
  const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  for (const f of readdirSync(RUNS).filter((x) => x.includes(FAKE))) { const pid = Number(/pacheck(\d+)x/.exec(f)?.[1] ?? 0); if (!pid || !alive(pid)) rmSync(join(RUNS, f), { force: true }); }
  const scratchLedger = join(STUDIO, "var", `c47v2-check-ledger-${process.pid}`); mkdirSync(scratchLedger, { recursive: true });
  const [draft, check] = derived.jobs.map((d) => d.job);

  // ---------------------------------------------------------------- J: the committed jobs are the app's own
  ok("C4.7v2 J pass: two jobs (a draft and a checker round), v2 prompts, for Visitor visa, reading guide 5256 then its question list",
    derived.jobs.length === 2 && draft.template === "pqr-picks.v2.md" && check.template === "pqr-picks-check.v2.md" && [draft, check].every((j) => j.combination === "vv.single" && j.inputs.length === 2 && j.inputs[0].file.endsWith("guide-5256.text.inventory.json") && /^prototype\/p2\/question-lists\/vv\.single-[0-9a-f]{12}\.questions\.json$/.test(j.inputs[1].file)),
    [draft.job_id, check.job_id, draft.inputs.map((i) => i.file)]);
  for (const d of derived.jobs) {
    const f = join(JOBS, `${d.job.job_id}.json`);
    ok(`C4.7v2 J pass: ${d.label}: the committed job file is byte for byte the job the app's live round writes now`, existsSync(f) && readFileSync(f, "utf8") === tool.jobText(d.job), d.job.job_id);
  }
  // J fail: the v1 pair (#530) keeps its own job ids, so writing v2 never overwrites it, and the two v2 rounds pair (one stem).
  const v1 = (await tool.deriveJobs()).filter((d) => d.label.startsWith("PQR picks")).map((d) => d.job);
  const { pairOf } = await import("../api/src/rounds.ts");
  const { PQR_AI } = await import("../api/src/pqr-drafts.ts");
  ok("C4.7v2 J fail: the v1 jobs are other jobs (ids and prompts differ), and both v1 job files are still committed as they were",
    v1.length === 2 && v1.every((j, i) => j.job_id !== [draft, check][i].job_id && j.template !== [draft, check][i].template && readFileSync(join(JOBS, `${j.job_id}.json`), "utf8") === tool.jobText(j)), v1.map((j) => j.job_id));
  ok("C4.7v2 J pass: the draft and checker share one stem, so Replay pairs them (rounds.ts pairOf)",
    pairOf(PQR_AI, false, `${draft.job_id}-live-20261103t000000000z-aaaaaa.json`) === pairOf(PQR_AI, true, `${check.job_id}-live-20261103t000000000z-aaaaaa.json`));

  // ---------------------------------------------------------------- S: stub pass through the real launcher, US$0
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const s of ["field-map-entry", "drafting-run"]) ajv.addSchema(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", `${s}.v0.schema.json`), "utf8")));
  const contract = ajv.getSchema("https://expatready.local/contracts/drafting-run.v0.json")!;
  const { LEDGER_DIR } = await import("../../p2/policy.ts");
  const { SpendLedger } = await import("../../p2/ledger.ts");
  const before = new SpendLedger(LEDGER_DIR).committed();
  keep(join(P2, "screening", "canary-digest.json"));
  const stubRuns = new Map<string, any>();
  for (const d of derived.jobs) {
    keep(join(RUNS, "stub-pass", `${d.job.job_id}.json`));
    const r = spawnSync(process.execPath, [join(P2, "launch.ts"), "--job", d.job.job_id, "--stub"], { cwd: ROOT, encoding: "utf8", timeout: 120_000, env: { ...process.env, P2_LEDGER_DIR: scratchLedger } });
    let out: any = null; try { out = JSON.parse(r.stdout.trim().split("\n").pop() ?? ""); } catch { out = { refused: r.stderr.slice(-300) }; }
    if (out?.run_file) written.push(out.run_file);
    const rec = out?.run_file && existsSync(out.run_file) ? JSON.parse(readFileSync(out.run_file, "utf8")) : null;
    stubRuns.set(d.job.job_id, rec);
    ok(`C4.7v2 S pass: ${d.label}: the guarded launcher admits the guide and the question list; stub pass exits 0, contract-valid, US$0`,
      r.status === 0 && rec?.contract_valid === true && rec?.caller === "stub" && contract(rec.drafting_run) === true && JSON.stringify(rec.drafting_run.inputs.official_files) === JSON.stringify(d.job.inputs) && rec?.drafting_run?.usage?.cost_usd === 0, out?.refused ?? out?.status);
  }
  ok("C4.7v2 S pass: the stub passes add nothing to the shared ledger, and only US$0 to their scratch ledger", new SpendLedger(LEDGER_DIR).committed() === before && new SpendLedger(scratchLedger).committed() === 0, before);
  rmSync(scratchLedger, { recursive: true, force: true });

  // ---------------------------------------------------------------- R: the app's Saved replay uses exactly this pair
  const answer = { picks: [{ role: "principal", asks: "case.funds_available_cad", quote: "proof of funds", why: "The officer checks the funds for the stay." }], unresolved: [] };
  const saveLive = (jobId: string, combination?: string) => {
    const rec = JSON.parse(JSON.stringify(stubRuns.get(jobId)));
    rec.caller = "live"; rec.raw_output = JSON.stringify(answer);
    rec.drafting_run.output_sha256 = rec.launch_evidence.output_sha256 = createHash("sha256").update(rec.raw_output).digest("hex");
    if (combination) rec.drafting_run.inputs.combination = combination;
    const f = join(RUNS, `${jobId}${MINE}${Math.random().toString(36).slice(2, 8)}.json`);
    writeFileSync(f, JSON.stringify(rec, null, 1) + "\n"); written.push(f);
    return `prototype/p2/runs/${f.split("/").pop()}`;
  };
  const savedPlan = async () => (await call("POST", `/combinations/${vv}/pqr-picks/plan`, { mode: "replay" })).body;
  const wrong = [saveLive(draft.job_id, "fs.spouse"), saveLive(check.job_id, "fs.spouse")];
  let p = await savedPlan();
  ok("C4.7v2 R fail: Saved never uses a v2 pair recorded under another combination's key (US$0)", !(p?.saved?.files ?? []).some((f: string) => wrong.includes(f)), p?.saved);
  for (const f of wrong) rmSync(join(PROTOTYPE, "..", f), { force: true });
  const good = [saveLive(draft.job_id), saveLive(check.job_id)];
  p = await savedPlan();
  ok("C4.7v2 R pass: Saved on Visitor visa uses exactly the recorded v2 draft and checker, ahead of #530's v1 pair (US$0)",
    p?.saved?.available === true && JSON.stringify(p.saved.files) === JSON.stringify(good), { saved: p?.saved, good });

  // ---------------------------------------------------------------- W: worst cases from the code's own estimators
  let total = 0;
  for (const d of derived.jobs) {
    const c = tool.costsOf(d.job); total += c.worst_usd;
    ok(`C4.7v2 W pass: ${d.label}: worst US$${c.worst_usd.toFixed(2)} (the runner's reservation) fits its budget US$${c.budget_usd.toFixed(2)} and the US$5 run cap; usual ~US$${c.usual_usd.toFixed(2)}`, c.fits_budget && c.under_run_cap && c.worst_usd > 0, c);
  }
  ok(`C4.7v2 W pass: the pair's worst US$${total.toFixed(2)} is within the US$1.65 the PR states`, total > 0 && total <= 1.65, total);
  ok(`C4.7v2 W pass: the app's Live plan states worst US$${derived.planWorstUsd.toFixed(2)} (PqrDrafts.worstUsd), the figure the run is gated on`, Math.abs(derived.planWorstUsd - 2) < 0.005, derived.planWorstUsd);
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  cleanUp();
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_c47_v2_jobs.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
