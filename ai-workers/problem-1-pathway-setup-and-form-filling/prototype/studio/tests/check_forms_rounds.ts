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
import { editionContextKey, editionOfContextKey, isSameSavedRun, jobIdFor, LIVE_RUN, MAX_OTHER_PAGES, newestFirst, otherPages, promptOfRun, replayPattern, savedRunKey, type SavedRun } from "../engine/rounds.ts";
import { paidRetryAllowed, paidRunAllowed, paidRunsOf, RUNS, sizedBudgetUsd, StepRunner, worstRoundUsd, type AiStep } from "../api/src/rounds.ts";
import { EXPERIMENT_CAP_USD, MAX_ATTEMPTS, MAX_PAID_ATTEMPTS_PER_FORM, MAX_REQUEST_BYTES, RUN_CAP_USD, WAVE1_CAP_USD } from "../../p2/policy.ts";
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
  ok("C11.14 pass: a finished field-map run that left form fields to a person (status \"completed_with_unresolved\", as p2/convert.ts records every field-map and checker run) may be replayed", isSameSavedRun({ ...good, drafting_run: { ...good.drafting_run, status: "completed_with_unresolved" } }, want));
  // The statuses p2 records for a run that did not give a usable answer (p2/runner.ts, p2/launch.ts), plus none at all.
  ok("C11.14 fail: a run that did not finish (timed out, refused, invalid output, provider error, over budget, or no status) is still never replayed", ["timed_out", "refused", "invalid_output", "provider_error", "budget_exceeded", ""].every((st) => !isSameSavedRun({ ...good, drafting_run: { ...good.drafting_run, status: st } }, want)));
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
  // W1-10 slice 1 (plan §4): a step names the earlier prompt versions it still replays; any other version is refused.
  const prompts = [{ sha256: "t2", label: "" }, { sha256: "t1", label: "Saved before channels" }];
  ok("C11.8 §4 pass: an answer of an earlier prompt the step names is replayed, with its label", promptOfRun(good, prompts) === "Saved before channels" && promptOfRun({ ...good, launch_evidence: { template_sha256: "t2" } }, prompts) === "");
  ok("C11.8 §4 fail: an answer of any other prompt version is never replayed", promptOfRun({ ...good, launch_evidence: { template_sha256: "t0" } }, prompts) === null && promptOfRun({ ...good, launch_evidence: {} }, prompts) === null);
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
  // C11.14 (Lead 2, 3 Nov; review Minor 1 on #673): a paid field-map or checker round is recorded "completed_with_unresolved"
  // when it leaves any form field to a person (p2/convert.ts); the live path uses it like a "completed" one, never pays and
  // then refuses it. Runs that gave no usable answer are still refused, with their cost kept counted.
  const unresolvedRec = record({ drafting_run: { status: "completed_with_unresolved", usage: { cost_usd: 0.41 } }, contract_valid: true, raw_output: JSON.stringify({ forms: [] }) });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: unresolvedRec }) })));
  ok("C11.14 pass: a live round recorded \"completed_with_unresolved\" (a paid field-map or checker run with a field left to a person) is used, with its cost", r.ok && r.from === "live" && r.costUsd === 0.41, r);
  const notFinished = await Promise.all(["refused", "invalid_output", "timed_out"].map(async (status) => {
    const rec = record({ drafting_run: { status, usage: { cost_usd: 0.12 } }, contract_valid: true, raw_output: JSON.stringify({ forms: [] }) });
    const x = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: rec }) })));
    return { status, ok: x.ok, costUsd: x.costUsd };
  }));
  ok("C11.14 fail: a live round recorded refused, invalid_output or timed_out is still not used, even with a well-formed answer; its cost stays counted", notFinished.every((x) => !x.ok && x.costUsd === 0.12), notFinished);
  // Review m1–m2 and break m1 on #693: the guards after the status gate hold for the new status too, and its money branches.
  const liveWith = async (rec: unknown) => live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: rec }) })));
  const unres = (over: Record<string, unknown>, run: Record<string, unknown> = {}) => record({ drafting_run: { status: "completed_with_unresolved", usage: { cost_usd: 0.3 }, ...run }, contract_valid: true, raw_output: JSON.stringify({ forms: [] }), ...over });
  const unusable = await Promise.all([["contract broken", unres({ contract_valid: false })], ["no answer text", unres({ raw_output: undefined })], ["unreadable answer", unres({ raw_output: "{not json" })], ["wrong shape", unres({ raw_output: JSON.stringify({ nope: 1 }) })]]
    .map(async ([why, rec]) => { const x = await liveWith(rec); return { why, ok: x.ok, costUsd: x.costUsd }; }));
  ok("C11.14 fail: a \"completed_with_unresolved\" live round that broke its contract, has no or unreadable answer text, or the wrong shape is not used; its cost stays counted", unusable.every((x) => !x.ok && x.costUsd === 0.3), unusable);
  r = await liveWith(unres({}, { attempts: [{ n: 1, outcome: "busy", error: "529 overloaded" }, { n: 2, outcome: "ok" }] }));
  ok("C11.14 pass: a \"completed_with_unresolved\" live round whose earlier attempt was busy and a retry answered is used, with its cost", r.ok && r.costUsd === 0.3, r);
  r = await liveWith(unres({ raw_output: undefined }, { usage: { cost_usd: 0.22 }, attempts: [{ n: 1, outcome: "timed_out", error: "Request timed out." }, { n: 2, outcome: "error", error: "400 usage limit reached" }] }));
  ok("C11.14 fail: a \"completed_with_unresolved\" record with no answer after a usage-limit refusal is blocked, the earlier attempt kept counted", !r.ok && r.blocked === true && /usage limit/.test(r.reason), r);
  const arrays = await Promise.all([["completed"], ["completed_with_unresolved"]].map(async (status) => (await liveWith(record({ drafting_run: { status, usage: { cost_usd: 0.1 } }, contract_valid: true, raw_output: JSON.stringify({ forms: [] }) }))).ok));
  ok("C11.14 fail (break m1 on #693): a status that is not plain text (an array [\"completed\"]) is never a finished run, live or replayed", arrays.every((x) => !x) && !isSameSavedRun({ ...good, drafting_run: { ...good.drafting_run, status: ["completed"] as unknown as string } }, want), arrays);
  r = await live(fake((c) => (c.mode === "stub" ? { code: 2, out: JSON.stringify({ refused: "the file is not approved" }) } : { code: 0, out: "" })));
  ok("C11.14 fail (S3 early look 1): a stub refusal stops before any call, in plain words, US$0; the launcher's own words stay in the server log", !r.ok && r.reason === "The AI step could not start on this computer, so nothing was sent and nothing was charged" && !/not approved/.test(r.reason) && r.costUsd === 0, r);
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 1, out: JSON.stringify({ error: "ECONNRESET at /Users/x/p2/launch.ts:120" }) })));
  ok("C11.14 fail (S3 early look 1): a live call that did not run says so plainly, never the launcher's error or a server path, US$0", !r.ok && r.reason === "The AI step did not run, so nothing was charged" && !/ECONNRESET|\/Users\//.test(r.reason) && r.costUsd === 0 && !r.blocked, r);
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
  // Demo bug, 29 Oct: the AI service refused the guide pick (400 invalid_request_error: maxItems in the schema). The run record
  // (as p2/launch.ts writes it after the runner) holds the attempt refused before processing, at US$0.
  const refusedRec = record({ drafting_run: { status: "provider_error", usage: { cost_usd: 0 }, attempts: [{ n: 1, outcome: "refused_by_provider", error: "400 invalid_request_error: output_config.format.schema: For 'array' type, property 'maxItems' is not supported" }] }, contract_valid: true });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: refusedRec }) })));
  ok("demo bug pass: a request the AI service refused says so plainly with US$0 (\"The AI service refused the request (our setup error); nothing was charged\")", !r.ok && r.reason === "The AI service refused the request (our setup error); nothing was charged" && r.costUsd === 0 && !r.blocked, r);
  ok("demo bug fail: the person never reads the service's own words (provider_error, invalid_request_error, maxItems)", !r.ok && !/provider_error|invalid_request|maxItems|400/.test(r.reason), r);
  const brokenRec2 = record({ drafting_run: { status: "provider_error", usage: { cost_usd: 0.22 }, attempts: [{ n: 1, outcome: "error", error: "socket hang up" }] }, contract_valid: true });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: brokenRec2 }) })));
  ok("demo bug fail: a failure whose cost is unknown keeps its recorded worst case and is not called a refusal", !r.ok && r.costUsd === 0.22 && !/refused the request/.test(r.reason), r);
  // Lead 29 Oct (G5): a request above the size cap was refused before any call; the step says so plainly, US$0.
  const bigRec = record({ drafting_run: { status: "refused", usage: { cost_usd: 0 }, attempts: [{ n: 1, outcome: "refused_input_too_large", error: `request of 900000 bytes is above the cap of ${MAX_REQUEST_BYTES}` }] }, contract_valid: true });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: bigRec }) })));
  ok("G5 pass: input above the size cap is refused in plain words at US$0 (\"The pages are too large for one AI call…\")", !r.ok && r.reason === "The pages are too large for one AI call, so nothing was sent and nothing was charged" && r.costUsd === 0, r);
  ok("G5 fail: the person never reads the byte counts or the cap's name", !r.ok && !/bytes|cap of/.test(r.reason));
  // QA-87, QA-88: a busy service said plainly, US$0; the request id under Details.
  const busyRec = record({ drafting_run: { status: "provider_error", usage: { cost_usd: 0 }, attempts: [{ n: 1, outcome: "busy", request_id: "req_busy_1", error: "529 {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\"}}" }] }, contract_valid: true });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: busyRec }) })));
  ok("QA-87 pass: a busy service is said plainly, US$0, request id under Details", !r.ok && r.reason === "The AI service was busy, so nothing was charged. Try again in a few minutes" && r.costUsd === 0 && r.details === "Request req_busy_1", r);
  ok("QA-88 fail: the person never reads overloaded_error, 529 or JSON", !r.ok && !/overloaded|529|\{/.test(r.reason));
  // Audit 29 Oct: a first attempt that timed out stays counted at its worst case; a busy or refused retry must not hide it.
  const mixedBusy = record({ drafting_run: { status: "timed_out", usage: { cost_usd: 0.22 }, attempts: [{ n: 1, outcome: "timed_out", error: "Request timed out." }, { n: 2, outcome: "busy", error: "529 overloaded_error" }] }, contract_valid: true });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: mixedBusy }) })));
  ok("audit fail: a timeout then a busy retry keeps the counted US$0.22 and never says \"nothing was charged\"", !r.ok && r.costUsd === 0.22 && !/nothing was charged/.test(r.reason) && /US\$0\.22/.test(r.reason), r);
  const mixedRefused = record({ drafting_run: { status: "provider_error", usage: { cost_usd: 0.22 }, attempts: [{ n: 1, outcome: "error", error: "socket hang up" }, { n: 2, outcome: "refused_by_provider", error: "400 invalid_request_error" }] }, contract_valid: true });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: mixedRefused }) })));
  ok("audit fail: a dropped call then a refused retry keeps the counted US$0.22 and never says \"nothing was charged\"", !r.ok && r.costUsd === 0.22 && !/nothing was charged/.test(r.reason) && /refused the request/.test(r.reason), r);
  ok("audit pass: a refusal with nothing counted still says \"nothing was charged\" at US$0 (refusedRec above)", (await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: refusedRec }) })))).costUsd === 0);
  // Outside review 29 Oct: the usage limit (a 400) is found before "our setup error", and an earlier counted attempt stays.
  const limitText = '400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits."}}';
  const limitAfter = record({ drafting_run: { status: "timed_out", usage: { cost_usd: 0.22 }, attempts: [{ n: 1, outcome: "timed_out", error: "Request timed out.", worst_usd: 0.22 }, { n: 2, outcome: "refused_by_provider", error: limitText, request_id: "req_lim2", cost_usd: 0, worst_usd: 0.22 }] }, contract_valid: true });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: limitAfter }) })));
  ok("review fail: a timeout then the usage limit is BLOCKED by the limit (never \"our setup error\") and keeps the counted US$0.22", !r.ok && r.blocked === true && r.costUsd === 0.22 && /usage limit/.test(r.reason) && !/setup error|nothing was charged/.test(r.reason) && r.details === "Request req_lim2", r);
  const limitAlone = record({ drafting_run: { status: "provider_error", usage: { cost_usd: 0 }, attempts: [{ n: 1, outcome: "refused_by_provider", error: limitText, cost_usd: 0, worst_usd: 0.22 }] }, contract_valid: true });
  r = await live(fake((c) => (c.mode === "stub" ? { code: 0, out: "{}" } : { code: 0, out: JSON.stringify({ run_file: limitAlone }) })));
  ok("review pass: the usage limit on its own is BLOCKED at US$0, \"nothing was charged\"", !r.ok && r.blocked === true && r.costUsd === 0 && /usage limit.*nothing was charged/.test(r.reason), r);
  // Demo 29 Oct (P-153): "at most 5 other pages from each guide round" lives in code, since the schema may not say maxItems.
  ok("demo bug pass: up to 5 other pages are kept as given", JSON.stringify(otherPages(["a", "b", "c"])) === JSON.stringify(["a", "b", "c"]));
  ok("demo bug fail: an answer with 8 other pages keeps only the first 5; non-titles and a missing list give nothing", otherPages(["1", "2", "3", "4", "5", "6", "7", "8"]).length === MAX_OTHER_PAGES && MAX_OTHER_PAGES === 5 && otherPages([1, null, "x"]).join() === "x" && otherPages(undefined).length === 0);
  // QA-87 and the Lead's ask (29 Oct): a round's budget and time limit per step; without them the budget is sized so one retry fits.
  ok("QA-87 pass: a small input keeps the US$1 default", sizedBudgetUsd({ max_output_tokens: 3000 }, 37_000) === 1);
  ok("QA-87 fail (before: a fixed US$1): a 100 KB finder input with a 10,000 output limit gets a budget both attempts fit", sizedBudgetUsd({ max_output_tokens: 10_000 }, 100_000) >= 2 * worstRoundUsd({ max_output_tokens: 10_000 } as AiStep, 100_000) / 2 && sizedBudgetUsd({ max_output_tokens: 10_000 }, 100_000) > 1, sizedBudgetUsd({ max_output_tokens: 10_000 }, 100_000));
  ok("QA-87: the sized budget never passes the run cap", sizedBudgetUsd({ max_output_tokens: 64_000 }, 700_000) <= RUN_CAP_USD);
  let budgetJob: { settings?: { budget_usd?: number; timeout_ms?: number } } = {};
  const bRunner = new StepRunner({ launchOnce: async (jobId: string, mode: "stub" | "live") => { if (mode === "stub") budgetJob = JSON.parse(readFileSync(join(JOBS, `${jobId}.json`), "utf8")); return { code: 0, err: "", out: mode === "stub" ? "{}" : JSON.stringify({ run_file: okRec }) }; } });
  await bRunner.round({ ...step, budget_usd: 5, timeout_ms: 900_000 }, false, { trail, contextKey: "k1", inputs, mode: "live", wanted: async () => true });
  ok("Lead 29 Oct pass: a step's own budget_usd and timeout_ms go on its job (whole-form drafts: US$5, 900 000 ms)", budgetJob.settings?.budget_usd === 5 && budgetJob.settings?.timeout_ms === 900_000, budgetJob.settings);
  await bRunner.round(step, false, { trail, contextKey: "k1", inputs, mode: "live", wanted: async () => true });
  ok("Lead 29 Oct fail: a step that names neither gets 300 000 ms and a budget sized from its input (never below US$1)", budgetJob.settings?.timeout_ms === 300_000 && (budgetJob.settings?.budget_usd ?? 0) >= 1, budgetJob.settings);

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

  // --- G4 (Lead, 29 Oct): one budget of paid attempts per form, stated in p2/policy.ts
  ok("G4 pass: the policy states the paid attempts per form (4: two per run, so one paid retry); a live first run may be retried once", MAX_PAID_ATTEMPTS_PER_FORM === 4 && MAX_ATTEMPTS === 2 && paidRetryAllowed("LIVE", 1), { MAX_PAID_ATTEMPTS_PER_FORM, MAX_ATTEMPTS });
  ok("G4 fail: a live form's second retry is refused (it would pass 4 paid attempts; before, 6 were possible)", !paidRetryAllowed("LIVE", 2) && !paidRetryAllowed("LIVE", 3));
  ok("G4: a stub run costs nothing and is never held to the paid budget", paidRetryAllowed("STUB", 2) && paidRetryAllowed("REPLAY", 5));
  // P-171 (a), P-170; BK-10 (Lead 11 on #1518, option (a)): no form title is kept in code any more. A library form's title
  // is its own record's, and a form new to the library takes the one a person gives. That IMM 5257 SCH1's record carries
  // its official title (the saved canada.ca page, read 29 Oct 2026), never IMM 5669's wording, is checked on the loaded
  // data in check_bk10_form_titles.ts.
  const sch1Page = readFileSync(join(STUDIO, "..", "..", "official-sources", "ircc", "canada", "pages", "imm5257-sch1.html"), "utf8");
  const official = /<h1[^>]*>([^<]+)<span[^>]*>\(IMM 5257 SCH1\)/.exec(sch1Page)?.[1].trim();
  const srcText = readFileSync(join(STUDIO, "api", "src", "sources.ts"), "utf8");
  ok("P-171 (a) pass: no form title is kept in code (api/src/sources.ts holds no title list); the schedule's official page still names it", !!official && !/\bTITLES\b|"IMM 5257 SCH1"\s*:/.test(srcText), { official });
  ok("P-171 (a) fail: never IMM 5669's \"Background/Declaration\" wording in the code that files a form", !/Background\/Declaration/.test(srcText));
  // Outside review 29 Oct: the budget holds per form across batches (Draft again), counted from the form's own runs.
  const run = (over: Partial<{ kind: string; mode: string; status: string; costUsd: number | null }> = {}) => ({ kind: "field_map", mode: "LIVE", status: "FAILED", costUsd: 0.4, ...over });
  ok("G4 per form pass: a form with one paid run may start one more (2 runs × 2 attempts = 4)", paidRunAllowed(paidRunsOf([run()])) && paidRunAllowed(paidRunsOf([])));
  ok("G4 per form fail: a form with two paid runs, in any batches, may not start a third", !paidRunAllowed(paidRunsOf([run(), run({ status: "COMPLETED" })])), paidRunsOf([run(), run({ status: "COMPLETED" })]));
  ok("G4 per form: runs that sent nothing (US$0), stub and reuse steps are not counted; a running call is", paidRunsOf([run({ costUsd: 0 }), run({ mode: "STUB" }), run({ kind: "reuse_map" }), run({ costUsd: null, status: "QUEUED" })]) === 0 && paidRunsOf([run({ costUsd: null, status: "RUNNING" })]) === 1);
  ok("G4 per form: the new batch's plan and the retry both read the form's runs (ai.ts)", (readFileSync(join(STUDIO, "api", "src", "ai.ts"), "utf8").match(/paidRunAllowed\(paidRunsOfFile\(/g) ?? []).length === 2);
  ok("G4: the field-map plan states the budget before the run (ai.ts and the launch dialog's cost line)", /max_paid_attempts_per_form: MAX_PAID_ATTEMPTS_PER_FORM/.test(readFileSync(join(STUDIO, "api", "src", "ai.ts"), "utf8")) && /paid attempts per form, a retry included/.test(readFileSync(join(STUDIO, "web", "src", "components", "ai-launch.tsx"), "utf8")));
  ok("G4: every AI step reads its attempts from the policy (no step hard-codes its own)", ["rounds.ts", "people-ai.ts", "sources.ts"].every((f) => /max_attempts: MAX_ATTEMPTS/.test(readFileSync(join(STUDIO, "api", "src", f), "utf8"))));

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
