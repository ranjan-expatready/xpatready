// Offline reassembly and rescoring of every stored P2 result (P2 response, 20 Oct 2026). No AI call, no network.
// Keeps the original results and shows each later layer separately, so model output, deterministic repairs and
// evaluation corrections are never mixed:
//   A  original: v1 assembler + v1 scorer + v1 keys (p2/scores/*.score.json, reproduced byte for byte)
//   B  evaluation corrections only: the SAME original configuration, v2 scorer + v2 keys (D11, D19, D20, P2-M1)
//   C  assembler v2, detection only: model output unchanged; same-id and same-meaning conflicts listed
//   D  reviewed repairs: field review (11 merges, 2 splits, flags) + content repair R-D20, then v2 scorer
//   node tests/rescore_p2.ts      writes p2/scores/v2/rescore-summary.json
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assemble } from "../p2/assemble.ts";
import { assemble as assembleV1 } from "../p2/assemble.v1.ts";
import { score } from "./score_p2.ts";
import { score as scoreV1 } from "./score_p2.v1.ts";

const P = join(import.meta.dirname, "..");
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const cfg = (n: string) => join(P, "p2", "config", `c1-draft-1-${n}.json`);
const load = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const runs = (load(cfg("live")).drafting_run_ids as string[]).map((r) => join(P, "p2", "runs", `${r}.json`));

const summary = (s: any) => {
  const fm = s.field_maps.instances.map((i: any) => ({ form: i.form, subject: i.subject, all_ok: i.all_ok, of: i.entries, fact_ok: i.fact_ok, fact_ok_run_local: i.fact_ok_run_local, transform_ok: i.transform_ok, wrong_person: i.wrong_person.length, invented: i.invented, dependencies: i.dependencies?.length ?? 0 }));
  return { verdicts: s.summary, failing: s.acceptance.filter((a: any) => a.verdict !== "PASS").map((a: any) => a.id), field_maps: fm };
};

// A: reproduce the original configuration and score.
const origBefore = sha(readFileSync(cfg("live")));
assembleV1("live", runs);
const origAfter = sha(readFileSync(cfg("live")));
const A = scoreV1(load(cfg("live")));
const savedA = load(join(P, "p2", "scores", "c1-draft-1-live.score.json"));
const aSame = JSON.stringify(A) === JSON.stringify(savedA);
// B: evaluation corrections on the same configuration.
const B = score(load(cfg("live")));
// C and D.
assemble("live-r2-detect", runs);
assemble("live-r2", runs, { review: join(P, "p2", "field-review.c1.json"), repairs: join(P, "p2", "repairs.c1.json") });
const C = score(load(cfg("live-r2-detect"))), D = score(load(cfg("live-r2")));
const d = load(cfg("live-r2"));

// The five trials: original spread (v1) and v2 spread, as saved by the two spread scripts.
const s1 = load(join(P, "p2", "scores", "spread-c1-slice.json")), s2 = load(join(P, "p2", "scores", "v2", "spread-c1-slice.json"));
const trials = s1.trials.map((t: any, i: number) => ({
  trial: t.trial, cost_usd: Number(t.runs.reduce((a: number, x: any) => a + (x.cost_usd ?? 0), 0).toFixed(4)),
  v1: t.instances.map((x: any) => `${x.form} ${x.subject} ${x.all_ok}/${x.of}`),
  v2: s2.trials[i].instances.map((x: any) => `${x.form} ${x.subject} ${x.all_ok}/${x.of}`),
  v2_wrong_person: s2.trials[i].instances.reduce((a: number, x: any) => a + x.wrong_person, 0), v2_invented: s2.trials[i].instances.reduce((a: number, x: any) => a + x.invented, 0),
  v2_misses: s2.trials[i].instances.flatMap((x: any) => [...x.fact_problems.map((p: any) => `${x.form} ${x.subject}: fact ${p.key} (${p.decision})`), ...x.transform_problems.map((p: any) => `${x.form} ${x.subject}: ${p.why.slice(0, 120)}`)]),
}));

const out = {
  note: "Every stored P2 result rescored offline from the preserved raw outputs; nothing re-run against the model. Layers A-D are separate; D is model output plus listed repairs, never unassisted model success.",
  original_configuration: { file: "p2/config/c1-draft-1-live.json", sha256: origAfter, reproduced_byte_for_byte: origBefore === origAfter, original_score_reproduced: aSame },
  A_original: summary(A),
  B_evaluation_corrections_only: summary(B),
  C_assembler_v2_detection_only: { ...summary(C), configuration: "p2/config/c1-draft-1-live-r2-detect.json", sha256: sha(readFileSync(cfg("live-r2-detect"))), items_listed_for_review: load(cfg("live-r2-detect")).unresolved.filter((u: any) => /field review/.test(u.reason)).length },
  D_reviewed_repairs: { ...summary(D), configuration: "p2/config/c1-draft-1-live-r2.json", sha256: sha(readFileSync(cfg("live-r2"))),
    field_review: { merges: d.structure.field_review.merges_applied.length, splits: d.structure.field_review.splits_applied.length, flags: d.structure.field_review.flagged.length, references_rewritten: d.structure.field_review.references_rewritten, still_listed_for_review: d.unresolved.filter((u: any) => /field review/.test(u.reason)).length },
    content_repairs: d.structure.repairs.applied.map((r: any) => ({ id: r.id, before: r.before, after: r.after })),
    condition_key_renames_v1_and_v2: d.structure.condition_keys_renamed },
  trials,
};
writeFileSync(join(P, "p2", "scores", "v2", "rescore-summary.json"), JSON.stringify(out, null, 1) + "\n");
for (const k of ["A_original", "B_evaluation_corrections_only", "C_assembler_v2_detection_only", "D_reviewed_repairs"] as const) {
  const x: any = (out as any)[k];
  console.log(`${k.padEnd(32)} ${JSON.stringify(x.verdicts)} failing ${x.failing.join(", ") || "none"} | ${x.field_maps.map((f: any) => `${f.form} ${f.subject} ${f.all_ok}/${f.of}`).join("; ")}`);
}
console.log(`original reproduced: configuration ${out.original_configuration.reproduced_byte_for_byte}, score ${aSame}`);
