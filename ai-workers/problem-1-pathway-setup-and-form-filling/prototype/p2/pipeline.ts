// Combination 1 drafting pipeline (P2). Runs every step through the one launch path, in the working
// specification's order: 3.1-3.2 field maps per form edition -> 3.3 + 3.5 forms, documents and rules ->
// 3.4 sections and where each value is collected from -> 3.8 checks -> assembly of one draft
// configuration (rules, no AI). Later steps take earlier drafts as untrusted inputs (AIW-D263); the guard
// verifies each parent run before reuse.
//
//   node p2/pipeline.ts --stub                 the whole pipeline with stub callers (no network, no key)
//   node p2/pipeline.ts --live --through field_maps   live: only the field maps (the first model-quality slice)
//   node p2/pipeline.ts --live                 live: every step (each needs its own stub pass first)
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { assemble } from "./assemble.ts";
import { launch, type LaunchResult } from "./launch.ts";
import { JOBS_DIR, PROTOTYPE, RUNS_DIR, SOLUTION } from "./policy.ts";

const sha = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");
const STAGES = ["field_maps", "requirements", "sections", "checks", "assemble"] as const;
type Stage = (typeof STAGES)[number];
export const FIELD_MAP_JOBS = ["c1-fieldmap-imm1295", "c1-fieldmap-imm5707", "c1-fieldmap-imm5409", "c1-fieldmap-imm5476", "c1-fieldmap-imm5475", "c1-fieldmap-imm5257-1"];
const TEXTS = ["imm5488e", "imm5905e", "guide-5487", "work-permit-outside-forms-documents"].map((s) => `prototype/p1/inventory/${s}.text.inventory.json`);
const SETTINGS = { provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: "claude-opus-5-5", effort: "high", timeout_ms: 900_000, max_attempts: 2, budget_usd: 5 };

const asInput = (absFile: string) => ({ file: relative(SOLUTION, absFile), sha256: sha(absFile) });

function writeJob(id: string, kind: string, template: string, schema: string, inputs: { file: string; sha256: string }[], maxOut: number) {
  writeFileSync(join(JOBS_DIR, `${id}.json`), JSON.stringify({ job_id: id, kind, combination: "1", configuration_version: "c1-draft-1", template, output_schema: schema, inputs, settings: { ...SETTINGS, max_output_tokens: maxOut } }, null, 1) + "\n");
}

/** --reuse (live only): a step whose latest contract-valid live run had exactly these inputs is not run again. */
const REUSE = process.argv.includes("--reuse") || process.argv.includes("--reuse-maps");
function reusable(job: string, inputs?: { file: string; sha256: string }[]): string | undefined {
  return readdirSync(RUNS_DIR).filter((f) => f.startsWith(`${job}-live-`) && f.endsWith(".json")).sort().map((f) => join(RUNS_DIR, f))
    .filter((f) => { const e = JSON.parse(readFileSync(f, "utf8")); return e.contract_valid && (!inputs || JSON.stringify(e.drafting_run.inputs.official_files) === JSON.stringify(inputs)); }).pop();
}

export function runPipeline(mode: "stub" | "live", through: Stage = "assemble") {
  const upto = STAGES.indexOf(through);
  const log: { job: string; exit: number; status?: string; run_file?: string; refused?: string }[] = [];
  const done = (job: string, r: LaunchResult) => { log.push({ job, exit: r.exit, status: (r.record as { status?: string } | undefined)?.status, run_file: r.run_file && relative(SOLUTION, r.run_file), refused: r.refused }); return r; };
  const ok = (r: LaunchResult) => r.exit === 0 && r.run_file && ["completed", "completed_with_unresolved"].includes(String((r.record as { status?: string }).status));

  const step = (job: string, inputs?: { file: string; sha256: string }[]): LaunchResult => {
    const f = REUSE && mode === "live" ? reusable(job, inputs) : undefined;
    if (!f) return done(job, launch(job, mode));
    log.push({ job, exit: 0, status: "reused", run_file: relative(SOLUTION, f) });
    return { exit: 0, run_file: f, record: JSON.parse(readFileSync(f, "utf8")).drafting_run };
  };
  const maps = FIELD_MAP_JOBS.map((j) => step(j));
  const mapDrafts = maps.filter(ok).map((r) => asInput(r.run_file!));
  if (upto < 1 || mapDrafts.length !== FIELD_MAP_JOBS.length) return { log, stopped: upto < 1 ? "as asked" : "a field map did not complete" };

  writeJob("c1-requirements", "requirements", "requirements.v1.md", "requirements-output.v1.schema.json",
    [...TEXTS.map((f) => ({ file: f, sha256: sha(join(SOLUTION, f)) })), ...mapDrafts], 64_000);
  const req = step("c1-requirements", JSON.parse(readFileSync(join(JOBS_DIR, "c1-requirements.json"), "utf8")).inputs);
  if (upto < 2 || !ok(req)) return { log, stopped: upto < 2 ? "as asked" : "requirements did not complete" };

  writeJob("c1-sections", "sections", "sections.v1.md", "sections-output.v1.schema.json", [...mapDrafts, asInput(req.run_file!)], 64_000);
  const sec = step("c1-sections", JSON.parse(readFileSync(join(JOBS_DIR, "c1-sections.json"), "utf8")).inputs);
  if (upto < 3 || !ok(sec)) return { log, stopped: upto < 3 ? "as asked" : "sections did not complete" };

  writeJob("c1-checks", "checks", "checks.v1.md", "checks-output.v1.schema.json",
    [...TEXTS.slice(0, 3).map((f) => ({ file: f, sha256: sha(join(SOLUTION, f)) })), ...mapDrafts, asInput(req.run_file!), asInput(sec.run_file!)], 64_000);
  const chk = step("c1-checks", JSON.parse(readFileSync(join(JOBS_DIR, "c1-checks.json"), "utf8")).inputs);
  if (upto < 4 || !ok(chk)) return { log, stopped: upto < 4 ? "as asked" : "checks did not complete" };

  // v2 assembler (P2-M2): a pipeline run never overwrites the v1 configurations kept as evidence.
  const config = assemble(`${mode}-r2`, [...maps, req, sec, chk].map((r) => r.run_file!), { review: join(PROTOTYPE, "p2", "field-review.c1.json"), repairs: join(PROTOTYPE, "p2", "repairs.c1.json") });
  return { log, config: relative(SOLUTION, config.file), config_contract_valid: config.valid, config_errors: config.errors };
}

if (import.meta.main) {
  const mode = process.argv.includes("--live") ? "live" : process.argv.includes("--stub") ? "stub" : null;
  const i = process.argv.indexOf("--through");
  const through = (i > 0 ? process.argv[i + 1] : "assemble") as Stage;
  if (!mode || !STAGES.includes(through)) { console.log("usage: pipeline.ts (--stub | --live) [--through field_maps|requirements|sections|checks|assemble]"); process.exit(2); }
  const r = runPipeline(mode, through);
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.log.every((l) => l.exit === 0) ? 0 : 1);
}
void PROTOTYPE;
