// The family information form by how the application form is filed (paper or PDF upload: IMM 5707; online: IMM 5645);
// the other one is taken off only where it is a line.
import { Studio } from "../../../studio.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { formLines } from "./_form-lines.ts";

export default {
  async run(ctx, cc) {
    if (!cc.setup) return;
    const out = formSetup(ctx), { family, has } = formLines(cc);
    for (const [form, body] of family ? [[family.form, { attachMode: "COMBINATION_MANDATORY" as const, minAge: 18 }], ...(has.has(family.other) ? [[family.other, { retire: true }]] as const : [])] as const : []) {
      try { await ctx.get(Studio).saveForm(ctx.author, cc.c.id, form, body); out.lines++; } catch (e) { out.refused.push(`${form}: ${ctx.said(e)}`); }
    }
  },
} satisfies CombinationStep;
