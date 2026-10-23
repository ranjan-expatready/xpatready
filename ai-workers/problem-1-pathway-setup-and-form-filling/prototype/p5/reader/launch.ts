// The one trusted entry path for reader calls (AIW-D271).
//   node p5/reader/launch.ts --job <job id> --stub     the exact path with a stub caller: no network, no key, no spend
//   node p5/reader/launch.ts --job <job id> --live     paid calls; refused unless a stub pass of this exact path exists
// Before any request exists: every document is admitted against the synthetic allowlist; the template, schema and
// document-type profiles are screened in plain text against the reader key, the case scenario and the family
// values; a fresh salted digest is issued as a single-use ticket; then p5/reader/read.ts starts under the Node
// permission model. Afterwards the launcher validates each output against the schema and writes one run record.
import { Ajv } from "ajv";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadKey } from "../../p2/guard.ts";
import { buildDigest } from "../../p2/screen.ts";
import { admitDoc, PolicyRefusal, readerCanary, readerNodeArgs, screenText } from "./guard.ts";
import { hasReaderStubPass, readerStubPassFile } from "./pathcode.ts";
import { DOC_TYPES, LABEL, READ_ENTRY, READER_DIGEST_FILE, READER_JOBS, READER_PROMPTS, READER_RUNS, READER_SCREENING_DIR } from "./policy.ts";
import type { ReaderJob } from "./request.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const NAME = /^[a-z0-9][a-z0-9._-]*$/;

