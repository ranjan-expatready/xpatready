// C6.9 parts 2 and 3 (M3-D, concept screens/C6.9/concept.md BR-7, BR-8, BR-13…BR-17; stand-in SI-1): eligibility runs,
// and an officer's override and review beside a run (part 3; any staff of the firm, P-229 (2)).
// A run reads one travelling person's answers against the case's pinned release's gates (engine/runtime/eligibility.ts)
// and is stored once, frozen (table assessment; a trigger refuses any UPDATE). Out of date is worked out on every read.
// Staff of the case's firm only (Runtime.reach "officer"): a client gets 403, another firm's case 404. Rules only: no
// model call, no spend ledger row (US$0). Answer values never go into audit text (STANDARDS §5). Registered in
// features/eligibility.ts (P-214).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import type { Assessment as Row, AssessmentOverride, AssessmentReview } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AssessmentOverrideBody, AssessmentReviewBody, AssessmentRunBody } from "../../contracts/eligibility.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { checkValue, knownOf } from "../../engine/runtime/case.ts";
import { assess, DISCLAIMER_LOCALE, inputsOf, nowOf, outOfDate, STAND_IN, withUnconfirmedNow, type Input, type ProgramResult } from "../../engine/runtime/eligibility.ts";
import type { SnapshotEligibility } from "../../engine/eligibility-gates.ts";
import { actorOf, Audit, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";
import { firmOfActor } from "./firms.ts";

type H = string | undefined;
/** What result_json holds: AG-03's Assessment envelope (§7), frozen with the row. */
export type Envelope = {
  releaseId: string; packId: string | null; packVersion: number; rulesAsOfByProgram: Record<string, string>;
  disclaimerText: string; disclaimerLocale: string; createdBy: string; createdAt: string; runType: "MANUAL" | "RERUN";
  reason: string | null; source: "stand-in"; person: string; inputs: Input[]; results: ProgramResult[];
};
const fieldError = (field: string, message: string): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: message, errors: [{ field, message }] }, HttpStatus.BAD_REQUEST); };
const refused = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/not-possible", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const short = (id: string) => id.slice(0, 8);

@Injectable()
export class Assessments {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  /** BR-9's facts for a case today: only answers their own checks accept are read (an invalid value counts as missing,
   *  AG-03 §9), as the checklist reads them (case-checklist.ts). */
  private async knownNow(c: Reached) {
    const s = this.r.snapshotOf(c), people = this.r.peopleOf(c), today = new Date();
    const { answers, rows } = await this.r.state(c);
    const valid = answers.filter((x) => checkValue(s, x.field, x.value, today).length === 0);
    const { known } = knownOf(s, people, valid, rows, today);
    const about = (subjectId: string) => (people.find((p) => p.subjectId === subjectId)?.role === "case" ? "case" : subjectId);
    const ids = new Map(valid.filter((a) => !a.rowKey).map((a) => [`${about(a.subjectId)}|${a.field}`, a.id]));
    return { s, known, answerId: (who: string, fact: string) => ids.get(`${who}|${fact}`) ?? null };
  }

  /** BR-7: the person must be someone on the case who travels on this application. */
  private traveller(c: Reached, person: string) {
    const p = c.participants.find((x) => x.subjectId === person);
    if (!p) fieldError("person", "That person is not on this case.");
    if (p!.role === "case") fieldError("person", "The case itself is not a traveller: choose a person.");
    if (!p!.applies) fieldError("person", "Not travelling on this application: eligibility is checked only for travellers.");
    return p!;
  }

