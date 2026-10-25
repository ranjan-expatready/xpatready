// Screen 02 slice 1: "To review" (P-79). One list of what waits for a person, read from the records the other screens
// already keep (no new table): AI proposals, submitted combinations, portal captures, screen maps, merges, held files and
// new editions, plus AI work still running. Each item says the one step the asking person can take, or who acts next;
// the endpoint that takes the step checks the same rule again (BR-9).
import { Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Query } from "@nestjs/common";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { KIND_WORDS, ReviewQueueQuery, type QueueFilter, type QueueItem, type QueueKind, type ReviewQueue } from "../../contracts/review-queue.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { buildSnapshots } from "../../engine/snapshot.ts";
import { ACTORS, actorOf, Db, VAR, Workspace, type Actor } from "./core.ts";
import { Studio } from "./studio.ts";

const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
const holds = (a: Actor, duty: string) => (a.duties as readonly string[]).includes(duty);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ORDER: Record<QueueItem["state"], number> = { needs: 0, waiting: 1, running: 2 };
/** Where a step has no page yet, the row says so instead of linking to a page that cannot take it (board views 5–9). */
const NO_PAGE = "Its review page is not built yet; nothing changes until a person decides.";

@Injectable()
export class ReviewQueueService {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Studio) private readonly studio: Studio) {}

  async list(actor: Actor, query: unknown): Promise<ReviewQueue> {
    const p = ReviewQueueQuery.safeParse(query ?? {});
    if (!p.success) throw new HttpException(problemFromZod(p.error), HttpStatus.BAD_REQUEST);
    const { filter, kind, q } = p.data;
    const all = await this.items(actor);
    const needle = q?.toLocaleLowerCase("en-CA");
    const found = all.filter((i) => (!kind || i.kind === kind) && (!needle || `${i.title} ${i.what} ${KIND_WORDS[i.kind]}`.toLocaleLowerCase("en-CA").includes(needle)));
    const counts: Record<QueueFilter, number> = { needs: 0, waiting: 0, running: 0, all: found.length };
    for (const i of found) counts[i.state]++;
    const kinds: Partial<Record<QueueKind, number>> = {};
    for (const i of all) kinds[i.kind] = (kinds[i.kind] ?? 0) + 1;
    // Oldest first within each state (board view 1: "Rows are sorted oldest first within Needs you").
    const items = found.filter((i) => filter === "all" || i.state === filter).sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.at.localeCompare(b.at));
    return { items, counts, kinds };
  }

  private async items(actor: Actor): Promise<QueueItem[]> {
    const workspaceId = await this.ws.id();
    const [nodes, combos, jobs, pending, batches, subs, captures, online, merges, held] = await Promise.all([
      this.db.programDef.findMany({ where: { workspaceId }, select: { id: true, programNodeKey: true, parentNodeKey: true, nodeKind: true, label: true } }),
      this.db.combination.findMany({ where: { workspaceId }, select: { id: true, programDefId: true, label: true } }),
      this.db.draftingJob.findMany({ where: { workspaceId, kind: { in: ["field_map", "reuse_map"] } }, orderBy: { startedAt: "desc" }, select: { id: true, combinationId: true, attachmentId: true, kind: true, mode: true, status: true, costUsd: true, startedBy: true, startedAt: true, finishedAt: true, detail: true } }),
      this.db.normalizationItem.groupBy({ by: ["jobId"], where: { workspaceId, decision: "PENDING" }, _count: true }),
      this.db.aiBatch.findMany({ where: { workspaceId, status: { in: ["QUEUED", "RUNNING"] } }, include: { jobs: { select: { status: true, costUsd: true } } } }),
      this.db.reviewSubmission.findMany({ where: { workspaceId }, orderBy: { submittedAt: "desc" } }),
      this.db.portalCapture.findMany({ where: { workspaceId, status: "HELD" } }),
      this.db.formEdition.findMany({ where: { workspaceId, channel: "ONLINE" }, select: { id: true, editionLabel: true, capturedOn: true, maps: { select: { id: true }, take: 1 } } }),
      this.db.fieldMerge.findMany({ where: { workspaceId, status: "PROPOSED" } }),
      this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD" } }),
    ]);
    const byKey = new Map(nodes.map((n) => [n.programNodeKey, n]));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const pathOf = (programDefId: string) => {
      const out: string[] = [];
      for (let n = byId.get(programDefId); n; n = n.parentNodeKey ? byKey.get(n.parentNodeKey) : undefined) if (n.nodeKind !== "PATHWAY") out.unshift(n.label);
      return out.join(" › ");
    };
    const combo = new Map(combos.map((c) => [c.id, { label: c.label, path: pathOf(c.programDefId) }]));
    const atts = new Map((await this.db.sourceAttachment.findMany({ where: { id: { in: jobs.map((j) => j.attachmentId!).filter(Boolean) } }, select: { id: true, edition: true, fileName: true } })).map((a) => [a.id, a]));
    const out: QueueItem[] = [];

    // AI proposals: the newest drafting step per source, as the Programs row counts them (programs.ts catalogue).
    const waitingCount = new Map(pending.map((p) => [p.jobId, p._count]));
    const newest = new Map<string, (typeof jobs)[number]>();
    for (const j of jobs) if (j.attachmentId && !newest.has(j.attachmentId)) newest.set(j.attachmentId, j);
    for (const j of newest.values()) {
      if (j.kind !== "field_map" || j.status !== "COMPLETED" || j.mode === "STUB") continue;
      const n = waitingCount.get(j.id) ?? 0, c = combo.get(j.combinationId);
      const a = atts.get(j.attachmentId!), counts = (j.detail as { counts?: Record<string, number> } | null)?.counts;
      const source = (a?.edition ?? a?.fileName ?? "A form").split(" (")[0];
      const what = counts ? `${source}: ${plural(counts.boxes, "form field")}, ${counts.mapped} mapped. ${plural(counts.proposed_fields, "shared field")} proposed: ${counts.reuse} reuse, ${counts.new} new, ${counts.ambiguous} ambiguous, ${counts.conflict} conflicting.` : `${source}: an AI draft to review.`;
      const href = `/c/${j.combinationId}/jobs/${j.id}`;
      const base = { id: `job:${j.id}`, kind: "ai_proposals" as const, title: c?.path ?? "A combination", by: nameOf(j.startedBy), at: (j.finishedAt ?? j.startedAt).toISOString(), cost_usd: j.costUsd ?? 0 };
      if (n) out.push({ ...base, what: `${what} ${plural(n, "proposal")} still to decide.`, ...(holds(actor, "review") ? { state: "needs" as const, waiting_on: null, next: { label: `Review ${plural(n, "AI proposal")}`, href, note: null } } : { state: "waiting" as const, waiting_on: "A content publisher decides each proposal.", next: null }) });
      else out.push({ ...base, what: `${what} Every proposal is decided.`, ...(holds(actor, "author") ? { state: "needs" as const, waiting_on: null, next: { label: "Add the decisions to the draft", href, note: null } } : { state: "waiting" as const, waiting_on: "The configuration author adds the decisions to the draft.", next: null }) });
    }

    // Combinations waiting for review or release (P-79): the newest submission per combination, through the same gate
    // as both release routes (QA-1), so this list and the Release page say the same thing.
    const latest = new Map<string, (typeof subs)[number]>();
    for (const s of subs) if (!latest.has(s.combinationId)) latest.set(s.combinationId, s);
    const open = [...latest.values()].filter((s) => s.status === "SUBMITTED");
    if (open.length) {
      const snaps = await buildSnapshots(this.db, workspaceId, open.map((s) => s.combinationId), "draft");
      const gates = await this.studio.releaseGates(open.map((s) => ({ combinationId: s.combinationId, sha256: snaps.get(s.combinationId)!.sha256 })));
      for (const s of open) {
        const c = combo.get(s.combinationId), gate = gates.get(s.combinationId)!, mine = s.submittedBy === actor.id;
        const changes = (s.changeSummary as unknown[]).length, href = `/c/${s.combinationId}/review`;
        const base = { id: `submission:${s.id}`, kind: "release" as const, title: c?.path ?? "A combination", by: nameOf(s.submittedBy), at: s.submittedAt.toISOString(), cost_usd: null };
        if (gate.ok) out.push({ ...base, what: `Submitted with ${plural(changes, "change")}; every change that needs a sign-off is signed. Ready to release.`, ...(holds(actor, "approve") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Release", href, note: null } } : { state: "waiting" as const, waiting_on: mine ? "An approver releases it: not the person who submitted it." : "An approver releases it.", next: null }) });
        else if (/changed after it was submitted/.test(gate.why)) out.push({ ...base, what: `The draft changed after it was submitted. ${gate.why.split(": ")[1] ?? ""}`.trim(), ...(holds(actor, "review") ? { state: "needs" as const, waiting_on: null, next: { label: "Submit again", href, note: null } } : { state: "waiting" as const, waiting_on: "A content publisher submits it again.", next: null }) });
        else out.push({ ...base, what: `Submitted with ${plural(changes, "change")}. ${gate.why}`, ...(holds(actor, "sme") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Review and sign", href, note: null } } : { state: "waiting" as const, waiting_on: mine ? "The content reviewer signs it: not the person who submitted it." : "The content reviewer signs the changes that need the SME duty.", next: null }) });
      }
    }

    // Portal captures held for a second person (P-66): never the person who captured it.
    for (const c of captures) {
      const mine = c.capturedBy === actor.id, screens = ((c.record as { screens?: unknown[] } | null)?.screens ?? []).length;
      const diffs = Array.isArray(c.difference) ? c.difference.length : 0;
      out.push({ id: `capture:${c.id}`, kind: "capture", title: `${c.formKey} online · ${c.title}`, by: nameOf(c.capturedBy), at: c.createdAt.toISOString(), cost_usd: null,
        what: `${plural(screens, "screen")} captured from blank pages by ${nameOf(c.capturedBy)}${c.changesEditionId ? ` · ${plural(diffs, "difference")} from the approved version` : " · a new online version"}. Not used until a second person approves it.`,
        ...(holds(actor, "review") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Approve or return", href: null, note: NO_PAGE } } : { state: "waiting" as const, waiting_on: mine ? "You captured it; a different person approves or returns it." : "A content publisher approves or returns it.", next: null }) });
    }

    // Online versions without a screen map: drafted (waiting for a person to accept) or not drafted yet (no AI).
    for (const e of online) {
      if (e.maps.length) continue;
      const drafted = existsSync(join(VAR("demo"), "screen-maps", `${e.id}.json`));
      const duty = drafted ? "review" : "author";
      out.push({ id: `screen-map:${e.id}`, kind: "screen_map", title: e.editionLabel, by: null, at: (e.capturedOn ?? new Date(0)).toISOString(), cost_usd: drafted ? 0 : null,
        what: drafted ? "Screen map drafted without AI: a person accepts the matches and maps what is left." : "Approved online version with no screen map yet. Drafting it reuses the PDF twin and the library first (no AI).",
        ...(holds(actor, duty) ? { state: "needs" as const, waiting_on: null, next: { label: drafted ? "Review the screen map" : "Draft the screen map", href: null, note: NO_PAGE } } : { state: "waiting" as const, waiting_on: drafted ? "A content publisher accepts it." : "The configuration author drafts it.", next: null }) });
    }

    // Merges proposed for a second person (P-65).
    for (const m of merges) {
      const mine = m.proposedBy === actor.id;
      out.push({ id: `merge:${m.id}`, kind: "merge", title: `${m.mergeKey} → ${m.keepKey}`, by: nameOf(m.proposedBy), at: m.proposedAt.toISOString(), cost_usd: null,
        what: `Merge two shared fields: ${m.mergeKey} goes away and redirects to ${m.keepKey}. Reason: ${m.reason}`,
        ...(holds(actor, "review") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Approve or reject the merge", href: null, note: NO_PAGE } } : { state: "waiting" as const, waiting_on: mine ? "You proposed it; a different person approves or rejects it." : "A content publisher approves or rejects it.", next: null }) });
    }

    // Held files (P-80) and new editions held for impact review (P-32), from the one intake.
    for (const h of held) {
      const where = h.combinationId ? `/c/${h.combinationId}?show=held` : "/library/forms";
      const label = h.editionLabel ?? h.code ?? h.fileName;
      if (h.outcome === "held") {
        const mine = h.createdBy === actor.id;
        out.push({ id: `held:${h.id}`, kind: "held_file", title: label, by: nameOf(h.createdBy), at: h.createdAt.toISOString(), cost_usd: null,
          what: "Not on the approved source list: not read into the library, attached or sent to AI.",
          ...(holds(actor, "review") && !mine ? { state: "needs" as const, waiting_on: null, next: { label: "Check the source", href: where, note: "Approving a held file in the product is not built yet (P-80)." } } : { state: "waiting" as const, waiting_on: mine ? "You uploaded it; a different person checks the source." : "A content publisher checks the source.", next: null }) });
      } else {
        const older = h.outcome === "older_edition_held";
        out.push({ id: `held:${h.id}`, kind: "new_edition", title: label, by: nameOf(h.createdBy), at: h.createdAt.toISOString(), cost_usd: null,
          what: older ? "An older edition than the one in the library: it is not used unless a person decides otherwise." : "A newer edition of a form in the library: nothing changes until a person reviews its impact and releases it.",
          ...(holds(actor, "author") ? { state: "needs" as const, waiting_on: null, next: { label: older ? "See the older edition" : "Review impact", href: where, note: older ? null : "The impact review is not built yet; the edition is held." } } : { state: "waiting" as const, waiting_on: "The configuration author reviews it.", next: null }) });
      }
    }

    // AI work still running: shown so a person knows it is coming, never as something to decide.
    for (const b of batches) {
      const spent = b.jobs.reduce((s, j) => s + (j.costUsd ?? 0), 0), done = b.jobs.filter((j) => !["QUEUED", "RUNNING"].includes(j.status)).length;
      out.push({ id: `batch:${b.id}`, kind: "running", title: b.scopeLabel, by: nameOf(b.startedBy), at: b.startedAt.toISOString(), cost_usd: Math.round(spent * 100) / 100,
        what: `${b.status === "QUEUED" ? "Queued" : "Running"}: ${done} of ${plural(b.jobs.length, "step")} finished · worst case US$${b.worstCaseUsd.toFixed(2)}.`, state: "running" as const, waiting_on: null, next: { label: "View progress", href: `/ai/${b.id}`, note: null } });
    }
    return out;
  }
}

@Controller("api")
export class ReviewQueueController {
  constructor(@Inject(ReviewQueueService) private readonly s: ReviewQueueService) {}
  @Get("review-queue") list(@Headers("x-actor") a: string | undefined, @Query() q: unknown) { return this.s.list(actorOf(a), q); }
}
