// B104 (P-351): J7 Stage 1's parts the steps before it do not make (who signs, the IRCC account, eligibility gates), from
// samples/checkpoint-stage-one.json, set on each combination's draft as the author before release 1 is made (110), so
// release 1, the releases after it and every case opened on them carry them. The step's rules are applyStageOne's
// (../../checkpoint-stage-one-data.ts); setStageOne connects them to the services the screens call. No model call (US$0).
import { setStageOne } from "../../checkpoint-stage-one.ts";
import { Forms } from "../../forms.ts";
import { Studio } from "../../studio.ts";
import type { CheckpointStep } from "./_context.ts";

export default {
  async run(ctx) {
    const svc = { db: ctx.db, audit: ctx.audit, studio: ctx.get(Studio), forms: ctx.get(Forms) };
    for (const c of ctx.six.combinations) {
      const key = ctx.keyOf.get(c.id);
      const s = await ctx.timed("J7 Stage 1 setup", () => setStageOne(svc, ctx.author, c.id, key, ctx.said));
      if (s.done.length || s.refused.length) ctx.log.push(`  ${key} J7 Stage 1: ${[...s.done, ...s.refused.map((x) => `refused: ${x}`)].join("; ")}`);
    }
  },
} satisfies CheckpointStep;
