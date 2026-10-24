// The code that decides what a drafting call sends and where it may spend. A live call needs a stub pass of
// exactly this code and job (checked by the launcher AND, since R4-M1, by the drafting process itself), made
// against the current screening sources (R4-R2-M1).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { JOBS_DIR, PROMPTS_DIR, PROTOTYPE, RUNS_DIR } from "./policy.ts";
import type { Job } from "./prompt.ts";

export const PATH_CODE = ["launch.ts", "draft.ts", "runner.ts", "guard.ts", "isolation.ts", "ledger.ts", "policy.ts", "prompt.ts", "convert.ts", "screen.ts", "pathcode.ts"];

export function pathCodeSha(job: Job): string {
  const h = createHash("sha256");
  for (const f of PATH_CODE) h.update(f).update(readFileSync(join(PROTOTYPE, "p2", f)));
  h.update("contracts/fact-key.ts").update(readFileSync(join(PROTOTYPE, "contracts", "fact-key.ts"))); // the naming rule convert.ts checks
  // F1 slice 2: the screen-inventory admission (guard.ts) recomputes the capture fingerprint with this code and contract.
  for (const f of ["portal-capture.ts", "portal-capture.v1.schema.json", "rules.ts"]) h.update(`contracts/${f}`).update(readFileSync(join(PROTOTYPE, "contracts", f)));
  // The job without its input list: the inputs are admitted afresh by the guard on every run (a chained job
  // names different parent drafts in stub and live mode), while kind, template, schema and settings must match.
  const { inputs: _inputs, ...rest } = JSON.parse(readFileSync(join(JOBS_DIR, `${job.job_id}.json`), "utf8"));
  h.update("job").update(JSON.stringify(rest));
  h.update("template").update(readFileSync(join(PROMPTS_DIR, job.template)));
  h.update("schema").update(readFileSync(join(PROMPTS_DIR, job.output_schema)));
  return h.digest("hex");
}

export const stubPassFile = (jobId: string) => join(RUNS_DIR, "stub-pass", `${jobId}.json`);

export type ScreeningSources = { file: string; sha256: string }[];
const sameSources = (a: unknown, b: ScreeningSources) => JSON.stringify(a) === JSON.stringify(b);

/** True when a stub pass of exactly this launch path and job is recorded, AND (R4-R2-M1) that stub pass was
 *  screened against the screening sources that are current now: every answer-key version and the family
 *  values, by file and hash. A changed key, a new key version or changed family values need a new stub pass.
 *  The launcher passes the sources it hashes itself; the drafting process, which may not read them, passes the
 *  sources of its single-use launch ticket, which the launcher hashed for this run. */
export function hasStubPass(job: Job, currentSources: ScreeningSources): { ok: boolean; code_sha256: string; sources_current: boolean } {
  const code = pathCodeSha(job);
  const f = stubPassFile(job.job_id);
  const pass = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  const sourcesCurrent = !!pass && sameSources(pass.screening_sources, currentSources);
  return { ok: !!pass && pass.path_code_sha256 === code && pass.job_id === job.job_id && sourcesCurrent, code_sha256: code, sources_current: sourcesCurrent };
}
