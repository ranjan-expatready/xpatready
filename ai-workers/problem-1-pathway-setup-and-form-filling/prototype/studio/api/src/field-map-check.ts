// G-CORE B4 (P-121; QA-176 Part B's code row): the field-map step's blind checker round. The draft round is the saved
// field-map run the form's draft replays (api/src/sources.ts); the checker round runs field-map-check.v1.md through the
// shared step runner (api/src/rounds.ts StepRunner), over exactly the draft's inputs (the form's inventory) and the
// printed edition as a known fact, never the draft's answer. Here it is replayed only: a checker run is recorded by
// the paid runner on the Mac from the job files tools/field-map-check-jobs.ts writes (the same `roundJob` the runner
// replays by), so a form drafted before its checker run is recorded stays one round ("Needs a checker round").
import { editionContextKey } from "../../engine/rounds.ts";
import { fieldMapShapeOk, type FieldMapOutput } from "./field-drafts.ts";
import { StepRunner, type AiStep, type RoundOut } from "./rounds.ts";
import type { Sources } from "./sources.ts";

/** The batch word in each checker job id, so the ids stay the same every time the job files are written. */
export const CHECK_BATCH = "field-map-check";

/** The step: the draft prompt is the saved runs' own (field-map.v2.md), the checker its blind counterpart. The job base
 *  is the in-product field-map runs' ("studio-fieldmap-<form>-live-…"), so the checker's runs are
 *  "studio-fieldmap-check-<edition>-…-live-…" and never mistaken for a draft. */
export const FIELD_MAP_CHECK: AiStep = {
  kind: "field_map", jobBase: "studio-fieldmap", configurationVersion: "studio-add-form",
  template: "field-map.v2.md", check: "field-map-check.v1.md", schema: "field-map-output.v2.schema.json",
  effort: "high", max_output_tokens: 64_000, shapeOk: fieldMapShapeOk,
  words: {
    noSaved: "No checker round is recorded for this form edition yet.",
    badSaved: "The recorded checker round of this form edition could not be read, so it was not used.",
    nothingUsed: "Nothing of the checker round was used.",
  },
};

/** "IMM 5257 (09-2023)" → its code and edition; null for anything else. */
export function editionParts(label: string | null | undefined): { code: string; edition: string } | null {
  const m = /^([A-Za-z][A-Za-z0-9 ]{1,30}) \(([0-9]{2}-[0-9]{4})\)$/.exec((label ?? "").trim());
  return m ? { code: m[1], edition: m[2] } : null;
}

/** The draft run's envelope, the parts the checker round copies. */
export type DraftRun = { drafting_run?: { inputs?: { official_files?: { file: string; sha256: string }[] }; settings?: { max_output_tokens?: number; timeout_ms?: number } } };

/** The checker round's step and context for one form edition, from its draft run: the same inputs and output limit. */
export function checkerJob(draft: DraftRun, editionLabel: string) {
  const ed = editionParts(editionLabel);
  const inputs = draft.drafting_run?.inputs?.official_files ?? [];
  if (!ed || !inputs.length) return null;
  const step: AiStep = { ...FIELD_MAP_CHECK, max_output_tokens: draft.drafting_run?.settings?.max_output_tokens ?? FIELD_MAP_CHECK.max_output_tokens, timeout_ms: draft.drafting_run?.settings?.timeout_ms };
  return { step, ctx: { trail: editionLabel, contextKey: editionContextKey(ed.code, ed.edition), inputs, batchId: CHECK_BATCH } };
}

/** The checker round for one form's draft: replayed when a checker run of exactly these inputs is recorded, else a plain
 *  reason (no call is ever sent from here). */
export async function checkerRound(launcher: Pick<Sources, "launchOnce">, draft: DraftRun, editionLabel: string | null): Promise<RoundOut<FieldMapOutput>> {
  const j = editionLabel ? checkerJob(draft, editionLabel) : null;
  if (!j) return { ok: false, costUsd: 0, reason: "The form edition or its inputs are not known, so no checker round can be matched." };
  return new StepRunner(launcher).round<FieldMapOutput>(j.step, true, { ...j.ctx, mode: "replay", wanted: async () => false });
}
