// The P2 drafting runner core. Every drafting call goes through runDrafting(): the route and every input
// are admitted by the guard, each attempt (first try or retry) reserves its worst case in the experiment
// ledger before the call, and the SDK's own retries are switched off so no attempt escapes the ledger.
// The output is labelled per AIW-D260.
//
// Enforcement of the launch path (P1 revision 4, answers P1R2-M2): a PAID caller (sdkCaller) can only be
// made inside an isolated drafting process whose entry script is p2/draft.ts (assertIsolated), and
// runDrafting refuses a paid caller with any ledger other than the one experiment ledger at its fixed cap.
// draft.ts is started by p2/launch.ts, which screens the maker-written prompt template first and passes its
// hash; since R4-M1 draft.ts also screens everything it sends itself and checks the live stub gate, and a
// paid call here refuses a request that was not screened; draft.ts builds the prompt with the one fixed builder (prompt.ts). Plain library use
// with a stub caller and an injected ledger stays possible for unit tests; it cannot spend money.
import Anthropic from "@anthropic-ai/sdk";
import { join } from "node:path";
import { admitRun, loadKey, PolicyRefusal, type AdmitOptions, type RouteSettings } from "./guard.ts";
import { assertIsolated } from "./isolation.ts";
import { BudgetExceeded, costUsd, inputTokenBound, type SpendLedger } from "./ledger.ts";
import { BASE_URL, EXPERIMENT_CAP_USD, LABEL, LEDGER_DIR, MAX_REQUEST_BYTES, MAX_RETRY_AFTER_S } from "./policy.ts";

export type DraftRequest = { system: string; user: string; output_schema?: Record<string, unknown> };
export type CallResult = { text: string; stop_reason?: string | null; usage: { input_tokens: number; output_tokens: number } };
export type CallSettings = RouteSettings & { timeout_ms: number; effort?: string };
export type Caller = ((req: DraftRequest, s: CallSettings) => Promise<CallResult>) & { kind?: "stub" | "paid" };
export type Attempt = { n: number; outcome: string; error?: string; request_id?: string; cost_usd?: number; worst_usd: number; stop_reason?: string | null; input_tokens?: number; output_tokens?: number; duration_ms?: number };

export type RunOutcome = {
  status: "completed" | "provider_error" | "budget_exceeded" | "refused" | "timed_out";
  label: string;
  caller: string;
  admitted: { file: string; sha256: string; kind: string }[];
  attempts: Attempt[];
  text?: string;
};

export const CANONICAL_LEDGER_FILE = join(LEDGER_DIR, "spend.jsonl");

