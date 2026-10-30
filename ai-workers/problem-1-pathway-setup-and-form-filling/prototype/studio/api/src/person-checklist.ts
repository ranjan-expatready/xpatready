// W1-15 Questions and documents, slice 3 (runtime lane; board v2 frame 3, P-147; plan.md "Slice 3"): the Documents tab's
// checklist per person. The lines, what each supplies about whom and whether that answer is taken out of the
// questionnaire come from the engine (engine/sources.ts checklist, beside documentFacts), so Questions and Documents
// agree. Here: the read, the order per person ("Move up or down": at once, with a History line, out with the next
// release) and the Undo of the author's own removal in the draft. Adding, editing and removing a line stay the existing
// requirement routes (api/src/studio.ts saveRequirement). US$0.
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { checklist, factSourceProblems } from "../../engine/sources.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { actorOf, Audit, Db, need, readerOf, revise, strip, type Actor } from "./core.ts";

type H = string | undefined;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const NOT_YOURS = "Only the person who made this draft can undo it.";

const Move = z.object({
  lineage: z.string({ error: "Say which line to move." }).min(1).max(200),
  role: z.string({ error: "Say whose checklist." }).min(1).max(80),
  direction: z.enum(["up", "down"], { message: "Move it up or down." }),
});
const UndoRemove = z.object({ lineage: z.string({ error: "Say which line to put back." }).min(1).max(200) });

@Injectable()
export class PersonChecklists {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  private async combination(id: string, writing = true) {
    const c = /^[0-9a-f-]{36}$/i.test(id) ? await this.db.combination.findUnique({ where: { id } }) : null;
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    if (writing && c.retiredAt) throw problem(409, "Retired", `"${c.label}" is retired: its checklist is not changed. Restore it on Structure first; open cases keep their release.`);
    return c;
  }
  private async since(id: string) {
    return (await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { releasedAt: "desc" }, select: { releasedAt: true } }))?.releasedAt ?? new Date(0);
  }

  /** Each person's checklist, the lines removed in this draft (with who removed them), and the release checks. */
  async list(id: string) {
    const c = await this.combination(id, false);
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const rows = await this.db.documentRequirement.findMany({ where: { combinationId: id }, orderBy: { version: "desc" } });
    const since = await this.since(id);
    const newest = new Map<string, (typeof rows)[number]>(); for (const r of rows) if (!newest.has(r.lineageKey)) newest.set(r.lineageKey, r);
    const types = await this.db.documentType.findMany({ where: { workspaceId: c.workspaceId, documentTypeKey: { in: [...newest.values()].map((r) => r.documentTypeKey) } }, select: { documentTypeKey: true, name: true } });
    const removed = [...newest.values()].filter((r) => r.status === "RETIRED" && r.updatedAt > since).map((r) => ({ lineage: r.lineageKey, document: types.find((t) => t.documentTypeKey === r.documentTypeKey)?.name ?? r.documentTypeKey, who: r.appliesToRoles, by: r.updatedBy, at: r.updatedAt.toISOString() }));
    const roles = checklist(snapshot).map((x) => ({ ...x, lines: x.lines.map((l) => ({ ...l, by: newest.get(l.lineage)?.updatedBy ?? null })) }));
    return { roles, removed, problems: factSourceProblems(snapshot).filter((p) => p.level === "error"), basis: "Sample until the immigration expert confirms" };
  }

  /** Move up or down in one person's checklist: at once, a History line, out with the next release (board v2 frame 3). */
  async move(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const parsed = Move.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const c = await this.combination(id);
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const list = checklist(snapshot).find((x) => x.role === b.role)?.lines ?? [];
    const i = list.findIndex((l) => l.lineage === b.lineage);
    if (i < 0) throw problem(404, "Not on this checklist", "That document is not on this person's checklist any more. Reload.");
    const j = b.direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) throw problem(409, "Already there", b.direction === "up" ? "It is already first on this checklist." : "It is already last on this checklist.");
    // Swap the two lines' places; every other line keeps its own (one move = two draft changes).
    const [a, z] = [list[i], list[j]];
    const ranks: [string, number][] = a.rank === z.rank ? [[a.lineage, z.rank + (b.direction === "up" ? -1 : 1)], [z.lineage, a.rank]] : [[a.lineage, z.rank], [z.lineage, a.rank]];
    for (const [lineage, want] of ranks) {
      const rows = await this.db.documentRequirement.findMany({ where: { combinationId: id, lineageKey: lineage } });
      await revise(this.db.documentRequirement, rows, { position: want }, actor.id, strip);
    }
    const label = list.find((l) => l.lineage === b.lineage)!.document.name;
    const whose = checklist(snapshot).find((x) => x.role === b.role)?.label ?? b.role;
    await this.audit.log(c.workspaceId, actor.id, "updated", "document requirement", b.lineage, `${actor.name} moved "${label}" ${b.direction} in ${whose}'s checklist in "${c.label}" (draft)`, undefined, id);
    return this.list(id);
  }

  /** Undo of the author's own removal in this draft: a line kept from a release comes back as it was; a line added in this
   *  draft comes back as a draft. A removal another person made is theirs to undo. */
  async undoRemove(actor: Actor, id: string, body: unknown) {
    if (!(actor.duties as readonly string[]).includes("author")) throw problem(403, "Not yours", NOT_YOURS);
    const parsed = UndoRemove.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const c = await this.combination(id);
    const rows = await this.db.documentRequirement.findMany({ where: { combinationId: id, lineageKey: parsed.data.lineage }, orderBy: { version: "desc" } });
    const newest = rows[0];
    if (!newest || newest.status !== "RETIRED") throw problem(409, "Nothing to undo", "That document is on the checklist: there is no removal to undo.");
    if (newest.updatedAt <= (await this.since(id))) throw problem(409, "Released since", "That removal was released meanwhile: a release is never undone. Add the document again in a new draft.");
    if (newest.updatedBy !== actor.id) throw problem(409, "Not yours", NOT_YOURS);
    if (newest.supersedesId) await this.db.documentRequirement.delete({ where: { id: newest.id } });
    else await this.db.documentRequirement.update({ where: { id: newest.id }, data: { status: "DRAFT" } });
    await this.audit.log(c.workspaceId, actor.id, "restored", "document requirement", newest.lineageKey, `${actor.name} undid their removal of document requirement ${newest.lineageKey} in "${c.label}" (draft)`, undefined, id);
    return this.list(id);
  }
}

@Controller("api")
export class PersonChecklistsController {
  constructor(@Inject(PersonChecklists) private readonly x: PersonChecklists) {}
  @Get("combinations/:id/checklist") list(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.x.list(id); }
  @Post("combinations/:id/checklist/move") @HttpCode(200) move(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.move(actorOf(a), id, b); }
  @Post("combinations/:id/checklist/undo-remove") @HttpCode(200) undoRemove(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.undoRemove(actorOf(a), id, b); }
}
