// The Approver approves each new document type as the second person (BR-7, G5: a document line's type).
import { Screen02 } from "../../../screen02.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";

export default {
  async run(ctx, cc) {
    if (!cc.setup) return;
    for (const ch of await ctx.db.libraryChange.findMany({ where: { workspaceId: ctx.workspaceId, status: "WAITING", kind: "document_type" }, select: { id: true, label: true, key: true } })) {
      try { await ctx.get(Screen02).decideLibraryChange(ctx.approver, ch.id, "approve", "Approved by the sample loader as the second person (G5, a document line's type)."); } catch (e) { formSetup(ctx).refused.push(`${ch.label ?? ch.key}: ${ctx.said(e)}`); }
    }
  },
} satisfies CombinationStep;
