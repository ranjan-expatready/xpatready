// Scaffolding for the C9.1 checks: a saved "Draft with AI" run (draft and blind checker rounds) of exactly the IMM 5476
// 11-2025 over 2021 comparison, written into p2/runs as the guarded launcher would record it, and removed after. It is
// made for tests only (never a real answer, never committed); its three proposals: two quote their box's own caption, the
// third quotes words not on the form (P-170: Decide).
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/fixtures/c91-saved-run.ts write|remove [tag]
import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { RUNS } from "../../api/src/rounds.ts";
import { impactContext, impactStep } from "../../api/src/impact-ai.ts";
import { C91, c91Jobs } from "../../tools/c91-impact-job.ts";

const STUDIO = join(import.meta.dirname, "..", "..");
const { changed, part, rows } = c91Jobs();
export const step = impactStep(C91.printed, changed), ctx = impactContext(C91.printed, part);
const tSha = (t: string) => createHash("sha256").update(readFileSync(join(STUDIO, "..", "p2", "prompts", t))).digest("hex");
const caption = (dp: string) => rows.find((r) => r.dataPath === dp)!.caption;
/** Three changed boxes that have a printed caption (a box with none shows its data path, which is not on the form). */
const boxes = changed.filter((dp) => caption(dp) !== dp).slice(0, 3);
export const answer = { form_edition: C91.printed, canonical_fields: [{ id: "representative.family_name", meaning: "The representative's family name", value_type: "text" }, { id: "representative.email", meaning: "The representative's email address", value_type: "email" }, { id: "representative.membership_id", meaning: "The representative's membership ID", value_type: "text" }],
  entries: [[boxes[0], "representative.family_name", caption(boxes[0])], [boxes[1], "representative.email", caption(boxes[1])], [boxes[2], "representative.membership_id", "Words that are not on this form"]].map(([dp, fact, quote]) => ({ data_path: dp, outcome: "mapped", person: "representative", row: null, fact, transform: null, condition: null, confidence: "high", unresolved_reason: null, evidence_quote: quote })) };
export const runRecord = (isCheck: boolean, inputs: { file: string; sha256: string }[], out: unknown, cost = 0.2) => ({ caller: "live", contract_valid: true, raw_output: JSON.stringify(out),
  drafting_run: { status: "completed", usage: { cost_usd: cost }, attempts: [{ outcome: "completed" }], inputs: { official_files: inputs, combination: ctx.contextKey } }, launch_evidence: { template_sha256: tSha(isCheck ? step.check : step.template) } });
/** Named per check copy (its database name), so checks running side by side never remove each other's files. */
const TAG = (process.env.C91_FIXTURE_TAG ?? process.argv[3] ?? "c91").replace(/[^a-z0-9]/g, "").slice(0, 20) || "c91";
export const SAVED = [`${step.jobBase}-c91fixture-${TAG}-live-20261103t100100000z-c91fix.json`, `${step.jobBase}-check-c91fixture-${TAG}-live-20261103t100200000z-c91fix.json`];
export const writeSaved = () => { writeFileSync(join(RUNS, SAVED[0]), JSON.stringify(runRecord(false, ctx.inputs, answer))); writeFileSync(join(RUNS, SAVED[1]), JSON.stringify(runRecord(true, ctx.inputs, answer))); };
export const removeSaved = () => { for (const f of SAVED) rmSync(join(RUNS, f), { force: true }); };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "write") writeSaved(); else if (process.argv[2] === "remove") removeSaved(); else { console.error("write | remove"); process.exit(2); }
}
