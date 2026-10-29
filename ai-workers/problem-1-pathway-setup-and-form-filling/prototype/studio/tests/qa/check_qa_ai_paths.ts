// qa explore ai-paths (29 Oct 2026): what the stubs never test. Every AI step's request as the provider will judge it,
// and every provider error shape through the real runner. No server, no network, no key, US$0.
//   node studio/tests/qa/check_qa_ai_paths.ts            (Node 24, from prototype/; or tsx)
// A. each output schema against the provider's structured-output limits (platform.claude.com structured-outputs,
//    "JSON Schema limitations", read 29 Oct 2026): QA-83 (find-guide maxItems), QA-84 (who-can-be minimum/maximum)
// B. each job kind the Studio launches has the stub answer its stub pass needs: QA-85 (who_can_be)
// C. provider errors through p2/runner.ts with a scratch ledger: QA-86 (US$0 errors counted at worst case),
//    QA-87 (an overloaded retry reported as over the spending cap), QA-88 (provider JSON shown to the person)
// D. output headroom of the saved live runs (warning only)
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROTO = join(import.meta.dirname, "..", "..", "..");
const PROMPTS = join(PROTO, "p2", "prompts");
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && detail ? `\n     ${detail}` : ""}`); };

// ---- A. schemas
const UNSUPPORTED = ["maxItems", "maxLength", "minLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "uniqueItems", "minProperties", "maxProperties", "patternProperties", "if", "then", "else", "not", "oneOf", "contains", "propertyNames"];
const FORMATS = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]);
function lint(schema: unknown): string[] {
  const out: string[] = []; let optional = 0, unions = 0;
  const walk = (n: any, path: string) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach((x, i) => walk(x, `${path}[${i}]`));
    for (const k of UNSUPPORTED) if (k in n) out.push(`${path}: "${k}" is not supported`);
    if ("minItems" in n && ![0, 1].includes(n.minItems)) out.push(`${path}: minItems ${n.minItems} (only 0 or 1)`);
    if (n.format && !FORMATS.has(n.format)) out.push(`${path}: format "${n.format}" is not supported`);
    if (typeof n.pattern === "string" && /\(\?[=!<]|\\[bB]|\\[1-9]/.test(n.pattern)) out.push(`${path}: pattern uses lookaround, word boundary or a backreference`);
    if (typeof n.$ref === "string" && /^https?:/.test(n.$ref)) out.push(`${path}: external $ref`);
    if ((n.type === "object" || n.properties) && n.additionalProperties !== false) out.push(`${path}: an object needs additionalProperties: false`);
    if (n.properties) {
      const req = new Set(n.required ?? []);
      for (const [p, v] of Object.entries<any>(n.properties)) { if (!req.has(p)) optional++; if (v && (v.anyOf || Array.isArray(v.type))) unions++; walk(v, `${path}/properties/${p}`); }
    }
    for (const [k, v] of Object.entries(n)) if (k !== "properties" && typeof v === "object") walk(v, `${path}/${k}`);
  };
  walk(schema, "#");
  if (optional > 24) out.push(`${optional} optional properties (the provider allows 24)`);
  if (unions > 16) out.push(`${unions} properties with union types (the provider allows 16)`);
  return out;
}
// The schemas the Studio sends today (api/src/finder.ts AI_SETTINGS, people-ai.ts AI, sources.ts field maps).
const STUDIO_SCHEMAS: Record<string, string> = {
  "C11.15 find the application page (finder_guide)": "find-guide-output.v1.schema.json",
  "C11.15 list the forms (finder_propose, finder_check)": "find-forms-output.v1.schema.json",
  "C11.12 who can be in this application (AI now)": "who-can-be-output.v1.schema.json",
  "C3.x field map, whole form": "field-map-output.v1.schema.json",
  "C3.x field map, parts and v2": "field-map-output.v2.schema.json",
};
for (const [step, file] of Object.entries(STUDIO_SCHEMAS)) {
  const problems = lint(JSON.parse(readFileSync(join(PROMPTS, file), "utf8")));
  ok(`A ${step}: ${file} is accepted by the provider's structured outputs`, !problems.length, problems.join("; "));
}
for (const f of readdirSync(PROMPTS).filter((x) => x.endsWith(".schema.json") && !Object.values(STUDIO_SCHEMAS).includes(x))) {
  const problems = lint(JSON.parse(readFileSync(join(PROMPTS, f), "utf8")));
  ok(`A other schema ${f} is accepted`, !problems.length, problems.join("; "));
}

// ---- B. stubs for every launched kind (p2/draft.ts reads p2/stubs/<kind>.json for every stub pass, and a live call needs one)
for (const kind of ["find_guide", "find_forms", "who_can_be", "field_map"]) ok(`B the stub pass of job kind ${kind} has its stub answer`, existsSync(join(PROTO, "p2", "stubs", `${kind}.json`)), `p2/stubs/${kind}.json is missing: the stub pass ends in ENOENT, so AI now can never run and the person sees a server path`);

