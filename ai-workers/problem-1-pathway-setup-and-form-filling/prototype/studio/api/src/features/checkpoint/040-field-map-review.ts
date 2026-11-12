// C10.1 rows 3–4: the replayed field-map drafts, decided by the author on each draft's own page, then applied to the draft.
import { stateOf } from "../../features.ts";
import { libraryRevision, Sources } from "../../sources.ts";
import type { CheckpointStep } from "./_context.ts";
import { irm0002 } from "./030-irm0002.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STUDIO } from "../../core.ts";

/** QA-400 (P-485): the author's corrections at review (samples/review-corrections.json): a proposed key the author changes
 *  to another library field on the draft's page, with the reason it records. Data, never a form or program in code. */
type Correction = { proposed: string; key: string; valueType?: string; meaning?: string; note: string };
export const REVIEW_CORRECTIONS: Correction[] = (JSON.parse(readFileSync(join(STUDIO, "samples", "review-corrections.json"), "utf8")) as { corrections: Correction[] }).corrections;

/** BK-16 (P-496): the sources a combination's setup marks "later" in samples/wave1.json (a form the library gains only
 *  for a family member's rule, e.g. a spouse's own application), each kept only when that setup lists it among its
 *  sources. Data, never a form or program in code. Exported, pure over the file's content, for its check. */
export function laterSourcesByKey(sample: unknown): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) { for (const x of n) walk(x); return; }
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>, s = o.setup as { key?: unknown; sources?: unknown; later?: unknown } | undefined;
    if (s && typeof s.key === "string" && Array.isArray(s.later) && Array.isArray(s.sources))
      for (const f of s.later) if (typeof f === "string" && (s.sources as unknown[]).includes(f)) out.set(s.key, new Set([...(out.get(s.key) ?? []), f]));
    for (const v of Object.values(o)) walk(v);
  };
  walk(sample);
  return out;
}
export const laterSources = (sample: unknown): Set<string> => new Set([...laterSourcesByKey(sample).values()].flatMap((s) => [...s]));
/** BK-16 (P-496): each combination's later sources, by its key (samples/wave1.json); 080 holds their forms back. */
export const LATER_BY_KEY = laterSourcesByKey(JSON.parse(readFileSync(join(STUDIO, "samples", "wave1.json"), "utf8")));
const LATER = new Set([...LATER_BY_KEY.values()].flatMap((s) => [...s]));

/** How many drafts were applied to their combinations (row 8, 095, reads it). */
export const fieldMapReview = stateOf(() => ({ applied: 0 }));
/** How many proposals a field-map step reported (its detail counts). */
const counted = (detail: unknown) => (detail as { counts?: { proposed_fields?: number } } | null)?.counts?.proposed_fields ?? 0;
type Job = { id: string; attachmentId: string | null; batchId?: string | null; startedAt: Date; runFile?: string | null; detail: unknown };
/** A batch of drafts as its plan lists them: when the load started it, and its targets in the plan's order. */
export type BatchPlan = { id: string; startedAt: Date; targets: { attachmentId?: string | null }[] };
/** The saved answer a draft replays (its run file): a tie-break only (a merged run's name carries its load's time). */
const runOf = (j: Job) => String(j.runFile ?? (j.detail as { run_file?: unknown } | null)?.run_file ?? "").replace(/^.*\//, "");
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
/** The order the drafts are decided and applied in, and the one draft that shows an edit and a return (DEMO.md row 4).
 *  The order decides more than wording: the first draft that lands a shared field sets its key's meaning, and each later
 *  draft is compared with the library the earlier ones filled (sources.ts, the decided key), so it decides keys too
 *  (review B1 on #1411: IMM 5257's other given names and US green card keys). Lead 39 on #1396 (9 Nov): the same drafts
 *  must give the same order on every load. So the order is the load's own plan, never the moment a job started: the
 *  batches in the order the load started them, then each draft's place among its batch's planned targets; the form's file
 *  name, the saved answer and the job id only break ties. Before, two drafts planned 1 and 2 (IMM 5257, IMM 5257 SCH1)
 *  could start in the same millisecond and land in either order, so person.date_of_birth's meaning, and with it IMM
 *  5257's review sheet, changed from load to load. The showcase is the draft with the most proposals, a tie going to the
 *  first in this order. */
export function reviewOrder<J extends Job>(jobs: J[], fileOf: Map<string, string>, batches: BatchPlan[] = [], later: ReadonlySet<string> = new Set()): { order: J[]; showcase: string | undefined } {
  const rank = new Map([...batches].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime() || byText(a.id, b.id)).map((b, i) => [b.id, i]));
  const place = new Map(batches.map((b) => [b.id, new Map(b.targets.map((t, i) => [t.attachmentId ?? "", i] as [string, number]).reverse())]));
  const batchOf = (j: J) => rank.get(j.batchId ?? "") ?? Number.MAX_SAFE_INTEGER;
  const placeOf = (j: J) => place.get(j.batchId ?? "")?.get(j.attachmentId ?? "") ?? Number.MAX_SAFE_INTEGER;
  const file = (j: J) => fileOf.get(j.attachmentId ?? "") ?? "";
  // BK-16 (P-496): a source a combination marks "later" (samples/wave1.json) is decided after every combination's own
  // listed forms, so it reuses the keys they name and never renames another combination's facts.
  const lateOf = (j: J) => (later.has(file(j)) ? 1 : 0);
  const order = [...jobs].sort((a, b) => lateOf(a) - lateOf(b) || batchOf(a) - batchOf(b) || placeOf(a) - placeOf(b) || byText(file(a), file(b)) || byText(runOf(a), runOf(b)) || byText(a.id, b.id));
  // BK-16: the showcase is chosen among the drafts that are not marked later, so a later source never moves it (and
  // with it the one return and edit) off a form another combination releases.
  const own = order.filter((j) => !lateOf(j)), most = Math.max(0, ...own.map((j) => counted(j.detail)));
  return { order, showcase: own.find((j) => counted(j.detail) === most)?.id };
}

