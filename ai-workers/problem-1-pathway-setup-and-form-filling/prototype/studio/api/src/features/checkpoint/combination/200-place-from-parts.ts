// Each fact the combination's forms need and nobody is asked for, placed in the library section that groups its form box
// (api/src/form-part-placements.ts, the Smart questionnaire tab's own step; rules, no AI, US$0).
import { placeFromFormParts } from "../../../form-part-placements.ts";
import { Studio } from "../../../studio.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { placed } from "./_placed.ts";

export default {
  async run(ctx, cc) {
    // BK-16 (P-496): in each combination's own pass its held forms (later sources, samples/wave1.json) are left out, though
    // their field-map apply already put their line on it; the later pass, after every combination, places them, so the
    // questions the other combinations' forms ask are placed first and kept.
    const p = placed(cc).p = await placeFromFormParts(ctx.db, ctx.get(Studio), ctx.author, cc.c.id, cc.pass === "own" ? cc.held : undefined);
    formSetup(ctx).placedFacts.push(...p.placed.map((x) => x.fact));
  },
} satisfies CombinationStep;
