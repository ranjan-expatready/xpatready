// C6.12 (M3-B, runtime lane; P-171, P-135; M3 case view r5c BR-1, BR-16, BR-18): a case's filings, submission group and
// fee lines, derived from its pinned release's combination and its people on every read (nothing stored, nothing typed by
// hand). The case officer reads them; a client and configuration people do not (deny by default, as runtime.ts). Visitor
// visa only in this slice: other combinations answer "not derived yet". Amounts Sample until the expert confirms. US$0.
import { Controller, Get, Headers, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import { checkValue } from "../../engine/runtime/case.ts";
import { releaseModes } from "../../engine/filing-modes.ts";
import { ageOn, deriveFilings, FAMILY_GROUP } from "../../engine/runtime/filings.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";
import type { Participant } from "../../engine/runtime/case.ts";

type H = string | undefined;

@Injectable()
export class CaseFilings {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db) {}

  async list(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, caseId, "officer");
    return this.deriveFor(c, this.r.peopleOf(c));
  }

  /** C6.13 (M7): the one derivation, for the case's people as they are or as a filing change would make them, so the
   *  change's preview and this view never price a case differently. */
  async deriveFor(c: Reached, people: Participant[]) {
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    // Money follows the combination: the release's snapshot must name the case's own combination (break report M2: a
    // release row edited underneath would otherwise price the case as another combination).
    const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true } });
    if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; no filing or fee was worked out. Ask the Lead.", HttpStatus.CONFLICT);
    // C6.12 (prepare view): the same ages, filing modes and stored submission groups as GET …/prepare, so the two never
    // price a case differently (read only: the prepare view stores the filings).
    const today = new Date();
    const { answers } = await this.r.state(c);
    const ages = new Map(people.filter((p) => p.role !== "case").map((p) => [p.subjectId, ageOn(answers.find((a) => a.subjectId === p.subjectId && a.field === "person.date_of_birth" && !a.rowKey && checkValue(s, a.field, a.value, today).length === 0)?.value as string | undefined, today)]));
    const modes = releaseModes(s.combination.participants ?? []); // C11.12: the same reading as GET …/prepare
    const rows = await this.db.filing.findMany({ where: { caseId: c.id, active: true }, include: { group: { select: { kind: true } } } });
    // Review m5: the stored group's own id, as GET …/prepare shows it ("group-family" only before the first prepare read).
    const groupOf = new Map(rows.map((f) => [f.subjectId, f.submissionGroupId]));
    const kindOf = new Map(rows.map((f) => [f.submissionGroupId, f.group.kind === "FAMILY" ? "family" as const : "separate" as const]));
    const family = rows.find((f) => f.group.kind === "FAMILY")?.submissionGroupId ?? FAMILY_GROUP;
    return { case_id: c.id, reference: c.reference, release_version: pin.release.version, ...deriveFilings(own!.combinationKey, people, undefined, { ages, modes, label: s.combination.label, groupOf: (x) => groupOf.get(x) ?? family, groupKind: (g) => kindOf.get(g) ?? "family" }) };
  }
}

@CaseRead()
@Controller("api/runtime")
export class CaseFilingsController {
  constructor(@Inject(CaseFilings) private readonly f: CaseFilings) {}
  @Get("cases/:id/filings") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.list(actorOf(a), id); }
}
