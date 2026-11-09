// C10.2 row 16 (finished story only): a thin second Visitor visa case, opened by the case officer on release 1 before
// release 2 goes out (130), so the story shows a case staying on the release it started on while the family case moves
// (200). Through the product's own route (POST /api/runtime/cases); a new case always takes the newest release, so it is
// opened here, between the family case (120) and release 2 (130). Nothing is answered on it.
import { stateOf } from "../../features.ts";
import { openThinCase, routesAt } from "../../finished-story.ts";
import type { CheckpointStep } from "./_context.ts";
import { releaseOne } from "./110-release-one.ts";

export const thinCase = stateOf(() => ({ caseId: null as string | null, release: null as number | null, why: null as string | null }));

export default {
  async run(ctx) {
    if (ctx.story !== "finished") return;
    const state = thinCase(ctx);
    if (!releaseOne(ctx).visitor || !ctx.vvId) { state.why = "Waits for the Visitor visa's release 1 (a case runs on a release)."; return; }
    Object.assign(state, await ctx.timed("thin case on release 1 (row 16)", () => openThinCase(routesAt(), ctx.vvId!)));
    ctx.log.push(`  finished story: thin case ${state.caseId ? `opened on release ${state.release}` : `not opened: ${state.why}`}`);
  },
} satisfies CheckpointStep;
