// QA-144 slice 1 (#840): the Visitor visa's IRM 0002 line has no file in the sample. The author attaches the library's
// official file to it, the form is read, and its saved AI field-map answer (a draft and a blind checker round, #840)
// replays through the review queue at US$0, so rows 3–4 (040) decide and apply it with the others. Nothing runs live.
import { stateOf } from "../../features.ts";
import { Ai } from "../../ai.ts";
import { Intake } from "../../intake.ts";
import { Sources } from "../../sources.ts";
import type { CheckpointStep } from "./_context.ts";

/** Review m4: a failed attach is said on row 3 (040), never only logged. */
export const irm0002 = stateOf(() => ({ why: null as string | null }));

export default {
  async run(ctx) {
    const { workspaceId, author, vvId, log } = ctx;
    const state = irm0002(ctx);
    if (vvId) await ctx.timed("IRM 0002 attached and its saved answer replayed", async () => {
      const ai = ctx.get(Ai);
      const r = await ctx.get(Intake).sample(author, vvId, "irm0002e.pdf");
      if (!r.attachmentId) { state.why = `IRM 0002 was not attached to the Visitor visa: ${r.message}`; log.push(`  ${state.why}`); return; }
      if (r.attachmentStatus === "RECOGNISED") await ctx.get(Sources).read(author, r.attachmentId);
      const plan = await ai.plan({ kind: "source", ids: [r.attachmentId] }, "REPLAY");
      if (!plan.targets.some((t) => t.action === "reuse_saved_output")) { state.why = `IRM 0002's saved AI answer does not replay (${plan.targets.map((t) => t.why ?? t.action).join("; ").slice(0, 200)})`; log.push(`  ${state.why}`); return; }
      const b = await ai.launch(author, { scope: { kind: "source", ids: [r.attachmentId] }, mode: "REPLAY", idempotencyKey: `configured-irm0002-${workspaceId}`, planSha256: plan.plan_sha256 });
      await ctx.settled(b.id!);
    });
  },
} satisfies CheckpointStep;
