// Screen 02 slice 3, K2 (C3.4, C2.6): AI drafts document requirements (and later sections, rules and checks) from a
// combination's official checklist, reviewed beside the source like a field-map draft, applied through the existing
// writers. Until the founder agrees the one live run (challenge point 3, Lead response: IMM 5483, Sample estimate under
// US$0.50, cap US$5), only the stub pass runs: it proves the path (job, review, apply) with no network, no cost and no
// AI content, so it proposes nothing. Live is refused with that reason.
import { Body, Controller, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { actorOf, Audit, Db, fail, need, Workspace, type Actor } from "./core.ts";
import { Studio } from "./studio.ts";
import { reviewRow } from "./proposals.ts";

export const CHECKLIST_KINDS = ["document_requirement", "section", "rule", "check"] as const;
/** What a checklist proposal carries in its payload (ProposalItem kind requirement_line; its review row says document_requirement). */
export type RequirementProposal = { document_type: string; who: string; base_or_conditional: "base" | "conditional"; condition_plain?: string | null; provided_by?: string };

@Injectable()
export class Checklists {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio) {}

  async draft(actor: Actor, attachmentId: string, body: { mode?: string }) {
    need(actor, "author");
    const a = await this.db.sourceAttachment.findUnique({ where: { id: attachmentId } }).catch(() => null);
    if (!a) fail("This source does not exist.", HttpStatus.NOT_FOUND);
    if (!a!.recognised || a!.kind !== "Document checklist") fail("Only an approved official document checklist is drafted into requirements.");
    // One open draft per checklist (break m9: twenty clicks made twenty drafts): the open one is returned.
    if ((body?.mode ?? "stub") !== "stub") fail("A live draft from a checklist waits for the founder's OK on its cost (Sample estimate under US$0.50, capped at US$5). Run the stub pass to see the path.", HttpStatus.CONFLICT);
    // Looked up and created under one lock per checklist, so drafts started at the same moment share one job.
    const { job, made } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checklist-draft:${attachmentId}`}))`;
      const open = await tx.draftingJob.findFirst({ where: { attachmentId, kind: "checklist_draft", status: "COMPLETED" }, orderBy: { startedAt: "desc" } });
      if (open) return { job: open, made: false };
      return { made: true, job: await tx.draftingJob.create({ data: { workspaceId: a!.workspaceId, combinationId: a!.combinationId, attachmentId: a!.id, kind: "checklist_draft", mode: "STUB", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
      message: `Stub pass of the checklist drafting path for ${a!.edition ?? a!.fileName}: no network, no cost, no AI content, so nothing is proposed. A live draft proposes the document requirements with the checklist's own words beside each.`,
      detail: { operation: "draft_from_checklist", source: a!.edition, kinds: CHECKLIST_KINDS } } }) };
    });
    if (!made) return job;
    await this.audit.log(a!.workspaceId, actor.id, "started", "checklist draft", a!.edition ?? a!.fileName, `${actor.name} ran the stub pass of the checklist drafting path on ${a!.edition ?? a!.fileName} (no AI, US$0)`, undefined, a!.combinationId);
    return job;
  }

  /** Applies the accepted proposals of a checklist draft through the combination's own writers (draft rows; release
   *  follows review). Document requirements only in this slice; other kinds are listed as not applied. */
  async apply(actor: Actor, jobId: string) {
    need(actor, "author");
    const found = await this.db.draftingJob.findUnique({ where: { id: jobId }, include: { proposals: true } }).catch(() => null);
    const job = found && { ...found, items: found.proposals.map(reviewRow) };
    if (!job || job.kind !== "checklist_draft") fail("This is not a checklist draft.", HttpStatus.NOT_FOUND);
    if (job!.status !== "COMPLETED") fail(job!.status === "APPLIED" ? "Already applied." : "The draft is not ready.", HttpStatus.CONFLICT);
    const pending = job!.items.filter((i) => i.decision === "PENDING");
    if (pending.length) fail(`${pending.length} proposal${pending.length === 1 ? " is" : "s are"} still undecided.`);
    const a = await this.db.sourceAttachment.findUniqueOrThrow({ where: { id: job!.attachmentId! } });
    const types = await this.db.documentType.findMany({ where: { workspaceId: job!.workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { documentTypeKey: true, name: true } });
    // Every accepted proposal is checked before anything is written (break M7: a malformed one failed half-way after the
    // draft was already marked applied).
    const plan: { item: ReturnType<typeof reviewRow>; typeKey: string; p: RequirementProposal }[] = []; const skipped: string[] = []; const bad: string[] = [];
    for (const i of job!.items.filter((x) => x.decision === "ACCEPTED")) {
      if (i.kind !== "document_requirement") { skipped.push(`${i.proposedKey} (${i.kind.replace("_", " ")}: applied by hand in this slice)`); continue; }
      const p = (i.payload ?? {}) as Partial<RequirementProposal>;
      if (typeof p.document_type !== "string" || !p.document_type.trim() || typeof p.who !== "string" || !["base", "conditional"].includes(String(p.base_or_conditional)) || (p.condition_plain !== undefined && p.condition_plain !== null && typeof p.condition_plain !== "string")) { bad.push(i.proposedMeaning || i.proposedKey); continue; }
      const type = types.find((t) => t.documentTypeKey === p.document_type || t.name.toLowerCase() === p.document_type!.toLowerCase());
      if (!type) { skipped.push(`${p.document_type} (no such document type in the library yet)`); continue; }
      plan.push({ item: i, typeKey: type.documentTypeKey, p: p as RequirementProposal });
    }
    if (bad.length) fail(`${bad.length} accepted proposal${bad.length === 1 ? " is" : "s are"} incomplete (no document type, person or kind): return ${bad.length === 1 ? "it" : "them"}, then apply. For example: ${bad[0]}.`);
    const claimed = await this.db.draftingJob.updateMany({ where: { id: jobId, status: "COMPLETED" }, data: { status: "APPLIED" } });
    if (!claimed.count) fail("Already applied.", HttpStatus.CONFLICT);
    let added = 0;
    try {
      for (const { item, typeKey, p } of plan) {
        await this.studio.saveRequirement(actor, job!.combinationId!, null, { documentTypeKey: typeKey, attachMode: p.base_or_conditional === "conditional" ? "ANSWER_CONDITIONAL" : "COMBINATION_MANDATORY", conditionPlain: p.condition_plain ?? undefined, appliesToRoles: p.who, providedBy: p.provided_by ?? "client", sourceQuote: item.sourceQuote ?? undefined, sourceFile: a.officialFile ?? a.fileName });
        added++;
      }
    } catch (e) {
      // Nothing half-applied is left marked done: the draft can be applied again once the cause is fixed.
      await this.db.draftingJob.update({ where: { id: jobId }, data: { status: "COMPLETED" } });
      throw e;
    }
    await this.audit.log(job!.workspaceId, actor.id, "applied", "checklist draft", a.edition ?? a.fileName, `${actor.name} applied the reviewed checklist draft of ${a.edition ?? a.fileName}: ${added} document requirements added to the draft${skipped.length ? `; not applied: ${skipped.join(", ")}` : ""}`, undefined, job!.combinationId ?? undefined);
    return { added, skipped };
  }
}

@Controller("api")
export class ChecklistsController {
  constructor(@Inject(Checklists) private readonly c: Checklists) {}
  @Post("attachments/:id/draft-checklist") draft(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.c.draft(actorOf(a), id, (b ?? {}) as { mode?: string }); }
  @Post("jobs/:id/apply-checklist") apply(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { return this.c.apply(actorOf(a), id); }
}
