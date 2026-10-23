// v2 (20 Oct 2026): the v2 assembler (detection only; field-map trials carry no review) and the v2 scorer;
// the original spread is reproduced by tests/spread_p2.v1.ts. Writes p2/scores/v2/spread-c1-slice.json.
// Spread across live trials of the slice (comparison plan Part 1, S1 to S4): each trial pairs one live
// IMM 5707 map with one live IMM 1295 map (in run order), is assembled on its own and scored against the
// slice key. Every trial is reported, failures included; nothing is best-of. No AI call.
//   node tests/spread_p2.ts     writes p2/scores/spread-c1-slice.json
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemble } from "../p2/assemble.ts";
import { scoreFieldMaps } from "./score_p2.ts";

const P = join(import.meta.dirname, "..");
const RUNS = join(P, "p2", "runs");
// Prefer the re-converted record where one exists (same model output, corrected conversion; E15).
const trials = (job: string) => {
  const names = readdirSync(RUNS).filter((f) => f.startsWith(`${job}-live-`) && f.endsWith(".json"));
  const base = names.filter((f) => !f.endsWith(".reconverted.json")).sort();
  return base.map((f) => (names.includes(f.replace(/\.json$/, ".reconverted.json")) ? f.replace(/\.json$/, ".reconverted.json") : f)).map((f) => join(RUNS, f));
};
const m5707 = trials("c1-fieldmap-imm5707"), m1295 = trials("c1-fieldmap-imm1295");
const usage = (f: string) => { const e = JSON.parse(readFileSync(f, "utf8")); const a = e.drafting_run.attempts.at(-1) ?? {}; return { file: f.split("/").pop(), status: e.drafting_run.status, contract_valid: e.contract_valid, cost_usd: e.drafting_run.usage?.cost_usd, input_tokens: a.input_tokens, output_tokens: a.output_tokens, seconds: Math.round((a.duration_ms ?? 0) / 1000) }; };
const rows = [];
for (let i = 0; i < Math.max(m5707.length, m1295.length); i++) {
  const files = [m5707[i], m1295[i]].filter(Boolean) as string[];
  const valid = files.filter((f) => JSON.parse(readFileSync(f, "utf8")).contract_valid);
  let score: any = null;
  if (valid.length) {
    const c = assemble(`spread-trial-${i + 1}-r2`, valid);
    score = scoreFieldMaps(JSON.parse(readFileSync(c.file, "utf8")));
  }
  rows.push({
    trial: i + 1, runs: files.map(usage),
    instances: score?.instances.map((x: any) => ({ form: x.form, subject: x.subject, all_ok: x.all_ok, of: x.entries, outcome_ok: x.outcome_ok, fact_ok: x.fact_ok, fact_ok_run_local: x.fact_ok_run_local, transform_ok: x.transform_ok, wrong_person: x.wrong_person.length, invented: x.invented, dependencies: x.dependencies.length, parent_blocks_ok: x.parent_blocks_ok, fact_problems: x.fact_problems, transform_problems: x.transform_problems })) ?? "no contract-valid run",
    merged_meanings: score?.merged_meanings.length ?? null,
  });
}
mkdirSync(join(P, "p2", "scores", "v2"), { recursive: true });
writeFileSync(join(P, "p2", "scores", "v2", "spread-c1-slice.json"), JSON.stringify({ note: "every live trial, in run order; no best-of; scorer v2, assembler v2 (detection only)", trials: rows }, null, 1) + "\n");
for (const r of rows) {
  const ins = Array.isArray(r.instances) ? r.instances.map((x: any) => `${x.form} ${x.subject} ${x.all_ok}/${x.of} (fact ${x.fact_ok}, run-local ${x.fact_ok_run_local}, transform ${x.transform_ok}, wrong person ${x.wrong_person}, invented ${x.invented}, dependencies ${x.dependencies})`).join("; ") : r.instances;
  console.log(`trial ${r.trial}: ${ins}; cost US$${r.runs.reduce((a: number, x: any) => a + (x.cost_usd ?? 0), 0).toFixed(2)}`);
}
