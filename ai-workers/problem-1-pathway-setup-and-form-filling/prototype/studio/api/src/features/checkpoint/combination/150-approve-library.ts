// The approver, a second person, approves what the form setup added to the library (BR-7, QA-144 slice 1).
import { Screen02 } from "../../../screen02.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";

export default {
  async run(ctx, cc) {
    if (!cc.setup) return;
    for (const ch of await ctx.db.libraryChange.findMany({ where: { workspaceId: ctx.workspaceId, status: "WAITING" }, select: { id: true, label: true, key: true } })) {
      try { await ctx.get(Screen02).decideLibraryChange(ctx.approver, ch.id, "approve", "Approved by the sample loader as the second person (QA-144 slice 1)."); } catch (e) { formSetup(ctx).refused.push(`${ch.label ?? ch.key}: ${ctx.said(e)}`); }
    }
  },
} satisfies CombinationStep;
