// The one trusted entry path for a P2 drafting call (P1 revision 4; answers P1R2-M2).
//
//   node p2/launch.ts --job <job id> --stub     demonstration through the exact path, no network, no key
//   node p2/launch.ts --job <job id> --live     paid call; refused unless a stub pass of the same code exists
//   … --approved-dir <folder>                   P-80: the Studio copy's approved-sources folder, for a form approved in
//                                               the product (the guard admits its inventory only from there)
//
// In order, before any prompt exists: (1) the job's route and every input are admitted by the guard;
// (2) the maker-written template and output schema are screened against the answer key and the family
// values (this launcher may read them; the drafting process never can); (3) the drafting process p2/draft.ts
// is started under the Node permission model (isolatedNodeArgs) with the hashes of the screened text, and it
// re-checks its own isolation, the hashes, and uses the one experiment ledger at its fixed cap. The launcher
// then validates the output against the contracts and writes the run record to p2/runs/.
import { Ajv } from "ajv";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { idempotencyKey } from "../contracts/rules.ts";
import { admitRun, assertNoLinksUnder, canaryStrings, isolatedNodeArgs, loadKey, PolicyRefusal, screenMakerText } from "./guard.ts";
import { approvedSourcesDirOk, DIGEST_FILE, DRAFT_ENTRY, JOBS_DIR, LABEL, LEDGER_DIR, PROMPTS_DIR, PROTOTYPE, RUNS_DIR, SCREENING_DIR, ticketFile, TICKETS_DIR } from "./policy.ts";
import { hasStubPass, pathCodeSha, stubPassFile } from "./pathcode.ts";
import { buildDigest, jobScreenItems, type Digest } from "./screen.ts";
import { convertFieldMap } from "./convert.ts";
import type { Job } from "./prompt.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const NAME = /^[a-z0-9][a-z0-9._-]*$/;
export { pathCodeSha }; // re-exported for existing callers; defined in pathcode.ts

/** The only known facts a job may carry: one printed edition (field-map jobs), or one combination trail (form-finder jobs). */
export function knownOk(known: Record<string, unknown>): boolean {
  const keys = Object.keys(known);
  if (keys.length !== 1) return false;
  if (keys[0] === "form_edition") return typeof known.form_edition === "string" && /^(IMM|IRM) [0-9A-Z ]+ \([0-9]{2}-[0-9]{4}\)$/.test(known.form_edition); // breaker m2: text only
  if (keys[0] === "combination_trail") return typeof known.combination_trail === "string" && /^[A-Za-z0-9][A-Za-z0-9 ,.()'\/&–-]{0,80}( › [A-Za-z0-9][A-Za-z0-9 ,.()'\/&–-]{0,80}){1,5}$/.test(known.combination_trail);
  return false;
}

export type LaunchResult = { exit: number; run_file?: string; record?: Record<string, unknown>; refused?: string; child?: unknown };

/** R4-R2-M1: writes the salted screening digest as the single-use launch ticket for one run (screen.ts), from
 *  the screening strings the caller has just read. The only supported way to make a digest: launch() uses it
 *  immediately before starting the drafting process, and the checks use it to start that process directly. */
export function issueTicket(canary: ReturnType<typeof canaryStrings>, job: Job, mode: "stub" | "live", runId: string, template: Buffer, schema: Buffer): { digest: Digest; digestSha: string } {
  const digest = buildDigest(canary, { run_id: runId, job_id: job.job_id, mode, template_sha256: sha(template), schema_sha256: sha(schema) });
  const bytes = JSON.stringify(digest) + "\n";
  mkdirSync(SCREENING_DIR, { recursive: true }); mkdirSync(TICKETS_DIR, { recursive: true });
  writeFileSync(ticketFile(runId), bytes); // the one this run's drafting process reads
  writeFileSync(DIGEST_FILE, bytes); // the latest, kept as evidence of what the screen looks like
  return { digest, digestSha: sha(bytes) };
}

/** P-179: an override id and run key are plain words (letters, digits, - _ : , .), so they pass to the drafting process as
 *  arguments and nothing else. */
