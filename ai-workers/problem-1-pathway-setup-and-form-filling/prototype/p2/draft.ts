// The drafting process. Started by p2/launch.ts with isolatedNodeArgs(LEDGER_DIR); refuses to run without
// that isolation. It reads the job, the template and schema (checking the hashes the launcher passed), and
// since R4-M1 does not trust those hashes as evidence of screening: it screens, itself, the template, the
// schema, every reused AI draft and the finished request against the launcher's salted digest (screen.ts),
// and for a live call it checks the stub pass of this exact launch path itself (pathcode.ts). Since R4-R2-M1
// the digest is a single-use launch ticket for this exact start, so stale screening is refused. Only then does
// it build the request with the one fixed builder and call through runDrafting with the one experiment
// ledger. It prints one JSON line for the launcher, which writes the run record. It writes nothing but the
// ledger folder: the spend ledger and the used-ticket markers (the permission model forbids anything else).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PolicyRefusal } from "./guard.ts";
import { assertIsolated } from "./isolation.ts";
import { SpendLedger } from "./ledger.ts";
import { JOBS_DIR, LEDGER_DIR, PROMPTS_DIR } from "./policy.ts";
import { hasStubPass } from "./pathcode.ts";
import { buildRequest, requestSha256, type Job } from "./prompt.ts";
import { admittedPublicText, jobScreenItems, loadDigest, screenWithDigest, useTicket } from "./screen.ts";
import { runDrafting, sdkCaller, type Caller, type DraftRequest } from "./runner.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const NAME = /^[a-z0-9][a-z0-9._-]*$/;

function stubCaller(kind: string): Caller & { calls: number } {
  const text = readFileSync(join(import.meta.dirname, "stubs", `${kind}.json`), "utf8");
  const c = (async () => { c.calls++; return { text, stop_reason: "end_turn", usage: { input_tokens: 0, output_tokens: 0 } }; }) as unknown as Caller & { calls: number };
  c.kind = "stub"; c.calls = 0;
  return c;
}

try {
  const isolation = assertIsolated(); // before reading anything else
  const jobId = arg("job") ?? "", runId = arg("run-id") ?? "", mode = arg("caller");
  if (!NAME.test(jobId) || !NAME.test(runId)) throw new PolicyRefusal("job id and run id must be plain names");
  if (mode !== "stub" && mode !== "live") throw new PolicyRefusal("--caller must be stub or live");
  const job = JSON.parse(readFileSync(join(JOBS_DIR, `${jobId}.json`), "utf8")) as Job;
  if (!NAME.test(job.template) || !NAME.test(job.output_schema)) throw new PolicyRefusal("template and schema must be plain file names in p2/prompts");
  const template = readFileSync(join(PROMPTS_DIR, job.template));
  const schemaBytes = readFileSync(join(PROMPTS_DIR, job.output_schema));
  // The launcher screened exactly these bytes; anything else is refused.
  if (sha(template) !== arg("template-sha") || sha(schemaBytes) !== arg("schema-sha")) throw new PolicyRefusal("template or schema differs from the text the launcher screened");
  if (job.job_id !== jobId) throw new PolicyRefusal("job file names a different job id");
  // R4-M1: the screen happens here, on the bytes this process will send, whoever started it.
  const { digest, sha256: digestSha } = loadDigest();
  // R4-R2-M1: and only with the screening that is current for this start: the digest must be the single-use
  // ticket the launcher issued for exactly this run, job, mode and bytes, within its lifetime. Used up here.
  const ticket = useTicket(digest, { run_id: runId, job_id: jobId, mode, template_sha256: sha(template), schema_sha256: sha(schemaBytes) });
  screenWithDigest(digest, jobScreenItems(job, template, schemaBytes));
  // R4-M1: the live gate is checked here too, not only by the launcher, against the ticket's current sources.
  if (mode === "live" && !hasStubPass(job, digest.sources).ok) throw new PolicyRefusal(`no stub pass of this exact launch path for ${jobId} against the current screening sources; a live call needs one (checked inside the drafting process)`);
  const promptSha = sha(Buffer.concat([template, schemaBytes]));
  const run = {
    run_id: runId,
    inputs: { official_files: job.inputs },
    settings: { ...(job.settings as object), prompt_version: job.template, prompt_sha256: promptSha } as never,
  };
  let req: DraftRequest | undefined;
  let requestScreened = false;
  const build = (admitted: Parameters<typeof buildRequest>[2]) => {
    req = buildRequest(template.toString("utf8"), JSON.parse(schemaBytes.toString("utf8")), admitted, job.known);
    // The finished request, as it will be sent: no family value beyond words printed on the admitted forms.
    screenWithDigest(digest, [{ name: "the finished request", text: JSON.stringify(req), familyValuesOnly: true, publicText: admittedPublicText(admitted) }]);
    requestScreened = true;
    return req;
  };
  const caller = mode === "stub" ? stubCaller(job.kind) : sdkCaller();
  const ledger = new SpendLedger(LEDGER_DIR); // the experiment ledger at EXPERIMENT_CAP_USD; never injected
  const outcome = await runDrafting(run, build, caller, ledger, { allowStubDrafts: mode === "stub", screened: () => requestScreened });
  console.log(JSON.stringify({
    ok: true, isolation, job_id: jobId, prompt_sha256: promptSha,
    screening: { digest_sha256: digestSha, digest_made_at: digest.made_at, digest_sources: digest.sources, ticket_nonce: ticket.nonce, ticket_expires_at: ticket.expires_at, items_screened: jobScreenItems(job, template, schemaBytes).length, request_screened: requestScreened, stub_gate_checked: mode === "live" },
    request_sha256: req ? requestSha256(req) : null, request_bytes: req ? Buffer.byteLength(JSON.stringify(req)) : null,
    stub_calls: mode === "stub" ? (caller as Caller & { calls: number }).calls : null,
    ledger: { file: ledger.file, cap_usd: ledger.capUsd, committed_usd: ledger.committed() },
    outcome,
  }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, refused: e instanceof PolicyRefusal, error: (e as Error).message.slice(0, 500) }));
  process.exit(2);
}
