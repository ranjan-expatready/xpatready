// S6 slice R (plan §2 R1–R2, N1; P-138): the one AI step "Draft fields" per form edition on the shared step runner, and
// the logged recording pass that fills its saved answers (Scaffolding). A passing and a failing case per rule. No server,
// no database, no network: replay reads a saved answer written for this check into p2/runs (removed after), live rounds
// run on a fake launcher, and one stub pass goes through the guarded launcher (no model). NO model call (US$0).
//   C11.13 a form edition is drafted once, keyed by the edition · C11.8 replay at US$0 only for that edition, prompt and file
//   C11.14 an answer is used only in its shape · P-138 live only on a click or the logged pass, inside both caps
//   tsx studio/tests/check_s6_field_drafts.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { draftEdition, editionKey, FIELD_MAP_EDITION, fieldMapShapeOk, roundCost, runnerBudgetUsd, sampleEditions, stepFor, type EditionSource } from "../api/src/field-drafts.ts";
import { RUNS, StepRunner } from "../api/src/rounds.ts";
import { jobIdFor } from "../engine/rounds.ts";
import { RUN_CAP_USD } from "../../p2/policy.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const STUDIO = join(import.meta.dirname, "..");
const PROTOTYPE = join(STUDIO, "..");
const JOBS = join(PROTOTYPE, "p2", "jobs");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const answer = (edition: string) => ({ form_edition: edition, canonical_fields: [{ id: "person.family_name", meaning: "The person's family name", value_type: "text" }],
  entries: [{ data_path: "form1[0].Page1[0].FamilyName[0]", outcome: "mapped", person: "form_subject", row: null, fact: "person.family_name", transform: "as_is", condition: null, confidence: "high", unresolved_reason: null, evidence_quote: "Family name" }] });

