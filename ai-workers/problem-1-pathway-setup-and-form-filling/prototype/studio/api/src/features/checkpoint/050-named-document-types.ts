// C11.7 part B: a document type the sample named on a combination's Documents tab (the nomination certificate) is
// decided on To review › Proposals by the author, as the author decides every replayed proposal (row 4); the author
// then adds its line, as the Documents tab says ("Once it is accepted, choose it here and save the line"); the new
// type then waits for the approver, a second person, in row 5 (070) (BR-7, P-80).
import { ReviewProposals } from "../../review-proposals.ts";
import { Studio } from "../../studio.ts";
import type { CheckpointStep } from "./_context.ts";

export default {
  async run(ctx) {
    const { db, workspaceId, author, approver, said, log } = ctx;
    for (const c of ctx.six.lines_by_hand) for (const d of c.documents.filter((x) => x.status !== "line added")) {
      const p = await db.proposalItem.findFirst({ where: { workspaceId, combinationId: c.combination_id, kind: "document_type", status: "waiting", payload: { path: ["name"], equals: d.name } }, select: { id: true } });
      if (!p) { log.push(`  ${c.combination}: "${d.name}" is not waiting on To review, so its line was not added`); continue; }
      // r2-m2: the two steps are told apart, so an accepted type whose line was refused never reads "stays waiting".
      let key: string | undefined;
      try {
        // r2-m1: decided with a reason, as every proposal of the checkpoint is.
        const r = (await ctx.get(ReviewProposals).decide(author, { ids: [p.id], action: "accept", reason: `Accepted by the sample loader: ${d.quote}`.slice(0, 300) })) as { items?: { landedAs?: string }[] };
        key = r.items?.[0]?.landedAs;
        if (!key) throw new Error(`accepting "${d.name}" gave no library key`);
      } catch (e) { log.push(`  ${c.combination}: "${d.name}" stays waiting on To review: ${said(e)}`); continue; }
      try {
        await ctx.get(Studio).saveRequirement(author, c.combination_id, null, { documentTypeKey: key, attachMode: "COMBINATION_MANDATORY", appliesToRoles: d.who, providedBy: "client", sourceQuote: d.quote });
        log.push(`  ${c.combination}: ${author.name} accepted "${d.name}" on To review and added it as a required line; the new type waits for ${approver.name}`);
      } catch (e) { log.push(`  ${c.combination}: "${d.name}" was accepted, but its required line was not added: ${said(e)}`); }
    }
  },
} satisfies CheckpointStep;