export async function runDrafting(
  run: { run_id: string; inputs: { official_files: { file: string; sha256: string }[] }; settings: CallSettings },
  build: (admitted: ReturnType<typeof admitRun>) => DraftRequest,
  call: Caller,
  ledger: SpendLedger,
  opts: AdmitOptions & { screened?: () => boolean; override?: { id: string; runKey: string } } = {},
): Promise<RunOutcome> {
  if (call.kind === "paid") {
    assertIsolated();
    if (ledger.file !== CANONICAL_LEDGER_FILE || ledger.capUsd !== EXPERIMENT_CAP_USD) {
      throw new PolicyRefusal(`a paid call must use the experiment ledger ${CANONICAL_LEDGER_FILE} at US$${EXPERIMENT_CAP_USD}`);
    }
  }
  const admitted = admitRun(run, call.kind === "paid" ? {} : opts); // throws PolicyRefusal before any prompt exists; paid calls never take stub drafts
  const req = build(admitted);
  // R4-M1: a paid call goes ahead only when the caller's build step screened the finished request (draft.ts).
  if (call.kind === "paid" && !(opts.screened && opts.screened())) throw new PolicyRefusal("a paid call needs a request screened inside the drafting process (R4-M1)");
  // Lead 29 Oct (G5): a request above the step size cap is refused before any reservation or call (US$0).
  const requestBytes = Buffer.byteLength(JSON.stringify(req), "utf8");
  if (requestBytes > MAX_REQUEST_BYTES) {
    return { status: "refused", label: LABEL, caller: call.kind ?? "unmarked", admitted: admitted.map(({ file, sha256, kind }) => ({ file, sha256, kind })),
      attempts: [{ n: 1, outcome: "refused_input_too_large", error: `request of ${requestBytes} bytes is above the cap of ${MAX_REQUEST_BYTES}`, cost_usd: 0, worst_usd: 0 }] };
  }
  const worst = costUsd(run.settings.model, inputTokenBound(JSON.stringify(req)), run.settings.max_output_tokens);
  const out: RunOutcome = { status: "provider_error", label: LABEL, caller: call.kind ?? "unmarked", admitted: admitted.map(({ file, sha256, kind }) => ({ file, sha256, kind })), attempts: [] };
  return ledger.withLock(async () => {
    for (let n = 1; n <= run.settings.max_attempts; n++) {
      let id: string;
      try { id = ledger.reserve(run.run_id, n, worst, run.settings.budget_usd, call.kind ?? "unmarked", opts.override ? { overrideId: opts.override.id, runKey: opts.override.runKey } : {}); } catch (e) {
        if (!(e instanceof BudgetExceeded)) throw e;
        out.status = "budget_exceeded"; out.attempts.push({ n, outcome: "refused_before_call", error: e.message, worst_usd: worst });
        return out;
      }
      const t0 = Date.now();
      // Break 3 m3 / PR #121 review: the call and its settle are separate steps. A settle that cannot be written (the
      // ledger busy) keeps the answer and leaves the reservation at its worst case; it never counts as a failed call, so
      // the model is never asked again for an answer already paid for.
      let r: Awaited<ReturnType<Caller>> | undefined, failure: unknown;
      try { r = await call(req, run.settings); } catch (e) { failure = e; }
      if (r) {
        const c = costUsd(run.settings.model, r.usage.input_tokens, r.usage.output_tokens);
        const notSettled = ledger.settleOrKeep(id, c, r.stop_reason === "end_turn" || r.stop_reason === undefined ? "ok" : `ok_stop_${r.stop_reason}`);
        out.attempts.push({ n, outcome: "ok", cost_usd: c, worst_usd: worst, stop_reason: r.stop_reason, input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens, duration_ms: Date.now() - t0, ...(notSettled ? { settle_error: `counted at its worst case: ${notSettled}` } : {}) });
        out.status = "completed"; out.text = r.text;
        return out;
      }
      {
        const e = failure;
        // QA-86: a call the service refused (4xx other than 408, 409, 429: invalid, too large, usage limit) or was too busy to
        // take (429, 500, 502, 503, 529) processed nothing, so it settles at its true cost, US$0. Any other failure (a timeout,
        // a dropped connection): usage unknown, so the reservation stays counted at its worst case.
        const status = (e as { status?: number }).status;
        const refused = typeof status === "number" && status >= 400 && status < 500 && ![408, 409, 429].includes(status);
        const busy = typeof status === "number" && [429, 500, 502, 503, 529].includes(status);
        const timedOut = status === 408 || (status === undefined && /time(d)?\s*-?\s*out/i.test(`${(e as Error).name} ${(e as Error).message}`));
        const requestId = requestIdOf(e);
        ledger.settleOrKeep(id, refused || busy ? 0 : worst, refused ? "refused_by_provider_usd0" : busy ? "busy_usd0" : "error_counted_at_worst_case");
        out.attempts.push({ n, outcome: refused ? "refused_by_provider" : busy ? "busy" : timedOut ? "timed_out" : "error", error: (e as Error).message.slice(0, 300),
          ...(requestId ? { request_id: requestId } : {}), ...(refused || busy ? { cost_usd: 0 } : {}), worst_usd: worst, duration_ms: Date.now() - t0 });
        if (timedOut) out.status = "timed_out";
        // A refused request fails the same way on retry (D17): no second attempt.
        if (refused) break;
        // QA-87: a busy service is retried only after the wait it names, never at once; no wait named, or too long: stop.
        if (busy) {
          const wait = retryAfterSeconds(e);
          if (wait === null || wait > MAX_RETRY_AFTER_S || n >= run.settings.max_attempts) break;
          await new Promise((res) => setTimeout(res, wait * 1000));
        }
      }
    }
    return out;
  });
}

/** QA-88: the service's request id, for the Details a person can open (never in the main sentence). */
function requestIdOf(e: unknown): string | null {
  const x = e as { request_id?: string; requestID?: string; message?: string; headers?: unknown };
  const fromHeaders = headerOf(x.headers, "request-id");
  return x.request_id ?? x.requestID ?? fromHeaders ?? /"request_id"\s*:\s*"([^"]+)"/.exec(String(x.message ?? ""))?.[1] ?? null;
}
/** QA-87: the seconds a busy service asks us to wait (retry-after), or null when it names none. */
function retryAfterSeconds(e: unknown): number | null {
  const v = headerOf((e as { headers?: unknown }).headers, "retry-after");
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function headerOf(headers: unknown, name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as { get?: unknown }).get === "function") return (headers as { get: (k: string) => string | null }).get(name);
  const v = (headers as Record<string, unknown>)[name];
  return typeof v === "string" || typeof v === "number" ? String(v) : null;
}

/** The real call: Anthropic API only (AIW-D261), explicit base URL, SDK retries off, streamed, structured
 *  output when the request names a schema. Refuses outside the isolated drafting process. No server-side
 *  model fallback: the experiment fixes one model and one price, so a refusal is recorded, not rerouted. */
export function sdkCaller(): Caller {
  assertIsolated();
  const client = new Anthropic({ apiKey: loadKey(), baseURL: BASE_URL, maxRetries: 0 });
  const caller: Caller = async (req, s) => {
    const msg = await client.messages
      .stream({
        model: s.model, max_tokens: s.max_output_tokens, system: req.system,
        thinking: { type: "adaptive" },
        output_config: {
          ...(s.effort ? { effort: s.effort as "high" } : {}),
          ...(req.output_schema ? { format: { type: "json_schema" as const, schema: req.output_schema } } : {}),
        },
        messages: [{ role: "user", content: req.user }],
      }, { timeout: s.timeout_ms })
      .finalMessage();
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return { text, stop_reason: msg.stop_reason, usage: { input_tokens: msg.usage.input_tokens, output_tokens: msg.usage.output_tokens } };
  };
  caller.kind = "paid";
  return caller;
}
