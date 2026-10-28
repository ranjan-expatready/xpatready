// W1-10 slice 0 (challenge A2, P-121): the one step runner every AI step shares, taken out of the S4 form finder with no
// behaviour change. The pure parts (engine/rounds.ts: which saved real run may be replayed, a round's job id) and the
// runner (api/src/rounds.ts: replay at US$0, or a guarded live round through a launcher; plain reasons; the job file
// removed; Stop finds the round running now). A passing and a failing case per rule. No server, no database, no network:
// replay reads the saved real finder runs in p2/runs, live runs on a fake launcher. NO model call (US$0).
//   C11.8 replay at US$0 only for the same files, prompt and combination · C11.14 a round's answer is used only in its shape
//   cd prototype/studio && npx tsx tests/check_forms_rounds.ts
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editionContextKey, editionOfContextKey, isSameSavedRun, jobIdFor, LIVE_RUN, newestFirst, replayPattern, savedRunKey, type SavedRun } from "../engine/rounds.ts";
import { RUNS, StepRunner, worstRoundUsd, type AiStep } from "../api/src/rounds.ts";
import { EXPERIMENT_CAP_USD, RUN_CAP_USD, WAVE1_CAP_USD } from "../../p2/policy.ts";
import { BudgetExceeded, SpendLedger } from "../../p2/ledger.ts";
import { knownOk } from "../../p2/launch.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const STUDIO = join(import.meta.dirname, "..");
const JOBS = join(STUDIO, "..", "p2", "jobs");

