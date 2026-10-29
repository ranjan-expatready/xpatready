// QA-86, QA-87, QA-88 (qa explore ai-paths, 29 Oct; qa's check part C, reused): every provider error shape through the real
// runner (p2/runner.ts) with a stub caller and a scratch ledger, then the words a person reads (engine/ai-run.ts explainRun).
// A call the service refused or was too busy to take processed nothing: it settles at US$0; a busy service is retried only
// after the wait it names; a timeout keeps its worst case; the person reads plain words, the request id sits under Details.
// No server, no network, no key, NO model call (US$0).
//   C11.8 refused or busy calls cost US$0 and say what happened · C11.14 no provider JSON or codes in the main sentence
//   cd prototype/studio && npx tsx tests/check_forms_ai_errors.ts
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDrafting } from "../../p2/runner.ts";
import { SpendLedger } from "../../p2/ledger.ts";
import { MAX_RETRY_AFTER_S } from "../../p2/policy.ts";
import { explainRun } from "../engine/ai-run.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const PROTO = join(import.meta.dirname, "..", "..");
const FILE = "prototype/p1/inventory/application-forms-guides.text.inventory.json";
const INPUT = { file: FILE, sha256: createHash("sha256").update(readFileSync(join(PROTO, "..", FILE))).digest("hex") };
const scratch = mkdtempSync(join(tmpdir(), "forms-ai-errors-"));
const settings = (max: number) => ({ provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: "claude-opus-5-5", effort: "low", timeout_ms: 300000, max_attempts: 2, budget_usd: 5, max_output_tokens: max });
const providerError = (status: number | undefined, type: string, message: string, headers: Record<string, string> = {}) =>
  Object.assign(new Error(status ? `${status} ${JSON.stringify({ type: "error", error: { type, message }, request_id: "req_qa_1" })}` : message), { ...(status ? { status } : {}), headers, name: status ? "APIError" : "APIConnectionTimeoutError" });

