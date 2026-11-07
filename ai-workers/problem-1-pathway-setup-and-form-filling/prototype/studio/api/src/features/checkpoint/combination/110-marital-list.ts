// The shared field takes the marital status list once (the first combination's, from 060), for every combination after it.
import { Forms } from "../../../forms.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { sections } from "../060-sections-from-forms.ts";

export default {
  async run(ctx, cc) {
    if (!cc.setup) return;
    const s = sections(ctx);
    if (s.maritalList) { try { await ctx.get(Forms).linkAnswerList(ctx.author, "person.marital_status", { list: s.maritalList }); s.maritalList = null; } catch (e) { formSetup(ctx).refused.push(`person.marital_status list: ${ctx.said(e)}`); } }
  },
} satisfies CombinationStep;
