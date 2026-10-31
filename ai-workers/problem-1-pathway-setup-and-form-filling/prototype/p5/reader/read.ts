// The reader process (AIW-D271). Started by p5/reader/launch.ts under the Node permission model (readerNodeArgs);
// refuses to run without that isolation. It cannot read the answer keys, the family values or the case store. It
// uses the launcher's single-use ticket, screens every maker-written text part it sends (never the image bytes)
// against the salted digest, checks the live stub gate itself, admits each document against the synthetic
// allowlist, reserves each attempt's worst case in the one experiment ledger, and calls the Anthropic API with
// structured output. It prints one JSON line; the launcher writes the run records.
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadKey, PolicyRefusal } from "../../p2/guard.ts";
import { BudgetExceeded, costUsd, SpendLedger } from "../../p2/ledger.ts";
import { loadDigest, screenWithDigest, useTicket } from "../../p2/screen.ts";
import { admitDoc, docTokenBound } from "./guard.ts";
import { assertReaderIsolated } from "./isolation.ts";
import { hasReaderStubPass } from "./pathcode.ts";
import { BASE_URL, DOC_TYPES, EXPERIMENT_CAP_USD, LEDGER_DIR, MAX_ATTEMPTS, MODELS, PRICE_PER_MTOK, READER, READER_DIGEST_FILE, READER_JOBS, READER_PROMPTS, READER_ROUTE_ID, READER_USED_TICKETS, RUN_CAP_USD } from "./policy.ts";
import { buildReaderRequest, readerRequestSha, type ReaderJob, type ReaderRequest } from "./request.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const NAME = /^[a-z0-9][a-z0-9._-]*$/;

type Call = (req: ReaderRequest, s: ReaderJob["settings"]) => Promise<{ text: string; stop_reason: string | null; usage: { input_tokens: number; output_tokens: number } }>;

function stubCall(): Call & { calls: number } {
  const text = readFileSync(join(READER, "stubs", "reader.json"), "utf8");
  const c = (async () => { c.calls++; return { text, stop_reason: "end_turn", usage: { input_tokens: 0, output_tokens: 0 } }; }) as unknown as Call & { calls: number };
  c.calls = 0; return c;
}

function paidCall(): Call {
  assertReaderIsolated();
  const client = new Anthropic({ apiKey: loadKey(), baseURL: BASE_URL, maxRetries: 0 });
  return async (req, s) => {
    const msg = await client.messages.stream({
      model: s.model, max_tokens: s.max_output_tokens, thinking: { type: "adaptive" },
      output_config: { effort: s.effort as "high", format: { type: "json_schema", schema: req.output_schema } },
      messages: [{ role: "user", content: req.content }],
    }, { timeout: s.timeout_ms }).finalMessage();
    return { text: msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""), stop_reason: msg.stop_reason, usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens } };
  };
}