const OVERRIDE_WORD = /^[A-Za-z0-9_:,.-]{1,300}$/;
export function launch(jobId: string, mode: "stub" | "live", opts: { approvedDir?: string; override?: { id: string; runKey: string } } = {}): LaunchResult {
  if (!NAME.test(jobId)) throw new PolicyRefusal("job id must be a plain name");
  const approvedDir = opts.approvedDir;
  if (approvedDir !== undefined && !approvedSourcesDirOk(approvedDir)) throw new PolicyRefusal(`--approved-dir must be a Studio copy's approved-sources folder: ${approvedDir}`);
  const override = opts.override;
  if (override && !(OVERRIDE_WORD.test(override.id) && OVERRIDE_WORD.test(override.runKey))) throw new PolicyRefusal("--override-id and --run-key must be plain words (letters, digits, - _ : , .)");
  const job = JSON.parse(readFileSync(join(JOBS_DIR, `${jobId}.json`), "utf8")) as Job;
  if (job.job_id !== jobId) throw new PolicyRefusal("job file names a different job id");
  if (!NAME.test(job.template) || !NAME.test(job.output_schema)) throw new PolicyRefusal("template and schema must be plain file names in p2/prompts");
  // A6: a known fact goes into the prompt as given, so it must be exactly an edition label and nothing else; S4 adds the
  // form finder's combination trail (structure names joined by " › ", letters, digits and plain punctuation only).
  if (job.known && !knownOk(job.known)) throw new PolicyRefusal("a job's known facts may hold only a printed form edition such as IMM 0000 (MM-YYYY), or a form-finder job's combination trail of plain names joined by ›");
  const settings = job.settings as Parameters<typeof admitRun>[0]["settings"];
  const admitted = admitRun({ inputs: { official_files: job.inputs }, settings }, { allowStubDrafts: mode === "stub", approvedDir }); // (1) route and inputs
  // P-80: a form approved in the product is drafted with the edition its approval names, never another one the job claims.
  const approved = admitted.find((a) => a.approved)?.approved;
  if (approved && job.known?.form_edition !== approved.edition) throw new PolicyRefusal(`the job's printed edition (${job.known?.form_edition ?? "none"}) is not the edition approved in the product (${approved.edition})`);
  assertNoLinksUnder(join(PROTOTYPE, "p2")); // nothing the drafting process may read can lead elsewhere
  const template = readFileSync(join(PROMPTS_DIR, job.template));
  const schema = readFileSync(join(PROMPTS_DIR, job.output_schema));
  // (2) Plain-text screen of everything maker- or AI-written that goes into the prompt: template and schema
  // (box paths of every answer-key version and family values); each reused AI draft (AIW-D263; family values,
  // its forms' public text exempt, D16). One read of the screening sources serves the screen, the gate and the ticket.
  const canary = canaryStrings();
  for (const it of jobScreenItems(job, template, schema)) screenMakerText([{ name: it.name, text: it.text }], { familyValuesOnly: it.familyValuesOnly, publicText: it.publicText, canary });
  const gate = hasStubPass(job, canary.sources);
  const codeSha = gate.code_sha256;
  const passFile = stubPassFile(jobId);
  if (mode === "live") {
    if (!gate.ok) throw new PolicyRefusal(gate.sources_current || !existsSync(passFile)
      ? `no stub pass of this exact launch path for ${jobId}; run --stub first`
      : `no stub pass of this exact launch path for ${jobId} against the current screening sources (answer key or family values changed since the stub pass); run --stub first`);
    loadKey(); // refuses a missing or unsafe key file here, before the child starts; the value is discarded
  }
  // A random tail keeps two launches in the same millisecond apart (one run record and one ticket each; F1 slice 2).
  const runId = `${jobId}-${mode}-${new Date().toISOString().replace(/[-:.]/g, "").toLowerCase()}-${randomBytes(3).toString("hex")}`;
  // R4-M1 and R4-R2-M1: a fresh salted digest of the same strings, issued as the single-use ticket for this run
  // only, immediately before the drafting process starts. The process repeats the screen itself on the exact
  // bytes it sends (it can never read the plain strings) and refuses any other, older or used ticket.
  const { digest, digestSha } = issueTicket(canary, job, mode, runId, template, schema);
  mkdirSync(LEDGER_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  const env: Record<string, string> = {};
  for (const k of ["PATH", "HOME", "TMPDIR", "LANG"]) if (process.env[k]) env[k] = process.env[k]!; // no ANTHROPIC_* passes through
  env.P2_LEDGER_DIR = LEDGER_DIR; // QA-90: the drafting process reserves in this same ledger (it cannot look for the shared one)
  const timeout = Number(job.settings.timeout_ms ?? 600_000) * Number(job.settings.max_attempts ?? 1) + 60_000;
  const child = spawnSync(process.execPath, [...isolatedNodeArgs(LEDGER_DIR, approvedDir), DRAFT_ENTRY, "--job", jobId, "--run-id", runId, "--caller", mode,
    "--template-sha", sha(template), "--schema-sha", sha(schema), ...(approvedDir ? ["--approved-dir", approvedDir] : []), ...(override ? ["--override-id", override.id, "--run-key", override.runKey] : [])], { encoding: "utf8", env, timeout, maxBuffer: 64 * 1024 * 1024 }); // (3)
  rmSync(ticketFile(runId), { force: true }); // used or not, this run's ticket is done (its use is recorded in the ledger folder)
  const endedAt = new Date().toISOString();
  let out: Record<string, any>;
  try { out = JSON.parse(child.stdout.trim().split("\n").pop() ?? ""); } catch { out = { ok: false, error: `no result from the drafting process (exit ${child.status}): ${child.stderr.slice(0, 400)}` }; }
  if (!out.ok) return { exit: 2, refused: out.error, child: out };
  if (out.screening?.digest_sha256 !== digestSha || out.screening?.ticket_nonce !== digest.ticket.nonce) return { exit: 2, refused: "the drafting process screened with a different digest from the one this launch wrote", child: out };
  // R4-R2-M1: the screening sources must still be the ones this run was screened against when it ends.
  const after = canaryStrings().sources;
  if (JSON.stringify(after) !== JSON.stringify(canary.sources)) return { exit: 2, refused: "screening sources changed during the run (answer key or family values); its result is not recorded", child: out };

  // Validate the output and convert it to the portable contract (field-map-entry.v0 inside drafting-run.v0).
  const o = out.outcome;
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const s of ["field-map-entry", "drafting-run"]) ajv.addSchema(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", `${s}.v0.schema.json`), "utf8")));
  const outputValid = ajv.compile(JSON.parse(schema.toString("utf8")));
  let status: string = o.status, parsed: any = null, outputErrors: unknown = null, entries: any[] | undefined, conversion: unknown = null;
  if (o.status === "completed") {
    const last = o.attempts[o.attempts.length - 1];
    if (last?.stop_reason === "refusal") status = "refused";
    else if (last?.stop_reason === "max_tokens") { status = "invalid_output"; outputErrors = "stopped at max_tokens"; }
    else {
      try { parsed = JSON.parse(o.text); } catch (e) { outputErrors = `not JSON: ${(e as Error).message}`; }
      if (parsed && !outputValid(parsed)) outputErrors = outputValid.errors;
      if (outputErrors) status = "invalid_output";
      else if (job.kind !== "field_map") status = "completed";
      else {
        const c = convertFieldMap(parsed, job.inputs[0].file, approved?.edition);
        entries = c.entries; status = c.status; conversion = { weak_evidence: c.weak_evidence, edition_note: c.edition_note, needs_person: c.needs_person, set_aside_fields: c.set_aside_fields };
      }
    }
  }
  const usage = o.attempts.reduce((u: any, a: any) => ({ input_tokens: u.input_tokens + (a.input_tokens ?? 0), output_tokens: u.output_tokens + (a.output_tokens ?? 0), cost_usd: u.cost_usd + (a.cost_usd ?? a.worst_usd ?? 0), duration_ms: u.duration_ms + (a.duration_ms ?? 0) }), { input_tokens: 0, output_tokens: 0, cost_usd: 0, duration_ms: 0 });
  const inputs = { combination: job.combination, official_files: job.inputs, configuration_version: job.configuration_version };
  const runSettings = { ...job.settings, prompt_version: job.template, prompt_sha256: out.prompt_sha256 };
  const record: Record<string, unknown> = {
    run_id: runId, idempotency_key: idempotencyKey({ inputs, settings: runSettings } as never), contract_version: "drafting-run/v0", kind: job.kind,
    ...(typeof o.text === "string" ? { output_sha256: sha(Buffer.from(o.text, "utf8")) } : {}),
    inputs, settings: runSettings, status, attempts: o.attempts.map((a: any) => ({ n: a.n, outcome: a.outcome, ...(a.error ? { error: a.error } : {}), ...(a.request_id ? { request_id: a.request_id } : {}), ...(a.input_tokens !== undefined ? { input_tokens: a.input_tokens, output_tokens: a.output_tokens } : {}), ...(a.duration_ms !== undefined ? { duration_ms: a.duration_ms } : {}) })),
    usage, started_at: startedAt, ended_at: endedAt, ...(entries ? { entries } : {}),
  };
  const contract = ajv.getSchema("https://expatready.local/contracts/drafting-run.v0.json")!;
  const contractValid = contract(record) as boolean;
  const envelope = {
    label: LABEL, caller: mode, drafting_run: record,
    contract_valid: contractValid, contract_errors: contractValid ? null : contract.errors, output_errors: outputErrors, conversion,
    launch_evidence: { path_code_sha256: codeSha, template_sha256: sha(template), schema_file: job.output_schema, schema_sha256: sha(schema), known: job.known ?? null, screened: true,
      output_sha256: typeof o.text === "string" ? sha(Buffer.from(o.text, "utf8")) : null,
      isolation: out.isolation, request_sha256: out.request_sha256, request_bytes: out.request_bytes, stub_calls: out.stub_calls, ledger: out.ledger, admitted: o.admitted, screening: out.screening },
    raw_output: o.text ?? null,
  };
  mkdirSync(RUNS_DIR, { recursive: true });
  const runFile = join(RUNS_DIR, `${runId}.json`);
  writeFileSync(runFile, JSON.stringify(envelope, null, 1) + "\n");
  if (mode === "stub" && contractValid && out.isolation?.permission_model && o.status === "completed") {
    mkdirSync(join(RUNS_DIR, "stub-pass"), { recursive: true });
    writeFileSync(passFile, JSON.stringify({ job_id: jobId, path_code_sha256: codeSha, screening_sources: canary.sources, digest_sha256: digestSha, run_id: runId, at: endedAt, stub_calls: out.stub_calls }, null, 1) + "\n");
  }
  return { exit: contractValid ? 0 : 1, run_file: runFile, record, child: out };
}

if (import.meta.main) {
  const i = process.argv.indexOf("--job");
  const mode = process.argv.includes("--live") ? "live" : process.argv.includes("--stub") ? "stub" : null;
  const a = process.argv.indexOf("--approved-dir");
  const o = process.argv.indexOf("--override-id"), k = process.argv.indexOf("--run-key");
  try {
    if (i < 0 || !mode) throw new PolicyRefusal("usage: launch.ts --job <job id> (--stub | --live) [--approved-dir <folder>] [--override-id <id> --run-key <key>]");
    if ((o > 0) !== (k > 0)) throw new PolicyRefusal("--override-id and --run-key go together (P-179)");
    const r = launch(process.argv[i + 1], mode, { ...(a > 0 ? { approvedDir: process.argv[a + 1] ?? "" } : {}), ...(o > 0 ? { override: { id: process.argv[o + 1] ?? "", runKey: process.argv[k + 1] ?? "" } } : {}) });
    console.log(JSON.stringify({ exit: r.exit, run_file: r.run_file, refused: r.refused, status: (r.record as any)?.status }));
    process.exit(r.exit);
  } catch (e) {
    console.log(JSON.stringify({ exit: 2, refused: (e as Error).message }));
    process.exit(2);
  }
}