// ---- C. provider errors through the real runner (stub caller, scratch ledger)
const { runDrafting } = await import(join(PROTO, "p2", "runner.ts"));
const { SpendLedger } = await import(join(PROTO, "p2", "ledger.ts"));
const { explainRun } = await import(join(PROTO, "studio", "engine", "ai-run.ts"));
const scratch = mkdtempSync(join(tmpdir(), "qa-ai-paths-"));
const INPUT = { file: "prototype/p1/inventory/application-forms-guides.text.inventory.json", sha256: "5da676b8acbd2c42890e47be77c4006800ff6ba0656ff201d59736700789f124" };
const settings = (max: number) => ({ provider_route: "anthropic-api/aiw-d261-prototype-exception-aiw-d260", model: "claude-opus-5-5", effort: "low", timeout_ms: 300000, max_attempts: 2, budget_usd: 1, max_output_tokens: max });
const providerError = (status: number, type: string, message: string) => Object.assign(new Error(`${status} ${JSON.stringify({ type: "error", error: { type, message }, request_id: "req_qa" })}`), { status });
async function replay(name: string, thrown: Error, userBytes: number, max: number) {
  const dir = join(scratch, name); mkdirSync(dir, { recursive: true });
  const ledger = new SpendLedger(dir, 100);
  let calls = 0; const caller: any = async () => { calls++; throw thrown; }; caller.kind = "stub";
  const o = await runDrafting({ run_id: `qa-${name}`, inputs: { official_files: [INPUT] }, settings: settings(max) }, () => ({ system: "s".repeat(4000), user: "u".repeat(userBytes), output_schema: {} }), caller, ledger, { allowStubDrafts: true } as never);
  const message = explainRun({ caller: "live", drafting_run: { status: o.status, attempts: o.attempts, usage: { cost_usd: ledger.committed() } } } as never).message;
  return { calls, status: o.status as string, counted: ledger.committed() as number, message };
}
for (const [name, e] of [
  ["400 unsupported schema keyword", providerError(400, "invalid_request_error", "output_config.format.schema: For 'array' type, property 'maxItems' is not supported")],
  ["400 prompt too long", providerError(400, "invalid_request_error", "prompt is too long: 1200000 tokens > 1000000 maximum")],
  ["413 request too large", providerError(413, "request_too_large", "Request exceeds the maximum allowed number of bytes.")],
] as const) {
  const r = await replay(name.replace(/\W+/g, "-"), e, 33_000, 3000);
  ok(`C C11.8 ${name}: the provider processed nothing, so the ledger counts US$0`, r.counted === 0, `counted US$${r.counted.toFixed(4)} (error_counted_at_worst_case); the person is told "Cost US$${r.counted.toFixed(2)}"`);
  ok(`C C11.8 ${name}: the person reads plain words, not the provider's JSON`, !/\{"type":"error"|invalid_request_error|request_too_large/.test(r.message), r.message.slice(0, 220));
}
const r529 = await replay("529-find-forms-100kb", providerError(529, "overloaded_error", "Overloaded"), 100_000, 10_000);
ok("C C11.15 an overloaded provider on a 100 KB finder request is not reported as over the spending cap", r529.status !== "budget_exceeded" && !/spending cap/.test(r529.message), `status ${r529.status}: "${r529.message}"`);
const r429 = await replay("429-rate-limit", providerError(429, "rate_limit_error", "rate limit"), 33_000, 3000);
ok("C C11.8 a rate-limited call is not retried at once and counted twice", r429.calls === 1 && r429.counted === 0, `${r429.calls} calls back to back, counted US$${r429.counted.toFixed(4)}`);

// ---- D. output headroom of saved live runs (thinking shares max_tokens): warning only
const RUNS = join(PROTO, "p2", "runs");
const tight = existsSync(RUNS) ? readdirSync(RUNS).filter((f) => /^studio-.*-live-.*\.json$/.test(f) && !f.includes("reconverted")).map((f) => { try { const r = JSON.parse(readFileSync(join(RUNS, f), "utf8")); const a = r.drafting_run.attempts.at(-1); return { f, used: (a?.output_tokens ?? 0) / r.drafting_run.settings.max_output_tokens }; } catch { return null; } }).filter((x): x is { f: string; used: number } => !!x && x.used >= 0.9) : [];
console.log(`WARN D ${tight.length} saved live run(s) used 90% or more of their output limit${tight.length ? `: ${tight.slice(0, 4).map((t) => `${t.f.slice(0, 48)} ${Math.round(t.used * 100)}%`).join(", ")}` : ""}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
