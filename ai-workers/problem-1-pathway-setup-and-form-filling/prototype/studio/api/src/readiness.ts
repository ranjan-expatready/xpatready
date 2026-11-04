// C7.6 Ready to file (runtime lane, M3-E; L-SA3 under P-315, P-237, P-238; P-144, P-151, P-155; M3-CONTRACT C7.6):
// the filing routes (the prepare view shows each filing's readiness, worked out from api/src/readiness-inputs.ts):
// the representative's review, a warning passed with a reason, "Ready to file", and IRCC's
// accepted-until date of a form edition (configuration). The only hard stop is a barcode form without its own Validate
// read back (P-237, P-238); every former block is a CRITICAL warning a permitted person passes with a recorded reason.
// Who may (AG-07 AG07-D24 and D25, `agent/case:waive-deficiency` seeded on the Owner, Admin, Case Manager and Case
// Officer roles): any staff member on the case's firm passes a warning and marks a filing ready; the review is the
// representative of record's own (P-155), "Self-reviewed" when they prepared it themself; a client and configuration
// people get 403. The inputs: api/src/readiness-inputs.ts. Legal points: Unconfirmed: no counsel. US$0.
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post } from "@nestjs/common";
import { cannotPass, CODE_WORDS, dayOf, isCritical, passKeys, passProblem, WARN_CODES, type WarnCode } from "../../engine/runtime/readiness.ts";
import type { ReadinessView } from "./readiness-inputs.ts";
import { userIn } from "../../engine/runtime/team.ts";
import { actorOf, Audit, Db, fail, Workspace, type Actor } from "./core.ts";
import { firmOfActor } from "./firms.ts";
import { Runtime } from "./runtime.ts";
import { CasePrepare } from "./case-prepare.ts";

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}): never => { throw new HttpException({ type: "https://expatready.local/problems/readiness", title, status, detail, ...extra }, status); };

