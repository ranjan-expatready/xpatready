// Firm, users and case team (C6.11, M3-11, BR-20; stand-ins SI-9 and SI-15). The Sample firm and the Sample solo firm
// are seeded from samples/firms.json (no sign-up, invitations or user screens); the firm admin's only action is to
// assign and reassign a case's team, with history. One representative of record per case (the database refuses a
// second, migration 20261101130000_c611_case_team); a new representative asks for a new IMM 5476 (BR-12). Staff of
// one firm reach none of another firm's cases. Audit lines name people by their Sample user id, never by a typed value.
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post, Put } from "@nestjs/common";
import type { z } from "zod";
import { AddCaseOfficer, ChangeRepresentative, EndCaseOfficer } from "../../contracts/runtime.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { cannotAssign, cannotBeOfficer, cannotRepresent, current, imm5476, representativeFacts, representativeOf, userIn, type Firm, type Member, type TeamRole } from "../../engine/runtime/team.ts";
import { actorOf, Audit, CaseRead, Db, fail, type Actor } from "./core.ts";
import { FIRMS, firmOfActor, STAND_IN } from "./firms.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;
const short = (id: string) => id.slice(0, 8);
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
const refused = (detail: string, status = HttpStatus.CONFLICT): never => { throw new HttpException({ type: "https://expatready.local/problems/not-possible", title: "Not possible now", status, detail }, status); };
const fieldError = (field: string, message: string): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 422, detail: message, errors: [{ field, message }] }, HttpStatus.UNPROCESSABLE_ENTITY); };
const unique = (e: unknown) => (e as { code?: string }).code === "P2002";
const person = (firm: Firm, id: string) => { const u = userIn(firm, id); return { id, name: u?.name ?? id, licence: u?.licence ?? null }; };

