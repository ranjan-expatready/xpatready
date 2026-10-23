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
import { BASE_URL, EXPERIMENT_CAP_USD, LABEL, LEDGER_DIR } from "./policy.ts";

export type DraftRequest = { system: string; user: string; output_schema?: Record<string, unknown> };
export type CallResult = { text: string; stop_reason?: string | null; usage: { input_tokens: number; output_tokens: number } };
export type CallSettings = RouteSettings & { timeout_ms: number; effort?: string };
export type Caller = ((req: DraftRequest, s: CallSettings) => Promise<CallResult>) & { kind?: "stub" | "paid" };
export type Attempt = { n: number; outcome: string; error?: string; cost_usd?: number; worst_usd: number; stop_reason?: string | null; input_tokens?: number; output_tokens?: number; duration_ms?: number };

export type RunOutcome = {
  status: "completed" | "provider_error" | "budget_exceeded";
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
  opts: AdmitOptions & { screened?: () => boolean } = {},
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
  const worst = costUsd(run.settings.model, inputTokenBound(JSON.stringify(req)), run.settings.max_output_tokens);
  const out: RunOutcome = { status: "provider_error", label: LABEL, caller: call.kind ?? "unmarked", admitted: admitted.map(({ file, sha256, kind }) => ({ file, sha256, kind })), attempts: [] };
  return ledger.withLock(async () => {
    for (let n = 1; n <= run.settings.max_attempts; n++) {
      let id: string;
      try { id = ledger.reserve(run.run_id, n, worst, run.settings.budget_usd, call.kind ?? "unmarked"); } catch (e) {
        if (!(e instanceof BudgetExceeded)) throw e;
        out.status = "budget_exceeded"; out.attempts.push({ n, outcome: "refused_before_call", error: e.message, worst_usd: worst });
        return out;
      }
      const t0 = Date.now();
      try {
        const r = await call(req, run.settings);
        const c = costUsd(run.settings.model, r.usage.input_tokens, r.usage.output_tokens);
        ledger.settle(id, c, r.stop_reason === "end_turn" || r.stop_reason === undefined ? "ok" : `ok_stop_${r.stop_reason}`);
        out.attempts.push({ n, outcome: "ok", cost_usd: c, worst_usd: worst, stop_reason: r.stop_reason, input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens, duration_ms: Date.now() - t0 });
        out.status = "completed"; out.text = r.text;
        return out;
      } catch (e) {
        // Usage unknown: the reservation stays counted at its worst case.
        ledger.settle(id, worst, "error_counted_at_worst_case");
        out.attempts.push({ n, outcome: "error", error: (e as Error).message.slice(0, 300), worst_usd: worst, duration_ms: Date.now() - t0 });
        // A request the API rejects as invalid (4xx other than 408, 409, 429) fails the same way on retry:
        // no second attempt (found on the first live chain, 20 Oct 2026, discovery D17).
        const status = (e as { status?: number }).status;
        if (typeof status === "number" && status >= 400 && status < 500 && ![408, 409, 429].includes(status)) break;
      }
    }
    return out;
  });
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