export function launchReader(jobId: string, mode: "stub" | "live"): { exit: number; run_file?: string; refused?: string; record?: any } {
  if (!NAME.test(jobId)) throw new PolicyRefusal("job id must be a plain name");
  const job = JSON.parse(readFileSync(join(READER_JOBS, `${jobId}.json`), "utf8")) as ReaderJob;
  if (job.job_id !== jobId) throw new PolicyRefusal("job file names a different job id");
  for (const t of job.trials) admitDoc(t.file, t.sha256); // (1) inputs: synthetic allowlist and hashes
  const template = readFileSync(join(READER_PROMPTS, job.template)), schema = readFileSync(join(READER_PROMPTS, job.output_schema)), docTypes = readFileSync(DOC_TYPES);
  const canary = readerCanary(); // (2) plain-text screen of everything maker-written
  screenText([{ name: "template", text: template.toString("utf8") }, { name: "output schema", text: schema.toString("utf8") }, { name: "document-type profiles", text: docTypes.toString("utf8") }, { name: "job file", text: JSON.stringify(job.settings) }], canary);
  const gate = hasReaderStubPass(job, canary.sources);
  if (mode === "live") { if (!gate.ok) throw new PolicyRefusal(`no reader stub pass of this exact path for ${jobId} against the current screening sources; run --stub first`); loadKey(); }
  const runId = `${jobId}-${mode}-${new Date().toISOString().replace(/[-:.]/g, "").toLowerCase()}`;
  const digest = buildDigest({ box_paths: canary.key_values, family_values: canary.family_values, sources: canary.sources }, { run_id: runId, job_id: jobId, mode, template_sha256: sha(template), schema_sha256: sha(schema) });
  const dBytes = JSON.stringify(digest) + "\n";
  mkdirSync(READER_SCREENING_DIR, { recursive: true });
  writeFileSync(READER_DIGEST_FILE, dBytes);
  const env: Record<string, string> = {};
  for (const k of ["PATH", "HOME", "TMPDIR", "LANG"]) if (process.env[k]) env[k] = process.env[k]!;
  const started = new Date().toISOString();
  const child = spawnSync(process.execPath, [...readerNodeArgs(), READ_ENTRY, "--job", jobId, "--run-id", runId, "--caller", mode, "--template-sha", sha(template), "--schema-sha", sha(schema)],
    { encoding: "utf8", env, timeout: job.settings.timeout_ms * job.settings.max_attempts * job.trials.length + 60_000, maxBuffer: 64 * 1024 * 1024 });
  let out: any;
  try { out = JSON.parse(child.stdout.trim().split("\n").pop() ?? ""); } catch { out = { ok: false, error: `no result from the reader process (exit ${child.status}): ${child.stderr.slice(0, 400)}` }; }
  if (!out.ok) return { exit: 2, refused: out.error };
  if (out.screening?.digest_sha256 !== sha(dBytes) || out.screening?.ticket_nonce !== digest.ticket.nonce) return { exit: 2, refused: "the reader process screened with a different digest" };
  if (JSON.stringify(readerCanary().sources) !== JSON.stringify(canary.sources)) return { exit: 2, refused: "screening sources changed during the run; result not recorded" };
  const validate = new Ajv({ allErrors: true, strict: false }).compile(JSON.parse(schema.toString("utf8")));
  const results = out.results.map((r: any) => {
    let parsed: any = null, errors: any = null;
    const last = r.attempts.at(-1);
    if (typeof r.text === "string") { try { parsed = JSON.parse(r.text); if (!validate(parsed)) errors = validate.errors; } catch (e) { errors = (e as Error).message; } }
    const status = !last || last.outcome !== "ok" ? "provider_error" : last.stop_reason === "refusal" ? "refused" : last.stop_reason === "max_tokens" ? "invalid_output" : errors ? "invalid_output" : "completed";
    return { ...r, status, output: errors ? null : parsed, output_errors: errors, output_sha256: typeof r.text === "string" ? sha(r.text) : null, text: undefined };
  });
  const usage = results.reduce((u: any, r: any) => { for (const a of r.attempts) { u.input_tokens += a.input_tokens ?? 0; u.output_tokens += a.output_tokens ?? 0; u.cost_usd += a.cost_usd ?? 0; u.duration_ms += a.duration_ms ?? 0; } return u; }, { input_tokens: 0, output_tokens: 0, cost_usd: 0, duration_ms: 0 });
  const record = { label: LABEL, run_id: runId, job_id: jobId, caller: mode, settings: job.settings, template_sha256: sha(template), schema_sha256: sha(schema), doc_types_sha256: sha(docTypes),
    path_code_sha256: gate.code_sha256, started_at: started, ended_at: new Date().toISOString(), usage, isolation: out.isolation, screening: out.screening, ledger: out.ledger, stub_calls: out.stub_calls, results };
  mkdirSync(READER_RUNS, { recursive: true });
  const runFile = join(READER_RUNS, `${runId}.json`);
  writeFileSync(runFile, JSON.stringify(record, null, 1) + "\n");
  if (mode === "stub" && out.isolation?.permission_model && results.every((r: any) => r.status === "completed")) {
    mkdirSync(join(readerStubPassFile(jobId), ".."), { recursive: true });
    writeFileSync(readerStubPassFile(jobId), JSON.stringify({ job_id: jobId, path_code_sha256: gate.code_sha256, screening_sources: canary.sources, run_id: runId, at: record.ended_at, stub_calls: out.stub_calls }, null, 1) + "\n");
  }
  return { exit: results.every((r: any) => r.status === "completed") ? 0 : 1, run_file: runFile, record };
}

if (import.meta.main) {
  const i = process.argv.indexOf("--job");
  const mode = process.argv.includes("--live") ? "live" : process.argv.includes("--stub") ? "stub" : null;
  try {
    if (i < 0 || !mode) throw new PolicyRefusal("usage: launch.ts --job <job id> (--stub | --live)");
    const r = launchReader(process.argv[i + 1], mode);
    console.log(JSON.stringify({ exit: r.exit, run_file: r.run_file, refused: r.refused, usage: r.record?.usage, statuses: r.record?.results.map((x: any) => `${x.trial}:${x.status}`) }));
    process.exit(r.exit);
  } catch (e) { console.log(JSON.stringify({ exit: 2, refused: (e as Error).message })); process.exit(2); }
}