@Injectable()
export class FilingReadinessRoutes {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit,
    @Inject(CasePrepare) private readonly prepare: CasePrepare, @Inject(Workspace) private readonly ws: Workspace) {}

  /** The filing, reached as staff of its case's firm (a client, configuration people and another firm: 403 or 404). */
  private async filing(actor: Actor, id: string) {
    const f = UUID.test(id) ? await this.db.filing.findUnique({ where: { id } }) : null;
    if (!f || !f.active) fail("No such filing.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, f!.caseId, "officer");
    return { f: f!, c };
  }
  private async now(actor: Actor, caseId: string, filing: string) {
    const v = await this.prepare.view(actor, caseId) as { readiness: ReadinessView[] };
    const rd = v.readiness.find((x) => x.filing === filing);
    if (!rd) fail("This filing's readiness could not be worked out (it is not on the application now).", HttpStatus.CONFLICT);
    return rd!;
  }

  /** POST /runtime/filings/:id/review {note?, self?}: the representative of record's review (P-155). When they are also
   *  a case officer on the case (they prepared it: a solo firm), it is "Self-reviewed", logged with their own statement. */
  async review(actor: Actor, id: string, body: unknown) {
    const { f, c } = await this.filing(actor, id);
    const team = await this.db.caseTeamMember.findMany({ where: { caseId: c.id, endedAt: null } });
    const rep = team.find((m) => m.role === "LEAD_REPRESENTATIVE")?.userId ?? null;
    if (!rep || rep !== actor.id) fail("Only the representative of record reviews this filing (P-155). A case officer prepares it; the representative reviews it.", HttpStatus.FORBIDDEN);
    const b = (body ?? {}) as { note?: unknown; self?: unknown };
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 400) : null;
    const prepared = team.some((m) => m.role === "OFFICER" && m.userId === actor.id);
    if (prepared && b.self !== true) problem(400, "Some details need fixing", "You prepared this filing yourself: confirm \"I prepared and reviewed this filing myself\" (self: true). It is logged as Self-reviewed, never as a second person.", { errors: [{ field: "self", message: "Confirm you prepared and reviewed it yourself." }] });
    const firm = firmOfActor(actor), licence = firm ? userIn(firm, actor.id)?.licence ?? null : null;
    if (!licence) fail("A review needs the representative's licence number on the firm record; none is set.", HttpStatus.CONFLICT);
    const kind = prepared ? "self_reviewed" : "reviewed";
    const row = await this.db.filingReview.create({ data: { workspaceId: f.workspaceId, filingId: f.id, reviewedBy: actor.id, kind, licenceNumber: licence!.number, note } });
    await this.audit.log(f.workspaceId, actor.id, kind, "filing", f.id, `${actor.name} ${kind === "self_reviewed" ? "self-reviewed" : "reviewed"} a filing on case ${c.id.slice(0, 8)} (licence ${licence!.number})`, { case: c.id, note });
    const name = firm ? userIn(firm, actor.id)?.name ?? actor.name : actor.name;
    return { id: row.id, filing: f.id, reviewed_by: actor.id, name, kind, licence_number: licence!.number, at: row.reviewedAt.toISOString(),
      words: kind === "self_reviewed" ? `Self-reviewed by ${name} (licence ${licence!.number})` : `Reviewed by ${name} (licence ${licence!.number})` };
  }

  /** POST /runtime/filings/:id/warnings/:code/pass {reason, key?}: passes the open lines of one warning code (or one
   *  line, by its key) with a written reason; the keys covered are stored, so a later line needs its own pass. */
  async pass(actor: Actor, id: string, code: string, body: unknown) {
    const { f, c } = await this.filing(actor, id);
    const no = cannotPass(code);
    if (no) fail(no, (WARN_CODES as readonly string[]).includes(code) || code === "barcode_not_validated" ? HttpStatus.CONFLICT : HttpStatus.NOT_FOUND);
    const b = (body ?? {}) as { reason?: unknown; key?: unknown };
    const why = passProblem(b.reason);
    if (why) problem(400, "Some details need fixing", why, { errors: [{ field: "reason", message: why }] });
    const rd = await this.now(actor, c.id, f.id);
    const keys = passKeys(rd, code as WarnCode, typeof b.key === "string" ? b.key : undefined);
    if (!keys.length) fail(`There is no open "${CODE_WORDS[code as WarnCode]}" warning on this filing to pass. Reload.`, HttpStatus.CONFLICT);
    const reason = (b.reason as string).trim(), severity = isCritical(code) ? "critical" : "warning";
    const row = await this.db.readinessPass.create({ data: { workspaceId: f.workspaceId, filingId: f.id, code, keys, severity, reason, passedBy: actor.id } });
    await this.audit.log(f.workspaceId, actor.id, "warning_passed", "filing", f.id, `${actor.name} passed "${CODE_WORDS[code as WarnCode]}"${severity === "critical" ? " (CRITICAL)" : ""} on case ${c.id.slice(0, 8)}: ${reason}`, { case: c.id, code, severity, keys });
    return { id: row.id, filing: f.id, code, severity, keys, reason, by: actor.id, at: row.passedAt.toISOString() };
  }

  /** POST /runtime/filings/:id/ready: "Ready to file" (409 naming every block and open warning). */
  async ready(actor: Actor, id: string) {
    const { f, c } = await this.filing(actor, id);
    if (["SUBMITTED"].includes(f.status)) fail("This filing is already recorded as submitted.", HttpStatus.CONFLICT);
    const rd = await this.now(actor, c.id, f.id);
    if (!rd.ready) {
      const n = rd.blocks.length, w = rd.warns.length;
      problem(409, "Not ready to file", `${n ? `${n} block${n === 1 ? "" : "s"} (fix ${n === 1 ? "it" : "them"}: a barcode form needs its validated copy read back)` : ""}${n && w ? " and " : ""}${w ? `${w} open warning${w === 1 ? "" : "s"} (pass each with a reason, or fix ${w === 1 ? "it" : "them"})` : ""} stand before Ready to file.`,
        { blocks: rd.blocks, warns: rd.warns });
    }
    const n = await this.db.filing.updateMany({ where: { id: f.id, status: f.status }, data: { status: "READY_TO_FILE" } });
    if (n.count !== 1) fail("This filing changed since you read it. Reload, then mark it again.", HttpStatus.CONFLICT);
    await this.audit.log(f.workspaceId, actor.id, "ready_to_file", "filing", f.id, `${actor.name} marked a filing Ready to file on case ${c.id.slice(0, 8)} (${rd.passed.length} warning${rd.passed.length === 1 ? "" : "s"} passed with a reason)`, { case: c.id, passed: rd.passed.map((p) => ({ code: p.code, key: p.key, by: p.by })) });
    return { filing: f.id, status: "ready_to_file", passed: rd.passed, reviewed: rd.reviewed };
  }

  /** PATCH /editions/:id/accepted-until {acceptedUntil: YYYY-MM-DD | null, reason}: IRCC's accepted-until date for a
   *  replaced edition (P-151 (1)), set by a configuration author; null clears it. Every change is a new row. */
  async acceptedUntil(actor: Actor, id: string, body: unknown) {
    if (!(actor.duties as readonly string[]).includes("author")) fail(`${actor.name} (simulated) does not set form editions: a configuration author does.`, HttpStatus.FORBIDDEN);
    const workspaceId = await this.ws.id();
    const e = UUID.test(id) ? await this.db.formEdition.findFirst({ where: { id, workspaceId }, select: { id: true, editionLabel: true } }) : null;
    if (!e) fail("No such form edition.", HttpStatus.NOT_FOUND);
    const b = (body ?? {}) as { acceptedUntil?: unknown; reason?: unknown };
    if (!("acceptedUntil" in b)) problem(400, "Some details need fixing", "Send acceptedUntil: a date (YYYY-MM-DD), or null to clear it.", { errors: [{ field: "acceptedUntil", message: "Required (a date or null)." }] });
    let until: string | null = null;
    try { until = b.acceptedUntil === null ? null : dayOf(b.acceptedUntil as string, "acceptedUntil"); }
    catch { problem(400, "Some details need fixing", "acceptedUntil is not a date: write it as YYYY-MM-DD, or null to clear it.", { errors: [{ field: "acceptedUntil", message: "Not a date (YYYY-MM-DD)." }] }); }
    const why = passProblem(b.reason);
    if (why) problem(400, "Some details need fixing", why.replace("this warning is passed", "this date is set"), { errors: [{ field: "reason", message: why }] });
    const row = await this.db.formEditionAcceptedUntil.create({ data: { workspaceId, formEditionId: e!.id, acceptedUntil: until ? new Date(`${until}T00:00:00Z`) : null, reason: (b.reason as string).trim(), setBy: actor.id } });
    await this.audit.log(workspaceId, actor.id, "accepted_until", "form edition", e!.id, `${actor.name} set ${e!.editionLabel}'s accepted-until date to ${until ?? "none"}: ${row.reason}`);
    const history = await this.db.formEditionAcceptedUntil.findMany({ where: { formEditionId: e!.id }, orderBy: [{ setAt: "desc" }, { id: "desc" }] });
    return { edition: e!.id, label: e!.editionLabel, accepted_until: until, history: history.map((h) => ({ accepted_until: h.acceptedUntil?.toISOString().slice(0, 10) ?? null, reason: h.reason, by: h.setBy, at: h.setAt.toISOString() })) };
  }
}

@Controller("api/runtime")
export class FilingReadinessController {
  constructor(@Inject(FilingReadinessRoutes) private readonly x: FilingReadinessRoutes) {}
  @Post("filings/:id/review") @HttpCode(200) review(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.review(actorOf(a), id, b); }
  @Post("filings/:id/warnings/:code/pass") @HttpCode(200) pass(@Headers("x-actor") a: H, @Param("id") id: string, @Param("code") code: string, @Body() b: unknown) { return this.x.pass(actorOf(a), id, code, b); }
  @Post("filings/:id/ready") @HttpCode(200) ready(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.ready(actorOf(a), id); }
}

@Controller("api/editions")
export class EditionAcceptedUntilController {
  constructor(@Inject(FilingReadinessRoutes) private readonly x: FilingReadinessRoutes) {}
  @Patch(":id/accepted-until") until(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.acceptedUntil(actorOf(a), id, b); }
}
