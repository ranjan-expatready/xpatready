// Each fact only a rule reads (IRM 0002's, IMM 5476's, …), added for its rule (C3.6), accepted by the author; the
// Approver approves it (150). One another combination added already is read as it is.
import { decide } from "../../../proposals.ts";
import { RuleFacts } from "../../../rule-facts.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";

export default {
  async run(ctx, cc) {
    if (!cc.setup) return;
    const { db, audit, workspaceId, author } = ctx;
    for (const rf of cc.setup.ruleFacts ?? []) {
      if (await db.canonicalField.count({ where: { workspaceId, canonicalFieldKey: rf.fact, status: { in: ["DRAFT", "PUBLISHED"] } } })) continue;
      try {
        const { proposalId } = await ctx.get(RuleFacts).add(author, cc.c.id, { fact: rf.fact, rule: rf.rule, label: rf.label, meaning: rf.meaning, valueType: rf.valueType });
        await decide(db, audit, author, workspaceId, [proposalId], { action: "accept", reason: `Accepted by the sample loader: the fact ${rf.rule}'s rule reads (${rf.cite}; Sample).` });
      } catch (e) { formSetup(ctx).refused.push(`${rf.label}: ${ctx.said(e)}`); }
    }
  },
} satisfies CombinationStep;
