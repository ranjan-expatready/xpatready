// E1a free AI scoring set (evidence lane, 23 Oct 2026). Scores every saved live AI run again from its stored
// output: no AI call, no network. Run only through run.sh, which runs this inside a throwaway copy (the assembler
// writes configurations next to the runs) with the no-network guard and Node's permission model.
// Writes results/manifest.json (every run file and its SHA-256), results/scores.json and results/SUMMARY.md.
// Three kinds of measure, kept apart:
//   keyed      field maps that have an answer key (IMM 5707 for two people, the IMM 1295 marital block), scored
//              by the existing v2 scorer (tests/score_p2.ts), paired by trial as in tests/spread_p2.ts
//   structural every field-map run against its form's inventory: coverage, unknown form fields, duplicates,
//              edition named, outcomes; needs no key, so it also covers IMM 1344 and IMM 5257
//   agreement  repeated runs of the same job: how often the runs give the same answer for the same form field
// Whole-configuration scores (requirements, sections, checks) are the self-check layers A to D (run.sh).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemble } from "../../p2/assemble.ts";
import { scoreFieldMaps } from "../../tests/score_p2.ts";

if (process.env.SCORING_SET_GUARD !== "on") { console.error("run through run.sh (offline guard)"); process.exit(2); }
const P = join(import.meta.dirname, "..", "..");
const SOL = join(P, "..");
const RUNS = join(P, "p2", "runs");
const OUT = join(import.meta.dirname, "results");
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const load = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : null);
// A run's model output, or null when there is none or it does not parse (provider error, cut off at max_tokens).
const output = (e: any) => { try { const o = e.raw_output ? JSON.parse(e.raw_output) : null; return o?.entries ? o : null; } catch { return null; } };
const count = (xs: string[]) => xs.reduce((m: Record<string, number>, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});

// ---- manifest: every live run; the re-converted record (same model output, corrected conversion, E15) is scored
const names = readdirSync(RUNS).filter((f) => f.includes("-live-") && f.endsWith(".json"));
const base = names.filter((f) => !f.endsWith(".reconverted.json")).sort();
const keyFiles = ["expected/slice-1-field-map.v2.json", "expected/fact-aliases-c1.json", "expected/combination-1.v2.json", "expected/combination-2.json", "tests/p2-acceptance.v2.json"];
const runs = base.map((f) => {
  const rc = f.replace(/\.json$/, ".reconverted.json");
  const scored = names.includes(rc) ? rc : f;
  const e = load(join(RUNS, scored)), r = e.drafting_run;
  const inv = r.inputs?.official_files?.find((x: any) => /inventory\.json$/.test(x.file));
  return {
    file: `prototype/p2/runs/${f}`, sha256: sha(readFileSync(join(RUNS, f))), scored_file: `prototype/p2/runs/${scored}`, scored_sha256: sha(readFileSync(join(RUNS, scored))),
    job: f.replace(/-live-.*$/, ""), kind: r.kind, status: r.status, contract_valid: e.contract_valid, model: r.settings?.model, effort: r.settings?.effort,
    prompt: r.settings?.prompt_version, prompt_sha256: r.settings?.prompt_sha256, started_at: r.started_at, cost_usd: r.usage?.cost_usd ?? 0,
    input_tokens: r.usage?.input_tokens, output_tokens: r.usage?.output_tokens, seconds: Math.round((r.usage?.duration_ms ?? 0) / 1000),
    inventory: inv ? { file: inv.file, sha256_at_run: inv.sha256 } : null, _env: e,
  };
});

// ---- structural: each field-map run against its form's inventory (no key needed)
const structural = (m: (typeof runs)[number]) => {
  const out = output(m._env);
  if (!out) return { scorable: false, why: `${m.status}${m._env.output_errors ? `: ${String(m._env.output_errors).slice(0, 80)}` : ""}` };
  const invPath = join(SOL, m.inventory!.file);
  const inv = load(invPath);
  const fields = new Set<string>(inv.fields.filter((x: any) => x.data_path && (x.kind === "field" || x.kind === "exclGroup")).map((x: any) => x.data_path));
  const keys = out.entries.map((x: any) => `${x.data_path}#${x.row ?? 0}`);
  const paths = new Set<string>(out.entries.map((x: any) => x.data_path));
  const covered = [...fields].filter((p) => paths.has(p)).length;
  const unknown = [...paths].filter((p) => !fields.has(p));
  const note = m._env.conversion?.edition_note;
  const date = (s: string) => /\((\d\d-\d{4})\)/.exec(s ?? "")?.[1] ?? null;
  return {
    scorable: true, entries: out.entries.length, outcomes: count(out.entries.map((x: any) => x.outcome)),
    form_fields: fields.size, covered, coverage_pct: pct(covered, fields.size),
    unknown_form_fields: unknown.length, unknown_examples: unknown.slice(0, 3), duplicates: keys.length - new Set(keys).size,
    mapped_without_fact: out.entries.filter((x: any) => x.outcome === "mapped" && !x.fact).length,
    low_confidence: out.entries.filter((x: any) => x.confidence === "low").length,
    canonical_fields: out.canonical_fields?.length ?? 0,
    edition: { manifest: note?.manifest ?? null, drafted: note?.drafted ?? out.form_edition ?? null, same_date: date(note?.manifest) !== null && date(note?.manifest) === date(note?.drafted ?? out.form_edition) },
    inventory_unchanged_since_run: sha(readFileSync(invPath)) === m.inventory!.sha256_at_run,
  };
};

