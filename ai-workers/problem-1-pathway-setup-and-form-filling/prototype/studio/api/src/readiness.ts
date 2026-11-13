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
import { BLOCK_CODES, cannotPass, CODE_WORDS, dayOf, isCritical, passKeys, passProblem, WARN_CODES, type WarnCode } from "../../engine/runtime/readiness.ts";
import { selfReviewOf } from "../../engine/runtime/review.ts"; // BK-18 (review 4 M2): one self-review rule, one set of words
import type { ReadinessView } from "./readiness-inputs.ts";
import { userIn } from "../../engine/runtime/team.ts";
import { actorOf, Audit, Db, fail, Workspace, type Actor } from "./core.ts";
import { newestPin } from "./stage-scope.ts"; // C6.17
import { firmOfActor } from "./firms.ts";
import { Runtime } from "./runtime.ts";
import { CasePrepare } from "./case-prepare.ts";
import { busyWords } from "./busy.ts";
import { ReviewRounds } from "./review-rounds.ts"; // C8.3 (M1): the review is a one-step round
import { caseWork } from "./case-work.ts"; // BK-18 (QA-448): who really prepared the filing
import { authorsFor, behindOf, preparersOf } from "../../engine/runtime/preparers.ts";

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}): never => { throw new HttpException({ type: "https://expatready.local/problems/readiness", title, status, detail, ...extra }, status); };