try {
  const isolation = assertReaderIsolated();
  const jobId = arg("job") ?? "", runId = arg("run-id") ?? "", mode = arg("caller");
  if (!NAME.test(jobId) || !NAME.test(runId)) throw new PolicyRefusal("job id and run id must be plain names");
  if (mode !== "stub" && mode !== "live") throw new PolicyRefusal("--caller must be stub or live");
  const job = JSON.parse(readFileSync(join(READER_JOBS, `${jobId}.json`), "utf8")) as ReaderJob;
  if (job.job_id !== jobId || !NAME.test(job.template) || !NAME.test(job.output_schema)) throw new PolicyRefusal("job file is malformed");
  const s = job.settings;
  if (s.provider_route !== READER_ROUTE_ID) throw new PolicyRefusal("not the AIW-D271 reader route");
  if (!(MODELS as readonly string[]).includes(s.model) || !PRICE_PER_MTOK[s.model]) throw new PolicyRefusal(`model ${s.model} is not approved`);
  if (!(s.budget_usd > 0 && s.budget_usd <= RUN_CAP_USD) || !(s.max_attempts >= 1 && s.max_attempts <= MAX_ATTEMPTS)) throw new PolicyRefusal("budget or attempts outside the caps");
  const template = readFileSync(join(READER_PROMPTS, job.template)), schemaBytes = readFileSync(join(READER_PROMPTS, job.output_schema)), docTypesBytes = readFileSync(DOC_TYPES);
  if (sha(template) !== arg("template-sha") || sha(schemaBytes) !== arg("schema-sha")) throw new PolicyRefusal("template or schema differs from the text the launcher screened");
  const { digest, sha256: digestSha } = loadDigest(READER_DIGEST_FILE);
  const ticket = useTicket(digest, { run_id: runId, job_id: jobId, mode, template_sha256: sha(template), schema_sha256: sha(schemaBytes) }, READER_USED_TICKETS);
  const maker = [{ name: "template", text: template.toString("utf8") }, { name: "output schema", text: schemaBytes.toString("utf8") }, { name: "document-type profiles", text: docTypesBytes.toString("utf8") }];
  screenWithDigest(digest, maker);
  if (mode === "live" && !hasReaderStubPass(job, digest.sources).ok) throw new PolicyRefusal("no reader stub pass of this exact path against the current screening sources (checked inside the reader process)");
  const schema = JSON.parse(schemaBytes.toString("utf8")), docTypes = JSON.parse(docTypesBytes.toString("utf8"));
  const call = mode === "stub" ? stubCall() : paidCall();
  const ledger = new SpendLedger(LEDGER_DIR);
  if (ledger.capUsd !== EXPERIMENT_CAP_USD) throw new PolicyRefusal("not the experiment ledger cap");
  const runKey = `reader-${runId}`;
  const results = await ledger.withLock(async () => {
    const out: any[] = [];
    for (const t of job.trials) {
      const doc = admitDoc(t.file, t.sha256);
      const req = buildReaderRequest(template.toString("utf8"), schema, docTypes, t.claimed_type, doc);
      // The finished request's text, as it will be sent: no key, scenario or family value (the image bytes are the
      // document itself and are not screened as text).
      screenWithDigest(digest, [{ name: `request text for ${t.id}`, text: req.text }]);
      const inBound = docTokenBound(doc) + Buffer.byteLength(req.text, "utf8") + Buffer.byteLength(JSON.stringify(schema), "utf8") + 2_000;
      const worst = costUsd(s.model, inBound, s.max_output_tokens);
      const r: any = { trial: t.id, file: t.file, sha256: doc.sha256, claimed_type: t.claimed_type, request_sha256: readerRequestSha(req), input_token_bound: inBound, worst_usd: worst, attempts: [] };
      for (let n = 1; n <= s.max_attempts; n++) {
        let id: string;
        try { id = ledger.reserve(runKey, n, worst, s.budget_usd, mode); } catch (e) {
          if (!(e instanceof BudgetExceeded)) throw e;
          r.attempts.push({ n, outcome: "refused_before_call", error: e.message }); break;
        }
        const t0 = Date.now();
        // PR #121 review (as p2/runner.ts): the call and its settle are separate steps; a settle that cannot be written
        // keeps the answer, leaves the reservation at its worst case and never calls the model again.
        let res: any, failure: unknown; // eslint-disable-line @typescript-eslint/no-explicit-any -- the reader's caller answer, as below
        try { res = await call(req, s); } catch (e) { failure = e; }
        if (res) {
          const c = costUsd(s.model, res.usage.input_tokens, res.usage.output_tokens);
          const notSettled = ledger.settleOrKeep(id, c, res.stop_reason === "end_turn" ? "ok" : `ok_stop_${res.stop_reason}`);
          r.attempts.push({ n, outcome: "ok", stop_reason: res.stop_reason, cost_usd: c, input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens, duration_ms: Date.now() - t0, ...(notSettled ? { settle_error: `counted at its worst case: ${notSettled}` } : {}) });
          r.text = res.text; break;
        }
        {
          const e = failure;
          ledger.settleOrKeep(id, worst, "error_counted_at_worst_case");
          r.attempts.push({ n, outcome: "error", error: (e as Error).message.slice(0, 300), duration_ms: Date.now() - t0 });
          const st = (e as { status?: number }).status;
          // An account-level refusal (key, permission, the account's own usage limit) fails every later call the same
          // way: stop the run (found on the first live run, 21 Oct: ten identical "usage limits" refusals).
          if (st === 401 || st === 403 || /usage limit/i.test((e as Error).message)) r.abort_run = true;
          if (typeof st === "number" && st >= 400 && st < 500 && ![408, 409, 429].includes(st)) break;
        }
      }
      out.push(r);
      if (r.abort_run) break;
    }
    return out;
  });
  console.log(JSON.stringify({ ok: true, isolation, screening: { digest_sha256: digestSha, ticket_nonce: ticket.nonce, digest_sources: digest.sources, stub_gate_checked: mode === "live" }, stub_calls: mode === "stub" ? (call as any).calls : null, ledger: { file: ledger.file, cap_usd: ledger.capUsd, committed_usd: ledger.committed() }, results }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, refused: e instanceof PolicyRefusal, error: (e as Error).message.slice(0, 500) }));
  process.exit(2);
}
