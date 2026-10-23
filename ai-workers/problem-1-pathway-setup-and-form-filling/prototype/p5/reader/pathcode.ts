// The code that decides what a reader call sends and where it may spend. A live reader run needs a stub pass of
// exactly this code, job settings, template, schema and profiles, against the current screening sources.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DOC_TYPES, READER, READER_JOBS, READER_PROMPTS } from "./policy.ts";
import type { ReaderJob } from "./request.ts";

export const READER_PATH_CODE = ["launch.ts", "read.ts", "guard.ts", "isolation.ts", "policy.ts", "request.ts", "pathcode.ts"];
const P2_SHARED = ["ledger.ts", "screen.ts", "guard.ts", "policy.ts"];

export function readerPathSha(job: ReaderJob): string {
  const h = createHash("sha256");
  for (const f of READER_PATH_CODE) h.update(f).update(readFileSync(join(READER, f)));
  for (const f of P2_SHARED) h.update(`p2/${f}`).update(readFileSync(join(READER, "..", "..", "p2", f)));
  const { trials: _t, ...rest } = JSON.parse(readFileSync(join(READER_JOBS, `${job.job_id}.json`), "utf8"));
  h.update("job").update(JSON.stringify(rest));
  h.update("template").update(readFileSync(join(READER_PROMPTS, job.template)));
  h.update("schema").update(readFileSync(join(READER_PROMPTS, job.output_schema)));
  h.update("doc-types").update(readFileSync(DOC_TYPES));
  return h.digest("hex");
}

export const readerStubPassFile = (jobId: string) => join(READER, "stub-pass", `${jobId}.json`);

export function hasReaderStubPass(job: ReaderJob, sources: { file: string; sha256: string }[]): { ok: boolean; code_sha256: string } {
  const code = readerPathSha(job), f = readerStubPassFile(job.job_id);
  const pass = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  return { ok: !!pass && pass.path_code_sha256 === code && pass.job_id === job.job_id && JSON.stringify(pass.screening_sources) === JSON.stringify(sources), code_sha256: code };
}
