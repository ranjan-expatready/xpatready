// C10.1 row 5: every new library item waits for a second person (BR-7); the approver approves them on To review.
import { Screen02 } from "../../screen02.ts";
import type { CheckpointStep } from "./_context.ts";

export default {
  async run(ctx) {
    const { approver, said } = ctx;
    const adds = await ctx.db.libraryChange.findMany({ where: { workspaceId: ctx.workspaceId, status: "WAITING" }, select: { id: true, label: true, key: true } });
    const notApproved: string[] = [];
    await ctx.timed("library approvals (second person)", async () => {
      for (const c of adds) { try { await ctx.get(Screen02).decideLibraryChange(approver, c.id, "approve", "Approved by the sample loader as the second person (C10.1 checkpoint)."); } catch (e) { notApproved.push(`${c.label ?? c.key}: ${said(e)}`); } }
    });
    ctx.row({ row: "5", title: "New shared fields approved by a second person", status: !adds.length ? "waiting" : notApproved.length ? "partial" : "done", shows: `${adds.length - notApproved.length} of ${adds.length} new library items approved by the ${approver.name}, not by the author`,
      why: notApproved.length ? notApproved.slice(0, 3).join(" · ") : adds.length ? null : "No new library item: no draft was applied." });
  },
} satisfies CheckpointStep;
