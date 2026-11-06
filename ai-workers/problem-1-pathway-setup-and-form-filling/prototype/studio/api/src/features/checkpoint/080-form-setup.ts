// QA-144 slice 1, after the second person's approval (row 5, 070): on each combination set up from its forms (060), each
// needed fact placed in the section of its form box (the shared rules step), each form field no saved answer proposed
// filled by hand (ruling 2), each form line set by IRCC's words (ruling 3). All as the author, through the screens' own
// services. The work for one combination is the steps of combination/, in their file-name order (features.ts
// featureSteps), all inside the one timing "questions, form fields and form rules (rules)". Row 7 says the totals (090).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { featureSteps, stateOf } from "../../features.ts";
import { FORM_SETUP } from "../../form-setup.ts";
import type { CheckpointContext, CheckpointStep } from "./_context.ts";
import { sections } from "./060-sections-from-forms.ts";

/** One combination of the form setup, as each step of combination/ is given it. `setup` is its row of FORM_SETUP. */
export type CombinationContext = { c: { id: string; label: string; files: number }; key: string | undefined; setup: (typeof FORM_SETUP)[string] | undefined };
export type CombinationStep = { run: (ctx: CheckpointContext, cc: CombinationContext) => Promise<void> };

/** What the steps of combination/ add up over every combination, for row 7 (090). */
export const formSetup = stateOf(() => ({ placedFacts: [] as string[], refused: [] as string[], unchosen: [] as string[], byHand: 0, lines: 0, documentLines: 0 }));

let steps: CombinationStep[] = [];

export default {
  async init() { steps = await featureSteps<CombinationStep>(join(dirname(fileURLToPath(import.meta.url)), "combination")); },
  async run(ctx) {
    await ctx.timed("questions, form fields and form rules (rules)", async () => {
      for (const c of sections(ctx).fromForms) {
        const key = ctx.keyOf.get(c.id);
        const cc: CombinationContext = { c, key, setup: FORM_SETUP[key ?? ""] };
        for (const s of steps) await s.run(ctx, cc);
      }
    });
  },
} satisfies CheckpointStep;