export default {
  async run(ctx) {
    const { db, workspaceId, author, timed, said, row } = ctx;
    const sources = ctx.get(Sources);
    const irmWhy = irm0002(ctx).why;
    const fileOf = new Map((await db.sourceAttachment.findMany({ where: { workspaceId }, select: { id: true, fileName: true } })).map((x) => [x.id, x.fileName]));
    const found = await db.draftingJob.findMany({ where: { workspaceId, kind: "field_map", status: "COMPLETED" } });
    const batchIds = [...new Set(found.map((j) => j.batchId).filter((x): x is string => !!x))];
    const batches: BatchPlan[] = (batchIds.length ? await db.aiBatch.findMany({ where: { id: { in: batchIds } }, select: { id: true, startedAt: true, plan: true } }) : [])
      .map((b) => ({ id: b.id, startedAt: b.startedAt, targets: ((b.plan as { targets?: { attachmentId?: string | null }[] } | null)?.targets ?? []) }));
    const { order: jobs, showcase } = reviewOrder(found, fileOf, batches, LATER);
    let accepted = 0, edited = 0, returned = 0, applied = 0, corrected = 0;
    const refused: string[] = [];
    // One edit and one return stay visible (DEMO.md row 4), on the form with the most proposals (reviewOrder).
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
            // Review m3: only a field proposal is changed to another library field (decide refuses it for a checklist line).
            const fix = (it.payload as { kind?: string }).kind === "field" ? REVIEW_CORRECTIONS.find((c) => c.proposed === (it.payload as { label?: string }).label) : undefined;
            if (fix) { await sources.decide(author, j.id, it.id, { decision: "CHANGED", key: fix.key, valueType: fix.valueType, meaning: fix.meaning, note: fix.note }); corrected++; }
            else if (j.id === showcase && n === 0) { await sources.decide(author, j.id, it.id, { decision: "RETURNED", note: "Returned by the sample loader to show a return: decide it again on this form's page." }); returned++; }
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
    row({ row: "4", title: "A person reviews: accept with a reason, edit, reject", status: !jobs.length ? "waiting" : refused.length ? "partial" : "done", shows: `${accepted} accepted, ${edited} edited, ${returned} returned with a reason${corrected ? `, ${corrected} changed to another library field` : ""}; ${applied} of ${jobs.length} drafts applied to their combinations${differ ? `; ${differ} where the two AI rounds differ were accepted by the sample loader (Sample: check them on To review)` : ""}`,
      why: refused.length ? `Refused by a rule: ${refused.join(" · ")}` : null });
  },
} satisfies CheckpointStep;
