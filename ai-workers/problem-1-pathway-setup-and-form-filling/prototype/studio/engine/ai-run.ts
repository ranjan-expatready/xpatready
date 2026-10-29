// What a finished AI drafting run means for a person, in plain words, and whether a new paid call would only repeat
// one that already failed our own check (Lead check A2 and A3, 23 Oct 2026). Rules, no AI, no database.
//
// FAILED is for anything that went wrong with the answer or our check of it. BLOCKED is kept for the provider refusing
// the call before any processing (an account limit): nothing was drafted and nothing was billed.

import { checkFieldMapOutput } from "../../p2/convert.ts";

const usd = (n: unknown) => `US$${Number(n ?? 0).toFixed(2)}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The AI's field-map answer (p2/prompts/field-map-output.v2.schema.json), as the studio reads it. */
export type FieldMapEntry = { data_path: string; outcome: string; person?: string | null; row?: number | null; fact?: string | null; transform?: string | null; condition?: string | null; confidence?: string | null; unresolved_reason?: string | null; evidence_quote?: string | null };
export type FieldMapAnswer = { form_edition?: string; canonical_fields: { id: string; meaning: string; value_type: string }[]; entries: FieldMapEntry[] };

export type RunEnvelope = {
  caller?: string;
  contract_valid?: boolean;
  contract_errors?: { instancePath?: string; message?: string }[] | null;
  output_errors?: unknown;
  raw_output?: string | null;
  conversion?: { needs_person?: { entry: number; data_path: string; reason: string }[] } | null;
  launch_evidence?: { template_sha256?: string; schema_sha256?: string; known?: unknown } | null;
  drafting_run?: {
    run_id?: string; status?: string; entries?: unknown[];
    inputs?: { official_files?: { sha256: string }[] };
    settings?: { model?: string; effort?: string; max_output_tokens?: number; prompt_version?: string };
    attempts?: { outcome?: string; error?: string }[];
    usage?: { cost_usd?: number; output_tokens?: number; duration_ms?: number };
  };
};

/** The provider's account usage limit refused an attempt (HTTP 400 "usage limits"). Outside review 29 Oct: read per
 *  attempt, so a limit after an earlier attempt that timed out is still found (the joined text began with the timeout). */
const limitRefusal = (a: { error?: string }) => /^400\b/.test(String(a.error ?? "").trim()) && /usage limits?/i.test(String(a.error ?? ""));
export function isProviderLimit(env: RunEnvelope): boolean {
  return (env.drafting_run?.attempts ?? []).some(limitRefusal);
}
/** What a run blocked by the usage limit still counts: its other attempts at their recorded cost, or their worst case
 *  when the cost is unknown (p2/launch.ts adds them the same way); the refused attempt itself is free (AIW-D273). */
export function costBesideLimit(env: RunEnvelope): number {
  const attempts = (env.drafting_run?.attempts ?? []) as { error?: string; cost_usd?: number; worst_usd?: number }[];
  // A record whose attempts carry no costs (an older or hand-made record): its run total, which p2/runner.ts gives a
  // refused attempt at US$0.
  if (!attempts.some((a) => a.cost_usd !== undefined || a.worst_usd !== undefined)) return attempts.some((a) => !limitRefusal(a)) ? Number(env.drafting_run?.usage?.cost_usd ?? 0) : 0;
  return Math.round(attempts.filter((a) => !limitRefusal(a)).reduce((s, a) => s + Number(a.cost_usd ?? a.worst_usd ?? 0), 0) * 1e6) / 1e6;
}

/** Boxes the AI answered, when its output can be read at all. */
function answered(env: RunEnvelope): number | null {
  try { const o = JSON.parse(env.raw_output ?? ""); return Array.isArray(o?.entries) ? o.entries.length : null; } catch { return null; }
}

/** The contract problems grouped by form field, as "form field 115: field name …". */
function boxProblems(env: RunEnvelope, raw: Partial<FieldMapAnswer> | null): string[] {
  const byBox = new Map<number, string>();
  for (const e of env.contract_errors ?? []) {
    const m = /^\/entries\/(\d+)(?:\/(.*))?$/.exec(e.instancePath ?? "");
    if (!m) continue;
    const i = Number(m[1]);
    if (byBox.has(i)) continue;
    const what = m[2] === "fact" ? `field name "${raw?.entries?.[i]?.fact ?? "?"}" breaks the naming rule` : `${(m[2] ?? "entry").replace(/\//g, " ")} ${e.message ?? "is not allowed"}`;
    byBox.set(i, `form field ${i + 1}: ${what}`);
  }
  return [...byBox.values()];
}

