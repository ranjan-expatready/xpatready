// C9.2 Undo a changed fact (runtime lane, M3-F; r5c BR-12; P-65, P-136; M3-CONTRACT C9.2): the case officer puts back
// the earlier value of one fact of one person. Nothing is changed in place (append-only, as every answer): the current
// answer is superseded by a new row carrying the earlier value with its earlier status and source (so a confirmation
// made then counts again), stamped with who restored it and when. The items that went Out of date because of the change
// read the case again and are current once more (case-prepare.ts). A client and configuration people cannot (staff
// route). US$0.
import { randomUUID } from "node:crypto";
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { undoTarget } from "../../engine/runtime/out-of-date.ts";
import { actorOf, Audit, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELD_KEY = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const short = (id: string) => id.slice(0, 8);
const UndoBody = z.object({
  subjectId: z.string({ error: "Name the person whose answer to undo (subjectId)." }).regex(UUID, "Name the person whose answer to undo (subjectId)."),
  fact: z.string({ error: "Name the fact to undo (fact)." }).regex(FIELD_KEY, "Name the fact to undo (fact)."),
  /** Optional: the answer the officer saw; when sent and no longer current, nothing is changed (409, Reload). */
  expectedId: z.string().regex(UUID, "Send the id of the answer you saw (Reload).").nullable().optional(),
});
const conflict = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed since you read it", status: 409, detail }, HttpStatus.CONFLICT); };

@Injectable()
export class CaseChanges {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  /** POST /runtime/cases/:id/changes/undo {subjectId, fact}: the earlier value of one single answer, restored. */
  async undo(actor: Actor, caseId: string, body: unknown) {
    if (!UUID.test(caseId)) fail("No such case.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, caseId, "officer");
    const parsed = UndoBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const who = c.participants.find((p) => p.subjectId === b.subjectId);
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    const s = this.r.snapshotOf(c);
    const field = (s.canonical_fields as { id: string; value_type?: string }[]).find((f) => f.id === b.fact);
    const place = (s.placements as { fact: string; repeats: string; question_text?: string | null }[]).find((p) => p.fact === b.fact);
    if (!field || !place) fail(`The release this case works from does not ask for ${b.fact}.`, HttpStatus.NOT_FOUND);
    // P-97, P-130: a declaration is always the client's own; the officer never makes it, so never restores one either.
    if (field!.value_type === "declaration") fail("Only the client makes this declaration, in their own questionnaire; the officer cannot undo it for them.", HttpStatus.FORBIDDEN);
    if (place!.repeats === "per_row") fail("Undo works on a single answer; an entry in a list is changed in its own row.", HttpStatus.UNPROCESSABLE_ENTITY);
    const words = place!.question_text || b.fact;

    const out = await this.db.$transaction(async (tx) => {
      // One undo at a time per case (the Prepare view's lock): two undos from one read never both restore.
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      const current = await tx.clientCanonicalAnswer.findFirst({ where: { subjectId: b.subjectId, canonicalFieldKey: b.fact, rowKey: null, supersededById: null } });
      if (!current) return { nothing: `${words} has no answer for this person, so there is nothing to undo.` } as const;
      if (b.expectedId && b.expectedId !== current.id) conflict("This answer changed after you read it. Reload, then undo again if you still need to.");
      const earlier = await tx.clientCanonicalAnswer.findMany({ where: { subjectId: b.subjectId, canonicalFieldKey: b.fact, rowKey: null, id: { not: current.id } }, orderBy: [{ effectiveAt: "desc" }, { id: "desc" }] });
      const target = undoTarget({ ...current, value: current.valueJson }, earlier.map((x) => ({ ...x, value: x.valueJson })));
      if (!target) return { nothing: `${words} has no earlier value for this person, so there is nothing to undo.` } as const;
      const id = randomUUID(), at = new Date();
      const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: current.id, supersededById: null }, data: { supersededById: id } });
      if (n.count !== 1) conflict("Someone changed this answer at the same moment. Reload, then undo again if you still need to.");
      const source = { ...(target.sourceJson as Record<string, unknown>), restored: { by: actor.id, at: at.toISOString(), undid: current.id, from: target.id } };
      await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: current.workspaceId, partyId: current.partyId, subjectId: current.subjectId, canonicalFieldId: target.canonicalFieldId, canonicalFieldKey: b.fact, rowKey: null, valueJson: target.valueJson as object, status: target.status, sourceJson: source, verifiedBy: target.verifiedBy, verifiedAt: target.verifiedAt, effectiveAt: at } });
      return { id, was: current.valueJson, now: target.valueJson, undid: current.id, from: target.id, status: target.status, at } as const;
    });
    if ("nothing" in out) fail(out.nothing!, HttpStatus.CONFLICT);
    const done = out as Exclude<typeof out, { nothing: string }>;
    // The values stay on the answer rows; the audit line names the fact, the person's role and the case only (as answers).
    await this.audit.log(c.workspaceId, actor.id, "changed", "case fact", b.fact, `${actor.name} undid the last change to ${b.fact} for the ${who!.role.replace(/_/g, " ")} on case ${short(c.id)}: the earlier value is restored`, { undid: done.undid, restored_from: done.from });
    return { subject_id: b.subjectId, fact: b.fact, answer: { id: done.id, value: done.now, status: done.status, restored_from: done.from }, undid: { id: done.undid, value: done.was }, at: done.at.toISOString(),
      message: `Undone: ${words} is back to its earlier value. Items that were out of date because of this change are current again if nothing else changed.` };
  }
}

@CaseRead()
@Controller("api/runtime")
export class CaseChangesController {
  constructor(@Inject(CaseChanges) private readonly s: CaseChanges) {}
  @Post("cases/:id/changes/undo") @HttpCode(HttpStatus.OK) undo(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.undo(actorOf(a), id, b); }
}
