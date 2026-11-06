// G5 (#868, Lead 8's option 1 for the Study permit): its always-needed lines from its checklist's own words, cited.
import type { Actor } from "../../../core.ts";
import type { CitedDocumentLine } from "../../../form-setup.ts";
import { decide } from "../../../proposals.ts";
import { Studio } from "../../../studio.ts";
import type { CheckpointContext } from "../_context.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";

/** G5 (#868, Lead 8's option 1 for the Study permit): document lines from an official checklist's own words, each cited
 *  with its page and quote (P-170), through the Documents route as the author. A `reuse` line takes the library's
 *  type of that name (a draft one too: the Visitor visa's types publish with its release) (refused in words if there is none); a new one waits as a proposal the content reviewer accepts, and the Approver approves its ADD (BR-7). */
async function citedDocumentLines(ctx: CheckpointContext, author: Actor, reviewer: Actor, workspaceId: string, combinationId: string, lines: CitedDocumentLine[], refused: string[], say: (e: unknown) => string) {
  const studio = ctx.get(Studio);
  let n = 0;
  for (const l of lines) {
    const line = { attachMode: "COMBINATION_MANDATORY" as const, appliesToRoles: l.who, providedBy: "client", sourceQuote: l.quote };
    try {
      if (l.reuse) {
        const t = await ctx.db.documentType.findFirst({ where: { workspaceId, name: l.type, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { documentTypeKey: true } });
        if (!t) { refused.push(`${l.type}: the library has no type of that name to reuse`); continue; }
        await studio.saveRequirement(author, combinationId, null, { ...line, documentTypeKey: t.documentTypeKey } as Parameters<Studio["saveRequirement"]>[3]);
        n++; continue;
      }
      const r = (await studio.saveRequirement(author, combinationId, null, { ...line, documentTypeName: l.type } as Parameters<Studio["saveRequirement"]>[3])) as { proposalId?: string } | null;
      if (r && r.proposalId) {
        const key = ((await decide(ctx.db, ctx.audit, reviewer, workspaceId, [r.proposalId], { action: "accept", reason: "Accepted by the sample loader: a document the official checklist asks for, cited (Sample, Unconfirmed: expert)." })).items[0] as { landedAs?: string } | undefined)?.landedAs;
        if (!key) { refused.push(`${l.type}: its document type was not accepted`); continue; }
        await studio.saveRequirement(author, combinationId, null, { ...line, documentTypeKey: key } as Parameters<Studio["saveRequirement"]>[3]);
      }
      n++;
    } catch (e) { refused.push(`${l.type}: ${say(e)}`); }
  }
  return n;
}

export default {
  async run(ctx, cc) {
    const cited = cc.setup?.documentsCited;
    if (!cited) return;
    const out = formSetup(ctx);
    const d = await citedDocumentLines(ctx, ctx.author, ctx.sme, ctx.workspaceId, cc.c.id, cited, out.refused, ctx.said);
    out.documentLines += d;
    ctx.log.push(`  ${cc.key}: ${d} document lines from its document checklist, cited with page and quote (Sample, Unconfirmed: expert; P-248)`);
  },
} satisfies CombinationStep;