/** One plain sentence or three about a run that did not give a usable draft. Never blank. */
export function explainRun(env: RunEnvelope): { status: "FAILED" | "BLOCKED"; message: string; details?: string } {
  const run = env.drafting_run ?? {};
  const cost = usd(run.usage?.cost_usd);
  const n = answered(env);
  // QA-88: plain words per outcome, never the service's JSON or codes; its request id and own words go under Details.
  const attempts = (run.attempts ?? []) as { outcome?: string; error?: string; request_id?: string }[];
  const has = (o: string) => attempts.some((a) => a.outcome === o);
  const rid = attempts.map((a) => a.request_id ?? /"request_id"\s*:\s*"([^"]+)"/.exec(a.error ?? "")?.[1]).filter(Boolean).pop();
  const details = [rid ? `Request ${rid}` : "", attempts.map((a) => a.error).filter(Boolean).pop() ?? ""].filter(Boolean).join(" · ").slice(0, 400) || undefined;
  const say = (status: "FAILED" | "BLOCKED", message: string) => ({ status, message, ...(details ? { details } : {}) });
  // Outside review 29 Oct: the refused attempt is free, but an earlier one counted at its worst case stays counted.
  if (isProviderLimit(env)) return say("BLOCKED", costBesideLimit(env) > 0
    ? `Blocked by the AI provider: the account's usage limit refused the call before any processing. Nothing was drafted; an earlier attempt stays counted (Cost ${usd(costBesideLimit(env))}).`
    : "Blocked by the AI provider: the account's usage limit refused the call before any processing. Nothing was drafted or billed.");
  if (has("refused_input_too_large")) return say("FAILED", "The form is too large for one AI call, so nothing was sent or charged.");
  switch (run.status) {
    case "refused": return say("FAILED", `The AI declined to draft this form. Nothing was applied. Cost ${cost}.`);
    case "timed_out": return say("FAILED", `The AI did not answer in time. Nothing was applied. Cost ${cost}.`);
    case "budget_exceeded": return say("FAILED", "The run would have gone over its spending cap, so it stopped. Nothing was applied.");
    case "provider_error": {
      // Audit 29 Oct: a refused or busy attempt costs US$0, but an earlier attempt that failed otherwise stays counted at its
      // worst case; then the cost is said, never "nothing was charged".
      const free = Number(run.usage?.cost_usd ?? 0) <= 0;
      const charged = free ? "nothing was drafted or charged" : `nothing was drafted; an earlier attempt stays counted (Cost ${cost})`;
      if (has("refused_by_provider")) return say("FAILED", /request_too_large|prompt is too long|\b413\b/i.test(attempts.map((a) => a.error).join(" "))
        ? `The request was too large for the AI service, so ${charged}.`
        : `The AI service refused the request (our setup error), so ${charged}.`);
      if (has("busy")) return say("FAILED", `The AI service was busy, so ${charged}. Try again in a few minutes.`);
      if (has("timed_out")) return say("FAILED", `The AI did not answer in time. Nothing was applied. Cost ${cost}.`);
      return say("FAILED", `The AI service did not complete the call. Nothing was drafted or applied. Cost ${cost}.`);
    }
    case "invalid_output": {
      const cut = String(env.output_errors ?? "").includes("max_tokens");
      const why = String(typeof env.output_errors === "string" ? env.output_errors : JSON.stringify(env.output_errors)).slice(0, 300);
      return cut
        ? say("FAILED", `The AI's answer was cut off at the output limit (${run.usage?.output_tokens ?? "?"} of ${run.settings?.max_output_tokens ?? "?"} output tokens). Nothing was applied. Cost ${cost}.`)
        : { status: "FAILED", message: `The AI answered, but not in the agreed shape. Nothing was applied. Cost ${cost}.`, details: [details, why].filter(Boolean).join(" · ").slice(0, 400) };
    }
  }
  if (/^completed/.test(run.status ?? "") && env.contract_valid === false) {
    let raw: Partial<FieldMapAnswer> | null = null; try { raw = JSON.parse(env.raw_output ?? ""); } catch { /* unreadable */ }
    const probs = boxProblems(env, raw);
    const head = n !== null ? `AI answered ${plural(n, "form field")}.` : "AI answered.";
    const what = probs.length ? `${plural(probs.length, "entry", "entries")} broke our entry rules (${probs.slice(0, 3).join("; ")}${probs.length > 3 ? "; …" : ""}).` : "The answer failed our check of the run record.";
    return { status: "FAILED", message: `${head} ${what} Nothing was applied. Cost ${cost}.` };
  }
  return { status: "FAILED", message: `The AI step ended without a usable draft (status ${run.status ?? "unknown"}). Nothing was applied. Cost ${cost}.` };
}

export type DraftInputs = { inputSha: string; templateSha: string; schemaSha: string; model: string; effort: string; maxOutputTokens: number; known: unknown };

/** True when a saved run asked exactly what a new call would ask: same form inventory, prompt, output schema, model,
 *  effort, output limit and known facts. A new paid call with the same inputs would only repeat that run. */
export function sameDraftInputs(env: RunEnvelope, now: DraftInputs): boolean {
  const r = env.drafting_run ?? {}, e = env.launch_evidence ?? {};
  return r.inputs?.official_files?.[0]?.sha256 === now.inputSha && e.template_sha256 === now.templateSha && e.schema_sha256 === now.schemaSha
    && r.settings?.model === now.model && r.settings?.effort === now.effort && r.settings?.max_output_tokens === now.maxOutputTokens
    && JSON.stringify(e.known ?? null) === JSON.stringify(now.known ?? null);
}

/** The AI answered in full but our own check of the answer failed: a re-check with today's rules may recover it at no
 *  cost, and asking the AI again with the same inputs would not help. */
export function failedOurCheck(env: RunEnvelope): boolean {
  return env.caller === "live" && !!env.raw_output && /^completed/.test(env.drafting_run?.status ?? "") && env.contract_valid === false;
}

/** The AI's answer as every reader must use it: each entry checked on its own (p2/convert.ts), plus any entry the
 *  launcher's conversion sent to a person for another contract reason. Never the raw answer (Lead check A1). */
export function checkedOutput(rec: RunEnvelope): FieldMapAnswer {
  const out: FieldMapAnswer = checkFieldMapOutput(JSON.parse(rec.raw_output ?? "")).output;
  for (const n of rec.conversion?.needs_person ?? []) {
    const e = out.entries[n.entry];
    if (e && e.data_path === n.data_path && e.outcome === "mapped") out.entries[n.entry] = { ...e, outcome: "unresolved", fact: null, unresolved_reason: n.reason };
  }
  return out;
}
