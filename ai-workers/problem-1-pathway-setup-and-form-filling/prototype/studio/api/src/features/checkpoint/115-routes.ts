// C6.17 (B139; scaffolding, STAND-INS row for the tech lead): the Sample route "Study, then work" from samples/routes.json,
// loaded after release one so a case can open at its later stage with the earlier one "Done before we started". Read only
// (no authoring: SA-1B-66 later); a route the engine refuses is named in the log, never loaded. Not a DEMO.md row.
import { loadSampleRoutes } from "../../routes-data.ts";
import type { CheckpointStep } from "./_context.ts";

export default {
  async run(ctx) {
    const out = await ctx.timed("Sample routes (C6.17)", () => loadSampleRoutes(ctx.db, ctx.workspaceId, ctx.author.id));
    ctx.log.push(`  routes (C6.17, Sample): ${out.loaded.length ? `loaded ${out.loaded.join(", ")}` : "none loaded"}${out.refused.length ? `; refused ${out.refused.join(" | ")}` : ""}`);
  },
} satisfies CheckpointStep;
