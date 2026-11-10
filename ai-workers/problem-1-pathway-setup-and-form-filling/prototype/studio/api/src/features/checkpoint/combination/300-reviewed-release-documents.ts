// G5 (C5.1, P-248; tech lead's ruling on #868, option 1): a release needs a document line, so With an LMIA's document
// lines come from the reviewed work-permit release p3/releases/c1-v3, the same lines Demo › "Start With an LMIA from its
// reviewed release" loads, less the ones it dismissed and the QA-115 lines an LMIA job cannot have (samples/programs.json,
// wp.family's drop_documents). Through the Documents route as the author; a type the library lacks waits as a proposal
// that the content reviewer accepts, and the Approver approves its ADD (330). Sample, as the release is (its source
// quotes kept). After the questions are placed (200, 210), so a conditional line whose facts the forms' questions now ask
// can be kept.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Actor } from "../../../core.ts";
import { RELEASE, SAMPLES } from "../_constants.ts";
import { decide } from "../../../proposals.ts";
import { Studio } from "../../../studio.ts";
import type { CheckpointContext } from "../_context.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import type { SourcedDocuments } from "../../../form-setup.ts";
import { factsHeld, factsOf } from "./_facts-asked.ts";

/** G5 (C5.1, P-248; tech lead's ruling on #868, option 1): the configured checkpoint's With an LMIA gets its document
 *  lines from the reviewed work-permit release (p3/releases/c1-v3), the lines Demo › "Start With an LMIA from its
 *  reviewed release" loads: every line the release did not dismiss, less the QA-115 lines an LMIA job cannot have
 *  (samples/programs.json, wp.family's drop_documents, each with its why). Each goes in through the Documents route as
 *  the author, with the release's own condition and source quote; a type the library lacks waits as a proposal that
 *  the content reviewer accepts (C3.6), and the Approver approves its library ADD with the others (BR-7). Sample, as
 *  the release is. Returns how many lines went in and the conditional ones left waiting for their facts (named in the
 *  load's log); a refused line is named in `refused`, never dropped silently. C6.17 (P-444, QA-375): `sources`, when the
 *  combination's setup names them, replaces each quote with the combination's own checklist's words (page, quote, date)
 *  where that checklist lists the document, and labels every other line Sample with the source it came from
 *  (api/src/form-setup.ts LMIA_DOCUMENT_SOURCES). */
async function reviewedDocumentLines(ctx: CheckpointContext, author: Actor, reviewer: Actor, workspaceId: string, combinationId: string, refused: string[], say: (e: unknown) => string, sources?: SourcedDocuments) {
  const studio = ctx.get(Studio);
  type Line = { document_type: string; status: string; who: string; provided_by?: string | null; condition?: unknown; condition_plain?: string | null; source_quote?: string | null; source_file?: string | null };
  const config = JSON.parse(readFileSync(join(RELEASE, "configuration.json"), "utf8")) as { document_requirements: Line[] };
  const dropOf = (x: unknown): { document_type: string }[] | null => {
    if (Array.isArray(x)) { for (const v of x) { const r = dropOf(v); if (r) return r; } return null; }
    if (x && typeof x === "object") { const o = x as Record<string, unknown>; if (o.key === "wp.family" && Array.isArray(o.drop_documents)) return o.drop_documents as { document_type: string }[]; for (const v of Object.values(o)) { const r = dropOf(v); if (r) return r; } }
    return null;
  };
  const drop = new Set((dropOf(JSON.parse(readFileSync(SAMPLES, "utf8"))) ?? []).map((d) => d.document_type));
  // A condition reads facts; a line comes over only when each fact it reads is in this library and asked in a section
  // (else the release would hold on "not in the library" or "asked of nobody"). The others are left out and named:
  // they wait for their facts (checkpoint row 7 and the questionnaire work), never written half-working.
  const { asked, inLibrary } = await factsHeld(ctx.db, workspaceId);
  const quoteOf = (d: Line) => !sources ? d.source_quote ?? undefined : sources.cited[d.document_type] ?? sources.sample(d.source_quote ?? "", d.source_file ?? null);
  let n = 0;
  const waiting: string[] = [];
  for (const d of config.document_requirements.filter((x) => x.status !== "dismissed" && !drop.has(x.document_type))) {
    const missing = [...factsOf(d.condition)].filter((f) => !inLibrary.has(f) || !asked.has(f));
    if (missing.length) { waiting.push(`${d.document_type} (its condition reads ${missing.join(", ")})`); continue; }
    const line = { attachMode: (d.condition ? "ANSWER_CONDITIONAL" : "COMBINATION_MANDATORY") as "ANSWER_CONDITIONAL" | "COMBINATION_MANDATORY", appliesToRoles: d.who, providedBy: d.provided_by ?? "client",
      ...(quoteOf(d) ? { sourceQuote: quoteOf(d) } : {}), ...(d.condition ? { condition: d.condition, conditionPlain: d.condition_plain ?? undefined } : {}) };
    try {
      const r = (await studio.saveRequirement(author, combinationId, null, { ...line, documentTypeName: d.document_type } as Parameters<Studio["saveRequirement"]>[3])) as { proposalId?: string } | null;
      if (r && r.proposalId) {
        const key = ((await decide(ctx.db, ctx.audit, reviewer, workspaceId, [r.proposalId], { action: "accept", reason: "Accepted by the sample loader: a document line of the reviewed work-permit release c1-v3 (Sample)." })).items[0] as { landedAs?: string } | undefined)?.landedAs;
        if (!key) { refused.push(`${d.document_type}: its document type was not accepted`); continue; }
        await studio.saveRequirement(author, combinationId, null, { ...line, documentTypeKey: key } as Parameters<Studio["saveRequirement"]>[3]);
      }
      n++;
    } catch (e) { refused.push(`${d.document_type}: ${say(e)}`); }
  }
  return { n, waiting };
}

export default {
  async run(ctx, cc) {
    if (!cc.setup?.documentsFromReviewedRelease) return;
    const out = formSetup(ctx);
    const d = await reviewedDocumentLines(ctx, ctx.author, ctx.sme, ctx.workspaceId, cc.c.id, out.refused, ctx.said, cc.setup.documentSources);
    out.documentLines += d.n;
    ctx.log.push(`  ${cc.key}: ${d.n} document lines from the reviewed work-permit release c1-v3 (Sample; P-248); ${d.waiting.length} conditional lines wait for the facts their condition reads: ${d.waiting.join("; ")}`);
  },
} satisfies CombinationStep;
