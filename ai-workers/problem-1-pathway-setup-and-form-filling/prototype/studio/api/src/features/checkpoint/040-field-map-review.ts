// C10.1 rows 3–4: the replayed field-map drafts, decided by the author on each draft's own page, then applied to the draft.
import { stateOf } from "../../features.ts";
import { libraryRevision, Sources } from "../../sources.ts";
import type { CheckpointStep } from "./_context.ts";
import { irm0002 } from "./030-irm0002.ts";

/** How many drafts were applied to their combinations (row 8, 095, reads it). */
export const fieldMapReview = stateOf(() => ({ applied: 0 }));
/** How many proposals a field-map step reported (its detail counts). */
const counted = (detail: unknown) => (detail as { counts?: { proposed_fields?: number } } | null)?.counts?.proposed_fields ?? 0;

export default {
  async run(ctx) {
    const { db, workspaceId, author, timed, said, row } = ctx;
    const sources = ctx.get(Sources);
    const irmWhy = irm0002(ctx).why;
    const jobs = await db.draftingJob.findMany({ where: { workspaceId, kind: "field_map", status: "COMPLETED" }, orderBy: { startedAt: "asc" } });
    const fileOf = new Map((await db.sourceAttachment.findMany({ where: { workspaceId }, select: { id: true, fileName: true } })).map((x) => [x.id, x.fileName]));
    let accepted = 0, edited = 0, returned = 0, applied = 0;
    const refused: string[] = [];
    // One edit and one return stay visible (DEMO.md row 4), on the form with the most proposals.
    const showcase = [...jobs].sort((a, b) => counted(b.detail) - counted(a.detail))[0]?.id;
    for (const j of jobs) {
      const form = fileOf.get(j.attachmentId ?? "") ?? "a form";
      try {
        await timed("field-map review and apply", async () => {
          // A draft compared with an older library is compared again first (D280), as its page asks a person to.
          const at = (j.detail as { library_revision?: { sha256?: string } } | null)?.library_revision?.sha256;
          if (at && at !== (await libraryRevision(db, workspaceId)).sha256) await sources.recompare(author, j.id);
          const items = await db.proposalItem.findMany({ where: { runId: j.id, status: "waiting" }, orderBy: { identityKey: "asc" } });
          for (const [n, it] of items.entries()) {
            const meaning = (it.payload as { meaning?: string }).meaning ?? "";
            if (j.id === showcase && n === 0) { await sources.decide(author, j.id, it.id, { decision: "RETURNED", note: "Returned by the sample loader to show a return: decide it again on this form's page." }); returned++; }
            else if (j.id === showcase && n === 1 && meaning.length >= 8) { await sources.decide(author, j.id, it.id, { decision: "ACCEPTED", meaning: `${meaning.replace(/\.?\s*$/, "")} (as asked on ${form}).`.slice(0, 500), note: "Edited by the sample loader: the meaning names the form it was read from." }); edited++; }
            else { await sources.decide(author, j.id, it.id, { decision: "ACCEPTED", note: "Accepted by the sample loader as the saved AI answer proposed it; check it on this form's page." }); accepted++; }
          }
          await sources.apply(author, j.id, {});
          applied++;
        });
      } catch (e) { refused.push(`${form}: ${said(e)}`); }
    }
    fieldMapReview(ctx).applied = applied;
    const waitingForAi = ctx.six.drafts.waiting_for_draft_with_ai;
    row({ row: "3", title: "AI maps form fields to shared fields (saved answers, US$0)", status: !jobs.length ? "waiting" : waitingForAi.length || irmWhy ? "partial" : "done", shows: `${jobs.length} saved AI answers replayed (US$0)`,
      why: [waitingForAi.length ? `${waitingForAi.length} forms have no saved AI answer and wait for Draft with AI, a paid run the founder approves: ${waitingForAi.join(", ")}.` : "", irmWhy ?? ""].filter(Boolean).join(" ") || null });
    // Review m1: the Sample loader also accepts the items where the draft and the checker rounds differ; the row says how many.
    const differ = jobs.length ? await db.proposalItem.count({ where: { runId: { in: jobs.map((j) => j.id) }, agreement: "differ", choice: "ACCEPTED" } }) : 0;
    row({ row: "4", title: "A person reviews: accept with a reason, edit, reject", status: !jobs.length ? "waiting" : refused.length ? "partial" : "done", shows: `${accepted} accepted, ${edited} edited, ${returned} returned with a reason; ${applied} of ${jobs.length} drafts applied to their combinations${differ ? `; ${differ} where the two AI rounds differ were accepted by the sample loader (Sample: check them on To review)` : ""}`,
      why: refused.length ? `Refused by a rule: ${refused.join(" · ")}` : null });
  },
} satisfies CheckpointStep;
