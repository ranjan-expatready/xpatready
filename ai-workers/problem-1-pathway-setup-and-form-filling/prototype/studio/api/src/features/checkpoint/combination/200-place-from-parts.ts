// Each fact the combination's forms need and nobody is asked for, placed in the library section that groups its form box
// (api/src/form-part-placements.ts, the Smart questionnaire tab's own step; rules, no AI, US$0).
import { placeFromFormParts } from "../../../form-part-placements.ts";
import { Studio } from "../../../studio.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { placed } from "./_placed.ts";

export default {
  async run(ctx, cc) {
    const p = placed(cc).p = await placeFromFormParts(ctx.db, ctx.get(Studio), ctx.author, cc.c.id);
    formSetup(ctx).placedFacts.push(...p.placed.map((x) => x.fact));
  },
} satisfies CombinationStep;
