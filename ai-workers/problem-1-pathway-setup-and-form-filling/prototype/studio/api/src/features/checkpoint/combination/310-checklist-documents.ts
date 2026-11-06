// G5 (P-248; tech lead's ruling on #868, option 1 for the Visitor visa): its document lines from its official document
// checklist (IMM 5484), by the product's own steps: C2.6 replays the saved AI reading of that edition (US$0), the author
// decides each proposed line on To review, and the Approver approves a new type (330).
import type { Actor } from "../../../core.ts";
import { Checklists } from "../../../checklist.ts";
import { decide } from "../../../proposals.ts";
import type { CheckpointContext } from "../_context.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { factsHeld, factsOf } from "./_facts-asked.ts";

/** G5 (C5.1, P-248; tech lead's ruling on #868, option 1 for the Visitor visa): a combination's document lines from its
 *  official document checklist (`checklist`, a source the six load), through C2.6: the saved AI reading of that
 *  edition is replayed (US$0) into proposals on To review, and the author decides each one there. A line IRCC always
 *  asks for, or whose condition reads only facts this library holds and asks, is accepted (its new type lands with it
 *  and waits for the Approver, BR-7); any other is rejected with its reason, so the release never carries a line that
 *  cannot work yet, and a type left without a line is rejected too. Sample, from the official checklist, with quotes. */
async function checklistDocumentLines(ctx: CheckpointContext, author: Actor, workspaceId: string, combinationId: string, checklist: string, refused: string[], say: (e: unknown) => string) {
  const { db, audit } = ctx;
  const rejected: string[] = [];
  const att = await db.sourceAttachment.findFirst({ where: { combinationId, kind: "Document checklist", recognised: true, edition: { startsWith: `${checklist} (` } }, select: { id: true } });
  if (!att) { refused.push(`${checklist}: not among this combination's sources, so no document line was drafted from it`); return { n: 0, rejected }; }
  let job: { id: string };
  try { job = await ctx.get(Checklists).draft(author, att.id, { mode: "replay" }); } catch (e) { refused.push(`${checklist}: ${say(e)}`); return { n: 0, rejected }; }
  const { asked, inLibrary } = await factsHeld(db, workspaceId);
  const reject = async (id: string, label: string, why: string) => {
    try { await decide(db, audit, author, workspaceId, [id], { action: "reject", reason: why.slice(0, 480) }); rejected.push(`${label} (${why})`); } catch (e) { refused.push(`${label}: ${say(e)}`); }
  };
  let n = 0;
  const lines = await db.proposalItem.findMany({ where: { runId: job.id, kind: "requirement_line", status: "waiting" }, orderBy: [{ createdAt: "asc" }, { identityKey: "asc" }], select: { id: true, payload: true, work: true } });
  for (const l of lines) {
    const p = l.payload as { always?: boolean; condition?: { tree?: unknown } | null }, label = String((l.work as { label?: unknown } | null)?.label ?? "a document line");
    const missing = p.always ? [] : [...factsOf(p.condition?.tree)].filter((f) => !inLibrary.has(f) || !asked.has(f));
    if (!p.always && !p.condition?.tree) { await reject(l.id, label, `${checklist} leaves it to the visa office and gives no condition: a person adds it by hand on Documents if needed`); continue; }
    if (missing.length) { await reject(l.id, label, `its condition reads ${missing.join(", ")}, which this library does not hold and ask yet`); continue; }
    try { await decide(db, audit, author, workspaceId, [l.id], { action: "accept", reason: `Accepted by the sample loader: a document line ${checklist} asks for, in its own words (Sample; P-248).` }); n++; } catch (e) { await reject(l.id, label, `not accepted: ${say(e)}`); }
  }
  // B82: a fact the reading proposed goes with its line: an accepted line here reads only facts the library holds and asks.
  for (const t of await db.proposalItem.findMany({ where: { runId: job.id, kind: { in: ["document_type", "field"] }, status: "waiting" }, select: { id: true, kind: true, payload: true } }))
    await reject(t.id, String((t.payload as { name?: unknown; label?: unknown }).name ?? (t.payload as { label?: unknown }).label ?? t.kind), t.kind === "field" ? "no accepted line reads it" : "no accepted line uses it");
  return { n, rejected };
}

export default {
  async run(ctx, cc) {
    const checklist = cc.setup?.documentsFromChecklist;
    if (!checklist) return;
    const out = formSetup(ctx);
    const d = await checklistDocumentLines(ctx, ctx.author, ctx.workspaceId, cc.c.id, checklist, out.refused, ctx.said);
    out.documentLines += d.n;
    ctx.log.push(`  ${cc.key}: ${d.n} document lines from ${checklist}'s saved reading (Sample; P-248); ${d.rejected.length} rejected with their reason: ${d.rejected.join("; ")}`);
  },
} satisfies CombinationStep;