@Injectable()
export class Team {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Runtime) private readonly runtime: Runtime, @Inject(Audit) private readonly audit: Audit) {}

  /** The acting staff member's firm and its users (what "Open a case" offers). */
  firm(actor: Actor) {
    const f = firmOfActor(actor);
    if (!f) fail(`${actor.name} (simulated) is not staff of a firm.`, HttpStatus.FORBIDDEN);
    const you = userIn(f!, actor.id)!;
    return { key: f!.key, name: f!.name, solo: f!.solo, default_representative: f!.defaultRepresentative ?? null, stand_in: STAND_IN, you: { id: you.id, duties: you.duties },
      users: f!.users.map((u) => ({ id: u.id, name: u.name, duties: u.duties, licence: u.licence, may_represent: !cannotRepresent(f!, u.id), may_be_officer: !cannotBeOfficer(f!, u.id) })) };
  }

  private async members(caseId: string): Promise<Member[]> {
    return (await this.db.caseTeamMember.findMany({ where: { caseId }, orderBy: [{ assignedAt: "asc" }, { id: "asc" }] })).map((m) => ({ ...m, role: m.role as TeamRole }));
  }

  /** The case team now, its history and IMM 5476's representative part. Staff of the case's firm only. */
  async team(actor: Actor, caseId: string) {
    const c = await this.runtime.reach(actor, caseId, "officer");
    const firm = FIRMS.find((f) => f.key === c.firmKey)!;
    const all = await this.members(caseId), now = current(all), rep = representativeOf(all);
    const you = userIn(firm, actor.id);
    return {
      firm: { key: firm.key, name: firm.name, solo: firm.solo }, stand_in: STAND_IN,
      representative: rep ? { ...person(firm, rep.userId), since: rep.assignedAt } : null,
      officers: now.filter((m) => m.role === "OFFICER").map((m) => ({ ...person(firm, m.userId), since: m.assignedAt })),
      history: [...all].reverse().map((m) => ({ user: person(firm, m.userId).name, user_id: m.userId, role: m.role, assigned_by: m.assignedBy, assigned_at: m.assignedAt, ended_at: m.endedAt, ended_by: m.endedBy, reason: m.endReason })),
      imm5476: { facts: representativeFacts(firm, all), ...imm5476(all) },
      may_assign: !!you && !cannotAssign(firm, actor.id),
    };
  }

  /** The firm admin names a new representative of record. The earlier one's row ends with the reason (history kept); the
   *  case row is locked so two changes at once happen one after the other. */
  async changeRepresentative(actor: Actor, caseId: string, body: unknown) {
    const c = await this.runtime.reach(actor, caseId, "officer");
    const firm = FIRMS.find((f) => f.key === c.firmKey)!;
    const no = cannotAssign(firm, actor.id); if (no) fail(no, HttpStatus.FORBIDDEN);
    const b = parse(ChangeRepresentative, body);
    const why = cannotRepresent(firm, b.userId); if (why) fieldError("userId", why);
    let earlier: string | null = null;
    try {
      await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${caseId}::uuid FOR UPDATE`;
        const rep = await tx.caseTeamMember.findFirst({ where: { caseId, role: "LEAD_REPRESENTATIVE", endedAt: null } });
        if (rep?.userId === b.userId) refused(`${person(firm, b.userId).name} is already the representative of record; nothing changed.`);
        const at = new Date();
        if (rep) { earlier = rep.userId; await tx.caseTeamMember.update({ where: { id: rep.id }, data: { endedAt: at, endedBy: actor.id, endReason: b.reason } }); }
        await tx.caseTeamMember.create({ data: { workspaceId: c.workspaceId, caseId, userId: b.userId, role: "LEAD_REPRESENTATIVE", assignedBy: actor.id, assignedAt: at } });
      });
    } catch (e) { if (unique(e)) refused("The representative of record changed at the same moment; nothing changed. Reload and try again."); throw e; }
    await this.audit.log(c.workspaceId, actor.id, "representative_changed", "case", caseId, `${actor.name} made ${b.userId} the representative of record on case ${short(caseId)}${earlier ? ` (was ${earlier}); a new IMM 5476 is needed` : ""}`);
    return this.team(actor, caseId);
  }

  async addOfficer(actor: Actor, caseId: string, body: unknown) {
    const c = await this.runtime.reach(actor, caseId, "officer");
    const firm = FIRMS.find((f) => f.key === c.firmKey)!;
    const no = cannotAssign(firm, actor.id); if (no) fail(no, HttpStatus.FORBIDDEN);
    const b = parse(AddCaseOfficer, body);
    const why = cannotBeOfficer(firm, b.userId); if (why) fieldError("userId", why);
    try { await this.db.caseTeamMember.create({ data: { workspaceId: c.workspaceId, caseId, userId: b.userId, role: "OFFICER", assignedBy: actor.id } }); }
    catch (e) { if (unique(e)) refused(`${person(firm, b.userId).name} is already a case officer on this case; nothing changed.`); throw e; }
    await this.audit.log(c.workspaceId, actor.id, "officer_assigned", "case", caseId, `${actor.name} assigned ${b.userId} as case officer on case ${short(caseId)}`);
    return this.team(actor, caseId);
  }

  async endOfficer(actor: Actor, caseId: string, userId: string, body: unknown) {
    const c = await this.runtime.reach(actor, caseId, "officer");
    const firm = FIRMS.find((f) => f.key === c.firmKey)!;
    const no = cannotAssign(firm, actor.id); if (no) fail(no, HttpStatus.FORBIDDEN);
    const b = parse(EndCaseOfficer, body);
    const n = await this.db.caseTeamMember.updateMany({ where: { caseId, userId, role: "OFFICER", endedAt: null }, data: { endedAt: new Date(), endedBy: actor.id, endReason: b.reason } });
    if (n.count !== 1) refused("That person is not a case officer on this case now; nothing changed.", HttpStatus.NOT_FOUND);
    await this.audit.log(c.workspaceId, actor.id, "officer_ended", "case", caseId, `${actor.name} took ${userId} off case ${short(caseId)} as case officer`);
    return this.team(actor, caseId);
  }
}

@CaseRead()
@Controller("api/runtime")
export class TeamController {
  constructor(@Inject(Team) private readonly t: Team) {}
  @Get("firm") firm(@Headers("x-actor") a: H) { return this.t.firm(actorOf(a)); }
  @Get("cases/:id/team") team(@Headers("x-actor") a: H, @Param("id") id: string) { return this.t.team(actorOf(a), id); }
  @Put("cases/:id/team/representative") rep(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.t.changeRepresentative(actorOf(a), id, b); }
  @Post("cases/:id/team/officers") add(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.t.addOfficer(actorOf(a), id, b); }
  @Post("cases/:id/team/officers/:user/end") end(@Headers("x-actor") a: H, @Param("id") id: string, @Param("user") u: string, @Body() b: unknown) { return this.t.endOfficer(actorOf(a), id, u, b); }
}
