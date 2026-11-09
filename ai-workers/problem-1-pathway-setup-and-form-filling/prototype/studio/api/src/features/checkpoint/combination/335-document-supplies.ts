// QA-352 (the tech lead's ruling P-437): the facts each document type the library reads as a letter or record supplies
// (samples/document-supplies-read.json, Sample, cited), set through the library's own route as the author ("Facts this
// document supplies", api/src/document-supplies.ts) and approved by the Approver as the second person (BR-7), before the
// release that carries the type (110). A type this combination does not use, one that already supplies exactly these
// facts, or one with a change already open is left as it is. No model call (US$0).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SuppliesInput } from "../../../../../contracts/document-supplies.ts";
import { DocumentSupplies, openSuppliesChange } from "../../../document-supplies.ts";
import { Screen02 } from "../../../screen02.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";

type Data = { supplies: Record<string, SuppliesInput> };
export const READ_SUPPLIES = (): Data["supplies"] =>
  (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "..", "samples", "document-supplies-read.json"), "utf8")) as Data).supplies;

export default {
  async run(ctx, cc) {
    const { db, workspaceId } = ctx;
    for (const [key, set] of Object.entries(READ_SUPPLIES())) {
      if (!(await db.documentRequirement.count({ where: { workspaceId, combinationId: cc.c.id, documentTypeKey: key, status: { not: "RETIRED" } } }))) continue;
      const t = await db.documentType.findFirst({ where: { workspaceId, documentTypeKey: key, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { suppliesFacts: true, name: true } });
      if (!t || (t.suppliesFacts.length === set.facts.length && set.facts.every((f) => t.suppliesFacts.includes(f.fact))) || (await openSuppliesChange(db, workspaceId, key))) continue;
      try {
        const c = await ctx.get(DocumentSupplies).propose(ctx.author, key, set);
        await ctx.get(Screen02).decideLibraryChange(ctx.approver, c.id, "approve", "Approved by the sample loader as the second person (QA-352: the facts a document read by AI vision proposes).");
      } catch (e) { formSetup(ctx).refused.push(`${t.name}: the facts it supplies were not set: ${ctx.said(e)}`); }
    }
  },
} satisfies CombinationStep;