(async () => {
  // --- pure: which saved run may stand in for a round
  ok("C11.8 pass: a saved real run's file name is a live run", LIVE_RUN.test("studio-finder-forms-individual-visitors-visitor-visa-live-20261027t072426546z-4d8a0d.json"));
  ok("C11.8 fail (break R5-1): a stub pass is never a live run, even for a place named \"Live-in caregiver\"", !LIVE_RUN.test("studio-finder-forms-live-in-caregiver-stub-20261027t072550341z-a4ea69.json") && !LIVE_RUN.test("studio-finder-forms-live-in-caregiver-live.json"));
  ok("C11.8: saved runs sort newest first by the time in their name, whatever the job id before it", JSON.stringify(["a-zz-live-20261027t000000000z-x.json", "b-live-20261028t000000000z-y.json"].sort(newestFirst)) === JSON.stringify(["b-live-20261028t000000000z-y.json", "a-zz-live-20261027t000000000z-x.json"]));
  const legacy = { "old-live-20261027t000000000z-a.json": "individual.visitors.visitor_visa" };
  ok("C11.8 pass: a saved run belongs to its job's combination key", savedRunKey({ file: "x", drafting_run: { inputs: { combination: "individual.visitors.visitor_visa" } } }, {}) === "individual.visitors.visitor_visa");
  ok("C11.8 fail (round 3 R3-2): a trail of names is not a key; a run with neither key nor a reviewed legacy entry belongs to no combination", savedRunKey({ file: "x", drafting_run: { inputs: { combination: "Individual › Visitors › Visitor visa" } } }, {}) === null && savedRunKey({ file: "old-live-20261027t000000000z-a.json", drafting_run: { inputs: { combination: "Individual › Visitors" } } }, legacy) === "individual.visitors.visitor_visa");
  const inputs = [{ file: "prototype/p1/inventory/a.text.inventory.json", sha256: "a".repeat(64) }, { file: "prototype/p1/inventory/b.text.inventory.json", sha256: "b".repeat(64) }];
  const good: SavedRun = { file: "f", caller: "live", contract_valid: true, raw_output: "{}", launch_evidence: { template_sha256: "t1" }, drafting_run: { status: "completed", inputs: { official_files: inputs, combination: "k1" } } };
  const want = { templateSha256: "t1", inputs, contextKey: "k1", legacy: {} };
  ok("C11.8 pass: the same prompt, the same files in order and the same combination may be replayed", isSameSavedRun(good, want));
  const variants: [string, SavedRun][] = [
    ["another prompt", { ...good, launch_evidence: { template_sha256: "t2" } }],
    ["the files in another order", { ...good, drafting_run: { ...good.drafting_run, inputs: { official_files: [...inputs].reverse(), combination: "k1" } } }],
    ["another combination", { ...good, drafting_run: { ...good.drafting_run, inputs: { official_files: inputs, combination: "k2" } } }],
    ["a stub pass", { ...good, caller: "stub" }],
    ["an answer that broke its contract", { ...good, contract_valid: false }],
    ["an unfinished run", { ...good, drafting_run: { ...good.drafting_run, status: "failed" } }],
    ["no answer text", { ...good, raw_output: undefined }],
  ];
  const wrong = variants.filter(([, r]) => isSameSavedRun(r, want)).map(([w]) => w);
  ok("C11.8 fail: a saved run is never replayed for another prompt, other files or order, another combination, a stub pass, a broken contract, an unfinished run or no answer", wrong.length === 0, wrong);
  const j1 = jobIdFor("studio-finder-forms", false, "Individual › Visitors › Visitor visa", "batch-1"), j2 = jobIdFor("studio-finder-forms", false, "Individual › Visitors › Visitor visa", "batch-2");
  ok("break M5 pass: a round's job id names the step, the place and a fingerprint, and is stable for one run", /^studio-finder-forms-individual-visitors-visitor-visa-[0-9a-f]{8}$/.test(j1) && j1 === jobIdFor("studio-finder-forms", false, "Individual › Visitors › Visitor visa", "batch-1"), j1);
  ok("break M5 / round 2 N3 fail: two runs, or a checker round, never share a job id (Stop ends only its own call)", j1 !== j2 && jobIdFor("studio-finder-forms", true, "Individual › Visitors › Visitor visa", "batch-1").startsWith("studio-finder-forms-check-"));
  const draftFile = "studio-finder-forms-individual-visitors-visitor-visa-live-20261027t072426546z-4d8a0d.json", checkFile = "studio-finder-forms-check-individual-visitors-visitor-visa-live-20261027t072500006z-a569fb.json";
  ok("C11.8 pass: the draft round's saved files are the draft's, the checker's the checker's", replayPattern("studio-finder-forms", false).test(draftFile) && replayPattern("studio-finder-forms", true).test(checkFile));
  ok("C11.8 fail: the draft never replays the checker's answer, nor the checker the draft's", !replayPattern("studio-finder-forms", false).test(checkFile) && !replayPattern("studio-finder-forms", true).test(draftFile));

  // --- the runner: replay of a real saved finder round (the 27 Oct Visitor visa live pass)
  const step: AiStep = { kind: "find_forms", jobBase: "studio-finder-forms", configurationVersion: "s4-form-finder", template: "find-forms.v1.md", check: "find-forms-check.v1.md", schema: "find-forms-output.v1.schema.json", effort: "medium", max_output_tokens: 10000,
    shapeOk: (o) => Array.isArray((o as { forms?: unknown })?.forms), legacyKeys: JSON.parse(readFileSync(join(STUDIO, "samples", "finder-saved-runs.json"), "utf8")).runs ?? {},
    words: { noSaved: "No saved AI answer for these exact pages yet.", badSaved: "The saved AI answer does not have the expected shape.", nothingUsed: "Nothing was attached." } };
  const saved = JSON.parse(readFileSync(join(RUNS, draftFile), "utf8")) as SavedRun;
  const key = savedRunKey({ ...saved, file: draftFile }, step.legacyKeys!) ?? "";
  const savedInputs = saved.drafting_run?.inputs?.official_files as { file: string; sha256: string }[];
  const never = { launchOnce: async () => { throw new Error("replay must not launch"); } };
  const runner = new StepRunner(never);
  const trail = "Individual › Visitors › Visitor visa";
  let r = await runner.round<{ forms: unknown[] }>(step, false, { trail, contextKey: key, inputs: savedInputs, mode: "replay", wanted: async () => true });
  ok("C11.8 pass: replay returns the saved real answer of exactly these pages, prompt and combination, at US$0, with no launch", r.ok && r.from === "replay" && r.costUsd === 0 && r.runFile.startsWith("prototype/p2/runs/studio-finder-forms-") && Array.isArray(r.output.forms), r.ok ? r.runFile : r.reason);
  r = await runner.round(step, false, { trail, contextKey: "individual.other.place", inputs: savedInputs, mode: "replay", wanted: async () => true });
  ok("C11.8 fail: replay for another combination finds no saved answer and says so in words", !r.ok && r.reason === step.words.noSaved && r.costUsd === 0, r);
  r = await runner.round(step, false, { trail, contextKey: key, inputs: [...savedInputs].reverse(), mode: "replay", wanted: async () => true });
  ok("C11.8 fail: replay with other input files (or order) finds no saved answer", savedInputs.length < 2 || (!r.ok && r.reason === step.words.noSaved));
  const rWrongShape = await new StepRunner(never).round({ ...step, shapeOk: () => false }, false, { trail, contextKey: key, inputs: savedInputs, mode: "replay", wanted: async () => true });
  ok("C11.14 fail: a saved answer not in the step's shape is never used", !rWrongShape.ok && rWrongShape.reason === step.words.noSaved);

  // --- the runner: live rounds on a fake launcher (no process, no network, no spend)
  const tmp = mkdtempSync(join(tmpdir(), "rounds-"));
  const record = (o: unknown) => { const f = join(tmp, `rec-${Math.random().toString(36).slice(2)}.json`); writeFileSync(f, JSON.stringify(o)); return f; };
  type Call = { jobId: string; mode: string };
  const fake = (plan: (c: Call) => { code: number; out: string; err?: string; cancelled?: boolean; stopped?: boolean }, calls: Call[] = [], jobSeen: string[] = []) => ({
    launchOnce: async (jobId: string, mode: "stub" | "live") => { calls.push({ jobId, mode }); if (existsSync(join(JOBS, `${jobId}.json`))) jobSeen.push(jobId); const p = plan({ jobId, mode }); return { err: "", ...p }; },
  });
  const live = (launcher: ReturnType<typeof fake>, s: AiStep = step, batchId?: string) => new StepRunner(launcher).round<{ forms: unknown[] }>(s, false, { trail, contextKey: "k1", inputs, mode: "live", wanted: async () => true, batchId });
  const okRec = record({ drafting_run: { status: "completed", usage: { cost_usd: 0.153 } }, contract_valid: true, raw_output: JSON.stringify({ forms: [] }) });
  const calls: Call[] = [], seen: string[] = [];
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: okRec }) }), calls, seen));
  ok("C11.14 pass: a live round runs the free stub pass first, then the live call, and returns its answer and cost", r.ok && r.from === "live" && r.costUsd === 0.153 && calls.map((c) => c.mode).join(",") === "stub,live", { r, calls });
  ok("review M7 pass: the job file exists for the launcher and is removed after the round", seen.length === 2 && !existsSync(join(JOBS, `${calls[0].jobId}.json`)) && calls[0].jobId.startsWith("studio-finder-forms-"));
  r = await live(fake((c) => (c.mode === "stub" ? { code: 2, out: JSON.stringify({ refused: "the file is not approved" }) } : { code: 0, out: "" })));
  ok("C11.14 fail: a stub refusal stops before any call, in words, US$0", !r.ok && /refused the job before any call: the file is not approved/.test(r.reason) && r.costUsd === 0, r);
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: "", cancelled: true })));
  ok("P-110 fail: a Stop before the call is sent charges nothing", !r.ok && r.cancelled === true && /nothing was charged/.test(r.reason), r);
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 1, out: JSON.stringify({ refused: "usage limit reached" }) })));
  ok("C11.14 fail: the provider's usage limit is said plainly and marked blocked, US$0", !r.ok && r.blocked === true && /usage limit refused the call/.test(r.reason) && r.costUsd === 0, r);
  const badRec = record({ drafting_run: { status: "completed", usage: { cost_usd: 0.2 } }, contract_valid: true, raw_output: JSON.stringify({ nope: 1 }) });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: badRec }) })));
  ok("C11.14 fail: a live answer not in the step's shape is not used; its cost stays counted; the step's own words say what was not done", !r.ok && r.costUsd === 0.2 && r.reason === "The AI answer did not have the expected shape. Nothing was attached.", r);
  const brokenRec = record({ drafting_run: { status: "failed", usage: { cost_usd: 0.3 } }, contract_valid: false, output_errors: ["x"] });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: brokenRec }) })));
  ok("C11.14 fail: a failed or contract-breaking live run is not used", !r.ok && /could not be used \(failed: it did not match the expected shape\)/.test(r.reason) && r.costUsd === 0.3, r);
  // Stop finds the round running now for its run, and no other.
  let during: string | undefined;
  const watcher = new StepRunner({ launchOnce: async (jobId: string, mode: "stub" | "live") => { if (mode === "live") during = watcher.liveJob("batch-9"); return { code: 0, err: "", out: mode === "stub" ? "{}" : JSON.stringify({ run_file: okRec }) }; } });
  await watcher.round(step, false, { trail, contextKey: "k1", inputs, mode: "live", wanted: async () => true, batchId: "batch-9" });
  ok("M7 pass: while a round runs, Stop finds its exact job for that run", during === jobIdFor("studio-finder-forms", false, trail, "batch-9"), during);
  ok("M7 fail: after the round, and for any other run, there is nothing to stop", watcher.liveJob("batch-9") === undefined && watcher.liveJob("batch-other") === undefined);

  // --- screens N1 (Lead, 29 Oct): a saved answer may belong to a form edition, so S6 drafts once per edition
  const ek = editionContextKey("IMM 5257", "09-2023");
  ok("N1 pass: an edition context key names the form and the edition (edition:<code>:<edition>)", ek === "edition:IMM 5257:09-2023" && JSON.stringify(editionOfContextKey(ek)) === JSON.stringify({ code: "IMM 5257", edition: "09-2023" }), ek);
  ok("N1 fail: a combination's key, or a malformed one, is not an edition", editionOfContextKey("individual.visitors.visitor_visa") === null && editionOfContextKey("edition:IMM 5257") === null && editionOfContextKey("edition:IMM 5257:2023-09") === null && editionOfContextKey("edition:IMM 5257:09-2023:x") === null);
  const edRun: SavedRun = { ...good, drafting_run: { ...good.drafting_run, inputs: { official_files: inputs, combination: ek } } };
  ok("N1 pass: a saved answer for this edition is replayed for the same edition, whichever combination asks", isSameSavedRun(edRun, { ...want, contextKey: ek }));
  ok("N1 fail: never for another edition of the form, another form, or a combination's key", !isSameSavedRun(edRun, { ...want, contextKey: editionContextKey("IMM 5257", "01-2025") }) && !isSameSavedRun(edRun, { ...want, contextKey: editionContextKey("IMM 5645", "09-2023") }) && !isSameSavedRun(edRun, { ...want, contextKey: "k1" }));
  let edJob: { combination?: string; known?: Record<string, unknown> } = {};
  const edRunner = new StepRunner({ launchOnce: async (jobId: string, mode: "stub" | "live") => { if (mode === "stub") edJob = JSON.parse(readFileSync(join(JOBS, `${jobId}.json`), "utf8")); return { code: 0, err: "", out: mode === "stub" ? "{}" : JSON.stringify({ run_file: okRec }) }; } });
  r = await edRunner.round(step, false, { trail: "IMM 5257 (09-2023)", contextKey: ek, inputs, mode: "live", wanted: async () => true });
  ok("N1 pass: a live round for an edition writes the edition key on its job and names only the printed edition as its known fact (the launcher admits it)", r.ok && edJob.combination === ek && JSON.stringify(edJob.known) === JSON.stringify({ form_edition: "IMM 5257 (09-2023)" }) && knownOk(edJob.known ?? {}), edJob);
  ok("N1 (for S6): the launcher admits printed IMM editions only; a guide edition is refused as a known fact", !knownOk({ form_edition: "Guide 5256 (05-2026)" }));
  await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: okRec }) }), [], []));
  let cJob: { known?: Record<string, unknown> } = {};
  await new StepRunner({ launchOnce: async (jobId: string, mode: "stub" | "live") => { if (mode === "stub") cJob = JSON.parse(readFileSync(join(JOBS, `${jobId}.json`), "utf8")); return { code: 0, err: "", out: mode === "stub" ? "{}" : JSON.stringify({ run_file: okRec }) }; } }).round(step, false, { trail, contextKey: "k1", inputs, mode: "live", wanted: async () => true });
  ok("N1 fail: a combination's round never claims a form edition as its known fact", JSON.stringify(cJob.known) === JSON.stringify({ combination_trail: trail }), cJob.known);

  // --- P-139 (founder, 29 Oct): the experiment cap is US$120; the Wave 1 cap stays US$60
  ok("P-139 pass: the experiment cap is US$120 and the Wave 1 cap US$60", EXPERIMENT_CAP_USD === 120 && WAVE1_CAP_USD === 60, { EXPERIMENT_CAP_USD, WAVE1_CAP_USD });
  const ledgerDir = mkdtempSync(join(tmpdir(), "ledger-"));
  // US$115 settled before the wave started (so only the experiment cap counts), then a run asks for more.
  writeFileSync(join(ledgerDir, "spend.jsonl"), Array.from({ length: 23 }, (_, i) => [JSON.stringify({ type: "reserve", id: `old#${i}`, run_id: `old-${i}`, attempt: 1, worst_usd: 5, at: "2026-10-20T00:00:00.000Z" }), JSON.stringify({ type: "settle", id: `old#${i}`, actual_usd: 5, outcome: "ok", at: "2026-10-20T00:00:01.000Z" })].join("\n")).join("\n") + "\n");
  const ledger = new SpendLedger(ledgerDir);
  let reserved = false; try { ledger.reserve("p139-a", 1, 4, RUN_CAP_USD); reserved = true; } catch { /* refused */ }
  ok("P-139 pass: with US$115 spent, a US$4 run fits under the US$120 cap (it was refused at US$100)", reserved && ledger.capUsd === 120);
  let refusal = ""; try { ledger.reserve("p139-b", 1, 2, RUN_CAP_USD); } catch (e) { refusal = e instanceof BudgetExceeded ? e.message : String(e); }
  ok("P-139 fail: a reservation above US$120 is refused before any call, naming the cap", /experiment cap US\$120/.test(refusal), refusal);
  rmSync(ledgerDir, { recursive: true, force: true });

  // --- cost first: the worst case as the ledger reserves it, never above the run cap
  const w = worstRoundUsd(step, 160_000);
  ok("C11.8: a round's worst case is above US$0 and never above the run cap", w > 0 && w <= RUN_CAP_USD, w);

  // --- one copy of the rounds (challenge A2): the finder calls no launcher itself
  const finderSrc = readFileSync(join(STUDIO, "api", "src", "finder.ts"), "utf8");
  ok("A2: the finder runs its rounds only through the shared step runner (no launcher call, saved-run match or job file of its own)", !/launchOnce\(/.test(finderSrc) && !/template_sha256/.test(finderSrc) && !/writeFileSync\(join\(JOBS/.test(finderSrc) && /this\.rounds\.round/.test(finderSrc));

  rmSync(tmp, { recursive: true, force: true });
  ok("no job file of these checks is left in the source tree", !(existsSync(JOBS) ? readdirSync(JOBS) : []).some((f) => f.startsWith("studio-finder-forms-individual-visitors-visitor-visa-") && !f.includes("live")));
})().catch((e) => { fail++; console.log(`FAIL  the check stopped: ${(e as Error).stack}`); }).finally(() => {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
