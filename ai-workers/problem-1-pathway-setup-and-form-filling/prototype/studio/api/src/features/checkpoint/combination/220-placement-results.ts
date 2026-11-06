// What the placement (200, 210) refused, left without a section, or unchose again, for row 7 (090).
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { placed } from "./_placed.ts";

export default {
  async run(ctx, cc) {
    const out = formSetup(ctx), p = placed(cc).p!;
    out.refused.push(...p.refused, ...p.noSection.map((f) => `${f}: no section groups a form field that reads it`));
    out.unchosen.push(...p.unselected);
  },
} satisfies CombinationStep;