@Injectable()
export class FilingReadinessRoutes {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit,
    @Inject(CasePrepare) private readonly prepare: CasePrepare, @Inject(Workspace) private readonly ws: Workspace, @Inject(ReviewRounds) private readonly rounds: ReviewRounds) {}

  /** The filing, reached as staff of its case's firm (a client, configuration people and another firm: 403 or 404).
   *  Break B8 on #861: a filing recorded as submitted is read-only here (C8.2 keeps its record). */
  private async filing(actor: Actor, id: string, open = true) {
    const f = UUID.test(id) ? await this.db.filing.findUnique({ where: { id } }) : null;
    if (!f || !f.active) fail("No such filing.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, f!.caseId, "officer");
    if (open && f!.status === "SUBMITTED") fail("This filing is recorded as submitted: its review and warnings are closed. Correct the record instead.", HttpStatus.CONFLICT);
    return { f: f!, c };
  }
  private async now(actor: Actor, caseId: string, filing: string) {
    const v = await this.prepare.view(actor, caseId) as { readiness: ReadinessView[] };
    const rd = v.readiness.find((x) => x.filing === filing);
    if (!rd) fail("This filing's readiness could not be worked out (it is not on the application now).", HttpStatus.CONFLICT);
    return rd!;
  }

  /** POST /runtime/filings/:id/review {note?, self?}: the representative of record's review (P-155). When the case's
   *  work record says they prepared it themself, it is "Self-reviewed", logged with their own statement (BK-18). */
  async review(actor: Actor, id: string, body: unknown) {
    const { f, c } = await this.filing(actor, id);
    // The case team, for the representative of record (who may review it); who prepared it is read below, from the work.
    const everyone = await this.db.caseTeamMember.findMany({ where: { caseId: c.id } });
    const rep = everyone.find((m) => m.role === "LEAD_REPRESENTATIVE" && !m.endedAt)?.userId ?? null;
    if (!rep || rep !== actor.id) fail("Only the representative of record reviews this filing (P-155). A case officer prepares it; the representative reviews it.", HttpStatus.FORBIDDEN);
    const b = (body ?? {}) as { note?: unknown; self?: unknown; facts_hash?: unknown; pin_revision?: unknown };
    // C9.5 (break m10): a review sent from a screen read before the case moved to another release is refused (the screen
    // sends the pin revision it read); the representative reviews what the case files now.
    // Breaker R2-m4 (round 2): once the case has moved, the screen always sends the revision it read; a review without it is refused.
    if (c.pins[0].revision > 1 && b.pin_revision === undefined) problem(400, "Some details need fixing", "Send pin_revision: the pin revision of the case you reviewed (this case moved to another release; Reload).", { errors: [{ field: "pin_revision", message: "The pin revision you read (Reload)." }] });
    if (b.pin_revision !== undefined && b.pin_revision !== c.pins[0].revision) fail("This case moved to another release after you opened the filing: nothing was recorded. Reload and review it again.", HttpStatus.CONFLICT);
    // Break N1 (#861 round 2): the review is of the facts the representative read: the view's `facts_hash` is sent back
    // and a filing changed since is refused (409, Reload), never stamped as reviewed for facts nobody saw.
    if (typeof b.facts_hash !== "string" || !/^[0-9a-f]{64}$/.test(b.facts_hash)) problem(400, "Some details need fixing", "Send facts_hash: the filing's facts_hash from the prepare view you reviewed.", { errors: [{ field: "facts_hash", message: "The facts_hash you read (Reload)." }] });
    // Break B6 on #861: a note is optional, but when given it follows the reason's text rule (no hidden or control
    // characters), and a long one is refused, never cut silently.
    if (b.note !== undefined && b.note !== null && typeof b.note !== "string") problem(400, "Some details need fixing", "Write the note as text.", { errors: [{ field: "note", message: "Text, or leave it out." }] });
    const note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
    const noteWhy = note ? (note.length > 400 ? "Keep the note to 400 characters." : /[\u0000-\u001f\u007f-\u009f\u200b\u200e\u200f\u2028-\u202e\u2066-\u2069\ufeff]/.test(note) ? "Remove the control or invisible characters from the note." : null) : null;
    if (noteWhy) problem(400, "Some details need fixing", noteWhy, { errors: [{ field: "note", message: noteWhy }] });
    const firm = firmOfActor(actor), licence = firm ? userIn(firm, actor.id)?.licence ?? null : null;
    // BK-18 (QA-448, P-525 (1)): who prepared it is the case's own work record, never its team list: a case officer
    // assigned to the case who did nothing neither prepared it nor makes the representative's own work a second person's
    // review (walk 1 step S8). Opening the case or sending it for review prepares nothing (review 2 B1, M1): it answers
    // only whether this person had the filing in their own hands on a case holding nobody's work.
    const w = await caseWork(this.db, c.id);
    const workers = authorsFor(actor.id, preparersOf(w.acts, w.staff), behindOf(w.acts, w.staff));
    // Break B9 (P-155 (1); review m8, the concept's BR-21: "a solo firm, or the representative did it all"): Self-reviewed
    // when the firm is solo or the representative is the only person who worked on the case; when another person worked
    // on it too, the one who prepared it does not review it as if a second person had. One rule for both review routes
    // (review 4 M2: this route kept its own copy of the words, which stopped being true when the author set changed).
    const sr = selfReviewOf({ actor: actor.id, prepared: workers, solo: !!firm?.solo, changedByReviewer: false, self: b.self });
    if ("problem" in sr) {
      const pr = sr.problem;
      if (pr.status === 400) problem(400, "Some details need fixing", pr.detail, { errors: [{ field: pr.field ?? "self", message: "Confirm you prepared and reviewed it yourself." }] });
      fail(pr.detail, pr.status);
    }
    const prepared = workers.has(actor.id);
    if (!licence) fail("A review needs the representative's licence number on the firm record; none is set.", HttpStatus.CONFLICT);
    const kind = (sr as { kind: "reviewed" | "self_reviewed" }).kind;
    // Break B2: the review is of the filing's facts as they are now; a later change reopens it.
    // C8.3 (challenge M1): the review is a one-step round of the representative's review, through the same code: every
    // form frozen and stamped (api/src/review-rounds.ts oneStep). A filing already sent for review is decided there (409).
    const one = await this.rounds.oneStepBasis(actor, c, f.id);
    const rd = one.rd;
    if (!rd) fail("This filing's readiness could not be worked out (it is not on the application now).", HttpStatus.CONFLICT);
    if (rd!.facts_hash !== b.facts_hash) fail("This filing changed after you read it. Reload and review it again.", HttpStatus.CONFLICT);
    // Devin on #1252 (C9.5): the review and its audit line are written under the case's row lock that a move takes, with
    // the pin revision read again under it: a move that committed after this review was read refuses it (409), so no
    // review of the release the case left is ever stamped after the new pin. (The facts are not re-read under the lock:
    // answer writes do not take it; a later fact change reopens the review as before, break B2.)
    const row = await busyWords(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`;
      const newest = await newestPin(tx, c.id, c.combinationId); // C6.17 (BR-9)
      if (newest?.revision !== c.pins[0].revision) fail("This case moved to another release while you reviewed the filing: nothing was recorded. Reload and review it again.", HttpStatus.CONFLICT);
      const made = await tx.filingReview.create({ data: { workspaceId: f.workspaceId, filingId: f.id, reviewedBy: actor.id, kind, licenceNumber: licence!.number, note, factsHash: rd!.facts_hash } });
      await this.rounds.oneStep(tx, c, actor, { filing: f.id, reviewId: made.id, kind, frames: one.frames, checks: one.checks });
      await tx.auditEvent.create({ data: { workspaceId: f.workspaceId, actor: actor.id, action: kind, entity: "filing", entityKey: f.id, summary: `${actor.name} ${kind === "self_reviewed" ? "self-reviewed" : "reviewed"} a filing on case ${c.id.slice(0, 8)} (licence ${licence!.number})`.slice(0, 600), detail: { case: c.id, note } } });
      return made;
    }, { timeout: 20_000, maxWait: 10_000 }));
    const name = firm ? userIn(firm, actor.id)?.name ?? actor.name : actor.name;
    return { id: row.id, filing: f.id, reviewed_by: actor.id, name, kind, licence_number: licence!.number, at: row.reviewedAt.toISOString(),
      words: kind === "self_reviewed" ? `Self-reviewed by ${name} (licence ${licence!.number})` : `Reviewed by ${name} (licence ${licence!.number})` };
  }

  /** POST /runtime/filings/:id/warnings/:code/pass {reason, key?}: passes the open lines of one warning code (or one
   *  line, by its key) with a written reason; the keys covered are stored, so a later line needs its own pass. */
  async pass(actor: Actor, id: string, code: string, body: unknown) {
    const { f, c } = await this.filing(actor, id);
    const no = cannotPass(code);
    if (no) fail(no, (WARN_CODES as readonly string[]).includes(code) || (BLOCK_CODES as readonly string[]).includes(code) ? HttpStatus.CONFLICT : HttpStatus.NOT_FOUND);
    const b = (body ?? {}) as { reason?: unknown; key?: unknown };
    const why = passProblem(b.reason);
    if (why) problem(400, "Some details need fixing", why, { errors: [{ field: "reason", message: why }] });
    // Break B4 on #861: a key, when sent, is one line's key as text; anything else is refused, never read as "every line".
    if (b.key !== undefined && (typeof b.key !== "string" || !b.key)) problem(400, "Some details need fixing", "Send key as the warning line's key (text), or leave it out to pass every open line of this kind.", { errors: [{ field: "key", message: "Text, or leave it out." }] });
    const rd = await this.now(actor, c.id, f.id);
    const keys = passKeys(rd, code as WarnCode, b.key as string | undefined);
    if (!keys.length) fail(`There is no open "${CODE_WORDS[code as WarnCode]}" warning on this filing to pass. Reload.`, HttpStatus.CONFLICT);
    const reason = (b.reason as string).trim(), severity = isCritical(code) ? "critical" : "warning";
    // Break B8: under the filing's row lock, a line already passed meanwhile (two passes at once) is not passed twice.
    const row = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM filing WHERE id = ${f.id}::uuid FOR UPDATE`;
      // Break N6 (#861 round 2): only a pass the rules honour takes its lines (a row whose reason the rule refuses never does).
      const taken = new Set((await tx.readinessPass.findMany({ where: { filingId: f.id, code }, select: { keys: true, reason: true } })).filter((p) => passProblem(p.reason) === null).flatMap((p) => p.keys));
      const fresh = keys.filter((k) => !taken.has(k));
      if (!fresh.length) return null;
      return tx.readinessPass.create({ data: { workspaceId: f.workspaceId, filingId: f.id, code, keys: fresh, severity, reason, passedBy: actor.id } });
    }, { timeout: 15_000, maxWait: 10_000 });
    if (!row) fail(`This "${CODE_WORDS[code as WarnCode]}" warning was passed meanwhile. Reload.`, HttpStatus.CONFLICT);
    await this.audit.log(f.workspaceId, actor.id, "warning_passed", "filing", f.id, `${actor.name} passed "${CODE_WORDS[code as WarnCode]}"${severity === "critical" ? " (CRITICAL)" : ""} on case ${c.id.slice(0, 8)}: ${reason}`, { case: c.id, code, severity, keys: row!.keys });
    return { id: row!.id, filing: f.id, code, severity, keys: row!.keys, reason, by: actor.id, at: row!.passedAt.toISOString() };
  }

  /** POST /runtime/filings/:id/ready: "Ready to file" (409 naming every block and open warning). */
  async ready(actor: Actor, id: string) {
    const { f, c } = await this.filing(actor, id);
    const rd = await this.now(actor, c.id, f.id); // also takes a stale "Ready to file" back to Not started (break B1)
    if (!rd.ready) {
      const n = rd.blocks.length, w = rd.warns.length;
      problem(409, "Not ready to file", `${n ? `${n} block${n === 1 ? "" : "s"} (fix ${n === 1 ? "it" : "them"}: ${n === 1 ? "it says" : "each says"} what is missing; a block is never passed)` : ""}${n && w ? " and " : ""}${w ? `${w} open warning${w === 1 ? "" : "s"} (pass each with a reason, or fix ${w === 1 ? "it" : "them"})` : ""} ${n + w === 1 ? "stands" : "stand"} before Ready to file.`,
        { blocks: rd.blocks, warns: rd.warns });
    }
    // Break B8: marking a filing that is Ready to file again changes nothing and records nothing new.
    const now = await this.db.filing.findUnique({ where: { id: f.id }, select: { status: true } });
    if (now?.status === "READY_TO_FILE") return { filing: f.id, status: "ready_to_file", already: true, passed: rd.passed, reviewed: rd.reviewed };
    const n = await this.db.filing.updateMany({ where: { id: f.id, status: now?.status ?? f.status }, data: { status: "READY_TO_FILE" } });
    if (n.count !== 1) fail("This filing changed since you read it. Reload, then mark it again.", HttpStatus.CONFLICT);
    // Break N3 (#861 round 2): a change saved while it was being marked is caught here: read again, and the view takes a
    // filing that is no longer ready back to Not started (audited), so the answer is 409, never a stale 200.
    const again = await this.now(actor, c.id, f.id);
    if (!again.ready) problem(409, "Not ready to file", "Something changed while this filing was being marked Ready to file. Reload.", { blocks: again.blocks, warns: again.warns });
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
    // Break B7 on #861: a plain day (YYYY-MM-DD) between 2000 and 2100, or null; a timestamp or another shape is refused.
    let until: string | null = null;
    const notDate = () => problem(400, "Some details need fixing", "acceptedUntil is not a date: write it as YYYY-MM-DD (2000 to 2100), or null to clear it.", { errors: [{ field: "acceptedUntil", message: "Not a date (YYYY-MM-DD)." }] });
    if (b.acceptedUntil !== null) {
      if (typeof b.acceptedUntil !== "string" || !/^(20\d{2}|2100)-\d{2}-\d{2}$/.test(b.acceptedUntil)) notDate();
      try { until = dayOf(b.acceptedUntil as string, "acceptedUntil"); } catch { notDate(); }
    }
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