async function replay(name: string, thrown: Error, userBytes = 33_000, max = 3000) {
  const dir = join(scratch, name.replace(/\W+/g, "-")); mkdirSync(dir, { recursive: true });
  const ledger = new SpendLedger(dir, 100);
  let calls = 0; const caller = Object.assign(async () => { calls++; throw thrown; }, { kind: "stub" as const });
  const o = await runDrafting({ run_id: `qa-${name.replace(/\W+/g, "-")}`, inputs: { official_files: [INPUT] }, settings: settings(max) }, () => ({ system: "s".repeat(4000), user: "u".repeat(userBytes) }), caller, ledger, { allowStubDrafts: true } as never);
  const said = explainRun({ caller: "live", drafting_run: { status: o.status, attempts: o.attempts, usage: { cost_usd: ledger.committed() } } } as never);
  return { calls, status: o.status as string, counted: ledger.committed(), message: said.message, details: said.details ?? "" };
}
const raw = /\{"type":"error"|invalid_request_error|request_too_large|overloaded_error|rate_limit_error|provider_error|\b(400|413|429|529)\b/;

(async () => {
  for (const [name, e, words] of [
    ["400 unsupported schema keyword", providerError(400, "invalid_request_error", "output_config.format.schema: For 'array' type, property 'maxItems' is not supported"), /refused the request \(our setup error\)/],
    ["400 prompt too long", providerError(400, "invalid_request_error", "prompt is too long: 1200000 tokens > 1000000 maximum"), /too large for the AI service/],
    ["413 request too large", providerError(413, "request_too_large", "Request exceeds the maximum allowed number of bytes."), /too large for the AI service/],
  ] as const) {
    const r = await replay(name, e);
    ok(`QA-86 ${name}: the service processed nothing, so the ledger counts US$0 and it is not retried`, r.counted === 0 && r.calls === 1, r);
    ok(`QA-88 ${name}: the person reads plain words, not the service's JSON or codes`, words.test(r.message) && !raw.test(r.message), r.message);
    ok(`QA-88 ${name}: the request id sits under Details`, /Request req_qa_1/.test(r.details), r.details);
  }
  const r529 = await replay("529 overloaded on a 100 KB finder request", providerError(529, "overloaded_error", "Overloaded"), 100_000, 10_000);
  ok("QA-87 fail: a busy service with no named wait is not retried at once; nothing is counted; never \"over the spending cap\"", r529.calls === 1 && r529.counted === 0 && r529.status !== "budget_exceeded" && !/spending cap/.test(r529.message), r529);
  ok("QA-88: busy says so plainly", /AI service was busy, so nothing was drafted or charged/.test(r529.message) && !raw.test(r529.message), r529.message);
  const r429 = await replay("429 with a short named wait", providerError(429, "rate_limit_error", "rate limit", { "retry-after": "0" }));
  ok("QA-87 pass: a busy service that names a short wait is retried after it, and both calls cost US$0", r429.calls === 2 && r429.counted === 0, r429);
  const rLong = await replay("429 with a long named wait", providerError(429, "rate_limit_error", "rate limit", { "retry-after": String(MAX_RETRY_AFTER_S + 60) }));
  ok("QA-87 fail: a wait longer than the policy allows is not waited out (the person tries later)", rLong.calls === 1 && rLong.counted === 0, rLong);
  const rTime = await replay("timeout", providerError(undefined, "", "Request timed out."));
  ok("QA-86 fail: a timeout's usage is unknown, so it stays counted at its worst case", rTime.counted > 0 && rTime.status === "timed_out", rTime);
  ok("QA-88: a timeout says so plainly", /did not answer in time/.test(rTime.message) && !raw.test(rTime.message), rTime.message);
  const rDrop = await replay("connection dropped", Object.assign(new Error("socket hang up"), { name: "APIConnectionError" }));
  ok("QA-88: any other failure never shows the service's words in the main sentence (Details keeps them)", /did not complete the call/.test(rDrop.message) && !/socket hang up/.test(rDrop.message) && /socket hang up/.test(rDrop.details), rDrop);
  // Audit 29 Oct: an earlier attempt counted at its worst case is never hidden behind "nothing was charged".
  const mixed = (second: string) => explainRun({ caller: "live", drafting_run: { status: "provider_error", attempts: [{ n: 1, outcome: "error", error: "socket hang up" }, { n: 2, outcome: second, error: "529 overloaded" }], usage: { cost_usd: 0.43 } } } as never);
  ok("audit fail: a dropped call then a busy retry says the cost (US$0.43), not \"nothing was drafted or charged\"", !/nothing was drafted or charged/.test(mixed("busy").message) && /US\$0\.43/.test(mixed("busy").message) && /busy/.test(mixed("busy").message), mixed("busy").message);
  ok("audit fail: a dropped call then a refused retry says the cost (US$0.43)", !/or charged/.test(mixed("refused_by_provider").message) && /US\$0\.43/.test(mixed("refused_by_provider").message), mixed("refused_by_provider").message);
  ok("audit pass: a busy call with nothing counted still says \"nothing was drafted or charged\"", /nothing was drafted or charged/.test(r529.message), r529.message);
  const shape = explainRun({ caller: "live", drafting_run: { status: "invalid_output", attempts: [{ n: 1, outcome: "ok" }], usage: { cost_usd: 0.1 } }, output_errors: "/forms/0: must have required property 'quote'" } as never);
  ok("QA-88: an answer in the wrong shape is said plainly; the validator's words go under Details", /not in the agreed shape\. Nothing was applied/.test(shape.message) && !/required property/.test(shape.message) && /required property/.test(shape.details ?? ""), shape);
  rmSync(scratch, { recursive: true, force: true });
})().catch((e) => { fail++; console.log(`FAIL  the check stopped: ${(e as Error).stack}`); }).finally(() => {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