  /** POST: one run for one person (BR-7, BR-8, BR-10, BR-14). */
  async run(actor: Actor, caseId: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "officer");
    const parsed = AssessmentRunBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const { person } = parsed.data, reason = parsed.data.reason || null;
    this.traveller(c, person);
    const pin = c.pins[0], release = pin.release;
    const { s, known, answerId } = await this.knownNow(c);
    const e = s.eligibility as SnapshotEligibility | undefined;
    if (!e?.gates?.length) refused("This application's release has no eligibility rules yet. An author adds them and a reviewer releases them.");
    const result = assess(s, known, person)!;
    const id = randomUUID();
    // Review M2 on fd26c492 (STANDARDS idempotent creates): the count of earlier runs and the insert happen under one
    // lock per person, so two clicks at once never write two first runs with no reason (the second needs a reason).
    const { row, envelope } = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`assessment:${c.id}:${person}`}))`;
      const earlier = await tx.assessment.count({ where: { caseId: c.id, subjectId: person } });
      if (earlier && !reason) fieldError("reason", "Give a reason for running again, such as 'Passport renewed'.");
      const at = new Date();
      const envelope: Envelope = {
        releaseId: release.id, packId: release.packVersionId ?? null, packVersion: release.version,
        rulesAsOfByProgram: { [s.combination.key]: release.releasedAt.toISOString().slice(0, 10) },
        disclaimerText: e!.disclaimer, disclaimerLocale: DISCLAIMER_LOCALE, createdBy: actor.id, createdAt: at.toISOString(),
        runType: earlier ? "RERUN" : "MANUAL", reason, source: "stand-in", person, inputs: inputsOf(s, known, person, answerId), results: [result],
      };
      const row = await tx.assessment.create({ data: { id, workspaceId: c.workspaceId, caseId: c.id, subjectId: person, configReleaseId: release.id, resultJson: envelope as never, runType: envelope.runType, reason, createdBy: actor.id, createdAt: at } });
      return { row, envelope };
    });
    await this.audit.log(c.workspaceId, actor.id, "created", "assessment", id, `${actor.name} ran an eligibility check on case ${short(c.id)} for person ${short(person)} (${envelope.runType === "RERUN" ? "run again" : "first run"}): ${result.outcome.toLowerCase().replace(/_/g, " ")}`, { outcome: result.outcome, release: release.version });
    return this.view(row, [], null, { ...envelope, ...outOfDate(envelope.inputs, nowOf(known, person), true) });
  }

  /** GET the list (BR-13): every run on the case, or one person's, newest first; out of date worked out now. Two
   *  queries for the runs (with their overrides and review) and one read of today's answers. */
  async list(actor: Actor, caseId: string, person?: string) {
    const c = await this.r.reach(actor, caseId, "officer");
    if (person !== undefined) { if (!c.participants.some((p) => p.subjectId === person && p.role !== "case")) fieldError("person", "That person is not on this case."); }
    const rows = await this.db.assessment.findMany({ where: { caseId: c.id, ...(person ? { subjectId: person } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { overrides: { orderBy: { createdAt: "asc" } }, review: true } });
    const { known } = await this.knownNow(c);
    const gates = (this.r.snapshotOf(c).eligibility as SnapshotEligibility | undefined)?.gates?.length ?? 0;
    return { stand_in: STAND_IN.id, stand_in_words: STAND_IN.words, has_rules: gates > 0, assessments: rows.map((x) => this.view(x, x.overrides, x.review, this.fresh(x, known, c))) };
  }

  /** GET one run, for staff of the case's firm. A client is told 403 whatever the id, as on every eligibility route
   *  (BR-7); staff are told an unknown id does not exist. */
  async one(actor: Actor, id: string) {
    const { x, env } = await this.reachRun(actor, id);
    return this.view(x, x.overrides, x.review, env);
  }

  /** The run and its case, for staff of the case's firm (as GET one), with out of date worked out now. */
  private async reachRun(actor: Actor, id: string) {
    const x = UUID.test(id) ? await this.db.assessment.findUnique({ where: { id }, include: { overrides: { orderBy: { createdAt: "asc" } }, review: true } }) : null;
    if (!x) {
      if (!(actor.duties as readonly string[]).includes("case")) fail("Only the case officer can do this.", HttpStatus.FORBIDDEN);
      fail("No such eligibility check.", HttpStatus.NOT_FOUND);
    }
    const c = await this.r.reach(actor, x!.caseId, "officer");
    const { known } = await this.knownNow(c);
    return { x: x!, c, env: this.fresh(x!, known, c) };
  }

  /** P-229 (2): who signs an override or a review. "Reviewed by" for a licensed representative, "Seen by" otherwise. */
  private stampOf(actor: Actor) {
    const u = firmOfActor(actor)?.users.find((y) => y.id === actor.id);
    const licensed = !!(u?.duties.includes("represent") && u.licence?.number);
    return { by: actor.id, name: u?.name ?? actor.name, duty: licensed ? "Representative" : "Case officer", licence: licensed ? u!.licence : null, stamp: licensed ? "Reviewed" as const : "Seen" as const };
  }

  /** BR-15: an override sits beside the result; the engine's outcome never changes. Allowed on an out-of-date run. */
  async override(actor: Actor, id: string, body: unknown) {
    const { x, c, env } = await this.reachRun(actor, id);
    const parsed = AssessmentOverrideBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const result = env.results.find((r) => r.programKey === b.programKey);
    if (!result) fieldError("programKey", "This check has no result for that application.");
    if (result!.outcome !== b.fromOutcome) refused("The result changed since you opened it. Reload to see it.");
    const st = this.stampOf(actor);
    const stamp = { name: st.name, duty: st.duty, licence: st.licence, outOfDate: env.out_of_date };
    // Break M1 and m1 on 2572b9b0: one lock per run, so a double submit writes one override (the same one comes back);
    // and an override goes only onto the person's latest check (a newer check since the drawer opened: 409).
    const done = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`assessment-override:${x.id}`}))`;
      const newer = await tx.assessment.findFirst({ where: { caseId: x.caseId, subjectId: x.subjectId, createdAt: { gt: x.createdAt } }, select: { id: true } });
      if (newer) refused("The result changed since you opened it: a newer check exists for this person. Reload to see it.");
      const same = await tx.assessmentOverride.findFirst({ where: { assessmentId: x.id, createdBy: actor.id, programKey: b.programKey, label: b.label, reason: b.reason } });
      if (same) return { o: same, repeated: true };
      return { o: await tx.assessmentOverride.create({ data: { assessmentId: x.id, programKey: b.programKey, fromOutcome: b.fromOutcome, label: b.label, reason: b.reason, stamp: stamp as never, createdBy: actor.id } }), repeated: false };
    });
    const o = done.o;
    if (done.repeated) return { id: o.id, programKey: o.programKey, fromOutcome: o.fromOutcome, label: o.label, reason: o.reason, by: o.createdBy, at: o.createdAt.toISOString(), ...(o.stamp as object), repeated: true };
    await this.audit.log(c.workspaceId, actor.id, "created", "assessment_override", x.id, `${st.name} overrode the eligibility result ${b.fromOutcome.toLowerCase().replace(/_/g, " ")} on case ${short(c.id)} with "${b.label}" (the result itself is unchanged)`, { programKey: b.programKey, before: b.fromOutcome, after: b.label, outOfDate: env.out_of_date });
    return { id: o.id, programKey: o.programKey, fromOutcome: o.fromOutcome, label: o.label, reason: o.reason, by: actor.id, at: o.createdAt.toISOString(), ...stamp };
  }

  /** BR-16: Mark reviewed, once per run; a second review is refused naming who and when. */
  async review(actor: Actor, id: string, body: unknown) {
    const { x, c, env } = await this.reachRun(actor, id);
    const parsed = AssessmentReviewBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const already = (r: { reviewedAt: Date; stamp: unknown }) => refused(`Already ${((r.stamp as { stamp?: string }).stamp ?? "Reviewed") === "Seen" ? "seen" : "reviewed"} by ${(r.stamp as { name?: string }).name ?? "someone"} on ${r.reviewedAt.toISOString().slice(0, 16).replace("T", " ")} UTC.`);
    if (x.review) already(x.review);
    const st = this.stampOf(actor);
    const stamp = { name: st.name, duty: st.duty, licence: st.licence, stamp: st.stamp, outOfDate: env.out_of_date };
    let r;
    try { r = await this.db.assessmentReview.create({ data: { assessmentId: x.id, reviewedBy: actor.id, note: parsed.data.note || null, stamp: stamp as never } }); }
    catch (e) { if ((e as { code?: string }).code === "P2002") already((await this.db.assessmentReview.findUnique({ where: { assessmentId: x.id } }))!); throw e; }
    await this.audit.log(c.workspaceId, actor.id, "reviewed", "assessment", x.id, `${st.stamp === "Reviewed" ? "Reviewed" : "Seen"} by ${st.name}: the eligibility check on case ${short(c.id)}${env.out_of_date ? " (out of date when marked)" : ""}`, { stamp: st.stamp, outOfDate: env.out_of_date });
    return { reviewedBy: r.reviewedBy, reviewedAt: r.reviewedAt.toISOString(), reviewNote: r.note, ...stamp };
  }

  private fresh(x: Row, known: Parameters<typeof nowOf>[0], c: Reached) {
    const env = x.resultJson as unknown as Envelope;
    const o = outOfDate(env.inputs ?? [], nowOf(known, x.subjectId), c.pins[0].configReleaseId === x.configReleaseId);
    // Break m3 on fd26c492: a person no longer travelling (or removed) makes the run out of date, said in words.
    const travelling = c.participants.some((p) => p.subjectId === x.subjectId && p.applies);
    // B124 (P-393): what each gate rests on, on the release the run read; nothing for an out-of-date run.
    const same = c.pins[0].configReleaseId === x.configReleaseId, s = same ? this.r.snapshotOf(c) : null;
    const rests = o.out_of_date || !travelling || !s ? "none" as const : { s, gates: (s.eligibility as SnapshotEligibility | undefined)?.gates ?? [] };
    return { ...env, results: (env.results ?? []).map((r) => withUnconfirmedNow(r, known, x.subjectId, rests)), ...o, ...(travelling ? {} : { out_of_date: true, not_travelling: true }) };
  }

  private view(x: Row, overrides: AssessmentOverride[], review: AssessmentReview | null, env: Envelope & ReturnType<typeof outOfDate>) {
    const stamp = (review?.stamp ?? {}) as { duty?: string; licence?: unknown; stamp?: string };
    return {
      id: x.id, caseId: x.caseId, ...env, person: x.subjectId,
      overrides: overrides.map((o) => ({ id: o.id, programKey: o.programKey, fromOutcome: o.fromOutcome, label: o.label, reason: o.reason, by: o.createdBy, at: o.createdAt.toISOString(), ...(o.stamp as object) })),
      reviewedBy: review?.reviewedBy ?? null, reviewedAt: review?.reviewedAt.toISOString() ?? null, reviewNote: review?.note ?? null, ...(review ? { reviewStamp: stamp } : {}),
    };
  }
}

@CaseRead()
@Controller("api/runtime")
export class AssessmentsController {
  constructor(@Inject(Assessments) private readonly x: Assessments) {}
  @Post("cases/:id/assessments") run(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.run(actorOf(a), id, b); }
  @Get("cases/:id/assessments") list(@Headers("x-actor") a: H, @Param("id") id: string, @Query("person") person?: string) { return this.x.list(actorOf(a), id, person); }
  @Get("assessments/:aid") one(@Headers("x-actor") a: H, @Param("aid") aid: string) { return this.x.one(actorOf(a), aid); }
  @Post("assessments/:aid/override") override(@Headers("x-actor") a: H, @Param("aid") aid: string, @Body() b: unknown) { return this.x.override(actorOf(a), aid, b); }
  @Post("assessments/:aid/review") @HttpCode(200) review(@Headers("x-actor") a: H, @Param("aid") aid: string, @Body() b: unknown) { return this.x.review(actorOf(a), aid, b); }
}