(async () => {
  // --- which form editions the pass drafts (Sample: the official manifest's forms with an inventory of that same file)
  const eds = sampleEditions();
  const byCode = new Map(eds.map((e) => [e.code, e]));
  ok("C11.13 pass: the Sample form editions are found with their inventories (IMM 1295, 1344, 5257, 5257 SCH1, 5409, 5475, 5476, 5707)", ["IMM 1295", "IMM 1344", "IMM 5257", "IMM 5257 SCH1", "IMM 5409", "IMM 5475", "IMM 5476", "IMM 5707"].every((c) => byCode.has(c)), eds.map((e) => e.printed));
  ok("C11.13 fail: a checklist (IMM 5488) and guides have no boxes to map and are never drafted", !eds.some((e) => /5488|5487|5256/.test(e.code)) && eds.every((e) => e.fields > 0), eds.map((e) => e.code));
  const i5475 = byCode.get("IMM 5475")!, i1295 = byCode.get("IMM 1295")!;
  ok("C11.13 pass (N1): an edition's key is edition:<code>:<edition>, one per form edition", editionKey(i1295) === "edition:IMM 1295:09-2023" && new Set(eds.map(editionKey)).size === eds.length, editionKey(i1295));
  ok("C11.13 fail (N1): two editions of one form never share a key", editionKey({ code: "IMM 5476", edition: "11-2025" }) !== editionKey({ code: "IMM 5476", edition: "06-2021" }));

  // --- the shape an answer must have (C11.14)
  ok("C11.14 pass: a field map with its edition, fields and box entries is used", fieldMapShapeOk(answer("IMM 5475 (12-2022)")));
  ok("C11.14 fail: no entries, an unknown outcome or a missing data path is never used", !fieldMapShapeOk({ ...answer("x"), entries: [] }) && !fieldMapShapeOk({ ...answer("x"), entries: [{ ...answer("x").entries[0], outcome: "guess" }] }) && !fieldMapShapeOk({ ...answer("x"), entries: [{ ...answer("x").entries[0], data_path: "" }] }) && !fieldMapShapeOk("{}"));

  // --- money before any call (P-138, P-110)
  const small = roundCost(i5475), big = roundCost(i1295);
  ok("P-138 pass: a small form's reading is limited by its box count (about 300 a box), so it reserves a small worst case", stepFor(i5475).max_output_tokens === 4_000 + 300 * i5475.fields && small.worstUsd < 1 && small.fitsBudget, { tokens: stepFor(i5475).max_output_tokens, small });
  ok("P-138 fail: a 242-box form's reading never reserves more than the run cap, and one above the runner's job budget is refused before any call", stepFor(i1295).max_output_tokens === 64_000 && big.worstUsd <= RUN_CAP_USD && big.fitsBudget === (big.attemptUsd <= runnerBudgetUsd(FIELD_MAP_EDITION)) && !big.fitsBudget, big);

  // --- replay at US$0: only this edition, this prompt, this file (C11.8)
  const never = { launchOnce: async () => { throw new Error("replay must not launch"); } };
  const runner = new StepRunner(never);
  const stamp = `${new Date().toISOString().replace(/[-:.]/g, "").toLowerCase().replace("t", "t").slice(0, 18)}`;
  const tsName = (n: number) => `2099010${n}t000000000z`;
  const written: string[] = [];
  const save = (isCheck: boolean, key: string, e: EditionSource, output: unknown, n: number, template = isCheck ? FIELD_MAP_EDITION.check : FIELD_MAP_EDITION.template) => {
    const file = `${jobIdFor(FIELD_MAP_EDITION.jobBase, isCheck, e.printed, `s6check-${n}`)}-live-${tsName(n)}-s6chk.json`;
    writeFileSync(join(RUNS, file), JSON.stringify({ caller: "live", contract_valid: true, raw_output: JSON.stringify(output),
      drafting_run: { status: "completed", usage: { cost_usd: 0.3 }, inputs: { combination: key, official_files: [{ file: e.inventory, sha256: e.inventorySha256 }] } },
      launch_evidence: { template_sha256: sha(readFileSync(join(PROTOTYPE, "p2", "prompts", template))), known: { form_edition: e.printed } } }));
    written.push(file);
  };
  void stamp;
  try {
    let got = await draftEdition(runner, i5475, "replay", async () => false);
    ok("C11.8 fail: with no saved reading of this edition, replay says so in plain words and costs US$0", !got.draft.ok && !got.check.ok && got.costUsd === 0 && /No saved AI draft of this form edition/.test((got.draft as { reason: string }).reason), got.draft);
    save(false, "edition:IMM 5475:06-2019", i5475, answer("IMM 5475 (06-2019)"), 1); // another edition's key
    save(true, editionKey(i5475), i5475, answer("IMM 5475 (12-2022)"), 2, FIELD_MAP_EDITION.template); // the draft prompt, not the checker's
    got = await draftEdition(runner, i5475, "replay", async () => false);
    ok("C11.8 fail: a saved reading of another edition, or made with the other round's prompt, is never replayed", !got.draft.ok && !got.check.ok, { draft: got.draft.ok, check: got.check.ok });
    save(false, editionKey(i5475), i5475, answer("IMM 5475 (12-2022)"), 3);
    save(true, editionKey(i5475), i5475, answer("IMM 5475 (12-2022)"), 4);
    got = await draftEdition(runner, i5475, "replay", async () => false);
    ok("C11.8 pass: both saved readings of this edition replay at once at US$0, each from its own round", got.draft.ok && got.check.ok && got.costUsd === 0 && got.draft.from === "replay" && got.draft.runFile !== (got.check as { runFile: string }).runFile, { draft: got.draft.ok && got.draft.runFile, check: got.check.ok && got.check.runFile });
    save(false, editionKey(i5475), i5475, { form_edition: "IMM 5475 (12-2022)", entries: "none" }, 5);
    got = await draftEdition(runner, i5475, "replay", async () => false);
    ok("C11.14 pass (round 2 m-a): a newer saved reading in the wrong shape is skipped and the older good one is used", got.draft.ok && (got.draft as { runFile: string }).runFile.includes(tsName(3)), got.draft.ok && got.draft.runFile);
  } finally { for (const f of written) rmSync(join(RUNS, f), { force: true }); }

  // --- live rounds on a fake launcher: the job a round sends (no process, no network, no spend)
  const dir = mkdtempSync(join(tmpdir(), "s6-field-drafts-"));
  const rec = join(dir, "rec.json");
  writeFileSync(rec, JSON.stringify({ drafting_run: { status: "completed", usage: { cost_usd: 0.31 } }, contract_valid: true, raw_output: JSON.stringify(answer("IMM 5475 (12-2022)")) }));
  const jobs: Record<string, unknown>[] = [], calls: string[] = [];
  const fake = { launchOnce: async (jobId: string, mode: "stub" | "live", wanted?: () => Promise<boolean>) => {
    calls.push(`${mode}:${jobId}`);
    if (existsSync(join(JOBS, `${jobId}.json`))) jobs.push(JSON.parse(readFileSync(join(JOBS, `${jobId}.json`), "utf8")));
    if (mode === "live" && wanted && !(await wanted())) return { code: 0, out: "", err: "", cancelled: true };
    return mode === "stub" ? { code: 0, out: "{}", err: "" } : { code: 0, out: JSON.stringify({ run_file: rec }), err: "" };
  } };
  let got = await draftEdition(new StepRunner(fake), i5475, "live", async () => true, "s6-test-batch");
  const draftJob = jobs[0] as { combination?: string; known?: { form_edition?: string }; template?: string; kind?: string; settings?: { max_output_tokens?: number } } | undefined;
  const checkJob = jobs[2] as { template?: string } | undefined;
  ok("C11.13 pass (N1): a live round sends the edition as its key and as the printed edition the launcher admits, with the box-count output limit", draftJob?.combination === "edition:IMM 5475:12-2022" && draftJob?.known?.form_edition === "IMM 5475 (12-2022)" && draftJob?.kind === "field_map_edition" && draftJob?.settings?.max_output_tokens === stepFor(i5475).max_output_tokens, draftJob);
  ok("C11.13 pass: the draft round uses field-map.v2.md and the blind checker round field-map-check.v1.md; both used, cost counted", draftJob?.template === "field-map.v2.md" && checkJob?.template === "field-map-check.v1.md" && got.draft.ok && got.check.ok && Math.abs(got.costUsd - 0.62) < 1e-9, { calls, cost: got.costUsd });
  ok("C11.13 fail: no job file is left in p2/jobs after the rounds", !readdirSync(JOBS).some((f) => f.startsWith(FIELD_MAP_EDITION.jobBase)));
  jobs.length = 0; calls.length = 0;
  got = await draftEdition(new StepRunner(fake), i5475, "live", async () => false);
  ok("P-138 fail: a live round not wanted (no click, or cancelled) sends no AI call, and the checker round is not started", !got.draft.ok && got.draft.cancelled === true && !got.check.ok && !calls.some((c) => c.startsWith("live:") && c.includes("-check-")) && got.costUsd === 0, { calls, draft: got.draft });
  rmSync(dir, { recursive: true, force: true });

  // --- the guarded launcher admits the new step's job (stub caller: no model, US$0)
  const jobId = `${FIELD_MAP_EDITION.jobBase}-check-s6-stub-${Date.now().toString(36)}`;
  const job = { job_id: jobId, kind: FIELD_MAP_EDITION.kind, combination: editionKey(i5475), configuration_version: FIELD_MAP_EDITION.configurationVersion, template: FIELD_MAP_EDITION.check, output_schema: FIELD_MAP_EDITION.schema,
    inputs: [{ file: i5475.inventory, sha256: i5475.inventorySha256 }], settings: { provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: "claude-opus-5-5", effort: "high", timeout_ms: 300_000, max_attempts: 2, budget_usd: 1, max_output_tokens: stepFor(i5475).max_output_tokens }, known: { form_edition: i5475.printed } };
  mkdirSync(JOBS, { recursive: true }); writeFileSync(join(JOBS, `${jobId}.json`), JSON.stringify(job, null, 1) + "\n");
  const before = new Set(readdirSync(RUNS));
  const stub = spawnSync(process.execPath, [join(PROTOTYPE, "p2", "launch.ts"), "--job", jobId, "--stub"], { cwd: join(PROTOTYPE, "..", "..", ".."), encoding: "utf8", timeout: 120_000 });
  rmSync(join(JOBS, `${jobId}.json`), { force: true });
  const made = readdirSync(RUNS).filter((f) => !before.has(f));
  let stubRec: { caller?: string; contract_valid?: boolean; drafting_run?: { status?: string; usage?: { cost_usd?: number } } } = {};
  try { stubRec = JSON.parse(readFileSync(join(RUNS, made.find((f) => f.startsWith(jobId))!), "utf8")); } catch { /* reported below */ }
  for (const f of made) rmSync(join(RUNS, f), { force: true });
  ok("C11.13 pass: the guarded launcher admits the checker prompt, the field_map_edition stub and the edition known fact (stub pass, US$0)", stub.status === 0 && stubRec.contract_valid === true && stubRec.drafting_run?.status === "completed" && (stubRec.drafting_run?.usage?.cost_usd ?? 0) === 0, { exit: stub.status, err: stub.stderr?.slice(-300), status: stubRec.drafting_run?.status });

  // --- the recording pass (Scaffolding): plan first, live only with an agreed amount
  const tool = (extra: string[]) => spawnSync(process.execPath, ["--import", "tsx", join(STUDIO, "tools", "record-field-drafts.ts"), ...extra], { cwd: STUDIO, encoding: "utf8", timeout: 120_000, env: { ...process.env, TSX_TSCONFIG_PATH: join(STUDIO, "api", "tsconfig.json") } });
  const noMax = tool(["--live"]);
  ok("P-138 fail: the recording pass refuses --live without --max-usd (the amount the founder agreed), before anything runs", noMax.status === 2 && /--live needs --max-usd/.test(noMax.stderr), { exit: noMax.status, err: noMax.stderr.slice(-200) });
  const plan = tool([]);
  ok("P-138 pass: the plan lists every Sample edition with what it would cost and sends nothing", plan.status === 0 && /plan only/.test(plan.stdout) && eds.every((e) => plan.stdout.includes(e.printed)) && /To record: about US\$[0-9.]+ at the output limit, worst US\$[0-9.]+ \(Sample\)/.test(plan.stdout), plan.stdout.split("\n").slice(-3));

  console.log(`\n${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
