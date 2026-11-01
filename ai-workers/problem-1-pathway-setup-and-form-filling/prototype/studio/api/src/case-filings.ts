// C6.12 (M3-B, runtime lane; P-171, P-135; M3 case view r5c BR-1, BR-16, BR-18): a case's filings, submission group and
// fee lines, derived from its pinned release's combination and its people on every read (nothing stored, nothing typed by
// hand). The case officer reads them; a client and configuration people do not (deny by default, as runtime.ts). Visitor
// visa only in this slice: other combinations answer "not derived yet". Amounts Sample until the expert confirms. US$0.
import { Controller, Get, Headers, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import type { CaseFiling } from "../../contracts/runtime.ts";
import { checkValue } from "../../engine/runtime/case.ts";
import { ageOn, deriveFilings, FAMILY_GROUP } from "../../engine/runtime/filings.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;

@Injectable()
export class CaseFilings {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db) {}

  async list(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, caseId, "officer");
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    // Money follows the combination: the release's snapshot must name the case's own combination (break report M2: a
    // release row edited underneath would otherwise price the case as another combination).
    const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true } });
    if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; no filing or fee was worked out. Ask the Lead.", HttpStatus.CONFLICT);
    // C6.12 (prepare view): the same ages, filing modes and stored submission groups as GET …/prepare, so the two never
    // price a case differently (read only: the prepare view stores the filings).
    const people = this.r.peopleOf(c), today = new Date();
    const { answers } = await this.r.state(c);
    const ages = new Map(people.filter((p) => p.role !== "case").map((p) => [p.subjectId, ageOn(answers.find((a) => a.subjectId === p.subjectId && a.field === "person.date_of_birth" && !a.rowKey && checkValue(s, a.field, a.value, today).length === 0)?.value as string | undefined, today)]));
    const modes = new Map(((s.combination.participants ?? []) as { role: string; filingMode?: CaseFiling["mode"] }[]).filter((p) => p.filingMode).map((p) => [p.role, p.filingMode!]));
    const rows = await this.db.filing.findMany({ where: { caseId: c.id, withdrawnAt: null }, include: { group: { select: { kind: true } } } });
    const groupOf = new Map(rows.map((f) => [f.subjectId, f.group.kind === "FAMILY" ? FAMILY_GROUP : f.submissionGroupId]));
    return { case_id: c.id, reference: c.reference, release_version: pin.release.version, ...deriveFilings(own!.combinationKey, people, undefined, { ages, modes, groupOf: (x) => groupOf.get(x) ?? FAMILY_GROUP, groupKind: (g) => (g === FAMILY_GROUP ? "family" : "separate") }) };
  }
}

@CaseRead()
@Controller("api/runtime")
export class CaseFilingsController {
  constructor(@Inject(CaseFilings) private readonly f: CaseFilings) {}
  @Get("cases/:id/filings") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.list(actorOf(a), id); }
}