// ---- keyed: scored the reviewed way (tests/spread_p2.ts): trial i pairs the i-th IMM 5707 run with the i-th IMM 1295
// run, assembled together by p2/assemble.ts and scored by the existing v2 scorer. Scored alone, a map keeps its own
// wording for a fact, and wording the reviewed alias table (expected/fact-aliases-c1.json) has not seen counts as
// unreviewed, never as correct; pairing is how the key was reviewed, so it is the measure used here.
const keyed = new Map<string, any[]>();
const pairJobs = ["c1-fieldmap-imm5707", "c1-fieldmap-imm1295"];
const trialsOf = (job: string) => runs.filter((m) => m.job === job && m.contract_valid && output(m._env));
for (let i = 0; i < Math.max(...pairJobs.map((j) => trialsOf(j).length)); i++) {
  const pair = pairJobs.map((j) => trialsOf(j)[i]).filter(Boolean);
  const c = assemble(`scoring-set-trial-${i + 1}`, pair.map((m) => join(P, m.scored_file.replace(/^prototype\//, ""))));
  const s = scoreFieldMaps(load(c.file));
  for (const m of pair) {
    const form = String(output(m._env).form_edition).match(/^IMM ?\d{4}/)![0];
    keyed.set(m.file, s.instances.filter((x: any) => x.form === form).map((x: any) => ({
      trial: i + 1, paired_with: pair.filter((o) => o !== m).map((o) => o.file),
      form: x.form, subject: x.subject, all_ok: x.all_ok, of: x.entries, outcome_ok: x.outcome_ok, person_ok: x.person_ok, fact_ok: x.fact_ok, fact_ok_run_local: x.fact_ok_run_local,
      transform_ok: x.transform_ok, wrong_person: x.wrong_person.length, invented: x.invented, missing: x.missing, parent_blocks_ok: x.parent_blocks_ok,
      problems: [...x.fact_problems.map((p: any) => `fact ${p.key}: drafted ${p.draft ?? "none"} (${p.decision})`), ...x.transform_problems.map((p: any) => String(p.why).slice(0, 140)), ...x.wrong_person.map((p: any) => `person ${p.key} drafted as ${p.draft}`)].slice(0, 12),
    })));
  }
}

// The paired scores must equal the saved v2 spread, field for field (a second self-check of this scorer).
const savedSpread = load(join(P, "p2", "scores", "v2", "spread-c1-slice.json")).trials;
const flds = ["all_ok", "outcome_ok", "fact_ok", "fact_ok_run_local", "transform_ok", "wrong_person", "invented"];
const spreadCheck = savedSpread.flatMap((t: any) => (Array.isArray(t.instances) ? t.instances : []).map((x: any) => {
  const mine = [...keyed.values()].flat().find((k: any) => k.trial === t.trial && k.form === x.form && k.subject === x.subject);
  const same = !!mine && flds.every((f) => (f === "all_ok" ? mine.all_ok === x.all_ok : mine[f] === x[f]));
  return { trial: t.trial, form: x.form, subject: x.subject, same };
}));
if (!spreadCheck.length || spreadCheck.some((c: any) => !c.same)) { console.error("keyed scores differ from p2/scores/v2/spread-c1-slice.json", JSON.stringify(spreadCheck.filter((c: any) => !c.same))); process.exit(1); }

// ---- agreement across repeated runs of one job
const agreement = (group: (typeof runs)[number][]) => {
  const maps = group.map((m) => new Map<string, any>(output(m._env).entries.map((x: any) => [`${x.data_path}#${x.row ?? 0}`, x])));
  const inAll = [...maps[0].keys()].filter((k) => maps.every((mp) => mp.has(k)));
  const same = (f: (x: any) => any) => inAll.filter((k) => new Set(maps.map((mp) => JSON.stringify(f(mp.get(k)) ?? null))).size === 1).length;
  const union = new Set(maps.flatMap((mp) => [...mp.keys()]));
  return {
    runs: group.length, form_fields_in_any: union.size, in_every_run: inAll.length,
    same_outcome_pct: pct(same((x) => x.outcome), inAll.length), same_person_pct: pct(same((x) => x.person), inAll.length),
    same_fact_id_pct: pct(same((x) => x.fact), inAll.length), same_transform_pct: pct(same((x) => x.transform), inAll.length),
    all_four_same_pct: pct(same((x) => [x.outcome, x.person, x.fact, x.transform]), inAll.length),
  };
};

const fm = runs.filter((m) => m.kind === "field_map");
const scored = runs.map((m) => ({ ...m, _env: undefined, structural: m.kind === "field_map" ? structural(m) : null, keyed: keyed.get(m.file) ?? null }));
const jobs = [...new Set(fm.map((m) => m.job))].sort();
const agree = Object.fromEntries(jobs.map((j) => [j, fm.filter((m) => m.job === j && output(m._env))]).filter(([, g]) => (g as any[]).length > 1).map(([j, g]) => [j, agreement(g as any[])]));

mkdirSync(OUT, { recursive: true });
const manifest = { note: "Every saved live AI run scored by the E1a scoring set; replaying them costs US$0 (no AI call, no network).", runs: scored.map(({ structural, keyed, ...m }) => m),
  answer_key: keyFiles.map((f) => ({ file: `prototype/${f}`, sha256: sha(readFileSync(join(P, f))) })), stub_runs: "not scored: harness controls, not model output" };
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
writeFileSync(join(OUT, "scores.json"), JSON.stringify({ label: "Rescored offline from saved model output; prototype-only exception; keys are Lead-verified from official sources, not specialist-confirmed", keyed_matches_saved_spread: { instances: spreadCheck.length, all_identical: true }, runs: scored.map((m) => ({ file: m.file, job: m.job, status: m.status, contract_valid: m.contract_valid, structural: m.structural, keyed: m.keyed })), agreement: agree }, null, 1) + "\n");

// ---- plain summary
const L: string[] = [];
const spent = runs.reduce((a, m) => a + m.cost_usd, 0);
L.push("# Scoring set results (E1a)", "", `Generated by \`run.sh\`; ${runs.length} saved live runs (${fm.length} field maps), originally US$${spent.toFixed(2)} of AI; rescoring them cost US$0. Keys: Lead-verified from official sources (prototype only); not specialist-confirmed.`, "");
L.push(`Self-checks: saved P2 scores and configurations regenerated byte for byte (results/self-check.json); keyed scores equal the saved five-trial spread on all ${spreadCheck.length} person-form results.`, "");
L.push("## Field maps, one row per run", "", "| Run | Status | Coverage of form fields | Unknown fields | Duplicates | Edition right | Keyed (trial): all correct (wrong person, invented) |", "|---|---|---|---|---|---|---|");
for (const m of scored.filter((x) => x.kind === "field_map")) {
  const s: any = m.structural;
  const k = m.keyed?.map((x: any) => `${x.subject} ${x.all_ok}/${x.of} (${x.wrong_person}, ${x.invented})`).join("; ").replace(/^/, `t${m.keyed?.[0]?.trial}: `) ?? "no key yet";
  L.push(s?.scorable ? `| ${m.job} ${m.started_at?.slice(0, 16)} | ${m.status} | ${s.covered}/${s.form_fields} (${s.coverage_pct}%) | ${s.unknown_form_fields} | ${s.duplicates} | ${s.edition.same_date ? "yes" : `no: ${s.edition.drafted?.slice(0, 40)}`} | ${k} |` : `| ${m.job} ${m.started_at?.slice(0, 16)} | ${m.status} | not scorable (no output) | | | | |`);
}
L.push("", "## Agreement across repeated runs", "", "| Job | Runs | Fields in every run | Same outcome | Same person | Same fact id | Same transform | All four |", "|---|---|---|---|---|---|---|---|");
for (const [j, a] of Object.entries(agree) as any) L.push(`| ${j} | ${a.runs} | ${a.in_every_run} of ${a.form_fields_in_any} | ${a.same_outcome_pct}% | ${a.same_person_pct}% | ${a.same_fact_id_pct}% | ${a.same_transform_pct}% | ${a.all_four_same_pct}% |`);
L.push("", "Fact ids are chosen by each run, so \"same fact id\" understates agreement in meaning; the keyed column is the measure of correctness.");
writeFileSync(join(OUT, "SUMMARY.md"), L.join("\n") + "\n");
console.log(L.join("\n"));
